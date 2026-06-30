import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_PATCH_ARTIFACT_VERSION = 1;

export type AgentFactoryPatchArtifactStatus = "planned" | "blocked";

export type AgentFactoryPatchArtifactApprovalGate =
  | "not_requested"
  | "missing"
  | "approved"
  | "failed_closed";

export interface AgentFactoryPatchArtifactPlan {
  version: 1;
  planId: string;
  createdAt: string;
  status: AgentFactoryPatchArtifactStatus;
  reportOnly: true;
  dryRun: true;
  source: {
    script: "agent-factory-patch-artifact";
    repository: string | null;
    actor: string | null;
    workflowName: string | null;
    workflowRunId: string | null;
  };
  target: {
    taskId: string | null;
    prNumber: number | null;
    baseBranch: string;
    proposedBranchName: string | null;
  };
  inputArtifacts: Array<{
    label: string;
    path: string;
    status: "available" | "missing" | "invalid";
    sha256: string | null;
    metadata: Record<string, string | number | boolean | null>;
  }>;
  patchBoundary: {
    patchArtifactOnly: true;
    patchAppliedToWorkingTree: false;
    isolatedWorkspaceRequired: true;
    proposedWorkspacePath: string | null;
    allowedPathPrefixes: string[];
    forbiddenPathPrefixes: string[];
    maxChangedFiles: number;
    maxPatchBytes: number;
    requiresHumanApproval: true;
    approvalGate: AgentFactoryPatchArtifactApprovalGate;
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
  proposedPatchArtifacts: Array<{
    path: string;
    status: "planned" | "not_created";
    sha256: string | null;
    lineCount: number | null;
    byteCount: number | null;
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

export interface CreateAgentFactoryPatchArtifactPlanOptions {
  artifactDir?: string;
  now?: Date;
  planId?: string;
  repository?: string | null;
  actor?: string | null;
  workflowName?: string | null;
  workflowRunId?: string | number | null;
  taskId?: string | null;
  prNumber?: number | string | null;
  baseBranch?: string | null;
  proposedBranchName?: string | null;
  proposedWorkspacePath?: string | null;
  allowedPathPrefixes?: readonly string[];
  forbiddenPathPrefixes?: readonly string[];
  maxChangedFiles?: number | string | null;
  maxPatchBytes?: number | string | null;
  approvalGate?: AgentFactoryPatchArtifactApprovalGate | null;
  proposedPatchArtifactPaths?: readonly string[];
  nextHumanStepLabel?: string | null;
  inertCommandPreview?: string | null;
  instructions?: readonly string[];
}

const INPUT_ARTIFACTS = [
  {
    id: "task-packages",
    label: "AF001 task packages",
    fileName: "codex-task-packages.json",
  },
  {
    id: "codex-invocation",
    label: "AF010 Codex invocation plan",
    fileName: "codex-invocation-plan.json",
  },
  {
    id: "orchestrator-plan",
    label: "AF012 orchestrator plan",
    fileName: "factory-orchestrator-plan.json",
  },
  {
    id: "planner-note",
    label: "AF013A planner note",
    fileName: "factory-planner-note.json",
  },
  {
    id: "run-history",
    label: "AF011 run history",
    fileName: "run-history.jsonl",
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

const DEFAULT_PROPOSED_PATCH_ARTIFACT_FILE_NAMES = [
  "patch-artifact-review.patch",
  "patch-artifact-review.diff",
  "patch-artifact-review.md",
] as const;

const OUTPUT_ARTIFACTS = [
  ".agent-factory/patch-artifact-plan.json",
  ".agent-factory/patch-artifact-plan.md",
  ".agent-factory/agent-factory-patch-artifact-summary.md",
] as const;

const GUARDRAILS = [
  "AF013B v1 is report-only and never invokes Codex.",
  "AF013B v1 never applies patches, edits source files, creates branches, commits, pushes, PRs, workflow reruns, merges, or rebases.",
  "AF013B v1 never calls learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs.",
  "AF013B v1 records patch-review artifact metadata only; raw patch, diff, prompt, task-package, PR-body, and comment payloads are omitted.",
  "AF013B v1 requires an isolated workspace boundary and a separate human approval gate before any future patch application work.",
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
  /^\s*["']?(?:raw[_\-\s]?patch|raw[_\-\s]?diff|patch[_\-\s]?body|diff[_\-\s]?body|source[_\-\s]?patch|source[_\-\s]?diff)["']?\s*[:=]/i,
] as const;

const FORBIDDEN_PLAN_KEY_PATTERNS = [
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
  /comment.*body/i,
  /raw.*patch/i,
  /raw.*diff/i,
  /patch.*body/i,
  /diff.*body/i,
] as const;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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

function normalizePrNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function normalizeApprovalGate(
  value: AgentFactoryPatchArtifactApprovalGate | null | undefined,
): AgentFactoryPatchArtifactApprovalGate {
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
    throw new Error(`Unsafe AF013B artifact path: ${fileName}`);
  }

  return resolvedFile;
}

function isInsidePath(filePath: string, directoryPath: string): boolean {
  const resolvedFile = path.resolve(process.cwd(), filePath);
  const resolvedDir = path.resolve(process.cwd(), directoryPath);

  return resolvedFile === resolvedDir || resolvedFile.startsWith(`${resolvedDir}${path.sep}`);
}

function taskPackageMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};

  const packages = asArray(root.packages).map(asRecord).filter(Boolean);
  const first = packages[0] ?? null;
  const selectedItemIds = asArray(root.selectedItemIds);
  const validationCommands = asArray(first?.validationCommands);

  return {
    selectedTaskCount: safeNumber(root.selectedTaskCount) ?? packages.length,
    packageCount: packages.length,
    firstItemId: safeText(first?.itemId ?? selectedItemIds[0], "none"),
    firstRepository: safeText(first?.repository, "unknown"),
    proposedBranchName: safeText(first?.branchName, "unknown"),
    validationCommandCount: validationCommands.length,
    hasPromptField: typeof first?.codexPrompt === "string" || typeof first?.prompt === "string",
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
    promptSha256: safeText(taskPackage?.promptSha256, "none"),
    promptCharCount: safeNumber(taskPackage?.promptCharCount),
  };
}

function orchestratorMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const nextAction = asRecord(root.nextAction);
  const dataBoundary = asRecord(root.dataBoundary);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    nextActionCode: safeText(nextAction?.code, "none"),
    willExecuteCommands: safeBoolean(root.willExecuteCommands),
    codexWillBeInvoked: safeBoolean(root.codexWillBeInvoked),
    inspectedArtifactCount: safeNumber(dataBoundary?.inspectedArtifactCount),
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
    proposedBranchName: safeText(target?.proposedBranchName, "none"),
    proposedWorkspacePath: safeText(boundary?.proposedWorkspacePath, "none"),
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    maxChangedFiles: safeNumber(boundary?.maxChangedFiles),
    maxDiffBytes: safeNumber(boundary?.maxDiffBytes),
  };
}

function runHistoryMetadata(text: string): Record<string, string | number | boolean | null> {
  const lines = normalizeNewlines(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const records = lines.map((line) => JSON.parse(line) as unknown);
  const latest = asRecord(records.at(-1));
  const target = asRecord(latest?.target);

  return {
    recordCount: records.length,
    latestSource: safeText(latest?.source, "none"),
    latestStatus: safeText(latest?.status, "none"),
    latestDryRun: safeBoolean(latest?.dryRun),
    latestTaskId: safeText(target?.taskId, "none"),
    latestPrNumber: safeNumber(target?.prNumber),
  };
}

function metadataForArtifact(artifactId: string, text: string): Record<string, string | number | boolean | null> {
  if (artifactId === "run-history") return runHistoryMetadata(text);

  const data = JSON.parse(text);

  if (artifactId === "task-packages") return taskPackageMetadata(data);
  if (artifactId === "codex-invocation") return codexInvocationMetadata(data);
  if (artifactId === "orchestrator-plan") return orchestratorMetadata(data);
  if (artifactId === "planner-note") return plannerNoteMetadata(data);

  return {};
}

function readInputArtifact(
  artifactDir: string,
  artifact: (typeof INPUT_ARTIFACTS)[number],
): AgentFactoryPatchArtifactPlan["inputArtifacts"][number] {
  const fullPath = artifactPath(artifactDir, artifact.fileName);
  const relative = normalizePathForArtifact(path.relative(process.cwd(), fullPath));

  if (!fs.existsSync(fullPath)) {
    return {
      label: artifact.label,
      path: relative,
      status: "missing",
      sha256: null,
      metadata: {},
    };
  }

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return {
        label: artifact.label,
        path: relative,
        status: "invalid",
        sha256: null,
        metadata: {
          reason: "not_a_file",
        },
      };
    }

    const text = fs.readFileSync(fullPath, "utf8");
    return {
      label: artifact.label,
      path: relative,
      status: "available",
      sha256: sha256(text),
      metadata: metadataForArtifact(artifact.id, text),
    };
  } catch (error) {
    return {
      label: artifact.label,
      path: relative,
      status: "invalid",
      sha256: null,
      metadata: {
        reason: "parse_failed",
        message: safeText(error instanceof Error ? error.message : String(error), "invalid"),
      },
    };
  }
}

function metadataValue(
  artifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][],
  label: string,
  key: string,
): string | number | boolean | null {
  const artifact = artifacts.find((entry) => entry.label === label);
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

function defaultTaskId(
  artifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013A planner note", "taskId"),
    metadataValue(artifacts, "AF010 Codex invocation plan", "itemId"),
    metadataValue(artifacts, "AF001 task packages", "firstItemId"),
  ], ["none"]);
}

function defaultPrNumber(
  artifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][],
): number | null {
  const fromPlannerNote = metadataValue(artifacts, "AF013A planner note", "prNumber");
  if (typeof fromPlannerNote === "number" && Number.isInteger(fromPlannerNote) && fromPlannerNote > 0) {
    return fromPlannerNote;
  }

  const fromRunHistory = metadataValue(artifacts, "AF011 run history", "latestPrNumber");
  if (typeof fromRunHistory === "number" && Number.isInteger(fromRunHistory) && fromRunHistory > 0) {
    return fromRunHistory;
  }

  return null;
}

function defaultBaseBranch(
  artifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][],
): string {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013A planner note", "baseBranch"),
  ], ["none", "unknown"]) ?? "main";
}

function defaultBranchName(
  artifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013A planner note", "proposedBranchName"),
    metadataValue(artifacts, "AF001 task packages", "proposedBranchName"),
  ], ["none", "unknown"]);
}

function defaultWorkspacePath(
  artifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013A planner note", "proposedWorkspacePath"),
  ], ["none", "unknown"]);
}

function normalizeProposedPatchArtifactPaths(
  artifactDir: string,
  values: readonly string[] | undefined,
): string[] {
  const source = values && values.length > 0
    ? values
    : DEFAULT_PROPOSED_PATCH_ARTIFACT_FILE_NAMES.map((fileName) => path.join(artifactDir, fileName));
  const cleaned = source
    .map((value) => safeText(value, ""))
    .filter(Boolean)
    .map(normalizePathForArtifact);

  return [...new Set(cleaned)];
}

function inspectProposedPatchArtifact(filePath: string): AgentFactoryPatchArtifactPlan["proposedPatchArtifacts"][number] {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  const displayPath = normalizePathForArtifact(path.relative(process.cwd(), resolvedPath));

  if (!fs.existsSync(resolvedPath)) {
    return {
      path: displayPath,
      status: "not_created",
      sha256: null,
      lineCount: null,
      byteCount: null,
    };
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    return {
      path: displayPath,
      status: "not_created",
      sha256: null,
      lineCount: null,
      byteCount: null,
    };
  }

  const buffer = fs.readFileSync(resolvedPath);
  const text = buffer.toString("utf8");

  assertAgentFactoryPatchArtifactTextSafe(text, "AF013B proposed patch artifact text");

  return {
    path: displayPath,
    status: "planned",
    sha256: sha256(buffer),
    lineCount: text.length === 0 ? 0 : normalizeNewlines(text).split("\n").length,
    byteCount: buffer.byteLength,
  };
}

function notCreatedPatchArtifact(filePath: string): AgentFactoryPatchArtifactPlan["proposedPatchArtifacts"][number] {
  return {
    path: normalizePathForArtifact(path.relative(process.cwd(), path.resolve(process.cwd(), filePath))),
    status: "not_created",
    sha256: null,
    lineCount: null,
    byteCount: null,
  };
}

function proposedPatchArtifactBlockedReasons(input: {
  artifactDir: string;
  proposedPaths: readonly string[];
  proposedArtifacts: readonly AgentFactoryPatchArtifactPlan["proposedPatchArtifacts"][number][];
  maxPatchBytes: number;
}): string[] {
  const reasons: string[] = [];

  for (const proposedPath of input.proposedPaths) {
    if (!isInsidePath(proposedPath, input.artifactDir)) {
      reasons.push("Proposed patch artifact path must stay inside the local Agent Factory artifact directory.");
    }
  }

  for (const artifact of input.proposedArtifacts) {
    if (artifact.byteCount !== null && artifact.byteCount > input.maxPatchBytes) {
      reasons.push("Proposed patch artifact exceeds the maximum patch byte boundary.");
    }
  }

  return reasons;
}

function blockedCodesForReasons(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/invalid local artifact|could not be parsed|not a file/i.test(reason)) return "invalid_artifact";
    if (/approval gate is missing/i.test(reason)) return "missing_human_approval";
    if (/failed closed/i.test(reason)) return "approval_failed_closed";
    if (/max changed files|max patch bytes|maximum patch byte/i.test(reason)) return "invalid_patch_boundary_limit";
    if (/outside|inside the local Agent Factory artifact directory/i.test(reason)) return "proposed_patch_artifact_outside_boundary";
    if (/proposed patch artifact.*(?:unsafe|safety scan)|secret-like|raw-content/i.test(reason)) {
      return "unsafe_proposed_patch_artifact";
    }
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function createPlanId(input: {
  createdAt: string;
  targetTaskId: string | null;
  prNumber: number | null;
  inputArtifacts: readonly AgentFactoryPatchArtifactPlan["inputArtifacts"][number][];
  proposedPatchArtifacts: readonly AgentFactoryPatchArtifactPlan["proposedPatchArtifacts"][number][];
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
    proposedPatchArtifacts: input.proposedPatchArtifacts.map((artifact) => ({
      path: artifact.path,
      status: artifact.status,
      sha256: artifact.sha256,
      byteCount: artifact.byteCount,
    })),
  });

  return `af013b-${input.createdAt.replace(/\D/g, "").slice(0, 14)}-${sha256(seed).slice(0, 12)}`;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function createAgentFactoryPatchArtifactPlan(
  options: CreateAgentFactoryPatchArtifactPlanOptions = {},
): AgentFactoryPatchArtifactPlan {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const inputArtifacts = INPUT_ARTIFACTS.map((artifact) => readInputArtifact(artifactDir, artifact));
  const createdAt = (options.now ?? new Date()).toISOString();
  const approvalGate = normalizeApprovalGate(options.approvalGate);
  const maxChangedFiles = normalizePositiveInteger(options.maxChangedFiles, 8);
  const maxPatchBytes = normalizePositiveInteger(options.maxPatchBytes, 60000);
  const invalidMaxChangedFiles = hasInvalidExplicitPositiveInteger(options.maxChangedFiles);
  const invalidMaxPatchBytes = hasInvalidExplicitPositiveInteger(options.maxPatchBytes);
  const targetTaskId = safeNullableText(options.taskId) ?? defaultTaskId(inputArtifacts);
  const prNumber = normalizePrNumber(options.prNumber) ?? defaultPrNumber(inputArtifacts);
  const proposedBranchName = safeNullableText(options.proposedBranchName) ?? defaultBranchName(inputArtifacts);
  const proposedPatchArtifactPaths = normalizeProposedPatchArtifactPaths(
    artifactDir,
    options.proposedPatchArtifactPaths,
  );
  const proposedPatchArtifacts: AgentFactoryPatchArtifactPlan["proposedPatchArtifacts"] = [];
  const blockedReasons = [
    ...inputArtifacts
      .filter((artifact) => artifact.status === "invalid")
      .map((artifact) => `Invalid local artifact: ${artifact.label} at ${artifact.path}.`),
  ];

  for (const proposedPath of proposedPatchArtifactPaths) {
    if (!isInsidePath(proposedPath, artifactDir)) {
      proposedPatchArtifacts.push(notCreatedPatchArtifact(proposedPath));
      continue;
    }

    try {
      proposedPatchArtifacts.push(inspectProposedPatchArtifact(proposedPath));
    } catch {
      proposedPatchArtifacts.push(notCreatedPatchArtifact(proposedPath));
      blockedReasons.push("Proposed patch artifact failed the metadata-only safety scan.");
    }
  }

  if (approvalGate === "missing") {
    blockedReasons.push("Human approval gate is missing for any future patch artifact boundary.");
  }

  if (approvalGate === "failed_closed") {
    blockedReasons.push("Human approval gate failed closed; no future patch artifact boundary may continue.");
  }

  if (invalidMaxChangedFiles) {
    blockedReasons.push("Patch boundary max changed files must be greater than zero.");
  }

  if (invalidMaxPatchBytes) {
    blockedReasons.push("Patch boundary max patch bytes must be greater than zero.");
  }

  blockedReasons.push(
    ...proposedPatchArtifactBlockedReasons({
      artifactDir,
      proposedPaths: proposedPatchArtifactPaths,
      proposedArtifacts: proposedPatchArtifacts,
      maxPatchBytes,
    }),
  );

  const plan: AgentFactoryPatchArtifactPlan = {
    version: AGENT_FACTORY_PATCH_ARTIFACT_VERSION,
    planId: options.planId ?? createPlanId({
      createdAt,
      targetTaskId,
      prNumber,
      inputArtifacts,
      proposedPatchArtifacts,
    }),
    createdAt,
    status: blockedReasons.length > 0 ? "blocked" : "planned",
    reportOnly: true,
    dryRun: true,
    source: {
      script: "agent-factory-patch-artifact",
      repository: safeNullableText(options.repository),
      actor: safeNullableText(options.actor),
      workflowName: safeNullableText(options.workflowName),
      workflowRunId: safeNullableText(options.workflowRunId),
    },
    target: {
      taskId: targetTaskId,
      prNumber,
      baseBranch: safeText(options.baseBranch, defaultBaseBranch(inputArtifacts)),
      proposedBranchName,
    },
    inputArtifacts,
    patchBoundary: {
      patchArtifactOnly: true,
      patchAppliedToWorkingTree: false,
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: safeNullableText(options.proposedWorkspacePath) ?? defaultWorkspacePath(inputArtifacts),
      allowedPathPrefixes: normalizeStringList(
        options.allowedPathPrefixes,
        DEFAULT_ALLOWED_PATH_PREFIXES,
      ),
      forbiddenPathPrefixes: normalizeStringList(
        options.forbiddenPathPrefixes,
        DEFAULT_FORBIDDEN_PATH_PREFIXES,
      ),
      maxChangedFiles,
      maxPatchBytes,
      requiresHumanApproval: true,
      approvalGate,
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
    proposedPatchArtifacts,
    nextHumanStep: {
      label: safeText(
        options.nextHumanStepLabel,
        "Review this AF013B patch artifact plan before any future patch application work.",
      ),
      inertCommandPreview: safeNullableText(
        options.inertCommandPreview ??
          "npm.cmd run agent-factory:patch-artifact -- --artifact-dir .agent-factory --stdout markdown",
      ),
      instructions: normalizeInstructionList(options.instructions, [
        "Review input artifact statuses, patch boundary limits, and proposed patch artifact hashes.",
        "Do not apply a patch from this plan; future patch application requires a separate approved issue.",
        "If any artifact is invalid or the approval gate failed closed, stop and repair metadata only.",
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

  assertAgentFactoryPatchArtifactPlanSafe(plan);
  return plan;
}

export function buildAgentFactoryPatchArtifactMarkdown(plan: AgentFactoryPatchArtifactPlan): string {
  assertAgentFactoryPatchArtifactPlanSafe(plan);

  const artifactLines = plan.inputArtifacts.map((artifact) => {
    const metadata = Object.entries(artifact.metadata)
      .map(([key, value]) => `${key}=${value ?? "unknown"}`)
      .join(", ");
    const suffix = metadata ? ` (${metadata})` : "";
    return `- ${artifact.label}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}${suffix}`;
  });
  const actionLines = Object.entries(plan.actions).map(([key, value]) =>
    `- ${key}: ${value ? "yes" : "no"}`,
  );
  const proposedArtifactLines = plan.proposedPatchArtifacts.map((artifact) =>
    `- ${artifact.path}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}, lines=${artifact.lineCount ?? "n/a"}, bytes=${artifact.byteCount ?? "n/a"}`,
  );

  const markdown = [
    "# AF013B Patch Artifact Adapter",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Plan id: ${plan.planId}`,
    `Created at: ${plan.createdAt}`,
    "",
    "## Target",
    "",
    `- Task id: ${plan.target.taskId ?? "none"}`,
    `- PR number: ${plan.target.prNumber ?? "none"}`,
    `- Base branch: ${plan.target.baseBranch}`,
    `- Proposed branch: ${plan.target.proposedBranchName ?? "none"}`,
    "",
    "## Input Artifacts",
    "",
    ...artifactLines,
    "",
    "## Patch Boundary",
    "",
    `- Patch artifact only: ${plan.patchBoundary.patchArtifactOnly ? "yes" : "no"}`,
    `- Patch applied to working tree: ${plan.patchBoundary.patchAppliedToWorkingTree ? "yes" : "no"}`,
    `- Isolated workspace required: ${plan.patchBoundary.isolatedWorkspaceRequired ? "yes" : "no"}`,
    `- Proposed workspace: ${plan.patchBoundary.proposedWorkspacePath ?? "none"}`,
    `- Max changed files: ${plan.patchBoundary.maxChangedFiles}`,
    `- Max patch bytes: ${plan.patchBoundary.maxPatchBytes}`,
    `- Requires human approval: ${plan.patchBoundary.requiresHumanApproval ? "yes" : "no"}`,
    `- Approval gate: ${plan.patchBoundary.approvalGate}`,
    "- Allowed path prefixes:",
    ...formatList(plan.patchBoundary.allowedPathPrefixes),
    "- Forbidden path prefixes:",
    ...formatList(plan.patchBoundary.forbiddenPathPrefixes),
    "",
    "## Actions",
    "",
    ...actionLines,
    "",
    "## Proposed Patch Artifacts",
    "",
    ...formatList(proposedArtifactLines.map((line) => line.slice(2))),
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

  assertAgentFactoryPatchArtifactTextSafe(markdown, "AF013B patch-artifact Markdown");
  return markdown;
}

export function buildAgentFactoryPatchArtifactSummary(plan: AgentFactoryPatchArtifactPlan): string {
  assertAgentFactoryPatchArtifactPlanSafe(plan);

  const summary = [
    "# AF013B Patch Artifact Adapter",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Patches applied: ${plan.actions.willApplyPatch ? "yes" : "no"}`,
    `Working tree edited: ${plan.actions.willEditWorkingTree ? "yes" : "no"}`,
    `GitHub mutated: ${plan.actions.willCreateOrUpdatePr ? "yes" : "no"}`,
    `Approval gate: ${plan.patchBoundary.approvalGate}`,
    "",
    "## Result",
    "",
    plan.nextHumanStep.label,
    "",
    "## Proposed Patch Artifacts",
    "",
    ...plan.proposedPatchArtifacts.map((artifact) =>
      `- \`${artifact.path}\`: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}`,
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

  assertAgentFactoryPatchArtifactTextSafe(summary, "AF013B patch-artifact summary");
  return summary;
}

export function assertAgentFactoryPatchArtifactTextSafe(text: string, label: string): void {
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

export function assertAgentFactoryPatchArtifactPlanSafe(value: unknown): void {
  const root = asRecord(value);
  if (!root) throw new Error("AF013B patch artifact plan must be a JSON object.");

  if (root.version !== AGENT_FACTORY_PATCH_ARTIFACT_VERSION) {
    throw new Error("AF013B patch artifact plan version must be 1.");
  }
  if (root.reportOnly !== true) throw new Error("AF013B patch artifact plan must be report-only.");
  if (root.dryRun !== true) throw new Error("AF013B patch artifact plan must be dry-run.");
  if (root.status !== "planned" && root.status !== "blocked") {
    throw new Error("AF013B patch artifact plan status must be planned or blocked.");
  }

  const source = asRecord(root.source);
  if (source?.script !== "agent-factory-patch-artifact") {
    throw new Error("AF013B patch artifact plan source script is invalid.");
  }

  const patchBoundary = asRecord(root.patchBoundary);
  if (patchBoundary?.patchArtifactOnly !== true) {
    throw new Error("AF013B patch artifact plan must be patch-artifact only.");
  }
  if (patchBoundary?.patchAppliedToWorkingTree !== false) {
    throw new Error("AF013B patch artifact plan must not apply patches to the working tree.");
  }
  if (patchBoundary?.isolatedWorkspaceRequired !== true) {
    throw new Error("AF013B patch artifact plan must require an isolated workspace.");
  }
  if (patchBoundary?.requiresHumanApproval !== true) {
    throw new Error("AF013B patch artifact plan must require human approval.");
  }
  if (
    patchBoundary?.approvalGate !== "not_requested" &&
    patchBoundary?.approvalGate !== "missing" &&
    patchBoundary?.approvalGate !== "approved" &&
    patchBoundary?.approvalGate !== "failed_closed"
  ) {
    throw new Error("AF013B patch artifact plan approval gate is invalid.");
  }

  const dataBoundary = asRecord(root.dataBoundary);
  if (dataBoundary?.metadataOnly !== true) {
    throw new Error("AF013B patch artifact plan must be metadata-only.");
  }
  if (dataBoundary?.omittedRawPayloads !== true) {
    throw new Error("AF013B patch artifact plan must omit raw payloads.");
  }
  if (dataBoundary?.hashesOnlyForPayloads !== true) {
    throw new Error("AF013B patch artifact plan must use hashes only for payloads.");
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
      throw new Error(`AF013B patch artifact plan action ${key} must be false.`);
    }
  }

  const seen = new Set<unknown>();
  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF013B patch artifact plan contains a secret-like value at ${currentPath}.`);
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
        throw new Error(`AF013B patch artifact plan contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
