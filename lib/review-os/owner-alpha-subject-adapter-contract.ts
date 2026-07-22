import type {
  OwnerAlphaAiLearningReference,
  OwnerAlphaAssistanceEvidence,
  OwnerAlphaBiggestGap,
  OwnerAlphaClaimState,
  OwnerAlphaClaimVerificationState,
  OwnerAlphaMisconceptionGraph,
  OwnerAlphaPracticeLinks,
  OwnerAlphaPracticeProblemModel,
  OwnerAlphaPracticeSession,
  OwnerAlphaPracticeVariant,
  OwnerAlphaQuestionChain,
  OwnerAlphaQuestionReplayLink,
  OwnerAlphaRootCauseCandidate,
} from "./owner-alpha-practice-contract";

export const OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION =
  "owner_alpha_subject_adapter.v1" as const;

const SUBJECT_EVIDENCE_STATES: readonly OwnerAlphaClaimVerificationState[] = [
  "problem_given",
  "official_source_grounded",
  "deterministically_validated",
  "cross_checked_ai",
  "ai_inference",
  "unresolved_needs_review",
];

export const OWNER_ALPHA_PRACTICE_SUBJECTS = [
  "appraisal_practical",
  "appraisal_theory",
  "appraisal_compensation_law",
] as const;

export type OwnerAlphaPracticeSubject =
  (typeof OWNER_ALPHA_PRACTICE_SUBJECTS)[number];

export const OWNER_ALPHA_SUBJECT_DOMAIN_TAGS = [
  "valuation_calculation",
  "compensation_valuation",
  "compensation_statute",
  "compensation_procedure",
  "legal_requirements",
  "precedent_application",
  "value_theory",
  "just_compensation_theory",
  "mixed_subject",
] as const;

export type OwnerAlphaSubjectDomainTag =
  (typeof OWNER_ALPHA_SUBJECT_DOMAIN_TAGS)[number];

export const OWNER_ALPHA_THEORY_GAP_TYPES = [
  "missing_definition",
  "premise_gap",
  "logical_jump",
  "concept_confusion",
  "comparison_omission",
  "evaluation_omission",
  "example_or_application_gap",
  "conclusion_mismatch",
  "outline_imbalance",
  "keyword_only_without_reasoning",
] as const;

export type OwnerAlphaTheoryGapType =
  (typeof OWNER_ALPHA_THEORY_GAP_TYPES)[number];

export const OWNER_ALPHA_THEORY_REWRITE_MODES = [
  "outline_reconstruction",
  "paragraph_rewrite",
  "argument_bridge",
  "compare_and_evaluate",
  "blank_recall",
] as const;

export type OwnerAlphaTheoryRewriteMode =
  (typeof OWNER_ALPHA_THEORY_REWRITE_MODES)[number];

export const OWNER_ALPHA_LAW_GAP_TYPES = [
  "issue_omission",
  "wrong_or_missing_legal_basis",
  "effective_date_risk",
  "requirement_omission",
  "fact_requirement_mapping_gap",
  "weak_subsumption",
  "legal_effect_omission",
  "procedure_omission",
  "precedent_misuse",
  "conclusion_mismatch",
] as const;

export type OwnerAlphaLawGapType =
  (typeof OWNER_ALPHA_LAW_GAP_TYPES)[number];

export const OWNER_ALPHA_LAW_REWRITE_MODES = [
  "issue_rule_application_conclusion",
  "requirement_mapping",
  "subsumption_rewrite",
  "legal_basis_recall",
  "effective_date_check",
  "precedent_application",
] as const;

export type OwnerAlphaLawRewriteMode =
  (typeof OWNER_ALPHA_LAW_REWRITE_MODES)[number];

export const OWNER_ALPHA_PRACTICAL_GAP_TYPES = [
  "method_selection_gap",
  "data_role_gap",
  "calculation_trace_gap",
  "unit_or_rounding_gap",
  "written_conclusion_gap",
] as const;

export const OWNER_ALPHA_PRACTICAL_REWRITE_MODES = [
  "recalculation",
  "answer_structure_rewrite",
] as const;

export type OwnerAlphaPracticalRewriteMode =
  (typeof OWNER_ALPHA_PRACTICAL_REWRITE_MODES)[number];

export type OwnerAlphaSubjectGapType =
  | OwnerAlphaTheoryGapType
  | OwnerAlphaLawGapType
  | "method_selection_gap"
  | "data_role_gap"
  | "calculation_trace_gap"
  | "unit_or_rounding_gap"
  | "written_conclusion_gap";

export type OwnerAlphaSubjectRewriteMode =
  | OwnerAlphaPracticalRewriteMode
  | OwnerAlphaTheoryRewriteMode
  | OwnerAlphaLawRewriteMode;

export type OwnerAlphaSubjectRouting = {
  primarySubject: OwnerAlphaPracticeSubject;
  secondaryDomains: OwnerAlphaPracticeSubject[];
  domainTags: OwnerAlphaSubjectDomainTag[];
};

export type OwnerAlphaAnswerPlan = {
  hierarchy: Array<{
    planId: string;
    parentPlanId: string | null;
    label: string;
    role: string;
    pointWeight: number | null;
  }>;
  validationMode:
    | "deterministic_calculation_and_structure"
    | "structure_relationship_coverage_only"
    | "source_version_structure_and_subsumption";
};

type SubjectAdapterCommon = {
  contractVersion: typeof OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION;
  subject: OwnerAlphaPracticeSubject;
  secondaryDomains: OwnerAlphaPracticeSubject[];
  domainTags: OwnerAlphaSubjectDomainTag[];
  problemType: string;
  answerPlan: OwnerAlphaAnswerPlan;
  gapTypes: readonly OwnerAlphaSubjectGapType[];
  rewriteModes: readonly OwnerAlphaSubjectRewriteMode[];
  defaultRewriteMode: OwnerAlphaSubjectRewriteMode;
  transferTask: {
    mode: "numeric_variant" | "condition_variant" | "blank_recall";
    prompt: string;
  };
};

export type OwnerAlphaPracticalAdapterModel = SubjectAdapterCommon & {
  adapter: "PracticalAdapter";
  subject: "appraisal_practical";
  entitiesAndRoles: Array<{ entityId: string; label: string; role: string }>;
  datesAndValuationTimePoints: Array<{
    timePointId: string;
    label: string;
    value: string;
  }>;
  numbersAndUnits: Array<{
    numberId: string;
    value: number;
    unit: string | null;
  }>;
  methodCandidates: Array<{ methodId: string; label: string }>;
  methodRejectionReasons: Array<{ methodId: string; reason: string }>;
  calculationGraphNodeIds: string[];
  requestedNumericAndWrittenOutputs: Array<{
    outputId: string;
    label: string;
    unit: string | null;
  }>;
  deterministicCalculationChecks: {
    requiredForCriticalCalculations: true;
    failClosedOnConflictOrUnsupported: true;
  };
  recalculationTask: string;
  numericOrConditionVariant: "numeric" | "condition";
};

export type OwnerAlphaTheoryAdapterModel = SubjectAdapterCommon & {
  adapter: "TheoryAdapter";
  subject: "appraisal_theory";
  issueCandidates: string[];
  definitionOrProposition: string[];
  governingPrinciples: string[];
  logicalPremises: string[];
  argumentSteps: string[];
  comparisonTargets: string[];
  supportingAndOpposingConsiderations: string[];
  practicalOrCaseConnection: string[];
  evaluation: string[];
  conclusion: string[];
  expectedOutlineHierarchy: string[];
  paragraphRoles: string[];
  pointWeightedDepth: Array<{
    requirementId: string;
    points: number | null;
    expectedDepth: "brief" | "standard" | "deep";
  }>;
  keyConceptCoverage: Array<{
    concept: string;
    state: OwnerAlphaClaimVerificationState;
  }>;
  unresolvedTheoreticalDispute: string[];
  validationPolicy: {
    deterministicScoringAllowed: false;
    verifies: readonly [
      "structure",
      "required_relationships",
      "contradiction",
      "coverage",
      "evidence_state",
    ];
  };
};

export type OwnerAlphaLawAdapterModel = SubjectAdapterCommon & {
  adapter: "LawAdapter";
  subject: "appraisal_compensation_law";
  legalIssueCandidates: string[];
  applicableLawCandidates: Array<{
    label: string;
    state: OwnerAlphaClaimVerificationState;
    officialSourceRefId: string | null;
  }>;
  articleAndParagraphReferences: Array<{
    citation: string;
    state: OwnerAlphaClaimVerificationState;
    officialSourceRefId: string | null;
    effectiveAt: string | null;
  }>;
  effectiveDateRequirement: {
    required: true;
    effectiveAt: string | null;
    state: "problem_given" | "official_source_grounded" | "unresolved_needs_review";
    officialSourceRefId: string | null;
  };
  legalRequirements: string[];
  factsMappedToEachRequirement: Array<{
    requirement: string;
    factCandidates: string[];
  }>;
  applicationOrSubsumption: string[];
  legalEffect: string[];
  procedure: string[];
  precedentOrAdjudicationReference: Array<{
    citation: string;
    state: OwnerAlphaClaimVerificationState;
    officialSourceRefId: string | null;
  }>;
  opposingInterpretation: string[];
  conclusion: string[];
  unresolvedSourceOrVersionIssue: string[];
  validationPolicy: {
    officialPromotionRequiresStoredSourceRef: true;
    unknownEffectiveDateFailsClosed: true;
    automatedLegalCorrectnessScoringAllowed: false;
  };
};

export type OwnerAlphaSubjectAdapterModel =
  | OwnerAlphaPracticalAdapterModel
  | OwnerAlphaTheoryAdapterModel
  | OwnerAlphaLawAdapterModel;

export type OwnerAlphaSubjectPracticeContract = {
  contractVersion: typeof OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION;
  kernelContractVersion: OwnerAlphaPracticeSession["contractVersion"];
  subject: OwnerAlphaPracticeSubject;
  secondaryDomains: OwnerAlphaPracticeSubject[];
  problemType: string;
  requirements: OwnerAlphaPracticeProblemModel["requirements"];
  pointAllocation: OwnerAlphaPracticeProblemModel["pointAllocation"];
  answerPlan: OwnerAlphaAnswerPlan;
  independentAttempt: OwnerAlphaPracticeSession["independentAttempt"];
  assistanceEvidence: OwnerAlphaAssistanceEvidence;
  learningReference: OwnerAlphaAiLearningReference | null;
  claimVerificationStates: OwnerAlphaClaimState[];
  biggestGap: OwnerAlphaBiggestGap | null;
  rewriteTask: {
    allowedModes: readonly OwnerAlphaSubjectRewriteMode[];
    selectedMode: OwnerAlphaSubjectRewriteMode | null;
    canonicalRewrite: OwnerAlphaPracticeSession["rewrite"];
  };
  variantTask: OwnerAlphaPracticeVariant | null;
  questionChain: OwnerAlphaQuestionChain;
  misconceptionGraph: OwnerAlphaMisconceptionGraph;
  rootCauseCandidates: OwnerAlphaRootCauseCandidate[];
  replayLinks: OwnerAlphaQuestionReplayLink[];
  transferTask: {
    mode: OwnerAlphaSubjectAdapterModel["transferTask"]["mode"];
    prompt: string;
    fixedD1DueAt: string | null;
  };
  queueTodayRecordLinks: {
    queue: OwnerAlphaPracticeLinks["reviewQueueItemId"];
    today: OwnerAlphaPracticeLinks["todayActionSeedId"];
    record: OwnerAlphaPracticeLinks["learningRecordId"];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactStringMembers(value: unknown, expected: readonly string[]) {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    new Set(value).size === expected.length &&
    value.every(
      (item) => typeof item === "string" && expected.includes(item),
    )
  );
}

function hasValidAnswerPlan(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.hierarchy)) return false;
  if (
    ![
      "deterministic_calculation_and_structure",
      "structure_relationship_coverage_only",
      "source_version_structure_and_subsumption",
    ].includes(String(value.validationMode))
  ) {
    return false;
  }
  return value.hierarchy.every(
    (item) =>
      isRecord(item) &&
      typeof item.planId === "string" &&
      item.planId.length > 0 &&
      (item.parentPlanId === null || typeof item.parentPlanId === "string") &&
      typeof item.label === "string" &&
      item.label.length > 0 &&
      typeof item.role === "string" &&
      item.role.length > 0 &&
      (item.pointWeight === null ||
        (typeof item.pointWeight === "number" &&
          Number.isFinite(item.pointWeight))),
  );
}

function isStoredReferenceOrNull(value: unknown) {
  return (
    value === null ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

export function isOwnerAlphaPracticeSubject(
  value: unknown,
): value is OwnerAlphaPracticeSubject {
  return OWNER_ALPHA_PRACTICE_SUBJECTS.includes(
    value as OwnerAlphaPracticeSubject,
  );
}

export function parseOwnerAlphaPracticeSubject(
  value: unknown,
): OwnerAlphaPracticeSubject | null {
  return isOwnerAlphaPracticeSubject(value) ? value : null;
}

export function isOwnerAlphaSubjectAdapterModel(
  value: unknown,
): value is OwnerAlphaSubjectAdapterModel {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION) {
    return false;
  }
  if (!isOwnerAlphaPracticeSubject(value.subject)) return false;
  if (!Array.isArray(value.secondaryDomains) || !Array.isArray(value.domainTags)) {
    return false;
  }
  if (
    !value.secondaryDomains.every(
      (subject) =>
        isOwnerAlphaPracticeSubject(subject) && subject !== value.subject,
    ) ||
    !value.domainTags.every((tag) =>
      OWNER_ALPHA_SUBJECT_DOMAIN_TAGS.includes(tag as OwnerAlphaSubjectDomainTag),
    )
  ) {
    return false;
  }
  if (
    new Set(value.secondaryDomains).size !== value.secondaryDomains.length ||
    new Set(value.domainTags).size !== value.domainTags.length
  ) {
    return false;
  }
  if (typeof value.problemType !== "string" || !value.problemType) return false;
  const answerPlan = value.answerPlan;
  if (!hasValidAnswerPlan(answerPlan) || !isRecord(answerPlan)) return false;
  if (!Array.isArray(value.gapTypes) || !Array.isArray(value.rewriteModes)) {
    return false;
  }
  if (
    typeof value.defaultRewriteMode !== "string" ||
    !value.rewriteModes.includes(value.defaultRewriteMode)
  ) {
    return false;
  }
  if (
    !isRecord(value.transferTask) ||
    typeof value.transferTask.prompt !== "string" ||
    !value.transferTask.prompt.trim() ||
    !["numeric_variant", "condition_variant", "blank_recall"].includes(
      String(value.transferTask.mode),
    )
  ) {
    return false;
  }
  if (value.subject === "appraisal_practical") {
    if (value.adapter !== "PracticalAdapter") return false;
    if (
      !hasExactStringMembers(value.gapTypes, OWNER_ALPHA_PRACTICAL_GAP_TYPES) ||
      !hasExactStringMembers(
        value.rewriteModes,
        OWNER_ALPHA_PRACTICAL_REWRITE_MODES,
      ) ||
      answerPlan.validationMode !==
        "deterministic_calculation_and_structure" ||
      !["numeric", "condition"].includes(String(value.numericOrConditionVariant))
    ) {
      return false;
    }
    for (const field of [
      "entitiesAndRoles",
      "datesAndValuationTimePoints",
      "numbersAndUnits",
      "methodCandidates",
      "methodRejectionReasons",
      "calculationGraphNodeIds",
      "requestedNumericAndWrittenOutputs",
    ]) {
      if (!Array.isArray(value[field])) return false;
    }
    return (
      isRecord(value.deterministicCalculationChecks) &&
      value.deterministicCalculationChecks.requiredForCriticalCalculations === true &&
      value.deterministicCalculationChecks.failClosedOnConflictOrUnsupported === true &&
      typeof value.recalculationTask === "string"
    );
  }
  if (value.subject === "appraisal_theory") {
    if (value.adapter !== "TheoryAdapter") return false;
    if (
      !hasExactStringMembers(value.gapTypes, OWNER_ALPHA_THEORY_GAP_TYPES) ||
      !hasExactStringMembers(
        value.rewriteModes,
        OWNER_ALPHA_THEORY_REWRITE_MODES,
      ) ||
      answerPlan.validationMode !== "structure_relationship_coverage_only"
    ) {
      return false;
    }
    for (const field of [
      "issueCandidates",
      "definitionOrProposition",
      "governingPrinciples",
      "logicalPremises",
      "argumentSteps",
      "comparisonTargets",
      "supportingAndOpposingConsiderations",
      "practicalOrCaseConnection",
      "evaluation",
      "conclusion",
      "expectedOutlineHierarchy",
      "paragraphRoles",
      "pointWeightedDepth",
      "keyConceptCoverage",
      "unresolvedTheoreticalDispute",
    ]) {
      if (!Array.isArray(value[field])) return false;
    }
    return (
      isRecord(value.validationPolicy) &&
      value.validationPolicy.deterministicScoringAllowed === false &&
      hasExactStringMembers(value.validationPolicy.verifies, [
        "structure",
        "required_relationships",
        "contradiction",
        "coverage",
        "evidence_state",
      ])
    );
  }
  if (value.adapter !== "LawAdapter") return false;
  if (
    !hasExactStringMembers(value.gapTypes, OWNER_ALPHA_LAW_GAP_TYPES) ||
    !hasExactStringMembers(value.rewriteModes, OWNER_ALPHA_LAW_REWRITE_MODES) ||
    answerPlan.validationMode !==
      "source_version_structure_and_subsumption"
  ) {
    return false;
  }
  const articleAndParagraphReferences = value.articleAndParagraphReferences;
  const applicableLawCandidates = value.applicableLawCandidates;
  const precedentOrAdjudicationReference =
    value.precedentOrAdjudicationReference;
  for (const field of [
    "legalIssueCandidates",
    "applicableLawCandidates",
    "articleAndParagraphReferences",
    "legalRequirements",
    "factsMappedToEachRequirement",
    "applicationOrSubsumption",
    "legalEffect",
    "procedure",
    "precedentOrAdjudicationReference",
    "opposingInterpretation",
    "conclusion",
    "unresolvedSourceOrVersionIssue",
  ]) {
    if (!Array.isArray(value[field])) return false;
  }
  if (
    !Array.isArray(applicableLawCandidates) ||
    !Array.isArray(articleAndParagraphReferences) ||
    !Array.isArray(precedentOrAdjudicationReference)
  ) {
    return false;
  }
  for (const candidate of applicableLawCandidates) {
    if (
      !isRecord(candidate) ||
      typeof candidate.label !== "string" ||
      !candidate.label.trim() ||
      !SUBJECT_EVIDENCE_STATES.includes(
        candidate.state as OwnerAlphaClaimVerificationState,
      ) ||
      !isStoredReferenceOrNull(candidate.officialSourceRefId) ||
      (candidate.state === "official_source_grounded" &&
        !candidate.officialSourceRefId)
    ) {
      return false;
    }
  }
  const effectiveDate = value.effectiveDateRequirement;
  if (
    !isRecord(effectiveDate) ||
    effectiveDate.required !== true ||
    !["problem_given", "official_source_grounded", "unresolved_needs_review"].includes(
      String(effectiveDate.state),
    ) ||
    !(
      effectiveDate.effectiveAt === null ||
      typeof effectiveDate.effectiveAt === "string"
    ) ||
    !isStoredReferenceOrNull(effectiveDate.officialSourceRefId) ||
    (effectiveDate.state === "official_source_grounded" &&
      !effectiveDate.officialSourceRefId)
  ) {
    return false;
  }
  for (const reference of [
    ...articleAndParagraphReferences,
    ...precedentOrAdjudicationReference,
  ]) {
    if (
      !isRecord(reference) ||
      !SUBJECT_EVIDENCE_STATES.includes(
        reference.state as OwnerAlphaClaimVerificationState,
      ) ||
      !isStoredReferenceOrNull(reference.officialSourceRefId) ||
      (reference.state === "official_source_grounded" &&
        !reference.officialSourceRefId)
    ) {
      return false;
    }
  }
  return (
    isRecord(value.validationPolicy) &&
    value.validationPolicy.officialPromotionRequiresStoredSourceRef === true &&
    value.validationPolicy.unknownEffectiveDateFailsClosed === true &&
    value.validationPolicy.automatedLegalCorrectnessScoringAllowed === false
  );
}

export function ownerAlphaSubjectLabel(subject: OwnerAlphaPracticeSubject) {
  if (subject === "appraisal_practical") return "감정평가실무";
  if (subject === "appraisal_theory") return "감정평가이론";
  return "감정평가 및 보상법규";
}

export function ownerAlphaSubjectFromSession(
  session: Pick<OwnerAlphaPracticeSession, "subject" | "problemModel">,
): OwnerAlphaPracticeSubject {
  const adapterSubject = session.problemModel.subjectAdapter?.subject;
  if (adapterSubject) return adapterSubject;
  if (isOwnerAlphaPracticeSubject(session.subject)) return session.subject;
  if (session.subject === "감정평가이론") return "appraisal_theory";
  if (session.subject === "감정평가 및 보상법규") {
    return "appraisal_compensation_law";
  }
  return "appraisal_practical";
}

export function ownerAlphaGapTypeForSubject(
  subject: OwnerAlphaPracticeSubject,
  value: unknown,
): OwnerAlphaSubjectGapType {
  if (
    subject === "appraisal_theory" &&
    OWNER_ALPHA_THEORY_GAP_TYPES.includes(value as OwnerAlphaTheoryGapType)
  ) {
    return value as OwnerAlphaTheoryGapType;
  }
  if (
    subject === "appraisal_compensation_law" &&
    OWNER_ALPHA_LAW_GAP_TYPES.includes(value as OwnerAlphaLawGapType)
  ) {
    return value as OwnerAlphaLawGapType;
  }
  if (
    subject === "appraisal_practical" &&
    [
      "method_selection_gap",
      "data_role_gap",
      "calculation_trace_gap",
      "unit_or_rounding_gap",
      "written_conclusion_gap",
    ].includes(String(value))
  ) {
    return value as OwnerAlphaSubjectGapType;
  }
  if (subject === "appraisal_theory") return "premise_gap";
  if (subject === "appraisal_compensation_law") {
    return "fact_requirement_mapping_gap";
  }
  return "calculation_trace_gap";
}

export function ownerAlphaRewriteModeForSubject(
  adapter: OwnerAlphaSubjectAdapterModel,
  requested: unknown,
  canonicalMode: "rewrite" | "recalculate",
): OwnerAlphaSubjectRewriteMode {
  if (adapter.rewriteModes.includes(requested as OwnerAlphaSubjectRewriteMode)) {
    return requested as OwnerAlphaSubjectRewriteMode;
  }
  if (adapter.subject === "appraisal_practical") {
    return canonicalMode === "recalculate"
      ? "recalculation"
      : "answer_structure_rewrite";
  }
  return adapter.defaultRewriteMode;
}

export function projectOwnerAlphaSubjectPracticeContract(
  session: OwnerAlphaPracticeSession,
): OwnerAlphaSubjectPracticeContract | null {
  const adapter = session.problemModel.subjectAdapter;
  if (!adapter) return null;
  return {
    contractVersion: OWNER_ALPHA_SUBJECT_ADAPTER_CONTRACT_VERSION,
    kernelContractVersion: session.contractVersion,
    subject: adapter.subject,
    secondaryDomains: adapter.secondaryDomains,
    problemType: adapter.problemType,
    requirements: session.problemModel.requirements,
    pointAllocation: session.problemModel.pointAllocation,
    answerPlan: adapter.answerPlan,
    independentAttempt: session.independentAttempt,
    assistanceEvidence: session.assistance,
    learningReference: session.aiReference,
    claimVerificationStates: session.problemModel.claimVerificationStates,
    biggestGap: session.biggestGap,
    rewriteTask: {
      allowedModes: adapter.rewriteModes,
      selectedMode: session.rewrite?.subjectMode ?? null,
      canonicalRewrite: session.rewrite,
    },
    variantTask: session.variant,
    questionChain: session.questionChain,
    misconceptionGraph: session.misconceptionGraph,
    rootCauseCandidates: session.rootCauseCandidates,
    replayLinks: session.questionReplayLinks,
    transferTask: {
      mode: adapter.transferTask.mode,
      prompt: session.variant?.prompt ?? adapter.transferTask.prompt,
      fixedD1DueAt: session.fixedD1DueAt,
    },
    queueTodayRecordLinks: {
      queue: session.links.reviewQueueItemId,
      today: session.links.todayActionSeedId,
      record: session.links.learningRecordId,
    },
  };
}
