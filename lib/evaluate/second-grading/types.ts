export type SecondGradingMode = "problem_only" | "grade_answer";

export type SecondExamSubject = "감정평가이론" | "감정평가실무" | "감정평가및보상법규";

export type SecondExamQuestionType = "theory" | "law" | "practice";

export type RubricCategory = "issue" | "structure" | "standard" | "legalRule" | "application" | "conclusion";

export type RubricScore = {
  category: RubricCategory;
  maxScore: number;
  score: number;
  rationale: string;
  evidence: string[];
};

export type DeductionCode =
  | "issue_error"
  | "weak_application_subsumption"
  | "calculation_formula_error"
  | "insufficient_legal_rule_case_statute"
  | "weak_logic_toc_structure";

export type DeductionItem = {
  code: DeductionCode;
  label: string;
  points: number;
  rootCauseId: string;
  reason: string;
  evidence: string[];
  cumulative: true;
  independentlyCumulative?: boolean;
};

export type IssueGateResult = {
  triggered: boolean;
  reason: string;
  lockScoreTo?: number;
};

export type PassProbabilityBand = "very_low" | "low" | "medium" | "high";

export type PassProbabilitySimulation = {
  band: PassProbabilityBand;
  estimatedRange: [number, number];
  rationale: string;
  caveat: string;
};

export type SkeletonOutlineItem = {
  heading: string;
  bullets: string[];
  requiredKeywords: string[];
  statutesOrCases: string[];
  formulasLatex: string[];
  applicationDirection: string;
};

export type SkeletonModelAnswer = {
  format: "outline_only";
  caution: string;
  outline: SkeletonOutlineItem[];
};

export type WeaknessDrill = {
  targetWeakness: string;
  improvementGoalPercent: number;
  durationMinutes: 5;
  prompt: string;
  expectedOutputChecklist: string[];
};

export type SecondGradingResult = {
  mode: SecondGradingMode;
  subject: SecondExamSubject;
  questionType: SecondExamQuestionType;
  issueGate: IssueGateResult;
  rubricScores: RubricScore[];
  rubricSubtotal: number;
  baseScore: number;
  deductions: DeductionItem[];
  deductionTotal: number;
  finalScore: number;
  passProbabilitySimulation: PassProbabilitySimulation;
  skeletonModelAnswer: SkeletonModelAnswer;
  weaknessDrill: WeaknessDrill;
  notes: string[];
};
