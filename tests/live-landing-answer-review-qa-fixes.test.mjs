import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const frontPage = readFileSync("components/inverge/front-page.tsx", "utf8");
const hero = readFileSync("components/inverge/front-page-hero-animation.tsx", "utf8");
const answerReview = readFileSync("app/answer-review/answer-review-client.tsx", "utf8");
const writePage = readFileSync("app/app/write/page.tsx", "utf8");
const captureForm = readFileSync("components/review-os/capture-form.tsx", "utf8");

test("landing keeps CTA hierarchy and required proof tokens", () => {
  ["오늘 입력 시작", "답안 검토실 무료 체험", "문제 스냅", "OCR 초안", "핵심 조건 하이라이트", "설명 초안", "오늘 할 일"].forEach((token) => {
    assert.ok((frontPage + hero).includes(token), `missing token: ${token}`);
  });
  assert.ok((frontPage + hero).includes("예시는 학습 흐름을 보여주기 위한 샘플입니다."));
  assert.ok(frontPage.indexOf("오늘 입력 시작") < frontPage.indexOf("답안 검토실 무료 체험"));
});

test("answer review quick actions stay prioritized and mobile clear", () => {
  ["답안 스냅으로 시작", "사례 스캔", "PDF/사진 불러오기", "텍스트 붙여넣기", "scrollIntoView", "focus"].forEach((token) => {
    assert.ok(answerReview.includes(token), `missing quick action token: ${token}`);
  });
  ["가장 큰 간극", "누락 논점", "약한 구조", "다시 쓸 문장", "다음 행동"].forEach((token) => {
    assert.ok(answerReview.includes(token), `missing result token: ${token}`);
  });
});

test("second write entry cards remain separated by intent", () => {
  ["답안 스냅 검토", "사례 스캔", "새 답안 작성", "이미 쓴 답안", "새 작성 경로"].forEach((token) => {
    assert.ok(writePage.includes(token), `missing write entry token: ${token}`);
  });
});

test("guardrails and scope boundaries remain enforced", () => {
  const blocked = [
    "공식 채점", "합격 판정", "확정 점수", "모범답안 확정", "official grader", "pass/fail judge", "정답 보장", "합격 보장",
    "/instructor/source-review", "/instructor/second-grading", "@google-cloud/vision", "DocumentProcessorServiceClient", "tesseract", "documentai",
  ];
  const combined = [frontPage, hero, answerReview, writePage, captureForm].join("\n").toLowerCase();
  blocked.forEach((token) => assert.equal(combined.includes(token.toLowerCase()), false, `blocked token found: ${token}`));
});
