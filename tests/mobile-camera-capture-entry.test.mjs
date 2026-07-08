import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/review-os/capture-form.tsx", "utf8");

test("capture-form includes mobile camera intake entry and OCR states", () => {
  [
    "사진, PDF, 텍스트 중 하나로 시작하세요.",
    "사진 찍기",
    "앨범에서 선택",
    "PDF 선택",
    "텍스트 붙여넣기",
    'accept="image/*"',
    'capture="environment"',
    "multiple",
    'accept="application/pdf"',
    "handleImageImport",
    "handlePdfImport",
    "초안이 준비되었습니다",
    "사진을 읽지 못했습니다",
    "저장 전 직접 수정할 수 있습니다",
  ].forEach((phrase) => {
    assert.ok(source.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("capture-form excludes prohibited grading claims", () => {
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "pass/fail", "official grader"].forEach((phrase) => {
    if (phrase === "공식 채점") {
      assert.doesNotMatch(source, /공식\s*채점(?!\s*아님)/, `Forbidden phrase found: ${phrase}`);
      return;
    }
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
