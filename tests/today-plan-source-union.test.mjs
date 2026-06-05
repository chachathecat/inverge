import test from "node:test";
import assert from "node:assert/strict";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";
import { buildDailyStudySchedule } from "../lib/review-os/study-schedule-engine.ts";
import {
  buildTodayPlanSourceUnion,
  compressUnifiedTodayPlanToMaxThree,
} from "../lib/review-os/today-plan-source-union.ts";

const now = "2026-06-05T00:00:00.000Z";

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
    daysUntilExam: 12,
    ...overrides,
  });
  const item = buildReviewQueueItemFromExecutionSignal(signal);
  assert.ok(item, "expected review queue item");
  return item;
}

function conceptNode(unitId, overrides = {}) {
  return updatePersonalConceptNode(null, {
    userId: "opaque-user-1",
    examMode: "first",
    subjectId: "civil-law",
    unitId,
    taskType: "O/X",
    result: "wrong",
    confidence: "medium",
    updatedAt: now,
    ...overrides,
  });
}

function schedule(overrides = {}) {
  return buildDailyStudySchedule({
    examMode: "first",
    daysUntilExam: 60,
    dailyAvailableMinutes: 60,
    ...overrides,
  });
}

function textOf(value) {
  return JSON.stringify(value);
}

const forbiddenProductCopy = ["instructor", "/instructor", "결제", "payment", "archive", "아카이브", "native app", "네이티브 앱"];
const forbiddenRawFields = ["rawUserText", "rawOcrText", "rawAnswerText", "answerText", "problemText", "questionText", "copyrightedText", "originalText", "fullText", "sourceText"];

test("review queue, concept graph, and schedule inputs produce max 3 metadata-only primary tasks", () => {
  const plan = buildTodayPlanSourceUnion({
    reviewQueueItems: [queueItem({ unitId: "rq-1" })],
    conceptGraphNodes: [conceptNode("cg-1")],
    dailySchedule: schedule(),
    context: {
      now: "2026-06-07T00:00:00.000Z",
      examMode: "first",
      highRiskUnitIds: ["cg-1"],
      highImportanceUnitIds: ["cg-2"],
      recentMissCountByUnitId: { "cg-3": 1 },
    },
  });

  assert.ok(plan.length <= 3);
  assert.ok(plan.length > 0);
  assert.ok(plan.every((item) => item.isPrimaryTask === true));
  assert.ok(plan.every((item) => item.metadataOnly === true));
  assert.ok(new Set(plan.map((item) => item.source)).size >= 2);
});

test("due review outranks generic schedule focus", () => {
  const plan = buildTodayPlanSourceUnion({
    reviewQueueItems: [queueItem({ unitId: "due-review", daysUntilExam: 7 })],
    dailySchedule: schedule({ daysUntilExam: 120, dailyAvailableMinutes: 90 }),
    context: { now: "2026-06-07T00:00:00.000Z", examMode: "first" },
  });

  assert.equal(plan[0].source, "review_queue");
  assert.ok(plan[0].prioritySignals.some((signal) => signal.startsWith("review_queue_due_bucket:soon")));
});

test("wrong/confused concept outranks stable concept", () => {
  const stable = conceptNode("stable-unit", { result: "done", confidence: "high" });
  const confused = conceptNode("confused-unit", { result: "unknown", confidence: "low" });
  const wrong = conceptNode("wrong-unit", { result: "wrong", confidence: "medium" });

  const plan = buildTodayPlanSourceUnion({
    conceptGraphNodes: [stable, confused, wrong],
    context: { now: "2026-06-06T00:00:00.000Z", examMode: "first" },
  });

  assert.notEqual(plan[0].unitId, "stable-unit");
  assert.ok(plan.slice(0, 2).some((item) => item.prioritySignals.includes("wrong_concept")));
  assert.ok(plan.slice(0, 2).some((item) => item.prioritySignals.includes("confused_concept")));
});

test("high-risk and high-importance units boost ranking", () => {
  const ordinaryWrong = conceptNode("ordinary-wrong", { result: "wrong" });
  const riskRecovering = conceptNode("risk-recovering", { result: "missed_due", dueBucket: "missed", recentMissCount: 1 });
  const importantConfused = conceptNode("important-confused", { result: "unknown", confidence: "low" });

  const plan = buildTodayPlanSourceUnion({
    conceptGraphNodes: [ordinaryWrong, riskRecovering, importantConfused],
    context: {
      now: "2026-06-07T00:00:00.000Z",
      highRiskUnitIds: ["risk-recovering"],
      highImportanceUnitIds: ["important-confused"],
    },
  });

  const signals = plan.flatMap((item) => item.prioritySignals);
  assert.ok(signals.includes("high_risk_unit"));
  assert.ok(signals.includes("high_importance_unit"));
  assert.ok(plan.some((item) => item.unitId === "risk-recovering"));
});

test("duplicate unit/task combinations are collapsed and same units are avoided when alternatives exist", () => {
  const plan = compressUnifiedTodayPlanToMaxThree([
    {
      id: "a",
      source: "review_queue",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "same-unit",
      taskType: "O/X",
      title: "민법 총칙 O/X",
      rationale: "예정 복습을 먼저 확인합니다.",
      primaryAction: "O/X 5문항 다시 풀기",
      estimatedMinutes: 10,
      prioritySignals: ["due_review"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
    {
      id: "b",
      source: "personal_concept_graph",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "same-unit",
      taskType: "O/X",
      title: "중복 O/X",
      rationale: "같은 단위와 과제입니다.",
      primaryAction: "같은 과제 다시 풀기",
      estimatedMinutes: 10,
      prioritySignals: ["wrong_concept"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
    {
      id: "c",
      source: "personal_concept_graph",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "same-unit",
      taskType: "cloze",
      title: "같은 단위 빈칸",
      rationale: "같은 단위는 대안이 없을 때만 반복합니다.",
      primaryAction: "핵심어 3개 회상하기",
      estimatedMinutes: 10,
      prioritySignals: ["confused_concept"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
    {
      id: "d",
      source: "personal_concept_graph",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "other-unit",
      taskType: "O/X",
      title: "다른 단위 O/X",
      rationale: "다른 단위를 먼저 섞습니다.",
      primaryAction: "O/X 5문항 다시 풀기",
      estimatedMinutes: 10,
      prioritySignals: ["wrong_concept"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
  ]);

  assert.equal(plan.length, 3);
  assert.equal(plan.filter((item) => item.unitId === "same-unit" && item.taskType === "O/X").length, 1);
  assert.ok(plan.some((item) => item.unitId === "other-unit"));
});

test("raw text fields are rejected", () => {
  assert.throws(
    () => buildTodayPlanSourceUnion({ reviewQueueItems: [{ ...queueItem(), rawUserText: "원문" }] }),
    /Raw\/copyrighted text field is not accepted|Raw text field is not accepted/,
  );

  const serialized = textOf(buildTodayPlanSourceUnion({ reviewQueueItems: [queueItem()] }));
  for (const rawField of forbiddenRawFields) assert.equal(serialized.includes(rawField), false, rawField);
});

test("official grading, score prediction, and model-answer claims are rejected", () => {
  assert.throws(
    () => compressUnifiedTodayPlanToMaxThree([
      {
        id: "claim",
        source: "study_schedule",
        examMode: "first",
        taskType: "review",
        title: "공식 점수 예측",
        rationale: "official model answer 기준입니다.",
        primaryAction: "공식 채점 확인",
        estimatedMinutes: 10,
        prioritySignals: ["schedule_track_focus"],
        isPrimaryTask: true,
        metadataOnly: true,
      },
    ]),
    /Forbidden learner copy|Official grading/,
  );
});

test("shame and fear copy is rejected", () => {
  assert.throws(
    () => compressUnifiedTodayPlanToMaxThree([
      {
        id: "shame",
        source: "study_schedule",
        examMode: "first",
        taskType: "review",
        title: "지금 안 하면 끝",
        rationale: "게으름 때문에 망했어요.",
        primaryAction: "불합격 확정을 피하기",
        estimatedMinutes: 10,
        prioritySignals: ["schedule_track_focus"],
        isPrimaryTask: true,
        metadataOnly: true,
      },
    ]),
    /Forbidden learner copy/,
  );
});

test("only 감정평가사 1차/2차 accepted", () => {
  assert.throws(
    () => compressUnifiedTodayPlanToMaxThree([
      {
        id: "unsupported",
        source: "study_schedule",
        examMode: "cpa",
        taskType: "review",
        title: "지원하지 않는 시험",
        rationale: "범위를 넓히지 않습니다.",
        primaryAction: "감정평가사 범위만 유지하기",
        estimatedMinutes: 10,
        prioritySignals: ["schedule_track_focus"],
        isPrimaryTask: true,
        metadataOnly: true,
      },
    ]),
    /감정평가사 1차\/2차/,
  );
});

test("no payment, archive, native-app, or instructor copy appears", () => {
  const plan = buildTodayPlanSourceUnion({
    reviewQueueItems: [queueItem({ unitId: "safe-rq" })],
    conceptGraphNodes: [conceptNode("safe-cg")],
    dailySchedule: schedule(),
    context: { now: "2026-06-07T00:00:00.000Z" },
  });
  const serialized = textOf(plan);

  for (const forbidden of forbiddenProductCopy) assert.equal(serialized.includes(forbidden), false, forbidden);
});
