import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const reportPath = "docs/closed-beta-first-cohort-day-0-readiness-evidence-2026-06-14.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

function expectIncludes(text, phrases) {
  phrases.forEach((phrase) => assert.equal(text.includes(phrase), true, `expected ${phrase}`));
}

test("first cohort Day 0 readiness evidence report exists and includes run metadata", () => {
  assert.equal(existsSync(reportPath), true, `${reportPath} should exist`);
  const report = read(reportPath);

  expectIncludes(report, [
    "Closed Beta First Cohort Day 0 Readiness Evidence v1",
    "date: 2026-06-14",
    "tester: Codex local documentation QA",
    "commit SHA: 4d22e80025ffae337f4dfdec7f023eb222547f9b",
    "target label: latest main after PR #388 merge, docs/tests-only Day 0 evidence branch",
    "account mode: not_applicable for this evidence PR; no invited-account credentials were used",
    "persistence mode: mixed documented evidence; durable invited-account runtime remains partial",
    "cohort size decision: 3 to 5 trusted invited users only",
    "final decision: **pause until blockers fixed**",
  ]);
});

test("first cohort Day 0 readiness evidence report states constrained Conditional Go framing", () => {
  const report = read(reportPath);

  expectIncludes(report, [
    "Conditional Go, not full production readiness",
    "3 to 5 trusted invited users only",
    "not public beta",
    "not paid beta",
    "not production launch",
    "not official grading/model-answer/score/pass-fail",
  ]);
});

test("first cohort Day 0 readiness evidence report includes required evidence sections", () => {
  const report = read(reportPath);

  expectIncludes(report, [
    "Day 0 Checklist Evidence Table",
    "item | status: pass / partial / blocked / not_applicable | owner | evidence summary | follow-up PR | launch impact: continue / pause / stop",
    "Required Approval Evidence",
    "founder/product owner approval status",
    "engineering owner approval status",
    "safety/data-boundary approval status",
    "support owner approval status",
    "stop-rule owner assigned status",
    "Cohort Evidence",
    "invited user count",
    "user aliases only, no real personal data",
    "support channel prepared",
    "beta limitations sent",
    "no Q-Net/raw official material instruction sent",
    "Account And Durable Target Evidence",
    "non-production durable target status",
    "learner-only invited accounts status",
    "no instructor/admin privileges status",
    "account isolation status",
    "reset/cleanup plan status",
    "secret handling status",
    "durable_saved proof status",
    "local_fallback_saved proof status",
    "save_failed proof status",
  ]);
});

test("first cohort Day 0 readiness evidence report includes capture, learner loop, review completion, and metrics evidence", () => {
  const report = read(reportPath);

  expectIncludes(report, [
    "Capture/OCR Evidence",
    "text-first capture baseline",
    "PDF fallback",
    "image upload control",
    "provider-disabled synthetic image OCR smoke",
    "OCR draft/editable-before-save copy",
    "provider request count if tested",
    "no screenshots, raw uploads, or OCR full text committed",
    "Learner Loop Evidence",
    "Capture -> learner-owned note",
    "biggest gap",
    "next action",
    "Today Plan max 3",
    "Review Queue reflection",
    "Notes reflection",
    "provider-free telemetry",
    "local fallback",
    "save_failed recovery",
    "Review Completion Evidence",
    "local Review route proof",
    "review_completed telemetry",
    "account-backed Review completion proof",
    "refresh completion state",
    "save_failed excluded from ready queue evidence",
    "Metrics/Reporting Readiness",
    "daily beta note template ready",
    "weekly beta report template ready",
    "feedback intake ready",
    "bug/support intake ready",
    "stop-rule incident template ready",
    "daily owner assigned",
    "weekly owner assigned",
  ]);
});

test("first cohort Day 0 readiness evidence report includes stop-rule review and final decision", () => {
  const report = read(reportPath);

  expectIncludes(report, [
    "Stop-rule Review",
    "official grading/model-answer/score/pass-fail appeared",
    "instructor/admin console appeared",
    "raw Q-Net/raw official material exposed",
    "local_official_materials or qnet_manifest appeared",
    "credentials/secrets exposed",
    "account isolation failed",
    "telemetry stored raw learner text or forbidden fields",
    "persistence copy overclaimed durable save",
    "save_failed appeared as ready Review Queue evidence",
    "core loop broke for most testers",
    "Final Decision",
    "launch 3 to 5 trusted invited users under Conditional Go",
    "pause until blockers fixed: **selected**",
    "stop beta",
    "do not expand",
    "do not paid-beta",
    "do not public-beta",
    "Known Partials",
    "durable invited-account persistence partial",
    "full image OCR execution partial",
    "account-backed Review completion partial",
  ]);
});

test("first cohort Day 0 readiness evidence report includes safety boundaries and validation commands", () => {
  const report = read(reportPath);

  expectIncludes(report, [
    "no credentials committed",
    "no secrets committed",
    "no `.env` committed",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no raw official text",
    "no raw learner text",
    "no OCR full text",
    "no screenshots committed",
    "no raw uploads committed",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no payment",
    "no analytics provider calls",
    "no AI provider calls",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ]);
});

test("first cohort Day 0 readiness evidence report avoids credentials, secrets, token-like placeholders, env contents, local paths, screenshots, transient files, raw binaries, committed uploads, OCR full text examples, and raw learner answer/problem examples", () => {
  const report = read(reportPath);

  assert.doesNotMatch(report, /[A-Za-z]:\\/);
  assert.doesNotMatch(report, /file:\/\//i);
  assert.doesNotMatch(report, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(report, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(report, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(report, /temp(?:orary)? file/i);
  assert.doesNotMatch(report, /committed uploads?:\s*.+/i);
  assert.doesNotMatch(report, /(?:password|secret|token|service[_ -]?role|database[_ -]?url|supabase[_ -]?key)\s*[:=]\s*["']?[^,\s`]+/i);
  assert.doesNotMatch(report, /(?:sk_live|sk_test|eyJ[A-Za-z0-9_-]{8,}|sbp_[A-Za-z0-9_-]+)/i);
  assert.doesNotMatch(report, /raw official problem text\s*:/i);
  assert.doesNotMatch(report, /raw official answer text\s*:/i);
  assert.doesNotMatch(report, /OCR full text\s*:/i);
  assert.doesNotMatch(report, /raw learner answer text\s*:/i);
  assert.doesNotMatch(report, /raw learner problem text\s*:/i);
});

test("first cohort Day 0 readiness evidence test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/closed-beta-first-cohort-day-0-readiness-evidence.test.mjs"), true);
});
