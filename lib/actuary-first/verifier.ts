import { getProbabilityStepRulePack } from "@/lib/actuary-first/step-rule-packs";
import { probabilityVariableSchemas } from "@/lib/actuary-first/variable-schemas";
import type {
  FailureClass,
  FormulaFamilyId,
  FormulaInferenceOutput,
  FormulaVerificationInput,
  IntermediateStepVerificationInput,
  ProbabilityVerifierOutput,
  SymbolicVerificationInput,
  VariableCheckInput,
  VerifierEvidence,
  VerifierStatus,
} from "@/lib/actuary-first/types";

function normalizeNumeric(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    const [left, right] = trimmed.split("/").map((part) => Number(part.trim()));
    if (Number.isFinite(left) && Number.isFinite(right) && right !== 0) {
      return left / right;
    }
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function compareNumbers(expected: number, actual: number, toleranceAbs: number, toleranceRel: number) {
  const diff = Math.abs(expected - actual);
  return diff <= Math.max(toleranceAbs, Math.abs(expected) * toleranceRel);
}

const FORMULA_INFERENCE_RULES: {
  family: FormulaFamilyId;
  mode: "pass" | "weak";
  patterns: RegExp[];
}[] = [
  {
    family: "conditional_probability_basic",
    mode: "pass",
    patterns: [/p\s*\(\s*a\s*∩\s*b\s*\)\s*\/\s*p\s*\(\s*(a|b)\s*\)/i, /0\.18\s*\/\s*0\.3/i],
  },
  {
    family: "bayes_rule_basic",
    mode: "pass",
    patterns: [/p\s*\(\s*b\s*\|\s*a\s*\)\s*\*\s*p\s*\(\s*a\s*\)\s*\/\s*p\s*\(\s*b\s*\)/i, /posterior/i],
  },
  {
    family: "expectation_discrete_basic",
    mode: "pass",
    patterns: [/e\s*\[\s*x\s*\]\s*=/i, /sum\s+of\s+x\s*p\s*\(\s*x\s*\)/i, /0\s*\*\s*0\.2/i, /1\s*\*\s*0\.5/i],
  },
  {
    family: "variance_discrete_basic",
    mode: "pass",
    patterns: [/var\s*\(\s*x\s*\)\s*=\s*e\s*\[\s*x\^?2\s*\]\s*-\s*\(\s*e\s*\[\s*x\s*\]\s*\)\^?2/i, /\(\s*x\s*-\s*μ\s*\)\^?2/i],
  },
  {
    family: "permutation_combination_probability",
    mode: "pass",
    patterns: [/\d+\s*c\s*\d+/i, /\d+!/, /comb/i],
  },
  {
    family: "binomial_basic",
    mode: "pass",
    patterns: [/\d+\s*c\s*\d+\s*.*p\^k/i, /\(1-p\)\^\(n-k\)/i],
  },
  {
    family: "poisson_basic",
    mode: "pass",
    patterns: [/e\^-\s*λ/i, /e\^-?\d+/, /λ\^k/i],
  },
  {
    family: "basic_probability_ratio",
    mode: "weak",
    patterns: [/favorable\s*\/\s*total/i, /\d+\s*\/\s*\d+/i],
  },
];

export function inferFormulaFamilyFromWorkText(userWorkText: string | null | undefined): FormulaInferenceOutput {
  const text = userWorkText?.trim();
  if (!text) {
    return {
      inferred_formula_family_id: null,
      inference_confidence: 0.12,
      inference_evidence: [{ code: "work_text_missing", message: "No work text to infer formula from." }],
      inference_status: "unknown",
    };
  }

  for (const rule of FORMULA_INFERENCE_RULES) {
    const matched = rule.patterns.filter((pattern) => pattern.test(text));
    if (matched.length > 0) {
      return {
        inferred_formula_family_id: rule.family,
        inference_confidence: rule.mode === "pass" ? 0.82 : 0.48,
        inference_evidence: [
          {
            code: rule.mode === "pass" ? "formula_pattern_match" : "formula_pattern_weak_match",
            message: `Matched ${matched.length} formula patterns in work text.`,
            value: rule.family,
          },
        ],
        inference_status: rule.mode,
      };
    }
  }

  return {
    inferred_formula_family_id: null,
    inference_confidence: 0.18,
    inference_evidence: [{ code: "formula_pattern_not_found", message: "No reliable formula pattern found in work text." }],
    inference_status: "unknown",
  };
}

export function runFormulaVerifier(input: FormulaVerificationInput & { inferredFormulaFamilyId?: FormulaFamilyId | null; inferenceStatus?: "pass" | "weak" | "unknown" }) {
  const evidence: VerifierEvidence[] = [];
  if (!input.requiresFormulaSelectionCheck) {
    return { status: "unknown" as VerifierStatus, confidence: 0.4, evidence };
  }
  const effectiveFormulaFamilyId = input.userFormulaFamilyId ?? input.inferredFormulaFamilyId ?? null;
  if (!effectiveFormulaFamilyId) {
    evidence.push({ code: "formula_missing", message: "No formula family selected or inferred." });
    return { status: "unknown" as VerifierStatus, confidence: 0.22, evidence };
  }
  if (input.acceptedFormulaFamilyIds.includes(effectiveFormulaFamilyId)) {
    evidence.push({
      code: input.userFormulaFamilyId ? "formula_match_explicit" : "formula_match_inferred",
      message: input.userFormulaFamilyId ? "Accepted formula family selected." : "Accepted formula family inferred from work text.",
      value: effectiveFormulaFamilyId,
    });
    return {
      status: "pass" as VerifierStatus,
      confidence: input.userFormulaFamilyId ? 0.92 : input.inferenceStatus === "pass" ? 0.74 : 0.52,
      evidence,
    };
  }
  evidence.push({
    code: "formula_mismatch",
    message: "Selected formula family is not in accepted family ids.",
    value: effectiveFormulaFamilyId,
  });
  return { status: "fail" as VerifierStatus, confidence: input.userFormulaFamilyId ? 0.9 : 0.66, evidence };
}

export function runVariableCheck(input: VariableCheckInput) {
  const evidence: VerifierEvidence[] = [];
  if (!input.requiresVariableBinding) {
    return { status: "unknown" as VerifierStatus, confidence: 0.4, evidence };
  }
  const schema = probabilityVariableSchemas[input.variableSchemaId];
  if (!schema) {
    evidence.push({ code: "variable_schema_missing", message: "Variable schema not found." });
    return { status: "unknown" as VerifierStatus, confidence: 0.2, evidence };
  }

  const bindings = input.userVariableBindings ?? {};
  switch (input.variableSchemaId) {
    case "conditional_probability_direction_v1": {
      const conditioningEvent = bindings.conditioningEvent;
      if (!conditioningEvent) {
        evidence.push({ code: "conditional_binding_missing", message: "Conditioning event not selected." });
        return { status: "unknown" as VerifierStatus, confidence: 0.3, evidence };
      }
      if (conditioningEvent === "A" || conditioningEvent === "B") {
        evidence.push({ code: "conditional_binding_selected", message: "Conditioning event selected.", value: conditioningEvent });
        return { status: "pass" as VerifierStatus, confidence: 0.85, evidence };
      }
      evidence.push({ code: "conditional_binding_invalid", message: "Unexpected conditioning event.", value: conditioningEvent });
      return { status: "fail" as VerifierStatus, confidence: 0.8, evidence };
    }
    case "bayes_binary_event_v1": {
      const posterior = bindings.posterior;
      const likelihood = bindings.likelihood;
      if (!posterior || !likelihood) {
        evidence.push({ code: "bayes_binding_missing", message: "Bayes role selection missing." });
        return { status: "unknown" as VerifierStatus, confidence: 0.3, evidence };
      }
      if (posterior === "P(A|B)" && likelihood === "P(B|A)") {
        evidence.push({ code: "bayes_binding_match", message: "Posterior and likelihood direction matched." });
        return { status: "pass" as VerifierStatus, confidence: 0.9, evidence };
      }
      evidence.push({ code: "bayes_direction_mismatch", message: "Posterior and likelihood direction swapped." });
      return { status: "fail" as VerifierStatus, confidence: 0.92, evidence };
    }
    case "combinatorics_count_v1": {
      const nRole = bindings.nRole;
      const rRole = bindings.rRole;
      if (!nRole || !rRole) {
        evidence.push({ code: "combinatorics_binding_missing", message: "n/r role missing." });
        return { status: "unknown" as VerifierStatus, confidence: 0.3, evidence };
      }
      if (nRole === "total" && rRole === "selected") {
        evidence.push({ code: "combinatorics_binding_match", message: "n and r roles matched." });
        return { status: "pass" as VerifierStatus, confidence: 0.86, evidence };
      }
      evidence.push({ code: "combinatorics_binding_mismatch", message: "n and r roles swapped." });
      return { status: "fail" as VerifierStatus, confidence: 0.88, evidence };
    }
    case "binomial_parameters_v1": {
      const nRole = bindings.nRole;
      const kRole = bindings.kRole;
      if (!nRole || !kRole) {
        evidence.push({ code: "binomial_binding_missing", message: "n/k role missing." });
        return { status: "unknown" as VerifierStatus, confidence: 0.3, evidence };
      }
      if (nRole === "trial_count" && kRole === "success_count") {
        evidence.push({ code: "binomial_binding_match", message: "n and k roles matched." });
        return { status: "pass" as VerifierStatus, confidence: 0.86, evidence };
      }
      evidence.push({ code: "binomial_binding_mismatch", message: "n and k roles swapped." });
      return { status: "fail" as VerifierStatus, confidence: 0.88, evidence };
    }
    case "poisson_parameters_v1": {
      const lambdaRole = bindings.lambdaRole;
      if (!lambdaRole) {
        evidence.push({ code: "poisson_binding_missing", message: "Lambda role missing." });
        return { status: "unknown" as VerifierStatus, confidence: 0.3, evidence };
      }
      if (lambdaRole === "rate") {
        evidence.push({ code: "poisson_binding_match", message: "Lambda role matched." });
        return { status: "pass" as VerifierStatus, confidence: 0.86, evidence };
      }
      evidence.push({ code: "poisson_binding_mismatch", message: "Lambda interpreted as count." });
      return { status: "fail" as VerifierStatus, confidence: 0.88, evidence };
    }
    default:
      return { status: "pass" as VerifierStatus, confidence: 0.75, evidence };
  }
}

export function runSymbolicVerifier(input: SymbolicVerificationInput) {
  const evidence: VerifierEvidence[] = [];
  const normalizedCorrectAnswer =
    typeof input.correctAnswerValue === "string" && input.correctAnswerValue.trim() !== ""
      ? input.correctAnswerValue.trim()
      : String(input.correctAnswerValue);
  let normalizedUserAnswer: string | null = null;

  if (input.userAnswerValue !== null && input.userAnswerValue !== undefined && input.userAnswerValue !== "") {
    normalizedUserAnswer = typeof input.userAnswerValue === "string" ? input.userAnswerValue.trim() : String(input.userAnswerValue);
  } else if (input.selectedChoiceValue !== null && input.selectedChoiceValue !== undefined) {
    normalizedUserAnswer = typeof input.selectedChoiceValue === "string" ? input.selectedChoiceValue.trim() : String(input.selectedChoiceValue);
  }

  if (input.selectedChoiceId === null && normalizedUserAnswer === null) {
    evidence.push({ code: "answer_missing", message: "No answer to verify." });
    return {
      status: "unknown" as VerifierStatus,
      confidence: 0.2,
      evidence,
      normalizedUserAnswer,
      normalizedCorrectAnswer,
    };
  }

  if (input.answerFormat === "choice_only") {
    const pass = input.selectedChoiceId === input.correctChoiceId;
    evidence.push({
      code: pass ? "choice_match" : "choice_mismatch",
      message: pass ? "Correct choice selected." : "Wrong choice selected.",
    });
    return {
      status: pass ? ("pass" as VerifierStatus) : ("fail" as VerifierStatus),
      confidence: 0.99,
      evidence,
      normalizedUserAnswer,
      normalizedCorrectAnswer,
    };
  }

  const expected = normalizeNumeric(input.correctAnswerValue);
  const actual = normalizeNumeric(normalizedUserAnswer);
  if (expected === null || actual === null) {
    evidence.push({ code: "answer_parse_failed", message: "Could not normalize expected or user answer." });
    return {
      status: "unknown" as VerifierStatus,
      confidence: 0.25,
      evidence,
      normalizedUserAnswer,
      normalizedCorrectAnswer,
    };
  }

  const pass = compareNumbers(expected, actual, input.toleranceAbs, input.toleranceRel);
  evidence.push({
    code: pass ? "numeric_match" : "numeric_mismatch",
    message: pass ? "Numeric check passed." : "Numeric check failed.",
    value: actual,
  });
  return {
    status: pass ? ("pass" as VerifierStatus) : ("fail" as VerifierStatus),
    confidence: 0.95,
    evidence,
    normalizedUserAnswer,
    normalizedCorrectAnswer,
  };
}

export function runIntermediateStepVerifier(input: IntermediateStepVerificationInput) {
  const evidence: VerifierEvidence[] = [];
  if (!input.supportsIntermediateSteps || input.stepCheckMode === "none") {
    return {
      intermediate_step_status: "unknown" as VerifierStatus,
      intermediate_step_confidence: 0.35,
      intermediate_step_evidence: evidence,
      intermediate_failure_class: null,
    };
  }
  if (input.stepCheckMode === "final_only") {
    evidence.push({ code: "final_only_mode", message: "Intermediate steps not required for this question." });
    return {
      intermediate_step_status: "unknown" as VerifierStatus,
      intermediate_step_confidence: 0.4,
      intermediate_step_evidence: evidence,
      intermediate_failure_class: null,
    };
  }

  const steps = input.intermediateSteps.filter((step) => step.trim().length > 0);
  const rulePack = getProbabilityStepRulePack(input.problemFamily);
  if (steps.length === 0) {
    evidence.push({ code: "steps_missing", message: "Key-step question has no intermediate steps." });
    return {
      intermediate_step_status: "fail" as VerifierStatus,
      intermediate_step_confidence: 0.84,
      intermediate_step_evidence: evidence,
      intermediate_failure_class:
        rulePack?.required ? rulePack.missing_failure_class : ("verification_missing" as const),
    };
  }

  const promptPatternGroups = [
    ...(rulePack?.expected_key_step_patterns ?? []),
    ...((input.keyStepPrompts ?? []).map((prompt) => prompt.expectedPatterns)),
  ];
  if (promptPatternGroups.length === 0) {
    evidence.push({ code: "step_rule_missing", message: "Key-step mode enabled without family rule pack or prompts." });
    return {
      intermediate_step_status: "unknown" as VerifierStatus,
      intermediate_step_confidence: 0.3,
      intermediate_step_evidence: evidence,
      intermediate_failure_class: null,
    };
  }

  const normalizedSteps = steps.map((step) => step.toLowerCase());
  const matchedPromptCount = promptPatternGroups.filter((patternGroup) =>
    patternGroup.every((pattern) =>
      normalizedSteps.some((step) => step.includes(pattern.toLowerCase())),
    ),
  ).length;
  const totalPromptCount = promptPatternGroups.length;

  evidence.push({
    code: "key_step_match_count",
    message: "Matched key-step rule patterns.",
    value: matchedPromptCount,
  });
  if (rulePack) {
    evidence.push({
      code: "problem_family_rule_pack",
      message: "Applied problem-family step rule pack.",
      value: rulePack.problem_family,
    });
  }

  if (matchedPromptCount === 0) {
    return {
      intermediate_step_status: "fail" as VerifierStatus,
      intermediate_step_confidence:
        rulePack?.strictness === "strict" ? 0.82 : rulePack?.strictness === "moderate" ? 0.74 : 0.66,
      intermediate_step_evidence: evidence,
      intermediate_failure_class:
        rulePack?.partial_match_failure_class ?? ("step_omission" as const),
    };
  }

  if (matchedPromptCount < totalPromptCount) {
    return {
      intermediate_step_status: "unknown" as VerifierStatus,
      intermediate_step_confidence:
        rulePack?.strictness === "strict" ? 0.62 : rulePack?.strictness === "moderate" ? 0.58 : 0.52,
      intermediate_step_evidence: evidence,
      intermediate_failure_class:
        rulePack?.partial_match_failure_class ?? ("step_omission" as const),
    };
  }

  return {
    intermediate_step_status: "pass" as VerifierStatus,
    intermediate_step_confidence: 0.82,
    intermediate_step_evidence: evidence,
    intermediate_failure_class: null,
  };
}

export function mergeVerifierOutputs(params: {
  formula: ReturnType<typeof runFormulaVerifier>;
  variable: ReturnType<typeof runVariableCheck>;
  symbolic: ReturnType<typeof runSymbolicVerifier>;
  inference: FormulaInferenceOutput;
  intermediate: ReturnType<typeof runIntermediateStepVerifier>;
  explicitFormulaSelected: boolean;
  stepCheckMode: "none" | "key_steps" | "final_only";
}): ProbabilityVerifierOutput {
  const failureClasses: FailureClass[] = [];
  let failureClass: FailureClass | null = null;

  if (params.formula.status === "fail") {
    failureClasses.push("formula_selection_error");
    failureClass = "formula_selection_error";
  }
  if (params.variable.status === "fail") {
    failureClasses.push("variable_misuse");
    failureClass = failureClass ?? "variable_misuse";
  }
  if (params.symbolic.status === "fail") {
    if (params.formula.status === "pass" && params.variable.status !== "fail") {
      failureClasses.push("arithmetic_slip");
      failureClass = failureClass ?? "arithmetic_slip";
    } else {
      failureClasses.push("final_answer_mismatch");
      failureClass = failureClass ?? "final_answer_mismatch";
    }
  }
  if (
    params.formula.status === "unknown" &&
    params.variable.status === "unknown" &&
    params.symbolic.status === "unknown" &&
    params.intermediate.intermediate_step_status === "unknown"
  ) {
    failureClasses.push("parse_failure");
    failureClass = failureClass ?? "parse_failure";
  }
  if (!params.explicitFormulaSelected && params.inference.inference_status === "unknown") {
    failureClasses.push("weak_formula_evidence");
    failureClass = failureClass ?? "weak_formula_evidence";
  }
  if (params.intermediate.intermediate_failure_class) {
    failureClasses.push(params.intermediate.intermediate_failure_class);
    failureClass = failureClass ?? params.intermediate.intermediate_failure_class;
  }

  const verifierStatus: VerifierStatus =
    params.formula.status === "fail" ||
    params.variable.status === "fail" ||
    params.symbolic.status === "fail" ||
    params.intermediate.intermediate_step_status === "fail"
      ? "fail"
      : params.formula.status === "pass" ||
          params.variable.status === "pass" ||
          params.symbolic.status === "pass" ||
          params.intermediate.intermediate_step_status === "pass"
        ? "pass"
        : "unknown";

  const confidence = Number(
    ((params.formula.confidence + params.variable.confidence + params.symbolic.confidence + params.intermediate.intermediate_step_confidence) / 4).toFixed(2),
  );

  return {
    verifier_status: verifierStatus,
    formula_check_status: params.formula.status,
    symbolic_check_status: params.symbolic.status,
    variable_check_status: params.variable.status,
    intermediate_step_status: params.intermediate.intermediate_step_status,
    failure_class: failureClass,
    failure_classes: Array.from(new Set(failureClasses)),
    confidence,
    evidence: [
      ...params.inference.inference_evidence,
      ...params.formula.evidence,
      ...params.variable.evidence,
      ...params.intermediate.intermediate_step_evidence,
      ...params.symbolic.evidence,
    ],
    normalized_user_answer: params.symbolic.normalizedUserAnswer,
    normalized_correct_answer: params.symbolic.normalizedCorrectAnswer,
    inferred_formula_family_id: params.inference.inferred_formula_family_id,
    inference_confidence: params.inference.inference_confidence,
    inference_evidence: params.inference.inference_evidence,
    inference_status: params.inference.inference_status,
    intermediate_step_confidence: params.intermediate.intermediate_step_confidence,
    intermediate_step_evidence: params.intermediate.intermediate_step_evidence,
    intermediate_failure_class: params.intermediate.intermediate_failure_class,
    verifier_path_used:
      params.stepCheckMode === "key_steps"
        ? "key_steps"
        : params.explicitFormulaSelected
          ? "explicit_formula"
          : params.inference.inferred_formula_family_id
            ? "inferred_formula"
            : "final_only",
  };
}
