import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { listPastExamReferences, mapCaptureNoteToPastExamReferences } from "../lib/review-os/past-exam-reference.ts";

test("reference item can be loaded", () => {
  const refs = listPastExamReferences("second", "감정평가실무");
  assert.ok(refs.length > 0);
  assert.equal(refs[0].raw_text_policy, "reference_only");
});

test("all seeded references are conservative review-only metadata", () => {
  const refs = listPastExamReferences("all");
  assert.ok(refs.length > 0);
  refs.forEach((item) => {
    assert.equal(item.source_status, "needs_review");
    assert.equal(item.raw_text_policy, "reference_only");
  });
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

test("updated ids and similar refs resolve without dangling references", () => {
  const refs = listPastExamReferences("all");
  const ids = new Set(refs.map((item) => item.id));

  assert.ok(ids.has("appraiser-second-2025-36-practice-q1"));
  assert.ok(ids.has("appraiser-second-2025-36-theory-q2"));
  assert.ok(ids.has("appraiser-second-2025-36-law-q3"));

  refs.forEach((item) => {
    item.similar_question_refs.forEach((refId) => assert.ok(ids.has(refId)));
  });
});

test("capture note still maps to a reference candidate", () => {
  const candidates = mapCaptureNoteToPastExamReferences({
    mode: "second",
    subject: "감정평가실무",
    topic_candidate: "평가방법",
    mistake_type: "계산 실수",
    weak_structure_point: "결론",
  });
  assert.ok(candidates.length > 0);
});

test("reference module does not include raw user OCR text keys", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  assert.equal(source.includes("raw_ocr"), false);
  assert.equal(source.includes("user_ocr"), false);
  assert.equal(source.includes("rawQuestionText"), false);
});

test("reference module avoids official answer/grading language", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  assert.equal(source.includes("official answer"), false);
  assert.equal(source.includes("official model answer"), false);
  assert.equal(source.includes("official grading"), false);
  assert.equal(source.includes("공식 모범답안"), false);
  assert.equal(source.includes("공식 채점"), false);
});
