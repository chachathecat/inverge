export type FirstExamSubject = {
  id: string;
  name: string;
  category: "law" | "economics" | "real-estate" | "accounting";
  focus: string;
  defaultSetSize: number;
  abilityScores: FirstExamAbility[];
  weakUnits: string[];
};

export type FirstExamAbility = {
  label: string;
  score: number;
  description: string;
};

export type FirstExamSetRecord = {
  id: string;
  subjectId: string;
  title: string;
  totalQuestions: number;
  correctCount: number;
  elapsedMinutes: number;
  mistakePattern: string;
  completedAt: string;
};

export type ReviewQueueItem = {
  id: string;
  subjectId: string;
  title: string;
  reason: string;
  priority: "today" | "week" | "maintenance";
  count: number;
};

export const APPRAISER_FIRST_EXAM = {
  id: "appraiser-first",
  name: "감정평가사 1차",
  sessionLabel: "2026년 1차 대비",
  dDay: 73,
  subjects: [
    {
      id: "civil-law",
      name: "민법",
      category: "law",
      focus: "선지 판단 정확도",
      defaultSetSize: 25,
      abilityScores: [
        { label: "정확도", score: 68, description: "기본 개념 문제는 안정적입니다." },
        { label: "선지 판단 정확도", score: 61, description: "헷갈린 선지를 다시 확인해야 합니다." },
        { label: "법규 회상력", score: 58, description: "조문형 기억이 아직 흔들립니다." },
      ],
      weakUnits: ["의사표시", "대리", "물권 변동"],
    },
    {
      id: "economics",
      name: "경제학원론",
      category: "economics",
      focus: "시간 운영",
      defaultSetSize: 20,
      abilityScores: [
        { label: "정확도", score: 63, description: "개념 적용 문제에서 변동이 있습니다." },
        { label: "시간 운영", score: 55, description: "그래프 문제에서 시간이 늘어납니다." },
        { label: "계산 안정성", score: 60, description: "계산 실수는 줄일 여지가 있습니다." },
      ],
      weakUnits: ["수요공급", "탄력성", "국민소득"],
    },
    {
      id: "real-estate",
      name: "부동산학원론",
      category: "real-estate",
      focus: "정확도",
      defaultSetSize: 25,
      abilityScores: [
        { label: "정확도", score: 71, description: "개념형 문제는 비교적 안정적입니다." },
        { label: "선지 판단 정확도", score: 64, description: "비슷한 개념 선지에서 흔들립니다." },
        { label: "시간 운영", score: 76, description: "풀이 속도는 안정권에 가깝습니다." },
      ],
      weakUnits: ["입지론", "투자론", "정책론"],
    },
    {
      id: "appraisal-law",
      name: "감정평가관계법규",
      category: "law",
      focus: "법규 회상력",
      defaultSetSize: 25,
      abilityScores: [
        { label: "정확도", score: 57, description: "법규 과목 중 가장 먼저 관리해야 합니다." },
        { label: "법규 회상력", score: 52, description: "반복 회상 루틴이 필요합니다." },
        { label: "선지 판단 정확도", score: 59, description: "예외 규정 선지에서 오답이 반복됩니다." },
      ],
      weakUnits: ["감정평가법", "토지보상법", "부동산공시법"],
    },
    {
      id: "accounting",
      name: "회계학",
      category: "accounting",
      focus: "계산 안정성",
      defaultSetSize: 20,
      abilityScores: [
        { label: "정확도", score: 60, description: "기본 문제는 맞히지만 변동성이 큽니다." },
        { label: "계산 안정성", score: 54, description: "단순 계산 실수가 반복됩니다." },
        { label: "시간 운영", score: 57, description: "계산 문제에 시간이 몰립니다." },
      ],
      weakUnits: ["재고자산", "감가상각", "원가흐름"],
    },
  ] satisfies FirstExamSubject[],
};

export const FIRST_EXAM_ABILITIES: FirstExamAbility[] = [
  { label: "정확도", score: 64, description: "전체 세트 기준 정답률은 아직 안정화 전입니다." },
  { label: "시간 운영", score: 58, description: "경제학과 회계학에서 시간이 늘어납니다." },
  { label: "선지 판단 정확도", score: 62, description: "헷갈린 선지를 지우는 기준이 필요합니다." },
  { label: "법규 회상력", score: 55, description: "법규 과목은 반복 회상 큐가 우선입니다." },
  { label: "계산 안정성", score: 56, description: "계산 과목은 정확도보다 실수 통제가 먼저입니다." },
];

export const FIRST_EXAM_SET_RECORDS: FirstExamSetRecord[] = [
  {
    id: "set-1",
    subjectId: "appraisal-law",
    title: "감정평가관계법규 기출 25문항",
    totalQuestions: 25,
    correctCount: 15,
    elapsedMinutes: 31,
    mistakePattern: "예외 규정 회상 실패",
    completedAt: "오늘",
  },
  {
    id: "set-2",
    subjectId: "accounting",
    title: "회계학 계산 20문항",
    totalQuestions: 20,
    correctCount: 12,
    elapsedMinutes: 34,
    mistakePattern: "계산 과정 중간값 누락",
    completedAt: "어제",
  },
  {
    id: "set-3",
    subjectId: "civil-law",
    title: "민법 총칙 25문항",
    totalQuestions: 25,
    correctCount: 18,
    elapsedMinutes: 27,
    mistakePattern: "선지 표현 오독",
    completedAt: "3일 전",
  },
];

export const FIRST_EXAM_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "rq-1",
    subjectId: "appraisal-law",
    title: "감정평가법 예외 규정",
    reason: "최근 3세트에서 같은 유형의 회상 실패가 반복되었습니다.",
    priority: "today",
    count: 12,
  },
  {
    id: "rq-2",
    subjectId: "accounting",
    title: "재고자산 계산 실수",
    reason: "정답 접근은 맞지만 계산 중간값 누락이 반복됩니다.",
    priority: "today",
    count: 8,
  },
  {
    id: "rq-3",
    subjectId: "civil-law",
    title: "의사표시 선지 판단",
    reason: "정답률보다 헷갈림 표시가 높게 남아 있습니다.",
    priority: "week",
    count: 10,
  },
];

export function getFirstExamSubject(subjectId = "appraisal-law") {
  return (
    APPRAISER_FIRST_EXAM.subjects.find((subject) => subject.id === subjectId) ??
    APPRAISER_FIRST_EXAM.subjects[0]
  );
}

export function firstExamSubjectPath(subjectId = "appraisal-law") {
  return `/exams/appraiser-first/first/${subjectId}`;
}

export function firstExamSetInputPath(subjectId = "appraisal-law") {
  return `/exams/appraiser-first/first/${subjectId}/set-input`;
}

export function firstExamReviewQueuePath(subjectId = "appraisal-law") {
  return `/exams/appraiser-first/first/${subjectId}/review-queue`;
}
