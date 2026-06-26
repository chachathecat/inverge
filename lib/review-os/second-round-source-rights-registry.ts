import { readFileSync } from "node:fs";
import path from "node:path";

export type SecondRoundSubject = "practice" | "theory" | "law";
export type SecondRoundArtifactKind = "pdf" | "hwp" | "image" | "html" | "other";
export type SecondRoundHashStatus = "verified" | "not_fetched" | "needs_recheck";
export type SecondRoundSourceStatus = "discovered" | "registered" | "verified" | "unavailable" | "superseded";
export type SecondRoundExtractionStatus =
  | "not_started"
  | "metadata_only"
  | "extracted_private"
  | "needs_visual_check"
  | "blocked";
export type SecondRoundRightsStatus =
  | "redistribution_allowed"
  | "display_by_deep_link"
  | "private_reference_only"
  | "needs_legal_review";
export type SecondRoundDisplayMode =
  | "full_text"
  | "official_file_embed"
  | "metadata_and_link"
  | "operator_only";
export type SecondRoundCoverageGapStatus =
  | "not_found"
  | "source_unavailable"
  | "rights_blocked"
  | "needs_manual_review";

export type SecondRoundStoragePolicy = {
  metadataOnly: true;
  rawOfficialFileStored: false;
  rawQuestionTextStored: false;
  rawAnswerTextStored: false;
  rawOcrTextStored: false;
  learnerDataStored: false;
  thirdPartyAcademyContentStored: false;
};

export type SecondRoundSourceArtifact = {
  sourceId: string;
  officialSourceId: string;
  sourceAgency: string;
  officialUrl: string;
  examYear: number;
  examRound: number;
  subject: SecondRoundSubject;
  paperOrSession: string;
  artifactKind: SecondRoundArtifactKind;
  retrievedAt?: string;
  fileHashSha256?: string;
  hashStatus: SecondRoundHashStatus;
  pageCount?: number;
  examDate?: string;
  lawEffectiveDate?: string;
  sourceStatus: SecondRoundSourceStatus;
  extractionStatus: SecondRoundExtractionStatus;
  lastOfficialVerifiedAt?: string;
  localRawFileNameHash?: string;
};

export type SecondRoundSourceRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_source_registry";
  registryScope: "appraiser_second_round_only";
  generatedBy: string;
  generatedAt: string;
  coverageBasis: string;
  storagePolicy: SecondRoundStoragePolicy;
  notes: string[];
  sourceArtifacts: SecondRoundSourceArtifact[];
};

export type SecondRoundRightsDecision = {
  sourceId: string;
  rightsStatus: SecondRoundRightsStatus;
  displayMode: SecondRoundDisplayMode;
  decisionStatus: string;
  evidenceSourceId: string;
  evidenceReference: string;
  verifiedBy: string;
  verifiedAt: string;
  operationalNote: string;
  learnerFacingPublicationAllowed?: boolean;
};

export type SecondRoundRightsRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_rights_registry";
  registryScope: "appraiser_second_round_only";
  generatedBy: string;
  generatedAt: string;
  storagePolicy: SecondRoundStoragePolicy;
  rightsPolicy: {
    defaultStatus: SecondRoundRightsStatus;
    defaultDisplayMode: SecondRoundDisplayMode;
    redistributionAssumptionAllowed: false;
    learnerPublicationDefault: string;
  };
  rightsDecisions: SecondRoundRightsDecision[];
};

export type SecondRoundS203ConsumptionGate = {
  metadataEligible: boolean;
  problemTextEligible: boolean;
  learnerPublicationEligible: boolean;
};

export type SecondRoundCoverageEntry = {
  coverageId: string;
  examYear: number;
  examRound: number;
  subject: SecondRoundSubject;
  paperOrSession: string;
  sourceDiscoveryStatus: SecondRoundSourceStatus | "not_found";
  sourceId: string | null;
  artifactKind: SecondRoundArtifactKind | null;
  hashStatus: SecondRoundHashStatus | "not_applicable";
  rightsStatus: SecondRoundRightsStatus;
  displayMode: SecondRoundDisplayMode;
  extractionStatus: SecondRoundExtractionStatus;
  gapStatus: SecondRoundCoverageGapStatus | null;
  operationalNote: string;
  s203Consumption: SecondRoundS203ConsumptionGate;
};

export type SecondRoundCoverageReport = {
  schemaVersion: string;
  reportType: "appraiser_second_round_source_rights_coverage";
  generatedBy: string;
  generatedAt: string;
  coverageBasis: string;
  sourceRegistryPath: string;
  rightsRegistryPath: string;
  storagePolicy: SecondRoundStoragePolicy;
  totals: {
    expectedSourceSlots: number;
    registeredSourceCount: number;
    gapCount: number;
    missingSourceCount: number;
    rightsBlockedCount: number;
    metadataEligibleForS203Count: number;
    problemTextEligibleForS203Count: number;
    learnerPublicationEligibleCount: number;
    rightsStatusCounts: Record<string, number>;
    displayModeCounts: Record<string, number>;
    hashStatusCounts: Record<string, number>;
    extractionStatusCounts: Record<string, number>;
  };
  matrix: SecondRoundCoverageEntry[];
  coverageGaps: SecondRoundCoverageEntry[];
  metadataOnly: true;
  safeUse: "s202_source_rights_coverage_only";
  historicalBacklogNote: string;
};

export type SecondRoundSourceRightsReference = {
  sourceRegistry: SecondRoundSourceRegistry;
  rightsRegistry: SecondRoundRightsRegistry;
  rightsBySourceId: Map<string, SecondRoundRightsDecision>;
};

export type SecondRoundSourceRightsRegistryConfig = {
  sourceRegistryPath?: string;
  rightsRegistryPath?: string;
  coverageReportPath?: string;
  officialSourceRegistryPath?: string;
};

type OfficialSourceRegistryEntry = {
  id: string;
  sourceUrl: string;
  sourceName: string;
  sourceKind: string;
};

const DEFAULT_SOURCE_REGISTRY_PATH = "reference_corpus/official_materials/appraiser/second_round_source_registry.json";
const DEFAULT_RIGHTS_REGISTRY_PATH = "reference_corpus/official_materials/appraiser/second_round_rights_registry.json";
const DEFAULT_COVERAGE_REPORT_PATH = "reference_corpus/official_materials/appraiser/second_round_coverage_report.json";
const DEFAULT_OFFICIAL_SOURCE_REGISTRY_PATH = "reference_corpus/curriculum/appraiser/official_sources.json";
const COVERAGE_GENERATED_AT = "2026-06-25T00:00:00.000Z";

const SUBJECT_ORDER: readonly SecondRoundSubject[] = ["practice", "theory", "law"];
const PAPER_OR_SESSION_BY_SUBJECT: Record<SecondRoundSubject, string> = {
  practice: "2차 1교시: 감정평가실무",
  theory: "2차 2교시: 감정평가이론",
  law: "2차 3교시: 감정평가 및 보상법규",
};

const ARTIFACT_KINDS = ["pdf", "hwp", "image", "html", "other"] as const;
const HASH_STATUSES = ["verified", "not_fetched", "needs_recheck"] as const;
const SOURCE_STATUSES = ["discovered", "registered", "verified", "unavailable", "superseded"] as const;
const EXTRACTION_STATUSES = ["not_started", "metadata_only", "extracted_private", "needs_visual_check", "blocked"] as const;
const RIGHTS_STATUSES = ["redistribution_allowed", "display_by_deep_link", "private_reference_only", "needs_legal_review"] as const;
const DISPLAY_MODES = ["full_text", "official_file_embed", "metadata_and_link", "operator_only"] as const;
const BROAD_DISPLAY_MODES = new Set<SecondRoundDisplayMode>(["full_text", "official_file_embed"]);
const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const PLACEHOLDER_HASH_PATTERN = /^(?:0{64}|f{64}|1{64}|a{64}|[a-f0-9]{1,8}|placeholder|todo|tbd|unknown)$/i;

const FORBIDDEN_RAW_OR_BOUNDARY_FIELD_NAMES = new Set([
  "problemText",
  "questionText",
  "questionBody",
  "fullQuestion",
  "requirement",
  "subQuestions",
  "answerText",
  "answerBody",
  "fullAnswer",
  "officialAnswer",
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
  "academyContent",
  "thirdPartyAcademyContent",
  "instructorComment",
  "score",
  "officialScore",
  "predictedScore",
  "passFail",
  "passGuarantee",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "localFileName",
  "localRawFileName",
  "sourceFileName",
  "localFilePath",
  "sourceFilePath",
  "rawFilePath",
]);

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
  if (value.length > maxLength) {
    throw new Error(`${sourceName}.${fieldName} is too long for metadata-only registry use`);
  }
  return value;
}

function assertOptionalString(value: unknown, fieldName: string, sourceName: string, maxLength = 260) {
  if (value === undefined) return undefined;
  return assertString(value, fieldName, sourceName, maxLength);
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

function assertBoolean(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "boolean") throw new Error(`${sourceName}.${fieldName} must be boolean`);
  return value;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertString(entry, `${fieldName}[${index}]`, sourceName));
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
  const url = assertString(value, fieldName, sourceName, 500);
  if (!/^https:\/\//.test(url)) throw new Error(`${sourceName}.${fieldName} must be an HTTPS URL`);
  return url;
}

function assertSha256Hex(value: unknown, fieldName: string, sourceName: string) {
  const hash = assertString(value, fieldName, sourceName);
  if (!SHA_256_HEX_PATTERN.test(hash)) throw new Error(`${sourceName}.${fieldName} must be a SHA-256 hex digest`);
  if (PLACEHOLDER_HASH_PATTERN.test(hash)) throw new Error(`${sourceName}.${fieldName} looks like a placeholder hash`);
  return hash;
}

function assertStoragePolicy(value: unknown, sourceName: string): SecondRoundStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
    rawOfficialFileStored: assertFalse(value.rawOfficialFileStored, "rawOfficialFileStored", `${sourceName}.storagePolicy`),
    rawQuestionTextStored: assertFalse(value.rawQuestionTextStored, "rawQuestionTextStored", `${sourceName}.storagePolicy`),
    rawAnswerTextStored: assertFalse(value.rawAnswerTextStored, "rawAnswerTextStored", `${sourceName}.storagePolicy`),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", `${sourceName}.storagePolicy`),
    learnerDataStored: assertFalse(value.learnerDataStored, "learnerDataStored", `${sourceName}.storagePolicy`),
    thirdPartyAcademyContentStored: assertFalse(value.thirdPartyAcademyContentStored, "thirdPartyAcademyContentStored", `${sourceName}.storagePolicy`),
  };
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_RAW_OR_BOUNDARY_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains forbidden raw/content boundary field ${key} at ${trail}`);
    }
    assertNoForbiddenRawFields(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function loadOfficialSourceRegistry(config: SecondRoundSourceRightsRegistryConfig = {}) {
  const registryPath = resolveRepoPath(config.officialSourceRegistryPath, DEFAULT_OFFICIAL_SOURCE_REGISTRY_PATH);
  const raw = readJsonFile(registryPath);
  assertRecord(raw, "official_sources.json");
  if (!Array.isArray(raw.sources)) throw new Error("official_sources.json.sources must be an array");
  const officialSources = new Map<string, OfficialSourceRegistryEntry>();
  raw.sources.forEach((entry, index) => {
    assertRecord(entry, `official_sources.json.sources[${index}]`);
    const id = assertString(entry.id, "id", `official_sources.json.sources[${index}]`);
    officialSources.set(id, {
      id,
      sourceUrl: assertHttpsUrl(entry.sourceUrl, "sourceUrl", `official_sources.json.sources[${index}]`),
      sourceName: assertString(entry.sourceName, "sourceName", `official_sources.json.sources[${index}]`),
      sourceKind: assertString(entry.sourceKind, "sourceKind", `official_sources.json.sources[${index}]`),
    });
  });
  return officialSources;
}

function expectedRoundForYear(year: number) {
  return year - 1989;
}

function validateSourceArtifact(
  raw: unknown,
  index: number,
  officialSources: Map<string, OfficialSourceRegistryEntry>,
): SecondRoundSourceArtifact {
  const sourceName = `second_round_source_registry.sourceArtifacts[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);

  const sourceId = assertString(raw.sourceId, "sourceId", sourceName);
  const officialSourceId = assertString(raw.officialSourceId, "officialSourceId", sourceName);
  const officialSource = officialSources.get(officialSourceId);
  if (!officialSource) throw new Error(`${sourceName}.officialSourceId must exist in official_sources.json`);

  const officialUrl = assertHttpsUrl(raw.officialUrl, "officialUrl", sourceName);
  if (officialUrl !== officialSource.sourceUrl) throw new Error(`${sourceName}.officialUrl must match official_sources.json`);

  const examYear = assertInteger(raw.examYear, "examYear", sourceName, { min: 1989, max: 2100 });
  const examRound = assertInteger(raw.examRound, "examRound", sourceName, { min: 1, max: 200 });
  if (examRound !== expectedRoundForYear(examYear)) {
    throw new Error(`${sourceName}.examRound is impossible for examYear ${examYear}`);
  }

  const subject = assertOneOf(raw.subject, "subject", sourceName, SUBJECT_ORDER) as SecondRoundSubject;
  const paperOrSession = assertString(raw.paperOrSession, "paperOrSession", sourceName);
  if (paperOrSession !== PAPER_OR_SESSION_BY_SUBJECT[subject]) {
    throw new Error(`${sourceName}.paperOrSession must match the canonical 2차 subject session`);
  }

  const artifactKind = assertOneOf(raw.artifactKind, "artifactKind", sourceName, ARTIFACT_KINDS) as SecondRoundArtifactKind;
  const hashStatus = assertOneOf(raw.hashStatus, "hashStatus", sourceName, HASH_STATUSES) as SecondRoundHashStatus;
  const fileHashSha256 = assertOptionalString(raw.fileHashSha256, "fileHashSha256", sourceName);
  if (hashStatus === "verified") {
    assertSha256Hex(fileHashSha256, "fileHashSha256", sourceName);
    assertDate(raw.retrievedAt, "retrievedAt", sourceName);
  } else if (fileHashSha256 !== undefined) {
    throw new Error(`${sourceName}.fileHashSha256 must be omitted unless hashStatus is verified`);
  }

  const sourceStatus = assertOneOf(raw.sourceStatus, "sourceStatus", sourceName, SOURCE_STATUSES) as SecondRoundSourceStatus;
  const extractionStatus = assertOneOf(raw.extractionStatus, "extractionStatus", sourceName, EXTRACTION_STATUSES) as SecondRoundExtractionStatus;
  if ((sourceStatus === "unavailable" || sourceStatus === "superseded") && extractionStatus !== "blocked") {
    throw new Error(`${sourceName}.extractionStatus must be blocked when sourceStatus is ${sourceStatus}`);
  }
  if (sourceStatus === "verified" && raw.lastOfficialVerifiedAt === undefined) {
    throw new Error(`${sourceName}.lastOfficialVerifiedAt is required for verified sources`);
  }

  const pageCount = raw.pageCount === undefined
    ? undefined
    : assertInteger(raw.pageCount, "pageCount", sourceName, { min: 1, max: 1000 });
  const localRawFileNameHash = raw.localRawFileNameHash === undefined
    ? undefined
    : assertSha256Hex(raw.localRawFileNameHash, "localRawFileNameHash", sourceName);

  return {
    sourceId,
    officialSourceId,
    sourceAgency: assertString(raw.sourceAgency, "sourceAgency", sourceName),
    officialUrl,
    examYear,
    examRound,
    subject,
    paperOrSession,
    artifactKind,
    retrievedAt: assertOptionalDate(raw.retrievedAt, "retrievedAt", sourceName),
    fileHashSha256,
    hashStatus,
    pageCount,
    examDate: assertOptionalDate(raw.examDate, "examDate", sourceName),
    lawEffectiveDate: assertOptionalDate(raw.lawEffectiveDate, "lawEffectiveDate", sourceName),
    sourceStatus,
    extractionStatus,
    lastOfficialVerifiedAt: assertOptionalDate(raw.lastOfficialVerifiedAt, "lastOfficialVerifiedAt", sourceName),
    localRawFileNameHash,
  };
}

function validateSourceRegistry(
  raw: unknown,
  officialSources: Map<string, OfficialSourceRegistryEntry>,
): SecondRoundSourceRegistry {
  const sourceName = "second_round_source_registry.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  if (!Array.isArray(raw.sourceArtifacts)) throw new Error(`${sourceName}.sourceArtifacts must be an array`);

  const sourceArtifacts = raw.sourceArtifacts.map((entry, index) => validateSourceArtifact(entry, index, officialSources));
  const sourceIds = new Set<string>();
  const artifactIdentities = new Set<string>();
  for (const source of sourceArtifacts) {
    if (sourceIds.has(source.sourceId)) throw new Error(`${sourceName} contains duplicate sourceId ${source.sourceId}`);
    sourceIds.add(source.sourceId);
    const artifactIdentity = [
      source.officialSourceId,
      source.officialUrl,
      source.examYear,
      source.examRound,
      source.subject,
      source.paperOrSession,
      source.artifactKind,
    ].join("|");
    if (artifactIdentities.has(artifactIdentity)) {
      throw new Error(`${sourceName} contains duplicate current artifact identity ${artifactIdentity}`);
    }
    artifactIdentities.add(artifactIdentity);
  }

  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(raw.registryType, "registryType", sourceName, ["appraiser_second_round_source_registry"] as const),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    coverageBasis: assertString(raw.coverageBasis, "coverageBasis", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    notes: assertStringArray(raw.notes, "notes", sourceName),
    sourceArtifacts,
  };
}

function isLearnerPublicationAllowedByDecision(decision: SecondRoundRightsDecision) {
  return decision.rightsStatus === "redistribution_allowed"
    && (decision.displayMode === "full_text" || decision.displayMode === "official_file_embed");
}

function validateRightsDecision(
  raw: unknown,
  index: number,
  sourceIds: Set<string>,
): SecondRoundRightsDecision {
  const sourceName = `second_round_rights_registry.rightsDecisions[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  const sourceId = assertString(raw.sourceId, "sourceId", sourceName);
  if (!sourceIds.has(sourceId)) throw new Error(`${sourceName}.sourceId does not exist in source registry`);

  const rightsStatus = assertOneOf(raw.rightsStatus, "rightsStatus", sourceName, RIGHTS_STATUSES) as SecondRoundRightsStatus;
  const displayMode = assertOneOf(raw.displayMode, "displayMode", sourceName, DISPLAY_MODES) as SecondRoundDisplayMode;
  const evidenceReference = assertString(raw.evidenceReference, "evidenceReference", sourceName, 500);
  const verifiedAt = assertDate(raw.verifiedAt, "verifiedAt", sourceName);
  const decision: SecondRoundRightsDecision = {
    sourceId,
    rightsStatus,
    displayMode,
    decisionStatus: assertString(raw.decisionStatus, "decisionStatus", sourceName),
    evidenceSourceId: assertString(raw.evidenceSourceId, "evidenceSourceId", sourceName),
    evidenceReference,
    verifiedBy: assertString(raw.verifiedBy, "verifiedBy", sourceName),
    verifiedAt,
    operationalNote: assertString(raw.operationalNote, "operationalNote", sourceName, 500),
    learnerFacingPublicationAllowed: raw.learnerFacingPublicationAllowed === undefined
      ? undefined
      : assertBoolean(raw.learnerFacingPublicationAllowed, "learnerFacingPublicationAllowed", sourceName),
  };

  if (rightsStatus === "needs_legal_review" && BROAD_DISPLAY_MODES.has(displayMode)) {
    throw new Error(`${sourceName} needs_legal_review must not permit ${displayMode}`);
  }
  if (rightsStatus === "private_reference_only" && displayMode !== "operator_only") {
    throw new Error(`${sourceName} private_reference_only must use operator_only display`);
  }
  if (rightsStatus === "display_by_deep_link" && displayMode !== "metadata_and_link") {
    throw new Error(`${sourceName} display_by_deep_link must use metadata_and_link display`);
  }
  if (rightsStatus === "redistribution_allowed" && BROAD_DISPLAY_MODES.has(displayMode)) {
    if (!evidenceReference || !verifiedAt) {
      throw new Error(`${sourceName} broad redistribution display requires evidence and verification date`);
    }
  }
  if (raw.learnerFacingPublicationAllowed === true && !isLearnerPublicationAllowedByDecision(decision)) {
    throw new Error(`${sourceName} learner-facing publication is blocked by rights/display status`);
  }

  return decision;
}

function validateRightsRegistry(raw: unknown, sourceArtifacts: SecondRoundSourceArtifact[]): SecondRoundRightsRegistry {
  const sourceName = "second_round_rights_registry.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  if (!Array.isArray(raw.rightsDecisions)) throw new Error(`${sourceName}.rightsDecisions must be an array`);
  assertRecord(raw.rightsPolicy, `${sourceName}.rightsPolicy`);

  const sourceIds = new Set(sourceArtifacts.map((source) => source.sourceId));
  const rightsDecisions = raw.rightsDecisions.map((entry, index) => validateRightsDecision(entry, index, sourceIds));
  const decisionIds = new Set<string>();
  for (const decision of rightsDecisions) {
    if (decisionIds.has(decision.sourceId)) throw new Error(`${sourceName} contains duplicate rights sourceId ${decision.sourceId}`);
    decisionIds.add(decision.sourceId);
  }
  for (const sourceId of sourceIds) {
    if (!decisionIds.has(sourceId)) throw new Error(`${sourceName} is missing rights decision for ${sourceId}`);
  }

  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(raw.registryType, "registryType", sourceName, ["appraiser_second_round_rights_registry"] as const),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    rightsPolicy: {
      defaultStatus: assertOneOf(raw.rightsPolicy.defaultStatus, "defaultStatus", `${sourceName}.rightsPolicy`, RIGHTS_STATUSES) as SecondRoundRightsStatus,
      defaultDisplayMode: assertOneOf(raw.rightsPolicy.defaultDisplayMode, "defaultDisplayMode", `${sourceName}.rightsPolicy`, DISPLAY_MODES) as SecondRoundDisplayMode,
      redistributionAssumptionAllowed: assertFalse(
        raw.rightsPolicy.redistributionAssumptionAllowed,
        "redistributionAssumptionAllowed",
        `${sourceName}.rightsPolicy`,
      ),
      learnerPublicationDefault: assertString(raw.rightsPolicy.learnerPublicationDefault, "learnerPublicationDefault", `${sourceName}.rightsPolicy`),
    },
    rightsDecisions,
  };
}

function countBy<T>(entries: readonly T[], selector: (entry: T) => string) {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    const key = selector(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function sourceSort(left: SecondRoundSourceArtifact, right: SecondRoundSourceArtifact) {
  return left.examYear - right.examYear
    || left.examRound - right.examRound
    || SUBJECT_ORDER.indexOf(left.subject) - SUBJECT_ORDER.indexOf(right.subject)
    || left.sourceId.localeCompare(right.sourceId);
}

export function getSecondRoundSourceS203ConsumptionGate(
  source: SecondRoundSourceArtifact,
  decision: SecondRoundRightsDecision,
): SecondRoundS203ConsumptionGate {
  const sourceIsCurrent = source.sourceStatus === "registered" || source.sourceStatus === "verified";
  const metadataEligible = sourceIsCurrent && decision.displayMode !== "operator_only";
  const problemTextEligible = sourceIsCurrent
    && source.hashStatus === "verified"
    && source.extractionStatus === "extracted_private"
    && decision.rightsStatus === "redistribution_allowed"
    && decision.displayMode === "full_text";
  return {
    metadataEligible,
    problemTextEligible,
    learnerPublicationEligible: problemTextEligible && decision.learnerFacingPublicationAllowed === true,
  };
}

export function buildSecondRoundCoverageReport(
  reference: SecondRoundSourceRightsReference,
  options: {
    generatedAt?: string;
    sourceRegistryPath?: string;
    rightsRegistryPath?: string;
  } = {},
): SecondRoundCoverageReport {
  const sources = [...reference.sourceRegistry.sourceArtifacts].sort(sourceSort);
  const sourceBySlot = new Map(sources.map((source) => [`${source.examYear}:${source.subject}`, source]));
  const years = [...new Set(sources.map((source) => source.examYear))].sort((left, right) => left - right);
  const matrix: SecondRoundCoverageEntry[] = [];

  for (const year of years) {
    for (const subject of SUBJECT_ORDER) {
      const source = sourceBySlot.get(`${year}:${subject}`);
      const examRound = expectedRoundForYear(year);
      const paperOrSession = PAPER_OR_SESSION_BY_SUBJECT[subject];
      const coverageId = `appraiser-second-${year}-${examRound}-${subject}`;
      if (!source) {
        matrix.push({
          coverageId,
          examYear: year,
          examRound,
          subject,
          paperOrSession,
          sourceDiscoveryStatus: "not_found",
          sourceId: null,
          artifactKind: null,
          hashStatus: "not_applicable",
          rightsStatus: "needs_legal_review",
          displayMode: "metadata_and_link",
          extractionStatus: "not_started",
          gapStatus: "not_found",
          operationalNote: "Expected 2차 subject slot is absent from committed Q-Net metadata; manual source review required.",
          s203Consumption: {
            metadataEligible: false,
            problemTextEligible: false,
            learnerPublicationEligible: false,
          },
        });
        continue;
      }

      const decision = reference.rightsBySourceId.get(source.sourceId);
      if (!decision) throw new Error(`Missing rights decision for ${source.sourceId}`);
      const gate = getSecondRoundSourceS203ConsumptionGate(source, decision);
      const rightsBlocked = decision.rightsStatus !== "redistribution_allowed";
      matrix.push({
        coverageId,
        examYear: source.examYear,
        examRound: source.examRound,
        subject: source.subject,
        paperOrSession: source.paperOrSession,
        sourceDiscoveryStatus: source.sourceStatus,
        sourceId: source.sourceId,
        artifactKind: source.artifactKind,
        hashStatus: source.hashStatus,
        rightsStatus: decision.rightsStatus,
        displayMode: decision.displayMode,
        extractionStatus: source.extractionStatus,
        gapStatus: rightsBlocked ? "rights_blocked" : null,
        operationalNote: rightsBlocked
          ? "Registered source is metadata-only and rights-blocked for raw display until legal review clears broader use."
          : "Registered source has a compatible rights decision.",
        s203Consumption: gate,
      });
    }
  }

  const coverageGaps = matrix.filter((entry) => entry.gapStatus !== null);
  return {
    schemaVersion: reference.sourceRegistry.schemaVersion,
    reportType: "appraiser_second_round_source_rights_coverage",
    generatedBy: "scripts/validate-second-round-source-rights-registry.mjs",
    generatedAt: options.generatedAt ?? COVERAGE_GENERATED_AT,
    coverageBasis: reference.sourceRegistry.coverageBasis,
    sourceRegistryPath: options.sourceRegistryPath ?? DEFAULT_SOURCE_REGISTRY_PATH,
    rightsRegistryPath: options.rightsRegistryPath ?? DEFAULT_RIGHTS_REGISTRY_PATH,
    storagePolicy: reference.sourceRegistry.storagePolicy,
    totals: {
      expectedSourceSlots: matrix.length,
      registeredSourceCount: sources.length,
      gapCount: coverageGaps.length,
      missingSourceCount: matrix.filter((entry) => entry.gapStatus === "not_found").length,
      rightsBlockedCount: matrix.filter((entry) => entry.gapStatus === "rights_blocked").length,
      metadataEligibleForS203Count: matrix.filter((entry) => entry.s203Consumption.metadataEligible).length,
      problemTextEligibleForS203Count: matrix.filter((entry) => entry.s203Consumption.problemTextEligible).length,
      learnerPublicationEligibleCount: matrix.filter((entry) => entry.s203Consumption.learnerPublicationEligible).length,
      rightsStatusCounts: countBy(matrix, (entry) => entry.rightsStatus),
      displayModeCounts: countBy(matrix, (entry) => entry.displayMode),
      hashStatusCounts: countBy(matrix, (entry) => entry.hashStatus),
      extractionStatusCounts: countBy(matrix, (entry) => entry.extractionStatus),
    },
    matrix,
    coverageGaps,
    metadataOnly: true,
    safeUse: "s202_source_rights_coverage_only",
    historicalBacklogNote: "The committed S202 coverage basis is 2020-2025 Q-Net metadata. Older official years must remain explicit future discovery work until locally confirmed; no complete historical-coverage claim is made here.",
  };
}

export function loadSecondRoundSourceRightsRegistry(
  config: SecondRoundSourceRightsRegistryConfig = {},
): SecondRoundSourceRightsReference {
  const officialSources = loadOfficialSourceRegistry(config);
  const sourceRegistry = validateSourceRegistry(
    readJsonFile(resolveRepoPath(config.sourceRegistryPath, DEFAULT_SOURCE_REGISTRY_PATH)),
    officialSources,
  );
  const rightsRegistry = validateRightsRegistry(
    readJsonFile(resolveRepoPath(config.rightsRegistryPath, DEFAULT_RIGHTS_REGISTRY_PATH)),
    sourceRegistry.sourceArtifacts,
  );
  const rightsBySourceId = new Map(rightsRegistry.rightsDecisions.map((decision) => [decision.sourceId, decision]));
  return {
    sourceRegistry,
    rightsRegistry,
    rightsBySourceId,
  };
}

export function loadSecondRoundCoverageReport(
  config: SecondRoundSourceRightsRegistryConfig = {},
): SecondRoundCoverageReport {
  const reference = loadSecondRoundSourceRightsRegistry(config);
  const coverageReportPath = resolveRepoPath(config.coverageReportPath, DEFAULT_COVERAGE_REPORT_PATH);
  const raw = readJsonFile(coverageReportPath);
  assertNoForbiddenRawFields(raw, "second_round_coverage_report.json");
  const expected = buildSecondRoundCoverageReport(reference, {
    sourceRegistryPath: config.sourceRegistryPath ?? DEFAULT_SOURCE_REGISTRY_PATH,
    rightsRegistryPath: config.rightsRegistryPath ?? DEFAULT_RIGHTS_REGISTRY_PATH,
  });
  if (JSON.stringify(raw) !== JSON.stringify(expected)) {
    throw new Error("second_round_coverage_report.json is stale or nondeterministic; regenerate it with check:second-round-source-rights -- --write-coverage");
  }
  return expected;
}
