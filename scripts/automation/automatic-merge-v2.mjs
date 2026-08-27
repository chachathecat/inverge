#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { classify, deriveSemanticHighRiskSignals, parsePolicy } from "./classify-risk.mjs";
import {
  AMENDMENT_ID,
  QF_ORDER,
  evaluateAutomaticMerge,
  evaluateMergeReceiptEvidence,
  validateLaneChangedPaths,
} from "./fast-delivery-parallel-v2.mjs";

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

function readPullRequestFiles(repository, pullRequestNumber) {
  const files = ghJson(["api", `repos/${repository}/pulls/${pullRequestNumber}/files?per_page=100`]);
  if (!Array.isArray(files) || files.length >= 100) throw new Error("bounded pull-request file evidence page was exceeded");
  return files.map((entry) => {
    const lines = typeof entry.patch === "string" ? entry.patch.split(/\r?\n/u) : [];
    const additions = lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length;
    const deletions = lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length;
    return {
      path: entry.filename,
      patch: entry.patch,
      patchComplete: typeof entry.patch === "string" && additions === entry.additions && deletions === entry.deletions,
      status: entry.status,
      blobSha: entry.sha,
    };
  });
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
  const fileEvidence = readPullRequestFiles(repository, pullRequestNumber);
  const graphPaths = (pullRequest.files?.nodes ?? []).map((entry) => entry.path).sort();
  const restPaths = fileEvidence.map((entry) => entry.path).sort();
  if (JSON.stringify(graphPaths) !== JSON.stringify(restPaths)) throw new Error("GitHub changed-file evidence disagrees across APIs");
  pullRequest.files = { nodes: fileEvidence, pageInfo: { hasNextPage: false } };
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

function readV2OwnerApproval(pullRequest, headSha, contract) {
  const markerText = `${contract.mergePolicy.v2OwnerApprovalReceiptMarkerPrefix}${headSha}`;
  const escapedMarker = markerText.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const marker = new RegExp(`(?:^|\\n)${escapedMarker}(?:\\n|$)`, "u");
  const matches = (pullRequest.reviews?.nodes ?? []).filter((review) =>
    review?.commit?.oid === headSha && ["APPROVED", "COMMENTED"].includes(review?.state) &&
      marker.test(review?.body ?? ""),
  );
  if (matches.length !== 1) return null;
  return {
    headSha,
    marker: markerText,
    authorLogin: matches[0].author?.login ?? null,
    authorAssociation: matches[0].authorAssociation,
    submittedAt: matches[0].submittedAt,
  };
}

function exactWorktreeDeclarationCount(pullRequest, lane) {
  const expected = `FAST_DELIVERY_V2_LANE lane=${lane.laneId} branch=${lane.branch} worktree=${lane.worktreePath}`;
  return String(pullRequest.body ?? "").split(/\r?\n/u).filter((line) => line.trim() === expected).length;
}

function readBranchPullRequests(repository, branch, cache) {
  if (cache.has(branch)) return cache.get(branch);
  const [owner] = repository.split("/");
  const pulls = ghJson(["api", `repos/${repository}/pulls?state=all&base=main&head=${owner}:${branch}&per_page=100`]);
  if (!Array.isArray(pulls) || pulls.length >= 100) throw new Error(`bounded branch PR evidence page was exceeded: ${branch}`);
  const exact = pulls.filter((entry) =>
    entry?.base?.ref === "main" && entry?.head?.ref === branch && entry?.head?.repo?.full_name === repository,
  );
  cache.set(branch, exact);
  return exact;
}

function mergeCommitIsOnMain(repository, mergeCommitSha) {
  if (!SHA_PATTERN.test(mergeCommitSha ?? "")) return false;
  const comparison = ghJson(["api", `repos/${repository}/compare/${mergeCommitSha}...main`]);
  return ["ahead", "identical"].includes(comparison?.status);
}

function receiptIsValidated(repository, pullSummary, laneId, contract) {
  if (!pullSummary?.merged_at || !SHA_PATTERN.test(pullSummary?.head?.sha ?? "") ||
      !mergeCommitIsOnMain(repository, pullSummary.merge_commit_sha)) return false;
  const pullRequest = readPullRequest(repository, pullSummary.number);
  const lane = laneId === AMENDMENT_ID
    ? contract.candidateLane
    : contract.questionFoundrySplitCampaign.lanes.find((entry) => entry.laneId === laneId);
  if (!lane) return false;
  const checks = readChecks(repository, pullRequest.headRefOid);
  const review = readFinalReview(pullRequest, pullRequest.headRefOid);
  return evaluateMergeReceiptEvidence(contract, laneId, {
    state: pullRequest.state,
    mergedAt: pullSummary.merged_at,
    mergeCommitOnMain: true,
    summaryHeadSha: pullSummary.head.sha,
    headSha: pullRequest.headRefOid,
    headRefName: pullRequest.headRefName,
    baseRefName: pullRequest.baseRefName,
    sameRepository: pullRequest.headRepository?.nameWithOwner === repository,
    changedPaths: (pullRequest.files?.nodes ?? []).map((entry) => entry.path),
    worktreeDeclarationCount: exactWorktreeDeclarationCount(pullRequest, lane),
    checks,
    finalReview: review,
    ownerApproval: laneId === AMENDMENT_ID ? readV2OwnerApproval(pullRequest, pullRequest.headRefOid, contract) : null,
    unresolvedNonOutdatedReviewThreads: (pullRequest.reviewThreads?.nodes ?? [])
      .filter((thread) => !thread.isOutdated && !thread.isResolved).length,
    blockingCurrentHeadReviewCount: (pullRequest.reviews?.nodes ?? [])
      .filter((entry) => entry?.commit?.oid === pullRequest.headRefOid && entry?.state === "CHANGES_REQUESTED").length,
  }).validated;
}

function readLaneGateEvidence(repository, pullRequestNumber, lane, contract) {
  const cache = new Map();
  const currentIndex = QF_ORDER.indexOf(lane.laneId);
  if (currentIndex < 0) throw new Error("registered lane is absent from the declared merge order");
  const branchById = new Map([
    [AMENDMENT_ID, contract.candidateLane.branch],
    ...contract.questionFoundrySplitCampaign.lanes.map((entry) => [entry.laneId, entry.branch]),
  ]);
  const requiredReceiptIds = [AMENDMENT_ID, ...QF_ORDER.slice(0, currentIndex)];
  const validatedReceiptIds = [];
  for (const laneId of requiredReceiptIds) {
    const branch = branchById.get(laneId);
    const merged = readBranchPullRequests(repository, branch, cache).filter((entry) => entry.merged_at !== null);
    if (merged.length === 1 && receiptIsValidated(repository, merged[0], laneId, contract)) validatedReceiptIds.push(laneId);
  }

  const openLaneIds = [];
  for (const entry of contract.questionFoundrySplitCampaign.lanes) {
    const open = readBranchPullRequests(repository, entry.branch, cache).filter((pull) => pull.state === "open");
    if (open.length > 1) throw new Error(`multiple open pull requests use registered lane branch: ${entry.branch}`);
    if (open.length === 1) openLaneIds.push(entry.laneId);
  }
  const uniqueOpenLaneIds = [...new Set(openLaneIds)];
  const parallelPair = contract.questionFoundrySplitCampaign.parallelPairExactly;
  const concurrencyValid = uniqueOpenLaneIds.length <= 2 &&
    uniqueOpenLaneIds.includes(lane.laneId) &&
    (uniqueOpenLaneIds.length < 2 || uniqueOpenLaneIds.every((laneId) => parallelPair.includes(laneId)));
  const currentLanePulls = readBranchPullRequests(repository, lane.branch, cache);
  const currentPulls = currentLanePulls
    .filter((entry) => entry.state === "open" && entry.number === pullRequestNumber);

  const mainRef = ghJson(["api", `repos/${repository}/git/ref/heads/main`]);
  return {
    currentLaneId: lane.laneId,
    currentPullRequestNumber: pullRequestNumber,
    currentPullRequestObservedOnce: currentPulls.length === 1,
    currentLanePriorMergedCount: currentLanePulls.filter((entry) => entry.merged_at !== null).length,
    currentMainSha: mainRef?.object?.sha ?? null,
    requiredReceiptIds,
    validatedReceiptIds,
    directDependencyIds: [...lane.dependencies],
    directDependenciesSatisfied: lane.dependencies.every((laneId) => validatedReceiptIds.includes(laneId)),
    declaredMergePrefixSatisfied: JSON.stringify(requiredReceiptIds) === JSON.stringify(validatedReceiptIds),
    openLaneIds: uniqueOpenLaneIds,
    concurrencyValid,
  };
}

function buildSnapshot(repository, pullRequestNumber, expectedHeadSha, pullRequest, contract) {
  const fileEvidence = pullRequest.files?.nodes ?? [];
  const files = fileEvidence.map((entry) => entry.path);
  const policy = parsePolicy(path.resolve("config/agent-risk-policy.yml"));
  const lane = contract.questionFoundrySplitCampaign.lanes.find(
    (entry) => entry.branch === pullRequest.headRefName,
  );
  const ownership = lane
    ? validateLaneChangedPaths(contract, lane.laneId, files, { includeSerialIntegrationPaths: true })
    : { ok: false };
  const derivedHighRiskSignals = deriveSemanticHighRiskSignals(fileEvidence);
  const classification = classify(files, derivedHighRiskSignals, policy, {
    profileOverride: ownership.ok ? lane.profile : null,
    registeredLaneId: ownership.ok ? lane.laneId : null,
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
    registeredLaneId: lane?.laneId ?? null,
    pathOwnershipValid: ownership.ok === true,
    isolatedWorktreeDeclared: exactWorktreeLineCount === 1,
    expectedHeadSha,
    headSha: pullRequest.headRefOid,
    profile: classification.profile,
    classifierHeadSha: pullRequest.headRefOid,
    derivedHighRiskSignals,
    semanticSignalEvidenceComplete: fileEvidence.every((entry) => entry.patchComplete === true),
    changedPathCount: files.length,
    laneGateEvidence: lane ? readLaneGateEvidence(repository, pullRequestNumber, lane, contract) : null,
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
  const decision = evaluateAutomaticMerge(contract, buildSnapshot(repository, pullRequestNumber, expectedHeadSha, pullRequest, contract));
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
  if (!decision.eligible) throw new Error("automatic merge gate failed closed");

  if (pullRequest.isDraft) {
    gh(["pr", "ready", String(pullRequestNumber), "--repo", repository]);
  }
  const refreshed = readPullRequest(repository, pullRequestNumber);
  const refreshedDecision = evaluateAutomaticMerge(
    contract,
    buildSnapshot(repository, pullRequestNumber, expectedHeadSha, refreshed, contract),
  );
  process.stdout.write(`${JSON.stringify({ postReady: refreshedDecision }, null, 2)}\n`);
  if (!refreshedDecision.eligible || refreshed.isDraft) throw new Error("post-Ready automatic merge gate failed closed");
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
