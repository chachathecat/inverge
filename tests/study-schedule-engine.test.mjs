import test from "node:test";
import assert from "node:assert/strict";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import {
  buildDailyStudySchedule,
  buildScheduleWarnings,
  buildWeeklyStudySchedule,
  compressScheduleForDailyMinutes,
  selectStudyTrack,
} from "../lib/review-os/study-schedule-engine.ts";
import { loadStudyTracks } from "../lib/review-os/curriculum-reference.ts";

function queueItem(overrides = {}) {
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
    daysUntilExam: 45,
    ...overrides,
  });
  const item = buildReviewQueueItemFromExecutionSignal(signal);
  assert.ok(item, "expected review queue item");
  return item;
}

function textOf(value) {
  return JSON.stringify(value);
}

const forbiddenProductCopy = [
  "instructor",
  "/instructor",
  "결제",
  "payment",
  "archive",
  "아카이브",
  "native app",
  "네이티브 앱",
];
const forbiddenFearCopy = ["불합격 확정", "지금 안 하면 끝", "망했", "공포", "큰일", "fake urgency", "fear"];
const forbiddenRawFields = [
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

test("selects first exam tracks by days remaining", () => {
  assert.equal(selectStudyTrack({ examMode: "first", daysUntilExam: 30 }).selectedTrackId, "first_30");
  assert.equal(selectStudyTrack({ examMode: "first", daysUntilExam: 60 }).selectedTrackId, "first_60");
  assert.equal(selectStudyTrack({ examMode: "first", daysUntilExam: 90 }).selectedTrackId, "first_90");
  assert.equal(selectStudyTrack({ examMode: "first", daysUntilExam: 91 }).selectedTrackId, "first_120");
});

test("selects second exam tracks by days remaining", () => {
  assert.equal(selectStudyTrack({ examMode: "second", daysUntilExam: 90 }).selectedTrackId, "second_90");
  assert.equal(selectStudyTrack({ examMode: "second", daysUntilExam: 180 }).selectedTrackId, "second_180");
  assert.equal(selectStudyTrack({ examMode: "second", daysUntilExam: 181 }).selectedTrackId, "second_365");
});

test("30 min schedule stays small and keeps one primary task", () => {
  const schedule = buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 25,
    dailyAvailableMinutes: 30,
    reviewQueueItems: [queueItem({ unitId: "u1" }), queueItem({ unitId: "u2" })],
  });

  assert.equal(schedule.selectedTrackId, "first_30");
  assert.equal(schedule.dailyBlocks.length, 3);
  assert.equal(schedule.dailyBlocks.filter((block) => block.priority === "primary").length, 1);
  assert.ok(schedule.dailyBlocks.reduce((total, block) => total + block.suggestedMinutes, 0) <= 30);
  assert.ok(schedule.dailyBlocks.some((block) => block.kind === "due_review"));
  assert.ok(schedule.dailyBlocks.some((block) => block.kind === "decision"));
});

test("180 min schedule can include deeper blocks and mixed retrieval/rewrite", () => {
  const schedule = buildDailyStudySchedule({
    examMode: "second",
    daysUntilExam: 200,
    dailyAvailableMinutes: 180,
    weakSubjectName: "감정평가실무",
    reviewQueueItems: [queueItem({ examMode: "second", taskType: "rewrite", subjectName: "감정평가실무", unitName: "논점 구성" })],
  });

  assert.equal(schedule.selectedTrackId, "second_365");
  assert.ok(schedule.dailyBlocks.filter((block) => block.kind === "deep_work").length >= 2);
  assert.ok(schedule.dailyBlocks.some((block) => block.kind === "mixed_retrieval_rewrite"));
  assert.match(textOf(schedule), /감정평가실무/);
});

test("Today Plan preview is always capped at max 3", () => {
  const tasks = [
    queueItem({ unitId: "u1" }),
    queueItem({ unitId: "u2" }),
    queueItem({ unitId: "u3" }),
    queueItem({ unitId: "u4" }),
  ].map((item, index) => ({
    id: `task-${index}`,
    examMode: item.examMode,
    taskType: item.taskType,
    title: item.title,
    rationale: item.rationale,
    primaryAction: item.primaryAction,
    estimatedMinutes: 10,
    prioritySignals: item.prioritySignals,
    source: "review_queue",
    sourceReviewQueueItemId: item.id,
    dueBucket: item.dueBucket,
    isPrimaryTask: true,
  }));

  const schedule = buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 70,
    dailyAvailableMinutes: 90,
    todayPlanTasks: tasks,
  });

  assert.equal(schedule.todayPlanPreview.length, 3);
});

test("weak subject appears only when safe", () => {
  const safe = buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 55,
    dailyAvailableMinutes: 60,
    weakSubjectName: "회계학",
  });
  assert.match(textOf(safe), /회계학/);

  const unsafe = buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 55,
    dailyAvailableMinutes: 60,
    weakSubjectName: "questionText",
  });
  assert.equal(textOf(unsafe).includes("questionText"), false);
  assert.ok(unsafe.scheduleWarnings.some((warning) => warning.code === "weak_subject_omitted"));
});

test("schedule warning includes draft verification when needed", () => {
  const warnings = buildScheduleWarnings(loadStudyTracks());

  assert.ok(warnings.some((warning) => warning.code === "draft_reference_verification_needed"));
  assert.match(textOf(warnings), /Draft reference verification/);
});

test("schedule output does not emit raw text fields", () => {
  const schedule = buildWeeklyStudySchedule({
    examMode: "second",
    daysUntilExam: 120,
    dailyAvailableMinutes: 180,
    reviewQueueItems: [queueItem({ examMode: "second", taskType: "CASIO", subjectName: "감정평가실무" })],
  });
  const serialized = textOf(schedule);

  for (const forbidden of forbiddenRawFields) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("schedule output does not contain instructor/payment/archive/native-app copy", () => {
  const schedule = buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 100,
    dailyAvailableMinutes: 90,
  });
  const serialized = textOf(schedule);

  for (const forbidden of forbiddenProductCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("schedule output avoids fake urgency and fear copy", () => {
  const schedule = buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 5,
    dailyAvailableMinutes: 30,
  });
  const serialized = textOf(schedule);

  for (const forbidden of forbiddenFearCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("compression reduces oversized daily schedules to requested minutes", () => {
  const longSchedule = buildDailyStudySchedule({
    examMode: "second",
    daysUntilExam: 200,
    dailyAvailableMinutes: 180,
  });
  const compressed = compressScheduleForDailyMinutes(longSchedule, 30);

  assert.equal(compressed.dailyAvailableMinutes, 30);
  assert.ok(compressed.dailyBlocks.reduce((total, block) => total + block.suggestedMinutes, 0) <= 30);
  assert.equal(compressed.todayPlanPreview.length <= 3, true);
});
