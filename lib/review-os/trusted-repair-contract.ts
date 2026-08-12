export const TRUSTED_REPAIR_CONTRACT_VERSION =
  "wcv_c2_trusted_repair.v1" as const;
export const TRUSTED_REPAIR_FIXTURE_VERSION =
  "wcv_c2_rights_safe_fixtures.2026-08-12.v1" as const;
export const TRUSTED_REPAIR_RUBRIC_VERSION =
  "wcv_c2_semantic_anchor_rubric.v1" as const;
export const TRUSTED_REPAIR_POLICY_VERSION =
  "wcv_c2_exposure_and_independence_policy.v1" as const;
export const TRUSTED_REPAIR_VALIDATOR_VERSION =
  "wcv_c2_deterministic_subject_oracles.v1" as const;
export const TRUSTED_REPAIR_FLAG = "WCV_C2_TRUSTED_REPAIR_ENABLED" as const;

export const TRUSTED_REPAIR_SUBJECTS = [
  "appraisal_practical",
  "appraisal_theory",
  "appraisal_compensation_law",
] as const;
export type TrustedRepairSubject = (typeof TRUSTED_REPAIR_SUBJECTS)[number];

export const TRUSTED_REPAIR_INPUT_MODES = [
  "TYPED_TEXT",
  "EDITABLE_PHOTO_OCR",
  "EDITABLE_PDF_OCR",
  "EDITABLE_VOICE_TRANSCRIPTION",
  "STRUCTURED_SELECTION",
] as const;
export type TrustedRepairInputMode =
  (typeof TRUSTED_REPAIR_INPUT_MODES)[number];

export const TRUSTED_REPAIR_PATHS = [
  "WORKED_CONCEPT_FIRST",
  "LEARNER_GENERATED",
  "UPLOAD_EXISTING_ARTIFACT",
  "VOICE_TEACH_BACK",
  "STRUCTURED_SELECTION",
  "QUICK_VERIFICATION",
] as const;
export type TrustedRepairPath = (typeof TRUSTED_REPAIR_PATHS)[number];

export const TRUSTED_REPAIR_CONTINUATIONS = [
  "VERIFY_AND_CONTINUE",
  "DEFER_FOR_NOW",
  "SWITCH_TO_GUIDED",
] as const;
export type TrustedRepairContinuation =
  (typeof TRUSTED_REPAIR_CONTINUATIONS)[number];

export const TRUSTED_REPAIR_STATES = [
  "editable_capture_draft",
  "revision_confirmed",
  "prediction_committed",
  "independent_attempt_committed",
  "self_diagnosis_committed",
  "diagnosed",
  "exposure_committed",
  "repair_submitted",
  "verified",
  "partial",
  "guided",
  "deferred",
  "blocked",
  "uncertain",
  "stale",
] as const;
export type TrustedRepairState = (typeof TRUSTED_REPAIR_STATES)[number];

export const TRUSTED_REPAIR_OUTCOMES = [
  "verified",
  "partial",
  "guided",
  "deferred",
  "blocked",
  "uncertain",
  "stale",
] as const;
export type TrustedRepairOutcome = (typeof TRUSTED_REPAIR_OUTCOMES)[number];

export const TRUSTED_REPAIR_ARTIFACT_KINDS = [
  "capture_draft",
  "confirmed_revision",
  "independent_attempt",
  "repair_submission",
] as const;
export type TrustedRepairArtifactKind =
  (typeof TRUSTED_REPAIR_ARTIFACT_KINDS)[number];

export const TRUSTED_REPAIR_RIGHTS_CLASSES = [
  "INVERGE_ORIGINAL_SYNTHETIC",
  "RIGHTS_CLEARED_OFFICIAL_METADATA",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "EXACT_APPROVED_FIXTURE_MATERIAL",
  "ACADEMY",
  "TEXTBOOK",
  "MOCK_EXAM",
  "LECTURE",
  "LEARNER_PRIVATE",
  "RIGHTS_UNKNOWN",
] as const;
export type TrustedRepairRightsClass =
  (typeof TRUSTED_REPAIR_RIGHTS_CLASSES)[number];

export const TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES = [
  "INVERGE_ORIGINAL_SYNTHETIC",
  "RIGHTS_CLEARED_OFFICIAL_METADATA",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "EXACT_APPROVED_FIXTURE_MATERIAL",
] as const satisfies readonly TrustedRepairRightsClass[];

export const TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES = [
  "ACADEMY",
  "TEXTBOOK",
  "MOCK_EXAM",
  "LECTURE",
  "LEARNER_PRIVATE",
  "RIGHTS_UNKNOWN",
] as const satisfies readonly TrustedRepairRightsClass[];

export const TRUSTED_REPAIR_RELEASE_STATES = [
  "DRAFT",
  "AUTOMATED_CHECKED",
  "LEARNING_USABLE",
  "TRANSFER_QUALIFIED",
  "MEASUREMENT_CALIBRATED",
  "DISPUTED",
  "STALE",
  "BLOCKED",
  "RETIRED",
] as const;
export type TrustedRepairReleaseState =
  (typeof TRUSTED_REPAIR_RELEASE_STATES)[number];

export const TRUSTED_REPAIR_LOAD_BUDGET = {
  maximumGapCandidates: 3,
  primaryGapCount: 1,
  scaffoldCountPerExposure: 1,
  initialAssistanceLevel: 0,
  smallestScaffoldAssistanceLevel: 1,
  guidedAssistanceLevel: 3,
} as const;

export const TRUSTED_REPAIR_STEP_GUIDANCE = {
  editable_capture_draft: {
    learningPurposeKo: "기계 초안을 학습자 자신의 수정본으로 확정한다.",
    nextActionKo: "초안을 고친 뒤 수정본으로 확정하세요.",
  },
  revision_confirmed: {
    learningPurposeKo: "도움 전 예상 결과를 명시해 메타인지 기준을 남긴다.",
    nextActionKo: "예상 결과와 확신 수준을 고르세요.",
  },
  prediction_committed: {
    learningPurposeKo: "어떤 도움도 보기 전에 독립 근거를 남긴다.",
    nextActionKo: "도움 없이 답을 직접 구성하세요.",
  },
  independent_attempt_committed: {
    learningPurposeKo: "서버 진단 전에 학습자가 자신의 가장 큰 빈틈을 예측한다.",
    nextActionKo: "가장 큰 빈틈 유형을 하나 고르세요.",
  },
  self_diagnosis_committed: {
    learningPurposeKo: "독립 시도를 고정된 의미 앵커와 대조한다.",
    nextActionKo: "근거 기반 진단을 실행하세요.",
  },
  diagnosed: {
    learningPurposeKo: "최대 세 후보 중 결정적인 한 지점에 인지 부하를 모은다.",
    nextActionKo: "가장 작은 도움 하나를 여세요.",
  },
  exposure_committed: {
    learningPurposeKo: "커밋된 최소 도움 뒤에 학습자가 직접 재구성한다.",
    nextActionKo: "보지 않고 복구 답안을 다시 쓰세요.",
  },
  repair_submitted: {
    learningPurposeKo: "같은 세션의 한 성공 기준만 직접 재검증한다.",
    nextActionKo: "검증, 보류 또는 가이드 전환 중 하나를 고르세요.",
  },
} as const;

export type TrustedRepairReleaseSignal =
  | "automated_checks_passed"
  | "owner_learning_approved"
  | "transfer_qualified"
  | "measurement_calibrated"
  | "disputed"
  | "stale"
  | "blocked"
  | "retired";

export function trustedRepairReleaseTransition(
  state: TrustedRepairReleaseState,
  signal: TrustedRepairReleaseSignal,
): TrustedRepairReleaseState | null {
  if (signal === "disputed") return "DISPUTED";
  if (signal === "stale") return "STALE";
  if (signal === "blocked") return "BLOCKED";
  if (signal === "retired") return "RETIRED";
  if (state === "DRAFT" && signal === "automated_checks_passed") {
    return "AUTOMATED_CHECKED";
  }
  if (state === "AUTOMATED_CHECKED" && signal === "owner_learning_approved") {
    return "LEARNING_USABLE";
  }
  if (state === "LEARNING_USABLE" && signal === "transfer_qualified") {
    return "TRANSFER_QUALIFIED";
  }
  if (
    state === "TRANSFER_QUALIFIED" &&
    signal === "measurement_calibrated"
  ) {
    return "MEASUREMENT_CALIBRATED";
  }
  return null;
}

export type TrustedRepairBank = "LEARNING" | "TRANSFER" | "MEASUREMENT";
export type TrustedRepairFixtureKind =
  | "canonical"
  | "near_miss"
  | "counterexample"
  | "flip_condition"
  | "sealed_future_variant_a"
  | "sealed_future_variant_b"
  | "timed_integration";

export type TrustedRepairRightsManifest = Readonly<{
  manifestId: string;
  rightsClass: TrustedRepairRightsClass;
  author: "Inverge";
  copyrightHolder: "Inverge";
  lineage: readonly string[];
  synthetic: true;
  learnerPrivate: false;
  thirdPartyBodyUsed: false;
  rawBodyTrainingAllowed: false;
  reconstructionOfDeniedSource: false;
  nearCopyScore: number;
  sharingAllowed: false;
  purpose: "owner_test_only";
}>;

export type TrustedRepairSemanticAnchor = Readonly<{
  anchorId: string;
  labelKo: string;
  requiredConcepts: readonly string[];
  acceptableAlternatives: readonly string[];
  forbiddenFalseClaims: readonly string[];
  weight: number;
}>;

export type TrustedRepairFixture = Readonly<{
  fixtureId: string;
  subject: TrustedRepairSubject;
  labelKo: string;
  kind: TrustedRepairFixtureKind;
  bank: TrustedRepairBank;
  releaseState: "AUTOMATED_CHECKED";
  runtimeSupported: boolean;
  expectedOutcome: "verified" | "blocked" | "uncertain";
  prompt: string;
  editableDrafts: Readonly<Record<TrustedRepairInputMode, string>>;
  anchors: readonly TrustedRepairSemanticAnchor[];
  scaffoldByAnchor: Readonly<Record<string, string>>;
  successCriterionKo: string;
  sourceBinding: Readonly<{
    sourceType: "synthetic" | "official_registry_metadata";
    sourceId: string;
    sourceAnchorId: string | null;
    requiredStatus: "synthetic_fixture" | "current_law_verified";
  }>;
  rights: TrustedRepairRightsManifest;
}>;

export type TrustedRepairGapCandidate = Readonly<{
  gapId: string;
  anchorId: string;
  labelKo: string;
  rank: number;
  supportingEvidence: readonly string[];
  counterEvidence: readonly string[];
  repairActionKo: string;
  successCriterionKo: string;
}>;

export type TrustedRepairBindings = Readonly<{
  contractVersion: typeof TRUSTED_REPAIR_CONTRACT_VERSION;
  fixtureVersion: typeof TRUSTED_REPAIR_FIXTURE_VERSION;
  sourceVersion: string;
  rubricVersion: typeof TRUSTED_REPAIR_RUBRIC_VERSION;
  policyVersion: typeof TRUSTED_REPAIR_POLICY_VERSION;
  validatorVersion: typeof TRUSTED_REPAIR_VALIDATOR_VERSION;
}>;

export type TrustedRepairStateData = Readonly<{
  inputMode: TrustedRepairInputMode;
  revisionNumber: number;
  prediction: "likely_success" | "likely_partial" | "likely_blocked" | null;
  predictionConfidence: "low" | "medium" | "high" | null;
  selfDiagnosisCode: string | null;
  gapCandidates: readonly TrustedRepairGapCandidate[];
  repairNeed: "required" | "optional" | "blocked" | null;
  repairPath: TrustedRepairPath | null;
  continuation: TrustedRepairContinuation | null;
  resultReasonCodes: readonly string[];
}>;

export type TrustedRepairStoredSession = Readonly<{
  sessionId: string;
  userId: string;
  fixtureId: string;
  subject: TrustedRepairSubject;
  state: TrustedRepairState;
  recordVersion: number;
  confirmedRevisionId: string | null;
  primaryGapId: string | null;
  outcome: TrustedRepairOutcome | null;
  assistanceLevel: number;
  independentAttemptBeforeHelp: boolean;
  bindings: TrustedRepairBindings;
  stateData: TrustedRepairStateData;
  createdAt: string;
  updatedAt: string;
}>;

export type TrustedRepairPrivateArtifact = Readonly<{
  artifactId: string;
  sessionId: string;
  userId: string;
  revisionNumber: number;
  kind: TrustedRepairArtifactKind;
  inputMode: TrustedRepairInputMode;
  body: string;
  createdAt: string;
}>;

export type TrustedRepairExposureEvent = Readonly<{
  exposureId: string;
  sessionId: string;
  userId: string;
  revisionId: string;
  gapId: string;
  assistanceLevel: number;
  scaffoldKind: "smallest_eligible_scaffold" | "guided_solution";
  occurredAt: string;
}>;

export type TrustedRepairAggregate = Readonly<{
  session: TrustedRepairStoredSession;
  artifacts: readonly TrustedRepairPrivateArtifact[];
  exposures: readonly TrustedRepairExposureEvent[];
}>;

export type TrustedRepairTransitionPlan = Readonly<{
  expectedState: TrustedRepairState;
  nextState: TrustedRepairState;
  stateData: TrustedRepairStateData;
  confirmedRevisionId: string | null;
  primaryGapId: string | null;
  outcome: TrustedRepairOutcome | null;
  assistanceLevel: number;
  independentAttemptBeforeHelp: boolean;
  artifact: Omit<TrustedRepairPrivateArtifact, "sessionId" | "userId"> | null;
  exposure: Omit<TrustedRepairExposureEvent, "sessionId" | "userId"> | null;
}>;

export class TrustedRepairContractError extends Error {
  readonly code:
    | "invalid_input"
    | "invalid_transition"
    | "not_found"
    | "stale_record"
    | "rights_blocked"
    | "source_blocked"
    | "persistence_unavailable";

  constructor(
    code:
      | "invalid_input"
      | "invalid_transition"
      | "not_found"
      | "stale_record"
      | "rights_blocked"
      | "source_blocked"
      | "persistence_unavailable",
  ) {
    super(`trusted-repair:${code}`);
    this.code = code;
  }
}

export function isTrustedRepairSubject(
  value: unknown,
): value is TrustedRepairSubject {
  return TRUSTED_REPAIR_SUBJECTS.includes(value as TrustedRepairSubject);
}

export function isTrustedRepairInputMode(
  value: unknown,
): value is TrustedRepairInputMode {
  return TRUSTED_REPAIR_INPUT_MODES.includes(value as TrustedRepairInputMode);
}

export function isTrustedRepairContinuation(
  value: unknown,
): value is TrustedRepairContinuation {
  return TRUSTED_REPAIR_CONTINUATIONS.includes(
    value as TrustedRepairContinuation,
  );
}

export function isTrustedRepairState(value: unknown): value is TrustedRepairState {
  return TRUSTED_REPAIR_STATES.includes(value as TrustedRepairState);
}

export function isTrustedRepairOutcome(
  value: unknown,
): value is TrustedRepairOutcome {
  return TRUSTED_REPAIR_OUTCOMES.includes(value as TrustedRepairOutcome);
}

export function trustedRepairSubjectLabel(subject: TrustedRepairSubject) {
  if (subject === "appraisal_practical") return "감정평가실무";
  if (subject === "appraisal_theory") return "감정평가이론";
  return "감정평가 및 보상법규";
}

export function exactObject(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TrustedRepairContractError("invalid_input");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowedKeys.includes(key))) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return record;
}

export function requiredTrustedRepairText(
  value: unknown,
  maximumLength = 12_000,
) {
  if (typeof value !== "string") {
    throw new TrustedRepairContractError("invalid_input");
  }
  const normalized = value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return normalized;
}

export function requiredTrustedRepairUuid(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return value.toLowerCase();
}

export function requiredTrustedRepairVersion(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return Number(value);
}
