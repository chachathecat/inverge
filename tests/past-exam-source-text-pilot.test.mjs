import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import {
  applyExtractionReviewRecord,
  applyStructuredCandidateReviewRecord,
  canMarkExtractionCandidateReviewed,
  canMarkStructuredCandidateReviewed,
} from "../lib/review-os/past-exam-source.ts";
import {
  isPastExamSourceTextPilotLinkedToKnownSourceDocument,
  listPastExamSourceTextPilotExtractionCandidates,
  listPastExamSourceTextPilotStructuredCandidates,
} from "../lib/review-os/past-exam-source-text-pilot.ts";
import { listPastExamSourceDocuments } from "../lib/review-os/past-exam-source-seeds.ts";
import { listPastExamReferences } from "../lib/review-os/past-exam-reference.ts";
import {
  listPastExamExtractionReviewRecords,
  listPastExamStructuredCandidateReviewRecords,
} from "../lib/review-os/past-exam-review-seeds.ts";

const pilotPath = new URL("../lib/review-os/past-exam-source-text-pilot.ts", import.meta.url);

test("pilot extraction candidate exists", () => {
  const candidates = listPastExamSourceTextPilotExtractionCandidates();
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].source_document_id, "appraiser-second-2025-36-practice-q1-source-pdf");
});

test("pilot structured candidate exists", () => {
  const candidates = listPastExamSourceTextPilotStructuredCandidates();
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].linked_reference_id, "appraiser-second-2025-36-practice-q1");
});

test("both pilot candidates are reference_only", () => {
  const extraction = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structured = listPastExamSourceTextPilotStructuredCandidates()[0];

  assert.equal(extraction.extracted_text_policy, "reference_only");
  assert.equal(structured.raw_text_policy, "reference_only");
});

test("both pilot candidates are needs_review", () => {
  const extraction = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structured = listPastExamSourceTextPilotStructuredCandidates()[0];

  assert.equal(extraction.review_status, "needs_review");
  assert.equal(structured.candidate_status, "needs_review");
});

test("pilot source_document_id resolves to source metadata", () => {
  const extraction = listPastExamSourceTextPilotExtractionCandidates()[0];
  const sourceDoc = listPastExamSourceDocuments().find((item) => item.id === extraction.source_document_id);

  assert.ok(sourceDoc);
  assert.equal(sourceDoc.id, extraction.source_document_id);
  assert.equal(sourceDoc.raw_text_policy, "reference_only");
  assert.equal(sourceDoc.review_status, "needs_review");
  assert.equal(isPastExamSourceTextPilotLinkedToKnownSourceDocument(), true);
});


test("pilot extracted_text stays placeholder/review-required", () => {
  const extraction = listPastExamSourceTextPilotExtractionCandidates()[0];
  const normalized = extraction.extracted_text?.toLowerCase() ?? "";

  assert.equal(normalized.includes("placeholder") || normalized.includes("review required"), true);
});

test("pilot linked_reference_id resolves to an existing reference item", () => {
  const structured = listPastExamSourceTextPilotStructuredCandidates()[0];
  const referenceIds = new Set(listPastExamReferences("all").map((item) => item.id));

  assert.equal(referenceIds.has(structured.linked_reference_id), true);
});

test("review records load", () => {
  assert.equal(listPastExamExtractionReviewRecords().length, 1);
  assert.equal(listPastExamStructuredCandidateReviewRecords().length, 1);
});

test("review record candidate/source/reference ids resolve", () => {
  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  assert.equal(extractionReview.candidate_id, extractionCandidate.id);
  assert.equal(extractionReview.source_document_id, extractionCandidate.source_document_id);
  assert.equal(structuredReview.candidate_id, structuredCandidate.id);
  assert.equal(structuredReview.source_document_id, structuredCandidate.source_document_id);
  assert.equal(structuredReview.linked_reference_id, structuredCandidate.linked_reference_id);
});

test("approve review records mark candidates reviewed", () => {
  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, extractionReview), true);
  assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, structuredReview), true);
});



test("apply helper marks approved extraction candidate reviewed without mutating original", () => {
  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];

  const updated = applyExtractionReviewRecord(extractionCandidate, extractionReview);

  assert.notEqual(updated, extractionCandidate);
  assert.equal(updated.review_status, "reviewed");
  assert.equal(extractionCandidate.review_status, "needs_review");
});

test("apply helper marks approved structured candidate reviewed without mutating original", () => {
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  const updated = applyStructuredCandidateReviewRecord(structuredCandidate, structuredReview);

  assert.notEqual(updated, structuredCandidate);
  assert.equal(updated.candidate_status, "reviewed");
  assert.equal(structuredCandidate.candidate_status, "needs_review");
});

test("apply helper does not mark request_changes/reject extraction or structured candidates reviewed", () => {
  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  assert.equal(
    applyExtractionReviewRecord(extractionCandidate, { ...extractionReview, decision: "request_changes" }).review_status,
    "needs_review",
  );
  assert.equal(
    applyExtractionReviewRecord(extractionCandidate, { ...extractionReview, decision: "reject" }).review_status,
    "needs_review",
  );
  assert.equal(
    applyStructuredCandidateReviewRecord(structuredCandidate, { ...structuredReview, decision: "request_changes" }).candidate_status,
    "needs_review",
  );
  assert.equal(
    applyStructuredCandidateReviewRecord(structuredCandidate, { ...structuredReview, decision: "reject" }).candidate_status,
    "needs_review",
  );
});

test("apply helper does not mark reviewed on mismatched candidate/source ids", () => {
  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  assert.equal(
    applyExtractionReviewRecord(extractionCandidate, { ...extractionReview, candidate_id: "wrong-candidate" }).review_status,
    "needs_review",
  );
  assert.equal(
    applyExtractionReviewRecord(extractionCandidate, { ...extractionReview, source_document_id: "wrong-source" }).review_status,
    "needs_review",
  );
  assert.equal(
    applyStructuredCandidateReviewRecord(structuredCandidate, { ...structuredReview, candidate_id: "wrong-candidate" }).candidate_status,
    "needs_review",
  );
  assert.equal(
    applyStructuredCandidateReviewRecord(structuredCandidate, { ...structuredReview, source_document_id: "wrong-source" }).candidate_status,
    "needs_review",
  );
});

test("structured apply helper clones array fields", () => {
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  const updated = applyStructuredCandidateReviewRecord(structuredCandidate, structuredReview);

  assert.notEqual(updated.topic_tags_candidate, structuredCandidate.topic_tags_candidate);
  assert.notEqual(updated.issue_tags_candidate, structuredCandidate.issue_tags_candidate);
  assert.notEqual(updated.skill_tags_candidate, structuredCandidate.skill_tags_candidate);
  assert.notEqual(updated.expected_answer_skeleton_candidate, structuredCandidate.expected_answer_skeleton_candidate);
  assert.notEqual(updated.scoring_checkpoint_skeleton_candidate, structuredCandidate.scoring_checkpoint_skeleton_candidate);
  assert.notEqual(updated.common_gap_candidates, structuredCandidate.common_gap_candidates);
});
test("request_changes/reject review decisions do not mark candidates reviewed", () => {
  const extractionCandidate = listPastExamSourceTextPilotExtractionCandidates()[0];
  const structuredCandidate = listPastExamSourceTextPilotStructuredCandidates()[0];
  const extractionReview = listPastExamExtractionReviewRecords()[0];
  const structuredReview = listPastExamStructuredCandidateReviewRecords()[0];

  assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, { ...extractionReview, decision: "request_changes" }), false);
  assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, { ...extractionReview, decision: "reject" }), false);
  assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, { ...structuredReview, decision: "request_changes" }), false);
  assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, { ...structuredReview, decision: "reject" }), false);
});

test("pilot module has no official answer/scoring/pass-fail language", async () => {
  const source = await readFile(pilotPath, "utf8");
  const forbidden = ["official_answer", "official_scoring", "pass_fail", "합격", "불합격"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});

test("pilot module has no raw user OCR/user answer fields", async () => {
  const source = await readFile(pilotPath, "utf8");
  const forbidden = ["raw_user_ocr", "user_ocr", "raw_user_answer", "user_answer_raw"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});

test("no OCR/upload/archive UI routes were added", async () => {
  const shouldNotExist = [
    new URL("../app/api/ocr/route.ts", import.meta.url),
    new URL("../app/api/pdf-upload/route.ts", import.meta.url),
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/upload/page.tsx", import.meta.url),
    new URL("../app/exams/archive/source-upload/page.tsx", import.meta.url),
    new URL("../app/instructor/source-upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("pilot module never marks reviewed status", async () => {
  const source = await readFile(pilotPath, "utf8");
  assert.equal(source.includes('"reviewed"'), false);
});
