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
    "subject: string",
    'extraction_status: PastExamExtractionStatus',
    'source_type: "pdf"',
    'raw_text_policy: "reference_only"',
    'source_status: PastExamSourceReviewStatus',
    "linked_reference_ids",
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

test("no implementation scope creep fields are introduced in source metadata", async () => {
  const source = await readUtf8(sourcePath);
  const forbidden = ["raw_ocr", "user_ocr", "raw_user_ocr", "raw_user_answer", "user_answer_raw"];

  for (const key of forbidden) {
    assert.equal(source.includes(key), false, `forbidden raw user field in source metadata: ${key}`);
  }
});

test("no new public archive/upload/instructor source routes are introduced", async () => {
  const shouldNotExist = [
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/upload/page.tsx", import.meta.url),
    new URL("../app/exams/archive/source-upload/page.tsx", import.meta.url),
    new URL("../app/instructor/source/page.tsx", import.meta.url),
    new URL("../app/instructor/source-upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});
