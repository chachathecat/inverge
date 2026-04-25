import { getProbabilitySampleSet } from "@/lib/actuary-first/sample-data";
import { getProbabilityStepRulePack } from "@/lib/actuary-first/step-rule-packs";
import {
  inferFormulaFamilyFromWorkText,
  mergeVerifierOutputs,
  runFormulaVerifier,
  runIntermediateStepVerifier,
  runSymbolicVerifier,
  runVariableCheck,
} from "@/lib/actuary-first/verifier";
import type {
  ActuaryFirstSubjectId,
  CoachingSeed,
  FailureClass,
  NextAction,
  ProbabilityQuestion,
  ProbabilitySetAnswer,
  ProbabilitySetSubmissionInput,
  QuestionDeterministicEvaluation,
  ReviewCandidateSignals,
  ReviewPriority,
  ReviewQueueCandidate,
  SetDeterministicEvaluation,
} from "@/lib/actuary-first/types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapConfidenceMismatch(
  correctness: boolean,
  confidence: ProbabilitySetAnswer["confidence"],
) {
  if (!confidence) return { type: "none" as const, tag: null };
  if (!correctness && confidence === "high") {
    return {
      type: "high_confidence_wrong" as const,
      tag: "confidence_mismatch" as const,
    };
  }
  if (correctness && confidence === "low") {
    return {
      type: "low_confidence_right" as const,
      tag: "confidence_mismatch" as const,
    };
  }
  return { type: "none" as const, tag: null };
}

function toReviewPriority(score: number): ReviewPriority {
  if (score >= 7) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function labelForFailure(failureClass: FailureClass) {
  switch (failureClass) {
    case "formula_selection_error":
      return "공식 선택 다시 확인";
    case "arithmetic_slip":
      return "계산 마지막 단계 다시 확인";
    case "variable_misuse":
      return "변수 역할 다시 확인";
    case "confidence_mismatch":
      return "확신과 결과 간격 확인";
    case "time_pressure":
      return "시간 안배 다시 확인";
    case "concept_recall_gap":
      return "개념 호출 흐름 다시 확인";
    case "error_burst":
      return "비슷한 유형 연속 붕괴";
    case "final_answer_mismatch":
      return "최종 답 다시 확인";
    case "parse_failure":
      return "입력 형식 다시 확인";
    case "verification_missing":
      return "검산 흔적 보강";
    case "step_omission":
      return "중간 단계 보강";
    case "weak_formula_evidence":
      return "공식 흔적 보강";
  }
}

const FAILURE_PRIMARY_PRIORITY: FailureClass[] = [
  "variable_misuse",
  "formula_selection_error",
  "arithmetic_slip",
  "verification_missing",
  "step_omission",
  "weak_formula_evidence",
  "time_pressure",
  "confidence_mismatch",
  "concept_recall_gap",
  "final_answer_mismatch",
  "parse_failure",
  "error_burst",
];

function selectPrimaryFailureClass(
  correctness: boolean,
  failureClasses: FailureClass[],
  timeOveruse: boolean,
  confidenceTag: FailureClass | null,
) {
  const candidateClasses = Array.from(
    new Set([
      ...failureClasses,
      ...(timeOveruse ? (["time_pressure"] as FailureClass[]) : []),
      ...(confidenceTag ? ([confidenceTag] as FailureClass[]) : []),
      ...(!correctness && failureClasses.length === 0
        ? (["concept_recall_gap"] as FailureClass[])
        : []),
    ]),
  );

  if (correctness) {
    if (candidateClasses.includes("variable_misuse")) return "variable_misuse";
    if (candidateClasses.includes("formula_selection_error")) return "formula_selection_error";
    if (candidateClasses.includes("confidence_mismatch")) return "confidence_mismatch";
    if (candidateClasses.includes("time_pressure")) return "time_pressure";
    if (candidateClasses.includes("weak_formula_evidence")) return "weak_formula_evidence";
    if (candidateClasses.includes("verification_missing")) return "verification_missing";
    if (candidateClasses.includes("step_omission")) return "step_omission";
  }

  for (const failureClass of FAILURE_PRIMARY_PRIORITY) {
    if (candidateClasses.includes(failureClass)) {
      return failureClass;
    }
  }

  return null;
}

function buildReviewReasonSentence(
  failureClasses: FailureClass[],
  question?: ProbabilityQuestion,
) {
  const primary = failureClasses[0];
  if (!primary) {
    return "이번 문항은 다시 확인 후보로만 올려둡니다.";
  }

  if (
    question &&
    (primary === "verification_missing" ||
      primary === "step_omission" ||
      primary === "weak_formula_evidence")
  ) {
    const rulePack = getProbabilityStepRulePack(question.problem_family);
    if (rulePack) {
      return rulePack.review_message_seed;
    }
  }

  return `${labelForFailure(primary)} 포인트가 먼저 보입니다.`;
}

function buildRecommendedAction(
  failureClasses: FailureClass[],
  question?: ProbabilityQuestion,
) {
  const primary = failureClasses[0];
  const rulePack = question ? getProbabilityStepRulePack(question.problem_family) : null;

  switch (primary) {
    case "formula_selection_error":
      return "다음에는 어떤 공식을 먼저 꺼내야 하는지 짧게 적고 시작해 보세요.";
    case "variable_misuse":
      return "조건 방향과 변수 역할을 먼저 맞춘 뒤 계산을 다시 이어가 보세요.";
    case "arithmetic_slip":
      return "공식은 유지하고 마지막 계산 단계만 다시 확인해 보세요.";
    case "time_pressure":
      return "같은 유형을 시간 안에서 한 번 더 천천히 풀어 보세요.";
    case "verification_missing":
      return (
        rulePack?.review_message_seed ??
        "정답만 고르지 말고 검산 과정을 한 줄이라도 남겨 보세요."
      );
    case "step_omission":
      return (
        rulePack?.review_message_seed ??
        "중간 계산 단계를 한 줄씩 분리해 다시 적어 보세요."
      );
    case "weak_formula_evidence":
      return (
        rulePack?.review_message_seed ??
        "다음에는 사용한 공식을 먼저 적고 시작해 보세요."
      );
    default:
      return "같은 유형 한 문제만 짧게 다시 확인해 보세요.";
  }
}

function buildReviewSignals(
  _question: ProbabilityQuestion,
  answer: ProbabilitySetAnswer,
  evaluation: QuestionDeterministicEvaluation,
): ReviewCandidateSignals {
  return {
    wrong: !evaluation.correctness,
    timeOveruse: evaluation.time_signal.overuse,
    lowConfidence: answer.confidence === "low",
    mediumConfidence: answer.confidence === "medium",
    flagged: answer.flagged,
    formulaIssue:
      evaluation.formula_check_status === "fail" ||
      evaluation.failure_classes.includes("weak_formula_evidence"),
    variableIssue:
      evaluation.variable_check_status === "fail" ||
      evaluation.failure_classes.includes("verification_missing") ||
      evaluation.failure_classes.includes("step_omission"),
  };
}

function hasStrongComputationTrace(
  question: ProbabilityQuestion,
  answer: ProbabilitySetAnswer,
  verifierPathUsed: "explicit_formula" | "inferred_formula" | "final_only" | "key_steps",
) {
  const workText = (answer.userWorkText ?? "").toLowerCase();
  const nonEmptySteps = (answer.intermediateSteps ?? []).filter((step) => step.trim().length > 0);
  const simpleFractionOnly = /^\s*\d+\s*\/\s*\d+\s*$/.test(workText);
  const hasOperatorTrace =
    /(\*|\+|-|\/|c\d|!|e\[|var|p\(|\^|sigma|sum)/i.test(workText) ||
    nonEmptySteps.some((step) => /(\*|\+|-|\/|c\d|!|e\[|var|p\(|\^|sigma|sum)/i.test(step));

  if (
    question.problem_family === "basic_probability" &&
    nonEmptySteps.length <= 1 &&
    (!hasOperatorTrace || simpleFractionOnly)
  ) {
    return false;
  }

  return verifierPathUsed !== "final_only" || nonEmptySteps.length > 1 || hasOperatorTrace;
}

function buildQuestionEvaluation(
  question: ProbabilityQuestion,
  answer: ProbabilitySetAnswer,
): QuestionDeterministicEvaluation {
  const selectedChoiceValue =
    question.choices.find((choice) => choice.id === answer.selectedChoiceId)?.value ?? null;

  const inference = inferFormulaFamilyFromWorkText(answer.userWorkText);
  const formula = runFormulaVerifier({
    questionId: question.question_id,
    expectedFormulaFamilyId: question.formula_family_id,
    acceptedFormulaFamilyIds: question.accepted_formula_family_ids,
    userFormulaFamilyId: answer.userFormulaFamilyId,
    requiresFormulaSelectionCheck: question.requires_formula_selection_check,
    inferredFormulaFamilyId: inference.inferred_formula_family_id,
    inferenceStatus: inference.inference_status,
  });
  const variable = runVariableCheck({
    variableSchemaId: question.variable_schema_id,
    userVariableBindings: answer.userVariableBindings,
    requiresVariableBinding: question.requires_variable_binding,
  });
  const symbolic = runSymbolicVerifier({
    answerFormat: question.answer_format,
    correctAnswerValue: question.correct_answer_value,
    userAnswerValue: answer.userAnswerValue,
    selectedChoiceId: answer.selectedChoiceId,
    correctChoiceId: question.correct_choice_id,
    selectedChoiceValue,
    toleranceAbs: question.tolerance_abs,
    toleranceRel: question.tolerance_rel,
  });
  const intermediate = runIntermediateStepVerifier({
    questionId: question.question_id,
    problemFamily: question.problem_family,
    stepCheckMode: question.step_check_mode,
    supportsIntermediateSteps: question.supports_intermediate_steps,
    intermediateSteps: answer.intermediateSteps ?? [],
    keyStepPrompts: question.key_step_prompts,
  });
  const verifier = mergeVerifierOutputs({
    formula,
    variable,
    symbolic,
    inference,
    intermediate,
    explicitFormulaSelected: Boolean(answer.userFormulaFamilyId),
    stepCheckMode: question.step_check_mode,
  });

  const correctness =
    question.answer_format === "choice_only"
      ? answer.selectedChoiceId === question.correct_choice_id
      : verifier.symbolic_check_status === "pass";

  const timeRatio =
    question.expected_time_seconds > 0
      ? answer.elapsedSecondsOnQuestion / question.expected_time_seconds
      : 1;
  const timeSignal = { overuse: timeRatio > 1.25, ratio: Number(timeRatio.toFixed(2)) };
  const confidenceSignal = mapConfidenceMismatch(correctness, answer.confidence);

  const failureClasses = Array.from(
    new Set([
      ...verifier.failure_classes,
      ...(timeSignal.overuse ? (["time_pressure"] as FailureClass[]) : []),
      ...(confidenceSignal.tag ? ([confidenceSignal.tag] as FailureClass[]) : []),
      ...(!correctness && verifier.failure_classes.length === 0
        ? (["concept_recall_gap"] as FailureClass[])
        : []),
    ]),
  );

  const hasComputationTrace = hasStrongComputationTrace(
    question,
    answer,
    verifier.verifier_path_used,
  );

  if (failureClasses.includes("arithmetic_slip") && !hasComputationTrace) {
    const arithmeticIndex = failureClasses.indexOf("arithmetic_slip");
    if (arithmeticIndex >= 0) {
      failureClasses.splice(arithmeticIndex, 1);
    }
    if (!failureClasses.includes("concept_recall_gap")) {
      failureClasses.push("concept_recall_gap");
    }
  }

  if (
    failureClasses.includes("final_answer_mismatch") &&
    failureClasses.some((failureClass) =>
      [
        "formula_selection_error",
        "variable_misuse",
        "arithmetic_slip",
        "concept_recall_gap",
      ].includes(failureClass),
    )
  ) {
    const mismatchIndex = failureClasses.indexOf("final_answer_mismatch");
    if (mismatchIndex >= 0) {
      failureClasses.splice(mismatchIndex, 1);
    }
  }

  const primaryFailureClass = selectPrimaryFailureClass(
    correctness,
    failureClasses,
    timeSignal.overuse,
    confidenceSignal.tag,
  );
  const calibratedPrimaryFailureClass =
    question.problem_family === "basic_probability" &&
    primaryFailureClass === "step_omission" &&
    failureClasses.includes("concept_recall_gap")
      ? "concept_recall_gap"
      : primaryFailureClass;
  const orderedRootCauseTags = Array.from(
    new Set([
      ...(calibratedPrimaryFailureClass ? [calibratedPrimaryFailureClass] : []),
      ...failureClasses,
    ]),
  );

  return {
    questionId: question.question_id,
    questionNumber: question.question_number,
    problemFamily: question.problem_family,
    unitId: question.unit_id,
    correctness,
    correctness_confidence: correctness ? 0.99 : 0.95,
    calc_stability_score:
      verifier.symbolic_check_status === "pass"
        ? 0.92
        : verifier.symbolic_check_status === "fail"
          ? 0.4
          : verifier.intermediate_step_status === "pass"
            ? 0.7
            : 0.55,
    formula_check_status: verifier.formula_check_status,
    formula_check_confidence: formula.confidence,
    variable_check_status: verifier.variable_check_status,
    variable_check_confidence: variable.confidence,
    symbolic_check_status: verifier.symbolic_check_status,
    inferred_formula_family_id: verifier.inferred_formula_family_id,
    formula_inference_confidence: verifier.inference_confidence,
    intermediate_step_status: verifier.intermediate_step_status,
    intermediate_step_confidence: verifier.intermediate_step_confidence,
    intermediate_failure_class: verifier.intermediate_failure_class,
    verifier_path_used: verifier.verifier_path_used,
    time_signal: timeSignal,
    confidence_signal: {
      type: confidenceSignal.type,
    },
    primary_failure_class: calibratedPrimaryFailureClass,
    failure_classes: orderedRootCauseTags,
    review_candidate_signals: {
      wrong: !correctness,
      timeOveruse: timeSignal.overuse,
      lowConfidence: answer.confidence === "low",
      mediumConfidence: answer.confidence === "medium",
      flagged: answer.flagged,
      formulaIssue:
        verifier.formula_check_status === "fail" ||
        verifier.failure_classes.includes("weak_formula_evidence"),
      variableIssue:
        verifier.variable_check_status === "fail" ||
        verifier.failure_classes.includes("verification_missing") ||
        verifier.failure_classes.includes("step_omission"),
    },
    root_cause_tags: orderedRootCauseTags,
    verifier,
  };
}

function buildSetEvaluation(evaluations: QuestionDeterministicEvaluation[]) {
  const answeredCount = evaluations.length;
  const correctCount = evaluations.filter((item) => item.correctness).length;
  const timeOveruseCount = evaluations.filter((item) => item.time_signal.overuse).length;
  const highConfidenceWrongCount = evaluations.filter(
    (item) => item.confidence_signal.type === "high_confidence_wrong",
  ).length;
  const failureRuns = evaluations.reduce(
    (state, item) => {
      if (!item.correctness) {
        state.current += 1;
        state.max = Math.max(state.max, state.current);
      } else {
        state.current = 0;
      }
      return state;
    },
    { current: 0, max: 0 },
  );
  const weakUnits = evaluations.reduce<Record<string, number>>((acc, item) => {
    if (!item.correctness || item.time_signal.overuse) {
      acc[item.unitId] = (acc[item.unitId] ?? 0) + 1;
    }
    return acc;
  }, {});
  const weakUnitIds = Object.entries(weakUnits)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([unitId]) => unitId);

  return {
    answered_count: answeredCount,
    correct_count: correctCount,
    error_burst_index: Number((failureRuns.max / Math.max(1, answeredCount)).toFixed(2)),
    weak_unit_ids: weakUnitIds,
    high_confidence_wrong_count: highConfidenceWrongCount,
    time_overuse_count: timeOveruseCount,
    review_candidate_count: 0,
    internal_percentile_band:
      correctCount / Math.max(1, answeredCount) >= 0.8
        ? "top_20"
        : correctCount / Math.max(1, answeredCount) >= 0.5
          ? "mid_40_80"
          : "needs_review",
  } satisfies SetDeterministicEvaluation;
}

function buildReviewPriorityScore(
  evaluation: QuestionDeterministicEvaluation,
  signals: ReviewCandidateSignals,
) {
  const primary = evaluation.primary_failure_class;
  const dampenStepSignals =
    primary === "arithmetic_slip" ||
    primary === "confidence_mismatch" ||
    primary === "time_pressure";

  return (
    (signals.wrong ? 3 : 0) +
    (primary === "variable_misuse" ? 4 : 0) +
    (primary === "formula_selection_error" ? 4 : 0) +
    (primary === "arithmetic_slip" ? 2 : 0) +
    (signals.timeOveruse ? 1 : 0) +
    (evaluation.failure_classes.includes("confidence_mismatch") ? 1 : 0) +
    (signals.flagged ? 1 : 0) +
    (evaluation.failure_classes.includes("verification_missing")
      ? dampenStepSignals
        ? 1
        : 3
      : 0) +
    (evaluation.failure_classes.includes("step_omission")
      ? dampenStepSignals
        ? 1
        : 3
      : 0) +
    (evaluation.failure_classes.includes("weak_formula_evidence")
      ? primary === "confidence_mismatch" || primary === "time_pressure"
        ? 0
        : dampenStepSignals
          ? 1
          : 3
      : 0)
  );
}

function buildReviewQueueCandidates(
  userId: string,
  subjectId: ActuaryFirstSubjectId,
  setId: string,
  questions: ProbabilityQuestion[],
  answers: Record<string, ProbabilitySetAnswer>,
  evaluations: QuestionDeterministicEvaluation[],
) {
  return evaluations
    .flatMap<ReviewQueueCandidate>((evaluation) => {
      const question = questions.find((item) => item.question_id === evaluation.questionId);
      const answer = answers[evaluation.questionId];
      if (!question || !answer) return [];

      const signals = buildReviewSignals(question, answer, evaluation);
      const shouldQueue =
        signals.wrong ||
        signals.timeOveruse ||
        signals.flagged ||
        evaluation.failure_classes.includes("verification_missing") ||
        evaluation.failure_classes.includes("step_omission") ||
        evaluation.failure_classes.includes("weak_formula_evidence") ||
        evaluation.failure_classes.includes("confidence_mismatch");
      if (!shouldQueue) return [];

      const priorityScore = buildReviewPriorityScore(evaluation, signals);
      const reviewReasonCodes = Array.from(
        new Set([
          ...(evaluation.primary_failure_class ? [evaluation.primary_failure_class] : []),
          ...evaluation.failure_classes,
        ]),
      );
      return [
        {
          id: createId(`actuary_review_${evaluation.questionId}`),
          userId,
          setId,
          questionId: evaluation.questionId,
          questionNumber: evaluation.questionNumber,
          subjectId,
          unitId: evaluation.unitId,
          difficulty: question.difficulty,
          selectedChoiceId: answer.selectedChoiceId,
          confidence: answer.confidence,
          elapsedSecondsOnQuestion: answer.elapsedSecondsOnQuestion,
          reviewPriority: toReviewPriority(priorityScore),
          reviewPriorityScore: priorityScore,
          reviewReasonCodes,
          reviewReasonSentence: buildReviewReasonSentence(reviewReasonCodes, question),
          recommendedReviewAction: buildRecommendedAction(reviewReasonCodes, question),
          rootCauseTags: evaluation.root_cause_tags,
          status: "queued",
          createdAt: new Date().toISOString(),
        },
      ];
    })
    .sort((left, right) => right.reviewPriorityScore - left.reviewPriorityScore);
}

function buildCoachingSeed(
  setEvaluation: SetDeterministicEvaluation,
  reviewQueueCandidates: ReviewQueueCandidate[],
  questions: ProbabilityQuestion[],
): CoachingSeed {
  const topFailure =
    reviewQueueCandidates[0]?.rootCauseTags[0] ??
    (setEvaluation.time_overuse_count > 2 ? "time_pressure" : "concept_recall_gap");
  const topQuestion = questions.find(
    (question) => question.question_id === reviewQueueCandidates[0]?.questionId,
  );
  const rulePack = topQuestion ? getProbabilityStepRulePack(topQuestion.problem_family) : null;

  return {
    coachingTheme:
      topFailure === "weak_formula_evidence" ||
      topFailure === "verification_missing" ||
      topFailure === "step_omission"
        ? (rulePack?.coaching_theme_seed ?? "중간 단계 분리")
        : topFailure === "formula_selection_error"
          ? "문제군별 공식 선택"
          : topFailure === "variable_misuse"
            ? "변수 방향과 역할"
            : topFailure === "time_pressure"
              ? "시간 안배"
              : "계산 안정성",
    coachingRootCauseTags: [topFailure],
    coachingSummary:
      topFailure === "weak_formula_evidence" ||
      topFailure === "verification_missing" ||
      topFailure === "step_omission"
        ? (rulePack?.review_message_seed ??
          "중간 계산 단계를 나눠 적기만 해도 검산과 복기가 훨씬 쉬워집니다.")
        : topFailure === "formula_selection_error"
          ? "같은 유형에서 어떤 공식을 먼저 꺼내야 하는지 먼저 고정할 필요가 있습니다."
          : topFailure === "variable_misuse"
            ? "조건 방향과 변수 역할을 먼저 맞춘 뒤 계산으로 들어가는 편이 좋습니다."
            : topFailure === "time_pressure"
              ? "시간이 흔들릴 때는 같은 유형을 한 번 더 천천히 푸는 편이 낫습니다."
              : "방법은 맞아도 마지막 계산 단계에서 흔들리는 패턴이 보입니다.",
    coachingConfidence: 0.74,
  };
}

function buildNextAction(
  setEvaluation: SetDeterministicEvaluation,
  reviewQueueCandidates: ReviewQueueCandidate[],
  questions: ProbabilityQuestion[],
): NextAction {
  const topCandidate = reviewQueueCandidates[0];
  const topFailure = topCandidate?.rootCauseTags[0] ?? topCandidate?.reviewReasonCodes[0];
  const topQuestion = questions.find((question) => question.question_id === topCandidate?.questionId);
  const rulePack = topQuestion ? getProbabilityStepRulePack(topQuestion.problem_family) : null;

  if (reviewQueueCandidates.length > 0) {
    if (topFailure === "confidence_mismatch") {
      return {
        next_action_type: "move_on",
        next_action_label: "같은 유형 한 문제만 짧게 다시 보기",
        next_action_reason: "결과는 맞았으니 확신만 조금 더 안정적으로 가져가면 됩니다.",
        action_confidence: 0.7,
      };
    }

    if (topFailure === "time_pressure") {
      return {
        next_action_type: "slow_retry",
        next_action_label: "같은 유형을 천천히 다시 풀기",
        next_action_reason: "시간이 먼저 흔들린 케이스라 계산 순서를 천천히 다시 잡는 편이 낫습니다.",
        action_confidence: 0.78,
      };
    }

    if (topFailure === "arithmetic_slip" && reviewQueueCandidates.length <= 2) {
      return {
        next_action_type: "slow_retry",
        next_action_label: "같은 유형을 천천히 다시 풀기",
        next_action_reason: "계산 마지막 단계만 다시 확인하면 바로 정리될 가능성이 큽니다.",
        action_confidence: 0.84,
      };
    }

    return {
      next_action_type: "review_now",
      next_action_label:
        topFailure === "weak_formula_evidence"
          ? "공식부터 적고 review 하기"
          : topFailure === "verification_missing" || topFailure === "step_omission"
            ? "중간 단계를 나눠 review 하기"
            : "review로 바로 이어가기",
      next_action_reason:
        topFailure === "weak_formula_evidence"
          ? (rulePack?.review_message_seed ??
            "사용한 공식을 먼저 남겨 두면 같은 실수가 줄어듭니다.")
          : topFailure === "verification_missing" || topFailure === "step_omission"
            ? (rulePack?.review_message_seed ??
              "검산 가능한 흔적을 남기는 연습이 지금 가장 큰 다음 행동입니다.")
            : "방금 흔들린 계산 포인트를 바로 정리하는 편이 좋습니다.",
      action_confidence: 0.9,
    };
  }

  if (setEvaluation.time_overuse_count >= 3) {
    return {
      next_action_type: "slow_retry",
      next_action_label: "같은 유형을 천천히 다시 풀기",
      next_action_reason: "시간 안배보다 계산 순서를 먼저 고정할 필요가 있습니다.",
      action_confidence: 0.72,
    };
  }

  if (setEvaluation.correct_count / Math.max(1, setEvaluation.answered_count) < 0.7) {
    return {
      next_action_type: "retry_set",
      next_action_label: "지금 세트를 한 번 더 풀기",
      next_action_reason: "비슷한 문제군을 한 번 더 돌리면 안정성이 올라갑니다.",
      action_confidence: 0.7,
    };
  }

  return {
    next_action_type: "move_on",
    next_action_label: "다음 세트로 이어가기",
    next_action_reason: "이번 계산 흐름은 비교적 안정적입니다.",
    action_confidence: 0.65,
  };
}

export function evaluateProbabilitySet(
  userId: string,
  input: ProbabilitySetSubmissionInput,
) {
  const set = getProbabilitySampleSet(input.setId);
  const evaluations = set.questions.map((question) =>
    buildQuestionEvaluation(question, input.answers[question.question_id]),
  );
  const setEvaluation = buildSetEvaluation(evaluations);
  const reviewQueueCandidates = buildReviewQueueCandidates(
    userId,
    input.subjectId,
    input.setId,
    set.questions,
    input.answers,
    evaluations,
  );

  setEvaluation.review_candidate_count = reviewQueueCandidates.length;

  const reviewQueueWithBurst = reviewQueueCandidates
    .map((candidate, index) =>
      setEvaluation.error_burst_index >= 0.25 && index === 0
        ? {
            ...candidate,
            reviewPriorityScore: candidate.reviewPriorityScore + 1,
            reviewReasonCodes: Array.from(
              new Set<FailureClass>([...candidate.reviewReasonCodes, "error_burst"]),
            ),
            rootCauseTags: Array.from(
              new Set<FailureClass>([...candidate.rootCauseTags, "error_burst"]),
            ),
          }
        : candidate,
    )
    .sort((left, right) => right.reviewPriorityScore - left.reviewPriorityScore);

  const coachingSeed = buildCoachingSeed(setEvaluation, reviewQueueWithBurst, set.questions);
  const nextAction = buildNextAction(setEvaluation, reviewQueueWithBurst, set.questions);

  return {
    set,
    questionEvaluations: evaluations,
    setEvaluation,
    reviewQueueCandidates: reviewQueueWithBurst,
    coachingSeed,
    nextAction,
  };
}
