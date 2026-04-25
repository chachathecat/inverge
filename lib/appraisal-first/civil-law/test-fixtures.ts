import { CIVIL_LAW_CURRICULUM_MAPPINGS } from "@/lib/appraisal-first/civil-law/curriculum";
import type {
  AnswerConfidence,
  ChoiceId,
  DiagnosisEvent,
  PastSetAnswer,
  RootCauseTagId,
  SetSubmission,
  SubjectId,
} from "@/lib/appraisal-first/types";

export type CivilLawDiagnosisScenarioId =
  | "normal"
  | "cold_start"
  | "sparse_data"
  | "repeated_mistake"
  | "time_pressure_dominant"
  | "curriculum_gap_dominant"
  | "tag_overlap";

export type CivilLawSampleQuestion = {
  id: string;
  number: number;
  subjectId: SubjectId;
  curriculumNodeId: string;
  topicName: string;
  subtopicName: string;
  correctChoiceId: ChoiceId;
  expectedSeconds: number;
  stem: string;
};

export type CivilLawScenarioExpectation = {
  scenarioId: CivilLawDiagnosisScenarioId;
  description: string;
  expectedEventCount: number;
  expectedReviewQueueCount: {
    min: number;
    max: number;
  };
  expectedPrimaryTags: Partial<Record<string, RootCauseTagId>>;
  expectedNoQueueQuestionIds?: string[];
  expectedWeeklySeed: "present" | "absent" | "optional";
  notes: string[];
};

const FIXTURE_NOW = "2026-04-21T09:00:00.000Z";

export const CIVIL_LAW_SAMPLE_QUESTION_SET: CivilLawSampleQuestion[] = CIVIL_LAW_CURRICULUM_MAPPINGS.map(
  (mapping, index) => ({
    id: mapping.questionId,
    number: index + 1,
    subjectId: "civil_law",
    curriculumNodeId: mapping.primaryNodeId,
    topicName: mapping.topicName,
    subtopicName: mapping.subtopicName,
    correctChoiceId: mapping.correctChoiceId,
    expectedSeconds: mapping.expectedSeconds,
    stem: `${mapping.topicName} / ${mapping.subtopicName} sample question`,
  }),
);

function wrongChoice(correctChoiceId: ChoiceId): ChoiceId {
  return correctChoiceId === "1" ? "2" : "1";
}

function answer({
  questionId,
  selectedChoiceId,
  confidence,
  elapsedSeconds,
  flagged = false,
}: {
  questionId: string;
  selectedChoiceId: ChoiceId | null;
  confidence: AnswerConfidence | null;
  elapsedSeconds: number;
  flagged?: boolean;
}): PastSetAnswer {
  return {
    questionId,
    selectedChoiceId,
    confidence,
    flagged,
    visited: true,
    firstAnsweredAt: FIXTURE_NOW,
    lastUpdatedAt: FIXTURE_NOW,
    elapsedSecondsOnQuestion: elapsedSeconds,
  };
}

function buildSubmission(
  scenarioId: CivilLawDiagnosisScenarioId,
  answers: Record<string, PastSetAnswer>,
): SetSubmission {
  const totalQuestions = CIVIL_LAW_SAMPLE_QUESTION_SET.length;
  const values = Object.values(answers);
  const answeredCount = values.filter((item) => item.selectedChoiceId !== null).length;
  const lowConfidenceCount = values.filter((item) => item.confidence === "low").length;
  const mediumConfidenceCount = values.filter((item) => item.confidence === "medium").length;
  const flaggedCount = values.filter((item) => item.flagged).length;

  return {
    id: `fixture_${scenarioId}`,
    userId: "fixture-user",
    subjectId: "civil_law",
    setId: `fixture-${scenarioId}`,
    startedAt: "2026-04-21T08:45:00.000Z",
    submittedAt: FIXTURE_NOW,
    totalElapsedSeconds: values.reduce((sum, item) => sum + item.elapsedSecondsOnQuestion, 0),
    totalPausedSeconds: 0,
    exceededTimeLimit: false,
    overtimeSeconds: 0,
    answers,
    feedback: {
      totalQuestions,
      answeredCount,
      unansweredCount: totalQuestions - answeredCount,
      lowConfidenceCount,
      mediumConfidenceCount,
      flaggedCount,
      exceededTimeLimit: false,
      overtimeSeconds: 0,
      reviewQueueCandidateCount: 0,
    },
    reviewQueueCandidates: [],
  };
}

function correctAnswer(questionId: string, confidence: AnswerConfidence, elapsedSeconds: number) {
  const mapping = CIVIL_LAW_CURRICULUM_MAPPINGS.find((item) => item.questionId === questionId);
  if (!mapping) throw new Error(`Unknown fixture question: ${questionId}`);
  return answer({ questionId, selectedChoiceId: mapping.correctChoiceId, confidence, elapsedSeconds });
}

function incorrectAnswer(questionId: string, confidence: AnswerConfidence, elapsedSeconds: number, flagged = false) {
  const mapping = CIVIL_LAW_CURRICULUM_MAPPINGS.find((item) => item.questionId === questionId);
  if (!mapping) throw new Error(`Unknown fixture question: ${questionId}`);
  return answer({ questionId, selectedChoiceId: wrongChoice(mapping.correctChoiceId), confidence, elapsedSeconds, flagged });
}

export function createCivilLawScenarioSubmission(scenarioId: CivilLawDiagnosisScenarioId): SetSubmission | null {
  if (scenarioId === "cold_start") return null;

  const baseAnswers: Record<string, PastSetAnswer> = {
    "civil_law-1": correctAnswer("civil_law-1", "high", 74),
    "civil_law-2": correctAnswer("civil_law-2", "high", 88),
    "civil_law-3": correctAnswer("civil_law-3", "medium", 76),
    "civil_law-4": correctAnswer("civil_law-4", "high", 82),
    "civil_law-5": correctAnswer("civil_law-5", "high", 92),
  };

  if (scenarioId === "normal") {
    return buildSubmission(scenarioId, {
      ...baseAnswers,
      "civil_law-2": incorrectAnswer("civil_law-2", "low", 135),
      "civil_law-4": incorrectAnswer("civil_law-4", "medium", 86),
      "civil_law-5": correctAnswer("civil_law-5", "low", 135),
    });
  }

  if (scenarioId === "sparse_data") {
    return buildSubmission(scenarioId, {
      ...baseAnswers,
      "civil_law-2": incorrectAnswer("civil_law-2", "medium", 100),
    });
  }

  if (scenarioId === "repeated_mistake") {
    return buildSubmission(scenarioId, {
      ...baseAnswers,
      "civil_law-2": incorrectAnswer("civil_law-2", "low", 142),
    });
  }

  if (scenarioId === "time_pressure_dominant") {
    return buildSubmission(scenarioId, {
      ...baseAnswers,
      "civil_law-5": correctAnswer("civil_law-5", "high", 220),
    });
  }

  if (scenarioId === "curriculum_gap_dominant") {
    return buildSubmission(scenarioId, {
      ...baseAnswers,
      "civil_law-1": incorrectAnswer("civil_law-1", "high", 72),
    });
  }

  return buildSubmission(scenarioId, {
    ...baseAnswers,
    "civil_law-4": incorrectAnswer("civil_law-4", "medium", 110),
  });
}

export function createCivilLawRecentEventsForScenario(scenarioId: CivilLawDiagnosisScenarioId): DiagnosisEvent[] {
  if (scenarioId !== "repeated_mistake") return [];

  return [
    {
      eventId: "recent_diag_civil_law-2",
      userId: "fixture-user",
      subjectId: "civil_law",
      setSubmissionId: "previous_fixture_submission",
      setId: "previous-fixture-set",
      questionId: "civil_law-2",
      curriculumNodeId: "civil_law.intent.mistake",
      linkedCurriculumNodeIds: ["civil_law.intent.fraud_duress"],
      topicId: "declaration_of_intent",
      topicName: "의사표시",
      subtopicName: "착오",
      isCorrect: false,
      selectedChoiceId: "1",
      correctChoiceId: "4",
      confidence: "low",
      elapsedSeconds: 130,
      expectedSeconds: 95,
      timeRatio: 1.37,
      primaryRootCauseTag: "mistake_fraud_confusion",
      rootCauseGroup: "similar_concept_confusion",
      secondaryRootCauseTags: ["choice_comparison_failure"],
      curriculumGapScore: 80,
      solvingPatternScore: 80,
      reviewPriorityScore: 70,
      diagnosisConfidence: 0.85,
      reviewReasonSentence: "Previous fixture diagnosis",
      recommendedReviewAction: "Compare mistake and fraud requirements",
      ruleVersion: "civil-law-rule-v1",
      createdAt: "2026-04-20T09:00:00.000Z",
    },
  ];
}

export const CIVIL_LAW_SCENARIO_EXPECTATIONS: Record<CivilLawDiagnosisScenarioId, CivilLawScenarioExpectation> = {
  normal: {
    scenarioId: "normal",
    description: "Mixed wrong answers and low-confidence correct answer.",
    expectedEventCount: 5,
    expectedReviewQueueCount: { min: 2, max: 5 },
    expectedPrimaryTags: {
      "civil_law-2": "mistake_fraud_confusion",
      "civil_law-4": "exception_clause_missed",
      "civil_law-5": "condition_combination_failure",
    },
    expectedWeeklySeed: "present",
    notes: [
      "Exception miss and similar concept confusion should be visible in queue candidates.",
      "Current v1 keeps the stronger content tag as primary even when the correct answer has low confidence.",
    ],
  },
  cold_start: {
    scenarioId: "cold_start",
    description: "No set submission yet.",
    expectedEventCount: 0,
    expectedReviewQueueCount: { min: 0, max: 0 },
    expectedPrimaryTags: {},
    expectedWeeklySeed: "absent",
    notes: ["Dashboard should prefer solveSet when repository state is empty."],
  },
  sparse_data: {
    scenarioId: "sparse_data",
    description: "Single weak signal with limited evidence.",
    expectedEventCount: 5,
    expectedReviewQueueCount: { min: 1, max: 4 },
    expectedPrimaryTags: {
      "civil_law-2": "mistake_fraud_confusion",
    },
    expectedWeeklySeed: "present",
    notes: ["Product copy should treat this as tentative, even if v1 engine emits a weekly seed."],
  },
  repeated_mistake: {
    scenarioId: "repeated_mistake",
    description: "Same curriculum node has a previous wrong diagnosis event.",
    expectedEventCount: 5,
    expectedReviewQueueCount: { min: 1, max: 4 },
    expectedPrimaryTags: {
      "civil_law-2": "mistake_fraud_confusion",
    },
    expectedWeeklySeed: "present",
    notes: ["Review score for civil_law-2 should be higher than sparse_data."],
  },
  time_pressure_dominant: {
    scenarioId: "time_pressure_dominant",
    description: "Correct high-confidence answer with severe time overuse.",
    expectedEventCount: 5,
    expectedReviewQueueCount: { min: 0, max: 2 },
    expectedPrimaryTags: {
      "civil_law-5": "condition_combination_failure",
    },
    expectedNoQueueQuestionIds: ["civil_law-5"],
    expectedWeeklySeed: "optional",
    notes: ["This scenario currently exposes whether v1 over-queues time pressure correct answers."],
  },
  curriculum_gap_dominant: {
    scenarioId: "curriculum_gap_dominant",
    description: "Wrong high-confidence rule question should look like knowledge gap.",
    expectedEventCount: 5,
    expectedReviewQueueCount: { min: 1, max: 4 },
    expectedPrimaryTags: {
      "civil_law-1": "condition_missing",
    },
    expectedWeeklySeed: "present",
    notes: ["High-confidence wrong rule answer should be prioritized above time-only signals."],
  },
  tag_overlap: {
    scenarioId: "tag_overlap",
    description: "Exception-style mapping with article and case signals.",
    expectedEventCount: 5,
    expectedReviewQueueCount: { min: 1, max: 4 },
    expectedPrimaryTags: {
      "civil_law-4": "exception_clause_missed",
    },
    expectedWeeklySeed: "present",
    notes: ["Exception miss should beat generic article memory and case-application candidates."],
  },
};

export const CIVIL_LAW_DIAGNOSIS_SCENARIO_IDS = Object.keys(
  CIVIL_LAW_SCENARIO_EXPECTATIONS,
) as CivilLawDiagnosisScenarioId[];
