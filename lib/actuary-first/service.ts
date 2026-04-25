import { ACTUARY_FIRST_MVP_USER_ID, type ProbabilitySetSubmission, type ProbabilitySetSubmissionInput, type ReviewCompletionInput } from "@/lib/actuary-first/types";
import { actuaryFirstRepository } from "@/lib/actuary-first/file-repository";
import { evaluateProbabilitySet } from "@/lib/actuary-first/engine";
import type { ActuaryFirstRepository } from "@/lib/actuary-first/repository";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class ActuaryFirstService {
  constructor(private readonly repository: ActuaryFirstRepository = actuaryFirstRepository) {}

  async saveSetSubmission(input: ProbabilitySetSubmissionInput, userId: string = ACTUARY_FIRST_MVP_USER_ID) {
    const submittedAt = input.submittedAt ?? new Date().toISOString();
    const result = evaluateProbabilitySet(userId, { ...input, submittedAt });
    const submission: ProbabilitySetSubmission = {
      ...input,
      id: createId("actuary_set"),
      userId,
      submittedAt,
      setEvaluation: result.setEvaluation,
      questionEvaluations: result.questionEvaluations,
      reviewQueueCandidates: result.reviewQueueCandidates,
      coachingSeed: result.coachingSeed,
      nextAction: result.nextAction,
    };
    return this.repository.saveSetSubmission(userId, submission);
  }

  listSetSubmissions(subjectId?: "probability", userId: string = ACTUARY_FIRST_MVP_USER_ID) {
    return this.repository.listSetSubmissions(userId, subjectId);
  }

  listReviewQueue(subjectId?: "probability", userId: string = ACTUARY_FIRST_MVP_USER_ID) {
    return this.repository.listReviewQueue(userId, subjectId);
  }

  completeReview(input: ReviewCompletionInput, userId: string = ACTUARY_FIRST_MVP_USER_ID) {
    return this.repository.completeReview(userId, input);
  }

  getRecords(subjectId?: "probability", userId: string = ACTUARY_FIRST_MVP_USER_ID) {
    return this.repository.getRecords(userId, subjectId);
  }
}

export const actuaryFirstService = new ActuaryFirstService();

