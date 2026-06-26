export const FAILURE_DOMAINS = [
  "pr_contract_failure",
  "risk_gate_failure",
  "runtime_gate_failure",
  "fast_ci_failure",
  "full_ci_failure",
  "learner_loop_failure",
  "typecheck_failure",
  "lint_failure",
  "focused_test_failure",
  "unit_test_failure",
  "build_failure",
  "e2e_failure",
  "unknown_ci_failure",
] as const;

export type FailureDomain = (typeof FAILURE_DOMAINS)[number];

export type WorkflowState =
  | "all_green"
  | "pending"
  | "failed"
  | "skipped_only"
  | "mixed";

export type NormalizedCheckStatus =
  | "passed"
  | "pending"
  | "failed"
  | "skipped"
  | "unknown";

export interface WorkflowCheckSnapshot {
  name?: string | null;
  context?: string | null;
  workflowName?: string | null;
  jobName?: string | null;
  stepName?: string | null;
  failureStep?: string | null;
  status?: string | null;
  conclusion?: string | null;
  state?: string | null;
  required?: boolean | null;
  domain?: FailureDomain | string | null;
  failureDomain?: FailureDomain | string | null;
  failureDomains?: readonly (FailureDomain | string)[] | null;
}

export interface NormalizedWorkflowCheck {
  name: string;
  workflowName: string | null;
  status: NormalizedCheckStatus;
  conclusion: string | null;
  required: boolean;
  domain: FailureDomain;
}

export interface WorkflowClassification {
  state: WorkflowState;
  total: number;
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
  unknown: number;
  failedDomains: FailureDomain[];
  pendingDomains: FailureDomain[];
  skippedDomains: FailureDomain[];
  checks: NormalizedWorkflowCheck[];
  blockedReasons: string[];
  hasInvalidWorkflowData: boolean;
}

const DOMAIN_ORDER = new Map<FailureDomain, number>(
  FAILURE_DOMAINS.map((domain, index) => [domain, index]),
);

const DOMAIN_PATTERNS: readonly [FailureDomain, readonly RegExp[]][] = [
  [
    "pr_contract_failure",
    [
      /\bvalidate[-_: ]?pr[-_: ]?contract\b/i,
      /\bpr[-_: ]?contract\b/i,
      /\bpull[-_: ]?request[-_: ]?contract\b/i,
      /\bbody[-_: ]?contract\b/i,
    ],
  ],
  [
    "risk_gate_failure",
    [
      /\bclassify[-_: ]?risk\b/i,
      /\brisk[-_: ]?gate\b/i,
      /\brisk[-_: ]?classification\b/i,
    ],
  ],
  [
    "runtime_gate_failure",
    [
      /\bruntime[-_: ]?gate\b/i,
      /\bruntime[-_: ]?evidence\b/i,
      /\blive[-_: ]?runtime\b/i,
    ],
  ],
  [
    "learner_loop_failure",
    [
      /\bverify:learner-loop:ci\b/i,
      /\blearner[-_: ]?loop\b/i,
      /\bclosed[-_: ]?beta[-_: ]?readiness\b/i,
    ],
  ],
  ["typecheck_failure", [/\btype[-_: ]?check\b/i, /\btsc\b/i]],
  ["lint_failure", [/\blint\b/i, /\beslint\b/i]],
  [
    "focused_test_failure",
    [
      /\bfocused[-_: ]?test\b/i,
      /\btargeted[-_: ]?test\b/i,
      /\bchanged[-_: ]?test\b/i,
    ],
  ],
  [
    "unit_test_failure",
    [
      /\bunit[-_: ]?tests?\b/i,
      /\brun[-_: ]?node[-_: ]?tests\b/i,
      /\bnpm(?:\.cmd)? run test\b/i,
      /\bnode --test\b/i,
    ],
  ],
  ["build_failure", [/\bbuild\b/i, /\bnext[-_: ]?build\b/i]],
  ["e2e_failure", [/\be2e\b/i, /\bplaywright\b/i, /\bend[-_: ]?to[-_: ]?end\b/i]],
  ["full_ci_failure", [/\bfull[-_: ]?ci\b/i, /\bci[-_: ]?full\b/i, /\bfull[-_: ]?validation\b/i]],
  ["fast_ci_failure", [/\bfast[-_: ]?ci\b/i, /\bci[-_: ]?fast\b/i]],
];

const PASS_CONCLUSIONS = new Set([
  "success",
  "successful",
  "passed",
  "pass",
  "neutral",
]);

const FAILURE_CONCLUSIONS = new Set([
  "failure",
  "failed",
  "error",
  "cancelled",
  "canceled",
  "timed_out",
  "timeout",
  "timedout",
  "action_required",
  "startup_failure",
]);

const SKIPPED_CONCLUSIONS = new Set(["skipped", "skip"]);
const PENDING_STATUSES = new Set([
  "pending",
  "queued",
  "requested",
  "waiting",
  "in_progress",
  "inprogress",
  "running",
  "expected",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function validDomain(value: unknown): FailureDomain | null {
  const normalized = normalizeToken(value);
  return FAILURE_DOMAINS.includes(normalized as FailureDomain)
    ? (normalized as FailureDomain)
    : null;
}

function explicitDomain(input: WorkflowCheckSnapshot): FailureDomain | null {
  const direct =
    validDomain(input.failureDomain) ??
    validDomain(input.domain);

  if (direct) return direct;

  const domains = input.failureDomains;
  if (Array.isArray(domains)) {
    for (const domain of domains) {
      const normalized = validDomain(domain);
      if (normalized) return normalized;
    }
  }

  return null;
}

function statusFrom(input: WorkflowCheckSnapshot): NormalizedCheckStatus {
  const conclusion = normalizeToken(input.conclusion ?? input.state);
  const status = normalizeToken(input.status);

  if (PASS_CONCLUSIONS.has(conclusion)) return "passed";
  if (FAILURE_CONCLUSIONS.has(conclusion)) return "failed";
  if (SKIPPED_CONCLUSIONS.has(conclusion)) return "skipped";
  if (PENDING_STATUSES.has(conclusion) || PENDING_STATUSES.has(status)) return "pending";

  if (status === "completed" || status === "complete") return "unknown";
  if (PASS_CONCLUSIONS.has(status)) return "passed";
  if (FAILURE_CONCLUSIONS.has(status)) return "failed";
  if (SKIPPED_CONCLUSIONS.has(status)) return "skipped";

  return "unknown";
}

function checkName(input: WorkflowCheckSnapshot): string {
  return (
    cleanText(input.name) ??
    cleanText(input.context) ??
    cleanText(input.jobName) ??
    cleanText(input.workflowName) ??
    "unknown check"
  );
}

function classifyDomain(input: WorkflowCheckSnapshot): FailureDomain {
  const domain = explicitDomain(input);
  if (domain) return domain;

  const haystack = [
    input.workflowName,
    input.name,
    input.context,
    input.jobName,
    input.stepName,
    input.failureStep,
  ]
    .map((value) => cleanText(value))
    .filter((value): value is string => Boolean(value))
    .join(" ");

  for (const [candidate, patterns] of DOMAIN_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(haystack))) {
      return candidate;
    }
  }

  return "unknown_ci_failure";
}

function normalizeCheck(input: WorkflowCheckSnapshot): NormalizedWorkflowCheck {
  const status = statusFrom(input);
  const rawConclusion = cleanText(input.conclusion ?? input.state ?? input.status);

  return {
    name: checkName(input),
    workflowName: cleanText(input.workflowName),
    status,
    conclusion: rawConclusion,
    required: input.required !== false,
    domain: classifyDomain(input),
  };
}

function sortedDomains(domains: Iterable<FailureDomain>): FailureDomain[] {
  return [...new Set(domains)].sort(
    (left, right) => (DOMAIN_ORDER.get(left) ?? 999) - (DOMAIN_ORDER.get(right) ?? 999),
  );
}

function workflowStateFor(checks: readonly NormalizedWorkflowCheck[]): WorkflowState {
  if (checks.length === 0) return "pending";

  const pendingOrUnknown = checks.filter(
    (check) => check.status === "pending" || check.status === "unknown",
  ).length;
  const failed = checks.filter((check) => check.status === "failed").length;
  const skipped = checks.filter((check) => check.status === "skipped").length;
  const passed = checks.filter((check) => check.status === "passed").length;

  if (pendingOrUnknown > 0) return "pending";
  if (failed > 0) return "failed";
  if (skipped === checks.length) return "skipped_only";
  if (passed === checks.length) return "all_green";

  return "mixed";
}

export function classifyWorkflowChecks(
  inputs: readonly WorkflowCheckSnapshot[],
): WorkflowClassification {
  const checks = inputs.map(normalizeCheck);
  const failedChecks = checks.filter((check) => check.status === "failed");
  const pendingChecks = checks.filter(
    (check) => check.status === "pending" || check.status === "unknown",
  );
  const skippedChecks = checks.filter((check) => check.status === "skipped");
  const unknownChecks = checks.filter((check) => check.status === "unknown");
  const blockedReasons: string[] = [];

  if (checks.length === 0) {
    blockedReasons.push("Workflow data is missing; AF002 cannot prove that required CI has passed.");
  }

  for (const check of unknownChecks) {
    blockedReasons.push(
      `Workflow check ${check.name} has no deterministic status or conclusion.`,
    );
  }

  return {
    state: workflowStateFor(checks),
    total: checks.length,
    passed: checks.filter((check) => check.status === "passed").length,
    failed: failedChecks.length,
    pending: pendingChecks.length,
    skipped: skippedChecks.length,
    unknown: unknownChecks.length,
    failedDomains: sortedDomains(failedChecks.map((check) => check.domain)),
    pendingDomains: sortedDomains(pendingChecks.map((check) => check.domain)),
    skippedDomains: sortedDomains(skippedChecks.map((check) => check.domain)),
    checks,
    blockedReasons,
    hasInvalidWorkflowData: blockedReasons.length > 0,
  };
}
