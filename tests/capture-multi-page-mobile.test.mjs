import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const captureSourceUrl = new URL("../components/review-os/capture-form.tsx", import.meta.url);
const ocrRouteUrl = new URL("../app/api/inverge/ocr/route.ts", import.meta.url);

test("learner capture supports multi-page mobile page ordering without instructor routes", async () => {
  const source = await readFile(captureSourceUrl, "utf8");
  [
    /여러 장 답안지는 순서가 중요합니다\.\s*저장 전 페이지 순서와 OCR\s*내용을 확인해 주세요\./,
    "movePage",
    "removePage",
    "위로 이동",
    "아래로 이동",
    "미리보기",
    "다시 찍기",
    "multiple",
  ].forEach((token) => token instanceof RegExp ? assert.match(source, token, `missing ${token}`) : assert.ok(source.includes(token), `missing ${token}`));
  assert.equal(source.includes("/api/instructor/second-grading/ocr"), false);
  assert.equal(source.includes("/instructor"), false);
});

test("merged OCR text preserves page boundaries and remains editable with draft autosave", async () => {
  const source = await readFile(captureSourceUrl, "utf8");
  [
    "[Page ${index + 1}]",
    "mergePageText",
    "syncPageTextFromMergedText",
    "OCR 결과 확인 (편집 가능 · 자동 저장)",
    "onRawOcrChange",
    "hasManualCorrection",
    "capturePages",
    "pageCount",
    "sourceType",
  ].forEach((token) => token instanceof RegExp ? assert.match(source, token, `missing ${token}`) : assert.ok(source.includes(token), `missing ${token}`));
});

test("low confidence OCR is saved as safe derived metadata and not deterministic calculation input", async () => {
  const source = await readFile(captureSourceUrl, "utf8");
  [
    "lowConfidenceFlag",
    "captureQualityIssue",
    "인식이 불안정합니다. 중요한 숫자/단어를 확인해 주세요.",
    /form\.lowConfidenceFlag && !form\.ocrConfirmedByLearner\s*\? null\s*: getCalculatorWorkflowForSubject/,
    "raw_ocr_text: form.rawOcrText || form.rawQuestionText || \"\"",
  ].forEach((token) => token instanceof RegExp ? assert.match(source, token, `missing ${token}`) : assert.ok(source.includes(token), `missing ${token}`));
});

test("learner OCR API returns page-aware draft text without PDF extraction dependency", async () => {
  const source = await readFile(ocrRouteUrl, "utf8");
  [
    "ocrPages",
    "[Page ${page.pageNumber}]",
    "pages: ocrPages",
    "pageCount",
    "extractTranscriptionFromImages([file])",
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  assert.equal(source.includes("pdfjs"), false);
  assert.equal(source.includes("/api/instructor/second-grading/ocr"), false);
});
