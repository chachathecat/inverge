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
  ["사진, PDF, 텍스트 중 하나로 시작하세요.", "사진 찍기", "앨범에서 선택", "텍스트 붙여넣기", "PDF 선택", "OCR과 AI 정리는 학습 보조 초안입니다", "저장 전 직접 수정할 수 있습니다", "w-full", "sm:w-auto", "transition"].forEach((phrase) => {
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
    if (phrase === "공식 채점") {
      assert.doesNotMatch(capture, /공식\s*채점(?!\s*아님)/, `Forbidden phrase found: ${phrase}`);
      return;
    }
    assert.equal(capture.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden phrase found: ${phrase}`);
  });
});

test("learner home contains priority and queue framing", () => {
  assert.ok(home.includes("오늘의 우선순위") || home.includes("오늘은 이것만 하면 됩니다"));
  assert.ok(home.includes("오늘 한 것 올리기"));
  ["오늘 기록 기반", "복습"].forEach((phrase) => assert.ok(home.includes(phrase), `Missing phrase: ${phrase}`));
});

test("session saved state contains confirmation lines", () => {
  ["오늘 계획에 반영했습니다.", "Today Plan candidate", "Review Queue candidate", "Note/details에 저장했습니다.", "가장 큰 간극:", "다음 행동:"].forEach((phrase) => {
    assert.ok(session.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("review queue includes empty-state and capture continuity copy", () => {
  ["지금 복습할 항목이 없습니다.", "오늘 한 것 올리기", "오늘 한 것", "오늘 한 것을 올리면 복습할 항목이 만들어집니다.", "다음 행동"].forEach((phrase) => {
    assert.ok(queue.includes(phrase), `Missing phrase: ${phrase}`);
  });
});

test("guardrails: no instructor links, provider leakage, grading claims, or new exams", () => {
  const joined = learnerFiles.join("\n");
  [/\/instructor/i, /documentprocessorserviceclient/i, /@google-cloud\/vision/i, /tesseract/i, /official grader/i, /pass\/fail/i, /공식 채점/, /합격 판정/, /\bCPA\b/, /TOEFL/i, /\bSAT\b/, /보험계리사/, /세무사/].forEach((pattern) => {
    if (String(pattern) === "/공식 채점/") {
      assert.doesNotMatch(joined, /공식\s*채점(?!\s*아님)/, `Forbidden token found: ${pattern}`);
      return;
    }
    assert.doesNotMatch(joined, pattern, `Forbidden token found: ${pattern}`);
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
