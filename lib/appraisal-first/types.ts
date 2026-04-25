export const APPRAISAL_FIRST_EXAM_ID = "appraisal_first" as const;
export const MVP_USER_ID = "mvp-user" as const;

export type AppraisalFirstExamId = typeof APPRAISAL_FIRST_EXAM_ID;

export type StudyStage = "not_started" | "concept_review" | "past_set_entry" | "mock_exam";
export type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
export type ConfidenceLevel = "stable" | "unstable" | "weak" | "unknown";
export type AbilityKey =
  | "accuracy"
  | "time_management"
  | "option_judgment"
  | "law_memory"
  | "calculation_stability";
export type StarterMainIssue =
  | "concept_recall"
  | "option_judgment"
  | "law_memory"
  | "calculation_stability"
  | "time_management"
  | "not_sure";
export type TimePressureLevel = "comfortable" | "slightly_tight" | "very_tight" | "not_measured";
export type ChoiceId = "1" | "2" | "3" | "4" | "5";
export type AnswerConfidence = "low" | "medium" | "high";
export type QuestionDifficulty = "low" | "medium" | "high";
export type ReviewReasonCode = "unanswered" | "low_confidence" | "medium_confidence" | "flagged" | "time_overuse";
export type ReviewPriority = "today" | "this_week" | "maintenance";
export type ReviewStatus = "queued" | "in_review" | "completed" | "skipped";
export type AbilityAxis = "accuracy" | "timeManagement" | "choiceJudgment" | "lawRecall" | "calculationStability";
export type RootCauseGroup =
  | "concept_gap"
  | "condition_logic_failure"
  | "exception_missed"
  | "similar_concept_confusion"
  | "choice_judgment_error"
  | "case_application_failure"
  | "confidence_issue"
  | "article_memory_gap"
  | "time_pressure_guess";
export type RootCauseTagId =
  | "definition_unclear"
  | "legal_effect_unclear"
  | "condition_missing"
  | "condition_combination_failure"
  | "condition_order_error"
  | "exception_clause_missed"
  | "scope_limit_missed"
  | "similar_rule_confusion"
  | "mistake_fraud_confusion"
  | "void_cancel_confusion"
  | "agency_type_confusion"
  | "choice_comparison_failure"
  | "negative_statement_misread"
  | "absolute_word_trap"
  | "fact_pattern_mapping_error"
  | "article_requirement_gap"
  | "article_effect_gap"
  | "statute_article_recall_gap"
  | "deadline_requirement_gap"
  | "authority_subject_confusion"
  | "procedure_order_confusion"
  | "statute_scope_missed"
  | "similar_statute_confusion"
  | "sanction_effect_confusion"
  | "low_confidence_correct"
  | "time_pressure_guess";

export type AppraisalFirstOnboardingInput = {
  examId: AppraisalFirstExamId;
  currentStudyStage: StudyStage;
  subjectConfidence: Record<SubjectId, ConfidenceLevel>;
  targetExamDate?: string;
  weeklyAvailableHours?: number;
  recentSevenDaySetCount?: number;
};

export type AppraisalFirstOnboarding = AppraisalFirstOnboardingInput & {
  userId: string;
  derived: {
    isColdStart: boolean;
    hasRecentSetData: boolean;
    weakSubjectIds: SubjectId[];
    unknownSubjectIds: SubjectId[];
  };
  metadata: {
    source: "onboarding";
    schemaVersion: 1;
    createdAt: string;
    updatedAt: string;
  };
};

export type StarterDiagnosisInput = {
  examId: AppraisalFirstExamId;
  selectedSubjectId: SubjectId;
  miniSet: {
    questionCount: number;
    correctCount: number;
    elapsedMinutes?: number;
  };
  mainIssue: StarterMainIssue;
  timePressure: TimePressureLevel;
};

export type StarterDiagnosisResult = StarterDiagnosisInput & {
  userId: string;
  miniSet: StarterDiagnosisInput["miniSet"] & {
    accuracyRate: number;
  };
  abilityAdjustment: {
    ability: AbilityKey;
    direction: "lower_priority" | "watch" | "priority";
    reason: string;
  }[];
  firstWeekPlanSeedPatch: {
    prioritySubjectIds: SubjectId[];
    priorityAbilityKeys: AbilityKey[];
    recommendedFirstSet: {
      subjectId: SubjectId;
      questionCount: number;
      timeLimitMinutes?: number;
    };
    reviewQueueSeed: {
      reason: string;
      estimatedItemCount: number;
    };
  };
  metadata: {
    source: "starter_diagnosis";
    schemaVersion: 1;
    createdAt: string;
  };
};

export type PastSetAnswer = {
  questionId: string;
  selectedChoiceId: ChoiceId | null;
  confidence: AnswerConfidence | null;
  flagged: boolean;
  visited: boolean;
  firstAnsweredAt: string | null;
  lastUpdatedAt: string | null;
  elapsedSecondsOnQuestion: number;
};

export type ReviewQueueCandidate = {
  questionId: string;
  subjectId: SubjectId;
  setId: string;
  unit: string;
  difficulty: QuestionDifficulty;
  selectedChoiceId: ChoiceId | null;
  confidence: AnswerConfidence | null;
  flagged: boolean;
  elapsedSecondsOnQuestion: number;
  reasonCodes: ReviewReasonCode[];
  priority: ReviewPriority;
  curriculumNodeId?: string;
  linkedCurriculumNodeIds?: string[];
  rootCauseTag?: RootCauseTagId;
  rootCauseGroup?: RootCauseGroup;
  reviewReasonSentence?: string;
  recommendedReviewAction?: string;
  diagnosisConfidence?: number;
};

export type ImmediateSetFeedback = {
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  lowConfidenceCount: number;
  mediumConfidenceCount: number;
  flaggedCount: number;
  exceededTimeLimit: boolean;
  overtimeSeconds: number;
  reviewQueueCandidateCount: number;
};

export type SetSubmissionInput = {
  subjectId: SubjectId;
  setId: string;
  startedAt: string;
  submittedAt?: string;
  totalElapsedSeconds: number;
  totalPausedSeconds: number;
  exceededTimeLimit: boolean;
  overtimeSeconds: number;
  answers: Record<string, PastSetAnswer>;
  feedback: ImmediateSetFeedback;
  reviewQueueCandidates: ReviewQueueCandidate[];
};

export type SetSubmission = SetSubmissionInput & {
  id: string;
  userId: string;
  submittedAt: string;
};

export type ReviewQueueItem = ReviewQueueCandidate & {
  id: string;
  userId: string;
  status: ReviewStatus;
  sourceSubmissionId: string;
  createdAt: string;
  completedAt?: string;
};

export type CivilLawCurriculumMapping = {
  questionId: string;
  primaryNodeId: string;
  linkedNodeIds: string[];
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  subtopicId: string;
  subtopicName: string;
  correctChoiceId: ChoiceId;
  expectedSeconds: number;
  difficulty: QuestionDifficulty;
  examWeight: number;
  reviewWeight: number;
  coachingWeight: number;
  testedConceptType: "definition" | "rule" | "exception" | "case_application" | "comparison";
  requiresArticleMemory: boolean;
  requiresCaseLogic: boolean;
  requiresComparison: boolean;
  mappingConfidence: "high" | "medium" | "low";
  defaultRootCauseTags: RootCauseTagId[];
};

export type RootCauseTagDefinition = {
  tagId: RootCauseTagId;
  group: RootCauseGroup;
  internalName: string;
  userLabel: string;
  summaryLabel: string;
  reviewPriorityWeight: number;
  reviewAction: string;
  coachingTemplate: string;
  isUserVisible: boolean;
};

export type DiagnosisEvent = {
  eventId: string;
  userId: string;
  subjectId: SubjectId;
  setSubmissionId: string;
  setId: string;
  questionId: string;
  curriculumNodeId: string;
  linkedCurriculumNodeIds: string[];
  topicId: string;
  topicName: string;
  subtopicName: string;
  isCorrect: boolean;
  selectedChoiceId: ChoiceId | null;
  correctChoiceId: ChoiceId;
  confidence: AnswerConfidence | null;
  elapsedSeconds: number;
  expectedSeconds: number;
  timeRatio: number;
  primaryRootCauseTag: RootCauseTagId;
  rootCauseGroup: RootCauseGroup;
  secondaryRootCauseTags: RootCauseTagId[];
  curriculumGapScore: number;
  solvingPatternScore: number;
  reviewPriorityScore: number;
  diagnosisConfidence: number;
  reviewReasonSentence: string;
  recommendedReviewAction: string;
  ruleVersion: "civil-law-rule-v1" | "legal-regulations-rule-v1";
  createdAt: string;
};

export type ReviewCompletionInput = {
  reviewId: string;
  subjectId: SubjectId;
  setId: string;
  questionId: string;
  linkedAbilityAxes?: AbilityAxis[];
  originalSelectedChoiceId?: ChoiceId | null;
  reviewSelectedChoiceId?: ChoiceId;
  correctChoiceId?: ChoiceId;
  isCorrectOnReview?: boolean;
  selectedReasons?: string[];
  memo?: string | null;
  timeSpentSeconds?: number;
  reviewedAt?: string;
};

export type ReviewCompletion = ReviewCompletionInput & {
  id: string;
  userId: string;
  reviewedAt: string;
};

export type WeeklyCoachingPlan = {
  id: string;
  userId: string;
  weekStartDate: string;
  createdAt: string;
  status: "active" | "completed" | "archived";
  primarySubjectIds: SubjectId[];
  priorityAbilityKeys: AbilityKey[];
  targetSetCount: number;
  reviewTargetCount: number;
  summary: string;
  source?: "starter_diagnosis" | "civil_law_diagnosis_v1" | "legal_regulations_diagnosis_v1";
  focusRootCauseGroup?: RootCauseGroup;
  focusRootCauseTag?: RootCauseTagId;
  focusCurriculumNodeId?: string;
  tasks: {
    id: string;
    subjectId: SubjectId;
    type: "set" | "review";
    title: string;
    targetCount: number;
  }[];
};

export type RecordsTimelineType = "pastSet" | "review" | "weeklyPlan";

export type RecordsTimelineItem = {
  id: string;
  type: RecordsTimelineType;
  subjectId?: SubjectId;
  title: string;
  description: string;
  occurredAt: string;
  status?: "completed" | "active" | "skipped";
  linkedAbilityAxes?: AbilityAxis[];
  metadata?: Record<string, number | string | boolean | undefined>;
};

export type RecordsSummary = {
  subjectId?: SubjectId;
  items: RecordsTimelineItem[];
  aggregate: {
    pastSetCount: number;
    reviewCompletedCount: number;
    activeWeeklyPlanCount: number;
    recentActivityAt: string | null;
    topCurriculumNodeId?: string;
    topRootCauseGroup?: RootCauseGroup;
    topRootCauseTag?: RootCauseTagId;
    diagnosisEventCount?: number;
    summarySentence?: string;
  };
};

export type SubjectDashboardSummary = {
  subjectId: SubjectId;
  lastActivityAt: string | null;
  remainingReviewCount: number;
  activeWeeklyPlan: boolean;
  primaryAbilityAxis: AbilityAxis | null;
  pastSetCount: number;
  reviewCompletedCount: number;
  topCurriculumNodeId?: string;
  topRootCauseGroup?: RootCauseGroup;
  topRootCauseTag?: RootCauseTagId;
  statusLabel?: "cold_start" | "baseline_building" | "review_needed" | "weak_pattern_detected" | "weekly_plan_active" | "stable_practice";
  statusCopy?: string;
  nextActionReason?: string;
  nextAction: "solveSet" | "reviewQueue" | "weeklyCoaching" | "records";
};
