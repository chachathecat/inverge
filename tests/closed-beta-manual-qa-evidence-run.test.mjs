import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const reportPath = "docs/closed-beta-manual-qa-evidence-run-2026-06-12.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("closed beta manual QA evidence report exists and records required scenarios", () => {
  assert.equal(existsSync(reportPath), true, `${reportPath} should exist`);
  const report = read(reportPath);

  [
    "A. Text-first Capture happy path",
    "B. Capture-to-Today Plan reflection",
    "C. Today Plan to Review Queue reflection",
    "D. Notes reflection",
    "E. Review completion loop",
    "F. Durable persistence path",
    "G. Browser local fallback path",
    "H. Save failed path",
    "I. Boundary safety sweep",
    "J. OCR/PDF maturity smoke",
    "K. Provider-free telemetry evidence check",
  ].forEach((label) => assert.equal(report.includes(label), true, `report should include ${label}`));
});

test("closed beta manual QA evidence report includes decision, validation, and safety terms", () => {
  const report = read(reportPath);

  assert.match(report, /Final decision: \*\*(Go|Conditional Go|No-Go)\*\*/);
  [
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no analytics provider calls",
    "no AI provider calls",
    "provider-free telemetry",
  ].forEach((phrase) => assert.equal(report.includes(phrase), true, `report should include ${phrase}`));
});

test("closed beta manual QA evidence report avoids local raw paths, screenshots, and official body examples", () => {
  const report = read(reportPath);

  assert.doesNotMatch(report, /[A-Za-z]:\\/);
  assert.doesNotMatch(report, /file:\/\//i);
  assert.doesNotMatch(report, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(report, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(report, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(report, /raw official problem text\s*:/i);
  assert.doesNotMatch(report, /raw official answer text\s*:/i);
  assert.doesNotMatch(report, /OCR full text\s*:/i);
  assert.doesNotMatch(report, /official answer body\s*:/i);
});

test("closed beta manual QA evidence test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/closed-beta-manual-qa-evidence-run.test.mjs"), true);
});
