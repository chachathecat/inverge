export const ACTUARY_FIRST_EXAM_ID = "actuary_first" as const;
export const ACTUARY_FIRST_MVP_USER_ID = "mvp-user" as const;
export const ACTUARY_FIRST_SUBJECT_ID = "probability" as const;

export type ActuaryFirstSubjectId = typeof ACTUARY_FIRST_SUBJECT_ID;
export type ChoiceId = "1" | "2" | "3" | "4" | "5";
export type AnswerConfidence = "low" | "medium" | "high";
export type ProblemFamily =
  | "basic_probability"
  | "conditional_probability"
  | "bayes_rule"
  | "expectation"
  | "variance"
  | "combinatorics_probability"
  | "discrete_distribution_basic";
export type FormulaFamilyId =
  | "basic_probability_ratio"
  | "conditional_probability_basic"
  | "bayes_rule_basic"
  | "expectation_discrete_basic"
  | "variance_discrete_basic"
  | "permutation_combination_probability"
  | "binomial_basic"
  | "poisson_basic";
export type VariableSchemaId =
  | "count_ratio_basic_v1"
  | "conditional_probability_direction_v1"
  | "bayes_binary_event_v1"
  | "discrete_value_probability_pairs_v1"
  | "variance_discrete_v1"
  | "combinatorics_count_v1"
  | "binomial_parameters_v1"
  | "poisson_parameters_v1";
export type ExpectedInputForm = "choice_only" | "choice_plus_work" | "choice_plus_formula";
export type FailureClass =
  | "formula_selection_error"
  | "arithmetic_slip"
  | "variable_misuse"
  | "confidence_mismatch"
  | "time_pressure"
  | "error_burst"
  | "concept_recall_gap"
  | "final_answer_mismatch"
  | "parse_failure"
  | "verification_missing"
  | "step_omission"
  | "weak_formula_evidence";
export type VerifierStatus = "pass" | "fail" | "unknown";
export type ReviewPriority = "high" | "medium" | "low";
export type NextActionType = "review_now" | "retry_set" | "slow_retry" | "move_on";
export type FormulaInferenceStatus = "pass" | "weak" | "unknown";
export type StepCheckMode = "none" | "key_steps" | "final_only";
export type StepRuleStrictness = "strict" | "moderate" | "loose";

export type ProbabilityChoice = {
  id: ChoiceId;
  text: string;
  value?: string | number;
};

export type FormulaOption = {
  value: FormulaFamilyId;
  label: string;
};

export type VariableBindingPrompt = {
  field: string;
  label: string;
  options: { value: string; label: string }[];
};

export type IntermediateStepPrompt = {
  id: string;
  label: string;
  expectedPatterns: string[];
};

export type ProblemFamilyStepRulePack = {
  problem_family: ProblemFamily;
  required: boolean;
  strictness: StepRuleStrictness;
  expected_key_step_patterns: string[][];
  missing_failure_class: FailureClass;
  partial_match_failure_class: FailureClass | null;
  weak_formula_failure_class: FailureClass | null;
  review_message_seed: string;
  coaching_theme_seed: string;
};

export type ProbabilityQuestion = {
  exam_id: typeof ACTUARY_FIRST_EXAM_ID;
  subject_id: ActuaryFirstSubjectId;
  set_id: string;
  question_id: string;
  question_number: number;
  problem_family: ProblemFamily;
  unit_id: string;
  difficulty: "low" | "medium" | "high";
  expected_time_seconds: number;
  stem: string;
  choices: ProbabilityChoice[];
  correct_choice_id: ChoiceId;
  correct_answer_value: string | number;
  answer_format: "numeric" | "fraction" | "expression" | "choice_only";
  formula_family_id: FormulaFamilyId;
  accepted_formula_family_ids: FormulaFamilyId[];
  variable_schema_id: VariableSchemaId;
  tolerance_abs: number;
  tolerance_rel: number;
  expected_input_form: ExpectedInputForm;
  requires_intermediate_work: boolean;
  requires_variable_binding: boolean;
  requires_formula_selection_check: boolean;
  supports_intermediate_steps: boolean;
  step_check_mode: StepCheckMode;
  key_step_prompts?: IntermediateStepPrompt[];
  formula_options: FormulaOption[];
  variable_binding_prompts?: VariableBindingPrompt[];
};

export type ProbabilitySet = {
  id: string;
  examId: typeof ACTUARY_FIRST_EXAM_ID;
  subjectId: ActuaryFirstSubjectId;
  title: string;
  sourceLabel: string;
  timeLimitMinutes: number;
  questions: ProbabilityQuestion[];
};

export type ProbabilitySetAnswer = {
  questionId: string;
  selectedChoiceId: ChoiceId | null;
  userAnswerValue: string | number | null;
  userFormulaFamilyId: FormulaFamilyId | null;
  userWorkText?: string | null;
  userVariableBindings: Record<string, string>;
  intermediateSteps?: string[];
  confidence: AnswerConfidence | null;
  flagged: boolean;
  elapsedSecondsOnQuestion: number;
  firstAnsweredAt: string | null;
  lastUpdatedAt: string | null;
};

export type FormulaFamilyDefinition = {
  formula_family_id: FormulaFamilyId;
  public_label: string;
  internal_description: string;
  linked_problem_family: ProblemFamily;
  expected_inputs: string[];
  expected_output_form: "numeric" | "fraction" | "expression" | "choice_only";
  accepted_equivalent_forms: string[];
  variable_schema_id: VariableSchemaId;
  verifier_mode: "exact_or_rational" | "symbolic_ratio" | "symbolic_expression" | "symbolic_sum" | "symbolic_combinatoric" | "symbolic_distribution";
  representative_failure_class: FailureClass;
  review_enabled: boolean;
};

export type VariableDefinition = {
  variable_name: string;
  role: string;
  expected_type: "integer" | "number" | "probability" | "positive_number";
  required: boolean;
  allowed_aliases: string[];
  constraints: string[];
  common_misuse_patterns: string[];
  verifier_check_required: boolean;
};

export type VariableSchemaDefinition = {
  variable_schema_id: VariableSchemaId;
  linked_problem_family?: ProblemFamily;
  linked_formula_family_id?: FormulaFamilyId;
  variables: VariableDefinition[];
};

export type FormulaVerificationInput = {
  questionId: string;
  expectedFormulaFamilyId: FormulaFamilyId;
  acceptedFormulaFamilyIds: FormulaFamilyId[];
  userFormulaFamilyId: FormulaFamilyId | null;
  requiresFormulaSelectionCheck: boolean;
};

export type SymbolicVerificationInput = {
  answerFormat: ProbabilityQuestion["answer_format"];
  correctAnswerValue: string | number;
  userAnswerValue: string | number | null;
  selectedChoiceId: ChoiceId | null;
  correctChoiceId: ChoiceId;
  selectedChoiceValue: string | number | null;
  toleranceAbs: number;
  toleranceRel: number;
};

export type VariableCheckInput = {
  variableSchemaId: VariableSchemaId;
  userVariableBindings: Record<string, string>;
  requiresVariableBinding: boolean;
};

export type FormulaInferenceOutput = {
  inferred_formula_family_id: FormulaFamilyId | null;
  inference_confidence: number;
  inference_evidence: VerifierEvidence[];
  inference_status: FormulaInferenceStatus;
};

export type IntermediateStepVerificationInput = {
  questionId: string;
  problemFamily: ProblemFamily;
  stepCheckMode: StepCheckMode;
  supportsIntermediateSteps: boolean;
  intermediateSteps: string[];
  keyStepPrompts?: IntermediateStepPrompt[];
};

export type IntermediateStepVerificationOutput = {
  intermediate_step_status: VerifierStatus;
  intermediate_step_confidence: number;
  intermediate_step_evidence: VerifierEvidence[];
  intermediate_failure_class: FailureClass | null;
};

export type VerifierEvidence = {
  code: string;
  message: string;
  value?: string | number | boolean | null;
};

export type ProbabilityVerifierOutput = {
  verifier_status: VerifierStatus;
  formula_check_status: VerifierStatus;
  symbolic_check_status: VerifierStatus;
  variable_check_status: VerifierStatus;
  intermediate_step_status: VerifierStatus;
  failure_class: FailureClass | null;
  failure_classes: FailureClass[];
  confidence: number;
  evidence: VerifierEvidence[];
  normalized_user_answer: string | null;
  normalized_correct_answer: string | null;
  inferred_formula_family_id: FormulaFamilyId | null;
  inference_confidence: number;
  inference_evidence: VerifierEvidence[];
  inference_status: FormulaInferenceStatus;
  intermediate_step_confidence: number;
  intermediate_step_evidence: VerifierEvidence[];
  intermediate_failure_class: FailureClass | null;
  verifier_path_used: "explicit_formula" | "inferred_formula" | "final_only" | "key_steps";
};

export type ReviewCandidateSignals = {
  wrong: boolean;
  timeOveruse: boolean;
  lowConfidence: boolean;
  mediumConfidence: boolean;
  flagged: boolean;
  formulaIssue: boolean;
  variableIssue: boolean;
};

export type QuestionDeterministicEvaluation = {
  questionId: string;
  questionNumber: number;
  problemFamily: ProblemFamily;
  unitId: string;
  correctness: boolean;
  correctness_confidence: number;
  calc_stability_score: number;
  formula_check_status: VerifierStatus;
  formula_check_confidence: number;
  variable_check_status: VerifierStatus;
  variable_check_confidence: number;
  symbolic_check_status: VerifierStatus;
  inferred_formula_family_id: FormulaFamilyId | null;
  formula_inference_confidence: number;
  intermediate_step_status: VerifierStatus;
  intermediate_step_confidence: number;
  intermediate_failure_class: FailureClass | null;
  verifier_path_used: "explicit_formula" | "inferred_formula" | "final_only" | "key_steps";
  time_signal: {
    overuse: boolean;
    ratio: number;
  };
  confidence_signal: {
    type: "high_confidence_wrong" | "low_confidence_right" | "none";
  };
  primary_failure_class: FailureClass | null;
  failure_classes: FailureClass[];
  review_candidate_signals: ReviewCandidateSignals;
  root_cause_tags: FailureClass[];
  verifier: ProbabilityVerifierOutput;
};

export type SetDeterministicEvaluation = {
  answered_count: number;
  correct_count: number;
  error_burst_index: number;
  weak_unit_ids: string[];
  high_confidence_wrong_count: number;
  time_overuse_count: number;
  review_candidate_count: number;
  internal_percentile_band: "top_20" | "mid_40_80" | "needs_review" | null;
};

export type ReviewQueueCandidate = {
  id: string;
  userId: string;
  setId: string;
  questionId: string;
  questionNumber: number;
  subjectId: ActuaryFirstSubjectId;
  unitId: string;
  difficulty: ProbabilityQuestion["difficulty"];
  selectedChoiceId: ChoiceId | null;
  confidence: AnswerConfidence | null;
  elapsedSecondsOnQuestion: number;
  reviewPriority: ReviewPriority;
  reviewPriorityScore: number;
  reviewReasonCodes: FailureClass[];
  reviewReasonSentence: string;
  recommendedReviewAction: string;
  rootCauseTags: FailureClass[];
  status: "queued" | "completed";
  createdAt: string;
  completedAt?: string;
};

export type CoachingSeed = {
  coachingTheme: string;
  coachingRootCauseTags: FailureClass[];
  coachingSummary: string;
  coachingConfidence: number;
};

export type NextAction = {
  next_action_type: NextActionType;
  next_action_label: string;
  next_action_reason: string;
  action_confidence: number;
};

export type ProbabilitySetSubmissionInput = {
  subjectId: ActuaryFirstSubjectId;
  setId: string;
  startedAt: string;
  submittedAt?: string;
  totalElapsedSeconds: number;
  totalPausedSeconds: number;
  exceededTimeLimit: boolean;
  overtimeSeconds: number;
  answers: Record<string, ProbabilitySetAnswer>;
};

export type ProbabilitySetSubmission = ProbabilitySetSubmissionInput & {
  id: string;
  userId: string;
  submittedAt: string;
  setEvaluation: SetDeterministicEvaluation;
  questionEvaluations: QuestionDeterministicEvaluation[];
  reviewQueueCandidates: ReviewQueueCandidate[];
  coachingSeed: CoachingSeed;
  nextAction: NextAction;
};

export type ReviewCompletionInput = {
  reviewId: string;
  setId: string;
  questionId: string;
  selectedChoiceId: ChoiceId;
  memo?: string | null;
  reviewedAt?: string;
};

export type ReviewCompletion = ReviewCompletionInput & {
  id: string;
  userId: string;
  reviewedAt: string;
};

export type RecordsTimelineItem = {
  id: string;
  type: "pastSet" | "review" | "coaching";
  title: string;
  description: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type ProbabilityRecordsSummary = {
  subjectId: ActuaryFirstSubjectId;
  items: RecordsTimelineItem[];
  aggregate: {
    setCount: number;
    reviewCompletedCount: number;
    recentActivityAt: string | null;
    topFailureClass: FailureClass | null;
    summarySentence: string;
  };
};
