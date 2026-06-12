import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/closed-beta-production-readiness-scorecard.md";
const testPath = "tests/closed-beta-production-readiness-scorecard.test.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("closed beta production readiness scorecard exists and captures decision structure", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);

  const doc = read(docPath);
  const requiredPhrases = [
    "78 / 100",
    "Go / Conditional Go / No-Go",
    "Conditional Go",
    "Core learner loop readiness",
    "Data boundary and safety",
    "Persistence and fallback clarity",
    "Closed beta UX clarity",
    "Measurement and QA evidence",
    "Q-Net reference intelligence boundary",
    "Capture",
    "learner-owned note",
    "biggest gap",
    "next action",
    "Today Plan",
    "Review Queue",
    "Notes reflection",
    "durable_saved",
    "local_fallback_saved",
    "save_failed",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no official grading/model-answer/score/pass-fail",
    "Top 3 next PRs",
    "Closed Beta Manual QA Runbook v1",
    "OCR/PDF Capture Maturity Hardening v1",
    "Durable Persistence Evidence v1",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ];

  for (const phrase of requiredPhrases) {
    assert.equal(doc.includes(phrase), true, `scorecard should include: ${phrase}`);
  }
});

test("closed beta production readiness scorecard avoids raw official content and archive promises", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /local_official_materials[\\/]/i, "scorecard must not include local raw material paths");
  assert.doesNotMatch(doc, /[A-Za-z]:\\.*\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp)\b/i, "scorecard must not include local raw file paths");
  assert.doesNotMatch(doc, /Raw official problem text\s*:/i, "scorecard must not include raw official problem text examples");
  assert.doesNotMatch(doc, /Raw official answer text\s*:/i, "scorecard must not include raw official answer text examples");
  assert.doesNotMatch(doc, /OCR full text\s*:/i, "scorecard must not include OCR full text examples");
  assert.doesNotMatch(doc, /Official answer body\s*:/i, "scorecard must not include official answer body examples");
  assert.doesNotMatch(doc, /public archive (?:is|available|access|feature|promise|product)/i, "scorecard must not promise public archive behavior");
});

test("scorecard test validates committed docs without reading local official materials", () => {
  const source = read(testPath);

  assert.doesNotMatch(source, /\b(?:readdir|opendir|glob)\s*\(/i, "scorecard test must not enumerate local raw materials");
  assert.doesNotMatch(source, /readFileSync\(["'`]local_official_materials/i, "scorecard test must not read local_official_materials");
  assert.doesNotMatch(source, /qnet_manifest\.json["'`]\)/i, "scorecard test must not read manifest files");
});
