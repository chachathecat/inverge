import type {
  ActuarySecondRecordsSummary,
  ActuarySecondReviewQueueCandidate,
  ActuarySecondSubmissionRecord,
} from "@/lib/actuary-second/types";

export type ActuarySecondRepository = {
  saveSubmission(userId: string, submission: ActuarySecondSubmissionRecord): Promise<ActuarySecondSubmissionRecord>;
  listSubmissions(userId: string, subjectId?: "insurance_math"): Promise<ActuarySecondSubmissionRecord[]>;
  listReviewQueue(userId: string, subjectId?: "insurance_math"): Promise<ActuarySecondReviewQueueCandidate[]>;
  getRecords(userId: string, subjectId?: "insurance_math"): Promise<ActuarySecondRecordsSummary>;
};
