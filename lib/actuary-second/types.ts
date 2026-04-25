export const ACTUARY_SECOND_EXAM_ID = "actuary_second" as const;
export const ACTUARY_SECOND_MVP_USER_ID = "mvp-user" as const;
export const ACTUARY_SECOND_SUBJECT_ID = "insurance_math" as const;
export const ACTUARY_SECOND_PROBLEM_FAMILY_ID = "present_value_annuity_v1" as const;

export type ActuarySecondSubjectId = typeof ACTUARY_SECOND_SUBJECT_ID;
export type PresentValueProblemFamilyId = typeof ACTUARY_SECOND_PROBLEM_FAMILY_ID;
export type AnswerConfidence = "low" | "medium" | "high";
export type VerifierStatus = "pass" | "fail" | "unknown";
export type ReviewPriority = "high" | "medium" | "low";
export type NextActionType = "review_now" | "rewrite_now" | "slow_retry" | "move_on";
export type StepCheckMode =
  | "none"
  | "final_only"
  | "key_steps"
  | "key_steps_plus_interpretation";
export type ExpectedOutputForm = "numeric" | "numeric_with_conclusion";
export type PartialCreditSignal =
  | "result_only"
  | "method_right_numeric_wrong"
  | "key_steps_right_late_error"
  | "calculation_right_interpretation_weak"
  | "result_present_no_closure"
  | "assumption_wrong"
  | null;
export type ActuarySecondFailureClass =
  | "formula_selection_error"
  | "arithmetic_slip"
  | "variable_assumption_error"
  | "variable_misuse"
  | "time_pressure"
  | "parse_failure"
  | "step_omission"
  | "verification_missing"
  | "weak_formula_evidence"
  | "result_interpretation_gap"
  | "calculation_to_judgment_gap"
  | "weak_conclusion";
export type PresentValueFormulaFamilyId =
  | "pv_single_payment_basic"
  | "pv_ordinary_annuity_basic"
  | "pv_annuity_due_basic"
  | "pv_deferred_annuity_basic"
  | "pv_annuity_factor_form";
export type PresentValueVariableSchemaId = "pv_annuity_core_v1";

export type PresentValueExpectedKeyStep = {
  id: string;
  label: string;
  expectedPatterns: string[];
  required: boolean;
};

export type PresentValueSampleQuestion = {
  exam_id: typeof ACTUARY_SECOND_EXAM_ID;
  subject_id: ActuarySecondSubjectId;
  problem_family: PresentValueProblemFamilyId;
  question_id: string;
  source_label: string;
  raw_problem_text: string;
  expected_formula_family_id: PresentValueFormulaFamilyId;
  accepted_formula_family_ids: PresentValueFormulaFamilyId[];
  variable_schema_id: PresentValueVariableSchemaId;
  tolerance_abs: number;
  tolerance_rel: number;
  expected_output_form: ExpectedOutputForm;
  step_check_mode: StepCheckMode;
  partial_credit_policy_id: "pv_annuity_v1";
  expected_key_steps: PresentValueExpectedKeyStep[];
  interpretation_required: boolean;
  conclusion_required: boolean;
  difficulty: "medium" | "high";
  expected_time_seconds: number;
  expected_numeric_answer: number;
  interest_rate: number;
  period_count: number;
  payment_amount: number;
  compounding_assumption: "annual_compound";
  present_value_target: string;
  annuity_type: "single" | "ordinary" | "due" | "deferred";
  timing_convention: "end_of_period" | "beginning_of_period";
};

export type ParsedExpression = {
  raw: string;
  normalized: string;
};

export type ParserSkeletonOutput = {
  parse_status: VerifierStatus;
  parsed_expressions: ParsedExpression[];
  parsed_variable_hints: Record<string, string | number>;
  parsed_interpretation_fragments: string[];
  parsed_conclusion_fragments: string[];
  parse_confidence: number;
};

export type ActuarySecondVerifierInput = {
  subject_id: ActuarySecondSubjectId;
  question_id: string;
  raw_answer_text: string;
  raw_work_text?: string | null;
  parsed_expressions?: ParsedExpression[];
  intermediate_steps?: string[];
  variable_bindings?: Record<string, string | number>;
  elapsed_seconds: number;
  confidence?: AnswerConfidence | null;
  attachments_present?: boolean;
  supplementary_notes_present?: boolean;
  explicit_formula_family_id?: PresentValueFormulaFamilyId | null;
  interest_rate?: number | null;
  period_count?: number | null;
  payment_amount?: number | null;
  compounding_assumption?: "annual_compound" | null;
  present_value_target?: string | null;
  annuity_type?: "single" | "ordinary" | "due" | "deferred" | null;
  timing_convention?: "end_of_period" | "beginning_of_period" | null;
};

export type FormulaCheckOutput = {
  formula_check_status: VerifierStatus;
  matched_formula_family_id: PresentValueFormulaFamilyId | null;
  inferred_formula_family_id: PresentValueFormulaFamilyId | null;
  inference_confidence: number;
  inference_evidence: string[];
  inference_status: "pass" | "weak" | "unknown";
  formula_confidence: number;
  formula_evidence: string[];
};

export type VariableCheckOutput = {
  variable_check_status: VerifierStatus;
  variable_confidence: number;
  variable_evidence: string[];
  variable_failure_class:
    | "variable_assumption_error"
    | "variable_misuse"
    | null;
};

export type SymbolicCheckOutput = {
  symbolic_check_status: VerifierStatus;
  symbolic_confidence: number;
  normalized_user_answer: number | null;
  normalized_expected_answer: number | null;
  symbolic_failure_class: "arithmetic_slip" | null;
};

export type StepCheckOutput = {
  step_check_status: VerifierStatus;
  step_check_confidence: number;
  step_evidence: string[];
  step_failure_class:
    | "step_omission"
    | "verification_missing"
    | null;
  interpretation_check_status: VerifierStatus;
  interpretation_confidence: number;
  interpretation_failure_class:
    | "result_interpretation_gap"
    | "calculation_to_judgment_gap"
    | null;
  conclusion_check_status: VerifierStatus;
  conclusion_failure_class: "weak_conclusion" | null;
};

export type PresentValueCorrectionSeed = {
  gap_title: string;
  gap_summary: string;
  correction_target: string;
  guidance: string[];
  starter: string;
  minimum_length: number;
  evidence_references: string[];
  focus_label: string;
  action_urgency: "high" | "medium" | "low";
  correction_confidence: number;
};

export type ActuarySecondVerifierOutput = {
  parse_status: VerifierStatus;
  formula_check_status: VerifierStatus;
  symbolic_check_status: VerifierStatus;
  step_check_status: VerifierStatus;
  variable_check_status: VerifierStatus;
  interpretation_check_status: VerifierStatus;
  verifier_status: VerifierStatus;
  confidence: number;
  evidence: string[];
  normalized_user_answer: number | null;
  normalized_expected_answer: number | null;
  failure_class: ActuarySecondFailureClass | null;
  failure_classes: ActuarySecondFailureClass[];
  partial_credit_signal: PartialCreditSignal;
  selected_primary_gap: string | null;
  correction_target_candidate: string | null;
  parser: ParserSkeletonOutput;
  formula: FormulaCheckOutput;
  variable: VariableCheckOutput;
  symbolic: SymbolicCheckOutput;
  step: StepCheckOutput;
};

export type ActuarySecondReviewQueueCandidate = {
  id: string;
  userId: string;
  questionId: string;
  subjectId: ActuarySecondSubjectId;
  reviewPriority: ReviewPriority;
  reviewPriorityScore: number;
  reviewReasonCodes: ActuarySecondFailureClass[];
  reviewReasonSentence: string;
  recommendedReviewAction: string;
  rootCauseTags: ActuarySecondFailureClass[];
  createdAt: string;
};

export type ActuarySecondNextAction = {
  next_action_type: NextActionType;
  next_action_label: string;
  next_action_reason: string;
  action_confidence: number;
};

export type ActuarySecondCoachingSeed = {
  coachingTheme: string;
  coachingRootCauseTags: ActuarySecondFailureClass[];
  coachingSummary: string;
  coachingConfidence: number;
};

export type ActuarySecondEvaluationResult = {
  question: PresentValueSampleQuestion;
  verifier: ActuarySecondVerifierOutput;
  primary_failure_class: ActuarySecondFailureClass | null;
  failure_classes: ActuarySecondFailureClass[];
  partial_credit_signal: PartialCreditSignal;
  correction_seed: PresentValueCorrectionSeed;
  review_queue_candidate: ActuarySecondReviewQueueCandidate | null;
  next_action: ActuarySecondNextAction;
  coaching_seed: ActuarySecondCoachingSeed;
  records_summary: {
    title: string;
    summary: string;
    correctionTarget: string;
  };
};

export type ActuarySecondSubmissionRecord = {
  id: string;
  userId: string;
  subjectId: ActuarySecondSubjectId;
  questionId: string;
  submittedAt: string;
  input: ActuarySecondVerifierInput;
  evaluation: ActuarySecondEvaluationResult;
};

export type ActuarySecondRecordsSummary = {
  subjectId: ActuarySecondSubjectId;
  items: {
    id: string;
    type: "submission" | "coaching";
    title: string;
    description: string;
    occurredAt: string;
    metadata?: Record<string, string | number | null>;
  }[];
  aggregate: {
    submissionCount: number;
    reviewCandidateCount: number;
    recentActivityAt: string | null;
    topFailureClass: ActuarySecondFailureClass | null;
    summarySentence: string;
  };
};
