import { assertNoRawUserDataInDerived } from "./data-boundary";
import type { AppraiserExamMode } from "./curriculum-reference";

export type PersonalLearningStatus = "unknown" | "confused" | "wrong" | "confident_wrong" | "recovering" | "stable";
export type PersonalLearningResultType = "captured" | "wrong" | "correct" | "skipped" | "reviewed" | "rewritten" | "ocr_confirmed";
export type PersonalLearningConfidence = "unknown" | "low" | "medium" | "high" | string;
export type PersonalLearningSourceEventType = "capture" | "review" | "session";

export type PersonalLearningStateTransitionInput = {
  userId: string;
  conceptNodeId: string;
  examMode: AppraiserExamMode | string;
  subject: string;
  taskType: string;
  resultType: PersonalLearningResultType;
  confidence?: PersonalLearningConfidence;
  wasCorrect?: boolean;
  isRepeatMistake?: boolean;
  isLowConfidence?: boolean;
  previousStatus?: PersonalLearningStatus;
  lastSeenAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  sourceEventType?: PersonalLearningSourceEventType;
  correctStreak?: number;
  previousCorrectStreak?: number;
  weakStructure?: boolean;
  ocrConfirmationPending?: boolean;
  completedAt?: string | Date | null;
  now?: string | Date;
};

export type PersonalLearningStateTransition = {
  metadataOnly: true;
  userId: string;
  conceptNodeId: string;
  examMode: AppraiserExamMode;
  subject: string;
  previousStatus: PersonalLearningStatus;
  nextStatus: PersonalLearningStatus;
  reason: string;
  confidenceDelta: number;
  priorityDelta: number;
  nextReviewPattern: string;
  nextReviewAtCandidate: string;
  sourceEventType: PersonalLearningSourceEventType;
  safeSummary: string;
};

export type PersonalLearningStateSnapshot = {
  metadataOnly?: true;
  userId: string;
  conceptNodeId: string;
  examMode: AppraiserExamMode | string;
  subject: string;
  status?: PersonalLearningStatus;
  confidence?: PersonalLearningConfidence;
  priority?: number;
  lastSeenAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  correctStreak?: number;
};

const SUPPORTED_EXAM_MODES = new Set(["first", "second"]);
const STATUS_RISK: Record<PersonalLearningStatus, number> = {
  confident_wrong: 100,
  wrong: 88,
  confused: 72,
  recovering: 50,
  unknown: 45,
  stable: 15,
};

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (!SUPPORTED_EXAM_MODES.has(String(examMode))) throw new Error(`unsupported-personal-learning-state-exam-mode:${String(examMode)}`);
}

function normalizeStatus(value: unknown): PersonalLearningStatus {
  if (value === "confused" || value === "wrong" || value === "confident_wrong" || value === "recovering" || value === "stable") return value;
  return "unknown";
}

function normalizeConfidence(value: unknown): "unknown" | "low" | "medium" | "high" {
  if (value === "낮음" || value === "low") return "low";
  if (value === "중간" || value === "medium") return "medium";
  if (value === "높음" || value === "high") return "high";
  return "unknown";
}

function toIso(value: string | Date | null | undefined, fallback: Date) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const ts = Date.parse(value);
    if (Number.isFinite(ts)) return new Date(ts).toISOString();
  }
  return fallback.toISOString();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function reviewPatternFor(status: PersonalLearningStatus, resultType: PersonalLearningResultType, ocrPending: boolean) {
  if (ocrPending) return "ocr_confirm_then_retrieval";
  if (resultType === "skipped") return "missed_due_retry_today";
  if (status === "confident_wrong") return "same_day_correction_then_1_3_7";
  if (status === "wrong") return "retry_then_1_3_7";
  if (status === "confused") return "retrieval_check_then_1_3";
  if (status === "recovering") return "rewrite_or_retry_then_1_3_7";
  if (status === "stable") return "maintenance_7_14";
  return "capture_clarify_then_1_3";
}

function nextReviewDate(now: Date, status: PersonalLearningStatus, resultType: PersonalLearningResultType, ocrPending: boolean) {
  if (ocrPending || resultType === "skipped" || status === "confident_wrong" || status === "wrong") return addDays(now, 1);
  if (status === "confused" || status === "recovering") return addDays(now, 3);
  if (status === "stable") return addDays(now, 7);
  return addDays(now, 2);
}

function deriveNextStatus(input: PersonalLearningStateTransitionInput) {
  const previousStatus = normalizeStatus(input.previousStatus);
  const confidence = normalizeConfidence(input.confidence);
  const lowConfidence = input.isLowConfidence === true || confidence === "low" || confidence === "unknown";
  const ocrPending = input.ocrConfirmationPending === true || (input.resultType === "captured" && lowConfidence && /ocr/i.test(input.taskType));
  const correctStreak = Math.max(0, input.correctStreak ?? input.previousCorrectStreak ?? 0);
  const repeatCorrectStreak = correctStreak >= 2;
  const weakRewriteCompleted = input.resultType === "rewritten" && (/weak_structure|paragraph|rewrite|structure|문단|구조/.test(input.taskType) || input.weakStructure === true);

  if (ocrPending) return { nextStatus: previousStatus === "unknown" ? "confused" as const : previousStatus, reason: "ocr_confirmation_pending" };
  if (input.resultType === "skipped") return { nextStatus: previousStatus, reason: "skipped_or_missed_due_task_no_improvement" };
  if (input.resultType === "wrong" || input.wasCorrect === false) {
    if (confidence === "high") return { nextStatus: "confident_wrong" as const, reason: "high_confidence_wrong_answer" };
    if (lowConfidence || input.isRepeatMistake) return { nextStatus: previousStatus === "unknown" ? "confused" as const : "wrong" as const, reason: lowConfidence ? "low_confidence_wrong_or_confused" : "repeat_mistake_wrong" };
    return { nextStatus: "wrong" as const, reason: "wrong_answer" };
  }
  if (weakRewriteCompleted) return { nextStatus: "recovering" as const, reason: "rewrite_completed_after_weak_structure" };
  if (input.resultType === "correct" || input.wasCorrect === true) {
    if ((previousStatus === "wrong" || previousStatus === "confident_wrong" || previousStatus === "confused") && !repeatCorrectStreak) return { nextStatus: "recovering" as const, reason: "correct_after_previous_weak_state" };
    if (repeatCorrectStreak || previousStatus === "recovering" || previousStatus === "stable") return { nextStatus: "stable" as const, reason: "repeated_correct_streak" };
    return { nextStatus: "recovering" as const, reason: "first_correct_check" };
  }
  if (input.resultType === "reviewed") {
    if (previousStatus === "stable") return { nextStatus: "stable" as const, reason: "maintenance_review" };
    return { nextStatus: previousStatus === "unknown" ? "confused" as const : previousStatus, reason: "reviewed_without_correctness_no_improvement" };
  }
  if (input.resultType === "ocr_confirmed") return { nextStatus: previousStatus === "unknown" ? "confused" as const : previousStatus, reason: "ocr_confirmed_requires_learning_evidence" };
  return { nextStatus: previousStatus === "unknown" ? "confused" as const : previousStatus, reason: "captured_unchecked_concept" };
}

function confidenceDeltaFor(previousStatus: PersonalLearningStatus, nextStatus: PersonalLearningStatus) {
  if (nextStatus === "stable") return 2;
  if (nextStatus === "recovering") return previousStatus === "wrong" || previousStatus === "confident_wrong" || previousStatus === "confused" ? 1 : 0;
  if (nextStatus === "confident_wrong") return -2;
  if (nextStatus === "wrong" || nextStatus === "confused") return -1;
  return 0;
}

export function rankLearningStateRisk(state: Pick<PersonalLearningStateSnapshot, "status" | "nextReviewAt"> | PersonalLearningStatus | string): number {
  const status = typeof state === "string" ? normalizeStatus(state) : normalizeStatus(state.status);
  let risk = STATUS_RISK[status];
  if (typeof state !== "string" && state.nextReviewAt) {
    const ts = Date.parse(String(state.nextReviewAt));
    if (Number.isFinite(ts) && ts <= Date.now()) risk += status === "stable" ? 35 : 20;
  }
  return Math.min(120, risk);
}

export function deriveLearningStateTransition(input: PersonalLearningStateTransitionInput): PersonalLearningStateTransition {
  assertNoRawUserDataInDerived(input);
  assertSupportedExamMode(input.examMode);
  const previousStatus = normalizeStatus(input.previousStatus);
  const { nextStatus, reason } = deriveNextStatus(input);
  const now = input.now instanceof Date ? input.now : new Date(input.now ?? Date.now());
  const safeNow = Number.isFinite(now.getTime()) ? now : new Date();
  const ocrPending = reason === "ocr_confirmation_pending";
  const priorityDelta = rankLearningStateRisk(nextStatus) - rankLearningStateRisk(previousStatus);
  const transition: PersonalLearningStateTransition = {
    metadataOnly: true,
    userId: input.userId,
    conceptNodeId: input.conceptNodeId,
    examMode: input.examMode,
    subject: input.subject,
    previousStatus,
    nextStatus,
    reason,
    confidenceDelta: confidenceDeltaFor(previousStatus, nextStatus),
    priorityDelta,
    nextReviewPattern: reviewPatternFor(nextStatus, input.resultType, ocrPending),
    nextReviewAtCandidate: input.nextReviewAt ? toIso(input.nextReviewAt, nextReviewDate(safeNow, nextStatus, input.resultType, ocrPending)) : nextReviewDate(safeNow, nextStatus, input.resultType, ocrPending).toISOString(),
    sourceEventType: input.sourceEventType ?? "session",
    safeSummary: `${input.subject} 개념 상태: ${previousStatus} → ${nextStatus}`,
  };
  assertNoRawUserDataInDerived(transition);
  return transition;
}

export function applyLearningStateTransition(previousState: PersonalLearningStateSnapshot, transition: PersonalLearningStateTransition): PersonalLearningStateSnapshot {
  assertNoRawUserDataInDerived({ previousState, transition });
  const next: PersonalLearningStateSnapshot = {
    metadataOnly: true,
    userId: transition.userId,
    conceptNodeId: transition.conceptNodeId,
    examMode: transition.examMode,
    subject: transition.subject,
    status: transition.nextStatus,
    priority: Math.max(0, Math.min(120, (previousState.priority ?? rankLearningStateRisk(previousState)) + transition.priorityDelta)),
    lastSeenAt: new Date().toISOString(),
    nextReviewAt: transition.nextReviewAtCandidate,
    correctStreak: transition.nextStatus === "stable" ? Math.max(2, previousState.correctStreak ?? 0) : transition.nextStatus === "recovering" ? Math.max(1, previousState.correctStreak ?? 0) : 0,
  };
  assertNoRawUserDataInDerived(next);
  return next;
}

function buildUpdate(input: PersonalLearningStateTransitionInput) {
  return deriveLearningStateTransition(input);
}

export function buildLearningStateUpdateFromCaptureSignal(signal: Record<string, unknown>): PersonalLearningStateTransition | null {
  assertNoRawUserDataInDerived(signal);
  const conceptNodeId = typeof signal.conceptNodeId === "string" ? signal.conceptNodeId : typeof signal.primaryConceptNodeId === "string" ? signal.primaryConceptNodeId : undefined;
  if (!conceptNodeId) return null;
  const confidence = typeof signal.confidence === "string" ? signal.confidence : typeof (signal.todayPlanCandidate as Record<string, unknown> | undefined)?.confidence === "string" ? String((signal.todayPlanCandidate as Record<string, unknown>).confidence) : "unknown";
  const taskType = typeof signal.nextTaskType === "string" ? signal.nextTaskType : "capture";
  return buildUpdate({
    userId: typeof signal.userId === "string" ? signal.userId : "metadata-only-user",
    conceptNodeId,
    examMode: String(signal.examMode ?? "first"),
    subject: String(signal.subject ?? "감정평가 과목"),
    taskType,
    resultType: "captured",
    confidence,
    isLowConfidence: confidence === "low" || confidence === "낮음" || confidence === "unknown",
    previousStatus: "unknown",
    sourceEventType: "capture",
    ocrConfirmationPending: Boolean(signal.ocrConfirmationPending),
  });
}

export function buildLearningStateUpdateFromReviewResult(result: PersonalLearningStateTransitionInput): PersonalLearningStateTransition {
  return buildUpdate({ ...result, sourceEventType: "review" });
}

export function buildLearningStateUpdateFromSessionResult(result: PersonalLearningStateTransitionInput): PersonalLearningStateTransition {
  return buildUpdate({ ...result, sourceEventType: "session" });
}
