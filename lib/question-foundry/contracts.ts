export const QUESTION_FOUNDRY_CONTRACT_VERSION =
  "dabangil.question_foundry.v1" as const;
export const QUESTION_BLUEPRINT_VERSION = "QuestionBlueprintV1" as const;
export const ANSWER_SPECIFICATION_VERSION = "AnswerSpecificationV1" as const;
export const AUDIT_RUN_VERSION = "AuditRunV1" as const;

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

export const QUESTION_FOUNDRY_SUBJECTS = [
  "ACCOUNTING",
  "ECONOMICS",
  "CIVIL_LAW",
  "APPRAISAL_RELATED_LAWS",
  "REAL_ESTATE_PRINCIPLES",
] as const;
export type QuestionFoundrySubject =
  (typeof QUESTION_FOUNDRY_SUBJECTS)[number];

export type QuestionFoundryRightsManifestV1 = Readonly<{
  manifestId: string;
  manifestVersionId: string;
  sourceClass: QuestionFoundrySourceClass;
  rightsHolder: string;
  permittedPurposes: readonly (
    | "QUESTION_BLUEPRINT_EXTRACTION"
    | "QUESTION_GENERATION_CONTEXT"
    | "PERSONAL_LEARNING_BANK"
    | "TRANSFER_BANK"
    | "MEASUREMENT_BANK"
  )[];
  territory: readonly string[];
  validFrom: string;
  validUntil: string;
  status: "ACTIVE" | "REVOKED" | "DISPUTED" | "EXPIRED" | "BLOCKED";
  provenance: readonly string[];
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
}>;

export type TrustedSourceRegistryV1 = Readonly<{
  registryVersion: "question_foundry.trusted_source_registry.v1";
  asOf: string;
  territory: "KR";
  rightsManifests: readonly QuestionFoundryRightsManifestV1[];
  sourceVersions: readonly SourceVersionBindingV1[];
}>;

export type CalculationSpecificationV1 = Readonly<{
  operation: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";
  operands: readonly [number, number];
  result: number;
  unit: string;
  rounding: Readonly<{
    mode: "NONE" | "HALF_UP";
    scale: number;
  }>;
  tolerance: number;
}>;

export type QuestionBlueprintV1 = Readonly<{
  schemaVersion: typeof QUESTION_BLUEPRINT_VERSION;
  blueprintId: string;
  blueprintVersionId: string;
  subject: QuestionFoundrySubject;
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
  candidateIds: readonly string[];
  evaluatorIds: readonly string[];
  generatorEvaluatorOverlap: readonly string[];
  selectedCandidateId: string;
  pass: boolean;
}>;

export type OrderBiasAuditV1 = Readonly<{
  auditKind: "ORDER_BIAS";
  permutationIds: readonly string[];
  selectedCandidateIds: readonly string[];
  stableAcrossOrders: boolean;
  pass: boolean;
}>;

export type RepeatedStabilityAuditV1 = Readonly<{
  auditKind: "REPEATED_STABILITY";
  runIds: readonly string[];
  selectedCandidateIds: readonly string[];
  selectedOptionIds: readonly string[];
  releaseDecisions: readonly QuestionFoundryReleaseTier[];
  pass: boolean;
}>;

export type JudgeDriftAuditV1 = Readonly<{
  auditKind: "JUDGE_DRIFT";
  baselineJudgeVersion: string;
  currentJudgeVersion: string;
  comparisonFixtureDigest: string;
  disagreementRate: number;
  maximumAllowedDisagreementRate: number;
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
  adjudicatorRole: "OWNER";
  candidateId: string;
  decision: "APPROVED" | "REJECTED";
  sourceAndRightsReviewed: true;
  ambiguityReviewed: true;
  calculationReviewed: true;
  decidedAt: string;
}>;

export type TransferEvidenceBundleV1 = Readonly<{
  bundleId: string;
  candidateId: string;
  sealedBeforeEvaluation: true;
  independentEvaluatorIds: readonly string[];
  transferVariantIds: readonly string[];
  allOutcomesCorrect: true;
  answerExposureBeforeEvaluation: false;
  completedAt: string;
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
  ownerResponseExportBinding: TrustedOwnerResponseExportBindingV1 | null;
}>;

export type ReleaseEvidenceBundleV1 = Readonly<{
  batch: CandidateBatchV1;
  selectedCandidateId: string;
  trustedSources: TrustedSourceRegistryV1;
  blindSolverReviews: readonly BlindSolverReviewV1[];
  judgeReviews: readonly JudgeReviewV1[];
  similarityReferences: readonly SimilarityReferenceV1[];
  similarityReview: SimilarityFirewallReviewV1;
  metaAudits: MetaAuditBundleV1;
  ownerAdjudication: OwnerAdjudicationV1 | null;
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
  trustedOwnerResponseExportDigest: string | null;
}>;

export type AuditActorV1 = Readonly<{
  actorId: string;
  role: "GENERATOR" | "BLIND_SOLVER" | "JUDGE" | "OWNER" | "DETERMINISTIC_VALIDATOR";
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
    | "RELEASE_DECIDED"
    | "QUARANTINED"
    | "DISPUTED"
    | "REVISED"
    | "RETIRED";
  actorId: string;
  occurredAt: string;
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
  artifact: QuestionBankArtifactV1;
  bundle: ReleaseEvidenceBundleV1;
  requestedTier: QuestionFoundryReleasableTier;
  decision: ReleaseDecisionV1;
  trustContext: ReleaseTrustContextV1;
  auditRun: AuditRunV1;
}>;

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
