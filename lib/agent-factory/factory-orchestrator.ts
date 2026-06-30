import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  readRecentAgentFactoryRunHistory,
  type AgentFactoryRunHistoryRecord,
} from "./run-history";

export const AGENT_FACTORY_ORCHESTRATOR_VERSION = 1;

export type AgentFactoryOrchestratorStatus = "planned" | "blocked";

export type AgentFactoryOrchestratorActionCode =
  | "run_plan_only"
  | "run_codex_invocation_dry_run"
  | "review_codex_invocation_rejection"
  | "run_watch_live"
  | "wait_for_ci"
  | "run_repair_plan"
  | "review_repair_plan"
  | "review_run_history";

export interface AgentFactoryOrchestratorArtifactSummary {
  id: string;
  label: string;
  path: string;
  status: "available" | "missing" | "invalid";
  sha256: string | null;
  updatedAt: string | null;
  metadata: Record<string, string | number | boolean | null>;
  message: string;
}

export interface AgentFactoryOrchestratorPlan {
  version: 1;
  orchestrator: "af012-factory-orchestrator";
  status: AgentFactoryOrchestratorStatus;
  reportOnly: true;
  dryRun: true;
  willExecuteCommands: false;
  codexWillBeInvoked: false;
  mutatesCode: false;
  mutatesGitHub: false;
  mutatesRuntimeState: false;
  mutatesBranchState: false;
  generatedAt: string;
  artifactDir: string;
  nextAction: {
    code: AgentFactoryOrchestratorActionCode;
    label: string;
    command: string | null;
    requiresHuman: boolean;
  };
  artifactSummary: AgentFactoryOrchestratorArtifactSummary[];
  history: {
    available: boolean;
    recordCount: number;
    latestRunId: string | null;
    latestSource: string | null;
    latestStatus: string | null;
  };
  blockedReasons: string[];
  blockedReasonCodes: string[];
  guardrails: string[];
  dataBoundary: {
    metadataOnly: true;
    inspectedArtifactCount: number;
    omittedRawPayloads: true;
  };
  artifacts: string[];
}

export interface CreateAgentFactoryOrchestratorPlanOptions {
  artifactDir?: string;
  now?: Date;
}

const ARTIFACTS = [
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
    id: "ci-watcher",
    label: "AF002 CI watcher report",
    fileName: "ci-watcher-report.json",
  },
  {
    id: "repair-plan",
    label: "AF004 safe repair plan",
    fileName: "safe-repair-plan.json",
  },
  {
    id: "mutation-plan",
    label: "AF009 mutation plan",
    fileName: "mutation-plan.json",
  },
] as const;

const GUARDRAILS = [
  "AF012 v1 is report-only and never runs recommended commands.",
  "AF012 v1 never invokes Codex.",
  "AF012 v1 never mutates code, branches, commits, pushes, merges, rebases, workflow runs, or GitHub metadata.",
  "AF012 v1 never calls learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs.",
  "AF012 v1 summarizes local generated artifacts with allowlisted metadata, hashes, and counts only.",
] as const;

const OUTPUT_ARTIFACTS = [
  ".agent-factory/factory-orchestrator-plan.json",
  ".agent-factory/factory-orchestrator-plan.md",
  ".agent-factory/agent-factory-orchestrator-summary.md",
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

const FORBIDDEN_OUTPUT_KEY_PATTERNS = [
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

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
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

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function safeResolveArtifactDir(artifactDir: string): string {
  return path.resolve(process.cwd(), artifactDir);
}

function artifactPath(artifactDir: string, fileName: string): string {
  const resolvedDir = safeResolveArtifactDir(artifactDir);
  const resolvedFile = path.resolve(resolvedDir, fileName);

  if (resolvedFile !== resolvedDir && !resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error(`Unsafe Agent Factory artifact path: ${fileName}`);
  }

  return resolvedFile;
}

function readJsonArtifact(
  artifactDir: string,
  artifact: (typeof ARTIFACTS)[number],
): AgentFactoryOrchestratorArtifactSummary & { data: unknown } {
  const fullPath = artifactPath(artifactDir, artifact.fileName);
  const relative = normalizePathForArtifact(path.relative(process.cwd(), fullPath));

  if (!fs.existsSync(fullPath)) {
    return {
      id: artifact.id,
      label: artifact.label,
      path: relative,
      status: "missing",
      sha256: null,
      updatedAt: null,
      metadata: {},
      message: `Missing ${artifact.fileName}.`,
      data: null,
    };
  }

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return {
        id: artifact.id,
        label: artifact.label,
        path: relative,
        status: "invalid",
        sha256: null,
        updatedAt: null,
        metadata: {},
        message: `${artifact.fileName} is not a file.`,
        data: null,
      };
    }

    const text = fs.readFileSync(fullPath, "utf8");
    const data = JSON.parse(text);

    return {
      id: artifact.id,
      label: artifact.label,
      path: relative,
      status: "available",
      sha256: sha256(text),
      updatedAt: stat.mtime.toISOString(),
      metadata: metadataForArtifact(artifact.id, data),
      message: `Loaded ${artifact.fileName}.`,
      data,
    };
  } catch (error) {
    return {
      id: artifact.id,
      label: artifact.label,
      path: relative,
      status: "invalid",
      sha256: null,
      updatedAt: null,
      metadata: {},
      message: `${artifact.fileName} could not be parsed safely: ${error instanceof Error ? error.message : String(error)}`,
      data: null,
    };
  }
}

function metadataForArtifact(
  artifactId: string,
  data: unknown,
): Record<string, string | number | boolean | null> {
  const root = asRecord(data);
  if (!root) return {};

  if (artifactId === "task-packages") {
    const packages = asArray(root.packages).map(asRecord).filter(Boolean);
    const first = packages[0] ?? null;
    return {
      selectedTaskCount: safeNumber(root.selectedTaskCount) ?? packages.length,
      firstItemId: safeText(first?.itemId ?? asArray(root.selectedItemIds)[0], "none"),
      hasPackages: packages.length > 0,
    };
  }

  if (artifactId === "codex-invocation") {
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

  if (artifactId === "ci-watcher") {
    const workflowSummary = asRecord(root.workflowSummary);
    return {
      prNumber: safeNumber(root.prNumber),
      workflowState: safeText(workflowSummary?.state),
      failed: safeNumber(workflowSummary?.failed),
      pending: safeNumber(workflowSummary?.pending),
      recommendedActionCount: asArray(root.recommendedNextActions).length,
    };
  }

  if (artifactId === "repair-plan") {
    return {
      repairDomain: safeText(root.repairDomain),
      repairAllowed: safeBoolean(root.repairAllowed),
      humanApprovalRequired: safeBoolean(root.humanApprovalRequired),
      blockedReasonCount: asArray(root.blockedReasons).length,
    };
  }

  if (artifactId === "mutation-plan") {
    return {
      status: safeText(root.status),
      intent: safeText(root.intent),
      prNumber: safeNumber(root.prNumber),
      dryRun: safeBoolean(root.dryRun),
      approvedForMutation: safeBoolean(root.approvedForMutation),
    };
  }

  return {};
}

function artifactById(
  artifacts: readonly (AgentFactoryOrchestratorArtifactSummary & { data: unknown })[],
  id: string,
): (AgentFactoryOrchestratorArtifactSummary & { data: unknown }) | null {
  return artifacts.find((artifact) => artifact.id === id) ?? null;
}

function selectedItemId(taskPackages: AgentFactoryOrchestratorArtifactSummary & { data: unknown }): string | null {
  const root = asRecord(taskPackages.data);
  if (!root) return null;
  const firstSelected = asArray(root.selectedItemIds)[0];
  if (typeof firstSelected === "string" && firstSelected.trim()) return safeText(firstSelected, "none");
  const firstPackage = asRecord(asArray(root.packages)[0]);
  const itemId = firstPackage?.itemId;
  return typeof itemId === "string" && itemId.trim() ? safeText(itemId, "none") : null;
}

function taskPackageCount(taskPackages: AgentFactoryOrchestratorArtifactSummary & { data: unknown }): number {
  const root = asRecord(taskPackages.data);
  if (!root) return 0;
  return asArray(root.packages).length;
}

function runHistorySummary(artifactDir: string): AgentFactoryOrchestratorPlan["history"] {
  const historyPath = artifactPath(artifactDir, "run-history.jsonl");

  if (!fs.existsSync(historyPath)) {
    return {
      available: false,
      recordCount: 0,
      latestRunId: null,
      latestSource: null,
      latestStatus: null,
    };
  }

  let records: AgentFactoryRunHistoryRecord[] = [];
  try {
    records = readRecentAgentFactoryRunHistory({
      historyPath,
      limit: 25,
    });
  } catch {
    records = [];
  }
  const latest = records.at(-1);

  return {
    available: records.length > 0,
    recordCount: records.length,
    latestRunId: latest?.runId ?? null,
    latestSource: latest?.source ?? null,
    latestStatus: latest?.status ?? null,
  };
}

function blockedReasonCodes(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/invalid|parse|not a file/i.test(reason)) return "invalid_artifact";
    if (/codex invocation.*rejected|data boundary|violation/i.test(reason)) return "codex_invocation_rejected";
    if (/task package/i.test(reason)) return "missing_task_package";
    return "blocked";
  });

  return [...new Set(codes)].sort();
}

function decideNextAction(
  artifactDir: string,
  artifacts: readonly (AgentFactoryOrchestratorArtifactSummary & { data: unknown })[],
): Pick<AgentFactoryOrchestratorPlan, "status" | "nextAction" | "blockedReasons" | "blockedReasonCodes"> {
  const invalidArtifacts = artifacts.filter((artifact) => artifact.status === "invalid");
  if (invalidArtifacts.length > 0) {
    const reasons = invalidArtifacts.map((artifact) => `${artifact.label} is invalid: ${artifact.message}`);
    return {
      status: "blocked",
      nextAction: {
        code: "review_run_history",
        label: "Review invalid local Agent Factory artifacts before orchestration.",
        command: null,
        requiresHuman: true,
      },
      blockedReasons: reasons,
      blockedReasonCodes: blockedReasonCodes(reasons),
    };
  }

  const taskPackages = artifactById(artifacts, "task-packages");
  if (!taskPackages || taskPackages.status !== "available") {
    return {
      status: "planned",
      nextAction: {
        code: "run_plan_only",
        label: "Generate the next Agent Factory task package.",
        command: "npm.cmd run agent-factory:run -- --mode plan_only --target auto --max-tasks 1 --stdout markdown --allow-mutation false",
        requiresHuman: true,
      },
      blockedReasons: [],
      blockedReasonCodes: [],
    };
  }

  const packageCount = taskPackageCount(taskPackages);
  if (packageCount === 0) {
    const reasons = ["Task package artifact is available but contains no selected packages."];
    return {
      status: "blocked",
      nextAction: {
        code: "review_run_history",
        label: "Review planner output before continuing.",
        command: null,
        requiresHuman: true,
      },
      blockedReasons: reasons,
      blockedReasonCodes: blockedReasonCodes(reasons),
    };
  }

  const codexPlan = artifactById(artifacts, "codex-invocation");
  if (!codexPlan || codexPlan.status !== "available") {
    const itemId = selectedItemId(taskPackages);
    const itemFlag = itemId && itemId !== "none" ? ` --item-id ${itemId}` : "";
    return {
      status: "planned",
      nextAction: {
        code: "run_codex_invocation_dry_run",
        label: "Prepare an AF010 Codex invocation dry-run plan for the selected package.",
        command: `npm.cmd run agent-factory:codex-invocation -- --input ${normalizePathForArtifact(path.join(artifactDir, "codex-task-packages.json"))}${itemFlag} --stdout markdown`,
        requiresHuman: true,
      },
      blockedReasons: [],
      blockedReasonCodes: [],
    };
  }

  const codexRoot = asRecord(codexPlan.data);
  if (codexRoot?.status === "rejected") {
    const reasons = ["AF010 Codex invocation plan is rejected; review blocked reason codes before continuing."];
    return {
      status: "blocked",
      nextAction: {
        code: "review_codex_invocation_rejection",
        label: "Review AF010 rejection and repair the sanitized task package metadata.",
        command: null,
        requiresHuman: true,
      },
      blockedReasons: reasons,
      blockedReasonCodes: blockedReasonCodes(reasons),
    };
  }

  const ciWatcher = artifactById(artifacts, "ci-watcher");
  if (!ciWatcher || ciWatcher.status !== "available") {
    return {
      status: "planned",
      nextAction: {
        code: "run_watch_live",
        label: "Inspect PR/CI metadata with AF007 read-only live mode when a PR exists.",
        command: "npm.cmd run agent-factory:run -- --mode watch_live --pr-number <pr-number> --stdout markdown --allow-mutation false",
        requiresHuman: true,
      },
      blockedReasons: [],
      blockedReasonCodes: [],
    };
  }

  const workflowState = ciWatcher.metadata.workflowState;
  if (workflowState === "pending") {
    return {
      status: "planned",
      nextAction: {
        code: "wait_for_ci",
        label: "Wait for pending CI before requesting any repair plan.",
        command: null,
        requiresHuman: true,
      },
      blockedReasons: [],
      blockedReasonCodes: [],
    };
  }

  const repairPlan = artifactById(artifacts, "repair-plan");
  if (workflowState === "failed" && (!repairPlan || repairPlan.status !== "available")) {
    return {
      status: "planned",
      nextAction: {
        code: "run_repair_plan",
        label: "Generate an AF004 report-only repair plan from the CI watcher report.",
        command: "npm.cmd run agent-factory:run -- --mode repair_plan --target auto --stdout markdown --allow-mutation false",
        requiresHuman: true,
      },
      blockedReasons: [],
      blockedReasonCodes: [],
    };
  }

  if (repairPlan?.status === "available") {
    return {
      status: "planned",
      nextAction: {
        code: "review_repair_plan",
        label: "Review the AF004 repair plan; AF012 v1 does not execute repairs.",
        command: null,
        requiresHuman: true,
      },
      blockedReasons: [],
      blockedReasonCodes: [],
    };
  }

  return {
    status: "planned",
    nextAction: {
      code: "review_run_history",
      label: "Review Agent Factory run history and generated artifacts.",
      command: null,
      requiresHuman: true,
    },
    blockedReasons: [],
    blockedReasonCodes: [],
  };
}

export function createAgentFactoryOrchestratorPlan(
  options: CreateAgentFactoryOrchestratorPlanOptions = {},
): AgentFactoryOrchestratorPlan {
  const artifactDir = options.artifactDir ?? ".agent-factory";
  const artifactsWithData = ARTIFACTS.map((artifact) => readJsonArtifact(artifactDir, artifact));
  const decision = decideNextAction(artifactDir, artifactsWithData);
  const artifactSummary = artifactsWithData.map((artifact) => ({
    id: artifact.id,
    label: artifact.label,
    path: artifact.path,
    status: artifact.status,
    sha256: artifact.sha256,
    updatedAt: artifact.updatedAt,
    metadata: artifact.metadata,
    message: artifact.message,
  }));
  const plan: AgentFactoryOrchestratorPlan = {
    version: AGENT_FACTORY_ORCHESTRATOR_VERSION,
    orchestrator: "af012-factory-orchestrator",
    status: decision.status,
    reportOnly: true,
    dryRun: true,
    willExecuteCommands: false,
    codexWillBeInvoked: false,
    mutatesCode: false,
    mutatesGitHub: false,
    mutatesRuntimeState: false,
    mutatesBranchState: false,
    generatedAt: (options.now ?? new Date()).toISOString(),
    artifactDir: normalizePathForArtifact(artifactDir),
    nextAction: decision.nextAction,
    artifactSummary,
    history: runHistorySummary(artifactDir),
    blockedReasons: decision.blockedReasons,
    blockedReasonCodes: decision.blockedReasonCodes,
    guardrails: [...GUARDRAILS],
    dataBoundary: {
      metadataOnly: true,
      inspectedArtifactCount: artifactSummary.filter((artifact) => artifact.status === "available").length,
      omittedRawPayloads: true,
    },
    artifacts: [...OUTPUT_ARTIFACTS],
  };

  assertAgentFactoryOrchestratorPlanSafe(plan);
  return plan;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function buildAgentFactoryOrchestratorMarkdown(plan: AgentFactoryOrchestratorPlan): string {
  const artifactLines = plan.artifactSummary.map((artifact) => {
    const metadata = Object.entries(artifact.metadata)
      .map(([key, value]) => `${key}=${value ?? "unknown"}`)
      .join(", ");
    const suffix = metadata ? ` (${metadata})` : "";
    return `- ${artifact.label}: ${artifact.status}, ${artifact.sha256 ? artifact.sha256.slice(0, 12) : "no hash"}${suffix}`;
  });
  const markdown = [
    "# AF012 Factory Orchestrator",
    "",
    `Status: ${plan.status}`,
    `Report-only: ${plan.reportOnly ? "yes" : "no"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Will execute commands: ${plan.willExecuteCommands ? "yes" : "no"}`,
    `Codex will be invoked: ${plan.codexWillBeInvoked ? "yes" : "no"}`,
    "",
    "## Next Action",
    "",
    `- Code: ${plan.nextAction.code}`,
    `- Label: ${plan.nextAction.label}`,
    `- Command: ${plan.nextAction.command ?? "none"}`,
    `- Requires human: ${plan.nextAction.requiresHuman ? "yes" : "no"}`,
    "",
    "## Artifacts",
    "",
    ...artifactLines,
    "",
    "## History",
    "",
    `- Available: ${plan.history.available ? "yes" : "no"}`,
    `- Recent records: ${plan.history.recordCount}`,
    `- Latest run id: ${plan.history.latestRunId ?? "none"}`,
    `- Latest source: ${plan.history.latestSource ?? "none"}`,
    `- Latest status: ${plan.history.latestStatus ?? "none"}`,
    "",
    "## Blocked Reasons",
    "",
    ...formatList(plan.blockedReasons),
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertAgentFactoryOrchestratorTextSafe(markdown, "AF012 orchestrator Markdown");
  return markdown;
}

export function buildAgentFactoryOrchestratorSummary(plan: AgentFactoryOrchestratorPlan): string {
  const summary = [
    "# AF012 Factory Orchestrator",
    "",
    `Status: ${plan.status}`,
    `Next action: ${plan.nextAction.code}`,
    `Codex invoked: ${plan.codexWillBeInvoked ? "yes" : "no"}`,
    `Commands executed: ${plan.willExecuteCommands ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    plan.nextAction.label,
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertAgentFactoryOrchestratorTextSafe(summary, "AF012 orchestrator summary");
  return summary;
}

export function assertAgentFactoryOrchestratorTextSafe(text: string, label: string): void {
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`${label} contains a secret-like value.`);
    }
  }

  const unsafeLine = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .find((line) => SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)));
  if (unsafeLine) {
    throw new Error(`${label} contains a raw-content or credential-like labeled field.`);
  }
}

export function assertAgentFactoryOrchestratorPlanSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF012 orchestrator artifact contains a secret-like value at ${currentPath}.`);
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
      const forbidden = FORBIDDEN_OUTPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`AF012 orchestrator artifact contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
