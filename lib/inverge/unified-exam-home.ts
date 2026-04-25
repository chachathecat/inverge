export type UnifiedExamStage = "first" | "second";

export type UnifiedExamHomeScenario = "cold-start" | "first-stage-only" | "second-stage-in-progress";

export type UnifiedNextAction = {
  id: string;
  stage: UnifiedExamStage;
  label: string;
  description: string;
  href: string;
  priorityReason: "complete-required-start" | "continue-recent" | "resume-loop" | "start-second-stage";
};

export type StageSummaryItem = {
  label: string;
  href: string;
  meta?: string;
};

export type UnifiedStageSummary = {
  stage: UnifiedExamStage;
  label: "1차" | "2차";
  available: boolean;
  currentLoop: string;
  quietSummary: string;
  primaryHref: string;
  primaryLabel: string;
  recentItems: StageSummaryItem[];
};

export type UnifiedActivityItem = {
  id: string;
  stage: UnifiedExamStage;
  label: string;
  href: string;
  createdAtLabel: string;
};

export type UnifiedExamHomeState = {
  scenario: UnifiedExamHomeScenario;
  exam: {
    id: "appraiser";
    name: "감정평가사";
    currentSessionLabel: string;
  };
  activeStage: UnifiedExamStage;
  nextAction: UnifiedNextAction;
  firstStage: UnifiedStageSummary;
  secondStage: UnifiedStageSummary;
  recentActivity: UnifiedActivityItem[];
};

export function readUnifiedExamHomeScenario(value?: string): UnifiedExamHomeScenario {
  if (value === "cold-start" || value === "first-stage-only" || value === "second-stage-in-progress") {
    return value;
  }

  return "second-stage-in-progress";
}

const FIRST_ONBOARDING = "/exams/appraiser-first/first/onboarding";
const FIRST_REVIEW = "/exams/appraiser-first/first/appraisal-law/review-queue";
const FIRST_RECORDS = "/exams/appraiser-first/first/records";
const SECOND_WRITE = "/exams/appraiser-second/2026-1/practice/write";
const SECOND_REWRITE = "/exams/appraiser-second/2026-1/practice/rewrite/latest";

function buildColdStartState(): UnifiedExamHomeState {
  const firstStage: UnifiedStageSummary = {
    stage: "first",
    label: "1차",
    available: true,
    currentLoop: "onboarding",
    quietSummary: "아직 시험 준비 흐름이 시작되지 않았습니다. 먼저 현재 준비 상태를 정리합니다.",
    primaryHref: FIRST_ONBOARDING,
    primaryLabel: "1차 준비 상태 정리",
    recentItems: [],
  };
  const secondStage: UnifiedStageSummary = {
    stage: "second",
    label: "2차",
    available: true,
    currentLoop: "write",
    quietSummary: "2차는 답안 작성부터 시작할 수 있습니다. 실무 답안 한 편이 첫 기록이 됩니다.",
    primaryHref: SECOND_WRITE,
    primaryLabel: "실무 답안 쓰기",
    recentItems: [],
  };

  return {
    scenario: "cold-start",
    exam: {
      id: "appraiser",
      name: "감정평가사",
      currentSessionLabel: "2026년 대비",
    },
    activeStage: "first",
    nextAction: {
      id: "first-onboarding",
      stage: "first",
      label: "1차 준비 상태 정리",
      description: "처음에는 문제를 풀기보다 현재 과목별 출발점을 정리합니다.",
      href: FIRST_ONBOARDING,
      priorityReason: "complete-required-start",
    },
    firstStage,
    secondStage,
    recentActivity: [],
  };
}

function buildFirstStageOnlyState(): UnifiedExamHomeState {
  const firstStage: UnifiedStageSummary = {
    stage: "first",
    label: "1차",
    available: true,
    currentLoop: "review",
    quietSummary: "최근에는 감정평가관계법규 오답 복습 흐름이 이어지고 있습니다.",
    primaryHref: FIRST_REVIEW,
    primaryLabel: "법규 복습 이어가기",
    recentItems: [
      { label: "감정평가관계법규 오답 12문제", href: FIRST_REVIEW, meta: "오늘" },
      { label: "회계학 계산 세트", href: "/exams/appraiser-first/first/accounting/set-input", meta: "어제" },
    ],
  };
  const secondStage: UnifiedStageSummary = {
    stage: "second",
    label: "2차",
    available: true,
    currentLoop: "write",
    quietSummary: "아직 2차 답안 기록은 없습니다. 필요하면 실무 답안 작성부터 시작합니다.",
    primaryHref: SECOND_WRITE,
    primaryLabel: "실무 답안 쓰기",
    recentItems: [],
  };

  return {
    scenario: "first-stage-only",
    exam: {
      id: "appraiser",
      name: "감정평가사",
      currentSessionLabel: "2026년 대비",
    },
    activeStage: "first",
    nextAction: {
      id: "first-review",
      stage: "first",
      label: "법규 복습 이어가기",
      description: "최근 반복된 오답 유형을 먼저 정리합니다.",
      href: FIRST_REVIEW,
      priorityReason: "continue-recent",
    },
    firstStage,
    secondStage,
    recentActivity: [
      { id: "a1", stage: "first", label: "감정평가관계법규 오답 복습", href: FIRST_REVIEW, createdAtLabel: "오늘" },
      { id: "a2", stage: "first", label: "회계학 계산 세트", href: "/exams/appraiser-first/first/accounting/set-input", createdAtLabel: "어제" },
    ],
  };
}

function buildSecondStageInProgressState(): UnifiedExamHomeState {
  const firstStage: UnifiedStageSummary = {
    stage: "first",
    label: "1차",
    available: true,
    currentLoop: "records",
    quietSummary: "1차 복습 흐름은 유지되고 있습니다. 필요할 때 기록에서 이어갈 수 있습니다.",
    primaryHref: FIRST_RECORDS,
    primaryLabel: "1차 기록 보기",
    recentItems: [{ label: "민법 복습 큐", href: "/exams/appraiser-first/first/civil-law/review-queue", meta: "최근" }],
  };
  const secondStage: UnifiedStageSummary = {
    stage: "second",
    label: "2차",
    available: true,
    currentLoop: "rewrite",
    quietSummary: "최근 실무 답안에서는 계산 후 결론 문장 교정이 이어졌습니다.",
    primaryHref: SECOND_REWRITE,
    primaryLabel: "실무 교정 이어가기",
    recentItems: [
      { label: "실무 답안 작성", href: "/exams/appraiser-second/2026-1/practice/compare/latest", meta: "오늘" },
      { label: "계산-판단 연결 교정", href: SECOND_REWRITE, meta: "오늘" },
    ],
  };

  return {
    scenario: "second-stage-in-progress",
    exam: {
      id: "appraiser",
      name: "감정평가사",
      currentSessionLabel: "2026년 대비",
    },
    activeStage: "second",
    nextAction: {
      id: "second-rewrite",
      stage: "second",
      label: "실무 교정 이어가기",
      description: "계산 결과를 판단 문장으로 연결하는 교정본을 마무리합니다.",
      href: SECOND_REWRITE,
      priorityReason: "resume-loop",
    },
    firstStage,
    secondStage,
    recentActivity: [
      { id: "a1", stage: "second", label: "실무 답안 비교", href: "/exams/appraiser-second/2026-1/practice/compare/latest", createdAtLabel: "오늘" },
      { id: "a2", stage: "second", label: "계산-판단 연결 교정", href: SECOND_REWRITE, createdAtLabel: "오늘" },
      { id: "a3", stage: "first", label: "민법 복습 큐", href: "/exams/appraiser-first/first/civil-law/review-queue", createdAtLabel: "최근" },
    ],
  };
}

export function buildUnifiedExamHomeState(scenario: UnifiedExamHomeScenario = "second-stage-in-progress") {
  if (scenario === "cold-start") return buildColdStartState();
  if (scenario === "first-stage-only") return buildFirstStageOnlyState();
  return buildSecondStageInProgressState();
}
