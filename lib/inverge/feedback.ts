export type FeedbackTrigger =
  | "first_starter_result"
  | "first_review_completed"
  | "second_rewrite_completed";

export type FeedbackRating = 1 | 2 | 3;

export type FeedbackQuestion = {
  trigger: FeedbackTrigger;
  stage: "first" | "second";
  title: string;
  helper: string;
  options: Array<{
    rating: FeedbackRating;
    label: string;
    requiresText: boolean;
    operatorReview: boolean;
  }>;
};

export type FeedbackContext = {
  examId?: string;
  stage: "first" | "second";
  subjectId?: string;
  sessionId?: string;
  submissionId?: string;
  rewriteId?: string;
  setId?: string;
  reviewId?: string;
};

export type FeedbackResponse = {
  feedbackId: string;
  trigger: FeedbackTrigger;
  rating: FeedbackRating;
  freeText: string | null;
  context: FeedbackContext;
  operatorReview: boolean;
  submittedAt: string;
  source: "product";
  schemaVersion: 1;
};

export type FeedbackPromptState = {
  scopeKey: string;
  shownCount: number;
  firstShownAt: string;
  lastShownAt: string;
  snoozedUntil?: string;
  dismissedAt?: string;
  submittedAt?: string;
};

export const INVERGE_FEEDBACK_LOCAL_STORAGE_KEY = "inverge:feedback:responses";
export const INVERGE_FEEDBACK_PROMPT_STATE_KEY = "inverge:feedback:prompt-state";

export const FEEDBACK_QUESTIONS: Record<FeedbackTrigger, FeedbackQuestion> = {
  first_starter_result: {
    trigger: "first_starter_result",
    stage: "first",
    title: "이번 계획이 다음 행동을 정하는 데 도움이 됐나요?",
    helper: "짧게만 확인합니다.",
    options: [
      { rating: 3, label: "도움 됨", requiresText: false, operatorReview: false },
      { rating: 2, label: "아직 애매함", requiresText: true, operatorReview: true },
      { rating: 1, label: "도움 안 됨", requiresText: true, operatorReview: true },
    ],
  },
  first_review_completed: {
    trigger: "first_review_completed",
    stage: "first",
    title: "이 리뷰가 실수 원인을 정리하는 데 도움이 됐나요?",
    helper: "필요할 때만 한 번 묻습니다.",
    options: [
      { rating: 3, label: "도움 됨", requiresText: false, operatorReview: false },
      { rating: 2, label: "조금 부족함", requiresText: true, operatorReview: true },
      { rating: 1, label: "도움 안 됨", requiresText: true, operatorReview: true },
    ],
  },
  second_rewrite_completed: {
    trigger: "second_rewrite_completed",
    stage: "second",
    title: "이번 rewrite가 고칠 지점을 분명하게 만들었나요?",
    helper: "낮은 응답일 때만 이유를 받습니다.",
    options: [
      { rating: 3, label: "분명함", requiresText: false, operatorReview: false },
      { rating: 2, label: "일부 애매함", requiresText: true, operatorReview: true },
      { rating: 1, label: "고치기 어려움", requiresText: true, operatorReview: true },
    ],
  },
};

export function getFeedbackQuestion(trigger: FeedbackTrigger) {
  return FEEDBACK_QUESTIONS[trigger];
}

export function buildFeedbackScopeKey(trigger: FeedbackTrigger, context: FeedbackContext) {
  return [
    trigger,
    context.examId ?? "exam",
    context.stage,
    context.subjectId ?? "subject",
    context.sessionId ?? "session",
    context.submissionId ?? context.reviewId ?? context.setId ?? "flow",
  ].join(":");
}

export function shouldEscalateFeedback(rating: FeedbackRating, freeText: string) {
  return rating <= 2 || freeText.trim().length >= 20;
}
