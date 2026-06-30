import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_ROADMAP_AUTOPILOT_VERSION = 1;

export type AgentFactoryRoadmapAutopilotStatus = "planned" | "blocked";

export type AgentFactoryRoadmapAutopilotApprovalGate =
  | "not_requested"
  | "missing"
  | "approved"
  | "failed_closed";

export type AgentFactoryRoadmapCandidateKind =
  | "agent_factory_verification"
  | "agent_factory_next_layer"
  | "ci_repair_follow_up"
  | "product_constitution"
  | "product_feature"
  | "runtime_acceptance"
  | "commercial_readiness"
  | "unknown";

export type AgentFactoryRoadmapAutopilotCiConclusion =
  | "success"
  | "failure"
  | "cancelled"
  | "skipped"
  | "unknown";

export interface AgentFactoryRoadmapAutopilotPlan {
  version: 1;
  planId: string;
  createdAt: string;
  status: AgentFactoryRoadmapAutopilotStatus;
  reportOnly: true;
  dryRun: true;
  source: {
    script: "agent-factory-roadmap-autopilot";
    repository: string | null;
    actor: string | null;
    workflowName: string | null;
    workflowRunId: string | null;
  };
  roadmapState: {
    currentPhase: string | null;
    lastCompletedAgentFactoryStep: string | null;
    nextRecommendedStep: string | null;
    openIssueCount: number;
    openPrCount: number;
    latestCiConclusion: AgentFactoryRoadmapAutopilotCiConclusion;
    runHistoryRecordCount: number;
  };
  inputArtifacts: Array<{
    label: string;
    path: string;
    status: "available" | "missing" | "invalid";
    sha256: string | null;
    metadata: Record<string, string | number | boolean | null>;
  }>;
  candidates: Array<{
    id: string;
    kind: AgentFactoryRoadmapCandidateKind;
    label: string;
    status: "recommended" | "blocked" | "deferred" | "not_selected";
    priorityScore: number;
    risk: "low" | "medium" | "high";
    reasonCodes: string[];
    metadata: Record<string, string | number | boolean | null>;
  }>;
  selectedCandidate: {
    id: string | null;
    label: string | null;
    reasonCodes: string[];
    risk: "low" | "medium" | "high" | null;
  };
  proposedNextWork: {
    issueTitle: string | null;
    issueBodyPreview: string | null;
    branchName: string | null;
    worktreeName: string | null;
    prTitle: string | null;
    prBodyPreview: string | null;
    codexPromptPreview: string | null;
    validationCommands: string[];
  };
  autopilotBoundary: {
    metadataOnlyPlan: true;
    requiresHumanApproval: true;
    approvalGate: AgentFactoryRoadmapAutopilotApprovalGate;
    willMutateWithoutApproval: false;
    maxCandidateCount: number;
    maxPromptBytes: number;
    allowedPathPrefixes: string[];
    forbiddenPathPrefixes: string[];
  };
  actions: {
    willRunCodex: false;
    willRunShellCommands: false;
    willApplyPatch: false;
    willEditWorkingTree: false;
    willCreateIssue: false;
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

export interface CreateAgentFactoryRoadmapAutopilotPlanOptions {
  artifactDir?: string;
  now?: Date;
  planId?: string;
  repository?: string | null;
  actor?: string | null;
  workflowName?: string | null;
  workflowRunId?: string | number | null;
  currentPhase?: string | null;
  lastCompletedStep?: string | null;
  openIssueCount?: number | string | null;
  openPrCount?: number | string | null;
  latestCiConclusion?: AgentFactoryRoadmapAutopilotCiConclusion | null;
  maxCandidateCount?: number | string | null;
  maxPromptBytes?: number | string | null;
  allowedPathPrefixes?: readonly string[];
  forbiddenPathPrefixes?: readonly string[];
  approvalGate?: AgentFactoryRoadmapAutopilotApprovalGate | null;
  nextHumanStepLabel?: string | null;
  inertCommandPreview?: string | null;
  instructions?: readonly string[];
}

type ArtifactId =
  | "run-history"
  | "ci-repair-plan"
  | "branch-commit-pr-plan"
  | "patch-artifact-plan"
  | "planner-note"
  | "orchestrator-plan"
  | "codex-invocation"
  | "roadmap-state"
  | "github-issue-snapshot"
  | "github-pr-snapshot"
  | "ci-workflow-runs";

interface InputArtifactDefinition {
  id: ArtifactId;
  label: string;
  fileName: string;
}

interface InternalInputArtifact {
  artifact: AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number];
  data: unknown;
  sourceId: ArtifactId;
}

type RoadmapCandidate = AgentFactoryRoadmapAutopilotPlan["candidates"][number];

const INPUT_ARTIFACTS: readonly InputArtifactDefinition[] = [
  {
    id: "run-history",
    label: "AF011 run history",
    fileName: "run-history.jsonl",
  },
  {
    id: "ci-repair-plan",
    label: "AF014 CI repair plan",
    fileName: "ci-repair-plan.json",
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
    id: "orchestrator-plan",
    label: "AF012 orchestrator plan",
    fileName: "factory-orchestrator-plan.json",
  },
  {
    id: "codex-invocation",
    label: "AF010 Codex invocation plan",
    fileName: "codex-invocation-plan.json",
  },
  {
    id: "roadmap-state",
    label: "Roadmap state",
    fileName: "roadmap-state.json",
  },
  {
    id: "github-issue-snapshot",
    label: "GitHub issue snapshot",
    fileName: "github-issue-snapshot.json",
  },
  {
    id: "github-pr-snapshot",
    label: "GitHub PR snapshot",
    fileName: "github-pr-snapshot.json",
  },
  {
    id: "ci-workflow-runs",
    label: "CI workflow runs",
    fileName: "ci-workflow-runs.json",
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
  ".agent-factory/roadmap-autopilot-plan.json",
  ".agent-factory/roadmap-autopilot-plan.md",
  ".agent-factory/agent-factory-roadmap-autopilot-summary.md",
] as const;

const GUARDRAILS = [
  "AF015 v1 is metadata-only and report-only.",
  "AF015 v1 reads only local Agent Factory metadata artifacts and never requires live GitHub API access.",
  "AF015 v1 proposes roadmap work for human review without creating issues, branches, commits, pushes, pull requests, workflow reruns, merges, or rebases.",
  "AF015 v1 never invokes Codex, runs shell commands from the plan, applies patches, edits source files, or edits the working tree.",
  "AF015 v1 never calls learner runtime, OCR, provider, billing, auth, payment, production, instructor, academy, or official-source systems.",
  "AF015 v1 defers product backlog work until Agent Factory reaches AF016 evidence.",
] as const;

const VALIDATION_COMMANDS = [
  "npm.cmd test -- tests/agent-factory-roadmap-autopilot.test.mjs tests/agent-factory-ci-repair-loop.test.mjs tests/agent-factory-ci-repair-runtime-verification.test.mjs tests/agent-factory-branch-commit-pr-adapter.test.mjs tests/agent-factory-patch-artifact-adapter.test.mjs tests/agent-factory-patch-artifact-runtime-verification.test.mjs tests/agent-factory-planner-notes.test.mjs tests/agent-factory-codex-invocation-adapter.test.mjs tests/agent-factory-run-history.test.mjs tests/agent-factory-orchestrator.test.mjs",
  "npm.cmd run typecheck",
  "npm.cmd run lint",
  "npm.cmd test",
  "npm.cmd run build",
  "git diff --check",
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
  /^\s*["']?(?:raw[_\-\s]?learner[_\-\s]?(?:content|answer|text)?|learner[_\-\s]?answer|rawLearnerAnswer|raw[_\-\s]?answer)["']?\s*[:=]/i,
  /^\s*["']?(?:ocr[_\-\s]?(?:text|payload|output)|ocrText|provider[_\-\s]?payload|providerPayload)["']?\s*[:=]/i,
  /^\s*["']?(?:billing[_\-\s]?(?:data|record|payload)|billingData|auth[_\-\s]?(?:data|record|payload|token|secret)|authData|payment[_\-\s]?(?:data|record|payload)|paymentData)["']?\s*[:=]/i,
  /^\s*["']?(?:private[_\-\s]?user[_\-\s]?content|raw[_\-\s]?issue[_\-\s]?body|rawIssueBody|issueBody|raw[_\-\s]?pr[_\-\s]?body|rawPrBody|prBody|pr[_\-\s]?body[_\-\s]?payload|pull[_\-\s]?request[_\-\s]?body|bodyText)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?comment|comment[_\-\s]?body|commentBody|raw[_\-\s]?comments?)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?patch|rawPatch|raw[_\-\s]?diff|rawDiff|patch[_\-\s]?body|diff[_\-\s]?body|source[_\-\s]?patch|source[_\-\s]?diff)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?task[_\-\s]?package[_\-\s]?prompt|rawTaskPackagePrompt|task[_\-\s]?package[_\-\s]?prompt|codexPrompt|prompt[_\-\s]?text|prompt[_\-\s]?body)["']?\s*[:=]/i,
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
  /^body$/i,
  /^bodyText$/i,
  /raw.*issue.*body/i,
  /issue.*body/i,
  /raw.*pr.*body/i,
  /pr.*body/i,
  /pull.*request.*body/i,
  /raw.*comments?/i,
  /comments?$/i,
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
  /^body$/i,
  /^bodyText$/i,
  /^issueBody$/i,
  /raw.*issue.*body/i,
  /^prBody$/i,
  /raw.*pr.*body/i,
  /pr.*body.*payload/i,
  /pull.*request.*body/i,
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

function normalizeNonNegativeInteger(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
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

function hasInvalidExplicitNonNegativeInteger(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return !Number.isInteger(value) || value < 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return !/^\d+$/.test(trimmed);
  }
  return true;
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

function normalizeApprovalGate(
  value: AgentFactoryRoadmapAutopilotApprovalGate | null | undefined,
): AgentFactoryRoadmapAutopilotApprovalGate {
  if (value === "missing" || value === "approved" || value === "failed_closed") return value;
  return "not_requested";
}

function normalizeCiConclusion(value: unknown): AgentFactoryRoadmapAutopilotCiConclusion {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    text === "success" ||
    text === "failure" ||
    text === "cancelled" ||
    text === "skipped" ||
    text === "unknown"
  ) {
    return text;
  }
  if (text === "failed" || text === "error" || text === "timed_out") return "failure";
  if (text === "canceled") return "cancelled";
  return "unknown";
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
    throw new Error(`Unsafe AF015 artifact path: ${fileName}`);
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

function assertNoForbiddenInputKeys(value: unknown, label: string): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`${label} contains a secret-like value at ${currentPath}.`);
        }
      }

      const unsafeLine = normalizeNewlines(current)
        .split("\n")
        .find((line) => SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)));
      if (unsafeLine) {
        throw new Error(`${label} contains a raw-content or credential-like string at ${currentPath}.`);
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

function ciRepairMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const ciState = asRecord(root.ciState);
  const boundary = asRecord(root.repairBoundary);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    latestCiConclusion: normalizeCiConclusion(ciState?.latestConclusion),
    observedFailureClassCount: asArray(ciState?.observedFailureClasses).length,
    failureClassificationCount: asArray(root.failureClassifications).length,
    blockedReasonCount: asArray(root.blockedReasonCodes).length,
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
  };
}

function genericPlanMetadata(data: unknown, targetKey = "target"): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const target = asRecord(root[targetKey]);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    taskId: safeText(target?.taskId ?? target?.requestedItemId, "none"),
    prNumber: safeNumber(target?.prNumber),
    baseBranch: safeText(target?.baseBranch, "main"),
    proposedBranchName: safeText(
      target?.proposedBranchName ?? target?.proposedBranchName ?? target?.branchName,
      "none",
    ),
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

function roadmapStateMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const roadmapState = asRecord(root.roadmapState) ?? root;

  return {
    currentPhase: safeText(roadmapState.currentPhase, "none"),
    lastCompletedAgentFactoryStep: safeText(
      roadmapState.lastCompletedAgentFactoryStep ?? roadmapState.lastCompletedStep,
      "none",
    ),
    nextRecommendedStep: safeText(roadmapState.nextRecommendedStep, "none"),
    openIssueCount: safeNumber(roadmapState.openIssueCount),
    openPrCount: safeNumber(roadmapState.openPrCount),
    latestCiConclusion: normalizeCiConclusion(roadmapState.latestCiConclusion),
    productBacklogAttempted: safeBoolean(
      roadmapState.productBacklogAttempted ?? root.productBacklogAttempted,
    ),
    attemptedCandidateKind: safeText(
      roadmapState.attemptedCandidateKind ?? roadmapState.attemptedWorkKind,
      "none",
    ),
  };
}

function countOpenItems(data: unknown, key: "issues" | "pullRequests"): number {
  if (Array.isArray(data)) {
    return data.filter((entry) => {
      const record = asRecord(entry);
      const state = safeText(record?.state, "open").toLowerCase();
      return state === "open";
    }).length;
  }

  const root = asRecord(data);
  if (!root) return 0;
  const explicit = safeNumber(key === "issues" ? root.openIssueCount : root.openPrCount);
  if (explicit !== null && Number.isInteger(explicit) && explicit >= 0) return explicit;
  const array = asArray(root[key] ?? root.items ?? root.nodes);
  return array.filter((entry) => {
    const record = asRecord(entry);
    const state = safeText(record?.state, "open").toLowerCase();
    return state === "open";
  }).length;
}

function githubIssueSnapshotMetadata(data: unknown): Record<string, string | number | boolean | null> {
  return {
    openIssueCount: countOpenItems(data, "issues"),
  };
}

function githubPrSnapshotMetadata(data: unknown): Record<string, string | number | boolean | null> {
  return {
    openPrCount: countOpenItems(data, "pullRequests"),
  };
}

function ciWorkflowRunsMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  const runs = Array.isArray(data) ? data : asArray(root?.workflowRuns ?? root?.runs ?? root?.items);
  const latest = asRecord(runs.at(-1)) ?? root;
  const latestConclusion = normalizeCiConclusion(
    root?.latestCiConclusion ?? latest?.conclusion ?? latest?.status,
  );

  return {
    runCount: runs.length,
    latestCiConclusion: latestConclusion,
  };
}

function parseArtifactData(artifactId: ArtifactId, text: string): unknown {
  return artifactId === "run-history" ? parseJsonl(text) : JSON.parse(text);
}

function metadataForArtifact(
  artifactId: ArtifactId,
  data: unknown,
): Record<string, string | number | boolean | null> {
  if (artifactId === "run-history") return runHistoryMetadata(data);
  if (artifactId === "ci-repair-plan") return ciRepairMetadata(data);
  if (artifactId === "branch-commit-pr-plan") return genericPlanMetadata(data);
  if (artifactId === "patch-artifact-plan") return genericPlanMetadata(data);
  if (artifactId === "planner-note") return genericPlanMetadata(data);
  if (artifactId === "orchestrator-plan") {
    const root = asRecord(data);
    const nextAction = asRecord(root?.nextAction);
    return {
      status: safeText(root?.status),
      reportOnly: safeBoolean(root?.reportOnly),
      dryRun: safeBoolean(root?.dryRun),
      nextActionCode: safeText(nextAction?.code, "none"),
      willExecuteCommands: safeBoolean(root?.willExecuteCommands),
      codexWillBeInvoked: safeBoolean(root?.codexWillBeInvoked),
    };
  }
  if (artifactId === "codex-invocation") return codexInvocationMetadata(data);
  if (artifactId === "roadmap-state") return roadmapStateMetadata(data);
  if (artifactId === "github-issue-snapshot") return githubIssueSnapshotMetadata(data);
  if (artifactId === "github-pr-snapshot") return githubPrSnapshotMetadata(data);
  if (artifactId === "ci-workflow-runs") return ciWorkflowRunsMetadata(data);

  return {};
}

function readInputArtifact(
  artifactDir: string,
  artifact: InputArtifactDefinition,
): InternalInputArtifact {
  const fullPath = artifactPath(artifactDir, artifact.fileName);
  const relative = normalizePathForArtifact(path.relative(process.cwd(), fullPath));

  if (!fs.existsSync(fullPath)) {
    return {
      artifact: {
        label: artifact.label,
        path: relative,
        status: "missing",
        sha256: null,
        metadata: {},
      },
      data: null,
      sourceId: artifact.id,
    };
  }

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return {
        artifact: {
          label: artifact.label,
          path: relative,
          status: "invalid",
          sha256: null,
          metadata: {
            reason: "not_a_file",
          },
        },
        data: null,
        sourceId: artifact.id,
      };
    }

    const text = fs.readFileSync(fullPath, "utf8");
    const data = parseArtifactData(artifact.id, text);
    assertNoForbiddenInputKeys(data, artifact.label);

    return {
      artifact: {
        label: artifact.label,
        path: relative,
        status: "available",
        sha256: sha256(text),
        metadata: metadataForArtifact(artifact.id, data),
      },
      data,
      sourceId: artifact.id,
    };
  } catch (error) {
    return {
      artifact: {
        label: artifact.label,
        path: relative,
        status: "invalid",
        sha256: null,
        metadata: {
          reason: "unsafe_or_invalid_input",
          message: safeText(error instanceof Error ? error.message : String(error), "invalid"),
        },
      },
      data: null,
      sourceId: artifact.id,
    };
  }
}

function artifactByLabel(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
  label: string,
): AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number] | null {
  return artifacts.find((entry) => entry.label === label) ?? null;
}

function metadataValue(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
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

function defaultCurrentPhase(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "Roadmap state", "currentPhase"),
    metadataValue(artifacts, "Roadmap state", "nextRecommendedStep"),
  ], ["none", "unknown"]);
}

function defaultLastCompletedStep(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "Roadmap state", "lastCompletedAgentFactoryStep"),
    metadataValue(artifacts, "AF011 run history", "latestTaskId"),
  ], ["none", "unknown"]);
}

function defaultNextRecommendedStep(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "Roadmap state", "nextRecommendedStep"),
  ], ["none", "unknown"]);
}

function defaultOpenIssueCount(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): number {
  const explicit = metadataValue(artifacts, "Roadmap state", "openIssueCount");
  if (typeof explicit === "number" && Number.isInteger(explicit) && explicit >= 0) return explicit;
  const snapshot = metadataValue(artifacts, "GitHub issue snapshot", "openIssueCount");
  return typeof snapshot === "number" && Number.isInteger(snapshot) && snapshot >= 0 ? snapshot : 0;
}

function defaultOpenPrCount(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): number {
  const explicit = metadataValue(artifacts, "Roadmap state", "openPrCount");
  if (typeof explicit === "number" && Number.isInteger(explicit) && explicit >= 0) return explicit;
  const snapshot = metadataValue(artifacts, "GitHub PR snapshot", "openPrCount");
  return typeof snapshot === "number" && Number.isInteger(snapshot) && snapshot >= 0 ? snapshot : 0;
}

function defaultLatestCiConclusion(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): AgentFactoryRoadmapAutopilotCiConclusion {
  return normalizeCiConclusion(
    metadataValue(artifacts, "Roadmap state", "latestCiConclusion") ??
      metadataValue(artifacts, "CI workflow runs", "latestCiConclusion") ??
      metadataValue(artifacts, "AF014 CI repair plan", "latestCiConclusion"),
  );
}

function runHistoryRecordCount(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
): number {
  const value = metadataValue(artifacts, "AF011 run history", "recordCount");
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizeStep(value: string | null): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function textMentionsProductBacklog(value: string | null): boolean {
  const text = (value ?? "").toLowerCase();
  return /product|backlog|constitution|curriculum|commercial|runtime acceptance|learner|launch/.test(text);
}

function productBacklogAttempted(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
  roadmapState: AgentFactoryRoadmapAutopilotPlan["roadmapState"],
): boolean {
  const explicit = metadataValue(artifacts, "Roadmap state", "productBacklogAttempted");
  if (explicit === true) return true;
  const attemptedKind = metadataValue(artifacts, "Roadmap state", "attemptedCandidateKind");
  if (typeof attemptedKind === "string" && attemptedKind !== "none") {
    return textMentionsProductBacklog(attemptedKind);
  }
  return textMentionsProductBacklog(roadmapState.currentPhase) ||
    textMentionsProductBacklog(roadmapState.nextRecommendedStep);
}

function hasCiRepairBlocker(
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][],
  roadmapState: AgentFactoryRoadmapAutopilotPlan["roadmapState"],
): boolean {
  const ciRepair = artifactByLabel(artifacts, "AF014 CI repair plan");
  if (ciRepair?.status !== "available") return false;
  const status = String(ciRepair.metadata.status ?? "").toLowerCase();
  const blockedReasonCount = ciRepair.metadata.blockedReasonCount;
  return status === "blocked" ||
    status === "failed" ||
    (roadmapState.latestCiConclusion === "failure" &&
      typeof blockedReasonCount === "number" &&
      blockedReasonCount > 0);
}

function candidate(
  input: Omit<RoadmapCandidate, "reasonCodes"> & { reasonCodes: readonly string[] },
): RoadmapCandidate {
  return {
    ...input,
    reasonCodes: [...new Set(input.reasonCodes)].sort(),
  };
}

function candidateSort(a: RoadmapCandidate, b: RoadmapCandidate): number {
  const statusRank = (status: RoadmapCandidate["status"]): number => {
    if (status === "recommended") return 0;
    if (status === "blocked") return 1;
    if (status === "deferred") return 2;
    return 3;
  };

  return statusRank(a.status) - statusRank(b.status) ||
    b.priorityScore - a.priorityScore ||
    a.id.localeCompare(b.id);
}

function buildCandidates(input: {
  artifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][];
  roadmapState: AgentFactoryRoadmapAutopilotPlan["roadmapState"];
  maxCandidateCount: number;
}): RoadmapCandidate[] {
  const candidates: RoadmapCandidate[] = [];
  const lastCompleted = normalizeStep(input.roadmapState.lastCompletedAgentFactoryStep);
  const currentPhase = normalizeStep(input.roadmapState.currentPhase);
  const nextRecommended = normalizeStep(input.roadmapState.nextRecommendedStep);
  const ciBlocker = hasCiRepairBlocker(input.artifacts, input.roadmapState);
  const productAttempted = productBacklogAttempted(input.artifacts, input.roadmapState);

  if (ciBlocker) {
    candidates.push(candidate({
      id: "ci-repair-follow-up",
      kind: "ci_repair_follow_up",
      label: "Resolve blocked AF014 CI repair metadata before selecting roadmap work.",
      status: "recommended",
      priorityScore: 100,
      risk: "medium",
      reasonCodes: ["unresolved_ci_repair"],
      metadata: {
        latestCiConclusion: input.roadmapState.latestCiConclusion,
        sourceArtifact: "AF014 CI repair plan",
      },
    }));
  }

  if (lastCompleted === "AF014-V") {
    candidates.push(candidate({
      id: "af015-roadmap-autopilot",
      kind: "agent_factory_next_layer",
      label: "AF015 Roadmap Autopilot v1",
      status: ciBlocker ? "not_selected" : "recommended",
      priorityScore: 90,
      risk: "low",
      reasonCodes: ["next_agent_factory_layer", "verification_before_next_layer"],
      metadata: {
        lastCompletedAgentFactoryStep: input.roadmapState.lastCompletedAgentFactoryStep,
      },
    }));
  }

  if (
    currentPhase.includes("AF015") ||
    nextRecommended.includes("AF016") ||
    lastCompleted === "AF015"
  ) {
    candidates.push(candidate({
      id: "af016-end-to-end-factory-dogfood",
      kind: "agent_factory_verification",
      label: "AF016 End-to-End Factory Dogfood",
      status: ciBlocker ? "not_selected" : "recommended",
      priorityScore: 85,
      risk: "low",
      reasonCodes: ["ready_for_af016_dogfood", "next_agent_factory_layer"],
      metadata: {
        currentPhase: input.roadmapState.currentPhase,
        latestCiConclusion: input.roadmapState.latestCiConclusion,
      },
    }));
  }

  if (productAttempted) {
    candidates.push(candidate({
      id: "product-backlog-deferred-until-af016",
      kind: "product_feature",
      label: "Product backlog work remains deferred until AF016 evidence exists.",
      status: "deferred",
      priorityScore: 20,
      risk: "medium",
      reasonCodes: [
        "finish_agent_factory_before_product_backlog",
        "product_backlog_deferred",
      ],
      metadata: {
        currentPhase: input.roadmapState.currentPhase,
        nextRecommendedStep: input.roadmapState.nextRecommendedStep,
      },
    }));
  }

  if (lastCompleted === "AF016" || currentPhase.includes("AF016")) {
    candidates.push(candidate({
      id: "product-constitution-after-af016",
      kind: "product_constitution",
      label: "Product constitution or curriculum work can be reviewed after AF016 evidence.",
      status: "deferred",
      priorityScore: 15,
      risk: "medium",
      reasonCodes: ["product_backlog_deferred"],
      metadata: {
        lastCompletedAgentFactoryStep: input.roadmapState.lastCompletedAgentFactoryStep,
      },
    }));
  }

  if (candidates.length === 0) {
    candidates.push(candidate({
      id: "unknown-roadmap-state",
      kind: "unknown",
      label: "Roadmap state is unknown; do not invent a product task.",
      status: "blocked",
      priorityScore: 10,
      risk: "high",
      reasonCodes: [
        input.roadmapState.currentPhase || input.roadmapState.lastCompletedAgentFactoryStep
          ? "unknown_roadmap_state"
          : "missing_roadmap_state",
      ],
      metadata: {
        currentPhase: input.roadmapState.currentPhase,
        lastCompletedAgentFactoryStep: input.roadmapState.lastCompletedAgentFactoryStep,
      },
    }));
  }

  return candidates
    .sort(candidateSort)
    .slice(0, input.maxCandidateCount)
    .map((entry, index) => ({
      ...entry,
      priorityScore: entry.priorityScore - index,
    }));
}

function selectedCandidateFrom(candidates: readonly RoadmapCandidate[]): RoadmapCandidate | null {
  return candidates.find((entry) => entry.status === "recommended") ??
    candidates.find((entry) => entry.status === "blocked") ??
    null;
}

function truncateToBytes(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  let output = value;
  while (Buffer.byteLength(`${output}\n\n[truncated for AF015 metadata boundary]`, "utf8") > maxBytes && output.length > 0) {
    output = output.slice(0, -1);
  }
  return `${output.trimEnd()}\n\n[truncated for AF015 metadata boundary]`;
}

function generatedIssuePreview(label: string): string {
  return [
    "## Goal",
    "",
    `Prepare ${label} as the next safe Agent Factory step for human review.`,
    "",
    "## Non-goals",
    "",
    "- Do not create issues, branches, commits, pushes, PRs, workflow reruns, merges, rebases, patches, or Codex runs from AF015.",
    "- Do not start product backlog work before AF016 evidence.",
    "",
    "## Risk classification",
    "",
    "- Risk: low",
    "",
    "## Data boundary",
    "",
    "- Metadata-only Agent Factory artifacts; no raw issue bodies, PR bodies, comments, patches, diffs, prompts, learner answers, OCR text, provider payloads, credentials, billing, auth, or payment records.",
    "",
    "## Acceptance criteria",
    "",
    "- Local artifacts remain report-only.",
    "- AF011 run-history append remains metadata-only.",
    "- All mutation and execution flags remain false.",
  ].join("\n");
}

function generatedPrPreview(label: string): string {
  return [
    "## Goal",
    "",
    `Ship ${label}.`,
    "",
    "## Tests and evidence",
    "",
    "- Focused Agent Factory tests.",
    "- Typecheck, lint, default tests, build, and diff whitespace check.",
    "",
    "## Merge recommendation",
    "",
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");
}

function generatedCodexPromptPreview(label: string): string {
  return [
    `Create ${label}.`,
    "",
    "Keep the layer metadata-only and report-only by default.",
    "Preserve AF009, AF010, AF011, AF012, AF013A, AF013B, AF013C, AF014, and AF015 approval and data boundaries.",
    "Do not start Codex, shell commands, patches, GitHub mutations, workflow reruns, merges, rebases, or learner/runtime/provider/billing/auth/payment/OCR/instructor/production changes from this plan.",
  ].join("\n");
}

function proposedNextWorkFor(
  selected: RoadmapCandidate | null,
  maxPromptBytes: number,
): AgentFactoryRoadmapAutopilotPlan["proposedNextWork"] {
  if (!selected || selected.status !== "recommended") {
    return {
      issueTitle: null,
      issueBodyPreview: null,
      branchName: null,
      worktreeName: null,
      prTitle: null,
      prBodyPreview: null,
      codexPromptPreview: null,
      validationCommands: [],
    };
  }

  if (selected.id === "ci-repair-follow-up") {
    const label = "CI repair follow-up metadata review";
    return {
      issueTitle: "[AF014-F] CI Repair Follow-up",
      issueBodyPreview: truncateToBytes(generatedIssuePreview(label), maxPromptBytes),
      branchName: "feat/af014-ci-repair-follow-up",
      worktreeName: "exam-coach-af014-ci-repair-follow-up",
      prTitle: "[AF014-F] CI Repair Follow-up",
      prBodyPreview: truncateToBytes(generatedPrPreview(label), maxPromptBytes),
      codexPromptPreview: truncateToBytes(generatedCodexPromptPreview(label), maxPromptBytes),
      validationCommands: [...VALIDATION_COMMANDS],
    };
  }

  if (selected.id === "af015-roadmap-autopilot") {
    const label = "AF015 Roadmap Autopilot v1";
    return {
      issueTitle: "[AF015] Roadmap Autopilot v1",
      issueBodyPreview: truncateToBytes(generatedIssuePreview(label), maxPromptBytes),
      branchName: "feat/af015-roadmap-autopilot",
      worktreeName: "exam-coach-af015",
      prTitle: "[AF015] Roadmap Autopilot v1",
      prBodyPreview: truncateToBytes(generatedPrPreview(label), maxPromptBytes),
      codexPromptPreview: truncateToBytes(generatedCodexPromptPreview(label), maxPromptBytes),
      validationCommands: [...VALIDATION_COMMANDS],
    };
  }

  if (selected.id === "af016-end-to-end-factory-dogfood") {
    const label = "AF016 End-to-End Factory Dogfood";
    return {
      issueTitle: "[AF016] End-to-End Factory Dogfood",
      issueBodyPreview: truncateToBytes(generatedIssuePreview(label), maxPromptBytes),
      branchName: "feat/af016-end-to-end-factory-dogfood",
      worktreeName: "exam-coach-af016-dogfood",
      prTitle: "[AF016] End-to-End Factory Dogfood",
      prBodyPreview: truncateToBytes(generatedPrPreview(label), maxPromptBytes),
      codexPromptPreview: truncateToBytes(generatedCodexPromptPreview(label), maxPromptBytes),
      validationCommands: [...VALIDATION_COMMANDS],
    };
  }

  return {
    issueTitle: null,
    issueBodyPreview: null,
    branchName: null,
    worktreeName: null,
    prTitle: null,
    prBodyPreview: null,
    codexPromptPreview: null,
    validationCommands: [],
  };
}

function blockedCodesForReasons(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/unsafe local roadmap artifact|invalid local roadmap artifact/i.test(reason)) return "unsafe_metadata_artifact";
    if (/approval gate is missing/i.test(reason)) return "missing_human_approval";
    if (/failed closed/i.test(reason)) return "approval_failed_closed";
    if (/roadmap state is missing/i.test(reason)) return "missing_roadmap_state";
    if (/roadmap state is unknown/i.test(reason)) return "unknown_roadmap_state";
    if (/open issue count|open PR count|candidate count|prompt bytes/i.test(reason)) {
      return "invalid_autopilot_boundary_limit";
    }
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function createPlanId(input: {
  createdAt: string;
  roadmapState: AgentFactoryRoadmapAutopilotPlan["roadmapState"];
  inputArtifacts: readonly AgentFactoryRoadmapAutopilotPlan["inputArtifacts"][number][];
  candidates: readonly RoadmapCandidate[];
}): string {
  const seed = JSON.stringify({
    createdAt: input.createdAt,
    roadmapState: input.roadmapState,
    artifacts: input.inputArtifacts.map((artifact) => ({
      path: artifact.path,
      status: artifact.status,
      sha256: artifact.sha256,
    })),
    candidates: input.candidates.map((entry) => ({
      id: entry.id,
      status: entry.status,
      reasonCodes: entry.reasonCodes,
    })),
  });

  return `af015-${input.createdAt.replace(/\D/g, "").slice(0, 14)}-${sha256(seed).slice(0, 12)}`;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function createAgentFactoryRoadmapAutopilotPlan(
  options: CreateAgentFactoryRoadmapAutopilotPlanOptions = {},
): AgentFactoryRoadmapAutopilotPlan {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const internalInputs = INPUT_ARTIFACTS.map((artifact) => readInputArtifact(artifactDir, artifact));
  const inputArtifacts = internalInputs.map((entry) => entry.artifact);
  const createdAt = (options.now ?? new Date()).toISOString();
  const approvalGate = normalizeApprovalGate(options.approvalGate);
  const maxCandidateCount = normalizePositiveInteger(options.maxCandidateCount, 5);
  const maxPromptBytes = normalizePositiveInteger(options.maxPromptBytes, 4000);
  const invalidOpenIssueCount = hasInvalidExplicitNonNegativeInteger(options.openIssueCount);
  const invalidOpenPrCount = hasInvalidExplicitNonNegativeInteger(options.openPrCount);
  const invalidMaxCandidateCount = hasInvalidExplicitPositiveInteger(options.maxCandidateCount);
  const invalidMaxPromptBytes = hasInvalidExplicitPositiveInteger(options.maxPromptBytes);
  const currentPhase = safeNullableText(options.currentPhase) ?? defaultCurrentPhase(inputArtifacts);
  const lastCompletedAgentFactoryStep =
    safeNullableText(options.lastCompletedStep) ?? defaultLastCompletedStep(inputArtifacts);
  const openIssueCount =
    normalizeNonNegativeInteger(options.openIssueCount) ?? defaultOpenIssueCount(inputArtifacts);
  const openPrCount = normalizeNonNegativeInteger(options.openPrCount) ?? defaultOpenPrCount(inputArtifacts);
  const roadmapStateBase: AgentFactoryRoadmapAutopilotPlan["roadmapState"] = {
    currentPhase,
    lastCompletedAgentFactoryStep,
    nextRecommendedStep: defaultNextRecommendedStep(inputArtifacts),
    openIssueCount,
    openPrCount,
    latestCiConclusion: options.latestCiConclusion
      ? normalizeCiConclusion(options.latestCiConclusion)
      : defaultLatestCiConclusion(inputArtifacts),
    runHistoryRecordCount: runHistoryRecordCount(inputArtifacts),
  };
  const candidates = buildCandidates({
    artifacts: inputArtifacts,
    roadmapState: roadmapStateBase,
    maxCandidateCount,
  });
  const selected = selectedCandidateFrom(candidates);
  const proposedNextWork = proposedNextWorkFor(selected, maxPromptBytes);
  const roadmapState: AgentFactoryRoadmapAutopilotPlan["roadmapState"] = {
    ...roadmapStateBase,
    nextRecommendedStep: selected?.label ?? roadmapStateBase.nextRecommendedStep,
  };
  const blockedReasons = [
    ...inputArtifacts
      .filter((artifact) => artifact.status === "invalid")
      .map((artifact) => `Unsafe local roadmap artifact or invalid local roadmap artifact: ${artifact.label} at ${artifact.path}.`),
  ];

  if (approvalGate === "missing") {
    blockedReasons.push("Human approval gate is missing for the AF015 roadmap autopilot boundary.");
  }

  if (approvalGate === "failed_closed") {
    blockedReasons.push("Human approval gate failed closed; no AF015 roadmap autopilot boundary may continue.");
  }

  if (selected?.status === "blocked" && selected.id === "unknown-roadmap-state") {
    if (selected.reasonCodes.includes("missing_roadmap_state")) {
      blockedReasons.push("Roadmap state is missing; AF015 cannot select product work safely.");
    } else {
      blockedReasons.push("Roadmap state is unknown; AF015 cannot select product work safely.");
    }
  }

  if (invalidOpenIssueCount) {
    blockedReasons.push("Roadmap autopilot open issue count must be zero or greater.");
  }

  if (invalidOpenPrCount) {
    blockedReasons.push("Roadmap autopilot open PR count must be zero or greater.");
  }

  if (invalidMaxCandidateCount) {
    blockedReasons.push("Roadmap autopilot max candidate count must be greater than zero.");
  }

  if (invalidMaxPromptBytes) {
    blockedReasons.push("Roadmap autopilot max prompt bytes must be greater than zero.");
  }

  const status: AgentFactoryRoadmapAutopilotStatus = blockedReasons.length > 0 ? "blocked" : "planned";
  const plan: AgentFactoryRoadmapAutopilotPlan = {
    version: AGENT_FACTORY_ROADMAP_AUTOPILOT_VERSION,
    planId: options.planId ?? createPlanId({
      createdAt,
      roadmapState,
      inputArtifacts,
      candidates,
    }),
    createdAt,
    status,
    reportOnly: true,
    dryRun: true,
    source: {
      script: "agent-factory-roadmap-autopilot",
      repository: safeNullableText(options.repository),
      actor: safeNullableText(options.actor),
      workflowName: safeNullableText(options.workflowName),
      workflowRunId: safeNullableText(options.workflowRunId),
    },
    roadmapState,
    inputArtifacts,
    candidates,
    selectedCandidate: {
      id: status === "blocked" && selected?.id === "unknown-roadmap-state" ? null : selected?.id ?? null,
      label: status === "blocked" && selected?.id === "unknown-roadmap-state" ? null : selected?.label ?? null,
      reasonCodes: status === "blocked" && selected?.id === "unknown-roadmap-state"
        ? []
        : selected?.reasonCodes ?? [],
      risk: status === "blocked" && selected?.id === "unknown-roadmap-state" ? null : selected?.risk ?? null,
    },
    proposedNextWork: status === "blocked" ? {
      issueTitle: null,
      issueBodyPreview: null,
      branchName: null,
      worktreeName: null,
      prTitle: null,
      prBodyPreview: null,
      codexPromptPreview: null,
      validationCommands: [],
    } : proposedNextWork,
    autopilotBoundary: {
      metadataOnlyPlan: true,
      requiresHumanApproval: true,
      approvalGate,
      willMutateWithoutApproval: false,
      maxCandidateCount,
      maxPromptBytes,
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
      willCreateIssue: false,
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
        status === "blocked"
          ? "Review blocked AF015 roadmap metadata before selecting any next work."
          : "Review this AF015 roadmap autopilot plan before opening or executing the next work item.",
      ),
      inertCommandPreview: safeNullableText(
        options.inertCommandPreview ??
          "npm.cmd run agent-factory:roadmap-autopilot -- --artifact-dir .agent-factory --stdout markdown",
      ),
      instructions: normalizeInstructionList(options.instructions, [
        "Review candidate reason codes, risk, local artifact hashes, and data-boundary flags.",
        "Do not create issues, run Codex, run shell commands, create branches, create commits, push, create or update PRs, rerun workflows, merge, rebase, apply patches, or edit source files from this plan.",
        "Keep product backlog work deferred until AF016 End-to-End Factory Dogfood evidence exists.",
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

  assertAgentFactoryRoadmapAutopilotPlanSafe(plan);
  return plan;
}

export function buildAgentFactoryRoadmapAutopilotMarkdown(
  plan: AgentFactoryRoadmapAutopilotPlan,
): string {
  assertAgentFactoryRoadmapAutopilotPlanSafe(plan);

  const artifactLines = plan.inputArtifacts.map((artifact) => {
    const metadata = Object.entries(artifact.metadata)
      .map(([key, value]) => `${key}=${value ?? "unknown"}`)
      .join(", ");
    const suffix = metadata ? ` (${metadata})` : "";
    return `- ${artifact.label}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}${suffix}`;
  });
  const candidateLines = plan.candidates.map((entry) =>
    `- ${entry.id}: ${entry.status}, kind=${entry.kind}, risk=${entry.risk}, score=${entry.priorityScore}, reasons=${entry.reasonCodes.join(", ") || "none"}`,
  );
  const actionLines = Object.entries(plan.actions).map(([key, value]) =>
    `- ${key}: ${value ? "yes" : "no"}`,
  );

  const markdown = [
    "# AF015 Roadmap Autopilot",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Plan id: ${plan.planId}`,
    `Created at: ${plan.createdAt}`,
    "",
    "## Roadmap State",
    "",
    `- Current phase: ${plan.roadmapState.currentPhase ?? "none"}`,
    `- Last completed Agent Factory step: ${plan.roadmapState.lastCompletedAgentFactoryStep ?? "none"}`,
    `- Next recommended step: ${plan.roadmapState.nextRecommendedStep ?? "none"}`,
    `- Open issues: ${plan.roadmapState.openIssueCount}`,
    `- Open PRs: ${plan.roadmapState.openPrCount}`,
    `- Latest CI conclusion: ${plan.roadmapState.latestCiConclusion}`,
    `- Run-history records: ${plan.roadmapState.runHistoryRecordCount}`,
    "",
    "## Input Artifacts",
    "",
    ...artifactLines,
    "",
    "## Candidates",
    "",
    ...formatList(candidateLines.map((line) => line.slice(2))),
    "",
    "## Selected Candidate",
    "",
    `- Id: ${plan.selectedCandidate.id ?? "none"}`,
    `- Label: ${plan.selectedCandidate.label ?? "none"}`,
    `- Risk: ${plan.selectedCandidate.risk ?? "none"}`,
    `- Reason codes: ${plan.selectedCandidate.reasonCodes.join(", ") || "none"}`,
    "",
    "## Proposed Next Work",
    "",
    `- Issue title: ${plan.proposedNextWork.issueTitle ?? "none"}`,
    `- Branch name: ${plan.proposedNextWork.branchName ?? "none"}`,
    `- Worktree name: ${plan.proposedNextWork.worktreeName ?? "none"}`,
    `- PR title: ${plan.proposedNextWork.prTitle ?? "none"}`,
    `- Issue body preview hash: ${plan.proposedNextWork.issueBodyPreview ? sha256(plan.proposedNextWork.issueBodyPreview).slice(0, 12) : "none"}`,
    `- PR body preview hash: ${plan.proposedNextWork.prBodyPreview ? sha256(plan.proposedNextWork.prBodyPreview).slice(0, 12) : "none"}`,
    `- Codex prompt preview hash: ${plan.proposedNextWork.codexPromptPreview ? sha256(plan.proposedNextWork.codexPromptPreview).slice(0, 12) : "none"}`,
    "- Validation commands:",
    ...formatList(plan.proposedNextWork.validationCommands),
    "",
    "## Autopilot Boundary",
    "",
    `- Metadata-only plan: ${plan.autopilotBoundary.metadataOnlyPlan ? "yes" : "no"}`,
    `- Requires human approval: ${plan.autopilotBoundary.requiresHumanApproval ? "yes" : "no"}`,
    `- Approval gate: ${plan.autopilotBoundary.approvalGate}`,
    `- Will mutate without approval: ${plan.autopilotBoundary.willMutateWithoutApproval ? "yes" : "no"}`,
    `- Max candidate count: ${plan.autopilotBoundary.maxCandidateCount}`,
    `- Max prompt bytes: ${plan.autopilotBoundary.maxPromptBytes}`,
    "- Allowed path prefixes:",
    ...formatList(plan.autopilotBoundary.allowedPathPrefixes),
    "- Forbidden path prefixes:",
    ...formatList(plan.autopilotBoundary.forbiddenPathPrefixes),
    "",
    "## Actions",
    "",
    ...actionLines,
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

  assertAgentFactoryRoadmapAutopilotTextSafe(markdown, "AF015 roadmap autopilot Markdown");
  return markdown;
}

export function buildAgentFactoryRoadmapAutopilotSummary(
  plan: AgentFactoryRoadmapAutopilotPlan,
): string {
  assertAgentFactoryRoadmapAutopilotPlanSafe(plan);

  const summary = [
    "# AF015 Roadmap Autopilot",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Approval gate: ${plan.autopilotBoundary.approvalGate}`,
    `Selected candidate: ${plan.selectedCandidate.label ?? "none"}`,
    `Latest CI conclusion: ${plan.roadmapState.latestCiConclusion}`,
    `Codex invoked: ${plan.actions.willRunCodex ? "yes" : "no"}`,
    `Shell commands run: ${plan.actions.willRunShellCommands ? "yes" : "no"}`,
    `Patches applied: ${plan.actions.willApplyPatch ? "yes" : "no"}`,
    `Working tree edited: ${plan.actions.willEditWorkingTree ? "yes" : "no"}`,
    `Issue created: ${plan.actions.willCreateIssue ? "yes" : "no"}`,
    `Branch/commit/push/PR mutated: ${plan.actions.willCreateBranch || plan.actions.willCreateCommit || plan.actions.willPush || plan.actions.willCreateOrUpdatePr ? "yes" : "no"}`,
    `Workflow rerun: ${plan.actions.willRerunWorkflow ? "yes" : "no"}`,
    `Merge or rebase: ${plan.actions.willMergeOrRebase ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    plan.nextHumanStep.label,
    "",
    "## Candidates",
    "",
    ...plan.candidates.map((entry) =>
      `- \`${entry.id}\`: ${entry.status}, risk=${entry.risk}, reasons=${entry.reasonCodes.join(", ") || "none"}`,
    ),
    "",
    "## Proposed Next Work",
    "",
    `- Issue title: ${plan.proposedNextWork.issueTitle ?? "none"}`,
    `- Branch: ${plan.proposedNextWork.branchName ?? "none"}`,
    `- PR title: ${plan.proposedNextWork.prTitle ?? "none"}`,
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertAgentFactoryRoadmapAutopilotTextSafe(summary, "AF015 roadmap autopilot summary");
  return summary;
}

export function assertAgentFactoryRoadmapAutopilotTextSafe(text: string, label: string): void {
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

export function assertAgentFactoryRoadmapAutopilotPlanSafe(value: unknown): void {
  const root = asRecord(value);
  if (!root) throw new Error("AF015 roadmap autopilot plan must be a JSON object.");

  if (root.version !== AGENT_FACTORY_ROADMAP_AUTOPILOT_VERSION) {
    throw new Error("AF015 roadmap autopilot plan version must be 1.");
  }
  if (root.reportOnly !== true) throw new Error("AF015 roadmap autopilot plan must be report-only.");
  if (root.dryRun !== true) throw new Error("AF015 roadmap autopilot plan must be dry-run.");
  if (root.status !== "planned" && root.status !== "blocked") {
    throw new Error("AF015 roadmap autopilot plan status must be planned or blocked.");
  }

  const source = asRecord(root.source);
  if (source?.script !== "agent-factory-roadmap-autopilot") {
    throw new Error("AF015 roadmap autopilot plan source script is invalid.");
  }

  const boundary = asRecord(root.autopilotBoundary);
  if (boundary?.metadataOnlyPlan !== true) {
    throw new Error("AF015 roadmap autopilot plan must be metadata-only.");
  }
  if (boundary?.requiresHumanApproval !== true) {
    throw new Error("AF015 roadmap autopilot plan must require human approval.");
  }
  if (boundary?.willMutateWithoutApproval !== false) {
    throw new Error("AF015 roadmap autopilot plan must not mutate without approval.");
  }
  if (
    boundary?.approvalGate !== "not_requested" &&
    boundary?.approvalGate !== "missing" &&
    boundary?.approvalGate !== "approved" &&
    boundary?.approvalGate !== "failed_closed"
  ) {
    throw new Error("AF015 roadmap autopilot plan approval gate is invalid.");
  }

  const dataBoundary = asRecord(root.dataBoundary);
  if (dataBoundary?.metadataOnly !== true) {
    throw new Error("AF015 roadmap autopilot plan must be metadata-only.");
  }
  if (dataBoundary?.omittedRawPayloads !== true) {
    throw new Error("AF015 roadmap autopilot plan must omit raw payloads.");
  }
  if (dataBoundary?.hashesOnlyForPayloads !== true) {
    throw new Error("AF015 roadmap autopilot plan must use hashes only for payloads.");
  }

  const actions = asRecord(root.actions);
  const actionKeys = [
    "willRunCodex",
    "willRunShellCommands",
    "willApplyPatch",
    "willEditWorkingTree",
    "willCreateIssue",
    "willCreateBranch",
    "willCreateCommit",
    "willPush",
    "willCreateOrUpdatePr",
    "willRerunWorkflow",
    "willMergeOrRebase",
  ] as const;
  for (const key of actionKeys) {
    if (actions?.[key] !== false) {
      throw new Error(`AF015 roadmap autopilot plan action ${key} must be false.`);
    }
  }

  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const entry of candidates) {
    const item = asRecord(entry);
    if (
      item?.kind !== "agent_factory_verification" &&
      item?.kind !== "agent_factory_next_layer" &&
      item?.kind !== "ci_repair_follow_up" &&
      item?.kind !== "product_constitution" &&
      item?.kind !== "product_feature" &&
      item?.kind !== "runtime_acceptance" &&
      item?.kind !== "commercial_readiness" &&
      item?.kind !== "unknown"
    ) {
      throw new Error("AF015 roadmap candidate kind is invalid.");
    }
    if (
      item?.status !== "recommended" &&
      item?.status !== "blocked" &&
      item?.status !== "deferred" &&
      item?.status !== "not_selected"
    ) {
      throw new Error("AF015 roadmap candidate status is invalid.");
    }
    if (item?.risk !== "low" && item?.risk !== "medium" && item?.risk !== "high") {
      throw new Error("AF015 roadmap candidate risk is invalid.");
    }
  }

  const seen = new Set<unknown>();
  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF015 roadmap autopilot plan contains a secret-like value at ${currentPath}.`);
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
        throw new Error(`AF015 roadmap autopilot plan contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
