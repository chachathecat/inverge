import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_BRANCH_COMMIT_PR_VERSION = 1;

export type AgentFactoryBranchCommitPrStatus = "planned" | "blocked";

export type AgentFactoryBranchCommitPrApprovalGate =
  | "not_requested"
  | "missing"
  | "approved"
  | "failed_closed";

export type AgentFactoryBranchCommitPrMutationClass =
  | "none"
  | "branch_only"
  | "commit_only"
  | "pr_metadata_only"
  | "branch_commit_pr";

export interface AgentFactoryBranchCommitPrPlan {
  version: 1;
  planId: string;
  createdAt: string;
  status: AgentFactoryBranchCommitPrStatus;
  reportOnly: true;
  dryRun: true;
  source: {
    script: "agent-factory-branch-commit-pr";
    repository: string | null;
    actor: string | null;
    workflowName: string | null;
    workflowRunId: string | null;
  };
  target: {
    taskId: string | null;
    issueNumber: number | null;
    prNumber: number | null;
    baseBranch: string;
    proposedBranchName: string | null;
    proposedCommitTitle: string | null;
    proposedPrTitle: string | null;
  };
  inputArtifacts: Array<{
    label: string;
    path: string;
    status: "available" | "missing" | "invalid";
    sha256: string | null;
    metadata: Record<string, string | number | boolean | null>;
  }>;
  mutationBoundary: {
    metadataOnlyPlan: true;
    requiresHumanApproval: true;
    approvalGate: AgentFactoryBranchCommitPrApprovalGate;
    requestedMutationClass: AgentFactoryBranchCommitPrMutationClass;
    approvedMutationClasses: string[];
    willMutateWithoutApproval: false;
    maxChangedFiles: number;
    maxPatchBytes: number;
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
  proposedGitHubOperations: Array<{
    operation:
      | "create_branch"
      | "create_commit"
      | "push_branch"
      | "create_pr"
      | "update_pr_body"
      | "request_review"
      | "none";
    status: "planned" | "blocked" | "not_requested";
    requiresApproval: true;
    approved: false;
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

export interface CreateAgentFactoryBranchCommitPrPlanOptions {
  artifactDir?: string;
  now?: Date;
  planId?: string;
  repository?: string | null;
  actor?: string | null;
  workflowName?: string | null;
  workflowRunId?: string | number | null;
  taskId?: string | null;
  issueNumber?: number | string | null;
  prNumber?: number | string | null;
  baseBranch?: string | null;
  proposedBranchName?: string | null;
  proposedCommitTitle?: string | null;
  proposedPrTitle?: string | null;
  allowedPathPrefixes?: readonly string[];
  forbiddenPathPrefixes?: readonly string[];
  maxChangedFiles?: number | string | null;
  maxPatchBytes?: number | string | null;
  approvalGate?: AgentFactoryBranchCommitPrApprovalGate | null;
  requestedMutationClass?: AgentFactoryBranchCommitPrMutationClass | null;
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
    id: "planner-note",
    label: "AF013A planner note",
    fileName: "factory-planner-note.json",
  },
  {
    id: "patch-artifact-plan",
    label: "AF013B patch artifact plan",
    fileName: "factory-patch-artifact-plan.json",
  },
  {
    id: "orchestrator-plan",
    label: "AF012 orchestrator plan",
    fileName: "factory-orchestrator-plan.json",
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

const OUTPUT_ARTIFACTS = [
  ".agent-factory/branch-commit-pr-plan.json",
  ".agent-factory/branch-commit-pr-plan.md",
  ".agent-factory/agent-factory-branch-commit-pr-summary.md",
] as const;

const GUARDRAILS = [
  "AF013C v1 is metadata-only and report-only.",
  "AF013C v1 never invokes Codex, runs shell commands, applies patches, edits source files, or edits the working tree.",
  "AF013C v1 never creates branches, commits, pushes, pull requests, review requests, workflow reruns, merges, or rebases.",
  "AF013C v1 never calls learner runtime, OCR, provider, billing, auth, production, instructor, academy, or payment APIs.",
  "AF013C v1 records branch, commit, and PR operation previews as metadata only; raw PR bodies, comments, patches, diffs, task-package prompts, and learner payloads are omitted.",
  "AF013C v1 fails closed unless required upstream artifacts exist and any requested mutation class has an approved human gate.",
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
  value: AgentFactoryBranchCommitPrApprovalGate | null | undefined,
): AgentFactoryBranchCommitPrApprovalGate {
  if (value === "missing" || value === "approved" || value === "failed_closed") return value;
  return "not_requested";
}

function normalizeMutationClass(
  value: AgentFactoryBranchCommitPrMutationClass | null | undefined,
): AgentFactoryBranchCommitPrMutationClass {
  if (
    value === "branch_only" ||
    value === "commit_only" ||
    value === "pr_metadata_only" ||
    value === "branch_commit_pr"
  ) {
    return value;
  }
  return "none";
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
    throw new Error(`Unsafe AF013C artifact path: ${fileName}`);
  }

  return resolvedFile;
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
    firstItemTitle: safeText(first?.itemTitle ?? first?.title, "none"),
    firstRepository: safeText(first?.repository, "unknown"),
    proposedBranchName: safeText(first?.branchName, "unknown"),
    issueNumber: safeNumber(first?.issueNumber),
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
    itemTitle: safeText(packageSummary?.itemTitle, "none"),
    promptSha256: safeText(taskPackage?.promptSha256, "none"),
    promptCharCount: safeNumber(taskPackage?.promptCharCount),
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
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    maxChangedFiles: safeNumber(boundary?.maxChangedFiles),
    maxDiffBytes: safeNumber(boundary?.maxDiffBytes),
  };
}

function patchArtifactPlanMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const target = asRecord(root.target);
  const patchBoundary = asRecord(root.patchBoundary);
  const proposedPatchArtifacts = asArray(root.proposedPatchArtifacts);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    taskId: safeText(target?.taskId, "none"),
    prNumber: safeNumber(target?.prNumber),
    baseBranch: safeText(target?.baseBranch, "main"),
    proposedBranchName: safeText(target?.proposedBranchName, "none"),
    approvalGate: safeText(patchBoundary?.approvalGate, "not_requested"),
    maxChangedFiles: safeNumber(patchBoundary?.maxChangedFiles),
    maxPatchBytes: safeNumber(patchBoundary?.maxPatchBytes),
    proposedPatchArtifactCount: proposedPatchArtifacts.length,
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
  if (artifactId === "planner-note") return plannerNoteMetadata(data);
  if (artifactId === "patch-artifact-plan") return patchArtifactPlanMetadata(data);
  if (artifactId === "orchestrator-plan") return orchestratorMetadata(data);

  return {};
}

function readInputArtifact(
  artifactDir: string,
  artifact: (typeof INPUT_ARTIFACTS)[number],
): AgentFactoryBranchCommitPrPlan["inputArtifacts"][number] {
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
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
  label: string,
  key: string,
): string | number | boolean | null {
  const artifact = artifacts.find((entry) => entry.label === label);
  return artifact?.metadata[key] ?? null;
}

function artifactByLabel(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
  label: string,
): AgentFactoryBranchCommitPrPlan["inputArtifacts"][number] | null {
  return artifacts.find((entry) => entry.label === label) ?? null;
}

function firstMeaningfulString(values: readonly unknown[], ignored: readonly string[] = []): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text && !ignored.includes(text)) return text;
  }
  return null;
}

function firstMeaningfulNumber(values: readonly unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

function defaultTaskId(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013B patch artifact plan", "taskId"),
    metadataValue(artifacts, "AF013A planner note", "taskId"),
    metadataValue(artifacts, "AF010 Codex invocation plan", "itemId"),
    metadataValue(artifacts, "AF001 task packages", "firstItemId"),
  ], ["none"]);
}

function defaultIssueNumber(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): number | null {
  return firstMeaningfulNumber([
    metadataValue(artifacts, "AF001 task packages", "issueNumber"),
  ]);
}

function defaultPrNumber(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): number | null {
  return firstMeaningfulNumber([
    metadataValue(artifacts, "AF013B patch artifact plan", "prNumber"),
    metadataValue(artifacts, "AF013A planner note", "prNumber"),
    metadataValue(artifacts, "AF011 run history", "latestPrNumber"),
  ]);
}

function defaultBaseBranch(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): string {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013B patch artifact plan", "baseBranch"),
    metadataValue(artifacts, "AF013A planner note", "baseBranch"),
  ], ["none", "unknown"]) ?? "main";
}

function defaultBranchName(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF013B patch artifact plan", "proposedBranchName"),
    metadataValue(artifacts, "AF013A planner note", "proposedBranchName"),
    metadataValue(artifacts, "AF001 task packages", "proposedBranchName"),
  ], ["none", "unknown"]);
}

function defaultTitle(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "AF010 Codex invocation plan", "itemTitle"),
    metadataValue(artifacts, "AF001 task packages", "firstItemTitle"),
  ], ["none", "unknown"]);
}

function requiredInputArtifactBlockedReasons(
  artifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][],
): string[] {
  const reasons: string[] = [];
  const taskPackages = artifactByLabel(artifacts, "AF001 task packages");
  const codexInvocation = artifactByLabel(artifacts, "AF010 Codex invocation plan");
  const plannerNote = artifactByLabel(artifacts, "AF013A planner note");
  const patchArtifactPlan = artifactByLabel(artifacts, "AF013B patch artifact plan");

  if (taskPackages?.status === "missing") {
    reasons.push("Required AF001 task package artifact is missing.");
  }

  if (codexInvocation?.status === "missing") {
    reasons.push("Required AF010 invocation plan is missing.");
  }

  if (plannerNote?.status === "missing") {
    reasons.push("Required AF013A planner note is missing.");
  }

  if (plannerNote?.metadata.status === "blocked") {
    reasons.push("AF013A planner note is blocked.");
  }

  if (patchArtifactPlan?.status === "missing") {
    reasons.push("Required AF013B patch artifact plan is missing.");
  }

  if (patchArtifactPlan?.metadata.status === "blocked") {
    reasons.push("AF013B patch artifact plan is blocked.");
  }

  return reasons;
}

function blockedCodesForReasons(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/AF001 task package artifact is missing/i.test(reason)) return "missing_task_package";
    if (/AF010 invocation plan is missing/i.test(reason)) return "missing_codex_invocation_plan";
    if (/AF013A planner note is missing/i.test(reason)) return "missing_planner_note";
    if (/AF013A planner note is blocked/i.test(reason)) return "planner_note_blocked";
    if (/AF013B patch artifact plan is missing/i.test(reason)) return "missing_patch_artifact_plan";
    if (/AF013B patch artifact plan is blocked/i.test(reason)) return "patch_artifact_plan_blocked";
    if (/invalid local artifact|could not be parsed|not a file/i.test(reason)) return "invalid_artifact";
    if (/approval gate is missing|requires explicit human approval|human approval is required/i.test(reason)) {
      return "missing_human_approval";
    }
    if (/failed closed/i.test(reason)) return "approval_failed_closed";
    if (/max changed files|max patch bytes/i.test(reason)) return "invalid_mutation_boundary_limit";
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function createPlanId(input: {
  createdAt: string;
  targetTaskId: string | null;
  issueNumber: number | null;
  prNumber: number | null;
  inputArtifacts: readonly AgentFactoryBranchCommitPrPlan["inputArtifacts"][number][];
  requestedMutationClass: AgentFactoryBranchCommitPrMutationClass;
}): string {
  const seed = JSON.stringify({
    createdAt: input.createdAt,
    targetTaskId: input.targetTaskId,
    issueNumber: input.issueNumber,
    prNumber: input.prNumber,
    requestedMutationClass: input.requestedMutationClass,
    artifacts: input.inputArtifacts.map((artifact) => ({
      path: artifact.path,
      status: artifact.status,
      sha256: artifact.sha256,
    })),
  });

  return `af013c-${input.createdAt.replace(/\D/g, "").slice(0, 14)}-${sha256(seed).slice(0, 12)}`;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

function operationStatus(input: {
  planStatus: AgentFactoryBranchCommitPrStatus;
  approvalGate: AgentFactoryBranchCommitPrApprovalGate;
  requestedMutationClass: AgentFactoryBranchCommitPrMutationClass;
}): "planned" | "blocked" | "not_requested" {
  if (input.requestedMutationClass === "none") return "not_requested";
  if (input.planStatus === "blocked") return "blocked";
  return input.approvalGate === "approved" ? "planned" : "blocked";
}

function operationMetadata(
  target: AgentFactoryBranchCommitPrPlan["target"],
  requestedMutationClass: AgentFactoryBranchCommitPrMutationClass,
): Record<string, string | number | boolean | null> {
  return {
    requestedMutationClass,
    taskId: target.taskId,
    issueNumber: target.issueNumber,
    prNumber: target.prNumber,
    baseBranch: target.baseBranch,
    proposedBranchName: target.proposedBranchName,
    proposedCommitTitle: target.proposedCommitTitle,
    proposedPrTitle: target.proposedPrTitle,
    metadataOnly: true,
  };
}

function plannedOperationsFor(
  target: AgentFactoryBranchCommitPrPlan["target"],
  requestedMutationClass: AgentFactoryBranchCommitPrMutationClass,
  status: AgentFactoryBranchCommitPrStatus,
  approvalGate: AgentFactoryBranchCommitPrApprovalGate,
): AgentFactoryBranchCommitPrPlan["proposedGitHubOperations"] {
  const metadata = operationMetadata(target, requestedMutationClass);
  const statusForOperation = operationStatus({
    planStatus: status,
    approvalGate,
    requestedMutationClass,
  });
  const operation = (
    name: AgentFactoryBranchCommitPrPlan["proposedGitHubOperations"][number]["operation"],
  ): AgentFactoryBranchCommitPrPlan["proposedGitHubOperations"][number] => ({
    operation: name,
    status: statusForOperation,
    requiresApproval: true,
    approved: false,
    metadata,
  });

  if (requestedMutationClass === "none") return [operation("none")];
  if (requestedMutationClass === "branch_only") return [operation("create_branch")];
  if (requestedMutationClass === "commit_only") return [operation("create_commit")];
  if (requestedMutationClass === "pr_metadata_only") {
    return [operation(target.prNumber ? "update_pr_body" : "create_pr")];
  }

  return [
    operation("create_branch"),
    operation("create_commit"),
    operation("push_branch"),
    operation("create_pr"),
  ];
}

export function createAgentFactoryBranchCommitPrPlan(
  options: CreateAgentFactoryBranchCommitPrPlanOptions = {},
): AgentFactoryBranchCommitPrPlan {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const inputArtifacts = INPUT_ARTIFACTS.map((artifact) => readInputArtifact(artifactDir, artifact));
  const createdAt = (options.now ?? new Date()).toISOString();
  const approvalGate = normalizeApprovalGate(options.approvalGate);
  const requestedMutationClass = normalizeMutationClass(options.requestedMutationClass);
  const maxChangedFiles = normalizePositiveInteger(options.maxChangedFiles, 8);
  const maxPatchBytes = normalizePositiveInteger(options.maxPatchBytes, 60000);
  const invalidMaxChangedFiles = hasInvalidExplicitPositiveInteger(options.maxChangedFiles);
  const invalidMaxPatchBytes = hasInvalidExplicitPositiveInteger(options.maxPatchBytes);
  const targetTaskId = safeNullableText(options.taskId) ?? defaultTaskId(inputArtifacts);
  const issueNumber = normalizePositiveNumber(options.issueNumber) ?? defaultIssueNumber(inputArtifacts);
  const prNumber = normalizePositiveNumber(options.prNumber) ?? defaultPrNumber(inputArtifacts);
  const proposedBranchName = safeNullableText(options.proposedBranchName) ?? defaultBranchName(inputArtifacts);
  const title = defaultTitle(inputArtifacts);
  const proposedCommitTitle = safeNullableText(options.proposedCommitTitle) ?? title;
  const proposedPrTitle = safeNullableText(options.proposedPrTitle) ?? title;
  const blockedReasons = [
    ...inputArtifacts
      .filter((artifact) => artifact.status === "invalid")
      .map((artifact) => `Invalid local artifact: ${artifact.label} at ${artifact.path}.`),
    ...requiredInputArtifactBlockedReasons(inputArtifacts),
  ];

  if (approvalGate === "missing") {
    blockedReasons.push("Human approval gate is missing for the AF013C branch/commit/PR boundary.");
  }

  if (approvalGate === "failed_closed") {
    blockedReasons.push("Human approval gate failed closed; no AF013C branch/commit/PR boundary may continue.");
  }

  if (requestedMutationClass !== "none" && approvalGate !== "approved") {
    blockedReasons.push("Requested branch/commit/PR mutation class requires explicit human approval.");
  }

  if (invalidMaxChangedFiles) {
    blockedReasons.push("Mutation boundary max changed files must be greater than zero.");
  }

  if (invalidMaxPatchBytes) {
    blockedReasons.push("Mutation boundary max patch bytes must be greater than zero.");
  }

  const status = blockedReasons.length > 0 ? "blocked" : "planned";
  const target: AgentFactoryBranchCommitPrPlan["target"] = {
    taskId: targetTaskId,
    issueNumber,
    prNumber,
    baseBranch: safeText(options.baseBranch, defaultBaseBranch(inputArtifacts)),
    proposedBranchName,
    proposedCommitTitle,
    proposedPrTitle,
  };
  const plan: AgentFactoryBranchCommitPrPlan = {
    version: AGENT_FACTORY_BRANCH_COMMIT_PR_VERSION,
    planId: options.planId ?? createPlanId({
      createdAt,
      targetTaskId,
      issueNumber,
      prNumber,
      inputArtifacts,
      requestedMutationClass,
    }),
    createdAt,
    status,
    reportOnly: true,
    dryRun: true,
    source: {
      script: "agent-factory-branch-commit-pr",
      repository: safeNullableText(options.repository),
      actor: safeNullableText(options.actor),
      workflowName: safeNullableText(options.workflowName),
      workflowRunId: safeNullableText(options.workflowRunId),
    },
    target,
    inputArtifacts,
    mutationBoundary: {
      metadataOnlyPlan: true,
      requiresHumanApproval: true,
      approvalGate,
      requestedMutationClass,
      approvedMutationClasses:
        approvalGate === "approved" && requestedMutationClass !== "none"
          ? [requestedMutationClass]
          : [],
      willMutateWithoutApproval: false,
      maxChangedFiles,
      maxPatchBytes,
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
    proposedGitHubOperations: plannedOperationsFor(
      target,
      requestedMutationClass,
      status,
      approvalGate,
    ),
    nextHumanStep: {
      label: safeText(
        options.nextHumanStepLabel,
        "Review this AF013C branch/commit/PR plan before any external mutation work.",
      ),
      inertCommandPreview: safeNullableText(
        options.inertCommandPreview ??
          "npm.cmd run agent-factory:branch-commit-pr -- --artifact-dir .agent-factory --stdout markdown",
      ),
      instructions: normalizeInstructionList(options.instructions, [
        "Review required upstream artifact statuses, target metadata, and mutation boundary limits.",
        "Do not execute branch, commit, push, pull request, workflow, merge, rebase, Codex, shell, or patch operations from this plan.",
        "Future mutation work requires a separate approved primitive and must keep AF009 approval boundaries intact.",
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

  assertAgentFactoryBranchCommitPrPlanSafe(plan);
  return plan;
}

export function buildAgentFactoryBranchCommitPrMarkdown(plan: AgentFactoryBranchCommitPrPlan): string {
  assertAgentFactoryBranchCommitPrPlanSafe(plan);

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
  const operationLines = plan.proposedGitHubOperations.map((operation) =>
    `- ${operation.operation}: ${operation.status}, requiresApproval=${operation.requiresApproval ? "yes" : "no"}, approved=${operation.approved ? "yes" : "no"}`,
  );

  const markdown = [
    "# AF013C Branch Commit PR Adapter",
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
    `- Issue number: ${plan.target.issueNumber ?? "none"}`,
    `- PR number: ${plan.target.prNumber ?? "none"}`,
    `- Base branch: ${plan.target.baseBranch}`,
    `- Proposed branch: ${plan.target.proposedBranchName ?? "none"}`,
    `- Proposed commit title: ${plan.target.proposedCommitTitle ?? "none"}`,
    `- Proposed PR title: ${plan.target.proposedPrTitle ?? "none"}`,
    "",
    "## Input Artifacts",
    "",
    ...artifactLines,
    "",
    "## Mutation Boundary",
    "",
    `- Metadata-only plan: ${plan.mutationBoundary.metadataOnlyPlan ? "yes" : "no"}`,
    `- Requires human approval: ${plan.mutationBoundary.requiresHumanApproval ? "yes" : "no"}`,
    `- Approval gate: ${plan.mutationBoundary.approvalGate}`,
    `- Requested mutation class: ${plan.mutationBoundary.requestedMutationClass}`,
    `- Approved mutation classes: ${plan.mutationBoundary.approvedMutationClasses.join(", ") || "none"}`,
    `- Will mutate without approval: ${plan.mutationBoundary.willMutateWithoutApproval ? "yes" : "no"}`,
    `- Max changed files: ${plan.mutationBoundary.maxChangedFiles}`,
    `- Max patch bytes: ${plan.mutationBoundary.maxPatchBytes}`,
    "- Allowed path prefixes:",
    ...formatList(plan.mutationBoundary.allowedPathPrefixes),
    "- Forbidden path prefixes:",
    ...formatList(plan.mutationBoundary.forbiddenPathPrefixes),
    "",
    "## Actions",
    "",
    ...actionLines,
    "",
    "## Proposed GitHub Operations",
    "",
    ...formatList(operationLines.map((line) => line.slice(2))),
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

  assertAgentFactoryBranchCommitPrTextSafe(markdown, "AF013C branch-commit-PR Markdown");
  return markdown;
}

export function buildAgentFactoryBranchCommitPrSummary(plan: AgentFactoryBranchCommitPrPlan): string {
  assertAgentFactoryBranchCommitPrPlanSafe(plan);

  const summary = [
    "# AF013C Branch Commit PR Adapter",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Approval gate: ${plan.mutationBoundary.approvalGate}`,
    `Requested mutation class: ${plan.mutationBoundary.requestedMutationClass}`,
    `Branch created: ${plan.actions.willCreateBranch ? "yes" : "no"}`,
    `Commit created: ${plan.actions.willCreateCommit ? "yes" : "no"}`,
    `Pushed: ${plan.actions.willPush ? "yes" : "no"}`,
    `PR created or updated: ${plan.actions.willCreateOrUpdatePr ? "yes" : "no"}`,
    `Workflow rerun: ${plan.actions.willRerunWorkflow ? "yes" : "no"}`,
    `Merge or rebase: ${plan.actions.willMergeOrRebase ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    plan.nextHumanStep.label,
    "",
    "## Proposed GitHub Operations",
    "",
    ...plan.proposedGitHubOperations.map((operation) =>
      `- \`${operation.operation}\`: ${operation.status}, approved=${operation.approved ? "yes" : "no"}`,
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

  assertAgentFactoryBranchCommitPrTextSafe(summary, "AF013C branch-commit-PR summary");
  return summary;
}

export function assertAgentFactoryBranchCommitPrTextSafe(text: string, label: string): void {
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

export function assertAgentFactoryBranchCommitPrPlanSafe(value: unknown): void {
  const root = asRecord(value);
  if (!root) throw new Error("AF013C branch-commit-PR plan must be a JSON object.");

  if (root.version !== AGENT_FACTORY_BRANCH_COMMIT_PR_VERSION) {
    throw new Error("AF013C branch-commit-PR plan version must be 1.");
  }
  if (root.reportOnly !== true) throw new Error("AF013C branch-commit-PR plan must be report-only.");
  if (root.dryRun !== true) throw new Error("AF013C branch-commit-PR plan must be dry-run.");
  if (root.status !== "planned" && root.status !== "blocked") {
    throw new Error("AF013C branch-commit-PR plan status must be planned or blocked.");
  }

  const source = asRecord(root.source);
  if (source?.script !== "agent-factory-branch-commit-pr") {
    throw new Error("AF013C branch-commit-PR plan source script is invalid.");
  }

  const mutationBoundary = asRecord(root.mutationBoundary);
  if (mutationBoundary?.metadataOnlyPlan !== true) {
    throw new Error("AF013C branch-commit-PR plan must be metadata-only.");
  }
  if (mutationBoundary?.requiresHumanApproval !== true) {
    throw new Error("AF013C branch-commit-PR plan must require human approval.");
  }
  if (mutationBoundary?.willMutateWithoutApproval !== false) {
    throw new Error("AF013C branch-commit-PR plan must not mutate without approval.");
  }
  if (
    mutationBoundary?.approvalGate !== "not_requested" &&
    mutationBoundary?.approvalGate !== "missing" &&
    mutationBoundary?.approvalGate !== "approved" &&
    mutationBoundary?.approvalGate !== "failed_closed"
  ) {
    throw new Error("AF013C branch-commit-PR plan approval gate is invalid.");
  }
  if (
    mutationBoundary?.requestedMutationClass !== "none" &&
    mutationBoundary?.requestedMutationClass !== "branch_only" &&
    mutationBoundary?.requestedMutationClass !== "commit_only" &&
    mutationBoundary?.requestedMutationClass !== "pr_metadata_only" &&
    mutationBoundary?.requestedMutationClass !== "branch_commit_pr"
  ) {
    throw new Error("AF013C branch-commit-PR plan requested mutation class is invalid.");
  }

  const dataBoundary = asRecord(root.dataBoundary);
  if (dataBoundary?.metadataOnly !== true) {
    throw new Error("AF013C branch-commit-PR plan must be metadata-only.");
  }
  if (dataBoundary?.omittedRawPayloads !== true) {
    throw new Error("AF013C branch-commit-PR plan must omit raw payloads.");
  }
  if (dataBoundary?.hashesOnlyForPayloads !== true) {
    throw new Error("AF013C branch-commit-PR plan must use hashes only for payloads.");
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
      throw new Error(`AF013C branch-commit-PR plan action ${key} must be false.`);
    }
  }

  const operations = Array.isArray(root.proposedGitHubOperations) ? root.proposedGitHubOperations : [];
  for (const entry of operations) {
    const operation = asRecord(entry);
    if (operation?.requiresApproval !== true) {
      throw new Error("AF013C proposed GitHub operation must require approval.");
    }
    if (operation?.approved !== false) {
      throw new Error("AF013C proposed GitHub operation must not be approved for execution in v1.");
    }
    if (
      operation?.status !== "planned" &&
      operation?.status !== "blocked" &&
      operation?.status !== "not_requested"
    ) {
      throw new Error("AF013C proposed GitHub operation status is invalid.");
    }
    if (
      operation?.operation !== "create_branch" &&
      operation?.operation !== "create_commit" &&
      operation?.operation !== "push_branch" &&
      operation?.operation !== "create_pr" &&
      operation?.operation !== "update_pr_body" &&
      operation?.operation !== "request_review" &&
      operation?.operation !== "none"
    ) {
      throw new Error("AF013C proposed GitHub operation name is invalid.");
    }
  }

  const seen = new Set<unknown>();
  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF013C branch-commit-PR plan contains a secret-like value at ${currentPath}.`);
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
        throw new Error(`AF013C branch-commit-PR plan contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
