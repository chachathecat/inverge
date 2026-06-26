import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  assertCiWatcherReportSafe,
  createCiWatcherReport,
} from "../lib/agent-factory/ci-watcher.ts";

const BASE_SHA = "a".repeat(40);
const HEAD_SHA = "b".repeat(40);

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
    check("typecheck", "SUCCESS"),
    check("lint", "SUCCESS"),
    check("unit tests", "SUCCESS"),
    check("build", "SUCCESS"),
    ...extra,
  ];
}

function snapshot(overrides = {}) {
  return {
    repo: "chachathecat/inverge",
    number: 453,
    title: "[AF002] GitHub CI Watcher and Failure Classifier v1",
    state: "OPEN",
    isDraft: false,
    baseRefOid: BASE_SHA,
    headRefOid: HEAD_SHA,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    labels: [],
    files: [{ path: "lib/agent-factory/ci-watcher.ts" }],
    statusCheckRollup: greenChecks(),
    ...overrides,
  };
}

test("all-green non-draft low-risk PR becomes merge candidate with human approval by default", () => {
  const report = createCiWatcherReport(snapshot());

  assert.equal(report.prState, "open_ready");
  assert.equal(report.workflowSummary.state, "all_green");
  assert.equal(report.mergeCandidate, true);
  assert.equal(report.humanApprovalRequired, true);
  assert.deepEqual(report.recommendedNextActions, [
    "human_approval_required",
    "merge_candidate",
  ]);
});

test("all-green draft PR recommends mark_ready_for_review", () => {
  const report = createCiWatcherReport(snapshot({ isDraft: true }));

  assert.equal(report.prState, "draft");
  assert.equal(report.mergeCandidate, false);
  assert.ok(report.recommendedNextActions.includes("mark_ready_for_review"));
  assert.equal(report.recommendedNextActions.includes("merge_candidate"), false);
});

test("pending workflows recommend wait_for_ci", () => {
  const report = createCiWatcherReport(
    snapshot({
      statusCheckRollup: [
        check("typecheck", null, { status: "IN_PROGRESS" }),
      ],
    }),
  );

  assert.equal(report.workflowSummary.state, "pending");
  assert.ok(report.recommendedNextActions.includes("wait_for_ci"));
  assert.equal(report.mergeCandidate, false);
});

test("PR Contract failure recommends fix_pr_contract before code repair", () => {
  const report = createCiWatcherReport(
    snapshot({
      statusCheckRollup: [
        check("Validate PR Contract", "FAILURE", { workflowName: "Fast CI" }),
      ],
    }),
  );

  assert.deepEqual(report.failedDomains, ["pr_contract_failure"]);
  assert.ok(report.recommendedNextActions.includes("fix_pr_contract"));
  assert.equal(report.recommendedNextActions.includes("request_codex_repair"), false);
});

test("Fast CI PR Contract step is not classified as generic Fast CI failure", () => {
  const report = createCiWatcherReport(
    snapshot({
      statusCheckRollup: [
        check("Fast CI", "FAILURE", {
          workflowName: "Fast CI",
          failureStep: "validate-pr-contract",
        }),
      ],
    }),
  );

  assert.deepEqual(report.failedDomains, ["pr_contract_failure"]);
  assert.equal(report.failedDomains.includes("fast_ci_failure"), false);
  assert.ok(report.recommendedNextActions.includes("fix_pr_contract"));
});

test("lint, typecheck, focused-test, and build failures map to repair domains", () => {
  const report = createCiWatcherReport(
    snapshot({
      statusCheckRollup: [
        check("typecheck", "FAILURE"),
        check("eslint lint", "FAILURE"),
        check("focused test: tests/agent-factory-ci-watcher.test.mjs", "FAILURE"),
        check("next build", "FAILURE"),
      ],
    }),
  );

  assert.deepEqual(report.failedDomains, [
    "typecheck_failure",
    "lint_failure",
    "focused_test_failure",
    "build_failure",
  ]);
  assert.ok(report.recommendedNextActions.includes("request_codex_repair"));
});

test("conflict, diverged, and behind-main states recommend rebase or branch update", () => {
  for (const mergeability of ["conflict", "diverged", "behind_main"]) {
    const report = createCiWatcherReport(snapshot({ mergeability }));
    assert.equal(report.mergeability, mergeability);
    assert.ok(report.recommendedNextActions.includes("request_rebase"));
    assert.equal(report.mergeCandidate, false);
  }
});

test("skipped E2E alone does not block source-level planner docs tests PRs", () => {
  const report = createCiWatcherReport(
    snapshot({
      files: [
        { path: "docs/agent-factory-ci-watcher.md" },
        { path: "tests/agent-factory-ci-watcher.test.mjs" },
      ],
      statusCheckRollup: [
        check("typecheck", "SUCCESS"),
        check("lint", "SUCCESS"),
        check("Playwright E2E", "SKIPPED", { workflowName: "Full CI" }),
      ],
    }),
  );

  assert.equal(report.workflowSummary.state, "mixed");
  assert.deepEqual(report.skippedDomains, ["e2e_failure"]);
  assert.equal(report.mergeCandidate, true);
  assert.equal(report.blockedReasons.length, 0);
});

test("high-risk payment auth runtime labels or paths force human approval and no merge candidate", () => {
  const report = createCiWatcherReport(
    snapshot({
      labels: [{ name: "payment" }, { name: "security" }],
      files: [{ path: "app/api/auth/callback/route.ts" }],
    }),
  );

  assert.equal(report.humanApprovalRequired, true);
  assert.equal(report.mergeCandidate, false);
  assert.ok(report.recommendedNextActions.includes("human_approval_required"));
  assert.ok(report.blockedReasons.some((reason) => reason.includes("High-risk")));
});

test("output contains no secret-looking keys or raw-content fields", () => {
  const report = createCiWatcherReport(
    snapshot({
      secretToken: "ghp_should_not_escape",
      rawAnswer: "learner answer must not escape",
      ocrText: "ocr text must not escape",
      providerPayload: { body: "provider payload must not escape" },
    }),
  );
  const serialized = JSON.stringify(report);

  assert.doesNotThrow(() => assertCiWatcherReportSafe(report));
  assert.equal(serialized.includes("secretToken"), false);
  assert.equal(serialized.includes("rawAnswer"), false);
  assert.equal(serialized.includes("ocrText"), false);
  assert.equal(serialized.includes("providerPayload"), false);
});

test("invalid or missing workflow data fails safely with actionable blocked reasons", () => {
  const report = createCiWatcherReport(
    snapshot({
      statusCheckRollup: [],
    }),
  );

  assert.equal(report.workflowSummary.state, "pending");
  assert.equal(report.workflowSummary.hasInvalidWorkflowData, true);
  assert.ok(report.recommendedNextActions.includes("wait_for_ci"));
  assert.ok(report.recommendedNextActions.includes("blocked"));
  assert.ok(report.blockedReasons.some((reason) => reason.includes("Workflow data is missing")));
});

test("CLI reads a snapshot and writes JSON and Markdown reports", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-ci-watcher-"));
  const snapshotPath = path.join(directory, "snapshot.json");
  const jsonPath = path.join(directory, "report.json");
  const markdownPath = path.join(directory, "report.md");
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot()), "utf8");

  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      "./tests/ts-extension-loader.mjs",
      "scripts/agent-factory-watch.mjs",
      "--snapshot",
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
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).mergeCandidate, true);
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF002 CI Watcher Report/);
});
