export const TRUSTED_REPAIR_CONTRACT_VERSION =
  "wcv_c2r_c_p_structured_practice_proof.v2" as const;
export const TRUSTED_REPAIR_FIXTURE_VERSION =
  "wcv_c2r_c_p_practice_rights_safe_fixtures.2026-08-17.v1" as const;
export const TRUSTED_REPAIR_RUBRIC_VERSION =
  "wcv_c2r_c_p_practice_relation_rubric.v1" as const;
export const TRUSTED_REPAIR_POLICY_VERSION =
  "wcv_c2r_c_p_exposure_and_independence_policy.v1" as const;
export const TRUSTED_REPAIR_VALIDATOR_VERSION =
  "validator:practice-calculation-claim@2" as const;
export const TRUSTED_REPAIR_FLAG = "WCV_C2R_C_P_PRACTICE_ENABLED" as const;
export const TRUSTED_REPAIR_THEORY_CONTRACT_VERSION =
  "wcv_c2r_c_t_structured_theory_proof.v1" as const;
export const TRUSTED_REPAIR_THEORY_FIXTURE_VERSION =
  "wcv_c2r_c_t_theory_rights_safe_fixtures.2026-08-17.v1" as const;
export const TRUSTED_REPAIR_THEORY_RUBRIC_VERSION =
  "wcv_c2r_c_t_theory_target_scope_rubric.v1" as const;
export const TRUSTED_REPAIR_THEORY_VALIDATOR_VERSION =
  "validator:theory-scoped-predicate@1" as const;
export const TRUSTED_REPAIR_THEORY_FLAG =
  "WCV_C2R_C_T_THEORY_ENABLED" as const;

export const TRUSTED_REPAIR_SUBJECTS = [
  "appraisal_practical",
  "appraisal_theory",
] as const;
export type TrustedRepairSubject = (typeof TRUSTED_REPAIR_SUBJECTS)[number];

export function trustedRepairBindingProfile(subject: TrustedRepairSubject) {
  return subject === "appraisal_practical"
    ? {
        contractVersion: TRUSTED_REPAIR_CONTRACT_VERSION,
        fixtureVersion: TRUSTED_REPAIR_FIXTURE_VERSION,
        rubricVersion: TRUSTED_REPAIR_RUBRIC_VERSION,
        policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
        validatorVersion: TRUSTED_REPAIR_VALIDATOR_VERSION,
      }
    : {
        contractVersion: TRUSTED_REPAIR_THEORY_CONTRACT_VERSION,
        fixtureVersion: TRUSTED_REPAIR_THEORY_FIXTURE_VERSION,
        rubricVersion: TRUSTED_REPAIR_THEORY_RUBRIC_VERSION,
        policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
        validatorVersion: TRUSTED_REPAIR_THEORY_VALIDATOR_VERSION,
      };
}

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
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const;
export type TrustedRepairRightsClass =
  (typeof TRUSTED_REPAIR_RIGHTS_CLASSES)[number];

export const TRUSTED_REPAIR_ELIGIBLE_RIGHTS_CLASSES = [
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
] as const satisfies readonly TrustedRepairRightsClass[];

export const TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES = [
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
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
  maximumImmediatePartialRetries: 1,
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
    learningPurposeKo: "자유서술과 분리된 닫힌 과목 증명을 학습자가 직접 확정한다.",
    nextActionKo: "과목별 구조화 증명 필드를 직접 확인하세요.",
  },
  partial: {
    learningPurposeKo: "남은 한 기준을 같은 세션과 수정본에 묶어 다시 복구한다.",
    nextActionKo: "허용된 한 번의 재시도로 남은 기준을 다시 쓰세요.",
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
export type TrustedRepairScarcityEvent = Readonly<{
  eventId: string;
  subject: TrustedRepairSubject;
  bank: TrustedRepairBank;
  reasonCode: "eligible_bank_gap";
  occurredAt: string;
  containsBody: false;
}>;
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
  manifestVersionId: string;
  sourceClass: TrustedRepairRightsClass;
  rightsHolder: "Inverge";
  permittedPurposes: readonly ["OWNER_TEST_ONLY"];
  territory: readonly ["KR"];
  validFrom: string;
  validUntil: string;
  status: "ACTIVE" | "REVOKED" | "DISPUTED" | "EXPIRED" | "BLOCKED";
  provenance: readonly string[];
}>;

export type TrustedRepairSourceEligibilityDecision = Readonly<{
  decisionId: string;
  sourceClass: TrustedRepairRightsClass;
  purpose: "OWNER_TEST_ONLY";
  decision: "CONDITIONALLY_ELIGIBLE";
  denialCodes: readonly string[];
  decidedAt: string;
  policyVersion: "dabangil.c2r_a.rights_safe_adaptive_variant_foundry.v1";
  decisionBasisChecksum: string;
  rightsManifestId: string;
  rightsManifestVersionId: string;
  rightsEvaluatedAt: string;
}>;

export const PRACTICE_PROOF_EVALUATION_STATES = [
  "PASS",
  "PARTIAL",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "BLOCKED",
  "STALE",
] as const;
export type PracticeProofEvaluationState =
  (typeof PRACTICE_PROOF_EVALUATION_STATES)[number];

export type CalculationRelationAnchorV1 = Readonly<{
  anchorKind: "PRACTICE_CALCULATION_RELATION";
  anchorId: "repair-anchor:practice:synthetic-net-income";
  anchorVersionId: "repair-anchor:practice:synthetic-net-income@1";
  operandRoles: readonly Readonly<{
    role: "gross_income" | "operating_expense";
    value: number;
    unit: "KRW_PER_YEAR";
  }>[];
  operator: "SUBTRACT";
  operandOrder: readonly ["gross_income", "operating_expense"];
  result: Readonly<{ value: number; unit: "KRW_PER_YEAR" }>;
  units: "KRW_PER_YEAR";
  sign: "POSITIVE";
  rounding: Readonly<{ mode: "HALF_UP"; scale: 0 }>;
  supportedTransformation: "DIRECT_ORDERED";
  deterministicValidatorId: "validator:practice-calculation-relation@1";
}>;

export const PRACTICE_CLAIM_CONFIRMATION_MODES = [
  "EXTRACTED_THEN_EDITED",
  "MANUAL_STRUCTURED",
] as const;
export type PracticeClaimConfirmationMode =
  (typeof PRACTICE_CLAIM_CONFIRMATION_MODES)[number];

export type PracticeCalculationClaimV2Input = Readonly<{
  sourceRevisionId: string;
  anchorId: CalculationRelationAnchorV1["anchorId"];
  anchorVersionId: CalculationRelationAnchorV1["anchorVersionId"];
  grossIncome: Readonly<{ value: number; unit: "KRW_PER_YEAR" }>;
  operatingExpense: Readonly<{ value: number; unit: "KRW_PER_YEAR" }>;
  operator: "SUBTRACT";
  operandOrder: readonly ["gross_income", "operating_expense"];
  result: Readonly<{ value: number; unit: "KRW_PER_YEAR" }>;
  sign: "POSITIVE";
  rounding: Readonly<{ mode: "HALF_UP"; scale: 0; required: false }>;
  confirmationMode: PracticeClaimConfirmationMode;
}>;

export type PracticeCalculationClaimV2 = PracticeCalculationClaimV2Input &
  Readonly<{ learnerConfirmedAt: string }>;

export const THEORY_PROOF_EVALUATION_STATES = [
  "PASS",
  "PARTIAL",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "BLOCKED",
  "STALE",
] as const;
export type TheoryProofEvaluationState =
  (typeof THEORY_PROOF_EVALUATION_STATES)[number];

export type ScopedPredicateAnchorV1 = Readonly<{
  anchorKind: "THEORY_SCOPED_PREDICATE";
  anchorId: "repair-anchor:theory:synthetic-income-approach";
  anchorVersionId: "repair-anchor:theory:synthetic-income-approach@1";
  targetScopeId: "theory-target:synthetic-income-approach";
  acceptedTargetAliases: readonly ["income approach", "synthetic income method"];
  requiredPredicates: readonly ["converts_expected_income_to_value"];
  forbiddenPredicates: readonly ["uses_only_historical_cost"];
  acceptableAlternatives: readonly [
    readonly ["capitalizes_expected_income"],
    readonly ["discounts_expected_cash_flow"],
  ];
  counterexampleScopes: readonly ["theory-target:synthetic-cost-approach"];
  negationPolicy: "EXPLICIT_POLARITY";
  mixedPolarityPolicy: "FAIL_CLOSED";
  anaphoraPolicy: "EXACT_TARGET_RESOLUTION_REQUIRED";
  overflowPolicy: Readonly<{
    maxClauses: 24;
    maxPredicateOccurrences: 64;
    result: "UNSUPPORTED";
  }>;
  deterministicValidatorId: "validator:theory-scoped-predicate@1";
}>;

export const THEORY_CLAIM_CONFIRMATION_MODES = [
  "EXTRACTED_THEN_EDITED",
  "MANUAL_STRUCTURED",
] as const;
export type TheoryClaimConfirmationMode =
  (typeof THEORY_CLAIM_CONFIRMATION_MODES)[number];
export const THEORY_SCOPE_RESOLUTIONS = [
  "EXACT",
  "UNRESOLVED_ANAPHORA",
  "UNSCOPED",
] as const;
export type TheoryScopeResolution =
  (typeof THEORY_SCOPE_RESOLUTIONS)[number];
export const THEORY_PREDICATE_POLARITIES = ["ASSERTED", "NEGATED"] as const;
export type TheoryPredicatePolarity =
  (typeof THEORY_PREDICATE_POLARITIES)[number];

export type TheoryPredicateAssertionV1 = Readonly<{
  predicateId: string;
  polarity: TheoryPredicatePolarity;
}>;
export type TheoryPredicateClauseV1 = Readonly<{
  clauseIndex: number;
  scopeResolution: TheoryScopeResolution;
  scopeId: string | null;
  predicates: readonly TheoryPredicateAssertionV1[];
}>;
export type TheoryPredicateClaimV1Input = Readonly<{
  sourceRevisionId: string;
  anchorId: ScopedPredicateAnchorV1["anchorId"];
  anchorVersionId: ScopedPredicateAnchorV1["anchorVersionId"];
  targetScopeId: ScopedPredicateAnchorV1["targetScopeId"];
  clauses: readonly TheoryPredicateClauseV1[];
  confirmationMode: TheoryClaimConfirmationMode;
}>;
export type TheoryPredicateClaimV1 = TheoryPredicateClaimV1Input &
  Readonly<{ learnerConfirmedAt: string }>;

export type TrustedRepairPracticeAnchor = Readonly<{
  anchorId: string;
  labelKo: string;
  weight: number;
  calculationRelation: CalculationRelationAnchorV1;
}>;

export type TrustedRepairTheoryAnchor = Readonly<{
  anchorId: string;
  labelKo: string;
  weight: number;
  scopedPredicate: ScopedPredicateAnchorV1;
}>;
export type TrustedRepairAnchor =
  | TrustedRepairPracticeAnchor
  | TrustedRepairTheoryAnchor;

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
  anchors: readonly TrustedRepairAnchor[];
  scaffoldByAnchor: Readonly<Record<string, string>>;
  guidedSolutionByAnchor: Readonly<Record<string, string>>;
  successCriterionKo: string;
  sourceBinding: Readonly<{
    sourceType: "synthetic";
    sourceId: string;
    sourceAnchorId: null;
    requiredStatus: "synthetic_fixture";
  }>;
  rights: TrustedRepairRightsManifest;
  sourceDecision: TrustedRepairSourceEligibilityDecision;
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
  contractVersion:
    | typeof TRUSTED_REPAIR_CONTRACT_VERSION
    | typeof TRUSTED_REPAIR_THEORY_CONTRACT_VERSION;
  fixtureVersion:
    | typeof TRUSTED_REPAIR_FIXTURE_VERSION
    | typeof TRUSTED_REPAIR_THEORY_FIXTURE_VERSION;
  sourceVersion: string;
  rubricVersion:
    | typeof TRUSTED_REPAIR_RUBRIC_VERSION
    | typeof TRUSTED_REPAIR_THEORY_RUBRIC_VERSION;
  policyVersion: typeof TRUSTED_REPAIR_POLICY_VERSION;
  validatorVersion:
    | typeof TRUSTED_REPAIR_VALIDATOR_VERSION
    | typeof TRUSTED_REPAIR_THEORY_VALIDATOR_VERSION;
}>;

export type TrustedRepairProofEvaluation =
  | Readonly<{
      state: PracticeProofEvaluationState;
      verified: boolean;
      validatorId: "validator:practice-calculation-claim@2";
      anchorId: CalculationRelationAnchorV1["anchorId"];
      anchorVersionId: CalculationRelationAnchorV1["anchorVersionId"];
      sourceRevisionId: string;
      reasonCodes: readonly string[];
    }>
  | Readonly<{
      state: TheoryProofEvaluationState;
      verified: boolean;
      validatorId: "validator:theory-scoped-predicate@1";
      anchorId: ScopedPredicateAnchorV1["anchorId"];
      anchorVersionId: ScopedPredicateAnchorV1["anchorVersionId"];
      sourceRevisionId: string;
      targetScopeId: ScopedPredicateAnchorV1["targetScopeId"];
      reasonCodes: readonly string[];
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
  structuredClaim: PracticeCalculationClaimV2 | TheoryPredicateClaimV1 | null;
  proofEvaluation: TrustedRepairProofEvaluation | null;
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
  return subject === "appraisal_practical" ? "감정평가실무" : "감정평가이론";
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

function requiredSafeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return value;
}

export function parseJsonRejectingDuplicateKeys(source: string): unknown {
  if (!source || source.length > 20_000) {
    throw new TrustedRepairContractError("invalid_input");
  }
  let index = 0;
  const whitespace = () => {
    while (/\s/u.test(source[index] ?? "")) index += 1;
  };
  const stringValue = () => {
    const start = index;
    if (source[index] !== '"') throw new TrustedRepairContractError("invalid_input");
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") {
        index += 2;
        continue;
      }
      if (source[index] === '"') {
        index += 1;
        try {
          return JSON.parse(source.slice(start, index)) as string;
        } catch {
          throw new TrustedRepairContractError("invalid_input");
        }
      }
      index += 1;
    }
    throw new TrustedRepairContractError("invalid_input");
  };
  const parseValue = (depth: number): void => {
    if (depth > 32) throw new TrustedRepairContractError("invalid_input");
    whitespace();
    if (source[index] === "{") {
      index += 1;
      whitespace();
      const keys = new Set<string>();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      while (index < source.length) {
        whitespace();
        const key = stringValue();
        if (keys.has(key)) throw new TrustedRepairContractError("invalid_input");
        keys.add(key);
        whitespace();
        if (source[index] !== ":") throw new TrustedRepairContractError("invalid_input");
        index += 1;
        parseValue(depth + 1);
        whitespace();
        if (source[index] === "}") {
          index += 1;
          return;
        }
        if (source[index] !== ",") throw new TrustedRepairContractError("invalid_input");
        index += 1;
      }
      throw new TrustedRepairContractError("invalid_input");
    }
    if (source[index] === "[") {
      index += 1;
      whitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      while (index < source.length) {
        parseValue(depth + 1);
        whitespace();
        if (source[index] === "]") {
          index += 1;
          return;
        }
        if (source[index] !== ",") throw new TrustedRepairContractError("invalid_input");
        index += 1;
      }
      throw new TrustedRepairContractError("invalid_input");
    }
    if (source[index] === '"') {
      stringValue();
      return;
    }
    const tail = source.slice(index);
    const primitive = tail.match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u);
    if (!primitive) throw new TrustedRepairContractError("invalid_input");
    index += primitive[0].length;
  };
  parseValue(0);
  whitespace();
  if (index !== source.length) throw new TrustedRepairContractError("invalid_input");
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new TrustedRepairContractError("invalid_input");
  }
}

function parsePracticeClaimCore(
  value: unknown,
  includeConfirmationTime: boolean,
) {
  const keys = [
    "sourceRevisionId",
    "anchorId",
    "anchorVersionId",
    "grossIncome",
    "operatingExpense",
    "operator",
    "operandOrder",
    "result",
    "sign",
    "rounding",
    "confirmationMode",
    ...(includeConfirmationTime ? ["learnerConfirmedAt"] : []),
  ];
  const record = exactObject(value, keys);
  if (Object.keys(record).length !== keys.length) {
    throw new TrustedRepairContractError("invalid_input");
  }
  const gross = exactObject(record.grossIncome, ["value", "unit"]);
  const expense = exactObject(record.operatingExpense, ["value", "unit"]);
  const result = exactObject(record.result, ["value", "unit"]);
  const rounding = exactObject(record.rounding, ["mode", "scale", "required"]);
  if (
    Object.keys(gross).length !== 2 ||
    Object.keys(expense).length !== 2 ||
    Object.keys(result).length !== 2 ||
    Object.keys(rounding).length !== 3 ||
    gross.unit !== "KRW_PER_YEAR" ||
    expense.unit !== "KRW_PER_YEAR" ||
    result.unit !== "KRW_PER_YEAR" ||
    record.operator !== "SUBTRACT" ||
    !Array.isArray(record.operandOrder) ||
    record.operandOrder.length !== 2 ||
    record.operandOrder[0] !== "gross_income" ||
    record.operandOrder[1] !== "operating_expense" ||
    record.sign !== "POSITIVE" ||
    rounding.mode !== "HALF_UP" ||
    rounding.scale !== 0 ||
    rounding.required !== false ||
    !PRACTICE_CLAIM_CONFIRMATION_MODES.includes(
      record.confirmationMode as PracticeClaimConfirmationMode,
    )
  ) {
    throw new TrustedRepairContractError("invalid_input");
  }
  const parsed = {
    sourceRevisionId: requiredTrustedRepairUuid(record.sourceRevisionId),
    anchorId: requiredTrustedRepairText(record.anchorId, 160),
    anchorVersionId: requiredTrustedRepairText(record.anchorVersionId, 180),
    grossIncome: {
      value: requiredSafeInteger(gross.value),
      unit: "KRW_PER_YEAR" as const,
    },
    operatingExpense: {
      value: requiredSafeInteger(expense.value),
      unit: "KRW_PER_YEAR" as const,
    },
    operator: "SUBTRACT" as const,
    operandOrder: ["gross_income", "operating_expense"] as const,
    result: {
      value: requiredSafeInteger(result.value),
      unit: "KRW_PER_YEAR" as const,
    },
    sign: "POSITIVE" as const,
    rounding: { mode: "HALF_UP" as const, scale: 0 as const, required: false as const },
    confirmationMode: record.confirmationMode as PracticeClaimConfirmationMode,
  };
  if (!includeConfirmationTime) return parsed;
  const learnerConfirmedAt = requiredTrustedRepairText(record.learnerConfirmedAt, 64);
  if (!Number.isFinite(Date.parse(learnerConfirmedAt))) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return { ...parsed, learnerConfirmedAt };
}

export function parsePracticeCalculationClaimV2Input(
  value: unknown,
): PracticeCalculationClaimV2Input {
  return parsePracticeClaimCore(value, false) as PracticeCalculationClaimV2Input;
}

export function parsePracticeCalculationClaimV2(
  value: unknown,
): PracticeCalculationClaimV2 {
  return parsePracticeClaimCore(value, true) as PracticeCalculationClaimV2;
}

function parseTheoryClaimCore(value: unknown, includeConfirmationTime: boolean) {
  const keys = [
    "sourceRevisionId",
    "anchorId",
    "anchorVersionId",
    "targetScopeId",
    "clauses",
    "confirmationMode",
    ...(includeConfirmationTime ? ["learnerConfirmedAt"] : []),
  ];
  const record = exactObject(value, keys);
  if (
    Object.keys(record).length !== keys.length ||
    !Array.isArray(record.clauses) ||
    record.clauses.length < 1 ||
    record.clauses.length > 128 ||
    !THEORY_CLAIM_CONFIRMATION_MODES.includes(
      record.confirmationMode as TheoryClaimConfirmationMode,
    )
  ) {
    throw new TrustedRepairContractError("invalid_input");
  }
  const clauseIndexes = new Set<number>();
  const clauses = record.clauses.map((value, index) => {
    const clause = exactObject(value, [
      "clauseIndex",
      "scopeResolution",
      "scopeId",
      "predicates",
    ]);
    if (
      Object.keys(clause).length !== 4 ||
      !Number.isSafeInteger(clause.clauseIndex) ||
      Number(clause.clauseIndex) !== index + 1 ||
      clauseIndexes.has(Number(clause.clauseIndex)) ||
      !THEORY_SCOPE_RESOLUTIONS.includes(
        clause.scopeResolution as TheoryScopeResolution,
      ) ||
      !Array.isArray(clause.predicates) ||
      clause.predicates.length < 1 ||
      clause.predicates.length > 128
    ) {
      throw new TrustedRepairContractError("invalid_input");
    }
    clauseIndexes.add(Number(clause.clauseIndex));
    const scopeId =
      clause.scopeId === null
        ? null
        : requiredTrustedRepairText(clause.scopeId, 160);
    if (
      (clause.scopeResolution === "EXACT" && scopeId === null) ||
      (clause.scopeResolution !== "EXACT" && scopeId !== null)
    ) {
      throw new TrustedRepairContractError("invalid_input");
    }
    const predicates = clause.predicates.map((value) => {
      const predicate = exactObject(value, ["predicateId", "polarity"]);
      if (
        Object.keys(predicate).length !== 2 ||
        !THEORY_PREDICATE_POLARITIES.includes(
          predicate.polarity as TheoryPredicatePolarity,
        )
      ) {
        throw new TrustedRepairContractError("invalid_input");
      }
      return {
        predicateId: requiredTrustedRepairText(predicate.predicateId, 160),
        polarity: predicate.polarity as TheoryPredicatePolarity,
      };
    });
    return {
      clauseIndex: Number(clause.clauseIndex),
      scopeResolution: clause.scopeResolution as TheoryScopeResolution,
      scopeId,
      predicates,
    };
  });
  const parsed = {
    sourceRevisionId: requiredTrustedRepairUuid(record.sourceRevisionId),
    anchorId: requiredTrustedRepairText(record.anchorId, 160),
    anchorVersionId: requiredTrustedRepairText(record.anchorVersionId, 180),
    targetScopeId: requiredTrustedRepairText(record.targetScopeId, 160),
    clauses,
    confirmationMode: record.confirmationMode as TheoryClaimConfirmationMode,
  };
  if (!includeConfirmationTime) return parsed;
  const learnerConfirmedAt = requiredTrustedRepairText(
    record.learnerConfirmedAt,
    64,
  );
  if (!Number.isFinite(Date.parse(learnerConfirmedAt))) {
    throw new TrustedRepairContractError("invalid_input");
  }
  return { ...parsed, learnerConfirmedAt };
}

export function parseTheoryPredicateClaimV1Input(
  value: unknown,
): TheoryPredicateClaimV1Input {
  return parseTheoryClaimCore(value, false) as TheoryPredicateClaimV1Input;
}

export function parseTheoryPredicateClaimV1(
  value: unknown,
): TheoryPredicateClaimV1 {
  return parseTheoryClaimCore(value, true) as TheoryPredicateClaimV1;
}
