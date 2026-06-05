import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";
import { buildTodayPlanFromConceptGraphNodes } from "../lib/review-os/concept-graph-today-plan-adapter.ts";
import { compressUnifiedTodayPlanToMaxThree } from "../lib/review-os/today-plan-source-union.ts";
import { buildTodayPlanWithGatedDurableConceptGraph } from "../lib/review-os/today-plan-durable-graph-integration.ts";

const now = "2026-06-05T00:00:00.000Z";

const allGatesEnv = {
  PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
  PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
  PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
};

function node(unitId, overrides = {}) {
  return updatePersonalConceptNode(null, {
    userId: "learner-331",
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

function conceptActions(...unitIds) {
  return buildTodayPlanFromConceptGraphNodes(
    unitIds.map((unitId) => node(unitId)),
    { now, examMode: "first" },
  );
}

function baseAction(id, unitId, prioritySignals = ["due_review"]) {
  return {
    id,
    source: "review_queue",
    examMode: "first",
    subjectId: "civil-law",
    unitId,
    taskType: "O/X",
    title: `민법 ${unitId} O/X`,
    rationale: "예정된 복습을 먼저 확인합니다.",
    primaryAction: "O/X 5문항 다시 풀기",
    estimatedMinutes: 10,
    prioritySignals,
    isPrimaryTask: true,
    metadataOnly: true,
  };
}

function durableAction(id, unitId, prioritySignals = ["wrong_concept"]) {
  return {
    id,
    source: "personal_concept_graph",
    examMode: "first",
    subjectId: "civil-law",
    unitId,
    taskType: "O/X",
    title: `민법 ${unitId} 회상`,
    rationale: "최근 개념 메타데이터에서 틀림 신호가 있어 짧게 확인합니다.",
    primaryAction: "핵심 판단 근거 1개 말하기",
    estimatedMinutes: 10,
    prioritySignals,
    isPrimaryTask: true,
    metadataOnly: true,
  };
}

function helperReturning(actions) {
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

async function buildWith(overrides = {}) {
  const { helper, calls } = helperReturning([durableAction("durable-a", "durable-a", ["wrong_concept", "due_review"])]);
  const result = await buildTodayPlanWithGatedDurableConceptGraph({
    userId: "learner-331",
    sourceUnionInput: { conceptGraphActions: conceptActions("base-a"), context: { now, examMode: "first" } },
    context: { now, examMode: "first", env: {} },
    durableReadHelper: helper,
    ...overrides,
  });
  return { result, calls };
}

test("default disabled behavior does not call durable read helper", async () => {
  const { result, calls } = await buildWith();

  assert.equal(calls.count, 0);
  assert.equal(result.durableGraph.skipped, true);
  assert.equal(result.durableGraph.reason, "repository_not_supabase");
  assert.ok(result.actions.length > 0);
  assert.ok(result.actions.length <= 3);
});

test("repository=supabase alone is not enough", async () => {
  const { result, calls } = await buildWith({ context: { now, examMode: "first", env: { PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" } } });

  assert.equal(calls.count, 0);
  assert.equal(result.durableGraph.reason, "durable_reads_disabled");
});

test("durable reads flag alone is not enough", async () => {
  const { result, calls } = await buildWith({ context: { now, examMode: "first", env: { PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" } } });

  assert.equal(calls.count, 0);
  assert.equal(result.durableGraph.reason, "repository_not_supabase");
});

test("product rollout gate alone is not enough", async () => {
  const { result, calls } = await buildWith({ context: { now, examMode: "first", env: { PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1" } } });

  assert.equal(calls.count, 0);
  assert.equal(result.durableGraph.reason, "repository_not_supabase");
});

test("all gates enabled calls durable read helper for authenticated appraiser learner", async () => {
  const { result, calls } = await buildWith({ context: { now, examMode: "first", env: allGatesEnv } });

  assert.equal(calls.count, 1);
  assert.equal(calls.userId, "learner-331");
  assert.equal(calls.context.examMode, "first");
  assert.equal(result.durableGraph.skipped, false);
  assert.equal(result.durableGraph.repositoryMode, "supabase");
  assert.ok(result.actions.some((action) => action.source === "personal_concept_graph"));
});

test("durable read actions are merged into source union but max 3 remains", async () => {
  const existingActions = compressUnifiedTodayPlanToMaxThree([
    baseAction("base-a", "base-a", ["schedule_track_focus"]),
    baseAction("base-b", "base-b", ["schedule_track_focus"]),
    baseAction("base-c", "base-c", ["schedule_track_focus"]),
  ]);
  const { helper, calls } = helperReturning([
    durableAction("durable-priority", "durable-priority", ["due_review", "wrong_concept"]),
    durableAction("durable-b", "durable-b", ["wrong_concept"]),
  ]);

  const result = await buildTodayPlanWithGatedDurableConceptGraph({
    userId: "learner-331",
    sourceUnionInput: { conceptGraphActions: [], context: { now, examMode: "first" } },
    existingActions,
    context: { now, examMode: "first", env: allGatesEnv },
    durableReadHelper: helper,
  });

  assert.equal(calls.count, 1);
  assert.equal(result.actions.length, 3);
  assert.ok(result.actions.some((action) => action.id === "durable-priority"));
  assert.ok(result.actions.every((action) => action.metadataOnly === true));
  assert.ok(result.actions.every((action) => action.isPrimaryTask === true));
});

test("durable read failure falls back to existing Today Plan actions", async () => {
  const existingActions = compressUnifiedTodayPlanToMaxThree([baseAction("base-safe", "base-safe")]);
  const result = await buildTodayPlanWithGatedDurableConceptGraph({
    userId: "learner-331",
    sourceUnionInput: { conceptGraphActions: [], context: { now, examMode: "first" } },
    existingActions,
    context: { now, examMode: "first", env: allGatesEnv },
    durableReadHelper: async () => {
      throw new Error("simulated durable read outage");
    },
  });

  assert.deepEqual(result.actions, existingActions);
  assert.equal(result.durableGraph.ok, false);
  assert.equal(result.durableGraph.reason, "durable_read_failed");
});

test("no raw OCR/problem/answer/source/official/model/score/instructor fields appear", async () => {
  const unsafeFields = [
    "rawUserText",
    "rawOcrText",
    "rawAnswerText",
    "answerText",
    "problemText",
    "questionText",
    "copyrightedText",
    "originalText",
    "fullText",
    "sourceText",
    "officialAnswer",
    "modelAnswer",
    "scorePrediction",
    "instructorComment",
  ];

  for (const field of unsafeFields) {
    const result = await buildTodayPlanWithGatedDurableConceptGraph({
      userId: "learner-331",
      sourceUnionInput: { conceptGraphActions: [], context: { now, examMode: "first" } },
      existingActions: [baseAction("base-safe", "base-safe")],
      context: { now, examMode: "first", env: allGatesEnv },
      durableReadHelper: async () => ({
        ok: true,
        skipped: false,
        repositoryMode: "supabase",
        actions: [{ ...durableAction("unsafe", "unsafe"), [field]: "must not leak" }],
        metadataOnly: true,
      }),
    });

    assert.equal(result.durableGraph.reason, "durable_read_failed", field);
    assert.equal(textOf(result).includes(field), false, field);
  }
});

test("unsupported exam modes are rejected/skipped before durable reads", async () => {
  const { calls, helper } = helperReturning([durableAction("durable-a", "durable-a")]);
  const result = await buildTodayPlanWithGatedDurableConceptGraph({
    userId: "learner-331",
    sourceUnionInput: { conceptGraphActions: [], context: { now, examMode: "first" } },
    existingActions: [baseAction("base-safe", "base-safe")],
    context: { now, examMode: "cpa", env: allGatesEnv },
    durableReadHelper: helper,
  });

  assert.equal(calls.count, 0);
  assert.equal(result.durableGraph.reason, "unsupported_exam_mode");
  assert.equal(result.actions.length, 1);
});

test("missing authenticated learner userId skips durable reads", async () => {
  const { result, calls } = await buildWith({ userId: "", context: { now, examMode: "first", env: allGatesEnv } });

  assert.equal(calls.count, 0);
  assert.equal(result.durableGraph.reason, "missing_user_id");
});

test("no instructor/payment/archive/native-app routes are touched by gated integration", async () => {
  const integrationSource = await readFile(new URL("../lib/review-os/today-plan-durable-graph-integration.ts", import.meta.url), "utf8");
  const appRouteSource = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

  assert.equal(integrationSource.includes("/instructor"), false);
  assert.equal(integrationSource.includes("payment"), false);
  assert.equal(integrationSource.includes("archive"), false);
  assert.equal(integrationSource.includes("native app"), false);
  assert.equal(appRouteSource.includes("PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT"), false);
});
