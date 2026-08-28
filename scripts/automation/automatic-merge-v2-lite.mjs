#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  classify,
  declaredLaneRiskFromBody,
  evaluateMediumSourceOnlyEligibility,
  loadRouterContract,
} from "./classify-risk.mjs";

const TRUSTED_ASSOCIATIONS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const SUCCESS = "success";

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function ghJson(args) {
  const output = execFileSync("gh", args, {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(output);
}

function repositoryIdentity(expectedRepository) {
  const value = process.env.GITHUB_REPOSITORY;
  const match = typeof value === "string" ? value.match(/^([^/]+)\/([^/]+)$/) : null;
  if (!match) throw new Error("GITHUB_REPOSITORY must identify one owner/repository.");
  if (value !== expectedRepository) throw new Error("GITHUB_REPOSITORY does not match the trusted Router contract.");
  return { owner: match[1], name: match[2], slug: value };
}

function pullRequestNumber() {
  const eventNumber = process.env.PR_NUMBER ?? process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
  if (!/^[1-9]\d*$/.test(eventNumber ?? "")) throw new Error("PR_NUMBER must be a positive integer.");
  const parsed = Number(eventNumber);
  if (!Number.isSafeInteger(parsed)) throw new Error("PR_NUMBER exceeds the bounded integer range.");
  return parsed;
}

function expectedHeadSha() {
  const value = process.env.EXPECTED_HEAD_SHA;
  if (!/^[0-9a-f]{40}$/.test(value ?? "")) throw new Error("EXPECTED_HEAD_SHA must be one exact lowercase SHA.");
  return value;
}

const SNAPSHOT_QUERY = String.raw`
query RouterV2LiteSnapshot($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    defaultBranchRef { name target { oid } }
    pullRequest(number: $number) {
      number
      url
      state
      isDraft
      isCrossRepository
      mergeable
      headRefName
      headRefOid
      baseRefName
      baseRefOid
      body
      labels(first: 100) { nodes { name } pageInfo { hasNextPage } }
      files(first: 100) { nodes { path } pageInfo { hasNextPage } }
      reviewThreads(first: 100) {
        nodes { isResolved isOutdated }
        pageInfo { hasNextPage }
      }
      reviews(last: 100) {
        nodes {
          author { login }
          authorAssociation
          body
          state
          submittedAt
          commit { oid }
        }
        pageInfo { hasPreviousPage }
      }
    }
  }
}`;

function latestCheckStates(repository, headSha) {
  const checks = ghJson([
    "api",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository.slug}/commits/${headSha}/check-runs?per_page=100`,
  ]);
  if (checks.total_count > 100) throw new Error("More than 100 exact-head check runs are uninspectable.");

  const statuses = ghJson([
    "api",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository.slug}/commits/${headSha}/status?per_page=100`,
  ]);
  if ((statuses.statuses?.length ?? 0) >= 100) throw new Error("At least 100 exact-head status contexts are uninspectable.");

  const records = [];
  for (const check of checks.check_runs ?? []) {
    records.push({
      name: check.name,
      id: check.id,
      terminal: check.status === "completed",
      success: check.status === "completed" && check.conclusion === SUCCESS,
      state: check.conclusion ?? check.status,
      source: "check_run",
      appSlug: check.app?.slug ?? null,
      appId: check.app?.id ?? null,
    });
  }
  for (const status of statuses.statuses ?? []) {
    records.push({
      name: status.context,
      id: status.id,
      terminal: ["success", "failure", "error"].includes(status.state),
      success: status.state === SUCCESS,
      state: status.state,
      source: "commit_status",
      avatarUrl: status.avatar_url ?? null,
      targetUrl: status.target_url ?? null,
    });
  }

  const grouped = new Map();
  for (const record of records) {
    const group = grouped.get(record.name) ?? [];
    group.push(record);
    grouped.set(record.name, group);
  }
  const latest = new Map();
  for (const [name, group] of grouped) {
    const sourceCount = new Set(group.map((record) => record.source)).size;
    const selected = group.reduce((current, candidate) => candidate.id > current.id ? candidate : current);
    latest.set(name, { ...selected, ambiguousSources: sourceCount > 1 });
  }
  return Object.fromEntries([...latest.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function baseContainedInHead(repository, baseSha, headSha) {
  const comparison = ghJson([
    "api",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository.slug}/compare/${baseSha}...${headSha}`,
  ]);
  return comparison.behind_by === 0 && ["ahead", "identical"].includes(comparison.status);
}

function liveRulesetEvidence(repository, contract) {
  const expected = contract.protectedMainRuleset;
  const live = ghJson([
    "api",
    "-H", "Accept: application/vnd.github+json",
    `repos/${repository.slug}/rulesets/${expected.id}`,
  ]);
  const blockers = [];
  if (live.id !== expected.id) blockers.push("ruleset_id_drift");
  if (live.name !== expected.name) blockers.push("ruleset_name_drift");
  if (live.target !== expected.target) blockers.push("ruleset_target_drift");
  if (live.enforcement !== expected.enforcement) blockers.push("ruleset_not_active");
  if ((live.bypass_actors?.length ?? 0) !== expected.bypassActorCount) blockers.push("ruleset_bypass_actor_drift");
  const observedIncludes = [...(live.conditions?.ref_name?.include ?? [])].sort();
  const observedExcludes = [...(live.conditions?.ref_name?.exclude ?? [])].sort();
  if (JSON.stringify(observedIncludes) !== JSON.stringify([...expected.refNameIncludeExactly].sort())) {
    blockers.push("ruleset_ref_include_drift");
  }
  if (JSON.stringify(observedExcludes) !== JSON.stringify([...expected.refNameExcludeExactly].sort())) {
    blockers.push("ruleset_ref_exclude_drift");
  }

  const pullRequestRule = live.rules?.find((rule) => rule.type === "pull_request");
  const requiredChecksRule = live.rules?.find((rule) => rule.type === "required_status_checks");
  const observedMethods = [...(pullRequestRule?.parameters?.allowed_merge_methods ?? [])].sort();
  if (JSON.stringify(observedMethods) !== JSON.stringify([...expected.allowedMergeMethodsExactly].sort())) {
    blockers.push("ruleset_merge_method_drift");
  }
  if (pullRequestRule?.parameters?.required_review_thread_resolution !== expected.requiredReviewThreadResolution) {
    blockers.push("ruleset_review_thread_policy_drift");
  }
  if (requiredChecksRule?.parameters?.strict_required_status_checks_policy !== expected.strictRequiredStatusChecks) {
    blockers.push("ruleset_strict_status_policy_drift");
  }

  const expectedChecks = contract.requiredExactHeadChecks
    .map((context) => ({ context, integration_id: contract.requiredCheckProducers[context].integrationId }))
    .sort((left, right) => left.context.localeCompare(right.context));
  const observedChecks = [...(requiredChecksRule?.parameters?.required_status_checks ?? [])]
    .map(({ context, integration_id }) => ({ context, integration_id }))
    .sort((left, right) => left.context.localeCompare(right.context));
  if (JSON.stringify(observedChecks) !== JSON.stringify(expectedChecks)) blockers.push("ruleset_required_check_drift");
  return { clean: blockers.length === 0, blockers: sortedUnique(blockers) };
}

function latestReviewState(reviews) {
  const latestByAuthor = new Map();
  for (const review of [...reviews].sort((left, right) => left.submittedAt.localeCompare(right.submittedAt))) {
    if (review.author?.login) latestByAuthor.set(review.author.login, review);
  }
  return [...latestByAuthor.values()];
}

export function reviewEvidence(pr, expectedHead, contract) {
  const marker = contract.automaticMerge.freshTrustedReviewMarker;
  const exactMarker = `${marker} head=${expectedHead} actionable=${contract.automaticMerge.actionableCountsRequired}`;
  const reviews = pr.reviews?.nodes ?? [];
  const trustedHeadReviews = reviews.filter((review) => (
    TRUSTED_ASSOCIATIONS.has(review.authorAssociation)
    && review.commit?.oid === expectedHead
  )).sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
  const latestTrustedHeadReview = trustedHeadReviews.at(-1) ?? null;
  const formalReviewClean = Boolean(
    latestTrustedHeadReview
    && ["APPROVED", "COMMENTED"].includes(latestTrustedHeadReview.state)
    && String(latestTrustedHeadReview.body ?? "").split(/\r?\n/).some((line) => line.trim() === exactMarker),
  );
  const latest = latestReviewState(reviews);
  const latestChangesRequestedCount = latest.filter((review) => (
    review.state === "CHANGES_REQUESTED" && review.commit?.oid === expectedHead
  )).length;
  const activeThreads = (pr.reviewThreads?.nodes ?? []).filter((thread) => !thread.isResolved && !thread.isOutdated);
  return {
    exactMarker,
    trustedHeadReviewCount: trustedHeadReviews.length,
    formalReviewClean,
    latestChangesRequestedCount,
    unresolvedThreadCount: activeThreads.length,
  };
}

function parseLaneDeclaration(body) {
  const lines = String(body ?? "").split(/\r?\n/).filter((candidate) => (
    candidate.trim().startsWith("FAST_DELIVERY_ROUTER_V2_LITE_LANE ")
  ));
  if (lines.length !== 1) return null;
  const match = lines[0].trim().match(/^FAST_DELIVERY_ROUTER_V2_LITE_LANE lane=([^\s]+) branch=([^\s]+)$/);
  return match ? { laneId: match[1], branch: match[2] } : null;
}

function mediumSourceOnlyEvidence(registration, checkStates) {
  const green = (name) => checkStates[name]?.terminal === true && checkStates[name]?.success === true;
  return {
    ...(registration?.prevalidatedEvidence ?? {}),
    affectedRegressionPassed: green("full-ci") && green("full-ci-windows"),
    buildPassedWhenApplicable: green("Vercel"),
    focusedTestsPassed: green("risk-classifier") && green("fast-ci"),
  };
}

export function evaluateAutomaticMergeEvidence({
  contract,
  pr,
  expectedHead,
  classification,
  checkStates,
  review,
  mediumSourceOnly,
  baseContained,
  ruleset,
}) {
  const blockers = [];
  if (pr.state !== "OPEN") blockers.push("pull_request_not_open");
  if (pr.isCrossRepository) blockers.push("cross_repository_pull_request");
  if (pr.headRefOid !== expectedHead) blockers.push("exact_head_drift");
  if (pr.baseRefName !== contract.baseBranch) blockers.push("base_is_not_trusted_default_branch");
  if (!baseContained) blockers.push("current_main_not_contained_in_head");
  if (!ruleset?.clean) {
    for (const blocker of ruleset?.blockers ?? ["ruleset_uninspectable"]) blockers.push(blocker);
  }
  if (pr.mergeable !== "MERGEABLE") blockers.push(`mergeability_${String(pr.mergeable).toLowerCase()}`);
  if (
    pr.labels?.pageInfo?.hasNextPage
    || pr.files?.pageInfo?.hasNextPage
    || pr.reviewThreads?.pageInfo?.hasNextPage
    || pr.reviews?.pageInfo?.hasPreviousPage
  ) {
    blockers.push("bounded_graphql_snapshot_incomplete");
  }

  const blockingLabels = (pr.labels?.nodes ?? [])
    .map((label) => label.name)
    .filter((name) => contract.blockingLabels.includes(name));
  for (const label of blockingLabels) blockers.push(`blocking_label:${label}`);

  let candidateKind = null;
  if (classification.profile === "LOW" && classification.automaticMergeCandidate) candidateKind = "LOW";
  if (classification.profile === "MEDIUM" && mediumSourceOnly?.eligible) candidateKind = "MEDIUM_SOURCE_ONLY";
  if (!candidateKind) blockers.push(`profile_not_automatically_mergeable:${classification.profile}`);
  if (candidateKind && !contract.automaticMerge.allowedCandidateKindsExactly.includes(candidateKind)) {
    blockers.push(`candidate_kind_not_allowed:${candidateKind}`);
  }

  for (const checkName of contract.requiredExactHeadChecks) {
    const check = checkStates[checkName];
    const producer = contract.requiredCheckProducers[checkName];
    if (!check) blockers.push(`required_check_missing:${checkName}`);
    else if (check.ambiguousSources) blockers.push(`required_check_ambiguous_sources:${checkName}`);
    else if (!check.terminal) blockers.push(`required_check_not_terminal:${checkName}`);
    else if (!check.success) blockers.push(`required_check_not_green:${checkName}`);
    else if (!producer || check.source !== producer.source) blockers.push(`required_check_wrong_source:${checkName}`);
    else if (producer.source === "check_run" && (
      check.appSlug !== producer.appSlug || check.appId !== producer.appId
    )) blockers.push(`required_check_wrong_producer:${checkName}`);
    else if (producer.source === "commit_status" && (
      !String(check.avatarUrl ?? "").startsWith(producer.avatarUrlPrefix)
      || !String(check.targetUrl ?? "").startsWith(producer.targetUrlPrefix)
    )) blockers.push(`required_check_wrong_producer:${checkName}`);
  }
  if (!review.formalReviewClean) blockers.push("fresh_exact_head_formal_review_missing");
  if (review.latestChangesRequestedCount !== 0) blockers.push("current_changes_requested_review");
  if (review.unresolvedThreadCount !== 0) blockers.push("unresolved_actionable_threads");

  return {
    eligible: blockers.length === 0,
    candidateKind: blockers.length === 0 ? candidateKind : null,
    computedProfile: classification.profile,
    ownerApprovalRequired: classification.profile === "HIGH",
    blockers: sortedUnique(blockers),
  };
}

function pullRequestSnapshot(repository, number, expectedHead, contract) {
  const graph = ghJson([
    "api", "graphql",
    "-f", `query=${SNAPSHOT_QUERY}`,
    "-F", `owner=${repository.owner}`,
    "-F", `name=${repository.name}`,
    "-F", `number=${number}`,
  ]);
  const repositoryNode = graph.data?.repository;
  const pr = repositoryNode?.pullRequest;
  if (!pr) throw new Error(`Pull request #${number} is not readable.`);
  if (repositoryNode.defaultBranchRef?.name !== "main") throw new Error("Repository default branch is not main.");
  const currentMain = repositoryNode.defaultBranchRef?.target?.oid;
  if (!/^[0-9a-f]{40}$/.test(currentMain ?? "")) throw new Error("Current main SHA is uninspectable.");

  const changedFiles = (pr.files?.nodes ?? []).map((node) => node.path);
  const classification = classify(changedFiles, [], contract, {
    declaredLaneRisk: declaredLaneRiskFromBody(pr.body),
  });
  const checkStates = latestCheckStates(repository, expectedHead);
  const review = reviewEvidence(pr, expectedHead, contract);
  const laneDeclaration = parseLaneDeclaration(pr.body);
  const registration = laneDeclaration
    ? contract.mediumSourceOnly.registeredLanes.find((candidate) => (
      candidate.laneId === laneDeclaration.laneId && candidate.branch === laneDeclaration.branch
    ))
    : null;
  const mediumSourceOnly = evaluateMediumSourceOnlyEligibility({
    classification,
    contract,
    laneDeclaration,
    headRefName: pr.headRefName,
    evidence: mediumSourceOnlyEvidence(registration, checkStates),
  });
  const baseContained = baseContainedInHead(repository, currentMain, expectedHead);
  const ruleset = liveRulesetEvidence(repository, contract);
  const decision = evaluateAutomaticMergeEvidence({
    contract,
    pr,
    expectedHead,
    classification,
    checkStates,
    review,
    mediumSourceOnly,
    baseContained,
    ruleset,
  });
  return { pr, currentMain, changedFiles, classification, checkStates, review, mediumSourceOnly, baseContained, ruleset, decision };
}

function markReady(repository, number) {
  execFileSync("gh", ["pr", "ready", String(number), "--repo", repository.slug], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function squashMerge(repository, number, expectedHead) {
  execFileSync(
    "gh",
    ["pr", "merge", String(number), "--repo", repository.slug, "--squash", "--match-head-commit", expectedHead],
    { encoding: "utf8", env: process.env, stdio: ["ignore", "pipe", "pipe"] },
  );
}

export function runAutomaticMerge() {
  const contract = loadRouterContract();
  const repository = repositoryIdentity(contract.repository);
  const number = pullRequestNumber();
  const expectedHead = expectedHeadSha();
  const initial = pullRequestSnapshot(repository, number, expectedHead, contract);
  if (!initial.decision.eligible) {
    console.log(JSON.stringify({ action: "NO_AUTOMATIC_MUTATION", number, expectedHead, ...initial.decision }, null, 2));
    return initial.decision;
  }

  if (initial.pr.isDraft) markReady(repository, number);
  const finalSnapshot = pullRequestSnapshot(repository, number, expectedHead, contract);
  if (finalSnapshot.pr.isDraft || !finalSnapshot.decision.eligible) {
    throw new Error(`Post-Ready exact-head gate failed: ${finalSnapshot.decision.blockers.join(", ")}`);
  }
  squashMerge(repository, number, expectedHead);
  console.log(JSON.stringify({
    action: "SQUASH_MERGE_REQUESTED",
    number,
    expectedHead,
    candidateKind: finalSnapshot.decision.candidateKind,
  }, null, 2));
  return finalSnapshot.decision;
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedAsScript) {
  try {
    runAutomaticMerge();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
