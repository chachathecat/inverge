import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import type { LearnerAnswerSubmissionOcrState } from "./answer-submission-contract";

export const RUBRIC_EVIDENCE_CONTRACT_VERSION = "s205.common_rubric_evidence.v1" as const;
export const PRACTICE_SCORE_RANGE_CAVEAT = "learning_support_estimate_not_official_or_confirmed_score" as const;
export const RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL = "casio_fx_9860giii" as const;

export type RubricEvidenceSubject = "practice" | "theory" | "law";
export type RubricEvidenceConfidenceLevel = "low" | "medium" | "high";
export type RubricEvidenceSourceStatus = "verified" | "needs_verification" | "blocked" | "unresolved_conflict" | "not_applicable";
export type LearnerAnswerEvidenceStatus = "learner_confirmed" | "ocr_confirmation_needed" | "missing";
export type RubricEvidenceReviewStatus =
  | "ready"
  | "withheld_insufficient_evidence"
  | "withheld_unconfirmed_ocr"
  | "withheld_unverified_source"
  | "withheld_unsupported_subject"
  | "withheld_unsupported_calculation";

export type RubricEvidenceBlockingReason =
  | "learner_answer_missing"
  | "learner_evidence_unlinked"
  | "ocr_unconfirmed"
  | "rubric_unverified"
  | "reference_package_unverified"
  | "official_rule_unverified"
  | "calculation_unverified"
  | "unsupported_subject"
  | "unsupported_question_type"
  | "rights_blocked"
  | "unresolved_source_conflict";

export type RubricEvidenceReferenceKind =
  | "learner_answer_submission"
  | "learner_confirmed_ocr_segment"
  | "learner_rewrite_segment"
  | "learner_calculation_step";

export type RubricSourceReferenceKind =
  | "official_rule_registry"
  | "question_metadata_registry"
  | "reference_answer_package"
  | "rubric_blueprint"
  | "subject_validator"
  | "calculation_validator";

export type RubricEvidenceReference = {
  id: string;
  kind: RubricEvidenceReferenceKind;
  dataClass: "user_owned_service_data";
  ownerBinding: "authenticated_request_user";
  answerSubmissionId: string;
  segmentId?: string;
  calculationStepId?: string;
  pageIndex?: number;
  ocrState?: LearnerAnswerSubmissionOcrState;
  verifiedByLearner: boolean;
  confidence: RubricEvidenceConfidenceLevel;
  containsRawContent: false;
};

export type RubricSourceReference = {
  id: string;
  kind: RubricSourceReferenceKind;
  sourceId: string;
  verificationStatus: RubricEvidenceSourceStatus;
  rightsStatus?: "metadata_only" | "display_by_deep_link" | "private_reference_only" | "blocked_by_rights";
  lawEffectiveDate?: string;
  lastVerifiedAt?: string;
  containsRawContent: false;
};

export type RubricEvidenceConfidence = {
  level: RubricEvidenceConfidenceLevel;
  reasons: string[];
  uncertaintyReasons: string[];
};

export type RubricScoreRange = readonly [number, number];

export type RubricDimensionContract = {
  id: string;
  subjectScope: readonly ("all" | RubricEvidenceSubject)[];
  label: string;
  maxPoints: number;
  pointCeilingSourceRefId: string;
  sourceStatus: RubricEvidenceSourceStatus;
  evidenceRefIds: string[];
  deductionCandidateIds: string[];
  estimatedPointsRange: RubricScoreRange | null;
  confidence: RubricEvidenceConfidence;
  status: "evaluated" | "not_evaluated_insufficient_evidence";
};

export type DeductionCandidateContract = {
  id: string;
  dimensionId: string;
  rootCauseId: string;
  gapType: string;
  severity: "minor" | "moderate" | "major";
  evidenceRefIds: string[];
  sourceRefIds: string[];
  confidence: RubricEvidenceConfidence;
  learnerFacingSummary: string;
  immediateFix: string;
  duplicateRootCauseGroupId?: string;
  status: "candidate" | "withheld_insufficient_evidence";
  officialScoreDeduction: false;
};

export type PracticeScoreRangeContract = {
  status: "estimated" | "withheld_insufficient_evidence";
  range: RubricScoreRange | null;
  scoreScale: {
    min: 0;
    max: number;
    sourceRefId: string;
    verificationStatus: "verified";
    officialPassThresholdUsed: false;
  };
  confidence: RubricEvidenceConfidence;
  evidenceRefIds: string[];
  rubricDimensionIds: string[];
  secondaryToGapAndAction: true;
  nonOfficial: true;
  confirmedScore: false;
  passProbability: false;
  passGuarantee: false;
  notFinalEndpoint: true;
  caveat: typeof PRACTICE_SCORE_RANGE_CAVEAT;
};

export type OneBiggestGapContract = {
  id: string;
  gapType: string;
  dimensionId: string | null;
  deductionCandidateIds: string[];
  evidenceRefIds: string[];
  conceptNodeIds: string[];
  severity: "minor" | "moderate" | "major";
  confidence: RubricEvidenceConfidence;
  learnerFacingSummary: string;
};

export type OneNextActionContract = {
  id: string;
  actionType:
    | "confirm_ocr"
    | "rewrite"
    | "recalculate"
    | "compare_reference"
    | "retry"
    | "schedule_review"
    | "withhold_until_verified";
  targetGapId: string;
  targetEvidenceRefIds: string[];
  defaultAction: true;
  learnerCanOverride: true;
  learnerFacingInstruction: string;
};

export type RewriteOrRecalculationTaskHook = {
  kind: "rewrite" | "recalculation" | "ocr_confirmation" | "scheduled_review" | "withheld";
  targetGapId: string;
  sourceEvidenceRefIds: string[];
  retryReviewAllowed: true;
  calculator?:
    | {
        model: typeof RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL;
        resetSafeHandKeyedRoutineOnly: true;
        storedProgramDependency: false;
      }
    | null;
};

export type RubricEvidenceSourceStatusSet = {
  learnerAnswer: LearnerAnswerEvidenceStatus;
  problemMaterial: RubricEvidenceSourceStatus;
  referencePackage: RubricEvidenceSourceStatus;
  rubric: RubricEvidenceSourceStatus;
  officialRules: RubricEvidenceSourceStatus;
  calculation: RubricEvidenceSourceStatus;
};

export type EvidenceReviewResultPresentationContract = {
  order: readonly ["one_biggest_gap", "one_next_action", "evidence_review", "rewrite_or_recalculation", "practice_score_range"];
  startsWithGapAndAction: true;
  scoreSummaryPosition: "secondary_after_evidence";
  terminalState: "rewrite_or_recalculation_or_scheduled_review";
};

export type CommonRubricEvidenceReviewContract = {
  version: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  dataClass: "derived_learning_metadata";
  examMode: "second";
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  reviewStatus: RubricEvidenceReviewStatus;
  withhold: {
    withheld: boolean;
    reasons: RubricEvidenceBlockingReason[];
  };
  sourceStatus: RubricEvidenceSourceStatusSet;
  learnerAnswerEvidenceRefs: RubricEvidenceReference[];
  sourceVerificationRefs: RubricSourceReference[];
  rubricDimensions: RubricDimensionContract[];
  deductionCandidates: DeductionCandidateContract[];
  confidence: RubricEvidenceConfidence;
  primaryGap: OneBiggestGapContract;
  nextAction: OneNextActionContract;
  rewriteOrRecalculationHook: RewriteOrRecalculationTaskHook;
  practiceScoreRange: PracticeScoreRangeContract;
  resultPresentation: EvidenceReviewResultPresentationContract;
  dataBoundary: {
    learnerMaterialInContract: false;
    ocrMaterialInContract: false;
    officialMaterialInContract: false;
    globalReferenceWrite: false;
    modelTrainingUse: false;
    telemetrySafe: true;
  };
};

export type RubricEvidenceValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const EXPECTED_PRESENTATION_ORDER: EvidenceReviewResultPresentationContract["order"] = [
  "one_biggest_gap",
  "one_next_action",
  "evidence_review",
  "rewrite_or_recalculation",
  "practice_score_range",
];

const BLOCKING_SOURCE_STATUSES = new Set<RubricEvidenceSourceStatus>([
  "blocked",
  "needs_verification",
  "unresolved_conflict",
]);

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasRawBoundaryIssue(value: unknown) {
  try {
    assertNoRawUserDataInDerived(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "raw-user-data-in-derived-metadata";
  }
}

function addRequiredStringError(errors: string[], value: unknown, path: string) {
  if (!isNonEmptyString(value)) errors.push(`${path} must be a non-empty string`);
}

function addKnownIdErrors(errors: string[], ids: readonly string[], knownIds: ReadonlySet<string>, path: string) {
  if (!Array.isArray(ids) || ids.length === 0) {
    errors.push(`${path} must reference at least one evidence/source id`);
    return;
  }
  for (const id of ids) {
    if (!knownIds.has(id)) errors.push(`${path} references unknown id ${id}`);
  }
}

function validateRange(
  errors: string[],
  range: RubricScoreRange | null,
  max: number,
  path: string,
  requireNonZeroWidth: boolean,
) {
  if (!Array.isArray(range) || range.length !== 2) {
    errors.push(`${path} must be a two-value range`);
    return;
  }
  const [low, high] = range;
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    errors.push(`${path} values must be finite numbers`);
    return;
  }
  if (low < 0 || high < 0 || low > high || high > max) {
    errors.push(`${path} must stay within 0..${max} and low <= high`);
  }
  if (requireNonZeroWidth && low === high) {
    errors.push(`${path} must be a range, not a confirmed single-point score`);
  }
}

function hasBlockingSourceStatus(sourceStatus: RubricEvidenceSourceStatusSet) {
  const sourceValues: RubricEvidenceSourceStatus[] = [
    sourceStatus.problemMaterial,
    sourceStatus.referencePackage,
    sourceStatus.rubric,
    sourceStatus.officialRules,
    sourceStatus.calculation,
  ];
  return sourceValues.some((status) => BLOCKING_SOURCE_STATUSES.has(status));
}

function statusNeedsWithhold(contract: CommonRubricEvidenceReviewContract) {
  return (
    contract.sourceStatus.learnerAnswer !== "learner_confirmed" ||
    hasBlockingSourceStatus(contract.sourceStatus) ||
    contract.withhold.reasons.length > 0
  );
}

function validatePresentation(contract: CommonRubricEvidenceReviewContract, errors: string[]) {
  const order = contract.resultPresentation.order;
  if (order.length !== EXPECTED_PRESENTATION_ORDER.length || order.some((entry, index) => entry !== EXPECTED_PRESENTATION_ORDER[index])) {
    errors.push("resultPresentation.order must place one biggest gap and one next action before score range");
  }
  if (contract.resultPresentation.startsWithGapAndAction !== true) {
    errors.push("resultPresentation.startsWithGapAndAction must be true");
  }
  if (contract.resultPresentation.scoreSummaryPosition !== "secondary_after_evidence") {
    errors.push("practice score range must be secondary after Evidence Review");
  }
  if (contract.resultPresentation.terminalState !== "rewrite_or_recalculation_or_scheduled_review") {
    errors.push("review result must end in rewrite, recalculation, or scheduled review");
  }
}

function validatePracticeScoreRange(contract: CommonRubricEvidenceReviewContract, evidenceIds: ReadonlySet<string>, dimensionIds: ReadonlySet<string>, errors: string[]) {
  const estimate = contract.practiceScoreRange;
  if (estimate.nonOfficial !== true) errors.push("practiceScoreRange.nonOfficial must be true");
  if (estimate.secondaryToGapAndAction !== true) errors.push("practiceScoreRange.secondaryToGapAndAction must be true");
  if (estimate.confirmedScore !== false) errors.push("practiceScoreRange.confirmedScore must be false");
  if (estimate.passProbability !== false) errors.push("practiceScoreRange.passProbability must be false");
  if (estimate.passGuarantee !== false) errors.push("practiceScoreRange.passGuarantee must be false");
  if (estimate.notFinalEndpoint !== true) errors.push("practiceScoreRange.notFinalEndpoint must be true");
  if (estimate.caveat !== PRACTICE_SCORE_RANGE_CAVEAT) errors.push("practiceScoreRange.caveat must use the S205 non-official caveat");
  if (estimate.scoreScale.min !== 0) errors.push("practiceScoreRange.scoreScale.min must be 0");
  if (!Number.isFinite(estimate.scoreScale.max) || estimate.scoreScale.max <= 0) {
    errors.push("practiceScoreRange.scoreScale.max must be positive");
  }
  if (estimate.scoreScale.officialPassThresholdUsed !== false) {
    errors.push("practiceScoreRange.scoreScale.officialPassThresholdUsed must be false");
  }
  if (estimate.scoreScale.verificationStatus !== "verified") {
    errors.push("practiceScoreRange.scoreScale.verificationStatus must be verified");
  }

  if (estimate.status === "estimated") {
    if (contract.reviewStatus !== "ready") errors.push("estimated score range requires reviewStatus ready");
    if (statusNeedsWithhold(contract)) errors.push("estimated score range cannot be emitted while evidence or source status needs withholding");
    addKnownIdErrors(errors, estimate.evidenceRefIds, evidenceIds, "practiceScoreRange.evidenceRefIds");
    addKnownIdErrors(errors, estimate.rubricDimensionIds, dimensionIds, "practiceScoreRange.rubricDimensionIds");
    validateRange(errors, estimate.range, estimate.scoreScale.max, "practiceScoreRange.range", true);
    return;
  }

  if (estimate.status === "withheld_insufficient_evidence") {
    if (estimate.range !== null) errors.push("withheld practice score range must not include range values");
    return;
  }

  errors.push("practiceScoreRange.status is invalid");
}

export function validateRubricEvidenceReviewContract(contract: CommonRubricEvidenceReviewContract): RubricEvidenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rawBoundaryIssue = hasRawBoundaryIssue(contract);
  if (rawBoundaryIssue) errors.push(rawBoundaryIssue);

  if (contract.version !== RUBRIC_EVIDENCE_CONTRACT_VERSION) errors.push("contract version must be s205.common_rubric_evidence.v1");
  if (contract.dataClass !== "derived_learning_metadata") errors.push("contract dataClass must be derived_learning_metadata");
  if (contract.examMode !== "second") errors.push("contract examMode must be second");
  addRequiredStringError(errors, contract.subjectLabel, "subjectLabel");

  if (contract.withhold.withheld !== (contract.reviewStatus !== "ready")) {
    errors.push("withhold.withheld must match non-ready review status");
  }
  if (contract.reviewStatus === "ready" && contract.withhold.reasons.length > 0) {
    errors.push("ready reviews must not carry withhold reasons");
  }
  if (contract.reviewStatus !== "ready" && contract.withhold.reasons.length === 0) {
    errors.push("withheld reviews must include at least one withhold reason");
  }
  if (contract.reviewStatus === "ready" && statusNeedsWithhold(contract)) {
    errors.push("reviewStatus ready requires confirmed learner evidence and non-blocking source statuses");
  }

  const evidenceIds = new Set(contract.learnerAnswerEvidenceRefs.map((ref) => ref.id));
  const sourceIds = new Set(contract.sourceVerificationRefs.map((ref) => ref.id));
  const dimensionIds = new Set(contract.rubricDimensions.map((dimension) => dimension.id));
  const deductionIds = new Set(contract.deductionCandidates.map((candidate) => candidate.id));

  if (contract.learnerAnswerEvidenceRefs.length === 0) errors.push("learnerAnswerEvidenceRefs must not be empty");
  for (const ref of contract.learnerAnswerEvidenceRefs) {
    addRequiredStringError(errors, ref.id, "learnerAnswerEvidenceRefs.id");
    addRequiredStringError(errors, ref.answerSubmissionId, `${ref.id}.answerSubmissionId`);
    if (ref.dataClass !== "user_owned_service_data") errors.push(`${ref.id}.dataClass must be user_owned_service_data`);
    if (ref.ownerBinding !== "authenticated_request_user") errors.push(`${ref.id}.ownerBinding must bind to authenticated_request_user`);
    if (ref.containsRawContent !== false) errors.push(`${ref.id}.containsRawContent must be false`);
  }

  for (const ref of contract.sourceVerificationRefs) {
    addRequiredStringError(errors, ref.id, "sourceVerificationRefs.id");
    addRequiredStringError(errors, ref.sourceId, `${ref.id}.sourceId`);
    if (ref.containsRawContent !== false) errors.push(`${ref.id}.containsRawContent must be false`);
  }

  if (contract.rubricDimensions.length === 0) errors.push("rubricDimensions must not be empty");
  for (const dimension of contract.rubricDimensions) {
    addRequiredStringError(errors, dimension.id, "rubricDimensions.id");
    addRequiredStringError(errors, dimension.label, `${dimension.id}.label`);
    if (!Number.isFinite(dimension.maxPoints) || dimension.maxPoints <= 0) {
      errors.push(`${dimension.id}.maxPoints must be positive`);
    }
    if (!sourceIds.has(dimension.pointCeilingSourceRefId)) {
      errors.push(`${dimension.id}.pointCeilingSourceRefId references unknown source ref`);
    }
    if (dimension.status === "evaluated") {
      addKnownIdErrors(errors, dimension.evidenceRefIds, evidenceIds, `${dimension.id}.evidenceRefIds`);
      if (dimension.estimatedPointsRange === null) errors.push(`${dimension.id}.estimatedPointsRange is required when evaluated`);
      validateRange(errors, dimension.estimatedPointsRange, dimension.maxPoints, `${dimension.id}.estimatedPointsRange`, false);
    }
    for (const candidateId of dimension.deductionCandidateIds) {
      if (!deductionIds.has(candidateId)) errors.push(`${dimension.id}.deductionCandidateIds references unknown deduction ${candidateId}`);
    }
  }

  for (const candidate of contract.deductionCandidates) {
    addRequiredStringError(errors, candidate.id, "deductionCandidates.id");
    addRequiredStringError(errors, candidate.rootCauseId, `${candidate.id}.rootCauseId`);
    addRequiredStringError(errors, candidate.gapType, `${candidate.id}.gapType`);
    addRequiredStringError(errors, candidate.learnerFacingSummary, `${candidate.id}.learnerFacingSummary`);
    addRequiredStringError(errors, candidate.immediateFix, `${candidate.id}.immediateFix`);
    if (!dimensionIds.has(candidate.dimensionId)) errors.push(`${candidate.id}.dimensionId references unknown dimension`);
    addKnownIdErrors(errors, candidate.evidenceRefIds, evidenceIds, `${candidate.id}.evidenceRefIds`);
    addKnownIdErrors(errors, candidate.sourceRefIds, sourceIds, `${candidate.id}.sourceRefIds`);
    if (candidate.officialScoreDeduction !== false) errors.push(`${candidate.id}.officialScoreDeduction must be false`);
  }

  addRequiredStringError(errors, contract.primaryGap.id, "primaryGap.id");
  addRequiredStringError(errors, contract.primaryGap.gapType, "primaryGap.gapType");
  if (contract.primaryGap.dimensionId && !dimensionIds.has(contract.primaryGap.dimensionId)) {
    errors.push("primaryGap.dimensionId references unknown dimension");
  }
  for (const candidateId of contract.primaryGap.deductionCandidateIds) {
    if (!deductionIds.has(candidateId)) errors.push(`primaryGap.deductionCandidateIds references unknown deduction ${candidateId}`);
  }
  addKnownIdErrors(errors, contract.primaryGap.evidenceRefIds, evidenceIds, "primaryGap.evidenceRefIds");

  addRequiredStringError(errors, contract.nextAction.id, "nextAction.id");
  if (contract.nextAction.targetGapId !== contract.primaryGap.id) {
    errors.push("nextAction.targetGapId must point to primaryGap.id");
  }
  if (contract.nextAction.defaultAction !== true || contract.nextAction.learnerCanOverride !== true) {
    errors.push("nextAction must be defaulted while preserving learner override");
  }
  addKnownIdErrors(errors, contract.nextAction.targetEvidenceRefIds, evidenceIds, "nextAction.targetEvidenceRefIds");

  if (contract.rewriteOrRecalculationHook.targetGapId !== contract.primaryGap.id) {
    errors.push("rewriteOrRecalculationHook.targetGapId must point to primaryGap.id");
  }
  addKnownIdErrors(errors, contract.rewriteOrRecalculationHook.sourceEvidenceRefIds, evidenceIds, "rewriteOrRecalculationHook.sourceEvidenceRefIds");
  if (contract.rewriteOrRecalculationHook.kind === "recalculation") {
    const calculator = contract.rewriteOrRecalculationHook.calculator;
    if (!calculator) {
      errors.push("recalculation hooks must declare the fixed GIII calculator routine policy");
    } else {
      if (calculator.model !== RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL) errors.push("recalculation hook must use casio_fx_9860giii");
      if (calculator.resetSafeHandKeyedRoutineOnly !== true) errors.push("recalculation hook must require reset-safe hand-keyed routine");
      if (calculator.storedProgramDependency !== false) errors.push("recalculation hook must prohibit stored-program dependency");
    }
  }

  validatePracticeScoreRange(contract, evidenceIds, dimensionIds, errors);
  validatePresentation(contract, errors);

  if (contract.dataBoundary.learnerMaterialInContract !== false) errors.push("dataBoundary.learnerMaterialInContract must be false");
  if (contract.dataBoundary.ocrMaterialInContract !== false) errors.push("dataBoundary.ocrMaterialInContract must be false");
  if (contract.dataBoundary.officialMaterialInContract !== false) errors.push("dataBoundary.officialMaterialInContract must be false");
  if (contract.dataBoundary.globalReferenceWrite !== false) errors.push("dataBoundary.globalReferenceWrite must be false");
  if (contract.dataBoundary.modelTrainingUse !== false) errors.push("dataBoundary.modelTrainingUse must be false");
  if (contract.dataBoundary.telemetrySafe !== true) errors.push("dataBoundary.telemetrySafe must be true");

  if (contract.reviewStatus !== "ready" && contract.nextAction.actionType === "compare_reference") {
    warnings.push("withheld review should usually guide confirmation or verification before reference comparison");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertValidRubricEvidenceReviewContract(contract: CommonRubricEvidenceReviewContract): void {
  const result = validateRubricEvidenceReviewContract(contract);
  if (!result.valid) {
    throw new Error(`invalid-rubric-evidence-contract: ${result.errors.join("; ")}`);
  }
}

export type RubricEvidenceReviewDerivedMetadata = {
  contractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  dataClass: "derived_learning_metadata";
  examMode: "second";
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  reviewStatus: RubricEvidenceReviewStatus;
  withholdReasons: RubricEvidenceBlockingReason[];
  evidenceRefCount: number;
  rubricDimensionCount: number;
  deductionCandidateCount: number;
  primaryGapId: string;
  primaryGapType: string;
  nextActionId: string;
  nextActionType: OneNextActionContract["actionType"];
  taskHookKind: RewriteOrRecalculationTaskHook["kind"];
  practiceRangeStatus: PracticeScoreRangeContract["status"];
  rangeLower: number | null;
  rangeUpper: number | null;
  confidenceLevel: RubricEvidenceConfidenceLevel;
  sourceStatus: RubricEvidenceSourceStatusSet;
  containsRawContent: false;
  nonOfficial: true;
  confirmedScore: false;
  passProbability: false;
  passGuarantee: false;
  resultStartsWithGapAndAction: true;
};

export function buildRubricEvidenceReviewDerivedMetadata(
  contract: CommonRubricEvidenceReviewContract,
): RubricEvidenceReviewDerivedMetadata {
  assertValidRubricEvidenceReviewContract(contract);
  const metadata = sanitizeDerivedMetadata({
    contractVersion: contract.version,
    dataClass: "derived_learning_metadata",
    examMode: contract.examMode,
    subject: contract.subject,
    subjectLabel: contract.subjectLabel,
    reviewStatus: contract.reviewStatus,
    withholdReasons: contract.withhold.reasons,
    evidenceRefCount: contract.learnerAnswerEvidenceRefs.length,
    rubricDimensionCount: contract.rubricDimensions.length,
    deductionCandidateCount: contract.deductionCandidates.length,
    primaryGapId: contract.primaryGap.id,
    primaryGapType: contract.primaryGap.gapType,
    nextActionId: contract.nextAction.id,
    nextActionType: contract.nextAction.actionType,
    taskHookKind: contract.rewriteOrRecalculationHook.kind,
    practiceRangeStatus: contract.practiceScoreRange.status,
    rangeLower: contract.practiceScoreRange.range?.[0] ?? null,
    rangeUpper: contract.practiceScoreRange.range?.[1] ?? null,
    confidenceLevel: contract.confidence.level,
    sourceStatus: contract.sourceStatus,
    containsRawContent: false,
    nonOfficial: true,
    confirmedScore: false,
    passProbability: false,
    passGuarantee: false,
    resultStartsWithGapAndAction: true,
  }) as RubricEvidenceReviewDerivedMetadata;
  assertNoRawUserDataInDerived(metadata);
  return metadata;
}
