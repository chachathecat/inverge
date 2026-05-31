import { loadReferenceCorpus, type ReferenceCorpusConfig, type ReferenceCorpusEntry, type ReferenceExamMode, type ReferenceTaskType } from "./reference-corpus";

export type ReferenceContextProvider = "none" | "local" | string;

export type ReferenceContextConfig = ReferenceCorpusConfig & {
  provider?: ReferenceContextProvider;
  modelName?: string;
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
};

export type ReferenceContextRequestInput = {
  examMode: ReferenceExamMode;
  subject: string;
  topicCandidate?: string | null;
  conceptCandidate?: string | null;
  taskType: ReferenceTaskType;
  maxSnippets?: number;
  derivedTags?: string[];
  safeSkeletonIds?: string[];
};

export type ReferenceSnippet = {
  referenceId: string;
  title: string;
  subject: string;
  sourceType: ReferenceCorpusEntry["sourceType"];
  snippet: string;
  citationLabel?: string;
  confidence: number;
  usedFallback: boolean;
};

export type ReferenceContextResult = {
  snippets: ReferenceSnippet[];
  provider: ReferenceContextProvider;
  modelName?: string;
  cacheHit: boolean;
  cacheEnabled: boolean;
  usedFallback: boolean;
};

type CacheEntry = { expiresAt: number; result: ReferenceContextResult };

const DEFAULT_MAX_SNIPPETS = 2;
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const USER_RAW_DATA_KEYS = new Set([
  "rawOcrText",
  "raw_ocr_text",
  "ocrText",
  "userAnswerText",
  "rawAnswerText",
  "uploadedText",
  "uploadedPdfText",
  "uploadedImageText",
  "fullProblemText",
  "problemText",
  "rewriteParagraph",
  "rawHandwrittenContent",
  "handwrittenText",
  "statementText",
]);

function getConfig(config: ReferenceContextConfig = {}): Required<Omit<ReferenceContextConfig, "modelName" | "corpusSourcePath">> & Pick<ReferenceContextConfig, "modelName" | "corpusSourcePath"> {
  return {
    provider: config.provider ?? process.env.INVERGE_REFERENCE_PROVIDER ?? "local",
    modelName: config.modelName ?? process.env.INVERGE_REFERENCE_MODEL_NAME,
    cacheEnabled: config.cacheEnabled ?? process.env.INVERGE_REFERENCE_CACHE_ENABLED !== "false",
    cacheTtlMs: config.cacheTtlMs ?? Number(process.env.INVERGE_REFERENCE_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS),
    corpusSourcePath: config.corpusSourcePath ?? process.env.INVERGE_REFERENCE_CORPUS_PATH,
  };
}

function normalize(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function tokenize(...values: Array<string | null | undefined>) {
  return values.flatMap((value) => normalize(value).split(/[^0-9a-z가-힣]+/u)).filter((value) => value.length >= 2);
}

export function sanitizeReferenceRequestInput(input: ReferenceContextRequestInput & Record<string, unknown>): ReferenceContextRequestInput {
  const safe: ReferenceContextRequestInput = {
    examMode: input.examMode,
    subject: String(input.subject ?? "").trim(),
    topicCandidate: typeof input.topicCandidate === "string" ? input.topicCandidate.trim() : null,
    conceptCandidate: typeof input.conceptCandidate === "string" ? input.conceptCandidate.trim() : null,
    taskType: input.taskType,
    maxSnippets: typeof input.maxSnippets === "number" ? input.maxSnippets : undefined,
    derivedTags: Array.isArray(input.derivedTags) ? input.derivedTags.filter((tag): tag is string => typeof tag === "string") : undefined,
    safeSkeletonIds: Array.isArray(input.safeSkeletonIds) ? input.safeSkeletonIds.filter((id): id is string => typeof id === "string") : undefined,
  };
  for (const key of USER_RAW_DATA_KEYS) {
    if (key in safe) delete (safe as Record<string, unknown>)[key];
  }
  return safe;
}

function cacheKey(input: ReferenceContextRequestInput) {
  return JSON.stringify({
    examMode: input.examMode,
    subject: normalize(input.subject),
    topicCandidate: normalize(input.topicCandidate),
    conceptCandidate: normalize(input.conceptCandidate),
    taskType: input.taskType,
    maxSnippets: input.maxSnippets ?? DEFAULT_MAX_SNIPPETS,
    derivedTags: input.derivedTags?.map(normalize).sort(),
    safeSkeletonIds: input.safeSkeletonIds?.map(normalize).sort(),
  });
}

function scoreEntry(entry: ReferenceCorpusEntry, input: ReferenceContextRequestInput) {
  let score = 0;
  if (entry.examMode === input.examMode) score += 4;
  if (entry.examMode === "shared") score += 2;
  if (normalize(entry.subject) === normalize(input.subject)) score += 5;
  const queryTokens = new Set(tokenize(input.topicCandidate, input.conceptCandidate, ...(input.derivedTags ?? [])));
  const entryTokens = new Set(tokenize(entry.title, entry.subject, entry.snippet, ...(entry.tags ?? []), ...(entry.topics ?? []), ...(entry.concepts ?? [])));
  for (const token of queryTokens) {
    if (entryTokens.has(token)) score += 2;
  }
  if (entry.usageStatus === "active") score += 1;
  return score;
}

function toSnippet(entry: ReferenceCorpusEntry, confidence: number, usedFallback = false): ReferenceSnippet {
  return {
    referenceId: entry.referenceId,
    title: entry.title,
    subject: entry.subject,
    sourceType: entry.sourceType,
    snippet: entry.snippet,
    citationLabel: entry.citationLabel,
    confidence,
    usedFallback,
  };
}

export function fallbackWithoutCache(input: ReferenceContextRequestInput, config: ReferenceContextConfig = {}): ReferenceContextResult {
  const resolved = getConfig(config);
  return {
    snippets: [],
    provider: resolved.provider,
    modelName: resolved.modelName,
    cacheHit: false,
    cacheEnabled: false,
    usedFallback: true,
  };
}

export async function getReferenceContextForRequest(input: ReferenceContextRequestInput & Record<string, unknown>, config: ReferenceContextConfig = {}): Promise<ReferenceContextResult> {
  const safeInput = sanitizeReferenceRequestInput(input);
  const resolved = getConfig(config);
  if (resolved.provider === "none") return fallbackWithoutCache(safeInput, resolved);

  let corpus: ReferenceCorpusEntry[] = [];
  try {
    corpus = await loadReferenceCorpus({ corpusSourcePath: resolved.corpusSourcePath });
  } catch {
    return fallbackWithoutCache(safeInput, resolved);
  }

  if (corpus.length === 0) return fallbackWithoutCache(safeInput, resolved);

  const maxSnippets = Math.max(0, Math.min(safeInput.maxSnippets ?? DEFAULT_MAX_SNIPPETS, 4));
  const ranked = corpus
    .map((entry) => ({ entry, score: scoreEntry(entry, safeInput) }))
    .filter(({ entry, score }) => score > 0 && (entry.examMode === safeInput.examMode || entry.examMode === "shared"))
    .sort((left, right) => right.score - left.score || left.entry.referenceId.localeCompare(right.entry.referenceId))
    .slice(0, maxSnippets)
    .map(({ entry, score }) => toSnippet(entry, Math.min(0.95, Math.max(0.35, score / 14))));

  return {
    snippets: ranked,
    provider: resolved.provider,
    modelName: resolved.modelName,
    cacheHit: false,
    cacheEnabled: resolved.cacheEnabled,
    usedFallback: ranked.length === 0,
  };
}

export async function createOrGetContextCache(input: ReferenceContextRequestInput & Record<string, unknown>, config: ReferenceContextConfig = {}): Promise<ReferenceContextResult> {
  const safeInput = sanitizeReferenceRequestInput(input);
  const resolved = getConfig(config);
  if (!resolved.cacheEnabled) return getReferenceContextForRequest(safeInput, { ...resolved, cacheEnabled: false });
  const key = cacheKey(safeInput);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return { ...cached.result, cacheHit: true };
  }
  const result = await getReferenceContextForRequest(safeInput, resolved);
  cache.set(key, { expiresAt: now + Math.max(0, resolved.cacheTtlMs), result });
  return result;
}

export function invalidateReferenceCache() {
  cache.clear();
}
