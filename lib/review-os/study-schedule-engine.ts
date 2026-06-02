import {
  loadStudyTracks,
  type AppraiserExamMode,
  type StudyTrackId,
  type StudyTracksDocument,
} from "./curriculum-reference";
import {
  assertNoForbiddenCopy,
  assertNoRawTextKeys,
  type ReviewQueueItem,
} from "./execution-review-queue";
import {
  buildTodayPlanFromReviewQueue,
  type TodayPlanTask,
} from "./today-plan-prioritization";

export type StudyScheduleDailyMinutes = 30 | 60 | 90 | 180;
export type StudyScheduleCurrentLevel = "처음 시작" | "조금 공부함" | "기출/답안 경험 있음" | "막판 정리";

export type StudyScheduleEngineInput = {
  examMode: AppraiserExamMode;
  daysUntilExam: number;
  dailyAvailableMinutes: StudyScheduleDailyMinutes;
  currentLevel?: StudyScheduleCurrentLevel;
  weakSubjectName?: string;
  reviewQueueItems?: ReviewQueueItem[];
  todayPlanTasks?: TodayPlanTask[];
  reference?: StudyTracksDocument;
};

export type StudyScheduleBlockKind =
  | "due_review"
  | "primary_task"
  | "weak_node"
  | "explanation_retry"
  | "main_block"
  | "secondary_repair"
  | "deep_work"
  | "mixed_retrieval_rewrite"
  | "decision";

export type StudyScheduleBlock = {
  id: string;
  kind: StudyScheduleBlockKind;
  label: string;
  suggestedMinutes: number;
  priority: "required" | "primary" | "supporting";
  action: string;
  metadataOnly: true;
};

export type StudyScheduleWarning = {
  code: "draft_reference_verification_needed" | "weak_subject_omitted" | "low_time_compression";
  severity: "info" | "caution";
  message: string;
};

export type SelectedStudyTrack = {
  selectedTrackId: StudyTrackId;
  trackLabel: string;
  trackDays: number;
  trackPhase: string;
  trackGoal: string;
  trackDailyFocus: string[];
  trackWeeklyFocus: string[];
  trackRiskHandling: string[];
  recommendedTaskMix: string[];
  scheduleWarnings: StudyScheduleWarning[];
};

export type DailyStudySchedule = SelectedStudyTrack & {
  examMode: AppraiserExamMode;
  daysUntilExam: number;
  dailyAvailableMinutes: StudyScheduleDailyMinutes;
  currentLevel?: StudyScheduleCurrentLevel;
  dailyBlocks: StudyScheduleBlock[];
  weeklyFocus: string[];
  todayPlanPreview: TodayPlanTask[];
  suggestionType: "metadata_suggestion";
};

export type WeeklyStudySchedule = SelectedStudyTrack & {
  examMode: AppraiserExamMode;
  daysUntilExam: number;
  dailyAvailableMinutes: StudyScheduleDailyMinutes;
  dailyBlocks: StudyScheduleBlock[];
  weeklyFocus: string[];
  todayPlanPreview: TodayPlanTask[];
  weekDays: Array<{
    dayIndex: number;
    focus: string;
    dailyBlocks: StudyScheduleBlock[];
    suggestedTotalMinutes: number;
    metadataOnly: true;
  }>;
  suggestionType: "metadata_suggestion";
};

const TRACK_BY_EXAM_AND_DAYS: Record<AppraiserExamMode, Array<{ maxDays: number; trackId: StudyTrackId }>> = {
  first: [
    { maxDays: 30, trackId: "first_30" },
    { maxDays: 60, trackId: "first_60" },
    { maxDays: 90, trackId: "first_90" },
    { maxDays: Number.POSITIVE_INFINITY, trackId: "first_120" },
  ],
  second: [
    { maxDays: 90, trackId: "second_90" },
    { maxDays: 180, trackId: "second_180" },
    { maxDays: Number.POSITIVE_INFINITY, trackId: "second_365" },
  ],
};

const FORBIDDEN_SCHEDULE_COPY_PATTERNS = [
  /instructor/i,
  /\/instructor/i,
  /결제/,
  /payment/i,
  /archive/i,
  /아카이브/,
  /native app/i,
  /네이티브 앱/,
  /통지/,
  /notification/i,
  /calendar/i,
  /캘린더/,
  /공식\s*보장/,
  /공식\s*커버리지/,
  /불합격\s*확정/,
  /지금\s*안\s*하면\s*끝/,
  /큰일/,
  /공포/,
  /망했/,
  /fear/i,
  /fake urgency/i,
];

const RAW_TEXT_FIELD_PATTERN =
  /(rawText|rawOcrText|ocrText|userAnswer|userAnswerText|answerText|rawAnswerText|problemText|questionText|rawQuestionText|uploadedProblemText|fullText|sourceText|copyrightedText|originalText)/i;

function loadedStudyTracks(reference?: StudyTracksDocument) {
  return reference ?? loadStudyTracks();
}

function clampNonNegativeDays(daysUntilExam: number) {
  if (!Number.isFinite(daysUntilExam)) return 0;
  return Math.max(0, Math.floor(daysUntilExam));
}

function assertSupportedExamMode(examMode: AppraiserExamMode) {
  if (examMode !== "first" && examMode !== "second") throw new Error(`Unsupported appraiser exam mode: ${examMode}`);
}

function assertNoForbiddenScheduleCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_SCHEDULE_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden schedule copy is not accepted: ${String(forbidden)}`);
    return;
  }

  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenScheduleCopy);
    return;
  }

  Object.values(value as Record<string, unknown>).forEach(assertNoForbiddenScheduleCopy);
}

function validateOutput<T>(value: T): T {
  assertNoRawTextKeys(value);
  assertNoForbiddenCopy(value);
  assertNoForbiddenScheduleCopy(value);
  return value;
}

function shouldIncludeWeakSubjectName(weakSubjectName?: string) {
  if (!weakSubjectName) return false;
  const normalized = weakSubjectName.replace(/\s+/g, " ").trim();
  if (normalized.length === 0 || normalized.length > 40) return false;
  if (RAW_TEXT_FIELD_PATTERN.test(normalized)) return false;
  if (FORBIDDEN_SCHEDULE_COPY_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return true;
}

function safeWeakSubjectName(weakSubjectName?: string) {
  return shouldIncludeWeakSubjectName(weakSubjectName) ? weakSubjectName?.replace(/\s+/g, " ").trim() : undefined;
}

function taskMinuteTotal(blocks: StudyScheduleBlock[]) {
  return blocks.reduce((total, block) => total + block.suggestedMinutes, 0);
}

function block(
  id: string,
  kind: StudyScheduleBlockKind,
  label: string,
  suggestedMinutes: number,
  priority: StudyScheduleBlock["priority"],
  action: string,
): StudyScheduleBlock {
  return { id, kind, label, suggestedMinutes, priority, action, metadataOnly: true };
}

function blocksForDailyMinutes(minutes: StudyScheduleDailyMinutes, input: StudyScheduleEngineInput): StudyScheduleBlock[] {
  const weakSubject = safeWeakSubjectName(input.weakSubjectName);
  if (minutes === 30) {
    return [
      block("due-review", "due_review", "예정 복습", 10, "required", "정답을 보기 전 먼저 회상합니다."),
      block("one-primary-task", "primary_task", "오늘의 주 과제 1개", 15, "primary", "가장 우선순위가 높은 과제 1개만 실행합니다."),
      block("retry-review-decision", "decision", "재시도 또는 복습 예약", 5, "supporting", "바로 재시도할지, 다음 복습으로 보낼지 정합니다."),
    ];
  }

  if (minutes === 60) {
    return [
      block("due-review", "due_review", "예정 복습", 15, "required", "먼저 떠올리고 짧게 확인합니다."),
      block("weak-node-task", "weak_node", weakSubject ? `${weakSubject} 약점 노드` : "주요 약점 노드", 25, "primary", "오늘 가장 큰 빈틈 1개를 풀거나 써 봅니다."),
      block("explanation-retry", "explanation_retry", "설명 확인 후 재시도", 15, "supporting", "설명을 본 뒤 같은 기준으로 한 번 더 시도합니다."),
      block("schedule-setup", "decision", "다음 복습 고정", 5, "supporting", "틀린 기준 1개만 다음 복습에 연결합니다."),
    ];
  }

  if (minutes === 90) {
    return [
      block("due-review", "due_review", "예정 복습", 15, "required", "누적된 복습 항목부터 회상합니다."),
      block("main-block", "main_block", weakSubject ? `${weakSubject} 메인 블록` : "메인 학습 블록", 45, "primary", "회상 또는 출력 과제를 집중해서 실행합니다."),
      block("secondary-repair", "secondary_repair", "보조 보완 과제", 20, "supporting", "남은 빈틈 1개를 짧게 보완합니다."),
      block("retry-schedule", "decision", "재시도 및 복습 예약", 10, "supporting", "다시 할 항목과 예약할 항목을 분리합니다."),
    ];
  }

  return [
    block("due-review", "due_review", "예정 복습", 20, "required", "복습 큐 항목을 먼저 회상합니다."),
    block("deep-work-1", "deep_work", weakSubject ? `${weakSubject} 깊은 작업 1` : "깊은 작업 1", 50, "primary", "핵심 단원을 길게 풀거나 답안 구조를 씁니다."),
    block("deep-work-2", "deep_work", "깊은 작업 2", 45, "primary", "다른 단원으로 전환해 출력량을 확보합니다."),
    block("mixed-retrieval-rewrite", "mixed_retrieval_rewrite", "혼합 회상·다시쓰기", 45, "supporting", "회상, 계산, 다시쓰기 중 필요한 형식을 섞어 실행합니다."),
    block("adaptation", "decision", "재시도 및 다음 복습 조정", 20, "supporting", "가장 큰 빈틈 1개를 다음 실행으로 넘깁니다."),
  ];
}

function buildTodayPlanPreview(input: StudyScheduleEngineInput) {
  if (input.todayPlanTasks) return input.todayPlanTasks.slice(0, 3);
  if (!input.reviewQueueItems || input.reviewQueueItems.length === 0) return [];
  return buildTodayPlanFromReviewQueue({
    reviewQueueItems: input.reviewQueueItems,
    context: {
      examMode: input.examMode,
      dailyAvailableMinutes: input.dailyAvailableMinutes,
      daysUntilExam: input.daysUntilExam,
      weakSubjectName: safeWeakSubjectName(input.weakSubjectName),
      source: "morning_brief",
    },
  }).slice(0, 3);
}

function weeklyFocusFromTrack(input: StudyScheduleEngineInput, reference: StudyTracksDocument, selectedTrackId: StudyTrackId) {
  const track = reference.tracks[selectedTrackId];
  const focus = [...track.weeklyFocus, ...track.recommendedTaskMix.slice(0, 2)];
  const weakSubject = safeWeakSubjectName(input.weakSubjectName);
  if (weakSubject && (input.dailyAvailableMinutes === 60 || input.dailyAvailableMinutes === 90 || input.dailyAvailableMinutes === 180)) {
    focus.unshift(`${weakSubject} 약점 보완`);
  }
  if (track.riskHandling[0]) focus.push(track.riskHandling[0]);
  if (input.currentLevel) focus.push(`${input.currentLevel} 단계 조정`);
  return [...new Set(focus)].slice(0, 7);
}

export function buildScheduleWarnings(reference: Pick<StudyTracksDocument, "needsOfficialVerification" | "sourceStatus" | "verificationNote">): StudyScheduleWarning[] {
  const warnings: StudyScheduleWarning[] = [];
  if (reference.needsOfficialVerification) {
    warnings.push({
      code: "draft_reference_verification_needed",
      severity: "caution",
      message: `Draft reference verification is still needed before treating this schedule metadata as production-verified. ${reference.verificationNote}`,
    });
  }
  return validateOutput(warnings);
}

export function selectStudyTrack(input: Pick<StudyScheduleEngineInput, "examMode" | "daysUntilExam" | "reference">): SelectedStudyTrack {
  assertNoRawTextKeys(input);
  assertSupportedExamMode(input.examMode);
  const reference = loadedStudyTracks(input.reference);
  const normalizedDays = clampNonNegativeDays(input.daysUntilExam);
  const selectedTrackId = TRACK_BY_EXAM_AND_DAYS[input.examMode].find((entry) => normalizedDays <= entry.maxDays)?.trackId;
  if (!selectedTrackId) throw new Error(`No study track found for ${input.examMode}`);
  const selectedTrack = reference.tracks[selectedTrackId];

  return validateOutput({
    selectedTrackId,
    trackLabel: selectedTrack.label,
    trackDays: selectedTrack.days,
    trackPhase: selectedTrack.phase,
    trackGoal: selectedTrack.goal,
    trackDailyFocus: [...selectedTrack.dailyFocus],
    trackWeeklyFocus: [...selectedTrack.weeklyFocus],
    trackRiskHandling: [...selectedTrack.riskHandling],
    recommendedTaskMix: [...selectedTrack.recommendedTaskMix],
    scheduleWarnings: buildScheduleWarnings(reference),
  });
}

export function compressScheduleForDailyMinutes(schedule: DailyStudySchedule, minutes: StudyScheduleDailyMinutes): DailyStudySchedule {
  const allowedBlocks = blocksForDailyMinutes(minutes, {
    examMode: schedule.examMode,
    daysUntilExam: schedule.daysUntilExam,
    dailyAvailableMinutes: minutes,
    currentLevel: schedule.currentLevel,
  });
  const compressed: DailyStudySchedule = {
    ...schedule,
    dailyAvailableMinutes: minutes,
    dailyBlocks: allowedBlocks.map((entry) => ({ ...entry })),
    todayPlanPreview: schedule.todayPlanPreview.slice(0, 3),
    scheduleWarnings: [
      ...schedule.scheduleWarnings,
      ...(taskMinuteTotal(schedule.dailyBlocks) > minutes
        ? [{ code: "low_time_compression", severity: "info", message: "사용 가능한 시간에 맞춰 보조 블록을 줄였습니다." } satisfies StudyScheduleWarning]
        : []),
    ],
  };
  return validateOutput(compressed);
}

export function buildDailyStudySchedule(input: StudyScheduleEngineInput): DailyStudySchedule {
  assertNoRawTextKeys(input);
  assertSupportedExamMode(input.examMode);
  const reference = loadedStudyTracks(input.reference);
  const selected = selectStudyTrack({ examMode: input.examMode, daysUntilExam: input.daysUntilExam, reference });
  const weakSubject = safeWeakSubjectName(input.weakSubjectName);
  const weakSubjectWarning: StudyScheduleWarning[] = input.weakSubjectName && !weakSubject
    ? [{ code: "weak_subject_omitted", severity: "info", message: "약점 과목명은 안전한 메타데이터일 때만 일정 라벨에 표시합니다." }]
    : [];
  const schedule: DailyStudySchedule = {
    ...selected,
    examMode: input.examMode,
    daysUntilExam: clampNonNegativeDays(input.daysUntilExam),
    dailyAvailableMinutes: input.dailyAvailableMinutes,
    currentLevel: input.currentLevel,
    dailyBlocks: blocksForDailyMinutes(input.dailyAvailableMinutes, input),
    weeklyFocus: weeklyFocusFromTrack(input, reference, selected.selectedTrackId),
    todayPlanPreview: buildTodayPlanPreview(input),
    scheduleWarnings: [...selected.scheduleWarnings, ...weakSubjectWarning],
    suggestionType: "metadata_suggestion",
  };
  return validateOutput(schedule);
}

export function buildWeeklyStudySchedule(input: StudyScheduleEngineInput): WeeklyStudySchedule {
  const daily = buildDailyStudySchedule(input);
  const weekDays = Array.from({ length: 7 }, (_, index) => ({
    dayIndex: index + 1,
    focus: daily.weeklyFocus[index % daily.weeklyFocus.length] ?? "retrieval",
    dailyBlocks: daily.dailyBlocks.map((entry) => ({ ...entry })),
    suggestedTotalMinutes: Math.min(input.dailyAvailableMinutes, taskMinuteTotal(daily.dailyBlocks)),
    metadataOnly: true as const,
  }));
  return validateOutput({
    ...daily,
    weekDays,
  });
}
