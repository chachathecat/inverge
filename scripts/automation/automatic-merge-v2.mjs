#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { classify, parsePolicy } from "./classify-risk.mjs";
import { evaluateAutomaticMerge, validateLaneChangedPaths } from "./fast-delivery-parallel-v2.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  }).trim();
}

function ghJson(args) {
  return JSON.parse(gh(args));
}

function assertRepository(value) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(value ?? "")) {
    throw new Error("GITHUB_REPOSITORY is invalid");
  }
  return value;
}

function assertPrNumber(value) {
  if (!/^[1-9][0-9]{0,9}$/u.test(value ?? "")) throw new Error("PR_NUMBER is invalid");
  return Number(value);
}

function readPullRequest(repository, pullRequestNumber) {
  const [owner, name] = repository.split("/");
  const query = `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){state isDraft body headRefName headRefOid baseRefName mergeable mergeStateStatus headRepository{nameWithOwner} labels(first:100){nodes{name} pageInfo{hasNextPage}} reviews(last:100){nodes{state body submittedAt commit{oid} authorAssociation author{login}} pageInfo{hasPreviousPage}} reviewThreads(first:100){nodes{isResolved isOutdated} pageInfo{hasNextPage}} files(first:100){nodes{path} pageInfo{hasNextPage}}}}}`;
  const response = ghJson([
    "api", "graphql",
    "-f", `query=${query}`,
    "-f", `owner=${owner}`,
    "-f", `name=${name}`,
    "-F", `number=${pullRequestNumber}`,
  ]);
  const pullRequest = response?.data?.repository?.pullRequest;
  if (!pullRequest) throw new Error("pull request was not found");
  if (pullRequest.files?.pageInfo?.hasNextPage || pullRequest.labels?.pageInfo?.hasNextPage ||
      pullRequest.reviewThreads?.pageInfo?.hasNextPage || pullRequest.reviews?.pageInfo?.hasPreviousPage) {
    throw new Error("bounded GitHub evidence page was exceeded");
  }
  return pullRequest;
}

function readChecks(repository, headSha) {
  const response = ghJson(["api", `repos/${repository}/commits/${headSha}/check-runs?per_page=100`]);
  if ((response?.total_count ?? 0) > 100) throw new Error("bounded check-run evidence page was exceeded");
  const latestByName = new Map();
  for (const check of response?.check_runs ?? []) {
    const current = latestByName.get(check.name);
    const currentTime = Date.parse(current?.completed_at ?? current?.started_at ?? "") || 0;
    const candidateTime = Date.parse(check?.completed_at ?? check?.started_at ?? "") || 0;
    if (!current || candidateTime >= currentTime) latestByName.set(check.name, check);
  }
  return Object.fromEntries([...latestByName].map(([name, check]) => [name, {
    headSha: check.head_sha,
    conclusion: String(check.conclusion ?? "").toUpperCase(),
    completedAt: check.completed_at,
  }]));
}

function readFinalReview(pullRequest, headSha) {
  const escapedHead = headSha.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const marker = new RegExp(`(?:^|\\n)FAST_DELIVERY_V2_FINAL_REVIEW head=${escapedHead} actionable=0/0/0(?:\\n|$)`, "u");
  const matches = (pullRequest.reviews?.nodes ?? []).filter((review) =>
    review?.commit?.oid === headSha && ["APPROVED", "COMMENTED"].includes(review?.state) &&
      marker.test(review?.body ?? ""),
  );
  if (matches.length !== 1) return null;
  const review = matches[0];
  return {
    headSha,
    actionableP0P1P2: [0, 0, 0],
    formal: true,
    trustedReviewer: TRUSTED_ASSOCIATIONS.has(review.authorAssociation),
    submittedAt: review.submittedAt,
  };
}

function buildSnapshot(repository, expectedHeadSha, pullRequest, contract) {
  const files = (pullRequest.files?.nodes ?? []).map((entry) => entry.path);
  const policy = parsePolicy(path.resolve("config/agent-risk-policy.yml"));
  const lane = contract.questionFoundrySplitCampaign.lanes.find(
    (entry) => entry.branch === pullRequest.headRefName,
  );
  const ownership = lane
    ? validateLaneChangedPaths(contract, lane.laneId, files, { includeSerialIntegrationPaths: true })
    : { ok: false };
  const classification = classify(files, [], policy, {
    profileOverride: ownership.ok ? lane.profile : null,
  });
  const expectedWorktreeLine = lane
    ? `FAST_DELIVERY_V2_LANE lane=${lane.laneId} branch=${lane.branch} worktree=${lane.worktreePath}`
    : null;
  const exactWorktreeLineCount = expectedWorktreeLine
    ? String(pullRequest.body ?? "").split(/\r?\n/u).filter((line) => line.trim() === expectedWorktreeLine).length
    : 0;
  return {
    state: pullRequest.state,
    isDraft: pullRequest.isDraft,
    mergeStateStatus: pullRequest.mergeStateStatus,
    baseRefName: pullRequest.baseRefName,
    sameRepository: pullRequest.headRepository?.nameWithOwner === repository,
    registeredLane: lane !== undefined,
    pathOwnershipValid: ownership.ok === true,
    isolatedWorktreeDeclared: exactWorktreeLineCount === 1,
    expectedHeadSha,
    headSha: pullRequest.headRefOid,
    profile: classification.profile,
    classifierHeadSha: pullRequest.headRefOid,
    changedPathCount: files.length,
    labels: (pullRequest.labels?.nodes ?? []).map((entry) => entry.name),
    checks: readChecks(repository, pullRequest.headRefOid),
    finalReview: readFinalReview(pullRequest, pullRequest.headRefOid),
    unresolvedNonOutdatedReviewThreads: (pullRequest.reviewThreads?.nodes ?? [])
      .filter((thread) => !thread.isOutdated && !thread.isResolved).length,
    blockingCurrentHeadReviewCount: (pullRequest.reviews?.nodes ?? [])
      .filter((review) => review?.commit?.oid === pullRequest.headRefOid && review?.state === "CHANGES_REQUESTED").length,
    mergeable: pullRequest.mergeable,
  };
}

function main() {
  const repository = assertRepository(process.env.GITHUB_REPOSITORY);
  const pullRequestNumber = assertPrNumber(process.env.PR_NUMBER);
  const expectedHeadSha = process.env.EXPECTED_HEAD_SHA;
  if (!SHA_PATTERN.test(expectedHeadSha ?? "")) throw new Error("EXPECTED_HEAD_SHA is invalid");

  const contract = JSON.parse(fs.readFileSync("config/dabangil-fast-delivery-parallel-execution-v2.json", "utf8"));
  const pullRequest = readPullRequest(repository, pullRequestNumber);
  const decision = evaluateAutomaticMerge(contract, buildSnapshot(repository, expectedHeadSha, pullRequest, contract));
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  if (!decision.eligible) throw new Error("automatic merge gate failed closed");

  if (pullRequest.isDraft) {
    gh(["pr", "ready", String(pullRequestNumber), "--repo", repository]);
  }
  const refreshed = readPullRequest(repository, pullRequestNumber);
  if (refreshed.state !== "OPEN" || refreshed.isDraft || refreshed.headRefOid !== expectedHeadSha ||
      refreshed.mergeable !== "MERGEABLE" || refreshed.mergeStateStatus !== "CLEAN" ||
      refreshed.headRepository?.nameWithOwner !== repository) {
    throw new Error("post-Ready pull-request identity or mergeability drifted");
  }
  gh([
    "pr", "merge", String(pullRequestNumber), "--repo", repository,
    "--squash", "--match-head-commit", expectedHeadSha,
  ]);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
