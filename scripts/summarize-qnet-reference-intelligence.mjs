#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPORT_SCHEMA_VERSION = "1.0.0";
const REPORT_TYPE = "qnet_reference_intelligence_qa";
const SAFE_USE = "qnet_reference_intelligence_qa_only";
const TOP_TOPIC_LIMIT = 12;
const SUBJECT_ORDER = [
  "감정평가사 1차",
  "감정평가실무",
  "감정평가이론",
  "감정평가 및 보상법규",
];
const FORBIDDEN_REPORT_FIELD_NAMES = new Set([
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
  "localFileName",
  "localRawFileName",
  "score",
  "officialScore",
  "predictedScore",
  "passFail",
  "passGuarantee",
  "instructorComment",
]);
const FORBIDDEN_OUTPUT_PHRASE_PARTS = [
  ["local", "_official", "_materials"],
  ["qnet", "_manifest", ".", "json"],
  ["raw", " question", " text"],
  ["answer", " text"],
  ["official", " answer", " body"],
  ["ocr", " full", " text"],
  ["source", " excerpt"],
  ["official", " grading"],
  ["model", " answer"],
  ["score", " prediction"],
  ["pass", " guarantee"],
];
const FORBIDDEN_REPORT_VALUE_PATTERNS = [
  ...FORBIDDEN_OUTPUT_PHRASE_PARTS.map((parts) => new RegExp(escapeRegExp(parts.join("")), "i")),
  ...["pdf", "hwp", "hwpx", "docx", "zip"].map((extension) => new RegExp(`\\.${extension}\\b`, "i")),
  /pass[-/]fail/i,
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const referenceModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "qnet-official-materials-reference.ts"),
).href;

export async function loadQnetReferenceForReport() {
  const referenceLoader = await import(referenceModuleUrl);
  return referenceLoader.loadQnetAppraiserOfficialMaterialsReference();
}

export function buildQnetReferenceIntelligenceReport(reference, options = {}) {
  const materials = reference.materialsIndex.materials;
  const sourceMapSources = reference.sourceMap.sources;
  const topicFrequency = reference.topicFrequency.topicFrequency;

  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: REPORT_TYPE,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    officialSourceIds: uniqueSorted(materials.map((material) => material.officialSourceId)),
    materialCount: materials.length,
    sourceMapSourceCount: sourceMapSources.length,
    sourceMapMaterialCount: sourceMapSources.reduce((total, source) => total + source.materialCount, 0),
    topicFrequencyEntryCount: topicFrequency.length,
    years: uniqueNumericSorted(materials.map((material) => material.examYear)),
    rounds: uniqueNumericSorted(materials.map((material) => material.examRound)),
    examModeCounts: countBy(materials, (material) => material.examMode),
    subjectCounts: orderRecord(countBy(materials, (material) => material.subject), SUBJECT_ORDER),
    yearRoundCoverage: buildYearRoundCoverage(materials),
    secondIntegratedSourceChecks: buildSecondIntegratedSourceChecks(materials),
    topicFrequencySummary: buildTopicFrequencySummary(topicFrequency),
    safety: buildSafetySummary(reference),
    warnings: [],
    metadataOnly: true,
    safeUse: SAFE_USE,
  };

  report.warnings = buildWarnings(report);
  return report;
}

export function assertQnetReferenceIntelligenceReportIsSafe(report) {
  const failedSafetyChecks = Object.entries(report.safety)
    .filter(([, passed]) => passed !== true)
    .map(([checkName]) => checkName);
  if (failedSafetyChecks.length > 0) {
    throw new Error(`Q-Net reference intelligence safety checks failed: ${failedSafetyChecks.join(", ")}`);
  }
  if (report.metadataOnly !== true) {
    throw new Error("Q-Net reference intelligence report must be metadata-only");
  }
  if (report.safeUse !== SAFE_USE) {
    throw new Error(`Q-Net reference intelligence report safeUse must be ${SAFE_USE}`);
  }
  if (!Array.isArray(report.warnings) || report.warnings.length > 0) {
    throw new Error(`Q-Net reference intelligence report has warnings: ${report.warnings.join(", ")}`);
  }
  return report;
}

function buildSafetySummary(reference) {
  const materialIds = new Set(reference.materialsIndex.materials.map((material) => material.sourceId));
  const sourceMapIds = new Set(reference.sourceMap.sources.flatMap((source) => source.sourceIds));
  const canonicalSourceUrl = reference.officialSource.sourceUrl;
  const topicEntries = reference.topicFrequency.topicFrequency;
  const sourceById = new Map(reference.materialsIndex.materials.map((material) => [material.sourceId, material]));

  return {
    rawTextStoredFalseEverywhere: allStorageFlagsFalse(reference, "rawTextStored"),
    copyrightedTextStoredFalseEverywhere: allStorageFlagsFalse(reference, "copyrightedTextStored"),
    metadataOnlyStoragePolicy: [
      reference.materialsIndex.storagePolicy,
      reference.sourceMap.storagePolicy,
      reference.topicFrequency.storagePolicy,
    ].every((storagePolicy) => storagePolicy.metadataOnly === true),
    noForbiddenRawOrScoringFieldsInReport: true,
    noRawMaterialPathsInReport: true,
    noOfficialGradingOrScoringClaimsInReport: true,
    sourceUrlsCanonical: reference.materialsIndex.materials.every((material) => material.sourceUrl === canonicalSourceUrl)
      && reference.sourceMap.sources.every((source) => source.sourceUrl === canonicalSourceUrl),
    sourceMapConsistent: reference.sourceMap.sources.every((source) => (
      source.materialCount === source.sourceIds.length
      && source.sourceIds.every((sourceId) => materialIds.has(sourceId))
    )) && sourceMapIds.size === materialIds.size,
    topicFrequencyConsistent: topicEntries.every((topic) => (
      topic.count === topic.sourceIds.length
      && topic.sourceIds.every((sourceId) => {
        const material = sourceById.get(sourceId);
        return material?.examMode === topic.examMode && material?.subject === topic.subject;
      })
    )),
  };
}

function allStorageFlagsFalse(reference, flagName) {
  const records = [
    reference.materialsIndex.storagePolicy,
    reference.sourceMap.storagePolicy,
    reference.topicFrequency.storagePolicy,
    ...reference.materialsIndex.materials,
    ...reference.sourceMap.sources,
    ...reference.topicFrequency.topicFrequency,
  ];
  return records.every((record) => record[flagName] === false);
}

function buildYearRoundCoverage(materials) {
  const groups = new Map();
  for (const material of materials) {
    const key = `${material.examYear}:${material.examRound}`;
    const group = groups.get(key) ?? {
      examYear: material.examYear,
      examRound: material.examRound,
      materialCount: 0,
      firstCount: 0,
      secondCount: 0,
      subjects: new Set(),
    };
    group.materialCount += 1;
    if (material.examMode === "first") group.firstCount += 1;
    if (material.examMode === "second") group.secondCount += 1;
    group.subjects.add(material.subject);
    groups.set(key, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.examYear - b.examYear || a.examRound - b.examRound)
    .map((group) => ({
      examYear: group.examYear,
      examRound: group.examRound,
      materialCount: group.materialCount,
      firstCount: group.firstCount,
      secondCount: group.secondCount,
      subjects: sortBySubjectOrder([...group.subjects]),
    }));
}

function buildSecondIntegratedSourceChecks(materials) {
  const groups = new Map();
  for (const material of materials) {
    if (material.examMode !== "second" || !material.paper.startsWith("2차 통합:")) continue;
    const key = `${material.examYear}:${material.examRound}`;
    const group = groups.get(key) ?? {
      examYear: material.examYear,
      examRound: material.examRound,
      subjects: new Set(),
      physicalSourceHashes: new Set(),
      materialCount: 0,
    };
    group.subjects.add(material.subject);
    group.physicalSourceHashes.add(material.localRawFileNameHash);
    group.materialCount += 1;
    groups.set(key, group);
  }

  return [...groups.values()]
    .sort((a, b) => a.examYear - b.examYear || a.examRound - b.examRound)
    .map((group) => ({
      examYear: group.examYear,
      examRound: group.examRound,
      logicalSectionCount: group.subjects.size,
      materialCount: group.materialCount,
      subjects: sortBySubjectOrder([...group.subjects]),
      samePhysicalSourceHash: group.physicalSourceHashes.size === 1,
      metadataOnly: true,
    }));
}

function buildTopicFrequencySummary(topicFrequency) {
  return topicFrequency
    .map((entry) => ({
      examMode: entry.examMode,
      subject: entry.subject,
      topic: entry.topic,
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count
      || subjectSortIndex(a.subject) - subjectSortIndex(b.subject)
      || a.topic.localeCompare(b.topic, "ko-KR"))
    .slice(0, TOP_TOPIC_LIMIT);
}

function buildWarnings(report) {
  const warnings = [];
  for (const [checkName, passed] of Object.entries(report.safety)) {
    if (passed !== true) warnings.push(`${checkName}_failed`);
  }
  if (report.secondIntegratedSourceChecks.length === 0) {
    warnings.push("second_integrated_source_check_missing");
  }
  if (!report.secondIntegratedSourceChecks.some((entry) => (
    entry.examYear === 2024
    && entry.examRound === 35
    && entry.logicalSectionCount === 3
    && entry.samePhysicalSourceHash === true
  ))) {
    warnings.push("batch_2_integrated_source_confirmation_missing");
  }

  const serialized = JSON.stringify(report);
  if (containsForbiddenReportFieldName(report)) warnings.push("forbidden_report_field_detected");
  if (FORBIDDEN_REPORT_VALUE_PATTERNS.some((pattern) => pattern.test(serialized))) {
    warnings.push("forbidden_report_value_detected");
  }
  return warnings;
}

function containsForbiddenReportFieldName(value) {
  if (Array.isArray(value)) return value.some((entry) => containsForbiddenReportFieldName(entry));
  if (value === null || typeof value !== "object") return false;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_REPORT_FIELD_NAMES.has(key)) return true;
    if (containsForbiddenReportFieldName(nestedValue)) return true;
  }
  return false;
}

function countBy(entries, selector) {
  const counts = {};
  for (const entry of entries) {
    const key = selector(entry);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return orderRecord(counts);
}

function orderRecord(record, preferredOrder = []) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      if (leftIndex !== -1 || rightIndex !== -1) {
        return normalizePreferredIndex(leftIndex) - normalizePreferredIndex(rightIndex);
      }
      return left.localeCompare(right, "ko-KR");
    }),
  );
}

function normalizePreferredIndex(index) {
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function subjectSortIndex(subject) {
  return normalizePreferredIndex(SUBJECT_ORDER.indexOf(subject));
}

function sortBySubjectOrder(subjects) {
  return subjects.sort((left, right) => subjectSortIndex(left) - subjectSortIndex(right) || left.localeCompare(right, "ko-KR"));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "ko-KR"));
}

function uniqueNumericSorted(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDirectRun() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  try {
    const reference = await loadQnetReferenceForReport();
    const report = buildQnetReferenceIntelligenceReport(reference);
    assertQnetReferenceIntelligenceReportIsSafe(report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
