import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/review-completion-runtime-proof.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("review completion runtime proof doc exists and records scenarios A-K", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "A. Review Queue route loads",
    "B. A learner-owned review item is visible or can be generated from safe synthetic local data",
    "C. Review item shows due/reason copy",
    "D. Completing a review action is possible if the UI supports completion",
    "E. Completion state becomes visible after action",
    "F. Completed item no longer behaves like an unstarted primary item",
    "G. Refresh preserves completion if persistence mode supports it, or honestly marks local/durable partial",
    "H. save_failed item does not appear as ready Review Queue evidence",
    "I. Provider-free telemetry can record review_completed safely",
    "J. No official grading/model-answer/score/pass-fail copy appears",
    "K. No instructor console or raw official material exposure appears",
  ].forEach((label) => assert.equal(doc.includes(label), true, `doc should include ${label}`));
});

test("review completion runtime proof records completion visibility and Conditional Go limits", () => {
  const doc = read(docPath);

  [
    "Conditional Go, not full production readiness",
    "Completion Visibility Rule",
    "Completed-item-not-primary Rule",
    "completed item no longer behaves like an unstarted primary item",
    "Completion state becomes visible",
    "visible runtime proof remains partial",
    "save_failed must not count as completed review evidence",
    "must not appear as ready Review Queue evidence",
    "provider-free telemetry",
    "review_completed",
    "metadata-only",
    "learner-owned",
    "safeUse: closed_beta_learner_loop_telemetry",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("review completion runtime proof includes required safety boundaries and validation commands", () => {
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
    "no overclaiming durable persistence",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("review completion runtime proof avoids local raw paths, screenshots, transient artifacts, raw binary paths, and official body examples", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /[A-Za-z]:\\/);
  assert.doesNotMatch(doc, /file:\/\//i);
  assert.doesNotMatch(doc, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(doc, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(doc, /temp(?:orary)? file/i);
  assert.doesNotMatch(doc, /raw official problem text\s*:/i);
  assert.doesNotMatch(doc, /raw official answer text\s*:/i);
  assert.doesNotMatch(doc, /OCR full text\s*:/i);
  assert.doesNotMatch(doc, /official answer body\s*:/i);
});

test("review completion runtime proof test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/review-completion-runtime-proof.test.mjs"), true);
});
