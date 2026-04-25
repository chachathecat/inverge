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

export const APPRAISAL_SECOND_SUBJECTS = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"] as const;

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
export const SOURCE_TYPE_OPTIONS = ["text", "image", "pdf", "manual"] as const;
export const ENTITLEMENT_TIERS = ["free_trial", "core", "extra_credits_ready"] as const;

export type SourceType = (typeof SOURCE_TYPE_OPTIONS)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_OPTIONS)[number];
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
  rewriteSourceItemId?: string;
  rewriteSourceGap?: string;
  rewriteCompleted?: boolean;
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
