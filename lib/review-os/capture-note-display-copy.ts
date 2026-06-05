import type { AppraiserExamMode } from "./curriculum-reference";
import type { CaptureLearningSignalBridgeSource } from "./capture-learning-signal-bridge";

export type CaptureTextStatus = "draft" | "user_confirmed";
export type CaptureNextTaskType = "retry" | "rewrite" | "O/X" | "cloze" | "accounting template" | "CASIO" | "issue spotting";
export type CaptureNoteConfidence = "low" | "medium" | "high" | "unknown" | "낮음" | "중간" | "높음";

export type CaptureNoteSummaryInput = {
  examMode: AppraiserExamMode;
  subject: string;
  sourceType: CaptureLearningSignalBridgeSource;
  capturedTextStatus: CaptureTextStatus;
  oneBiggestGap: string;
  nextAction: string;
  nextTaskType: CaptureNextTaskType | string;
  confidence: CaptureNoteConfidence | string;
  timeSpentMinutes?: number;
  derivedSignals?: string[];
};

export type CaptureNoteSummary = {
  examMode: AppraiserExamMode;
  subject: string;
  sourceType: CaptureLearningSignalBridgeSource;
  capturedTextStatus: CaptureTextStatus;
  oneBiggestGap: string;
  nextAction: string;
  nextTaskType: string;
  confidence: string;
  timeSpentMinutes?: number;
  metadataOnly: true;
  derivedSignals: string[];
};

export type CaptureNoteDisplayCopy = {
  gapLabel: string;
  nextActionLabel: string;
  saveCta: string;
  todayPlanCta: string;
  retryOrRewriteCta: string;
};

const FALLBACK_GAP = "아직 확인할 빈틈을 고르는 중입니다.";
const FALLBACK_ACTION = "짧은 재시도로 기준을 다시 고정합니다.";
const SUPPORTED_EXAM_MODES = new Set(["first", "second"]);
const SUPPORTED_SOURCE_TYPES = new Set(["photo", "pdf", "text", "manual"]);
const FORBIDDEN_SHARED_FIELD_NAMES = new Set([
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
]);
const FORBIDDEN_SHARED_FIELD_PATTERN = /(raw|ocr|answerText|problemText|questionText|copyrightedText|originalText|fullText|sourceText|rawUserText)/i;

function assertMetadataOnlyInput(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertMetadataOnlyInput);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_SHARED_FIELD_NAMES.has(key) || FORBIDDEN_SHARED_FIELD_PATTERN.test(key)) {
      throw new Error(`Capture note summary accepts metadata only; raw/shared text field is not allowed: ${key}`);
    }
    assertMetadataOnlyInput(nestedValue);
  }
}

function normalizeText(value: string | undefined, fallback: string) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeMinutes(minutes: number | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return undefined;
  return Math.max(0, Math.round(minutes));
}

function assertSupportedExamMode(examMode: string): asserts examMode is AppraiserExamMode {
  if (!SUPPORTED_EXAM_MODES.has(examMode)) throw new Error(`Unsupported capture note examMode: ${examMode}`);
}

function assertSupportedSourceType(sourceType: string): asserts sourceType is CaptureLearningSignalBridgeSource {
  if (!SUPPORTED_SOURCE_TYPES.has(sourceType)) throw new Error(`Unsupported capture note sourceType: ${sourceType}`);
}

export function buildCaptureNoteSummary(input: CaptureNoteSummaryInput): CaptureNoteSummary {
  assertMetadataOnlyInput(input);
  assertSupportedExamMode(input.examMode);
  assertSupportedSourceType(input.sourceType);
  if (input.capturedTextStatus !== "draft" && input.capturedTextStatus !== "user_confirmed") {
    throw new Error(`Unsupported capturedTextStatus: ${String(input.capturedTextStatus)}`);
  }

  return {
    examMode: input.examMode,
    subject: normalizeText(input.subject, input.examMode === "second" ? "감정평가사 2차" : "감정평가사 1차"),
    sourceType: input.sourceType,
    capturedTextStatus: input.capturedTextStatus,
    oneBiggestGap: normalizeText(input.oneBiggestGap, FALLBACK_GAP),
    nextAction: normalizeText(input.nextAction, FALLBACK_ACTION),
    nextTaskType: normalizeText(input.nextTaskType, input.examMode === "second" ? "rewrite" : "O/X"),
    confidence: normalizeText(input.confidence, "unknown"),
    timeSpentMinutes: normalizeMinutes(input.timeSpentMinutes),
    metadataOnly: true,
    derivedSignals: Array.isArray(input.derivedSignals)
      ? input.derivedSignals.map((signal) => normalizeText(signal, "derived_signal")).filter(Boolean).slice(0, 5)
      : ["capture_note_summary"],
  };
}

export function buildCaptureNoteDisplayCopy(summary: Pick<CaptureNoteSummary, "oneBiggestGap" | "nextAction" | "nextTaskType">): CaptureNoteDisplayCopy {
  assertMetadataOnlyInput(summary);
  const gap = normalizeText(summary.oneBiggestGap, FALLBACK_GAP);
  const action = normalizeText(summary.nextAction, FALLBACK_ACTION);
  const taskType = normalizeText(summary.nextTaskType, "retry");

  return {
    gapLabel: `가장 큰 빈틈: ${gap}`,
    nextActionLabel: `다음 행동: ${action}`,
    saveCta: "저장하고 오늘 계획에 반영",
    todayPlanCta: "오늘 계획에 반영",
    retryOrRewriteCta: taskType === "rewrite" ? "다시 쓰기" : "다시 풀기",
  };
}
