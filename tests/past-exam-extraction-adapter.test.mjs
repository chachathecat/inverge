import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import {
  buildExtractionCandidateFromSource,
  buildStructuredCandidateFromReference,
} from "../lib/review-os/past-exam-extraction-adapter.ts";

const adapterPath = new URL("../lib/review-os/past-exam-extraction-adapter.ts", import.meta.url);

const sampleReference = {
  id: "appraiser-second-2025-36-practice-q1",
  exam_year: 2025,
  exam_name: "제36회 감정평가사 2차",
  stage: "second",
  subject: "감정평가실무",
  question_number: 1,
  question_type: "사례형",
  topic_tags: ["평가방법", "조건정리"],
  issue_tags: ["근거 누락"],
  skill_tags: ["근거 제시"],
  expected_answer_skeleton: ["요구사항", "근거", "결론"],
  scoring_checkpoint_skeleton: ["근거-결론 연결"],
  common_gap_candidates: ["결론만 제시"],
  related_mistake_types: ["구조 약함"],
  similar_question_refs: [],
  source_status: "needs_review",
  raw_text_policy: "reference_only",
};

test("non-empty extractedText creates extraction_status extracted", () => {
  const candidate = buildExtractionCandidateFromSource({
    sourceDocumentId: "source-2025-1",
    extractedText: "문항 텍스트",
  });

  assert.equal(candidate.extraction_status, "extracted");
});

test("empty extractedText creates extraction_status failed", () => {
  const candidate = buildExtractionCandidateFromSource({
    sourceDocumentId: "source-2025-2",
    extractedText: "   ",
  });

  assert.equal(candidate.extraction_status, "failed");
});

test("extraction candidate is reference_only", () => {
  const candidate = buildExtractionCandidateFromSource({
    sourceDocumentId: "source-2025-3",
    extractedText: "문항 텍스트",
  });

  assert.equal(candidate.extracted_text_policy, "reference_only");
});

test("extraction candidate is needs_review", () => {
  const candidate = buildExtractionCandidateFromSource({
    sourceDocumentId: "source-2025-4",
    extractedText: "문항 텍스트",
  });

  assert.equal(candidate.review_status, "needs_review");
});

test("extraction candidate created_from is source_pdf", () => {
  const candidate = buildExtractionCandidateFromSource({
    sourceDocumentId: "source-2025-5",
    extractedText: "문항 텍스트",
  });

  assert.equal(candidate.created_from, "source_pdf");
  assert.equal(candidate.extraction_notes, "Generated extraction candidate; review required.");
});

test("structured candidate copies fields from reference", () => {
  const candidate = buildStructuredCandidateFromReference({
    sourceDocumentId: "source-2025-6",
    reference: sampleReference,
  });

  assert.equal(candidate.linked_reference_id, sampleReference.id);
  assert.deepEqual(candidate.topic_tags_candidate, sampleReference.topic_tags);
  assert.deepEqual(candidate.issue_tags_candidate, sampleReference.issue_tags);
  assert.deepEqual(candidate.skill_tags_candidate, sampleReference.skill_tags);
  assert.deepEqual(candidate.expected_answer_skeleton_candidate, sampleReference.expected_answer_skeleton);
  assert.deepEqual(candidate.scoring_checkpoint_skeleton_candidate, sampleReference.scoring_checkpoint_skeleton);
  assert.deepEqual(candidate.common_gap_candidates, sampleReference.common_gap_candidates);
});

test("structured candidate is reference_only", () => {
  const candidate = buildStructuredCandidateFromReference({
    sourceDocumentId: "source-2025-7",
    reference: sampleReference,
  });

  assert.equal(candidate.raw_text_policy, "reference_only");
});

test("structured candidate is needs_review", () => {
  const candidate = buildStructuredCandidateFromReference({
    sourceDocumentId: "source-2025-8",
    reference: sampleReference,
  });

  assert.equal(candidate.candidate_status, "needs_review");
});

test("structured candidate created_from is source_pdf_extraction", () => {
  const candidate = buildStructuredCandidateFromReference({
    sourceDocumentId: "source-2025-9",
    reference: sampleReference,
  });

  assert.equal(candidate.created_from, "source_pdf_extraction");
});



test("structured candidate arrays are defensively cloned", () => {
  const candidate = buildStructuredCandidateFromReference({
    sourceDocumentId: "source-2025-10",
    reference: sampleReference,
  });

  candidate.topic_tags_candidate.push("추가-topic");
  candidate.issue_tags_candidate.push("추가-issue");
  candidate.skill_tags_candidate.push("추가-skill");
  candidate.expected_answer_skeleton_candidate.push("추가-expected");
  candidate.scoring_checkpoint_skeleton_candidate.push("추가-scoring");
  candidate.common_gap_candidates.push("추가-gap");

  assert.deepEqual(sampleReference.topic_tags, ["평가방법", "조건정리"]);
  assert.deepEqual(sampleReference.issue_tags, ["근거 누락"]);
  assert.deepEqual(sampleReference.skill_tags, ["근거 제시"]);
  assert.deepEqual(sampleReference.expected_answer_skeleton, ["요구사항", "근거", "결론"]);
  assert.deepEqual(sampleReference.scoring_checkpoint_skeleton, ["근거-결론 연결"]);
  assert.deepEqual(sampleReference.common_gap_candidates, ["결론만 제시"]);
});
test("no official answer/scoring/pass-fail language", async () => {
  const source = await readFile(adapterPath, "utf8");
  const forbidden = ["official_answer", "official_scoring", "pass_fail", "final judgment", "자동 채점"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});

test("no OCR/upload/archive UI route added", async () => {
  const shouldNotExist = [
    new URL("../app/api/ocr/route.ts", import.meta.url),
    new URL("../app/api/pdf-upload/route.ts", import.meta.url),
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});
