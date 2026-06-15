import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { formatUnknownLegalIngestError } from "../../lib/legal/legal-error-serialization";

const DEFAULT_REPORT_LIMIT = 50;
const MAX_REPORT_LIMIT = 50;
const DEFAULT_REPORT_DIR = path.join(process.cwd(), ".data", "legal-anchor-verification");
const REPORT_FILE_NAMES = {
  csv: "legal-anchor-verification-report.csv",
  markdown: "legal-anchor-verification-report.md",
  summary: "legal-anchor-verification-summary.json",
} as const;
const HEADING_LIKE_PATTERN = /^(\uC81C\s*\d+\s*(\uD3B8|\uC7A5|\uC808|\uAD00)\b|chapter|part|section)\s*/i;
const BROAD_CONCEPT_SINGLE_ANCHOR_KEYS = new Set([
  "civil_invalid_cancel",
  "civil_agency",
  "compensation_project_approval",
  "compensation_loss_compensation_principle",
]);
const RISK_FLAGS = [
  "draft_needs_review",
  "missing_article_title",
  "heading_like_chunk",
  "short_body_text",
  "broad_concept_single_anchor",
  "low_confidence",
  "keyword_candidate_only",
] as const;
const CSV_COLUMNS = [
  "conceptKey",
  "conceptLabel",
  "examSubject",
  "unit",
  "lawTitle",
  "articleNo",
  "articleKey",
  "articleTitle",
  "anchorType",
  "anchorRole",
  "confidence",
  "sourceStatus",
  "needsOfficialVerification",
  "preview",
  "riskFlags",
  "verificationDecision",
  "reviewerNotes",
] as const;

type LegalAnchorVerificationRiskFlag = (typeof RISK_FLAGS)[number];

type LegalConceptAnchorRpcRow = {
  concept_key?: unknown;
  concept_label?: unknown;
  exam_subject?: unknown;
  unit?: unknown;
  concept_metadata?: unknown;
  anchor_type?: unknown;
  anchor_confidence?: unknown;
  anchor_metadata?: unknown;
  law_title?: unknown;
  article_no?: unknown;
  article_key?: unknown;
  article_title?: unknown;
  body_text?: unknown;
  chunk_metadata?: unknown;
  source_status?: unknown;
  needs_official_verification?: unknown;
};

export type LegalAnchorVerificationReportRow = {
  conceptKey: string;
  conceptLabel: string;
  examSubject: string;
  unit: string;
  lawTitle: string;
  articleNo: string;
  articleKey: string;
  articleTitle: string;
  anchorType: string;
  anchorRole: string;
  confidence: number;
  sourceStatus: string;
  needsOfficialVerification: boolean;
  preview: string;
  riskFlags: LegalAnchorVerificationRiskFlag[];
  verificationDecision: "";
  reviewerNotes: "";
};

export type LegalAnchorVerificationSummary = {
  totalAnchors: number;
  byExamSubject: Record<string, number>;
  bySourceStatus: Record<string, number>;
  needsOfficialVerificationCount: number;
  riskFlagCounts: Record<LegalAnchorVerificationRiskFlag, number>;
  generatedAt: string;
};

export type LegalAnchorVerificationReportResult = {
  outputDir: string;
  files: {
    csv: string;
    markdown: string;
    summary: string;
  };
  summary: LegalAnchorVerificationSummary;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLimit(value?: string | number | null) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_REPORT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_REPORT_LIMIT);
}

function readAnchorRole(metadata: unknown) {
  if (!isRecord(metadata)) {
    return "";
  }

  return readString(metadata.anchorRole) || readString(metadata.anchor_role) || readString(metadata.role);
}

function buildPreview(bodyText: string) {
  const normalized = normalizeWhitespace(bodyText);

  return normalized.length > 220 ? `${normalized.slice(0, 220)}...` : normalized;
}

function createOperatorSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Required Supabase operator environment is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function readConceptSourceAnchors(
  supabase: SupabaseClient,
  matchCount: number,
): Promise<LegalConceptAnchorRpcRow[]> {
  const { data, error } = await supabase.rpc("get_legal_concept_source_anchors", {
    concept_key_filter: null,
    exam_subject_filter: null,
    match_count: matchCount,
  });

  if (error) {
    throw new Error("Legal concept source anchor report read failed.");
  }

  return Array.isArray(data) ? data.filter(isRecord) : [];
}

function toBaseReportRows(rows: LegalConceptAnchorRpcRow[]): LegalAnchorVerificationReportRow[] {
  return rows
    .map((row) => {
      const conceptKey = readString(row.concept_key);
      const conceptLabel = readString(row.concept_label);
      const examSubject = readString(row.exam_subject);
      const lawTitle = readString(row.law_title);
      const articleNo = readString(row.article_no);
      const articleKey = readString(row.article_key);
      const bodyText = readString(row.body_text);

      if (!conceptKey || !conceptLabel || !examSubject || !lawTitle || !articleNo || !articleKey || !bodyText) {
        return null;
      }

      const sourceStatus = readString(row.source_status) || "draft";

      const reportRow: LegalAnchorVerificationReportRow = {
        conceptKey,
        conceptLabel,
        examSubject,
        unit: readString(row.unit),
        lawTitle,
        articleNo,
        articleKey,
        articleTitle: readString(row.article_title),
        anchorType: readString(row.anchor_type),
        anchorRole: readAnchorRole(row.anchor_metadata),
        confidence: readNumber(row.anchor_confidence),
        sourceStatus,
        needsOfficialVerification: readBoolean(row.needs_official_verification),
        preview: buildPreview(bodyText),
        riskFlags: [],
        verificationDecision: "",
        reviewerNotes: "",
      };

      return reportRow;
    })
    .filter((row): row is LegalAnchorVerificationReportRow => row !== null);
}

function countByConcept(rows: LegalAnchorVerificationReportRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.conceptKey, (counts.get(row.conceptKey) ?? 0) + 1);
  }

  return counts;
}

export function buildLegalAnchorRiskFlags(
  row: LegalAnchorVerificationReportRow,
  conceptAnchorCount: number,
): LegalAnchorVerificationRiskFlag[] {
  const riskFlags: LegalAnchorVerificationRiskFlag[] = [];

  if (row.sourceStatus === "draft" || row.needsOfficialVerification) {
    riskFlags.push("draft_needs_review");
  }

  if (!row.articleTitle) {
    riskFlags.push("missing_article_title");
  }

  if (HEADING_LIKE_PATTERN.test(row.preview)) {
    riskFlags.push("heading_like_chunk");
  }

  if (row.preview.length < 80) {
    riskFlags.push("short_body_text");
  }

  if (BROAD_CONCEPT_SINGLE_ANCHOR_KEYS.has(row.conceptKey) && conceptAnchorCount === 1) {
    riskFlags.push("broad_concept_single_anchor");
  }

  if (row.confidence < 0.75) {
    riskFlags.push("low_confidence");
  }

  if (row.sourceStatus === "keyword_candidate_only") {
    riskFlags.push("keyword_candidate_only");
  }

  return riskFlags;
}

export function buildLegalAnchorVerificationRows(
  rows: LegalConceptAnchorRpcRow[],
): LegalAnchorVerificationReportRow[] {
  const reportRows = toBaseReportRows(rows);
  const conceptCounts = countByConcept(reportRows);

  return reportRows.map((row) => ({
    ...row,
    riskFlags: buildLegalAnchorRiskFlags(row, conceptCounts.get(row.conceptKey) ?? 0),
  }));
}

function countValues<T extends string>(values: T[]) {
  return values.reduce<Record<T, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

export function buildLegalAnchorVerificationSummary(
  rows: LegalAnchorVerificationReportRow[],
  generatedAt: string,
): LegalAnchorVerificationSummary {
  const riskFlagCounts = Object.fromEntries(RISK_FLAGS.map((flag) => [flag, 0])) as Record<
    LegalAnchorVerificationRiskFlag,
    number
  >;

  for (const flag of rows.flatMap((row) => row.riskFlags)) {
    riskFlagCounts[flag] += 1;
  }

  return {
    totalAnchors: rows.length,
    byExamSubject: countValues(rows.map((row) => row.examSubject)),
    bySourceStatus: countValues(rows.map((row) => row.sourceStatus)),
    needsOfficialVerificationCount: rows.filter((row) => row.needsOfficialVerification).length,
    riskFlagCounts,
    generatedAt,
  };
}

function csvEscape(value: string | number | boolean) {
  const text = String(value);

  if (!/[",\r\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function renderLegalAnchorVerificationCsv(rows: LegalAnchorVerificationReportRow[]) {
  const header = CSV_COLUMNS.join(",");
  const body = rows.map((row) =>
    CSV_COLUMNS.map((column) => {
      if (column === "riskFlags") {
        return csvEscape(row.riskFlags.join("|"));
      }

      return csvEscape(row[column]);
    }).join(","),
  );

  return [header, ...body].join("\n");
}

function groupRowsByExamSubject(rows: LegalAnchorVerificationReportRow[]) {
  const groups = new Map<string, LegalAnchorVerificationReportRow[]>();

  for (const row of rows) {
    const group = groups.get(row.examSubject) ?? [];
    group.push(row);
    groups.set(row.examSubject, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function groupRowsByConcept(rows: LegalAnchorVerificationReportRow[]) {
  const groups = new Map<string, LegalAnchorVerificationReportRow[]>();

  for (const row of rows) {
    const group = groups.get(row.conceptKey) ?? [];
    group.push(row);
    groups.set(row.conceptKey, group);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

export function renderLegalAnchorVerificationMarkdown(
  rows: LegalAnchorVerificationReportRow[],
  summary: LegalAnchorVerificationSummary,
) {
  const lines = [
    "# Legal Anchor Verification Report",
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    "Operator-only review report for draft legal concept anchors. This report does not verify anchors and does not generate learner-facing legal explanations.",
    "",
    "## Summary",
    "",
    `- Total anchors: ${summary.totalAnchors}`,
    `- Needs official verification: ${summary.needsOfficialVerificationCount}`,
    "",
  ];

  for (const [examSubject, subjectRows] of groupRowsByExamSubject(rows)) {
    lines.push(`## ${examSubject}`, "");

    for (const [conceptKey, conceptRows] of groupRowsByConcept(subjectRows)) {
      const firstRow = conceptRows[0];

      if (!firstRow) {
        continue;
      }

      lines.push(
        `### ${conceptKey}`,
        "",
        `- Concept label: ${firstRow.conceptLabel}`,
        `- Unit: ${firstRow.unit || "(blank)"}`,
        "",
      );

      for (const row of conceptRows.sort((left, right) => left.articleKey.localeCompare(right.articleKey))) {
        lines.push(
          `#### ${row.lawTitle} ${row.articleNo}`,
          "",
          `- Article key: ${row.articleKey}`,
          `- Article title: ${row.articleTitle || "(blank)"}`,
          `- Anchor: ${row.anchorType || "(blank)"} / ${row.anchorRole || "(blank)"} / ${row.confidence}`,
          `- Source status: ${row.sourceStatus}`,
          `- Needs official verification: ${row.needsOfficialVerification}`,
          `- Risk flags: ${row.riskFlags.length > 0 ? row.riskFlags.join(", ") : "none"}`,
          "",
          "Article preview:",
          "",
          `> ${row.preview}`,
          "",
          "Reviewer checklist:",
          "",
          "- [ ] correct anchor",
          "- [ ] needs supporting article",
          "- [ ] wrong article",
          "- [ ] too broad concept",
          "- [ ] ready to verify",
          "",
          "Verification decision:",
          "",
          "Reviewer notes:",
          "",
        );
      }

      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}

function resolveReportDir(reportDir?: string | null) {
  const configured = reportDir ?? process.env.LEGAL_ANCHOR_REPORT_DIR;

  if (!configured) {
    return DEFAULT_REPORT_DIR;
  }

  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

export async function exportLegalAnchorVerificationReport(options: {
  supabase?: SupabaseClient;
  reportDir?: string | null;
  limit?: number | null;
  now?: Date;
} = {}): Promise<LegalAnchorVerificationReportResult> {
  const supabase = options.supabase ?? createOperatorSupabaseClient();
  const outputDir = resolveReportDir(options.reportDir);
  const reportLimit = normalizeLimit(options.limit ?? process.env.LEGAL_ANCHOR_REPORT_LIMIT);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const rpcRows = await readConceptSourceAnchors(supabase, reportLimit);
  const rows = buildLegalAnchorVerificationRows(rpcRows);
  const summary = buildLegalAnchorVerificationSummary(rows, generatedAt);
  const files = {
    csv: path.join(outputDir, REPORT_FILE_NAMES.csv),
    markdown: path.join(outputDir, REPORT_FILE_NAMES.markdown),
    summary: path.join(outputDir, REPORT_FILE_NAMES.summary),
  };

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(files.csv, `${renderLegalAnchorVerificationCsv(rows)}\n`, "utf8"),
    writeFile(files.markdown, renderLegalAnchorVerificationMarkdown(rows, summary), "utf8"),
    writeFile(files.summary, `${JSON.stringify(summary, null, 2)}\n`, "utf8"),
  ]);

  console.info(`[legal-anchor-report] wrote ${rows.length} anchor rows to ${outputDir}`);

  return {
    outputDir,
    files,
    summary,
  };
}

async function main(): Promise<void> {
  await exportLegalAnchorVerificationReport();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = formatUnknownLegalIngestError(error);
    console.error(`[legal-anchor-report] failed: ${message}`);
    process.exitCode = 1;
  });
}
