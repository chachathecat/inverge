import {
  ACTUARY_SECOND_MVP_USER_ID,
  type ActuarySecondVerifierInput,
  type ActuarySecondSubmissionRecord,
} from "@/lib/actuary-second/types";
import { actuarySecondRepository } from "@/lib/actuary-second/file-repository";
import { evaluatePresentValueAnswer } from "@/lib/actuary-second/engine";
import type { ActuarySecondRepository } from "@/lib/actuary-second/repository";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class ActuarySecondService {
  constructor(private readonly repository: ActuarySecondRepository = actuarySecondRepository) {}

  async saveSubmission(input: ActuarySecondVerifierInput, userId: string = ACTUARY_SECOND_MVP_USER_ID) {
    const evaluation = evaluatePresentValueAnswer(userId, input);
    const submission: ActuarySecondSubmissionRecord = {
      id: createId("actuary_second_submission"),
      userId,
      subjectId: input.subject_id,
      questionId: input.question_id,
      submittedAt: new Date().toISOString(),
      input,
      evaluation,
    };
    return this.repository.saveSubmission(userId, submission);
  }

  listSubmissions(subjectId?: "insurance_math", userId: string = ACTUARY_SECOND_MVP_USER_ID) {
    return this.repository.listSubmissions(userId, subjectId);
  }

  listReviewQueue(subjectId?: "insurance_math", userId: string = ACTUARY_SECOND_MVP_USER_ID) {
    return this.repository.listReviewQueue(userId, subjectId);
  }

  getRecords(subjectId?: "insurance_math", userId: string = ACTUARY_SECOND_MVP_USER_ID) {
    return this.repository.getRecords(userId, subjectId);
  }
}

export const actuarySecondService = new ActuarySecondService();
