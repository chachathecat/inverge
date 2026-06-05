import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";
import { buildLearnerTodayPlanTasksWithGatedDurableConceptGraph } from "../lib/review-os/today-plan-learner-route-integration.ts";

const now = new Date("2026-06-05T00:00:00.000Z");
const allGatesEnv = {
  PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
  PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
  PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
};

function queueItem(id = "base", overrides = {}) {
  return {
    queueId: `queue-${id}`,
    itemId: `item-${id}`,
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    problemTitle: `민법 ${id} O/X`,
    topicTag: "민법 총칙",
    mistakeType: "개념 혼동",
    reviewReason: "scheduled review",
    priorityScore: 100,
    dueAt: "2026-06-04T00:00:00.000Z",
    recurrenceCount: 2,
    confidence: "낮음",
    timeSpentSeconds: null,
    createdFromCapture: false,
    itemCreatedAt: "2026-06-03T00:00:00.000Z",
    ...overrides,
  };
}

function durableAction(id = "durable-route") {
  return {
    id,
    source: "personal_concept_graph",
    examMode: "first",
    subjectId: "civil-law",
    unitId: id,
    taskType: "concept_review",
    title: "민법 개념 회상",
    rationale: "최근 개념 메타데이터에서 틀림 신호가 있어 짧게 확인합니다.",
    primaryAction: "핵심 판단 근거 1개 말하기",
    estimatedMinutes: 10,
    prioritySignals: ["wrong_concept", "due_review"],
    isPrimaryTask: true,
    metadataOnly: true,
    displayReason: "개념 그래프 메타데이터 기반 확인입니다.",
    displaySourceLabel: "개념 그래프 기반",
    displayPrimaryCta: "개념 1개 회상",
  };
}

function helperReturning(actions = [durableAction()]) {
  const calls = { count: 0, userId: null, context: null };
  const helper = async (userId, context) => {
    calls.count += 1;
    calls.userId = userId;
    calls.context = context;
    return { ok: true, skipped: false, repositoryMode: "supabase", actions, metadataOnly: true };
  };
  return { calls, helper };
}

function textOf(value) {
  return JSON.stringify(value);
}

test("route helper returns exactly existing Today Plan tasks when all flags are off", async () => {
  const queue = [queueItem()];
  const expected = buildTodayPlanTasks({ mode: "first", queue, items: [], learningSignals: [], now });
  const { calls, helper } = helperReturning();
  const actual = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: "learner-332",
    mode: "first",
    queue,
    items: [],
    learningSignals: [],
    now,
    env: {},
    durableReadHelper: helper,
  });

  assert.equal(calls.count, 0);
  assert.deepEqual(actual, expected);
  assert.equal(actual.length <= 3, true);
});

test("route helper does not call durableReadHelper unless every gate is present", async () => {
  const cases = [
    { label: "repository memory", env: { PERSONAL_CONCEPT_GRAPH_REPOSITORY: "memory", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1", PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1" }, userId: "learner-332", mode: "first" },
    { label: "repository unset", env: { PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1", PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1" }, userId: "learner-332", mode: "first" },
    { label: "durable reads missing", env: { PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase", PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1" }, userId: "learner-332", mode: "first" },
    { label: "rollout missing", env: { PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase", PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" }, userId: "learner-332", mode: "first" },
    { label: "userId missing", env: allGatesEnv, userId: "", mode: "first" },
    { label: "mode unsupported", env: allGatesEnv, userId: "learner-332", mode: "cpa" },
  ];

  for (const entry of cases) {
    const { calls, helper } = helperReturning();
    const expected = buildTodayPlanTasks({ mode: entry.mode, queue: [queueItem(entry.label)], items: [], learningSignals: [], now });
    const actual = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
      userId: entry.userId,
      mode: entry.mode,
      queue: [queueItem(entry.label)],
      items: [],
      learningSignals: [],
      now,
      env: entry.env,
      durableReadHelper: helper,
    });

    assert.equal(calls.count, 0, entry.label);
    assert.deepEqual(actual, expected, entry.label);
  }
});

test("route helper calls durableReadHelper when all gates are enabled and maps metadata-only action into TodayPlanTask shape", async () => {
  const { calls, helper } = helperReturning([durableAction("durable-metadata-action")]);
  const tasks = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: "learner-332",
    mode: "first",
    queue: [],
    items: [],
    learningSignals: [],
    now,
    env: allGatesEnv,
    durableReadHelper: helper,
  });
  const durableTask = tasks.find((task) => task.itemId === "durable-metadata-action");

  assert.equal(calls.count, 1);
  assert.equal(calls.userId, "learner-332");
  assert.equal(calls.context.examMode, "first");
  assert.ok(durableTask);
  assert.equal(durableTask.exam_mode, "first");
  assert.equal(durableTask.task_type, "concept_review");
  assert.equal(durableTask.source_label, "약점 개념");
  assert.equal(durableTask.created_from_capture, false);
  assert.equal(tasks.length <= 3, true);
});

test("route helper falls back to existing tasks when durableReadHelper throws", async () => {
  const queue = [queueItem("fallback")];
  const expected = buildTodayPlanTasks({ mode: "first", queue, items: [], learningSignals: [], now });
  const actual = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: "learner-332",
    mode: "first",
    queue,
    items: [],
    learningSignals: [],
    now,
    env: allGatesEnv,
    durableReadHelper: async () => {
      throw new Error("simulated durable read outage");
    },
  });

  assert.deepEqual(actual, expected);
  assert.equal(actual.length <= 3, true);
});

test("route helper never includes raw forbidden fields in serialized task output", async () => {
  const forbiddenFields = ["rawOcrText", "problemText", "answerText", "sourceText", "copyrightedText", "officialAnswer", "modelAnswer", "scorePrediction", "instructorComment"];
  const tasks = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: "learner-332",
    mode: "first",
    queue: [queueItem("safe")],
    items: [],
    learningSignals: [],
    now,
    env: allGatesEnv,
    durableReadHelper: async () => ({
      ok: true,
      skipped: false,
      repositoryMode: "supabase",
      actions: [{ ...durableAction("unsafe"), rawOcrText: "must not leak" }],
      metadataOnly: true,
    }),
  });
  const serialized = textOf(tasks);

  for (const field of forbiddenFields) assert.equal(serialized.includes(field), false, field);
  assert.equal(serialized.includes("must not leak"), false);
  assert.equal(tasks.length <= 3, true);
});

test("durable route smoke never changes instructor/payment/archive/native app surfaces", () => {
  const source = `${readFileSync("lib/review-os/today-plan-learner-route-integration.ts", "utf8")}\n${readFileSync("app/app/page.tsx", "utf8")}`;
  for (const forbidden of [/\/instructor/i, /\/studio/i, /payment/i, /checkout/i, /archive/i, /native app/i, /mobile app/i]) {
    assert.equal(forbidden.test(source), false, `forbidden surface ${forbidden} should not appear`);
  }
});
