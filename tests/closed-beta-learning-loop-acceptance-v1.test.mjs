import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { structureCaptureNote } from "../lib/review-os/capture-note-engine.ts";
import {
  CALCULATOR_ROUTINE_STEPS,
  buildCalculatorRoutineCompletionSignal,
  createCalculatorRoutineDraft,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";
import {
  buildActiveCalculatorRoutineReviewCandidates,
  buildCalculatorRoutineBridge,
  buildCalculatorRoutineRecoveryHref,
} from "../lib/review-os/calculator-routine-learning-signal.ts";
import {
  buildCalculatorRoutineConceptGraphSignal,
  buildCalculatorRoutineConceptStateProjection,
  maybeUpdateCalculatorRoutineConceptState,
} from "../lib/review-os/calculator-routine-concept-state.ts";
import { maybeWriteExecutionSignalToConceptGraph } from "../lib/review-os/execution-to-concept-graph-durable-write.ts";
import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";
import { buildPersonalConceptNodeSupabaseWritePayload } from "../lib/review-os/personal-concept-graph-supabase-repository.ts";
import { compressUnifiedTodayPlanToMaxThree } from "../lib/review-os/today-plan-source-union.ts";

const USER_ID = "00000000-0000-4000-8000-000000000418";
const NOW = new Date("2026-06-22T09:00:00.000Z");
const ENABLED_WRITE_ENV = {
  PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
  PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
};

const SENTINELS = {
  rawCaptureText: "RAW_CAPTURE_TEXT_SENTINEL_418",
  rawAnswerText: "RAW_ANSWER_TEXT_SENTINEL_418",
  formula: "RAW_FORMULA_SENTINEL_418",
  numbersUnits: "RAW_NUMBERS_UNITS_SENTINEL_418",
  casioInput: "RAW_CASIO_INPUT_SENTINEL_418",
  displayValue: "RAW_DISPLAY_VALUE_SENTINEL_418",
  answerValue: "RAW_ANSWER_VALUE_SENTINEL_418",
  verificationMemo: "RAW_VERIFICATION_MEMO_SENTINEL_418",
  mistakeMemo: "RAW_MISTAKE_MEMO_SENTINEL_418",
};

const runtimeLearnerFiles = [
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/notes/page.tsx",
  "app/app/review/page.tsx",
  "app/app/session/page.tsx",
  "app/app/calculator/page.tsx",
  "app/problem-snap/problem-snap-client.tsx",
  "app/answer-review/answer-review-client.tsx",
  "components/review-os/review-queue-client.tsx",
  "components/review-os/calculator-routine-trainer.tsx",
  "components/review-os/calculator-workflow-page.tsx",
  "components/review-os/calculator-routine-review-candidates.tsx",
  "components/review-os/calculator-routine-sync-status.tsx",
];

const textStepEntries = {
  conditions: "조건 확인",
  formula: SENTINELS.formula,
  numbers_units: SENTINELS.numbersUnits,
  casio_input: SENTINELS.casioInput,
  display_value: SENTINELS.displayValue,
  answer_value: SENTINELS.answerValue,
  unit_rounding: "단위와 반올림 기준 확인",
};

function read(path) {
  return readFileSync(path, "utf8");
}

function serialized(value) {
  return JSON.stringify(value);
}

function assertNoSentinels(value, label) {
  const text = serialized(value);
  for (const sentinel of Object.values(SENTINELS)) {
    assert.equal(text.includes(sentinel), false, `${label} leaked ${sentinel}`);
  }
}

function baseAction(overrides = {}) {
  return {
    id: "base-action",
    source: "study_schedule",
    examMode: "first",
    subjectId: "민법",
    unitId: "civil-general",
    taskType: "review",
    title: "민법 개념 확인",
    rationale: "메타데이터 기반 복습",
    primaryAction: "개념 1개 회상",
    estimatedMinutes: 10,
    prioritySignals: ["schedule_track_focus"],
    isPrimaryTask: true,
    metadataOnly: true,
    ...overrides,
  };
}

function completeDraft({
  routineId = "problem-snap-acceptance",
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
      verification: SENTINELS.verificationMemo,
      mistake_type: SENTINELS.mistakeMemo,
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
  return updatePersonalConceptNode(previous, buildCalculatorRoutineConceptGraphSignal(projectionFromBridge(bridge, event)));
}

function createMockSupabaseRepository(initialNode = null) {
  let stored = initialNode ? { ...initialNode } : null;
  const calls = { get: 0, upsert: 0, upsertedNodes: [] };
  return {
    calls,
    get stored() {
      return stored ? { ...stored } : null;
    },
    repository: {
      mode: "supabase",
      async getPersonalConceptNode() {
        calls.get += 1;
        return stored ? { ...stored } : null;
      },
      async upsertPersonalConceptNode(node) {
        calls.upsert += 1;
        stored = { ...node };
        calls.upsertedNodes.push({ ...node });
        return { ...node };
      },
    },
  };
}

function conceptWriteSignal(result, updatedAt) {
  return {
    userId: USER_ID,
    examMode: "second",
    subjectId: "감정평가실무",
    unitId: "concept:second:감정평가실무:검산-CASIO",
    taskType: "calculator_routine",
    result,
    confidence: result === "done" ? "medium" : "medium",
    executionSource: "calculator",
    derivedStatus: "needs_review",
    reviewDueHint: result === "done" ? "none" : "tomorrow",
    prioritySignals: ["calculator_routine"],
    feedbackCopy: "metadata-only calculator routine signal",
    nextRecommendedTaskType: "calculator_routine",
    updatedAt,
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("core route and component contract covers the closed-beta learner loop without restricted links", () => {
  const requiredFiles = {
    capture: "app/app/capture/page.tsx",
    notes: "app/app/notes/page.tsx",
    review: "app/app/review/page.tsx",
    today: "app/app/page.tsx",
    session: "app/app/session/page.tsx",
    calculatorRecovery: "app/app/calculator/page.tsx",
    answerReview: "app/answer-review/answer-review-client.tsx",
    problemSnap: "app/problem-snap/problem-snap-client.tsx",
    retrievalReview: "components/review-os/review-queue-client.tsx",
    calculatorTrainer: "components/review-os/calculator-routine-trainer.tsx",
  };

  for (const [name, path] of Object.entries(requiredFiles)) {
    assert.equal(existsSync(path), true, `${name} file exists`);
  }

  const combined = runtimeLearnerFiles.map((path) => read(path)).join("\n");
  assert.doesNotMatch(combined, /href=[{"'`][^\n]*(?:\/instructor|\/admin|\/studio)/i);
  assert.ok(read("app/app/review/page.tsx").includes("CalculatorRoutineReviewCandidates"));
  assert.ok(read("components/review-os/review-queue-client.tsx").includes('data-review-retrieval-step="recall"'));
  assert.ok(read("app/problem-snap/problem-snap-client.tsx").includes("CalculatorRoutineTrainer"));
});

test("capture-to-concept acceptance keeps one gap, one action, and metadata-only concept output", () => {
  const note = structureCaptureNote({
    mode: "second",
    subject: "감정평가이론",
    confirmedText: SENTINELS.rawCaptureText,
    problemText: SENTINELS.rawCaptureText,
    userAnswerText: SENTINELS.rawAnswerText,
    itemInput: {
      examName: "감정평가사 2차",
      subjectLabel: "감정평가이론",
      sourceType: "manual",
      rawQuestionText: SENTINELS.rawCaptureText,
      userAnswer: SENTINELS.rawAnswerText,
      confidence: "중간",
      missingIssue: "시장가치 논리 연결",
      biggestGap: "키워드와 논리 연결 보강",
      rewriteInstruction: "핵심 키워드 3개를 문단으로 다시 연결",
      keyConcepts: ["시장가치", "논리 연결"],
    },
  });

  assert.ok(String(note.one_biggest_gap).trim().length > 0);
  assert.ok(String(note.one_next_action).trim().length > 0);
  assert.equal(note.concept_node_candidate.metadataOnly, true);
  assert.ok(String(note.concept_node_candidate.conceptNodeId).length > 0);
  assertNoSentinels(note.concept_node_candidate, "concept candidate");
});

test("Today Plan acceptance preserves max-three executable actions and source priorities", () => {
  const plan = compressUnifiedTodayPlanToMaxThree([
    baseAction({
      id: "overdue-review",
      source: "review_queue",
      examMode: "second",
      subjectId: "감정평가이론",
      unitId: "rewrite-overdue",
      taskType: "second_answer_rewrite",
      title: "감정평가이론 문단 다시쓰기",
      primaryAction: "문단 1개 다시쓰기",
      prioritySignals: ["review_queue_due_bucket:soon", "due_review"],
    }),
    baseAction({
      id: "calculator-1",
      source: "personal_concept_graph",
      examMode: "second",
      subjectId: "감정평가실무",
      unitId: "calculator-routine",
      taskType: "calculator_routine",
      title: "계산·검산 다시 하기",
      primaryAction: "계산 루틴 열기",
      prioritySignals: ["calculator_routine", "calculator_recovery"],
      calculatorRoutineRecovery: {
        metadataOnly: true,
        routineId: "problem-snap-acceptance",
        source: "problem-snap",
      },
    }),
    baseAction({
      id: "calculator-duplicate",
      source: "personal_concept_graph",
      examMode: "second",
      subjectId: "감정평가실무",
      unitId: "calculator-routine",
      taskType: "calculator_routine",
      title: "중복 계산 루틴",
      primaryAction: "중복 계산 루틴 열기",
      prioritySignals: ["calculator_routine"],
    }),
    baseAction({
      id: "first-retrieval",
      source: "review_queue",
      examMode: "first",
      subjectId: "민법",
      unitId: "civil-ox",
      taskType: "O/X",
      title: "민법 O/X 회상",
      primaryAction: "O/X로 다시 풀기",
      prioritySignals: ["review_queue_due_bucket:tomorrow"],
    }),
    baseAction({ id: "fallback-1", unitId: "fallback-1" }),
  ]);

  assert.equal(plan.length, 3);
  assert.equal(plan[0].source, "review_queue");
  assert.ok(plan.every((task) => task.metadataOnly === true && String(task.primaryAction).trim().length > 0));
  assert.ok(plan.some((task) => task.taskType === "calculator_routine"));
  assert.ok(plan.some((task) => task.taskType === "second_answer_rewrite"));
  assert.ok(plan.some((task) => task.examMode === "first" && task.taskType === "O/X"));
  assert.equal(plan.filter((task) => task.taskType === "calculator_routine").length, 1);
});

test("Retrieval Review requires recall and outcome before completion", () => {
  const client = read("components/review-os/review-queue-client.tsx");
  const completionRoute = read("app/api/os/review-queue/[queueId]/complete/route.ts");

  assert.ok(client.indexOf('data-review-retrieval-step="recall"') < client.indexOf('data-review-retrieval-step="check"'));
  assert.ok(client.includes("recallAttemptTextByQueueId"));
  assert.ok(client.includes("recallOutcomeByQueueId"));
  assert.ok(client.includes("disabled={pendingId === primaryItem.queueId || !primaryOutcome}"));
  assert.ok(client.includes("retrievalSentence"));
  assert.ok(client.includes("recallOutcome"));
  assert.ok(completionRoute.includes("ALLOWED_ACTIONS"));
  assert.ok(completionRoute.includes("reviewOsService.completeReview"));
});

test("Calculator Routine completion is metadata-only and closes recovery after clean same-routine retry", () => {
  assert.equal(CALCULATOR_ROUTINE_STEPS.length, 9);
  assert.throws(() => buildCalculatorRoutineCompletionSignal(completeDraft({ verificationMethods: [] })), /calculator-routine/);
  assert.throws(() => buildCalculatorRoutineCompletionSignal(completeDraft({ mistakeTypes: [] })), /calculator-routine/);

  const cleanSignal = signalFromDraft({ routineId: "problem-snap-clean", mistakeTypes: ["none"] });
  assert.equal(cleanSignal.metadataOnly, true);
  assert.equal(cleanSignal.routineType, "calculator_routine");
  assertNoSentinels(cleanSignal, "completion signal");

  const cleanBridge = buildCalculatorRoutineBridge(USER_ID, cleanSignal);
  const wrongBridge = bridgeFromDraft({ routineId: "problem-snap-candidate", mistakeTypes: ["casio_input"] });
  const stuckBridge = bridgeFromDraft({
    routineId: "problem-snap-stuck",
    mistakeTypes: ["none"],
    stuckStepIds: ["casio_input"],
    blankStepId: "casio_input",
  });

  assert.equal(buildActiveCalculatorRoutineReviewCandidates([eventFromBridge(cleanBridge)], NOW).length, 0);
  assert.equal(buildActiveCalculatorRoutineReviewCandidates([eventFromBridge(wrongBridge)], NOW).length, 1);
  assert.equal(buildActiveCalculatorRoutineReviewCandidates([eventFromBridge(stuckBridge)], NOW).length, 1);

  const recoveryCandidate = buildActiveCalculatorRoutineReviewCandidates([eventFromBridge(wrongBridge)], NOW)[0];
  assert.deepEqual(recoveryCandidate.recoveryReference, {
    metadataOnly: true,
    routineId: "problem-snap-candidate",
    source: "problem-snap",
  });
  assert.equal(
    buildCalculatorRoutineRecoveryHref(recoveryCandidate.recoveryReference),
    "/app/calculator?mode=second&context=practice&focus=casio&recoveryRoutineId=problem-snap-candidate&recoverySource=problem-snap",
  );

  const cleanSameRoutine = bridgeFromDraft({ routineId: "problem-snap-candidate", mistakeTypes: ["none"] });
  const candidatesAfterRecovery = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(wrongBridge, "2026-06-22T08:10:00.000Z", "2026-06-22T08:10:00.000Z"),
    eventFromBridge(cleanSameRoutine, "2026-06-22T08:20:00.000Z", "2026-06-22T08:20:00.000Z"),
  ], NOW);
  assert.equal(candidatesAfterRecovery.length, 0);
});

test("Learning Record acceptance keeps completion API, dedupe identity, and no raw learner values", () => {
  const route = read("app/api/os/calculator-routine/complete/route.ts");
  const service = read("lib/review-os/service.ts");
  const signal = signalFromDraft({ routineId: "problem-snap-record", mistakeTypes: ["casio_input"] });
  const retry = signalFromDraft({ routineId: "problem-snap-record", mistakeTypes: ["casio_input"] });
  const changed = signalFromDraft({ routineId: "problem-snap-record", mistakeTypes: ["rounding"] });

  const bridge = buildCalculatorRoutineBridge(USER_ID, signal);
  const retryBridge = buildCalculatorRoutineBridge(USER_ID, retry);
  const changedBridge = buildCalculatorRoutineBridge(USER_ID, changed);
  const completeMethod = service.slice(
    service.indexOf("async completeCalculatorRoutine"),
    service.indexOf("async listCalculatorRoutineReviewCandidates"),
  );

  assert.ok(route.includes("getServerSessionUser"));
  assert.ok(route.includes("requireRequestUserId"));
  assert.ok(route.includes("reviewOsService.completeCalculatorRoutine"));
  assert.ok(service.includes("createLearningSignalEventWithId"));
  assert.ok(completeMethod.indexOf("createLearningSignalEventWithId") < completeMethod.indexOf("maybeUpdateCalculatorRoutineConceptState"));
  assert.equal(bridge.learningEventId, retryBridge.learningEventId);
  assert.equal(bridge.completionFingerprint, retryBridge.completionFingerprint);
  assert.notEqual(bridge.completionFingerprint, changedBridge.completionFingerprint);
  assert.deepEqual(bridge.learningEventInput.relatedFormulas, []);
  assertNoSentinels([bridge.learningEventInput, bridge.reviewQueueItem], "learning record metadata");
});

test("Personal Concept State acceptance covers sequential transitions, idempotency, disabled writes, and metadata boundaries", async () => {
  const wrongBridge = bridgeFromDraft({ routineId: "problem-snap-state", mistakeTypes: ["rounding"] }, "2026-06-22T08:30:00.000Z");
  const stuckBridge = bridgeFromDraft({
    routineId: "problem-snap-state-stuck",
    mistakeTypes: ["none"],
    stuckStepIds: ["casio_input"],
    blankStepId: "casio_input",
  }, "2026-06-22T08:31:00.000Z");
  const cleanBridge = bridgeFromDraft({ routineId: "problem-snap-state", mistakeTypes: ["none"] }, "2026-06-22T08:45:00.000Z");
  const secondCleanBridge = bridgeFromDraft({ routineId: "problem-snap-state", mistakeTypes: ["none"] }, "2026-06-22T09:00:00.000Z");

  const wrong = nodeFromBridge(wrongBridge);
  const stuck = nodeFromBridge(stuckBridge);
  const recovering = nodeFromBridge(cleanBridge, wrong, eventFromBridge(cleanBridge, "2026-06-22T08:46:00.000Z", "2026-06-22T08:45:00.000Z"));
  const stable = nodeFromBridge(secondCleanBridge, recovering, eventFromBridge(secondCleanBridge, "2026-06-22T09:01:00.000Z", "2026-06-22T09:00:00.000Z"));

  assert.equal(wrong.state, "wrong");
  assert.equal(stuck.state, "confused");
  assert.equal(recovering.state, "recovering");
  assert.equal(stable.state, "stable");
  assert.equal(stable.nextRecommendedTaskType, "calculator_routine");

  const disabledRepo = createMockSupabaseRepository();
  const disabled = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: eventFromBridge(wrongBridge, "2026-06-22T08:31:00.000Z", "2026-06-22T08:30:00.000Z"),
    now: NOW,
    context: { env: {}, repositoryAdapter: disabledRepo.repository },
  });
  assert.equal(disabled.status, "durable_writes_disabled");
  assert.equal(disabledRepo.calls.get, 0);
  assert.equal(disabledRepo.calls.upsert, 0);

  const repo = createMockSupabaseRepository();
  const firstWrite = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: eventFromBridge(wrongBridge, "2026-06-22T08:31:00.000Z", "2026-06-22T08:30:00.000Z"),
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  const identicalRetry = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: wrongBridge,
    persistedEvent: eventFromBridge(wrongBridge, "2026-06-22T08:31:00.000Z", "2026-06-22T08:30:00.000Z"),
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });
  const staleBridge = bridgeFromDraft({ routineId: "problem-snap-state", mistakeTypes: ["casio_input"] }, "2026-06-22T08:00:00.000Z");
  const stale = await maybeUpdateCalculatorRoutineConceptState({
    userId: USER_ID,
    bridge: staleBridge,
    persistedEvent: eventFromBridge(staleBridge, "2026-06-22T08:32:00.000Z", "2026-06-22T08:00:00.000Z"),
    now: NOW,
    context: { env: ENABLED_WRITE_ENV, repositoryAdapter: repo.repository },
  });

  assert.equal(firstWrite.status, "updated");
  assert.equal(identicalRetry.status, "already_applied");
  assert.equal(stale.status, "stale_signal");
  assert.equal(repo.calls.upsert, 1);

  const projection = projectionFromBridge(wrongBridge);
  const graphSignal = buildCalculatorRoutineConceptGraphSignal(projection);
  const payload = buildPersonalConceptNodeSupabaseWritePayload(updatePersonalConceptNode(null, graphSignal));
  assertNoSentinels({ projection, graphSignal, payload, firstWrite, identicalRetry, stale }, "concept state metadata");
});

test("Persistence honesty keeps local, durable, deduped, and failed states distinct", () => {
  const capturePersistence = read("lib/review-os/capture-save-persistence.ts");
  const telemetry = read("lib/review-os/learner-loop-telemetry.ts");
  const syncStatus = read("components/review-os/calculator-routine-sync-status.tsx");
  const trainer = read("components/review-os/calculator-routine-trainer.tsx");

  for (const status of ["durable_saved", "local_fallback_saved", "save_failed"]) {
    assert.ok(capturePersistence.includes(status) || telemetry.includes(status), `${status} is present`);
  }
  for (const status of ["local_only", "saved", "deduped", "failed"]) {
    assert.ok(syncStatus.includes(status), `${status} is present`);
  }
  assert.ok(trainer.includes("루틴 완료, 기기 학습 기록 저장 실패"));
  assert.ok(syncStatus.includes("response.status === 401"));
  assert.ok(syncStatus.includes('data?.status === "deduped" ? "deduped" : "saved"'));
});

test("Data boundary rejects forbidden metadata fields and runtime copy stays inside product scope", async () => {
  const rejectedSignals = [
    { rawOcrText: "raw OCR" },
    { problemText: "raw problem" },
    { answerText: "raw answer" },
    { officialAnswer: "official answer" },
    { scorePrediction: "score prediction" },
    { instructorComment: "instructor comment" },
  ];

  for (const fields of rejectedSignals) {
    await assert.rejects(
      () => maybeWriteExecutionSignalToConceptGraph({
        ...conceptWriteSignal("wrong", "2026-06-22T08:30:00.000Z"),
        ...fields,
      }, {
        env: ENABLED_WRITE_ENV,
        repositoryAdapter: createMockSupabaseRepository().repository,
        revisionPolicy: "monotonic_updated_at",
      }),
      /Forbidden raw\/copyrighted learner text field/,
    );
  }

  const sanitized = await maybeWriteExecutionSignalToConceptGraph({
    ...conceptWriteSignal("wrong", "2026-06-22T08:30:00.000Z"),
    formula: SENTINELS.formula,
    numbers: SENTINELS.numbersUnits,
    casioInput: SENTINELS.casioInput,
    displayValue: SENTINELS.displayValue,
    answerValue: SENTINELS.answerValue,
    verificationMemo: SENTINELS.verificationMemo,
  }, {
    env: ENABLED_WRITE_ENV,
    repositoryAdapter: createMockSupabaseRepository().repository,
    revisionPolicy: "monotonic_updated_at",
  });
  assertNoSentinels(sanitized, "sanitized durable write result");

  const runtime = runtimeLearnerFiles.map((path) => read(path)).join("\n");
  for (const pattern of [
    /공식\s*채점/,
    /공식\s*답안/,
    /모범\s*답안/,
    /기준\s*답안/,
    /점수\s*예측/,
    /합격\s*예측/,
    /합격\s*가능성\s*확정/,
    /public\s+archive/i,
    /problem\s+bank/i,
    /payment-first/i,
    /instructor\s+access/i,
  ]) {
    assert.doesNotMatch(runtime, pattern);
  }
});

test("#417 durable-write audit documents the non-atomic cross-instance revision limitation", async () => {
  const initial = updatePersonalConceptNode(null, conceptWriteSignal("wrong", "2026-06-22T08:00:00.000Z"));
  let stored = { ...initial };
  let getCount = 0;
  const releaseBothGets = createDeferred();
  const newerUpserted = createDeferred();
  const olderAt = "2026-06-22T08:30:00.000Z";
  const newerAt = "2026-06-22T08:45:00.000Z";

  const repository = {
    mode: "supabase",
    async getPersonalConceptNode() {
      getCount += 1;
      if (getCount === 2) releaseBothGets.resolve();
      await releaseBothGets.promise;
      return { ...initial };
    },
    async upsertPersonalConceptNode(node) {
      if (node.updatedAt === olderAt) await newerUpserted.promise;
      stored = { ...node };
      if (node.updatedAt === newerAt) newerUpserted.resolve();
      return { ...node };
    },
  };

  const olderPromise = maybeWriteExecutionSignalToConceptGraph(conceptWriteSignal("wrong", olderAt), {
    env: ENABLED_WRITE_ENV,
    repositoryAdapter: repository,
    revisionPolicy: "monotonic_updated_at",
  });
  const newerPromise = maybeWriteExecutionSignalToConceptGraph(conceptWriteSignal("done", newerAt), {
    env: ENABLED_WRITE_ENV,
    repositoryAdapter: repository,
    revisionPolicy: "monotonic_updated_at",
  });

  const [older, newer] = await Promise.all([olderPromise, newerPromise]);

  assert.equal(older.skipped, false);
  assert.equal(newer.skipped, false);
  assert.equal(stored.updatedAt, olderAt);
  assert.equal(stored.lastResult, "wrong");
  assert.equal(getCount, 2);
});
