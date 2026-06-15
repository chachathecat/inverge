import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createOptionalSupabaseServerClient } from "@/lib/supabase/server";

const MAX_QUERY_LENGTH = 500;
const DEFAULT_MATCH_COUNT = 8;
const MAX_MATCH_COUNT = 20;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const WHITESPACE_PATTERN = /\s+/g;

export type LegalChunkCandidate = {
  id: string;
  sourceId: string;
  versionId: string;
  lawTitle: string;
  articleNo: string;
  articleKey: string;
  articleTitle: string | null;
  bodyText: string;
  metadata: Record<string, unknown>;
  rankScore: number;
};

export type LegalRetrievalEmptyResult = {
  grounded: false;
  reason: "no_source_anchor_found";
  query: string;
  candidates: [];
};

export type LegalRetrievalGroundedResult = {
  grounded: true;
  reason: null;
  query: string;
  candidates: LegalChunkCandidate[];
};

export type LegalRetrievalResult = LegalRetrievalEmptyResult | LegalRetrievalGroundedResult;

export type LegalRetrievalRpcClient = Pick<SupabaseClient, "rpc">;

export type RetrieveLegalChunkCandidatesOptions = {
  queryText: string;
  lawTitleFilter?: string | null;
  matchCount?: number | null;
  client?: LegalRetrievalRpcClient | null;
};

type LegalChunkCandidateRow = {
  id: unknown;
  source_id: unknown;
  version_id: unknown;
  law_title: unknown;
  article_no: unknown;
  article_key: unknown;
  article_title: unknown;
  body_text: unknown;
  metadata: unknown;
  rank_score: unknown;
};

export class LegalRetrievalError extends Error {
  constructor(message = "legal-retrieval-failed") {
    super(message);
    this.name = "LegalRetrievalError";
  }
}

export function normalizeLegalRetrievalQuery(queryText: string) {
  return queryText
    .replace(CONTROL_CHAR_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function normalizeLawTitleFilter(lawTitleFilter?: string | null) {
  if (!lawTitleFilter) {
    return null;
  }

  const normalized = normalizeLegalRetrievalQuery(lawTitleFilter);
  return normalized.length > 0 ? normalized : null;
}

function normalizeMatchCount(matchCount?: number | null) {
  if (!Number.isFinite(matchCount)) {
    return DEFAULT_MATCH_COUNT;
  }

  return Math.min(Math.max(Math.trunc(matchCount as number), 1), MAX_MATCH_COUNT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toLegalChunkCandidate(row: LegalChunkCandidateRow): LegalChunkCandidate | null {
  const id = readString(row.id);
  const sourceId = readString(row.source_id);
  const versionId = readString(row.version_id);
  const lawTitle = readString(row.law_title);
  const articleNo = readString(row.article_no);
  const articleKey = readString(row.article_key);
  const bodyText = readString(row.body_text);

  if (!id || !sourceId || !versionId || !lawTitle || !articleNo || !articleKey || !bodyText) {
    return null;
  }

  return {
    id,
    sourceId,
    versionId,
    lawTitle,
    articleNo,
    articleKey,
    articleTitle: typeof row.article_title === "string" && row.article_title.length > 0 ? row.article_title : null,
    bodyText,
    metadata: isRecord(row.metadata) ? row.metadata : {},
    rankScore: typeof row.rank_score === "number" ? row.rank_score : Number(row.rank_score ?? 0),
  };
}

function emptyLegalRetrievalResult(query: string): LegalRetrievalEmptyResult {
  return {
    grounded: false,
    reason: "no_source_anchor_found",
    query,
    candidates: [],
  };
}

export async function retrieveLegalChunkCandidates(
  options: RetrieveLegalChunkCandidatesOptions,
): Promise<LegalRetrievalResult> {
  const query = normalizeLegalRetrievalQuery(options.queryText);

  if (!query) {
    return emptyLegalRetrievalResult(query);
  }

  const client = options.client ?? (await createOptionalSupabaseServerClient());

  if (!client) {
    return emptyLegalRetrievalResult(query);
  }

  const { data, error } = await client.rpc("search_legal_chunks_keyword", {
    query_text: query,
    law_title_filter: normalizeLawTitleFilter(options.lawTitleFilter),
    match_count: normalizeMatchCount(options.matchCount),
  });

  if (error) {
    throw new LegalRetrievalError();
  }

  const candidates = (Array.isArray(data) ? data : [])
    .map((row) => (isRecord(row) ? toLegalChunkCandidate(row as LegalChunkCandidateRow) : null))
    .filter((candidate): candidate is LegalChunkCandidate => candidate !== null);

  if (candidates.length === 0) {
    return emptyLegalRetrievalResult(query);
  }

  return {
    grounded: true,
    reason: null,
    query,
    candidates,
  };
}
