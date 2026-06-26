import { readFileSync } from "node:fs";
import path from "node:path";

import {
  loadSecondRoundCanonicalQuestionRegistry,
  type SecondRoundCanonicalQuestionRecord,
  type SecondRoundProblemTextStatus,
  type SecondRoundCanonicalVerificationStatus,
} from "./second-round-question-registry";
import {
  type SecondRoundDisplayMode,
  type SecondRoundExtractionStatus,
  type SecondRoundRightsStatus,
  type SecondRoundSubject,
} from "./second-round-source-rights-registry";

export type SecondRoundReferenceAnswerPackageRegistryScope = "appraiser_second_round_only";
export type SecondRoundReferenceAnswerPackageMode = "synthetic_fixture" | "reference_package";
export type SecondRoundReferenceOfficialSourceStatus =
  | "synthetic_fixture"
  | "metadata_only"
  | "problem_text_pending"
  | "canonical_question_verified"
  | "blocked_by_rights"
  | "blocked_by_source_verification";
export type SecondRoundLearningReferenceStatus =
  | "not_generated"
  | "candidate_draft"
  | "multi_candidate_cross_checked"
  | "critic_reviewed"
  | "consensus_resolved"
  | "released_learning_reference"
  | "blocked";
export type SecondRoundReferenceEvidenceStatus =
  | "not_started"
  | "anchors_pending"
  | "anchored"
  | "subject_validated"
  | "synthetic_fixture"
  | "blocked";
export type SecondRoundReferenceVerificationStatus =
  | "not_started"
  | "structure_validated"
  | "source_verified"
  | "subject_validated"
  | "critic_consensus_passed"
  | "released"
  | "blocked";
export type SecondRoundReferenceReleaseStatus =
  | "draft"
  | "blocked"
  | "cross_checked"
  | "source_verified"
  | "subject_validated"
  | "ready_for_s215"
  | "released";
export type SecondRoundReferenceContentStatus =
  | "not_generated"
  | "metadata_only"
  | "candidate_pending_s214"
  | "synthetic_fixture"
  | "blocked";
export type SecondRoundReferenceSectionKind =
  | "requirement_map"
  | "issue_map"
  | "scoring_blueprint"
  | "ten_minute_skeleton"
  | "exam_time_reference"
  | "expanded_study_reference"
  | "alternative_acceptable_points"
  | "common_failure_modes";
export type SecondRoundSourceAnchorKind =
  | "official_question_metadata"
  | "official_source_identity"
  | "official_syllabus_rule"
  | "law_source_version"
  | "theory_concept_source"
  | "practice_calculation_rule"
  | "critic_report"
  | "consensus_record";
export type SecondRoundAnchorLocatorKind =
  | "question_id"
  | "source_id"
  | "subject_id"
  | "law_version_id"
  | "concept_node_id"
  | "calculation_rule_id"
  | "metadata_id";
export type SecondRoundEvidenceAnchorKind =
  | "requirement_coverage"
  | "issue_coverage"
  | "rubric_alignment"
  | "candidate_comparison"
  | "critic_finding"
  | "consensus_decision"
  | "calculation_trace"
  | "law_version_check"
  | "theory_concept_check";
export type SecondRoundUncertaintyKind =
  | "source_uncertainty"
  | "rights_uncertainty"
  | "problem_text_uncertainty"
  | "calculation_uncertainty"
  | "legal_version_uncertainty"
  | "theory_term_uncertainty"
  | "consensus_conflict"
  | "subject_validator_gap";
export type SecondRoundUncertaintySeverity = "low" | "medium" | "high" | "blocking";
export type SecondRoundUncertaintyResolutionStatus = "open" | "resolved" | "accepted_as_alternative" | "blocked";
export type SecondRoundAlternativeReasoningStatus = "candidate" | "accepted" | "rejected" | "needs_validator";
export type SecondRoundAlternativeReleaseImplication =
  | "non_blocking_alternative"
  | "requires_consensus"
  | "blocks_release";
export type SecondRoundReleaseBlockerKind =
  | "rights"
  | "problem_text"
  | "source_anchor"
  | "legal_source"
  | "calculation"
  | "theory_validation"
  | "subject_validation"
  | "unresolved_consensus"
  | "prohibited_claim"
  | "data_boundary"
  | "unsupported_subject";
export type SecondRoundReleaseBlockerStatus = "open" | "resolved";
export type SecondRoundValidationCheckStatus = "pending" | "passed" | "failed" | "not_applicable" | "synthetic_fixture";
export type SecondRoundPracticeCheckKind =
  | "assumptions"
  | "formula"
  | "extracted_values"
  | "independent_recalculation"
  | "unit_check"
  | "rounding_check"
  | "hand_keyed_sequence"
  | "expected_display"
  | "answer_sheet_transfer"
  | "unsupported_type";
export type SecondRoundTheoryCheckKind =
  | "definition"
  | "logic_chain"
  | "comparison"
  | "application"
  | "term_consistency"
  | "alternative_view"
  | "source_coverage"
  | "unsupported_claim";
export type SecondRoundLawCheckKind =
  | "effective_date"
  | "rule_source"
  | "article_citation"
  | "issue_identification"
  | "application"
  | "case_or_administrative_anchor"
  | "conclusion"
  | "unsupported_legal_claim";

export type SecondRoundReferencePackageStoragePolicy = {
  metadataOnly: true;
  rawOfficialFileStored: false;
  rawOfficialQuestionTextStored: false;
  rawOfficialAnswerTextStored: false;
  rawReferenceAnswerTextStored: false;
  rawLearnerAnswerStored: false;
  rawOcrTextStored: false;
  rawSourceExcerptStored: false;
  rawAssetBytesStored: false;
  thirdPartyAcademyContentStored: false;
};

export type SecondRoundReferencePackageBoundaryPolicy = {
  syntheticFixturesOnly: boolean;
  officialQuestionBodiesStored: false;
  officialAnswerBodiesStored: false;
  learnerAnswerBodiesStored: false;
  referenceAnswerBodiesStored: false;
  referenceAnswersGenerated: false;
  gradingEngineImplemented: false;
  billingOrLedgerImplemented: false;
  publicArchiveUiImplemented: false;
  instructorRuntimeRoutesChanged: false;
};

export type SecondRoundOfficialSourceStatus = {
  sourceStatus: SecondRoundReferenceOfficialSourceStatus;
  questionId: string;
  sourceId: string;
  rightsStatus: SecondRoundRightsStatus;
  displayMode: SecondRoundDisplayMode;
  extractionStatus: SecondRoundExtractionStatus;
  problemTextStatus: SecondRoundProblemTextStatus;
  canonicalVerificationStatus: SecondRoundCanonicalVerificationStatus;
  officialAnswerAvailability: "not_available_for_second_round";
  officialAnswerUsed: false;
  officialGradingCriteriaUsed: false;
};

export type SecondRoundLearningReferenceIdentity = {
  status: SecondRoundLearningReferenceStatus;
  learnerFacingLabelKey: "verified_learning_reference";
  requiredCaveatKey: "learning_reference_not_official_answer";
  officialClaimAllowed: false;
  scorePredictionAllowed: false;
  passProbabilityAllowed: false;
};

export type SecondRoundReferencePackageSection = {
  sectionId: string;
  kind: SecondRoundReferenceSectionKind;
  contentStatus: SecondRoundReferenceContentStatus;
  contentStored: false;
  generatedTextStored: false;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  verificationStatus: SecondRoundReferenceVerificationStatus;
};

export type SecondRoundSourceAnchor = {
  anchorId: string;
  kind: SecondRoundSourceAnchorKind;
  sourceId?: string;
  questionId?: string;
  locator: {
    kind: SecondRoundAnchorLocatorKind;
    ref: string;
    page?: number;
    section?: string;
    rawTextStored: false;
    excerptStored: false;
  };
  verificationStatus: SecondRoundReferenceVerificationStatus;
};

export type SecondRoundEvidenceAnchor = {
  evidenceId: string;
  kind: SecondRoundEvidenceAnchorKind;
  status: SecondRoundReferenceEvidenceStatus;
  sourceAnchorIds: string[];
  supportsRelease: boolean;
  rawEvidenceStored: false;
};

export type SecondRoundUncertainty = {
  uncertaintyId: string;
  kind: SecondRoundUncertaintyKind;
  severity: SecondRoundUncertaintySeverity;
  summary: string;
  resolutionStatus: SecondRoundUncertaintyResolutionStatus;
  releaseBlocking: boolean;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
};

export type SecondRoundAlternativeReasoningPath = {
  pathId: string;
  status: SecondRoundAlternativeReasoningStatus;
  summary: string;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  uncertaintyIds: string[];
  releaseImplication: SecondRoundAlternativeReleaseImplication;
};

export type SecondRoundReleaseBlocker = {
  blockerId: string;
  kind: SecondRoundReleaseBlockerKind;
  status: SecondRoundReleaseBlockerStatus;
  severity: "blocking" | "warning";
  summary: string;
  requiredResolver: "s208" | "s209" | "s210" | "s214" | "s215" | "human_decision" | "s207_validator";
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
};

export type SecondRoundPracticeValidationCheck = {
  checkId: string;
  kind: SecondRoundPracticeCheckKind;
  status: SecondRoundValidationCheckStatus;
  releaseBlocking: boolean;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
};

export type SecondRoundPracticeValidation = {
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineRequired: true;
  storedProgramDependencyAllowed: false;
  formulaStored: false;
  extractedValuesStored: false;
  handKeyedSequenceStored: false;
  expectedDisplayStored: false;
  checks: SecondRoundPracticeValidationCheck[];
};

export type SecondRoundTheoryValidationCheck = {
  checkId: string;
  kind: SecondRoundTheoryCheckKind;
  status: SecondRoundValidationCheckStatus;
  releaseBlocking: boolean;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
};

export type SecondRoundTheoryValidation = {
  checks: SecondRoundTheoryValidationCheck[];
};

export type SecondRoundLawValidationCheck = {
  checkId: string;
  kind: SecondRoundLawCheckKind;
  status: SecondRoundValidationCheckStatus;
  releaseBlocking: boolean;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
};

export type SecondRoundLawValidation = {
  examDate: string;
  lawEffectiveDate: string;
  lawVersionAnchorIds: string[];
  checks: SecondRoundLawValidationCheck[];
};

export type SecondRoundReferenceVerificationReport = {
  sourceStatus: SecondRoundReferenceVerificationStatus;
  evidenceStatus: SecondRoundReferenceEvidenceStatus;
  subjectValidationStatus: SecondRoundReferenceVerificationStatus;
  criticConsensusStatus: SecondRoundReferenceVerificationStatus;
  releaseGateStatus: SecondRoundReferenceVerificationStatus;
  independentCandidateCount: number;
  criticPassCount: number;
  unresolvedConflictCount: number;
};

export type SecondRoundReferenceReleaseDecision = {
  status: SecondRoundReferenceReleaseStatus;
  releasedAt?: string;
  requiredCaveatKey: "learning_reference_not_official_answer";
  noOfficialAnswerGuardrail: true;
  learnerFacingOfficialClaimAllowed: false;
  releaseRequiresNoOpenBlockers: true;
};

export type SecondRoundReferenceAnswerPackage = {
  id: string;
  mode: SecondRoundReferenceAnswerPackageMode;
  questionId: string;
  subject: SecondRoundSubject;
  officialSource: SecondRoundOfficialSourceStatus;
  learningReference: SecondRoundLearningReferenceIdentity;
  sections: SecondRoundReferencePackageSection[];
  sourceAnchors: SecondRoundSourceAnchor[];
  evidenceAnchors: SecondRoundEvidenceAnchor[];
  uncertainty: SecondRoundUncertainty[];
  alternativeReasoningPaths: SecondRoundAlternativeReasoningPath[];
  practiceValidation?: SecondRoundPracticeValidation;
  theoryValidation?: SecondRoundTheoryValidation;
  lawValidation?: SecondRoundLawValidation;
  verificationReport: SecondRoundReferenceVerificationReport;
  releaseBlockers: SecondRoundReleaseBlocker[];
  release: SecondRoundReferenceReleaseDecision;
  downstreamUsage: {
    s214GenerationInput: boolean;
    s215ReleaseGateInput: boolean;
    s211LawReviewInput: boolean;
    s212TheoryReviewInput: boolean;
    s213PracticeReviewInput: boolean;
  };
};

export type SecondRoundReferenceAnswerPackageRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_reference_answer_package_registry";
  registryScope: SecondRoundReferenceAnswerPackageRegistryScope;
  generatedBy: string;
  generatedAt: string;
  canonicalQuestionRegistryPath: string;
  storagePolicy: SecondRoundReferencePackageStoragePolicy;
  boundaryPolicy: SecondRoundReferencePackageBoundaryPolicy;
  packages: SecondRoundReferenceAnswerPackage[];
};

export type SecondRoundReferenceAnswerPackageReport = {
  schemaVersion: string;
  reportType: "appraiser_second_round_reference_answer_package_report";
  generatedBy: string;
  generatedAt: string;
  referencePackageRegistryPath: string;
  canonicalQuestionRegistryPath: string;
  storagePolicy: SecondRoundReferencePackageStoragePolicy;
  totals: {
    packageCount: number;
    syntheticFixturePackageCount: number;
    releasedPackageCount: number;
    blockedPackageCount: number;
    releasablePackageCount: number;
    openBlockingReleaseBlockerCount: number;
    unresolvedBlockingUncertaintyCount: number;
    sourceAnchorCount: number;
    evidenceAnchorCount: number;
    subjectPackageCounts: Record<SecondRoundSubject, number>;
    releaseStatusCounts: Record<SecondRoundReferenceReleaseStatus, number>;
    learningReferenceStatusCounts: Record<SecondRoundLearningReferenceStatus, number>;
  };
  packageIds: string[];
  metadataOnly: true;
  safeUse: "s207_reference_answer_package_contract_only";
};

export type SecondRoundReferenceAnswerPackageRegistryConfig = {
  registryPath?: string;
  reportPath?: string;
  canonicalQuestionRegistryPath?: string;
  sourceRegistryPath?: string;
  rightsRegistryPath?: string;
  officialSourceRegistryPath?: string;
  officialSyllabusPath?: string;
  examRulesPath?: string;
  annualNoticePaths?: string[];
  asOfDate?: string;
};

const DEFAULT_REGISTRY_PATH = "reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_packages.json";
const DEFAULT_REPORT_PATH = "reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_package_report.json";
const DEFAULT_CANONICAL_QUESTION_REGISTRY_PATH = "reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json";
const REPORT_GENERATED_AT = "2026-06-26T00:00:00.000Z";

const SUBJECTS = ["practice", "theory", "law"] as const;
const PACKAGE_MODES = ["synthetic_fixture", "reference_package"] as const;
const OFFICIAL_SOURCE_STATUSES = [
  "synthetic_fixture",
  "metadata_only",
  "problem_text_pending",
  "canonical_question_verified",
  "blocked_by_rights",
  "blocked_by_source_verification",
] as const;
const LEARNING_REFERENCE_STATUSES = [
  "not_generated",
  "candidate_draft",
  "multi_candidate_cross_checked",
  "critic_reviewed",
  "consensus_resolved",
  "released_learning_reference",
  "blocked",
] as const;
const EVIDENCE_STATUSES = ["not_started", "anchors_pending", "anchored", "subject_validated", "synthetic_fixture", "blocked"] as const;
const VERIFICATION_STATUSES = [
  "not_started",
  "structure_validated",
  "source_verified",
  "subject_validated",
  "critic_consensus_passed",
  "released",
  "blocked",
] as const;
const RELEASE_STATUSES = ["draft", "blocked", "cross_checked", "source_verified", "subject_validated", "ready_for_s215", "released"] as const;
const CONTENT_STATUSES = ["not_generated", "metadata_only", "candidate_pending_s214", "synthetic_fixture", "blocked"] as const;
const SECTION_KINDS = [
  "requirement_map",
  "issue_map",
  "scoring_blueprint",
  "ten_minute_skeleton",
  "exam_time_reference",
  "expanded_study_reference",
  "alternative_acceptable_points",
  "common_failure_modes",
] as const;
const SOURCE_ANCHOR_KINDS = [
  "official_question_metadata",
  "official_source_identity",
  "official_syllabus_rule",
  "law_source_version",
  "theory_concept_source",
  "practice_calculation_rule",
  "critic_report",
  "consensus_record",
] as const;
const LOCATOR_KINDS = [
  "question_id",
  "source_id",
  "subject_id",
  "law_version_id",
  "concept_node_id",
  "calculation_rule_id",
  "metadata_id",
] as const;
const EVIDENCE_ANCHOR_KINDS = [
  "requirement_coverage",
  "issue_coverage",
  "rubric_alignment",
  "candidate_comparison",
  "critic_finding",
  "consensus_decision",
  "calculation_trace",
  "law_version_check",
  "theory_concept_check",
] as const;
const UNCERTAINTY_KINDS = [
  "source_uncertainty",
  "rights_uncertainty",
  "problem_text_uncertainty",
  "calculation_uncertainty",
  "legal_version_uncertainty",
  "theory_term_uncertainty",
  "consensus_conflict",
  "subject_validator_gap",
] as const;
const UNCERTAINTY_SEVERITIES = ["low", "medium", "high", "blocking"] as const;
const UNCERTAINTY_RESOLUTION_STATUSES = ["open", "resolved", "accepted_as_alternative", "blocked"] as const;
const ALTERNATIVE_STATUSES = ["candidate", "accepted", "rejected", "needs_validator"] as const;
const ALTERNATIVE_RELEASE_IMPLICATIONS = ["non_blocking_alternative", "requires_consensus", "blocks_release"] as const;
const RELEASE_BLOCKER_KINDS = [
  "rights",
  "problem_text",
  "source_anchor",
  "legal_source",
  "calculation",
  "theory_validation",
  "subject_validation",
  "unresolved_consensus",
  "prohibited_claim",
  "data_boundary",
  "unsupported_subject",
] as const;
const RELEASE_BLOCKER_STATUSES = ["open", "resolved"] as const;
const VALIDATION_CHECK_STATUSES = ["pending", "passed", "failed", "not_applicable", "synthetic_fixture"] as const;
const PRACTICE_CHECK_KINDS = [
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
] as const;
const THEORY_CHECK_KINDS = [
  "definition",
  "logic_chain",
  "comparison",
  "application",
  "term_consistency",
  "alternative_view",
  "source_coverage",
  "unsupported_claim",
] as const;
const LAW_CHECK_KINDS = [
  "effective_date",
  "rule_source",
  "article_citation",
  "issue_identification",
  "application",
  "case_or_administrative_anchor",
  "conclusion",
  "unsupported_legal_claim",
] as const;
const REQUIRED_SECTION_KINDS: readonly SecondRoundReferenceSectionKind[] = [
  "requirement_map",
  "issue_map",
  "scoring_blueprint",
  "ten_minute_skeleton",
  "exam_time_reference",
  "expanded_study_reference",
  "alternative_acceptable_points",
  "common_failure_modes",
];
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
const REQUIRED_THEORY_CHECK_KINDS: readonly SecondRoundTheoryCheckKind[] = [
  "definition",
  "logic_chain",
  "comparison",
  "application",
  "term_consistency",
  "alternative_view",
  "source_coverage",
  "unsupported_claim",
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

const RIGHTS_STATUSES = ["redistribution_allowed", "display_by_deep_link", "private_reference_only", "needs_legal_review"] as const;
const DISPLAY_MODES = ["full_text", "official_file_embed", "metadata_and_link", "operator_only"] as const;
const EXTRACTION_STATUSES = ["not_started", "metadata_only", "extracted_private", "needs_visual_check", "blocked"] as const;
const PROBLEM_TEXT_STATUSES = ["synthetic_fixture", "not_extracted", "needs_visual_check", "verified", "blocked_by_rights"] as const;
const CANONICAL_VERIFICATION_STATUSES = ["synthetic_fixture", "not_started", "structure_draft", "structure_verified", "blocked"] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,180}$/;

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "questionText",
  "questionBody",
  "fullQuestion",
  "problemTextBody",
  "rawProblemText",
  "rawQuestionText",
  "officialQuestionText",
  "officialQuestionBody",
  "answerText",
  "answerBody",
  "fullAnswer",
  "rawAnswerText",
  "referenceAnswerText",
  "rawReferenceAnswerText",
  "officialAnswer",
  "officialAnswerText",
  "officialAnswerBody",
  "modelAnswer",
  "officialModelAnswer",
  "sourceText",
  "sourceExcerpt",
  "rawSourceText",
  "rawOcrText",
  "ocrText",
  "ocrFullText",
  "extractedText",
  "copyrightedText",
  "learnerAnswer",
  "learnerOcrText",
  "learnerText",
  "academyContent",
  "thirdPartyAcademyContent",
  "instructorComment",
  "score",
  "officialScore",
  "confirmedScore",
  "scorePrediction",
  "passFail",
  "passProbability",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "assetBytes",
  "localFileName",
  "localRawFileName",
  "sourceFileName",
  "localFilePath",
  "sourceFilePath",
  "rawFilePath",
]);
const FORBIDDEN_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|official\s+model\s+answer|official\s+answer|score\s+prediction|confirmed\s+score|pass\s*\/\s*fail|pass\s+probability|pass\s+guarantee|model\s+answer|guaranteed\s+score|공식\s*채점|공식\s*점수|확정\s*점수|점수\s*예측|합격\s*확률|합격\s*가능성|합격\s*보장|공식\s*모범\s*답안|모범\s*답안|정답\s*보장)/i;

function resolveRepoPath(customPath: string | undefined, fallback: string) {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), customPath ?? fallback);
}

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, sourceName: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${sourceName} must be a JSON object`);
}

function assertString(value: unknown, fieldName: string, sourceName: string, maxLength = 360) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${fieldName} must be a non-empty string`);
  }
  if (value.length > maxLength) throw new Error(`${sourceName}.${fieldName} is too long for metadata-only use`);
  if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
    throw new Error(`${sourceName}.${fieldName} contains a prohibited official-answer, official-grading, score, pass-probability, or guarantee claim`);
  }
  return value;
}

function assertOptionalString(value: unknown, fieldName: string, sourceName: string, maxLength = 360) {
  if (value === undefined) return undefined;
  return assertString(value, fieldName, sourceName, maxLength);
}

function assertId(value: unknown, fieldName: string, sourceName: string) {
  const id = assertString(value, fieldName, sourceName, 190);
  if (!ID_PATTERN.test(id)) throw new Error(`${sourceName}.${fieldName} must be a stable lowercase metadata id`);
  return id;
}

function assertInteger(value: unknown, fieldName: string, sourceName: string, options: { min?: number; max?: number } = {}) {
  if (!Number.isInteger(value)) throw new Error(`${sourceName}.${fieldName} must be an integer`);
  const numericValue = value as number;
  if (options.min !== undefined && numericValue < options.min) throw new Error(`${sourceName}.${fieldName} must be >= ${options.min}`);
  if (options.max !== undefined && numericValue > options.max) throw new Error(`${sourceName}.${fieldName} must be <= ${options.max}`);
  return numericValue;
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName}.${fieldName} must be false`);
  return false;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertBoolean(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "boolean") throw new Error(`${sourceName}.${fieldName} must be boolean`);
  return value;
}

function assertOneOf<const T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  sourceName: string,
  allowedValues: T,
): T[number] {
  const stringValue = assertString(value, fieldName, sourceName);
  if (!(allowedValues as readonly string[]).includes(stringValue)) {
    throw new Error(`${sourceName}.${fieldName} has unsupported value ${stringValue}`);
  }
  return stringValue;
}

function assertDate(value: unknown, fieldName: string, sourceName: string) {
  const date = assertString(value, fieldName, sourceName);
  if (!DATE_PATTERN.test(date)) throw new Error(`${sourceName}.${fieldName} must be YYYY-MM-DD`);
  return date;
}

function assertOptionalIsoInstant(value: unknown, fieldName: string, sourceName: string) {
  if (value === undefined) return undefined;
  const instant = assertString(value, fieldName, sourceName);
  if (!ISO_INSTANT_PATTERN.test(instant)) throw new Error(`${sourceName}.${fieldName} must be a deterministic ISO instant`);
  return instant;
}

function assertIsoInstant(value: unknown, fieldName: string, sourceName: string) {
  const instant = assertString(value, fieldName, sourceName);
  if (!ISO_INSTANT_PATTERN.test(instant)) throw new Error(`${sourceName}.${fieldName} must be a deterministic ISO instant`);
  return instant;
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertId(entry, `${fieldName}[${index}]`, sourceName));
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_CLAIM_PATTERN.test(value)) {
      throw new Error(`${sourceName} ${trail} contains a prohibited official-answer, official-grading, score, pass-probability, or guarantee claim`);
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains forbidden raw/content boundary field ${key} at ${trail}`);
    }
    assertNoForbiddenRawFields(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function assertUniqueIds(records: Array<{ id: string }>, sourceName: string) {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`${sourceName} contains duplicate id ${record.id}`);
    seen.add(record.id);
  }
}

function assertUniqueStringIds(ids: string[], sourceName: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function assertKnownIds(ids: string[], knownIds: Set<string>, fieldName: string, sourceName: string) {
  for (const id of ids) {
    if (!knownIds.has(id)) throw new Error(`${sourceName}.${fieldName} references unknown id ${id}`);
  }
}

function assertRequiredKinds<T extends string>(actualKinds: Set<T>, requiredKinds: readonly T[], sourceName: string) {
  for (const kind of requiredKinds) {
    if (!actualKinds.has(kind)) throw new Error(`${sourceName} is missing required kind ${kind}`);
  }
}

function isReleasePassingStatus(status: SecondRoundValidationCheckStatus) {
  return status === "passed" || status === "synthetic_fixture" || status === "not_applicable";
}

function assertStoragePolicy(value: unknown, sourceName: string): SecondRoundReferencePackageStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
    rawOfficialFileStored: assertFalse(value.rawOfficialFileStored, "rawOfficialFileStored", `${sourceName}.storagePolicy`),
    rawOfficialQuestionTextStored: assertFalse(value.rawOfficialQuestionTextStored, "rawOfficialQuestionTextStored", `${sourceName}.storagePolicy`),
    rawOfficialAnswerTextStored: assertFalse(value.rawOfficialAnswerTextStored, "rawOfficialAnswerTextStored", `${sourceName}.storagePolicy`),
    rawReferenceAnswerTextStored: assertFalse(value.rawReferenceAnswerTextStored, "rawReferenceAnswerTextStored", `${sourceName}.storagePolicy`),
    rawLearnerAnswerStored: assertFalse(value.rawLearnerAnswerStored, "rawLearnerAnswerStored", `${sourceName}.storagePolicy`),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", `${sourceName}.storagePolicy`),
    rawSourceExcerptStored: assertFalse(value.rawSourceExcerptStored, "rawSourceExcerptStored", `${sourceName}.storagePolicy`),
    rawAssetBytesStored: assertFalse(value.rawAssetBytesStored, "rawAssetBytesStored", `${sourceName}.storagePolicy`),
    thirdPartyAcademyContentStored: assertFalse(value.thirdPartyAcademyContentStored, "thirdPartyAcademyContentStored", `${sourceName}.storagePolicy`),
  };
}

function validateBoundaryPolicy(raw: unknown, sourceName: string): SecondRoundReferencePackageBoundaryPolicy {
  assertRecord(raw, `${sourceName}.boundaryPolicy`);
  return {
    syntheticFixturesOnly: assertBoolean(raw.syntheticFixturesOnly, "syntheticFixturesOnly", `${sourceName}.boundaryPolicy`),
    officialQuestionBodiesStored: assertFalse(raw.officialQuestionBodiesStored, "officialQuestionBodiesStored", `${sourceName}.boundaryPolicy`),
    officialAnswerBodiesStored: assertFalse(raw.officialAnswerBodiesStored, "officialAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    learnerAnswerBodiesStored: assertFalse(raw.learnerAnswerBodiesStored, "learnerAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    referenceAnswerBodiesStored: assertFalse(raw.referenceAnswerBodiesStored, "referenceAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    referenceAnswersGenerated: assertFalse(raw.referenceAnswersGenerated, "referenceAnswersGenerated", `${sourceName}.boundaryPolicy`),
    gradingEngineImplemented: assertFalse(raw.gradingEngineImplemented, "gradingEngineImplemented", `${sourceName}.boundaryPolicy`),
    billingOrLedgerImplemented: assertFalse(raw.billingOrLedgerImplemented, "billingOrLedgerImplemented", `${sourceName}.boundaryPolicy`),
    publicArchiveUiImplemented: assertFalse(raw.publicArchiveUiImplemented, "publicArchiveUiImplemented", `${sourceName}.boundaryPolicy`),
    instructorRuntimeRoutesChanged: assertFalse(raw.instructorRuntimeRoutesChanged, "instructorRuntimeRoutesChanged", `${sourceName}.boundaryPolicy`),
  };
}

function validateOfficialSourceStatus(
  raw: unknown,
  sourceName: string,
  question: SecondRoundCanonicalQuestionRecord,
): SecondRoundOfficialSourceStatus {
  assertRecord(raw, sourceName);
  const status: SecondRoundOfficialSourceStatus = {
    sourceStatus: assertOneOf(raw.sourceStatus, "sourceStatus", sourceName, OFFICIAL_SOURCE_STATUSES) as SecondRoundReferenceOfficialSourceStatus,
    questionId: assertId(raw.questionId, "questionId", sourceName),
    sourceId: assertId(raw.sourceId, "sourceId", sourceName),
    rightsStatus: assertOneOf(raw.rightsStatus, "rightsStatus", sourceName, RIGHTS_STATUSES) as SecondRoundRightsStatus,
    displayMode: assertOneOf(raw.displayMode, "displayMode", sourceName, DISPLAY_MODES) as SecondRoundDisplayMode,
    extractionStatus: assertOneOf(raw.extractionStatus, "extractionStatus", sourceName, EXTRACTION_STATUSES) as SecondRoundExtractionStatus,
    problemTextStatus: assertOneOf(raw.problemTextStatus, "problemTextStatus", sourceName, PROBLEM_TEXT_STATUSES) as SecondRoundProblemTextStatus,
    canonicalVerificationStatus: assertOneOf(
      raw.canonicalVerificationStatus,
      "canonicalVerificationStatus",
      sourceName,
      CANONICAL_VERIFICATION_STATUSES,
    ) as SecondRoundCanonicalVerificationStatus,
    officialAnswerAvailability: assertOneOf(
      raw.officialAnswerAvailability,
      "officialAnswerAvailability",
      sourceName,
      ["not_available_for_second_round"] as const,
    ),
    officialAnswerUsed: assertFalse(raw.officialAnswerUsed, "officialAnswerUsed", sourceName),
    officialGradingCriteriaUsed: assertFalse(raw.officialGradingCriteriaUsed, "officialGradingCriteriaUsed", sourceName),
  };
  if (status.questionId !== question.id) throw new Error(`${sourceName}.questionId must match linked S203 question`);
  if (status.sourceId !== question.source.sourceId) throw new Error(`${sourceName}.sourceId must match linked S203 question source`);
  if (status.rightsStatus !== question.source.rightsStatus) throw new Error(`${sourceName}.rightsStatus must match linked S203 question source`);
  if (status.displayMode !== question.source.displayMode) throw new Error(`${sourceName}.displayMode must match linked S203 question source`);
  if (status.extractionStatus !== question.source.extractionStatus) throw new Error(`${sourceName}.extractionStatus must match linked S203 question source`);
  if (status.problemTextStatus !== question.problemText.status) throw new Error(`${sourceName}.problemTextStatus must match linked S203 question`);
  if (status.canonicalVerificationStatus !== question.canonicalVerificationStatus) {
    throw new Error(`${sourceName}.canonicalVerificationStatus must match linked S203 question`);
  }
  return status;
}

function validateLearningReference(raw: unknown, sourceName: string): SecondRoundLearningReferenceIdentity {
  assertRecord(raw, sourceName);
  return {
    status: assertOneOf(raw.status, "status", sourceName, LEARNING_REFERENCE_STATUSES) as SecondRoundLearningReferenceStatus,
    learnerFacingLabelKey: assertOneOf(raw.learnerFacingLabelKey, "learnerFacingLabelKey", sourceName, ["verified_learning_reference"] as const),
    requiredCaveatKey: assertOneOf(raw.requiredCaveatKey, "requiredCaveatKey", sourceName, ["learning_reference_not_official_answer"] as const),
    officialClaimAllowed: assertFalse(raw.officialClaimAllowed, "officialClaimAllowed", sourceName),
    scorePredictionAllowed: assertFalse(raw.scorePredictionAllowed, "scorePredictionAllowed", sourceName),
    passProbabilityAllowed: assertFalse(raw.passProbabilityAllowed, "passProbabilityAllowed", sourceName),
  };
}

function validateSection(raw: unknown, index: number, sourceName: string): SecondRoundReferencePackageSection {
  const sectionName = `${sourceName}.sections[${index}]`;
  assertRecord(raw, sectionName);
  return {
    sectionId: assertId(raw.sectionId, "sectionId", sectionName),
    kind: assertOneOf(raw.kind, "kind", sectionName, SECTION_KINDS) as SecondRoundReferenceSectionKind,
    contentStatus: assertOneOf(raw.contentStatus, "contentStatus", sectionName, CONTENT_STATUSES) as SecondRoundReferenceContentStatus,
    contentStored: assertFalse(raw.contentStored, "contentStored", sectionName),
    generatedTextStored: assertFalse(raw.generatedTextStored, "generatedTextStored", sectionName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", sectionName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", sectionName),
    verificationStatus: assertOneOf(raw.verificationStatus, "verificationStatus", sectionName, VERIFICATION_STATUSES) as SecondRoundReferenceVerificationStatus,
  };
}

function validateSourceAnchor(raw: unknown, index: number, sourceName: string): SecondRoundSourceAnchor {
  const anchorName = `${sourceName}.sourceAnchors[${index}]`;
  assertRecord(raw, anchorName);
  assertRecord(raw.locator, `${anchorName}.locator`);
  return {
    anchorId: assertId(raw.anchorId, "anchorId", anchorName),
    kind: assertOneOf(raw.kind, "kind", anchorName, SOURCE_ANCHOR_KINDS) as SecondRoundSourceAnchorKind,
    sourceId: assertOptionalString(raw.sourceId, "sourceId", anchorName, 190),
    questionId: assertOptionalString(raw.questionId, "questionId", anchorName, 190),
    locator: {
      kind: assertOneOf(raw.locator.kind, "kind", `${anchorName}.locator`, LOCATOR_KINDS) as SecondRoundAnchorLocatorKind,
      ref: assertId(raw.locator.ref, "ref", `${anchorName}.locator`),
      page: raw.locator.page === undefined ? undefined : assertInteger(raw.locator.page, "page", `${anchorName}.locator`, { min: 1, max: 5000 }),
      section: assertOptionalString(raw.locator.section, "section", `${anchorName}.locator`, 160),
      rawTextStored: assertFalse(raw.locator.rawTextStored, "rawTextStored", `${anchorName}.locator`),
      excerptStored: assertFalse(raw.locator.excerptStored, "excerptStored", `${anchorName}.locator`),
    },
    verificationStatus: assertOneOf(raw.verificationStatus, "verificationStatus", anchorName, VERIFICATION_STATUSES) as SecondRoundReferenceVerificationStatus,
  };
}

function validateEvidenceAnchor(raw: unknown, index: number, sourceName: string): SecondRoundEvidenceAnchor {
  const evidenceName = `${sourceName}.evidenceAnchors[${index}]`;
  assertRecord(raw, evidenceName);
  return {
    evidenceId: assertId(raw.evidenceId, "evidenceId", evidenceName),
    kind: assertOneOf(raw.kind, "kind", evidenceName, EVIDENCE_ANCHOR_KINDS) as SecondRoundEvidenceAnchorKind,
    status: assertOneOf(raw.status, "status", evidenceName, EVIDENCE_STATUSES) as SecondRoundReferenceEvidenceStatus,
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", evidenceName),
    supportsRelease: assertBoolean(raw.supportsRelease, "supportsRelease", evidenceName),
    rawEvidenceStored: assertFalse(raw.rawEvidenceStored, "rawEvidenceStored", evidenceName),
  };
}

function validateUncertainty(raw: unknown, index: number, sourceName: string): SecondRoundUncertainty {
  const uncertaintyName = `${sourceName}.uncertainty[${index}]`;
  assertRecord(raw, uncertaintyName);
  return {
    uncertaintyId: assertId(raw.uncertaintyId, "uncertaintyId", uncertaintyName),
    kind: assertOneOf(raw.kind, "kind", uncertaintyName, UNCERTAINTY_KINDS) as SecondRoundUncertaintyKind,
    severity: assertOneOf(raw.severity, "severity", uncertaintyName, UNCERTAINTY_SEVERITIES) as SecondRoundUncertaintySeverity,
    summary: assertString(raw.summary, "summary", uncertaintyName),
    resolutionStatus: assertOneOf(
      raw.resolutionStatus,
      "resolutionStatus",
      uncertaintyName,
      UNCERTAINTY_RESOLUTION_STATUSES,
    ) as SecondRoundUncertaintyResolutionStatus,
    releaseBlocking: assertBoolean(raw.releaseBlocking, "releaseBlocking", uncertaintyName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", uncertaintyName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", uncertaintyName),
  };
}

function validateAlternativeReasoningPath(raw: unknown, index: number, sourceName: string): SecondRoundAlternativeReasoningPath {
  const pathName = `${sourceName}.alternativeReasoningPaths[${index}]`;
  assertRecord(raw, pathName);
  return {
    pathId: assertId(raw.pathId, "pathId", pathName),
    status: assertOneOf(raw.status, "status", pathName, ALTERNATIVE_STATUSES) as SecondRoundAlternativeReasoningStatus,
    summary: assertString(raw.summary, "summary", pathName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", pathName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", pathName),
    uncertaintyIds: assertIdArray(raw.uncertaintyIds, "uncertaintyIds", pathName),
    releaseImplication: assertOneOf(
      raw.releaseImplication,
      "releaseImplication",
      pathName,
      ALTERNATIVE_RELEASE_IMPLICATIONS,
    ) as SecondRoundAlternativeReleaseImplication,
  };
}

function validateReleaseBlocker(raw: unknown, index: number, sourceName: string): SecondRoundReleaseBlocker {
  const blockerName = `${sourceName}.releaseBlockers[${index}]`;
  assertRecord(raw, blockerName);
  return {
    blockerId: assertId(raw.blockerId, "blockerId", blockerName),
    kind: assertOneOf(raw.kind, "kind", blockerName, RELEASE_BLOCKER_KINDS) as SecondRoundReleaseBlockerKind,
    status: assertOneOf(raw.status, "status", blockerName, RELEASE_BLOCKER_STATUSES) as SecondRoundReleaseBlockerStatus,
    severity: assertOneOf(raw.severity, "severity", blockerName, ["blocking", "warning"] as const),
    summary: assertString(raw.summary, "summary", blockerName),
    requiredResolver: assertOneOf(raw.requiredResolver, "requiredResolver", blockerName, [
      "s208",
      "s209",
      "s210",
      "s214",
      "s215",
      "human_decision",
      "s207_validator",
    ] as const),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", blockerName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", blockerName),
  };
}

function validatePracticeCheck(raw: unknown, index: number, sourceName: string): SecondRoundPracticeValidationCheck {
  const checkName = `${sourceName}.checks[${index}]`;
  assertRecord(raw, checkName);
  return {
    checkId: assertId(raw.checkId, "checkId", checkName),
    kind: assertOneOf(raw.kind, "kind", checkName, PRACTICE_CHECK_KINDS) as SecondRoundPracticeCheckKind,
    status: assertOneOf(raw.status, "status", checkName, VALIDATION_CHECK_STATUSES) as SecondRoundValidationCheckStatus,
    releaseBlocking: assertBoolean(raw.releaseBlocking, "releaseBlocking", checkName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", checkName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", checkName),
  };
}

function validatePracticeValidation(raw: unknown, sourceName: string): SecondRoundPracticeValidation {
  assertRecord(raw, sourceName);
  if (!Array.isArray(raw.checks)) throw new Error(`${sourceName}.checks must be an array`);
  const checks = raw.checks.map((entry, index) => validatePracticeCheck(entry, index, sourceName));
  assertUniqueStringIds(checks.map((check) => check.checkId), `${sourceName}.checks`);
  assertRequiredKinds(new Set(checks.map((check) => check.kind)), REQUIRED_PRACTICE_CHECK_KINDS, `${sourceName}.checks`);
  return {
    calculatorModel: assertOneOf(raw.calculatorModel, "calculatorModel", sourceName, ["casio_fx_9860giii"] as const),
    resetSafeHandKeyedRoutineRequired: assertTrue(raw.resetSafeHandKeyedRoutineRequired, "resetSafeHandKeyedRoutineRequired", sourceName),
    storedProgramDependencyAllowed: assertFalse(raw.storedProgramDependencyAllowed, "storedProgramDependencyAllowed", sourceName),
    formulaStored: assertFalse(raw.formulaStored, "formulaStored", sourceName),
    extractedValuesStored: assertFalse(raw.extractedValuesStored, "extractedValuesStored", sourceName),
    handKeyedSequenceStored: assertFalse(raw.handKeyedSequenceStored, "handKeyedSequenceStored", sourceName),
    expectedDisplayStored: assertFalse(raw.expectedDisplayStored, "expectedDisplayStored", sourceName),
    checks,
  };
}

function validateTheoryCheck(raw: unknown, index: number, sourceName: string): SecondRoundTheoryValidationCheck {
  const checkName = `${sourceName}.checks[${index}]`;
  assertRecord(raw, checkName);
  return {
    checkId: assertId(raw.checkId, "checkId", checkName),
    kind: assertOneOf(raw.kind, "kind", checkName, THEORY_CHECK_KINDS) as SecondRoundTheoryCheckKind,
    status: assertOneOf(raw.status, "status", checkName, VALIDATION_CHECK_STATUSES) as SecondRoundValidationCheckStatus,
    releaseBlocking: assertBoolean(raw.releaseBlocking, "releaseBlocking", checkName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", checkName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", checkName),
  };
}

function validateTheoryValidation(raw: unknown, sourceName: string): SecondRoundTheoryValidation {
  assertRecord(raw, sourceName);
  if (!Array.isArray(raw.checks)) throw new Error(`${sourceName}.checks must be an array`);
  const checks = raw.checks.map((entry, index) => validateTheoryCheck(entry, index, sourceName));
  assertUniqueStringIds(checks.map((check) => check.checkId), `${sourceName}.checks`);
  assertRequiredKinds(new Set(checks.map((check) => check.kind)), REQUIRED_THEORY_CHECK_KINDS, `${sourceName}.checks`);
  return { checks };
}

function validateLawCheck(raw: unknown, index: number, sourceName: string): SecondRoundLawValidationCheck {
  const checkName = `${sourceName}.checks[${index}]`;
  assertRecord(raw, checkName);
  return {
    checkId: assertId(raw.checkId, "checkId", checkName),
    kind: assertOneOf(raw.kind, "kind", checkName, LAW_CHECK_KINDS) as SecondRoundLawCheckKind,
    status: assertOneOf(raw.status, "status", checkName, VALIDATION_CHECK_STATUSES) as SecondRoundValidationCheckStatus,
    releaseBlocking: assertBoolean(raw.releaseBlocking, "releaseBlocking", checkName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", checkName),
    evidenceAnchorIds: assertIdArray(raw.evidenceAnchorIds, "evidenceAnchorIds", checkName),
  };
}

function validateLawValidation(raw: unknown, sourceName: string): SecondRoundLawValidation {
  assertRecord(raw, sourceName);
  if (!Array.isArray(raw.checks)) throw new Error(`${sourceName}.checks must be an array`);
  const checks = raw.checks.map((entry, index) => validateLawCheck(entry, index, sourceName));
  assertUniqueStringIds(checks.map((check) => check.checkId), `${sourceName}.checks`);
  assertRequiredKinds(new Set(checks.map((check) => check.kind)), REQUIRED_LAW_CHECK_KINDS, `${sourceName}.checks`);
  const examDate = assertDate(raw.examDate, "examDate", sourceName);
  const lawEffectiveDate = assertDate(raw.lawEffectiveDate, "lawEffectiveDate", sourceName);
  if (lawEffectiveDate > examDate) throw new Error(`${sourceName}.lawEffectiveDate must not be after examDate`);
  return {
    examDate,
    lawEffectiveDate,
    lawVersionAnchorIds: assertIdArray(raw.lawVersionAnchorIds, "lawVersionAnchorIds", sourceName),
    checks,
  };
}

function validateVerificationReport(raw: unknown, sourceName: string): SecondRoundReferenceVerificationReport {
  assertRecord(raw, sourceName);
  return {
    sourceStatus: assertOneOf(raw.sourceStatus, "sourceStatus", sourceName, VERIFICATION_STATUSES) as SecondRoundReferenceVerificationStatus,
    evidenceStatus: assertOneOf(raw.evidenceStatus, "evidenceStatus", sourceName, EVIDENCE_STATUSES) as SecondRoundReferenceEvidenceStatus,
    subjectValidationStatus: assertOneOf(raw.subjectValidationStatus, "subjectValidationStatus", sourceName, VERIFICATION_STATUSES) as SecondRoundReferenceVerificationStatus,
    criticConsensusStatus: assertOneOf(raw.criticConsensusStatus, "criticConsensusStatus", sourceName, VERIFICATION_STATUSES) as SecondRoundReferenceVerificationStatus,
    releaseGateStatus: assertOneOf(raw.releaseGateStatus, "releaseGateStatus", sourceName, VERIFICATION_STATUSES) as SecondRoundReferenceVerificationStatus,
    independentCandidateCount: assertInteger(raw.independentCandidateCount, "independentCandidateCount", sourceName, { min: 0, max: 20 }),
    criticPassCount: assertInteger(raw.criticPassCount, "criticPassCount", sourceName, { min: 0, max: 20 }),
    unresolvedConflictCount: assertInteger(raw.unresolvedConflictCount, "unresolvedConflictCount", sourceName, { min: 0, max: 20 }),
  };
}

function validateReleaseDecision(raw: unknown, sourceName: string): SecondRoundReferenceReleaseDecision {
  assertRecord(raw, sourceName);
  return {
    status: assertOneOf(raw.status, "status", sourceName, RELEASE_STATUSES) as SecondRoundReferenceReleaseStatus,
    releasedAt: assertOptionalIsoInstant(raw.releasedAt, "releasedAt", sourceName),
    requiredCaveatKey: assertOneOf(raw.requiredCaveatKey, "requiredCaveatKey", sourceName, ["learning_reference_not_official_answer"] as const),
    noOfficialAnswerGuardrail: assertTrue(raw.noOfficialAnswerGuardrail, "noOfficialAnswerGuardrail", sourceName),
    learnerFacingOfficialClaimAllowed: assertFalse(raw.learnerFacingOfficialClaimAllowed, "learnerFacingOfficialClaimAllowed", sourceName),
    releaseRequiresNoOpenBlockers: assertTrue(raw.releaseRequiresNoOpenBlockers, "releaseRequiresNoOpenBlockers", sourceName),
  };
}

function validateDownstreamUsage(raw: unknown, sourceName: string): SecondRoundReferenceAnswerPackage["downstreamUsage"] {
  assertRecord(raw, sourceName);
  return {
    s214GenerationInput: assertBoolean(raw.s214GenerationInput, "s214GenerationInput", sourceName),
    s215ReleaseGateInput: assertBoolean(raw.s215ReleaseGateInput, "s215ReleaseGateInput", sourceName),
    s211LawReviewInput: assertBoolean(raw.s211LawReviewInput, "s211LawReviewInput", sourceName),
    s212TheoryReviewInput: assertBoolean(raw.s212TheoryReviewInput, "s212TheoryReviewInput", sourceName),
    s213PracticeReviewInput: assertBoolean(raw.s213PracticeReviewInput, "s213PracticeReviewInput", sourceName),
  };
}

function validatePackage(
  raw: unknown,
  index: number,
  questionsById: Map<string, SecondRoundCanonicalQuestionRecord>,
): SecondRoundReferenceAnswerPackage {
  const sourceName = `reference_answer_packages.packages[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);

  const questionId = assertId(raw.questionId, "questionId", sourceName);
  const question = questionsById.get(questionId);
  if (!question) throw new Error(`${sourceName}.questionId does not exist in S203 canonical question registry`);
  if (!Array.isArray(raw.sections)) throw new Error(`${sourceName}.sections must be an array`);
  if (!Array.isArray(raw.sourceAnchors)) throw new Error(`${sourceName}.sourceAnchors must be an array`);
  if (!Array.isArray(raw.evidenceAnchors)) throw new Error(`${sourceName}.evidenceAnchors must be an array`);
  if (!Array.isArray(raw.uncertainty)) throw new Error(`${sourceName}.uncertainty must be an array`);
  if (!Array.isArray(raw.alternativeReasoningPaths)) throw new Error(`${sourceName}.alternativeReasoningPaths must be an array`);
  if (!Array.isArray(raw.releaseBlockers)) throw new Error(`${sourceName}.releaseBlockers must be an array`);

  const sections = raw.sections.map((entry, sectionIndex) => validateSection(entry, sectionIndex, sourceName));
  const sourceAnchors = raw.sourceAnchors.map((entry, anchorIndex) => validateSourceAnchor(entry, anchorIndex, sourceName));
  const evidenceAnchors = raw.evidenceAnchors.map((entry, anchorIndex) => validateEvidenceAnchor(entry, anchorIndex, sourceName));
  const uncertainty = raw.uncertainty.map((entry, uncertaintyIndex) => validateUncertainty(entry, uncertaintyIndex, sourceName));
  const alternativeReasoningPaths = raw.alternativeReasoningPaths.map((entry, pathIndex) => (
    validateAlternativeReasoningPath(entry, pathIndex, sourceName)
  ));
  const releaseBlockers = raw.releaseBlockers.map((entry, blockerIndex) => validateReleaseBlocker(entry, blockerIndex, sourceName));
  const sourceAnchorIds = new Set(sourceAnchors.map((anchor) => anchor.anchorId));
  const evidenceAnchorIds = new Set(evidenceAnchors.map((anchor) => anchor.evidenceId));
  const uncertaintyIds = new Set(uncertainty.map((entry) => entry.uncertaintyId));

  assertUniqueStringIds(sections.map((section) => section.sectionId), `${sourceName}.sections`);
  assertUniqueStringIds(sourceAnchors.map((anchor) => anchor.anchorId), `${sourceName}.sourceAnchors`);
  assertUniqueStringIds(evidenceAnchors.map((anchor) => anchor.evidenceId), `${sourceName}.evidenceAnchors`);
  assertUniqueStringIds(uncertainty.map((entry) => entry.uncertaintyId), `${sourceName}.uncertainty`);
  assertUniqueStringIds(alternativeReasoningPaths.map((entry) => entry.pathId), `${sourceName}.alternativeReasoningPaths`);
  assertUniqueStringIds(releaseBlockers.map((entry) => entry.blockerId), `${sourceName}.releaseBlockers`);
  assertRequiredKinds(new Set(sections.map((section) => section.kind)), REQUIRED_SECTION_KINDS, `${sourceName}.sections`);

  for (const section of sections) {
    assertKnownIds(section.sourceAnchorIds, sourceAnchorIds, `sections.${section.sectionId}.sourceAnchorIds`, sourceName);
    assertKnownIds(section.evidenceAnchorIds, evidenceAnchorIds, `sections.${section.sectionId}.evidenceAnchorIds`, sourceName);
  }
  for (const anchor of evidenceAnchors) {
    assertKnownIds(anchor.sourceAnchorIds, sourceAnchorIds, `evidenceAnchors.${anchor.evidenceId}.sourceAnchorIds`, sourceName);
  }
  for (const entry of uncertainty) {
    assertKnownIds(entry.sourceAnchorIds, sourceAnchorIds, `uncertainty.${entry.uncertaintyId}.sourceAnchorIds`, sourceName);
    assertKnownIds(entry.evidenceAnchorIds, evidenceAnchorIds, `uncertainty.${entry.uncertaintyId}.evidenceAnchorIds`, sourceName);
  }
  for (const alternative of alternativeReasoningPaths) {
    assertKnownIds(alternative.sourceAnchorIds, sourceAnchorIds, `alternativeReasoningPaths.${alternative.pathId}.sourceAnchorIds`, sourceName);
    assertKnownIds(alternative.evidenceAnchorIds, evidenceAnchorIds, `alternativeReasoningPaths.${alternative.pathId}.evidenceAnchorIds`, sourceName);
    assertKnownIds(alternative.uncertaintyIds, uncertaintyIds, `alternativeReasoningPaths.${alternative.pathId}.uncertaintyIds`, sourceName);
  }
  for (const blocker of releaseBlockers) {
    assertKnownIds(blocker.sourceAnchorIds, sourceAnchorIds, `releaseBlockers.${blocker.blockerId}.sourceAnchorIds`, sourceName);
    assertKnownIds(blocker.evidenceAnchorIds, evidenceAnchorIds, `releaseBlockers.${blocker.blockerId}.evidenceAnchorIds`, sourceName);
  }

  const subject = assertOneOf(raw.subject, "subject", sourceName, SUBJECTS) as SecondRoundSubject;
  const pkg: SecondRoundReferenceAnswerPackage = {
    id: assertId(raw.id, "id", sourceName),
    mode: assertOneOf(raw.mode, "mode", sourceName, PACKAGE_MODES) as SecondRoundReferenceAnswerPackageMode,
    questionId,
    subject,
    officialSource: validateOfficialSourceStatus(raw.officialSource, `${sourceName}.officialSource`, question),
    learningReference: validateLearningReference(raw.learningReference, `${sourceName}.learningReference`),
    sections,
    sourceAnchors,
    evidenceAnchors,
    uncertainty,
    alternativeReasoningPaths,
    practiceValidation: raw.practiceValidation === undefined ? undefined : validatePracticeValidation(raw.practiceValidation, `${sourceName}.practiceValidation`),
    theoryValidation: raw.theoryValidation === undefined ? undefined : validateTheoryValidation(raw.theoryValidation, `${sourceName}.theoryValidation`),
    lawValidation: raw.lawValidation === undefined ? undefined : validateLawValidation(raw.lawValidation, `${sourceName}.lawValidation`),
    verificationReport: validateVerificationReport(raw.verificationReport, `${sourceName}.verificationReport`),
    releaseBlockers,
    release: validateReleaseDecision(raw.release, `${sourceName}.release`),
    downstreamUsage: validateDownstreamUsage(raw.downstreamUsage, `${sourceName}.downstreamUsage`),
  };

  assertPackageBusinessRules(pkg, question, sourceAnchorIds, evidenceAnchorIds, sourceName);
  return pkg;
}

function assertSubjectValidationShape(pkg: SecondRoundReferenceAnswerPackage, question: SecondRoundCanonicalQuestionRecord, sourceName: string) {
  if (pkg.subject !== question.subject) throw new Error(`${sourceName}.subject must match linked S203 question`);
  if (pkg.subject === "practice") {
    if (!pkg.practiceValidation) throw new Error(`${sourceName}.practiceValidation is required for practice packages`);
    if (pkg.theoryValidation || pkg.lawValidation) throw new Error(`${sourceName} practice packages must not include theoryValidation or lawValidation`);
    return;
  }
  if (pkg.subject === "theory") {
    if (!pkg.theoryValidation) throw new Error(`${sourceName}.theoryValidation is required for theory packages`);
    if (pkg.practiceValidation || pkg.lawValidation) throw new Error(`${sourceName} theory packages must not include practiceValidation or lawValidation`);
    return;
  }
  if (!pkg.lawValidation) throw new Error(`${sourceName}.lawValidation is required for law packages`);
  if (pkg.practiceValidation || pkg.theoryValidation) throw new Error(`${sourceName} law packages must not include practiceValidation or theoryValidation`);
  if (!question.examDate || !question.lawEffectiveDate) throw new Error(`${sourceName} linked law question must have S203 examDate and lawEffectiveDate`);
  if (pkg.lawValidation.examDate !== question.examDate) throw new Error(`${sourceName}.lawValidation.examDate must match linked S203 question`);
  if (pkg.lawValidation.lawEffectiveDate !== question.lawEffectiveDate) {
    throw new Error(`${sourceName}.lawValidation.lawEffectiveDate must match linked S203 question`);
  }
}

function assertSubjectAnchorRefs(pkg: SecondRoundReferenceAnswerPackage, sourceAnchorIds: Set<string>, evidenceAnchorIds: Set<string>, sourceName: string) {
  const validateCheckRefs = (check: { checkId: string; sourceAnchorIds: string[]; evidenceAnchorIds: string[] }, fieldPrefix: string) => {
    assertKnownIds(check.sourceAnchorIds, sourceAnchorIds, `${fieldPrefix}.${check.checkId}.sourceAnchorIds`, sourceName);
    assertKnownIds(check.evidenceAnchorIds, evidenceAnchorIds, `${fieldPrefix}.${check.checkId}.evidenceAnchorIds`, sourceName);
  };
  pkg.practiceValidation?.checks.forEach((check) => validateCheckRefs(check, "practiceValidation.checks"));
  pkg.theoryValidation?.checks.forEach((check) => validateCheckRefs(check, "theoryValidation.checks"));
  pkg.lawValidation?.checks.forEach((check) => validateCheckRefs(check, "lawValidation.checks"));
  if (pkg.lawValidation) {
    assertKnownIds(pkg.lawValidation.lawVersionAnchorIds, sourceAnchorIds, "lawValidation.lawVersionAnchorIds", sourceName);
  }
}

function subjectChecksPassForRelease(pkg: SecondRoundReferenceAnswerPackage) {
  if (pkg.subject === "practice") {
    return Boolean(pkg.practiceValidation?.checks.every((check) => isReleasePassingStatus(check.status)));
  }
  if (pkg.subject === "theory") {
    return Boolean(pkg.theoryValidation?.checks.every((check) => isReleasePassingStatus(check.status)));
  }
  return Boolean(pkg.lawValidation?.checks.every((check) => isReleasePassingStatus(check.status)));
}

function assertReleaseRules(pkg: SecondRoundReferenceAnswerPackage, question: SecondRoundCanonicalQuestionRecord, sourceName: string) {
  const openBlockingReleaseBlockers = pkg.releaseBlockers.filter((blocker) => blocker.status === "open" && blocker.severity === "blocking");
  const unresolvedBlockingUncertainty = pkg.uncertainty.filter((entry) => (
    entry.releaseBlocking && entry.resolutionStatus !== "resolved" && entry.resolutionStatus !== "accepted_as_alternative"
  ));
  if (openBlockingReleaseBlockers.length > 0 && pkg.release.status !== "blocked") {
    throw new Error(`${sourceName}.release.status must be blocked while open blocking release blockers remain`);
  }
  if (pkg.release.status !== "released") {
    if (pkg.learningReference.status === "released_learning_reference") {
      throw new Error(`${sourceName}.learningReference.status cannot be released unless release.status is released`);
    }
    return;
  }

  if (pkg.learningReference.status !== "released_learning_reference") {
    throw new Error(`${sourceName}.learningReference.status must be released_learning_reference for released packages`);
  }
  if (!pkg.release.releasedAt) throw new Error(`${sourceName}.release.releasedAt is required for released packages`);
  if (openBlockingReleaseBlockers.length > 0) throw new Error(`${sourceName} cannot release with open blocking release blockers`);
  if (unresolvedBlockingUncertainty.length > 0) throw new Error(`${sourceName} cannot release with unresolved blocking uncertainty`);
  if (pkg.verificationReport.independentCandidateCount < 3) throw new Error(`${sourceName} released packages require at least three independent candidates`);
  if (pkg.verificationReport.criticPassCount < 1) throw new Error(`${sourceName} released packages require critic review`);
  if (pkg.verificationReport.unresolvedConflictCount !== 0) throw new Error(`${sourceName} cannot release with unresolved consensus conflicts`);
  if (pkg.verificationReport.sourceStatus !== "source_verified") throw new Error(`${sourceName} released packages require source_verified status`);
  if (pkg.verificationReport.evidenceStatus !== "subject_validated") throw new Error(`${sourceName} released packages require subject_validated evidence status`);
  if (pkg.verificationReport.subjectValidationStatus !== "subject_validated") {
    throw new Error(`${sourceName} released packages require subject_validated subject status`);
  }
  if (pkg.verificationReport.criticConsensusStatus !== "critic_consensus_passed") {
    throw new Error(`${sourceName} released packages require critic_consensus_passed status`);
  }
  if (pkg.verificationReport.releaseGateStatus !== "released") throw new Error(`${sourceName} released packages require released gate status`);
  if (!subjectChecksPassForRelease(pkg)) throw new Error(`${sourceName} subject-specific checks must pass before release`);
  if (!pkg.sections.every((section) => section.verificationStatus === "released" || section.verificationStatus === "source_verified")) {
    throw new Error(`${sourceName} released package sections must be verified or released`);
  }
  if (!pkg.evidenceAnchors.some((anchor) => anchor.supportsRelease && (anchor.status === "subject_validated" || anchor.status === "synthetic_fixture"))) {
    throw new Error(`${sourceName} released packages require release-supporting evidence anchors`);
  }
  if (pkg.officialSource.rightsStatus === "needs_legal_review" || pkg.officialSource.rightsStatus === "private_reference_only") {
    throw new Error(`${sourceName} cannot release while source rights are unresolved or operator-only`);
  }
  if (question.problemText.status !== "verified" && question.problemText.status !== "synthetic_fixture") {
    throw new Error(`${sourceName} cannot release without verified problem text or synthetic fixture status`);
  }
  if (question.canonicalVerificationStatus !== "structure_verified" && question.canonicalVerificationStatus !== "synthetic_fixture") {
    throw new Error(`${sourceName} cannot release without verified S203 canonical structure`);
  }
}

function assertPackageBusinessRules(
  pkg: SecondRoundReferenceAnswerPackage,
  question: SecondRoundCanonicalQuestionRecord,
  sourceAnchorIds: Set<string>,
  evidenceAnchorIds: Set<string>,
  sourceName: string,
) {
  if (pkg.officialSource.officialAnswerUsed || pkg.officialSource.officialGradingCriteriaUsed) {
    throw new Error(`${sourceName} must not use official answers or official grading criteria for second-round packages`);
  }
  assertSubjectValidationShape(pkg, question, sourceName);
  assertSubjectAnchorRefs(pkg, sourceAnchorIds, evidenceAnchorIds, sourceName);

  const sourceQuestionAnchor = pkg.sourceAnchors.some((anchor) => (
    anchor.questionId === pkg.questionId || (anchor.locator.kind === "question_id" && anchor.locator.ref === pkg.questionId)
  ));
  if (!sourceQuestionAnchor) throw new Error(`${sourceName} requires a source anchor for the linked S203 question id`);

  if (pkg.release.status === "blocked" && !pkg.releaseBlockers.some((blocker) => blocker.status === "open" && blocker.severity === "blocking")) {
    throw new Error(`${sourceName}.release.status blocked requires at least one open blocking release blocker`);
  }
  assertReleaseRules(pkg, question, sourceName);
}

function loadQuestionsById(config: SecondRoundReferenceAnswerPackageRegistryConfig) {
  const canonicalRegistry = loadSecondRoundCanonicalQuestionRegistry({
    registryPath: config.canonicalQuestionRegistryPath,
    sourceRegistryPath: config.sourceRegistryPath,
    rightsRegistryPath: config.rightsRegistryPath,
    officialSourceRegistryPath: config.officialSourceRegistryPath,
    officialSyllabusPath: config.officialSyllabusPath,
    examRulesPath: config.examRulesPath,
    annualNoticePaths: config.annualNoticePaths,
    asOfDate: config.asOfDate,
  });
  return new Map(canonicalRegistry.questions.map((question) => [question.id, question]));
}

function validateRegistry(raw: unknown, config: SecondRoundReferenceAnswerPackageRegistryConfig): SecondRoundReferenceAnswerPackageRegistry {
  const sourceName = "appraiser_second_round_reference_answer_packages.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  const questionsById = loadQuestionsById(config);
  if (!Array.isArray(raw.packages)) throw new Error(`${sourceName}.packages must be an array`);
  const packages = raw.packages.map((entry, index) => validatePackage(entry, index, questionsById));
  assertUniqueIds(packages, sourceName);
  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(
      raw.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_reference_answer_package_registry"] as const,
    ),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    canonicalQuestionRegistryPath: assertString(raw.canonicalQuestionRegistryPath, "canonicalQuestionRegistryPath", sourceName, 300),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    boundaryPolicy: validateBoundaryPolicy(raw.boundaryPolicy, sourceName),
    packages,
  };
}

function countBy<T extends string>(values: readonly T[], possibleValues: readonly T[]): Record<T, number> {
  return possibleValues.reduce((counts, value) => {
    counts[value] = values.filter((entry) => entry === value).length;
    return counts;
  }, {} as Record<T, number>);
}

function subjectPackageCounts(packages: SecondRoundReferenceAnswerPackage[]) {
  return {
    practice: packages.filter((pkg) => pkg.subject === "practice").length,
    theory: packages.filter((pkg) => pkg.subject === "theory").length,
    law: packages.filter((pkg) => pkg.subject === "law").length,
  };
}

function openBlockingReleaseBlockerCount(pkg: SecondRoundReferenceAnswerPackage) {
  return pkg.releaseBlockers.filter((blocker) => blocker.status === "open" && blocker.severity === "blocking").length;
}

function unresolvedBlockingUncertaintyCount(pkg: SecondRoundReferenceAnswerPackage) {
  return pkg.uncertainty.filter((entry) => (
    entry.releaseBlocking && entry.resolutionStatus !== "resolved" && entry.resolutionStatus !== "accepted_as_alternative"
  )).length;
}

function isReleasable(pkg: SecondRoundReferenceAnswerPackage) {
  return pkg.release.status === "released"
    && openBlockingReleaseBlockerCount(pkg) === 0
    && unresolvedBlockingUncertaintyCount(pkg) === 0;
}

export function buildSecondRoundReferenceAnswerPackageReport(
  registry: SecondRoundReferenceAnswerPackageRegistry,
  config: SecondRoundReferenceAnswerPackageRegistryConfig = {},
): SecondRoundReferenceAnswerPackageReport {
  const packages = [...registry.packages].sort((left, right) => left.id.localeCompare(right.id));
  return {
    schemaVersion: registry.schemaVersion,
    reportType: "appraiser_second_round_reference_answer_package_report",
    generatedBy: "scripts/validate-second-round-reference-answer-packages.mjs",
    generatedAt: REPORT_GENERATED_AT,
    referencePackageRegistryPath: config.registryPath ?? DEFAULT_REGISTRY_PATH,
    canonicalQuestionRegistryPath: config.canonicalQuestionRegistryPath ?? registry.canonicalQuestionRegistryPath,
    storagePolicy: registry.storagePolicy,
    totals: {
      packageCount: packages.length,
      syntheticFixturePackageCount: packages.filter((pkg) => pkg.mode === "synthetic_fixture").length,
      releasedPackageCount: packages.filter((pkg) => pkg.release.status === "released").length,
      blockedPackageCount: packages.filter((pkg) => pkg.release.status === "blocked").length,
      releasablePackageCount: packages.filter(isReleasable).length,
      openBlockingReleaseBlockerCount: packages.reduce((sum, pkg) => sum + openBlockingReleaseBlockerCount(pkg), 0),
      unresolvedBlockingUncertaintyCount: packages.reduce((sum, pkg) => sum + unresolvedBlockingUncertaintyCount(pkg), 0),
      sourceAnchorCount: packages.reduce((sum, pkg) => sum + pkg.sourceAnchors.length, 0),
      evidenceAnchorCount: packages.reduce((sum, pkg) => sum + pkg.evidenceAnchors.length, 0),
      subjectPackageCounts: subjectPackageCounts(packages),
      releaseStatusCounts: countBy(packages.map((pkg) => pkg.release.status), RELEASE_STATUSES),
      learningReferenceStatusCounts: countBy(packages.map((pkg) => pkg.learningReference.status), LEARNING_REFERENCE_STATUSES),
    },
    packageIds: packages.map((pkg) => pkg.id),
    metadataOnly: true,
    safeUse: "s207_reference_answer_package_contract_only",
  };
}

export function loadSecondRoundReferenceAnswerPackageRegistry(
  config: SecondRoundReferenceAnswerPackageRegistryConfig = {},
): SecondRoundReferenceAnswerPackageRegistry {
  return validateRegistry(readJsonFile(resolveRepoPath(config.registryPath, DEFAULT_REGISTRY_PATH)), {
    ...config,
    canonicalQuestionRegistryPath: config.canonicalQuestionRegistryPath ?? DEFAULT_CANONICAL_QUESTION_REGISTRY_PATH,
  });
}

export function loadSecondRoundReferenceAnswerPackageReport(
  config: SecondRoundReferenceAnswerPackageRegistryConfig = {},
): SecondRoundReferenceAnswerPackageReport {
  const registry = loadSecondRoundReferenceAnswerPackageRegistry(config);
  const reportPath = resolveRepoPath(config.reportPath, DEFAULT_REPORT_PATH);
  const raw = readJsonFile(reportPath);
  assertNoForbiddenRawFields(raw, "appraiser_second_round_reference_answer_package_report.json");
  const expected = buildSecondRoundReferenceAnswerPackageReport(registry, config);
  if (JSON.stringify(raw) !== JSON.stringify(expected)) {
    throw new Error("appraiser_second_round_reference_answer_package_report.json is stale or nondeterministic; regenerate it with check:second-round-reference-answer-packages -- --write-report");
  }
  return expected;
}
