import { buildLearningSignalFromExecutionResult, type ExecutionLearningSignal, type ExecutionLearningSignalConfidence, type ExecutionLearningSignalResult } from "./execution-learning-signal";
import { buildReviewQueueItemFromExecutionSignal, type ReviewQueueItem } from "./execution-review-queue";
import { buildTodayPlanFromReviewQueue, type TodayPlanTask } from "./today-plan-prioritization";
import { normalizeCurriculumTaskType } from "./curriculum-engine";
import { type AppraiserExamMode } from "./curriculum-reference";

export type CaptureLearningSignalBridgeSource = "photo" | "pdf" | "text" | "manual";
export type CaptureLearningSignalBridgeIntent = "wrong_answer" | "concept_uncertainty" | "answer_rewrite" | "calculation_check" | "issue_spotting";
export type CaptureLearningSignalBridgeResultHint = "wrong" | "unknown" | "needs_rewrite" | "done";

export type CaptureLearningSignalBridgeInput = {
  examMode: AppraiserExamMode;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  captureSource: CaptureLearningSignalBridgeSource;
  captureIntent?: CaptureLearningSignalBridgeIntent;
  confidence?: ExecutionLearningSignalConfidence | string;
  resultHint?: CaptureLearningSignalBridgeResultHint;
  taskType?: string;
  timeSpentMinutes?: number;
  daysUntilExam?: number;
  isFailRiskSubject?: boolean;
};

export type CaptureLearningSignalBridgeBoundaryWarning =
  | "capture_source_metadata_only"
  | "raw_ocr_problem_answer_text_not_accepted"
  | "derived_signal_only"
  | "no_public_collection_created";

export type CaptureLearningSignalBridgeResult = {
  learningSignal: ExecutionLearningSignal;
  dataBoundaryWarnings: CaptureLearningSignalBridgeBoundaryWarning[];
};

export type CaptureReviewQueueBridgeResult = {
  learningSignal: ExecutionLearningSignal;
  reviewQueueItem: ReviewQueueItem | null;
  dataBoundaryWarnings: CaptureLearningSignalBridgeBoundaryWarning[];
};

export type CaptureTodayPlanBridgeResult = {
  learningSignal: ExecutionLearningSignal;
  reviewQueueItem: ReviewQueueItem | null;
  todayPlanCandidates: TodayPlanTask[];
  dataBoundaryWarnings: CaptureLearningSignalBridgeBoundaryWarning[];
};

const DATA_BOUNDARY_WARNINGS: CaptureLearningSignalBridgeBoundaryWarning[] = [
  "capture_source_metadata_only",
  "raw_ocr_problem_answer_text_not_accepted",
  "derived_signal_only",
  "no_public_collection_created",
];

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "text",
  "rawText",
  "rawOcrText",
  "ocrText",
  "ocrResult",
  "userAnswer",
  "userAnswerText",
  "answer",
  "answerText",
  "rawAnswerText",
  "problem",
  "problemText",
  "question",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "originalText",
  "modelAnswer",
  "officialAnswer",
]);

const FORBIDDEN_RAW_FIELD_PATTERN = /(raw|ocr|answer|problem|question|copyright|fulltext|sourceText|userText|originalText|modelAnswer|officialAnswer)/i;
const ACCOUNTING_PATTERN = /회계|accounting|계산틀|계산.?템플릿/i;
const CASIO_PATTERN = /casio|calculator|계산기|계산/i;
const ISSUE_PATTERN = /issue|쟁점/i;

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Unsupported examMode ${String(examMode)}`);
  }
}

function assertSupportedCaptureSource(captureSource: unknown): asserts captureSource is CaptureLearningSignalBridgeSource {
  if (captureSource !== "photo" && captureSource !== "pdf" && captureSource !== "text" && captureSource !== "manual") {
    throw new Error(`Unsupported captureSource ${String(captureSource)}`);
  }
}

function assertNoRawTextLikeKeys(value: unknown): void {
  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach(assertNoRawTextLikeKeys);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw OCR/problem/answer text field is not accepted by capture learning signal bridge: ${key}`);
    }
    assertNoRawTextLikeKeys(nestedValue);
  }
}

function cleanOptionalText(value: string | undefined) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTaskType(taskType: string | undefined) {
  const cleaned = cleanOptionalText(taskType);
  return cleaned ? normalizeCurriculumTaskType(cleaned) ?? cleaned : undefined;
}

function normalizeConfidence(confidence: CaptureLearningSignalBridgeInput["confidence"]): ExecutionLearningSignalConfidence {
  if (confidence === "low" || confidence === "medium" || confidence === "high" || confidence === "unknown") return confidence;
  if (confidence === "낮음") return "low";
  if (confidence === "중간") return "medium";
  if (confidence === "높음") return "high";
  return "unknown";
}

function normalizeMinutes(minutes: number | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return undefined;
  return Math.max(0, Math.round(minutes));
}

function isAccountingCapture(input: CaptureLearningSignalBridgeInput, taskType: string | undefined) {
  return input.captureIntent === "calculation_check" || ACCOUNTING_PATTERN.test([taskType, input.subjectName, input.unitName].filter(Boolean).join(" "));
}

function isCasioCapture(input: CaptureLearningSignalBridgeInput, taskType: string | undefined) {
  return input.captureIntent === "calculation_check" || CASIO_PATTERN.test([taskType, input.subjectName, input.unitName].filter(Boolean).join(" "));
}

function resolveResult(input: CaptureLearningSignalBridgeInput): ExecutionLearningSignalResult {
  if (input.resultHint) return input.resultHint;
  if (input.captureIntent === "answer_rewrite") return "needs_rewrite";
  if (input.captureIntent === "wrong_answer" || input.captureIntent === "calculation_check") return "wrong";
  if (input.captureIntent === "concept_uncertainty" || input.captureIntent === "issue_spotting") return "unknown";
  return "unknown";
}

function resolveTaskType(input: CaptureLearningSignalBridgeInput) {
  const explicitTaskType = normalizeTaskType(input.taskType);

  if (input.examMode === "first") {
    if (isAccountingCapture(input, explicitTaskType)) return "accounting template";
    if (input.captureIntent === "concept_uncertainty" || explicitTaskType === "cloze") return "cloze";
    if (explicitTaskType === "accounting template") return explicitTaskType;
    if (explicitTaskType === "O/X") return explicitTaskType;
    return "O/X";
  }

  if (input.captureIntent === "answer_rewrite" || explicitTaskType === "rewrite") return "rewrite";
  if (isCasioCapture(input, explicitTaskType)) return "CASIO";
  if (input.captureIntent === "issue_spotting" || explicitTaskType === "issue spotting" || ISSUE_PATTERN.test(explicitTaskType ?? "")) return "issue spotting";
  return explicitTaskType ?? "rewrite";
}

function toExecutionInput(input: CaptureLearningSignalBridgeInput) {
  assertNoRawTextLikeKeys(input);
  assertSupportedExamMode(input.examMode);
  assertSupportedCaptureSource(input.captureSource);

  return {
    examMode: input.examMode,
    subjectId: cleanOptionalText(input.subjectId),
    subjectName: cleanOptionalText(input.subjectName),
    unitId: cleanOptionalText(input.unitId),
    unitName: cleanOptionalText(input.unitName),
    taskType: resolveTaskType(input),
    executionSource: "capture" as const,
    result: resolveResult(input),
    confidence: normalizeConfidence(input.confidence),
    timeSpentMinutes: normalizeMinutes(input.timeSpentMinutes),
    daysUntilExam: normalizeMinutes(input.daysUntilExam),
    isFailRiskSubject: Boolean(input.isFailRiskSubject),
  };
}

export function buildLearningSignalFromCaptureMetadata(input: CaptureLearningSignalBridgeInput): CaptureLearningSignalBridgeResult {
  const learningSignal = buildLearningSignalFromExecutionResult(toExecutionInput(input));
  assertNoRawTextLikeKeys(learningSignal);

  return {
    learningSignal,
    dataBoundaryWarnings: [...DATA_BOUNDARY_WARNINGS],
  };
}

export function buildReviewQueueItemFromCaptureMetadata(input: CaptureLearningSignalBridgeInput): CaptureReviewQueueBridgeResult {
  const { learningSignal, dataBoundaryWarnings } = buildLearningSignalFromCaptureMetadata(input);
  const reviewQueueItem = buildReviewQueueItemFromExecutionSignal(learningSignal);
  assertNoRawTextLikeKeys(reviewQueueItem);

  return {
    learningSignal,
    reviewQueueItem,
    dataBoundaryWarnings,
  };
}

export function buildTodayPlanCandidateFromCaptureMetadata(input: CaptureLearningSignalBridgeInput): CaptureTodayPlanBridgeResult {
  const { learningSignal, reviewQueueItem, dataBoundaryWarnings } = buildReviewQueueItemFromCaptureMetadata(input);
  const todayPlanCandidates = reviewQueueItem
    ? buildTodayPlanFromReviewQueue({
        reviewQueueItems: [reviewQueueItem],
        context: {
          examMode: input.examMode,
          dailyAvailableMinutes: 60,
          daysUntilExam: normalizeMinutes(input.daysUntilExam),
          weakSubjectName: input.isFailRiskSubject ? cleanOptionalText(input.subjectName) : undefined,
          recentMissCount: learningSignal.result === "wrong" || learningSignal.result === "unknown" ? 1 : 0,
          preferredTaskType: learningSignal.nextRecommendedTaskType ?? learningSignal.taskType,
          source: "review_queue",
        },
      })
    : [];

  assertNoRawTextLikeKeys(todayPlanCandidates);

  return {
    learningSignal,
    reviewQueueItem,
    todayPlanCandidates: todayPlanCandidates.slice(0, 3),
    dataBoundaryWarnings,
  };
}
