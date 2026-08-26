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
const unified = JSON.parse(await readFile(
  path.join(ROOT, "config", "dabangil-unified-program-contract.json"),
  "utf8",
));
const a1 = JSON.parse(await readFile(
  path.join(ROOT, "config", "dabangil-wcv-c3r-a1-serial-program-authority-v1.json"),
  "utf8",
));

const BASE_MAIN_SHA = "a121eea722fd2a9054d11a5c0e5f3893b52da014";
const BASE_MAIN_TREE = "5b151f72cc339cd5d17d89b6f01c7b4380e71759";
const REPAIR_HEAD = "768cf4a09caedc1c3aad0c514a3ada3d97813817";
const REPAIR_PATHS = [
  ".github/workflows/c3r-t-theory-durable-learning-delta.yml",
  "docs/exec-plans/active/inverge-owner-study-os.md",
  "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs",
  "tests/wcv-c3r-l-law-durable-learning-delta.test.mjs",
  "tests/wcv-c3r-t-theory-durable-learning-delta.test.mjs",
];
const SUCCESSFUL_CHECKS = [
  "Learner Loop Health",
  "Vercel",
  "Vercel Preview Comments",
  "c3r-l-law-durable-learning-delta",
  "c3r-p-practice-common-durable-runtime",
  "c3r-t-theory-durable-learning-delta",
  "security-audit-sbom",
  "runtime-gate",
  "pr-contract",
  "fast-ci",
  "full-ci",
  "risk-classifier",
  "full-ci-windows",
];
const EXACT_PATHS = [
  "AGENTS.md",
  "config/dabangil-unified-program-contract.json",
  "config/dabangil-wcv-c3-foundation-freeze-v1.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/decisions/2026-08-26-owner-wcv-c3-foundation-freeze.md",
  "docs/exec-plans/active/inverge-owner-study-os.md",
  "docs/inverge-master-roadmap.md",
  "roadmap/active-program.yml",
  "scripts/run-node-tests.mjs",
  "tests/agent-factory-roadmap-runner.test.mjs",
  "tests/c2r-c-l-law-authority.test.mjs",
  "tests/c2r-c-p-practice-authority.test.mjs",
  "tests/c2r-c-t-theory-authority.test.mjs",
  "tests/dabangil-unified-product-multisurface-launch-authority.test.mjs",
  "tests/foundation-continuous-security-automation.test.mjs",
  "tests/github-native-delivery-control.test.mjs",
  "tests/practice-answer-review-engine.test.mjs",
  "tests/rights-safe-adaptive-variant-foundry-contract.test.mjs",
  "tests/s214-reference-answer-pipeline.test.mjs",
  "tests/s215-reference-answer-release-gate.test.mjs",
  "tests/s216-error-notebook-gap-taxonomy.test.mjs",
  "tests/s217-personal-core-concept-graph.test.mjs",
  "tests/s218-similar-question-review-scheduler.test.mjs",
  "tests/s219-learner-catalog-usage-ledger.test.mjs",
  "tests/s220-billing-entitlement-credit-usage.test.mjs",
  "tests/s221-paid-trust-privacy-cost-guardrails.test.mjs",
  "tests/s222-academy-answer-operations-tenant-boundary.test.mjs",
  "tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs",
  "tests/s224-three-subject-learner-runtime-acceptance.test.mjs",
  "tests/theory-answer-review-engine.test.mjs",
  "tests/wcv-c2r-structural-recovery-authority.test.mjs",
  "tests/wcv-c3-foundation-freeze.test.mjs",
  "tests/wcv-c3r-a1-serial-program-authority.test.mjs",
  "tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs",
];
const HISTORICAL = {
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
const EXPECTED_ARTIFACTS = {
  practiceRuntime: {
    runId: 32928355631,
    artifactId: 9592564126,
    name: "c3r-p-practice-runtime-32928355631-1",
    archiveSha256: "0340111c63fa4126cfa38454a7884bee6ef76ded7129e3a98c6bff13e78cf73c",
    candidateHead: REPAIR_HEAD,
    candidateTree: BASE_MAIN_TREE,
    schemaVersion: "inverge.wcv_c3r_p.practice_runtime.v1",
    orderedItemCount: 16,
  },
  practiceMetadata: {
    runId: 32928355631,
    artifactId: 9592563615,
    name: "c3r-p-entry-metadata-32928355631-1",
    archiveSha256: "969559eaf227b763cd515fb315eb4117ebbd95559ab293c3ff4e3634c7adeb2f",
    candidateHead: REPAIR_HEAD,
    schemaVersion: "inverge.c3r_p.entry_metadata.v1",
  },
  theoryRuntime: {
    runId: 32928355595,
    artifactId: 9592420349,
    name: "c3r-t-theory-runtime-32928355595-1",
    archiveSha256: "3d772497a6efc5dbdd3c0f21d86ace68a94d0576aaa8cd19d6c5e56780a2d021",
    candidateHead: REPAIR_HEAD,
    candidateTree: BASE_MAIN_TREE,
    schemaVersion: "inverge.wcv_c3r_t.theory_runtime.v2",
    orderedItemCount: 16,
  },
  lawRuntime: {
    runId: 32928355762,
    artifactId: 9592420260,
    name: "c3r-l-law-runtime-32928355762-1",
    archiveSha256: "26dbd4fc71ef2585953c4be1bc9e5e2cdc67b79b81bce6c43821ff4bb35a7c47",
    candidateHead: REPAIR_HEAD,
    candidateTree: BASE_MAIN_TREE,
    schemaVersion: "inverge.wcv_c3r_l.law_runtime.v2",
    orderedItemCount: 16,
  },
};

function sorted(value) {
  return [...value].sort();
}

function git(...args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function gitBytes(...args) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: null });
  assert.equal(result.status, 0, result.stderr?.toString() || result.stdout?.toString());
  return result.stdout;
}

function canonicalEvidenceItems() {
  return [706, 707, 708].flatMap((issue) =>
    a1.issueAllocation.issues[String(issue)].requiredForEachSubjectExactly
      .map((key) => `${issue}:${key}`));
}

function assertHistoricalSummary(receipt) {
  const expected = HISTORICAL[receipt.stage];
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
  const observed = receipt.perSubjectIssueEvidence.map((entry) => {
    assert.equal(entry.stage, receipt.stage);
    assert.equal(entry.subject, expected.subject);
    assert.equal(
      entry.runtimeEvidenceRef,
      `${expected.subject}_RUNTIME:${{
        PRACTICE: "c3r-p-practice-common-durable-runtime-v1",
        THEORY: "c3r-t-theory-durable-learning-v1",
        LAW: "c3r-l-law-durable-learning-v1",
      }[expected.subject]}#${entry.issue}:${entry.evidenceKey}`,
    );
    return `${entry.issue}:${entry.evidenceKey}`;
  });
  assert.deepEqual(observed, canonicalEvidenceItems());
}

function assertTerminalRepair(repair) {
  assert.equal(repair.pullRequest, 834);
  assert.equal(repair.baseSha, "2991e2579925e65173468049a94143bd99dc8e81");
  assert.equal(repair.baseTree, "a06100eef0940339e0fc0ad74f57587a3ebe014e");
  assert.equal(repair.reviewedHead, REPAIR_HEAD);
  assert.equal(repair.reviewedTree, BASE_MAIN_TREE);
  assert.equal(repair.squashMergeSha, BASE_MAIN_SHA);
  assert.equal(repair.resultingMainSha, BASE_MAIN_SHA);
  assert.equal(repair.resultingMainTree, BASE_MAIN_TREE);
  assert.equal(repair.formalReviewId, "IC_kwDOSMHn8M8AAAABQxWt0A");
  assert.equal(
    repair.formalReviewUrl,
    "https://github.com/chachathecat/inverge/pull/834#issuecomment-5420461520",
  );
  assert.deepEqual(repair.actionableCounts, { p0: 0, p1: 0, p2: 0 });
  assert.equal(repair.unresolvedActionableThreads, 0);
  assert.deepEqual(repair.successfulChecksExactly, SUCCESSFUL_CHECKS);
  assert.deepEqual(repair.changedPathsExactly, REPAIR_PATHS);
  assert.deepEqual(repair.artifacts, EXPECTED_ARTIFACTS);
  assert.equal(repair.oldTheoryAndLawArtifactsAreHistoricalOnly, true);
  assert.equal(repair.artifactInventoryMustMatchAllSixteenItemsInCanonicalOrder, true);
  assert.equal(repair.featureDefaultOff, true);
  assert.equal(repair.remoteMutationCount, 0);
  for (const subject of ["PRACTICE", "THEORY", "LAW"]) {
    assert.deepEqual(repair.orderedEvidenceItemsBySubject[subject], canonicalEvidenceItems());
  }
}

test("is the minimal source-only M3 closeout and binds repaired current main", () => {
  assert.equal(contract.schemaVersion, "dabangil.wcv_c3.foundation_freeze.v1");
  assert.equal(contract.milestone, "M3");
  assert.equal(contract.authority.baseMainSha, BASE_MAIN_SHA);
  assert.equal(contract.authority.baseMainTree, BASE_MAIN_TREE);
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
    contract.receiptSemantics.originallyConformingC3RStageMergeReceiptV1StagesExactly,
    ["C3R-P"],
  );
  assert.deepEqual(
    contract.receiptSemantics.nonconformingHistoricalStageSummariesExactly,
    ["C3R-T", "C3R-L"],
  );
  assert.equal(contract.receiptSemantics.terminalCurrentTreeRepairPullRequest, 834);
  assert.deepEqual(contract.pathManifest.changedPathsExactly, EXACT_PATHS);
  assert.equal(contract.pathManifest.historicalMirrorAssertionPathsChanged, 24);
  for (const field of [
    "migrationPathsChanged",
    "runtimePathsChanged",
    "workflowPathsChanged",
    "packageOrLockPathsChanged",
    "authOrRlsPathsChanged",
  ]) assert.equal(contract.pathManifest[field], 0, field);
});

test("preserves exact historical stage truth without relabeling Theory or Law", () => {
  assert.deepEqual(
    contract.liveGitHubStageMergeSummaries.map(({ stage }) => stage),
    ["C3R-P", "C3R-T", "C3R-L"],
  );
  for (const receipt of contract.liveGitHubStageMergeSummaries) {
    assertHistoricalSummary(receipt);
  }
  assert.equal(contract.historicalReceiptAssessment["C3R-P"].originallyConforming, true);
  for (const stage of ["C3R-T", "C3R-L"]) {
    assert.equal(contract.historicalReceiptAssessment[stage].originallyConforming, false);
    assert.equal(contract.historicalReceiptAssessment[stage].retroactiveRelabelingAllowed, false);
  }
  assert.deepEqual(contract.receiptSemantics.legacyC3rTRepairsExactly, [818, 820]);
  assert.equal(contract.receiptSemantics.historicalStageSummariesAreTerminalCloseoutAuthority, false);
});

test("binds PR #834 as the exact terminal current-tree repair and rejects hostile drift", () => {
  assertTerminalRepair(contract.terminalCurrentTreeRepairValidation);
  const mutators = [
    (value) => { value.pullRequest = 835; },
    (value) => { value.reviewedHead = "0".repeat(40); },
    (value) => { value.resultingMainTree = "0".repeat(40); },
    (value) => { value.actionableCounts.p2 = 1; },
    (value) => { value.changedPathsExactly.pop(); },
    (value) => { value.artifacts.theoryRuntime.artifactId += 1; },
    (value) => { value.artifacts.lawRuntime.archiveSha256 = "0".repeat(64); },
    (value) => { value.artifacts.practiceRuntime.candidateHead = "0".repeat(40); },
    (value) => { value.orderedEvidenceItemsBySubject.THEORY.pop(); },
    (value) => { value.successfulChecksExactly.pop(); },
  ];
  for (const mutate of mutators) {
    const mutant = structuredClone(contract.terminalCurrentTreeRepairValidation);
    mutate(mutant);
    assert.throws(() => assertTerminalRepair(mutant));
  }
});

test("proves every historical and repair merge identity is present and unreverted", () => {
  for (const receipt of contract.liveGitHubStageMergeSummaries) {
    assert.equal(git("show", "-s", "--format=%T", receipt.reviewedHead), receipt.reviewedTree);
    const [parents, tree] = git(
      "show", "-s", "--format=%P%n%T", receipt.resultingMainSha,
    ).split(/\r?\n/u);
    assert.equal(parents, receipt.baseSha, receipt.stage);
    assert.equal(tree, receipt.resultingMainTree, receipt.stage);
    git("merge-base", "--is-ancestor", receipt.resultingMainSha, "HEAD");
  }
  for (const repair of contract.validatedRepairChainSummariesExactly) {
    assert.equal(git("show", "-s", "--format=%T", repair.reviewedHead), repair.reviewedTree);
    const [parents, tree] = git(
      "show", "-s", "--format=%P%n%T", repair.resultingMainSha,
    ).split(/\r?\n/u);
    assert.equal(parents, repair.baseSha, `PR #${repair.pullRequest}`);
    assert.equal(tree, repair.resultingMainTree, `PR #${repair.pullRequest}`);
    git("merge-base", "--is-ancestor", repair.resultingMainSha, "HEAD");
  }
  const repair = contract.terminalCurrentTreeRepairValidation;
  assert.equal(git("show", "-s", "--format=%T", repair.reviewedHead), repair.reviewedTree);
  const [parent, tree] = git(
    "show", "-s", "--format=%P%n%T", repair.resultingMainSha,
  ).split(/\r?\n/u);
  assert.equal(parent, repair.baseSha);
  assert.equal(tree, repair.resultingMainTree);
  assert.deepEqual(
    git("diff-tree", "--no-commit-id", "--name-only", "-r", repair.resultingMainSha)
      .split(/\r?\n/u).filter(Boolean),
    REPAIR_PATHS,
  );
  git("merge-base", "--is-ancestor", repair.resultingMainSha, "HEAD");
});

test("derives the exact thirty-four-path M3 envelope from repaired main", () => {
  const currentBranch = git("branch", "--show-current");
  const githubHead = process.env.GITHUB_HEAD_REF ?? "";
  if (currentBranch !== contract.authority.branch && githubHead !== contract.authority.branch) return;
  const changed = git("diff", "--name-only", contract.authority.baseMainSha, "--")
    .split(/\r?\n/u).filter(Boolean);
  const untracked = git("ls-files", "--others", "--exclude-standard")
    .split(/\r?\n/u).filter((candidate) => EXACT_PATHS.includes(candidate));
  assert.deepEqual(sorted(new Set([...changed, ...untracked])), sorted(EXACT_PATHS));
});

test("freezes the exact repaired-main and working-tree foundation bytes", async () => {
  assert.equal(contract.frozenFoundationBindings.length, 17);
  const seen = new Set();
  for (const binding of contract.frozenFoundationBindings) {
    assert.equal(seen.has(binding.path), false, binding.path);
    seen.add(binding.path);
    const worktreeBytes = await readFile(path.join(ROOT, binding.path));
    const baseBytes = gitBytes("show", `${BASE_MAIN_SHA}:${binding.path}`);
    assert.equal(createHash("sha256").update(worktreeBytes).digest("hex"), binding.sha256);
    assert.equal(createHash("sha256").update(baseBytes).digest("hex"), binding.sha256);
    assert.equal(git("hash-object", "--", binding.path), binding.gitBlob);
    assert.equal(git("rev-parse", `${BASE_MAIN_SHA}:${binding.path}`), binding.gitBlob);
  }
  assert.equal(contract.integrationGate.futureMutationOfFrozenBindingRequiresOneExplicitGate, true);
  assert.equal(contract.integrationGate.silentDriftAllowed, false);
});

test("records terminal completion while preserving every activation and closure boundary", () => {
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
  assert.equal(contract.deliveryControl.requiredClosingReference, "Closes #837");
  assert.equal(contract.deliveryControl.closingIssueCreatesWcvC3Completion, false);
  assert.deepEqual(contract.deliveryControl.requiredReferenceLinesExactly, [
    "Refs #706", "Refs #707", "Refs #708", "Refs #714", "Refs #781",
    "Refs #833", "Refs #834",
  ]);
  assert.equal(contract.deliveryControl.governedIssueClosingKeywordsAllowed, false);
  assert.equal(contract.deliveryControl.issue781RemainsOpenThroughProtectedM3SquashMerge, true);
  assert.equal(contract.deliveryControl.issue781ClosureRequiresValidatedM3ResultingMainReceipt, true);
  assert.equal(contract.deliveryControl.issues706Through708ClosureRequiresValidatedM3ResultingMainReceipt, true);
  assert.equal(contract.deliveryControl.issue714MustRemainOpen, true);
  assert.equal(contract.activationBoundary.ownerOnly, true);
  assert.equal(contract.activationBoundary.featureDefaultOff, true);
  for (const [field, value] of Object.entries(contract.activationBoundary)) {
    if (field.endsWith("Count")) assert.equal(value, 0, field);
    if (field.endsWith("Activation") || field.endsWith("Activated")) {
      assert.equal(value, false, field);
    }
  }
  for (const value of Object.values(contract.claimBoundary)) assert.equal(value, false);
});

test("keeps canonical mirrors, current log and registry aligned", async () => {
  const [decision, agents, log, registry, roadmap, unifiedDoc, masterRoadmap] =
    await Promise.all([
      readFile(path.join(ROOT, contract.authorityDecisionPath), "utf8"),
      readFile(path.join(ROOT, "AGENTS.md"), "utf8"),
      readFile(path.join(ROOT, "docs/exec-plans/active/inverge-owner-study-os.md"), "utf8"),
      readFile(path.join(ROOT, "scripts/run-node-tests.mjs"), "utf8"),
      readFile(path.join(ROOT, "roadmap/active-program.yml"), "utf8"),
      readFile(path.join(ROOT, "docs/dabangil-unified-program-contract.md"), "utf8"),
      readFile(path.join(ROOT, "docs/inverge-master-roadmap.md"), "utf8"),
    ]);
  assert.match(decision, /PR #834 supplies the terminal current-tree/u);
  assert.match(decision, /sole closing keyword is `Closes #837`/u);
  assert.match(agents, /PR #834's\nterminal current-tree receipt-evidence repair/u);
  assert.match(log, /PR #838 \/ Foundation Freeze:[\s\S]*reviewed `2106d370b2725d3f03923db3a6d279e94778bd6d`[\s\S]*resulting main `aded1d711c837aa6e93470d3b31bd75907452996`[\s\S]*tree `313056e25e3296d1546e909389eb0ad014da5a66`/u);
  assert.equal(registry.match(/tests\/wcv-c3-foundation-freeze\.test\.mjs/gu)?.length, 1);
  assert.match(roadmap, /soleNextImplementationItem: null/u);
  assert.match(roadmap, /soleNextC3rStage: null/u);
  assert.match(roadmap, /ownerStudyOsNextMilestone: M4_FIRST_STAGE_COMMON_KERNEL/u);
  assert.match(roadmap, /wcvC3Complete: true/u);
  assert.match(unifiedDoc, /## 2D\. WCV-C3 Foundation Freeze closeout/u);
  assert.match(masterRoadmap, /## 2026-08-26 WCV-C3 Foundation Freeze/u);
  assert.equal(unified.c3SerialProgramDecision.wcvC3Complete, true);
  assert.equal(unified.c3SerialProgramDecision.postMergeAuthorizedStage, null);
  assert.equal(unified.launchConvergenceAmendment.soleNextImplementationItem, null);
  assert.equal(unified.launchConvergenceAmendment.soleNextC3rStage, null);
  assert.equal(unified.roadmapContract.soleNextImplementationItemId, null);
  assert.equal(unified.roadmapContract.soleNextC3rStageId, null);
  assert.equal(
    unified.ownerStudyOsFoundationFreeze.nextOwnerStudyOsMilestone,
    "M4_FIRST_STAGE_COMMON_KERNEL",
  );
  assert.equal(unified.ownerStudyOsFoundationFreeze.ulcM1Selected, false);
  assert.equal(unified.ownerStudyOsFoundationFreeze.ulcM1Started, false);
  const issue714 = unified.wcvCampaignOverlay.issue714Tracker;
  assert.equal(issue714.state, "open_c2_c3_allocations_complete_c4_c6_preserved");
  assert.deepEqual(issue714.currentCompletedAllocationsExactly, ["C2", "C3"]);
  assert.deepEqual(issue714.currentRemainingAllocationsExactly, ["C4", "C6"]);
  assert.deepEqual(issue714.remainingAllocationsAfterC2RB, ["C3", "C4", "C6"]);
  assert.match(
    agents,
    /Historical post-#717 selector state:[\s\S]*WCV-C3 \/ C3 \/ #706 \/\s+authorized_unstarted/u,
  );
  assert.match(
    unifiedDoc,
    /historical\s+post-#717, pre-M3 dependency-ready non-Production selector/u,
  );
});
