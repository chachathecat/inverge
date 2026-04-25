import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canUseSupabasePersistence } from "@/lib/supabase/persistence";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";
import type { ActuarySecondRepository } from "@/lib/actuary-second/repository";
import type {
  ActuarySecondEvaluationResult,
  ActuarySecondFailureClass,
  ActuarySecondRecordsSummary,
  ActuarySecondReviewQueueCandidate,
  ActuarySecondSubmissionRecord,
  ActuarySecondVerifierInput,
} from "@/lib/actuary-second/types";

type PersistedActuarySecondStore = {
  submissions: ActuarySecondSubmissionRecord[];
  reviewQueue: ActuarySecondReviewQueueCandidate[];
};

const store = createJsonFileRepository<PersistedActuarySecondStore>("actuary-second.json", () => ({
  submissions: [],
  reviewQueue: [],
}));

function newestFirst<T extends { submittedAt?: string; createdAt?: string; occurredAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aDate = a.submittedAt ?? a.createdAt ?? a.occurredAt ?? "";
    const bDate = b.submittedAt ?? b.createdAt ?? b.occurredAt ?? "";
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

function topFailureClass(submissions: ActuarySecondSubmissionRecord[]): ActuarySecondFailureClass | null {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    submission.evaluation.failure_classes.forEach((failureClass) => {
      acc[failureClass] = (acc[failureClass] ?? 0) + 1;
    });
    return acc;
  }, {});

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return (top?.[0] as ActuarySecondFailureClass | undefined) ?? null;
}

class FileActuarySecondRepository implements ActuarySecondRepository {
  async saveSubmission(userId: string, submission: ActuarySecondSubmissionRecord) {
    return store.update((data) => ({
      next: {
        ...data,
        submissions: [...data.submissions, submission],
        reviewQueue: submission.evaluation.review_queue_candidate
          ? [...data.reviewQueue, submission.evaluation.review_queue_candidate]
          : data.reviewQueue,
      },
      result: submission,
    }));
  }

  async listSubmissions(userId: string, subjectId?: "insurance_math") {
    return newestFirst(
      store.read().submissions.filter((item) => item.userId === userId && (!subjectId || item.subjectId === subjectId)),
    );
  }

  async listReviewQueue(userId: string, subjectId?: "insurance_math") {
    return newestFirst(
      store.read().reviewQueue.filter((item) => item.userId === userId && (!subjectId || item.subjectId === subjectId)),
    );
  }

  async getRecords(userId: string, subjectId?: "insurance_math"): Promise<ActuarySecondRecordsSummary> {
    const submissions = await this.listSubmissions(userId, subjectId);
    const items = newestFirst([
      ...submissions.map((submission) => ({
        id: `record_${submission.id}`,
        type: "submission" as const,
        title: submission.evaluation.records_summary.title,
        description: submission.evaluation.records_summary.summary,
        occurredAt: submission.submittedAt,
        metadata: {
          questionId: submission.questionId,
          nextAction: submission.evaluation.next_action.next_action_type,
          failureClass: submission.evaluation.primary_failure_class,
        },
      })),
      ...submissions.slice(0, 3).map((submission) => ({
        id: `coaching_${submission.id}`,
        type: "coaching" as const,
        title: submission.evaluation.coaching_seed.coachingTheme,
        description: submission.evaluation.coaching_seed.coachingSummary,
        occurredAt: submission.submittedAt,
        metadata: {
          questionId: submission.questionId,
          failureClass: submission.evaluation.primary_failure_class,
        },
      })),
    ]);

    const topFailure = topFailureClass(submissions);
    return {
      subjectId: "insurance_math" as const,
      items,
      aggregate: {
        submissionCount: submissions.length,
        reviewCandidateCount: submissions.filter((submission) => submission.evaluation.review_queue_candidate).length,
        recentActivityAt: items[0]?.occurredAt ?? null,
        topFailureClass: topFailure,
        summarySentence: topFailure
          ? `Most recent present-value work is clustering around ${topFailure}.`
          : "No repeated correction pattern is visible yet.",
      },
    };
  }
}

class SupabaseActuarySecondRepository implements ActuarySecondRepository {
  private get client() {
    return createSupabaseAdminClient();
  }

  async saveSubmission(userId: string, submission: ActuarySecondSubmissionRecord) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return submission;

    await client.from("answer_submissions").insert({
      id: submission.id,
      user_id: userId,
      exam_id: "actuary_second",
      subject_id: submission.subjectId,
      stage: "second",
      submission_kind: "sample_problem_submission",
      source_label: submission.questionId,
      raw_payload: submission.input,
      derived_payload: submission.evaluation,
      created_at: submission.submittedAt,
      updated_at: submission.submittedAt,
    });
    await client.from("diagnosis_results").insert({
      id: `actuary-second-verifier:${submission.id}`,
      user_id: userId,
      exam_id: "actuary_second",
      subject_id: submission.subjectId,
      stage: "second",
      source_submission_id: submission.id,
      result_kind: "verifier_output",
      raw_payload: submission.evaluation.verifier,
      derived_payload: {
        primaryFailureClass: submission.evaluation.primary_failure_class,
        partialCreditSignal: submission.evaluation.partial_credit_signal,
      },
      created_at: submission.submittedAt,
      updated_at: submission.submittedAt,
    });
    await client.from("coaching_seeds").upsert({
      id: `actuary-second-correction:${submission.id}`,
      user_id: userId,
      exam_id: "actuary_second",
      subject_id: submission.subjectId,
      stage: "second",
      seed_kind: "correction_seed",
      source_submission_id: submission.id,
      raw_payload: submission.evaluation.correction_seed,
      derived_payload: {
        nextAction: submission.evaluation.next_action,
        primaryFailureClass: submission.evaluation.primary_failure_class,
      },
      created_at: submission.submittedAt,
      updated_at: submission.submittedAt,
    });
    if (submission.evaluation.review_queue_candidate) {
      await client.from("review_queue_items").upsert({
        id: submission.evaluation.review_queue_candidate.id,
        user_id: userId,
        exam_id: "actuary_second",
        subject_id: submission.subjectId,
        stage: "second",
        source_submission_id: submission.id,
        source_kind: "submission",
        status: "queued",
        priority_score: submission.evaluation.review_queue_candidate.reviewPriorityScore,
        raw_payload: submission.evaluation.review_queue_candidate,
        derived_payload: {
          reviewReasonCodes: submission.evaluation.review_queue_candidate.reviewReasonCodes,
        },
        created_at: submission.submittedAt,
        updated_at: submission.submittedAt,
      });
    }
    return submission;
  }

  async listSubmissions(userId: string, subjectId?: "insurance_math") {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("answer_submissions")
      .select("id, created_at, raw_payload, derived_payload, subject_id")
      .eq("user_id", userId)
      .eq("exam_id", "actuary_second")
      .eq("submission_kind", "sample_problem_submission")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data } = await query;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      userId,
      subjectId: row.subject_id as "insurance_math",
      questionId: (row.raw_payload as ActuarySecondVerifierInput).question_id,
      submittedAt: row.created_at as string,
      input: row.raw_payload as ActuarySecondVerifierInput,
      evaluation: row.derived_payload as ActuarySecondEvaluationResult,
    }));
  }

  async listReviewQueue(userId: string, subjectId?: "insurance_math") {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("review_queue_items")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "actuary_second")
      .eq("status", "queued")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data } = await query;
    return (data ?? []).map((row) => row.raw_payload as ActuarySecondReviewQueueCandidate);
  }

  async getRecords(userId: string, subjectId?: "insurance_math"): Promise<ActuarySecondRecordsSummary> {
    const submissions = await this.listSubmissions(userId, subjectId);
    const items = newestFirst([
      ...submissions.map((submission) => ({
        id: `record_${submission.id}`,
        type: "submission" as const,
        title: submission.evaluation.records_summary.title,
        description: submission.evaluation.records_summary.summary,
        occurredAt: submission.submittedAt,
        metadata: {
          questionId: submission.questionId,
          nextAction: submission.evaluation.next_action.next_action_type,
          failureClass: submission.evaluation.primary_failure_class,
        },
      })),
      ...submissions.slice(0, 3).map((submission) => ({
        id: `coaching_${submission.id}`,
        type: "coaching" as const,
        title: submission.evaluation.coaching_seed.coachingTheme,
        description: submission.evaluation.coaching_seed.coachingSummary,
        occurredAt: submission.submittedAt,
        metadata: {
          questionId: submission.questionId,
          failureClass: submission.evaluation.primary_failure_class,
        },
      })),
    ]);

    const topFailure = topFailureClass(submissions);
    return {
      subjectId: "insurance_math",
      items,
      aggregate: {
        submissionCount: submissions.length,
        reviewCandidateCount: submissions.filter((submission) => submission.evaluation.review_queue_candidate).length,
        recentActivityAt: items[0]?.occurredAt ?? null,
        topFailureClass: topFailure,
        summarySentence: topFailure
          ? `Most recent present-value work is clustering around ${topFailure}.`
          : "No repeated correction pattern is visible yet.",
      },
    };
  }
}

class HybridActuarySecondRepository implements ActuarySecondRepository {
  private readonly fileRepository = new FileActuarySecondRepository();
  private readonly supabaseRepository = new SupabaseActuarySecondRepository();

  private select(userId: string) {
    return canUseSupabasePersistence(userId) ? this.supabaseRepository : this.fileRepository;
  }

  saveSubmission(userId: string, submission: ActuarySecondSubmissionRecord) {
    return this.select(userId).saveSubmission(userId, submission);
  }

  listSubmissions(userId: string, subjectId?: "insurance_math") {
    return this.select(userId).listSubmissions(userId, subjectId);
  }

  listReviewQueue(userId: string, subjectId?: "insurance_math") {
    return this.select(userId).listReviewQueue(userId, subjectId);
  }

  getRecords(userId: string, subjectId?: "insurance_math") {
    return this.select(userId).getRecords(userId, subjectId);
  }
}

export const actuarySecondRepository = new HybridActuarySecondRepository();
