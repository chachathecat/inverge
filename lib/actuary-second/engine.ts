import { getPresentValueSampleQuestion } from "@/lib/actuary-second/sample-data";
import { presentValueVariableSchemas } from "@/lib/actuary-second/variable-schemas";
import type {
  ActuarySecondCoachingSeed,
  ActuarySecondEvaluationResult,
  ActuarySecondFailureClass,
  ActuarySecondNextAction,
  ActuarySecondReviewQueueCandidate,
  ActuarySecondVerifierInput,
  ActuarySecondVerifierOutput,
  FormulaCheckOutput,
  ParserSkeletonOutput,
  PartialCreditSignal,
  PresentValueCorrectionSeed,
  PresentValueSampleQuestion,
  StepCheckOutput,
  SymbolicCheckOutput,
  VariableCheckOutput,
  VerifierStatus,
} from "@/lib/actuary-second/types";

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeAnswerNumber(text: string) {
  const match = text.match(/-?\d+(?:\.\d+)?/g);
  if (!match?.length) return null;
  const last = Number(match[match.length - 1]);
  return Number.isFinite(last) ? last : null;
}

function compareNumbers(expected: number, actual: number, toleranceAbs: number, toleranceRel: number) {
  const diff = Math.abs(expected - actual);
  return diff <= Math.max(toleranceAbs, Math.abs(expected) * toleranceRel);
}

function parsePresentValueAnswer(
  question: PresentValueSampleQuestion,
  input: ActuarySecondVerifierInput,
): ParserSkeletonOutput {
  const raw = `${input.raw_answer_text}\n${input.raw_work_text ?? ""}`.trim();
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedExpressions = lines
    .filter((line) => /[=()^/]|a-angle|v\^|pv|present value|therefore|thus/i.test(line))
    .map((line) => ({
      raw: line,
      normalized: normalizeText(line),
    }));

  const parsedVariableHints: Record<string, string | number> = {};
  const rateMatch = raw.match(/(?:i|rate|interest)\s*=?\s*(\d+(?:\.\d+)?%?)/i);
  if (rateMatch?.[1]) parsedVariableHints.interest_rate = rateMatch[1];
  const periodMatch = raw.match(/(?:n|period|year)\s*=?\s*(\d+)/i);
  if (periodMatch?.[1]) parsedVariableHints.period_count = Number(periodMatch[1]);
  const paymentMatch = raw.match(/(?:payment|amount)\s*=?\s*(\d+(?:\.\d+)?)/i);
  if (paymentMatch?.[1]) parsedVariableHints.payment_amount = Number(paymentMatch[1]);

  const normalizedRaw = normalizeText(raw);
  if (/(annuity due|due|beginning of period|beginning)/.test(normalizedRaw)) {
    parsedVariableHints.annuity_type = "due";
    parsedVariableHints.timing_convention = "beginning_of_period";
  } else if (/(deferred|defer|starts after|wait)/.test(normalizedRaw)) {
    parsedVariableHints.annuity_type = "deferred";
  } else if (/(single payment|single pv|single present value)/.test(normalizedRaw)) {
    parsedVariableHints.annuity_type = "single";
  } else if (/(ordinary|end of period|annuity immediate)/.test(normalizedRaw)) {
    parsedVariableHints.annuity_type = "ordinary";
    parsedVariableHints.timing_convention = "end_of_period";
  }

  if (/(factor form|annuity factor|a-angle)/.test(normalizedRaw)) {
    parsedVariableHints.present_value_target = "annuity factor present value";
  }

  const parsedInterpretationFragments = lines.filter((line) =>
    /(present value of|means the current value|represents the current value|is the current value of)/i.test(line),
  );
  const parsedConclusionFragments = lines.filter((line) =>
    /(therefore the present value is|thus the present value is|therefore the required present value is|therefore answer|thus answer)/i.test(line),
  );

  const isThinAmbiguousText =
    raw.length > 0 &&
    parsedExpressions.length === 0 &&
    parsedInterpretationFragments.length === 0 &&
    parsedConclusionFragments.length === 0 &&
    raw.split(/\s+/).length <= 3;

  const parseStatus: VerifierStatus =
    raw.length === 0
      ? "fail"
      : parsedExpressions.length > 0 || parsedInterpretationFragments.length > 0 || parsedConclusionFragments.length > 0
        ? "pass"
        : isThinAmbiguousText
          ? "fail"
          : "unknown";

  return {
    parse_status: parseStatus,
    parsed_expressions: parsedExpressions,
    parsed_variable_hints: parsedVariableHints,
    parsed_interpretation_fragments: parsedInterpretationFragments,
    parsed_conclusion_fragments: parsedConclusionFragments,
    parse_confidence: parseStatus === "pass" ? 0.82 : parseStatus === "unknown" ? 0.42 : 0.18,
  };
}

function inferFormulaFamilyFromText(input: ActuarySecondVerifierInput) {
  const source = normalizeText(`${input.raw_answer_text}\n${input.raw_work_text ?? ""}`);

  if (!source) {
    return {
      inferred_formula_family_id: null,
      inference_confidence: 0.1,
      inference_evidence: ["empty-text"],
      inference_status: "unknown" as const,
    };
  }

  if (/(annuity due|due|beginning of period|beginning)/.test(source) && (/\(1\+i\)|\/v|ddot/.test(source) || /a-angle/.test(source))) {
    return {
      inferred_formula_family_id: "pv_annuity_due_basic" as const,
      inference_confidence: 0.84,
      inference_evidence: ["due-pattern"],
      inference_status: "pass" as const,
    };
  }

  if (/(deferred|defer|starts after|wait)/.test(source) && (/v\^\d+/.test(source) || /a-angle/.test(source))) {
    return {
      inferred_formula_family_id: "pv_deferred_annuity_basic" as const,
      inference_confidence: 0.82,
      inference_evidence: ["deferred-pattern"],
      inference_status: "pass" as const,
    };
  }

  if (/(single payment|single pv|single present value)/.test(source) || (/1\/\(1\+/.test(source) && /v\^\d+/.test(source))) {
    return {
      inferred_formula_family_id: "pv_single_payment_basic" as const,
      inference_confidence: 0.8,
      inference_evidence: ["single-payment-pattern"],
      inference_status: "pass" as const,
    };
  }

  if (/(annuity factor|factor form|a-angle)/.test(source)) {
    return {
      inferred_formula_family_id: "pv_annuity_factor_form" as const,
      inference_confidence: 0.72,
      inference_evidence: ["factor-form-pattern"],
      inference_status: "pass" as const,
    };
  }

  if (/\(1-v\^\d+\)\/\d*\.?\d+/.test(source) || /ordinary|end of period|annuity immediate/.test(source)) {
    return {
      inferred_formula_family_id: "pv_ordinary_annuity_basic" as const,
      inference_confidence: 0.68,
      inference_evidence: ["ordinary-pattern"],
      inference_status: "pass" as const,
    };
  }

  if (/pv|present value|discount/.test(source)) {
    return {
      inferred_formula_family_id: null,
      inference_confidence: 0.3,
      inference_evidence: ["generic-pv-language"],
      inference_status: "weak" as const,
    };
  }

  return {
    inferred_formula_family_id: null,
    inference_confidence: 0.18,
    inference_evidence: ["formula-evidence-weak"],
    inference_status: "unknown" as const,
  };
}

function runFormulaFamilyCheck(
  question: PresentValueSampleQuestion,
  input: ActuarySecondVerifierInput,
): FormulaCheckOutput {
  const explicit = input.explicit_formula_family_id ?? null;
  const inference = inferFormulaFamilyFromText(input);
  const matched = explicit ?? inference.inferred_formula_family_id;

  if (!matched) {
    return {
      formula_check_status: "unknown",
      matched_formula_family_id: null,
      inferred_formula_family_id: inference.inferred_formula_family_id,
      inference_confidence: inference.inference_confidence,
      inference_evidence: inference.inference_evidence,
      inference_status: inference.inference_status,
      formula_confidence: 0.28,
      formula_evidence: [...inference.inference_evidence, "formula-missing"],
    };
  }

  if (question.accepted_formula_family_ids.includes(matched)) {
    return {
      formula_check_status: "pass",
      matched_formula_family_id: matched,
      inferred_formula_family_id: inference.inferred_formula_family_id,
      inference_confidence: inference.inference_confidence,
      inference_evidence: inference.inference_evidence,
      inference_status: inference.inference_status,
      formula_confidence: explicit ? 0.9 : Math.max(0.62, inference.inference_confidence),
      formula_evidence: [
        ...inference.inference_evidence,
        explicit ? "formula-explicit-pass" : "formula-inferred-pass",
      ],
    };
  }

  return {
    formula_check_status: "fail",
    matched_formula_family_id: matched,
    inferred_formula_family_id: inference.inferred_formula_family_id,
    inference_confidence: inference.inference_confidence,
    inference_evidence: inference.inference_evidence,
    inference_status: inference.inference_status,
    formula_confidence: explicit ? 0.9 : Math.max(0.58, inference.inference_confidence),
    formula_evidence: [...inference.inference_evidence, "formula-mismatch"],
  };
}

function parseRateValue(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return null;
  const numeric = Number(String(value).replace("%", ""));
  if (!Number.isFinite(numeric)) return null;
  return String(value).includes("%") ? numeric / 100 : numeric;
}

function runVariableCheck(
  question: PresentValueSampleQuestion,
  input: ActuarySecondVerifierInput,
  parser: ParserSkeletonOutput,
): VariableCheckOutput {
  const evidence: string[] = [];
  const schema = presentValueVariableSchemas[question.variable_schema_id];
  const bindings = input.variable_bindings ?? {};

  const resolvedRate =
    input.interest_rate ??
    parseRateValue(bindings.interest_rate) ??
    parseRateValue(parser.parsed_variable_hints.interest_rate);
  const resolvedPeriod =
    input.period_count ?? Number(bindings.period_count ?? parser.parsed_variable_hints.period_count ?? NaN);
  const resolvedPayment =
    input.payment_amount ?? Number(bindings.payment_amount ?? parser.parsed_variable_hints.payment_amount ?? NaN);
  const resolvedTiming =
    input.timing_convention ??
    (bindings.timing_convention as string | undefined) ??
    (parser.parsed_variable_hints.timing_convention as string | undefined) ??
    null;
  const resolvedAnnuityType =
    input.annuity_type ??
    (bindings.annuity_type as string | undefined) ??
    (parser.parsed_variable_hints.annuity_type as string | undefined) ??
    null;
  const resolvedCompounding =
    input.compounding_assumption ?? (bindings.compounding_assumption as string | undefined) ?? null;
  const resolvedPresentValueTarget =
    input.present_value_target ??
    (bindings.present_value_target as string | undefined) ??
    (parser.parsed_variable_hints.present_value_target as string | undefined) ??
    null;

  let failureClass: VariableCheckOutput["variable_failure_class"] = null;

  if (resolvedRate === null || !Number.isFinite(resolvedRate)) {
    evidence.push("rate-missing");
    failureClass = "variable_assumption_error";
  } else if (Math.abs(resolvedRate - question.interest_rate) > 0.0001) {
    evidence.push("rate-mismatch");
    failureClass = "variable_assumption_error";
  }

  if (!Number.isFinite(resolvedPeriod)) {
    evidence.push("period-missing");
    failureClass = failureClass ?? "variable_assumption_error";
  } else if (resolvedPeriod !== question.period_count) {
    evidence.push("period-mismatch");
    failureClass = failureClass ?? "variable_assumption_error";
  }

  if (!Number.isFinite(resolvedPayment)) {
    evidence.push("payment-missing");
    failureClass = failureClass ?? "variable_misuse";
  } else if (resolvedPayment !== question.payment_amount) {
    evidence.push("payment-mismatch");
    failureClass = failureClass ?? "variable_misuse";
  }

  if (resolvedCompounding && resolvedCompounding !== question.compounding_assumption) {
    evidence.push("compounding-mismatch");
    failureClass = failureClass ?? "variable_assumption_error";
  }
  if (resolvedAnnuityType && resolvedAnnuityType !== question.annuity_type) {
    evidence.push("annuity-type-mismatch");
    failureClass = failureClass ?? "variable_assumption_error";
  }
  if (question.annuity_type !== "single" && resolvedTiming && resolvedTiming !== question.timing_convention) {
    evidence.push("timing-mismatch");
    failureClass = failureClass ?? "variable_assumption_error";
  }
  if (resolvedPresentValueTarget && resolvedPresentValueTarget !== question.present_value_target) {
    evidence.push("present-value-target-mismatch");
    failureClass = failureClass ?? "variable_misuse";
  }

  if (!failureClass) {
    return {
      variable_check_status: "pass",
      variable_confidence: 0.84,
      variable_evidence: schema.requiredFields.map((field) => `checked:${field}`),
      variable_failure_class: null,
    };
  }

  return {
    variable_check_status: evidence.length >= 2 ? "fail" : "unknown",
    variable_confidence: evidence.length >= 2 ? 0.82 : 0.48,
    variable_evidence: evidence,
    variable_failure_class: failureClass,
  };
}

function runSymbolicFinalCheck(
  question: PresentValueSampleQuestion,
  input: ActuarySecondVerifierInput,
): SymbolicCheckOutput {
  const normalizedUserAnswer = normalizeAnswerNumber(input.raw_answer_text);
  const normalizedExpectedAnswer = question.expected_numeric_answer;
  if (normalizedUserAnswer === null) {
    return {
      symbolic_check_status: "unknown",
      symbolic_confidence: 0.25,
      normalized_user_answer: null,
      normalized_expected_answer: normalizedExpectedAnswer,
      symbolic_failure_class: null,
    };
  }

  const pass = compareNumbers(
    normalizedExpectedAnswer,
    normalizedUserAnswer,
    question.tolerance_abs,
    question.tolerance_rel,
  );

  return {
    symbolic_check_status: pass ? "pass" : "fail",
    symbolic_confidence: 0.93,
    normalized_user_answer: normalizedUserAnswer,
    normalized_expected_answer: normalizedExpectedAnswer,
    symbolic_failure_class: pass ? null : "arithmetic_slip",
  };
}

function runStepCheck(
  question: PresentValueSampleQuestion,
  input: ActuarySecondVerifierInput,
  parser: ParserSkeletonOutput,
): StepCheckOutput {
  if (question.step_check_mode === "none") {
    return {
      step_check_status: "unknown",
      step_check_confidence: 0.3,
      step_evidence: [],
      step_failure_class: null,
      interpretation_check_status: "unknown",
      interpretation_confidence: 0.3,
      interpretation_failure_class: null,
      conclusion_check_status: "unknown",
      conclusion_failure_class: null,
    };
  }

  if (question.step_check_mode === "final_only") {
    return {
      step_check_status: "unknown",
      step_check_confidence: 0.4,
      step_evidence: ["final-only-mode"],
      step_failure_class: null,
      interpretation_check_status: "unknown",
      interpretation_confidence: 0.3,
      interpretation_failure_class: null,
      conclusion_check_status: "unknown",
      conclusion_failure_class: null,
    };
  }

  const steps = (input.intermediate_steps ?? []).filter((step) => step.trim().length > 0);
  const normalizedSteps = steps.map((step) => normalizeText(step));
  const requiredStepCount = question.expected_key_steps.filter((step) => step.required).length;
  const matchedRequiredSteps = question.expected_key_steps.filter((step) =>
    step.expectedPatterns.some((pattern) =>
      normalizedSteps.some((candidate) => candidate.includes(pattern.toLowerCase())),
    ),
  );

  let stepStatus: VerifierStatus = "pass";
  let stepFailure: StepCheckOutput["step_failure_class"] = null;
  const stepEvidence = [`matched-required:${matchedRequiredSteps.length}`];

  if (steps.length === 0) {
    stepStatus = "fail";
    stepFailure = "verification_missing";
    stepEvidence.push("steps-missing");
  } else if (matchedRequiredSteps.length === 0) {
    stepStatus = "fail";
    stepFailure = "step_omission";
    stepEvidence.push("required-steps-missing");
  } else if (matchedRequiredSteps.length < requiredStepCount) {
    stepStatus = "unknown";
    stepFailure = "step_omission";
    stepEvidence.push("required-steps-partial");
  }

  const normalizedAnswer = normalizeText(input.raw_answer_text);
  const hasInterpretation =
    parser.parsed_interpretation_fragments.length > 0 ||
    /(present value of|means the current value|represents the current value|is the current value of)/.test(normalizedAnswer);
  const hasConclusionSignal =
    parser.parsed_conclusion_fragments.length > 0 ||
    /(therefore|thus|so the answer is|hence)/.test(normalizedAnswer);
  const hasStrongConclusion =
    /(therefore the present value is|thus the present value is|therefore the required present value is|therefore, the present value required)/.test(normalizedAnswer);

  let interpretationStatus: VerifierStatus = "unknown";
  let interpretationFailure: StepCheckOutput["interpretation_failure_class"] = null;
  if (question.interpretation_required) {
    interpretationStatus = hasInterpretation ? "pass" : "fail";
    interpretationFailure = hasInterpretation ? null : "result_interpretation_gap";
  }

  let conclusionStatus: VerifierStatus = "unknown";
  let conclusionFailure: StepCheckOutput["conclusion_failure_class"] = null;
  if (question.conclusion_required) {
    if (hasStrongConclusion) {
      conclusionStatus = "pass";
      conclusionFailure = null;
    } else if (hasConclusionSignal) {
      conclusionStatus = "unknown";
      conclusionFailure = "weak_conclusion";
    } else {
      conclusionStatus = "fail";
      conclusionFailure = "weak_conclusion";
    }

    if (hasInterpretation && !hasConclusionSignal) {
      interpretationFailure = "calculation_to_judgment_gap";
      conclusionFailure = null;
    }
  }

  return {
    step_check_status: stepStatus,
    step_check_confidence: stepStatus === "pass" ? 0.8 : stepStatus === "unknown" ? 0.56 : 0.84,
    step_evidence: stepEvidence,
    step_failure_class: stepFailure,
    interpretation_check_status: interpretationStatus,
    interpretation_confidence: interpretationStatus === "pass" ? 0.76 : interpretationStatus === "fail" ? 0.82 : 0.35,
    interpretation_failure_class: interpretationFailure,
    conclusion_check_status: conclusionStatus,
    conclusion_failure_class: conclusionFailure,
  };
}

const PRIMARY_FAILURE_PRIORITY: ActuarySecondFailureClass[] = [
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

function selectPrimaryFailureClass(
  failureClasses: ActuarySecondFailureClass[],
  symbolic: SymbolicCheckOutput,
  step: StepCheckOutput,
  parser: ParserSkeletonOutput,
  formula: FormulaCheckOutput,
  input: ActuarySecondVerifierInput,
) {
  const classes = [...failureClasses];

  if (classes.includes("parse_failure")) {
    return "parse_failure";
  }

  if (classes.includes("formula_selection_error") && classes.includes("arithmetic_slip")) {
    return "formula_selection_error";
  }
  if (classes.includes("variable_assumption_error") && classes.includes("variable_misuse")) {
    return "variable_assumption_error";
  }

  if (
    classes.includes("verification_missing") &&
    symbolic.symbolic_check_status === "pass" &&
    !(input.raw_work_text ?? "").trim() &&
    (input.intermediate_steps ?? []).filter((step) => step.trim().length > 0).length === 0
  ) {
    return "verification_missing";
  }

  if (
    classes.includes("weak_formula_evidence") &&
    !input.explicit_formula_family_id &&
    formula.formula_check_status === "unknown" &&
    formula.inference_status !== "pass" &&
    symbolic.symbolic_check_status === "pass"
  ) {
    return "weak_formula_evidence";
  }

  if (classes.includes("result_interpretation_gap")) return "result_interpretation_gap";
  if (classes.includes("calculation_to_judgment_gap")) return "calculation_to_judgment_gap";
  if (classes.includes("weak_conclusion") && !classes.includes("calculation_to_judgment_gap")) {
    return "weak_conclusion";
  }

  if (symbolic.symbolic_check_status === "pass" && step.interpretation_failure_class) {
    classes.unshift(step.interpretation_failure_class);
  }

  const filtered = classes.filter((candidate) => {
    if (
      (candidate === "verification_missing" || candidate === "step_omission" || candidate === "weak_formula_evidence") &&
      classes.some((other) =>
        [
          "formula_selection_error",
          "variable_assumption_error",
          "variable_misuse",
          "arithmetic_slip",
          "result_interpretation_gap",
          "calculation_to_judgment_gap",
          "weak_conclusion",
        ].includes(other),
      )
    ) {
      return false;
    }
    return true;
  });

  for (const candidate of PRIMARY_FAILURE_PRIORITY) {
    if (filtered.includes(candidate)) return candidate;
  }
  return null;
}

function selectPartialCreditSignal(
  primaryFailureClass: ActuarySecondFailureClass | null,
  formula: FormulaCheckOutput,
  symbolic: SymbolicCheckOutput,
  step: StepCheckOutput,
): PartialCreditSignal {
  if (primaryFailureClass === "variable_assumption_error" || primaryFailureClass === "variable_misuse") {
    return "assumption_wrong";
  }
  if (symbolic.symbolic_check_status === "pass" && step.step_failure_class === "verification_missing") {
    return "result_only";
  }
  if (formula.formula_check_status === "pass" && symbolic.symbolic_check_status === "fail") {
    return step.step_check_status === "pass" ? "key_steps_right_late_error" : "method_right_numeric_wrong";
  }
  if (symbolic.symbolic_check_status === "pass" && step.interpretation_failure_class === "result_interpretation_gap") {
    return "calculation_right_interpretation_weak";
  }
  if (symbolic.symbolic_check_status === "pass" && step.conclusion_failure_class === "weak_conclusion") {
    return "result_present_no_closure";
  }
  return null;
}

function buildCorrectionSeed(
  question: PresentValueSampleQuestion,
  primaryFailureClass: ActuarySecondFailureClass | null,
  partialCreditSignal: PartialCreditSignal,
  verifier: ActuarySecondVerifierOutput,
): PresentValueCorrectionSeed {
  if (primaryFailureClass === "verification_missing") {
    return {
      gap_title: "The answer needs one visible check line",
      gap_summary: "The final value is present, but there is no short verification trace before it.",
      correction_target: "Leave one verification line before the final answer.",
      guidance: [
        "Write the present-value formula once.",
        "Leave one key substitution line.",
        "Then place the final value underneath it.",
      ],
      starter: "First I leave one short verification line for the present-value setup:",
      minimum_length: 60,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: "Add verification line",
      action_urgency: "medium",
      correction_confidence: 0.78,
    };
  }

  if (primaryFailureClass === "weak_formula_evidence") {
    return {
      gap_title: "The formula trace is too weak",
      gap_summary: "The answer mentions present value, but the formula family is not visible enough to trust the method.",
      correction_target: "Write one short verification line that states the formula family before the calculation.",
      guidance: [
        "Name the family first: single, ordinary, due, deferred, or factor form.",
        "Write one formula line before any number.",
        "Keep the method trace visible even if the final number is correct.",
      ],
      starter: "I first state the present-value family and formula as",
      minimum_length: 70,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: "Show formula family",
      action_urgency: "medium",
      correction_confidence: 0.76,
    };
  }

  if (primaryFailureClass === "parse_failure") {
    return {
      gap_title: "The answer structure is too thin to verify",
      gap_summary: "There is not enough formula or sentence structure to tell what method was used.",
      correction_target: "Rewrite the answer with one method line and one closing line.",
      guidance: [
        "Add one method line first.",
        "Add one final answer line after it.",
        "Keep the structure simple and explicit.",
      ],
      starter: "I restate the method first, then I give the final answer:",
      minimum_length: 70,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: "Rebuild answer structure",
      action_urgency: "medium",
      correction_confidence: 0.72,
    };
  }

  if (primaryFailureClass === "arithmetic_slip") {
    return {
      gap_title: "Late numeric step needs cleanup",
      gap_summary: "The formula choice is usable, but the final substitution or arithmetic step drifted.",
      correction_target: "Keep the same formula and rewrite only the final numeric step.",
      guidance: [
        "Keep the present-value formula fixed.",
        "Rewrite the substituted rate and period once.",
        "Recheck only the last arithmetic line.",
      ],
      starter: "I will keep the same present-value formula and rewrite only the final substitution and arithmetic step:",
      minimum_length: 90,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: "Late numeric step",
      action_urgency: "medium",
      correction_confidence: 0.84,
    };
  }

  if (primaryFailureClass === "result_interpretation_gap") {
    return {
      gap_title: "The number needs an interpretation sentence",
      gap_summary: "You reached a usable value, but the answer does not say what that value represents.",
      correction_target: "Add one sentence that states what present value the number represents.",
      guidance: [
        "Name the cash-flow target explicitly.",
        "Repeat the quantity the question asked for.",
        "Turn the numeric result into one interpretation sentence.",
      ],
      starter: "This value is the present value of",
      minimum_length: 80,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: "Interpret result",
      action_urgency: "high",
      correction_confidence: 0.82,
    };
  }

  if (primaryFailureClass === "calculation_to_judgment_gap" || primaryFailureClass === "weak_conclusion") {
    const isWeakConclusion = primaryFailureClass === "weak_conclusion";
    return {
      gap_title: isWeakConclusion ? "The closing sentence is too thin" : "The answer stops before a final judgment",
      gap_summary: isWeakConclusion
        ? "A final line exists, but it does not close the answer with enough force."
        : "The calculation is there, but the answer does not close the question with a final judgment sentence.",
      correction_target: isWeakConclusion
        ? "Rewrite the last sentence so it directly states the required present value."
        : "Add one final judgment sentence that answers the question directly.",
      guidance: [
        "Start from the exact quantity the question asked for.",
        "State the final present value in one sentence.",
        "Use the last line to close the answer, not to reopen the calculation.",
      ],
      starter: "Therefore, the present value required in the question is",
      minimum_length: 70,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: isWeakConclusion ? "Strengthen conclusion" : "Close the answer",
      action_urgency: "high",
      correction_confidence: isWeakConclusion ? 0.74 : 0.82,
    };
  }

  if (primaryFailureClass === "formula_selection_error") {
    return {
      gap_title: "The present-value family needs to be fixed first",
      gap_summary: "The answer is using the wrong present-value family for the cash-flow shape.",
      correction_target: "Decide first whether this is single, ordinary, due, deferred, or factor form.",
      guidance: [
        "Separate the payment timing first.",
        "Pick one present-value family before calculating.",
        "Write the chosen family in one line before substitution.",
      ],
      starter: "First, I classify this cash-flow pattern as",
      minimum_length: 90,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: "Fix formula family",
      action_urgency: "high",
      correction_confidence: 0.86,
    };
  }

  if (primaryFailureClass === "variable_assumption_error" || primaryFailureClass === "variable_misuse") {
    const isAssumption = primaryFailureClass === "variable_assumption_error";
    return {
      gap_title: isAssumption ? "The assumptions are drifting" : "One working variable is inconsistent",
      gap_summary: isAssumption
        ? "Rate, period, timing, or annuity type is not fixed consistently before calculation."
        : "The payment amount or target quantity is being carried inconsistently through the work.",
      correction_target: isAssumption
        ? "Lock rate, period, timing, annuity type, and target before calculating."
        : "Rewrite the variable list so payment amount and target stay consistent.",
      guidance: [
        "Write rate and period first.",
        "State the timing convention explicitly.",
        "Keep the payment amount and target unchanged across the steps.",
      ],
      starter: "Before calculating, I fix the assumptions as follows:",
      minimum_length: 90,
      evidence_references: verifier.evidence.slice(0, 3),
      focus_label: isAssumption ? "Fix assumptions" : "Fix variable use",
      action_urgency: "high",
      correction_confidence: isAssumption ? 0.88 : 0.8,
    };
  }

  return {
    gap_title: "The work trace needs one clearer pass",
    gap_summary: "The current answer is usable, but the checking trace is still too thin to trust comfortably.",
    correction_target: partialCreditSignal === "result_only"
      ? "Leave one short verification line before the final answer."
      : "Separate the method line and the final line.",
    guidance: [
      "Write the formula line first.",
      "Keep the working line and the final line separate.",
      "Use the last sentence to answer the prompt directly.",
    ],
    starter: "First I restate the present-value method, then I rewrite the check line clearly:",
    minimum_length: 80,
    evidence_references: verifier.evidence.slice(0, 3),
    focus_label: "Rebuild the flow",
    action_urgency: "medium",
    correction_confidence: 0.68,
  };
}

function buildReviewPriority(
  primaryFailureClass: ActuarySecondFailureClass | null,
  elapsedSeconds: number,
  expectedTime: number,
) {
  const timeOveruse = elapsedSeconds > expectedTime * 1.25;
  let score = 0;
  if (primaryFailureClass === "formula_selection_error") score += 4;
  if (primaryFailureClass === "variable_assumption_error" || primaryFailureClass === "variable_misuse") score += 4;
  if (primaryFailureClass === "arithmetic_slip") score += 3;
  if (primaryFailureClass === "result_interpretation_gap") score += 3;
  if (primaryFailureClass === "calculation_to_judgment_gap" || primaryFailureClass === "weak_conclusion") score += 3;
  if (primaryFailureClass === "verification_missing" || primaryFailureClass === "step_omission") score += 2;
  if (primaryFailureClass === "weak_formula_evidence") score += 1;
  if (timeOveruse) score += 1;
  const priority = score >= 7 ? "high" : score >= 3 ? "medium" : "low";
  return { score, priority: priority as "high" | "medium" | "low", timeOveruse };
}

function buildNextAction(
  primaryFailureClass: ActuarySecondFailureClass | null,
  reviewPriority: "high" | "medium" | "low",
): ActuarySecondNextAction {
  if (primaryFailureClass === "arithmetic_slip") {
    return {
      next_action_type: "slow_retry",
      next_action_label: "Retry the same method slowly",
      next_action_reason: "The method is usable. Rewrite only the last numeric step more carefully.",
      action_confidence: 0.82,
    };
  }

  if (
    primaryFailureClass === "result_interpretation_gap" ||
    primaryFailureClass === "calculation_to_judgment_gap" ||
    primaryFailureClass === "weak_conclusion"
  ) {
    return {
      next_action_type: "rewrite_now",
      next_action_label: "Rewrite the answer into one clear closing sentence",
      next_action_reason: "The number is there. The next step is to turn it into a short judgment sentence.",
      action_confidence: 0.88,
    };
  }

  if (
    primaryFailureClass === "verification_missing" ||
    primaryFailureClass === "step_omission" ||
    primaryFailureClass === "weak_formula_evidence" ||
    primaryFailureClass === "parse_failure"
  ) {
    return {
      next_action_type: "review_now",
      next_action_label: "Rewrite the method line before recalculating",
      next_action_reason: "Leave one short formula line and one key step before the final answer.",
      action_confidence: 0.8,
    };
  }

  if (primaryFailureClass === "time_pressure") {
    return {
      next_action_type: "slow_retry",
      next_action_label: "Retry the same family with a slower setup",
      next_action_reason: "Fix the setup order first, then recalculate without rushing.",
      action_confidence: 0.74,
    };
  }

  if (reviewPriority !== "low") {
    return {
      next_action_type: "review_now",
      next_action_label: "Review the setup before solving again",
      next_action_reason: "The first thing to fix is the setup: family, assumptions, and the first key step.",
      action_confidence: 0.86,
    };
  }

  return {
    next_action_type: "move_on",
    next_action_label: "Move on and watch for the same pattern once more",
    next_action_reason: "No single correction target is dominating enough to stop the loop here.",
    action_confidence: 0.6,
  };
}

function buildCoachingSeed(primaryFailureClass: ActuarySecondFailureClass | null): ActuarySecondCoachingSeed {
  const theme =
    primaryFailureClass === "formula_selection_error"
      ? "Fix the present-value family first"
      : primaryFailureClass === "variable_assumption_error"
        ? "Fix timing and annuity assumptions"
        : primaryFailureClass === "variable_misuse"
          ? "Keep payment and target variables stable"
          : primaryFailureClass === "result_interpretation_gap"
            ? "Turn the number into meaning"
            : primaryFailureClass === "calculation_to_judgment_gap" || primaryFailureClass === "weak_conclusion"
              ? "Close the answer in one sentence"
              : "Rebuild the present-value setup";

  return {
    coachingTheme: theme,
    coachingRootCauseTags: primaryFailureClass ? [primaryFailureClass] : [],
    coachingSummary: `${theme}. Keep the setup short, stable, and explicit before you calculate.`,
    coachingConfidence: 0.72,
  };
}

export function evaluatePresentValueAnswer(
  userId: string,
  input: ActuarySecondVerifierInput,
): ActuarySecondEvaluationResult {
  const question = getPresentValueSampleQuestion(input.question_id);
  const parser = parsePresentValueAnswer(question, input);
  const formula = runFormulaFamilyCheck(question, input);
  const variable = runVariableCheck(question, input, parser);
  const symbolic = runSymbolicFinalCheck(question, input);
  const step = runStepCheck(question, input, parser);

  const failureClasses = Array.from(
    new Set([
      ...(parser.parse_status === "fail" ? (["parse_failure"] as ActuarySecondFailureClass[]) : []),
      ...(formula.formula_check_status === "fail" ? (["formula_selection_error"] as ActuarySecondFailureClass[]) : []),
      ...(formula.inference_status !== "pass" && !input.explicit_formula_family_id
        ? (["weak_formula_evidence"] as ActuarySecondFailureClass[])
        : []),
      ...(variable.variable_failure_class ? ([variable.variable_failure_class] as ActuarySecondFailureClass[]) : []),
      ...(symbolic.symbolic_failure_class ? ([symbolic.symbolic_failure_class] as ActuarySecondFailureClass[]) : []),
      ...(step.step_failure_class ? ([step.step_failure_class] as ActuarySecondFailureClass[]) : []),
      ...(step.interpretation_failure_class ? ([step.interpretation_failure_class] as ActuarySecondFailureClass[]) : []),
      ...(step.conclusion_failure_class ? ([step.conclusion_failure_class] as ActuarySecondFailureClass[]) : []),
      ...(input.elapsed_seconds > question.expected_time_seconds * 1.25
        ? (["time_pressure"] as ActuarySecondFailureClass[])
        : []),
    ]),
  );

  const primaryFailureClass = selectPrimaryFailureClass(
    failureClasses,
    symbolic,
    step,
    parser,
    formula,
    input,
  );
  const partialCreditSignal = selectPartialCreditSignal(primaryFailureClass, formula, symbolic, step);

  const verifier: ActuarySecondVerifierOutput = {
    parse_status: parser.parse_status,
    formula_check_status: formula.formula_check_status,
    symbolic_check_status: symbolic.symbolic_check_status,
    step_check_status: step.step_check_status,
    variable_check_status: variable.variable_check_status,
    interpretation_check_status: step.interpretation_check_status,
    verifier_status:
      parser.parse_status === "fail" ||
      formula.formula_check_status === "fail" ||
      variable.variable_check_status === "fail" ||
      symbolic.symbolic_check_status === "fail" ||
      step.step_check_status === "fail" ||
      step.interpretation_check_status === "fail" ||
      step.conclusion_check_status === "fail"
        ? "fail"
        : formula.formula_check_status === "pass" || symbolic.symbolic_check_status === "pass"
          ? "pass"
          : "unknown",
    confidence: Number(
      (
        (parser.parse_confidence +
          formula.formula_confidence +
          variable.variable_confidence +
          symbolic.symbolic_confidence +
          step.step_check_confidence +
          step.interpretation_confidence) /
        6
      ).toFixed(2),
    ),
    evidence: [...formula.formula_evidence, ...variable.variable_evidence, ...step.step_evidence],
    normalized_user_answer: symbolic.normalized_user_answer,
    normalized_expected_answer: symbolic.normalized_expected_answer,
    failure_class: primaryFailureClass,
    failure_classes: primaryFailureClass ? Array.from(new Set([primaryFailureClass, ...failureClasses])) : failureClasses,
    partial_credit_signal: partialCreditSignal,
    selected_primary_gap: primaryFailureClass,
    correction_target_candidate: primaryFailureClass,
    parser,
    formula,
    variable,
    symbolic,
    step,
  };

  const correctionSeed = buildCorrectionSeed(question, primaryFailureClass, partialCreditSignal, verifier);
  const review = buildReviewPriority(primaryFailureClass, input.elapsed_seconds, question.expected_time_seconds);
  const reviewQueueCandidate: ActuarySecondReviewQueueCandidate | null = primaryFailureClass
    ? {
        id: createId(`actuary_second_review_${question.question_id}`),
        userId,
        questionId: question.question_id,
        subjectId: input.subject_id,
        reviewPriority: review.priority,
        reviewPriorityScore: review.score,
        reviewReasonCodes: verifier.failure_classes,
        reviewReasonSentence: correctionSeed.gap_summary,
        recommendedReviewAction: correctionSeed.correction_target,
        rootCauseTags: verifier.failure_classes,
        createdAt: new Date().toISOString(),
      }
    : null;

  const nextAction = buildNextAction(primaryFailureClass, review.priority);
  const coachingSeed = buildCoachingSeed(primaryFailureClass);

  return {
    question,
    verifier,
    primary_failure_class: primaryFailureClass,
    failure_classes: verifier.failure_classes,
    partial_credit_signal: partialCreditSignal,
    correction_seed: correctionSeed,
    review_queue_candidate: reviewQueueCandidate,
    next_action: nextAction,
    coaching_seed: coachingSeed,
    records_summary: {
      title: correctionSeed.focus_label,
      summary: correctionSeed.gap_summary,
      correctionTarget: correctionSeed.correction_target,
    },
  };
}
