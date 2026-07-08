import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("app/answer-review/page.tsx", "utf8");
const routeSource = readFileSync("app/api/answer-review/structure/route.ts", "utf8");
const clientSource = readFileSync("app/answer-review/answer-review-client.tsx", "utf8");
const frontPageSource = readFileSync("components/inverge/front-page.tsx", "utf8");
const writePageSource = readFileSync("app/app/write/page.tsx", "utf8");

const learnerSources = [pageSource, routeSource, clientSource, frontPageSource, writePageSource];

test("answer review page allows anonymous render with viewer mode", () => {
  assert.equal(pageSource.includes('redirect("/login'), false);
  assert.equal(pageSource.includes("AnswerReviewClientPage"), true);
  assert.equal(pageSource.includes("viewerMode"), true);
});

test("structure route supports anonymous access with authenticated persistence guard", () => {
  assert.equal(routeSource.includes("로그인이 필요합니다."), false);
  ['learningSignalStatus: "saved" | "skipped" | "failed"', '"skipped"', "createLearningSignalEvent", "if (session.userId && session.email"].forEach((phrase) => {
    assert.equal(routeSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
  assert.equal(routeSource.includes("insufficient") || routeSource.includes("INPUT_QUALITY_MESSAGE") || routeSource.includes("input quality"), true);
});

test("answer review client includes anonymous trial progressive disclosure", () => {
  ["로그인 없이 오늘 1회 빠른 답안 정리", "무료 체험 1회", "로그인하고 기록 저장", "기록 저장, 복습, 오늘 계획 반영", "오늘 무료 정리 1회를 사용했습니다"].forEach((phrase) => {
    assert.equal(clientSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
});

test("front page cta reflects capture-first product path and preserves order", () => {
  ["오늘 답안 올리기", "데모 결과 보기"].forEach((phrase) => {
    assert.equal(frontPageSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
  assert.ok(frontPageSource.indexOf("오늘 답안 올리기") < frontPageSource.indexOf("데모 결과 보기"));
});

test("write page includes trial and quick-open helper notes", () => {
  ["답안 스냅 검토", "사례 스캔"].forEach((phrase) => {
    assert.equal(writePageSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
});

test("guardrails block forbidden grading and provider leakage", () => {
  [
    "확정 점수",
    "모범답안 확정",
    "official grader",
    "pass/fail judge",
    "정답 보장",
    "합격 보장",
    "/instructor/source-review",
    "/instructor/second-grading",
    "@google-cloud/vision",
    "DocumentProcessorServiceClient",
    "tesseract",
    "documentai",
  ].forEach((token) => {
    learnerSources.forEach((source) => {
      assert.equal(source.toLowerCase().includes(token.toLowerCase()), false, `Forbidden token found: ${token}`);
    });
  });
  learnerSources.forEach((source) => {
    assert.doesNotMatch(source, /공식 채점(?!\s*아님|이나)/);
    assert.doesNotMatch(source, /합격 판정(?!이 아닙니다|이 아니라|이 아님| 아님)/);
  });
});
