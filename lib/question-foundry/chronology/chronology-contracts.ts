import type { ModelExecutionIdentityV1 } from "../quarantine/trust-contracts";
import type { OpaqueRegistryRefV1 } from "../quarantine/scarcity-contracts";
import type { QuarantinedQuestionCandidateV1 } from "../quarantine/candidate-contracts";
import type { SimilarityFirewallInputV1, SimilarityFirewallReviewV1 } from "../similarity/similarity-contracts";
import type { CandidateAuditPreludeV1 } from "../audit/prelude-contracts";

export const QFS3_CONTRACT_VERSION =
  "QFS3DependencyRankedTransferChronologyV1" as const;

export const QFS3_RECEIPT_KINDS = Object.freeze([
  "CANDIDATE_PRELUDE_BOUND",
  "SIMILARITY_REVIEW_BOUND",
  "TRANSFER_VARIANT_SEALED",
  "DECLARED_VALIDATOR_COMPLETED",
  "BLIND_SOLVER_COMPLETED",
  "JUDGE_COMPLETED",
  "ADVERSARIAL_CRITIC_COMPLETED",
  "VARIANT_VALIDATION_AGGREGATED",
  "TRANSFER_EVIDENCE_AGGREGATED",
  "META_AUDIT_COMPLETED",
] as const);

export const QFS3_COMPLETENESS_STATES = Object.freeze([
  "COMPLETE",
  "INCOMPLETE",
] as const);

export const QFS3_BLOCKING_REASONS = Object.freeze([
  "MISSING_VARIANT_SEAL",
  "MISSING_DECLARED_VALIDATOR",
  "MISSING_BLIND_SOLVER",
  "MISSING_JUDGE",
  "MISSING_ADVERSARIAL_CRITIC",
  "MISSING_VARIANT_AGGREGATE",
  "MISSING_TRANSFER_AGGREGATE",
  "MISSING_META_AUDIT",
] as const);

export const QFS3_LIMITS = Object.freeze({
  contractVersion: QFS3_CONTRACT_VERSION,
  maxVariants: 8,
  maxDeclaredValidatorsPerVariant: 4,
  maxEvidenceReceipts: 76,
  maxActors: 76,
  maxPredecessorsPerReceipt: 9,
  callerOverride: false,
});

export type QFS3ReceiptKind = (typeof QFS3_RECEIPT_KINDS)[number];
export type QFS3Completeness = (typeof QFS3_COMPLETENESS_STATES)[number];
export type QFS3BlockingReason = (typeof QFS3_BLOCKING_REASONS)[number];

export interface TrustedSystemComponentIdentityV1 {
  readonly actorKind: "SYSTEM_COMPONENT";
  readonly componentId: string;
  readonly componentVersion: string;
  readonly componentArtifactDigest: string;
}

export interface ExactModelExecutionActorV1 {
  readonly actorKind: "MODEL_EXECUTION";
  readonly modelExecution: ModelExecutionIdentityV1;
}

export type TransferChronologyActorInputV1 =
  | TrustedSystemComponentIdentityV1
  | ExactModelExecutionActorV1;

export interface TransferVariantRequirementV1 {
  readonly variantId: string;
  readonly variantDigest: string;
  readonly declaredValidatorProfileRefs: readonly OpaqueRegistryRefV1[];
}

export interface TransferChronologyReceiptInputV1 {
  readonly inputReceiptId: string;
  readonly kind: QFS3ReceiptKind;
  readonly variantId: string | null;
  readonly variantDigest: string | null;
  readonly artifactId: string;
  readonly artifactDigest: string;
  readonly actor: TransferChronologyActorInputV1;
  readonly occurredAt: string;
  readonly predecessorInputReceiptIds: readonly string[];
  readonly predecessorOutputDigests: readonly string[];
  readonly declaredValidatorProfileRef: OpaqueRegistryRefV1 | null;
  readonly outputDigest: string;
}

export interface DependencyRankedTransferChronologyInputV1 {
  readonly contractVersion: "DependencyRankedTransferChronologyInputV1";
  readonly candidate: QuarantinedQuestionCandidateV1;
  readonly qfS1Review: SimilarityFirewallReviewV1;
  readonly qfS1AuthorityInput: SimilarityFirewallInputV1;
  readonly qfS2Prelude: CandidateAuditPreludeV1;
  readonly variants: readonly TransferVariantRequirementV1[];
  readonly receipts: readonly TransferChronologyReceiptInputV1[];
}

export interface SystemComponentChronologyActorV1 {
  readonly actorRefId: string;
  readonly actorKind: "SYSTEM_COMPONENT";
  readonly componentId: string;
  readonly componentVersion: string;
  readonly componentArtifactDigest: string;
}

export interface ModelExecutionChronologyActorV1 {
  readonly actorRefId: string;
  readonly actorKind: "MODEL_EXECUTION";
  readonly role: ModelExecutionIdentityV1["role"];
  readonly executionId: string;
  readonly identityDigest: string;
  readonly modelArtifactDigest: string;
  readonly executionArtifactDigest: string;
  readonly executedAt: string;
}

export type TransferChronologyActorV1 =
  | SystemComponentChronologyActorV1
  | ModelExecutionChronologyActorV1;

export interface DependencyRankedTransferReceiptV1 {
  readonly contractVersion: "DependencyRankedTransferReceiptV1";
  readonly receiptId: string;
  readonly receiptDigest: string;
  readonly kind: QFS3ReceiptKind;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly variantId: string | null;
  readonly variantDigest: string | null;
  readonly artifactId: string;
  readonly artifactDigest: string;
  readonly actorRefId: string;
  readonly occurredAt: string;
  readonly predecessorReceiptIds: readonly string[];
  readonly predecessorOutputDigests: readonly string[];
  readonly declaredValidatorProfileRef: OpaqueRegistryRefV1 | null;
  readonly outputDigest: string;
}

export interface DependencyRankedTransferChronologyV1 {
  readonly contractVersion: typeof QFS3_CONTRACT_VERSION;
  readonly chronologyId: string;
  readonly chronologyDigest: string;
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly qfS1ReviewDigest: string;
  readonly qfS2PreludeDigest: string;
  readonly actors: readonly TransferChronologyActorV1[];
  readonly receipts: readonly DependencyRankedTransferReceiptV1[];
  readonly startedAt: string;
  readonly completedAt: string;
  readonly completeness: QFS3Completeness;
  readonly blockingReasons: readonly QFS3BlockingReason[];
}

const QFS3_PUBLIC_EXPORTS = Object.freeze([
  "QFS3_BLOCKING_REASONS",
  "QFS3_COMPLETENESS_STATES",
  "QFS3_CONTRACT_VERSION",
  "QFS3_LIMITS",
  "QFS3_RECEIPT_KINDS",
  "QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "assertDependencyRankedTransferChronologyV1",
  "createDependencyRankedTransferChronologyV1",
] as const);

export const QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QFS3_CONTRACT_VERSION,
  scope: "INERT_SOURCE_ONLY_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY",
  storage: "IN_MEMORY_ONLY",
  runtimeActivation: "OFF",
  rawQuestionAnswerSourcePromptAndResponseBodiesAbsentFromOutput: true,
  network: "OFF",
  providerExecution: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  causalOrderOfSuppliedMetadataReceiptsOnly: true,
  correctnessAuthorityAbsent: true,
  releaseAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  readinessEligibilityAbsent: true,
  measurementEligibilityAbsent: true,
  qfI1RequiredForLaterReleaseIntegration: true,
  publicLifecycleStates: Object.freeze([] as const),
  publicExportsExactly: QFS3_PUBLIC_EXPORTS,
  limits: QFS3_LIMITS,
});
