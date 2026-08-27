import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  QF_ORDER,
  REQUIRED_STABLE_CHECKS,
  evaluateAutomaticMerge,
  validateAuthority,
  validateCandidateChangedPaths,
  validateLaneChangedPaths,
} from "../scripts/automation/fast-delivery-parallel-v2.mjs";
import { classify, findRegisteredLaneProfileOverride, findRegisteredLaneRegistration, parsePolicy } from "../scripts/automation/classify-risk.mjs";
import { parseChangedJson, selectChangedEvidence } from "../scripts/automation/validation-profile-v2.mjs";

const root = new URL("../", import.meta.url);
const contract = JSON.parse(await readFile(new URL("../config/dabangil-fast-delivery-parallel-execution-v2.json", import.meta.url), "utf8"));

function clone(value) {
  return structuredClone(value);
}

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

function passingSnapshot(overrides = {}) {
  const headSha = "a".repeat(40);
  const completedAt = "2026-08-27T01:00:00.000Z";
  return {
    state: "OPEN",
    isDraft: true,
    mergeStateStatus: "BLOCKED",
    baseRefName: "main",
    sameRepository: true,
    registeredLane: true,
    pathOwnershipValid: true,
    isolatedWorktreeDeclared: true,
    expectedHeadSha: headSha,
    headSha,
    profile: "LOW",
    classifierHeadSha: headSha,
    changedPathCount: 3,
    labels: [],
    checks: Object.fromEntries(REQUIRED_STABLE_CHECKS.map((name) => [name, {
      headSha,
      conclusion: "SUCCESS",
      completedAt,
    }])),
    finalReview: {
      headSha,
      actionableP0P1P2: [0, 0, 0],
      formal: true,
      trustedReviewer: true,
      submittedAt: "2026-08-27T01:01:00.000Z",
    },
    unresolvedNonOutdatedReviewThreads: 0,
    blockingCurrentHeadReviewCount: 0,
    mergeable: "MERGEABLE",
    ...overrides,
  };
}

test("V2 authority is closed, fail-closed, and product-inert", () => {
  assert.deepEqual(validateAuthority(contract), { ok: true, errors: [] });
  assert.equal(contract.authorityStatus, "effective_only_after_exact_head_owner_approved_squash_merge_and_validated_github_receipt");
  assert.deepEqual(contract.stableRequiredCheckNames, REQUIRED_STABLE_CHECKS);
  assert.deepEqual(contract.questionFoundrySplitCampaign.declaredIntegrationAndMergeOrder, QF_ORDER);
  assert.equal(contract.questionFoundrySplitCampaign.monolithicReplacementProhibited, true);
  assert.equal(contract.questionFoundrySplitCampaign.maximumConcurrentMergeProducingLanes, 2);
  assert.ok(Object.values(contract.activationBoundary).every((value) => value === false));
  assert.deepEqual(validateCandidateChangedPaths(contract, contract.candidateLane.ownedPathsExactly), { ok: true, errors: [] });
  assert.match(
    validateCandidateChangedPaths(contract, contract.candidateLane.ownedPathsExactly.slice(1)).errors.join("\n"),
    /candidate manifest path is missing/u,
  );
});

test("Question Foundry manifests are exact, disjoint, and dependency ordered", () => {
  const allPaths = contract.questionFoundrySplitCampaign.lanes.flatMap((lane) => lane.ownedPathsExactly);
  assert.equal(new Set(allPaths).size, allPaths.length);
  assert.ok(allPaths.every((value) => !/[?*\[\]{}\\]/u.test(value)));
  const s1 = contract.questionFoundrySplitCampaign.lanes[1];
  assert.deepEqual(validateLaneChangedPaths(contract, s1.laneId, s1.ownedPathsExactly), { ok: true, errors: [] });
  assert.match(
    validateLaneChangedPaths(contract, s1.laneId, [...s1.ownedPathsExactly, "docs/exec-plans/active/inverge-owner-study-os.md"], { includeSerialIntegrationPaths: true }).errors.join("\n"),
    /undeclared changed path/u,
  );
  const escaped = validateLaneChangedPaths(contract, s1.laneId, [...s1.ownedPathsExactly, "../outside"]);
  assert.equal(escaped.ok, false);
  assert.match(escaped.errors.join("\n"), /invalid or globbed|undeclared changed path/u);
});

test("authority rejects path overlap, release leakage, and dependency drift", () => {
  const overlapping = clone(contract);
  overlapping.questionFoundrySplitCampaign.lanes[2].ownedPathsExactly[0] =
    overlapping.questionFoundrySplitCampaign.lanes[1].ownedPathsExactly[0];
  assert.match(validateAuthority(overlapping).errors.join("\n"), /owned path overlap/u);

  const expanded = clone(contract);
  expanded.questionFoundrySplitCampaign.lanes[1].ownedPathsExactly.push("config/dabangil-fast-delivery-parallel-execution-v2.json");
  assert.match(validateAuthority(expanded).errors.join("\n"), /exact path manifest drifted/u);

  const released = clone(contract);
  released.questionFoundrySplitCampaign.lanes[0].releaseStatesAvailable = ["PERSONAL_LEARNING_USABLE"];
  assert.match(validateAuthority(released).errors.join("\n"), /QF-0 must expose no release state/u);

  const earlyIntegration = clone(contract);
  earlyIntegration.questionFoundrySplitCampaign.lanes[4].dependencies.pop();
  assert.match(validateAuthority(earlyIntegration).errors.join("\n"), /QF-I1 dependency drifted/u);

  const parallelSharedMutation = clone(contract);
  parallelSharedMutation.questionFoundrySplitCampaign.lanes[1].serialIntegrationPathsExactly = ["scripts/run-node-tests.mjs"];
  assert.match(validateAuthority(parallelSharedMutation).errors.join("\n"), /shared serial integration paths are prohibited/u);
});

test("risk routing is specific-low before broad-medium and unknown fails HIGH", () => {
  const policy = parsePolicy(new URL("../config/agent-risk-policy.yml", import.meta.url));
  assert.equal(classify(["docs/qa/example.md"], [], policy).profile, "LOW");
  assert.equal(classify(["lib/question-foundry/similarity/bounded-similarity-corpus-v1.mjs"], [], policy).profile, "LOW");
  assert.equal(classify(["lib/question-foundry/quarantine-core-v1.mjs"], [], policy).profile, "MEDIUM");
  assert.equal(classify([".github/workflows/ci-fast.yml"], [], policy).profile, "HIGH");
  assert.equal(classify(["unclassified/new-kind.bin"], [], policy).profile, "HIGH");

  const s1 = contract.questionFoundrySplitCampaign.lanes[1];
  const registeredPaths = [...s1.ownedPathsExactly];
  const override = findRegisteredLaneProfileOverride(registeredPaths, s1.branch);
  assert.equal(override, "LOW");
  assert.equal(classify(registeredPaths, [], policy, { profileOverride: override }).profile, "LOW");
  assert.equal(classify(registeredPaths, ["durable_release_authority"], policy, { profileOverride: override }).profile, "HIGH");
  assert.equal(
    findRegisteredLaneProfileOverride([...registeredPaths, contract.questionFoundrySplitCampaign.serialProgramLogIntegration.path], s1.branch),
    null,
  );
  assert.equal(findRegisteredLaneProfileOverride([...registeredPaths, "AGENTS.md"], s1.branch), null);

  const qfI1 = contract.questionFoundrySplitCampaign.lanes[4];
  assert.deepEqual(
    validateLaneChangedPaths(contract, qfI1.laneId, [...qfI1.ownedPathsExactly, ...qfI1.serialIntegrationPathsExactly], { includeSerialIntegrationPaths: true }),
    { ok: true, errors: [] },
  );
  const qfI1Registration = findRegisteredLaneRegistration(qfI1.ownedPathsExactly, qfI1.branch);
  const qfI1Classification = classify(qfI1.ownedPathsExactly, [], policy, {
    profileOverride: qfI1Registration.profile,
    registeredLaneId: qfI1Registration.laneId,
  });
  assert.equal(qfI1Classification.profile, "HIGH");
  assert.equal(qfI1Classification.validationRoute, "QF_I1_BOUNDED_HIGH");
  assert.equal(qfI1Classification.heavyWindowsRequired, false);
  assert.equal(qfI1Classification.learnerLoopRequired, false);
});

test("validation evidence selection is deterministic and schema parsing fails closed", () => {
  const selected = selectChangedEvidence([
    "tests/z.test.mjs",
    "config/example.json",
    "tests/e2e/example.spec.ts",
    "tests/z.test.mjs",
  ]);
  assert.deepEqual(selected.focusedTests, ["tests/z.test.mjs"]);
  assert.deepEqual(selected.representativeE2e, ["tests/e2e/example.spec.ts"]);
  assert.deepEqual(selected.jsonSchemas, ["config/example.json"]);
  assert.equal(parseChangedJson(["config/dabangil-fast-delivery-parallel-execution-v2.json"]).length, 0);
});

test("LOW and MEDIUM automatic merge require exact-head post-check clean review", () => {
  assert.deepEqual(evaluateAutomaticMerge(contract, passingSnapshot()), { eligible: true, errors: [] });
  assert.deepEqual(evaluateAutomaticMerge(contract, passingSnapshot({ profile: "MEDIUM" })), { eligible: true, errors: [] });

  const high = evaluateAutomaticMerge(contract, passingSnapshot({ profile: "HIGH" }));
  assert.equal(high.eligible, false);
  assert.match(high.errors.join("\n"), /Owner approval/u);

  const stale = passingSnapshot();
  stale.checks["fast-ci"].headSha = "b".repeat(40);
  assert.match(evaluateAutomaticMerge(contract, stale).errors.join("\n"), /fast-ci: check is missing or stale/u);

  const earlyReview = passingSnapshot();
  earlyReview.finalReview.submittedAt = "2026-08-27T00:59:59.000Z";
  assert.match(evaluateAutomaticMerge(contract, earlyReview).errors.join("\n"), /postdate/u);

  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ labels: ["do-not-merge"] })).errors.join("\n"), /blocking label/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ pathOwnershipValid: false })).errors.join("\n"), /exact ownership/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ unresolvedNonOutdatedReviewThreads: 1 })).errors.join("\n"), /threads must be zero/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ blockingCurrentHeadReviewCount: 1 })).errors.join("\n"), /changes-requested/u);
  assert.match(evaluateAutomaticMerge(contract, passingSnapshot({ isDraft: false, mergeStateStatus: "BLOCKED" })).errors.join("\n"), /ruleset merge state/u);
});

test("workflows retain stable checks, gate heavy jobs, and keep HIGH out of auto-merge", async () => {
  const [risk, fast, full, heavy, merge, runtime, learner] = await Promise.all([
    read(".github/workflows/risk-classifier.yml"),
    read(".github/workflows/ci-fast.yml"),
    read(".github/workflows/ci-full.yml"),
    read(".github/workflows/reusable-heavy-validation-v2.yml"),
    read(".github/workflows/auto-merge.yml"),
    read(".github/workflows/runtime-gate.yml"),
    read(".github/workflows/learner-loop-health.yml"),
  ]);
  assert.match(risk, /name: risk-classifier/u);
  assert.match(fast, /name: fast-ci/u);
  assert.match(full, /name: full-ci\b/u);
  assert.match(full, /name: full-ci-windows/u);
  assert.match(full, /profile == 'MEDIUM' \|\| needs\.classify\.outputs\.profile == 'HIGH'/u);
  assert.match(full, /profile == 'HIGH'/u);
  assert.match(heavy, /workflow_call:/u);
  assert.match(heavy, /HIGH full test suite/u);
  assert.match(heavy, /QF-I1 exact bounded test suite/u);
  assert.match(heavy, /qf-i1-tests/u);
  assert.match(heavy, /--production-audit/u);
  assert.match(heavy, /--full-audit/u);
  assert.match(heavy, /--policy config\/foundation-continuous-security-automation-v1\.json/u);
  assert.match(heavy, /--sbom/u);
  assert.match(heavy, /--package package\.json/u);
  assert.match(heavy, /--output/u);
  assert.match(runtime, /name: runtime-gate/u);
  assert.match(learner, /name: Learner Loop Health/u);
  assert.match(merge, /github\.ref == 'refs\/heads\/main'/u);
  assert.match(merge, /pull_request_review:/u);
  assert.match(merge, /head\.repo\.full_name == github\.repository/u);
  assert.match(merge, /contains\(github\.event\.review\.body, 'FAST_DELIVERY_V2_FINAL_REVIEW'\)/u);
  assert.match(merge, /automatic-merge-v2\.mjs/u);
  assert.doesNotMatch(merge, /pull_request_target/u);
});

test("V2 PR contract is exact-scope Draft and reference-only", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "fast-delivery-v2-pr-"));
  const eventPath = path.join(directory, "event.json");
  const body = `## Goal
Install the bounded V2 operating amendment.

Refs #714
Issue #714 remains open; this operating amendment closes no issue and starts no product mutation.

## Non-goals
No product mutation.
## Risk classification
- Risk: [high]
## Data boundary
No data.
## Schema / API / environment changes
None.
## Tests and evidence
Focused and HIGH checks.
## Runtime evidence
Not applicable to source-only workflow authority.
## Rollout and rollback
Merge only after Owner approval; revert the squash commit.
## Remaining risks
None after gates.
## Merge recommendation
- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
  const delivery = contract.deliveryControl;
  await writeFile(eventPath, JSON.stringify({
    repository: { full_name: delivery.repository },
    pull_request: {
      body,
      base: { ref: delivery.baseRef, sha: delivery.baseSha },
      head: { ref: delivery.headRef, repo: { full_name: delivery.headRepository } },
      title: delivery.pullRequestTitle,
      draft: true,
    },
  }));
  try {
    const result = spawnSync(process.execPath, ["scripts/automation/validate-pr-contract.mjs"], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /validate-pr-contract: pass/u);

    const invalid = JSON.parse(await readFile(eventPath, "utf8"));
    invalid.pull_request.body = invalid.pull_request.body.replace("Refs #714", "Closes #714");
    await writeFile(eventPath, JSON.stringify(invalid));
    const rejected = spawnSync(process.execPath, ["scripts/automation/validate-pr-contract.mjs"], {
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /reference-only #714/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("decision, AGENTS, roadmap, and program log bind the exact bounded gate", async () => {
  const [decision, agents, roadmap, log, runner] = await Promise.all([
    read("docs/decisions/2026-08-27-owner-fast-delivery-parallel-execution-v2.md"),
    read("AGENTS.md"),
    read("roadmap/active-program.yml"),
    read("docs/exec-plans/active/inverge-owner-study-os.md"),
    read("scripts/run-node-tests.mjs"),
  ]);
  assert.match(decision, /HIGH-risk candidate/u);
  assert.match(decision, /QF-S1 and QF-S2 are the only parallel pair/u);
  assert.match(decision, /installs no Question Foundry product code/u);
  assert.match(agents, /2026-08-27-owner-fast-delivery-parallel-execution-v2\.md/u);
  assert.match(roadmap, /ownerStudyOsQuestionFoundryProductMutationStartAllowed: false/u);
  assert.match(log, /QUESTION_FOUNDRY_R5_CLOSED_UNMERGED_SCOPE_SPLIT_DONOR/u);
  assert.match(log, /FAST_DELIVERY_PARALLEL_V2_OWNER_APPROVAL_REQUIRED/u);
  assert.match(runner, /tests\/fast-delivery-parallel-execution-v2\.test\.mjs/u);
});
