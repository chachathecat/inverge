import type { AppraiserExamMode } from "./curriculum-reference";
import type { PersonalLearningStatus } from "./personal-learning-state-engine";
import {
  assertNoForbiddenPersonalLearningStateFields,
  assertSupportedPersonalLearningExamMode,
  assertSupportedPersonalLearningStatus,
  normalizePersonalLearningStateRecord,
  type PersonalLearningStateListOptions,
  type PersonalLearningStateRecord,
  type StoredPersonalLearningStateRecord,
} from "./personal-learning-state-repository";

export const PERSONAL_LEARNING_STATES_TABLE = "personal_learning_states";

export const PERSONAL_LEARNING_STATE_SUPABASE_COLUMNS = [
  "id",
  "user_id",
  "concept_node_id",
  "exam_mode",
  "subject",
  "status",
  "previous_status",
  "confidence_avg",
  "wrong_count",
  "correct_streak",
  "recovery_score",
  "last_seen_at",
  "next_review_at",
  "last_source_event_type",
  "last_task_type",
  "last_reason",
  "priority_score",
  "metadata",
  "created_at",
  "updated_at",
] as const;

export type PersonalLearningStateRow = {
  id: string;
  user_id: string;
  concept_node_id: string;
  exam_mode: AppraiserExamMode;
  subject: string;
  status: PersonalLearningStatus;
  previous_status: PersonalLearningStatus | null;
  confidence_avg: number | null;
  wrong_count: number;
  correct_streak: number;
  recovery_score: number | null;
  last_seen_at: string | null;
  next_review_at: string | null;
  last_source_event_type: string | null;
  last_task_type: string | null;
  last_reason: string | null;
  priority_score: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PersonalLearningStateSupabasePayload = Omit<PersonalLearningStateRow, "id"> & { id?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

async function createPersonalLearningStateSupabaseClient() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}

function cleanRequiredText(value: unknown, fieldName: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`personal-learning-state-supabase-repository-requires:${fieldName}`);
  return cleaned;
}

function fromRow(row: PersonalLearningStateRow): StoredPersonalLearningStateRecord {
  assertSupportedPersonalLearningExamMode(row.exam_mode);
  assertSupportedPersonalLearningStatus(row.status);
  if (row.previous_status !== null) assertSupportedPersonalLearningStatus(row.previous_status);
  const state = normalizePersonalLearningStateRecord({
    id: row.id,
    userId: row.user_id,
    conceptNodeId: row.concept_node_id,
    examMode: row.exam_mode,
    subject: row.subject,
    status: row.status,
    previousStatus: row.previous_status,
    confidenceAvg: row.confidence_avg,
    wrongCount: row.wrong_count,
    correctStreak: row.correct_streak,
    recoveryScore: row.recovery_score,
    lastSeenAt: row.last_seen_at,
    nextReviewAt: row.next_review_at,
    lastSourceEventType: row.last_source_event_type,
    lastTaskType: row.last_task_type,
    lastReason: row.last_reason,
    priorityScore: row.priority_score,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
  assertNoForbiddenPersonalLearningStateFields(state);
  return state;
}

export function buildPersonalLearningStateSupabasePayload(state: PersonalLearningStateRecord): PersonalLearningStateSupabasePayload {
  const normalized = normalizePersonalLearningStateRecord(state);
  assertNoForbiddenPersonalLearningStateFields(normalized);
  const payload: PersonalLearningStateSupabasePayload = {
    user_id: normalized.userId,
    concept_node_id: normalized.conceptNodeId,
    exam_mode: normalized.examMode,
    subject: normalized.subject,
    status: normalized.status,
    previous_status: normalized.previousStatus ?? null,
    confidence_avg: normalized.confidenceAvg ?? null,
    wrong_count: normalized.wrongCount,
    correct_streak: normalized.correctStreak,
    recovery_score: normalized.recoveryScore ?? null,
    last_seen_at: normalized.lastSeenAt ? String(normalized.lastSeenAt) : null,
    next_review_at: normalized.nextReviewAt ? String(normalized.nextReviewAt) : null,
    last_source_event_type: normalized.lastSourceEventType ? String(normalized.lastSourceEventType) : null,
    last_task_type: normalized.lastTaskType ? String(normalized.lastTaskType) : null,
    last_reason: normalized.lastReason ? String(normalized.lastReason) : null,
    priority_score: normalized.priorityScore ?? null,
    metadata: normalized.metadata,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
  };

  if (isValidUuid(state.id)) payload.id = state.id.trim();
  return payload;
}

export async function upsertLearningStateToSupabase(state: PersonalLearningStateRecord): Promise<StoredPersonalLearningStateRecord> {
  const payload = buildPersonalLearningStateSupabasePayload(state);
  const client = await createPersonalLearningStateSupabaseClient();
  const { data, error } = await client
    .from(PERSONAL_LEARNING_STATES_TABLE)
    .upsert(payload, { onConflict: "user_id,concept_node_id" })
    .select(PERSONAL_LEARNING_STATE_SUPABASE_COLUMNS.join(","))
    .single();

  if (error) throw new Error(`personal-learning-state-upsert-failed:${error.message}`);
  return fromRow(data as unknown as PersonalLearningStateRow);
}

export async function getLearningStateFromSupabase(userId: string, conceptNodeId: string): Promise<StoredPersonalLearningStateRecord | null> {
  assertNoForbiddenPersonalLearningStateFields({ userId, conceptNodeId });
  const client = await createPersonalLearningStateSupabaseClient();
  const { data, error } = await client
    .from(PERSONAL_LEARNING_STATES_TABLE)
    .select(PERSONAL_LEARNING_STATE_SUPABASE_COLUMNS.join(","))
    .eq("user_id", cleanRequiredText(userId, "userId"))
    .eq("concept_node_id", cleanRequiredText(conceptNodeId, "conceptNodeId"))
    .maybeSingle();

  if (error) throw new Error(`personal-learning-state-select-failed:${error.message}`);
  return data ? fromRow(data as unknown as PersonalLearningStateRow) : null;
}

export async function listDueLearningStatesFromSupabase(userId: string, options: PersonalLearningStateListOptions = {}): Promise<StoredPersonalLearningStateRecord[]> {
  assertNoForbiddenPersonalLearningStateFields({ userId, options });
  if (options.examMode && options.examMode !== "mixed") assertSupportedPersonalLearningExamMode(options.examMode);
  const now = options.now instanceof Date ? options.now.toISOString() : typeof options.now === "string" ? options.now : new Date().toISOString();
  const client = await createPersonalLearningStateSupabaseClient();
  let query = client
    .from(PERSONAL_LEARNING_STATES_TABLE)
    .select(PERSONAL_LEARNING_STATE_SUPABASE_COLUMNS.join(","))
    .eq("user_id", cleanRequiredText(userId, "userId"))
    .not("next_review_at", "is", null)
    .lte("next_review_at", now)
    .order("priority_score", { ascending: false, nullsFirst: false })
    .order("next_review_at", { ascending: true })
    .limit(options.limit ?? 50);

  if (options.examMode && options.examMode !== "mixed") query = query.eq("exam_mode", options.examMode);

  const { data, error } = await query;
  if (error) throw new Error(`personal-learning-state-due-list-failed:${error.message}`);
  return (data ?? []).map((row) => fromRow(row as unknown as PersonalLearningStateRow));
}

export async function listLearningStatesByStatusFromSupabase(
  userId: string,
  status: PersonalLearningStatus,
  options: Omit<PersonalLearningStateListOptions, "now"> = {},
): Promise<StoredPersonalLearningStateRecord[]> {
  assertNoForbiddenPersonalLearningStateFields({ userId, status, options });
  assertSupportedPersonalLearningStatus(status);
  if (options.examMode && options.examMode !== "mixed") assertSupportedPersonalLearningExamMode(options.examMode);
  const client = await createPersonalLearningStateSupabaseClient();
  let query = client
    .from(PERSONAL_LEARNING_STATES_TABLE)
    .select(PERSONAL_LEARNING_STATE_SUPABASE_COLUMNS.join(","))
    .eq("user_id", cleanRequiredText(userId, "userId"))
    .eq("status", status)
    .order("priority_score", { ascending: false, nullsFirst: false })
    .order("next_review_at", { ascending: true })
    .limit(options.limit ?? 50);

  if (options.examMode && options.examMode !== "mixed") query = query.eq("exam_mode", options.examMode);

  const { data, error } = await query;
  if (error) throw new Error(`personal-learning-state-status-list-failed:${error.message}`);
  return (data ?? []).map((row) => fromRow(row as unknown as PersonalLearningStateRow));
}

export async function deleteLearningStateFromSupabaseForTest(userId: string, conceptNodeId: string): Promise<void> {
  assertNoForbiddenPersonalLearningStateFields({ userId, conceptNodeId });
  const client = await createPersonalLearningStateSupabaseClient();
  const { error } = await client
    .from(PERSONAL_LEARNING_STATES_TABLE)
    .delete()
    .eq("user_id", cleanRequiredText(userId, "userId"))
    .eq("concept_node_id", cleanRequiredText(conceptNodeId, "conceptNodeId"));

  if (error) throw new Error(`personal-learning-state-delete-failed:${error.message}`);
}
