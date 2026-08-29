import type { ModelExecutionRoleV1 } from "../quarantine/trust-contracts";

export const QFS2_CONTRACT_VERSION =
  "QFS2CandidateTimeAwareAuditPreludeV1" as const;

export const QFS2_LIMITS = Object.freeze({
  contractVersion: QFS2_CONTRACT_VERSION,
  maxActors: 18,
  maxSteps: 21,
  maxIndependentExecutions: 16,
  callerOverride: false,
});

export type CandidateAuditActorKindV1 =
  | "SYSTEM_COMPONENT"
  | "MODEL_EXECUTION";

export type CandidateAuditStepKindV1 =
  | "SOURCE_DECISION_BOUND"
  | "GENERATION_RIGHTS_REVALIDATED"
  | "GENERATOR_EXECUTION_BOUND"
  | "INDEPENDENT_EXECUTION_IDENTITY_BOUND"
  | "MATERIALIZATION_RIGHTS_REVALIDATED"
  | "CANDIDATE_QUARANTINED";

export interface SystemComponentAuditActorV1 {
  readonly actorRefId: string;
  readonly kind: "SYSTEM_COMPONENT";
  readonly componentId: "QF_S2_CANDIDATE_AUDIT_PRELUDE";
  readonly contractVersion: typeof QFS2_CONTRACT_VERSION;
  readonly implementationOrBoundaryDigest: string;
}

export interface ModelExecutionAuditActorV1 {
  readonly actorRefId: string;
  readonly kind: "MODEL_EXECUTION";
  readonly role: ModelExecutionRoleV1;
  readonly executionId: string;
  readonly identityDigest: string;
  readonly modelArtifactDigest: string;
  readonly executionArtifactDigest: string;
  readonly executedAt: string;
}

export type CandidateAuditActorV1 =
  | SystemComponentAuditActorV1
  | ModelExecutionAuditActorV1;

export interface CandidateAuditStepV1 {
  readonly stepId: string;
  readonly kind: CandidateAuditStepKindV1;
  readonly actorRefId: string;
  readonly occurredAt: string;
  readonly evidenceDigest: string;
  readonly dependsOnStepIds: readonly string[];
  readonly dependencyOutputDigests: readonly string[];
  readonly stepDigest: string;
}

export interface CandidateAuditPreludeV1 {
  readonly contractVersion: typeof QFS2_CONTRACT_VERSION;
  readonly preludeId: string;
  readonly preludeDigest: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly qf0DependencyDigest: string;
  readonly actors: readonly CandidateAuditActorV1[];
  readonly steps: readonly CandidateAuditStepV1[];
  readonly startedAt: string;
  readonly completedAt: string;
}

const QFS2_PUBLIC_EXPORTS = Object.freeze([
  "QFS2_CONTRACT_VERSION",
  "QFS2_LIMITS",
  "QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "createCandidateAuditPreludeV1",
  "assertCandidateAuditPreludeV1",
] as const);

const QFS2_EVIDENCE_CLAIM_BOUNDARY = Object.freeze({
  rightsAtUseRevalidationMetadataRequired: true,
  rightsAtUseRevalidationMetadataOnly: true,
  candidateQualityValidationClaimAbsent: true,
  independentTaskCompletionClaimAbsent: true,
  judgingClaimAbsent: true,
  transferClaimAbsent: true,
  releaseClaimAbsent: true,
});

export const QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QFS2_CONTRACT_VERSION,
  scope: "INERT_SOURCE_ONLY_CANDIDATE_TIME_AUDIT_PRELUDE",
  storage: "IN_MEMORY_ONLY",
  runtimeActivation: "OFF",
  rawCandidateBodyAbsent: true,
  network: "OFF",
  providerExecution: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  releaseAuthorityAbsent: true,
  transferAuthorityAbsent: true,
  similarityAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  evidenceClaimBoundary: QFS2_EVIDENCE_CLAIM_BOUNDARY,
  qfS3RequiredForLaterChronologyAggregation: true,
  qf0SourceOnlyBoundaryReceiptDigest:
    "sha256:0062eb9c6987ddda8bc7ade7f94f61b555483b4c508397663b5069ead9798cb7",
  publicExportsExactly: QFS2_PUBLIC_EXPORTS,
  limits: QFS2_LIMITS,
});
