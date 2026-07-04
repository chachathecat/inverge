import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL,
  type RubricEvidenceConfidenceLevel,
  type RubricEvidenceSubject,
} from "./rubric-evidence-contract";
import {
  S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
  validateS216ErrorNotebookEntry,
  type S216AutomaticErrorNotebookEntry,
  type S216NextReviewMetadata,
  type S216NotebookEntryStatus,
  type S216RecoveryActionType,
  type S216RecurrenceMetadata,
  type S216WithholdReason,
} from "./s216-error-notebook-gap-taxonomy";

export const S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION = "s217.personal_core_concept_graph.v1" as const;

export const S217_CONCEPT_STATES = [
  "unknown",
  "exposed",
  "confused",
  "wrong",
  "recurring",
  "recovering",
  "stable",
  "at-risk",
] as const;

export type S217ConceptState = typeof S217_CONCEPT_STATES[number];
export type S217GraphStatus = "ready" | "withheld";
export type S217RecoveryStateStatus = "ready" | "withheld";
export type S217DelayedRecallStatus = "recalled" | "partial" | "missed" | "not_due";
export type S217MasteryStatus = "unstarted" | "exposed" | "recovering" | "stable";
export type S217ForgettingRiskLevel = "none" | "low" | "medium" | "high";
export type S217ExamImpactLevel = "low" | "medium" | "high";

export type S217WithholdReason =
  | "s216_metadata_missing"
  | "s216_validation_failed"
  | "s216_entry_withheld"
  | "s216_recovery_not_safe_for_s217"
  | "learner_evidence_reference_missing"
  | "learner_evidence_unconfirmed"
  | "source_review_unresolved"
  | "reference_release_unresolved"
  | "subject_review_metadata_unresolved"
  | "concept_node_missing"
  | "learner_instructor_boundary_violation"
  | "academy_tenant_boundary_violation"
  | "data_boundary_violation"
  | "delayed_recall_metadata_unresolved";

export type S217ConceptExposureSeed = {
  seedId: string;
  conceptNodeId: string;
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  subjectDimensionIds: string[];
  exposureStatus: "unknown" | "exposed";
  observedAt: string | null;
  sourceRefIds: string[];
  safeForS217ConceptGraph: true;
  metadataOnly: true;
  containsRawContent: false;
};

export type S217DelayedRecallSignal = {
  signalId: string;
  conceptNodeId: string;
  subject: RubricEvidenceSubject;
  observedAt: string;
  recallStatus: S217DelayedRecallStatus;
  sourceEntryId: string | null;
  evidenceRefIds: string[];
  nextReviewStatus: S216NextReviewMetadata["status"];
  safeForS217ConceptGraph: true;
  metadataOnly: true;
  containsRawContent: false;
};

export type S217PersonalCoreConceptGraphInput = {
  graphId: string;
  learnerId: string;
  generatedAt: string;
  consumer: "learner";
  actorRole: "learner";
  ownerBinding: "authenticated_request_user";
  s216Entries: S216AutomaticErrorNotebookEntry[];
  conceptSeeds?: S217ConceptExposureSeed[];
  delayedRecallSignals?: S217DelayedRecallSignal[];
};

export type S217SourceGateSnapshot = {
  s216EntryId: string;
  s216Status: S216NotebookEntryStatus | "missing";
  s216WithholdReasons: S216WithholdReason[];
  s217WithholdReasons: S217WithholdReason[];
  validationErrors: string[];
  referenceBlockerCodes: string[];
  sourceReviewId: string | null;
  subject: RubricEvidenceSubject | null;
  conceptNodeIds: string[];
  containsRawContent: false;
};

export type S217ExposureMetadata = {
  exposureCount: number;
  firstExposedAt: string | null;
  lastExposedAt: string | null;
  sourceEntryIds: string[];
  questionIds: string[];
  sourceReviewIds: string[];
  referencePackageIds: string[];
  learnerEvidenceRefIds: string[];
  sourceRefIds: string[];
  seedIds: string[];
  containsRawContent: false;
};

export type S217ErrorMetadata = {
  errorCount: number;
  latestErrorAt: string | null;
  gapCategoryIds: string[];
  primaryGapIds: string[];
  primaryGapTypes: string[];
  deductionCandidateIds: string[];
  rootCauseIds: string[];
  confidenceLevels: RubricEvidenceConfidenceLevel[];
  containsRawContent: false;
};

export type S217RecurrenceMetadata = {
  recurrenceCount: number;
  recurrenceStatuses: S216RecurrenceMetadata["status"][];
  latestComparisonId: string | null;
  latestImprovementStatus: S216RecurrenceMetadata["improvementStatus"];
  duplicateRootCauseGroupIds: string[];
  recurringDeductionCandidateIds: string[];
  resolvedDeductionCandidateIds: string[];
  newDeductionCandidateIds: string[];
  evidenceRefIds: string[];
  containsRawContent: false;
};

export type S217SuccessfulRecoveryMetadata = {
  recoveryActionTypes: S216RecoveryActionType[];
  hookKinds: string[];
  targetGapIds: string[];
  rewriteHistoryIds: string[];
  reReviewRequestIds: string[];
  successfulRewriteCount: number;
  successfulRecalculationCount: number;
  latestSuccessfulRecoveryAt: string | null;
  retryReviewAllowed: boolean;
  calculator:
    | {
        model: typeof RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL;
        resetSafeHandKeyedRoutineOnly: true;
        storedProgramDependency: false;
      }
    | null;
  containsRawContent: false;
};

export type S217DelayedRecallMetadata = {
  scheduledReviewCount: number;
  reviewQueueCandidate: boolean;
  nextActionIds: string[];
  delayedRecallSignalIds: string[];
  delayedRecallCount: number;
  recalledCount: number;
  partialCount: number;
  missedCount: number;
  latestRecallStatus: S217DelayedRecallStatus | null;
  latestObservedAt: string | null;
  containsRawContent: false;
};

export type S217MasteryMetadata = {
  masteryStatus: S217MasteryStatus;
  masteryConfidence: RubricEvidenceConfidenceLevel;
  stableEvidenceCount: number;
  recoveryEvidenceCount: number;
  readyForMaintenanceReview: boolean;
  containsRawContent: false;
};

export type S217ForgettingRiskMetadata = {
  forgettingRiskLevel: S217ForgettingRiskLevel;
  atRisk: boolean;
  reasons: string[];
  nextReviewStatus: S216NextReviewMetadata["status"] | "none";
  reviewDueHint: S216NextReviewMetadata["reviewDueHint"] | "none";
  containsRawContent: false;
};

export type S217ExamImpactMetadata = {
  examImpactLevel: S217ExamImpactLevel;
  subject: RubricEvidenceSubject;
  subjectDimensionIds: string[];
  affectedQuestionIds: string[];
  evidenceSupportedGapCount: number;
  recurringGapCount: number;
  sourceReleaseReady: boolean;
  learningReferenceCaveatPresent: boolean;
  scoreLikeMetadataIgnoredForState: true;
  containsRawContent: false;
};

export type S217PersonalCoreConceptNode = {
  nodeId: string;
  learnerId: string;
  conceptNodeId: string;
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  subjectDimensionIds: string[];
  conceptState: S217ConceptState;
  exposureMetadata: S217ExposureMetadata;
  errorMetadata: S217ErrorMetadata;
  recurrenceMetadata: S217RecurrenceMetadata;
  successfulRecoveryMetadata: S217SuccessfulRecoveryMetadata;
  delayedRecallMetadata: S217DelayedRecallMetadata;
  masteryMetadata: S217MasteryMetadata;
  forgettingRiskMetadata: S217ForgettingRiskMetadata;
  examImpactMetadata: S217ExamImpactMetadata;
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
    learnerMaterialInNode: false;
    ocrMaterialInNode: false;
    officialMaterialInNode: false;
    referenceProseInNode: false;
    sourceMaterialInNode: false;
    calculationTraceInNode: false;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    academyTenantDataAccessed: false;
    modelTrainingUse: false;
    containsRawContent: false;
  };
};

export type S217SubjectGraphMetadata = {
  subject: RubricEvidenceSubject;
  subjectLabel: string | null;
  conceptNodeIds: string[];
  subjectDimensionIds: string[];
  sourceEntryIds: string[];
  exposureCount: number;
  errorCount: number;
  recurrenceCount: number;
  successfulRecoveryCount: number;
  delayedRecallCount: number;
  atRiskCount: number;
  containsRawContent: false;
};

export type S217RecoveryStateContract = {
  status: S217RecoveryStateStatus;
  pendingRecoveryConceptNodeIds: string[];
  successfulRecoveryConceptNodeIds: string[];
  stableConceptNodeIds: string[];
  atRiskConceptNodeIds: string[];
  recurringConceptNodeIds: string[];
  todayPlanCandidateCount: number;
  reviewQueueCandidateCount: number;
  sourceEntryIds: string[];
  terminalState: "retry_rewrite_regrade_or_scheduled_review";
  containsRawContent: false;
};

export type S217PersonalCoreConceptGraph = {
  version: typeof S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION;
  dataClass: "derived_learning_metadata";
  graphId: string;
  learnerId: string;
  generatedAt: string;
  ownerBinding: "authenticated_request_user";
  examMode: "second";
  status: S217GraphStatus;
  withhold: {
    withheld: boolean;
    reasons: S217WithholdReason[];
    s216Reasons: S216WithholdReason[];
    validationErrors: string[];
    referenceBlockerCodes: string[];
    sourceGateSnapshots: S217SourceGateSnapshot[];
  };
  sourceContracts: {
    s216Version: typeof S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION;
    s216EntryIds: string[];
    s216EntryCount: number;
    delayedRecallSignalIds: string[];
    conceptSeedIds: string[];
  };
  subjects: Record<RubricEvidenceSubject, S217SubjectGraphMetadata>;
  nodes: S217PersonalCoreConceptNode[];
  recoveryState: S217RecoveryStateContract;
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
    learnerMaterialInGraph: false;
    ocrMaterialInGraph: false;
    officialMaterialInGraph: false;
    referenceProseInGraph: false;
    sourceMaterialInGraph: false;
    calculationTraceInGraph: false;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    globalReferenceWrite: false;
    academyTenantDataAccessed: false;
    modelTrainingUse: false;
    telemetrySafe: true;
    containsRawContent: false;
  };
};

export type S217ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type S217BuildResult = {
  version: typeof S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION;
  graph: S217PersonalCoreConceptGraph;
  validation: S217ValidationResult;
};

type MutableNode = {
  conceptNodeId: string;
  subject: RubricEvidenceSubject;
  subjectLabel: string;
  subjectDimensionIds: Set<string>;
  sourceEntryIds: Set<string>;
  questionIds: Set<string>;
  sourceReviewIds: Set<string>;
  referencePackageIds: Set<string>;
  learnerEvidenceRefIds: Set<string>;
  sourceRefIds: Set<string>;
  seedIds: Set<string>;
  exposureDates: string[];
  errorDates: string[];
  gapCategoryIds: Set<string>;
  primaryGapIds: Set<string>;
  primaryGapTypes: Set<string>;
  deductionCandidateIds: Set<string>;
  rootCauseIds: Set<string>;
  confidenceLevels: Set<RubricEvidenceConfidenceLevel>;
  recurrenceStatuses: Set<S216RecurrenceMetadata["status"]>;
  latestComparisonId: string | null;
  latestImprovementStatus: S216RecurrenceMetadata["improvementStatus"];
  duplicateRootCauseGroupIds: Set<string>;
  recurringDeductionCandidateIds: Set<string>;
  resolvedDeductionCandidateIds: Set<string>;
  newDeductionCandidateIds: Set<string>;
  recurrenceEvidenceRefIds: Set<string>;
  recoveryActionTypes: Set<S216RecoveryActionType>;
  hookKinds: Set<string>;
  targetGapIds: Set<string>;
  rewriteHistoryIds: Set<string>;
  reReviewRequestIds: Set<string>;
  successfulRewriteCount: number;
  successfulRecalculationCount: number;
  successfulRecoveryDates: string[];
  retryReviewAllowed: boolean;
  calculator: S217SuccessfulRecoveryMetadata["calculator"];
  scheduledReviewCount: number;
  reviewQueueCandidate: boolean;
  nextActionIds: Set<string>;
  delayedRecallSignalIds: Set<string>;
  delayedRecallDates: string[];
  recalledCount: number;
  partialCount: number;
  missedCount: number;
  latestRecallStatus: S217DelayedRecallStatus | null;
  nextReviewStatus: S216NextReviewMetadata["status"] | "none";
  reviewDueHint: S216NextReviewMetadata["reviewDueHint"] | "none";
  seedExposureStatus: "unknown" | "exposed" | null;
};

const SUBJECTS: readonly RubricEvidenceSubject[] = ["law", "theory", "practice"];
const AUTHORITY_CLAIM_PATTERN =
  /\b(?:official\s+grading|official\s+model\s+answer|official\s+answer|confirmed\s+score|pass\s+probability|pass\s*\/\s*fail|pass-fail|pass\s+guarantee|guaranteed\s+score|score\s+prediction)\b/i;

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function sorted<T extends string>(values: Iterable<T>): T[] {
  return unique(values).sort((left, right) => left.localeCompare(right));
}

function latestIso(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right)).at(-1) ?? null;
}

function earliestIso(values: readonly string[]) {
  return [...values].sort((left, right) => left.localeCompare(right))[0] ?? null;
}

function assertNoAuthorityClaims(value: unknown, path = "s217"): void {
  if (typeof value === "string") {
    if (AUTHORITY_CLAIM_PATTERN.test(value)) {
      throw new Error(`s217-prohibited-authority-claim: ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAuthorityClaims(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertNoAuthorityClaims(child, `${path}.${key}`);
  }
}

function addRequiredStringError(errors: string[], value: unknown, path: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
  }
}

function assertLearnerOnly(input: S217PersonalCoreConceptGraphInput) {
  if (input.consumer !== "learner" || input.actorRole !== "learner") {
    throw new Error("s217-learner-instructor-boundary: personal concept graph is learner metadata only");
  }
  if (input.ownerBinding !== "authenticated_request_user") {
    throw new Error("s217-owner-boundary: graph input must bind to the authenticated learner");
  }
}

function mapS216Reason(reason: S216WithholdReason): S217WithholdReason {
  if (reason === "subject_review_metadata_missing" || reason === "subject_review_unresolved") {
    return "subject_review_metadata_unresolved";
  }
  if (
    reason === "learner_evidence_missing"
    || reason === "learner_evidence_unconfirmed"
    || reason === "deduction_evidence_missing"
  ) {
    return reason === "learner_evidence_unconfirmed"
      ? "learner_evidence_unconfirmed"
      : "learner_evidence_reference_missing";
  }
  if (
    reason === "source_or_release_unverified"
    || reason === "reference_release_missing"
    || reason === "reference_release_blocked"
  ) {
    return reason === "source_or_release_unverified" ? "source_review_unresolved" : "reference_release_unresolved";
  }
  if (
    reason === "review_contract_missing"
    || reason === "rewrite_history_missing"
    || reason === "review_status_withheld"
    || reason === "primary_gap_missing"
    || reason === "rewrite_history_unresolved"
  ) {
    return "s216_validation_failed";
  }
  return "s216_entry_withheld";
}

function entryGateSnapshot(entry: S216AutomaticErrorNotebookEntry): S217SourceGateSnapshot {
  const validation = validateS216ErrorNotebookEntry(entry);
  const s217Reasons: S217WithholdReason[] = [];

  if (!validation.valid) s217Reasons.push("s216_validation_failed");
  if (entry.status !== "ready") s217Reasons.push("s216_entry_withheld");
  for (const reason of entry.withhold.reasons) s217Reasons.push(mapS216Reason(reason));
  if (entry.learnerEvidence.evidenceRefIds.length === 0) s217Reasons.push("learner_evidence_reference_missing");
  if (!entry.learnerEvidence.verifiedByLearner) s217Reasons.push("learner_evidence_unconfirmed");
  if (
    entry.referenceStatus.releaseStatus !== "released"
    || entry.referenceStatus.learningReferenceStatus !== "released_learning_reference"
    || entry.referenceStatus.blockerCodes.length > 0
    || entry.referenceStatus.requiredCaveatKey !== "learning_reference_not_official_answer"
  ) {
    s217Reasons.push("reference_release_unresolved");
  }
  if (
    entry.sourceReview.reviewStatus !== "ready"
    || entry.correctPrinciple.sourceVerificationStatus !== "verified"
    || entry.sourceReview.sourceRefIds.length === 0
  ) {
    s217Reasons.push("source_review_unresolved");
  }
  if (entry.correctPrinciple.conceptNodeIds.length === 0) s217Reasons.push("concept_node_missing");
  if (entry.recovery.safeForS217ConceptGraph !== true) s217Reasons.push("s216_recovery_not_safe_for_s217");
  if (
    entry.learnerInstructorBoundary.learnerRouteOnly !== true
    || entry.learnerInstructorBoundary.instructorRouteSeparated !== true
    || entry.learnerInstructorBoundary.learnerInstructorDataMerged !== false
  ) {
    s217Reasons.push("learner_instructor_boundary_violation");
  }
  if (
    entry.learnerInstructorBoundary.academyTenantDataAccessed !== false
    || entry.dataBoundary.academyTenantDataAccessed !== false
  ) {
    s217Reasons.push("academy_tenant_boundary_violation");
  }
  if (
    entry.dataBoundary.metadataOnly !== true
    || entry.dataBoundary.learnerMaterialInEntry !== false
    || entry.dataBoundary.ocrMaterialInEntry !== false
    || entry.dataBoundary.officialMaterialInEntry !== false
    || entry.dataBoundary.referenceProseInEntry !== false
    || entry.dataBoundary.sourceMaterialInEntry !== false
    || entry.dataBoundary.calculationTraceInEntry !== false
    || entry.dataBoundary.providerRuntimeCalled !== false
    || entry.dataBoundary.ocrRuntimeCalled !== false
    || entry.dataBoundary.modelTrainingUse !== false
    || entry.dataBoundary.containsRawContent !== false
  ) {
    s217Reasons.push("data_boundary_violation");
  }

  return {
    s216EntryId: entry.entryId,
    s216Status: entry.status,
    s216WithholdReasons: entry.withhold.reasons,
    s217WithholdReasons: unique(s217Reasons),
    validationErrors: validation.errors,
    referenceBlockerCodes: entry.withhold.referenceBlockerCodes,
    sourceReviewId: entry.sourceReview.sourceReviewId,
    subject: entry.subject,
    conceptNodeIds: entry.correctPrinciple.conceptNodeIds,
    containsRawContent: false,
  };
}

function validateDelayedRecallSignal(signal: S217DelayedRecallSignal): S217WithholdReason[] {
  const reasons: S217WithholdReason[] = [];
  if (signal.safeForS217ConceptGraph !== true || signal.metadataOnly !== true || signal.containsRawContent !== false) {
    reasons.push("delayed_recall_metadata_unresolved");
  }
  if (!signal.signalId || !signal.conceptNodeId || !signal.observedAt) {
    reasons.push("delayed_recall_metadata_unresolved");
  }
  return reasons;
}

function emptySubject(subject: RubricEvidenceSubject): S217SubjectGraphMetadata {
  return {
    subject,
    subjectLabel: null,
    conceptNodeIds: [],
    subjectDimensionIds: [],
    sourceEntryIds: [],
    exposureCount: 0,
    errorCount: 0,
    recurrenceCount: 0,
    successfulRecoveryCount: 0,
    delayedRecallCount: 0,
    atRiskCount: 0,
    containsRawContent: false,
  };
}

function emptySubjects(): Record<RubricEvidenceSubject, S217SubjectGraphMetadata> {
  return {
    law: emptySubject("law"),
    theory: emptySubject("theory"),
    practice: emptySubject("practice"),
  };
}

function emptyRecoveryState(status: S217RecoveryStateStatus): S217RecoveryStateContract {
  return {
    status,
    pendingRecoveryConceptNodeIds: [],
    successfulRecoveryConceptNodeIds: [],
    stableConceptNodeIds: [],
    atRiskConceptNodeIds: [],
    recurringConceptNodeIds: [],
    todayPlanCandidateCount: 0,
    reviewQueueCandidateCount: 0,
    sourceEntryIds: [],
    terminalState: "retry_rewrite_regrade_or_scheduled_review",
    containsRawContent: false,
  };
}

function baseGraph(
  input: S217PersonalCoreConceptGraphInput,
  status: S217GraphStatus,
  snapshots: S217SourceGateSnapshot[],
  reasons: S217WithholdReason[],
): S217PersonalCoreConceptGraph {
  return {
    version: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
    dataClass: "derived_learning_metadata",
    graphId: input.graphId,
    learnerId: input.learnerId,
    generatedAt: input.generatedAt,
    ownerBinding: "authenticated_request_user",
    examMode: "second",
    status,
    withhold: {
      withheld: status !== "ready",
      reasons: unique(reasons),
      s216Reasons: unique(snapshots.flatMap((snapshot) => snapshot.s216WithholdReasons)),
      validationErrors: unique(snapshots.flatMap((snapshot) => snapshot.validationErrors)),
      referenceBlockerCodes: unique(snapshots.flatMap((snapshot) => snapshot.referenceBlockerCodes)),
      sourceGateSnapshots: snapshots,
    },
    sourceContracts: {
      s216Version: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
      s216EntryIds: input.s216Entries.map((entry) => entry.entryId),
      s216EntryCount: input.s216Entries.length,
      delayedRecallSignalIds: (input.delayedRecallSignals ?? []).map((signal) => signal.signalId),
      conceptSeedIds: (input.conceptSeeds ?? []).map((seed) => seed.seedId),
    },
    subjects: emptySubjects(),
    nodes: [],
    recoveryState: emptyRecoveryState(status === "ready" ? "ready" : "withheld"),
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
      learnerMaterialInGraph: false,
      ocrMaterialInGraph: false,
      officialMaterialInGraph: false,
      referenceProseInGraph: false,
      sourceMaterialInGraph: false,
      calculationTraceInGraph: false,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      globalReferenceWrite: false,
      academyTenantDataAccessed: false,
      modelTrainingUse: false,
      telemetrySafe: true,
      containsRawContent: false,
    },
  };
}

function newMutableNode(
  conceptNodeId: string,
  subject: RubricEvidenceSubject,
  subjectLabel: string,
): MutableNode {
  return {
    conceptNodeId,
    subject,
    subjectLabel,
    subjectDimensionIds: new Set(),
    sourceEntryIds: new Set(),
    questionIds: new Set(),
    sourceReviewIds: new Set(),
    referencePackageIds: new Set(),
    learnerEvidenceRefIds: new Set(),
    sourceRefIds: new Set(),
    seedIds: new Set(),
    exposureDates: [],
    errorDates: [],
    gapCategoryIds: new Set(),
    primaryGapIds: new Set(),
    primaryGapTypes: new Set(),
    deductionCandidateIds: new Set(),
    rootCauseIds: new Set(),
    confidenceLevels: new Set(),
    recurrenceStatuses: new Set(),
    latestComparisonId: null,
    latestImprovementStatus: null,
    duplicateRootCauseGroupIds: new Set(),
    recurringDeductionCandidateIds: new Set(),
    resolvedDeductionCandidateIds: new Set(),
    newDeductionCandidateIds: new Set(),
    recurrenceEvidenceRefIds: new Set(),
    recoveryActionTypes: new Set(),
    hookKinds: new Set(),
    targetGapIds: new Set(),
    rewriteHistoryIds: new Set(),
    reReviewRequestIds: new Set(),
    successfulRewriteCount: 0,
    successfulRecalculationCount: 0,
    successfulRecoveryDates: [],
    retryReviewAllowed: false,
    calculator: null,
    scheduledReviewCount: 0,
    reviewQueueCandidate: false,
    nextActionIds: new Set(),
    delayedRecallSignalIds: new Set(),
    delayedRecallDates: [],
    recalledCount: 0,
    partialCount: 0,
    missedCount: 0,
    latestRecallStatus: null,
    nextReviewStatus: "none",
    reviewDueHint: "none",
    seedExposureStatus: null,
  };
}

function nodeKey(subject: RubricEvidenceSubject, conceptNodeId: string) {
  return `${subject}:${conceptNodeId}`;
}

function ensureMutableNode(
  nodes: Map<string, MutableNode>,
  subject: RubricEvidenceSubject,
  subjectLabel: string,
  conceptNodeId: string,
) {
  const key = nodeKey(subject, conceptNodeId);
  const existing = nodes.get(key);
  if (existing) return existing;
  const created = newMutableNode(conceptNodeId, subject, subjectLabel);
  nodes.set(key, created);
  return created;
}

function addAll(target: Set<string>, values: readonly (string | null | undefined)[]) {
  for (const value of values) {
    if (value) target.add(value);
  }
}

function addEntryToNode(node: MutableNode, entry: S216AutomaticErrorNotebookEntry) {
  node.sourceEntryIds.add(entry.entryId);
  node.questionIds.add(entry.questionId);
  addAll(node.sourceReviewIds, [entry.sourceReview.sourceReviewId]);
  addAll(node.referencePackageIds, [entry.referenceStatus.referencePackageId]);
  addAll(node.learnerEvidenceRefIds, entry.learnerEvidence.evidenceRefIds);
  addAll(node.sourceRefIds, entry.sourceReview.sourceRefIds);
  addAll(node.sourceRefIds, entry.correctPrinciple.sourceRefIds);
  addAll(node.subjectDimensionIds, [
    entry.whyWrong.dimensionId,
    ...entry.gapTaxonomy.dimensionIds,
  ]);
  node.exposureDates.push(entry.createdAt);
  node.errorDates.push(entry.createdAt);
  node.gapCategoryIds.add(entry.gapTaxonomy.categoryId);
  addAll(node.primaryGapIds, [entry.sourceReview.primaryGapId]);
  addAll(node.primaryGapTypes, [entry.sourceReview.primaryGapType]);
  addAll(node.deductionCandidateIds, entry.sourceReview.deductionCandidateIds);
  addAll(node.deductionCandidateIds, [entry.whyWrong.deductionCandidateId]);
  addAll(node.rootCauseIds, [entry.whyWrong.rootCauseId]);
  node.confidenceLevels.add(entry.whyWrong.confidenceLevel);
  node.recurrenceStatuses.add(entry.recurrence.status);
  node.latestComparisonId = entry.recurrence.comparisonId ?? node.latestComparisonId;
  node.latestImprovementStatus = entry.recurrence.improvementStatus ?? node.latestImprovementStatus;
  addAll(node.duplicateRootCauseGroupIds, [entry.recurrence.duplicateRootCauseGroupId]);
  addAll(node.recurringDeductionCandidateIds, entry.recurrence.recurringDeductionCandidateIds);
  addAll(node.resolvedDeductionCandidateIds, entry.recurrence.resolvedDeductionCandidateIds);
  addAll(node.newDeductionCandidateIds, entry.recurrence.newDeductionCandidateIds);
  addAll(node.recurrenceEvidenceRefIds, entry.recurrence.evidenceRefIds);
  node.recoveryActionTypes.add(entry.recovery.recoveryActionType);
  node.hookKinds.add(entry.recovery.hookKind);
  addAll(node.targetGapIds, [entry.recovery.targetGapId]);
  addAll(node.rewriteHistoryIds, [entry.recovery.rewriteHistoryId]);
  addAll(node.reReviewRequestIds, [entry.recovery.reReviewRequestId]);
  node.retryReviewAllowed ||= entry.recovery.retryReviewAllowed;
  if (entry.immediateFix.calculator) {
    node.calculator = entry.immediateFix.calculator;
  }
  if (entry.recurrence.status === "resolved_in_latest_attempt") {
    if (entry.recovery.recoveryActionType === "recalculate") {
      node.successfulRecalculationCount += 1;
    }
    if (entry.recovery.recoveryActionType === "rewrite") {
      node.successfulRewriteCount += 1;
    }
    if (entry.recovery.recoveryActionType === "rewrite" || entry.recovery.recoveryActionType === "recalculate") {
      node.successfulRecoveryDates.push(entry.createdAt);
    }
  }
  if (entry.nextReview.status === "scheduled") {
    node.scheduledReviewCount += 1;
  }
  node.reviewQueueCandidate ||= entry.nextReview.reviewQueueCandidate;
  addAll(node.nextActionIds, [entry.nextReview.nextActionId]);
  node.nextReviewStatus = entry.nextReview.status;
  node.reviewDueHint = entry.nextReview.reviewDueHint;
}

function addSeedToNode(node: MutableNode, seed: S217ConceptExposureSeed) {
  node.seedIds.add(seed.seedId);
  node.seedExposureStatus = seed.exposureStatus;
  addAll(node.subjectDimensionIds, seed.subjectDimensionIds);
  addAll(node.sourceRefIds, seed.sourceRefIds);
  if (seed.exposureStatus === "exposed" && seed.observedAt) {
    node.exposureDates.push(seed.observedAt);
  }
}

function addDelayedRecallToNode(node: MutableNode, signal: S217DelayedRecallSignal) {
  node.delayedRecallSignalIds.add(signal.signalId);
  node.delayedRecallDates.push(signal.observedAt);
  addAll(node.learnerEvidenceRefIds, signal.evidenceRefIds);
  if (signal.recallStatus === "recalled") node.recalledCount += 1;
  if (signal.recallStatus === "partial") node.partialCount += 1;
  if (signal.recallStatus === "missed") node.missedCount += 1;
  node.latestRecallStatus = signal.recallStatus;
  node.nextReviewStatus = signal.nextReviewStatus;
}

function conceptStateFor(node: MutableNode): S217ConceptState {
  const exposureCount = node.exposureDates.length;
  const errorCount = node.errorDates.length;
  const successfulRecoveryCount = node.successfulRewriteCount + node.successfulRecalculationCount;
  const hasLowConfidence = node.confidenceLevels.has("low");

  if (exposureCount === 0 && errorCount === 0 && node.seedExposureStatus === "unknown") return "unknown";
  if (errorCount === 0) return exposureCount > 0 || node.seedExposureStatus === "exposed" ? "exposed" : "unknown";
  if (node.missedCount > 0) return "at-risk";
  if (node.recurrenceStatuses.has("recurring")) return "recurring";
  if (successfulRecoveryCount > 0 && node.recalledCount > 0 && node.partialCount === 0) return "stable";
  if (successfulRecoveryCount > 0) return "recovering";
  if (hasLowConfidence || node.partialCount > 0) return "confused";
  return "wrong";
}

function masteryFor(node: MutableNode, state: S217ConceptState): S217MasteryMetadata {
  const successfulRecoveryCount = node.successfulRewriteCount + node.successfulRecalculationCount;
  const stableEvidenceCount = successfulRecoveryCount + node.recalledCount;
  const masteryStatus: S217MasteryStatus = state === "stable"
    ? "stable"
    : successfulRecoveryCount > 0
      ? "recovering"
      : node.exposureDates.length > 0 || node.seedExposureStatus === "exposed"
        ? "exposed"
        : "unstarted";
  const masteryConfidence: RubricEvidenceConfidenceLevel = state === "stable"
    ? "high"
    : successfulRecoveryCount > 0
      ? "medium"
      : node.confidenceLevels.has("low")
        ? "low"
        : "medium";
  return {
    masteryStatus,
    masteryConfidence,
    stableEvidenceCount,
    recoveryEvidenceCount: successfulRecoveryCount,
    readyForMaintenanceReview: state === "stable",
    containsRawContent: false,
  };
}

function forgettingRiskFor(node: MutableNode, state: S217ConceptState): S217ForgettingRiskMetadata {
  const reasons: string[] = [];
  if (node.missedCount > 0) reasons.push("delayed_recall_missed");
  if (node.recurrenceStatuses.has("recurring")) reasons.push("recurring_error_metadata");
  if (node.scheduledReviewCount > 0 && node.recalledCount === 0) reasons.push("scheduled_review_pending");
  if (state === "recovering") reasons.push("recovery_not_yet_stable");
  const forgettingRiskLevel: S217ForgettingRiskLevel = node.missedCount > 0 || node.recurrenceStatuses.has("recurring")
    ? "high"
    : state === "recovering" || node.scheduledReviewCount > 0
      ? "medium"
      : state === "stable"
        ? "low"
        : "none";
  return {
    forgettingRiskLevel,
    atRisk: state === "at-risk" || forgettingRiskLevel === "high",
    reasons,
    nextReviewStatus: node.nextReviewStatus,
    reviewDueHint: node.reviewDueHint,
    containsRawContent: false,
  };
}

function examImpactFor(node: MutableNode): S217ExamImpactMetadata {
  const recurringGapCount = node.recurringDeductionCandidateIds.size;
  const evidenceSupportedGapCount = node.deductionCandidateIds.size;
  const examImpactLevel: S217ExamImpactLevel = recurringGapCount > 0
    ? "high"
    : evidenceSupportedGapCount > 1 || node.successfulRecalculationCount > 0
      ? "medium"
      : "low";
  return {
    examImpactLevel,
    subject: node.subject,
    subjectDimensionIds: sorted(node.subjectDimensionIds),
    affectedQuestionIds: sorted(node.questionIds),
    evidenceSupportedGapCount,
    recurringGapCount,
    sourceReleaseReady: node.referencePackageIds.size > 0 && node.sourceRefIds.size > 0,
    learningReferenceCaveatPresent: true,
    scoreLikeMetadataIgnoredForState: true,
    containsRawContent: false,
  };
}

function materializeNode(learnerId: string, node: MutableNode): S217PersonalCoreConceptNode {
  const conceptState = conceptStateFor(node);
  const masteryMetadata = masteryFor(node, conceptState);
  const forgettingRiskMetadata = forgettingRiskFor(node, conceptState);
  return {
    nodeId: `s217:${learnerId}:${node.subject}:${node.conceptNodeId}`,
    learnerId,
    conceptNodeId: node.conceptNodeId,
    subject: node.subject,
    subjectLabel: node.subjectLabel,
    subjectDimensionIds: sorted(node.subjectDimensionIds),
    conceptState,
    exposureMetadata: {
      exposureCount: node.exposureDates.length,
      firstExposedAt: earliestIso(node.exposureDates),
      lastExposedAt: latestIso(node.exposureDates),
      sourceEntryIds: sorted(node.sourceEntryIds),
      questionIds: sorted(node.questionIds),
      sourceReviewIds: sorted(node.sourceReviewIds),
      referencePackageIds: sorted(node.referencePackageIds),
      learnerEvidenceRefIds: sorted(node.learnerEvidenceRefIds),
      sourceRefIds: sorted(node.sourceRefIds),
      seedIds: sorted(node.seedIds),
      containsRawContent: false,
    },
    errorMetadata: {
      errorCount: node.errorDates.length,
      latestErrorAt: latestIso(node.errorDates),
      gapCategoryIds: sorted(node.gapCategoryIds),
      primaryGapIds: sorted(node.primaryGapIds),
      primaryGapTypes: sorted(node.primaryGapTypes),
      deductionCandidateIds: sorted(node.deductionCandidateIds),
      rootCauseIds: sorted(node.rootCauseIds),
      confidenceLevels: sorted(node.confidenceLevels),
      containsRawContent: false,
    },
    recurrenceMetadata: {
      recurrenceCount: node.recurringDeductionCandidateIds.size,
      recurrenceStatuses: sorted(node.recurrenceStatuses),
      latestComparisonId: node.latestComparisonId,
      latestImprovementStatus: node.latestImprovementStatus,
      duplicateRootCauseGroupIds: sorted(node.duplicateRootCauseGroupIds),
      recurringDeductionCandidateIds: sorted(node.recurringDeductionCandidateIds),
      resolvedDeductionCandidateIds: sorted(node.resolvedDeductionCandidateIds),
      newDeductionCandidateIds: sorted(node.newDeductionCandidateIds),
      evidenceRefIds: sorted(node.recurrenceEvidenceRefIds),
      containsRawContent: false,
    },
    successfulRecoveryMetadata: {
      recoveryActionTypes: sorted(node.recoveryActionTypes),
      hookKinds: sorted(node.hookKinds),
      targetGapIds: sorted(node.targetGapIds),
      rewriteHistoryIds: sorted(node.rewriteHistoryIds),
      reReviewRequestIds: sorted(node.reReviewRequestIds),
      successfulRewriteCount: node.successfulRewriteCount,
      successfulRecalculationCount: node.successfulRecalculationCount,
      latestSuccessfulRecoveryAt: latestIso(node.successfulRecoveryDates),
      retryReviewAllowed: node.retryReviewAllowed,
      calculator: node.calculator,
      containsRawContent: false,
    },
    delayedRecallMetadata: {
      scheduledReviewCount: node.scheduledReviewCount,
      reviewQueueCandidate: node.reviewQueueCandidate,
      nextActionIds: sorted(node.nextActionIds),
      delayedRecallSignalIds: sorted(node.delayedRecallSignalIds),
      delayedRecallCount: node.delayedRecallSignalIds.size,
      recalledCount: node.recalledCount,
      partialCount: node.partialCount,
      missedCount: node.missedCount,
      latestRecallStatus: node.latestRecallStatus,
      latestObservedAt: latestIso(node.delayedRecallDates),
      containsRawContent: false,
    },
    masteryMetadata,
    forgettingRiskMetadata,
    examImpactMetadata: examImpactFor(node),
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
      learnerMaterialInNode: false,
      ocrMaterialInNode: false,
      officialMaterialInNode: false,
      referenceProseInNode: false,
      sourceMaterialInNode: false,
      calculationTraceInNode: false,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      academyTenantDataAccessed: false,
      modelTrainingUse: false,
      containsRawContent: false,
    },
  };
}

function buildNodes(input: S217PersonalCoreConceptGraphInput): S217PersonalCoreConceptNode[] {
  const nodes = new Map<string, MutableNode>();
  for (const seed of input.conceptSeeds ?? []) {
    const node = ensureMutableNode(nodes, seed.subject, seed.subjectLabel, seed.conceptNodeId);
    addSeedToNode(node, seed);
  }
  for (const entry of input.s216Entries) {
    for (const conceptNodeId of entry.correctPrinciple.conceptNodeIds) {
      const node = ensureMutableNode(nodes, entry.subject, entry.subjectLabel, conceptNodeId);
      addEntryToNode(node, entry);
    }
  }
  for (const signal of input.delayedRecallSignals ?? []) {
    const key = nodeKey(signal.subject, signal.conceptNodeId);
    const node = nodes.get(key);
    if (node) addDelayedRecallToNode(node, signal);
  }
  return [...nodes.values()]
    .map((node) => materializeNode(input.learnerId, node))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
}

function summarizeSubjects(nodes: readonly S217PersonalCoreConceptNode[]): Record<RubricEvidenceSubject, S217SubjectGraphMetadata> {
  const subjects = emptySubjects();
  for (const subject of SUBJECTS) {
    const subjectNodes = nodes.filter((node) => node.subject === subject);
    const summary = subjects[subject];
    summary.subjectLabel = subjectNodes[0]?.subjectLabel ?? null;
    summary.conceptNodeIds = sorted(subjectNodes.map((node) => node.conceptNodeId));
    summary.subjectDimensionIds = sorted(subjectNodes.flatMap((node) => node.subjectDimensionIds));
    summary.sourceEntryIds = sorted(subjectNodes.flatMap((node) => node.exposureMetadata.sourceEntryIds));
    summary.exposureCount = subjectNodes.reduce((sum, node) => sum + node.exposureMetadata.exposureCount, 0);
    summary.errorCount = subjectNodes.reduce((sum, node) => sum + node.errorMetadata.errorCount, 0);
    summary.recurrenceCount = subjectNodes.reduce((sum, node) => sum + node.recurrenceMetadata.recurrenceCount, 0);
    summary.successfulRecoveryCount = subjectNodes.reduce(
      (sum, node) => sum
        + node.successfulRecoveryMetadata.successfulRewriteCount
        + node.successfulRecoveryMetadata.successfulRecalculationCount,
      0,
    );
    summary.delayedRecallCount = subjectNodes.reduce((sum, node) => sum + node.delayedRecallMetadata.delayedRecallCount, 0);
    summary.atRiskCount = subjectNodes.filter((node) => node.conceptState === "at-risk").length;
  }
  return subjects;
}

function buildRecoveryState(nodes: readonly S217PersonalCoreConceptNode[]): S217RecoveryStateContract {
  const pending = nodes
    .filter((node) => ["wrong", "confused", "recovering", "recurring", "at-risk"].includes(node.conceptState))
    .map((node) => node.conceptNodeId);
  const successful = nodes
    .filter((node) => (
      node.successfulRecoveryMetadata.successfulRewriteCount
      + node.successfulRecoveryMetadata.successfulRecalculationCount
    ) > 0)
    .map((node) => node.conceptNodeId);
  const stable = nodes.filter((node) => node.conceptState === "stable").map((node) => node.conceptNodeId);
  const atRisk = nodes.filter((node) => node.conceptState === "at-risk").map((node) => node.conceptNodeId);
  const recurring = nodes.filter((node) => node.conceptState === "recurring").map((node) => node.conceptNodeId);
  const reviewQueueCandidateCount = nodes.filter((node) => node.delayedRecallMetadata.reviewQueueCandidate).length;

  return {
    status: "ready",
    pendingRecoveryConceptNodeIds: sorted(pending),
    successfulRecoveryConceptNodeIds: sorted(successful),
    stableConceptNodeIds: sorted(stable),
    atRiskConceptNodeIds: sorted(atRisk),
    recurringConceptNodeIds: sorted(recurring),
    todayPlanCandidateCount: Math.min(3, pending.length),
    reviewQueueCandidateCount,
    sourceEntryIds: sorted(nodes.flatMap((node) => node.exposureMetadata.sourceEntryIds)),
    terminalState: "retry_rewrite_regrade_or_scheduled_review",
    containsRawContent: false,
  };
}

function unresolvedRecallReasons(signals: readonly S217DelayedRecallSignal[] | undefined) {
  return unique((signals ?? []).flatMap(validateDelayedRecallSignal));
}

export function validateS217PersonalCoreConceptGraph(graph: S217PersonalCoreConceptGraph): S217ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    assertNoRawUserDataInDerived(graph);
    assertNoAuthorityClaims(graph);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s217-data-boundary-error");
  }

  if (graph.version !== S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION) errors.push("graph.version must be S217");
  if (graph.dataClass !== "derived_learning_metadata") errors.push("graph.dataClass must be derived_learning_metadata");
  if (graph.examMode !== "second") errors.push("S217 supports only second-round learner recovery");
  addRequiredStringError(errors, graph.graphId, "graphId");
  addRequiredStringError(errors, graph.learnerId, "learnerId");
  addRequiredStringError(errors, graph.generatedAt, "generatedAt");
  if (graph.ownerBinding !== "authenticated_request_user") errors.push("ownerBinding must bind to authenticated_request_user");
  if (graph.withhold.withheld !== (graph.status !== "ready")) errors.push("withhold.withheld must match graph.status");
  if (graph.status === "ready" && graph.withhold.reasons.length > 0) errors.push("ready S217 graph must not carry withhold reasons");
  if (graph.status === "withheld" && graph.withhold.reasons.length === 0) errors.push("withheld S217 graph must include withhold reasons");
  if (graph.status === "withheld" && graph.nodes.length > 0) errors.push("withheld S217 graph must not emit concept nodes");
  if (graph.status === "ready" && graph.sourceContracts.s216EntryCount === 0) errors.push("ready S217 graph requires S216 entries");
  if (graph.status === "ready" && graph.nodes.length === 0) errors.push("ready S217 graph requires at least one concept node");

  if (graph.recoveryState.todayPlanCandidateCount > 3) errors.push("S217 recovery state can contribute at most three Today Plan candidates");
  if (graph.recoveryState.terminalState !== "retry_rewrite_regrade_or_scheduled_review") {
    errors.push("S217 recovery state must end in retry, rewrite, regrade, or scheduled review");
  }

  for (const node of graph.nodes) {
    if (!S217_CONCEPT_STATES.includes(node.conceptState)) errors.push(`invalid concept state for ${node.conceptNodeId}`);
    if (node.subject !== "law" && node.subject !== "theory" && node.subject !== "practice") {
      errors.push(`invalid subject for ${node.conceptNodeId}`);
    }
    if (node.dataBoundary.metadataOnly !== true) errors.push(`${node.nodeId} must be metadata-only`);
    if (node.dataBoundary.learnerMaterialInNode !== false) errors.push(`${node.nodeId} must not store learner material`);
    if (node.dataBoundary.ocrMaterialInNode !== false) errors.push(`${node.nodeId} must not store OCR material`);
    if (node.dataBoundary.referenceProseInNode !== false) errors.push(`${node.nodeId} must not store reference prose`);
    if (node.dataBoundary.calculationTraceInNode !== false) errors.push(`${node.nodeId} must not store calculation trace`);
    if (node.dataBoundary.providerRuntimeCalled !== false) errors.push(`${node.nodeId} must not call provider runtime`);
    if (node.dataBoundary.ocrRuntimeCalled !== false) errors.push(`${node.nodeId} must not call OCR runtime`);
    if (node.authorityFlags.officialGrading !== false) errors.push(`${node.nodeId} must not allow official grading`);
    if (node.authorityFlags.officialModelAnswer !== false) errors.push(`${node.nodeId} must not allow official model answers`);
    if (node.authorityFlags.confirmedScore !== false) errors.push(`${node.nodeId} must not allow confirmed scores`);
    if (node.authorityFlags.passProbability !== false) errors.push(`${node.nodeId} must not allow pass probability`);
    if (node.authorityFlags.passGuarantee !== false) errors.push(`${node.nodeId} must not allow pass guarantees`);
    if (node.successfulRecoveryMetadata.calculator) {
      if (node.successfulRecoveryMetadata.calculator.model !== RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL) {
        errors.push(`${node.nodeId} calculator model must be ${RUBRIC_EVIDENCE_GIII_CALCULATOR_MODEL}`);
      }
      if (node.successfulRecoveryMetadata.calculator.resetSafeHandKeyedRoutineOnly !== true) {
        errors.push(`${node.nodeId} calculator routine must be reset-safe and hand-keyed`);
      }
      if (node.successfulRecoveryMetadata.calculator.storedProgramDependency !== false) {
        errors.push(`${node.nodeId} calculator routine must not depend on stored programs`);
      }
    }
  }

  if (graph.authorityFlags.officialGrading !== false) errors.push("S217 must not allow official grading");
  if (graph.authorityFlags.officialModelAnswer !== false) errors.push("S217 must not allow official model answers");
  if (graph.authorityFlags.confirmedScore !== false) errors.push("S217 must not allow confirmed scores");
  if (graph.authorityFlags.passProbability !== false) errors.push("S217 must not allow pass probability");
  if (graph.authorityFlags.passGuarantee !== false) errors.push("S217 must not allow pass guarantees");
  if (graph.learnerInstructorBoundary.learnerRouteOnly !== true) errors.push("S217 must remain learner route only");
  if (graph.learnerInstructorBoundary.instructorRouteSeparated !== true) errors.push("S217 must preserve instructor separation");
  if (graph.learnerInstructorBoundary.academyTenantDataAccessed !== false) errors.push("S217 must not access academy tenant data");
  if (graph.learnerInstructorBoundary.learnerInstructorDataMerged !== false) errors.push("S217 must not merge learner and instructor data");
  if (graph.dataBoundary.metadataOnly !== true) errors.push("S217 graph must be metadata-only");
  if (graph.dataBoundary.learnerMaterialInGraph !== false) errors.push("S217 must not store learner material");
  if (graph.dataBoundary.ocrMaterialInGraph !== false) errors.push("S217 must not store OCR material");
  if (graph.dataBoundary.officialMaterialInGraph !== false) errors.push("S217 must not store official material");
  if (graph.dataBoundary.referenceProseInGraph !== false) errors.push("S217 must not store reference prose");
  if (graph.dataBoundary.providerRuntimeCalled !== false) errors.push("S217 must not call provider runtime");
  if (graph.dataBoundary.ocrRuntimeCalled !== false) errors.push("S217 must not call OCR runtime");
  if (graph.dataBoundary.globalReferenceWrite !== false) errors.push("S217 must not write global reference data");
  if (graph.dataBoundary.academyTenantDataAccessed !== false) errors.push("S217 must not access academy tenant data");
  if (graph.dataBoundary.modelTrainingUse !== false) errors.push("S217 must not use learner material for model training");

  if (graph.status === "ready" && graph.nodes.some((node) => !node.examImpactMetadata.learningReferenceCaveatPresent)) {
    warnings.push("ready S217 nodes should preserve the learning-reference caveat");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildS217PersonalCoreConceptGraph(
  input: S217PersonalCoreConceptGraphInput,
): S217BuildResult {
  assertNoRawUserDataInDerived(input);
  assertNoAuthorityClaims(input);
  assertLearnerOnly(input);

  const snapshots = input.s216Entries.map(entryGateSnapshot);
  const reasons: S217WithholdReason[] = [
    ...(input.s216Entries.length === 0 ? ["s216_metadata_missing" as const] : []),
    ...snapshots.flatMap((snapshot) => snapshot.s217WithholdReasons),
    ...unresolvedRecallReasons(input.delayedRecallSignals),
  ];

  if (reasons.length > 0) {
    const graph = sanitizeDerivedMetadata(baseGraph(input, "withheld", snapshots, reasons)) as S217PersonalCoreConceptGraph;
    const validation = validateS217PersonalCoreConceptGraph(graph);
    if (!validation.valid) {
      throw new Error(`invalid-s217-personal-core-concept-graph: ${validation.errors.join("; ")}`);
    }
    return {
      version: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
      graph,
      validation,
    };
  }

  const graph = sanitizeDerivedMetadata(baseGraph(input, "ready", snapshots, [])) as S217PersonalCoreConceptGraph;
  graph.nodes = buildNodes(input);
  graph.subjects = summarizeSubjects(graph.nodes);
  graph.recoveryState = buildRecoveryState(graph.nodes);

  assertNoRawUserDataInDerived(graph);
  assertNoAuthorityClaims(graph);
  const validation = validateS217PersonalCoreConceptGraph(graph);
  if (!validation.valid) {
    throw new Error(`invalid-s217-personal-core-concept-graph: ${validation.errors.join("; ")}`);
  }
  return {
    version: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
    graph,
    validation,
  };
}

export function buildS217ConceptGraphContractReport() {
  return sanitizeDerivedMetadata({
    version: S217_PERSONAL_CORE_CONCEPT_GRAPH_VERSION,
    sourceContractVersion: S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
    supportedSubjects: [...SUBJECTS],
    conceptStates: [...S217_CONCEPT_STATES],
    tracksExposureMetadata: true,
    tracksErrorMetadata: true,
    tracksRecurrenceMetadata: true,
    tracksSuccessfulRewriteRecalculationMetadata: true,
    tracksDelayedRecallMetadata: true,
    tracksMasteryMetadata: true,
    tracksForgettingRiskMetadata: true,
    tracksExamImpactMetadata: true,
    metadataOnly: true,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    academyTenantDataAccessed: false,
    containsRawContent: false,
  });
}

export function assertS217FixtureMetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  assertNoAuthorityClaims(value);
  const serialized = JSON.stringify(value);
  if (/"(?:answerText|questionText|referenceAnswerText|providerPayload|sourceExcerpt|ocrText|rawAnswerText|rawOcrText)"\s*:/i.test(serialized)) {
    throw new Error("s217-fixture-raw-content-field");
  }
}

