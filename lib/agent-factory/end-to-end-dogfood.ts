import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const AGENT_FACTORY_END_TO_END_DOGFOOD_VERSION = 1;

export type AgentFactoryEndToEndDogfoodStatus = "planned" | "blocked";

type ArtifactStatus = "available" | "missing" | "invalid";

type ChainStatus = "ready" | "blocked" | "missing" | "optional_missing" | "invalid";

export interface AgentFactoryEndToEndDogfoodPlan {
  version: 1;
  planId: string;
  createdAt: string;
  status: AgentFactoryEndToEndDogfoodStatus;
  reportOnly: true;
  dryRun: true;
  source: {
    script: "agent-factory-end-to-end-dogfood";
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
    headSha: string | null;
  };
  inputArtifacts: Array<{
    label: string;
    path: string;
    status: ArtifactStatus;
    sha256: string | null;
    metadata: Record<string, string | number | boolean | null>;
  }>;
  chain: {
    codexInvocation: ChainEntry;
    runHistory: ChainEntry & {
      optional: true;
      appendEvidence: "present" | "will_append_on_cli" | "invalid";
    };
    orchestrator: ChainEntry;
    plannerNote: ChainEntry;
    patchArtifact: ChainEntry;
    branchCommitPr: ChainEntry;
    ciRepair: ChainEntry;
    roadmapAutopilot: ChainEntry;
  };
  selectedNextWork: {
    id: string | null;
    label: string | null;
    risk: "low" | "medium" | "high" | null;
    reasonCodes: string[];
    issueTitle: string | null;
    branchName: string | null;
    worktreeName: string | null;
    prTitle: string | null;
    previewDigests: {
      issuePreviewSha256: string | null;
      prPreviewSha256: string | null;
      codexPreviewSha256: string | null;
    };
    validationCommandCount: number;
  };
  readiness: {
    completePlanningChain: boolean;
    requiredArtifactCount: number;
    availableRequiredArtifactCount: number;
    blockedUpstreamCount: number;
    invalidArtifactCount: number;
    runHistoryAppendEvidence: "present" | "will_append_on_cli" | "invalid";
    summary: string;
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

export interface ChainEntry {
  artifactLabel: string;
  status: ChainStatus;
  ready: boolean;
  reasonCodes: string[];
  metadata: Record<string, string | number | boolean | null>;
}

export interface CreateAgentFactoryEndToEndDogfoodPlanOptions {
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
  headSha?: string | null;
}

type ArtifactId =
  | "task-packages"
  | "codex-invocation"
  | "orchestrator-plan"
  | "planner-note"
  | "patch-artifact-plan"
  | "branch-commit-pr-plan"
  | "ci-repair-plan"
  | "roadmap-autopilot-plan"
  | "run-history";

interface InputArtifactDefinition {
  id: ArtifactId;
  label: string;
  fileName: string;
  required: boolean;
}

interface InternalInputArtifact {
  artifact: AgentFactoryEndToEndDogfoodPlan["inputArtifacts"][number];
  sourceId: ArtifactId;
  data: unknown;
}

const INPUT_ARTIFACTS: readonly InputArtifactDefinition[] = [
  {
    id: "task-packages",
    label: "AF001 task packages",
    fileName: "codex-task-packages.json",
    required: true,
  },
  {
    id: "codex-invocation",
    label: "AF010 Codex invocation plan",
    fileName: "codex-invocation-plan.json",
    required: true,
  },
  {
    id: "orchestrator-plan",
    label: "AF012 orchestrator plan",
    fileName: "factory-orchestrator-plan.json",
    required: true,
  },
  {
    id: "planner-note",
    label: "AF013A planner note",
    fileName: "factory-planner-note.json",
    required: true,
  },
  {
    id: "patch-artifact-plan",
    label: "AF013B patch artifact plan",
    fileName: "factory-patch-artifact-plan.json",
    required: true,
  },
  {
    id: "branch-commit-pr-plan",
    label: "AF013C branch commit PR plan",
    fileName: "branch-commit-pr-plan.json",
    required: true,
  },
  {
    id: "ci-repair-plan",
    label: "AF014 CI repair plan",
    fileName: "ci-repair-plan.json",
    required: true,
  },
  {
    id: "roadmap-autopilot-plan",
    label: "AF015 roadmap autopilot plan",
    fileName: "roadmap-autopilot-plan.json",
    required: true,
  },
  {
    id: "run-history",
    label: "AF011 run history",
    fileName: "run-history.jsonl",
    required: false,
  },
] as const;

const OUTPUT_ARTIFACTS = [
  ".agent-factory/end-to-end-factory-dogfood-plan.json",
  ".agent-factory/end-to-end-factory-dogfood-plan.md",
  ".agent-factory/agent-factory-end-to-end-dogfood-summary.md",
] as const;

const GUARDRAILS = [
  "AF016 v1 is metadata-only and report-only.",
  "AF016 v1 dogfoods AF010 through AF015 local metadata without executing the proposed work.",
  "AF016 v1 never invokes Codex, runs shell commands from a plan, applies patches, edits source files, or edits the working tree.",
  "AF016 v1 never creates issues, branches, commits, pushes, pull requests, workflow reruns, merges, or rebases.",
  "AF016 v1 never touches learner runtime, OCR, provider, billing, auth, payment, production, instructor, academy, official-source, corpus, or commercial systems.",
  "AF016 v1 stores artifact paths, statuses, hashes, counts, and allowlisted metadata only.",
] as const;

const REQUIRED_ARTIFACT_COUNT = INPUT_ARTIFACTS.filter((artifact) => artifact.required).length;

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
  /^\s*["']?(?:raw[_\-\s]?issue[_\-\s]?body|issueBody)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?pr[_\-\s]?body|rawPrBody|prBody|pull[_\-\s]?request[_\-\s]?body|bodyText)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?comment|comment[_\-\s]?body|raw[_\-\s]?comments?)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?prompt|prompt[_\-\s]?text|prompt[_\-\s]?body|raw[_\-\s]?task[_\-\s]?package[_\-\s]?prompt|task[_\-\s]?package[_\-\s]?prompt)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?patch|rawPatch|patch[_\-\s]?body|source[_\-\s]?patch)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?diff|rawDiff|diff[_\-\s]?body|source[_\-\s]?diff)["']?\s*[:=]/i,
  /^\s*["']?(?:raw[_\-\s]?learner[_\-\s]?(?:content|answer|text)?|learner[_\-\s]?answer|raw[_\-\s]?answer)["']?\s*[:=]/i,
  /^\s*["']?(?:ocr[_\-\s]?(?:text|payload|output)|provider[_\-\s]?payload)["']?\s*[:=]/i,
  /^\s*["']?(?:billing[_\-\s]?(?:data|record|payload)|auth[_\-\s]?(?:data|record|payload|token|secret)|payment[_\-\s]?(?:data|record|payload))["']?\s*[:=]/i,
] as const;

const ALLOWED_INPUT_PREVIEW_KEYS = new Set([
  "issueBodyPreview",
  "prBodyPreview",
  "codexPromptPreview",
]);

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
  /raw.*issue.*body/i,
  /^issueBody$/i,
  /raw.*pr.*body/i,
  /^prBody$/i,
  /pr.*body.*payload/i,
  /pull.*request.*body/i,
  /^bodyText$/i,
  /raw.*comments?/i,
  /^comments?$/i,
  /comment.*body/i,
  /raw.*prompt/i,
  /^prompt$/i,
  /prompt.*text/i,
  /prompt.*body/i,
  /raw.*task.*package.*prompt/i,
  /task.*package.*prompt/i,
  /raw.*patch/i,
  /patch.*body/i,
  /source.*patch/i,
  /raw.*diff/i,
  /diff.*body/i,
  /source.*diff/i,
  /raw.*answer/i,
  /raw.*learner/i,
  /learner.*answer/i,
  /ocr.*(?:text|payload|output)/i,
  /provider.*payload/i,
  /billing.*(?:data|record|payload)/i,
  /auth.*(?:data|record|payload|secret|token)/i,
  /payment.*(?:data|record|payload)/i,
  /private.*user.*content/i,
] as const;

const FORBIDDEN_PLAN_KEY_PATTERNS = [
  ...FORBIDDEN_INPUT_KEY_PATTERNS,
  /^codexPrompt$/i,
  /^repairPrompt$/i,
  /^invocationPrompt$/i,
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

function normalizePositiveNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim()) && Number(value.trim()) > 0) {
    return Number(value.trim());
  }
  return null;
}

function artifactPath(artifactDir: string, fileName: string): string {
  const resolvedDir = path.resolve(process.cwd(), artifactDir);
  const resolvedFile = path.resolve(resolvedDir, fileName);

  if (resolvedFile !== resolvedDir && !resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error(`Unsafe AF016 artifact path: ${fileName}`);
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
      if (forbidden && !ALLOWED_INPUT_PREVIEW_KEYS.has(key)) {
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

function firstMeaningfulString(values: readonly unknown[], ignored: readonly string[] = []): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text && !ignored.includes(text)) return text;
  }
  return null;
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
    promptFieldPresent: typeof first?.codexPrompt === "string" || typeof first?.prompt === "string",
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
    approvedForInvocation: safeBoolean(root.approvedForInvocation),
    canExecute: safeBoolean(root.canExecute),
    codexWillBeInvoked: safeBoolean(root.codexWillBeInvoked),
    metadataOnly: safeBoolean(root.metadataOnly),
    dataBoundarySafe: safeBoolean(dataBoundary?.safe),
    violationCount: safeNumber(dataBoundary?.violationCount),
    itemId: safeText(packageSummary?.itemId ?? taskPackage?.requestedItemId, "none"),
    itemTitle: safeText(packageSummary?.itemTitle, "none"),
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
    mutatesCode: safeBoolean(root.mutatesCode),
    mutatesGitHub: safeBoolean(root.mutatesGitHub),
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
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    maxChangedFiles: safeNumber(boundary?.maxChangedFiles),
    maxDiffBytes: safeNumber(boundary?.maxDiffBytes),
  };
}

function patchArtifactMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const target = asRecord(root.target);
  const boundary = asRecord(root.patchBoundary);
  const proposedPatchArtifacts = asArray(root.proposedPatchArtifacts);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    taskId: safeText(target?.taskId, "none"),
    prNumber: safeNumber(target?.prNumber),
    baseBranch: safeText(target?.baseBranch, "main"),
    proposedBranchName: safeText(target?.proposedBranchName, "none"),
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    patchArtifactOnly: safeBoolean(boundary?.patchArtifactOnly),
    patchAppliedToWorkingTree: safeBoolean(boundary?.patchAppliedToWorkingTree),
    proposedPatchArtifactCount: proposedPatchArtifacts.length,
  };
}

function branchCommitPrMetadata(data: unknown): Record<string, string | number | boolean | null> {
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
    proposedBranchName: safeText(target?.proposedBranchName, "none"),
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    requestedMutationClass: safeText(boundary?.requestedMutationClass, "none"),
    willMutateWithoutApproval: safeBoolean(boundary?.willMutateWithoutApproval),
  };
}

function ciRepairMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const ciState = asRecord(root.ciState);
  const boundary = asRecord(root.repairBoundary);
  const failureClassifications = asArray(root.failureClassifications);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    latestConclusion: safeText(ciState?.latestConclusion, "unknown"),
    observedFailureClassCount: asArray(ciState?.observedFailureClasses).length,
    failureClassificationCount: failureClassifications.length,
    approvalGate: safeText(boundary?.approvalGate, "not_requested"),
    willMutateWithoutApproval: safeBoolean(boundary?.willMutateWithoutApproval),
  };
}

function roadmapAutopilotMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};
  const roadmapState = asRecord(root.roadmapState);
  const selected = asRecord(root.selectedCandidate);
  const proposedNextWork = asRecord(root.proposedNextWork);
  const actions = asRecord(root.actions);

  return {
    status: safeText(root.status),
    reportOnly: safeBoolean(root.reportOnly),
    dryRun: safeBoolean(root.dryRun),
    currentPhase: safeText(roadmapState?.currentPhase, "none"),
    lastCompletedAgentFactoryStep: safeText(roadmapState?.lastCompletedAgentFactoryStep, "none"),
    latestCiConclusion: safeText(roadmapState?.latestCiConclusion, "unknown"),
    selectedCandidateId: safeText(selected?.id, "none"),
    selectedCandidateLabel: safeText(selected?.label, "none"),
    selectedCandidateRisk: safeText(selected?.risk, "none"),
    selectedReasonCodeCount: asArray(selected?.reasonCodes).length,
    proposedIssueTitle: safeText(proposedNextWork?.issueTitle, "none"),
    proposedBranchName: safeText(proposedNextWork?.branchName, "none"),
    proposedPrTitle: safeText(proposedNextWork?.prTitle, "none"),
    willCreateIssue: safeBoolean(actions?.willCreateIssue),
    willRunCodex: safeBoolean(actions?.willRunCodex),
  };
}

function runHistoryMetadata(data: unknown): Record<string, string | number | boolean | null> {
  const records = recordsFromHistory(data);
  const latest = records.at(-1);
  const target = asRecord(latest?.target);
  const endToEndRecords = records.filter((record) => record.source === "agent-factory-end-to-end-dogfood");

  return {
    recordCount: records.length,
    latestSource: safeText(latest?.source, "none"),
    latestStatus: safeText(latest?.status, "none"),
    latestDryRun: safeBoolean(latest?.dryRun),
    latestApprovalGate: safeText(latest?.approvalGateOutcome, "none"),
    latestTaskId: safeText(target?.taskId, "none"),
    latestPrNumber: safeNumber(target?.prNumber),
    endToEndDogfoodRecordCount: endToEndRecords.length,
  };
}

function metadataForArtifact(
  artifactId: ArtifactId,
  data: unknown,
): Record<string, string | number | boolean | null> {
  if (artifactId === "task-packages") return taskPackageMetadata(data);
  if (artifactId === "codex-invocation") return codexInvocationMetadata(data);
  if (artifactId === "orchestrator-plan") return orchestratorMetadata(data);
  if (artifactId === "planner-note") return plannerNoteMetadata(data);
  if (artifactId === "patch-artifact-plan") return patchArtifactMetadata(data);
  if (artifactId === "branch-commit-pr-plan") return branchCommitPrMetadata(data);
  if (artifactId === "ci-repair-plan") return ciRepairMetadata(data);
  if (artifactId === "roadmap-autopilot-plan") return roadmapAutopilotMetadata(data);
  if (artifactId === "run-history") return runHistoryMetadata(data);
  return {};
}

function readInputArtifact(
  artifactDir: string,
  definition: InputArtifactDefinition,
): InternalInputArtifact {
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
    const data = parseArtifactData(definition.id, text);
    assertNoForbiddenInputKeys(data, definition.label);

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
        metadata: { reason: "unsafe_or_invalid_input" },
      },
    };
  }
}

function artifactById(
  artifacts: readonly InternalInputArtifact[],
  id: ArtifactId,
): InternalInputArtifact | null {
  return artifacts.find((entry) => entry.sourceId === id) ?? null;
}

function artifactMetadata(
  artifacts: readonly InternalInputArtifact[],
  id: ArtifactId,
): Record<string, string | number | boolean | null> {
  return artifactById(artifacts, id)?.artifact.metadata ?? {};
}

function metadataValue(
  artifacts: readonly InternalInputArtifact[],
  id: ArtifactId,
  key: string,
): string | number | boolean | null {
  return artifactMetadata(artifacts, id)[key] ?? null;
}

function chainEntry(input: {
  artifacts: readonly InternalInputArtifact[];
  sourceId: ArtifactId;
  artifactLabel: string;
  optional?: boolean;
  blockedCode?: string;
}): ChainEntry {
  const artifact = artifactById(input.artifacts, input.sourceId)?.artifact;
  if (!artifact || artifact.status === "missing") {
    return {
      artifactLabel: input.artifactLabel,
      status: input.optional ? "optional_missing" : "missing",
      ready: Boolean(input.optional),
      reasonCodes: input.optional ? [] : [`missing_${input.sourceId.replaceAll("-", "_")}`],
      metadata: {},
    };
  }

  if (artifact.status === "invalid") {
    return {
      artifactLabel: input.artifactLabel,
      status: "invalid",
      ready: false,
      reasonCodes: ["unsafe_metadata_artifact"],
      metadata: artifact.metadata,
    };
  }

  const upstreamStatus = artifact.metadata.status;
  const blockedCode = input.blockedCode;
  const blocked = upstreamStatus === "blocked" && typeof blockedCode === "string";
  return {
    artifactLabel: input.artifactLabel,
    status: blocked ? "blocked" : "ready",
    ready: !blocked,
    reasonCodes: blocked ? [blockedCode] : [],
    metadata: artifact.metadata,
  };
}

function buildChain(
  artifacts: readonly InternalInputArtifact[],
): AgentFactoryEndToEndDogfoodPlan["chain"] {
  const runHistory = chainEntry({
    artifacts,
    sourceId: "run-history",
    artifactLabel: "AF011 run history",
    optional: true,
  });
  const runHistoryStatus = artifactById(artifacts, "run-history")?.artifact.status;

  return {
    codexInvocation: chainEntry({
      artifacts,
      sourceId: "codex-invocation",
      artifactLabel: "AF010 Codex invocation plan",
    }),
    runHistory: {
      ...runHistory,
      optional: true,
      appendEvidence:
        runHistoryStatus === "invalid"
          ? "invalid"
          : runHistoryStatus === "available"
            ? "present"
            : "will_append_on_cli",
    },
    orchestrator: chainEntry({
      artifacts,
      sourceId: "orchestrator-plan",
      artifactLabel: "AF012 orchestrator plan",
    }),
    plannerNote: chainEntry({
      artifacts,
      sourceId: "planner-note",
      artifactLabel: "AF013A planner note",
      blockedCode: "planner_note_blocked",
    }),
    patchArtifact: chainEntry({
      artifacts,
      sourceId: "patch-artifact-plan",
      artifactLabel: "AF013B patch artifact plan",
      blockedCode: "patch_artifact_plan_blocked",
    }),
    branchCommitPr: chainEntry({
      artifacts,
      sourceId: "branch-commit-pr-plan",
      artifactLabel: "AF013C branch commit PR plan",
      blockedCode: "branch_commit_pr_plan_blocked",
    }),
    ciRepair: chainEntry({
      artifacts,
      sourceId: "ci-repair-plan",
      artifactLabel: "AF014 CI repair plan",
      blockedCode: "ci_repair_plan_blocked",
    }),
    roadmapAutopilot: chainEntry({
      artifacts,
      sourceId: "roadmap-autopilot-plan",
      artifactLabel: "AF015 roadmap autopilot plan",
      blockedCode: "roadmap_autopilot_plan_blocked",
    }),
  };
}

function requiredInputArtifactBlockedReasons(
  artifacts: readonly InternalInputArtifact[],
): string[] {
  const reasons: string[] = [];
  const missingReasons = new Map<ArtifactId, string>([
    ["task-packages", "Required AF001 task package artifact is missing."],
    ["codex-invocation", "Required AF010 invocation plan is missing."],
    ["orchestrator-plan", "Required AF012 orchestrator plan is missing."],
    ["planner-note", "Required AF013A planner note is missing."],
    ["patch-artifact-plan", "Required AF013B patch artifact plan is missing."],
    ["branch-commit-pr-plan", "Required AF013C branch/commit/PR plan is missing."],
    ["ci-repair-plan", "Required AF014 CI repair plan is missing."],
    ["roadmap-autopilot-plan", "Required AF015 roadmap autopilot plan is missing."],
  ]);

  for (const definition of INPUT_ARTIFACTS) {
    const artifact = artifactById(artifacts, definition.id)?.artifact;
    if (artifact?.status === "invalid") {
      reasons.push(`Unsafe local metadata artifact or invalid local metadata artifact: ${artifact.label} at ${artifact.path}.`);
      continue;
    }
    if (definition.required && artifact?.status === "missing") {
      reasons.push(missingReasons.get(definition.id) ?? `Required ${definition.label} is missing.`);
    }
  }

  if (metadataValue(artifacts, "planner-note", "status") === "blocked") {
    reasons.push("AF013A planner note is blocked.");
  }
  if (metadataValue(artifacts, "patch-artifact-plan", "status") === "blocked") {
    reasons.push("AF013B patch artifact plan is blocked.");
  }
  if (metadataValue(artifacts, "branch-commit-pr-plan", "status") === "blocked") {
    reasons.push("AF013C branch/commit/PR plan is blocked.");
  }
  if (metadataValue(artifacts, "ci-repair-plan", "status") === "blocked") {
    reasons.push("AF014 CI repair plan is blocked.");
  }
  if (metadataValue(artifacts, "roadmap-autopilot-plan", "status") === "blocked") {
    reasons.push("AF015 roadmap autopilot plan is blocked.");
  }

  return reasons;
}

function blockedCodesForReasons(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/AF001 task package artifact is missing/i.test(reason)) return "missing_task_package";
    if (/AF010 invocation plan is missing/i.test(reason)) return "missing_codex_invocation_plan";
    if (/AF012 orchestrator plan is missing/i.test(reason)) return "missing_orchestrator_plan";
    if (/AF013A planner note is missing/i.test(reason)) return "missing_planner_note";
    if (/AF013A planner note is blocked/i.test(reason)) return "planner_note_blocked";
    if (/AF013B patch artifact plan is missing/i.test(reason)) return "missing_patch_artifact_plan";
    if (/AF013B patch artifact plan is blocked/i.test(reason)) return "patch_artifact_plan_blocked";
    if (/AF013C branch\/commit\/PR plan is missing/i.test(reason)) return "missing_branch_commit_pr_plan";
    if (/AF013C branch\/commit\/PR plan is blocked/i.test(reason)) return "branch_commit_pr_plan_blocked";
    if (/AF014 CI repair plan is missing/i.test(reason)) return "missing_ci_repair_plan";
    if (/AF014 CI repair plan is blocked/i.test(reason)) return "ci_repair_plan_blocked";
    if (/AF015 roadmap autopilot plan is missing/i.test(reason)) return "missing_roadmap_autopilot_plan";
    if (/AF015 roadmap autopilot plan is blocked/i.test(reason)) return "roadmap_autopilot_plan_blocked";
    if (/unsafe local metadata artifact|invalid local metadata artifact/i.test(reason)) return "unsafe_metadata_artifact";
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function selectedNextWorkFromRoadmap(
  artifacts: readonly InternalInputArtifact[],
): AgentFactoryEndToEndDogfoodPlan["selectedNextWork"] {
  const roadmap = artifactById(artifacts, "roadmap-autopilot-plan")?.data;
  const root = asRecord(roadmap);
  const selected = asRecord(root?.selectedCandidate);
  const proposed = asRecord(root?.proposedNextWork);
  const reasonCodes = asArray(selected?.reasonCodes)
    .map((entry) => safeText(entry, ""))
    .filter(Boolean);
  const validationCommands = asArray(proposed?.validationCommands);
  const digest = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? sha256(value) : null;
  const risk = safeText(selected?.risk, "");

  return {
    id: safeNullableText(selected?.id),
    label: safeNullableText(selected?.label),
    risk: risk === "low" || risk === "medium" || risk === "high" ? risk : null,
    reasonCodes,
    issueTitle: safeNullableText(proposed?.issueTitle),
    branchName: safeNullableText(proposed?.branchName),
    worktreeName: safeNullableText(proposed?.worktreeName),
    prTitle: safeNullableText(proposed?.prTitle),
    previewDigests: {
      issuePreviewSha256: digest(proposed?.issueBodyPreview),
      prPreviewSha256: digest(proposed?.prBodyPreview),
      codexPreviewSha256: digest(proposed?.codexPromptPreview),
    },
    validationCommandCount: validationCommands.length,
  };
}

function defaultTaskId(artifacts: readonly InternalInputArtifact[]): string | null {
  return firstMeaningfulString([
    metadataValue(artifacts, "planner-note", "taskId"),
    metadataValue(artifacts, "patch-artifact-plan", "taskId"),
    metadataValue(artifacts, "branch-commit-pr-plan", "taskId"),
    metadataValue(artifacts, "codex-invocation", "itemId"),
    metadataValue(artifacts, "task-packages", "firstItemId"),
    metadataValue(artifacts, "roadmap-autopilot-plan", "selectedCandidateId"),
  ], ["none", "unknown"]);
}

function defaultIssueNumber(artifacts: readonly InternalInputArtifact[]): number | null {
  for (const value of [
    metadataValue(artifacts, "branch-commit-pr-plan", "issueNumber"),
    metadataValue(artifacts, "task-packages", "issueNumber"),
  ]) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

function defaultPrNumber(artifacts: readonly InternalInputArtifact[]): number | null {
  for (const value of [
    metadataValue(artifacts, "branch-commit-pr-plan", "prNumber"),
    metadataValue(artifacts, "ci-repair-plan", "prNumber"),
    metadataValue(artifacts, "planner-note", "prNumber"),
    metadataValue(artifacts, "run-history", "latestPrNumber"),
  ]) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

function defaultBaseBranch(artifacts: readonly InternalInputArtifact[]): string {
  return firstMeaningfulString([
    metadataValue(artifacts, "branch-commit-pr-plan", "baseBranch"),
    metadataValue(artifacts, "patch-artifact-plan", "baseBranch"),
    metadataValue(artifacts, "planner-note", "baseBranch"),
  ], ["none", "unknown"]) ?? "main";
}

function readinessSummary(input: {
  status: AgentFactoryEndToEndDogfoodStatus;
  availableRequiredArtifactCount: number;
  blockedUpstreamCount: number;
  invalidArtifactCount: number;
  runHistoryAppendEvidence: "present" | "will_append_on_cli" | "invalid";
}): string {
  if (input.status === "planned") {
    return "AF016 has a complete local metadata planning chain from AF010 through AF015 and remains report-only.";
  }
  if (input.invalidArtifactCount > 0) {
    return "AF016 blocked because one or more local metadata artifacts failed the metadata-only safety scan.";
  }
  if (input.availableRequiredArtifactCount < REQUIRED_ARTIFACT_COUNT) {
    return "AF016 blocked because the complete AF010 through AF015 local planning chain is not present.";
  }
  if (input.blockedUpstreamCount > 0) {
    return "AF016 blocked because one or more upstream Agent Factory plans are blocked.";
  }
  if (input.runHistoryAppendEvidence === "invalid") {
    return "AF016 blocked because optional AF011 run-history metadata is unsafe or invalid.";
  }
  return "AF016 blocked pending safe local metadata review.";
}

function createPlanId(input: {
  createdAt: string;
  targetTaskId: string | null;
  inputArtifacts: readonly AgentFactoryEndToEndDogfoodPlan["inputArtifacts"][number][];
  blockedReasonCodes: readonly string[];
}): string {
  const seed = JSON.stringify({
    createdAt: input.createdAt,
    targetTaskId: input.targetTaskId,
    artifacts: input.inputArtifacts.map((artifact) => ({
      path: artifact.path,
      status: artifact.status,
      sha256: artifact.sha256,
    })),
    blockedReasonCodes: input.blockedReasonCodes,
  });

  return `af016-${input.createdAt.replace(/\D/g, "").slice(0, 14)}-${sha256(seed).slice(0, 12)}`;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function createAgentFactoryEndToEndDogfoodPlan(
  options: CreateAgentFactoryEndToEndDogfoodPlanOptions = {},
): AgentFactoryEndToEndDogfoodPlan {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const internalInputs = INPUT_ARTIFACTS.map((artifact) => readInputArtifact(artifactDir, artifact));
  const inputArtifacts = internalInputs.map((entry) => entry.artifact);
  const chain = buildChain(internalInputs);
  const blockedReasons = requiredInputArtifactBlockedReasons(internalInputs);
  const blockedReasonCodes = blockedCodesForReasons(blockedReasons);
  const status: AgentFactoryEndToEndDogfoodStatus = blockedReasons.length > 0 ? "blocked" : "planned";
  const createdAt = (options.now ?? new Date()).toISOString();
  const selectedNextWork = selectedNextWorkFromRoadmap(internalInputs);
  const targetTaskId = safeNullableText(options.taskId) ?? defaultTaskId(internalInputs);
  const issueNumber = normalizePositiveNumber(options.issueNumber) ?? defaultIssueNumber(internalInputs);
  const prNumber = normalizePositiveNumber(options.prNumber) ?? defaultPrNumber(internalInputs);
  const availableRequiredArtifactCount = INPUT_ARTIFACTS
    .filter((definition) => definition.required)
    .filter((definition) => artifactById(internalInputs, definition.id)?.artifact.status === "available")
    .length;
  const invalidArtifactCount = inputArtifacts.filter((artifact) => artifact.status === "invalid").length;
  const blockedUpstreamCount = [
    chain.plannerNote,
    chain.patchArtifact,
    chain.branchCommitPr,
    chain.ciRepair,
    chain.roadmapAutopilot,
  ].filter((entry) => entry.status === "blocked").length;
  const runHistoryAppendEvidence = chain.runHistory.appendEvidence;
  const completePlanningChain = status === "planned" &&
    availableRequiredArtifactCount === REQUIRED_ARTIFACT_COUNT &&
    blockedUpstreamCount === 0 &&
    invalidArtifactCount === 0;
  const plan: AgentFactoryEndToEndDogfoodPlan = {
    version: AGENT_FACTORY_END_TO_END_DOGFOOD_VERSION,
    planId: options.planId ?? createPlanId({
      createdAt,
      targetTaskId,
      inputArtifacts,
      blockedReasonCodes,
    }),
    createdAt,
    status,
    reportOnly: true,
    dryRun: true,
    source: {
      script: "agent-factory-end-to-end-dogfood",
      repository: safeNullableText(options.repository),
      actor: safeNullableText(options.actor),
      workflowName: safeNullableText(options.workflowName),
      workflowRunId: safeNullableText(options.workflowRunId),
    },
    target: {
      taskId: targetTaskId,
      issueNumber,
      prNumber,
      baseBranch: safeText(options.baseBranch, defaultBaseBranch(internalInputs)),
      headSha: safeNullableText(options.headSha),
    },
    inputArtifacts,
    chain,
    selectedNextWork,
    readiness: {
      completePlanningChain,
      requiredArtifactCount: REQUIRED_ARTIFACT_COUNT,
      availableRequiredArtifactCount,
      blockedUpstreamCount,
      invalidArtifactCount,
      runHistoryAppendEvidence,
      summary: readinessSummary({
        status,
        availableRequiredArtifactCount,
        blockedUpstreamCount,
        invalidArtifactCount,
        runHistoryAppendEvidence,
      }),
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
    blockedReasons,
    blockedReasonCodes,
    dataBoundary: {
      metadataOnly: true,
      omittedRawPayloads: true,
      hashesOnlyForPayloads: true,
    },
    guardrails: [...GUARDRAILS],
    artifacts: [...OUTPUT_ARTIFACTS],
  };

  assertAgentFactoryEndToEndDogfoodPlanSafe(plan);
  return plan;
}

export function buildAgentFactoryEndToEndDogfoodMarkdown(
  plan: AgentFactoryEndToEndDogfoodPlan,
): string {
  assertAgentFactoryEndToEndDogfoodPlanSafe(plan);

  const artifactLines = plan.inputArtifacts.map((artifact) => {
    const metadata = Object.entries(artifact.metadata)
      .map(([key, value]) => `${key}=${value ?? "unknown"}`)
      .join(", ");
    const suffix = metadata ? ` (${metadata})` : "";
    return `- ${artifact.label}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}${suffix}`;
  });
  const chainLines = Object.entries(plan.chain).map(([key, entry]) =>
    `- ${key}: ${entry.status}, ready=${entry.ready ? "yes" : "no"}, reasons=${entry.reasonCodes.join(", ") || "none"}`,
  );
  const actionLines = Object.entries(plan.actions).map(([key, value]) =>
    `- ${key}: ${value ? "yes" : "no"}`,
  );

  const markdown = [
    "# AF016 End-to-End Factory Dogfood",
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
    `- Head SHA: ${plan.target.headSha ?? "none"}`,
    "",
    "## Input Artifacts",
    "",
    ...artifactLines,
    "",
    "## Chain",
    "",
    ...chainLines,
    "",
    "## Selected Next Work",
    "",
    `- Id: ${plan.selectedNextWork.id ?? "none"}`,
    `- Label: ${plan.selectedNextWork.label ?? "none"}`,
    `- Risk: ${plan.selectedNextWork.risk ?? "none"}`,
    `- Reason codes: ${plan.selectedNextWork.reasonCodes.join(", ") || "none"}`,
    `- Issue title: ${plan.selectedNextWork.issueTitle ?? "none"}`,
    `- Branch: ${plan.selectedNextWork.branchName ?? "none"}`,
    `- Worktree: ${plan.selectedNextWork.worktreeName ?? "none"}`,
    `- PR title: ${plan.selectedNextWork.prTitle ?? "none"}`,
    `- Issue preview hash: ${plan.selectedNextWork.previewDigests.issuePreviewSha256?.slice(0, 12) ?? "none"}`,
    `- PR preview hash: ${plan.selectedNextWork.previewDigests.prPreviewSha256?.slice(0, 12) ?? "none"}`,
    `- Codex preview hash: ${plan.selectedNextWork.previewDigests.codexPreviewSha256?.slice(0, 12) ?? "none"}`,
    `- Validation commands: ${plan.selectedNextWork.validationCommandCount}`,
    "",
    "## Readiness",
    "",
    `- Complete planning chain: ${plan.readiness.completePlanningChain ? "yes" : "no"}`,
    `- Required artifacts: ${plan.readiness.availableRequiredArtifactCount}/${plan.readiness.requiredArtifactCount}`,
    `- Blocked upstream count: ${plan.readiness.blockedUpstreamCount}`,
    `- Invalid artifact count: ${plan.readiness.invalidArtifactCount}`,
    `- Run-history append evidence: ${plan.readiness.runHistoryAppendEvidence}`,
    `- Summary: ${plan.readiness.summary}`,
    "",
    "## Actions",
    "",
    ...actionLines,
    "",
    "## Blocked Reasons",
    "",
    ...formatList(plan.blockedReasons),
    "",
    "## Data Boundary",
    "",
    "- no raw issue body",
    "- no raw PR body",
    "- no raw comments",
    "- no raw prompt text",
    "- no raw task-package prompt",
    "- no raw patch text",
    "- no raw diff text",
    "- no learner answers",
    "- no OCR payload",
    "- no provider payload",
    "- no credentials/secrets",
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
  ].join("\n");

  assertAgentFactoryEndToEndDogfoodTextSafe(markdown, "AF016 end-to-end dogfood Markdown");
  return markdown;
}

export function buildAgentFactoryEndToEndDogfoodSummary(
  plan: AgentFactoryEndToEndDogfoodPlan,
): string {
  assertAgentFactoryEndToEndDogfoodPlanSafe(plan);

  const summary = [
    "# AF016 End-to-End Factory Dogfood",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Complete planning chain: ${plan.readiness.completePlanningChain ? "yes" : "no"}`,
    `Required artifacts: ${plan.readiness.availableRequiredArtifactCount}/${plan.readiness.requiredArtifactCount}`,
    `Run-history append evidence: ${plan.readiness.runHistoryAppendEvidence}`,
    `Selected next work: ${plan.selectedNextWork.label ?? "none"}`,
    `Codex invoked: ${plan.actions.willRunCodex ? "yes" : "no"}`,
    `Shell commands run: ${plan.actions.willRunShellCommands ? "yes" : "no"}`,
    `Patches applied: ${plan.actions.willApplyPatch ? "yes" : "no"}`,
    `Source files edited by AF016: ${plan.actions.willEditWorkingTree ? "yes" : "no"}`,
    `Issue created: ${plan.actions.willCreateIssue ? "yes" : "no"}`,
    `Branch created: ${plan.actions.willCreateBranch ? "yes" : "no"}`,
    `Commit created: ${plan.actions.willCreateCommit ? "yes" : "no"}`,
    `Push performed: ${plan.actions.willPush ? "yes" : "no"}`,
    `PR created/updated: ${plan.actions.willCreateOrUpdatePr ? "yes" : "no"}`,
    `Workflow rerun: ${plan.actions.willRerunWorkflow ? "yes" : "no"}`,
    `Merge/rebase: ${plan.actions.willMergeOrRebase ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    plan.readiness.summary,
    "",
    "## Blocked Reason Codes",
    "",
    ...formatList(plan.blockedReasonCodes),
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertAgentFactoryEndToEndDogfoodTextSafe(summary, "AF016 end-to-end dogfood summary");
  return summary;
}

export function assertAgentFactoryEndToEndDogfoodTextSafe(text: string, label: string): void {
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

export function assertAgentFactoryEndToEndDogfoodPlanSafe(value: unknown): void {
  const root = asRecord(value);
  if (!root) throw new Error("AF016 end-to-end dogfood plan must be a JSON object.");

  if (root.version !== AGENT_FACTORY_END_TO_END_DOGFOOD_VERSION) {
    throw new Error("AF016 end-to-end dogfood plan version must be 1.");
  }
  if (root.reportOnly !== true) throw new Error("AF016 end-to-end dogfood plan must be report-only.");
  if (root.dryRun !== true) throw new Error("AF016 end-to-end dogfood plan must be dry-run.");
  if (root.status !== "planned" && root.status !== "blocked") {
    throw new Error("AF016 end-to-end dogfood plan status must be planned or blocked.");
  }

  const source = asRecord(root.source);
  if (source?.script !== "agent-factory-end-to-end-dogfood") {
    throw new Error("AF016 end-to-end dogfood plan source script is invalid.");
  }

  const readiness = asRecord(root.readiness);
  if (typeof readiness?.completePlanningChain !== "boolean") {
    throw new Error("AF016 end-to-end dogfood plan readiness summary is invalid.");
  }

  const dataBoundary = asRecord(root.dataBoundary);
  if (dataBoundary?.metadataOnly !== true) {
    throw new Error("AF016 end-to-end dogfood plan must be metadata-only.");
  }
  if (dataBoundary?.omittedRawPayloads !== true) {
    throw new Error("AF016 end-to-end dogfood plan must omit raw payloads.");
  }
  if (dataBoundary?.hashesOnlyForPayloads !== true) {
    throw new Error("AF016 end-to-end dogfood plan must use hashes only for payloads.");
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
      throw new Error(`AF016 end-to-end dogfood plan action ${key} must be false.`);
    }
  }

  const chain = asRecord(root.chain);
  for (const key of [
    "codexInvocation",
    "runHistory",
    "orchestrator",
    "plannerNote",
    "patchArtifact",
    "branchCommitPr",
    "ciRepair",
    "roadmapAutopilot",
  ]) {
    const entry = asRecord(chain?.[key]);
    if (
      entry?.status !== "ready" &&
      entry?.status !== "blocked" &&
      entry?.status !== "missing" &&
      entry?.status !== "optional_missing" &&
      entry?.status !== "invalid"
    ) {
      throw new Error(`AF016 end-to-end dogfood chain entry ${key} status is invalid.`);
    }
    if (typeof entry?.ready !== "boolean") {
      throw new Error(`AF016 end-to-end dogfood chain entry ${key} readiness is invalid.`);
    }
  }

  const seen = new Set<unknown>();
  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF016 end-to-end dogfood plan contains a secret-like value at ${currentPath}.`);
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
        throw new Error(`AF016 end-to-end dogfood plan contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
