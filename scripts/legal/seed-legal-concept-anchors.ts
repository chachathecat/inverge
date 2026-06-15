import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { formatUnknownLegalIngestError } from "../../lib/legal/legal-error-serialization";

const seedPath = path.join(
  process.cwd(),
  "reference_corpus",
  "legal",
  "appraiser",
  "legal_concept_anchor_seed.json",
);

const EXAM_MODES = new Set(["first", "second", "both"]);
const ANCHOR_TYPES = new Set([
  "primary_source",
  "supporting_source",
  "exception_source",
  "definition_source",
  "procedure_source",
]);
const SOURCE_STATUSES = new Set(["draft", "verified", "needs_update"]);
const DEFAULT_CONFIDENCE = 0.75;

export type LegalConceptAnchorType =
  | "primary_source"
  | "supporting_source"
  | "exception_source"
  | "definition_source"
  | "procedure_source";

export type LegalConceptAnchorHint = {
  lawTitle: string;
  articleNo: string;
  anchorType: LegalConceptAnchorType;
  anchorRole: string;
};

export type LegalConceptAnchorSeedItem = {
  conceptKey: string;
  examMode: "first" | "second" | "both";
  examSubject: string;
  unit: string;
  label: string;
  description: string;
  anchorHints: LegalConceptAnchorHint[];
  sourceStatus: "draft" | "verified" | "needs_update";
  needsOfficialVerification: boolean;
  lastReviewedAt: string | null;
  safeUse: "legal_concept_anchor_seed";
};

export type LegalArticleChunkCandidate = {
  id: string;
  article_key?: string | null;
  law_title?: string | null;
  article_no: string;
  article_title?: string | null;
  body_text: string;
  version_id?: string | null;
};

export type AnchorResolution =
  | { status: "matched"; chunk: LegalArticleChunkCandidate; score: number }
  | { status: "missing"; reason: "no_chunk_found" | "no_plausible_chunk" }
  | {
      status: "ambiguous";
      reason: "multiple_plausible_chunks";
      candidates: LegalArticleChunkCandidate[];
    };

type SeedRunSummary = {
  conceptCount: number;
  anchorHintCount: number;
  upsertedConceptCount: number;
  upsertedAnchorCount: number;
  missingAnchorCount: number;
  ambiguousAnchorCount: number;
  dryRun: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readRequiredString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`legal concept anchor seed invalid field: ${key}`);
  }

  return value.trim();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseAnchorHint(value: unknown): LegalConceptAnchorHint {
  if (!isRecord(value)) {
    throw new Error("anchorHint must be an object.");
  }

  const lawTitle = readRequiredString(value, "lawTitle");
  const articleNo = readRequiredString(value, "articleNo");
  const anchorType = readRequiredString(value, "anchorType");
  const anchorRole = readRequiredString(value, "anchorRole");

  if (!ANCHOR_TYPES.has(anchorType)) {
    throw new Error(`unsupported anchorType: ${anchorType}`);
  }

  return {
    lawTitle,
    articleNo,
    anchorType: anchorType as LegalConceptAnchorType,
    anchorRole,
  };
}

export function parseLegalConceptAnchorSeedItem(value: unknown): LegalConceptAnchorSeedItem {
  if (!isRecord(value)) {
    throw new Error("Legal concept anchor seed item must be an object.");
  }

  const conceptKey = readRequiredString(value, "conceptKey");
  const examMode = readRequiredString(value, "examMode");
  const examSubject = readRequiredString(value, "examSubject");
  const unit = readRequiredString(value, "unit");
  const label = readRequiredString(value, "label");
  const description = readRequiredString(value, "description");
  const sourceStatus = readRequiredString(value, "sourceStatus");
  const needsOfficialVerification = value.needsOfficialVerification;
  const lastReviewedAt = value.lastReviewedAt;
  const safeUse = value.safeUse;
  const anchorHints = value.anchorHints;

  if (!EXAM_MODES.has(examMode)) {
    throw new Error(`unsupported examMode: ${examMode}`);
  }

  if (!SOURCE_STATUSES.has(sourceStatus)) {
    throw new Error(`unsupported sourceStatus: ${sourceStatus}`);
  }

  if (needsOfficialVerification !== true) {
    throw new Error(`${conceptKey} must keep needsOfficialVerification=true until human review.`);
  }

  if (lastReviewedAt !== null && typeof lastReviewedAt !== "string") {
    throw new Error(`${conceptKey} has invalid lastReviewedAt.`);
  }

  if (safeUse !== "legal_concept_anchor_seed") {
    throw new Error(`${conceptKey} has invalid safeUse.`);
  }

  if (!Array.isArray(anchorHints) || anchorHints.length === 0) {
    throw new Error(`${conceptKey} must include at least one anchorHint.`);
  }

  return {
    conceptKey,
    examMode: examMode as LegalConceptAnchorSeedItem["examMode"],
    examSubject,
    unit,
    label,
    description,
    anchorHints: anchorHints.map(parseAnchorHint),
    sourceStatus: sourceStatus as LegalConceptAnchorSeedItem["sourceStatus"],
    needsOfficialVerification,
    lastReviewedAt,
    safeUse,
  };
}

export async function loadLegalConceptAnchorSeed(): Promise<LegalConceptAnchorSeedItem[]> {
  const seedJson = await readFile(seedPath, "utf8");
  const parsed = JSON.parse(seedJson) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Legal concept anchor seed file must contain an array.");
  }

  const seeds = parsed.map(parseLegalConceptAnchorSeedItem);
  const conceptKeys = new Set<string>();

  for (const seed of seeds) {
    if (conceptKeys.has(seed.conceptKey)) {
      throw new Error(`Duplicate legal concept key: ${seed.conceptKey}`);
    }

    conceptKeys.add(seed.conceptKey);
  }

  return seeds;
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isHeadingOnlyChunk(chunk: LegalArticleChunkCandidate) {
  const bodyText = normalizeWhitespace(chunk.body_text);
  const articleTitle = normalizeWhitespace(chunk.article_title ?? "");
  const stripped = bodyText
    .replace(chunk.article_no, "")
    .replace(articleTitle, "")
    .replace(/[()\[\]{}.,;:\-\s]/g, "");

  return bodyText.length < 40 || stripped.length < 12;
}

function scoreAnchorCandidate(articleNo: string, chunk: LegalArticleChunkCandidate) {
  const bodyText = normalizeWhitespace(chunk.body_text);
  const hasTitle = Boolean(chunk.article_title && chunk.article_title.trim().length > 0);
  const startsWithArticleNo = bodyText.startsWith(articleNo);
  const headingOnly = isHeadingOnlyChunk(chunk);

  let score = 0;

  if (hasTitle) {
    score += 6;
  }

  if (startsWithArticleNo) {
    score += 4;
  }

  if (!headingOnly) {
    score += 4;
  } else {
    score -= 6;
  }

  if (bodyText.length >= 80) {
    score += 2;
  } else if (bodyText.length >= 40) {
    score += 1;
  }

  return score;
}

export function selectLegalAnchorChunk(
  articleNo: string,
  candidates: LegalArticleChunkCandidate[],
): AnchorResolution {
  if (candidates.length === 0) {
    return { status: "missing", reason: "no_chunk_found" };
  }

  const plausible = candidates.filter((chunk) => chunk.id && normalizeWhitespace(chunk.body_text).length > 0);

  if (plausible.length === 0) {
    return { status: "missing", reason: "no_plausible_chunk" };
  }

  const titledSubstantive = plausible.filter(
    (chunk) => Boolean(chunk.article_title && chunk.article_title.trim()) && !isHeadingOnlyChunk(chunk),
  );
  const substantive = plausible.filter((chunk) => !isHeadingOnlyChunk(chunk));
  const pool = titledSubstantive.length > 0 ? titledSubstantive : substantive.length > 0 ? substantive : plausible;
  const ranked = pool
    .map((chunk) => ({ chunk, score: scoreAnchorCandidate(articleNo, chunk) }))
    .sort((left, right) => right.score - left.score);

  const best = ranked[0];
  const second = ranked[1];

  if (!best) {
    return { status: "missing", reason: "no_plausible_chunk" };
  }

  if (second && second.score === best.score) {
    return {
      status: "ambiguous",
      reason: "multiple_plausible_chunks",
      candidates: ranked.filter((candidate) => candidate.score === best.score).map((candidate) => candidate.chunk),
    };
  }

  return {
    status: "matched",
    chunk: best.chunk,
    score: best.score,
  };
}

async function upsertConceptNode(
  supabase: SupabaseClient,
  seed: LegalConceptAnchorSeedItem,
): Promise<string> {
  const { data, error } = await supabase
    .from("legal_concept_nodes")
    .upsert(
      {
        concept_key: seed.conceptKey,
        exam_subject: seed.examSubject,
        label: seed.label,
        description: seed.description,
        metadata: {
          examMode: seed.examMode,
          unit: seed.unit,
          sourceStatus: seed.sourceStatus,
          needsOfficialVerification: seed.needsOfficialVerification,
          lastReviewedAt: seed.lastReviewedAt,
          safeUse: seed.safeUse,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "concept_key" },
    )
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function fetchCurrentArticleChunks(
  supabase: SupabaseClient,
  hint: LegalConceptAnchorHint,
): Promise<LegalArticleChunkCandidate[]> {
  const { data, error } = await supabase
    .from("legal_article_chunks")
    .select("id, article_key, law_title, article_no, article_title, body_text, version_id, legal_versions!inner(is_current)")
    .eq("law_title", hint.lawTitle)
    .eq("article_no", hint.articleNo)
    .eq("legal_versions.is_current", true);

  if (error) {
    throw error;
  }

  return (Array.isArray(data) ? data : []).map((row) => {
    const record = row as Record<string, unknown>;

    return {
      id: String(record.id ?? ""),
      article_key: typeof record.article_key === "string" ? record.article_key : null,
      law_title: typeof record.law_title === "string" ? record.law_title : null,
      article_no: typeof record.article_no === "string" ? record.article_no : hint.articleNo,
      article_title: typeof record.article_title === "string" ? record.article_title : null,
      body_text: typeof record.body_text === "string" ? record.body_text : "",
      version_id: typeof record.version_id === "string" ? record.version_id : null,
    };
  });
}

async function upsertConceptAnchor(
  supabase: SupabaseClient,
  params: {
    conceptNodeId: string;
    articleChunkId: string;
    seed: LegalConceptAnchorSeedItem;
    hint: LegalConceptAnchorHint;
  },
): Promise<void> {
  const { error } = await supabase.from("legal_concept_anchors").upsert(
    {
      concept_node_id: params.conceptNodeId,
      article_chunk_id: params.articleChunkId,
      anchor_type: params.hint.anchorType,
      confidence: DEFAULT_CONFIDENCE,
      metadata: {
        conceptKey: params.seed.conceptKey,
        lawTitle: params.hint.lawTitle,
        articleNo: params.hint.articleNo,
        anchorRole: params.hint.anchorRole,
        sourceStatus: params.seed.sourceStatus,
        needsOfficialVerification: params.seed.needsOfficialVerification,
        lastReviewedAt: params.seed.lastReviewedAt,
        safeUse: params.seed.safeUse,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "concept_node_id,article_chunk_id,anchor_type" },
  );

  if (error) {
    throw error;
  }
}

export async function runLegalConceptAnchorSeed(options: {
  dryRun?: boolean;
  supabase?: SupabaseClient;
  seeds?: LegalConceptAnchorSeedItem[];
} = {}): Promise<SeedRunSummary> {
  const seeds = options.seeds ?? (await loadLegalConceptAnchorSeed());
  const anchorHintCount = seeds.reduce((sum, seed) => sum + seed.anchorHints.length, 0);
  const dryRun = options.dryRun ?? process.env.LEGAL_CONCEPT_ANCHOR_DRY_RUN === "1";

  if (dryRun) {
    console.info(
      `[legal-anchor-seed] dry run: ${seeds.length} concept nodes, ${anchorHintCount} anchor hints validated`,
    );

    return {
      conceptCount: seeds.length,
      anchorHintCount,
      upsertedConceptCount: 0,
      upsertedAnchorCount: 0,
      missingAnchorCount: 0,
      ambiguousAnchorCount: 0,
      dryRun: true,
    };
  }

  const supabase = options.supabase ?? createAdminClient();
  const summary: SeedRunSummary = {
    conceptCount: seeds.length,
    anchorHintCount,
    upsertedConceptCount: 0,
    upsertedAnchorCount: 0,
    missingAnchorCount: 0,
    ambiguousAnchorCount: 0,
    dryRun: false,
  };

  for (const seed of seeds) {
    const conceptNodeId = await upsertConceptNode(supabase, seed);
    summary.upsertedConceptCount += 1;

    for (const hint of seed.anchorHints) {
      const chunks = await fetchCurrentArticleChunks(supabase, hint);
      const resolution = selectLegalAnchorChunk(hint.articleNo, chunks);

      if (resolution.status === "missing") {
        summary.missingAnchorCount += 1;
        console.warn(
          `[legal-anchor-seed] missing anchor: conceptKey=${seed.conceptKey}, lawTitle=${hint.lawTitle}, articleNo=${hint.articleNo}`,
        );
        continue;
      }

      if (resolution.status === "ambiguous") {
        summary.ambiguousAnchorCount += 1;
        console.warn(
          `[legal-anchor-seed] ambiguous anchor: conceptKey=${seed.conceptKey}, lawTitle=${hint.lawTitle}, articleNo=${hint.articleNo}, candidates=${resolution.candidates.length}`,
        );
        continue;
      }

      await upsertConceptAnchor(supabase, {
        conceptNodeId,
        articleChunkId: resolution.chunk.id,
        seed,
        hint,
      });
      summary.upsertedAnchorCount += 1;
    }
  }

  console.info(
    `[legal-anchor-seed] upserted ${summary.upsertedConceptCount} concept nodes and ${summary.upsertedAnchorCount} anchors; missing=${summary.missingAnchorCount}, ambiguous=${summary.ambiguousAnchorCount}`,
  );

  return summary;
}

async function main(): Promise<void> {
  await runLegalConceptAnchorSeed();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = formatUnknownLegalIngestError(error);
    console.error(`[legal-anchor-seed] failed: ${message}`);
    process.exitCode = 1;
  });
}
