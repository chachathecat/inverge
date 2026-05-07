import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frontPage = readFileSync("components/inverge/front-page.tsx", "utf8");
const heroAnimation = readFileSync("components/inverge/front-page-hero-animation.tsx", "utf8");
const publicSources = [frontPage, heroAnimation];

test("front page includes required answer review hero CTA and safety copy", () => {
  [
    "오늘 입력 시작",
    "답안 검토실 무료 체험",
    "/answer-review?mode=second",
    "문제 스냅, 답안 스냅, 텍스트 입력",
    "검토 결과는 학습 보조 초안",
    "저장 전 직접 확인",
  ].forEach((phrase) => {
    assert.ok(frontPage.includes(phrase), `Missing front page phrase: ${phrase}`);
  });
});

test("front page keeps primary CTA before secondary answer review CTA", () => {
  const primaryIndex = frontPage.indexOf("오늘 입력 시작");
  const secondaryIndex = frontPage.indexOf("답안 검토실 무료 체험");

  assert.ok(primaryIndex >= 0, "Primary CTA is missing");
  assert.ok(secondaryIndex >= 0, "Secondary CTA is missing");
  assert.ok(primaryIndex < secondaryIndex, "Primary CTA must appear before secondary CTA in source order");
});

test("hero animation includes answer review demo copy and reduced motion support", () => {
  [
    "답안 검토실 데모",
    "문제 스냅 → 설명 초안",
    "민법 예시",
    "착오 취소",
    "OCR 초안",
    "하이라이트",
    "요건",
    "예외",
    "선지 판단 기준",
    "설명 초안",
    "오늘 할 일",
    "착오 취소 선지 2개 다시 풀기",
    "예시는 학습 흐름을 보여주기 위한 샘플입니다.",
    "useReducedMotion",
  ].forEach((phrase) => {
    assert.ok(heroAnimation.includes(phrase), `Missing hero phrase: ${phrase}`);
  });
});

test("public landing guardrails block official grading claims", () => {
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장"].forEach((phrase) => {
    publicSources.forEach((source, index) => {
      assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden grading claim found [${index}]: ${phrase}`);
    });
  });
});

test("public landing introduces no new OCR provider tokens", () => {
  ["@google-cloud/vision", "DocumentProcessorServiceClient", "tesseract", "documentai"].forEach((token) => {
    publicSources.forEach((source, index) => {
      assert.equal(source.toLowerCase().includes(token.toLowerCase()), false, `Forbidden provider token found [${index}]: ${token}`);
    });
  });
});

test("public landing has no instructor route leakage", () => {
  ["/instructor/source-review", "/instructor/second-grading"].forEach((route) => {
    publicSources.forEach((source, index) => {
      assert.equal(source.includes(route), false, `Forbidden route found [${index}]: ${route}`);
    });
  });
});
