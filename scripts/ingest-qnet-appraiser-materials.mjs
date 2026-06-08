#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const defaultManifestPath = "local_official_materials/appraiser/qnet_manifest.json";
const defaultOutputPath = "reference_corpus/official_materials/appraiser/qnet_appraiser_materials_index.json";
const defaultFrequencyPath = "reference_corpus/official_materials/appraiser/qnet_appraiser_topic_frequency.json";
const defaultSourceMapPath = "reference_corpus/official_materials/appraiser/qnet_appraiser_source_map.json";
const defaultSchemaPath = "reference_corpus/official_materials/appraiser/qnet_appraiser_ingestion_schema.json";
const officialSourceRegistryPath = "reference_corpus/curriculum/appraiser/official_sources.json";

const manifestPath = process.env.QNET_APPRAISER_MANIFEST_PATH ?? defaultManifestPath;
const outputPath = process.env.QNET_APPRAISER_INDEX_OUTPUT_PATH ?? defaultOutputPath;
const frequencyOutputPath = process.env.QNET_APPRAISER_TOPIC_FREQUENCY_OUTPUT_PATH ?? defaultFrequencyPath;
const sourceMapOutputPath = process.env.QNET_APPRAISER_SOURCE_MAP_OUTPUT_PATH ?? defaultSourceMapPath;
const schemaPath = process.env.QNET_APPRAISER_INGESTION_SCHEMA_PATH ?? defaultSchemaPath;
const allowMissingManifest = process.env.QNET_APPRAISER_ALLOW_MISSING_MANIFEST === "1";

const allowedSourceKinds = new Set([
  "past_questions",
  "final_answers",
  "public_notice",
  "exam_info",
  "exam_schedule",
  "qualification_detail",
  "statute_or_regulation",
  "operator",
  "exam_materials",
]);
const allowedExamModes = new Set(["first", "second"]);
const allowedSourceStatuses = new Set(["draft", "verified", "needs_update", "deprecated"]);
const forbiddenClaimPattern = /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|model\s+answer|합격\s*보장|공식\s*채점|공식\s*점수|점수\s*예측|합격\s*\/\s*불합격|합불|공식\s*모범\s*답안|모범\s*답안)/i;

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") args.manifestPath = argv[++index];
    else if (arg === "--output") args.outputPath = argv[++index];
    else if (arg === "--topic-frequency-output") args.frequencyOutputPath = argv[++index];
    else if (arg === "--source-map-output") args.sourceMapOutputPath = argv[++index];
    else if (arg === "--allow-missing-manifest") args.allowMissingManifest = true;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/ingest-qnet-appraiser-materials.mjs [options]\n\nReads a manually curated local Q-Net appraiser manifest and writes metadata-only reference files.\nIt does not read raw PDFs/HWP/ZIP/images, perform OCR/PDF parsing, scrape pages, or make network calls.\n\nOptions:\n  --manifest <path>                 Local manifest path (default: ${defaultManifestPath})\n  --output <path>                   Metadata index output path (default: ${defaultOutputPath})\n  --topic-frequency-output <path>   Topic frequency output path\n  --source-map-output <path>        Source map output path\n  --allow-missing-manifest          Write empty metadata outputs if manifest is absent\n`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hashValue(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function shortHash(value) {
  return hashValue(value).slice(0, 12);
}

function stableIdPart(value) {
  return String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "metadata";
}

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function assertNoForbiddenFields(value, forbiddenFields, currentPath = "manifest", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenFields(child, forbiddenFields, `${currentPath}[${index}]`, errors));
    return errors;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && forbiddenClaimPattern.test(value)) {
      errors.push(`${currentPath} contains a prohibited official grading/pass-fail/score/model-answer/guarantee claim`);
    }
    return errors;
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenFields.has(key)) errors.push(`${currentPath}.${key} is a forbidden raw/copyrighted or learner-boundary field`);
    assertNoForbiddenFields(child, forbiddenFields, `${currentPath}.${key}`, errors);
  }
  return errors;
}

function readManifestPayload(raw) {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return { items: parsed, manifestMetadata: {} };
  if (isRecord(parsed) && Array.isArray(parsed.items)) return { items: parsed.items, manifestMetadata: parsed };
  throw new Error("Manifest must be either an array of metadata items or an object with an items array.");
}

async function readJson(pathname) {
  return JSON.parse(await readFile(pathname, "utf8"));
}

function normalizeStringArray(value, field, itemPath, errors) {
  if (value === undefined) return [];
  requireCondition(Array.isArray(value), `${itemPath}.${field} must be an array of short strings`, errors);
  if (!Array.isArray(value)) return [];
  const normalized = [];
  value.forEach((entry, index) => {
    requireCondition(typeof entry === "string", `${itemPath}.${field}[${index}] must be a string`, errors);
    if (typeof entry !== "string") return;
    const trimmed = entry.trim();
    requireCondition(trimmed.length > 0, `${itemPath}.${field}[${index}] must not be empty`, errors);
    requireCondition(trimmed.length <= 80, `${itemPath}.${field}[${index}] must be a short metadata label, not source text`, errors);
    requireCondition(!forbiddenClaimPattern.test(trimmed), `${itemPath}.${field}[${index}] contains a prohibited claim`, errors);
    if (trimmed) normalized.push(trimmed);
  });
  return [...new Set(normalized)];
}

function normalizeBoolean(value, defaultValue) {
  return typeof value === "boolean" ? value : defaultValue;
}

function normalizeMaterial(item, index, context, errors) {
  const itemPath = `items[${index}]`;
  requireCondition(isRecord(item), `${itemPath} must be an object`, errors);
  if (!isRecord(item)) return null;

  const officialSourceId = item.officialSourceId;
  const registrySource = context.officialSources.get(officialSourceId);
  const sourceUrl = item.sourceUrl ?? item.officialSourceUrl ?? registrySource?.sourceUrl;
  const sourceName = item.sourceName ?? registrySource?.sourceName;
  const sourceKind = item.sourceKind ?? registrySource?.sourceKind;
  const sourceStatus = item.sourceStatus ?? "draft";
  const lastOfficialVerifiedAt = item.lastOfficialVerifiedAt ?? registrySource?.lastCheckedAt ?? null;
  const needsOfficialVerification = item.needsOfficialVerification ?? sourceStatus !== "verified";
  const localFileNameOrKey = item.localFileName ?? item.localRawFileName ?? item.localFileKey ?? item.sourceId;

  for (const field of ["officialSourceId", "examYear", "examRound", "examMode", "subject", "paper", "questionNumber"]) {
    requireCondition(field in item, `${itemPath} missing ${field}`, errors);
  }
  requireCondition(typeof officialSourceId === "string" && context.officialSources.has(officialSourceId), `${itemPath}.officialSourceId must match the official source registry`, errors);
  requireCondition(typeof sourceKind === "string" && allowedSourceKinds.has(sourceKind), `${itemPath}.sourceKind has unsupported value ${sourceKind}`, errors);
  requireCondition(typeof sourceName === "string" && sourceName.trim().length > 0, `${itemPath}.sourceName must be available from manifest or registry`, errors);
  requireCondition(typeof sourceUrl === "string" && /^https:\/\//.test(sourceUrl), `${itemPath}.sourceUrl or officialSourceUrl must be an https URL`, errors);
  requireCondition(Number.isInteger(item.examYear) && item.examYear >= 1989 && item.examYear <= 2100, `${itemPath}.examYear must be a plausible year`, errors);
  requireCondition(Number.isInteger(item.examRound) && item.examRound >= 1 && item.examRound <= 200, `${itemPath}.examRound must be a plausible round number`, errors);
  requireCondition(allowedExamModes.has(item.examMode), `${itemPath}.examMode must be first or second`, errors);
  requireCondition(typeof item.subject === "string" && item.subject.trim().length > 0, `${itemPath}.subject must be a non-empty string`, errors);
  requireCondition(typeof item.paper === "string" && item.paper.trim().length > 0, `${itemPath}.paper must be a non-empty string`, errors);
  requireCondition(["string", "number"].includes(typeof item.questionNumber), `${itemPath}.questionNumber must be a string or number`, errors);
  requireCondition(typeof localFileNameOrKey === "string" && localFileNameOrKey.trim().length > 0, `${itemPath}.localFileName or localFileKey is required for hashing`, errors);
  requireCondition(allowedSourceStatuses.has(sourceStatus), `${itemPath}.sourceStatus has unsupported value ${sourceStatus}`, errors);
  requireCondition(typeof lastOfficialVerifiedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lastOfficialVerifiedAt), `${itemPath}.lastOfficialVerifiedAt must be YYYY-MM-DD or available from registry`, errors);
  requireCondition(typeof needsOfficialVerification === "boolean", `${itemPath}.needsOfficialVerification must be boolean when provided`, errors);
  if (sourceStatus === "verified") {
    requireCondition(needsOfficialVerification === false, `${itemPath} verified source metadata must set needsOfficialVerification false`, errors);
  }

  const basis = [item.examYear, item.examRound, item.examMode, item.subject, item.paper, item.questionNumber, sourceKind, localFileNameOrKey].join("|");
  const material = {
    sourceId: item.sourceId ?? `qnet-appraiser-${item.examYear}-${item.examRound}-${stableIdPart(item.examMode)}-${stableIdPart(item.paper)}-${stableIdPart(item.questionNumber)}-${shortHash(basis)}`,
    officialSourceId,
    sourceKind,
    sourceName,
    sourceUrl,
    localRawFileNameHash: hashValue(localFileNameOrKey),
    examYear: item.examYear,
    examRound: item.examRound,
    examMode: item.examMode,
    subject: item.subject.trim(),
    paper: item.paper.trim(),
    questionNumber: String(item.questionNumber).trim(),
    itemType: typeof item.itemType === "string" ? item.itemType.trim() : null,
    topicCandidates: normalizeStringArray(item.topicCandidates, "topicCandidates", itemPath, errors),
    curriculumNodeCandidates: normalizeStringArray(item.curriculumNodeCandidates, "curriculumNodeCandidates", itemPath, errors),
    issueCandidates: normalizeStringArray(item.issueCandidates, "issueCandidates", itemPath, errors),
    trapWordCandidates: normalizeStringArray(item.trapWordCandidates, "trapWordCandidates", itemPath, errors),
    answerSkeletonTags: normalizeStringArray(item.answerSkeletonTags, "answerSkeletonTags", itemPath, errors),
    calculationTemplateCandidates: normalizeStringArray(item.calculationTemplateCandidates, "calculationTemplateCandidates", itemPath, errors),
    casioRelevant: normalizeBoolean(item.casioRelevant, false),
    estimatedMinutes: Number.isFinite(item.estimatedMinutes) ? item.estimatedMinutes : null,
    difficultyBand: typeof item.difficultyBand === "string" ? item.difficultyBand.trim() : null,
    sourceStatus,
    lastOfficialVerifiedAt,
    needsOfficialVerification,
    rawTextStored: false,
    copyrightedTextStored: false,
    notes: typeof item.notes === "string" ? item.notes.trim() : null,
  };

  requireCondition(material.topicCandidates.length > 0, `${itemPath}.topicCandidates must include at least one metadata label`, errors);
  requireCondition(material.issueCandidates.length > 0, `${itemPath}.issueCandidates must include at least one metadata label`, errors);
  return material;
}

function buildTopicFrequency(materials) {
  const counts = new Map();
  for (const material of materials) {
    for (const topic of material.topicCandidates) {
      const key = JSON.stringify({ examMode: material.examMode, subject: material.subject, topic });
      const current = counts.get(key) ?? {
        examMode: material.examMode,
        subject: material.subject,
        topic,
        count: 0,
        sourceIds: [],
        rawTextStored: false,
        copyrightedTextStored: false,
      };
      current.count += 1;
      current.sourceIds.push(material.sourceId);
      counts.set(key, current);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject, "ko") || a.topic.localeCompare(b.topic, "ko"));
}

function buildSourceMap(materials) {
  const sources = new Map();
  for (const material of materials) {
    const current = sources.get(material.officialSourceId) ?? {
      officialSourceId: material.officialSourceId,
      sourceKind: material.sourceKind,
      sourceName: material.sourceName,
      sourceUrl: material.sourceUrl,
      sourceStatusCounts: {},
      materialCount: 0,
      sourceIds: [],
      rawTextStored: false,
      copyrightedTextStored: false,
    };
    current.materialCount += 1;
    current.sourceIds.push(material.sourceId);
    current.sourceStatusCounts[material.sourceStatus] = (current.sourceStatusCounts[material.sourceStatus] ?? 0) + 1;
    sources.set(material.officialSourceId, current);
  }
  return [...sources.values()].sort((a, b) => a.officialSourceId.localeCompare(b.officialSourceId));
}

async function writeJson(pathname, data) {
  await mkdir(path.dirname(pathname), { recursive: true });
  await writeFile(pathname, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const resolvedManifestPath = args.manifestPath ?? manifestPath;
  const resolvedOutputPath = args.outputPath ?? outputPath;
  const resolvedFrequencyPath = args.frequencyOutputPath ?? frequencyOutputPath;
  const resolvedSourceMapPath = args.sourceMapOutputPath ?? sourceMapOutputPath;
  const missingManifestAllowed = args.allowMissingManifest ?? allowMissingManifest;

  const schema = await readJson(schemaPath);
  const forbiddenFields = new Set(schema.forbiddenFields ?? []);
  const registry = await readJson(officialSourceRegistryPath);
  const officialSources = new Map((registry.sources ?? []).map((source) => [source.id, source]));

  let items = [];
  let manifestMetadata = {};
  if (!existsSync(resolvedManifestPath)) {
    if (!missingManifestAllowed) {
      throw new Error(`Manifest not found: ${resolvedManifestPath}. Create this local metadata-only file manually, or run with --allow-missing-manifest to emit empty outputs.`);
    }
  } else {
    const parsed = readManifestPayload(await readFile(resolvedManifestPath, "utf8"));
    items = parsed.items;
    manifestMetadata = parsed.manifestMetadata;
  }

  const errors = [];
  assertNoForbiddenFields(items, forbiddenFields, "items", errors);
  const materials = items.map((item, index) => normalizeMaterial(item, index, { officialSources }, errors)).filter(Boolean);
  const seen = new Set();
  for (const material of materials) {
    if (seen.has(material.sourceId)) errors.push(`Duplicate sourceId ${material.sourceId}`);
    seen.add(material.sourceId);
  }
  if (errors.length > 0) {
    throw new Error(`Q-Net appraiser metadata ingestion failed:\n- ${errors.join("\n- ")}`);
  }

  const generatedAt = new Date().toISOString();
  const basePolicy = { rawTextStored: false, copyrightedTextStored: false, metadataOnly: true };
  await writeJson(resolvedOutputPath, {
    schemaVersion: schema.schemaVersion,
    generatedBy: "scripts/ingest-qnet-appraiser-materials.mjs",
    generatedAt,
    inputManifestPath: resolvedManifestPath,
    manifestName: typeof manifestMetadata.manifestName === "string" ? manifestMetadata.manifestName : null,
    storagePolicy: basePolicy,
    materials,
  });
  await writeJson(resolvedFrequencyPath, {
    schemaVersion: schema.schemaVersion,
    generatedBy: "scripts/ingest-qnet-appraiser-materials.mjs",
    generatedAt,
    inputManifestPath: resolvedManifestPath,
    storagePolicy: basePolicy,
    topicFrequency: buildTopicFrequency(materials),
  });
  await writeJson(resolvedSourceMapPath, {
    schemaVersion: schema.schemaVersion,
    generatedBy: "scripts/ingest-qnet-appraiser-materials.mjs",
    generatedAt,
    inputManifestPath: resolvedManifestPath,
    storagePolicy: basePolicy,
    sources: buildSourceMap(materials),
  });
  console.log(`Ingested ${materials.length} Q-Net appraiser metadata record(s) from ${resolvedManifestPath}.`);
  console.log(`Wrote ${resolvedOutputPath}, ${resolvedFrequencyPath}, and ${resolvedSourceMapPath}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
