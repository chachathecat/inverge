import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const forbiddenClaims = [
  "공식 모범답안",
  "확정 점수",
  "합격 가능성",
  "pass probability",
  "guarantee",
];

test("S220D shared trust card distinguishes user OCR AI and continuation states", () => {
  const source = read("components/review-os/trust-status-card.tsx");

  for (const phrase of [
    "trust-status-card",
    "사용자 확인 텍스트",
    "OCR/가져온 텍스트 초안",
    "AI 분석 초안",
    "확인 필요",
    "편집 가능",
    "학습 보조",
    "Today Plan",
    "Review Queue",
    "Notes",
  ]) {
    assert.ok(source.includes(phrase), `missing trust phrase: ${phrase}`);
  }

  assert.match(source, /공식 채점이나 확정 점수가 아닙니다/);
});

test("S220D first-session surface renders the trust card before answer input", () => {
  const source = read("components/review-os/s220c-first-five-minute-magic.tsx");

  assert.match(source, /TrustStatusCard/);
  assert.match(source, /OCR\/AI 결과는 학습 보조 초안입니다/);
  assert.match(source, /저장 전 직접 확인해 주세요/);
  assert.match(source, /href="#answer-review-start"/);
  assert.equal((source.match(/buttonVariants\(\{ size: "lg" \}\)/g) ?? []).length, 1);
});

test("S220D existing answer review and capture paths keep editable text fallback", () => {
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");

  assert.match(answerReview, /answerTextRef/);
  assert.match(answerReview, /value=\{myAnswerText\}/);
  assert.match(answerReview, /setMyAnswerText/);
  assert.match(answerReview, /텍스트 붙여넣기/);
  assert.match(captureForm, /textAreaRef/);
  assert.match(captureForm, /onRawOcrChange/);
  assert.match(captureForm, /직접 붙여넣거나 다시 찍기로 계속할 수 있습니다/);
  assert.match(captureForm, /hasManualCorrection/);
  assert.match(captureForm, /ocrConfirmedByLearner/);
});

test("S220D keeps commercial runtime and official-claim boundaries closed", () => {
  const combined = [
    "components/review-os/trust-status-card.tsx",
    "components/review-os/s220c-first-five-minute-magic.tsx",
    "app/answer-review/page.tsx",
  ].map((path) => read(path)).join("\n");

  for (const phrase of forbiddenClaims) {
    assert.equal(combined.includes(phrase), false, `forbidden claim leaked: ${phrase}`);
  }
  assert.doesNotMatch(combined, /checkout|payment webhook|billing provider|entitlement enforcement|production pricing|Supabase migration|academy route|instructor route/i);
});
