import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/ocr-pdf-upload-runtime-smoke-proof.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("OCR/PDF upload runtime smoke proof doc exists and records scenarios A-L", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  [
    "A. Text-first capture baseline still works",
    "B. Image upload control is reachable if available",
    "C. PDF upload control is reachable if available",
    "D. OCR/PDF output is framed as draft",
    "E. OCR/PDF output is editable before save",
    "F. Synthetic learner-created input can produce or support one biggestGap",
    "G. Synthetic learner-created input can produce or support one nextAction",
    "H. Save path preserves learner-owned / metadata-only semantics",
    "I. No official grading/model-answer/score/pass-fail copy appears",
    "J. No raw official material or local official path is exposed",
    "K. Provider-free telemetry can record safe metadata-only capture events",
    "L. If image/PDF upload is unavailable in current runtime, mark partial honestly",
  ].forEach((label) => assert.equal(doc.includes(label), true, `doc should include ${label}`));
});

test("OCR/PDF upload runtime smoke proof records draft, editability, metadata, and Conditional Go rules", () => {
  const doc = read(docPath);

  [
    "Conditional Go, not full production readiness",
    "PDF fallback upload smoke passed",
    "Full image OCR upload execution remains partial",
    "OCR/PDF output must be treated as draft",
    "OCR/PDF output must be editable before save",
    "one biggestGap",
    "one nextAction",
    "learner-owned",
    "metadata-only",
    "metadataOnly: true",
    "safeUse: closed_beta_local_note",
    "Provider-free telemetry",
    "0 OCR provider requests",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("OCR/PDF upload runtime smoke proof includes safety boundaries and validation commands", () => {
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
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("OCR/PDF upload runtime smoke proof avoids local raw paths, screenshots, raw binary paths, and official body examples", () => {
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

test("OCR/PDF upload runtime smoke proof test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/ocr-pdf-upload-runtime-smoke-proof.test.mjs"), true);
});
