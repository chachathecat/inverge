import {
  getRuntimeCivilLawCurriculumMappings,
  getRuntimeCivilLawRootCauseTag,
} from "@/lib/appraisal-first/admin-runtime";
import type {
  CivilLawCurriculumMapping,
  DiagnosisEvent,
  ReviewPriority,
  ReviewQueueCandidate,
  RootCauseTagId,
  SetSubmission,
  SetSubmissionInput,
  WeeklyCoachingPlan,
} from "@/lib/appraisal-first/types";

type CivilLawDiagnosisInput = {
  userId: string;
  submission: SetSubmission;
  recentEvents: DiagnosisEvent[];
};

export type CivilLawDiagnosisResult = {
  events: DiagnosisEvent[];
  reviewQueueCandidates: ReviewQueueCandidate[];
  weeklyPlanSeed: WeeklyCoachingPlan | null;
};

const RULE_VERSION = "civil-law-rule-v1" as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function unique<T>(items: T[]) {
  return items.filter((item, index) => items.indexOf(item) === index);
}

function priorityFromScore(score: number): ReviewPriority {
  if (score >= 80) return "today";
  if (score >= 55) return "this_week";
  return "maintenance";
}

function getWeekStartDate(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function calculateGapScore({
  isCorrect,
  confidence,
  flagged,
  timeRatio,
  mapping,
  repeatCount,
}: {
  isCorrect: boolean;
  confidence: string | null;
  flagged: boolean;
  timeRatio: number;
  mapping: CivilLawCurriculumMapping;
  repeatCount: number;
}) {
  let score = 0;

  if (!isCorrect) score += 45;
  if (confidence === "low" && isCorrect) score += 20;
  if (confidence === "low" && !isCorrect) score += 15;
  if (confidence === "medium" && isCorrect) score += 10;
  if (flagged) score += 15;
  if (timeRatio >= 2) score += 20;
  else if (timeRatio >= 1.5) score += 10;
  if (mapping.examWeight >= 4) score += 10;
  if (mapping.reviewWeight >= 4) score += 10;
  if (repeatCount >= 3) score += 25;
  else if (repeatCount >= 2) score += 15;

  return clamp(mapping.mappingConfidence === "low" ? score * 0.5 : score);
}

function inferRootCauseTags({
  mapping,
  isCorrect,
  confidence,
  flagged,
  timeRatio,
}: {
  mapping: CivilLawCurriculumMapping;
  isCorrect: boolean;
  confidence: string | null;
  flagged: boolean;
  timeRatio: number;
}) {
  const tags: RootCauseTagId[] = [...mapping.defaultRootCauseTags];

  if (mapping.testedConceptType === "comparison" || mapping.requiresComparison) {
    tags.push("choice_comparison_failure", "similar_rule_confusion");
  }
  if (mapping.testedConceptType === "exception") tags.push("exception_clause_missed");
  if (mapping.requiresArticleMemory) tags.push("article_requirement_gap");
  if (mapping.requiresCaseLogic) tags.push("fact_pattern_mapping_error");
  if (mapping.topicId === "agency" && mapping.linkedNodeIds.length) tags.push("agency_type_confusion");
  if (mapping.topicId === "declaration_of_intent" && mapping.requiresComparison) tags.push("mistake_fraud_confusion");
  if (mapping.topicId === "invalidity_cancellation") tags.push("void_cancel_confusion");
  if (confidence === "low" && isCorrect) tags.push("low_confidence_correct");
  if (flagged && isCorrect) tags.push("low_confidence_correct");
  if (timeRatio >= 2) tags.push("time_pressure_guess");

  return unique(tags);
}

function choosePrimaryTag(tags: RootCauseTagId[], isCorrect: boolean) {
  const eligibleTags = isCorrect ? tags : tags.filter((tag) => tag !== "low_confidence_correct");
  const sorted = eligibleTags.sort(
      (a, b) =>
        getRuntimeCivilLawRootCauseTag(b).reviewPriorityWeight -
        getRuntimeCivilLawRootCauseTag(a).reviewPriorityWeight,
  );

  return sorted[0] ?? "definition_unclear";
}

function shouldCreateReviewItem({
  isCorrect,
  confidence,
  flagged,
  gapScore,
  reviewScore,
  mapping,
}: {
  isCorrect: boolean;
  confidence: string | null;
  flagged: boolean;
  gapScore: number;
  reviewScore: number;
  mapping: CivilLawCurriculumMapping;
}) {
  if (mapping.mappingConfidence === "low" && isCorrect && confidence !== "low") return false;
  return !isCorrect || confidence === "low" || flagged || gapScore >= 60 || reviewScore >= 60;
}

function createReasonSentence(mapping: CivilLawCurriculumMapping, tagId: RootCauseTagId, repeatCount: number) {
  const tag = getRuntimeCivilLawRootCauseTag(tagId);
  const repeatCopy = repeatCount >= 2 ? " 같은 단원과 원인이 반복되고 있습니다." : "";
  return `${mapping.topicName} > ${mapping.subtopicName}에서 ${tag.userLabel}이 확인되었습니다.${repeatCopy}`;
}

function buildWeeklyPlanSeed({
  userId,
  events,
  submittedAt,
}: {
  userId: string;
  events: DiagnosisEvent[];
  submittedAt: string;
}): WeeklyCoachingPlan | null {
  const ranked = [...events]
    .filter((event) => event.reviewPriorityScore >= 55)
    .sort((a, b) => b.reviewPriorityScore - a.reviewPriorityScore);
  const focus = ranked[0];

  if (!focus) return null;

  const tag = getRuntimeCivilLawRootCauseTag(focus.primaryRootCauseTag);
  const coachingSentence = tag.coachingTemplate.replace("{topic}", focus.topicName);

  return {
    id: `weekly_${getWeekStartDate(new Date(submittedAt))}_civil_law`,
    userId,
    weekStartDate: getWeekStartDate(new Date(submittedAt)),
    createdAt: submittedAt,
    status: "active",
    primarySubjectIds: ["civil_law"],
    priorityAbilityKeys:
      focus.rootCauseGroup === "condition_logic_failure" || focus.rootCauseGroup === "similar_concept_confusion"
        ? ["option_judgment", "law_memory"]
        : ["accuracy", "law_memory"],
    targetSetCount: focus.reviewPriorityScore >= 80 ? 2 : 1,
    reviewTargetCount: focus.reviewPriorityScore >= 80 ? 8 : 5,
    summary: coachingSentence,
    source: "civil_law_diagnosis_v1",
    focusRootCauseGroup: focus.rootCauseGroup,
    focusRootCauseTag: focus.primaryRootCauseTag,
    focusCurriculumNodeId: focus.curriculumNodeId,
    tasks: [
      {
        id: `task_civil_law_set_${focus.curriculumNodeId}`,
        subjectId: "civil_law",
        type: "set",
        title: `${focus.topicName} 기출 세트`,
        targetCount: focus.reviewPriorityScore >= 80 ? 2 : 1,
      },
      {
        id: `task_civil_law_review_${focus.primaryRootCauseTag}`,
        subjectId: "civil_law",
        type: "review",
        title: `${tag.userLabel} 리뷰`,
        targetCount: focus.reviewPriorityScore >= 80 ? 8 : 5,
      },
    ],
  };
}

export class CivilLawRuleBasedDiagnosisEngineV1 {
  diagnose({ userId, submission, recentEvents }: CivilLawDiagnosisInput): CivilLawDiagnosisResult {
    const submittedAt = submission.submittedAt;
    const mappings = getRuntimeCivilLawCurriculumMappings();
    const events = mappings.flatMap<DiagnosisEvent>((mapping) => {
      const answer = submission.answers[mapping.questionId];
      if (!answer) return [];

      const selectedChoiceId = answer.selectedChoiceId;
      const isCorrect = selectedChoiceId === mapping.correctChoiceId;
      const timeRatio = answer.elapsedSecondsOnQuestion / mapping.expectedSeconds;
      const repeatCount = recentEvents.filter(
        (event) => event.curriculumNodeId === mapping.primaryNodeId && !event.isCorrect,
      ).length;
      const gapScore = calculateGapScore({
        isCorrect,
        confidence: answer.confidence,
        flagged: answer.flagged,
        timeRatio,
        mapping,
        repeatCount,
      });
      const tags = inferRootCauseTags({
        mapping,
        isCorrect,
        confidence: answer.confidence,
        flagged: answer.flagged,
        timeRatio,
      });
      const primaryTag = choosePrimaryTag(tags, isCorrect);
      const tagDef = getRuntimeCivilLawRootCauseTag(primaryTag);
      const secondaryTags = tags.filter((tag) => tag !== primaryTag && tag !== "time_pressure_guess").slice(0, 3);
      const solvingPatternScore = clamp(tagDef.reviewPriorityWeight + (answer.flagged ? 10 : 0) + (timeRatio >= 2 ? 10 : 0));
      const reviewPriorityScore = clamp(gapScore * 0.45 + solvingPatternScore * 0.3 + Math.min(repeatCount * 15, 30) + 10);
      const reviewReasonSentence = createReasonSentence(mapping, primaryTag, repeatCount);

      return [
        {
          eventId: `diag_${submission.id}_${mapping.questionId}`,
          userId,
          subjectId: "civil_law",
          setSubmissionId: submission.id,
          setId: submission.setId,
          questionId: mapping.questionId,
          curriculumNodeId: mapping.primaryNodeId,
          linkedCurriculumNodeIds: mapping.linkedNodeIds,
          topicId: mapping.topicId,
          topicName: mapping.topicName,
          subtopicName: mapping.subtopicName,
          isCorrect,
          selectedChoiceId,
          correctChoiceId: mapping.correctChoiceId,
          confidence: answer.confidence,
          elapsedSeconds: answer.elapsedSecondsOnQuestion,
          expectedSeconds: mapping.expectedSeconds,
          timeRatio,
          primaryRootCauseTag: primaryTag,
          rootCauseGroup: tagDef.group,
          secondaryRootCauseTags: secondaryTags,
          curriculumGapScore: gapScore,
          solvingPatternScore,
          reviewPriorityScore,
          diagnosisConfidence: mapping.mappingConfidence === "high" ? 0.85 : mapping.mappingConfidence === "medium" ? 0.65 : 0.45,
          reviewReasonSentence,
          recommendedReviewAction: tagDef.reviewAction,
          ruleVersion: RULE_VERSION,
          createdAt: submittedAt,
        },
      ];
    });

    const reviewQueueCandidates = events
      .filter((event) => {
        const mapping = mappings.find((item) => item.questionId === event.questionId);
        if (!mapping) return false;
        return shouldCreateReviewItem({
          isCorrect: event.isCorrect,
          confidence: event.confidence,
          flagged: submission.answers[event.questionId]?.flagged ?? false,
          gapScore: event.curriculumGapScore,
          reviewScore: event.reviewPriorityScore,
          mapping,
        });
      })
      .map<ReviewQueueCandidate>((event) => ({
        questionId: event.questionId,
        subjectId: "civil_law",
        setId: event.setId,
        unit: event.subtopicName,
        difficulty: mappings.find((mapping) => mapping.questionId === event.questionId)?.difficulty ?? "medium",
        selectedChoiceId: event.selectedChoiceId,
        confidence: event.confidence,
        flagged: submission.answers[event.questionId]?.flagged ?? false,
        elapsedSecondsOnQuestion: event.elapsedSeconds,
        reasonCodes: event.isCorrect ? ["low_confidence"] : ["low_confidence", "time_overuse"].filter((code) => {
          if (code === "low_confidence") return event.confidence === "low";
          return event.timeRatio >= 1.5;
        }) as ReviewQueueCandidate["reasonCodes"],
        priority: priorityFromScore(event.reviewPriorityScore),
        curriculumNodeId: event.curriculumNodeId,
        linkedCurriculumNodeIds: event.linkedCurriculumNodeIds,
        rootCauseTag: event.primaryRootCauseTag,
        rootCauseGroup: event.rootCauseGroup,
        reviewReasonSentence: event.reviewReasonSentence,
        recommendedReviewAction: event.recommendedReviewAction,
        diagnosisConfidence: event.diagnosisConfidence,
      }));

    return {
      events,
      reviewQueueCandidates,
      weeklyPlanSeed: buildWeeklyPlanSeed({ userId, events, submittedAt }),
    };
  }
}

export const civilLawDiagnosisEngine = new CivilLawRuleBasedDiagnosisEngineV1();

export function hasCivilLawMapping(input: SetSubmissionInput) {
  return (
    input.subjectId === "civil_law" &&
    getRuntimeCivilLawCurriculumMappings().some((mapping) => input.answers[mapping.questionId])
  );
}
