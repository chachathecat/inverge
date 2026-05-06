import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { constants } from "node:fs";

const sourcePath = new URL("../lib/review-os/past-exam-source.ts", import.meta.url);
const protocolPath = new URL("../docs/source-pdf-ingestion-protocol.md", import.meta.url);

const execFileAsync = promisify(execFile);

async function readUtf8(url) {
  return readFile(url, "utf8");
}

test("past-exam source contract exists and preserves protocol fields", async () => {
  await access(sourcePath, constants.F_OK);
  const source = await readUtf8(sourcePath);

  const requiredTokens = [
    "PastExamExtractionStatus",
    "PastExamSourceReviewStatus",
    "PastExamSourceDocument",
    "PastExamExtractionCandidate",
    "PastExamStructuredCandidate",
    "isReferenceOnlyExtractionCandidate",
    "isReviewRequiredStructuredCandidate",
    "subject: string",
    'extraction_status: PastExamExtractionStatus',
    'source_type: "pdf"',
    'raw_text_policy: "reference_only"',
    'extracted_text_policy: "reference_only"',
    'review_status: "needs_review" | "reviewed"',
    'candidate_status: "needs_review" | "reviewed"',
    'created_from: "source_pdf"',
    'created_from: "source_pdf_extraction"',
    "linked_reference_ids",
    "linked_reference_id",
  ];

  for (const token of requiredTokens) {
    assert.equal(source.includes(token), true, `missing required contract token: ${token}`);
  }
});

test("source protocol doc exists and keeps review/separation guardrails", async () => {
  await access(protocolPath, constants.F_OK);
  const protocol = await readUtf8(protocolPath);

  const requiredPhrases = [
    "reference-only",
    "needs_review",
    "human review",
    "learner-facing 결과물은",
    "raw user OCR / raw user answer",
  ];

  for (const phrase of requiredPhrases) {
    assert.equal(protocol.includes(phrase), true, `missing required protocol phrase: ${phrase}`);
  }
});

test("extraction and structured candidates stay reference-only and review-required by default state", async () => {
  const source = await readUtf8(sourcePath);

  assert.equal(source.includes('extracted_text_policy: "reference_only"'), true);
  assert.equal(source.includes('raw_text_policy: "reference_only"'), true);
  assert.equal(source.includes('review_status: "needs_review" | "reviewed"'), true);
  assert.equal(source.includes('candidate_status: "needs_review" | "reviewed"'), true);
  assert.equal(source.includes('created_from: "source_pdf"'), true);
  assert.equal(source.includes('created_from: "source_pdf_extraction"'), true);
});

test("no implementation scope creep fields are introduced in source metadata", async () => {
  const source = await readUtf8(sourcePath);
  const forbidden = [
    "raw_ocr",
    "user_ocr",
    "raw_user_ocr",
    "raw_user_answer",
    "user_answer_raw",
    "official_answer",
    "official_scoring",
    "pass_fail",
    "ocr_api",
    "upload_route",
  ];

  for (const key of forbidden) {
    assert.equal(source.includes(key), false, `forbidden field in source metadata: ${key}`);
  }
});

test("no new public archive/upload/instructor source routes are introduced", async () => {
  const shouldNotExist = [
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/upload/page.tsx", import.meta.url),
    new URL("../app/exams/archive/source-upload/page.tsx", import.meta.url),
    new URL("../app/instructor/source/page.tsx", import.meta.url),
    new URL("../app/instructor/source-upload/page.tsx", import.meta.url),
    new URL("../app/api/ocr/route.ts", import.meta.url),
    new URL("../app/api/pdf-upload/route.ts", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});


test("review workflow types and helpers require explicit approve record to mark reviewed", async () => {
  const source = await readUtf8(sourcePath);

  const requiredTokens = [
    "PastExamReviewDecision",
    "PastExamExtractionReviewRecord",
    "PastExamStructuredCandidateReviewRecord",
    "canMarkExtractionCandidateReviewed",
    "canMarkStructuredCandidateReviewed",
    'export type PastExamReviewDecision = "approve" | "request_changes" | "reject";',
    'result_status: "needs_review" | "reviewed"',
  ];

  for (const token of requiredTokens) {
    assert.equal(source.includes(token), true, `missing review workflow token: ${token}`);
  }

  const runtimeCheckScript = `
    import assert from "node:assert/strict";
    import {
      canMarkExtractionCandidateReviewed,
      canMarkStructuredCandidateReviewed,
    } from "./lib/review-os/past-exam-source.ts";

    const extractionCandidate = {
      id: "ext-1",
      source_document_id: "src-1",
      extraction_status: "extracted",
      extracted_text_policy: "reference_only",
      review_status: "needs_review",
      created_from: "source_pdf",
    };

    const approveRecord = {
      id: "review-1",
      candidate_id: "ext-1",
      source_document_id: "src-1",
      reviewer_role: "operator",
      decision: "approve",
      review_notes: "ok",
      reviewed_at: "2026-01-01T00:00:00.000Z",
      result_status: "reviewed",
    };

    assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, approveRecord), true);
    assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, { ...approveRecord, decision: "request_changes" }), false);
    assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, { ...approveRecord, decision: "reject" }), false);
    assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, { ...approveRecord, candidate_id: "ext-2" }), false);
    assert.equal(canMarkExtractionCandidateReviewed(extractionCandidate, { ...approveRecord, source_document_id: "src-2" }), false);

    const structuredCandidate = {
      id: "str-1",
      source_document_id: "src-1",
      linked_reference_id: "ref-1",
      candidate_status: "needs_review",
      raw_text_policy: "reference_only",
      topic_tags_candidate: [],
      issue_tags_candidate: [],
      skill_tags_candidate: [],
      expected_answer_skeleton_candidate: [],
      scoring_checkpoint_skeleton_candidate: [],
      common_gap_candidates: [],
      created_from: "source_pdf_extraction",
    };

    const structuredApprove = {
      id: "review-2",
      candidate_id: "str-1",
      source_document_id: "src-1",
      linked_reference_id: "ref-1",
      reviewer_role: "instructor",
      decision: "approve",
      review_notes: "ok",
      reviewed_at: "2026-01-01T00:00:00.000Z",
      result_status: "reviewed",
    };

    assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, structuredApprove), true);
    assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, { ...structuredApprove, decision: "request_changes" }), false);
    assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, { ...structuredApprove, decision: "reject" }), false);
    assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, { ...structuredApprove, candidate_id: "str-2" }), false);
    assert.equal(canMarkStructuredCandidateReviewed(structuredCandidate, { ...structuredApprove, source_document_id: "src-2" }), false);
  `;

  await execFileAsync("node", ["--experimental-strip-types", "--input-type=module", "--eval", runtimeCheckScript], {
    cwd: new URL("..", import.meta.url),
  });
});
