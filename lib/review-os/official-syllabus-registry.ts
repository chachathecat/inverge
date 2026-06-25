import { readFileSync } from "node:fs";
import path from "node:path";

export type OfficialRegistryStatus = "draft" | "verified" | "needs_update" | "deprecated";
export type OfficialRegistryScope = "second_round";

export type RegistryStoragePolicy = {
  metadataOnly: true;
  rawTextStored: false;
  copyrightedTextStored: false;
  rawNoticeTextStored: false;
  rawQuestionTextStored: false;
  rawAnswerTextStored: false;
  rawLearnerTextStored: false;
};

export type OfficialSyllabusRecord = {
  id: string;
  scope: OfficialRegistryScope;
  recordType: string;
  sourceIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  status: OfficialRegistryStatus;
  lastOfficialVerifiedAt: string;
  needsManualRecheckBy: string;
  productionFacing?: boolean;
};

export type OfficialSubjectRecord = OfficialSyllabusRecord & {
  recordType: "official_subject";
  subjectKey: "practice" | "theory" | "law";
  officialSubjectLabelKo: string;
  officialSubjectOrder: number;
  editorialSubjectId: string;
};

export type OfficialSyllabusRegistry = {
  schemaVersion: string;
  registryScope: string;
  storagePolicy: RegistryStoragePolicy;
  lastReviewedAt: string;
  currentAsOf: string;
  sourceIds: string[];
  qualificationStageRecords: OfficialSyllabusRecord[];
  subjectRecords: OfficialSubjectRecord[];
  deprecatedRecords: OfficialSyllabusRecord[];
  unresolvedOfficialSourceConflicts: unknown[];
};

export type ExamRuleRecord = {
  id: string;
  scope: OfficialRegistryScope;
  ruleKey: string;
  value: unknown;
  sourceIds: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  status: OfficialRegistryStatus;
  lastOfficialVerifiedAt: string;
  needsManualRecheckBy: string;
  productionFacing?: boolean;
};

export type ExamRuleRegistry = {
  schemaVersion: string;
  registryScope: string;
  storagePolicy: RegistryStoragePolicy;
  lastReviewedAt: string;
  currentAsOf: string;
  sourceIds: string[];
  rules: ExamRuleRecord[];
  deprecatedRecords: ExamRuleRecord[];
  unresolvedOfficialSourceConflicts: unknown[];
};

export type AnnualNoticeValueRecord = {
  id: string;
  scope: OfficialRegistryScope;
  valueKey: string;
  value: unknown;
  sourceIds: string[];
  effectiveFrom: string;
  effectiveTo: string;
  status: OfficialRegistryStatus;
  lastOfficialVerifiedAt: string;
  needsManualRecheckBy: string;
  productionFacing?: boolean;
};

export type AnnualNoticeRegistry = {
  schemaVersion: string;
  registryScope: string;
  noticeYear: number;
  examRound: number;
  qualificationNameKo: string;
  storagePolicy: RegistryStoragePolicy;
  lastReviewedAt: string;
  currentAsOf: string;
  sourceIds: string[];
  noticeMetadata: {
    noticeTitleKo: string;
    noticePublishedAt: string | null;
    officialNoticeUrl: string;
    noticeBodyStored: false;
    attachmentBodyStored: false;
    sourceNote: string;
  };
  annualValues: AnnualNoticeValueRecord[];
  annualOverrides: AnnualNoticeValueRecord[];
  unresolvedOfficialSourceConflicts: unknown[];
};

export type OfficialSourceRegistryEntry = {
  id: string;
  sourceName: string;
  sourceUrl: string;
  sourceKind: string;
  needsManualRecheckBy: string;
};

export type OfficialSourceRegistry = {
  sources: OfficialSourceRegistryEntry[];
};

export type SecondRoundOfficialRegistryReference = {
  officialSources: OfficialSourceRegistry;
  officialSyllabus: OfficialSyllabusRegistry;
  examRules: ExamRuleRegistry;
  annualNotices: AnnualNoticeRegistry[];
  summary: SecondRoundOfficialRegistrySummary;
};

export type SecondRoundOfficialRegistrySummary = {
  status: "current" | "needs_update";
  currentOfficialSubjects: string[];
  officialSubjectCount: number;
  currentRuleCount: number;
  annualNoticeYears: number[];
  verifiedRecords: number;
  draftRecords: number;
  needsUpdateRecords: number;
  deprecatedRecords: number;
  staleVerifiedRecordIds: string[];
  unresolvedOfficialSourceConflicts: number;
};

export type OfficialSyllabusRegistryLoaderConfig = {
  sourceDir?: string;
  officialSourceRegistryPath?: string;
  officialSyllabusPath?: string;
  examRulesPath?: string;
  annualNoticePaths?: string[];
  asOfDate?: string;
};

const DEFAULT_CURRICULUM_SOURCE_PARTS = ["reference_corpus", "curriculum", "appraiser"] as const;
const STATUS_VALUES = new Set<OfficialRegistryStatus>(["draft", "verified", "needs_update", "deprecated"]);
const EXPECTED_SECOND_ROUND_SUBJECTS = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"] as const;
const ANNUAL_ONLY_FIELD_NAMES = new Set([
  "annualNoticeId",
  "applicationStartDate",
  "applicationEndDate",
  "documentSubmissionStartDate",
  "documentSubmissionEndDate",
  "examDate",
  "examRound",
  "examYear",
  "noticePublishedAt",
  "noticeYear",
  "resultAnnouncementStartDate",
  "resultAnnouncementEndDate",
]);
const FORBIDDEN_FIELD_NAMES = new Set([
  "rawText",
  "rawNoticeText",
  "rawOcrText",
  "rawAnswerText",
  "rawProblemText",
  "learnerText",
  "ocrText",
  "userAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "uploadedProblemText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
  "officialAnswer",
  "modelAnswer",
  "scorePrediction",
  "passFail",
]);
const FORBIDDEN_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|pass\s+probability|model\s+answer|guaranteed\s+score|합격\s*보장|합격\s*확률|공식\s*채점|공식\s*점수|확정\s*점수|점수\s*예측|합격\s*\/\s*불합격|합불|공식\s*모범\s*답안|모범\s*답안)/i;

function sourceDir(config: OfficialSyllabusRegistryLoaderConfig = {}) {
  if (config.sourceDir) return path.resolve(/* turbopackIgnore: true */ process.cwd(), config.sourceDir);
  return path.join(process.cwd(), ...DEFAULT_CURRICULUM_SOURCE_PARTS);
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

function assertString(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName} is missing required string field ${fieldName}`);
  }
  return value;
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`${sourceName} field ${fieldName} must be a non-empty string array`);
  }
  return value as string[];
}

function assertDateString(value: unknown, fieldName: string, sourceName: string) {
  const date = assertString(value, fieldName, sourceName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${sourceName} field ${fieldName} must be YYYY-MM-DD`);
  return date;
}

function assertOptionalDateString(value: unknown, fieldName: string, sourceName: string) {
  if (value === undefined) return undefined;
  return assertDateString(value, fieldName, sourceName);
}

function assertStatus(value: unknown, fieldName: string, sourceName: string): OfficialRegistryStatus {
  const status = assertString(value, fieldName, sourceName);
  if (!STATUS_VALUES.has(status as OfficialRegistryStatus)) {
    throw new Error(`${sourceName} field ${fieldName} must be draft, verified, needs_update, or deprecated`);
  }
  return status as OfficialRegistryStatus;
}

function assertScope(value: unknown, fieldName: string, sourceName: string): OfficialRegistryScope {
  const scope = assertString(value, fieldName, sourceName);
  if (scope !== "second_round") throw new Error(`${sourceName} field ${fieldName} must be second_round`);
  return scope;
}

function assertBoolean(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "boolean") throw new Error(`${sourceName} field ${fieldName} must be boolean`);
  return value;
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName} field ${fieldName} must be false`);
  return false;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName} field ${fieldName} must be true`);
  return true;
}

function assertNumber(value: unknown, fieldName: string, sourceName: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${sourceName} field ${fieldName} must be a finite number`);
  }
  return value;
}

function assertHttpsUrl(value: unknown, fieldName: string, sourceName: string) {
  const url = assertString(value, fieldName, sourceName);
  if (!/^https:\/\//.test(url)) throw new Error(`${sourceName} field ${fieldName} must be an https URL`);
  return url;
}

function assertStoragePolicy(value: unknown, sourceName: string): RegistryStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
    rawTextStored: assertFalse(value.rawTextStored, "rawTextStored", `${sourceName}.storagePolicy`),
    copyrightedTextStored: assertFalse(value.copyrightedTextStored, "copyrightedTextStored", `${sourceName}.storagePolicy`),
    rawNoticeTextStored: assertFalse(value.rawNoticeTextStored, "rawNoticeTextStored", `${sourceName}.storagePolicy`),
    rawQuestionTextStored: assertFalse(value.rawQuestionTextStored, "rawQuestionTextStored", `${sourceName}.storagePolicy`),
    rawAnswerTextStored: assertFalse(value.rawAnswerTextStored, "rawAnswerTextStored", `${sourceName}.storagePolicy`),
    rawLearnerTextStored: assertFalse(value.rawLearnerTextStored, "rawLearnerTextStored", `${sourceName}.storagePolicy`),
  };
}

function assertNoForbiddenBoundary(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenBoundary(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_CLAIM_PATTERN.test(value)) {
      throw new Error(`${sourceName} ${trail} contains a prohibited official grading, score, pass/fail, model-answer, or guarantee claim`);
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains forbidden raw/source/learner field ${key} at ${trail}`);
    }
    assertNoForbiddenBoundary(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function assertNoAnnualValuesInStableRegistry(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAnnualValuesInStableRegistry(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nestedValue] of Object.entries(value)) {
    if (ANNUAL_ONLY_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains annual-only field ${key} at ${trail}; use annual_notices/*.json`);
    }
    assertNoAnnualValuesInStableRegistry(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function assertRecordSourceIds(sourceIds: string[], sourceName: string, knownSourceIds: Set<string>) {
  if (sourceIds.length === 0) throw new Error(`${sourceName} sourceIds must not be empty`);
  for (const sourceId of sourceIds) {
    if (!knownSourceIds.has(sourceId)) throw new Error(`${sourceName} uses unknown sourceId ${sourceId}`);
  }
}

function validateProvenanceFields(
  raw: Record<string, unknown>,
  sourceName: string,
  knownSourceIds: Set<string>,
) {
  const sourceIds = assertStringArray(raw.sourceIds, "sourceIds", sourceName);
  assertRecordSourceIds(sourceIds, sourceName, knownSourceIds);
  const effectiveFrom = assertDateString(raw.effectiveFrom, "effectiveFrom", sourceName);
  const effectiveTo = assertOptionalDateString(raw.effectiveTo, "effectiveTo", sourceName);
  const status = assertStatus(raw.status, "status", sourceName);
  const lastOfficialVerifiedAt = assertDateString(raw.lastOfficialVerifiedAt, "lastOfficialVerifiedAt", sourceName);
  const needsManualRecheckBy = assertDateString(raw.needsManualRecheckBy, "needsManualRecheckBy", sourceName);

  if (effectiveTo !== undefined && effectiveTo < effectiveFrom) {
    throw new Error(`${sourceName} effectiveTo must not be before effectiveFrom`);
  }
  if (status === "verified" && sourceIds.length === 0) {
    throw new Error(`${sourceName} verified record must have provenance sourceIds`);
  }
  if (status === "draft" && raw.productionFacing === true) {
    throw new Error(`${sourceName} production-facing official facts must not be draft`);
  }

  return {
    sourceIds,
    effectiveFrom,
    ...(effectiveTo === undefined ? {} : { effectiveTo }),
    status,
    lastOfficialVerifiedAt,
    needsManualRecheckBy,
    ...(raw.productionFacing === undefined ? {} : { productionFacing: assertBoolean(raw.productionFacing, "productionFacing", sourceName) }),
  };
}

function isVerifiedRecordStale(record: { status: OfficialRegistryStatus; needsManualRecheckBy: string }, asOfDate: string) {
  return record.status === "verified" && record.needsManualRecheckBy < asOfDate;
}

function assertProductionFacingSafe(
  record: { id: string; status: OfficialRegistryStatus; needsManualRecheckBy: string; productionFacing?: boolean },
  sourceName: string,
  asOfDate: string,
) {
  if (record.productionFacing !== true) return;
  if (record.status !== "verified") {
    throw new Error(`${sourceName} production-facing official fact ${record.id} must be verified`);
  }
  if (isVerifiedRecordStale(record, asOfDate)) {
    throw new Error(`${sourceName} production-facing official fact ${record.id} is stale`);
  }
}

function validateOfficialSourceRegistry(raw: unknown): OfficialSourceRegistry {
  const sourceName = "official_sources.json";
  assertRecord(raw, sourceName);
  if (!Array.isArray(raw.sources)) throw new Error(`${sourceName} sources must be an array`);
  const sources = raw.sources.map((entry, index) => {
    const entryName = `${sourceName}.sources[${index}]`;
    assertRecord(entry, entryName);
    return {
      id: assertString(entry.id, "id", entryName),
      sourceName: assertString(entry.sourceName, "sourceName", entryName),
      sourceUrl: assertHttpsUrl(entry.sourceUrl, "sourceUrl", entryName),
      sourceKind: assertString(entry.sourceKind, "sourceKind", entryName),
      needsManualRecheckBy: assertDateString(entry.needsManualRecheckBy, "needsManualRecheckBy", entryName),
    };
  });
  const ids = sources.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${sourceName} contains duplicate source id`);
  return { sources };
}

function validateSyllabusRecord(
  raw: unknown,
  sourceName: string,
  knownSourceIds: Set<string>,
  asOfDate: string,
): OfficialSyllabusRecord {
  assertRecord(raw, sourceName);
  const record = {
    id: assertString(raw.id, "id", sourceName),
    scope: assertScope(raw.scope, "scope", sourceName),
    recordType: assertString(raw.recordType, "recordType", sourceName),
    ...validateProvenanceFields(raw, sourceName, knownSourceIds),
  };
  assertProductionFacingSafe(record, sourceName, asOfDate);
  return record;
}

function validateSubjectRecord(
  raw: unknown,
  sourceName: string,
  knownSourceIds: Set<string>,
  asOfDate: string,
): OfficialSubjectRecord {
  assertRecord(raw, sourceName);
  const base = validateSyllabusRecord(raw, sourceName, knownSourceIds, asOfDate);
  if (base.recordType !== "official_subject") throw new Error(`${sourceName} recordType must be official_subject`);
  const subjectKey = assertString(raw.subjectKey, "subjectKey", sourceName);
  if (subjectKey !== "practice" && subjectKey !== "theory" && subjectKey !== "law") {
    throw new Error(`${sourceName} subjectKey must be practice, theory, or law`);
  }
  return {
    ...base,
    recordType: "official_subject",
    subjectKey,
    officialSubjectLabelKo: assertString(raw.officialSubjectLabelKo, "officialSubjectLabelKo", sourceName),
    officialSubjectOrder: assertNumber(raw.officialSubjectOrder, "officialSubjectOrder", sourceName),
    editorialSubjectId: assertString(raw.editorialSubjectId, "editorialSubjectId", sourceName),
  };
}

function validateOfficialSyllabusRegistry(
  raw: unknown,
  knownSourceIds: Set<string>,
  asOfDate: string,
): OfficialSyllabusRegistry {
  const sourceName = "official_syllabus.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenBoundary(raw, sourceName);
  assertNoAnnualValuesInStableRegistry(raw, sourceName);
  const sourceIds = assertStringArray(raw.sourceIds, "sourceIds", sourceName);
  assertRecordSourceIds(sourceIds, sourceName, knownSourceIds);
  if (Array.isArray(raw.unresolvedOfficialSourceConflicts) && raw.unresolvedOfficialSourceConflicts.length > 0) {
    throw new Error(`${sourceName} has unresolved official source conflicts`);
  }
  if (!Array.isArray(raw.qualificationStageRecords)) throw new Error(`${sourceName} qualificationStageRecords must be an array`);
  if (!Array.isArray(raw.subjectRecords)) throw new Error(`${sourceName} subjectRecords must be an array`);
  if (!Array.isArray(raw.deprecatedRecords)) throw new Error(`${sourceName} deprecatedRecords must be an array`);
  const qualificationStageRecords = raw.qualificationStageRecords.map((entry, index) => (
    validateSyllabusRecord(entry, `${sourceName}.qualificationStageRecords[${index}]`, knownSourceIds, asOfDate)
  ));
  const subjectRecords = raw.subjectRecords.map((entry, index) => (
    validateSubjectRecord(entry, `${sourceName}.subjectRecords[${index}]`, knownSourceIds, asOfDate)
  ));
  const deprecatedRecords = raw.deprecatedRecords.map((entry, index) => (
    validateSyllabusRecord(entry, `${sourceName}.deprecatedRecords[${index}]`, knownSourceIds, asOfDate)
  ));
  assertUniqueIds([...qualificationStageRecords, ...subjectRecords, ...deprecatedRecords], sourceName);

  const currentSubjectLabels = subjectRecords
    .filter((record) => record.status === "verified" && record.scope === "second_round" && !record.effectiveTo)
    .sort((left, right) => left.officialSubjectOrder - right.officialSubjectOrder)
    .map((record) => record.officialSubjectLabelKo);
  if (currentSubjectLabels.length !== 3 || EXPECTED_SECOND_ROUND_SUBJECTS.some((label, index) => currentSubjectLabels[index] !== label)) {
    throw new Error(`${sourceName} must contain exactly the three current 감정평가사 2차 official subject records`);
  }

  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryScope: assertString(raw.registryScope, "registryScope", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    lastReviewedAt: assertDateString(raw.lastReviewedAt, "lastReviewedAt", sourceName),
    currentAsOf: assertDateString(raw.currentAsOf, "currentAsOf", sourceName),
    sourceIds,
    qualificationStageRecords,
    subjectRecords,
    deprecatedRecords,
    unresolvedOfficialSourceConflicts: raw.unresolvedOfficialSourceConflicts as unknown[],
  };
}

function validateExamRuleRecord(
  raw: unknown,
  sourceName: string,
  knownSourceIds: Set<string>,
  asOfDate: string,
): ExamRuleRecord {
  assertRecord(raw, sourceName);
  const record = {
    id: assertString(raw.id, "id", sourceName),
    scope: assertScope(raw.scope, "scope", sourceName),
    ruleKey: assertString(raw.ruleKey, "ruleKey", sourceName),
    value: raw.value,
    ...validateProvenanceFields(raw, sourceName, knownSourceIds),
  };
  if (record.value === undefined) throw new Error(`${sourceName} is missing required field value`);
  assertProductionFacingSafe(record, sourceName, asOfDate);
  return record;
}

function validateExamRuleRegistry(
  raw: unknown,
  knownSourceIds: Set<string>,
  asOfDate: string,
): ExamRuleRegistry {
  const sourceName = "exam_rules.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenBoundary(raw, sourceName);
  assertNoAnnualValuesInStableRegistry(raw, sourceName);
  const sourceIds = assertStringArray(raw.sourceIds, "sourceIds", sourceName);
  assertRecordSourceIds(sourceIds, sourceName, knownSourceIds);
  if (Array.isArray(raw.unresolvedOfficialSourceConflicts) && raw.unresolvedOfficialSourceConflicts.length > 0) {
    throw new Error(`${sourceName} has unresolved official source conflicts`);
  }
  if (!Array.isArray(raw.rules)) throw new Error(`${sourceName} rules must be an array`);
  if (!Array.isArray(raw.deprecatedRecords)) throw new Error(`${sourceName} deprecatedRecords must be an array`);
  const rules = raw.rules.map((entry, index) => validateExamRuleRecord(entry, `${sourceName}.rules[${index}]`, knownSourceIds, asOfDate));
  const deprecatedRecords = raw.deprecatedRecords.map((entry, index) => (
    validateExamRuleRecord(entry, `${sourceName}.deprecatedRecords[${index}]`, knownSourceIds, asOfDate)
  ));
  assertUniqueIds([...rules, ...deprecatedRecords], sourceName);
  assertNoOverlappingCurrentRules(rules);

  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryScope: assertString(raw.registryScope, "registryScope", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    lastReviewedAt: assertDateString(raw.lastReviewedAt, "lastReviewedAt", sourceName),
    currentAsOf: assertDateString(raw.currentAsOf, "currentAsOf", sourceName),
    sourceIds,
    rules,
    deprecatedRecords,
    unresolvedOfficialSourceConflicts: raw.unresolvedOfficialSourceConflicts as unknown[],
  };
}

function validateAnnualNoticeValueRecord(
  raw: unknown,
  sourceName: string,
  knownSourceIds: Set<string>,
  asOfDate: string,
): AnnualNoticeValueRecord {
  assertRecord(raw, sourceName);
  const record = {
    id: assertString(raw.id, "id", sourceName),
    scope: assertScope(raw.scope, "scope", sourceName),
    valueKey: assertString(raw.valueKey, "valueKey", sourceName),
    value: raw.value,
    ...validateProvenanceFields(raw, sourceName, knownSourceIds),
  };
  if (record.value === undefined) throw new Error(`${sourceName} is missing required field value`);
  if (!record.effectiveTo) throw new Error(`${sourceName} annual value must include effectiveTo`);
  assertProductionFacingSafe(record, sourceName, asOfDate);
  return record as AnnualNoticeValueRecord;
}

function validateAnnualNoticeRegistry(
  raw: unknown,
  knownSourceIds: Set<string>,
  sourceName: string,
  asOfDate: string,
): AnnualNoticeRegistry {
  assertRecord(raw, sourceName);
  assertNoForbiddenBoundary(raw, sourceName);
  const sourceIds = assertStringArray(raw.sourceIds, "sourceIds", sourceName);
  assertRecordSourceIds(sourceIds, sourceName, knownSourceIds);
  if (Array.isArray(raw.unresolvedOfficialSourceConflicts) && raw.unresolvedOfficialSourceConflicts.length > 0) {
    throw new Error(`${sourceName} has unresolved official source conflicts`);
  }
  assertRecord(raw.noticeMetadata, `${sourceName}.noticeMetadata`);
  if (!Array.isArray(raw.annualValues)) throw new Error(`${sourceName} annualValues must be an array`);
  if (!Array.isArray(raw.annualOverrides)) throw new Error(`${sourceName} annualOverrides must be an array`);
  const annualValues = raw.annualValues.map((entry, index) => (
    validateAnnualNoticeValueRecord(entry, `${sourceName}.annualValues[${index}]`, knownSourceIds, asOfDate)
  ));
  const annualOverrides = raw.annualOverrides.map((entry, index) => (
    validateAnnualNoticeValueRecord(entry, `${sourceName}.annualOverrides[${index}]`, knownSourceIds, asOfDate)
  ));
  assertUniqueIds([...annualValues, ...annualOverrides], sourceName);

  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryScope: assertString(raw.registryScope, "registryScope", sourceName),
    noticeYear: assertNumber(raw.noticeYear, "noticeYear", sourceName),
    examRound: assertNumber(raw.examRound, "examRound", sourceName),
    qualificationNameKo: assertString(raw.qualificationNameKo, "qualificationNameKo", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    lastReviewedAt: assertDateString(raw.lastReviewedAt, "lastReviewedAt", sourceName),
    currentAsOf: assertDateString(raw.currentAsOf, "currentAsOf", sourceName),
    sourceIds,
    noticeMetadata: {
      noticeTitleKo: assertString(raw.noticeMetadata.noticeTitleKo, "noticeTitleKo", `${sourceName}.noticeMetadata`),
      noticePublishedAt: raw.noticeMetadata.noticePublishedAt === null
        ? null
        : assertDateString(raw.noticeMetadata.noticePublishedAt, "noticePublishedAt", `${sourceName}.noticeMetadata`),
      officialNoticeUrl: assertHttpsUrl(raw.noticeMetadata.officialNoticeUrl, "officialNoticeUrl", `${sourceName}.noticeMetadata`),
      noticeBodyStored: assertFalse(raw.noticeMetadata.noticeBodyStored, "noticeBodyStored", `${sourceName}.noticeMetadata`),
      attachmentBodyStored: assertFalse(raw.noticeMetadata.attachmentBodyStored, "attachmentBodyStored", `${sourceName}.noticeMetadata`),
      sourceNote: assertString(raw.noticeMetadata.sourceNote, "sourceNote", `${sourceName}.noticeMetadata`),
    },
    annualValues,
    annualOverrides,
    unresolvedOfficialSourceConflicts: raw.unresolvedOfficialSourceConflicts as unknown[],
  };
}

function assertUniqueIds(records: Array<{ id: string }>, sourceName: string) {
  const ids = records.map((record) => record.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) throw new Error(`${sourceName} contains duplicate ids: ${[...new Set(duplicates)].join(", ")}`);
}

function rangeEnd(record: { effectiveTo?: string }) {
  return record.effectiveTo ?? "9999-12-31";
}

function rangesOverlap(
  left: { effectiveFrom: string; effectiveTo?: string },
  right: { effectiveFrom: string; effectiveTo?: string },
) {
  return left.effectiveFrom <= rangeEnd(right) && right.effectiveFrom <= rangeEnd(left);
}

function assertNoOverlappingCurrentRules(rules: ExamRuleRecord[]) {
  const currentRules = rules.filter((rule) => rule.status !== "deprecated");
  for (let leftIndex = 0; leftIndex < currentRules.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < currentRules.length; rightIndex += 1) {
      const left = currentRules[leftIndex];
      const right = currentRules[rightIndex];
      if (left.scope === right.scope && left.ruleKey === right.ruleKey && rangesOverlap(left, right)) {
        throw new Error(`exam_rules.json has overlapping effective ranges for ${left.scope}:${left.ruleKey}`);
      }
    }
  }
}

function countStatus(records: Array<{ status: OfficialRegistryStatus }>, status: OfficialRegistryStatus) {
  return records.filter((record) => record.status === status).length;
}

export function summarizeSecondRoundOfficialRegistry(
  officialSyllabus: OfficialSyllabusRegistry,
  examRules: ExamRuleRegistry,
  annualNotices: AnnualNoticeRegistry[],
  asOfDate = new Date().toISOString().slice(0, 10),
): SecondRoundOfficialRegistrySummary {
  const allRecords = [
    ...officialSyllabus.qualificationStageRecords,
    ...officialSyllabus.subjectRecords,
    ...officialSyllabus.deprecatedRecords,
    ...examRules.rules,
    ...examRules.deprecatedRecords,
    ...annualNotices.flatMap((notice) => [...notice.annualValues, ...notice.annualOverrides]),
  ];
  const staleVerifiedRecordIds = allRecords
    .filter((record) => isVerifiedRecordStale(record, asOfDate))
    .map((record) => record.id);
  const unresolvedOfficialSourceConflicts = [
    ...officialSyllabus.unresolvedOfficialSourceConflicts,
    ...examRules.unresolvedOfficialSourceConflicts,
    ...annualNotices.flatMap((notice) => notice.unresolvedOfficialSourceConflicts),
  ].length;
  return {
    status: staleVerifiedRecordIds.length > 0 || unresolvedOfficialSourceConflicts > 0 ? "needs_update" : "current",
    currentOfficialSubjects: officialSyllabus.subjectRecords
      .filter((record) => record.status === "verified" && !record.effectiveTo)
      .sort((left, right) => left.officialSubjectOrder - right.officialSubjectOrder)
      .map((record) => record.officialSubjectLabelKo),
    officialSubjectCount: officialSyllabus.subjectRecords.filter((record) => record.status !== "deprecated").length,
    currentRuleCount: examRules.rules.filter((record) => record.status !== "deprecated").length,
    annualNoticeYears: annualNotices.map((notice) => notice.noticeYear).sort(),
    verifiedRecords: countStatus(allRecords, "verified"),
    draftRecords: countStatus(allRecords, "draft"),
    needsUpdateRecords: countStatus(allRecords, "needs_update"),
    deprecatedRecords: countStatus(allRecords, "deprecated"),
    staleVerifiedRecordIds,
    unresolvedOfficialSourceConflicts,
  };
}

export function loadOfficialSourceRegistry(config: OfficialSyllabusRegistryLoaderConfig = {}): OfficialSourceRegistry {
  const filePath = config.officialSourceRegistryPath
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), config.officialSourceRegistryPath)
    : path.join(sourceDir(config), "official_sources.json");
  return validateOfficialSourceRegistry(readJsonFile(filePath));
}

export function loadOfficialSyllabusRegistry(config: OfficialSyllabusRegistryLoaderConfig = {}): OfficialSyllabusRegistry {
  const officialSources = loadOfficialSourceRegistry(config);
  const knownSourceIds = new Set(officialSources.sources.map((source) => source.id));
  const filePath = config.officialSyllabusPath
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), config.officialSyllabusPath)
    : path.join(sourceDir(config), "official_syllabus.json");
  return validateOfficialSyllabusRegistry(readJsonFile(filePath), knownSourceIds, config.asOfDate ?? new Date().toISOString().slice(0, 10));
}

export function loadExamRuleRegistry(config: OfficialSyllabusRegistryLoaderConfig = {}): ExamRuleRegistry {
  const officialSources = loadOfficialSourceRegistry(config);
  const knownSourceIds = new Set(officialSources.sources.map((source) => source.id));
  const filePath = config.examRulesPath
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), config.examRulesPath)
    : path.join(sourceDir(config), "exam_rules.json");
  return validateExamRuleRegistry(readJsonFile(filePath), knownSourceIds, config.asOfDate ?? new Date().toISOString().slice(0, 10));
}

export function loadAnnualNoticeRegistry(
  filePath: string,
  config: OfficialSyllabusRegistryLoaderConfig = {},
): AnnualNoticeRegistry {
  const officialSources = loadOfficialSourceRegistry(config);
  const knownSourceIds = new Set(officialSources.sources.map((source) => source.id));
  return validateAnnualNoticeRegistry(
    readJsonFile(path.resolve(/* turbopackIgnore: true */ process.cwd(), filePath)),
    knownSourceIds,
    filePath,
    config.asOfDate ?? new Date().toISOString().slice(0, 10),
  );
}

export function loadSecondRoundOfficialRegistryReference(
  config: OfficialSyllabusRegistryLoaderConfig = {},
): SecondRoundOfficialRegistryReference {
  const asOfDate = config.asOfDate ?? new Date().toISOString().slice(0, 10);
  const officialSources = loadOfficialSourceRegistry(config);
  const knownSourceIds = new Set(officialSources.sources.map((source) => source.id));
  const officialSyllabusPath = config.officialSyllabusPath
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), config.officialSyllabusPath)
    : path.join(sourceDir(config), "official_syllabus.json");
  const examRulesPath = config.examRulesPath
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), config.examRulesPath)
    : path.join(sourceDir(config), "exam_rules.json");
  const officialSyllabus = validateOfficialSyllabusRegistry(readJsonFile(officialSyllabusPath), knownSourceIds, asOfDate);
  const examRules = validateExamRuleRegistry(readJsonFile(examRulesPath), knownSourceIds, asOfDate);
  const annualNoticePaths = config.annualNoticePaths ?? [path.join(sourceDir(config), "annual_notices", "2026.json")];
  const annualNotices = annualNoticePaths.map((noticePath) => validateAnnualNoticeRegistry(
    readJsonFile(path.resolve(/* turbopackIgnore: true */ process.cwd(), noticePath)),
    knownSourceIds,
    noticePath,
    asOfDate,
  ));
  const summary = summarizeSecondRoundOfficialRegistry(officialSyllabus, examRules, annualNotices, asOfDate);
  if (summary.staleVerifiedRecordIds.length > 0) {
    throw new Error(`Second-round official registry has stale verified records: ${summary.staleVerifiedRecordIds.join(", ")}`);
  }
  return {
    officialSources,
    officialSyllabus,
    examRules,
    annualNotices,
    summary,
  };
}
