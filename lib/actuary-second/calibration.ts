import { evaluatePresentValueAnswer } from "@/lib/actuary-second/engine";
import type {
  ActuarySecondFailureClass,
  ActuarySecondVerifierInput,
  NextActionType,
} from "@/lib/actuary-second/types";

type CalibrationCase = {
  id: string;
  label: string;
  questionId: string;
  intendedPrimaryFailureClass: ActuarySecondFailureClass;
  expectedCorrectionTargetContains: string;
  expectedNextAction: NextActionType;
  expectedUserFacingSummaryTone: string;
  input: Omit<ActuarySecondVerifierInput, "subject_id" | "question_id">;
};

function getLegacyNextAction(primaryFailureClass: ActuarySecondFailureClass | null, reviewPriority: "high" | "medium" | "low") {
  if (primaryFailureClass === "arithmetic_slip") return "slow_retry";
  if (
    primaryFailureClass === "result_interpretation_gap" ||
    primaryFailureClass === "calculation_to_judgment_gap" ||
    primaryFailureClass === "weak_conclusion"
  ) {
    return "rewrite_now";
  }
  if (primaryFailureClass === "time_pressure") return "slow_retry";
  if (reviewPriority !== "low") return "review_now";
  return "move_on";
}

function selectLegacyPrimaryFromActual(failureClasses: ActuarySecondFailureClass[]) {
  const legacyPriority: ActuarySecondFailureClass[] = [
    "variable_assumption_error",
    "variable_misuse",
    "formula_selection_error",
    "arithmetic_slip",
    "result_interpretation_gap",
    "calculation_to_judgment_gap",
    "weak_conclusion",
    "verification_missing",
    "step_omission",
    "weak_formula_evidence",
    "time_pressure",
    "parse_failure",
  ];

  for (const failureClass of legacyPriority) {
    if (failureClasses.includes(failureClass)) return failureClass;
  }
  return null;
}

const calibrationCases: CalibrationCase[] = [
  {
    id: "formula_selection_clear",
    label: "ordinary annuity solved as single payment",
    questionId: "sample-2",
    intendedPrimaryFailureClass: "formula_selection_error",
    expectedCorrectionTargetContains: "single, ordinary, due, deferred",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "family-first",
    input: {
      raw_answer_text: "PV = 500(1.04)^4 = 584.93",
      raw_work_text: "single payment present value using one discount form",
      explicit_formula_family_id: "pv_single_payment_basic",
      intermediate_steps: ["single payment setup", "500*(1.04)^4"],
      elapsed_seconds: 340,
      confidence: "medium",
      interest_rate: 0.04,
      period_count: 4,
      payment_amount: 500,
      compounding_assumption: "annual_compound",
      present_value_target: "ordinary annuity present value",
      annuity_type: "ordinary",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "variable_assumption_clear",
    label: "annuity due with wrong timing convention",
    questionId: "sample-7",
    intendedPrimaryFailureClass: "variable_assumption_error",
    expectedCorrectionTargetContains: "rate, period, timing",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "assumption-first",
    input: {
      raw_answer_text: "PV = 1730.49",
      raw_work_text: "annuity due so multiply by 1.04",
      explicit_formula_family_id: "pv_annuity_due_basic",
      intermediate_steps: ["a-angle-3=(1-v^3)/0.04", "times 1.04"],
      elapsed_seconds: 320,
      confidence: "high",
      interest_rate: 0.04,
      period_count: 3,
      payment_amount: 600,
      compounding_assumption: "annual_compound",
      present_value_target: "annuity due present value",
      annuity_type: "due",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "variable_misuse_clear",
    label: "payment amount drifts from prompt",
    questionId: "sample-2",
    intendedPrimaryFailureClass: "variable_misuse",
    expectedCorrectionTargetContains: "payment amount",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "variable-fix",
    input: {
      raw_answer_text: "PV = 2177.93",
      raw_work_text: "ordinary annuity a-angle-4=(1-v^4)/0.04 then times 600",
      explicit_formula_family_id: "pv_ordinary_annuity_basic",
      intermediate_steps: ["a-angle-4=(1-v^4)/0.04", "times 600"],
      elapsed_seconds: 320,
      confidence: "medium",
      interest_rate: 0.04,
      period_count: 4,
      payment_amount: 600,
      compounding_assumption: "annual_compound",
      present_value_target: "ordinary annuity present value",
      annuity_type: "ordinary",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "arithmetic_slip_clear",
    label: "correct method wrong final number",
    questionId: "sample-2",
    intendedPrimaryFailureClass: "arithmetic_slip",
    expectedCorrectionTargetContains: "final numeric step",
    expectedNextAction: "slow_retry",
    expectedUserFacingSummaryTone: "late-numeric",
    input: {
      raw_answer_text: "PV = 1810.00",
      raw_work_text: "ordinary annuity, a-angle-4=(1-v^4)/0.04, then times 500",
      explicit_formula_family_id: "pv_ordinary_annuity_basic",
      intermediate_steps: ["a-angle-4=(1-v^4)/0.04", "times 500"],
      elapsed_seconds: 310,
      confidence: "medium",
      interest_rate: 0.04,
      period_count: 4,
      payment_amount: 500,
      compounding_assumption: "annual_compound",
      present_value_target: "ordinary annuity present value",
      annuity_type: "ordinary",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "interpretation_gap_clear",
    label: "number present but no meaning sentence",
    questionId: "sample-5",
    intendedPrimaryFailureClass: "result_interpretation_gap",
    expectedCorrectionTargetContains: "what present value",
    expectedNextAction: "rewrite_now",
    expectedUserFacingSummaryTone: "interpretation-first",
    input: {
      raw_answer_text: "PV = 842.47",
      raw_work_text: "annuity factor a-angle-5=(1-v^5)/0.06 then times 200",
      explicit_formula_family_id: "pv_annuity_factor_form",
      intermediate_steps: ["a-angle-5=(1-v^5)/0.06", "times 200"],
      elapsed_seconds: 390,
      confidence: "medium",
      interest_rate: 0.06,
      period_count: 5,
      payment_amount: 200,
      compounding_assumption: "annual_compound",
      present_value_target: "annuity factor present value",
      annuity_type: "ordinary",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "judgment_gap_clear",
    label: "interpretation exists but does not close the prompt",
    questionId: "sample-6",
    intendedPrimaryFailureClass: "calculation_to_judgment_gap",
    expectedCorrectionTargetContains: "final judgment sentence",
    expectedNextAction: "rewrite_now",
    expectedUserFacingSummaryTone: "close-answer",
    input: {
      raw_answer_text: "This value is the present value of the annuity. 1089.30",
      raw_work_text: "ordinary annuity a-angle-3=(1-v^3)/0.05 then times 400",
      explicit_formula_family_id: "pv_ordinary_annuity_basic",
      intermediate_steps: ["a-angle-3=(1-v^3)/0.05", "times 400"],
      elapsed_seconds: 340,
      confidence: "medium",
      interest_rate: 0.05,
      period_count: 3,
      payment_amount: 400,
      compounding_assumption: "annual_compound",
      present_value_target: "ordinary annuity present value",
      annuity_type: "ordinary",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "weak_conclusion_clear",
    label: "conclusion exists but is thin",
    questionId: "sample-10",
    intendedPrimaryFailureClass: "weak_conclusion",
    expectedCorrectionTargetContains: "last sentence",
    expectedNextAction: "rewrite_now",
    expectedUserFacingSummaryTone: "strengthen-closing",
    input: {
      raw_answer_text: "This value is the present value of the annuity. Therefore, answer 839.66.",
      raw_work_text: "annuity factor a-angle-6 then times 150",
      explicit_formula_family_id: "pv_annuity_factor_form",
      intermediate_steps: ["a-angle-6=(1-v^6)/0.02", "times 150"],
      elapsed_seconds: 340,
      confidence: "medium",
      interest_rate: 0.02,
      period_count: 6,
      payment_amount: 150,
      compounding_assumption: "annual_compound",
      present_value_target: "annuity factor present value",
      annuity_type: "ordinary",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "verification_missing_clear",
    label: "correct result with no check trace",
    questionId: "sample-1",
    intendedPrimaryFailureClass: "verification_missing",
    expectedCorrectionTargetContains: "verification line",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "trace-needed",
    input: {
      raw_answer_text: "The present value is 863.84.",
      raw_work_text: "",
      explicit_formula_family_id: null,
      intermediate_steps: [],
      elapsed_seconds: 280,
      confidence: "medium",
      interest_rate: 0.05,
      period_count: 3,
      payment_amount: 1000,
      compounding_assumption: "annual_compound",
      present_value_target: "single payment present value",
      annuity_type: "single",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "step_omission_clear",
    label: "partial steps only",
    questionId: "sample-8",
    intendedPrimaryFailureClass: "step_omission",
    expectedCorrectionTargetContains: "method line",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "step-rebuild",
    input: {
      raw_answer_text: "PV = 840.60",
      raw_work_text: "deferred annuity",
      explicit_formula_family_id: "pv_deferred_annuity_basic",
      intermediate_steps: ["times 250"],
      elapsed_seconds: 330,
      confidence: "low",
      interest_rate: 0.05,
      period_count: 4,
      payment_amount: 250,
      compounding_assumption: "annual_compound",
      present_value_target: "deferred annuity present value",
      annuity_type: "deferred",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "weak_formula_evidence_clear",
    label: "vague PV language only",
    questionId: "sample-9",
    intendedPrimaryFailureClass: "weak_formula_evidence",
    expectedCorrectionTargetContains: "verification line",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "formula-trace",
    input: {
      raw_answer_text: "Current value maybe 1885.19",
      raw_work_text: "discount and present value",
      explicit_formula_family_id: null,
      intermediate_steps: ["discount"],
      elapsed_seconds: 260,
      confidence: "low",
      interest_rate: 0.03,
      period_count: 2,
      payment_amount: 2000,
      compounding_assumption: "annual_compound",
      present_value_target: "single payment present value",
      annuity_type: "single",
      timing_convention: "end_of_period",
    },
  },
  {
    id: "parse_failure_clear",
    label: "answer too ambiguous to parse",
    questionId: "sample-4",
    intendedPrimaryFailureClass: "parse_failure",
    expectedCorrectionTargetContains: "method line",
    expectedNextAction: "review_now",
    expectedUserFacingSummaryTone: "rewrite-structure",
    input: {
      raw_answer_text: "not sure",
      raw_work_text: "",
      explicit_formula_family_id: null,
      intermediate_steps: [],
      elapsed_seconds: 420,
      confidence: "low",
      interest_rate: 0.03,
      period_count: 3,
      payment_amount: 300,
      compounding_assumption: "annual_compound",
      present_value_target: "deferred annuity present value",
      annuity_type: "deferred",
      timing_convention: "end_of_period",
    },
  },
];

export function runActuarySecondCalibrationFixtures() {
  const results = calibrationCases.map((fixture) => {
    const evaluation = evaluatePresentValueAnswer("calibration-user", {
      subject_id: "insurance_math",
      question_id: fixture.questionId,
      ...fixture.input,
    });

    const actualPrimary = evaluation.primary_failure_class;
    const actualCorrectionTarget = evaluation.correction_seed.correction_target;
    const actualNextAction = evaluation.next_action.next_action_type;
    const legacyPrimary = selectLegacyPrimaryFromActual(evaluation.failure_classes);
    const legacyNextAction = getLegacyNextAction(
      legacyPrimary,
      evaluation.review_queue_candidate?.reviewPriority ?? "low",
    );

    return {
      id: fixture.id,
      label: fixture.label,
      intended_primary_failure_class: fixture.intendedPrimaryFailureClass,
      actual_primary_failure_class: actualPrimary,
      intended_correction_target_contains: fixture.expectedCorrectionTargetContains,
      actual_correction_target: actualCorrectionTarget,
      intended_next_action: fixture.expectedNextAction,
      actual_next_action: actualNextAction,
      expected_user_facing_summary_tone: fixture.expectedUserFacingSummaryTone,
      before_primary_failure_class: legacyPrimary,
      before_next_action: legacyNextAction,
      mismatches: {
        primary: fixture.intendedPrimaryFailureClass !== actualPrimary,
        correction_target: !actualCorrectionTarget.toLowerCase().includes(fixture.expectedCorrectionTargetContains.toLowerCase()),
        next_action: fixture.expectedNextAction !== actualNextAction,
      },
    };
  });

  return {
    cases: results,
    mismatch_cases: results.filter((item) => item.mismatches.primary || item.mismatches.correction_target || item.mismatches.next_action),
    summary: {
      total: results.length,
      primary_match_count: results.filter((item) => !item.mismatches.primary).length,
      correction_target_match_count: results.filter((item) => !item.mismatches.correction_target).length,
      next_action_match_count: results.filter((item) => !item.mismatches.next_action).length,
      before_after_changes: results.filter((item) => item.before_primary_failure_class !== item.actual_primary_failure_class || item.before_next_action !== item.actual_next_action).length,
    },
  };
}
