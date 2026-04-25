import { civilLawDiagnosisEngine } from "@/lib/appraisal-first/civil-law/diagnosis-engine";
import {
  CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS,
  CIVIL_LAW_SCENARIO_EXPECTATIONS,
  createCivilLawRecentEventsForScenario,
  createCivilLawScenarioSubmission,
  type CivilLawDiagnosisScenarioId,
} from "@/lib/appraisal-first/civil-law/test-fixtures";
import type { CivilLawDiagnosisResult } from "@/lib/appraisal-first/civil-law/diagnosis-engine";

export type CivilLawDiagnosisSnapshot = {
  scenarioId: CivilLawDiagnosisScenarioId;
  description: string;
  actual: {
    eventCount: number;
    reviewQueueCount: number;
    weeklySeedPresent: boolean;
    events: {
      questionId: string;
      curriculumNodeId: string;
      primaryRootCauseTag: string;
      rootCauseGroup: string;
      gapScore: number;
      reviewPriorityScore: number;
      diagnosisConfidence: number;
      isCorrect: boolean;
    }[];
    reviewQueue: {
      questionId: string;
      priority: string;
      rootCauseTag?: string;
      rootCauseGroup?: string;
      reason?: string;
      action?: string;
    }[];
    weeklySeed: {
      focusCurriculumNodeId?: string;
      focusRootCauseTag?: string;
      focusRootCauseGroup?: string;
      targetSetCount?: number;
      reviewTargetCount?: number;
      summary?: string;
    } | null;
  };
  expected: (typeof CIVIL_LAW_SCENARIO_EXPECTATIONS)[CivilLawDiagnosisScenarioId];
  checks: {
    name: string;
    passed: boolean;
    detail: string;
  }[];
};

function evaluateScenario(
  scenarioId: CivilLawDiagnosisScenarioId,
  result: CivilLawDiagnosisResult | null,
): CivilLawDiagnosisSnapshot {
  const expected = CIVIL_LAW_SCENARIO_EXPECTATIONS[scenarioId];
  const events = result?.events ?? [];
  const reviewQueue = result?.reviewQueueCandidates ?? [];
  const weeklySeedPresent = Boolean(result?.weeklyPlanSeed);
  const eventByQuestionId = new Map(events.map((event) => [event.questionId, event]));
  const queueQuestionIds = new Set(reviewQueue.map((item) => item.questionId));
  const expectedTagChecks = Object.entries(expected.expectedPrimaryTags).map(([questionId, tagId]) => {
    const actualTag = eventByQuestionId.get(questionId)?.primaryRootCauseTag;
    return {
      name: `primary tag ${questionId}`,
      passed: actualTag === tagId,
      detail: `expected ${tagId}, got ${actualTag ?? "none"}`,
    };
  });
  const noQueueChecks = (expected.expectedNoQueueQuestionIds ?? []).map((questionId) => ({
    name: `no queue ${questionId}`,
    passed: !queueQuestionIds.has(questionId),
    detail: queueQuestionIds.has(questionId) ? "unexpected queue candidate" : "not queued",
  }));

  return {
    scenarioId,
    description: expected.description,
    actual: {
      eventCount: events.length,
      reviewQueueCount: reviewQueue.length,
      weeklySeedPresent,
      events: events.map((event) => ({
        questionId: event.questionId,
        curriculumNodeId: event.curriculumNodeId,
        primaryRootCauseTag: event.primaryRootCauseTag,
        rootCauseGroup: event.rootCauseGroup,
        gapScore: Math.round(event.curriculumGapScore),
        reviewPriorityScore: Math.round(event.reviewPriorityScore),
        diagnosisConfidence: event.diagnosisConfidence,
        isCorrect: event.isCorrect,
      })),
      reviewQueue: reviewQueue.map((item) => ({
        questionId: item.questionId,
        priority: item.priority,
        rootCauseTag: item.rootCauseTag,
        rootCauseGroup: item.rootCauseGroup,
        reason: item.reviewReasonSentence,
        action: item.recommendedReviewAction,
      })),
      weeklySeed: result?.weeklyPlanSeed
        ? {
            focusCurriculumNodeId: result.weeklyPlanSeed.focusCurriculumNodeId,
            focusRootCauseTag: result.weeklyPlanSeed.focusRootCauseTag,
            focusRootCauseGroup: result.weeklyPlanSeed.focusRootCauseGroup,
            targetSetCount: result.weeklyPlanSeed.targetSetCount,
            reviewTargetCount: result.weeklyPlanSeed.reviewTargetCount,
            summary: result.weeklyPlanSeed.summary,
          }
        : null,
    },
    expected,
    checks: [
      {
        name: "event count",
        passed: events.length === expected.expectedEventCount,
        detail: `expected ${expected.expectedEventCount}, got ${events.length}`,
      },
      {
        name: "review queue count range",
        passed:
          reviewQueue.length >= expected.expectedReviewQueueCount.min &&
          reviewQueue.length <= expected.expectedReviewQueueCount.max,
        detail: `expected ${expected.expectedReviewQueueCount.min}-${expected.expectedReviewQueueCount.max}, got ${reviewQueue.length}`,
      },
      {
        name: "weekly seed",
        passed:
          expected.expectedWeeklySeed === "optional" ||
          (expected.expectedWeeklySeed === "present" && weeklySeedPresent) ||
          (expected.expectedWeeklySeed === "absent" && !weeklySeedPresent),
        detail: `expected ${expected.expectedWeeklySeed}, got ${weeklySeedPresent ? "present" : "absent"}`,
      },
      ...expectedTagChecks,
      ...noQueueChecks,
    ],
  };
}

export function runCivilLawDiagnosisScenario(scenarioId: CivilLawDiagnosisScenarioId): CivilLawDiagnosisSnapshot {
  const submission = createCivilLawScenarioSubmission(scenarioId);
  const recentEvents = createCivilLawRecentEventsForScenario(scenarioId);
  const result = submission
    ? civilLawDiagnosisEngine.diagnose({
        userId: submission.userId,
        submission,
        recentEvents,
      })
    : null;

  return evaluateScenario(scenarioId, result);
}

export function runAllCivilLawDiagnosisScenarios() {
  return CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS.map(runCivilLawDiagnosisScenario);
}
