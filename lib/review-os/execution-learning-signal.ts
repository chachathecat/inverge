import { type AppraiserExamMode } from "./curriculum-reference";

export type ExecutionLearningSignalSource = "onboarding" | "today_plan" | "capture" | "session" | "first_ox" | "calculator";
export type ExecutionLearningSignalResult = "done" | "wrong" | "unknown" | "needs_rewrite" | "skipped";
export type ExecutionLearningSignalConfidence = "unknown" | "low" | "medium" | "high";
export type ExecutionLearningDerivedStatus = "completed" | "needs_review" | "needs_rewrite" | "recovery";
export type ExecutionReviewDueHint = "none" | "soon" | "tomorrow" | "three_days" | "one_week";

export type ExecutionLearningSignalInput = {
  examMode: AppraiserExamMode;
  taskType: string;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  executionSource: ExecutionLearningSignalSource;
  result: ExecutionLearningSignalResult;
  confidence?: ExecutionLearningSignalConfidence;
  timeSpentMinutes?: number;
  isFailRiskSubject?: boolean;
  daysUntilExam?: number;
};

export type ExecutionResultFeedbackInput = ExecutionLearningSignalInput;

export type ExecutionLearningSignal = {
  examMode: AppraiserExamMode;
  taskType: string;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  executionSource: ExecutionLearningSignalSource;
  result: ExecutionLearningSignalResult;
  confidence: ExecutionLearningSignalConfidence;
  timeSpentMinutes?: number;
  derivedStatus: ExecutionLearningDerivedStatus;
  reviewDueHint: ExecutionReviewDueHint;
  nextRecommendedTaskType?: string;
  prioritySignals: string[];
  feedbackCopy: string;
};

export type ExecutionReviewCandidate = {
  examMode: AppraiserExamMode;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  taskType: string;
  candidateType: "review" | "rewrite" | "recovery";
  sourceResult: ExecutionLearningSignalResult;
  executionSource: ExecutionLearningSignalSource;
  dueHint: ExecutionReviewDueHint;
  prioritySignals: string[];
  title: string;
  rationale: string;
  primaryAction: string;
};

export type ExecutionNextPlanCandidate = {
  taskType: string;
  title: string;
  rationale: string;
  prioritySignals: string[];
};

export type ExecutionNextPlanSignal = {
  examMode: AppraiserExamMode;
  sourceResult: ExecutionLearningSignalResult;
  derivedStatus: ExecutionLearningDerivedStatus;
  candidates: ExecutionNextPlanCandidate[];
};

const MAX_NEXT_PLAN_CANDIDATES = 3;
const FORBIDDEN_RAW_FIELD_PATTERN = /(raw|ocr|answer|problem|question|copyright|fulltext|sourceText|userText|originalText)/i;
const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "text",
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "rawAnswerText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
]);

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Unsupported examMode ${String(examMode)}`);
  }
}

function assertSafeDerivedOnlyInput(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw text field is not accepted by execution learning signal helper: ${key}`);
    }
  }
}

function cleanOptionalText(value: string | undefined) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTimeSpentMinutes(minutes: number | undefined) {
  if (typeof minutes !== "number" || !Number.isFinite(minutes)) return undefined;
  return Math.max(0, Math.round(minutes));
}

function normalizeDaysUntilExam(daysUntilExam: number | undefined) {
  if (typeof daysUntilExam !== "number" || !Number.isFinite(daysUntilExam)) return undefined;
  return Math.max(0, Math.round(daysUntilExam));
}

const TASK_TYPE_ALIASES: Record<string, string> = {
  ox: "O/X",
  "o/x": "O/X",
  cloze: "cloze",
  accounting: "accounting template",
  accounting_template: "accounting template",
  "accounting template": "accounting template",
  rewrite: "rewrite",
  casio: "CASIO",
  issue: "issue spotting",
  issue_spotting: "issue spotting",
  "issue spotting": "issue spotting",
};

function normalizeTaskType(taskType: string) {
  const cleaned = taskType.trim();
  return TASK_TYPE_ALIASES[cleaned.toLowerCase()] ?? cleaned;
}

function isWrongLike(result: ExecutionLearningSignalResult) {
  return result === "wrong" || result === "unknown";
}

function isNearExam(daysUntilExam: number | undefined) {
  return typeof daysUntilExam === "number" && daysUntilExam <= 30;
}

function isCasioTask(taskType: string) {
  return normalizeTaskType(taskType) === "CASIO" || /casio|calculator|계산기/i.test(taskType);
}

function isAccountingTask(taskType: string) {
  return normalizeTaskType(taskType) === "accounting template" || /회계|accounting/i.test(taskType);
}

function isIssueSpottingTask(taskType: string) {
  return normalizeTaskType(taskType) === "issue spotting" || /issue|쟁점/i.test(taskType);
}

function preferredFollowUpTaskType(input: {
  examMode: AppraiserExamMode;
  taskType: string;
  result: ExecutionLearningSignalResult;
}) {
  const taskType = normalizeTaskType(input.taskType);

  if (input.result === "done") return undefined;
  if (input.result === "skipped") return taskType || (input.examMode === "first" ? "O/X" : "issue spotting");
  if (input.result === "needs_rewrite") return "rewrite";

  if (input.examMode === "first" && isWrongLike(input.result)) {
    if (isAccountingTask(taskType)) return "accounting template";
    if (taskType === "cloze") return "cloze";
    return "O/X";
  }

  if (input.examMode === "second" && isWrongLike(input.result)) {
    if (isCasioTask(taskType)) return "CASIO";
    if (isIssueSpottingTask(taskType) && input.result === "unknown") return "issue spotting";
    return "rewrite";
  }

  return undefined;
}

function derivedStatusFor(input: Pick<ExecutionLearningSignalInput, "examMode" | "taskType" | "result">): ExecutionLearningDerivedStatus {
  if (input.result === "done") return "completed";
  if (input.result === "skipped") return "recovery";
  if (input.result === "needs_rewrite") return "needs_rewrite";
  return "needs_review";
}

function reviewDueHintFor(params: {
  result: ExecutionLearningSignalResult;
  derivedStatus: ExecutionLearningDerivedStatus;
  daysUntilExam?: number;
  isFailRiskSubject?: boolean;
}) {
  if (params.result === "done") return "none";
  if (params.result === "skipped") return "soon";
  if (params.derivedStatus === "needs_rewrite") return isNearExam(params.daysUntilExam) || params.isFailRiskSubject ? "soon" : "tomorrow";
  if (params.result === "wrong") return isNearExam(params.daysUntilExam) || params.isFailRiskSubject ? "soon" : "tomorrow";
  if (params.result === "unknown") return isNearExam(params.daysUntilExam) || params.isFailRiskSubject ? "soon" : "three_days";
  return "one_week";
}

function prioritySignalsFor(input: ExecutionLearningSignalInput, derivedStatus: ExecutionLearningDerivedStatus) {
  const signals = new Set<string>();
  signals.add(`result:${input.result}`);
  signals.add(`status:${derivedStatus}`);
  if (input.confidence === "low" || input.confidence === "unknown" || !input.confidence) signals.add("confidence:needs_check");
  if (input.isFailRiskSubject) signals.add("fail_risk_subject");
  if (isNearExam(normalizeDaysUntilExam(input.daysUntilExam))) signals.add("exam_proximity");
  if (input.executionSource === "onboarding" || input.executionSource === "today_plan") signals.add("first_plan_loop");
  if (input.result === "wrong" || input.result === "unknown") signals.add("review_candidate");
  if (input.result === "needs_rewrite") signals.add("rewrite_candidate");
  if (input.result === "skipped") signals.add("recovery_candidate");
  if (input.examMode === "second" && isCasioTask(input.taskType) && input.result === "wrong") signals.add("calculator_recovery");
  if (input.examMode === "second" && isIssueSpottingTask(input.taskType) && input.result === "unknown") signals.add("issue_spotting_gap");
  if (input.examMode === "first" && isAccountingTask(input.taskType) && isWrongLike(input.result)) signals.add("accounting_template_review");
  return [...signals];
}

export function buildExecutionResultFeedback(input: ExecutionResultFeedbackInput) {
  assertSafeDerivedOnlyInput(input as Record<string, unknown>);
  assertSupportedExamMode(input.examMode);
  const taskType = normalizeTaskType(input.taskType);
  const nextTaskType = preferredFollowUpTaskType({ examMode: input.examMode, taskType, result: input.result });

  if (input.result === "done") {
    return "완료 기록을 남겼어요. 지금은 추가 판단을 늘리지 않고, 다음 계획에서 차분히 이어갈게요.";
  }

  if (input.result === "skipped") {
    return "괜찮아요. 건너뜀도 학습 신호예요. 부담을 낮춰 같은 단위를 짧게 복구하거나 다른 과제로 바꿀 수 있어요.";
  }

  if (input.result === "needs_rewrite") {
    return "다시쓰기 신호로 남겼어요. 오늘은 한 문단만 고쳐 쓰고, 이후 복습 후보로 연결할게요.";
  }

  if (input.examMode === "first") {
    if (nextTaskType === "accounting template") return "계산틀 점검 신호로 남겼어요. 같은 유형의 식 세팅을 짧게 다시 풀어볼게요.";
    if (nextTaskType === "cloze") return "빈칸 회상 신호로 남겼어요. 설명을 늘리기 전에 핵심어를 먼저 다시 꺼내볼게요.";
    return "O/X 복습 신호로 남겼어요. 해설을 길게 보기 전에 같은 판단을 한 번 더 확인할게요.";
  }

  if (nextTaskType === "CASIO") return "계산기 복구 신호로 남겼어요. 입력 순서와 단위만 짧게 다시 확인할게요.";
  if (nextTaskType === "issue spotting") return "쟁점 확인 신호로 남겼어요. 기준답안 전체보다 빠진 쟁점 1개를 먼저 다시 찾아볼게요.";
  return "답안 복습 신호로 남겼어요. 가장 큰 간극 1개만 잡고 짧게 다시 써볼게요.";
}

export function buildLearningSignalFromExecutionResult(input: ExecutionLearningSignalInput): ExecutionLearningSignal {
  assertSafeDerivedOnlyInput(input as Record<string, unknown>);
  assertSupportedExamMode(input.examMode);

  const taskType = normalizeTaskType(input.taskType);
  const daysUntilExam = normalizeDaysUntilExam(input.daysUntilExam);
  const normalizedInput = { ...input, taskType, daysUntilExam };
  const derivedStatus = derivedStatusFor(normalizedInput);
  const reviewDueHint = reviewDueHintFor({
    result: input.result,
    derivedStatus,
    daysUntilExam,
    isFailRiskSubject: input.isFailRiskSubject,
  });
  const nextRecommendedTaskType = preferredFollowUpTaskType({ examMode: input.examMode, taskType, result: input.result });

  return {
    examMode: input.examMode,
    taskType,
    subjectId: cleanOptionalText(input.subjectId),
    subjectName: cleanOptionalText(input.subjectName),
    unitId: cleanOptionalText(input.unitId),
    unitName: cleanOptionalText(input.unitName),
    executionSource: input.executionSource,
    result: input.result,
    confidence: input.confidence ?? "unknown",
    timeSpentMinutes: normalizeTimeSpentMinutes(input.timeSpentMinutes),
    derivedStatus,
    reviewDueHint,
    nextRecommendedTaskType,
    prioritySignals: prioritySignalsFor(input, derivedStatus),
    feedbackCopy: buildExecutionResultFeedback(input),
  };
}

function titleForCandidate(signal: ExecutionLearningSignal) {
  const subjectPrefix = signal.subjectName ? `${signal.subjectName} · ` : "";
  if (signal.examMode === "second" && signal.nextRecommendedTaskType === "rewrite") return `${subjectPrefix}짧은 다시쓰기`;
  if (signal.derivedStatus === "needs_rewrite") return `${subjectPrefix}짧은 다시쓰기`;
  if (signal.result === "skipped") return `${subjectPrefix}복구 과제`;
  if (signal.nextRecommendedTaskType === "accounting template") return `${subjectPrefix}회계 계산틀 복습`;
  if (signal.nextRecommendedTaskType === "CASIO") return `${subjectPrefix}CASIO 입력 복구`;
  if (signal.nextRecommendedTaskType === "issue spotting") return `${subjectPrefix}쟁점 찾기 복습`;
  if (signal.nextRecommendedTaskType === "cloze") return `${subjectPrefix}빈칸 회상 복습`;
  return `${subjectPrefix}O/X 판단 복습`;
}

function actionForCandidate(signal: ExecutionLearningSignal) {
  if (signal.examMode === "second" && signal.nextRecommendedTaskType === "rewrite") return "한 문단 다시쓰기";
  if (signal.derivedStatus === "needs_rewrite") return "한 문단 다시쓰기";
  if (signal.result === "skipped") return "짧게 다시 시작";
  if (signal.nextRecommendedTaskType === "CASIO") return "계산기 순서 확인";
  if (signal.nextRecommendedTaskType === "accounting template") return "계산틀 다시 풀기";
  if (signal.nextRecommendedTaskType === "issue spotting") return "쟁점 1개 다시 찾기";
  if (signal.nextRecommendedTaskType === "cloze") return "핵심어 빈칸 회상";
  return "O/X 다시 판단";
}

export function buildReviewCandidateFromExecutionSignal(signal: ExecutionLearningSignal): ExecutionReviewCandidate | null {
  if (signal.derivedStatus === "completed") return null;

  const candidateType = signal.derivedStatus === "needs_rewrite" ? "rewrite" : signal.derivedStatus === "recovery" ? "recovery" : "review";
  const taskType = signal.nextRecommendedTaskType ?? signal.taskType;

  return {
    examMode: signal.examMode,
    subjectId: signal.subjectId,
    subjectName: signal.subjectName,
    unitId: signal.unitId,
    unitName: signal.unitName,
    taskType,
    candidateType,
    sourceResult: signal.result,
    executionSource: signal.executionSource,
    dueHint: signal.reviewDueHint,
    prioritySignals: signal.prioritySignals,
    title: titleForCandidate(signal),
    rationale: signal.feedbackCopy,
    primaryAction: actionForCandidate(signal),
  };
}

function buildCandidate(taskType: string, title: string, rationale: string, prioritySignals: string[]): ExecutionNextPlanCandidate {
  return { taskType, title, rationale, prioritySignals };
}

export function buildNextPlanSignalFromExecution(signal: ExecutionLearningSignal): ExecutionNextPlanSignal {
  const candidates: ExecutionNextPlanCandidate[] = [];
  const add = (candidate: ExecutionNextPlanCandidate) => {
    if (!candidates.some((entry) => entry.taskType === candidate.taskType)) candidates.push(candidate);
  };

  if (signal.derivedStatus !== "completed") {
    const primaryTaskType = signal.nextRecommendedTaskType ?? signal.taskType;
    add(buildCandidate(primaryTaskType, titleForCandidate(signal), signal.feedbackCopy, signal.prioritySignals));

    if (signal.examMode === "first" && primaryTaskType !== "O/X") {
      add(buildCandidate("O/X", "짧은 O/X 확인", "같은 단원의 판단을 짧게 확인해 복습 부담을 낮춥니다.", signal.prioritySignals));
    }

    if (signal.examMode === "second" && primaryTaskType !== "rewrite") {
      add(buildCandidate("rewrite", "한 문단 다시쓰기", "가장 큰 간극 1개를 문단으로 다시 연결합니다.", signal.prioritySignals));
    }
  }

  return {
    examMode: signal.examMode,
    sourceResult: signal.result,
    derivedStatus: signal.derivedStatus,
    candidates: candidates.slice(0, MAX_NEXT_PLAN_CANDIDATES),
  };
}
