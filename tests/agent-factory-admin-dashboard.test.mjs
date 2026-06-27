import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { loadAgentFactoryDashboardReport } from "../lib/agent-factory/dashboard-report.ts";

const PAGE_PATH = path.resolve("app/admin/factory/page.tsx");
const ADMIN_HOME_PATH = path.resolve("app/admin/page.tsx");
const DOC_PATH = path.resolve("docs/agent-factory-admin-dashboard.md");
const LOADER_PATH = path.resolve("lib/agent-factory/dashboard-report.ts");
const TEST_RUNNER_PATH = path.resolve("scripts/run-node-tests.mjs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `inverge-${label}-`));
}

function writeJson(dir, fileName, value) {
  fs.writeFileSync(path.join(dir, fileName), JSON.stringify(value, null, 2), "utf8");
}

function writeFixtures(dir) {
  writeJson(dir, "codex-task-packages.json", {
    version: 1,
    selectedTaskCount: 1,
    selectedItemIds: ["S209"],
    packages: [
      {
        itemId: "S209",
        itemTitle: "Theory Concept Corpus and Validator",
        branchName: "feat/s209-theory-concept-corpus-and-validator",
        powershellCommands: [
          "git fetch origin main",
          'git worktree add "..\\worktrees\\s209-theory" -b "feat/s209-theory-concept-corpus-and-validator" origin/main',
        ],
        codexPrompt: "Implement S209 only.",
        rawAnswer: "must not display",
        providerPayload: { text: "must not display" },
      },
    ],
  });

  writeJson(dir, "ci-watcher-report.json", {
    repo: "chachathecat/inverge",
    prNumber: 465,
    prState: "open_ready",
    workflowSummary: {
      state: "failed",
      passed: 2,
      failed: 1,
      pending: 1,
      skipped: 0,
    },
    failedDomains: ["lint_failure"],
    pendingDomains: ["build_failure"],
    skippedDomains: ["e2e_failure"],
    recommendedNextActions: ["request_codex_repair", "human_approval_required"],
    blockedReasons: ["Required build is still pending."],
    secretToken: "ghp_should_not_escape",
  });

  writeJson(dir, "pr-contract-doctor-report.json", {
    validAfter: true,
    issueReferenceStatus: {
      status: "valid",
      issueNumber: "465",
    },
    remainingWarnings: ["Review repaired body before manual paste."],
    repairedBody: "The repaired body text should not be rendered by the dashboard report.",
  });
  fs.writeFileSync(path.join(dir, "repaired-pr-body.md"), "sanitized repaired body", "utf8");

  writeJson(dir, "safe-repair-plan.json", {
    repairDomain: "lint_repair",
    repairAllowed: false,
    humanApprovalRequired: true,
    validationCommands: ["npm.cmd run lint", "npm.cmd run typecheck"],
    blockedReasons: ["Human approval required before execution."],
  });

  writeJson(dir, "merge-plan.json", {
    mergeReadiness: "human_approval_required",
    approvalGate: "human_review_required",
    rebaseRequired: false,
    mergeCandidate: false,
    blockedReasons: ["Human approval remains required."],
  });
}

test("admin factory dashboard route, docs, and loader exist with report-only copy", () => {
  for (const file of [PAGE_PATH, DOC_PATH, LOADER_PATH]) {
    assert.equal(fs.existsSync(file), true, `${file} should exist`);
  }

  const page = read(PAGE_PATH);
  const doc = read(DOC_PATH);
  const loader = read(LOADER_PATH);
  const combined = `${page}\n${doc}\n${loader}`;

  assert.match(page, /loadAgentFactoryDashboardReport/);
  assert.match(page, /hasAdminPageAccess/);
  assert.match(page, /AdminAccessDeniedPanel/);
  assert.match(page, /Agent Factory/);
  assert.match(combined, /read-only\/report-only/);
  assert.match(combined, /No mutation in dashboard v1/);
  assert.match(combined, /No Codex invocation/);
  assert.match(combined, /No learner runtime/);
  assert.match(combined, /No OCR/);
});

test("admin dashboard is linked from admin home but has no mutation controls", () => {
  const page = read(PAGE_PATH);
  const adminHome = read(ADMIN_HOME_PATH);

  assert.match(adminHome, /href="\/admin\/factory"/);
  assert.doesNotMatch(page, /<button\b/i);
  assert.doesNotMatch(page, /buttonVariants/);
  assert.doesNotMatch(page, /onClick=/);
  assert.doesNotMatch(page, /type="submit"/);
  assert.doesNotMatch(page, /\bfetch\s*\(/);
  assert.doesNotMatch(page, /create_pull_request|update_pull_request|mark_pull_request_ready_for_review/i);
  assert.doesNotMatch(page, /git push|git merge|git rebase --continue/i);
});

test("sample AF001 through AF005 artifacts render metadata safely", () => {
  const dir = tempDir("af008-fixtures");
  writeFixtures(dir);

  const report = loadAgentFactoryDashboardReport({
    reportDir: dir,
    now: new Date("2026-06-27T00:00:00.000Z"),
  });

  assert.equal(report.title, "Agent Factory");
  assert.equal(report.reportOnly, true);
  assert.equal(report.readOnly, true);
  assert.ok(report.lastUpdatedAt);

  assert.equal(report.nextWorkPackage.items[0].itemId, "S209");
  assert.equal(report.nextWorkPackage.items[0].branchSuggestion, "feat/s209-theory-concept-corpus-and-validator");
  assert.equal(report.nextWorkPackage.items[0].codexPromptAvailable, true);
  assert.match(report.nextWorkPackage.items[0].worktreeCommand, /git worktree add/);

  assert.equal(report.prCiWatcher.prNumber, "465");
  assert.equal(report.prCiWatcher.prState, "open_ready");
  assert.equal(report.prCiWatcher.workflowState, "failed");
  assert.deepEqual(report.prCiWatcher.failedDomains, ["lint_failure"]);
  assert.deepEqual(report.prCiWatcher.pendingDomains, ["build_failure"]);
  assert.deepEqual(report.prCiWatcher.skippedDomains, ["e2e_failure"]);
  assert.ok(report.prCiWatcher.recommendedNextActions.includes("request_codex_repair"));

  assert.equal(report.prBodyDoctor.validAfter, "yes");
  assert.equal(report.prBodyDoctor.issueReference, "valid (465)");
  assert.equal(report.prBodyDoctor.repairedBodyArtifactAvailable, true);

  assert.equal(report.repairPlan.repairDomain, "lint_repair");
  assert.equal(report.repairPlan.repairAllowed, "no");
  assert.equal(report.repairPlan.humanApprovalRequired, "yes");
  assert.ok(report.repairPlan.validationCommands.includes("npm.cmd run lint"));
  assert.deepEqual(report.repairPlan.blockedReasons, ["Human approval required before execution."]);

  assert.equal(report.mergePlan.mergeReadiness, "human_approval_required");
  assert.equal(report.mergePlan.approvalGate, "human_review_required");
  assert.equal(report.mergePlan.rebaseRequired, "no");
  assert.equal(report.mergePlan.mergeCandidate, "no");
  assert.deepEqual(report.mergePlan.blockedReasons, ["Human approval remains required."]);
});

test("missing artifact states are actionable", () => {
  const dir = tempDir("af008-missing");
  const report = loadAgentFactoryDashboardReport({ reportDir: dir });

  assert.equal(report.nextWorkPackage.status, "missing");
  assert.match(report.nextWorkPackage.emptyState, /Run plan_only/);
  assert.equal(report.prCiWatcher.status, "missing");
  assert.match(report.prCiWatcher.emptyState, /Run watch_live or watch_snapshot/);
  assert.equal(report.repairPlan.status, "missing");
  assert.match(report.repairPlan.emptyState, /Run repair_plan_live or repair_plan/);
  assert.equal(report.mergePlan.status, "missing");
  assert.match(report.mergePlan.emptyState, /Run merge_plan_live or merge_plan/);
});

test("dashboard report excludes secret-looking and raw-content fields", () => {
  const dir = tempDir("af008-boundary");
  writeFixtures(dir);
  const report = loadAgentFactoryDashboardReport({ reportDir: dir });
  const serialized = JSON.stringify(report);

  for (const forbidden of [
    "secretToken",
    "ghp_should_not_escape",
    "rawAnswer",
    "ocrText",
    "problemText",
    "answerBody",
    "providerPayload",
    "billingData",
    "privateUserContent",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `${forbidden} should not appear in dashboard output`);
  }

  assert.equal(serialized.includes("The repaired body text should not be rendered"), false);
});

test("learner-facing routes do not link to the admin factory dashboard", () => {
  const learnerSources = [
    "components/review-os/app-shell.tsx",
    "components/learner/learner-ui.tsx",
    "app/app/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/review/page.tsx",
    "app/app/notes/page.tsx",
    "app/page.tsx",
  ];

  for (const file of learnerSources) {
    assert.equal(read(file).includes("/admin/factory"), false, `${file} must not link /admin/factory`);
  }
});

test("AF008 focused test is wired into the default node test run", () => {
  const runner = read(TEST_RUNNER_PATH);
  assert.match(runner, /tests\/agent-factory-admin-dashboard\.test\.mjs/);
});
