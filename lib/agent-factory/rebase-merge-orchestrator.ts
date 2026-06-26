import {
  assessApprovalGate,
  type ApprovalGate,
} from "./approval-gate";
import {
  createCiWatcherReport,
  type CiWatcherReport,
  type Mergeability,
  type PullRequestState,
  type RecommendedNextAction,
} from "./ci-watcher";
import { FAILURE_DOMAINS, type FailureDomain } from "./failure-classifier";
import type { RepairDomain, SafeRepairPlan } from "./safe-repair-loop";

export type MergeReadiness =
  | "not_ready_draft"
  | "waiting_for_ci"
  | "repair_required"
  | "rebase_required"
  | "human_approval_required"
  | "merge_candidate"
  | "blocked"
  | "already_merged"
  | "closed_unmerged";

export type MergeMethodRecommendation =
  | "none"
  | "none_already_merged"
  | "none_closed_unmerged"
  | "wait_for_ci"
  | "run_af003_or_af004_repair_plan"
  | "mark_ready_for_review"
  | "rebase_update_branch_then_recheck"
  | "human_review_before_merge"
  | "squash_merge_after_human_approval"
  | "do_not_merge";

export interface RebaseMergePlannerOptions {
  repo?: string;
  ciReport?: unknown;
  prSnapshot?: unknown;
  repairPlan?: unknown;
  previousSnapshot?: unknown;
  siblingPullRequests?: readonly unknown[];
  reportOnly?: boolean;
}

export interface RebaseMergeValidationSummary {
  metadataOnly: true;
  mutatesGitHub: false;
  mutatesRuntimeState: false;
  af002ReportObserved: boolean;
  af004RepairPlanObserved: boolean;
  workflowState: string;
  requiredCiClear: boolean;
  branchCurrent: boolean;
  riskGateClear: boolean;
  sourceLevelOnly: boolean;
  skippedE2eTolerated: boolean;
  reportOnly: boolean;
}

export interface RebaseMergePlanReport {
  repo: string;
  prNumber: number | null;
  prTitle: string;
  headSha: string | null;
  baseSha: string | null;
  mergeReadiness: MergeReadiness;
  approvalGate: ApprovalGate;
  mergeCandidate: boolean;
  humanApprovalRequired: boolean;
  blockedReasons: string[];
  readyForReviewRecommended: boolean;
  rebaseRequired: boolean;
  rebaseCommands: string[];
  mergeMethodRecommendation: MergeMethodRecommendation;
  mergeOrderNotes: string[];
  riskNotes: string[];
  validationSummary: RebaseMergeValidationSummary;
  markdownSummary: string;
}

interface NormalizedPlannerInput {
  ciInput: unknown;
  prInput: unknown;
  repairPlanInput: unknown;
  previousSnapshotInput: unknown;
  siblingPullRequests: readonly unknown[];
}

interface PrMetadata {
  repo: string | null;
  prNumber: number | null;
  prTitle: string | null;
  prState: PullRequestState | null;
  draft: boolean | null;
  baseSha: string | null;
  headSha: string | null;
  mergeability: Mergeability | null;
  labels: string[];
  files: string[];
}

interface MinimalRepairPlan {
  repairDomain: RepairDomain | null;
  repairAllowed: boolean | null;
  blockedReasons: string[];
  humanApprovalRequired: boolean | null;
}

interface SiblingPr {
  prNumber: number | null;
  prTitle: string;
  files: string[];
}

const FAILURE_DOMAIN_SET = new Set<FailureDomain>(FAILURE_DOMAINS);

const MERGEABILITY_VALUES = new Set<Mergeability>([
  "mergeable",
  "conflict",
  "unknown",
  "behind_main",
  "diverged",
]);

const PR_STATE_VALUES = new Set<PullRequestState>([
  "draft",
  "open_ready",
  "closed_merged",
  "closed_unmerged",
]);

const RECOMMENDED_ACTIONS = new Set<RecommendedNextAction>([
  "wait_for_ci",
  "fix_pr_contract",
  "rerun_failed_jobs",
  "request_rebase",
  "request_codex_repair",
  "mark_ready_for_review",
  "human_approval_required",
  "merge_candidate",
  "blocked",
]);

const REPAIR_DOMAINS = new Set<RepairDomain>([
  "pr_body_repair",
  "typecheck_repair",
  "lint_repair",
  "focused_test_repair",
  "unit_test_repair",
  "build_repair",
  "closed_beta_readiness_repair",
  "learner_loop_repair",
  "rebase_required",
  "human_review_required",
  "blocked",
]);

const HOT_PATH_GROUPS = [
  {
    id: "roadmap",
    label: "roadmap/active-program.yml",
    patterns: ["roadmap/active-program.yml"],
    note: "Preserve every completed roadmap status when resolving roadmap/active-program.yml conflicts.",
  },
  {
    id: "package",
    label: "package.json or package-lock.json",
    patterns: ["package.json", "package-lock.json"],
    note: "Review package script and dependency changes together before merging sibling PRs.",
  },
  {
    id: "test-runner",
    label: "scripts/run-node-tests.mjs",
    patterns: ["scripts/run-node-tests.mjs"],
    note: "Rerun the full node test suite after merging test-runner changes.",
  },
  {
    id: "workflow",
    label: "workflow files",
    patterns: [".github/workflows/**"],
    note: "Workflow changes require human review and should merge before branches that depend on the new checks.",
  },
  {
    id: "migration",
    label: "migrations",
    patterns: ["supabase/migrations/**", "db/migrations/**", "migrations/**"],
    note: "Migration PRs require owner approval and a clear rollback or disable path.",
  },
  {
    id: "sensitive-runtime",
    label: "billing/auth/runtime paths",
    patterns: [
      "app/api/auth/**",
      "lib/auth/**",
      "app/api/billing/**",
      "lib/billing/**",
      "app/api/payments/**",
      "lib/payments/**",
      "app/api/entitlements/**",
      "lib/entitlements/**",
      "app/api/**",
      "middleware.ts",
      "proxy.ts",
      "vercel.json",
      "next.config.*",
    ],
    note: "Sensitive runtime PRs must not be treated as automatic merge candidates.",
  },
] as const;

const SECRET_VALUE_PATTERNS = [
  /\bghp_[A-Za-z0-9_]{8,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/,
  /\bsk-[A-Za-z0-9_-]{8,}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
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
  /raw.*answer/i,
  /ocr.*text/i,
  /problem.*text/i,
  /question.*body/i,
  /answer.*body/i,
  /source.*excerpt/i,
  /provider.*payload/i,
  /billing.*data/i,
  /private.*user.*content/i,
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const withoutControls = value.replace(/[\u0000-\u001f]/g, "").trim();
  return withoutControls.length > 0 ? withoutControls : null;
}

function stringValue(value: unknown, fallback: string): string {
  return cleanText(value) ?? fallback;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = normalizeToken(value);
    if (normalized === "true" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "no") return false;
  }
  return null;
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizePath(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  if (text.length > 180) return null;
  if (/https?:\/\//i.test(text)) return null;
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(text))) return null;
  return text.replaceAll("\\", "/");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function shaValue(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return /^[0-9a-f]{7,40}$/i.test(text) ? text : text.slice(0, 80);
}

function globToRegExp(glob: string): RegExp {
  let source = "^";

  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];

    if (character === "*") {
      const isDoubleStar = glob[index + 1] === "*";

      if (isDoubleStar) {
        index += 1;

        if (glob[index + 1] === "/") {
          index += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }

      continue;
    }

    if (character === "?") {
      source += "[^/]";
      continue;
    }

    source += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }

  source += "$";
  return new RegExp(source);
}

function matchesGlob(pattern: string, filePath: string): boolean {
  return globToRegExp(pattern).test(filePath.replaceAll("\\", "/"));
}

function matchesAny(patterns: readonly string[], filePath: string): boolean {
  return patterns.some((pattern) => matchesGlob(pattern, filePath));
}

function labelsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return cleanText(entry);
      const record = asRecord(entry);
      return cleanText(record?.name) ?? cleanText(record?.label);
    })
    .filter((entry): entry is string => Boolean(entry));
}

function filesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return normalizePath(entry);
      const record = asRecord(entry);
      return (
        normalizePath(record?.path) ??
        normalizePath(record?.filename) ??
        normalizePath(record?.file)
      );
    })
    .filter((entry): entry is string => Boolean(entry));
}

function nestedSource(snapshot: Record<string, unknown>): Record<string, unknown> {
  return (
    asRecord(snapshot.pullRequest) ??
    asRecord(snapshot.pull_request) ??
    asRecord(snapshot.pr) ??
    snapshot
  );
}

function recordsFrom(input: unknown): Record<string, unknown>[] {
  const record = asRecord(input);
  if (!record) return [];

  return [
    record,
    asRecord(record.pullRequest),
    asRecord(record.pull_request),
    asRecord(record.pr),
    asRecord(record.source),
    asRecord(record.snapshot),
    asRecord(record.prSnapshot),
  ].filter((entry): entry is Record<string, unknown> => entry !== null);
}

function validFailureDomain(value: unknown): FailureDomain | null {
  const normalized = normalizeToken(value);
  return FAILURE_DOMAIN_SET.has(normalized as FailureDomain)
    ? (normalized as FailureDomain)
    : null;
}

function failureDomainsFrom(value: unknown): FailureDomain[] {
  if (!Array.isArray(value)) return [];
  return unique(
    value
      .map(validFailureDomain)
      .filter((entry): entry is FailureDomain => Boolean(entry)),
  ) as FailureDomain[];
}

function actionsFrom(value: unknown): RecommendedNextAction[] {
  if (!Array.isArray(value)) return [];
  return unique(
    value
      .map((entry) => normalizeToken(entry))
      .filter((entry) => RECOMMENDED_ACTIONS.has(entry as RecommendedNextAction)),
  ) as RecommendedNextAction[];
}

function prStateFrom(value: unknown): PullRequestState | null {
  const normalized = normalizeToken(value);
  return PR_STATE_VALUES.has(normalized as PullRequestState)
    ? (normalized as PullRequestState)
    : null;
}

function mergeabilityFrom(value: unknown): Mergeability | null {
  const normalized = normalizeToken(value);
  return MERGEABILITY_VALUES.has(normalized as Mergeability)
    ? (normalized as Mergeability)
    : null;
}

function isCiWatcherReport(value: unknown): value is CiWatcherReport {
  const record = asRecord(value);
  return Boolean(
    record &&
      asRecord(record.workflowSummary) &&
      Array.isArray(record.failedDomains) &&
      Array.isArray(record.recommendedNextActions),
  );
}

function normalizeCiReport(input: CiWatcherReport, repoOverride?: string): CiWatcherReport {
  const workflowSummary = asRecord(input.workflowSummary) ?? {};
  const state = stringValue(workflowSummary.state, "pending");

  return {
    repo: stringValue(repoOverride ?? input.repo, "unknown"),
    prNumber: numberValue(input.prNumber),
    prTitle: stringValue(input.prTitle, "Untitled PR"),
    prState: prStateFrom(input.prState) ?? "open_ready",
    draft: booleanValue(input.draft) === true,
    baseSha: shaValue(input.baseSha),
    headSha: shaValue(input.headSha),
    mergeability: mergeabilityFrom(input.mergeability) ?? "unknown",
    workflowSummary: {
      state: state === "all_green" || state === "pending" || state === "failed" || state === "skipped_only" || state === "mixed"
        ? state
        : "pending",
      total: Number(workflowSummary.total ?? 0),
      passed: Number(workflowSummary.passed ?? 0),
      failed: Number(workflowSummary.failed ?? 0),
      pending: Number(workflowSummary.pending ?? 0),
      skipped: Number(workflowSummary.skipped ?? 0),
      unknown: Number(workflowSummary.unknown ?? 0),
      hasInvalidWorkflowData: booleanValue(workflowSummary.hasInvalidWorkflowData) === true,
    },
    failedDomains: failureDomainsFrom(input.failedDomains),
    pendingDomains: failureDomainsFrom(input.pendingDomains),
    skippedDomains: failureDomainsFrom(input.skippedDomains),
    recommendedNextActions: actionsFrom(input.recommendedNextActions),
    humanApprovalRequired: input.humanApprovalRequired !== false,
    mergeCandidate: input.mergeCandidate === true,
    blockedReasons: Array.isArray(input.blockedReasons)
      ? input.blockedReasons.map(cleanText).filter((entry): entry is string => Boolean(entry))
      : [],
    repairPromptHint: stringValue(input.repairPromptHint, "Review AF002 output before merge planning."),
    markdownSummary: stringValue(input.markdownSummary, ""),
  };
}

function ciReportFrom(input: unknown, repoOverride?: string): {
  report: CiWatcherReport;
  observedAf002Report: boolean;
} {
  if (isCiWatcherReport(input)) {
    return {
      report: normalizeCiReport(input, repoOverride),
      observedAf002Report: true,
    };
  }

  return {
    report: createCiWatcherReport(input, {
      repo: repoOverride,
    }),
    observedAf002Report: false,
  };
}

function prMetadataFrom(input: unknown): PrMetadata {
  const records = recordsFrom(input);
  const source = records.length > 0 ? nestedSource(records[0]) : {};
  const base = asRecord(source.base);
  const head = asRecord(source.head);
  const labels = unique(records.flatMap((record) => labelsFrom(record.labels)));
  const files = unique(
    records.flatMap((record) => [
      ...filesFrom(record.files),
      ...filesFrom(record.changedFiles),
    ]),
  );
  const state = normalizeToken(firstDefined(source.prState, source.state));
  const draft = booleanValue(firstDefined(source.draft, source.isDraft));
  const merged = booleanValue(firstDefined(source.merged, source.isMerged)) === true;
  const prState = (() => {
    if (merged || state === "merged" || state === "closed_merged") return "closed_merged";
    if (state === "closed" || state === "closed_unmerged") return "closed_unmerged";
    if (draft === true || state === "draft") return "draft";
    if (state === "open_ready" || state === "open") return "open_ready";
    return null;
  })();

  return {
    repo: cleanText(firstDefined(source.repo, records[0]?.repo)),
    prNumber: numberValue(firstDefined(source.number, source.prNumber, records[0]?.prNumber)),
    prTitle: cleanText(firstDefined(source.title, source.prTitle, records[0]?.prTitle)),
    prState,
    draft,
    baseSha: shaValue(firstDefined(source.baseSha, source.baseRefOid, base?.sha, records[0]?.baseSha)),
    headSha: shaValue(firstDefined(source.headSha, source.headRefOid, head?.sha, records[0]?.headSha)),
    mergeability: mergeabilityFrom(firstDefined(source.mergeabilityStatus, source.mergeability)),
    labels,
    files,
  };
}

function normalizedInput(input: unknown, options: RebaseMergePlannerOptions): NormalizedPlannerInput {
  const root = asRecord(input);
  const ciInput =
    options.ciReport ??
    root?.ciReport ??
    root?.ciWatcherReport ??
    root?.af002Report ??
    input;
  const prInput =
    options.prSnapshot ??
    root?.prSnapshot ??
    root?.snapshot ??
    root?.pullRequest ??
    root?.pr ??
    (isCiWatcherReport(input) ? undefined : input);
  const repairPlanInput =
    options.repairPlan ??
    root?.repairPlan ??
    root?.safeRepairPlan ??
    root?.af004RepairPlan;
  const previousSnapshotInput =
    options.previousSnapshot ??
    root?.previousSnapshot ??
    root?.beforeSnapshot ??
    root?.previous;
  const siblingPullRequests =
    options.siblingPullRequests ??
    (Array.isArray(root?.siblingPullRequests)
      ? root.siblingPullRequests
      : Array.isArray(root?.siblings)
        ? root.siblings
        : []);

  return {
    ciInput,
    prInput,
    repairPlanInput,
    previousSnapshotInput,
    siblingPullRequests,
  };
}

function repairDomainFrom(value: unknown): RepairDomain | null {
  const normalized = normalizeToken(value);
  return REPAIR_DOMAINS.has(normalized as RepairDomain)
    ? (normalized as RepairDomain)
    : null;
}

function repairPlanFrom(value: unknown): MinimalRepairPlan | null {
  const record = asRecord(value) as Partial<SafeRepairPlan> | null;
  if (!record) return null;

  return {
    repairDomain: repairDomainFrom(record.repairDomain),
    repairAllowed: booleanValue(record.repairAllowed),
    blockedReasons: Array.isArray(record.blockedReasons)
      ? record.blockedReasons.map(cleanText).filter((entry): entry is string => Boolean(entry))
      : [],
    humanApprovalRequired: booleanValue(record.humanApprovalRequired),
  };
}

function workflowCanProceed(report: CiWatcherReport, sourceLevelOnly: boolean): boolean {
  const summary = report.workflowSummary;

  if (
    summary.failed > 0 ||
    summary.pending > 0 ||
    summary.unknown > 0 ||
    summary.hasInvalidWorkflowData
  ) {
    return false;
  }

  if (summary.state === "all_green") return true;

  return (
    (summary.state === "mixed" || summary.state === "skipped_only") &&
    report.skippedDomains.length > 0 &&
    report.skippedDomains.every((domain) => domain === "e2e_failure") &&
    sourceLevelOnly
  );
}

function skippedE2eTolerated(report: CiWatcherReport, sourceLevelOnly: boolean): boolean {
  return (
    (report.workflowSummary.state === "mixed" ||
      report.workflowSummary.state === "skipped_only") &&
    report.skippedDomains.length > 0 &&
    report.skippedDomains.every((domain) => domain === "e2e_failure") &&
    sourceLevelOnly
  );
}

function hasPendingCi(report: CiWatcherReport): boolean {
  return (
    report.workflowSummary.pending > 0 ||
    report.workflowSummary.unknown > 0 ||
    report.workflowSummary.hasInvalidWorkflowData ||
    report.recommendedNextActions.includes("wait_for_ci")
  );
}

function hasFailedCi(report: CiWatcherReport): boolean {
  return report.workflowSummary.failed > 0 || report.failedDomains.length > 0;
}

function requiresPrContractRepair(report: CiWatcherReport): boolean {
  return (
    report.failedDomains.includes("pr_contract_failure") ||
    report.recommendedNextActions.includes("fix_pr_contract")
  );
}

function requiresRebase(report: CiWatcherReport): boolean {
  return (
    report.mergeability === "behind_main" ||
    report.mergeability === "diverged" ||
    report.mergeability === "conflict" ||
    report.recommendedNextActions.includes("request_rebase")
  );
}

function rebaseCommandsFor(mergeability: Mergeability): string[] {
  if (mergeability === "conflict") {
    return [
      "git fetch origin main",
      "git status --short",
      "git rebase origin/main",
      "git status --short",
      "git rebase --continue",
      "git rebase --abort",
      "npm.cmd run agent-factory:watch -- --snapshot .agent-factory/pr-ci-snapshot.json --stdout markdown",
      "npm.cmd run agent-factory:merge-plan -- --input .agent-factory/ci-watcher-report.json --stdout markdown",
    ];
  }

  if (mergeability === "behind_main" || mergeability === "diverged") {
    return [
      "git fetch origin main",
      "git status --short",
      "git rebase origin/main",
      "npm.cmd run agent-factory:watch -- --snapshot .agent-factory/pr-ci-snapshot.json --stdout markdown",
      "npm.cmd run agent-factory:merge-plan -- --input .agent-factory/ci-watcher-report.json --stdout markdown",
    ];
  }

  return [];
}

function hotGroupsFor(files: readonly string[]): string[] {
  return HOT_PATH_GROUPS
    .filter((group) => files.some((file) => matchesAny(group.patterns, file)))
    .map((group) => group.id);
}

function hotGroupLabel(id: string): string {
  return HOT_PATH_GROUPS.find((group) => group.id === id)?.label ?? id;
}

function hotGroupNote(id: string): string {
  return HOT_PATH_GROUPS.find((group) => group.id === id)?.note ?? "Review merge order before merging sibling PRs.";
}

function siblingFrom(input: unknown): SiblingPr | null {
  const metadata = prMetadataFrom(input);
  if (metadata.files.length === 0 && metadata.prNumber === null && metadata.prTitle === null) {
    return null;
  }

  return {
    prNumber: metadata.prNumber,
    prTitle: metadata.prTitle ?? "Untitled PR",
    files: metadata.files,
  };
}

function buildMergeOrderNotes(
  current: PrMetadata,
  siblingsInput: readonly unknown[],
): string[] {
  const notes: string[] = [];
  const currentGroups = new Set(hotGroupsFor(current.files));
  const siblings = siblingsInput
    .map(siblingFrom)
    .filter((entry): entry is SiblingPr => entry !== null);

  for (const groupId of currentGroups) {
    const siblingMatches = siblings.filter((sibling) =>
      hotGroupsFor(sibling.files).includes(groupId),
    );

    if (siblingMatches.length === 0) {
      if (groupId === "roadmap") {
        notes.push(hotGroupNote(groupId));
      }
      continue;
    }

    const siblingLabels = siblingMatches
      .map((sibling) =>
        sibling.prNumber === null
          ? sibling.prTitle
          : `#${sibling.prNumber} ${sibling.prTitle}`,
      )
      .join(", ");

    notes.push(
      `Sibling PR overlap on ${hotGroupLabel(groupId)} with ${siblingLabels}; merge one PR at a time, then rebase the later branch on latest main and rerun AF002/AF005.`,
    );
    notes.push(hotGroupNote(groupId));
  }

  if (notes.length === 0) {
    notes.push("No sibling hot-path merge-order conflict was detected from the supplied metadata.");
  }

  return unique(notes);
}

function compareSnapshotNotes(
  current: PrMetadata,
  previousInput: unknown,
): string[] {
  if (!previousInput) return [];

  const previous = prMetadataFrom(previousInput);
  const notes: string[] = [];

  if (previous.baseSha && current.baseSha && previous.baseSha !== current.baseSha) {
    notes.push("Base SHA changed since the previous metadata snapshot; confirm GitHub recalculated mergeability and CI before merge.");
  }

  if (previous.headSha && current.headSha && previous.headSha !== current.headSha) {
    notes.push("Head SHA changed since the previous metadata snapshot; use the newest AF002 report for merge planning.");
  }

  if (previous.mergeability && current.mergeability && previous.mergeability !== current.mergeability) {
    notes.push(`Mergeability changed from ${previous.mergeability} to ${current.mergeability} since the previous snapshot.`);
  }

  return notes;
}

function mergeMethodFor(readiness: MergeReadiness): MergeMethodRecommendation {
  if (readiness === "already_merged") return "none_already_merged";
  if (readiness === "closed_unmerged") return "none_closed_unmerged";
  if (readiness === "waiting_for_ci") return "wait_for_ci";
  if (readiness === "repair_required") return "run_af003_or_af004_repair_plan";
  if (readiness === "not_ready_draft") return "mark_ready_for_review";
  if (readiness === "rebase_required") return "rebase_update_branch_then_recheck";
  if (readiness === "merge_candidate") return "squash_merge_after_human_approval";
  if (readiness === "human_approval_required") return "human_review_before_merge";
  if (readiness === "blocked") return "do_not_merge";
  return "none";
}

function readinessFor(input: {
  report: CiWatcherReport;
  repairPlan: MinimalRepairPlan | null;
  workflowClear: boolean;
  branchCurrent: boolean;
  riskGateClear: boolean;
  approvalGate: ApprovalGate;
}): MergeReadiness {
  const { report, repairPlan, workflowClear, branchCurrent, riskGateClear, approvalGate } = input;

  if (report.prState === "closed_merged") return "already_merged";
  if (report.prState === "closed_unmerged") return "closed_unmerged";
  if (report.mergeability === "conflict") return "blocked";
  if (requiresRebase(report)) return "rebase_required";
  if (hasPendingCi(report)) return "waiting_for_ci";

  if (hasFailedCi(report)) {
    if (
      repairPlan?.repairDomain === "blocked" ||
      report.failedDomains.includes("risk_gate_failure") ||
      report.failedDomains.includes("runtime_gate_failure")
    ) {
      return "blocked";
    }

    return "repair_required";
  }

  if (report.prState === "draft" && workflowClear && branchCurrent) {
    return "not_ready_draft";
  }

  if (approvalGate === "blocked_no_auto_path") return "blocked";

  if (!riskGateClear) return "human_approval_required";

  if (workflowClear && branchCurrent && report.prState === "open_ready") {
    return "merge_candidate";
  }

  return "human_approval_required";
}

function blockedReasonsFor(input: {
  report: CiWatcherReport;
  repairPlan: MinimalRepairPlan | null;
  readiness: MergeReadiness;
  approvalGate: ApprovalGate;
  approvalBlockedReasons: readonly string[];
}): string[] {
  const { report, repairPlan, readiness, approvalGate, approvalBlockedReasons } = input;
  const reasons = [
    ...report.blockedReasons,
    ...approvalBlockedReasons,
    ...(repairPlan?.blockedReasons ?? []),
  ];

  if (readiness === "closed_unmerged") {
    reasons.push("PR is closed without merge; AF005 cannot recommend merge.");
  }

  if (readiness === "already_merged") {
    reasons.push("PR is already merged; no merge action remains.");
  }

  if (readiness === "not_ready_draft") {
    reasons.push("Draft PRs cannot be merged; mark ready for review only after human confirmation.");
  }

  if (readiness === "waiting_for_ci") {
    reasons.push("Required CI is pending, unknown, missing, or ambiguous.");
  }

  if (readiness === "repair_required") {
    if (requiresPrContractRepair(report)) {
      reasons.push("PR Contract failure must route to AF003 or AF004 before merge planning.");
    } else {
      reasons.push("Failed CI requires a bounded AF004 repair plan before merge planning.");
    }
  }

  if (readiness === "rebase_required") {
    reasons.push(`Branch mergeability is ${report.mergeability}; update the branch before merge review.`);
  }

  if (readiness === "blocked" && report.mergeability === "conflict") {
    reasons.push("Branch has conflicts; resolve conflicts with human review before merge planning.");
  }

  if (readiness === "human_approval_required") {
    reasons.push(`Approval gate ${approvalGate} prevents an AF005 merge-candidate recommendation.`);
  }

  return unique(reasons);
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None.";
}

function markdownBoolean(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function buildMarkdownSummary(report: Omit<RebaseMergePlanReport, "markdownSummary">): string {
  return [
    "# AF005 Rebase/Merge Orchestrator Report",
    "",
    `Repository: ${report.repo}`,
    `PR: ${report.prNumber === null ? "unknown" : `#${report.prNumber}`} ${report.prTitle}`,
    `Head SHA: ${report.headSha ?? "unknown"}`,
    `Base SHA: ${report.baseSha ?? "unknown"}`,
    `Merge readiness: ${report.mergeReadiness}`,
    `Approval gate: ${report.approvalGate}`,
    `Merge candidate: ${markdownBoolean(report.mergeCandidate)}`,
    `Human approval required: ${markdownBoolean(report.humanApprovalRequired)}`,
    `Ready for review recommended: ${markdownBoolean(report.readyForReviewRecommended)}`,
    `Rebase required: ${markdownBoolean(report.rebaseRequired)}`,
    `Merge method recommendation: ${report.mergeMethodRecommendation}`,
    "",
    "## Blocked Reasons",
    "",
    listOrNone(report.blockedReasons),
    "",
    "## Rebase Commands",
    "",
    listOrNone(report.rebaseCommands),
    "",
    "## Merge Order Notes",
    "",
    listOrNone(report.mergeOrderNotes),
    "",
    "## Risk Notes",
    "",
    listOrNone(report.riskNotes),
    "",
    "## Validation Summary",
    "",
    `Metadata only: ${markdownBoolean(report.validationSummary.metadataOnly)}`,
    `Mutates GitHub: ${markdownBoolean(report.validationSummary.mutatesGitHub)}`,
    `Mutates runtime state: ${markdownBoolean(report.validationSummary.mutatesRuntimeState)}`,
    `AF002 report observed: ${markdownBoolean(report.validationSummary.af002ReportObserved)}`,
    `AF004 repair plan observed: ${markdownBoolean(report.validationSummary.af004RepairPlanObserved)}`,
    `Workflow state: ${report.validationSummary.workflowState}`,
    `Required CI clear: ${markdownBoolean(report.validationSummary.requiredCiClear)}`,
    `Branch current: ${markdownBoolean(report.validationSummary.branchCurrent)}`,
    `Risk gate clear: ${markdownBoolean(report.validationSummary.riskGateClear)}`,
    `Source-level only: ${markdownBoolean(report.validationSummary.sourceLevelOnly)}`,
    `Skipped E2E tolerated: ${markdownBoolean(report.validationSummary.skippedE2eTolerated)}`,
  ].join("\n");
}

export function createRebaseMergePlan(
  input: unknown,
  options: RebaseMergePlannerOptions = {},
): RebaseMergePlanReport {
  const normalized = normalizedInput(input, options);
  const { report, observedAf002Report } = ciReportFrom(normalized.ciInput, options.repo);
  const prMetadata = prMetadataFrom(normalized.prInput ?? normalized.ciInput);
  const repairPlan = repairPlanFrom(normalized.repairPlanInput);
  const currentMetadata: PrMetadata = {
    ...prMetadata,
    repo: prMetadata.repo ?? report.repo,
    prNumber: prMetadata.prNumber ?? report.prNumber,
    prTitle: prMetadata.prTitle ?? report.prTitle,
    prState: prMetadata.prState ?? report.prState,
    draft: prMetadata.draft ?? report.draft,
    baseSha: prMetadata.baseSha ?? report.baseSha,
    headSha: prMetadata.headSha ?? report.headSha,
    mergeability: prMetadata.mergeability ?? report.mergeability,
  };
  const changedFiles = currentMetadata.files;
  const labels = currentMetadata.labels;
  const approval = assessApprovalGate({
    changedFiles,
    labels,
    ciMergeCandidate: report.mergeCandidate,
    reportOnly: options.reportOnly,
    signals: [
      ...report.blockedReasons,
      ...(repairPlan?.blockedReasons ?? []),
    ],
  });
  const workflowClear = workflowCanProceed(report, approval.sourceLevelOnly);
  const branchCurrent = report.mergeability === "mergeable";
  const riskGateClear = approval.mergePermittedByRiskGate;
  const readiness = readinessFor({
    report,
    repairPlan: hasFailedCi(report) ? repairPlan : null,
    workflowClear,
    branchCurrent,
    riskGateClear,
    approvalGate: approval.approvalGate,
  });
  const readyForReviewRecommended =
    readiness === "not_ready_draft" ||
    (
      report.recommendedNextActions.includes("mark_ready_for_review") &&
      workflowClear &&
      branchCurrent &&
      report.prState === "draft"
    );
  const rebaseRequired =
    readiness === "rebase_required" ||
    (readiness === "blocked" && report.mergeability === "conflict");
  const mergeCandidate = readiness === "merge_candidate";
  const humanApprovalRequired =
    readiness !== "already_merged" &&
    readiness !== "closed_unmerged" &&
    approval.humanApprovalRequired;
  const riskNotes = unique([
    ...approval.riskNotes,
    ...approval.highRiskSignals,
    ...compareSnapshotNotes(currentMetadata, normalized.previousSnapshotInput),
    "Rollback: discard generated AF005 artifacts; no GitHub or runtime state was mutated.",
    ...(repairPlan
      ? [`AF004 repair plan observed: ${repairPlan.repairDomain ?? "unknown"}.`]
      : []),
    ...(requiresPrContractRepair(report)
      ? ["PR Contract failure must be handled through AF003 PR Contract Doctor before merge planning."]
      : []),
  ]);
  const planWithoutMarkdown: Omit<RebaseMergePlanReport, "markdownSummary"> = {
    repo: currentMetadata.repo ?? report.repo,
    prNumber: currentMetadata.prNumber ?? report.prNumber,
    prTitle: currentMetadata.prTitle ?? report.prTitle,
    headSha: currentMetadata.headSha ?? report.headSha,
    baseSha: currentMetadata.baseSha ?? report.baseSha,
    mergeReadiness: readiness,
    approvalGate: approval.approvalGate,
    mergeCandidate,
    humanApprovalRequired,
    blockedReasons: blockedReasonsFor({
      report,
      repairPlan,
      readiness,
      approvalGate: approval.approvalGate,
      approvalBlockedReasons: approval.blockedReasons,
    }),
    readyForReviewRecommended,
    rebaseRequired,
    rebaseCommands: rebaseRequired ? rebaseCommandsFor(report.mergeability) : [],
    mergeMethodRecommendation: mergeMethodFor(readiness),
    mergeOrderNotes: buildMergeOrderNotes(currentMetadata, normalized.siblingPullRequests),
    riskNotes,
    validationSummary: {
      metadataOnly: true,
      mutatesGitHub: false,
      mutatesRuntimeState: false,
      af002ReportObserved: observedAf002Report,
      af004RepairPlanObserved: repairPlan !== null,
      workflowState: report.workflowSummary.state,
      requiredCiClear: workflowClear,
      branchCurrent,
      riskGateClear,
      sourceLevelOnly: approval.sourceLevelOnly,
      skippedE2eTolerated: skippedE2eTolerated(report, approval.sourceLevelOnly),
      reportOnly: options.reportOnly === true,
    },
  };
  const plan = {
    ...planWithoutMarkdown,
    markdownSummary: buildMarkdownSummary(planWithoutMarkdown),
  };

  assertRebaseMergePlanSafe(plan);
  return plan;
}

export function assertRebaseMergePlanSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      const secretPattern = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(current));
      if (secretPattern) {
        throw new Error(`AF005 output contains a secret-looking value at ${path}.`);
      }
      return;
    }

    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      const forbiddenPattern = FORBIDDEN_OUTPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbiddenPattern) {
        throw new Error(`AF005 output contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}
