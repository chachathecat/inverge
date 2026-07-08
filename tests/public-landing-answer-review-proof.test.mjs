import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frontPage = readFileSync("components/inverge/front-page.tsx", "utf8");
const heroAnimation = readFileSync("components/inverge/front-page-hero-animation.tsx", "utf8");
const publicSources = [frontPage, heroAnimation];

test("public front page surfaces Answer Road capture-first hero and proof access", () => {
  ["오늘 쓴 답안에서", "가장 먼저 고칠 문단을 찾습니다.", "/app/capture?mode=second", "/login?returnTo=/app/capture?mode=second", "AI가 찾은 가장 큰 약점", "공식 채점 아님"].forEach((phrase) => {
    assert.ok(frontPage.includes(phrase), `Missing front page phrase: ${phrase}`);
  });
  assert.equal(frontPage.includes("/answer-review?mode=second"), false);

  assert.ok(frontPage.includes("문제 스냅") || frontPage.includes("FrontPageHeroAnimation"), "Front page must include 문제 스냅 copy or proof animation import");
});

test("public hero animation includes concrete answer-review proof sequence", () => {
  ["민법 예시", "착오 취소", "문제 스냅", "OCR 초안", "핵심 조건", "설명 초안", "오늘 할 일", "착오 취소 선지 2개 다시 풀기", "useReducedMotion"].forEach((phrase) => {
    assert.ok(heroAnimation.includes(phrase), `Missing hero proof phrase: ${phrase}`);
  });
});

test("public landing no longer contains weak expansion-only copy", () => {
  assert.equal(
    frontPage.includes("답안 검토실은 학원과 고빈도 답안 검토 사용자를 위한 운영형 검토 공간으로 확장 예정입니다."),
    false,
    "Weak expansion-only copy should be removed",
  );
});

test("public landing guardrails block official grading claims", () => {
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장"].forEach((phrase) => {
    publicSources.forEach((source, index) => {
      assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden grading claim found [${index}]: ${phrase}`);
    });
  });
});

test("public landing introduces no new OCR provider scope tokens", () => {
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
