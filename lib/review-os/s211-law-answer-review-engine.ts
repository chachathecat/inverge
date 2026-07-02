import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  PRACTICE_SCORE_RANGE_CAVEAT,
  RUBRIC_EVIDENCE_CONTRACT_VERSION,
  assertValidRubricEvidenceReviewContract,
  buildRubricEvidenceReviewDerivedMetadata,
  type CommonRubricEvidenceReviewContract,
  type DeductionCandidateContract,
  type OneBiggestGapContract,
  type OneNextActionContract,
  type RubricDimensionContract,
  type RubricEvidenceBlockingReason,
  type RubricEvidenceConfidence,
  type RubricEvidenceConfidenceLevel,
  type RubricEvidenceReference,
  type RubricEvidenceSourceStatus,
  type RubricEvidenceSourceStatusSet,
  type RubricEvidenceValidationResult,
  type RubricScoreRange,
  type RubricSourceReference,
} from "./rubric-evidence-contract";
import type {
  SecondRoundLawCheckKind,
  SecondRoundLearningReferenceStatus,
  SecondRoundReferenceEvidenceStatus,
  SecondRoundReferenceReleaseStatus,
  SecondRoundReferenceVerificationStatus,
  SecondRoundValidationCheckStatus,
} from "./second-round-reference-answer-package-registry";
import type {
  EvidenceReviewLawSourceLink,
  LawExamDateVersionCheck,
  LegalSourceBlocker,
  ReferencePackageLawSourceLink,
  S205LawSourceStatus,
} from "./law-source-version-registry";

export const S211_LAW_ANSWER_REVIEW_ENGINE_VERSION = "s211.law_answer_review_engine.v1" as const;

export type S211LawReviewConsumer = "learner";
export type S211LawReviewActorRole = "learner";

export type S211LawDimensionId =
  | "law_issue_spotting"
  | "law_requirement_decomposition"
  | "law_rule_mapping"
  | "law_subsumption_application"
  | "law_conclusion_quality";

export type S211LawFindingQuality = "strong" | "partial" | "missing";
export type S211GateStatus = "ready" | "withheld";

export type S211LawQuestionMetadata = {
  questionId: string;
  subject: "law";
  subjectLabel: string;
  totalPoints: number;
  examDate: string;
  lawEffectiveDate: string;
  problemMaterialStatus: RubricEvidenceSourceStatus;
  canonicalVerificationStatus: "verified" | "synthetic_fixture" | "needs_verification" | "blocked";
  conceptNodeIds: string[];
};

export type S211LawReferencePackageMetadata = {
  id: string;
  mode: "synthetic_fixture" | "reference_package";
  questionId: string;
  subject: "law";
  officialSource: {
    officialAnswerUsed: false;
    officialGradingCriteriaUsed: false;
  };
  learningReference: {
    status: SecondRoundLearningReferenceStatus;
    officialClaimAllowed: false;
    scorePredictionAllowed: false;
    passProbabilityAllowed: false;
  };
  lawValidation: {
    examDate: string;
    lawEffectiveDate: string;
    lawVersionAnchorIds: string[];
    checks: Array<{
      checkId: string;
      kind: SecondRoundLawCheckKind;
      status: SecondRoundValidationCheckStatus;
      releaseBlocking: boolean;
      sourceAnchorIds: string[];
      evidenceAnchorIds: string[];
    }>;
  };
  verificationReport: {
    sourceStatus: SecondRoundReferenceVerificationStatus;
    evidenceStatus: SecondRoundReferenceEvidenceStatus;
    subjectValidationStatus: SecondRoundReferenceVerificationStatus;
    criticConsensusStatus: SecondRoundReferenceVerificationStatus;
    releaseGateStatus: SecondRoundReferenceVerificationStatus;
    independentCandidateCount: number;
    criticPassCount: number;
    unresolvedConflictCount: number;
  };
  releaseBlockers: Array<{
    blockerId: string;
    status: "open" | "resolved";
    severity: "blocking" | "warning";
  }>;
  release: {
    status: SecondRoundReferenceReleaseStatus;
    noOfficialAnswerGuardrail: true;
    learnerFacingOfficialClaimAllowed: false;
    releaseRequiresNoOpenBlockers: true;
  };
  downstreamUsage: {
    s211LawReviewInput: boolean;
    s215ReleaseGateInput: boolean;
  };
};

export type S211LawSourceGateMetadata = {
  examDateVersionCheckId: string;
  referencePackageLinkId: string;
  evidenceReviewLinkId: string;
  registry: {
    examDateVersionChecks: LawExamDateVersionCheck[];
    referencePackageLinks: ReferencePackageLawSourceLink[];
    evidenceReviewLinks: EvidenceReviewLawSourceLink[];
    blockers: LegalSourceBlocker[];
  };
};

export type S211LawReviewFinding = {
  dimensionId: S211LawDimensionId;
  quality: S211LawFindingQuality;
  evidenceRefIds: string[];
  sourceAnchorIds: string[];
  rootCauseId?: string;
  conceptNodeIds?: string[];
  confidence?: RubricEvidenceConfidence;
  learnerFacingSummary?: string;
  immediateFix?: string;
};

export type S211LawAnswerReviewInput = {
  reviewRequestId: string;
  consumer: S211LawReviewConsumer;
  actorRole: S211LawReviewActorRole;
  question: S211LawQuestionMetadata;
  learnerAnswerEvidenceRefs: RubricEvidenceReference[];
  referencePackage: S211LawReferencePackageMetadata | null;
  lawSourceGate: S211LawSourceGateMetadata;
  findings: S211LawReviewFinding[];
};

export type S211LawAnswerReviewDerivedMetadata = ReturnType<typeof buildRubricEvidenceReviewDerivedMetadata> & {
  engineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
  reviewRequestId: string;
  questionId: string;
  referencePackageId: string | null;
  lawSourceGateStatus: S211GateStatus;
  referencePackageGateStatus: S211GateStatus;
  learnerRouteOnly: true;
  instructorRouteSeparated: true;
  academyTenantDataAccessed: false;
  instructorRuntimeRouteChanged: false;
  metadataOnly: true;
  containsRawContent: false;
};

export type S211LawAnswerReviewResult = {
  engineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
  contract: CommonRubricEvidenceReviewContract;
  derivedMetadata: S211LawAnswerReviewDerivedMetadata;
  validation: RubricEvidenceValidationResult;
  lawEngine: {
    questionId: string;
    referencePackageId: string | null;
    lawSourceGateStatus: S211GateStatus;
    referencePackageGateStatus: S211GateStatus;
    evaluatedDimensionIds: S211LawDimensionId[];
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

type GateResult = {
  status: S211GateStatus;
  sourceStatus: RubricEvidenceSourceStatus;
  confidenceLevel: RubricEvidenceConfidenceLevel;
  reasons: RubricEvidenceBlockingReason[];
  uncertaintyReasons: string[];
  examDateVersionCheck: LawExamDateVersionCheck | null;
  referencePackageLink: ReferencePackageLawSourceLink | null;
  evidenceReviewLink: EvidenceReviewLawSourceLink | null;
};

type ReferencePackageGateResult = {
  status: S211GateStatus;
  sourceStatus: RubricEvidenceSourceStatus;
  reasons: RubricEvidenceBlockingReason[];
  uncertaintyReasons: string[];
};

const S211_LAW_DIMENSIONS: Array<{
  id: S211LawDimensionId;
  label: string;
  maxPoints: number;
  defaultSummary: string;
  defaultFix: string;
}> = [
  {
    id: "law_issue_spotting",
    label: "issue_spotting",
    maxPoints: 25,
    defaultSummary: "law_issue_spotting_gap",
    defaultFix: "rewrite_one_missing_issue_with_requirement_and_fact_link",
  },
  {
    id: "law_requirement_decomposition",
    label: "requirement_decomposition",
    maxPoints: 15,
    defaultSummary: "legal_requirement_decomposition_gap",
    defaultFix: "split_the_issue_into_required_legal_elements_before_application",
  },
  {
    id: "law_rule_mapping",
    label: "legal_rule_mapping",
    maxPoints: 25,
    defaultSummary: "legal_rule_mapping_gap",
    defaultFix: "map_each_requirement_to_a_verified_rule_anchor_before_conclusion",
  },
  {
    id: "law_subsumption_application",
    label: "subsumption_application_structure",
    maxPoints: 25,
    defaultSummary: "subsumption_application_gap",
    defaultFix: "connect_one_material_fact_to_each_rule_requirement",
  },
  {
    id: "law_conclusion_quality",
    label: "conclusion_quality",
    maxPoints: 10,
    defaultSummary: "conclusion_quality_gap",
    defaultFix: "rewrite_the_conclusion_as_a_direct_legal_result_tied_to_application",
  },
];

const REQUIRED_LAW_CHECK_KINDS: readonly SecondRoundLawCheckKind[] = [
  "effective_date",
  "rule_source",
  "article_citation",
  "issue_identification",
  "application",
  "case_or_administrative_anchor",
  "conclusion",
  "unsupported_legal_claim",
];

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawContent",
  "bodyText",
  "statuteText",
  "articleText",
  "caseText",
  "caseBody",
  "lawText",
  "sourceText",
  "sourceExcerpt",
  "rawSourceText",
  "officialQuestionText",
  "officialQuestionBody",
  "officialAnswerText",
  "officialAnswerBody",
  "referenceAnswerText",
  "modelAnswer",
  "learnerAnswer",
  "learnerAnswerText",
  "rawAnswerText",
  "answerText",
  "answerBody",
  "rawQuestionText",
  "questionText",
  "questionBody",
  "rawProblemText",
  "problemBody",
  "rawOcrText",
  "ocrText",
  "rawPayload",
  "providerPayload",
  "academyContent",
  "thirdPartyAcademyContent",
  "instructorComment",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "assetBytes",
]);

const FORBIDDEN_AUTHORITY_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|confirmed\s+score|pass\s+probability|pass\s+chance|pass\/fail|pass\s+prediction|pass\s+guarantee|guaranteed\s+score|official\s+model\s+answer|official\s+answer)/i;
const SAFE_LEARNER_ANSWER_STATUS_VALUES = new Set([
  "learner_confirmed",
  "ocr_confirmation_needed",
  "missing",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoForbiddenS211Boundary(value: unknown, trail = "metadata") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenS211Boundary(entry, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_AUTHORITY_CLAIM_PATTERN.test(value)) {
      throw new Error(`s211-prohibited-authority-claim: ${trail}`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "learnerAnswer" && typeof child === "string" && SAFE_LEARNER_ANSWER_STATUS_VALUES.has(child)) {
      continue;
    }
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key)) {
      throw new Error(`s211-raw-content-boundary: ${trail}.${key}`);
    }
    assertNoForbiddenS211Boundary(child, `${trail}.${key}`);
  }
}

function confidence(
  level: RubricEvidenceConfidenceLevel,
  reasons: string[],
  uncertaintyReasons: string[] = [],
): RubricEvidenceConfidence {
  return { level, reasons, uncertaintyReasons };
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function hasOpenBlockingBlocker(blockerIds: readonly string[], blockersById: ReadonlyMap<string, LegalSourceBlocker>) {
  return blockerIds.some((blockerId) => {
    const blocker = blockersById.get(blockerId);
    return blocker?.status === "open" && blocker.severity === "blocking";
  });
}

function mapS208StatusToS205(status: S205LawSourceStatus): RubricEvidenceSourceStatus {
  if (status === "verified") return "verified";
  if (status === "blocked") return "blocked";
  if (status === "unresolved_conflict") return "unresolved_conflict";
  return "needs_verification";
}

function withholdReasonForSourceStatus(status: RubricEvidenceSourceStatus): RubricEvidenceBlockingReason {
  if (status === "unresolved_conflict") return "unresolved_source_conflict";
  if (status === "blocked") return "rights_blocked";
  return "official_rule_unverified";
}

function learnerEvidenceStatus(refs: readonly RubricEvidenceReference[]): RubricEvidenceSourceStatusSet["learnerAnswer"] {
  if (refs.length === 0) return "missing";
  const needsConfirmation = refs.some((ref) => (
    ref.verifiedByLearner !== true || ref.ocrState === "draft_needs_learner_confirmation"
  ));
  return needsConfirmation ? "ocr_confirmation_needed" : "learner_confirmed";
}

function assertLearnerOnly(input: S211LawAnswerReviewInput) {
  if (input.consumer !== "learner" || input.actorRole !== "learner") {
    throw new Error("s211-learner-instructor-boundary: learner engine cannot run on instructor or academy surface");
  }
}

function assertLearnerEvidenceRequired(input: S211LawAnswerReviewInput) {
  if (input.learnerAnswerEvidenceRefs.length === 0) {
    throw new Error("s211-learner-answer-evidence-required: law review requires at least one learner-owned evidence reference");
  }
}

function resolveReferencePackageGate(input: S211LawAnswerReviewInput): ReferencePackageGateResult {
  const pkg = input.referencePackage;
  const uncertaintyReasons: string[] = [];
  const reasons: RubricEvidenceBlockingReason[] = [];

  if (!pkg) {
    return {
      status: "withheld",
      sourceStatus: "needs_verification",
      reasons: ["reference_package_unverified"],
      uncertaintyReasons: ["reference_package_missing"],
    };
  }

  if (pkg.questionId !== input.question.questionId) uncertaintyReasons.push("reference_package_question_mismatch");
  if (pkg.subject !== "law") uncertaintyReasons.push("reference_package_subject_not_law");
  if (!pkg.downstreamUsage.s211LawReviewInput) uncertaintyReasons.push("reference_package_not_enabled_for_s211");
  if (pkg.officialSource.officialAnswerUsed || pkg.officialSource.officialGradingCriteriaUsed) {
    uncertaintyReasons.push("official_answer_or_grading_criteria_used");
  }
  if (pkg.learningReference.officialClaimAllowed || pkg.learningReference.scorePredictionAllowed || pkg.learningReference.passProbabilityAllowed) {
    uncertaintyReasons.push("reference_package_authority_claim_not_disabled");
  }
  if (pkg.learningReference.status !== "released_learning_reference" || pkg.release.status !== "released") {
    uncertaintyReasons.push("reference_package_not_released");
  }
  if (pkg.release.learnerFacingOfficialClaimAllowed || !pkg.release.noOfficialAnswerGuardrail) {
    uncertaintyReasons.push("reference_package_official_claim_guardrail_failed");
  }
  if (pkg.lawValidation.examDate !== input.question.examDate || pkg.lawValidation.lawEffectiveDate !== input.question.lawEffectiveDate) {
    uncertaintyReasons.push("law_validation_date_mismatch");
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

  const checkKinds = new Set(pkg.lawValidation.checks.map((check) => check.kind));
  for (const kind of REQUIRED_LAW_CHECK_KINDS) {
    if (!checkKinds.has(kind)) uncertaintyReasons.push(`law_validation_check_missing_${kind}`);
  }
  for (const check of pkg.lawValidation.checks) {
    if (check.releaseBlocking && check.status !== "passed" && check.status !== "synthetic_fixture") {
      uncertaintyReasons.push(`law_validation_check_not_passed_${check.kind}`);
    }
  }

  if (uncertaintyReasons.length > 0) reasons.push("reference_package_unverified");
  return {
    status: uncertaintyReasons.length > 0 ? "withheld" : "ready",
    sourceStatus: uncertaintyReasons.length > 0 ? "needs_verification" : "verified",
    reasons,
    uncertaintyReasons,
  };
}

function resolveLawSourceGate(input: S211LawAnswerReviewInput): GateResult {
  const blockersById = new Map(input.lawSourceGate.registry.blockers.map((blocker) => [blocker.blockerId, blocker]));
  const examDateVersionCheck = input.lawSourceGate.registry.examDateVersionChecks.find(
    (check) => check.checkId === input.lawSourceGate.examDateVersionCheckId,
  ) ?? null;
  const referencePackageLink = input.lawSourceGate.registry.referencePackageLinks.find(
    (link) => link.linkId === input.lawSourceGate.referencePackageLinkId,
  ) ?? null;
  const evidenceReviewLink = input.lawSourceGate.registry.evidenceReviewLinks.find(
    (link) => link.linkId === input.lawSourceGate.evidenceReviewLinkId,
  ) ?? null;
  const uncertaintyReasons: string[] = [];
  const reasons: RubricEvidenceBlockingReason[] = [];

  if (!examDateVersionCheck) uncertaintyReasons.push("exam_date_version_check_missing");
  if (!referencePackageLink) uncertaintyReasons.push("reference_package_law_source_link_missing");
  if (!evidenceReviewLink) uncertaintyReasons.push("s205_law_source_link_missing");

  if (examDateVersionCheck) {
    if (examDateVersionCheck.questionId && examDateVersionCheck.questionId !== input.question.questionId) {
      uncertaintyReasons.push("exam_date_version_question_mismatch");
    }
    if (examDateVersionCheck.examDate !== input.question.examDate || examDateVersionCheck.lawEffectiveDate !== input.question.lawEffectiveDate) {
      uncertaintyReasons.push("exam_date_version_date_mismatch");
    }
    if (examDateVersionCheck.legalSourceStatus !== "verified" && examDateVersionCheck.legalSourceStatus !== "synthetic_fixture") {
      uncertaintyReasons.push(`legal_source_status_${examDateVersionCheck.legalSourceStatus}`);
    }
    if (
      examDateVersionCheck.examDateVersionStatus !== "applicable_to_exam_date"
      && examDateVersionCheck.examDateVersionStatus !== "synthetic_fixture"
    ) {
      uncertaintyReasons.push(`exam_date_version_status_${examDateVersionCheck.examDateVersionStatus}`);
    }
    if (!examDateVersionCheck.releaseConfidence.s211ReviewAllowed || !examDateVersionCheck.releaseConfidence.s211HighConfidenceAllowed) {
      uncertaintyReasons.push("s211_high_confidence_not_allowed");
    }
    if (!examDateVersionCheck.currentLawComparison.examDateLawClaimAllowed) {
      uncertaintyReasons.push("exam_date_law_claim_not_allowed");
    }
    if (hasOpenBlockingBlocker(examDateVersionCheck.blockerIds, blockersById)) {
      uncertaintyReasons.push("exam_date_version_open_legal_source_blocker");
    }
  }

  if (referencePackageLink) {
    if (input.referencePackage && referencePackageLink.referencePackageId !== input.referencePackage.id) {
      uncertaintyReasons.push("reference_package_link_id_mismatch");
    }
    if (referencePackageLink.questionId && referencePackageLink.questionId !== input.question.questionId) {
      uncertaintyReasons.push("reference_package_link_question_mismatch");
    }
    if (!referencePackageLink.releaseReady || referencePackageLink.releaseGateStatus !== "eligible_for_s215") {
      uncertaintyReasons.push("reference_package_law_source_not_release_ready");
    }
    if (referencePackageLink.legalSourceStatus !== "verified" && referencePackageLink.legalSourceStatus !== "synthetic_fixture") {
      uncertaintyReasons.push(`reference_package_law_source_status_${referencePackageLink.legalSourceStatus}`);
    }
    if (hasOpenBlockingBlocker(referencePackageLink.blockerIds, blockersById)) {
      uncertaintyReasons.push("reference_package_law_source_open_blocker");
    }
  }

  if (evidenceReviewLink) {
    const s205Status = mapS208StatusToS205(evidenceReviewLink.s205SourceStatus);
    if (s205Status !== "verified") uncertaintyReasons.push(`s205_law_source_status_${evidenceReviewLink.s205SourceStatus}`);
    if (evidenceReviewLink.reviewConfidence !== "high") uncertaintyReasons.push(`s205_law_source_confidence_${evidenceReviewLink.reviewConfidence}`);
    if (hasOpenBlockingBlocker(evidenceReviewLink.blockerIds, blockersById)) {
      uncertaintyReasons.push("s205_law_source_open_blocker");
    }
  }

  const sourceStatus = evidenceReviewLink
    ? mapS208StatusToS205(evidenceReviewLink.s205SourceStatus)
    : "needs_verification";
  if (uncertaintyReasons.length > 0) reasons.push(withholdReasonForSourceStatus(sourceStatus));

  return {
    status: uncertaintyReasons.length > 0 ? "withheld" : "ready",
    sourceStatus: uncertaintyReasons.length > 0 ? sourceStatus : "verified",
    confidenceLevel: uncertaintyReasons.length > 0 ? "low" : "high",
    reasons: unique(reasons),
    uncertaintyReasons,
    examDateVersionCheck,
    referencePackageLink,
    evidenceReviewLink,
  };
}

function sourceVerificationRefs(
  input: S211LawAnswerReviewInput,
  packageGate: ReferencePackageGateResult,
  lawGate: GateResult,
): RubricSourceReference[] {
  const lawSourceRefId = lawGate.evidenceReviewLink?.sourceVerificationRefId ?? "s211-law-source-unverified";
  return [
    {
      id: "s211-source-official-rules",
      kind: "official_rule_registry",
      sourceId: "s201-second-round-law-point-ceiling",
      verificationStatus: input.question.canonicalVerificationStatus === "blocked" ? "blocked" : input.question.problemMaterialStatus,
      rightsStatus: "metadata_only",
      lawEffectiveDate: input.question.lawEffectiveDate,
      containsRawContent: false,
    },
    {
      id: "s211-source-question",
      kind: "question_metadata_registry",
      sourceId: input.question.questionId,
      verificationStatus: input.question.problemMaterialStatus,
      rightsStatus: "metadata_only",
      lawEffectiveDate: input.question.lawEffectiveDate,
      containsRawContent: false,
    },
    {
      id: "s211-source-reference-package",
      kind: "reference_answer_package",
      sourceId: input.referencePackage?.id ?? "s211-reference-package-missing",
      verificationStatus: packageGate.sourceStatus,
      rightsStatus: "metadata_only",
      lawEffectiveDate: input.question.lawEffectiveDate,
      containsRawContent: false,
    },
    {
      id: "s211-source-law-version",
      kind: "subject_validator",
      sourceId: lawSourceRefId,
      verificationStatus: lawGate.sourceStatus,
      rightsStatus: "metadata_only",
      lawEffectiveDate: input.question.lawEffectiveDate,
      containsRawContent: false,
    },
    {
      id: "s211-source-rubric-blueprint",
      kind: "rubric_blueprint",
      sourceId: "s211-law-rubric-blueprint",
      verificationStatus: "verified",
      rightsStatus: "metadata_only",
      lawEffectiveDate: input.question.lawEffectiveDate,
      containsRawContent: false,
    },
  ];
}

function qualityRange(quality: S211LawFindingQuality, maxPoints: number): RubricScoreRange {
  if (quality === "strong") return [Math.max(0, maxPoints - Math.ceil(maxPoints * 0.15)), maxPoints];
  if (quality === "partial") return [Math.floor(maxPoints * 0.45), Math.ceil(maxPoints * 0.7)];
  return [0, Math.ceil(maxPoints * 0.25)];
}

function severityForQuality(quality: S211LawFindingQuality): DeductionCandidateContract["severity"] {
  if (quality === "missing") return "major";
  if (quality === "partial") return "moderate";
  return "minor";
}

function confidenceForFinding(finding: S211LawReviewFinding, lawGate: GateResult): RubricEvidenceConfidence {
  if (finding.confidence) return finding.confidence;
  return confidence(lawGate.confidenceLevel, ["s211_law_metadata_review"], lawGate.uncertaintyReasons);
}

function findingByDimension(input: S211LawAnswerReviewInput) {
  const findings = new Map<S211LawDimensionId, S211LawReviewFinding>();
  for (const finding of input.findings) {
    if (findings.has(finding.dimensionId)) throw new Error(`s211-duplicate-law-finding: ${finding.dimensionId}`);
    findings.set(finding.dimensionId, finding);
  }
  for (const dimension of S211_LAW_DIMENSIONS) {
    if (!findings.has(dimension.id)) throw new Error(`s211-missing-law-finding: ${dimension.id}`);
  }
  return findings;
}

function assertKnownFindingEvidence(input: S211LawAnswerReviewInput) {
  const evidenceIds = new Set(input.learnerAnswerEvidenceRefs.map((ref) => ref.id));
  for (const finding of input.findings) {
    if (finding.evidenceRefIds.length === 0) {
      throw new Error(`s211-learner-evidence-required-for-finding: ${finding.dimensionId}`);
    }
    for (const evidenceRefId of finding.evidenceRefIds) {
      if (!evidenceIds.has(evidenceRefId)) {
        throw new Error(`s211-unknown-learner-evidence-ref: ${finding.dimensionId}:${evidenceRefId}`);
      }
    }
  }
}

function buildEvaluatedDimensionsAndDeductions(input: S211LawAnswerReviewInput, lawGate: GateResult) {
  const findings = findingByDimension(input);
  assertKnownFindingEvidence(input);
  const dimensions: RubricDimensionContract[] = [];
  const deductions: DeductionCandidateContract[] = [];

  for (const dimension of S211_LAW_DIMENSIONS) {
    const finding = findings.get(dimension.id);
    if (!finding) throw new Error(`s211-missing-law-finding: ${dimension.id}`);
    const deductionId = `s211-deduction-${dimension.id}`;
    const hasDeduction = finding.quality !== "strong";
    const confidenceValue = confidenceForFinding(finding, lawGate);

    dimensions.push({
      id: dimension.id,
      subjectScope: ["law"],
      label: dimension.label,
      maxPoints: dimension.maxPoints,
      pointCeilingSourceRefId: "s211-source-official-rules",
      sourceStatus: "verified",
      evidenceRefIds: finding.evidenceRefIds,
      deductionCandidateIds: hasDeduction ? [deductionId] : [],
      estimatedPointsRange: qualityRange(finding.quality, dimension.maxPoints),
      confidence: confidenceValue,
      status: "evaluated",
    });

    if (hasDeduction) {
      deductions.push({
        id: deductionId,
        dimensionId: dimension.id,
        rootCauseId: finding.rootCauseId ?? `s211-root-${dimension.id}`,
        gapType: dimension.id,
        severity: severityForQuality(finding.quality),
        evidenceRefIds: finding.evidenceRefIds,
        sourceRefIds: ["s211-source-rubric-blueprint", "s211-source-law-version", "s211-source-reference-package"],
        confidence: confidenceValue,
        learnerFacingSummary: finding.learnerFacingSummary ?? dimension.defaultSummary,
        immediateFix: finding.immediateFix ?? dimension.defaultFix,
        duplicateRootCauseGroupId: finding.rootCauseId ?? `s211-root-${dimension.id}`,
        status: "candidate",
        officialScoreDeduction: false,
      });
    }
  }

  return { dimensions, deductions };
}

function buildUnevaluatedDimensions(sourceStatus: RubricEvidenceSourceStatus): RubricDimensionContract[] {
  return S211_LAW_DIMENSIONS.map((dimension) => ({
    id: dimension.id,
    subjectScope: ["law"],
    label: dimension.label,
    maxPoints: dimension.maxPoints,
    pointCeilingSourceRefId: "s211-source-official-rules",
    sourceStatus,
    evidenceRefIds: [],
    deductionCandidateIds: [],
    estimatedPointsRange: null,
    confidence: confidence("low", ["s211_law_review_withheld"], [`withheld_${sourceStatus}`]),
    status: "not_evaluated_insufficient_evidence",
  }));
}

function severityRank(severity: DeductionCandidateContract["severity"]) {
  if (severity === "major") return 3;
  if (severity === "moderate") return 2;
  return 1;
}

function selectPrimaryDeduction(deductions: readonly DeductionCandidateContract[]) {
  return [...deductions].sort((left, right) => {
    const severityDelta = severityRank(right.severity) - severityRank(left.severity);
    if (severityDelta !== 0) return severityDelta;
    const leftOrder = S211_LAW_DIMENSIONS.findIndex((dimension) => dimension.id === left.dimensionId);
    const rightOrder = S211_LAW_DIMENSIONS.findIndex((dimension) => dimension.id === right.dimensionId);
    return leftOrder - rightOrder;
  })[0] ?? null;
}

function firstEvidenceId(input: S211LawAnswerReviewInput) {
  const first = input.learnerAnswerEvidenceRefs[0]?.id;
  if (!first) throw new Error("s211-learner-answer-evidence-required");
  return first;
}

function buildPrimaryGap(
  input: S211LawAnswerReviewInput,
  deductions: readonly DeductionCandidateContract[],
  options: { withheld?: boolean; gapType?: string; summary?: string; dimensionId?: S211LawDimensionId | null } = {},
): OneBiggestGapContract {
  const primary = selectPrimaryDeduction(deductions);
  if (primary) {
    const finding = input.findings.find((entry) => entry.dimensionId === primary.dimensionId);
    return {
      id: "s211-primary-gap",
      gapType: primary.gapType,
      dimensionId: primary.dimensionId,
      deductionCandidateIds: [primary.id],
      evidenceRefIds: primary.evidenceRefIds,
      conceptNodeIds: finding?.conceptNodeIds ?? input.question.conceptNodeIds,
      severity: primary.severity,
      confidence: primary.confidence,
      learnerFacingSummary: primary.learnerFacingSummary,
    };
  }

  return {
    id: "s211-primary-gap",
    gapType: options.gapType ?? (options.withheld ? "law_review_withheld" : "law_rewrite_polish"),
    dimensionId: options.dimensionId ?? null,
    deductionCandidateIds: [],
    evidenceRefIds: [firstEvidenceId(input)],
    conceptNodeIds: input.question.conceptNodeIds,
    severity: options.withheld ? "major" : "minor",
    confidence: confidence(options.withheld ? "low" : "medium", ["s211_law_primary_gap"], []),
    learnerFacingSummary: options.summary ?? "rewrite_one_law_answer_unit_before_review_completion",
  };
}

function buildNextAction(primaryGap: OneBiggestGapContract, actionType: OneNextActionContract["actionType"], instruction: string): OneNextActionContract {
  return {
    id: "s211-next-action",
    actionType,
    targetGapId: primaryGap.id,
    targetEvidenceRefIds: primaryGap.evidenceRefIds,
    defaultAction: true,
    learnerCanOverride: true,
    learnerFacingInstruction: instruction,
  };
}

function sumRange(dimensions: readonly RubricDimensionContract[]): RubricScoreRange {
  const range = dimensions.reduce(
    (acc, dimension) => {
      const dimensionRange = dimension.estimatedPointsRange;
      if (!dimensionRange) return acc;
      return [acc[0] + dimensionRange[0], acc[1] + dimensionRange[1]] as RubricScoreRange;
    },
    [0, 0] as RubricScoreRange,
  );
  if (range[0] === range[1]) return [Math.max(0, range[0] - 1), range[1]];
  return range;
}

function sourceStatusSet(
  learnerAnswer: RubricEvidenceSourceStatusSet["learnerAnswer"],
  packageGate: ReferencePackageGateResult,
  lawGate: GateResult,
  problemMaterial: RubricEvidenceSourceStatus,
): RubricEvidenceSourceStatusSet {
  return {
    learnerAnswer,
    problemMaterial,
    referencePackage: packageGate.sourceStatus,
    rubric: "verified",
    officialRules: lawGate.sourceStatus,
    calculation: "not_applicable",
  };
}

function buildContract(input: S211LawAnswerReviewInput, packageGate: ReferencePackageGateResult, lawGate: GateResult): CommonRubricEvidenceReviewContract {
  const learnerAnswer = learnerEvidenceStatus(input.learnerAnswerEvidenceRefs);
  const sourceRefs = sourceVerificationRefs(input, packageGate, lawGate);
  const sourceStatus = sourceStatusSet(learnerAnswer, packageGate, lawGate, input.question.problemMaterialStatus);
  const problemWithholdReasons: RubricEvidenceBlockingReason[] = input.question.problemMaterialStatus === "verified"
    ? []
    : [withholdReasonForSourceStatus(input.question.problemMaterialStatus)];
  const sourceWithholdReasons = unique([...packageGate.reasons, ...lawGate.reasons, ...problemWithholdReasons]);

  if (learnerAnswer === "ocr_confirmation_needed") {
    const dimensions = buildUnevaluatedDimensions("needs_verification");
    const primaryGap = buildPrimaryGap(input, [], {
      withheld: true,
      gapType: "ocr_confirmation_needed",
      summary: "confirm_learner_ocr_before_law_review",
    });
    return {
      version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
      dataClass: "derived_learning_metadata",
      examMode: "second",
      subject: "law",
      subjectLabel: input.question.subjectLabel,
      reviewStatus: "withheld_unconfirmed_ocr",
      withhold: { withheld: true, reasons: ["ocr_unconfirmed"] },
      sourceStatus,
      learnerAnswerEvidenceRefs: input.learnerAnswerEvidenceRefs,
      sourceVerificationRefs: sourceRefs,
      rubricDimensions: dimensions,
      deductionCandidates: [],
      confidence: confidence("low", ["s211_ocr_confirmation_required"], []),
      primaryGap,
      nextAction: buildNextAction(primaryGap, "confirm_ocr", "confirm_ocr_segments_before_law_review"),
      rewriteOrRecalculationHook: {
        kind: "ocr_confirmation",
        targetGapId: primaryGap.id,
        sourceEvidenceRefIds: primaryGap.evidenceRefIds,
        retryReviewAllowed: true,
        calculator: null,
      },
      practiceScoreRange: {
        status: "withheld_insufficient_evidence",
        range: null,
        scoreScale: {
          min: 0,
          max: 100,
          sourceRefId: "s211-source-official-rules",
          verificationStatus: "verified",
          officialPassThresholdUsed: false,
        },
        confidence: confidence("low", ["s211_ocr_confirmation_required"], []),
        evidenceRefIds: [],
        rubricDimensionIds: [],
        secondaryToGapAndAction: true,
        nonOfficial: true,
        confirmedScore: false,
        passProbability: false,
        passGuarantee: false,
        notFinalEndpoint: true,
        caveat: PRACTICE_SCORE_RANGE_CAVEAT,
      },
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

  if (sourceWithholdReasons.length > 0 || packageGate.status !== "ready" || lawGate.status !== "ready") {
    const withheldDimensionStatus = lawGate.status === "ready" ? input.question.problemMaterialStatus : lawGate.sourceStatus;
    const dimensions = buildUnevaluatedDimensions(withheldDimensionStatus);
    const primaryGap = buildPrimaryGap(input, [], {
      withheld: true,
      gapType: "legal_source_verification_required",
      summary: "withhold_law_review_until_exam_date_legal_sources_are_verified",
    });
    return {
      version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
      dataClass: "derived_learning_metadata",
      examMode: "second",
      subject: "law",
      subjectLabel: input.question.subjectLabel,
      reviewStatus: "withheld_unverified_source",
      withhold: { withheld: true, reasons: unique(sourceWithholdReasons) },
      sourceStatus,
      learnerAnswerEvidenceRefs: input.learnerAnswerEvidenceRefs,
      sourceVerificationRefs: sourceRefs,
      rubricDimensions: dimensions,
      deductionCandidates: [],
      confidence: confidence("low", ["s211_legal_source_fail_closed"], [...packageGate.uncertaintyReasons, ...lawGate.uncertaintyReasons]),
      primaryGap,
      nextAction: buildNextAction(primaryGap, "withhold_until_verified", "verify_exam_date_law_sources_before_score_range"),
      rewriteOrRecalculationHook: {
        kind: "withheld",
        targetGapId: primaryGap.id,
        sourceEvidenceRefIds: primaryGap.evidenceRefIds,
        retryReviewAllowed: true,
        calculator: null,
      },
      practiceScoreRange: {
        status: "withheld_insufficient_evidence",
        range: null,
        scoreScale: {
          min: 0,
          max: 100,
          sourceRefId: "s211-source-official-rules",
          verificationStatus: "verified",
          officialPassThresholdUsed: false,
        },
        confidence: confidence("low", ["s211_legal_source_fail_closed"], [...packageGate.uncertaintyReasons, ...lawGate.uncertaintyReasons]),
        evidenceRefIds: [],
        rubricDimensionIds: [],
        secondaryToGapAndAction: true,
        nonOfficial: true,
        confirmedScore: false,
        passProbability: false,
        passGuarantee: false,
        notFinalEndpoint: true,
        caveat: PRACTICE_SCORE_RANGE_CAVEAT,
      },
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

  const { dimensions, deductions } = buildEvaluatedDimensionsAndDeductions(input, lawGate);
  const primaryGap = buildPrimaryGap(input, deductions, { dimensionId: "law_conclusion_quality" });
  const scoreRange = sumRange(dimensions);
  const evidenceRefIds = unique(dimensions.flatMap((dimension) => dimension.evidenceRefIds));

  return {
    version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: "law",
    subjectLabel: input.question.subjectLabel,
    reviewStatus: "ready",
    withhold: { withheld: false, reasons: [] },
    sourceStatus,
    learnerAnswerEvidenceRefs: input.learnerAnswerEvidenceRefs,
    sourceVerificationRefs: sourceRefs,
    rubricDimensions: dimensions,
    deductionCandidates: deductions,
    confidence: confidence("high", ["s211_law_source_verified", "s207_reference_package_released", "s205_learner_evidence_linked"], []),
    primaryGap,
    nextAction: buildNextAction(primaryGap, "rewrite", "rewrite_the_single_largest_law_answer_gap_then_retry_review"),
    rewriteOrRecalculationHook: {
      kind: "rewrite",
      targetGapId: primaryGap.id,
      sourceEvidenceRefIds: primaryGap.evidenceRefIds,
      retryReviewAllowed: true,
      calculator: null,
    },
    practiceScoreRange: {
      status: "estimated",
      range: scoreRange,
      scoreScale: {
        min: 0,
        max: 100,
        sourceRefId: "s211-source-official-rules",
        verificationStatus: "verified",
        officialPassThresholdUsed: false,
      },
      confidence: confidence("high", ["s211_law_review_estimate"], []),
      evidenceRefIds,
      rubricDimensionIds: dimensions.map((dimension) => dimension.id),
      secondaryToGapAndAction: true,
      nonOfficial: true,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
      notFinalEndpoint: true,
      caveat: PRACTICE_SCORE_RANGE_CAVEAT,
    },
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

function assertReviewStatusMatchesGates(contract: CommonRubricEvidenceReviewContract, packageGate: ReferencePackageGateResult, lawGate: GateResult) {
  if ((packageGate.status !== "ready" || lawGate.status !== "ready") && contract.reviewStatus === "ready") {
    throw new Error("s211-legal-source-fail-closed: ready review emitted before source gates passed");
  }
  if (contract.reviewStatus === "ready" && contract.practiceScoreRange.status !== "estimated") {
    throw new Error("s211-ready-review-requires-secondary-score-range-estimate");
  }
}

function buildDerivedMetadata(
  input: S211LawAnswerReviewInput,
  contract: CommonRubricEvidenceReviewContract,
  packageGate: ReferencePackageGateResult,
  lawGate: GateResult,
): S211LawAnswerReviewDerivedMetadata {
  const base = buildRubricEvidenceReviewDerivedMetadata(contract);
  const metadata = sanitizeDerivedMetadata({
    ...base,
    engineVersion: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
    reviewRequestId: input.reviewRequestId,
    questionId: input.question.questionId,
    referencePackageId: input.referencePackage?.id ?? null,
    lawSourceGateStatus: lawGate.status,
    referencePackageGateStatus: packageGate.status,
    learnerRouteOnly: true,
    instructorRouteSeparated: true,
    academyTenantDataAccessed: false,
    instructorRuntimeRouteChanged: false,
    metadataOnly: true,
    containsRawContent: false,
  }) as S211LawAnswerReviewDerivedMetadata;
  assertNoRawUserDataInDerived(metadata);
  assertNoForbiddenS211Boundary(metadata);
  return metadata;
}

export function buildS211LawAnswerReview(input: S211LawAnswerReviewInput): S211LawAnswerReviewResult {
  assertNoForbiddenS211Boundary(input, "s211Input");
  assertLearnerOnly(input);
  assertLearnerEvidenceRequired(input);
  if (input.question.subject !== "law") throw new Error("s211-law-subject-required");

  const packageGate = resolveReferencePackageGate(input);
  const lawGate = resolveLawSourceGate(input);
  const contract = buildContract(input, packageGate, lawGate);
  assertReviewStatusMatchesGates(contract, packageGate, lawGate);
  assertNoForbiddenS211Boundary(contract, "s211Contract");
  assertValidRubricEvidenceReviewContract(contract);
  const validation: RubricEvidenceValidationResult = { valid: true, errors: [], warnings: [] };
  const derivedMetadata = buildDerivedMetadata(input, contract, packageGate, lawGate);
  const result: S211LawAnswerReviewResult = {
    engineVersion: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
    contract,
    derivedMetadata,
    validation,
    lawEngine: {
      questionId: input.question.questionId,
      referencePackageId: input.referencePackage?.id ?? null,
      lawSourceGateStatus: lawGate.status,
      referencePackageGateStatus: packageGate.status,
      evaluatedDimensionIds: contract.rubricDimensions
        .filter((dimension) => dimension.status === "evaluated")
        .map((dimension) => dimension.id as S211LawDimensionId),
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
  assertNoForbiddenS211Boundary(result, "s211Result");
  assertNoRawUserDataInDerived(result.derivedMetadata);
  return result;
}
