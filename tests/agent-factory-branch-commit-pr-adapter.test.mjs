import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryBranchCommitPrPlanSafe,
  assertAgentFactoryBranchCommitPrTextSafe,
  buildAgentFactoryBranchCommitPrMarkdown,
  buildAgentFactoryBranchCommitPrSummary,
  createAgentFactoryBranchCommitPrPlan,
} from "../lib/agent-factory/branch-commit-pr-adapter.ts";
import { createCodexInvocationPlan } from "../lib/agent-factory/codex-invocation-adapter.ts";
import { createAgentFactoryOrchestratorPlan } from "../lib/agent-factory/factory-orchestrator.ts";
import { createAgentFactoryPlannerNote } from "../lib/agent-factory/factory-planner-notes.ts";
import { createAgentFactoryPatchArtifactPlan } from "../lib/agent-factory/patch-artifact-adapter.ts";
import {
  assertAgentFactoryRunHistoryRecordSafe,
  createAgentFactoryRunHistoryRecord,
} from "../lib/agent-factory/run-history.ts";

const DOC_PATH = path.resolve("docs/agent-factory-branch-commit-pr-adapter.md");
const RUN_HISTORY_DOC_PATH = path.resolve("docs/agent-factory-run-history.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-branch-commit-pr.mjs");
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
    selectedItemIds: ["AF013C"],
    packages: [
      {
        itemId: "AF013C",
        itemTitle: "Approval-Gated Branch Commit PR Adapter v1",
        repository: "chachathecat/inverge",
        branchName: "feat/af013c-branch-commit-pr-adapter",
        worktreePathSuggestion: "..\\worktrees\\af013c-branch-commit-pr-adapter",
        issueNumber: 491,
        codexPrompt: "raw task package prompt must not be rendered by AF013C",
        prBodyTemplate: "raw PR body template must not be rendered by AF013C",
        comments: ["raw comment text must not be rendered by AF013C"],
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
      requestedItemId: "AF013C",
      promptSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      promptCharCount: 64,
      packageSummary: {
        itemId: "AF013C",
        itemTitle: "Approval-Gated Branch Commit PR Adapter v1",
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
      taskId: "AF013C",
      prNumber: null,
      baseBranch: "main",
      proposedBranchName: "feat/af013c-branch-commit-pr-adapter",
    },
    boundary: {
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: "..\\worktrees\\af013c-branch-commit-pr-adapter",
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
      taskId: "AF013C",
      prNumber: null,
      baseBranch: "main",
      proposedBranchName: "feat/af013c-branch-commit-pr-adapter",
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

function safeOrchestratorPlan(overrides = {}) {
  return {
    version: 1,
    orchestrator: "af012-factory-orchestrator",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    willExecuteCommands: false,
    codexWillBeInvoked: false,
    nextAction: {
      code: "review_run_history",
    },
    dataBoundary: {
      inspectedArtifactCount: 4,
    },
    ...overrides,
  };
}

function writeRequiredUpstreamArtifacts(
  dir,
  {
    taskPackages = safeTaskPackages(),
    codexInvocationPlan = safeCodexInvocationPlan(),
    plannerNote = safePlannerNote(),
    patchArtifactPlan = safePatchArtifactPlan(),
  } = {},
) {
  if (taskPackages !== null) writeJson(dir, "codex-task-packages.json", taskPackages);
  if (codexInvocationPlan !== null) writeJson(dir, "codex-invocation-plan.json", codexInvocationPlan);
  if (plannerNote !== null) writeJson(dir, "factory-planner-note.json", plannerNote);
  if (patchArtifactPlan !== null) writeJson(dir, "factory-patch-artifact-plan.json", patchArtifactPlan);
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

test("AF013C docs, npm script, and CLI exist with metadata-only branch/commit/PR scope", () => {
  const docs = readNormalized(DOC_PATH);
  const runHistoryDocs = readNormalized(RUN_HISTORY_DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:branch-commit-pr/);
  assert.match(script, /AF013C v1 is metadata-only/);
  assert.match(docs, /AF013C v1 is metadata-only/);
  assert.match(docs, /does not call GitHub mutation APIs/);
  assert.match(docs, /Approval Gate Behavior/);
  assert.match(docs, /Mutation Boundary/);
  assert.match(docs, /Rollback/);
  assert.match(runHistoryDocs, /agent-factory:branch-commit-pr/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("creates metadata-only planned plan when required upstream artifacts exist", () => {
  const dir = tempDir("af013c-planned");
  writeRequiredUpstreamArtifacts(dir);
  writeJson(dir, "factory-orchestrator-plan.json", safeOrchestratorPlan());
  fs.writeFileSync(
    path.join(dir, "run-history.jsonl"),
    `${JSON.stringify({
      version: 1,
      source: "agent-factory-patch-artifact",
      status: "success",
      dryRun: true,
      target: { taskId: "AF013C", prNumber: null },
    })}\n`,
    "utf8",
  );

  const plan = createAgentFactoryBranchCommitPrPlan({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });
  const markdown = buildAgentFactoryBranchCommitPrMarkdown(plan);
  const summary = buildAgentFactoryBranchCommitPrSummary(plan);
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "planned");
  assert.equal(plan.reportOnly, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.target.taskId, "AF013C");
  assert.equal(plan.target.issueNumber, 491);
  assert.equal(plan.target.baseBranch, "main");
  assert.equal(plan.target.proposedBranchName, "feat/af013c-branch-commit-pr-adapter");
  assert.equal(plan.mutationBoundary.approvalGate, "not_requested");
  assert.equal(plan.mutationBoundary.requestedMutationClass, "none");
  assert.equal(plan.mutationBoundary.willMutateWithoutApproval, false);
  assert.equal(plan.actions.willRunCodex, false);
  assert.equal(plan.actions.willRunShellCommands, false);
  assert.equal(plan.actions.willApplyPatch, false);
  assert.equal(plan.actions.willEditWorkingTree, false);
  assert.equal(plan.actions.willCreateBranch, false);
  assert.equal(plan.actions.willCreateCommit, false);
  assert.equal(plan.actions.willPush, false);
  assert.equal(plan.actions.willCreateOrUpdatePr, false);
  assert.equal(plan.actions.willRerunWorkflow, false);
  assert.equal(plan.actions.willMergeOrRebase, false);
  assert.equal(plan.proposedGitHubOperations[0].operation, "none");
  assert.equal(plan.proposedGitHubOperations[0].status, "not_requested");
  assert.equal(plan.proposedGitHubOperations[0].approved, false);
  assert.equal(plan.inputArtifacts.filter((artifact) => artifact.status === "available").length, 6);
  for (const forbidden of [
    "raw task package prompt must not be rendered",
    "raw PR body template must not be rendered",
    "raw comment text must not be rendered",
    "codexPrompt",
    "prBodyTemplate",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `plan leaked ${forbidden}`);
    assert.equal(markdown.includes(forbidden), false, `markdown leaked ${forbidden}`);
    assert.equal(summary.includes(forbidden), false, `summary leaked ${forbidden}`);
  }
  assert.doesNotThrow(() => assertAgentFactoryBranchCommitPrPlanSafe(plan));
});

test("blocks when AF013A planner note is missing", () => {
  const dir = tempDir("af013c-missing-planner");
  writeRequiredUpstreamArtifacts(dir, { plannerNote: null });

  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_planner_note"));
  assert.equal(plan.blockedReasonCodes.includes("missing_task_package"), false);
  assert.equal(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"), false);
  assert.equal(plan.blockedReasonCodes.includes("missing_patch_artifact_plan"), false);
});

test("blocks when AF013A planner note is blocked", () => {
  const dir = tempDir("af013c-blocked-planner");
  writeRequiredUpstreamArtifacts(dir, {
    plannerNote: safePlannerNote({
      status: "blocked",
      blockedReasonCodes: ["approval_failed_closed"],
    }),
  });

  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("planner_note_blocked"));
});

test("blocks when AF010 invocation plan is missing", () => {
  const dir = tempDir("af013c-missing-codex");
  writeRequiredUpstreamArtifacts(dir, { codexInvocationPlan: null });

  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"));
});

test("blocks when task package artifact is missing", () => {
  const dir = tempDir("af013c-missing-task");
  writeRequiredUpstreamArtifacts(dir, { taskPackages: null });

  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_task_package"));
});

test("blocks when AF013B patch artifact plan is missing", () => {
  const dir = tempDir("af013c-missing-patch-plan");
  writeRequiredUpstreamArtifacts(dir, { patchArtifactPlan: null });

  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_patch_artifact_plan"));
});

test("blocks when AF013B patch artifact plan is blocked", () => {
  const dir = tempDir("af013c-blocked-patch-plan");
  writeRequiredUpstreamArtifacts(dir, {
    patchArtifactPlan: safePatchArtifactPlan({
      status: "blocked",
      blockedReasonCodes: ["missing_planner_note"],
    }),
  });

  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("patch_artifact_plan_blocked"));
});

test("blocks on missing and failed-closed approval gates", () => {
  const dir = tempDir("af013c-approval");
  writeRequiredUpstreamArtifacts(dir);
  const missing = createAgentFactoryBranchCommitPrPlan({
    artifactDir: dir,
    approvalGate: "missing",
  });
  const failedClosed = createAgentFactoryBranchCommitPrPlan({
    artifactDir: dir,
    approvalGate: "failed_closed",
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockedReasonCodes.includes("missing_human_approval"));
  assert.equal(failedClosed.status, "blocked");
  assert.ok(failedClosed.blockedReasonCodes.includes("approval_failed_closed"));
});

test("requested mutation class without approval fails closed", () => {
  const dir = tempDir("af013c-request-no-approval");
  writeRequiredUpstreamArtifacts(dir);

  const plan = createAgentFactoryBranchCommitPrPlan({
    artifactDir: dir,
    requestedMutationClass: "branch_commit_pr",
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_human_approval"));
  assert.equal(plan.proposedGitHubOperations.every((operation) => operation.status === "blocked"), true);
});

test("approvalGate approved still produces metadata-only plan and does not execute mutation in v1", () => {
  const dir = tempDir("af013c-approved");
  writeRequiredUpstreamArtifacts(dir);

  const plan = createAgentFactoryBranchCommitPrPlan({
    artifactDir: dir,
    approvalGate: "approved",
    requestedMutationClass: "branch_commit_pr",
    issueNumber: 491,
    prNumber: null,
    proposedCommitTitle: "Add AF013C branch commit PR adapter",
    proposedPrTitle: "[AF013C] Approval-Gated Branch Commit PR Adapter v1",
  });

  assert.equal(plan.status, "planned");
  assert.deepEqual(plan.mutationBoundary.approvedMutationClasses, ["branch_commit_pr"]);
  assert.deepEqual(
    plan.proposedGitHubOperations.map((operation) => operation.operation),
    ["create_branch", "create_commit", "push_branch", "create_pr"],
  );
  assert.equal(plan.proposedGitHubOperations.every((operation) => operation.status === "planned"), true);
  assert.equal(plan.proposedGitHubOperations.every((operation) => operation.requiresApproval), true);
  assert.equal(plan.proposedGitHubOperations.every((operation) => operation.approved === false), true);
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.equal(plan.mutationBoundary.willMutateWithoutApproval, false);
});

test("fails closed on unsafe keys and secret-like values", () => {
  const dir = tempDir("af013c-unsafe-keys");
  writeRequiredUpstreamArtifacts(dir);
  const plan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

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
      () => assertAgentFactoryBranchCommitPrPlanSafe(unsafe),
      /forbidden key/i,
      `expected forbidden key rejection for ${key}`,
    );
  }

  const secret = JSON.parse(JSON.stringify(plan));
  secret.target.proposedBranchName = "ghp_should_not_escape12345";
  assert.throws(
    () => assertAgentFactoryBranchCommitPrPlanSafe(secret),
    /secret-like/i,
  );
});

test("fails closed on raw PR body, comments, patch, diff, task prompt, learner, OCR, provider, billing, auth, and payment text sentinels", () => {
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
      () => assertAgentFactoryBranchCommitPrTextSafe(line, "unsafe AF013C text"),
      /raw-content|credential|secret-like/i,
      `expected unsafe text rejection for ${line}`,
    );
  }
});

test("CLI writes JSON, Markdown, summary artifacts and appends AF011 run history", () => {
  const dir = tempDir("af013c-cli");
  const jsonPath = path.join(dir, "branch-commit-pr-plan.json");
  const markdownPath = path.join(dir, "branch-commit-pr-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeRequiredUpstreamArtifacts(dir);

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
    "--mutation-class",
    "branch_commit_pr",
    "--issue-number",
    "491",
    "--base-branch",
    "main",
    "--proposed-branch",
    "feat/af013c-branch-commit-pr-adapter",
    "--commit-title",
    "Add AF013C branch commit PR adapter",
    "--pr-title",
    "[AF013C] Approval-Gated Branch Commit PR Adapter v1",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).source.script, "agent-factory-branch-commit-pr");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF013C Branch Commit PR Adapter/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Branch created: no/);
  assert.equal(fs.existsSync(path.join(dir, "run-history.jsonl")), true);
  assert.match(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /agent-factory-branch-commit-pr/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /raw task package prompt must not be rendered/);
});

test("AF013C active code introduces no Codex execution, shell execution, patch application, source edit, GitHub mutation, workflow rerun, merge, or rebase path", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/branch-commit-pr-adapter.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
  assert.doesNotMatch(active, /from "node:child_process"|spawnSync|execFile|execSync|spawn\(/i);
  assert.doesNotMatch(active, /\bgit\s+(?:switch|checkout|branch|commit|push|merge|rebase|reset)\b/i);
  assert.doesNotMatch(active, /\b(?:applyPatch|apply_patch)\b|\bpatch\s+-p\d\b/i);
  assert.doesNotMatch(active, /\b(?:octokit|createPullRequest|createCommitOnBranch|mergePullRequest|requestReview|rerunWorkflow)\b/i);
  assert.doesNotMatch(active, /\.github\/workflows\/[^"]*write/i);
});

test("preserves AF010, AF011, AF012, AF013A, and AF013B behavior", () => {
  const taskPackage = safeTaskPackages().packages[0];
  const codexPlan = createCodexInvocationPlan(taskPackage, {
    dryRun: true,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });
  const historyRecord = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-30T00:01:00.000Z",
    source: "agent-factory-branch-commit-pr",
    mode: "branch_commit_pr_plan",
    targetTaskId: "AF013C",
    status: "success",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
  });
  const orchestratorDir = tempDir("af013c-orchestrator-regression");
  const plannerDir = tempDir("af013c-planner-regression");
  const patchDir = tempDir("af013c-patch-regression");

  writeJson(orchestratorDir, "codex-task-packages.json", safeTaskPackages());
  writeJson(plannerDir, "codex-task-packages.json", safeTaskPackages());
  writeJson(plannerDir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(patchDir, "codex-task-packages.json", safeTaskPackages());
  writeJson(patchDir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(patchDir, "factory-planner-note.json", safePlannerNote());

  const orchestratorPlan = createAgentFactoryOrchestratorPlan({ artifactDir: orchestratorDir });
  const plannerNote = createAgentFactoryPlannerNote({ artifactDir: plannerDir });
  const patchPlan = createAgentFactoryPatchArtifactPlan({ artifactDir: patchDir });

  assert.equal(codexPlan.status, "planned");
  assert.equal(codexPlan.codexWillBeInvoked, false);
  assert.doesNotThrow(() => assertAgentFactoryRunHistoryRecordSafe(historyRecord));
  assert.equal(orchestratorPlan.status, "planned");
  assert.equal(orchestratorPlan.willExecuteCommands, false);
  assert.equal(plannerNote.status, "planned");
  assert.equal(plannerNote.actions.willRunCodex, false);
  assert.equal(patchPlan.status, "planned");
  assert.equal(patchPlan.actions.willApplyPatch, false);
});

test("AF013C focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-branch-commit-pr-adapter\.test\.mjs/);
});
