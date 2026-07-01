import { createHash } from "node:crypto";

import { prContractHeadings } from "./pr-contract-doctor";
import { validateCodexTaskPackageText } from "./codex-invocation-adapter";

export const AF018_APPROVAL_PHRASE = "I approve AF018 draft PR creation";
export const AGENT_FACTORY_APPROVED_DRAFT_PR_VERSION = 1;
export const AF018_MODEL = "gpt-5.5";
export const AF018_EFFORT = "medium";

export type Af018DraftPrStatus = "planned" | "rejected";

export interface Af018PackageSummary {
  itemId: string | null;
  itemTitle: string | null;
  repository: string | null;
  branchName: string | null;
  validationCommandCount: number;
  risk: "low" | "medium" | "high";
}

export interface Af018ChangedFileViolation {
  path: string;
  code: "forbidden_path" | "outside_allowlist";
  message: string;
}

export interface Af018DraftPrPlan {
  version: 1;
  adapter: "af018-approved-draft-pr-creator";
  status: Af018DraftPrStatus;
  dryRun: boolean;
  approvedForWrite: boolean;
  canExecute: boolean;
  createdAt: string;
  source: {
    actor: string | null;
    actorAllowed: boolean;
    repository: string | null;
    workflowName: string | null;
    workflowRunId: string | null;
  };
  target: {
    issueNumber: number | null;
    roadmapItemId: string | null;
    taskPackageItemId: string | null;
    baseBranch: string;
    branchName: string | null;
    commitTitle: string | null;
    prTitle: string | null;
  };
  taskPackage: Af018PackageSummary | null;
  changedFiles: {
    count: number;
    maxAllowed: number;
    files: string[];
    violations: Af018ChangedFileViolation[];
  };
  pathBoundary: {
    allowedPathPrefixes: string[];
    forbiddenPathPrefixes: string[];
    failClosed: true;
  };
  pullRequest: {
    draftOnly: true;
    autoMerge: false;
    maintainerCanModify: false;
    generatedContractPath: string;
    generatedContractSha256: string;
    generatedContractLineCount: number;
    closingReferenceCount: number;
    closingReferenceIssue: number | null;
    requiredHeadingsPresent: boolean;
  };
  actions: {
    willGenerateTaskPackage: boolean;
    willRunCodex: boolean;
    willEditWorkingTree: boolean;
    willCreateBranch: boolean;
    willCreateCommit: boolean;
    willPush: boolean;
    willOpenDraftPr: boolean;
    willMarkReadyForReview: false;
    willRerunWorkflow: false;
    willMergeOrRebase: false;
    willAutoMerge: false;
  };
  permissions: {
    contents: "read" | "write";
    pullRequests: "read" | "write";
    issues: "read";
    actions: "read";
    checks: "read";
    workflows: "none";
    merge: "none";
  };
  validation: {
    commands: string[];
    summaryPath: string;
    summarySha256: string | null;
  };
  codex: {
    action: "openai/codex-action@v1";
    sandbox: "workspace-write";
    safetyStrategy: "drop-sudo";
    model: typeof AF018_MODEL;
    effort: typeof AF018_EFFORT;
    costNote: string;
  };
  dataBoundary: {
    metadataOnlyArtifacts: true;
    omittedCodexTranscript: true;
    promptInputSanitized: boolean;
    violationCount: number;
  };
  rollback: string[];
  blockedReasons: string[];
  blockedReasonCodes: string[];
  artifacts: string[];
}

export interface CreateAf018DraftPrPlanOptions {
  packageInput?: unknown;
  changedFiles?: readonly string[];
  targetIssue?: number | string | null;
  targetRoadmapItem?: string | null;
  actor?: string | null;
  allowedActors?: readonly string[];
  repository?: string | null;
  workflowName?: string | null;
  workflowRunId?: string | number | null;
  dryRun?: boolean | string | null;
  approvalPhrase?: string | null;
  baseBranch?: string | null;
  branchName?: string | null;
  commitTitle?: string | null;
  prTitle?: string | null;
  maxChangedFiles?: number | string | null;
  allowedPathPrefixes?: readonly string[];
  forbiddenPathPrefixes?: readonly string[];
  validationCommands?: readonly string[];
  validationSummaryText?: string | null;
  generatedContractPath?: string | null;
  validationSummaryPath?: string | null;
  now?: Date;
}

const DEFAULT_ALLOWED_ACTORS = ["chachathecat"] as const;

const DEFAULT_ALLOWED_PATH_PREFIXES = [
  ".github/codex/prompts/",
  "docs/",
  "lib/agent-factory/",
  "scripts/agent-factory-",
  "scripts/run-node-tests.mjs",
  "tests/",
  "package.json",
] as const;

const DEFAULT_FORBIDDEN_PATH_PREFIXES = [
  ".agent-factory/",
  ".github/workflows/",
  ".github/actions/",
  ".env",
  "app/api/",
  "lib/auth/",
  "lib/inverge/billing",
  "lib/inverge/checkout-provider",
  "lib/inverge/second-exam-ai-provider",
  "lib/review-os/past-exam-ocr",
  "local_official_materials/",
  "raw_official_materials/",
  "private_qnet_downloads/",
  "qnet_downloads/",
  "official_materials_ocr_tmp/",
  "qnet_ocr_tmp/",
  "supabase/",
  "migrations/",
  "middleware.ts",
  "next.config",
  "vercel.json",
] as const;

const DEFAULT_VALIDATION_COMMANDS = [
  "npm run typecheck",
  "npm run lint",
  "npm test -- tests/agent-factory-approved-draft-pr-creator.test.mjs",
  "git diff --check",
] as const;

const ARTIFACTS = [
  ".agent-factory/af018-draft-pr-plan.json",
  ".agent-factory/af018-draft-pr-plan.md",
  ".agent-factory/af018-pr-body.md",
  ".agent-factory/af018-validation-summary.md",
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
  /^\s*["']?(?:raw[_\-\s]?learner[_\-\s]?(?:content|answer|text)?|rawLearnerAnswer|learner[_\-\s]?answer|raw[_\-\s]?answer)["']?\s*[:=]/i,
  /^\s*["']?(?:ocr[_\-\s]?(?:text|payload|output)|ocrText|provider[_\-\s]?payload|providerPayload)["']?\s*[:=]/i,
  /^\s*["']?(?:problem[_\-\s]?text|question[_\-\s]?body|answer[_\-\s]?body|problemText|answerBody)["']?\s*[:=]/i,
  /^\s*["']?(?:billing[_\-\s]?(?:data|record|payload)|auth[_\-\s]?(?:data|record|payload|token|secret)|payment[_\-\s]?(?:data|record|payload))["']?\s*[:=]/i,
  /^\s*["']?(?:private[_\-\s]?user[_\-\s]?content|privateUserContent|raw[_\-\s]?pr[_\-\s]?body|pull[_\-\s]?request[_\-\s]?body|bodyText)["']?\s*[:=]/i,
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
  /raw.*learner/i,
  /learner.*answer/i,
  /ocr.*(?:text|payload|output)/i,
  /problem.*(?:text|body)/i,
  /question.*body/i,
  /answer.*body/i,
  /provider.*payload/i,
  /billing.*(?:data|record|payload)/i,
  /auth.*(?:data|record|payload|secret|token)/i,
  /payment.*(?:data|record|payload)/i,
  /private.*user.*content/i,
  /raw.*pr.*body/i,
  /pull.*request.*body/i,
  /^bodyText$/i,
] as const;

const CLOSING_REFERENCE_PATTERN = /\b(?:Closes|Fixes)\s+#(\d+)\b/g;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeBoolean(value: boolean | string | null | undefined, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "no"].includes(normalized)) return false;
    if (["true", "1", "yes"].includes(normalized)) return true;
  }
  return fallback;
}

function normalizePositiveInteger(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim()) && Number(value.trim()) > 0) {
    return Number(value.trim());
  }
  return null;
}

function cleanText(value: unknown, fallback = ""): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    return fallback;
  }
  const text = String(value).replace(/[\u0000-\u001f]/g, "").trim();
  if (!text) return fallback;
  if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(text))) return fallback;
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function nullableText(value: unknown): string | null {
  const text = cleanText(value);
  return text || null;
}

function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "").trim();
}

function normalizeStringList(
  values: readonly string[] | undefined,
  fallback: readonly string[],
): string[] {
  const source = values && values.length > 0 ? values : fallback;
  return [...new Set(source.map(normalizePath).filter(Boolean))];
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function sanitizeBranchName(value: string): string {
  const segments = value
    .split("/")
    .map(slugify)
    .filter(Boolean);
  const normalized = segments.join("/");
  if (!normalized) return "";
  return normalized.startsWith("codex/") ? normalized : `codex/${normalized}`;
}

function isAllowedPath(filePath: string, allowedPrefixes: readonly string[]): boolean {
  return allowedPrefixes.some((prefix) => {
    const normalizedPrefix = normalizePath(prefix);
    if (normalizedPrefix.endsWith("/")) return filePath.startsWith(normalizedPrefix);
    return filePath === normalizedPrefix || filePath.startsWith(normalizedPrefix);
  });
}

function isForbiddenPath(filePath: string, forbiddenPrefixes: readonly string[]): boolean {
  return forbiddenPrefixes.some((prefix) => {
    const normalizedPrefix = normalizePath(prefix);
    if (normalizedPrefix.endsWith("/")) return filePath.startsWith(normalizedPrefix);
    return filePath === normalizedPrefix || filePath.startsWith(normalizedPrefix);
  });
}

function changedFileViolations(
  files: readonly string[],
  allowedPrefixes: readonly string[],
  forbiddenPrefixes: readonly string[],
): Af018ChangedFileViolation[] {
  const violations: Af018ChangedFileViolation[] = [];

  for (const file of files) {
    if (isForbiddenPath(file, forbiddenPrefixes)) {
      violations.push({
        path: file,
        code: "forbidden_path",
        message: "Changed file matches an AF018 forbidden path prefix.",
      });
      continue;
    }

    if (!isAllowedPath(file, allowedPrefixes)) {
      violations.push({
        path: file,
        code: "outside_allowlist",
        message: "Changed file is outside the AF018 path allowlist.",
      });
    }
  }

  return violations;
}

function selectPackage(
  input: unknown,
  targetRoadmapItem: string | null,
): { record: Record<string, unknown> | null; reason: string | null } {
  const root = asRecord(input);
  if (!root) return { record: null, reason: "Task package artifact must be a JSON object." };

  const packages = asArray(root.packages).map(asRecord).filter(Boolean);
  if (packages.length > 0) {
    if (!targetRoadmapItem) {
      return { record: null, reason: "target_roadmap_item is required when package collection is provided." };
    }
    const found = packages.find((entry) => entry?.itemId === targetRoadmapItem);
    if (!found) {
      return {
        record: null,
        reason: `Task package artifact does not contain target roadmap item ${targetRoadmapItem}.`,
      };
    }
    return { record: found, reason: null };
  }

  return { record: root, reason: null };
}

function validationCommands(record: Record<string, unknown> | null): string[] {
  const commands = asArray(record?.validationCommands)
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
  return commands.length > 0 ? commands : [...DEFAULT_VALIDATION_COMMANDS];
}

function riskFromPackage(record: Record<string, unknown> | null): "low" | "medium" | "high" {
  const text = [
    cleanText(record?.risk),
    ...asArray(record?.riskNotes).map((entry) => cleanText(entry)),
  ].join("\n");
  const match = text.match(/\b(low|medium|high)\b/i);
  return match ? (match[1].toLowerCase() as "low" | "medium" | "high") : "high";
}

function packageSummary(record: Record<string, unknown> | null): Af018PackageSummary | null {
  if (!record) return null;
  const commands = validationCommands(record);
  return {
    itemId: nullableText(record.itemId ?? record.id),
    itemTitle: nullableText(record.itemTitle ?? record.title),
    repository: nullableText(record.repository ?? record.repo),
    branchName: nullableText(record.branchName ?? record.branch),
    validationCommandCount: commands.length,
    risk: riskFromPackage(record),
  };
}

function defaultBranchName(input: {
  branchName?: string | null;
  targetIssue: number | null;
  targetRoadmapItem: string | null;
  packageSummary: Af018PackageSummary | null;
}): string | null {
  const explicit = nullableText(input.branchName);
  if (explicit) return sanitizeBranchName(explicit);
  if (!input.targetIssue || !input.targetRoadmapItem) return null;
  const titleSlug = slugify(input.packageSummary?.itemTitle ?? "draft-pr");
  return `codex/af018-${slugify(input.targetRoadmapItem)}-issue-${input.targetIssue}-${titleSlug}`.slice(0, 120);
}

function defaultTitle(
  targetRoadmapItem: string | null,
  packageSummary: Af018PackageSummary | null,
): string | null {
  if (!targetRoadmapItem) return null;
  const title = packageSummary?.itemTitle ?? "Approved Codex Draft PR";
  return `[${targetRoadmapItem}] ${title}`;
}

function buildPrBody(input: {
  issueNumber: number;
  roadmapItemId: string;
  packageSummary: Af018PackageSummary | null;
  validationCommands: readonly string[];
  validationSummaryPath: string;
  risk: "low" | "medium" | "high";
}): string {
  return [
    "## Goal",
    "",
    `Closes #${input.issueNumber}`,
    "",
    `Implement the approved Codex draft PR package for roadmap item ${input.roadmapItemId}: ${input.packageSummary?.itemTitle ?? "selected Agent Factory package"}.`,
    "",
    "## Non-goals",
    "",
    "- Do not merge automatically.",
    "- Do not mark the PR ready for review automatically.",
    "- Do not modify billing, auth, payment, provider, OCR, instructor, academy, production data, workflow, or secret-bearing paths.",
    "- Do not add raw learner, OCR, problem, answer, provider, billing, auth, private, or secret content to artifacts, prompts, comments, or the PR body.",
    "",
    "## Risk classification",
    "",
    `- Risk: [${input.risk}]`,
    `- Roadmap item: ${input.roadmapItemId}`,
    `- Target issue: ${input.issueNumber}`,
    "",
    "## Data boundary",
    "",
    "- AF018 artifacts are metadata-only and omit Codex transcripts, raw prompts, raw PR bodies from upstream sources, diffs, and logs.",
    "- The generated PR body carries only target metadata, validation status, rollback steps, and guardrail summaries.",
    "- Any raw learner, OCR, problem, answer, provider, billing, auth, private user, or secret-like payload fails closed before artifact upload.",
    "",
    "## Schema / API / environment changes",
    "",
    "- Determined by the generated draft PR diff.",
    "- AF018 itself does not authorize database, runtime, provider, billing, auth, payment, OCR, instructor, academy, or production-data mutation.",
    "",
    "## Tests and evidence",
    "",
    ...input.validationCommands.map((command) => `- ${command}`),
    "",
    "## Runtime evidence",
    "",
    "- Required: AF018 workflow validation summary before draft PR creation.",
    "- Result: See the uploaded AF018 validation summary artifact for command status and path-gate status.",
    `- Artifact: ${input.validationSummaryPath}`,
    "",
    "## Rollout and rollback",
    "",
    "- Rollout: human review of the draft PR, CI, runtime evidence, and repository PR Contract before marking ready.",
    "- Rollback: close the draft PR, delete the generated branch, or revert the merge if it was later merged by a human.",
    "- Cleanup: remove AF018 generated artifacts from the workflow run retention window if they are no longer needed.",
    "",
    "## Remaining risks",
    "",
    "- Codex/API usage consumes paid model tokens; operators should review cost and generated diff size before repeating failed runs.",
    "- Human review remains required for source correctness, product-scope compliance, and runtime evidence sufficiency.",
    "- Path allowlists cannot prove semantic correctness; reviewers must still inspect the diff.",
    "",
    "## Merge recommendation",
    "",
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");
}

function closingReferences(body: string): number[] {
  return [...body.matchAll(CLOSING_REFERENCE_PATTERN)].map((match) => Number(match[1]));
}

function headingsPresent(body: string): boolean {
  return prContractHeadings().every((heading) => {
    const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
    return pattern.test(body);
  });
}

function blockedReasonCodes(reasons: readonly string[]): string[] {
  const codes = reasons.map((reason) => {
    if (/actor/i.test(reason)) return "actor_not_allowed";
    if (/approval phrase/i.test(reason)) return "missing_approval_phrase";
    if (/target issue/i.test(reason)) return "invalid_target_issue";
    if (/roadmap/i.test(reason) && /required|does not contain|does not match/i.test(reason)) {
      return "roadmap_target_mismatch";
    }
    if (/safe.*data-boundary|raw|secret|metadata-only/i.test(reason)) return "data_boundary_violation";
    if (/changed file count/i.test(reason)) return "changed_file_count_exceeded";
    if (/forbidden path/i.test(reason)) return "forbidden_path";
    if (/outside.*allowlist/i.test(reason)) return "outside_path_allowlist";
    if (/no changed files/i.test(reason)) return "no_changed_files";
    if (/closing reference/i.test(reason)) return "invalid_closing_reference";
    if (/required PR Contract headings/i.test(reason)) return "invalid_pr_contract";
    return "blocked";
  });
  return [...new Set(codes)].sort();
}

export function createAf018DraftPrPlan(
  options: CreateAf018DraftPrPlanOptions = {},
): { plan: Af018DraftPrPlan; generatedContract: string } {
  const dryRun = normalizeBoolean(options.dryRun, true);
  const approvedForWrite = options.approvalPhrase === AF018_APPROVAL_PHRASE;
  const allowedActors = normalizeStringList(options.allowedActors, DEFAULT_ALLOWED_ACTORS);
  const actor = nullableText(options.actor);
  const actorAllowed = actor !== null && allowedActors.includes(actor);
  const targetIssue = normalizePositiveInteger(options.targetIssue);
  const targetRoadmapItem = nullableText(options.targetRoadmapItem);
  const selected = selectPackage(options.packageInput ?? {}, targetRoadmapItem);
  const packageValidation = selected.record
    ? validateCodexTaskPackageText(selected.record)
    : { safe: false, violations: [], stringFieldCount: 0, textSha256: null };
  const summary = packageSummary(selected.record);
  const packageItemId = summary?.itemId ?? null;
  const validationCommandsList = [
    ...new Set([...(options.validationCommands ?? validationCommands(selected.record))]),
  ];
  const issueNumber = targetIssue ?? null;
  const roadmapItemId = targetRoadmapItem;
  const validationSummaryPath = nullableText(options.validationSummaryPath) ??
    ".agent-factory/af018-validation-summary.md";
  const generatedContract = issueNumber && roadmapItemId
    ? buildPrBody({
        issueNumber,
        roadmapItemId,
        packageSummary: summary,
        validationCommands: validationCommandsList,
        validationSummaryPath,
        risk: summary?.risk ?? "high",
      })
    : [
        "## Goal",
        "",
        "AF018 draft PR body could not be generated because target metadata is incomplete.",
      ].join("\n");
  const references = closingReferences(generatedContract);
  const requiredHeadingsPresent = headingsPresent(generatedContract);
  const changedFiles = [
    ...new Set((options.changedFiles ?? []).map(normalizePath).filter(Boolean)),
  ].sort();
  const maxChangedFiles = normalizePositiveInteger(options.maxChangedFiles) ?? 12;
  const allowedPathPrefixes = normalizeStringList(
    options.allowedPathPrefixes,
    DEFAULT_ALLOWED_PATH_PREFIXES,
  );
  const forbiddenPathPrefixes = normalizeStringList(
    options.forbiddenPathPrefixes,
    DEFAULT_FORBIDDEN_PATH_PREFIXES,
  );
  const pathViolations = changedFileViolations(
    changedFiles,
    allowedPathPrefixes,
    forbiddenPathPrefixes,
  );
  const validationSummaryText = options.validationSummaryText
    ? normalizeNewlines(options.validationSummaryText)
    : null;
  const blockedReasons: string[] = [];

  if (!actorAllowed) {
    blockedReasons.push("Actor is not in the AF018 allowlist.");
  }
  if (!targetIssue) {
    blockedReasons.push("A positive target issue number is required.");
  }
  if (!targetRoadmapItem) {
    blockedReasons.push("target_roadmap_item is required and must stay separate from target_issue.");
  }
  if (selected.reason) {
    blockedReasons.push(selected.reason);
  }
  if (packageItemId && targetRoadmapItem && packageItemId !== targetRoadmapItem) {
    blockedReasons.push(`Task package item ${packageItemId} does not match target roadmap item ${targetRoadmapItem}.`);
  }
  if (!packageValidation.safe) {
    blockedReasons.push("Task package failed the AF018 metadata-only data-boundary scan.");
  }
  if (!dryRun && !approvedForWrite) {
    blockedReasons.push(`dry_run=false requires exact approval phrase: ${AF018_APPROVAL_PHRASE}`);
  }
  if (!dryRun && changedFiles.length === 0) {
    blockedReasons.push("AF018 non-dry-run validation requires at least one changed file after Codex.");
  }
  if (changedFiles.length > maxChangedFiles) {
    blockedReasons.push("Changed file count exceeds the AF018 max changed file count.");
  }
  if (pathViolations.some((violation) => violation.code === "forbidden_path")) {
    blockedReasons.push("Changed files include an AF018 forbidden path.");
  }
  if (pathViolations.some((violation) => violation.code === "outside_allowlist")) {
    blockedReasons.push("Changed files include paths outside the AF018 allowlist.");
  }
  if (references.length !== 1 || (targetIssue && references[0] !== targetIssue)) {
    blockedReasons.push("Generated PR body must contain exactly one closing reference for target_issue.");
  }
  if (!requiredHeadingsPresent) {
    blockedReasons.push("Generated PR body must include every required PR Contract heading exactly once.");
  }
  if (validationSummaryText) {
    assertAf018TextArtifactSafe(validationSummaryText, "AF018 validation summary");
  }

  const canExecute = !dryRun && approvedForWrite && blockedReasons.length === 0;
  const branchName = defaultBranchName({
    branchName: options.branchName,
    targetIssue: issueNumber,
    targetRoadmapItem: roadmapItemId,
    packageSummary: summary,
  });
  const prTitle = nullableText(options.prTitle) ?? defaultTitle(roadmapItemId, summary);
  const commitTitle = nullableText(options.commitTitle) ?? prTitle;
  const plan: Af018DraftPrPlan = {
    version: AGENT_FACTORY_APPROVED_DRAFT_PR_VERSION,
    adapter: "af018-approved-draft-pr-creator",
    status: blockedReasons.length > 0 ? "rejected" : "planned",
    dryRun,
    approvedForWrite,
    canExecute,
    createdAt: (options.now ?? new Date()).toISOString(),
    source: {
      actor,
      actorAllowed,
      repository: nullableText(options.repository),
      workflowName: nullableText(options.workflowName),
      workflowRunId: nullableText(options.workflowRunId),
    },
    target: {
      issueNumber,
      roadmapItemId,
      taskPackageItemId: packageItemId,
      baseBranch: cleanText(options.baseBranch, "main") || "main",
      branchName,
      commitTitle,
      prTitle,
    },
    taskPackage: summary,
    changedFiles: {
      count: changedFiles.length,
      maxAllowed: maxChangedFiles,
      files: changedFiles,
      violations: pathViolations,
    },
    pathBoundary: {
      allowedPathPrefixes,
      forbiddenPathPrefixes,
      failClosed: true,
    },
    pullRequest: {
      draftOnly: true,
      autoMerge: false,
      maintainerCanModify: false,
      generatedContractPath: nullableText(options.generatedContractPath) ??
        ".agent-factory/af018-pr-body.md",
      generatedContractSha256: sha256(generatedContract),
      generatedContractLineCount: normalizeNewlines(generatedContract).split("\n").length,
      closingReferenceCount: references.length,
      closingReferenceIssue: references[0] ?? null,
      requiredHeadingsPresent,
    },
    actions: {
      willGenerateTaskPackage: true,
      willRunCodex: canExecute,
      willEditWorkingTree: canExecute,
      willCreateBranch: canExecute,
      willCreateCommit: canExecute,
      willPush: canExecute,
      willOpenDraftPr: canExecute,
      willMarkReadyForReview: false,
      willRerunWorkflow: false,
      willMergeOrRebase: false,
      willAutoMerge: false,
    },
    permissions: {
      contents: canExecute ? "write" : "read",
      pullRequests: canExecute ? "write" : "read",
      issues: "read",
      actions: "read",
      checks: "read",
      workflows: "none",
      merge: "none",
    },
    validation: {
      commands: validationCommandsList,
      summaryPath: validationSummaryPath,
      summarySha256: validationSummaryText ? sha256(validationSummaryText) : null,
    },
    codex: {
      action: "openai/codex-action@v1",
      sandbox: "workspace-write",
      safetyStrategy: "drop-sudo",
      model: AF018_MODEL,
      effort: AF018_EFFORT,
      costNote: "AF018 uses OpenAI Codex/API tokens only after dry_run=false and the exact approval phrase; repeated failed runs can incur additional cost.",
    },
    dataBoundary: {
      metadataOnlyArtifacts: true,
      omittedCodexTranscript: true,
      promptInputSanitized: packageValidation.safe,
      violationCount: packageValidation.violations.length,
    },
    rollback: [
      "Close the generated draft PR if the output is not acceptable.",
      "Delete the generated branch from origin after closing the draft PR.",
      "Revert a later human merge if the change lands and must be rolled back.",
      "No workflow path performs auto-merge, rebase, or workflow rerun.",
    ],
    blockedReasons,
    blockedReasonCodes: blockedReasonCodes(blockedReasons),
    artifacts: [...ARTIFACTS],
  };

  assertAf018ArtifactSafe(plan);
  assertAf018TextArtifactSafe(generatedContract, "AF018 generated PR body");
  return { plan, generatedContract };
}

function formatList(values: readonly string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- None."];
}

export function buildAf018DraftPrPlanMarkdown(plan: Af018DraftPrPlan): string {
  assertAf018ArtifactSafe(plan);
  const markdown = [
    "# AF018 Approved Draft PR Creator",
    "",
    `Status: ${plan.status}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Approved for write: ${plan.approvedForWrite ? "yes" : "no"}`,
    `Can execute: ${plan.canExecute ? "yes" : "no"}`,
    `Actor allowed: ${plan.source.actorAllowed ? "yes" : "no"}`,
    "",
    "## Target",
    "",
    `- Target issue: ${plan.target.issueNumber ? `#${plan.target.issueNumber}` : "none"}`,
    `- Roadmap item: ${plan.target.roadmapItemId ?? "none"}`,
    `- Task package item: ${plan.target.taskPackageItemId ?? "none"}`,
    `- Base branch: ${plan.target.baseBranch}`,
    `- Generated branch: ${plan.target.branchName ?? "none"}`,
    `- Draft PR title: ${plan.target.prTitle ?? "none"}`,
    "",
    "## Path Gate",
    "",
    `- Changed files: ${plan.changedFiles.count}/${plan.changedFiles.maxAllowed}`,
    "- Changed file list:",
    ...formatList(plan.changedFiles.files),
    "- Violations:",
    ...formatList(plan.changedFiles.violations.map((violation) => `${violation.path}: ${violation.code}`)),
    "",
    "## PR Contract",
    "",
    `- Draft only: ${plan.pullRequest.draftOnly ? "yes" : "no"}`,
    `- Auto-merge: ${plan.pullRequest.autoMerge ? "yes" : "no"}`,
    `- Closing references: ${plan.pullRequest.closingReferenceCount}`,
    `- Closing issue: ${plan.pullRequest.closingReferenceIssue ? `#${plan.pullRequest.closingReferenceIssue}` : "none"}`,
    `- Required headings present: ${plan.pullRequest.requiredHeadingsPresent ? "yes" : "no"}`,
    "",
    "## Actions",
    "",
    ...Object.entries(plan.actions).map(([key, value]) => `- ${key}: ${value ? "yes" : "no"}`),
    "",
    "## Validation",
    "",
    ...formatList(plan.validation.commands),
    "",
    "## Blocked Reasons",
    "",
    ...formatList(plan.blockedReasons),
    "",
    "## Rollback",
    "",
    ...formatList(plan.rollback),
    "",
    "## Artifacts",
    "",
    ...formatList(plan.artifacts),
  ].join("\n");

  assertAf018TextArtifactSafe(markdown, "AF018 Markdown plan");
  return markdown;
}

export function buildAf018ValidationSummary(input: {
  plan: Af018DraftPrPlan;
  commandResults?: readonly { command: string; status: "pass" | "fail" | "skipped" }[];
}): string {
  const commandResults = input.commandResults ?? input.plan.validation.commands.map((command) => ({
    command,
    status: "skipped" as const,
  }));
  const markdown = [
    "# AF018 Validation Summary",
    "",
    `Status: ${input.plan.status}`,
    `Dry-run: ${input.plan.dryRun ? "true" : "false"}`,
    `Target issue: ${input.plan.target.issueNumber ? `#${input.plan.target.issueNumber}` : "none"}`,
    `Roadmap item: ${input.plan.target.roadmapItemId ?? "none"}`,
    `Changed files: ${input.plan.changedFiles.count}/${input.plan.changedFiles.maxAllowed}`,
    `Path violations: ${input.plan.changedFiles.violations.length}`,
    `Draft PR only: ${input.plan.pullRequest.draftOnly ? "yes" : "no"}`,
    `Auto-merge: ${input.plan.pullRequest.autoMerge ? "yes" : "no"}`,
    `Model: ${input.plan.codex.model}`,
    `Effort: ${input.plan.codex.effort}`,
    "",
    "## Command Results",
    "",
    ...commandResults.map((result) => `- ${result.status}: ${result.command}`),
    "",
    "## Data Boundary",
    "",
    "- This summary intentionally omits command logs, Codex transcript text, diffs, comments, prompts, and raw payloads.",
    "- It records only target metadata, path-gate counts, command names, and pass/fail/skipped status.",
  ].join("\n");

  assertAf018TextArtifactSafe(markdown, "AF018 validation summary");
  return markdown;
}

export function assertAf018TextArtifactSafe(text: string, label: string): void {
  const normalized = normalizeNewlines(text);
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new Error(`${label} contains a secret-like value.`);
    }
  }
  const unsafeLine = normalized
    .split("\n")
    .find((line) => SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)));
  if (unsafeLine) {
    throw new Error(`${label} contains a raw-content or credential-like labeled field.`);
  }
}

export function assertAf018ArtifactSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, currentPath: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF018 artifact contains a secret-like value at ${currentPath}.`);
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
      const forbidden = FORBIDDEN_ARTIFACT_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`AF018 artifact contains forbidden key at ${currentPath}.${key}.`);
      }
      visit(entry, `${currentPath}.${key}`);
    }
  }

  visit(value, "$");
}
