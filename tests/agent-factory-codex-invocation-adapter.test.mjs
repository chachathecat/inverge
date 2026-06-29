import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import {
  AF010_APPROVAL_PHRASE,
  assertCodexInvocationArtifactSafe,
  buildCodexInvocationPlanMarkdown,
  buildCodexInvocationSummary,
  createCodexInvocationPlan,
  validateCodexTaskPackageText,
} from "../lib/agent-factory/codex-invocation-adapter.ts";
import {
  createSafeMutationPlan,
  executeSafeMutation,
} from "../lib/agent-factory/safe-mutation-gate.ts";

const INVOCATION_SCRIPT = path.resolve("scripts/agent-factory-codex-invocation.mjs");
const MUTATE_SCRIPT = path.resolve("scripts/agent-factory-mutate.mjs");
const MUTATE_WORKFLOW = path.resolve(".github/workflows/agent-factory-mutate.yml");
const DOC_PATH = path.resolve("docs/agent-factory-codex-invocation-adapter.md");
const PACKAGE_PATH = path.resolve("package.json");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");
const NODE_TEST_LOADER = "./tests/ts-extension-loader.mjs";

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function safeTaskPackage(overrides = {}) {
  return {
    itemId: "AF010",
    itemTitle: "Codex Invocation Adapter v1",
    repository: "chachathecat/inverge",
    branchName: "feat/af010-codex-invocation-adapter",
    worktreePathSuggestion: "..\\worktrees\\af010-codex-invocation-adapter",
    codexPrompt: [
      "Create AF010 Codex Invocation Adapter v1.",
      "",
      "Scope: prepare metadata-only invocation plan artifacts.",
      "Non-goals: do not execute Codex, mutate code, call GitHub mutation APIs, or call learner runtime.",
      "",
      "Validation:",
      "- npm.cmd run typecheck",
      "- npm.cmd run lint",
      "- npm.cmd test",
      "- npm.cmd run build",
      "- git diff --check",
    ].join("\n"),
    prBodyTemplate: [
      "## Goal",
      "",
      "Closes #<issue-number>",
      "",
      "Implement AF010 metadata-only invocation planning.",
    ].join("\n"),
    validationCommands: [
      "npm.cmd run typecheck",
      "npm.cmd run lint",
      "npm.cmd test",
      "npm.cmd run build",
      "git diff --check",
    ],
    dataBoundaryNotes: [
      "Metadata-only task package.",
      "No learner answers, provider payloads, billing records, credentials, or raw PR bodies.",
    ],
    ...overrides,
  };
}

function runInvocationScript(args) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      NODE_TEST_LOADER,
      INVOCATION_SCRIPT,
      ...args,
    ],
    { encoding: "utf8" },
  );
}

function validAf009PrBody() {
  return [
    "## Goal",
    "",
    "Closes #471",
    "",
    "Ship AF009 Safe PR Metadata Gate v1.",
    "",
    "## Non-goals",
    "",
    "- Do not mutate code.",
    "",
    "## Risk classification",
    "",
    "- Risk: [high]",
    "",
    "## Data boundary",
    "",
    "- Metadata-only Agent Factory automation.",
    "",
    "## Schema / API / environment changes",
    "",
    "- Adds a manual GitHub Actions workflow.",
    "",
    "## Tests and evidence",
    "",
    "- Focused AF009 mutation gate tests.",
    "",
    "## Runtime evidence",
    "",
    "- Required: Agent Factory Mutate dry-run against PR #471.",
    "- Result: Passed; mutation plan reported no adapter call.",
    "- Artifact: agent-factory-mutate-update_pr_runtime_evidence-1001.",
    "",
    "## Rollout and rollback",
    "",
    "- Rollout: Use dry-run first.",
    "- Rollback: Manual PR body/comment correction.",
    "",
    "## Remaining risks",
    "",
    "- Human approval remains required.",
    "",
    "## Merge recommendation",
    "",
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");
}

test("AF010 docs, npm script, and CLI exist with dry-run-only scope", () => {
  const docs = fs.readFileSync(DOC_PATH, "utf8");
  const packageJson = fs.readFileSync(PACKAGE_PATH, "utf8");
  const script = fs.readFileSync(INVOCATION_SCRIPT, "utf8");

  assert.match(packageJson, /agent-factory:codex-invocation/);
  assert.match(script, /AF010 v1 prepares metadata-only invocation plans/);
  assert.match(script, /process\.exitCode = 1/);
  assert.match(docs, /AF010 v1 does not execute Codex/);
  assert.match(docs, /Data Boundary/);
  assert.match(docs, /Approval Model/);
  assert.match(docs, /Artifacts/);
  assert.match(docs, /Rollback/);
  assert.match(docs, new RegExp(AF010_APPROVAL_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("dry-run plan succeeds with safe metadata-only task package", () => {
  const plan = createCodexInvocationPlan(safeTaskPackage(), {
    dryRun: true,
    now: new Date("2026-06-29T00:00:00.000Z"),
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.dryRun, true);
  assert.equal(plan.canExecute, false);
  assert.equal(plan.codexWillBeInvoked, false);
  assert.equal(plan.metadataOnly, true);
  assert.equal(plan.dataBoundary.safe, true);
  assert.equal(plan.taskPackage.packageSummary.itemId, "AF010");
  assert.equal(plan.taskPackage.promptSourceField, "codexPrompt");
  assert.equal(plan.taskPackage.promptLineCount > 0, true);
  assert.equal(JSON.stringify(plan).includes("Create AF010 Codex Invocation Adapter v1."), false);
  assert.doesNotThrow(() => assertCodexInvocationArtifactSafe(plan));
});

test("unsafe raw learner, OCR, private, provider, billing, auth, payment, PR body, and secret-like content fails closed", () => {
  const unsafe = safeTaskPackage({
    rawLearnerContent: "student answer paragraph should not escape",
    ocrText: "ocr output should not escape",
    providerPayload: { body: "provider body should not escape" },
    billingData: "card data should not escape",
    authData: "auth data should not escape",
    paymentData: "payment data should not escape",
    rawPrBody: "pull request body should not escape",
    privateUserContent: "private note should not escape",
    codexPrompt: "token: ghp_should_not_escape12345",
  });
  const plan = createCodexInvocationPlan(unsafe, { dryRun: true });
  const serialized = JSON.stringify(plan);
  const markdown = buildCodexInvocationPlanMarkdown(plan);
  const summary = buildCodexInvocationSummary(plan);

  assert.equal(plan.status, "rejected");
  assert.equal(plan.canExecute, false);
  assert.equal(plan.codexWillBeInvoked, false);
  assert.equal(plan.dataBoundary.safe, false);
  assert.ok(plan.dataBoundary.violationCount >= 8);
  assert.match(plan.blockedReasons.join("\n"), /metadata-only data-boundary scan/);
  for (const forbidden of [
    "student answer paragraph should not escape",
    "ocr output should not escape",
    "provider body should not escape",
    "card data should not escape",
    "auth data should not escape",
    "payment data should not escape",
    "pull request body should not escape",
    "private note should not escape",
    "ghp_should_not_escape12345",
    "rawLearnerContent",
    "providerPayload",
    "rawPrBody",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `plan leaked ${forbidden}`);
    assert.equal(markdown.includes(forbidden), false, `markdown leaked ${forbidden}`);
    assert.equal(summary.includes(forbidden), false, `summary leaked ${forbidden}`);
  }
});

test("text scanner rejects sensitive labels without rejecting safe boundary reminders", () => {
  const safe = validateCodexTaskPackageText({
    note: "Do not include learner answers, OCR output, provider payloads, billing records, or credentials.",
  });
  const unsafe = validateCodexTaskPackageText({
    note: "providerPayload: raw provider body",
  });

  assert.equal(safe.safe, true);
  assert.equal(unsafe.safe, false);
  assert.equal(unsafe.violations[0].category, "sensitive_label");
});

test("non-dry-run fails closed in v1 even with approval phrase", () => {
  const plan = createCodexInvocationPlan(safeTaskPackage(), {
    dryRun: false,
    approvalPhrase: AF010_APPROVAL_PHRASE,
  });

  assert.equal(plan.status, "rejected");
  assert.equal(plan.approvedForInvocation, true);
  assert.equal(plan.canExecute, false);
  assert.equal(plan.codexWillBeInvoked, false);
  assert.match(plan.blockedReasons.join("\n"), /dry-run only/);
});

test("non-dry-run also requires exact approval phrase for future execution paths", () => {
  const plan = createCodexInvocationPlan(safeTaskPackage(), {
    dryRun: false,
    approvalPhrase: "approve",
  });

  assert.equal(plan.status, "rejected");
  assert.equal(plan.approvedForInvocation, false);
  assert.match(plan.blockedReasons.join("\n"), /exact approval phrase/);
  assert.match(plan.blockedReasons.join("\n"), /dry-run only/);
});

test("CLI writes JSON, Markdown, and summary artifacts for a safe dry-run", () => {
  const directory = tempDir("af010-safe");
  const inputPath = path.join(directory, "task-package.json");
  const jsonPath = path.join(directory, "plan.json");
  const markdownPath = path.join(directory, "plan.md");
  const summaryPath = path.join(directory, "summary.md");
  fs.writeFileSync(inputPath, JSON.stringify(safeTaskPackage(), null, 2), "utf8");

  const result = runInvocationScript([
    "--input",
    inputPath,
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
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).status, "planned");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF010 Codex Invocation Plan/);
  assert.match(fs.readFileSync(summaryPath, "utf8"), /Codex invoked: no/);
});

test("CLI unsafe failure writes artifacts that omit raw unsafe payloads", () => {
  const directory = tempDir("af010-unsafe");
  const inputPath = path.join(directory, "task-package.json");
  const jsonPath = path.join(directory, "plan.json");
  const markdownPath = path.join(directory, "plan.md");
  const summaryPath = path.join(directory, "summary.md");
  fs.writeFileSync(
    inputPath,
    JSON.stringify(
      safeTaskPackage({
        rawLearnerContent: "unsafe raw learner value",
        codexPrompt: "privateKey: -----BEGIN PRIVATE KEY-----",
      }),
      null,
      2,
    ),
    "utf8",
  );

  const result = runInvocationScript([
    "--input",
    inputPath,
    "--json",
    jsonPath,
    "--markdown",
    markdownPath,
    "--summary",
    summaryPath,
    "--stdout",
    "none",
  ]);
  const combinedArtifacts = [
    fs.readFileSync(jsonPath, "utf8"),
    fs.readFileSync(markdownPath, "utf8"),
    fs.readFileSync(summaryPath, "utf8"),
  ].join("\n");

  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).status, "rejected");
  assert.doesNotMatch(combinedArtifacts, /unsafe raw learner value/);
  assert.doesNotMatch(combinedArtifacts, /rawLearnerContent/);
  assert.doesNotMatch(combinedArtifacts, /BEGIN PRIVATE KEY/);
});

test("CLI can select one package from an AF001 package collection", () => {
  const plan = createCodexInvocationPlan(
    {
      version: 1,
      packages: [
        safeTaskPackage({ itemId: "AF009", itemTitle: "Prior metadata gate" }),
        safeTaskPackage({ itemId: "AF010", itemTitle: "Selected invocation adapter" }),
      ],
    },
    { itemId: "AF010" },
  );

  assert.equal(plan.status, "planned");
  assert.equal(plan.taskPackage.selectionSource, "packages");
  assert.equal(plan.taskPackage.packageIndex, 1);
  assert.equal(plan.taskPackage.packageSummary.itemTitle, "Selected invocation adapter");
});

test("AF009 mutate workflow and dry-run behavior remain unchanged", async () => {
  const activeAf009 = [
    fs.readFileSync(MUTATE_SCRIPT, "utf8"),
    fs.readFileSync(MUTATE_WORKFLOW, "utf8"),
  ].join("\n");
  const prepared = createSafeMutationPlan({
    mutationIntent: "update_pr_runtime_evidence",
    prNumber: 471,
    dryRun: true,
    evidenceText: "- Result: AF009 remains a dry-run no-op for this regression check.",
    context: {
      pullRequest: {
        number: 471,
        draft: true,
        bodyText: validAf009PrBody(),
        changedFiles: ["lib/agent-factory/safe-mutation-gate.ts"],
        statusCheckRollup: [
          {
            name: "typecheck",
            workflowName: "Fast CI",
            status: "COMPLETED",
            conclusion: "SUCCESS",
            required: true,
          },
        ],
      },
    },
  });
  let calls = 0;
  const result = await executeSafeMutation(prepared, {
    updatePullRequestBody: async () => {
      calls += 1;
      throw new Error("AF009 dry-run must not call mutation adapter");
    },
  });

  assert.doesNotMatch(activeAf009, /agent-factory:codex-invocation|codex-invocation-adapter|AF010/);
  assert.equal(prepared.plan.status, "planned");
  assert.equal(prepared.plan.canExecute, false);
  assert.equal(result.status, "dry_run_noop");
  assert.equal(result.mutationAttempted, false);
  assert.equal(calls, 0);
});

test("AF010 focused test is wired into default node test run", () => {
  const runner = fs.readFileSync(TEST_RUNNER_PATH, "utf8");
  assert.match(runner, /tests\/agent-factory-codex-invocation-adapter\.test\.mjs/);
});
