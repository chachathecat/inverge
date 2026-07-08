import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("capture page shell is slim and capture-first for both modes", () => {
  const page = read("app/app/capture/page.tsx");
  const form = read("components/review-os/capture-form.tsx");
  const combined = `${page}\n${form}`;

  [
    "오늘 한 것 올리기",
    "사진, PDF, 텍스트 중 하나로 시작하세요.",
    "감정평가실무",
    "감정평가이론",
    "감정평가 및 보상법규",
    "텍스트 붙여넣기",
    "입력 내용 확인하기",
    "OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.",
    "학습 보조용",
    "가장 큰 약점 1개",
    "다음 행동 1개",
    "오늘 할 일 후보",
    "복습 후보",
  ].forEach((phrase) => assert.ok(combined.includes(phrase), `Missing shell phrase: ${phrase}`));

  ["data-testid=\"capture-page-shell\"", "ClosedBetaBanner", "DailyCommandCard", "MinimalStepPanel", "QuietDetails", "LearnerProgressBar", "오늘 명령", "입력 순서 보기", "오늘 학습 정리하기", "오늘 한 것 정리하기"].forEach((phrase) => {
    assert.equal(combined.includes(phrase), false, `Heavy shell phrase should be removed: ${phrase}`);
  });
});

test("capture first screen keeps optional controls secondary", () => {
  const form = read("components/review-os/capture-form.tsx");

  assert.ok(form.includes("CaptureProgressPill"), "progress should be a quiet local pill");
  assert.ok(form.includes('stage === "intake" ? null'), "bottom other-choice control should not float on the first intake screen");
  assert.ok(form.indexOf("data-capture-subject-selector") < form.indexOf("data-capture-input-options"), "subject selector should appear before input options");
  assert.ok(form.indexOf("data-capture-input-options") < form.indexOf("오늘 공부한 내용 또는 내 답안"), "photo/PDF/text options should appear before the main textarea");
  assert.ok(form.indexOf("textAreaRef={textAreaRef}") < form.indexOf("선택 연습"), "optional O/X bridge should sit after the main intake card");
  assert.ok(form.includes("variant=\"outline\" className=\"mt-4 w-full sm:w-auto\""), "optional O/X bridge should not look like the primary CTA");
});

test("capture shell keeps learner safety boundaries", () => {
  const combined = `${read("app/app/capture/page.tsx")}\n${read("components/review-os/capture-form.tsx")}`;

  assert.doesNotMatch(combined, /기준\s*답안|기준답안|모범답안|공식답안|정답 확정|최종 판단/);
  assert.doesNotMatch(combined, /공식\s*채점|공식\s*점수|점수\s*예측|합격\s*판정|합격\s*가능성|pass\/?fail|official\s+model\s+answer/i);
  assert.doesNotMatch(combined, /\/instructor|\/admin|\/studio|checkout|payment|billing|subscription/i);
  assert.doesNotMatch(combined, /route\.ts|middleware|process\.env|service_role|OPENAI|embedding/i);
});
