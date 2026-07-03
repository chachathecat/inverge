import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL,
  assertValidRubricEvidenceReviewContract,
  type CommonRubricEvidenceReviewContract,
  type DeductionCandidateContract,
  type OneBiggestGapContract,
  type OneNextActionContract,
  type RubricEvidenceBlockingReason,
  type RubricEvidenceConfidenceLevel,
  type RubricEvidenceReviewStatus,
  type RubricEvidenceSourceStatus,
  type RubricEvidenceSubject,
  type RewriteOrRecalculationTaskHook,
} from "./rubric-evidence-contract";
import {
  REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
  validateRewriteRegradeHistoryContract,
  type AnswerAttemptComparisonMetadata,
  type ReReviewRequestContract,
  type RewriteRegradeHistoryContract,
  type RewriteRegradeImprovementStatus,
} from "./rewrite-regrade-history-contract";
import {
  S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
  type S211GateStatus,
  type S211LawDimensionId,
} from "./s211-law-answer-review-engine";
import {
  S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
  type S212TheoryDimensionId,
  type S212TheoryGateStatus,
} from "./theory-answer-review-engine";
import {
  S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
  type S213PracticeDimensionId,
  type S213PracticeGateStatus,
  type S213PracticeMetadataCheckKey,
} from "./practice-answer-review-engine";
import {
  S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
  type S215ReferenceAnswerReleaseGateResult,
  type S215ReleaseBlockerCode,
  type S215ReleaseGateStatus,
} from "./s215-reference-answer-release-gate";

export const S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION = "s216.error_notebook_gap_taxonomy.v1" as const;

export type S216NotebookConsumer = "learner";
export type S216NotebookActorRole = "learner";
export type S216NotebookEntryStatus = "ready" | "withheld";
export type S216RecoveryActionType = OneNextActionContract["actionType"];

export type S216WithholdReason =
  | "review_contract_missing"
  | "rewrite_history_missing"
  | "subject_review_metadata_missing"
  | "learner_evidence_missing"
  | "learner_evidence_unconfirmed"
  | "source_or_release_unverified"
  | "reference_release_missing"
  | "reference_release_blocked"
  | "subject_review_unresolved"
  | "review_status_withheld"
  | "primary_gap_missing"
  | "deduction_evidence_missing"
  | "rewrite_history_unresolved";

export type S216GapCategoryId =
  | "law_issue_spotting"
  | "law_requirement_decomposition"
  | "law_rule_mapping"
  | "law_subsumption_application"
  | "law_conclusion_quality"
  | "theory_definition_quality"
  | "theory_basis"
  | "theory_comparison_frame"
  | "theory_application_evaluation"
  | "theory_conclusion"
  | "theory_compression_relevance"
  | "practice_assumptions"
  | "practice_data_selection"
  | "practice_formula_metadata"
  | "practice_calculation_trace"
  | "practice_unit_rounding_time_adjustment"
  | "practice_cross_check"
  | "practice_conclusion_writing"
  | "evidence_confirmation"
  | "source_release_blocker"
  | "unsupported_practice_calculation"
  | "maintenance_review";

export type S216GapTaxonomyEntry = {
  taxonomyVersion: typeof S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION;
  categoryId: S216GapCategoryId;
  subject: RubricEvidenceSubject | "all";
  dimensionIds: string[];
  gapTypes: string[];
  whyWrongCode: string;
  correctPrincipleCode: string;
  defaultRecoveryActionType: S216RecoveryActionType;
  nextReviewPolicy: "schedule_after_rewrite_or_recalculation" | "withhold_until_verified" | "confirm_evidence_first" | "schedule_maintenance";
};

export type S216LawSubjectReviewMetadata = {
  kind: "s211_law_answer_review_metadata";
  engineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
  lawSourceGateStatus: S211GateStatus;
  referencePackageGateStatus: S211GateStatus;
  evaluatedDimensionIds: S211LawDimensionId[];
  learnerRouteOnly: true;
  instructorRouteSeparated: true;
  academyTenantDataAccessed: false;
  metadataOnly: true;
  containsRawContent: false;
};

export type S216TheorySubjectReviewMetadata = {
  kind: "s212_theory_answer_review_metadata";
  engineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
  conceptSourceVerification: S212TheoryGateStatus;
  referencePackageVerification: S212TheoryGateStatus;
  learnerAnswerEvidence: S212TheoryGateStatus;
  theoryQualityDimensionIds: S212TheoryDimensionId[];
  dimensionEvidence: Record<S212TheoryDimensionId, S212TheoryGateStatus>;
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  scoreLikeSummarySecondary: true;
  safeForS216ErrorNotebook: boolean;
  safeForS217ConceptGraph: boolean;
  metadataOnly: true;
  containsRawContent: false;
};

export type S216PracticeSubjectReviewMetadata = {
  kind: "s213_practice_answer_review_metadata";
  engineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
  referencePackageVerification: S213PracticeGateStatus;
  calculationUnitSupport: S213PracticeGateStatus;
  calculationReviewMetadata: S213PracticeGateStatus;
  learnerAnswerEvidence: S213PracticeGateStatus;
  practiceDimensionIds: S213PracticeDimensionId[];
  dimensionEvidence: Record<S213PracticeDimensionId, S213PracticeGateStatus>;
  metadataChecks: Record<S213PracticeMetadataCheckKey, S213PracticeGateStatus>;
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  calculatorModel: typeof RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL;
  resetSafeHandKeyedRoutineOnly: true;
  storedProgramDependency: false;
  scoreLikeSummarySecondary: true;
  safeForS216ErrorNotebook: boolean;
  safeForS217ConceptGraph: boolean;
  metadataOnly: true;
  containsRawContent: false;
};

export type S216SubjectReviewMetadata =
  | S216LawSubjectReviewMetadata
  | S216TheorySubjectReviewMetadata
  | S216PracticeSubjectReviewMetadata;

export type S216ReferenceStatusSnapshot = {
  referencePackageId: string | null;
  releaseGateVersion: typeof S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION | "not_supplied";
  releaseStatus: S215ReleaseGateStatus | "missing";
  learningReferenceStatus: "released_learning_reference" | "blocked" | "missing";
  blockerCodes: S215ReleaseBlockerCode[];
  requiredCaveatKey: "learning_reference_not_official_answer" | null;
  officialClaimAllowed: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  confirmedScoreClaimAllowed: false;
  passProbabilityAllowed: false;
  passGuaranteeAllowed: false;
  containsRawContent: false;
};

export type S216ErrorNotebookInput = {
  entryId: string;
  createdAt: string;
  consumer: S216NotebookConsumer;
  actorRole: S216NotebookActorRole;
  questionId: string;
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  answerSubmissionId: string;
  review: CommonRubricEvidenceReviewContract | null;
  rewriteHistory: RewriteRegradeHistoryContract | null;
  subjectReview: S216SubjectReviewMetadata | null;
  referenceStatus: S216ReferenceStatusSnapshot | null;
};

export type S216LearnerEvidenceMetadata = {
  evidenceRefIds: string[];
  evidenceRefKinds: string[];
  answerSubmissionIds: string[];
  verifiedByLearner: boolean;
  evidenceMaterialInEntry: false;
  learnerMaterialInEntry: false;
  ocrMaterialInEntry: false;
  containsRawContent: false;
};

export type S216WhyWrongMetadata = {
  status: S216NotebookEntryStatus;
  reasonCode: string;
  gapType: string;
  dimensionId: string | null;
  deductionCandidateId: string | null;
  rootCauseId: string | null;
  evidenceRefIds: string[];
  confidenceLevel: RubricEvidenceConfidenceLevel;
  containsRawContent: false;
};

export type S216CorrectPrincipleMetadata = {
  status: S216NotebookEntryStatus;
  principleCode: string;
  sourceRefIds: string[];
  conceptNodeIds: string[];
  referencePackageId: string | null;
  referenceReleaseStatus: S216ReferenceStatusSnapshot["releaseStatus"];
  requiredCaveatKey: "learning_reference_not_official_answer" | null;
  sourceVerificationStatus: "verified" | "withheld";
  sourceMaterialInEntry: false;
  referenceProseInEntry: false;
  containsRawContent: false;
};

export type S216ImmediateFixMetadata = {
  status: S216NotebookEntryStatus;
  actionType: S216RecoveryActionType;
  instructionKey: string;
  targetGapId: string | null;
  evidenceRefIds: string[];
  hookKind: RewriteOrRecalculationTaskHook["kind"] | "withheld";
  calculator:
    | {
        model: typeof RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL;
        resetSafeHandKeyedRoutineOnly: true;
        storedProgramDependency: false;
      }
    | null;
  providerRuntimeCalled: false;
  ocrRuntimeCalled: false;
  containsRawContent: false;
};

export type S216RecurrenceMetadata = {
  status: "first_seen" | "recurring" | "resolved_in_latest_attempt" | "not_compared_yet" | "withheld";
  comparisonId: string | null;
  improvementStatus: RewriteRegradeImprovementStatus | null;
  duplicateRootCauseGroupId: string | null;
  recurringDeductionCandidateIds: string[];
  resolvedDeductionCandidateIds: string[];
  newDeductionCandidateIds: string[];
  evidenceRefIds: string[];
  containsRawContent: false;
};

export type S216RecoveryMetadata = {
  status: S216NotebookEntryStatus;
  recoveryActionType: S216RecoveryActionType;
  hookKind: RewriteOrRecalculationTaskHook["kind"] | "withheld";
  targetGapId: string | null;
  retryReviewAllowed: boolean;
  reReviewRequestId: string | null;
  rewriteHistoryId: string | null;
  safeForS217ConceptGraph: boolean;
  containsRawContent: false;
};

export type S216NextReviewMetadata = {
  status: "scheduled" | "queued_after_recovery" | "not_ready";
  reviewDueHint: RewriteRegradeHistoryContract["derivedSignals"]["reviewDueHint"] | "not_ready";
  nextActionId: string | null;
  todayPlanContributionCount: 0 | 1;
  reviewQueueCandidate: boolean;
  containsRawContent: false;
};

export type S216AutomaticErrorNotebookEntry = {
  version: typeof S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION;
  dataClass: "derived_learning_metadata";
  entryId: string;
  createdAt: string;
  status: S216NotebookEntryStatus;
  withhold: {
    withheld: boolean;
    reasons: S216WithholdReason[];
    reviewReasons: RubricEvidenceBlockingReason[];
    referenceBlockerCodes: S215ReleaseBlockerCode[];
  };
  examMode: "second";
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  questionId: string;
  answerSubmissionId: string;
  rootAnswerSubmissionId: string | null;
  sourceReview: {
    reviewStatus: RubricEvidenceReviewStatus | "missing";
    sourceReviewId: string | null;
    primaryGapId: string | null;
    primaryGapType: string | null;
    deductionCandidateIds: string[];
    sourceRefIds: string[];
    rewriteOrRecalculationHookKind: RewriteOrRecalculationTaskHook["kind"] | "withheld";
  };
  gapTaxonomy: S216GapTaxonomyEntry & {
    selectedBy: "dimension_id" | "gap_type" | "fallback";
  };
  learnerEvidence: S216LearnerEvidenceMetadata;
  whyWrong: S216WhyWrongMetadata;
  correctPrinciple: S216CorrectPrincipleMetadata;
  immediateFix: S216ImmediateFixMetadata;
  recurrence: S216RecurrenceMetadata;
  recovery: S216RecoveryMetadata;
  nextReview: S216NextReviewMetadata;
  referenceStatus: S216ReferenceStatusSnapshot;
  learnerInstructorBoundary: {
    learnerRouteOnly: true;
    instructorRouteSeparated: true;
    academyTenantDataAccessed: false;
    instructorRuntimeRouteChanged: false;
    learnerInstructorDataMerged: false;
  };
  authorityFlags: {
    nonOfficial: true;
    officialGrading: false;
    officialModelAnswer: false;
    confirmedScore: false;
    passProbability: false;
    passGuarantee: false;
  };
  dataBoundary: {
    metadataOnly: true;
    learnerMaterialInEntry: false;
    ocrMaterialInEntry: false;
    officialMaterialInEntry: false;
    referenceProseInEntry: false;
    sourceMaterialInEntry: false;
    calculationTraceInEntry: false;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    globalReferenceWrite: false;
    academyTenantDataAccessed: false;
    modelTrainingUse: false;
    telemetrySafe: true;
    containsRawContent: false;
  };
};

export type S216ErrorNotebookValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type S216ErrorNotebookBuildResult = {
  version: typeof S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION;
  entry: S216AutomaticErrorNotebookEntry;
  validation: S216ErrorNotebookValidationResult;
};

const SOURCE_BLOCKING_STATUSES = new Set<RubricEvidenceSourceStatus>([
  "blocked",
  "needs_verification",
  "unresolved_conflict",
]);

const GAP_TAXONOMY: readonly S216GapTaxonomyEntry[] = [
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "law_issue_spotting",
    subject: "law",
    dimensionIds: ["law_issue_spotting"],
    gapTypes: ["law_issue_spotting"],
    whyWrongCode: "missed_required_legal_issue",
    correctPrincipleCode: "state_issue_before_rule_and_application",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "law_requirement_decomposition",
    subject: "law",
    dimensionIds: ["law_requirement_decomposition"],
    gapTypes: ["law_requirement_decomposition"],
    whyWrongCode: "legal_requirement_not_split_before_application",
    correctPrincipleCode: "split_legal_requirements_then_apply_each_fact",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "law_rule_mapping",
    subject: "law",
    dimensionIds: ["law_rule_mapping"],
    gapTypes: ["law_rule_mapping"],
    whyWrongCode: "rule_anchor_missing_or_misaligned",
    correctPrincipleCode: "map_each_requirement_to_verified_exam_date_rule",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "law_subsumption_application",
    subject: "law",
    dimensionIds: ["law_subsumption_application"],
    gapTypes: ["law_subsumption_application"],
    whyWrongCode: "facts_not_connected_to_rule_requirements",
    correctPrincipleCode: "attach_material_fact_to_each_rule_requirement",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "law_conclusion_quality",
    subject: "law",
    dimensionIds: ["law_conclusion_quality"],
    gapTypes: ["law_conclusion_quality"],
    whyWrongCode: "legal_conclusion_not_tied_to_application",
    correctPrincipleCode: "close_with_direct_legal_result_from_application",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "theory_definition_quality",
    subject: "theory",
    dimensionIds: ["definition_quality"],
    gapTypes: ["definition_quality_gap"],
    whyWrongCode: "definition_sentence_too_weak_for_paragraph",
    correctPrincipleCode: "start_with_precise_definition_before_expansion",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "theory_basis",
    subject: "theory",
    dimensionIds: ["theory_basis"],
    gapTypes: ["theory_basis_gap"],
    whyWrongCode: "theory_basis_not_grounded",
    correctPrincipleCode: "add_grounding_principle_before_argument",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "theory_comparison_frame",
    subject: "theory",
    dimensionIds: ["comparison_frame"],
    gapTypes: ["comparison_frame_gap"],
    whyWrongCode: "comparison_axis_missing",
    correctPrincipleCode: "state_comparison_axis_before_positions",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "theory_application_evaluation",
    subject: "theory",
    dimensionIds: ["application_evaluation"],
    gapTypes: ["application_evaluation_gap"],
    whyWrongCode: "concept_not_applied_to_question_condition",
    correctPrincipleCode: "connect_concept_to_condition_then_evaluate",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "theory_conclusion",
    subject: "theory",
    dimensionIds: ["conclusion"],
    gapTypes: ["conclusion_gap"],
    whyWrongCode: "judgment_sentence_missing",
    correctPrincipleCode: "close_with_scope_matching_judgment",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "theory_compression_relevance",
    subject: "theory",
    dimensionIds: ["compression_relevance"],
    gapTypes: ["compression_relevance_gap"],
    whyWrongCode: "off_scope_or_uncompressed_paragraph",
    correctPrincipleCode: "keep_only_claims_needed_for_question_scope",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_assumptions",
    subject: "practice",
    dimensionIds: ["practice_assumptions"],
    gapTypes: ["practice_assumptions_gap"],
    whyWrongCode: "assumption_line_missing_or_unsupported",
    correctPrincipleCode: "state_assumption_metadata_before_calculation",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_data_selection",
    subject: "practice",
    dimensionIds: ["practice_data_selection"],
    gapTypes: ["practice_data_selection_gap"],
    whyWrongCode: "required_input_metadata_selected_incorrectly",
    correctPrincipleCode: "select_verified_input_metadata_before_formula",
    defaultRecoveryActionType: "recalculate",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_formula_metadata",
    subject: "practice",
    dimensionIds: ["practice_formula_metadata"],
    gapTypes: ["practice_formula_metadata_gap"],
    whyWrongCode: "formula_metadata_anchor_missing",
    correctPrincipleCode: "confirm_formula_anchor_then_restart_giii_sequence",
    defaultRecoveryActionType: "recalculate",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_calculation_trace",
    subject: "practice",
    dimensionIds: ["practice_calculation_trace"],
    gapTypes: ["practice_calculation_trace_gap"],
    whyWrongCode: "calculation_trace_break_detected",
    correctPrincipleCode: "restart_from_first_unsupported_step_with_giii",
    defaultRecoveryActionType: "recalculate",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_unit_rounding_time_adjustment",
    subject: "practice",
    dimensionIds: ["practice_unit_rounding_time_adjustment"],
    gapTypes: ["practice_unit_rounding_time_adjustment_gap"],
    whyWrongCode: "unit_rounding_or_time_adjustment_not_checked",
    correctPrincipleCode: "rerun_unit_rounding_time_adjustment_before_transfer",
    defaultRecoveryActionType: "recalculate",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_cross_check",
    subject: "practice",
    dimensionIds: ["practice_cross_check"],
    gapTypes: ["practice_cross_check_gap"],
    whyWrongCode: "independent_cross_check_missing",
    correctPrincipleCode: "perform_independent_cross_check_before_final_answer",
    defaultRecoveryActionType: "recalculate",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "practice_conclusion_writing",
    subject: "practice",
    dimensionIds: ["practice_conclusion_writing"],
    gapTypes: ["practice_conclusion_writing_gap"],
    whyWrongCode: "answer_sheet_conclusion_missing_unit_or_rounding",
    correctPrincipleCode: "write_conclusion_with_unit_and_rounding_metadata",
    defaultRecoveryActionType: "rewrite",
    nextReviewPolicy: "schedule_after_rewrite_or_recalculation",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "evidence_confirmation",
    subject: "all",
    dimensionIds: [],
    gapTypes: ["ocr_confirmation_needed", "learner_answer_evidence_missing"],
    whyWrongCode: "learner_evidence_not_confirmed_for_review",
    correctPrincipleCode: "confirm_evidence_before_error_notebook_release",
    defaultRecoveryActionType: "confirm_ocr",
    nextReviewPolicy: "confirm_evidence_first",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "source_release_blocker",
    subject: "all",
    dimensionIds: [],
    gapTypes: [
      "legal_source_verification_required",
      "concept_source_verification_blocked",
      "theory_dimension_evidence_unlinked",
      "practice_reference_package_verification_required",
      "practice_calculation_metadata_verification_required",
    ],
    whyWrongCode: "source_or_reference_release_not_ready",
    correctPrincipleCode: "withhold_error_note_until_verified_sources_and_reference_release",
    defaultRecoveryActionType: "withhold_until_verified",
    nextReviewPolicy: "withhold_until_verified",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "unsupported_practice_calculation",
    subject: "practice",
    dimensionIds: [],
    gapTypes: ["practice_calculation_unsupported_or_ambiguous"],
    whyWrongCode: "practice_calculation_not_supported_for_safe_recovery",
    correctPrincipleCode: "withhold_until_supported_unit_and_recalculation_metadata_pass",
    defaultRecoveryActionType: "withhold_until_verified",
    nextReviewPolicy: "withhold_until_verified",
  },
  {
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryId: "maintenance_review",
    subject: "all",
    dimensionIds: ["compression_relevance", "practice_cross_check"],
    gapTypes: [
      "maintain_compressed_theory_answer",
      "maintain_practice_recalculation_routine",
      "law_rewrite_polish",
    ],
    whyWrongCode: "no_current_deduction_keep_retrieval_active",
    correctPrincipleCode: "schedule_review_to_preserve_retrieval",
    defaultRecoveryActionType: "schedule_review",
    nextReviewPolicy: "schedule_maintenance",
  },
] as const;

export const S216_GAP_TAXONOMY = [...GAP_TAXONOMY];

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function isSourceBlocking(status: RubricEvidenceSourceStatus) {
  return SOURCE_BLOCKING_STATUSES.has(status);
}

function sourceStatusesNeedWithhold(review: CommonRubricEvidenceReviewContract): boolean {
  return [
    review.sourceStatus.problemMaterial,
    review.sourceStatus.referencePackage,
    review.sourceStatus.rubric,
    review.sourceStatus.officialRules,
    review.sourceStatus.calculation,
  ].some(isSourceBlocking);
}

function assertLearnerOnly(input: S216ErrorNotebookInput) {
  if (input.consumer !== "learner" || input.actorRole !== "learner") {
    throw new Error("s216-learner-instructor-boundary: automatic error notebook is learner metadata only");
  }
}

function validateHistory(history: RewriteRegradeHistoryContract | null) {
  if (!history) return ["rewrite_history_missing"] as S216WithholdReason[];
  const validation = validateRewriteRegradeHistoryContract(history);
  if (!validation.valid) {
    throw new Error(`invalid-s216-rewrite-history: ${validation.errors.join("; ")}`);
  }
  const reasons: S216WithholdReason[] = [];
  if (!history.derivedSignals.primaryGapId || !history.derivedSignals.nextActionId) reasons.push("primary_gap_missing");
  if (history.derivedSignals.evidenceRefIds.length === 0) reasons.push("learner_evidence_missing");
  if (history.derivedSignals.safeForS216ErrorNotebook !== true) reasons.push("rewrite_history_unresolved");
  return reasons;
}

function subjectForReviewMetadata(subjectReview: S216SubjectReviewMetadata): RubricEvidenceSubject {
  if (subjectReview.kind === "s211_law_answer_review_metadata") return "law";
  if (subjectReview.kind === "s212_theory_answer_review_metadata") return "theory";
  return "practice";
}

function subjectReviewWithholdReasons(
  subjectReview: S216SubjectReviewMetadata | null,
  subject: RubricEvidenceSubject,
): S216WithholdReason[] {
  if (!subjectReview) return ["subject_review_metadata_missing"];
  if (subjectForReviewMetadata(subjectReview) !== subject) return ["subject_review_unresolved"];

  if (subjectReview.kind === "s211_law_answer_review_metadata") {
    const ready = subjectReview.engineVersion === S211_LAW_ANSWER_REVIEW_ENGINE_VERSION
      && subjectReview.lawSourceGateStatus === "ready"
      && subjectReview.referencePackageGateStatus === "ready"
      && subjectReview.learnerRouteOnly
      && subjectReview.instructorRouteSeparated
      && subjectReview.academyTenantDataAccessed === false
      && subjectReview.metadataOnly
      && subjectReview.containsRawContent === false;
    return ready ? [] : ["subject_review_unresolved"];
  }

  if (subjectReview.kind === "s212_theory_answer_review_metadata") {
    const dimensionBlocked = Object.values(subjectReview.dimensionEvidence).some((status) => status !== "passed");
    const ready = subjectReview.engineVersion === S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION
      && subjectReview.conceptSourceVerification === "passed"
      && subjectReview.referencePackageVerification === "passed"
      && subjectReview.learnerAnswerEvidence === "passed"
      && !dimensionBlocked
      && subjectReview.learnerInstructorSeparation === "learner_only_no_instructor_route"
      && subjectReview.scoreLikeSummarySecondary
      && subjectReview.safeForS216ErrorNotebook
      && subjectReview.metadataOnly
      && subjectReview.containsRawContent === false;
    return ready ? [] : ["subject_review_unresolved"];
  }

  const dimensionBlocked = Object.values(subjectReview.dimensionEvidence).some((status) => status !== "passed");
  const metadataBlocked = Object.values(subjectReview.metadataChecks).some((status) => status !== "passed");
  const ready = subjectReview.engineVersion === S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION
    && subjectReview.referencePackageVerification === "passed"
    && subjectReview.calculationUnitSupport === "passed"
    && subjectReview.calculationReviewMetadata === "passed"
    && subjectReview.learnerAnswerEvidence === "passed"
    && !dimensionBlocked
    && !metadataBlocked
    && subjectReview.learnerInstructorSeparation === "learner_only_no_instructor_route"
    && subjectReview.calculatorModel === RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL
    && subjectReview.resetSafeHandKeyedRoutineOnly
    && subjectReview.storedProgramDependency === false
    && subjectReview.scoreLikeSummarySecondary
    && subjectReview.safeForS216ErrorNotebook
    && subjectReview.metadataOnly
    && subjectReview.containsRawContent === false;
  return ready ? [] : ["subject_review_unresolved"];
}

function referenceWithholdReasons(referenceStatus: S216ReferenceStatusSnapshot | null): S216WithholdReason[] {
  if (!referenceStatus) return ["reference_release_missing"];
  if (
    referenceStatus.releaseStatus !== "released"
    || referenceStatus.learningReferenceStatus !== "released_learning_reference"
    || referenceStatus.blockerCodes.length > 0
    || referenceStatus.requiredCaveatKey !== "learning_reference_not_official_answer"
  ) {
    return [referenceStatus.releaseStatus === "missing" ? "reference_release_missing" : "reference_release_blocked"];
  }
  return [];
}

function reviewWithholdReasons(review: CommonRubricEvidenceReviewContract | null): S216WithholdReason[] {
  if (!review) return ["review_contract_missing"];
  assertValidRubricEvidenceReviewContract(review);
  const reasons: S216WithholdReason[] = [];
  if (review.reviewStatus !== "ready") reasons.push("review_status_withheld");
  if (review.sourceStatus.learnerAnswer === "missing") reasons.push("learner_evidence_missing");
  if (review.sourceStatus.learnerAnswer === "ocr_confirmation_needed") reasons.push("learner_evidence_unconfirmed");
  if (sourceStatusesNeedWithhold(review)) reasons.push("source_or_release_unverified");
  if (!review.primaryGap.id || !review.primaryGap.gapType || review.primaryGap.evidenceRefIds.length === 0) {
    reasons.push("primary_gap_missing");
  }
  for (const candidate of review.deductionCandidates) {
    if (candidate.evidenceRefIds.length === 0) reasons.push("deduction_evidence_missing");
  }
  return unique(reasons);
}

function latestReviewLinkId(history: RewriteRegradeHistoryContract | null): string | null {
  if (!history) return null;
  const latestAttempt = history.attemptLineage.attempts.find((attempt) => attempt.attemptId === history.attemptLineage.latestAttemptId);
  return latestAttempt?.sourceReviewLink?.reviewId ?? history.reReviewRequests[history.reReviewRequests.length - 1]?.sourceReviewLink.reviewId ?? null;
}

function latestComparison(history: RewriteRegradeHistoryContract | null): AnswerAttemptComparisonMetadata | null {
  return history?.comparisons[history.comparisons.length - 1] ?? null;
}

function latestRequest(history: RewriteRegradeHistoryContract | null): ReReviewRequestContract | null {
  return history?.reReviewRequests[history.reReviewRequests.length - 1] ?? null;
}

function primaryDeduction(review: CommonRubricEvidenceReviewContract | null): DeductionCandidateContract | null {
  if (!review) return null;
  const primaryId = review.primaryGap.deductionCandidateIds[0];
  if (primaryId) {
    return review.deductionCandidates.find((candidate) => candidate.id === primaryId) ?? null;
  }
  return review.deductionCandidates[0] ?? null;
}

function taxonomyForGap(
  subject: RubricEvidenceSubject,
  gap: OneBiggestGapContract | null,
): S216GapTaxonomyEntry & { selectedBy: "dimension_id" | "gap_type" | "fallback" } {
  if (gap?.dimensionId) {
    const byDimension = GAP_TAXONOMY.find((entry) => (
      (entry.subject === subject || entry.subject === "all") && entry.dimensionIds.includes(gap.dimensionId ?? "")
    ));
    if (byDimension) return { ...byDimension, selectedBy: "dimension_id" };
  }

  if (gap?.gapType) {
    const byGapType = GAP_TAXONOMY.find((entry) => (
      (entry.subject === subject || entry.subject === "all") && entry.gapTypes.includes(gap.gapType)
    ));
    if (byGapType) return { ...byGapType, selectedBy: "gap_type" };
  }

  const fallback = GAP_TAXONOMY.find((entry) => entry.categoryId === "maintenance_review");
  if (!fallback) throw new Error("s216-taxonomy-fallback-missing");
  return { ...fallback, selectedBy: "fallback" };
}

function learnerEvidence(review: CommonRubricEvidenceReviewContract | null): S216LearnerEvidenceMetadata {
  const refs = review?.learnerAnswerEvidenceRefs ?? [];
  return {
    evidenceRefIds: refs.map((ref) => ref.id),
    evidenceRefKinds: unique(refs.map((ref) => ref.kind)),
    answerSubmissionIds: unique(refs.map((ref) => ref.answerSubmissionId)),
    verifiedByLearner: refs.length > 0 && refs.every((ref) => ref.verifiedByLearner),
    evidenceMaterialInEntry: false,
    learnerMaterialInEntry: false,
    ocrMaterialInEntry: false,
    containsRawContent: false,
  };
}

function sourceRefIds(review: CommonRubricEvidenceReviewContract | null, deduction: DeductionCandidateContract | null): string[] {
  return unique([
    ...(deduction?.sourceRefIds ?? []),
    ...(review?.sourceVerificationRefs.map((ref) => ref.id) ?? []),
  ]);
}

function buildWhyWrong(
  status: S216NotebookEntryStatus,
  taxonomy: S216GapTaxonomyEntry,
  review: CommonRubricEvidenceReviewContract | null,
  deduction: DeductionCandidateContract | null,
): S216WhyWrongMetadata {
  return {
    status,
    reasonCode: taxonomy.whyWrongCode,
    gapType: review?.primaryGap.gapType ?? taxonomy.gapTypes[0] ?? "missing_gap_metadata",
    dimensionId: review?.primaryGap.dimensionId ?? null,
    deductionCandidateId: deduction?.id ?? null,
    rootCauseId: deduction?.rootCauseId ?? null,
    evidenceRefIds: review?.primaryGap.evidenceRefIds ?? [],
    confidenceLevel: review?.primaryGap.confidence.level ?? "low",
    containsRawContent: false,
  };
}

function buildCorrectPrinciple(
  status: S216NotebookEntryStatus,
  taxonomy: S216GapTaxonomyEntry,
  review: CommonRubricEvidenceReviewContract | null,
  deduction: DeductionCandidateContract | null,
  referenceStatus: S216ReferenceStatusSnapshot,
): S216CorrectPrincipleMetadata {
  return {
    status,
    principleCode: taxonomy.correctPrincipleCode,
    sourceRefIds: sourceRefIds(review, deduction),
    conceptNodeIds: review?.primaryGap.conceptNodeIds ?? [],
    referencePackageId: referenceStatus.referencePackageId,
    referenceReleaseStatus: referenceStatus.releaseStatus,
    requiredCaveatKey: referenceStatus.requiredCaveatKey,
    sourceVerificationStatus: status === "ready" ? "verified" : "withheld",
    sourceMaterialInEntry: false,
    referenceProseInEntry: false,
    containsRawContent: false,
  };
}

function fallbackAction(
  status: S216NotebookEntryStatus,
  taxonomy: S216GapTaxonomyEntry,
  review: CommonRubricEvidenceReviewContract | null,
): S216RecoveryActionType {
  if (status === "withheld") {
    if (review?.sourceStatus.learnerAnswer === "ocr_confirmation_needed") return "confirm_ocr";
    return "withhold_until_verified";
  }
  return review?.nextAction.actionType ?? taxonomy.defaultRecoveryActionType;
}

function buildImmediateFix(
  status: S216NotebookEntryStatus,
  taxonomy: S216GapTaxonomyEntry,
  review: CommonRubricEvidenceReviewContract | null,
  deduction: DeductionCandidateContract | null,
): S216ImmediateFixMetadata {
  const actionType = fallbackAction(status, taxonomy, review);
  const hook = status === "ready" ? review?.rewriteOrRecalculationHook : null;
  return {
    status,
    actionType,
    instructionKey: status === "ready"
      ? (deduction?.immediateFix ?? review?.nextAction.learnerFacingInstruction ?? taxonomy.correctPrincipleCode)
      : `${actionType}_before_error_notebook_release`,
    targetGapId: review?.primaryGap.id ?? null,
    evidenceRefIds: review?.primaryGap.evidenceRefIds ?? [],
    hookKind: hook?.kind ?? (status === "ready" ? "scheduled_review" : "withheld"),
    calculator: hook?.calculator ?? null,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    containsRawContent: false,
  };
}

function buildRecurrence(
  status: S216NotebookEntryStatus,
  history: RewriteRegradeHistoryContract | null,
  deduction: DeductionCandidateContract | null,
): S216RecurrenceMetadata {
  const comparison = latestComparison(history);
  if (status === "withheld" || !history) {
    return {
      status: "withheld",
      comparisonId: comparison?.comparisonId ?? null,
      improvementStatus: history?.derivedSignals.improvementStatus ?? null,
      duplicateRootCauseGroupId: deduction?.duplicateRootCauseGroupId ?? null,
      recurringDeductionCandidateIds: comparison?.recurringDeductionCandidateIds ?? [],
      resolvedDeductionCandidateIds: comparison?.resolvedDeductionCandidateIds ?? [],
      newDeductionCandidateIds: comparison?.newDeductionCandidateIds ?? [],
      evidenceRefIds: comparison?.evidenceRefIds ?? history?.derivedSignals.evidenceRefIds ?? [],
      containsRawContent: false,
    };
  }
  if (!comparison || comparison.comparisonStatus !== "compared") {
    return {
      status: "not_compared_yet",
      comparisonId: comparison?.comparisonId ?? null,
      improvementStatus: history.derivedSignals.improvementStatus,
      duplicateRootCauseGroupId: deduction?.duplicateRootCauseGroupId ?? null,
      recurringDeductionCandidateIds: comparison?.recurringDeductionCandidateIds ?? [],
      resolvedDeductionCandidateIds: comparison?.resolvedDeductionCandidateIds ?? [],
      newDeductionCandidateIds: comparison?.newDeductionCandidateIds ?? [],
      evidenceRefIds: history.derivedSignals.evidenceRefIds,
      containsRawContent: false,
    };
  }

  const candidateId = deduction?.id ?? null;
  const recurrenceStatus: S216RecurrenceMetadata["status"] = candidateId && comparison.recurringDeductionCandidateIds.includes(candidateId)
    ? "recurring"
    : candidateId && comparison.resolvedDeductionCandidateIds.includes(candidateId)
      ? "resolved_in_latest_attempt"
      : "first_seen";

  return {
    status: recurrenceStatus,
    comparisonId: comparison.comparisonId,
    improvementStatus: comparison.improvement.status,
    duplicateRootCauseGroupId: deduction?.duplicateRootCauseGroupId ?? null,
    recurringDeductionCandidateIds: comparison.recurringDeductionCandidateIds,
    resolvedDeductionCandidateIds: comparison.resolvedDeductionCandidateIds,
    newDeductionCandidateIds: comparison.newDeductionCandidateIds,
    evidenceRefIds: comparison.evidenceRefIds,
    containsRawContent: false,
  };
}

function buildRecovery(
  status: S216NotebookEntryStatus,
  review: CommonRubricEvidenceReviewContract | null,
  history: RewriteRegradeHistoryContract | null,
  taxonomy: S216GapTaxonomyEntry,
): S216RecoveryMetadata {
  const actionType = fallbackAction(status, taxonomy, review);
  const request = latestRequest(history);
  return {
    status,
    recoveryActionType: actionType,
    hookKind: status === "ready" ? (review?.rewriteOrRecalculationHook.kind ?? "scheduled_review") : "withheld",
    targetGapId: review?.primaryGap.id ?? null,
    retryReviewAllowed: status === "ready" ? (review?.rewriteOrRecalculationHook.retryReviewAllowed ?? false) : false,
    reReviewRequestId: request?.requestId ?? null,
    rewriteHistoryId: history?.historyId ?? null,
    safeForS217ConceptGraph: status === "ready" && history?.derivedSignals.safeForS217ConceptGraph === true,
    containsRawContent: false,
  };
}

function buildNextReview(
  status: S216NotebookEntryStatus,
  review: CommonRubricEvidenceReviewContract | null,
  history: RewriteRegradeHistoryContract | null,
  taxonomy: S216GapTaxonomyEntry,
): S216NextReviewMetadata {
  if (status === "withheld") {
    return {
      status: "not_ready",
      reviewDueHint: "not_ready",
      nextActionId: review?.nextAction.id ?? history?.derivedSignals.nextActionId ?? null,
      todayPlanContributionCount: 0,
      reviewQueueCandidate: false,
      containsRawContent: false,
    };
  }

  const reviewDueHint = history?.derivedSignals.reviewDueHint ?? "none";
  const scheduled = reviewDueHint === "schedule_review" || taxonomy.nextReviewPolicy === "schedule_maintenance";
  return {
    status: scheduled ? "scheduled" : "queued_after_recovery",
    reviewDueHint,
    nextActionId: review?.nextAction.id ?? history?.derivedSignals.nextActionId ?? null,
    todayPlanContributionCount: 1,
    reviewQueueCandidate: true,
    containsRawContent: false,
  };
}

function fallbackReferenceStatus(): S216ReferenceStatusSnapshot {
  return {
    referencePackageId: null,
    releaseGateVersion: "not_supplied",
    releaseStatus: "missing",
    learningReferenceStatus: "missing",
    blockerCodes: [],
    requiredCaveatKey: null,
    officialClaimAllowed: false,
    officialGradingClaimAllowed: false,
    officialModelAnswerClaimAllowed: false,
    confirmedScoreClaimAllowed: false,
    passProbabilityAllowed: false,
    passGuaranteeAllowed: false,
    containsRawContent: false,
  };
}

function buildEntry(input: S216ErrorNotebookInput): S216AutomaticErrorNotebookEntry {
  assertNoRawUserDataInDerived(input);
  assertLearnerOnly(input);
  const historyReasons = validateHistory(input.rewriteHistory);
  const reasons = unique<S216WithholdReason>([
    ...reviewWithholdReasons(input.review),
    ...historyReasons,
    ...subjectReviewWithholdReasons(input.subjectReview, input.subject),
    ...referenceWithholdReasons(input.referenceStatus),
  ]);
  const status: S216NotebookEntryStatus = reasons.length === 0 ? "ready" : "withheld";
  const referenceStatus = input.referenceStatus ?? fallbackReferenceStatus();
  const deduction = primaryDeduction(input.review);
  const taxonomy = taxonomyForGap(input.subject, input.review?.primaryGap ?? null);
  const sourceIds = sourceRefIds(input.review, deduction);

  const entry = sanitizeDerivedMetadata({
    version: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    dataClass: "derived_learning_metadata",
    entryId: input.entryId,
    createdAt: input.createdAt,
    status,
    withhold: {
      withheld: status !== "ready",
      reasons,
      reviewReasons: input.review?.withhold.reasons ?? [],
      referenceBlockerCodes: referenceStatus.blockerCodes,
    },
    examMode: "second",
    subject: input.subject,
    subjectLabel: input.review?.subjectLabel ?? input.subjectLabel,
    questionId: input.questionId,
    answerSubmissionId: input.answerSubmissionId,
    rootAnswerSubmissionId: input.rewriteHistory?.rootAnswerSubmissionId ?? null,
    sourceReview: {
      reviewStatus: input.review?.reviewStatus ?? "missing",
      sourceReviewId: latestReviewLinkId(input.rewriteHistory),
      primaryGapId: input.review?.primaryGap.id ?? null,
      primaryGapType: input.review?.primaryGap.gapType ?? null,
      deductionCandidateIds: input.review?.deductionCandidates.map((candidate) => candidate.id) ?? [],
      sourceRefIds: sourceIds,
      rewriteOrRecalculationHookKind: input.review?.rewriteOrRecalculationHook.kind ?? "withheld",
    },
    gapTaxonomy: taxonomy,
    learnerEvidence: learnerEvidence(input.review),
    whyWrong: buildWhyWrong(status, taxonomy, input.review, deduction),
    correctPrinciple: buildCorrectPrinciple(status, taxonomy, input.review, deduction, referenceStatus),
    immediateFix: buildImmediateFix(status, taxonomy, input.review, deduction),
    recurrence: buildRecurrence(status, input.rewriteHistory, deduction),
    recovery: buildRecovery(status, input.review, input.rewriteHistory, taxonomy),
    nextReview: buildNextReview(status, input.review, input.rewriteHistory, taxonomy),
    referenceStatus,
    learnerInstructorBoundary: {
      learnerRouteOnly: true,
      instructorRouteSeparated: true,
      academyTenantDataAccessed: false,
      instructorRuntimeRouteChanged: false,
      learnerInstructorDataMerged: false,
    },
    authorityFlags: {
      nonOfficial: true,
      officialGrading: false,
      officialModelAnswer: false,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
    },
    dataBoundary: {
      metadataOnly: true,
      learnerMaterialInEntry: false,
      ocrMaterialInEntry: false,
      officialMaterialInEntry: false,
      referenceProseInEntry: false,
      sourceMaterialInEntry: false,
      calculationTraceInEntry: false,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      globalReferenceWrite: false,
      academyTenantDataAccessed: false,
      modelTrainingUse: false,
      telemetrySafe: true,
      containsRawContent: false,
    },
  }) as S216AutomaticErrorNotebookEntry;

  assertNoRawUserDataInDerived(entry);
  return entry;
}

function addRequiredStringError(errors: string[], value: unknown, path: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

export function validateS216ErrorNotebookEntry(entry: S216AutomaticErrorNotebookEntry): S216ErrorNotebookValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    assertNoRawUserDataInDerived(entry);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "raw-user-data-in-derived-metadata");
  }

  if (entry.version !== S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION) errors.push("entry.version must be S216 taxonomy version");
  if (entry.dataClass !== "derived_learning_metadata") errors.push("entry.dataClass must be derived_learning_metadata");
  if (entry.examMode !== "second") errors.push("entry.examMode must be second");
  addRequiredStringError(errors, entry.entryId, "entryId");
  addRequiredStringError(errors, entry.createdAt, "createdAt");
  addRequiredStringError(errors, entry.questionId, "questionId");
  addRequiredStringError(errors, entry.answerSubmissionId, "answerSubmissionId");

  if (entry.withhold.withheld !== (entry.status !== "ready")) {
    errors.push("withhold.withheld must match entry.status");
  }
  if (entry.status === "ready" && entry.withhold.reasons.length > 0) {
    errors.push("ready S216 entries must not carry withhold reasons");
  }
  if (entry.status === "withheld" && entry.withhold.reasons.length === 0) {
    errors.push("withheld S216 entries must include withhold reasons");
  }
  if (entry.status === "ready") {
    if (entry.learnerEvidence.evidenceRefIds.length === 0) errors.push("ready S216 entries require learner evidence refs");
    if (!entry.learnerEvidence.verifiedByLearner) errors.push("ready S216 entries require learner-confirmed evidence");
    if (entry.referenceStatus.releaseStatus !== "released") errors.push("ready S216 entries require released reference status");
    if (entry.referenceStatus.learningReferenceStatus !== "released_learning_reference") {
      errors.push("ready S216 entries require released learning reference status");
    }
    if (entry.referenceStatus.requiredCaveatKey !== "learning_reference_not_official_answer") {
      errors.push("ready S216 entries require the learning-reference caveat");
    }
    if (entry.nextReview.todayPlanContributionCount > 1) errors.push("S216 can contribute at most one Today Plan task");
  }

  if (entry.authorityFlags.officialGrading !== false) errors.push("S216 must not allow official grading");
  if (entry.authorityFlags.officialModelAnswer !== false) errors.push("S216 must not allow official model answers");
  if (entry.authorityFlags.confirmedScore !== false) errors.push("S216 must not allow confirmed scores");
  if (entry.authorityFlags.passProbability !== false) errors.push("S216 must not allow pass probability");
  if (entry.authorityFlags.passGuarantee !== false) errors.push("S216 must not allow pass guarantees");
  if (entry.learnerInstructorBoundary.learnerRouteOnly !== true) errors.push("S216 must remain learner route only");
  if (entry.learnerInstructorBoundary.instructorRouteSeparated !== true) errors.push("S216 must preserve instructor separation");
  if (entry.learnerInstructorBoundary.academyTenantDataAccessed !== false) errors.push("S216 must not access academy tenant data");
  if (entry.dataBoundary.metadataOnly !== true) errors.push("S216 entry must be metadata-only");
  if (entry.dataBoundary.learnerMaterialInEntry !== false) errors.push("S216 must not store learner material");
  if (entry.dataBoundary.ocrMaterialInEntry !== false) errors.push("S216 must not store OCR material");
  if (entry.dataBoundary.referenceProseInEntry !== false) errors.push("S216 must not store reference prose");
  if (entry.dataBoundary.calculationTraceInEntry !== false) errors.push("S216 must not store calculation trace");
  if (entry.dataBoundary.providerRuntimeCalled !== false) errors.push("S216 must not call provider runtime");
  if (entry.dataBoundary.ocrRuntimeCalled !== false) errors.push("S216 must not call OCR runtime");
  if (entry.dataBoundary.modelTrainingUse !== false) errors.push("S216 must not use learner material for model training");

  if (entry.status === "ready" && entry.immediateFix.actionType === "recalculate" && !entry.immediateFix.calculator) {
    errors.push("ready recalculation fixes must preserve the fixed GIII calculator policy");
  }
  if (entry.immediateFix.calculator) {
    if (entry.immediateFix.calculator.model !== RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL) errors.push("calculator model must be casio_fx_9860giii");
    if (entry.immediateFix.calculator.resetSafeHandKeyedRoutineOnly !== true) errors.push("calculator routine must be reset-safe and hand-keyed");
    if (entry.immediateFix.calculator.storedProgramDependency !== false) errors.push("calculator routine must not depend on stored programs");
  }

  if (entry.referenceStatus.releaseStatus === "blocked" && !entry.withhold.referenceBlockerCodes.length) {
    warnings.push("blocked reference status should preserve release blocker codes when available");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildS216ErrorNotebookEntry(input: S216ErrorNotebookInput): S216ErrorNotebookBuildResult {
  const entry = buildEntry(input);
  const validation = validateS216ErrorNotebookEntry(entry);
  if (!validation.valid) {
    throw new Error(`invalid-s216-error-notebook-entry: ${validation.errors.join("; ")}`);
  }
  return {
    version: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    entry,
    validation,
  };
}

export function buildS216ReferenceStatusFromS215(
  result: S215ReferenceAnswerReleaseGateResult,
): S216ReferenceStatusSnapshot {
  return {
    referencePackageId: result.referencePackageId,
    releaseGateVersion: S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
    releaseStatus: result.status,
    learningReferenceStatus: result.releaseDecision.learningReferenceStatus,
    blockerCodes: result.blockerCodes,
    requiredCaveatKey: result.releaseDecision.requiredCaveatKey,
    officialClaimAllowed: result.releaseDecision.officialClaimAllowed,
    officialGradingClaimAllowed: result.releaseDecision.officialGradingClaimAllowed,
    officialModelAnswerClaimAllowed: result.releaseDecision.officialModelAnswerClaimAllowed,
    confirmedScoreClaimAllowed: result.releaseDecision.confirmedScoreClaimAllowed,
    passProbabilityAllowed: result.releaseDecision.passProbabilityAllowed,
    passGuaranteeAllowed: result.releaseDecision.passGuaranteeAllowed,
    containsRawContent: false,
  };
}

export function buildS216GapTaxonomyReport() {
  const subjectCounts: Record<RubricEvidenceSubject | "all", number> = {
    law: 0,
    theory: 0,
    practice: 0,
    all: 0,
  };
  for (const entry of GAP_TAXONOMY) {
    subjectCounts[entry.subject] += 1;
  }
  return sanitizeDerivedMetadata({
    taxonomyVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    categoryCount: GAP_TAXONOMY.length,
    subjectCounts,
    includesLawCategories: subjectCounts.law > 0,
    includesTheoryCategories: subjectCounts.theory > 0,
    includesPracticeCategories: subjectCounts.practice > 0,
    metadataOnly: true,
    containsRawContent: false,
  });
}

export function assertS216FixtureMetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  const serialized = JSON.stringify(value);
  if (/official grading|official model answer|pass probability|pass guarantee|confirmed score/i.test(serialized)) {
    throw new Error("s216-fixture-prohibited-authority-claim");
  }
  if (/"(?:answerText|questionText|referenceAnswerText|providerPayload|sourceExcerpt|ocrText)"\s*:/i.test(serialized)) {
    throw new Error("s216-fixture-raw-content-field");
  }
}

export { REWRITE_REGRADE_HISTORY_CONTRACT_VERSION };
