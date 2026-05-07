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

test("structure route supports anonymous trial flow with daily limit", () => {
  assert.equal(routeSource.includes("로그인이 필요합니다."), false);
  ["ANONYMOUS_TRIAL_LIMIT", "anonymous_answer_review_trial", 'learningSignalStatus: "skipped"', "createLearningSignalEvent"].forEach((phrase) => {
    assert.equal(routeSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
  assert.equal(routeSource.includes("insufficient") || routeSource.includes("INPUT_QUALITY_MESSAGE") || routeSource.includes("input quality"), true);
});

test("answer review client includes anonymous trial progressive disclosure", () => {
  ["로그인 없이 오늘 1회 답안 검토", "무료 체험 1회", "계정 만들고 기록 저장", "결과 저장, 복습 큐, 오늘 계획 반영", "오늘 무료 검토 1회를 사용했습니다"].forEach((phrase) => {
    assert.equal(clientSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
});

test("front page cta reflects free trial and preserves order", () => {
  ["답안 검토실 무료 체험", "로그인 없이 오늘 1회 검토"].forEach((phrase) => {
    assert.equal(frontPageSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
  assert.ok(frontPageSource.indexOf("오늘 입력 시작") < frontPageSource.indexOf("답안 검토실 무료 체험"));
});

test("write page includes trial and quick-open helper notes", () => {
  ["로그인 없이 1회 체험 가능", "답안 검토실에서 바로 열립니다"].forEach((phrase) => {
    assert.equal(writePageSource.includes(phrase), true, `Missing phrase: ${phrase}`);
  });
});

test("guardrails block forbidden grading and provider leakage", () => {
  [
    "공식 채점",
    "합격 판정",
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
});
