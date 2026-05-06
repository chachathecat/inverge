import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const sourcePath = new URL("../lib/review-os/past-exam-source.ts", import.meta.url);
const protocolPath = new URL("../docs/source-pdf-ingestion-protocol.md", import.meta.url);

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
