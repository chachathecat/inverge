import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { sanitizeReferenceRequest } from "./data-boundary";

export type QuestionReferenceExamMode = "first" | "second";
export type QuestionReferenceRightsStatus = "public_domain" | "licensed" | "internal_curated" | "needs_review";
export type RawTextStoragePolicy = "none" | "metadata_only" | "licensed_private_reference" | "public_excerpt";

export type QuestionReference = {
  id: string;
  examYear: number;
  examRound?: string;
  examMode: QuestionReferenceExamMode;
  subject: string;
  title?: string;
  topicTags: string[];
  issueTags: string[];
  conceptTags: string[];
  skeletonId?: string;
  difficultyBucket?: "intro" | "standard" | "advanced" | "mixed" | string;
  sourceRightsStatus: QuestionReferenceRightsStatus;
  rawTextAvailable: boolean;
  rawTextStoragePolicy: RawTextStoragePolicy;
  citationLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type QuestionReferenceSafeInput = {
  examMode: QuestionReferenceExamMode;
  subject: string;
  topicCandidate?: string | null;
  conceptCandidate?: string | null;
  mistakeType?: string | null;
  issueTags?: string[];
  skeletonId?: string | null;
  derivedTags?: string[];
  safeSkeletonIds?: string[];
};

export type QuestionReferenceHint = {
  referenceId: string;
  title: string;
  subject: string;
  topicTags: string[];
  issueTags: string[];
  skeletonId?: string;
  reason: string;
  sourceRightsStatus: QuestionReferenceRightsStatus;
  rawTextAvailable: boolean;
  citationLabel?: string;
};

export type WeakUnitMapping = {
  unit: string;
  referenceIds: string[];
  skeletonIds: string[];
  reason: string;
};

export type QuestionReferenceIndexConfig = {
  sourcePath?: string;
};

const DEFAULT_SOURCE_PATH_PARTS = ["reference_corpus", "question_archive"] as const;
const MAX_HINTS = 2;
const RIGHTS_STATUSES = new Set<QuestionReferenceRightsStatus>(["public_domain", "licensed", "internal_curated", "needs_review"]);
const RAW_TEXT_POLICIES = new Set<RawTextStoragePolicy>(["none", "metadata_only", "licensed_private_reference", "public_excerpt"]);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenize(...values: Array<string | string[] | null | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .flatMap((value) => normalizeText(value).toLowerCase().split(/[^0-9a-z가-힣]+/u))
    .filter((value) => value.length >= 2);
}

function toQuestionReference(raw: Record<string, unknown>): QuestionReference | null {
  const id = normalizeText(raw.id);
  const examYear = typeof raw.examYear === "number" && Number.isFinite(raw.examYear) ? raw.examYear : Number(normalizeText(raw.examYear));
  const examMode = normalizeText(raw.examMode);
  const subject = normalizeText(raw.subject);
  const sourceRightsStatus = normalizeText(raw.sourceRightsStatus) as QuestionReferenceRightsStatus;
  const rawTextStoragePolicy = normalizeText(raw.rawTextStoragePolicy) as RawTextStoragePolicy;
  const createdAt = normalizeText(raw.createdAt);
  const updatedAt = normalizeText(raw.updatedAt);
  if (!id || !Number.isFinite(examYear) || (examMode !== "first" && examMode !== "second") || !subject) return null;
  if (!RIGHTS_STATUSES.has(sourceRightsStatus)) return null;
  if (!RAW_TEXT_POLICIES.has(rawTextStoragePolicy)) return null;
  if (!createdAt || !updatedAt) return null;

  return {
    id,
    examYear,
    examRound: normalizeText(raw.examRound) || undefined,
    examMode,
    subject,
    title: normalizeText(raw.title) || undefined,
    topicTags: normalizeArray(raw.topicTags),
    issueTags: normalizeArray(raw.issueTags),
    conceptTags: normalizeArray(raw.conceptTags),
    skeletonId: normalizeText(raw.skeletonId) || undefined,
    difficultyBucket: normalizeText(raw.difficultyBucket) || undefined,
    sourceRightsStatus,
    rawTextAvailable: raw.rawTextAvailable === true,
    rawTextStoragePolicy,
    citationLabel: normalizeText(raw.citationLabel) || undefined,
    createdAt,
    updatedAt,
  };
}

async function collectJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith(".json")) return [fullPath];
    return [];
  }));
  return nested.flat();
}

function getSourcePath(config: QuestionReferenceIndexConfig = {}) {
  const customPath = config.sourcePath ?? process.env.INVERGE_QUESTION_REFERENCE_PATH;
  if (customPath) return path.resolve(/* turbopackIgnore: true */ process.cwd(), customPath);
  return path.join(process.cwd(), ...DEFAULT_SOURCE_PATH_PARTS);
}

export async function loadQuestionReferenceIndex(config: QuestionReferenceIndexConfig = {}): Promise<QuestionReference[]> {
  const sourcePath = getSourcePath(config);
  let files: string[] = [];
  try {
    files = await collectJsonFiles(sourcePath);
  } catch {
    return [];
  }
  const entries = await Promise.all(files.map(async (filePath) => {
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
      const records = Array.isArray(parsed) ? parsed : [parsed];
      return records.flatMap((record) => isRecord(record) ? [toQuestionReference(record)].filter((entry): entry is QuestionReference => Boolean(entry)) : []);
    } catch {
      return [];
    }
  }));
  return entries.flat().sort((left, right) => left.id.localeCompare(right.id));
}

export function sanitizeQuestionReferenceInput(input: QuestionReferenceSafeInput & Record<string, unknown>): QuestionReferenceSafeInput {
  const safe = sanitizeReferenceRequest(input) as Partial<QuestionReferenceSafeInput>;
  return {
    examMode: safe.examMode === "second" ? "second" : "first",
    subject: normalizeText(safe.subject),
    topicCandidate: normalizeText(safe.topicCandidate) || null,
    conceptCandidate: normalizeText(safe.conceptCandidate) || null,
    mistakeType: normalizeText(safe.mistakeType) || null,
    issueTags: normalizeArray(safe.issueTags),
    skeletonId: normalizeText(safe.skeletonId) || null,
    derivedTags: normalizeArray(safe.derivedTags),
    safeSkeletonIds: normalizeArray(safe.safeSkeletonIds),
  };
}

function scoreReference(reference: QuestionReference, input: QuestionReferenceSafeInput) {
  if (reference.examMode !== input.examMode) return 0;
  let score = 0;
  if (reference.subject === input.subject) score += 6;
  const queryTokens = new Set(tokenize(input.topicCandidate, input.conceptCandidate, input.mistakeType, input.issueTags, input.derivedTags));
  const referenceTokens = new Set(tokenize(reference.title, reference.subject, reference.topicTags, reference.issueTags, reference.conceptTags, reference.skeletonId));
  for (const token of queryTokens) {
    if (referenceTokens.has(token)) score += 2;
  }
  const skeletonCandidates = new Set([input.skeletonId, ...(input.safeSkeletonIds ?? [])].map(normalizeText).filter(Boolean));
  if (reference.skeletonId && skeletonCandidates.has(reference.skeletonId)) score += 7;
  if (reference.sourceRightsStatus === "needs_review") score -= 1;
  return score;
}

function toHint(reference: QuestionReference, input: QuestionReferenceSafeInput, reasonOverride?: string): QuestionReferenceHint {
  const title = reference.title || `${reference.examYear}${reference.examRound ? ` ${reference.examRound}` : ""} ${reference.subject} 기준`;
  const matchedSkeleton = reference.skeletonId && [input.skeletonId, ...(input.safeSkeletonIds ?? [])].includes(reference.skeletonId);
  const reason = reasonOverride ?? (matchedSkeleton
    ? "학습 항목의 skeleton 후보와 연결됩니다."
    : "과목·주제·오류 태그가 가까운 기출 메타데이터 기준입니다.");
  return {
    referenceId: reference.id,
    title,
    subject: reference.subject,
    topicTags: reference.topicTags,
    issueTags: reference.issueTags,
    skeletonId: reference.skeletonId,
    reason,
    sourceRightsStatus: reference.sourceRightsStatus,
    rawTextAvailable: reference.rawTextAvailable,
    citationLabel: reference.citationLabel,
  };
}

export async function findQuestionReferencesForLearningItem(input: QuestionReferenceSafeInput & Record<string, unknown>, config: QuestionReferenceIndexConfig = {}): Promise<QuestionReferenceHint[]> {
  const safeInput = sanitizeQuestionReferenceInput(input);
  const references = await loadQuestionReferenceIndex(config);
  return references
    .map((reference) => ({ reference, score: scoreReference(reference, safeInput) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.reference.id.localeCompare(right.reference.id))
    .slice(0, MAX_HINTS)
    .map(({ reference }) => toHint(reference, safeInput));
}

export async function mapLearningItemToQuestionReferenceHints(input: QuestionReferenceSafeInput & Record<string, unknown>, config: QuestionReferenceIndexConfig = {}): Promise<QuestionReferenceHint[]> {
  return findQuestionReferencesForLearningItem(input, config);
}

export async function getSimilarQuestionReferenceCandidates(input: QuestionReferenceSafeInput & Record<string, unknown>, config: QuestionReferenceIndexConfig = {}): Promise<QuestionReferenceHint[]> {
  const safeInput = sanitizeQuestionReferenceInput(input);
  const hints = await findQuestionReferencesForLearningItem(safeInput, config);
  return hints.map((hint) => ({ ...hint, reason: `비슷한 기출 기준: ${hint.reason}` }));
}

export async function buildWeakUnitMappingFromReferences(input: QuestionReferenceSafeInput & Record<string, unknown>, config: QuestionReferenceIndexConfig = {}): Promise<WeakUnitMapping[]> {
  const safeInput = sanitizeQuestionReferenceInput(input);
  const references = await loadQuestionReferenceIndex(config);
  const matching = references
    .map((reference) => ({ reference, score: scoreReference(reference, safeInput) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map(({ reference }) => reference);
  const byUnit = new Map<string, WeakUnitMapping>();
  for (const reference of matching) {
    const unit = reference.topicTags[0] ?? reference.conceptTags[0] ?? reference.subject;
    const current = byUnit.get(unit) ?? { unit, referenceIds: [], skeletonIds: [], reason: "기출 메타데이터의 주제·논점 빈도 기준 약점 단위 후보입니다." };
    current.referenceIds.push(reference.id);
    if (reference.skeletonId && !current.skeletonIds.includes(reference.skeletonId)) current.skeletonIds.push(reference.skeletonId);
    byUnit.set(unit, current);
  }
  return [...byUnit.values()].slice(0, MAX_HINTS);
}
