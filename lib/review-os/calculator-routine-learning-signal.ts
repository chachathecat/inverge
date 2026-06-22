import { createHash } from "node:crypto";

import {
  CALCULATOR_ROUTINE_MISTAKE_OPTIONS,
  CALCULATOR_ROUTINE_STEPS,
  CALCULATOR_ROUTINE_VERIFICATION_OPTIONS,
  sanitizeCalculatorRoutineCompletionSignal,
  type CalculatorRoutineCompletionSignalV1,
  type CalculatorRoutineMistakeType,
  type CalculatorRoutineStepId,
  type CalculatorRoutineVerificationMethod,
} from "./calculator-routine";
import {
  buildLearningSignalFromExecutionResult,
  buildNextPlanSignalFromExecution,
  type ExecutionLearningSignal,
  type ExecutionLearningSignalResult,
  type ExecutionReviewDueHint,
} from "./execution-learning-signal";
import { buildReviewQueueItemFromExecutionSignal, type ReviewQueueItem } from "./execution-review-queue";
import type { LearningSignalEventInput, LearningSignalEventRecord } from "./types";

export type CalculatorRoutineLearningRecordStatus = "saved" | "deduped";
export type CalculatorRoutineSyncStatus = CalculatorRoutineLearningRecordStatus | "local_only" | "failed";
export type CalculatorRoutineCompletionOutcome = "done" | "wrong" | "unknown";

export type CalculatorRoutineLearningBridge = {
  sanitizedSignal: CalculatorRoutineCompletionSignalV1;
  executionSignal: ExecutionLearningSignal;
  learningEventId: string;
  learningEventInput: LearningSignalEventInput;
  reviewQueueItem: ReviewQueueItem | null;
  todayPlanCandidateCreated: boolean;
  reviewCandidateCreated: boolean;
  cleanCompletion: boolean;
};

export type CalculatorRoutineReviewCandidate = {
  metadataOnly: true;
  id: string;
  routineId: string;
  sourceEventId: string;
  subject: "감정평가실무";
  title: "계산·검산 복습 후보";
  nextAction: "계산·검산 다시 하기";
  sourceLabel: "계산·검산 루틴 기반";
  dueHint: ExecutionReviewDueHint;
  createdAt: string;
  prioritySignals: string[];
  primaryMistakeType?: CalculatorRoutineMistakeType;
  stuckStepIds: CalculatorRoutineStepId[];
};

const EXPECTED_COMPLETED_STEP_IDS = CALCULATOR_ROUTINE_STEPS.map((step) => step.id);
const STEP_ID_SET = new Set<string>(EXPECTED_COMPLETED_STEP_IDS);
const MISTAKE_TYPE_SET = new Set<string>(CALCULATOR_ROUTINE_MISTAKE_OPTIONS.map((option) => option.id));
const VERIFICATION_METHOD_SET = new Set<string>(CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.map((option) => option.id));
const MAX_SAFE_ARRAY_LENGTH = 16;
const SOURCE_TYPES = new Set(["problem-snap", "answer-review"]);
const STRICT_RAW_FIELD_PATTERN =
  /^(entries|draft|raw.*|.*raw.*|ocr.*|.*ocr.*|problem.*text|question.*text|answer.*text|user.*answer|official.*answer|reference.*answer|formula|formulas|numbers|units|casio|display|verificationMemo|mistakeMemo|sourceText|original.*|full.*)$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectRawFields(value: unknown, path = "signal") {
  if (!isRecord(value) && !Array.isArray(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectRawFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (STRICT_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`calculator-routine-raw-field-rejected:${path}.${key}`);
    }
    rejectRawFields(nested, `${path}.${key}`);
  }
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`calculator-routine-invalid-${field}`);
  }
  return value.trim();
}

function requireIsoString(value: unknown, field: string) {
  const cleaned = requireString(value, field);
  if (!Number.isFinite(Date.parse(cleaned))) throw new Error(`calculator-routine-invalid-${field}`);
  return cleaned;
}

function normalizeStringArray<T extends string>(values: unknown, allowed: Set<string>, field: string): T[] {
  if (!Array.isArray(values)) throw new Error(`calculator-routine-invalid-${field}`);
  if (values.length > MAX_SAFE_ARRAY_LENGTH) throw new Error(`calculator-routine-too-many-${field}`);
  const next: T[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !allowed.has(value)) throw new Error(`calculator-routine-invalid-${field}`);
    if (!next.includes(value as T)) next.push(value as T);
  }
  return next;
}

function requireCompletedStepIds(values: unknown): CalculatorRoutineStepId[] {
  const normalized = normalizeStringArray<CalculatorRoutineStepId>(values, STEP_ID_SET, "completed-step-ids");
  if (normalized.length !== EXPECTED_COMPLETED_STEP_IDS.length) {
    throw new Error("calculator-routine-incomplete");
  }
  for (const stepId of EXPECTED_COMPLETED_STEP_IDS) {
    if (!normalized.includes(stepId)) throw new Error("calculator-routine-incomplete");
  }
  return normalized;
}

function normalizeOptionalStepIds(values: unknown, field: string): CalculatorRoutineStepId[] {
  if (values === undefined) return [];
  return normalizeStringArray<CalculatorRoutineStepId>(values, STEP_ID_SET, field);
}

function normalizeMistakeTypes(values: unknown): CalculatorRoutineMistakeType[] {
  const normalized = normalizeStringArray<CalculatorRoutineMistakeType>(values, MISTAKE_TYPE_SET, "mistake-types");
  if (normalized.length === 0) throw new Error("calculator-routine-missing-mistake-type");
  if (normalized.includes("none") && normalized.length > 1) throw new Error("calculator-routine-invalid-mistake-types");
  return normalized;
}

function normalizeVerificationMethods(values: unknown): CalculatorRoutineVerificationMethod[] {
  const normalized = normalizeStringArray<CalculatorRoutineVerificationMethod>(values, VERIFICATION_METHOD_SET, "verification-methods");
  if (normalized.length === 0) throw new Error("calculator-routine-missing-verification-method");
  return normalized;
}

function metadataValue(value: unknown, key: string) {
  return isRecord(value) ? value[key] : undefined;
}

export function parseCalculatorRoutineCompletionSignalForServer(input: unknown): CalculatorRoutineCompletionSignalV1 {
  rejectRawFields(input);
  if (!isRecord(input)) throw new Error("calculator-routine-invalid-payload");
  if (input.metadataOnly !== true) throw new Error("calculator-routine-metadata-only-required");
  if (input.version !== 1) throw new Error("calculator-routine-invalid-version");
  if (input.routineType !== "calculator_routine") throw new Error("calculator-routine-invalid-type");
  if (!SOURCE_TYPES.has(String(input.source))) throw new Error("calculator-routine-invalid-source");
  if (input.examMode !== "second" || input.subject !== "감정평가실무") {
    throw new Error("calculator-routine-unsupported-context");
  }
  if (input.sourceStatus !== "draft" || input.needsOfficialVerification !== true) {
    throw new Error("calculator-routine-invalid-source-status");
  }

  const routineId = requireString(input.routineId, "routine-id");
  if (routineId.length > 160) throw new Error("calculator-routine-invalid-routine-id");
  const completedStepIds = requireCompletedStepIds(input.completedStepIds);
  const stuckStepIds = normalizeOptionalStepIds(input.stuckStepIds, "stuck-step-ids");
  const hintUsedStepIds = normalizeOptionalStepIds(input.hintUsedStepIds, "hint-used-step-ids");
  const mistakeTypes = normalizeMistakeTypes(input.mistakeTypes);
  const primaryMistakeType = requireString(input.primaryMistakeType, "primary-mistake-type") as CalculatorRoutineMistakeType;
  if (!mistakeTypes.includes(primaryMistakeType)) throw new Error("calculator-routine-invalid-primary-mistake-type");
  const verificationMethods = normalizeVerificationMethods(input.verificationMethods);
  const startedAt = requireIsoString(input.startedAt, "started-at");
  const completedAt = requireIsoString(input.completedAt, "completed-at");

  const routineConceptCandidate = metadataValue(input.routineConceptCandidate, "metadataOnly") === true
    ? input.routineConceptCandidate
    : {};

  return sanitizeCalculatorRoutineCompletionSignal({
    metadataOnly: true,
    version: 1,
    routineType: "calculator_routine",
    source: input.source === "answer-review" ? "answer-review" : "problem-snap",
    examMode: "second",
    subject: "감정평가실무",
    routineId,
    routineConceptCandidate: routineConceptCandidate as CalculatorRoutineCompletionSignalV1["routineConceptCandidate"],
    relatedConceptNodeId: typeof input.relatedConceptNodeId === "string" ? input.relatedConceptNodeId : undefined,
    completedStepIds,
    stuckStepIds,
    mistakeTypes,
    primaryMistakeType,
    verificationMethods,
    hintUsedStepIds,
    startedAt,
    completedAt,
    sourceStatus: "draft",
    needsOfficialVerification: true,
  });
}

export function buildCalculatorRoutineLearningEventId(userId: string, routineId: string) {
  const digest = createHash("sha256")
    .update(`${userId}:calculator-routine:${routineId}`)
    .digest("hex");
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `5${digest.slice(13, 16)}`,
    ((parseInt(digest.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0") + digest.slice(18, 20),
    digest.slice(20, 32),
  ].join("-");
}

export function getCalculatorRoutineCompletionOutcome(signal: Pick<CalculatorRoutineCompletionSignalV1, "mistakeTypes" | "stuckStepIds">): CalculatorRoutineCompletionOutcome {
  const explicitMistakes = signal.mistakeTypes.filter((mistakeType) => mistakeType !== "none");
  if (explicitMistakes.length > 0) return "wrong";
  if (signal.stuckStepIds.length > 0) return "unknown";
  return "done";
}

function toExecutionResult(outcome: CalculatorRoutineCompletionOutcome): ExecutionLearningSignalResult {
  if (outcome === "done") return "done";
  if (outcome === "wrong") return "wrong";
  return "unknown";
}

function resolveDueHint(signal: CalculatorRoutineCompletionSignalV1, outcome: CalculatorRoutineCompletionOutcome): ExecutionReviewDueHint {
  if (outcome === "done") return "none";
  if (signal.mistakeTypes.includes("verification_skipped") || signal.stuckStepIds.includes("verification")) return "soon";
  return outcome === "wrong" ? "tomorrow" : "three_days";
}

function buildPrioritySignals(signal: CalculatorRoutineCompletionSignalV1, outcome: CalculatorRoutineCompletionOutcome) {
  const signals = new Set<string>([
    "calculator_routine",
    `calculator_routine_result:${outcome}`,
    `source:${signal.source}`,
  ]);
  if (outcome !== "done") {
    signals.add("review_candidate");
    signals.add("calculator_recovery");
  }
  if (signal.stuckStepIds.length > 0) signals.add("calculator_stuck_step");
  if (signal.stuckStepIds.includes("verification") || signal.mistakeTypes.includes("verification_skipped")) {
    signals.add("calculator_verification_gap");
  }
  if (signal.mistakeTypes.some((mistakeType) => mistakeType === "unit_conversion" || mistakeType === "rounding")) {
    signals.add("calculator_unit_rounding_gap");
  }
  if (signal.mistakeTypes.some((mistakeType) => mistakeType === "casio_input" || mistakeType === "display_reading" || mistakeType === "answer_transfer")) {
    signals.add("calculator_recovery");
  }
  for (const mistakeType of signal.mistakeTypes) signals.add(`mistake:${mistakeType}`);
  for (const stepId of signal.stuckStepIds) signals.add(`stuck:${stepId}`);
  return [...signals];
}

export function buildCalculatorRoutineBridge(userId: string, input: unknown): CalculatorRoutineLearningBridge {
  const sanitizedSignal = parseCalculatorRoutineCompletionSignalForServer(input);
  const outcome = getCalculatorRoutineCompletionOutcome(sanitizedSignal);
  const executionSignal = buildLearningSignalFromExecutionResult({
    examMode: "second",
    taskType: "calculator_routine",
    subjectId: "감정평가실무",
    subjectName: "감정평가실무",
    unitId: "calculator_routine",
    unitName: "검산/CASIO",
    executionSource: "calculator",
    result: toExecutionResult(outcome),
    confidence: outcome === "done" ? "high" : "unknown",
    timeSpentMinutes: 10,
  });
  const prioritySignals = buildPrioritySignals(sanitizedSignal, outcome);
  const dueHint = resolveDueHint(sanitizedSignal, outcome);
  const bridgedExecutionSignal: ExecutionLearningSignal = {
    ...executionSignal,
    reviewDueHint: dueHint,
    nextRecommendedTaskType: outcome === "done" ? undefined : "calculator_routine",
    prioritySignals,
    feedbackCopy: outcome === "done"
      ? "계산·검산 루틴 완료 기록을 남겼습니다."
      : "계산·검산 루틴에서 복구할 신호를 남겼습니다. 다음에는 입력 순서와 단위를 짧게 다시 확인합니다.",
  };
  const reviewQueueItem = outcome === "done" ? null : buildReviewQueueItemFromExecutionSignal(bridgedExecutionSignal);
  const learningEventId = buildCalculatorRoutineLearningEventId(userId, sanitizedSignal.routineId);
  const nextTaskType = outcome === "done" ? "calculator_routine_complete" : "calculator_routine";
  const learningEventInput: LearningSignalEventInput = {
    examMode: "감정평가사 2차",
    subject: "감정평가실무",
    sourceType: "calculator-routine",
    derivedTags: prioritySignals,
    relatedFormulas: [],
    nextTaskType,
    nextTask: outcome === "done" ? "계산·검산 완료 기록 유지" : "계산·검산 다시 하기",
    metadataJson: {
      metadataOnly: true,
      bridgeVersion: "calculator_routine_learning_signal_v1",
      routineType: "calculator_routine",
      routineId: sanitizedSignal.routineId,
      source: sanitizedSignal.source,
      result: outcome,
      executionResult: bridgedExecutionSignal.result,
      reviewDueHint: dueHint,
      primaryMistakeType: sanitizedSignal.primaryMistakeType,
      mistakeTypes: sanitizedSignal.mistakeTypes,
      verificationMethods: sanitizedSignal.verificationMethods,
      completedStepIds: sanitizedSignal.completedStepIds,
      stuckStepIds: sanitizedSignal.stuckStepIds,
      hintUsedStepIds: sanitizedSignal.hintUsedStepIds,
      conceptNodeId: sanitizedSignal.relatedConceptNodeId ?? sanitizedSignal.routineConceptCandidate.conceptNodeId,
      conceptFamily: sanitizedSignal.routineConceptCandidate.conceptFamily,
      conceptNextTaskType: sanitizedSignal.routineConceptCandidate.nextTaskType,
      sourceStatus: sanitizedSignal.sourceStatus,
      needsOfficialVerification: sanitizedSignal.needsOfficialVerification,
      startedAt: sanitizedSignal.startedAt,
      completedAt: sanitizedSignal.completedAt,
      todayPlanCandidateCreated: outcome !== "done",
      reviewCandidateCreated: outcome !== "done",
      nextTaskType,
    },
  };

  return {
    sanitizedSignal,
    executionSignal: bridgedExecutionSignal,
    learningEventId,
    learningEventInput,
    reviewQueueItem,
    todayPlanCandidateCreated: outcome !== "done",
    reviewCandidateCreated: outcome !== "done",
    cleanCompletion: outcome === "done",
  };
}

function getMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function getMetadataStringArray(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isCalculatorRoutineSignalEvent(event: LearningSignalEventRecord) {
  return event.examMode === "감정평가사 2차"
    && event.subject === "감정평가실무"
    && event.sourceType === "calculator-routine"
    && getMetadataString(event.metadataJson ?? {}, "bridgeVersion") === "calculator_routine_learning_signal_v1";
}

export function buildActiveCalculatorRoutineReviewCandidates(
  events: LearningSignalEventRecord[],
  now = new Date(),
  limit = 3,
): CalculatorRoutineReviewCandidate[] {
  const cutoff = now.getTime() - 7 * 86_400_000;
  const calculatorEvents = events
    .filter(isCalculatorRoutineSignalEvent)
    .filter((event) => {
      const createdTs = Date.parse(event.createdAt);
      return Number.isFinite(createdTs) && createdTs >= cutoff && createdTs <= now.getTime();
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  const newestCleanTs = calculatorEvents
    .filter((event) => getMetadataString(event.metadataJson ?? {}, "result") === "done")
    .map((event) => Date.parse(event.createdAt))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0] ?? null;

  const seenRoutineIds = new Set<string>();
  const candidates: CalculatorRoutineReviewCandidate[] = [];
  for (const event of calculatorEvents) {
    const metadata = event.metadataJson ?? {};
    const result = getMetadataString(metadata, "result");
    if (result === "done") continue;
    const createdTs = Date.parse(event.createdAt);
    if (newestCleanTs !== null && createdTs < newestCleanTs) continue;
    const routineId = getMetadataString(metadata, "routineId") || event.id;
    if (seenRoutineIds.has(routineId)) continue;
    seenRoutineIds.add(routineId);
    candidates.push({
      metadataOnly: true,
      id: `calculator-routine-review-${event.id}`,
      routineId,
      sourceEventId: event.id,
      subject: "감정평가실무",
      title: "계산·검산 복습 후보",
      nextAction: "계산·검산 다시 하기",
      sourceLabel: "계산·검산 루틴 기반",
      dueHint: getMetadataString(metadata, "reviewDueHint") as ExecutionReviewDueHint || "tomorrow",
      createdAt: event.createdAt,
      prioritySignals: event.derivedTags,
      primaryMistakeType: getMetadataString(metadata, "primaryMistakeType") as CalculatorRoutineMistakeType || undefined,
      stuckStepIds: getMetadataStringArray(metadata, "stuckStepIds") as CalculatorRoutineStepId[],
    });
    if (candidates.length >= limit) break;
  }
  return candidates;
}

export function buildCalculatorRoutineNextPlanSignal(input: CalculatorRoutineLearningBridge) {
  return buildNextPlanSignalFromExecution(input.executionSignal);
}
