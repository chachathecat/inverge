import { readFileSync } from "node:fs";
import path from "node:path";

import {
  loadSecondRoundOfficialRegistryReference,
  type OfficialSubjectRecord,
} from "./official-syllabus-registry";
import {
  buildSecondRoundCoverageReport,
  getSecondRoundSourceS203ConsumptionGate,
  loadSecondRoundSourceRightsRegistry,
  type SecondRoundDisplayMode,
  type SecondRoundExtractionStatus,
  type SecondRoundRightsDecision,
  type SecondRoundRightsStatus,
  type SecondRoundSourceArtifact,
  type SecondRoundSubject,
} from "./second-round-source-rights-registry";

export type SecondRoundQuestionRegistryScope = "appraiser_second_round_only";
export type SecondRoundCanonicalQuestionMode = "source_skeleton" | "canonical_question";
export type SecondRoundRequirementOrigin =
  | "synthetic_fixture"
  | "not_committed_rights_blocked"
  | "metadata_only_descriptor";
export type SecondRoundProblemTextStatus =
  | "synthetic_fixture"
  | "not_extracted"
  | "needs_visual_check"
  | "verified"
  | "blocked_by_rights";
export type SecondRoundCanonicalVerificationStatus =
  | "synthetic_fixture"
  | "not_started"
  | "structure_draft"
  | "structure_verified"
  | "blocked";
export type SecondRoundReferenceAnswerVerificationStatus =
  | "not_started"
  | "blocked_by_s203_non_goal"
  | "blocked";
export type SecondRoundAssetKind = "table" | "image" | "formula" | "chart" | "attachment_region";
export type SecondRoundAssetExtractionStatus = "not_started" | "metadata_only" | "needs_visual_check" | "verified" | "blocked";
export type SecondRoundIssueCandidateKind = "law_issue" | "theory_concept" | "practice_assumption";
export type SecondRoundFormulaCandidateKind = "valuation_formula" | "unit_conversion" | "rounding_policy" | "time_adjustment";
export type SecondRoundCalculationCandidateKind = "deterministic_recalculation" | "unit_check" | "rounding_check" | "reverse_check";
export type SecondRoundEvidenceReviewStatus =
  | "eligible"
  | "blocked_by_rights"
  | "blocked_by_extraction"
  | "blocked_by_problem_text"
  | "blocked_by_canonical_verification"
  | "synthetic_fixture_only";
export type SecondRoundDeepReviewEstimateStatus = "estimated" | "not_applicable" | "blocked";

export type SecondRoundQuestionStoragePolicy = {
  metadataOnly: true;
  rawOfficialFileStored: false;
  rawQuestionTextStored: false;
  rawAnswerTextStored: false;
  rawOcrTextStored: false;
  rawTableTextStored: false;
  rawAssetBytesStored: false;
  learnerDataStored: false;
  thirdPartyAcademyContentStored: false;
};

export type SecondRoundQuestionRequirement = {
  origin: SecondRoundRequirementOrigin;
  descriptor?: string;
  textStored: false;
  verificationStatus: SecondRoundProblemTextStatus;
};

export type SecondRoundSubQuestion = {
  id: string;
  label: string;
  points: number;
  requirement: SecondRoundQuestionRequirement;
};

export type SecondRoundProblemTextMetadata = {
  status: SecondRoundProblemTextStatus;
  textStored: false;
  officialQuestionBodyStored: false;
  extractionStatus: SecondRoundExtractionStatus;
  verificationStatus: SecondRoundCanonicalVerificationStatus;
};

export type SecondRoundSourceLinkage = {
  sourceId: string;
  rightsStatus: SecondRoundRightsStatus;
  displayMode: SecondRoundDisplayMode;
  extractionStatus: SecondRoundExtractionStatus;
  metadataEligibleForS203: boolean;
  problemTextEligibleForS203: boolean;
  learnerPublicationEligible: boolean;
};

export type SecondRoundAssetMetadata = {
  assetId: string;
  kind: SecondRoundAssetKind;
  sourcePage?: number;
  regionRef?: string;
  extractionStatus: SecondRoundAssetExtractionStatus;
  verificationStatus: SecondRoundAssetExtractionStatus;
  rawBytesStored: false;
  rawTextStored: false;
};

export type SecondRoundIssueCandidate = {
  candidateId: string;
  kind: SecondRoundIssueCandidateKind;
  source: "synthetic_fixture" | "metadata_candidate" | "pending_subject_validator";
  confidence: "low" | "medium" | "high";
  validatorRequired: true;
};

export type SecondRoundFormulaCandidate = {
  formulaId: string;
  kind: SecondRoundFormulaCandidateKind;
  source: "synthetic_fixture" | "metadata_candidate" | "pending_s210_validator";
  unitCheckRequired: boolean;
  roundingCheckRequired: boolean;
};

export type SecondRoundCalculationCandidate = {
  candidateId: string;
  kind: SecondRoundCalculationCandidateKind;
  formulaId?: string;
  source: "synthetic_fixture" | "metadata_candidate" | "pending_s210_validator";
  independentRecalculationRequired: true;
};

export type SecondRoundGiiiRoutineMetadata = {
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineRequired: true;
  storedProgramDependencyAllowed: false;
  routineStatus: "not_applicable" | "candidate_metadata_only" | "blocked_pending_s210";
  formulaCandidateIds: string[];
};

export type SecondRoundEvidenceReviewEligibility = {
  eligible: boolean;
  status: SecondRoundEvidenceReviewStatus;
  reasonCodes: string[];
};

export type SecondRoundDeepReviewUnitEstimate = {
  status: SecondRoundDeepReviewEstimateStatus;
  estimatedUnits: 0 | 1 | 2;
  basis:
    | "not_applicable"
    | "sub_question_25_50_points"
    | "full_answer_100_minutes"
    | "blocked_until_reference_and_review_gates"
    | "synthetic_fixture";
  ledgerRequiredBeforeConsumption: true;
  consumptionImplemented: false;
};

export type SecondRoundCanonicalQuestionRecord = {
  id: string;
  mode: SecondRoundCanonicalQuestionMode;
  examYear: number;
  examRound: number;
  subject: SecondRoundSubject;
  officialSubjectId: string;
  officialSubjectLabelKo: string;
  questionNo: number;
  subQuestions: SecondRoundSubQuestion[];
  totalPoints: number;
  source: SecondRoundSourceLinkage;
  problemText: SecondRoundProblemTextMetadata;
  canonicalVerificationStatus: SecondRoundCanonicalVerificationStatus;
  referenceAnswerVerificationStatus: SecondRoundReferenceAnswerVerificationStatus;
  examDate?: string;
  lawEffectiveDate?: string;
  topicTags: string[];
  conceptNodeIds: string[];
  issueCandidates: SecondRoundIssueCandidate[];
  formulaCandidates: SecondRoundFormulaCandidate[];
  calculationCandidates: SecondRoundCalculationCandidate[];
  tableAssets: SecondRoundAssetMetadata[];
  giiiRoutine: SecondRoundGiiiRoutineMetadata;
  evidenceReview: SecondRoundEvidenceReviewEligibility;
  deepReviewUnitEstimate: SecondRoundDeepReviewUnitEstimate;
  learnerPublication: {
    allowed: boolean;
    reasonCodes: string[];
  };
};

export type SecondRoundCanonicalQuestionRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_canonical_question_registry";
  registryScope: SecondRoundQuestionRegistryScope;
  generatedBy: string;
  generatedAt: string;
  sourceRegistryPath: string;
  rightsRegistryPath: string;
  storagePolicy: SecondRoundQuestionStoragePolicy;
  boundaryPolicy: {
    syntheticFixturesOnly: boolean;
    officialQuestionBodiesStored: false;
    officialAnswerBodiesStored: false;
    referenceAnswersGenerated: false;
    ocrImplemented: false;
    billingOrLedgerImplemented: false;
    learnerAnswerSavingImplemented: false;
  };
  questions: SecondRoundCanonicalQuestionRecord[];
};

export type SecondRoundSourceSkeleton = {
  sourceId: string;
  examYear: number;
  examRound: number;
  subject: SecondRoundSubject;
  rightsStatus: SecondRoundRightsStatus;
  displayMode: SecondRoundDisplayMode;
  extractionStatus: SecondRoundExtractionStatus;
  metadataEligibleForS203: boolean;
  problemTextEligibleForS203: boolean;
  learnerPublicationEligible: boolean;
};

export type SecondRoundQuestionIngestionReport = {
  schemaVersion: string;
  reportType: "appraiser_second_round_canonical_question_ingestion_report";
  generatedBy: string;
  generatedAt: string;
  canonicalRegistryPath: string;
  sourceRegistryPath: string;
  rightsRegistryPath: string;
  storagePolicy: SecondRoundQuestionStoragePolicy;
  totals: {
    canonicalQuestionCount: number;
    sourceSkeletonCount: number;
    syntheticFixtureQuestionCount: number;
    evidenceReviewEligibleQuestionCount: number;
    learnerPublicationEligibleQuestionCount: number;
    blockedProblemTextQuestionCount: number;
    estimatedDeepReviewUnits: number;
    s202MetadataEligibleSourceCount: number;
    s202ProblemTextEligibleSourceCount: number;
    s202LearnerPublicationEligibleSourceCount: number;
    subjectQuestionCounts: Record<SecondRoundSubject, number>;
  };
  sourceSkeletons: SecondRoundSourceSkeleton[];
  questionIds: string[];
  metadataOnly: true;
  safeUse: "s203_canonical_question_ingestion_contract_only";
};

export type SecondRoundQuestionRegistryConfig = {
  registryPath?: string;
  ingestionReportPath?: string;
  sourceRegistryPath?: string;
  rightsRegistryPath?: string;
  officialSourceRegistryPath?: string;
  officialSyllabusPath?: string;
  examRulesPath?: string;
  annualNoticePaths?: string[];
  asOfDate?: string;
};

const DEFAULT_REGISTRY_PATH = "reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json";
const DEFAULT_REPORT_PATH = "reference_corpus/question_archive/second/appraiser_second_round_ingestion_report.json";
const REPORT_GENERATED_AT = "2026-06-26T00:00:00.000Z";

const SUBJECTS: readonly SecondRoundSubject[] = ["practice", "theory", "law"];
const REQUIREMENT_ORIGINS = ["synthetic_fixture", "not_committed_rights_blocked", "metadata_only_descriptor"] as const;
const QUESTION_MODES = ["source_skeleton", "canonical_question"] as const;
const PROBLEM_TEXT_STATUSES = ["synthetic_fixture", "not_extracted", "needs_visual_check", "verified", "blocked_by_rights"] as const;
const CANONICAL_VERIFICATION_STATUSES = ["synthetic_fixture", "not_started", "structure_draft", "structure_verified", "blocked"] as const;
const REFERENCE_ANSWER_STATUSES = ["not_started", "blocked_by_s203_non_goal", "blocked"] as const;
const ASSET_KINDS = ["table", "image", "formula", "chart", "attachment_region"] as const;
const ASSET_STATUSES = ["not_started", "metadata_only", "needs_visual_check", "verified", "blocked"] as const;
const ISSUE_CANDIDATE_KINDS = ["law_issue", "theory_concept", "practice_assumption"] as const;
const FORMULA_CANDIDATE_KINDS = ["valuation_formula", "unit_conversion", "rounding_policy", "time_adjustment"] as const;
const CALCULATION_CANDIDATE_KINDS = ["deterministic_recalculation", "unit_check", "rounding_check", "reverse_check"] as const;
const CANDIDATE_SOURCES = ["synthetic_fixture", "metadata_candidate", "pending_subject_validator"] as const;
const FORMULA_SOURCES = ["synthetic_fixture", "metadata_candidate", "pending_s210_validator"] as const;
const CONFIDENCE_VALUES = ["low", "medium", "high"] as const;
const EVIDENCE_REVIEW_STATUSES = [
  "eligible",
  "blocked_by_rights",
  "blocked_by_extraction",
  "blocked_by_problem_text",
  "blocked_by_canonical_verification",
  "synthetic_fixture_only",
] as const;
const DEEP_REVIEW_STATUSES = ["estimated", "not_applicable", "blocked"] as const;
const DEEP_REVIEW_BASES = [
  "not_applicable",
  "sub_question_25_50_points",
  "full_answer_100_minutes",
  "blocked_until_reference_and_review_gates",
  "synthetic_fixture",
] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,140}$/;
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
  "officialAnswer",
  "officialAnswerText",
  "officialAnswerBody",
  "modelAnswer",
  "officialModelAnswer",
  "sourceText",
  "sourceExcerpt",
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
  /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|pass\s+probability|model\s+answer|guaranteed\s+score|공식\s*채점|공식\s*점수|확정\s*점수|점수\s*예측|합격\s*확률|합격\s*가능성|합격\s*보장|공식\s*모범\s*답안|모범\s*답안|정답\s*보장)/i;

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

function assertString(value: unknown, fieldName: string, sourceName: string, maxLength = 260) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${fieldName} must be a non-empty string`);
  }
  if (value.length > maxLength) throw new Error(`${sourceName}.${fieldName} is too long for metadata-only use`);
  if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
    throw new Error(`${sourceName}.${fieldName} contains a prohibited official grading, model-answer, pass-probability, or guarantee claim`);
  }
  return value;
}

function assertOptionalString(value: unknown, fieldName: string, sourceName: string, maxLength = 260) {
  if (value === undefined) return undefined;
  return assertString(value, fieldName, sourceName, maxLength);
}

function assertId(value: unknown, fieldName: string, sourceName: string) {
  const id = assertString(value, fieldName, sourceName, 160);
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

function assertBoolean(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "boolean") throw new Error(`${sourceName}.${fieldName} must be boolean`);
  return value;
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName}.${fieldName} must be false`);
  return false;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertId(entry, `${fieldName}[${index}]`, sourceName));
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

function assertOptionalDate(value: unknown, fieldName: string, sourceName: string) {
  if (value === undefined) return undefined;
  return assertDate(value, fieldName, sourceName);
}

function assertIsoInstant(value: unknown, fieldName: string, sourceName: string) {
  const instant = assertString(value, fieldName, sourceName);
  if (!ISO_INSTANT_PATTERN.test(instant)) throw new Error(`${sourceName}.${fieldName} must be a deterministic ISO instant`);
  return instant;
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_CLAIM_PATTERN.test(value)) {
      throw new Error(`${sourceName} ${trail} contains a prohibited official grading, model-answer, pass-probability, or guarantee claim`);
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

function assertStoragePolicy(value: unknown, sourceName: string): SecondRoundQuestionStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
    rawOfficialFileStored: assertFalse(value.rawOfficialFileStored, "rawOfficialFileStored", `${sourceName}.storagePolicy`),
    rawQuestionTextStored: assertFalse(value.rawQuestionTextStored, "rawQuestionTextStored", `${sourceName}.storagePolicy`),
    rawAnswerTextStored: assertFalse(value.rawAnswerTextStored, "rawAnswerTextStored", `${sourceName}.storagePolicy`),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", `${sourceName}.storagePolicy`),
    rawTableTextStored: assertFalse(value.rawTableTextStored, "rawTableTextStored", `${sourceName}.storagePolicy`),
    rawAssetBytesStored: assertFalse(value.rawAssetBytesStored, "rawAssetBytesStored", `${sourceName}.storagePolicy`),
    learnerDataStored: assertFalse(value.learnerDataStored, "learnerDataStored", `${sourceName}.storagePolicy`),
    thirdPartyAcademyContentStored: assertFalse(value.thirdPartyAcademyContentStored, "thirdPartyAcademyContentStored", `${sourceName}.storagePolicy`),
  };
}

function assertUniqueIds(records: Array<{ id: string }>, sourceName: string) {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) throw new Error(`${sourceName} contains duplicate id ${record.id}`);
    seen.add(record.id);
  }
}

function assertUniqueCandidateIds(records: Array<{ candidateId?: string; formulaId?: string; assetId?: string }>, sourceName: string) {
  const ids = records.map((record) => record.candidateId ?? record.formulaId ?? record.assetId).filter((id): id is string => Boolean(id));
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate nested metadata id ${id}`);
    seen.add(id);
  }
}

function subjectSort(left: SecondRoundSubject, right: SecondRoundSubject) {
  return SUBJECTS.indexOf(left) - SUBJECTS.indexOf(right);
}

function sourceSort(left: SecondRoundSourceArtifact, right: SecondRoundSourceArtifact) {
  return left.examYear - right.examYear
    || left.examRound - right.examRound
    || subjectSort(left.subject, right.subject)
    || left.sourceId.localeCompare(right.sourceId);
}

function questionSort(left: SecondRoundCanonicalQuestionRecord, right: SecondRoundCanonicalQuestionRecord) {
  return left.examYear - right.examYear
    || left.examRound - right.examRound
    || subjectSort(left.subject, right.subject)
    || left.questionNo - right.questionNo
    || left.id.localeCompare(right.id);
}

function isSyntheticQuestion(question: SecondRoundCanonicalQuestionRecord) {
  return question.problemText.status === "synthetic_fixture"
    || question.canonicalVerificationStatus === "synthetic_fixture"
    || question.subQuestions.some((subQuestion) => subQuestion.requirement.origin === "synthetic_fixture");
}

function validateRequirement(raw: unknown, sourceName: string): SecondRoundQuestionRequirement {
  assertRecord(raw, sourceName);
  const origin = assertOneOf(raw.origin, "origin", sourceName, REQUIREMENT_ORIGINS) as SecondRoundRequirementOrigin;
  const textStored = assertFalse(raw.textStored, "textStored", sourceName);
  const verificationStatus = assertOneOf(raw.verificationStatus, "verificationStatus", sourceName, PROBLEM_TEXT_STATUSES) as SecondRoundProblemTextStatus;
  const descriptor = assertOptionalString(raw.descriptor, "descriptor", sourceName, 180);
  if (origin !== "synthetic_fixture" && descriptor !== undefined && descriptor.length > 120) {
    throw new Error(`${sourceName}.descriptor must remain short metadata when the origin is not synthetic_fixture`);
  }
  if (origin === "not_committed_rights_blocked" && verificationStatus === "verified") {
    throw new Error(`${sourceName} rights-blocked requirements cannot be verified`);
  }
  return {
    origin,
    ...(descriptor === undefined ? {} : { descriptor }),
    textStored,
    verificationStatus,
  };
}

function validateSubQuestion(raw: unknown, index: number, sourceName: string): SecondRoundSubQuestion {
  const subQuestionName = `${sourceName}.subQuestions[${index}]`;
  assertRecord(raw, subQuestionName);
  return {
    id: assertId(raw.id, "id", subQuestionName),
    label: assertString(raw.label, "label", subQuestionName, 40),
    points: assertInteger(raw.points, "points", subQuestionName, { min: 1, max: 100 }),
    requirement: validateRequirement(raw.requirement, `${subQuestionName}.requirement`),
  };
}

function validateProblemText(raw: unknown, sourceName: string): SecondRoundProblemTextMetadata {
  assertRecord(raw, sourceName);
  return {
    status: assertOneOf(raw.status, "status", sourceName, PROBLEM_TEXT_STATUSES) as SecondRoundProblemTextStatus,
    textStored: assertFalse(raw.textStored, "textStored", sourceName),
    officialQuestionBodyStored: assertFalse(raw.officialQuestionBodyStored, "officialQuestionBodyStored", sourceName),
    extractionStatus: assertOneOf(raw.extractionStatus, "extractionStatus", sourceName, [
      "not_started",
      "metadata_only",
      "extracted_private",
      "needs_visual_check",
      "blocked",
    ] as const) as SecondRoundExtractionStatus,
    verificationStatus: assertOneOf(
      raw.verificationStatus,
      "verificationStatus",
      sourceName,
      CANONICAL_VERIFICATION_STATUSES,
    ) as SecondRoundCanonicalVerificationStatus,
  };
}

function validateSourceLinkage(
  raw: unknown,
  sourceName: string,
  sourceArtifact: SecondRoundSourceArtifact,
  rightsDecision: SecondRoundRightsDecision,
): SecondRoundSourceLinkage {
  assertRecord(raw, sourceName);
  const sourceId = assertString(raw.sourceId, "sourceId", sourceName);
  if (sourceId !== sourceArtifact.sourceId) throw new Error(`${sourceName}.sourceId must match the linked S202 source artifact`);
  const gate = getSecondRoundSourceS203ConsumptionGate(sourceArtifact, rightsDecision);
  const linkage = {
    sourceId,
    rightsStatus: assertOneOf(raw.rightsStatus, "rightsStatus", sourceName, [
      "redistribution_allowed",
      "display_by_deep_link",
      "private_reference_only",
      "needs_legal_review",
    ] as const) as SecondRoundRightsStatus,
    displayMode: assertOneOf(raw.displayMode, "displayMode", sourceName, [
      "full_text",
      "official_file_embed",
      "metadata_and_link",
      "operator_only",
    ] as const) as SecondRoundDisplayMode,
    extractionStatus: assertOneOf(raw.extractionStatus, "extractionStatus", sourceName, [
      "not_started",
      "metadata_only",
      "extracted_private",
      "needs_visual_check",
      "blocked",
    ] as const) as SecondRoundExtractionStatus,
    metadataEligibleForS203: assertBoolean(raw.metadataEligibleForS203, "metadataEligibleForS203", sourceName),
    problemTextEligibleForS203: assertBoolean(raw.problemTextEligibleForS203, "problemTextEligibleForS203", sourceName),
    learnerPublicationEligible: assertBoolean(raw.learnerPublicationEligible, "learnerPublicationEligible", sourceName),
  };

  if (linkage.rightsStatus !== rightsDecision.rightsStatus) throw new Error(`${sourceName}.rightsStatus must match S202 rights decision`);
  if (linkage.displayMode !== rightsDecision.displayMode) throw new Error(`${sourceName}.displayMode must match S202 rights decision`);
  if (linkage.extractionStatus !== sourceArtifact.extractionStatus) throw new Error(`${sourceName}.extractionStatus must match S202 source extraction status`);
  if (linkage.metadataEligibleForS203 !== gate.metadataEligible) throw new Error(`${sourceName}.metadataEligibleForS203 must match the S202 S203-consumption gate`);
  if (linkage.problemTextEligibleForS203 !== gate.problemTextEligible) throw new Error(`${sourceName}.problemTextEligibleForS203 must match the S202 S203-consumption gate`);
  if (linkage.learnerPublicationEligible !== gate.learnerPublicationEligible) throw new Error(`${sourceName}.learnerPublicationEligible must match the S202 S203-consumption gate`);

  return linkage;
}

function validateAsset(raw: unknown, index: number, sourceName: string): SecondRoundAssetMetadata {
  const assetName = `${sourceName}.tableAssets[${index}]`;
  assertRecord(raw, assetName);
  const sourcePage = raw.sourcePage === undefined
    ? undefined
    : assertInteger(raw.sourcePage, "sourcePage", assetName, { min: 1, max: 1000 });
  return {
    assetId: assertId(raw.assetId, "assetId", assetName),
    kind: assertOneOf(raw.kind, "kind", assetName, ASSET_KINDS) as SecondRoundAssetKind,
    ...(sourcePage === undefined ? {} : { sourcePage }),
    ...(raw.regionRef === undefined ? {} : { regionRef: assertString(raw.regionRef, "regionRef", assetName, 80) }),
    extractionStatus: assertOneOf(raw.extractionStatus, "extractionStatus", assetName, ASSET_STATUSES) as SecondRoundAssetExtractionStatus,
    verificationStatus: assertOneOf(raw.verificationStatus, "verificationStatus", assetName, ASSET_STATUSES) as SecondRoundAssetExtractionStatus,
    rawBytesStored: assertFalse(raw.rawBytesStored, "rawBytesStored", assetName),
    rawTextStored: assertFalse(raw.rawTextStored, "rawTextStored", assetName),
  };
}

function validateIssueCandidate(raw: unknown, index: number, sourceName: string): SecondRoundIssueCandidate {
  const candidateName = `${sourceName}.issueCandidates[${index}]`;
  assertRecord(raw, candidateName);
  return {
    candidateId: assertId(raw.candidateId, "candidateId", candidateName),
    kind: assertOneOf(raw.kind, "kind", candidateName, ISSUE_CANDIDATE_KINDS) as SecondRoundIssueCandidateKind,
    source: assertOneOf(raw.source, "source", candidateName, CANDIDATE_SOURCES) as SecondRoundIssueCandidate["source"],
    confidence: assertOneOf(raw.confidence, "confidence", candidateName, CONFIDENCE_VALUES) as SecondRoundIssueCandidate["confidence"],
    validatorRequired: assertTrue(raw.validatorRequired, "validatorRequired", candidateName),
  };
}

function validateFormulaCandidate(raw: unknown, index: number, sourceName: string): SecondRoundFormulaCandidate {
  const candidateName = `${sourceName}.formulaCandidates[${index}]`;
  assertRecord(raw, candidateName);
  return {
    formulaId: assertId(raw.formulaId, "formulaId", candidateName),
    kind: assertOneOf(raw.kind, "kind", candidateName, FORMULA_CANDIDATE_KINDS) as SecondRoundFormulaCandidateKind,
    source: assertOneOf(raw.source, "source", candidateName, FORMULA_SOURCES) as SecondRoundFormulaCandidate["source"],
    unitCheckRequired: assertBoolean(raw.unitCheckRequired, "unitCheckRequired", candidateName),
    roundingCheckRequired: assertBoolean(raw.roundingCheckRequired, "roundingCheckRequired", candidateName),
  };
}

function validateCalculationCandidate(raw: unknown, index: number, sourceName: string): SecondRoundCalculationCandidate {
  const candidateName = `${sourceName}.calculationCandidates[${index}]`;
  assertRecord(raw, candidateName);
  return {
    candidateId: assertId(raw.candidateId, "candidateId", candidateName),
    kind: assertOneOf(raw.kind, "kind", candidateName, CALCULATION_CANDIDATE_KINDS) as SecondRoundCalculationCandidateKind,
    ...(raw.formulaId === undefined ? {} : { formulaId: assertId(raw.formulaId, "formulaId", candidateName) }),
    source: assertOneOf(raw.source, "source", candidateName, FORMULA_SOURCES) as SecondRoundCalculationCandidate["source"],
    independentRecalculationRequired: assertTrue(raw.independentRecalculationRequired, "independentRecalculationRequired", candidateName),
  };
}

function validateGiiiRoutine(raw: unknown, sourceName: string): SecondRoundGiiiRoutineMetadata {
  assertRecord(raw, sourceName);
  return {
    calculatorModel: assertOneOf(raw.calculatorModel, "calculatorModel", sourceName, ["casio_fx_9860giii"] as const),
    resetSafeHandKeyedRoutineRequired: assertTrue(raw.resetSafeHandKeyedRoutineRequired, "resetSafeHandKeyedRoutineRequired", sourceName),
    storedProgramDependencyAllowed: assertFalse(raw.storedProgramDependencyAllowed, "storedProgramDependencyAllowed", sourceName),
    routineStatus: assertOneOf(raw.routineStatus, "routineStatus", sourceName, [
      "not_applicable",
      "candidate_metadata_only",
      "blocked_pending_s210",
    ] as const),
    formulaCandidateIds: assertIdArray(raw.formulaCandidateIds, "formulaCandidateIds", sourceName),
  };
}

function validateEvidenceReview(raw: unknown, sourceName: string): SecondRoundEvidenceReviewEligibility {
  assertRecord(raw, sourceName);
  return {
    eligible: assertBoolean(raw.eligible, "eligible", sourceName),
    status: assertOneOf(raw.status, "status", sourceName, EVIDENCE_REVIEW_STATUSES) as SecondRoundEvidenceReviewStatus,
    reasonCodes: assertIdArray(raw.reasonCodes, "reasonCodes", sourceName),
  };
}

function validateDeepReviewEstimate(raw: unknown, sourceName: string): SecondRoundDeepReviewUnitEstimate {
  assertRecord(raw, sourceName);
  return {
    status: assertOneOf(raw.status, "status", sourceName, DEEP_REVIEW_STATUSES) as SecondRoundDeepReviewEstimateStatus,
    estimatedUnits: assertInteger(raw.estimatedUnits, "estimatedUnits", sourceName, { min: 0, max: 2 }) as 0 | 1 | 2,
    basis: assertOneOf(raw.basis, "basis", sourceName, DEEP_REVIEW_BASES) as SecondRoundDeepReviewUnitEstimate["basis"],
    ledgerRequiredBeforeConsumption: assertTrue(raw.ledgerRequiredBeforeConsumption, "ledgerRequiredBeforeConsumption", sourceName),
    consumptionImplemented: assertFalse(raw.consumptionImplemented, "consumptionImplemented", sourceName),
  };
}

function validateLearnerPublication(raw: unknown, sourceName: string) {
  assertRecord(raw, sourceName);
  return {
    allowed: assertBoolean(raw.allowed, "allowed", sourceName),
    reasonCodes: assertIdArray(raw.reasonCodes, "reasonCodes", sourceName),
  };
}

function assertQuestionBusinessRules(
  question: SecondRoundCanonicalQuestionRecord,
  sourceArtifact: SecondRoundSourceArtifact,
  subjectRecord: OfficialSubjectRecord,
  sourceName: string,
) {
  if (question.examYear !== sourceArtifact.examYear) throw new Error(`${sourceName}.examYear must match linked S202 source`);
  if (question.examRound !== sourceArtifact.examRound) throw new Error(`${sourceName}.examRound must match linked S202 source`);
  if (question.subject !== sourceArtifact.subject) throw new Error(`${sourceName}.subject must match linked S202 source`);
  if (question.officialSubjectId !== subjectRecord.id) throw new Error(`${sourceName}.officialSubjectId must match S201 official subject`);
  if (question.officialSubjectLabelKo !== subjectRecord.officialSubjectLabelKo) {
    throw new Error(`${sourceName}.officialSubjectLabelKo must match S201 official subject`);
  }

  const subPointTotal = question.subQuestions.reduce((sum, subQuestion) => sum + subQuestion.points, 0);
  if (subPointTotal !== question.totalPoints) {
    throw new Error(`${sourceName}.subQuestions points must sum to totalPoints`);
  }

  if (question.subject === "law" && !question.lawEffectiveDate) {
    throw new Error(`${sourceName}.lawEffectiveDate is required for law questions`);
  }
  if (question.lawEffectiveDate && !question.examDate) {
    throw new Error(`${sourceName}.examDate is required when lawEffectiveDate is present`);
  }
  if (question.examDate && question.lawEffectiveDate && question.lawEffectiveDate > question.examDate) {
    throw new Error(`${sourceName}.lawEffectiveDate must not be after examDate`);
  }
  if (question.subject !== "law" && question.lawEffectiveDate && sourceArtifact.lawEffectiveDate !== question.lawEffectiveDate) {
    throw new Error(`${sourceName}.lawEffectiveDate for non-law records must be explicitly supported by S202 source metadata`);
  }

  const isSynthetic = isSyntheticQuestion(question);
  if (!question.source.problemTextEligibleForS203 && question.problemText.status === "verified" && !isSynthetic) {
    throw new Error(`${sourceName} cannot verify problem text while S202 problemTextEligibleForS203 is false`);
  }
  if (!question.source.problemTextEligibleForS203 && question.problemText.status === "synthetic_fixture" && !isSynthetic) {
    throw new Error(`${sourceName} synthetic problem-text status requires a synthetic fixture record`);
  }
  if (question.source.rightsStatus !== "redistribution_allowed" && question.problemText.status === "verified") {
    throw new Error(`${sourceName} cannot verify problem text while rightsStatus is ${question.source.rightsStatus}`);
  }
  if (question.source.extractionStatus !== "extracted_private" && question.problemText.status === "verified") {
    throw new Error(`${sourceName} cannot verify problem text while extractionStatus is ${question.source.extractionStatus}`);
  }
  if (question.referenceAnswerVerificationStatus !== "not_started" && question.referenceAnswerVerificationStatus !== "blocked_by_s203_non_goal") {
    throw new Error(`${sourceName} must not release or verify reference answers in S203`);
  }

  if (question.evidenceReview.eligible) {
    if (question.evidenceReview.status !== "eligible" && question.evidenceReview.status !== "synthetic_fixture_only") {
      throw new Error(`${sourceName}.evidenceReview.status is incompatible with eligible=true`);
    }
    if (!isSynthetic && question.problemText.status !== "verified") {
      throw new Error(`${sourceName} cannot be Evidence Review eligible without verified problem text`);
    }
    if (!isSynthetic && question.canonicalVerificationStatus !== "structure_verified") {
      throw new Error(`${sourceName} cannot be Evidence Review eligible without structure verification`);
    }
  }
  if (!question.evidenceReview.eligible && question.evidenceReview.status === "eligible") {
    throw new Error(`${sourceName}.evidenceReview.status is incompatible with eligible=false`);
  }

  if (question.learnerPublication.allowed && !question.source.learnerPublicationEligible) {
    throw new Error(`${sourceName} learner publication is blocked by S202 rights/extraction gates`);
  }

  const formulaIds = new Set(question.formulaCandidates.map((candidate) => candidate.formulaId));
  for (const formulaId of question.giiiRoutine.formulaCandidateIds) {
    if (!formulaIds.has(formulaId)) throw new Error(`${sourceName}.giiiRoutine references unknown formulaCandidateId ${formulaId}`);
  }
  for (const candidate of question.calculationCandidates) {
    if (candidate.formulaId && !formulaIds.has(candidate.formulaId)) {
      throw new Error(`${sourceName}.calculationCandidates references unknown formulaId ${candidate.formulaId}`);
    }
  }
  if (question.subject === "practice" && question.calculationCandidates.length > 0) {
    if (question.giiiRoutine.calculatorModel !== "casio_fx_9860giii") {
      throw new Error(`${sourceName} practice calculation candidates must use casio_fx_9860giii`);
    }
    if (question.giiiRoutine.storedProgramDependencyAllowed) {
      throw new Error(`${sourceName} must not allow stored-program calculator dependency`);
    }
  }
  if (question.subject !== "practice" && question.giiiRoutine.routineStatus !== "not_applicable") {
    throw new Error(`${sourceName}.giiiRoutine must be not_applicable for non-practice subjects`);
  }

  if (question.deepReviewUnitEstimate.status === "estimated" && question.deepReviewUnitEstimate.estimatedUnits === 0) {
    throw new Error(`${sourceName}.deepReviewUnitEstimate estimated records must have units`);
  }
  if (question.deepReviewUnitEstimate.status !== "estimated" && question.deepReviewUnitEstimate.estimatedUnits !== 0) {
    throw new Error(`${sourceName}.deepReviewUnitEstimate units must be 0 unless status is estimated`);
  }
}

function validateQuestion(
  raw: unknown,
  index: number,
  sourcesById: Map<string, SecondRoundSourceArtifact>,
  rightsBySourceId: Map<string, SecondRoundRightsDecision>,
  subjectsByKey: Map<SecondRoundSubject, OfficialSubjectRecord>,
): SecondRoundCanonicalQuestionRecord {
  const sourceName = `canonical_questions.questions[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);

  const sourceRecord = raw.source;
  assertRecord(sourceRecord, `${sourceName}.source`);
  const sourceId = assertString(sourceRecord.sourceId, "sourceId", `${sourceName}.source`);
  const sourceArtifact = sourcesById.get(sourceId);
  if (!sourceArtifact) throw new Error(`${sourceName}.source.sourceId does not exist in S202 source registry`);
  const rightsDecision = rightsBySourceId.get(sourceId);
  if (!rightsDecision) throw new Error(`${sourceName}.source.sourceId has no S202 rights decision`);
  const subjectRecord = subjectsByKey.get(sourceArtifact.subject);
  if (!subjectRecord) throw new Error(`${sourceName}.subject does not resolve through S201 official subject records`);

  if (!Array.isArray(raw.subQuestions)) throw new Error(`${sourceName}.subQuestions must be an array`);
  const subQuestions = raw.subQuestions.map((entry, subQuestionIndex) => validateSubQuestion(entry, subQuestionIndex, sourceName));
  assertUniqueIds(subQuestions, `${sourceName}.subQuestions`);

  const issueCandidates = Array.isArray(raw.issueCandidates)
    ? raw.issueCandidates.map((entry, candidateIndex) => validateIssueCandidate(entry, candidateIndex, sourceName))
    : (() => { throw new Error(`${sourceName}.issueCandidates must be an array`); })();
  const formulaCandidates = Array.isArray(raw.formulaCandidates)
    ? raw.formulaCandidates.map((entry, candidateIndex) => validateFormulaCandidate(entry, candidateIndex, sourceName))
    : (() => { throw new Error(`${sourceName}.formulaCandidates must be an array`); })();
  const calculationCandidates = Array.isArray(raw.calculationCandidates)
    ? raw.calculationCandidates.map((entry, candidateIndex) => validateCalculationCandidate(entry, candidateIndex, sourceName))
    : (() => { throw new Error(`${sourceName}.calculationCandidates must be an array`); })();
  const tableAssets = Array.isArray(raw.tableAssets)
    ? raw.tableAssets.map((entry, assetIndex) => validateAsset(entry, assetIndex, sourceName))
    : (() => { throw new Error(`${sourceName}.tableAssets must be an array`); })();

  assertUniqueCandidateIds(issueCandidates, `${sourceName}.issueCandidates`);
  assertUniqueCandidateIds(formulaCandidates, `${sourceName}.formulaCandidates`);
  assertUniqueCandidateIds(calculationCandidates, `${sourceName}.calculationCandidates`);
  assertUniqueCandidateIds(tableAssets, `${sourceName}.tableAssets`);

  const question: SecondRoundCanonicalQuestionRecord = {
    id: assertId(raw.id, "id", sourceName),
    mode: assertOneOf(raw.mode, "mode", sourceName, QUESTION_MODES) as SecondRoundCanonicalQuestionMode,
    examYear: assertInteger(raw.examYear, "examYear", sourceName, { min: 1989, max: 2100 }),
    examRound: assertInteger(raw.examRound, "examRound", sourceName, { min: 1, max: 200 }),
    subject: assertOneOf(raw.subject, "subject", sourceName, SUBJECTS) as SecondRoundSubject,
    officialSubjectId: assertId(raw.officialSubjectId, "officialSubjectId", sourceName),
    officialSubjectLabelKo: assertString(raw.officialSubjectLabelKo, "officialSubjectLabelKo", sourceName),
    questionNo: assertInteger(raw.questionNo, "questionNo", sourceName, { min: 1, max: 20 }),
    subQuestions,
    totalPoints: assertInteger(raw.totalPoints, "totalPoints", sourceName, { min: 1, max: 100 }),
    source: validateSourceLinkage(raw.source, `${sourceName}.source`, sourceArtifact, rightsDecision),
    problemText: validateProblemText(raw.problemText, `${sourceName}.problemText`),
    canonicalVerificationStatus: assertOneOf(
      raw.canonicalVerificationStatus,
      "canonicalVerificationStatus",
      sourceName,
      CANONICAL_VERIFICATION_STATUSES,
    ) as SecondRoundCanonicalVerificationStatus,
    referenceAnswerVerificationStatus: assertOneOf(
      raw.referenceAnswerVerificationStatus,
      "referenceAnswerVerificationStatus",
      sourceName,
      REFERENCE_ANSWER_STATUSES,
    ) as SecondRoundReferenceAnswerVerificationStatus,
    examDate: assertOptionalDate(raw.examDate, "examDate", sourceName),
    lawEffectiveDate: assertOptionalDate(raw.lawEffectiveDate, "lawEffectiveDate", sourceName),
    topicTags: assertIdArray(raw.topicTags, "topicTags", sourceName),
    conceptNodeIds: assertIdArray(raw.conceptNodeIds, "conceptNodeIds", sourceName),
    issueCandidates,
    formulaCandidates,
    calculationCandidates,
    tableAssets,
    giiiRoutine: validateGiiiRoutine(raw.giiiRoutine, `${sourceName}.giiiRoutine`),
    evidenceReview: validateEvidenceReview(raw.evidenceReview, `${sourceName}.evidenceReview`),
    deepReviewUnitEstimate: validateDeepReviewEstimate(raw.deepReviewUnitEstimate, `${sourceName}.deepReviewUnitEstimate`),
    learnerPublication: validateLearnerPublication(raw.learnerPublication, `${sourceName}.learnerPublication`),
  };

  assertQuestionBusinessRules(question, sourceArtifact, subjectRecord, sourceName);
  return question;
}

function validateBoundaryPolicy(raw: unknown, sourceName: string): SecondRoundCanonicalQuestionRegistry["boundaryPolicy"] {
  assertRecord(raw, `${sourceName}.boundaryPolicy`);
  return {
    syntheticFixturesOnly: assertBoolean(raw.syntheticFixturesOnly, "syntheticFixturesOnly", `${sourceName}.boundaryPolicy`),
    officialQuestionBodiesStored: assertFalse(raw.officialQuestionBodiesStored, "officialQuestionBodiesStored", `${sourceName}.boundaryPolicy`),
    officialAnswerBodiesStored: assertFalse(raw.officialAnswerBodiesStored, "officialAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    referenceAnswersGenerated: assertFalse(raw.referenceAnswersGenerated, "referenceAnswersGenerated", `${sourceName}.boundaryPolicy`),
    ocrImplemented: assertFalse(raw.ocrImplemented, "ocrImplemented", `${sourceName}.boundaryPolicy`),
    billingOrLedgerImplemented: assertFalse(raw.billingOrLedgerImplemented, "billingOrLedgerImplemented", `${sourceName}.boundaryPolicy`),
    learnerAnswerSavingImplemented: assertFalse(raw.learnerAnswerSavingImplemented, "learnerAnswerSavingImplemented", `${sourceName}.boundaryPolicy`),
  };
}

function loadSubjectRecordsByKey(config: SecondRoundQuestionRegistryConfig) {
  const officialReference = loadSecondRoundOfficialRegistryReference({
    officialSourceRegistryPath: config.officialSourceRegistryPath,
    officialSyllabusPath: config.officialSyllabusPath,
    examRulesPath: config.examRulesPath,
    annualNoticePaths: config.annualNoticePaths,
    asOfDate: config.asOfDate,
  });
  const subjectsByKey = new Map<SecondRoundSubject, OfficialSubjectRecord>();
  for (const subject of officialReference.officialSyllabus.subjectRecords) {
    if (subject.status === "verified" && !subject.effectiveTo) {
      subjectsByKey.set(subject.subjectKey, subject);
    }
  }
  for (const subject of SUBJECTS) {
    if (!subjectsByKey.has(subject)) throw new Error(`S201 official subject record for ${subject} is missing`);
  }
  return subjectsByKey;
}

function loadSourceRights(config: SecondRoundQuestionRegistryConfig) {
  return loadSecondRoundSourceRightsRegistry({
    sourceRegistryPath: config.sourceRegistryPath,
    rightsRegistryPath: config.rightsRegistryPath,
    officialSourceRegistryPath: config.officialSourceRegistryPath,
  });
}

function validateCanonicalRegistry(raw: unknown, config: SecondRoundQuestionRegistryConfig): SecondRoundCanonicalQuestionRegistry {
  const sourceName = "appraiser_second_round_canonical_questions.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  const sourceRights = loadSourceRights(config);
  const sourcesById = new Map(sourceRights.sourceRegistry.sourceArtifacts.map((source) => [source.sourceId, source]));
  const subjectsByKey = loadSubjectRecordsByKey(config);

  if (!Array.isArray(raw.questions)) throw new Error(`${sourceName}.questions must be an array`);
  const questions = raw.questions.map((entry, index) => (
    validateQuestion(entry, index, sourcesById, sourceRights.rightsBySourceId, subjectsByKey)
  ));
  assertUniqueIds(questions, sourceName);

  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(
      raw.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_canonical_question_registry"] as const,
    ),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    sourceRegistryPath: assertString(raw.sourceRegistryPath, "sourceRegistryPath", sourceName, 300),
    rightsRegistryPath: assertString(raw.rightsRegistryPath, "rightsRegistryPath", sourceName, 300),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    boundaryPolicy: validateBoundaryPolicy(raw.boundaryPolicy, sourceName),
    questions,
  };
}

function buildSourceSkeleton(source: SecondRoundSourceArtifact, decision: SecondRoundRightsDecision): SecondRoundSourceSkeleton {
  const gate = getSecondRoundSourceS203ConsumptionGate(source, decision);
  return {
    sourceId: source.sourceId,
    examYear: source.examYear,
    examRound: source.examRound,
    subject: source.subject,
    rightsStatus: decision.rightsStatus,
    displayMode: decision.displayMode,
    extractionStatus: source.extractionStatus,
    metadataEligibleForS203: gate.metadataEligible,
    problemTextEligibleForS203: gate.problemTextEligible,
    learnerPublicationEligible: gate.learnerPublicationEligible,
  };
}

function subjectQuestionCounts(questions: SecondRoundCanonicalQuestionRecord[]) {
  return {
    practice: questions.filter((question) => question.subject === "practice").length,
    theory: questions.filter((question) => question.subject === "theory").length,
    law: questions.filter((question) => question.subject === "law").length,
  };
}

export function buildSecondRoundQuestionIngestionReport(
  registry: SecondRoundCanonicalQuestionRegistry,
  config: SecondRoundQuestionRegistryConfig = {},
): SecondRoundQuestionIngestionReport {
  const sourceRights = loadSourceRights(config);
  const sourceSkeletons = [...sourceRights.sourceRegistry.sourceArtifacts]
    .sort(sourceSort)
    .map((source) => {
      const decision = sourceRights.rightsBySourceId.get(source.sourceId);
      if (!decision) throw new Error(`Missing rights decision for ${source.sourceId}`);
      return buildSourceSkeleton(source, decision);
    });
  const coverageReport = buildSecondRoundCoverageReport(sourceRights, {
    sourceRegistryPath: config.sourceRegistryPath ?? registry.sourceRegistryPath,
    rightsRegistryPath: config.rightsRegistryPath ?? registry.rightsRegistryPath,
  });
  const questions = [...registry.questions].sort(questionSort);

  return {
    schemaVersion: registry.schemaVersion,
    reportType: "appraiser_second_round_canonical_question_ingestion_report",
    generatedBy: "scripts/validate-second-round-question-registry.mjs",
    generatedAt: REPORT_GENERATED_AT,
    canonicalRegistryPath: config.registryPath ?? DEFAULT_REGISTRY_PATH,
    sourceRegistryPath: config.sourceRegistryPath ?? registry.sourceRegistryPath,
    rightsRegistryPath: config.rightsRegistryPath ?? registry.rightsRegistryPath,
    storagePolicy: registry.storagePolicy,
    totals: {
      canonicalQuestionCount: questions.length,
      sourceSkeletonCount: sourceSkeletons.length,
      syntheticFixtureQuestionCount: questions.filter(isSyntheticQuestion).length,
      evidenceReviewEligibleQuestionCount: questions.filter((question) => question.evidenceReview.eligible).length,
      learnerPublicationEligibleQuestionCount: questions.filter((question) => question.learnerPublication.allowed).length,
      blockedProblemTextQuestionCount: questions.filter((question) => question.problemText.status === "blocked_by_rights").length,
      estimatedDeepReviewUnits: questions.reduce((sum, question) => sum + question.deepReviewUnitEstimate.estimatedUnits, 0),
      s202MetadataEligibleSourceCount: coverageReport.totals.metadataEligibleForS203Count,
      s202ProblemTextEligibleSourceCount: coverageReport.totals.problemTextEligibleForS203Count,
      s202LearnerPublicationEligibleSourceCount: coverageReport.totals.learnerPublicationEligibleCount,
      subjectQuestionCounts: subjectQuestionCounts(questions),
    },
    sourceSkeletons,
    questionIds: questions.map((question) => question.id),
    metadataOnly: true,
    safeUse: "s203_canonical_question_ingestion_contract_only",
  };
}

export function loadSecondRoundCanonicalQuestionRegistry(
  config: SecondRoundQuestionRegistryConfig = {},
): SecondRoundCanonicalQuestionRegistry {
  return validateCanonicalRegistry(readJsonFile(resolveRepoPath(config.registryPath, DEFAULT_REGISTRY_PATH)), config);
}

export function loadSecondRoundQuestionIngestionReport(
  config: SecondRoundQuestionRegistryConfig = {},
): SecondRoundQuestionIngestionReport {
  const registry = loadSecondRoundCanonicalQuestionRegistry(config);
  const reportPath = resolveRepoPath(config.ingestionReportPath, DEFAULT_REPORT_PATH);
  const raw = readJsonFile(reportPath);
  assertNoForbiddenRawFields(raw, "appraiser_second_round_ingestion_report.json");
  const expected = buildSecondRoundQuestionIngestionReport(registry, config);
  if (JSON.stringify(raw) !== JSON.stringify(expected)) {
    throw new Error("appraiser_second_round_ingestion_report.json is stale or nondeterministic; regenerate it with check:second-round-question-registry -- --write-report");
  }
  return expected;
}
