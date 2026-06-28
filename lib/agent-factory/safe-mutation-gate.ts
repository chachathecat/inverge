import { createHash } from "node:crypto";
import { createCiWatcherReport } from "./ci-watcher";
import { prContractHeadings } from "./pr-contract-doctor";

export const AF009_APPROVAL_PHRASE = "I approve AF009 safe metadata mutation";
export const AF009_SAFE_COMMENT_MARKER = "<!-- agent-factory:af009-safe-comment -->";

export const AF009_MUTATION_INTENTS = [
  "update_pr_runtime_evidence",
  "add_safe_pr_comment",
  "mark_ready_for_review",
] as const;

export type SafeMutationIntent = (typeof AF009_MUTATION_INTENTS)[number];

export type SafeMutationAction =
  | "none"
  | "update_pr_body_runtime_evidence"
  | "create_issue_comment"
  | "update_issue_comment"
  | "mark_ready_for_review";

export type SafeMutationStatus =
  | "planned"
  | "rejected"
  | "dry_run_noop"
  | "applied"
  | "already_ready";

export interface SafeMutationPullRequest {
  number: number;
  title?: string | null;
  state?: string | null;
  draft?: boolean | null;
  merged?: boolean | null;
  bodyText: string;
  mergeability?: string | null;
  mergeable?: boolean | null;
  mergeStateStatus?: string | null;
  labels?: readonly unknown[];
  changedFiles?: readonly unknown[];
  files?: readonly unknown[];
  statusCheckRollup?: readonly unknown[];
}

export interface SafeMutationComment {
  id: number;
  body: string;
  htmlUrl?: string | null;
  userLogin?: string | null;
}

export interface SafeMutationContext {
  repo?: string;
  pullRequest?: SafeMutationPullRequest;
  normalizedSnapshot?: unknown;
  comments?: readonly SafeMutationComment[];
}

export interface SafeMutationPlanInput {
  mutationIntent: string;
  prNumber: number | string | null | undefined;
  dryRun?: boolean | string;
  approvalPhrase?: string | null;
  evidenceText?: string | null;
  commentText?: string | null;
  context?: SafeMutationContext;
  now?: Date;
}

export interface RuntimeEvidenceReplacement {
  updatedBody: string;
  beforeHash: string;
  afterHash: string;
  oldRuntimeEvidenceLineCount: number;
  newRuntimeEvidenceLineCount: number;
  sectionsPreserved: true;
}

export interface PrContractValidation {
  valid: boolean;
  sectionOrder: string[];
  missingSections: string[];
  duplicateSections: string[];
  unknownSections: string[];
  runtimeEvidencePresent: boolean;
  runtimeEvidenceMeaningful: boolean;
  runtimeEvidenceLineCount: number;
  mergeRecommendation: "Auto-merge candidate" | "Human approval required" | "Blocked" | null;
  errors: string[];
}

export interface SafeMutationPlan {
  version: 1;
  intent: string;
  prNumber: number | null;
  dryRun: boolean;
  approvedForMutation: boolean;
  status: SafeMutationStatus;
  action: SafeMutationAction;
  canExecute: boolean;
  metadataOnly: true;
  mutatesCode: false;
  mutatesRuntimeState: false;
  mutatesBranchState: false;
  blockedReasons: string[];
  artifactSafe: true;
  summary: string;
  runtimeEvidenceUpdate?: {
    beforeHash: string;
    afterHash: string;
    oldRuntimeEvidenceLineCount: number;
    newRuntimeEvidenceLineCount: number;
    sectionsPreserved: true;
  };
  commentUpdate?: {
    marker: string;
    existingMarkerCommentCount: number;
    operation: "create" | "update" | "blocked_duplicate_marker";
    commentId: number | null;
  };
  readyForReview?: {
    currentDraft: boolean | null;
    alreadyReady: boolean;
    prContractValid: boolean;
    runtimeEvidencePresent: boolean;
    runtimeEvidenceMeaningful: boolean;
    mergeRecommendation: string | null;
    checksAcceptable: boolean;
  };
  guardrails: string[];
}

export interface PreparedSafeMutation {
  plan: SafeMutationPlan;
  preparedBody?: string;
  preparedCommentBody?: string;
  commentId?: number;
}

export interface SafeMutationAdapterResult {
  id?: number;
  htmlUrl?: string | null;
  message?: string;
}

export interface SafeMutationAdapter {
  updatePullRequestBody?: (prNumber: number, body: string) => Promise<SafeMutationAdapterResult>;
  createIssueComment?: (prNumber: number, body: string) => Promise<SafeMutationAdapterResult>;
  updateIssueComment?: (commentId: number, body: string) => Promise<SafeMutationAdapterResult>;
  markPullRequestReadyForReview?: (prNumber: number) => Promise<SafeMutationAdapterResult>;
}

export interface SafeMutationExecutionResult {
  version: 1;
  intent: string;
  prNumber: number | null;
  dryRun: boolean;
  status: SafeMutationStatus;
  action: SafeMutationAction;
  mutationAttempted: boolean;
  metadataOnly: true;
  mutatesCode: false;
  mutatesRuntimeState: false;
  mutatesBranchState: false;
  message: string;
  targetUrl?: string | null;
  targetId?: number | null;
}

const REQUIRED_PR_CONTRACT_HEADINGS = prContractHeadings();

const GUARDRAILS = [
  "Metadata-only mutation scope.",
  "No code edits, branches, commits, pushes, rebases, merges, workflow reruns, or Codex invocation.",
  "No learner runtime, OCR, provider, billing, auth, production, instructor, or payment mutation APIs.",
  "Actual mutation requires dry_run=false and the exact AF009 approval phrase.",
  "Artifacts omit raw PR body and raw comment payloads.",
] as const;

const FORBIDDEN_KEY_PATTERNS = [
  /secret/i,
  /token/i,
  /password/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /service[_-]?role/i,
  /cookie/i,
  /session/i,
  /raw.*answer/i,
  /learner.*answer/i,
  /ocr.*text/i,
  /problem.*text/i,
  /question.*(?:body|text)/i,
  /answer.*body/i,
  /official.*answer/i,
  /source.*excerpt/i,
  /provider.*payload/i,
  /billing.*data/i,
  /private.*user.*content/i,
  /credential/i,
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
  /^\s*["']?(?:raw[_-]?answer|learner[_-]?answer|ocr[_-]?text|problem[_-]?text|question[_-]?(?:body|text)|answer[_-]?body|official[_-]?answer)["']?\s*[:=]/i,
  /^\s*["']?(?:source[_-]?excerpt|provider[_-]?payload|billing[_-]?data|private[_-]?user[_-]?content)["']?\s*[:=]/i,
  /^\s*(?:raw learner content|learner answer text|ocr text|problem text|question body|official answer body|source excerpt|provider payload|billing data|private user content)\s*:/i,
] as const;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function hashText(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeBoolean(value: boolean | string | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return true;
}

function normalizePrNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function isSafeMutationIntent(value: string): value is SafeMutationIntent {
  return AF009_MUTATION_INTENTS.includes(value as SafeMutationIntent);
}

function cleanPayloadText(value: string, label: string): string {
  const normalized = normalizeNewlines(value)
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .trim();

  if (!normalized) {
    throw new Error(`${label} is required and must not be empty.`);
  }

  if (/^##\s+.+$/m.test(normalized)) {
    throw new Error(`${label} must not contain level-two PR Contract headings.`);
  }

  assertMetadataTextSafe(normalized, label);
  return normalized;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function statusFromBlocked(blockedReasons: readonly string[]): SafeMutationStatus {
  return blockedReasons.length > 0 ? "rejected" : "planned";
}

function planSummary(input: {
  status: SafeMutationStatus;
  intent: string;
  action: SafeMutationAction;
  blockedReasons: readonly string[];
  dryRun: boolean;
}): string {
  if (input.status === "already_ready") {
    return "PR is already ready for review; AF009 planned no mutation.";
  }

  if (input.status === "rejected") {
    return `AF009 rejected ${input.intent}: ${input.blockedReasons.join(" ")}`;
  }

  if (input.dryRun) {
    return `AF009 dry-run planned ${input.action}; no mutation will be attempted.`;
  }

  return `AF009 planned approved action ${input.action}.`;
}

function basePlan(input: {
  intent: string;
  prNumber: number | null;
  dryRun: boolean;
  approvedForMutation: boolean;
  status: SafeMutationStatus;
  action: SafeMutationAction;
  canExecute: boolean;
  blockedReasons: string[];
}): SafeMutationPlan {
  return {
    version: 1,
    intent: input.intent,
    prNumber: input.prNumber,
    dryRun: input.dryRun,
    approvedForMutation: input.approvedForMutation,
    status: input.status,
    action: input.action,
    canExecute: input.canExecute,
    metadataOnly: true,
    mutatesCode: false,
    mutatesRuntimeState: false,
    mutatesBranchState: false,
    blockedReasons: input.blockedReasons,
    artifactSafe: true,
    summary: planSummary(input),
    guardrails: [...GUARDRAILS],
  };
}

function approvalBlockedReason(dryRun: boolean, approvalPhrase: string | null | undefined): string | null {
  if (dryRun) return null;
  if (approvalPhrase === AF009_APPROVAL_PHRASE) return null;
  return `Actual AF009 mutation requires exact approval phrase: ${AF009_APPROVAL_PHRASE}`;
}

function contextPrBody(context: SafeMutationContext | undefined): string | null {
  if (typeof context?.pullRequest?.bodyText === "string") return context.pullRequest.bodyText;
  const snapshot = asRecord(context?.normalizedSnapshot);
  const pullRequest = asRecord(snapshot?.pullRequest);
  return typeof pullRequest?.bodyText === "string" ? pullRequest.bodyText : null;
}

function contextDraft(context: SafeMutationContext | undefined): boolean | null {
  if (typeof context?.pullRequest?.draft === "boolean") return context.pullRequest.draft;
  const snapshot = asRecord(context?.normalizedSnapshot);
  if (typeof snapshot?.isDraft === "boolean") return snapshot.isDraft;
  const pullRequest = asRecord(snapshot?.pullRequest);
  if (typeof pullRequest?.isDraft === "boolean") return pullRequest.isDraft;
  if (typeof pullRequest?.draft === "boolean") return pullRequest.draft;
  return null;
}

function runtimeEvidenceLines(body: string): string[] {
  const parsed = parsePrBodySections(body);
  const runtime = parsed.sections.get("## Runtime evidence");
  if (!runtime) return [];
  return runtime.contentLines.filter((line) => line.trim() !== "");
}

function hasMeaningfulRuntimeEvidence(body: string): boolean {
  const lines = runtimeEvidenceLines(body);
  if (lines.length === 0) return false;

  return lines.some((line) => {
    const normalized = line
      .replace(/^-\s*/, "")
      .replace(/^(Required|Result|Artifact)\s*:\s*/i, "")
      .trim();

    return normalized.length > 0 && !/^(pending|not recorded|none\.?)$/i.test(normalized);
  });
}

function checkedMergeRecommendation(body: string): PrContractValidation["mergeRecommendation"] {
  const checked: string[] = [];
  for (const line of normalizeNewlines(body).split("\n")) {
    const match = line.match(/^\s*-\s*\[([ xX])\]\s*(Auto-merge candidate|Human approval required|Blocked)\s*$/);
    if (match && match[1].toLowerCase() === "x") checked.push(match[2]);
  }

  if (checked.length !== 1) return null;
  return checked[0] as PrContractValidation["mergeRecommendation"];
}

function parsePrBodySections(body: string): {
  lines: string[];
  headings: { heading: string; lineIndex: number }[];
  sections: Map<string, { heading: string; lineIndex: number; contentLines: string[] }>;
} {
  const lines = normalizeNewlines(body).split("\n");
  const headings: { heading: string; lineIndex: number }[] = [];

  lines.forEach((line, lineIndex) => {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) {
      headings.push({ heading: `## ${match[1].trim()}`, lineIndex });
    }
  });

  const sections = new Map<string, { heading: string; lineIndex: number; contentLines: string[] }>();
  headings.forEach((entry, index) => {
    const next = headings[index + 1]?.lineIndex ?? lines.length;
    sections.set(entry.heading, {
      heading: entry.heading,
      lineIndex: entry.lineIndex,
      contentLines: lines.slice(entry.lineIndex + 1, next),
    });
  });

  return { lines, headings, sections };
}

export function validatePrContractForAf009(body: string): PrContractValidation {
  const parsed = parsePrBodySections(body);
  const counts = new Map<string, number>();
  for (const heading of parsed.headings) {
    counts.set(heading.heading, (counts.get(heading.heading) ?? 0) + 1);
  }

  const missingSections = REQUIRED_PR_CONTRACT_HEADINGS.filter((heading) => !counts.has(heading));
  const duplicateSections = REQUIRED_PR_CONTRACT_HEADINGS.filter((heading) => (counts.get(heading) ?? 0) > 1);
  const unknownSections = parsed.headings
    .map((entry) => entry.heading)
    .filter((heading) => !REQUIRED_PR_CONTRACT_HEADINGS.includes(heading));
  const sectionOrder = parsed.headings.map((entry) => entry.heading);
  const orderValid =
    sectionOrder.length === REQUIRED_PR_CONTRACT_HEADINGS.length &&
    sectionOrder.every((heading, index) => heading === REQUIRED_PR_CONTRACT_HEADINGS[index]);
  const mergeRecommendation = checkedMergeRecommendation(body);
  const runtimeLines = runtimeEvidenceLines(body);
  const errors: string[] = [];

  if (missingSections.length > 0) {
    errors.push(`Missing required PR Contract section(s): ${missingSections.join(", ")}.`);
  }
  if (duplicateSections.length > 0) {
    errors.push(`Duplicate required PR Contract section(s): ${duplicateSections.join(", ")}.`);
  }
  if (unknownSections.length > 0) {
    errors.push(`Unknown level-two PR Contract section(s) are not allowed for AF009 mutation: ${unknownSections.join(", ")}.`);
  }
  if (!orderValid) {
    errors.push("PR Contract sections must appear exactly once in the required AF009 order.");
  }
  if (mergeRecommendation === null) {
    errors.push("Merge recommendation must contain exactly one checked required checkbox.");
  }

  return {
    valid: errors.length === 0,
    sectionOrder,
    missingSections,
    duplicateSections,
    unknownSections,
    runtimeEvidencePresent: runtimeLines.length > 0,
    runtimeEvidenceMeaningful: hasMeaningfulRuntimeEvidence(body),
    runtimeEvidenceLineCount: runtimeLines.length,
    mergeRecommendation,
    errors,
  };
}

export function replaceRuntimeEvidenceSection(
  body: string,
  replacementText: string,
): RuntimeEvidenceReplacement {
  const cleanedReplacement = cleanPayloadText(replacementText, "Runtime evidence replacement text");
  const beforeValidation = validatePrContractForAf009(body);

  if (beforeValidation.missingSections.includes("## Runtime evidence")) {
    throw new Error("PR body is missing ## Runtime evidence; AF009 cannot update it.");
  }
  if (beforeValidation.duplicateSections.includes("## Runtime evidence")) {
    throw new Error("PR body contains multiple ## Runtime evidence sections; AF009 fails closed.");
  }
  if (!beforeValidation.valid) {
    throw new Error(`PR body does not satisfy the AF009 PR Contract: ${beforeValidation.errors.join(" ")}`);
  }

  const parsed = parsePrBodySections(body);
  const runtimeHeadingIndex = parsed.headings.findIndex((entry) => entry.heading === "## Runtime evidence");
  if (runtimeHeadingIndex < 0) {
    throw new Error("PR body is missing ## Runtime evidence; AF009 cannot update it.");
  }

  const runtimeHeadingLine = parsed.headings[runtimeHeadingIndex].lineIndex;
  const nextHeadingLine = parsed.headings[runtimeHeadingIndex + 1]?.lineIndex ?? parsed.lines.length;
  const replacementLines = ["", ...cleanedReplacement.split("\n"), ""];
  const updatedLines = [
    ...parsed.lines.slice(0, runtimeHeadingLine + 1),
    ...replacementLines,
    ...parsed.lines.slice(nextHeadingLine),
  ];
  const updatedBody = updatedLines.join("\n");
  const afterValidation = validatePrContractForAf009(updatedBody);

  if (!afterValidation.valid) {
    throw new Error(`Runtime evidence replacement would break the PR Contract: ${afterValidation.errors.join(" ")}`);
  }

  const beforePrefix = parsed.lines.slice(0, runtimeHeadingLine + 1).join("\n");
  const beforeSuffix = parsed.lines.slice(nextHeadingLine).join("\n");
  const afterParsed = parsePrBodySections(updatedBody);
  const afterRuntimeHeadingLine = afterParsed.headings[runtimeHeadingIndex].lineIndex;
  const afterNextHeadingLine = afterParsed.headings[runtimeHeadingIndex + 1]?.lineIndex ?? afterParsed.lines.length;
  const afterPrefix = afterParsed.lines.slice(0, afterRuntimeHeadingLine + 1).join("\n");
  const afterSuffix = afterParsed.lines.slice(afterNextHeadingLine).join("\n");

  if (beforePrefix !== afterPrefix || beforeSuffix !== afterSuffix) {
    throw new Error("Runtime evidence replacement changed content outside ## Runtime evidence.");
  }

  return {
    updatedBody,
    beforeHash: hashText(normalizeNewlines(body)),
    afterHash: hashText(updatedBody),
    oldRuntimeEvidenceLineCount: beforeValidation.runtimeEvidenceLineCount,
    newRuntimeEvidenceLineCount: afterValidation.runtimeEvidenceLineCount,
    sectionsPreserved: true,
  };
}

export function buildSafePrCommentBody(commentText: string): string {
  const cleaned = cleanPayloadText(commentText, "Safe PR comment text");
  if (cleaned.includes(AF009_SAFE_COMMENT_MARKER)) {
    throw new Error("Safe PR comment text must not contain the AF009 marker.");
  }

  const body = [
    AF009_SAFE_COMMENT_MARKER,
    "",
    "# Agent Factory Metadata Summary",
    "",
    cleaned,
    "",
    "_AF009 metadata-only comment. No learner content, raw PR body, provider payload, billing data, credentials, code mutation, branch mutation, merge, rebase, workflow rerun, or Codex invocation._",
  ].join("\n");

  assertMetadataTextSafe(body, "Safe PR comment body");
  return body;
}

function planUpdateRuntimeEvidence(input: SafeMutationPlanInput, prNumber: number, blockedReasons: string[]): PreparedSafeMutation {
  const body = contextPrBody(input.context);
  if (body === null) {
    blockedReasons.push("PR body metadata is required before updating Runtime evidence.");
  }

  const evidenceText = input.evidenceText ?? "";
  let replacement: RuntimeEvidenceReplacement | null = null;
  if (body !== null) {
    try {
      replacement = replaceRuntimeEvidenceSection(body, evidenceText);
    } catch (error) {
      blockedReasons.push(error instanceof Error ? error.message : String(error));
    }
  }

  const status = statusFromBlocked(blockedReasons);
  const action: SafeMutationAction = "update_pr_body_runtime_evidence";
  const plan = basePlan({
    intent: input.mutationIntent,
    prNumber,
    dryRun: normalizeBoolean(input.dryRun),
    approvedForMutation: input.approvalPhrase === AF009_APPROVAL_PHRASE,
    status,
    action,
    canExecute: status === "planned" && !normalizeBoolean(input.dryRun),
    blockedReasons,
  });

  if (replacement) {
    plan.runtimeEvidenceUpdate = {
      beforeHash: replacement.beforeHash,
      afterHash: replacement.afterHash,
      oldRuntimeEvidenceLineCount: replacement.oldRuntimeEvidenceLineCount,
      newRuntimeEvidenceLineCount: replacement.newRuntimeEvidenceLineCount,
      sectionsPreserved: true,
    };
  }

  plan.summary = planSummary({
    status: plan.status,
    intent: plan.intent,
    action: plan.action,
    blockedReasons: plan.blockedReasons,
    dryRun: plan.dryRun,
  });

  assertSafeMutationArtifactSafe(plan);
  return {
    plan,
    preparedBody: replacement?.updatedBody,
  };
}

function planSafeComment(input: SafeMutationPlanInput, prNumber: number, blockedReasons: string[]): PreparedSafeMutation {
  const commentText = input.commentText ?? input.evidenceText ?? "";
  const markerComments = [...(input.context?.comments ?? [])].filter((comment) =>
    comment.body.includes(AF009_SAFE_COMMENT_MARKER),
  );
  let commentBody: string | null = null;
  let operation: "create" | "update" | "blocked_duplicate_marker" = "create";
  let commentId: number | null = null;

  if (markerComments.length > 1) {
    operation = "blocked_duplicate_marker";
    blockedReasons.push("Multiple existing AF009 marker comments were found; delete or consolidate them manually before rerunning.");
  } else if (markerComments.length === 1) {
    operation = "update";
    commentId = markerComments[0].id;
  }

  try {
    commentBody = buildSafePrCommentBody(commentText);
  } catch (error) {
    blockedReasons.push(error instanceof Error ? error.message : String(error));
  }

  const status = statusFromBlocked(blockedReasons);
  const action: SafeMutationAction = operation === "update" ? "update_issue_comment" : "create_issue_comment";
  const plan = basePlan({
    intent: input.mutationIntent,
    prNumber,
    dryRun: normalizeBoolean(input.dryRun),
    approvedForMutation: input.approvalPhrase === AF009_APPROVAL_PHRASE,
    status,
    action,
    canExecute: status === "planned" && !normalizeBoolean(input.dryRun),
    blockedReasons,
  });

  plan.commentUpdate = {
    marker: AF009_SAFE_COMMENT_MARKER,
    existingMarkerCommentCount: markerComments.length,
    operation,
    commentId,
  };
  plan.summary = planSummary({
    status: plan.status,
    intent: plan.intent,
    action: plan.action,
    blockedReasons: plan.blockedReasons,
    dryRun: plan.dryRun,
  });

  assertSafeMutationArtifactSafe(plan);
  return {
    plan,
    preparedCommentBody: commentBody ?? undefined,
    commentId: commentId ?? undefined,
  };
}

function snapshotForChecks(context: SafeMutationContext | undefined): unknown | null {
  if (context?.normalizedSnapshot) return context.normalizedSnapshot;
  const pr = context?.pullRequest;
  if (!pr) return null;

  return {
    repo: context?.repo ?? "unknown",
    prNumber: pr.number,
    title: pr.title,
    state: pr.draft ? "draft" : pr.state ?? "open",
    isDraft: pr.draft === true,
    mergeability: pr.mergeability,
    mergeable: pr.mergeable,
    mergeStateStatus: pr.mergeStateStatus,
    labels: pr.labels ?? [],
    changedFiles: pr.changedFiles ?? pr.files ?? [],
    files: pr.files ?? pr.changedFiles ?? [],
    statusCheckRollup: pr.statusCheckRollup ?? [],
  };
}

function checksAcceptableForReady(context: SafeMutationContext | undefined): {
  acceptable: boolean;
  reasons: string[];
} {
  const snapshot = snapshotForChecks(context);
  const record = asRecord(snapshot);
  const checks = Array.isArray(record?.statusCheckRollup) ? record.statusCheckRollup : [];

  if (!snapshot || checks.length === 0) {
    return {
      acceptable: false,
      reasons: ["Required check metadata is missing or ambiguous; AF009 cannot mark ready."],
    };
  }

  const report = createCiWatcherReport(snapshot, {
    repo: context?.repo,
  });
  const noAmbiguousChecks =
    report.workflowSummary.failed === 0 &&
    report.workflowSummary.pending === 0 &&
    report.workflowSummary.unknown === 0 &&
    !report.workflowSummary.hasInvalidWorkflowData;
  const explicitlyAcceptable =
    report.workflowSummary.state === "all_green" ||
    report.recommendedNextActions.includes("mark_ready_for_review");
  const blockingActions = new Set([
    "wait_for_ci",
    "fix_pr_contract",
    "rerun_failed_jobs",
    "request_rebase",
    "request_codex_repair",
    "blocked",
  ]);
  const hasBlockingAction = report.recommendedNextActions.some((action) => blockingActions.has(action));

  if (noAmbiguousChecks && explicitlyAcceptable && !hasBlockingAction) {
    return { acceptable: true, reasons: [] };
  }

  return {
    acceptable: false,
    reasons: [
      `Checks are not safely acceptable for ready-for-review: ${report.workflowSummary.state}.`,
      ...report.blockedReasons,
    ],
  };
}

function planMarkReadyForReview(input: SafeMutationPlanInput, prNumber: number, blockedReasons: string[]): PreparedSafeMutation {
  const body = contextPrBody(input.context);
  const draft = contextDraft(input.context);
  const alreadyReady = draft === false;
  let contract: PrContractValidation | null = null;
  let checksAcceptable = false;

  if (alreadyReady) {
    const plan = basePlan({
      intent: input.mutationIntent,
      prNumber,
      dryRun: normalizeBoolean(input.dryRun),
      approvedForMutation: input.approvalPhrase === AF009_APPROVAL_PHRASE,
      status: "already_ready",
      action: "none",
      canExecute: false,
      blockedReasons,
    });
    plan.readyForReview = {
      currentDraft: false,
      alreadyReady: true,
      prContractValid: body ? validatePrContractForAf009(body).valid : false,
      runtimeEvidencePresent: body ? validatePrContractForAf009(body).runtimeEvidencePresent : false,
      runtimeEvidenceMeaningful: body ? validatePrContractForAf009(body).runtimeEvidenceMeaningful : false,
      mergeRecommendation: body ? validatePrContractForAf009(body).mergeRecommendation : null,
      checksAcceptable: false,
    };
    plan.summary = planSummary({
      status: plan.status,
      intent: plan.intent,
      action: plan.action,
      blockedReasons: plan.blockedReasons,
      dryRun: plan.dryRun,
    });
    assertSafeMutationArtifactSafe(plan);
    return { plan };
  }

  if (draft !== true) {
    blockedReasons.push("PR draft status is unknown; AF009 cannot mark ready.");
  }

  if (!body) {
    blockedReasons.push("PR body metadata is required before marking ready for review.");
  } else {
    contract = validatePrContractForAf009(body);
    if (!contract.valid) {
      blockedReasons.push(`PR Contract is invalid: ${contract.errors.join(" ")}`);
    }
    if (!contract.runtimeEvidencePresent || !contract.runtimeEvidenceMeaningful) {
      blockedReasons.push("Runtime evidence must contain completed, meaningful evidence before marking ready for review.");
    }
    if (contract.mergeRecommendation === "Blocked") {
      blockedReasons.push("Merge recommendation is blocked; AF009 cannot mark ready for review.");
    }
  }

  const checkResult = checksAcceptableForReady(input.context);
  checksAcceptable = checkResult.acceptable;
  if (!checkResult.acceptable) blockedReasons.push(...checkResult.reasons);

  const status = statusFromBlocked(blockedReasons);
  const plan = basePlan({
    intent: input.mutationIntent,
    prNumber,
    dryRun: normalizeBoolean(input.dryRun),
    approvedForMutation: input.approvalPhrase === AF009_APPROVAL_PHRASE,
    status,
    action: "mark_ready_for_review",
    canExecute: status === "planned" && !normalizeBoolean(input.dryRun),
    blockedReasons,
  });

  plan.readyForReview = {
    currentDraft: draft,
    alreadyReady: false,
    prContractValid: contract?.valid ?? false,
    runtimeEvidencePresent: contract?.runtimeEvidencePresent ?? false,
    runtimeEvidenceMeaningful: contract?.runtimeEvidenceMeaningful ?? false,
    mergeRecommendation: contract?.mergeRecommendation ?? null,
    checksAcceptable,
  };
  plan.summary = planSummary({
    status: plan.status,
    intent: plan.intent,
    action: plan.action,
    blockedReasons: plan.blockedReasons,
    dryRun: plan.dryRun,
  });

  assertSafeMutationArtifactSafe(plan);
  return { plan };
}

export function createSafeMutationPlan(input: SafeMutationPlanInput): PreparedSafeMutation {
  const dryRun = normalizeBoolean(input.dryRun);
  const prNumber = normalizePrNumber(input.prNumber);
  const blockedReasons: string[] = [];
  const approvalReason = approvalBlockedReason(dryRun, input.approvalPhrase);

  if (!isSafeMutationIntent(input.mutationIntent)) {
    blockedReasons.push(`Invalid mutation_intent "${input.mutationIntent}". Use one of: ${AF009_MUTATION_INTENTS.join(", ")}.`);
  }
  if (prNumber === null) {
    blockedReasons.push("pr_number is required and must be a positive integer.");
  }
  if (approvalReason) blockedReasons.push(approvalReason);

  if (blockedReasons.length > 0 || prNumber === null || !isSafeMutationIntent(input.mutationIntent)) {
    const plan = basePlan({
      intent: input.mutationIntent,
      prNumber,
      dryRun,
      approvedForMutation: input.approvalPhrase === AF009_APPROVAL_PHRASE,
      status: "rejected",
      action: "none",
      canExecute: false,
      blockedReasons,
    });
    assertSafeMutationArtifactSafe(plan);
    return { plan };
  }

  if (input.mutationIntent === "update_pr_runtime_evidence") {
    return planUpdateRuntimeEvidence(input, prNumber, blockedReasons);
  }
  if (input.mutationIntent === "add_safe_pr_comment") {
    return planSafeComment(input, prNumber, blockedReasons);
  }
  return planMarkReadyForReview(input, prNumber, blockedReasons);
}

export async function executeSafeMutation(
  prepared: PreparedSafeMutation,
  adapter: SafeMutationAdapter,
): Promise<SafeMutationExecutionResult> {
  const { plan } = prepared;

  if (plan.dryRun) {
    return safeExecutionResult(plan, {
      status: "dry_run_noop",
      mutationAttempted: false,
      message: "Dry-run completed; no mutation adapter was called.",
    });
  }

  if (!plan.canExecute || plan.status !== "planned" || plan.prNumber === null) {
    return safeExecutionResult(plan, {
      status: plan.status,
      mutationAttempted: false,
      message: plan.blockedReasons.join(" ") || "Plan is not executable.",
    });
  }

  if (plan.action === "update_pr_body_runtime_evidence") {
    if (!prepared.preparedBody) throw new Error("Prepared PR body was not available for approved runtime evidence update.");
    if (!adapter.updatePullRequestBody) throw new Error("Mutation adapter does not support PR body updates.");
    const result = await adapter.updatePullRequestBody(plan.prNumber, prepared.preparedBody);
    return safeExecutionResult(plan, {
      status: "applied",
      mutationAttempted: true,
      message: "Runtime evidence section updated.",
      targetUrl: result.htmlUrl ?? null,
      targetId: result.id ?? null,
    });
  }

  if (plan.action === "create_issue_comment") {
    if (!prepared.preparedCommentBody) throw new Error("Prepared comment body was not available for approved comment creation.");
    if (!adapter.createIssueComment) throw new Error("Mutation adapter does not support issue comment creation.");
    const result = await adapter.createIssueComment(plan.prNumber, prepared.preparedCommentBody);
    return safeExecutionResult(plan, {
      status: "applied",
      mutationAttempted: true,
      message: "AF009 metadata comment created.",
      targetUrl: result.htmlUrl ?? null,
      targetId: result.id ?? null,
    });
  }

  if (plan.action === "update_issue_comment") {
    if (!prepared.preparedCommentBody || typeof prepared.commentId !== "number") {
      throw new Error("Prepared comment body or comment id was not available for approved comment update.");
    }
    if (!adapter.updateIssueComment) throw new Error("Mutation adapter does not support issue comment updates.");
    const result = await adapter.updateIssueComment(prepared.commentId, prepared.preparedCommentBody);
    return safeExecutionResult(plan, {
      status: "applied",
      mutationAttempted: true,
      message: "AF009 metadata comment updated.",
      targetUrl: result.htmlUrl ?? null,
      targetId: result.id ?? prepared.commentId,
    });
  }

  if (plan.action === "mark_ready_for_review") {
    if (!adapter.markPullRequestReadyForReview) throw new Error("Mutation adapter does not support marking PRs ready for review.");
    const result = await adapter.markPullRequestReadyForReview(plan.prNumber);
    return safeExecutionResult(plan, {
      status: "applied",
      mutationAttempted: true,
      message: "Draft PR marked ready for review.",
      targetUrl: result.htmlUrl ?? null,
      targetId: result.id ?? null,
    });
  }

  return safeExecutionResult(plan, {
    status: plan.status,
    mutationAttempted: false,
    message: plan.summary,
  });
}

function safeExecutionResult(
  plan: SafeMutationPlan,
  overrides: {
    status: SafeMutationStatus;
    mutationAttempted: boolean;
    message: string;
    targetUrl?: string | null;
    targetId?: number | null;
  },
): SafeMutationExecutionResult {
  const result: SafeMutationExecutionResult = {
    version: 1,
    intent: plan.intent,
    prNumber: plan.prNumber,
    dryRun: plan.dryRun,
    status: overrides.status,
    action: plan.action,
    mutationAttempted: overrides.mutationAttempted,
    metadataOnly: true,
    mutatesCode: false,
    mutatesRuntimeState: false,
    mutatesBranchState: false,
    message: overrides.message,
    targetUrl: overrides.targetUrl,
    targetId: overrides.targetId,
  };
  assertSafeMutationArtifactSafe(result);
  return result;
}

function assertMetadataTextSafe(value: string, label: string): void {
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error(`${label} contains a secret-like value and was rejected.`);
    }
  }

  const unsafeLine = value.split(/\n/).find((line) =>
    SENSITIVE_LINE_PATTERNS.some((pattern) => pattern.test(line)),
  );
  if (unsafeLine) {
    throw new Error(`${label} contains an unsafe raw-content or credential-like field and was rejected.`);
  }
}

export function assertSafeMutationArtifactSafe(value: unknown): void {
  const seen = new Set<unknown>();

  function visit(current: unknown, path: string): void {
    if (typeof current === "string") {
      for (const pattern of SECRET_VALUE_PATTERNS) {
        if (pattern.test(current)) {
          throw new Error(`AF009 artifact contains a secret-like value at ${path}.`);
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
      const forbidden = FORBIDDEN_KEY_PATTERNS.find((pattern) => pattern.test(key));
      if (forbidden) {
        throw new Error(`AF009 artifact contains forbidden key at ${path}.${key}.`);
      }
      visit(entry, `${path}.${key}`);
    }
  }

  visit(value, "$");
}

export function buildSafeMutationPlanMarkdown(plan: SafeMutationPlan): string {
  const blocked = plan.blockedReasons.length > 0
    ? plan.blockedReasons.map((reason) => `- ${reason}`)
    : ["- None."];
  const guardrails = plan.guardrails.map((guardrail) => `- ${guardrail}`);
  const details: string[] = [];

  if (plan.runtimeEvidenceUpdate) {
    details.push(
      `Runtime evidence line count: ${plan.runtimeEvidenceUpdate.oldRuntimeEvidenceLineCount} -> ${plan.runtimeEvidenceUpdate.newRuntimeEvidenceLineCount}`,
      `PR body hash: ${plan.runtimeEvidenceUpdate.beforeHash.slice(0, 12)} -> ${plan.runtimeEvidenceUpdate.afterHash.slice(0, 12)}`,
      `Sections preserved: ${plan.runtimeEvidenceUpdate.sectionsPreserved ? "yes" : "no"}`,
    );
  }

  if (plan.commentUpdate) {
    details.push(
      `Comment marker: ${plan.commentUpdate.marker}`,
      `Existing marker comments: ${plan.commentUpdate.existingMarkerCommentCount}`,
      `Comment operation: ${plan.commentUpdate.operation}`,
    );
  }

  if (plan.readyForReview) {
    details.push(
      `Current draft: ${plan.readyForReview.currentDraft ?? "unknown"}`,
      `Already ready: ${plan.readyForReview.alreadyReady ? "yes" : "no"}`,
      `PR Contract valid: ${plan.readyForReview.prContractValid ? "yes" : "no"}`,
      `Runtime evidence meaningful: ${plan.readyForReview.runtimeEvidenceMeaningful ? "yes" : "no"}`,
      `Merge recommendation: ${plan.readyForReview.mergeRecommendation ?? "unknown"}`,
      `Checks acceptable: ${plan.readyForReview.checksAcceptable ? "yes" : "no"}`,
    );
  }

  return [
    "# AF009 Safe PR Metadata Mutation Plan",
    "",
    `Intent: ${plan.intent}`,
    `PR number: ${plan.prNumber ?? "invalid"}`,
    `Dry-run: ${plan.dryRun ? "true" : "false"}`,
    `Approved for mutation: ${plan.approvedForMutation ? "yes" : "no"}`,
    `Status: ${plan.status}`,
    `Action: ${plan.action}`,
    `Can execute: ${plan.canExecute ? "yes" : "no"}`,
    `Metadata only: ${plan.metadataOnly ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    plan.summary,
    "",
    "## Details",
    "",
    ...(details.length > 0 ? details.map((detail) => `- ${detail}`) : ["- No mutation details available."]),
    "",
    "## Blocked Reasons",
    "",
    ...blocked,
    "",
    "## Guardrails",
    "",
    ...guardrails,
  ].join("\n");
}

export function buildSafeMutationSummary(input: {
  plan: SafeMutationPlan | null;
  result?: SafeMutationExecutionResult | null;
  status: "success" | "failed";
  error?: unknown;
}): string {
  const plan = input.plan;
  const result = input.result ?? null;
  const errorMessage = input.error
    ? input.error instanceof Error
      ? input.error.message
      : String(input.error)
    : null;

  return [
    "# AF009 Safe PR Metadata Mutation",
    "",
    `Status: ${input.status}`,
    `Intent: ${plan?.intent ?? "unknown"}`,
    `PR number: ${plan?.prNumber ?? "unknown"}`,
    `Dry-run: ${plan?.dryRun ?? "unknown"}`,
    `Plan status: ${plan?.status ?? "not_created"}`,
    `Action: ${plan?.action ?? "none"}`,
    `Mutation attempted: ${result?.mutationAttempted ? "yes" : "no"}`,
    "",
    "## Result",
    "",
    result?.message ?? plan?.summary ?? errorMessage ?? "Run failed safely before any mutation.",
    "",
    "## Artifacts",
    "",
    "- `.agent-factory/mutation-plan.json`",
    "- `.agent-factory/mutation-plan.md`",
    result ? "- `.agent-factory/mutation-result.json`" : "- `.agent-factory/mutation-result.json` not written because no mutation action was attempted.",
    "- `.agent-factory/agent-factory-mutation-summary.md`",
    "",
    "## Guardrails",
    "",
    ...GUARDRAILS.map((guardrail) => `- ${guardrail}`),
  ].join("\n");
}
