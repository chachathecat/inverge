import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePage = readFileSync("app/app/page.tsx", "utf8");
const homeProof = readFileSync("components/review-os/home-proof-animation.tsx", "utf8");
const writePage = readFileSync("app/app/write/page.tsx", "utf8");
const answerReviewPage = readFileSync("app/answer-review/page.tsx", "utf8");
const answerReviewClient = readFileSync("app/answer-review/answer-review-client.tsx", "utf8");

const learnerFacingSources = [homePage, homeProof, writePage, answerReviewPage, answerReviewClient];

test("home includes answer review studio surfacing and proof lines", () => {
  ["답안 검토실", "답안 검토실 열기", "/answer-review?mode=second", "문제 스냅", "OCR 초안", "설명 초안", "다음 행동"].forEach((phrase) => {
    assert.ok(homePage.includes(phrase), `Missing home phrase: ${phrase}`);
  });
});

test("home proof animation component includes required sequence and reduced motion guard", () => {
  ["문제 스냅", "OCR 초안 생성", "핵심 조건 확인", "설명 초안", "오늘 할 일", "useReducedMotion"].forEach((phrase) => {
    assert.ok(homeProof.includes(phrase), `Missing home proof phrase: ${phrase}`);
  });
});

test("second-stage write page includes photo-first entries", () => {
  ["답안 스냅 검토", "사례 스캔", "새 답안 작성", "/answer-review?mode=second"].forEach((phrase) => {
    assert.ok(writePage.includes(phrase), `Missing write phrase: ${phrase}`);
  });
});

test("answer review entry copy is premium and clear", () => {
  ["답안 검토실", "답안 스냅으로 시작", "사례 스캔", "PDF/사진 불러오기", "텍스트 붙여넣기", "누락 논점", "다시 쓸 문장"].forEach((phrase) => {
    assert.ok((answerReviewPage + answerReviewClient).includes(phrase), `Missing answer-review phrase: ${phrase}`);
  });
});

test("learner-facing guardrails block official grading claims", () => {
  ["공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge"].forEach((phrase) => {
    learnerFacingSources.forEach((source, index) => {
      assert.equal(source.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden grading claim found [${index}]: ${phrase}`);
    });
  });
});

test("no new OCR provider scope tokens", () => {
  ["@google-cloud/vision", "DocumentProcessorServiceClient", "tesseract", "documentai"].forEach((token) => {
    learnerFacingSources.forEach((source, index) => {
      assert.equal(source.toLowerCase().includes(token.toLowerCase()), false, `Forbidden provider token found [${index}]: ${token}`);
    });
  });
});

test("no instructor route leakage", () => {
  ["/instructor/source-review", "/instructor/second-grading"].forEach((route) => {
    learnerFacingSources.forEach((source, index) => {
      assert.equal(source.includes(route), false, `Forbidden route found [${index}]: ${route}`);
    });
  });
});
