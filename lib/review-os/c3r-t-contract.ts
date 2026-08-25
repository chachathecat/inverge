import type { TheoryPredicateClaimV1Input } from "./trusted-repair-contract";

export const C3R_T_FEATURE_FLAG = "WCV_C3R_T_THEORY_ENABLED" as const;
export const C3R_T_OWNER_ALLOWLIST = "WCV_C3R_T_OWNER_EMAILS" as const;
export const C3R_T_RUNTIME_ARTIFACT_REF =
  "THEORY_RUNTIME:c3r-t-theory-durable-learning-v1" as const;
export const C3R_T_BROWSER_EVIDENCE_REF =
  `${C3R_T_RUNTIME_ARTIFACT_REF}#browser-to-postgres` as const;
export const C3R_T_VALIDATOR_ID =
  "validator:theory-scoped-predicate@1" as const;
export const C3R_T_ANCHOR_ID =
  "repair-anchor:theory:synthetic-income-approach" as const;
export const C3R_T_ANCHOR_VERSION_ID =
  "repair-anchor:theory:synthetic-income-approach@1" as const;
export const C3R_T_TARGET_SCOPE_ID =
  "theory-target:synthetic-income-approach" as const;

export const C3R_T_PLAN_COMPLETION_ACTIONS: ReadonlySet<string> = new Set([
  "complete_d1",
  "complete_d7_transfer",
  "complete_recurrence",
  "complete_reopened_review",
]);

export const C3R_T_RECORD_STATES = [
  "D0_OPEN",
  "FEEDBACK_COMMITTED",
  "REPAIRED",
  "D1_COMPLETE",
  "D7_COMPLETE",
  "CLOSED",
  "REOPENED",
] as const;

export type C3RTRecordState = (typeof C3R_T_RECORD_STATES)[number];
export type C3RTTheoryClaimInput = TheoryPredicateClaimV1Input;

export type C3RTCommandResult = Readonly<{
  recordId?: string;
  planId?: string;
  recordVersion: number;
  state: string;
  status: "applied" | "assisted_not_independent" | "stale_plan";
  eligibilityDigest?: string;
  reviewStateDigest?: string;
}>;

export type C3RTRecord = Readonly<{
  id: string;
  user_id: string;
  subject: "THEORY";
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
  state: C3RTRecordState;
  record_version: number;
  assistance_committed: boolean;
  primary_gap_id: string | null;
  d1_due_at: string | null;
  d7_due_at: string | null;
  recurrence_due_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type C3RTAttempt = Readonly<{
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

export type C3RTTransferTask = Readonly<{
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

export type C3RTGap = Readonly<{
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

export type C3RTFailureNote = Readonly<{
  id: string;
  record_id: string;
  gap_id: string;
  body: string;
  created_at: string;
}>;

export type C3RTLedgerEntry = Readonly<{
  id: string;
  record_id: string;
  entry_kind: string;
  evidence_ref: string;
  projection: Readonly<Record<string, unknown>>;
  contains_body: false;
  occurred_at: string;
}>;

export type C3RTRestoredRecord = Readonly<{
  record: C3RTRecord;
  attempts: readonly C3RTAttempt[];
  transferTask: C3RTTransferTask | null;
  assistanceEvents: readonly Readonly<Record<string, unknown>>[];
  gaps: readonly C3RTGap[];
  failureNotes: readonly C3RTFailureNote[];
  ledger: readonly C3RTLedgerEntry[];
}>;

export type C3RTQueueItem = Readonly<{
  recordId: string;
  gapId: string;
  state: C3RTRecordState;
  gapState: "OPEN" | "REOPENED";
  reviewPhase: "D1" | "D7_TRANSFER" | "RECURRENCE" | "REOPENED_REVIEW";
  conceptId: string;
  dueAt: string;
  eligible: boolean;
}>;

export type C3RTPlanBlockInput = Readonly<{
  blockId: string;
  blockKind: "CORE_OUTCOME" | "SUPPORT";
  recordId: string;
  gapId: string;
  reviewPhase: C3RTQueueItem["reviewPhase"];
  ordinal: number;
  minutes: number;
}>;

export type C3RTPlanBlock = C3RTPlanBlockInput & Readonly<{
  executionState: "PENDING" | "COMPLETE";
}>;

export type C3RTPersistedPlan = Readonly<{
  planId: string;
  planKind: "TODAY" | "FULL_DAY";
  recordVersion: number;
  eligibilityDigest: string;
  state: "PROPOSED" | "ACCEPTED" | "EDITED" | "REJECTED" | "STALE";
  blocks: readonly C3RTPlanBlock[];
  completionState: "ACTIONABLE" | "COMPLETED" | "TERMINAL_INCOMPLETE";
  dayComplete: boolean;
  terminalReason: "COMPLETED" | "REJECTED" | "SUPERSEDED" | "ELIGIBILITY_CHANGED" | null;
  generatedAt: string;
  updatedAt: string;
}>;

export type C3RTDashboard = Readonly<{
  eligibilityDigest: string;
  reviewStateDigest: string;
  queue: readonly C3RTQueueItem[];
  ledger: readonly C3RTLedgerEntry[];
}>;

export type C3RTView = Readonly<{
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
  restored: C3RTRestoredRecord | null;
  dashboard: C3RTDashboard;
  currentPlan: C3RTPersistedPlan | null;
  planHistory: readonly C3RTPersistedPlan[];
}>;

export function c3rTCurrentQueueItem(input: Readonly<{
  queue: readonly C3RTQueueItem[];
  recordId: string | null | undefined;
  recordState: C3RTRecordState | null | undefined;
  gapId: string | null | undefined;
  gapState: C3RTGap["state"] | null | undefined;
  reviewPhase: C3RTQueueItem["reviewPhase"];
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

export class C3RTError extends Error {
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

  constructor(code: C3RTError["code"]) {
    super(`c3r-t:${code}`);
    this.code = code;
  }
}

export function isC3RTRecordState(value: unknown): value is C3RTRecordState {
  return C3R_T_RECORD_STATES.includes(value as C3RTRecordState);
}

export function c3rTRequiredText(value: unknown, maximum = 20_000) {
  if (typeof value !== "string") throw new C3RTError("invalid_input");
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new C3RTError("invalid_input");
  return normalized;
}

export function c3rTRequiredUuid(value: unknown) {
  const normalized = c3rTRequiredText(value, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) {
    throw new C3RTError("invalid_input");
  }
  return normalized;
}

export function c3rTExactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new C3RTError("invalid_input");
  }
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new C3RTError("invalid_input");
  }
  return value as Record<string, unknown>;
}
