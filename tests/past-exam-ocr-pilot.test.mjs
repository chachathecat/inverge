import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

import { listPastExamSourceDocuments } from "../lib/review-os/past-exam-source-seeds.ts";
import {
  listPastExamOcrPilotExtractionCandidates,
  listPastExamOcrPilotResults,
} from "../lib/review-os/past-exam-ocr-pilot.ts";

const pilotPath = new URL("../lib/review-os/past-exam-ocr-pilot.ts", import.meta.url);

test("OCR pilot results load", () => {
  const results = listPastExamOcrPilotResults();

  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
});

test("each result links to an existing source document", () => {
  const sourceIds = new Set(listPastExamSourceDocuments().map((doc) => doc.id));

  for (const result of listPastExamOcrPilotResults()) {
    assert.equal(sourceIds.has(result.source_document_id), true);
  }
});

test("each result is reference_only", () => {
  for (const result of listPastExamOcrPilotResults()) {
    assert.equal(result.extracted_text_policy, "reference_only");
  }
});

test("each result is needs_review", () => {
  for (const result of listPastExamOcrPilotResults()) {
    assert.equal(result.review_status, "needs_review");
  }
});

test("provider is manual_stub", () => {
  for (const result of listPastExamOcrPilotResults()) {
    assert.equal(result.provider, "manual_stub");
  }
});

test("extraction candidates load", () => {
  const candidates = listPastExamOcrPilotExtractionCandidates();

  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.length > 0);
});

test("candidates are reference_only", () => {
  for (const candidate of listPastExamOcrPilotExtractionCandidates()) {
    assert.equal(candidate.extracted_text_policy, "reference_only");
  }
});

test("candidates are needs_review", () => {
  for (const candidate of listPastExamOcrPilotExtractionCandidates()) {
    assert.equal(candidate.review_status, "needs_review");
  }
});

test("candidates created_from is source_pdf", () => {
  for (const candidate of listPastExamOcrPilotExtractionCandidates()) {
    assert.equal(candidate.created_from, "source_pdf");
  }
});

test("no actual OCR provider token/call", async () => {
  const source = await readFile(pilotPath, "utf8");

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
  const shouldNotExist = [new URL("../app/exams/archive/upload/page.tsx", import.meta.url)];

  for (const pathUrl of shouldNotExist) {
    await assert.rejects(() => access(pathUrl, constants.F_OK));
  }
});

test("no official answer/scoring/pass-fail language", async () => {
  const source = await readFile(pilotPath, "utf8");
  const forbidden = ["official_answer", "official_scoring", "pass_fail", "final judgment", "자동 채점"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});

test("no raw user OCR/user answer fields", async () => {
  const source = await readFile(pilotPath, "utf8");
  const forbidden = ["raw_user_ocr", "user_ocr", "raw_user_answer", "user_answer_raw"];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});
