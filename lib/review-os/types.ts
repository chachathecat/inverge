export const REVIEW_OS_EXAM_ID = "wrong_answer_os";
export const REVIEW_OS_STAGE = "alpha";

export const EXAM_OPTIONS = ["감정평가사 1차", "감정평가사 2차"] as const;

export const APPRAISAL_FIRST_SUBJECTS = ["민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"] as const;
export const FIRST_STAGE_ERROR_REASON_OPTIONS = [
  "개념 부족",
  "선지 오독",
  "계산 실수",
  "시간 부족",
  "헷갈리는 개념과 혼동",
  "찍음/확신 부족",
] as const;

export type FirstSubjectTemplate = {
  keyConcepts: string;
  coreFormula: string;
  comparisonPoint: string;
  defaultReason: string;
  checkpoints: string[];
  commonErrorHints: string[];
  retrievalHint: string;
  fixedCondition: string;
};

export const FIRST_SUBJECT_TEMPLATES: Record<(typeof APPRAISAL_FIRST_SUBJECTS)[number], FirstSubjectTemplate> = {
  민법: {
    keyConcepts: "요건, 효과, 예외, 판례/조문 연결",
    coreFormula: "요건 -> 효과 -> 예외 -> 판례/조문 연결",
    comparisonPoint: "해설 전에 요건·효과·예외 중 하나를 떠올리고 판례/조문 연결 여부를 확인합니다.",
    defaultReason: "요건 누락 또는 원칙/예외 혼동이 있었습니다.",
    checkpoints: ["요건", "효과", "예외", "판례/조문 연결"],
    commonErrorHints: ["요건 누락", "원칙/예외 혼동", "선지 표현 오독"],
    retrievalHint: "해설 전에 요건·효과·예외 중 하나를 먼저 떠올립니다.",
    fixedCondition: "오늘은 요건 1개를 먼저 고정합니다.",
  },
  경제학원론: {
    keyConcepts: "수요/공급, 그래프 이동, 균형 변화, 탄력성/한계개념",
    coreFormula: "수요/공급 -> 그래프 이동 -> 균형 변화 -> 탄력성/한계개념",
    comparisonPoint: "해설 전에 그래프 이동 방향과 균형 변화를 먼저 떠올립니다.",
    defaultReason: "곡선 이동을 혼동했거나 수식/그래프 연결이 약했습니다.",
    checkpoints: ["수요/공급", "그래프 이동", "균형 변화", "탄력성/한계개념"],
    commonErrorHints: ["곡선 이동 혼동", "수식/그래프 연결 실패"],
    retrievalHint: "해설 전에 그래프 이동인지 곡선 위 이동인지 먼저 구분합니다.",
    fixedCondition: "오늘은 그래프 이동 기준 1개만 고정합니다.",
  },
  부동산학원론: {
    keyConcepts: "개념 정의, 시장/정책/금융, 공식/계산 기준",
    coreFormula: "개념 정의 -> 시장/정책/금융 -> 공식/계산 기준",
    comparisonPoint: "해설 전에 정의와 계산 조건을 분리해 떠올립니다.",
    defaultReason: "정의 혼동 또는 계산 조건 누락이 있었습니다.",
    checkpoints: ["개념 정의", "시장/정책/금융", "공식/계산 기준"],
    commonErrorHints: ["정의 혼동", "정책 효과 오독", "계산 조건 누락"],
    retrievalHint: "해설 전에 개념 정의 1줄과 계산 기준 1개를 먼저 적습니다.",
    fixedCondition: "오늘은 계산 조건 1개만 고정합니다.",
  },
  감정평가관계법규: {
    keyConcepts: "조문, 요건, 절차, 예외",
    coreFormula: "조문 -> 요건 -> 절차 -> 예외 -> 사안 포섭",
    comparisonPoint: "해설 전에 조문-요건-절차 중 하나를 떠올리고 사안 포섭 문장을 확인합니다.",
    defaultReason: "조문 요건 누락 또는 절차 순서 혼동이 있었습니다.",
    checkpoints: ["조문", "요건", "절차", "예외"],
    commonErrorHints: ["조문 요건 누락", "절차 순서 혼동", "사안 포섭 실패"],
    retrievalHint: "해설 전에 조문과 요건을 먼저 짝지어 떠올립니다.",
    fixedCondition: "오늘은 절차 순서 1개만 고정합니다.",
  },
  회계학: {
    keyConcepts: "분개, 인식, 측정, 표시, 계산",
    coreFormula: "분개 -> 인식 -> 측정 -> 표시 -> 계산",
    comparisonPoint: "해설 전에 분개 방향과 인식 시점을 먼저 떠올립니다.",
    defaultReason: "분개 방향 또는 인식·측정·표시 기준에서 오류가 있었습니다.",
    checkpoints: ["분개", "인식", "측정", "표시", "계산"],
    commonErrorHints: ["분개 방향 오류", "인식 시점 오류", "측정금액 오류", "표시구분 오류"],
    retrievalHint: "해설 전에 분개 방향과 인식 시점을 먼저 확인합니다.",
    fixedCondition: "오늘은 분개 방향 1개만 고정합니다.",
  },
};

export function getFirstSubjectTemplate(subject: string): FirstSubjectTemplate {
  if (subject in FIRST_SUBJECT_TEMPLATES) {
    return FIRST_SUBJECT_TEMPLATES[subject as (typeof APPRAISAL_FIRST_SUBJECTS)[number]];
  }
  return {
    keyConcepts: "개념, 조건, 적용",
    coreFormula: "개념 -> 조건 -> 적용",
    comparisonPoint: "해설 전에 기준 1개를 먼저 떠올립니다.",
    defaultReason: "조건 점검이 부족했습니다.",
    checkpoints: ["개념", "조건", "적용"],
    commonErrorHints: ["조건 누락", "표현 오독"],
    retrievalHint: "해설 전에 기준 하나를 먼저 떠올립니다.",
    fixedCondition: "오늘은 조건 하나만 고정합니다.",
  };
}

export const APPRAISAL_SECOND_SUBJECTS = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"] as const;

export type SecondSubjectTemplate = {
  structure: string;
  checklist: string[];
  commonGaps: string[];
  rewriteGuidance: string;
  issueRecallPlaceholder: string;
  outlinePlaceholder: string;
  biggestGapGuidance: string;
  detailLine: string;
};

export const SECOND_SUBJECT_TEMPLATES: Record<(typeof APPRAISAL_SECOND_SUBJECTS)[number], SecondSubjectTemplate> = {
  감정평가실무: {
    structure: "문제 요구 → 평가 근거 → 계산 → 결론",
    checklist: ["평가방법 선택", "자료 적정성", "계산 근거", "단위/시점", "결론"],
    commonGaps: ["계산 근거 누락", "보정 요인 누락", "결론 수치 불명확"],
    rewriteGuidance: "산식/근거/결론을 분리해 한 문단 보강",
    issueRecallPlaceholder: "1) 문제 요구\n2) 평가 근거\n3) 계산 검토 포인트",
    outlinePlaceholder: "I. 문제 요구\nII. 평가 근거\nIII. 계산\nIV. 결론",
    biggestGapGuidance: "오늘은 간극 1개만 문단으로 보강합니다. 계산 근거와 결론 수치를 분리해 확인합니다.",
    detailLine: "이 과목은 먼저 이 구조로 답안을 잡습니다.",
  },
  감정평가이론: {
    structure: "정의 → 논거 → 사례 적용 → 결론",
    checklist: ["개념 정의", "이론적 근거", "비교/대립점", "사례 적용", "결론"],
    commonGaps: ["정의만 있고 사례 적용 부족", "논거 연결 약함", "결론 추상적"],
    rewriteGuidance: "정의 다음에 사례 사실관계 연결 문장 추가",
    issueRecallPlaceholder: "1) 개념 정의\n2) 핵심 논거\n3) 사례 적용 기준",
    outlinePlaceholder: "I. 정의\nII. 논거\nIII. 사례 적용\nIV. 결론",
    biggestGapGuidance: "오늘은 간극 1개만 문단으로 보강합니다. 정의 다음 사례 연결 문장을 먼저 추가합니다.",
    detailLine: "이 과목은 먼저 이 구조로 답안을 잡습니다.",
  },
  "감정평가 및 보상법규": {
    structure: "요건 → 조문/법리 → 절차 → 사안 포섭 → 결론",
    checklist: ["조문", "요건", "절차", "판례/법리", "사안 포섭", "결론"],
    commonGaps: ["요건 누락", "절차 순서 혼동", "조문 없는 포섭", "결론 불명확"],
    rewriteGuidance: "누락 요건 1개와 사안 포섭 문장 1개 보강",
    issueRecallPlaceholder: "1) 요건\n2) 조문/법리\n3) 사안 포섭 쟁점",
    outlinePlaceholder: "I. 요건\nII. 조문/법리\nIII. 절차\nIV. 사안 포섭\nV. 결론",
    biggestGapGuidance: "오늘은 간극 1개만 문단으로 보강합니다. 누락 요건과 사안 포섭 문장을 함께 보완합니다.",
    detailLine: "이 과목은 먼저 이 구조로 답안을 잡습니다.",
  },
};

export function getSecondSubjectTemplate(subject: string): SecondSubjectTemplate {
  if (subject in SECOND_SUBJECT_TEMPLATES) {
    return SECOND_SUBJECT_TEMPLATES[subject as (typeof APPRAISAL_SECOND_SUBJECTS)[number]];
  }
  return {
    structure: "문제 요구 → 논거 → 적용 → 결론",
    checklist: ["핵심 쟁점", "적용 근거", "결론"],
    commonGaps: ["핵심 쟁점 누락", "적용 문장 부족", "결론 불명확"],
    rewriteGuidance: "간극 1개를 분리해 한 문단 보강",
    issueRecallPlaceholder: "1) \n2) \n3) ",
    outlinePlaceholder: "I. \nII. \nIII. ",
    biggestGapGuidance: "오늘은 간극 1개만 문단으로 보강합니다.",
    detailLine: "이 과목은 먼저 이 구조로 답안을 잡습니다.",
  };
}

export const SECOND_TASK_PRESETS = ["답안 작성", "비교", "보강", "교정노트"] as const;

export const MISTAKE_REASON_PRESETS = [
  "개념 혼동",
  "조건 누락",
  "계산 실수",
  "판례/논점 적용 부족",
  "구조 약함",
  "시간 부족",
  "암기 누락",
] as const;

export const CONFIDENCE_OPTIONS = ["낮음", "중간", "높음"] as const;
export const STUDY_TYPE_OPTIONS = ["기출", "기본서", "강의", "문제풀이", "암기", "기타"] as const;
export const SOURCE_TYPE_OPTIONS = ["text", "image", "pdf", "manual"] as const;
export const ENTITLEMENT_TIERS = ["free_trial", "core", "extra_credits_ready"] as const;

export type SourceType = (typeof SOURCE_TYPE_OPTIONS)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_OPTIONS)[number];
export type StudyType = (typeof STUDY_TYPE_OPTIONS)[number];
export type EntitlementTier = (typeof ENTITLEMENT_TIERS)[number];
export type InviteStatus = "pending" | "invited" | "active" | "blocked";
export type ReviewQueueStatus = "pending" | "completed" | "skipped";
export type RiskLevel = "stable" | "watch" | "high";

export type StudyProfile = {
  userId: string;
  examName: string;
  examDate: string | null;
  preferredSubjects: string[];
  createdAt: string;
  updatedAt: string;
};

export type WrongAnswerItemInput = {
  examName: string;
  subjectLabel: string;
  sourceType: SourceType;
  sourceLabel?: string;
  problemTitle?: string;
  problemIdentifier?: string;
  rawQuestionText?: string;
  rawAnswerText?: string;
  correctAnswer: string;
  userAnswer: string;
  userReasonText?: string;
  userReasonPreset?: string;
  confidence: ConfidenceLevel;
  timeSpentSeconds?: number | null;
  nextReviewDate?: string | null;
  keyConcepts?: string[];
  coreFormula?: string;
  comparisonPoint?: string;
  missingIssue?: string;
  weakStructurePoint?: string;
  weakApplicationSentence?: string;
  rewriteInstruction?: string;
  referenceStructure?: string;
  myAnswerSummary?: string;
  caseSummary?: string;
  issueRecall?: string;
  outlineDraft?: string;
  productionBeforeComparison?: boolean;
  referenceAnswerAddedAfterProduction?: boolean;
  biggestGap?: string;
  rewriteSourceItemId?: string;
  rewriteSourceGap?: string;
  rewriteCompleted?: boolean;
  captureIntent?: "save" | "defer";
  createdFromCapture?: boolean;
  extractionPayload?: {
    raw_ocr_text?: string;
    raw_extraction_json?: Record<string, unknown>;
    normalized_draft?: Record<string, unknown> | null;
    user_confirmed_fields?: Record<string, unknown>;
  };
};

export type WrongAnswerItemRecord = WrongAnswerItemInput & {
  id: string;
  userId: string;
  dedupeKey: string;
  processingStatus: "completed" | "queued";
  rawPayload: Record<string, unknown>;
  derivedPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WrongAnswerNoteRecord = {
  id: string;
  wrongAnswerItemId: string;
  aiSummary: string;
  keyDistinction: string;
  reviewCheckpoint: string;
  nextTryTip: string;
  generationSource: "ai" | "fallback";
  createdAt: string;
};

export type WrongAnswerTagRecord = {
  id: string;
  wrongAnswerItemId: string;
  topicTag: string;
  mistakeType: string;
  taskType: string;
  classifierSource: "ai" | "rules";
  confidence: number;
  recurrenceCandidate: boolean;
  createdAt: string;
};

export type RecurrenceFeatureRecord = {
  id: string;
  userId: string;
  examName: string;
  subjectLabel: string;
  topicTag: string;
  mistakeType: string;
  recurrenceCount: number;
  lastSeenAt: string;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
};

export type ReviewQueueItemRecord = {
  id: string;
  userId: string;
  wrongAnswerItemId: string;
  dueAt: string;
  reviewReason: string;
  priorityScore: number;
  status: ReviewQueueStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReviewQueueCard = {
  queueId: string;
  itemId: string;
  examName: string;
  subjectLabel: string;
  problemTitle: string;
  topicTag: string;
  mistakeType: string;
  reviewReason: string;
  priorityScore: number;
  dueAt: string;
  recurrenceCount: number;
  confidence: ConfidenceLevel;
  timeSpentSeconds: number | null;
  createdFromCapture: boolean;
  itemCreatedAt: string;
};

export type ReviewCompletionAction =
  | "first_short_retry"
  | "first_confirm_recall"
  | "first_keep_scheduled_review"
  | "second_paragraph_rewrite"
  | "second_keep_scheduled_rewrite";

export type ReviewCompletionMetadata = {
  retryDraft?: string;
  errorReason?: string;
  retrievalSentence?: string;
  issueRecall?: string;
};

export type WrongAnswerDetail = {
  item: WrongAnswerItemRecord;
  note: WrongAnswerNoteRecord | null;
  tags: WrongAnswerTagRecord[];
  recurrence: RecurrenceFeatureRecord | null;
  reviewQueue: ReviewQueueCard[];
};

export type WeeklyLearningSummaryRecord = {
  id: string;
  userId: string;
  weekKey: string;
  summaryText: string;
  topMistakeTypes: string[];
  topTopics: string[];
  nextWeekFocus: string[];
  createdAt: string;
  updatedAt: string;
};

export type LearningSignalEventInput = {
  examMode: "감정평가사 1차" | "감정평가사 2차";
  subject: string;
  sourceType: string;
  derivedTags: string[];
  relatedFormulas: string[];
  nextTaskType: string;
  nextTask: string;
  metadataJson?: Record<string, unknown>;
};

export type LearningSignalEventRecord = LearningSignalEventInput & {
  id: string;
  userId: string;
  createdAt: string;
};

export type LearningSignalSummary = {
  totalCount: number;
  latestEventAt: string | null;
  topTags: string[];
  topSubjects: string[];
  nextTaskTypes: Array<{ type: string; count: number }>;
};

export type TaxonomyClassificationCandidate = {
  taxonomyNodeId: string;
  mode: "first" | "second";
  examYear?: number;
  round?: string;
  subject: string;
  unit: string;
  topic: string;
  subtopic?: string;
  skill: string;
  examSkill: string;
  skeletonKeywords: string[];
  commonGaps: string[];
  score: number;
  confidence: number;
  matchedKeywords: string[];
  skeletonKeywordHints: string[];
  classificationStatus: "ai_suggested" | "needs_review";
};

export type StudyLogInput = {
  mode: "first" | "second";
  subject: string;
  studyType: StudyType;
  sourceLabel: string;
  timeSpentMinutes?: number | null;
  notUnderstood: string;
  revisitNeeded: string;
  confidence: ConfidenceLevel;
};

export type StudyLogRecord = StudyLogInput & {
  id: string;
  userId: string;
  taxonomyNodeId?: string | null;
  taxonomyCandidates?: TaxonomyClassificationCandidate[];
  taxonomyClassificationStatus: "ai_suggested" | "human_verified" | "needs_review";
  taxonomyClassificationConfidence?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyPlanTaskAction = "retry" | "rewrite" | "review";

export type WeeklyPlanTask = {
  queueId: string;
  itemId: string;
  action: WeeklyPlanTaskAction;
  subject: string;
  title: string;
  reason: string;
  estimatedDurationMinutes: number;
  target: string;
  priorityOrder: number;
  dueAt: string;
  priorityScore: number;
};

export type WeeklyRecoveryTask = {
  message: string;
  task: WeeklyPlanTask;
  overdueCount: number;
};

export type WeeklyPlan = {
  mode: "first" | "second";
  summary: string;
  primaryActionLabel: string;
  tasks: WeeklyPlanTask[];
  recovery: WeeklyRecoveryTask | null;
  secondaryRecords: {
    overdueCount: number;
    queueCount: number;
    recentWrongCount: number;
  };
};

export type ActionSeedRecord = {
  id: string;
  userId: string;
  sourceType: "today_focus" | "next_action" | "weekly_focus";
  seedType: "summary" | "action";
  priorityScore: number;
  renderedText: string;
  rawPayload: Record<string, unknown>;
  createdAt: string;
};

export type TodayFocus = {
  lines: [string, string, string];
  nextAction: string;
  nextActionType: "review_now" | "capture_now" | "move_on" | "retry_now" | "rewrite_now";
  primaryTaskLabel: string;
  reason: string;
  estimatedDurationMinutes: number;
  priorityScore: number;
  sourceQueueId: string | null;
  sourceItemId: string | null;
  queue: ReviewQueueCard[];
};

export type UsageSummary = {
  tier: EntitlementTier;
  monthlyLimit: number;
  monthlyUsed: number;
  remaining: number;
  burstBlocked: boolean;
};

export type AccessState = {
  allowed: boolean;
  inviteStatus: InviteStatus;
  entitlementTier: EntitlementTier;
  email: string | null;
};

export type FeedbackItemInput = {
  route: string;
  pageContext: Record<string, unknown>;
  message: string;
};

export type FeedbackItemRecord = FeedbackItemInput & {
  id: string;
  userId: string;
  createdAt: string;
};

export type UsageEventRecord = {
  id: string;
  userId: string;
  eventName: string;
  entityType: string | null;
  entityId: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
};

export type AdminAlphaFeed = {
  recentEvents: UsageEventRecord[];
  recentFeedback: FeedbackItemRecord[];
};
