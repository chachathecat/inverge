import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import type { LearnerAnswerSubmissionOcrState } from "./answer-submission-contract";
import {
  PRACTICE_SCORE_RANGE_CAVEAT,
  RUBRIC_EVIDENCE_CONTRACT_VERSION,
  buildRubricEvidenceReviewDerivedMetadata,
  validateRubricEvidenceReviewContract,
  type CommonRubricEvidenceReviewContract,
  type DeductionCandidateContract,
  type LearnerAnswerEvidenceStatus,
  type OneBiggestGapContract,
  type OneNextActionContract,
  type PracticeScoreRangeContract,
  type RubricDimensionContract,
  type RubricEvidenceBlockingReason,
  type RubricEvidenceConfidence,
  type RubricEvidenceConfidenceLevel,
  type RubricEvidenceReference,
  type RubricEvidenceReferenceKind,
  type RubricEvidenceReviewDerivedMetadata,
  type RubricEvidenceReviewStatus,
  type RubricEvidenceSourceStatus,
  type RubricSourceReference,
  type RewriteOrRecalculationTaskHook,
} from "./rubric-evidence-contract";
import {
  loadPracticeCalculationUnitRegistry,
  type PracticeCalculationMetadataStatus,
  type PracticeCalculationType,
  type PracticeCalculationUnitRecord,
  type PracticeCalculationUnitRegistry,
  type PracticeCalculationUnitRegistryConfig,
} from "./practice-calculation-unit-registry";
import {
  loadSecondRoundReferenceAnswerPackageRegistry,
  type SecondRoundPracticeCheckKind,
  type SecondRoundReferenceAnswerPackage,
  type SecondRoundReferenceAnswerPackageRegistry,
  type SecondRoundReferenceAnswerPackageRegistryConfig,
  type SecondRoundValidationCheckStatus,
} from "./second-round-reference-answer-package-registry";

export const S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION = "s213.practice_answer_review.v1" as const;
export const S213_PRACTICE_SUBJECT_LABEL = "appraiser_second_round_practice" as const;

export type S213PracticeReviewConsumer = "learner";
export type S213PracticeReviewActorRole = "learner";

export type S213PracticeDimensionId =
  | "practice_assumptions"
  | "practice_data_selection"
  | "practice_formula_metadata"
  | "practice_calculation_trace"
  | "practice_unit_rounding_time_adjustment"
  | "practice_cross_check"
  | "practice_conclusion_writing";

export type S213PracticeDimensionSignalQuality = "strong" | "partial" | "missing";
export type S213PracticeGateStatus = "passed" | "failed_closed";
export type S213PracticeMetadataCheckStatus =
  | "verified"
  | "not_applicable_verified"
  | "missing"
  | "ambiguous"
  | "unverified"
  | "synthetic_only"
  | "unsupported";

export type S213PracticeMetadataCheckKey =
  | "assumptions"
  | "dataSelection"
  | "formulaMetadata"
  | "calculationTrace"
  | "unitCheck"
  | "roundingCheck"
  | "timeAdjustment"
  | "crossCheck"
  | "conclusionWriting"
  | "independentRecalculation";

export type S213LearnerEvidenceInput = {
  id?: string;
  kind?: RubricEvidenceReferenceKind;
  answerSubmissionId?: string;
  segmentId?: string;
  calculationStepId?: string;
  pageIndex?: number;
  ocrState?: LearnerAnswerSubmissionOcrState;
  verifiedByLearner?: boolean;
  confidence?: RubricEvidenceConfidenceLevel;
};

export type S213PracticeDimensionSignal = {
  dimensionId: S213PracticeDimensionId;
  observedQuality: S213PracticeDimensionSignalQuality;
  evidenceRefIds: string[];
  calculationEvidenceRefIds?: string[];
  confidence?: RubricEvidenceConfidenceLevel;
  conceptNodeIds?: string[];
};

export type S213PracticeMetadataCheckInput = {
  status: S213PracticeMetadataCheckStatus;
  evidenceRefIds: string[];
  sourceAnchorIds?: string[];
  confidence?: RubricEvidenceConfidenceLevel;
};

export type S213PracticeCalculationReviewMetadataInput = {
  calculationUnitId: string;
  calculationType?: PracticeCalculationType;
  assumptions: S213PracticeMetadataCheckInput;
  dataSelection: S213PracticeMetadataCheckInput;
  formulaMetadata: S213PracticeMetadataCheckInput & {
    formulaId?: string;
    formulaKind?: "valuation_formula" | "unit_conversion" | "rounding_policy" | "time_adjustment";
  };
  calculationTrace: S213PracticeMetadataCheckInput;
  unitCheck: S213PracticeMetadataCheckInput;
  roundingCheck: S213PracticeMetadataCheckInput;
  timeAdjustment: S213PracticeMetadataCheckInput;
  crossCheck: S213PracticeMetadataCheckInput;
  conclusionWriting: S213PracticeMetadataCheckInput;
  independentRecalculation: S213PracticeMetadataCheckInput & {
    reviewerCount: number;
  };
};

export type S213PracticeQuestionMetadata = {
  questionId: string;
  subject: "practice";
  subjectLabel?: string;
  totalPoints: number;
  problemMaterialStatus: RubricEvidenceSourceStatus;
  canonicalVerificationStatus: "verified" | "needs_verification" | "blocked";
  conceptNodeIds: string[];
};

export type S213PracticeAnswerReviewInput = {
  reviewRequestId: string;
  consumer: S213PracticeReviewConsumer;
  actorRole: S213PracticeReviewActorRole;
  question: S213PracticeQuestionMetadata;
  answerSubmissionId: string;
  learnerEvidenceRefs: S213LearnerEvidenceInput[];
  referencePackageId?: string;
  calculationUnitId: string;
  calculationReview: S213PracticeCalculationReviewMetadataInput;
  dimensionSignals: S213PracticeDimensionSignal[];
  primaryGapDimensionId?: S213PracticeDimensionId;
};

export type S213PracticeAnswerReviewConfig = {
  referencePackageRegistry?: SecondRoundReferenceAnswerPackageRegistry;
  referencePackageRegistryConfig?: SecondRoundReferenceAnswerPackageRegistryConfig;
  calculationUnitRegistry?: PracticeCalculationUnitRegistry;
  calculationUnitRegistryConfig?: PracticeCalculationUnitRegistryConfig;
};

export type S213PracticeAnswerReviewQualityGate = {
  engineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
  learnerAnswerEvidence: S213PracticeGateStatus;
  referencePackageVerification: S213PracticeGateStatus;
  calculationUnitSupport: S213PracticeGateStatus;
  calculationReviewMetadata: S213PracticeGateStatus;
  dimensionEvidence: Record<S213PracticeDimensionId, S213PracticeGateStatus>;
  metadataChecks: Record<S213PracticeMetadataCheckKey, S213PracticeGateStatus>;
  authorityClaims: "none";
  metadataBoundary: "metadata_only";
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  scoreLikeSummary: "secondary_non_official_range";
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineOnly: true;
  storedProgramDependency: false;
};

export type S213PracticeAnswerReviewDerivedMetadata = RubricEvidenceReviewDerivedMetadata & {
  engineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
  reviewRequestId: string;
  questionId: string;
  referencePackageId: string | null;
  calculationUnitId: string | null;
  calculationType: PracticeCalculationType | null;
  practiceDimensionIds: S213PracticeDimensionId[];
  referencePackageVerification: S213PracticeGateStatus;
  calculationUnitSupport: S213PracticeGateStatus;
  calculationReviewMetadata: S213PracticeGateStatus;
  learnerAnswerEvidence: S213PracticeGateStatus;
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineOnly: true;
  storedProgramDependency: false;
  scoreLikeSummarySecondary: true;
  terminalLearnerAction: CommonRubricEvidenceReviewContract["resultPresentation"]["terminalState"];
  safeForS216ErrorNotebook: boolean;
  safeForS217ConceptGraph: boolean;
};

export type S213PracticeAnswerReviewResult = {
  version: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
  contract: CommonRubricEvidenceReviewContract;
  derivedMetadata: S213PracticeAnswerReviewDerivedMetadata;
  qualityGate: S213PracticeAnswerReviewQualityGate;
  practiceEngine: {
    questionId: string;
    referencePackageId: string | null;
    calculationUnitId: string | null;
    calculationType: PracticeCalculationType | null;
    evaluatedDimensionIds: S213PracticeDimensionId[];
    learnerInstructorBoundary: {
      learnerRouteOnly: true;
      instructorRouteSeparated: true;
      academyTenantDataAccessed: false;
      instructorRuntimeRouteChanged: false;
      instructorFinalGradeApprovalRequiredOutsideLearnerEngine: true;
    };
    prohibitedAuthorityClaims: {
      officialGrading: false;
      officialModelAnswer: false;
      passProbability: false;
      passGuarantee: false;
      confirmedScore: false;
    };
  };
};

type DimensionCatalogEntry = {
  id: S213PracticeDimensionId;
  label: string;
  maxPoints: number;
  rootCauseId: string;
  gapType: string;
  immediateFix: string;
  actionType: "rewrite" | "recalculate";
};

type ReferencePackageReadiness = {
  ready: boolean;
  status: RubricEvidenceSourceStatus;
  gateStatus: S213PracticeGateStatus;
  package: SecondRoundReferenceAnswerPackage | null;
  reasons: RubricEvidenceBlockingReason[];
  uncertaintyReasons: string[];
};

type CalculationUnitReadiness = {
  ready: boolean;
  status: RubricEvidenceSourceStatus;
  gateStatus: S213PracticeGateStatus;
  unit: PracticeCalculationUnitRecord | null;
  reasons: RubricEvidenceBlockingReason[];
  uncertaintyReasons: string[];
};

type CalculationReviewReadiness = {
  ready: boolean;
  status: RubricEvidenceSourceStatus;
  gateStatus: S213PracticeGateStatus;
  reasons: RubricEvidenceBlockingReason[];
  uncertaintyReasons: string[];
  metadataChecks: Record<S213PracticeMetadataCheckKey, S213PracticeGateStatus>;
};

type ReadinessResult = {
  learnerStatus: LearnerAnswerEvidenceStatus;
  learnerReady: boolean;
  reference: ReferencePackageReadiness;
  unit: CalculationUnitReadiness;
  calculationReview: CalculationReviewReadiness;
  problemMaterialStatus: RubricEvidenceSourceStatus;
  dimensionEvidenceReady: boolean;
  withholdReasons: RubricEvidenceBlockingReason[];
  unsupportedCalculation: boolean;
};

const SOURCE_REF_IDS = {
  officialRules: "src-s201-practice-rules",
  questionMetadata: "src-s203-practice-question",
  referencePackage: "src-s207-practice-reference-package",
  rubric: "src-s205-s213-practice-rubric",
  calculationUnit: "src-s210-practice-calculation-unit",
} as const;

const DIMENSION_CATALOG: readonly DimensionCatalogEntry[] = [
  {
    id: "practice_assumptions",
    label: "assumptions",
    maxPoints: 12,
    rootCauseId: "s213-practice-assumptions-gap",
    gapType: "practice_assumptions_gap",
    immediateFix: "rewrite_the_assumption_line_before_recalculating",
    actionType: "rewrite",
  },
  {
    id: "practice_data_selection",
    label: "data selection",
    maxPoints: 14,
    rootCauseId: "s213-practice-data-selection-gap",
    gapType: "practice_data_selection_gap",
    immediateFix: "select_the_required_metadata_fields_before_running_the_formula",
    actionType: "recalculate",
  },
  {
    id: "practice_formula_metadata",
    label: "formula metadata",
    maxPoints: 14,
    rootCauseId: "s213-practice-formula-metadata-gap",
    gapType: "practice_formula_metadata_gap",
    immediateFix: "confirm_the_formula_metadata_anchor_then_restart_the_giii_sequence",
    actionType: "recalculate",
  },
  {
    id: "practice_calculation_trace",
    label: "calculation trace",
    maxPoints: 20,
    rootCauseId: "s213-practice-calculation-trace-gap",
    gapType: "practice_calculation_trace_gap",
    immediateFix: "recalculate_the_trace_from_the_first_unsupported_step",
    actionType: "recalculate",
  },
  {
    id: "practice_unit_rounding_time_adjustment",
    label: "unit rounding time adjustment",
    maxPoints: 20,
    rootCauseId: "s213-practice-unit-rounding-time-gap",
    gapType: "practice_unit_rounding_time_adjustment_gap",
    immediateFix: "rerun_unit_rounding_and_time_adjustment_checks_before_transfer",
    actionType: "recalculate",
  },
  {
    id: "practice_cross_check",
    label: "cross check",
    maxPoints: 10,
    rootCauseId: "s213-practice-cross-check-gap",
    gapType: "practice_cross_check_gap",
    immediateFix: "perform_one_independent_cross_check_before_finalizing_the_answer",
    actionType: "recalculate",
  },
  {
    id: "practice_conclusion_writing",
    label: "conclusion writing",
    maxPoints: 10,
    rootCauseId: "s213-practice-conclusion-writing-gap",
    gapType: "practice_conclusion_writing_gap",
    immediateFix: "rewrite_the_answer_sheet_conclusion_with_unit_and_rounding_metadata",
    actionType: "rewrite",
  },
] as const;

export const S213_PRACTICE_DIMENSION_IDS = DIMENSION_CATALOG.map((dimension) => dimension.id);

const REQUIRED_PRACTICE_CHECK_KINDS: readonly SecondRoundPracticeCheckKind[] = [
  "assumptions",
  "formula",
  "extracted_values",
  "independent_recalculation",
  "unit_check",
  "rounding_check",
  "hand_keyed_sequence",
  "expected_display",
  "answer_sheet_transfer",
  "unsupported_type",
];

const PASSING_REFERENCE_CHECK_STATUSES = new Set<SecondRoundValidationCheckStatus>(["passed"]);
const READY_METADATA_STATUSES = new Set<S213PracticeMetadataCheckStatus>(["verified", "not_applicable_verified"]);
const AUTHORITY_CLAIM_PATTERN =
  /\b(?:official\s+grading|official\s+model\s+answer|official\s+answer|confirmed\s+score|pass\s+probability|pass\s*\/\s*fail|pass-fail|pass\s+guarantee|guaranteed\s+score|score\s+prediction)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoAuthorityClaims(value: unknown, path = "s213"): void {
  if (typeof value === "string") {
    if (AUTHORITY_CLAIM_PATTERN.test(value)) {
      throw new Error(`${path} contains a prohibited official-grading, model-answer, pass-probability, or guarantee claim`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAuthorityClaims(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    assertNoAuthorityClaims(entry, `${path}.${key}`);
  }
}

function assertInputSafe(input: S213PracticeAnswerReviewInput): void {
  if (input.consumer !== "learner" || input.actorRole !== "learner") {
    throw new Error("s213-learner-instructor-boundary: learner engine cannot run on instructor or academy surface");
  }
  if (input.question.subject !== "practice") throw new Error("s213-practice-subject-required");
  if (!input.answerSubmissionId?.trim()) throw new Error("S213 practice review requires answerSubmissionId before review");
  if (!input.reviewRequestId?.trim()) throw new Error("S213 practice review requires reviewRequestId");
  if (!input.question.questionId?.trim()) throw new Error("S213 practice review requires questionId");
  if (!input.calculationUnitId?.trim()) throw new Error("S213 practice review requires calculationUnitId");
  if (input.calculationReview.calculationUnitId !== input.calculationUnitId) {
    throw new Error("s213-calculation-unit-id-mismatch");
  }
  assertNoRawUserDataInDerived(input);
  assertNoAuthorityClaims(input);
}

function confidence(
  level: RubricEvidenceConfidenceLevel,
  reasons: string[],
  uncertaintyReasons: string[] = [],
): RubricEvidenceConfidence {
  return { level, reasons, uncertaintyReasons };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalizeLearnerEvidenceRefs(input: S213PracticeAnswerReviewInput): RubricEvidenceReference[] {
  if (input.learnerEvidenceRefs.length === 0) {
    return [
      {
        id: "ev-s213-missing-learner-evidence",
        kind: "learner_answer_submission",
        dataClass: "user_owned_service_data",
        ownerBinding: "authenticated_request_user",
        answerSubmissionId: input.answerSubmissionId,
        verifiedByLearner: false,
        confidence: "low",
        containsRawContent: false,
      },
    ];
  }

  return input.learnerEvidenceRefs.map((ref, index) => {
    const ocrState = ref.ocrState ?? (ref.verifiedByLearner ? "confirmed_by_learner" : "draft_needs_learner_confirmation");
    return {
      id: ref.id ?? `ev-s213-practice-${index + 1}`,
      kind: ref.kind ?? "learner_calculation_step",
      dataClass: "user_owned_service_data",
      ownerBinding: "authenticated_request_user",
      answerSubmissionId: ref.answerSubmissionId ?? input.answerSubmissionId,
      segmentId: ref.segmentId,
      calculationStepId: ref.calculationStepId,
      pageIndex: ref.pageIndex,
      ocrState,
      verifiedByLearner: ref.verifiedByLearner === true,
      confidence: ref.confidence ?? (ref.verifiedByLearner ? "medium" : "low"),
      containsRawContent: false,
    };
  });
}

function resolveLearnerStatus(input: S213PracticeAnswerReviewInput, refs: readonly RubricEvidenceReference[]): LearnerAnswerEvidenceStatus {
  if (input.learnerEvidenceRefs.length === 0) return "missing";
  const confirmed = refs.every((ref) => (
    ref.verifiedByLearner
    && (ref.ocrState === "confirmed_by_learner"
      || ref.ocrState === "manual_text_fallback"
      || ref.ocrState === "not_required_text_input")
  ));
  return confirmed ? "learner_confirmed" : "ocr_confirmation_needed";
}

function loadReferenceRegistry(config: S213PracticeAnswerReviewConfig) {
  return config.referencePackageRegistry
    ?? loadSecondRoundReferenceAnswerPackageRegistry(config.referencePackageRegistryConfig);
}

function loadCalculationRegistry(config: S213PracticeAnswerReviewConfig) {
  return config.calculationUnitRegistry
    ?? loadPracticeCalculationUnitRegistry(config.calculationUnitRegistryConfig);
}

function findReferencePackage(
  input: S213PracticeAnswerReviewInput,
  registry: SecondRoundReferenceAnswerPackageRegistry,
): SecondRoundReferenceAnswerPackage | null {
  if (input.referencePackageId) {
    return registry.packages.find((pkg) => pkg.id === input.referencePackageId) ?? null;
  }
  return registry.packages.find((pkg) => (
    pkg.subject === "practice"
    && pkg.questionId === input.question.questionId
    && pkg.downstreamUsage.s213PracticeReviewInput
  )) ?? null;
}

function practicePackageReady(pkg: SecondRoundReferenceAnswerPackage | null): boolean {
  if (!pkg || pkg.subject !== "practice" || !pkg.practiceValidation) return false;
  const openBlocking = pkg.releaseBlockers.some((blocker) => blocker.status === "open" && blocker.severity === "blocking");
  const checkKinds = new Set(pkg.practiceValidation.checks.map((check) => check.kind));
  const allRequiredChecksPresent = REQUIRED_PRACTICE_CHECK_KINDS.every((kind) => checkKinds.has(kind));
  const checksPassed = pkg.practiceValidation.checks.every((check) => (
    !check.releaseBlocking || PASSING_REFERENCE_CHECK_STATUSES.has(check.status)
  ));
  return pkg.mode !== "synthetic_fixture"
    && pkg.officialSource.sourceStatus !== "synthetic_fixture"
    && pkg.officialSource.problemTextStatus !== "synthetic_fixture"
    && pkg.officialSource.canonicalVerificationStatus !== "synthetic_fixture"
    && pkg.downstreamUsage.s213PracticeReviewInput
    && pkg.release.status === "released"
    && pkg.learningReference.status === "released_learning_reference"
    && pkg.learningReference.officialClaimAllowed === false
    && pkg.learningReference.scorePredictionAllowed === false
    && pkg.learningReference.passProbabilityAllowed === false
    && pkg.release.learnerFacingOfficialClaimAllowed === false
    && pkg.release.noOfficialAnswerGuardrail === true
    && pkg.release.releaseRequiresNoOpenBlockers === true
    && pkg.verificationReport.sourceStatus === "source_verified"
    && pkg.verificationReport.evidenceStatus === "subject_validated"
    && pkg.verificationReport.subjectValidationStatus === "subject_validated"
    && pkg.verificationReport.criticConsensusStatus === "critic_consensus_passed"
    && pkg.verificationReport.releaseGateStatus === "released"
    && pkg.verificationReport.independentCandidateCount >= 3
    && pkg.verificationReport.criticPassCount >= 1
    && pkg.verificationReport.unresolvedConflictCount === 0
    && !openBlocking
    && pkg.practiceValidation.calculatorModel === "casio_fx_9860giii"
    && pkg.practiceValidation.resetSafeHandKeyedRoutineRequired === true
    && pkg.practiceValidation.storedProgramDependencyAllowed === false
    && pkg.practiceValidation.formulaStored === false
    && pkg.practiceValidation.extractedValuesStored === false
    && pkg.practiceValidation.handKeyedSequenceStored === false
    && pkg.practiceValidation.expectedDisplayStored === false
    && allRequiredChecksPresent
    && checksPassed;
}

function resolveReferenceReadiness(
  input: S213PracticeAnswerReviewInput,
  registry: SecondRoundReferenceAnswerPackageRegistry,
): ReferencePackageReadiness {
  const pkg = findReferencePackage(input, registry);
  const uncertaintyReasons: string[] = [];

  if (!pkg) {
    return {
      ready: false,
      status: "needs_verification",
      gateStatus: "failed_closed",
      package: null,
      reasons: ["reference_package_unverified"],
      uncertaintyReasons: ["reference_package_missing"],
    };
  }

  if (pkg.questionId !== input.question.questionId) uncertaintyReasons.push("reference_package_question_mismatch");
  if (pkg.subject !== "practice") uncertaintyReasons.push("reference_package_subject_not_practice");
  if (!pkg.downstreamUsage.s213PracticeReviewInput) uncertaintyReasons.push("reference_package_not_enabled_for_s213");
  if (pkg.mode === "synthetic_fixture" || pkg.officialSource.sourceStatus === "synthetic_fixture") {
    uncertaintyReasons.push("synthetic_only_reference_package");
  }
  if (pkg.officialSource.problemTextStatus === "synthetic_fixture" || pkg.officialSource.canonicalVerificationStatus === "synthetic_fixture") {
    uncertaintyReasons.push("synthetic_only_problem_or_question_metadata");
  }
  if (pkg.learningReference.status !== "released_learning_reference" || pkg.release.status !== "released") {
    uncertaintyReasons.push("reference_package_not_released");
  }
  if (pkg.learningReference.officialClaimAllowed || pkg.learningReference.scorePredictionAllowed || pkg.learningReference.passProbabilityAllowed) {
    uncertaintyReasons.push("reference_package_authority_claim_guardrail_failed");
  }
  if (pkg.release.learnerFacingOfficialClaimAllowed || !pkg.release.noOfficialAnswerGuardrail) {
    uncertaintyReasons.push("reference_package_official_claim_guardrail_failed");
  }
  if (pkg.verificationReport.sourceStatus !== "source_verified") uncertaintyReasons.push("reference_package_source_not_verified");
  if (pkg.verificationReport.evidenceStatus !== "subject_validated") uncertaintyReasons.push("reference_package_evidence_not_validated");
  if (pkg.verificationReport.subjectValidationStatus !== "subject_validated") uncertaintyReasons.push("reference_package_subject_not_validated");
  if (pkg.verificationReport.criticConsensusStatus !== "critic_consensus_passed") uncertaintyReasons.push("reference_package_critic_consensus_missing");
  if (pkg.verificationReport.releaseGateStatus !== "released") uncertaintyReasons.push("reference_package_release_gate_not_released");
  if (pkg.verificationReport.independentCandidateCount < 3) uncertaintyReasons.push("reference_package_independent_candidates_insufficient");
  if (pkg.verificationReport.criticPassCount < 1) uncertaintyReasons.push("reference_package_critic_missing");
  if (pkg.verificationReport.unresolvedConflictCount !== 0) uncertaintyReasons.push("reference_package_unresolved_conflict");
  if (pkg.releaseBlockers.some((blocker) => blocker.status === "open" && blocker.severity === "blocking")) {
    uncertaintyReasons.push("reference_package_open_blocking_release_blocker");
  }

  const validation = pkg.practiceValidation;
  if (!validation) {
    uncertaintyReasons.push("practice_validation_missing");
  } else {
    if (validation.calculatorModel !== "casio_fx_9860giii") uncertaintyReasons.push("practice_validation_wrong_calculator");
    if (!validation.resetSafeHandKeyedRoutineRequired) uncertaintyReasons.push("practice_validation_reset_safe_missing");
    if (validation.storedProgramDependencyAllowed) uncertaintyReasons.push("practice_validation_stored_program_dependency");
    if (validation.formulaStored || validation.extractedValuesStored || validation.handKeyedSequenceStored || validation.expectedDisplayStored) {
      uncertaintyReasons.push("practice_validation_raw_or_sequence_storage_not_allowed");
    }
    const checkKinds = new Set(validation.checks.map((check) => check.kind));
    for (const kind of REQUIRED_PRACTICE_CHECK_KINDS) {
      if (!checkKinds.has(kind)) uncertaintyReasons.push(`practice_validation_check_missing_${kind}`);
    }
    for (const check of validation.checks) {
      if (check.releaseBlocking && !PASSING_REFERENCE_CHECK_STATUSES.has(check.status)) {
        uncertaintyReasons.push(`practice_validation_check_not_passed_${check.kind}`);
      }
    }
  }

  const ready = practicePackageReady(pkg) && uncertaintyReasons.length === 0;
  return {
    ready,
    status: ready ? "verified" : "needs_verification",
    gateStatus: ready ? "passed" : "failed_closed",
    package: pkg,
    reasons: ready ? [] : ["reference_package_unverified"],
    uncertaintyReasons,
  };
}

function findCalculationUnit(
  input: S213PracticeAnswerReviewInput,
  registry: PracticeCalculationUnitRegistry,
): PracticeCalculationUnitRecord | null {
  return registry.units.find((unit) => unit.id === input.calculationUnitId)
    ?? registry.units.find((unit) => (
      unit.questionLinkage.canonicalQuestionId === input.question.questionId
      && unit.subject === "practice"
    ))
    ?? null;
}

function metadataStatusReady(status: PracticeCalculationMetadataStatus) {
  return status === "metadata_ready";
}

function calculationUnitReady(unit: PracticeCalculationUnitRecord | null, input: S213PracticeAnswerReviewInput): boolean {
  if (!unit) return false;
  return unit.subject === "practice"
    && unit.questionLinkage.subject === "practice"
    && unit.questionLinkage.canonicalQuestionId === input.question.questionId
    && unit.support.status === "supported_metadata_only"
    && unit.support.unsupportedReasonCodes.length === 0
    && unit.questionLinkage.sourceRightsStatus !== "metadata_only_pending"
    && unit.questionLinkage.sourceRightsStatus !== "needs_legal_review"
    && unit.questionLinkage.sourceRightsStatus !== "private_reference_only"
    && unit.formulaMetadata.unitCheckRequired === true
    && unit.formulaMetadata.roundingCheckRequired === true
    && unit.formulaMetadata.formulaExpressionStored === false
    && unit.formulaMetadata.rawFormulaStored === false
    && unit.ocrPolicy.runtimeOcrCalled === false
    && unit.ocrPolicy.rawOcrTextStored === false
    && unit.ocrPolicy.providerPayloadStored === false
    && metadataStatusReady(unit.unitCheck.status)
    && metadataStatusReady(unit.roundingCheck.status)
    && metadataStatusReady(unit.independentRecalculation.status)
    && unit.independentRecalculation.reviewerCountRequired >= 2
    && unit.independentRecalculation.rawTraceStored === false
    && unit.giiiRoutine.calculatorModel === "casio_fx_9860giii"
    && unit.giiiRoutine.resetSafeHandKeyedRoutineRequired === true
    && unit.giiiRoutine.storedProgramDependencyAllowed === false
    && metadataStatusReady(unit.giiiRoutine.routineMetadataStatus)
    && metadataStatusReady(unit.giiiRoutine.handKeyedSequenceMetadata.status)
    && unit.giiiRoutine.handKeyedSequenceMetadata.sequenceStored === false
    && unit.giiiRoutine.expectedDisplayStored === false
    && unit.giiiRoutine.answerSheetTransferTemplateStored === false;
}

function resolveCalculationUnitReadiness(
  input: S213PracticeAnswerReviewInput,
  registry: PracticeCalculationUnitRegistry,
): CalculationUnitReadiness {
  const unit = findCalculationUnit(input, registry);
  const uncertaintyReasons: string[] = [];

  if (!unit) {
    return {
      ready: false,
      status: "needs_verification",
      gateStatus: "failed_closed",
      unit: null,
      reasons: ["calculation_unverified"],
      uncertaintyReasons: ["calculation_unit_missing"],
    };
  }

  if (unit.subject !== "practice" || unit.questionLinkage.subject !== "practice") uncertaintyReasons.push("calculation_unit_subject_not_practice");
  if (unit.questionLinkage.canonicalQuestionId !== input.question.questionId) uncertaintyReasons.push("calculation_unit_question_mismatch");
  if (input.calculationReview.calculationType && input.calculationReview.calculationType !== unit.calculationType) {
    uncertaintyReasons.push("calculation_type_mismatch");
  }
  if (unit.support.status !== "supported_metadata_only" || unit.support.unsupportedReasonCodes.length > 0) {
    uncertaintyReasons.push("calculation_type_unsupported");
  }
  if (
    unit.questionLinkage.sourceRightsStatus === "metadata_only_pending"
    || unit.questionLinkage.sourceRightsStatus === "needs_legal_review"
    || unit.questionLinkage.sourceRightsStatus === "private_reference_only"
  ) {
    uncertaintyReasons.push("calculation_unit_source_rights_unverified");
  }
  if (unit.formulaMetadata.formulaExpressionStored || unit.formulaMetadata.rawFormulaStored) {
    uncertaintyReasons.push("calculation_unit_raw_formula_storage_not_allowed");
  }
  if (!unit.formulaMetadata.unitCheckRequired || !unit.formulaMetadata.roundingCheckRequired) {
    uncertaintyReasons.push("calculation_unit_formula_checks_missing");
  }
  if (unit.ocrPolicy.runtimeOcrCalled || unit.ocrPolicy.rawOcrTextStored || unit.ocrPolicy.providerPayloadStored) {
    uncertaintyReasons.push("calculation_unit_ocr_or_provider_boundary_failed");
  }
  if (!metadataStatusReady(unit.unitCheck.status)) uncertaintyReasons.push("calculation_unit_unit_check_not_ready");
  if (!metadataStatusReady(unit.roundingCheck.status)) uncertaintyReasons.push("calculation_unit_rounding_check_not_ready");
  if (!metadataStatusReady(unit.independentRecalculation.status)) uncertaintyReasons.push("calculation_unit_independent_recalculation_not_ready");
  if (unit.independentRecalculation.reviewerCountRequired < 2) uncertaintyReasons.push("calculation_unit_reviewer_count_insufficient");
  if (unit.independentRecalculation.rawTraceStored) uncertaintyReasons.push("calculation_unit_raw_trace_storage_not_allowed");
  if (unit.giiiRoutine.calculatorModel !== "casio_fx_9860giii") uncertaintyReasons.push("calculation_unit_wrong_calculator");
  if (!unit.giiiRoutine.resetSafeHandKeyedRoutineRequired) uncertaintyReasons.push("calculation_unit_reset_safe_missing");
  if (unit.giiiRoutine.storedProgramDependencyAllowed) uncertaintyReasons.push("calculation_unit_stored_program_dependency");
  if (!metadataStatusReady(unit.giiiRoutine.routineMetadataStatus)) uncertaintyReasons.push("calculation_unit_giii_routine_not_ready");
  if (!metadataStatusReady(unit.giiiRoutine.handKeyedSequenceMetadata.status)) uncertaintyReasons.push("calculation_unit_hand_keyed_sequence_not_ready");
  if (unit.giiiRoutine.handKeyedSequenceMetadata.sequenceStored) uncertaintyReasons.push("calculation_unit_sequence_storage_not_allowed");
  if (unit.giiiRoutine.expectedDisplayStored || unit.giiiRoutine.answerSheetTransferTemplateStored) {
    uncertaintyReasons.push("calculation_unit_display_or_transfer_storage_not_allowed");
  }

  const ready = calculationUnitReady(unit, input) && uncertaintyReasons.length === 0;
  return {
    ready,
    status: ready ? "verified" : "needs_verification",
    gateStatus: ready ? "passed" : "failed_closed",
    unit,
    reasons: ready ? [] : ["calculation_unverified"],
    uncertaintyReasons,
  };
}

function checkStatusReady(check: S213PracticeMetadataCheckInput) {
  return READY_METADATA_STATUSES.has(check.status);
}

function hasKnownEvidence(check: S213PracticeMetadataCheckInput, evidenceIds: ReadonlySet<string>) {
  return check.evidenceRefIds.length > 0 && check.evidenceRefIds.every((id) => evidenceIds.has(id));
}

function resolveCalculationReviewReadiness(
  input: S213PracticeAnswerReviewInput,
  evidenceRefs: readonly RubricEvidenceReference[],
): CalculationReviewReadiness {
  const evidenceIds = new Set(evidenceRefs.map((ref) => ref.id));
  const review = input.calculationReview;
  const checkEntries: Array<[S213PracticeMetadataCheckKey, S213PracticeMetadataCheckInput]> = [
    ["assumptions", review.assumptions],
    ["dataSelection", review.dataSelection],
    ["formulaMetadata", review.formulaMetadata],
    ["calculationTrace", review.calculationTrace],
    ["unitCheck", review.unitCheck],
    ["roundingCheck", review.roundingCheck],
    ["timeAdjustment", review.timeAdjustment],
    ["crossCheck", review.crossCheck],
    ["conclusionWriting", review.conclusionWriting],
    ["independentRecalculation", review.independentRecalculation],
  ];
  const uncertaintyReasons: string[] = [];
  const metadataChecks = Object.fromEntries(
    checkEntries.map(([key, check]) => {
      const ready = checkStatusReady(check) && hasKnownEvidence(check, evidenceIds);
      return [key, ready ? "passed" : "failed_closed"];
    }),
  ) as Record<S213PracticeMetadataCheckKey, S213PracticeGateStatus>;

  if (!review.calculationUnitId.trim()) uncertaintyReasons.push("calculation_unit_id_missing");
  if (review.independentRecalculation.reviewerCount < 2) uncertaintyReasons.push("independent_recalculation_reviewer_count_insufficient");
  for (const [key, check] of checkEntries) {
    if (!checkStatusReady(check)) uncertaintyReasons.push(`${key}_${check.status}`);
    if (!hasKnownEvidence(check, evidenceIds)) uncertaintyReasons.push(`${key}_learner_evidence_unlinked`);
  }

  const ready = uncertaintyReasons.length === 0;
  return {
    ready,
    status: ready ? "verified" : "needs_verification",
    gateStatus: ready ? "passed" : "failed_closed",
    reasons: ready ? [] : ["calculation_unverified"],
    uncertaintyReasons,
    metadataChecks,
  };
}

function dimensionsEvidenceReady(input: S213PracticeAnswerReviewInput, evidenceIds: ReadonlySet<string>): boolean {
  const signalByDimension = new Map(input.dimensionSignals.map((signal) => [signal.dimensionId, signal]));
  return DIMENSION_CATALOG.every((dimension) => {
    const signal = signalByDimension.get(dimension.id);
    return Boolean(signal?.evidenceRefIds.length && signal.evidenceRefIds.every((id) => evidenceIds.has(id)));
  });
}

function resolveReadiness(
  input: S213PracticeAnswerReviewInput,
  evidenceRefs: readonly RubricEvidenceReference[],
  config: S213PracticeAnswerReviewConfig,
): ReadinessResult {
  const learnerStatus = resolveLearnerStatus(input, evidenceRefs);
  const learnerReady = learnerStatus === "learner_confirmed";
  const reference = resolveReferenceReadiness(input, loadReferenceRegistry(config));
  const unit = resolveCalculationUnitReadiness(input, loadCalculationRegistry(config));
  const calculationReview = resolveCalculationReviewReadiness(input, evidenceRefs);
  const evidenceIds = new Set(evidenceRefs.map((ref) => ref.id));
  const dimensionEvidence = dimensionsEvidenceReady(input, evidenceIds);
  const withholdReasons: RubricEvidenceBlockingReason[] = [];
  const calculationUncertainty = [...unit.uncertaintyReasons, ...calculationReview.uncertaintyReasons];
  const unsupportedCalculation = calculationUncertainty.some((reason) => (
    reason.includes("unsupported")
    || reason.includes("ambiguous")
    || reason.includes("synthetic_only")
  ));

  if (learnerStatus === "missing") withholdReasons.push("learner_answer_missing");
  if (learnerStatus === "ocr_confirmation_needed") withholdReasons.push("ocr_unconfirmed");
  if (!reference.ready) withholdReasons.push(...reference.reasons);
  if (!unit.ready || !calculationReview.ready) withholdReasons.push("calculation_unverified");
  if (input.question.problemMaterialStatus !== "verified" || input.question.canonicalVerificationStatus !== "verified") {
    withholdReasons.push("rubric_unverified");
  }
  if (learnerReady && !dimensionEvidence) withholdReasons.push("learner_evidence_unlinked");

  return {
    learnerStatus,
    learnerReady,
    reference,
    unit,
    calculationReview,
    problemMaterialStatus: input.question.problemMaterialStatus,
    dimensionEvidenceReady: dimensionEvidence,
    withholdReasons: unique(withholdReasons),
    unsupportedCalculation,
  };
}

function qualityRange(dimension: DimensionCatalogEntry, signal: S213PracticeDimensionSignal): [number, number] {
  if (signal.observedQuality === "strong") {
    return [Math.round(dimension.maxPoints * 0.78), Math.round(dimension.maxPoints * 0.94)];
  }
  if (signal.observedQuality === "partial") {
    return [Math.round(dimension.maxPoints * 0.42), Math.round(dimension.maxPoints * 0.68)];
  }
  return [0, Math.max(1, Math.round(dimension.maxPoints * 0.25))];
}

function severityForSignal(signal: S213PracticeDimensionSignal): DeductionCandidateContract["severity"] {
  if (signal.observedQuality === "missing") return "major";
  if (signal.observedQuality === "partial") return "moderate";
  return "minor";
}

function signalByDimension(input: S213PracticeAnswerReviewInput) {
  return new Map(input.dimensionSignals.map((signal) => [signal.dimensionId, signal]));
}

function buildSourceRefs(readiness: ReadinessResult): RubricSourceReference[] {
  return [
    {
      id: SOURCE_REF_IDS.officialRules,
      kind: "official_rule_registry",
      sourceId: "s201-appraiser-second-practice-point-scale",
      verificationStatus: "verified",
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.questionMetadata,
      kind: "question_metadata_registry",
      sourceId: readiness.reference.package?.questionId ?? "s203-practice-question-unresolved",
      verificationStatus: readiness.problemMaterialStatus,
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.referencePackage,
      kind: "reference_answer_package",
      sourceId: readiness.reference.package?.id ?? "s207-practice-reference-package-unresolved",
      verificationStatus: readiness.reference.status,
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.rubric,
      kind: "rubric_blueprint",
      sourceId: "s213-practice-answer-review-dimension-catalog",
      verificationStatus: "verified",
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.calculationUnit,
      kind: "calculation_validator",
      sourceId: readiness.unit.unit?.id ?? "s210-practice-calculation-unit-unresolved",
      verificationStatus: readiness.unit.ready && readiness.calculationReview.ready ? "verified" : "needs_verification",
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
  ];
}

function buildReadyDimensionsAndDeductions(
  input: S213PracticeAnswerReviewInput,
): {
  dimensions: RubricDimensionContract[];
  deductions: DeductionCandidateContract[];
} {
  const signals = signalByDimension(input);
  const deductions: DeductionCandidateContract[] = [];
  const dimensions = DIMENSION_CATALOG.map((dimension) => {
    const signal = signals.get(dimension.id);
    if (!signal) throw new Error(`S213 missing dimension signal for ${dimension.id}`);
    const deductionCandidateIds: string[] = [];
    if (signal.observedQuality !== "strong") {
      const candidateId = `deduction-s213-${dimension.id}`;
      deductionCandidateIds.push(candidateId);
      deductions.push({
        id: candidateId,
        dimensionId: dimension.id,
        rootCauseId: dimension.rootCauseId,
        gapType: dimension.gapType,
        severity: severityForSignal(signal),
        evidenceRefIds: signal.evidenceRefIds,
        sourceRefIds: [SOURCE_REF_IDS.rubric, SOURCE_REF_IDS.referencePackage, SOURCE_REF_IDS.calculationUnit],
        confidence: confidence(signal.confidence ?? "medium", ["s213_dimension_signal_metadata"], []),
        learnerFacingSummary: `${dimension.gapType}_detected`,
        immediateFix: dimension.immediateFix,
        duplicateRootCauseGroupId: dimension.rootCauseId,
        status: "candidate",
        officialScoreDeduction: false,
      });
    }

    return {
      id: dimension.id,
      subjectScope: ["practice"],
      label: dimension.label,
      maxPoints: dimension.maxPoints,
      pointCeilingSourceRefId: SOURCE_REF_IDS.officialRules,
      sourceStatus: "verified",
      evidenceRefIds: signal.evidenceRefIds,
      deductionCandidateIds,
      estimatedPointsRange: qualityRange(dimension, signal),
      confidence: confidence(signal.confidence ?? "medium", ["s213_dimension_signal_metadata"], []),
      status: "evaluated",
    } satisfies RubricDimensionContract;
  });
  return { dimensions, deductions };
}

function buildWithheldDimensions(sourceStatus: RubricEvidenceSourceStatus): RubricDimensionContract[] {
  return DIMENSION_CATALOG.map((dimension) => ({
    id: dimension.id,
    subjectScope: ["practice"],
    label: dimension.label,
    maxPoints: dimension.maxPoints,
    pointCeilingSourceRefId: SOURCE_REF_IDS.officialRules,
    sourceStatus,
    evidenceRefIds: [],
    deductionCandidateIds: [],
    estimatedPointsRange: null,
    confidence: confidence("low", ["s213_review_withheld"], ["source_or_evidence_not_ready"]),
    status: "not_evaluated_insufficient_evidence",
  }));
}

function severityRank(severity: DeductionCandidateContract["severity"]) {
  if (severity === "major") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function selectPrimaryDeduction(
  input: S213PracticeAnswerReviewInput,
  deductions: readonly DeductionCandidateContract[],
) {
  const preferred = input.primaryGapDimensionId
    ? deductions.find((candidate) => candidate.dimensionId === input.primaryGapDimensionId)
    : undefined;
  return preferred ?? [...deductions].sort((left, right) => {
    const severityDelta = severityRank(right.severity) - severityRank(left.severity);
    if (severityDelta !== 0) return severityDelta;
    const leftOrder = DIMENSION_CATALOG.findIndex((dimension) => dimension.id === left.dimensionId);
    const rightOrder = DIMENSION_CATALOG.findIndex((dimension) => dimension.id === right.dimensionId);
    return leftOrder - rightOrder;
  })[0] ?? null;
}

function buildReadyPrimaryGap(
  input: S213PracticeAnswerReviewInput,
  deductions: readonly DeductionCandidateContract[],
  evidenceRefs: readonly RubricEvidenceReference[],
): OneBiggestGapContract {
  const primary = selectPrimaryDeduction(input, deductions);
  if (!primary) {
    return {
      id: "gap-s213-maintain-practice-routine",
      gapType: "maintain_practice_recalculation_routine",
      dimensionId: input.primaryGapDimensionId ?? "practice_cross_check",
      deductionCandidateIds: [],
      evidenceRefIds: evidenceRefs.map((ref) => ref.id),
      conceptNodeIds: input.question.conceptNodeIds,
      severity: "minor",
      confidence: confidence("medium", ["s213_no_deduction_metadata"], []),
      learnerFacingSummary: "schedule_review_to_keep_giii_practice_routine_retrievable",
    };
  }
  const signal = input.dimensionSignals.find((entry) => entry.dimensionId === primary.dimensionId);
  return {
    id: `gap-s213-${primary.dimensionId}`,
    gapType: primary.gapType,
    dimensionId: primary.dimensionId,
    deductionCandidateIds: [primary.id],
    evidenceRefIds: primary.evidenceRefIds,
    conceptNodeIds: signal?.conceptNodeIds ?? input.question.conceptNodeIds,
    severity: primary.severity,
    confidence: primary.confidence,
    learnerFacingSummary: primary.learnerFacingSummary,
  };
}

function buildWithheldGap(readiness: ReadinessResult, evidenceRefs: readonly RubricEvidenceReference[]): OneBiggestGapContract {
  const gapType = readiness.learnerStatus === "ocr_confirmation_needed"
    ? "ocr_confirmation_needed"
    : readiness.learnerStatus === "missing"
      ? "learner_answer_evidence_missing"
      : readiness.unsupportedCalculation
        ? "practice_calculation_unsupported_or_ambiguous"
        : !readiness.reference.ready
          ? "practice_reference_package_verification_required"
          : "practice_calculation_metadata_verification_required";

  return {
    id: `gap-s213-${gapType}`,
    gapType,
    dimensionId: null,
    deductionCandidateIds: [],
    evidenceRefIds: evidenceRefs.map((ref) => ref.id),
    conceptNodeIds: [],
    severity: readiness.unsupportedCalculation || !readiness.reference.ready ? "major" : "moderate",
    confidence: confidence("low", ["s213_fail_closed_metadata"], readiness.withholdReasons),
    learnerFacingSummary: `${gapType}_before_practice_review`,
  };
}

function actionForReadyGap(gap: OneBiggestGapContract): OneNextActionContract["actionType"] {
  const dimension = DIMENSION_CATALOG.find((entry) => entry.id === gap.dimensionId);
  if (!dimension) return "schedule_review";
  return dimension.actionType;
}

function buildNextAction(
  reviewReady: boolean,
  readiness: ReadinessResult,
  gap: OneBiggestGapContract,
): OneNextActionContract {
  const actionType: OneNextActionContract["actionType"] = reviewReady
    ? (gap.deductionCandidateIds.length > 0 ? actionForReadyGap(gap) : "schedule_review")
    : readiness.learnerStatus === "ocr_confirmation_needed"
      ? "confirm_ocr"
      : (!readiness.reference.ready || !readiness.unit.ready || !readiness.calculationReview.ready)
        ? "withhold_until_verified"
        : "retry";

  return {
    id: `action-s213-${actionType}`,
    actionType,
    targetGapId: gap.id,
    targetEvidenceRefIds: gap.evidenceRefIds,
    defaultAction: true,
    learnerCanOverride: true,
    learnerFacingInstruction: `${actionType}_one_practice_answer_task`,
  };
}

function buildHook(
  reviewReady: boolean,
  nextAction: OneNextActionContract,
  gap: OneBiggestGapContract,
): RewriteOrRecalculationTaskHook {
  const kind: RewriteOrRecalculationTaskHook["kind"] = reviewReady
    ? nextAction.actionType === "recalculate"
      ? "recalculation"
      : nextAction.actionType === "schedule_review"
        ? "scheduled_review"
        : "rewrite"
    : nextAction.actionType === "confirm_ocr"
      ? "ocr_confirmation"
      : "withheld";

  return {
    kind,
    targetGapId: gap.id,
    sourceEvidenceRefIds: gap.evidenceRefIds,
    retryReviewAllowed: true,
    calculator: kind === "recalculation"
      ? {
          model: "casio_fx_9860giii",
          resetSafeHandKeyedRoutineOnly: true,
          storedProgramDependency: false,
        }
      : null,
  };
}

function buildPracticeScoreRange(
  reviewReady: boolean,
  evidenceRefs: readonly RubricEvidenceReference[],
  dimensions: readonly RubricDimensionContract[],
): PracticeScoreRangeContract {
  if (!reviewReady) {
    return {
      status: "withheld_insufficient_evidence",
      range: null,
      scoreScale: {
        min: 0,
        max: 100,
        sourceRefId: SOURCE_REF_IDS.officialRules,
        verificationStatus: "verified",
        officialPassThresholdUsed: false,
      },
      confidence: confidence("low", ["s213_review_withheld"], ["score_range_withheld_until_evidence_sources_and_calculation_are_ready"]),
      evidenceRefIds: [],
      rubricDimensionIds: [],
      secondaryToGapAndAction: true,
      nonOfficial: true,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
      notFinalEndpoint: true,
      caveat: PRACTICE_SCORE_RANGE_CAVEAT,
    };
  }

  const ranges = dimensions.map((dimension) => dimension.estimatedPointsRange).filter((range): range is [number, number] => Boolean(range));
  const low = ranges.reduce((sum, range) => sum + range[0], 0);
  const high = ranges.reduce((sum, range) => sum + range[1], 0);

  return {
    status: "estimated",
    range: [low, Math.max(low + 1, high)],
    scoreScale: {
      min: 0,
      max: 100,
      sourceRefId: SOURCE_REF_IDS.officialRules,
      verificationStatus: "verified",
      officialPassThresholdUsed: false,
    },
    confidence: confidence("medium", ["s213_dimension_ranges_metadata"], ["learning_support_estimate_only"]),
    evidenceRefIds: evidenceRefs.map((ref) => ref.id),
    rubricDimensionIds: dimensions.map((dimension) => dimension.id),
    secondaryToGapAndAction: true,
    nonOfficial: true,
    confirmedScore: false,
    passProbability: false,
    passGuarantee: false,
    notFinalEndpoint: true,
    caveat: PRACTICE_SCORE_RANGE_CAVEAT,
  };
}

function reviewStatusFor(readiness: ReadinessResult): RubricEvidenceReviewStatus {
  if (!readiness.learnerReady) {
    return readiness.learnerStatus === "ocr_confirmation_needed"
      ? "withheld_unconfirmed_ocr"
      : "withheld_insufficient_evidence";
  }
  if (readiness.unsupportedCalculation) return "withheld_unsupported_calculation";
  if (!readiness.reference.ready || readiness.problemMaterialStatus !== "verified") return "withheld_unverified_source";
  if (!readiness.unit.ready || !readiness.calculationReview.ready) return "withheld_unsupported_calculation";
  if (!readiness.dimensionEvidenceReady) return "withheld_insufficient_evidence";
  return "ready";
}

function buildQualityGate(
  input: S213PracticeAnswerReviewInput,
  readiness: ReadinessResult,
): S213PracticeAnswerReviewQualityGate {
  const signals = signalByDimension(input);
  const dimensionEvidence = Object.fromEntries(
    DIMENSION_CATALOG.map((dimension) => {
      const signal = signals.get(dimension.id);
      const status: S213PracticeGateStatus = signal?.evidenceRefIds.length ? "passed" : "failed_closed";
      return [dimension.id, status];
    }),
  ) as Record<S213PracticeDimensionId, S213PracticeGateStatus>;

  return {
    engineVersion: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
    learnerAnswerEvidence: readiness.learnerReady ? "passed" : "failed_closed",
    referencePackageVerification: readiness.reference.gateStatus,
    calculationUnitSupport: readiness.unit.gateStatus,
    calculationReviewMetadata: readiness.calculationReview.gateStatus,
    dimensionEvidence,
    metadataChecks: readiness.calculationReview.metadataChecks,
    authorityClaims: "none",
    metadataBoundary: "metadata_only",
    learnerInstructorSeparation: "learner_only_no_instructor_route",
    scoreLikeSummary: "secondary_non_official_range",
    calculatorModel: "casio_fx_9860giii",
    resetSafeHandKeyedRoutineOnly: true,
    storedProgramDependency: false,
  };
}

function buildContract(
  input: S213PracticeAnswerReviewInput,
  evidenceRefs: readonly RubricEvidenceReference[],
  readiness: ReadinessResult,
): CommonRubricEvidenceReviewContract {
  const reviewStatus = reviewStatusFor(readiness);
  const reviewReady = reviewStatus === "ready";
  const sourceRefs = buildSourceRefs(readiness);
  const rows = reviewReady
    ? buildReadyDimensionsAndDeductions(input)
    : { dimensions: buildWithheldDimensions(readiness.calculationReview.status), deductions: [] };
  const primaryGap = reviewReady
    ? buildReadyPrimaryGap(input, rows.deductions, evidenceRefs)
    : buildWithheldGap(readiness, evidenceRefs);
  const nextAction = buildNextAction(reviewReady, readiness, primaryGap);
  const rewriteOrRecalculationHook = buildHook(reviewReady, nextAction, primaryGap);
  const practiceScoreRange = buildPracticeScoreRange(reviewReady, evidenceRefs, rows.dimensions);

  return {
    version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: "practice",
    subjectLabel: input.question.subjectLabel ?? S213_PRACTICE_SUBJECT_LABEL,
    reviewStatus,
    withhold: {
      withheld: reviewStatus !== "ready",
      reasons: reviewStatus === "ready" ? [] : readiness.withholdReasons,
    },
    sourceStatus: {
      learnerAnswer: readiness.learnerStatus,
      problemMaterial: readiness.problemMaterialStatus,
      referencePackage: readiness.reference.status,
      rubric: "verified",
      officialRules: "verified",
      calculation: readiness.unit.ready && readiness.calculationReview.ready ? "verified" : "needs_verification",
    },
    learnerAnswerEvidenceRefs: [...evidenceRefs],
    sourceVerificationRefs: sourceRefs,
    rubricDimensions: rows.dimensions,
    deductionCandidates: rows.deductions,
    confidence: confidence(reviewReady ? "medium" : "low", ["s213_practice_review_engine"], reviewReady ? [] : readiness.withholdReasons),
    primaryGap,
    nextAction,
    rewriteOrRecalculationHook,
    practiceScoreRange,
    resultPresentation: {
      order: ["one_biggest_gap", "one_next_action", "evidence_review", "rewrite_or_recalculation", "practice_score_range"],
      startsWithGapAndAction: true,
      scoreSummaryPosition: "secondary_after_evidence",
      terminalState: "rewrite_or_recalculation_or_scheduled_review",
    },
    dataBoundary: {
      learnerMaterialInContract: false,
      ocrMaterialInContract: false,
      officialMaterialInContract: false,
      globalReferenceWrite: false,
      modelTrainingUse: false,
      telemetrySafe: true,
    },
  };
}

function buildDerivedMetadata(
  input: S213PracticeAnswerReviewInput,
  contract: CommonRubricEvidenceReviewContract,
  readiness: ReadinessResult,
  qualityGate: S213PracticeAnswerReviewQualityGate,
): S213PracticeAnswerReviewDerivedMetadata {
  const metadata = sanitizeDerivedMetadata({
    ...buildRubricEvidenceReviewDerivedMetadata(contract),
    engineVersion: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
    reviewRequestId: input.reviewRequestId,
    questionId: input.question.questionId,
    referencePackageId: readiness.reference.package?.id ?? null,
    calculationUnitId: readiness.unit.unit?.id ?? null,
    calculationType: readiness.unit.unit?.calculationType ?? null,
    practiceDimensionIds: [...S213_PRACTICE_DIMENSION_IDS],
    referencePackageVerification: qualityGate.referencePackageVerification,
    calculationUnitSupport: qualityGate.calculationUnitSupport,
    calculationReviewMetadata: qualityGate.calculationReviewMetadata,
    learnerAnswerEvidence: qualityGate.learnerAnswerEvidence,
    learnerInstructorSeparation: "learner_only_no_instructor_route",
    calculatorModel: "casio_fx_9860giii",
    resetSafeHandKeyedRoutineOnly: true,
    storedProgramDependency: false,
    scoreLikeSummarySecondary: true,
    terminalLearnerAction: contract.resultPresentation.terminalState,
    safeForS216ErrorNotebook: contract.reviewStatus === "ready",
    safeForS217ConceptGraph: contract.reviewStatus === "ready",
  }) as S213PracticeAnswerReviewDerivedMetadata;
  assertNoRawUserDataInDerived(metadata);
  assertNoAuthorityClaims(metadata);
  return metadata;
}

export function buildS213PracticeAnswerReview(
  input: S213PracticeAnswerReviewInput,
  config: S213PracticeAnswerReviewConfig = {},
): S213PracticeAnswerReviewResult {
  assertInputSafe(input);
  const learnerAnswerEvidenceRefs = normalizeLearnerEvidenceRefs(input);
  const readiness = resolveReadiness(input, learnerAnswerEvidenceRefs, config);
  const contract = buildContract(input, learnerAnswerEvidenceRefs, readiness);
  const validation = validateRubricEvidenceReviewContract(contract);
  if (!validation.valid) {
    throw new Error(`invalid-s213-practice-review-contract: ${validation.errors.join("; ")}`);
  }
  assertNoRawUserDataInDerived(contract);
  assertNoAuthorityClaims(contract);
  const qualityGate = buildQualityGate(input, readiness);
  const derivedMetadata = buildDerivedMetadata(input, contract, readiness, qualityGate);

  return {
    version: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
    contract,
    derivedMetadata,
    qualityGate,
    practiceEngine: {
      questionId: input.question.questionId,
      referencePackageId: readiness.reference.package?.id ?? null,
      calculationUnitId: readiness.unit.unit?.id ?? null,
      calculationType: readiness.unit.unit?.calculationType ?? null,
      evaluatedDimensionIds: contract.rubricDimensions
        .filter((dimension) => dimension.status === "evaluated")
        .map((dimension) => dimension.id as S213PracticeDimensionId),
      learnerInstructorBoundary: {
        learnerRouteOnly: true,
        instructorRouteSeparated: true,
        academyTenantDataAccessed: false,
        instructorRuntimeRouteChanged: false,
        instructorFinalGradeApprovalRequiredOutsideLearnerEngine: true,
      },
      prohibitedAuthorityClaims: {
        officialGrading: false,
        officialModelAnswer: false,
        passProbability: false,
        passGuarantee: false,
        confirmedScore: false,
      },
    },
  };
}
