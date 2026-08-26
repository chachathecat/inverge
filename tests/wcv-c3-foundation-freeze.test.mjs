import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTRACT_PATH = path.join(
  ROOT,
  "config",
  "dabangil-wcv-c3-foundation-freeze-v1.json",
);
const contract = JSON.parse(await readFile(CONTRACT_PATH, "utf8"));

const RECEIPT_FIELDS = [
  "stage",
  "pullRequest",
  "baseSha",
  "reviewedHead",
  "reviewedTree",
  "squashMergeSha",
  "resultingMainSha",
  "resultingMainTree",
  "exactHeadChecksPassed",
  "formalReviewId",
  "actionableCounts",
  "unresolvedActionableThreads",
  "runtimeEvidenceRefs",
  "perSubjectIssueEvidence",
  "metadataOnlyArtifactRefs",
  "featureDefaultOff",
  "remoteMutationCount",
];

const EVIDENCE_FIELDS = [
  "stage",
  "subject",
  "issue",
  "evidenceKey",
  "runtimeEvidenceRef",
];

const REQUIRED_BY_ISSUE = {
  706: [
    "FROZEN_D0",
    "D_PLUS_1_UNAIDED_RECONSTRUCTION",
    "SEALED_NON_SAME_SURFACE_D_PLUS_7_TRANSFER",
    "TIMED_RECURRENCE",
    "LATER_FAILURE_REOPEN",
  ],
  707: [
    "LEARNER_PRIVATE_FORCED_RLS_LEDGER",
    "EXACT_SOURCE_ATTEMPT_ARTIFACT_ITEM_BINDING",
    "BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION",
    "SOURCE_BOUND_FAILURE_NOTES",
    "RESTORE_EXPORT_DELETE",
  ],
  708: [
    "DETERMINISTIC_REVIEW_QUEUE",
    "TODAY_AND_FULL_DAY",
    "CORE_OUTCOME_MAXIMUM_3",
    "PLANNER_REVIEW_STATE_SEPARATION",
    "ACCEPT_EDIT_REJECT_WITHOUT_EVIDENCE_MUTATION",
    "STALE_PLAN_REJECTION_AND_ELIGIBILITY_REFRESH",
  ],
};

const EXACT_RECEIPTS = {
  "C3R-P": {
    pullRequest: 800,
    baseSha: "342d3795c8ea51aeb6f94751a5db913a9dbfcffd",
    reviewedHead: "8f434027e5d20a5f3e799b1c2d85876e766b3858",
    reviewedTree: "f6fb7bc1d1613a8431a4bbdfe155eea9d9f5303c",
    resultingMainSha: "71fd878a7369c25a153bc90389347039684c501f",
    resultingMainTree: "f6fb7bc1d1613a8431a4bbdfe155eea9d9f5303c",
    subject: "PRACTICE",
    actionableCounts: { p0: 0, p1: 0, p2: 0 },
  },
  "C3R-T": {
    pullRequest: 816,
    baseSha: "cad8b98e4f13a2fe50d82ffd983616adc70eb75a",
    reviewedHead: "96933cbe08864c6b3cb94a7349cb33e92bf2df8d",
    reviewedTree: "3b01fc6b9ea5576992dd9b9612de7dae4d546b7f",
    resultingMainSha: "a70a7e0dbde7919c82d00189dafb91b7681caca3",
    resultingMainTree: "3b01fc6b9ea5576992dd9b9612de7dae4d546b7f",
    subject: "THEORY",
    actionableCounts: { p0: 0, p1: 0, p2: 1 },
  },
  "C3R-L": {
    pullRequest: 832,
    baseSha: "75f3ce787d31047c2bceacc2ef752c0bfdfb23cc",
    reviewedHead: "fa0084b13ea2e6c2bedf72f0084d57c66158bd4d",
    reviewedTree: "d24d7d8259918e0a50d8a6b0455289b01ef6f3c4",
    resultingMainSha: "4989f02f54f187fb440f2bfa6722e4ee832420de",
    resultingMainTree: "d24d7d8259918e0a50d8a6b0455289b01ef6f3c4",
    subject: "LAW",
    actionableCounts: { p0: 0, p1: 0, p2: 0 },
  },
};

const EXACT_PATHS = [
  "AGENTS.md",
  "config/dabangil-wcv-c3-foundation-freeze-v1.json",
  "docs/decisions/2026-08-26-owner-wcv-c3-foundation-freeze.md",
  "docs/exec-plans/active/inverge-owner-study-os.md",
  "scripts/run-node-tests.mjs",
  "tests/wcv-c3-foundation-freeze.test.mjs",
];

function sorted(value) {
  return [...value].sort();
}

function git(...args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function assertReceipt(receipt) {
  assert.deepEqual(sorted(Object.keys(receipt)), sorted(RECEIPT_FIELDS));
  const expected = EXACT_RECEIPTS[receipt.stage];
  assert.ok(expected, receipt.stage);
  for (const field of [
    "pullRequest",
    "baseSha",
    "reviewedHead",
    "reviewedTree",
    "resultingMainSha",
    "resultingMainTree",
  ]) assert.equal(receipt[field], expected[field], `${receipt.stage}:${field}`);
  assert.equal(receipt.squashMergeSha, receipt.resultingMainSha);
  assert.equal(receipt.exactHeadChecksPassed, true);
  assert.match(receipt.formalReviewId, /^(?:IC|PRR)_/u);
  assert.deepEqual(receipt.actionableCounts, expected.actionableCounts);
  assert.equal(receipt.unresolvedActionableThreads, 0);
  assert.equal(receipt.featureDefaultOff, true);
  assert.equal(receipt.remoteMutationCount, 0);
  assert.ok(receipt.runtimeEvidenceRefs.length > 0);
  assert.ok(receipt.metadataOnlyArtifactRefs.length > 0);

  const seen = new Set();
  for (const entry of receipt.perSubjectIssueEvidence) {
    assert.deepEqual(sorted(Object.keys(entry)), sorted(EVIDENCE_FIELDS));
    assert.equal(entry.stage, receipt.stage);
    assert.equal(entry.subject, expected.subject);
    assert.ok(REQUIRED_BY_ISSUE[entry.issue]);
    assert.ok(REQUIRED_BY_ISSUE[entry.issue].includes(entry.evidenceKey));
    assert.equal(
      entry.runtimeEvidenceRef,
      `${expected.subject}_RUNTIME:${{
        PRACTICE: "c3r-p-practice-common-durable-runtime-v1",
        THEORY: "c3r-t-theory-durable-learning-v1",
        LAW: "c3r-l-law-durable-learning-v1",
      }[expected.subject]}#${entry.issue}:${entry.evidenceKey}`,
    );
    const identity = `${entry.issue}:${entry.evidenceKey}`;
    assert.equal(seen.has(identity), false, identity);
    seen.add(identity);
  }
  const required = Object.entries(REQUIRED_BY_ISSUE)
    .flatMap(([issue, keys]) => keys.map((key) => `${issue}:${key}`));
  assert.deepEqual(sorted(seen), sorted(required));
}

test("is a minimal source-only Foundation Freeze, not another receipt or control plane", () => {
  assert.equal(contract.schemaVersion, "dabangil.wcv_c3.foundation_freeze.v1");
  assert.equal(contract.milestone, "M3");
  assert.equal(contract.authority.sourceOnly, true);
  for (const field of [
    "createsProductStage",
    "createsMasterPlan",
    "createsGeneralReceiptSystem",
    "createsSecondControlPlane",
  ]) assert.equal(contract.authority[field], false, field);
  assert.equal(contract.receiptSemantics.liveGitHubIsSoleReceiptAuthority, true);
  assert.equal(contract.receiptSemantics.repositorySummaryIsIndependentReceipt, false);
  assert.deepEqual(
    contract.receiptSemantics.conformingC3RStageMergeReceiptV1StagesExactly,
    ["C3R-P", "C3R-L"],
  );
  assert.equal(contract.receiptSemantics.nonconformingHistoricalStageSummary, "C3R-T");
  assert.deepEqual(contract.receiptSemantics.requiredReceiptFieldsExactly, RECEIPT_FIELDS);
  assert.deepEqual(contract.pathManifest.changedPathsExactly, EXACT_PATHS);
  for (const field of [
    "migrationPathsChanged",
    "runtimePathsChanged",
    "workflowPathsChanged",
    "packageOrLockPathsChanged",
    "authOrRlsPathsChanged",
  ]) assert.equal(contract.pathManifest[field], 0, field);
});

test("binds exact C3R-P/T/L live stage history with honest Theory review state", () => {
  assert.deepEqual(
    contract.liveGitHubStageMergeSummaries.map(({ stage }) => stage),
    ["C3R-P", "C3R-T", "C3R-L"],
  );
  for (const receipt of contract.liveGitHubStageMergeSummaries) assertReceipt(receipt);
  assert.equal(contract.receiptSemantics.c3rTMergeReviewLateP2Recorded, true);
  assert.deepEqual(contract.receiptSemantics.c3rTRepairsExactly, [818, 820]);
  assert.equal(
    contract.receiptSemantics.terminalFreezeRequiresFreshExactHeadReviewOfRepairedCurrentTree,
    true,
  );
});

test("binds the ordinary repair chain without treating a repair as a stage receipt", () => {
  assert.deepEqual(contract.validatedRepairChainSummariesExactly, [
    {
      stage: "C3R-P",
      pullRequest: 806,
      baseSha: "71fd878a7369c25a153bc90389347039684c501f",
      reviewedHead: "2b24f29d8e7a8ad41289775a449afce3c0ef5b44",
      reviewedTree: "42859133338b8d1f638f852f170c0ddbb6be329a",
      resultingMainSha: "f3251d0161873c0113d82ee2e72b422436a01158",
      resultingMainTree: "42859133338b8d1f638f852f170c0ddbb6be329a",
    },
    {
      stage: "C3R-T",
      pullRequest: 818,
      baseSha: "a70a7e0dbde7919c82d00189dafb91b7681caca3",
      reviewedHead: "ff73a280cb476a75e5a8038dd7f1171effae8b6a",
      reviewedTree: "a9f3a119b7a3b7d4c586eb6ef58f1fd32f8a0c84",
      resultingMainSha: "64b7e3655e4fc78646aa4281abc6855d180f209b",
      resultingMainTree: "a9f3a119b7a3b7d4c586eb6ef58f1fd32f8a0c84",
    },
    {
      stage: "C3R-T",
      pullRequest: 820,
      baseSha: "64b7e3655e4fc78646aa4281abc6855d180f209b",
      reviewedHead: "53584fead7ea1a786bb163f66cc7ce1b767e8232",
      reviewedTree: "a3e8ab7618cbceddb2c9ac156a84fc45bb018f1b",
      resultingMainSha: "75f3ce787d31047c2bceacc2ef752c0bfdfb23cc",
      resultingMainTree: "a3e8ab7618cbceddb2c9ac156a84fc45bb018f1b",
    },
  ]);
});

test("proves each resulting-main squash identity is present and unreverted", () => {
  for (const receipt of contract.liveGitHubStageMergeSummaries) {
    assert.equal(git("show", "-s", "--format=%T", receipt.reviewedHead), receipt.reviewedTree);
    const [parents, tree] = git(
      "show",
      "-s",
      "--format=%P%n%T",
      receipt.resultingMainSha,
    ).split(/\r?\n/u);
    assert.equal(parents, receipt.baseSha, receipt.stage);
    assert.equal(tree, receipt.resultingMainTree, receipt.stage);
    assert.equal(receipt.resultingMainTree, receipt.reviewedTree, receipt.stage);
    git("merge-base", "--is-ancestor", receipt.resultingMainSha, "HEAD");
  }
  for (const repair of contract.validatedRepairChainSummariesExactly) {
    assert.equal(git("show", "-s", "--format=%T", repair.reviewedHead), repair.reviewedTree);
    const [parents, tree] = git(
      "show",
      "-s",
      "--format=%P%n%T",
      repair.resultingMainSha,
    ).split(/\r?\n/u);
    assert.equal(parents, repair.baseSha, `PR #${repair.pullRequest}`);
    assert.equal(tree, repair.resultingMainTree, `PR #${repair.pullRequest}`);
    assert.equal(repair.resultingMainTree, repair.reviewedTree, `PR #${repair.pullRequest}`);
    git("merge-base", "--is-ancestor", repair.resultingMainSha, "HEAD");
  }
});

test("derives the exact M3 changed-path envelope in the candidate worktree", () => {
  const candidateBranch = contract.authority.branch;
  const currentBranch = git("branch", "--show-current");
  const githubHead = process.env.GITHUB_HEAD_REF ?? "";
  if (currentBranch !== candidateBranch && githubHead !== candidateBranch) return;
  const changed = git("diff", "--name-only", contract.authority.baseMainSha, "--")
    .split(/\r?\n/u)
    .filter(Boolean);
  const untracked = git("ls-files", "--others", "--exclude-standard")
    .split(/\r?\n/u)
    .filter(Boolean);
  assert.deepEqual(sorted(new Set([...changed, ...untracked])), EXACT_PATHS);
});

test("freezes the exact source foundation bytes", async () => {
  assert.equal(contract.frozenFoundationBindings.length, 17);
  const seen = new Set();
  for (const binding of contract.frozenFoundationBindings) {
    assert.equal(seen.has(binding.path), false, binding.path);
    seen.add(binding.path);
    const bytes = await readFile(path.join(ROOT, binding.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), binding.sha256);
    assert.equal(git("hash-object", "--", binding.path), binding.gitBlob);
  }
  assert.equal(
    contract.integrationGate.futureMutationOfFrozenBindingRequiresOneExplicitGate,
    true,
  );
  assert.equal(contract.integrationGate.silentDriftAllowed, false);
});

test("closes only the WCV-C3 foundation outcome and preserves every activation boundary", () => {
  assert.deepEqual(contract.postMergeState, {
    c3rP: "complete_and_unreverted",
    c3rT: "complete_repaired_and_unreverted",
    c3rL: "complete_and_unreverted",
    wcvC3TerminalOutcome: "complete",
    foundation: "frozen",
    m3: "complete",
    nextOwnerStudyOsMilestone: "M4_FIRST_STAGE_COMMON_KERNEL",
    laneBMustRefreshFromM3ResultingMain: true,
    canonicalUlcSequenceChanged: false,
    ulcM1Selected: false,
    ulcM1Started: false,
    issue714State: "OPEN",
    issue714CompletedAllocationsExactly: ["C2", "C3"],
    issue714RemainingAllocationsExactly: ["C4", "C6"],
  });
  assert.equal(contract.activationBoundary.ownerOnly, true);
  assert.equal(contract.activationBoundary.featureDefaultOff, true);
  for (const [field, value] of Object.entries(contract.activationBoundary)) {
    if (field.endsWith("Count")) assert.equal(value, 0, field);
    if (field.endsWith("Activation") || field.endsWith("Activated")) {
      assert.equal(value, false, field);
    }
  }
  for (const value of Object.values(contract.claimBoundary)) assert.equal(value, false);
  assert.equal(contract.deliveryControl.requiredClosingReference, "Closes #781");
  assert.equal(contract.deliveryControl.issue781ClosesOnProtectedM3SquashMerge, true);
  assert.equal(
    contract.deliveryControl.issues706Through708ClosureRequiresValidatedM3ResultingMainReceipt,
    true,
  );
  assert.equal(contract.deliveryControl.issue714MustRemainOpen, true);
});

test("keeps the decision, authority mirror, active log, and test registry aligned", async () => {
  const [decision, agents, log, registry] = await Promise.all([
    readFile(path.join(ROOT, contract.authorityDecisionPath), "utf8"),
    readFile(path.join(ROOT, "AGENTS.md"), "utf8"),
    readFile(path.join(ROOT, "docs/exec-plans/active/inverge-owner-study-os.md"), "utf8"),
    readFile(path.join(ROOT, "scripts/run-node-tests.mjs"), "utf8"),
  ]);
  assert.match(decision, /GitHub remains the sole[\s\S]*receipt authority/u);
  assert.match(decision, /does not select or start ULC-M1/u);
  assert.match(agents, /WCV_C3_FOUNDATION_FREEZE_V1/u);
  assert.match(log, /4989f02f54f187fb440f2bfa6722e4ee832420de/u);
  assert.equal(
    registry.match(/tests\/wcv-c3-foundation-freeze\.test\.mjs/gu)?.length,
    1,
  );
});
