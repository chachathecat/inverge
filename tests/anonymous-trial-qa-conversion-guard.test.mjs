import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const qaDocPath = "docs/anonymous-answer-review-trial-qa.md";

const pageSource = readFileSync("app/answer-review/page.tsx", "utf8");
const routeSource = readFileSync("app/api/answer-review/structure/route.ts", "utf8");
const clientSource = readFileSync("app/answer-review/answer-review-client.tsx", "utf8");
const frontPageSource = readFileSync("components/inverge/front-page.tsx", "utf8");

const learnerSources = [pageSource, routeSource, clientSource, frontPageSource];

test("qa doc exists with required anonymous conversion checklist phrases", () => {
  assert.equal(existsSync(qaDocPath), true, "QA doc should exist");
  const qaDoc = readFileSync(qaDocPath, "utf8");

  [
    "빠른 답안 정리",
    "Incognito",
    "무료 체험 1회",
    "로그인하고 기록 저장",
    "기록 저장, 복습, 오늘 계획 반영",
    "오늘 무료 정리 1회를 사용했습니다",
    "learningSignalStatus is skipped",
    "No Review Queue / Today Plan save occurs",
  ].forEach((phrase) => {
    assert.equal(qaDoc.includes(phrase), true, `Missing QA phrase: ${phrase}`);
  });
});

test("answer review page keeps anonymous access and passes viewerMode", () => {
  assert.equal(pageSource.includes('redirect("/login'), false);
  assert.equal(pageSource.includes("viewerMode"), true);
});

test("structure route keeps anonymous access and authenticated persistence guard", () => {
  [
    'learningSignalStatus: "saved" | "skipped" | "failed"',
    '"skipped"',
    "createLearningSignalEvent",
    "if (session.userId && session.email",
  ].forEach((phrase) => {
    assert.equal(routeSource.includes(phrase), true, `Missing route phrase: ${phrase}`);
  });
});

test("answer review client includes anonymous trial conversion copy", () => {
  ["무료 체험 1회", "로그인하고 기록 저장", "오늘 무료 정리 1회를 사용했습니다", "기록 저장, 복습, 오늘 계획 반영"].forEach((phrase) => {
    assert.equal(clientSource.includes(phrase), true, `Missing client phrase: ${phrase}`);
  });
});

test("front page includes capture CTA and keeps primary CTA order", () => {
  ["답안 1개 올리기", "검토 예시 보기"].forEach((phrase) => {
    assert.equal(frontPageSource.includes(phrase), true, `Missing front page phrase: ${phrase}`);
  });
  assert.ok(frontPageSource.indexOf("답안 1개 올리기") < frontPageSource.indexOf("검토 예시 보기"));
});

test("guardrails block forbidden grading, route leakage, and provider expansion tokens", () => {
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
