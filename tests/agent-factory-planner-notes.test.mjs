import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryPlannerNoteSafe,
  assertAgentFactoryPlannerNoteTextSafe,
  buildAgentFactoryPlannerNoteMarkdown,
  buildAgentFactoryPlannerNoteSummary,
  createAgentFactoryPlannerNote,
} from "../lib/agent-factory/factory-planner-notes.ts";

const DOC_PATH = path.resolve("docs/agent-factory-planner-notes.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-planner-notes.mjs");
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
    selectedItemIds: ["S209"],
    packages: [
      {
        itemId: "S209",
        itemTitle: "Theory Concept Corpus and Validator",
        repository: "chachathecat/inverge",
        branchName: "feat/s209-theory-concept-corpus",
        worktreePathSuggestion: "..\\worktrees\\s209-theory-concept-corpus",
        codexPrompt: "raw prompt text must not be rendered by AF013A",
        prBodyTemplate: "raw PR body template must not be rendered by AF013A",
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
      requestedItemId: "S209",
      promptSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      promptCharCount: 47,
      packageSummary: {
        itemId: "S209",
        itemTitle: "Theory Concept Corpus and Validator",
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

test("AF013A docs, npm script, and CLI exist with report-only scope", () => {
  const docs = readNormalized(DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:planner-notes/);
  assert.match(script, /AF013A v1 is report-only/);
  assert.match(docs, /AF013A v1 does not:/);
  assert.match(docs, /execute Codex/);
  assert.match(docs, /Data Boundary/);
  assert.match(docs, /Rollback/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("missing local artifacts still creates a safe planned metadata note", () => {
  const dir = tempDir("af013a-empty");
  const note = createAgentFactoryPlannerNote({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });

  assert.equal(note.status, "planned");
  assert.equal(note.reportOnly, true);
  assert.equal(note.dryRun, true);
  assert.equal(note.actions.willRunCodex, false);
  assert.equal(note.actions.willRunShellCommands, false);
  assert.equal(note.actions.willApplyPatch, false);
  assert.equal(note.actions.willCreateBranch, false);
  assert.equal(note.actions.willCreateCommit, false);
  assert.equal(note.actions.willPush, false);
  assert.equal(note.actions.willCreateOrUpdatePr, false);
  assert.equal(note.actions.willRerunWorkflow, false);
  assert.equal(note.actions.willMergeOrRebase, false);
  assert.equal(note.boundary.isolatedWorkspaceRequired, true);
  assert.equal(note.boundary.requiresHumanApproval, true);
  assert.equal(note.boundary.approvalGate, "not_requested");
  assert.equal(note.inputArtifacts.every((artifact) => artifact.status === "missing"), true);
  assert.doesNotThrow(() => assertAgentFactoryPlannerNoteSafe(note));
});

test("available artifacts derive target metadata without leaking prompts or PR bodies", () => {
  const dir = tempDir("af013a-artifacts");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "factory-orchestrator-plan.json", safeOrchestratorPlan());
  fs.writeFileSync(
    path.join(dir, "run-history.jsonl"),
    `${JSON.stringify({
      version: 1,
      source: "agent-factory-codex-invocation",
      status: "success",
      dryRun: true,
      target: { taskId: "S209", prNumber: null },
    })}\n`,
    "utf8",
  );

  const note = createAgentFactoryPlannerNote({ artifactDir: dir });
  const markdown = buildAgentFactoryPlannerNoteMarkdown(note);
  const summary = buildAgentFactoryPlannerNoteSummary(note);
  const serialized = JSON.stringify(note);

  assert.equal(note.status, "planned");
  assert.equal(note.target.taskId, "S209");
  assert.equal(note.target.proposedBranchName, "feat/s209-theory-concept-corpus");
  assert.equal(note.inputArtifacts.filter((artifact) => artifact.status === "available").length, 4);
  for (const forbidden of [
    "raw prompt text must not be rendered",
    "raw PR body template must not be rendered",
    "codexPrompt",
    "prBodyTemplate",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `note leaked ${forbidden}`);
    assert.equal(markdown.includes(forbidden), false, `markdown leaked ${forbidden}`);
    assert.equal(summary.includes(forbidden), false, `summary leaked ${forbidden}`);
  }
});

test("invalid local artifact fails closed without surfacing raw artifact text", () => {
  const dir = tempDir("af013a-invalid");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "codex-invocation-plan.json"),
    "{ this is not valid json and raw prompt text must not appear",
    "utf8",
  );

  const note = createAgentFactoryPlannerNote({ artifactDir: dir });
  const serialized = JSON.stringify(note);

  assert.equal(note.status, "blocked");
  assert.ok(note.blockedReasonCodes.includes("invalid_artifact"));
  assert.equal(serialized.includes("raw prompt text must not appear"), false);
});

test("missing and failed-closed approval gates block future execution boundary", () => {
  const dir = tempDir("af013a-approval");
  const missing = createAgentFactoryPlannerNote({
    artifactDir: dir,
    approvalGate: "missing",
  });
  const failedClosed = createAgentFactoryPlannerNote({
    artifactDir: dir,
    approvalGate: "failed_closed",
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockedReasonCodes.includes("missing_human_approval"));
  assert.equal(failedClosed.status, "blocked");
  assert.ok(failedClosed.blockedReasonCodes.includes("approval_failed_closed"));
});

test("explicit invalid boundary limits fail closed", () => {
  const dir = tempDir("af013a-invalid-limits");
  const note = createAgentFactoryPlannerNote({
    artifactDir: dir,
    maxChangedFiles: "0",
    maxDiffBytes: "not-a-number",
  });

  assert.equal(note.status, "blocked");
  assert.ok(note.blockedReasonCodes.includes("invalid_boundary_limit"));
});

test("planner-note text safety rejects secrets and raw-content labels", () => {
  assert.throws(
    () => assertAgentFactoryPlannerNoteTextSafe("token: ghp_should_not_escape12345", "unsafe note"),
    /raw-content|credential|secret-like/i,
  );
  assert.throws(
    () => assertAgentFactoryPlannerNoteTextSafe("rawLearnerContent: answer", "unsafe note"),
    /raw-content|credential|secret-like/i,
  );
});

test("CLI writes planner-note artifacts and appends AF011 history", () => {
  const dir = tempDir("af013a-cli");
  const jsonPath = path.join(dir, "factory-planner-note.json");
  const markdownPath = path.join(dir, "factory-planner-note.md");
  const summaryPath = path.join(dir, "summary.md");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());

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
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).source.script, "agent-factory-planner-notes");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF013A Factory Planner Note/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Codex invoked: no/);
  assert.equal(fs.existsSync(path.join(dir, "run-history.jsonl")), true);
  assert.match(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /agent-factory-planner-notes/);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /raw prompt text must not be rendered/);
});

test("AF013A active code introduces no Codex execution, shell execution, Git mutation, or workflow rerun path", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/factory-planner-notes.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
  assert.doesNotMatch(active, /child_process|spawnSync|execFile|execSync/i);
  assert.doesNotMatch(active, /\bgit\s+(?:commit|push|merge|rebase|checkout|reset)\b/i);
  assert.doesNotMatch(active, /\/merge\b|\/update-branch\b|\/rerun\b|createCommitOnBranch|mergePullRequest/i);
});

test("AF013A focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-planner-notes\.test\.mjs/);
});
