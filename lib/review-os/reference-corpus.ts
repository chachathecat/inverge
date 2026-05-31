import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type ReferenceExamMode = "first" | "second";
export type ReferenceTaskType =
  | "first_ox"
  | "concept_review"
  | "cloze_review"
  | "second_answer_rewrite"
  | "accounting_template_retry";

export type ReferenceSourceType = "law" | "appraisal_rules" | "civil_law" | "first_exam_topics" | "second_exam_topics" | "internal_curated";

export type ReferenceCorpusEntry = {
  referenceId: string;
  title: string;
  examMode: ReferenceExamMode | "shared";
  subject: string;
  sourceType: ReferenceSourceType;
  snippet: string;
  citationLabel?: string;
  tags?: string[];
  topics?: string[];
  concepts?: string[];
  licenseStatus?: "public_domain" | "licensed" | "internal_curated" | "needs_review";
  usageStatus?: "active" | "pilot" | "retired";
  updatedAt?: string;
};

export type ReferenceCorpusConfig = {
  corpusSourcePath?: string;
};

const DEFAULT_CORPUS_PATH = "reference_corpus";
const MAX_SNIPPET_LENGTH = 420;

function getCorpusSourcePath(config: ReferenceCorpusConfig = {}) {
  return config.corpusSourcePath ?? process.env.INVERGE_REFERENCE_CORPUS_PATH ?? DEFAULT_CORPUS_PATH;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function trimSnippet(snippet: string) {
  const normalized = normalizeText(snippet);
  return normalized.length > MAX_SNIPPET_LENGTH ? `${normalized.slice(0, MAX_SNIPPET_LENGTH - 1)}…` : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inferSourceType(filePath: string): ReferenceSourceType {
  const normalized = filePath.split(path.sep).join("/");
  if (normalized.includes("/law/") || normalized.startsWith("law/")) return "law";
  if (normalized.includes("/appraisal_rules/") || normalized.startsWith("appraisal_rules/")) return "appraisal_rules";
  if (normalized.includes("/civil_law/") || normalized.startsWith("civil_law/")) return "civil_law";
  if (normalized.includes("/first_exam_topics/") || normalized.startsWith("first_exam_topics/")) return "first_exam_topics";
  if (normalized.includes("/second_exam_topics/") || normalized.startsWith("second_exam_topics/")) return "second_exam_topics";
  return "internal_curated";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeEntry(raw: Record<string, unknown>, fallbackId: string, sourceType: ReferenceSourceType): ReferenceCorpusEntry | null {
  const referenceId = normalizeText(raw.referenceId) || fallbackId;
  const title = normalizeText(raw.title);
  const subject = normalizeText(raw.subject);
  const snippet = trimSnippet(normalizeText(raw.snippet));
  const rawExamMode = normalizeText(raw.examMode);
  const examMode = rawExamMode === "first" || rawExamMode === "second" || rawExamMode === "shared" ? rawExamMode : "shared";
  if (!referenceId || !title || !subject || !snippet) return null;

  return {
    referenceId,
    title,
    examMode,
    subject,
    sourceType: (normalizeText(raw.sourceType) as ReferenceSourceType) || sourceType,
    snippet,
    citationLabel: normalizeText(raw.citationLabel) || undefined,
    tags: toStringArray(raw.tags),
    topics: toStringArray(raw.topics),
    concepts: toStringArray(raw.concepts),
    licenseStatus: normalizeText(raw.licenseStatus) as ReferenceCorpusEntry["licenseStatus"] || "needs_review",
    usageStatus: normalizeText(raw.usageStatus) as ReferenceCorpusEntry["usageStatus"] || "pilot",
    updatedAt: normalizeText(raw.updatedAt) || undefined,
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

export async function loadReferenceCorpus(config: ReferenceCorpusConfig = {}): Promise<ReferenceCorpusEntry[]> {
  const corpusPath = path.resolve(process.cwd(), getCorpusSourcePath(config));
  let files: string[] = [];
  try {
    files = await collectJsonFiles(corpusPath);
  } catch {
    return [];
  }

  const entries = await Promise.all(files.map(async (filePath) => {
    try {
      const body = await readFile(filePath, "utf8");
      const parsed = JSON.parse(body) as unknown;
      const sourceType = inferSourceType(path.relative(corpusPath, filePath));
      const records = Array.isArray(parsed) ? parsed : [parsed];
      return records.flatMap((record, index) => {
        if (!isRecord(record)) return [];
        const fallbackId = path.relative(corpusPath, filePath).replace(/\.json$/u, "").split(path.sep).join(":") + `:${index}`;
        const entry = normalizeEntry(record, fallbackId, sourceType);
        return entry ? [entry] : [];
      });
    } catch {
      return [];
    }
  }));

  return entries.flat().sort((left, right) => left.referenceId.localeCompare(right.referenceId));
}
