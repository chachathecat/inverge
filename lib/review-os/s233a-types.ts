import type {
  S233AiEvaluationCascadeBundle,
  S233AnswerExposure,
  S233AnswerPackIdentity,
  S233AnswerPackRegistryContext,
  S233AssistanceLevel,
  S233EvidenceProofBundle,
  S233FindingStatus,
  S233LearnerAnswerReviewIdentity,
  S233LearnerReviewEvaluationContext,
  S233ScoringFindingBundle,
  S233ScoringSkillIdentity,
  S233TrustedScoringContext,
} from "./s233-parallel-execution-contract";
import type { RubricEvidenceConfidenceLevel, RubricEvidenceSubject } from "./rubric-evidence-contract";

export type S233aLearnerInputSegment = {
  segmentId: string;
  text: string;
  pageIndex?: number;
  calculationStepId?: string;
};

export type S233aLearnerInput = {
  normalizedText: string;
  segments: S233aLearnerInputSegment[];
};

export type S233aReviewRequest = {
  authenticatedUserId: string;
  clientRequestId: string;
  subject: RubricEvidenceSubject;
  questionText: string;
  learnerInput: S233aLearnerInput;
  answerSubmissionId: string;
  inputVersionId: string;
  historyId: string;
  attemptId: string;
  attemptVersion: number;
  rootAttemptId: string;
  parentAttemptId: string | null;
  predecessorReviewId: string | null;
  answerPackId: string;
  answerPackVersion: string;
  revealHistory: S233LearnerAnswerReviewIdentity["revealHistory"];
  elapsedTimeMs: number;
  confidence: RubricEvidenceConfidenceLevel | "unknown";
  assistanceLevel: S233AssistanceLevel;
  answerExposure: S233AnswerExposure;
  inputModality: "typed" | "handwritten_ocr" | "file_upload" | "calculator" | "manual_metadata";
  variantFamilyId: string | null;
  variantDistance: "same" | "near" | "far" | null;
  sessionPosition: number;
  sourceUncertaintyCodes: string[];
  predecessorControllerEventId: string | null;
};

export type S233aTrustedReviewMaterials = {
  answerPack: S233AnswerPackIdentity;
  answerPackRegistryContext: S233AnswerPackRegistryContext;
  trustedScoringContext: S233TrustedScoringContext;
  evaluationReferenceText: string;
  materialReceiptId: string;
};

export type S233aGradeObservation = {
  skillId: string;
  status: S233FindingStatus;
  learnerSegmentId: string | null;
  learnerCalculationStepId: string | null;
  confidence: RubricEvidenceConfidenceLevel;
  uncertaintyCodes: string[];
  abstentionReason:
    | "learner_evidence_missing"
    | "source_unresolved"
    | "rubric_unresolved"
    | "evaluator_uncertain"
    | "critic_disagreement_unresolved"
    | "unsupported_task"
    | null;
};

export type S233aPrimaryGradeResult = {
  status: "completed" | "abstained";
  observations: S233aGradeObservation[];
};

export type S233aCriticResult = {
  status: "completed" | "abstained";
  unresolvedCodes: string[];
};

export type S233aEvaluationInput = {
  request: S233aReviewRequest;
  learnerOwnerRefId: string;
  reviewId: string;
  traceId: string;
  materials: S233aTrustedReviewMaterials;
  skills: S233ScoringSkillIdentity[];
};

export type S233aPrimarySubjectGrader = {
  modelVersion: string;
  promptVersion: string;
  grade(input: S233aEvaluationInput): Promise<S233aPrimaryGradeResult>;
};

export type S233aConditionalCritic = {
  modelVersion: string;
  promptVersion: string;
  review(
    input: S233aEvaluationInput & {
      primary: S233aPrimaryGradeResult;
      findingBundles: S233ScoringFindingBundle[];
    },
  ): Promise<S233aCriticResult>;
};

export type S233aQueueTodayLinkageCommand = {
  reviewQueueItemId: string;
  todayPlanTaskId: string;
  reviewId: string;
  answerSubmissionId: string;
  subject: RubricEvidenceSubject;
  skillId: string | null;
  actionType: "rewrite" | "recalculate" | "retry" | "withhold_until_verified";
  priorityScore: number;
  dueAt: string;
  renderedText: string;
  containsRawContent: false;
};

export type S233aConceptTransition = {
  eventId: string;
  subjectId: RubricEvidenceSubject;
  unitId: string;
  taskType: "rewrite" | "recalculate" | "retry" | "withhold_until_verified";
  result: "correct" | "wrong" | "unknown" | "needs_rewrite";
  confidence: RubricEvidenceConfidenceLevel | "unknown";
  occurredAt: string;
  containsRawContent: false;
};

export type S233aPersistedReview = {
  review: S233LearnerAnswerReviewIdentity;
  evaluationContext: S233LearnerReviewEvaluationContext | null;
  evidenceBundles: S233EvidenceProofBundle[];
  persistenceReceiptId: string;
};

export type S233aReviewClaimResult =
  | { status: "claimed"; persisted: S233aPersistedReview }
  | { status: "retry_claimed"; persisted: S233aPersistedReview }
  | { status: "replayed"; persisted: S233aPersistedReview }
  | { status: "in_progress"; persisted: S233aPersistedReview };

export type S233aReviewTransitionInput = {
  previous: S233LearnerAnswerReviewIdentity;
  next: S233LearnerAnswerReviewIdentity;
  evaluationContext: S233LearnerReviewEvaluationContext | null;
  evidenceBundles: S233EvidenceProofBundle[];
  conceptTransitions: S233aConceptTransition[];
  queueTodayLinkage: S233aQueueTodayLinkageCommand | null;
  persistenceReceiptId: string;
};

export type S233aReviewRepositoryPort = {
  claim(
    authenticatedUserId: string,
    review: S233LearnerAnswerReviewIdentity,
    persistenceReceiptId: string,
  ): Promise<S233aReviewClaimResult>;
  transition(
    authenticatedUserId: string,
    input: S233aReviewTransitionInput,
  ): Promise<S233aPersistedReview>;
  loadReview(
    authenticatedUserId: string,
    reviewId: string,
  ): Promise<S233aPersistedReview | null>;
};

export type S233aReviewRuntimeDependencies = {
  repository: S233aReviewRepositoryPort;
  loadTrustedMaterials(input: {
    answerPackId: string;
    answerPackVersion: string;
    subject: RubricEvidenceSubject;
  }): Promise<S233aTrustedReviewMaterials>;
  primaryGraders: Record<RubricEvidenceSubject, S233aPrimarySubjectGrader>;
  critic: S233aConditionalCritic;
  prepareQueueTodayLinkage(input: {
    reviewId: string;
    answerSubmissionId: string;
    subject: RubricEvidenceSubject;
    skill: S233ScoringSkillIdentity | null;
    abstained: boolean;
    now: string;
  }): S233aQueueTodayLinkageCommand;
  now(): string;
  randomId(prefix: string): string;
};

export type S233aReviewRuntimeResult = {
  replayed: boolean;
  review: S233LearnerAnswerReviewIdentity;
  cascadeBundle: S233AiEvaluationCascadeBundle | null;
  findingBundles: S233ScoringFindingBundle[];
  evidenceBundles: S233EvidenceProofBundle[];
};
