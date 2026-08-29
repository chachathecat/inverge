export const QF0A2_CONTRACT_VERSION =
  "QF0A2RightsTimeModelIdentityCoreV1" as const;

export const QF0A2_PURPOSE =
  "QUESTION_FOUNDRY_QUARANTINED_CANDIDATE_CREATION" as const;

export const QF0A2_SOURCE_CLASSES = Object.freeze([
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const);

export const QF0A2_ELIGIBLE_SOURCE_CLASSES = Object.freeze([
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
] as const);

export const QF0A2_RIGHTS_STATUSES = Object.freeze([
  "ACTIVE",
  "STALE",
  "DISPUTED",
  "BLOCKED",
  "REVOKED",
  "EXPIRED",
] as const);

export const QF0A2_DECISION_STATUSES = Object.freeze([
  "CURRENT",
  "STALE",
  "DISPUTED",
  "BLOCKED",
] as const);

export const QF0A2_DECISION_OUTCOMES = Object.freeze([
  "ELIGIBLE",
  "DENIED",
] as const);

export const QF0A2_DENIAL_REASONS = Object.freeze([
  "DECISION_STATUS_NOT_CURRENT",
  "SOURCE_CLASS_NOT_ELIGIBLE",
  "PURPOSE_NOT_AUTHORIZED",
  "RIGHTS_STATUS_NOT_ACTIVE",
  "SOURCE_CLASS_MISMATCH",
  "PURPOSE_MISMATCH",
  "POLICY_VERSION_MISMATCH",
  "POLICY_DIGEST_MISMATCH",
  "EVALUATED_AT_OUTSIDE_RIGHTS_INTERVAL",
  "EVALUATED_AT_OUTSIDE_POLICY_INTERVAL",
  "ELIGIBILITY_INTERVAL_EMPTY",
] as const);

export const QF0A2_MODEL_ROLES = Object.freeze([
  "GENERATOR",
  "BLIND_SOLVER",
  "JUDGE",
  "ADVERSARIAL_CRITIC",
  "META_AUDITOR",
] as const);

export type SourceClassV1 = (typeof QF0A2_SOURCE_CLASSES)[number];
export type RightsStatusV1 = (typeof QF0A2_RIGHTS_STATUSES)[number];
export type DecisionStatusV1 = (typeof QF0A2_DECISION_STATUSES)[number];
export type DecisionOutcomeV1 = (typeof QF0A2_DECISION_OUTCOMES)[number];
export type DenialReasonV1 = (typeof QF0A2_DENIAL_REASONS)[number];
export type ModelExecutionRoleV1 = (typeof QF0A2_MODEL_ROLES)[number];

export interface CanonicalIntervalV1 {
  readonly validFrom: string;
  readonly validUntil: string;
}

export interface RightsManifestMaterialV1 {
  readonly contractVersion: "RightsManifestRefV1";
  readonly manifestId: string;
  readonly manifestVersionId: string;
  readonly sourceClass: SourceClassV1;
  readonly status: RightsStatusV1;
  readonly permittedPurpose: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly policyVersion: string;
  readonly policyDigest: string;
}

export interface RightsManifestRefV1 extends RightsManifestMaterialV1 {
  readonly manifestDigest: string;
}

export interface SourceEligibilityDecisionInputV1 {
  readonly contractVersion: "SourceEligibilityDecisionV1";
  readonly sourceClass: SourceClassV1;
  readonly purpose: string;
  readonly decisionStatus: DecisionStatusV1;
  readonly evaluatedAt: string;
  readonly rightsManifest: RightsManifestRefV1;
  readonly policyVersion: string;
  readonly policyDigest: string;
  readonly policyValidFrom: string;
  readonly policyValidUntil: string;
}

export interface SourceEligibilityDecisionV1 {
  readonly contractVersion: "SourceEligibilityDecisionV1";
  readonly decisionId: string;
  readonly decisionDigest: string;
  readonly sourceClass: SourceClassV1;
  readonly purpose: string;
  readonly decisionStatus: DecisionStatusV1;
  readonly outcome: DecisionOutcomeV1;
  readonly evaluatedAt: string;
  readonly eligibilityInterval: CanonicalIntervalV1 | null;
  readonly rightsManifest: RightsManifestRefV1;
  readonly policyVersion: string;
  readonly policyDigest: string;
  readonly policyValidityInterval: CanonicalIntervalV1;
  readonly denialReasons: readonly DenialReasonV1[];
}

export interface SourceEligibilityAtUseInputV1 {
  readonly decision: SourceEligibilityDecisionV1;
  readonly rightsManifestAtUse: RightsManifestRefV1;
  readonly useAt: string;
  readonly expectedSourceClass: SourceClassV1;
  readonly expectedPurpose: string;
  readonly expectedPolicyVersion: string;
  readonly expectedPolicyDigest: string;
}

export interface ModelExecutionIdentityMaterialV1 {
  readonly contractVersion: "ModelExecutionIdentityV1";
  readonly role: ModelExecutionRoleV1;
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly modelArtifactDigest: string;
  readonly executionId: string;
  readonly executionArtifactDigest: string;
  readonly configurationDigest: string;
  readonly executedAt: string;
}

export interface ModelExecutionIdentityV1
  extends ModelExecutionIdentityMaterialV1 {
  readonly identityDigest: string;
}

export interface DistinctModelExecutionIdentitiesInputV1 {
  readonly generator: ModelExecutionIdentityV1;
  readonly independentExecutions: readonly ModelExecutionIdentityV1[];
}

const QF0A1_EXPORTS = Object.freeze([
  "QF0A1_LIMITS",
  "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "canonicalizeBoundedJsonV1",
  "compareUtf8BytesV1",
  "digestCanonicalJsonV1",
] as const);

const QF0A1_PATH_OBJECTS = Object.freeze([
  Object.freeze({
    path: "config/dabangil-qf0a1-bounded-canonical-json-v1.json",
    mode: "100644",
    type: "blob",
    objectId: "12a8be4b0b2a14eb10cf2bbe5478aa909d18790e",
  }),
  Object.freeze({
    path: "docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md",
    mode: "100644",
    type: "blob",
    objectId: "17afb96912b796e4d7216c545481f507f9e9192e",
  }),
  Object.freeze({
    path: "docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md",
    mode: "100644",
    type: "blob",
    objectId: "7456a749ffc091665fc806fe594ce4880db983a5",
  }),
  Object.freeze({
    path: "lib/question-foundry/quarantine/bounded-canonical-json.ts",
    mode: "100644",
    type: "blob",
    objectId: "3dcfe51e7b15e1d36554c10b4e12a1bf10f9cf91",
  }),
  Object.freeze({
    path: "tests/qf0a1-bounded-canonical-json.test.mjs",
    mode: "100644",
    type: "blob",
    objectId: "01164598ea62591663fbc95ddbf1b5190f5b54f9",
  }),
] as const);

const QF0A1_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: "QF0A1BoundedCanonicalJsonV1",
  scope: "INERT_SOURCE_ONLY_UTILITY",
  activation: "OFF",
  remoteMutation: "ZERO",
  downstreamAuthorityInstalled: false,
  allowedExportsExactly: QF0A1_EXPORTS,
  limits: Object.freeze({
    contractVersion: "QF0A1BoundedCanonicalJsonV1",
    maxCanonicalOutputBytes: 262_144,
    maxInspectedUtf16CodeUnits: 262_144,
    maxEntries: 10_000,
    maxDepth: 32,
    maxComparisonSteps: 524_288,
    surrogateLookaheadOutsideInspectionLimit: 0,
  }),
});

export const QF0A2_QF0A1_DEPENDENCY_RECEIPT = Object.freeze({
  resultingMainSha: "62268861dcc6a60126700c5259c662c55bd1a4ee",
  resultingMainTree: "996b1e7ea30f31f21782e765be644798aad8d548",
  configSha256:
    "0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53",
  implementationSha256:
    "cccc4dc8da9163d982a252633e3160f1ba5ad2138d0fda0f152f21b2c01e8d9e",
  fivePathIdentity:
    "sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618",
  pathObjectsExactly: QF0A1_PATH_OBJECTS,
  requiredExportsExactly: QF0A1_EXPORTS,
  sourceOnlyBoundaryReceipt: QF0A1_BOUNDARY_RECEIPT,
  sourceOnlyBoundaryReceiptDigest:
    "sha256:bf9f1223fd788696294261995a9a09b05e1db0bfa4d8bc803359cdf98fa9853a",
});

export const QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QF0A2_CONTRACT_VERSION,
  scope: "INERT_SOURCE_ONLY_TRUST_BOUNDARY",
  storage: "IN_MEMORY_ONLY",
  runtimeActivation: "OFF",
  providerExecution: "OFF",
  network: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  candidateAuthorityAbsent: true,
  scarcityAuthorityAbsent: true,
  releaseAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  liveRightsAuthorityFetch: false,
  laterRevocationDetectionWithoutFreshSnapshot: false,
});
