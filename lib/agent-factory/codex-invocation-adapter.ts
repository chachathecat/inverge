import { createHash } from "node:crypto";

export const AF010_APPROVAL_PHRASE = "I approve AF010 Codex invocation";

export type CodexInvocationStatus = "planned" | "rejected";

export interface CodexInvocationPlanOptions {
  dryRun?: boolean | string;
  approvalPhrase?: string | null;
  itemId?: string | null;
  packageIndex?: number | string | null;
  now?: Date;
}

export interface CodexInvocationViolation {
  location: string;
  category:
    | "forbidden_key"
    | "secret_like_value"
    | "sensitive_label"
    | "unsupported_shape";
  message: string;
}

export interface CodexInvocationPlan {
  version: 1;
  adapter: "af010-codex-invocation-adapter";
  status: CodexInvocationStatus;
  dryRun: boolean;
  approvedForInvocation: boolean;
  canExecute: false;
  codexWillBeInvoked: false;
  metadataOnly: true;
  mutatesCode: false;
  mutatesRuntimeState: false;
  mutatesBranchState: false;
  mutatesGitHub: false;
  blockedReasons: string[];
  blockedReasonCodes: string[];
  summary: string;
  createdAt: string;
  taskPackage: {
    selectionSource: "input" | "packages" | "taskPackage";
    packageIndex: number | null;
    requestedItemId: string | null;
    inputSha256: string | null;
    textSha256: string | null;
    stringFieldCount: number;
    hasPrompt: boolean;
    promptSourceField: string | null;
    promptSha256: string | null;
    promptLineCount: number;
    promptCharCount: number;
    packageSummary: {
      itemId: string | null;
      itemTitle: string | null;
      repository: string | null;
      branchName: string | null;
      worktreePathSuggestion: string | null;
      validationCommandCount: number;
      validationCommands: string[];
    } | null;
  };
  dataBoundary: {
    safe: boolean;
    violationCount: number;
    violations: CodexInvocationViolation[];
    omittedRawPayloads: true;
  };
  invocation: {
    mode: "dry_run_plan_only" | "blocked_v1_no_execution";
    commandTemplate: string;
    executionDisabledReason: string;
  };
  guardrails: string[];
  artifacts: string[];
}

const GUARDRAILS = [
  "AF010 v1 is dry-run only and never invokes Codex.",
  "No source files, branches, commits, pushes, merges, rebases, workflow reruns, or GitHub metadata are mutated.",
  "No learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs are called.",
  "Future non-dry-run paths require the exact AF010 approval phrase before any execution gate can be considered.",
  "Artifacts are metadata-only and omit raw task-package payloads, raw PR bodies, secrets, and learner content.",
] as const;

const ARTIFACTS = [
  ".agent-factory/codex-invocation-plan.json",
  ".agent-factory/codex-invocation-plan.md",
  ".agent-factory/agent-factory-codex-invocation-summary.md",
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
  /raw.*learner/i,
  /raw.*answer/i,
  /learner.*answer/i,
  /ocr.*(?:text|payload|output)/i,
  /provider.*payload/i,
  /billing.*(?:data|record|payload)/i,
  /auth.*(?:data|record|payload|token|secret)/i,
  /payment.*(?:data|record|payload)/i,
  /private.*user.*content/i,
  /raw.*pr.*body/i,
  /pr.*body.*payload/i,
  /pull.*request.*body/i,
  /^bodyText$/i,
] as const;

const FORBIDDEN_ARTIFACT_KEY_PATTERNS = [
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
  /learner.*answer/i,
  /ocr.*text/i,
  /problem.*text/i,
  /question.*body/i,
  /answer.*body/i,
  /source.*excerpt/i,
  /provider.*payload/i,
  /billing.*data/i,
  /private.*user.*content/i,
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

const PROMPT_FIELDS = [
  "codexPrompt",
  "prompt",
  "repairPrompt",
  "invocationPrompt",
] as const;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) =>
    typeof entry === "bigint" ? entry.toString() : entry,
  );
}

function normalizeBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return true;
}

function normalizePackageIndex(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringRecordValue(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function validationCommands(record: Record<string, unknown> | null): string[] {
  const value = record?.validationCommands;
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

function promptText(record: Record<string, unknown> | null): {
  field: string | null;
  text: string | null;
} {
  if (!record) return { field: null, text: null };

  for (const field of PROMPT_FIELDS) {
    const value = record[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return { field, text: normalizeNewlines(value).trim() };
    }
  }

  return { field: null, text: null };
}

function selectTaskPackage(
  input: unknown,
  options: CodexInvocationPlanOptions,
): {
  value: unknown;
  source: "input" | "packages" | "taskPackage";
  packageIndex: number | null;
  requestedItemId: string | null;
  selectionError: string | null;
} {
  const requestedItemId = typeof options.itemId === "string" && options.itemId.trim()
    ? options.itemId.trim()
    : null;
  const packageIndex = normalizePackageIndex(options.packageIndex);
  const record = asRecord(input);

  if (record && Array.isArray(record.packages)) {
    if (requestedItemId) {
      const foundIndex = record.packages.findIndex((entry) => {
        const packageRecord = asRecord(entry);
        return packageRecord?.itemId === requestedItemId;
      });
      if (foundIndex < 0) {
        return {
          value: null,
          source: "packages",
          packageIndex: null,
          requestedItemId,
          selectionError: "Requested item_id was not found in task package collection.",
        };
      }
      return {
        value: record.packages[foundIndex],
        source: "packages",
        packageIndex: foundIndex,
        requestedItemId,
        selectionError: null,
      };
    }

    const selectedIndex = packageIndex ?? 0;
    if (selectedIndex >= record.packages.length) {
      return {
        value: null,
        source: "packages",
        packageIndex: selectedIndex,
        requestedItemId,
        selectionError: "Requested package_index is outside the task package collection.",
      };
    }

    return {
      value: record.packages[selectedIndex],
      source: "packages",
      packageIndex: selectedIndex,
      requestedItemId,
      selectionError: null,
    };
  }

  if (record && asRecord(record.taskPackage)) {
    return {
      value: record.taskPackage,
      source: "taskPackage",
      packageIndex: null,
      requestedItemId,
      selectionError: null,
    };
  }

  return {
    value: input,
    source: "input",
    packageIndex: null,
    requestedItemId,
    selectionError: null,
  };
}

function locationFor(kind: "key" | "string", index: number): string {
  return `${kind}_${index}`;
}

export function validateCodexTaskPackageText(value: unknown): {
  safe: boolean;
  violations: CodexInvocationViolation[];
  stringFieldCount: number;
  textSha256: string | null;
} {
  const seen = new Set<unknown>();
  const violations: CodexInvocationViolation[] = [];
  const textValues: string[] = [];
  let keyCount = 0;
  let stringCount = 0;

  function addViolation(
    location: string,
    category: CodexInvocationViolation["category"],
    message: string,
  ): void {
    violations.push({ location, category, message });
  }

  function visit(current: unknown): void {
    if (typeof current === "string") {
      stringCount += 1;
      const location = locationFor("string", stringCount);
      const normalized = normalizeNewlines(current);
      textValues.push(normalized);

      if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(normalized))) {
        addViolation(
          location,
          "secret_like_value",
          "Task package text contains a secret-like, token-like, API-key-like, or private-key-like value.",
        );
      }

      const unsafeLine = normalized.split("\n").find((line) =>
        SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)),
      );
      if (unsafeLine) {
        addViolation(
          location,
          "sensitive_label",
          "Task package text contains a raw-content, provider, billing, auth, payment, PR-body, or credential-like labeled field.",
        );
      }
      return;
    }

    if (current === null || typeof current !== "object") return;
    if (seen.has(current)) return;
    seen.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry) => visit(entry));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      keyCount += 1;
      const forbidden = FORBIDDEN_INPUT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        addViolation(
          locationFor("key", keyCount),
          "forbidden_key",
          "Task package contains a forbidden raw-content, provider, billing, auth, payment, PR-body, or credential-like field name.",
        );
      }
      visit(entry);
    }
  }

  visit(value);

  return {
    safe: violations.length === 0,
    violations,
    stringFieldCount: stringCount,
    textSha256: textValues.length > 0 ? hashText(textValues.join("\n---\n")) : null,
  };
}

function packageSummary(
  record: Record<string, unknown> | null,
): CodexInvocationPlan["taskPackage"]["packageSummary"] {
  const commands = validationCommands(record);

  return {
    itemId: stringRecordValue(record, ["itemId", "id"]),
    itemTitle: stringRecordValue(record, ["itemTitle", "title"]),
    repository: stringRecordValue(record, ["repository", "repo"]),
    branchName: stringRecordValue(record, ["branchName", "branch"]),
    worktreePathSuggestion: stringRecordValue(record, ["worktreePathSuggestion", "worktree"]),
    validationCommandCount: commands.length,
    validationCommands: commands,
  };
}

function summarizePlan(input: {
  status: CodexInvocationStatus;
  dryRun: boolean;
  safe: boolean;
  hasPrompt: boolean;
  blockedReasons: readonly string[];
}): string {
  if (input.status === "rejected") {
    return `AF010 rejected the Codex invocation plan: ${input.blockedReasons.join(" ")}`;
  }

  if (input.dryRun && input.safe && input.hasPrompt) {
    return "AF010 dry-run produced a metadata-safe Codex invocation plan; no Codex process will be started.";
  }

  return "AF010 produced a plan without execution.";
}

function uniqueReasonCodes(
  violations: readonly CodexInvocationViolation[],
  extraCodes: readonly string[],
): string[] {
  return [...new Set([...violations.map((entry) => entry.category), ...extraCodes])];
}

export function createCodexInvocationPlan(
  input: unknown,
  options: CodexInvocationPlanOptions = {},
): CodexInvocationPlan {
  const dryRun = normalizeBoolean(options.dryRun);
  const approvedForInvocation = options.approvalPhrase === AF010_APPROVAL_PHRASE;
  const selected = selectTaskPackage(input, options);
  const selectedRecord = asRecord(selected.value);
  const shapeViolations: CodexInvocationViolation[] = [];
  const extraReasonCodes: string[] = [];

  if (selected.selectionError) {
    shapeViolations.push({
      location: "selection",
      category: "unsupported_shape",
      message: selected.selectionError,
    });
  } else if (!selectedRecord) {
    shapeViolations.push({
      location: "input",
      category: "unsupported_shape",
      message: "Task package must be a JSON object.",
    });
  }

  const validation = selected.selectionError || !selectedRecord
    ? {
        safe: false,
        violations: shapeViolations,
        stringFieldCount: 0,
        textSha256: null,
      }
    : validateCodexTaskPackageText(selected.value);
  const violations = [...shapeViolations, ...validation.violations];
  const dataBoundarySafe = violations.length === 0;
  const prompt = promptText(selectedRecord);
  const blockedReasons: string[] = [];

  if (!dataBoundarySafe) {
    blockedReasons.push("Task package failed the AF010 metadata-only data-boundary scan.");
  }

  if (!prompt.text) {
    blockedReasons.push("Task package must include a non-empty Codex prompt field.");
    extraReasonCodes.push("missing_prompt");
  }

  if (!dryRun && !approvedForInvocation) {
    blockedReasons.push(`Future AF010 non-dry-run paths require exact approval phrase: ${AF010_APPROVAL_PHRASE}`);
    extraReasonCodes.push("missing_approval_phrase");
  }

  if (!dryRun) {
    blockedReasons.push("AF010 v1 is dry-run only; Codex execution is disabled even when the approval phrase is present.");
    extraReasonCodes.push("v1_dry_run_only");
  }

  const status: CodexInvocationStatus = blockedReasons.length > 0 ? "rejected" : "planned";
  const inputJson = selected.value === null || selected.value === undefined
    ? null
    : safeJson(selected.value);
  const promptLineCount = prompt.text ? normalizeNewlines(prompt.text).split("\n").length : 0;
  const summaryAllowed = dataBoundarySafe && selectedRecord !== null;
  const plan: CodexInvocationPlan = {
    version: 1,
    adapter: "af010-codex-invocation-adapter",
    status,
    dryRun,
    approvedForInvocation,
    canExecute: false,
    codexWillBeInvoked: false,
    metadataOnly: true,
    mutatesCode: false,
    mutatesRuntimeState: false,
    mutatesBranchState: false,
    mutatesGitHub: false,
    blockedReasons,
    blockedReasonCodes: uniqueReasonCodes(violations, extraReasonCodes),
    summary: summarizePlan({
      status,
      dryRun,
      safe: dataBoundarySafe,
      hasPrompt: Boolean(prompt.text),
      blockedReasons,
    }),
    createdAt: (options.now ?? new Date()).toISOString(),
    taskPackage: {
      selectionSource: selected.source,
      packageIndex: selected.packageIndex,
      requestedItemId: selected.requestedItemId,
      inputSha256: inputJson ? hashText(inputJson) : null,
      textSha256: validation.textSha256,
      stringFieldCount: validation.stringFieldCount,
      hasPrompt: Boolean(prompt.text),
      promptSourceField: dataBoundarySafe ? prompt.field : null,
      promptSha256: prompt.text ? hashText(prompt.text) : null,
      promptLineCount,
      promptCharCount: prompt.text?.length ?? 0,
      packageSummary: summaryAllowed ? packageSummary(selectedRecord) : null,
    },
    dataBoundary: {
      safe: dataBoundarySafe,
      violationCount: violations.length,
      violations,
      omittedRawPayloads: true,
    },
    invocation: {
      mode: dryRun && status === "planned" ? "dry_run_plan_only" : "blocked_v1_no_execution",
      commandTemplate: "omitted in AF010 v1",
      executionDisabledReason: "AF010 v1 prepares and validates invocation metadata only; it never starts Codex.",
    },
    guardrails: [...GUARDRAILS],
    artifacts: [...ARTIFACTS],
  };

  assertCodexInvocationArtifactSafe(plan);
  return plan;
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

function formatViolations(violations: readonly CodexInvocationViolation[]): string[] {
  if (violations.length === 0) return ["- None."];
  return violations.map((violation) =>
    `- ${violation.location}: ${violation.category} - ${violation.message}`,
  );
}

export function buildCodexInvocationPlanMarkdown(plan: CodexInvocationPlan): string {
  const packageSummaryLines = plan.taskPackage.packageSummary
    ? [
        `- Item: ${plan.taskPackage.packageSummary.itemId ?? "unknown"} ${plan.taskPackage.packageSummary.itemTitle ?? ""}`.trim(),
        `- Repository: ${plan.taskPackage.packageSummary.repository ?? "unknown"}`,
        `- Branch: ${plan.taskPackage.packageSummary.branchName ?? "unknown"}`,
        `- Worktree: ${plan.taskPackage.packageSummary.worktreePathSuggestion ?? "unknown"}`,
        `- Validation commands: ${plan.taskPackage.packageSummary.validationCommandCount}`,
      ]
    : ["- Redacted because the task package failed validation or was not a JSON object."];

  const markdown = [
    "# AF010 Codex Invocation Plan",
    "",
    `Status: ${plan.status}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Approved for invocation: ${plan.approvedForInvocation ? "yes" : "no"}`,
    `Can execute: ${plan.canExecute ? "yes" : "no"}`,
    `Codex will be invoked: ${plan.codexWillBeInvoked ? "yes" : "no"}`,
    `Metadata only: ${plan.metadataOnly ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    plan.summary,
    "",
    "## Task Package",
    "",
    `- Selection source: ${plan.taskPackage.selectionSource}`,
    `- Package index: ${plan.taskPackage.packageIndex ?? "n/a"}`,
    `- Requested item: ${plan.taskPackage.requestedItemId ?? "n/a"}`,
    `- Input hash: ${plan.taskPackage.inputSha256?.slice(0, 12) ?? "n/a"}`,
    `- Text hash: ${plan.taskPackage.textSha256?.slice(0, 12) ?? "n/a"}`,
    `- String fields scanned: ${plan.taskPackage.stringFieldCount}`,
    `- Prompt source: ${plan.taskPackage.promptSourceField ?? "n/a"}`,
    `- Prompt hash: ${plan.taskPackage.promptSha256?.slice(0, 12) ?? "n/a"}`,
    `- Prompt lines: ${plan.taskPackage.promptLineCount}`,
    `- Prompt chars: ${plan.taskPackage.promptCharCount}`,
    "",
    "## Package Summary",
    "",
    ...packageSummaryLines,
    "",
    "## Blocked Reasons",
    "",
    ...formatList(plan.blockedReasons),
    "",
    "## Data Boundary",
    "",
    `- Safe: ${plan.dataBoundary.safe ? "yes" : "no"}`,
    `- Violations: ${plan.dataBoundary.violationCount}`,
    `- Omitted raw payloads: ${plan.dataBoundary.omittedRawPayloads ? "yes" : "no"}`,
    "",
    "## Violations",
    "",
    ...formatViolations(plan.dataBoundary.violations),
    "",
    "## Invocation",
    "",
    `- Mode: ${plan.invocation.mode}`,
    `- Command template: ${plan.invocation.commandTemplate}`,
    `- Disabled reason: ${plan.invocation.executionDisabledReason}`,
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertCodexInvocationTextArtifactSafe(markdown, "AF010 markdown plan");
  return markdown;
}

export function buildCodexInvocationSummary(plan: CodexInvocationPlan): string {
  const summary = [
    "# AF010 Codex Invocation Adapter",
    "",
    `Status: ${plan.status}`,
    `Dry-run: ${plan.dryRun}`,
    `Codex invoked: ${plan.codexWillBeInvoked ? "yes" : "no"}`,
    `Data boundary safe: ${plan.dataBoundary.safe ? "yes" : "no"}`,
    `Violation count: ${plan.dataBoundary.violationCount}`,
    "",
    "## Result",
    "",
    plan.summary,
    "",
    "## Artifacts",
    "",
    ...plan.artifacts.map((artifact) => `- \`${artifact}\``),
    "",
    "## Guardrails",
    "",
    ...plan.guardrails.map((guardrail) => `- ${guardrail}`),
  ].join("\n");

  assertCodexInvocationTextArtifactSafe(summary, "AF010 markdown summary");
  return summary;
}

export function assertCodexInvocationTextArtifactSafe(text: string, label: string): void {
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

export function assertCodexInvocationArtifactSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF010 artifact contains a secret-like value at ${path}.`);
        }
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
      const forbidden = FORBIDDEN_ARTIFACT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`AF010 artifact contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}
