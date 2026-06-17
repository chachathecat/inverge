import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const capture = readFileSync("components/review-os/capture-form.tsx", "utf8");
const home = readFileSync("app/app/page.tsx", "utf8");
const session = readFileSync("app/app/session/page.tsx", "utf8");
const queue = readFileSync("components/review-os/review-queue-client.tsx", "utf8");
const learnerFiles = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "components/review-os/capture-form.tsx",
  "app/app/session/page.tsx",
  "app/app/review/page.tsx",
  "components/review-os/review-queue-client.tsx",
].map((file) => readFileSync(file, "utf8"));

test("capture includes required labels and OCR caution", () => {
  ["사진/PDF로 시작하기", "사진 찍기", "앨범에서 선택", "텍스트 입력", "PDF 선택", "OCR/AI 정리는 초안입니다"].forEach((text) => {
    assert.ok(capture.includes(text), `Missing: ${text}`);
  });
});

test("capture keeps primary action before optional metadata", () => {
  ["소요 시간", "자신감", "메모"].forEach((label) => {
    assert.ok(capture.indexOf("사진 찍기") < capture.indexOf(label), `Expected 사진 찍기 before ${label}`);
  });
});

test("home keeps priority and queue framing", () => {
  assert.ok(home.includes("오늘의 우선순위") || home.includes("오늘은 이것부터 하세요"));
  assert.ok(home.includes("오늘 한 것 올리기"));
  assert.ok(home.includes("복습 큐"));
});

test("session saved state keeps required continuity lines", () => {
  ["오늘 계획에 반영했습니다.", "Today Plan candidate", "Review Queue candidate", "Note/details에 저장했습니다.", "가장 큰 간극:", "다음 행동:"].forEach((text) => {
    assert.ok(session.includes(text), `Missing: ${text}`);
  });
});

test("review queue keeps calm empty state and capture continuity", () => {
  ["아직 계정 저장 기준으로 Review에 이어갈 후보가 없습니다.", "오늘 한 것 올리기", "오늘 한 것", "반복 신호와 최근 기록 기준", "다시 보기"].forEach((text) => {
    assert.ok(queue.includes(text), `Missing: ${text}`);
  });
});

test("guardrails remain intact", () => {
  const joined = learnerFiles.join("\n");
  [/\/instructor/i, /official grader/i, /pass\/fail/i, /공식 채점/, /합격 판정/, /\bCPA\b/, /TOEFL/i, /\bSAT\b/, /보험계리사/, /세무사/, /documentprocessorserviceclient/i, /@google-cloud\/vision/i, /tesseract/i].forEach((pattern) => {
    assert.doesNotMatch(joined, pattern, `Forbidden token found: ${pattern}`);
  });
});

test("mobile and static design constraints", () => {
  const joined = learnerFiles.join("\n");
  ["w-full", "sm:w-auto", "grid gap", "flex-col", "focus-visible"].forEach((token) => {
    assert.ok(joined.includes(token), `Missing responsive/accessibility token: ${token}`);
  });
  ["<table", "pink", "salmon", "fuchsia", "lime"].forEach((token) => {
    assert.equal(joined.toLowerCase().includes(token), false, `Unexpected token: ${token}`);
  });
});
