import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import type {
  SecondRoundCanonicalQuestionRecord,
  SecondRoundCanonicalVerificationStatus,
  SecondRoundEvidenceReviewStatus,
  SecondRoundProblemTextStatus,
  SecondRoundReferenceAnswerVerificationStatus,
} from "./second-round-question-registry";
import type { SecondRoundDisplayMode, SecondRoundExtractionStatus, SecondRoundRightsStatus } from "./second-round-source-rights-registry";
import {
  S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
  validateS217PersonalCoreConceptGraph,
  type S217ConceptState,
  type S217PersonalCoreConceptGraph,
  type S217PersonalCoreConceptNode,
} from "./s217-personal-core-concept-graph";
import type { S216NextReviewMetadata, S216RecoveryActionType } from "./s216-error-notebook-gap-taxonomy";
import type { RubricEvidenceSubject } from "./rubric-evidence-contract";

export const S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION = "s218.similar_past_question_review_scheduler.v1" as const;

export type S218SchedulerStatus = "ready" | "withheld";
export type S218DueState = "due_now" | "queued_after_recovery" | "scheduled" | "withheld";
export type S218PrimaryActionType =
  | "attempt_similar_question"
  | "rewrite"
  | "recalculate"
  | "delayed_recall"
  | "spaced_review";
export type S218ConceptTransferStatus = "direct_concept_match" | "transfer_link_match";

export type S218WithholdReason =
  | "s203_question_metadata_missing"
  | "s203_question_source_missing"
  | "s203_question_rights_unresolved"
  | "s203_problem_text_unresolved"
  | "s203_canonical_verification_unresolved"
  | "s203_evidence_review_unresolved"
  | "s203_learner_publication_unresolved"
  | "s217_concept_graph_missing"
  | "s217_concept_graph_withheld"
  | "s217_concept_graph_invalid"
  | "s217_concept_state_missing"
  | "learner_evidence_reference_missing"
  | "source_release_unresolved"
  | "reference_release_unresolved"
  | "delayed_recall_metadata_unresolved"
  | "concept_transfer_metadata_unresolved"
  | "learner_instructor_boundary_violation"
  | "academy_tenant_boundary_violation"
  | "data_boundary_violation"
  | "no_actionable_recovery_state"
  | "no_safe_related_question_metadata"
  | "today_plan_cap_exceeded";

export type S218ConceptTransferLink = {
  linkId: string;
  subject: RubricEvidenceSubject;
  sourceConceptNodeId: string;
  targetConceptNodeId: string;
  transferKind: "same_concept_family" | "same_issue_pattern" | "same_calculation_pattern";
  evidenceRefIds: string[];
  safeForS218Scheduler: true;
  metadataOnly: true;
  containsRawContent: false;
};

export type S218SchedulerInput = {
  schedulerId: string;
  learnerId: string;
  generatedAt: string;
  consumer: "learner";
  actorRole: "learner";
  ownerBinding: "authenticated_request_user";
  s203SchemaVersion?: string;
  conceptGraph: S217PersonalCoreConceptGraph | null;
  canonicalQuestions: SecondRoundCanonicalQuestionRecord[];
  conceptTransferLinks?: S218ConceptTransferLink[];
  maxPrimaryTasks?: 1 | 2 | 3;
};

export type S218QuestionGateSnapshot = {
  questionId: string;
  subject: RubricEvidenceSubject | null;
  sourceId: string | null;
  rightsStatus: SecondRoundRightsStatus | "missing";
  displayMode: SecondRoundDisplayMode | "missing";
  extractionStatus: SecondRoundExtractionStatus | "missing";
  problemTextStatus: SecondRoundProblemTextStatus | "missing";
  canonicalVerificationStatus: SecondRoundCanonicalVerificationStatus | "missing";
  referenceAnswerVerificationStatus: SecondRoundReferenceAnswerVerificationStatus | "missing";
  evidenceReviewStatus: SecondRoundEvidenceReviewStatus | "missing";
  learnerPublicationAllowed: boolean;
  safeForScheduler: boolean;
  withholdReasons: S218WithholdReason[];
  containsRawContent: false;
};

export type S218ConceptGateSnapshot = {
  conceptNodeId: string;
  subject: RubricEvidenceSubject | null;
  conceptState: S217ConceptState | "missing";
  sourceEntryIds: string[];
  learnerEvidenceRefIds: string[];
  referencePackageIds: string[];
  sourceRefIds: string[];
  withholdReasons: S218WithholdReason[];
  containsRawContent: false;
};

export type S218RelatedQuestionMetadata = {
  questionId: string;
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  examYear: number;
  examRound: number;
  questionNo: number;
  totalPoints: number;
  sourceId: string;
  rightsStatus: SecondRoundRightsStatus;
  displayMode: SecondRoundDisplayMode;
  extractionStatus: SecondRoundExtractionStatus;
  problemTextStatus: SecondRoundProblemTextStatus;
  canonicalVerificationStatus: SecondRoundCanonicalVerificationStatus;
  evidenceReviewStatus: SecondRoundEvidenceReviewStatus;
  learnerPublicationAllowed: boolean;
  officialQuestionMaterialIncluded: false;
  officialAnswerMaterialIncluded: false;
  generatedAnswerProseIncluded: false;
  sourceExcerptIncluded: false;
  publicArchiveUi: false;
  containsRawContent: false;
};

export type S218OneBiggestGapMetadata = {
  conceptNodeId: string;
  conceptState: S217ConceptState;
  primaryGapIds: string[];
  primaryGapTypes: string[];
  gapCategoryIds: string[];
  deductionCandidateIds: string[];
  learnerEvidenceRefIds: string[];
  sourceEntryIds: string[];
  containsRawContent: false;
};

export type S218OneNextActionMetadata = {
  actionType: S218PrimaryActionType;
  instructionKey:
    | "attempt_related_historical_metadata_then_rewrite_one_gap"
    | "rewrite_one_gap_from_recovery_metadata"
    | "recalculate_with_reset_safe_giii_metadata"
    | "perform_delayed_recall_then_rewrite_or_recalculate"
    | "run_spaced_review_then_schedule_next";
  defaultAction: true;
  learnerCanOverride: true;
  targetConceptNodeId: string;
  targetQuestionId: string;
  targetGapIds: string[];
  evidenceRefIds: string[];
  containsRawContent: false;
};

export type S218RewriteDueMetadata = {
  status: "due" | "not_due";
  recoveryActionTypes: S216RecoveryActionType[];
  hookKinds: string[];
  targetGapIds: string[];
  rewriteHistoryIds: string[];
  reReviewRequestIds: string[];
  retryReviewAllowed: boolean;
  calculator:
    | {
        model: "casio_fx_9860giii";
        resetSafeHandKeyedRoutineOnly: true;
        storedProgramDependency: false;
      }
    | null;
  containsRawContent: false;
};

export type S218DelayedRecallDueMetadata = {
  status: "due" | "not_due";
  latestRecallStatus: S217PersonalCoreConceptNode["delayedRecallMetadata"]["latestRecallStatus"];
  delayedRecallSignalIds: string[];
  delayedRecallCount: number;
  missedCount: number;
  partialCount: number;
  recalledCount: number;
  containsRawContent: false;
};

export type S218SpacedReviewMetadata = {
  status: "scheduled" | "queued_after_recovery" | "not_due";
  nextReviewStatus: S216NextReviewMetadata["status"] | "none";
  reviewDueHint: S216NextReviewMetadata["reviewDueHint"] | "none";
  reviewQueueCandidate: boolean;
  nextActionIds: string[];
  containsRawContent: false;
};

export type S218ConceptTransferMetadata = {
  status: S218ConceptTransferStatus;
  sourceConceptNodeId: string;
  targetQuestionConceptNodeIds: string[];
  transferLinkIds: string[];
  transferKinds: S218ConceptTransferLink["transferKind"][];
  subjectDimensionIds: string[];
  evidenceRefIds: string[];
  containsRawContent: false;
};

export type S218TodayPlanCompatibility = {
  contributesPrimaryTask: true;
  contributionCount: 1;
  maxPrimaryTasks: 3;
  todayPlanCompatible: true;
  containsRawContent: false;
};

export type S218ReviewRewriteTaskMetadata = {
  taskId: string;
  taskKind: "similar_past_question_review";
  dueState: S218DueState;
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  relatedQuestion: S218RelatedQuestionMetadata;
  oneBiggestGap: S218OneBiggestGapMetadata;
  oneNextAction: S218OneNextActionMetadata;
  conceptTransfer: S218ConceptTransferMetadata;
  rewriteDue: S218RewriteDueMetadata;
  delayedRecall: S218DelayedRecallDueMetadata;
  spacedReview: S218SpacedReviewMetadata;
  priority: {
    score: number;
    reasons: string[];
  };
  todayPlan: S218TodayPlanCompatibility;
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
    learnerMaterialInTask: false;
    ocrMaterialInTask: false;
    officialMaterialInTask: false;
    referenceProseInTask: false;
    sourceMaterialInTask: false;
    calculationTraceInTask: false;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    publicArchiveUiAdded: false;
    learnerUiAdded: false;
    containsRawContent: false;
  };
};

export type S218SimilarQuestionReviewScheduler = {
  version: typeof S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION;
  dataClass: "derived_learning_metadata";
  schedulerId: string;
  learnerId: string;
  generatedAt: string;
  ownerBinding: "authenticated_request_user";
  examMode: "second";
  status: S218SchedulerStatus;
  withhold: {
    withheld: boolean;
    reasons: S218WithholdReason[];
    questionGateSnapshots: S218QuestionGateSnapshot[];
    conceptGateSnapshots: S218ConceptGateSnapshot[];
  };
  sourceContracts: {
    s203SchemaVersion: string | null;
    s203QuestionIds: string[];
    s203QuestionCount: number;
    s217Version: typeof S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION;
    s217GraphId: string | null;
    s217Status: S217PersonalCoreConceptGraph["status"] | "missing";
    conceptTransferLinkIds: string[];
  };
  tasks: S218ReviewRewriteTaskMetadata[];
  todayPlan: {
    maxPrimaryTasks: 3;
    primaryTaskCount: number;
    taskIds: string[];
    compatibleWithTodayPlanCap: true;
    containsRawContent: false;
  };
  diagnostics: {
    blockedQuestionIds: string[];
    skippedConceptNodeIds: string[];
    selectedConceptNodeIds: string[];
    selectedQuestionIds: string[];
    containsRawContent: false;
  };
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
    learnerMaterialInScheduler: false;
    ocrMaterialInScheduler: false;
    officialMaterialInScheduler: false;
    referenceProseInScheduler: false;
    sourceMaterialInScheduler: false;
    calculationTraceInScheduler: false;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    globalReferenceWrite: false;
    publicArchiveUiAdded: false;
    learnerUiAdded: false;
    instructorRouteChanged: false;
    academyTenantDataAccessed: false;
    modelTrainingUse: false;
    telemetrySafe: true;
    containsRawContent: false;
  };
};

export type S218ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type S218BuildResult = {
  version: typeof S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION;
  scheduler: S218SimilarQuestionReviewScheduler;
  validation: S218ValidationResult;
};

type CandidateMatch = {
  node: S217PersonalCoreConceptNode;
  question: SecondRoundCanonicalQuestionRecord;
  transferStatus: S218ConceptTransferStatus;
  links: S218ConceptTransferLink[];
};

const MAX_TODAY_PLAN_PRIMARY_TASKS = 3 as const;
const SAFE_PROBLEM_TEXT_STATUSES = new Set<SecondRoundProblemTextStatus>(["verified", "synthetic_fixture"]);
const SAFE_CANONICAL_STATUSES = new Set<SecondRoundCanonicalVerificationStatus>(["structure_verified", "synthetic_fixture"]);
const AUTHORITY_CLAIM_PATTERN =
  /\b(?:official\s+grading|official\s+model\s+answer|official\s+answer|confirmed\s+score|pass\s+probability|pass\s*\/\s*fail|pass-fail|pass\s+guarantee|guaranteed\s+score|score\s+prediction)\b/i;
const RAW_FIELD_NAMES = new Set([
  "questionText",
  "questionBody",
  "rawQuestionText",
  "officialQuestionBody",
  "answerText",
  "answerBody",
  "rawAnswerText",
  "officialAnswer",
  "officialAnswerText",
  "officialAnswerBody",
  "modelAnswer",
  "referenceAnswerText",
  "sourceExcerpt",
  "sourceText",
  "rawOcrText",
  "ocrText",
  "learnerAnswer",
  "learnerAnswerText",
  "instructorComment",
  "academyContent",
  "providerPayload",
  "billingRecord",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "assetBytes",
]);

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function sorted<T extends string>(values: Iterable<T>): T[] {
  return unique(values).sort((left, right) => left.localeCompare(right));
}

function compact(values: Iterable<string | null | undefined>) {
  return sorted([...values].filter((value): value is string => typeof value === "string" && value.trim().length > 0));
}

function assertNoRawSchedulerContent(value: unknown, path = "s218"): void {
  if (typeof value === "string") {
    if (AUTHORITY_CLAIM_PATTERN.test(value)) {
      throw new Error(`s218-prohibited-authority-claim: ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawSchedulerContent(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (RAW_FIELD_NAMES.has(key)) throw new Error(`s218-raw-content-field: ${path}.${key}`);
    assertNoRawSchedulerContent(child, `${path}.${key}`);
  }
}

function assertLearnerOnly(input: S218SchedulerInput) {
  if (input.consumer !== "learner" || input.actorRole !== "learner") {
    throw new Error("s218-learner-instructor-boundary: scheduler is learner metadata only");
  }
  if (input.ownerBinding !== "authenticated_request_user") {
    throw new Error("s218-owner-boundary: scheduler input must bind to the authenticated learner");
  }
}

function addRequiredStringError(errors: string[], value: unknown, path: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function conceptPriority(state: S217ConceptState) {
  if (state === "at-risk") return 100;
  if (state === "recurring") return 92;
  if (state === "wrong") return 82;
  if (state === "confused") return 72;
  if (state === "recovering") return 64;
  if (state === "stable") return 36;
  if (state === "exposed") return 8;
  return 0;
}

function questionGateReasons(question: SecondRoundCanonicalQuestionRecord): S218WithholdReason[] {
  const reasons: S218WithholdReason[] = [];
  if (!question.source?.sourceId) reasons.push("s203_question_source_missing");
  if (
    question.source.rightsStatus !== "redistribution_allowed"
    || question.source.displayMode !== "full_text"
    || question.source.metadataEligibleForS203 !== true
    || question.source.problemTextEligibleForS203 !== true
  ) {
    reasons.push("s203_question_rights_unresolved");
  }
  if (question.source.extractionStatus !== "extracted_private" || !SAFE_PROBLEM_TEXT_STATUSES.has(question.problemText.status)) {
    reasons.push("s203_problem_text_unresolved");
  }
  if (!SAFE_CANONICAL_STATUSES.has(question.canonicalVerificationStatus)) {
    reasons.push("s203_canonical_verification_unresolved");
  }
  if (question.evidenceReview.eligible !== true || question.evidenceReview.status !== "eligible" && question.evidenceReview.status !== "synthetic_fixture_only") {
    reasons.push("s203_evidence_review_unresolved");
  }
  if (question.learnerPublication.allowed !== true || question.source.learnerPublicationEligible !== true) {
    reasons.push("s203_learner_publication_unresolved");
  }
  return unique(reasons);
}

function questionGateSnapshot(question: SecondRoundCanonicalQuestionRecord): S218QuestionGateSnapshot {
  const reasons = questionGateReasons(question);
  return {
    questionId: question.id,
    subject: question.subject,
    sourceId: question.source.sourceId ?? null,
    rightsStatus: question.source.rightsStatus ?? "missing",
    displayMode: question.source.displayMode ?? "missing",
    extractionStatus: question.source.extractionStatus ?? "missing",
    problemTextStatus: question.problemText.status ?? "missing",
    canonicalVerificationStatus: question.canonicalVerificationStatus ?? "missing",
    referenceAnswerVerificationStatus: question.referenceAnswerVerificationStatus ?? "missing",
    evidenceReviewStatus: question.evidenceReview.status ?? "missing",
    learnerPublicationAllowed: question.learnerPublication.allowed === true,
    safeForScheduler: reasons.length === 0,
    withholdReasons: reasons,
    containsRawContent: false,
  };
}

function conceptGateReasons(node: S217PersonalCoreConceptNode): S218WithholdReason[] {
  const reasons: S218WithholdReason[] = [];
  if (!node.conceptState) reasons.push("s217_concept_state_missing");
  if (node.exposureMetadata.learnerEvidenceRefIds.length === 0) reasons.push("learner_evidence_reference_missing");
  if (!node.examImpactMetadata.sourceReleaseReady || node.exposureMetadata.sourceRefIds.length === 0) {
    reasons.push("source_release_unresolved");
  }
  if (
    node.exposureMetadata.referencePackageIds.length === 0
    || node.examImpactMetadata.learningReferenceCaveatPresent !== true
  ) {
    reasons.push("reference_release_unresolved");
  }
  if (node.delayedRecallMetadata.delayedRecallCount > 0 && node.delayedRecallMetadata.delayedRecallSignalIds.length === 0) {
    reasons.push("delayed_recall_metadata_unresolved");
  }
  if (node.dataBoundary.metadataOnly !== true || node.dataBoundary.containsRawContent !== false) {
    reasons.push("data_boundary_violation");
  }
  if (node.dataBoundary.academyTenantDataAccessed !== false) reasons.push("academy_tenant_boundary_violation");
  return unique(reasons);
}

function conceptGateSnapshot(node: S217PersonalCoreConceptNode): S218ConceptGateSnapshot {
  return {
    conceptNodeId: node.conceptNodeId,
    subject: node.subject,
    conceptState: node.conceptState ?? "missing",
    sourceEntryIds: node.exposureMetadata.sourceEntryIds,
    learnerEvidenceRefIds: node.exposureMetadata.learnerEvidenceRefIds,
    referencePackageIds: node.exposureMetadata.referencePackageIds,
    sourceRefIds: node.exposureMetadata.sourceRefIds,
    withholdReasons: conceptGateReasons(node),
    containsRawContent: false,
  };
}

function transferLinkReasons(link: S218ConceptTransferLink): S218WithholdReason[] {
  const reasons: S218WithholdReason[] = [];
  if (
    !link.linkId
    || !link.sourceConceptNodeId
    || !link.targetConceptNodeId
    || link.evidenceRefIds.length === 0
    || link.safeForS218Scheduler !== true
    || link.metadataOnly !== true
    || link.containsRawContent !== false
  ) {
    reasons.push("concept_transfer_metadata_unresolved");
  }
  return reasons;
}

function transferLinksFor(
  node: S217PersonalCoreConceptNode,
  question: SecondRoundCanonicalQuestionRecord,
  links: readonly S218ConceptTransferLink[],
) {
  return links.filter((link) => (
    link.subject === node.subject
    && link.sourceConceptNodeId === node.conceptNodeId
    && question.conceptNodeIds.includes(link.targetConceptNodeId)
  ));
}

function findMatch(
  node: S217PersonalCoreConceptNode,
  questions: readonly SecondRoundCanonicalQuestionRecord[],
  links: readonly S218ConceptTransferLink[],
): CandidateMatch | null {
  const eligibleQuestions = questions.filter((question) => questionGateReasons(question).length === 0);
  const direct = eligibleQuestions.find((question) => (
    question.subject === node.subject
    && !node.exposureMetadata.questionIds.includes(question.id)
    && question.conceptNodeIds.includes(node.conceptNodeId)
  ));
  if (direct) {
    return {
      node,
      question: direct,
      transferStatus: "direct_concept_match",
      links: [],
    };
  }

  const transfer = eligibleQuestions
    .map((question) => ({ question, links: transferLinksFor(node, question, links) }))
    .find(({ question, links: matchedLinks }) => (
      question.subject === node.subject
      && !node.exposureMetadata.questionIds.includes(question.id)
      && matchedLinks.length > 0
      && matchedLinks.every((link) => transferLinkReasons(link).length === 0)
    ));

  return transfer
    ? {
        node,
        question: transfer.question,
        transferStatus: "transfer_link_match",
        links: transfer.links,
      }
    : null;
}

function isActionableNode(node: S217PersonalCoreConceptNode) {
  return conceptPriority(node.conceptState) >= 36
    || node.delayedRecallMetadata.reviewQueueCandidate
    || node.forgettingRiskMetadata.nextReviewStatus === "scheduled";
}

function rewriteDue(node: S217PersonalCoreConceptNode): S218RewriteDueMetadata {
  const recoveryActionTypes = node.successfulRecoveryMetadata.recoveryActionTypes;
  const due = node.conceptState !== "stable"
    && node.conceptState !== "unknown"
    && node.conceptState !== "exposed";
  return {
    status: due && recoveryActionTypes.length > 0 ? "due" : "not_due",
    recoveryActionTypes,
    hookKinds: node.successfulRecoveryMetadata.hookKinds,
    targetGapIds: node.successfulRecoveryMetadata.targetGapIds,
    rewriteHistoryIds: node.successfulRecoveryMetadata.rewriteHistoryIds,
    reReviewRequestIds: node.successfulRecoveryMetadata.reReviewRequestIds,
    retryReviewAllowed: node.successfulRecoveryMetadata.retryReviewAllowed,
    calculator: node.successfulRecoveryMetadata.calculator,
    containsRawContent: false,
  };
}

function delayedRecallDue(node: S217PersonalCoreConceptNode): S218DelayedRecallDueMetadata {
  const latest = node.delayedRecallMetadata.latestRecallStatus;
  return {
    status: latest === "missed" || latest === "partial" ? "due" : "not_due",
    latestRecallStatus: latest,
    delayedRecallSignalIds: node.delayedRecallMetadata.delayedRecallSignalIds,
    delayedRecallCount: node.delayedRecallMetadata.delayedRecallCount,
    missedCount: node.delayedRecallMetadata.missedCount,
    partialCount: node.delayedRecallMetadata.partialCount,
    recalledCount: node.delayedRecallMetadata.recalledCount,
    containsRawContent: false,
  };
}

function spacedReview(node: S217PersonalCoreConceptNode): S218SpacedReviewMetadata {
  const nextReviewStatus = node.forgettingRiskMetadata.nextReviewStatus;
  const scheduled = nextReviewStatus === "scheduled" || node.delayedRecallMetadata.reviewQueueCandidate;
  return {
    status: scheduled ? "scheduled" : nextReviewStatus === "queued_after_recovery" ? "queued_after_recovery" : "not_due",
    nextReviewStatus,
    reviewDueHint: node.forgettingRiskMetadata.reviewDueHint,
    reviewQueueCandidate: node.delayedRecallMetadata.reviewQueueCandidate,
    nextActionIds: node.delayedRecallMetadata.nextActionIds,
    containsRawContent: false,
  };
}

function actionTypeFor(
  node: S217PersonalCoreConceptNode,
  rewrite: S218RewriteDueMetadata,
  delayedRecall: S218DelayedRecallDueMetadata,
  spaced: S218SpacedReviewMetadata,
): S218PrimaryActionType {
  if (rewrite.status === "due" && rewrite.recoveryActionTypes.includes("recalculate")) return "recalculate";
  if (node.conceptState === "recurring" || node.conceptState === "wrong" || node.conceptState === "confused") return "attempt_similar_question";
  if (delayedRecall.status === "due") return "delayed_recall";
  if (rewrite.status === "due") return "rewrite";
  if (spaced.status === "scheduled") return "spaced_review";
  return "attempt_similar_question";
}

function instructionKeyFor(actionType: S218PrimaryActionType): S218OneNextActionMetadata["instructionKey"] {
  if (actionType === "recalculate") return "recalculate_with_reset_safe_giii_metadata";
  if (actionType === "rewrite") return "rewrite_one_gap_from_recovery_metadata";
  if (actionType === "delayed_recall") return "perform_delayed_recall_then_rewrite_or_recalculate";
  if (actionType === "spaced_review") return "run_spaced_review_then_schedule_next";
  return "attempt_related_historical_metadata_then_rewrite_one_gap";
}

function dueStateFor(
  rewrite: S218RewriteDueMetadata,
  delayedRecall: S218DelayedRecallDueMetadata,
  spaced: S218SpacedReviewMetadata,
): S218DueState {
  if (rewrite.status === "due" || delayedRecall.status === "due") return "due_now";
  if (spaced.status === "scheduled") return "scheduled";
  if (spaced.status === "queued_after_recovery") return "queued_after_recovery";
  return "due_now";
}

function priorityFor(
  node: S217PersonalCoreConceptNode,
  transferStatus: S218ConceptTransferStatus,
  rewrite: S218RewriteDueMetadata,
  delayedRecall: S218DelayedRecallDueMetadata,
  spaced: S218SpacedReviewMetadata,
) {
  const reasons = ["similar_question_candidate"];
  let score = conceptPriority(node.conceptState);
  if (transferStatus === "transfer_link_match") {
    score += 8;
    reasons.push("concept_transfer");
  }
  if (rewrite.status === "due") {
    score += 16;
    reasons.push("rewrite_due");
  }
  if (delayedRecall.status === "due") {
    score += 24;
    reasons.push("delayed_recall_due");
  }
  if (spaced.status === "scheduled") {
    score += 10;
    reasons.push("spaced_review_due");
  }
  if (node.forgettingRiskMetadata.atRisk) {
    score += 18;
    reasons.push("forgetting_risk");
  }
  return { score, reasons: sorted(reasons) };
}

function relatedQuestionMetadata(question: SecondRoundCanonicalQuestionRecord): S218RelatedQuestionMetadata {
  return {
    questionId: question.id,
    subject: question.subject,
    subjectLabel: question.officialSubjectLabelKo,
    examYear: question.examYear,
    examRound: question.examRound,
    questionNo: question.questionNo,
    totalPoints: question.totalPoints,
    sourceId: question.source.sourceId,
    rightsStatus: question.source.rightsStatus,
    displayMode: question.source.displayMode,
    extractionStatus: question.source.extractionStatus,
    problemTextStatus: question.problemText.status,
    canonicalVerificationStatus: question.canonicalVerificationStatus,
    evidenceReviewStatus: question.evidenceReview.status,
    learnerPublicationAllowed: question.learnerPublication.allowed,
    officialQuestionMaterialIncluded: false,
    officialAnswerMaterialIncluded: false,
    generatedAnswerProseIncluded: false,
    sourceExcerptIncluded: false,
    publicArchiveUi: false,
    containsRawContent: false,
  };
}

function buildTask(match: CandidateMatch): S218ReviewRewriteTaskMetadata {
  const { node, question, transferStatus, links } = match;
  const rewrite = rewriteDue(node);
  const delayedRecall = delayedRecallDue(node);
  const spaced = spacedReview(node);
  const actionType = actionTypeFor(node, rewrite, delayedRecall, spaced);
  const targetQuestionConceptNodeIds = transferStatus === "direct_concept_match"
    ? [node.conceptNodeId]
    : sorted(links.map((link) => link.targetConceptNodeId));

  return sanitizeDerivedMetadata({
    taskId: `s218:${node.learnerId}:${node.conceptNodeId}:${question.id}`,
    taskKind: "similar_past_question_review",
    dueState: dueStateFor(rewrite, delayedRecall, spaced),
    subject: node.subject,
    subjectLabel: node.subjectLabel,
    relatedQuestion: relatedQuestionMetadata(question),
    oneBiggestGap: {
      conceptNodeId: node.conceptNodeId,
      conceptState: node.conceptState,
      primaryGapIds: node.errorMetadata.primaryGapIds,
      primaryGapTypes: node.errorMetadata.primaryGapTypes,
      gapCategoryIds: node.errorMetadata.gapCategoryIds,
      deductionCandidateIds: node.errorMetadata.deductionCandidateIds,
      learnerEvidenceRefIds: node.exposureMetadata.learnerEvidenceRefIds,
      sourceEntryIds: node.exposureMetadata.sourceEntryIds,
      containsRawContent: false,
    },
    oneNextAction: {
      actionType,
      instructionKey: instructionKeyFor(actionType),
      defaultAction: true,
      learnerCanOverride: true,
      targetConceptNodeId: node.conceptNodeId,
      targetQuestionId: question.id,
      targetGapIds: node.errorMetadata.primaryGapIds,
      evidenceRefIds: node.exposureMetadata.learnerEvidenceRefIds,
      containsRawContent: false,
    },
    conceptTransfer: {
      status: transferStatus,
      sourceConceptNodeId: node.conceptNodeId,
      targetQuestionConceptNodeIds,
      transferLinkIds: links.map((link) => link.linkId),
      transferKinds: sorted(links.map((link) => link.transferKind)),
      subjectDimensionIds: node.subjectDimensionIds,
      evidenceRefIds: compact(links.flatMap((link) => link.evidenceRefIds)),
      containsRawContent: false,
    },
    rewriteDue: rewrite,
    delayedRecall,
    spacedReview: spaced,
    priority: priorityFor(node, transferStatus, rewrite, delayedRecall, spaced),
    todayPlan: {
      contributesPrimaryTask: true,
      contributionCount: 1,
      maxPrimaryTasks: MAX_TODAY_PLAN_PRIMARY_TASKS,
      todayPlanCompatible: true,
      containsRawContent: false,
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
      learnerMaterialInTask: false,
      ocrMaterialInTask: false,
      officialMaterialInTask: false,
      referenceProseInTask: false,
      sourceMaterialInTask: false,
      calculationTraceInTask: false,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      publicArchiveUiAdded: false,
      learnerUiAdded: false,
      containsRawContent: false,
    },
  }) as S218ReviewRewriteTaskMetadata;
}

function buildTasks(
  graph: S217PersonalCoreConceptGraph,
  questions: readonly SecondRoundCanonicalQuestionRecord[],
  links: readonly S218ConceptTransferLink[],
  maxPrimaryTasks: 1 | 2 | 3,
) {
  const conceptSnapshots = graph.nodes.map(conceptGateSnapshot);
  const safeNodes = graph.nodes.filter((node) => conceptGateReasons(node).length === 0 && isActionableNode(node));
  const matches = safeNodes
    .map((node) => findMatch(node, questions, links))
    .filter((match): match is CandidateMatch => Boolean(match));
  const tasks = matches
    .map(buildTask)
    .sort((left, right) => right.priority.score - left.priority.score || left.taskId.localeCompare(right.taskId))
    .slice(0, maxPrimaryTasks);
  const selectedConceptNodeIds = new Set(tasks.map((task) => task.oneBiggestGap.conceptNodeId));
  const skippedConceptNodeIds = safeNodes
    .map((node) => node.conceptNodeId)
    .filter((conceptNodeId) => !selectedConceptNodeIds.has(conceptNodeId));

  return {
    tasks,
    conceptSnapshots,
    skippedConceptNodeIds,
  };
}

function baseScheduler(
  input: S218SchedulerInput,
  status: S218SchedulerStatus,
  reasons: readonly S218WithholdReason[],
  questionSnapshots: S218QuestionGateSnapshot[],
  conceptSnapshots: S218ConceptGateSnapshot[],
  tasks: S218ReviewRewriteTaskMetadata[],
  skippedConceptNodeIds: string[],
): S218SimilarQuestionReviewScheduler {
  const graph = input.conceptGraph;
  return sanitizeDerivedMetadata({
    version: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
    dataClass: "derived_learning_metadata",
    schedulerId: input.schedulerId,
    learnerId: input.learnerId,
    generatedAt: input.generatedAt,
    ownerBinding: "authenticated_request_user",
    examMode: "second",
    status,
    withhold: {
      withheld: status !== "ready",
      reasons: sorted(reasons),
      questionGateSnapshots: questionSnapshots,
      conceptGateSnapshots: conceptSnapshots,
    },
    sourceContracts: {
      s203SchemaVersion: input.s203SchemaVersion ?? null,
      s203QuestionIds: input.canonicalQuestions.map((question) => question.id),
      s203QuestionCount: input.canonicalQuestions.length,
      s217Version: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
      s217GraphId: graph?.graphId ?? null,
      s217Status: graph?.status ?? "missing",
      conceptTransferLinkIds: (input.conceptTransferLinks ?? []).map((link) => link.linkId),
    },
    tasks,
    todayPlan: {
      maxPrimaryTasks: MAX_TODAY_PLAN_PRIMARY_TASKS,
      primaryTaskCount: tasks.length,
      taskIds: tasks.map((task) => task.taskId),
      compatibleWithTodayPlanCap: true,
      containsRawContent: false,
    },
    diagnostics: {
      blockedQuestionIds: questionSnapshots.filter((snapshot) => !snapshot.safeForScheduler).map((snapshot) => snapshot.questionId),
      skippedConceptNodeIds: sorted(skippedConceptNodeIds),
      selectedConceptNodeIds: sorted(tasks.map((task) => task.oneBiggestGap.conceptNodeId)),
      selectedQuestionIds: sorted(tasks.map((task) => task.relatedQuestion.questionId)),
      containsRawContent: false,
    },
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
      learnerMaterialInScheduler: false,
      ocrMaterialInScheduler: false,
      officialMaterialInScheduler: false,
      referenceProseInScheduler: false,
      sourceMaterialInScheduler: false,
      calculationTraceInScheduler: false,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      globalReferenceWrite: false,
      publicArchiveUiAdded: false,
      learnerUiAdded: false,
      instructorRouteChanged: false,
      academyTenantDataAccessed: false,
      modelTrainingUse: false,
      telemetrySafe: true,
      containsRawContent: false,
    },
  }) as S218SimilarQuestionReviewScheduler;
}

function inputWithholdReasons(input: S218SchedulerInput): S218WithholdReason[] {
  const reasons: S218WithholdReason[] = [];
  const graph = input.conceptGraph;
  if (input.canonicalQuestions.length === 0) reasons.push("s203_question_metadata_missing");
  if (!graph) {
    reasons.push("s217_concept_graph_missing");
  } else {
    const graphValidation = validateS217PersonalCoreConceptGraph(graph);
    if (!graphValidation.valid) reasons.push("s217_concept_graph_invalid");
    if (graph.status !== "ready") reasons.push("s217_concept_graph_withheld");
    if (graph.learnerInstructorBoundary.learnerRouteOnly !== true || graph.learnerInstructorBoundary.instructorRouteSeparated !== true) {
      reasons.push("learner_instructor_boundary_violation");
    }
    if (graph.learnerInstructorBoundary.academyTenantDataAccessed !== false || graph.dataBoundary.academyTenantDataAccessed !== false) {
      reasons.push("academy_tenant_boundary_violation");
    }
  }
  for (const link of input.conceptTransferLinks ?? []) {
    reasons.push(...transferLinkReasons(link));
  }
  return unique(reasons);
}

export function validateS218SimilarQuestionReviewScheduler(
  scheduler: S218SimilarQuestionReviewScheduler,
): S218ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    assertNoRawUserDataInDerived(scheduler);
    assertNoRawSchedulerContent(scheduler);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s218-data-boundary-error");
  }

  if (scheduler.version !== S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION) errors.push("scheduler.version must be S218");
  if (scheduler.dataClass !== "derived_learning_metadata") errors.push("scheduler.dataClass must be derived_learning_metadata");
  if (scheduler.examMode !== "second") errors.push("S218 supports only second-round learner recovery");
  addRequiredStringError(errors, scheduler.schedulerId, "schedulerId");
  addRequiredStringError(errors, scheduler.learnerId, "learnerId");
  addRequiredStringError(errors, scheduler.generatedAt, "generatedAt");
  if (scheduler.ownerBinding !== "authenticated_request_user") errors.push("ownerBinding must bind to authenticated_request_user");
  if (scheduler.withhold.withheld !== (scheduler.status !== "ready")) errors.push("withhold.withheld must match scheduler.status");
  if (scheduler.status === "ready" && scheduler.withhold.reasons.length > 0) errors.push("ready S218 scheduler must not carry withhold reasons");
  if (scheduler.status === "withheld" && scheduler.withhold.reasons.length === 0) errors.push("withheld S218 scheduler must include withhold reasons");
  if (scheduler.status === "withheld" && scheduler.tasks.length > 0) errors.push("withheld S218 scheduler must not emit tasks");
  if (scheduler.status === "ready" && scheduler.tasks.length === 0) errors.push("ready S218 scheduler requires at least one task");
  if (scheduler.todayPlan.primaryTaskCount !== scheduler.tasks.length) errors.push("todayPlan.primaryTaskCount must match tasks");
  if (scheduler.todayPlan.primaryTaskCount > MAX_TODAY_PLAN_PRIMARY_TASKS) errors.push("S218 Today Plan contribution can be at most three tasks");
  if (scheduler.todayPlan.maxPrimaryTasks !== MAX_TODAY_PLAN_PRIMARY_TASKS) errors.push("S218 must preserve Today Plan max three");

  for (const task of scheduler.tasks) {
    if (task.taskKind !== "similar_past_question_review") errors.push(`${task.taskId} taskKind must be similar_past_question_review`);
    if (task.todayPlan.contributionCount !== 1) errors.push(`${task.taskId} must contribute at most one primary task`);
    if (task.todayPlan.maxPrimaryTasks !== MAX_TODAY_PLAN_PRIMARY_TASKS) errors.push(`${task.taskId} must preserve Today Plan max three`);
    if (task.relatedQuestion.officialQuestionMaterialIncluded !== false) errors.push(`${task.taskId} must not include official question material`);
    if (task.relatedQuestion.officialAnswerMaterialIncluded !== false) errors.push(`${task.taskId} must not include official answer material`);
    if (task.relatedQuestion.generatedAnswerProseIncluded !== false) errors.push(`${task.taskId} must not include generated answer prose`);
    if (task.relatedQuestion.sourceExcerptIncluded !== false) errors.push(`${task.taskId} must not include source excerpts`);
    if (task.relatedQuestion.publicArchiveUi !== false) errors.push(`${task.taskId} must not add public archive UI`);
    if (task.oneNextAction.defaultAction !== true || task.oneNextAction.learnerCanOverride !== true) {
      errors.push(`${task.taskId} must keep a default action and learner override`);
    }
    if (task.oneNextAction.targetGapIds.length === 0) errors.push(`${task.taskId} must point to at least one target gap`);
    if (task.oneNextAction.evidenceRefIds.length === 0) errors.push(`${task.taskId} must keep learner evidence refs`);
    if (task.rewriteDue.status === "due" && task.rewriteDue.recoveryActionTypes.length === 0) {
      errors.push(`${task.taskId} rewrite due metadata must include recovery action types`);
    }
    if (task.oneNextAction.actionType === "recalculate" && !task.rewriteDue.calculator) {
      errors.push(`${task.taskId} recalculation action must preserve GIII calculator metadata`);
    }
    if (task.rewriteDue.calculator) {
      if (task.rewriteDue.calculator.model !== "casio_fx_9860giii") errors.push(`${task.taskId} calculator model must be casio_fx_9860giii`);
      if (task.rewriteDue.calculator.resetSafeHandKeyedRoutineOnly !== true) {
        errors.push(`${task.taskId} calculator routine must be reset-safe and hand-keyed`);
      }
      if (task.rewriteDue.calculator.storedProgramDependency !== false) {
        errors.push(`${task.taskId} calculator routine must not depend on stored programs`);
      }
    }
    if (task.authorityFlags.officialGrading !== false) errors.push(`${task.taskId} must not allow official grading`);
    if (task.authorityFlags.officialModelAnswer !== false) errors.push(`${task.taskId} must not allow official model answers`);
    if (task.authorityFlags.confirmedScore !== false) errors.push(`${task.taskId} must not allow confirmed scores`);
    if (task.authorityFlags.passProbability !== false) errors.push(`${task.taskId} must not allow pass probability`);
    if (task.authorityFlags.passGuarantee !== false) errors.push(`${task.taskId} must not allow pass guarantees`);
    if (task.dataBoundary.metadataOnly !== true) errors.push(`${task.taskId} must be metadata-only`);
    if (task.dataBoundary.learnerMaterialInTask !== false) errors.push(`${task.taskId} must not store learner material`);
    if (task.dataBoundary.ocrMaterialInTask !== false) errors.push(`${task.taskId} must not store OCR material`);
    if (task.dataBoundary.officialMaterialInTask !== false) errors.push(`${task.taskId} must not store official material`);
    if (task.dataBoundary.referenceProseInTask !== false) errors.push(`${task.taskId} must not store reference prose`);
    if (task.dataBoundary.sourceMaterialInTask !== false) errors.push(`${task.taskId} must not store source material`);
    if (task.dataBoundary.calculationTraceInTask !== false) errors.push(`${task.taskId} must not store calculation traces`);
    if (task.dataBoundary.providerRuntimeCalled !== false) errors.push(`${task.taskId} must not call provider runtime`);
    if (task.dataBoundary.ocrRuntimeCalled !== false) errors.push(`${task.taskId} must not call OCR runtime`);
    if (task.dataBoundary.publicArchiveUiAdded !== false) errors.push(`${task.taskId} must not add public archive UI`);
    if (task.dataBoundary.learnerUiAdded !== false) errors.push(`${task.taskId} must not add learner UI`);
  }

  if (scheduler.learnerInstructorBoundary.learnerRouteOnly !== true) errors.push("S218 must remain learner route only");
  if (scheduler.learnerInstructorBoundary.instructorRouteSeparated !== true) errors.push("S218 must preserve instructor separation");
  if (scheduler.learnerInstructorBoundary.academyTenantDataAccessed !== false) errors.push("S218 must not access academy tenant data");
  if (scheduler.learnerInstructorBoundary.learnerInstructorDataMerged !== false) errors.push("S218 must not merge learner and instructor data");
  if (scheduler.authorityFlags.officialGrading !== false) errors.push("S218 must not allow official grading");
  if (scheduler.authorityFlags.officialModelAnswer !== false) errors.push("S218 must not allow official model answers");
  if (scheduler.authorityFlags.confirmedScore !== false) errors.push("S218 must not allow confirmed scores");
  if (scheduler.authorityFlags.passProbability !== false) errors.push("S218 must not allow pass probability");
  if (scheduler.authorityFlags.passGuarantee !== false) errors.push("S218 must not allow pass guarantees");
  if (scheduler.dataBoundary.metadataOnly !== true) errors.push("S218 scheduler must be metadata-only");
  if (scheduler.dataBoundary.learnerMaterialInScheduler !== false) errors.push("S218 must not store learner material");
  if (scheduler.dataBoundary.ocrMaterialInScheduler !== false) errors.push("S218 must not store OCR material");
  if (scheduler.dataBoundary.officialMaterialInScheduler !== false) errors.push("S218 must not store official material");
  if (scheduler.dataBoundary.referenceProseInScheduler !== false) errors.push("S218 must not store reference prose");
  if (scheduler.dataBoundary.sourceMaterialInScheduler !== false) errors.push("S218 must not store source material");
  if (scheduler.dataBoundary.calculationTraceInScheduler !== false) errors.push("S218 must not store calculation traces");
  if (scheduler.dataBoundary.providerRuntimeCalled !== false) errors.push("S218 must not call provider runtime");
  if (scheduler.dataBoundary.ocrRuntimeCalled !== false) errors.push("S218 must not call OCR runtime");
  if (scheduler.dataBoundary.globalReferenceWrite !== false) errors.push("S218 must not write global reference data");
  if (scheduler.dataBoundary.publicArchiveUiAdded !== false) errors.push("S218 must not add public archive UI");
  if (scheduler.dataBoundary.learnerUiAdded !== false) errors.push("S218 must not add learner UI");
  if (scheduler.dataBoundary.instructorRouteChanged !== false) errors.push("S218 must not change instructor routes");
  if (scheduler.dataBoundary.academyTenantDataAccessed !== false) errors.push("S218 must not access academy tenant data");
  if (scheduler.dataBoundary.modelTrainingUse !== false) errors.push("S218 must not use learner material for model training");

  if (scheduler.status === "ready" && scheduler.diagnostics.blockedQuestionIds.length > 0) {
    warnings.push("ready S218 scheduler omitted blocked candidate questions");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildS218SimilarQuestionReviewScheduler(input: S218SchedulerInput): S218BuildResult {
  assertNoRawSchedulerContent(input);
  assertLearnerOnly(input);

  const questionSnapshots = input.canonicalQuestions.map(questionGateSnapshot);
  const conceptSnapshots = input.conceptGraph?.nodes.map(conceptGateSnapshot) ?? [];
  const inputReasons = inputWithholdReasons(input);

  if (inputReasons.length > 0 || !input.conceptGraph) {
    const scheduler = baseScheduler(input, "withheld", inputReasons, questionSnapshots, conceptSnapshots, [], []);
    const validation = validateS218SimilarQuestionReviewScheduler(scheduler);
    if (!validation.valid) {
      throw new Error(`invalid-s218-similar-question-review-scheduler: ${validation.errors.join("; ")}`);
    }
    return {
      version: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
      scheduler,
      validation,
    };
  }

  const maxPrimaryTasks = input.maxPrimaryTasks ?? MAX_TODAY_PLAN_PRIMARY_TASKS;
  const taskResult = buildTasks(
    input.conceptGraph,
    input.canonicalQuestions,
    input.conceptTransferLinks ?? [],
    maxPrimaryTasks,
  );
  const conceptReasons = input.conceptGraph.nodes
    .filter(isActionableNode)
    .flatMap(conceptGateReasons);
  const actionableNodeCount = input.conceptGraph.nodes.filter(isActionableNode).length;
  const reasons: S218WithholdReason[] = [
    ...(actionableNodeCount === 0 ? ["no_actionable_recovery_state" as const] : []),
    ...(taskResult.tasks.length === 0 ? ["no_safe_related_question_metadata" as const] : []),
    ...conceptReasons,
    ...(taskResult.tasks.length > MAX_TODAY_PLAN_PRIMARY_TASKS ? ["today_plan_cap_exceeded" as const] : []),
  ];

  if (reasons.length > 0) {
    const scheduler = baseScheduler(input, "withheld", reasons, questionSnapshots, taskResult.conceptSnapshots, [], taskResult.skippedConceptNodeIds);
    const validation = validateS218SimilarQuestionReviewScheduler(scheduler);
    if (!validation.valid) {
      throw new Error(`invalid-s218-similar-question-review-scheduler: ${validation.errors.join("; ")}`);
    }
    return {
      version: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
      scheduler,
      validation,
    };
  }

  const scheduler = baseScheduler(input, "ready", [], questionSnapshots, taskResult.conceptSnapshots, taskResult.tasks, taskResult.skippedConceptNodeIds);
  const validation = validateS218SimilarQuestionReviewScheduler(scheduler);
  if (!validation.valid) {
    throw new Error(`invalid-s218-similar-question-review-scheduler: ${validation.errors.join("; ")}`);
  }
  return {
    version: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
    scheduler,
    validation,
  };
}

export function buildS218SimilarQuestionSchedulerContractReport() {
  return sanitizeDerivedMetadata({
    version: S218_SIMILAR_QUESTION_REVIEW_SCHEDULER_VERSION,
    sourceContractVersions: {
      s217: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
      s203: "SecondRoundCanonicalQuestionRecord",
    },
    supportedSubjects: ["law", "theory", "practice"],
    selectsRelatedHistoricalQuestionMetadata: true,
    supportsConceptTransfer: true,
    supportsRewriteDueMetadata: true,
    supportsDelayedRecallMetadata: true,
    supportsSpacedReviewMetadata: true,
    todayPlanMaxPrimaryTasks: MAX_TODAY_PLAN_PRIMARY_TASKS,
    metadataOnly: true,
    officialQuestionMaterialIncluded: false,
    officialAnswerMaterialIncluded: false,
    generatedAnswerProseIncluded: false,
    publicArchiveUiAdded: false,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    academyTenantDataAccessed: false,
    containsRawContent: false,
  });
}

export function assertS218FixtureMetadataOnly(value: unknown): void {
  assertNoRawSchedulerContent(value);
  const serialized = JSON.stringify(value);
  if (/"(?:questionText|answerText|referenceAnswerText|providerPayload|sourceExcerpt|ocrText|rawAnswerText|rawOcrText)"\s*:/i.test(serialized)) {
    throw new Error("s218-fixture-raw-content-field");
  }
  if (/official grading|official model answer|pass probability|pass guarantee|confirmed score/i.test(serialized)) {
    throw new Error("s218-fixture-prohibited-authority-claim");
  }
}
