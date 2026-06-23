import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildCalculatorRoutineCompletionSignal,
  createCalculatorRoutineDraft,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";
import {
  buildCalculatorRoutineBridge,
} from "../lib/review-os/calculator-routine-learning-signal.ts";
import {
  buildCalculatorRoutineConceptGraphSignal,
  buildCalculatorRoutineConceptStateProjection,
  maybeUpdateCalculatorRoutineConceptState,
} from "../lib/review-os/calculator-routine-concept-state.ts";
import {
  buildPersonalConceptNodeSupabaseWritePayload,
} from "../lib/review-os/personal-concept-graph-supabase-repository.ts";
import {
  updatePersonalConceptNode,
} from "../lib/review-os/personal-concept-graph.ts";
import { buildLearnerTodayPlanTasksWithGatedDurableConceptGraph } from "../lib/review-os/today-plan-learner-route-integration.ts";
import { compressUnifiedTodayPlanToMaxThree } from "../lib/review-os/today-plan-source-union.ts";

const USER_ID = "00000000-0000-4000-8000-000000000417";
const NOW = new Date("2026-06-22T09:00:00.000Z");
const ENABLED_WRITE_ENV = {
  PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
  PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
};
const ENABLED_READ_ENV = {
  PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
  PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
  PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
};

const RAW_FORMULA_SENTINEL = "RAW_FORMULA_SENTINEL";
const RAW_NUMBER_SENTINEL = "RAW_NUMBER_SENTINEL";
const RAW_CASIO_SENTINEL = "RAW_CASIO_SENTINEL";
const RAW_DISPLAY_SENTINEL = "RAW_DISPLAY_SENTINEL";
const RAW_ANSWER_SENTINEL = "RAW_ANSWER_SENTINEL";
const RAW_VERIFY_SENTINEL = "RAW_VERIFY_SENTINEL";

const textStepEntries = {
  conditions: "조건 확인",
  formula: "산식 확인",
  numbers_units: "숫자와 단위 확인",
  casio_input: "100 × 0.05 EXE",
  display_value: "화면값 확인",
  answer_value: "답안 기재값 확인",
  unit_rounding: "단위와 반올림 확인",
};

function completeDraft({
  routineId = "problem-snap-concept-state",
  source = "problem-snap",
  mistakeTypes = ["none"],
  verificationMethods = ["unit_check"],
  stuckStepIds = [],
  blankStepId,
} = {}) {
  let draft = createCalculatorRoutineDraft({
    source,
    examMode: "second",
    subject: "감정평가실무",
    routineId,
    now: "2026-06-22T08:00:00.000Z",
  });
  for (const [stepId, value] of Object.entries(textStepEntries)) {
    draft = updateCalculatorRoutineDraftStep(
      draft,
      stepId,
      blankStepId === stepId ? "" : value,
      "2026-06-22T08:01:00.000Z",
    );
  }
  return {
    ...draft,
    verificationMethods,
    mistakeTypes,
    stuckStepIds,
    hintUsedStepIds: stuckStepIds,
    entries: {
      ...draft.entries,
      verification: RAW_VERIFY_SENTINEL,
      mistake_type: "session-only mistake memo",
    },
  };
}

function signalFromDraft(options = {}, completedAt = "2026-06-22T08:30:00.000Z") {
  return buildCalculatorRoutineCompletionSignal(completeDraft(options), completedAt);
}

function bridgeFromDraft(options = {}, completedAt) {
  return buildCalculatorRoutineBridge(USER_ID, signalFromDraft(options, completedAt));
}

function eventFromBridge(bridge, createdAt = "2026-06-22T08:31:00.000Z", completedAt) {
  return {
    ...bridge.learningEventInput,
    metadataJson: {
      ...bridge.learningEventInput.metadataJson,
      ...(completedAt ? { completedAt } : {}),
    },
    id: bridge.learningEventId,
    userId: USER_ID,
    createdAt,
  };
}

function projectionFromBridge(bridge, event = eventFromBridge(bridge)) {
  return buildCalculatorRoutineConceptStateProjection({
    userId: USER_ID,
    bridge,
    persistedEvent: event,
    now: NOW,
  });
}

function nodeFromBridge(bridge, previous = null, event = eventFromBridge(bridge)) {
  const projection = projectionFromBridge(bridge, event);
  return updatePersonalConceptNode(previous, buildCalculatorRoutineConceptGraphSignal(projection));
}

function createMockSupabaseRepository(initialNode = null) {
  let stored = initialNode ? { ...initialNode } : null;
  const seenEvents = new Set();
  const calls = { transition: 0, transitionedInputs: [] };
  return {
    calls,
    get stored() {
      return stored ? { ...stored } : null;
    },
    repository: {
      mode: "supabase",
      async transitionPersonalConceptNode(input) {
        calls.transition += 1;
        calls.transitionedInputs.push({ ...input });
        if (seenEvents.has(input.eventId)) {
          return { status: "already_applied", node: stored ? { ...stored } : undefined, metadataOnly: true };
        }
        const previous = stored ? { ...stored } : null;
        if (previous) {
          const incomingTs = Date.parse(input.updatedAt);
          const previousTs = Date.parse(previous.updatedAt);
          if (incomingTs < previousTs) {
            seenEvents.add(input.eventId);
            return { status: "stale_signal", node: previous, previousState: previous.state, previousUpdatedAt: previous.updatedAt, metadataOnly: true };
          }
          if (incomingTs === previousTs) {
            seenEvents.add(input.eventId);
            return { status: "rejected", reason: "same_timestamp_different_event", node: previous, previousState: previous.state, previousUpdatedAt: previous.updatedAt, metadataOnly: true };
          }
        }
        const next = updatePersonalConceptNode(previous, input);
        stored = { ...next };
        seenEvents.add(input.eventId);
        return { status: "applied", node: { ...next }, previousState: previous?.state, previousUpdatedAt: previous?.updatedAt, metadataOnly: true };
      },
    },
  };
}

function graphCalculatorAction(overrides = {}) {
  return {
    id: "union:today-concept:calculator-graph",
    source: "personal_concept_graph",
    examMode: "second",
    subjectId: "감정평가실무",
    unitId: "concept:second:감정평가실무:검산-CASIO",
    taskType: "calculator_routine",
    title: "감정평가실무 · 검산/CASIO 계산·검산 복구",
    rationale: "계산·검산 실수 신호가 남아 있어 입력 순서와 단위를 다시 확인합니다.",
    primaryAction: "계산·검산 다시 하기",
    estimatedMinutes: 10,
    prioritySignals: ["calculator_routine", "wrong_concept", "due_review"],
    isPrimaryTask: true,
    metadataOnly: true,
    ...overrides,
  };
}

function unrelatedGraphAction(overrides = {}) {
  return {
    id: "union:today-concept:theory",
    source: "personal_concept_graph",
    examMode: "second",
    subjectId: "감정평가이론",
    unitId: "market-value",
    taskType: "keyword_recall",
    title: "감정평가이론 · 시장가치 키워드 회상",
    rationale: "핵심 키워드 1개를 먼저 떠올립니다.",
    primaryAction: "개념 1개 회상",
    estimatedMinutes: 10,
    prioritySignals: ["confused_concept"],
    isPrimaryTask: true,
    metadataOnly: true,
    ...overrides,
  };
}

function textOf(value) {
  return JSON.stringify(value);
}

test("projection rebuilds one canonical metadata-only calculator concept identity", () => {
  const bridge = bridgeFromDraft({
    routineId: "problem-snap-projection",
    mistakeTypes: ["rounding"],
  });
  const projection = projectionFromBridge(bridge);
  const graphSignal = buildCalculatorRoutineConceptGraphSignal(projection);

  assert.equal(projection.metadataOnly, true);
  assert.equal(projection.userId, USER_ID);
  assert.equal(projection.examMode, "second");
  assert.equal(projection.subjectId, "감정평가실무");
  assert.equal(projection.conceptFamily, "검산/CASIO");
  assert.equal(projection.unitId, projection.conceptNodeId);
  assert.match(projection.conceptNodeId, /^concept:second:감정평가실무:검산-CASIO$/);
  assert.equal(projection.taskType, "calculator_routine");
  assert.equal(projection.result, "wrong");
  assert.equal(projection.confidence, "medium");
  assert.equal(projection.sourceEventId, bridge.learningEventId);
  assert.equal(projection.completionFingerprint, bridge.completionFingerprint);
  assert.equal(graphSignal.metadataOnly, true);
  assert.equal(graphSignal.unitId, projection.conceptNodeId);

  const clientSpoofed = bridgeFromDraft({
    routineId: "problem-snap-client-spoof",
    mistakeTypes: ["rounding"],
  });
  clientSpoofed.sanitizedSignal.routineConceptCandidate.conceptNodeId = RAW_FORMULA_SENTINEL;
  assert.equal(projectionFromBridge(clientSpoofed).conceptNodeId.includes(RAW_FORMULA_SENTINEL), false);
});

test("calculator outcomes map through the existing graph state transition engine", () => {
  const wrong = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-wrong", mistakeTypes: ["rounding"] }));
  assert.equal(wrong.state, "wrong");
  assert.equal(wrong.confidence, "medium");
  assert.equal(wrong.wrongCount, 1);
  assert.equal(wrong.nextRecommendedTaskType, "calculator_routine");
  assert.equal(wrong.nextDueAt, "2026-06-23T08:30:00.000Z");

  const stuck = nodeFromBridge(bridgeFromDraft({
    routineId: "problem-snap-stuck",
    mistakeTypes: ["none"],
    stuckStepIds: ["casio_input"],
    blankStepId: "casio_input",
  }));
  assert.equal(stuck.state, "confused");
  assert.equal(stuck.confidence, "low");
  assert.equal(stuck.wrongCount, 1);
  assert.equal(stuck.nextDueAt, "2026-06-23T08:30:00.000Z");

  const firstClean = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-clean", mistakeTypes: ["none"] }));
  assert.equal(firstClean.state, "recovering");
  assert.equal(firstClean.confidence, "medium");
  assert.equal(firstClean.recoveryCount, 1);
  assert.equal(firstClean.nextDueAt, "2026-06-24T08:30:00.000Z");

  const wrongThenClean = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-clean-after-wrong", mistakeTypes: ["none"] }), wrong);
  assert.equal(wrongThenClean.state, "recovering");
  assert.equal(wrongThenClean.recoveryCount, 1);

  const confusedThenClean = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-clean-after-confused", mistakeTypes: ["none"] }), stuck);
  assert.equal(confusedThenClean.state, "recovering");
  assert.equal(confusedThenClean.recoveryCount, 1);

  const stable = nodeFromBridge(bridgeFromDraft({
    routineId: "problem-snap-stable",
    mistakeTypes: ["none"],
  }, "2026-06-22T08:45:00.000Z"), firstClean, eventFromBridge(bridgeFromDraft({
    routineId: "problem-snap-stable",
    mistakeTypes: ["none"],
  }, "2026-06-22T08:45:00.000Z"), "2026-06-22T08:46:00.000Z", "2026-06-22T08:45:00.000Z"));
  assert.equal(stable.state, "stable");
  assert.equal(stable.stableCount, 1);
  assert.equal(stable.nextDueAt, "2026-06-29T08:45:00.000Z");

  const stableThenWrong = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-stable-wrong", mistakeTypes: ["casio_input"] }), stable);
  assert.equal(stableThenWrong.state, "wrong");
  const stableThenStuck = nodeFromBridge(bridgeFromDraft({
    routineId: "problem-snap-stable-stuck",
    mistakeTypes: ["none"],
    stuckStepIds: ["display_value"],
    blankStepId: "display_value",
  }), stable);
  assert.equal(stableThenStuck.state, "confused");
});

test("clean completion remains a recovery signal, not a correctness or score claim", () => {
  const clean = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-boundary-clean", mistakeTypes: ["none"] }));
  const recommendation = compressUnifiedTodayPlanToMaxThree([graphCalculatorAction({
    prioritySignals: ["calculator_routine", "recovery_needed"],
  })])[0];
  const serialized = `${textOf(clean)}\n${textOf(recommendation)}`;

  assert.equal(clean.state, "recovering");
  assert.equal(serialized.includes("confident_wrong"), false);
  assert.doesNotMatch(serialized, /high-confidence|numerical correctness|score|pass|fail|합격|점수|공식 채점|모범답안|정답 인증/i);
});

test("monotonic durable writes are idempotent and stale-safe", async () => {
  const wrongBridge = bridgeFromDraft({ routineId: "problem-snap-monotonic", mistakeTypes: ["rounding"] });
  const wrongEvent = eventFromBridge(wrongBridge, "2026-06-22T08:31:00.000Z", "2026-06-22T08:30:00.000Z");
  const disabledRepo = createMockSupabaseRepository();
  const disabled = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: wrongEvent,
    now: NOW,
    context: { env: {}, repositoryAdapter: disabledRepo.repository },
  });
  assert.equal(disabled.status, "durable_writes_disabled");
  assert.equal(disabledRepo.calls.transition, 0);

  const repo = createMockSupabaseRepository();
  const first = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: wrongEvent,
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  assert.equal(first.status, "updated");
  assert.equal(first.previousState, undefined);
  assert.equal(first.nextState, "wrong");
  assert.equal(repo.calls.transition, 1);
  assert.equal(repo.calls.transitionedInputs[0].eventId, wrongEvent.id);
  assert.equal(repo.stored.wrongCount, 1);

  const identicalRetry = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: wrongEvent,
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  assert.equal(identicalRetry.status, "already_applied");
  assert.equal(repo.calls.transition, 2);
  assert.equal(repo.stored.wrongCount, 1);

  const olderBridge = bridgeFromDraft({ routineId: "problem-snap-monotonic", mistakeTypes: ["casio_input"] }, "2026-06-22T08:00:00.000Z");
  const older = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: olderBridge,
    persistedEvent: eventFromBridge(olderBridge, "2026-06-22T08:32:00.000Z", "2026-06-22T08:00:00.000Z"),
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  assert.equal(older.status, "stale_signal");
  assert.equal(repo.calls.transition, 3);
  assert.equal(repo.stored.wrongCount, 1);

  const cleanBridge = bridgeFromDraft({ routineId: "problem-snap-monotonic", mistakeTypes: ["none"] }, "2026-06-22T08:45:00.000Z");
  const clean = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: cleanBridge,
    persistedEvent: eventFromBridge(cleanBridge, "2026-06-22T08:46:00.000Z", "2026-06-22T08:45:00.000Z"),
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  assert.equal(clean.status, "updated");
  assert.equal(clean.previousState, "wrong");
  assert.equal(clean.nextState, "recovering");
  assert.equal(repo.calls.transition, 4);
  assert.equal(repo.stored.recoveryCount, 1);

  const repairRepo = createMockSupabaseRepository();
  const dedupedRepair = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: wrongEvent,
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repairRepo.repository },
  });
  assert.equal(dedupedRepair.status, "updated");
  assert.equal(repairRepo.calls.transition, 1);
});

test("Supabase write payload is compatible with UUID primary keys", () => {
  const node = nodeFromBridge(bridgeFromDraft({ routineId: "problem-snap-uuid", mistakeTypes: ["rounding"] }));
  const nonUuidPayload = buildPersonalConceptNodeSupabaseWritePayload(node);
  assert.equal(Object.hasOwn(nonUuidPayload, "id"), false);
  assert.equal(nonUuidPayload.user_id, USER_ID);

  const uuid = "11111111-1111-4111-8111-111111111111";
  const uuidPayload = buildPersonalConceptNodeSupabaseWritePayload({ ...node, id: uuid });
  assert.equal(uuidPayload.id, uuid);

  const repositorySource = readFileSync("lib/review-os/personal-concept-graph-supabase-repository.ts", "utf8");
  assert.match(repositorySource, /onConflict: "user_id,exam_mode,subject_id,unit_id"/);
  assert.match(repositorySource, /return fromRow\(data as unknown as PersonalConceptNodeRow\)/);
});

test("service integration attempts graph sync after saved and deduped learning records", () => {
  const serviceSource = readFileSync("lib/review-os/service.ts", "utf8");
  const routeSource = readFileSync("app/api/os/calculator-routine/complete/route.ts", "utf8");
  const methodSource = serviceSource.slice(
    serviceSource.indexOf("async completeCalculatorRoutine"),
    serviceSource.indexOf("async listCalculatorRoutineReviewCandidates"),
  );
  const persistIndex = methodSource.indexOf("createLearningSignalEventWithId");
  const graphIndex = methodSource.indexOf("maybeUpdateCalculatorRoutineConceptState({", persistIndex);
  const usageIndex = methodSource.indexOf('"calculator_routine_completed"');

  assert.ok(persistIndex > 0);
  assert.ok(graphIndex > persistIndex);
  assert.ok(usageIndex > graphIndex);
  assert.equal(methodSource.slice(persistIndex, graphIndex).includes("status ==="), false);
  assert.equal(methodSource.includes("catch"), false);
  assert.match(routeSource, /catch \(error\) {\s+return reviewOsErrorResponse\(error\);/);
  assert.ok(methodSource.includes("conceptStateStatus"));
  assert.ok(methodSource.includes("calculator_routine_concept_state_updated"));
  assert.ok(methodSource.includes('conceptFamily: "검산/CASIO"'));
  assert.ok(methodSource.includes("containsRawContent: false"));
  assert.equal(methodSource.includes("rawAnswerText"), false);
  assert.equal(methodSource.includes("scorePrediction"), false);
});

test("Today Plan keeps closable calculator recovery and suppresses graph-only dead ends", async () => {
  const bridge = bridgeFromDraft({ routineId: "problem-snap-today-closable", mistakeTypes: ["display_reading"] });
  const event = eventFromBridge(bridge);
  const withGraph = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: USER_ID,
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [event],
    now: NOW,
    env: ENABLED_READ_ENV,
    durableReadHelper: async () => ({
      ok: true,
      skipped: false,
      repositoryMode: "supabase",
      actions: [graphCalculatorAction()],
      metadataOnly: true,
    }),
  });

  const calculatorTasks = withGraph.filter((task) => task.task_type === "calculator_routine");
  assert.equal(calculatorTasks.length, 1);
  assert.deepEqual(calculatorTasks[0].calculator_routine_recovery, {
    metadataOnly: true,
    routineId: "problem-snap-today-closable",
    source: "problem-snap",
  });
  assert.ok(withGraph.length <= 3);

  const graphOnly = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: USER_ID,
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [],
    now: NOW,
    env: ENABLED_READ_ENV,
    durableReadHelper: async () => ({
      ok: true,
      skipped: false,
      repositoryMode: "supabase",
      actions: [graphCalculatorAction()],
      metadataOnly: true,
    }),
  });
  assert.equal(graphOnly.some((task) => task.task_type === "calculator_routine"), false);

  const unrelated = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: USER_ID,
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [],
    now: NOW,
    env: ENABLED_READ_ENV,
    durableReadHelper: async () => ({
      ok: true,
      skipped: false,
      repositoryMode: "supabase",
      actions: [unrelatedGraphAction()],
      metadataOnly: true,
    }),
  });
  assert.equal(unrelated.length, 1);
  assert.notEqual(unrelated[0].task_type, "calculator_routine");

  const reviewQueueFirst = compressUnifiedTodayPlanToMaxThree([
    {
      id: "review-overdue",
      source: "review_queue",
      examMode: "second",
      subjectId: "감정평가실무",
      unitId: "overdue-review",
      taskType: "rewrite",
      title: "감정평가실무 답안 다시쓰기",
      rationale: "예정 복습이 밀려 있습니다.",
      primaryAction: "10분 다시 쓰기",
      estimatedMinutes: 15,
      prioritySignals: ["review_queue_due_bucket:soon", "due_review"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
    graphCalculatorAction(),
  ]);
  assert.equal(reviewQueueFirst[0].source, "review_queue");
});

test("calculator concept-state path keeps raw routine data out of all metadata surfaces", async () => {
  const bridge = bridgeFromDraft({ routineId: "problem-snap-raw-boundary", mistakeTypes: ["rounding"] });
  const event = eventFromBridge(bridge);
  const projection = projectionFromBridge(bridge, event);
  const graphSignal = buildCalculatorRoutineConceptGraphSignal(projection);
  const node = updatePersonalConceptNode(null, graphSignal);
  const payload = buildPersonalConceptNodeSupabaseWritePayload(node);
  const repo = createMockSupabaseRepository();
  const response = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge,
    persistedEvent: event,
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  const todayPlanTasks = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: USER_ID,
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [event],
    now: NOW,
    env: ENABLED_READ_ENV,
    durableReadHelper: async () => ({
      ok: true,
      skipped: false,
      repositoryMode: "supabase",
      actions: [graphCalculatorAction()],
      metadataOnly: true,
    }),
  });

  const serialized = textOf({
    projection,
    graphSignal,
    node,
    payload,
    response,
    usageMetadata: {
      metadataOnly: true,
      conceptNodeId: response.conceptNodeId,
      conceptFamily: "검산/CASIO",
      conceptStateStatus: response.status,
      previousState: response.previousState,
      nextState: response.nextState,
      taskType: "calculator_routine",
      containsRawContent: false,
    },
    todayPlanTasks,
  });

  for (const sentinel of [
    RAW_FORMULA_SENTINEL,
    RAW_NUMBER_SENTINEL,
    RAW_CASIO_SENTINEL,
    RAW_DISPLAY_SENTINEL,
    RAW_ANSWER_SENTINEL,
    RAW_VERIFY_SENTINEL,
  ]) {
    assert.equal(serialized.includes(sentinel), false, sentinel);
  }
});
