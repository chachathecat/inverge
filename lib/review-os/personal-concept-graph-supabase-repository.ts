import {
  rankConceptGraphNodesForToday,
  type PersonalConceptAtomicTransitionInput,
  type PersonalConceptAtomicTransitionResult,
  type PersonalConceptAtomicTransitionStatus,
  type PersonalConceptNode,
  type PersonalConceptState,
  type PersonalConceptTodayContext,
} from "./personal-concept-graph";
import { type AppraiserExamMode } from "./curriculum-reference";

export type PersonalConceptGraphSupabaseContext = PersonalConceptTodayContext & {
  examMode?: AppraiserExamMode | "mixed";
};

async function createPersonalConceptGraphSupabaseClient() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  return createSupabaseServerClient();
}

type PersonalConceptNodeRow = {
  id: string;
  user_id: string;
  exam_mode: AppraiserExamMode;
  subject_id: string;
  unit_id: string;
  state: PersonalConceptState;
  confidence: PersonalConceptNode["confidence"];
  last_result: PersonalConceptNode["lastResult"];
  last_task_type: string;
  wrong_count: number;
  recovery_count: number;
  stable_count: number;
  next_recommended_task_type: string;
  next_due_at: string;
  updated_at: string;
  metadata_only: true;
  version: number;
  source_status: "repository_contract_feature_flagged_no_production_write";
};

export type PersonalConceptNodeSupabaseWritePayload = Omit<PersonalConceptNodeRow, "id"> & {
  id?: string;
};

export const PERSONAL_CONCEPT_NODES_TABLE = "personal_concept_nodes";
export const PERSONAL_CONCEPT_TRANSITION_EVENTS_TABLE = "personal_concept_transition_events";
export const PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC = "transition_personal_concept_node_v1";
export const PERSONAL_CONCEPT_GRAPH_SOURCE_STATUS = "repository_contract_feature_flagged_no_production_write";
export const PERSONAL_CONCEPT_GRAPH_REPOSITORY_VERSION = 1;

export const PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS = [
  "id",
  "user_id",
  "exam_mode",
  "subject_id",
  "unit_id",
  "state",
  "confidence",
  "last_result",
  "last_task_type",
  "wrong_count",
  "recovery_count",
  "stable_count",
  "next_recommended_task_type",
  "next_due_at",
  "updated_at",
  "metadata_only",
  "version",
  "source_status",
] as const;

const ALLOWED_STATES = new Set<PersonalConceptState>(["unknown", "confused", "wrong", "recovering", "stable"]);
const ALLOWED_TRANSITION_STATUSES = new Set<PersonalConceptAtomicTransitionStatus>(["applied", "already_applied", "stale_signal", "rejected"]);
const FORBIDDEN_FIELD_NAMES = new Set([
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
  "officialAnswer",
  "modelAnswer",
  "scorePrediction",
  "instructorComment",
]);
const FORBIDDEN_FIELD_PATTERN = /(raw|ocr|copyright|userText|originalText|fullText|sourceText|answerText|problemText|questionText|officialAnswer|modelAnswer|scorePrediction|instructorComment)/i;

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Personal Concept Graph Supabase repository supports only 감정평가사 1차/2차 examMode: ${String(examMode)}`);
  }
}

function assertSupportedState(state: unknown): asserts state is PersonalConceptState {
  if (!ALLOWED_STATES.has(state as PersonalConceptState)) {
    throw new Error(`Personal Concept Graph Supabase repository state is not supported: ${String(state)}`);
  }
}

function cleanRequiredText(value: string | undefined, fieldName: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`Personal Concept Graph Supabase repository requires ${fieldName}`);
  return cleaned;
}

function assertNoForbiddenFields(value: unknown, path = "node"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_FIELD_NAMES.has(key) || FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Forbidden raw/copyrighted learner text field is not accepted by Personal Concept Graph Supabase repository: ${path}.${key}`);
    }
    assertNoForbiddenFields(nested, `${path}.${key}`);
  }
}

function assertMetadataOnlyNode(node: PersonalConceptNode): void {
  assertNoForbiddenFields(node);
  assertSupportedExamMode(node.examMode);
  assertSupportedState(node.state);
  if (node.metadataOnly !== true) {
    throw new Error("Personal Concept Graph Supabase repository accepts metadataOnly nodes only.");
  }
}

function fromRow(row: PersonalConceptNodeRow): PersonalConceptNode {
  return {
    id: row.id,
    userId: row.user_id,
    examMode: row.exam_mode,
    subjectId: row.subject_id,
    unitId: row.unit_id,
    state: row.state,
    confidence: row.confidence,
    lastResult: row.last_result,
    lastTaskType: row.last_task_type,
    wrongCount: row.wrong_count,
    recoveryCount: row.recovery_count,
    stableCount: row.stable_count,
    nextRecommendedTaskType: row.next_recommended_task_type,
    nextDueAt: row.next_due_at,
    updatedAt: row.updated_at,
    metadataOnly: true,
  };
}

type PersonalConceptAtomicTransitionRpcParams = {
  p_event_id: string;
  p_exam_mode: PersonalConceptAtomicTransitionInput["examMode"];
  p_subject_id: string;
  p_unit_id: string;
  p_task_type: string;
  p_result: PersonalConceptAtomicTransitionInput["result"];
  p_confidence: PersonalConceptAtomicTransitionInput["confidence"];
  p_due_bucket: PersonalConceptAtomicTransitionInput["dueBucket"] | null;
  p_recent_miss_count: number;
  p_occurred_at: string;
};

type PersonalConceptAtomicTransitionRpcRow = {
  status: PersonalConceptAtomicTransitionStatus;
  reason: string | null;
  id: string | null;
  user_id: string | null;
  exam_mode: PersonalConceptAtomicTransitionInput["examMode"] | null;
  subject_id: string | null;
  unit_id: string | null;
  state: PersonalConceptState | null;
  confidence: PersonalConceptNode["confidence"] | null;
  last_result: PersonalConceptNode["lastResult"] | null;
  last_task_type: string | null;
  wrong_count: number | null;
  recovery_count: number | null;
  stable_count: number | null;
  next_recommended_task_type: string | null;
  next_due_at: string | null;
  updated_at: string | null;
  previous_state: PersonalConceptState | null;
  previous_updated_at: string | null;
  metadata_only: true;
};

export function buildPersonalConceptAtomicTransitionRpcParams(input: PersonalConceptAtomicTransitionInput): PersonalConceptAtomicTransitionRpcParams {
  assertNoForbiddenFields(input);
  assertSupportedExamMode(input.examMode);
  const eventId = cleanRequiredText(input.eventId, "eventId");
  if (eventId.length > 200) {
    throw new Error("Personal Concept Graph atomic transition eventId is too long.");
  }
  return {
    p_event_id: eventId,
    p_exam_mode: input.examMode,
    p_subject_id: cleanRequiredText(input.subjectId, "subjectId"),
    p_unit_id: cleanRequiredText(input.unitId, "unitId"),
    p_task_type: cleanRequiredText(input.taskType, "taskType"),
    p_result: input.result,
    p_confidence: input.confidence ?? "unknown",
    p_due_bucket: input.dueBucket ?? null,
    p_recent_miss_count: typeof input.recentMissCount === "number" && Number.isFinite(input.recentMissCount)
      ? Math.max(0, Math.round(input.recentMissCount))
      : 0,
    p_occurred_at: cleanRequiredText(input.updatedAt, "updatedAt"),
  };
}

function atomicNodeFromRow(row: PersonalConceptAtomicTransitionRpcRow, fallbackUserId: string): PersonalConceptNode | undefined {
  if (!row.id || !row.user_id || !row.exam_mode || !row.subject_id || !row.unit_id || !row.state || !row.confidence || !row.last_result || !row.last_task_type || !row.next_recommended_task_type || !row.next_due_at || !row.updated_at) {
    return undefined;
  }
  assertSupportedExamMode(row.exam_mode);
  assertSupportedState(row.state);
  return {
    id: row.id,
    userId: row.user_id || fallbackUserId,
    examMode: row.exam_mode,
    subjectId: row.subject_id,
    unitId: row.unit_id,
    state: row.state,
    confidence: row.confidence,
    lastResult: row.last_result,
    lastTaskType: row.last_task_type,
    wrongCount: row.wrong_count ?? 0,
    recoveryCount: row.recovery_count ?? 0,
    stableCount: row.stable_count ?? 0,
    nextRecommendedTaskType: row.next_recommended_task_type,
    nextDueAt: row.next_due_at,
    updatedAt: row.updated_at,
    metadataOnly: true,
  };
}

function atomicResultFromRow(row: PersonalConceptAtomicTransitionRpcRow, fallbackUserId: string): PersonalConceptAtomicTransitionResult {
  if (!ALLOWED_TRANSITION_STATUSES.has(row.status)) {
    throw new Error(`Personal Concept Graph atomic transition returned unsupported status: ${String(row.status)}`);
  }
  if (row.metadata_only !== true) {
    throw new Error("Personal Concept Graph atomic transition returned non-metadata result.");
  }
  const node = atomicNodeFromRow(row, fallbackUserId);
  return {
    status: row.status,
    reason: row.reason ?? undefined,
    node,
    previousState: row.previous_state ?? undefined,
    previousUpdatedAt: row.previous_updated_at ?? undefined,
    metadataOnly: true,
  };
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function buildPersonalConceptNodeSupabaseWritePayload(node: PersonalConceptNode): PersonalConceptNodeSupabaseWritePayload {
  assertMetadataOnlyNode(node);

  const payloadBase: Omit<PersonalConceptNodeRow, "id"> = {
    user_id: cleanRequiredText(node.userId, "userId"),
    exam_mode: node.examMode,
    subject_id: cleanRequiredText(node.subjectId, "subjectId"),
    unit_id: cleanRequiredText(node.unitId, "unitId"),
    state: node.state,
    confidence: node.confidence,
    last_result: node.lastResult,
    last_task_type: cleanRequiredText(node.lastTaskType, "lastTaskType"),
    wrong_count: node.wrongCount,
    recovery_count: node.recoveryCount,
    stable_count: node.stableCount,
    next_recommended_task_type: cleanRequiredText(node.nextRecommendedTaskType, "nextRecommendedTaskType"),
    next_due_at: cleanRequiredText(node.nextDueAt, "nextDueAt"),
    updated_at: cleanRequiredText(node.updatedAt, "updatedAt"),
    metadata_only: true,
    version: PERSONAL_CONCEPT_GRAPH_REPOSITORY_VERSION,
    source_status: PERSONAL_CONCEPT_GRAPH_SOURCE_STATUS,
  };
  return isUuid(node.id) ? { id: node.id, ...payloadBase } : payloadBase;
}

export function buildPersonalConceptNodeSupabasePayload(node: PersonalConceptNode): PersonalConceptNodeSupabaseWritePayload {
  return buildPersonalConceptNodeSupabaseWritePayload(node);
}

export async function getPersonalConceptNodeFromSupabase(userId: string, examMode: AppraiserExamMode, subjectId: string, unitId: string): Promise<PersonalConceptNode | null> {
  assertNoForbiddenFields({ userId, examMode, subjectId, unitId });
  assertSupportedExamMode(examMode);
  const client = await createPersonalConceptGraphSupabaseClient();
  const { data, error } = await client
    .from(PERSONAL_CONCEPT_NODES_TABLE)
    .select(PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS.join(","))
    .eq("user_id", cleanRequiredText(userId, "userId"))
    .eq("exam_mode", examMode)
    .eq("subject_id", cleanRequiredText(subjectId, "subjectId"))
    .eq("unit_id", cleanRequiredText(unitId, "unitId"))
    .maybeSingle();

  if (error) throw new Error(`personal-concept-node-select-failed:${error.message}`);
  return data ? fromRow(data as unknown as PersonalConceptNodeRow) : null;
}

export async function transitionPersonalConceptNodeInSupabase(input: PersonalConceptAtomicTransitionInput): Promise<PersonalConceptAtomicTransitionResult> {
  const params = buildPersonalConceptAtomicTransitionRpcParams(input);
  const client = await createPersonalConceptGraphSupabaseClient();
  const { data, error } = await client.rpc(PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC, params);

  if (error) throw new Error(`personal-concept-node-atomic-transition-failed:${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("personal-concept-node-atomic-transition-failed:empty-result");
  return atomicResultFromRow(row as unknown as PersonalConceptAtomicTransitionRpcRow, input.userId);
}

export async function listPersonalConceptNodesForTodayFromSupabase(userId: string, context: PersonalConceptGraphSupabaseContext = {}): Promise<PersonalConceptNode[]> {
  assertNoForbiddenFields({ userId, context });
  if (context.examMode && context.examMode !== "mixed") assertSupportedExamMode(context.examMode);
  const client = await createPersonalConceptGraphSupabaseClient();
  let query = client
    .from(PERSONAL_CONCEPT_NODES_TABLE)
    .select(PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS.join(","))
    .eq("user_id", cleanRequiredText(userId, "userId"));

  if (context.examMode && context.examMode !== "mixed") {
    query = query.eq("exam_mode", context.examMode);
  }

  const { data, error } = await query;
  if (error) throw new Error(`personal-concept-node-list-failed:${error.message}`);

  const candidates = (data ?? []).map((row) => fromRow(row as unknown as PersonalConceptNodeRow));
  const rankedIds = rankConceptGraphNodesForToday(candidates, context).map((entry) => entry.nodeId);
  const rankedSet = new Set(rankedIds);
  const rankedNodes = rankedIds
    .map((id) => candidates.find((node) => node.id === id))
    .filter((node): node is PersonalConceptNode => Boolean(node));
  const remainingNodes = candidates.filter((node) => !rankedSet.has(node.id)).sort((left, right) => left.id.localeCompare(right.id));

  return [...rankedNodes, ...remainingNodes];
}

export async function deletePersonalConceptNodeFromSupabase(userId: string, examMode: AppraiserExamMode, subjectId: string, unitId: string): Promise<void> {
  assertNoForbiddenFields({ userId, examMode, subjectId, unitId });
  assertSupportedExamMode(examMode);
  const client = await createPersonalConceptGraphSupabaseClient();
  const { error } = await client
    .from(PERSONAL_CONCEPT_NODES_TABLE)
    .delete()
    .eq("user_id", cleanRequiredText(userId, "userId"))
    .eq("exam_mode", examMode)
    .eq("subject_id", cleanRequiredText(subjectId, "subjectId"))
    .eq("unit_id", cleanRequiredText(unitId, "unitId"));

  if (error) throw new Error(`personal-concept-node-delete-failed:${error.message}`);
}
