import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const auditDocPath = "docs/learner-loop-production-gap-audit.md";

function read(file) {
  return readFileSync(file, "utf8");
}

test("learner loop production gap audit doc exists and captures required loop evidence", () => {
  assert.equal(existsSync(auditDocPath), true, `${auditDocPath} should exist`);

  const doc = read(auditDocPath);

  [
    "Capture",
    "learner-owned note",
    "biggest gap",
    "next action",
    "Today Plan max 3",
    "Review Queue",
    "Notes reflection",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no raw Q-Net materials",
    "no `local_official_materials`",
    "Recommended next 3 PRs",
    "Capture-to-Note Quality Hardening v1",
    "Today Plan Source Reasoning v1",
    "Review Queue Reflection Hardening v1",
  ].forEach((phrase) => {
    assert.equal(doc.includes(phrase), true, `audit doc should mention: ${phrase}`);
  });
});

test("learner loop production gap audit avoids raw official material examples and local raw paths", () => {
  const doc = read(auditDocPath);

  assert.doesNotMatch(doc, /local_official_materials[\\/]/, "audit doc must not include local raw material paths");
  assert.doesNotMatch(doc, /Raw problem text\s*:/i, "audit doc must not include raw problem text examples");
  assert.doesNotMatch(doc, /Raw answer text\s*:/i, "audit doc must not include raw answer text examples");
  assert.doesNotMatch(doc, /OCR full text\s*:/i, "audit doc must not include OCR full text examples");
  assert.doesNotMatch(doc, /Official answer body\s*:/i, "audit doc must not include official answer body examples");
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|gif|webp)\b/i, "audit doc must not name raw material files");
});
