import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/durable-invited-account-persistence-runtime-proof.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("durable invited account runtime proof doc exists and records scenarios A-I", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "A. Invited account sign-in state identified",
    "B. Capture note saved under invited account",
    "C. Refresh preserves saved note if durable account persistence is available",
    "D. Today Plan reflects the saved note",
    "E. Review Queue reflects the saved note",
    "F. Notes reflects the saved note",
    "G. Browser local fallback copy is clear when durable path is unavailable",
    "H. Save failed path does not appear as ready Review Queue evidence",
    "I. Provider-free telemetry distinguishes durable_saved, local_fallback_saved, and save_failed",
  ].forEach((label) => assert.equal(doc.includes(label), true, `doc should include ${label}`));
});

test("durable invited account runtime proof distinguishes persistence states and Conditional Go limits", () => {
  const doc = read(docPath);

  [
    "durable_saved",
    "local_fallback_saved",
    "save_failed",
    "Conditional Go, not full production readiness",
    "durable invited-account persistence must stay listed as partial",
    "No-overclaiming Persistence Rule",
    "must not imply account sync",
    "save_failed must not appear as ready Review Queue evidence",
    "Provider-free telemetry",
    "not durable closed-loop evidence",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("durable invited account runtime proof includes required safety boundaries and validation", () => {
  const doc = read(docPath);

  [
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
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
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("durable invited account runtime proof avoids local raw paths, screenshots, temp files, and official body examples", () => {
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

test("durable invited account runtime proof test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/durable-invited-account-persistence-runtime-proof.test.mjs"), true);
});
