import type { DeductionCode, RubricCategory } from "./types";

export const SECOND_GRADING_RUBRIC_BY_TYPE = {
  theory: { issue: 25, structure: 20, standard: 25, application: 20, conclusion: 10 },
  law: { issue: 25, structure: 15, legalRule: 25, application: 25, conclusion: 10 },
  practice: { issue: 15, structure: 10, standard: 15, application: 50, conclusion: 10 },
} as const;

export const SECOND_GRADING_DEDUCTIONS: Record<DeductionCode, number> = {
  issue_error: -30,
  weak_application_subsumption: -25,
  calculation_formula_error: -20,
  insufficient_legal_rule_case_statute: -15,
  weak_logic_toc_structure: -10,
};

export const ISSUE_SPOTTING_FAILURE_ROOT_CAUSE = "issue_spotting_failure";

export const REQUIRED_OUTPUT_KEYS = [
  "mode",
  "subject",
  "questionType",
  "issueGate",
  "rubricScores",
  "rubricSubtotal",
  "baseScore",
  "deductions",
  "deductionTotal",
  "finalScore",
  "passProbabilitySimulation",
  "skeletonModelAnswer",
  "weaknessDrill",
  "notes",
] as const;

export const RUBRIC_CATEGORY_FALLBACKS: Record<RubricCategory, string> = {
  issue: "쟁점 식별 근거가 부족하여 판단 불가",
  structure: "목차 구조 근거가 부족하여 판단 불가",
  standard: "평가기준 제시 근거가 부족하여 판단 불가",
  legalRule: "법규/판례 근거가 부족하여 판단 불가",
  application: "사안포섭 근거가 부족하여 판단 불가",
  conclusion: "결론 정리 근거가 부족하여 판단 불가",
};
