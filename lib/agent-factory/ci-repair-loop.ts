import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_CI_REPAIR_VERSION = 1;

export type AgentFactoryCiRepairStatus = "planned" | "blocked";

export type AgentFactoryCiRepairApprovalGate =
  | "not_requested"
  | "missing"
  | "approved"
  | "failed_closed";

export type AgentFactoryCiFailureClass =
  | "pr_contract"
  | "typecheck"
  | "lint"
  | "focused_tests"
  | "full_tests"
  | "build"
  | "learner_loop"
  | "risk_gate"
  | "runtime_gate"
  | "closed_beta_readiness"
  | "workflow_infra"
  | "unknown";

export interface AgentFactoryCiRepairPlan {
  version: 1;
  planId: string;
  createdAt: string;
  status: AgentFactoryCiRepairStatus;
  reportOnly: true;
  dryRun: true;
  source: {
    script: "agent-factory-ci-repair";
    repository: string | null;
    actor: string | null;
    workflowName: string | null;
    workflowRunId: string | null;
  };
  target: {
    prNumber: number | null;
    headSha: string | null;
    branchName: string | null;
    baseBranch: string;
    taskId: string | null;
  };
  inputArtifacts: Array<{
    label: string;
    path: string;
    status: "available" | "missing" | "invalid";
    sha256: string | null;
    metadata: Record<string, string | number | boolean | null>;
  }>;
  ciState: {
    latestConclusion: "success" | "failure" | "cancelled" | "skipped" | "unknown";
    failingWorkflowCount: number;
    failingJobCount: number;
    failingStepCount: number;
    observedWorkflowNames: string[];
    observedFailureClasses: string[];
  };
  failureClassifications: Array<{
    workflowName: string | null;
    jobName: string | null;
    stepName: string | null;
    failureClass: AgentFactoryCiFailureClass;
    confidence: "low" | "medium" | "high";
    reasonCode: string;
    evidence: Record<string, string | number | boolean | null>;
  }>;
  repairBoundary: {
    metadataOnlyPlan: true;
    requiresHumanApproval: true;
    approvalGate: AgentFactoryCiRepairApprovalGate;
    willMutateWithoutApproval: false;
    maxSuggestedFiles: number;
    maxSuggestedPatchBytes: number;
    allowedPathPrefixes: string[];
    forbiddenPathPrefixes: string[];
  };
  actions: {
    willRunCodex: false;
    willRunShellCommands: false;
    willApplyPatch: false;
    willEditWorkingTree: false;
    willCreateBranch: false;
    willCreateCommit: false;
    willPush: false;
    willCreateOrUpdatePr: false;
    willRerunWorkflow: false;
    willMergeOrRebase: false;
  };
  proposedRepairSteps: Array<{
    label: string;
    status: "planned" | "blocked" | "not_requested";
    requiresApproval: true;
    approved: false;
    repairClass:
      | "pr_body_repair"
      | "test_repair"
      | "type_repair"
      | "lint_repair"
      | "build_repair"
      | "docs_repair"
      | "runtime_gate_repair"
      | "rerun_only"
      | "unknown";
    metadata: Record<string, string | number | boolean | null>;
  }>;
  nextHumanStep: {
    label: string;
    inertCommandPreview: string | null;
    instructions: string[];
  };
  blockedReasons: string[];
  blockedReasonCodes: string[];
  dataBoundary: {
    metadataOnly: true;
    omittedRawPayloads: true;
    hashesOnlyForPayloads: true;
  };
  guardrails: string[];
  artifacts: string[];
}

export interface CreateAgentFactoryCiRepairPlanOptions {
  artifactDir?: string;
  now?: Date;
  planId?: string;
  repository?: string | null;
  actor?: string | null;
  workflowName?: string | null;
  workflowRunId?: string | number | null;
  prNumber?: number | string | null;
  headSha?: string | null;
  branchName?: string | null;
  baseBranch?: string | null;
  taskId?: string | null;
  maxSuggestedFiles?: number | string | null;
  maxSuggestedPatchBytes?: number | string | null;
  allowedPathPrefixes?: readonly string[];
  forbiddenPathPrefixes?: readonly string[];
  approvalGate?: AgentFactoryCiRepairApprovalGate | null;
  nextHumanStepLabel?: string | null;
  inertCommandPreview?: string | null;
  instructions?: readonly string[];
}

type ArtifactId =
  | "run-history"
  | "branch-commit-pr-plan"
  | "patch-artifact-plan"
  | "planner-note"
  | "codex-invocation"
  | "ci-workflow-runs"
  | "ci-job-steps"
  | "ci-log-summary";

interface InputArtifactDefinition {
  id: ArtifactId;
  label: string;
  fileName: string;
}

interface InternalInputArtifact {
  artifact: AgentFactoryCiRepairPlan["inputArtifacts"][number];
  data: unknown;
  sourceId: ArtifactId;
}

interface CiMetadataRecord {
  sourceId: ArtifactId;
  sourceLabel: string;
  record: Record<string, unknown>;
  inherited: {
    workflowName: string | null;
    jobName: string | null;
    stepName: string | null;
  };
  kind: "workflow" | "job" | "step" | "summary";
}

interface FailureClassificationDraft {
  workflowName: string | null;
  jobName: string | null;
  stepName: string | null;
  failureClass: AgentFactoryCiFailureClass;
  confidence: "low" | "medium" | "high";
  reasonCode: string;
  evidence: Record<string, string | number | boolean | null>;
}

const INPUT_ARTIFACTS: readonly InputArtifactDefinition[] = [
  {
    id: "run-history",
    label: "AF011 run history",
    fileName: "run-history.jsonl",
  },
  {
    id: "branch-commit-pr-plan",
    label: "AF013C branch commit PR plan",
    fileName: "branch-commit-pr-plan.json",
  },
  {
    id: "patch-artifact-plan",
    label: "AF013B patch artifact plan",
    fileName: "factory-patch-artifact-plan.json",
  },
  {
    id: "planner-note",
    label: "AF013A planner note",
    fileName: "factory-planner-note.json",
  },
  {
    id: "codex-invocation",
    label: "AF010 Codex invocation plan",
    fileName: "codex-invocation-plan.json",
  },
  {
    id: "ci-workflow-runs",
    label: "CI workflow runs",
    fileName: "ci-workflow-runs.json",
  },
  {
    id: "ci-job-steps",
    label: "CI job steps",
    fileName: "ci-job-steps.json",
  },
  {
    id: "ci-log-summary",
    label: "CI log summary",
    fileName: "ci-log-summary.json",
  },
] as const;

const DEFAULT_ALLOWED_PATH_PREFIXES = [
  "lib/agent-factory/",
  "scripts/agent-factory-",
  "tests/agent-factory-",
  "docs/agent-factory-",
  "package.json",
  "scripts/run-node-tests.mjs",
] as const;

const DEFAULT_FORBIDDEN_PATH_PREFIXES = [
  "app/",
  "components/",
  "lib/auth",
  "lib/billing",
  "lib/ocr",
  "lib/payment",
  "lib/provider",
  "lib/instructor",
  "lib/academy",
  "supabase/",
  "migrations/",
  ".github/workflows/",
] as const;

const OUTPUT_ARTIFACTS = [
  ".agent-factory/ci-repair-plan.json",
  ".agent-factory/ci-repair-plan.md",
  ".agent-factory/agent-factory-ci-repair-summary.md",
] as const;

const GUARDRAILS = [
  "AF014 v1 is metadata-only and report-only.",
  "AF014 v1 classifies CI metadata and local log summaries without storing raw logs.",
  "AF014 v1 never invokes Codex, runs shell repair commands, applies patches, edits source files, or edits the working tree.",
  "AF014 v1 never creates branches, commits, pushes, pull requests, workflow reruns, merges, or rebases.",
  "AF014 v1 never calls learner runtime, OCR, provider, billing, auth, production, instructor, academy, or payment APIs.",
  "AF014 v1 fails closed on missing or failed-closed approval gates and unsafe local CI artifacts.",
] as const;

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
  /^\s*["']?(?:raw[_\-\s]?comment|comment[_\-\s]?body|raw[_\-\s]?comments?)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?patch|raw[_\-\s]?diff|patch[_\-\s]?body|diff[_\-\s]?body|source[_\-\s]?patch|source[_\-\s]?diff)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?task[_\-\s]?package[_\-\s]?prompt|task[_\-\s]?package[_\-\s]?prompt|codex[_\-\s]?prompt|prompt[_\-\s]?text|prompt[_\-\s]?body)["']?\s*[:=]/i,
] as const;

const FORBIDDEN_INPUT_KEY_PATTERNS = [
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
  /raw.*comments?/i,
  /comment.*body/i,
  /raw.*patch/i,
  /raw.*diff/i,
  /patch.*body/i,
  /diff.*body/i,
  /source.*patch/i,
  /source.*diff/i,
  /raw.*task.*package.*prompt/i,
  /task.*package.*prompt/i,
  /^codexPrompt$/i,
  /^prompt$/i,
  /prompt.*text/i,
  /prompt.*body/i,
] as const;

const FORBIDDEN_PLAN_KEY_PATTERNS = FORBIDDEN_INPUT_KEY_PATTERNS;

const REASON_CODE_TO_CLASS = new Map<string, {
  failureClass: AgentFactoryCiFailureClass;
  confidence: "low" | "medium" | "high";
}>([
  ["pr_contract_missing_required_section", { failureClass: "pr_contract", confidence: "high" }],
  ["pr_contract_missing_risk_line", { failureClass: "pr_contract", confidence: "high" }],
  ["pr_contract_missing_merge_recommendation", { failureClass: "pr_contract", confidence: "high" }],
  ["pr_contract_invalid_closing_reference", { failureClass: "pr_contract", confidence: "high" }],
  ["pr_contract_failed", { failureClass: "pr_contract", confidence: "medium" }],
  ["typecheck_failed", { failureClass: "typecheck", confidence: "high" }],
  ["lint_failed", { failureClass: "lint", confidence: "high" }],
  ["focused_tests_failed", { failureClass: "focused_tests", confidence: "high" }],
  ["full_tests_failed", { failureClass: "full_tests", confidence: "high" }],
  ["build_failed", { failureClass: "build", confidence: "high" }],
  ["learner_loop_failed", { failureClass: "learner_loop", confidence: "high" }],
  ["risk_gate_failed", { failureClass: "risk_gate", confidence: "high" }],
  ["runtime_gate_failed", { failureClass: "runtime_gate", confidence: "high" }],
  ["closed_beta_readiness_failed", { failureClass: "closed_beta_readiness", confidence: "high" }],
  ["workflow_infra_failed", { failureClass: "workflow_infra", confidence: "medium" }],
  ["unknown_ci_failure", { failureClass: "unknown", confidence: "low" }],
]);

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizePathForArtifact(filePath: string): string {
  return filePath.replaceAll("\\", "/");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeText(value: unknown, fallback = "unknown"): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return fallback;
  }

  const text = String(value).replace(/[\u0000-\u001f]/g, "").trim();
  if (!text) return fallback;
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(text))) return fallback;
  if (SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(text))) return fallback;
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function safeNullableText(value: unknown): string | null {
  const text = safeText(value, "");
  return text ? text : null;
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizePositiveInteger(
  value: number | string | null | undefined,
  fallback: number,
): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim()) && Number(value.trim()) > 0) {
    return Number(value.trim());
  }
  return fallback;
}

function hasInvalidExplicitPositiveInteger(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return !Number.isInteger(value) || value <= 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return !/^\d+$/.test(trimmed) || Number(trimmed) <= 0;
  }
  return true;
}

function normalizePositiveNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim()) && Number(value.trim()) > 0) {
    return Number(value.trim());
  }
  return null;
}

function normalizeApprovalGate(
  value: AgentFactoryCiRepairApprovalGate | null | undefined,
): AgentFactoryCiRepairApprovalGate {
  if (value === "missing" || value === "approved" || value === "failed_closed") return value;
  return "not_requested";
}

function normalizeStringList(
  values: readonly string[] | undefined,
  fallback: readonly string[],
): string[] {
  const source = values && values.length > 0 ? values : fallback;
  const cleaned = source
    .map((value) => safeText(value, ""))
    .filter(Boolean)
    .map(normalizePathForArtifact);

  return [...new Set(cleaned)].sort();
}

function normalizeInstructionList(
  values: readonly string[] | undefined,
  fallback: readonly string[],
): string[] {
  const source = values && values.length > 0 ? values : fallback;
  const cleaned = source
    .map((value) => safeText(value, ""))
    .filter(Boolean);

  return [...new Set(cleaned)];
}

function artifactPath(artifactDir: string, fileName: string): string {
  const resolvedDir = path.resolve(process.cwd(), artifactDir);
  const resolvedFile = path.resolve(resolvedDir, fileName);

  if (resolvedFile !== resolvedDir && !resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error(`Unsafe AF014 artifact path: ${fileName}`);
  }

  return resolvedFile;
}

function parseJsonl(text: string): unknown[] {
  return normalizeNewlines(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

function parseArtifactData(artifactId: ArtifactId, text: string): unknown {
  return artifactId === "run-history" ? parseJsonl(text) : JSON.parse(text);
}

function assertNoForbiddenInputKeys(value: unknown, label: string): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      const secretPattern = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(current));
      if (secretPattern) {
        throw new Error(`${label} contains a secret-like value at ${currentPath}.`);
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
      const forbidden = FORBIDDEN_INPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`${label} contains a forbidden raw-content or credential-like key.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}

function artifactByLabel(
  artifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][],
  label: string,
): AgentFactoryCiRepairPlan["inputArtifacts"][number] | null {
  return artifacts.find((entry) => entry.label === label) ?? null;
}

function metadataValue(
  artifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][],
  label: string,
  key: string,
): string | number | boolean | null {
  const artifact = artifactByLabel(artifacts, label);
  return artifact?.metadata[key] ?? null;
}

function firstMeaningfulString(values: readonly unknown[], ignored: readonly string[] = []): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text && !ignored.includes(text)) return text;
  }
  return null;
}

function recordsFromHistory(data: unknown): Record<string, unknown>[] {
  return asArray(data)
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => entry !== null);
}

function runHistoryMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const records = recordsFromHistory(data);
  const latest = records.at(-1);
  const target = asRecord(latest?.target);
  const actor = asRecord(latest?.actor);

  return {
    recordCount: records.length,
    latestSource: safeText(latest?.source, "none"),
    latestStatus: safeText(latest?.status, "none"),
    latestDryRun: safeBoolean(latest?.dryRun),
    latestApprovalGate: safeText(latest?.approvalGateOutcome, "none"),
    latestTaskId: safeText(target?.taskId, "none"),
    latestPrNumber: safeNumber(target?.prNumber),
    latestRepository: safeText(actor?.repository, "unknown"),
  };
}

function branchCommitPrPlanMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const target = asRecord(root.target);
  const boundary = asRecord(root.mutationBoundary);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    taskId: safeText(target?.taskId, "none"),
    issueNumber: safeNumber(target?.issueNumber),
    prNumber: safeNumber(target?.prNumber),
    baseBranch: safeText(target?.baseBranch, "main"),
    branchName: safeText(target?.proposedBranchName, "none"),
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    requestedMutationClass: safeText(boundary?.requestedMutationClass, "none"),
  };
}

function patchArtifactPlanMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const target = asRecord(root.target);
  const boundary = asRecord(root.patchBoundary);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    taskId: safeText(target?.taskId, "none"),
    prNumber: safeNumber(target?.prNumber),
    baseBranch: safeText(target?.baseBranch, "main"),
    branchName: safeText(target?.proposedBranchName, "none"),
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
  };
}

function plannerNoteMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const target = asRecord(root.target);
  const boundary = asRecord(root.boundary);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    taskId: safeText(target?.taskId, "none"),
    prNumber: safeNumber(target?.prNumber),
    baseBranch: safeText(target?.baseBranch, "main"),
    branchName: safeText(target?.proposedBranchName, "none"),
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
  };
}

function codexInvocationMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const taskPackage = asRecord(root.taskPackage);
  const packageSummary = asRecord(taskPackage?.packageSummary);
  const dataBoundary = asRecord(root.dataBoundary);

  return {
    status: safeText(root.status),
    dryRun: safeBoolean(root.dryRun),
    codexWillBeInvoked: safeBoolean(root.codexWillBeInvoked),
    dataBoundarySafe: safeBoolean(dataBoundary?.safe),
    violationCount: safeNumber(dataBoundary?.violationCount),
    itemId: safeText(packageSummary?.itemId ?? taskPackage?.requestedItemId, "none"),
  };
}

function flattenedRecords(value: unknown): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  function visit(current: unknown): void {
    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry) => visit(entry));
      return;
    }

    const record = current as Record<string, unknown>;
    records.push(record);
    Object.values(record).forEach((entry) => visit(entry));
  }

  visit(value);
  return records;
}

function cleanToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function conclusionFrom(value: unknown): "success" | "failure" | "cancelled" | "skipped" | "unknown" {
  const token = cleanToken(value);
  if (["success", "successful", "passed", "pass", "neutral"].includes(token)) return "success";
  if (["failure", "failed", "error", "action_required", "startup_failure"].includes(token)) {
    return "failure";
  }
  if (["cancelled", "canceled", "timed_out", "timeout", "timedout"].includes(token)) {
    return "cancelled";
  }
  if (["skipped", "skip"].includes(token)) return "skipped";
  return "unknown";
}

function conclusionForRecord(record: Record<string, unknown>): "success" | "failure" | "cancelled" | "skipped" | "unknown" {
  return conclusionFrom(
    record.conclusion ??
      record.status ??
      record.state ??
      record.latestConclusion ??
      record.result,
  );
}

function hasAnyKey(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.some((key) => key in record);
}

function ciRecordKind(
  record: Record<string, unknown>,
  sourceId: ArtifactId,
): "workflow" | "job" | "step" | "summary" | null {
  if (sourceId === "ci-log-summary") {
    if (
      hasAnyKey(record, [
        "reasonCode",
        "failureClass",
        "failureDomain",
        "missingRiskLine",
        "missingRequiredSections",
        "missingMergeRecommendation",
        "closingReferenceCount",
        "message",
        "summary",
      ])
    ) {
      return "summary";
    }
  }

  if (hasAnyKey(record, ["stepName", "step_name", "step", "failureStep", "failedStep"])) {
    return "step";
  }
  if (hasAnyKey(record, ["jobName", "job_name", "job"])) return "job";
  if (
    hasAnyKey(record, [
      "workflowName",
      "workflow_name",
      "workflow",
      "workflowRunId",
      "runId",
      "checkName",
      "context",
      "name",
    ])
  ) {
    return sourceId === "ci-job-steps" ? "job" : "workflow";
  }

  return null;
}

function stringFromKeys(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const text = safeNullableText(record[key]);
    if (text) return text;
  }
  return null;
}

function collectCiMetadataRecords(inputs: readonly InternalInputArtifact[]): CiMetadataRecord[] {
  const records: CiMetadataRecord[] = [];

  function visit(
    value: unknown,
    sourceId: ArtifactId,
    sourceLabel: string,
    inherited: CiMetadataRecord["inherited"],
  ): void {
    if (value === null || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, sourceId, sourceLabel, inherited));
      return;
    }

    const record = value as Record<string, unknown>;
    const workflowName =
      stringFromKeys(record, ["workflowName", "workflow_name", "workflow"]) ??
      (sourceId === "ci-workflow-runs" ? stringFromKeys(record, ["name", "checkName", "context"]) : null) ??
      inherited.workflowName;
    const jobName =
      stringFromKeys(record, ["jobName", "job_name", "job"]) ??
      (sourceId === "ci-job-steps" ? stringFromKeys(record, ["name", "checkName", "context"]) : null) ??
      inherited.jobName;
    const stepName =
      stringFromKeys(record, ["stepName", "step_name", "step", "failureStep", "failedStep"]) ??
      inherited.stepName;
    const nextInherited = {
      workflowName,
      jobName,
      stepName,
    };
    const kind = ciRecordKind(record, sourceId);

    if (kind) {
      records.push({
        sourceId,
        sourceLabel,
        record,
        inherited: nextInherited,
        kind,
      });
    }

    Object.values(record).forEach((entry) => visit(entry, sourceId, sourceLabel, nextInherited));
  }

  for (const input of inputs) {
    if (!["ci-workflow-runs", "ci-job-steps", "ci-log-summary"].includes(input.sourceId)) {
      continue;
    }
    if (input.artifact.status !== "available") continue;

    visit(input.data, input.sourceId, input.artifact.label, {
      workflowName: null,
      jobName: null,
      stepName: null,
    });
  }

  return records;
}

function ciArtifactMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const records = flattenedRecords(data);
  const conclusions = records.map(conclusionForRecord).filter((entry) => entry !== "unknown");
  const reasonCodes = records
    .map((record) => safeNullableText(record.reasonCode ?? record.reason_code))
    .filter((entry): entry is string => Boolean(entry));
  const workflowNames = records
    .map((record) => stringFromKeys(record, ["workflowName", "workflow_name", "workflow", "name"]))
    .filter((entry): entry is string => Boolean(entry));

  return {
    recordCount: records.length,
    conclusionCount: conclusions.length,
    failureLikeCount: conclusions.filter((entry) => entry === "failure" || entry === "cancelled").length,
    reasonCodeCount: reasonCodes.length,
    observedWorkflowNameCount: new Set(workflowNames).size,
  };
}

function metadataForArtifact(
  artifactId: ArtifactId,
  data: unknown,
): Record<string, string | number | boolean | null> {
  if (artifactId === "run-history") return runHistoryMetadata(data);
  if (artifactId === "branch-commit-pr-plan") return branchCommitPrPlanMetadata(data);
  if (artifactId === "patch-artifact-plan") return patchArtifactPlanMetadata(data);
  if (artifactId === "planner-note") return plannerNoteMetadata(data);
  if (artifactId === "codex-invocation") return codexInvocationMetadata(data);
  if (
    artifactId === "ci-workflow-runs" ||
    artifactId === "ci-job-steps" ||
    artifactId === "ci-log-summary"
  ) {
    return ciArtifactMetadata(data);
  }

  return {};
}

function readInputArtifact(artifactDir: string, definition: InputArtifactDefinition): InternalInputArtifact {
  const fullPath = artifactPath(artifactDir, definition.fileName);
  const relative = normalizePathForArtifact(path.relative(process.cwd(), fullPath));

  if (!fs.existsSync(fullPath)) {
    return {
      sourceId: definition.id,
      data: null,
      artifact: {
        label: definition.label,
        path: relative,
        status: "missing",
        sha256: null,
        metadata: {},
      },
    };
  }

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return {
        sourceId: definition.id,
        data: null,
        artifact: {
          label: definition.label,
          path: relative,
          status: "invalid",
          sha256: null,
          metadata: { reason: "not_a_file" },
        },
      };
    }

    const text = fs.readFileSync(fullPath, "utf8");
    assertAgentFactoryCiRepairTextSafe(text, `${definition.label} input`);
    const data = parseArtifactData(definition.id, text);
    assertNoForbiddenInputKeys(data, `${definition.label} input`);

    return {
      sourceId: definition.id,
      data,
      artifact: {
        label: definition.label,
        path: relative,
        status: "available",
        sha256: sha256(text),
        metadata: metadataForArtifact(definition.id, data),
      },
    };
  } catch {
    return {
      sourceId: definition.id,
      data: null,
      artifact: {
        label: definition.label,
        path: relative,
        status: "invalid",
        sha256: null,
        metadata: {
          reason: "unsafe_or_invalid_input",
        },
      },
    };
  }
}

function defaultTaskId(
  artifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013C branch commit PR plan", "taskId"),
    metadataValue(artifacts, "AF013B patch artifact plan", "taskId"),
    metadataValue(artifacts, "AF013A planner note", "taskId"),
    metadataValue(artifacts, "AF010 Codex invocation plan", "itemId"),
    metadataValue(artifacts, "AF011 run history", "latestTaskId"),
  ], ["none", "unknown"]);
}

function defaultPrNumber(
  artifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][],
): number | null {
  for (const value of [
    metadataValue(artifacts, "AF013C branch commit PR plan", "prNumber"),
    metadataValue(artifacts, "AF013B patch artifact plan", "prNumber"),
    metadataValue(artifacts, "AF013A planner note", "prNumber"),
    metadataValue(artifacts, "AF011 run history", "latestPrNumber"),
  ]) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

function defaultBranchName(
  artifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013C branch commit PR plan", "branchName"),
    metadataValue(artifacts, "AF013B patch artifact plan", "branchName"),
    metadataValue(artifacts, "AF013A planner note", "branchName"),
  ], ["none", "unknown"]);
}

function defaultBaseBranch(
  artifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][],
): string {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013C branch commit PR plan", "baseBranch"),
    metadataValue(artifacts, "AF013B patch artifact plan", "baseBranch"),
    metadataValue(artifacts, "AF013A planner note", "baseBranch"),
  ], ["none", "unknown"]) ?? "main";
}

function normalizeReasonCode(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return null;
  }
  const code = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return code ? code.slice(0, 80) : null;
}

function directReasonCode(record: Record<string, unknown>): string | null {
  return normalizeReasonCode(record.reasonCode ?? record.reason_code ?? record.code);
}

function directFailureClass(value: unknown): AgentFactoryCiFailureClass | null {
  const token = cleanToken(value);
  if (token === "pr_contract" || token === "pr_contract_failure") return "pr_contract";
  if (token === "typecheck" || token === "typecheck_failure") return "typecheck";
  if (token === "lint" || token === "lint_failure") return "lint";
  if (token === "focused_tests" || token === "focused_test_failure" || token === "focused_test") {
    return "focused_tests";
  }
  if (
    token === "full_tests" ||
    token === "full_test_failure" ||
    token === "unit_test_failure" ||
    token === "unit_tests"
  ) {
    return "full_tests";
  }
  if (token === "build" || token === "build_failure") return "build";
  if (token === "learner_loop" || token === "learner_loop_failure") return "learner_loop";
  if (token === "risk_gate" || token === "risk_gate_failure") return "risk_gate";
  if (token === "runtime_gate" || token === "runtime_gate_failure") return "runtime_gate";
  if (
    token === "closed_beta_readiness" ||
    token === "closed_beta_readiness_failure" ||
    token === "closed_beta_readiness_failed"
  ) {
    return "closed_beta_readiness";
  }
  if (token === "workflow_infra" || token === "workflow_infra_failure") return "workflow_infra";
  if (token === "unknown" || token === "unknown_ci_failure") return "unknown";
  return null;
}

function textForClassification(record: Record<string, unknown>): string {
  const parts = [
    record.workflowName,
    record.workflow_name,
    record.workflow,
    record.name,
    record.checkName,
    record.context,
    record.jobName,
    record.job_name,
    record.job,
    record.stepName,
    record.step_name,
    record.step,
    record.failureStep,
    record.failedStep,
    record.failureClass,
    record.failure_class,
    record.failureDomain,
    record.failure_domain,
    record.reasonCode,
    record.reason_code,
    record.message,
    record.summary,
    record.title,
  ];

  return parts
    .map((entry) => (typeof entry === "string" || typeof entry === "number" ? String(entry) : ""))
    .filter(Boolean)
    .join(" ");
}

function booleanFlag(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.some((key) => record[key] === true);
}

function numberFlag(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.some((key) => {
    const value = record[key];
    return typeof value === "number" && value > 0;
  });
}

function arrayFlag(record: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.some((key) => Array.isArray(record[key]) && asArray(record[key]).length > 0);
}

function prContractReasonFromMetadata(record: Record<string, unknown>, text: string): string | null {
  if (
    booleanFlag(record, ["missingRequiredSection", "missingRequiredSections", "requiredSectionMissing"]) ||
    numberFlag(record, ["missingRequiredSectionCount", "missingRequiredSections"]) ||
    arrayFlag(record, ["missingRequiredSections", "missingSections"]) ||
    /missing.*required.*section|required.*section.*missing|missing.*heading|heading.*missing/i.test(text)
  ) {
    return "pr_contract_missing_required_section";
  }

  if (
    booleanFlag(record, ["missingRiskLine", "riskLineMissing"]) ||
    /missing.*risk.*line|risk.*line.*missing|risk classification.*missing/i.test(text)
  ) {
    return "pr_contract_missing_risk_line";
  }

  if (
    booleanFlag(record, [
      "missingMergeRecommendation",
      "mergeRecommendationMissing",
      "missingMergeRecommendationCheckboxes",
    ]) ||
    numberFlag(record, ["missingMergeRecommendationCheckboxes"]) ||
    /missing.*merge.*recommendation|merge.*recommendation.*missing|merge.*recommendation.*checkbox|checkbox.*merge.*recommendation/i.test(text)
  ) {
    return "pr_contract_missing_merge_recommendation";
  }

  const closingReferenceCount = safeNumber(record.closingReferenceCount ?? record.closingReferencesCount);
  if (
    booleanFlag(record, ["invalidClosingReference", "multipleClosingReferences", "missingClosingReference"]) ||
    (closingReferenceCount !== null && closingReferenceCount !== 1) ||
    /invalid.*closing|multiple.*closing|duplicate.*closing|missing.*closing|closing.*reference.*(?:invalid|multiple|duplicate|missing)/i.test(text)
  ) {
    return "pr_contract_invalid_closing_reference";
  }

  if (/\bpr[-_ ]?contract\b|\bpull[-_ ]?request[-_ ]?contract\b|\bvalidate[-_ ]?pr[-_ ]?contract\b/i.test(text)) {
    return "pr_contract_failed";
  }

  return null;
}

function patternClassification(text: string): {
  failureClass: AgentFactoryCiFailureClass;
  reasonCode: string;
  confidence: "low" | "medium" | "high";
} {
  const prReason = prContractReasonFromMetadata({}, text);
  if (prReason) {
    return {
      failureClass: "pr_contract",
      reasonCode: prReason,
      confidence: prReason === "pr_contract_failed" ? "medium" : "high",
    };
  }

  if (/\btype[-_ ]?check\b|\btsc\b|\btypescript\b/i.test(text)) {
    return { failureClass: "typecheck", reasonCode: "typecheck_failed", confidence: "high" };
  }
  if (/\blint\b|\beslint\b/i.test(text)) {
    return { failureClass: "lint", reasonCode: "lint_failed", confidence: "high" };
  }
  if (/\bfocused[-_ ]?tests?\b|\btargeted[-_ ]?tests?\b|\bchanged[-_ ]?tests?\b|\btests\/[A-Za-z0-9._/@+\-]+\.test\.mjs\b/i.test(text)) {
    return { failureClass: "focused_tests", reasonCode: "focused_tests_failed", confidence: "high" };
  }
  if (/\bfull[-_ ]?tests?\b|\bunit[-_ ]?tests?\b|\brun[-_ ]?node[-_ ]?tests\b|\bnpm(?:\.cmd)?\s+run\s+test\b|\bnode --test\b/i.test(text)) {
    return { failureClass: "full_tests", reasonCode: "full_tests_failed", confidence: "high" };
  }
  if (/\bbuild\b|\bnext[-_ ]?build\b/i.test(text)) {
    return { failureClass: "build", reasonCode: "build_failed", confidence: "high" };
  }
  if (/\blearner[-_ ]?loop\b|\bverify:learner-loop:ci\b/i.test(text)) {
    return { failureClass: "learner_loop", reasonCode: "learner_loop_failed", confidence: "high" };
  }
  if (/\brisk[-_ ]?gate\b|\brisk[-_ ]?classification\b|\bclassify[-_ ]?risk\b/i.test(text)) {
    return { failureClass: "risk_gate", reasonCode: "risk_gate_failed", confidence: "high" };
  }
  if (/\bruntime[-_ ]?gate\b|\bruntime[-_ ]?evidence\b|\blive[-_ ]?runtime\b/i.test(text)) {
    return { failureClass: "runtime_gate", reasonCode: "runtime_gate_failed", confidence: "high" };
  }
  if (/\bclosed[-_ ]?beta[-_ ]?readiness\b|\bcheck:closed-beta-readiness\b/i.test(text)) {
    return {
      failureClass: "closed_beta_readiness",
      reasonCode: "closed_beta_readiness_failed",
      confidence: "high",
    };
  }
  if (/\bworkflow[-_ ]?infra\b|\bstartup[-_ ]?failure\b|\brunner\b|\bsetup[-_ ]?node\b|\bcheckout\b|\brate[-_ ]?limit\b|\btimed?[-_ ]?out\b|\btimeout\b|\bcancell?ed\b/i.test(text)) {
    return { failureClass: "workflow_infra", reasonCode: "workflow_infra_failed", confidence: "medium" };
  }

  return { failureClass: "unknown", reasonCode: "unknown_ci_failure", confidence: "low" };
}

function isFailureLike(record: Record<string, unknown>): boolean {
  const conclusion = conclusionForRecord(record);
  if (conclusion === "failure" || conclusion === "cancelled") return true;
  if (directReasonCode(record)) return true;
  if (directFailureClass(record.failureClass ?? record.failure_class ?? record.failureDomain ?? record.failure_domain)) {
    return true;
  }
  return booleanFlag(record, [
    "failed",
    "failure",
    "missingRiskLine",
    "riskLineMissing",
    "missingMergeRecommendation",
    "missingRequiredSection",
    "invalidClosingReference",
  ]);
}

function classifyCiRecord(input: CiMetadataRecord): FailureClassificationDraft | null {
  const { record } = input;
  if (!isFailureLike(record)) return null;

  const text = textForClassification(record);
  const reasonCode = directReasonCode(record);
  const directByReason = reasonCode ? REASON_CODE_TO_CLASS.get(reasonCode) : undefined;
  const directClass = directFailureClass(
    record.failureClass ??
      record.failure_class ??
      record.failureDomain ??
      record.failure_domain ??
      record.domain,
  );
  const prReason = prContractReasonFromMetadata(record, text);
  const selected = (() => {
    if (prReason && prReason !== "pr_contract_failed") {
      return {
        failureClass: "pr_contract" as const,
        reasonCode: prReason,
        confidence: "high" as const,
      };
    }
    if (directByReason) {
      return {
        failureClass: directByReason.failureClass,
        reasonCode: reasonCode as string,
        confidence: directByReason.confidence,
      };
    }
    if (directClass) {
      const fallback = reasonCodeForClass(directClass);
      return {
        failureClass: directClass,
        reasonCode: fallback,
        confidence: "high" as const,
      };
    }
    if (prReason) {
      return {
        failureClass: "pr_contract" as const,
        reasonCode: prReason,
        confidence: "medium" as const,
      };
    }
    return patternClassification(text);
  })();

  return {
    workflowName:
      stringFromKeys(record, ["workflowName", "workflow_name", "workflow"]) ??
      input.inherited.workflowName,
    jobName:
      stringFromKeys(record, ["jobName", "job_name", "job"]) ??
      input.inherited.jobName,
    stepName:
      stringFromKeys(record, ["stepName", "step_name", "step", "failureStep", "failedStep"]) ??
      input.inherited.stepName,
    failureClass: selected.failureClass,
    confidence: selected.confidence,
    reasonCode: selected.reasonCode,
    evidence: {
      sourceArtifact: input.sourceLabel,
      sourceKind: input.kind,
      conclusion: safeText(record.conclusion ?? record.status ?? record.state, "unknown"),
      metadataOnly: true,
    },
  };
}

function reasonCodeForClass(failureClass: AgentFactoryCiFailureClass): string {
  if (failureClass === "pr_contract") return "pr_contract_failed";
  if (failureClass === "typecheck") return "typecheck_failed";
  if (failureClass === "lint") return "lint_failed";
  if (failureClass === "focused_tests") return "focused_tests_failed";
  if (failureClass === "full_tests") return "full_tests_failed";
  if (failureClass === "build") return "build_failed";
  if (failureClass === "learner_loop") return "learner_loop_failed";
  if (failureClass === "risk_gate") return "risk_gate_failed";
  if (failureClass === "runtime_gate") return "runtime_gate_failed";
  if (failureClass === "closed_beta_readiness") return "closed_beta_readiness_failed";
  if (failureClass === "workflow_infra") return "workflow_infra_failed";
  return "unknown_ci_failure";
}

function dedupeClassifications(
  classifications: readonly FailureClassificationDraft[],
): AgentFactoryCiRepairPlan["failureClassifications"] {
  const selected = new Map<string, FailureClassificationDraft>();

  for (const classification of classifications) {
    const key = [
      classification.workflowName ?? "",
      classification.jobName ?? "",
      classification.stepName ?? "",
      classification.failureClass,
      classification.reasonCode,
    ].join("|");
    if (!selected.has(key)) selected.set(key, classification);
  }

  return [...selected.values()].map((classification) => ({
    ...classification,
    evidence: { ...classification.evidence },
  }));
}

function ciStateFor(
  records: readonly CiMetadataRecord[],
  classifications: readonly AgentFactoryCiRepairPlan["failureClassifications"][number][],
): AgentFactoryCiRepairPlan["ciState"] {
  const conclusions = records.map((entry) => conclusionForRecord(entry.record));
  const latestConclusion = (() => {
    if (conclusions.includes("failure")) return "failure";
    if (conclusions.includes("cancelled")) return "cancelled";
    if (classifications.length > 0) return "failure";
    if (conclusions.length > 0 && conclusions.every((entry) => entry === "skipped")) return "skipped";
    if (conclusions.includes("success")) return "success";
    return "unknown";
  })();
  const workflowNames = records
    .map((entry) =>
      stringFromKeys(entry.record, ["workflowName", "workflow_name", "workflow", "name"]) ??
      entry.inherited.workflowName,
    )
    .filter((entry): entry is string => Boolean(entry));

  return {
    latestConclusion,
    failingWorkflowCount: records.filter((entry) =>
      entry.kind === "workflow" && isFailureLike(entry.record),
    ).length,
    failingJobCount: records.filter((entry) =>
      entry.kind === "job" && isFailureLike(entry.record),
    ).length,
    failingStepCount: records.filter((entry) =>
      entry.kind === "step" && isFailureLike(entry.record),
    ).length,
    observedWorkflowNames: [...new Set(workflowNames.map((entry) => safeText(entry, "")).filter(Boolean))].sort(),
    observedFailureClasses: [...new Set(classifications.map((entry) => entry.failureClass))].sort(),
  };
}

function repairClassForFailureClass(
  failureClass: AgentFactoryCiFailureClass,
): AgentFactoryCiRepairPlan["proposedRepairSteps"][number]["repairClass"] {
  if (failureClass === "pr_contract") return "pr_body_repair";
  if (failureClass === "typecheck") return "type_repair";
  if (failureClass === "lint") return "lint_repair";
  if (failureClass === "focused_tests" || failureClass === "full_tests") return "test_repair";
  if (failureClass === "build") return "build_repair";
  if (
    failureClass === "learner_loop" ||
    failureClass === "runtime_gate" ||
    failureClass === "closed_beta_readiness"
  ) {
    return "runtime_gate_repair";
  }
  if (failureClass === "risk_gate") return "docs_repair";
  if (failureClass === "workflow_infra") return "rerun_only";
  return "unknown";
}

function repairStepStatus(input: {
  planStatus: AgentFactoryCiRepairStatus;
  approvalGate: AgentFactoryCiRepairApprovalGate;
}): "planned" | "blocked" | "not_requested" {
  if (input.planStatus === "blocked") return "blocked";
  if (input.approvalGate === "approved") return "planned";
  return "not_requested";
}

function proposedRepairStepsFor(
  classifications: readonly AgentFactoryCiRepairPlan["failureClassifications"][number][],
  status: AgentFactoryCiRepairStatus,
  approvalGate: AgentFactoryCiRepairApprovalGate,
): AgentFactoryCiRepairPlan["proposedRepairSteps"] {
  const byReason = new Map<string, AgentFactoryCiRepairPlan["failureClassifications"][number]>();
  for (const classification of classifications) {
    const key = `${classification.failureClass}:${classification.reasonCode}`;
    if (!byReason.has(key)) byReason.set(key, classification);
  }

  if (byReason.size === 0) {
    return [
      {
        label: "No deterministic CI repair step is proposed from the available metadata.",
        status: "not_requested",
        requiresApproval: true,
        approved: false,
        repairClass: "unknown",
        metadata: {
          metadataOnly: true,
          classificationCount: 0,
        },
      },
    ];
  }

  return [...byReason.values()].map((classification) => ({
    label: labelForClassification(classification),
    status: repairStepStatus({ planStatus: status, approvalGate }),
    requiresApproval: true,
    approved: false,
    repairClass: repairClassForFailureClass(classification.failureClass),
    metadata: {
      failureClass: classification.failureClass,
      reasonCode: classification.reasonCode,
      workflowName: classification.workflowName,
      jobName: classification.jobName,
      stepName: classification.stepName,
      metadataOnly: true,
    },
  }));
}

function labelForClassification(
  classification: AgentFactoryCiRepairPlan["failureClassifications"][number],
): string {
  if (classification.failureClass === "pr_contract") {
    return "Prepare a metadata-only PR Contract repair handoff for human review.";
  }
  if (classification.failureClass === "workflow_infra") {
    return "Review workflow infrastructure metadata before any rerun-only decision.";
  }
  if (classification.failureClass === "unknown") {
    return "Request human review because the CI failure class is unknown.";
  }
  return `Prepare a metadata-only ${classification.failureClass} repair plan for human review.`;
}

function blockedCodesForReasons(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/unsafe local CI artifact/i.test(reason)) return "unsafe_input_artifact";
    if (/invalid local artifact/i.test(reason)) return "invalid_artifact";
    if (/approval gate is missing/i.test(reason)) return "missing_human_approval";
    if (/failed closed/i.test(reason)) return "approval_failed_closed";
    if (/max suggested files|max suggested patch bytes/i.test(reason)) {
      return "invalid_repair_boundary_limit";
    }
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function createPlanId(input: {
  createdAt: string;
  targetTaskId: string | null;
  prNumber: number | null;
  inputArtifacts: readonly AgentFactoryCiRepairPlan["inputArtifacts"][number][];
  failureClassifications: readonly AgentFactoryCiRepairPlan["failureClassifications"][number][];
}): string {
  const seed = JSON.stringify({
    createdAt: input.createdAt,
    targetTaskId: input.targetTaskId,
    prNumber: input.prNumber,
    artifacts: input.inputArtifacts.map((artifact) => ({
      path: artifact.path,
      status: artifact.status,
      sha256: artifact.sha256,
    })),
    classifications: input.failureClassifications.map((classification) => ({
      failureClass: classification.failureClass,
      reasonCode: classification.reasonCode,
    })),
  });

  return `af014-${input.createdAt.replace(/\D/g, "").slice(0, 14)}-${sha256(seed).slice(0, 12)}`;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function createAgentFactoryCiRepairPlan(
  options: CreateAgentFactoryCiRepairPlanOptions = {},
): AgentFactoryCiRepairPlan {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const internalInputs = INPUT_ARTIFACTS.map((artifact) => readInputArtifact(artifactDir, artifact));
  const inputArtifacts = internalInputs.map((entry) => entry.artifact);
  const ciRecords = collectCiMetadataRecords(internalInputs);
  const failureClassifications = dedupeClassifications(
    ciRecords
      .map(classifyCiRecord)
      .filter((entry): entry is FailureClassificationDraft => Boolean(entry)),
  );
  const createdAt = (options.now ?? new Date()).toISOString();
  const approvalGate = normalizeApprovalGate(options.approvalGate);
  const maxSuggestedFiles = normalizePositiveInteger(options.maxSuggestedFiles, 8);
  const maxSuggestedPatchBytes = normalizePositiveInteger(options.maxSuggestedPatchBytes, 60000);
  const invalidMaxSuggestedFiles = hasInvalidExplicitPositiveInteger(options.maxSuggestedFiles);
  const invalidMaxSuggestedPatchBytes = hasInvalidExplicitPositiveInteger(options.maxSuggestedPatchBytes);
  const targetTaskId = safeNullableText(options.taskId) ?? defaultTaskId(inputArtifacts);
  const prNumber = normalizePositiveNumber(options.prNumber) ?? defaultPrNumber(inputArtifacts);
  const blockedReasons = [
    ...inputArtifacts
      .filter((artifact) => artifact.status === "invalid")
      .map((artifact) =>
        artifact.metadata.reason === "unsafe_or_invalid_input"
          ? `Unsafe local CI artifact or invalid local artifact: ${artifact.label} at ${artifact.path}.`
          : `Invalid local artifact: ${artifact.label} at ${artifact.path}.`,
      ),
  ];

  if (approvalGate === "missing") {
    blockedReasons.push("Human approval gate is missing for the AF014 CI repair boundary.");
  }

  if (approvalGate === "failed_closed") {
    blockedReasons.push("Human approval gate failed closed; no AF014 CI repair boundary may continue.");
  }

  if (invalidMaxSuggestedFiles) {
    blockedReasons.push("CI repair boundary max suggested files must be greater than zero.");
  }

  if (invalidMaxSuggestedPatchBytes) {
    blockedReasons.push("CI repair boundary max suggested patch bytes must be greater than zero.");
  }

  const status: AgentFactoryCiRepairStatus = blockedReasons.length > 0 ? "blocked" : "planned";
  const target: AgentFactoryCiRepairPlan["target"] = {
    prNumber,
    headSha: safeNullableText(options.headSha),
    branchName: safeNullableText(options.branchName) ?? defaultBranchName(inputArtifacts),
    baseBranch: safeText(options.baseBranch, defaultBaseBranch(inputArtifacts)),
    taskId: targetTaskId,
  };
  const plan: AgentFactoryCiRepairPlan = {
    version: AGENT_FACTORY_CI_REPAIR_VERSION,
    planId: options.planId ?? createPlanId({
      createdAt,
      targetTaskId,
      prNumber,
      inputArtifacts,
      failureClassifications,
    }),
    createdAt,
    status,
    reportOnly: true,
    dryRun: true,
    source: {
      script: "agent-factory-ci-repair",
      repository: safeNullableText(options.repository),
      actor: safeNullableText(options.actor),
      workflowName: safeNullableText(options.workflowName),
      workflowRunId: safeNullableText(options.workflowRunId),
    },
    target,
    inputArtifacts,
    ciState: ciStateFor(ciRecords, failureClassifications),
    failureClassifications,
    repairBoundary: {
      metadataOnlyPlan: true,
      requiresHumanApproval: true,
      approvalGate,
      willMutateWithoutApproval: false,
      maxSuggestedFiles,
      maxSuggestedPatchBytes,
      allowedPathPrefixes: normalizeStringList(
        options.allowedPathPrefixes,
        DEFAULT_ALLOWED_PATH_PREFIXES,
      ),
      forbiddenPathPrefixes: normalizeStringList(
        options.forbiddenPathPrefixes,
        DEFAULT_FORBIDDEN_PATH_PREFIXES,
      ),
    },
    actions: {
      willRunCodex: false,
      willRunShellCommands: false,
      willApplyPatch: false,
      willEditWorkingTree: false,
      willCreateBranch: false,
      willCreateCommit: false,
      willPush: false,
      willCreateOrUpdatePr: false,
      willRerunWorkflow: false,
      willMergeOrRebase: false,
    },
    proposedRepairSteps: proposedRepairStepsFor(failureClassifications, status, approvalGate),
    nextHumanStep: {
      label: safeText(
        options.nextHumanStepLabel,
        "Review this AF014 CI repair plan before any future repair execution work.",
      ),
      inertCommandPreview: safeNullableText(
        options.inertCommandPreview ??
          "npm.cmd run agent-factory:ci-repair -- --artifact-dir .agent-factory --stdout markdown",
      ),
      instructions: normalizeInstructionList(options.instructions, [
        "Review CI failure classifications, local artifact hashes, and repair boundary limits.",
        "Do not execute repair steps, rerun workflows, create commits, push, update PRs, run Codex, run shell repair commands, or apply patches from this plan.",
        "Future repair execution requires a separate approved layer and must preserve AF009 and AF013C approval gates.",
      ]),
    },
    blockedReasons,
    blockedReasonCodes: blockedCodesForReasons(blockedReasons),
    dataBoundary: {
      metadataOnly: true,
      omittedRawPayloads: true,
      hashesOnlyForPayloads: true,
    },
    guardrails: [...GUARDRAILS],
    artifacts: [...OUTPUT_ARTIFACTS],
  };

  assertAgentFactoryCiRepairPlanSafe(plan);
  return plan;
}

export function buildAgentFactoryCiRepairMarkdown(plan: AgentFactoryCiRepairPlan): string {
  assertAgentFactoryCiRepairPlanSafe(plan);

  const artifactLines = plan.inputArtifacts.map((artifact) => {
    const metadata = Object.entries(artifact.metadata)
      .map(([key, value]) => `${key}=${value ?? "unknown"}`)
      .join(", ");
    const suffix = metadata ? ` (${metadata})` : "";
    return `- ${artifact.label}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}${suffix}`;
  });
  const classificationLines = plan.failureClassifications.map((classification) =>
    `- ${classification.failureClass}: ${classification.reasonCode}, confidence=${classification.confidence}, workflow=${classification.workflowName ?? "none"}, job=${classification.jobName ?? "none"}, step=${classification.stepName ?? "none"}`,
  );
  const actionLines = Object.entries(plan.actions).map(([key, value]) =>
    `- ${key}: ${value ? "yes" : "no"}`,
  );
  const stepLines = plan.proposedRepairSteps.map((step) =>
    `- ${step.repairClass}: ${step.status}, requiresApproval=${step.requiresApproval ? "yes" : "no"}, approved=${step.approved ? "yes" : "no"}`,
  );

  const markdown = [
    "# AF014 CI Repair Loop",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Plan id: ${plan.planId}`,
    `Created at: ${plan.createdAt}`,
    "",
    "## Target",
    "",
    `- PR number: ${plan.target.prNumber ?? "none"}`,
    `- Head SHA: ${plan.target.headSha ?? "none"}`,
    `- Branch: ${plan.target.branchName ?? "none"}`,
    `- Base branch: ${plan.target.baseBranch}`,
    `- Task id: ${plan.target.taskId ?? "none"}`,
    "",
    "## Input Artifacts",
    "",
    ...artifactLines,
    "",
    "## CI State",
    "",
    `- Latest conclusion: ${plan.ciState.latestConclusion}`,
    `- Failing workflows: ${plan.ciState.failingWorkflowCount}`,
    `- Failing jobs: ${plan.ciState.failingJobCount}`,
    `- Failing steps: ${plan.ciState.failingStepCount}`,
    `- Observed workflows: ${plan.ciState.observedWorkflowNames.join(", ") || "none"}`,
    `- Observed failure classes: ${plan.ciState.observedFailureClasses.join(", ") || "none"}`,
    "",
    "## Failure Classifications",
    "",
    ...formatList(classificationLines.map((line) => line.slice(2))),
    "",
    "## Repair Boundary",
    "",
    `- Metadata-only plan: ${plan.repairBoundary.metadataOnlyPlan ? "yes" : "no"}`,
    `- Requires human approval: ${plan.repairBoundary.requiresHumanApproval ? "yes" : "no"}`,
    `- Approval gate: ${plan.repairBoundary.approvalGate}`,
    `- Will mutate without approval: ${plan.repairBoundary.willMutateWithoutApproval ? "yes" : "no"}`,
    `- Max suggested files: ${plan.repairBoundary.maxSuggestedFiles}`,
    `- Max suggested patch bytes: ${plan.repairBoundary.maxSuggestedPatchBytes}`,
    "- Allowed path prefixes:",
    ...formatList(plan.repairBoundary.allowedPathPrefixes),
    "- Forbidden path prefixes:",
    ...formatList(plan.repairBoundary.forbiddenPathPrefixes),
    "",
    "## Actions",
    "",
    ...actionLines,
    "",
    "## Proposed Repair Steps",
    "",
    ...formatList(stepLines.map((line) => line.slice(2))),
    "",
    "## Next Human Step",
    "",
    `- Label: ${plan.nextHumanStep.label}`,
    `- Inert command preview: ${plan.nextHumanStep.inertCommandPreview ?? "none"}`,
    "- Instructions:",
    ...formatList(plan.nextHumanStep.instructions),
    "",
    "## Blocked Reasons",
    "",
    ...formatList(plan.blockedReasons),
    "",
    "## Data Boundary",
    "",
    `- Metadata only: ${plan.dataBoundary.metadataOnly ? "yes" : "no"}`,
    `- Omitted raw payloads: ${plan.dataBoundary.omittedRawPayloads ? "yes" : "no"}`,
    `- Hashes only for payloads: ${plan.dataBoundary.hashesOnlyForPayloads ? "yes" : "no"}`,
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
  ].join("\n");

  assertAgentFactoryCiRepairTextSafe(markdown, "AF014 CI repair Markdown");
  return markdown;
}

export function buildAgentFactoryCiRepairSummary(plan: AgentFactoryCiRepairPlan): string {
  assertAgentFactoryCiRepairPlanSafe(plan);

  const summary = [
    "# AF014 CI Repair Loop",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Approval gate: ${plan.repairBoundary.approvalGate}`,
    `Latest conclusion: ${plan.ciState.latestConclusion}`,
    `Codex invoked: ${plan.actions.willRunCodex ? "yes" : "no"}`,
    `Shell commands run: ${plan.actions.willRunShellCommands ? "yes" : "no"}`,
    `Patches applied: ${plan.actions.willApplyPatch ? "yes" : "no"}`,
    `Working tree edited: ${plan.actions.willEditWorkingTree ? "yes" : "no"}`,
    `Workflow rerun: ${plan.actions.willRerunWorkflow ? "yes" : "no"}`,
    `Branch/commit/push/PR mutated: ${plan.actions.willCreateBranch || plan.actions.willCreateCommit || plan.actions.willPush || plan.actions.willCreateOrUpdatePr ? "yes" : "no"}`,
    `Merge or rebase: ${plan.actions.willMergeOrRebase ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    plan.nextHumanStep.label,
    "",
    "## Failure Classes",
    "",
    ...formatList(plan.ciState.observedFailureClasses),
    "",
    "## Proposed Repair Steps",
    "",
    ...plan.proposedRepairSteps.map((step) =>
      `- \`${step.repairClass}\`: ${step.status}, approved=${step.approved ? "yes" : "no"}`,
    ),
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertAgentFactoryCiRepairTextSafe(summary, "AF014 CI repair summary");
  return summary;
}

export function assertAgentFactoryCiRepairTextSafe(text: string, label: string): void {
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

export function assertAgentFactoryCiRepairPlanSafe(value: unknown): void {
  const root = asRecord(value);
  if (!root) throw new Error("AF014 CI repair plan must be a JSON object.");

  if (root.version !== AGENT_FACTORY_CI_REPAIR_VERSION) {
    throw new Error("AF014 CI repair plan version must be 1.");
  }
  if (root.reportOnly !== true) throw new Error("AF014 CI repair plan must be report-only.");
  if (root.dryRun !== true) throw new Error("AF014 CI repair plan must be dry-run.");
  if (root.status !== "planned" && root.status !== "blocked") {
    throw new Error("AF014 CI repair plan status must be planned or blocked.");
  }

  const source = asRecord(root.source);
  if (source?.script !== "agent-factory-ci-repair") {
    throw new Error("AF014 CI repair plan source script is invalid.");
  }

  const repairBoundary = asRecord(root.repairBoundary);
  if (repairBoundary?.metadataOnlyPlan !== true) {
    throw new Error("AF014 CI repair plan must be metadata-only.");
  }
  if (repairBoundary?.requiresHumanApproval !== true) {
    throw new Error("AF014 CI repair plan must require human approval.");
  }
  if (repairBoundary?.willMutateWithoutApproval !== false) {
    throw new Error("AF014 CI repair plan must not mutate without approval.");
  }
  if (
    repairBoundary?.approvalGate !== "not_requested" &&
    repairBoundary?.approvalGate !== "missing" &&
    repairBoundary?.approvalGate !== "approved" &&
    repairBoundary?.approvalGate !== "failed_closed"
  ) {
    throw new Error("AF014 CI repair plan approval gate is invalid.");
  }

  const dataBoundary = asRecord(root.dataBoundary);
  if (dataBoundary?.metadataOnly !== true) {
    throw new Error("AF014 CI repair plan must be metadata-only.");
  }
  if (dataBoundary?.omittedRawPayloads !== true) {
    throw new Error("AF014 CI repair plan must omit raw payloads.");
  }
  if (dataBoundary?.hashesOnlyForPayloads !== true) {
    throw new Error("AF014 CI repair plan must use hashes only for payloads.");
  }

  const actions = asRecord(root.actions);
  const actionKeys = [
    "willRunCodex",
    "willRunShellCommands",
    "willApplyPatch",
    "willEditWorkingTree",
    "willCreateBranch",
    "willCreateCommit",
    "willPush",
    "willCreateOrUpdatePr",
    "willRerunWorkflow",
    "willMergeOrRebase",
  ] as const;
  for (const key of actionKeys) {
    if (actions?.[key] !== false) {
      throw new Error(`AF014 CI repair plan action ${key} must be false.`);
    }
  }

  const classifications = Array.isArray(root.failureClassifications)
    ? root.failureClassifications
    : [];
  for (const entry of classifications) {
    const classification = asRecord(entry);
    if (
      classification?.failureClass !== "pr_contract" &&
      classification?.failureClass !== "typecheck" &&
      classification?.failureClass !== "lint" &&
      classification?.failureClass !== "focused_tests" &&
      classification?.failureClass !== "full_tests" &&
      classification?.failureClass !== "build" &&
      classification?.failureClass !== "learner_loop" &&
      classification?.failureClass !== "risk_gate" &&
      classification?.failureClass !== "runtime_gate" &&
      classification?.failureClass !== "closed_beta_readiness" &&
      classification?.failureClass !== "workflow_infra" &&
      classification?.failureClass !== "unknown"
    ) {
      throw new Error("AF014 CI repair classification failure class is invalid.");
    }
    if (
      classification?.confidence !== "low" &&
      classification?.confidence !== "medium" &&
      classification?.confidence !== "high"
    ) {
      throw new Error("AF014 CI repair classification confidence is invalid.");
    }
  }

  const steps = Array.isArray(root.proposedRepairSteps) ? root.proposedRepairSteps : [];
  for (const entry of steps) {
    const step = asRecord(entry);
    if (step?.requiresApproval !== true) {
      throw new Error("AF014 proposed repair step must require approval.");
    }
    if (step?.approved !== false) {
      throw new Error("AF014 proposed repair step must not be approved for execution in v1.");
    }
    if (
      step?.status !== "planned" &&
      step?.status !== "blocked" &&
      step?.status !== "not_requested"
    ) {
      throw new Error("AF014 proposed repair step status is invalid.");
    }
  }

  const seen = new Set<unknown>();
  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF014 CI repair plan contains a secret-like value at ${currentPath}.`);
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
      const forbidden = FORBIDDEN_PLAN_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`AF014 CI repair plan contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
