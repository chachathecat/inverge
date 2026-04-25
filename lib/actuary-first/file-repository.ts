import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canUseSupabasePersistence } from "@/lib/supabase/persistence";
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";
import type { ActuaryFirstRepository } from "@/lib/actuary-first/repository";
import type {
  ActuaryFirstSubjectId,
  FailureClass,
  ProbabilityRecordsSummary,
  ProbabilitySetSubmission,
  ReviewCompletion,
  ReviewCompletionInput,
  ReviewQueueCandidate,
} from "@/lib/actuary-first/types";

type PersistedActuaryFirstStore = {
  setSubmissions: ProbabilitySetSubmission[];
  reviewQueue: ReviewQueueCandidate[];
  reviewCompletions: ReviewCompletion[];
};

const store = createJsonFileRepository<PersistedActuaryFirstStore>("actuary-first.json", () => ({
  setSubmissions: [],
  reviewQueue: [],
  reviewCompletions: [],
}));

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newestFirst<T extends { submittedAt?: string; reviewedAt?: string; createdAt?: string; occurredAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aDate = a.submittedAt ?? a.reviewedAt ?? a.createdAt ?? a.occurredAt ?? "";
    const bDate = b.submittedAt ?? b.reviewedAt ?? b.createdAt ?? b.occurredAt ?? "";
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

function topFailureClass(submissions: ProbabilitySetSubmission[]): FailureClass | null {
  const counts = submissions.reduce<Record<string, number>>((acc, submission) => {
    submission.reviewQueueCandidates.forEach((candidate) => {
      candidate.rootCauseTags.forEach((tag) => {
        acc[tag] = (acc[tag] ?? 0) + 1;
      });
    });
    return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return (top?.[0] as FailureClass | undefined) ?? null;
}

class FileActuaryFirstRepository implements ActuaryFirstRepository {
  async saveSetSubmission(userId: string, submission: ProbabilitySetSubmission) {
    return store.update((data) => ({
      next: {
        ...data,
        setSubmissions: [...data.setSubmissions, submission],
        reviewQueue: [...data.reviewQueue, ...submission.reviewQueueCandidates],
      },
      result: submission,
    }));
  }

  async listSetSubmissions(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return newestFirst(
      store.read().setSubmissions.filter((item) => item.userId === userId && (!subjectId || item.subjectId === subjectId)),
    );
  }

  async listReviewQueue(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return newestFirst(
      store
        .read()
        .reviewQueue.filter((item) => item.userId === userId && item.status === "queued" && (!subjectId || item.subjectId === subjectId)),
    );
  }

  async completeReview(userId: string, input: ReviewCompletionInput) {
    const reviewedAt = input.reviewedAt ?? new Date().toISOString();
    const completion: ReviewCompletion = {
      ...input,
      id: createId("actuary_review_completion"),
      userId,
      reviewedAt,
    };
    return store.update((data) => ({
      next: {
        ...data,
        reviewQueue: data.reviewQueue.map((item) =>
          item.userId === userId && item.id === input.reviewId ? { ...item, status: "completed", completedAt: reviewedAt } : item,
        ),
        reviewCompletions: [...data.reviewCompletions, completion],
      },
      result: completion,
    }));
  }

  async listReviewCompletions(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return newestFirst(
      store.read().reviewCompletions.filter((item) => item.userId === userId && (!subjectId || subjectId === "probability")),
    );
  }

  async getRecords(userId: string, subjectId?: ActuaryFirstSubjectId): Promise<ProbabilityRecordsSummary> {
    const submissions = await this.listSetSubmissions(userId, subjectId);
    const completions = await this.listReviewCompletions(userId, subjectId);
    const items = newestFirst([
      ...submissions.map((submission) => ({
        id: `record_${submission.id}`,
        type: "pastSet" as const,
        title: "확률론 샘플 세트 제출",
        description: `${submission.setEvaluation.correct_count}/${submission.setEvaluation.answered_count} 정답, 리뷰 후보 ${submission.setEvaluation.review_candidate_count}개`,
        occurredAt: submission.submittedAt,
        metadata: {
          reviewCandidateCount: submission.setEvaluation.review_candidate_count,
          weakUnit: submission.setEvaluation.weak_unit_ids[0],
        },
      })),
      ...completions.map((completion) => ({
        id: `record_${completion.id}`,
        type: "review" as const,
        title: "리뷰 완료",
        description: "방금 놓친 계산 포인트를 다시 확인했습니다.",
        occurredAt: completion.reviewedAt,
        metadata: {
          questionId: completion.questionId,
        },
      })),
      ...submissions.slice(0, 1).map((submission) => ({
        id: `record_coaching_${submission.id}`,
        type: "coaching" as const,
        title: "다음 보정 포인트",
        description: submission.coachingSeed.coachingSummary,
        occurredAt: submission.submittedAt,
        metadata: {
          coachingTheme: submission.coachingSeed.coachingTheme,
        },
      })),
    ]);

    const topFailure = topFailureClass(submissions);
    return {
      subjectId: "probability" as const,
      items,
      aggregate: {
        setCount: submissions.length,
        reviewCompletedCount: completions.length,
        recentActivityAt: items[0]?.occurredAt ?? null,
        topFailureClass: topFailure,
        summarySentence: topFailure
          ? `${topFailure} 유형이 가장 자주 반복됩니다. 다음 세트 전 같은 유형을 짧게 다시 확인하는 편이 낫습니다.`
          : "아직 반복 패턴이 충분히 쌓이지 않았습니다.",
      },
    };
  }
}

class SupabaseActuaryFirstRepository implements ActuaryFirstRepository {
  private get client() {
    return createSupabaseAdminClient();
  }

  async saveSetSubmission(userId: string, submission: ProbabilitySetSubmission) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return submission;

    await client.from("answer_submissions").insert({
      id: submission.id,
      user_id: userId,
      exam_id: "actuary_first",
      subject_id: submission.subjectId,
      stage: "first",
      submission_kind: "sample_set_submission",
      source_label: submission.setId,
      raw_payload: submission,
      derived_payload: {
        nextAction: submission.nextAction,
        coachingSeed: submission.coachingSeed,
      },
      created_at: submission.submittedAt,
      updated_at: submission.submittedAt,
    });

    if (submission.reviewQueueCandidates.length > 0) {
      await client.from("review_queue_items").insert(
        submission.reviewQueueCandidates.map((candidate) => ({
          id: candidate.id,
          user_id: userId,
          exam_id: "actuary_first",
          subject_id: candidate.subjectId,
          stage: "first",
          source_submission_id: submission.id,
          source_kind: "submission",
          status: candidate.status,
          priority_score: candidate.reviewPriorityScore,
          raw_payload: candidate,
          derived_payload: {
            reviewReasonCodes: candidate.reviewReasonCodes,
            rootCauseTags: candidate.rootCauseTags,
          },
          created_at: candidate.createdAt,
          updated_at: candidate.createdAt,
        })),
      );
    }

    await client.from("coaching_seeds").upsert({
      id: `actuary-first-coaching:${submission.id}`,
      user_id: userId,
      exam_id: "actuary_first",
      subject_id: submission.subjectId,
      stage: "first",
      seed_kind: "coaching_seed",
      source_submission_id: submission.id,
      raw_payload: submission.coachingSeed,
      derived_payload: { nextAction: submission.nextAction },
      created_at: submission.submittedAt,
      updated_at: submission.submittedAt,
    });

    return submission;
  }

  async listSetSubmissions(userId: string, subjectId?: ActuaryFirstSubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("answer_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "actuary_first")
      .eq("submission_kind", "sample_set_submission")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data } = await query;
    return (data ?? []).map((row) => row.raw_payload as ProbabilitySetSubmission);
  }

  async listReviewQueue(userId: string, subjectId?: ActuaryFirstSubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("review_queue_items")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "actuary_first")
      .eq("status", "queued")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data } = await query;
    return (data ?? []).map((row) => row.raw_payload as ReviewQueueCandidate);
  }

  async completeReview(userId: string, input: ReviewCompletionInput) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) {
      return new FileActuaryFirstRepository().completeReview(userId, input);
    }
    const reviewedAt = input.reviewedAt ?? new Date().toISOString();
    const completion: ReviewCompletion = {
      ...input,
      id: createId("actuary_review_completion"),
      userId,
      reviewedAt,
    };
    await client.from("review_queue_items").update({ status: "completed", updated_at: reviewedAt }).eq("id", input.reviewId).eq("user_id", userId);
    await client.from("diagnosis_results").insert({
      id: completion.id,
      user_id: userId,
      exam_id: "actuary_first",
      subject_id: "probability",
      stage: "first",
      source_submission_id: completion.setId,
      result_kind: "review_completion",
      raw_payload: completion,
      derived_payload: { questionId: completion.questionId },
      created_at: reviewedAt,
      updated_at: reviewedAt,
    });
    return completion;
  }

  async listReviewCompletions(userId: string, subjectId?: ActuaryFirstSubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("diagnosis_results")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "actuary_first")
      .eq("result_kind", "review_completion")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const { data } = await query;
    return (data ?? []).map((row) => row.raw_payload as ReviewCompletion);
  }

  async getRecords(userId: string, subjectId?: ActuaryFirstSubjectId): Promise<ProbabilityRecordsSummary> {
    const submissions = await this.listSetSubmissions(userId, subjectId);
    const completions = await this.listReviewCompletions(userId, subjectId);
    const items = newestFirst([
      ...submissions.map((submission) => ({
        id: `record_${submission.id}`,
        type: "pastSet" as const,
        title: "Probability sample set submitted",
        description: `${submission.setEvaluation.correct_count}/${submission.setEvaluation.answered_count} correct, ${submission.setEvaluation.review_candidate_count} review candidates`,
        occurredAt: submission.submittedAt,
        metadata: {
          reviewCandidateCount: submission.setEvaluation.review_candidate_count,
          weakUnit: submission.setEvaluation.weak_unit_ids[0],
        },
      })),
      ...completions.map((completion) => ({
        id: `record_${completion.id}`,
        type: "review" as const,
        title: "Review completed",
        description: "The targeted probability item was reviewed again.",
        occurredAt: completion.reviewedAt,
        metadata: {
          questionId: completion.questionId,
        },
      })),
      ...submissions.slice(0, 1).map((submission) => ({
        id: `record_coaching_${submission.id}`,
        type: "coaching" as const,
        title: "Next coaching focus",
        description: submission.coachingSeed.coachingSummary,
        occurredAt: submission.submittedAt,
        metadata: {
          coachingTheme: submission.coachingSeed.coachingTheme,
        },
      })),
    ]);

    const topFailure = topFailureClass(submissions);
    return {
      subjectId: "probability",
      items,
      aggregate: {
        setCount: submissions.length,
        reviewCompletedCount: completions.length,
        recentActivityAt: items[0]?.occurredAt ?? null,
        topFailureClass: topFailure,
        summarySentence: topFailure
          ? `${topFailure} is the most repeated pattern in the current probability attempts.`
          : "No repeated probability pattern is visible yet.",
      },
    };
  }
}

class HybridActuaryFirstRepository implements ActuaryFirstRepository {
  private readonly fileRepository = new FileActuaryFirstRepository();
  private readonly supabaseRepository = new SupabaseActuaryFirstRepository();

  private select(userId: string) {
    return canUseSupabasePersistence(userId) ? this.supabaseRepository : this.fileRepository;
  }

  saveSetSubmission(userId: string, submission: ProbabilitySetSubmission) {
    return this.select(userId).saveSetSubmission(userId, submission);
  }

  listSetSubmissions(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return this.select(userId).listSetSubmissions(userId, subjectId);
  }

  listReviewQueue(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return this.select(userId).listReviewQueue(userId, subjectId);
  }

  completeReview(userId: string, input: ReviewCompletionInput) {
    return this.select(userId).completeReview(userId, input);
  }

  listReviewCompletions(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return this.select(userId).listReviewCompletions(userId, subjectId);
  }

  getRecords(userId: string, subjectId?: ActuaryFirstSubjectId) {
    return this.select(userId).getRecords(userId, subjectId);
  }
}

export const actuaryFirstRepository = new HybridActuaryFirstRepository();
