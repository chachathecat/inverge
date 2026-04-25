import type {
  AppraisalFirstOnboarding,
  RecordsSummary,
  ReviewCompletion,
  ReviewCompletionInput,
  ReviewQueueItem,
  SetSubmission,
  SetSubmissionInput,
  StarterDiagnosisResult,
  SubjectDashboardSummary,
  SubjectId,
  WeeklyCoachingPlan,
  DiagnosisEvent,
} from "@/lib/appraisal-first/types";

export type AppraisalFirstRepository = {
  saveOnboarding(input: AppraisalFirstOnboarding): Promise<AppraisalFirstOnboarding>;
  getOnboarding(userId: string): Promise<AppraisalFirstOnboarding | null>;
  saveStarterDiagnosis(input: StarterDiagnosisResult): Promise<StarterDiagnosisResult>;
  getStarterDiagnosis(userId: string): Promise<StarterDiagnosisResult | null>;
  saveSetSubmission(userId: string, input: SetSubmissionInput): Promise<SetSubmission>;
  listSetSubmissions(userId: string, subjectId?: SubjectId): Promise<SetSubmission[]>;
  saveDiagnosisEvents(userId: string, events: DiagnosisEvent[]): Promise<DiagnosisEvent[]>;
  listDiagnosisEvents(userId: string, subjectId?: SubjectId): Promise<DiagnosisEvent[]>;
  listReviewQueue(userId: string, subjectId?: SubjectId): Promise<ReviewQueueItem[]>;
  completeReview(userId: string, input: ReviewCompletionInput): Promise<ReviewCompletion>;
  listReviewCompletions(userId: string, subjectId?: SubjectId): Promise<ReviewCompletion[]>;
  saveWeeklyPlan(plan: WeeklyCoachingPlan): Promise<WeeklyCoachingPlan>;
  getActiveWeeklyPlan(userId: string): Promise<WeeklyCoachingPlan | null>;
  getRecords(userId: string, subjectId?: SubjectId): Promise<RecordsSummary>;
  getSubjectSummary(userId: string, subjectId: SubjectId): Promise<SubjectDashboardSummary>;
};
