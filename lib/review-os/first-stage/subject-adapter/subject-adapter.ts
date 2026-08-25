import {
  ERROR_CAUSES,
  FIRST_STAGE_SUBJECT_IDS,
  FirstStageKernelError,
  exactObject,
  parseQuestionReference,
  requiredIdentifier,
  requiredSafeInteger,
  type AnswerSubmission,
  type Attempt,
  type AttemptEvaluation,
  type AttemptEvaluationDecision,
  type ChoiceId,
  type ConceptBinding,
  type FirstStageSubjectId,
  type IndependentRetry,
  type IndependentRetryLineageReceipt,
  type ImmutableEvidenceReference,
  type QuestionReference,
  type ReviewTask,
  type RetryDisposition,
} from "../kernel/domain";

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

function deepFreeze<const T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    const row = value as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(value)) deepFreeze(row[key]);
    Object.freeze(value);
  }
  return value;
}

export const SUBJECT_ADAPTER_V1_INTERFACE_DESCRIPTOR = deepFreeze({
  schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
  interfaceName: "SubjectAdapterV1",
  subjects: FIRST_STAGE_SUBJECT_IDS,
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
    SubjectAdapterV1: [
      "schemaVersion", "adapterId", "adapterVersion", "subjectId",
      "assertQuestionReference", "presentQuestion", "evaluateSubmission",
      "buildIndependentRetry",
    ],
    SubjectEvaluationInput: [
      "schemaVersion", "questionReference", "attempt", "submission", "submissionSha256",
    ],
    IndependentRetryInput: [
      "schemaVersion", "sourceQuestionReference", "sourceAttempt", "reviewTask",
      "priorRetries",
    ],
    IndependentRetryCandidate: [
      "schemaVersion", "questionReference", "lineageReceipt",
    ],
    IndependentRetryLineageReceipt: [
      "schemaVersion", "receiptId", "receiptVersion", "adapterId", "adapterVersion",
      "subjectId", "sourceQuestionId", "sourceQuestionVersion", "variantQuestionId",
      "variantQuestionVersion", "targetConceptBindingKeys", "priorRetryCount", "decision",
    ],
    IndependentRetry: [
      "schemaVersion", "independentRetryId", "reviewTaskId", "sourceAttemptId",
      "retryAttemptId", "questionReference", "adapterId", "adapterVersion",
      "lineageReceipt", "assistanceLevel", "startedAt", "completedAt", "outcome",
    ],
    McqQuestionPresentation: [
      "schemaVersion", "questionReference", "stem", "choices", "sourceStatusLabel",
      "currentnessStatusLabel", "learningReferenceDisclaimer",
    ],
    AttemptEvaluation: [
      "schemaVersion", "decision", "errorCause", "conceptBindings", "biggestGapCode",
      "nextActionCode", "retryDisposition", "reviewAfterMs", "evaluationPolicyVersion",
      "evidenceEnvelope",
    ],
    AttemptEvaluationDecision: [
      "correct", "incorrect", "unanswered", "unavailable", "withheld",
    ],
    AttemptEvidenceEnvelope: [
      "schemaVersion", "attemptId", "submissionSha256", "questionId", "questionVersion",
      "subjectId", "adapterId", "adapterVersion", "officialKeyReference",
      "choiceSetReference", "sourceReference", "versionDecisionReference",
      "rightsDecisionReference", "reviewedFeedback",
    ],
    ImmutableEvidenceReference: [
      "schemaVersion", "evidenceId", "evidenceVersion", "evidenceSha256",
    ],
    ReviewedFeedbackEvidence: [
      "schemaVersion", "state", "receiptReference", "reviewerIdentity",
      "reviewerClass", "modelAlone",
    ],
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
    "reviewed_evaluation_has_exactly_one_primary_concept_and_no_duplicate_concept_binding",
    "independent_retry_stays_in_subject_and_cannot_reuse_the_same_question_identity",
    "unknown_missing_cross_subject_or_stale_binding_fails_closed",
    "adapter_makes_no_mastery_efficacy_calibration_or_official_result_claim",
  ],
} as const);

// SHA-256 over RFC-8785-equivalent recursively-key-sorted JSON for the exact
// descriptor above. The focused contract test recomputes and binds this value.
export const SUBJECT_ADAPTER_V1_INTERFACE_DIGEST =
  "3ab5255ae09124d8c1f242cf2e5806e71392123613cdcd9aef403adc97ad2ba1" as const;

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
    "subjectId", "adapterId", "adapterVersion", "officialKeyReference",
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
