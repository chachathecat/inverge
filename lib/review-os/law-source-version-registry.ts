import { readFileSync } from "node:fs";
import path from "node:path";

import { RUBRIC_EVIDENCE_CONTRACT_VERSION } from "./rubric-evidence-contract";

export type LawSourceRegistryScope = "appraiser_second_round_law_only";
export type LawSourceKind =
  | "statute"
  | "enforcement_decree"
  | "enforcement_rule"
  | "case_law"
  | "administrative_rule"
  | "official_interpretation"
  | "exam_rule_reference";
export type LawSourceProvider =
  | "national_law_information_center"
  | "molit"
  | "qnet"
  | "court"
  | "synthetic_fixture";
export type LegalSourceStatus =
  | "verified"
  | "needs_official_verification"
  | "unresolved_conflict"
  | "blocked"
  | "synthetic_fixture";
export type LawVersionStatus =
  | "verified"
  | "needs_official_verification"
  | "unresolved_conflict"
  | "blocked"
  | "synthetic_fixture";
export type LawDateStatus =
  | "verified"
  | "needs_official_verification"
  | "not_applicable"
  | "unresolved_conflict"
  | "blocked"
  | "synthetic_fixture";
export type CurrentLawStatus =
  | "current_law_verified"
  | "current_law_unresolved"
  | "not_current"
  | "synthetic_fixture";
export type LawAliasKind = "current_title" | "former_title" | "short_title" | "rename_candidate";
export type LawAliasStatus = "verified" | "needs_official_verification" | "unresolved_conflict" | "synthetic_fixture";
export type LawSourceAnchorKind =
  | "law_source_identity"
  | "law_version"
  | "article_locator"
  | "case_locator"
  | "administrative_source"
  | "rename_alias"
  | "amendment_metadata";
export type LawAnchorLocatorKind =
  | "law_source_id"
  | "law_version_id"
  | "law_article_metadata"
  | "case_metadata"
  | "official_url"
  | "metadata_id";
export type LawExamDateVersionStatus =
  | "applicable_to_exam_date"
  | "needs_official_verification"
  | "unresolved_conflict"
  | "blocked"
  | "synthetic_fixture";
export type CurrentLawDivergenceStatus =
  | "same_as_exam_date"
  | "diverges_from_exam_date"
  | "current_law_unresolved"
  | "exam_date_version_unresolved"
  | "not_applicable"
  | "synthetic_fixture";
export type S211ReviewConfidenceStatus = "high_allowed" | "low_only" | "blocked";
export type S207PackageReleaseStatus =
  | "draft"
  | "blocked"
  | "cross_checked"
  | "source_verified"
  | "subject_validated"
  | "ready_for_s215"
  | "released";
export type S208PackageReleaseGateStatus =
  | "eligible_for_s215"
  | "needs_official_verification"
  | "blocked_by_legal_source";
export type S205LawSourceStatus = "verified" | "needs_verification" | "blocked" | "unresolved_conflict";
export type S205WithholdReason =
  | "official_rule_unverified"
  | "reference_package_unverified"
  | "unresolved_source_conflict"
  | "rights_blocked";
export type S205ReviewConfidence = "high" | "medium" | "low" | "blocked";
export type LegalSourceBlockerKind =
  | "missing_source_id"
  | "missing_source_provenance"
  | "missing_effective_date"
  | "missing_last_verified_at"
  | "exam_date_version_unresolved"
  | "current_law_divergence_unreviewed"
  | "unresolved_source_conflict"
  | "repeal_or_rename_unverified"
  | "raw_content_boundary"
  | "release_ready_blocked"
  | "reference_package_link_blocked"
  | "rubric_evidence_link_blocked"
  | "unsupported_legal_source";
export type LegalSourceBlockerStatus = "open" | "resolved";
export type LegalSourceBlockerSeverity = "blocking" | "warning";
export type LegalSourceBlockerResolver = "s208" | "s211" | "s214" | "s215" | "human_decision";

export type LawSourceStoragePolicy = {
  metadataOnly: true;
  rawStatuteTextStored: false;
  rawCaseTextStored: false;
  rawOfficialQuestionTextStored: false;
  rawOfficialAnswerTextStored: false;
  rawReferenceAnswerTextStored: false;
  rawLearnerAnswerStored: false;
  rawOcrTextStored: false;
  rawSourceExcerptStored: false;
  rawAssetBytesStored: false;
  thirdPartyAcademyContentStored: false;
};

export type LawSourceBoundaryPolicy = {
  syntheticFixturesOnly: boolean;
  statuteBodiesStored: false;
  caseBodiesStored: false;
  officialQuestionBodiesStored: false;
  officialAnswerBodiesStored: false;
  referenceAnswerBodiesStored: false;
  learnerAnswerBodiesStored: false;
  lawAnswerReviewEngineImplemented: false;
  referenceAnswerGenerationImplemented: false;
  billingOrLedgerImplemented: false;
  publicArchiveUiImplemented: false;
  instructorRuntimeRoutesChanged: false;
};

export type LawSourceAlias = {
  aliasId: string;
  labelKo: string;
  aliasKind: LawAliasKind;
  status: LawAliasStatus;
  effectiveFrom?: string;
  effectiveTo?: string;
  sourceStatus: LegalSourceStatus;
};

export type LawSourceProvenance = {
  provider: LawSourceProvider;
  officialUrl: string;
  officialSourceId?: string;
  status: LegalSourceStatus;
  lastVerifiedAt?: string;
  verificationNote: string;
};

export type LawVersionMetadata = {
  versionStatus: LawVersionStatus;
  effectiveDate?: string;
  effectiveDateStatus: LawDateStatus;
  amendedAt?: string;
  amendmentStatus: LawDateStatus;
  repealedAt?: string;
  repealStatus: LawDateStatus;
  renameStatus: LawDateStatus;
  currentLawStatus: CurrentLawStatus;
};

export type LawSourceDownstreamUse = {
  s211LawReviewInputAllowed: boolean;
  s214ReferenceGenerationInputAllowed: boolean;
  s215ReleaseGateInputAllowed: boolean;
  s207PackageReleaseAnchorAllowed: boolean;
  s205RubricEvidenceSourceAllowed: boolean;
  highConfidenceLegalReviewAllowed: boolean;
  blockUntilResolved: boolean;
};

export type LawSourceRecord = {
  sourceId: string;
  sourceKind: LawSourceKind;
  officialTitleKo: string;
  jurisdiction: "KR";
  subjectScope: readonly ["law"];
  sourceStatus: LegalSourceStatus;
  lastVerifiedAt?: string;
  provenance: LawSourceProvenance;
  aliases: LawSourceAlias[];
  versionMetadata: LawVersionMetadata;
  contentPolicy: LawSourceStoragePolicy;
  downstreamUse: LawSourceDownstreamUse;
  blockerIds: string[];
};

export type LawSourceAnchor = {
  anchorId: string;
  sourceId: string;
  anchorKind: LawSourceAnchorKind;
  locator: {
    kind: LawAnchorLocatorKind;
    ref: string;
    articleNo?: string;
    versionLabel?: string;
    rawTextStored: false;
    excerptStored: false;
    bodyTextStored: false;
  };
  legalSourceStatus: LegalSourceStatus;
  versionStatus: LawVersionStatus;
  effectiveDate?: string;
  verifiedAt?: string;
  blockerIds: string[];
  s207SourceAnchorKind: "law_source_version";
  s205SourceReferenceKind: "subject_validator";
  containsRawContent: false;
};

export type LegalSourceBlocker = {
  blockerId: string;
  kind: LegalSourceBlockerKind;
  status: LegalSourceBlockerStatus;
  severity: LegalSourceBlockerSeverity;
  summary: string;
  requiredResolver: LegalSourceBlockerResolver;
  sourceIds: string[];
  sourceAnchorIds: string[];
  referencePackageLinkIds: string[];
  evidenceReviewLinkIds: string[];
};

export type LawExamDateVersionCheck = {
  checkId: string;
  questionId?: string;
  examDate: string;
  lawEffectiveDate: string;
  sourceAnchorIds: string[];
  legalSourceStatus: LegalSourceStatus;
  examDateVersionStatus: LawExamDateVersionStatus;
  currentLawComparison: {
    status: CurrentLawDivergenceStatus;
    currentLawAnchorIds: string[];
    divergenceDisclosureRequired: boolean;
    currentLawClaimAllowed: boolean;
    examDateLawClaimAllowed: boolean;
  };
  releaseConfidence: {
    status: S211ReviewConfidenceStatus;
    s211HighConfidenceAllowed: boolean;
    s211ReviewAllowed: boolean;
    s214GenerationAllowed: boolean;
    s215ReleaseGateAllowed: boolean;
  };
  blockerIds: string[];
  s207ReferencePackageIds: string[];
  s205SourceReferenceIds: string[];
  metadataOnly: true;
};

export type ReferencePackageLawSourceLink = {
  linkId: string;
  referencePackageId: string;
  questionId?: string;
  packageReleaseStatus: S207PackageReleaseStatus;
  lawVersionAnchorIds: string[];
  legalSourceStatus: LegalSourceStatus;
  releaseGateStatus: S208PackageReleaseGateStatus;
  releaseReady: boolean;
  blockerIds: string[];
  containsRawContent: false;
};

export type EvidenceReviewLawSourceLink = {
  linkId: string;
  reviewContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  sourceVerificationRefId: string;
  lawVersionAnchorId: string;
  s205SourceStatus: S205LawSourceStatus;
  s205WithholdReasons: S205WithholdReason[];
  reviewConfidence: S205ReviewConfidence;
  blockerIds: string[];
  containsRawContent: false;
};

export type LawSourceVersionRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_law_source_version_registry";
  registryScope: LawSourceRegistryScope;
  generatedBy: string;
  generatedAt: string;
  canonicalQuestionRegistryPath: string;
  referenceAnswerPackageRegistryPath: string;
  rubricEvidenceContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  storagePolicy: LawSourceStoragePolicy;
  boundaryPolicy: LawSourceBoundaryPolicy;
  lawSources: LawSourceRecord[];
  sourceAnchors: LawSourceAnchor[];
  examDateVersionChecks: LawExamDateVersionCheck[];
  referencePackageLinks: ReferencePackageLawSourceLink[];
  evidenceReviewLinks: EvidenceReviewLawSourceLink[];
  blockers: LegalSourceBlocker[];
};

export type LawSourceVersionReport = {
  schemaVersion: string;
  reportType: "appraiser_second_round_law_source_version_report";
  generatedBy: string;
  generatedAt: string;
  lawSourceRegistryPath: string;
  canonicalQuestionRegistryPath: string;
  referenceAnswerPackageRegistryPath: string;
  rubricEvidenceContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  storagePolicy: LawSourceStoragePolicy;
  totals: {
    lawSourceCount: number;
    sourceAnchorCount: number;
    examDateVersionCheckCount: number;
    referencePackageLinkCount: number;
    evidenceReviewLinkCount: number;
    verifiedLawSourceCount: number;
    needsOfficialVerificationCount: number;
    unresolvedConflictCount: number;
    openBlockingBlockerCount: number;
    blockedReleasePackageLinkCount: number;
    highConfidenceReviewAllowedCheckCount: number;
    sourceStatusCounts: Record<LegalSourceStatus, number>;
    versionStatusCounts: Record<LawVersionStatus, number>;
    examDateVersionStatusCounts: Record<LawExamDateVersionStatus, number>;
    currentLawDivergenceStatusCounts: Record<CurrentLawDivergenceStatus, number>;
  };
  sourceIds: string[];
  sourceAnchorIds: string[];
  lawSourcesNeedingOfficialVerification: string[];
  lawSourcesWithOpenBlockers: string[];
  blockedReleasePackageLinkIds: string[];
  metadataOnly: true;
  safeUse: "s208_law_source_version_validation_only";
};

export type LawSourceVersionRegistryConfig = {
  registryPath?: string;
  reportPath?: string;
};

const DEFAULT_REGISTRY_PATH = "reference_corpus/legal_sources/appraiser_second_round_law_sources.json";
const DEFAULT_REPORT_PATH = "reference_corpus/legal_sources/appraiser_second_round_law_source_report.json";
const REPORT_GENERATED_AT = "2026-06-26T00:00:00.000Z";

const LEGAL_SOURCE_STATUSES = ["verified", "needs_official_verification", "unresolved_conflict", "blocked", "synthetic_fixture"] as const;
const LAW_VERSION_STATUSES = ["verified", "needs_official_verification", "unresolved_conflict", "blocked", "synthetic_fixture"] as const;
const LAW_DATE_STATUSES = ["verified", "needs_official_verification", "not_applicable", "unresolved_conflict", "blocked", "synthetic_fixture"] as const;
const CURRENT_LAW_STATUSES = ["current_law_verified", "current_law_unresolved", "not_current", "synthetic_fixture"] as const;
const SOURCE_KINDS = ["statute", "enforcement_decree", "enforcement_rule", "case_law", "administrative_rule", "official_interpretation", "exam_rule_reference"] as const;
const SOURCE_PROVIDERS = ["national_law_information_center", "molit", "qnet", "court", "synthetic_fixture"] as const;
const ALIAS_KINDS = ["current_title", "former_title", "short_title", "rename_candidate"] as const;
const ALIAS_STATUSES = ["verified", "needs_official_verification", "unresolved_conflict", "synthetic_fixture"] as const;
const ANCHOR_KINDS = ["law_source_identity", "law_version", "article_locator", "case_locator", "administrative_source", "rename_alias", "amendment_metadata"] as const;
const ANCHOR_LOCATOR_KINDS = ["law_source_id", "law_version_id", "law_article_metadata", "case_metadata", "official_url", "metadata_id"] as const;
const EXAM_DATE_VERSION_STATUSES = ["applicable_to_exam_date", "needs_official_verification", "unresolved_conflict", "blocked", "synthetic_fixture"] as const;
const CURRENT_LAW_DIVERGENCE_STATUSES = [
  "same_as_exam_date",
  "diverges_from_exam_date",
  "current_law_unresolved",
  "exam_date_version_unresolved",
  "not_applicable",
  "synthetic_fixture",
] as const;
const CONFIDENCE_STATUSES = ["high_allowed", "low_only", "blocked"] as const;
const PACKAGE_RELEASE_STATUSES = ["draft", "blocked", "cross_checked", "source_verified", "subject_validated", "ready_for_s215", "released"] as const;
const PACKAGE_RELEASE_GATE_STATUSES = ["eligible_for_s215", "needs_official_verification", "blocked_by_legal_source"] as const;
const S205_SOURCE_STATUSES = ["verified", "needs_verification", "blocked", "unresolved_conflict"] as const;
const S205_WITHHOLD_REASONS = ["official_rule_unverified", "reference_package_unverified", "unresolved_source_conflict", "rights_blocked"] as const;
const S205_REVIEW_CONFIDENCE = ["high", "medium", "low", "blocked"] as const;
const BLOCKER_KINDS = [
  "missing_source_id",
  "missing_source_provenance",
  "missing_effective_date",
  "missing_last_verified_at",
  "exam_date_version_unresolved",
  "current_law_divergence_unreviewed",
  "unresolved_source_conflict",
  "repeal_or_rename_unverified",
  "raw_content_boundary",
  "release_ready_blocked",
  "reference_package_link_blocked",
  "rubric_evidence_link_blocked",
  "unsupported_legal_source",
] as const;
const BLOCKER_STATUSES = ["open", "resolved"] as const;
const BLOCKER_SEVERITIES = ["blocking", "warning"] as const;
const BLOCKER_RESOLVERS = ["s208", "s211", "s214", "s215", "human_decision"] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,180}$/;
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
  "rawOcrText",
  "ocrText",
  "academyContent",
  "thirdPartyAcademyContent",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "assetBytes",
  "localFileName",
  "localFilePath",
  "rawFilePath",
]);
const FORBIDDEN_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|pass\s+probability|guaranteed\s+score|official\s+model\s+answer|공식\s*채점|공식\s*점수|확정\s*점수|합격\s*확률|합격\s*가능성|합격\s*보장|공식\s*모범\s*답안|정답\s*보장)/i;

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

function assertString(value: unknown, fieldName: string, sourceName: string, maxLength = 300) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${fieldName} must be a non-empty string`);
  }
  if (value.length > maxLength) throw new Error(`${sourceName}.${fieldName} is too long for metadata-only use`);
  if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
    throw new Error(`${sourceName}.${fieldName} contains a prohibited official grading, official-answer, pass-probability, or guarantee claim`);
  }
  return value;
}

function assertOptionalString(value: unknown, fieldName: string, sourceName: string, maxLength = 300) {
  if (value === undefined) return undefined;
  return assertString(value, fieldName, sourceName, maxLength);
}

function assertId(value: unknown, fieldName: string, sourceName: string) {
  const id = assertString(value, fieldName, sourceName, 200);
  if (!ID_PATTERN.test(id)) throw new Error(`${sourceName}.${fieldName} must be a stable lowercase metadata id`);
  return id;
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertId(entry, `${fieldName}[${index}]`, sourceName));
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertString(entry, `${fieldName}[${index}]`, sourceName));
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

function assertHttpsUrl(value: unknown, fieldName: string, sourceName: string) {
  const url = assertString(value, fieldName, sourceName, 600);
  if (!/^https:\/\//.test(url)) throw new Error(`${sourceName}.${fieldName} must be an HTTPS URL`);
  return url;
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_CLAIM_PATTERN.test(value)) {
      throw new Error(`${sourceName} ${trail} contains a prohibited official grading, official-answer, pass-probability, or guarantee claim`);
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

function assertStoragePolicy(value: unknown, sourceName: string): LawSourceStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
    rawStatuteTextStored: assertFalse(value.rawStatuteTextStored, "rawStatuteTextStored", `${sourceName}.storagePolicy`),
    rawCaseTextStored: assertFalse(value.rawCaseTextStored, "rawCaseTextStored", `${sourceName}.storagePolicy`),
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

function assertBoundaryPolicy(value: unknown, sourceName: string): LawSourceBoundaryPolicy {
  assertRecord(value, `${sourceName}.boundaryPolicy`);
  return {
    syntheticFixturesOnly: assertBoolean(value.syntheticFixturesOnly, "syntheticFixturesOnly", `${sourceName}.boundaryPolicy`),
    statuteBodiesStored: assertFalse(value.statuteBodiesStored, "statuteBodiesStored", `${sourceName}.boundaryPolicy`),
    caseBodiesStored: assertFalse(value.caseBodiesStored, "caseBodiesStored", `${sourceName}.boundaryPolicy`),
    officialQuestionBodiesStored: assertFalse(value.officialQuestionBodiesStored, "officialQuestionBodiesStored", `${sourceName}.boundaryPolicy`),
    officialAnswerBodiesStored: assertFalse(value.officialAnswerBodiesStored, "officialAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    referenceAnswerBodiesStored: assertFalse(value.referenceAnswerBodiesStored, "referenceAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    learnerAnswerBodiesStored: assertFalse(value.learnerAnswerBodiesStored, "learnerAnswerBodiesStored", `${sourceName}.boundaryPolicy`),
    lawAnswerReviewEngineImplemented: assertFalse(value.lawAnswerReviewEngineImplemented, "lawAnswerReviewEngineImplemented", `${sourceName}.boundaryPolicy`),
    referenceAnswerGenerationImplemented: assertFalse(
      value.referenceAnswerGenerationImplemented,
      "referenceAnswerGenerationImplemented",
      `${sourceName}.boundaryPolicy`,
    ),
    billingOrLedgerImplemented: assertFalse(value.billingOrLedgerImplemented, "billingOrLedgerImplemented", `${sourceName}.boundaryPolicy`),
    publicArchiveUiImplemented: assertFalse(value.publicArchiveUiImplemented, "publicArchiveUiImplemented", `${sourceName}.boundaryPolicy`),
    instructorRuntimeRoutesChanged: assertFalse(
      value.instructorRuntimeRoutesChanged,
      "instructorRuntimeRoutesChanged",
      `${sourceName}.boundaryPolicy`,
    ),
  };
}

function validateAlias(raw: unknown, index: number, sourceName: string): LawSourceAlias {
  const aliasName = `${sourceName}.aliases[${index}]`;
  assertRecord(raw, aliasName);
  return {
    aliasId: assertId(raw.aliasId, "aliasId", aliasName),
    labelKo: assertString(raw.labelKo, "labelKo", aliasName),
    aliasKind: assertOneOf(raw.aliasKind, "aliasKind", aliasName, ALIAS_KINDS) as LawAliasKind,
    status: assertOneOf(raw.status, "status", aliasName, ALIAS_STATUSES) as LawAliasStatus,
    effectiveFrom: assertOptionalDate(raw.effectiveFrom, "effectiveFrom", aliasName),
    effectiveTo: assertOptionalDate(raw.effectiveTo, "effectiveTo", aliasName),
    sourceStatus: assertOneOf(raw.sourceStatus, "sourceStatus", aliasName, LEGAL_SOURCE_STATUSES) as LegalSourceStatus,
  };
}

function validateProvenance(raw: unknown, sourceName: string): LawSourceProvenance {
  assertRecord(raw, `${sourceName}.provenance`);
  const status = assertOneOf(raw.status, "status", `${sourceName}.provenance`, LEGAL_SOURCE_STATUSES) as LegalSourceStatus;
  return {
    provider: assertOneOf(raw.provider, "provider", `${sourceName}.provenance`, SOURCE_PROVIDERS) as LawSourceProvider,
    officialUrl: assertHttpsUrl(raw.officialUrl, "officialUrl", `${sourceName}.provenance`),
    officialSourceId: assertOptionalString(raw.officialSourceId, "officialSourceId", `${sourceName}.provenance`),
    status,
    lastVerifiedAt: assertOptionalDate(raw.lastVerifiedAt, "lastVerifiedAt", `${sourceName}.provenance`),
    verificationNote: assertString(raw.verificationNote, "verificationNote", `${sourceName}.provenance`, 700),
  };
}

function validateVersionMetadata(raw: unknown, sourceName: string): LawVersionMetadata {
  assertRecord(raw, `${sourceName}.versionMetadata`);
  return {
    versionStatus: assertOneOf(raw.versionStatus, "versionStatus", `${sourceName}.versionMetadata`, LAW_VERSION_STATUSES) as LawVersionStatus,
    effectiveDate: assertOptionalDate(raw.effectiveDate, "effectiveDate", `${sourceName}.versionMetadata`),
    effectiveDateStatus: assertOneOf(raw.effectiveDateStatus, "effectiveDateStatus", `${sourceName}.versionMetadata`, LAW_DATE_STATUSES) as LawDateStatus,
    amendedAt: assertOptionalDate(raw.amendedAt, "amendedAt", `${sourceName}.versionMetadata`),
    amendmentStatus: assertOneOf(raw.amendmentStatus, "amendmentStatus", `${sourceName}.versionMetadata`, LAW_DATE_STATUSES) as LawDateStatus,
    repealedAt: assertOptionalDate(raw.repealedAt, "repealedAt", `${sourceName}.versionMetadata`),
    repealStatus: assertOneOf(raw.repealStatus, "repealStatus", `${sourceName}.versionMetadata`, LAW_DATE_STATUSES) as LawDateStatus,
    renameStatus: assertOneOf(raw.renameStatus, "renameStatus", `${sourceName}.versionMetadata`, LAW_DATE_STATUSES) as LawDateStatus,
    currentLawStatus: assertOneOf(raw.currentLawStatus, "currentLawStatus", `${sourceName}.versionMetadata`, CURRENT_LAW_STATUSES) as CurrentLawStatus,
  };
}

function validateDownstreamUse(raw: unknown, sourceName: string): LawSourceDownstreamUse {
  assertRecord(raw, `${sourceName}.downstreamUse`);
  return {
    s211LawReviewInputAllowed: assertBoolean(raw.s211LawReviewInputAllowed, "s211LawReviewInputAllowed", `${sourceName}.downstreamUse`),
    s214ReferenceGenerationInputAllowed: assertBoolean(
      raw.s214ReferenceGenerationInputAllowed,
      "s214ReferenceGenerationInputAllowed",
      `${sourceName}.downstreamUse`,
    ),
    s215ReleaseGateInputAllowed: assertBoolean(raw.s215ReleaseGateInputAllowed, "s215ReleaseGateInputAllowed", `${sourceName}.downstreamUse`),
    s207PackageReleaseAnchorAllowed: assertBoolean(
      raw.s207PackageReleaseAnchorAllowed,
      "s207PackageReleaseAnchorAllowed",
      `${sourceName}.downstreamUse`,
    ),
    s205RubricEvidenceSourceAllowed: assertBoolean(
      raw.s205RubricEvidenceSourceAllowed,
      "s205RubricEvidenceSourceAllowed",
      `${sourceName}.downstreamUse`,
    ),
    highConfidenceLegalReviewAllowed: assertBoolean(
      raw.highConfidenceLegalReviewAllowed,
      "highConfidenceLegalReviewAllowed",
      `${sourceName}.downstreamUse`,
    ),
    blockUntilResolved: assertBoolean(raw.blockUntilResolved, "blockUntilResolved", `${sourceName}.downstreamUse`),
  };
}

function validateLawSource(raw: unknown, index: number): LawSourceRecord {
  const sourceName = `appraiser_second_round_law_sources.lawSources[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  if (!Array.isArray(raw.aliases)) throw new Error(`${sourceName}.aliases must be an array`);
  const sourceStatus = assertOneOf(raw.sourceStatus, "sourceStatus", sourceName, LEGAL_SOURCE_STATUSES) as LegalSourceStatus;
  const source: LawSourceRecord = {
    sourceId: assertId(raw.sourceId, "sourceId", sourceName),
    sourceKind: assertOneOf(raw.sourceKind, "sourceKind", sourceName, SOURCE_KINDS) as LawSourceKind,
    officialTitleKo: assertString(raw.officialTitleKo, "officialTitleKo", sourceName),
    jurisdiction: assertOneOf(raw.jurisdiction, "jurisdiction", sourceName, ["KR"] as const),
    subjectScope: (() => {
      const scope = assertStringArray(raw.subjectScope, "subjectScope", sourceName);
      if (scope.length !== 1 || scope[0] !== "law") throw new Error(`${sourceName}.subjectScope must be exactly ["law"]`);
      return ["law"] as const;
    })(),
    sourceStatus,
    lastVerifiedAt: assertOptionalDate(raw.lastVerifiedAt, "lastVerifiedAt", sourceName),
    provenance: validateProvenance(raw.provenance, sourceName),
    aliases: raw.aliases.map((entry, aliasIndex) => validateAlias(entry, aliasIndex, sourceName)),
    versionMetadata: validateVersionMetadata(raw.versionMetadata, sourceName),
    contentPolicy: assertStoragePolicy(raw.contentPolicy, sourceName),
    downstreamUse: validateDownstreamUse(raw.downstreamUse, sourceName),
    blockerIds: assertIdArray(raw.blockerIds, "blockerIds", sourceName),
  };

  if (source.sourceStatus === "verified") {
    if (!source.lastVerifiedAt || !source.provenance.lastVerifiedAt) {
      throw new Error(`${sourceName} verified source status requires lastVerifiedAt and provenance.lastVerifiedAt`);
    }
    if (source.provenance.status !== "verified") {
      throw new Error(`${sourceName} verified source status requires verified source provenance`);
    }
  }
  if (source.versionMetadata.versionStatus === "verified") {
    if (source.sourceStatus !== "verified") throw new Error(`${sourceName} verified version status requires verified source status`);
    if (!source.versionMetadata.effectiveDate) throw new Error(`${sourceName} verified version status requires effectiveDate`);
    if (source.versionMetadata.effectiveDateStatus !== "verified") {
      throw new Error(`${sourceName} verified version status requires verified effectiveDateStatus`);
    }
    if (!source.lastVerifiedAt || !source.provenance.lastVerifiedAt) {
      throw new Error(`${sourceName} verified version status requires lastVerifiedAt and source provenance`);
    }
  }
  if ((source.sourceStatus === "blocked" || source.sourceStatus === "unresolved_conflict") && source.blockerIds.length === 0) {
    throw new Error(`${sourceName} blocked or unresolved source status requires blockerIds`);
  }
  if (source.blockerIds.length > 0 && !source.downstreamUse.blockUntilResolved) {
    throw new Error(`${sourceName}.downstreamUse.blockUntilResolved must be true while blockers remain`);
  }
  const downstreamAllowsRelease = source.downstreamUse.highConfidenceLegalReviewAllowed
    || source.downstreamUse.s207PackageReleaseAnchorAllowed
    || source.downstreamUse.s205RubricEvidenceSourceAllowed
    || source.downstreamUse.s211LawReviewInputAllowed
    || source.downstreamUse.s214ReferenceGenerationInputAllowed
    || source.downstreamUse.s215ReleaseGateInputAllowed;
  if (downstreamAllowsRelease && !isVerifiedLike(source.sourceStatus, source.versionMetadata.versionStatus)) {
    throw new Error(`${sourceName}.downstreamUse cannot allow review or release while source/version status is unresolved`);
  }
  return source;
}

function validateSourceAnchor(raw: unknown, index: number): LawSourceAnchor {
  const sourceName = `appraiser_second_round_law_sources.sourceAnchors[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  assertRecord(raw.locator, `${sourceName}.locator`);
  return {
    anchorId: assertId(raw.anchorId, "anchorId", sourceName),
    sourceId: assertId(raw.sourceId, "sourceId", sourceName),
    anchorKind: assertOneOf(raw.anchorKind, "anchorKind", sourceName, ANCHOR_KINDS) as LawSourceAnchorKind,
    locator: {
      kind: assertOneOf(raw.locator.kind, "kind", `${sourceName}.locator`, ANCHOR_LOCATOR_KINDS) as LawAnchorLocatorKind,
      ref: assertString(raw.locator.ref, "ref", `${sourceName}.locator`),
      articleNo: assertOptionalString(raw.locator.articleNo, "articleNo", `${sourceName}.locator`),
      versionLabel: assertOptionalString(raw.locator.versionLabel, "versionLabel", `${sourceName}.locator`),
      rawTextStored: assertFalse(raw.locator.rawTextStored, "rawTextStored", `${sourceName}.locator`),
      excerptStored: assertFalse(raw.locator.excerptStored, "excerptStored", `${sourceName}.locator`),
      bodyTextStored: assertFalse(raw.locator.bodyTextStored, "bodyTextStored", `${sourceName}.locator`),
    },
    legalSourceStatus: assertOneOf(raw.legalSourceStatus, "legalSourceStatus", sourceName, LEGAL_SOURCE_STATUSES) as LegalSourceStatus,
    versionStatus: assertOneOf(raw.versionStatus, "versionStatus", sourceName, LAW_VERSION_STATUSES) as LawVersionStatus,
    effectiveDate: assertOptionalDate(raw.effectiveDate, "effectiveDate", sourceName),
    verifiedAt: assertOptionalDate(raw.verifiedAt, "verifiedAt", sourceName),
    blockerIds: assertIdArray(raw.blockerIds, "blockerIds", sourceName),
    s207SourceAnchorKind: assertOneOf(raw.s207SourceAnchorKind, "s207SourceAnchorKind", sourceName, ["law_source_version"] as const),
    s205SourceReferenceKind: assertOneOf(raw.s205SourceReferenceKind, "s205SourceReferenceKind", sourceName, ["subject_validator"] as const),
    containsRawContent: assertFalse(raw.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateBlocker(raw: unknown, index: number): LegalSourceBlocker {
  const sourceName = `appraiser_second_round_law_sources.blockers[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  return {
    blockerId: assertId(raw.blockerId, "blockerId", sourceName),
    kind: assertOneOf(raw.kind, "kind", sourceName, BLOCKER_KINDS) as LegalSourceBlockerKind,
    status: assertOneOf(raw.status, "status", sourceName, BLOCKER_STATUSES) as LegalSourceBlockerStatus,
    severity: assertOneOf(raw.severity, "severity", sourceName, BLOCKER_SEVERITIES) as LegalSourceBlockerSeverity,
    summary: assertString(raw.summary, "summary", sourceName, 700),
    requiredResolver: assertOneOf(raw.requiredResolver, "requiredResolver", sourceName, BLOCKER_RESOLVERS) as LegalSourceBlockerResolver,
    sourceIds: assertIdArray(raw.sourceIds, "sourceIds", sourceName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", sourceName),
    referencePackageLinkIds: assertIdArray(raw.referencePackageLinkIds, "referencePackageLinkIds", sourceName),
    evidenceReviewLinkIds: assertIdArray(raw.evidenceReviewLinkIds, "evidenceReviewLinkIds", sourceName),
  };
}

function validateExamDateVersionCheck(raw: unknown, index: number): LawExamDateVersionCheck {
  const sourceName = `appraiser_second_round_law_sources.examDateVersionChecks[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  assertRecord(raw.currentLawComparison, `${sourceName}.currentLawComparison`);
  assertRecord(raw.releaseConfidence, `${sourceName}.releaseConfidence`);
  return {
    checkId: assertId(raw.checkId, "checkId", sourceName),
    questionId: assertOptionalString(raw.questionId, "questionId", sourceName),
    examDate: assertDate(raw.examDate, "examDate", sourceName),
    lawEffectiveDate: assertDate(raw.lawEffectiveDate, "lawEffectiveDate", sourceName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", sourceName),
    legalSourceStatus: assertOneOf(raw.legalSourceStatus, "legalSourceStatus", sourceName, LEGAL_SOURCE_STATUSES) as LegalSourceStatus,
    examDateVersionStatus: assertOneOf(
      raw.examDateVersionStatus,
      "examDateVersionStatus",
      sourceName,
      EXAM_DATE_VERSION_STATUSES,
    ) as LawExamDateVersionStatus,
    currentLawComparison: {
      status: assertOneOf(
        raw.currentLawComparison.status,
        "status",
        `${sourceName}.currentLawComparison`,
        CURRENT_LAW_DIVERGENCE_STATUSES,
      ) as CurrentLawDivergenceStatus,
      currentLawAnchorIds: assertIdArray(raw.currentLawComparison.currentLawAnchorIds, "currentLawAnchorIds", `${sourceName}.currentLawComparison`),
      divergenceDisclosureRequired: assertBoolean(
        raw.currentLawComparison.divergenceDisclosureRequired,
        "divergenceDisclosureRequired",
        `${sourceName}.currentLawComparison`,
      ),
      currentLawClaimAllowed: assertBoolean(raw.currentLawComparison.currentLawClaimAllowed, "currentLawClaimAllowed", `${sourceName}.currentLawComparison`),
      examDateLawClaimAllowed: assertBoolean(
        raw.currentLawComparison.examDateLawClaimAllowed,
        "examDateLawClaimAllowed",
        `${sourceName}.currentLawComparison`,
      ),
    },
    releaseConfidence: {
      status: assertOneOf(raw.releaseConfidence.status, "status", `${sourceName}.releaseConfidence`, CONFIDENCE_STATUSES) as S211ReviewConfidenceStatus,
      s211HighConfidenceAllowed: assertBoolean(
        raw.releaseConfidence.s211HighConfidenceAllowed,
        "s211HighConfidenceAllowed",
        `${sourceName}.releaseConfidence`,
      ),
      s211ReviewAllowed: assertBoolean(raw.releaseConfidence.s211ReviewAllowed, "s211ReviewAllowed", `${sourceName}.releaseConfidence`),
      s214GenerationAllowed: assertBoolean(raw.releaseConfidence.s214GenerationAllowed, "s214GenerationAllowed", `${sourceName}.releaseConfidence`),
      s215ReleaseGateAllowed: assertBoolean(raw.releaseConfidence.s215ReleaseGateAllowed, "s215ReleaseGateAllowed", `${sourceName}.releaseConfidence`),
    },
    blockerIds: assertIdArray(raw.blockerIds, "blockerIds", sourceName),
    s207ReferencePackageIds: assertIdArray(raw.s207ReferencePackageIds, "s207ReferencePackageIds", sourceName),
    s205SourceReferenceIds: assertIdArray(raw.s205SourceReferenceIds, "s205SourceReferenceIds", sourceName),
    metadataOnly: assertTrue(raw.metadataOnly, "metadataOnly", sourceName),
  };
}

function validateReferencePackageLink(raw: unknown, index: number): ReferencePackageLawSourceLink {
  const sourceName = `appraiser_second_round_law_sources.referencePackageLinks[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  return {
    linkId: assertId(raw.linkId, "linkId", sourceName),
    referencePackageId: assertId(raw.referencePackageId, "referencePackageId", sourceName),
    questionId: assertOptionalString(raw.questionId, "questionId", sourceName),
    packageReleaseStatus: assertOneOf(raw.packageReleaseStatus, "packageReleaseStatus", sourceName, PACKAGE_RELEASE_STATUSES) as S207PackageReleaseStatus,
    lawVersionAnchorIds: assertIdArray(raw.lawVersionAnchorIds, "lawVersionAnchorIds", sourceName),
    legalSourceStatus: assertOneOf(raw.legalSourceStatus, "legalSourceStatus", sourceName, LEGAL_SOURCE_STATUSES) as LegalSourceStatus,
    releaseGateStatus: assertOneOf(raw.releaseGateStatus, "releaseGateStatus", sourceName, PACKAGE_RELEASE_GATE_STATUSES) as S208PackageReleaseGateStatus,
    releaseReady: assertBoolean(raw.releaseReady, "releaseReady", sourceName),
    blockerIds: assertIdArray(raw.blockerIds, "blockerIds", sourceName),
    containsRawContent: assertFalse(raw.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateEvidenceReviewLink(raw: unknown, index: number): EvidenceReviewLawSourceLink {
  const sourceName = `appraiser_second_round_law_sources.evidenceReviewLinks[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  return {
    linkId: assertId(raw.linkId, "linkId", sourceName),
    reviewContractVersion: assertOneOf(
      raw.reviewContractVersion,
      "reviewContractVersion",
      sourceName,
      [RUBRIC_EVIDENCE_CONTRACT_VERSION] as const,
    ),
    sourceVerificationRefId: assertId(raw.sourceVerificationRefId, "sourceVerificationRefId", sourceName),
    lawVersionAnchorId: assertId(raw.lawVersionAnchorId, "lawVersionAnchorId", sourceName),
    s205SourceStatus: assertOneOf(raw.s205SourceStatus, "s205SourceStatus", sourceName, S205_SOURCE_STATUSES) as S205LawSourceStatus,
    s205WithholdReasons: (() => {
      if (!Array.isArray(raw.s205WithholdReasons)) throw new Error(`${sourceName}.s205WithholdReasons must be an array`);
      return raw.s205WithholdReasons.map((entry, reasonIndex) => (
        assertOneOf(entry, `s205WithholdReasons[${reasonIndex}]`, sourceName, S205_WITHHOLD_REASONS) as S205WithholdReason
      ));
    })(),
    reviewConfidence: assertOneOf(raw.reviewConfidence, "reviewConfidence", sourceName, S205_REVIEW_CONFIDENCE) as S205ReviewConfidence,
    blockerIds: assertIdArray(raw.blockerIds, "blockerIds", sourceName),
    containsRawContent: assertFalse(raw.containsRawContent, "containsRawContent", sourceName),
  };
}

function isVerifiedLike(sourceStatus: LegalSourceStatus, versionStatus?: LawVersionStatus | LawExamDateVersionStatus) {
  if (sourceStatus === "synthetic_fixture") return versionStatus === undefined || versionStatus === "synthetic_fixture";
  return sourceStatus === "verified" && (versionStatus === undefined || versionStatus === "verified" || versionStatus === "applicable_to_exam_date");
}

function hasOpenBlockingBlockers(blockerIds: readonly string[], blockersById: ReadonlyMap<string, LegalSourceBlocker>) {
  return blockerIds.some((blockerId) => {
    const blocker = blockersById.get(blockerId);
    return blocker?.status === "open" && blocker.severity === "blocking";
  });
}

function assertUniqueIds(ids: readonly string[], sourceName: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function assertKnownIds(ids: readonly string[], knownIds: ReadonlySet<string>, fieldName: string, sourceName: string) {
  for (const id of ids) {
    if (!knownIds.has(id)) throw new Error(`${sourceName}.${fieldName} references unknown id ${id}`);
  }
}

function assertAnchorBusinessRules(
  anchor: LawSourceAnchor,
  sourcesById: ReadonlyMap<string, LawSourceRecord>,
  blockersById: ReadonlyMap<string, LegalSourceBlocker>,
  sourceName: string,
) {
  const source = sourcesById.get(anchor.sourceId);
  if (!source) throw new Error(`${sourceName}.sourceId references unknown law source ${anchor.sourceId}`);
  if (anchor.locator.kind === "law_source_id" && anchor.locator.ref !== anchor.sourceId) {
    throw new Error(`${sourceName}.locator.ref must match sourceId for law_source_id locators`);
  }
  if (anchor.legalSourceStatus === "verified") {
    if (!anchor.verifiedAt || !anchor.effectiveDate) {
      throw new Error(`${sourceName} verified legal source anchors require verifiedAt and effectiveDate`);
    }
    if (!isVerifiedLike(source.sourceStatus, source.versionMetadata.versionStatus)) {
      throw new Error(`${sourceName} cannot be verified while linked source/version status is unresolved`);
    }
  }
  if (anchor.versionStatus === "verified" && !anchor.effectiveDate) {
    throw new Error(`${sourceName} verified version anchors require effectiveDate`);
  }
  if (hasOpenBlockingBlockers(anchor.blockerIds, blockersById) && isVerifiedLike(anchor.legalSourceStatus, anchor.versionStatus)) {
    throw new Error(`${sourceName} cannot be verified while open blocking legal-source blockers remain`);
  }
}

function assertExamDateVersionRules(
  check: LawExamDateVersionCheck,
  anchorsById: ReadonlyMap<string, LawSourceAnchor>,
  blockersById: ReadonlyMap<string, LegalSourceBlocker>,
  sourceName: string,
) {
  if (check.lawEffectiveDate > check.examDate) throw new Error(`${sourceName}.lawEffectiveDate must not be after examDate`);
  assertKnownIds(check.sourceAnchorIds, new Set(anchorsById.keys()), "sourceAnchorIds", sourceName);
  assertKnownIds(check.currentLawComparison.currentLawAnchorIds, new Set(anchorsById.keys()), "currentLawComparison.currentLawAnchorIds", sourceName);
  if (check.sourceAnchorIds.length === 0) throw new Error(`${sourceName}.sourceAnchorIds must not be empty`);

  const linkedAnchors = check.sourceAnchorIds.map((anchorId) => anchorsById.get(anchorId)).filter((anchor): anchor is LawSourceAnchor => Boolean(anchor));
  const anchorsVerified = linkedAnchors.every((anchor) => isVerifiedLike(anchor.legalSourceStatus, anchor.versionStatus));
  const hasBlocking = hasOpenBlockingBlockers(check.blockerIds, blockersById);

  if (check.examDateVersionStatus === "applicable_to_exam_date" && (!isVerifiedLike(check.legalSourceStatus, check.examDateVersionStatus) || !anchorsVerified)) {
    throw new Error(`${sourceName} applicable exam-date version requires verified legal source status and verified anchors`);
  }
  if (
    check.currentLawComparison.currentLawClaimAllowed
    && check.examDateVersionStatus !== "applicable_to_exam_date"
    && check.examDateVersionStatus !== "synthetic_fixture"
  ) {
    throw new Error(`${sourceName} must not allow current-law claims while exam-date law version is unresolved`);
  }
  if (check.currentLawComparison.examDateLawClaimAllowed && !isVerifiedLike(check.legalSourceStatus, check.examDateVersionStatus)) {
    throw new Error(`${sourceName} must not allow exam-date legal claims without verified source/effective-date status`);
  }
  if (check.currentLawComparison.status === "diverges_from_exam_date" && !check.currentLawComparison.divergenceDisclosureRequired) {
    throw new Error(`${sourceName} current-law divergence requires explicit learner-facing disclosure`);
  }
  if (
    hasBlocking
    || check.legalSourceStatus === "needs_official_verification"
    || check.legalSourceStatus === "unresolved_conflict"
    || check.legalSourceStatus === "blocked"
  ) {
    if (check.releaseConfidence.status === "high_allowed" || check.releaseConfidence.s211HighConfidenceAllowed || check.releaseConfidence.s215ReleaseGateAllowed) {
      throw new Error(`${sourceName} unresolved legal-source blockers must block high-confidence review and release gates`);
    }
  }
}

function assertPackageLinkRules(
  link: ReferencePackageLawSourceLink,
  anchorsById: ReadonlyMap<string, LawSourceAnchor>,
  blockersById: ReadonlyMap<string, LegalSourceBlocker>,
  sourceName: string,
) {
  assertKnownIds(link.lawVersionAnchorIds, new Set(anchorsById.keys()), "lawVersionAnchorIds", sourceName);
  if (link.lawVersionAnchorIds.length === 0) throw new Error(`${sourceName}.lawVersionAnchorIds must not be empty`);
  const linkedAnchors = link.lawVersionAnchorIds.map((anchorId) => anchorsById.get(anchorId)).filter((anchor): anchor is LawSourceAnchor => Boolean(anchor));
  const anchorsVerified = linkedAnchors.every((anchor) => isVerifiedLike(anchor.legalSourceStatus, anchor.versionStatus));
  const hasBlocking = hasOpenBlockingBlockers(link.blockerIds, blockersById);
  const releaseReadyIntent = link.releaseReady || link.packageReleaseStatus === "ready_for_s215" || link.packageReleaseStatus === "released";
  if (releaseReadyIntent && (hasBlocking || !isVerifiedLike(link.legalSourceStatus) || !anchorsVerified)) {
    throw new Error(`${sourceName} release-ready package links require verified legal sources and no open legal-source blockers`);
  }
  if (releaseReadyIntent && link.releaseGateStatus !== "eligible_for_s215") {
    throw new Error(`${sourceName}.releaseGateStatus must be eligible_for_s215 for release-ready package links`);
  }
}

function assertEvidenceLinkRules(
  link: EvidenceReviewLawSourceLink,
  anchorsById: ReadonlyMap<string, LawSourceAnchor>,
  blockersById: ReadonlyMap<string, LegalSourceBlocker>,
  sourceName: string,
) {
  const anchor = anchorsById.get(link.lawVersionAnchorId);
  if (!anchor) throw new Error(`${sourceName}.lawVersionAnchorId references unknown law version anchor`);
  const legalSourceVerified = isVerifiedLike(anchor.legalSourceStatus, anchor.versionStatus);
  const hasBlocking = hasOpenBlockingBlockers(link.blockerIds, blockersById) || hasOpenBlockingBlockers(anchor.blockerIds, blockersById);
  if (link.s205SourceStatus === "verified" && !legalSourceVerified) {
    throw new Error(`${sourceName}.s205SourceStatus cannot be verified while linked legal source is unresolved`);
  }
  if (link.reviewConfidence === "high" && (hasBlocking || !legalSourceVerified)) {
    throw new Error(`${sourceName}.reviewConfidence high requires verified legal source and no open blockers`);
  }
  if (link.s205SourceStatus !== "verified" && link.s205WithholdReasons.length === 0) {
    throw new Error(`${sourceName}.s205WithholdReasons must explain unresolved legal-source status`);
  }
}

function assertRegistryBusinessRules(registry: LawSourceVersionRegistry) {
  const sourceIds = new Set(registry.lawSources.map((source) => source.sourceId));
  const anchorIds = new Set(registry.sourceAnchors.map((anchor) => anchor.anchorId));
  const blockerIds = new Set(registry.blockers.map((blocker) => blocker.blockerId));
  const packageLinkIds = new Set(registry.referencePackageLinks.map((link) => link.linkId));
  const evidenceLinkIds = new Set(registry.evidenceReviewLinks.map((link) => link.linkId));
  const sourcesById = new Map(registry.lawSources.map((source) => [source.sourceId, source]));
  const anchorsById = new Map(registry.sourceAnchors.map((anchor) => [anchor.anchorId, anchor]));
  const blockersById = new Map(registry.blockers.map((blocker) => [blocker.blockerId, blocker]));

  assertUniqueIds([...sourceIds], "appraiser_second_round_law_sources.lawSources");
  assertUniqueIds([...anchorIds], "appraiser_second_round_law_sources.sourceAnchors");
  assertUniqueIds([...blockerIds], "appraiser_second_round_law_sources.blockers");
  assertUniqueIds([...packageLinkIds], "appraiser_second_round_law_sources.referencePackageLinks");
  assertUniqueIds([...evidenceLinkIds], "appraiser_second_round_law_sources.evidenceReviewLinks");

  registry.lawSources.forEach((source, index) => {
    const sourceName = `appraiser_second_round_law_sources.lawSources[${index}]`;
    assertKnownIds(source.blockerIds, blockerIds, "blockerIds", sourceName);
  });
  registry.sourceAnchors.forEach((anchor, index) => {
    const sourceName = `appraiser_second_round_law_sources.sourceAnchors[${index}]`;
    assertKnownIds(anchor.blockerIds, blockerIds, "blockerIds", sourceName);
    assertAnchorBusinessRules(anchor, sourcesById, blockersById, sourceName);
  });
  registry.blockers.forEach((blocker, index) => {
    const sourceName = `appraiser_second_round_law_sources.blockers[${index}]`;
    assertKnownIds(blocker.sourceIds, sourceIds, "sourceIds", sourceName);
    assertKnownIds(blocker.sourceAnchorIds, anchorIds, "sourceAnchorIds", sourceName);
    assertKnownIds(blocker.referencePackageLinkIds, packageLinkIds, "referencePackageLinkIds", sourceName);
    assertKnownIds(blocker.evidenceReviewLinkIds, evidenceLinkIds, "evidenceReviewLinkIds", sourceName);
  });
  registry.examDateVersionChecks.forEach((check, index) => {
    const sourceName = `appraiser_second_round_law_sources.examDateVersionChecks[${index}]`;
    assertKnownIds(check.blockerIds, blockerIds, "blockerIds", sourceName);
    assertExamDateVersionRules(check, anchorsById, blockersById, sourceName);
  });
  registry.referencePackageLinks.forEach((link, index) => {
    const sourceName = `appraiser_second_round_law_sources.referencePackageLinks[${index}]`;
    assertKnownIds(link.blockerIds, blockerIds, "blockerIds", sourceName);
    assertPackageLinkRules(link, anchorsById, blockersById, sourceName);
  });
  registry.evidenceReviewLinks.forEach((link, index) => {
    const sourceName = `appraiser_second_round_law_sources.evidenceReviewLinks[${index}]`;
    assertKnownIds(link.blockerIds, blockerIds, "blockerIds", sourceName);
    assertEvidenceLinkRules(link, anchorsById, blockersById, sourceName);
  });
}

function validateRegistry(raw: unknown): LawSourceVersionRegistry {
  const sourceName = "appraiser_second_round_law_sources.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  if (!Array.isArray(raw.lawSources)) throw new Error(`${sourceName}.lawSources must be an array`);
  if (!Array.isArray(raw.sourceAnchors)) throw new Error(`${sourceName}.sourceAnchors must be an array`);
  if (!Array.isArray(raw.examDateVersionChecks)) throw new Error(`${sourceName}.examDateVersionChecks must be an array`);
  if (!Array.isArray(raw.referencePackageLinks)) throw new Error(`${sourceName}.referencePackageLinks must be an array`);
  if (!Array.isArray(raw.evidenceReviewLinks)) throw new Error(`${sourceName}.evidenceReviewLinks must be an array`);
  if (!Array.isArray(raw.blockers)) throw new Error(`${sourceName}.blockers must be an array`);

  const registry: LawSourceVersionRegistry = {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(
      raw.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_law_source_version_registry"] as const,
    ),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_law_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    canonicalQuestionRegistryPath: assertString(raw.canonicalQuestionRegistryPath, "canonicalQuestionRegistryPath", sourceName, 400),
    referenceAnswerPackageRegistryPath: assertString(raw.referenceAnswerPackageRegistryPath, "referenceAnswerPackageRegistryPath", sourceName, 400),
    rubricEvidenceContractVersion: assertOneOf(
      raw.rubricEvidenceContractVersion,
      "rubricEvidenceContractVersion",
      sourceName,
      [RUBRIC_EVIDENCE_CONTRACT_VERSION] as const,
    ),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    boundaryPolicy: assertBoundaryPolicy(raw.boundaryPolicy, sourceName),
    lawSources: raw.lawSources.map((entry, index) => validateLawSource(entry, index)),
    sourceAnchors: raw.sourceAnchors.map((entry, index) => validateSourceAnchor(entry, index)),
    examDateVersionChecks: raw.examDateVersionChecks.map((entry, index) => validateExamDateVersionCheck(entry, index)),
    referencePackageLinks: raw.referencePackageLinks.map((entry, index) => validateReferencePackageLink(entry, index)),
    evidenceReviewLinks: raw.evidenceReviewLinks.map((entry, index) => validateEvidenceReviewLink(entry, index)),
    blockers: raw.blockers.map((entry, index) => validateBlocker(entry, index)),
  };
  assertRegistryBusinessRules(registry);
  return registry;
}

function countByStatus<T extends string, U>(
  values: readonly T[],
  records: readonly U[],
  selector: (record: U) => T,
): Record<T, number> {
  return values.reduce((counts, value) => {
    counts[value] = records.filter((record) => selector(record) === value).length;
    return counts;
  }, {} as Record<T, number>);
}

function sourceSort(left: LawSourceRecord, right: LawSourceRecord) {
  return left.sourceId.localeCompare(right.sourceId);
}

function anchorSort(left: LawSourceAnchor, right: LawSourceAnchor) {
  return left.anchorId.localeCompare(right.anchorId);
}

function sourceHasOpenBlocker(source: LawSourceRecord, blockersById: ReadonlyMap<string, LegalSourceBlocker>) {
  return hasOpenBlockingBlockers(source.blockerIds, blockersById);
}

export function buildLawSourceVersionReport(
  registry: LawSourceVersionRegistry,
  config: LawSourceVersionRegistryConfig = {},
): LawSourceVersionReport {
  const lawSources = [...registry.lawSources].sort(sourceSort);
  const sourceAnchors = [...registry.sourceAnchors].sort(anchorSort);
  const blockersById = new Map(registry.blockers.map((blocker) => [blocker.blockerId, blocker]));
  const lawSourcesNeedingOfficialVerification = lawSources
    .filter((source) => source.sourceStatus === "needs_official_verification" || source.versionMetadata.versionStatus === "needs_official_verification")
    .map((source) => source.sourceId);
  const lawSourcesWithOpenBlockers = lawSources
    .filter((source) => sourceHasOpenBlocker(source, blockersById))
    .map((source) => source.sourceId);
  const blockedReleasePackageLinkIds = registry.referencePackageLinks
    .filter((link) => link.releaseGateStatus === "blocked_by_legal_source" || hasOpenBlockingBlockers(link.blockerIds, blockersById))
    .map((link) => link.linkId)
    .sort();

  return {
    schemaVersion: registry.schemaVersion,
    reportType: "appraiser_second_round_law_source_version_report",
    generatedBy: "scripts/validate-law-source-version-registry.mjs",
    generatedAt: REPORT_GENERATED_AT,
    lawSourceRegistryPath: config.registryPath ?? DEFAULT_REGISTRY_PATH,
    canonicalQuestionRegistryPath: registry.canonicalQuestionRegistryPath,
    referenceAnswerPackageRegistryPath: registry.referenceAnswerPackageRegistryPath,
    rubricEvidenceContractVersion: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    storagePolicy: registry.storagePolicy,
    totals: {
      lawSourceCount: lawSources.length,
      sourceAnchorCount: sourceAnchors.length,
      examDateVersionCheckCount: registry.examDateVersionChecks.length,
      referencePackageLinkCount: registry.referencePackageLinks.length,
      evidenceReviewLinkCount: registry.evidenceReviewLinks.length,
      verifiedLawSourceCount: lawSources.filter((source) => isVerifiedLike(source.sourceStatus, source.versionMetadata.versionStatus)).length,
      needsOfficialVerificationCount: lawSourcesNeedingOfficialVerification.length,
      unresolvedConflictCount: lawSources.filter((source) => (
        source.sourceStatus === "unresolved_conflict" || source.versionMetadata.versionStatus === "unresolved_conflict"
      )).length,
      openBlockingBlockerCount: registry.blockers.filter((blocker) => blocker.status === "open" && blocker.severity === "blocking").length,
      blockedReleasePackageLinkCount: blockedReleasePackageLinkIds.length,
      highConfidenceReviewAllowedCheckCount: registry.examDateVersionChecks.filter((check) => check.releaseConfidence.s211HighConfidenceAllowed).length,
      sourceStatusCounts: countByStatus(LEGAL_SOURCE_STATUSES, lawSources, (source) => source.sourceStatus),
      versionStatusCounts: countByStatus(LAW_VERSION_STATUSES, lawSources, (source) => source.versionMetadata.versionStatus),
      examDateVersionStatusCounts: countByStatus(
        EXAM_DATE_VERSION_STATUSES,
        registry.examDateVersionChecks,
        (check) => check.examDateVersionStatus,
      ),
      currentLawDivergenceStatusCounts: countByStatus(
        CURRENT_LAW_DIVERGENCE_STATUSES,
        registry.examDateVersionChecks,
        (check) => check.currentLawComparison.status,
      ),
    },
    sourceIds: lawSources.map((source) => source.sourceId),
    sourceAnchorIds: sourceAnchors.map((anchor) => anchor.anchorId),
    lawSourcesNeedingOfficialVerification,
    lawSourcesWithOpenBlockers,
    blockedReleasePackageLinkIds,
    metadataOnly: true,
    safeUse: "s208_law_source_version_validation_only",
  };
}

export function loadLawSourceVersionRegistry(config: LawSourceVersionRegistryConfig = {}): LawSourceVersionRegistry {
  return validateRegistry(readJsonFile(resolveRepoPath(config.registryPath, DEFAULT_REGISTRY_PATH)));
}

export function loadLawSourceVersionReport(config: LawSourceVersionRegistryConfig = {}): LawSourceVersionReport {
  const registry = loadLawSourceVersionRegistry(config);
  const reportPath = resolveRepoPath(config.reportPath, DEFAULT_REPORT_PATH);
  const raw = readJsonFile(reportPath);
  assertNoForbiddenRawFields(raw, "appraiser_second_round_law_source_report.json");
  const expected = buildLawSourceVersionReport(registry, config);
  if (JSON.stringify(raw) !== JSON.stringify(expected)) {
    throw new Error("appraiser_second_round_law_source_report.json is stale or nondeterministic; regenerate it with check:law-source-version-registry -- --write-report");
  }
  return expected;
}
