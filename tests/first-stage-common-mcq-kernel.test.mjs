import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CHOICE_IDS,
  CONFIDENCE_VALUES,
  ERROR_CAUSES,
  FIRST_STAGE_SUBJECT_IDS,
  FirstStageKernelError,
  beginAttempt,
  beginIndependentRetry,
  buildTodayQueue,
  createExamCycleState,
  parseAnswerSubmission,
  parseJsonRejectingDuplicateKeys,
  presentAttemptQuestion,
  submitAnswer,
} from "../lib/review-os/first-stage/kernel/index.ts";
import {
  SUBJECT_ADAPTER_SCHEMA_VERSION,
  SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR,
  SUBJECT_ADAPTER_V1_INTERFACE_DIGEST,
  createSubjectAdapterRegistry,
} from "../lib/review-os/first-stage/subject-adapter/index.ts";

const root = path.resolve(import.meta.dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(
  root,
  "config/dabangil-first-stage-common-mcq-kernel-v1.json",
), "utf8"));

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function reference(questionId = "acct-q1", questionVersion = "v1", subjectId = "accounting") {
  return {
    schemaVersion: "first_stage.question_reference.v1",
    questionId,
    questionVersion,
    subjectId,
    examYear: 2026,
    examRound: 37,
    sessionId: "first-2026-session-2",
    questionNumber: questionId.includes("q2") ? 2 : 1,
    choiceCount: 5,
    sourceVersionManifestIds: ["source-manifest-2026-v1"],
    rightsState: "verified_owner_private",
    currentnessState: "verified_exam_date",
  };
}

function conceptIdFor(questionId) {
  if (questionId.includes("q2")) return "accounting-concept-q2";
  return "accounting-concept-q1";
}

function conceptKeys(bindings) {
  return bindings.map((binding) =>
    `${binding.subjectId}:${binding.conceptId}@${binding.conceptVersion}:${binding.role}`);
}

function evidenceReference(evidenceId, character = "a") {
  return {
    schemaVersion: "first_stage.immutable_evidence_reference.v1",
    evidenceId,
    evidenceVersion: "v1",
    evidenceSha256: character.repeat(64),
  };
}

function makeAdapter(options = {}) {
  return {
    schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    adapterId: options.adapterId ?? "test-accounting-adapter",
    adapterVersion: "v1",
    subjectId: "accounting",
    assertQuestionReference(value) {
      if (value.subjectId !== "accounting" || !value.questionId.startsWith("acct-")) {
        throw new FirstStageKernelError("adapter_mismatch");
      }
    },
    presentQuestion(value) {
      return {
        schemaVersion: "first_stage.mcq_question_presentation.v1",
        questionReference: value,
        stem: "Owner-private synthetic accounting question.",
        choices: [1, 2, 3, 4, 5].map((choiceId) => ({
          choiceId,
          body: `Synthetic choice ${choiceId}`,
        })),
        sourceStatusLabel: value.rightsState,
        currentnessStatusLabel: value.currentnessState,
        learningReferenceDisclaimer: true,
      };
    },
    evaluateSubmission(input) {
      const selected = input.submission.selectedChoice;
      const forcedDecision = options.forceDecision?.(input);
      const decision = forcedDecision ?? (selected === null
        ? "unanswered"
        : selected === 2 ? "correct" : "incorrect");
      const retryConcept = options.crossConceptOnRetry &&
        input.attempt.kind === "independent_retry";
      const conceptId = retryConcept
        ? "accounting-unrelated-concept"
        : conceptIdFor(input.questionReference.questionId);
      const unreviewed = decision === "unavailable" || decision === "withheld";
      const evidenceEnvelope = {
        schemaVersion: "first_stage.attempt_evidence_envelope.v1",
        attemptId: input.attempt.attemptId,
        submissionSha256: input.submissionSha256,
        questionId: input.questionReference.questionId,
        questionVersion: input.questionReference.questionVersion,
        subjectId: input.questionReference.subjectId,
        adapterId: this.adapterId,
        adapterVersion: this.adapterVersion,
        officialKeyReference: unreviewed ? null : evidenceReference("official-key-receipt", "1"),
        choiceSetReference: unreviewed ? null : evidenceReference("choice-set-receipt", "2"),
        sourceReference: evidenceReference("source-receipt", "3"),
        versionDecisionReference: evidenceReference("version-decision-receipt", "4"),
        rightsDecisionReference: evidenceReference("rights-decision-receipt", "5"),
        reviewedFeedback: {
          schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
          state: decision === "unavailable"
            ? "not_emitted_unavailable"
            : decision === "withheld" ? "withheld_rights_or_version" : "reviewed_available",
          receiptReference: unreviewed ? null : evidenceReference("reviewed-feedback-receipt", "6"),
          reviewerIdentity: unreviewed ? null : "owner-approved-reviewer-1",
          reviewerClass: unreviewed ? null : "owner_approved_personal_feedback_reviewer",
          modelAlone: false,
        },
      };
      options.mutateEvidence?.(evidenceEnvelope, input);
      const evaluation = {
        schemaVersion: "first_stage.attempt_evaluation.v1",
        decision,
        errorCause: decision === "incorrect" ? "C" : null,
        conceptBindings: unreviewed ? null : [{
          schemaVersion: "first_stage.concept_binding.v1",
          conceptId,
          conceptVersion: "v1",
          subjectId: "accounting",
          role: "primary",
        }],
        biggestGapCode: unreviewed ? null : decision === "correct" ? "confirm_later" : "concept_gap",
        nextActionCode: unreviewed ? null : decision === "correct"
          ? "independent_retry_later" : "review_then_retry",
        retryDisposition: unreviewed ? null : decision === "incorrect"
          ? "retry_now" : "review_then_retry",
        reviewAfterMs: unreviewed ? null : decision === "incorrect" ? 0 : 60_000,
        evaluationPolicyVersion: "test-accounting-evaluation-v1",
        evidenceEnvelope,
      };
      options.mutateEvaluation?.(evaluation, input);
      return evaluation;
    },
    buildIndependentRetry(input) {
      const number = input.priorRetries.length + 1;
      const candidateReference = options.reuseCycleQuestion
        ? reference("acct-q2", "v1")
        : reference(`${input.sourceQuestionReference.questionId}-retry-${number}`, "v1");
      const lineageReceipt = {
          schemaVersion: "first_stage.independent_retry_lineage_receipt.v1",
          receiptId: `retry-lineage-${input.sourceQuestionReference.questionId}-${number}`,
          receiptVersion: "v1",
          adapterId: this.adapterId,
          adapterVersion: this.adapterVersion,
          subjectId: this.subjectId,
          sourceQuestionId: input.sourceQuestionReference.questionId,
          sourceQuestionVersion: input.sourceQuestionReference.questionVersion,
          variantQuestionId: candidateReference.questionId,
          variantQuestionVersion: candidateReference.questionVersion,
          targetConceptBindingKeys: conceptKeys(input.reviewTask.conceptBindings),
          priorRetryCount: input.priorRetries.length,
          decision: "verified_variant_for_independent_retry",
      };
      options.mutateLineage?.(lineageReceipt, input);
      return {
        schemaVersion: "first_stage.independent_retry_candidate.v1",
        questionReference: candidateReference,
        lineageReceipt,
      };
    },
  };
}

function draft(choice, options = {}) {
  const eliminatedChoiceIds = options.eliminatedChoiceIds ?? [];
  const steps = [{ sequence: 1, kind: "read_stem", atElapsedMs: 0, choiceId: null }];
  for (const eliminated of eliminatedChoiceIds) {
    steps.push({
      sequence: steps.length + 1,
      kind: "eliminate_choice",
      atElapsedMs: Math.min(options.traceElapsedMs ?? 1_000, steps.length * 100),
      choiceId: eliminated,
    });
  }
  if (options.answerChanged) {
    steps.push({
      sequence: steps.length + 1,
      kind: "select_answer",
      atElapsedMs: Math.min(options.traceElapsedMs ?? 1_000, 500),
      choiceId: options.previousChoice,
    });
    steps.push({
      sequence: steps.length + 1,
      kind: "change_answer",
      atElapsedMs: options.traceElapsedMs ?? 1_000,
      choiceId: choice,
    });
  } else if (choice !== null) {
    steps.push({
      sequence: steps.length + 1,
      kind: "select_answer",
      atElapsedMs: options.traceElapsedMs ?? 1_000,
      choiceId: choice,
    });
  }
  return {
    schemaVersion: "first_stage.answer_submission.v1",
    selectedChoice: choice,
    confidence: options.confidence ?? "medium",
    answerChanged: options.answerChanged ?? false,
    previousChoice: options.previousChoice ?? null,
    eliminatedChoiceIds,
    workTrace: { schemaVersion: "first_stage.work_trace.v1", steps },
  };
}

function initialState() {
  return createExamCycleState({
    examCycleId: "cycle-owner-today-1",
    ownerId: "owner-private-1",
    mode: "today",
    questionReferences: [reference("acct-q1"), reference("acct-q2")],
  });
}

function expectKernelCode(fn, code) {
  assert.throws(fn, (error) => error instanceof FirstStageKernelError && error.code === code);
}

test("freezes one exact SubjectAdapter descriptor and Lane B path manifest", () => {
  function assertDeepFrozen(value) {
    if (value === null || typeof value !== "object") return;
    assert.equal(Object.isFrozen(value), true);
    for (const nested of Object.values(value)) assertDeepFrozen(nested);
  }
  const digestBeforeMutationAttempts = digest(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
  assertDeepFrozen(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
  for (const vocabulary of [
    FIRST_STAGE_SUBJECT_IDS,
    CHOICE_IDS,
    CONFIDENCE_VALUES,
    ERROR_CAUSES,
  ]) assertDeepFrozen(vocabulary);
  assert.throws(() => {
    SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR.methods[0].name = "mutated";
  }, TypeError);
  assert.throws(() => {
    SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR.invariants.push("mutated");
  }, TypeError);
  assert.throws(() => { FIRST_STAGE_SUBJECT_IDS[0] = "mutated"; }, TypeError);
  assert.throws(() => { CHOICE_IDS.push(6); }, TypeError);
  assert.equal(digest(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR), digestBeforeMutationAttempts);
  assert.deepEqual(contract.subjectAdapterFreeze.interfaceDescriptor, SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR);
  assert.equal(digest(SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR), SUBJECT_ADAPTER_V1_INTERFACE_DIGEST);
  assert.equal(contract.subjectAdapterFreeze.interfaceDigest, SUBJECT_ADAPTER_V1_INTERFACE_DIGEST);
  assert.equal(contract.subjectAdapterFreeze.productionAdapterImplementationsIncluded, 0);
  assert.deepEqual(contract.ownedPathManifest, [
    "app/api/review-os/first-stage/kernel/route.ts",
    "app/app/first-stage/page.tsx",
    "components/review-os/first-stage-mcq-loop.tsx",
    "config/dabangil-first-stage-common-mcq-kernel-v1.json",
    "lib/review-os/first-stage/kernel/domain.ts",
    "lib/review-os/first-stage/kernel/index.ts",
    "lib/review-os/first-stage/kernel/mcq-kernel.ts",
    "lib/review-os/first-stage/kernel/today-queue.ts",
    "lib/review-os/first-stage/subject-adapter/index.ts",
    "lib/review-os/first-stage/subject-adapter/subject-adapter.ts",
    "tests/first-stage-common-mcq-kernel.test.mjs",
    "tests/s232f2-access-availability.test.mjs",
  ]);
});

test("derives elapsed time from trusted server instants and rejects client clock authority", () => {
  const parsed = parseAnswerSubmission(draft(2, { traceElapsedMs: 1_000 }), {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:01:00.000Z",
  });
  assert.deepEqual(parsed.elapsedTime, { milliseconds: 60_000, bucket: "60000_119999" });
  assert.equal(parsed.submittedAt, "2026-08-25T00:01:00.000Z");
  expectKernelCode(() => parseAnswerSubmission({
    ...draft(2),
    elapsedTime: { milliseconds: 1, bucket: "0_29999" },
  }, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T01:00:00.000Z",
  }), "invalid_input");
  expectKernelCode(() => parseAnswerSubmission(draft(2), {
    attemptStartedAt: "2026-02-31T00:00:00.000Z",
    submittedAt: "2026-03-01T00:00:00.000Z",
  }), "invalid_input");
});

test("rejects duplicate JSON keys and empty or contradictory WorkTrace progression", () => {
  expectKernelCode(() => parseJsonRejectingDuplicateKeys('{"action":"today_queue","action":"other"}'), "invalid_input");
  expectKernelCode(() => parseAnswerSubmission({
    ...draft(2),
    workTrace: { schemaVersion: "first_stage.work_trace.v1", steps: [] },
  }, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:00:02.000Z",
  }), "invalid_input");
  const changed = draft(3, { answerChanged: true, previousChoice: 1, traceElapsedMs: 1_000 });
  changed.previousChoice = 2;
  expectKernelCode(() => parseAnswerSubmission(changed, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:00:02.000Z",
  }), "invalid_input");
  expectKernelCode(() => parseAnswerSubmission({
    ...draft(2),
    eliminatedChoiceIds: [1],
  }, {
    attemptStartedAt: "2026-08-25T00:00:00.000Z",
    submittedAt: "2026-08-25T00:00:02.000Z",
  }), "invalid_input");
});

test("runs initial attempt, due review, independent retry, concept state, and Today Queue", () => {
  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  let state = initialState();
  assert.deepEqual(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:00.000Z",
  }).items.map((item) => item.kind), ["new_question", "new_question"]);

  state = beginAttempt(state, {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, registry);
  assert.equal(presentAttemptQuestion(state, "attempt-q1-initial", registry).choices.length, 5);
  assert.deepEqual(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:01.000Z",
  }).items.map((item) => item.kind), ["active_attempt", "new_question"]);

  state = submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:10.000Z",
    submission: draft(1),
  }, registry);
  assert.equal(state.attempts[0].reviewTaskId, "review-q1-initial");
  assert.equal(state.attempts[0].evaluation.evidenceEnvelope.adapterVersion, "v1");
  assert.match(state.attempts[0].evaluation.evidenceEnvelope.submissionSha256, /^[0-9a-f]{64}$/u);
  assert.equal(
    state.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.reviewerClass,
    "owner_approved_personal_feedback_reviewer",
  );
  assert.equal(state.reviewTasks[0].status, "pending");
  assert.equal(state.conceptStates[0].state, "independent_retry_due");
  assert.deepEqual(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:10.000Z",
  }).items.map((item) => item.kind), ["independent_retry", "new_question"]);

  state = beginIndependentRetry(state, {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:10.000Z",
  }, registry);
  assert.equal(state.independentRetries[0].lineageReceipt.adapterVersion, "v1");
  assert.deepEqual(
    state.independentRetries[0].lineageReceipt.targetConceptBindingKeys,
    ["accounting:accounting-concept-q1@v1:primary"],
  );
  state = submitAnswer(state, {
    expectedRevision: 4,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:25.000Z",
    submission: draft(2),
  }, registry);
  assert.equal(state.reviewTasks[0].status, "completed");
  assert.equal(state.independentRetries[0].outcome, "succeeded");
  assert.equal(state.conceptStates[0].state, "independent_retry_recorded");
  assert.equal(state.conceptStates[0].masteryClaim, false);

  state = beginAttempt(state, {
    expectedRevision: 5,
    attemptId: "attempt-q2-initial",
    questionId: "acct-q2",
    trustedStartedAt: "2026-08-25T00:00:25.000Z",
  }, registry);
  state = submitAnswer(state, {
    expectedRevision: 6,
    attemptId: "attempt-q2-initial",
    reviewTaskId: "review-q2-initial",
    trustedSubmittedAt: "2026-08-25T00:00:35.000Z",
    submission: draft(2),
  }, registry);
  assert.equal(state.examCycle.state, "completed");
  const beforeDue = buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:00:35.000Z",
  });
  assert.equal(beforeDue.items.length, 0);
  assert.equal(beforeDue.notYetDueReviewCount, 1);
  assert.equal(buildTodayQueue(state, {
    trustedGeneratedAt: "2026-08-25T00:01:35.000Z",
  }).items[0].reviewTaskId, "review-q2-initial");
});

test("fails closed on adapter absence, malformed registration, ambiguity, stale state, and chronology", () => {
  const empty = createSubjectAdapterRegistry();
  expectKernelCode(() => beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, empty), "adapter_unavailable");
  expectKernelCode(() => createSubjectAdapterRegistry([{
    schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    adapterId: "bad-adapter",
    adapterVersion: "v1",
    subjectId: "accounting",
  }]), "adapter_mismatch");
  const extraAdapter = makeAdapter({ adapterId: "extra-adapter" });
  extraAdapter.mutableBehavior = {};
  expectKernelCode(() => createSubjectAdapterRegistry([extraAdapter]), "adapter_mismatch");
  const mutableAdapter = makeAdapter({ adapterId: "snapshot-adapter" });
  const snapshotRegistry = createSubjectAdapterRegistry([mutableAdapter]);
  assert.equal(Object.isFrozen(mutableAdapter), true);
  assert.equal(Object.isFrozen(snapshotRegistry.require("accounting")), true);
  assert.throws(() => { mutableAdapter.adapterVersion = "v2"; }, TypeError);
  expectKernelCode(() => createExamCycleState({
    examCycleId: "ambiguous-cycle",
    ownerId: "owner-private-1",
    mode: "today",
    questionReferences: [reference("acct-q1", "v1"), reference("acct-q1", "v2")],
  }), "invalid_input");
  expectKernelCode(() => createExamCycleState({
    examCycleId: "extra-cycle",
    ownerId: "owner-private-1",
    mode: "today",
    questionReferences: [reference("acct-q1")],
    extra: true,
  }), "invalid_input");

  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  let state = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:10.000Z",
  }, registry);
  expectKernelCode(() => beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-extra",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
    extra: true,
  }, registry), "invalid_input");
  expectKernelCode(() => buildTodayQueue(initialState(), {
    trustedGeneratedAt: "2026-08-25T00:00:00.000Z",
    extra: true,
  }), "invalid_input");
  expectKernelCode(() => submitAnswer(state, {
    expectedRevision: 1,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:11.000Z",
    submission: draft(1),
  }, registry), "stale_state");
  expectKernelCode(() => submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:09.000Z",
    submission: draft(1),
  }, registry), "invalid_transition");
  expectKernelCode(() => submitAnswer(state, {
    expectedRevision: 2,
    attemptId: "attempt-q1-initial",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:11.000Z",
    submission: draft(1),
    extra: true,
  }, registry), "invalid_input");
});

test("rejects blank-as-correct, cycle-reused retry, cross-concept closure, and duplicate persisted lineage", () => {
  const blankCorrectRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "correct",
  })]);
  let blankState = beginAttempt(initialState(), {
    expectedRevision: 1,
    attemptId: "attempt-blank",
    questionId: "acct-q1",
    trustedStartedAt: "2026-08-25T00:00:00.000Z",
  }, blankCorrectRegistry);
  expectKernelCode(() => submitAnswer(blankState, {
    expectedRevision: 2,
    attemptId: "attempt-blank",
    reviewTaskId: "review-blank",
    trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
    submission: draft(null),
  }, blankCorrectRegistry), "adapter_mismatch");

  function dueState(registry) {
    let state = beginAttempt(initialState(), {
      expectedRevision: 1,
      attemptId: "attempt-q1-initial",
      questionId: "acct-q1",
      trustedStartedAt: "2026-08-25T00:00:00.000Z",
    }, registry);
    return submitAnswer(state, {
      expectedRevision: 2,
      attemptId: "attempt-q1-initial",
      reviewTaskId: "review-q1-initial",
      trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
      submission: draft(1),
    }, registry);
  }

  const reuseRegistry = createSubjectAdapterRegistry([makeAdapter({ reuseCycleQuestion: true })]);
  expectKernelCode(() => beginIndependentRetry(dueState(reuseRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, reuseRegistry), "adapter_mismatch");

  const collidingReceiptRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateLineage: (receipt) => { receipt.receiptId = "cycle-owner-today-1"; },
  })]);
  expectKernelCode(() => beginIndependentRetry(dueState(collidingReceiptRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, collidingReceiptRegistry), "invalid_input");

  const crossRegistry = createSubjectAdapterRegistry([makeAdapter({ crossConceptOnRetry: true })]);
  let crossState = beginIndependentRetry(dueState(crossRegistry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, crossRegistry);
  expectKernelCode(() => submitAnswer(crossState, {
    expectedRevision: 4,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, crossRegistry), "adapter_mismatch");

  const registry = createSubjectAdapterRegistry([makeAdapter()]);
  const persisted = beginIndependentRetry(dueState(registry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-q1-1",
    retryAttemptId: "attempt-q1-retry-1",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
  }, registry);
  expectKernelCode(() => beginIndependentRetry(dueState(registry), {
    expectedRevision: 3,
    reviewTaskId: "review-q1-initial",
    independentRetryId: "independent-retry-extra",
    retryAttemptId: "attempt-retry-extra",
    trustedStartedAt: "2026-08-25T00:00:02.000Z",
    extra: true,
  }, registry), "invalid_input");
  const clone = structuredClone(persisted);
  clone.independentRetries.push({
    ...structuredClone(clone.independentRetries[0]),
    independentRetryId: "independent-retry-duplicate",
    retryAttemptId: "attempt-retry-duplicate",
  });
  expectKernelCode(() => submitAnswer(clone, {
    expectedRevision: clone.revision,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, registry), "invalid_input");
  const extraReceipt = structuredClone(persisted);
  extraReceipt.independentRetries[0].lineageReceipt.extra = true;
  expectKernelCode(() => submitAnswer(extraReceipt, {
    expectedRevision: extraReceipt.revision,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, registry), "invalid_input");
  const collidingReload = structuredClone(persisted);
  collidingReload.independentRetries[0].lineageReceipt.receiptId = "review-q1-initial";
  expectKernelCode(() => submitAnswer(collidingReload, {
    expectedRevision: collidingReload.revision,
    attemptId: "attempt-q1-retry-1",
    reviewTaskId: "review-q1-initial",
    trustedSubmittedAt: "2026-08-25T00:00:04.000Z",
    submission: draft(2),
  }, registry), "invalid_input");
});

test("binds reviewed feedback/key/source evidence and withholds without emitting review authority", () => {
  function started(registry, suffix) {
    return beginAttempt(initialState(), {
      expectedRevision: 1,
      attemptId: `attempt-evidence-${suffix}`,
      questionId: "acct-q1",
      trustedStartedAt: "2026-08-25T00:00:00.000Z",
    }, registry);
  }
  function submit(state, registry, suffix) {
    return submitAnswer(state, {
      expectedRevision: 2,
      attemptId: `attempt-evidence-${suffix}`,
      reviewTaskId: `review-evidence-${suffix}`,
      trustedSubmittedAt: "2026-08-25T00:00:02.000Z",
      submission: draft(1),
    }, registry);
  }

  const wrongDigestRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateEvidence: (envelope) => { envelope.submissionSha256 = "0".repeat(64); },
  })]);
  expectKernelCode(() => submit(started(wrongDigestRegistry, "digest"),
    wrongDigestRegistry, "digest"), "adapter_mismatch");

  const missingKeyRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateEvidence: (envelope) => { envelope.officialKeyReference = null; },
  })]);
  expectKernelCode(() => submit(started(missingKeyRegistry, "key"),
    missingKeyRegistry, "key"), "adapter_mismatch");

  const modelRegistry = createSubjectAdapterRegistry([makeAdapter({
    mutateEvidence: (envelope) => { envelope.reviewedFeedback.modelAlone = true; },
  })]);
  expectKernelCode(() => submit(started(modelRegistry, "model"),
    modelRegistry, "model"), "adapter_mismatch");

  const illegalWithheldRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "withheld",
    mutateEvidence: (envelope) => {
      envelope.reviewedFeedback = {
        schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
        state: "reviewed_available",
        receiptReference: evidenceReference("illegal-reviewed-feedback", "7"),
        reviewerIdentity: "owner-approved-reviewer-1",
        reviewerClass: "owner_approved_personal_feedback_reviewer",
        modelAlone: false,
      };
    },
  })]);
  expectKernelCode(() => submit(started(illegalWithheldRegistry, "illegal-withheld"),
    illegalWithheldRegistry, "illegal-withheld"), "adapter_mismatch");

  const leakedWithheldRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "withheld",
    mutateEvaluation: (value) => {
      value.conceptBindings = [{
        schemaVersion: "first_stage.concept_binding.v1",
        conceptId: "leaked-reviewed-concept",
        conceptVersion: "v1",
        subjectId: "accounting",
        role: "primary",
      }];
    },
  })]);
  expectKernelCode(() => submit(started(leakedWithheldRegistry, "leaked-withheld"),
    leakedWithheldRegistry, "leaked-withheld"), "adapter_mismatch");

  const withheldRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "withheld",
  })]);
  const withheld = submit(started(withheldRegistry, "withheld"),
    withheldRegistry, "withheld");
  const evaluation = withheld.attempts[0].evaluation;
  assert.equal(evaluation.decision, "withheld");
  assert.equal(evaluation.evidenceEnvelope.officialKeyReference, null);
  assert.deepEqual(evaluation.evidenceEnvelope.reviewedFeedback, {
    schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
    state: "withheld_rights_or_version",
    receiptReference: null,
    reviewerIdentity: null,
    reviewerClass: null,
    modelAlone: false,
  });
  assert.equal(evaluation.errorCause, null);
  assert.equal(evaluation.conceptBindings, null);
  assert.equal(evaluation.biggestGapCode, null);
  assert.equal(evaluation.nextActionCode, null);
  assert.equal(evaluation.retryDisposition, null);
  assert.equal(evaluation.reviewAfterMs, null);
  assert.equal(withheld.attempts[0].reviewTaskId, null);
  assert.deepEqual(withheld.reviewTasks, []);
  assert.deepEqual(withheld.conceptStates, []);
  assert.deepEqual(withheld.independentRetries, []);
  assert.deepEqual(buildTodayQueue(withheld, {
    trustedGeneratedAt: "2026-08-25T00:00:02.000Z",
  }).items.map((item) => item.kind), ["new_question"]);

  const unavailableRegistry = createSubjectAdapterRegistry([makeAdapter({
    forceDecision: () => "unavailable",
  })]);
  const unavailable = submit(started(unavailableRegistry, "unavailable"),
    unavailableRegistry, "unavailable");
  assert.equal(unavailable.attempts[0].evaluation.decision, "unavailable");
  assert.equal(unavailable.attempts[0].evaluation.conceptBindings, null);
  assert.equal(
    unavailable.attempts[0].evaluation.evidenceEnvelope.reviewedFeedback.state,
    "not_emitted_unavailable",
  );
  assert.deepEqual(unavailable.reviewTasks, []);
  assert.deepEqual(unavailable.conceptStates, []);
  assert.deepEqual(unavailable.independentRetries, []);
});

test("keeps API/UI Owner-only, default-off, no-store, adapter-empty, and non-activating", () => {
  const route = fs.readFileSync(path.join(root,
    "app/api/review-os/first-stage/kernel/route.ts"), "utf8");
  const page = fs.readFileSync(path.join(root, "app/app/first-stage/page.tsx"), "utf8");
  const component = fs.readFileSync(path.join(root,
    "components/review-os/first-stage-mcq-loop.tsx"), "utf8");
  for (const source of [route, page]) {
    assert.match(source, /INVERGE_OWNER_FIRST_STAGE|FIRST_STAGE_FEATURE_FLAG/u);
    assert.match(source, /ALPHA_ADMIN_EMAILS/u);
    assert.match(source, /notFound|not_found/u);
  }
  assert.match(route, /private, no-store/u);
  assert.match(route, /createSubjectAdapterRegistry\(\)/u);
  assert.match(route, /first_stage\.kernel_availability\.v1/u);
  assert.match(route, /first_stage\.today_queue_availability\.v1/u);
  assert.match(route, /mediaType !== "application\/json"/u);
  assert.match(route, /new TextEncoder\(\)\.encode\(rawBody\)\.byteLength/u);
  assert.doesNotMatch(route, /startsWith\("application\/json"\)/u);
  assert.doesNotMatch(route, /submitAnswer|beginAttempt|clientKernelState/u);
  assert.match(component, /학습 효능, 합격 가능성/u);
  assert.equal(contract.runtimeBoundary.defaultOff, true);
  assert.equal(contract.runtimeBoundary.ownerOnly, true);
  assert.equal(contract.runtimeBoundary.productionDenied, true);
  assert.equal(contract.runtimeBoundary.registeredSubjectAdapters.length, 0);
  assert.equal(contract.runtimeBoundary.remoteSupabaseMutation, false);
  assert.equal(contract.runtimeBoundary.productionMutation, false);
  const queueSource = fs.readFileSync(path.join(root,
    "lib/review-os/first-stage/kernel/today-queue.ts"), "utf8");
  assert.doesNotMatch(queueSource, /localeCompare/u);
});
