export type ApprovalGate =
  | "none_required_for_report_only"
  | "human_review_required"
  | "owner_approval_required"
  | "production_environment_approval_required"
  | "blocked_no_auto_path";

export type ApprovalRiskLevel = "low" | "medium" | "high";

export interface ApprovalGateInput {
  changedFiles?: readonly string[];
  labels?: readonly string[];
  risk?: unknown;
  ciMergeCandidate?: boolean;
  reportOnly?: boolean;
  signals?: readonly string[];
}

export interface ApprovalGateAssessment {
  approvalGate: ApprovalGate;
  risk: ApprovalRiskLevel;
  sourceLevelOnly: boolean;
  humanApprovalRequired: boolean;
  mergePermittedByRiskGate: boolean;
  highRiskSignals: string[];
  blockedReasons: string[];
  riskNotes: string[];
}

const SOURCE_LEVEL_PATHS = [
  "docs/**",
  "tests/**",
  "lib/agent-factory/**",
  "scripts/agent-factory-*.mjs",
  "scripts/run-node-tests.mjs",
  "package.json",
  "package-lock.json",
  "**/*.md",
] as const;

const OWNER_APPROVAL_PATHS = [
  "app/api/auth/**",
  "lib/auth/**",
  "app/api/billing/**",
  "lib/billing/**",
  "app/api/payments/**",
  "lib/payments/**",
  "app/api/entitlements/**",
  "lib/entitlements/**",
  "supabase/migrations/**",
  "db/migrations/**",
  "migrations/**",
  "scripts/legal/**",
  "data/legal/**",
  "reference_corpus/**",
] as const;

const PRODUCTION_ENVIRONMENT_PATHS = [
  ".github/workflows/**",
  "app/api/**",
  "middleware.ts",
  "proxy.ts",
  "vercel.json",
  "next.config.*",
  "config/paid-launch-readiness.json",
] as const;

const BLOCKED_PATHS = [
  ".env",
  ".env.*",
  "config/secrets/**",
  "secrets/**",
  "**/*secret*",
  "**/*private-key*",
  "scripts/delete-user-data*",
  "scripts/export-user-data*",
] as const;

const BLOCKING_LABEL_PATTERNS = [
  /^blocked$/i,
  /^do-not-merge$/i,
  /^human-decision$/i,
] as const;

const OWNER_LABEL_PATTERNS = [
  /\bauth(?:entication|orization)?\b/i,
  /\bbilling\b/i,
  /\bpayment\b/i,
  /\bentitlement\b/i,
  /\bdatabase\b/i,
  /\bdb\b/i,
  /\brls\b/i,
  /\btenant\b/i,
  /\bprovider\b/i,
  /\bprivacy\b/i,
  /\bmigration\b/i,
  /\bofficial[-_ ]?source\b/i,
  /\bsource[-_ ]?rights\b/i,
] as const;

const PRODUCTION_LABEL_PATTERNS = [
  /\bruntime\b/i,
  /\blive[-_ ]?runtime\b/i,
  /\bproduction\b/i,
  /\bworkflow\b/i,
  /\bdeploy(?:ment)?\b/i,
  /\bpublic[-_ ]?launch\b/i,
] as const;

const BLOCKED_SIGNAL_PATTERNS = [
  /\bsecret\b/i,
  /\bprivate[-_ ]?key\b/i,
  /\bservice[-_ ]?role\b/i,
  /\bdelete[-_ ]?user[-_ ]?data\b/i,
  /\buser[-_ ]?data[-_ ]?deletion\b/i,
  /\bexport[-_ ]?user[-_ ]?data\b/i,
  /\bprovider[-_ ]?cost[-_ ]?explosion\b/i,
  /\bbypass\b.*\bpublic[-_ ]?launch\b/i,
] as const;

const GATE_RANK: Record<ApprovalGate, number> = {
  none_required_for_report_only: 0,
  human_review_required: 1,
  production_environment_approval_required: 2,
  owner_approval_required: 3,
  blocked_no_auto_path: 4,
};

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\u0000-\u001f]/g, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePath(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  if (text.length > 180) return null;
  if (/https?:\/\//i.test(text)) return null;
  return text.replaceAll("\\", "/");
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

function explicitRisk(value: unknown): ApprovalRiskLevel | null {
  const risk = normalizeToken(value);
  if (risk === "low" || risk === "medium" || risk === "high") return risk;
  return null;
}

function higherRisk(left: ApprovalRiskLevel, right: ApprovalRiskLevel): ApprovalRiskLevel {
  const rank: Record<ApprovalRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  return rank[right] > rank[left] ? right : left;
}

function higherGate(left: ApprovalGate, right: ApprovalGate): ApprovalGate {
  return GATE_RANK[right] > GATE_RANK[left] ? right : left;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function sourceLevelOnly(files: readonly string[], ciMergeCandidate: boolean): boolean {
  if (files.length === 0) return ciMergeCandidate;
  return files.every((file) => firstMatchingGlob(SOURCE_LEVEL_PATHS, file) !== null);
}

export function assessApprovalGate(input: ApprovalGateInput = {}): ApprovalGateAssessment {
  const files = unique((input.changedFiles ?? []).map(normalizePath).filter((entry): entry is string => Boolean(entry)));
  const labels = unique((input.labels ?? []).map(cleanText).filter((entry): entry is string => Boolean(entry)));
  const signals = unique((input.signals ?? []).map(cleanText).filter((entry): entry is string => Boolean(entry)));
  const ciMergeCandidate = input.ciMergeCandidate === true;
  const reportOnly = input.reportOnly === true;
  const sourceOnly = sourceLevelOnly(files, ciMergeCandidate);
  const highRiskSignals: string[] = [];
  const blockedReasons: string[] = [];
  const riskNotes: string[] = [];
  let gate: ApprovalGate = reportOnly
    ? "none_required_for_report_only"
    : "human_review_required";
  let risk: ApprovalRiskLevel = explicitRisk(input.risk) ?? "low";

  if (!sourceOnly && files.length > 0) {
    risk = higherRisk(risk, "medium");
    riskNotes.push("Changed-file metadata is not limited to source-level planner, docs, tests, script, or package metadata paths.");
  }

  if (files.length === 0 && ciMergeCandidate) {
    riskNotes.push("No changed-file metadata was supplied; AF005 is trusting AF002 merge-candidate risk classification.");
  }

  for (const file of files) {
    const blockedPattern = firstMatchingGlob(BLOCKED_PATHS, file);
    const ownerPattern = firstMatchingGlob(OWNER_APPROVAL_PATHS, file);
    const productionPattern = firstMatchingGlob(PRODUCTION_ENVIRONMENT_PATHS, file);

    if (blockedPattern) {
      gate = higherGate(gate, "blocked_no_auto_path");
      risk = "high";
      const reason = `Blocked path ${file} matches ${blockedPattern}.`;
      blockedReasons.push(reason);
      highRiskSignals.push(reason);
      continue;
    }

    if (productionPattern) {
      gate = higherGate(gate, "production_environment_approval_required");
      risk = "high";
      highRiskSignals.push(`Production/runtime path ${file} matches ${productionPattern}.`);
    }

    if (ownerPattern) {
      gate = higherGate(gate, "owner_approval_required");
      risk = "high";
      highRiskSignals.push(`Owner-gated path ${file} matches ${ownerPattern}.`);
    }
  }

  for (const label of labels) {
    const normalized = normalizeToken(label);

    if (BLOCKING_LABEL_PATTERNS.some((pattern) => pattern.test(normalized))) {
      gate = higherGate(gate, "blocked_no_auto_path");
      risk = "high";
      const reason = `Blocking label is present: ${label}.`;
      blockedReasons.push(reason);
      highRiskSignals.push(reason);
      continue;
    }

    if (PRODUCTION_LABEL_PATTERNS.some((pattern) => pattern.test(label))) {
      gate = higherGate(gate, "production_environment_approval_required");
      risk = "high";
      highRiskSignals.push(`Production/runtime label requires approval: ${label}.`);
    }

    if (OWNER_LABEL_PATTERNS.some((pattern) => pattern.test(label))) {
      gate = higherGate(gate, "owner_approval_required");
      risk = "high";
      highRiskSignals.push(`Owner-gated label requires approval: ${label}.`);
    }
  }

  for (const signal of signals) {
    if (BLOCKED_SIGNAL_PATTERNS.some((pattern) => pattern.test(signal))) {
      gate = higherGate(gate, "blocked_no_auto_path");
      risk = "high";
      const reason = `Blocked risk signal is present: ${signal}.`;
      blockedReasons.push(reason);
      highRiskSignals.push(reason);
      continue;
    }

    if (PRODUCTION_LABEL_PATTERNS.some((pattern) => pattern.test(signal))) {
      gate = higherGate(gate, "production_environment_approval_required");
      risk = "high";
      highRiskSignals.push(`Production/runtime risk signal requires approval: ${signal}.`);
    }

    if (OWNER_LABEL_PATTERNS.some((pattern) => pattern.test(signal))) {
      gate = higherGate(gate, "owner_approval_required");
      risk = "high";
      highRiskSignals.push(`Owner-gated risk signal requires approval: ${signal}.`);
    }
  }

  if (risk === "high" && gate === "human_review_required") {
    gate = "owner_approval_required";
  }

  if (gate === "human_review_required") {
    riskNotes.push("Human approval is required by default for AF005 v1.");
  } else if (gate === "owner_approval_required") {
    riskNotes.push("Owner approval is required before merge because the PR touches owner-gated policy or sensitive paths.");
  } else if (gate === "production_environment_approval_required") {
    riskNotes.push("Production environment approval is required before merge because the PR touches runtime, deployment, workflow, or production gates.");
  } else if (gate === "blocked_no_auto_path") {
    riskNotes.push("No automatic merge path is available until a human clears the blocking risk.");
  }

  return {
    approvalGate: gate,
    risk,
    sourceLevelOnly: sourceOnly,
    humanApprovalRequired: gate !== "none_required_for_report_only",
    mergePermittedByRiskGate: gate === "human_review_required" && risk === "low",
    highRiskSignals: unique(highRiskSignals),
    blockedReasons: unique(blockedReasons),
    riskNotes: unique(riskNotes),
  };
}
