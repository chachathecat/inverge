import assert from "node:assert/strict";
import test from "node:test";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import { buildTodayPlanFromReviewQueue } from "../lib/review-os/today-plan-prioritization.ts";
import {
  buildExplanationLadderForReviewQueueItem,
  buildExplanationLadderForSignal,
  buildExplanationLadderForTodayPlanTask,
  selectTenSecondCheck,
  selectTrapFocus,
} from "../lib/review-os/explanation-ladder-engine.ts";

const labels = ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"];
const rawFields = [
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "sourceText",
  "copyrightedText",
  "originalText",
];
const forbiddenCopy = [
  "공식 채점",
  "공식 점수",
  "공식 예측",
  "모범답안",
  "정답 전문",
  "instructor",
  "/instructor",
  "학원용",
  "강사",
  "결제",
  "payment",
  "archive",
  "아카이브",
  "native app",
  "네이티브 앱",
];
const copyrightedMarkers = ["문제 원문", "답안 원문", "저작권 있는 문제", "copyrighted problem"];

function signal(overrides = {}) {
  return buildLearningSignalFromExecutionResult({
    examMode: "first",
    taskType: "O/X",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "civil-general",
    unitName: "민법 총칙",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    ...overrides,
  });
}

function reviewItem(overrides = {}) {
  const item = buildReviewQueueItemFromExecutionSignal(signal(overrides));
  assert.ok(item, "expected review queue item");
  return item;
}

function todayTask(overrides = {}, context = {}) {
  const [task] = buildTodayPlanFromReviewQueue({ reviewQueueItems: [reviewItem(overrides)], context });
  assert.ok(task, "expected Today Plan task");
  return task;
}

function serialized(value) {
  return JSON.stringify(value);
}

function entry(output, label) {
  const found = output.entries.find((item) => item.label === label);
  assert.ok(found, `missing ${label}`);
  return found.text;
}

function assertFourLabelOutput(output) {
  assert.deepEqual(output.labels, labels);
  assert.deepEqual(output.entries.map((item) => item.label), labels);
  assert.equal(typeof output.nextAction, "string");
  assert.ok(output.nextAction.length > 0);
  assert.ok(Array.isArray(output.warnings));
}

function assertShort(output) {
  for (const item of output.entries) {
    assert.ok(item.text.length <= 96, `${item.label} too long: ${item.text.length}`);
  }
}

function assertSafe(output) {
  const text = serialized(output);
  for (const field of rawFields) assert.equal(text.includes(field), false, `raw field emitted: ${field}`);
  for (const marker of copyrightedMarkers) assert.equal(text.includes(marker), false, `copyright marker emitted: ${marker}`);
  for (const forbidden of forbiddenCopy) assert.equal(text.includes(forbidden), false, `forbidden copy emitted: ${forbidden}`);
}

test("signal output includes all four explanation ladder labels", () => {
  const output = buildExplanationLadderForSignal(signal());

  assertFourLabelOutput(output);
  assertShort(output);
  assertSafe(output);
});

test("O/X signal creates 10초 확인 retrieval check", () => {
  const output = buildExplanationLadderForSignal(signal({ taskType: "O/X" }));

  assert.match(entry(output, "10초 확인"), /O\/X|판단/);
  assert.match(selectTenSecondCheck("O/X", "first"), /O\/X|판단/);
});

test("cloze signal creates 핵심어 recall check", () => {
  const output = buildExplanationLadderForSignal(signal({ taskType: "cloze", result: "unknown" }));

  assert.match(entry(output, "10초 확인"), /핵심어|회상/);
  assert.match(output.nextAction, /핵심어|빈칸|회상/);
});

test("accounting template creates formula/check copy without full solution text", () => {
  const output = buildExplanationLadderForReviewQueueItem(reviewItem({
    examMode: "first",
    taskType: "accounting template",
    subjectName: "회계학",
    unitName: "재고자산",
  }));

  assert.match(serialized(output), /입력값|공식|검산|계산틀/);
  assert.doesNotMatch(serialized(output), /정답 전문|문제 원문|풀이 전문/);
  assertSafe(output);
});

test("second rewrite creates issue/structure/conclusion rewrite copy", () => {
  const output = buildExplanationLadderForReviewQueueItem(reviewItem({
    examMode: "second",
    taskType: "rewrite",
    subjectName: "감정평가 및 보상법규",
    unitName: "손실보상 논점",
    result: "needs_rewrite",
  }));

  assert.match(serialized(output), /쟁점|구조|결론|다시 씁니다|다시쓰기/);
  assert.equal(serialized(output).includes("O/X"), false);
});

test("CASIO creates calculator input/unit/check copy", () => {
  const output = buildExplanationLadderForTodayPlanTask(todayTask({
    examMode: "second",
    taskType: "CASIO",
    subjectName: "감정평가실무",
    unitName: "수익환원법",
  }, { examMode: "second" }));

  assert.match(serialized(output), /CASIO|계산기|입력 순서/);
  assert.match(serialized(output), /단위|검산/);
  assert.match(selectTrapFocus("CASIO", "second"), /입력 순서|단위|반올림/);
});

test("issue spotting creates issue candidate and outline copy", () => {
  const output = buildExplanationLadderForTodayPlanTask(todayTask({
    examMode: "second",
    taskType: "issue spotting",
    subjectName: "감정평가이론",
    unitName: "논점 구성",
    result: "unknown",
  }, { examMode: "second" }));

  assert.match(serialized(output), /쟁점 후보|목차|하위 쟁점/);
});

test("raw user/OCR/problem text fields are rejected and not emitted", () => {
  assert.throws(
    () => buildExplanationLadderForSignal({ ...signal(), problemText: "문제 원문", userAnswerText: "답안 원문" }),
    /Raw text field is not accepted/,
  );

  const output = buildExplanationLadderForTodayPlanTask(todayTask());
  assertSafe(output);
});

test("no official grading/model answer or product-scope copy is introduced", () => {
  const outputs = [
    buildExplanationLadderForSignal(signal({ result: "unknown" })),
    buildExplanationLadderForReviewQueueItem(reviewItem({ taskType: "cloze" })),
    buildExplanationLadderForTodayPlanTask(todayTask({ taskType: "accounting template", subjectName: "회계학" })),
  ];

  for (const output of outputs) assertSafe(output);
});

test("each entry remains short enough", () => {
  for (const output of [
    buildExplanationLadderForSignal(signal()),
    buildExplanationLadderForReviewQueueItem(reviewItem({ taskType: "accounting template", subjectName: "회계학" })),
    buildExplanationLadderForTodayPlanTask(todayTask({ examMode: "second", taskType: "rewrite" }, { examMode: "second" })),
  ]) {
    assertShort(output);
  }
});

test("warnings include draft verification metadata when reference requires verification", () => {
  const output = buildExplanationLadderForSignal(signal());
  const warning = output.warnings.find((item) => item.code === "reference_needs_verification");

  assert.ok(warning, "expected draft verification warning");
  assert.equal(warning.sourceStatus, "draft_metadata_from_internal_roadmap");
  assert.match(warning.message, /검수|점검용/);
  assert.doesNotMatch(warning.message, /공포|큰일|불합격/);
});
