import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildCalculatorRoutineCompletionSignal,
  createCalculatorRoutineDraft,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";
import {
  buildActiveCalculatorRoutineReviewCandidates,
  buildCalculatorRoutineBridge,
  buildCalculatorRoutineCompletionFingerprint,
  buildCalculatorRoutineLearningEventId,
  buildCalculatorRoutineRecoveryHref,
  getCalculatorRoutineEventOccurrence,
  getCalculatorRoutineCompletionOutcome,
  isValidCalculatorRoutineId,
  normalizeCalculatorRoutineId,
  parseCalculatorRoutineRecoveryReference,
  parseCalculatorRoutineCompletionSignalForServer,
} from "../lib/review-os/calculator-routine-learning-signal.ts";
import { buildTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";
import { buildLearnerTodayPlanTasksWithGatedDurableConceptGraph } from "../lib/review-os/today-plan-learner-route-integration.ts";

const USER_ID = "00000000-0000-4000-8000-000000000416";
const NOW = new Date("2026-06-22T09:00:00.000Z");
const RAW_PROBLEM_SENTINEL = "RAW_PROBLEM_SENTINEL";
const RAW_ANSWER_SENTINEL = "RAW_ANSWER_SENTINEL";
const RAW_FORMULA_SENTINEL = "RAW_FORMULA_SENTINEL";
const RAW_CASIO_SENTINEL = "RAW_CASIO_SENTINEL";

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
  routineId = "problem-snap-bridge-1",
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
      verification: "session-only verification memo",
      mistake_type: "session-only mistake memo",
    },
  };
}

function signalFromDraft(options) {
  return buildCalculatorRoutineCompletionSignal(completeDraft(options), "2026-06-22T08:30:00.000Z");
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

test("server parser accepts only metadata-only calculator routine completion signals", () => {
  const signal = signalFromDraft();
  const parsed = parseCalculatorRoutineCompletionSignalForServer(signal);

  assert.equal(parsed.metadataOnly, true);
  assert.equal(parsed.routineType, "calculator_routine");
  assert.equal(parsed.subject, "감정평가실무");
  assert.deepEqual(parsed.mistakeTypes, ["none"]);
  assert.equal(JSON.stringify(parsed).includes("session-only"), false);

  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({ ...signal, entries: { casio_input: "raw" } }),
    /calculator-routine-raw-field-rejected/,
  );
  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({ ...signal, examMode: "first" }),
    /calculator-routine-unsupported-context/,
  );
  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({ ...signal, completedStepIds: signal.completedStepIds.slice(0, 8) }),
    /calculator-routine-incomplete/,
  );
});

test("routine id parser accepts only production-compatible opaque identifiers", () => {
  assert.equal(normalizeCalculatorRoutineId("problem-snap-550e8400-e29b-41d4-a716-446655440000", "problem-snap"), "problem-snap-550e8400-e29b-41d4-a716-446655440000");
  assert.equal(normalizeCalculatorRoutineId("answer-review-550e8400-e29b-41d4-a716-446655440000", "answer-review"), "answer-review-550e8400-e29b-41d4-a716-446655440000");
  assert.equal(isValidCalculatorRoutineId("problem-snap-1719040000000-ab12cd34", "problem-snap"), true);
  assert.equal(isValidCalculatorRoutineId("answer-review-second-r0", "answer-review"), true);

  const invalidIds = [
    "raw 문제 원문입니다",
    "problem-snap-답안 원문",
    "problem-snap/foo",
    "problem-snap:https://example.com",
    "problem-snap-<script>",
    "answer-review id with spaces",
    "problem-snap-\u0000bad",
    `problem-snap-${"a".repeat(129)}`,
  ];
  for (const value of invalidIds) {
    assert.equal(isValidCalculatorRoutineId(value, "problem-snap"), false);
    assert.throws(() => normalizeCalculatorRoutineId(value, "problem-snap"), /calculator-routine-invalid-routine-id/);
  }

  const signal = signalFromDraft({ routineId: "problem-snap-prefix-check" });
  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({ ...signal, source: "answer-review" }),
    /calculator-routine-invalid-routine-id/,
  );
  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({ ...signal, routineId: "raw 문제 원문입니다" }),
    /calculator-routine-invalid-routine-id/,
  );
  try {
    parseCalculatorRoutineCompletionSignalForServer({ ...signal, routineId: "raw 문제 원문입니다" });
  } catch (error) {
    assert.equal(String(error).includes("raw 문제 원문입니다"), false);
  }
});

test("calculator routine recovery reference is typed metadata and builds safe hrefs", () => {
  const problemSnapReference = parseCalculatorRoutineRecoveryReference({
    metadataOnly: true,
    routineId: "problem-snap-550e8400-e29b-41d4-a716-446655440000",
    source: "problem-snap",
  });
  const answerReviewReference = parseCalculatorRoutineRecoveryReference({
    metadataOnly: true,
    routineId: "answer-review-550e8400-e29b-41d4-a716-446655440000",
    source: "answer-review",
  });

  assert.deepEqual(problemSnapReference, {
    metadataOnly: true,
    routineId: "problem-snap-550e8400-e29b-41d4-a716-446655440000",
    source: "problem-snap",
  });
  assert.equal(
    buildCalculatorRoutineRecoveryHref(problemSnapReference),
    "/app/calculator?mode=second&context=practice&focus=casio&recoveryRoutineId=problem-snap-550e8400-e29b-41d4-a716-446655440000&recoverySource=problem-snap",
  );
  assert.equal(
    buildCalculatorRoutineRecoveryHref(answerReviewReference),
    "/app/calculator?mode=second&context=practice&focus=casio&recoveryRoutineId=answer-review-550e8400-e29b-41d4-a716-446655440000&recoverySource=answer-review",
  );

  assert.throws(
    () => parseCalculatorRoutineRecoveryReference({
      metadataOnly: true,
      routineId: "problem-snap-550e8400-e29b-41d4-a716-446655440000",
      source: "answer-review",
    }),
    /calculator-routine-invalid-routine-id/,
  );
  assert.throws(
    () => parseCalculatorRoutineRecoveryReference({
      metadataOnly: true,
      routineId: RAW_PROBLEM_SENTINEL,
      source: "problem-snap",
    }),
    /calculator-routine-invalid-routine-id/,
  );
  try {
    parseCalculatorRoutineRecoveryReference({
      metadataOnly: true,
      routineId: RAW_PROBLEM_SENTINEL,
      source: "problem-snap",
    });
  } catch (error) {
    assert.equal(String(error).includes(RAW_PROBLEM_SENTINEL), false);
  }

  const href = buildCalculatorRoutineRecoveryHref(problemSnapReference);
  for (const sentinel of [RAW_PROBLEM_SENTINEL, RAW_ANSWER_SENTINEL, RAW_FORMULA_SENTINEL, RAW_CASIO_SENTINEL]) {
    assert.equal(href.includes(sentinel), false);
  }
});

test("parser canonicalizes timestamps and rebuilds concept metadata from safe inputs", () => {
  const signal = signalFromDraft({ routineId: "problem-snap-timestamps" });
  const parsed = parseCalculatorRoutineCompletionSignalForServer({
    ...signal,
    startedAt: "2026-06-22T08:00:00Z",
    completedAt: "2026-06-22T08:30:00Z",
    relatedConceptNodeId: RAW_PROBLEM_SENTINEL,
    routineConceptCandidate: {
      metadataOnly: true,
      conceptNodeId: RAW_ANSWER_SENTINEL,
      conceptFamily: RAW_FORMULA_SENTINEL,
      nextTaskType: RAW_CASIO_SENTINEL,
    },
  });

  assert.equal(parsed.startedAt, "2026-06-22T08:00:00.000Z");
  assert.equal(parsed.completedAt, "2026-06-22T08:30:00.000Z");
  assert.notEqual(parsed.relatedConceptNodeId, RAW_PROBLEM_SENTINEL);
  assert.equal(JSON.stringify(parsed).includes(RAW_ANSWER_SENTINEL), false);
  assert.equal(JSON.stringify(parsed).includes(RAW_FORMULA_SENTINEL), false);
  assert.equal(JSON.stringify(parsed).includes(RAW_CASIO_SENTINEL), false);

  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({
      ...signal,
      startedAt: "2026-06-22T08:30:00.000Z",
      completedAt: "2026-06-22T08:00:00.000Z",
    }),
    /calculator-routine-invalid-completed-at/,
  );
  assert.throws(
    () => parseCalculatorRoutineCompletionSignalForServer({ ...signal, completedAt: "2099-01-01T00:00:00.000Z" }),
    /calculator-routine-invalid-completed-at/,
  );
});

test("completion mapping follows mistake over stuck over clean precedence", () => {
  const clean = signalFromDraft({ routineId: "problem-snap-clean", mistakeTypes: ["none"] });
  const stuck = signalFromDraft({
    routineId: "problem-snap-stuck",
    mistakeTypes: ["none"],
    stuckStepIds: ["casio_input"],
    blankStepId: "casio_input",
  });
  const mistakenAndStuck = signalFromDraft({
    routineId: "problem-snap-wrong",
    mistakeTypes: ["rounding"],
    stuckStepIds: ["casio_input"],
    blankStepId: "casio_input",
  });

  assert.equal(getCalculatorRoutineCompletionOutcome(clean), "done");
  assert.equal(getCalculatorRoutineCompletionOutcome(stuck), "unknown");
  assert.equal(getCalculatorRoutineCompletionOutcome(mistakenAndStuck), "wrong");

  const cleanBridge = buildCalculatorRoutineBridge(USER_ID, clean);
  assert.equal(cleanBridge.cleanCompletion, true);
  assert.equal(cleanBridge.reviewCandidateCreated, false);
  assert.equal(cleanBridge.todayPlanCandidateCreated, false);
  assert.equal(cleanBridge.learningEventInput.nextTaskType, "calculator_routine_complete");

  const stuckBridge = buildCalculatorRoutineBridge(USER_ID, stuck);
  assert.equal(stuckBridge.executionSignal.result, "unknown");
  assert.equal(stuckBridge.reviewCandidateCreated, true);
  assert.equal(stuckBridge.todayPlanCandidateCreated, true);
  assert.ok(stuckBridge.learningEventInput.derivedTags.includes("calculator_stuck_step"));

  const wrongBridge = buildCalculatorRoutineBridge(USER_ID, mistakenAndStuck);
  assert.equal(wrongBridge.executionSignal.result, "wrong");
  assert.equal(wrongBridge.reviewQueueItem?.title, "감정평가실무 · 계산·검산 복구");
  assert.equal(wrongBridge.reviewQueueItem?.primaryAction, "계산·검산 다시 하기");
});

test("verification and unit rounding gaps produce metadata-only due signals", () => {
  const verificationSignal = signalFromDraft({
    routineId: "problem-snap-verification",
    mistakeTypes: ["verification_skipped"],
  });
  const unitSignal = signalFromDraft({
    routineId: "problem-snap-unit",
    mistakeTypes: ["unit_conversion", "rounding"],
  });

  const verificationBridge = buildCalculatorRoutineBridge(USER_ID, verificationSignal);
  assert.equal(verificationBridge.executionSignal.reviewDueHint, "soon");
  assert.ok(verificationBridge.learningEventInput.derivedTags.includes("calculator_verification_gap"));
  assert.equal(verificationBridge.learningEventInput.metadataJson.reviewDueHint, "soon");

  const unitBridge = buildCalculatorRoutineBridge(USER_ID, unitSignal);
  assert.ok(unitBridge.learningEventInput.derivedTags.includes("calculator_unit_rounding_gap"));
  assert.equal(JSON.stringify(unitBridge.learningEventInput).includes("session-only"), false);
  assert.deepEqual(unitBridge.learningEventInput.relatedFormulas, []);
});

test("completion fingerprint creates immutable idempotent revisions for one routine", () => {
  const wrong = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({
    routineId: "problem-snap-revision",
    mistakeTypes: ["casio_input"],
  }));
  const wrongRetry = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({
    routineId: "problem-snap-revision",
    mistakeTypes: ["casio_input"],
  }));
  const clean = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({
    routineId: "problem-snap-revision",
    mistakeTypes: ["none"],
  }));
  const wrongAfterClean = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({
    routineId: "problem-snap-revision",
    mistakeTypes: ["rounding"],
  }));
  const laterSameState = buildCalculatorRoutineBridge(USER_ID, {
    ...signalFromDraft({ routineId: "problem-snap-revision", mistakeTypes: ["casio_input"] }),
    completedAt: "2026-06-22T08:45:00.000Z",
  });
  const orderedSignal = signalFromDraft({
    routineId: "problem-snap-fingerprint-order",
    mistakeTypes: ["casio_input"],
    verificationMethods: ["unit_check", "source_recheck"],
  });
  const reordered = buildCalculatorRoutineBridge(USER_ID, {
    ...orderedSignal,
    completedStepIds: [...orderedSignal.completedStepIds].reverse(),
    verificationMethods: [...orderedSignal.verificationMethods].reverse(),
  });

  assert.equal(buildCalculatorRoutineCompletionFingerprint(wrong.sanitizedSignal), wrong.completionFingerprint);
  assert.equal(wrong.completionFingerprint, wrongRetry.completionFingerprint);
  assert.equal(wrong.learningEventId, wrongRetry.learningEventId);
  assert.equal(buildCalculatorRoutineBridge(USER_ID, orderedSignal).completionFingerprint, reordered.completionFingerprint);
  assert.notEqual(wrong.learningEventId, buildCalculatorRoutineLearningEventId(USER_ID, "problem-snap-revision-2", wrong.completionFingerprint));
  assert.notEqual(wrong.completionFingerprint, clean.completionFingerprint);
  assert.notEqual(wrong.learningEventId, clean.learningEventId);
  assert.notEqual(clean.completionFingerprint, wrongAfterClean.completionFingerprint);
  assert.notEqual(clean.learningEventId, wrongAfterClean.learningEventId);
  assert.notEqual(wrong.completionFingerprint, laterSameState.completionFingerprint);
  assert.notEqual(wrong.learningEventId, laterSameState.learningEventId);

  const serialized = JSON.stringify([
    wrong.completionFingerprint,
    wrong.learningEventInput,
    wrong.reviewQueueItem,
  ]);
  for (const sentinel of [RAW_PROBLEM_SENTINEL, RAW_ANSWER_SENTINEL, RAW_FORMULA_SENTINEL, RAW_CASIO_SENTINEL]) {
    assert.equal(serialized.includes(sentinel), false);
  }
});

test("active calculator routine review candidates use completedAt lifecycle per routine", () => {
  const wrongBridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "problem-snap-candidate", mistakeTypes: ["casio_input"] }));
  const cleanBridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "problem-snap-candidate", mistakeTypes: ["none"] }));

  const staleCandidates = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(wrongBridge, "2026-06-22T08:10:00.000Z", "2026-06-22T08:10:00.000Z"),
    eventFromBridge(cleanBridge, "2026-06-22T08:20:00.000Z", "2026-06-22T08:20:00.000Z"),
  ], NOW);
  assert.equal(staleCandidates.length, 0);

  const freshCandidates = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(cleanBridge, "2026-06-22T08:10:00.000Z", "2026-06-22T08:10:00.000Z"),
    eventFromBridge(wrongBridge, "2026-06-22T08:20:00.000Z", "2026-06-22T08:20:00.000Z"),
  ], NOW);
  assert.equal(freshCandidates.length, 1);
  assert.equal(freshCandidates[0].metadataOnly, true);
  assert.equal(freshCandidates[0].source, "problem-snap");
  assert.deepEqual(freshCandidates[0].recoveryReference, {
    metadataOnly: true,
    routineId: "problem-snap-candidate",
    source: "problem-snap",
  });
  assert.equal(
    buildCalculatorRoutineRecoveryHref(freshCandidates[0].recoveryReference),
    "/app/calculator?mode=second&context=practice&focus=casio&recoveryRoutineId=problem-snap-candidate&recoverySource=problem-snap",
  );
  assert.equal(freshCandidates[0].sourceLabel, "계산·검산 루틴 기반");
  assert.equal(freshCandidates[0].nextAction, "계산·검산 다시 하기");
  assert.equal(JSON.stringify(freshCandidates[0]).includes("answerText"), false);

  const delayedOldClean = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(cleanBridge, "2026-06-22T08:40:00.000Z", "2026-06-22T08:05:00.000Z"),
    eventFromBridge(wrongBridge, "2026-06-22T08:20:00.000Z", "2026-06-22T08:20:00.000Z"),
  ], NOW);
  assert.equal(delayedOldClean.length, 1);
  assert.equal(delayedOldClean[0].createdAt, "2026-06-22T08:20:00.000Z");

  const unrelatedClean = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "problem-snap-unrelated-clean", mistakeTypes: ["none"] }));
  const unrelatedCleanDoesNotSuppress = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(wrongBridge, "2026-06-22T08:10:00.000Z", "2026-06-22T08:10:00.000Z"),
    eventFromBridge(unrelatedClean, "2026-06-22T08:30:00.000Z", "2026-06-22T08:30:00.000Z"),
  ], NOW);
  assert.equal(unrelatedCleanDoesNotSuppress.length, 1);

  const malformedSourceMismatch = buildActiveCalculatorRoutineReviewCandidates([
    {
      ...eventFromBridge(wrongBridge, "2026-06-22T08:10:00.000Z", "2026-06-22T08:10:00.000Z"),
      metadataJson: {
        ...wrongBridge.learningEventInput.metadataJson,
        routineId: "problem-snap-candidate",
        source: "answer-review",
      },
    },
  ], NOW);
  assert.equal(malformedSourceMismatch.length, 0);

  const futureWrongEvent = eventFromBridge(wrongBridge, NOW.toISOString(), "2026-06-22T09:10:00.000Z");
  const futureOccurrence = getCalculatorRoutineEventOccurrence(futureWrongEvent, NOW);
  assert.equal(futureOccurrence.iso, NOW.toISOString());
  assert.ok(futureOccurrence.timestamp <= NOW.getTime());
  const futureWrongVisible = buildActiveCalculatorRoutineReviewCandidates([futureWrongEvent], NOW);
  assert.equal(futureWrongVisible.length, 1);
  assert.equal(futureWrongVisible[0].createdAt, NOW.toISOString());

  const oldWrong = eventFromBridge(wrongBridge, "2026-06-22T12:00:00.000Z", "2026-06-22T10:00:00.000Z");
  const delayedClean = eventFromBridge(cleanBridge, "2026-06-22T12:00:00.000Z", "2026-06-22T09:00:00.000Z");
  const delayedCleanDoesNotCloseNewerWrong = buildActiveCalculatorRoutineReviewCandidates([delayedClean, oldWrong], new Date("2026-06-22T12:00:00.000Z"));
  assert.equal(delayedCleanDoesNotCloseNewerWrong.length, 1);

  const laterClean = eventFromBridge(cleanBridge, "2026-06-22T12:00:00.000Z", "2026-06-22T11:00:00.000Z");
  const laterCleanClosesEarlierWrong = buildActiveCalculatorRoutineReviewCandidates([oldWrong, laterClean], new Date("2026-06-22T12:00:00.000Z"));
  assert.equal(laterCleanClosesEarlierWrong.length, 0);
});

test("Today Plan surfaces the dedicated calculator routine task without exceeding max three", () => {
  const bridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "problem-snap-today", mistakeTypes: ["display_reading"] }));
  const tasks = buildTodayPlanTasks({
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [eventFromBridge(bridge)],
    now: NOW,
  });

  assert.ok(tasks.length <= TODAY_PLAN_MAX_PRIMARY_TASKS);
  assert.equal(tasks[0].task_type, "calculator_routine");
  assert.equal(tasks[0].title, "감정평가실무 계산·검산 복구");
  assert.equal(tasks[0].primary_cta.label, "계산·검산 다시 하기");
  assert.equal(tasks[0].primary_cta.hrefKind, "calculator_template");
  assert.equal(tasks[0].source_label, "계산·검산 루틴 기반");
  assert.equal(tasks[0].estimated_minutes, 10);
  assert.deepEqual(tasks[0].calculator_routine_recovery, {
    metadataOnly: true,
    routineId: "problem-snap-today",
    source: "problem-snap",
  });
  assert.equal(
    buildCalculatorRoutineRecoveryHref(tasks[0].calculator_routine_recovery),
    "/app/calculator?mode=second&context=practice&focus=casio&recoveryRoutineId=problem-snap-today&recoverySource=problem-snap",
  );

  const secondBridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "problem-snap-today-second", mistakeTypes: ["rounding"] }));
  const cappedTasks = buildTodayPlanTasks({
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [eventFromBridge(bridge), eventFromBridge(secondBridge)],
    now: NOW,
  });
  assert.equal(cappedTasks.filter((task) => task.task_type === "calculator_routine").length, 1);
  assert.ok(cappedTasks.length <= TODAY_PLAN_MAX_PRIMARY_TASKS);
});

test("Today Plan durable integration preserves calculator routine recovery references", async () => {
  const bridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "problem-snap-durable-today", mistakeTypes: ["display_reading"] }));
  const tasks = await buildLearnerTodayPlanTasksWithGatedDurableConceptGraph({
    userId: USER_ID,
    mode: "second",
    queue: [],
    items: [],
    learningSignals: [eventFromBridge(bridge)],
    now: NOW,
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
      PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT: "1",
    },
    durableReadHelper: async () => ({
      ok: true,
      skipped: false,
      repositoryMode: "supabase",
      actions: [],
      metadataOnly: true,
    }),
  });

  assert.equal(tasks[0].task_type, "calculator_routine");
  assert.deepEqual(tasks[0].calculator_routine_recovery, {
    metadataOnly: true,
    routineId: "problem-snap-durable-today",
    source: "problem-snap",
  });
});

test("UI integration uses the existing onComplete path and the single completion route", () => {
  const problemSnap = readFileSync("app/problem-snap/problem-snap-client.tsx", "utf8");
  const answerReview = readFileSync("app/answer-review/answer-review-client.tsx", "utf8");
  const sync = readFileSync("components/review-os/calculator-routine-sync-status.tsx", "utf8");
  const route = readFileSync("app/api/os/calculator-routine/complete/route.ts", "utf8");
  const calculatorRoute = readFileSync("app/app/calculator/page.tsx", "utf8");
  const workflowPage = readFileSync("components/review-os/calculator-workflow-page.tsx", "utf8");

  assert.ok(problemSnap.includes("onComplete={calculatorRoutineSync.syncCompletion}"));
  assert.ok(answerReview.includes("onComplete={calculatorRoutineSync.syncCompletion}"));
  assert.ok(sync.includes('fetch("/api/os/calculator-routine/complete"'));
  assert.ok(sync.includes('response.status === 401'));
  assert.ok(route.includes("completeCalculatorRoutine"));
  assert.ok(calculatorRoute.includes("recoveryRoutineId"));
  assert.ok(calculatorRoute.includes("recoverySource"));
  assert.ok(calculatorRoute.includes("parseCalculatorRoutineRecoveryReference"));
  assert.ok(workflowPage.includes("data-calculator-routine-recovery-section"));
  assert.ok(workflowPage.includes("routineId={recoveryReference.routineId}"));
  assert.ok(workflowPage.includes("source={recoveryReference.source}"));
  assert.ok(workflowPage.includes("onComplete={calculatorRoutineSync.syncCompletion}"));
  assert.ok(workflowPage.includes("CalculatorRoutineSyncStatusLine"));
  assert.ok(workflowPage.includes("{!isRecoveryMode ? ("));
  assert.ok(workflowPage.includes("<ExecutionResultControls"));
  assert.equal(problemSnap.includes("learning_signal_events"), false);
  assert.equal(answerReview.includes("learning_signal_events"), false);
});

test("review page exposes calculator candidates separately from review queue completion", () => {
  const reviewPage = readFileSync("app/app/review/page.tsx", "utf8");
  const reviewCandidates = readFileSync("components/review-os/calculator-routine-review-candidates.tsx", "utf8");
  const appPage = readFileSync("app/app/page.tsx", "utf8");

  assert.ok(reviewPage.includes("listCalculatorRoutineReviewCandidates"));
  assert.ok(reviewPage.includes("CalculatorRoutineReviewCandidates"));
  assert.ok(reviewCandidates.includes("data-calculator-routine-review-candidates"));
  assert.ok(reviewCandidates.includes("계산·검산 복습"));
  assert.ok(reviewCandidates.includes("buildCalculatorRoutineRecoveryHref(candidate.recoveryReference)"));
  assert.equal(reviewCandidates.includes('href="/app/calculator?mode=second&context=practice&focus=casio"'), false);
  assert.ok(appPage.includes("buildCalculatorRoutineRecoveryHref(task.calculator_routine_recovery)"));
  assert.ok(appPage.includes("const resolveTaskHref = (task:"));
  assert.ok(appPage.includes("<Link href={resolveTaskHref(task)}"));
  assert.equal(reviewCandidates.includes("/api/os/review-queue"), false);
});
