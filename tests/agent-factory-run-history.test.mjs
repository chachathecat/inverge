import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  appendAgentFactoryRunHistory,
  appendAgentFactoryRunHistoryRecord,
  assertAgentFactoryRunHistoryRecordSafe,
  buildAgentFactoryRunHistoryMarkdown,
  createAgentFactoryPayloadDigest,
  createAgentFactoryRunHistoryRecord,
  readRecentAgentFactoryRunHistory,
} from "../lib/agent-factory/run-history.ts";
import {
  createSafeMutationPlan,
  executeSafeMutation,
} from "../lib/agent-factory/safe-mutation-gate.ts";
import {
  createCodexInvocationPlan,
} from "../lib/agent-factory/codex-invocation-adapter.ts";

const DOC_PATH = path.resolve("docs/agent-factory-run-history.md");
const RUN_WORKFLOW = path.resolve(".github/workflows/agent-factory-run.yml");
const MUTATE_WORKFLOW = path.resolve(".github/workflows/agent-factory-mutate.yml");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function validAf009PrBody() {
  return [
    "## Goal",
    "",
    "Closes #477",
    "",
    "Ship AF011 Factory Audit Log / Run History v1.",
    "",
    "## Non-goals",
    "",
    "- Do not change AF009 mutation behavior.",
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
    "- Adds local JSONL run-history artifacts only.",
    "",
    "## Tests and evidence",
    "",
    "- Focused AF011 run-history tests.",
    "",
    "## Runtime evidence",
    "",
    "- Required: AF009 dry-run regression.",
    "- Result: Planned only.",
    "- Artifact: agent-factory-run-history-test.",
    "",
    "## Rollout and rollback",
    "",
    "- Rollout: Local artifact only.",
    "- Rollback: Remove run-history artifacts.",
    "",
    "## Remaining risks",
    "",
    "- Future DB path remains out of scope.",
    "",
    "## Merge recommendation",
    "",
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");
}

function safeTaskPackage() {
  return {
    itemId: "AF011",
    itemTitle: "Factory Audit Log / Run History v1",
    repository: "chachathecat/inverge",
    branchName: "feat/af011-factory-audit-log",
    codexPrompt: "Create metadata-only history artifacts. Do not execute Codex.",
    validationCommands: [
      "npm.cmd run typecheck",
      "npm.cmd run lint",
      "npm.cmd test",
      "npm.cmd run build",
      "git diff --check",
    ],
  };
}

test("AF011 docs and workflow artifact upload paths exist", () => {
  const docs = fs.readFileSync(DOC_PATH, "utf8");
  const runWorkflow = fs.readFileSync(RUN_WORKFLOW, "utf8");
  const mutateWorkflow = fs.readFileSync(MUTATE_WORKFLOW, "utf8");

  assert.match(docs, /metadata-only audit layer/);
  assert.match(docs, /run-history\.jsonl/);
  assert.match(docs, /Future Database Path/);
  assert.match(docs, /does not:\n\n- create a production database table/);
  assert.match(runWorkflow, /\.agent-factory\/run-history\.jsonl/);
  assert.match(runWorkflow, /\.agent-factory\/run-history\.md/);
  assert.match(mutateWorkflow, /\.agent-factory\/run-history\.jsonl/);
  assert.match(mutateWorkflow, /\.agent-factory\/run-history\.md/);
});

test("successful run-history record is metadata-only", () => {
  const unsafeText = "raw task package text must stay out of the history record";
  const record = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-29T00:00:00.000Z",
    source: "agent-factory-run",
    actorName: "operator",
    repository: "chachathecat/inverge",
    workflowName: "Agent Factory Run",
    workflowRunId: "1001",
    mode: "plan_only",
    targetTaskId: "AF011",
    status: "success",
    dryRun: true,
    approvalGateOutcome: "not_required",
    artifactPaths: [
      ".agent-factory/codex-task-packages.json",
      ".agent-factory/agent-factory-run-summary.md",
    ],
    payloadDigests: [
      createAgentFactoryPayloadDigest("task_package_input", {
        itemId: "AF011",
        text: unsafeText,
      }),
    ],
    guardrailSummary: {
      codexExecuted: false,
      prMetadataMutationAttempted: false,
    },
  });
  const serialized = JSON.stringify(record);

  assert.equal(record.version, 1);
  assert.equal(record.source, "agent-factory-run");
  assert.equal(record.target.taskId, "AF011");
  assert.equal(record.status, "success");
  assert.equal(record.payloadDigests[0].sha256.length, 64);
  assert.equal(serialized.includes(unsafeText), false);
  assert.equal(serialized.includes("task_package_input"), true);
  assert.doesNotThrow(() => assertAgentFactoryRunHistoryRecordSafe(record));
});

test("rejected run-history record stores reason codes and no raw unsafe payloads", () => {
  const rawLearnerValue = "unsafe learner answer paragraph";
  const tokenValue = "ghp_should_not_escape12345";
  const record = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-29T00:10:00.000Z",
    source: "agent-factory-codex-invocation",
    actorName: "operator",
    mode: "blocked_v1_no_execution",
    targetTaskId: "AF011",
    status: "rejected",
    dryRun: true,
    approvalGateOutcome: "dry_run_not_required",
    artifactPaths: [".agent-factory/codex-invocation-plan.json"],
    payloadDigests: [
      createAgentFactoryPayloadDigest("task_package_input", {
        rawLearnerContent: rawLearnerValue,
        token: tokenValue,
      }),
    ],
    blockedReasons: [
      `rawLearnerContent: ${rawLearnerValue}`,
      `token: ${tokenValue}`,
    ],
  });
  const serialized = JSON.stringify(record);

  assert.equal(record.status, "rejected");
  assert.ok(record.blockedReasonCodes.includes("data_boundary_violation"));
  assert.ok(record.blockedReasonCodes.includes("secret_like_value"));
  assert.equal(serialized.includes(rawLearnerValue), false);
  assert.equal(serialized.includes(tokenValue), false);
  assert.equal(serialized.includes("rawLearnerContent"), false);
  assert.equal(serialized.includes("token:"), false);
});

test("append-only JSONL behavior works", () => {
  const dir = tempDir("af011-history");
  const historyPath = path.join(dir, "run-history.jsonl");
  const first = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-29T00:20:00.000Z",
    source: "agent-factory-run",
    mode: "plan_only",
    targetTaskId: "AF011",
    status: "success",
    dryRun: true,
    approvalGateOutcome: "not_required",
  });
  const second = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-29T00:21:00.000Z",
    source: "agent-factory-mutate",
    mutationIntent: "add_safe_pr_comment",
    targetPrNumber: 477,
    status: "rejected",
    dryRun: false,
    approvalGateOutcome: "missing_or_invalid",
    blockedReasons: ["Actual AF009 mutation requires exact approval phrase."],
  });

  appendAgentFactoryRunHistoryRecord(first, { historyPath });
  const firstLine = fs.readFileSync(historyPath, "utf8").trimEnd();
  appendAgentFactoryRunHistoryRecord(second, { historyPath });
  const lines = fs.readFileSync(historyPath, "utf8").trimEnd().split(/\r?\n/);
  const recent = readRecentAgentFactoryRunHistory({ historyPath, limit: 1 });

  assert.equal(lines.length, 2);
  assert.equal(lines[0], firstLine);
  assert.equal(JSON.parse(lines[0]).runId, first.runId);
  assert.equal(JSON.parse(lines[1]).runId, second.runId);
  assert.equal(recent.length, 1);
  assert.equal(recent[0].runId, second.runId);
});

test("Markdown summary omits raw payloads", () => {
  const rawCommentPayload = "raw comment payload must not appear";
  const record = createAgentFactoryRunHistoryRecord({
    timestamp: "2026-06-29T00:30:00.000Z",
    source: "agent-factory-mutate",
    mutationIntent: "add_safe_pr_comment",
    targetPrNumber: 477,
    status: "rejected",
    dryRun: false,
    approvalGateOutcome: "missing_or_invalid",
    artifactPaths: [".agent-factory/mutation-plan.json"],
    payloadDigests: [
      createAgentFactoryPayloadDigest("operator_text_input", rawCommentPayload),
    ],
    blockedReasons: [`comment body: ${rawCommentPayload}`],
  });
  const markdown = buildAgentFactoryRunHistoryMarkdown([record], {
    generatedAt: new Date("2026-06-29T00:31:00.000Z"),
  });

  assert.match(markdown, /Agent Factory Run History/);
  assert.match(markdown, /add_safe_pr_comment/);
  assert.match(markdown, /Payload digests/);
  assert.doesNotMatch(markdown, new RegExp(rawCommentPayload));
  assert.doesNotMatch(markdown, /comment body:/i);
});

test("append helper writes JSONL and recent Markdown summary together", () => {
  const dir = tempDir("af011-append-helper");
  const historyPath = path.join(dir, "run-history.jsonl");
  const markdownPath = path.join(dir, "run-history.md");
  const result = appendAgentFactoryRunHistory({
    timestamp: "2026-06-29T00:40:00.000Z",
    source: "agent-factory-run",
    mode: "watch_snapshot",
    targetPrNumber: 477,
    status: "success",
    dryRun: true,
    approvalGateOutcome: "not_required",
    artifactPaths: [".agent-factory/ci-watcher-report.json"],
  }, {
    historyPath,
    markdownPath,
    generatedAt: new Date("2026-06-29T00:41:00.000Z"),
  });

  assert.equal(result.historyPath, path.resolve(historyPath));
  assert.equal(result.markdownPath, path.resolve(markdownPath));
  assert.equal(fs.readFileSync(historyPath, "utf8").trim().split(/\r?\n/).length, 1);
  assert.match(fs.readFileSync(markdownPath, "utf8"), /watch_snapshot/);
});

test("AF009 dry-run behavior remains unchanged", async () => {
  const prepared = createSafeMutationPlan({
    mutationIntent: "update_pr_runtime_evidence",
    prNumber: 477,
    dryRun: true,
    evidenceText: "- Result: AF009 remains dry-run only for this regression.",
    context: {
      pullRequest: {
        number: 477,
        draft: true,
        bodyText: validAf009PrBody(),
        changedFiles: ["lib/agent-factory/run-history.ts"],
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

  assert.equal(prepared.plan.status, "planned");
  assert.equal(prepared.plan.canExecute, false);
  assert.equal(result.status, "dry_run_noop");
  assert.equal(result.mutationAttempted, false);
  assert.equal(calls, 0);
});

test("AF010 dry-run behavior remains unchanged", () => {
  const plan = createCodexInvocationPlan(safeTaskPackage(), {
    dryRun: true,
    now: new Date("2026-06-29T00:50:00.000Z"),
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.dryRun, true);
  assert.equal(plan.canExecute, false);
  assert.equal(plan.codexWillBeInvoked, false);
  assert.equal(JSON.stringify(plan).includes(safeTaskPackage().codexPrompt), false);
});

test("AF011 focused test is wired into default node test run", () => {
  const runner = fs.readFileSync(TEST_RUNNER_PATH, "utf8");
  assert.match(runner, /tests\/agent-factory-run-history\.test\.mjs/);
});
