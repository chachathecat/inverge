import type { QuestionDifficulty, SubjectId } from "@/lib/appraisal-first/types";
import { getSeedCurriculumMappings, type AdminCurriculumSubjectId } from "@/lib/inverge/admin-curriculum";

export type AdminSetSubjectId = SubjectId;

export type ReviewCandidateFlags = {
  lowConfidence: boolean;
  flagged: boolean;
  timeOveruse: boolean;
};

export type AdminQuestionMetadata = {
  id: string;
  questionId: string;
  setId: string;
  number: number;
  subjectId: AdminSetSubjectId;
  unit: string;
  difficulty: QuestionDifficulty;
  curriculumNodeIds: string[];
  expectedTimeSeconds: number;
  timeOveruseThresholdSeconds: number;
  reviewCandidateFlags: ReviewCandidateFlags;
  active: boolean;
  operatorNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSetMetadata = {
  id: string;
  setId: string;
  setTitle: string;
  examId: string;
  subjectId: AdminSetSubjectId;
  sourceLabel: string;
  sourceYear?: number;
  timeLimitMinutes: number;
  active: boolean;
  operatorNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSetRecord = {
  set: AdminSetMetadata;
  questions: AdminQuestionMetadata[];
};

export type AdminSetListItem = AdminSetMetadata & {
  questionCount: number;
  activeQuestionCount: number;
  connectedCurriculumCount: number;
};

export type AdminSetListResponse = {
  subjectId: AdminSetSubjectId | "all";
  sets: AdminSetListItem[];
};

export type AdminSetDetailResponse = {
  set: AdminSetMetadata;
  questions: AdminQuestionMetadata[];
  summary: {
    totalQuestions: number;
    activeQuestions: number;
    connectedQuestions: number;
  };
};

export type AdminSetMetadataSaveInput = Omit<AdminSetMetadata, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type AdminQuestionMetadataSaveInput = Omit<AdminQuestionMetadata, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export const ADMIN_SET_SUBJECTS: Array<{ id: AdminSetSubjectId; label: string }> = [
  { id: "civil_law", label: "민법" },
  { id: "economics", label: "경제학원론" },
  { id: "real_estate", label: "부동산학원론" },
  { id: "appraisal_law", label: "감정평가관계법규" },
  { id: "accounting", label: "회계학" },
];

function nowIso() {
  return new Date().toISOString();
}

function curriculumSubject(subjectId: AdminSetSubjectId): AdminCurriculumSubjectId | null {
  if (subjectId === "civil_law" || subjectId === "appraisal_law") return subjectId;
  return null;
}

function buildCurriculumNodeIds(subjectId: AdminSetSubjectId, questionId: string) {
  const mappedSubjectId = curriculumSubject(subjectId);
  if (!mappedSubjectId) return [];

  const mapping = getSeedCurriculumMappings(mappedSubjectId).find((item) => item.questionId === questionId);
  if (!mapping) return [];
  return [mapping.primaryNodeId, ...mapping.linkedNodeIds];
}

function buildQuestion(
  subjectId: AdminSetSubjectId,
  setId: string,
  seed: {
    questionId: string;
    number: number;
    unit: string;
    difficulty: QuestionDifficulty;
    expectedTimeSeconds: number;
  },
): AdminQuestionMetadata {
  const now = nowIso();
  const curriculumNodeIds = buildCurriculumNodeIds(subjectId, seed.questionId);

  return {
    id: `${setId}:${seed.questionId}`,
    questionId: seed.questionId,
    setId,
    number: seed.number,
    subjectId,
    unit: seed.unit,
    difficulty: seed.difficulty,
    curriculumNodeIds,
    expectedTimeSeconds: seed.expectedTimeSeconds,
    timeOveruseThresholdSeconds: seed.expectedTimeSeconds + 30,
    reviewCandidateFlags: {
      lowConfidence: true,
      flagged: false,
      timeOveruse: true,
    },
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSetRecord(seed: {
  setId: string;
  setTitle: string;
  examId: string;
  subjectId: AdminSetSubjectId;
  sourceLabel: string;
  sourceYear?: number;
  timeLimitMinutes: number;
  questions: Array<{
    questionId: string;
    number: number;
    unit: string;
    difficulty: QuestionDifficulty;
    expectedTimeSeconds: number;
  }>;
}): AdminSetRecord {
  const now = nowIso();
  return {
    set: {
      id: seed.setId,
      setId: seed.setId,
      setTitle: seed.setTitle,
      examId: seed.examId,
      subjectId: seed.subjectId,
      sourceLabel: seed.sourceLabel,
      sourceYear: seed.sourceYear,
      timeLimitMinutes: seed.timeLimitMinutes,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    questions: seed.questions.map((question) => buildQuestion(seed.subjectId, seed.setId, question)),
  };
}

export function getSeedSetRecords(): AdminSetRecord[] {
  return [
    buildSetRecord({
      setId: "civil-law-intro-10",
      setTitle: "민법 Starter 10문항",
      examId: "appraisal_first",
      subjectId: "civil_law",
      sourceLabel: "기출 변형 세트",
      sourceYear: 2025,
      timeLimitMinutes: 12,
      questions: [
        { questionId: "civil_law-1", number: 1, unit: "법률행위", difficulty: "medium", expectedTimeSeconds: 90 },
        { questionId: "civil_law-2", number: 2, unit: "의사표시", difficulty: "high", expectedTimeSeconds: 110 },
        { questionId: "civil_law-3", number: 3, unit: "대리", difficulty: "medium", expectedTimeSeconds: 95 },
      ],
    }),
    buildSetRecord({
      setId: "appraisal-law-intro-10",
      setTitle: "감정평가관계법규 Starter 10문항",
      examId: "appraisal_first",
      subjectId: "appraisal_law",
      sourceLabel: "기출 변형 세트",
      sourceYear: 2025,
      timeLimitMinutes: 12,
      questions: [
        { questionId: "law-1", number: 1, unit: "감정평가법", difficulty: "medium", expectedTimeSeconds: 90 },
        { questionId: "law-2", number: 2, unit: "토지보상법", difficulty: "high", expectedTimeSeconds: 120 },
        { questionId: "law-3", number: 3, unit: "부동산공시법", difficulty: "medium", expectedTimeSeconds: 100 },
      ],
    }),
    buildSetRecord({
      setId: "economics-intro-10",
      setTitle: "경제학원론 Starter 10문항",
      examId: "appraisal_first",
      subjectId: "economics",
      sourceLabel: "기출 변형 세트",
      sourceYear: 2025,
      timeLimitMinutes: 12,
      questions: [
        { questionId: "economics-1", number: 1, unit: "수요와 공급", difficulty: "medium", expectedTimeSeconds: 80 },
        { questionId: "economics-2", number: 2, unit: "탄력성", difficulty: "medium", expectedTimeSeconds: 85 },
      ],
    }),
  ];
}

export function isAdminSetSubjectId(value: unknown): value is AdminSetSubjectId {
  return ADMIN_SET_SUBJECTS.some((subject) => subject.id === value);
}
