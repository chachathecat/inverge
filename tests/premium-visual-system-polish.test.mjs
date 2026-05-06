import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const capture = readFileSync("components/review-os/capture-form.tsx", "utf8");
const home = readFileSync("app/app/page.tsx", "utf8");
const session = readFileSync("app/app/session/page.tsx", "utf8");
const reviewPage = readFileSync("app/app/review/page.tsx", "utf8");
const queue = readFileSync("components/review-os/review-queue-client.tsx", "utf8");
const learnerFiles = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "components/review-os/capture-form.tsx",
  "app/app/session/page.tsx",
  "app/app/review/page.tsx",
  "components/review-os/review-queue-client.tsx",
].map((file) => readFileSync(file, "utf8"));

test("capture-form includes premium capture entry essentials", () => {
  ["사진으로 시작하기", "사진 찍기", "앨범에서 선택", "텍스트로 입력", "PDF 선택", "OCR 결과는 초안입니다", "저장 전 직접 확인해 주세요", "w-full", "sm:w-auto", "transition"].forEach((phrase) => {
    assert.ok(capture.includes(phrase), `Missing phrase: ${phrase}`);
  });
  assert.ok(capture.includes("focus-visible") || capture.includes("focus"), "Expected focus-visible or focus styles");
});

test("capture primary action appears before optional metadata", () => {
  assert.ok(capture.indexOf("사진 찍기") < capture.indexOf("소요 시간"));
  assert.ok(capture.indexOf("사진 찍기") < capture.indexOf("자신감"));
});

test("capture excludes grading/final judgment claims", () => {
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "pass/fail", "official grader"].forEach((phrase) => {
    assert.equal(capture.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden phrase found: ${phrase}`);
  });
});

test("learner home contains priority and queue framing", () => {
  assert.ok(home.includes("오늘의 우선순위") || home.includes("오늘은 이것부터 하세요"));
  assert.ok(home.includes("기록 추가하기") || home.includes("오늘 한 것 올리기"));
  ["오늘 기록 기반", "복습 큐"].forEach((phrase) => assert.ok(home.includes(phrase), `Missing phrase: ${phrase}`));
});

test("session saved state contains confirmation lines", () => {
  ["오늘 기록이 저장되었습니다.", "복습 큐에 들어갔습니다.", "오늘 계획에 반영되었습니다.", "가장 큰 간극:", "다음 행동:"].forEach((phrase) => {
    assert.ok(session.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("review queue includes empty-state and capture continuity copy", () => {
  ["아직 복습 큐가 비어 있습니다.", "오늘 기록 남기기", "오늘 한 것", "반복 신호와 최근 기록 기준", "다시 보기"].forEach((phrase) => {
    assert.ok(queue.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("guardrails: no instructor links, provider leakage, grading claims, or new exams", () => {
  const joined = learnerFiles.join("\n").toLowerCase();
  ["/instructor", "documentprocessorserviceclient", "@google-cloud/vision", "tesseract", "official grader", "pass/fail", "공식 채점", "합격 판정", "cpa", "toefl", "sat", "보험계리사", "세무사"].forEach((token) => {
    assert.equal(joined.includes(token.toLowerCase()), false, `Forbidden token found: ${token}`);
  });
});

test("mobile/design static checks", () => {
  const joined = learnerFiles.join("\n");
  ["w-full", "sm:w-auto", "grid gap", "flex-col"].forEach((token) => {
    assert.ok(joined.includes(token), `Expected responsive token: ${token}`);
  });
  ["<table", "pink", "salmon", "fuchsia", "lime"].forEach((token) => {
    assert.equal(joined.toLowerCase().includes(token), false, `Unexpected design token: ${token}`);
  });
  assert.ok(reviewPage.includes("ReviewQueueClient"));
});
