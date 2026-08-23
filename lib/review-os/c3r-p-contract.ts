import type { PracticeCalculationClaimV2Input } from "./trusted-repair-contract";

export const C3R_P_FEATURE_FLAG = "WCV_C3R_P_PRACTICE_ENABLED" as const;
export const C3R_P_OWNER_ALLOWLIST = "WCV_C3R_P_OWNER_EMAILS" as const;
export const C3R_P_RUNTIME_ARTIFACT_REF =
  "PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1" as const;
export const C3R_P_BROWSER_EVIDENCE_REF =
  `${C3R_P_RUNTIME_ARTIFACT_REF}#browser-to-postgres` as const;
export const C3R_P_VALIDATOR_ID =
  "validator:practice-calculation-claim@2" as const;

export const C3R_P_RECORD_STATES = [
  "D0_OPEN",
  "FEEDBACK_COMMITTED",
  "REPAIRED",
  "D1_COMPLETE",
  "D7_COMPLETE",
  "CLOSED",
  "REOPENED",
] as const;

export type C3RPRecordState = (typeof C3R_P_RECORD_STATES)[number];
export type C3RPPracticeClaimInput = PracticeCalculationClaimV2Input;

export type C3RPCommandResult = Readonly<{
  recordId?: string;
  planId?: string;
  recordVersion: number;
  state: string;
  status: "applied" | "assisted_not_independent" | "stale_plan";
  eligibilityDigest?: string;
  reviewStateDigest?: string;
}>;

export type C3RPRecord = Readonly<{
  id: string;
  user_id: string;
  subject: "PRACTICE";
  source_id: string;
  problem_id: string;
  revision_id: string;
  item_id: string;
  artifact_id: string;
  initial_surface_id: string;
  prediction: "likely_success" | "likely_partial" | "likely_blocked";
  confidence: "low" | "medium" | "high";
  state: C3RPRecordState;
  record_version: number;
  assistance_committed: boolean;
  primary_gap_id: string | null;
  d1_due_at: string | null;
  d7_due_at: string | null;
  recurrence_due_at: string | null;
  created_at: string;
  updated_at: string;
}>;

export type C3RPAttempt = Readonly<{
  id: string;
  record_id: string;
  item_id: string;
  surface_id: string;
  phase: "D0" | "D1" | "D7_TRANSFER" | "RECURRENCE";
  outcome: "FAILURE" | "ASSISTED_SUCCESS" | "INDEPENDENT_SUCCESS";
  assistance_level: number;
  body: string;
  validator_id: string | null;
  proof_state: string | null;
  occurred_at: string;
}>;

export type C3RPGap = Readonly<{
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

export type C3RPFailureNote = Readonly<{
  id: string;
  record_id: string;
  gap_id: string;
  body: string;
  created_at: string;
}>;

export type C3RPLedgerEntry = Readonly<{
  id: string;
  record_id: string;
  entry_kind: string;
  evidence_ref: string;
  projection: Readonly<Record<string, unknown>>;
  contains_body: false;
  occurred_at: string;
}>;

export type C3RPRestoredRecord = Readonly<{
  record: C3RPRecord;
  attempts: readonly C3RPAttempt[];
  assistanceEvents: readonly Readonly<Record<string, unknown>>[];
  gaps: readonly C3RPGap[];
  failureNotes: readonly C3RPFailureNote[];
  ledger: readonly C3RPLedgerEntry[];
}>;

export type C3RPQueueItem = Readonly<{
  recordId: string;
  gapId: string;
  state: C3RPRecordState;
  gapState: "OPEN" | "REOPENED";
  conceptId: string;
  dueAt: string;
  eligible: boolean;
}>;

export type C3RPPlanBlock = Readonly<{
  blockId: string;
  blockKind: "CORE_OUTCOME" | "SUPPORT";
  recordId: string;
  gapId: string;
  ordinal: number;
  minutes: number;
}>;

export type C3RPDashboard = Readonly<{
  eligibilityDigest: string;
  reviewStateDigest: string;
  queue: readonly C3RPQueueItem[];
  ledger: readonly C3RPLedgerEntry[];
  plans: readonly Readonly<Record<string, unknown>>[];
}>;

export type C3RPView = Readonly<{
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
  restored: C3RPRestoredRecord | null;
  dashboard: C3RPDashboard;
  currentPlan: Readonly<{
    planId: string;
    recordVersion: number;
    state: string;
    blocks: readonly C3RPPlanBlock[];
    dayComplete: boolean;
  }> | null;
}>;

export class C3RPError extends Error {
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

  constructor(code: C3RPError["code"]) {
    super(`c3r-p:${code}`);
    this.code = code;
  }
}
export function isC3RPRecordState(value: unknown): value is C3RPRecordState {
  return C3R_P_RECORD_STATES.includes(value as C3RPRecordState);
}

export function c3rPRequiredText(value: unknown, maximum = 20_000) {
  if (typeof value !== "string") throw new C3RPError("invalid_input");
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new C3RPError("invalid_input");
  }
  return normalized;
}

export function c3rPRequiredUuid(value: unknown) {
  const normalized = c3rPRequiredText(value, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(normalized)) {
    throw new C3RPError("invalid_input");
  }
  return normalized;
}

export function c3rPExactObject(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new C3RPError("invalid_input");
  }
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new C3RPError("invalid_input");
  }
  return value as Record<string, unknown>;
}
