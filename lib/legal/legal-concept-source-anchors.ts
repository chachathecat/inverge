import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createOptionalSupabaseServerClient } from "@/lib/supabase/server";

const MAX_QUERY_LENGTH = 160;
const DEFAULT_MATCH_COUNT = 12;
const MAX_MATCH_COUNT = 50;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const WHITESPACE_PATTERN = /\s+/g;

export type LegalConceptSourceStatus = "draft" | "verified" | "needs_update" | string;

export type LegalConceptSourceAnchor = {
  conceptKey: string;
  conceptLabel: string;
  examSubject: string;
  unit: string | null;
  conceptMetadata: Record<string, unknown>;
  anchorType: string;
  anchorConfidence: number;
  anchorMetadata: Record<string, unknown>;
  lawTitle: string;
  articleNo: string;
  articleKey: string;
  articleTitle: string | null;
  bodyText: string;
  chunkMetadata: Record<string, unknown>;
  sourceStatus: LegalConceptSourceStatus;
  needsOfficialVerification: boolean;
};

export type LegalConceptSourceAnchorEmptyResult = {
  found: false;
  reason: "no_concept_source_anchor_found";
  anchors: [];
};

export type LegalConceptSourceAnchorFoundResult = {
  found: true;
  reason: null;
  anchors: LegalConceptSourceAnchor[];
};

export type LegalConceptSourceAnchorResult =
  | LegalConceptSourceAnchorEmptyResult
  | LegalConceptSourceAnchorFoundResult;

export type LegalConceptSourceAnchorRpcClient = Pick<SupabaseClient, "rpc">;

export type GetLegalConceptSourceAnchorsOptions = {
  conceptKey?: string | null;
  examSubject?: string | null;
  matchCount?: number | null;
  client?: LegalConceptSourceAnchorRpcClient | null;
};

type LegalConceptSourceAnchorRow = {
  concept_key: unknown;
  concept_label: unknown;
  exam_subject: unknown;
  unit: unknown;
  concept_metadata: unknown;
  anchor_type: unknown;
  anchor_confidence: unknown;
  anchor_metadata: unknown;
  law_title: unknown;
  article_no: unknown;
  article_key: unknown;
  article_title: unknown;
  body_text: unknown;
  chunk_metadata: unknown;
  source_status: unknown;
  needs_official_verification: unknown;
};

export class LegalConceptSourceAnchorError extends Error {
  constructor(message = "legal-concept-source-anchor-lookup-failed") {
    super(message);
    this.name = "LegalConceptSourceAnchorError";
  }
}

export function normalizeLegalConceptAnchorFilter(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(CONTROL_CHAR_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

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

function readNullableString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return true;
}

function readNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toLegalConceptSourceAnchor(row: LegalConceptSourceAnchorRow): LegalConceptSourceAnchor | null {
  const conceptKey = readString(row.concept_key);
  const conceptLabel = readString(row.concept_label);
  const examSubject = readString(row.exam_subject);
  const anchorType = readString(row.anchor_type);
  const lawTitle = readString(row.law_title);
  const articleNo = readString(row.article_no);
  const articleKey = readString(row.article_key);
  const bodyText = readString(row.body_text);

  if (!conceptKey || !conceptLabel || !examSubject || !anchorType || !lawTitle || !articleNo || !articleKey || !bodyText) {
    return null;
  }

  return {
    conceptKey,
    conceptLabel,
    examSubject,
    unit: readNullableString(row.unit),
    conceptMetadata: isRecord(row.concept_metadata) ? row.concept_metadata : {},
    anchorType,
    anchorConfidence: readNumber(row.anchor_confidence),
    anchorMetadata: isRecord(row.anchor_metadata) ? row.anchor_metadata : {},
    lawTitle,
    articleNo,
    articleKey,
    articleTitle: readNullableString(row.article_title),
    bodyText,
    chunkMetadata: isRecord(row.chunk_metadata) ? row.chunk_metadata : {},
    sourceStatus: readString(row.source_status) || "draft",
    needsOfficialVerification: readBoolean(row.needs_official_verification),
  };
}

function emptyLegalConceptSourceAnchorResult(): LegalConceptSourceAnchorEmptyResult {
  return {
    found: false,
    reason: "no_concept_source_anchor_found",
    anchors: [],
  };
}

export async function getLegalConceptSourceAnchors(
  options: GetLegalConceptSourceAnchorsOptions = {},
): Promise<LegalConceptSourceAnchorResult> {
  const client = options.client ?? (await createOptionalSupabaseServerClient());

  if (!client) {
    return emptyLegalConceptSourceAnchorResult();
  }

  const { data, error } = await client.rpc("get_legal_concept_source_anchors", {
    concept_key_filter: normalizeLegalConceptAnchorFilter(options.conceptKey),
    exam_subject_filter: normalizeLegalConceptAnchorFilter(options.examSubject),
    match_count: normalizeMatchCount(options.matchCount),
  });

  if (error) {
    throw new LegalConceptSourceAnchorError();
  }

  const anchors = (Array.isArray(data) ? data : [])
    .map((row) => (isRecord(row) ? toLegalConceptSourceAnchor(row as LegalConceptSourceAnchorRow) : null))
    .filter((anchor): anchor is LegalConceptSourceAnchor => anchor !== null);

  if (anchors.length === 0) {
    return emptyLegalConceptSourceAnchorResult();
  }

  return {
    found: true,
    reason: null,
    anchors,
  };
}
