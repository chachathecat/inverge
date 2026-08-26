import crypto from "node:crypto";

import {
  CHOICE_IDS,
  CONFIDENCE_VALUES,
  ERROR_CAUSES,
  FIRST_STAGE_SUBJECT_IDS,
  FirstStageKernelError,
  exactObject,
  parseQuestionReference,
  requiredIdentifier,
  requiredSafeInteger,
  type AnswerSubmission,
  type Attempt,
  type AttemptEvidenceEnvelope,
  type AttemptEvaluation,
  type AttemptEvaluationDecision,
  type AttemptKind,
  type ChoiceId,
  type ConceptBinding,
  type Confidence,
  type ElapsedTime,
  type ElapsedTimeBucket,
  type ErrorCause,
  type FirstStageSubjectId,
  type IndependentRetry,
  type IndependentRetryLineageReceipt,
  type ImmutableEvidenceReference,
  type QuestionReference,
  type ReviewedFeedbackEvidence,
  type ReviewTask,
  type RetryDisposition,
  type WorkTrace,
  type WorkTraceStep,
  type WorkTraceStepKind,
} from "../kernel/domain";

/* SUBJECT_ADAPTER_V1_TYPE_SOURCE_START */
export const SUBJECT_ADAPTER_SCHEMA_VERSION =
  "dabangil.first_stage.subject_adapter.v1" as const;

export type McqChoicePresentation = Readonly<{
  choiceId: ChoiceId;
  body: string;
}>;

export type McqQuestionPresentation = Readonly<{
  schemaVersion: "first_stage.mcq_question_presentation.v1";
  questionReference: QuestionReference;
  stem: string;
  choices: readonly McqChoicePresentation[];
  sourceStatusLabel: "verified_owner_private" | "verified_cleared";
  currentnessStatusLabel: "verified_exam_date" | "verified_current";
  learningReferenceDisclaimer: true;
}>;

export type SubjectEvaluationInput = Readonly<{
  schemaVersion: "first_stage.subject_evaluation_input.v1";
  questionReference: QuestionReference;
  attempt: Attempt;
  submission: AnswerSubmission;
  submissionSha256: string;
}>;

export type IndependentRetryInput = Readonly<{
  schemaVersion: "first_stage.independent_retry_input.v1";
  sourceQuestionReference: QuestionReference;
  sourceAttempt: Attempt;
  reviewTask: ReviewTask;
  priorRetries: readonly IndependentRetry[];
}>;

export type IndependentRetryCandidate = Readonly<{
  schemaVersion: "first_stage.independent_retry_candidate.v1";
  questionReference: QuestionReference;
  lineageReceipt: IndependentRetryLineageReceipt;
}>;

export interface SubjectAdapterV1 {
  readonly schemaVersion: typeof SUBJECT_ADAPTER_SCHEMA_VERSION;
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly subjectId: FirstStageSubjectId;
  assertQuestionReference(reference: QuestionReference): void;
  presentQuestion(reference: QuestionReference): McqQuestionPresentation;
  evaluateSubmission(input: SubjectEvaluationInput): AttemptEvaluation;
  buildIndependentRetry(input: IndependentRetryInput): IndependentRetryCandidate;
}
/* SUBJECT_ADAPTER_V1_TYPE_SOURCE_END */

function deepFreeze<const T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    const row = value as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(value)) deepFreeze(row[key]);
    Object.freeze(value);
  }
  return value;
}

type ExactKeyTuple<T, K extends readonly (keyof T)[]> =
  Exclude<keyof T, K[number]> extends never ? K : never;

function exactTypeKeys<T>() {
  return <const K extends readonly (keyof T)[]>(keys: ExactKeyTuple<T, K>) => keys;
}

type ExactValueTuple<T extends PropertyKey, K extends readonly T[]> =
  Exclude<T, K[number]> extends never ? K : never;

function exactValues<T extends PropertyKey>() {
  return <const K extends readonly T[]>(values: ExactValueTuple<T, K>) => values;
}

export const SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR = deepFreeze({
  schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
  interfaceName: "SubjectAdapterV1",
  subjects: FIRST_STAGE_SUBJECT_IDS,
  transitiveSourceBindings: [
    {
      path: "lib/review-os/first-stage/kernel/domain.ts",
      normalization: "utf8_lf",
      sha256: "a8a92eafe394e7b658dd6882df31133738b3967d549eaa3e7a568b1fe4567818",
      covers: [
        "QuestionReference", "Attempt", "AnswerSubmission", "Confidence",
        "ElapsedTime", "WorkTrace", "WorkTraceStep", "ErrorCause", "ConceptBinding",
        "ReviewTask", "IndependentRetry", "IndependentRetryLineageReceipt",
        "AttemptEvaluation", "AttemptEvidenceEnvelope", "ImmutableEvidenceReference",
        "ReviewedFeedbackEvidence", "FirstStageSubjectId", "ChoiceId", "AttemptKind",
        "AttemptEvaluationDecision", "RetryDisposition", "ElapsedTimeBucket",
        "WorkTraceStepKind",
      ],
    },
    {
      path: "lib/review-os/first-stage/subject-adapter/subject-adapter.ts",
      normalization: "utf8_lf",
      selection: {
        startMarker: "/* SUBJECT_ADAPTER_V1_TYPE_SOURCE_START */",
        endMarker: "/* SUBJECT_ADAPTER_V1_TYPE_SOURCE_END */",
        markersExcluded: true,
      },
      sha256: "dcd540526ca2bf61638bfdeb1e7a5824ebdf843c7f62270b71ac34a764c83125",
      covers: [
        "SUBJECT_ADAPTER_SCHEMA_VERSION", "McqChoicePresentation",
        "McqQuestionPresentation", "SubjectEvaluationInput", "IndependentRetryInput",
        "IndependentRetryCandidate", "SubjectAdapterV1",
      ],
    },
  ],
  fields: ["schemaVersion", "adapterId", "adapterVersion", "subjectId"],
  methods: [
    {
      name: "assertQuestionReference",
      input: "QuestionReference",
      output: "void_or_fail_closed",
    },
    {
      name: "presentQuestion",
      input: "QuestionReference",
      output: "McqQuestionPresentation",
    },
    {
      name: "evaluateSubmission",
      input: "SubjectEvaluationInput",
      output: "AttemptEvaluation",
    },
    {
      name: "buildIndependentRetry",
      input: "IndependentRetryInput",
      output: "IndependentRetryCandidate",
    },
  ],
  typeShapes: {
    SubjectAdapterV1: exactTypeKeys<SubjectAdapterV1>()([
      "schemaVersion", "adapterId", "adapterVersion", "subjectId",
      "assertQuestionReference", "presentQuestion", "evaluateSubmission",
      "buildIndependentRetry",
    ]),
    SubjectEvaluationInput: exactTypeKeys<SubjectEvaluationInput>()([
      "schemaVersion", "questionReference", "attempt", "submission", "submissionSha256",
    ]),
    IndependentRetryInput: exactTypeKeys<IndependentRetryInput>()([
      "schemaVersion", "sourceQuestionReference", "sourceAttempt", "reviewTask",
      "priorRetries",
    ]),
    IndependentRetryCandidate: exactTypeKeys<IndependentRetryCandidate>()([
      "schemaVersion", "questionReference", "lineageReceipt",
    ]),
    McqChoicePresentation: exactTypeKeys<McqChoicePresentation>()([
      "choiceId", "body",
    ]),
    McqQuestionPresentation: exactTypeKeys<McqQuestionPresentation>()([
      "schemaVersion", "questionReference", "stem", "choices", "sourceStatusLabel",
      "currentnessStatusLabel", "learningReferenceDisclaimer",
    ]),
    QuestionReference: exactTypeKeys<QuestionReference>()([
      "schemaVersion", "questionId", "questionVersion", "subjectId", "examYear",
      "examRound", "sessionId", "questionNumber", "choiceCount",
      "sourceVersionManifestIds", "rightsState", "currentnessState",
    ]),
    Attempt: exactTypeKeys<Attempt>()([
      "schemaVersion", "attemptId", "examCycleId", "questionReference", "kind",
      "sourceAttemptId", "reviewTaskId", "exposureState", "assistanceLevel",
      "startedAt", "state", "submission", "evaluation",
    ]),
    AnswerSubmission: exactTypeKeys<AnswerSubmission>()([
      "schemaVersion", "selectedChoice", "confidence", "elapsedTime", "answerChanged",
      "previousChoice", "eliminatedChoiceIds", "workTrace", "submittedAt",
    ]),
    ElapsedTime: exactTypeKeys<ElapsedTime>()([
      "milliseconds", "bucket",
    ]),
    WorkTrace: exactTypeKeys<WorkTrace>()([
      "schemaVersion", "steps",
    ]),
    WorkTraceStep: exactTypeKeys<WorkTraceStep>()([
      "sequence", "kind", "atElapsedMs", "choiceId",
    ]),
    ConceptBinding: exactTypeKeys<ConceptBinding>()([
      "schemaVersion", "conceptId", "conceptVersion", "subjectId", "role",
    ]),
    ReviewTask: exactTypeKeys<ReviewTask>()([
      "schemaVersion", "reviewTaskId", "examCycleId", "sourceAttemptId",
      "questionReference", "conceptBindings", "errorCause", "disposition", "priority",
      "dueAt", "status", "completedAt",
    ]),
    IndependentRetryLineageReceipt: exactTypeKeys<IndependentRetryLineageReceipt>()([
      "schemaVersion", "receiptId", "receiptVersion", "adapterId", "adapterVersion",
      "subjectId", "sourceQuestionId", "sourceQuestionVersion",
      "sourceQuestionReferenceSha256", "variantQuestionId", "variantQuestionVersion",
      "variantQuestionReferenceSha256", "targetConceptBindingKeys", "priorRetryCount", "decision",
    ]),
    IndependentRetry: exactTypeKeys<IndependentRetry>()([
      "schemaVersion", "independentRetryId", "reviewTaskId", "sourceAttemptId",
      "retryAttemptId", "questionReference", "adapterId", "adapterVersion",
      "lineageReceipt", "assistanceLevel", "startedAt", "completedAt", "outcome",
    ]),
    AttemptEvaluation: exactTypeKeys<AttemptEvaluation>()([
      "schemaVersion", "decision", "errorCause", "conceptBindings", "biggestGapCode",
      "nextActionCode", "retryDisposition", "reviewAfterMs", "evaluationPolicyVersion",
      "evidenceEnvelope",
    ]),
    AttemptEvidenceEnvelope: exactTypeKeys<AttemptEvidenceEnvelope>()([
      "schemaVersion", "attemptId", "submissionSha256", "questionId", "questionVersion",
      "questionReferenceSha256", "subjectId", "adapterId", "adapterVersion", "officialKeyReference",
      "choiceSetReference", "sourceReference", "versionDecisionReference",
      "rightsDecisionReference", "reviewedFeedback",
    ]),
    ImmutableEvidenceReference: exactTypeKeys<ImmutableEvidenceReference>()([
      "schemaVersion", "evidenceId", "evidenceVersion", "evidenceSha256",
    ]),
    ReviewedFeedbackEvidence: exactTypeKeys<ReviewedFeedbackEvidence>()([
      "schemaVersion", "state", "receiptReference", "reviewerIdentity",
      "reviewerClass", "modelAlone",
    ]),
  },
  vocabularies: {
    subjects: exactValues<FirstStageSubjectId>()(FIRST_STAGE_SUBJECT_IDS),
    choiceIds: exactValues<ChoiceId>()(CHOICE_IDS),
    confidence: exactValues<Confidence>()(CONFIDENCE_VALUES),
    elapsedTimeBuckets: exactValues<ElapsedTimeBucket>()([
      "0_29999", "30000_59999", "60000_119999", "120000_plus",
    ]),
    workTraceStepKinds: exactValues<WorkTraceStepKind>()([
      "read_stem", "read_all_choices", "eliminate_choice", "calculate",
      "source_check", "change_answer", "select_answer",
    ]),
    errorCauses: exactValues<ErrorCause>()(ERROR_CAUSES),
    questionRightsStates: exactValues<QuestionReference["rightsState"]>()([
      "verified_owner_private", "verified_cleared",
    ]),
    questionCurrentnessStates: exactValues<QuestionReference["currentnessState"]>()([
      "verified_exam_date", "verified_current",
    ]),
    attemptKinds: exactValues<AttemptKind>()(["initial", "independent_retry"]),
    attemptEvaluationDecisions: exactValues<AttemptEvaluationDecision>()([
      "correct", "incorrect", "unanswered", "unavailable", "withheld",
    ]),
    retryDispositions: exactValues<RetryDisposition>()([
      "retry_now", "review_then_retry", "review_before_new_variant",
    ]),
    conceptBindingRoles: exactValues<ConceptBinding["role"]>()(["primary", "supporting"]),
    reviewedFeedbackStates: exactValues<ReviewedFeedbackEvidence["state"]>()([
      "reviewed_available", "withheld_rights_or_version", "not_emitted_unavailable",
    ]),
    reviewerClasses: exactValues<Exclude<ReviewedFeedbackEvidence["reviewerClass"], null>>()([
      "named_owner_authorized_human_reviewer", "owner_approved_personal_feedback_reviewer",
    ]),
    attemptExposureStates: exactValues<Attempt["exposureState"]>()([
      "first_exposure", "repeated_exposure", "verified_variant",
    ]),
    assistanceLevels: exactValues<Attempt["assistanceLevel"]>()([
      "none", "hint_or_scaffold", "answer_revealed",
    ]),
    attemptStates: exactValues<Attempt["state"]>()(["in_progress", "evaluated"]),
    reviewTaskPriorities: exactValues<ReviewTask["priority"]>()([
      "critical", "high", "normal",
    ]),
    reviewTaskStatuses: exactValues<ReviewTask["status"]>()([
      "pending", "retry_active", "completed",
    ]),
    independentRetryOutcomes: exactValues<IndependentRetry["outcome"]>()([
      "active", "succeeded", "failed",
    ]),
    independentRetryLineageDecisions:
      exactValues<IndependentRetryLineageReceipt["decision"]>()([
        "verified_variant_for_independent_retry",
      ]),
  },
  invariants: [
    "adapter_has_exactly_the_four_fields_and_four_own_callable_methods_and_is_frozen_on_registration",
    "adapter_subject_equals_every_input_and_output_question_subject",
    "question_reference_is_bodyless_and_has_exactly_five_choices",
    "presentation_has_exactly_positions_1_through_5_once",
    "presentation_carries_source_currentness_and_learning_reference_disclaimer",
    "client_never_supplies_correctness_error_cause_concepts_or_schedule",
    "evaluation_evidence_binds_exact_attempt_submission_question_and_adapter_version",
    "nonwithheld_evaluation_requires_key_choice_source_version_rights_and_reviewed_feedback_receipts",
    "reviewed_feedback_requires_named_owner_authorized_human_or_owner_approved_reviewer_and_model_alone_false",
    "withheld_or_unavailable_feedback_has_no_receipt_or_reviewer",
    "withheld_or_unavailable_evaluation_has_null_error_cause_concepts_gap_action_retry_and_review_schedule",
    "withheld_or_unavailable_attempt_records_no_review_task_concept_state_or_retry_queue",
    "evaluation_is_deterministic_for_exact_adapter_version_reference_attempt_submission",
    "independent_retry_builder_is_pure_and_deterministic_for_exact_adapter_version_and_input",
    "reviewed_evaluation_has_exactly_one_primary_concept_and_no_duplicate_concept_binding",
    "independent_retry_stays_in_subject_and_cannot_reuse_the_same_question_id_across_any_version",
    "unknown_missing_cross_subject_or_stale_binding_fails_closed",
    "adapter_makes_no_mastery_efficacy_calibration_or_official_result_claim",
  ],
} as const);

// SHA-256 over RFC-8785-equivalent recursively-key-sorted JSON for the exact
// descriptor above. The focused contract test recomputes and binds this value.
export const SUBJECT_ADAPTER_V1_INTERFACE_DIGEST =
  "3317bf9a450c9cecd8530a578eb540ffcf1ad133dcfc866676c95746409e6cbb" as const;

function fail(): never {
  throw new FirstStageKernelError("adapter_mismatch");
}

function exactText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") fail();
  const normalized = value.normalize("NFKC").replace(/\r\n?/gu, "\n").trim();
  if (!normalized || normalized.length > maximumLength) fail();
  return normalized;
}

function sameReference(left: QuestionReference, right: QuestionReference) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertAdapterIdentity(adapter: SubjectAdapterV1) {
  const exactKeys = [
    "schemaVersion", "adapterId", "adapterVersion", "subjectId",
    "assertQuestionReference", "presentQuestion", "evaluateSubmission",
    "buildIndependentRetry",
  ];
  const ownKeys = Reflect.ownKeys(adapter);
  if (
    ownKeys.some((key) => typeof key !== "string" || !exactKeys.includes(key)) ||
    ownKeys.length !== exactKeys.length ||
    adapter.schemaVersion !== SUBJECT_ADAPTER_SCHEMA_VERSION ||
    !FIRST_STAGE_SUBJECT_IDS.includes(adapter.subjectId) ||
    requiredIdentifier(adapter.adapterId) !== adapter.adapterId ||
    requiredIdentifier(adapter.adapterVersion) !== adapter.adapterVersion ||
    typeof adapter.assertQuestionReference !== "function" ||
    typeof adapter.presentQuestion !== "function" ||
    typeof adapter.evaluateSubmission !== "function" ||
    typeof adapter.buildIndependentRetry !== "function"
  ) fail();
}

export function validatePresentation(
  adapter: SubjectAdapterV1,
  reference: QuestionReference,
  value: unknown,
): McqQuestionPresentation {
  assertAdapterIdentity(adapter);
  if (reference.subjectId !== adapter.subjectId) fail();
  const row = exactObject(value, [
    "schemaVersion", "questionReference", "stem", "choices", "sourceStatusLabel",
    "currentnessStatusLabel", "learningReferenceDisclaimer",
  ]);
  if (
    row.schemaVersion !== "first_stage.mcq_question_presentation.v1" ||
    row.learningReferenceDisclaimer !== true ||
    !Array.isArray(row.choices) ||
    row.choices.length !== 5
  ) fail();
  const parsedReference = parseQuestionReference(row.questionReference);
  if (!sameReference(reference, parsedReference)) fail();
  const choices = row.choices.map((choice, index) => {
    const item = exactObject(choice, ["choiceId", "body"]);
    if (item.choiceId !== index + 1) fail();
    return Object.freeze({
      choiceId: (index + 1) as ChoiceId,
      body: exactText(item.body, 4_000),
    });
  });
  if (
    row.sourceStatusLabel !== reference.rightsState ||
    row.currentnessStatusLabel !== reference.currentnessState
  ) fail();
  return Object.freeze({
    schemaVersion: "first_stage.mcq_question_presentation.v1",
    questionReference: parsedReference,
    stem: exactText(row.stem, 12_000),
    choices: Object.freeze(choices),
    sourceStatusLabel: reference.rightsState,
    currentnessStatusLabel: reference.currentnessState,
    learningReferenceDisclaimer: true,
  });
}

function parseConceptBinding(value: unknown, subjectId: FirstStageSubjectId): ConceptBinding {
  const row = exactObject(value, [
    "schemaVersion", "conceptId", "conceptVersion", "subjectId", "role",
  ]);
  if (
    row.schemaVersion !== "first_stage.concept_binding.v1" ||
    row.subjectId !== subjectId ||
    !["primary", "supporting"].includes(String(row.role))
  ) fail();
  return Object.freeze({
    schemaVersion: "first_stage.concept_binding.v1",
    conceptId: requiredIdentifier(row.conceptId),
    conceptVersion: requiredIdentifier(row.conceptVersion),
    subjectId,
    role: row.role as ConceptBinding["role"],
  });
}

function parseEvidenceReference(value: unknown): ImmutableEvidenceReference {
  const row = exactObject(value, [
    "schemaVersion", "evidenceId", "evidenceVersion", "evidenceSha256",
  ]);
  if (
    row.schemaVersion !== "first_stage.immutable_evidence_reference.v1" ||
    typeof row.evidenceSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(row.evidenceSha256)
  ) fail();
  return Object.freeze({
    schemaVersion: "first_stage.immutable_evidence_reference.v1",
    evidenceId: requiredIdentifier(row.evidenceId),
    evidenceVersion: requiredIdentifier(row.evidenceVersion),
    evidenceSha256: row.evidenceSha256,
  });
}

function parseEvidenceEnvelope(
  adapter: SubjectAdapterV1,
  input: SubjectEvaluationInput,
  value: unknown,
  decision: AttemptEvaluation["decision"],
) {
  const row = exactObject(value, [
    "schemaVersion", "attemptId", "submissionSha256", "questionId", "questionVersion",
    "questionReferenceSha256", "subjectId", "adapterId", "adapterVersion", "officialKeyReference",
    "choiceSetReference", "sourceReference", "versionDecisionReference",
    "rightsDecisionReference", "reviewedFeedback",
  ]);
  if (
    row.schemaVersion !== "first_stage.attempt_evidence_envelope.v1" ||
    row.attemptId !== input.attempt.attemptId ||
    row.submissionSha256 !== input.submissionSha256 ||
    typeof row.submissionSha256 !== "string" ||
    !/^[0-9a-f]{64}$/u.test(row.submissionSha256) ||
    row.questionId !== input.questionReference.questionId ||
    row.questionVersion !== input.questionReference.questionVersion ||
    row.questionReferenceSha256 !== questionReferenceSha256(input.questionReference) ||
    row.subjectId !== input.questionReference.subjectId ||
    row.adapterId !== adapter.adapterId ||
    row.adapterVersion !== adapter.adapterVersion
  ) fail();
  const feedback = exactObject(row.reviewedFeedback, [
    "schemaVersion", "state", "receiptReference", "reviewerIdentity",
    "reviewerClass", "modelAlone",
  ]);
  if (
    feedback.schemaVersion !== "first_stage.reviewed_feedback_evidence.v1" ||
    !["reviewed_available", "withheld_rights_or_version", "not_emitted_unavailable"].includes(String(feedback.state)) ||
    feedback.modelAlone !== false
  ) fail();
  const reviewedAvailable = feedback.state === "reviewed_available";
  const unreviewed = decision === "unavailable" || decision === "withheld";
  const requiredFeedbackState = decision === "unavailable"
    ? "not_emitted_unavailable"
    : decision === "withheld"
      ? "withheld_rights_or_version"
      : "reviewed_available";
  if (
    feedback.state !== requiredFeedbackState ||
    reviewedAvailable !== (feedback.receiptReference !== null) ||
    reviewedAvailable !== (feedback.reviewerIdentity !== null) ||
    reviewedAvailable !== (feedback.reviewerClass !== null)
  ) fail();
  if (
    reviewedAvailable &&
    ![
      "named_owner_authorized_human_reviewer",
      "owner_approved_personal_feedback_reviewer",
    ].includes(String(feedback.reviewerClass))
  ) fail();
  const reviewedFeedback = Object.freeze({
    schemaVersion: "first_stage.reviewed_feedback_evidence.v1" as const,
    state: feedback.state as "reviewed_available" | "withheld_rights_or_version" | "not_emitted_unavailable",
    receiptReference: reviewedAvailable ? parseEvidenceReference(feedback.receiptReference) : null,
    reviewerIdentity: reviewedAvailable ? requiredIdentifier(feedback.reviewerIdentity) : null,
    reviewerClass: reviewedAvailable
      ? feedback.reviewerClass as "named_owner_authorized_human_reviewer" | "owner_approved_personal_feedback_reviewer"
      : null,
    modelAlone: false as const,
  });
  const officialKeyReference = row.officialKeyReference === null
    ? null : parseEvidenceReference(row.officialKeyReference);
  const choiceSetReference = row.choiceSetReference === null
    ? null : parseEvidenceReference(row.choiceSetReference);
  if (
    (unreviewed && (reviewedAvailable || officialKeyReference !== null || choiceSetReference !== null)) ||
    (!unreviewed && (!reviewedAvailable || !officialKeyReference || !choiceSetReference))
  ) fail();
  return Object.freeze({
    schemaVersion: "first_stage.attempt_evidence_envelope.v1" as const,
    attemptId: input.attempt.attemptId,
    submissionSha256: input.submissionSha256,
    questionId: input.questionReference.questionId,
    questionVersion: input.questionReference.questionVersion,
    questionReferenceSha256: questionReferenceSha256(input.questionReference),
    subjectId: input.questionReference.subjectId,
    adapterId: adapter.adapterId,
    adapterVersion: adapter.adapterVersion,
    officialKeyReference,
    choiceSetReference,
    sourceReference: parseEvidenceReference(row.sourceReference),
    versionDecisionReference: parseEvidenceReference(row.versionDecisionReference),
    rightsDecisionReference: parseEvidenceReference(row.rightsDecisionReference),
    reviewedFeedback,
  });
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const row = value as Record<string, unknown>;
  return `{${Object.keys(row).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(row[key])}`).join(",")}}`;
}

function questionReferenceSha256(reference: QuestionReference) {
  return crypto.createHash("sha256").update(canonicalJson(reference)).digest("hex");
}

export function validateAttemptEvaluation(
  adapter: SubjectAdapterV1,
  input: SubjectEvaluationInput,
  value: unknown,
): AttemptEvaluation {
  assertAdapterIdentity(adapter);
  if (
    input.schemaVersion !== "first_stage.subject_evaluation_input.v1" ||
    input.questionReference.subjectId !== adapter.subjectId ||
    input.attempt.questionReference.subjectId !== adapter.subjectId ||
    !sameReference(input.questionReference, input.attempt.questionReference) ||
    input.attempt.state !== "in_progress" ||
    input.attempt.submission !== null ||
    input.attempt.evaluation !== null
  ) fail();
  const row = exactObject(value, [
    "schemaVersion", "decision", "errorCause", "conceptBindings", "biggestGapCode",
    "nextActionCode", "retryDisposition", "reviewAfterMs", "evaluationPolicyVersion",
    "evidenceEnvelope",
  ]);
  const decision = row.decision as AttemptEvaluationDecision;
  const unreviewed = decision === "unavailable" || decision === "withheld";
  if (
    row.schemaVersion !== "first_stage.attempt_evaluation.v1" ||
    !["correct", "incorrect", "unanswered", "unavailable", "withheld"].includes(String(row.decision))
  ) fail();
  if (unreviewed) {
    if (
      row.errorCause !== null ||
      row.conceptBindings !== null ||
      row.biggestGapCode !== null ||
      row.nextActionCode !== null ||
      row.retryDisposition !== null ||
      row.reviewAfterMs !== null
    ) fail();
    return Object.freeze({
      schemaVersion: "first_stage.attempt_evaluation.v1",
      decision,
      errorCause: null,
      conceptBindings: null,
      biggestGapCode: null,
      nextActionCode: null,
      retryDisposition: null,
      reviewAfterMs: null,
      evaluationPolicyVersion: requiredIdentifier(row.evaluationPolicyVersion),
      evidenceEnvelope: parseEvidenceEnvelope(adapter, input, row.evidenceEnvelope, decision),
    });
  }
  if (
    !["retry_now", "review_then_retry", "review_before_new_variant"].includes(String(row.retryDisposition)) ||
    !Array.isArray(row.conceptBindings) ||
    row.conceptBindings.length < 1 ||
    row.conceptBindings.length > 16
  ) fail();
  const concepts = row.conceptBindings.map((item) => parseConceptBinding(item, adapter.subjectId));
  if (concepts.filter((item) => item.role === "primary").length !== 1) fail();
  const identities = concepts.map((item) => `${item.conceptId}@${item.conceptVersion}`);
  if (new Set(identities).size !== identities.length) fail();
  const errorCause = row.errorCause === null
    ? null
    : ERROR_CAUSES.includes(row.errorCause as (typeof ERROR_CAUSES)[number])
      ? row.errorCause as (typeof ERROR_CAUSES)[number]
      : fail();
  const selectedChoice = input.submission.selectedChoice;
  if (
    (selectedChoice === null && row.decision !== "unanswered") ||
    (selectedChoice !== null && row.decision === "unanswered") ||
    (row.decision === "correct" && errorCause !== null) ||
    (row.decision === "incorrect" && errorCause === null) ||
    (row.decision === "unanswered" && errorCause !== null)
  ) fail();
  const reviewAfterMs = requiredSafeInteger(row.reviewAfterMs, 0, 2_592_000_000);
  if (
    (row.retryDisposition === "retry_now" && reviewAfterMs !== 0) ||
    (row.retryDisposition !== "retry_now" && reviewAfterMs === 0)
  ) fail();
  return Object.freeze({
    schemaVersion: "first_stage.attempt_evaluation.v1",
    decision,
    errorCause,
    conceptBindings: Object.freeze(concepts),
    biggestGapCode: requiredIdentifier(row.biggestGapCode),
    nextActionCode: requiredIdentifier(row.nextActionCode),
    retryDisposition: row.retryDisposition as RetryDisposition,
    reviewAfterMs,
    evaluationPolicyVersion: requiredIdentifier(row.evaluationPolicyVersion),
    evidenceEnvelope: parseEvidenceEnvelope(
      adapter,
      input,
      row.evidenceEnvelope,
      row.decision as AttemptEvaluation["decision"],
    ),
  });
}

export class SubjectAdapterRegistry {
  readonly #adapters = new Map<FirstStageSubjectId, SubjectAdapterV1>();

  register(adapter: SubjectAdapterV1) {
    assertAdapterIdentity(adapter);
    if (this.#adapters.has(adapter.subjectId)) fail();
    Object.freeze(adapter);
    const snapshot: SubjectAdapterV1 = Object.freeze({
      schemaVersion: adapter.schemaVersion,
      adapterId: adapter.adapterId,
      adapterVersion: adapter.adapterVersion,
      subjectId: adapter.subjectId,
      assertQuestionReference: adapter.assertQuestionReference.bind(adapter),
      presentQuestion: adapter.presentQuestion.bind(adapter),
      evaluateSubmission: adapter.evaluateSubmission.bind(adapter),
      buildIndependentRetry: adapter.buildIndependentRetry.bind(adapter),
    });
    this.#adapters.set(snapshot.subjectId, snapshot);
    return this;
  }

  require(subjectId: FirstStageSubjectId) {
    const adapter = this.#adapters.get(subjectId);
    if (!adapter) throw new FirstStageKernelError("adapter_unavailable");
    return adapter;
  }

  subjects() {
    return Object.freeze([...this.#adapters.keys()].sort());
  }
}

export function createSubjectAdapterRegistry(adapters: readonly SubjectAdapterV1[] = []) {
  const registry = new SubjectAdapterRegistry();
  for (const adapter of adapters) registry.register(adapter);
  return registry;
}
