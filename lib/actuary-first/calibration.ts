import { getProbabilitySampleSet } from "@/lib/actuary-first/sample-data";
import { evaluateProbabilitySet } from "@/lib/actuary-first/engine";
import type {
  FailureClass,
  NextActionType,
  ProbabilityQuestion,
  ProbabilitySet,
  ProbabilitySetAnswer,
  ProbabilitySetSubmissionInput,
  ReviewPriority,
} from "@/lib/actuary-first/types";

type CalibrationCase = {
  id: string;
  label: string;
  questionId: string;
  intendedFailureClass: FailureClass;
  expectedReviewPriority: ReviewPriority;
  expectedNextAction: NextActionType;
  answer: Partial<ProbabilitySetAnswer>;
};

function createDefaultAnswer(question: ProbabilityQuestion): ProbabilitySetAnswer {
  const defaultBindings: Record<string, string> =
    question.variable_schema_id === "conditional_probability_direction_v1"
      ? { conditioningEvent: "B" }
      : question.variable_schema_id === "bayes_binary_event_v1"
        ? { posterior: "P(A|B)", likelihood: "P(B|A)" }
        : question.variable_schema_id === "combinatorics_count_v1"
          ? { nRole: "total", rRole: "selected" }
          : question.variable_schema_id === "binomial_parameters_v1"
            ? { nRole: "trial_count", kRole: "success_count" }
            : question.variable_schema_id === "poisson_parameters_v1"
              ? { lambdaRole: "rate" }
              : {};

  const defaultWorkText =
    question.formula_family_id === "basic_probability_ratio"
      ? "3/8"
      : question.formula_family_id === "conditional_probability_basic"
        ? "P(A∩B)/P(B) = 0.18/0.3"
        : question.formula_family_id === "bayes_rule_basic"
          ? "P(B|A)P(A) / P(B)"
          : question.formula_family_id === "expectation_discrete_basic"
            ? "E[X] = sum of x p(x)"
            : question.formula_family_id === "variance_discrete_basic"
              ? "Var(X) = E[X^2] - (E[X])^2"
              : question.formula_family_id === "permutation_combination_probability"
                ? "favorable / total = 1C1 / 5C2"
                : question.formula_family_id === "binomial_basic"
                  ? "3C2 p^2 (1-p)"
                  : question.formula_family_id === "poisson_basic"
                    ? "e^-lambda lambda^k / k!"
                    : "";

  return {
    questionId: question.question_id,
    selectedChoiceId: question.correct_choice_id,
    userAnswerValue: question.correct_answer_value,
    userFormulaFamilyId: question.formula_family_id,
    userWorkText: defaultWorkText,
    userVariableBindings: defaultBindings,
    intermediateSteps:
      question.key_step_prompts?.flatMap((prompt) => prompt.expectedPatterns.slice(0, 3)) ?? [],
    confidence: "medium",
    flagged: false,
    elapsedSecondsOnQuestion: Math.max(20, Math.round(question.expected_time_seconds * 0.9)),
    firstAnsweredAt: "2026-04-22T00:00:00.000Z",
    lastUpdatedAt: "2026-04-22T00:00:30.000Z",
  };
}

const calibrationCases: CalibrationCase[] = [
  {
    id: "formula_selection_clear",
    label: "Conditional probability wrong family",
    questionId: "prob-2",
    intendedFailureClass: "formula_selection_error",
    expectedReviewPriority: "high",
    expectedNextAction: "review_now",
    answer: {
      userFormulaFamilyId: "bayes_rule_basic",
      userWorkText: "P(B|A)P(A)/P(B)",
      userVariableBindings: { conditioningEvent: "B" },
      intermediateSteps: ["P(B|A)P(A)/P(B)"],
    },
  },
  {
    id: "arithmetic_slip_clear",
    label: "Expectation arithmetic slip",
    questionId: "prob-4",
    intendedFailureClass: "arithmetic_slip",
    expectedReviewPriority: "medium",
    expectedNextAction: "slow_retry",
    answer: {
      userFormulaFamilyId: "expectation_discrete_basic",
      userWorkText: "E[X] = sum of x p(x)",
      userAnswerValue: 1.2,
      intermediateSteps: ["0*0.2", "1*0.5", "2*0.3", "sum"],
    },
  },
  {
    id: "variable_misuse_clear",
    label: "Bayes direction swap",
    questionId: "prob-3",
    intendedFailureClass: "variable_misuse",
    expectedReviewPriority: "high",
    expectedNextAction: "review_now",
    answer: {
      userFormulaFamilyId: "bayes_rule_basic",
      userWorkText: "P(B|A)P(A)/P(B)",
      userVariableBindings: {
        posterior: "P(B|A)",
        likelihood: "P(A|B)",
      },
      intermediateSteps: ["P(B|A)P(A)", "/P(B)"],
    },
  },
  {
    id: "confidence_mismatch_clear",
    label: "Low confidence but correct",
    questionId: "prob-5",
    intendedFailureClass: "confidence_mismatch",
    expectedReviewPriority: "low",
    expectedNextAction: "move_on",
    answer: {
      confidence: "low",
      userFormulaFamilyId: "variance_discrete_basic",
      userWorkText: "Var(X) = E[X^2] - (E[X])^2",
      intermediateSteps: ["E[X^2]", "(E[X])^2", "sum"],
    },
  },
  {
    id: "time_pressure_clear",
    label: "Correct but too slow",
    questionId: "prob-6",
    intendedFailureClass: "time_pressure",
    expectedReviewPriority: "low",
    expectedNextAction: "slow_retry",
    answer: {
      userFormulaFamilyId: "permutation_combination_probability",
      userWorkText: "favorable / total = 1C1 / 5C2",
      userVariableBindings: { nRole: "total", rRole: "selected" },
      intermediateSteps: ["5C2", "favorable", "total", "1/10"],
      elapsedSecondsOnQuestion: 170,
    },
  },
  {
    id: "verification_missing_clear",
    label: "Poisson no step trace",
    questionId: "prob-8",
    intendedFailureClass: "verification_missing",
    expectedReviewPriority: "medium",
    expectedNextAction: "review_now",
    answer: {
      userFormulaFamilyId: "poisson_basic",
      userWorkText: "e^-2 * 2^0 / 0!",
      userVariableBindings: { lambdaRole: "rate" },
      intermediateSteps: [],
    },
  },
  {
    id: "step_omission_clear",
    label: "Expectation partial steps",
    questionId: "prob-10",
    intendedFailureClass: "step_omission",
    expectedReviewPriority: "medium",
    expectedNextAction: "review_now",
    answer: {
      userFormulaFamilyId: null,
      userWorkText: "sum of x p(x) = 1*0.2 + 2*0.3 + 3*0.5",
      intermediateSteps: ["1*0.2", "2*0.3"],
    },
  },
  {
    id: "weak_formula_evidence_clear",
    label: "Variance vague work text",
    questionId: "prob-11",
    intendedFailureClass: "weak_formula_evidence",
    expectedReviewPriority: "medium",
    expectedNextAction: "review_now",
    answer: {
      userFormulaFamilyId: null,
      userWorkText: "variance maybe",
      intermediateSteps: [],
    },
  },
  {
    id: "concept_recall_gap_ambiguous",
    label: "Basic probability wrong answer without other signals",
    questionId: "prob-1",
    intendedFailureClass: "concept_recall_gap",
    expectedReviewPriority: "medium",
    expectedNextAction: "review_now",
    answer: {
      selectedChoiceId: "2",
      userAnswerValue: "5/8",
      userFormulaFamilyId: "basic_probability_ratio",
      userWorkText: "5/8",
      intermediateSteps: ["3/8"],
    },
  },
];

function buildSubmissionFromCase(
  set: ProbabilitySet,
  calibrationCase: CalibrationCase,
): ProbabilitySetSubmissionInput {
  const answers = set.questions.reduce<Record<string, ProbabilitySetAnswer>>((acc, question) => {
    acc[question.question_id] = createDefaultAnswer(question);
    return acc;
  }, {});

  const targetQuestion = set.questions.find(
    (question) => question.question_id === calibrationCase.questionId,
  );
  if (!targetQuestion) {
    throw new Error(`Unknown calibration question: ${calibrationCase.questionId}`);
  }

  answers[targetQuestion.question_id] = {
    ...answers[targetQuestion.question_id],
    ...calibrationCase.answer,
  };

  return {
    subjectId: "probability",
    setId: set.id,
    startedAt: "2026-04-22T00:00:00.000Z",
    submittedAt: "2026-04-22T00:01:00.000Z",
    totalElapsedSeconds: 600,
    totalPausedSeconds: 0,
    exceededTimeLimit: false,
    overtimeSeconds: 0,
    answers,
  };
}

function deriveTargetNextAction(
  failureClass: FailureClass | null,
  hasReviewCandidate: boolean,
): NextActionType {
  if (failureClass === "confidence_mismatch") return "move_on";
  if (failureClass === "time_pressure" || failureClass === "arithmetic_slip") {
    return "slow_retry";
  }
  if (hasReviewCandidate) return "review_now";
  return "move_on";
}

export function runProbabilityCalibrationFixtures() {
  const set = getProbabilitySampleSet("intro-12");
  const results = calibrationCases.map((calibrationCase) => {
    const submission = buildSubmissionFromCase(set, calibrationCase);
    const evaluation = evaluateProbabilitySet("calibration-user", submission);
    const questionEvaluation = evaluation.questionEvaluations.find(
      (item) => item.questionId === calibrationCase.questionId,
    );
    const reviewCandidate = evaluation.reviewQueueCandidates.find(
      (item) => item.questionId === calibrationCase.questionId,
    );

    return {
      id: calibrationCase.id,
      label: calibrationCase.label,
      intended_failure_class: calibrationCase.intendedFailureClass,
      actual_failure_class: questionEvaluation?.primary_failure_class ?? null,
      intended_review_priority: calibrationCase.expectedReviewPriority,
      actual_review_priority: reviewCandidate?.reviewPriority ?? null,
      intended_next_action: calibrationCase.expectedNextAction,
      actual_next_action: deriveTargetNextAction(
        questionEvaluation?.primary_failure_class ?? null,
        Boolean(reviewCandidate),
      ),
      actual_set_next_action: evaluation.nextAction.next_action_type,
      mismatch: {
        failure_class:
          calibrationCase.intendedFailureClass !==
          (questionEvaluation?.primary_failure_class ?? null),
        review_priority:
          calibrationCase.expectedReviewPriority !==
          (reviewCandidate?.reviewPriority ?? null),
        next_action: calibrationCase.expectedNextAction !== deriveTargetNextAction(
          questionEvaluation?.primary_failure_class ?? null,
          Boolean(reviewCandidate),
        ),
      },
    };
  });

  return {
    cases: results,
    mismatch_cases: results.filter(
      (result) =>
        result.mismatch.failure_class ||
        result.mismatch.review_priority ||
        result.mismatch.next_action,
    ),
    summary: {
      total: results.length,
      failure_class_match_count: results.filter((result) => !result.mismatch.failure_class)
        .length,
      review_priority_match_count: results.filter((result) => !result.mismatch.review_priority)
        .length,
      next_action_match_count: results.filter((result) => !result.mismatch.next_action).length,
    },
  };
}
