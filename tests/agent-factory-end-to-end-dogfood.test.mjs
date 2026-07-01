import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryEndToEndDogfoodPlanSafe,
  assertAgentFactoryEndToEndDogfoodTextSafe,
  buildAgentFactoryEndToEndDogfoodMarkdown,
  buildAgentFactoryEndToEndDogfoodSummary,
  createAgentFactoryEndToEndDogfoodPlan,
} from "../lib/agent-factory/end-to-end-dogfood.ts";
import { createAgentFactoryBranchCommitPrPlan } from "../lib/agent-factory/branch-commit-pr-adapter.ts";
import { createAgentFactoryCiRepairPlan } from "../lib/agent-factory/ci-repair-loop.ts";
import { createCodexInvocationPlan } from "../lib/agent-factory/codex-invocation-adapter.ts";
import { createAgentFactoryOrchestratorPlan } from "../lib/agent-factory/factory-orchestrator.ts";
import { createAgentFactoryPlannerNote } from "../lib/agent-factory/factory-planner-notes.ts";
import { createAgentFactoryPatchArtifactPlan } from "../lib/agent-factory/patch-artifact-adapter.ts";
import { createAgentFactoryRoadmapAutopilotPlan } from "../lib/agent-factory/roadmap-autopilot.ts";
import {
  assertAgentFactoryRunHistoryRecordSafe,
  createAgentFactoryRunHistoryRecord,
} from "../lib/agent-factory/run-history.ts";

const DOC_PATH = path.resolve("docs/agent-factory-end-to-end-dogfood.md");
const RUN_HISTORY_DOC_PATH = path.resolve("docs/agent-factory-run-history.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-end-to-end-dogfood.mjs");
const LIB_PATH = path.resolve("lib/agent-factory/end-to-end-dogfood.ts");
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
    selectedItemIds: ["AF016"],
    packages: [
      {
        itemId: "AF016",
        itemTitle: "End-to-End Factory Dogfood v1",
        repository: "chachathecat/inverge",
        branchName: "feat/af016-end-to-end-factory-dogfood",
        issueNumber: 499,
        validationCommands: [
          "npm.cmd run typecheck",
          "npm.cmd run lint",
          "npm.cmd test",
          "npm.cmd run build",
          "git diff --check",
        ],
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
      requestedItemId: "AF016",
      promptSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      promptCharCount: 120,
      packageSummary: {
        itemId: "AF016",
        itemTitle: "End-to-End Factory Dogfood v1",
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

function safeOrchestratorPlan(overrides = {}) {
  return {
    version: 1,
    orchestrator: "af012-factory-orchestrator",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    willExecuteCommands: false,
    codexWillBeInvoked: false,
    mutatesCode: false,
    mutatesGitHub: false,
    nextAction: {
      code: "review_run_history",
    },
    dataBoundary: {
      inspectedArtifactCount: 8,
    },
    ...overrides,
  };
}

function safePlannerNote(overrides = {}) {
  return {
    version: 1,
    noteId: "af013a-test",
    createdAt: "2026-07-01T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    target: {
      taskId: "AF016",
      prNumber: 499,
      baseBranch: "main",
      proposedBranchName: "feat/af016-end-to-end-factory-dogfood",
    },
    boundary: {
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: "..\\worktrees\\af016-end-to-end-factory-dogfood",
      maxChangedFiles: 8,
      maxDiffBytes: 60000,
      requiresHumanApproval: true,
      approvalGate: "not_requested",
    },
    blockedReasons: [],
    blockedReasonCodes: [],
    ...overrides,
  };
}

function safePatchArtifactPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af013b-test",
    createdAt: "2026-07-01T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    target: {
      taskId: "AF016",
      prNumber: 499,
      baseBranch: "main",
      proposedBranchName: "feat/af016-end-to-end-factory-dogfood",
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
    blockedReasons: [],
    blockedReasonCodes: [],
    ...overrides,
  };
}

function safeBranchCommitPrPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af013c-test",
    createdAt: "2026-07-01T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    target: {
      taskId: "AF016",
      issueNumber: 499,
      prNumber: 499,
      baseBranch: "main",
      proposedBranchName: "feat/af016-end-to-end-factory-dogfood",
      proposedCommitTitle: "Add AF016 end-to-end factory dogfood",
      proposedPrTitle: "[AF016] End-to-End Factory Dogfood v1",
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
    blockedReasons: [],
    blockedReasonCodes: [],
    ...overrides,
  };
}

function safeCiRepairPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af014-test",
    createdAt: "2026-07-01T00:00:00.000Z",
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

function safeRoadmapAutopilotPlan(overrides = {}) {
  return {
    version: 1,
    planId: "af015-test",
    createdAt: "2026-07-01T00:00:00.000Z",
    status: "planned",
    reportOnly: true,
    dryRun: true,
    roadmapState: {
      currentPhase: "AF015",
      lastCompletedAgentFactoryStep: "AF015",
      nextRecommendedStep: "AF016 End-to-End Factory Dogfood",
      latestCiConclusion: "success",
    },
    selectedCandidate: {
      id: "af016-end-to-end-factory-dogfood",
      label: "AF016 End-to-End Factory Dogfood",
      risk: "low",
      reasonCodes: ["ready_for_af016_dogfood"],
    },
    proposedNextWork: {
      issueTitle: "[AF016] End-to-End Factory Dogfood",
      issueBodyPreview: "Generated-safe issue preview for AF016.",
      branchName: "feat/af016-end-to-end-factory-dogfood",
      worktreeName: "exam-coach-af016",
      prTitle: "[AF016] End-to-End Factory Dogfood v1",
      prBodyPreview: "Generated-safe PR preview. Closes #499.",
      codexPromptPreview: "Generated-safe Codex prompt preview for AF016.",
      validationCommands: ["npm.cmd test"],
    },
    actions: {
      willRunCodex: false,
      willRunShellCommands: false,
      willApplyPatch: false,
      willEditWorkingTree: false,
      willCreateIssue: false,
      willCreateBranch: false,
      willCreateCommit: false,
      willPush: false,
      willCreateOrUpdatePr: false,
      willRerunWorkflow: false,
      willMergeOrRebase: false,
    },
    blockedReasons: [],
    blockedReasonCodes: [],
    ...overrides,
  };
}

function writeSafeArtifacts(
  dir,
  {
    taskPackages = safeTaskPackages(),
    codexInvocationPlan = safeCodexInvocationPlan(),
    orchestratorPlan = safeOrchestratorPlan(),
    plannerNote = safePlannerNote(),
    patchArtifactPlan = safePatchArtifactPlan(),
    branchCommitPrPlan = safeBranchCommitPrPlan(),
    ciRepairPlan = safeCiRepairPlan(),
    roadmapAutopilotPlan = safeRoadmapAutopilotPlan(),
    runHistory = true,
  } = {},
) {
  if (taskPackages !== null) writeJson(dir, "codex-task-packages.json", taskPackages);
  if (codexInvocationPlan !== null) writeJson(dir, "codex-invocation-plan.json", codexInvocationPlan);
  if (orchestratorPlan !== null) writeJson(dir, "factory-orchestrator-plan.json", orchestratorPlan);
  if (plannerNote !== null) writeJson(dir, "factory-planner-note.json", plannerNote);
  if (patchArtifactPlan !== null) writeJson(dir, "factory-patch-artifact-plan.json", patchArtifactPlan);
  if (branchCommitPrPlan !== null) writeJson(dir, "branch-commit-pr-plan.json", branchCommitPrPlan);
  if (ciRepairPlan !== null) writeJson(dir, "ci-repair-plan.json", ciRepairPlan);
  if (roadmapAutopilotPlan !== null) writeJson(dir, "roadmap-autopilot-plan.json", roadmapAutopilotPlan);

  if (runHistory) {
    const historyRecord = createAgentFactoryRunHistoryRecord({
      timestamp: "2026-07-01T00:00:00.000Z",
      source: "agent-factory-roadmap-autopilot",
      mode: "roadmap_autopilot_plan",
      targetTaskId: "af016-end-to-end-factory-dogfood",
      targetPrNumber: 498,
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

test("AF016 docs, npm script, and CLI exist with metadata-only end-to-end scope", () => {
  const docs = readNormalized(DOC_PATH);
  const runHistoryDocs = readNormalized(RUN_HISTORY_DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:end-to-end-dogfood/);
  assert.match(script, /AF016 v1 is metadata-only/);
  assert.match(docs, /AF016 remains metadata-only/);
  assert.match(docs, /Required local artifacts/);
  assert.match(docs, /Safety evidence/);
  assert.match(docs, /Data boundary/);
  assert.match(docs, /AF017 Approved Execution Adapter/);
  assert.match(runHistoryDocs, /agent-factory:end-to-end-dogfood/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("creates metadata-only planned end-to-end dogfood plan when AF010 through AF015 local metadata artifacts exist", () => {
  const dir = tempDir("af016-planned");
  writeSafeArtifacts(dir);

  const plan = createAgentFactoryEndToEndDogfoodPlan({
    artifactDir: dir,
    now: new Date("2026-07-01T00:00:00.000Z"),
  });
  const markdown = buildAgentFactoryEndToEndDogfoodMarkdown(plan);
  const summary = buildAgentFactoryEndToEndDogfoodSummary(plan);
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "planned");
  assert.equal(plan.reportOnly, true);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.readiness.completePlanningChain, true);
  assert.equal(plan.readiness.availableRequiredArtifactCount, 8);
  assert.equal(plan.chain.codexInvocation.ready, true);
  assert.equal(plan.chain.runHistory.appendEvidence, "present");
  assert.equal(plan.selectedNextWork.id, "af016-end-to-end-factory-dogfood");
  assert.equal(plan.selectedNextWork.previewDigests.issuePreviewSha256.length, 64);
  assert.equal(Object.values(plan.actions).every((value) => value === false), true);
  assert.match(markdown, /AF016 End-to-End Factory Dogfood/);
  assert.match(summary, /Source files edited by AF016: no/);
  assert.equal(serialized.includes("Generated-safe issue preview for AF016."), false);
  assert.equal(serialized.includes("Generated-safe Codex prompt preview for AF016."), false);
  assert.doesNotThrow(() => assertAgentFactoryEndToEndDogfoodPlanSafe(plan));
});

test("blocks when task package is missing", () => {
  const dir = tempDir("af016-missing-task");
  writeSafeArtifacts(dir, { taskPackages: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_task_package"));
});

test("blocks when AF010 invocation plan is missing", () => {
  const dir = tempDir("af016-missing-codex");
  writeSafeArtifacts(dir, { codexInvocationPlan: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"));
});

test("blocks when AF012 orchestrator plan is missing", () => {
  const dir = tempDir("af016-missing-orchestrator");
  writeSafeArtifacts(dir, { orchestratorPlan: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_orchestrator_plan"));
});

test("blocks when AF013A planner note is missing", () => {
  const dir = tempDir("af016-missing-planner");
  writeSafeArtifacts(dir, { plannerNote: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_planner_note"));
});

test("blocks when AF013A planner note is blocked", () => {
  const dir = tempDir("af016-blocked-planner");
  writeSafeArtifacts(dir, {
    plannerNote: safePlannerNote({
      status: "blocked",
      blockedReasonCodes: ["approval_failed_closed"],
    }),
  });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("planner_note_blocked"));
});

test("blocks when AF013B patch artifact plan is missing", () => {
  const dir = tempDir("af016-missing-patch");
  writeSafeArtifacts(dir, { patchArtifactPlan: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_patch_artifact_plan"));
});

test("blocks when AF013B patch artifact plan is blocked", () => {
  const dir = tempDir("af016-blocked-patch");
  writeSafeArtifacts(dir, {
    patchArtifactPlan: safePatchArtifactPlan({
      status: "blocked",
      blockedReasonCodes: ["missing_planner_note"],
    }),
  });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("patch_artifact_plan_blocked"));
});

test("blocks when AF013C branch/commit/PR plan is missing", () => {
  const dir = tempDir("af016-missing-branch");
  writeSafeArtifacts(dir, { branchCommitPrPlan: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_branch_commit_pr_plan"));
});

test("blocks when AF013C branch/commit/PR plan is blocked", () => {
  const dir = tempDir("af016-blocked-branch");
  writeSafeArtifacts(dir, {
    branchCommitPrPlan: safeBranchCommitPrPlan({
      status: "blocked",
      blockedReasonCodes: ["missing_human_approval"],
    }),
  });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("branch_commit_pr_plan_blocked"));
});

test("blocks when AF014 CI repair plan is missing", () => {
  const dir = tempDir("af016-missing-ci");
  writeSafeArtifacts(dir, { ciRepairPlan: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_ci_repair_plan"));
});

test("blocks when AF014 CI repair plan is blocked", () => {
  const dir = tempDir("af016-blocked-ci");
  writeSafeArtifacts(dir, {
    ciRepairPlan: safeCiRepairPlan({
      status: "blocked",
      blockedReasonCodes: ["typecheck_failed"],
    }),
  });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("ci_repair_plan_blocked"));
});

test("blocks when AF015 roadmap autopilot plan is missing", () => {
  const dir = tempDir("af016-missing-roadmap");
  writeSafeArtifacts(dir, { roadmapAutopilotPlan: null });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_roadmap_autopilot_plan"));
});

test("blocks when AF015 roadmap autopilot plan is blocked", () => {
  const dir = tempDir("af016-blocked-roadmap");
  writeSafeArtifacts(dir, {
    roadmapAutopilotPlan: safeRoadmapAutopilotPlan({
      status: "blocked",
      blockedReasonCodes: ["missing_roadmap_state"],
    }),
  });
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("roadmap_autopilot_plan_blocked"));
});

test("fails closed on unsafe keys", () => {
  const dir = tempDir("af016-unsafe-keys");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  for (const key of [
    "rawIssueBody",
    "issueBody",
    "rawPrBody",
    "rawComments",
    "rawPrompt",
    "rawTaskPackagePrompt",
    "rawPatch",
    "rawDiff",
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
      () => assertAgentFactoryEndToEndDogfoodPlanSafe(unsafe),
      /forbidden key/i,
      `expected forbidden key rejection for ${key}`,
    );
  }

  writeJson(dir, "roadmap-autopilot-plan.json", {
    ...safeRoadmapAutopilotPlan(),
    rawIssueBody: "unsafe issue body must not escape",
  });
  const blocked = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });
  const serialized = JSON.stringify(blocked);

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockedReasonCodes.includes("unsafe_metadata_artifact"));
  assert.equal(serialized.includes("unsafe issue body must not escape"), false);
  assert.equal(serialized.includes("rawIssueBody"), false);
});

test("fails closed on secret-like values", () => {
  const dir = tempDir("af016-secret");
  writeSafeArtifacts(dir, {
    orchestratorPlan: safeOrchestratorPlan({
      nextAction: {
        code: "ghp_should_not_escape12345",
      },
    }),
  });

  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("unsafe_metadata_artifact"));
  assert.equal(serialized.includes("ghp_should_not_escape12345"), false);
});

test("fails closed on raw issue body / raw PR body / raw comments / raw prompt / raw task-package prompt / raw patch / raw diff / raw learner answer / OCR / provider / billing / auth / payment sentinels", () => {
  for (const line of [
    "rawIssueBody: unsafe",
    "issueBody: unsafe",
    "rawPrBody: unsafe",
    "commentBody: unsafe",
    "rawPrompt: unsafe",
    "rawTaskPackagePrompt: unsafe",
    "rawPatch: unsafe",
    "rawDiff: unsafe",
    "rawLearnerAnswer: unsafe",
    "ocrText: unsafe",
    "providerPayload: unsafe",
    "billingData: unsafe",
    "authData: unsafe",
    "paymentData: unsafe",
  ]) {
    assert.throws(
      () => assertAgentFactoryEndToEndDogfoodTextSafe(line, "unsafe AF016 text"),
      /raw-content|credential|secret-like/i,
      `expected unsafe text rejection for ${line}`,
    );
  }
});

test("CLI writes JSON, Markdown, summary artifacts", () => {
  const dir = tempDir("af016-cli");
  const jsonPath = path.join(dir, "end-to-end-factory-dogfood-plan.json");
  const markdownPath = path.join(dir, "end-to-end-factory-dogfood-plan.md");
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
    "--task-id",
    "AF016",
    "--issue-number",
    "499",
    "--pr-number",
    "499",
    "--base-branch",
    "main",
    "--head-sha",
    "0123456789abcdef",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).source.script, "agent-factory-end-to-end-dogfood");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF016 End-to-End Factory Dogfood/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Source files edited by AF016: no/);
});

test("CLI appends AF011 run history", () => {
  const dir = tempDir("af016-cli-history");
  const jsonPath = path.join(dir, "end-to-end-factory-dogfood-plan.json");
  const markdownPath = path.join(dir, "end-to-end-factory-dogfood-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeSafeArtifacts(dir, { runHistory: false });

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
  const historyText = fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8");

  assert.equal(result.status, 0, result.stderr);
  assert.match(historyText, /agent-factory-end-to-end-dogfood/);
  assert.doesNotMatch(historyText, /Generated-safe issue preview for AF016/);
  assert.match(fs.readFileSync(path.join(dir, "run-history.md"), "utf8"), /end_to_end_factory_dogfood_plan/);
});

test("active AF016 code does not run shell commands", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");

  assert.doesNotMatch(active, /from "node:child_process"|spawnSync|execFile|execSync|spawn\(/i);
});

test("active AF016 code does not invoke Codex", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
});

test("active AF016 code does not apply patches", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");

  assert.doesNotMatch(active, /\b(?:applyPatch|apply_patch)\b|\bpatch\s+-p\d\b/i);
});

test("active AF016 code does not edit source files", () => {
  const dir = tempDir("af016-no-edit");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.equal(plan.actions.willEditWorkingTree, false);
  assert.equal(plan.actions.willApplyPatch, false);
});

test("active AF016 code does not create issues", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");
  const dir = tempDir("af016-no-issue");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.doesNotMatch(active, /\b(?:octokit|createIssue|create_issue)\b/i);
  assert.equal(plan.actions.willCreateIssue, false);
});

test("active AF016 code does not create branch/commit/push/PR", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");
  const dir = tempDir("af016-no-branch");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.doesNotMatch(active, /\bgit\s+(?:switch|checkout|branch|commit|push|merge|rebase|reset)\b/i);
  assert.doesNotMatch(active, /\b(?:createPullRequest|createCommitOnBranch|mergePullRequest|requestReview)\b/i);
  assert.equal(plan.actions.willCreateBranch, false);
  assert.equal(plan.actions.willCreateCommit, false);
  assert.equal(plan.actions.willPush, false);
  assert.equal(plan.actions.willCreateOrUpdatePr, false);
});

test("active AF016 code does not rerun workflows", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(LIB_PATH),
  ].join("\n");
  const dir = tempDir("af016-no-rerun");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

  assert.doesNotMatch(active, /\/rerun\b|workflow_dispatch/i);
  assert.equal(plan.actions.willRerunWorkflow, false);
});

test("active AF016 code does not merge or rebase", () => {
  const dir = tempDir("af016-no-merge");
  writeSafeArtifacts(dir);
  const plan = createAgentFactoryEndToEndDogfoodPlan({ artifactDir: dir });

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
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(codexPlan.status, "planned");
  assert.equal(codexPlan.codexWillBeInvoked, false);
});

test("preserves AF011 behavior", () => {
  const historyRecord = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-07-01T00:01:00.000Z",
    source: "agent-factory-end-to-end-dogfood",
    mode: "end_to_end_factory_dogfood_plan",
    targetTaskId: "AF016",
    status: "success",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
  });

  assert.doesNotThrow(() => assertAgentFactoryRunHistoryRecordSafe(historyRecord));
});

test("preserves AF012 behavior", () => {
  const dir = tempDir("af016-orchestrator-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());

  const orchestratorPlan = createAgentFactoryOrchestratorPlan({ artifactDir: dir });

  assert.equal(orchestratorPlan.status, "planned");
  assert.equal(orchestratorPlan.willExecuteCommands, false);
});

test("preserves AF013A behavior", () => {
  const dir = tempDir("af016-planner-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());

  const plannerNote = createAgentFactoryPlannerNote({ artifactDir: dir });

  assert.equal(plannerNote.status, "planned");
  assert.equal(plannerNote.actions.willRunCodex, false);
});

test("preserves AF013B behavior", () => {
  const dir = tempDir("af016-patch-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-planner-note.json", safePlannerNote());

  const patchPlan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(patchPlan.status, "planned");
  assert.equal(patchPlan.actions.willApplyPatch, false);
});

test("preserves AF013C behavior", () => {
  const dir = tempDir("af016-branch-regression");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-planner-note.json", safePlannerNote());
  writeJson(dir, "factory-patch-artifact-plan.json", safePatchArtifactPlan());

  const branchPlan = createAgentFactoryBranchCommitPrPlan({ artifactDir: dir });

  assert.equal(branchPlan.status, "planned");
  assert.equal(branchPlan.actions.willCreateCommit, false);
});

test("preserves AF014 behavior", () => {
  const dir = tempDir("af016-ci-regression");
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

test("preserves AF015 behavior", () => {
  const dir = tempDir("af016-roadmap-regression");
  writeJson(dir, "roadmap-state.json", {
    currentPhase: "AF015",
    lastCompletedAgentFactoryStep: "AF015",
    nextRecommendedStep: "AF016 End-to-End Factory Dogfood",
    latestCiConclusion: "success",
    openIssueCount: 1,
    openPrCount: 0,
  });

  const roadmapPlan = createAgentFactoryRoadmapAutopilotPlan({ artifactDir: dir });

  assert.equal(roadmapPlan.status, "planned");
  assert.equal(roadmapPlan.selectedCandidate.id, "af016-end-to-end-factory-dogfood");
  assert.equal(roadmapPlan.actions.willCreateIssue, false);
});

test("AF016 focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-end-to-end-dogfood\.test\.mjs/);
});
