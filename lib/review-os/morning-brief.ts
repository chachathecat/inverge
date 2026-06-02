import {
  assertNoForbiddenCopy,
  assertNoRawTextKeys,
  type ReviewQueueItem,
} from "./execution-review-queue";
import {
  buildTodayPlanFromReviewQueue,
  compressTodayPlanToMaxThree,
  type TodayPlanTask,
} from "./today-plan-prioritization";

export type MorningBriefExamMode = "first" | "second" | "mixed";
export type MorningBriefDailyMinutes = 30 | 60 | 90 | 180;

export type MorningBriefInput = {
  examMode: MorningBriefExamMode;
  todayPlanTasks?: TodayPlanTask[];
  reviewQueueItems?: ReviewQueueItem[];
  dailyAvailableMinutes: MorningBriefDailyMinutes;
  daysUntilExam?: number;
  recentMissCount?: number;
  hasStaleCapture?: boolean;
  weakSubjectName?: string;
};

export type MorningBriefTask = Pick<
  TodayPlanTask,
  "id" | "examMode" | "subjectName" | "unitName" | "taskType" | "title" | "rationale" | "primaryAction" | "estimatedMinutes" | "prioritySignals" | "dueBucket"
> & {
  previewOnly: true;
};

export type MorningBriefWarning = {
  code:
    | "preview_metadata_only"
    | "empty_today_plan"
    | "capture_signal_present"
    | "weak_subject_omitted"
    | "mixed_mode_keeps_exam_separation";
  severity: "info" | "caution";
  message: string;
};

export type MorningBriefOutput = {
  headline: string;
  dueReviewLine: string;
  todayTasks: MorningBriefTask[];
  recoveryLine?: string;
  captureReminderLine?: string;
  fallbackAction: string;
  warnings: MorningBriefWarning[];
};

const FORBIDDEN_MORNING_BRIEF_COPY_PATTERNS = [
  /push/i,
  /email/i,
  /e-mail/i,
  /sms/i,
  /kakao/i,
  /카카오/i,
  /알림\s*발송/,
  /통지\s*발송/,
  /notification/i,
  /casino/i,
  /gacha/i,
  /streak/i,
  /연속\s*학습/,
  /순위/,
  /랭킹/,
  /실패자/,
  /게으름/,
  /부끄럽/,
  /망했/,
  /불합격\s*확정/,
  /지금\s*안\s*하면\s*끝/,
  /공포/,
  /fear/i,
  /fake urgency/i,
  /instructor/i,
  /\/instructor/i,
  /강사/,
  /결제/,
  /payment/i,
  /archive/i,
  /아카이브/,
  /native app/i,
  /네이티브 앱/,
];

const RAW_TEXT_FIELD_PATTERN =
  /(rawText|rawOcrText|ocrText|userAnswer|userAnswerText|answerText|rawAnswerText|problemText|questionText|rawQuestionText|uploadedProblemText|fullText|sourceText|copyrightedText|originalText)/i;

function assertSupportedExamMode(examMode: MorningBriefExamMode) {
  if (examMode !== "first" && examMode !== "second" && examMode !== "mixed") {
    throw new Error(`Unsupported morning brief exam mode: ${examMode}`);
  }
}

function assertNoForbiddenMorningBriefCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_MORNING_BRIEF_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden morning brief copy is not accepted: ${String(forbidden)}`);
    return;
  }

  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenMorningBriefCopy);
    return;
  }

  Object.values(value as Record<string, unknown>).forEach(assertNoForbiddenMorningBriefCopy);
}

function validateOutput<T>(value: T): T {
  assertNoRawTextKeys(value);
  assertNoForbiddenCopy(value);
  assertNoForbiddenMorningBriefCopy(value);
  return value;
}

function matchesExamMode(item: Pick<ReviewQueueItem | TodayPlanTask, "examMode">, examMode: MorningBriefExamMode) {
  return examMode === "mixed" || item.examMode === examMode;
}

function safeWeakSubjectName(weakSubjectName?: string) {
  const normalized = typeof weakSubjectName === "string" ? weakSubjectName.replace(/\s+/g, " ").trim() : "";
  if (normalized.length === 0 || normalized.length > 40) return undefined;
  if (RAW_TEXT_FIELD_PATTERN.test(normalized)) return undefined;
  if (FORBIDDEN_MORNING_BRIEF_COPY_PATTERNS.some((pattern) => pattern.test(normalized))) return undefined;
  return normalized;
}

function normalizeDailyMinutes(minutes: MorningBriefDailyMinutes) {
  return minutes === 30 || minutes === 60 || minutes === 90 || minutes === 180 ? minutes : 60;
}


function selectTodayTasks(input: MorningBriefInput): TodayPlanTask[] {
  const context = {
    examMode: input.examMode,
    dailyAvailableMinutes: normalizeDailyMinutes(input.dailyAvailableMinutes),
    daysUntilExam: input.daysUntilExam,
    weakSubjectName: safeWeakSubjectName(input.weakSubjectName),
    recentMissCount: input.recentMissCount,
    source: "morning_brief" as const,
  };

  if (input.todayPlanTasks && input.todayPlanTasks.length > 0) {
    return compressTodayPlanToMaxThree(input.todayPlanTasks.filter((task) => matchesExamMode(task, input.examMode)), context);
  }

  return buildTodayPlanFromReviewQueue({
    reviewQueueItems: (input.reviewQueueItems ?? []).filter((item) => matchesExamMode(item, input.examMode)),
    context,
  });
}

function toPreviewTask(task: TodayPlanTask): MorningBriefTask {
  return {
    id: task.id,
    examMode: task.examMode,
    subjectName: task.subjectName,
    unitName: task.unitName,
    taskType: task.taskType,
    title: task.title,
    rationale: task.rationale,
    primaryAction: task.primaryAction,
    estimatedMinutes: task.estimatedMinutes,
    prioritySignals: task.prioritySignals,
    dueBucket: task.dueBucket,
    previewOnly: true,
  };
}

function hasIncompleteCaptureMetadata(item: ReviewQueueItem) {
  const isWrongOrUnknown = item.sourceResult === "wrong" || item.prioritySignals.includes("confidence:needs_check");
  const lacksConceptMetadata = !item.subjectName && !item.unitName;
  const lacksTaskMetadata = !item.taskType || item.taskType.trim().length === 0;
  return isWrongOrUnknown && (lacksConceptMetadata || lacksTaskMetadata);
}

function examModeLabel(examMode: MorningBriefExamMode) {
  if (examMode === "first") return "1차";
  if (examMode === "second") return "2차";
  return "1차와 2차";
}

export function buildRecoveryNudge(input: Pick<MorningBriefInput, "recentMissCount">): string | undefined {
  if ((input.recentMissCount ?? 0) <= 0) return undefined;
  return validateOutput("오늘은 범위를 줄여 복구합니다. 어제 못 한 항목은 1개만 복구해도 충분합니다.");
}

export function buildDueReviewLine(input: Pick<MorningBriefInput, "examMode" | "reviewQueueItems">): string {
  assertSupportedExamMode(input.examMode);
  const reviewItems = (input.reviewQueueItems ?? []).filter((item) => matchesExamMode(item, input.examMode));
  const immediateCount = reviewItems.filter((item) => item.dueBucket === "soon" || item.dueBucket === "tomorrow").length;
  const dueCount = immediateCount > 0 ? immediateCount : reviewItems.length;

  if (dueCount === 0) {
    return validateOutput("오늘 복습 신호가 비어 있습니다. 먼저 짧은 회상 1개로 시작합니다.");
  }

  return validateOutput(`오늘 확인할 복습 신호가 ${dueCount}개 있습니다. 정답을 보기 전에 먼저 떠올리고 바로 재시도합니다.`);
}

export function buildCaptureReminderLine(
  input: Pick<MorningBriefInput, "examMode" | "reviewQueueItems" | "hasStaleCapture">,
): string | undefined {
  assertSupportedExamMode(input.examMode);
  const hasMetadataGap = (input.reviewQueueItems ?? [])
    .filter((item) => matchesExamMode(item, input.examMode))
    .some(hasIncompleteCaptureMetadata);

  if (!input.hasStaleCapture && !hasMetadataGap) return undefined;
  return validateOutput("최근 풀이 기록에 과목이나 과제 표시가 비어 있습니다. 오늘 항목 1개만 고르고 복습 기준을 남깁니다.");
}

export function buildMorningBrief(input: MorningBriefInput): MorningBriefOutput {
  assertSupportedExamMode(input.examMode);
  assertNoRawTextKeys(input);
  assertNoForbiddenCopy(input.todayPlanTasks ?? []);
  assertNoForbiddenCopy(input.reviewQueueItems ?? []);
  assertNoForbiddenMorningBriefCopy(input.todayPlanTasks ?? []);

  const todayPlanTasks = selectTodayTasks(input);
  const todayTasks = todayPlanTasks.map(toPreviewTask);
  const dueReviewLine = buildDueReviewLine(input);
  const recoveryLine = buildRecoveryNudge(input);
  const captureReminderLine = buildCaptureReminderLine(input);
  const weakSubject = safeWeakSubjectName(input.weakSubjectName);

  const warnings: MorningBriefWarning[] = [
    {
      code: "preview_metadata_only",
      severity: "info",
      message: "아침 시작 화면에 표시할 미리보기 문구만 만들었습니다.",
    },
  ];

  if (todayTasks.length === 0) {
    warnings.push({
      code: "empty_today_plan",
      severity: "caution",
      message: "오늘 계획 항목이 없어 30분 대체 실행으로 시작합니다.",
    });
  }

  if (captureReminderLine) {
    warnings.push({
      code: "capture_signal_present",
      severity: "info",
      message: "풀이 기록 정리가 학습 선택에 도움이 되는 상태입니다.",
    });
  }

  if (input.weakSubjectName && !weakSubject) {
    warnings.push({
      code: "weak_subject_omitted",
      severity: "caution",
      message: "취약 과목 이름은 안전한 짧은 과목명일 때만 반영합니다.",
    });
  }

  if (input.examMode === "mixed") {
    warnings.push({
      code: "mixed_mode_keeps_exam_separation",
      severity: "info",
      message: "1차와 2차 과제는 같은 목록 안에서도 구분해 표시합니다.",
    });
  }

  const headlineSubject = weakSubject ? `${weakSubject}부터 작게 시작합니다.` : `${examModeLabel(input.examMode)} 오늘 실행을 작게 고정합니다.`;
  const output: MorningBriefOutput = {
    headline: todayTasks.length > 0 ? headlineSubject : `${examModeLabel(input.examMode)} 오늘은 회상 1개로 시작합니다.`,
    dueReviewLine,
    todayTasks,
    recoveryLine,
    captureReminderLine,
    fallbackAction: "시간이 줄어들면 30분 fallback으로 복습 1개를 먼저 떠올리고, 짧게 재시도한 뒤 다음 복습을 예약합니다.",
    warnings,
  };

  return validateOutput(output);
}
