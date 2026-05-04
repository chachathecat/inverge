import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildAnswerSkeletonGuide,
  findPastExamReferenceMatches,
  listPastExamReferences,
  mapCaptureNoteToPastExamReferences,
} from "../lib/review-os/past-exam-reference.ts";

test("2023/2024 reference items can be loaded", () => {
  const refs2024 = listPastExamReferences("second").filter((item) => item.exam_year === 2024);
  const refs2023 = listPastExamReferences("second").filter((item) => item.exam_year === 2023);

  assert.ok(refs2024.length >= 3);
  assert.ok(refs2023.length >= 3);
});

test("all references use learner-safe source policy fields", () => {
  const refs = listPastExamReferences("second");
  for (const ref of refs) {
    assert.equal(ref.source_status, "needs_review");
    assert.equal(ref.raw_text_policy, "reference_only");
  }
});

test("all ids are unique and subject-clear", () => {
  const refs = listPastExamReferences("second");
  const ids = refs.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const ref of refs) {
    if (ref.subject === "감정평가실무") assert.match(ref.id, /practice/);
    if (ref.subject === "감정평가이론") assert.match(ref.id, /theory/);
    if (ref.subject === "감정평가 및 보상법규") assert.match(ref.id, /law/);
  }
});

test("similar_question_refs resolve without dangling references", () => {
  const refs = listPastExamReferences("second");
  const idSet = new Set(refs.map((item) => item.id));

  for (const ref of refs) {
    for (const similarId of ref.similar_question_refs) {
      assert.ok(idSet.has(similarId), `${ref.id} has dangling similar_question_refs: ${similarId}`);
    }
  }
});

test("matching returns candidates across 2023/2024/2025", () => {
  const matches = findPastExamReferenceMatches({
    mode: "second",
    subject: "감정평가이론",
    topicCandidate: "사례적용",
    mistakeType: "구조 약함",
    weakStructurePoint: "결론",
  });

  const years = new Set(matches.map((item) => item.reference.exam_year));
  assert.ok(years.has(2025));
  assert.ok(years.has(2024) || years.has(2023));
});

test("buildAnswerSkeletonGuide works for new 2024/2023 references", () => {
  const refs = listPastExamReferences("second");
  const targets = refs.filter((item) => item.exam_year === 2024 || item.exam_year === 2023);

  assert.ok(targets.length > 0);
  for (const ref of targets) {
    const guide = buildAnswerSkeletonGuide(ref);
    assert.equal(guide.referenceId, ref.id);
    assert.ok(guide.skeleton_steps.length > 0);
    assert.ok(guide.checkpoint_questions.length > 0);
    assert.ok(guide.common_gap_warnings.length > 0);
  }
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

test("reference module does not include prohibited official grading/pass-fail language", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  const forbidden = [
    "공식 모범답안",
    "공식 채점",
    "합격/불합격",
    "official model answer",
    "pass/fail",
  ];

  for (const keyword of forbidden) {
    assert.equal(source.includes(keyword), false, `forbidden language found: ${keyword}`);
  }
});

test("reference module does not include raw user OCR text keys", async () => {
  const source = await readFile(new URL("../lib/review-os/past-exam-reference.ts", import.meta.url), "utf8");
  assert.equal(source.includes("raw_ocr"), false);
  assert.equal(source.includes("user_ocr"), false);
  assert.equal(source.includes("rawQuestionText"), false);
});
