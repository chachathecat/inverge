import { rankConceptGraphNodesForToday, type PersonalConceptNode, type PersonalConceptState, type PersonalConceptTodayContext } from "./personal-concept-graph";
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

export const PERSONAL_CONCEPT_NODES_TABLE = "personal_concept_nodes";
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

export function buildPersonalConceptNodeSupabasePayload(node: PersonalConceptNode): PersonalConceptNodeRow {
  assertMetadataOnlyNode(node);

  return {
    id: cleanRequiredText(node.id, "id"),
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

export async function upsertPersonalConceptNodeToSupabase(node: PersonalConceptNode): Promise<PersonalConceptNode> {
  const payload = buildPersonalConceptNodeSupabasePayload(node);
  const client = await createPersonalConceptGraphSupabaseClient();
  const { data, error } = await client
    .from(PERSONAL_CONCEPT_NODES_TABLE)
    .upsert(payload, { onConflict: "user_id,exam_mode,subject_id,unit_id" })
    .select(PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS.join(","))
    .single();

  if (error) throw new Error(`personal-concept-node-upsert-failed:${error.message}`);
  return fromRow(data as unknown as PersonalConceptNodeRow);
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
