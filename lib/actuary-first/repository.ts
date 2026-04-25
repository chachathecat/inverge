import type {
  ActuaryFirstSubjectId,
  ProbabilityRecordsSummary,
  ProbabilitySetSubmission,
  ReviewCompletion,
  ReviewCompletionInput,
  ReviewQueueCandidate,
} from "@/lib/actuary-first/types";

export type ActuaryFirstRepository = {
  saveSetSubmission(userId: string, submission: ProbabilitySetSubmission): Promise<ProbabilitySetSubmission>;
  listSetSubmissions(userId: string, subjectId?: ActuaryFirstSubjectId): Promise<ProbabilitySetSubmission[]>;
  listReviewQueue(userId: string, subjectId?: ActuaryFirstSubjectId): Promise<ReviewQueueCandidate[]>;
  completeReview(userId: string, input: ReviewCompletionInput): Promise<ReviewCompletion>;
  listReviewCompletions(userId: string, subjectId?: ActuaryFirstSubjectId): Promise<ReviewCompletion[]>;
  getRecords(userId: string, subjectId?: ActuaryFirstSubjectId): Promise<ProbabilityRecordsSummary>;
};

