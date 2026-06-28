import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import {
  AF009_APPROVAL_PHRASE,
  AF009_MUTATION_INTENTS,
  AF009_SAFE_COMMENT_MARKER,
  assertSafeMutationArtifactSafe,
  buildSafePrCommentBody,
  createSafeMutationPlan,
  executeSafeMutation,
  replaceRuntimeEvidenceSection,
  validatePrContractForAf009,
} from "../lib/agent-factory/safe-mutation-gate.ts";

const MUTATE_SCRIPT = path.resolve("scripts/agent-factory-mutate.mjs");
const MUTATE_WORKFLOW = path.resolve(".github/workflows/agent-factory-mutate.yml");
const RUN_WORKFLOW = path.resolve(".github/workflows/agent-factory-run.yml");
const DOC_PATH = path.resolve("docs/agent-factory-safe-mutation-gate.md");
const BUTTON_DOC_PATH = path.resolve("docs/agent-factory-github-actions-button.md");
const LIVE_DOC_PATH = path.resolve("docs/agent-factory-live-github-readonly.md");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");
const PACKAGE_PATH = path.resolve("package.json");
const NODE_TEST_LOADER = "./tests/ts-extension-loader.mjs";

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function validPrBody(overrides = {}) {
  const runtimeEvidence = overrides.runtimeEvidence ?? [
    "- Required: Agent Factory Mutate dry-run against PR #471.",
    "- Result: Passed; mutation plan reported no adapter call.",
    "- Artifact: agent-factory-mutate-update_pr_runtime_evidence-1001.",
  ].join("\n");
  const mergeRecommendation = overrides.mergeRecommendation ?? [
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");

  return [
    "## Goal",
    "",
    "Closes #471",
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
    runtimeEvidence,
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
    mergeRecommendation,
  ].join("\n");
}

function allGreenContext(body = validPrBody(), overrides = {}) {
  return {
    repo: "chachathecat/inverge",
    pullRequest: {
      number: 471,
      title: "[AF009] Safe PR Metadata Gate v1",
      state: "open",
      draft: true,
      bodyText: body,
      mergeability: "mergeable",
      labels: [],
      changedFiles: [
        "lib/agent-factory/safe-mutation-gate.ts",
        "scripts/agent-factory-mutate.mjs",
        "tests/agent-factory-safe-mutation-gate.test.mjs",
        "docs/agent-factory-safe-mutation-gate.md",
      ],
      statusCheckRollup: [
        {
          name: "typecheck",
          workflowName: "Fast CI",
          status: "COMPLETED",
          conclusion: "SUCCESS",
          required: true,
        },
        {
          name: "lint",
          workflowName: "Fast CI",
          status: "COMPLETED",
          conclusion: "SUCCESS",
          required: true,
        },
      ],
      ...overrides.pullRequest,
    },
    comments: overrides.comments ?? [],
  };
}

function planFor(input) {
  return createSafeMutationPlan({
    prNumber: 471,
    dryRun: true,
    evidenceText: "- Result: GitHub Actions dry-run passed.\n- Artifact: agent-factory-mutate-1001.",
    context: allGreenContext(),
    ...input,
  });
}

function runMutateScript(args) {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      NODE_TEST_LOADER,
      MUTATE_SCRIPT,
      ...args,
    ],
    { encoding: "utf8" },
  );
}

test("AF009 workflow, docs, and npm script exist with explicit approval-gated scope", () => {
  const workflow = fs.readFileSync(MUTATE_WORKFLOW, "utf8");
  const packageJson = fs.readFileSync(PACKAGE_PATH, "utf8");
  const docs = fs.readFileSync(DOC_PATH, "utf8");
  const buttonDoc = fs.readFileSync(BUTTON_DOC_PATH, "utf8");
  const liveDoc = fs.readFileSync(LIVE_DOC_PATH, "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  for (const input of ["mutation_intent", "pr_number", "dry_run", "approval_phrase", "evidence_text", "stdout"]) {
    assert.match(workflow, new RegExp(`\\b${input}:`));
  }
  for (const intent of AF009_MUTATION_INTENTS) {
    assert.match(workflow, new RegExp(`- ${intent}`));
    assert.match(docs, new RegExp(`\\b${intent}\\b`));
  }
  assert.match(workflow, /default: "true"/);
  assert.match(workflow, /pull-requests: write/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /actions: read/);
  assert.doesNotMatch(workflow, /actions: write/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /mutation-plan\.json/);
  assert.match(workflow, /agent-factory-mutation-summary\.md/);
  assert.match(packageJson, /agent-factory:mutate/);
  assert.match(docs, new RegExp(AF009_APPROVAL_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(buttonDoc, /Agent Factory Mutate/);
  assert.match(liveDoc, /remain read-only\/report-only/);
});

test("AF006 and AF007 workflow remains read-only/report-only after AF009 is added", () => {
  const workflow = fs.readFileSync(RUN_WORKFLOW, "utf8");

  assert.match(workflow, /allow_mutation:/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /actions: read/);
  assert.doesNotMatch(workflow, /pull-requests: write/);
  assert.doesNotMatch(workflow, /issues: write/);
  assert.doesNotMatch(workflow, /agent-factory:mutate/);
});

test("dry-run update_pr_runtime_evidence produces safe plan and does not call mutation adapter", async () => {
  const prepared = planFor({ mutationIntent: "update_pr_runtime_evidence" });
  let calls = 0;
  const result = await executeSafeMutation(prepared, {
    updatePullRequestBody: async () => {
      calls += 1;
      throw new Error("adapter should not be called");
    },
  });

  assert.equal(prepared.plan.status, "planned");
  assert.equal(prepared.plan.dryRun, true);
  assert.equal(prepared.plan.canExecute, false);
  assert.equal(result.status, "dry_run_noop");
  assert.equal(result.mutationAttempted, false);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify(prepared.plan).includes(validPrBody()), false);
  assert.doesNotThrow(() => assertSafeMutationArtifactSafe(prepared.plan));
});

test("update_pr_runtime_evidence modifies only the Runtime evidence section", () => {
  const original = validPrBody();
  const replacement = "- Result: Dry-run and live watch succeeded.\n- Artifact: agent-factory-mutate-2001.";
  const updated = replaceRuntimeEvidenceSection(original, replacement).updatedBody;

  assert.notEqual(updated, original);
  assert.match(updated, /Dry-run and live watch succeeded/);
  assert.equal(updated.includes("Ship AF009 Safe PR Metadata Gate v1."), true);
  assert.equal(updated.includes("- Rollout: Use dry-run first."), true);

  const beforePrefix = original.split("## Runtime evidence")[0];
  const afterPrefix = updated.split("## Runtime evidence")[0];
  const beforeSuffix = original.split("## Rollout and rollback")[1];
  const afterSuffix = updated.split("## Rollout and rollback")[1];

  assert.equal(afterPrefix, beforePrefix);
  assert.equal(afterSuffix, beforeSuffix);
});

test("all required PR Contract sections are preserved after Runtime evidence update", () => {
  const updated = replaceRuntimeEvidenceSection(
    validPrBody(),
    "- Result: Passed.\n- Artifact: agent-factory-mutate-2002.",
  ).updatedBody;
  const validation = validatePrContractForAf009(updated);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.sectionOrder, [
    "## Goal",
    "## Non-goals",
    "## Risk classification",
    "## Data boundary",
    "## Schema / API / environment changes",
    "## Tests and evidence",
    "## Runtime evidence",
    "## Rollout and rollback",
    "## Remaining risks",
    "## Merge recommendation",
  ]);
});

test("missing Runtime evidence section fails closed", () => {
  const body = validPrBody().replace(/\n## Runtime evidence\n\n[\s\S]*?\n## Rollout and rollback/, "\n## Rollout and rollback");
  const prepared = planFor({
    mutationIntent: "update_pr_runtime_evidence",
    context: allGreenContext(body),
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /missing ## Runtime evidence/i);
});

test("duplicate Runtime evidence section fails closed", () => {
  const body = validPrBody().replace("## Rollout and rollback", "## Runtime evidence\n\n- Duplicate.\n\n## Rollout and rollback");
  const prepared = planFor({
    mutationIntent: "update_pr_runtime_evidence",
    context: allGreenContext(body),
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /multiple ## Runtime evidence|Duplicate required/i);
});

test("unsafe raw-content fields are rejected", () => {
  const prepared = planFor({
    mutationIntent: "update_pr_runtime_evidence",
    evidenceText: "rawAnswer: learner answer must not escape",
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /unsafe raw-content/i);
});

test("secret-like values are rejected", () => {
  const prepared = planFor({
    mutationIntent: "add_safe_pr_comment",
    evidenceText: "token: ghp_should_not_escape12345",
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /secret-like|credential-like/i);
});

test("add_safe_pr_comment produces metadata-only marker comment body", () => {
  const body = buildSafePrCommentBody("- PR: #471\n- Result: dry-run generated a metadata-only plan.");

  assert.match(body, new RegExp(AF009_SAFE_COMMENT_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(body, /Agent Factory Metadata Summary/);
  assert.doesNotMatch(body, /rawAnswer|providerPayload|billingData/);
});

test("duplicate safe comment marker behavior fails closed", () => {
  const prepared = planFor({
    mutationIntent: "add_safe_pr_comment",
    context: allGreenContext(validPrBody(), {
      comments: [
        { id: 1, body: `${AF009_SAFE_COMMENT_MARKER}\nold` },
        { id: 2, body: `${AF009_SAFE_COMMENT_MARKER}\nolder` },
      ],
    }),
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.equal(prepared.plan.commentUpdate.operation, "blocked_duplicate_marker");
  assert.match(prepared.plan.blockedReasons.join("\n"), /Multiple existing AF009 marker comments/);
});

test("mark_ready_for_review requires exact approval phrase for actual action", () => {
  const prepared = planFor({
    mutationIntent: "mark_ready_for_review",
    dryRun: false,
    approvalPhrase: "I approve a different action",
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), new RegExp(AF009_APPROVAL_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("mark_ready_for_review rejects blocked merge recommendation", () => {
  const body = validPrBody({
    mergeRecommendation: [
      "- [ ] Auto-merge candidate",
      "- [ ] Human approval required",
      "- [x] Blocked",
    ].join("\n"),
  });
  const prepared = planFor({
    mutationIntent: "mark_ready_for_review",
    dryRun: false,
    approvalPhrase: AF009_APPROVAL_PHRASE,
    context: allGreenContext(body),
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /Merge recommendation is blocked/);
});

test("mark_ready_for_review rejects missing or invalid pr_number", () => {
  const prepared = createSafeMutationPlan({
    mutationIntent: "mark_ready_for_review",
    prNumber: "not-a-number",
    dryRun: true,
    context: allGreenContext(),
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /pr_number is required/);
});

test("mark_ready_for_review treats already-ready PR as safe no-op", () => {
  const prepared = planFor({
    mutationIntent: "mark_ready_for_review",
    dryRun: false,
    approvalPhrase: AF009_APPROVAL_PHRASE,
    context: allGreenContext(validPrBody(), {
      pullRequest: { draft: false },
    }),
  });

  assert.equal(prepared.plan.status, "already_ready");
  assert.equal(prepared.plan.action, "none");
  assert.equal(prepared.plan.canExecute, false);
});

test("invalid mutation_intent fails safely", () => {
  const prepared = createSafeMutationPlan({
    mutationIntent: "merge_now",
    prNumber: 471,
    dryRun: true,
  });

  assert.equal(prepared.plan.status, "rejected");
  assert.match(prepared.plan.blockedReasons.join("\n"), /Invalid mutation_intent/);
});

test("actual add_safe_pr_comment updates existing marker instead of adding duplicate", () => {
  const prepared = planFor({
    mutationIntent: "add_safe_pr_comment",
    dryRun: false,
    approvalPhrase: AF009_APPROVAL_PHRASE,
    context: allGreenContext(validPrBody(), {
      comments: [{ id: 9, body: `${AF009_SAFE_COMMENT_MARKER}\nold` }],
    }),
  });

  assert.equal(prepared.plan.status, "planned");
  assert.equal(prepared.plan.action, "update_issue_comment");
  assert.equal(prepared.commentId, 9);
});

test("mark_ready_for_review accepts draft PR only when contract, evidence, and checks are safe", () => {
  const prepared = planFor({
    mutationIntent: "mark_ready_for_review",
    dryRun: false,
    approvalPhrase: AF009_APPROVAL_PHRASE,
  });

  assert.equal(prepared.plan.status, "planned");
  assert.equal(prepared.plan.action, "mark_ready_for_review");
  assert.equal(prepared.plan.readyForReview.prContractValid, true);
  assert.equal(prepared.plan.readyForReview.runtimeEvidenceMeaningful, true);
  assert.equal(prepared.plan.readyForReview.checksAcceptable, true);
});

test("AF009 focused test is wired into default node test run", () => {
  const runner = fs.readFileSync(TEST_RUNNER_PATH, "utf8");
  assert.match(runner, /tests\/agent-factory-safe-mutation-gate\.test\.mjs/);
});

test("active AF009 workflow and dispatcher introduce no branch, commit, push, merge, rebase, workflow-rerun, or Codex mutation paths", () => {
  const active = [
    fs.readFileSync(MUTATE_WORKFLOW, "utf8"),
    fs.readFileSync(MUTATE_SCRIPT, "utf8"),
  ].join("\n");

  assert.doesNotMatch(active, /\bgit\s+(?:commit|push|merge|rebase|checkout|reset)\b/i);
  assert.doesNotMatch(active, /\/merge\b|\/update-branch\b|\/rerun\b|createCommitOnBranch|mergePullRequest/i);
  assert.doesNotMatch(active, /codex\s+exec|npm\s+run\s+agent-factory:run/i);
});

test("CLI invalid mutation_intent writes safe summary without GitHub access", () => {
  const outputDir = tempDir("af009-invalid-intent");
  const result = runMutateScript([
    "--mutation-intent",
    "merge_now",
    "--pr-number",
    "471",
    "--output-dir",
    outputDir,
    "--stdout",
    "none",
  ]);
  const summary = fs.readFileSync(path.join(outputDir, "agent-factory-mutation-summary.md"), "utf8");
  const plan = JSON.parse(fs.readFileSync(path.join(outputDir, "mutation-plan.json"), "utf8"));

  assert.notEqual(result.status, 0);
  assert.equal(plan.status, "rejected");
  assert.match(summary, /Invalid mutation_intent/);
  assert.doesNotMatch(summary, /rawAnswer|ghp_should_not_escape/);
});
