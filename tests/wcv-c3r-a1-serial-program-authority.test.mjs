import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const contractPath = path.join(
  repositoryRoot,
  "config",
  "dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
);
const prContractValidatorPath = path.join(
  repositoryRoot,
  "scripts",
  "automation",
  "validate-pr-contract.mjs",
);
const contract = JSON.parse(await readFile(contractPath, "utf8"));

const EXACT_A0_RECEIPT = {
  pullRequest: 785,
  reviewedHead: "f7f959368525f8a5895026f1361f6e13fd6226e0",
  reviewedTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
  squashMergeSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  resultingMainSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  resultingMainTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
};

const EXACT_STAGE_RECEIPT_FIELDS = [
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

const EXACT_PER_SUBJECT_ISSUE_EVIDENCE = {
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

const EXACT_PER_SUBJECT_ISSUE_EVIDENCE_BINDINGS = [706, 707, 708].map(
  (issue) => ({
    issue,
    requiredInventoryRef:
      `issueAllocation.issues.${issue}.requiredForEachSubjectExactly`,
  }),
);

const EXACT_PER_SUBJECT_RECEIPT_ENTRY_FIELDS = [
  "stage",
  "subject",
  "issue",
  "evidenceKey",
  "runtimeEvidenceRef",
];

const EXACT_OWNED_PATHS = [
  "AGENTS.md",
  "roadmap/active-program.yml",
  "config/dabangil-unified-program-contract.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/inverge-master-roadmap.md",
  "docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md",
  "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
  "docs/qa/wcv-c3r-a1-serial-program-authority-validation.md",
  "scripts/automation/validate-pr-contract.mjs",
  "tests/wcv-c3r-a1-serial-program-authority.test.mjs",
  "scripts/run-node-tests.mjs",
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function validateAuthority(candidate) {
  const errors = [];
  const receipt = candidate.c3rA0ValidatedReceiptV1 ?? {};
  for (const [field, value] of Object.entries(EXACT_A0_RECEIPT)) {
    if (receipt[field] !== value) errors.push(`A0_RECEIPT_${field}`);
  }
  if (receipt.requiredChecksPassed !== true) errors.push("A0_CHECKS");
  if (!same(receipt.actionableCounts, { p0: 0, p1: 0, p2: 0 })) {
    errors.push("A0_ACTIONABLE_COUNTS");
  }
  if (receipt.unresolvedActionableThreads !== 0) errors.push("A0_THREADS");
  if (receipt.manifestOrAnalyzerDigestDriftFailsClosed !== true) {
    errors.push("A0_DRIFT_GATE");
  }
  if (receipt.a0ManifestDuplicatedIntoA1 !== false) {
    errors.push("A0_DUPLICATION");
  }

  const stageReceipt = candidate.c3rStageMergeReceiptV1 ?? {};
  if (!same(stageReceipt.requiredFieldsExactly, EXACT_STAGE_RECEIPT_FIELDS)) {
    errors.push("STAGE_RECEIPT_FIELDS");
  }
  const issueEvidenceShape = stageReceipt.perSubjectIssueEvidenceShape ?? {};
  if (!same(issueEvidenceShape.requiredIssueBindingsExactly, [706, 707, 708])) {
    errors.push("STAGE_RECEIPT_ISSUE_BINDINGS");
  }
  if (!same(
    issueEvidenceShape.receiptEntryRequiredFieldsExactly,
    EXACT_PER_SUBJECT_RECEIPT_ENTRY_FIELDS,
  )) {
    errors.push("STAGE_RECEIPT_ISSUE_ENTRY_FIELDS");
  }
  if (issueEvidenceShape.receiptMustCoverEveryBoundIssueInventoryItemExactlyOnce !== true) {
    errors.push("STAGE_RECEIPT_EXACT_COVERAGE");
  }
  if (issueEvidenceShape.missingUnknownDuplicateCrossStageCrossSubjectOrMismatchedEvidenceInvalidatesReceipt !== true) {
    errors.push("STAGE_RECEIPT_ISSUE_FAIL_CLOSED");
  }
  if (stageReceipt.validReceiptRequires?.perSubjectIssueEvidenceMatchesStageBindingsExactly !== true) {
    errors.push("STAGE_RECEIPT_MATCH_GATE");
  }

  const program = candidate.serialProgram ?? {};
  if (!same(program.strictStageOrder, ["C3R-P", "C3R-T", "C3R-L"])) {
    errors.push("STAGE_ORDER");
  }
  const stages = new Map(
    (program.stages ?? []).map((stage) => [stage.stage, stage]),
  );
  const practice = stages.get("C3R-P") ?? {};
  const theory = stages.get("C3R-T") ?? {};
  const law = stages.get("C3R-L") ?? {};
  if (!same(practice.validatedReceiptDependencies, ["C3R-A1"])) {
    errors.push("P_DEPENDENCY");
  }
  if (!same(theory.validatedReceiptDependencies, ["C3R-P"])) {
    errors.push("T_DEPENDENCY");
  }
  if (!same(law.validatedReceiptDependencies, ["C3R-P", "C3R-T"])) {
    errors.push("L_DEPENDENCY");
  }
  if (practice.ownsCommonDurableSubstrate !== true) errors.push("P_SUBSTRATE");
  if (theory.ownsCommonDurableSubstrate !== false) errors.push("T_SUBSTRATE");
  if (law.ownsCommonDurableSubstrate !== false) errors.push("L_SUBSTRATE");
  if (practice.subject !== "PRACTICE") errors.push("P_SUBJECT");
  if (theory.subject !== "THEORY") errors.push("T_SUBJECT");
  if (law.subject !== "LAW") errors.push("L_SUBJECT");
  if (practice.mayCloseGovernedIssues !== false) errors.push("P_CLOSE");
  if (theory.mayCloseGovernedIssues !== false) errors.push("T_CLOSE");
  if (practice.mayCompleteWcvC3 !== false) errors.push("P_COMPLETE");
  if (theory.mayCompleteWcvC3 !== false) errors.push("T_COMPLETE");
  if (law.mayCompleteWcvC3 !== true) errors.push("L_COMPLETE");
  if (program.terminalAuthority?.onlyStage !== "C3R-L") {
    errors.push("TERMINAL_STAGE");
  }

  if (program.postMergeSelector?.stage !== "C3R-P") errors.push("SELECTOR");
  if (program.postMergeSelector?.stageState !== "authorized_unstarted") {
    errors.push("SELECTOR_STATE");
  }
  if (program.postMergeSelector?.runtimeStarted !== false) {
    errors.push("P_STARTED");
  }
  if (program.postMergeSelector?.wcvC3State !== "incomplete") {
    errors.push("WCV_C3_PREMATURE");
  }

  const dependency = program.dependencyAuthority ?? {};
  for (const field of [
    "issueStateMaySatisfyDependency",
    "issueClosureMaySatisfyDependency",
    "branchStateMaySatisfyDependency",
    "candidateCodeMaySatisfyDependency",
    "candidateTestsMaySatisfyDependency",
    "closedUnmergedPrMaySatisfyDependency",
    "revertedReceiptMaySatisfyDependency",
  ]) {
    if (dependency[field] !== false) errors.push(`SUBSTITUTE_${field}`);
  }

  const allocation = candidate.issueAllocation?.issues ?? {};
  for (const [issue, inventory] of Object.entries(EXACT_PER_SUBJECT_ISSUE_EVIDENCE)) {
    if (!same(allocation[issue]?.requiredForEachSubjectExactly, inventory)) {
      errors.push(`ISSUE_${issue}_SUBJECT_INVENTORY`);
    }
  }
  for (const stage of [practice, theory, law]) {
    if (!same(
      stage.requiredPerSubjectIssueEvidenceBindingsExactly,
      EXACT_PER_SUBJECT_ISSUE_EVIDENCE_BINDINGS,
    )) {
      errors.push(`${stage.stage ?? "UNKNOWN"}_SUBJECT_BINDINGS`);
    }
    if (stage.stageReceiptMustProveEveryBoundInventoryItemExactlyOnce !== true) {
      errors.push(`${stage.stage ?? "UNKNOWN"}_SUBJECT_RECEIPT_GATE`);
    }
  }
  for (const issue of ["706", "707", "708", "781"]) {
    if (allocation[issue]?.closureStage !== "C3R-L") {
      errors.push(`ISSUE_${issue}_CLOSURE`);
    }
  }
  if (allocation["714"]?.allocationC3CompletionStage !== "C3R-L") {
    errors.push("ISSUE_714_C3");
  }
  if (!same(allocation["714"]?.preservedOpenAllocations, ["C4", "C6"])) {
    errors.push("ISSUE_714_REMAINING");
  }

  if (candidate.deliveryControl?.mergeProducingWriterLimit !== 1) {
    errors.push("WRITER_LIMIT");
  }
  if (candidate.deliveryControl?.writingPrLimit !== 1) errors.push("PR_LIMIT");
  if (candidate.programBoundary?.activeMasterPlan !== "V13") {
    errors.push("ACTIVE_MASTER");
  }
  if (candidate.programBoundary?.activeMasterCount !== 1) {
    errors.push("ACTIVE_MASTER_COUNT");
  }
  if (candidate.programBoundary?.firstRoundAuthorized !== false) {
    errors.push("FIRST_ROUND");
  }

  for (const field of [
    "runtimeImplementationAuthorized",
    "migrationFileMutationAuthorized",
    "localSupabaseApplyAuthorized",
    "remoteSupabaseApplyAuthorized",
    "rlsImplementationAuthorized",
    "storageImplementationAuthorized",
    "apiImplementationAuthorized",
    "learnerUiImplementationAuthorized",
    "productionAuthorized",
    "paymentAuthorized",
    "providerAuthorized",
    "learnerActivationAuthorized",
  ]) {
    if (candidate.activationBoundary?.[field] !== false) {
      errors.push(`ACTIVATION_${field}`);
    }
  }
  if (candidate.activationBoundary?.remoteMutationCount !== 0) {
    errors.push("REMOTE_MUTATION_COUNT");
  }
  if (candidate.activationBoundary?.successorRuntimeStarted !== 0) {
    errors.push("SUCCESSOR_STARTED");
  }
  if (candidate.historicalDonors?.maySatisfyStageDependency !== false) {
    errors.push("DONOR_PROMOTION");
  }
  return errors;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function gitBlob(buffer) {
  return createHash("sha1")
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest("hex");
}

function completePrBody(referenceLines) {
  return `## Goal

C3R-A1 source-only serial program authority.

${referenceLines}

## Non-goals

No runtime, migration, remote or activation work.

## Risk classification

- Risk: [high]

## Data boundary

Authority metadata only.

## Schema / API / environment changes

None.

## Tests and evidence

Focused, affected and full validation.

## Runtime evidence

Not applicable to this source-only authority.

## Rollout and rollback

Revert the source-only squash; no runtime rollback is required.

## Remaining risks

All runtime stages remain unstarted.

## Merge recommendation

- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
`;
}

async function runPrContract(body, pullRequestOverrides = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "inverge-a1-contract-"));
  const eventPath = path.join(directory, "event.json");
  const exactPullRequest = {
    body,
    title: "[WCV-C3R-A1] Install serial Practice/Theory/Law program authority",
    base: {
      ref: "main",
      sha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
    },
    head: {
      ref: "codex/wcv-c3r-a1-serial-program-authority",
      repo: { full_name: "chachathecat/inverge" },
    },
    ...pullRequestOverrides,
  };
  await writeFile(
    eventPath,
    JSON.stringify({
      repository: { full_name: "chachathecat/inverge" },
      pull_request: exactPullRequest,
    }),
    "utf8",
  );
  try {
    return spawnSync(process.execPath, [prContractValidatorPath], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("A1 binds the exact validated PR #785 C3R-A0 merge receipt", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(EXACT_A0_RECEIPT).map((field) => [
        field,
        contract.c3rA0ValidatedReceiptV1[field],
      ]),
    ),
    EXACT_A0_RECEIPT,
  );
  assert.equal(contract.c3rA0ValidatedReceiptV1.requiredChecksPassed, true);
  assert.deepEqual(contract.c3rA0ValidatedReceiptV1.actionableCounts, {
    p0: 0,
    p1: 0,
    p2: 0,
  });
  assert.equal(contract.c3rA0ValidatedReceiptV1.unresolvedActionableThreads, 0);
});

test("A0 decision, manifest, analyzer and focused test remain immutable", async () => {
  const receipt = contract.c3rA0ValidatedReceiptV1;
  const bindings = [
    [receipt.authorityDecisionRef, receipt.immutableUpstreamBindings.authorityDecision],
    [receipt.authorityManifestRef, receipt.immutableUpstreamBindings.authorityManifest],
    [receipt.analyzerRef, receipt.immutableUpstreamBindings.analyzer],
    [
      receipt.immutableUpstreamBindings.focusedTest.ref,
      receipt.immutableUpstreamBindings.focusedTest,
    ],
  ];
  for (const [relativePath, binding] of bindings) {
    const bytes = await readFile(path.join(repositoryRoot, relativePath));
    assert.equal(gitBlob(bytes), binding.gitBlob, relativePath);
    assert.equal(sha256(bytes), binding.sha256, relativePath);
  }
  assert.equal(receipt.a0ManifestDuplicatedIntoA1, false);
  assert.equal(receipt.manifestOrAnalyzerDigestDriftFailsClosed, true);
});

test("runtime stages use one closed merge-receipt type", () => {
  const receipt = contract.c3rStageMergeReceiptV1;
  assert.deepEqual(receipt.closedStageEnum, ["C3R-P", "C3R-T", "C3R-L"]);
  assert.deepEqual(receipt.requiredFieldsExactly, EXACT_STAGE_RECEIPT_FIELDS);
  assert.deepEqual(receipt.validReceiptRequires.actionableCountsExactly, {
    p0: 0,
    p1: 0,
    p2: 0,
  });
  assert.equal(receipt.validReceiptRequires.unresolvedActionableThreadsExactly, 0);
  assert.equal(receipt.validReceiptRequires.remoteMutationCountExactly, 0);
  assert.deepEqual(receipt.perSubjectIssueEvidenceShape.requiredIssueBindingsExactly, [
    706,
    707,
    708,
  ]);
  assert.deepEqual(
    receipt.perSubjectIssueEvidenceShape.receiptEntryRequiredFieldsExactly,
    EXACT_PER_SUBJECT_RECEIPT_ENTRY_FIELDS,
  );
  assert.equal(
    receipt.perSubjectIssueEvidenceShape
      .receiptMustCoverEveryBoundIssueInventoryItemExactlyOnce,
    true,
  );
  assert.ok(receipt.invalidSubstitutes.includes("ISSUE_STATE"));
  assert.ok(receipt.invalidSubstitutes.includes("CLOSED_UNMERGED_PULL_REQUEST"));
  assert.ok(receipt.invalidSubstitutes.includes("CANDIDATE_HEAD_TESTS"));
});

test("every subject stage receipt must prove the exact #706/#707/#708 inventory", () => {
  for (const [issue, inventory] of Object.entries(EXACT_PER_SUBJECT_ISSUE_EVIDENCE)) {
    assert.deepEqual(
      contract.issueAllocation.issues[issue].requiredForEachSubjectExactly,
      inventory,
    );
  }
  for (const stage of contract.serialProgram.stages) {
    assert.deepEqual(
      stage.requiredPerSubjectIssueEvidenceBindingsExactly,
      EXACT_PER_SUBJECT_ISSUE_EVIDENCE_BINDINGS,
      stage.stage,
    );
    assert.equal(
      stage.stageReceiptMustProveEveryBoundInventoryItemExactlyOnce,
      true,
      stage.stage,
    );
  }
});

test("A1 installs the strict Practice to Theory to Law receipt graph", () => {
  assert.deepEqual(contract.serialProgram.strictStageOrder, [
    "C3R-P",
    "C3R-T",
    "C3R-L",
  ]);
  const [practice, theory, law] = contract.serialProgram.stages;
  assert.deepEqual(practice.validatedReceiptDependencies, ["C3R-A1"]);
  assert.deepEqual(theory.validatedReceiptDependencies, ["C3R-P"]);
  assert.deepEqual(law.validatedReceiptDependencies, ["C3R-P", "C3R-T"]);
  assert.equal(contract.serialProgram.dependencyAuthority.validatedStageMergeReceiptsRequired, true);
  assert.deepEqual(validateAuthority(contract), []);
});

test("before merge only C3R-A1 is dependency-ready and no runtime stage is authorized", () => {
  assert.deepEqual(contract.serialProgram.preMergeState, {
    c3rA0: "installed",
    c3rA1: "dependency_ready_unstarted",
    c3rP: "proposed_unstarted_not_repository_authorized",
    c3rT: "blocked",
    c3rL: "blocked",
    wcvC3: "incomplete",
  });
  assert.equal(contract.authority.runtimeInstalledByThisWork, false);
  assert.equal(contract.authority.successorRuntimeStartedByThisWork, false);
});

test("stage boundaries keep common substrate in Practice and deltas subject-only", () => {
  const [practice, theory, law] = contract.serialProgram.stages;
  assert.equal(practice.ownsCommonDurableSubstrate, true);
  assert.ok(practice.scopeExactly.includes("COMMON_DURABLE_PERSISTENCE"));
  assert.ok(practice.scopeExactly.includes("EXACT_PRACTICE_BROWSER_TO_POSTGRES_RUNTIME_EVIDENCE"));
  assert.equal(theory.ownsCommonDurableSubstrate, false);
  assert.deepEqual(
    theory.scopeExactly.filter((value) => value.includes("BROWSER_TO_POSTGRES")),
    ["EXACT_THEORY_BROWSER_TO_POSTGRES_RUNTIME_EVIDENCE"],
  );
  assert.equal(law.ownsCommonDurableSubstrate, false);
  assert.ok(law.scopeExactly.includes("TERMINAL_WCV_C3_CLOSEOUT"));
  assert.ok(law.scopeExactly.includes("EXACT_LAW_BROWSER_TO_POSTGRES_RUNTIME_EVIDENCE"));
});

test("only C3R-L owns issue closure, WCV-C3 completion and allocation C3", () => {
  const terminal = contract.serialProgram.terminalAuthority;
  assert.equal(terminal.onlyStage, "C3R-L");
  assert.deepEqual(terminal.mayCloseIssues, [706, 707, 708, 781]);
  assert.equal(terminal.mayCompleteIssue714Allocation, "C3");
  assert.deepEqual(
    contract.issueAllocation.issues["714"].preservedOpenAllocations,
    ["C4", "C6"],
  );
  assert.equal(contract.issueAllocation.singleSubjectOrSinglePathMayCloseIssue, false);
});

test("post-merge selector authorizes only unstarted C3R-P", () => {
  assert.deepEqual(contract.serialProgram.postMergeSelector, {
    roadmapItemId: "WCV-C3",
    campaignId: "C3",
    leadIssue: 706,
    stage: "C3R-P",
    stageState: "authorized_unstarted",
    wcvC3State: "incomplete",
    runtimeStarted: false,
  });
  assert.deepEqual(contract.postMergeState, {
    c3rA0: "installed",
    c3rA1: "installed",
    c3rP: "authorized_unstarted",
    c3rT: "blocked_on_validated_c3r_p_merge_receipt",
    c3rL: "blocked_on_validated_c3r_p_and_c3r_t_merge_receipts",
    wcvC3: "incomplete",
    governedIssues: {
      706: "open",
      707: "open",
      708: "open",
      714: "open",
      781: "open",
    },
    successorRuntimeStarted: 0,
  });
});

test("V13, one writer and every activation gate remain closed", () => {
  assert.equal(contract.programBoundary.activeMasterPlan, "V13");
  assert.equal(contract.programBoundary.activeMasterCount, 1);
  assert.equal(contract.deliveryControl.mergeProducingWriterLimit, 1);
  assert.ok(
    Object.values(contract.activationBoundary).every(
      (value) => value === false || value === 0,
    ),
  );
  assert.equal(contract.historicalDonors.maySatisfyStageDependency, false);
});

test("roadmap and canonical mirrors expose the same unstarted C3R-P selector", async () => {
  const [agents, roadmap, unifiedMarkdown, masterRoadmap, unified] = await Promise.all([
    readFile(path.join(repositoryRoot, "AGENTS.md"), "utf8"),
    readFile(path.join(repositoryRoot, "roadmap/active-program.yml"), "utf8"),
    readFile(path.join(repositoryRoot, "docs/dabangil-unified-program-contract.md"), "utf8"),
    readFile(path.join(repositoryRoot, "docs/inverge-master-roadmap.md"), "utf8"),
    readFile(path.join(repositoryRoot, "config/dabangil-unified-program-contract.json"), "utf8").then(JSON.parse),
  ]);
  const decisionPath =
    "docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md";
  assert.ok(agents.indexOf(decisionPath) < agents.indexOf(
    "docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md",
  ));
  assert.match(roadmap, /c3rStrictStageOrder: \[C3R-P, C3R-T, C3R-L\]/u);
  assert.match(roadmap, /soleNextC3rStage: C3R-P/u);
  assert.match(roadmap, /currentAuthorizedRuntimeStageState: authorized_unstarted/u);
  assert.match(unifiedMarkdown, /C3R-P → C3R-T → C3R-L/u);
  assert.match(masterRoadmap, /C3R-P → C3R-T → C3R-L/u);
  assert.deepEqual(unified.wcvCampaignOverlay.c3SerialProgram.strictStageOrder, [
    "C3R-P",
    "C3R-T",
    "C3R-L",
  ]);
  assert.equal(unified.wcvCampaignOverlay.soleNextC3rStage, "C3R-P");
  assert.deepEqual(
    unified.wcvCampaignOverlay.c3SerialProgram
      .perSubjectIssueEvidenceRequiredForEveryStageExactly,
    [706, 707, 708],
  );
  assert.equal(
    unified.wcvCampaignOverlay.c3SerialProgram
      .stageReceiptMustProveEveryBoundInventoryItemExactlyOnce,
    true,
  );
  assert.equal(unified.roadmapContract.soleNextC3rStageId, "C3R-P");
  assert.equal(unified.launchConvergenceAmendment.soleNextC3rStage, "C3R-P");
});

test("A1 owns exactly eleven source-authority paths and is registered once", async () => {
  assert.deepEqual(contract.ownedPaths, EXACT_OWNED_PATHS);
  const runner = await readFile(
    path.join(repositoryRoot, "scripts/run-node-tests.mjs"),
    "utf8",
  );
  assert.equal(
    runner.match(/tests\/wcv-c3r-a1-serial-program-authority\.test\.mjs/gu)?.length,
    1,
  );
  for (const relativePath of contract.ownedPaths) {
    assert.equal(
      (await readFile(path.join(repositoryRoot, relativePath), "utf8")).endsWith("\n"),
      true,
      relativePath,
    );
    assert.equal(
      contract.forbiddenExactPaths.includes(relativePath),
      false,
      relativePath,
    );
    assert.equal(
      contract.forbiddenPathPrefixes.some((prefix) => relativePath.startsWith(prefix)),
      false,
      relativePath,
    );
  }
});

test("package and lockfile identities remain exactly the A1 start-gate blobs", async () => {
  const packageBytes = await readFile(path.join(repositoryRoot, "package.json"));
  const lockBytes = await readFile(path.join(repositoryRoot, "package-lock.json"));
  assert.equal(gitBlob(packageBytes), contract.packageIdentity.packageJsonGitBlob);
  assert.equal(gitBlob(lockBytes), contract.packageIdentity.packageLockJsonGitBlob);
  assert.equal(contract.packageIdentity.packageMutationAuthorized, false);
});

test("hostile stage-graph and gate mutations fail closed", () => {
  const mutations = [
    (candidate) => { candidate.c3rA0ValidatedReceiptV1 = { issueClosure: 781 }; },
    (candidate) => { delete candidate.c3rA0ValidatedReceiptV1.squashMergeSha; },
    (candidate) => { candidate.serialProgram.strictStageOrder = ["C3R-T", "C3R-P", "C3R-L"]; },
    (candidate) => { candidate.serialProgram.stages[1].validatedReceiptDependencies = []; },
    (candidate) => { candidate.serialProgram.stages[2].validatedReceiptDependencies = ["C3R-T"]; },
    (candidate) => { candidate.serialProgram.stages[0].mayCloseGovernedIssues = true; },
    (candidate) => { candidate.serialProgram.stages[1].mayCloseGovernedIssues = true; },
    (candidate) => { candidate.serialProgram.stages[1].requiredPerSubjectIssueEvidenceBindingsExactly = []; },
    (candidate) => { candidate.serialProgram.stages[2].stageReceiptMustProveEveryBoundInventoryItemExactlyOnce = false; },
    (candidate) => { candidate.issueAllocation.issues["706"].requiredForEachSubjectExactly.shift(); },
    (candidate) => { candidate.c3rStageMergeReceiptV1.requiredFieldsExactly = EXACT_STAGE_RECEIPT_FIELDS.filter((field) => field !== "perSubjectIssueEvidence"); },
    (candidate) => { candidate.serialProgram.postMergeSelector.wcvC3State = "complete"; },
    (candidate) => { candidate.serialProgram.postMergeSelector.runtimeStarted = true; },
    (candidate) => { candidate.serialProgram.dependencyAuthority.issueStateMaySatisfyDependency = true; },
    (candidate) => { candidate.serialProgram.dependencyAuthority.closedUnmergedPrMaySatisfyDependency = true; },
    (candidate) => { candidate.serialProgram.dependencyAuthority.candidateTestsMaySatisfyDependency = true; },
    (candidate) => { candidate.activationBoundary.productionAuthorized = true; },
    (candidate) => { candidate.activationBoundary.remoteSupabaseApplyAuthorized = true; },
    (candidate) => { candidate.activationBoundary.paymentAuthorized = true; },
    (candidate) => { candidate.activationBoundary.learnerActivationAuthorized = true; },
    (candidate) => { candidate.deliveryControl.mergeProducingWriterLimit = 2; },
    (candidate) => { candidate.historicalDonors.maySatisfyStageDependency = true; },
  ];
  for (const mutate of mutations) {
    const candidate = clone(contract);
    mutate(candidate);
    assert.notDeepEqual(validateAuthority(candidate), [], mutate.toString());
  }
});

test("exact A1 PR accepts five references while preserving every issue open", async () => {
  const links = [
    "Refs #781",
    "Refs #706",
    "Refs #707",
    "Refs #708",
    "Refs #714",
    "- Issue disposition: #706/#707/#708/#714/#781 remain open; closure authority: C3R-L",
  ].join("\n");
  const result = await runPrContract(completePrBody(links));
  assert.equal(result.status, 0, result.stderr);
});

test("A1 reference-only exception rejects closure, omission, extras and replay", async () => {
  const exact = [
    "Refs #781",
    "Refs #706",
    "Refs #707",
    "Refs #708",
    "Refs #714",
    "- Issue disposition: #706/#707/#708/#714/#781 remain open; closure authority: C3R-L",
  ];
  const cases = [
    { lines: [...exact, "Closes #781"] },
    { lines: exact.filter((line) => line !== "Refs #708") },
    { lines: [...exact, "Refs #999"] },
    { lines: exact, overrides: { title: "Unrelated authority" } },
    {
      lines: exact,
      overrides: {
        head: {
          ref: "codex/wcv-c3r-a1-serial-program-authority",
          repo: { full_name: "attacker/inverge" },
        },
      },
    },
  ];
  for (const candidate of cases) {
    const result = await runPrContract(
      completePrBody(candidate.lines.join("\n")),
      candidate.overrides,
    );
    assert.notEqual(result.status, 0, JSON.stringify(candidate));
  }
});
