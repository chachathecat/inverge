import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const RUN_SCRIPT = path.resolve("scripts/agent-factory-run.mjs");
const WORKFLOW_PATH = path.resolve(".github/workflows/agent-factory-run.yml");
const DOC_PATH = path.resolve("docs/agent-factory-github-actions-button.md");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");
const NODE_TEST_LOADER = "./tests/ts-extension-loader.mjs";

const MODES = [
  "plan_only",
  "watch_snapshot",
  "doctor_pr_body",
  "repair_plan",
  "merge_plan",
];

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function runDispatcher(args) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      NODE_TEST_LOADER,
      RUN_SCRIPT,
      ...args,
    ],
    { encoding: "utf8" },
  );
}

function readSummary(outputDir) {
  return fs.readFileSync(path.join(outputDir, "agent-factory-run-summary.md"), "utf8");
}

function snapshot(overrides = {}) {
  return {
    repo: "chachathecat/inverge",
    number: 461,
    title: "[AF006] GitHub Actions Factory Button v1",
    state: "OPEN",
    isDraft: false,
    baseRefOid: "a".repeat(40),
    headRefOid: "b".repeat(40),
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    labels: [],
    files: [{ path: "lib/agent-factory/ci-watcher.ts" }],
    statusCheckRollup: [
      {
        name: "typecheck",
        workflowName: "Fast CI",
        status: "COMPLETED",
        conclusion: "SUCCESS",
        required: true,
      },
    ],
    ...overrides,
  };
}

function assertNoUnsafeArtifactText(outputDir) {
  const files = fs.readdirSync(outputDir)
    .map((entry) => path.join(outputDir, entry))
    .filter((entry) => fs.statSync(entry).isFile());

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(text.includes("secretToken"), false, file);
    assert.equal(text.includes("ghp_should_not_escape"), false, file);
    assert.equal(text.includes("rawAnswer"), false, file);
    assert.equal(text.includes("learner answer must not escape"), false, file);
    assert.equal(text.includes("providerPayload"), false, file);
  }
}

test("workflow exists with workflow_dispatch inputs and generated artifact upload", () => {
  const workflow = fs.readFileSync(WORKFLOW_PATH, "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  for (const input of ["mode", "target", "max_tasks", "stdout", "allow_mutation"]) {
    assert.match(workflow, new RegExp(`\\b${input}:`));
  }
  for (const mode of MODES) {
    assert.match(workflow, new RegExp(`- ${mode}`));
  }
  assert.match(workflow, /allow_mutation:[\s\S]*options:[\s\S]*- "false"/);
  assert.match(workflow, /npm run agent-factory:run/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /agent-factory-run-summary\.md/);
  assert.match(workflow, /AF006 v1: read-only\/report-only/);
});

test("allowed modes are documented and dispatcher rejects invalid modes", () => {
  const docs = fs.readFileSync(DOC_PATH, "utf8");
  const outputDir = tempDir("af006-invalid-mode");
  const result = runDispatcher([
    "--mode",
    "mutate_everything",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  for (const mode of MODES) {
    assert.match(docs, new RegExp(`\\b${mode}\\b`));
  }
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid mode "mutate_everything"/);
  assert.match(readSummary(outputDir), /Invalid mode "mutate_everything"/);
});

test("allow_mutation true fails closed and writes the run summary", () => {
  const outputDir = tempDir("af006-allow-mutation");
  const result = runDispatcher([
    "--mode",
    "plan_only",
    "--allow-mutation",
    "true",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  assert.notEqual(result.status, 0);
  const summary = readSummary(outputDir);
  assert.match(summary, /allow_mutation must be false/);
  assert.match(summary, /read-only\/report-only/);
});

test("plan_only accepts workflow-passed empty pr_number argument", () => {
  const outputDir = tempDir("af007-empty-pr-plan");
  const result = runDispatcher([
    "--mode",
    "plan_only",
    "--target",
    "auto",
    "--pr-number",
    "",
    "--max-tasks",
    "1",
    "--stdout",
    "markdown",
    "--allow-mutation",
    "false",
    "--output-dir",
    outputDir,
  ]);

  assert.equal(result.status, 0, result.stderr);
  const summary = readSummary(outputDir);

  assert.match(result.stdout, /AF006 v1: read-only\/report-only/);
  assert.match(summary, /AF001 planner task packages generated/);
  assert.match(summary, /PR number: none/);
  assert.match(summary, /No branches, commits, pushes, PR updates/);
  assert.match(summary, /No GitHub mutation APIs/);
});

test("plan_only dispatcher path uses the AF001 planner and writes task package artifacts", () => {
  const outputDir = tempDir("af006-plan");
  const result = runDispatcher([
    "--mode",
    "plan_only",
    "--target",
    "auto",
    "--max-tasks",
    "2",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(fs.readFileSync(path.join(outputDir, "codex-task-packages.json"), "utf8"));
  const markdown = fs.readFileSync(path.join(outputDir, "codex-task-packages.md"), "utf8");

  assert.equal(json.version, 1);
  assert.ok(json.selectedTaskCount <= 2);
  assert.ok(Array.isArray(json.readyItemIds));
  assert.match(markdown, /Codex Task Factory Plan/);
  const summary = readSummary(outputDir);
  assert.match(summary, /AF001 planner task packages generated/);
  assert.match(summary, /PR number: none/);
});

test("missing snapshot modes fail safely with actionable fixture instructions", () => {
  const outputDir = tempDir("af006-missing-snapshot");
  const result = runDispatcher([
    "--mode",
    "watch_snapshot",
    "--target",
    "auto",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  assert.notEqual(result.status, 0);
  const summary = readSummary(outputDir);
  assert.match(summary, /CI snapshot file not found/);
  assert.match(summary, /sanitized fixture path/);
  assert.match(summary, /Snapshot modes do not live-fetch GitHub data/);
});

test("non-live report modes do not require pr_number", () => {
  const fixtureDir = tempDir("af007-non-live-no-pr");
  const missingTarget = path.join(fixtureDir, "missing.json");
  const cases = [
    ["watch_snapshot", /CI snapshot file not found/],
    ["doctor_pr_body", /PR body file not found/],
    ["repair_plan", /AF002 report or PR\/check snapshot file not found/],
    ["merge_plan", /AF002\/AF004 report or PR\/check snapshot file not found/],
  ];

  for (const [mode, expectedFailure] of cases) {
    const outputDir = tempDir(`af007-${mode}-no-pr`);
    const result = runDispatcher([
      "--mode",
      mode,
      "--target",
      missingTarget,
      "--output-dir",
      outputDir,
      "--stdout",
      "none",
    ]);
    const summary = readSummary(outputDir);

    assert.notEqual(result.status, 0);
    assert.match(summary, expectedFailure);
    assert.doesNotMatch(result.stderr, /pr_number is required/);
    assert.doesNotMatch(summary, /pr_number is required/);
  }
});

test("watch_snapshot writes safe generated artifacts even when ignored input has unsafe fields", () => {
  const fixtureDir = tempDir("af006-fixture");
  const outputDir = tempDir("af006-watch");
  const snapshotPath = path.join(fixtureDir, "snapshot.json");
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify({
      ...snapshot(),
      secretToken: "ghp_should_not_escape",
      rawAnswer: "learner answer must not escape",
      providerPayload: { body: "provider payload must not escape" },
    }),
    "utf8",
  );

  const result = runDispatcher([
    "--mode",
    "watch_snapshot",
    "--target",
    snapshotPath,
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(outputDir, "ci-watcher-report.json"), "utf8")).prNumber, 461);
  assertNoUnsafeArtifactText(outputDir);
});

test("dispatcher writes summary and docs state report-only v1", () => {
  const outputDir = tempDir("af006-summary");
  const result = runDispatcher([
    "--mode",
    "plan_only",
    "--target",
    "S218",
    "--output-dir",
    outputDir,
    "--stdout",
    "json",
  ]);
  const docs = fs.readFileSync(DOC_PATH, "utf8");
  const summary = readSummary(outputDir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"reportOnly": true/);
  assert.match(summary, /AF006 v1: read-only\/report-only/);
  assert.match(summary, /No branches, commits, pushes, PR updates/);
  assert.match(docs, /read-only\/report-only/);
  assert.match(docs, /never recommends auto-merge/);
});

test("AF001 through AF006 focused tests are wired into the default node test run", () => {
  const runner = fs.readFileSync(TEST_RUNNER_PATH, "utf8");

  for (const testFile of [
    "tests/agent-factory-roadmap-runner.test.mjs",
    "tests/agent-factory-ci-watcher.test.mjs",
    "tests/agent-factory-pr-contract-doctor.test.mjs",
    "tests/agent-factory-safe-repair-loop.test.mjs",
    "tests/agent-factory-rebase-merge-orchestrator.test.mjs",
    "tests/agent-factory-github-actions-button.test.mjs",
  ]) {
    assert.match(runner, new RegExp(testFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
