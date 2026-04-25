import { appraisalFirstRepository } from "@/lib/appraisal-first/file-repository";
import {
  civilLawDiagnosisEngine,
  hasCivilLawMapping,
} from "@/lib/appraisal-first/civil-law/diagnosis-engine";
import {
  hasLegalRegulationsMapping,
  legalRegulationsDiagnosisEngine,
} from "@/lib/appraisal-first/legal-regulations/diagnosis-engine";
import type { AppraisalFirstRepository } from "@/lib/appraisal-first/repository";
import { getRuntimeSetDetail } from "@/lib/inverge/admin-set-metadata-runtime";
import {
  APPRAISAL_FIRST_EXAM_ID,
  MVP_USER_ID,
  type AppraisalFirstOnboarding,
  type AppraisalFirstOnboardingInput,
  type AbilityKey,
  type DiagnosisEvent,
  type ReviewCompletionInput,
  type ReviewQueueCandidate,
  type SetSubmission,
  type SetSubmissionInput,
  type StarterDiagnosisInput,
  type StarterDiagnosisResult,
  type SubjectId,
  type WeeklyCoachingPlan,
} from "@/lib/appraisal-first/types";

const ISSUE_TO_ABILITY: Record<StarterDiagnosisInput["mainIssue"], AbilityKey[]> = {
  concept_recall: ["accuracy"],
  option_judgment: ["option_judgment"],
  law_memory: ["law_memory"],
  calculation_stability: ["calculation_stability"],
  time_management: ["time_management"],
  not_sure: ["accuracy", "option_judgment"],
};

const SUBJECT_IDS: SubjectId[] = ["civil_law", "economics", "real_estate", "appraisal_law", "accounting"];

function unique<T>(items: T[]) {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function getWeekStartDate(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeReviewQueueCandidatesWithSetMetadata(
  subjectId: SubjectId,
  setId: string,
  candidates: ReviewQueueCandidate[],
) {
  const detail = getRuntimeSetDetail(setId, subjectId);
  if (!detail) {
    return candidates;
  }

  const questionMap = new Map(detail.questions.map((question) => [question.questionId, question]));

  return candidates.flatMap<ReviewQueueCandidate>((candidate) => {
    const question = questionMap.get(candidate.questionId);
    if (!question) {
      return [candidate];
    }
    if (!question.active) {
      return [];
    }

    return [
      {
        ...candidate,
        unit: question.unit,
        difficulty: question.difficulty,
        curriculumNodeId: candidate.curriculumNodeId ?? question.curriculumNodeIds[0],
        linkedCurriculumNodeIds:
          candidate.linkedCurriculumNodeIds && candidate.linkedCurriculumNodeIds.length > 0
            ? candidate.linkedCurriculumNodeIds
            : question.curriculumNodeIds.slice(1),
      },
    ];
  });
}

type SubjectDiagnosisEngine = {
  diagnose(input: {
    userId: string;
    submission: SetSubmission;
    recentEvents: DiagnosisEvent[];
  }): {
    events: DiagnosisEvent[];
    reviewQueueCandidates: ReviewQueueCandidate[];
    weeklyPlanSeed: WeeklyCoachingPlan | null;
  };
};

export class AppraisalFirstService {
  constructor(private readonly repository: AppraisalFirstRepository = appraisalFirstRepository) {}

  async saveOnboarding(input: AppraisalFirstOnboardingInput, userId: string = MVP_USER_ID) {
    const now = new Date().toISOString();
    const weakSubjectIds = SUBJECT_IDS.filter((subjectId) => {
      const confidence = input.subjectConfidence[subjectId];
      return confidence === "weak" || confidence === "unstable";
    });
    const unknownSubjectIds = SUBJECT_IDS.filter((subjectId) => input.subjectConfidence[subjectId] === "unknown");
    const existing = await this.repository.getOnboarding(userId);
    const onboarding: AppraisalFirstOnboarding = {
      ...input,
      examId: APPRAISAL_FIRST_EXAM_ID,
      userId,
      derived: {
        isColdStart: !input.recentSevenDaySetCount,
        hasRecentSetData: Boolean(input.recentSevenDaySetCount && input.recentSevenDaySetCount > 0),
        weakSubjectIds,
        unknownSubjectIds,
      },
      metadata: {
        source: "onboarding",
        schemaVersion: 1,
        createdAt: existing?.metadata.createdAt ?? now,
        updatedAt: now,
      },
    };

    return this.repository.saveOnboarding(onboarding);
  }

  getOnboarding(userId: string = MVP_USER_ID) {
    return this.repository.getOnboarding(userId);
  }

  async saveStarterDiagnosis(input: StarterDiagnosisInput, userId: string = MVP_USER_ID) {
    const onboarding = await this.repository.getOnboarding(userId);
    const accuracyRate = Math.round((input.miniSet.correctCount / input.miniSet.questionCount) * 100);
    const subjectBoost: AbilityKey[] =
      input.selectedSubjectId === "appraisal_law"
        ? ["law_memory"]
        : input.selectedSubjectId === "accounting"
          ? ["calculation_stability"]
          : input.selectedSubjectId === "economics"
            ? ["time_management"]
            : [];
    const priorityAbilityKeys = unique([
      ...ISSUE_TO_ABILITY[input.mainIssue],
      ...subjectBoost,
      ...(accuracyRate <= 75 ? ["accuracy" as const] : []),
      ...(input.timePressure === "comfortable" ? [] : ["time_management" as const]),
    ]);
    const prioritySubjectIds = unique([
      input.selectedSubjectId,
      ...(onboarding?.derived.weakSubjectIds ?? []),
      "appraisal_law" as const,
      "accounting" as const,
    ]);

    const result: StarterDiagnosisResult = {
      ...input,
      userId,
      miniSet: {
        ...input.miniSet,
        accuracyRate,
      },
      abilityAdjustment: priorityAbilityKeys.map((ability) => ({
        ability,
        direction: "priority",
        reason: `${input.selectedSubjectId}:${input.mainIssue}`,
      })),
      firstWeekPlanSeedPatch: {
        prioritySubjectIds,
        priorityAbilityKeys,
        recommendedFirstSet: {
          subjectId: input.selectedSubjectId,
          questionCount: input.miniSet.questionCount,
          ...(input.miniSet.elapsedMinutes && input.timePressure !== "comfortable"
            ? { timeLimitMinutes: input.miniSet.elapsedMinutes }
            : {}),
        },
        reviewQueueSeed: {
          reason: `${input.selectedSubjectId}:${input.mainIssue}`,
          estimatedItemCount: input.mainIssue === "not_sure" ? 8 : 12,
        },
      },
      metadata: {
        source: "starter_diagnosis",
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
      },
    };

    return this.repository.saveStarterDiagnosis(result);
  }

  getStarterDiagnosis(userId: string = MVP_USER_ID) {
    return this.repository.getStarterDiagnosis(userId);
  }

  async saveSetSubmission(input: SetSubmissionInput, userId: string = MVP_USER_ID) {
    if (hasCivilLawMapping(input)) return this.saveDiagnosedSetSubmission(input, userId, "civil_law", civilLawDiagnosisEngine);
    if (hasLegalRegulationsMapping(input)) {
      return this.saveDiagnosedSetSubmission(input, userId, "appraisal_law", legalRegulationsDiagnosisEngine);
    }

    const normalizedCandidates = normalizeReviewQueueCandidatesWithSetMetadata(
      input.subjectId,
      input.setId,
      input.reviewQueueCandidates,
    );

    return this.repository.saveSetSubmission(userId, {
      ...input,
      reviewQueueCandidates: normalizedCandidates,
      feedback: {
        ...input.feedback,
        reviewQueueCandidateCount: normalizedCandidates.length,
      },
    });
  }

  private async saveDiagnosedSetSubmission(
    input: SetSubmissionInput,
    userId: string,
    subjectId: SubjectId,
    diagnosisEngine: SubjectDiagnosisEngine,
  ) {
    const submittedAt = input.submittedAt ?? new Date().toISOString();
    const recentEvents = await this.repository.listDiagnosisEvents(userId, subjectId);
    const provisionalSubmission = {
      ...input,
      id: `pending_${subjectId}_submission`,
      userId,
      submittedAt,
    };
    const preliminaryDiagnosis = diagnosisEngine.diagnose({
      userId,
      submission: provisionalSubmission,
      recentEvents,
    });
    const preliminaryCandidates = normalizeReviewQueueCandidatesWithSetMetadata(
      subjectId,
      input.setId,
      preliminaryDiagnosis.reviewQueueCandidates,
    );
    const diagnosedInput: SetSubmissionInput = {
      ...input,
      submittedAt,
      reviewQueueCandidates: preliminaryCandidates,
      feedback: {
        ...input.feedback,
        reviewQueueCandidateCount: preliminaryCandidates.length,
      },
    };
    const savedSubmission = await this.repository.saveSetSubmission(userId, diagnosedInput);
    const finalDiagnosis = diagnosisEngine.diagnose({
      userId,
      submission: savedSubmission,
      recentEvents,
    });
    const normalizedFinalCandidates = normalizeReviewQueueCandidatesWithSetMetadata(
      subjectId,
      input.setId,
      finalDiagnosis.reviewQueueCandidates,
    );

    await this.repository.saveDiagnosisEvents(userId, finalDiagnosis.events);
    if (finalDiagnosis.weeklyPlanSeed) {
      await this.repository.saveWeeklyPlan(finalDiagnosis.weeklyPlanSeed);
    }

    return {
      ...savedSubmission,
      reviewQueueCandidates: normalizedFinalCandidates,
      feedback: {
        ...savedSubmission.feedback,
        reviewQueueCandidateCount: normalizedFinalCandidates.length,
      },
    };
  }

  listReviewQueue(subjectId?: SubjectId, userId: string = MVP_USER_ID) {
    return this.repository.listReviewQueue(userId, subjectId);
  }

  completeReview(input: ReviewCompletionInput, userId: string = MVP_USER_ID) {
    return this.repository.completeReview(userId, input);
  }

  async getOrCreateWeeklyCoaching(userId: string = MVP_USER_ID) {
    const existing = await this.repository.getActiveWeeklyPlan(userId);
    if (existing) return existing;

    const diagnosis = await this.repository.getStarterDiagnosis(userId);
    const onboarding = await this.repository.getOnboarding(userId);
    const primarySubjectIds = unique([
      ...(diagnosis?.firstWeekPlanSeedPatch.prioritySubjectIds ?? []),
      ...(onboarding?.derived.weakSubjectIds ?? []),
      "appraisal_law" as const,
      "accounting" as const,
    ]).slice(0, 4);
    const priorityAbilityKeys = diagnosis?.firstWeekPlanSeedPatch.priorityAbilityKeys ?? ["law_memory", "calculation_stability"];
    const plan: WeeklyCoachingPlan = {
      id: `weekly_${getWeekStartDate()}`,
      userId,
      weekStartDate: getWeekStartDate(),
      createdAt: new Date().toISOString(),
      status: "active",
      primarySubjectIds,
      priorityAbilityKeys,
      targetSetCount: Math.max(4, primarySubjectIds.length + 2),
      reviewTargetCount: diagnosis?.firstWeekPlanSeedPatch.reviewQueueSeed.estimatedItemCount ?? 20,
      summary: "MVP rule seed: prioritize weak subjects, recent diagnosis issue, and unresolved review queue.",
      tasks: primarySubjectIds.flatMap((subjectId, index) => [
        {
          id: `task_set_${subjectId}`,
          subjectId,
          type: "set" as const,
          title: `${subjectId} set practice`,
          targetCount: index < 2 ? 2 : 1,
        },
        {
          id: `task_review_${subjectId}`,
          subjectId,
          type: "review" as const,
          title: `${subjectId} review queue`,
          targetCount: index < 2 ? 8 : 4,
        },
      ]),
    };

    return this.repository.saveWeeklyPlan(plan);
  }

  getRecords(subjectId?: SubjectId, userId: string = MVP_USER_ID) {
    return this.repository.getRecords(userId, subjectId);
  }

  getSubjectSummary(subjectId: SubjectId, userId: string = MVP_USER_ID) {
    return this.repository.getSubjectSummary(userId, subjectId);
  }
}

export const appraisalFirstService = new AppraisalFirstService();
