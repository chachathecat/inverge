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
    "답안 검토실 무료 체험",
    "Incognito",
    "무료 체험 1회",
    "계정 만들고 기록 저장",
    "결과 저장, 복습 큐, 오늘 계획 반영",
    "오늘 무료 검토 1회를 사용했습니다",
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

test("structure route keeps anonymous trial limit and authenticated persistence guard", () => {
  [
    "anonymous_answer_review_trial",
    "ANONYMOUS_TRIAL_LIMIT",
    'learningSignalStatus: "skipped"',
    "createLearningSignalEvent",
    "TODO: move anonymous trial limit to durable server-side store with IP/session-aware throttling.",
  ].forEach((phrase) => {
    assert.equal(routeSource.includes(phrase), true, `Missing route phrase: ${phrase}`);
  });
});

test("answer review client includes anonymous trial conversion copy", () => {
  ["무료 체험 1회", "계정 만들고 기록 저장", "오늘 무료 검토 1회를 사용했습니다", "결과 저장, 복습 큐, 오늘 계획 반영"].forEach((phrase) => {
    assert.equal(clientSource.includes(phrase), true, `Missing client phrase: ${phrase}`);
  });
});

test("front page includes trial CTA and keeps primary CTA order", () => {
  ["답안 검토실 무료 체험", "로그인 없이 오늘 1회 검토"].forEach((phrase) => {
    assert.equal(frontPageSource.includes(phrase), true, `Missing front page phrase: ${phrase}`);
  });
  assert.ok(frontPageSource.indexOf("오늘 입력 시작") < frontPageSource.indexOf("답안 검토실 무료 체험"));
});

test("guardrails block forbidden grading, route leakage, and provider expansion tokens", () => {
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
