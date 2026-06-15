import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  fetchCurrentLawBodyById,
  searchCurrentLawByTitle,
} from "../../lib/legal/law-open-api";
import { extractLawSearchHits, pickExactLaw } from "../../lib/legal/legal-normalizer";
import { extractArticleChunks } from "../../lib/legal/parse-law-xml";

type LegalSourceSeed = {
  sourceKey: string;
  title: string;
  sourceType: string;
  provider: "moleg_law_open_api";
  priority: number;
  examSubjects: string[];
  needsOfficialVerification: boolean;
};

const seedPath = path.join(
  process.cwd(),
  "reference_corpus",
  "legal",
  "appraiser",
  "legal_sources.seed.json",
);

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
});

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function readThrottleMs(): number {
  const parsed = Number.parseInt(process.env.LAW_OPEN_API_THROTTLE_MS ?? "500", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
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

function parseSeedItem(value: unknown): LegalSourceSeed {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Legal source seed item must be an object.");
  }

  const record = value as Record<string, unknown>;
  const sourceKey = record.sourceKey;
  const title = record.title;
  const sourceType = record.sourceType;
  const provider = record.provider;
  const priority = record.priority;
  const examSubjects = record.examSubjects;
  const needsOfficialVerification = record.needsOfficialVerification;

  if (
    typeof sourceKey !== "string" ||
    typeof title !== "string" ||
    typeof sourceType !== "string" ||
    provider !== "moleg_law_open_api" ||
    typeof priority !== "number" ||
    !Array.isArray(examSubjects) ||
    !examSubjects.every((subject) => typeof subject === "string") ||
    typeof needsOfficialVerification !== "boolean"
  ) {
    throw new Error("Legal source seed item has invalid metadata fields.");
  }

  return {
    sourceKey,
    title,
    sourceType,
    provider,
    priority,
    examSubjects,
    needsOfficialVerification,
  };
}

async function loadSeed(): Promise<LegalSourceSeed[]> {
  const seedJson = await readFile(seedPath, "utf8");
  const parsed = JSON.parse(seedJson) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Legal source seed file must contain an array.");
  }

  return parsed.map(parseSeedItem);
}

async function recordSyncRun(
  supabase: SupabaseClient,
  params: {
    sourceId: string | null;
    status: "succeeded" | "failed";
    requestCount: number;
    articleCount: number;
    versionHash?: string;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("legal_sync_runs").insert({
    source_id: params.sourceId,
    status: params.status,
    provider: "moleg_law_open_api",
    finished_at: new Date().toISOString(),
    request_count: params.requestCount,
    article_count: params.articleCount,
    version_hash: params.versionHash,
    error_code: params.errorCode,
    error_message: params.errorMessage,
    metadata: {
      safeUse: "legal_source_ingest",
      ...params.metadata,
    },
  });

  if (error) {
    throw error;
  }
}

async function upsertSource(
  supabase: SupabaseClient,
  seed: LegalSourceSeed,
  providerLawId?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("legal_sources")
    .upsert(
      {
        source_key: seed.sourceKey,
        title: seed.title,
        source_type: seed.sourceType,
        provider: seed.provider,
        provider_law_id: providerLawId,
        priority: seed.priority,
        exam_subjects: seed.examSubjects,
        needs_official_verification: seed.needsOfficialVerification,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_key" },
    )
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function ingestSource(
  supabase: SupabaseClient,
  seed: LegalSourceSeed,
  throttleMs: number,
): Promise<void> {
  let sourceId: string | null = null;
  let requestCount = 0;

  try {
    sourceId = await upsertSource(supabase, seed);

    const searchXml = await searchCurrentLawByTitle(seed.title, { throttleMs });
    requestCount += 1;

    const searchHits = extractLawSearchHits(parser.parse(searchXml));
    const exactLaw = pickExactLaw(searchHits, seed.title);

    if (!exactLaw) {
      throw new Error(`Exact current law match not found for sourceKey=${seed.sourceKey}.`);
    }

    sourceId = await upsertSource(supabase, seed, exactLaw.lawId);

    const lawBodyXml = await fetchCurrentLawBodyById(exactLaw.lawId, { throttleMs });
    requestCount += 1;

    const rawXmlSha256 = hashText(lawBodyXml);
    const versionHash = hashText(`${seed.sourceKey}:${exactLaw.lawId}:${rawXmlSha256}`);
    const lawBody = parser.parse(lawBodyXml);
    const articleChunks = extractArticleChunks(lawBody);

    if (articleChunks.length === 0) {
      throw new Error(`No article chunks extracted for sourceKey=${seed.sourceKey}.`);
    }

    const { error: updateCurrentError } = await supabase
      .from("legal_versions")
      .update({ is_current: false })
      .eq("source_id", sourceId);

    if (updateCurrentError) {
      throw updateCurrentError;
    }

    const { data: versionRow, error: versionError } = await supabase
      .from("legal_versions")
      .upsert(
        {
          source_id: sourceId,
          provider_law_id: exactLaw.lawId,
          law_title: articleChunks[0]?.lawTitle ?? exactLaw.title,
          promulgation_date: exactLaw.promulgationDate,
          effective_date: exactLaw.effectiveDate,
          promulgation_number: exactLaw.promulgationNumber,
          ministry_name: exactLaw.ministryName,
          version_hash: versionHash,
          raw_xml_sha256: rawXmlSha256,
          fetched_at: new Date().toISOString(),
          is_current: true,
          metadata: {
            safeUse: "legal_source_ingest",
            sourceKey: seed.sourceKey,
            sourceType: seed.sourceType,
            examSubjects: seed.examSubjects,
            needsOfficialVerification: seed.needsOfficialVerification,
          },
        },
        { onConflict: "source_id,version_hash" },
      )
      .select("id")
      .single();

    if (versionError) {
      throw versionError;
    }

    const versionId = versionRow.id as string;
    const chunkRows = articleChunks.map((chunk) => ({
      source_id: sourceId,
      version_id: versionId,
      provider_law_id: exactLaw.lawId,
      law_title: chunk.lawTitle,
      article_no: chunk.articleNo,
      article_title: chunk.articleTitle,
      body_text: chunk.bodyText,
      normalized_text: chunk.normalizedText,
      embedding_text: chunk.embeddingText,
      metadata: {
        ...chunk.metadata,
        safeUse: "legal_source_ingest",
        sourceKey: seed.sourceKey,
        sourceType: seed.sourceType,
      },
    }));

    const { error: chunkError } = await supabase
      .from("legal_article_chunks")
      .upsert(chunkRows, { onConflict: "version_id,article_no" });

    if (chunkError) {
      throw chunkError;
    }

    await recordSyncRun(supabase, {
      sourceId,
      status: "succeeded",
      requestCount,
      articleCount: articleChunks.length,
      versionHash,
      metadata: {
        sourceKey: seed.sourceKey,
        providerLawId: exactLaw.lawId,
      },
    });

    console.info(`[legal-ingest] ${seed.sourceKey}: ${articleChunks.length} article chunks`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown legal ingest error.";

    await recordSyncRun(supabase, {
      sourceId,
      status: "failed",
      requestCount,
      articleCount: 0,
      errorCode: "LEGAL_INGEST_FAILED",
      errorMessage: message,
      metadata: {
        sourceKey: seed.sourceKey,
      },
    });

    throw error;
  }
}

async function main(): Promise<void> {
  if (!process.env.LAW_OPEN_API_OC) {
    throw new Error("LAW_OPEN_API_OC is required for legal source ingestion.");
  }

  const supabase = createAdminClient();
  const throttleMs = readThrottleMs();
  const seeds = await loadSeed();

  for (const seed of seeds) {
    await ingestSource(supabase, seed, throttleMs);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown legal ingest error.";
  console.error(`[legal-ingest] failed: ${message}`);
  process.exitCode = 1;
});
