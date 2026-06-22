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
  buildCalculatorRoutineLearningEventId,
  getCalculatorRoutineCompletionOutcome,
  parseCalculatorRoutineCompletionSignalForServer,
} from "../lib/review-os/calculator-routine-learning-signal.ts";
import { buildTodayPlanTasks, TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";

const USER_ID = "00000000-0000-4000-8000-000000000416";
const NOW = new Date("2026-06-22T09:00:00.000Z");

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
  routineId = "routine-bridge-1",
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

function eventFromBridge(bridge, createdAt = "2026-06-22T08:31:00.000Z") {
  return {
    ...bridge.learningEventInput,
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

test("completion mapping follows mistake over stuck over clean precedence", () => {
  const clean = signalFromDraft({ routineId: "routine-clean", mistakeTypes: ["none"] });
  const stuck = signalFromDraft({
    routineId: "routine-stuck",
    mistakeTypes: ["none"],
    stuckStepIds: ["casio_input"],
    blankStepId: "casio_input",
  });
  const mistakenAndStuck = signalFromDraft({
    routineId: "routine-wrong",
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
    routineId: "routine-verification",
    mistakeTypes: ["verification_skipped"],
  });
  const unitSignal = signalFromDraft({
    routineId: "routine-unit",
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

test("learning signal event id is deterministic for user and routine id", () => {
  assert.equal(
    buildCalculatorRoutineLearningEventId(USER_ID, "routine-bridge-1"),
    buildCalculatorRoutineLearningEventId(USER_ID, "routine-bridge-1"),
  );
  assert.notEqual(
    buildCalculatorRoutineLearningEventId(USER_ID, "routine-bridge-1"),
    buildCalculatorRoutineLearningEventId(USER_ID, "routine-bridge-2"),
  );
});

test("active calculator routine review candidates are metadata-only and clean completion closes older recovery", () => {
  const wrongBridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "routine-candidate", mistakeTypes: ["casio_input"] }));
  const cleanBridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "routine-cleaner", mistakeTypes: ["none"] }));

  const staleCandidates = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(wrongBridge, "2026-06-22T08:10:00.000Z"),
    eventFromBridge(cleanBridge, "2026-06-22T08:20:00.000Z"),
  ], NOW);
  assert.equal(staleCandidates.length, 0);

  const freshCandidates = buildActiveCalculatorRoutineReviewCandidates([
    eventFromBridge(cleanBridge, "2026-06-22T08:10:00.000Z"),
    eventFromBridge(wrongBridge, "2026-06-22T08:20:00.000Z"),
  ], NOW);
  assert.equal(freshCandidates.length, 1);
  assert.equal(freshCandidates[0].metadataOnly, true);
  assert.equal(freshCandidates[0].sourceLabel, "계산·검산 루틴 기반");
  assert.equal(freshCandidates[0].nextAction, "계산·검산 다시 하기");
  assert.equal(JSON.stringify(freshCandidates[0]).includes("answerText"), false);
});

test("Today Plan surfaces the dedicated calculator routine task without exceeding max three", () => {
  const bridge = buildCalculatorRoutineBridge(USER_ID, signalFromDraft({ routineId: "routine-today", mistakeTypes: ["display_reading"] }));
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
});

test("UI integration uses the existing onComplete path and the single completion route", () => {
  const problemSnap = readFileSync("app/problem-snap/problem-snap-client.tsx", "utf8");
  const answerReview = readFileSync("app/answer-review/answer-review-client.tsx", "utf8");
  const sync = readFileSync("components/review-os/calculator-routine-sync-status.tsx", "utf8");
  const route = readFileSync("app/api/os/calculator-routine/complete/route.ts", "utf8");

  assert.ok(problemSnap.includes("onComplete={calculatorRoutineSync.syncCompletion}"));
  assert.ok(answerReview.includes("onComplete={calculatorRoutineSync.syncCompletion}"));
  assert.ok(sync.includes('fetch("/api/os/calculator-routine/complete"'));
  assert.ok(sync.includes('response.status === 401'));
  assert.ok(route.includes("completeCalculatorRoutine"));
  assert.equal(problemSnap.includes("learning_signal_events"), false);
  assert.equal(answerReview.includes("learning_signal_events"), false);
});

test("review page exposes calculator candidates separately from review queue completion", () => {
  const reviewPage = readFileSync("app/app/review/page.tsx", "utf8");
  const reviewCandidates = readFileSync("components/review-os/calculator-routine-review-candidates.tsx", "utf8");

  assert.ok(reviewPage.includes("listCalculatorRoutineReviewCandidates"));
  assert.ok(reviewPage.includes("CalculatorRoutineReviewCandidates"));
  assert.ok(reviewCandidates.includes("data-calculator-routine-review-candidates"));
  assert.ok(reviewCandidates.includes("계산·검산 복습 후보"));
  assert.ok(reviewCandidates.includes("/app/calculator?mode=second&context=practice&focus=casio"));
  assert.equal(reviewCandidates.includes("/api/os/review-queue"), false);
});
