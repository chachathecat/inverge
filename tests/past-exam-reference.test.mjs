import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { listPastExamReferences, mapCaptureNoteToPastExamReferences } from "../lib/review-os/past-exam-reference.ts";

test("reference item can be loaded", () => {
  const refs = listPastExamReferences("second", "감정평가실무");
  assert.ok(refs.length > 0);
  assert.equal(refs[0].raw_text_policy, "reference_only");
});

test("capture note maps to past-exam reference candidates by tags", () => {
  const candidates = mapCaptureNoteToPastExamReferences({
    mode: "second",
    subject: "감정평가이론",
    topic_candidate: "사례적용",
    mistake_type: "구조 약함",
    weak_structure_point: "결론",
  });
  assert.ok(candidates.some((item) => item.subject === "감정평가이론"));
});

test("reference module does not include raw user OCR text keys", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  assert.equal(source.includes("raw_ocr"), false);
  assert.equal(source.includes("user_ocr"), false);
  assert.equal(source.includes("rawQuestionText"), false);
});
