export const S214_REFERENCE_ANSWER_PIPELINE_VERSION = "s214.reference_answer_candidate_pipeline.v1" as const;
export const S214_MIN_INDEPENDENT_CANDIDATE_SLOTS = 3 as const;

export type S214Subject = "law" | "theory" | "practice";

export const S214_REQUIRED_CANDIDATE_STRATEGIES = {
  law: [
    "law_issue_rule_application_candidate",
    "exam_date_law_version_candidate",
    "deduction_risk_counterexample_candidate",
  ],
  theory: [
    "concept_definition_logic_chain_candidate",
    "comparison_alternative_view_candidate",
    "application_paragraph_candidate",
  ],
  practice: [
    "calculation_formula_unit_candidate",
    "independent_recalculation_candidate",
    "giii_hand_keyed_routine_candidate",
  ],
} as const satisfies Record<S214Subject, readonly string[]>;

export type S214CandidateStrategy = typeof S214_REQUIRED_CANDIDATE_STRATEGIES[S214Subject][number];
export type S214RequirementKind = "issue" | "concept" | "calculation" | "mixed";
export type S214SourcePackStatus = "ready" | "blocked" | "missing";
export type S214CandidateEvidenceStatus = "metadata_ready" | "missing" | "blocked";
export type S214ValidationStateStatus = "passed" | "missing" | "blocked";
export type S214PrerequisiteStatus = "passed" | "missing" | "blocked";
export type S214ConflictStatus = "none" | "unresolved_for_s215" | "blocked";
export type S214PipelineStatus = "ready_for_s215_consensus" | "blocked";
export type S214CaveatKey = "learning_reference_not_official_answer";

export type S214BlockedReasonCode =
  | "source_pack_missing"
  | "source_pack_blocked"
  | "requirement_decomposition_missing"
  | "candidate_evidence_missing"
  | "candidate_validation_state_missing"
  | "s207_reference_package_not_ready"
  | "s208_law_grounding_missing"
  | "s209_theory_grounding_missing"
  | "s210_practice_validation_missing"
  | "s210_reference_answer_release_not_allowed";

export type S214ReferencePipelineStoragePolicy = {
  metadataOnly: true;
  rawOfficialQuestionTextStored: false;
  rawOfficialAnswerTextStored: false;
  rawGeneratedReferenceAnswerStored: false;
  rawLearnerAnswerStored: false;
  rawOcrTextStored: false;
  rawSourceExcerptStored: false;
  providerPayloadStored: false;
  privateContentStored: false;
  credentialsStored: false;
  assetBytesStored: false;
};

export type S214ReferencePipelineBoundaryPolicy = {
  sourceLevelPipelineOnly: true;
  providerRuntimeCallsImplemented: false;
  ocrRuntimeCallsImplemented: false;
  learnerUiImplemented: false;
  publicArchiveUiImplemented: false;
  billingOrLedgerImplemented: false;
  authOrEntitlementChanged: false;
  supabaseChanged: false;
  migrationsChanged: false;
  workflowsChanged: false;
  instructorRuntimeRoutesChanged: false;
  academyRoutesChanged: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  confirmedScoreClaimAllowed: false;
  passProbabilityClaimAllowed: false;
  passGuaranteeClaimAllowed: false;
};

export type S214OfficialSourceMetadata = {
  questionId: string;
  sourceId: string;
  rightsStatus: string;
  displayMode: string;
  extractionStatus: string;
  problemTextStatus: string;
  canonicalVerificationStatus: string;
  officialAnswerUsed: false;
  officialGradingCriteriaUsed: false;
  rawOfficialQuestionTextStored: false;
  rawOfficialAnswerTextStored: false;
};

export type S214RequirementSlot = {
  requirementId: string;
  subQuestionId: string;
  requirementKind: S214RequirementKind;
  points: number;
  descriptorKey: string;
  rawRequirementTextStored: false;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  candidateStrategyIds: S214CandidateStrategy[];
};

export type S214ProblemRequirementDecomposition = {
  decompositionId: string;
  questionId: string;
  subject: S214Subject;
  source: "s203_canonical_question_metadata" | "synthetic_fixture";
  totalPoints: number;
  requirementSlots: S214RequirementSlot[];
  rawProblemTextStored: false;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
};

export type S214SourcePackMetadata = {
  sourcePackId: string;
  questionId: string;
  subject: S214Subject;
  status: S214SourcePackStatus;
  referencePackageId: string;
  officialSource: S214OfficialSourceMetadata;
  requirementDecomposition: S214ProblemRequirementDecomposition;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  containsRawContent: false;
  rawSourceExcerptStored: false;
};

export type S214CandidateEvidence = {
  status: S214CandidateEvidenceStatus;
  supportsS215: boolean;
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  rawEvidenceStored: false;
};

export type S214CandidateValidationState = {
  status: S214ValidationStateStatus;
  validatorRefIds: string[];
  blockerIds: string[];
};

export type S214CandidateSlot = {
  candidateSlotId: string;
  subject: S214Subject;
  strategy: S214CandidateStrategy;
  independenceGroupId: string;
  generationMethod: "metadata_strategy_only";
  providerRuntimeCalled: false;
  generatedAnswerProseStored: false;
  sourcePackId: string;
  requirementSlotIds: string[];
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  candidateEvidence: S214CandidateEvidence;
  validationState: S214CandidateValidationState;
};

export type S214ReferencePackagePrerequisite = {
  prerequisiteId: string;
  kind: "s207_reference_package";
  status: S214PrerequisiteStatus;
  referencePackageId: string;
  s214GenerationInputAllowed: boolean;
  s215ReleaseGateInputAllowed: boolean;
  officialClaimAllowed: false;
  blockerIds: string[];
};

export type S214LawGroundingPrerequisite = {
  prerequisiteId: string;
  kind: "s208_law_grounding";
  status: S214PrerequisiteStatus;
  examDateVersionStatus: "applicable_to_exam_date" | "synthetic_fixture" | "needs_official_verification" | "unresolved_conflict" | "blocked";
  legalSourceStatus: "verified" | "synthetic_fixture" | "needs_official_verification" | "unresolved_conflict" | "blocked";
  s214GenerationAllowed: boolean;
  s215ReleaseGateAllowed: boolean;
  sourceAnchorIds: string[];
  blockerIds: string[];
};

export type S214TheoryGroundingPrerequisite = {
  prerequisiteId: string;
  kind: "s209_theory_grounding";
  status: S214PrerequisiteStatus;
  conceptStatus: "verified" | "synthetic_fixture" | "needs_official_verification" | "unresolved_conflict" | "blocked";
  definitionStatus: "verified" | "synthetic_fixture" | "needs_official_verification" | "unresolved_conflict" | "blocked";
  sourceCoverageStatus: "verified" | "synthetic_fixture" | "needs_official_verification" | "unresolved_conflict" | "blocked";
  s214GenerationAllowed: boolean;
  s215ReleaseGateAllowed: boolean;
  conceptAnchorIds: string[];
  blockerIds: string[];
};

export type S214PracticeValidationPrerequisite = {
  prerequisiteId: string;
  kind: "s210_practice_validation";
  status: S214PrerequisiteStatus;
  unitStatus: "metadata_ready" | "missing" | "blocked";
  unitCheckStatus: "metadata_ready" | "missing" | "blocked";
  roundingCheckStatus: "metadata_ready" | "missing" | "blocked";
  independentRecalculationStatus: "metadata_ready" | "missing" | "blocked";
  runtimeEvidenceStatus: "not_run" | "human_reviewed_passed";
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineRequired: true;
  storedProgramDependencyAllowed: false;
  referenceAnswerReleaseAllowed: boolean;
  sourceAnchorIds: string[];
  blockerIds: string[];
};

export type S214SubjectReleasePrerequisite =
  | S214LawGroundingPrerequisite
  | S214TheoryGroundingPrerequisite
  | S214PracticeValidationPrerequisite;

export type S214ReleasePrerequisites = {
  s207Package: S214ReferencePackagePrerequisite;
  subjectGate: S214SubjectReleasePrerequisite;
};

export type S214UnresolvedConflictState = {
  status: S214ConflictStatus;
  unresolvedConflictCount: number;
  conflictIds: string[];
  preservedForS215: true;
  rawConflictTextStored: false;
};

export type S214LearningReferenceIdentity = {
  status: "candidate_metadata_only";
  learnerFacingLabelKey: "verified_learning_reference";
  requiredCaveatKey: S214CaveatKey;
  learningReferenceOnly: true;
  officialClaimAllowed: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  scorePredictionAllowed: false;
  passProbabilityAllowed: false;
  passGuaranteeAllowed: false;
  generatedAnswerProseStored: false;
};

export type S214ReferenceAnswerPipelineInput = {
  pipelineId: string;
  version: typeof S214_REFERENCE_ANSWER_PIPELINE_VERSION;
  subject: S214Subject;
  questionId: string;
  sourcePack: S214SourcePackMetadata;
  candidateSlots: S214CandidateSlot[];
  releasePrerequisites: S214ReleasePrerequisites;
  unresolvedConflictState: S214UnresolvedConflictState;
  learningReference: S214LearningReferenceIdentity;
};

export type S214ReferenceAnswerPipelineResult = {
  pipelineId: string;
  version: typeof S214_REFERENCE_ANSWER_PIPELINE_VERSION;
  subject: S214Subject;
  questionId: string;
  status: S214PipelineStatus;
  blockedReasonCodes: S214BlockedReasonCode[];
  sourcePack: S214SourcePackMetadata;
  requirementDecomposition: S214ProblemRequirementDecomposition;
  candidateStrategyReport: {
    minimumIndependentCandidateSlots: typeof S214_MIN_INDEPENDENT_CANDIDATE_SLOTS;
    candidateSlotCount: number;
    independentCandidateSlotCount: number;
    requiredStrategyIds: readonly S214CandidateStrategy[];
    suppliedStrategyIds: S214CandidateStrategy[];
  };
  releaseGate: {
    status: S214PipelineStatus;
    s215ReleaseGateInputAllowed: boolean;
    referenceAnswerReleaseAllowed: false;
    learnerFacingReleaseAllowed: false;
    requiredCaveatKey: S214CaveatKey;
    officialClaimAllowed: false;
    officialGradingClaimAllowed: false;
    officialModelAnswerClaimAllowed: false;
    confirmedScoreClaimAllowed: false;
    passProbabilityClaimAllowed: false;
    passGuaranteeClaimAllowed: false;
  };
  releasePrerequisites: S214ReleasePrerequisites;
  unresolvedConflictState: S214UnresolvedConflictState;
  learnerInstructorBoundary: {
    learnerUiChanged: false;
    instructorUiChanged: false;
    learnerRuntimeChanged: false;
    instructorRuntimeRoutesChanged: false;
    academyTenantDataAccessed: false;
    learnerInstructorDataMerged: false;
  };
  dataBoundary: {
    metadataOnly: true;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    rawOfficialQuestionTextStored: false;
    rawOfficialAnswerTextStored: false;
    rawGeneratedReferenceAnswerStored: false;
    rawLearnerAnswerStored: false;
    rawOcrTextStored: false;
    rawSourceExcerptStored: false;
  };
  learningReference: S214LearningReferenceIdentity;
};

export type S214ReferenceAnswerPipelineRegistry = {
  schemaVersion: typeof S214_REFERENCE_ANSWER_PIPELINE_VERSION;
  registryType: "appraiser_second_round_s214_reference_answer_pipeline_registry";
  generatedBy: string;
  generatedAt: string;
  storagePolicy: S214ReferencePipelineStoragePolicy;
  boundaryPolicy: S214ReferencePipelineBoundaryPolicy;
  pipelines: S214ReferenceAnswerPipelineInput[];
};

export type S214ReferenceAnswerPipelineRegistryReport = {
  schemaVersion: typeof S214_REFERENCE_ANSWER_PIPELINE_VERSION;
  reportType: "appraiser_second_round_s214_reference_answer_pipeline_report";
  generatedBy: string;
  generatedAt: string;
  totals: {
    pipelineCount: number;
    readyForS215Count: number;
    blockedCount: number;
    candidateSlotCount: number;
    unresolvedConflictCount: number;
    subjectCounts: Record<S214Subject, number>;
  };
  metadataOnly: true;
  safeUse: "s214_candidate_pipeline_metadata_only";
};

const SUBJECTS = ["law", "theory", "practice"] as const;
const SOURCE_PACK_STATUSES = ["ready", "blocked", "missing"] as const;
const EVIDENCE_STATUSES = ["metadata_ready", "missing", "blocked"] as const;
const VALIDATION_STATUSES = ["passed", "missing", "blocked"] as const;
const PREREQUISITE_STATUSES = ["passed", "missing", "blocked"] as const;
const CONFLICT_STATUSES = ["none", "unresolved_for_s215", "blocked"] as const;
const REQUIREMENT_KINDS = ["issue", "concept", "calculation", "mixed"] as const;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,140}$/;

const FORBIDDEN_CONTENT_FIELD_NAMES = new Set([
  "answerText",
  "questionText",
  "officialQuestionText",
  "officialAnswerText",
  "generatedAnswerText",
  "generatedReferenceAnswer",
  "referenceAnswerText",
  "learnerAnswerText",
  "ocrText",
  "sourceExcerpt",
  "providerPayload",
  "rawPayload",
  "credentials",
  "secret",
]);

const PROHIBITED_AUTHORITY_CLAIMS = [
  "official grading",
  "official model answer",
  "confirmed score",
  "pass probability",
  "pass/fail prediction",
  "guarantee",
] as const;

function assertRecord(value: unknown, sourceName: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${sourceName} must be an object`);
  }
}

function assertString(value: unknown, fieldName: string, sourceName: string, maxLength = 260): string {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    throw new Error(`${sourceName}.${fieldName} must be a non-empty trimmed string`);
  }
  if (value.length > maxLength) throw new Error(`${sourceName}.${fieldName} is too long for metadata-only use`);
  return value;
}

function assertId(value: unknown, fieldName: string, sourceName: string): string {
  const id = assertString(value, fieldName, sourceName, 160);
  if (!ID_PATTERN.test(id)) throw new Error(`${sourceName}.${fieldName} must be a stable lowercase metadata id`);
  return id;
}

function assertBoolean(value: unknown, fieldName: string, sourceName: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${sourceName}.${fieldName} must be boolean`);
  return value;
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName}.${fieldName} must be false`);
  return false;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertNumber(value: unknown, fieldName: string, sourceName: string, options: { min?: number } = {}): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${sourceName}.${fieldName} must be a finite number`);
  if (options.min !== undefined && value < options.min) throw new Error(`${sourceName}.${fieldName} must be >= ${options.min}`);
  return value;
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error(`${sourceName}.${fieldName} must be a string array`);
  }
  return [...value];
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string): string[] {
  return assertStringArray(value, fieldName, sourceName).map((entry, index) => assertId(entry, `${fieldName}[${index}]`, sourceName));
}

function assertOneOf<const T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  sourceName: string,
  allowed: T,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${sourceName}.${fieldName} must be one of ${allowed.join(", ")}`);
  }
  return value;
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      const prohibited = PROHIBITED_AUTHORITY_CLAIMS.find((claim) => lower.includes(claim));
      if (prohibited) throw new Error(`${sourceName}.${trail} contains prohibited authority claim: ${prohibited}`);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_CONTENT_FIELD_NAMES.has(key) && nested !== false && nested !== null) {
      throw new Error(`${sourceName}.${trail}.${key} violates the S214 metadata-only raw-content boundary`);
    }
    assertNoForbiddenRawFields(nested, sourceName, `${trail}.${key}`);
  }
}

function assertUniqueIds(ids: string[], sourceName: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function validateStoragePolicy(value: unknown, sourceName: string): S214ReferencePipelineStoragePolicy {
  assertRecord(value, sourceName);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", sourceName),
    rawOfficialQuestionTextStored: assertFalse(value.rawOfficialQuestionTextStored, "rawOfficialQuestionTextStored", sourceName),
    rawOfficialAnswerTextStored: assertFalse(value.rawOfficialAnswerTextStored, "rawOfficialAnswerTextStored", sourceName),
    rawGeneratedReferenceAnswerStored: assertFalse(value.rawGeneratedReferenceAnswerStored, "rawGeneratedReferenceAnswerStored", sourceName),
    rawLearnerAnswerStored: assertFalse(value.rawLearnerAnswerStored, "rawLearnerAnswerStored", sourceName),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", sourceName),
    rawSourceExcerptStored: assertFalse(value.rawSourceExcerptStored, "rawSourceExcerptStored", sourceName),
    providerPayloadStored: assertFalse(value.providerPayloadStored, "providerPayloadStored", sourceName),
    privateContentStored: assertFalse(value.privateContentStored, "privateContentStored", sourceName),
    credentialsStored: assertFalse(value.credentialsStored, "credentialsStored", sourceName),
    assetBytesStored: assertFalse(value.assetBytesStored, "assetBytesStored", sourceName),
  };
}

function validateBoundaryPolicy(value: unknown, sourceName: string): S214ReferencePipelineBoundaryPolicy {
  assertRecord(value, sourceName);
  return {
    sourceLevelPipelineOnly: assertTrue(value.sourceLevelPipelineOnly, "sourceLevelPipelineOnly", sourceName),
    providerRuntimeCallsImplemented: assertFalse(value.providerRuntimeCallsImplemented, "providerRuntimeCallsImplemented", sourceName),
    ocrRuntimeCallsImplemented: assertFalse(value.ocrRuntimeCallsImplemented, "ocrRuntimeCallsImplemented", sourceName),
    learnerUiImplemented: assertFalse(value.learnerUiImplemented, "learnerUiImplemented", sourceName),
    publicArchiveUiImplemented: assertFalse(value.publicArchiveUiImplemented, "publicArchiveUiImplemented", sourceName),
    billingOrLedgerImplemented: assertFalse(value.billingOrLedgerImplemented, "billingOrLedgerImplemented", sourceName),
    authOrEntitlementChanged: assertFalse(value.authOrEntitlementChanged, "authOrEntitlementChanged", sourceName),
    supabaseChanged: assertFalse(value.supabaseChanged, "supabaseChanged", sourceName),
    migrationsChanged: assertFalse(value.migrationsChanged, "migrationsChanged", sourceName),
    workflowsChanged: assertFalse(value.workflowsChanged, "workflowsChanged", sourceName),
    instructorRuntimeRoutesChanged: assertFalse(value.instructorRuntimeRoutesChanged, "instructorRuntimeRoutesChanged", sourceName),
    academyRoutesChanged: assertFalse(value.academyRoutesChanged, "academyRoutesChanged", sourceName),
    officialGradingClaimAllowed: assertFalse(value.officialGradingClaimAllowed, "officialGradingClaimAllowed", sourceName),
    officialModelAnswerClaimAllowed: assertFalse(value.officialModelAnswerClaimAllowed, "officialModelAnswerClaimAllowed", sourceName),
    confirmedScoreClaimAllowed: assertFalse(value.confirmedScoreClaimAllowed, "confirmedScoreClaimAllowed", sourceName),
    passProbabilityClaimAllowed: assertFalse(value.passProbabilityClaimAllowed, "passProbabilityClaimAllowed", sourceName),
    passGuaranteeClaimAllowed: assertFalse(value.passGuaranteeClaimAllowed, "passGuaranteeClaimAllowed", sourceName),
  };
}

function validateOfficialSource(value: unknown, sourceName: string): S214OfficialSourceMetadata {
  assertRecord(value, sourceName);
  return {
    questionId: assertId(value.questionId, "questionId", sourceName),
    sourceId: assertId(value.sourceId, "sourceId", sourceName),
    rightsStatus: assertString(value.rightsStatus, "rightsStatus", sourceName),
    displayMode: assertString(value.displayMode, "displayMode", sourceName),
    extractionStatus: assertString(value.extractionStatus, "extractionStatus", sourceName),
    problemTextStatus: assertString(value.problemTextStatus, "problemTextStatus", sourceName),
    canonicalVerificationStatus: assertString(value.canonicalVerificationStatus, "canonicalVerificationStatus", sourceName),
    officialAnswerUsed: assertFalse(value.officialAnswerUsed, "officialAnswerUsed", sourceName),
    officialGradingCriteriaUsed: assertFalse(value.officialGradingCriteriaUsed, "officialGradingCriteriaUsed", sourceName),
    rawOfficialQuestionTextStored: assertFalse(value.rawOfficialQuestionTextStored, "rawOfficialQuestionTextStored", sourceName),
    rawOfficialAnswerTextStored: assertFalse(value.rawOfficialAnswerTextStored, "rawOfficialAnswerTextStored", sourceName),
  };
}

function validateRequirementSlot(value: unknown, index: number, sourceName: string): S214RequirementSlot {
  const slotName = `${sourceName}.requirementSlots[${index}]`;
  assertRecord(value, slotName);
  const candidateStrategyIds = assertStringArray(value.candidateStrategyIds, "candidateStrategyIds", slotName).map((strategy) => {
    if (!allCandidateStrategies().includes(strategy as S214CandidateStrategy)) {
      throw new Error(`${slotName}.candidateStrategyIds contains unsupported S214 candidate strategy ${strategy}`);
    }
    return strategy as S214CandidateStrategy;
  });
  return {
    requirementId: assertId(value.requirementId, "requirementId", slotName),
    subQuestionId: assertId(value.subQuestionId, "subQuestionId", slotName),
    requirementKind: assertOneOf(value.requirementKind, "requirementKind", slotName, REQUIREMENT_KINDS) as S214RequirementKind,
    points: assertNumber(value.points, "points", slotName, { min: 0 }),
    descriptorKey: assertId(value.descriptorKey, "descriptorKey", slotName),
    rawRequirementTextStored: assertFalse(value.rawRequirementTextStored, "rawRequirementTextStored", slotName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", slotName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", slotName),
    candidateStrategyIds,
  };
}

function validateRequirementDecomposition(value: unknown, sourceName: string): S214ProblemRequirementDecomposition {
  assertRecord(value, sourceName);
  if (!Array.isArray(value.requirementSlots)) throw new Error(`${sourceName}.requirementSlots must be an array`);
  const requirementSlots = value.requirementSlots.map((entry, index) => validateRequirementSlot(entry, index, sourceName));
  assertUniqueIds(requirementSlots.map((entry) => entry.requirementId), `${sourceName}.requirementSlots`);
  return {
    decompositionId: assertId(value.decompositionId, "decompositionId", sourceName),
    questionId: assertId(value.questionId, "questionId", sourceName),
    subject: assertOneOf(value.subject, "subject", sourceName, SUBJECTS) as S214Subject,
    source: assertOneOf(value.source, "source", sourceName, ["s203_canonical_question_metadata", "synthetic_fixture"] as const),
    totalPoints: assertNumber(value.totalPoints, "totalPoints", sourceName, { min: 0 }),
    requirementSlots,
    rawProblemTextStored: assertFalse(value.rawProblemTextStored, "rawProblemTextStored", sourceName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", sourceName),
  };
}

function validateSourcePack(value: unknown, sourceName: string): S214SourcePackMetadata {
  assertRecord(value, sourceName);
  return {
    sourcePackId: assertId(value.sourcePackId, "sourcePackId", sourceName),
    questionId: assertId(value.questionId, "questionId", sourceName),
    subject: assertOneOf(value.subject, "subject", sourceName, SUBJECTS) as S214Subject,
    status: assertOneOf(value.status, "status", sourceName, SOURCE_PACK_STATUSES) as S214SourcePackStatus,
    referencePackageId: assertId(value.referencePackageId, "referencePackageId", sourceName),
    officialSource: validateOfficialSource(value.officialSource, `${sourceName}.officialSource`),
    requirementDecomposition: validateRequirementDecomposition(value.requirementDecomposition, `${sourceName}.requirementDecomposition`),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", sourceName),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
    rawSourceExcerptStored: assertFalse(value.rawSourceExcerptStored, "rawSourceExcerptStored", sourceName),
  };
}

function validateCandidateEvidence(value: unknown, sourceName: string): S214CandidateEvidence {
  assertRecord(value, sourceName);
  return {
    status: assertOneOf(value.status, "status", sourceName, EVIDENCE_STATUSES) as S214CandidateEvidenceStatus,
    supportsS215: assertBoolean(value.supportsS215, "supportsS215", sourceName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", sourceName),
    rawEvidenceStored: assertFalse(value.rawEvidenceStored, "rawEvidenceStored", sourceName),
  };
}

function validateCandidateValidationState(value: unknown, sourceName: string): S214CandidateValidationState {
  assertRecord(value, sourceName);
  return {
    status: assertOneOf(value.status, "status", sourceName, VALIDATION_STATUSES) as S214ValidationStateStatus,
    validatorRefIds: assertIdArray(value.validatorRefIds, "validatorRefIds", sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
  };
}

function validateCandidateSlot(value: unknown, index: number, sourceName: string): S214CandidateSlot {
  const slotName = `${sourceName}.candidateSlots[${index}]`;
  assertRecord(value, slotName);
  const strategy = assertString(value.strategy, "strategy", slotName) as S214CandidateStrategy;
  if (!allCandidateStrategies().includes(strategy)) throw new Error(`${slotName}.strategy is not an S214 supported candidate strategy`);
  return {
    candidateSlotId: assertId(value.candidateSlotId, "candidateSlotId", slotName),
    subject: assertOneOf(value.subject, "subject", slotName, SUBJECTS) as S214Subject,
    strategy,
    independenceGroupId: assertId(value.independenceGroupId, "independenceGroupId", slotName),
    generationMethod: assertOneOf(value.generationMethod, "generationMethod", slotName, ["metadata_strategy_only"] as const),
    providerRuntimeCalled: assertFalse(value.providerRuntimeCalled, "providerRuntimeCalled", slotName),
    generatedAnswerProseStored: assertFalse(value.generatedAnswerProseStored, "generatedAnswerProseStored", slotName),
    sourcePackId: assertId(value.sourcePackId, "sourcePackId", slotName),
    requirementSlotIds: assertIdArray(value.requirementSlotIds, "requirementSlotIds", slotName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", slotName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", slotName),
    candidateEvidence: validateCandidateEvidence(value.candidateEvidence, `${slotName}.candidateEvidence`),
    validationState: validateCandidateValidationState(value.validationState, `${slotName}.validationState`),
  };
}

function validateReferencePackagePrerequisite(value: unknown, sourceName: string): S214ReferencePackagePrerequisite {
  assertRecord(value, sourceName);
  return {
    prerequisiteId: assertId(value.prerequisiteId, "prerequisiteId", sourceName),
    kind: assertOneOf(value.kind, "kind", sourceName, ["s207_reference_package"] as const),
    status: assertOneOf(value.status, "status", sourceName, PREREQUISITE_STATUSES) as S214PrerequisiteStatus,
    referencePackageId: assertId(value.referencePackageId, "referencePackageId", sourceName),
    s214GenerationInputAllowed: assertBoolean(value.s214GenerationInputAllowed, "s214GenerationInputAllowed", sourceName),
    s215ReleaseGateInputAllowed: assertBoolean(value.s215ReleaseGateInputAllowed, "s215ReleaseGateInputAllowed", sourceName),
    officialClaimAllowed: assertFalse(value.officialClaimAllowed, "officialClaimAllowed", sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
  };
}

function validateSubjectPrerequisite(value: unknown, subject: S214Subject, sourceName: string): S214SubjectReleasePrerequisite {
  assertRecord(value, sourceName);
  if (subject === "law") {
    return {
      prerequisiteId: assertId(value.prerequisiteId, "prerequisiteId", sourceName),
      kind: assertOneOf(value.kind, "kind", sourceName, ["s208_law_grounding"] as const),
      status: assertOneOf(value.status, "status", sourceName, PREREQUISITE_STATUSES) as S214PrerequisiteStatus,
      examDateVersionStatus: assertOneOf(
        value.examDateVersionStatus,
        "examDateVersionStatus",
        sourceName,
        ["applicable_to_exam_date", "synthetic_fixture", "needs_official_verification", "unresolved_conflict", "blocked"] as const,
      ),
      legalSourceStatus: assertOneOf(
        value.legalSourceStatus,
        "legalSourceStatus",
        sourceName,
        ["verified", "synthetic_fixture", "needs_official_verification", "unresolved_conflict", "blocked"] as const,
      ),
      s214GenerationAllowed: assertBoolean(value.s214GenerationAllowed, "s214GenerationAllowed", sourceName),
      s215ReleaseGateAllowed: assertBoolean(value.s215ReleaseGateAllowed, "s215ReleaseGateAllowed", sourceName),
      sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
      blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    };
  }
  if (subject === "theory") {
    const conceptStatusValues = ["verified", "synthetic_fixture", "needs_official_verification", "unresolved_conflict", "blocked"] as const;
    return {
      prerequisiteId: assertId(value.prerequisiteId, "prerequisiteId", sourceName),
      kind: assertOneOf(value.kind, "kind", sourceName, ["s209_theory_grounding"] as const),
      status: assertOneOf(value.status, "status", sourceName, PREREQUISITE_STATUSES) as S214PrerequisiteStatus,
      conceptStatus: assertOneOf(value.conceptStatus, "conceptStatus", sourceName, conceptStatusValues),
      definitionStatus: assertOneOf(value.definitionStatus, "definitionStatus", sourceName, conceptStatusValues),
      sourceCoverageStatus: assertOneOf(value.sourceCoverageStatus, "sourceCoverageStatus", sourceName, conceptStatusValues),
      s214GenerationAllowed: assertBoolean(value.s214GenerationAllowed, "s214GenerationAllowed", sourceName),
      s215ReleaseGateAllowed: assertBoolean(value.s215ReleaseGateAllowed, "s215ReleaseGateAllowed", sourceName),
      conceptAnchorIds: assertIdArray(value.conceptAnchorIds, "conceptAnchorIds", sourceName),
      blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    };
  }
  return {
    prerequisiteId: assertId(value.prerequisiteId, "prerequisiteId", sourceName),
    kind: assertOneOf(value.kind, "kind", sourceName, ["s210_practice_validation"] as const),
    status: assertOneOf(value.status, "status", sourceName, PREREQUISITE_STATUSES) as S214PrerequisiteStatus,
    unitStatus: assertOneOf(value.unitStatus, "unitStatus", sourceName, ["metadata_ready", "missing", "blocked"] as const),
    unitCheckStatus: assertOneOf(value.unitCheckStatus, "unitCheckStatus", sourceName, ["metadata_ready", "missing", "blocked"] as const),
    roundingCheckStatus: assertOneOf(value.roundingCheckStatus, "roundingCheckStatus", sourceName, ["metadata_ready", "missing", "blocked"] as const),
    independentRecalculationStatus: assertOneOf(
      value.independentRecalculationStatus,
      "independentRecalculationStatus",
      sourceName,
      ["metadata_ready", "missing", "blocked"] as const,
    ),
    runtimeEvidenceStatus: assertOneOf(value.runtimeEvidenceStatus, "runtimeEvidenceStatus", sourceName, ["not_run", "human_reviewed_passed"] as const),
    calculatorModel: assertOneOf(value.calculatorModel, "calculatorModel", sourceName, ["casio_fx_9860giii"] as const),
    resetSafeHandKeyedRoutineRequired: assertTrue(value.resetSafeHandKeyedRoutineRequired, "resetSafeHandKeyedRoutineRequired", sourceName),
    storedProgramDependencyAllowed: assertFalse(value.storedProgramDependencyAllowed, "storedProgramDependencyAllowed", sourceName),
    referenceAnswerReleaseAllowed: assertBoolean(value.referenceAnswerReleaseAllowed, "referenceAnswerReleaseAllowed", sourceName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
  };
}

function validateReleasePrerequisites(value: unknown, subject: S214Subject, sourceName: string): S214ReleasePrerequisites {
  assertRecord(value, sourceName);
  return {
    s207Package: validateReferencePackagePrerequisite(value.s207Package, `${sourceName}.s207Package`),
    subjectGate: validateSubjectPrerequisite(value.subjectGate, subject, `${sourceName}.subjectGate`),
  };
}

function validateConflictState(value: unknown, sourceName: string): S214UnresolvedConflictState {
  assertRecord(value, sourceName);
  const conflictIds = assertIdArray(value.conflictIds, "conflictIds", sourceName);
  const unresolvedConflictCount = assertNumber(value.unresolvedConflictCount, "unresolvedConflictCount", sourceName, { min: 0 });
  if (unresolvedConflictCount !== conflictIds.length) {
    throw new Error(`${sourceName}.unresolvedConflictCount must match conflictIds length`);
  }
  return {
    status: assertOneOf(value.status, "status", sourceName, CONFLICT_STATUSES) as S214ConflictStatus,
    unresolvedConflictCount,
    conflictIds,
    preservedForS215: assertTrue(value.preservedForS215, "preservedForS215", sourceName),
    rawConflictTextStored: assertFalse(value.rawConflictTextStored, "rawConflictTextStored", sourceName),
  };
}

function validateLearningReference(value: unknown, sourceName: string): S214LearningReferenceIdentity {
  assertRecord(value, sourceName);
  return {
    status: assertOneOf(value.status, "status", sourceName, ["candidate_metadata_only"] as const),
    learnerFacingLabelKey: assertOneOf(value.learnerFacingLabelKey, "learnerFacingLabelKey", sourceName, ["verified_learning_reference"] as const),
    requiredCaveatKey: assertOneOf(value.requiredCaveatKey, "requiredCaveatKey", sourceName, ["learning_reference_not_official_answer"] as const),
    learningReferenceOnly: assertTrue(value.learningReferenceOnly, "learningReferenceOnly", sourceName),
    officialClaimAllowed: assertFalse(value.officialClaimAllowed, "officialClaimAllowed", sourceName),
    officialGradingClaimAllowed: assertFalse(value.officialGradingClaimAllowed, "officialGradingClaimAllowed", sourceName),
    officialModelAnswerClaimAllowed: assertFalse(value.officialModelAnswerClaimAllowed, "officialModelAnswerClaimAllowed", sourceName),
    scorePredictionAllowed: assertFalse(value.scorePredictionAllowed, "scorePredictionAllowed", sourceName),
    passProbabilityAllowed: assertFalse(value.passProbabilityAllowed, "passProbabilityAllowed", sourceName),
    passGuaranteeAllowed: assertFalse(value.passGuaranteeAllowed, "passGuaranteeAllowed", sourceName),
    generatedAnswerProseStored: assertFalse(value.generatedAnswerProseStored, "generatedAnswerProseStored", sourceName),
  };
}

function allCandidateStrategies(): S214CandidateStrategy[] {
  return [
    ...S214_REQUIRED_CANDIDATE_STRATEGIES.law,
    ...S214_REQUIRED_CANDIDATE_STRATEGIES.theory,
    ...S214_REQUIRED_CANDIDATE_STRATEGIES.practice,
  ];
}

function assertPipelineBusinessRules(input: S214ReferenceAnswerPipelineInput, sourceName: string): void {
  if (input.sourcePack.subject !== input.subject) throw new Error(`${sourceName}.sourcePack.subject must match pipeline subject`);
  if (input.sourcePack.questionId !== input.questionId) throw new Error(`${sourceName}.sourcePack.questionId must match pipeline questionId`);
  if (input.sourcePack.requirementDecomposition.subject !== input.subject) {
    throw new Error(`${sourceName}.sourcePack.requirementDecomposition.subject must match pipeline subject`);
  }
  if (input.sourcePack.sourcePackId !== input.candidateSlots[0]?.sourcePackId) {
    throw new Error(`${sourceName}.candidateSlots must point at sourcePack.sourcePackId`);
  }
  if (input.candidateSlots.some((slot) => slot.sourcePackId !== input.sourcePack.sourcePackId)) {
    throw new Error(`${sourceName}.candidateSlots must all share sourcePack.sourcePackId`);
  }
  if (input.candidateSlots.some((slot) => slot.subject !== input.subject)) {
    throw new Error(`${sourceName}.candidateSlots subject must match pipeline subject`);
  }

  assertUniqueIds(input.candidateSlots.map((slot) => slot.candidateSlotId), `${sourceName}.candidateSlots`);
  const independentCandidateCount = new Set(input.candidateSlots.map((slot) => slot.independenceGroupId)).size;
  if (independentCandidateCount < S214_MIN_INDEPENDENT_CANDIDATE_SLOTS) {
    throw new Error(`${sourceName} requires at least three independent candidate slots`);
  }

  const requiredStrategies = S214_REQUIRED_CANDIDATE_STRATEGIES[input.subject];
  const suppliedStrategies = new Set(input.candidateSlots.map((slot) => slot.strategy));
  for (const strategy of requiredStrategies) {
    if (!suppliedStrategies.has(strategy)) {
      throw new Error(`${sourceName} missing required ${input.subject} candidate strategy ${strategy}`);
    }
  }
}

export function validateS214ReferenceAnswerPipelineInput(
  value: unknown,
  sourceName = "s214ReferenceAnswerPipeline",
): S214ReferenceAnswerPipelineInput {
  assertNoForbiddenRawFields(value, sourceName);
  assertRecord(value, sourceName);
  const subject = assertOneOf(value.subject, "subject", sourceName, SUBJECTS) as S214Subject;
  if (!Array.isArray(value.candidateSlots)) throw new Error(`${sourceName}.candidateSlots must be an array`);
  const input: S214ReferenceAnswerPipelineInput = {
    pipelineId: assertId(value.pipelineId, "pipelineId", sourceName),
    version: assertOneOf(value.version, "version", sourceName, [S214_REFERENCE_ANSWER_PIPELINE_VERSION] as const),
    subject,
    questionId: assertId(value.questionId, "questionId", sourceName),
    sourcePack: validateSourcePack(value.sourcePack, `${sourceName}.sourcePack`),
    candidateSlots: value.candidateSlots.map((entry, index) => validateCandidateSlot(entry, index, sourceName)),
    releasePrerequisites: validateReleasePrerequisites(value.releasePrerequisites, subject, `${sourceName}.releasePrerequisites`),
    unresolvedConflictState: validateConflictState(value.unresolvedConflictState, `${sourceName}.unresolvedConflictState`),
    learningReference: validateLearningReference(value.learningReference, `${sourceName}.learningReference`),
  };
  assertPipelineBusinessRules(input, sourceName);
  return input;
}

function addReason(reasons: Set<S214BlockedReasonCode>, condition: boolean, reason: S214BlockedReasonCode): void {
  if (condition) reasons.add(reason);
}

function prerequisiteReasons(input: S214ReferenceAnswerPipelineInput): S214BlockedReasonCode[] {
  const reasons = new Set<S214BlockedReasonCode>();
  const s207 = input.releasePrerequisites.s207Package;
  addReason(
    reasons,
    s207.status !== "passed" || !s207.s214GenerationInputAllowed || !s207.s215ReleaseGateInputAllowed,
    "s207_reference_package_not_ready",
  );

  const subjectGate = input.releasePrerequisites.subjectGate;
  if (subjectGate.kind === "s208_law_grounding") {
    addReason(
      reasons,
      subjectGate.status !== "passed"
        || !subjectGate.s214GenerationAllowed
        || !subjectGate.s215ReleaseGateAllowed
        || !["verified", "synthetic_fixture"].includes(subjectGate.legalSourceStatus)
        || !["applicable_to_exam_date", "synthetic_fixture"].includes(subjectGate.examDateVersionStatus),
      "s208_law_grounding_missing",
    );
  } else if (subjectGate.kind === "s209_theory_grounding") {
    addReason(
      reasons,
      subjectGate.status !== "passed"
        || !subjectGate.s214GenerationAllowed
        || !subjectGate.s215ReleaseGateAllowed
        || !["verified", "synthetic_fixture"].includes(subjectGate.conceptStatus)
        || !["verified", "synthetic_fixture"].includes(subjectGate.definitionStatus)
        || !["verified", "synthetic_fixture"].includes(subjectGate.sourceCoverageStatus),
      "s209_theory_grounding_missing",
    );
  } else {
    const practicePrereqMissing = subjectGate.status !== "passed"
      || subjectGate.unitStatus !== "metadata_ready"
      || subjectGate.unitCheckStatus !== "metadata_ready"
      || subjectGate.roundingCheckStatus !== "metadata_ready"
      || subjectGate.independentRecalculationStatus !== "metadata_ready"
      || subjectGate.runtimeEvidenceStatus !== "human_reviewed_passed";
    addReason(reasons, practicePrereqMissing, "s210_practice_validation_missing");
    addReason(reasons, !subjectGate.referenceAnswerReleaseAllowed, "s210_reference_answer_release_not_allowed");
  }

  return [...reasons];
}

function sourcePackReasons(input: S214ReferenceAnswerPipelineInput): S214BlockedReasonCode[] {
  const reasons = new Set<S214BlockedReasonCode>();
  addReason(reasons, input.sourcePack.status === "missing", "source_pack_missing");
  addReason(reasons, input.sourcePack.status === "blocked", "source_pack_blocked");
  addReason(
    reasons,
    input.sourcePack.requirementDecomposition.requirementSlots.length === 0,
    "requirement_decomposition_missing",
  );
  return [...reasons];
}

function candidateReasons(input: S214ReferenceAnswerPipelineInput): S214BlockedReasonCode[] {
  const reasons = new Set<S214BlockedReasonCode>();
  addReason(
    reasons,
    input.candidateSlots.some((slot) => (
      slot.candidateEvidence.status !== "metadata_ready"
      || !slot.candidateEvidence.supportsS215
      || slot.candidateEvidence.sourceAnchorIds.length === 0
      || slot.candidateEvidence.evidenceAnchorIds.length === 0
    )),
    "candidate_evidence_missing",
  );
  addReason(
    reasons,
    input.candidateSlots.some((slot) => slot.validationState.status !== "passed"),
    "candidate_validation_state_missing",
  );
  return [...reasons];
}

export function buildS214ReferenceAnswerPipeline(
  rawInput: S214ReferenceAnswerPipelineInput,
): S214ReferenceAnswerPipelineResult {
  const input = validateS214ReferenceAnswerPipelineInput(rawInput);
  const blockedReasonCodes = [
    ...sourcePackReasons(input),
    ...candidateReasons(input),
    ...prerequisiteReasons(input),
  ];
  const status: S214PipelineStatus = blockedReasonCodes.length === 0 ? "ready_for_s215_consensus" : "blocked";
  const requiredStrategyIds = S214_REQUIRED_CANDIDATE_STRATEGIES[input.subject];
  const suppliedStrategyIds = [...new Set(input.candidateSlots.map((slot) => slot.strategy))];

  return {
    pipelineId: input.pipelineId,
    version: S214_REFERENCE_ANSWER_PIPELINE_VERSION,
    subject: input.subject,
    questionId: input.questionId,
    status,
    blockedReasonCodes,
    sourcePack: input.sourcePack,
    requirementDecomposition: input.sourcePack.requirementDecomposition,
    candidateStrategyReport: {
      minimumIndependentCandidateSlots: S214_MIN_INDEPENDENT_CANDIDATE_SLOTS,
      candidateSlotCount: input.candidateSlots.length,
      independentCandidateSlotCount: new Set(input.candidateSlots.map((slot) => slot.independenceGroupId)).size,
      requiredStrategyIds,
      suppliedStrategyIds,
    },
    releaseGate: {
      status,
      s215ReleaseGateInputAllowed: status === "ready_for_s215_consensus",
      referenceAnswerReleaseAllowed: false,
      learnerFacingReleaseAllowed: false,
      requiredCaveatKey: "learning_reference_not_official_answer",
      officialClaimAllowed: false,
      officialGradingClaimAllowed: false,
      officialModelAnswerClaimAllowed: false,
      confirmedScoreClaimAllowed: false,
      passProbabilityClaimAllowed: false,
      passGuaranteeClaimAllowed: false,
    },
    releasePrerequisites: input.releasePrerequisites,
    unresolvedConflictState: input.unresolvedConflictState,
    learnerInstructorBoundary: {
      learnerUiChanged: false,
      instructorUiChanged: false,
      learnerRuntimeChanged: false,
      instructorRuntimeRoutesChanged: false,
      academyTenantDataAccessed: false,
      learnerInstructorDataMerged: false,
    },
    dataBoundary: {
      metadataOnly: true,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      rawOfficialQuestionTextStored: false,
      rawOfficialAnswerTextStored: false,
      rawGeneratedReferenceAnswerStored: false,
      rawLearnerAnswerStored: false,
      rawOcrTextStored: false,
      rawSourceExcerptStored: false,
    },
    learningReference: input.learningReference,
  };
}

export function validateS214ReferenceAnswerPipelineRegistry(
  value: unknown,
  sourceName = "s214ReferenceAnswerPipelineRegistry",
): S214ReferenceAnswerPipelineRegistry {
  assertNoForbiddenRawFields(value, sourceName);
  assertRecord(value, sourceName);
  if (!Array.isArray(value.pipelines)) throw new Error(`${sourceName}.pipelines must be an array`);
  const registry: S214ReferenceAnswerPipelineRegistry = {
    schemaVersion: assertOneOf(value.schemaVersion, "schemaVersion", sourceName, [S214_REFERENCE_ANSWER_PIPELINE_VERSION] as const),
    registryType: assertOneOf(
      value.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_s214_reference_answer_pipeline_registry"] as const,
    ),
    generatedBy: assertString(value.generatedBy, "generatedBy", sourceName),
    generatedAt: assertString(value.generatedAt, "generatedAt", sourceName),
    storagePolicy: validateStoragePolicy(value.storagePolicy, `${sourceName}.storagePolicy`),
    boundaryPolicy: validateBoundaryPolicy(value.boundaryPolicy, `${sourceName}.boundaryPolicy`),
    pipelines: value.pipelines.map((entry, index) => validateS214ReferenceAnswerPipelineInput(entry, `${sourceName}.pipelines[${index}]`)),
  };
  assertUniqueIds(registry.pipelines.map((entry) => entry.pipelineId), `${sourceName}.pipelines`);
  return registry;
}

export function buildS214ReferenceAnswerPipelineRegistryReport(
  registry: S214ReferenceAnswerPipelineRegistry,
): S214ReferenceAnswerPipelineRegistryReport {
  const results = registry.pipelines.map((pipeline) => buildS214ReferenceAnswerPipeline(pipeline));
  const subjectCounts: Record<S214Subject, number> = { law: 0, theory: 0, practice: 0 };
  for (const result of results) {
    subjectCounts[result.subject] += 1;
  }

  return {
    schemaVersion: S214_REFERENCE_ANSWER_PIPELINE_VERSION,
    reportType: "appraiser_second_round_s214_reference_answer_pipeline_report",
    generatedBy: registry.generatedBy,
    generatedAt: registry.generatedAt,
    totals: {
      pipelineCount: results.length,
      readyForS215Count: results.filter((result) => result.status === "ready_for_s215_consensus").length,
      blockedCount: results.filter((result) => result.status === "blocked").length,
      candidateSlotCount: results.reduce((sum, result) => sum + result.candidateStrategyReport.candidateSlotCount, 0),
      unresolvedConflictCount: results.reduce((sum, result) => sum + result.unresolvedConflictState.unresolvedConflictCount, 0),
      subjectCounts,
    },
    metadataOnly: true,
    safeUse: "s214_candidate_pipeline_metadata_only",
  };
}
