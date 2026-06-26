import {
  classifyWorkflowChecks,
  type FailureDomain,
  type WorkflowCheckSnapshot,
  type WorkflowClassification,
  type WorkflowState,
} from "./failure-classifier";

export type PullRequestState =
  | "draft"
  | "open_ready"
  | "closed_merged"
  | "closed_unmerged";

export type Mergeability =
  | "mergeable"
  | "conflict"
  | "unknown"
  | "behind_main"
  | "diverged";

export type RecommendedNextAction =
  | "wait_for_ci"
  | "fix_pr_contract"
  | "rerun_failed_jobs"
  | "request_rebase"
  | "request_codex_repair"
  | "mark_ready_for_review"
  | "human_approval_required"
  | "merge_candidate"
  | "blocked";

export interface CiWatcherOptions {
  repo?: string;
}

export interface CiWorkflowSummary {
  state: WorkflowState;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
  unknown: number;
  hasInvalidWorkflowData: boolean;
}

export interface CiWatcherReport {
  repo: string;
  prNumber: number | null;
  prTitle: string;
  prState: PullRequestState;
  draft: boolean;
  baseSha: string | null;
  headSha: string | null;
  mergeability: Mergeability;
  workflowSummary: CiWorkflowSummary;
  failedDomains: FailureDomain[];
  pendingDomains: FailureDomain[];
  skippedDomains: FailureDomain[];
  recommendedNextActions: RecommendedNextAction[];
  humanApprovalRequired: boolean;
  mergeCandidate: boolean;
  blockedReasons: string[];
  repairPromptHint: string;
  markdownSummary: string;
}

type RiskLevel = "low" | "medium" | "high";

interface RiskAssessment {
  risk: RiskLevel;
  sensitive: boolean;
  sourceLevelOnly: boolean;
  blockingLabels: string[];
  reasons: string[];
}

const ACTION_ORDER: readonly RecommendedNextAction[] = [
  "wait_for_ci",
  "fix_pr_contract",
  "rerun_failed_jobs",
  "request_rebase",
  "request_codex_repair",
  "mark_ready_for_review",
  "human_approval_required",
  "merge_candidate",
  "blocked",
];

const HIGH_RISK_PATHS = [
  "supabase/migrations/**",
  "app/api/auth/**",
  "lib/auth/**",
  ".github/workflows/**",
  "middleware.ts",
  "vercel.json",
  "next.config.*",
  "config/paid-launch-readiness.json",
] as const;

const RUNTIME_REQUIRED_PATHS = [
  "supabase/migrations/**",
  "app/api/auth/**",
  "lib/auth/**",
  "middleware.ts",
  "app/api/notifications/**",
  "lib/notifications/**",
  "app/api/billing/**",
  "lib/billing/**",
  "app/api/payments/**",
  "lib/payments/**",
  "app/api/entitlements/**",
  "lib/entitlements/**",
  "config/paid-launch-readiness.json",
  "vercel.json",
] as const;

const SOURCE_LEVEL_PATHS = [
  "docs/**",
  "tests/**",
  "lib/agent-factory/**",
  "scripts/agent-factory-*.mjs",
  "scripts/run-node-tests.mjs",
  "package.json",
  "**/*.md",
] as const;

const BLOCKING_LABELS = [
  "blocked",
  "human-decision",
  "do-not-merge",
  "needs-live-runtime",
] as const;

const SENSITIVE_LABEL_PATTERNS = [
  /\bhigh[-_ ]?risk\b/i,
  /\brisk[:/_ -]?high\b/i,
  /\bauth\b/i,
  /\bauthorization\b/i,
  /\bbilling\b/i,
  /\bpayment\b/i,
  /\bentitlement\b/i,
  /\bruntime\b/i,
  /\blive[-_ ]?runtime\b/i,
  /\bdatabase\b/i,
  /\bdb\b/i,
  /\brls\b/i,
  /\btenant\b/i,
  /\bsecurity\b/i,
  /\bprovider\b/i,
  /\buser[-_ ]?data\b/i,
  /\bprivacy\b/i,
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
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
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

function firstMatchingGlob(patterns: readonly string[], filePath: string): string | null {
  return patterns.find((pattern) => matchesGlob(pattern, filePath)) ?? null;
}

function nestedSource(snapshot: Record<string, unknown>): Record<string, unknown> {
  return (
    asRecord(snapshot.pullRequest) ??
    asRecord(snapshot.pull_request) ??
    asRecord(snapshot.pr) ??
    snapshot
  );
}

function repositoryName(snapshot: Record<string, unknown>, options: CiWatcherOptions): string {
  const repository = asRecord(snapshot.repository);
  return stringValue(
    firstDefined(
      options.repo,
      snapshot.repo,
      snapshot.repository,
      repository?.nameWithOwner,
      repository?.fullName,
      repository?.full_name,
    ),
    "unknown",
  );
}

function shaValue(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  return /^[0-9a-f]{7,40}$/i.test(text) ? text : text.slice(0, 80);
}

function pullRequestState(source: Record<string, unknown>): PullRequestState {
  const state = normalizeToken(firstDefined(source.prState, source.state));
  const draft = booleanValue(firstDefined(source.draft, source.isDraft)) === true;
  const merged = booleanValue(firstDefined(source.merged, source.isMerged)) === true;

  if (merged || state === "merged" || state === "closed_merged") return "closed_merged";
  if (state === "closed" || state === "closed_unmerged") return "closed_unmerged";
  if (draft || state === "draft") return "draft";

  return "open_ready";
}

function mergeabilityFrom(source: Record<string, unknown>): Mergeability {
  const explicit = normalizeToken(firstDefined(source.mergeabilityStatus, source.mergeability));

  if (
    explicit === "mergeable" ||
    explicit === "conflict" ||
    explicit === "unknown" ||
    explicit === "behind_main" ||
    explicit === "diverged"
  ) {
    return explicit;
  }

  const mergeState = normalizeToken(
    firstDefined(source.mergeStateStatus, source.merge_state_status, source.mergeState),
  );
  const mergeable = normalizeToken(firstDefined(source.mergeable, source.mergeableState));
  const behindBy = numberValue(firstDefined(source.behindBy, source.commitsBehind));
  const isDiverged = booleanValue(firstDefined(source.diverged, source.isDiverged)) === true;

  if (isDiverged || mergeState === "diverged") return "diverged";
  if ((behindBy ?? 0) > 0 || mergeState === "behind" || mergeState === "behind_main") {
    return "behind_main";
  }
  if (
    mergeState === "dirty" ||
    mergeState === "conflicting" ||
    mergeState === "conflict" ||
    mergeState === "has_conflicts" ||
    mergeable === "conflicting" ||
    mergeable === "conflict" ||
    mergeable === "false"
  ) {
    return "conflict";
  }
  if (
    mergeable === "mergeable" ||
    mergeable === "true" ||
    mergeState === "clean" ||
    mergeState === "has_hooks" ||
    mergeState === "unstable" ||
    mergeState === "blocked" ||
    mergeState === "draft"
  ) {
    return "mergeable";
  }

  return "unknown";
}

function labelsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const record = asRecord(entry);
      return cleanText(record?.name) ?? cleanText(record?.label);
    })
    .filter((entry): entry is string => Boolean(entry));
}

function filesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const record = asRecord(entry);
      return cleanText(record?.path) ?? cleanText(record?.filename) ?? cleanText(record?.file);
    })
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => entry.replaceAll("\\", "/"));
}

function explicitRisk(value: unknown): RiskLevel | null {
  const risk = normalizeToken(value);
  if (risk === "low" || risk === "medium" || risk === "high") return risk;
  return null;
}

function assessRisk(
  source: Record<string, unknown>,
  snapshot: Record<string, unknown>,
): RiskAssessment {
  const labels = [
    ...labelsFrom(snapshot.labels),
    ...labelsFrom(source.labels),
  ];
  const files = [
    ...filesFrom(snapshot.changedFiles),
    ...filesFrom(snapshot.files),
    ...filesFrom(source.changedFiles),
    ...filesFrom(source.files),
  ];
  const normalizedLabels = [...new Set(labels.map(normalizeLabel))];
  const blockingLabels = normalizedLabels.filter((label) =>
    BLOCKING_LABELS.includes(label as (typeof BLOCKING_LABELS)[number]),
  );
  const reasons: string[] = [];
  let risk = explicitRisk(firstDefined(snapshot.risk, source.risk, snapshot.riskLevel, source.riskLevel)) ?? "low";

  for (const label of labels) {
    if (SENSITIVE_LABEL_PATTERNS.some((pattern) => pattern.test(label))) {
      risk = "high";
      reasons.push(`Sensitive label detected: ${label}.`);
    }
  }

  for (const file of files) {
    const highRiskPattern = firstMatchingGlob(HIGH_RISK_PATHS, file);
    const runtimePattern = firstMatchingGlob(RUNTIME_REQUIRED_PATHS, file);

    if (highRiskPattern) {
      risk = "high";
      reasons.push(`High-risk path ${file} matches ${highRiskPattern}.`);
    }

    if (runtimePattern) {
      risk = "high";
      reasons.push(`Runtime-sensitive path ${file} matches ${runtimePattern}.`);
    }
  }

  const sourceLevelOnly =
    files.length > 0 &&
    files.every((file) => firstMatchingGlob(SOURCE_LEVEL_PATHS, file) !== null);

  if (risk === "low" && files.length > 0 && !sourceLevelOnly) {
    risk = "medium";
  }

  return {
    risk,
    sensitive: risk === "high",
    sourceLevelOnly,
    blockingLabels,
    reasons,
  };
}

function workflowArrayFrom(source: Record<string, unknown>): unknown[] {
  const values: unknown[] = [];
  const workflowSummary = asRecord(source.workflowSummary);
  const workflowData = asRecord(source.workflowData);
  const candidates = [
    source.checks,
    source.statusCheckRollup,
    source.workflowRuns,
    source.workflow_runs,
    source.checkRuns,
    source.check_runs,
    source.jobs,
    workflowSummary?.checks,
    workflowData?.checks,
    workflowData?.statusCheckRollup,
    workflowData?.workflowRuns,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) values.push(...candidate);
  }

  return values;
}

function checkSnapshotFrom(value: unknown): WorkflowCheckSnapshot {
  const record = asRecord(value);
  if (!record) return { name: String(value), status: null, conclusion: null };

  return {
    name: cleanText(firstDefined(record.name, record.displayName, record.displayTitle, record.title)),
    context: cleanText(record.context),
    workflowName: cleanText(firstDefined(record.workflowName, record.workflow, record.workflow_name)),
    jobName: cleanText(firstDefined(record.jobName, record.job, record.job_name)),
    stepName: cleanText(firstDefined(record.stepName, record.step, record.step_name)),
    failureStep: cleanText(firstDefined(record.failureStep, record.failedStep, record.failed_step)),
    status: cleanText(record.status),
    conclusion: cleanText(record.conclusion),
    state: cleanText(record.state),
    required: booleanValue(record.required),
    domain: cleanText(record.domain),
    failureDomain: cleanText(record.failureDomain),
    failureDomains: Array.isArray(record.failureDomains)
      ? record.failureDomains.map((entry) => String(entry))
      : null,
  };
}

function extractWorkflowChecks(
  snapshot: Record<string, unknown>,
  source: Record<string, unknown>,
): WorkflowCheckSnapshot[] {
  const values = [
    ...workflowArrayFrom(snapshot),
    ...workflowArrayFrom(source),
  ];

  return values.map(checkSnapshotFrom);
}

function workflowSummary(classification: WorkflowClassification): CiWorkflowSummary {
  return {
    state: classification.state,
    total: classification.total,
    passed: classification.passed,
    failed: classification.failed,
    pending: classification.pending,
    skipped: classification.skipped,
    unknown: classification.unknown,
    hasInvalidWorkflowData: classification.hasInvalidWorkflowData,
  };
}

function domainsOnlyE2e(domains: readonly FailureDomain[]): boolean {
  return domains.length > 0 && domains.every((domain) => domain === "e2e_failure");
}

function nonBlockingWorkflow(
  classification: WorkflowClassification,
  risk: RiskAssessment,
): boolean {
  if (classification.failed > 0 || classification.pending > 0 || classification.hasInvalidWorkflowData) {
    return false;
  }

  if (classification.state === "all_green") return true;

  if (
    (classification.state === "mixed" || classification.state === "skipped_only") &&
    domainsOnlyE2e(classification.skippedDomains) &&
    risk.sourceLevelOnly
  ) {
    return true;
  }

  return false;
}

function hasTransientFailure(classification: WorkflowClassification): boolean {
  return classification.checks.some((check) => {
    const conclusion = normalizeToken(check.conclusion);
    return (
      check.status === "failed" &&
      (conclusion === "cancelled" ||
        conclusion === "canceled" ||
        conclusion === "timed_out" ||
        conclusion === "timeout" ||
        conclusion === "timedout")
    );
  });
}

function orderedActions(actions: Iterable<RecommendedNextAction>): RecommendedNextAction[] {
  const selected = new Set(actions);
  return ACTION_ORDER.filter((action) => selected.has(action));
}

function buildRepairPromptHint(
  actions: readonly RecommendedNextAction[],
  failedDomains: readonly FailureDomain[],
  mergeability: Mergeability,
): string {
  if (actions.includes("fix_pr_contract")) {
    return "Repair the PR body first: keep the repository PR Contract headings exactly and link exactly one issue.";
  }

  if (actions.includes("request_rebase")) {
    return `Update the branch because mergeability is ${mergeability}, then rerun the required checks.`;
  }

  if (actions.includes("request_codex_repair")) {
    return `Ask Codex to repair the failed domains: ${failedDomains.join(", ")}. Keep AF002 read-only and metadata-only.`;
  }

  if (actions.includes("rerun_failed_jobs")) {
    return "Rerun the failed jobs only after confirming the failures were transient or infrastructure-level.";
  }

  if (actions.includes("wait_for_ci")) {
    return "Wait for GitHub to finish pending or ambiguous CI checks before changing code.";
  }

  if (actions.includes("mark_ready_for_review")) {
    return "All blocking source-level checks are clear for a draft PR; mark it ready for human review, not merge.";
  }

  if (actions.includes("merge_candidate")) {
    return "All required source-level gates are clear for a low-risk ready PR; keep human approval required before merge.";
  }

  return "Resolve the blocked reasons before requesting repair, readiness, or merge.";
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

function buildMarkdownSummary(report: Omit<CiWatcherReport, "markdownSummary">): string {
  return [
    "# AF002 CI Watcher Report",
    "",
    `Repository: ${report.repo}`,
    `PR: ${report.prNumber === null ? "unknown" : `#${report.prNumber}`} ${report.prTitle}`,
    `PR state: ${report.prState}`,
    `Mergeability: ${report.mergeability}`,
    `Workflow: ${report.workflowSummary.state} (${report.workflowSummary.passed} passed, ${report.workflowSummary.failed} failed, ${report.workflowSummary.pending} pending, ${report.workflowSummary.skipped} skipped)`,
    "",
    "## Domains",
    "",
    `Failed: ${listOrNone(report.failedDomains)}`,
    `Pending: ${listOrNone(report.pendingDomains)}`,
    `Skipped: ${listOrNone(report.skippedDomains)}`,
    "",
    "## Recommendation",
    "",
    `Actions: ${listOrNone(report.recommendedNextActions)}`,
    `Human approval required: ${report.humanApprovalRequired ? "yes" : "no"}`,
    `Merge candidate: ${report.mergeCandidate ? "yes" : "no"}`,
    `Blocked reasons: ${listOrNone(report.blockedReasons)}`,
    "",
    "## Repair Hint",
    "",
    report.repairPromptHint,
  ].join("\n");
}

function recommendedActionsFor(input: {
  prState: PullRequestState;
  mergeability: Mergeability;
  workflow: WorkflowClassification;
  risk: RiskAssessment;
  blockedReasons: string[];
}): {
  actions: RecommendedNextAction[];
  mergeCandidate: boolean;
} {
  const actions = new Set<RecommendedNextAction>();
  const { prState, mergeability, workflow, risk, blockedReasons } = input;
  const hasFailedCi = workflow.failed > 0;
  const hasPendingCi = workflow.pending > 0 || workflow.hasInvalidWorkflowData;
  const hasPrContractFailure = workflow.failedDomains.includes("pr_contract_failure");

  if (prState === "closed_merged" || prState === "closed_unmerged") {
    blockedReasons.push(`PR is ${prState}; AF002 does not recommend actions for closed PRs.`);
    actions.add("blocked");
  }

  if (mergeability === "conflict" || mergeability === "behind_main" || mergeability === "diverged") {
    blockedReasons.push(`Branch mergeability is ${mergeability}; update the branch before merge review.`);
    actions.add("request_rebase");
  } else if (mergeability === "unknown") {
    blockedReasons.push("Mergeability is unknown; wait for GitHub mergeability calculation or request human review.");
    actions.add("wait_for_ci");
  }

  for (const label of risk.blockingLabels) {
    blockedReasons.push(`Blocking label is present: ${label}.`);
    actions.add("human_approval_required");
    actions.add("blocked");
  }

  if (risk.sensitive) {
    blockedReasons.push(
      "High-risk, runtime, payment, auth, security, provider, database, tenant, or user-data signals require human approval and are not merge candidates in AF002.",
    );
    actions.add("human_approval_required");
  }

  if (hasPendingCi) {
    actions.add("wait_for_ci");
    if (workflow.hasInvalidWorkflowData) actions.add("blocked");
  }

  if (hasFailedCi) {
    if (hasPrContractFailure) {
      actions.add("fix_pr_contract");
    } else if (
      workflow.failedDomains.includes("risk_gate_failure") ||
      workflow.failedDomains.includes("runtime_gate_failure")
    ) {
      actions.add("human_approval_required");
      actions.add("blocked");
    } else if (hasTransientFailure(workflow)) {
      actions.add("rerun_failed_jobs");
    } else if (
      workflow.failedDomains.every((domain) =>
        domain === "fast_ci_failure" ||
        domain === "full_ci_failure" ||
        domain === "unknown_ci_failure",
      )
    ) {
      actions.add("rerun_failed_jobs");
    } else {
      actions.add("request_codex_repair");
    }
  }

  const workflowAllowsReadiness = nonBlockingWorkflow(workflow, risk);
  const branchAllowsMerge = mergeability === "mergeable";
  const openPr = prState === "open_ready";
  const draftPr = prState === "draft";
  const lowRiskReady = !risk.sensitive && risk.blockingLabels.length === 0;

  if (!hasFailedCi && !hasPendingCi && workflowAllowsReadiness && branchAllowsMerge) {
    if (draftPr) {
      actions.add("mark_ready_for_review");
    } else if (openPr && lowRiskReady) {
      actions.add("human_approval_required");
      actions.add("merge_candidate");
    } else if (openPr) {
      actions.add("human_approval_required");
    }
  }

  const mergeCandidate =
    actions.has("merge_candidate") &&
    !actions.has("blocked") &&
    !actions.has("request_rebase") &&
    !actions.has("wait_for_ci") &&
    !actions.has("fix_pr_contract") &&
    !actions.has("request_codex_repair") &&
    !actions.has("rerun_failed_jobs") &&
    workflowAllowsReadiness &&
    branchAllowsMerge &&
    openPr &&
    lowRiskReady;

  if (actions.size === 0) actions.add("blocked");

  return {
    actions: orderedActions(actions),
    mergeCandidate,
  };
}

export function createCiWatcherReport(
  input: unknown,
  options: CiWatcherOptions = {},
): CiWatcherReport {
  const snapshot = asRecord(input);
  if (!snapshot) {
    throw new Error("CI watcher input must be a JSON object.");
  }

  const source = nestedSource(snapshot);
  const repo = repositoryName(snapshot, options);
  const prNumber = numberValue(firstDefined(source.number, source.prNumber, snapshot.prNumber));
  const prTitle = stringValue(firstDefined(source.title, source.prTitle, snapshot.prTitle), "Untitled PR");
  const prState = pullRequestState(source);
  const draft = prState === "draft";
  const base = asRecord(source.base);
  const head = asRecord(source.head);
  const baseSha = shaValue(
    firstDefined(source.baseSha, source.baseRefOid, base?.sha, snapshot.baseSha),
  );
  const headSha = shaValue(
    firstDefined(source.headSha, source.headRefOid, head?.sha, snapshot.headSha),
  );
  const mergeability = mergeabilityFrom(source);
  const workflow = classifyWorkflowChecks(extractWorkflowChecks(snapshot, source));
  const risk = assessRisk(source, snapshot);
  const blockedReasons = [...workflow.blockedReasons, ...risk.reasons];
  const { actions, mergeCandidate } = recommendedActionsFor({
    prState,
    mergeability,
    workflow,
    risk,
    blockedReasons,
  });
  const reportWithoutMarkdown: Omit<CiWatcherReport, "markdownSummary"> = {
    repo,
    prNumber,
    prTitle,
    prState,
    draft,
    baseSha,
    headSha,
    mergeability,
    workflowSummary: workflowSummary(workflow),
    failedDomains: workflow.failedDomains,
    pendingDomains: workflow.pendingDomains,
    skippedDomains: workflow.skippedDomains,
    recommendedNextActions: actions,
    humanApprovalRequired: true,
    mergeCandidate,
    blockedReasons: [...new Set(blockedReasons)],
    repairPromptHint: buildRepairPromptHint(actions, workflow.failedDomains, mergeability),
  };
  const report = {
    ...reportWithoutMarkdown,
    markdownSummary: buildMarkdownSummary(reportWithoutMarkdown),
  };

  assertCiWatcherReportSafe(report);
  return report;
}

export function assertCiWatcherReportSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
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
        throw new Error(`CI watcher output contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}
