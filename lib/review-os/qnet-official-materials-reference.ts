import { readFileSync } from "node:fs";
import path from "node:path";

export type QnetAppraiserExamMode = "first" | "second";

export type QnetMetadataStoragePolicy = {
  rawTextStored: false;
  copyrightedTextStored: false;
  metadataOnly: true;
};

export type QnetAppraiserMaterial = {
  sourceId: string;
  officialSourceId: "qnet_appraiser_past_questions";
  sourceKind: string;
  sourceName: string;
  sourceUrl: string;
  localRawFileNameHash: string;
  examYear: number;
  examRound: number;
  examMode: QnetAppraiserExamMode;
  subject: string;
  paper: string;
  questionNumber: string;
  itemType: string;
  topicCandidates: string[];
  curriculumNodeCandidates: string[];
  issueCandidates: string[];
  trapWordCandidates: string[];
  answerSkeletonTags: string[];
  calculationTemplateCandidates: string[];
  casioRelevant: boolean;
  estimatedMinutes: number;
  difficultyBand: string;
  sourceStatus: string;
  lastOfficialVerifiedAt: string;
  needsOfficialVerification: boolean;
  rawTextStored: false;
  copyrightedTextStored: false;
  safeNotes: string | null;
};

export type QnetAppraiserMaterialsIndex = {
  schemaVersion: string;
  generatedBy: string;
  generatedAt: string;
  inputManifestPath: string;
  manifestName: string;
  storagePolicy: QnetMetadataStoragePolicy;
  materials: QnetAppraiserMaterial[];
};

export type QnetAppraiserSourceMapEntry = {
  officialSourceId: "qnet_appraiser_past_questions";
  sourceKind: string;
  sourceName: string;
  sourceUrl: string;
  sourceStatusCounts: Record<string, number>;
  materialCount: number;
  sourceIds: string[];
  rawTextStored: false;
  copyrightedTextStored: false;
};

export type QnetAppraiserSourceMap = {
  schemaVersion: string;
  generatedBy: string;
  generatedAt: string;
  inputManifestPath: string;
  storagePolicy: QnetMetadataStoragePolicy;
  sources: QnetAppraiserSourceMapEntry[];
};

export type QnetAppraiserTopicFrequencyEntry = {
  examMode: QnetAppraiserExamMode;
  subject: string;
  topic: string;
  count: number;
  sourceIds: string[];
  rawTextStored: false;
  copyrightedTextStored: false;
};

export type QnetAppraiserTopicFrequency = {
  schemaVersion: string;
  generatedBy: string;
  generatedAt: string;
  inputManifestPath: string;
  storagePolicy: QnetMetadataStoragePolicy;
  topicFrequency: QnetAppraiserTopicFrequencyEntry[];
};

export type QnetAppraiserOfficialSourceRegistryEntry = {
  id: "qnet_appraiser_past_questions";
  sourceName: string;
  sourceUrl: string;
  sourceKind: string;
};

export type QnetAppraiserOfficialMaterialsReference = {
  materialsIndex: QnetAppraiserMaterialsIndex;
  sourceMap: QnetAppraiserSourceMap;
  topicFrequency: QnetAppraiserTopicFrequency;
  officialSource: QnetAppraiserOfficialSourceRegistryEntry;
};

export type QnetAppraiserOfficialMaterialsReferenceConfig = {
  sourceDir?: string;
  materialsIndexPath?: string;
  sourceMapPath?: string;
  topicFrequencyPath?: string;
  officialSourceRegistryPath?: string;
};

export type QnetReferenceSignalInput = {
  examMode?: QnetAppraiserExamMode;
  subject?: string;
  topicCandidates?: string[];
  curriculumNodeCandidates?: string[];
  trapWordCandidates?: string[];
  answerSkeletonTags?: string[];
};

export type QnetTopicFrequencySignal = {
  examMode: QnetAppraiserExamMode;
  subject: string;
  topic: string;
  count: number;
  sourceIds: string[];
  matchedInputLabels: string[];
  matchWeight: number;
  rawTextStored: false;
  copyrightedTextStored: false;
};

export type QnetReferenceSignals = {
  officialSourceIds: string[];
  sourceUrls: string[];
  sourceIds: string[];
  materialCount: number;
  topicFrequencySignals: QnetTopicFrequencySignal[];
  topicCandidates: string[];
  curriculumNodeCandidates: string[];
  issueCandidates: string[];
  trapPatternCandidates: string[];
  answerSkeletonTags: string[];
  calculationTemplateCandidates: string[];
  casioRelevant: boolean;
  rawTextStored: false;
  copyrightedTextStored: false;
  metadataOnly: true;
  safeUse: "metadata_reference_only";
};

const DEFAULT_SOURCE_DIR_PARTS = ["reference_corpus", "official_materials", "appraiser"] as const;
const DEFAULT_REGISTRY_PATH_PARTS = ["reference_corpus", "curriculum", "appraiser", "official_sources.json"] as const;
const QNET_APPRAISER_OFFICIAL_SOURCE_ID = "qnet_appraiser_past_questions";
const MAX_TOPIC_FREQUENCY_SIGNALS = 8;
const MAX_REFERENCE_MATERIALS = 6;
const MAX_SAFE_STRING_LENGTH = 220;

const REJECTED_RAW_OR_SCORING_FIELD_NAMES = new Set([
  "rawText",
  "rawProblemText",
  "rawQuestionText",
  "rawAnswerText",
  "rawOcrText",
  "problemText",
  "questionText",
  "answerText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "officialModelAnswer",
  "ocrText",
  "ocrFullText",
  "fullText",
  "sourceExcerpt",
  "sourceText",
  "copyrightedText",
  "fullQuestion",
  "fullAnswer",
  "score",
  "officialScore",
  "predictedScore",
  "passFail",
  "passGuarantee",
  "instructorComment",
]);

function resolveConfiguredPath(customPath: string | undefined, fallbackParts: readonly string[]) {
  if (customPath) return path.resolve(/* turbopackIgnore: true */ process.cwd(), customPath);
  return path.join(process.cwd(), ...fallbackParts);
}

function sourceDir(config: QnetAppraiserOfficialMaterialsReferenceConfig = {}) {
  return resolveConfiguredPath(
    config.sourceDir ?? process.env.QNET_APPRAISER_OFFICIAL_MATERIALS_REFERENCE_DIR,
    DEFAULT_SOURCE_DIR_PARTS,
  );
}

function sourceFilePath(
  config: QnetAppraiserOfficialMaterialsReferenceConfig,
  explicitPath: string | undefined,
  fileName: string,
) {
  if (explicitPath) return path.resolve(/* turbopackIgnore: true */ process.cwd(), explicitPath);
  return path.join(sourceDir(config), fileName);
}

function registryPath(config: QnetAppraiserOfficialMaterialsReferenceConfig = {}) {
  return resolveConfiguredPath(
    config.officialSourceRegistryPath ?? process.env.QNET_APPRAISER_OFFICIAL_SOURCE_REGISTRY_PATH,
    DEFAULT_REGISTRY_PATH_PARTS,
  );
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
  if (value.length > MAX_SAFE_STRING_LENGTH) {
    throw new Error(`${sourceName} field ${fieldName} is too long for metadata-only reference use`);
  }
  return value;
}

function assertOptionalSafeNote(value: unknown, fieldName: string, sourceName: string) {
  if (value === null || value === undefined) return null;
  const note = assertString(value, fieldName, sourceName);
  if (note.length > 120 || /[\r\n]/.test(note)) {
    throw new Error(`${sourceName} field ${fieldName} must be a short operational note`);
  }
  return note;
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string, options: { allowEmpty?: boolean } = {}) {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0)) {
    throw new Error(`${sourceName} field ${fieldName} must be an array of strings`);
  }
  return value.map((entry, index) => assertString(entry, `${fieldName}[${index}]`, sourceName));
}

function assertFiniteNumber(value: unknown, fieldName: string, sourceName: string, options: { min?: number } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${sourceName} field ${fieldName} must be a finite number`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${sourceName} field ${fieldName} must be >= ${options.min}`);
  }
  return value;
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

function assertExamMode(value: unknown, fieldName: string, sourceName: string): QnetAppraiserExamMode {
  const examMode = assertString(value, fieldName, sourceName);
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`${sourceName} field ${fieldName} must be first or second`);
  }
  return examMode;
}

function assertOfficialSourceId(value: unknown, fieldName: string, sourceName: string): "qnet_appraiser_past_questions" {
  const sourceId = assertString(value, fieldName, sourceName);
  if (sourceId !== QNET_APPRAISER_OFFICIAL_SOURCE_ID) {
    throw new Error(`${sourceName} field ${fieldName} must be ${QNET_APPRAISER_OFFICIAL_SOURCE_ID}`);
  }
  return QNET_APPRAISER_OFFICIAL_SOURCE_ID;
}

function assertStoragePolicy(value: unknown, sourceName: string): QnetMetadataStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    rawTextStored: assertFalse(value.rawTextStored, "rawTextStored", `${sourceName}.storagePolicy`),
    copyrightedTextStored: assertFalse(value.copyrightedTextStored, "copyrightedTextStored", `${sourceName}.storagePolicy`),
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
  };
}

function assertNoRejectedRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRejectedRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (REJECTED_RAW_OR_SCORING_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains rejected raw/scoring field ${key} at ${trail}`);
    }
    if (typeof nestedValue === "string" && nestedValue.length > MAX_SAFE_STRING_LENGTH) {
      throw new Error(`${sourceName} contains overlong string at ${trail}.${key}`);
    }
    assertNoRejectedRawFields(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function assertRegistrySource(config: QnetAppraiserOfficialMaterialsReferenceConfig = {}): QnetAppraiserOfficialSourceRegistryEntry {
  const registry = readJsonFile(registryPath(config));
  assertRecord(registry, "official_sources.json");
  if (!Array.isArray(registry.sources)) throw new Error("official_sources.json sources must be an array");
  const source = registry.sources.find((entry) => isRecord(entry) && entry.id === QNET_APPRAISER_OFFICIAL_SOURCE_ID);
  assertRecord(source, `official_sources.${QNET_APPRAISER_OFFICIAL_SOURCE_ID}`);
  return {
    id: assertOfficialSourceId(source.id, "id", `official_sources.${QNET_APPRAISER_OFFICIAL_SOURCE_ID}`),
    sourceName: assertString(source.sourceName, "sourceName", `official_sources.${QNET_APPRAISER_OFFICIAL_SOURCE_ID}`),
    sourceUrl: assertString(source.sourceUrl, "sourceUrl", `official_sources.${QNET_APPRAISER_OFFICIAL_SOURCE_ID}`),
    sourceKind: assertString(source.sourceKind, "sourceKind", `official_sources.${QNET_APPRAISER_OFFICIAL_SOURCE_ID}`),
  };
}

function assertCanonicalSourceMetadata(
  raw: Record<string, unknown>,
  sourceName: string,
  officialSource: QnetAppraiserOfficialSourceRegistryEntry,
) {
  const officialSourceId = assertOfficialSourceId(raw.officialSourceId, "officialSourceId", sourceName);
  const sourceUrl = assertString(raw.sourceUrl, "sourceUrl", sourceName);
  if (sourceUrl !== officialSource.sourceUrl) {
    throw new Error(`${sourceName} sourceUrl must match official source registry`);
  }
  const sourceKind = assertString(raw.sourceKind, "sourceKind", sourceName);
  if (sourceKind !== officialSource.sourceKind) {
    throw new Error(`${sourceName} sourceKind must match official source registry`);
  }
  const sourceNameValue = assertString(raw.sourceName, "sourceName", sourceName);
  if (sourceNameValue !== officialSource.sourceName) {
    throw new Error(`${sourceName} sourceName must match official source registry`);
  }
  return { officialSourceId, sourceUrl, sourceKind, sourceName: sourceNameValue };
}

function validateMaterial(raw: unknown, sourceName: string, officialSource: QnetAppraiserOfficialSourceRegistryEntry): QnetAppraiserMaterial {
  assertRecord(raw, sourceName);
  assertNoRejectedRawFields(raw, sourceName);
  const sourceMetadata = assertCanonicalSourceMetadata(raw, sourceName, officialSource);
  const localRawFileNameHash = assertString(raw.localRawFileNameHash, "localRawFileNameHash", sourceName);
  if (!/^[a-f0-9]{64}$/.test(localRawFileNameHash)) {
    throw new Error(`${sourceName} localRawFileNameHash must be a sha256 hex digest`);
  }
  return {
    sourceId: assertString(raw.sourceId, "sourceId", sourceName),
    ...sourceMetadata,
    localRawFileNameHash,
    examYear: assertFiniteNumber(raw.examYear, "examYear", sourceName, { min: 2000 }),
    examRound: assertFiniteNumber(raw.examRound, "examRound", sourceName, { min: 1 }),
    examMode: assertExamMode(raw.examMode, "examMode", sourceName),
    subject: assertString(raw.subject, "subject", sourceName),
    paper: assertString(raw.paper, "paper", sourceName),
    questionNumber: assertString(raw.questionNumber, "questionNumber", sourceName),
    itemType: assertString(raw.itemType, "itemType", sourceName),
    topicCandidates: assertStringArray(raw.topicCandidates, "topicCandidates", sourceName),
    curriculumNodeCandidates: assertStringArray(raw.curriculumNodeCandidates, "curriculumNodeCandidates", sourceName),
    issueCandidates: assertStringArray(raw.issueCandidates, "issueCandidates", sourceName),
    trapWordCandidates: assertStringArray(raw.trapWordCandidates, "trapWordCandidates", sourceName),
    answerSkeletonTags: assertStringArray(raw.answerSkeletonTags, "answerSkeletonTags", sourceName, { allowEmpty: true }),
    calculationTemplateCandidates: assertStringArray(raw.calculationTemplateCandidates, "calculationTemplateCandidates", sourceName, { allowEmpty: true }),
    casioRelevant: assertBoolean(raw.casioRelevant, "casioRelevant", sourceName),
    estimatedMinutes: assertFiniteNumber(raw.estimatedMinutes, "estimatedMinutes", sourceName, { min: 0 }),
    difficultyBand: assertString(raw.difficultyBand, "difficultyBand", sourceName),
    sourceStatus: assertString(raw.sourceStatus, "sourceStatus", sourceName),
    lastOfficialVerifiedAt: assertString(raw.lastOfficialVerifiedAt, "lastOfficialVerifiedAt", sourceName),
    needsOfficialVerification: assertBoolean(raw.needsOfficialVerification, "needsOfficialVerification", sourceName),
    rawTextStored: assertFalse(raw.rawTextStored, "rawTextStored", sourceName),
    copyrightedTextStored: assertFalse(raw.copyrightedTextStored, "copyrightedTextStored", sourceName),
    safeNotes: assertOptionalSafeNote(raw.safeNotes, "safeNotes", sourceName),
  };
}

function validateMaterialsIndex(raw: unknown, officialSource: QnetAppraiserOfficialSourceRegistryEntry): QnetAppraiserMaterialsIndex {
  const sourceName = "qnet_appraiser_materials_index.json";
  assertRecord(raw, sourceName);
  assertNoRejectedRawFields(raw, sourceName);
  if (!Array.isArray(raw.materials)) throw new Error(`${sourceName} materials must be an array`);
  const materials = raw.materials.map((entry, index) => validateMaterial(entry, `${sourceName}.materials[${index}]`, officialSource));
  const sourceIds = materials.map((material) => material.sourceId);
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error(`${sourceName} contains duplicate sourceId values`);
  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertString(raw.generatedAt, "generatedAt", sourceName),
    inputManifestPath: assertString(raw.inputManifestPath, "inputManifestPath", sourceName),
    manifestName: assertString(raw.manifestName, "manifestName", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    materials,
  };
}

function validateSourceMapEntry(
  raw: unknown,
  sourceName: string,
  officialSource: QnetAppraiserOfficialSourceRegistryEntry,
): QnetAppraiserSourceMapEntry {
  assertRecord(raw, sourceName);
  assertNoRejectedRawFields(raw, sourceName);
  const sourceMetadata = assertCanonicalSourceMetadata(raw, sourceName, officialSource);
  assertRecord(raw.sourceStatusCounts, `${sourceName}.sourceStatusCounts`);
  const sourceStatusCounts = Object.fromEntries(Object.entries(raw.sourceStatusCounts).map(([status, count]) => [
    status,
    assertFiniteNumber(count, status, `${sourceName}.sourceStatusCounts`, { min: 0 }),
  ]));
  return {
    ...sourceMetadata,
    sourceStatusCounts,
    materialCount: assertFiniteNumber(raw.materialCount, "materialCount", sourceName, { min: 0 }),
    sourceIds: assertStringArray(raw.sourceIds, "sourceIds", sourceName),
    rawTextStored: assertFalse(raw.rawTextStored, "rawTextStored", sourceName),
    copyrightedTextStored: assertFalse(raw.copyrightedTextStored, "copyrightedTextStored", sourceName),
  };
}

function validateSourceMap(raw: unknown, officialSource: QnetAppraiserOfficialSourceRegistryEntry): QnetAppraiserSourceMap {
  const sourceName = "qnet_appraiser_source_map.json";
  assertRecord(raw, sourceName);
  assertNoRejectedRawFields(raw, sourceName);
  if (!Array.isArray(raw.sources)) throw new Error(`${sourceName} sources must be an array`);
  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertString(raw.generatedAt, "generatedAt", sourceName),
    inputManifestPath: assertString(raw.inputManifestPath, "inputManifestPath", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    sources: raw.sources.map((entry, index) => validateSourceMapEntry(entry, `${sourceName}.sources[${index}]`, officialSource)),
  };
}

function validateTopicFrequencyEntry(raw: unknown, sourceName: string): QnetAppraiserTopicFrequencyEntry {
  assertRecord(raw, sourceName);
  assertNoRejectedRawFields(raw, sourceName);
  return {
    examMode: assertExamMode(raw.examMode, "examMode", sourceName),
    subject: assertString(raw.subject, "subject", sourceName),
    topic: assertString(raw.topic, "topic", sourceName),
    count: assertFiniteNumber(raw.count, "count", sourceName, { min: 1 }),
    sourceIds: assertStringArray(raw.sourceIds, "sourceIds", sourceName),
    rawTextStored: assertFalse(raw.rawTextStored, "rawTextStored", sourceName),
    copyrightedTextStored: assertFalse(raw.copyrightedTextStored, "copyrightedTextStored", sourceName),
  };
}

function validateTopicFrequency(raw: unknown): QnetAppraiserTopicFrequency {
  const sourceName = "qnet_appraiser_topic_frequency.json";
  assertRecord(raw, sourceName);
  assertNoRejectedRawFields(raw, sourceName);
  if (!Array.isArray(raw.topicFrequency)) throw new Error(`${sourceName} topicFrequency must be an array`);
  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertString(raw.generatedAt, "generatedAt", sourceName),
    inputManifestPath: assertString(raw.inputManifestPath, "inputManifestPath", sourceName),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    topicFrequency: raw.topicFrequency.map((entry, index) => validateTopicFrequencyEntry(entry, `${sourceName}.topicFrequency[${index}]`)),
  };
}

function validateReferenceConsistency(reference: QnetAppraiserOfficialMaterialsReference) {
  const materialIds = new Set(reference.materialsIndex.materials.map((material) => material.sourceId));
  for (const source of reference.sourceMap.sources) {
    if (source.materialCount !== source.sourceIds.length) {
      throw new Error("qnet_appraiser_source_map.json materialCount must match sourceIds length");
    }
    for (const sourceId of source.sourceIds) {
      if (!materialIds.has(sourceId)) throw new Error(`qnet_appraiser_source_map.json has unknown sourceId ${sourceId}`);
    }
  }
  for (const topic of reference.topicFrequency.topicFrequency) {
    for (const sourceId of topic.sourceIds) {
      const material = reference.materialsIndex.materials.find((entry) => entry.sourceId === sourceId);
      if (!material) throw new Error(`qnet_appraiser_topic_frequency.json has unknown sourceId ${sourceId}`);
      if (material.examMode !== topic.examMode || material.subject !== topic.subject) {
        throw new Error(`qnet_appraiser_topic_frequency.json sourceId ${sourceId} mode/subject mismatch`);
      }
    }
  }
}

export function loadQnetAppraiserMaterialsIndex(
  config: QnetAppraiserOfficialMaterialsReferenceConfig = {},
): QnetAppraiserMaterialsIndex {
  const officialSource = assertRegistrySource(config);
  return validateMaterialsIndex(readJsonFile(sourceFilePath(config, config.materialsIndexPath, "qnet_appraiser_materials_index.json")), officialSource);
}

export function loadQnetAppraiserSourceMap(
  config: QnetAppraiserOfficialMaterialsReferenceConfig = {},
): QnetAppraiserSourceMap {
  const officialSource = assertRegistrySource(config);
  return validateSourceMap(readJsonFile(sourceFilePath(config, config.sourceMapPath, "qnet_appraiser_source_map.json")), officialSource);
}

export function loadQnetAppraiserTopicFrequency(
  config: QnetAppraiserOfficialMaterialsReferenceConfig = {},
): QnetAppraiserTopicFrequency {
  return validateTopicFrequency(readJsonFile(sourceFilePath(config, config.topicFrequencyPath, "qnet_appraiser_topic_frequency.json")));
}

export function loadQnetAppraiserOfficialMaterialsReference(
  config: QnetAppraiserOfficialMaterialsReferenceConfig = {},
): QnetAppraiserOfficialMaterialsReference {
  const officialSource = assertRegistrySource(config);
  const reference = {
    materialsIndex: validateMaterialsIndex(
      readJsonFile(sourceFilePath(config, config.materialsIndexPath, "qnet_appraiser_materials_index.json")),
      officialSource,
    ),
    sourceMap: validateSourceMap(
      readJsonFile(sourceFilePath(config, config.sourceMapPath, "qnet_appraiser_source_map.json")),
      officialSource,
    ),
    topicFrequency: validateTopicFrequency(
      readJsonFile(sourceFilePath(config, config.topicFrequencyPath, "qnet_appraiser_topic_frequency.json")),
    ),
    officialSource,
  };
  validateReferenceConsistency(reference);
  return reference;
}

function ensureReference(reference?: QnetAppraiserOfficialMaterialsReference) {
  return reference ?? loadQnetAppraiserOfficialMaterialsReference();
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeText(entry)).filter(Boolean);
}

function normalizeKey(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

function hasInputFilters(input: QnetReferenceSignalInput) {
  return Boolean(
    input.examMode
    || normalizeText(input.subject)
    || normalizeArray(input.topicCandidates).length
    || normalizeArray(input.curriculumNodeCandidates).length
    || normalizeArray(input.trapWordCandidates).length
    || normalizeArray(input.answerSkeletonTags).length
  );
}

function labelMatches(candidate: string, target: string) {
  const left = normalizeKey(candidate);
  const right = normalizeKey(target);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function scoreLabelMatches(candidates: string[], targets: string[]) {
  let score = 0;
  const matched: string[] = [];
  for (const candidate of candidates) {
    for (const target of targets) {
      if (labelMatches(candidate, target)) {
        score += normalizeKey(candidate) === normalizeKey(target) ? 6 : 3;
        matched.push(candidate);
        break;
      }
    }
  }
  return { score, matchedInputLabels: uniqueStrings(matched) };
}

function scoreMaterial(material: QnetAppraiserMaterial, input: QnetReferenceSignalInput) {
  if (input.examMode && material.examMode !== input.examMode) return 0;
  const subject = normalizeText(input.subject);
  if (subject && material.subject !== subject) return 0;

  let score = input.examMode || subject ? 1 : 0;
  score += scoreLabelMatches(normalizeArray(input.topicCandidates), material.topicCandidates).score;
  score += scoreLabelMatches(normalizeArray(input.curriculumNodeCandidates), material.curriculumNodeCandidates).score;
  score += scoreLabelMatches(normalizeArray(input.trapWordCandidates), material.trapWordCandidates).score;
  score += scoreLabelMatches(normalizeArray(input.answerSkeletonTags), material.answerSkeletonTags).score;
  if (!hasInputFilters(input)) score = 1;
  return score;
}

function selectMaterialsForInput(input: QnetReferenceSignalInput, reference: QnetAppraiserOfficialMaterialsReference) {
  return reference.materialsIndex.materials
    .map((material) => ({ material, score: scoreMaterial(material, input) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => (
      right.score - left.score
      || right.material.examYear - left.material.examYear
      || right.material.examRound - left.material.examRound
      || left.material.sourceId.localeCompare(right.material.sourceId)
    ))
    .slice(0, MAX_REFERENCE_MATERIALS)
    .map(({ material }) => material);
}

export function listQnetMaterialsByExamMode(
  examMode: QnetAppraiserExamMode,
  reference?: QnetAppraiserOfficialMaterialsReference,
) {
  return ensureReference(reference).materialsIndex.materials
    .filter((material) => material.examMode === examMode)
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export function listQnetMaterialsBySubject(
  subject: string,
  reference?: QnetAppraiserOfficialMaterialsReference,
) {
  const normalizedSubject = normalizeText(subject);
  return ensureReference(reference).materialsIndex.materials
    .filter((material) => material.subject === normalizedSubject)
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export function getQnetMaterialBySourceId(
  sourceId: string,
  reference?: QnetAppraiserOfficialMaterialsReference,
) {
  const normalizedSourceId = normalizeText(sourceId);
  return ensureReference(reference).materialsIndex.materials.find((material) => material.sourceId === normalizedSourceId) ?? null;
}

export function getQnetTopicFrequencySignals(
  input: QnetReferenceSignalInput,
  reference?: QnetAppraiserOfficialMaterialsReference,
): QnetTopicFrequencySignal[] {
  const loadedReference = ensureReference(reference);
  const topicCandidates = normalizeArray(input.topicCandidates);
  const subject = normalizeText(input.subject);
  const filteredTopics = loadedReference.topicFrequency.topicFrequency.filter((entry) => {
    if (input.examMode && entry.examMode !== input.examMode) return false;
    if (subject && entry.subject !== subject) return false;
    return true;
  });

  return filteredTopics
    .map((entry) => {
      const { score, matchedInputLabels } = scoreLabelMatches(topicCandidates, [entry.topic]);
      const fallbackScore = topicCandidates.length === 0 ? entry.count : 0;
      return {
        ...entry,
        matchedInputLabels,
        score: score + fallbackScore,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.count - left.count || left.topic.localeCompare(right.topic))
    .slice(0, MAX_TOPIC_FREQUENCY_SIGNALS)
    .map((entry) => ({
      examMode: entry.examMode,
      subject: entry.subject,
      topic: entry.topic,
      count: entry.count,
      sourceIds: entry.sourceIds,
      matchedInputLabels: entry.matchedInputLabels,
      matchWeight: entry.score,
      rawTextStored: false,
      copyrightedTextStored: false,
    }));
}

export function buildQnetReferenceSignalsForMetadata(
  input: QnetReferenceSignalInput,
  reference?: QnetAppraiserOfficialMaterialsReference,
): QnetReferenceSignals {
  const loadedReference = ensureReference(reference);
  const materials = selectMaterialsForInput(input, loadedReference);
  const sourceIds = materials.map((material) => material.sourceId);
  const sourceIdSet = new Set(sourceIds);
  const topicFrequencySignals = getQnetTopicFrequencySignals(input, loadedReference)
    .filter((signal) => signal.sourceIds.some((sourceId) => sourceIdSet.has(sourceId)));

  return {
    officialSourceIds: uniqueStrings(materials.map((material) => material.officialSourceId)),
    sourceUrls: uniqueStrings(materials.map((material) => material.sourceUrl)),
    sourceIds,
    materialCount: materials.length,
    topicFrequencySignals,
    topicCandidates: uniqueStrings(materials.flatMap((material) => material.topicCandidates)),
    curriculumNodeCandidates: uniqueStrings(materials.flatMap((material) => material.curriculumNodeCandidates)),
    issueCandidates: uniqueStrings(materials.flatMap((material) => material.issueCandidates)),
    trapPatternCandidates: uniqueStrings(materials.flatMap((material) => material.trapWordCandidates)),
    answerSkeletonTags: uniqueStrings(materials.flatMap((material) => material.answerSkeletonTags)),
    calculationTemplateCandidates: uniqueStrings(materials.flatMap((material) => material.calculationTemplateCandidates)),
    casioRelevant: materials.some((material) => material.casioRelevant),
    rawTextStored: false,
    copyrightedTextStored: false,
    metadataOnly: true,
    safeUse: "metadata_reference_only",
  };
}
