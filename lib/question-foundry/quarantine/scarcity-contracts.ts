export const QF0B_CONTRACT_VERSION =
  "QF0BOpaqueRegistryBodylessScarcityCoreV1" as const;

export const QF0B_REGISTRY_REF_KINDS = Object.freeze([
  "EXAM_PACKAGE",
  "SUBJECT",
  "SKILL_CONCEPT",
  "PROBLEM_FAMILY",
  "DIFFICULTY_BAND",
  "TASK_PROFILE",
  "BLUEPRINT",
  "ANSWER_SPECIFICATION",
  "VALIDATOR_PROFILE",
  "POLICY",
] as const);

export const QF0B_LIMITS = Object.freeze({
  contractVersion: QF0B_CONTRACT_VERSION,
  maxRegistryObjectVersion: 1_000_000,
  maxCapacityShortageCount: 1_000_000,
  registryReferenceSlotsPerEvent: 7,
  callerOverride: false,
});

export type QF0BRegistryRefKind =
  (typeof QF0B_REGISTRY_REF_KINDS)[number];

export interface OpaqueRegistryRefMaterialV1 {
  readonly contractVersion: "OpaqueRegistryRefV1";
  readonly refKind: QF0BRegistryRefKind;
  readonly registryId: string;
  readonly objectId: string;
  readonly version: number;
  readonly objectDigest: string;
}

export interface OpaqueRegistryRefV1
  extends OpaqueRegistryRefMaterialV1 {
  readonly refDigest: string;
}

export interface BodylessBankScarcityEventMaterialV1 {
  readonly contractVersion: "BodylessBankScarcityEventV1";
  readonly examPackageRef: OpaqueRegistryRefV1;
  readonly subjectRef: OpaqueRegistryRefV1;
  readonly skillConceptRef: OpaqueRegistryRefV1;
  readonly problemFamilyRef: OpaqueRegistryRefV1;
  readonly difficultyBandRef: OpaqueRegistryRefV1;
  readonly taskProfileRef: OpaqueRegistryRefV1;
  readonly policyRef: OpaqueRegistryRefV1;
  readonly capacityShortageCount: number;
  readonly occurredAt: string;
}

export interface BodylessBankScarcityEventV1
  extends BodylessBankScarcityEventMaterialV1 {
  readonly eventId: string;
  readonly eventDigest: string;
}

const QF0B_PUBLIC_EXPORTS = Object.freeze([
  "QF0B_CONTRACT_VERSION",
  "QF0B_LIMITS",
  "QF0B_REGISTRY_REF_KINDS",
  "QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "assertBodylessBankScarcityEventV1",
  "assertOpaqueRegistryRefV1",
  "createBodylessBankScarcityEventV1",
  "createOpaqueRegistryRefV1",
] as const);

export const QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QF0B_CONTRACT_VERSION,
  scope: "INERT_SOURCE_ONLY_OPAQUE_REGISTRY_AND_BODYLESS_SCARCITY",
  storage: "IN_MEMORY_ONLY",
  runtimeActivation: "OFF",
  providerExecution: "OFF",
  network: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  questionCandidateAuthorityAbsent: true,
  scarcityEventMetadataOnly: true,
  registryResolutionAuthorityAbsent: true,
  generationAuthorityAbsent: true,
  releaseAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  releasableLifecycleStates: Object.freeze([] as const),
  publicExportsExactly: QF0B_PUBLIC_EXPORTS,
});
