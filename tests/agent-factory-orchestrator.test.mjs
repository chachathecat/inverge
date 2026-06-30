import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  assertAgentFactoryOrchestratorPlanSafe,
  buildAgentFactoryOrchestratorMarkdown,
  createAgentFactoryOrchestratorPlan,
} from "../lib/agent-factory/factory-orchestrator.ts";

const DOC_PATH = path.resolve("docs/agent-factory-orchestrator.md");
const SCRIPT_PATH = path.resolve("scripts/agent-factory-orchestrate.mjs");
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
    selectedItemIds: ["AF012"],
    packages: [
      {
        itemId: "AF012",
        itemTitle: "Factory Orchestrator v1",
        repository: "chachathecat/inverge",
        branchName: "feat/af012-factory-orchestrator",
        codexPrompt: "raw prompt text must not be rendered by AF012",
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
    blockedReasons: [],
    blockedReasonCodes: [],
    taskPackage: {
      packageSummary: {
        itemId: "AF012",
        itemTitle: "Factory Orchestrator v1",
      },
      requestedItemId: null,
    },
    dataBoundary: {
      safe: true,
      violationCount: 0,
      omittedRawPayloads: true,
    },
    invocation: {
      mode: "dry_run_plan_only",
    },
    artifacts: [],
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

test("AF012 docs, npm script, and CLI exist with report-only scope", () => {
  const docs = readNormalized(DOC_PATH);
  const script = readNormalized(SCRIPT_PATH);
  const packageJson = readNormalized(PACKAGE_PATH);

  assert.match(packageJson, /agent-factory:orchestrate/);
  assert.match(script, /AF012 v1 is report-only/);
  assert.match(docs, /AF012 v1 does not:/);
  assert.match(docs, /execute Codex/);
  assert.match(docs, /Data Boundary/);
  assert.match(docs, /Rollback/);
  assert.doesNotMatch(packageJson, /"type":\s*"module"/);
});

test("missing local artifacts recommends plan_only and executes nothing", () => {
  const dir = tempDir("af012-empty");
  const plan = createAgentFactoryOrchestratorPlan({
    artifactDir: dir,
    now: new Date("2026-06-30T00:00:00.000Z"),
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.reportOnly, true);
  assert.equal(plan.willExecuteCommands, false);
  assert.equal(plan.codexWillBeInvoked, false);
  assert.equal(plan.nextAction.code, "run_plan_only");
  assert.match(plan.nextAction.command, /agent-factory:run/);
  assert.doesNotThrow(() => assertAgentFactoryOrchestratorPlanSafe(plan));
});

test("task package artifact recommends AF010 dry-run without leaking prompt text", () => {
  const dir = tempDir("af012-task-package");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());

  const plan = createAgentFactoryOrchestratorPlan({ artifactDir: dir });
  const markdown = buildAgentFactoryOrchestratorMarkdown(plan);
  const serialized = JSON.stringify(plan);

  assert.equal(plan.nextAction.code, "run_codex_invocation_dry_run");
  assert.match(plan.nextAction.command, /agent-factory:codex-invocation/);
  assert.match(plan.nextAction.command, /--item-id AF012/);
  assert.equal(serialized.includes("raw prompt text must not be rendered"), false);
  assert.equal(markdown.includes("raw prompt text must not be rendered"), false);
});

test("rejected AF010 plan blocks and omits raw unsafe payloads", () => {
  const dir = tempDir("af012-rejected-codex");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan({
    status: "rejected",
    blockedReasonCodes: ["forbidden_key"],
    dataBoundary: {
      safe: false,
      violationCount: 1,
      omittedRawPayloads: true,
    },
    rawLearnerContent: "must not leak",
  }));

  const plan = createAgentFactoryOrchestratorPlan({ artifactDir: dir });
  const serialized = JSON.stringify(plan);

  assert.equal(plan.status, "blocked");
  assert.equal(plan.nextAction.code, "review_codex_invocation_rejection");
  assert.ok(plan.blockedReasonCodes.includes("codex_invocation_rejected"));
  assert.equal(serialized.includes("must not leak"), false);
  assert.equal(serialized.includes("rawLearnerContent"), false);
});

test("failed CI without repair plan recommends report-only repair plan", () => {
  const dir = tempDir("af012-failed-ci");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());
  writeJson(dir, "codex-invocation-plan.json", safeCodexInvocationPlan());
  writeJson(dir, "ci-watcher-report.json", {
    prNumber: 479,
    workflowSummary: {
      state: "failed",
      failed: 1,
      pending: 0,
    },
    recommendedNextActions: ["request_codex_repair"],
    blockedReasons: ["Focused test failed."],
  });

  const plan = createAgentFactoryOrchestratorPlan({ artifactDir: dir });

  assert.equal(plan.status, "planned");
  assert.equal(plan.nextAction.code, "run_repair_plan");
  assert.match(plan.nextAction.command, /--mode repair_plan/);
  assert.equal(plan.willExecuteCommands, false);
});

test("CLI writes orchestrator artifacts and appends AF011 history", () => {
  const dir = tempDir("af012-cli");
  const jsonPath = path.join(dir, "factory-orchestrator-plan.json");
  const markdownPath = path.join(dir, "factory-orchestrator-plan.md");
  const summaryPath = path.join(dir, "summary.md");
  writeJson(dir, "codex-task-packages.json", safeTaskPackages());

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
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).orchestrator, "af012-factory-orchestrator");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF012 Factory Orchestrator/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Next action: run_codex_invocation_dry_run/);
  assert.equal(fs.existsSync(path.join(dir, "run-history.jsonl")), true);
  assert.match(fs.readFileSync(path.join(dir, "run-history.jsonl"), "utf8"), /agent-factory-orchestrator/);
});

test("AF012 active code introduces no Codex execution, Git mutation, or workflow rerun path", () => {
  const active = [
    readNormalized(SCRIPT_PATH),
    readNormalized(path.resolve("lib/agent-factory/factory-orchestrator.ts")),
  ].join("\n");

  assert.doesNotMatch(active, /codex\s+exec/i);
  assert.doesNotMatch(active, /\bgit\s+(?:commit|push|merge|rebase|checkout|reset)\b/i);
  assert.doesNotMatch(active, /\/merge\b|\/update-branch\b|\/rerun\b|createCommitOnBranch|mergePullRequest/i);
});

test("AF012 focused test is wired into default node test run", () => {
  const runner = readNormalized(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-orchestrator\.test\.mjs/);
});
