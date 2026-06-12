import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/closed-beta-manual-qa-runbook.md";
const testPath = "tests/closed-beta-manual-qa-runbook.test.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("closed beta manual QA runbook exists and covers required scenarios", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);

  const doc = read(docPath);
  const requiredPhrases = [
    "limited closed beta",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
    "Text-first Capture happy path",
    "Today Plan max 3",
    "Review Queue",
    "Notes reflection",
    "durable persistence",
    "browser local fallback",
    "Save failed path",
    "Boundary safety sweep",
    "OCR/PDF maturity smoke",
    "Evidence Template",
    "Post-QA Report Template",
    "Go / Conditional Go / No-Go",
    "No-Go Rules",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no official grading/model-answer/score/pass-fail",
  ];

  for (const phrase of requiredPhrases) {
    assert.equal(doc.includes(phrase), true, `runbook should include: ${phrase}`);
  }
});

test("closed beta manual QA runbook avoids raw official content and archive promises", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /local_official_materials[\\/]/i, "runbook must not include local raw material paths");
  assert.doesNotMatch(doc, /[A-Za-z]:\\.*\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp)\b/i, "runbook must not include local raw file paths");
  assert.doesNotMatch(doc, /Real official problem text\s*:/i, "runbook must not include official problem text examples");
  assert.doesNotMatch(doc, /Official answer text\s*:/i, "runbook must not include official answer text examples");
  assert.doesNotMatch(doc, /OCR full text\s*:/i, "runbook must not include OCR full text examples");
  assert.doesNotMatch(doc, /Official answer body\s*:/i, "runbook must not include official answer body examples");
  assert.doesNotMatch(doc, /public archive (?:is|available|access|feature|promise|product)/i, "runbook must not promise public archive behavior");
});

test("runbook test validates committed docs without reading local official materials", () => {
  const source = read(testPath);

  assert.doesNotMatch(source, /\b(?:readdir|opendir|glob)\s*\(/i, "runbook test must not enumerate local raw materials");
  assert.doesNotMatch(source, /readFileSync\(["'`]local_official_materials/i, "runbook test must not read local official materials");
  assert.doesNotMatch(source, /qnet_manifest\.json["'`]\)/i, "runbook test must not read manifest files");
});
