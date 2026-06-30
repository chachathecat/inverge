import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryPatchArtifactPlanSafe,
  assertAgentFactoryPatchArtifactTextSafe,
  buildAgentFactoryPatchArtifactMarkdown,
  buildAgentFactoryPatchArtifactSummary,
  createAgentFactoryPatchArtifactPlan,
} from "../lib/agent-factory/patch-artifact-adapter.ts";

const DOC_PATH = path.resolve("docs/agent-factory-patch-artifact-adapter.md");
const RUN_HISTORY_DOC_PATH = path.resolve("docs/agent-factory-run-history.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-patch-artifact.mjs");
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
    selectedItemIds: ["S210"],
    packages: [
      {
        itemId: "S210",
        itemTitle: "Patch Artifact Adapter",
        repository: "chachathecat/inverge",
        branchName: "feat/s210-patch-artifact-adapter",
        worktreePathSuggestion: "..\\worktrees\\s210-patch-artifact-adapter",
        codexPrompt: "raw prompt text must not be rendered by AF013B",
        prBodyTemplate: "raw PR body template must not be rendered by AF013B",
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
      requestedItemId: "S210",
      promptSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      promptCharCount: 53,
      packageSummary: {
        itemId: "S210",
        itemTitle: "Patch Artifact Adapter",
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
    nextAction: {
      code: "run_watch_live",
    },
    dataBoundary: {
      inspectedArtifactCount: 2,
    },
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
      taskId: "S210",
      prNumber: 487,
      baseBranch: "main",
      proposedBranchName: "feat/s210-patch-artifact-adapter",
    },
    boundary: {
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: "..\\worktrees\\s210-patch-artifact-adapter",
      maxChangedFiles: 8,
      maxDiffBytes: 60000,
      requiresHumanApproval: true,
      approvalGate: "not_requested",
    },
    ...overrides,
  };
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

function writeRequiredUpstreamArtifacts(
  dir,
  {
    taskPackages = safeTaskPackages(),
    codexInvocationPlan = safeCodexInvocationPlan(),
    plannerNote = safePlannerNote(),
  } = {},
) {
  if (taskPackages !== null) writeJson(dir, "codex-task-packages.json", taskPackages);
  if (codexInvocationPlan !== null) writeJson(dir, "codex-invocation-plan.json", codexInvocationPlan);
  if (plannerNote !== null) writeJson(dir, "factory-planner-note.json", plannerNote);
}

test("AF013B docs, npm script, and CLI exist with report-only patch scope", () => {
  const docs = readNormalized(DOC_PATH);
  const runHistoryDocs = readNormalized(RUN_HISTORY_DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:patch-artifact/);
  assert.match(script, /AF013B v1 is report-only/);
  assert.match(docs, /AF013B v1 does not:/);
  assert.match(docs, /apply patches/);
  assert.match(docs, /factory-patch-artifact-plan\.json/);
  assert.match(script, /factory-patch-artifact-plan\.json/);
  assert.match(docs, /Data Boundary/);
  assert.match(docs, /Rollback/);
  assert.match(runHistoryDocs, /agent-factory:patch-artifact/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("missing required upstream artifacts fail closed with metadata-only safety flags", () => {
  const dir = tempDir("af013b-empty");
  const plan = createAgentFactoryPatchArtifactPlan({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });

  assert.equal(plan.status, "blocked");
  assert.equal(plan.reportOnly, true);
  assert.equal(plan.dryRun, true);
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
  assert.equal(plan.patchBoundary.patchArtifactOnly, true);
  assert.equal(plan.patchBoundary.patchAppliedToWorkingTree, false);
  assert.equal(plan.patchBoundary.isolatedWorkspaceRequired, true);
  assert.equal(plan.patchBoundary.requiresHumanApproval, true);
  assert.equal(plan.patchBoundary.approvalGate, "not_requested");
  assert.equal(plan.inputArtifacts.every((artifact) => artifact.status === "missing"), true);
  assert.equal(plan.proposedPatchArtifacts.every((artifact) => artifact.status === "not_created"), true);
  assert.ok(plan.blockedReasonCodes.includes("missing_task_package"));
  assert.ok(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"));
  assert.ok(plan.blockedReasonCodes.includes("missing_planner_note"));
  assert.doesNotThrow(() => assertAgentFactoryPatchArtifactPlanSafe(plan));
});

test("missing AF013A planner note fails closed", () => {
  const dir = tempDir("af013b-missing-planner");
  writeRequiredUpstreamArtifacts(dir, { plannerNote: null });

  const plan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_planner_note"));
  assert.equal(plan.blockedReasonCodes.includes("missing_task_package"), false);
  assert.equal(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"), false);
});

test("blocked AF013A planner note fails closed", () => {
  const dir = tempDir("af013b-blocked-planner");
  writeRequiredUpstreamArtifacts(dir, {
    plannerNote: safePlannerNote({
      status: "blocked",
      blockedReasonCodes: ["approval_failed_closed"],
    }),
  });

  const plan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("planner_note_blocked"));
  assert.equal(plan.blockedReasonCodes.includes("missing_planner_note"), false);
});

test("missing AF010 invocation plan fails closed", () => {
  const dir = tempDir("af013b-missing-codex");
  writeRequiredUpstreamArtifacts(dir, { codexInvocationPlan: null });

  const plan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"));
  assert.equal(plan.blockedReasonCodes.includes("missing_task_package"), false);
  assert.equal(plan.blockedReasonCodes.includes("missing_planner_note"), false);
});

test("missing task package artifact fails closed", () => {
  const dir = tempDir("af013b-missing-task");
  writeRequiredUpstreamArtifacts(dir, { taskPackages: null });

  const plan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("missing_task_package"));
  assert.equal(plan.blockedReasonCodes.includes("missing_codex_invocation_plan"), false);
  assert.equal(plan.blockedReasonCodes.includes("missing_planner_note"), false);
});

test("available artifacts derive target metadata without leaking prompts, PR bodies, or patch text", () => {
  const dir = tempDir("af013b-artifacts");
  const patchPath = path.join(dir, "candidate.patch");
  const patchText = [
    "diff --git a/lib/agent-factory/example.ts b/lib/agent-factory/example.ts",
    "--- a/lib/agent-factory/example.ts",
    "+++ b/lib/agent-factory/example.ts",
    "@@ -1 +1 @@",
    "-old internal patch text must not be rendered by AF013B",
    "+new internal patch text must not be rendered by AF013B",
  ].join("\n");

  writeRequiredUpstreamArtifacts(dir);
  writeJson(dir, "factory-orchestrator-plan.json", safeOrchestratorPlan());
  fs.writeFileSync(
    path.join(dir, "run-history.jsonl"),
    `${JSON.stringify({
      version: 1,
      source: "agent-factory-planner-notes",
      status: "success",
      dryRun: true,
      target: { taskId: "S210", prNumber: 487 },
    })}\n`,
    "utf8",
  );
  fs.writeFileSync(patchPath, patchText, "utf8");

  const plan = createAgentFactoryPatchArtifactPlan({
    artifactDir: dir,
    proposedPatchArtifactPaths: [patchPath],
  });
  const markdown = buildAgentFactoryPatchArtifactMarkdown(plan);
  const summary = buildAgentFactoryPatchArtifactSummary(plan);
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "planned");
  assert.equal(plan.target.taskId, "S210");
  assert.equal(plan.target.prNumber, 487);
  assert.equal(plan.target.proposedBranchName, "feat/s210-patch-artifact-adapter");
  assert.equal(plan.inputArtifacts.filter((artifact) => artifact.status === "available").length, 5);
  assert.equal(plan.proposedPatchArtifacts[0].status, "planned");
  assert.equal(plan.proposedPatchArtifacts[0].sha256.length, 64);
  assert.equal(plan.proposedPatchArtifacts[0].byteCount > 0, true);
  for (const forbidden of [
    "raw prompt text must not be rendered",
    "raw PR body template must not be rendered",
    "old internal patch text must not be rendered",
    "new internal patch text must not be rendered",
    "codexPrompt",
    "prBodyTemplate",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `plan leaked ${forbidden}`);
    assert.equal(markdown.includes(forbidden), false, `markdown leaked ${forbidden}`);
    assert.equal(summary.includes(forbidden), false, `summary leaked ${forbidden}`);
  }
});

test("invalid local artifact fails closed without surfacing raw artifact text", () => {
  const dir = tempDir("af013b-invalid");
  writeRequiredUpstreamArtifacts(dir, { plannerNote: null });
  fs.writeFileSync(
    path.join(dir, "factory-planner-note.json"),
    "{ this is not valid json and raw prompt text must not appear",
    "utf8",
  );

  const plan = createAgentFactoryPatchArtifactPlan({ artifactDir: dir });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("invalid_artifact"));
  assert.equal(serialized.includes("raw prompt text must not appear"), false);
});

test("missing and failed-closed approval gates block future patch artifact boundary", () => {
  const dir = tempDir("af013b-approval");
  writeRequiredUpstreamArtifacts(dir);
  const missing = createAgentFactoryPatchArtifactPlan({
    artifactDir: dir,
    approvalGate: "missing",
  });
  const failedClosed = createAgentFactoryPatchArtifactPlan({
    artifactDir: dir,
    approvalGate: "failed_closed",
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockedReasonCodes.includes("missing_human_approval"));
  assert.equal(failedClosed.status, "blocked");
  assert.ok(failedClosed.blockedReasonCodes.includes("approval_failed_closed"));
});

test("invalid patch limits and outside patch artifact paths fail closed", () => {
  const dir = tempDir("af013b-invalid-limits");
  writeRequiredUpstreamArtifacts(dir);
  const outsideDir = tempDir("af013b-outside");
  const outside = path.join(outsideDir, "outside.patch");
  fs.writeFileSync(outside, "rawPatch: outside content must not be read", "utf8");
  const plan = createAgentFactoryPatchArtifactPlan({
    artifactDir: dir,
    proposedPatchArtifactPaths: [outside],
    maxChangedFiles: "0",
    maxPatchBytes: "not-a-number",
  });

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("invalid_patch_boundary_limit"));
  assert.ok(plan.blockedReasonCodes.includes("proposed_patch_artifact_outside_boundary"));
  assert.equal(plan.blockedReasonCodes.includes("unsafe_proposed_patch_artifact"), false);
  assert.equal(JSON.stringify(plan).includes("outside content must not be read"), false);
});

test("unsafe proposed patch artifact fails closed without leaking raw content", () => {
  const dir = tempDir("af013b-unsafe-patch");
  const patchPath = path.join(dir, "unsafe.patch");
  writeRequiredUpstreamArtifacts(dir);
  fs.writeFileSync(patchPath, "rawPatch: unsafe patch body must not escape", "utf8");

  const plan = createAgentFactoryPatchArtifactPlan({
    artifactDir: dir,
    proposedPatchArtifactPaths: [patchPath],
  });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "blocked");
  assert.ok(plan.blockedReasonCodes.includes("unsafe_proposed_patch_artifact"));
  assert.equal(serialized.includes("unsafe patch body must not escape"), false);
  assert.equal(serialized.includes("rawPatch"), false);
});

test("patch artifact text safety rejects secrets and raw-content labels", () => {
  assert.throws(
    () => assertAgentFactoryPatchArtifactTextSafe("token: ghp_should_not_escape12345", "unsafe plan"),
    /raw-content|credential|secret-like/i,
  );
  assert.throws(
    () => assertAgentFactoryPatchArtifactTextSafe("rawPatch: diff body", "unsafe plan"),
    /raw-content|credential|secret-like/i,
  );
});

test("CLI writes patch artifact plan artifacts and appends AF011 history", () => {
  const dir = tempDir("af013b-cli");
  const jsonPath = path.join(dir, "factory-patch-artifact-plan.json");
  const markdownPath = path.join(dir, "factory-patch-artifact-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  const patchPath = path.join(dir, "candidate.diff");
  writeRequiredUpstreamArtifacts(dir);
  fs.writeFileSync(patchPath, "diff --git a/package.json b/package.json\n", "utf8");

  const result = runCli([
    "--artifact-dir",
    dir,
    "--patch-artifact",
    patchPath,
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
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).source.script, "agent-factory-patch-artifact");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF013B Patch Artifact Adapter/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Patches applied: no/);
  assert.equal(fs.existsSync(path.join(dir, "run-history.jsonl")), true);
  assert.match(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /agent-factory-patch-artifact/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /raw prompt text must not be rendered/);
});

test("AF013B active code introduces no Codex execution, shell execution, patch application, Git mutation, or workflow rerun path", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/patch-artifact-adapter.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
  assert.doesNotMatch(active, /child_process|spawnSync|execFile|execSync/i);
  assert.doesNotMatch(active, /\bgit\s+(?:commit|push|merge|rebase|checkout|reset)\b/i);
  assert.doesNotMatch(active, /\b(?:applyPatch|apply_patch)\b/i);
  assert.doesNotMatch(active, /\bpatch\s+-p\d\b/i);
  assert.doesNotMatch(active, /\/merge\b|\/update-branch\b|\/rerun\b|createCommitOnBranch|mergePullRequest/i);
});

test("AF013B focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-patch-artifact-adapter\.test\.mjs/);
});
