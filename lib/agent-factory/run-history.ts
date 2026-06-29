import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_RUN_HISTORY_VERSION = 1;
export const DEFAULT_AGENT_FACTORY_RUN_HISTORY_PATH = ".agent-factory/run-history.jsonl";
export const DEFAULT_AGENT_FACTORY_RUN_HISTORY_MARKDOWN_PATH = ".agent-factory/run-history.md";

export type AgentFactoryRunHistoryStatus = "success" | "failed" | "rejected";

export type AgentFactoryApprovalGateOutcome =
  | "not_required"
  | "dry_run_not_required"
  | "approved"
  | "approved_but_blocked"
  | "missing_or_invalid"
  | "unknown";

export interface AgentFactoryPayloadDigest {
  label: string;
  sha256: string;
  charCount: number;
  lineCount: number;
  fieldCount: number;
}

export interface AgentFactoryRunGuardrailSummary {
  metadataOnly: true;
  artifactBacked: true;
  storesPayloadDigestsOnly: true;
  codexExecuted: boolean;
  codeMutationAttempted: boolean;
  branchMutationAttempted: boolean;
  prMetadataMutationAttempted: boolean;
  workflowRerunAttempted: boolean;
  learnerRuntimeTouched: boolean;
  ocrTouched: boolean;
  providerTouched: boolean;
  billingTouched: boolean;
  authTouched: boolean;
  paymentTouched: boolean;
  productionApiTouched: boolean;
}

export interface AgentFactoryRunHistoryRecord {
  version: 1;
  runId: string;
  timestamp: string;
  source: string;
  actor: {
    name: string;
    repository: string | null;
    workflowName: string | null;
    workflowRunId: string | null;
  };
  mode: string | null;
  mutationIntent: string | null;
  target: {
    prNumber: number | null;
    taskId: string | null;
  };
  status: AgentFactoryRunHistoryStatus;
  dryRun: boolean;
  approvalGateOutcome: AgentFactoryApprovalGateOutcome;
  artifactPaths: string[];
  payloadDigests: AgentFactoryPayloadDigest[];
  blockedReasonCodes: string[];
  blockedReasonCount: number;
  guardrailSummary: AgentFactoryRunGuardrailSummary;
}

export interface CreateAgentFactoryRunHistoryRecordInput {
  runId?: string;
  timestamp?: Date | string;
  source: string;
  actorName?: string | null;
  repository?: string | null;
  workflowName?: string | null;
  workflowRunId?: string | number | null;
  mode?: string | null;
  mutationIntent?: string | null;
  targetPrNumber?: number | string | null;
  targetTaskId?: string | null;
  status: AgentFactoryRunHistoryStatus;
  dryRun?: boolean | string | null;
  approvalGateOutcome?: AgentFactoryApprovalGateOutcome | null;
  artifactPaths?: readonly string[];
  payloadDigests?: readonly AgentFactoryPayloadDigest[];
  blockedReasons?: readonly unknown[];
  blockedReasonCodes?: readonly string[];
  guardrailSummary?: Partial<AgentFactoryRunGuardrailSummary>;
}

export interface AppendAgentFactoryRunHistoryOptions {
  historyPath?: string;
  markdownPath?: string;
  recentLimit?: number;
  generatedAt?: Date;
}

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}\b/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
] as const;

const SENSITIVE_LINE_PATTERNS = [
  /^\s*["']?(?:secret|token|password|api[_-]?key|private[_-]?key|service[_-]?role|cookie|session|credential)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?learner[_\-\s]?(?:content|answer|text)?|learner[_\-\s]?answer|raw[_\-\s]?answer)["']?\s*[:=]/i,
  /^\s*["']?(?:ocr[_\-\s]?(?:text|payload|output)|provider[_\-\s]?payload)["']?\s*[:=]/i,
  /^\s*["']?(?:billing[_\-\s]?(?:data|record|payload)|auth[_\-\s]?(?:data|record|payload|token|secret)|payment[_\-\s]?(?:data|record|payload))["']?\s*[:=]/i,
  /^\s*["']?(?:private[_\-\s]?user[_\-\s]?content|raw[_\-\s]?pr[_\-\s]?body|pr[_\-\s]?body[_\-\s]?payload|pull[_\-\s]?request[_\-\s]?body|bodyText)["']?\s*[:=]/i,
] as const;

const FORBIDDEN_RECORD_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /password/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /service[_-]?role/i,
  /cookie/i,
  /session/i,
  /credential/i,
  /raw.*answer/i,
  /raw.*learner/i,
  /learner.*answer/i,
  /ocr.*(?:text|payload|output)/i,
  /provider.*payload/i,
  /billing.*(?:data|record|payload)/i,
  /auth.*(?:data|record|payload|secret|token)/i,
  /payment.*(?:data|record|payload)/i,
  /private.*user.*content/i,
  /raw.*pr.*body/i,
  /pr.*body.*payload/i,
  /pull.*request.*body/i,
  /^bodyText$/i,
  /comment.*body/i,
] as const;

const REASON_CODE_RULES: Array<{ code: string; pattern: RegExp }> = [
  { code: "missing_approval_phrase", pattern: /approval phrase|approve/i },
  { code: "invalid_pr_number", pattern: /pr_number|pr number|positive integer/i },
  { code: "invalid_intent", pattern: /invalid.*intent|mutation_intent/i },
  { code: "data_boundary_violation", pattern: /metadata-only|data-boundary|raw|learner|ocr|provider|billing|auth|payment|private user/i },
  { code: "secret_like_value", pattern: /secret|token|api[_ -]?key|credential|private key/i },
  { code: "missing_prompt", pattern: /prompt/i },
  { code: "unsupported_shape", pattern: /json object|unsupported|shape|outside.*collection|not found/i },
  { code: "v1_dry_run_only", pattern: /dry-run only|dry_run only|v1/i },
  { code: "missing_context", pattern: /metadata is required|missing.*metadata|not available|required.*context/i },
  { code: "invalid_pr_contract", pattern: /pr contract|runtime evidence|merge recommendation|section/i },
  { code: "duplicate_marker_comment", pattern: /multiple existing.*marker|duplicate.*marker/i },
  { code: "github_metadata_unavailable", pattern: /github|rate limit|permission|fetch|request failed/i },
  { code: "execution_error", pattern: /error|failed|exception/i },
] as const;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stableJson(value: unknown): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (entry && typeof entry === "object") {
      if (seen.has(entry)) return "[Circular]";
      seen.add(entry);
    }
    return entry;
  }) ?? "";
}

function countFields(value: unknown): number {
  const seen = new WeakSet<object>();
  let count = 0;

  function visit(current: unknown): void {
    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry) => visit(entry));
      return;
    }

    for (const entry of Object.values(current)) {
      count += 1;
      visit(entry);
    }
  }

  visit(value);
  return count;
}

function cleanShortText(value: unknown, fallback: string): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return fallback;
  }

  const text = String(value)
    .replace(/[\u0000-\u001f]/g, "")
    .trim();

  if (!text) return fallback;
  return text.length > 180 ? text.slice(0, 180) : text;
}

function cleanNullableText(value: unknown): string | null {
  const text = cleanShortText(value, "");
  return text ? text : null;
}

function normalizeBoolean(value: boolean | string | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no"].includes(normalized)) return false;
    if (["true", "1", "yes"].includes(normalized)) return true;
  }
  return false;
}

function normalizePrNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function normalizeArtifactPath(filePath: string): string {
  const trimmed = cleanShortText(filePath, "");
  if (!trimmed) return "";
  return trimmed.replaceAll("\\", "/");
}

function normalizeTimestamp(value: Date | string | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function normalizeReasonCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function codeFromReason(reason: unknown): string {
  const text = typeof reason === "string" ? reason : stableJson(reason);

  for (const rule of REASON_CODE_RULES) {
    if (rule.pattern.test(text)) return rule.code;
  }

  return "blocked";
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function defaultGuardrailSummary(
  overrides: Partial<AgentFactoryRunGuardrailSummary> = {},
): AgentFactoryRunGuardrailSummary {
  const summary: AgentFactoryRunGuardrailSummary = {
    metadataOnly: true,
    artifactBacked: true,
    storesPayloadDigestsOnly: true,
    codexExecuted: false,
    codeMutationAttempted: false,
    branchMutationAttempted: false,
    prMetadataMutationAttempted: false,
    workflowRerunAttempted: false,
    learnerRuntimeTouched: false,
    ocrTouched: false,
    providerTouched: false,
    billingTouched: false,
    authTouched: false,
    paymentTouched: false,
    productionApiTouched: false,
    ...overrides,
  };

  summary.metadataOnly = true;
  summary.artifactBacked = true;
  summary.storesPayloadDigestsOnly = true;
  return summary;
}

export function createAgentFactoryPayloadDigest(
  label: string,
  value: unknown,
): AgentFactoryPayloadDigest {
  const text = typeof value === "string"
    ? normalizeNewlines(value)
    : normalizeNewlines(stableJson(value));

  return {
    label: cleanShortText(label, "payload_digest"),
    sha256: sha256(text),
    charCount: text.length,
    lineCount: text.length === 0 ? 0 : text.split("\n").length,
    fieldCount: countFields(value),
  };
}

export function blockedReasonCodesFromReasons(
  reasons: readonly unknown[] = [],
  explicitCodes: readonly string[] = [],
): string[] {
  const explicit = explicitCodes
    .map((code) => normalizeReasonCode(code))
    .filter(Boolean);
  const inferred = reasons.length > 0 ? reasons.map(codeFromReason) : [];

  return unique([...explicit, ...inferred]);
}

export function createAgentFactoryRunHistoryRecord(
  input: CreateAgentFactoryRunHistoryRecordInput,
): AgentFactoryRunHistoryRecord {
  const timestamp = normalizeTimestamp(input.timestamp);
  const blockedReasonCodes = blockedReasonCodesFromReasons(
    input.blockedReasons,
    input.blockedReasonCodes,
  );
  const artifactPaths = unique(
    [...(input.artifactPaths ?? [])]
      .map((entry) => normalizeArtifactPath(entry))
      .filter(Boolean),
  );
  const runIdSeed = [
    timestamp,
    input.source,
    input.mode ?? "",
    input.mutationIntent ?? "",
    input.targetPrNumber ?? "",
    input.targetTaskId ?? "",
    input.status,
    blockedReasonCodes.join(","),
    randomUUID(),
  ].join("|");
  const record: AgentFactoryRunHistoryRecord = {
    version: AGENT_FACTORY_RUN_HISTORY_VERSION,
    runId: input.runId ?? `af011-${timestamp.replace(/\D/g, "").slice(0, 14)}-${sha256(runIdSeed).slice(0, 12)}`,
    timestamp,
    source: cleanShortText(input.source, "agent-factory"),
    actor: {
      name: cleanShortText(input.actorName ?? "local", "local"),
      repository: cleanNullableText(input.repository),
      workflowName: cleanNullableText(input.workflowName),
      workflowRunId: cleanNullableText(input.workflowRunId),
    },
    mode: cleanNullableText(input.mode),
    mutationIntent: cleanNullableText(input.mutationIntent),
    target: {
      prNumber: normalizePrNumber(input.targetPrNumber),
      taskId: cleanNullableText(input.targetTaskId),
    },
    status: input.status,
    dryRun: normalizeBoolean(input.dryRun),
    approvalGateOutcome: input.approvalGateOutcome ?? "unknown",
    artifactPaths,
    payloadDigests: [...(input.payloadDigests ?? [])],
    blockedReasonCodes,
    blockedReasonCount: blockedReasonCodes.length,
    guardrailSummary: defaultGuardrailSummary(input.guardrailSummary),
  };

  assertAgentFactoryRunHistoryRecordSafe(record);
  return record;
}

export function appendAgentFactoryRunHistoryRecord(
  record: AgentFactoryRunHistoryRecord,
  options: AppendAgentFactoryRunHistoryOptions = {},
): string {
  assertAgentFactoryRunHistoryRecordSafe(record);
  const historyPath = path.resolve(process.cwd(), options.historyPath ?? DEFAULT_AGENT_FACTORY_RUN_HISTORY_PATH);
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.appendFileSync(historyPath, `${JSON.stringify(record)}\n`, "utf8");
  return historyPath;
}

export function readRecentAgentFactoryRunHistory(options: {
  historyPath?: string;
  limit?: number;
} = {}): AgentFactoryRunHistoryRecord[] {
  const historyPath = path.resolve(process.cwd(), options.historyPath ?? DEFAULT_AGENT_FACTORY_RUN_HISTORY_PATH);
  const limit = Math.max(1, options.limit ?? 10);

  if (!fs.existsSync(historyPath)) return [];

  const records = fs.readFileSync(historyPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AgentFactoryRunHistoryRecord);

  for (const record of records) {
    assertAgentFactoryRunHistoryRecordSafe(record);
  }

  return records.slice(-limit);
}

export function buildAgentFactoryRunHistoryMarkdown(
  records: readonly AgentFactoryRunHistoryRecord[],
  options: { generatedAt?: Date } = {},
): string {
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const rows = records.length > 0
    ? records.map((record) => {
        const modeOrIntent = record.mutationIntent ?? record.mode ?? "n/a";
        const target = record.target.prNumber
          ? `PR #${record.target.prNumber}`
          : record.target.taskId ?? "n/a";
        const artifacts = record.artifactPaths.length;
        const reasonCodes = record.blockedReasonCodes.length > 0
          ? record.blockedReasonCodes.join(", ")
          : "none";
        const digests = record.payloadDigests.length > 0
          ? record.payloadDigests
              .map((digest) => `${digest.label}:${digest.sha256.slice(0, 12)} (${digest.charCount} chars)`)
              .join("; ")
          : "none";

        return [
          `### ${record.runId}`,
          "",
          `- Timestamp: ${record.timestamp}`,
          `- Source: ${record.source}`,
          `- Actor: ${record.actor.name}`,
          `- Mode or intent: ${modeOrIntent}`,
          `- Target: ${target}`,
          `- Status: ${record.status}`,
          `- Dry-run: ${record.dryRun ? "true" : "false"}`,
          `- Approval gate: ${record.approvalGateOutcome}`,
          `- Artifact count: ${artifacts}`,
          `- Blocked reason codes: ${reasonCodes}`,
          `- Payload digests: ${digests}`,
        ].join("\n");
      })
    : [
        "No Agent Factory run-history records are available yet.",
      ];

  const markdown = [
    "# Agent Factory Run History",
    "",
    `Generated at: ${generatedAt}`,
    `Record count: ${records.length}`,
    "",
    "## Scope",
    "",
    "This is a local metadata-only summary generated from `.agent-factory/run-history.jsonl`.",
    "It stores run metadata, artifact paths, reason codes, and hashes/counts only.",
    "",
    "## Recent Runs",
    "",
    ...rows,
    "",
    "## Data Boundary",
    "",
    "- No PR bodies, task-package text, comment bodies, learner answers, OCR text, provider payloads, credentials, billing/auth/payment records, or private user content are stored here.",
    "- Payload references are represented only by SHA-256 hashes and counts.",
  ].join("\n");

  assertAgentFactoryRunHistoryTextSafe(markdown, "Agent Factory run-history Markdown");
  return markdown;
}

export function writeAgentFactoryRunHistoryMarkdown(
  records: readonly AgentFactoryRunHistoryRecord[],
  options: AppendAgentFactoryRunHistoryOptions = {},
): string {
  const markdownPath = path.resolve(
    process.cwd(),
    options.markdownPath ?? DEFAULT_AGENT_FACTORY_RUN_HISTORY_MARKDOWN_PATH,
  );
  const markdown = buildAgentFactoryRunHistoryMarkdown(records, {
    generatedAt: options.generatedAt,
  });

  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, `${markdown.replace(/\s*$/, "")}\n`, "utf8");
  return markdownPath;
}

export function appendAgentFactoryRunHistory(
  input: CreateAgentFactoryRunHistoryRecordInput,
  options: AppendAgentFactoryRunHistoryOptions = {},
): {
  record: AgentFactoryRunHistoryRecord;
  historyPath: string;
  markdownPath: string;
} {
  const record = createAgentFactoryRunHistoryRecord(input);
  const historyPath = appendAgentFactoryRunHistoryRecord(record, options);
  const records = readRecentAgentFactoryRunHistory({
    historyPath,
    limit: options.recentLimit ?? 10,
  });
  const markdownPath = writeAgentFactoryRunHistoryMarkdown(records, {
    ...options,
    markdownPath: options.markdownPath,
  });

  return { record, historyPath, markdownPath };
}

export function assertAgentFactoryRunHistoryTextSafe(text: string, label: string): void {
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`${label} contains a secret-like value.`);
    }
  }

  const unsafeLine = normalizeNewlines(text)
    .split("\n")
    .find((line) => SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)));
  if (unsafeLine) {
    throw new Error(`${label} contains a raw-content or credential-like labeled field.`);
  }
}

export function assertAgentFactoryRunHistoryRecordSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`Agent Factory run-history record contains a secret-like value at ${currentPath}.`);
        }
      }
      return;
    }

    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${currentPath}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      const forbidden = FORBIDDEN_RECORD_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`Agent Factory run-history record contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
