import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  assertRebaseMergePlanSafe,
  createRebaseMergePlan,
} from "../lib/agent-factory/rebase-merge-orchestrator.ts";

const BASE_SHA = "a".repeat(40);
const HEAD_SHA = "b".repeat(40);
const MERGE_SCRIPT = path.resolve("scripts/agent-factory-merge-plan.mjs");

function check(name, conclusion = "SUCCESS", overrides = {}) {
  return {
    name,
    workflowName: overrides.workflowName ?? "Fast CI",
    status: overrides.status ?? "COMPLETED",
    conclusion,
    required: overrides.required ?? true,
    ...overrides,
  };
}

function greenChecks(extra = []) {
  return [
    check("typecheck"),
    check("lint"),
    check("unit tests"),
    check("build"),
    ...extra,
  ];
}

function snapshot(overrides = {}) {
  return {
    repo: "chachathecat/inverge",
    number: 459,
    title: "[AF005] Rebase/Merge Orchestrator and Approval Gate Planner v1",
    state: "OPEN",
    isDraft: false,
    baseRefOid: BASE_SHA,
    headRefOid: HEAD_SHA,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    labels: [],
    files: [{ path: "lib/agent-factory/rebase-merge-orchestrator.ts" }],
    statusCheckRollup: greenChecks(),
    ...overrides,
  };
}

test("all-green non-draft low-risk source-level PR becomes merge candidate with human approval", () => {
  const report = createRebaseMergePlan(snapshot());

  assert.equal(report.mergeReadiness, "merge_candidate");
  assert.equal(report.approvalGate, "human_review_required");
  assert.equal(report.mergeCandidate, true);
  assert.equal(report.humanApprovalRequired, true);
  assert.equal(report.mergeMethodRecommendation, "squash_merge_after_human_approval");
});

test("all-green draft PR recommends ready-for-review, not merge", () => {
  const report = createRebaseMergePlan(snapshot({ isDraft: true }));

  assert.equal(report.mergeReadiness, "not_ready_draft");
  assert.equal(report.readyForReviewRecommended, true);
  assert.equal(report.mergeCandidate, false);
  assert.equal(report.mergeMethodRecommendation, "mark_ready_for_review");
});

test("pending CI blocks merge and recommends wait", () => {
  const report = createRebaseMergePlan(
    snapshot({
      statusCheckRollup: [
        check("typecheck", null, { status: "IN_PROGRESS" }),
      ],
    }),
  );

  assert.equal(report.mergeReadiness, "waiting_for_ci");
  assert.equal(report.mergeCandidate, false);
  assert.equal(report.mergeMethodRecommendation, "wait_for_ci");
  assert.ok(report.blockedReasons.some((reason) => reason.includes("CI")));
});

test("failed CI routes to repair_required", () => {
  const report = createRebaseMergePlan(
    snapshot({
      statusCheckRollup: [
        check("typecheck", "FAILURE"),
      ],
    }),
  );

  assert.equal(report.mergeReadiness, "repair_required");
  assert.equal(report.mergeCandidate, false);
  assert.equal(report.mergeMethodRecommendation, "run_af003_or_af004_repair_plan");
});

test("PR Contract failure routes to AF003 or AF004 path, not merge", () => {
  const report = createRebaseMergePlan(
    snapshot({
      statusCheckRollup: [
        check("Validate PR Contract", "FAILURE", { workflowName: "Fast CI" }),
      ],
    }),
  );

  assert.equal(report.mergeReadiness, "repair_required");
  assert.equal(report.mergeCandidate, false);
  assert.ok(report.blockedReasons.some((reason) => reason.includes("PR Contract")));
  assert.ok(report.riskNotes.some((note) => note.includes("AF003 PR Contract Doctor")));
});

test("behind-main and diverged states produce rebase_required with PowerShell commands", () => {
  for (const mergeability of ["behind_main", "diverged"]) {
    const report = createRebaseMergePlan(snapshot({ mergeability }));

    assert.equal(report.mergeReadiness, "rebase_required");
    assert.equal(report.rebaseRequired, true);
    assert.ok(report.rebaseCommands.includes("git fetch origin main"));
    assert.ok(report.rebaseCommands.includes("git rebase origin/main"));
    assert.equal(report.mergeCandidate, false);
  }
});

test("conflict state blocks merge and recommends human conflict resolution", () => {
  const report = createRebaseMergePlan(snapshot({ mergeability: "conflict" }));

  assert.equal(report.mergeReadiness, "blocked");
  assert.equal(report.rebaseRequired, true);
  assert.equal(report.mergeMethodRecommendation, "do_not_merge");
  assert.ok(report.blockedReasons.some((reason) => reason.includes("conflicts")));
  assert.ok(report.rebaseCommands.includes("git rebase --abort"));
});

test("source-level planner docs tests PR tolerates skipped E2E when required gates are green", () => {
  const report = createRebaseMergePlan(
    snapshot({
      files: [
        { path: "docs/agent-factory-rebase-merge-orchestrator.md" },
        { path: "tests/agent-factory-rebase-merge-orchestrator.test.mjs" },
      ],
      statusCheckRollup: [
        check("typecheck"),
        check("lint"),
        check("Playwright E2E", "SKIPPED", { workflowName: "Full CI" }),
      ],
    }),
  );

  assert.equal(report.mergeReadiness, "merge_candidate");
  assert.equal(report.validationSummary.skippedE2eTolerated, true);
  assert.equal(report.mergeCandidate, true);
});

test("payment auth db runtime secrets migration and user-data paths force approval or blocked", () => {
  const ownerGated = createRebaseMergePlan(
    snapshot({
      files: [
        { path: "app/api/auth/callback/route.ts" },
        { path: "supabase/migrations/202606260001_policy.sql" },
      ],
    }),
  );
  const productionGated = createRebaseMergePlan(
    snapshot({
      files: [{ path: "app/api/review/route.ts" }],
    }),
  );
  const blocked = createRebaseMergePlan(
    snapshot({
      files: [{ path: "scripts/delete-user-data-now.mjs" }],
    }),
  );

  assert.equal(ownerGated.approvalGate, "owner_approval_required");
  assert.equal(ownerGated.mergeReadiness, "human_approval_required");
  assert.equal(ownerGated.mergeCandidate, false);
  assert.equal(productionGated.approvalGate, "production_environment_approval_required");
  assert.equal(productionGated.mergeCandidate, false);
  assert.equal(blocked.approvalGate, "blocked_no_auto_path");
  assert.equal(blocked.mergeReadiness, "blocked");
});

test("sibling PRs touching roadmap produce merge-order and rebase notes", () => {
  const report = createRebaseMergePlan(
    snapshot({
      files: [{ path: "roadmap/active-program.yml" }],
    }),
    {
      siblingPullRequests: [
        {
          number: 458,
          title: "[AF004] Safe Repair Loop",
          files: [{ path: "roadmap/active-program.yml" }],
        },
      ],
    },
  );

  assert.ok(report.mergeOrderNotes.some((note) => note.includes("Sibling PR overlap")));
  assert.ok(report.mergeOrderNotes.some((note) => note.includes("preserve") || note.includes("Preserve")));
  assert.ok(report.mergeOrderNotes.some((note) => note.includes("rebase")));
});

test("already merged and closed-unmerged states are classified correctly", () => {
  const merged = createRebaseMergePlan(snapshot({ state: "MERGED", merged: true }));
  const closed = createRebaseMergePlan(snapshot({ state: "CLOSED", merged: false }));

  assert.equal(merged.mergeReadiness, "already_merged");
  assert.equal(merged.mergeCandidate, false);
  assert.equal(closed.mergeReadiness, "closed_unmerged");
  assert.equal(closed.mergeCandidate, false);
});

test("output contains no secret-looking keys or raw-content fields", () => {
  const report = createRebaseMergePlan(
    snapshot({
      secretToken: "ghp_should_not_escape",
      rawAnswer: "learner answer must not escape",
      ocrText: "ocr text must not escape",
      providerPayload: { body: "provider payload must not escape" },
    }),
  );
  const serialized = JSON.stringify(report);

  assert.doesNotThrow(() => assertRebaseMergePlanSafe(report));
  assert.equal(serialized.includes("secretToken"), false);
  assert.equal(serialized.includes("rawAnswer"), false);
  assert.equal(serialized.includes("ocrText"), false);
  assert.equal(serialized.includes("providerPayload"), false);
});

test("generated report includes validation summary, rollback and merge-order notes, and approval gate", () => {
  const report = createRebaseMergePlan(snapshot());

  assert.equal(report.validationSummary.metadataOnly, true);
  assert.equal(report.validationSummary.mutatesGitHub, false);
  assert.equal(report.validationSummary.mutatesRuntimeState, false);
  assert.equal(report.approvalGate, "human_review_required");
  assert.ok(report.mergeOrderNotes.length > 0);
  assert.ok(report.riskNotes.some((note) => note.includes("Rollback")));
  assert.match(report.markdownSummary, /AF005 Rebase\/Merge Orchestrator Report/);
});

test("CLI writes JSON and Markdown merge-plan artifacts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-merge-plan-"));
  const snapshotPath = path.join(directory, "snapshot.json");
  const jsonPath = path.join(directory, "plan.json");
  const markdownPath = path.join(directory, "plan.md");
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot()), "utf8");

  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      "./tests/ts-extension-loader.mjs",
      MERGE_SCRIPT,
      "--input",
      snapshotPath,
      "--json",
      jsonPath,
      "--markdown",
      markdownPath,
      "--stdout",
      "none",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).mergeReadiness, "merge_candidate");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF005 Rebase\/Merge Orchestrator Report/);
});
