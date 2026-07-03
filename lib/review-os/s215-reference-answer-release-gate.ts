import {
  S211_LAW_ANSWER_REVIEW_ENGINE_VERSION,
  type S211GateStatus,
  type S211LawDimensionId,
} from "./s211-law-answer-review-engine";
import {
  S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
  S212_THEORY_DIMENSION_IDS,
  type S212TheoryDimensionId,
  type S212TheoryGateStatus,
} from "./theory-answer-review-engine";
import {
  S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
  S213_PRACTICE_DIMENSION_IDS,
  type S213PracticeDimensionId,
  type S213PracticeGateStatus,
  type S213PracticeMetadataCheckKey,
} from "./practice-answer-review-engine";
import {
  S214_REFERENCE_ANSWER_PIPELINE_VERSION,
  buildS214ReferenceAnswerPipeline,
  validateS214ReferenceAnswerPipelineInput,
  type S214ReferenceAnswerPipelineInput,
  type S214ReferenceAnswerPipelineResult,
  type S214Subject,
} from "./s214-reference-answer-pipeline";

export const S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION = "s215.reference_answer_critic_consensus_release_gate.v1" as const;

export type S215ReleaseGateStatus = "released" | "blocked";
export type S215CriticFindingStatus = "passed" | "warning" | "missing" | "blocked";
export type S215ConsensusStatus = "passed" | "missing" | "unresolved_conflict" | "blocked";

export type S215CriticFindingKind =
  | "source_anchor_integrity"
  | "requirement_coverage"
  | "rubric_answer_consistency"
  | "legal_source_version"
  | "theory_concept_grounding"
  | "calculation_consistency"
  | "data_boundary"
  | "official_claim_guardrail";

export type S215ReleaseBlockerCode =
  | "s214_pipeline_not_ready"
  | "source_pack_blocker"
  | "candidate_metadata_blocker"
  | "legal_source_blocker"
  | "theory_concept_blocker"
  | "calculation_blocker"
  | "source_anchor_fabricated"
  | "evidence_anchor_fabricated"
  | "requirement_coverage_missing"
  | "critic_finding_missing"
  | "critic_finding_blocked"
  | "rubric_answer_consistency_blocker"
  | "consensus_missing"
  | "unresolved_consensus_conflict"
  | "prohibited_authority_claim"
  | "metadata_boundary_violation"
  | "learner_instructor_boundary_violation"
  | "official_caveat_missing"
  | "subject_review_contract_not_ready";

export type S215ReferenceReleaseGateStoragePolicy = {
  metadataOnly: true;
  rawOfficialQuestionTextStored: false;
  rawOfficialAnswerTextStored: false;
  rawGeneratedReferenceAnswerStored: false;
  rawLearnerAnswerStored: false;
  rawOcrTextStored: false;
  rawSourceExcerptStored: false;
  formulaExpressionStored: false;
  extractedValuesStored: false;
  calculationTraceStored: false;
  providerPayloadStored: false;
  privateContentStored: false;
  credentialsStored: false;
  assetBytesStored: false;
};

export type S215ReferenceReleaseGateBoundaryPolicy = {
  sourceLevelReleaseGateOnly: true;
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
  learnerInstructorDataMerged: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  confirmedScoreClaimAllowed: false;
  passProbabilityClaimAllowed: false;
  passGuaranteeClaimAllowed: false;
};

export type S215AuthorityGuardrail = {
  requiredCaveatKey: "learning_reference_not_official_answer";
  learningReferenceOnly: true;
  officialClaimAllowed: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  confirmedScoreClaimAllowed: false;
  scorePredictionAllowed: false;
  passProbabilityAllowed: false;
  passGuaranteeAllowed: false;
  generatedAnswerProseStored: false;
};

export type S215LawReviewCompatibility = {
  kind: "s211_law_answer_review_metadata";
  engineVersion: typeof S211_LAW_ANSWER_REVIEW_ENGINE_VERSION;
  lawSourceGateStatus: S211GateStatus;
  referencePackageGateStatus: S211GateStatus;
  evaluatedDimensionIds: S211LawDimensionId[];
  learnerRouteOnly: true;
  instructorRouteSeparated: true;
  academyTenantDataAccessed: false;
  prohibitedAuthorityClaims: {
    officialGrading: false;
    officialModelAnswer: false;
    passProbability: false;
    passGuarantee: false;
    confirmedScore: false;
  };
  metadataOnly: true;
  containsRawContent: false;
};

export type S215TheoryReviewCompatibility = {
  kind: "s212_theory_answer_review_metadata";
  engineVersion: typeof S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION;
  conceptSourceVerification: S212TheoryGateStatus;
  referencePackageVerification: S212TheoryGateStatus;
  theoryQualityDimensionIds: S212TheoryDimensionId[];
  dimensionEvidence: Record<S212TheoryDimensionId, S212TheoryGateStatus>;
  authorityClaims: "none";
  metadataBoundary: "metadata_only";
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  scoreLikeSummary: "secondary_non_official_range";
};

export type S215PracticeReviewCompatibility = {
  kind: "s213_practice_answer_review_metadata";
  engineVersion: typeof S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION;
  referencePackageVerification: S213PracticeGateStatus;
  calculationUnitSupport: S213PracticeGateStatus;
  calculationReviewMetadata: S213PracticeGateStatus;
  practiceDimensionIds: S213PracticeDimensionId[];
  dimensionEvidence: Record<S213PracticeDimensionId, S213PracticeGateStatus>;
  metadataChecks: Record<S213PracticeMetadataCheckKey, S213PracticeGateStatus>;
  authorityClaims: "none";
  metadataBoundary: "metadata_only";
  learnerInstructorSeparation: "learner_only_no_instructor_route";
  scoreLikeSummary: "secondary_non_official_range";
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineOnly: true;
  storedProgramDependency: false;
};

export type S215SubjectReviewCompatibility =
  | S215LawReviewCompatibility
  | S215TheoryReviewCompatibility
  | S215PracticeReviewCompatibility;

export type S215CriticFinding = {
  findingId: string;
  subject: S214Subject;
  kind: S215CriticFindingKind;
  status: S215CriticFindingStatus;
  releaseBlocking: boolean;
  candidateSlotIds: string[];
  requirementSlotIds: string[];
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  blockerIds: string[];
  rawFindingTextStored: false;
  generatedAnswerProseStored: false;
};

export type S215ConsensusRecord = {
  consensusId: string;
  status: S215ConsensusStatus;
  criticFindingIds: string[];
  acceptedCandidateSlotIds: string[];
  coveredRequirementSlotIds: string[];
  unresolvedConflictIds: string[];
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  rawConsensusTextStored: false;
  generatedAnswerProseStored: false;
};

export type S215ReferenceAnswerReleaseGateInput = {
  gateId: string;
  version: typeof S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION;
  subject: S214Subject;
  questionId: string;
  s214PipelineId: string;
  referencePackageId: string;
  subjectReviewCompatibility: S215SubjectReviewCompatibility;
  criticFindings: S215CriticFinding[];
  consensusRecord: S215ConsensusRecord;
  authorityGuardrail: S215AuthorityGuardrail;
};

export type S215ReferenceAnswerReleaseGateRegistry = {
  schemaVersion: typeof S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION;
  registryType: "appraiser_second_round_s215_reference_answer_release_gate_registry";
  generatedBy: string;
  generatedAt: string;
  s214PipelineRegistryPath: string;
  storagePolicy: S215ReferenceReleaseGateStoragePolicy;
  boundaryPolicy: S215ReferenceReleaseGateBoundaryPolicy;
  gates: S215ReferenceAnswerReleaseGateInput[];
};

export type S215ReleaseBlocker = {
  blockerId: string;
  code: S215ReleaseBlockerCode;
  severity: "blocking";
  sourceAnchorIds: string[];
  evidenceAnchorIds: string[];
  candidateSlotIds: string[];
  requirementSlotIds: string[];
  preservedConflictIds: string[];
};

export type S215ReferenceAnswerReleaseGateResult = {
  gateId: string;
  version: typeof S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION;
  subject: S214Subject;
  questionId: string;
  s214PipelineId: string;
  referencePackageId: string;
  status: S215ReleaseGateStatus;
  blockerCodes: S215ReleaseBlockerCode[];
  blockers: S215ReleaseBlocker[];
  s214Handoff: {
    version: typeof S214_REFERENCE_ANSWER_PIPELINE_VERSION;
    status: S214ReferenceAnswerPipelineResult["status"];
    blockedReasonCodes: S214ReferenceAnswerPipelineResult["blockedReasonCodes"];
    s215ReleaseGateInputAllowed: boolean;
  };
  criticReport: {
    requiredFindingKinds: readonly S215CriticFindingKind[];
    suppliedFindingKinds: S215CriticFindingKind[];
    criticFindingCount: number;
    passedFindingCount: number;
    releaseBlockingFindingCount: number;
    missingRequiredFindingKinds: S215CriticFindingKind[];
  };
  consensus: {
    status: S215ConsensusStatus;
    unresolvedConflictIds: string[];
    s214ConflictIds: string[];
    preservedUnresolvedConflictState: true;
    rawConflictTextStored: false;
  };
  sourceAnchorIntegrity: {
    status: "passed" | "failed_closed";
    fabricatedSourceAnchorIds: string[];
    fabricatedEvidenceAnchorIds: string[];
  };
  releaseDecision: {
    status: S215ReleaseGateStatus;
    learningReferenceStatus: "released_learning_reference" | "blocked";
    releaseGateStatus: "released" | "blocked";
    referenceAnswerReleaseAllowed: boolean;
    learnerFacingLearningReferenceAllowed: boolean;
    requiredCaveatKey: "learning_reference_not_official_answer";
    learningReferenceOnly: true;
    officialClaimAllowed: false;
    officialGradingClaimAllowed: false;
    officialModelAnswerClaimAllowed: false;
    confirmedScoreClaimAllowed: false;
    scorePredictionAllowed: false;
    passProbabilityAllowed: false;
    passGuaranteeAllowed: false;
  };
  subjectReviewCompatibility: S215SubjectReviewCompatibility;
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
    formulaExpressionStored: false;
    extractedValuesStored: false;
    calculationTraceStored: false;
  };
};

export type S215ReferenceAnswerReleaseGateRegistryReport = {
  schemaVersion: typeof S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION;
  reportType: "appraiser_second_round_s215_reference_answer_release_gate_report";
  generatedBy: string;
  generatedAt: string;
  totals: {
    gateCount: number;
    releasedCount: number;
    blockedCount: number;
    blockerCount: number;
    unresolvedConflictCount: number;
    subjectCounts: Record<S214Subject, number>;
  };
  metadataOnly: true;
  safeUse: "s215_critic_consensus_release_gate_metadata_only";
};

const SUBJECTS = ["law", "theory", "practice"] as const;
const CRITIC_FINDING_STATUSES = ["passed", "warning", "missing", "blocked"] as const;
const CONSENSUS_STATUSES = ["passed", "missing", "unresolved_conflict", "blocked"] as const;
const CRITIC_FINDING_KINDS = [
  "source_anchor_integrity",
  "requirement_coverage",
  "rubric_answer_consistency",
  "legal_source_version",
  "theory_concept_grounding",
  "calculation_consistency",
  "data_boundary",
  "official_claim_guardrail",
] as const;
const REQUIRED_CRITIC_FINDING_KINDS = {
  law: ["source_anchor_integrity", "requirement_coverage", "rubric_answer_consistency", "legal_source_version", "data_boundary", "official_claim_guardrail"],
  theory: ["source_anchor_integrity", "requirement_coverage", "rubric_answer_consistency", "theory_concept_grounding", "data_boundary", "official_claim_guardrail"],
  practice: ["source_anchor_integrity", "requirement_coverage", "rubric_answer_consistency", "calculation_consistency", "data_boundary", "official_claim_guardrail"],
} as const satisfies Record<S214Subject, readonly S215CriticFindingKind[]>;
const S211_LAW_DIMENSION_IDS = [
  "law_issue_spotting",
  "law_requirement_decomposition",
  "law_rule_mapping",
  "law_subsumption_application",
  "law_conclusion_quality",
] as const satisfies readonly S211LawDimensionId[];
const S213_METADATA_CHECK_KEYS = [
  "assumptions",
  "dataSelection",
  "formulaMetadata",
  "calculationTrace",
  "unitCheck",
  "roundingCheck",
  "timeAdjustment",
  "crossCheck",
  "conclusionWriting",
  "independentRecalculation",
] as const satisfies readonly S213PracticeMetadataCheckKey[];
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,180}$/;

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "answerText",
  "answerBody",
  "questionText",
  "questionBody",
  "officialQuestionText",
  "officialAnswerText",
  "generatedAnswerText",
  "generatedReferenceAnswer",
  "referenceAnswerText",
  "learnerAnswerText",
  "ocrText",
  "rawOcrText",
  "sourceExcerpt",
  "formulaExpression",
  "extractedValues",
  "rawCalculationTrace",
  "calculationTraceText",
  "calculationTraceBody",
  "providerPayload",
  "rawPayload",
  "credentials",
  "secret",
  "privateContent",
]);

const PROHIBITED_AUTHORITY_CLAIMS = [
  "official grading",
  "official model answer",
  "official answer",
  "confirmed score",
  "score prediction",
  "pass probability",
  "pass/fail prediction",
  "pass guarantee",
  "guaranteed score",
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
  const lower = value.toLowerCase();
  const prohibited = PROHIBITED_AUTHORITY_CLAIMS.find((claim) => lower.includes(claim));
  if (prohibited) throw new Error(`${sourceName}.${fieldName} contains prohibited authority claim: ${prohibited}`);
  return value;
}

function assertId(value: unknown, fieldName: string, sourceName: string): string {
  const id = assertString(value, fieldName, sourceName, 190);
  if (!ID_PATTERN.test(id)) throw new Error(`${sourceName}.${fieldName} must be a stable lowercase metadata id`);
  return id;
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName}.${fieldName} must be false`);
  return false;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertBoolean(value: unknown, fieldName: string, sourceName: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${sourceName}.${fieldName} must be boolean`);
  return value;
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

function assertStringArray(value: unknown, fieldName: string, sourceName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error(`${sourceName}.${fieldName} must be a string array`);
  }
  return [...value];
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string): string[] {
  return assertStringArray(value, fieldName, sourceName).map((entry, index) => assertId(entry, `${fieldName}[${index}]`, sourceName));
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
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
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) && nested !== false && nested !== null) {
      throw new Error(`${sourceName}.${trail}.${key} violates the S215 metadata-only raw-content boundary`);
    }
    assertNoForbiddenRawFields(nested, sourceName, `${trail}.${key}`);
  }
}

function assertUniqueIds(ids: readonly string[], sourceName: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function validateStoragePolicy(value: unknown, sourceName: string): S215ReferenceReleaseGateStoragePolicy {
  assertRecord(value, sourceName);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", sourceName),
    rawOfficialQuestionTextStored: assertFalse(value.rawOfficialQuestionTextStored, "rawOfficialQuestionTextStored", sourceName),
    rawOfficialAnswerTextStored: assertFalse(value.rawOfficialAnswerTextStored, "rawOfficialAnswerTextStored", sourceName),
    rawGeneratedReferenceAnswerStored: assertFalse(value.rawGeneratedReferenceAnswerStored, "rawGeneratedReferenceAnswerStored", sourceName),
    rawLearnerAnswerStored: assertFalse(value.rawLearnerAnswerStored, "rawLearnerAnswerStored", sourceName),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", sourceName),
    rawSourceExcerptStored: assertFalse(value.rawSourceExcerptStored, "rawSourceExcerptStored", sourceName),
    formulaExpressionStored: assertFalse(value.formulaExpressionStored, "formulaExpressionStored", sourceName),
    extractedValuesStored: assertFalse(value.extractedValuesStored, "extractedValuesStored", sourceName),
    calculationTraceStored: assertFalse(value.calculationTraceStored, "calculationTraceStored", sourceName),
    providerPayloadStored: assertFalse(value.providerPayloadStored, "providerPayloadStored", sourceName),
    privateContentStored: assertFalse(value.privateContentStored, "privateContentStored", sourceName),
    credentialsStored: assertFalse(value.credentialsStored, "credentialsStored", sourceName),
    assetBytesStored: assertFalse(value.assetBytesStored, "assetBytesStored", sourceName),
  };
}

function validateBoundaryPolicy(value: unknown, sourceName: string): S215ReferenceReleaseGateBoundaryPolicy {
  assertRecord(value, sourceName);
  return {
    sourceLevelReleaseGateOnly: assertTrue(value.sourceLevelReleaseGateOnly, "sourceLevelReleaseGateOnly", sourceName),
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
    learnerInstructorDataMerged: assertFalse(value.learnerInstructorDataMerged, "learnerInstructorDataMerged", sourceName),
    officialGradingClaimAllowed: assertFalse(value.officialGradingClaimAllowed, "officialGradingClaimAllowed", sourceName),
    officialModelAnswerClaimAllowed: assertFalse(value.officialModelAnswerClaimAllowed, "officialModelAnswerClaimAllowed", sourceName),
    confirmedScoreClaimAllowed: assertFalse(value.confirmedScoreClaimAllowed, "confirmedScoreClaimAllowed", sourceName),
    passProbabilityClaimAllowed: assertFalse(value.passProbabilityClaimAllowed, "passProbabilityClaimAllowed", sourceName),
    passGuaranteeClaimAllowed: assertFalse(value.passGuaranteeClaimAllowed, "passGuaranteeClaimAllowed", sourceName),
  };
}

function validateAuthorityGuardrail(value: unknown, sourceName: string): S215AuthorityGuardrail {
  assertRecord(value, sourceName);
  return {
    requiredCaveatKey: assertOneOf(value.requiredCaveatKey, "requiredCaveatKey", sourceName, ["learning_reference_not_official_answer"] as const),
    learningReferenceOnly: assertTrue(value.learningReferenceOnly, "learningReferenceOnly", sourceName),
    officialClaimAllowed: assertFalse(value.officialClaimAllowed, "officialClaimAllowed", sourceName),
    officialGradingClaimAllowed: assertFalse(value.officialGradingClaimAllowed, "officialGradingClaimAllowed", sourceName),
    officialModelAnswerClaimAllowed: assertFalse(value.officialModelAnswerClaimAllowed, "officialModelAnswerClaimAllowed", sourceName),
    confirmedScoreClaimAllowed: assertFalse(value.confirmedScoreClaimAllowed, "confirmedScoreClaimAllowed", sourceName),
    scorePredictionAllowed: assertFalse(value.scorePredictionAllowed, "scorePredictionAllowed", sourceName),
    passProbabilityAllowed: assertFalse(value.passProbabilityAllowed, "passProbabilityAllowed", sourceName),
    passGuaranteeAllowed: assertFalse(value.passGuaranteeAllowed, "passGuaranteeAllowed", sourceName),
    generatedAnswerProseStored: assertFalse(value.generatedAnswerProseStored, "generatedAnswerProseStored", sourceName),
  };
}

function assertIncludesAll<const T extends readonly string[]>(
  supplied: readonly string[],
  required: T,
  fieldName: string,
  sourceName: string,
): void {
  for (const value of required) {
    if (!supplied.includes(value)) throw new Error(`${sourceName}.${fieldName} must include ${value}`);
  }
}

function validateLawCompatibility(value: Record<string, unknown>, sourceName: string): S215LawReviewCompatibility {
  const evaluatedDimensionIds = assertStringArray(value.evaluatedDimensionIds, "evaluatedDimensionIds", sourceName).map((id) => {
    if (!(S211_LAW_DIMENSION_IDS as readonly string[]).includes(id)) {
      throw new Error(`${sourceName}.evaluatedDimensionIds contains unsupported S211 dimension ${id}`);
    }
    return id as S211LawDimensionId;
  });
  assertIncludesAll(evaluatedDimensionIds, S211_LAW_DIMENSION_IDS, "evaluatedDimensionIds", sourceName);
  assertRecord(value.prohibitedAuthorityClaims, `${sourceName}.prohibitedAuthorityClaims`);
  return {
    kind: assertOneOf(value.kind, "kind", sourceName, ["s211_law_answer_review_metadata"] as const),
    engineVersion: assertOneOf(value.engineVersion, "engineVersion", sourceName, [S211_LAW_ANSWER_REVIEW_ENGINE_VERSION] as const),
    lawSourceGateStatus: assertOneOf(value.lawSourceGateStatus, "lawSourceGateStatus", sourceName, ["ready", "withheld"] as const),
    referencePackageGateStatus: assertOneOf(value.referencePackageGateStatus, "referencePackageGateStatus", sourceName, ["ready", "withheld"] as const),
    evaluatedDimensionIds,
    learnerRouteOnly: assertTrue(value.learnerRouteOnly, "learnerRouteOnly", sourceName),
    instructorRouteSeparated: assertTrue(value.instructorRouteSeparated, "instructorRouteSeparated", sourceName),
    academyTenantDataAccessed: assertFalse(value.academyTenantDataAccessed, "academyTenantDataAccessed", sourceName),
    prohibitedAuthorityClaims: {
      officialGrading: assertFalse(value.prohibitedAuthorityClaims.officialGrading, "officialGrading", `${sourceName}.prohibitedAuthorityClaims`),
      officialModelAnswer: assertFalse(value.prohibitedAuthorityClaims.officialModelAnswer, "officialModelAnswer", `${sourceName}.prohibitedAuthorityClaims`),
      passProbability: assertFalse(value.prohibitedAuthorityClaims.passProbability, "passProbability", `${sourceName}.prohibitedAuthorityClaims`),
      passGuarantee: assertFalse(value.prohibitedAuthorityClaims.passGuarantee, "passGuarantee", `${sourceName}.prohibitedAuthorityClaims`),
      confirmedScore: assertFalse(value.prohibitedAuthorityClaims.confirmedScore, "confirmedScore", `${sourceName}.prohibitedAuthorityClaims`),
    },
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", sourceName),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateGateRecord<T extends string>(
  value: unknown,
  keys: readonly T[],
  fieldName: string,
  sourceName: string,
): Record<T, S212TheoryGateStatus | S213PracticeGateStatus> {
  assertRecord(value, `${sourceName}.${fieldName}`);
  const output = {} as Record<T, S212TheoryGateStatus | S213PracticeGateStatus>;
  for (const key of keys) {
    output[key] = assertOneOf(value[key], key, `${sourceName}.${fieldName}`, ["passed", "failed_closed"] as const);
  }
  return output;
}

function validateTheoryCompatibility(value: Record<string, unknown>, sourceName: string): S215TheoryReviewCompatibility {
  const theoryQualityDimensionIds = assertStringArray(value.theoryQualityDimensionIds, "theoryQualityDimensionIds", sourceName).map((id) => {
    if (!(S212_THEORY_DIMENSION_IDS as readonly string[]).includes(id)) {
      throw new Error(`${sourceName}.theoryQualityDimensionIds contains unsupported S212 dimension ${id}`);
    }
    return id as S212TheoryDimensionId;
  });
  assertIncludesAll(theoryQualityDimensionIds, S212_THEORY_DIMENSION_IDS, "theoryQualityDimensionIds", sourceName);
  return {
    kind: assertOneOf(value.kind, "kind", sourceName, ["s212_theory_answer_review_metadata"] as const),
    engineVersion: assertOneOf(value.engineVersion, "engineVersion", sourceName, [S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION] as const),
    conceptSourceVerification: assertOneOf(value.conceptSourceVerification, "conceptSourceVerification", sourceName, ["passed", "failed_closed"] as const),
    referencePackageVerification: assertOneOf(value.referencePackageVerification, "referencePackageVerification", sourceName, ["passed", "failed_closed"] as const),
    theoryQualityDimensionIds,
    dimensionEvidence: validateGateRecord(value.dimensionEvidence, S212_THEORY_DIMENSION_IDS, "dimensionEvidence", sourceName) as Record<
      S212TheoryDimensionId,
      S212TheoryGateStatus
    >,
    authorityClaims: assertOneOf(value.authorityClaims, "authorityClaims", sourceName, ["none"] as const),
    metadataBoundary: assertOneOf(value.metadataBoundary, "metadataBoundary", sourceName, ["metadata_only"] as const),
    learnerInstructorSeparation: assertOneOf(
      value.learnerInstructorSeparation,
      "learnerInstructorSeparation",
      sourceName,
      ["learner_only_no_instructor_route"] as const,
    ),
    scoreLikeSummary: assertOneOf(value.scoreLikeSummary, "scoreLikeSummary", sourceName, ["secondary_non_official_range"] as const),
  };
}

function validatePracticeCompatibility(value: Record<string, unknown>, sourceName: string): S215PracticeReviewCompatibility {
  const practiceDimensionIds = assertStringArray(value.practiceDimensionIds, "practiceDimensionIds", sourceName).map((id) => {
    if (!(S213_PRACTICE_DIMENSION_IDS as readonly string[]).includes(id)) {
      throw new Error(`${sourceName}.practiceDimensionIds contains unsupported S213 dimension ${id}`);
    }
    return id as S213PracticeDimensionId;
  });
  assertIncludesAll(practiceDimensionIds, S213_PRACTICE_DIMENSION_IDS, "practiceDimensionIds", sourceName);
  return {
    kind: assertOneOf(value.kind, "kind", sourceName, ["s213_practice_answer_review_metadata"] as const),
    engineVersion: assertOneOf(value.engineVersion, "engineVersion", sourceName, [S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION] as const),
    referencePackageVerification: assertOneOf(value.referencePackageVerification, "referencePackageVerification", sourceName, ["passed", "failed_closed"] as const),
    calculationUnitSupport: assertOneOf(value.calculationUnitSupport, "calculationUnitSupport", sourceName, ["passed", "failed_closed"] as const),
    calculationReviewMetadata: assertOneOf(value.calculationReviewMetadata, "calculationReviewMetadata", sourceName, ["passed", "failed_closed"] as const),
    practiceDimensionIds,
    dimensionEvidence: validateGateRecord(value.dimensionEvidence, S213_PRACTICE_DIMENSION_IDS, "dimensionEvidence", sourceName) as Record<
      S213PracticeDimensionId,
      S213PracticeGateStatus
    >,
    metadataChecks: validateGateRecord(value.metadataChecks, S213_METADATA_CHECK_KEYS, "metadataChecks", sourceName) as Record<
      S213PracticeMetadataCheckKey,
      S213PracticeGateStatus
    >,
    authorityClaims: assertOneOf(value.authorityClaims, "authorityClaims", sourceName, ["none"] as const),
    metadataBoundary: assertOneOf(value.metadataBoundary, "metadataBoundary", sourceName, ["metadata_only"] as const),
    learnerInstructorSeparation: assertOneOf(
      value.learnerInstructorSeparation,
      "learnerInstructorSeparation",
      sourceName,
      ["learner_only_no_instructor_route"] as const,
    ),
    scoreLikeSummary: assertOneOf(value.scoreLikeSummary, "scoreLikeSummary", sourceName, ["secondary_non_official_range"] as const),
    calculatorModel: assertOneOf(value.calculatorModel, "calculatorModel", sourceName, ["casio_fx_9860giii"] as const),
    resetSafeHandKeyedRoutineOnly: assertTrue(value.resetSafeHandKeyedRoutineOnly, "resetSafeHandKeyedRoutineOnly", sourceName),
    storedProgramDependency: assertFalse(value.storedProgramDependency, "storedProgramDependency", sourceName),
  };
}

function validateSubjectReviewCompatibility(
  value: unknown,
  subject: S214Subject,
  sourceName: string,
): S215SubjectReviewCompatibility {
  assertRecord(value, sourceName);
  if (subject === "law") return validateLawCompatibility(value, sourceName);
  if (subject === "theory") return validateTheoryCompatibility(value, sourceName);
  return validatePracticeCompatibility(value, sourceName);
}

function validateCriticFinding(value: unknown, index: number, subject: S214Subject, sourceName: string): S215CriticFinding {
  const findingName = `${sourceName}.criticFindings[${index}]`;
  assertRecord(value, findingName);
  return {
    findingId: assertId(value.findingId, "findingId", findingName),
    subject: assertOneOf(value.subject, "subject", findingName, SUBJECTS) as S214Subject,
    kind: assertOneOf(value.kind, "kind", findingName, CRITIC_FINDING_KINDS) as S215CriticFindingKind,
    status: assertOneOf(value.status, "status", findingName, CRITIC_FINDING_STATUSES) as S215CriticFindingStatus,
    releaseBlocking: assertBoolean(value.releaseBlocking, "releaseBlocking", findingName),
    candidateSlotIds: assertIdArray(value.candidateSlotIds, "candidateSlotIds", findingName),
    requirementSlotIds: assertIdArray(value.requirementSlotIds, "requirementSlotIds", findingName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", findingName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", findingName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", findingName),
    rawFindingTextStored: assertFalse(value.rawFindingTextStored, "rawFindingTextStored", findingName),
    generatedAnswerProseStored: assertFalse(value.generatedAnswerProseStored, "generatedAnswerProseStored", findingName),
  };
}

function validateConsensusRecord(value: unknown, sourceName: string): S215ConsensusRecord {
  assertRecord(value, sourceName);
  return {
    consensusId: assertId(value.consensusId, "consensusId", sourceName),
    status: assertOneOf(value.status, "status", sourceName, CONSENSUS_STATUSES) as S215ConsensusStatus,
    criticFindingIds: assertIdArray(value.criticFindingIds, "criticFindingIds", sourceName),
    acceptedCandidateSlotIds: assertIdArray(value.acceptedCandidateSlotIds, "acceptedCandidateSlotIds", sourceName),
    coveredRequirementSlotIds: assertIdArray(value.coveredRequirementSlotIds, "coveredRequirementSlotIds", sourceName),
    unresolvedConflictIds: assertIdArray(value.unresolvedConflictIds, "unresolvedConflictIds", sourceName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
    evidenceAnchorIds: assertIdArray(value.evidenceAnchorIds, "evidenceAnchorIds", sourceName),
    rawConsensusTextStored: assertFalse(value.rawConsensusTextStored, "rawConsensusTextStored", sourceName),
    generatedAnswerProseStored: assertFalse(value.generatedAnswerProseStored, "generatedAnswerProseStored", sourceName),
  };
}

export function validateS215ReferenceAnswerReleaseGateInput(
  value: unknown,
  sourceName = "s215ReferenceAnswerReleaseGate",
): S215ReferenceAnswerReleaseGateInput {
  assertNoForbiddenRawFields(value, sourceName);
  assertRecord(value, sourceName);
  const subject = assertOneOf(value.subject, "subject", sourceName, SUBJECTS) as S214Subject;
  if (!Array.isArray(value.criticFindings)) throw new Error(`${sourceName}.criticFindings must be an array`);
  const criticFindings = value.criticFindings.map((entry, index) => validateCriticFinding(entry, index, subject, sourceName));
  if (criticFindings.some((finding) => finding.subject !== subject)) {
    throw new Error(`${sourceName}.criticFindings subject must match gate subject`);
  }
  assertUniqueIds(criticFindings.map((finding) => finding.findingId), `${sourceName}.criticFindings`);
  const input: S215ReferenceAnswerReleaseGateInput = {
    gateId: assertId(value.gateId, "gateId", sourceName),
    version: assertOneOf(value.version, "version", sourceName, [S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION] as const),
    subject,
    questionId: assertId(value.questionId, "questionId", sourceName),
    s214PipelineId: assertId(value.s214PipelineId, "s214PipelineId", sourceName),
    referencePackageId: assertId(value.referencePackageId, "referencePackageId", sourceName),
    subjectReviewCompatibility: validateSubjectReviewCompatibility(value.subjectReviewCompatibility, subject, `${sourceName}.subjectReviewCompatibility`),
    criticFindings,
    consensusRecord: validateConsensusRecord(value.consensusRecord, `${sourceName}.consensusRecord`),
    authorityGuardrail: validateAuthorityGuardrail(value.authorityGuardrail, `${sourceName}.authorityGuardrail`),
  };
  const findingIds = new Set(input.criticFindings.map((finding) => finding.findingId));
  for (const findingId of input.consensusRecord.criticFindingIds) {
    if (!findingIds.has(findingId)) throw new Error(`${sourceName}.consensusRecord.criticFindingIds contains unknown finding ${findingId}`);
  }
  return input;
}

export function validateS215ReferenceAnswerReleaseGateRegistry(
  value: unknown,
  sourceName = "s215ReferenceAnswerReleaseGateRegistry",
): S215ReferenceAnswerReleaseGateRegistry {
  assertNoForbiddenRawFields(value, sourceName);
  assertRecord(value, sourceName);
  if (!Array.isArray(value.gates)) throw new Error(`${sourceName}.gates must be an array`);
  const gates = value.gates.map((entry, index) => validateS215ReferenceAnswerReleaseGateInput(entry, `${sourceName}.gates[${index}]`));
  assertUniqueIds(gates.map((entry) => entry.gateId), `${sourceName}.gates`);
  return {
    schemaVersion: assertOneOf(value.schemaVersion, "schemaVersion", sourceName, [S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION] as const),
    registryType: assertOneOf(
      value.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_s215_reference_answer_release_gate_registry"] as const,
    ),
    generatedBy: assertString(value.generatedBy, "generatedBy", sourceName),
    generatedAt: assertString(value.generatedAt, "generatedAt", sourceName),
    s214PipelineRegistryPath: assertString(value.s214PipelineRegistryPath, "s214PipelineRegistryPath", sourceName, 300),
    storagePolicy: validateStoragePolicy(value.storagePolicy, `${sourceName}.storagePolicy`),
    boundaryPolicy: validateBoundaryPolicy(value.boundaryPolicy, `${sourceName}.boundaryPolicy`),
    gates,
  };
}

function blocker(
  code: S215ReleaseBlockerCode,
  index: number,
  details: Partial<Omit<S215ReleaseBlocker, "blockerId" | "code" | "severity">> = {},
): S215ReleaseBlocker {
  return {
    blockerId: `s215_${code}_${index}`,
    code,
    severity: "blocking",
    sourceAnchorIds: details.sourceAnchorIds ?? [],
    evidenceAnchorIds: details.evidenceAnchorIds ?? [],
    candidateSlotIds: details.candidateSlotIds ?? [],
    requirementSlotIds: details.requirementSlotIds ?? [],
    preservedConflictIds: details.preservedConflictIds ?? [],
  };
}

function addBlocker(
  blockers: S215ReleaseBlocker[],
  code: S215ReleaseBlockerCode,
  condition: boolean,
  details: Partial<Omit<S215ReleaseBlocker, "blockerId" | "code" | "severity">> = {},
): void {
  if (condition) blockers.push(blocker(code, blockers.length + 1, details));
}

function collectS214AnchorIds(pipeline: S214ReferenceAnswerPipelineInput) {
  const baseSourceAnchorIds = new Set<string>([
    ...pipeline.sourcePack.sourceAnchorIds,
    ...pipeline.sourcePack.requirementDecomposition.sourceAnchorIds,
    ...pipeline.sourcePack.requirementDecomposition.requirementSlots.flatMap((slot) => slot.sourceAnchorIds),
  ]);
  const baseEvidenceAnchorIds = new Set<string>([
    ...pipeline.sourcePack.evidenceAnchorIds,
    ...pipeline.sourcePack.requirementDecomposition.evidenceAnchorIds,
    ...pipeline.sourcePack.requirementDecomposition.requirementSlots.flatMap((slot) => slot.evidenceAnchorIds),
  ]);
  const subjectGate = pipeline.releasePrerequisites.subjectGate;
  if (subjectGate.kind === "s208_law_grounding" || subjectGate.kind === "s210_practice_validation") {
    subjectGate.sourceAnchorIds.forEach((id) => baseSourceAnchorIds.add(id));
  } else {
    subjectGate.conceptAnchorIds.forEach((id) => baseSourceAnchorIds.add(id));
  }

  const fabricatedCandidateSourceAnchorIds = unique(pipeline.candidateSlots.flatMap((slot) => [
    ...slot.sourceAnchorIds,
    ...slot.candidateEvidence.sourceAnchorIds,
  ]).filter((id) => !baseSourceAnchorIds.has(id)));
  const fabricatedCandidateEvidenceAnchorIds = unique(pipeline.candidateSlots.flatMap((slot) => [
    ...slot.evidenceAnchorIds,
    ...slot.candidateEvidence.evidenceAnchorIds,
  ]).filter((id) => !baseEvidenceAnchorIds.has(id)));

  const allowedSourceAnchorIds = new Set(baseSourceAnchorIds);
  const allowedEvidenceAnchorIds = new Set(baseEvidenceAnchorIds);
  pipeline.candidateSlots.forEach((slot) => {
    slot.sourceAnchorIds.forEach((id) => allowedSourceAnchorIds.add(id));
    slot.candidateEvidence.sourceAnchorIds.forEach((id) => allowedSourceAnchorIds.add(id));
    slot.evidenceAnchorIds.forEach((id) => allowedEvidenceAnchorIds.add(id));
    slot.candidateEvidence.evidenceAnchorIds.forEach((id) => allowedEvidenceAnchorIds.add(id));
  });

  return {
    allowedSourceAnchorIds,
    allowedEvidenceAnchorIds,
    fabricatedCandidateSourceAnchorIds,
    fabricatedCandidateEvidenceAnchorIds,
  };
}

function allReferencedSourceAnchorIds(input: S215ReferenceAnswerReleaseGateInput): string[] {
  return unique([
    ...input.criticFindings.flatMap((finding) => finding.sourceAnchorIds),
    ...input.consensusRecord.sourceAnchorIds,
  ]);
}

function allReferencedEvidenceAnchorIds(input: S215ReferenceAnswerReleaseGateInput): string[] {
  return unique([
    ...input.criticFindings.flatMap((finding) => finding.evidenceAnchorIds),
    ...input.consensusRecord.evidenceAnchorIds,
  ]);
}

function subjectReviewBlockerCode(input: S215ReferenceAnswerReleaseGateInput): S215ReleaseBlockerCode | null {
  const compatibility = input.subjectReviewCompatibility;
  if (compatibility.kind === "s211_law_answer_review_metadata") {
    return compatibility.lawSourceGateStatus === "ready" && compatibility.referencePackageGateStatus === "ready"
      ? null
      : "legal_source_blocker";
  }
  if (compatibility.kind === "s212_theory_answer_review_metadata") {
    const dimensionBlocked = Object.values(compatibility.dimensionEvidence).some((status) => status !== "passed");
    return compatibility.conceptSourceVerification === "passed"
      && compatibility.referencePackageVerification === "passed"
      && !dimensionBlocked
      ? null
      : "theory_concept_blocker";
  }
  const dimensionBlocked = Object.values(compatibility.dimensionEvidence).some((status) => status !== "passed");
  const metadataBlocked = Object.values(compatibility.metadataChecks).some((status) => status !== "passed");
  return compatibility.referencePackageVerification === "passed"
    && compatibility.calculationUnitSupport === "passed"
    && compatibility.calculationReviewMetadata === "passed"
    && !dimensionBlocked
    && !metadataBlocked
    ? null
    : "calculation_blocker";
}

function s214PrerequisiteBlockers(pipeline: S214ReferenceAnswerPipelineInput): S215ReleaseBlockerCode[] {
  const codes: S215ReleaseBlockerCode[] = [];
  const s207 = pipeline.releasePrerequisites.s207Package;
  if (s207.status !== "passed" || !s207.s215ReleaseGateInputAllowed || s207.blockerIds.length > 0) {
    codes.push("source_pack_blocker");
  }
  const subjectGate = pipeline.releasePrerequisites.subjectGate;
  if (subjectGate.kind === "s208_law_grounding") {
    if (
      subjectGate.status !== "passed"
      || !subjectGate.s215ReleaseGateAllowed
      || subjectGate.blockerIds.length > 0
      || !["verified", "synthetic_fixture"].includes(subjectGate.legalSourceStatus)
      || !["applicable_to_exam_date", "synthetic_fixture"].includes(subjectGate.examDateVersionStatus)
    ) {
      codes.push("legal_source_blocker");
    }
  } else if (subjectGate.kind === "s209_theory_grounding") {
    if (
      subjectGate.status !== "passed"
      || !subjectGate.s215ReleaseGateAllowed
      || subjectGate.blockerIds.length > 0
      || !["verified", "synthetic_fixture"].includes(subjectGate.conceptStatus)
      || !["verified", "synthetic_fixture"].includes(subjectGate.definitionStatus)
      || !["verified", "synthetic_fixture"].includes(subjectGate.sourceCoverageStatus)
    ) {
      codes.push("theory_concept_blocker");
    }
  } else if (
    subjectGate.status !== "passed"
    || subjectGate.unitStatus !== "metadata_ready"
    || subjectGate.unitCheckStatus !== "metadata_ready"
    || subjectGate.roundingCheckStatus !== "metadata_ready"
    || subjectGate.independentRecalculationStatus !== "metadata_ready"
    || subjectGate.runtimeEvidenceStatus !== "human_reviewed_passed"
    || !subjectGate.referenceAnswerReleaseAllowed
    || subjectGate.blockerIds.length > 0
  ) {
    codes.push("calculation_blocker");
  }
  return unique(codes);
}

function criticBlockerCode(kind: S215CriticFindingKind): S215ReleaseBlockerCode {
  if (kind === "rubric_answer_consistency") return "rubric_answer_consistency_blocker";
  if (kind === "legal_source_version") return "legal_source_blocker";
  if (kind === "theory_concept_grounding") return "theory_concept_blocker";
  if (kind === "calculation_consistency") return "calculation_blocker";
  if (kind === "source_anchor_integrity") return "source_anchor_fabricated";
  if (kind === "data_boundary") return "metadata_boundary_violation";
  if (kind === "official_claim_guardrail") return "prohibited_authority_claim";
  return "critic_finding_blocked";
}

export function buildS215ReferenceAnswerReleaseGate(
  rawInput: S215ReferenceAnswerReleaseGateInput,
  rawS214Pipeline: S214ReferenceAnswerPipelineInput,
): S215ReferenceAnswerReleaseGateResult {
  const input = validateS215ReferenceAnswerReleaseGateInput(rawInput);
  const pipeline = validateS214ReferenceAnswerPipelineInput(rawS214Pipeline, "s215S214PipelineInput");
  if (input.s214PipelineId !== pipeline.pipelineId) throw new Error("s215-s214-pipeline-id-mismatch");
  if (input.subject !== pipeline.subject) throw new Error("s215-s214-subject-mismatch");
  if (input.questionId !== pipeline.questionId) throw new Error("s215-s214-question-id-mismatch");
  if (input.referencePackageId !== pipeline.sourcePack.referencePackageId) throw new Error("s215-s214-reference-package-id-mismatch");

  const s214Result = buildS214ReferenceAnswerPipeline(pipeline);
  const blockers: S215ReleaseBlocker[] = [];

  addBlocker(blockers, "s214_pipeline_not_ready", s214Result.status !== "ready_for_s215_consensus", {
    sourceAnchorIds: pipeline.sourcePack.sourceAnchorIds,
    evidenceAnchorIds: pipeline.sourcePack.evidenceAnchorIds,
  });
  addBlocker(blockers, "source_pack_blocker", pipeline.sourcePack.status !== "ready", {
    sourceAnchorIds: pipeline.sourcePack.sourceAnchorIds,
    evidenceAnchorIds: pipeline.sourcePack.evidenceAnchorIds,
  });
  for (const code of s214PrerequisiteBlockers(pipeline)) {
    addBlocker(blockers, code, true, {
      sourceAnchorIds: pipeline.sourcePack.sourceAnchorIds,
      evidenceAnchorIds: pipeline.sourcePack.evidenceAnchorIds,
    });
  }

  const anchorIds = collectS214AnchorIds(pipeline);
  const fabricatedSourceAnchorIds = unique([
    ...anchorIds.fabricatedCandidateSourceAnchorIds,
    ...allReferencedSourceAnchorIds(input).filter((id) => !anchorIds.allowedSourceAnchorIds.has(id)),
  ]);
  const fabricatedEvidenceAnchorIds = unique([
    ...anchorIds.fabricatedCandidateEvidenceAnchorIds,
    ...allReferencedEvidenceAnchorIds(input).filter((id) => !anchorIds.allowedEvidenceAnchorIds.has(id)),
  ]);
  addBlocker(blockers, "source_anchor_fabricated", fabricatedSourceAnchorIds.length > 0, {
    sourceAnchorIds: fabricatedSourceAnchorIds,
  });
  addBlocker(blockers, "evidence_anchor_fabricated", fabricatedEvidenceAnchorIds.length > 0, {
    evidenceAnchorIds: fabricatedEvidenceAnchorIds,
  });

  const candidateSlotIds = new Set(pipeline.candidateSlots.map((slot) => slot.candidateSlotId));
  const requirementSlotIds = new Set(pipeline.sourcePack.requirementDecomposition.requirementSlots.map((slot) => slot.requirementId));
  const unknownCandidateIds = unique([
    ...input.criticFindings.flatMap((finding) => finding.candidateSlotIds),
    ...input.consensusRecord.acceptedCandidateSlotIds,
  ].filter((id) => !candidateSlotIds.has(id)));
  addBlocker(blockers, "candidate_metadata_blocker", unknownCandidateIds.length > 0 || input.consensusRecord.acceptedCandidateSlotIds.length < 3, {
    candidateSlotIds: unknownCandidateIds,
  });

  const passedRequirementCoverageIds = new Set(
    input.criticFindings
      .filter((finding) => finding.kind === "requirement_coverage" && finding.status === "passed")
      .flatMap((finding) => finding.requirementSlotIds),
  );
  const missingRequirementIds = [...requirementSlotIds].filter((id) => (
    !input.consensusRecord.coveredRequirementSlotIds.includes(id) || !passedRequirementCoverageIds.has(id)
  ));
  const unknownRequirementIds = unique([
    ...input.criticFindings.flatMap((finding) => finding.requirementSlotIds),
    ...input.consensusRecord.coveredRequirementSlotIds,
  ].filter((id) => !requirementSlotIds.has(id)));
  addBlocker(blockers, "requirement_coverage_missing", missingRequirementIds.length > 0 || unknownRequirementIds.length > 0, {
    requirementSlotIds: unique([...missingRequirementIds, ...unknownRequirementIds]),
  });

  const requiredFindingKinds = REQUIRED_CRITIC_FINDING_KINDS[input.subject];
  const suppliedFindingKinds = unique(input.criticFindings.map((finding) => finding.kind));
  const missingRequiredFindingKinds = requiredFindingKinds.filter((kind) => (
    !input.criticFindings.some((finding) => finding.kind === kind && finding.status === "passed")
  ));
  addBlocker(blockers, "critic_finding_missing", missingRequiredFindingKinds.length > 0);

  for (const finding of input.criticFindings) {
    if (finding.releaseBlocking && finding.status !== "passed") {
      addBlocker(blockers, criticBlockerCode(finding.kind), true, {
        sourceAnchorIds: finding.sourceAnchorIds,
        evidenceAnchorIds: finding.evidenceAnchorIds,
        candidateSlotIds: finding.candidateSlotIds,
        requirementSlotIds: finding.requirementSlotIds,
      });
    }
  }

  const subjectReviewCode = subjectReviewBlockerCode(input);
  addBlocker(blockers, subjectReviewCode ?? "subject_review_contract_not_ready", subjectReviewCode !== null);

  addBlocker(blockers, "consensus_missing", input.consensusRecord.status === "missing" || input.consensusRecord.criticFindingIds.length === 0);
  addBlocker(blockers, "consensus_missing", input.consensusRecord.status === "blocked");
  const unresolvedConflictIds = unique([
    ...pipeline.unresolvedConflictState.conflictIds,
    ...input.consensusRecord.unresolvedConflictIds,
  ]);
  addBlocker(
    blockers,
    "unresolved_consensus_conflict",
    pipeline.unresolvedConflictState.unresolvedConflictCount > 0
      || input.consensusRecord.status === "unresolved_conflict"
      || input.consensusRecord.unresolvedConflictIds.length > 0,
    { preservedConflictIds: unresolvedConflictIds },
  );

  if (input.authorityGuardrail.requiredCaveatKey !== "learning_reference_not_official_answer") {
    addBlocker(blockers, "official_caveat_missing", true);
  }

  const blockerCodes = unique(blockers.map((entry) => entry.code));
  const status: S215ReleaseGateStatus = blockerCodes.length === 0 ? "released" : "blocked";

  return {
    gateId: input.gateId,
    version: S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
    subject: input.subject,
    questionId: input.questionId,
    s214PipelineId: input.s214PipelineId,
    referencePackageId: input.referencePackageId,
    status,
    blockerCodes,
    blockers,
    s214Handoff: {
      version: S214_REFERENCE_ANSWER_PIPELINE_VERSION,
      status: s214Result.status,
      blockedReasonCodes: s214Result.blockedReasonCodes,
      s215ReleaseGateInputAllowed: s214Result.releaseGate.s215ReleaseGateInputAllowed,
    },
    criticReport: {
      requiredFindingKinds,
      suppliedFindingKinds,
      criticFindingCount: input.criticFindings.length,
      passedFindingCount: input.criticFindings.filter((finding) => finding.status === "passed").length,
      releaseBlockingFindingCount: input.criticFindings.filter((finding) => finding.releaseBlocking && finding.status !== "passed").length,
      missingRequiredFindingKinds,
    },
    consensus: {
      status: input.consensusRecord.status,
      unresolvedConflictIds,
      s214ConflictIds: pipeline.unresolvedConflictState.conflictIds,
      preservedUnresolvedConflictState: true,
      rawConflictTextStored: false,
    },
    sourceAnchorIntegrity: {
      status: fabricatedSourceAnchorIds.length === 0 && fabricatedEvidenceAnchorIds.length === 0 ? "passed" : "failed_closed",
      fabricatedSourceAnchorIds,
      fabricatedEvidenceAnchorIds,
    },
    releaseDecision: {
      status,
      learningReferenceStatus: status === "released" ? "released_learning_reference" : "blocked",
      releaseGateStatus: status,
      referenceAnswerReleaseAllowed: status === "released",
      learnerFacingLearningReferenceAllowed: status === "released",
      requiredCaveatKey: "learning_reference_not_official_answer",
      learningReferenceOnly: true,
      officialClaimAllowed: false,
      officialGradingClaimAllowed: false,
      officialModelAnswerClaimAllowed: false,
      confirmedScoreClaimAllowed: false,
      scorePredictionAllowed: false,
      passProbabilityAllowed: false,
      passGuaranteeAllowed: false,
    },
    subjectReviewCompatibility: input.subjectReviewCompatibility,
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
      formulaExpressionStored: false,
      extractedValuesStored: false,
      calculationTraceStored: false,
    },
  };
}

export function buildS215ReferenceAnswerReleaseGateRegistryReport(
  registry: S215ReferenceAnswerReleaseGateRegistry,
  s214Pipelines: readonly S214ReferenceAnswerPipelineInput[],
): S215ReferenceAnswerReleaseGateRegistryReport {
  const pipelinesById = new Map(s214Pipelines.map((pipeline) => [pipeline.pipelineId, pipeline]));
  const results = registry.gates.map((gate) => {
    const pipeline = pipelinesById.get(gate.s214PipelineId);
    if (!pipeline) throw new Error(`S215 gate ${gate.gateId} points to missing S214 pipeline ${gate.s214PipelineId}`);
    return buildS215ReferenceAnswerReleaseGate(gate, pipeline);
  });
  const subjectCounts: Record<S214Subject, number> = { law: 0, theory: 0, practice: 0 };
  for (const result of results) {
    subjectCounts[result.subject] += 1;
  }

  return {
    schemaVersion: S215_REFERENCE_ANSWER_RELEASE_GATE_VERSION,
    reportType: "appraiser_second_round_s215_reference_answer_release_gate_report",
    generatedBy: registry.generatedBy,
    generatedAt: registry.generatedAt,
    totals: {
      gateCount: results.length,
      releasedCount: results.filter((result) => result.status === "released").length,
      blockedCount: results.filter((result) => result.status === "blocked").length,
      blockerCount: results.reduce((sum, result) => sum + result.blockers.length, 0),
      unresolvedConflictCount: results.reduce((sum, result) => sum + result.consensus.unresolvedConflictIds.length, 0),
      subjectCounts,
    },
    metadataOnly: true,
    safeUse: "s215_critic_consensus_release_gate_metadata_only",
  };
}
