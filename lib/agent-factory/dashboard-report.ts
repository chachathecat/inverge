import fs from "node:fs";
import path from "node:path";

export type AgentFactoryArtifactStatus = "available" | "missing" | "invalid";

export interface AgentFactoryArtifactSummary {
  id: string;
  label: string;
  fileName: string;
  status: AgentFactoryArtifactStatus;
  updatedAt: string | null;
  message: string;
}

export interface AgentFactoryNextWorkPackage {
  status: AgentFactoryArtifactStatus;
  items: Array<{
    itemId: string;
    itemTitle: string;
    branchSuggestion: string;
    worktreeCommand: string;
    codexPromptAvailable: boolean;
  }>;
  emptyState: string;
}

export interface AgentFactoryPrCiWatcher {
  status: AgentFactoryArtifactStatus;
  prNumber: string;
  prState: string;
  workflowState: string;
  workflowSummary: string;
  failedDomains: string[];
  pendingDomains: string[];
  skippedDomains: string[];
  recommendedNextActions: string[];
  blockedReasons: string[];
  emptyState: string;
}

export interface AgentFactoryPrBodyDoctor {
  status: AgentFactoryArtifactStatus;
  validAfter: string;
  issueReference: string;
  repairedBodyArtifactAvailable: boolean;
  remainingWarnings: string[];
  emptyState: string;
}

export interface AgentFactoryRepairPlan {
  status: AgentFactoryArtifactStatus;
  repairDomain: string;
  repairAllowed: string;
  humanApprovalRequired: string;
  validationCommands: string[];
  blockedReasons: string[];
  emptyState: string;
}

export interface AgentFactoryMergePlan {
  status: AgentFactoryArtifactStatus;
  mergeReadiness: string;
  approvalGate: string;
  rebaseRequired: string;
  mergeCandidate: string;
  blockedReasons: string[];
  emptyState: string;
}

export interface AgentFactoryActionMode {
  mode: string;
  requiresPrNumber: boolean;
}

export interface AgentFactoryDashboardReport {
  version: 1;
  title: "Agent Factory";
  route: "/admin/factory";
  reportOnly: true;
  readOnly: true;
  generatedAt: string;
  lastUpdatedAt: string | null;
  safetyStatus: string;
  artifacts: AgentFactoryArtifactSummary[];
  nextWorkPackage: AgentFactoryNextWorkPackage;
  prCiWatcher: AgentFactoryPrCiWatcher;
  prBodyDoctor: AgentFactoryPrBodyDoctor;
  repairPlan: AgentFactoryRepairPlan;
  mergePlan: AgentFactoryMergePlan;
  actionsButton: {
    operatorPath: string;
    recommendedModes: AgentFactoryActionMode[];
    liveModesRequirePrNumber: true;
    planOnlyMayLeavePrNumberEmpty: true;
  };
  safetyPanel: string[];
  dataBoundary: string[];
}

interface LoadedArtifact {
  id: string;
  label: string;
  fileName: string;
  status: AgentFactoryArtifactStatus;
  updatedAt: string | null;
  message: string;
  data: unknown;
}

export interface LoadAgentFactoryDashboardReportOptions {
  reportDir?: string;
  now?: Date;
}

const ARTIFACTS = {
  plan: {
    id: "af001-plan",
    label: "AF001 plan/work packages",
    fileName: "codex-task-packages.json",
  },
  watcher: {
    id: "af002-watcher",
    label: "AF002 PR/CI watcher",
    fileName: "ci-watcher-report.json",
  },
  doctor: {
    id: "af003-doctor",
    label: "AF003 PR body contract doctor",
    fileName: "pr-contract-doctor-report.json",
  },
  repairedBody: {
    id: "af003-repaired-body",
    label: "AF003 sanitized repaired body artifact",
    fileName: "repaired-pr-body.md",
  },
  repair: {
    id: "af004-repair-plan",
    label: "AF004 safe repair plan",
    fileName: "safe-repair-plan.json",
  },
  merge: {
    id: "af005-merge-plan",
    label: "AF005 merge plan",
    fileName: "merge-plan.json",
  },
  legacyMerge: {
    id: "af005-rebase-merge-plan",
    label: "AF005 rebase/merge plan",
    fileName: "rebase-merge-plan.json",
  },
  liveSnapshot: {
    id: "af007-live-snapshot",
    label: "AF007 live GitHub metadata snapshot",
    fileName: "github-live-snapshot.json",
  },
  summary: {
    id: "af006-run-summary",
    label: "AF006 run summary",
    fileName: "agent-factory-run-summary.md",
  },
} as const;

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/g,
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
] as const;

const SAFETY_PANEL = [
  "No mutation in dashboard v1.",
  "No Codex invocation.",
  "No branch creation.",
  "No PR creation or PR update.",
  "No workflow rerun.",
  "No rebase.",
  "No merge.",
  "No learner runtime.",
  "No OCR.",
  "No provider call.",
  "No billing or payment action.",
  "No auth mutation.",
  "No production API mutation.",
  "Human approval is required for risky work outside this dashboard.",
] as const;

const DATA_BOUNDARY = [
  "Metadata-only Agent Factory reports are allowed.",
  "Learner answers, OCR text, official question or answer bodies, source excerpts, provider payloads, billing data, credentials, and private user content are not displayed.",
  "PR body repair status is summarized without showing raw PR body dumps.",
  "Dashboard v1 reads local generated artifacts only and never fetches live GitHub data.",
] as const;

const RECOMMENDED_ACTION_MODES: AgentFactoryActionMode[] = [
  { mode: "plan_only", requiresPrNumber: false },
  { mode: "watch_live", requiresPrNumber: true },
  { mode: "doctor_pr_body_live", requiresPrNumber: true },
  { mode: "repair_plan_live", requiresPrNumber: true },
  { mode: "merge_plan_live", requiresPrNumber: true },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanText(value: unknown, fallback = "Unavailable"): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return fallback;
  }

  let text = String(value).replace(/[\u0000-\u001f]/g, "").trim();
  for (const pattern of SECRET_VALUE_PATTERNS) {
    text = text.replace(pattern, "[redacted]");
  }

  if (!text) return fallback;
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function cleanList(value: unknown): string[] {
  return asArray(value)
    .map((entry) => cleanText(entry, ""))
    .filter(Boolean)
    .slice(0, 12);
}

function booleanLabel(value: unknown): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unknown";
}

function isoDate(date: Date): string {
  return date.toISOString();
}

function safeResolveReportDir(reportDir: string): string {
  return path.resolve(process.cwd(), reportDir);
}

function artifactPath(reportDir: string, fileName: string): string {
  const resolvedDir = safeResolveReportDir(reportDir);
  const resolvedFile = path.resolve(resolvedDir, fileName);

  if (resolvedFile !== resolvedDir && !resolvedFile.startsWith(`${resolvedDir}${path.sep}`)) {
    throw new Error(`Unsafe Agent Factory artifact path: ${fileName}`);
  }

  return resolvedFile;
}

function readArtifact(
  reportDir: string,
  artifact: { id: string; label: string; fileName: string },
  json: boolean,
): LoadedArtifact {
  const fullPath = artifactPath(reportDir, artifact.fileName);

  if (!fs.existsSync(fullPath)) {
    return {
      ...artifact,
      status: "missing",
      updatedAt: null,
      message: `Missing ${artifact.fileName}. Run the matching Agent Factory mode or download the generated artifact first.`,
      data: null,
    };
  }

  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return {
        ...artifact,
        status: "invalid",
        updatedAt: null,
        message: `${artifact.fileName} is not a file.`,
        data: null,
      };
    }

    const text = fs.readFileSync(fullPath, "utf8");
    return {
      ...artifact,
      status: "available",
      updatedAt: isoDate(stat.mtime),
      message: `Loaded ${artifact.fileName}.`,
      data: json ? JSON.parse(text) : text,
    };
  } catch (error) {
    return {
      ...artifact,
      status: "invalid",
      updatedAt: null,
      message: `${artifact.fileName} could not be parsed safely: ${error instanceof Error ? error.message : String(error)}`,
      data: null,
    };
  }
}

function artifactSummary(artifact: LoadedArtifact): AgentFactoryArtifactSummary {
  return {
    id: artifact.id,
    label: artifact.label,
    fileName: artifact.fileName,
    status: artifact.status,
    updatedAt: artifact.updatedAt,
    message: artifact.message,
  };
}

function newestTimestamp(artifacts: LoadedArtifact[]): string | null {
  const timestamps = artifacts
    .map((artifact) => artifact.updatedAt)
    .filter((entry): entry is string => Boolean(entry))
    .sort();

  return timestamps.at(-1) ?? null;
}

function worktreeCommandFrom(taskPackage: Record<string, unknown>): string {
  const commands = cleanList(taskPackage.powershellCommands);
  return commands.find((command) => command.includes("git worktree add")) ?? "Unavailable";
}

function parseNextWorkPackage(plan: LoadedArtifact): AgentFactoryNextWorkPackage {
  const root = asRecord(plan.data);
  const packages = asArray(root?.packages)
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

  if (plan.status !== "available" || !root || packages.length === 0) {
    return {
      status: plan.status,
      items: [],
      emptyState: "No AF001 task package artifact is available. Run plan_only to generate codex-task-packages.json.",
    };
  }

  return {
    status: "available",
    items: packages.slice(0, 2).map((taskPackage) => ({
      itemId: cleanText(taskPackage.itemId),
      itemTitle: cleanText(taskPackage.itemTitle),
      branchSuggestion: cleanText(taskPackage.branchName),
      worktreeCommand: worktreeCommandFrom(taskPackage),
      codexPromptAvailable: typeof taskPackage.codexPrompt === "string" && taskPackage.codexPrompt.trim().length > 0,
    })),
    emptyState: "",
  };
}

function parsePrCiWatcher(watcher: LoadedArtifact): AgentFactoryPrCiWatcher {
  const root = asRecord(watcher.data);
  const workflowSummary = asRecord(root?.workflowSummary);

  if (watcher.status !== "available" || !root) {
    return {
      status: watcher.status,
      prNumber: "Unavailable",
      prState: "Unavailable",
      workflowState: "Unavailable",
      workflowSummary: "Unavailable",
      failedDomains: [],
      pendingDomains: [],
      skippedDomains: [],
      recommendedNextActions: [],
      blockedReasons: [],
      emptyState: "No AF002 watcher artifact is available. Run watch_live or watch_snapshot to generate ci-watcher-report.json.",
    };
  }

  const passed = cleanText(workflowSummary?.passed, "0");
  const failed = cleanText(workflowSummary?.failed, "0");
  const pending = cleanText(workflowSummary?.pending, "0");
  const skipped = cleanText(workflowSummary?.skipped, "0");

  return {
    status: "available",
    prNumber: cleanText(root.prNumber),
    prState: cleanText(root.prState),
    workflowState: cleanText(workflowSummary?.state),
    workflowSummary: `${passed} passed, ${failed} failed, ${pending} pending, ${skipped} skipped`,
    failedDomains: cleanList(root.failedDomains),
    pendingDomains: cleanList(root.pendingDomains),
    skippedDomains: cleanList(root.skippedDomains),
    recommendedNextActions: cleanList(root.recommendedNextActions),
    blockedReasons: cleanList(root.blockedReasons),
    emptyState: "",
  };
}

function parsePrBodyDoctor(doctor: LoadedArtifact, repairedBody: LoadedArtifact): AgentFactoryPrBodyDoctor {
  const root = asRecord(doctor.data);
  const issueReference = asRecord(root?.issueReferenceStatus);

  if (doctor.status !== "available" || !root) {
    return {
      status: doctor.status,
      validAfter: "Unavailable",
      issueReference: "Unavailable",
      repairedBodyArtifactAvailable: false,
      remainingWarnings: [],
      emptyState: "No AF003 doctor artifact is available. Run doctor_pr_body_live or doctor_pr_body to generate pr-contract-doctor-report.json.",
    };
  }

  const issueNumber = cleanText(issueReference?.issueNumber, "none");
  const issueStatus = cleanText(issueReference?.status);

  return {
    status: "available",
    validAfter: booleanLabel(root.validAfter),
    issueReference: `${issueStatus} (${issueNumber})`,
    repairedBodyArtifactAvailable: repairedBody.status === "available",
    remainingWarnings: cleanList(root.remainingWarnings),
    emptyState: "",
  };
}

function parseRepairPlan(repair: LoadedArtifact): AgentFactoryRepairPlan {
  const root = asRecord(repair.data);

  if (repair.status !== "available" || !root) {
    return {
      status: repair.status,
      repairDomain: "Unavailable",
      repairAllowed: "Unavailable",
      humanApprovalRequired: "Unavailable",
      validationCommands: [],
      blockedReasons: [],
      emptyState: "No AF004 repair artifact is available. Run repair_plan_live or repair_plan to generate safe-repair-plan.json.",
    };
  }

  return {
    status: "available",
    repairDomain: cleanText(root.repairDomain),
    repairAllowed: booleanLabel(root.repairAllowed),
    humanApprovalRequired: booleanLabel(root.humanApprovalRequired),
    validationCommands: cleanList(root.validationCommands),
    blockedReasons: cleanList(root.blockedReasons),
    emptyState: "",
  };
}

function parseMergePlan(merge: LoadedArtifact, legacyMerge: LoadedArtifact): AgentFactoryMergePlan {
  const selected = merge.status === "available" ? merge : legacyMerge;
  const root = asRecord(selected.data);

  if (selected.status !== "available" || !root) {
    return {
      status: selected.status,
      mergeReadiness: "Unavailable",
      approvalGate: "Unavailable",
      rebaseRequired: "Unavailable",
      mergeCandidate: "Unavailable",
      blockedReasons: [],
      emptyState: "No AF005 merge artifact is available. Run merge_plan_live or merge_plan to generate merge-plan.json.",
    };
  }

  return {
    status: "available",
    mergeReadiness: cleanText(root.mergeReadiness),
    approvalGate: cleanText(root.approvalGate),
    rebaseRequired: booleanLabel(root.rebaseRequired),
    mergeCandidate: booleanLabel(root.mergeCandidate),
    blockedReasons: cleanList(root.blockedReasons),
    emptyState: "",
  };
}

export function loadAgentFactoryDashboardReport(
  options: LoadAgentFactoryDashboardReportOptions = {},
): AgentFactoryDashboardReport {
  const reportDir = options.reportDir ?? ".agent-factory";
  const now = options.now ?? new Date();
  const plan = readArtifact(reportDir, ARTIFACTS.plan, true);
  const watcher = readArtifact(reportDir, ARTIFACTS.watcher, true);
  const doctor = readArtifact(reportDir, ARTIFACTS.doctor, true);
  const repairedBody = readArtifact(reportDir, ARTIFACTS.repairedBody, false);
  const repair = readArtifact(reportDir, ARTIFACTS.repair, true);
  const merge = readArtifact(reportDir, ARTIFACTS.merge, true);
  const legacyMerge = readArtifact(reportDir, ARTIFACTS.legacyMerge, true);
  const liveSnapshot = readArtifact(reportDir, ARTIFACTS.liveSnapshot, true);
  const summary = readArtifact(reportDir, ARTIFACTS.summary, false);
  const artifacts = [
    plan,
    watcher,
    doctor,
    repairedBody,
    repair,
    merge,
    legacyMerge,
    liveSnapshot,
    summary,
  ];

  return {
    version: 1,
    title: "Agent Factory",
    route: "/admin/factory",
    reportOnly: true,
    readOnly: true,
    generatedAt: isoDate(now),
    lastUpdatedAt: newestTimestamp(artifacts),
    safetyStatus: "Safe: read-only/report-only; dashboard v1 performs no mutation.",
    artifacts: artifacts.map(artifactSummary),
    nextWorkPackage: parseNextWorkPackage(plan),
    prCiWatcher: parsePrCiWatcher(watcher),
    prBodyDoctor: parsePrBodyDoctor(doctor, repairedBody),
    repairPlan: parseRepairPlan(repair),
    mergePlan: parseMergePlan(merge, legacyMerge),
    actionsButton: {
      operatorPath: "GitHub -> Actions -> Agent Factory Run -> Run workflow",
      recommendedModes: RECOMMENDED_ACTION_MODES,
      liveModesRequirePrNumber: true,
      planOnlyMayLeavePrNumberEmpty: true,
    },
    safetyPanel: [...SAFETY_PANEL],
    dataBoundary: [...DATA_BOUNDARY],
  };
}
