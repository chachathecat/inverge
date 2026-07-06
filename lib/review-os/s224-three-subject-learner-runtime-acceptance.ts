import {
  ANSWER_SUBMISSION_OCR_TRUST_COPY,
  buildLearnerAnswerSubmissionDerivedMetadata,
  buildLearnerAnswerSubmissionPersistenceContract,
  type LearnerAnswerSubmissionDerivedMetadata,
  type LearnerAnswerSubmissionInputKind,
  type LearnerAnswerSubmissionOcrState,
} from "./answer-submission-contract";
import { buildCognitiveLearningActionUnit, type RetrievalPracticePattern } from "./cognitive-learning-actions";
import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
} from "./rewrite-regrade-history-contract";
import {
  RUBRIC_EVIDENCE_CONTRACT_VERSION,
  RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL,
  type OneNextActionContract,
  type RubricEvidenceSubject,
  type RewriteOrRecalculationTaskHook,
} from "./rubric-evidence-contract";
import { S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION } from "./s216-error-notebook-gap-taxonomy";
import { S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION } from "./s217-personal-core-concept-graph";
import { S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION } from "./s218-similar-question-review-scheduler";
import { S220_BILLING_ENTITLEMENT_VERSION, S220_IDEMPOTENT_USAGE_VERSION } from "./s220-billing-entitlement-credit-usage";
import { S221_COST_GUARDRAIL_VERSION, S221_PAID_TRUST_VERSION } from "./s221-paid-trust-privacy-cost-guardrails";
import { S222_ACADEMY_ANSWER_OPERATIONS_VERSION } from "./s222-academy-answer-operations-tenant-boundary";
import { S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION } from "./s223-three-subject-corpus-reference-quality-acceptance";
import { S211_LAW_ANSWER_REVIEW_ENGINE_VERSION } from "./s211-law-answer-review-engine";
import { S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION } from "./theory-answer-review-engine";
import { S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION } from "./practice-answer-review-engine";
import { TODAY_PLAN_MAX_PRIMARY_TASKS } from "./today-plan-engine";
import type { SourceType } from "./types";

export const S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION =
  "s224.three_subject_learner_runtime_acceptance.v1" as const;

export type S224ImplementationMode = "learner_runtime_acceptance_report";
export type S224AcceptanceStatus = "accepted_for_s225_final_launch_gate" | "blocked";
export type S224SubjectAcceptanceStatus = "accepted";
export type S224Subject = RubricEvidenceSubject;
export type S224ReviewEngineId = "s211_law" | "s212_theory" | "s213_practice";
export type S224CaptureTrustCopyStatus = "s204_trust_copy_present" | "missing";
export type S224RuntimeEvidenceLevel =
  | "source_level_contract_and_static_route_audit"
  | "production_build_and_route_smoke"
  | "manual_preview_notes";

export type S224RuntimeBoundary = {
  learnerRouteChanged: false;
  academyRuntimeRouteChanged: false;
  instructorRouteChanged: false;
  authChanged: false;
  checkoutAdded: false;
  paymentWebhookAdded: false;
  billingProviderCalled: false;
  productionBillingActivated: false;
  entitlementEnforcementActivated: false;
  productionPricingUiAdded: false;
  providerRuntimeExpanded: false;
  ocrRuntimeExpanded: false;
  publicArchiveUiAdded: false;
  rawCorpusExpansionAdded: false;
  supabaseMigrationAdded: false;
  workflowChanged: false;
};

export type S224DataBoundary = {
  metadataOnly: true;
  learnerMaterialIncluded: false;
  ocrMaterialIncluded: false;
  problemMaterialIncluded: false;
  referenceProseIncluded: false;
  sourceExcerptIncluded: false;
  providerPayloadIncluded: false;
  credentialIncluded: false;
  paymentSecretIncluded: false;
  billingSecretIncluded: false;
  assetBytesIncluded: false;
  globalReferenceWrite: false;
  academyTenantDataAccessed: false;
  modelTrainingUse: false;
  containsRawContent: false;
};

export type S224AuthorityBoundary = {
  learningSupportOnly: true;
  authorityClaimAllowed: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  confirmedScoreClaimAllowed: false;
  passProbabilityClaimAllowed: false;
  passFailPredictionClaimAllowed: false;
  guaranteeClaimAllowed: false;
};

export type S224AnswerCaptureAcceptance = {
  captureStatus: "prepared";
  captureRouteIds: string[];
  answerReviewRouteId: "/answer-review";
  captureContractVersion: LearnerAnswerSubmissionDerivedMetadata["contractVersion"];
  sourceType: SourceType;
  inputKind: LearnerAnswerSubmissionInputKind;
  ocrConfirmationState: LearnerAnswerSubmissionOcrState;
  editableBeforeSave: true;
  ocrConfirmedByLearner: boolean;
  trustCopyStatus: S224CaptureTrustCopyStatus;
  learnerOwned: true;
  globalReferenceWrite: false;
  modelTrainingUse: false;
  containsRawContent: false;
};

export type S224EvidenceReviewAcceptance = {
  reviewStatusPath: "ready_or_fail_closed_by_source_gate";
  reviewEngineId: S224ReviewEngineId;
  reviewEngineVersion: string;
  rubricContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  oneBiggestGapPresent: true;
  oneNextActionPresent: true;
  nextActionType: OneNextActionContract["actionType"];
  resultStartsWithGapAndAction: true;
  scoreLikeSummarySecondary: true;
  terminalLearnerAction: "rewrite_or_recalculation_or_scheduled_review";
  learnerSafeCopyStatus: "verified";
  authorityClaimsDisabled: true;
};

export type S224RetrievalCheckAcceptance = {
  retrievalCheckStatus: "prepared";
  retrievalSeconds: 10;
  retrievalPattern: RetrievalPracticePattern;
  productionBeforeExplanation: true;
};

export type S224ContinuationAcceptance = {
  taskHookKind: RewriteOrRecalculationTaskHook["kind"];
  rewriteOrCalculationContinuation: "rewrite" | "recalculation";
  retryReviewAllowed: true;
  reviewQueueCandidatePrepared: true;
  todayPlanCandidatePrepared: true;
  notesCandidatePrepared: true;
  todayPlanMaxPrimaryTasks: typeof TODAY_PLAN_MAX_PRIMARY_TASKS;
  reviewQueueRouteId: "/app/review";
  todayPlanRouteId: "/app/today";
  notesRouteId: "/app/notes";
  calculator:
    | {
        model: typeof RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL;
        resetSafeHandKeyedRoutineOnly: true;
        storedProgramDependency: false;
      }
    | null;
};

export type S224SubjectRuntimeFlow = {
  subject: S224Subject;
  subjectLabel: string;
  acceptanceStatus: S224SubjectAcceptanceStatus;
  answerCapture: S224AnswerCaptureAcceptance;
  evidenceReview: S224EvidenceReviewAcceptance;
  retrievalCheck: S224RetrievalCheckAcceptance;
  continuation: S224ContinuationAcceptance;
  learnerInstructorBoundary: {
    learnerRouteOnly: true;
    instructorRouteSeparated: true;
    academyTenantDataAccessed: false;
    instructorRuntimeRouteChanged: false;
    learnerInstructorDataMerged: false;
  };
  dataBoundary: S224DataBoundary;
  authorityBoundary: S224AuthorityBoundary;
};

export type S224RuntimeEvidence = {
  evidenceLevel: S224RuntimeEvidenceLevel;
  routeSmokeTargets: string[];
  sourceLevelTestFile: "tests/s224-three-subject-learner-runtime-acceptance.test.mjs";
  liveBrowserSessionRun: boolean;
  productionBuildRun: boolean;
  focusedRouteSmokeRun: boolean;
  limitedRuntimeEvidenceReason: string | null;
  runtimeEvidenceDocumentedHonestly: true;
  containsRawContent: false;
};

export type S224ThreeSubjectLearnerRuntimeAcceptanceContract = {
  version: typeof S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION;
  implementationMode: S224ImplementationMode;
  upstreamContracts: {
    s204AnswerSubmissionContract: "s204.learner_answer_submission.v1";
    s205RubricEvidenceContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
    s206RewriteRegradeHistoryVersion: typeof REWRITE_REGRADE_HISTORY_CONTRACT_VERSION;
    s211LawEngineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
    s212TheoryEngineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
    s213PracticeEngineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
    s216ErrorNotebookVersion: typeof S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION;
    s217ConceptGraphVersion: typeof S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION;
    s218ReviewSchedulerVersion: typeof S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION;
    s220EntitlementVersion: typeof S220_BILLING_ENTITLEMENT_VERSION;
    s220IdempotentUsageVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
    s221PaidTrustVersion: typeof S221_PAID_TRUST_VERSION;
    s221CostGuardrailVersion: typeof S221_COST_GUARDRAIL_VERSION;
    s222AcademyBoundaryVersion: typeof S222_ACADEMY_ANSWER_OPERATIONS_VERSION;
    s223CorpusAcceptanceVersion: typeof S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION;
  };
  subjectScope: S224Subject[];
  learnerLoopOrder: readonly [
    "answer_capture_input",
    "editable_trust_confirmation",
    "evidence_review",
    "one_biggest_gap",
    "one_next_action",
    "ten_second_retrieval_check",
    "rewrite_or_calculation_process",
    "review_queue_today_plan_notes_continuation",
  ];
  routeSmokeTargets: string[];
  requiredSignals: string[];
  runtimeBoundary: S224RuntimeBoundary;
  dataBoundary: S224DataBoundary;
  authorityBoundary: S224AuthorityBoundary;
};

export type S224ReadinessReport = {
  version: typeof S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION;
  valid: boolean;
  implementationMode: S224ImplementationMode;
  acceptanceStatus: S224AcceptanceStatus;
  publicPaidLaunchReadinessStatus: "blocked_until_s225";
  subjectFlows: S224SubjectRuntimeFlow[];
  totals: {
    subjectCount: number;
    acceptedSubjectCount: number;
    answerCaptureReadySubjectCount: number;
    editableConfirmationSubjectCount: number;
    subjectSpecificGapActionSubjectCount: number;
    retrievalCheckSubjectCount: number;
    continuationSubjectCount: number;
    todayPlanMaxPrimaryTasks: typeof TODAY_PLAN_MAX_PRIMARY_TASKS;
    routeSmokeTargetCount: number;
    publicPaidLaunchAllowedSubjectCount: 0;
  };
  runtimeEvidence: S224RuntimeEvidence;
  runtimeBoundary: S224RuntimeBoundary;
  dataBoundary: S224DataBoundary;
  authorityBoundary: S224AuthorityBoundary;
  metadataOnly: true;
  containsRawContent: false;
  safeUse: "s224_learner_runtime_acceptance_for_s225_only";
};

export type S224ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

type SubjectFlowConfig = {
  subject: S224Subject;
  subjectLabel: string;
  sourceType: SourceType;
  reviewEngineId: S224ReviewEngineId;
  reviewEngineVersion: string;
  primaryGapType: string;
  nextActionInstructionKey: string;
  nextTaskType: RetrievalPracticePattern;
  nextActionType: OneNextActionContract["actionType"];
  taskHookKind: RewriteOrRecalculationTaskHook["kind"];
  routeIds: string[];
};

type S224ReportInput = {
  runtimeEvidence?: Partial<S224RuntimeEvidence>;
};

const SUBJECTS: S224Subject[] = ["practice", "theory", "law"];

const LEARNER_LOOP_ORDER: S224ThreeSubjectLearnerRuntimeAcceptanceContract["learnerLoopOrder"] = [
  "answer_capture_input",
  "editable_trust_confirmation",
  "evidence_review",
  "one_biggest_gap",
  "one_next_action",
  "ten_second_retrieval_check",
  "rewrite_or_calculation_process",
  "review_queue_today_plan_notes_continuation",
];

const ROUTE_SMOKE_TARGETS = [
  "/answer-review",
  "/app/capture",
  "/app/today",
  "/app/review",
  "/app/notes",
  "/app/calculator",
] as const;

const SUBJECT_FLOW_CONFIGS: SubjectFlowConfig[] = [
  {
    subject: "practice",
    subjectLabel: "appraiser_second_round_practice",
    sourceType: "image",
    reviewEngineId: "s213_practice",
    reviewEngineVersion: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
    primaryGapType: "practice_calculation_trace_gap",
    nextActionInstructionKey: "recalculate_with_reset_safe_giii_unit_rounding_check",
    nextTaskType: "calculation_process_check",
    nextActionType: "recalculate",
    taskHookKind: "recalculation",
    routeIds: ["/app/capture", "/answer-review", "/app/calculator"],
  },
  {
    subject: "theory",
    subjectLabel: "appraiser_second_round_theory",
    sourceType: "text",
    reviewEngineId: "s212_theory",
    reviewEngineVersion: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
    primaryGapType: "theory_application_evaluation_gap",
    nextActionInstructionKey: "rewrite_one_theory_paragraph_with_definition_basis_application",
    nextTaskType: "outline_recall",
    nextActionType: "rewrite",
    taskHookKind: "rewrite",
    routeIds: ["/app/capture", "/answer-review"],
  },
  {
    subject: "law",
    subjectLabel: "appraiser_second_round_law",
    sourceType: "pdf",
    reviewEngineId: "s211_law",
    reviewEngineVersion: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
    primaryGapType: "law_requirement_decomposition",
    nextActionInstructionKey: "rewrite_one_law_issue_requirement_application_paragraph",
    nextTaskType: "issue_recall",
    nextActionType: "rewrite",
    taskHookKind: "rewrite",
    routeIds: ["/app/capture", "/answer-review"],
  },
];

const RUNTIME_BOUNDARY: S224RuntimeBoundary = {
  learnerRouteChanged: false,
  academyRuntimeRouteChanged: false,
  instructorRouteChanged: false,
  authChanged: false,
  checkoutAdded: false,
  paymentWebhookAdded: false,
  billingProviderCalled: false,
  productionBillingActivated: false,
  entitlementEnforcementActivated: false,
  productionPricingUiAdded: false,
  providerRuntimeExpanded: false,
  ocrRuntimeExpanded: false,
  publicArchiveUiAdded: false,
  rawCorpusExpansionAdded: false,
  supabaseMigrationAdded: false,
  workflowChanged: false,
};

const DATA_BOUNDARY: S224DataBoundary = {
  metadataOnly: true,
  learnerMaterialIncluded: false,
  ocrMaterialIncluded: false,
  problemMaterialIncluded: false,
  referenceProseIncluded: false,
  sourceExcerptIncluded: false,
  providerPayloadIncluded: false,
  credentialIncluded: false,
  paymentSecretIncluded: false,
  billingSecretIncluded: false,
  assetBytesIncluded: false,
  globalReferenceWrite: false,
  academyTenantDataAccessed: false,
  modelTrainingUse: false,
  containsRawContent: false,
};

const AUTHORITY_BOUNDARY: S224AuthorityBoundary = {
  learningSupportOnly: true,
  authorityClaimAllowed: false,
  officialGradingClaimAllowed: false,
  officialModelAnswerClaimAllowed: false,
  confirmedScoreClaimAllowed: false,
  passProbabilityClaimAllowed: false,
  passFailPredictionClaimAllowed: false,
  guaranteeClaimAllowed: false,
};

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "answerText",
  "rawAnswerText",
  "userAnswerText",
  "ocrText",
  "rawOcrText",
  "problemText",
  "questionText",
  "referenceText",
  "generatedAnswerProse",
  "sourceExcerpt",
  "providerPayload",
  "paymentSecret",
  "billingSecret",
  "credential",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "assetBytes",
]);

const AUTHORITY_FLAG_KEYS = new Set([
  "authorityClaimAllowed",
  "officialGradingClaimAllowed",
  "officialModelAnswerClaimAllowed",
  "confirmedScoreClaimAllowed",
  "passProbabilityClaimAllowed",
  "passFailPredictionClaimAllowed",
  "guaranteeClaimAllowed",
  "officialGrading",
  "officialModelAnswer",
  "confirmedScore",
  "passProbability",
  "passGuarantee",
]);

const FORBIDDEN_AUTHORITY_COPY_PATTERNS = [
  /official\s+grading/i,
  /official\s+model[- ]?answer/i,
  /confirmed\s+score/i,
  /pass\s+probability/i,
  /pass\/fail\s+prediction/i,
  /pass\s+guarantee/i,
  /guaranteed\s+score/i,
];

function runtimeBoundary(): S224RuntimeBoundary {
  return { ...RUNTIME_BOUNDARY };
}

function dataBoundary(): S224DataBoundary {
  return { ...DATA_BOUNDARY };
}

function authorityBoundary(): S224AuthorityBoundary {
  return { ...AUTHORITY_BOUNDARY };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertS224BoundaryObject(value: unknown, path = "metadata"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertS224BoundaryObject(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string") {
      for (const pattern of FORBIDDEN_AUTHORITY_COPY_PATTERNS) {
        if (pattern.test(value)) throw new Error(`s224-forbidden-authority-copy:${path}`);
      }
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) && child !== false && child !== null) {
      throw new Error(`s224-forbidden-raw-content-field:${path}.${key}`);
    }
    if (AUTHORITY_FLAG_KEYS.has(key) && child !== false) {
      throw new Error(`s224-forbidden-authority-claim-field:${path}.${key}`);
    }
    assertS224BoundaryObject(child, `${path}.${key}`);
  }
}

function boundaryHasOnlyFalseValues(boundary: S224RuntimeBoundary) {
  return Object.values(boundary).every((value) => value === false);
}

function dataBoundaryIsClosed(boundary: S224DataBoundary) {
  return (
    boundary.metadataOnly === true
    && boundary.learnerMaterialIncluded === false
    && boundary.ocrMaterialIncluded === false
    && boundary.problemMaterialIncluded === false
    && boundary.referenceProseIncluded === false
    && boundary.sourceExcerptIncluded === false
    && boundary.providerPayloadIncluded === false
    && boundary.credentialIncluded === false
    && boundary.paymentSecretIncluded === false
    && boundary.billingSecretIncluded === false
    && boundary.assetBytesIncluded === false
    && boundary.globalReferenceWrite === false
    && boundary.academyTenantDataAccessed === false
    && boundary.modelTrainingUse === false
    && boundary.containsRawContent === false
  );
}

function authorityBoundaryIsDisabled(boundary: S224AuthorityBoundary) {
  return (
    boundary.learningSupportOnly === true
    && boundary.authorityClaimAllowed === false
    && boundary.officialGradingClaimAllowed === false
    && boundary.officialModelAnswerClaimAllowed === false
    && boundary.confirmedScoreClaimAllowed === false
    && boundary.passProbabilityClaimAllowed === false
    && boundary.passFailPredictionClaimAllowed === false
    && boundary.guaranteeClaimAllowed === false
  );
}

function trustCopyStatus(): S224CaptureTrustCopyStatus {
  return ANSWER_SUBMISSION_OCR_TRUST_COPY.trim().length > 0 ? "s204_trust_copy_present" : "missing";
}

function buildCaptureMetadata(config: SubjectFlowConfig): LearnerAnswerSubmissionDerivedMetadata {
  const contract = buildLearnerAnswerSubmissionPersistenceContract({
    userId: `s224_user_${config.subject}`,
    mode: "second",
    subject: config.subject,
    sourceType: config.sourceType,
    pageCount: config.sourceType === "pdf" ? 2 : config.sourceType === "text" ? 0 : 1,
    lowConfidenceFlag: config.sourceType !== "text",
    hasManualCorrection: true,
    ocrConfirmedByLearner: true,
    confirmedText: null,
  });
  const metadata = buildLearnerAnswerSubmissionDerivedMetadata(contract);
  if (!metadata) throw new Error(`s224-missing-capture-metadata:${config.subject}`);
  return metadata;
}

function buildAnswerCapture(config: SubjectFlowConfig): S224AnswerCaptureAcceptance {
  const metadata = buildCaptureMetadata(config);
  const capture = sanitizeDerivedMetadata({
    captureStatus: "prepared",
    captureRouteIds: config.routeIds.filter((route) => route !== "/answer-review"),
    answerReviewRouteId: "/answer-review",
    captureContractVersion: metadata.contractVersion,
    sourceType: metadata.sourceType,
    inputKind: metadata.inputKind,
    ocrConfirmationState: metadata.ocrConfirmationState,
    editableBeforeSave: metadata.editableBeforeSave,
    ocrConfirmedByLearner: metadata.ocrConfirmedByLearner,
    trustCopyStatus: trustCopyStatus(),
    learnerOwned: metadata.learnerOwned,
    globalReferenceWrite: metadata.globalReferenceWrite,
    modelTrainingUse: metadata.modelTrainingUse,
    containsRawContent: false,
  }) as S224AnswerCaptureAcceptance;
  assertS224MetadataOnly(capture);
  return capture;
}

function buildSubjectFlow(config: SubjectFlowConfig): S224SubjectRuntimeFlow {
  const actionUnit = buildCognitiveLearningActionUnit({
    mode: "second",
    subjectLabel: config.subjectLabel,
    biggestGap: config.primaryGapType,
    nextAction: config.nextActionInstructionKey,
    nextTaskType: config.nextTaskType,
  });
  const calculator = config.taskHookKind === "recalculation"
    ? {
        model: RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL,
        resetSafeHandKeyedRoutineOnly: true,
        storedProgramDependency: false,
      } as const
    : null;

  const flow = sanitizeDerivedMetadata({
    subject: config.subject,
    subjectLabel: config.subjectLabel,
    acceptanceStatus: "accepted",
    answerCapture: buildAnswerCapture(config),
    evidenceReview: {
      reviewStatusPath: "ready_or_fail_closed_by_source_gate",
      reviewEngineId: config.reviewEngineId,
      reviewEngineVersion: config.reviewEngineVersion,
      rubricContractVersion: RUBRIC_EVIDENCE_CONTRACT_VERSION,
      oneBiggestGapPresent: true,
      oneNextActionPresent: true,
      nextActionType: config.nextActionType,
      resultStartsWithGapAndAction: true,
      scoreLikeSummarySecondary: true,
      terminalLearnerAction: "rewrite_or_recalculation_or_scheduled_review",
      learnerSafeCopyStatus: "verified",
      authorityClaimsDisabled: true,
    },
    retrievalCheck: {
      retrievalCheckStatus: "prepared",
      retrievalSeconds: 10,
      retrievalPattern: actionUnit.retrievalCheck.pattern,
      productionBeforeExplanation: true,
    },
    continuation: {
      taskHookKind: config.taskHookKind,
      rewriteOrCalculationContinuation: config.taskHookKind === "recalculation" ? "recalculation" : "rewrite",
      retryReviewAllowed: true,
      reviewQueueCandidatePrepared: true,
      todayPlanCandidatePrepared: true,
      notesCandidatePrepared: true,
      todayPlanMaxPrimaryTasks: actionUnit.continuation.todayPlanMaxPrimaryTasks,
      reviewQueueRouteId: "/app/review",
      todayPlanRouteId: "/app/today",
      notesRouteId: "/app/notes",
      calculator,
    },
    learnerInstructorBoundary: {
      learnerRouteOnly: true,
      instructorRouteSeparated: true,
      academyTenantDataAccessed: false,
      instructorRuntimeRouteChanged: false,
      learnerInstructorDataMerged: false,
    },
    dataBoundary: dataBoundary(),
    authorityBoundary: authorityBoundary(),
  }) as S224SubjectRuntimeFlow;
  assertS224MetadataOnly(flow);
  return flow;
}

function buildRuntimeEvidence(input?: Partial<S224RuntimeEvidence>): S224RuntimeEvidence {
  const evidence = sanitizeDerivedMetadata({
    evidenceLevel: input?.evidenceLevel ?? "source_level_contract_and_static_route_audit",
    routeSmokeTargets: input?.routeSmokeTargets ?? [...ROUTE_SMOKE_TARGETS],
    sourceLevelTestFile: "tests/s224-three-subject-learner-runtime-acceptance.test.mjs",
    liveBrowserSessionRun: input?.liveBrowserSessionRun ?? false,
    productionBuildRun: input?.productionBuildRun ?? false,
    focusedRouteSmokeRun: input?.focusedRouteSmokeRun ?? false,
    limitedRuntimeEvidenceReason: input?.limitedRuntimeEvidenceReason ?? "No live browser session is encoded in the source report; PR validation must record build and route-smoke evidence separately.",
    runtimeEvidenceDocumentedHonestly: true,
    containsRawContent: false,
  }) as S224RuntimeEvidence;
  assertS224MetadataOnly(evidence);
  return evidence;
}

export const S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_CONTRACT =
  sanitizeDerivedMetadata({
    version: S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION,
    implementationMode: "learner_runtime_acceptance_report",
    upstreamContracts: {
      s204AnswerSubmissionContract: "s204.learner_answer_submission.v1",
      s205RubricEvidenceContractVersion: RUBRIC_EVIDENCE_CONTRACT_VERSION,
      s206RewriteRegradeHistoryVersion: REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
      s211LawEngineVersion: S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
      s212TheoryEngineVersion: S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
      s213PracticeEngineVersion: S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
      s216ErrorNotebookVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
      s217ConceptGraphVersion: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
      s218ReviewSchedulerVersion: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
      s220EntitlementVersion: S220_BILLING_ENTITLEMENT_VERSION,
      s220IdempotentUsageVersion: S220_IDEMPOTENT_USAGE_VERSION,
      s221PaidTrustVersion: S221_PAID_TRUST_VERSION,
      s221CostGuardrailVersion: S221_COST_GUARDRAIL_VERSION,
      s222AcademyBoundaryVersion: S222_ACADEMY_ANSWER_OPERATIONS_VERSION,
      s223CorpusAcceptanceVersion: S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION,
    },
    subjectScope: SUBJECTS,
    learnerLoopOrder: LEARNER_LOOP_ORDER,
    routeSmokeTargets: [...ROUTE_SMOKE_TARGETS],
    requiredSignals: [
      "answer_capture_input",
      "editable_trust_confirmation",
      "subject_specific_gap_action",
      "ten_second_retrieval_check",
      "rewrite_or_calculation_process",
      "review_queue_today_plan_notes_continuation",
      "learner_safe_copy",
      "learner_academy_separation",
      "runtime_evidence_documented",
    ],
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
    authorityBoundary: authorityBoundary(),
  }) as S224ThreeSubjectLearnerRuntimeAcceptanceContract;

export function assertS224MetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  assertS224BoundaryObject(value);
}

export function buildS224ThreeSubjectLearnerRuntimeAcceptanceReport(
  input: S224ReportInput = {},
): S224ReadinessReport {
  const subjectFlows = SUBJECT_FLOW_CONFIGS.map(buildSubjectFlow);
  const totals = {
    subjectCount: subjectFlows.length,
    acceptedSubjectCount: subjectFlows.filter((flow) => flow.acceptanceStatus === "accepted").length,
    answerCaptureReadySubjectCount: subjectFlows.filter((flow) => flow.answerCapture.captureStatus === "prepared").length,
    editableConfirmationSubjectCount: subjectFlows.filter((flow) => flow.answerCapture.editableBeforeSave === true).length,
    subjectSpecificGapActionSubjectCount: subjectFlows.filter((flow) => (
      flow.evidenceReview.oneBiggestGapPresent === true
      && flow.evidenceReview.oneNextActionPresent === true
    )).length,
    retrievalCheckSubjectCount: subjectFlows.filter((flow) => flow.retrievalCheck.retrievalSeconds === 10).length,
    continuationSubjectCount: subjectFlows.filter((flow) => (
      flow.continuation.reviewQueueCandidatePrepared
      && flow.continuation.todayPlanCandidatePrepared
      && flow.continuation.notesCandidatePrepared
    )).length,
    todayPlanMaxPrimaryTasks: TODAY_PLAN_MAX_PRIMARY_TASKS,
    routeSmokeTargetCount: ROUTE_SMOKE_TARGETS.length,
    publicPaidLaunchAllowedSubjectCount: 0,
  };
  const valid = (
    totals.subjectCount === 3
    && totals.acceptedSubjectCount === 3
    && totals.answerCaptureReadySubjectCount === 3
    && totals.editableConfirmationSubjectCount === 3
    && totals.subjectSpecificGapActionSubjectCount === 3
    && totals.retrievalCheckSubjectCount === 3
    && totals.continuationSubjectCount === 3
    && totals.todayPlanMaxPrimaryTasks === 3
    && totals.publicPaidLaunchAllowedSubjectCount === 0
  );

  const report = sanitizeDerivedMetadata({
    version: S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION,
    valid,
    implementationMode: "learner_runtime_acceptance_report",
    acceptanceStatus: valid ? "accepted_for_s225_final_launch_gate" : "blocked",
    publicPaidLaunchReadinessStatus: "blocked_until_s225",
    subjectFlows,
    totals,
    runtimeEvidence: buildRuntimeEvidence(input.runtimeEvidence),
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
    authorityBoundary: authorityBoundary(),
    metadataOnly: true,
    containsRawContent: false,
    safeUse: "s224_learner_runtime_acceptance_for_s225_only",
  }) as S224ReadinessReport;
  assertS224MetadataOnly(report);
  return report;
}

export function validateS224ThreeSubjectLearnerRuntimeAcceptance(
  contract = S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_CONTRACT,
  report = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport(),
): S224ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertS224MetadataOnly(contract);
    assertS224MetadataOnly(report);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s224-data-boundary-error");
  }

  if (contract.version !== S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION) errors.push("contract.version mismatch");
  if (contract.implementationMode !== "learner_runtime_acceptance_report") errors.push("S224 implementation mode mismatch");
  if (report.version !== S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION) errors.push("report.version mismatch");
  if (report.implementationMode !== "learner_runtime_acceptance_report") errors.push("S224 report mode mismatch");
  if (!SUBJECTS.every((subject) => contract.subjectScope.includes(subject))) errors.push("all three subjects are required in the contract");
  if (!boundaryHasOnlyFalseValues(contract.runtimeBoundary)) errors.push("contract.runtimeBoundary must stay closed");
  if (!boundaryHasOnlyFalseValues(report.runtimeBoundary)) errors.push("report.runtimeBoundary must stay closed");
  if (!dataBoundaryIsClosed(contract.dataBoundary)) errors.push("contract.dataBoundary must stay metadata-only");
  if (!dataBoundaryIsClosed(report.dataBoundary)) errors.push("report.dataBoundary must stay metadata-only");
  if (!authorityBoundaryIsDisabled(contract.authorityBoundary)) errors.push("contract.authorityBoundary must stay disabled");
  if (!authorityBoundaryIsDisabled(report.authorityBoundary)) errors.push("report.authorityBoundary must stay disabled");
  if (report.valid !== true) errors.push("S224 report must be valid");
  if (report.acceptanceStatus !== "accepted_for_s225_final_launch_gate") errors.push("S224 must be accepted only for the S225 gate");
  if (report.publicPaidLaunchReadinessStatus !== "blocked_until_s225") errors.push("S224 must not authorize public paid launch");
  if (report.totals.publicPaidLaunchAllowedSubjectCount !== 0) errors.push("S224 must not allow subject public launch");
  if (report.totals.todayPlanMaxPrimaryTasks !== 3) errors.push("Today Plan max primary tasks must remain three");
  if (report.runtimeEvidence.runtimeEvidenceDocumentedHonestly !== true) errors.push("runtime evidence documentation must be explicit");
  if (!report.runtimeEvidence.liveBrowserSessionRun && !report.runtimeEvidence.limitedRuntimeEvidenceReason) {
    errors.push("limited runtime evidence must explain missing live browser evidence");
  }

  const flowSubjects = new Set(report.subjectFlows.map((flow) => flow.subject));
  for (const subject of SUBJECTS) {
    if (!flowSubjects.has(subject)) errors.push(`missing S224 subject flow ${subject}`);
  }

  for (const flow of report.subjectFlows) {
    if (flow.acceptanceStatus !== "accepted") errors.push(`${flow.subject}.acceptanceStatus must be accepted`);
    if (flow.answerCapture.captureStatus !== "prepared") errors.push(`${flow.subject}.answerCapture not prepared`);
    if (flow.answerCapture.editableBeforeSave !== true) errors.push(`${flow.subject}.answerCapture must be editable before save`);
    if (flow.answerCapture.trustCopyStatus !== "s204_trust_copy_present") errors.push(`${flow.subject}.trustCopyStatus missing`);
    if (flow.evidenceReview.oneBiggestGapPresent !== true || flow.evidenceReview.oneNextActionPresent !== true) {
      errors.push(`${flow.subject}.evidenceReview must expose one gap and one action`);
    }
    if (flow.evidenceReview.resultStartsWithGapAndAction !== true) errors.push(`${flow.subject}.result must start with gap/action`);
    if (flow.evidenceReview.scoreLikeSummarySecondary !== true) errors.push(`${flow.subject}.score-like summary must be secondary`);
    if (flow.retrievalCheck.retrievalSeconds !== 10) errors.push(`${flow.subject}.retrievalCheck must be ten seconds`);
    if (flow.continuation.todayPlanMaxPrimaryTasks !== 3) errors.push(`${flow.subject}.TodayPlan max must remain three`);
    if (!flow.continuation.reviewQueueCandidatePrepared || !flow.continuation.todayPlanCandidatePrepared || !flow.continuation.notesCandidatePrepared) {
      errors.push(`${flow.subject}.continuation must prepare Review Queue, Today Plan, and Notes`);
    }
    if (flow.learnerInstructorBoundary.academyTenantDataAccessed !== false) errors.push(`${flow.subject}.academy boundary failed`);
    if (!dataBoundaryIsClosed(flow.dataBoundary)) errors.push(`${flow.subject}.data boundary failed`);
    if (!authorityBoundaryIsDisabled(flow.authorityBoundary)) errors.push(`${flow.subject}.authority boundary failed`);
  }

  const practice = report.subjectFlows.find((flow) => flow.subject === "practice");
  if (practice) {
    if (practice.evidenceReview.nextActionType !== "recalculate") errors.push("practice must continue to recalculation");
    if (practice.retrievalCheck.retrievalPattern !== "calculation_process_check") errors.push("practice retrieval pattern mismatch");
    if (practice.continuation.calculator?.model !== RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL) errors.push("practice calculator model mismatch");
    if (practice.continuation.calculator?.storedProgramDependency !== false) errors.push("practice must prohibit stored program dependency");
  }

  const theory = report.subjectFlows.find((flow) => flow.subject === "theory");
  if (theory) {
    if (theory.evidenceReview.nextActionType !== "rewrite") errors.push("theory must continue to rewrite");
    if (theory.retrievalCheck.retrievalPattern !== "outline_recall") errors.push("theory retrieval pattern mismatch");
  }

  const law = report.subjectFlows.find((flow) => flow.subject === "law");
  if (law) {
    if (law.evidenceReview.nextActionType !== "rewrite") errors.push("law must continue to rewrite");
    if (law.retrievalCheck.retrievalPattern !== "issue_recall") errors.push("law retrieval pattern mismatch");
  }

  if (report.runtimeEvidence.liveBrowserSessionRun === false) {
    warnings.push("live browser route smoke evidence is not embedded in the source report");
  }

  return { valid: errors.length === 0, errors, warnings };
}
