import {
  FIRST_STAGE_SUBJECT_IDS,
  type FirstStageSubjectId,
} from "../review-os/first-stage/kernel/domain";

export const QUESTION_FOUNDRY_CONTRACT_VERSION =
  "dabangil.question_foundry.v1" as const;
export const QUESTION_BLUEPRINT_VERSION = "QuestionBlueprintV1" as const;
export const ANSWER_SPECIFICATION_VERSION = "AnswerSpecificationV1" as const;
export const AUDIT_RUN_VERSION = "AuditRunV1" as const;
export const QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST =
  "f7e134498ad65b9ae2bc10c4570949cae7ca71d2038aa493f6485247b5dfc00a" as const;

export const QUESTION_FOUNDRY_SOURCE_CLASSES = [
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const;
export type QuestionFoundrySourceClass =
  (typeof QUESTION_FOUNDRY_SOURCE_CLASSES)[number];

export const QUESTION_FOUNDRY_SHARED_ELIGIBLE_SOURCE_CLASSES = [
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
] as const satisfies readonly QuestionFoundrySourceClass[];

export const QUESTION_FOUNDRY_HARD_DENIED_SOURCE_CLASSES = [
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const satisfies readonly QuestionFoundrySourceClass[];

export const QUESTION_FOUNDRY_RELEASE_TIERS = [
  "QUARANTINED",
  "PERSONAL_LEARNING_USABLE",
  "TRANSFER_VERIFIED",
  "MEASUREMENT_CALIBRATED",
  "DISPUTED",
  "RETIRED",
] as const;
export type QuestionFoundryReleaseTier =
  (typeof QUESTION_FOUNDRY_RELEASE_TIERS)[number];

export const QUESTION_FOUNDRY_RELEASABLE_TIERS = [
  "PERSONAL_LEARNING_USABLE",
  "TRANSFER_VERIFIED",
  "MEASUREMENT_CALIBRATED",
] as const satisfies readonly QuestionFoundryReleaseTier[];
export type QuestionFoundryReleasableTier =
  (typeof QUESTION_FOUNDRY_RELEASABLE_TIERS)[number];

export const QUESTION_FOUNDRY_SUBJECTS = FIRST_STAGE_SUBJECT_IDS;
export type QuestionFoundrySubject = FirstStageSubjectId;

export const QUESTION_FOUNDRY_RIGHTS_PURPOSES = [
  "QUESTION_BLUEPRINT_EXTRACTION",
  "QUESTION_GENERATION_CONTEXT",
  "PERSONAL_LEARNING_BANK",
  "TRANSFER_BANK",
  "MEASUREMENT_BANK",
] as const;
export type QuestionFoundryRightsPurpose =
  (typeof QUESTION_FOUNDRY_RIGHTS_PURPOSES)[number];

export type QuestionFoundryRightsManifestV1 = Readonly<{
  manifestId: string;
  manifestVersionId: string;
  sourceClass: QuestionFoundrySourceClass;
  rightsHolder: string;
  permittedPurposes: readonly QuestionFoundryRightsPurpose[];
  territory: readonly string[];
  validFrom: string;
  validUntil: string;
  status: "ACTIVE" | "REVOKED" | "DISPUTED" | "EXPIRED" | "BLOCKED";
  provenance: readonly string[];
}>;

export type SourceEligibilityDecisionV1 = Readonly<{
  decisionId: string;
  sourceId: string;
  sourceVersionId: string;
  sourceClass: QuestionFoundrySourceClass;
  purpose: QuestionFoundryRightsPurpose;
  decision: "CONDITIONALLY_ELIGIBLE" | "DENY_ALL_SHARED_ROUTES";
  denialCodes: readonly string[];
  decidedAt: string;
  policyVersion: string;
  decisionBasisChecksum: string;
  rightsManifestId: string | null;
  rightsManifestVersionId: string | null;
  rightsEvaluatedAt: string | null;
}>;

export type SourceDecisionBindingV1 = Readonly<{
  purpose: QuestionFoundryRightsPurpose;
  decisionId: string;
  decisionBasisChecksum: string;
}>;

export type SourceVersionBindingV1 = Readonly<{
  sourceId: string;
  sourceVersionId: string;
  sourceClass: QuestionFoundrySourceClass;
  effectiveFrom: string;
  effectiveUntil: string;
  status: "CURRENT" | "SUPERSEDED" | "DISPUTED" | "BLOCKED";
  rightsManifestId: string;
  rightsManifestVersionId: string;
  contentDigest: string;
  sourceDecisionBindings: readonly SourceDecisionBindingV1[];
}>;

export type TrustedSourceRegistryV1 = Readonly<{
  registryVersion: "question_foundry.trusted_source_registry.v1";
  source: "LOCAL_RIGHTS_AUTHORITY_EXPORT";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  asOf: string;
  verifiedAt: string;
  remoteReadPerformed: false;
  territory: "KR";
  rightsManifestsDigest: string;
  sourceVersionsDigest: string;
  eligibilityDecisionsDigest: string;
  rightsManifests: readonly QuestionFoundryRightsManifestV1[];
  sourceVersions: readonly SourceVersionBindingV1[];
  eligibilityDecisions: readonly SourceEligibilityDecisionV1[];
}>;

export type TrustedSourceRegistryExportBindingV1 = Readonly<{
  bindingVersion: "question_foundry.trusted_source_registry_export_binding.v1";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  registryDigest: string;
  validatorId: "trusted_source_registry_export_validator";
  authorityKeyId: "question-foundry-rights-authority-2026-08-27";
  signatureAlgorithm: "Ed25519";
  detachedSignature: string;
  actualRightsAuthorityRead: true;
  syntheticOrSimulated: false;
  verified: true;
}>;

export type QuestionFoundryModelIdentityV1 = Readonly<{
  providerId: string;
  modelFamilyId: string;
  modelVersionId: string;
  modelArtifactDigest: string;
}>;

export type TrustedModelCatalogEntryV1 = Readonly<{
  registryModelId: string;
  modelIdentity: QuestionFoundryModelIdentityV1;
  status: "ACTIVE" | "REVOKED" | "BLOCKED";
  validFrom: string;
  validUntil: string;
  provenanceDigest: string;
}>;

export type ModelExecutionReceiptV1 = Readonly<{
  executionId: string;
  registryModelId: string;
  actorId: string;
  actorVersion: string;
  role:
    | "GENERATOR"
    | "BLIND_SOLVER"
    | "JUDGE"
    | "META_EVALUATOR"
    | "TRANSFER_EVALUATOR"
    | "DRIFT_BASELINE"
    | "DRIFT_CURRENT";
  inputDigest: string;
  outputDigest: string;
  completedAt: string;
  offline: true;
  providerCalls: 0;
  selfAsserted: false;
}>;

export type TrustedModelExecutionRegistryV1 = Readonly<{
  registryVersion: "question_foundry.trusted_model_execution_registry.v1";
  source: "LOCAL_OWNER_VERIFIED_MODEL_EXECUTION_EXPORT";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  verifiedAt: string;
  remoteReadPerformed: false;
  modelsDigest: string;
  receiptsDigest: string;
  models: readonly TrustedModelCatalogEntryV1[];
  receipts: readonly ModelExecutionReceiptV1[];
}>;

export type CalculationSpecificationV1 = Readonly<{
  operation: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";
  operands: readonly [string, string];
  result: string;
  unit: string;
  rounding: Readonly<{
    mode: "NONE" | "HALF_UP";
    scale: number;
  }>;
  tolerance: 0;
}>;

export type QuestionBlueprintV1 = Readonly<{
  schemaVersion: typeof QUESTION_BLUEPRINT_VERSION;
  blueprintId: string;
  blueprintVersionId: string;
  subject: QuestionFoundrySubject;
  subjectAdapterInterfaceDigest: typeof QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST;
  skillId: string;
  difficultyBand: "FOUNDATION" | "STANDARD" | "ADVANCED";
  itemFamily: string;
  learningObjective: string;
  requiredConceptIds: readonly string[];
  prohibitedCluePatterns: readonly string[];
  sourceBindings: readonly SourceVersionBindingV1[];
  calculation: CalculationSpecificationV1 | null;
  rightsBoundary: Readonly<{
    protectedExpressionIncluded: false;
    privateUploadUsed: false;
    academyOrTextbookUsed: false;
    rawSourceBodyStored: false;
    sharedBlueprintAllowed: true;
    modelTrainingAllowed: false;
  }>;
  createdAt: string;
}>;

export type AnswerSpecificationV1 = Readonly<{
  schemaVersion: typeof ANSWER_SPECIFICATION_VERSION;
  answerSpecificationId: string;
  blueprintId: string;
  blueprintVersionId: string;
  solutionFirst: true;
  expectedAnswer: string;
  requiredReasonCodes: readonly string[];
  forbiddenAnswerPatterns: readonly string[];
  calculation: CalculationSpecificationV1 | null;
  sourceBindings: readonly SourceVersionBindingV1[];
  createdAt: string;
}>;

export type QuestionOptionV1 = Readonly<{
  optionId: string;
  body: string;
}>;

export type QuestionCandidateV1 = Readonly<{
  candidateId: string;
  blueprintId: string;
  blueprintVersionId: string;
  answerSpecificationId: string;
  generatorId: string;
  generatorVersion: string;
  generatorModelIdentity: QuestionFoundryModelIdentityV1;
  generatorExecutionId: string;
  generationRunId: string;
  generatedAt: string;
  solutionCommittedAt: string;
  stem: string;
  options: readonly QuestionOptionV1[];
  proposedCorrectOptionId: string;
  explanation: string;
  sourceBindingDigest: string;
  rightsBoundary: QuestionBlueprintV1["rightsBoundary"];
  initialState: "QUARANTINED";
}>;

export type CandidateBatchV1 = Readonly<{
  batchId: string;
  blueprint: QuestionBlueprintV1;
  answerSpecification: AnswerSpecificationV1;
  candidates: readonly QuestionCandidateV1[];
  candidateOrderPermutations: readonly Readonly<{
    permutationId: string;
    candidateIds: readonly string[];
  }>[];
  optionOrderPermutations: readonly Readonly<{
    permutationId: string;
    candidateId: string;
    optionIds: readonly string[];
  }>[];
  offline: true;
  providerCalls: 0;
}>;

export type BlindSolverReviewV1 = Readonly<{
  reviewId: string;
  solverId: string;
  solverVersion: string;
  solverModelIdentity: QuestionFoundryModelIdentityV1;
  solverExecutionId: string;
  candidateId: string;
  optionPermutationId: string;
  blind: true;
  candidateAnswerExposed: false;
  candidateExplanationExposed: false;
  selectedOptionId: string;
  reasoningDigest: string;
  ambiguityDetected: boolean;
  plausibleCorrectOptionIds: readonly string[];
  completedAt: string;
}>;

export type JudgeReviewV1 = Readonly<{
  reviewId: string;
  judgeId: string;
  judgeVersion: string;
  judgeModelIdentity: QuestionFoundryModelIdentityV1;
  judgeExecutionId: string;
  candidateId: string;
  anonymizedCandidate: true;
  approved: boolean;
  singleCorrectAnswer: boolean;
  ambiguityDetected: boolean;
  sourceVersionValid: boolean;
  deterministicCalculationValid: boolean;
  distractorsPlausibleAndIncorrect: boolean;
  answerClueDetected: boolean;
  nearCopyDetected: boolean;
  reconstructionRiskDetected: boolean;
  unresolvedReasonCodes: readonly string[];
  completedAt: string;
}>;

export type SimilarityReferenceV1 = Readonly<{
  referenceId: string;
  sourceId: string;
  sourceVersionId: string;
  sourceClass: QuestionFoundrySourceClass;
  rightsManifestId: string;
  rightsManifestVersionId: string;
  contentDigest: string;
  body: string;
}>;

export type SimilarityFirewallReviewV1 = Readonly<{
  candidateId: string;
  corpusDigest: string;
  referenceCount: number;
  maximumTokenJaccard: number;
  threshold: number;
  nearCopyDetected: boolean;
  reconstructionRiskDetected: boolean;
  protectedExplanationSequenceDetected: boolean;
}>;

export type SelfPreferenceAuditV1 = Readonly<{
  auditKind: "SELF_PREFERENCE";
  anonymized: true;
  runs: readonly Readonly<{
    runId: string;
    evaluatorId: string;
    evaluatorVersion: string;
    evaluatorModelIdentity: QuestionFoundryModelIdentityV1;
    evaluatorExecutionId: string;
    anonymizedCandidateDigest: string;
    selectedCandidateId: string;
    completedAt: string;
  }>[];
  candidateIds: readonly string[];
  evaluatorIds: readonly string[];
  generatorEvaluatorOverlap: readonly string[];
  selectedCandidateId: string;
  pass: boolean;
}>;

export type OrderBiasAuditV1 = Readonly<{
  auditKind: "ORDER_BIAS";
  runs: readonly Readonly<{
    runId: string;
    permutationId: string;
    evaluatorId: string;
    evaluatorVersion: string;
    evaluatorModelIdentity: QuestionFoundryModelIdentityV1;
    evaluatorExecutionId: string;
    orderedCandidateDigest: string;
    selectedCandidateId: string;
    completedAt: string;
  }>[];
  permutationIds: readonly string[];
  selectedCandidateIds: readonly string[];
  stableAcrossOrders: boolean;
  pass: boolean;
}>;

export type RepeatedStabilityAuditV1 = Readonly<{
  auditKind: "REPEATED_STABILITY";
  fixtureDigest: string;
  runs: readonly Readonly<{
    runId: string;
    evaluatorId: string;
    evaluatorVersion: string;
    evaluatorModelIdentity: QuestionFoundryModelIdentityV1;
    evaluatorExecutionId: string;
    fixtureDigest: string;
    selectedCandidateId: string;
    selectedOptionId: string;
    releaseDecision: QuestionFoundryReleaseTier;
    completedAt: string;
  }>[];
  runIds: readonly string[];
  selectedCandidateIds: readonly string[];
  selectedOptionIds: readonly string[];
  releaseDecisions: readonly QuestionFoundryReleaseTier[];
  pass: boolean;
}>;

export type JudgeDriftAuditV1 = Readonly<{
  auditKind: "JUDGE_DRIFT";
  fixtures: readonly Readonly<{
    fixtureId: string;
    inputDigest: string;
    baseline: Readonly<{
      judgeId: string;
      judgeVersion: string;
      judgeModelIdentity: QuestionFoundryModelIdentityV1;
      judgeExecutionId: string;
      approved: boolean;
      completedAt: string;
    }>;
    current: Readonly<{
      judgeId: string;
      judgeVersion: string;
      judgeModelIdentity: QuestionFoundryModelIdentityV1;
      judgeExecutionId: string;
      approved: boolean;
      completedAt: string;
    }>;
  }>[];
  baselineJudgeVersion: string;
  currentJudgeVersion: string;
  comparisonFixtureDigest: string;
  disagreementRate: number;
  maximumAllowedDisagreementRate: 0.1;
  pass: boolean;
}>;

export type MetaAuditBundleV1 = Readonly<{
  selfPreference: SelfPreferenceAuditV1;
  orderBias: OrderBiasAuditV1;
  repeatedStability: RepeatedStabilityAuditV1;
  judgeDrift: JudgeDriftAuditV1;
}>;

export type OwnerAdjudicationV1 = Readonly<{
  adjudicationId: string;
  adjudicatorId: string;
  adjudicatorVersion: string;
  adjudicatorRole: "OWNER";
  candidateId: string;
  decision: "APPROVED" | "REJECTED";
  sourceAndRightsReviewed: true;
  ambiguityReviewed: true;
  calculationReviewed: true;
  evidenceDigest: string;
  decidedAt: string;
  source: "OWNER_ADJUDICATION_RECEIPT";
  modelAlone: false;
}>;

export type TrustedOwnerAdjudicationRegistryV1 = Readonly<{
  registryVersion: "question_foundry.trusted_owner_adjudication_registry.v1";
  source: "LOCAL_OWNER_ADJUDICATION_EXPORT";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  verifiedAt: string;
  remoteReadPerformed: false;
  receiptsDigest: string;
  receipts: readonly OwnerAdjudicationV1[];
}>;

export type TransferEvaluationReceiptV1 = Readonly<{
  receiptId: string;
  evaluatorId: string;
  evaluatorVersion: string;
  evaluatorModelIdentity: QuestionFoundryModelIdentityV1;
  evaluatorExecutionId: string;
  candidateId: string;
  transferVariantId: string;
  visibleVariantDigest: string;
  sealedVariantDigest: string;
  sealedAt: string;
  evaluatedAt: string;
  selectedOptionId: string;
  expectedOptionId: string;
  correct: true;
  answerExposureBeforeEvaluation: false;
  inputDigest: string;
  outputDigest: string;
}>;

export type SealedTransferVariantV1 = Readonly<{
  transferVariantId: string;
  sourceCandidateId: string;
  blueprintId: string;
  blueprintVersionId: string;
  answerSpecificationId: string;
  sourceBindingDigest: string;
  rightsBoundary: QuestionBlueprintV1["rightsBoundary"];
  stem: string;
  options: readonly QuestionOptionV1[];
  expectedOptionId: string;
  sealedAt: string;
  answerHiddenDuringEvaluation: true;
  visibleContentDigest: string;
  lineageDigest: string;
  sealedVariantDigest: string;
}>;

export type TrustedSealedTransferVariantRegistryV1 = Readonly<{
  registryVersion: "question_foundry.trusted_sealed_transfer_variant_registry.v1";
  source: "LOCAL_OWNER_SEALED_TRANSFER_VARIANT_EXPORT";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  verifiedAt: string;
  remoteReadPerformed: false;
  variantsDigest: string;
  variants: readonly SealedTransferVariantV1[];
}>;

export type TransferEvidenceBundleV1 = Readonly<{
  bundleId: string;
  candidateId: string;
  sealedBeforeEvaluation: true;
  sealedVariantRegistry: TrustedSealedTransferVariantRegistryV1;
  evaluatorReceipts: readonly TransferEvaluationReceiptV1[];
  completedAt: string;
  evidenceDigest: string;
}>;

export type OwnerResponseEvidenceV1 = Readonly<{
  receiptId: string;
  candidateId: string;
  ownerId: string;
  actualOwnerResponses: true;
  responseIds: readonly string[];
  responseCount: number;
  distinctSessionCount: number;
  firstResponseAt: string;
  lastResponseAt: string;
  responseBodiesStored: false;
  source: "OWNER_RUNTIME_RECEIPT";
}>;

export type TrustedOwnerResponseRegistryV1 = Readonly<{
  registryVersion: "question_foundry.trusted_owner_response_registry.v1";
  source: "LOCAL_OWNER_RUNTIME_EXPORT";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  verifiedAt: string;
  remoteReadPerformed: false;
  receiptsDigest: string;
  receipts: readonly OwnerResponseEvidenceV1[];
}>;

export type TrustedOwnerResponseExportBindingV1 = Readonly<{
  bindingVersion: "question_foundry.trusted_owner_response_export_binding.v1";
  exportId: string;
  exportVersionId: string;
  exportContentDigest: string;
  registryDigest: string;
  validatorId: "trusted_owner_runtime_export_validator";
  actualOwnerRuntimeRead: true;
  syntheticOrSimulated: false;
  verified: true;
}>;

export type ReleaseTrustContextV1 = Readonly<{
  sourceRegistryExportBinding: TrustedSourceRegistryExportBindingV1 | null;
  modelExecutionExportBinding: Readonly<{
    bindingVersion: "question_foundry.trusted_model_execution_export_binding.v1";
    exportId: string;
    exportVersionId: string;
    exportContentDigest: string;
    registryDigest: string;
    validatorId: "trusted_model_execution_export_validator";
    authorityKeyId: "question-foundry-model-execution-authority-2026-08-27";
    signatureAlgorithm: "Ed25519";
    detachedSignature: string;
    actualExecutionLogRead: true;
    syntheticOrSimulated: false;
    verified: true;
  }> | null;
  sealedVariantExportBinding: Readonly<{
    bindingVersion: "question_foundry.trusted_sealed_transfer_variant_export_binding.v1";
    exportId: string;
    exportVersionId: string;
    exportContentDigest: string;
    registryDigest: string;
    validatorId: "trusted_sealed_transfer_variant_export_validator";
    authorityKeyId: "question-foundry-owner-adjudication-authority-2026-08-27";
    signatureAlgorithm: "Ed25519";
    detachedSignature: string;
    actualSealedVariantRegistryRead: true;
    syntheticOrSimulated: false;
    verified: true;
  }> | null;
  ownerAdjudicationExportBinding: Readonly<{
    bindingVersion: "question_foundry.trusted_owner_adjudication_export_binding.v1";
    exportId: string;
    exportVersionId: string;
    exportContentDigest: string;
    registryDigest: string;
    validatorId: "trusted_owner_adjudication_export_validator";
    authorityKeyId: "question-foundry-owner-adjudication-authority-2026-08-27";
    signatureAlgorithm: "Ed25519";
    detachedSignature: string;
    actualOwnerIdentityRead: true;
    syntheticOrSimulated: false;
    verified: true;
  }> | null;
  ownerResponseExportBinding: TrustedOwnerResponseExportBindingV1 | null;
}>;

export type ReleaseEvidenceBundleV1 = Readonly<{
  batch: CandidateBatchV1;
  selectedCandidateId: string;
  trustedSources: TrustedSourceRegistryV1;
  trustedModelExecutions: TrustedModelExecutionRegistryV1;
  blindSolverReviews: readonly BlindSolverReviewV1[];
  judgeReviews: readonly JudgeReviewV1[];
  similarityReferences: readonly SimilarityReferenceV1[];
  similarityReview: SimilarityFirewallReviewV1;
  metaAudits: MetaAuditBundleV1;
  ownerAdjudication: OwnerAdjudicationV1 | null;
  trustedOwnerAdjudicationRegistry: TrustedOwnerAdjudicationRegistryV1 | null;
  transferEvidence: TransferEvidenceBundleV1 | null;
  ownerResponseEvidence: OwnerResponseEvidenceV1 | null;
  trustedOwnerResponseRegistry: TrustedOwnerResponseRegistryV1 | null;
}>;

export type ReleaseDecisionV1 = Readonly<{
  requestedTier: QuestionFoundryReleasableTier;
  allowed: boolean;
  releasedTier: QuestionFoundryReleaseTier;
  candidateId: string;
  blockingCodes: readonly string[];
  maximumAiOnlyTier: "PERSONAL_LEARNING_USABLE";
  learnerMasteryClaimed: false;
  calibrationClaimedWithoutOwnerEvidence: false;
  evidenceDigest: string;
  trustedSourceRegistryExportDigest: string;
  trustedModelExecutionExportDigest: string;
  trustedSealedVariantExportDigest: string | null;
  trustedOwnerAdjudicationExportDigest: string | null;
  trustedOwnerResponseExportDigest: string | null;
}>;

export type AuditActorV1 = Readonly<{
  actorId: string;
  role:
    | "GENERATOR"
    | "BLIND_SOLVER"
    | "JUDGE"
    | "TRANSFER_EVALUATOR"
    | "OWNER"
    | "DETERMINISTIC_VALIDATOR";
  version: string;
}>;

export type AuditStepV1 = Readonly<{
  stepId: string;
  kind:
    | "SOLUTION_COMMITTED"
    | "CANDIDATE_GENERATED"
    | "PERMUTED"
    | "DETERMINISTIC_VALIDATED"
    | "SOURCE_VALIDATED"
    | "SIMILARITY_REVIEWED"
    | "BLIND_SOLVED"
    | "JUDGED"
    | "META_AUDITED"
    | "TRANSFER_VALIDATED"
    | "OWNER_ADJUDICATED"
    | "RELEASE_DECIDED"
    | "QUARANTINED"
    | "DISPUTED"
    | "REVISED"
    | "RETIRED";
  actorId: string;
  occurredAt: string;
  evidenceDigest: string;
  inputDigest: string;
  outputDigest: string;
}>;

export type AuditRunV1 = Readonly<{
  schemaVersion: typeof AUDIT_RUN_VERSION;
  auditRunId: string;
  contractVersion: typeof QUESTION_FOUNDRY_CONTRACT_VERSION;
  inputDigest: string;
  outputDigest: string;
  actors: readonly AuditActorV1[];
  steps: readonly AuditStepV1[];
  startedAt: string;
  completedAt: string;
  offline: true;
  providerCalls: 0;
  remoteMutations: 0;
  productionMutations: 0;
  rawPrivateBodiesStored: false;
  auditDigest: string;
}>;

export type QuestionBankArtifactV1 = Readonly<{
  artifactId: string;
  candidateId: string;
  subject: QuestionFoundrySubject;
  skillId: string;
  difficultyBand: QuestionBlueprintV1["difficultyBand"];
  itemFamily: string;
  releaseTier: QuestionFoundryReleaseTier;
  revision: number;
  parentArtifactId: string | null;
  auditRunId: string;
  createdAt: string;
  updatedAt: string;
}>;

export type QuestionBankReleaseEnvelopeV1 = Readonly<{
  envelopeKind: "RELEASE";
  artifact: QuestionBankArtifactV1;
  bundle: ReleaseEvidenceBundleV1;
  requestedTier: QuestionFoundryReleasableTier;
  decision: ReleaseDecisionV1;
  trustContext: ReleaseTrustContextV1;
  auditRun: AuditRunV1;
}>;

export type QuestionBankLifecycleTransitionV1 = Readonly<{
  lifecycleAction: "DISPUTED" | "REVISED" | "RETIRED";
  artifact: QuestionBankArtifactV1;
  auditRun: AuditRunV1;
  occurredAt: string;
}>;

export type QuestionBankLifecycleEnvelopeV1 = Readonly<{
  envelopeKind: "LIFECYCLE";
  releaseEnvelope: QuestionBankReleaseEnvelopeV1;
  transitions: readonly QuestionBankLifecycleTransitionV1[];
  artifact: QuestionBankArtifactV1;
}>;

export type QuestionBankEnvelopeV1 =
  | QuestionBankReleaseEnvelopeV1
  | QuestionBankLifecycleEnvelopeV1;

export type BankSelectionRequestV1 = Readonly<{
  requestId: string;
  subject: QuestionFoundrySubject;
  skillId: string;
  difficultyBand: QuestionBlueprintV1["difficultyBand"];
  itemFamily: string;
  excludedArtifactIds: readonly string[];
  offlineGenerationOnGapAuthorized: boolean;
  occurredAt: string;
}>;

export type BankScarcityEventV1 = Readonly<{
  eventId: string;
  requestId: string;
  subject: QuestionFoundrySubject;
  skillId: string;
  difficultyBand: QuestionBlueprintV1["difficultyBand"];
  itemFamily: string;
  reasonCode: "NO_ELIGIBLE_BANK_ITEM";
  occurredAt: string;
  metadataOnly: true;
  containsBody: false;
}>;

export type BankFirstSelectionV1 = Readonly<{
  kind: "BANK_ITEM" | "OFFLINE_GENERATION_GAP" | "BLOCKED";
  artifact: QuestionBankArtifactV1 | null;
  scarcityEvent: BankScarcityEventV1 | null;
  generatedBatch: CandidateBatchV1 | null;
  generationCount: number;
  reasonCode: string | null;
}>;

export type QuestionFoundryValidationResult = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;
