import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/review-os/capture-form.tsx", "utf8");

test("capture-form includes mobile camera intake entry and OCR states", () => {
  [
    "사진으로 시작하기",
    "사진 찍기",
    "앨범에서 선택",
    "PDF 선택",
    "텍스트로 입력",
    'accept="image/*"',
    'capture="environment"',
    "multiple",
    'accept="application/pdf"',
    "handleImageImport",
    "handlePdfImport",
    "OCR 초안이 준비되었습니다",
    "사진을 읽지 못했습니다",
    "저장 전 직접 확인해 주세요",
  ].forEach((phrase) => {
    assert.ok(source.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("capture-form excludes prohibited grading claims", () => {
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "pass/fail", "official grader"].forEach((phrase) => {
    assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden phrase found: ${phrase}`);
  });
});

test("capture-form excludes instructor route leakage", () => {
  ["/instructor/source-review", "/instructor/second-grading"].forEach((route) => {
    assert.equal(source.includes(route), false, `Forbidden route found: ${route}`);
  });
});

test("capture-form introduces no new OCR providers", () => {
  ["@google-cloud/vision", "DocumentProcessorServiceClient", "tesseract", "openai", "documentai"].forEach((token) => {
    assert.equal(source.toLowerCase().includes(token.toLowerCase()), false, `Forbidden provider token found: ${token}`);
  });
});
