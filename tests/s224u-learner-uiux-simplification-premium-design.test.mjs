import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const count = (text, needle) => (text.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

const learnerUiFiles = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/answer-review/answer-review-client.tsx",
  "components/review-os/capture-form.tsx",
  "components/review-os/review-queue-client.tsx",
  "components/review-os/today-first-subject-selector.tsx",
  "components/review-os/trust-status-card.tsx",
  "components/review-os/s220c-first-five-minute-magic.tsx",
  "components/review-os/minimal-study-system.tsx",
];

test("learner home keeps one dominant action, Today Plan max-3 focus, and quiet secondary routes", () => {
  const home = read("app/app/page.tsx");
  const selector = read("components/review-os/today-first-subject-selector.tsx");

  assert.match(home, /data-today-plan-primary-surface/);
  assert.match(home, /data-visible-primary-task-cap=\{TODAY_PLAN_MAX_PRIMARY_TASKS\}/);
  assert.match(home, /visibleTodayPlanTasks\.map/);
  assert.match(home, /data-learning-loop-summary/);
  assert.match(home, /학습 루프 요약 보기/);

  assert.match(selector, /data-primary-learner-action/);
  assert.match(selector, /const showCaptureLink\s*=\s*links\.capture !== links\.primary/);
  assert.match(selector, /data-secondary-action-surface=\{`\$\{mode\}-mode-input-options`\}/);
  assert.match(selector, /다른 작업 보기/);
  assert.match(selector, /오늘 한 것 올리기/);
});

test("capture and answer review expose one loop: input, confirmation, gap, action, retrieval, continuation", () => {
  const capture = read("components/review-os/capture-form.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const reviewQueue = read("components/review-os/review-queue-client.tsx");

  for (const phrase of [
    "data-capture-stage-flow",
    "입력",
    "OCR/텍스트 확인",
    "가장 큰 약점",
    "오늘 계획 반영",
    "data-trust-layer=\"capture-intake\"",
  ]) {
    assert.ok(capture.includes(phrase), `missing capture loop phrase: ${phrase}`);
  }

  for (const phrase of [
    "data-answer-review-result-loop",
    "가장 큰 간극",
    "다음 행동",
    "10초 확인",
    "계속할 곳",
    "data-answer-review-secondary-details",
  ]) {
    assert.ok(answerReview.includes(phrase), `missing answer-review loop phrase: ${phrase}`);
  }

  assert.match(reviewQueue, /data-review-why-next/);
  assert.match(reviewQueue, /왜 여기 있나/);
  assert.match(reviewQueue, /다음 행동/);
});

test("trust layer copy is consistent and not stacked as repeated warnings", () => {
  const capturePage = read("app/app/capture/page.tsx");
  const capture = read("components/review-os/capture-form.tsx");
  const trustCard = read("components/review-os/trust-status-card.tsx");

  assert.doesNotMatch(capturePage, /data-trust-layer="capture-page-shell"/);
  assert.equal(count(capture, "OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다."), 1);
  assert.match(capture, /const CAPTURE_TRUST_LAYER_COPY/);
  assert.doesNotMatch(capture, /ANSWER_SUBMISSION_OCR_TRUST_COPY/);
  assert.match(trustCard, /사용자 확인 텍스트/);
  assert.match(trustCard, /OCR\/가져온 텍스트 초안/);
  assert.match(trustCard, /AI 분석 초안/);
  assert.match(trustCard, /오늘 할 일/);
  assert.match(trustCard, /복습/);
  assert.match(trustCard, /학습 노트/);
});

test("design system documents and globals define the S224U premium gate primitives", () => {
  const globals = read("app/globals.css");
  const designDoc = read("docs/inverge-design-system.md");
  const implementationSpec = read("docs/DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md");

  for (const token of [
    "--cta-primary-bg",
    "--cta-secondary-bg",
    "--trust-layer-bg",
    "--touch-target-min",
    ".primary-action",
    ".secondary-action",
    ".trust-layer",
    ".status-focus",
    ".status-review",
    ".status-stable",
    ".status-failure",
    "letter-spacing: 0",
  ]) {
    assert.ok(globals.includes(token), `missing globals primitive: ${token}`);
  }

  for (const phrase of [
    "S224U Learner Gate Rules",
    "CTA Hierarchy",
    "Trust Layer",
    "Status Colors",
    "Mobile and Focus",
  ]) {
    assert.ok(designDoc.includes(phrase), `missing design doc phrase: ${phrase}`);
  }

  assert.match(implementationSpec, /S224U LEARNER UI\/UX GATE/);
  assert.match(implementationSpec, /input method → editable OCR\/text confirmation → biggest gap \+ next action → save to Today Plan \/ Review Queue \/ Notes/);
});

test("S224U surfaces do not add saturated gradients, negative tracking, payment, provider, academy, or positive grading claims", () => {
  const combined = learnerUiFiles.map(read).join("\n");

  assert.doesNotMatch(combined, /linear-gradient|tracking-\[|letter-spacing:\s*-/);
  assert.doesNotMatch(combined, /checkout|payment webhook|billing provider|production pricing|openai|gemini|provider runtime|ocr runtime/i);
  assert.doesNotMatch(combined, /\/api\/instructor|\/instructor|academy route|instructor route|학원용|강사/);
  assert.doesNotMatch(combined, /합격\s*(가능성|확률|보장)|정답 보장|AI 최종 판정|pass probability|pass\/fail|guarantee/i);
  assert.doesNotMatch(combined, /공식\s*모범답안|공식\s*채점\s*(결과|확정|완료|확인|입니다)|확정\s*점수\s*(결과|확인|입니다)/);
});
