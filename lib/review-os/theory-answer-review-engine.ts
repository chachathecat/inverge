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
  loadSecondRoundReferenceAnswerPackageRegistry,
  type SecondRoundReferenceAnswerPackage,
  type SecondRoundReferenceAnswerPackageRegistry,
  type SecondRoundReferenceAnswerPackageRegistryConfig,
  type SecondRoundValidationCheckStatus,
} from "./second-round-reference-answer-package-registry";
import {
  loadTheoryConceptCorpusRegistry,
  type TheoryConceptAnchor,
  type TheoryConceptBlocker,
  type TheoryConceptCorpusRegistry,
  type TheoryConceptCorpusRegistryConfig,
  type TheoryConceptStatus,
  type TheoryConceptCheck,
} from "./theory-concept-corpus-registry";

export const S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION = "s212.theory_answer_review.v1" as const;
export const S212_THEORY_SUBJECT_LABEL = "appraiser_second_round_theory" as const;

export type S212TheoryDimensionId =
  | "definition_quality"
  | "theory_basis"
  | "comparison_frame"
  | "application_evaluation"
  | "conclusion"
  | "compression_relevance";

export type S212TheoryDimensionSignalQuality = "strong" | "partial" | "missing";
export type S212TheoryGateStatus = "passed" | "failed_closed";

export type S212LearnerEvidenceInput = {
  id?: string;
  kind?: RubricEvidenceReferenceKind;
  answerSubmissionId?: string;
  segmentId?: string;
  pageIndex?: number;
  ocrState?: LearnerAnswerSubmissionOcrState;
  verifiedByLearner?: boolean;
  confidence?: RubricEvidenceConfidenceLevel;
};

export type S212TheoryDimensionSignal = {
  dimensionId: S212TheoryDimensionId;
  observedQuality: S212TheoryDimensionSignalQuality;
  evidenceRefIds: string[];
  confidence?: RubricEvidenceConfidenceLevel;
  conceptNodeIds?: string[];
};

export type S212TheoryAnswerReviewInput = {
  questionId: string;
  answerSubmissionId: string;
  learnerEvidenceRefs: S212LearnerEvidenceInput[];
  dimensionSignals: S212TheoryDimensionSignal[];
  referencePackageId?: string;
  theoryConceptCheckId?: string;
  primaryGapDimensionId?: S212TheoryDimensionId;
};

export type S212TheoryAnswerReviewConfig = {
  referencePackageRegistry?: SecondRoundReferenceAnswerPackageRegistry;
  referencePackageRegistryConfig?: SecondRoundReferenceAnswerPackageRegistryConfig;
  theoryConceptRegistry?: TheoryConceptCorpusRegistry;
  theoryConceptRegistryConfig?: TheoryConceptCorpusRegistryConfig;
};

export type S212TheoryAnswerReviewQualityGate = {
  engineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
  learnerAnswerEvidence: S212TheoryGateStatus;
  conceptSourceVerification: S212TheoryGateStatus;
  referencePackageVerification: S212TheoryGateStatus;
  dimensionEvidence: Record<S212TheoryDimensionId, S212TheoryGateStatus>;
  authorityClaims: "none";
  metadataBoundary: "metadata_only";
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  scoreLikeSummary: "secondary_non_official_range";
};

export type S212TheoryAnswerReviewDerivedMetadata = RubricEvidenceReviewDerivedMetadata & {
  engineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
  theoryQualityDimensionIds: S212TheoryDimensionId[];
  conceptSourceVerification: S212TheoryGateStatus;
  referencePackageVerification: S212TheoryGateStatus;
  learnerAnswerEvidence: S212TheoryGateStatus;
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  scoreLikeSummarySecondary: true;
  terminalLearnerAction: CommonRubricEvidenceReviewContract["resultPresentation"]["terminalState"];
  safeForS216ErrorNotebook: boolean;
  safeForS217ConceptGraph: boolean;
};

export type S212TheoryAnswerReviewResult = {
  version: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
  contract: CommonRubricEvidenceReviewContract;
  derivedMetadata: S212TheoryAnswerReviewDerivedMetadata;
  qualityGate: S212TheoryAnswerReviewQualityGate;
};

type DimensionCatalogEntry = {
  id: S212TheoryDimensionId;
  label: string;
  maxPoints: number;
  rootCauseId: string;
  gapType: string;
  immediateFix: string;
};

type ReadinessResult = {
  learnerStatus: LearnerAnswerEvidenceStatus;
  learnerReady: boolean;
  conceptReady: boolean;
  conceptStatus: RubricEvidenceSourceStatus;
  referencePackageReady: boolean;
  referencePackageStatus: RubricEvidenceSourceStatus;
  problemMaterialStatus: RubricEvidenceSourceStatus;
  dimensionEvidenceReady: boolean;
  withholdReasons: RubricEvidenceBlockingReason[];
  referencePackage: SecondRoundReferenceAnswerPackage | null;
  conceptCheck: TheoryConceptCheck | null;
};

const SOURCE_REF_IDS = {
  officialRules: "src-s201-theory-rules",
  questionMetadata: "src-s203-theory-question",
  referencePackage: "src-s207-theory-reference-package",
  rubric: "src-s205-s212-theory-rubric",
  theoryConcept: "src-s209-theory-concept-source",
} as const;

const DIMENSION_CATALOG: readonly DimensionCatalogEntry[] = [
  {
    id: "definition_quality",
    label: "definition quality",
    maxPoints: 18,
    rootCauseId: "s212-definition-quality-gap",
    gapType: "definition_quality_gap",
    immediateFix: "rewrite_one_definition_sentence_before_expanding_the_paragraph",
  },
  {
    id: "theory_basis",
    label: "theory basis",
    maxPoints: 20,
    rootCauseId: "s212-theory-basis-gap",
    gapType: "theory_basis_gap",
    immediateFix: "add_one_grounding_principle_and_link_it_to_the_required_concept",
  },
  {
    id: "comparison_frame",
    label: "comparison frame",
    maxPoints: 17,
    rootCauseId: "s212-comparison-frame-gap",
    gapType: "comparison_frame_gap",
    immediateFix: "state_the_comparison_axis_before_listing_the_two_positions",
  },
  {
    id: "application_evaluation",
    label: "application and evaluation",
    maxPoints: 25,
    rootCauseId: "s212-application-evaluation-gap",
    gapType: "application_evaluation_gap",
    immediateFix: "connect_the_concept_to_the_question_condition_and_evaluate_the_result",
  },
  {
    id: "conclusion",
    label: "conclusion",
    maxPoints: 10,
    rootCauseId: "s212-conclusion-gap",
    gapType: "conclusion_gap",
    immediateFix: "close_with_one_judgment_sentence_that_matches_the_question_scope",
  },
  {
    id: "compression_relevance",
    label: "compression and relevance",
    maxPoints: 10,
    rootCauseId: "s212-compression-relevance-gap",
    gapType: "compression_relevance_gap",
    immediateFix: "remove_one_off_scope_list_item_and_keep_only_claims_needed_for_this_question",
  },
] as const;

export const S212_THEORY_DIMENSION_IDS = DIMENSION_CATALOG.map((dimension) => dimension.id);

const PASSING_REFERENCE_CHECK_STATUSES = new Set<SecondRoundValidationCheckStatus>(["passed", "synthetic_fixture"]);
const AUTHORITY_CLAIM_PATTERN =
  /\b(?:official\s+grading|official\s+model\s+answer|pass\s+probability|pass\s*\/\s*fail|pass-fail|pass\s+guarantee|guaranteed\s+score|confirmed\s+score|score\s+prediction)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoAuthorityClaims(value: unknown, path = "s212"): void {
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

function assertS212InputSafe(input: S212TheoryAnswerReviewInput): void {
  if (!input.answerSubmissionId?.trim()) {
    throw new Error("S212 theory review requires answerSubmissionId before review");
  }
  if (!input.questionId?.trim()) {
    throw new Error("S212 theory review requires questionId before review");
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

function normalizeLearnerEvidenceRefs(input: S212TheoryAnswerReviewInput): RubricEvidenceReference[] {
  if (input.learnerEvidenceRefs.length === 0) {
    return [
      {
        id: "ev-s212-missing-learner-evidence",
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
      id: ref.id ?? `ev-s212-theory-${index + 1}`,
      kind: ref.kind ?? "learner_confirmed_ocr_segment",
      dataClass: "user_owned_service_data",
      ownerBinding: "authenticated_request_user",
      answerSubmissionId: ref.answerSubmissionId ?? input.answerSubmissionId,
      segmentId: ref.segmentId,
      pageIndex: ref.pageIndex,
      ocrState,
      verifiedByLearner: ref.verifiedByLearner === true,
      confidence: ref.confidence ?? (ref.verifiedByLearner ? "medium" : "low"),
      containsRawContent: false,
    };
  });
}

function resolveLearnerStatus(input: S212TheoryAnswerReviewInput, refs: readonly RubricEvidenceReference[]) {
  if (input.learnerEvidenceRefs.length === 0) return "missing" as const;
  const confirmed = refs.every((ref) => (
    ref.verifiedByLearner
    && (ref.ocrState === "confirmed_by_learner"
      || ref.ocrState === "manual_text_fallback"
      || ref.ocrState === "not_required_text_input")
  ));
  return confirmed ? "learner_confirmed" as const : "ocr_confirmation_needed" as const;
}

function loadReferencePackageRegistry(config: S212TheoryAnswerReviewConfig) {
  return config.referencePackageRegistry
    ?? loadSecondRoundReferenceAnswerPackageRegistry(config.referencePackageRegistryConfig);
}

function loadTheoryRegistry(config: S212TheoryAnswerReviewConfig) {
  return config.theoryConceptRegistry ?? loadTheoryConceptCorpusRegistry(config.theoryConceptRegistryConfig);
}

function findReferencePackage(
  input: S212TheoryAnswerReviewInput,
  registry: SecondRoundReferenceAnswerPackageRegistry,
): SecondRoundReferenceAnswerPackage | null {
  if (input.referencePackageId) {
    return registry.packages.find((pkg) => pkg.id === input.referencePackageId) ?? null;
  }
  return registry.packages.find((pkg) => (
    pkg.subject === "theory"
    && pkg.questionId === input.questionId
    && pkg.downstreamUsage.s212TheoryReviewInput
  )) ?? null;
}

function referencePackageReady(pkg: SecondRoundReferenceAnswerPackage | null): boolean {
  if (!pkg || pkg.subject !== "theory") return false;
  const openBlocking = pkg.releaseBlockers.some((blocker) => blocker.status === "open" && blocker.severity === "blocking");
  return pkg.downstreamUsage.s212TheoryReviewInput
    && pkg.release.status === "released"
    && pkg.learningReference.status === "released_learning_reference"
    && pkg.learningReference.officialClaimAllowed === false
    && pkg.learningReference.passProbabilityAllowed === false
    && pkg.verificationReport.unresolvedConflictCount === 0
    && !openBlocking
    && Boolean(pkg.theoryValidation?.checks.length)
    && Boolean(pkg.theoryValidation?.checks.every((check) => PASSING_REFERENCE_CHECK_STATUSES.has(check.status)));
}

function findConceptCheck(
  input: S212TheoryAnswerReviewInput,
  registry: TheoryConceptCorpusRegistry,
): TheoryConceptCheck | null {
  if (input.theoryConceptCheckId) {
    return registry.theoryConceptChecks.find((check) => check.checkId === input.theoryConceptCheckId) ?? null;
  }
  return registry.theoryConceptChecks.find((check) => check.questionId === input.questionId) ?? null;
}

function statusVerifiedForS212(status: TheoryConceptStatus, registry: TheoryConceptCorpusRegistry): boolean {
  return status === "verified" || (registry.boundaryPolicy.syntheticFixturesOnly && status === "synthetic_fixture");
}

function hasOpenBlockingBlocker(
  blockerIds: readonly string[],
  blockersById: ReadonlyMap<string, TheoryConceptBlocker>,
): boolean {
  return blockerIds.some((blockerId) => {
    const blocker = blockersById.get(blockerId);
    return !blocker || (blocker.status === "open" && blocker.severity === "blocking");
  });
}

function conceptCheckReady(
  check: TheoryConceptCheck | null,
  registry: TheoryConceptCorpusRegistry,
): boolean {
  if (!check) return false;
  const anchorsById = new Map(registry.conceptAnchors.map((anchor) => [anchor.anchorId, anchor]));
  const blockersById = new Map(registry.blockers.map((blocker) => [blocker.blockerId, blocker]));
  const anchors = check.conceptAnchorIds.map((anchorId) => anchorsById.get(anchorId));
  if (anchors.some((anchor) => !anchor)) return false;
  const linkedAnchors = anchors.filter((anchor): anchor is TheoryConceptAnchor => Boolean(anchor));
  const anchorsReady = linkedAnchors.every((anchor) => (
    statusVerifiedForS212(anchor.sourceStatus, registry)
    && statusVerifiedForS212(anchor.definitionStatus, registry)
    && !hasOpenBlockingBlocker(anchor.blockerIds, blockersById)
  ));

  return check.releaseConfidence.status === "high_allowed"
    && check.releaseConfidence.s212HighConfidenceAllowed
    && check.releaseConfidence.s212ReviewAllowed
    && statusVerifiedForS212(check.conceptStatus, registry)
    && statusVerifiedForS212(check.definitionStatus, registry)
    && statusVerifiedForS212(check.relationshipStatus, registry)
    && statusVerifiedForS212(check.sourceCoverageStatus, registry)
    && !hasOpenBlockingBlocker(check.blockerIds, blockersById)
    && anchorsReady;
}

function conceptStatusForSourceRef(
  check: TheoryConceptCheck | null,
  registry: TheoryConceptCorpusRegistry,
): RubricEvidenceSourceStatus {
  if (!check) return "needs_verification";
  if (
    check.conceptStatus === "blocked"
    || check.definitionStatus === "blocked"
    || check.relationshipStatus === "blocked"
    || check.sourceCoverageStatus === "blocked"
  ) {
    return "blocked";
  }
  if (
    check.conceptStatus === "unresolved_conflict"
    || check.definitionStatus === "unresolved_conflict"
    || check.relationshipStatus === "unresolved_conflict"
    || check.sourceCoverageStatus === "unresolved_conflict"
  ) {
    return "unresolved_conflict";
  }
  return conceptCheckReady(check, registry) ? "verified" : "needs_verification";
}

function dimensionsEvidenceReady(input: S212TheoryAnswerReviewInput, evidenceIds: ReadonlySet<string>): boolean {
  const signalByDimension = new Map(input.dimensionSignals.map((signal) => [signal.dimensionId, signal]));
  return DIMENSION_CATALOG.every((dimension) => {
    const signal = signalByDimension.get(dimension.id);
    return Boolean(signal?.evidenceRefIds.length && signal.evidenceRefIds.every((id) => evidenceIds.has(id)));
  });
}

function resolveReadiness(
  input: S212TheoryAnswerReviewInput,
  evidenceRefs: readonly RubricEvidenceReference[],
  config: S212TheoryAnswerReviewConfig,
): ReadinessResult {
  const referenceRegistry = loadReferencePackageRegistry(config);
  const theoryRegistry = loadTheoryRegistry(config);
  const referencePackage = findReferencePackage(input, referenceRegistry);
  const conceptCheck = findConceptCheck(input, theoryRegistry);
  const learnerStatus = resolveLearnerStatus(input, evidenceRefs);
  const evidenceIds = new Set(evidenceRefs.map((ref) => ref.id));
  const conceptStatus = conceptStatusForSourceRef(conceptCheck, theoryRegistry);
  const referenceReady = referencePackageReady(referencePackage);
  const conceptReady = conceptCheckReady(conceptCheck, theoryRegistry);
  const dimensionEvidenceReady = dimensionsEvidenceReady(input, evidenceIds);
  const withholdReasons: RubricEvidenceBlockingReason[] = [];

  if (learnerStatus === "missing") withholdReasons.push("learner_answer_missing");
  if (learnerStatus === "ocr_confirmation_needed") withholdReasons.push("ocr_unconfirmed");
  if (!conceptReady) {
    withholdReasons.push(
      conceptStatus === "unresolved_conflict" ? "unresolved_source_conflict" : "theory_concept_unverified",
    );
  }
  if (!referenceReady) withholdReasons.push("reference_package_unverified");
  if (learnerStatus === "learner_confirmed" && !dimensionEvidenceReady) {
    withholdReasons.push("learner_evidence_unlinked");
  }

  return {
    learnerStatus,
    learnerReady: learnerStatus === "learner_confirmed",
    conceptReady,
    conceptStatus,
    referencePackageReady: referenceReady,
    referencePackageStatus: referenceReady ? "verified" : "needs_verification",
    problemMaterialStatus: referenceReady ? "verified" : "needs_verification",
    dimensionEvidenceReady,
    withholdReasons: [...new Set(withholdReasons)],
    referencePackage,
    conceptCheck,
  };
}

function rangeForSignal(
  dimension: DimensionCatalogEntry,
  signal: S212TheoryDimensionSignal,
): [number, number] {
  if (signal.observedQuality === "strong") {
    return [Math.round(dimension.maxPoints * 0.76), Math.round(dimension.maxPoints * 0.92)];
  }
  if (signal.observedQuality === "partial") {
    return [Math.round(dimension.maxPoints * 0.4), Math.round(dimension.maxPoints * 0.68)];
  }
  return [0, Math.max(1, Math.round(dimension.maxPoints * 0.24))];
}

function severityForSignal(signal: S212TheoryDimensionSignal): DeductionCandidateContract["severity"] {
  if (signal.observedQuality === "missing") return "major";
  if (signal.observedQuality === "partial") return "moderate";
  return "minor";
}

function buildSourceRefs(readiness: ReadinessResult): RubricSourceReference[] {
  return [
    {
      id: SOURCE_REF_IDS.officialRules,
      kind: "official_rule_registry",
      sourceId: "s201-appraiser-second-theory-point-scale",
      verificationStatus: "verified",
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.questionMetadata,
      kind: "question_metadata_registry",
      sourceId: readiness.referencePackage?.questionId ?? "s203-theory-question-unresolved",
      verificationStatus: readiness.problemMaterialStatus,
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.referencePackage,
      kind: "reference_answer_package",
      sourceId: readiness.referencePackage?.id ?? "s207-theory-reference-package-unresolved",
      verificationStatus: readiness.referencePackageStatus,
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.rubric,
      kind: "rubric_blueprint",
      sourceId: "s212-theory-answer-review-dimension-catalog",
      verificationStatus: readiness.conceptReady ? "verified" : "needs_verification",
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
    {
      id: SOURCE_REF_IDS.theoryConcept,
      kind: "subject_validator",
      sourceId: readiness.conceptCheck?.checkId ?? "s209-theory-concept-check-unresolved",
      verificationStatus: readiness.conceptStatus,
      rightsStatus: "metadata_only",
      containsRawContent: false,
    },
  ];
}

function signalByDimension(input: S212TheoryAnswerReviewInput) {
  return new Map(input.dimensionSignals.map((signal) => [signal.dimensionId, signal]));
}

function buildReadyDimensionsAndDeductions(
  input: S212TheoryAnswerReviewInput,
): {
  dimensions: RubricDimensionContract[];
  deductions: DeductionCandidateContract[];
} {
  const signals = signalByDimension(input);
  const deductions: DeductionCandidateContract[] = [];
  const dimensions = DIMENSION_CATALOG.map((dimension) => {
    const signal = signals.get(dimension.id);
    if (!signal) {
      throw new Error(`S212 missing dimension signal for ${dimension.id}`);
    }
    const deductionCandidateIds: string[] = [];
    if (signal.observedQuality !== "strong") {
      const candidateId = `deduction-s212-${dimension.id}`;
      deductionCandidateIds.push(candidateId);
      deductions.push({
        id: candidateId,
        dimensionId: dimension.id,
        rootCauseId: dimension.rootCauseId,
        gapType: dimension.gapType,
        severity: severityForSignal(signal),
        evidenceRefIds: signal.evidenceRefIds,
        sourceRefIds: [SOURCE_REF_IDS.rubric, SOURCE_REF_IDS.theoryConcept, SOURCE_REF_IDS.referencePackage],
        confidence: confidence(signal.confidence ?? "medium", ["s212_dimension_signal_metadata"], []),
        learnerFacingSummary: `${dimension.gapType}_detected`,
        immediateFix: dimension.immediateFix,
        duplicateRootCauseGroupId: dimension.rootCauseId,
        status: "candidate",
        officialScoreDeduction: false,
      });
    }

    return {
      id: dimension.id,
      subjectScope: ["theory"],
      label: dimension.label,
      maxPoints: dimension.maxPoints,
      pointCeilingSourceRefId: SOURCE_REF_IDS.officialRules,
      sourceStatus: "verified",
      evidenceRefIds: signal.evidenceRefIds,
      deductionCandidateIds,
      estimatedPointsRange: rangeForSignal(dimension, signal),
      confidence: confidence(signal.confidence ?? "medium", ["s212_dimension_signal_metadata"], []),
      status: "evaluated",
    } satisfies RubricDimensionContract;
  });
  return { dimensions, deductions };
}

function buildWithheldDimensions(): RubricDimensionContract[] {
  return DIMENSION_CATALOG.map((dimension) => ({
    id: dimension.id,
    subjectScope: ["theory"],
    label: dimension.label,
    maxPoints: dimension.maxPoints,
    pointCeilingSourceRefId: SOURCE_REF_IDS.officialRules,
    sourceStatus: "needs_verification",
    evidenceRefIds: [],
    deductionCandidateIds: [],
    estimatedPointsRange: null,
    confidence: confidence("low", ["s212_review_withheld"], ["source_or_evidence_not_ready"]),
    status: "not_evaluated_insufficient_evidence",
  }));
}

function selectPrimaryGap(
  input: S212TheoryAnswerReviewInput,
  deductions: readonly DeductionCandidateContract[],
  evidenceRefs: readonly RubricEvidenceReference[],
): OneBiggestGapContract {
  const evidenceRefIds = evidenceRefs.map((ref) => ref.id);
  if (deductions.length === 0) {
    return {
      id: "gap-s212-maintain-compressed-theory-answer",
      gapType: "maintain_compressed_theory_answer",
      dimensionId: input.primaryGapDimensionId ?? "compression_relevance",
      deductionCandidateIds: [],
      evidenceRefIds,
      conceptNodeIds: [],
      severity: "minor",
      confidence: confidence("medium", ["s212_no_deduction_metadata"], []),
      learnerFacingSummary: "schedule_review_to_keep_theory_paragraph_retrievable",
    };
  }

  const severityOrder = { major: 3, moderate: 2, minor: 1 };
  const byPreferredDimension = input.primaryGapDimensionId
    ? deductions.find((candidate) => candidate.dimensionId === input.primaryGapDimensionId)
    : undefined;
  const primary = byPreferredDimension
    ?? [...deductions].sort((left, right) => severityOrder[right.severity] - severityOrder[left.severity])[0];
  const signal = input.dimensionSignals.find((entry) => entry.dimensionId === primary.dimensionId);

  return {
    id: `gap-s212-${primary.dimensionId}`,
    gapType: primary.gapType,
    dimensionId: primary.dimensionId,
    deductionCandidateIds: [primary.id],
    evidenceRefIds: primary.evidenceRefIds,
    conceptNodeIds: signal?.conceptNodeIds ?? [],
    severity: primary.severity,
    confidence: primary.confidence,
    learnerFacingSummary: primary.learnerFacingSummary,
  };
}

function buildWithheldGap(readiness: ReadinessResult, evidenceRefs: readonly RubricEvidenceReference[]): OneBiggestGapContract {
  const sourceBlocked = !readiness.conceptReady || !readiness.referencePackageReady;
  const gapType = readiness.learnerStatus === "ocr_confirmation_needed"
    ? "ocr_confirmation_needed"
    : readiness.learnerStatus === "missing"
      ? "learner_answer_evidence_missing"
      : sourceBlocked
        ? "concept_source_verification_blocked"
        : "theory_dimension_evidence_unlinked";

  return {
    id: `gap-s212-${gapType}`,
    gapType,
    dimensionId: null,
    deductionCandidateIds: [],
    evidenceRefIds: evidenceRefs.map((ref) => ref.id),
    conceptNodeIds: [],
    severity: sourceBlocked ? "major" : "moderate",
    confidence: confidence("low", ["s212_fail_closed_metadata"], readiness.withholdReasons),
    learnerFacingSummary: `${gapType}_before_theory_review`,
  };
}

function buildNextAction(
  reviewReady: boolean,
  readiness: ReadinessResult,
  gap: OneBiggestGapContract,
): OneNextActionContract {
  const actionType: OneNextActionContract["actionType"] = reviewReady
    ? (gap.deductionCandidateIds.length > 0 ? "rewrite" : "schedule_review")
    : readiness.learnerStatus === "ocr_confirmation_needed"
      ? "confirm_ocr"
      : (!readiness.conceptReady || !readiness.referencePackageReady)
        ? "withhold_until_verified"
        : "retry";

  return {
    id: `action-s212-${actionType}`,
    actionType,
    targetGapId: gap.id,
    targetEvidenceRefIds: gap.evidenceRefIds,
    defaultAction: true,
    learnerCanOverride: true,
    learnerFacingInstruction: `${actionType}_one_theory_paragraph_task`,
  };
}

function buildHook(
  reviewReady: boolean,
  nextAction: OneNextActionContract,
  gap: OneBiggestGapContract,
): RewriteOrRecalculationTaskHook {
  const kind: RewriteOrRecalculationTaskHook["kind"] = reviewReady
    ? (nextAction.actionType === "schedule_review" ? "scheduled_review" : "rewrite")
    : nextAction.actionType === "confirm_ocr"
      ? "ocr_confirmation"
      : "withheld";

  return {
    kind,
    targetGapId: gap.id,
    sourceEvidenceRefIds: gap.evidenceRefIds,
    retryReviewAllowed: true,
    calculator: null,
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
      confidence: confidence("low", ["s212_review_withheld"], ["score_range_withheld_until_evidence_and_sources_are_ready"]),
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
    confidence: confidence("medium", ["s212_dimension_ranges_metadata"], ["learning_support_estimate_only"]),
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
  if (!readiness.conceptReady || !readiness.referencePackageReady) return "withheld_unverified_source";
  if (!readiness.dimensionEvidenceReady) return "withheld_insufficient_evidence";
  return "ready";
}

function buildQualityGate(
  input: S212TheoryAnswerReviewInput,
  readiness: ReadinessResult,
): S212TheoryAnswerReviewQualityGate {
  const signals = signalByDimension(input);
  const dimensionEvidence = Object.fromEntries(
    DIMENSION_CATALOG.map((dimension) => {
      const signal = signals.get(dimension.id);
      const status: S212TheoryGateStatus = signal?.evidenceRefIds.length ? "passed" : "failed_closed";
      return [dimension.id, status];
    }),
  ) as Record<S212TheoryDimensionId, S212TheoryGateStatus>;

  return {
    engineVersion: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
    learnerAnswerEvidence: readiness.learnerReady ? "passed" : "failed_closed",
    conceptSourceVerification: readiness.conceptReady ? "passed" : "failed_closed",
    referencePackageVerification: readiness.referencePackageReady ? "passed" : "failed_closed",
    dimensionEvidence,
    authorityClaims: "none",
    metadataBoundary: "metadata_only",
    learnerInstructorSeparation: "learner_only_no_instructor_route",
    scoreLikeSummary: "secondary_non_official_range",
  };
}

function buildDerivedMetadata(
  contract: CommonRubricEvidenceReviewContract,
  qualityGate: S212TheoryAnswerReviewQualityGate,
): S212TheoryAnswerReviewDerivedMetadata {
  const metadata = sanitizeDerivedMetadata({
    ...buildRubricEvidenceReviewDerivedMetadata(contract),
    engineVersion: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
    theoryQualityDimensionIds: [...S212_THEORY_DIMENSION_IDS],
    conceptSourceVerification: qualityGate.conceptSourceVerification,
    referencePackageVerification: qualityGate.referencePackageVerification,
    learnerAnswerEvidence: qualityGate.learnerAnswerEvidence,
    learnerInstructorSeparation: "learner_only_no_instructor_route",
    scoreLikeSummarySecondary: true,
    terminalLearnerAction: contract.resultPresentation.terminalState,
    safeForS216ErrorNotebook: contract.reviewStatus === "ready",
    safeForS217ConceptGraph: contract.reviewStatus === "ready",
  }) as S212TheoryAnswerReviewDerivedMetadata;
  assertNoRawUserDataInDerived(metadata);
  return metadata;
}

export function buildS212TheoryAnswerReview(
  input: S212TheoryAnswerReviewInput,
  config: S212TheoryAnswerReviewConfig = {},
): S212TheoryAnswerReviewResult {
  assertS212InputSafe(input);
  const learnerAnswerEvidenceRefs = normalizeLearnerEvidenceRefs(input);
  const readiness = resolveReadiness(input, learnerAnswerEvidenceRefs, config);
  const reviewStatus = reviewStatusFor(readiness);
  const reviewReady = reviewStatus === "ready";
  const sourceVerificationRefs = buildSourceRefs(readiness);
  const readyRows = reviewReady
    ? buildReadyDimensionsAndDeductions(input)
    : { dimensions: buildWithheldDimensions(), deductions: [] };
  const primaryGap = reviewReady
    ? selectPrimaryGap(input, readyRows.deductions, learnerAnswerEvidenceRefs)
    : buildWithheldGap(readiness, learnerAnswerEvidenceRefs);
  const nextAction = buildNextAction(reviewReady, readiness, primaryGap);
  const rewriteOrRecalculationHook = buildHook(reviewReady, nextAction, primaryGap);
  const practiceScoreRange = buildPracticeScoreRange(reviewReady, learnerAnswerEvidenceRefs, readyRows.dimensions);
  const qualityGate = buildQualityGate(input, readiness);

  const contract: CommonRubricEvidenceReviewContract = {
    version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: "theory",
    subjectLabel: S212_THEORY_SUBJECT_LABEL,
    reviewStatus,
    withhold: {
      withheld: reviewStatus !== "ready",
      reasons: reviewStatus === "ready" ? [] : readiness.withholdReasons,
    },
    sourceStatus: {
      learnerAnswer: readiness.learnerStatus,
      problemMaterial: readiness.problemMaterialStatus,
      referencePackage: readiness.referencePackageStatus,
      rubric: readiness.conceptReady ? "verified" : "needs_verification",
      officialRules: "verified",
      calculation: "not_applicable",
    },
    learnerAnswerEvidenceRefs,
    sourceVerificationRefs,
    rubricDimensions: readyRows.dimensions,
    deductionCandidates: readyRows.deductions,
    confidence: confidence(reviewReady ? "medium" : "low", ["s212_theory_review_engine"], reviewReady ? [] : readiness.withholdReasons),
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

  const validation = validateRubricEvidenceReviewContract(contract);
  if (!validation.valid) {
    throw new Error(`invalid-s212-theory-review-contract: ${validation.errors.join("; ")}`);
  }
  assertNoRawUserDataInDerived(contract);
  assertNoAuthorityClaims(contract);

  return {
    version: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
    contract,
    derivedMetadata: buildDerivedMetadata(contract, qualityGate),
    qualityGate,
  };
}
