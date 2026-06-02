import {
  buildCurriculumNextAction,
  normalizeCurriculumTaskType,
  type CurriculumLearningSignal,
  type CurriculumNextAction,
  type CurriculumSignalSourceType,
} from "./curriculum-engine";
import {
  type AppraiserCurriculumReference,
  type AppraiserExamMode,
  loadAppraiserCurriculumReference,
} from "./curriculum-reference";

export type BeginnerCurrentLevel = "처음 시작" | "조금 공부함" | "기출/답안 경험 있음" | "막판 정리";
export type BeginnerPreferredStart = "O/X" | "개념 회상" | "회계 계산틀" | "2차 다시쓰기" | "CASIO" | "쟁점 찾기";
export type BeginnerDailyAvailableMinutes = 30 | 60 | 90 | 180;

export type BeginnerFirstPlanInput = {
  examMode: AppraiserExamMode;
  daysUntilExam: number;
  dailyAvailableMinutes: BeginnerDailyAvailableMinutes;
  currentLevel: BeginnerCurrentLevel;
  weakSubjectId?: string;
  weakSubjectName?: string;
  preferredStart?: BeginnerPreferredStart;
};

export type BeginnerTodayPlanTask = {
  id: string;
  taskType: string;
  title: string;
  rationale: string;
  estimatedMinutes: number;
  nextStep: string;
};

export type BeginnerFirstPlan = {
  onboardingSummary: {
    examModeLabel: "감정평가사 1차" | "감정평가사 2차";
    daysUntilExam: number;
    dailyAvailableMinutes: BeginnerDailyAvailableMinutes;
    currentLevel: BeginnerCurrentLevel;
    weakSubjectName: string | null;
    preferredStart: BeginnerPreferredStart | null;
    biggestFocus: string;
    recoveryLine: string;
  };
  inferredSignal: CurriculumLearningSignal;
  curriculumNextAction: CurriculumNextAction;
  todayPlan: BeginnerTodayPlanTask[];
  planWarnings: string[];
};

const MAX_TODAY_PLAN_TASKS = 3;
const DRAFT_PLAN_WARNING = "커리큘럼 기준은 초안 메타데이터이므로 공식 범위 확정처럼 사용하지 않고, 오늘 실행 순서 참고용으로만 둡니다.";

function clampDaysUntilExam(daysUntilExam: number) {
  if (!Number.isFinite(daysUntilExam)) return 90;
  return Math.max(0, Math.round(daysUntilExam));
}

function normalizeDailyAvailableMinutes(minutes: number): BeginnerDailyAvailableMinutes {
  if (minutes <= 30) return 30;
  if (minutes <= 60) return 60;
  if (minutes <= 90) return 90;
  return 180;
}

function examModeLabel(examMode: AppraiserExamMode) {
  return examMode === "first" ? "감정평가사 1차" : "감정평가사 2차";
}

function defaultWeakSubjectName(examMode: AppraiserExamMode) {
  return examMode === "first" ? "민법" : "감정평가이론";
}

function firstPreferredTask(preferredStart?: BeginnerPreferredStart) {
  if (preferredStart === "회계 계산틀") return "accounting template";
  if (preferredStart === "개념 회상") return "cloze";
  return "O/X";
}

function secondPreferredTask(preferredStart?: BeginnerPreferredStart) {
  if (preferredStart === "CASIO") return "CASIO";
  if (preferredStart === "2차 다시쓰기") return "rewrite";
  if (preferredStart === "쟁점 찾기") return "issue spotting";
  return "issue spotting";
}

function sourceTypeForPreferredStart(preferredStart: BeginnerPreferredStart | undefined): CurriculumSignalSourceType | undefined {
  switch (preferredStart) {
    case "O/X":
      return "ox";
    case "개념 회상":
      return "cloze";
    case "회계 계산틀":
      return "accounting_template";
    case "2차 다시쓰기":
      return "rewrite";
    case "CASIO":
      return "casio";
    case "쟁점 찾기":
      return "issue_spotting";
    default:
      return undefined;
  }
}

function inferSignal(input: BeginnerFirstPlanInput): CurriculumLearningSignal {
  const daysUntilExam = clampDaysUntilExam(input.daysUntilExam);
  const subjectName = input.weakSubjectName?.trim() || defaultWeakSubjectName(input.examMode);
  const taskType = input.examMode === "first"
    ? firstPreferredTask(input.preferredStart)
    : secondPreferredTask(input.preferredStart);
  const result = input.currentLevel === "막판 정리"
    ? "missed"
    : input.examMode === "second" && input.preferredStart === "2차 다시쓰기"
      ? "needs_rewrite"
      : "unknown";

  return {
    examMode: input.examMode,
    subjectId: input.weakSubjectId,
    subjectName,
    taskType,
    sourceType: sourceTypeForPreferredStart(input.preferredStart),
    confidence: input.currentLevel === "기출/답안 경험 있음" ? "medium" : "low",
    result,
    daysUntilExam,
    isDue: input.currentLevel === "막판 정리",
    recentMissCount: input.currentLevel === "막판 정리" ? 1 : 0,
    isFailRiskSubject: input.currentLevel === "막판 정리" || daysUntilExam <= 30,
    missingIssueCandidate: input.examMode === "second" && (input.preferredStart === "쟁점 찾기" || !input.preferredStart) ? "첫 쟁점 후보" : undefined,
    weakStructurePoint: input.examMode === "second" ? "오늘 보정할 문단 구조 1곳" : undefined,
  };
}

function minutesForTask(estimatedMinutes: number, dailyAvailableMinutes: BeginnerDailyAvailableMinutes) {
  if (dailyAvailableMinutes === 30) return Math.min(estimatedMinutes, 10);
  if (dailyAvailableMinutes === 60) return Math.min(estimatedMinutes, 15);
  if (dailyAvailableMinutes === 90) return Math.min(Math.max(estimatedMinutes, 10), 20);
  return Math.min(Math.max(estimatedMinutes, 10), 30);
}

function nextStepForTask(taskType: string, examMode: AppraiserExamMode) {
  const normalized = normalizeCurriculumTaskType(taskType);
  if (normalized === "O/X") return "맞다/아니다를 먼저 판단하고 헷갈린 기준 1개만 표시합니다.";
  if (normalized === "cloze") return "해설 전에 핵심어를 빈칸처럼 먼저 떠올립니다.";
  if (normalized === "accounting template") return "문제 전문 대신 입력값·산식·검산 위치만 분리합니다.";
  if (normalized === "CASIO") return "계산기 입력 순서와 단위 확인 지점을 짧게 재현합니다.";
  if (normalized === "issue spotting") return "답안 작성 전에 빠질 수 있는 쟁점 후보 1개를 표시합니다.";
  if (normalized === "rewrite") return "전체 모의고사 대신 한 문단만 다시 씁니다.";
  return examMode === "first" ? "짧게 회상한 뒤 다음 복습 여부를 정합니다." : "한 쟁점만 답안 행동으로 바꿉니다.";
}

function biggestFocus(input: BeginnerFirstPlanInput, action: CurriculumNextAction) {
  const target = action.classification.unitName ?? action.classification.subjectName ?? input.weakSubjectName ?? defaultWeakSubjectName(input.examMode);
  if (input.currentLevel === "막판 정리") return `${target}에서 오늘 회수할 약점 1개`;
  if (input.examMode === "first") return `${target} 기준을 설명 전에 먼저 회상하기`;
  return `${target} 쟁점 1개를 짧은 답안 행동으로 바꾸기`;
}

function recoveryLine(currentLevel: BeginnerCurrentLevel) {
  if (currentLevel === "막판 정리") return "남은 기간에는 새로 넓히기보다 놓친 노드를 차분히 회수합니다.";
  if (currentLevel === "처음 시작") return "처음에는 많이 맞히는 것보다 다음 기록을 만들 수 있는 작은 과제가 우선입니다.";
  return "틀린 기록은 판단 자료입니다. 오늘은 한 가지 빈틈만 줄이면 충분합니다.";
}

function toTodayPlan(input: BeginnerFirstPlanInput, action: CurriculumNextAction): BeginnerTodayPlanTask[] {
  const seen = new Set<string>();
  const tasks: BeginnerTodayPlanTask[] = [];
  for (const candidate of action.candidates) {
    const normalized = normalizeCurriculumTaskType(candidate.taskType) ?? candidate.taskType;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tasks.push({
      id: candidate.id,
      taskType: candidate.taskType,
      title: candidate.title,
      rationale: candidate.rationale,
      estimatedMinutes: minutesForTask(candidate.estimatedMinutes, input.dailyAvailableMinutes),
      nextStep: nextStepForTask(candidate.taskType, input.examMode),
    });
    if (tasks.length >= MAX_TODAY_PLAN_TASKS) break;
  }
  return tasks;
}

export function buildBeginnerFirstPlan(
  rawInput: BeginnerFirstPlanInput,
  reference: AppraiserCurriculumReference = loadAppraiserCurriculumReference(),
): BeginnerFirstPlan {
  const input: BeginnerFirstPlanInput = {
    ...rawInput,
    daysUntilExam: clampDaysUntilExam(rawInput.daysUntilExam),
    dailyAvailableMinutes: normalizeDailyAvailableMinutes(rawInput.dailyAvailableMinutes),
    weakSubjectName: rawInput.weakSubjectName?.trim() || undefined,
    preferredStart: rawInput.preferredStart,
  };
  const inferredSignal = inferSignal(input);
  const curriculumNextAction = buildCurriculumNextAction(inferredSignal, reference);
  const todayPlan = toTodayPlan(input, curriculumNextAction).slice(0, MAX_TODAY_PLAN_TASKS);
  const planWarnings = [...curriculumNextAction.classification.warnings];
  if (reference.verificationStatus.sourceStatuses.some((source) => source.needsOfficialVerification)) {
    planWarnings.push(DRAFT_PLAN_WARNING);
  }

  return {
    onboardingSummary: {
      examModeLabel: examModeLabel(input.examMode),
      daysUntilExam: input.daysUntilExam,
      dailyAvailableMinutes: input.dailyAvailableMinutes,
      currentLevel: input.currentLevel,
      weakSubjectName: input.weakSubjectName ?? null,
      preferredStart: input.preferredStart ?? null,
      biggestFocus: biggestFocus(input, curriculumNextAction),
      recoveryLine: recoveryLine(input.currentLevel),
    },
    inferredSignal,
    curriculumNextAction,
    todayPlan,
    planWarnings: Array.from(new Set(planWarnings)),
  };
}
