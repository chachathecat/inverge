import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_PLANNER_NOTE_VERSION = 1;

export type AgentFactoryPlannerNoteStatus = "planned" | "blocked";

export type AgentFactoryPlannerNoteApprovalGate =
  | "not_requested"
  | "missing"
  | "approved"
  | "failed_closed";

export interface AgentFactoryPlannerNote {
  version: 1;
  noteId: string;
  createdAt: string;
  status: AgentFactoryPlannerNoteStatus;
  reportOnly: true;
  dryRun: true;
  source: {
    script: "agent-factory-planner-notes";
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
  boundary: {
    isolatedWorkspaceRequired: true;
    proposedWorkspacePath: string | null;
    allowedPathPrefixes: string[];
    forbiddenPathPrefixes: string[];
    maxChangedFiles: number;
    maxDiffBytes: number;
    requiresHumanApproval: true;
    approvalGate: AgentFactoryPlannerNoteApprovalGate;
  };
  actions: {
    willRunCodex: false;
    willRunShellCommands: false;
    willApplyPatch: false;
    willCreateBranch: false;
    willCreateCommit: false;
    willPush: false;
    willCreateOrUpdatePr: false;
    willRerunWorkflow: false;
    willMergeOrRebase: false;
  };
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

export interface CreateAgentFactoryPlannerNoteOptions {
  artifactDir?: string;
  now?: Date;
  noteId?: string;
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
  maxDiffBytes?: number | string | null;
  approvalGate?: AgentFactoryPlannerNoteApprovalGate | null;
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
  ".agent-factory/factory-planner-note.json",
  ".agent-factory/factory-planner-note.md",
  ".agent-factory/agent-factory-planner-note-summary.md",
] as const;

const GUARDRAILS = [
  "AF013A v1 is report-only and never invokes Codex.",
  "AF013A v1 never runs shell commands, applies patches, creates branches, commits, pushes, PRs, workflow reruns, merges, or rebases.",
  "AF013A v1 never calls learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs.",
  "AF013A v1 emits metadata-only local planning notes for human review before any future code-changing factory adapter exists.",
  "AF013A v1 requires an isolated workspace boundary and a separate human approval gate before any future execution work.",
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
] as const;

const FORBIDDEN_NOTE_KEY_PATTERNS = [
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
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
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
  value: AgentFactoryPlannerNoteApprovalGate | null | undefined,
): AgentFactoryPlannerNoteApprovalGate {
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
    throw new Error(`Unsafe AF013A artifact path: ${fileName}`);
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

  return {};
}

function readInputArtifact(
  artifactDir: string,
  artifact: (typeof INPUT_ARTIFACTS)[number],
): AgentFactoryPlannerNote["inputArtifacts"][number] {
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
  artifacts: readonly AgentFactoryPlannerNote["inputArtifacts"][number][],
  label: string,
  key: string,
): string | number | boolean | null {
  const artifact = artifacts.find((entry) => entry.label === label);
  return artifact?.metadata[key] ?? null;
}

function defaultTaskId(
  artifacts: readonly AgentFactoryPlannerNote["inputArtifacts"][number][],
): string | null {
  const fromInvocation = metadataValue(artifacts, "AF010 Codex invocation plan", "itemId");
  if (typeof fromInvocation === "string" && fromInvocation !== "none") return fromInvocation;

  const fromTaskPackage = metadataValue(artifacts, "AF001 task packages", "firstItemId");
  return typeof fromTaskPackage === "string" && fromTaskPackage !== "none" ? fromTaskPackage : null;
}

function defaultBranchName(
  artifacts: readonly AgentFactoryPlannerNote["inputArtifacts"][number][],
): string | null {
  const fromTaskPackage = metadataValue(artifacts, "AF001 task packages", "proposedBranchName");
  return typeof fromTaskPackage === "string" && fromTaskPackage !== "unknown" ? fromTaskPackage : null;
}

function blockedCodesForReasons(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/invalid local artifact|could not be parsed|not a file/i.test(reason)) return "invalid_artifact";
    if (/approval gate is missing/i.test(reason)) return "missing_human_approval";
    if (/failed closed/i.test(reason)) return "approval_failed_closed";
    if (/max changed files|max diff bytes/i.test(reason)) return "invalid_boundary_limit";
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function createNoteId(input: {
  createdAt: string;
  targetTaskId: string | null;
  prNumber: number | null;
  inputArtifacts: readonly AgentFactoryPlannerNote["inputArtifacts"][number][];
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
  });

  return `af013a-${input.createdAt.replace(/\D/g, "").slice(0, 14)}-${sha256(seed).slice(0, 12)}`;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function createAgentFactoryPlannerNote(
  options: CreateAgentFactoryPlannerNoteOptions = {},
): AgentFactoryPlannerNote {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const inputArtifacts = INPUT_ARTIFACTS.map((artifact) => readInputArtifact(artifactDir, artifact));
  const createdAt = (options.now ?? new Date()).toISOString();
  const approvalGate = normalizeApprovalGate(options.approvalGate);
  const maxChangedFiles = normalizePositiveInteger(options.maxChangedFiles, 8);
  const maxDiffBytes = normalizePositiveInteger(options.maxDiffBytes, 60000);
  const invalidMaxChangedFiles = hasInvalidExplicitPositiveInteger(options.maxChangedFiles);
  const invalidMaxDiffBytes = hasInvalidExplicitPositiveInteger(options.maxDiffBytes);
  const targetTaskId = safeNullableText(options.taskId) ?? defaultTaskId(inputArtifacts);
  const prNumber = normalizePrNumber(options.prNumber);
  const proposedBranchName = safeNullableText(options.proposedBranchName) ?? defaultBranchName(inputArtifacts);
  const blockedReasons = [
    ...inputArtifacts
      .filter((artifact) => artifact.status === "invalid")
      .map((artifact) => `Invalid local artifact: ${artifact.label} at ${artifact.path}.`),
  ];

  if (approvalGate === "missing") {
    blockedReasons.push("Human approval gate is missing for any future execution boundary.");
  }

  if (approvalGate === "failed_closed") {
    blockedReasons.push("Human approval gate failed closed; no future execution boundary may continue.");
  }

  if (invalidMaxChangedFiles) {
    blockedReasons.push("Boundary max changed files must be greater than zero.");
  }

  if (invalidMaxDiffBytes) {
    blockedReasons.push("Boundary max diff bytes must be greater than zero.");
  }

  const note: AgentFactoryPlannerNote = {
    version: AGENT_FACTORY_PLANNER_NOTE_VERSION,
    noteId: options.noteId ?? createNoteId({
      createdAt,
      targetTaskId,
      prNumber,
      inputArtifacts,
    }),
    createdAt,
    status: blockedReasons.length > 0 ? "blocked" : "planned",
    reportOnly: true,
    dryRun: true,
    source: {
      script: "agent-factory-planner-notes",
      repository: safeNullableText(options.repository),
      actor: safeNullableText(options.actor),
      workflowName: safeNullableText(options.workflowName),
      workflowRunId: safeNullableText(options.workflowRunId),
    },
    target: {
      taskId: targetTaskId,
      prNumber,
      baseBranch: safeText(options.baseBranch, "main"),
      proposedBranchName,
    },
    inputArtifacts,
    boundary: {
      isolatedWorkspaceRequired: true,
      proposedWorkspacePath: safeNullableText(options.proposedWorkspacePath),
      allowedPathPrefixes: normalizeStringList(
        options.allowedPathPrefixes,
        DEFAULT_ALLOWED_PATH_PREFIXES,
      ),
      forbiddenPathPrefixes: normalizeStringList(
        options.forbiddenPathPrefixes,
        DEFAULT_FORBIDDEN_PATH_PREFIXES,
      ),
      maxChangedFiles,
      maxDiffBytes,
      requiresHumanApproval: true,
      approvalGate,
    },
    actions: {
      willRunCodex: false,
      willRunShellCommands: false,
      willApplyPatch: false,
      willCreateBranch: false,
      willCreateCommit: false,
      willPush: false,
      willCreateOrUpdatePr: false,
      willRerunWorkflow: false,
      willMergeOrRebase: false,
    },
    nextHumanStep: {
      label: safeText(
        options.nextHumanStepLabel,
        "Review this AF013A planner note before any future execution adapter work.",
      ),
      inertCommandPreview: safeNullableText(
        options.inertCommandPreview ??
          "npm.cmd run agent-factory:planner-notes -- --artifact-dir .agent-factory --stdout markdown",
      ),
      instructions: normalizeInstructionList(options.instructions, [
        "Review input artifact statuses, boundary limits, and proposed path prefixes.",
        "Do not run Codex or mutate code from this note; future execution work requires a separate approved issue.",
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

  assertAgentFactoryPlannerNoteSafe(note);
  return note;
}

export function buildAgentFactoryPlannerNoteMarkdown(note: AgentFactoryPlannerNote): string {
  assertAgentFactoryPlannerNoteSafe(note);

  const artifactLines = note.inputArtifacts.map((artifact) => {
    const metadata = Object.entries(artifact.metadata)
      .map(([key, value]) => `${key}=${value ?? "unknown"}`)
      .join(", ");
    const suffix = metadata ? ` (${metadata})` : "";
    return `- ${artifact.label}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}${suffix}`;
  });

  const actionLines = Object.entries(note.actions).map(([key, value]) =>
    `- ${key}: ${value ? "yes" : "no"}`,
  );

  const markdown = [
    "# AF013A Factory Planner Note",
    "",
    `Status: ${note.status}`,
    `Report-only: ${note.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${note.dryRun ? "true" : "false"}`,
    `Note id: ${note.noteId}`,
    `Created at: ${note.createdAt}`,
    "",
    "## Target",
    "",
    `- Task id: ${note.target.taskId ?? "none"}`,
    `- PR number: ${note.target.prNumber ?? "none"}`,
    `- Base branch: ${note.target.baseBranch}`,
    `- Proposed branch: ${note.target.proposedBranchName ?? "none"}`,
    "",
    "## Input Artifacts",
    "",
    ...artifactLines,
    "",
    "## Boundary",
    "",
    `- Isolated workspace required: ${note.boundary.isolatedWorkspaceRequired ? "yes" : "no"}`,
    `- Proposed workspace: ${note.boundary.proposedWorkspacePath ?? "none"}`,
    `- Max changed files: ${note.boundary.maxChangedFiles}`,
    `- Max diff bytes: ${note.boundary.maxDiffBytes}`,
    `- Requires human approval: ${note.boundary.requiresHumanApproval ? "yes" : "no"}`,
    `- Approval gate: ${note.boundary.approvalGate}`,
    "- Allowed path prefixes:",
    ...formatList(note.boundary.allowedPathPrefixes),
    "- Forbidden path prefixes:",
    ...formatList(note.boundary.forbiddenPathPrefixes),
    "",
    "## Actions",
    "",
    ...actionLines,
    "",
    "## Next Human Step",
    "",
    `- Label: ${note.nextHumanStep.label}`,
    `- Inert command preview: ${note.nextHumanStep.inertCommandPreview ?? "none"}`,
    "- Instructions:",
    ...formatList(note.nextHumanStep.instructions),
    "",
    "## Blocked Reasons",
    "",
    ...formatList(note.blockedReasons),
    "",
    "## Data Boundary",
    "",
    `- Metadata only: ${note.dataBoundary.metadataOnly ? "yes" : "no"}`,
    `- Omitted raw payloads: ${note.dataBoundary.omittedRawPayloads ? "yes" : "no"}`,
    `- Hashes only for payloads: ${note.dataBoundary.hashesOnlyForPayloads ? "yes" : "no"}`,
    "",
    "## Guardrails",
    "",
    ...note.guardrails.map((guardrail) => `- ${guardrail}`),
    "",
    "## Artifacts",
    "",
    ...note.artifacts.map((artifact) => `- \`${artifact}\``),
  ].join("\n");

  assertAgentFactoryPlannerNoteTextSafe(markdown, "AF013A planner-note Markdown");
  return markdown;
}

export function buildAgentFactoryPlannerNoteSummary(note: AgentFactoryPlannerNote): string {
  assertAgentFactoryPlannerNoteSafe(note);

  const summary = [
    "# AF013A Factory Planner Notes",
    "",
    `Status: ${note.status}`,
    `Report-only: ${note.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${note.dryRun ? "true" : "false"}`,
    `Codex invoked: ${note.actions.willRunCodex ? "yes" : "no"}`,
    `Commands executed: ${note.actions.willRunShellCommands ? "yes" : "no"}`,
    `Patches applied: ${note.actions.willApplyPatch ? "yes" : "no"}`,
    `GitHub mutated: ${note.actions.willCreateOrUpdatePr ? "yes" : "no"}`,
    `Approval gate: ${note.boundary.approvalGate}`,
    "",
    "## Result",
    "",
    note.nextHumanStep.label,
    "",
    "## Artifacts",
    "",
    ...note.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Guardrails",
    "",
    ...note.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertAgentFactoryPlannerNoteTextSafe(summary, "AF013A planner-note summary");
  return summary;
}

export function assertAgentFactoryPlannerNoteTextSafe(text: string, label: string): void {
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

export function assertAgentFactoryPlannerNoteSafe(value: unknown): void {
  const root = asRecord(value);
  if (!root) throw new Error("AF013A planner note must be a JSON object.");

  if (root.version !== AGENT_FACTORY_PLANNER_NOTE_VERSION) {
    throw new Error("AF013A planner note version must be 1.");
  }
  if (root.reportOnly !== true) throw new Error("AF013A planner note must be report-only.");
  if (root.dryRun !== true) throw new Error("AF013A planner note must be dry-run.");
  if (root.status !== "planned" && root.status !== "blocked") {
    throw new Error("AF013A planner note status must be planned or blocked.");
  }

  const source = asRecord(root.source);
  if (source?.script !== "agent-factory-planner-notes") {
    throw new Error("AF013A planner note source script is invalid.");
  }

  const boundary = asRecord(root.boundary);
  if (boundary?.isolatedWorkspaceRequired !== true) {
    throw new Error("AF013A planner note must require an isolated workspace.");
  }
  if (boundary?.requiresHumanApproval !== true) {
    throw new Error("AF013A planner note must require human approval.");
  }
  if (
    boundary?.approvalGate !== "not_requested" &&
    boundary?.approvalGate !== "missing" &&
    boundary?.approvalGate !== "approved" &&
    boundary?.approvalGate !== "failed_closed"
  ) {
    throw new Error("AF013A planner note approval gate is invalid.");
  }

  const dataBoundary = asRecord(root.dataBoundary);
  if (dataBoundary?.metadataOnly !== true) {
    throw new Error("AF013A planner note must be metadata-only.");
  }
  if (dataBoundary?.omittedRawPayloads !== true) {
    throw new Error("AF013A planner note must omit raw payloads.");
  }
  if (dataBoundary?.hashesOnlyForPayloads !== true) {
    throw new Error("AF013A planner note must use hashes only for payloads.");
  }

  const actions = asRecord(root.actions);
  const actionKeys = [
    "willRunCodex",
    "willRunShellCommands",
    "willApplyPatch",
    "willCreateBranch",
    "willCreateCommit",
    "willPush",
    "willCreateOrUpdatePr",
    "willRerunWorkflow",
    "willMergeOrRebase",
  ] as const;
  for (const key of actionKeys) {
    if (actions?.[key] !== false) {
      throw new Error(`AF013A planner note action ${key} must be false.`);
    }
  }

  const seen = new Set<unknown>();
  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF013A planner note contains a secret-like value at ${currentPath}.`);
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
      const forbidden = FORBIDDEN_NOTE_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`AF013A planner note contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
