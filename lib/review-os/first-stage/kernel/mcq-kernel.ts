import crypto from "node:crypto";

import {
  FIRST_STAGE_KERNEL_SCHEMA_VERSION,
  FirstStageKernelError,
  exactObject,
  parseAnswerSubmission,
  parseQuestionReference,
  requiredIdentifier,
  requiredSafeInteger,
  requiredUtcInstant,
  type Attempt,
  type AttemptEvaluation,
  type AttemptEvaluationDecision,
  type ConceptBinding,
  type ConceptOperationalState,
  type ConceptState,
  type ExamCycle,
  type FirstStageKernelState,
  type QuestionReference,
  type ReviewTask,
} from "./domain";
import {
  validateAttemptEvaluation,
  validatePresentation,
  type McqQuestionPresentation,
  type SubjectAdapterRegistry,
} from "../subject-adapter/subject-adapter";

export type CreateExamCycleInput = Readonly<{
  examCycleId: string;
  ownerId: string;
  mode: "today" | "full_day";
  questionReferences: readonly unknown[];
}>;

export type BeginAttemptInput = Readonly<{
  expectedRevision: number;
  attemptId: string;
  questionId: string;
  trustedStartedAt: string;
}>;

export type SubmitAnswerInput = Readonly<{
  expectedRevision: number;
  attemptId: string;
  reviewTaskId: string;
  trustedSubmittedAt: string;
  submission: unknown;
}>;

export type BeginIndependentRetryInput = Readonly<{
  expectedRevision: number;
  reviewTaskId: string;
  independentRetryId: string;
  retryAttemptId: string;
  trustedStartedAt: string;
}>;

function stale(
  state: FirstStageKernelState,
  expectedRevision: number,
  registry: SubjectAdapterRegistry,
) {
  const authorityIds = [
    state.examCycle.examCycleId,
    ...state.attempts.map((item) => item.attemptId),
    ...state.reviewTasks.map((item) => item.reviewTaskId),
    ...state.independentRetries.map((item) => item.independentRetryId),
    ...state.independentRetries.map((item) => item.lineageReceipt.receiptId),
  ];
  if (new Set(authorityIds).size !== authorityIds.length) {
    throw new FirstStageKernelError("invalid_input");
  }
  const validatedEvaluations = new Map<string, AttemptEvaluation>();
  const validatedSubmissions = new Map<string, ReturnType<typeof parseAnswerSubmission>>();
  for (const attempt of state.attempts) {
    exactObject(attempt, [
      "schemaVersion", "attemptId", "examCycleId", "questionReference", "kind",
      "sourceAttemptId", "reviewTaskId", "exposureState", "assistanceLevel",
      "startedAt", "state", "submission", "evaluation",
    ]);
    const reference = parseQuestionReference(attempt.questionReference);
    const adapter = registry.require(reference.subjectId);
    adapter.assertQuestionReference(reference);
    requiredIdentifier(attempt.attemptId);
    requiredUtcInstant(attempt.startedAt);
    if (
      attempt.schemaVersion !== "first_stage.attempt.v1" ||
      attempt.examCycleId !== state.examCycle.examCycleId ||
      canonicalJson(reference) !== canonicalJson(attempt.questionReference) ||
      !["initial", "independent_retry"].includes(attempt.kind) ||
      !["in_progress", "evaluated"].includes(attempt.state) ||
      !["first_exposure", "repeated_exposure", "verified_variant"].includes(attempt.exposureState) ||
      !["none", "hint_or_scaffold", "answer_revealed"].includes(attempt.assistanceLevel)
    ) throw new FirstStageKernelError("invalid_input");
    if (attempt.kind === "initial") {
      const cycleReference = state.examCycle.questionReferences.find(
        (item) => item.questionId === reference.questionId,
      );
      if (
        attempt.sourceAttemptId !== null ||
        (attempt.state === "in_progress" && attempt.reviewTaskId !== null) ||
        attempt.exposureState !== "first_exposure" ||
        attempt.assistanceLevel !== "none" ||
        !cycleReference ||
        canonicalJson(cycleReference) !== canonicalJson(reference)
      ) throw new FirstStageKernelError("invalid_input");
    } else if (
      requiredIdentifier(attempt.sourceAttemptId) !== attempt.sourceAttemptId ||
      requiredIdentifier(attempt.reviewTaskId) !== attempt.reviewTaskId ||
      attempt.exposureState !== "verified_variant" ||
      attempt.assistanceLevel !== "none"
    ) throw new FirstStageKernelError("invalid_input");
    if (attempt.state === "in_progress") {
      if (attempt.submission !== null || attempt.evaluation !== null) {
        throw new FirstStageKernelError("invalid_input");
      }
      continue;
    }
    if (attempt.submission === null || attempt.evaluation === null) {
      throw new FirstStageKernelError("invalid_input");
    }
    const submission = exactObject(attempt.submission, [
      "schemaVersion", "selectedChoice", "confidence", "elapsedTime", "answerChanged",
      "previousChoice", "eliminatedChoiceIds", "workTrace", "submittedAt",
    ]);
    const parsedSubmission = parseAnswerSubmission({
      schemaVersion: submission.schemaVersion,
      selectedChoice: submission.selectedChoice,
      confidence: submission.confidence,
      answerChanged: submission.answerChanged,
      previousChoice: submission.previousChoice,
      eliminatedChoiceIds: submission.eliminatedChoiceIds,
      workTrace: submission.workTrace,
    }, {
      attemptStartedAt: attempt.startedAt,
      submittedAt: requiredUtcInstant(submission.submittedAt),
    });
    if (canonicalJson(parsedSubmission) !== canonicalJson(attempt.submission)) {
      throw new FirstStageKernelError("invalid_input");
    }
    const preEvaluationAttempt: Attempt = Object.freeze({
      ...attempt,
      reviewTaskId: attempt.kind === "initial" ? null : attempt.reviewTaskId,
      state: "in_progress",
      submission: null,
      evaluation: null,
    });
    let evaluation: AttemptEvaluation;
    try {
      const evaluationInput = Object.freeze({
        schemaVersion: "first_stage.subject_evaluation_input.v1" as const,
        questionReference: reference,
        attempt: preEvaluationAttempt,
        submission: parsedSubmission,
        submissionSha256: answerSubmissionSha256(parsedSubmission),
      });
      evaluation = validateAttemptEvaluation(adapter, evaluationInput, attempt.evaluation);
      const recomputed = validateAttemptEvaluation(
        adapter,
        evaluationInput,
        adapter.evaluateSubmission(evaluationInput),
      );
      if (canonicalJson(recomputed) !== canonicalJson(evaluation)) {
        throw new FirstStageKernelError("invalid_input");
      }
    } catch {
      throw new FirstStageKernelError("invalid_input");
    }
    if (canonicalJson(evaluation) !== canonicalJson(attempt.evaluation)) {
      throw new FirstStageKernelError("invalid_input");
    }
    if (
      attempt.kind === "initial" &&
      !isReviewedEvaluation(evaluation) &&
      attempt.reviewTaskId !== null
    ) throw new FirstStageKernelError("invalid_input");
    validatedSubmissions.set(attempt.attemptId, parsedSubmission);
    validatedEvaluations.set(attempt.attemptId, evaluation);
  }
  for (const task of state.reviewTasks) {
    exactObject(task, [
      "schemaVersion", "reviewTaskId", "examCycleId", "sourceAttemptId",
      "questionReference", "conceptBindings", "errorCause", "disposition", "priority",
      "dueAt", "status", "completedAt",
    ]);
    requiredIdentifier(task.reviewTaskId);
    requiredIdentifier(task.sourceAttemptId);
    requiredUtcInstant(task.dueAt);
    if (task.completedAt !== null) requiredUtcInstant(task.completedAt);
    const sourceAttempt = state.attempts.find((item) => item.attemptId === task.sourceAttemptId);
    const evaluation = sourceAttempt
      ? validatedEvaluations.get(sourceAttempt.attemptId)
      : undefined;
    if (
      task.schemaVersion !== "first_stage.review_task.v1" ||
      task.examCycleId !== state.examCycle.examCycleId ||
      !["pending", "retry_active", "completed"].includes(task.status) ||
      !["critical", "high", "normal"].includes(task.priority) ||
      !sourceAttempt ||
      sourceAttempt.kind !== "initial" ||
      sourceAttempt.reviewTaskId !== task.reviewTaskId ||
      !evaluation ||
      !isReviewedEvaluation(evaluation) ||
      canonicalJson(parseQuestionReference(task.questionReference)) !==
        canonicalJson(sourceAttempt.questionReference) ||
      canonicalJson(task.conceptBindings) !== canonicalJson(evaluation.conceptBindings) ||
      task.errorCause !== evaluation.errorCause ||
      task.disposition !== evaluation.retryDisposition ||
      task.priority !== reviewPriority(evaluation.decision)
    ) throw new FirstStageKernelError("invalid_input");
  }
  for (const attempt of state.attempts.filter((item) => item.kind === "initial")) {
    const evaluation = validatedEvaluations.get(attempt.attemptId);
    const matchingTasks = state.reviewTasks.filter(
      (task) => task.sourceAttemptId === attempt.attemptId,
    );
    if ((evaluation && isReviewedEvaluation(evaluation))
      ? matchingTasks.length !== 1
      : matchingTasks.length !== 0) {
      throw new FirstStageKernelError("invalid_input");
    }
  }
  for (const [retryIndex, retry] of state.independentRetries.entries()) {
    exactObject(retry, [
      "schemaVersion", "independentRetryId", "reviewTaskId", "sourceAttemptId",
      "retryAttemptId", "questionReference", "adapterId", "adapterVersion",
      "lineageReceipt", "assistanceLevel", "startedAt", "completedAt", "outcome",
    ]);
    const receipt = retry.lineageReceipt;
    exactObject(receipt, [
      "schemaVersion", "receiptId", "receiptVersion", "adapterId", "adapterVersion",
      "subjectId", "sourceQuestionId", "sourceQuestionVersion",
      "sourceQuestionReferenceSha256", "variantQuestionId", "variantQuestionVersion",
      "variantQuestionReferenceSha256", "targetConceptBindingKeys", "priorRetryCount", "decision",
    ]);
    requiredIdentifier(receipt.receiptId);
    requiredIdentifier(receipt.receiptVersion);
    requiredIdentifier(receipt.adapterId);
    requiredIdentifier(receipt.adapterVersion);
    requiredIdentifier(receipt.sourceQuestionId);
    requiredIdentifier(receipt.sourceQuestionVersion);
    requiredIdentifier(receipt.variantQuestionId);
    requiredIdentifier(receipt.variantQuestionVersion);
    if (
      !/^[a-f0-9]{64}$/u.test(receipt.sourceQuestionReferenceSha256) ||
      !/^[a-f0-9]{64}$/u.test(receipt.variantQuestionReferenceSha256)
    ) throw new FirstStageKernelError("invalid_input");
    requiredIdentifier(retry.independentRetryId);
    requiredIdentifier(retry.reviewTaskId);
    requiredIdentifier(retry.sourceAttemptId);
    requiredIdentifier(retry.retryAttemptId);
    requiredIdentifier(retry.adapterId);
    requiredIdentifier(retry.adapterVersion);
    requiredUtcInstant(retry.startedAt);
    const completedAt = retry.completedAt === null ? null : requiredUtcInstant(retry.completedAt);
    const task = state.reviewTasks.find((item) => item.reviewTaskId === retry.reviewTaskId);
    const sourceAttempt = state.attempts.find((item) => item.attemptId === retry.sourceAttemptId);
    const retryAttempt = state.attempts.find((item) => item.attemptId === retry.retryAttemptId);
    if (!task || !sourceAttempt || !retryAttempt) {
      throw new FirstStageKernelError("invalid_input");
    }
    exactObject(task, [
      "schemaVersion", "reviewTaskId", "examCycleId", "sourceAttemptId",
      "questionReference", "conceptBindings", "errorCause", "disposition", "priority",
      "dueAt", "status", "completedAt",
    ]);
    exactObject(sourceAttempt, [
      "schemaVersion", "attemptId", "examCycleId", "questionReference", "kind",
      "sourceAttemptId", "reviewTaskId", "exposureState", "assistanceLevel",
      "startedAt", "state", "submission", "evaluation",
    ]);
    exactObject(retryAttempt, [
      "schemaVersion", "attemptId", "examCycleId", "questionReference", "kind",
      "sourceAttemptId", "reviewTaskId", "exposureState", "assistanceLevel",
      "startedAt", "state", "submission", "evaluation",
    ]);
    const retryReference = parseQuestionReference(retry.questionReference);
    const retryAttemptReference = parseQuestionReference(retryAttempt.questionReference);
    const taskReference = parseQuestionReference(task.questionReference);
    const sourceReference = parseQuestionReference(sourceAttempt.questionReference);
    const adapter = registry.require(retryReference.subjectId);
    adapter.assertQuestionReference(retryReference);
    const expectedConceptKeys = task?.conceptBindings.map(receiptConceptKey) ?? [];
    const outcomeStateInvalid = retry.outcome === "active"
      ? completedAt !== null || retryAttempt.state !== "in_progress" ||
        retryAttempt.submission !== null || retryAttempt.evaluation !== null ||
        task.status !== "retry_active"
      : !["succeeded", "failed"].includes(retry.outcome) ||
        completedAt === null ||
        retryAttempt.state !== "evaluated" ||
        retryAttempt.submission === null || retryAttempt.evaluation === null ||
        retryAttempt.submission?.submittedAt !== completedAt ||
        (retry.outcome === "succeeded"
          ? task.status !== "completed" || task.completedAt !== completedAt ||
            retryAttempt.evaluation?.decision !== "correct"
          : task.status !== "pending" || task.completedAt !== null ||
            retryAttempt.evaluation?.decision === "correct");
    if (
      retry.schemaVersion !== "first_stage.independent_retry.v1" ||
      retry.assistanceLevel !== "none" ||
      !["active", "succeeded", "failed"].includes(retry.outcome) ||
      receipt.schemaVersion !== "first_stage.independent_retry_lineage_receipt.v1" ||
      receipt.decision !== "verified_variant_for_independent_retry" ||
      retry.adapterId !== receipt.adapterId ||
      retry.adapterVersion !== receipt.adapterVersion ||
      retry.adapterId !== adapter.adapterId ||
      retry.adapterVersion !== adapter.adapterVersion ||
      retryReference.questionId !== receipt.variantQuestionId ||
      retryReference.questionVersion !== receipt.variantQuestionVersion ||
      retryReference.subjectId !== receipt.subjectId ||
      task.schemaVersion !== "first_stage.review_task.v1" ||
      task.examCycleId !== state.examCycle.examCycleId ||
      task.sourceAttemptId !== retry.sourceAttemptId ||
      taskReference.questionId !== receipt.sourceQuestionId ||
      taskReference.questionVersion !== receipt.sourceQuestionVersion ||
      questionReferenceSha256(taskReference) !== receipt.sourceQuestionReferenceSha256 ||
      taskReference.subjectId !== receipt.subjectId ||
      sourceAttempt.schemaVersion !== "first_stage.attempt.v1" ||
      sourceAttempt.kind !== "initial" ||
      sourceAttempt.state !== "evaluated" ||
      sourceAttempt.reviewTaskId !== task.reviewTaskId ||
      sourceAttempt.examCycleId !== task.examCycleId ||
      canonicalJson(sourceReference) !== canonicalJson(taskReference) ||
      retryAttempt.schemaVersion !== "first_stage.attempt.v1" ||
      retryAttempt.kind !== "independent_retry" ||
      retryAttempt.sourceAttemptId !== sourceAttempt.attemptId ||
      retryAttempt.reviewTaskId !== task.reviewTaskId ||
      retryAttempt.examCycleId !== task.examCycleId ||
      retryAttempt.exposureState !== "verified_variant" ||
      retryAttempt.assistanceLevel !== "none" ||
      retryAttempt.startedAt !== retry.startedAt ||
      canonicalJson(retryAttemptReference) !== canonicalJson(retryReference) ||
      questionReferenceSha256(retryReference) !== receipt.variantQuestionReferenceSha256 ||
      outcomeStateInvalid ||
      JSON.stringify(receipt.targetConceptBindingKeys) !== JSON.stringify(expectedConceptKeys) ||
      receipt.priorRetryCount !== state.independentRetries
        .slice(0, retryIndex)
        .filter((item) => item.reviewTaskId === retry.reviewTaskId).length
    ) throw new FirstStageKernelError("invalid_input");
  }
  for (const task of state.reviewTasks) {
    const sourceSubmission = validatedSubmissions.get(task.sourceAttemptId);
    const sourceEvaluation = validatedEvaluations.get(task.sourceAttemptId);
    if (!sourceSubmission || !sourceEvaluation || !isReviewedEvaluation(sourceEvaluation)) {
      throw new FirstStageKernelError("invalid_input");
    }
    let expectedDueAt = addMs(sourceSubmission.submittedAt, sourceEvaluation.reviewAfterMs);
    let expectedStatus: ReviewTask["status"] = "pending";
    let expectedCompletedAt: string | null = null;
    const retries = state.independentRetries.filter(
      (retry) => retry.reviewTaskId === task.reviewTaskId,
    );
    for (const [index, retry] of retries.entries()) {
      const retryAttempt = state.attempts.find(
        (attempt) => attempt.attemptId === retry.retryAttemptId,
      );
      const retryReference = parseQuestionReference(retry.questionReference);
      const adapter = registry.require(retryReference.subjectId);
      adapter.assertQuestionReference(retryReference);
      if (
        !retryAttempt ||
        expectedStatus !== "pending" ||
        instantMs(retry.startedAt) < instantMs(expectedDueAt) ||
        state.examCycle.questionReferences.some(
          (reference) => reference.questionId === retryReference.questionId,
        ) ||
        state.attempts.some(
          (attempt) => attempt.attemptId !== retry.retryAttemptId &&
            attempt.questionReference.questionId === retryReference.questionId,
        )
      ) {
        throw new FirstStageKernelError("invalid_input");
      }
      const retryGlobalIndex = state.independentRetries.indexOf(retry);
      const taskAtRetryStart: ReviewTask = Object.freeze({
        ...task,
        dueAt: expectedDueAt,
        status: "pending",
        completedAt: null,
      });
      try {
        const replayed = exactObject(adapter.buildIndependentRetry(Object.freeze({
          schemaVersion: "first_stage.independent_retry_input.v1" as const,
          sourceQuestionReference: taskAtRetryStart.questionReference,
          sourceAttempt: state.attempts.find(
            (attempt) => attempt.attemptId === taskAtRetryStart.sourceAttemptId,
          )!,
          reviewTask: taskAtRetryStart,
          priorRetries: Object.freeze(state.independentRetries
            .slice(0, retryGlobalIndex)
            .filter((prior) => prior.reviewTaskId === task.reviewTaskId)),
        })), ["schemaVersion", "questionReference", "lineageReceipt"]);
        if (
          replayed.schemaVersion !== "first_stage.independent_retry_candidate.v1" ||
          canonicalJson(parseQuestionReference(replayed.questionReference)) !==
            canonicalJson(retry.questionReference) ||
          canonicalJson(replayed.lineageReceipt) !== canonicalJson(retry.lineageReceipt)
        ) throw new FirstStageKernelError("invalid_input");
      } catch {
        throw new FirstStageKernelError("invalid_input");
      }
      if (retry.outcome === "active") {
        if (index !== retries.length - 1) throw new FirstStageKernelError("invalid_input");
        expectedStatus = "retry_active";
        continue;
      }
      const retrySubmission = validatedSubmissions.get(retryAttempt.attemptId);
      const retryEvaluation = validatedEvaluations.get(retryAttempt.attemptId);
      if (!retrySubmission || !retryEvaluation) throw new FirstStageKernelError("invalid_input");
      if (retry.outcome === "succeeded") {
        if (index !== retries.length - 1 || retryEvaluation.decision !== "correct") {
          throw new FirstStageKernelError("invalid_input");
        }
        expectedStatus = "completed";
        expectedCompletedAt = retrySubmission.submittedAt;
      } else {
        expectedStatus = "pending";
        if (isReviewedEvaluation(retryEvaluation)) {
          expectedDueAt = addMs(retrySubmission.submittedAt, retryEvaluation.reviewAfterMs);
        }
      }
    }
    if (
      task.dueAt !== expectedDueAt ||
      task.status !== expectedStatus ||
      task.completedAt !== expectedCompletedAt
    ) throw new FirstStageKernelError("invalid_input");
  }
  if (requiredSafeInteger(expectedRevision, 1, Number.MAX_SAFE_INTEGER) !== state.revision) {
    throw new FirstStageKernelError("stale_state");
  }
}

function instantMs(value: string) {
  return Date.parse(requiredUtcInstant(value));
}

function latestActivityMs(state: FirstStageKernelState) {
  const values = state.attempts.flatMap((attempt) => [
    instantMs(attempt.startedAt),
    ...(attempt.submission ? [instantMs(attempt.submission.submittedAt)] : []),
  ]);
  return values.length === 0 ? null : Math.max(...values);
}

function requireNondecreasingActivity(state: FirstStageKernelState, value: string) {
  const parsed = instantMs(value);
  const prior = latestActivityMs(state);
  if (prior !== null && parsed < prior) throw new FirstStageKernelError("invalid_transition");
  return value;
}

function uniqueId(state: FirstStageKernelState, value: unknown) {
  const id = requiredIdentifier(value);
  const used = [
    state.examCycle.examCycleId,
    ...state.attempts.map((item) => item.attemptId),
    ...state.reviewTasks.map((item) => item.reviewTaskId),
    ...state.independentRetries.map((item) => item.independentRetryId),
    ...state.independentRetries.map((item) => item.lineageReceipt.receiptId),
  ];
  if (used.includes(id)) throw new FirstStageKernelError("invalid_transition");
  return id;
}

function replaceAt<T>(items: readonly T[], index: number, value: T) {
  return Object.freeze(items.map((item, itemIndex) => itemIndex === index ? value : item));
}

function addMs(value: string, milliseconds: number) {
  return new Date(instantMs(value) + milliseconds).toISOString();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const row = value as Record<string, unknown>;
  return `{${Object.keys(row).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(row[key])}`).join(",")}}`;
}

export function answerSubmissionSha256(submission: unknown) {
  return crypto.createHash("sha256").update(canonicalJson(submission)).digest("hex");
}

function questionReferenceSha256(reference: QuestionReference) {
  return crypto.createHash("sha256").update(canonicalJson(reference)).digest("hex");
}

function referenceIdentity(reference: QuestionReference) {
  return `${reference.questionId}@${reference.questionVersion}`;
}

export function createExamCycleState(input: CreateExamCycleInput): FirstStageKernelState {
  const row = exactObject(input, ["examCycleId", "ownerId", "mode", "questionReferences"]);
  if (!["today", "full_day"].includes(String(row.mode))) {
    throw new FirstStageKernelError("invalid_input");
  }
  const mode = row.mode as CreateExamCycleInput["mode"];
  const maximum = mode === "today" ? 100 : 200;
  if (
    !Array.isArray(row.questionReferences) ||
    row.questionReferences.length < 1 ||
    row.questionReferences.length > maximum
  ) throw new FirstStageKernelError("invalid_input");
  const references = row.questionReferences.map(parseQuestionReference);
  const identities = references.map(referenceIdentity);
  const questionIds = references.map((item) => item.questionId);
  if (
    new Set(identities).size !== identities.length ||
    new Set(questionIds).size !== questionIds.length
  ) {
    throw new FirstStageKernelError("invalid_input");
  }
  const cycle: ExamCycle = Object.freeze({
    schemaVersion: "first_stage.exam_cycle.v1",
    examCycleId: requiredIdentifier(row.examCycleId),
    ownerId: requiredIdentifier(row.ownerId),
    mode,
    state: "ready",
    questionReferences: Object.freeze(references),
    startedAt: null,
    completedAt: null,
  });
  return Object.freeze({
    schemaVersion: FIRST_STAGE_KERNEL_SCHEMA_VERSION,
    revision: 1,
    examCycle: cycle,
    attempts: Object.freeze([]),
    reviewTasks: Object.freeze([]),
    independentRetries: Object.freeze([]),
    conceptStates: Object.freeze([]),
  });
}

function referenceForInitialAttempt(state: FirstStageKernelState, questionId: string) {
  const matches = state.examCycle.questionReferences.filter((item) => item.questionId === questionId);
  if (matches.length !== 1) throw new FirstStageKernelError("not_found");
  if (state.attempts.some((item) => item.kind === "initial" && item.questionReference.questionId === questionId)) {
    throw new FirstStageKernelError("invalid_transition");
  }
  return matches[0];
}

export function beginAttempt(
  state: FirstStageKernelState,
  input: BeginAttemptInput,
  registry: SubjectAdapterRegistry,
): FirstStageKernelState {
  const row = exactObject(input, ["expectedRevision", "attemptId", "questionId", "trustedStartedAt"]);
  stale(state, requiredSafeInteger(row.expectedRevision, 1, Number.MAX_SAFE_INTEGER), registry);
  if (state.examCycle.state === "completed") throw new FirstStageKernelError("invalid_transition");
  if (state.attempts.some((item) => item.state === "in_progress")) {
    throw new FirstStageKernelError("invalid_transition");
  }
  const reference = referenceForInitialAttempt(state, requiredIdentifier(row.questionId));
  const adapter = registry.require(reference.subjectId);
  adapter.assertQuestionReference(reference);
  const startedAt = requireNondecreasingActivity(state, requiredUtcInstant(row.trustedStartedAt));
  const attempt: Attempt = Object.freeze({
    schemaVersion: "first_stage.attempt.v1",
    attemptId: uniqueId(state, row.attemptId),
    examCycleId: state.examCycle.examCycleId,
    questionReference: reference,
    kind: "initial",
    sourceAttemptId: null,
    reviewTaskId: null,
    exposureState: "first_exposure",
    assistanceLevel: "none",
    startedAt,
    state: "in_progress",
    submission: null,
    evaluation: null,
  });
  return Object.freeze({
    ...state,
    revision: state.revision + 1,
    examCycle: Object.freeze({
      ...state.examCycle,
      state: "active",
      startedAt: state.examCycle.startedAt ?? startedAt,
    }),
    attempts: Object.freeze([...state.attempts, attempt]),
  });
}

export function presentAttemptQuestion(
  state: FirstStageKernelState,
  attemptId: string,
  registry: SubjectAdapterRegistry,
): McqQuestionPresentation {
  stale(state, state.revision, registry);
  const attempt = state.attempts.find((item) => item.attemptId === requiredIdentifier(attemptId));
  if (!attempt || attempt.state !== "in_progress") throw new FirstStageKernelError("not_found");
  const adapter = registry.require(attempt.questionReference.subjectId);
  adapter.assertQuestionReference(attempt.questionReference);
  return validatePresentation(
    adapter,
    attempt.questionReference,
    adapter.presentQuestion(attempt.questionReference),
  );
}

function reviewPriority(decision: AttemptEvaluationDecision) {
  if (decision === "incorrect" || decision === "unanswered") return "high" as const;
  if (decision === "unavailable" || decision === "withheld") return "critical" as const;
  return "normal" as const;
}

function isReviewedEvaluation(
  evaluation: AttemptEvaluation,
): evaluation is Extract<AttemptEvaluation, { decision: "correct" | "incorrect" | "unanswered" }> {
  return evaluation.decision !== "unavailable" && evaluation.decision !== "withheld";
}

function conceptKey(binding: ConceptBinding) {
  return `${binding.subjectId}:${binding.conceptId}@${binding.conceptVersion}`;
}

function receiptConceptKey(binding: ConceptBinding) {
  return `${binding.subjectId}:${binding.conceptId}@${binding.conceptVersion}:${binding.role}`;
}

function updateConceptStates(
  states: readonly ConceptState[],
  bindings: readonly ConceptBinding[],
  attemptId: string,
  updatedAt: string,
  nextState: ConceptOperationalState,
) {
  const next = [...states];
  for (const binding of bindings) {
    const key = conceptKey(binding);
    const index = next.findIndex((item) => conceptKey(item.binding) === key);
    const prior = index >= 0 ? next[index] : null;
    const evidenceAttemptIds = Object.freeze([
      ...(prior?.evidenceAttemptIds ?? []),
      ...((prior?.evidenceAttemptIds ?? []).includes(attemptId) ? [] : [attemptId]),
    ]);
    const item: ConceptState = Object.freeze({
      schemaVersion: "first_stage.concept_state.v1",
      binding,
      state: nextState,
      lastAttemptId: attemptId,
      evidenceAttemptIds,
      updatedAt,
      masteryClaim: false,
    });
    if (index >= 0) next[index] = item;
    else next.push(item);
  }
  return Object.freeze(next);
}

function cycleAfterInitialEvaluation(
  state: FirstStageKernelState,
  attempts: readonly Attempt[],
  completedAt: string,
): ExamCycle {
  const evaluatedInitials = new Set(
    attempts
      .filter((item) => item.kind === "initial" && item.state === "evaluated")
      .map((item) => referenceIdentity(item.questionReference)),
  );
  const completed = state.examCycle.questionReferences.every((item) => evaluatedInitials.has(referenceIdentity(item)));
  return Object.freeze({
    ...state.examCycle,
    state: completed ? "completed" : "active",
    completedAt: completed ? completedAt : null,
  });
}

export function submitAnswer(
  state: FirstStageKernelState,
  input: SubmitAnswerInput,
  registry: SubjectAdapterRegistry,
): FirstStageKernelState {
  const row = exactObject(input, [
    "expectedRevision", "attemptId", "reviewTaskId", "trustedSubmittedAt", "submission",
  ]);
  stale(state, requiredSafeInteger(row.expectedRevision, 1, Number.MAX_SAFE_INTEGER), registry);
  const attemptId = requiredIdentifier(row.attemptId);
  const reviewTaskId = requiredIdentifier(row.reviewTaskId);
  const attemptIndex = state.attempts.findIndex((item) => item.attemptId === attemptId);
  if (attemptIndex < 0) throw new FirstStageKernelError("not_found");
  const attempt = state.attempts[attemptIndex];
  if (attempt.state !== "in_progress") throw new FirstStageKernelError("invalid_transition");
  const trustedSubmittedAt = requireNondecreasingActivity(
    state,
    requiredUtcInstant(row.trustedSubmittedAt),
  );
  const submission = parseAnswerSubmission(row.submission, {
    attemptStartedAt: attempt.startedAt,
    submittedAt: trustedSubmittedAt,
  });
  if (
    instantMs(submission.submittedAt) < instantMs(attempt.startedAt) ||
    (latestActivityMs(state) ?? -Infinity) > instantMs(submission.submittedAt)
  ) {
    throw new FirstStageKernelError("invalid_input");
  }
  const adapter = registry.require(attempt.questionReference.subjectId);
  adapter.assertQuestionReference(attempt.questionReference);
  const evaluationInput = Object.freeze({
    schemaVersion: "first_stage.subject_evaluation_input.v1" as const,
    questionReference: attempt.questionReference,
    attempt,
    submission,
    submissionSha256: answerSubmissionSha256(submission),
  });
  const evaluation = validateAttemptEvaluation(
    adapter,
    evaluationInput,
    adapter.evaluateSubmission(evaluationInput),
  );
  const reviewedEvaluation = isReviewedEvaluation(evaluation);

  const initialReviewTaskId = attempt.kind === "initial" && reviewedEvaluation
    ? uniqueId(state, reviewTaskId)
    : null;
  if (attempt.kind === "independent_retry" && reviewTaskId !== attempt.reviewTaskId) {
    throw new FirstStageKernelError("invalid_input");
  }
  const evaluatedAttempt: Attempt = Object.freeze({
    ...attempt,
    reviewTaskId: initialReviewTaskId ?? attempt.reviewTaskId,
    state: "evaluated",
    submission,
    evaluation,
  });
  const attempts = replaceAt(state.attempts, attemptIndex, evaluatedAttempt);

  if (attempt.kind === "initial") {
    if (!isReviewedEvaluation(evaluation)) {
      return Object.freeze({
        ...state,
        revision: state.revision + 1,
        examCycle: cycleAfterInitialEvaluation(state, attempts, submission.submittedAt),
        attempts,
      });
    }
    const reviewTaskId = initialReviewTaskId!;
    const dueAt = addMs(submission.submittedAt, evaluation.reviewAfterMs);
    const task: ReviewTask = Object.freeze({
      schemaVersion: "first_stage.review_task.v1",
      reviewTaskId,
      examCycleId: state.examCycle.examCycleId,
      sourceAttemptId: attempt.attemptId,
      questionReference: attempt.questionReference,
      conceptBindings: evaluation.conceptBindings,
      errorCause: evaluation.errorCause,
      disposition: evaluation.retryDisposition,
      priority: reviewPriority(evaluation.decision),
      dueAt,
      status: "pending",
      completedAt: null,
    });
    const conceptState = instantMs(dueAt) <= instantMs(submission.submittedAt)
      ? "independent_retry_due" as const
      : "review_required" as const;
    return Object.freeze({
      ...state,
      revision: state.revision + 1,
      examCycle: cycleAfterInitialEvaluation(state, attempts, submission.submittedAt),
      attempts,
      reviewTasks: Object.freeze([...state.reviewTasks, task]),
      conceptStates: updateConceptStates(
        state.conceptStates,
        evaluation.conceptBindings,
        attempt.attemptId,
        submission.submittedAt,
        conceptState,
      ),
    });
  }

  const retryIndex = state.independentRetries.findIndex((item) => item.retryAttemptId === attempt.attemptId);
  if (retryIndex < 0 || !attempt.reviewTaskId) throw new FirstStageKernelError("invalid_transition");
  const retry = state.independentRetries[retryIndex];
  if (retry.outcome !== "active") throw new FirstStageKernelError("invalid_transition");
  const taskIndex = state.reviewTasks.findIndex((item) => item.reviewTaskId === attempt.reviewTaskId);
  if (taskIndex < 0 || state.reviewTasks[taskIndex].status !== "retry_active") {
    throw new FirstStageKernelError("invalid_transition");
  }
  if (!isReviewedEvaluation(evaluation)) {
    const task = Object.freeze({
      ...state.reviewTasks[taskIndex],
      status: "pending" as const,
    });
    const completedRetry = Object.freeze({
      ...retry,
      completedAt: submission.submittedAt,
      outcome: "failed" as const,
    });
    return Object.freeze({
      ...state,
      revision: state.revision + 1,
      attempts,
      reviewTasks: replaceAt(state.reviewTasks, taskIndex, task),
      independentRetries: replaceAt(state.independentRetries, retryIndex, completedRetry),
    });
  }
  if (
    JSON.stringify(evaluation.conceptBindings.map(receiptConceptKey)) !==
    JSON.stringify(state.reviewTasks[taskIndex].conceptBindings.map(receiptConceptKey))
  ) throw new FirstStageKernelError("adapter_mismatch");
  const succeeded = evaluation.decision === "correct";
  const task: ReviewTask = Object.freeze({
    ...state.reviewTasks[taskIndex],
    status: succeeded ? "completed" : "pending",
    dueAt: succeeded
      ? state.reviewTasks[taskIndex].dueAt
      : addMs(submission.submittedAt, evaluation.reviewAfterMs),
    completedAt: succeeded ? submission.submittedAt : null,
  });
  const completedRetry = Object.freeze({
    ...retry,
    completedAt: submission.submittedAt,
    outcome: succeeded ? "succeeded" as const : "failed" as const,
  });
  return Object.freeze({
    ...state,
    revision: state.revision + 1,
    attempts,
    reviewTasks: replaceAt(state.reviewTasks, taskIndex, task),
    independentRetries: replaceAt(state.independentRetries, retryIndex, completedRetry),
    conceptStates: updateConceptStates(
      state.conceptStates,
      state.reviewTasks[taskIndex].conceptBindings,
      attempt.attemptId,
      submission.submittedAt,
      succeeded ? "independent_retry_recorded" : "reopened",
    ),
  });
}

export function beginIndependentRetry(
  state: FirstStageKernelState,
  input: BeginIndependentRetryInput,
  registry: SubjectAdapterRegistry,
): FirstStageKernelState {
  const row = exactObject(input, [
    "expectedRevision", "reviewTaskId", "independentRetryId", "retryAttemptId",
    "trustedStartedAt",
  ]);
  stale(state, requiredSafeInteger(row.expectedRevision, 1, Number.MAX_SAFE_INTEGER), registry);
  if (state.attempts.some((item) => item.state === "in_progress")) {
    throw new FirstStageKernelError("invalid_transition");
  }
  const taskId = requiredIdentifier(row.reviewTaskId);
  const taskIndex = state.reviewTasks.findIndex((item) => item.reviewTaskId === taskId);
  if (taskIndex < 0) throw new FirstStageKernelError("not_found");
  const task = state.reviewTasks[taskIndex];
  const startedAt = requireNondecreasingActivity(state, requiredUtcInstant(row.trustedStartedAt));
  if (task.status !== "pending" || instantMs(startedAt) < instantMs(task.dueAt)) {
    throw new FirstStageKernelError("invalid_transition");
  }
  const sourceAttempt = state.attempts.find((item) => item.attemptId === task.sourceAttemptId);
  if (!sourceAttempt || sourceAttempt.state !== "evaluated") throw new FirstStageKernelError("invalid_transition");
  const adapter = registry.require(task.questionReference.subjectId);
  adapter.assertQuestionReference(task.questionReference);
  const priorRetries = Object.freeze(
    state.independentRetries.filter((item) => item.reviewTaskId === task.reviewTaskId),
  );
  const rawCandidate = adapter.buildIndependentRetry(Object.freeze({
    schemaVersion: "first_stage.independent_retry_input.v1" as const,
    sourceQuestionReference: task.questionReference,
    sourceAttempt,
    reviewTask: task,
    priorRetries,
  }));
  const candidate = exactObject(rawCandidate, ["schemaVersion", "questionReference", "lineageReceipt"]);
  if (candidate.schemaVersion !== "first_stage.independent_retry_candidate.v1") {
    throw new FirstStageKernelError("adapter_mismatch");
  }
  const retryReference = parseQuestionReference(candidate.questionReference);
  const lineage = exactObject(candidate.lineageReceipt, [
    "schemaVersion", "receiptId", "receiptVersion", "adapterId", "adapterVersion",
    "subjectId", "sourceQuestionId", "sourceQuestionVersion",
    "sourceQuestionReferenceSha256", "variantQuestionId", "variantQuestionVersion",
    "variantQuestionReferenceSha256", "targetConceptBindingKeys", "priorRetryCount", "decision",
  ]);
  const targetConceptBindingKeys = task.conceptBindings.map(receiptConceptKey);
  if (
    lineage.schemaVersion !== "first_stage.independent_retry_lineage_receipt.v1" ||
    requiredIdentifier(lineage.receiptId) !== lineage.receiptId ||
    requiredIdentifier(lineage.receiptVersion) !== lineage.receiptVersion ||
    lineage.adapterId !== adapter.adapterId ||
    lineage.adapterVersion !== adapter.adapterVersion ||
    lineage.subjectId !== adapter.subjectId ||
    lineage.sourceQuestionId !== task.questionReference.questionId ||
    lineage.sourceQuestionVersion !== task.questionReference.questionVersion ||
    lineage.sourceQuestionReferenceSha256 !== questionReferenceSha256(task.questionReference) ||
    lineage.variantQuestionId !== retryReference.questionId ||
    lineage.variantQuestionVersion !== retryReference.questionVersion ||
    lineage.variantQuestionReferenceSha256 !== questionReferenceSha256(retryReference) ||
    !Array.isArray(lineage.targetConceptBindingKeys) ||
    JSON.stringify(lineage.targetConceptBindingKeys) !== JSON.stringify(targetConceptBindingKeys) ||
    lineage.priorRetryCount !== priorRetries.length ||
    lineage.decision !== "verified_variant_for_independent_retry"
  ) throw new FirstStageKernelError("adapter_mismatch");
  if (
    retryReference.subjectId !== adapter.subjectId ||
    retryReference.questionId === task.questionReference.questionId ||
    state.examCycle.questionReferences.some((item) => item.questionId === retryReference.questionId) ||
    state.attempts.some((item) => item.questionReference.questionId === retryReference.questionId)
  ) throw new FirstStageKernelError("adapter_mismatch");
  adapter.assertQuestionReference(retryReference);
  const retryAttemptId = uniqueId(state, row.retryAttemptId);
  const independentRetryId = uniqueId(state, row.independentRetryId);
  const receiptId = requiredIdentifier(lineage.receiptId);
  if (
    retryAttemptId === independentRetryId ||
    receiptId === retryAttemptId ||
    receiptId === independentRetryId ||
    [
      state.examCycle.examCycleId,
      ...state.attempts.map((item) => item.attemptId),
      ...state.reviewTasks.map((item) => item.reviewTaskId),
      ...state.independentRetries.map((item) => item.independentRetryId),
      ...state.independentRetries.map((item) => item.lineageReceipt.receiptId),
    ].includes(receiptId)
  ) throw new FirstStageKernelError("invalid_input");
  const lineageReceipt = Object.freeze({
    schemaVersion: "first_stage.independent_retry_lineage_receipt.v1" as const,
    receiptId,
    receiptVersion: requiredIdentifier(lineage.receiptVersion),
    adapterId: adapter.adapterId,
    adapterVersion: adapter.adapterVersion,
    subjectId: adapter.subjectId,
    sourceQuestionId: task.questionReference.questionId,
    sourceQuestionVersion: task.questionReference.questionVersion,
    sourceQuestionReferenceSha256: questionReferenceSha256(task.questionReference),
    variantQuestionId: retryReference.questionId,
    variantQuestionVersion: retryReference.questionVersion,
    variantQuestionReferenceSha256: questionReferenceSha256(retryReference),
    targetConceptBindingKeys: Object.freeze(targetConceptBindingKeys),
    priorRetryCount: priorRetries.length,
    decision: "verified_variant_for_independent_retry" as const,
  });
  const retryAttempt: Attempt = Object.freeze({
    schemaVersion: "first_stage.attempt.v1",
    attemptId: retryAttemptId,
    examCycleId: state.examCycle.examCycleId,
    questionReference: retryReference,
    kind: "independent_retry",
    sourceAttemptId: sourceAttempt.attemptId,
    reviewTaskId: task.reviewTaskId,
    exposureState: "verified_variant",
    assistanceLevel: "none",
    startedAt,
    state: "in_progress",
    submission: null,
    evaluation: null,
  });
  const retry = Object.freeze({
    schemaVersion: "first_stage.independent_retry.v1" as const,
    independentRetryId,
    reviewTaskId: task.reviewTaskId,
    sourceAttemptId: sourceAttempt.attemptId,
    retryAttemptId,
    questionReference: retryReference,
    adapterId: adapter.adapterId,
    adapterVersion: adapter.adapterVersion,
    lineageReceipt,
    assistanceLevel: "none" as const,
    startedAt,
    completedAt: null,
    outcome: "active" as const,
  });
  return Object.freeze({
    ...state,
    revision: state.revision + 1,
    attempts: Object.freeze([...state.attempts, retryAttempt]),
    reviewTasks: replaceAt(state.reviewTasks, taskIndex, Object.freeze({ ...task, status: "retry_active" })),
    independentRetries: Object.freeze([...state.independentRetries, retry]),
    conceptStates: updateConceptStates(
      state.conceptStates,
      task.conceptBindings,
      sourceAttempt.attemptId,
      startedAt,
      "independent_retry_due",
    ),
  });
}
