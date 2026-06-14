import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/closed-beta-first-cohort-day-0-readiness.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

function expectIncludes(text, phrases) {
  phrases.forEach((phrase) => assert.equal(text.includes(phrase), true, `expected ${phrase}`));
}

test("first cohort Day 0 readiness doc exists and states launch decision", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  expectIncludes(doc, [
    "Closed Beta First Cohort Day 0 Readiness v1",
    "Conditional Go, not full production readiness",
    "3 to 5 trusted invited users only",
    "not public beta",
    "not paid beta",
    "not production launch",
    "not official grading or score prediction",
  ]);
});

test("first cohort Day 0 readiness doc includes approvals, cohort readiness, and account target readiness", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Required Approvals",
    "founder/product owner approval",
    "engineering owner approval",
    "safety/data-boundary approval",
    "support owner approval",
    "stop-rule owner assigned",
    "Cohort Readiness",
    "3 to 5 trusted invited users identified",
    "users understand beta limitations",
    "users understand no official grading/model-answer/score/pass-fail",
    "users instructed to use learner-owned notes only",
    "users instructed not to upload Q-Net/raw official materials for QA",
    "user aliases prepared for reports",
    "support channel shared",
    "Account And Durable Target Readiness",
    "non-production durable target ready or explicitly marked partial",
    "learner-only invited accounts ready or explicitly marked partial",
    "no instructor/admin privileges for learner accounts",
    "account isolation plan ready",
    "reset/cleanup plan ready",
    "secret handling checked",
    "no credentials or secrets in repo",
  ]);
});

test("first cohort Day 0 readiness doc includes capture/OCR, learner loop, and review completion readiness", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Capture/OCR Readiness",
    "text-first capture baseline ready",
    "PDF fallback behavior ready",
    "image upload control readiness",
    "provider-disabled synthetic image OCR smoke ready or explicitly marked partial",
    "OCR draft/editable-before-save copy confirmed",
    "no OCR provider call required for Day 0 unless explicitly approved",
    "no screenshots, raw uploads, or OCR full text committed",
    "Learner Loop Readiness",
    "Capture -> learner-owned note",
    "biggest gap",
    "next action",
    "Today Plan max 3",
    "Review Queue reflection",
    "Notes reflection",
    "provider-free telemetry evidence",
    "local fallback evidence",
    "save_failed recovery rule",
    "Review Completion Readiness",
    "local Review route proof ready",
    "provider-free review_completed telemetry ready",
    "account-backed Review completion proof ready or explicitly marked partial",
    "save_failed excluded from ready queue evidence",
    "completion copy does not imply score/pass/fail",
  ]);
});

test("first cohort Day 0 readiness doc includes metrics, known partials, stop rules, and checklist table", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Metrics/Reporting Readiness",
    "daily beta note template ready",
    "weekly beta report template ready",
    "user feedback intake ready",
    "bug/support intake ready",
    "stop-rule incident template ready",
    "first-cohort final decision template ready",
    "daily owner assigned",
    "weekly owner assigned",
    "Known Partials",
    "durable invited-account persistence may remain partial until approved durable target and learner accounts are available",
    "full image OCR execution may remain partial until provider-disabled synthetic image smoke is executed",
    "account-backed Review completion may remain partial until durable queue item proof is executed",
    "#380/#381/#382/#385/#386/#387",
    "Stop Rules",
    "official grading/model-answer/score/pass-fail appears to learners",
    "instructor/admin console appears to learners",
    "raw Q-Net/raw official materials are exposed",
    "local_official_materials or qnet_manifest appears",
    "credentials/secrets are exposed",
    "account isolation fails",
    "telemetry stores raw learner text or forbidden fields",
    "persistence copy overclaims durable save",
    "save_failed appears as ready Review Queue evidence",
    "core Capture -> Note -> Today Plan -> Review Queue -> Notes loop breaks for most testers",
    "Day 0 Checklist Table",
    "item | status: pass / partial / blocked / not_applicable | owner | evidence summary | follow-up PR | launch impact: continue / pause / stop",
  ]);
});

test("first cohort Day 0 readiness doc includes final decision template and safety boundaries", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Final Day 0 Decision Template",
    "launch 3 to 5 trusted invited users under Conditional Go",
    "pause until blockers fixed",
    "stop beta",
    "do not expand",
    "do not paid-beta",
    "do not public-beta",
    "Safety Boundaries",
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
  ]);
});

test("first cohort Day 0 readiness doc includes validation commands", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ]);
});

test("first cohort Day 0 readiness doc avoids credentials, secrets, token-like placeholders, local paths, screenshots, transient files, raw binaries, committed uploads, OCR full text examples, and raw learner answer/problem examples", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /[A-Za-z]:\\/);
  assert.doesNotMatch(doc, /file:\/\//i);
  assert.doesNotMatch(doc, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(doc, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(doc, /temp(?:orary)? file/i);
  assert.doesNotMatch(doc, /committed uploads?:\s*.+/i);
  assert.doesNotMatch(doc, /(?:password|secret|token|service[_ -]?role|database[_ -]?url|supabase[_ -]?key)\s*[:=]\s*["']?[^,\s`]+/i);
  assert.doesNotMatch(doc, /(?:sk_live|sk_test|eyJ[A-Za-z0-9_-]{8,}|sbp_[A-Za-z0-9_-]+)/i);
  assert.doesNotMatch(doc, /raw official problem text\s*:/i);
  assert.doesNotMatch(doc, /raw official answer text\s*:/i);
  assert.doesNotMatch(doc, /OCR full text\s*:/i);
  assert.doesNotMatch(doc, /raw learner answer text\s*:/i);
  assert.doesNotMatch(doc, /raw learner problem text\s*:/i);
});

test("first cohort Day 0 readiness test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/closed-beta-first-cohort-day-0-readiness.test.mjs"), true);
});
