import type { LawApplicabilityClaimV1Input } from "./trusted-repair-contract";

export const C3R_L_FEATURE_FLAG = "WCV_C3R_L_LAW_ENABLED" as const;
export const C3R_L_OWNER_ALLOWLIST = "WCV_C3R_L_OWNER_EMAILS" as const;
export const C3R_L_RUNTIME_ARTIFACT_REF =
  "LAW_RUNTIME:c3r-l-law-durable-learning-v1" as const;
export const C3R_L_BROWSER_EVIDENCE_REF =
  `${C3R_L_RUNTIME_ARTIFACT_REF}#browser-to-postgres` as const;
export const C3R_L_VALIDATOR_ID =
  "validator:law-exact-applicability@1" as const;
export const C3R_L_ANCHOR_ID =
  "repair-anchor:law:synthetic-article-10" as const;
export const C3R_L_ANCHOR_VERSION_ID =
  "repair-anchor:law:synthetic-article-10@1" as const;
export const C3R_L_SOURCE_BINDING_ID =
  "law-binding:synthetic-official-act:article-10" as const;
export const C3R_L_SOURCE_ID = "law-source:synthetic-official-act" as const;
export const C3R_L_SOURCE_VERSION_ID =
  "law-source:synthetic-official-act@2026-01-01" as const;
export const C3R_L_LAW_ANCHOR_ID =
  "law-anchor:synthetic-official-act:article-10" as const;
export const C3R_L_LAW_ANCHOR_VERSION_ID =
  "law-anchor:synthetic-official-act:article-10@2026-01-01" as const;

export const C3R_L_PLAN_COMPLETION_ACTIONS: ReadonlySet<string> = new Set([
  "complete_d1",
  "complete_d7_transfer",
  "complete_recurrence",
  "complete_reopened_review",
]);

export const C3R_L_RECORD_STATES = [
  "D0_OPEN",
  "FEEDBACK_COMMITTED",
  "REPAIRED",
  "D1_COMPLETE",
  "D7_COMPLETE",
  "CLOSED",
  "REOPENED",
] as const;

export type C3RLRecordState = (typeof C3R_L_RECORD_STATES)[number];
export type C3RLLawClaimInput = LawApplicabilityClaimV1Input;

export type C3RLCommandResult = Readonly<{
  recordId?: string;
  planId?: string;
  recordVersion: number;
  state: string;
  status: "applied" | "assisted_not_independent" | "stale_plan";
  eligibilityDigest?: string;
  reviewStateDigest?: string;
}>;

export type C3RLRecord = Readonly<{
  id: string;
  user_id: string;
  subject: "LAW";
  source_id: string;
  problem_id: string;
  revision_id: string;
  item_id: string;
  artifact_id: string;
  initial_surface_id: string;
  prediction: "likely_success" | "likely_partial" | "likely_blocked";
  confidence: "low" | "medium" | "high";
  configuration_snapshot: Readonly<Record<string, string>>;
  configuration_digest: string;
  state: C3RLRecordState;
  record_version: number;
  assistance_committed: boolean;
  primary_gap_id: string | null;
  d1_due_at: string | null;
  d7_due_at: string | null;
  recurrence_due_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type C3RLAttempt = Readonly<{
  id: string;
  record_id: string;
  item_id: string;
  surface_id: string;
  phase: "D0" | "D1" | "D7_TRANSFER" | "RECURRENCE" | "REOPENED_REVIEW";
  outcome: "FAILURE" | "ASSISTED_SUCCESS" | "INDEPENDENT_SUCCESS";
  assistance_level: number;
  transfer_task_id: string | null;
  body: string;
  validator_id: string | null;
  proof_state: "PASS" | "PARTIAL" | "AMBIGUOUS" | "UNSUPPORTED" | "BLOCKED" | "STALE" | null;
  proof_digest: string | null;
  proof_claim: Readonly<Record<string, unknown>> | null;
  proof_evaluation: Readonly<Record<string, unknown>> | null;
  proof_reason_codes: readonly string[] | null;
  occurred_at: string;
}>;

export type C3RLTransferTask = Readonly<{
  taskId: string;
  recordId: string;
  sourceId: string;
  problemId: string;
  revisionId: string;
  itemId: string;
  artifactId: string;
  surfaceId: string;
  eligibleAt: string;
  presentedAt: string | null;
  completedAt: string | null;
  state: "SEALED" | "PRESENTED" | "COMPLETED";
  prompt: string | null;
}>;

export type C3RLGap = Readonly<{
  id: string;
  record_id: string;
  concept_id: string;
  evidence_ref: string;
  state: "OPEN" | "CLOSED" | "REOPENED";
  reopen_count: number;
  d1_due_at: string;
  d7_due_at: string;
  recurrence_due_at: string;
}>;

export type C3RLFailureNote = Readonly<{
  id: string;
  record_id: string;
  gap_id: string;
  body: string;
  created_at: string;
}>;

export type C3RLLedgerEntry = Readonly<{
  id: string;
  record_id: string;
  entry_kind: string;
  evidence_ref: string;
  projection: Readonly<Record<string, unknown>>;
  contains_body: false;
  occurred_at: string;
}>;

export type C3RLRestoredRecord = Readonly<{
  record: C3RLRecord;
  attempts: readonly C3RLAttempt[];
  transferTask: C3RLTransferTask | null;
  assistanceEvents: readonly Readonly<Record<string, unknown>>[];
  gaps: readonly C3RLGap[];
  failureNotes: readonly C3RLFailureNote[];
  ledger: readonly C3RLLedgerEntry[];
}>;

export type C3RLQueueItem = Readonly<{
  recordId: string;
  gapId: string;
  state: C3RLRecordState;
  gapState: "OPEN" | "REOPENED";
  reviewPhase: "D1" | "D7_TRANSFER" | "RECURRENCE" | "REOPENED_REVIEW";
  conceptId: string;
  dueAt: string;
  eligible: boolean;
}>;

export type C3RLPlanBlockInput = Readonly<{
  blockId: string;
  blockKind: "CORE_OUTCOME" | "SUPPORT";
  recordId: string;
  gapId: string;
  reviewPhase: C3RLQueueItem["reviewPhase"];
  ordinal: number;
  minutes: number;
}>;

export type C3RLPlanBlock = C3RLPlanBlockInput & Readonly<{
  executionState: "PENDING" | "COMPLETE";
}>;

export type C3RLPersistedPlan = Readonly<{
  planId: string;
  planKind: "TODAY" | "FULL_DAY";
  recordVersion: number;
  eligibilityDigest: string;
  state: "PROPOSED" | "ACCEPTED" | "EDITED" | "REJECTED" | "STALE";
  blocks: readonly C3RLPlanBlock[];
  completionState: "ACTIONABLE" | "COMPLETED" | "TERMINAL_INCOMPLETE";
  dayComplete: boolean;
  terminalReason: "COMPLETED" | "REJECTED" | "SUPERSEDED" | "ELIGIBILITY_CHANGED" | null;
  generatedAt: string;
  updatedAt: string;
}>;

export type C3RLDashboard = Readonly<{
  eligibilityDigest: string;
  reviewStateDigest: string;
  queue: readonly C3RLQueueItem[];
  ledger: readonly C3RLLedgerEntry[];
}>;

export type C3RLView = Readonly<{
  source: Readonly<{
    sourceId: string;
    problemId: string;
    revisionId: string;
    itemId: string;
    artifactId: string;
    prompt: string;
    gapLabel: string;
    scaffold: string;
  }>;
  restored: C3RLRestoredRecord | null;
  dashboard: C3RLDashboard;
  currentPlan: C3RLPersistedPlan | null;
  planHistory: readonly C3RLPersistedPlan[];
}>;

export type C3RLCompletionPlanBinding = Readonly<{
  planBlockId: string | null;
  planId: string | null;
  planVersion: number | null;
}>;

const EMPTY_C3R_L_COMPLETION_PLAN_BINDING: C3RLCompletionPlanBinding = Object.freeze({
  planBlockId: null,
  planId: null,
  planVersion: null,
});

export function c3rLCompletionPlanBinding(input: Readonly<{
  plan: C3RLPersistedPlan | null | undefined;
  recordId: string | null | undefined;
  gapId: string | null | undefined;
  reviewPhase: C3RLQueueItem["reviewPhase"] | null | undefined;
}>): C3RLCompletionPlanBinding {
  const { plan } = input;
  if (!plan || (plan.state !== "ACCEPTED" && plan.state !== "EDITED") ||
      !input.recordId || !input.gapId || !input.reviewPhase) {
    return EMPTY_C3R_L_COMPLETION_PLAN_BINDING;
  }
  const block = plan.blocks.find((candidate) =>
    candidate.recordId === input.recordId && candidate.gapId === input.gapId &&
    candidate.reviewPhase === input.reviewPhase && candidate.executionState === "PENDING");
  if (!block) return EMPTY_C3R_L_COMPLETION_PLAN_BINDING;
  return {
    planBlockId: block.blockId,
    planId: plan.planId,
    planVersion: plan.recordVersion,
  };
}

export function c3rLDeletedView(view: C3RLView): C3RLView {
  return {
    ...view,
    restored: null,
    dashboard: { ...view.dashboard, queue: [], ledger: [] },
    currentPlan: null,
    planHistory: [],
  };
}

export function c3rLCurrentQueueItem(input: Readonly<{
  queue: readonly C3RLQueueItem[];
  recordId: string | null | undefined;
  recordState: C3RLRecordState | null | undefined;
  gapId: string | null | undefined;
  gapState: C3RLGap["state"] | null | undefined;
  reviewPhase: C3RLQueueItem["reviewPhase"];
}>) {
  if (!input.recordId || !input.recordState || !input.gapId || !input.gapState) return null;
  return input.queue.find((item) =>
    item.recordId === input.recordId &&
    item.gapId === input.gapId &&
    item.state === input.recordState &&
    item.gapState === input.gapState &&
    item.reviewPhase === input.reviewPhase
  ) ?? null;
}

export class C3RLError extends Error {
  readonly code:
    | "feature_disabled"
    | "production_denied"
    | "auth_required"
    | "owner_required"
    | "invalid_input"
    | "invalid_transition"
    | "not_found"
    | "stale_record"
    | "stale_plan"
    | "temporarily_unavailable";

  constructor(code: C3RLError["code"]) {
    super(`c3r-l:${code}`);
    this.code = code;
  }
}

export function isC3RLRecordState(value: unknown): value is C3RLRecordState {
  return C3R_L_RECORD_STATES.includes(value as C3RLRecordState);
}

export function c3rLRequiredText(value: unknown, maximum = 20_000) {
  if (typeof value !== "string") throw new C3RLError("invalid_input");
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new C3RLError("invalid_input");
  return normalized;
}

export function c3rLRequiredUuid(value: unknown) {
  const normalized = c3rLRequiredText(value, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) {
    throw new C3RLError("invalid_input");
  }
  return normalized;
}

export function c3rLExactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new C3RLError("invalid_input");
  }
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new C3RLError("invalid_input");
  }
  return value as Record<string, unknown>;
}
