import {
  APPRAISAL_FIRST_SUBJECTS,
  APPRAISAL_SECOND_SUBJECTS,
  type StudyProfile,
} from "./types";

export type AppraisalMode = "first" | "second";

export type AppraisalModeConfig = {
  mode: AppraisalMode;
  label: "감정평가사 1차" | "감정평가사 2차";
  shortLabel: "감평 1차" | "감평 2차";
  artifactType: "first_wrong_answer" | "second_correction";
  noteKind: "오답노트" | "교정노트";
  pageTitle: string;
  pageDescription: string;
  primaryCta: string;
  secondaryCta: string;
  captureTitle: string;
  captureDescription: string;
  subjectLabel: string;
  subjects: readonly string[];
  emptyTitle: string;
  emptyDescription: string;
  recentTitle: string;
  recentDescription: string;
  priorityCopy: string;
  nextActionFallback: string;
};

export const APPRAISAL_MODE_CONFIG = {
  first: {
    mode: "first",
    label: "감정평가사 1차",
    shortLabel: "감평 1차",
    artifactType: "first_wrong_answer",
    noteKind: "오답노트",
    pageTitle: "감평 1차 오늘의 운영",
    pageDescription: "과목별 오답과 복습 큐를 기준으로 오늘 다시 볼 항목을 정리합니다.",
    primaryCta: "오답 기록 시작",
    secondaryCta: "복습 큐 보기",
    captureTitle: "1차 오답 기록",
    captureDescription: "문제 자료를 올리고 정답, 내가 고른 답, 틀린 이유만 확인해 오답노트로 저장합니다.",
    subjectLabel: "1차 과목",
    subjects: APPRAISAL_FIRST_SUBJECTS,
    emptyTitle: "1차 오답 1개로 시작하세요",
    emptyDescription: "오늘 본 과목을 선택하고 오답 1개를 기록하세요. 과목을 고르면 오늘 할 일과 복습 큐에 반영됩니다.",
    recentTitle: "최근 오답",
    recentDescription: "반복 오답, 시간 초과, 확신 불일치를 줄이기 위한 기록입니다.",
    priorityCopy: "오늘 줄일 반복 오답과 과목별 우선순위만 남깁니다.",
    nextActionFallback: "오늘 본 과목을 선택하고 오답 1개를 기록하세요.",
  },
  second: {
    mode: "second",
    label: "감정평가사 2차",
    shortLabel: "감평 2차",
    artifactType: "second_correction",
    noteKind: "교정노트",
    pageTitle: "감평 2차 답안 운영",
    pageDescription: "작성한 답안/강의 정리/필기 중 하나를 올리고, 오늘 보강할 논점 하나를 정리합니다.",
    primaryCta: "2차 작성 워크스페이스 시작",
    secondaryCta: "최근 교정 보기",
    captureTitle: "2차 답안 비교",
    captureDescription: "사례 메모, 강의/교재 정리, 내 답안에서 보강할 논점 하나를 학습 노트로 저장합니다.",
    subjectLabel: "2차 과목",
    subjects: APPRAISAL_SECOND_SUBJECTS,
    emptyTitle: "2차 답안 한 건으로 시작하세요",
    emptyDescription: "오늘 본 과목을 선택하고 답안/강의 정리/필기 중 하나를 올리세요. 과목을 고르면 보강할 논점과 다음 복습에 반영됩니다.",
    recentTitle: "최근 교정 / 다시쓰기 흐름",
    recentDescription: "비교에서 잡힌 누락 논점과 다음 다시쓰기 행동입니다.",
    priorityCopy: "오늘 보강할 누락 논점과 다시쓰기 행동 하나만 남깁니다.",
    nextActionFallback: "오늘 본 과목을 선택하고 답안/강의 정리/필기 중 하나를 올리세요.",
  },
} as const satisfies Record<AppraisalMode, AppraisalModeConfig>;

const FIRST_MODE_ALIASES = new Set(["first", "1", "1차", "감평 1차", "감정평가사 1차"]);
const SECOND_MODE_ALIASES = new Set(["second", "2", "2차", "감평 2차", "감정평가사 2차"]);

export function parseAppraisalMode(value?: string | null): AppraisalMode | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (FIRST_MODE_ALIASES.has(normalized)) return "first";
  if (SECOND_MODE_ALIASES.has(normalized)) return "second";
  return null;
}

export function getAppraisalMode(examName?: string | null): AppraisalMode {
  return parseAppraisalMode(examName) ?? "first";
}

export function resolveAppraisalMode(profile?: Pick<StudyProfile, "examName"> | null, modeParam?: string | null) {
  return parseAppraisalMode(modeParam) ?? parseAppraisalMode(profile?.examName) ?? "first";
}

export function getModeConfig(mode: AppraisalMode) {
  return APPRAISAL_MODE_CONFIG[mode];
}

export function getModeLabel(mode: AppraisalMode) {
  return APPRAISAL_MODE_CONFIG[mode].label;
}

export function getProfileMode(profile?: Pick<StudyProfile, "examName"> | null) {
  return resolveAppraisalMode(profile);
}

export function getDefaultSubject(mode: AppraisalMode) {
  return APPRAISAL_MODE_CONFIG[mode].subjects[0];
}

export function getSubjectOptions(mode: AppraisalMode) {
  return APPRAISAL_MODE_CONFIG[mode].subjects;
}

export function isSubjectAllowedForMode(subject: string | undefined | null, mode: AppraisalMode) {
  return Boolean(subject && (APPRAISAL_MODE_CONFIG[mode].subjects as readonly string[]).includes(subject));
}

export function normalizeSubjectForMode(subject: string | undefined | null, mode: AppraisalMode) {
  return isSubjectAllowedForMode(subject, mode) ? subject! : getDefaultSubject(mode);
}

export function normalizePreferredSubjectsForMode(subjects: string[] | undefined | null, mode: AppraisalMode) {
  const allowed = new Set<string>(APPRAISAL_MODE_CONFIG[mode].subjects);
  const normalized = (subjects ?? []).filter((subject) => allowed.has(subject));
  return normalized.length > 0 ? normalized : [getDefaultSubject(mode)];
}

export function resolveModeState(profile?: Pick<StudyProfile, "examName"> | null, modeParam?: string | null) {
  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  return {
    mode,
    config,
    subjects: config.subjects,
    label: config.label,
    shortLabel: config.shortLabel,
    artifactType: config.artifactType,
    noteKind: config.noteKind,
  };
}

export function isSecondModeLabel(value: string) {
  return parseAppraisalMode(value) === "second";
}
