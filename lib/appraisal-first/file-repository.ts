import "server-only";

import { isUuid } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertSupabaseOperation,
  canUseSupabasePersistence,
  SupabasePersistenceUnavailableError,
} from "@/lib/supabase/persistence";
import type { AppraisalFirstRepository } from "@/lib/appraisal-first/repository";
import type {
  AppraisalFirstOnboarding,
  RecordsSummary,
  RecordsTimelineItem,
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
import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

type PersistedAppraisalFirstStore = {
  onboarding: AppraisalFirstOnboarding[];
  starterDiagnosis: StarterDiagnosisResult[];
  setSubmissions: SetSubmission[];
  diagnosisEvents: DiagnosisEvent[];
  reviewQueue: ReviewQueueItem[];
  reviewCompletions: ReviewCompletion[];
  weeklyPlans: WeeklyCoachingPlan[];
};

const store = createJsonFileRepository<PersistedAppraisalFirstStore>("appraisal-first.json", () => ({
  onboarding: [],
  starterDiagnosis: [],
  setSubmissions: [],
  diagnosisEvents: [],
  reviewQueue: [],
  reviewCompletions: [],
  weeklyPlans: [],
}));

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function byUser<T extends { userId: string }>(items: T[], userId: string) {
  return items.filter((item) => item.userId === userId);
}

function bySubject<T extends { subjectId?: SubjectId }>(items: T[], subjectId?: SubjectId) {
  return subjectId ? items.filter((item) => item.subjectId === subjectId) : items;
}

function newestFirst<T extends { submittedAt?: string; reviewedAt?: string; createdAt?: string; occurredAt?: string }>(
  items: T[],
) {
  return [...items].sort((a, b) => {
    const aDate = a.submittedAt ?? a.reviewedAt ?? a.createdAt ?? a.occurredAt ?? "";
    const bDate = b.submittedAt ?? b.reviewedAt ?? b.createdAt ?? b.occurredAt ?? "";
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

function abilityAxesForSubject(subjectId: SubjectId) {
  if (subjectId === "appraisal_law") return ["lawRecall", "choiceJudgment"] as const;
  if (subjectId === "accounting" || subjectId === "economics") return ["calculationStability", "timeManagement"] as const;
  return ["choiceJudgment", "accuracy"] as const;
}

function getSubjectLabel(subjectId: SubjectId) {
  if (subjectId === "civil_law") return "민법";
  if (subjectId === "economics") return "경제학원론";
  if (subjectId === "real_estate") return "부동산학원론";
  if (subjectId === "accounting") return "회계학";
  return "감정평가관계법규";
}

function buildSetRecordTitle(subjectId: SubjectId) {
  return `${getSubjectLabel(subjectId)} ?? ??`;
}

function buildSetRecordDescription(submission: SetSubmission) {
  return `?? ${submission.feedback.answeredCount}/${submission.feedback.totalQuestions}?? ? ?? ?? ${submission.feedback.reviewQueueCandidateCount}??`;
}

function buildReviewRecordTitle(subjectId: SubjectId) {
  return `${getSubjectLabel(subjectId)} ?? ??`;
}

function buildReviewRecordDescription(completion: ReviewCompletion) {
  return completion.isCorrectOnReview ? "?? ??? ??? ??????." : "? ? ? ??? ??? ?????.";
}

function buildWeeklyPlanTitle() {
  return "?? ?? ????";
}

function getTopDiagnosis(events: DiagnosisEvent[]) {
  return [...events].sort((a, b) => b.reviewPriorityScore - a.reviewPriorityScore)[0];
}

function buildDiagnosisRecordItem(events: DiagnosisEvent[], subjectId?: SubjectId): RecordsTimelineItem | null {
  const top = getTopDiagnosis(events);
  if (!top) return null;

  return {
    id: `diagnosis_summary_${subjectId ?? "all"}`,
    type: "review",
    subjectId: top.subjectId,
    title: `${top.topicName} 吏꾨떒 ?붿빟`,
    description: `${top.subtopicName}?먯꽌 ${top.reviewReasonSentence}`,
    occurredAt: top.createdAt,
    status: "active",
    linkedAbilityAxes: top.rootCauseGroup === "condition_logic_failure" ? ["choiceJudgment", "lawRecall"] : ["accuracy"],
    metadata: {
      curriculumNodeId: top.curriculumNodeId,
      rootCauseTag: top.primaryRootCauseTag,
      reviewPriorityScore: Math.round(top.reviewPriorityScore),
      diagnosisEventCount: events.length,
    },
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown-error";
}

class FileAppraisalFirstRepository implements AppraisalFirstRepository {
  async saveOnboarding(input: AppraisalFirstOnboarding) {
    return store.update((data) => {
      const next = {
        ...data,
        onboarding: [...data.onboarding.filter((item) => item.userId !== input.userId), input],
      };
      return { next, result: input };
    });
  }

  async getOnboarding(userId: string) {
    return store.read().onboarding.find((item) => item.userId === userId) ?? null;
  }

  async saveStarterDiagnosis(input: StarterDiagnosisResult) {
    return store.update((data) => {
      const next = {
        ...data,
        starterDiagnosis: [...data.starterDiagnosis.filter((item) => item.userId !== input.userId), input],
      };
      return { next, result: input };
    });
  }

  async getStarterDiagnosis(userId: string) {
    return store.read().starterDiagnosis.find((item) => item.userId === userId) ?? null;
  }

  async saveSetSubmission(userId: string, input: SetSubmissionInput) {
    const submittedAt = input.submittedAt ?? new Date().toISOString();
    const submission: SetSubmission = {
      ...input,
      id: createId("set"),
      userId,
      submittedAt,
    };

    return store.update((data) => {
      const createdItems = input.reviewQueueCandidates.map<ReviewQueueItem>((candidate) => ({
        ...candidate,
        id: `review_${submission.id}_${candidate.questionId}`,
        userId,
        status: "queued",
        sourceSubmissionId: submission.id,
        createdAt: submittedAt,
      }));

      return {
        next: {
          ...data,
          setSubmissions: [...data.setSubmissions, submission],
          reviewQueue: [...data.reviewQueue, ...createdItems],
        },
        result: submission,
      };
    });
  }

  async listSetSubmissions(userId: string, subjectId?: SubjectId) {
    return newestFirst(bySubject(byUser(store.read().setSubmissions, userId), subjectId));
  }

  async saveDiagnosisEvents(userId: string, events: DiagnosisEvent[]) {
    return store.update((data) => {
      const retained = data.diagnosisEvents.filter(
        (event) => event.userId !== userId || !events.some((item) => item.eventId === event.eventId),
      );

      return {
        next: {
          ...data,
          diagnosisEvents: [...retained, ...events],
        },
        result: events,
      };
    });
  }

  async listDiagnosisEvents(userId: string, subjectId?: SubjectId) {
    return newestFirst(bySubject(byUser(store.read().diagnosisEvents, userId), subjectId));
  }

  async listReviewQueue(userId: string, subjectId?: SubjectId) {
    const items = bySubject(byUser(store.read().reviewQueue, userId), subjectId);
    return newestFirst(items.filter((item) => item.status === "queued" || item.status === "in_review"));
  }

  async completeReview(userId: string, input: ReviewCompletionInput) {
    const reviewedAt = input.reviewedAt ?? new Date().toISOString();
    const completion: ReviewCompletion = {
      ...input,
      id: createId("completion"),
      userId,
      reviewedAt,
    };

    return store.update((data) => ({
      next: {
        ...data,
        reviewQueue: data.reviewQueue.map((item) =>
          item.userId === userId && item.id === input.reviewId
            ? { ...item, status: "completed", completedAt: reviewedAt }
            : item,
        ),
        reviewCompletions: [...data.reviewCompletions, completion],
      },
      result: completion,
    }));
  }

  async listReviewCompletions(userId: string, subjectId?: SubjectId) {
    return newestFirst(bySubject(byUser(store.read().reviewCompletions, userId), subjectId));
  }

  async saveWeeklyPlan(plan: WeeklyCoachingPlan) {
    return store.update((data) => ({
      next: {
        ...data,
        weeklyPlans: [plan, ...data.weeklyPlans.filter((item) => !(item.userId === plan.userId && item.id === plan.id))],
      },
      result: plan,
    }));
  }

  async getActiveWeeklyPlan(userId: string) {
    return (
      byUser(store.read().weeklyPlans, userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find((plan) => plan.status === "active") ?? null
    );
  }

  async getRecords(userId: string, subjectId?: SubjectId): Promise<RecordsSummary> {
    const setItems = (await this.listSetSubmissions(userId, subjectId)).map<RecordsTimelineItem>((submission) => ({
      id: `record_${submission.id}`,
      type: "pastSet",
      subjectId: submission.subjectId,
      title: buildSetRecordTitle(submission.subjectId),
      description: buildSetRecordDescription(submission),
      occurredAt: submission.submittedAt,
      status: "completed",
      linkedAbilityAxes: [...abilityAxesForSubject(submission.subjectId)],
      metadata: {
        setId: submission.setId,
        answeredCount: submission.feedback.answeredCount,
        totalQuestions: submission.feedback.totalQuestions,
      },
    }));
    const reviewItems = (await this.listReviewCompletions(userId, subjectId)).map<RecordsTimelineItem>((completion) => ({
      id: `record_${completion.id}`,
      type: "review",
      subjectId: completion.subjectId,
      title: buildReviewRecordTitle(completion.subjectId),
      description: buildReviewRecordDescription(completion),
      occurredAt: completion.reviewedAt,
      status: "completed",
      linkedAbilityAxes: completion.linkedAbilityAxes,
      metadata: { setId: completion.setId },
    }));
    const weeklyItems = byUser(store.read().weeklyPlans, userId)
      .filter((plan) => !subjectId || plan.primarySubjectIds.includes(subjectId))
      .map<RecordsTimelineItem>((plan) => ({
        id: `record_${plan.id}`,
        type: "weeklyPlan",
        subjectId,
        title: buildWeeklyPlanTitle(),
        description: plan.summary,
        occurredAt: plan.createdAt,
        status: plan.status === "archived" ? "completed" : plan.status,
        metadata: {
          targetSetCount: plan.targetSetCount,
          reviewTargetCount: plan.reviewTargetCount,
        },
      }));
    const diagnosisEvents = await this.listDiagnosisEvents(userId, subjectId);
    const diagnosisItem = buildDiagnosisRecordItem(diagnosisEvents, subjectId);
    const items = newestFirst([...setItems, ...reviewItems, ...weeklyItems]);
    const itemsWithDiagnosis = diagnosisItem ? newestFirst([diagnosisItem, ...items]) : items;
    const topDiagnosis = getTopDiagnosis(diagnosisEvents);

    return {
      subjectId,
      items: itemsWithDiagnosis,
      aggregate: {
        pastSetCount: setItems.length,
        reviewCompletedCount: reviewItems.length,
        activeWeeklyPlanCount: weeklyItems.filter((item) => item.status === "active").length,
        recentActivityAt: itemsWithDiagnosis[0]?.occurredAt ?? null,
        topCurriculumNodeId: topDiagnosis?.curriculumNodeId,
        topRootCauseGroup: topDiagnosis?.rootCauseGroup,
        topRootCauseTag: topDiagnosis?.primaryRootCauseTag,
        diagnosisEventCount: diagnosisEvents.length,
        summarySentence: topDiagnosis
          ? `${topDiagnosis.topicName}?? ${topDiagnosis.subtopicName} ?? ??? ?? ?????.`
          : undefined,
      },
    };
  }

  async getSubjectSummary(userId: string, subjectId: SubjectId): Promise<SubjectDashboardSummary> {
    const submissions = await this.listSetSubmissions(userId, subjectId);
    const completions = await this.listReviewCompletions(userId, subjectId);
    const remainingReviewCount = (await this.listReviewQueue(userId, subjectId)).length;
    const diagnosisEvents = await this.listDiagnosisEvents(userId, subjectId);
    const topDiagnosis = getTopDiagnosis(diagnosisEvents);
    const weeklyPlan = await this.getActiveWeeklyPlan(userId);
    const activeWeeklyPlan = Boolean(weeklyPlan?.primarySubjectIds.includes(subjectId));
    const latest = newestFirst([
      ...submissions.map((item) => ({ occurredAt: item.submittedAt })),
      ...completions.map((item) => ({ occurredAt: item.reviewedAt })),
      ...(activeWeeklyPlan && weeklyPlan ? [{ occurredAt: weeklyPlan.createdAt }] : []),
    ])[0]?.occurredAt ?? null;

    const statusLabel =
      submissions.length === 0
        ? "cold_start"
        : submissions.reduce((sum, item) => sum + item.feedback.totalQuestions, 0) < 10
          ? "baseline_building"
          : remainingReviewCount > 0
            ? "review_needed"
            : topDiagnosis && topDiagnosis.reviewPriorityScore >= 70
              ? "weak_pattern_detected"
              : activeWeeklyPlan
                ? "weekly_plan_active"
                : "stable_practice";

    return {
      subjectId,
      lastActivityAt: latest,
      remainingReviewCount,
      activeWeeklyPlan,
      primaryAbilityAxis:
        completions.flatMap((item) => item.linkedAbilityAxes ?? [])[0] ??
        (topDiagnosis?.rootCauseGroup === "condition_logic_failure" ? "choiceJudgment" : abilityAxesForSubject(subjectId)[0]),
      pastSetCount: submissions.length,
      reviewCompletedCount: completions.length,
      topCurriculumNodeId: topDiagnosis?.curriculumNodeId,
      topRootCauseGroup: topDiagnosis?.rootCauseGroup,
      topRootCauseTag: topDiagnosis?.primaryRootCauseTag,
      statusLabel,
      statusCopy: topDiagnosis
        ? `${topDiagnosis.topicName} > ${topDiagnosis.subtopicName}?? ${topDiagnosis.reviewReasonSentence}`
        : submissions.length === 0
          ? "?? ? ??? ??? ????. starter set?? ??? ???."
          : "?? ??? ???? ?? ??? ??????.",
      nextActionReason:
        remainingReviewCount > 0
          ? "?? ???? ?? ?? ??? ?? ????."
          : activeWeeklyPlan
            ? "?? ? ?? ??? ?? ???? ????."
            : "?? ??? ?? ?? ???? ?????.",
      nextAction:
        remainingReviewCount > 0
          ? "reviewQueue"
          : submissions.length === 0
            ? "solveSet"
            : activeWeeklyPlan
              ? "solveSet"
              : "weeklyCoaching",
    };
  }
}

class SupabaseAppraisalFirstRepository implements AppraisalFirstRepository {
  private get client() {
    return createSupabaseAdminClient();
  }

  async saveOnboarding(input: AppraisalFirstOnboarding) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(input.userId)) return input;
    const result = await client.from("exam_sessions").upsert({
      id: `onboarding:${input.userId}`,
      user_id: input.userId,
      exam_id: input.examId,
      subject_id: null,
      stage: "first",
      session_kind: "onboarding",
      source_label: "appraisal-first",
      raw_payload: input,
      derived_payload: input.derived,
      created_at: input.metadata.createdAt,
      updated_at: input.metadata.updatedAt,
    });
    assertSupabaseOperation("appraisal-first.saveOnboarding", result);
    return input;
  }

  async getOnboarding(userId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return null;
    const result = await client
      .from("exam_sessions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .eq("session_kind", "onboarding")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assertSupabaseOperation("appraisal-first.getOnboarding", result);
    return (result.data?.raw_payload as AppraisalFirstOnboarding | undefined) ?? null;
  }

  async saveStarterDiagnosis(input: StarterDiagnosisResult) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(input.userId)) return input;
    const result = await client.from("diagnosis_results").upsert({
      id: `starter:${input.userId}`,
      user_id: input.userId,
      exam_id: input.examId,
      subject_id: input.selectedSubjectId,
      stage: "first",
      result_kind: "starter_diagnosis",
      raw_payload: input,
      derived_payload: {
        prioritySubjectIds: input.firstWeekPlanSeedPatch.prioritySubjectIds,
        priorityAbilityKeys: input.firstWeekPlanSeedPatch.priorityAbilityKeys,
      },
      created_at: input.metadata.createdAt,
      updated_at: input.metadata.createdAt,
    });
    assertSupabaseOperation("appraisal-first.saveStarterDiagnosis", result);
    return input;
  }

  async getStarterDiagnosis(userId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return null;
    const result = await client
      .from("diagnosis_results")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .eq("result_kind", "starter_diagnosis")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assertSupabaseOperation("appraisal-first.getStarterDiagnosis", result);
    return (result.data?.raw_payload as StarterDiagnosisResult | undefined) ?? null;
  }

  async saveSetSubmission(userId: string, input: SetSubmissionInput) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) {
      return new FileAppraisalFirstRepository().saveSetSubmission(userId, input);
    }

    const submittedAt = input.submittedAt ?? new Date().toISOString();
    const submission: SetSubmission = {
      ...input,
      id: createId("set"),
      userId,
      submittedAt,
    };

    const submissionInsert = await client.from("answer_submissions").insert({
      id: submission.id,
      user_id: userId,
      exam_id: "appraisal_first",
      subject_id: submission.subjectId,
      stage: "first",
      submission_kind: "set_submission",
      source_label: submission.setId,
      raw_payload: submission,
      derived_payload: {
        reviewQueueCandidateCount: submission.feedback.reviewQueueCandidateCount,
        answeredCount: submission.feedback.answeredCount,
      },
      created_at: submission.submittedAt,
      updated_at: submission.submittedAt,
    });
    assertSupabaseOperation("appraisal-first.saveSetSubmission.answer_submissions", submissionInsert);

    if (input.reviewQueueCandidates.length > 0) {
      const reviewQueueInsert = await client.from("review_queue_items").insert(
        input.reviewQueueCandidates.map((candidate) => ({
          id: `review_${submission.id}_${candidate.questionId}`,
          user_id: userId,
          exam_id: "appraisal_first",
          subject_id: candidate.subjectId,
          stage: "first",
          source_submission_id: submission.id,
          source_kind: "submission",
          status: "queued",
          priority_score:
            candidate.priority === "today" ? 90 : candidate.priority === "this_week" ? 60 : 30,
          raw_payload: {
            ...candidate,
            id: `review_${submission.id}_${candidate.questionId}`,
            userId,
            status: "queued",
            sourceSubmissionId: submission.id,
            createdAt: submittedAt,
          },
          derived_payload: {
            reasonCodes: candidate.reasonCodes,
            rootCauseTag: candidate.rootCauseTag ?? null,
          },
          created_at: submittedAt,
          updated_at: submittedAt,
        })),
      );
      assertSupabaseOperation("appraisal-first.saveSetSubmission.review_queue_items", reviewQueueInsert);
    }

    return submission;
  }

  async listSetSubmissions(userId: string, subjectId?: SubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("answer_submissions")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .eq("submission_kind", "set_submission")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const result = await query;
    assertSupabaseOperation("appraisal-first.listSetSubmissions", result);
    return (result.data ?? []).map((row) => row.raw_payload as SetSubmission);
  }

  async saveDiagnosisEvents(userId: string, events: DiagnosisEvent[]) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId) || events.length === 0) return events;
    const result = await client.from("diagnosis_results").upsert(
      events.map((event) => ({
        id: event.eventId,
        user_id: userId,
        exam_id: "appraisal_first",
        subject_id: event.subjectId,
        stage: "first",
        source_submission_id: event.setSubmissionId,
        result_kind: "diagnosis_event",
        raw_payload: event,
        derived_payload: {
          reviewPriorityScore: event.reviewPriorityScore,
          primaryRootCauseTag: event.primaryRootCauseTag,
        },
        created_at: event.createdAt,
        updated_at: event.createdAt,
      })),
    );
    assertSupabaseOperation("appraisal-first.saveDiagnosisEvents", result);
    return events;
  }

  async listDiagnosisEvents(userId: string, subjectId?: SubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("diagnosis_results")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .eq("result_kind", "diagnosis_event")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const result = await query;
    assertSupabaseOperation("appraisal-first.listDiagnosisEvents", result);
    return (result.data ?? []).map((row) => row.raw_payload as DiagnosisEvent);
  }

  async listReviewQueue(userId: string, subjectId?: SubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("review_queue_items")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .in("status", ["queued", "in_review"])
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const result = await query;
    assertSupabaseOperation("appraisal-first.listReviewQueue", result);
    return (result.data ?? []).map((row) => row.raw_payload as ReviewQueueItem);
  }

  async completeReview(userId: string, input: ReviewCompletionInput) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) {
      return new FileAppraisalFirstRepository().completeReview(userId, input);
    }
    const reviewedAt = input.reviewedAt ?? new Date().toISOString();
    const completion: ReviewCompletion = {
      ...input,
      id: createId("completion"),
      userId,
      reviewedAt,
    };
    let existingQueueItem: ReviewQueueItem | null = null;
    try {
      existingQueueItem = (await this.listReviewQueue(userId)).find((item) => item.id === input.reviewId) ?? null;
    } catch (error) {
      throw new Error(`appraisal-first.completeReview.loadQueueItem:${getErrorMessage(error)}`);
    }

    const reviewQueueUpdate = await client.from("review_queue_items").update({
      status: "completed",
      updated_at: reviewedAt,
      raw_payload: {
        ...existingQueueItem,
        status: "completed",
        completedAt: reviewedAt,
      },
    }).eq("id", input.reviewId).eq("user_id", userId);
    assertSupabaseOperation("appraisal-first.completeReview.review_queue_items", reviewQueueUpdate);

    const diagnosisInsert = await client.from("diagnosis_results").insert({
      id: completion.id,
      user_id: userId,
      exam_id: "appraisal_first",
      subject_id: completion.subjectId,
      stage: "first",
      source_submission_id: completion.setId,
      result_kind: "review_completion",
      raw_payload: completion,
      derived_payload: { isCorrectOnReview: completion.isCorrectOnReview ?? null },
      created_at: reviewedAt,
      updated_at: reviewedAt,
    });
    assertSupabaseOperation("appraisal-first.completeReview.diagnosis_results", diagnosisInsert);
    return completion;
  }

  async listReviewCompletions(userId: string, subjectId?: SubjectId) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return [];
    let query = client
      .from("diagnosis_results")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .eq("result_kind", "review_completion")
      .order("created_at", { ascending: false });
    if (subjectId) query = query.eq("subject_id", subjectId);
    const result = await query;
    assertSupabaseOperation("appraisal-first.listReviewCompletions", result);
    return (result.data ?? []).map((row) => row.raw_payload as ReviewCompletion);
  }

  async saveWeeklyPlan(plan: WeeklyCoachingPlan) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(plan.userId)) return plan;
    const result = await client.from("coaching_seeds").upsert({
      id: plan.id,
      user_id: plan.userId,
      exam_id: "appraisal_first",
      subject_id: plan.primarySubjectIds[0] ?? null,
      stage: "first",
      seed_kind: "weekly_plan",
      raw_payload: plan,
      derived_payload: {
        priorityAbilityKeys: plan.priorityAbilityKeys,
        targetSetCount: plan.targetSetCount,
      },
      created_at: plan.createdAt,
      updated_at: plan.createdAt,
    });
    assertSupabaseOperation("appraisal-first.saveWeeklyPlan", result);
    return plan;
  }

  async getActiveWeeklyPlan(userId: string) {
    const client = this.client;
    if (!client || !canUseSupabasePersistence(userId)) return null;
    const result = await client
      .from("coaching_seeds")
      .select("raw_payload")
      .eq("user_id", userId)
      .eq("exam_id", "appraisal_first")
      .eq("seed_kind", "weekly_plan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assertSupabaseOperation("appraisal-first.getActiveWeeklyPlan", result);
    const plan = (result.data?.raw_payload as WeeklyCoachingPlan | undefined) ?? null;
    return plan?.status === "active" ? plan : null;
  }

  async getRecords(userId: string, subjectId?: SubjectId) {
    const setItems = (await this.listSetSubmissions(userId, subjectId)).map<RecordsTimelineItem>((submission) => ({
      id: `record_${submission.id}`,
      type: "pastSet",
      subjectId: submission.subjectId,
      title: buildSetRecordTitle(submission.subjectId),
      description: buildSetRecordDescription(submission),
      occurredAt: submission.submittedAt,
      status: "completed",
      linkedAbilityAxes: [...abilityAxesForSubject(submission.subjectId)],
      metadata: {
        setId: submission.setId,
        answeredCount: submission.feedback.answeredCount,
        totalQuestions: submission.feedback.totalQuestions,
      },
    }));
    const reviewItems = (await this.listReviewCompletions(userId, subjectId)).map<RecordsTimelineItem>((completion) => ({
      id: `record_${completion.id}`,
      type: "review",
      subjectId: completion.subjectId,
      title: buildReviewRecordTitle(completion.subjectId),
      description: buildReviewRecordDescription(completion),
      occurredAt: completion.reviewedAt,
      status: "completed",
      linkedAbilityAxes: completion.linkedAbilityAxes,
      metadata: { setId: completion.setId },
    }));
    const weeklyPlan = await this.getActiveWeeklyPlan(userId);
    const weeklyItems = weeklyPlan && (!subjectId || weeklyPlan.primarySubjectIds.includes(subjectId))
      ? [{
          id: `record_${weeklyPlan.id}`,
          type: "weeklyPlan" as const,
          subjectId,
          title: buildWeeklyPlanTitle(),
          description: weeklyPlan.summary,
          occurredAt: weeklyPlan.createdAt,
          status: weeklyPlan.status === "archived" ? "completed" : weeklyPlan.status,
          metadata: {
            targetSetCount: weeklyPlan.targetSetCount,
            reviewTargetCount: weeklyPlan.reviewTargetCount,
          },
        }]
      : [];
    const diagnosisEvents = await this.listDiagnosisEvents(userId, subjectId);
    const diagnosisItem = buildDiagnosisRecordItem(diagnosisEvents, subjectId);
    const items = newestFirst([...setItems, ...reviewItems, ...weeklyItems]);
    const itemsWithDiagnosis = diagnosisItem ? newestFirst([diagnosisItem, ...items]) : items;
    const topDiagnosis = getTopDiagnosis(diagnosisEvents);

    return {
      subjectId,
      items: itemsWithDiagnosis,
      aggregate: {
        pastSetCount: setItems.length,
        reviewCompletedCount: reviewItems.length,
        activeWeeklyPlanCount: weeklyItems.filter((item) => item.status === "active").length,
        recentActivityAt: itemsWithDiagnosis[0]?.occurredAt ?? null,
        topCurriculumNodeId: topDiagnosis?.curriculumNodeId,
        topRootCauseGroup: topDiagnosis?.rootCauseGroup,
        topRootCauseTag: topDiagnosis?.primaryRootCauseTag,
        diagnosisEventCount: diagnosisEvents.length,
        summarySentence: topDiagnosis
          ? `${topDiagnosis.topicName}?먯꽌 ${topDiagnosis.subtopicName} 愿???⑦꽩??媛??諛섎났?⑸땲??`
          : undefined,
      },
    };
  }

  async getSubjectSummary(userId: string, subjectId: SubjectId): Promise<SubjectDashboardSummary> {
    const submissions = await this.listSetSubmissions(userId, subjectId);
    const completions = await this.listReviewCompletions(userId, subjectId);
    const remainingReviewCount = (await this.listReviewQueue(userId, subjectId)).length;
    const diagnosisEvents = await this.listDiagnosisEvents(userId, subjectId);
    const topDiagnosis = getTopDiagnosis(diagnosisEvents);
    const weeklyPlan = await this.getActiveWeeklyPlan(userId);
    const activeWeeklyPlan = Boolean(weeklyPlan?.primarySubjectIds.includes(subjectId));
    const latest = newestFirst([
      ...submissions.map((item) => ({ occurredAt: item.submittedAt })),
      ...completions.map((item) => ({ occurredAt: item.reviewedAt })),
      ...(activeWeeklyPlan && weeklyPlan ? [{ occurredAt: weeklyPlan.createdAt }] : []),
    ])[0]?.occurredAt ?? null;

    const statusLabel: SubjectDashboardSummary["statusLabel"] =
      submissions.length === 0
        ? "cold_start"
        : submissions.reduce((sum, item) => sum + item.feedback.totalQuestions, 0) < 10
          ? "baseline_building"
          : remainingReviewCount > 0
            ? "review_needed"
            : topDiagnosis && topDiagnosis.reviewPriorityScore >= 70
              ? "weak_pattern_detected"
              : activeWeeklyPlan
                ? "weekly_plan_active"
                : "stable_practice";

    return {
      subjectId,
      lastActivityAt: latest,
      remainingReviewCount,
      activeWeeklyPlan,
      primaryAbilityAxis:
        completions.flatMap((item) => item.linkedAbilityAxes ?? [])[0] ??
        (topDiagnosis?.rootCauseGroup === "condition_logic_failure" ? "choiceJudgment" : abilityAxesForSubject(subjectId)[0]),
      pastSetCount: submissions.length,
      reviewCompletedCount: completions.length,
      topCurriculumNodeId: topDiagnosis?.curriculumNodeId,
      topRootCauseGroup: topDiagnosis?.rootCauseGroup,
      topRootCauseTag: topDiagnosis?.primaryRootCauseTag,
      statusLabel,
      statusCopy: topDiagnosis
        ? `${topDiagnosis.topicName} > ${topDiagnosis.subtopicName}?먯꽌 ${topDiagnosis.reviewReasonSentence}`
        : submissions.length === 0
          ? "?꾩쭅 ??怨쇰ぉ??湲곕줉???놁뒿?덈떎."
          : "理쒓렐 湲곕줉??湲곗??쇰줈 ?ㅼ쓬 ?됰룞???뺣━?섏뼱 ?덉뒿?덈떎.",
      nextActionReason:
        remainingReviewCount > 0
          ? "?꾩쭅 ?뺣━?섏? ?딆? 由щ럭 ??ぉ???⑥븘 ?덉뒿?덈떎."
          : activeWeeklyPlan
            ? "?대쾲 二?肄붿묶 怨꾪쉷???대? 以鍮꾨릺???덉뒿?덈떎."
            : "?ㅼ쓬 ?명듃濡??꾩옱 湲곗? ?곗씠?곕? 蹂닿컯?⑸땲??",
      nextAction:
        remainingReviewCount > 0
          ? "reviewQueue"
          : submissions.length === 0
            ? "solveSet"
            : activeWeeklyPlan
              ? "solveSet"
              : "weeklyCoaching",
    };
  }
}

class HybridAppraisalFirstRepository implements AppraisalFirstRepository {
  private readonly fileRepository = new FileAppraisalFirstRepository();
  private readonly supabaseRepository = new SupabaseAppraisalFirstRepository();

  private select(userId: string) {
    if (isUuid(userId) && !canUseSupabasePersistence(userId)) {
      throw new SupabasePersistenceUnavailableError();
    }
    return canUseSupabasePersistence(userId) ? this.supabaseRepository : this.fileRepository;
  }

  saveOnboarding(input: AppraisalFirstOnboarding) {
    return this.select(input.userId).saveOnboarding(input);
  }

  getOnboarding(userId: string) {
    return this.select(userId).getOnboarding(userId);
  }

  saveStarterDiagnosis(input: StarterDiagnosisResult) {
    return this.select(input.userId).saveStarterDiagnosis(input);
  }

  getStarterDiagnosis(userId: string) {
    return this.select(userId).getStarterDiagnosis(userId);
  }

  saveSetSubmission(userId: string, input: SetSubmissionInput) {
    return this.select(userId).saveSetSubmission(userId, input);
  }

  listSetSubmissions(userId: string, subjectId?: SubjectId) {
    return this.select(userId).listSetSubmissions(userId, subjectId);
  }

  saveDiagnosisEvents(userId: string, events: DiagnosisEvent[]) {
    return this.select(userId).saveDiagnosisEvents(userId, events);
  }

  listDiagnosisEvents(userId: string, subjectId?: SubjectId) {
    return this.select(userId).listDiagnosisEvents(userId, subjectId);
  }

  listReviewQueue(userId: string, subjectId?: SubjectId) {
    return this.select(userId).listReviewQueue(userId, subjectId);
  }

  completeReview(userId: string, input: ReviewCompletionInput) {
    return this.select(userId).completeReview(userId, input);
  }

  listReviewCompletions(userId: string, subjectId?: SubjectId) {
    return this.select(userId).listReviewCompletions(userId, subjectId);
  }

  saveWeeklyPlan(plan: WeeklyCoachingPlan) {
    return this.select(plan.userId).saveWeeklyPlan(plan);
  }

  getActiveWeeklyPlan(userId: string) {
    return this.select(userId).getActiveWeeklyPlan(userId);
  }

  getRecords(userId: string, subjectId?: SubjectId) {
    return this.select(userId).getRecords(userId, subjectId);
  }

  getSubjectSummary(userId: string, subjectId: SubjectId) {
    return this.select(userId).getSubjectSummary(userId, subjectId);
  }
}

export const appraisalFirstRepository = new HybridAppraisalFirstRepository();

