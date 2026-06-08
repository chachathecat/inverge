import test from "node:test";
import assert from "node:assert/strict";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import { buildTodayPlanSourceUnion } from "../lib/review-os/today-plan-source-union.ts";

const currentDate = "2026-06-08T00:00:00.000Z";

function reviewQueueItem(overrides = {}) {
  const signal = buildLearningSignalFromExecutionResult({
    examMode: "first",
    taskType: "O/X",
    subjectId: "civil",
    subjectName: "민법",
    unitId: "review-due",
    unitName: "복습 예정 단원",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    daysUntilExam: 12,
    ...overrides,
  });
  const item = buildReviewQueueItemFromExecutionSignal(signal);
  assert.ok(item);
  return item;
}

const adaptiveInput = {
  userId: "u-adaptive",
  examMode: "first",
  currentDate,
  dailyAvailableMinutes: 60,
  daysUntilExam: 30,
  personalLearningStates: [
    { metadataOnly: true, userId: "u-adaptive", examMode: "first", subject: "민법", conceptNodeId: "adaptive-confident", status: "confident_wrong", nextReviewAt: currentDate },
    { metadataOnly: true, userId: "u-adaptive", examMode: "first", subject: "민법", conceptNodeId: "adaptive-wrong", status: "wrong", nextReviewAt: "2026-06-09T00:00:00.000Z" },
  ],
  curriculumNodes: [
    { examMode: "first", unitId: "adaptive-confident", unitName: "확신 오답 개념", subjectId: "civil", subjectName: "민법", importance: "high", riskLevel: "high", taskTypes: ["O/X"] },
    { examMode: "first", unitId: "adaptive-wrong", unitName: "일반 오답 개념", subjectId: "civil", subjectName: "민법", importance: "medium", riskLevel: "medium", taskTypes: ["O/X"] },
  ],
};

const forbiddenSerializedPattern = /rawOcrText|ocrText|problemText|questionText|userAnswer|answerText|rawAnswerText|sourceText|copyrightedText|official grading|official score|official model answer|공식\s*채점|공식\s*점수|모범\s*답안|pass\s*\/\s*fail|pass-fail|score prediction|합격\s*보장/i;

test("OCR pending confirmation outranks curriculum practice", () => {
  const plan = buildTodayPlanSourceUnion({
    adaptiveStudyPlanInput: {
      ...adaptiveInput,
      personalLearningStates: [],
      existingCaptureCandidates: [
        { id: "capture-1", examMode: "first", subjectId: "civil", subjectName: "민법", unitId: "capture-unit", unitName: "캡처 확인", taskType: "capture", ocrConfirmationPending: true, estimatedMinutes: 5 },
      ],
      curriculumNodes: [
        { examMode: "first", unitId: "curriculum-practice", unitName: "새 연습", subjectId: "civil", subjectName: "민법", importance: "high", riskLevel: "high", taskTypes: ["O/X"] },
      ],
    },
    context: { examMode: "first" },
  });

  assert.equal(plan[0].unitId, "capture-unit");
  assert.ok(plan[0].prioritySignals.includes("ocr_confirmation_pending"));
});

test("final Today Plan remains max 3 with adaptive study planner contribution", () => {
  const plan = buildTodayPlanSourceUnion({
    reviewQueueItems: [reviewQueueItem({ unitId: "review-due" })],
    adaptiveStudyPlanInput: adaptiveInput,
    context: { examMode: "first", now: currentDate },
  });

  assert.ok(plan.length <= 3);
  assert.ok(plan.some((task) => task.source === "adaptive_study_plan"));
  assert.ok(plan.every((task) => task.metadataOnly === true));
});

test("durable state unavailable falls back safely and existing capture/review queue candidates still work", () => {
  const plan = buildTodayPlanSourceUnion({
    reviewQueueItems: [reviewQueueItem({ unitId: "review-only" })],
    adaptiveStudyPlanInput: {
      userId: "u-adaptive",
      examMode: "first",
      currentDate,
      dailyAvailableMinutes: 60,
      daysUntilExam: 30,
      personalLearningStates: [],
      curriculumNodes: [],
      existingCaptureCandidates: [
        { id: "capture-fallback", examMode: "first", subjectId: "civil", subjectName: "민법", unitId: "capture-fallback", unitName: "캡처 후보", taskType: "capture", ocrConfirmationPending: true, estimatedMinutes: 5 },
      ],
    },
    context: { examMode: "first", now: currentDate },
  });

  assert.ok(plan.length > 0);
  assert.ok(plan.length <= 3);
  assert.ok(plan.some((task) => task.source === "review_queue"));
  assert.ok(plan.some((task) => task.unitId === "capture-fallback"));
});

test("integrated plan does not expose raw fields or official grading claims", () => {
  const plan = buildTodayPlanSourceUnion({ adaptiveStudyPlanInput: adaptiveInput, context: { examMode: "first" } });
  assert.doesNotMatch(JSON.stringify(plan), forbiddenSerializedPattern);
});
