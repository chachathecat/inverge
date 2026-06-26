import {
  createCiWatcherReport,
  type CiWatcherReport,
  type RecommendedNextAction,
} from "./ci-watcher";
import { FAILURE_DOMAINS, type FailureDomain } from "./failure-classifier";
import {
  buildRepairPrompt,
  repairDataBoundaryConstraints,
  repairNonGoals,
  type RepairPromptInput,
} from "./repair-prompt";

export type RepairDomain =
  | "pr_body_repair"
  | "typecheck_repair"
  | "lint_repair"
  | "focused_test_repair"
  | "unit_test_repair"
  | "build_repair"
  | "closed_beta_readiness_repair"
  | "learner_loop_repair"
  | "rebase_required"
  | "human_review_required"
  | "blocked";

export interface SafeRepairPlannerOptions {
  repo?: string;
  doctorReport?: unknown;
  focusedTestCommand?: string;
}

export interface SafeRepairPlan {
  repo: string;
  prNumber: number | null;
  repairDomain: RepairDomain;
  repairAllowed: boolean;
  blockedReasons: string[];
  humanApprovalRequired: boolean;
  scopeLimits: string[];
  filesLikelyRelevant: string[];
  filesForbidden: string[];
  repairPrompt: string;
  validationCommands: string[];
  rollbackSteps: string[];
  markdownSummary: string;
}

interface RepairFacts {
  changedFiles: string[];
  labels: string[];
  checkTexts: string[];
  focusedTestFile: string | null;
  closedBetaReadinessFailure: boolean;
  runtimeEvidenceImplicated: boolean;
  highRiskPaths: string[];
  hardBlockingLabels: string[];
  sensitiveLabels: string[];
}

interface RepairRoute {
  repairDomain: RepairDomain;
  repairAllowed: boolean;
  blockedReasons: string[];
  domainInstructions: string[];
}

const REPAIR_DOMAIN_ORDER: readonly RepairDomain[] = [
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
] as const;

const FAILURE_DOMAIN_SET = new Set<FailureDomain>(FAILURE_DOMAINS);

const HIGH_RISK_FILE_PATTERNS = [
  "supabase/migrations/**",
  "app/api/auth/**",
  "lib/auth/**",
  "app/api/billing/**",
  "lib/billing/**",
  "app/api/payments/**",
  "lib/payments/**",
  "app/api/entitlements/**",
  "lib/entitlements/**",
  "middleware.ts",
  "proxy.ts",
  ".github/workflows/**",
  "vercel.json",
  "next.config.*",
  "config/paid-launch-readiness.json",
  "reference_corpus/**",
  "scripts/legal/**",
  "data/legal/**",
] as const;

const DEFAULT_FORBIDDEN_FILES = [
  ...HIGH_RISK_FILE_PATTERNS,
  ".env",
  ".env.*",
  "raw learner/user artifacts",
  "official question or answer body files with unclear rights",
] as const;

const FULL_VALIDATION_COMMANDS = [
  "npm.cmd run typecheck",
  "npm.cmd run lint",
  "npm.cmd run test -- --workers=1",
  "npm.cmd run verify:learner-loop:ci",
  "npm.cmd run check:closed-beta-readiness",
  "npm.cmd run build",
  "git diff --check",
  "git diff --cached --check",
] as const;

const BASE_SCOPE_LIMITS = [
  "AF004 v1 is a read-only planner: it generates local JSON and Markdown artifacts but does not modify GitHub, runtime state, or source files by itself.",
  "Keep any follow-up repair limited to the selected repair domain and the smallest set of directly relevant files.",
  "Preserve existing tests and validation gates; fix implementation defects instead of weakening checks.",
  "Use focused validation first, then run the broader required validation commands after the repair.",
  "Keep generated artifacts metadata-only and reviewable.",
] as const;

const DEFAULT_ROLLBACK_STEPS = [
  "Stop before editing if the repair requires a forbidden file, policy decision, migration, secret, provider call, learner data, or runtime-state mutation.",
  "Inspect the focused diff with git diff before running broad validation.",
  "Rollback by reverting only the focused repair commit or restoring the specific touched files from HEAD.",
  "Do not use git reset --hard on a dirty or shared worktree without explicit human approval.",
] as const;

const DOMAIN_DEFAULT_FILES: Record<RepairDomain, readonly string[]> = {
  pr_body_repair: [
    ".agent-factory/pr-body.md",
    "scripts/agent-factory-doctor-pr-body.mjs",
    "lib/agent-factory/pr-contract-doctor.ts",
    "tests/agent-factory-pr-contract-doctor.test.mjs",
    "docs/agent-factory-pr-contract-doctor.md",
  ],
  typecheck_repair: [
    "lib/**",
    "app/**",
    "components/**",
    "hooks/**",
    "types/**",
    "tests/**",
    "tsconfig.json",
  ],
  lint_repair: [
    "lib/**",
    "app/**",
    "components/**",
    "hooks/**",
    "scripts/**",
    "tests/**",
    "eslint.config.mjs",
  ],
  focused_test_repair: [
    "tests/**",
    "lib/**",
    "scripts/**",
  ],
  unit_test_repair: [
    "tests/**",
    "lib/**",
    "scripts/**",
    "app/**",
    "components/**",
  ],
  build_repair: [
    "app/**",
    "components/**",
    "lib/**",
    "hooks/**",
    "next.config.ts",
    "package.json",
    "tsconfig.json",
  ],
  closed_beta_readiness_repair: [
    "scripts/check-closed-beta-readiness.mjs",
    "tests/*closed-beta*.mjs",
    "tests/staging-closed-beta-readiness.test.mjs",
    "docs/**",
  ],
  learner_loop_repair: [
    "tests/*learner*.mjs",
    "tests/*learning*.mjs",
    "tests/*quality*.mjs",
    "lib/**",
    "app/**",
  ],
  rebase_required: [
    "roadmap/active-program.yml",
    "package-lock.json",
    "package.json",
  ],
  human_review_required: [
    ".agent-factory/ci-watcher-report.json",
    ".agent-factory/ci-watcher-report.md",
  ],
  blocked: [
    ".agent-factory/ci-watcher-report.json",
    ".agent-factory/safe-repair-plan.md",
  ],
};

const HARD_BLOCKING_LABEL_PATTERNS = [
  /^blocked$/,
  /^do-not-merge$/,
  /^human-decision$/,
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
  /\bneeds[-_ ]?live[-_ ]?runtime\b/i,
  /\bdatabase\b/i,
  /\bdb\b/i,
  /\brls\b/i,
  /\btenant\b/i,
  /\bsecurity\b/i,
  /\bprovider\b/i,
  /\buser[-_ ]?data\b/i,
  /\bprivacy\b/i,
  /\bmigration\b/i,
  /\bofficial[-_ ]?source\b/i,
  /\bpublic[-_ ]?launch\b/i,
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

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const withoutControls = value.replace(/[\u0000-\u001f]/g, "").trim();
  return withoutControls.length > 0 ? withoutControls : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
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

function matchesAnyGlob(patterns: readonly string[], filePath: string): boolean {
  return patterns.some((pattern) => matchesGlob(pattern, filePath));
}

function isSafeMetadataPath(value: string): boolean {
  if (value.length > 180) return false;
  if (/[\u0000-\u001f]/.test(value)) return false;
  if (/https?:\/\//i.test(value)) return false;
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return false;
  return /^[A-Za-z0-9._\-/*{}[\]@+ :\\]+$/.test(value);
}

function safePath(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const normalized = text.replaceAll("\\", "/");
  return isSafeMetadataPath(normalized) ? normalized : null;
}

function recordsFrom(input: Record<string, unknown>): Record<string, unknown>[] {
  return [
    input,
    asRecord(input.pullRequest),
    asRecord(input.pull_request),
    asRecord(input.pr),
    asRecord(input.source),
  ].filter((record): record is Record<string, unknown> => record !== null);
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
      if (typeof entry === "string") return safePath(entry);
      const record = asRecord(entry);
      return (
        safePath(record?.path) ??
        safePath(record?.filename) ??
        safePath(record?.file)
      );
    })
    .filter((entry): entry is string => Boolean(entry));
}

function checkTextsFromArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return cleanText(entry);
      return [
        record.name,
        record.displayName,
        record.context,
        record.workflowName,
        record.workflow,
        record.jobName,
        record.job,
        record.stepName,
        record.failureStep,
        record.failedStep,
        record.domain,
        record.failureDomain,
      ]
        .map((field) => cleanText(field))
        .filter((field): field is string => Boolean(field))
        .join(" ");
    })
    .filter((entry): entry is string => Boolean(entry));
}

function checkTextsFrom(record: Record<string, unknown>): string[] {
  const workflowSummary = asRecord(record.workflowSummary);
  const workflowData = asRecord(record.workflowData);

  return [
    ...checkTextsFromArray(record.checks),
    ...checkTextsFromArray(record.statusCheckRollup),
    ...checkTextsFromArray(record.workflowRuns),
    ...checkTextsFromArray(record.workflow_runs),
    ...checkTextsFromArray(record.checkRuns),
    ...checkTextsFromArray(record.check_runs),
    ...checkTextsFromArray(record.jobs),
    ...checkTextsFromArray(workflowSummary?.checks),
    ...checkTextsFromArray(workflowData?.checks),
    ...checkTextsFromArray(workflowData?.statusCheckRollup),
    ...checkTextsFromArray(workflowData?.workflowRuns),
  ];
}

function focusedTestFileFrom(checkTexts: readonly string[]): string | null {
  for (const text of checkTexts) {
    const match = text.match(/\btests\/[A-Za-z0-9._/@+\-]+\.test\.mjs\b/);
    if (match) return match[0];
  }

  return null;
}

function validFailureDomain(value: unknown): FailureDomain | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return FAILURE_DOMAIN_SET.has(normalized as FailureDomain)
    ? (normalized as FailureDomain)
    : null;
}

function normalizeFailureDomains(values: unknown): FailureDomain[] {
  if (!Array.isArray(values)) return [];

  return unique(
    values
      .map((entry) => validFailureDomain(entry))
      .filter((entry): entry is FailureDomain => Boolean(entry)),
  ) as FailureDomain[];
}

function normalizeActions(values: unknown): RecommendedNextAction[] {
  if (!Array.isArray(values)) return [];

  return unique(
    values
      .map((entry) =>
        String(entry ?? "")
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, "_"),
      )
      .filter(Boolean),
  ) as RecommendedNextAction[];
}

function isCiWatcherReport(value: unknown): value is CiWatcherReport {
  const record = asRecord(value);
  return Boolean(
    record &&
      Array.isArray(record.failedDomains) &&
      Array.isArray(record.recommendedNextActions) &&
      asRecord(record.workflowSummary),
  );
}

function reportFrom(input: unknown, options: SafeRepairPlannerOptions): CiWatcherReport {
  if (isCiWatcherReport(input)) {
    return {
      ...input,
      repo: cleanText(input.repo) ?? options.repo ?? "unknown",
      prNumber: numberValue(input.prNumber),
      failedDomains: normalizeFailureDomains(input.failedDomains),
      pendingDomains: normalizeFailureDomains(input.pendingDomains),
      skippedDomains: normalizeFailureDomains(input.skippedDomains),
      recommendedNextActions: normalizeActions(input.recommendedNextActions),
      blockedReasons: Array.isArray(input.blockedReasons)
        ? input.blockedReasons.map((reason) => cleanText(reason)).filter((reason): reason is string => Boolean(reason))
        : [],
    };
  }

  return createCiWatcherReport(input, {
    repo: options.repo,
  });
}

function collectFacts(input: unknown, report: CiWatcherReport): RepairFacts {
  const root = asRecord(input);
  const sourceRecords = root ? recordsFrom(root) : [];
  const changedFiles = unique(
    sourceRecords.flatMap((record) => [
      ...filesFrom(record.files),
      ...filesFrom(record.changedFiles),
    ]),
  );
  const labels = unique(sourceRecords.flatMap((record) => labelsFrom(record.labels)));
  const checkTexts = unique([
    ...sourceRecords.flatMap((record) => checkTextsFrom(record)),
    ...report.failedDomains,
    ...report.pendingDomains,
    ...report.skippedDomains,
  ]);
  const focusedTestFile = focusedTestFileFrom(checkTexts);
  const closedBetaReadinessFailure =
    (report.failedDomains.includes("learner_loop_failure") ||
      report.failedDomains.includes("runtime_gate_failure")) &&
    checkTexts.some((text) => /closed[-_ ]?beta|check:closed-beta-readiness/i.test(text));
  const runtimeEvidenceImplicated =
    report.failedDomains.includes("runtime_gate_failure") ||
    checkTexts.some((text) => /runtime[-_ ]?evidence|live[-_ ]?runtime|staging/i.test(text)) ||
    labels.some((label) => /\bneeds[-_ ]?live[-_ ]?runtime\b|\blive[-_ ]?runtime\b/i.test(label));
  const highRiskPaths = changedFiles.filter((file) => matchesAnyGlob(HIGH_RISK_FILE_PATTERNS, file));
  const hardBlockingLabels = labels.filter((label) =>
    HARD_BLOCKING_LABEL_PATTERNS.some((pattern) => pattern.test(normalizeToken(label))),
  );
  const sensitiveLabels = labels.filter((label) =>
    SENSITIVE_LABEL_PATTERNS.some((pattern) => pattern.test(label)),
  );

  return {
    changedFiles,
    labels,
    checkTexts,
    focusedTestFile,
    closedBetaReadinessFailure,
    runtimeEvidenceImplicated,
    highRiskPaths,
    hardBlockingLabels,
    sensitiveLabels,
  };
}

function doctorStatus(doctorReport: unknown): string | null {
  const record = asRecord(doctorReport);
  if (!record) return null;
  const validAfter = typeof record.validAfter === "boolean" ? record.validAfter : null;
  const warningCount = Array.isArray(record.remainingWarnings)
    ? record.remainingWarnings.length
    : 0;

  if (validAfter === true && warningCount === 0) {
    return "AF003 doctor report is valid after repair with no remaining warnings.";
  }

  if (validAfter === true) {
    return "AF003 doctor report is valid after repair, but remaining warnings require manual review before use.";
  }

  if (validAfter === false) {
    return "AF003 doctor report remains invalid; rerun AF003 with the issue number or request human review.";
  }

  return "AF003 doctor report was supplied; review it before applying any PR body repair.";
}

function prBodyDoctorCommand(prNumber: number | null): string {
  const issueFlag = prNumber === null ? "" : ` --issue ${prNumber}`;
  return `npm.cmd run agent-factory:doctor-pr-body -- --body .agent-factory/pr-body.md${issueFlag}`;
}

function focusedTestCommand(facts: RepairFacts, options: SafeRepairPlannerOptions): string {
  const supplied = cleanText(options.focusedTestCommand);
  if (supplied) return supplied;

  if (facts.focusedTestFile) {
    return `node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test ${facts.focusedTestFile}`;
  }

  return "npm.cmd run test -- --workers=1";
}

function validationCommandsFor(
  repairDomain: RepairDomain,
  facts: RepairFacts,
  report: CiWatcherReport,
  options: SafeRepairPlannerOptions,
): string[] {
  const focused = (() => {
    if (repairDomain === "pr_body_repair") return [prBodyDoctorCommand(report.prNumber)];
    if (repairDomain === "typecheck_repair") return ["npm.cmd run typecheck"];
    if (repairDomain === "lint_repair") return ["npm.cmd run lint"];
    if (repairDomain === "focused_test_repair") return [focusedTestCommand(facts, options)];
    if (repairDomain === "unit_test_repair") return ["npm.cmd run test -- --workers=1"];
    if (repairDomain === "build_repair") return ["npm.cmd run build"];
    if (repairDomain === "learner_loop_repair") return ["npm.cmd run verify:learner-loop:ci"];
    if (repairDomain === "closed_beta_readiness_repair") {
      return ["npm.cmd run check:closed-beta-readiness"];
    }
    if (repairDomain === "rebase_required") {
      return [
        "git fetch origin main",
        "git status --short",
        "git rebase origin/main",
      ];
    }
    return ["npm.cmd run agent-factory:watch -- --snapshot .agent-factory/pr-ci-snapshot.json --stdout markdown"];
  })();

  return unique([...focused, ...FULL_VALIDATION_COMMANDS]);
}

function filesLikelyRelevantFor(repairDomain: RepairDomain, facts: RepairFacts): string[] {
  const changedFiles = facts.changedFiles.filter(
    (file) => !matchesAnyGlob(HIGH_RISK_FILE_PATTERNS, file),
  );
  const domainDefaults = [...DOMAIN_DEFAULT_FILES[repairDomain]];
  const focusedFile = facts.focusedTestFile ? [facts.focusedTestFile] : [];

  return unique([...focusedFile, ...changedFiles, ...domainDefaults]).slice(0, 24);
}

function scopeLimitsFor(repairDomain: RepairDomain, route: RepairRoute): string[] {
  const domainLimit = (() => {
    if (repairDomain === "pr_body_repair") {
      return "Route PR Contract failures to AF003; do not start source-code repair for PR body-only failures.";
    }

    if (repairDomain === "build_repair") {
      return "Build repair must avoid unrelated UI, product copy, route, pricing, auth, billing, or learner-flow rewrites.";
    }

    if (repairDomain === "learner_loop_repair") {
      return "Learner-loop repair must preserve quality/eval thresholds and one-next-action learner-loop guardrails.";
    }

    if (repairDomain === "closed_beta_readiness_repair") {
      return "Closed-beta readiness repair must not mark runtime evidence complete without real runtime evidence.";
    }

    if (repairDomain === "rebase_required") {
      return "Resolve branch freshness or conflicts before any source repair.";
    }

    if (!route.repairAllowed) {
      return "Do not perform source repair until the blocked or human-review reason is cleared.";
    }

    return "Repair only the failing domain; do not perform opportunistic refactors.";
  })();

  return unique([
    ...BASE_SCOPE_LIMITS,
    domainLimit,
    ...repairDataBoundaryConstraints(),
  ]);
}

function rollbackStepsFor(repairDomain: RepairDomain): string[] {
  if (repairDomain === "rebase_required") {
    return [
      "If a rebase starts and conflicts are unsafe or out of scope, run git rebase --abort.",
      "If branch update changes unrelated files, stop and request human review.",
      ...DEFAULT_ROLLBACK_STEPS,
    ];
  }

  if (repairDomain === "pr_body_repair") {
    return [
      "Discard .agent-factory/pr-body.repaired.md if AF003 warnings cannot be resolved safely.",
      "Do not paste a repaired PR body into GitHub until a human reviews the local artifact.",
      ...DEFAULT_ROLLBACK_STEPS,
    ];
  }

  return [...DEFAULT_ROLLBACK_STEPS];
}

function routeFor(
  report: CiWatcherReport,
  facts: RepairFacts,
  doctorReport: unknown,
): RepairRoute {
  const blockedReasons = unique(report.blockedReasons);

  if (facts.hardBlockingLabels.length > 0) {
    return {
      repairDomain: "blocked",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        ...facts.hardBlockingLabels.map((label) => `Hard blocking label is present: ${label}.`),
      ],
      domainInstructions: [
        "Stop. A blocking label requires a human decision before any repair plan can be executed.",
      ],
    };
  }

  if (facts.highRiskPaths.length > 0) {
    return {
      repairDomain: "blocked",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        ...facts.highRiskPaths.map((file) => `High-risk path requires human repair planning: ${file}.`),
      ],
      domainInstructions: [
        "Stop. High-risk paths are outside AF004 automatic repair planning.",
        "Create a human-decision record if the repair needs auth, billing, payment, provider, migration, source-rights, user-data, or production policy choices.",
      ],
    };
  }

  if (report.failedDomains.includes("risk_gate_failure")) {
    return {
      repairDomain: "blocked",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        "Risk gate failure requires human review; AF004 must not weaken risk classification or gates.",
      ],
      domainInstructions: [
        "Stop. Repair the risk classification or policy issue with human review instead of code repair.",
      ],
    };
  }

  if (
    report.mergeability === "conflict" ||
    report.mergeability === "behind_main" ||
    report.mergeability === "diverged" ||
    report.recommendedNextActions.includes("request_rebase")
  ) {
    return {
      repairDomain: "rebase_required",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        `Branch mergeability is ${report.mergeability}; update the branch before source repair.`,
      ],
      domainInstructions: [
        "Update the branch from origin/main or resolve conflicts before source repair.",
        "Do not combine rebase conflict resolution with unrelated code repair.",
        "After the branch is current, rerun AF002 and regenerate the AF004 plan.",
      ],
    };
  }

  if (report.failedDomains.includes("pr_contract_failure")) {
    const status = doctorStatus(doctorReport);
    return {
      repairDomain: "pr_body_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Run the AF003 PR Contract Doctor handoff for PR body repair.",
        `Suggested command: ${prBodyDoctorCommand(report.prNumber)}`,
        "Review the repaired body locally before pasting it into GitHub.",
        status ?? "No AF003 doctor report was supplied; AF004 only plans the handoff.",
      ],
    };
  }

  if (facts.closedBetaReadinessFailure) {
    const needsHuman = facts.runtimeEvidenceImplicated || report.failedDomains.includes("runtime_gate_failure");
    return {
      repairDomain: "closed_beta_readiness_repair",
      repairAllowed: !needsHuman,
      blockedReasons: needsHuman
        ? [
            ...blockedReasons,
            "Closed-beta readiness failure implicates runtime evidence; human review is required before repair.",
          ]
        : blockedReasons,
      domainInstructions: [
        "Inspect closed-beta readiness metadata and evidence requirements before source changes.",
        "Do not mark runtime evidence complete without an actual runtime artifact.",
        "Do not bypass closed-beta quality, source, privacy, billing, or launch gates.",
      ],
    };
  }

  if (report.failedDomains.includes("runtime_gate_failure")) {
    return {
      repairDomain: "human_review_required",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        "Runtime gate failure requires human review and runtime evidence; AF004 will not generate an automatic code repair plan.",
      ],
      domainInstructions: [
        "Gather runtime evidence and clarify the failing runtime gate before changing source.",
      ],
    };
  }

  if (facts.sensitiveLabels.length > 0) {
    return {
      repairDomain: "human_review_required",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        ...facts.sensitiveLabels.map((label) => `Sensitive label requires human review: ${label}.`),
      ],
      domainInstructions: [
        "Stop automatic repair planning until a human confirms the sensitive scope and evidence requirements.",
      ],
    };
  }

  if (report.failedDomains.includes("typecheck_failure")) {
    return {
      repairDomain: "typecheck_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Fix TypeScript errors with the smallest local type or implementation change.",
        "Prefer existing local types and helpers over new abstractions.",
        "Do not silence the compiler with broad any casts, ts-ignore, or skipped type checks.",
      ],
    };
  }

  if (report.failedDomains.includes("lint_failure")) {
    return {
      repairDomain: "lint_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Fix ESLint violations in the smallest relevant files.",
        "Do not disable rules globally or add blanket eslint-disable comments.",
        "Preserve behavior while making the code pass lint.",
      ],
    };
  }

  if (report.failedDomains.includes("focused_test_failure")) {
    return {
      repairDomain: "focused_test_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Reproduce the focused failing test first.",
        "Fix implementation behavior unless the test is demonstrably stale against the current product source of truth.",
        "Do not weaken or delete the focused regression test to pass CI.",
      ],
    };
  }

  if (report.failedDomains.includes("unit_test_failure")) {
    return {
      repairDomain: "unit_test_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Run the full node test command and inspect the first deterministic failing test.",
        "Fix the underlying implementation or fixture contract without weakening coverage.",
        "Keep the repair scoped to the failing unit-test domain.",
      ],
    };
  }

  if (report.failedDomains.includes("build_failure")) {
    return {
      repairDomain: "build_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Fix build errors without unrelated UI/product rewrites.",
        "Avoid changing learner product copy, pricing, auth, billing, routes, or launch gates unless directly required by the build error and approved.",
        "Run build validation first, then the broader validation sequence.",
      ],
    };
  }

  if (report.failedDomains.includes("learner_loop_failure")) {
    return {
      repairDomain: "learner_loop_repair",
      repairAllowed: true,
      blockedReasons,
      domainInstructions: [
        "Treat learner-loop and quality/eval failures as product quality gates.",
        "Do not lower quality/eval thresholds, delete assertions, or bypass learning-loop acceptance criteria.",
        "Preserve one biggest gap, one next action, rewrite/recalculation, scheduled review, and data-boundary guardrails.",
      ],
    };
  }

  if (
    report.failedDomains.includes("fast_ci_failure") ||
    report.failedDomains.includes("full_ci_failure") ||
    report.failedDomains.includes("e2e_failure") ||
    report.failedDomains.includes("unknown_ci_failure") ||
    report.recommendedNextActions.includes("rerun_failed_jobs") ||
    report.recommendedNextActions.includes("wait_for_ci")
  ) {
    return {
      repairDomain: "human_review_required",
      repairAllowed: false,
      blockedReasons: [
        ...blockedReasons,
        "Failure is generic, E2E, pending, transient, ambiguous, or unknown; AF004 defaults to human review instead of source repair.",
      ],
      domainInstructions: [
        "Inspect CI logs or wait for deterministic failure classification before generating a code repair prompt.",
        "Do not repair source from an ambiguous failure domain.",
      ],
    };
  }

  return {
    repairDomain: "human_review_required",
    repairAllowed: false,
    blockedReasons: [
      ...blockedReasons,
      "No deterministic repairable failed domain was found.",
    ],
    domainInstructions: [
      "Request human review or rerun AF002 with a richer metadata snapshot.",
    ],
  };
}

function sortedRepairDomain(domain: RepairDomain): RepairDomain {
  if (!REPAIR_DOMAIN_ORDER.includes(domain)) {
    return "human_review_required";
  }
  return domain;
}

function markdownBoolean(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}

function listOrNone(values: readonly string[]): string {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- None.";
}

function buildMarkdownSummary(plan: Omit<SafeRepairPlan, "markdownSummary">): string {
  return [
    "# AF004 Safe Repair Plan",
    "",
    `Repository: ${plan.repo}`,
    `PR: ${plan.prNumber === null ? "unknown" : `#${plan.prNumber}`}`,
    `Repair domain: ${plan.repairDomain}`,
    `Repair allowed: ${markdownBoolean(plan.repairAllowed)}`,
    `Human approval required: ${markdownBoolean(plan.humanApprovalRequired)}`,
    "",
    "## Blocked Reasons",
    "",
    listOrNone(plan.blockedReasons),
    "",
    "## Scope Limits",
    "",
    listOrNone(plan.scopeLimits),
    "",
    "## Likely Relevant Files",
    "",
    listOrNone(plan.filesLikelyRelevant),
    "",
    "## Forbidden Files",
    "",
    listOrNone(plan.filesForbidden),
    "",
    "## Validation Commands",
    "",
    listOrNone(plan.validationCommands),
    "",
    "## Rollback Steps",
    "",
    listOrNone(plan.rollbackSteps),
    "",
    "## Repair Prompt",
    "",
    "```text",
    plan.repairPrompt,
    "```",
  ].join("\n");
}

export function createSafeRepairPlan(
  input: unknown,
  options: SafeRepairPlannerOptions = {},
): SafeRepairPlan {
  const report = reportFrom(input, options);
  const facts = collectFacts(input, report);
  const route = routeFor(report, facts, options.doctorReport);
  const repairDomain = sortedRepairDomain(route.repairDomain);
  const validationCommands = validationCommandsFor(repairDomain, facts, report, options);
  const rollbackSteps = rollbackStepsFor(repairDomain);
  const promptInput: RepairPromptInput = {
    repo: report.repo,
    prNumber: report.prNumber,
    repairDomain,
    repairAllowed: route.repairAllowed,
    blockedReasons: unique(route.blockedReasons),
    humanApprovalRequired: true,
    scopeLimits: scopeLimitsFor(repairDomain, route),
    filesLikelyRelevant: filesLikelyRelevantFor(repairDomain, facts),
    filesForbidden: unique([
      ...DEFAULT_FORBIDDEN_FILES,
      ...facts.highRiskPaths.map((file) => `matched high-risk path: ${file}`),
    ]),
    domainInstructions: route.domainInstructions,
    validationCommands,
    rollbackSteps,
  };
  const repairPrompt = buildRepairPrompt(promptInput);
  const planWithoutMarkdown: Omit<SafeRepairPlan, "markdownSummary"> = {
    repo: promptInput.repo,
    prNumber: promptInput.prNumber,
    repairDomain: promptInput.repairDomain,
    repairAllowed: promptInput.repairAllowed,
    blockedReasons: [...promptInput.blockedReasons],
    humanApprovalRequired: promptInput.humanApprovalRequired,
    scopeLimits: [...promptInput.scopeLimits],
    filesLikelyRelevant: [...promptInput.filesLikelyRelevant],
    filesForbidden: [...promptInput.filesForbidden],
    repairPrompt,
    validationCommands: [...promptInput.validationCommands],
    rollbackSteps: [...promptInput.rollbackSteps],
  };
  const plan = {
    ...planWithoutMarkdown,
    markdownSummary: buildMarkdownSummary(planWithoutMarkdown),
  };

  assertSafeRepairPlanOutputSafe(plan);
  return plan;
}

export function safeRepairNonGoals(): readonly string[] {
  return repairNonGoals();
}

export function safeRepairDataBoundaryConstraints(): readonly string[] {
  return repairDataBoundaryConstraints();
}

export function assertSafeRepairPlanOutputSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      const secretPattern = SECRET_VALUE_PATTERNS.find((pattern) => pattern.test(current));
      if (secretPattern) {
        throw new Error(`Safe repair output contains a secret-looking value at ${path}.`);
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
        throw new Error(`Safe repair output contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}
