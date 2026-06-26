import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  RUBRIC_EVIDENCE_CONTRACT_VERSION,
  RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL,
  type RubricEvidenceConfidenceLevel,
  type RubricEvidenceReviewStatus,
  type RubricEvidenceSubject,
  type RewriteOrRecalculationTaskHook,
} from "./rubric-evidence-contract";

export const REWRITE_REGRADE_HISTORY_CONTRACT_VERSION = "s206.rewrite_regrade_history.v1" as const;

export type RewriteRegradeAttemptKind = "root_submission" | "rewrite" | "recalculation";
export type RewriteRegradeTerminalAction = "initial_submission" | "rewrite" | "recalculation" | "scheduled_review";
export type RewriteRegradeStorageRecordKind =
  | "review_os_wrong_answer_item"
  | "learner_rewrite_attempt"
  | "learner_recalculation_attempt";
export type RewriteRegradeReviewRequestKind = "rewrite_re_review" | "recalculation_re_review";
export type RewriteRegradeReviewRequestStatus =
  | "metadata_ready"
  | "queued_for_subject_engine"
  | "completed_metadata_linked"
  | "withheld";
export type RewriteRegradeComparisonStatus = "not_reviewed_yet" | "compared" | "withheld";
export type RewriteRegradeImprovementStatus =
  | "not_reviewed_yet"
  | "improved_evidence_supported"
  | "partially_improved_evidence_supported"
  | "unchanged_evidence_supported"
  | "regressed_evidence_supported"
  | "mixed_evidence_supported"
  | "withheld_insufficient_evidence"
  | "withheld_unconfirmed_ocr"
  | "withheld_unverified_source"
  | "withheld_unsupported_calculation";

export type RewriteRegradePrivateStorageRef = {
  recordId: string;
  recordKind: RewriteRegradeStorageRecordKind;
  dataClass: "user_owned_service_data";
  ownerBinding: "authenticated_request_user";
  privateRecordMayContainLearnerMaterial: true;
  containsRawContent: false;
};

export type RewriteRegradeS205ReviewLink = {
  reviewId: string;
  sourceContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  reviewStatus: RubricEvidenceReviewStatus;
  evidenceRefIds: string[];
  deductionCandidateIds: string[];
  primaryGapId: string;
  nextActionId: string;
  taskHookKind: RewriteOrRecalculationTaskHook["kind"];
};

export type RewriteRegradeActionTarget = {
  primaryGapId: string;
  nextActionId: string;
  evidenceRefIds: string[];
  deductionCandidateIds: string[];
  conceptNodeIds: string[];
};

export type RewriteRegradeCalculationAttemptMetadata = {
  calculatorModel: typeof RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL;
  resetSafeHandKeyedRoutineOnly: true;
  storedProgramDependency: false;
  routineRefId: string;
  formulaStoredInContract: false;
  extractedValuesStoredInContract: false;
  handKeyedSequenceStoredInContract: false;
  expectedDisplayStoredInContract: false;
  unitCheckStatus: "pending" | "passed" | "failed" | "withheld";
  roundingCheckStatus: "pending" | "passed" | "failed" | "withheld";
};

type AnswerAttemptBase = {
  attemptId: string;
  rootAnswerSubmissionId: string;
  answerSubmissionId: string;
  attemptVersion: number;
  parentAttemptId: string | null;
  createdAt: string;
  privateStorageRef: RewriteRegradePrivateStorageRef;
};

export type RootSubmissionAttemptContract = AnswerAttemptBase & {
  attemptKind: "root_submission";
  parentAttemptId: null;
  sourceReviewLink: null;
  target: null;
  learnerActionTerminal: "initial_submission";
};

export type RewriteAttemptContract = AnswerAttemptBase & {
  attemptKind: "rewrite";
  sourceReviewLink: RewriteRegradeS205ReviewLink;
  target: RewriteRegradeActionTarget;
  learnerActionTerminal: "rewrite";
};

export type RecalculationAttemptContract = AnswerAttemptBase & {
  attemptKind: "recalculation";
  sourceReviewLink: RewriteRegradeS205ReviewLink;
  target: RewriteRegradeActionTarget;
  learnerActionTerminal: "recalculation";
  calculation: RewriteRegradeCalculationAttemptMetadata;
};

export type AnswerHistoryAttemptContract =
  | RootSubmissionAttemptContract
  | RewriteAttemptContract
  | RecalculationAttemptContract;

export type ReReviewRequestContract = {
  requestId: string;
  requestKind: RewriteRegradeReviewRequestKind;
  status: RewriteRegradeReviewRequestStatus;
  rootAnswerSubmissionId: string;
  targetAttemptId: string;
  targetAttemptVersion: number;
  baselineReviewId: string;
  requestedAt: string;
  sourceReviewLink: RewriteRegradeS205ReviewLink;
  usesSameRubricBlueprint: true;
  retryReviewAllowed: true;
  providerCallStarted: false;
  officialGrading: false;
  confirmedScore: false;
  passProbability: false;
  passGuarantee: false;
  resultMustStartWithGapAndAction: true;
};

export type RewriteRegradeScoreLikeComparisonMetadata = {
  rangeLowerDelta: number | null;
  rangeUpperDelta: number | null;
  scoreLikeSummarySecondary: true;
  nonOfficial: true;
  confirmedScore: false;
  passProbability: false;
  passGuarantee: false;
  notFinalEndpoint: true;
};

export type AnswerAttemptComparisonMetadata = {
  comparisonId: string;
  comparisonStatus: RewriteRegradeComparisonStatus;
  baselineAttemptId: string;
  comparedAttemptId: string;
  baselineReviewId: string;
  comparedReviewId: string | null;
  evidenceRefIds: string[];
  resolvedDeductionCandidateIds: string[];
  recurringDeductionCandidateIds: string[];
  newDeductionCandidateIds: string[];
  primaryGapChanged: boolean;
  primaryGapBeforeId: string | null;
  primaryGapAfterId: string | null;
  nextActionBeforeId: string | null;
  nextActionAfterId: string | null;
  improvement: {
    status: RewriteRegradeImprovementStatus;
    confidence: RubricEvidenceConfidenceLevel;
    evidenceRefIds: string[];
    deductionCandidateIds: string[];
    conceptNodeIds: string[];
    safeForS216ErrorNotebook: true;
    safeForS217ConceptGraph: true;
  };
  scoreLikeSummary: RewriteRegradeScoreLikeComparisonMetadata | null;
};

export type RewriteRegradeDerivedSignals = {
  improvementStatus: RewriteRegradeImprovementStatus;
  primaryGapId: string | null;
  nextActionId: string | null;
  evidenceRefIds: string[];
  deductionCandidateIds: string[];
  conceptNodeIds: string[];
  safeForS216ErrorNotebook: true;
  safeForS217ConceptGraph: true;
  reviewDueHint: "schedule_review" | "not_ready" | "none";
};

export type RewriteRegradeResultPresentationContract = {
  order: readonly [
    "one_biggest_gap",
    "one_next_action",
    "rewrite_or_recalculation",
    "re_review_request",
    "answer_history_comparison",
    "safe_derived_signals",
  ];
  startsWithGapAndAction: true;
  scoreLikeSummaryPosition: "secondary_optional_after_comparison";
  terminalState: "rewrite_or_recalculation_or_scheduled_review";
};

export type RewriteRegradeHistoryContract = {
  version: typeof REWRITE_REGRADE_HISTORY_CONTRACT_VERSION;
  dataClass: "derived_learning_metadata";
  examMode: "second";
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  historyId: string;
  rootAnswerSubmissionId: string;
  ownerBinding: "authenticated_request_user";
  attemptLineage: {
    rootAnswerSubmissionId: string;
    latestAttemptId: string;
    latestAttemptVersion: number;
    attempts: AnswerHistoryAttemptContract[];
  };
  reReviewRequests: ReReviewRequestContract[];
  comparisons: AnswerAttemptComparisonMetadata[];
  derivedSignals: RewriteRegradeDerivedSignals;
  resultPresentation: RewriteRegradeResultPresentationContract;
  authorityFlags: {
    nonOfficial: true;
    officialGrading: false;
    confirmedScore: false;
    passProbability: false;
    passGuarantee: false;
    scoreLikeSummarySecondary: true;
    terminalLearnerAction: "rewrite_or_recalculation_or_scheduled_review";
  };
  dataBoundary: {
    learnerMaterialInContract: false;
    ocrMaterialInContract: false;
    officialMaterialInContract: false;
    referenceMaterialInContract: false;
    privateStorageRefsOnly: true;
    globalReferenceWrite: false;
    modelTrainingUse: false;
    telemetrySafe: true;
  };
};

export type RewriteRegradeValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type RewriteRegradeHistoryDerivedMetadata = {
  contractVersion: typeof REWRITE_REGRADE_HISTORY_CONTRACT_VERSION;
  dataClass: "derived_learning_metadata";
  examMode: "second";
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  historyId: string;
  rootAnswerSubmissionId: string;
  latestAttemptId: string;
  latestAttemptKind: RewriteRegradeAttemptKind;
  latestAttemptVersion: number;
  attemptLineageCount: number;
  reReviewRequestCount: number;
  comparisonCount: number;
  primaryGapId: string | null;
  nextActionId: string | null;
  evidenceRefCount: number;
  deductionCandidateCount: number;
  conceptNodeCount: number;
  improvementStatus: RewriteRegradeImprovementStatus;
  reviewRequestStatus: RewriteRegradeReviewRequestStatus | null;
  comparisonStatus: RewriteRegradeComparisonStatus | null;
  safeForS216ErrorNotebook: true;
  safeForS217ConceptGraph: true;
  nonOfficial: true;
  confirmedScore: false;
  passProbability: false;
  passGuarantee: false;
  resultStartsWithGapAndAction: true;
  terminalLearnerAction: "rewrite_or_recalculation_or_scheduled_review";
  containsRawContent: false;
};

const EXPECTED_PRESENTATION_ORDER: RewriteRegradeResultPresentationContract["order"] = [
  "one_biggest_gap",
  "one_next_action",
  "rewrite_or_recalculation",
  "re_review_request",
  "answer_history_comparison",
  "safe_derived_signals",
];

const REVIEW_STATUSES: readonly RubricEvidenceReviewStatus[] = [
  "ready",
  "withheld_insufficient_evidence",
  "withheld_unconfirmed_ocr",
  "withheld_unverified_source",
  "withheld_unsupported_subject",
  "withheld_unsupported_calculation",
];

const TASK_HOOK_KINDS: readonly RewriteOrRecalculationTaskHook["kind"][] = [
  "rewrite",
  "recalculation",
  "ocr_confirmation",
  "scheduled_review",
  "withheld",
];

const IMPROVEMENT_STATUSES: readonly RewriteRegradeImprovementStatus[] = [
  "not_reviewed_yet",
  "improved_evidence_supported",
  "partially_improved_evidence_supported",
  "unchanged_evidence_supported",
  "regressed_evidence_supported",
  "mixed_evidence_supported",
  "withheld_insufficient_evidence",
  "withheld_unconfirmed_ocr",
  "withheld_unverified_source",
  "withheld_unsupported_calculation",
];

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function addRequiredStringError(errors: string[], value: unknown, path: string) {
  if (!isNonEmptyString(value)) errors.push(`${path} must be a non-empty string`);
}

function hasRawBoundaryIssue(value: unknown) {
  try {
    assertNoRawUserDataInDerived(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "raw-user-data-in-derived-metadata";
  }
}

function addKnownIdErrors(errors: string[], ids: readonly string[], knownIds: ReadonlySet<string>, path: string, requireNonEmpty = true) {
  if (!Array.isArray(ids) || (requireNonEmpty && ids.length === 0)) {
    errors.push(`${path} must reference ${requireNonEmpty ? "at least one " : ""}known id`);
    return;
  }
  for (const id of ids) {
    if (!knownIds.has(id)) errors.push(`${path} references unknown id ${id}`);
  }
}

function addUniqueIdErrors(errors: string[], ids: readonly string[], path: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${path} must be unique; duplicate ${id}`);
    seen.add(id);
  }
}

function validatePrivateStorageRef(ref: RewriteRegradePrivateStorageRef, path: string, errors: string[]) {
  addRequiredStringError(errors, ref.recordId, `${path}.recordId`);
  if (ref.dataClass !== "user_owned_service_data") errors.push(`${path}.dataClass must be user_owned_service_data`);
  if (ref.ownerBinding !== "authenticated_request_user") errors.push(`${path}.ownerBinding must bind to authenticated_request_user`);
  if (ref.privateRecordMayContainLearnerMaterial !== true) {
    errors.push(`${path}.privateRecordMayContainLearnerMaterial must acknowledge user-owned service storage`);
  }
  if (ref.containsRawContent !== false) errors.push(`${path}.containsRawContent must be false`);
}

function validateReviewLink(link: RewriteRegradeS205ReviewLink, path: string, errors: string[]) {
  addRequiredStringError(errors, link.reviewId, `${path}.reviewId`);
  if (link.sourceContractVersion !== RUBRIC_EVIDENCE_CONTRACT_VERSION) {
    errors.push(`${path}.sourceContractVersion must be ${RUBRIC_EVIDENCE_CONTRACT_VERSION}`);
  }
  if (!REVIEW_STATUSES.includes(link.reviewStatus)) errors.push(`${path}.reviewStatus is invalid`);
  if (!TASK_HOOK_KINDS.includes(link.taskHookKind)) errors.push(`${path}.taskHookKind is invalid`);
  if (!Array.isArray(link.evidenceRefIds) || link.evidenceRefIds.length === 0) {
    errors.push(`${path}.evidenceRefIds must link at least one S205 evidence ref`);
  }
  addRequiredStringError(errors, link.primaryGapId, `${path}.primaryGapId`);
  addRequiredStringError(errors, link.nextActionId, `${path}.nextActionId`);
}

function validateActionTarget(target: RewriteRegradeActionTarget, link: RewriteRegradeS205ReviewLink, path: string, errors: string[]) {
  if (target.primaryGapId !== link.primaryGapId) errors.push(`${path}.primaryGapId must match sourceReviewLink.primaryGapId`);
  if (target.nextActionId !== link.nextActionId) errors.push(`${path}.nextActionId must match sourceReviewLink.nextActionId`);
  addKnownIdErrors(errors, target.evidenceRefIds, new Set(link.evidenceRefIds), `${path}.evidenceRefIds`);
  addKnownIdErrors(errors, target.deductionCandidateIds, new Set(link.deductionCandidateIds), `${path}.deductionCandidateIds`, false);
}

function validateCalculation(calculation: RewriteRegradeCalculationAttemptMetadata, path: string, errors: string[]) {
  if (calculation.calculatorModel !== RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL) {
    errors.push(`${path}.calculatorModel must be ${RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL}`);
  }
  if (calculation.resetSafeHandKeyedRoutineOnly !== true) errors.push(`${path}.resetSafeHandKeyedRoutineOnly must be true`);
  if (calculation.storedProgramDependency !== false) errors.push(`${path}.storedProgramDependency must be false`);
  addRequiredStringError(errors, calculation.routineRefId, `${path}.routineRefId`);
  if (calculation.formulaStoredInContract !== false) errors.push(`${path}.formulaStoredInContract must be false`);
  if (calculation.extractedValuesStoredInContract !== false) errors.push(`${path}.extractedValuesStoredInContract must be false`);
  if (calculation.handKeyedSequenceStoredInContract !== false) errors.push(`${path}.handKeyedSequenceStoredInContract must be false`);
  if (calculation.expectedDisplayStoredInContract !== false) errors.push(`${path}.expectedDisplayStoredInContract must be false`);
}

function validateAttempt(
  attempt: AnswerHistoryAttemptContract,
  index: number,
  rootAnswerSubmissionId: string,
  attemptIds: ReadonlySet<string>,
  errors: string[],
) {
  const path = `attemptLineage.attempts[${index}]`;
  addRequiredStringError(errors, attempt.attemptId, `${path}.attemptId`);
  if (attempt.rootAnswerSubmissionId !== rootAnswerSubmissionId) errors.push(`${path}.rootAnswerSubmissionId must match contract rootAnswerSubmissionId`);
  if (attempt.answerSubmissionId !== rootAnswerSubmissionId) errors.push(`${path}.answerSubmissionId must link to the root answer submission`);
  if (!Number.isInteger(attempt.attemptVersion) || attempt.attemptVersion < 1) errors.push(`${path}.attemptVersion must be a positive integer`);
  if (attempt.parentAttemptId !== null && !attemptIds.has(attempt.parentAttemptId)) {
    errors.push(`${path}.parentAttemptId references unknown attempt`);
  }
  if (attempt.parentAttemptId === attempt.attemptId) errors.push(`${path}.parentAttemptId must not self-reference`);
  addRequiredStringError(errors, attempt.createdAt, `${path}.createdAt`);
  validatePrivateStorageRef(attempt.privateStorageRef, `${path}.privateStorageRef`, errors);

  if (attempt.attemptKind === "root_submission") {
    if (attempt.attemptVersion !== 1) errors.push(`${path} root_submission must be version 1`);
    if (attempt.parentAttemptId !== null) errors.push(`${path} root_submission parentAttemptId must be null`);
    if (attempt.sourceReviewLink !== null || attempt.target !== null) errors.push(`${path} root_submission must not carry review target metadata`);
    if (attempt.learnerActionTerminal !== "initial_submission") errors.push(`${path}.learnerActionTerminal must be initial_submission`);
    return;
  }

  validateReviewLink(attempt.sourceReviewLink, `${path}.sourceReviewLink`, errors);
  validateActionTarget(attempt.target, attempt.sourceReviewLink, `${path}.target`, errors);
  if (attempt.attemptKind === "rewrite") {
    if (attempt.sourceReviewLink.taskHookKind !== "rewrite") errors.push(`${path}.sourceReviewLink.taskHookKind must be rewrite`);
    if (attempt.learnerActionTerminal !== "rewrite") errors.push(`${path}.learnerActionTerminal must be rewrite`);
    return;
  }

  if (attempt.sourceReviewLink.taskHookKind !== "recalculation") errors.push(`${path}.sourceReviewLink.taskHookKind must be recalculation`);
  if (attempt.learnerActionTerminal !== "recalculation") errors.push(`${path}.learnerActionTerminal must be recalculation`);
  validateCalculation(attempt.calculation, `${path}.calculation`, errors);
}

function validateLineage(contract: RewriteRegradeHistoryContract, errors: string[]) {
  const lineage = contract.attemptLineage;
  if (lineage.rootAnswerSubmissionId !== contract.rootAnswerSubmissionId) {
    errors.push("attemptLineage.rootAnswerSubmissionId must match contract rootAnswerSubmissionId");
  }
  if (lineage.attempts.length === 0) errors.push("attemptLineage.attempts must not be empty");

  const attemptIds = new Set(lineage.attempts.map((attempt) => attempt.attemptId));
  addUniqueIdErrors(errors, lineage.attempts.map((attempt) => attempt.attemptId), "attemptLineage.attempts.attemptId");

  const sorted = [...lineage.attempts].sort((left, right) => left.attemptVersion - right.attemptVersion);
  sorted.forEach((attempt, index) => {
    const expected = index + 1;
    if (attempt.attemptVersion !== expected) errors.push(`attemptLineage version sequence must be contiguous from 1; expected ${expected}`);
  });

  const rootAttempts = lineage.attempts.filter((attempt) => attempt.attemptKind === "root_submission");
  if (rootAttempts.length !== 1) errors.push("attemptLineage must include exactly one root_submission attempt");

  const latest = lineage.attempts.find((attempt) => attempt.attemptId === lineage.latestAttemptId);
  if (!latest) {
    errors.push("attemptLineage.latestAttemptId must reference a known attempt");
  } else if (latest.attemptVersion !== lineage.latestAttemptVersion) {
    errors.push("attemptLineage.latestAttemptVersion must match latest attempt");
  }
  const maxVersion = Math.max(0, ...lineage.attempts.map((attempt) => attempt.attemptVersion));
  if (lineage.latestAttemptVersion !== maxVersion) errors.push("attemptLineage.latestAttemptVersion must be the max attempt version");

  lineage.attempts.forEach((attempt, index) => validateAttempt(attempt, index, contract.rootAnswerSubmissionId, attemptIds, errors));
}

function validateReviewRequest(
  request: ReReviewRequestContract,
  index: number,
  rootAnswerSubmissionId: string,
  attemptsById: ReadonlyMap<string, AnswerHistoryAttemptContract>,
  errors: string[],
) {
  const path = `reReviewRequests[${index}]`;
  addRequiredStringError(errors, request.requestId, `${path}.requestId`);
  if (request.rootAnswerSubmissionId !== rootAnswerSubmissionId) errors.push(`${path}.rootAnswerSubmissionId must match contract rootAnswerSubmissionId`);
  const targetAttempt = attemptsById.get(request.targetAttemptId);
  if (!targetAttempt) {
    errors.push(`${path}.targetAttemptId references unknown attempt`);
  } else {
    if (targetAttempt.attemptKind === "root_submission") errors.push(`${path}.targetAttemptId must point to a rewrite or recalculation attempt`);
    if (request.targetAttemptVersion !== targetAttempt.attemptVersion) errors.push(`${path}.targetAttemptVersion must match target attempt`);
    if (request.requestKind === "rewrite_re_review" && targetAttempt.attemptKind !== "rewrite") {
      errors.push(`${path}.requestKind must match rewrite target attempt`);
    }
    if (request.requestKind === "recalculation_re_review" && targetAttempt.attemptKind !== "recalculation") {
      errors.push(`${path}.requestKind must match recalculation target attempt`);
    }
  }
  addRequiredStringError(errors, request.baselineReviewId, `${path}.baselineReviewId`);
  addRequiredStringError(errors, request.requestedAt, `${path}.requestedAt`);
  validateReviewLink(request.sourceReviewLink, `${path}.sourceReviewLink`, errors);
  if (request.usesSameRubricBlueprint !== true) errors.push(`${path}.usesSameRubricBlueprint must be true`);
  if (request.retryReviewAllowed !== true) errors.push(`${path}.retryReviewAllowed must be true`);
  if (request.providerCallStarted !== false) errors.push(`${path}.providerCallStarted must be false in S206`);
  if (request.officialGrading !== false) errors.push(`${path}.officialGrading must be false`);
  if (request.confirmedScore !== false) errors.push(`${path}.confirmedScore must be false`);
  if (request.passProbability !== false) errors.push(`${path}.passProbability must be false`);
  if (request.passGuarantee !== false) errors.push(`${path}.passGuarantee must be false`);
  if (request.resultMustStartWithGapAndAction !== true) errors.push(`${path}.resultMustStartWithGapAndAction must be true`);
}

function validateScoreLikeSummary(summary: RewriteRegradeScoreLikeComparisonMetadata | null, path: string, errors: string[]) {
  if (summary === null) return;
  if (summary.scoreLikeSummarySecondary !== true) errors.push(`${path}.scoreLikeSummarySecondary must be true`);
  if (summary.nonOfficial !== true) errors.push(`${path}.nonOfficial must be true`);
  if (summary.confirmedScore !== false) errors.push(`${path}.confirmedScore must be false`);
  if (summary.passProbability !== false) errors.push(`${path}.passProbability must be false`);
  if (summary.passGuarantee !== false) errors.push(`${path}.passGuarantee must be false`);
  if (summary.notFinalEndpoint !== true) errors.push(`${path}.notFinalEndpoint must be true`);
}

function validateComparison(
  comparison: AnswerAttemptComparisonMetadata,
  index: number,
  attemptIds: ReadonlySet<string>,
  knownReviewIds: ReadonlySet<string>,
  errors: string[],
) {
  const path = `comparisons[${index}]`;
  addRequiredStringError(errors, comparison.comparisonId, `${path}.comparisonId`);
  if (!attemptIds.has(comparison.baselineAttemptId)) errors.push(`${path}.baselineAttemptId references unknown attempt`);
  if (!attemptIds.has(comparison.comparedAttemptId)) errors.push(`${path}.comparedAttemptId references unknown attempt`);
  if (comparison.baselineAttemptId === comparison.comparedAttemptId) errors.push(`${path} must compare two different attempts`);
  if (!knownReviewIds.has(comparison.baselineReviewId)) errors.push(`${path}.baselineReviewId references unknown S205 review link`);
  if (comparison.comparisonStatus === "compared" && !comparison.comparedReviewId) {
    errors.push(`${path}.comparedReviewId is required when comparisonStatus is compared`);
  }
  if (comparison.comparedReviewId && !knownReviewIds.has(comparison.comparedReviewId)) {
    errors.push(`${path}.comparedReviewId references unknown S205 review link`);
  }
  if (!IMPROVEMENT_STATUSES.includes(comparison.improvement.status)) errors.push(`${path}.improvement.status is invalid`);
  if (comparison.improvement.safeForS216ErrorNotebook !== true) errors.push(`${path}.improvement.safeForS216ErrorNotebook must be true`);
  if (comparison.improvement.safeForS217ConceptGraph !== true) errors.push(`${path}.improvement.safeForS217ConceptGraph must be true`);
  validateScoreLikeSummary(comparison.scoreLikeSummary, `${path}.scoreLikeSummary`, errors);
}

function validatePresentation(contract: RewriteRegradeHistoryContract, errors: string[]) {
  const order = contract.resultPresentation.order;
  if (order.length !== EXPECTED_PRESENTATION_ORDER.length || order.some((entry, index) => entry !== EXPECTED_PRESENTATION_ORDER[index])) {
    errors.push("resultPresentation.order must keep one biggest gap and one next action before score-like summaries");
  }
  if (contract.resultPresentation.startsWithGapAndAction !== true) {
    errors.push("resultPresentation.startsWithGapAndAction must be true");
  }
  if (contract.resultPresentation.scoreLikeSummaryPosition !== "secondary_optional_after_comparison") {
    errors.push("score-like comparison metadata must be secondary and optional");
  }
  if (contract.resultPresentation.terminalState !== "rewrite_or_recalculation_or_scheduled_review") {
    errors.push("rewrite/regrade history must end in rewrite, recalculation, or scheduled review");
  }
}

function collectKnownReviewIds(contract: RewriteRegradeHistoryContract) {
  const ids = new Set<string>();
  for (const attempt of contract.attemptLineage.attempts) {
    if (attempt.sourceReviewLink) ids.add(attempt.sourceReviewLink.reviewId);
  }
  for (const request of contract.reReviewRequests) {
    ids.add(request.sourceReviewLink.reviewId);
    ids.add(request.baselineReviewId);
  }
  return ids;
}

export function validateRewriteRegradeHistoryContract(contract: RewriteRegradeHistoryContract): RewriteRegradeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rawBoundaryIssue = hasRawBoundaryIssue(contract);
  if (rawBoundaryIssue) errors.push(rawBoundaryIssue);

  if (contract.version !== REWRITE_REGRADE_HISTORY_CONTRACT_VERSION) {
    errors.push("contract version must be s206.rewrite_regrade_history.v1");
  }
  if (contract.dataClass !== "derived_learning_metadata") errors.push("contract dataClass must be derived_learning_metadata");
  if (contract.examMode !== "second") errors.push("contract examMode must be second");
  addRequiredStringError(errors, contract.subjectLabel, "subjectLabel");
  addRequiredStringError(errors, contract.historyId, "historyId");
  addRequiredStringError(errors, contract.rootAnswerSubmissionId, "rootAnswerSubmissionId");
  if (contract.ownerBinding !== "authenticated_request_user") errors.push("ownerBinding must bind to authenticated_request_user");

  validateLineage(contract, errors);
  const attemptsById = new Map(contract.attemptLineage.attempts.map((attempt) => [attempt.attemptId, attempt] as const));
  const attemptIds = new Set(attemptsById.keys());
  const knownReviewIds = collectKnownReviewIds(contract);
  contract.reReviewRequests.forEach((request, index) => (
    validateReviewRequest(request, index, contract.rootAnswerSubmissionId, attemptsById, errors)
  ));
  contract.comparisons.forEach((comparison, index) => validateComparison(comparison, index, attemptIds, knownReviewIds, errors));

  if (!IMPROVEMENT_STATUSES.includes(contract.derivedSignals.improvementStatus)) {
    errors.push("derivedSignals.improvementStatus is invalid");
  }
  if (contract.derivedSignals.safeForS216ErrorNotebook !== true) errors.push("derivedSignals.safeForS216ErrorNotebook must be true");
  if (contract.derivedSignals.safeForS217ConceptGraph !== true) errors.push("derivedSignals.safeForS217ConceptGraph must be true");

  validatePresentation(contract, errors);

  if (contract.authorityFlags.nonOfficial !== true) errors.push("authorityFlags.nonOfficial must be true");
  if (contract.authorityFlags.officialGrading !== false) errors.push("authorityFlags.officialGrading must be false");
  if (contract.authorityFlags.confirmedScore !== false) errors.push("authorityFlags.confirmedScore must be false");
  if (contract.authorityFlags.passProbability !== false) errors.push("authorityFlags.passProbability must be false");
  if (contract.authorityFlags.passGuarantee !== false) errors.push("authorityFlags.passGuarantee must be false");
  if (contract.authorityFlags.scoreLikeSummarySecondary !== true) errors.push("authorityFlags.scoreLikeSummarySecondary must be true");
  if (contract.authorityFlags.terminalLearnerAction !== "rewrite_or_recalculation_or_scheduled_review") {
    errors.push("authorityFlags.terminalLearnerAction must keep score display from being terminal");
  }

  if (contract.dataBoundary.learnerMaterialInContract !== false) errors.push("dataBoundary.learnerMaterialInContract must be false");
  if (contract.dataBoundary.ocrMaterialInContract !== false) errors.push("dataBoundary.ocrMaterialInContract must be false");
  if (contract.dataBoundary.officialMaterialInContract !== false) errors.push("dataBoundary.officialMaterialInContract must be false");
  if (contract.dataBoundary.referenceMaterialInContract !== false) errors.push("dataBoundary.referenceMaterialInContract must be false");
  if (contract.dataBoundary.privateStorageRefsOnly !== true) errors.push("dataBoundary.privateStorageRefsOnly must be true");
  if (contract.dataBoundary.globalReferenceWrite !== false) errors.push("dataBoundary.globalReferenceWrite must be false");
  if (contract.dataBoundary.modelTrainingUse !== false) errors.push("dataBoundary.modelTrainingUse must be false");
  if (contract.dataBoundary.telemetrySafe !== true) errors.push("dataBoundary.telemetrySafe must be true");

  if (contract.reReviewRequests.length === 0 && contract.attemptLineage.attempts.length > 1) {
    warnings.push("rewrite/recalculation attempts should normally create a re-review request");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertValidRewriteRegradeHistoryContract(contract: RewriteRegradeHistoryContract): void {
  const result = validateRewriteRegradeHistoryContract(contract);
  if (!result.valid) {
    throw new Error(`invalid-rewrite-regrade-history-contract: ${result.errors.join("; ")}`);
  }
}

function getLatestAttempt(contract: RewriteRegradeHistoryContract) {
  return contract.attemptLineage.attempts.find((attempt) => attempt.attemptId === contract.attemptLineage.latestAttemptId);
}

function getLatestComparison(contract: RewriteRegradeHistoryContract) {
  return contract.comparisons[contract.comparisons.length - 1] ?? null;
}

function getLatestRequest(contract: RewriteRegradeHistoryContract) {
  return contract.reReviewRequests[contract.reReviewRequests.length - 1] ?? null;
}

export function buildRewriteRegradeHistoryDerivedMetadata(
  contract: RewriteRegradeHistoryContract,
): RewriteRegradeHistoryDerivedMetadata {
  assertValidRewriteRegradeHistoryContract(contract);
  const latestAttempt = getLatestAttempt(contract);
  if (!latestAttempt) throw new Error("invalid-rewrite-regrade-history-contract: missing latest attempt");
  const latestComparison = getLatestComparison(contract);
  const latestRequest = getLatestRequest(contract);
  const metadata = sanitizeDerivedMetadata({
    contractVersion: contract.version,
    dataClass: "derived_learning_metadata",
    examMode: contract.examMode,
    subject: contract.subject,
    subjectLabel: contract.subjectLabel,
    historyId: contract.historyId,
    rootAnswerSubmissionId: contract.rootAnswerSubmissionId,
    latestAttemptId: latestAttempt.attemptId,
    latestAttemptKind: latestAttempt.attemptKind,
    latestAttemptVersion: latestAttempt.attemptVersion,
    attemptLineageCount: contract.attemptLineage.attempts.length,
    reReviewRequestCount: contract.reReviewRequests.length,
    comparisonCount: contract.comparisons.length,
    primaryGapId: contract.derivedSignals.primaryGapId,
    nextActionId: contract.derivedSignals.nextActionId,
    evidenceRefCount: contract.derivedSignals.evidenceRefIds.length,
    deductionCandidateCount: contract.derivedSignals.deductionCandidateIds.length,
    conceptNodeCount: contract.derivedSignals.conceptNodeIds.length,
    improvementStatus: contract.derivedSignals.improvementStatus,
    reviewRequestStatus: latestRequest?.status ?? null,
    comparisonStatus: latestComparison?.comparisonStatus ?? null,
    safeForS216ErrorNotebook: true,
    safeForS217ConceptGraph: true,
    nonOfficial: true,
    confirmedScore: false,
    passProbability: false,
    passGuarantee: false,
    resultStartsWithGapAndAction: true,
    terminalLearnerAction: "rewrite_or_recalculation_or_scheduled_review",
    containsRawContent: false,
  }) as RewriteRegradeHistoryDerivedMetadata;
  assertNoRawUserDataInDerived(metadata);
  return metadata;
}
