import test from "node:test";
import assert from "node:assert/strict";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import { buildMorningBrief, buildCaptureReminderLine, buildDueReviewLine, buildRecoveryNudge } from "../lib/review-os/morning-brief.ts";

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

function todayTaskFromItem(item, index = 0) {
  return {
    id: `task-${index}`,
    examMode: item.examMode,
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    unitId: item.unitId,
    unitName: item.unitName,
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
  };
}

function textOf(value) {
  return JSON.stringify(value);
}

const blameCopy = ["탓", "책임", "게으름", "밀렸", "빼먹", "실패자", "부끄럽"];
const shameCopy = ["게으름", "부끄럽", "망했", "실패자", "정신 차려", "핑계"];
const notificationCopy = ["notification", "push", "email", "e-mail", "SMS", "sms", "Kakao", "kakao", "카카오", "알림 발송", "통지 발송"];
const casinoStreakFearCopy = ["casino", "gacha", "random reward", "랜덤 보상", "streak", "순위", "랭킹", "불합격 확정", "지금 안 하면 끝", "공포", "fear", "fake urgency"];
const rawFields = [
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "rawAnswerText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "originalText",
];
const outOfScopeCopy = ["instructor", "/instructor", "강사", "결제", "payment", "archive", "아카이브", "native app", "네이티브 앱"];

test("morning brief caps preview tasks at max 3", () => {
  const todayPlanTasks = [
    queueItem({ unitId: "u1", unitName: "민법 총칙 1" }),
    queueItem({ unitId: "u2", unitName: "민법 총칙 2" }),
    queueItem({ unitId: "u3", unitName: "민법 총칙 3" }),
    queueItem({ unitId: "u4", unitName: "민법 총칙 4" }),
  ].map(todayTaskFromItem);

  const brief = buildMorningBrief({
    examMode: "first",
    todayPlanTasks,
    reviewQueueItems: [],
    dailyAvailableMinutes: 90,
  });

  assert.equal(brief.todayTasks.length, 3);
  assert.equal(brief.todayTasks.every((task) => task.previewOnly), true);
});

test("due review line mentions due review without blame", () => {
  const dueReviewLine = buildDueReviewLine({
    examMode: "first",
    reviewQueueItems: [queueItem({ dueHint: "soon" }), queueItem({ unitId: "u2", dueHint: "tomorrow" })],
  });

  assert.match(dueReviewLine, /복습/);
  for (const forbidden of blameCopy) assert.equal(dueReviewLine.includes(forbidden), false, forbidden);
});

test("recovery nudge uses calm recovery copy without shame", () => {
  const recoveryLine = buildRecoveryNudge({ recentMissCount: 2 });

  assert.equal(recoveryLine, "오늘은 범위를 줄여 복구합니다. 어제 못 한 항목은 1개만 복구해도 충분합니다.");
  for (const forbidden of shameCopy) assert.equal(recoveryLine.includes(forbidden), false, forbidden);
});

test("30-minute fallback exists in every generated brief", () => {
  const brief = buildMorningBrief({
    examMode: "second",
    reviewQueueItems: [queueItem({ examMode: "second", taskType: "rewrite", subjectName: "감정평가실무", unitName: "논점 구성" })],
    dailyAvailableMinutes: 180,
  });

  assert.match(brief.fallbackAction, /30분 fallback/);
  assert.match(brief.fallbackAction, /복습 1개/);
});

test("capture reminder appears only when requested by a capture signal", () => {
  const cleanInput = {
    examMode: "first",
    reviewQueueItems: [queueItem()],
    hasStaleCapture: false,
  };
  assert.equal(buildCaptureReminderLine(cleanInput), undefined);

  const staleLine = buildCaptureReminderLine({ ...cleanInput, hasStaleCapture: true });
  assert.match(staleLine, /풀이 기록/);

  const metadataGapLine = buildCaptureReminderLine({
    examMode: "first",
    hasStaleCapture: false,
    reviewQueueItems: [queueItem({ subjectId: undefined, subjectName: undefined, unitId: undefined, unitName: undefined })],
  });
  assert.match(metadataGapLine, /과목이나 과제 표시/);
});

test("morning brief output has no notification sending behavior or channel copy", () => {
  const brief = buildMorningBrief({
    examMode: "first",
    reviewQueueItems: [queueItem()],
    dailyAvailableMinutes: 60,
  });
  const serialized = textOf(brief);

  assert.equal(/send|sent|deliver|dispatch/i.test(serialized), false, serialized);
  for (const forbidden of notificationCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("morning brief avoids casino, streak, ranking, and fear copy", () => {
  const brief = buildMorningBrief({
    examMode: "mixed",
    reviewQueueItems: [queueItem(), queueItem({ examMode: "second", taskType: "rewrite", subjectName: "감정평가이론", unitName: "논점 구성" })],
    dailyAvailableMinutes: 90,
    daysUntilExam: 7,
    recentMissCount: 1,
  });
  const serialized = textOf(brief);

  for (const forbidden of casinoStreakFearCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("morning brief output does not expose raw text fields", () => {
  const brief = buildMorningBrief({
    examMode: "first",
    reviewQueueItems: [queueItem()],
    dailyAvailableMinutes: 30,
  });
  const serialized = textOf(brief);

  for (const forbidden of rawFields) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("morning brief output does not include instructor, payment, archive, or native-app copy", () => {
  const brief = buildMorningBrief({
    examMode: "first",
    reviewQueueItems: [queueItem()],
    dailyAvailableMinutes: 60,
    weakSubjectName: "민법",
  });
  const serialized = textOf(brief);

  for (const forbidden of outOfScopeCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});
