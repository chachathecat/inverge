import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frontPage = readFileSync("components/inverge/front-page.tsx", "utf8");
const heroAnimation = readFileSync("components/inverge/front-page-hero-animation.tsx", "utf8");
const publicSources = [frontPage, heroAnimation];

test("hero animation includes compact answer-training preview and safety framing", () => {
  [
    "답안길 미리보기",
    "공식 채점 아님",
    "가장 큰 약점",
    "쟁점은 잡았지만 기준/법리 문단이 약합니다.",
    "오늘 다시 쓸 문단",
    "민법 제109조",
    "예시는 학습 흐름을 보여주기 위한 샘플입니다.",
    "useReducedMotion",
  ].forEach((phrase) => {
    assert.ok(heroAnimation.includes(phrase), `Missing hero phrase: ${phrase}`);
  });
});

test("front page keeps CTA copy and compact preview value proposition", () => {
  ["답안 1개 올리기", "검토 예시 보기", "답안길 미리보기"].forEach((phrase) => {
    assert.ok(frontPage.includes(phrase), `Missing front page phrase: ${phrase}`);
  });
});

test("front page keeps primary CTA before secondary CTA", () => {
  const primaryIndex = frontPage.indexOf("답안 1개 올리기");
  const secondaryIndex = frontPage.indexOf("검토 예시 보기");

  assert.ok(primaryIndex >= 0, "Primary CTA is missing");
  assert.ok(secondaryIndex >= 0, "Secondary CTA is missing");
  assert.ok(primaryIndex < secondaryIndex, "Primary CTA must appear before secondary CTA in source order");
});

test("public landing guardrails block official grading claims", () => {
  ["확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장"].forEach((phrase) => {
    publicSources.forEach((source, index) => {
      assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden grading claim found [${index}]: ${phrase}`);
    });
  });
  publicSources.forEach((source) => assert.doesNotMatch(source, /공식 채점(?!\s*아님|이나)/));
  publicSources.forEach((source) => assert.doesNotMatch(source, /합격 판정(?!이 아닙니다|이 아니라|이 아님| 아님)/));
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
