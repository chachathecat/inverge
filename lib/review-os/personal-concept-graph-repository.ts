import { type AppraiserExamMode } from "./curriculum-reference";
import {
  buildConceptGraphUpdateFromExecutionSignal,
  rankConceptGraphNodesForToday,
  updatePersonalConceptNode,
  type ConceptGraphExecutionSignalLike,
  type PersonalConceptNode,
  type PersonalConceptTodayContext,
} from "./personal-concept-graph";

export type PersonalConceptGraphRepositoryContext = PersonalConceptTodayContext & {
  examMode?: AppraiserExamMode | "mixed";
};

type StoredPersonalConceptNode = PersonalConceptNode;

const PERSISTENCE_NOTE =
  "Personal Concept Graph repository uses an in-memory/test adapter in this PR; production durable persistence is pending an explicit review-os schema.";

const ALLOWED_STORED_FIELDS = new Set([
  "id",
  "userId",
  "examMode",
  "subjectId",
  "unitId",
  "state",
  "confidence",
  "lastResult",
  "lastTaskType",
  "wrongCount",
  "recoveryCount",
  "stableCount",
  "nextRecommendedTaskType",
  "nextDueAt",
  "updatedAt",
  "metadataOnly",
]);

const FORBIDDEN_RAW_FIELD_PATTERN = /(raw|ocr|answer|problem|question|copyright|fulltext|sourceText|userText|originalText)/i;
const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawOcrText",
  "rawUserText",
  "rawAnswerText",
  "problemText",
  "questionText",
  "answerText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
]);

const store = new Map<string, StoredPersonalConceptNode>();

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Personal Concept Graph repository supports only 감정평가사 1차/2차 examMode: ${String(examMode)}`);
  }
}

function cleanRequiredText(value: string | undefined, fieldName: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`Personal Concept Graph repository requires ${fieldName}`);
  return cleaned;
}

function assertNoRawFields(value: unknown, path = "input"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw text field is not accepted by Personal Concept Graph repository: ${path}.${key}`);
    }
    assertNoRawFields(nested, `${path}.${key}`);
  }
}

function assertMetadataOnlyNode(node: PersonalConceptNode): void {
  assertNoRawFields(node);
  assertSupportedExamMode(node.examMode);
  if (node.metadataOnly !== true) throw new Error("Personal Concept Graph node must be metadataOnly.");
  for (const key of Object.keys(node)) {
    if (!ALLOWED_STORED_FIELDS.has(key)) {
      throw new Error(`Personal Concept Graph repository stores metadata-only fields only: ${key}`);
    }
  }
}

function nodeKey(userId: string, examMode: AppraiserExamMode, subjectId: string, unitId: string) {
  return [userId, examMode, subjectId, unitId].join("|");
}

function cloneNode(node: StoredPersonalConceptNode): PersonalConceptNode {
  return { ...node };
}

export function getPersonalConceptGraphPersistenceNote() {
  return PERSISTENCE_NOTE;
}

export function resetPersonalConceptGraphRepositoryForTests() {
  store.clear();
}

export function getPersonalConceptNode(userId: string, examMode: AppraiserExamMode, subjectId: string, unitId: string): PersonalConceptNode | null {
  assertNoRawFields({ userId, examMode, subjectId, unitId });
  assertSupportedExamMode(examMode);
  const key = nodeKey(cleanRequiredText(userId, "userId"), examMode, cleanRequiredText(subjectId, "subjectId"), cleanRequiredText(unitId, "unitId"));
  const node = store.get(key);
  return node ? cloneNode(node) : null;
}

export function upsertPersonalConceptNode(node: PersonalConceptNode): PersonalConceptNode {
  assertMetadataOnlyNode(node);
  const userId = cleanRequiredText(node.userId, "userId");
  const subjectId = cleanRequiredText(node.subjectId, "subjectId");
  const unitId = cleanRequiredText(node.unitId, "unitId");
  const key = nodeKey(userId, node.examMode, subjectId, unitId);
  const stored: StoredPersonalConceptNode = { ...node, userId, subjectId, unitId, metadataOnly: true };
  store.set(key, stored);
  return cloneNode(stored);
}

export function listPersonalConceptNodesForToday(userId: string, context: PersonalConceptGraphRepositoryContext = {}): PersonalConceptNode[] {
  assertNoRawFields({ userId, context });
  const cleanedUserId = cleanRequiredText(userId, "userId");
  if (context.examMode && context.examMode !== "mixed") assertSupportedExamMode(context.examMode);

  const candidates = [...store.values()]
    .filter((node) => node.userId === cleanedUserId)
    .filter((node) => context.examMode === undefined || context.examMode === "mixed" || node.examMode === context.examMode);

  const rankedIds = rankConceptGraphNodesForToday(candidates, context).map((entry) => entry.nodeId);
  const rankedSet = new Set(rankedIds);
  const rankedNodes = rankedIds
    .map((id) => candidates.find((node) => node.id === id))
    .filter((node): node is StoredPersonalConceptNode => Boolean(node));
  const remainingNodes = candidates.filter((node) => !rankedSet.has(node.id)).sort((left, right) => left.id.localeCompare(right.id));

  return [...rankedNodes, ...remainingNodes].map(cloneNode);
}

export function applyExecutionSignalToPersonalConceptGraph(signal: ConceptGraphExecutionSignalLike): PersonalConceptNode {
  assertNoRawFields(signal);
  const update = buildConceptGraphUpdateFromExecutionSignal(signal);
  const userId = cleanRequiredText(update.userId ?? update.learnerId, "userId or learnerId");
  const previous = getPersonalConceptNode(userId, update.examMode, update.subjectId, update.unitId);
  return upsertPersonalConceptNode(updatePersonalConceptNode(previous, { ...update, userId }));
}
