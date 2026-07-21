export const OWNER_ALPHA_PRACTICE_CONTRACT_VERSION =
  "owner_alpha_universal_appraisal_practice.v0" as const;
export const OWNER_ALPHA_PRACTICE_FLAG =
  "OWNER_ALPHA_UNIVERSAL_PRACTICE_ENABLED" as const;
export const OWNER_ALPHA_PRACTICE_ROUTE_KEY =
  "universal-practice-v0" as const;
export const OWNER_ALPHA_PRACTICE_STAGE =
  "owner_alpha_practice_v0" as const;
export const OWNER_ALPHA_AI_REFERENCE_LABEL = "AI 학습용 기준안" as const;
export const OWNER_ALPHA_AI_REFERENCE_DISCLAIMER =
  "AI가 만든 감정평가 학습용 기준안입니다. 공식 정답·전문가 검증 답안·확정 채점기준·합격 보장이 아닙니다. 표시된 출처와 검증 상태를 확인하세요." as const;

export const OWNER_ALPHA_CLAIM_VERIFICATION_STATES = [
  "problem_given",
  "official_source_grounded",
  "deterministically_validated",
  "cross_checked_ai",
  "ai_inference",
  "unresolved_needs_review",
] as const;

export type OwnerAlphaClaimVerificationState =
  (typeof OWNER_ALPHA_CLAIM_VERIFICATION_STATES)[number];

export const OWNER_ALPHA_METHOD_FAMILIES = [
  "cost_approach",
  "comparison_approach",
  "income_approach",
  "mixed_or_uncertain",
] as const;

export type OwnerAlphaMethodFamily =
  (typeof OWNER_ALPHA_METHOD_FAMILIES)[number];

export const OWNER_ALPHA_ROLE_TYPES = [
  "subject_property",
  "comparable_property",
  "standard_reference",
  "official_series",
  "legal_source",
  "problem_given_value",
  "ai_inference",
] as const;

export type OwnerAlphaRoleType = (typeof OWNER_ALPHA_ROLE_TYPES)[number];

export type OwnerAlphaSourceState = {
  sourceId: string;
  label: string;
  state: OwnerAlphaClaimVerificationState;
  sourceRefId: string | null;
  effectiveAt: string | null;
  unresolvedReason: string | null;
};

export type OwnerAlphaClaimState = {
  claimId: string;
  claimType: "number" | "formula" | "method" | "concept" | "source";
  summary: string;
  state: OwnerAlphaClaimVerificationState;
  critical: boolean;
  evidenceRefIds: string[];
  calculationNodeId: string | null;
  resolutionCode:
    | "supported"
    | "provider_only"
    | "deterministic_conflict"
    | "unsupported_primitive"
    | "multiple_reasonable_approaches"
    | "missing_source"
    | null;
};

export type OwnerAlphaNumericExpression =
  | { kind: "literal"; value: number }
  | {
      kind: "operation";
      operator: "add" | "subtract" | "multiply" | "divide" | "power";
      operands: OwnerAlphaNumericExpression[];
    };

type CalculationNodeBase = {
  nodeId: string;
  claimId: string | null;
  label: string;
  claimedResult: number;
  resultUnit: string | null;
  critical: boolean;
};

export type OwnerAlphaCalculationNode =
  | (CalculationNodeBase & {
      primitive: "expression_order";
      expression: OwnerAlphaNumericExpression;
    })
  | (CalculationNodeBase & {
      primitive: "sum";
      values: number[];
    })
  | (CalculationNodeBase & {
      primitive: "subtraction";
      minuend: number;
      subtrahends: number[];
    })
  | (CalculationNodeBase & {
      primitive: "ratio";
      numerator: number;
      denominator: number;
    })
  | (CalculationNodeBase & {
      primitive: "percentage_direction";
      baseValue: number;
      rate: number;
      direction: "increase" | "decrease";
      rateInput: "decimal" | "percent";
    })
  | (CalculationNodeBase & {
      primitive: "unit_conversion";
      value: number;
      fromUnit: string;
      toUnit: string;
    })
  | (CalculationNodeBase & {
      primitive: "elapsed_period";
      fromDate: string;
      toDate: string;
      basis: "days" | "months" | "years";
    })
  | (CalculationNodeBase & {
      primitive: "rounding";
      value: number;
      digits: number;
      mode: "round" | "truncate";
    })
  | (CalculationNodeBase & {
      primitive: "significant_digits";
      value: number;
      digits: number;
    })
  | (CalculationNodeBase & {
      primitive: "area_times_unit_price";
      area: number;
      unitPrice: number;
    })
  | (CalculationNodeBase & {
      primitive: "allocation";
      total: number;
      ratio: number;
      ratioInput: "decimal" | "percent";
    })
  | (CalculationNodeBase & {
      primitive: "residual";
      total: number;
      deductions: number[];
    })
  | (CalculationNodeBase & {
      primitive: "index_ratio";
      targetIndex: number;
      baseIndex: number;
    })
  | (CalculationNodeBase & {
      primitive: "present_value";
      futureValue: number;
      rate: number;
      periods: number;
      rateInput: "decimal" | "percent";
    })
  | (CalculationNodeBase & {
      primitive: "annuity_factor";
      rate: number;
      periods: number;
      rateInput: "decimal" | "percent";
    })
  | (CalculationNodeBase & {
      primitive: "capitalization";
      netIncome: number;
      capitalizationRate: number;
      rateInput: "decimal" | "percent";
    })
  | (CalculationNodeBase & {
      primitive: "remaining_life_ratio";
      remainingLife: number;
      totalLife: number;
    });

export type OwnerAlphaPracticeProblemModel = {
  contractVersion: typeof OWNER_ALPHA_PRACTICE_CONTRACT_VERSION;
  problemId: string;
  subject: string;
  topicCandidates: string[];
  methodFamily: OwnerAlphaMethodFamily;
  subMethodCandidates: string[];
  requirements: Array<{ requirementId: string; text: string }>;
  requestedOutputs: Array<{
    outputId: string;
    label: string;
    unit: string | null;
  }>;
  pointAllocation: Array<{
    requirementId: string;
    points: number | null;
  }>;
  entitiesAndRoles: Array<{
    entityId: string;
    label: string;
    role: OwnerAlphaRoleType;
    sourceState: OwnerAlphaClaimVerificationState;
  }>;
  givenFacts: Array<{
    factId: string;
    label: string;
    value: string;
    sourceState: OwnerAlphaClaimVerificationState;
  }>;
  givenNumbers: Array<{
    numberId: string;
    label: string;
    value: number;
    unit: string | null;
    sourceState: OwnerAlphaClaimVerificationState;
  }>;
  units: string[];
  datesAndTimePoints: Array<{
    timePointId: string;
    label: string;
    value: string;
    sourceState: OwnerAlphaClaimVerificationState;
  }>;
  assumptions: Array<{
    assumptionId: string;
    text: string;
    state: OwnerAlphaClaimVerificationState;
  }>;
  methodCandidates: Array<{
    methodId: string;
    label: string;
    state: OwnerAlphaClaimVerificationState;
    confidence: "low" | "medium" | "high";
  }>;
  rejectionReasons: Array<{
    methodId: string;
    reason: string;
    state: OwnerAlphaClaimVerificationState;
  }>;
  calculationGraph: { nodes: OwnerAlphaCalculationNode[] };
  sourceStates: OwnerAlphaSourceState[];
  claimVerificationStates: OwnerAlphaClaimState[];
};

export type OwnerAlphaAssistanceLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type OwnerAlphaRevealEvent = {
  eventId: string;
  occurredAt: string;
  assistanceLevel: OwnerAlphaAssistanceLevel;
  answerExposure: "none" | "hint" | "partial" | "full";
  requestedByUser: true;
};

export type OwnerAlphaAssistanceEvidence = {
  assistanceLevel: OwnerAlphaAssistanceLevel;
  requestedByUser: boolean;
  hintIds: string[];
  independentAttemptBeforeHelp: boolean;
  independentRecoveryAfterHelp: boolean;
  answerExposure: "none" | "hint" | "partial" | "full";
  revealHistory: OwnerAlphaRevealEvent[];
  elapsedTimeMs: number;
  confidence: "low" | "medium" | "high" | "unknown";
  inputModality: "typed" | "handwritten_ocr" | "file_upload" | "calculator";
  variantFamilyId: string | null;
  variantDistance: "same" | "near" | "far" | null;
  sessionPosition: number;
};

export type OwnerAlphaQuestionChainEntry = {
  questionId: string;
  parentQuestionId: string | null;
  sequence: number;
  kind: "learner_question" | "follow_up" | "clarification" | "variant";
  questionText: string;
  occurredAt: string;
};

export type OwnerAlphaQuestionChain = {
  chainId: string;
  entries: OwnerAlphaQuestionChainEntry[];
};

export type OwnerAlphaMisconceptionGraph = {
  graphId: string;
  nodes: Array<{
    conceptId: string;
    label: string;
    state: "suspected" | "observed" | "unresolved";
    evidenceRefIds: string[];
  }>;
  edges: Array<{
    edgeId: string;
    fromConceptId: string;
    toConceptId: string;
    relation:
      | "confuses_with"
      | "prerequisite_gap"
      | "misapplied_rule"
      | "direction_error";
    evidenceRefIds: string[];
  }>;
};

export type OwnerAlphaRootCauseCandidate = {
  rootCauseId: string;
  label: string;
  rationale: string;
  confidence: "low" | "medium" | "high";
  evidenceRefIds: string[];
  conceptIds: string[];
  state: "candidate";
};

export type OwnerAlphaQuestionReplayLink = {
  replayLinkId: string;
  currentSessionId: string;
  priorSessionId: string;
  basis: "misconception" | "root_cause" | "method_family";
  conceptIds: string[];
  createdAt: string;
};

export type OwnerAlphaLearningReferenceLevel = {
  title: string;
  sections: Array<{ heading: string; body: string }>;
};

export type OwnerAlphaAiLearningReference = {
  referenceId: string;
  label: typeof OWNER_ALPHA_AI_REFERENCE_LABEL;
  disclaimer: typeof OWNER_ALPHA_AI_REFERENCE_DISCLAIMER;
  modelProfileId: string;
  promptVersion: string;
  schemaVersion: string;
  generatedAt: string;
  hints: Array<{
    hintId: string;
    level: 1 | 2 | 3 | 4;
    text: string;
  }>;
  l1: OwnerAlphaLearningReferenceLevel;
  l2: OwnerAlphaLearningReferenceLevel;
  l3: OwnerAlphaLearningReferenceLevel;
  claims: OwnerAlphaClaimState[];
  calculationGraph: { nodes: OwnerAlphaCalculationNode[] };
  releaseStatus: "released" | "withheld";
  blockerCodes: string[];
};

export type OwnerAlphaCalculationCheck = {
  nodeId: string;
  primitive: OwnerAlphaCalculationNode["primitive"];
  claimedResult: number;
  deterministicResult: number | null;
  status: "validated" | "conflict" | "unsupported" | "invalid";
  absoluteDifference: number | null;
  tolerance: number;
  critical: boolean;
  errorCode: string | null;
};

export type OwnerAlphaBiggestGap = {
  gapId: string;
  title: string;
  reasonSelected: string;
  inferredMisunderstanding: string;
  successCriteria: string;
  conceptIds: string[];
  state: "ai_candidate" | "learner_confirmed" | "fallback_unresolved";
};

export type OwnerAlphaPracticeVariant = {
  variantId: string;
  kind: "numeric" | "condition";
  changedOneThing: string;
  prompt: string;
  verificationState: OwnerAlphaClaimVerificationState;
  calculationGraph: { nodes: OwnerAlphaCalculationNode[] };
};

export type OwnerAlphaPracticeStatus =
  | "problem_compiled"
  | "problem_confirmed"
  | "attempt_saved"
  | "reference_generating"
  | "reference_ready"
  | "reference_withheld"
  | "rewrite_saved"
  | "completion_pending"
  | "completed";

export type OwnerAlphaProviderState = {
  compile: "succeeded" | "deterministic_fallback";
  reference:
    | "not_requested"
    | "generating"
    | "succeeded"
    | "failed_retryable"
    | "withheld";
  failureCode: "timeout" | "quota" | "unavailable" | "invalid_output" | null;
  modelProfileId: string | null;
  referenceAttemptStartedAt: string | null;
  referenceLeaseExpiresAt: string | null;
};

export type OwnerAlphaPracticeLinks = {
  answerSubmissionId: string | null;
  rewriteSubmissionId: string | null;
  reviewQueueItemId: string | null;
  todayActionSeedId: string | null;
  learningRecordId: string | null;
};

export type OwnerAlphaPracticeSession = {
  contractVersion: typeof OWNER_ALPHA_PRACTICE_CONTRACT_VERSION;
  sessionId: string;
  recordVersion: number;
  status: OwnerAlphaPracticeStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  problemModel: OwnerAlphaPracticeProblemModel;
  confirmedProblemText: string;
  criticalOcrConfirmed: boolean;
  independentAttempt: {
    attemptId: string;
    text: string;
    elapsedTimeMs: number;
    confidence: OwnerAlphaAssistanceEvidence["confidence"];
    savedAt: string;
  } | null;
  assistance: OwnerAlphaAssistanceEvidence;
  aiReference: OwnerAlphaAiLearningReference | null;
  calculationChecks: OwnerAlphaCalculationCheck[];
  biggestGap: OwnerAlphaBiggestGap | null;
  rewrite: {
    rewriteId: string;
    mode: "rewrite" | "recalculate";
    text: string;
    savedAt: string;
  } | null;
  fixedD1DueAt: string | null;
  variant: OwnerAlphaPracticeVariant | null;
  questionChain: OwnerAlphaQuestionChain;
  misconceptionGraph: OwnerAlphaMisconceptionGraph;
  rootCauseCandidates: OwnerAlphaRootCauseCandidate[];
  questionReplayLinks: OwnerAlphaQuestionReplayLink[];
  providerState: OwnerAlphaProviderState;
  links: OwnerAlphaPracticeLinks;
};

export type OwnerAlphaPracticeView = Omit<OwnerAlphaPracticeSession, "aiReference"> & {
  visibleHints: OwnerAlphaAiLearningReference["hints"];
  aiReference: OwnerAlphaAiLearningReference | null;
};

const OWNER_ALPHA_PRACTICE_STATUSES = new Set<OwnerAlphaPracticeStatus>([
  "problem_compiled",
  "problem_confirmed",
  "attempt_saved",
  "reference_generating",
  "reference_ready",
  "reference_withheld",
  "rewrite_saved",
  "completion_pending",
  "completed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isOwnerAlphaPracticeSession(
  value: unknown,
): value is OwnerAlphaPracticeSession {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== OWNER_ALPHA_PRACTICE_CONTRACT_VERSION) return false;
  if (typeof value.sessionId !== "string" || !value.sessionId) return false;
  if (!Number.isInteger(value.recordVersion) || Number(value.recordVersion) < 1) return false;
  if (!OWNER_ALPHA_PRACTICE_STATUSES.has(value.status as OwnerAlphaPracticeStatus)) return false;
  if (typeof value.subject !== "string" || !value.subject) return false;
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return false;
  if (!isRecord(value.problemModel)) return false;
  if (value.problemModel.contractVersion !== OWNER_ALPHA_PRACTICE_CONTRACT_VERSION) return false;
  if (value.problemModel.problemId !== value.sessionId) return false;
  if (typeof value.problemModel.subject !== "string" || !value.problemModel.subject) return false;
  for (const field of [
    "topicCandidates",
    "subMethodCandidates",
    "requirements",
    "requestedOutputs",
    "pointAllocation",
    "entitiesAndRoles",
    "givenFacts",
    "givenNumbers",
    "units",
    "datesAndTimePoints",
    "assumptions",
    "methodCandidates",
    "rejectionReasons",
    "sourceStates",
    "claimVerificationStates",
  ]) {
    if (!Array.isArray(value.problemModel[field])) return false;
  }
  if (!isRecord(value.problemModel.calculationGraph)) return false;
  if (!Array.isArray(value.problemModel.calculationGraph.nodes)) return false;
  if (typeof value.confirmedProblemText !== "string") return false;
  if (typeof value.criticalOcrConfirmed !== "boolean") return false;
  if (!isRecord(value.assistance) || !Array.isArray(value.assistance.revealHistory)) return false;
  if (!isRecord(value.questionChain) || !Array.isArray(value.questionChain.entries)) return false;
  if (!isRecord(value.misconceptionGraph)) return false;
  if (!Array.isArray(value.rootCauseCandidates)) return false;
  if (!Array.isArray(value.questionReplayLinks)) return false;
  if (!isRecord(value.providerState) || !isRecord(value.links)) return false;
  if (
    ![
      "not_requested",
      "generating",
      "succeeded",
      "failed_retryable",
      "withheld",
    ].includes(String(value.providerState.reference))
  ) {
    return false;
  }
  return true;
}

export function ownerAlphaMethodFamilyLabel(value: OwnerAlphaMethodFamily) {
  if (value === "cost_approach") return "원가방식·감가수정";
  if (value === "comparison_approach") return "비교방식·배분·사정보정";
  if (value === "income_approach") return "수익방식·환원·현재가치";
  return "혼합 또는 방법 확인 필요";
}

export function ownerAlphaVerificationLabel(
  value: OwnerAlphaClaimVerificationState,
) {
  const labels: Record<OwnerAlphaClaimVerificationState, string> = {
    problem_given: "문제에서 주어짐",
    official_source_grounded: "공식 출처 근거",
    deterministically_validated: "결정론 검증 완료",
    cross_checked_ai: "AI 교차 확인",
    ai_inference: "AI 추론",
    unresolved_needs_review: "검토 필요",
  };
  return labels[value];
}

export function toOwnerAlphaPracticeView(
  session: OwnerAlphaPracticeSession,
): OwnerAlphaPracticeView {
  const reference = session.aiReference;
  const visibleHints = reference?.releaseStatus === "released"
    ? reference.hints.filter(
        (hint) => hint.level <= session.assistance.assistanceLevel,
      )
    : [];
  const mayRevealReference =
    session.assistance.assistanceLevel === 5 &&
    session.assistance.answerExposure === "full" &&
    reference?.releaseStatus === "released";
  return {
    ...session,
    visibleHints,
    aiReference: mayRevealReference ? reference : null,
  };
}
