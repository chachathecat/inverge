import type {
  ModelExecutionIdentityV1,
  RightsManifestRefV1,
  SourceEligibilityDecisionV1,
} from "./trust-contracts";
import type { OpaqueRegistryRefV1 } from "./scarcity-contracts";

export const QF0I_CONTRACT_VERSION =
  "QF0IQuarantinedQuestionCandidateIntegrationV1" as const;

export const QF0I_CANDIDATE_LIFECYCLES = Object.freeze([
  "QUARANTINED",
] as const);

export const QF0I_LIMITS = Object.freeze({
  contractVersion: QF0I_CONTRACT_VERSION,
  minValidatorProfileRefs: 1,
  maxValidatorProfileRefs: 16,
  maxIndependentExecutions: 16,
  callerOverride: false,
});

export type QF0ICandidateLifecycle =
  (typeof QF0I_CANDIDATE_LIFECYCLES)[number];

export interface QuarantinedQuestionCandidateMaterialV1 {
  readonly contractVersion: "QuarantinedQuestionCandidateV1";
  readonly candidateContentDigest: string;
  readonly blueprintRef: OpaqueRegistryRefV1;
  readonly answerSpecificationRef: OpaqueRegistryRefV1;
  readonly validatorProfileRefs: readonly OpaqueRegistryRefV1[];
  readonly policyRef: OpaqueRegistryRefV1;
  readonly sourceDecision: SourceEligibilityDecisionV1;
  readonly rightsManifestAtUse: RightsManifestRefV1;
  readonly generatorExecution: ModelExecutionIdentityV1;
  readonly independentExecutions: readonly ModelExecutionIdentityV1[];
  readonly createdAt: string;
}

export interface QuarantinedQuestionCandidateV1
  extends QuarantinedQuestionCandidateMaterialV1 {
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly lifecycle: QF0ICandidateLifecycle;
}

const QF0I_PUBLIC_EXPORTS = Object.freeze([
  "QF0I_CONTRACT_VERSION",
  "QF0I_CANDIDATE_LIFECYCLES",
  "QF0I_LIMITS",
  "QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "createQuarantinedQuestionCandidateV1",
  "assertQuarantinedQuestionCandidateV1",
] as const);

export const QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QF0I_CONTRACT_VERSION,
  scope: "INERT_SOURCE_ONLY_QUARANTINED_CANDIDATE_CONSTRUCTION",
  storage: "IN_MEMORY_ONLY",
  runtimeActivation: "OFF",
  providerExecution: "OFF",
  network: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  rawCandidateBodyAbsent: true,
  quarantinedCandidateConstructionOnly: true,
  releasableCandidateAuthorityAbsent: true,
  similarityAuthorityAbsent: true,
  auditAndChronologyAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  publicLifecyclesExactly: QF0I_CANDIDATE_LIFECYCLES,
  publicExportsExactly: QF0I_PUBLIC_EXPORTS,
});
