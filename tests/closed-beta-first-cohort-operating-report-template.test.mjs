import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/closed-beta-first-cohort-operating-report-template.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("first cohort operating report template doc exists and states cohort setup", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "Conditional Go, not full production readiness",
    "3 to 5 trusted invited users",
    "Cohort Setup",
    "Tester profile",
    "Account mode",
    "Persistence mode",
    "Support channel",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("first cohort operating report template includes known partials from recent runtime proof PRs", () => {
  const doc = read(docPath);

  [
    "durable invited-account persistence remains partial until approved credentials and non-production durable target are available",
    "full image OCR execution remains partial until provider-disabled synthetic image smoke is completed",
    "account-backed Review completion remains partial until durable queue item evidence is available",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("first cohort operating report template includes setup, daily, weekly, feedback, support, incident, and final decision templates", () => {
  const doc = read(docPath);

  [
    "Day 0 Setup Checklist",
    "Invited account prepared",
    "Non-production durable target confirmed or marked unavailable",
    "Safety boundary reviewed",
    "Stop rules reviewed",
    "Synthetic/learner-owned input guidance sent",
    "No Q-Net/raw official material guidance sent",
    "Daily Beta Note Template",
    "Weekly Beta Report Template",
    "User Feedback Intake Template",
    "Bug / Support Intake Template",
    "Stop-rule Incident Template",
    "Final First-cohort Decision Template",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("first cohort operating report template includes required daily and weekly fields", () => {
  const doc = read(docPath);

  [
    "date",
    "active invited users",
    "first_capture_completed",
    "capture_note_created",
    "biggest_gap_identified",
    "next_action_created",
    "today_plan_task_selected",
    "review_queue_item_created",
    "notes_reflected",
    "loop_closed",
    "local_fallback_loop",
    "durable_loop_closed",
    "save_failed",
    "support issues",
    "boundary safety incidents",
    "qualitative notes",
    "decision: continue / pause / stop",
    "users with 2+ capture days",
    "note-to-plan conversion",
    "review queue reflection",
    "review completion evidence",
    "OCR correction friction",
    "persistence evidence",
    "top 3 user feedback themes",
    "top 3 blockers",
    "stop-rule incidents",
    "next PRs",
  ].forEach((phrase) => assert.equal(doc.toLowerCase().includes(phrase.toLowerCase()), true, `doc should include ${phrase}`));
});

test("first cohort operating report template includes feedback, support, incident, and final decision fields", () => {
  const doc = read(docPath);

  [
    "user alias",
    "exam mode",
    "moment of friction",
    "what they expected",
    "what happened",
    "whether they understood next action",
    "whether they trusted OCR/AI draft",
    "whether they would use again tomorrow",
    "quote summary only, no raw learner answer/problem text",
    "issue id",
    "route",
    "severity",
    "reproduction summary",
    "persistence status",
    "telemetry status",
    "Raw data included: must be no",
    "boundary risk",
    "owner",
    "next action",
    "incident id",
    "stop rule triggered",
    "affected route",
    "evidence summary",
    "Raw official or raw learner text included: must be no",
    "immediate action",
    "follow-up PR",
    "continue limited beta",
    "pause and fix blockers",
    "stop beta",
    "expand only after blockers cleared",
    "Do not proceed to paid beta until retention/review/recovered-concept signals exist",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("first cohort operating report template includes safety boundaries and raw-data exclusion", () => {
  const doc = read(docPath);

  [
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no raw official text",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no payment",
    "no analytics provider calls",
    "no AI provider calls",
    "no raw learner text in reports",
    "no screenshots or raw uploads committed",
    "metadata-only",
    "raw learner OCR text",
    "raw learner answer text",
    "raw learner problem text",
    "OCR full text",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("first cohort operating report template avoids local raw paths, raw official paths, screenshot paths, temp paths, raw binary paths, committed uploads, OCR full text examples, and raw learner answer/problem examples", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /[A-Za-z]:\\/);
  assert.doesNotMatch(doc, /file:\/\//i);
  assert.doesNotMatch(doc, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(doc, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(doc, /temp(?:orary)? file/i);
  assert.doesNotMatch(doc, /committed uploads?:\s*.+/i);
  assert.doesNotMatch(doc, /raw official problem text\s*:/i);
  assert.doesNotMatch(doc, /raw official answer text\s*:/i);
  assert.doesNotMatch(doc, /OCR full text\s*:/i);
  assert.doesNotMatch(doc, /raw learner answer text\s*:/i);
  assert.doesNotMatch(doc, /raw learner problem text\s*:/i);
});

test("first cohort operating report template test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/closed-beta-first-cohort-operating-report-template.test.mjs"), true);
});
