import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";
import { buildDailyStudySchedule } from "../lib/review-os/study-schedule-engine.ts";
import {
  buildTodayPlanSourceUnion,
  compressUnifiedTodayPlanToMaxThree,
} from "../lib/review-os/today-plan-source-union.ts";

const now = "2026-06-05T00:00:00.000Z";

function read(file) {
  return readFileSync(file, "utf8");
}

function reviewQueueItem(overrides = {}) {
  const signal = buildLearningSignalFromExecutionResult({
    examMode: "first",
    taskType: "O/X",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "civil-law-general",
    unitName: "민법 총칙",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    daysUntilExam: 10,
    occurredAt: now,
    ...overrides,
  });
  const item = buildReviewQueueItemFromExecutionSignal(signal);
  assert.ok(item, "expected Review Queue item from execution signal");
  return item;
}

function conceptNode(unitId, overrides = {}) {
  return updatePersonalConceptNode(null, {
    userId: "opaque-beta-user",
    examMode: "first",
    subjectId: "civil-law",
    unitId,
    taskType: "O/X",
    result: "wrong",
    confidence: "low",
    updatedAt: now,
    ...overrides,
  });
}

function dailySchedule(overrides = {}) {
  return buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 80,
    dailyAvailableMinutes: 60,
    ...overrides,
  });
}

function serialized(value) {
  return JSON.stringify(value);
}

const rawTextFields = ["rawUserText", "rawOcrText", "rawAnswerText", "answerText", "problemText", "questionText", "copyrightedText", "originalText", "fullText", "sourceText"];

const baseAction = {
  id: "base",
  source: "study_schedule",
  examMode: "first",
  subjectId: "civil-law",
  unitId: "civil-law-general",
  taskType: "review",
  title: "민법 총칙 확인",
  rationale: "메타데이터만 사용합니다.",
  primaryAction: "정답 보기 전 3개를 먼저 떠올립니다.",
  estimatedMinutes: 10,
  prioritySignals: ["schedule_track_focus"],
  isPrimaryTask: true,
  metadataOnly: true,
};

test("existing Review Queue Today Plan still works and outranks generic schedule fallback", () => {
  const plan = buildTodayPlanSourceUnion({
    reviewQueueItems: [reviewQueueItem({ unitId: "due-rq", daysUntilExam: 7 })],
    dailySchedule: dailySchedule({ daysUntilExam: 120 }),
    context: { now: "2026-06-07T00:00:00.000Z", examMode: "first" },
  });

  assert.ok(plan.length > 0);
  assert.equal(plan[0].source, "review_queue");
  assert.ok(plan[0].prioritySignals.some((signal) => signal.startsWith("review_queue_due_bucket:soon")));
  assert.ok(plan.every((task) => task.metadataOnly === true));
});

test("Personal Concept Graph recommendations convert into unified Today Plan actions and outrank generic schedule fallback", () => {
  const plan = buildTodayPlanSourceUnion({
    conceptGraphNodes: [
      conceptNode("stable-unit", { result: "done", confidence: "high" }),
      conceptNode("wrong-unit", { result: "wrong", confidence: "medium" }),
      conceptNode("confused-unit", { result: "unknown", confidence: "low" }),
    ],
    dailySchedule: dailySchedule({ daysUntilExam: 120 }),
    context: { now: "2026-06-06T00:00:00.000Z", examMode: "first" },
  });

  assert.equal(plan[0].source, "personal_concept_graph");
  assert.ok(plan.slice(0, 2).some((task) => task.prioritySignals.includes("wrong_concept")));
  assert.ok(plan.slice(0, 2).some((task) => task.prioritySignals.includes("confused_concept")));
  assert.ok(plan.every((task) => task.isPrimaryTask === true && task.metadataOnly === true));
});

test("Study Schedule metadata is included only as a weaker fallback source", () => {
  const scheduleOnly = buildTodayPlanSourceUnion({
    dailySchedule: dailySchedule({ daysUntilExam: 100, dailyAvailableMinutes: 90 }),
    context: { now, examMode: "first" },
  });
  assert.ok(scheduleOnly.length > 0);
  assert.ok(scheduleOnly.every((task) => task.source === "study_schedule"));
  assert.ok(scheduleOnly.every((task) => task.prioritySignals.includes("schedule_track_focus")));

  const mixed = buildTodayPlanSourceUnion({
    reviewQueueItems: [reviewQueueItem({ unitId: "rq-priority" })],
    conceptGraphNodes: [conceptNode("wrong-priority", { result: "wrong" })],
    dailySchedule: dailySchedule({ daysUntilExam: 100, dailyAvailableMinutes: 90 }),
    context: { now, examMode: "first" },
  });
  assert.notEqual(mixed[0].source, "study_schedule");
});

test("unified Today Plan output stays max 3 and duplicate unit/task combinations collapse", () => {
  const plan = compressUnifiedTodayPlanToMaxThree([
    { ...baseAction, id: "a", source: "review_queue", prioritySignals: ["due_review"], taskType: "O/X" },
    { ...baseAction, id: "b", source: "personal_concept_graph", prioritySignals: ["wrong_concept"], taskType: "O/X" },
    { ...baseAction, id: "c", unitId: "other-1", source: "personal_concept_graph", prioritySignals: ["confused_concept"], taskType: "cloze" },
    { ...baseAction, id: "d", unitId: "other-2", source: "study_schedule", prioritySignals: ["schedule_track_focus"], taskType: "review" },
    { ...baseAction, id: "e", unitId: "other-3", source: "study_schedule", prioritySignals: ["schedule_track_focus"], taskType: "execution" },
  ]);

  assert.equal(plan.length, 3);
  assert.equal(plan.filter((task) => task.unitId === "civil-law-general" && task.taskType === "O/X").length, 1);
});

test("source union rejects raw OCR/problem/answer/user text fields", () => {
  for (const field of rawTextFields) {
    assert.throws(
      () => buildTodayPlanSourceUnion({ reviewQueueItems: [{ ...reviewQueueItem(), [field]: "원문 저장 금지" }] }),
      /Raw\/copyrighted text field is not accepted|Raw text field is not accepted/,
      `${field} should be rejected`,
    );
  }

  const plan = buildTodayPlanSourceUnion({ reviewQueueItems: [reviewQueueItem()] });
  for (const field of rawTextFields) assert.equal(serialized(plan).includes(field), false, field);
});

test("source union rejects official grading, score prediction, and official model-answer claims", () => {
  for (const claim of ["공식 채점", "공식 점수 예측", "공식 모범 답안", "official grading", "official score prediction", "official model answer"]) {
    assert.throws(
      () => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, id: `claim-${claim}`, title: claim }]),
      /Forbidden learner copy|Official grading|Forbidden Today Plan copy/,
      claim,
    );
  }
});

test("source union rejects shame, fear, and casino-style copy", () => {
  for (const copy of ["실패자", "게으름", "망했", "불합격 확정", "지금 안 하면 끝", "순위 하락", "streak", "gacha", "random reward", "랜덤 보상"]) {
    assert.throws(
      () => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, id: `ethics-${copy}`, rationale: copy }]),
      /Forbidden learner copy|Forbidden Today Plan copy/,
      copy,
    );
  }
});

test("source union rejects payment/archive/native-app/instructor copy", () => {
  for (const copy of ["결제", "payment", "archive", "아카이브", "native app", "네이티브 앱", "instructor", "/instructor", "학원용", "강사"]) {
    assert.throws(
      () => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, id: `surface-${copy}`, primaryAction: copy }]),
      /Forbidden learner copy|Forbidden Today Plan copy/,
      copy,
    );
  }
});

test("only 감정평가사 1차 and 감정평가사 2차 exam modes and copy are accepted", () => {
  assert.doesNotThrow(() => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, examMode: "first" }]));
  assert.doesNotThrow(() => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, examMode: "second" }]));

  for (const examMode of ["actuary", "cpa", "tax", "toefl", "sat", "universal"]) {
    assert.throws(
      () => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, id: `unsupported-mode-${examMode.length}`, examMode }]),
      /감정평가사 1차\/2차|Forbidden learner copy/,
      examMode,
    );
  }

  for (const copy of ["보험계리사", "계리사", "CPA", "세무사", "TOEFL", "SAT", "universal exam", "multi-exam"]) {
    assert.throws(
      () => compressUnifiedTodayPlanToMaxThree([{ ...baseAction, id: `copy-${copy}`, title: copy }]),
      /Forbidden learner copy/,
      copy,
    );
  }
});

test("staging learner route source smoke checks remain helper-level when e2e is unavailable", () => {
  const routeFiles = [
    "app/app/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/review/page.tsx",
    "app/app/calculator/page.tsx",
    "app/answer-review/page.tsx",
    "app/answer-review/answer-review-client.tsx",
    "lib/review-os/today-plan-engine.ts",
  ];
  routeFiles.forEach((file) => assert.equal(existsSync(file), true, `${file} should exist`));

  const appPage = read("app/app/page.tsx");
  assert.equal(/href=[{"'`][^\n]*(?:\/instructor|\/studio|\/admin)/i.test(appPage), false, "/app must not link to instructor/admin surfaces");
  assert.equal(appPage.includes("buildTodayPlanTasks"), true);
  assert.equal(appPage.includes("todayPlanTasks.map"), true);

  const capturePage = read("app/app/capture/page.tsx");
  assert.equal(capturePage.includes("오늘 한 것 올리기"), true);
  assert.equal(/점수|채점|합격\s*판정|불합격\s*판정/.test(capturePage), false, "/app/capture should not become score-first");

  const reviewPage = read("app/app/review/page.tsx");
  assert.equal(reviewPage.includes("재시도") || reviewPage.includes("다시"), true, "/app/review should stay review/retry-oriented");

  const calculatorRoute = read("app/app/calculator/page.tsx");
  const calculatorPage = read("components/review-os/calculator-workflow-page.tsx");
  assert.equal(calculatorRoute.includes('requestedContext === "practice" || requestedContext === "accounting"'), true);
  assert.equal(calculatorRoute.includes("focus={params?.focus}"), true);
  assert.equal(calculatorPage.includes('focus === "casio"'), true);

  const answerReviewPage = read("app/answer-review/page.tsx") + read("app/answer-review/answer-review-client.tsx");
  assert.equal(/\/instructor|학원용|강사\s*검수/.test(answerReviewPage), false, "/answer-review should remain separated from instructor grading");
  assert.equal(answerReviewPage.includes("/api/answer-review/structure"), true);
  assert.equal(answerReviewPage.includes("/api/answer-review/grade-second"), false);

  const todayPlanEngine = read("lib/review-os/today-plan-engine.ts");
  assert.equal(todayPlanEngine.includes(".slice(0, 3)"), true, "Today Plan task output should remain capped at 3");
});
