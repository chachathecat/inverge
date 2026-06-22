import { arePersonalConceptGraphDurableWritesEnabled } from "./personal-concept-graph-feature-flags";
import { getPersonalConceptGraphRepositoryAdapter, type PersonalConceptGraphRepositoryAdapter } from "./personal-concept-graph-repository-adapter";
import {
  buildConceptGraphUpdateFromExecutionSignal,
  updatePersonalConceptNode,
  type ConceptGraphExecutionSignalLike,
  type PersonalConceptNode,
  type PersonalConceptSignalInput,
} from "./personal-concept-graph";

export type ExecutionToConceptGraphDurableWriteContext = {
  env?: NodeJS.ProcessEnv;
  repositoryAdapter?: Pick<PersonalConceptGraphRepositoryAdapter, "mode" | "getPersonalConceptNode" | "upsertPersonalConceptNode">;
  revisionPolicy?: "default" | "monotonic_updated_at";
};

export type ExecutionToConceptGraphDurableWriteSkipped = {
  ok: true;
  skipped: true;
  reason: "durable_writes_disabled";
};

export type ExecutionToConceptGraphDurableWriteMonotonicSkipped = {
  ok: true;
  skipped: true;
  reason: "already_applied" | "stale_signal";
  repositoryMode: "supabase";
  node: Pick<
    PersonalConceptNode,
    | "id"
    | "userId"
    | "examMode"
    | "subjectId"
    | "unitId"
    | "state"
    | "confidence"
    | "lastResult"
    | "lastTaskType"
    | "wrongCount"
    | "recoveryCount"
    | "stableCount"
    | "nextRecommendedTaskType"
    | "nextDueAt"
    | "updatedAt"
    | "metadataOnly"
  >;
  metadataOnly: true;
};

export type ExecutionToConceptGraphDurableWriteWritten = {
  ok: true;
  skipped: false;
  repositoryMode: "supabase";
  previousNode: Pick<PersonalConceptNode, "state" | "updatedAt" | "metadataOnly"> | null;
  node: Pick<
    PersonalConceptNode,
    | "id"
    | "userId"
    | "examMode"
    | "subjectId"
    | "unitId"
    | "state"
    | "confidence"
    | "lastResult"
    | "lastTaskType"
    | "wrongCount"
    | "recoveryCount"
    | "stableCount"
    | "nextRecommendedTaskType"
    | "nextDueAt"
    | "updatedAt"
    | "metadataOnly"
  >;
  metadataOnly: true;
};

export type ExecutionToConceptGraphDurableWriteResult =
  | ExecutionToConceptGraphDurableWriteSkipped
  | ExecutionToConceptGraphDurableWriteMonotonicSkipped
  | ExecutionToConceptGraphDurableWriteWritten;

const FORBIDDEN_DURABLE_SIGNAL_FIELD_NAMES = new Set([
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

const FORBIDDEN_DURABLE_SIGNAL_FIELD_PATTERN =
  /(raw|ocr|answerText|problemText|questionText|copyright|originalText|fullText|sourceText|officialAnswer|modelAnswer|scorePrediction|instructorComment)/i;

const ALLOWED_NODE_STATES = new Set(["unknown", "confused", "wrong", "recovering", "stable"]);

function assertNoForbiddenDurableFields(value: unknown, path = "signal"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenDurableFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_DURABLE_SIGNAL_FIELD_NAMES.has(key) || FORBIDDEN_DURABLE_SIGNAL_FIELD_PATTERN.test(key)) {
      throw new Error(`Forbidden raw/copyrighted learner text field is not accepted by durable Personal Concept Graph writes: ${path}.${key}`);
    }
    assertNoForbiddenDurableFields(nested, `${path}.${key}`);
  }
}

function assertSupportedExamMode(examMode: unknown): asserts examMode is "first" | "second" {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Durable Personal Concept Graph writes support only 감정평가사 1차/2차 examMode: ${String(examMode)}`);
  }
}

function assertSupportedNodeState(state: PersonalConceptNode["state"]): void {
  if (!ALLOWED_NODE_STATES.has(state)) {
    throw new Error(`Durable Personal Concept Graph write produced unsupported state: ${String(state)}`);
  }
}

function cleanRequiredText(value: string | undefined, fieldName: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`Durable Personal Concept Graph write requires ${fieldName}`);
  return cleaned;
}

function sanitizeExecutionSignal(signal: ConceptGraphExecutionSignalLike): ConceptGraphExecutionSignalLike {
  assertNoForbiddenDurableFields(signal);
  assertSupportedExamMode(signal.examMode);

  return {
    learnerId: signal.learnerId,
    userId: signal.userId,
    examMode: signal.examMode,
    subjectId: signal.subjectId,
    unitId: signal.unitId,
    taskType: signal.taskType,
    result: signal.result,
    confidence: signal.confidence,
    executionSource: signal.executionSource,
    derivedStatus: signal.derivedStatus,
    reviewDueHint: signal.reviewDueHint,
    prioritySignals: Array.isArray(signal.prioritySignals) ? [...signal.prioritySignals] : [],
    feedbackCopy: signal.feedbackCopy,
    nextRecommendedTaskType: signal.nextRecommendedTaskType,
    dueBucket: signal.dueBucket,
    recentMissCount: signal.recentMissCount,
    updatedAt: signal.updatedAt,
  };
}

function sanitizeUpdate(update: PersonalConceptSignalInput): PersonalConceptSignalInput & { userId: string } {
  assertNoForbiddenDurableFields(update);
  assertSupportedExamMode(update.examMode);
  return {
    learnerId: update.learnerId,
    userId: cleanRequiredText(update.userId ?? update.learnerId, "userId or learnerId"),
    examMode: update.examMode,
    subjectId: cleanRequiredText(update.subjectId, "subjectId"),
    unitId: cleanRequiredText(update.unitId, "unitId"),
    taskType: cleanRequiredText(update.taskType, "taskType"),
    result: update.result,
    confidence: update.confidence,
    dueBucket: update.dueBucket,
    recentMissCount: update.recentMissCount,
    updatedAt: cleanRequiredText(update.updatedAt, "updatedAt"),
  };
}

function metadataOnlyNode(node: PersonalConceptNode): ExecutionToConceptGraphDurableWriteWritten["node"] {
  assertNoForbiddenDurableFields(node);
  assertSupportedExamMode(node.examMode);
  assertSupportedNodeState(node.state);
  if (node.metadataOnly !== true) throw new Error("Durable Personal Concept Graph write returned a non-metadataOnly node.");

  return {
    id: node.id,
    userId: node.userId,
    examMode: node.examMode,
    subjectId: node.subjectId,
    unitId: node.unitId,
    state: node.state,
    confidence: node.confidence,
    lastResult: node.lastResult,
    lastTaskType: node.lastTaskType,
    wrongCount: node.wrongCount,
    recoveryCount: node.recoveryCount,
    stableCount: node.stableCount,
    nextRecommendedTaskType: node.nextRecommendedTaskType,
    nextDueAt: node.nextDueAt,
    updatedAt: node.updatedAt,
    metadataOnly: true,
  };
}

function metadataOnlyResult(
  node: PersonalConceptNode,
  previousNode: PersonalConceptNode | null,
): ExecutionToConceptGraphDurableWriteWritten {
  return {
    ok: true,
    skipped: false,
    repositoryMode: "supabase",
    previousNode: previousNode ? {
      state: previousNode.state,
      updatedAt: previousNode.updatedAt,
      metadataOnly: true,
    } : null,
    node: metadataOnlyNode(node),
    metadataOnly: true,
  };
}

function metadataOnlyMonotonicSkipped(
  reason: ExecutionToConceptGraphDurableWriteMonotonicSkipped["reason"],
  node: PersonalConceptNode,
): ExecutionToConceptGraphDurableWriteMonotonicSkipped {
  return {
    ok: true,
    skipped: true,
    reason,
    repositoryMode: "supabase",
    node: metadataOnlyNode(node),
    metadataOnly: true,
  };
}

function compareRevision(previous: PersonalConceptNode | null, update: PersonalConceptSignalInput & { userId: string }) {
  if (!previous) return "newer";
  const incomingTs = Date.parse(update.updatedAt);
  const previousTs = Date.parse(previous.updatedAt);
  if (!Number.isFinite(incomingTs)) throw new Error(`Invalid updatedAt for durable Personal Concept Graph write: ${update.updatedAt}`);
  if (!Number.isFinite(previousTs)) return "newer";
  if (incomingTs < previousTs) return "older";
  if (incomingTs === previousTs) return "equal";
  return "newer";
}

export async function maybeWriteExecutionSignalToConceptGraph(
  signal: ConceptGraphExecutionSignalLike,
  context: ExecutionToConceptGraphDurableWriteContext = {},
): Promise<ExecutionToConceptGraphDurableWriteResult> {
  const safeSignal = sanitizeExecutionSignal(signal);
  const env = context.env ?? process.env;

  if (!arePersonalConceptGraphDurableWritesEnabled(env)) {
    return { ok: true, skipped: true, reason: "durable_writes_disabled" };
  }

  const repository = context.repositoryAdapter ?? getPersonalConceptGraphRepositoryAdapter(env);
  if (repository.mode !== "supabase") {
    return { ok: true, skipped: true, reason: "durable_writes_disabled" };
  }

  const update = sanitizeUpdate(buildConceptGraphUpdateFromExecutionSignal(safeSignal));
  const previous = await repository.getPersonalConceptNode(update.userId, update.examMode, update.subjectId, update.unitId);
  if (context.revisionPolicy === "monotonic_updated_at") {
    const revision = compareRevision(previous, update);
    if (previous && revision === "older") return metadataOnlyMonotonicSkipped("stale_signal", previous);
    if (previous && revision === "equal") return metadataOnlyMonotonicSkipped("already_applied", previous);
  }
  const nextNode = updatePersonalConceptNode(previous, update);
  const written = await repository.upsertPersonalConceptNode(nextNode);

  return metadataOnlyResult(written, previous);
}
