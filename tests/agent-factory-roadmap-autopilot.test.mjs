import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryRoadmapAutopilotPlanSafe,
  assertAgentFactoryRoadmapAutopilotTextSafe,
  buildAgentFactoryRoadmapAutopilotMarkdown,
  buildAgentFactoryRoadmapAutopilotSummary,
  createAgentFactoryRoadmapAutopilotPlan,
} from "../lib/agent-factory/roadmap-autopilot.ts";
import { createAgentFactoryBranchCommitPrPlan } from "../lib/agent-factory/branch-commit-pr-adapter.ts";
import { createAgentFactoryCiRepairPlan } from "../lib/agent-factory/ci-repair-loop.ts";
import { createCodexInvocationPlan } from "../lib/agent-factory/codex-invocation-adapter.ts";
import { createAgentFactoryOrchestratorPlan } from "../lib/agent-factory/factory-orchestrator.ts";
import { createAgentFactoryPlannerNote } from "../lib/agent-factory/factory-planner-notes.ts";
import { createAgentFactoryPatchArtifactPlan } from "../lib/agent-factory/patch-artifact-adapter.ts";
import {
  assertAgentFactoryRunHistoryRecordSafe,
  createAgentFactoryRunHistoryRecord,
} from "../lib/agent-factory/run-history.ts";

const DOC_PATH = path.resolve("docs/agent-factory-roadmap-autopilot.md");
const RUN_HISTORY_DOC_PATH = path.resolve("docs/agent-factory-run-history.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-roadmap-autopilot.mjs");
const LIB_PATH = path.resolve("lib/agent-factory/roadmap-autopilot.ts");
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

function safeRoadmapState(overrides = {}) {
  return {
    currentPhase: "AF015",
    lastCompletedAgentFactoryStep: "AF015",
    nextRecommendedStep: "AF016 End-to-End Factory Dogfood",
    openIssueCount: 2,
    openPrCount: 1,
    latestCiConclusion: "success",
    productBacklogAttempted: false,
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
      requestedItemId: "AF015",
      promptSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      promptCharCount: 72,
      packageSummary: {
        itemId: "AF015",
        itemTitle: "Roadmap Autopilot v1",
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
      taskId: "AF015",
      prNumber: 497,
      baseBranch: "main",
      proposedBranchName: "feat/af015-roadmap-autopilot",
    },
    boundary: {
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: "..\\worktrees\\af015-roadmap-autopilot",
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
      taskId: "AF015",
      prNumber: 497,
      baseBranch: "main",
      proposedBranchName: "feat/af015-roadmap-autopilot",
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
      taskId: "AF015",
      issueNumber: 497,
      prNumber: 497,
      baseBranch: "main",
      proposedBranchName: "feat/af015-roadmap-autopilot",
      proposedCommitTitle: "Add AF015 roadmap autopilot",
      proposedPrTitle: "[AF015] Roadmap Autopilot v1",
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

function safeCiRepairPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af014-test",
    createdAt: "2026-06-30T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    ciState: {
      latestConclusion: "success",
      observedFailureClasses: [],
    },
    failureClassifications: [],
    repairBoundary: {
      metadataOnlyPlan: true,
      requiresHumanApproval: true,
      approvalGate: "not_requested",
      willMutateWithoutApproval: false,
    },
    blockedReasons: [],
    blockedReasonCodes: [],
    ...overrides,
  };
}

function writeSafeArtifacts(dir, roadmapState = safeRoadmapState()) {
  writeJson(dir, "roadmap-state.json", roadmapState);
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-planner-note.json", safePlannerNote());
  writeJson(dir, "factory-patch-artifact-plan.json", safePatchArtifactPlan());
  writeJson(dir, "branch-commit-pr-plan.json", safeBranchCommitPrPlan());
  writeJson(dir, "ci-repair-plan.json", safeCiRepairPlan());
  writeJson(dir, "github-issue-snapshot.json", {
    issues: [
      { number: 497, state: "open", title: "[AF015] Roadmap Autopilot v1" },
      { number: 498, state: "closed", title: "Closed issue metadata" },
    ],
  });
  writeJson(dir, "github-pr-snapshot.json", {
    pullRequests: [
      { number: 496, state: "closed", title: "[AF014-V] CI Repair Runtime Verification" },
      { number: 497, state: "open", title: "[AF015] Roadmap Autopilot v1" },
    ],
  });
  writeJson(dir, "ci-workflow-runs.json", {
    runs: [
      { name: "Fast CI", conclusion: "success" },
    ],
  });
  const historyRecord = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-30T00:00:00.000Z",
    source: "agent-factory-ci-repair",
    mode: "ci_repair_plan",
    targetTaskId: roadmapState.lastCompletedAgentFactoryStep ?? "AF015",
    targetPrNumber: 496,
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

function candidateById(plan, id) {
  return plan.candidates.find((entry) => entry.id === id);
}

test("AF015 docs, npm script, and CLI exist with report-only roadmap scope", () => {
  const docs = readNormalized(DOC_PATH);
  const runHistoryDocs = readNormalized(RUN_HISTORY_DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:roadmap-autopilot/);
  assert.match(script, /AF015 v1 is metadata-only/);
  assert.match(docs, /AF015 v1 does not:/);
  assert.match(docs, /Candidate Ranking/);
  assert.match(docs, /Approval Gate Behavior/);
  assert.match(docs, /Data Boundary/);
  assert.match(docs, /AF016 End-to-End Factory Dogfood/);
  assert.match(docs, /Product backlog remains deferred/);
  assert.match(runHistoryDocs, /agent-factory:roadmap-autopilot/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("creates metadata-only planned roadmap autopilot plan from synthetic local state", () => {
  const dir = tempDir("af015-planned");
  writeSafeArtifacts(dir);

  const plan = createAgentFactoryRoadmapAutopilotPlan({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });
  const markdown = buildAgentFactoryRoadmapAutopilotMarkdown(plan);
  const summary = buildAgentFactoryRoadmapAutopilotSummary(plan);

  assert.equal(plan.status, "planned");
  assert.equal(plan.reportOnly, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.roadmapState.currentPhase, "AF015");
  assert.equal(plan.roadmapState.latestCiConclusion, "success");
  assert.equal(plan.selectedCandidate.id, "af016-end-to-end-factory-dogfood");
  assert.equal(plan.proposedNextWork.issueTitle, "[AF016] End-to-End Factory Dogfood");
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.equal(plan.autopilotBoundary.willMutateWithoutApproval, false);
  assert.match(markdown, /AF015 Roadmap Autopilot/);
  assert.match(summary, /Codex invoked: no/);
  assert.doesNotThrow(() => assertAgentFactoryRoadmapAutopilotPlanSafe(plan));
});

test("recommends AF015 when last completed step is AF014-V", () => {
  const dir = tempDir("af015-after-af014v");
  writeSafeArtifacts(dir, safeRoadmapState({
    currentPhase: "agent_factory",
    lastCompletedAgentFactoryStep: "AF014-V",
    nextRecommendedStep: "AF015 Roadmap Autopilot",
  }));

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(plan.selectedCandidate.id, "af015-roadmap-autopilot");
  assert.equal(plan.selectedCandidate.label, "AF015 Roadmap Autopilot v1");
  assert.ok(plan.selectedCandidate.reasonCodes.includes("next_agent_factory_layer"));
});

test("recommends AF016 after AF015 current step has no blockers", () => {
  const dir = tempDir("af015-current");
  writeSafeArtifacts(dir, safeRoadmapState({
    currentPhase: "AF015",
    lastCompletedAgentFactoryStep: "AF015",
    latestCiConclusion: "success",
  }));

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(plan.selectedCandidate.id, "af016-end-to-end-factory-dogfood");
  assert.ok(plan.selectedCandidate.reasonCodes.includes("ready_for_af016_dogfood"));
});

test("defers product backlog before AF016 with reason code finish_agent_factory_before_product_backlog", () => {
  const dir = tempDir("af015-product-deferred");
  writeSafeArtifacts(dir, safeRoadmapState({
    currentPhase: "product backlog",
    lastCompletedAgentFactoryStep: "AF015",
    nextRecommendedStep: "product curriculum backlog",
    productBacklogAttempted: true,
  }));

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });
  const productCandidate = candidateById(plan, "product-backlog-deferred-until-af016");

  assert.equal(productCandidate.status, "deferred");
  assert.ok(productCandidate.reasonCodes.includes("finish_agent_factory_before_product_backlog"));
  assert.ok(productCandidate.reasonCodes.includes("product_backlog_deferred"));
});

test("ranks unresolved CI repair above product work", () => {
  const dir = tempDir("af015-ci-first");
  writeSafeArtifacts(dir, safeRoadmapState({
    currentPhase: "product backlog",
    lastCompletedAgentFactoryStep: "AF015",
    latestCiConclusion: "failure",
    productBacklogAttempted: true,
  }));
  writeJson(dir, "ci-repair-plan.json", safeCiRepairPlan({
    status: "blocked",
    ciState: {
      latestConclusion: "failure",
      observedFailureClasses: ["typecheck"],
    },
    blockedReasonCodes: ["typecheck_failed"],
  }));

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(plan.candidates[0].id, "ci-repair-follow-up");
  assert.equal(plan.selectedCandidate.id, "ci-repair-follow-up");
  assert.ok(plan.selectedCandidate.reasonCodes.includes("unresolved_ci_repair"));
  assert.equal(candidateById(plan, "product-backlog-deferred-until-af016").status, "deferred");
});

test("blocks or defers unknown roadmap state safely", () => {
  const dir = tempDir("af015-unknown");

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_roadmap_state"));
  assert.equal(plan.candidates[0].kind, "unknown");
  assert.equal(plan.proposedNextWork.issueTitle, null);
});

test("blocks on missing approval gate", () => {
  const dir = tempDir("af015-missing-approval");
  writeSafeArtifacts(dir);

  const plan = createAgentFactoryRoadmapAutopilotPlan({
    artifactDir: dir,
    approvalGate: "missing",
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_human_approval"));
  assert.equal(plan.proposedNextWork.issueTitle, null);
});

test("blocks on failed-closed approval gate", () => {
  const dir = tempDir("af015-failed-closed");
  writeSafeArtifacts(dir);

  const plan = createAgentFactoryRoadmapAutopilotPlan({
    artifactDir: dir,
    approvalGate: "failed_closed",
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("approval_failed_closed"));
});

test("approvalGate approved still produces metadata-only plan and does not execute mutation in v1", () => {
  const dir = tempDir("af015-approved");
  writeSafeArtifacts(dir);

  const plan = createAgentFactoryRoadmapAutopilotPlan({
    artifactDir: dir,
    approvalGate: "approved",
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.autopilotBoundary.approvalGate, "approved");
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.equal(plan.autopilotBoundary.willMutateWithoutApproval, false);
  assert.equal(plan.proposedNextWork.issueTitle, "[AF016] End-to-End Factory Dogfood");
});

test("fails closed on unsafe keys", () => {
  const dir = tempDir("af015-unsafe-keys");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  for (const key of [
    "rawIssueBody",
    "issueBody",
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
      () => assertAgentFactoryRoadmapAutopilotPlanSafe(unsafe),
      /forbidden key/i,
      `expected forbidden key rejection for ${key}`,
    );
  }
});

test("fails closed on secret-like values", () => {
  const dir = tempDir("af015-secret");
  writeSafeArtifacts(dir);
  writeJson(dir, "roadmap-state.json", safeRoadmapState({
    currentPhase: "ghp_should_not_escape12345",
  }));

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("unsafe_metadata_artifact"));
  assert.equal(serialized.includes("ghp_should_not_escape12345"), false);
});

test("fails closed on raw issue body, PR body, comments, patch, diff, learner, OCR, provider, billing, auth, and payment sentinels", () => {
  for (const line of [
    "rawIssueBody: unsafe",
    "issueBody: unsafe",
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
      () => assertAgentFactoryRoadmapAutopilotTextSafe(line, "unsafe AF015 text"),
      /raw-content|credential|secret-like/i,
      `expected unsafe text rejection for ${line}`,
    );
  }
});

test("CLI writes JSON, Markdown, summary artifacts", () => {
  const dir = tempDir("af015-cli");
  const jsonPath = path.join(dir, "roadmap-autopilot-plan.json");
  const markdownPath = path.join(dir, "roadmap-autopilot-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeSafeArtifacts(dir);

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
    "--current-phase",
    "AF015",
    "--last-completed-step",
    "AF015",
    "--latest-ci-conclusion",
    "success",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).source.script, "agent-factory-roadmap-autopilot");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF015 Roadmap Autopilot/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Issue created: no/);
});

test("CLI appends AF011 run history", () => {
  const dir = tempDir("af015-cli-history");
  const jsonPath = path.join(dir, "roadmap-autopilot-plan.json");
  const markdownPath = path.join(dir, "roadmap-autopilot-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeSafeArtifacts(dir);

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
  assert.match(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /agent-factory-roadmap-autopilot/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /raw issue body/i);
});

test("active AF015 code does not run shell commands", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");

  assert.doesNotMatch(active, /from "node:child_process"|spawnSync|execFile|execSync|spawn\(/i);
});

test("active AF015 code does not invoke Codex", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
});

test("active AF015 code does not apply patches", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");

  assert.doesNotMatch(active, /\b(?:applyPatch|apply_patch)\b|\bpatch\s+-p\d\b/i);
});

test("active AF015 code does not edit source files", () => {
  const dir = tempDir("af015-no-edit");
  writeSafeArtifacts(dir);

  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(plan.actions.willEditWorkingTree, false);
  assert.equal(plan.actions.willApplyPatch, false);
});

test("active AF015 code does not create issues", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");
  const dir = tempDir("af015-no-issue");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.doesNotMatch(active, /\b(?:octokit|createIssue|create_issue)\b/i);
  assert.equal(plan.actions.willCreateIssue, false);
});

test("active AF015 code does not create branch, commit, push, or PR", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");
  const dir = tempDir("af015-no-branch");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.doesNotMatch(active, /\bgit\s+(?:switch|checkout|branch|commit|push|merge|rebase|reset)\b/i);
  assert.doesNotMatch(active, /\b(?:createPullRequest|createCommitOnBranch|mergePullRequest|requestReview)\b/i);
  assert.equal(plan.actions.willCreateBranch, false);
  assert.equal(plan.actions.willCreateCommit, false);
  assert.equal(plan.actions.willPush, false);
  assert.equal(plan.actions.willCreateOrUpdatePr, false);
});

test("active AF015 code does not rerun workflows", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");
  const dir = tempDir("af015-no-rerun");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.doesNotMatch(active, /\/rerun\b|workflow_dispatch/i);
  assert.equal(plan.actions.willRerunWorkflow, false);
});

test("active AF015 code does not merge or rebase", () => {
  const dir = tempDir("af015-no-merge");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(plan.actions.willMergeOrRebase, false);
});

test("preserves AF010 behavior", () => {
  const codexPlan = createCodexInvocationPlan({
    itemId: "AF010",
    itemTitle: "Codex Invocation Adapter v1",
    repository: "chachathecat/inverge",
    branchName: "feat/af010-codex-invocation-adapter",
    codexPrompt: "Create metadata-only invocation plan.",
    validationCommands: ["npm.cmd run typecheck"],
  }, {
    dryRun: true,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });

  assert.equal(codexPlan.status, "planned");
  assert.equal(codexPlan.codexWillBeInvoked, false);
});

test("preserves AF011 behavior", () => {
  const historyRecord = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-30T00:01:00.000Z",
    source: "agent-factory-roadmap-autopilot",
    mode: "roadmap_autopilot_plan",
    targetTaskId: "af016-end-to-end-factory-dogfood",
    status: "success",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
  });

  assert.doesNotThrow(() => assertAgentFactoryRunHistoryRecordSafe(historyRecord));
});

test("preserves AF012 behavior", () => {
  const dir = tempDir("af015-orchestrator-regression");
  writeJson(dir, "codex-task-packages.json", {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: ["AF012"],
    packages: [
      {
        itemId: "AF012",
        itemTitle: "Factory Orchestrator v1",
        repository: "chachathecat/inverge",
        branchName: "feat/af012-factory-orchestrator",
        codexPrompt: "raw prompt text must not be rendered",
        validationCommands: ["npm.cmd run typecheck"],
      },
    ],
  });

  const orchestratorPlan = createAgentFactoryOrchestratorPlan({ artifactDir: dir });

  assert.equal(orchestratorPlan.status, "planned");
  assert.equal(orchestratorPlan.willExecuteCommands, false);
});

test("preserves AF013A behavior", () => {
  const dir = tempDir("af015-planner-regression");
  writeJson(dir, "codex-task-packages.json", {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: ["AF013A"],
    packages: [
      {
        itemId: "AF013A",
        itemTitle: "Factory Planner Notes",
        repository: "chachathecat/inverge",
        branchName: "feat/af013a-planner-notes",
        codexPrompt: "raw prompt text must not be rendered",
        validationCommands: ["npm.cmd run typecheck"],
      },
    ],
  });
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan({
    taskPackage: {
      requestedItemId: "AF013A",
      packageSummary: {
        itemId: "AF013A",
        itemTitle: "Factory Planner Notes",
      },
    },
  }));

  const plannerNote = createAgentFactoryPlannerNote({ artifactDir: dir });

  assert.equal(plannerNote.status, "planned");
  assert.equal(plannerNote.actions.willRunCodex, false);
});

test("preserves AF013B behavior", () => {
  const dir = tempDir("af015-patch-regression");
  writeJson(dir, "codex-task-packages.json", {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: ["AF013B"],
    packages: [
      {
        itemId: "AF013B",
        itemTitle: "Patch Artifact Adapter",
        repository: "chachathecat/inverge",
        branchName: "feat/af013b-patch-artifact",
        codexPrompt: "raw prompt text must not be rendered",
        validationCommands: ["npm.cmd run typecheck"],
      },
    ],
  });
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan({
    taskPackage: {
      requestedItemId: "AF013B",
      packageSummary: {
        itemId: "AF013B",
        itemTitle: "Patch Artifact Adapter",
      },
    },
  }));
  writeJson(dir, "factory-planner-note.json", safePlannerNote({
    target: {
      taskId: "AF013B",
      prNumber: 487,
      baseBranch: "main",
      proposedBranchName: "feat/af013b-patch-artifact",
    },
  }));

  const patchPlan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(patchPlan.status, "planned");
  assert.equal(patchPlan.actions.willApplyPatch, false);
});

test("preserves AF013C behavior", () => {
  const dir = tempDir("af015-branch-regression");
  writeJson(dir, "codex-task-packages.json", {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: ["AF013C"],
    packages: [
      {
        itemId: "AF013C",
        itemTitle: "Branch Commit PR Adapter",
        repository: "chachathecat/inverge",
        branchName: "feat/af013c-branch-commit-pr",
        issueNumber: 491,
        codexPrompt: "raw prompt text must not be rendered",
        validationCommands: ["npm.cmd run typecheck"],
      },
    ],
  });
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan({
    taskPackage: {
      requestedItemId: "AF013C",
      packageSummary: {
        itemId: "AF013C",
        itemTitle: "Branch Commit PR Adapter",
      },
    },
  }));
  writeJson(dir, "factory-planner-note.json", safePlannerNote({
    target: {
      taskId: "AF013C",
      prNumber: null,
      baseBranch: "main",
      proposedBranchName: "feat/af013c-branch-commit-pr",
    },
  }));
  writeJson(dir, "factory-patch-artifact-plan.json", safePatchArtifactPlan({
    target: {
      taskId: "AF013C",
      prNumber: null,
      baseBranch: "main",
      proposedBranchName: "feat/af013c-branch-commit-pr",
    },
  }));

  const branchPlan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(branchPlan.status, "planned");
  assert.equal(branchPlan.actions.willCreateCommit, false);
});

test("preserves AF014 behavior", () => {
  const dir = tempDir("af015-ci-regression");
  writeJson(dir, "ci-log-summary.json", {
    failures: [
      {
        workflowName: "Fast CI",
        jobName: "node-tests",
        stepName: "npm.cmd run typecheck",
        conclusion: "failure",
        reasonCode: "typecheck_failed",
      },
    ],
  });

  const ciPlan = createAgentFactoryCiRepairPlan({ artifactDir: dir });

  assert.equal(ciPlan.status, "planned");
  assert.equal(ciPlan.actions.willRerunWorkflow, false);
});

test("AF015 focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-roadmap-autopilot\.test\.mjs/);
});
