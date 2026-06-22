import {
  buildConceptNodeCandidate,
  type ConceptNodeCandidate,
} from "./concept-node-mapping";
import {
  getCalculatorRoutineCompletionOutcome,
  getCalculatorRoutineEventOccurrence,
  type CalculatorRoutineLearningBridge,
} from "./calculator-routine-learning-signal";
import {
  maybeWriteExecutionSignalToConceptGraph,
  type ExecutionToConceptGraphDurableWriteContext,
} from "./execution-to-concept-graph-durable-write";
import type {
  PersonalConceptDueBucket,
  PersonalConceptGraphConfidence,
  PersonalConceptNode,
  PersonalConceptSignalInput,
  PersonalConceptState,
} from "./personal-concept-graph";
import type { LearningSignalEventRecord } from "./types";

export type CalculatorRoutineConceptStateProjection = {
  metadataOnly: true;
  userId: string;
  examMode: "second";
  subjectId: "감정평가실무";
  unitId: string;
  conceptNodeId: string;
  conceptFamily: "검산/CASIO";
  taskType: "calculator_routine";
  result: "done" | "wrong" | "unknown";
  confidence: PersonalConceptGraphConfidence;
  dueBucket: PersonalConceptDueBucket;
  updatedAt: string;
  sourceEventId: string;
  completionFingerprint: string;
};

export type CalculatorRoutineConceptStateWriteStatus =
  | "updated"
  | "already_applied"
  | "stale_signal"
  | "durable_writes_disabled";

export type CalculatorRoutineConceptStateWriteResult = {
  metadataOnly: true;
  status: CalculatorRoutineConceptStateWriteStatus;
  conceptNodeId: string;
  previousState?: PersonalConceptState;
  nextState?: PersonalConceptState;
};

const CALCULATOR_CONCEPT_SUBJECT = "감정평가실무" as const;
const CALCULATOR_CONCEPT_FAMILY = "검산/CASIO" as const;
const CALCULATOR_TASK_TYPE = "calculator_routine" as const;

function buildCanonicalCalculatorConceptCandidate(): ConceptNodeCandidate {
  return buildConceptNodeCandidate({
    mode: "second",
    subject: CALCULATOR_CONCEPT_SUBJECT,
    conceptFamily: CALCULATOR_CONCEPT_FAMILY,
  });
}

function mapCalculatorOutcomeToGraphSignal(
  outcome: ReturnType<typeof getCalculatorRoutineCompletionOutcome>,
): Pick<CalculatorRoutineConceptStateProjection, "result" | "confidence" | "dueBucket"> {
  if (outcome === "wrong") {
    return { result: "wrong", confidence: "medium", dueBucket: "tomorrow" };
  }
  if (outcome === "unknown") {
    return { result: "unknown", confidence: "low", dueBucket: "tomorrow" };
  }
  return { result: "done", confidence: "medium", dueBucket: "none" };
}

function stateOf(node?: Pick<PersonalConceptNode, "state"> | null) {
  return node?.state;
}

export function buildCalculatorRoutineConceptStateProjection(input: {
  userId: string;
  bridge: CalculatorRoutineLearningBridge;
  persistedEvent: LearningSignalEventRecord;
  now?: Date;
}): CalculatorRoutineConceptStateProjection {
  const candidate = buildCanonicalCalculatorConceptCandidate();
  const occurrence = getCalculatorRoutineEventOccurrence(input.persistedEvent, input.now ?? new Date());
  const outcome = getCalculatorRoutineCompletionOutcome(input.bridge.sanitizedSignal);
  const mapped = mapCalculatorOutcomeToGraphSignal(outcome);

  return {
    metadataOnly: true,
    userId: input.userId,
    examMode: "second",
    subjectId: CALCULATOR_CONCEPT_SUBJECT,
    unitId: candidate.conceptNodeId,
    conceptNodeId: candidate.conceptNodeId,
    conceptFamily: CALCULATOR_CONCEPT_FAMILY,
    taskType: CALCULATOR_TASK_TYPE,
    result: mapped.result,
    confidence: mapped.confidence,
    dueBucket: mapped.dueBucket,
    updatedAt: occurrence.iso,
    sourceEventId: input.persistedEvent.id,
    completionFingerprint: input.bridge.completionFingerprint,
  };
}

export function buildCalculatorRoutineConceptGraphSignal(
  projection: CalculatorRoutineConceptStateProjection,
): Omit<PersonalConceptSignalInput, "result" | "confidence"> & {
  metadataOnly: true;
  result: CalculatorRoutineConceptStateProjection["result"];
  confidence: PersonalConceptGraphConfidence;
} {
  return {
    metadataOnly: true,
    userId: projection.userId,
    examMode: projection.examMode,
    subjectId: projection.subjectId,
    unitId: projection.conceptNodeId,
    taskType: projection.taskType,
    result: projection.result,
    confidence: projection.confidence,
    dueBucket: projection.dueBucket,
    updatedAt: projection.updatedAt,
  };
}

export async function maybeUpdateCalculatorRoutineConceptState(input: {
  userId: string;
  bridge: CalculatorRoutineLearningBridge;
  persistedEvent: LearningSignalEventRecord;
  now?: Date;
  context?: ExecutionToConceptGraphDurableWriteContext;
}): Promise<CalculatorRoutineConceptStateWriteResult> {
  const projection = buildCalculatorRoutineConceptStateProjection(input);
  const writeResult = await maybeWriteExecutionSignalToConceptGraph(
    {
      ...buildCalculatorRoutineConceptGraphSignal(projection),
      executionSource: "calculator",
      derivedStatus: "needs_review",
      reviewDueHint: projection.dueBucket === "none" ? "none" : "tomorrow",
      prioritySignals: ["calculator_routine"],
      feedbackCopy: "계산·검산 루틴 완료 신호입니다.",
      nextRecommendedTaskType: CALCULATOR_TASK_TYPE,
    },
    {
      ...input.context,
      revisionPolicy: "monotonic_updated_at",
    },
  );

  if (writeResult.skipped) {
    const node = "node" in writeResult ? writeResult.node : null;
    return {
      metadataOnly: true,
      status: writeResult.reason,
      conceptNodeId: projection.conceptNodeId,
      previousState: stateOf(node),
      nextState: stateOf(node),
    };
  }

  return {
    metadataOnly: true,
    status: "updated",
    conceptNodeId: projection.conceptNodeId,
    previousState: writeResult.previousNode?.state,
    nextState: writeResult.node.state,
  };
}
