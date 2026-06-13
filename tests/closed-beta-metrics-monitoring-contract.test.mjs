import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/closed-beta-metrics-monitoring-contract.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("closed beta metrics monitoring contract exists and states beta status", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "Conditional Go, not full production readiness",
    "3 to 5 trusted invited users",
    "durable invited-account persistence remains partial",
    "Full image OCR execution remains partial",
    "Account-backed Review completion remains partial",
    "Does Inverge help a learner turn today's study trace into the next safe action and come back to review it?",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta metrics monitoring contract includes daily and weekly checklists", () => {
  const doc = read(docPath);

  [
    "Daily Monitoring Checklist",
    "first_capture_completed",
    "capture_note_created",
    "biggest_gap_identified",
    "next_action_created",
    "today_plan_task_selected",
    "review_queue_item_created",
    "notes_reflected",
    "loop_closed",
    "local_fallback_loop",
    "save_failed",
    "support_issue_opened",
    "boundary_safety_issue",
    "Weekly Monitoring Checklist",
    "active invited users",
    "users with 2+ capture days",
    "note-to-plan conversion",
    "review queue reflection rate",
    "review completion evidence",
    "OCR correction friction",
    "local fallback vs durable evidence",
    "qualitative feedback themes",
    "top 3 blockers",
    "stop-rule incidents",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta metrics monitoring contract includes provider-free telemetry and safety metrics", () => {
  const doc = read(docPath);

  [
    "Provider-free Telemetry Events",
    "capture_note_created",
    "biggest_gap_identified",
    "next_action_created",
    "today_plan_task_selected",
    "review_queue_item_created",
    "notes_reflected",
    "review_completed",
    "loop_closed",
    "Safety Metrics",
    "zero-tolerance events",
    "official grading/model-answer/score/pass-fail copy exposure",
    "instructor-console learner exposure",
    "raw Q-Net exposure",
    "local_official_materials exposure",
    "qnet_manifest.json exposure",
    "raw official text exposure",
    "analytics provider call",
    "AI provider call outside approved capture behavior",
    "raw learner text in telemetry",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta metrics monitoring contract includes decision rules and report templates", () => {
  const doc = read(docPath);

  [
    "Continue Beta",
    "Pause Beta",
    "No-Go / Stop Beta",
    "Daily Beta Note Template",
    "Weekly Beta Metrics Report Template",
    "User Feedback Intake Template",
    "Bug / Support Intake Template",
    "Stop-rule Incident Template",
    "core text-first loop works for invited users",
    "persistence copy overclaims durable save",
    "core Capture -> Note -> Today Plan -> Review Queue -> Notes loop breaks for most testers",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta metrics monitoring contract includes data boundary and validation terms", () => {
  const doc = read(docPath);

  [
    "metadata-only",
    "no raw learner text",
    "no raw OCR text",
    "no raw official text",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no analytics provider calls",
    "no AI provider calls",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta metrics monitoring contract avoids local raw paths, raw official paths, screenshot paths, temp paths, raw binary paths, committed uploads, and OCR body examples", () => {
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
  assert.doesNotMatch(doc, /official answer body\s*:/i);
});

test("closed beta metrics monitoring contract test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/closed-beta-metrics-monitoring-contract.test.mjs"), true);
});
