import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryCiRepairPlanSafe,
  assertAgentFactoryCiRepairTextSafe,
  buildAgentFactoryCiRepairMarkdown,
  buildAgentFactoryCiRepairSummary,
  createAgentFactoryCiRepairPlan,
} from "../lib/agent-factory/ci-repair-loop.ts";
import { createAgentFactoryBranchCommitPrPlan } from "../lib/agent-factory/branch-commit-pr-adapter.ts";
import { createCodexInvocationPlan } from "../lib/agent-factory/codex-invocation-adapter.ts";
import { createAgentFactoryOrchestratorPlan } from "../lib/agent-factory/factory-orchestrator.ts";
import { createAgentFactoryPlannerNote } from "../lib/agent-factory/factory-planner-notes.ts";
import { createAgentFactoryPatchArtifactPlan } from "../lib/agent-factory/patch-artifact-adapter.ts";
import {
  assertAgentFactoryRunHistoryRecordSafe,
  createAgentFactoryRunHistoryRecord,
} from "../lib/agent-factory/run-history.ts";

const DOC_PATH = path.resolve("docs/agent-factory-ci-repair-loop.md");
const RUN_HISTORY_DOC_PATH = path.resolve("docs/agent-factory-run-history.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-ci-repair.mjs");
const PACKAGE_PATH = path.resolve("package.json");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");
const NODE_TEST_LOADER = "./tests/ts-extension-loader.mjs";

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function writeJson(dir, fileName, value) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), JSON.stringify(value, null, 2), "utf8");
}

function readNormalized(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n?/g, "\n");
}

function safeTaskPackages(overrides = {}) {
  return {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: ["AF014"],
    packages: [
      {
        itemId: "AF014",
        itemTitle: "CI Repair Loop v1",
        repository: "chachathecat/inverge",
        branchName: "feat/af014-ci-repair-loop",
        worktreePathSuggestion: "..\\worktrees\\af014-ci-repair-loop",
        codexPrompt: "raw task package prompt must not be rendered by AF014",
        validationCommands: ["npm.cmd run typecheck", "npm.cmd test"],
      },
    ],
    ...overrides,
  };
}

function safeCodexInvocationPlan(overrides = {}) {
  return {
    version: 1,
    adapter: "af010-codex-invocation-adapter",
    status: "planned",
    dryRun: true,
    approvedForInvocation: false,
    canExecute: false,
    codexWillBeInvoked: false,
    metadataOnly: true,
    taskPackage: {
      requestedItemId: "AF014",
      packageSummary: {
        itemId: "AF014",
        itemTitle: "CI Repair Loop v1",
      },
    },
    dataBoundary: {
      safe: true,
      violationCount: 0,
      omittedRawPayloads: true,
    },
    invocation: {
      mode: "dry_run_plan_only",
    },
    blockedReasons: [],
    blockedReasonCodes: [],
    artifacts: [],
    ...overrides,
  };
}

function safePlannerNote(overrides = {}) {
  return {
    version: 1,
    noteId: "af013a-test",
    createdAt: "2026-06-30T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    target: {
      taskId: "AF014",
      prNumber: 493,
      baseBranch: "main",
      proposedBranchName: "feat/af014-ci-repair-loop",
    },
    boundary: {
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: "..\\worktrees\\af014-ci-repair-loop",
      maxChangedFiles: 8,
      maxDiffBytes: 60000,
      requiresHumanApproval: true,
      approvalGate: "not_requested",
    },
    ...overrides,
  };
}

function safePatchArtifactPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af013b-test",
    createdAt: "2026-06-30T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    target: {
      taskId: "AF014",
      prNumber: 493,
      baseBranch: "main",
      proposedBranchName: "feat/af014-ci-repair-loop",
    },
    patchBoundary: {
      patchArtifactOnly: true,
      patchAppliedToWorkingTree: false,
      isolatedWorkspaceRequired: true,
      maxChangedFiles: 8,
      maxPatchBytes: 60000,
      requiresHumanApproval: true,
      approvalGate: "not_requested",
    },
    proposedPatchArtifacts: [],
    ...overrides,
  };
}

function safeBranchCommitPrPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af013c-test",
    createdAt: "2026-06-30T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    target: {
      taskId: "AF014",
      issueNumber: 493,
      prNumber: 493,
      baseBranch: "main",
      proposedBranchName: "feat/af014-ci-repair-loop",
      proposedCommitTitle: "Add AF014 CI repair loop",
      proposedPrTitle: "[AF014] CI Repair Loop v1",
    },
    mutationBoundary: {
      metadataOnlyPlan: true,
      requiresHumanApproval: true,
      approvalGate: "not_requested",
      requestedMutationClass: "none",
      approvedMutationClasses: [],
      willMutateWithoutApproval: false,
      maxChangedFiles: 8,
      maxPatchBytes: 60000,
    },
    actions: {
      willRunCodex: false,
      willRunShellCommands: false,
      willApplyPatch: false,
      willEditWorkingTree: false,
      willCreateBranch: false,
      willCreateCommit: false,
      willPush: false,
      willCreateOrUpdatePr: false,
      willRerunWorkflow: false,
      willMergeOrRebase: false,
    },
    ...overrides,
  };
}

function writeUpstreamArtifacts(dir) {
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-planner-note.json", safePlannerNote());
  writeJson(dir, "factory-patch-artifact-plan.json", safePatchArtifactPlan());
  writeJson(dir, "branch-commit-pr-plan.json", safeBranchCommitPrPlan());
  const historyRecord = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-30T00:00:00.000Z",
    source: "agent-factory-branch-commit-pr",
    mode: "branch_commit_pr_plan",
    targetTaskId: "AF014",
    targetPrNumber: 493,
    status: "success",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
    repository: "chachathecat/inverge",
  });
  fs.writeFileSync(
    path.join(dir, "run-history.jsonl"),
    `${JSON.stringify(historyRecord)}\n`,
    "utf8",
  );
}

function writeCiFailure(dir, failure) {
  writeJson(dir, "ci-log-summary.json", {
    generatedAt: "2026-06-30T00:00:00.000Z",
    failures: [
      {
        workflowName: "Fast CI",
        jobName: "node-tests",
        stepName: "classify failure",
        conclusion: "failure",
        ...failure,
      },
    ],
  });
}

function planForFailure(failure, options = {}) {
  const dir = tempDir("af014-classifier");
  writeUpstreamArtifacts(dir);
  writeCiFailure(dir, failure);
  return createAgentFactoryCiRepairPlan({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
    ...options,
  });
}

function singleClassification(plan) {
  assert.equal(plan.failureClassifications.length >= 1, true);
  return plan.failureClassifications[0];
}

function runCli(args) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      NODE_TEST_LOADER,
      SCRIPT_PATH,
      ...args,
    ],
    { encoding: "utf8" },
  );
}

test("AF014 docs, npm script, and CLI exist with report-only CI repair scope", () => {
  const docs = readNormalized(DOC_PATH);
  const runHistoryDocs = readNormalized(RUN_HISTORY_DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:ci-repair/);
  assert.match(script, /AF014 v1 is metadata-only/);
  assert.match(docs, /AF014 v1 does not:/);
  assert.match(docs, /Failure Classes/);
  assert.match(docs, /Approval Gate Behavior/);
  assert.match(docs, /Data Boundary/);
  assert.match(docs, /AF015 Roadmap Autopilot/);
  assert.match(runHistoryDocs, /agent-factory:ci-repair/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("creates metadata-only planned CI repair plan from synthetic failing PR Contract metadata", () => {
  const plan = planForFailure({
    workflowName: "PR Contract",
    jobName: "validate-pr-contract",
    stepName: "Required sections",
    missingRequiredSections: ["## Runtime evidence"],
  });
  const markdown = buildAgentFactoryCiRepairMarkdown(plan);
  const summary = buildAgentFactoryCiRepairSummary(plan);
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "planned");
  assert.equal(plan.reportOnly, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.target.prNumber, 493);
  assert.equal(plan.target.branchName, "feat/af014-ci-repair-loop");
  assert.equal(plan.ciState.latestConclusion, "failure");
  assert.ok(plan.ciState.observedFailureClasses.includes("pr_contract"));
  assert.equal(singleClassification(plan).reasonCode, "pr_contract_missing_required_section");
  assert.equal(plan.proposedRepairSteps[0].status, "not_requested");
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.equal(plan.repairBoundary.willMutateWithoutApproval, false);
  assert.match(markdown, /AF014 CI Repair Loop/);
  assert.match(summary, /Codex invoked: no/);
  assert.equal(serialized.includes("raw task package prompt must not be rendered"), false);
  assert.doesNotThrow(() => assertAgentFactoryCiRepairPlanSafe(plan));
});

test("classifies PR Contract missing section", () => {
  const plan = planForFailure({ missingRequiredSections: ["## Goal"] });

  assert.equal(singleClassification(plan).failureClass, "pr_contract");
  assert.equal(singleClassification(plan).reasonCode, "pr_contract_missing_required_section");
});

test("classifies missing risk line", () => {
  const plan = planForFailure({ missingRiskLine: true });

  assert.equal(singleClassification(plan).failureClass, "pr_contract");
  assert.equal(singleClassification(plan).reasonCode, "pr_contract_missing_risk_line");
});

test("classifies missing merge recommendation", () => {
  const plan = planForFailure({ missingMergeRecommendation: true });

  assert.equal(singleClassification(plan).failureClass, "pr_contract");
  assert.equal(singleClassification(plan).reasonCode, "pr_contract_missing_merge_recommendation");
});

test("classifies invalid closing reference", () => {
  const plan = planForFailure({ closingReferenceCount: 0 });

  assert.equal(singleClassification(plan).failureClass, "pr_contract");
  assert.equal(singleClassification(plan).reasonCode, "pr_contract_invalid_closing_reference");
});

test("classifies typecheck failure", () => {
  const plan = planForFailure({ reasonCode: "typecheck_failed" });

  assert.equal(singleClassification(plan).failureClass, "typecheck");
  assert.equal(singleClassification(plan).reasonCode, "typecheck_failed");
});

test("classifies lint failure", () => {
  const plan = planForFailure({ reasonCode: "lint_failed" });

  assert.equal(singleClassification(plan).failureClass, "lint");
  assert.equal(singleClassification(plan).reasonCode, "lint_failed");
});

test("classifies focused test failure", () => {
  const plan = planForFailure({ stepName: "tests/agent-factory-ci-repair-loop.test.mjs" });

  assert.equal(singleClassification(plan).failureClass, "focused_tests");
  assert.equal(singleClassification(plan).reasonCode, "focused_tests_failed");
});

test("classifies full test failure", () => {
  const plan = planForFailure({ reasonCode: "full_tests_failed" });

  assert.equal(singleClassification(plan).failureClass, "full_tests");
  assert.equal(singleClassification(plan).reasonCode, "full_tests_failed");
});

test("classifies build failure", () => {
  const plan = planForFailure({ stepName: "npm.cmd run build" });

  assert.equal(singleClassification(plan).failureClass, "build");
  assert.equal(singleClassification(plan).reasonCode, "build_failed");
});

test("classifies learner loop failure", () => {
  const plan = planForFailure({ stepName: "npm.cmd run verify:learner-loop:ci" });

  assert.equal(singleClassification(plan).failureClass, "learner_loop");
  assert.equal(singleClassification(plan).reasonCode, "learner_loop_failed");
});

test("classifies risk gate failure", () => {
  const plan = planForFailure({ reasonCode: "risk_gate_failed" });

  assert.equal(singleClassification(plan).failureClass, "risk_gate");
  assert.equal(singleClassification(plan).reasonCode, "risk_gate_failed");
});

test("classifies runtime gate failure", () => {
  const plan = planForFailure({ stepName: "runtime evidence gate" });

  assert.equal(singleClassification(plan).failureClass, "runtime_gate");
  assert.equal(singleClassification(plan).reasonCode, "runtime_gate_failed");
});

test("classifies closed-beta readiness failure", () => {
  const plan = planForFailure({ stepName: "check:closed-beta-readiness" });

  assert.equal(singleClassification(plan).failureClass, "closed_beta_readiness");
  assert.equal(singleClassification(plan).reasonCode, "closed_beta_readiness_failed");
});

test("classifies workflow infrastructure and unknown failures", () => {
  const infra = planForFailure({ stepName: "runner startup failure" });
  const unknown = planForFailure({ stepName: "unmapped failure" });

  assert.equal(singleClassification(infra).failureClass, "workflow_infra");
  assert.equal(singleClassification(infra).reasonCode, "workflow_infra_failed");
  assert.equal(singleClassification(unknown).failureClass, "unknown");
  assert.equal(singleClassification(unknown).reasonCode, "unknown_ci_failure");
});

test("blocks on missing approval gate", () => {
  const plan = planForFailure({ reasonCode: "typecheck_failed" }, { approvalGate: "missing" });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_human_approval"));
  assert.equal(plan.proposedRepairSteps.every((step) => step.status === "blocked"), true);
});

test("blocks on failed-closed approval gate", () => {
  const plan = planForFailure({ reasonCode: "typecheck_failed" }, { approvalGate: "failed_closed" });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("approval_failed_closed"));
});

test("approvalGate approved still produces metadata-only plan and does not execute mutation in v1", () => {
  const plan = planForFailure({ reasonCode: "typecheck_failed" }, { approvalGate: "approved" });

  assert.equal(plan.status, "planned");
  assert.equal(plan.proposedRepairSteps.every((step) => step.status === "planned"), true);
  assert.equal(plan.proposedRepairSteps.every((step) => step.requiresApproval), true);
  assert.equal(plan.proposedRepairSteps.every((step) => step.approved === false), true);
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.equal(plan.repairBoundary.willMutateWithoutApproval, false);
});

test("fails closed on unsafe keys", () => {
  const plan = planForFailure({ reasonCode: "typecheck_failed" });

  for (const key of [
    "rawPrBody",
    "rawComments",
    "rawPatch",
    "rawDiff",
    "rawTaskPackagePrompt",
    "rawLearnerAnswer",
    "ocrText",
    "providerPayload",
    "billingData",
    "authData",
    "paymentData",
  ]) {
    const unsafe = JSON.parse(JSON.stringify(plan));
    unsafe[key] = "unsafe value must not be accepted";
    assert.throws(
      () => assertAgentFactoryCiRepairPlanSafe(unsafe),
      /forbidden key/i,
      `expected forbidden key rejection for ${key}`,
    );
  }
});

test("fails closed on secret-like values", () => {
  const dir = tempDir("af014-secret");
  writeUpstreamArtifacts(dir);
  writeJson(dir, "ci-log-summary.json", {
    failures: [
      {
        workflowName: "ghp_should_not_escape12345",
        conclusion: "failure",
        reasonCode: "typecheck_failed",
      },
    ],
  });

  const plan = createAgentFactoryCiRepairPlan({ artifactDir: dir });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("unsafe_input_artifact"));
  assert.equal(serialized.includes("ghp_should_not_escape12345"), false);
});

test("fails closed on raw PR body, comments, patch, diff, task prompt, learner, OCR, provider, billing, auth, and payment sentinels", () => {
  for (const line of [
    "rawPrBody: unsafe",
    "commentBody: unsafe",
    "rawPatch: unsafe",
    "rawDiff: unsafe",
    "rawTaskPackagePrompt: unsafe",
    "rawLearnerAnswer: unsafe",
    "ocrText: unsafe",
    "providerPayload: unsafe",
    "billingData: unsafe",
    "authData: unsafe",
    "paymentData: unsafe",
  ]) {
    assert.throws(
      () => assertAgentFactoryCiRepairTextSafe(line, "unsafe AF014 text"),
      /raw-content|credential|secret-like/i,
      `expected unsafe text rejection for ${line}`,
    );
  }
});

test("CLI writes JSON, Markdown, summary artifacts", () => {
  const dir = tempDir("af014-cli");
  const jsonPath = path.join(dir, "ci-repair-plan.json");
  const markdownPath = path.join(dir, "ci-repair-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeUpstreamArtifacts(dir);
  writeCiFailure(dir, { reasonCode: "typecheck_failed" });

  const result = runCli([
    "--artifact-dir",
    dir,
    "--json",
    jsonPath,
    "--markdown",
    markdownPath,
    "--summary",
    summaryPath,
    "--stdout",
    "none",
    "--approval-gate",
    "approved",
    "--pr-number",
    "493",
    "--head-sha",
    "0123456789abcdef",
    "--branch",
    "feat/af014-ci-repair-loop",
    "--base-branch",
    "main",
    "--task-id",
    "AF014",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).source.script, "agent-factory-ci-repair");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF014 CI Repair Loop/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Workflow rerun: no/);
});

test("CLI appends AF011 run history", () => {
  const dir = tempDir("af014-cli-history");
  const jsonPath = path.join(dir, "ci-repair-plan.json");
  const markdownPath = path.join(dir, "ci-repair-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeUpstreamArtifacts(dir);
  writeCiFailure(dir, { reasonCode: "lint_failed" });

  const result = runCli([
    "--artifact-dir",
    dir,
    "--json",
    jsonPath,
    "--markdown",
    markdownPath,
    "--summary",
    summaryPath,
    "--stdout",
    "none",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(dir, "run-history.jsonl")), true);
  assert.match(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /agent-factory-ci-repair/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /raw task package prompt must not be rendered/);
});

test("active AF014 code does not run shell commands", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/ci-repair-loop.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /from "node:child_process"|spawnSync|execFile|execSync|spawn\(/i);
});

test("active AF014 code does not invoke Codex", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/ci-repair-loop.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
});

test("active AF014 code does not apply patches", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/ci-repair-loop.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /\b(?:applyPatch|apply_patch)\b|\bpatch\s+-p\d\b/i);
});

test("active AF014 code does not edit source files", () => {
  const plan = planForFailure({ reasonCode: "build_failed" });

  assert.equal(plan.actions.willEditWorkingTree, false);
  assert.equal(plan.actions.willApplyPatch, false);
});

test("active AF014 code does not create branch, commit, push, or PR", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/ci-repair-loop.ts")),
  ].join("\n");
  const plan = planForFailure({ reasonCode: "build_failed" });

  assert.doesNotMatch(active, /\bgit\s+(?:switch|checkout|branch|commit|push|merge|rebase|reset)\b/i);
  assert.doesNotMatch(active, /\b(?:octokit|createPullRequest|createCommitOnBranch|mergePullRequest|requestReview)\b/i);
  assert.equal(plan.actions.willCreateBranch, false);
  assert.equal(plan.actions.willCreateCommit, false);
  assert.equal(plan.actions.willPush, false);
  assert.equal(plan.actions.willCreateOrUpdatePr, false);
});

test("active AF014 code does not rerun workflows", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/ci-repair-loop.ts")),
  ].join("\n");
  const plan = planForFailure({ reasonCode: "workflow_infra_failed" });

  assert.doesNotMatch(active, /\/rerun\b|workflow_dispatch/i);
  assert.equal(plan.actions.willRerunWorkflow, false);
});

test("active AF014 code does not merge or rebase", () => {
  const plan = planForFailure({ reasonCode: "workflow_infra_failed" });

  assert.equal(plan.actions.willMergeOrRebase, false);
});

test("preserves AF010 behavior", () => {
  const codexPlan = createCodexInvocationPlan(safeTaskPackages().packages[0], {
    dryRun: true,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });

  assert.equal(codexPlan.status, "planned");
  assert.equal(codexPlan.codexWillBeInvoked, false);
});

test("preserves AF011 behavior", () => {
  const historyRecord = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-30T00:01:00.000Z",
    source: "agent-factory-ci-repair",
    mode: "ci_repair_plan",
    targetTaskId: "AF014",
    status: "success",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
  });

  assert.doesNotThrow(() => assertAgentFactoryRunHistoryRecordSafe(historyRecord));
});

test("preserves AF012 behavior", () => {
  const dir = tempDir("af014-orchestrator-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());

  const orchestratorPlan = createAgentFactoryOrchestratorPlan({ artifactDir: dir });

  assert.equal(orchestratorPlan.status, "planned");
  assert.equal(orchestratorPlan.willExecuteCommands, false);
});

test("preserves AF013A behavior", () => {
  const dir = tempDir("af014-planner-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());

  const plannerNote = createAgentFactoryPlannerNote({ artifactDir: dir });

  assert.equal(plannerNote.status, "planned");
  assert.equal(plannerNote.actions.willRunCodex, false);
});

test("preserves AF013B behavior", () => {
  const dir = tempDir("af014-patch-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-planner-note.json", safePlannerNote());

  const patchPlan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(patchPlan.status, "planned");
  assert.equal(patchPlan.actions.willApplyPatch, false);
});

test("preserves AF013C behavior", () => {
  const dir = tempDir("af014-branch-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-planner-note.json", safePlannerNote());
  writeJson(dir, "factory-patch-artifact-plan.json", safePatchArtifactPlan());

  const branchPlan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(branchPlan.status, "planned");
  assert.equal(branchPlan.actions.willCreateCommit, false);
});

test("AF014 focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-ci-repair-loop\.test\.mjs/);
});
