import test from "node:test";
import assert from "node:assert/strict";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import {
  buildTodayPlanFromReviewQueue,
  compressTodayPlanToMaxThree,
  explainTodayPlanSelection,
  rankTodayPlanCandidates,
} from "../lib/review-os/today-plan-prioritization.ts";

function buildInput(overrides = {}) {
  return {
    examMode: "first",
    taskType: "O/X",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "civil-law-general",
    unitName: "민법 총칙",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    daysUntilExam: 80,
    ...overrides,
  };
}

function queueItem(overrides = {}) {
  const signal = buildLearningSignalFromExecutionResult(buildInput(overrides));
  const item = buildReviewQueueItemFromExecutionSignal(signal);
  assert.ok(item, "expected review queue item");
  return item;
}

function planFrom(items, context = {}) {
  return buildTodayPlanFromReviewQueue({ reviewQueueItems: items, context });
}

function textOf(value) {
  return JSON.stringify(value);
}

const forbiddenProductCopy = ["instructor", "/instructor", "결제", "payment", "archive", "아카이브", "native app", "네이티브 앱"];
const forbiddenNoShameCopy = ["실패자", "게으름", "망했", "불합격 확정", "지금 안 하면 끝", "순위 하락", "streak", "casino", "gacha"];
const forbiddenRawFields = [
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "answerText",
  "problemText",
  "questionText",
  "sourceText",
  "copyrightedText",
  "originalText",
];

test("max 3 primary tasks", () => {
  const items = [
    queueItem({ unitId: "u1", unitName: "물권" }),
    queueItem({ unitId: "u2", unitName: "채권" }),
    queueItem({ unitId: "u3", unitName: "등기" }),
    queueItem({ unitId: "u4", unitName: "담보" }),
  ];

  const plan = planFrom(items, { dailyAvailableMinutes: 60 });

  assert.equal(plan.length, 3);
  assert.ok(plan.every((task) => task.isPrimaryTask === true));
  assert.ok(plan.every((task) => task.source === "review_queue"));
});

test("due soon items rank before one_week", () => {
  const soon = queueItem({ unitId: "soon", daysUntilExam: 5, result: "wrong" });
  const later = queueItem({ unitId: "later", result: "unknown", daysUntilExam: 180 });
  assert.equal(soon.dueBucket, "soon");
  assert.ok(later.dueBucket === "three_days" || later.dueBucket === "one_week");
  later.dueBucket = "one_week";

  const plan = planFrom([later, soon]);

  assert.equal(plan[0].sourceReviewQueueItemId, soon.id);
});

test("fail risk raises priority", () => {
  const ordinarySoon = queueItem({ unitId: "ordinary", subjectName: "민법", daysUntilExam: 5 });
  const severeFailRisk = queueItem({
    unitId: "fail-risk",
    subjectName: "회계학",
    daysUntilExam: 180,
    isFailRiskSubject: true,
  });
  severeFailRisk.dueBucket = "one_week";

  const plan = planFrom([ordinarySoon, severeFailRisk], { weakSubjectName: "회계학", recentMissCount: 4 });

  assert.equal(plan[0].sourceReviewQueueItemId, severeFailRisk.id);
  assert.ok(plan[0].prioritySignals.includes("fail_risk_subject"));
});

test("exam proximity raises priority", () => {
  const items = [queueItem({ unitId: "near", daysUntilExam: 10 }), queueItem({ unitId: "far", daysUntilExam: 90 })];
  const plan = planFrom(items, { daysUntilExam: 10 });

  assert.ok(plan[0].prioritySignals.includes("exam_proximity"));
  assert.equal(plan[0].dueBucket, "soon");
});

test("recovery items use no-shame copy", () => {
  const item = queueItem({ result: "skipped", taskType: "cloze" });
  const plan = planFrom([item]);
  const explanation = explainTodayPlanSelection(plan, {});
  const serialized = textOf({ plan, explanation });

  assert.match(serialized, /복구 신호/);
  for (const forbidden of forbiddenNoShameCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("30 min mode caps task minutes", () => {
  const plan = planFrom([queueItem({ unitId: "u1" }), queueItem({ unitId: "u2" })], { dailyAvailableMinutes: 30 });

  assert.ok(plan.length >= 1);
  assert.ok(plan.every((task) => task.estimatedMinutes <= 10));
});

test("60/90/180 modes cap task minutes appropriately", () => {
  for (const [dailyAvailableMinutes, cap] of [[60, 15], [90, 20], [180, 30]]) {
    const plan = planFrom([queueItem({ taskType: "rewrite", examMode: "second", unitId: `u-${dailyAvailableMinutes}` })], { dailyAvailableMinutes });
    assert.ok(plan.every((task) => task.estimatedMinutes <= cap), `${dailyAvailableMinutes} cap`);
  }
});

test("duplicate similar review queue items are compressed", () => {
  const first = queueItem({ subjectId: "civil-law", unitId: "same", taskType: "O/X", daysUntilExam: 20 });
  const duplicate = { ...first, id: `${first.id}:duplicate`, dueBucket: "one_week", sourceReviewQueueItemId: undefined };
  const plan = planFrom([first, duplicate]);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].sourceReviewQueueItemId, first.id);
});

test("second rewrite item does not show O/X copy", () => {
  const item = queueItem({ examMode: "second", taskType: "rewrite", subjectName: "감정평가이론", unitName: "논점 구성" });
  const plan = planFrom([item], { examMode: "second" });
  const serialized = textOf(plan);

  assert.match(serialized, /답안 다시쓰기|다시 쓰기/);
  assert.equal(serialized.includes("O/X"), false);
});

test("second CASIO item stays CASIO/calculator copy", () => {
  const item = queueItem({ examMode: "second", taskType: "CASIO", subjectName: "감정평가실무", unitName: "환원율" });
  const plan = planFrom([item], { examMode: "second" });

  assert.match(textOf(plan), /CASIO|계산기/);
  assert.equal(plan[0].taskType, "CASIO");
});

test("first accounting item stays accounting template copy", () => {
  const item = queueItem({ examMode: "first", taskType: "accounting template", subjectName: "회계학", unitName: "원가계산" });
  const plan = planFrom([item], { examMode: "first" });

  assert.match(textOf(plan), /회계|계산틀/);
  assert.equal(plan[0].taskType, "accounting template");
});

test("done/completed items are not present if upstream produces none", () => {
  const doneSignal = buildLearningSignalFromExecutionResult(buildInput({ result: "done", confidence: "high" }));
  const doneItem = buildReviewQueueItemFromExecutionSignal(doneSignal);
  const plan = planFrom(doneItem ? [doneItem] : []);

  assert.equal(doneItem, null);
  assert.deepEqual(plan, []);
});

test("no raw text fields accepted/emitted", () => {
  assert.throws(
    () => buildTodayPlanFromReviewQueue({ reviewQueueItems: [queueItem()], context: { problemText: "원문" } }),
    /Raw text field is not accepted/,
  );
  assert.throws(
    () => buildTodayPlanFromReviewQueue({ reviewQueueItems: [{ ...queueItem(), userAnswerText: "답안" }] }),
    /Raw text field is not accepted/,
  );

  const serialized = textOf(planFrom([queueItem()]));
  for (const rawField of forbiddenRawFields) assert.equal(serialized.includes(rawField), false, rawField);
});

test("no instructor/payment/archive/native-app copy introduced", () => {
  const plan = planFrom([queueItem({ result: "unknown" })], { source: "morning_brief" });
  const explanation = explainTodayPlanSelection(plan, { source: "morning_brief" });
  const serialized = textOf({ plan, explanation });

  for (const forbidden of forbiddenProductCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});

test("rank and compress helpers keep ranked candidates and max three", () => {
  const plan = planFrom([
    queueItem({ unitId: "a", daysUntilExam: 60 }),
    queueItem({ unitId: "b", daysUntilExam: 4 }),
    queueItem({ unitId: "c", result: "skipped" }),
    queueItem({ unitId: "d", result: "unknown" }),
  ]);

  const ranked = rankTodayPlanCandidates([...plan], {});
  const compressed = compressTodayPlanToMaxThree(ranked, {});

  assert.ok(ranked.length <= 3);
  assert.ok(compressed.length <= 3);
  assert.ok(compressed.every((task) => task.sourceReviewQueueItemId));
});
