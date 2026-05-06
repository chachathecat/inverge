import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import {
  buildManualOcrStubResult,
  convertOcrResultToExtractionCandidate,
} from "../lib/review-os/past-exam-ocr-adapter.ts";

const adapterPath = new URL("../lib/review-os/past-exam-ocr-adapter.ts", import.meta.url);

test("stub result is reference_only", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-1",
    storage_path: "sources/2025-1.pdf",
    source_type: "pdf",
  });

  assert.equal(result.extracted_text_policy, "reference_only");
});

test("stub result is needs_review", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-2",
    storage_path: "sources/2025-2.pdf",
    source_type: "pdf",
  });

  assert.equal(result.review_status, "needs_review");
});

test("stub result uses provider manual_stub", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-3",
    storage_path: "sources/2025-3.pdf",
    source_type: "pdf",
  });

  assert.equal(result.provider, "manual_stub");
});

test("empty storage_path returns failed", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-4",
    storage_path: "   ",
    source_type: "pdf",
  });

  assert.equal(result.extraction_status, "failed");
});

test("non-empty storage_path returns extracted", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-5",
    storage_path: "sources/2025-5.pdf",
    source_type: "pdf",
  });

  assert.equal(result.extraction_status, "extracted");
});

test("conversion creates PastExamExtractionCandidate", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-6",
    storage_path: "sources/2025-6.pdf",
    source_type: "pdf",
  });

  const candidate = convertOcrResultToExtractionCandidate(result);

  assert.equal(candidate.source_document_id, "source-ocr-6");
  assert.equal(candidate.created_from, "source_pdf");
  assert.equal(candidate.extracted_text_policy, "reference_only");
});

test("candidate remains needs_review", () => {
  const result = buildManualOcrStubResult({
    source_document_id: "source-ocr-7",
    storage_path: "sources/2025-7.pdf",
    source_type: "pdf",
  });

  const candidate = convertOcrResultToExtractionCandidate(result);

  assert.equal(candidate.review_status, "needs_review");
});

test("no OCR provider call", async () => {
  const source = await readFile(adapterPath, "utf8");

  const forbidden = ["fetch(", "axios", "vision", "tesseract", "googleapis", "openai"];
  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden OCR provider token found: ${token}`);
  }
});

test("no upload route", async () => {
  const shouldNotExist = [
    new URL("../app/api/ocr/route.ts", import.meta.url),
    new URL("../app/api/pdf-upload/route.ts", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no learner source viewer", async () => {
  const shouldNotExist = [
    new URL("../app/exams/archive/source/page.tsx", import.meta.url),
    new URL("../app/exams/archive/source-upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no archive UI", async () => {
  const shouldNotExist = [
    new URL("../app/exams/archive/upload/page.tsx", import.meta.url),
  ];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no official answer/scoring/pass-fail language", async () => {
  const source = await readFile(adapterPath, "utf8");
  const forbidden = ["official_answer", "official_scoring", "pass_fail", "final judgment", "자동 채점"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});

test("no raw user OCR/user answer fields", async () => {
  const source = await readFile(adapterPath, "utf8");
  const forbidden = ["raw_user_ocr", "user_ocr", "raw_user_answer", "user_answer_raw"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});
