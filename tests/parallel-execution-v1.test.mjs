import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  collectParallelExecutionGitEvidence,
  validateParallelExecutionAuthority,
  validateParallelExecutionPlan,
} from "../scripts/automation/parallel-execution-v1.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const contract = JSON.parse(await readFile(new URL("../config/dabangil-parallel-execution-v1.json", import.meta.url), "utf8"));
const AMENDMENT_MAIN = "a".repeat(40);
const AMENDMENT_TREE = "b".repeat(40);

function clone(value) {
  return structuredClone(value);
}

function receipt(overrides = {}) {
  return {
    receiptVersion: "parallel_execution_v1.merge_receipt.v1",
    amendmentId: "PARALLEL_EXECUTION_V1",
    source: "live_github_validated",
    pullRequest: 808,
    reviewedHeadSha: "c".repeat(40),
    reviewedHeadTree: AMENDMENT_TREE,
    resultingMainSha: AMENDMENT_MAIN,
    resultingMainTree: AMENDMENT_TREE,
    expectedHeadPinned: true,
    squashMerge: true,
    requiredChecksPassed: true,
    actionableReviewCounts: { p0: 0, p1: 0, p2: 0 },
    unresolvedActionableThreads: 0,
    validated: true,
    ...overrides,
  };
}

function fakeSha(value) {
  return value.toString(16).padStart(40, "0");
}

function integrationReceipt(deliverable, index, overrides = {}) {
  const reviewedHeadTree = fakeSha(101 + (index * 3));
  return receipt({
    pullRequest: 809 + index,
    reviewedHeadSha: fakeSha(100 + (index * 3)),
    reviewedHeadTree,
    resultingMainSha: fakeSha(102 + (index * 3)),
    resultingMainTree: reviewedHeadTree,
    deliverable,
    ...overrides,
  });
}

function lane(overrides = {}) {
  return {
    laneId: "LANE_A_SECOND_STAGE",
    phase: "initial",
    deliverable: "C3R-T",
    mergeProducing: true,
    headSha: "e".repeat(40),
    worktreePath: ".agent-factory/worktrees/owner-study-os-lane-a",
    branch: "codex/owner-study-os-lane-a-c3r-t",
    baseMainSha: AMENDMENT_MAIN,
    baseMainTree: AMENDMENT_TREE,
    ownedPaths: [
      "lib/review-os/c3r-t-contract.ts",
      "supabase/migrations/20260825054823_c3r_t_theory_durable_learning_delta.sql",
    ],
    changedPaths: ["lib/review-os/c3r-t-contract.ts"],
    ...overrides,
  };
}

function initialPlan() {
  return {
    schemaVersion: "parallel_execution_v1.lane_plan.v1",
    amendmentId: "PARALLEL_EXECUTION_V1",
    authorityReceipt: receipt(),
    sharedBase: { mainSha: AMENDMENT_MAIN, mainTree: AMENDMENT_TREE },
    declaredIntegrationAndMergeOrder: clone(contract.declaredIntegrationAndMergeOrder),
    lanes: [
      lane(),
      lane({
        laneId: "LANE_B_FIRST_STAGE_KERNEL",
        deliverable: "FIRST_STAGE_COMMON_KERNEL",
        worktreePath: ".agent-factory/worktrees/owner-study-os-lane-b",
        branch: "codex/owner-study-os-lane-b-kernel",
        ownedPaths: ["lib/review-os/first-stage/kernel/mcq-kernel.ts"],
        changedPaths: ["lib/review-os/first-stage/kernel/mcq-kernel.ts"],
      }),
      lane({
        laneId: "LANE_C_QUESTION_FOUNDRY",
        deliverable: "QUESTION_FOUNDRY_V1",
        worktreePath: ".agent-factory/worktrees/owner-study-os-lane-c",
        branch: "codex/owner-study-os-lane-c-foundry",
        ownedPaths: ["lib/question-foundry/question-blueprint.ts"],
        changedPaths: ["lib/question-foundry/question-blueprint.ts"],
      }),
    ],
    kernelFreezeReceipt: null,
    kernelIntegrationGate: null,
    completedIntegrationReceipts: [],
    mergeCandidate: contract.declaredIntegrationAndMergeOrder[0],
    activationBoundary: clone(contract.activationBoundary),
  };
}

function subjectPlan() {
  const plan = initialPlan();
  const subjectLanes = contract.subjectAdapterEvalLanes.map((laneId, index) => lane({
    laneId,
    phase: "subject_adapter_eval",
    deliverable: laneId,
    worktreePath: `.agent-factory/worktrees/owner-study-os-${laneId.toLowerCase().replaceAll("_", "-")}`,
    branch: `codex/owner-study-os-${laneId.toLowerCase().replaceAll("_", "-")}`,
    ownedPaths: [`lib/review-os/first-stage/subjects/${index}-${laneId.toLowerCase()}.ts`],
    changedPaths: [`lib/review-os/first-stage/subjects/${index}-${laneId.toLowerCase()}.ts`],
  }));
  const kernelIndex = contract.declaredIntegrationAndMergeOrder.indexOf(
    "LANE_B_FIRST_STAGE_KERNEL:FIRST_STAGE_COMMON_KERNEL",
  );
  plan.completedIntegrationReceipts = contract.declaredIntegrationAndMergeOrder
    .slice(0, kernelIndex + 1)
    .map((deliverable, index) => integrationReceipt(deliverable, index));
  const kernelReceipt = plan.completedIntegrationReceipts.at(-1);
  const remainingInitialLanes = plan.lanes
    .filter((entry) => ["LANE_B_FIRST_STAGE_KERNEL", "LANE_C_QUESTION_FOUNDRY"].includes(entry.laneId))
    .map((entry) => entry.laneId === "LANE_B_FIRST_STAGE_KERNEL" ? {
      ...entry,
      deliverable: "STUDY_CAPACITY_RUNTIME_BRIDGE",
      ownedPaths: ["lib/review-os/study-capacity-runtime-bridge.ts"],
      changedPaths: ["lib/review-os/study-capacity-runtime-bridge.ts"],
    } : entry);
  plan.lanes = [...remainingInitialLanes, ...subjectLanes];
  plan.kernelFreezeReceipt = {
    ...clone(kernelReceipt),
    milestone: "FIRST_STAGE_COMMON_KERNEL",
    frozenInterface: "SubjectAdapter",
    frozen: true,
  };
  plan.sharedBase = {
    mainSha: plan.kernelFreezeReceipt.resultingMainSha,
    mainTree: plan.kernelFreezeReceipt.resultingMainTree,
  };
  for (const entry of plan.lanes) {
    entry.baseMainSha = plan.sharedBase.mainSha;
    entry.baseMainTree = plan.sharedBase.mainTree;
  }
  plan.mergeCandidate = contract.declaredIntegrationAndMergeOrder[kernelIndex + 1];
  return plan;
}

function gitEvidence(plan) {
  const frozenArtifacts = () => contract.frozenAmendmentArtifacts.map((repoPath, index) => ({
    path: repoPath,
    authorityBlobSha1: `${(index + 10).toString(16)}`.repeat(40),
    reviewedHeadBlobSha1: `${(index + 10).toString(16)}`.repeat(40),
    resultingMainBlobSha1: `${(index + 10).toString(16)}`.repeat(40),
    sharedBaseBlobSha1: `${(index + 10).toString(16)}`.repeat(40),
    headBlobSha1: `${(index + 10).toString(16)}`.repeat(40),
  }));
  return {
    schemaVersion: "parallel_execution_v1.git_evidence.v1",
    baseMainSha: plan.sharedBase.mainSha,
    derivedBaseMainTree: plan.sharedBase.mainTree,
    authorityResultingMainSha: plan.authorityReceipt.resultingMainSha,
    derivedAuthorityResultingMainTree: plan.authorityReceipt.resultingMainTree,
    reviewedHeadSha: plan.authorityReceipt.reviewedHeadSha,
    derivedReviewedHeadTree: plan.authorityReceipt.reviewedHeadTree,
    authorityBaseIsAncestorOfSharedBase: true,
    completedIntegrationReceipts: plan.completedIntegrationReceipts.map((entry, index) => ({
      deliverable: entry.deliverable,
      previousResultingMainSha: index === 0
        ? plan.authorityReceipt.resultingMainSha
        : plan.completedIntegrationReceipts[index - 1].resultingMainSha,
      reviewedHeadSha: entry.reviewedHeadSha,
      derivedReviewedHeadTree: entry.reviewedHeadTree,
      resultingMainSha: entry.resultingMainSha,
      derivedResultingMainTree: entry.resultingMainTree,
      reviewedHeadMergeBaseSha: index === 0
        ? plan.authorityReceipt.resultingMainSha
        : plan.completedIntegrationReceipts[index - 1].resultingMainSha,
      resultParentSha: index === 0
        ? plan.authorityReceipt.resultingMainSha
        : plan.completedIntegrationReceipts[index - 1].resultingMainSha,
      resultParentCount: 1,
      previousResultIsAncestorOfReviewedHead: true,
      previousResultIsAncestorOfResultingMain: true,
      frozenArtifacts: frozenArtifacts(),
    })),
    lanes: plan.lanes.map((entry) => ({
      laneId: entry.laneId,
      worktreePath: entry.worktreePath,
      branch: entry.branch,
      headSha: entry.headSha,
      mergeBaseSha: plan.sharedBase.mainSha,
      baseIsAncestor: true,
      cleanWorktree: true,
      frozenArtifacts: frozenArtifacts(),
      entries: entry.changedPaths.map((repoPath, index) => ({
        path: repoPath,
        changeKind: "modified",
        gitMode: "100644",
        headBlobSha1: `${(index + 1).toString(16)}`.repeat(40),
        baseBlobSha1: `${(index + 2).toString(16)}`.repeat(40),
        contentSha256: `${(index + 3).toString(16)}`.repeat(64),
      })),
    })),
  };
}

function validate(plan, evidence = gitEvidence(plan)) {
  return validateParallelExecutionPlan(plan, contract, evidence);
}

function fixtureGit(cwd, args) {
  const execution = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(execution.status, 0, execution.stderr);
  return execution.stdout.trim();
}

test("binds the exact PR #807 prerequisite and minimal operating limits", () => {
  assert.deepEqual(validateParallelExecutionAuthority(contract), { valid: true, errors: [] });
  assert.equal(contract.validatedPrerequisite.pullRequest, 807);
  assert.equal(contract.validatedPrerequisite.resultingMainSha, "c269d8fa489dc1ac77ef77d203dadffc0e4e73e5");
  assert.equal(contract.validatedPrerequisite.resultingMainTree, "90c725a3f82665d8533a20254f1088de86fef18c");
  assert.deepEqual(contract.limits, {
    initialMergeProducingLaneCount: 3,
    subjectAdapterEvalLaneCountAfterKernelFreeze: 6,
  });
  assert.deepEqual(contract.initialLanes.map((entry) => entry.milestoneOrder), [
    ["C3R-T", "C3R-L", "WCV-C3_FOUNDATION_FREEZE"],
    ["FIRST_STAGE_COMMON_KERNEL", "STUDY_CAPACITY_RUNTIME_BRIDGE"],
    ["QUESTION_FOUNDRY_V1"],
  ]);
});

test("accepts three isolated initial lanes from one validated resulting main", () => {
  assert.deepEqual(validate(initialPlan()), { valid: true, errors: [] });
});

test("fails closed on overlapping ownership, overlapping changes, or undeclared changes", () => {
  const overlap = initialPlan();
  overlap.lanes[1].ownedPaths = [overlap.lanes[0].ownedPaths[0]];
  overlap.lanes[1].changedPaths = [overlap.lanes[0].changedPaths[0]];
  assert.equal(validate(overlap).valid, false);

  const undeclared = initialPlan();
  undeclared.lanes[0].changedPaths.push("lib/review-os/c3r-t-service.ts");
  assert.equal(validate(undeclared).valid, false);
});

test("requires trusted exact Git evidence and rejects stale, dirty, omitted, or unsafe entries", () => {
  const plan = initialPlan();
  assert.equal(validateParallelExecutionPlan(plan, contract, null).valid, false);

  const omitted = gitEvidence(plan);
  omitted.lanes[0].entries = [];
  assert.equal(validate(plan, omitted).valid, false);

  const dirty = gitEvidence(plan);
  dirty.lanes[1].cleanWorktree = false;
  assert.equal(validate(plan, dirty).valid, false);

  const stale = gitEvidence(plan);
  stale.lanes[2].mergeBaseSha = "9".repeat(40);
  assert.equal(validate(plan, stale).valid, false);

  const deleted = gitEvidence(plan);
  deleted.lanes[0].entries[0].changeKind = "deleted";
  deleted.lanes[0].entries[0].gitMode = null;
  deleted.lanes[0].entries[0].headBlobSha1 = null;
  assert.equal(validate(plan, deleted).valid, false);

  const submodule = gitEvidence(plan);
  submodule.lanes[0].entries[0].gitMode = "160000";
  assert.equal(validate(plan, submodule).valid, false);
});

test("derives exact evidence from a real isolated clean Git worktree", async () => {
  const repository = await mkdtemp(path.join(tmpdir(), "parallel-execution-v1-"));
  try {
    fixtureGit(repository, ["init", "-b", "main"]);
    fixtureGit(repository, ["config", "user.name", "Parallel Test"]);
    fixtureGit(repository, ["config", "user.email", "parallel-test@example.invalid"]);
    await writeFile(path.join(repository, "seed.txt"), "seed\n", "utf8");
    fixtureGit(repository, ["add", "seed.txt"]);
    fixtureGit(repository, ["commit", "-m", "pre-amendment"]);
    const preAmendmentSha = fixtureGit(repository, ["rev-parse", "HEAD"]);
    const preAmendmentTree = fixtureGit(repository, ["rev-parse", "HEAD^{tree}"]);
    for (const repoPath of contract.frozenAmendmentArtifacts) {
      const absolutePath = path.join(repository, ...repoPath.split("/"));
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, `${repoPath}\n`, "utf8");
    }
    fixtureGit(repository, ["add", "."]);
    fixtureGit(repository, ["commit", "-m", "authority"]);
    const baseSha = fixtureGit(repository, ["rev-parse", "HEAD"]);
    const baseTree = fixtureGit(repository, ["rev-parse", "HEAD^{tree}"]);
    const worktreeRelative = ".agent-factory/worktrees/lane-b";
    const worktree = path.join(repository, ...worktreeRelative.split("/"));
    await mkdir(path.dirname(worktree), { recursive: true });
    fixtureGit(repository, ["worktree", "add", "-b", "codex/lane-b", worktree, baseSha]);
    await writeFile(path.join(worktree, "kernel.ts"), "export const kernel = 1;\n", "utf8");
    fixtureGit(worktree, ["add", "kernel.ts"]);
    fixtureGit(worktree, ["commit", "-m", "kernel"]);
    const headSha = fixtureGit(worktree, ["rev-parse", "HEAD"]);
    const plan = initialPlan();
    plan.authorityReceipt = receipt({
      reviewedHeadSha: baseSha,
      reviewedHeadTree: baseTree,
      resultingMainSha: baseSha,
      resultingMainTree: baseTree,
    });
    plan.sharedBase = { mainSha: baseSha, mainTree: baseTree };
    plan.lanes = [lane({
      laneId: "LANE_A_SECOND_STAGE",
      deliverable: "C3R-T",
      headSha,
      worktreePath: worktreeRelative,
      branch: "codex/lane-b",
      baseMainSha: baseSha,
      baseMainTree: baseTree,
      ownedPaths: ["kernel.ts"],
      changedPaths: ["kernel.ts"],
    })];
    const evidence = collectParallelExecutionGitEvidence(plan, repository);
    assert.equal(evidence.lanes[0].entries[0].changeKind, "added");
    assert.equal(evidence.lanes[0].entries[0].gitMode, "100644");
    assert.equal(evidence.lanes[0].entries[0].baseBlobSha1, null);
    assert.equal(evidence.lanes[0].cleanWorktree, true);
    assert.deepEqual(validateParallelExecutionPlan(plan, contract, evidence), { valid: true, errors: [] });

    const wrongTree = clone(plan);
    wrongTree.authorityReceipt.resultingMainTree = "9".repeat(40);
    wrongTree.sharedBase.mainTree = "9".repeat(40);
    wrongTree.lanes[0].baseMainTree = "9".repeat(40);
    assert.equal(
      validateParallelExecutionPlan(wrongTree, contract, collectParallelExecutionGitEvidence(wrongTree, repository)).valid,
      false,
    );

    const premature = clone(plan);
    premature.authorityReceipt.resultingMainSha = preAmendmentSha;
    premature.authorityReceipt.resultingMainTree = preAmendmentTree;
    premature.sharedBase = { mainSha: preAmendmentSha, mainTree: preAmendmentTree };
    premature.lanes[0].baseMainSha = preAmendmentSha;
    premature.lanes[0].baseMainTree = preAmendmentTree;
    assert.equal(
      validateParallelExecutionPlan(premature, contract, collectParallelExecutionGitEvidence(premature, repository)).valid,
      false,
    );

    const missingReviewedHead = clone(plan);
    missingReviewedHead.authorityReceipt.reviewedHeadSha = "0".repeat(40);
    assert.throws(() => collectParallelExecutionGitEvidence(missingReviewedHead, repository));

    const missingCompletedHead = clone(plan);
    missingCompletedHead.completedIntegrationReceipts = [integrationReceipt(
      contract.declaredIntegrationAndMergeOrder[0],
      0,
      { resultingMainSha: baseSha, resultingMainTree: baseTree },
    )];
    missingCompletedHead.completedIntegrationReceipts[0].reviewedHeadSha = "0".repeat(40);
    assert.throws(() => collectParallelExecutionGitEvidence(missingCompletedHead, repository));
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("freezes the amendment artifacts across every parallel lane", () => {
  const plan = initialPlan();
  const frozenPath = contract.frozenAmendmentArtifacts[0];
  plan.lanes[2].ownedPaths = [frozenPath];
  plan.lanes[2].changedPaths = [frozenPath];
  const validation = validate(plan);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /changes frozen amendment artifact/u);
});

test("rejects globs, traversal, duplicate worktrees, duplicate branches, and base drift", () => {
  for (const badPath of ["lib/review-os/*.ts", "../outside.ts", "C:/outside.ts", "lib\\outside.ts"]) {
    const plan = initialPlan();
    plan.lanes[0].ownedPaths = [badPath];
    plan.lanes[0].changedPaths = [badPath];
    assert.equal(validate(plan).valid, false, badPath);
  }
  const duplicate = initialPlan();
  duplicate.lanes[1].worktreePath = duplicate.lanes[0].worktreePath;
  duplicate.lanes[1].branch = duplicate.lanes[0].branch;
  assert.equal(validate(duplicate).valid, false);

  const drift = initialPlan();
  drift.lanes[2].baseMainSha = "f".repeat(40);
  assert.equal(validate(drift).valid, false);
});

test("serializes every protected path class even when exact filenames differ", () => {
  const plan = initialPlan();
  plan.lanes[1].ownedPaths.push("supabase/migrations/20260825060000_first_stage.sql");
  plan.lanes[1].changedPaths.push("supabase/migrations/20260825060000_first_stage.sql");
  const validation = validate(plan);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /MIGRATIONS has concurrent mutation ownership/u);

  const caseVariant = initialPlan();
  caseVariant.lanes[1].ownedPaths.push("Supabase/Migrations/20260825060001_first_stage.sql");
  caseVariant.lanes[1].changedPaths.push("Supabase/Migrations/20260825060001_first_stage.sql");
  assert.match(validate(caseVariant).errors.join("\n"), /MIGRATIONS has concurrent mutation ownership/u);
});

test("serializes real shared auth and RLS path tokens across lanes", () => {
  const plan = initialPlan();
  plan.lanes[0].ownedPaths.push("components/shared/auth-form.tsx");
  plan.lanes[0].changedPaths.push("components/shared/auth-form.tsx");
  plan.lanes[1].ownedPaths.push("app/(auth)/login/page.tsx");
  plan.lanes[1].changedPaths.push("app/(auth)/login/page.tsx");
  const validation = validate(plan);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /SHARED_AUTH_OR_RLS has concurrent mutation ownership/u);

  const routeGroupsOnly = initialPlan();
  routeGroupsOnly.lanes[0].ownedPaths.push("app/(auth)/forgot-password/page.tsx");
  routeGroupsOnly.lanes[0].changedPaths.push("app/(auth)/forgot-password/page.tsx");
  routeGroupsOnly.lanes[1].ownedPaths.push("app/(auth)/reset-password/page.tsx");
  routeGroupsOnly.lanes[1].changedPaths.push("app/(auth)/reset-password/page.tsx");
  assert.match(validate(routeGroupsOnly).errors.join("\n"), /SHARED_AUTH_OR_RLS has concurrent mutation ownership/u);
});

test("enforces the independent three-initial and six-subject lane caps", () => {
  const fourInitial = initialPlan();
  fourInitial.lanes.push(lane({
    laneId: "LANE_A_SECOND_STAGE",
    deliverable: "C3R-L",
    worktreePath: ".agent-factory/worktrees/owner-study-os-lane-a-law",
    branch: "codex/owner-study-os-lane-a-law",
    ownedPaths: ["lib/review-os/c3r-l-contract.ts"],
    changedPaths: ["lib/review-os/c3r-l-contract.ts"],
  }));
  assert.match(validate(fourInitial).errors.join("\n"), /initial merge-producing lane limit exceeded/u);

  const afterFreeze = subjectPlan();
  assert.equal(validate(afterFreeze).valid, true);
  afterFreeze.lanes.push(lane({
    laneId: "ACCOUNTING",
    phase: "subject_adapter_eval",
    deliverable: "ACCOUNTING",
    worktreePath: ".agent-factory/worktrees/owner-study-os-extra-accounting",
    branch: "codex/owner-study-os-extra-accounting",
    baseMainSha: afterFreeze.sharedBase.mainSha,
    baseMainTree: afterFreeze.sharedBase.mainTree,
    ownedPaths: ["lib/review-os/first-stage/subjects/extra-accounting.ts"],
    changedPaths: ["lib/review-os/first-stage/subjects/extra-accounting.ts"],
  }));
  assert.match(validate(afterFreeze).errors.join("\n"), /subject\/eval lane limit exceeded/u);
});

test("opens the six subject/eval lanes only with the frozen Kernel receipt", () => {
  const plan = subjectPlan();
  assert.equal(validate(plan).valid, true);
  plan.kernelFreezeReceipt = null;
  assert.equal(validate(plan).valid, false);
});

test("requires one exact integration gate for a subject-lane Kernel change", () => {
  const plan = subjectPlan();
  const kernelPath = "lib/review-os/first-stage/kernel/mcq-kernel.ts";
  const accountingLane = plan.lanes.find((entry) => entry.laneId === "ACCOUNTING");
  accountingLane.ownedPaths.push(kernelPath);
  accountingLane.changedPaths.push(kernelPath);
  assert.equal(validate(plan).valid, false);
  plan.kernelIntegrationGate = {
    gateId: "kernel-integration-accounting-1",
    approved: true,
    laneId: "ACCOUNTING",
    paths: [kernelPath],
    kernelFreezeResultingMainSha: plan.kernelFreezeReceipt.resultingMainSha,
  };
  assert.equal(validate(plan).valid, true);
  plan.kernelIntegrationGate.laneId = "ECONOMICS";
  assert.equal(validate(plan).valid, false);
});

test("enforces the declared merge order as an exact validated receipt prefix", () => {
  const plan = initialPlan();
  plan.mergeCandidate = contract.declaredIntegrationAndMergeOrder[1];
  assert.equal(validate(plan).valid, false);
  plan.completedIntegrationReceipts = [{
    ...receipt(),
    deliverable: contract.declaredIntegrationAndMergeOrder[1],
  }];
  assert.equal(validate(plan).valid, false);
});

test("cannot open C3R-L before the validated C3R-T receipt", () => {
  const premature = initialPlan();
  premature.lanes[0].deliverable = "C3R-L";
  assert.match(validate(premature).errors.join("\n"), /cannot open C3R-L before the validated C3R-T/u);

  const afterTheory = initialPlan();
  afterTheory.completedIntegrationReceipts = [integrationReceipt(contract.declaredIntegrationAndMergeOrder[0], 0)];
  afterTheory.sharedBase = {
    mainSha: afterTheory.completedIntegrationReceipts[0].resultingMainSha,
    mainTree: afterTheory.completedIntegrationReceipts[0].resultingMainTree,
  };
  afterTheory.mergeCandidate = "LANE_A_SECOND_STAGE:C3R-L";
  afterTheory.lanes = [lane({
    deliverable: "C3R-L",
    baseMainSha: afterTheory.sharedBase.mainSha,
    baseMainTree: afterTheory.sharedBase.mainTree,
  })];
  assert.equal(validate(afterTheory).valid, true);

  const brokenChainEvidence = gitEvidence(afterTheory);
  brokenChainEvidence.completedIntegrationReceipts[0].resultParentSha = "f".repeat(40);
  assert.match(
    validate(afterTheory, brokenChainEvidence).errors.join("\n"),
    /exact Git-object squash chain/u,
  );

  const fabricated = clone(afterTheory);
  fabricated.completedIntegrationReceipts[0] = {
    pullRequest: 1,
    reviewedHeadSha: "2".repeat(40),
    resultingMainSha: AMENDMENT_MAIN,
    resultingMainTree: AMENDMENT_TREE,
    deliverable: contract.declaredIntegrationAndMergeOrder[0],
    validated: true,
  };
  fabricated.sharedBase = { mainSha: AMENDMENT_MAIN, mainTree: AMENDMENT_TREE };
  fabricated.lanes[0].baseMainSha = AMENDMENT_MAIN;
  fabricated.lanes[0].baseMainTree = AMENDMENT_TREE;
  assert.match(validate(fabricated).errors.join("\n"), /complete live-GitHub-validated exact-head merge receipt/u);
});

test("cannot open Foundation Freeze or Study Capacity bridge before their lane predecessors", () => {
  const prematureFoundation = initialPlan();
  prematureFoundation.lanes[0].deliverable = "WCV-C3_FOUNDATION_FREEZE";
  assert.match(
    validate(prematureFoundation).errors.join("\n"),
    /cannot open WCV-C3_FOUNDATION_FREEZE before the validated C3R-L/u,
  );

  const prematureBridge = initialPlan();
  prematureBridge.lanes[1].deliverable = "STUDY_CAPACITY_RUNTIME_BRIDGE";
  assert.match(
    validate(prematureBridge).errors.join("\n"),
    /cannot open STUDY_CAPACITY_RUNTIME_BRIDGE before the validated FIRST_STAGE_COMMON_KERNEL/u,
  );
});

test("preserves Owner-only/default-off and zero external mutation boundaries", () => {
  const plan = initialPlan();
  for (const field of [
    "publicActivation", "paymentActivation", "externalLearnerActivation",
    "remoteSupabaseMutation", "productionMutation",
  ]) {
    const drift = clone(plan);
    drift.activationBoundary[field] = true;
    assert.equal(validate(drift).valid, false, field);
  }
});

test("all public validators fail closed without throwing on malformed values", () => {
  for (const malformed of [null, [], {}, { lanes: null }, { lanes: [null] }]) {
    assert.doesNotThrow(() => validateParallelExecutionAuthority(malformed));
    assert.doesNotThrow(() => validateParallelExecutionPlan(malformed, contract, {}));
    assert.equal(validateParallelExecutionPlan(malformed, contract, {}).valid, false);
  }
  assert.doesNotThrow(() => validateParallelExecutionPlan(initialPlan(), null, null));
  assert.equal(validateParallelExecutionPlan(initialPlan(), null, null).valid, false);
});

test("rejects authority weakening before any lane plan is considered", () => {
  const noGitProof = clone(contract);
  noGitProof.ownershipPolicy.trustedGitDiffEvidenceRequired = false;
  assert.equal(validateParallelExecutionAuthority(noGitProof).valid, false);
  const removedMigrationBoundary = clone(contract);
  removedMigrationBoundary.protectedConcurrentMutationClasses[0].pathPrefixes = [];
  assert.equal(validateParallelExecutionAuthority(removedMigrationBoundary).valid, false);
  const mutableAuthority = clone(contract);
  mutableAuthority.frozenAmendmentArtifacts = [];
  assert.equal(validateParallelExecutionAuthority(mutableAuthority).valid, false);
  const fakeReceipt = initialPlan();
  fakeReceipt.authorityReceipt.source = "caller_asserted";
  assert.equal(validate(fakeReceipt).valid, false);
});

test("the focused CLI validates the repository authority without mutation", () => {
  const execution = spawnSync(process.execPath, ["scripts/automation/parallel-execution-v1.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(execution.status, 0, execution.stderr);
  assert.match(execution.stdout, /"remoteMutationCount": 0/u);
});

test("repository mirrors state only the narrow receipt-gated exception", async () => {
  const [decision, agents, roadmap] = await Promise.all([
    readFile(new URL("../docs/decisions/2026-08-25-owner-parallel-execution-v1.md", import.meta.url), "utf8"),
    readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
    readFile(new URL("../roadmap/active-program.yml", import.meta.url), "utf8"),
  ]);
  for (const phrase of [
    "source_only_operating_amendment", "at most three initial merge-producing lanes",
    "at most six subject-adapter/eval lanes", "changed path must be owned by exactly one lane",
    "Public activation, payment", "makes no claim of learning efficacy",
  ]) assert.match(decision, new RegExp(phrase));
  assert.match(agents, /sole exception is[\s\S]*PARALLEL_EXECUTION_V1/u);
  assert.match(roadmap, /globalMergeProducingWriterLimit: 1/u);
  assert.match(roadmap, /ownerStudyOsInitialMergeProducingLaneLimit: 3/u);
  assert.match(roadmap, /ownerStudyOsSubjectAdapterEvalLaneLimitAfterKernelFreeze: 6/u);
});
