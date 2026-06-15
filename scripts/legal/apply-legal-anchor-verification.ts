import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { formatUnknownLegalIngestError } from "../../lib/legal/legal-error-serialization";

type LegalAnchorVerificationDecision = "verified" | "needs_update" | "rejected" | "keep_draft";

type LegalAnchorVerificationDecisionItem = {
  conceptKey: string;
  articleKey: string;
  decision: LegalAnchorVerificationDecision;
  reviewer: string | null;
  reviewedAt: string | null;
  notes: string;
  safeUse: string | null;
};

type LegalAnchorVerificationSummary = {
  totalDecisions: number;
  verifiedCount: number;
  needsUpdateCount: number;
  rejectedCount: number;
  keepDraftCount: number;
  missingConceptCount: number;
  missingArticleCount: number;
  missingAnchorCount: number;
  dryRun: boolean;
};

type LegalConceptNodeRow = {
  id?: string;
  concept_key?: unknown;
};

type LegalArticleChunkRow = {
  id?: string;
  article_key?: unknown;
};

type LegalConceptAnchorRow = {
  id?: string;
  concept_node_id?: unknown;
  article_chunk_id?: unknown;
  confidence?: unknown;
  metadata?: unknown;
};

const SUPPORTED_DECISIONS: Set<LegalAnchorVerificationDecision> = new Set([
  "verified",
  "needs_update",
  "rejected",
  "keep_draft",
]);
const REFERENCE_DECISION_MAP = {
  verified: { sourceStatus: "verified", needsOfficialVerification: false, confidence: 1.0 as number | null },
  needs_update: { sourceStatus: "needs_update", needsOfficialVerification: true, confidence: null },
  rejected: { sourceStatus: "rejected", needsOfficialVerification: true, confidence: null },
  keep_draft: { sourceStatus: "draft", needsOfficialVerification: true, confidence: null },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readDecision(value: unknown, index: number): LegalAnchorVerificationDecision {
  const text = readText(value);

  if (!SUPPORTED_DECISIONS.has(text as LegalAnchorVerificationDecision)) {
    throw new Error(`legal anchor verification decision #${index} must be one of verified|needs_update|rejected|keep_draft`);
  }

  return text as LegalAnchorVerificationDecision;
}

function parseReviewedAt(index: number, reviewedAt: unknown) {
  const value = readText(reviewedAt);

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`legal anchor verification decision #${index} has invalid reviewedAt`);
  }

  return date.toISOString();
}

function parseDecisionItem(value: unknown, index: number): LegalAnchorVerificationDecisionItem {
  if (!isRecord(value)) {
    throw new Error(`legal anchor verification decision #${index} must be an object`);
  }

  const conceptKey = readString(value.conceptKey);
  const articleKey = readString(value.articleKey);
  const decision = readDecision(value.decision, index);
  const reviewer = readText(value.reviewer);
  const reviewedAt = parseReviewedAt(index, value.reviewedAt);
  const notes = readText(value.notes);
  const safeUse = readText(value.safeUse);

  if (!conceptKey) {
    throw new Error(`legal anchor verification decision #${index} missing conceptKey`);
  }

  if (!articleKey) {
    throw new Error(`legal anchor verification decision #${index} missing articleKey`);
  }

  if (decision === "verified" && (!reviewer || !reviewedAt)) {
    throw new Error(`legal anchor verification decision #${index} verified requires reviewer and reviewedAt`);
  }

  return {
    conceptKey,
    articleKey,
    decision,
    reviewer: reviewer || null,
    reviewedAt,
    notes,
    safeUse: safeUse || null,
  };
}

function parseDecisions(contents: string): LegalAnchorVerificationDecisionItem[] {
  const parsed = JSON.parse(contents) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("legal anchor verification decisions must be a JSON array.");
  }

  return parsed.map((item, index) => parseDecisionItem(item, index));
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

function toMapByField<T extends { id?: string }>(
  rows: T[],
  keySelector: (row: T) => string,
  keyName: string,
) {
  const map = new Map<string, string>();

  for (const row of rows) {
    const key = keySelector(row);
    const id = row.id;

    if (!key || !id) {
      continue;
    }

    if (map.has(key)) {
      throw new Error(`multiple ${keyName} rows found for ${keyName} ${key}`);
    }

    map.set(key, id);
  }

  return map;
}

async function loadDecisions(): Promise<LegalAnchorVerificationDecisionItem[]> {
  const decisionsPath = process.env.LEGAL_ANCHOR_VERIFICATION_DECISIONS_PATH;

  if (!decisionsPath) {
    throw new Error("LEGAL_ANCHOR_VERIFICATION_DECISIONS_PATH is required.");
  }

  const absolutePath = path.isAbsolute(decisionsPath) ? decisionsPath : path.join(process.cwd(), decisionsPath);
  const contents = await readFile(absolutePath, "utf8");

  return parseDecisions(contents);
}

function buildDecisionMetaPatch(item: LegalAnchorVerificationDecisionItem) {
  const decisionConfig = REFERENCE_DECISION_MAP[item.decision];

  return {
    sourceStatus: decisionConfig.sourceStatus,
    needsOfficialVerification: decisionConfig.needsOfficialVerification,
    verificationDecision: item.decision,
    reviewedAt: item.reviewedAt,
    reviewer: item.reviewer,
    reviewerNotes: item.notes,
    safeUse: "legal_anchor_verification_apply",
  };
}

function parseMetadata(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  return value;
}

function toConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return 0;
}

export async function applyLegalAnchorVerificationDecisions(
  decisions: LegalAnchorVerificationDecisionItem[],
  options: {
    supabase: SupabaseClient;
    dryRun?: boolean;
  },
): Promise<LegalAnchorVerificationSummary> {
  const conceptKeys = [...new Set(decisions.map((decision) => decision.conceptKey))];
  const articleKeys = [...new Set(decisions.map((decision) => decision.articleKey))];
  const summary: LegalAnchorVerificationSummary = {
    totalDecisions: decisions.length,
    verifiedCount: decisions.filter((decision) => decision.decision === "verified").length,
    needsUpdateCount: decisions.filter((decision) => decision.decision === "needs_update").length,
    rejectedCount: decisions.filter((decision) => decision.decision === "rejected").length,
    keepDraftCount: decisions.filter((decision) => decision.decision === "keep_draft").length,
    missingConceptCount: 0,
    missingArticleCount: 0,
    missingAnchorCount: 0,
    dryRun: options.dryRun ?? false,
  };

  if (decisions.length === 0) {
    console.info("[legal-anchor-verification-apply] no decisions to apply");
    return summary;
  }

  const conceptLookup = conceptKeys.length
    ? (
        await options.supabase
          .from("legal_concept_nodes")
          .select("id, concept_key")
          .in("concept_key", conceptKeys)
      )
    : { data: [], error: null };

  if (conceptLookup.error) {
    throw conceptLookup.error;
  }

  const conceptNodeIds = toMapByField((conceptLookup.data ?? []) as LegalConceptNodeRow[], (row) => String(row.concept_key), "conceptKey");

  const articleLookup = articleKeys.length
    ? await options.supabase
        .from("legal_article_chunks")
        .select("id, article_key, legal_versions!inner(is_current)")
        .in("article_key", articleKeys)
        .eq("legal_versions.is_current", true)
    : { data: [], error: null };

  if (articleLookup.error) {
    throw articleLookup.error;
  }

  const articleChunkIds = toMapByField((articleLookup.data ?? []) as LegalArticleChunkRow[], (row) =>
    String(row.article_key),
  "articleKey");

  const conceptNodeIdValues = [...conceptNodeIds.values()];
  const articleChunkIdValues = [...articleChunkIds.values()];

  const anchorLookup = conceptNodeIdValues.length && articleChunkIdValues.length
    ? await options.supabase
        .from("legal_concept_anchors")
        .select("id, confidence, concept_node_id, article_chunk_id, metadata")
        .in("concept_node_id", conceptNodeIdValues)
        .in("article_chunk_id", articleChunkIdValues)
    : { data: [], error: null };

  if (anchorLookup.error) {
    throw anchorLookup.error;
  }

  const anchorsByPair = new Map<string, LegalConceptAnchorRow[]>();

  for (const rawAnchor of (anchorLookup.data ?? []) as LegalConceptAnchorRow[]) {
    if (!rawAnchor.concept_node_id || !rawAnchor.article_chunk_id || !rawAnchor.id) {
      continue;
    }

    const pair = `${rawAnchor.concept_node_id}|${rawAnchor.article_chunk_id}`;
    const existing = anchorsByPair.get(pair) ?? [];
    existing.push(rawAnchor);
    anchorsByPair.set(pair, existing);
  }

  const safeNow = new Date().toISOString();

  for (const item of decisions) {
    const conceptNodeId = conceptNodeIds.get(item.conceptKey);
    if (!conceptNodeId) {
      summary.missingConceptCount += 1;
      continue;
    }

    const articleChunkId = articleChunkIds.get(item.articleKey);
    if (!articleChunkId) {
      summary.missingArticleCount += 1;
      continue;
    }

    const pair = `${conceptNodeId}|${articleChunkId}`;
    const anchors = anchorsByPair.get(pair) ?? [];

    if (anchors.length === 0) {
      summary.missingAnchorCount += 1;
      continue;
    }

    if (options.dryRun) {
      continue;
    }

    const decisionMetadata = buildDecisionMetaPatch(item);
    const confidenceSetting = REFERENCE_DECISION_MAP[item.decision].confidence;

    for (const anchor of anchors) {
      if (!anchor.id) {
        continue;
      }

      const existingMetadata = parseMetadata(anchor.metadata);
      const nextMetadata = {
        ...existingMetadata,
        ...decisionMetadata,
      };

      const nextConfidence = confidenceSetting ?? toConfidence(anchor.confidence);
      const update = {
        confidence: nextConfidence,
        metadata: nextMetadata,
        updated_at: safeNow,
      };

      const { error } = await options.supabase.from("legal_concept_anchors").update(update).eq("id", anchor.id);

      if (error) {
        throw error;
      }
    }
  }

  if (options.dryRun) {
    console.info("[legal-anchor-verification-apply] dry-run summary only");
  } else {
    console.info("[legal-anchor-verification-apply] applied verification decisions");
  }

  console.info(
    `[legal-anchor-verification-apply] total=${summary.totalDecisions}, verified=${summary.verifiedCount}, needs_update=${summary.needsUpdateCount}, rejected=${summary.rejectedCount}, keep_draft=${summary.keepDraftCount}, missingConcept=${summary.missingConceptCount}, missingArticle=${summary.missingArticleCount}, missingAnchor=${summary.missingAnchorCount}, dryRun=${summary.dryRun}`,
  );

  return summary;
}

export async function runLegalAnchorVerificationApply(dryRunOverride?: boolean): Promise<LegalAnchorVerificationSummary> {
  const decisions = await loadDecisions();
  const dryRun = dryRunOverride ?? process.env.LEGAL_ANCHOR_VERIFICATION_DRY_RUN === "1";
  const supabase = createAdminClient();

  return applyLegalAnchorVerificationDecisions(decisions, {
    supabase,
    dryRun,
  });
}

async function main(): Promise<void> {
  const summary = await runLegalAnchorVerificationApply();
  console.info(
    `[legal-anchor-verification-apply] totalDecisions=${summary.totalDecisions}, missingConcept=${summary.missingConceptCount}, missingArticle=${summary.missingArticleCount}, missingAnchor=${summary.missingAnchorCount}, dryRun=${summary.dryRun}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = formatUnknownLegalIngestError(error);
    console.error(`[legal-anchor-verification-apply] failed: ${JSON.stringify(message)}`);
    process.exitCode = 1;
  });
}
