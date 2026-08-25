export const FIRST_STAGE_KERNEL_SCHEMA_VERSION =
  "dabangil.first_stage.common_mcq_kernel.v1" as const;
export const FIRST_STAGE_FEATURE_FLAG =
  "INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED" as const;
export const FIRST_STAGE_OWNER_ALLOWLIST =
  "INVERGE_OWNER_FIRST_STAGE_EMAILS" as const;

export const FIRST_STAGE_SUBJECT_IDS = [
  "civil_law",
  "economics_principles",
  "real_estate_principles",
  "appraiser_related_law",
  "accounting",
] as const;
export type FirstStageSubjectId = (typeof FIRST_STAGE_SUBJECT_IDS)[number];

export const CHOICE_IDS = [1, 2, 3, 4, 5] as const;
export type ChoiceId = (typeof CHOICE_IDS)[number];
export const CONFIDENCE_VALUES = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_VALUES)[number];
export const ERROR_CAUSES = ["K", "C", "A", "R", "T", "G"] as const;
export type ErrorCause = (typeof ERROR_CAUSES)[number];

export type ElapsedTimeBucket =
  | "0_29999"
  | "30000_59999"
  | "60000_119999"
  | "120000_plus";
export type ElapsedTime = Readonly<{
  milliseconds: number;
  bucket: ElapsedTimeBucket;
}>;

export type WorkTraceStepKind =
  | "read_stem"
  | "read_all_choices"
  | "eliminate_choice"
  | "calculate"
  | "source_check"
  | "change_answer"
  | "select_answer";
export type WorkTraceStep = Readonly<{
  sequence: number;
  kind: WorkTraceStepKind;
  atElapsedMs: number;
  choiceId: ChoiceId | null;
}>;
export type WorkTrace = Readonly<{
  schemaVersion: "first_stage.work_trace.v1";
  steps: readonly WorkTraceStep[];
}>;

export type QuestionReference = Readonly<{
  schemaVersion: "first_stage.question_reference.v1";
  questionId: string;
  questionVersion: string;
  subjectId: FirstStageSubjectId;
  examYear: number;
  examRound: number;
  sessionId: string;
  questionNumber: number;
  choiceCount: 5;
  sourceVersionManifestIds: readonly string[];
  rightsState: "verified_owner_private" | "verified_cleared";
  currentnessState: "verified_exam_date" | "verified_current";
}>;

export type AnswerSubmission = Readonly<{
  schemaVersion: "first_stage.answer_submission.v1";
  selectedChoice: ChoiceId | null;
  confidence: Confidence;
  elapsedTime: ElapsedTime;
  answerChanged: boolean;
  previousChoice: ChoiceId | null;
  eliminatedChoiceIds: readonly ChoiceId[];
  workTrace: WorkTrace;
  submittedAt: string;
}>;

export type AttemptKind = "initial" | "independent_retry";
export type AttemptEvaluationDecision =
  | "correct"
  | "incorrect"
  | "unanswered"
  | "withheld";
export type RetryDisposition =
  | "retry_now"
  | "review_then_retry"
  | "review_before_new_variant";

export type ConceptBinding = Readonly<{
  schemaVersion: "first_stage.concept_binding.v1";
  conceptId: string;
  conceptVersion: string;
  subjectId: FirstStageSubjectId;
  role: "primary" | "supporting";
}>;

export type ImmutableEvidenceReference = Readonly<{
  schemaVersion: "first_stage.immutable_evidence_reference.v1";
  evidenceId: string;
  evidenceVersion: string;
  evidenceSha256: string;
}>;

export type ReviewedFeedbackEvidence = Readonly<{
  schemaVersion: "first_stage.reviewed_feedback_evidence.v1";
  state:
    | "reviewed_available"
    | "withheld_rights_or_version"
    | "not_emitted_unavailable";
  receiptReference: ImmutableEvidenceReference | null;
  reviewerIdentity: string | null;
  reviewerClass:
    | "named_owner_authorized_human_reviewer"
    | "owner_approved_personal_feedback_reviewer"
    | null;
  modelAlone: false;
}>;

export type AttemptEvidenceEnvelope = Readonly<{
  schemaVersion: "first_stage.attempt_evidence_envelope.v1";
  attemptId: string;
  submissionSha256: string;
  questionId: string;
  questionVersion: string;
  subjectId: FirstStageSubjectId;
  adapterId: string;
  adapterVersion: string;
  officialKeyReference: ImmutableEvidenceReference | null;
  choiceSetReference: ImmutableEvidenceReference | null;
  sourceReference: ImmutableEvidenceReference;
  versionDecisionReference: ImmutableEvidenceReference;
  rightsDecisionReference: ImmutableEvidenceReference;
  reviewedFeedback: ReviewedFeedbackEvidence;
}>;

export type AttemptEvaluation = Readonly<{
  schemaVersion: "first_stage.attempt_evaluation.v1";
  decision: AttemptEvaluationDecision;
  errorCause: ErrorCause | null;
  conceptBindings: readonly ConceptBinding[];
  biggestGapCode: string;
  nextActionCode: string;
  retryDisposition: RetryDisposition;
  reviewAfterMs: number;
  evaluationPolicyVersion: string;
  evidenceEnvelope: AttemptEvidenceEnvelope;
}>;

export type Attempt = Readonly<{
  schemaVersion: "first_stage.attempt.v1";
  attemptId: string;
  examCycleId: string;
  questionReference: QuestionReference;
  kind: AttemptKind;
  sourceAttemptId: string | null;
  reviewTaskId: string | null;
  exposureState: "first_exposure" | "repeated_exposure" | "verified_variant";
  assistanceLevel: "none" | "hint_or_scaffold" | "answer_revealed";
  startedAt: string;
  state: "in_progress" | "evaluated";
  submission: AnswerSubmission | null;
  evaluation: AttemptEvaluation | null;
}>;

export type ReviewTask = Readonly<{
  schemaVersion: "first_stage.review_task.v1";
  reviewTaskId: string;
  examCycleId: string;
  sourceAttemptId: string;
  questionReference: QuestionReference;
  conceptBindings: readonly ConceptBinding[];
  errorCause: ErrorCause | null;
  disposition: RetryDisposition;
  priority: "critical" | "high" | "normal";
  dueAt: string;
  status: "pending" | "retry_active" | "completed";
  completedAt: string | null;
}>;

export type IndependentRetryLineageReceipt = Readonly<{
  schemaVersion: "first_stage.independent_retry_lineage_receipt.v1";
  receiptId: string;
  receiptVersion: string;
  adapterId: string;
  adapterVersion: string;
  subjectId: FirstStageSubjectId;
  sourceQuestionId: string;
  sourceQuestionVersion: string;
  variantQuestionId: string;
  variantQuestionVersion: string;
  targetConceptBindingKeys: readonly string[];
  priorRetryCount: number;
  decision: "verified_variant_for_independent_retry";
}>;

export type IndependentRetry = Readonly<{
  schemaVersion: "first_stage.independent_retry.v1";
  independentRetryId: string;
  reviewTaskId: string;
  sourceAttemptId: string;
  retryAttemptId: string;
  questionReference: QuestionReference;
  adapterId: string;
  adapterVersion: string;
  lineageReceipt: IndependentRetryLineageReceipt;
  assistanceLevel: "none";
  startedAt: string;
  completedAt: string | null;
  outcome: "active" | "succeeded" | "failed";
}>;

export type ConceptOperationalState =
  | "unobserved"
  | "review_required"
  | "independent_retry_due"
  | "independent_retry_recorded"
  | "reopened";
export type ConceptState = Readonly<{
  schemaVersion: "first_stage.concept_state.v1";
  binding: ConceptBinding;
  state: ConceptOperationalState;
  lastAttemptId: string;
  evidenceAttemptIds: readonly string[];
  updatedAt: string;
  masteryClaim: false;
}>;

export type ExamCycle = Readonly<{
  schemaVersion: "first_stage.exam_cycle.v1";
  examCycleId: string;
  ownerId: string;
  mode: "today" | "full_day";
  state: "ready" | "active" | "completed";
  questionReferences: readonly QuestionReference[];
  startedAt: string | null;
  completedAt: string | null;
}>;

export type FirstStageKernelState = Readonly<{
  schemaVersion: typeof FIRST_STAGE_KERNEL_SCHEMA_VERSION;
  revision: number;
  examCycle: ExamCycle;
  attempts: readonly Attempt[];
  reviewTasks: readonly ReviewTask[];
  independentRetries: readonly IndependentRetry[];
  conceptStates: readonly ConceptState[];
}>;

export class FirstStageKernelError extends Error {
  readonly code:
      | "invalid_input"
      | "invalid_transition"
      | "adapter_mismatch"
      | "adapter_unavailable"
      | "stale_state"
      | "not_found";

  constructor(code: FirstStageKernelError["code"]) {
    super(`first-stage-kernel:${code}`);
    this.code = code;
  }
}

function fail(): never {
  throw new FirstStageKernelError("invalid_input");
}

export function exactObject(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  const row = value as Record<string, unknown>;
  const actual = Object.keys(row);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) {
    fail();
  }
  return row;
}

export function requiredIdentifier(value: unknown, maximumLength = 160) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    !/^[A-Za-z0-9][A-Za-z0-9._:@/-]*$/u.test(value)
  ) fail();
  return value;
}

export function requiredUtcInstant(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(Date.parse(value)).toISOString() !== value
  ) fail();
  return value;
}

export function requiredSafeInteger(value: unknown, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    fail();
  }
  return Number(value);
}

function requiredEnum<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) fail();
  return value as T;
}

export function elapsedTimeBucket(milliseconds: number): ElapsedTimeBucket {
  requiredSafeInteger(milliseconds, 0, 86_400_000);
  if (milliseconds < 30_000) return "0_29999";
  if (milliseconds < 60_000) return "30000_59999";
  if (milliseconds < 120_000) return "60000_119999";
  return "120000_plus";
}

function parseChoice(value: unknown, nullable = false): ChoiceId | null {
  if (nullable && value === null) return null;
  const parsed = requiredSafeInteger(value, 1, 5);
  return parsed as ChoiceId;
}

export function parseQuestionReference(value: unknown): QuestionReference {
  const row = exactObject(value, [
    "schemaVersion", "questionId", "questionVersion", "subjectId", "examYear",
    "examRound", "sessionId", "questionNumber", "choiceCount",
    "sourceVersionManifestIds", "rightsState", "currentnessState",
  ]);
  if (row.schemaVersion !== "first_stage.question_reference.v1" || row.choiceCount !== 5) fail();
  if (!Array.isArray(row.sourceVersionManifestIds) || row.sourceVersionManifestIds.length < 1 || row.sourceVersionManifestIds.length > 16) fail();
  const manifests = row.sourceVersionManifestIds.map((item) => requiredIdentifier(item));
  if (new Set(manifests).size !== manifests.length) fail();
  return Object.freeze({
    schemaVersion: "first_stage.question_reference.v1",
    questionId: requiredIdentifier(row.questionId),
    questionVersion: requiredIdentifier(row.questionVersion),
    subjectId: requiredEnum(row.subjectId, FIRST_STAGE_SUBJECT_IDS),
    examYear: requiredSafeInteger(row.examYear, 2000, 2200),
    examRound: requiredSafeInteger(row.examRound, 1, 999),
    sessionId: requiredIdentifier(row.sessionId),
    questionNumber: requiredSafeInteger(row.questionNumber, 1, 200),
    choiceCount: 5,
    sourceVersionManifestIds: Object.freeze(manifests),
    rightsState: requiredEnum(row.rightsState, ["verified_owner_private", "verified_cleared"] as const),
    currentnessState: requiredEnum(row.currentnessState, ["verified_exam_date", "verified_current"] as const),
  });
}

function parseWorkTrace(value: unknown, elapsedMs: number): WorkTrace {
  const row = exactObject(value, ["schemaVersion", "steps"]);
  if (
    row.schemaVersion !== "first_stage.work_trace.v1" ||
    !Array.isArray(row.steps) ||
    row.steps.length < 1 ||
    row.steps.length > 64
  ) fail();
  let priorElapsed = -1;
  const steps = row.steps.map((item, index) => {
    const step = exactObject(item, ["sequence", "kind", "atElapsedMs", "choiceId"]);
    const atElapsedMs = requiredSafeInteger(step.atElapsedMs, 0, elapsedMs);
    if (step.sequence !== index + 1 || atElapsedMs < priorElapsed) fail();
    priorElapsed = atElapsedMs;
    const kind = requiredEnum(step.kind, [
      "read_stem", "read_all_choices", "eliminate_choice", "calculate",
      "source_check", "change_answer", "select_answer",
    ] as const);
    const choiceId = parseChoice(step.choiceId, true);
    if (["eliminate_choice", "change_answer", "select_answer"].includes(kind) !== (choiceId !== null)) fail();
    return Object.freeze({ sequence: index + 1, kind, atElapsedMs, choiceId });
  });
  return Object.freeze({ schemaVersion: "first_stage.work_trace.v1", steps: Object.freeze(steps) });
}

export function parseAnswerSubmission(
  value: unknown,
  trustedClock: Readonly<{ attemptStartedAt: string; submittedAt: string }>,
): AnswerSubmission {
  const row = exactObject(value, [
    "schemaVersion", "selectedChoice", "confidence", "answerChanged",
    "previousChoice", "eliminatedChoiceIds", "workTrace",
  ]);
  if (row.schemaVersion !== "first_stage.answer_submission.v1" || typeof row.answerChanged !== "boolean") fail();
  const startedAt = requiredUtcInstant(trustedClock.attemptStartedAt);
  const submittedAt = requiredUtcInstant(trustedClock.submittedAt);
  const milliseconds = Date.parse(submittedAt) - Date.parse(startedAt);
  requiredSafeInteger(milliseconds, 0, 86_400_000);
  const bucket = elapsedTimeBucket(milliseconds);
  const selectedChoice = parseChoice(row.selectedChoice, true);
  const previousChoice = parseChoice(row.previousChoice, true);
  if (!Array.isArray(row.eliminatedChoiceIds) || row.eliminatedChoiceIds.length > 5) fail();
  const eliminatedChoiceIds = row.eliminatedChoiceIds.map((item) => parseChoice(item) as ChoiceId);
  if (new Set(eliminatedChoiceIds).size !== eliminatedChoiceIds.length || (selectedChoice !== null && eliminatedChoiceIds.includes(selectedChoice))) fail();
  if (row.answerChanged) {
    if (selectedChoice === null || previousChoice === null || selectedChoice === previousChoice) fail();
  } else if (previousChoice !== null) fail();
  const workTrace = parseWorkTrace(row.workTrace, milliseconds);
  const tracedEliminations = workTrace.steps
    .filter((step) => step.kind === "eliminate_choice")
    .map((step) => step.choiceId as ChoiceId);
  if (
    new Set(tracedEliminations).size !== tracedEliminations.length ||
    tracedEliminations.length !== eliminatedChoiceIds.length ||
    tracedEliminations.some((choice) => !eliminatedChoiceIds.includes(choice))
  ) fail();
  const answerSteps = workTrace.steps.filter((step) =>
    step.kind === "select_answer" || step.kind === "change_answer",
  );
  let tracedChoice: ChoiceId | null = null;
  let choiceImmediatelyBeforeFinalChange: ChoiceId | null = null;
  let changeCount = 0;
  for (const step of workTrace.steps) {
    if (step.kind === "select_answer") {
      if (tracedChoice !== null || step.choiceId === null || eliminatedChoiceIds.includes(step.choiceId)) fail();
      tracedChoice = step.choiceId;
    }
    if (step.kind === "change_answer") {
      if (
        tracedChoice === null ||
        step.choiceId === null ||
        step.choiceId === tracedChoice ||
        eliminatedChoiceIds.includes(step.choiceId)
      ) fail();
      choiceImmediatelyBeforeFinalChange = tracedChoice;
      tracedChoice = step.choiceId;
      changeCount += 1;
    }
  }
  if (
    (selectedChoice === null && answerSteps.length !== 0) ||
    (selectedChoice !== null && tracedChoice !== selectedChoice) ||
    (row.answerChanged && (changeCount < 1 || previousChoice !== choiceImmediatelyBeforeFinalChange)) ||
    (!row.answerChanged && (changeCount !== 0 || answerSteps.length !== (selectedChoice === null ? 0 : 1)))
  ) fail();
  return Object.freeze({
    schemaVersion: "first_stage.answer_submission.v1",
    selectedChoice,
    confidence: requiredEnum(row.confidence, CONFIDENCE_VALUES),
    elapsedTime: Object.freeze({ milliseconds, bucket }),
    answerChanged: row.answerChanged,
    previousChoice,
    eliminatedChoiceIds: Object.freeze(eliminatedChoiceIds),
    workTrace,
    submittedAt,
  });
}

export function parseJsonRejectingDuplicateKeys(source: string): unknown {
  if (!source || source.length > 20_000) fail();
  let index = 0;
  const whitespace = () => { while (/\s/u.test(source[index] ?? "")) index += 1; };
  const stringValue = () => {
    const start = index;
    if (source[index] !== '"') fail();
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") { index += 2; continue; }
      if (source[index] === '"') {
        index += 1;
        try { return JSON.parse(source.slice(start, index)) as string; } catch { fail(); }
      }
      if (source.charCodeAt(index) < 0x20) fail();
      index += 1;
    }
    fail();
  };
  const value = (depth: number): void => {
    if (depth > 32) fail();
    whitespace();
    if (source[index] === "{") {
      index += 1; whitespace();
      const keys = new Set<string>();
      if (source[index] === "}") { index += 1; return; }
      while (index < source.length) {
        whitespace(); const key = stringValue();
        if (keys.has(key)) fail(); keys.add(key); whitespace();
        if (source[index] !== ":") fail(); index += 1; value(depth + 1); whitespace();
        if (source[index] === "}") { index += 1; return; }
        if (source[index] !== ",") fail(); index += 1;
      }
      fail();
    }
    if (source[index] === "[") {
      index += 1; whitespace();
      if (source[index] === "]") { index += 1; return; }
      while (index < source.length) {
        value(depth + 1); whitespace();
        if (source[index] === "]") { index += 1; return; }
        if (source[index] !== ",") fail(); index += 1;
      }
      fail();
    }
    if (source[index] === '"') { stringValue(); return; }
    const match = source.slice(index).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u);
    if (!match) fail();
    index += match[0].length;
  };
  value(0); whitespace();
  if (index !== source.length) fail();
  try { return JSON.parse(source) as unknown; } catch { fail(); }
}
