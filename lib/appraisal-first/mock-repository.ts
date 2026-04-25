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

type MockStore = {
  onboarding: Map<string, AppraisalFirstOnboarding>;
  starterDiagnosis: Map<string, StarterDiagnosisResult>;
  setSubmissions: Map<string, SetSubmission[]>;
  diagnosisEvents: Map<string, DiagnosisEvent[]>;
  reviewQueue: Map<string, ReviewQueueItem[]>;
  reviewCompletions: Map<string, ReviewCompletion[]>;
  weeklyPlans: Map<string, WeeklyCoachingPlan[]>;
};

const globalForAppraisalFirst = globalThis as typeof globalThis & {
  __appraisalFirstMockStore?: MockStore;
};

function createStore(): MockStore {
  return {
    onboarding: new Map(),
    starterDiagnosis: new Map(),
    setSubmissions: new Map(),
    diagnosisEvents: new Map(),
    reviewQueue: new Map(),
    reviewCompletions: new Map(),
    weeklyPlans: new Map(),
  };
}

function getStore() {
  globalForAppraisalFirst.__appraisalFirstMockStore ??= createStore();
  return globalForAppraisalFirst.__appraisalFirstMockStore;
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

export class MockAppraisalFirstRepository implements AppraisalFirstRepository {
  async saveOnboarding(input: AppraisalFirstOnboarding) {
    getStore().onboarding.set(input.userId, input);
    return input;
  }

  async getOnboarding(userId: string) {
    return getStore().onboarding.get(userId) ?? null;
  }

  async saveStarterDiagnosis(input: StarterDiagnosisResult) {
    getStore().starterDiagnosis.set(input.userId, input);
    return input;
  }

  async getStarterDiagnosis(userId: string) {
    return getStore().starterDiagnosis.get(userId) ?? null;
  }

  async saveSetSubmission(userId: string, input: SetSubmissionInput) {
    const submittedAt = input.submittedAt ?? new Date().toISOString();
    const submission: SetSubmission = {
      ...input,
      id: `set_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      submittedAt,
    };
    const submissions = getStore().setSubmissions.get(userId) ?? [];
    getStore().setSubmissions.set(userId, [...submissions, submission]);

    const queue = getStore().reviewQueue.get(userId) ?? [];
    const createdItems = input.reviewQueueCandidates.map<ReviewQueueItem>((candidate) => ({
      ...candidate,
      id: `review_${submission.id}_${candidate.questionId}`,
      userId,
      status: "queued",
      sourceSubmissionId: submission.id,
      createdAt: submittedAt,
    }));
    getStore().reviewQueue.set(userId, [...queue, ...createdItems]);
    return submission;
  }

  async listSetSubmissions(userId: string, subjectId?: SubjectId) {
    return newestFirst(bySubject(getStore().setSubmissions.get(userId) ?? [], subjectId));
  }

  async saveDiagnosisEvents(userId: string, events: DiagnosisEvent[]) {
    const current = getStore().diagnosisEvents.get(userId) ?? [];
    const next = [...current.filter((event) => !events.some((item) => item.eventId === event.eventId)), ...events];
    getStore().diagnosisEvents.set(userId, next);
    return events;
  }

  async listDiagnosisEvents(userId: string, subjectId?: SubjectId) {
    return newestFirst(bySubject(getStore().diagnosisEvents.get(userId) ?? [], subjectId));
  }

  async listReviewQueue(userId: string, subjectId?: SubjectId) {
    const items = bySubject(getStore().reviewQueue.get(userId) ?? [], subjectId);
    return items.filter((item) => item.status === "queued" || item.status === "in_review");
  }

  async completeReview(userId: string, input: ReviewCompletionInput) {
    const reviewedAt = input.reviewedAt ?? new Date().toISOString();
    const completion: ReviewCompletion = {
      ...input,
      id: `completion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      reviewedAt,
    };
    const queue = getStore().reviewQueue.get(userId) ?? [];
    getStore().reviewQueue.set(
      userId,
      queue.map((item) =>
        item.id === input.reviewId ? { ...item, status: "completed", completedAt: reviewedAt } : item,
      ),
    );
    const completions = getStore().reviewCompletions.get(userId) ?? [];
    getStore().reviewCompletions.set(userId, [...completions, completion]);
    return completion;
  }

  async listReviewCompletions(userId: string, subjectId?: SubjectId) {
    return newestFirst(bySubject(getStore().reviewCompletions.get(userId) ?? [], subjectId));
  }

  async saveWeeklyPlan(plan: WeeklyCoachingPlan) {
    const plans = getStore().weeklyPlans.get(plan.userId) ?? [];
    getStore().weeklyPlans.set(plan.userId, [plan, ...plans.filter((item) => item.id !== plan.id)]);
    return plan;
  }

  async getActiveWeeklyPlan(userId: string) {
    return (getStore().weeklyPlans.get(userId) ?? []).find((plan) => plan.status === "active") ?? null;
  }

  async getRecords(userId: string, subjectId?: SubjectId): Promise<RecordsSummary> {
    const setItems = (await this.listSetSubmissions(userId, subjectId)).map<RecordsTimelineItem>((submission) => ({
      id: `record_${submission.id}`,
      type: "pastSet",
      subjectId: submission.subjectId,
      title: `${submission.subjectId} set submitted`,
      description: `${submission.feedback.answeredCount}/${submission.feedback.totalQuestions} answered, ${submission.feedback.reviewQueueCandidateCount} review candidates`,
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
      title: `${completion.subjectId} review completed`,
      description: completion.isCorrectOnReview ? "Correct on review" : "Needs another pass",
      occurredAt: completion.reviewedAt,
      status: "completed",
      linkedAbilityAxes: completion.linkedAbilityAxes,
      metadata: { setId: completion.setId },
    }));
    const weeklyItems = (getStore().weeklyPlans.get(userId) ?? [])
      .filter((plan) => !subjectId || plan.primarySubjectIds.includes(subjectId))
      .map<RecordsTimelineItem>((plan) => ({
        id: `record_${plan.id}`,
        type: "weeklyPlan",
        subjectId,
        title: "Weekly coaching generated",
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
          ? `${topDiagnosis.topicName}에서 ${topDiagnosis.subtopicName} 관련 ${topDiagnosis.rootCauseGroup} 패턴이 가장 많이 보입니다.`
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
        ? `${topDiagnosis.topicName} > ${topDiagnosis.subtopicName}에서 ${topDiagnosis.reviewReasonSentence}`
        : submissions.length === 0
          ? "아직 민법 풀이 기록이 없어 starter set이 필요합니다."
          : "민법 풀이 기록을 기반으로 다음 행동을 정리했습니다.",
      nextActionReason:
        remainingReviewCount > 0
          ? "남은 review queue item이 있어 먼저 정리합니다."
          : activeWeeklyPlan
            ? "활성 weekly coaching plan이 있습니다."
            : "다음 set으로 기준 데이터를 보강합니다.",
      nextAction: remainingReviewCount > 0 ? "reviewQueue" : submissions.length === 0 ? "solveSet" : activeWeeklyPlan ? "solveSet" : "weeklyCoaching",
    };
  }
}

export const appraisalFirstRepository = new MockAppraisalFirstRepository();

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
    title: `${top.topicName} 진단 요약`,
    description: `${top.subtopicName}에서 ${top.reviewReasonSentence}`,
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
