import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frontPage = readFileSync("components/inverge/front-page.tsx", "utf8");
const heroAnimation = readFileSync("components/inverge/front-page-hero-animation.tsx", "utf8");
const publicSources = [frontPage, heroAnimation];

test("hero animation includes answer review skeleton framework demo and safety framing", () => {
  [
    "답안 검토실 데모",
    "문제 스냅 → 설명 초안",
    "모범답안 구조 (Skeleton Framework)",
    "학습 보조 Skeleton",
    "문장형 답안이 아니라 목차와 필수 키워드",
    "Ⅰ. 논점의 정리",
    "Ⅱ. 기준/법리",
    "Ⅲ. 사안의 적용",
    "Ⅳ. 결론",
    "민법 제109조",
    "판례 키워드",
    "산식",
    "오늘 할 일",
    "착오 취소 선지 2개 다시 풀기",
    "useReducedMotion",
  ].forEach((phrase) => {
    assert.ok(heroAnimation.includes(phrase), `Missing hero phrase: ${phrase}`);
  });
});

test("front page keeps CTA copy and includes skeleton value proposition", () => {
  ["오늘 입력 시작", "답안 검토실 무료 체험", "답안 구조 Skeleton"].forEach((phrase) => {
    assert.ok(frontPage.includes(phrase), `Missing front page phrase: ${phrase}`);
  });
});

test("front page keeps primary CTA before secondary CTA", () => {
  const primaryIndex = frontPage.indexOf("오늘 입력 시작");
  const secondaryIndex = frontPage.indexOf("답안 검토실 무료 체험");

  assert.ok(primaryIndex >= 0, "Primary CTA is missing");
  assert.ok(secondaryIndex >= 0, "Secondary CTA is missing");
  assert.ok(primaryIndex < secondaryIndex, "Primary CTA must appear before secondary CTA in source order");
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
