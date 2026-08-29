import { types as utilTypes } from "node:util";

import * as qf0a1 from "./bounded-canonical-json";
import * as qf0a2Contracts from "./trust-contracts";
import type {
  ModelExecutionIdentityV1,
  RightsManifestRefV1,
  SourceEligibilityDecisionV1,
} from "./trust-contracts";
import * as qf0a2 from "./trust-core";
import * as qf0bContracts from "./scarcity-contracts";
import type { OpaqueRegistryRefV1 } from "./scarcity-contracts";
import * as qf0b from "./scarcity-core";
import {
  QF0I_CANDIDATE_LIFECYCLES,
  QF0I_LIMITS,
  type QuarantinedQuestionCandidateMaterialV1,
  type QuarantinedQuestionCandidateV1,
} from "./candidate-contracts";

const {
  QF0A2_PURPOSE,
  QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT,
} = qf0a2Contracts;
const {
  QF0B_REGISTRY_REF_KINDS,
  QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT,
} = qf0bContracts;

const CANDIDATE_MATERIAL_FIELDS = Object.freeze([
  "contractVersion",
  "candidateContentDigest",
  "blueprintRef",
  "answerSpecificationRef",
  "validatorProfileRefs",
  "policyRef",
  "sourceDecision",
  "rightsManifestAtUse",
  "generatorExecution",
  "independentExecutions",
  "createdAt",
] as const);

const CANDIDATE_FIELDS = Object.freeze([
  "contractVersion",
  "candidateId",
  "candidateDigest",
  "lifecycle",
  "candidateContentDigest",
  "blueprintRef",
  "answerSpecificationRef",
  "validatorProfileRefs",
  "policyRef",
  "sourceDecision",
  "rightsManifestAtUse",
  "generatorExecution",
  "independentExecutions",
  "createdAt",
] as const);

const QF0A1_BOUNDARY_FIELDS = Object.freeze([
  "contractVersion",
  "scope",
  "activation",
  "remoteMutation",
  "downstreamAuthorityInstalled",
  "allowedExportsExactly",
  "limits",
] as const);

const QF0A1_LIMIT_FIELDS = Object.freeze([
  "contractVersion",
  "maxCanonicalOutputBytes",
  "maxInspectedUtf16CodeUnits",
  "maxEntries",
  "maxDepth",
  "maxComparisonSteps",
  "surrogateLookaheadOutsideInspectionLimit",
] as const);

const QF0A2_BOUNDARY_FIELDS = Object.freeze([
  "contractVersion",
  "scope",
  "storage",
  "runtimeActivation",
  "providerExecution",
  "network",
  "databaseAndPersistence",
  "remoteMutation",
  "productionMutation",
  "candidateAuthorityAbsent",
  "scarcityAuthorityAbsent",
  "releaseAuthorityAbsent",
  "learnerAssignmentAbsent",
  "bankAssignmentAbsent",
  "liveRightsAuthorityFetch",
  "laterRevocationDetectionWithoutFreshSnapshot",
] as const);

const QF0B_BOUNDARY_FIELDS = Object.freeze([
  "contractVersion",
  "scope",
  "storage",
  "runtimeActivation",
  "providerExecution",
  "network",
  "databaseAndPersistence",
  "remoteMutation",
  "productionMutation",
  "questionCandidateAuthorityAbsent",
  "scarcityEventMetadataOnly",
  "registryResolutionAuthorityAbsent",
  "generationAuthorityAbsent",
  "releaseAuthorityAbsent",
  "learnerAssignmentAbsent",
  "bankAssignmentAbsent",
  "releasableLifecycleStates",
  "publicExportsExactly",
] as const);

const QF0A1_EXPORTS = Object.freeze([
  "QF0A1_LIMITS",
  "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "canonicalizeBoundedJsonV1",
  "compareUtf8BytesV1",
  "digestCanonicalJsonV1",
] as const);

const QF0A2_CONTRACT_EXPORTS = Object.freeze([
  "QF0A2_CONTRACT_VERSION",
  "QF0A2_DECISION_OUTCOMES",
  "QF0A2_DECISION_STATUSES",
  "QF0A2_DENIAL_REASONS",
  "QF0A2_ELIGIBLE_SOURCE_CLASSES",
  "QF0A2_MODEL_ROLES",
  "QF0A2_PURPOSE",
  "QF0A2_QF0A1_DEPENDENCY_RECEIPT",
  "QF0A2_RIGHTS_STATUSES",
  "QF0A2_SOURCE_CLASSES",
  "QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT",
] as const);

const QF0A2_CORE_EXPORTS = Object.freeze([
  "QF0A2_CONTRACT_VERSION",
  "assertDistinctModelExecutionIdentitiesV1",
  "assertModelExecutionIdentityV1",
  "assertQf0a1DependencyV1",
  "assertRightsManifestRefV1",
  "assertSourceEligibilityAtUseV1",
  "assertSourceEligibilityDecisionV1",
  "createModelExecutionIdentityV1",
  "createRightsManifestRefV1",
  "createSourceEligibilityDecisionV1",
] as const);

const QF0B_CONTRACT_EXPORTS = Object.freeze([
  "QF0B_CONTRACT_VERSION",
  "QF0B_LIMITS",
  "QF0B_REGISTRY_REF_KINDS",
  "QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT",
] as const);

const QF0B_CORE_EXPORTS = Object.freeze([
  "assertBodylessBankScarcityEventV1",
  "assertOpaqueRegistryRefV1",
  "createBodylessBankScarcityEventV1",
  "createOpaqueRegistryRefV1",
] as const);

const EXPECTED_QF0A1_BOUNDARY = Object.freeze({
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

const EXPECTED_QF0A2_BOUNDARY = Object.freeze({
  contractVersion: "QF0A2RightsTimeModelIdentityCoreV1",
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

const EXPECTED_QF0B_BOUNDARY = Object.freeze({
  contractVersion: "QF0BOpaqueRegistryBodylessScarcityCoreV1",
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
  publicExportsExactly: Object.freeze([
    "QF0B_CONTRACT_VERSION",
    "QF0B_REGISTRY_REF_KINDS",
    "QF0B_LIMITS",
    "QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT",
    "createOpaqueRegistryRefV1",
    "assertOpaqueRegistryRefV1",
    "createBodylessBankScarcityEventV1",
    "assertBodylessBankScarcityEventV1",
  ] as const),
});

const EXPECTED_QF0B_REF_KINDS = Object.freeze([
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

const QF0A1_BOUNDARY_DIGEST =
  "sha256:bf9f1223fd788696294261995a9a09b05e1db0bfa4d8bc803359cdf98fa9853a";
const QF0A2_BOUNDARY_DIGEST =
  "sha256:09ed5b0f3385cef65ec674af5e3b047df81df5ae53a6e17c023eb8be05a25f97";
const QF0B_BOUNDARY_DIGEST =
  "sha256:397d051c5bd1fc158f0444563c402b8e792e414c88a3f6df44717caaae1ee9f8";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_ID_PATTERN = /^qfc_[a-f0-9]{64}$/u;
const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function fail(code: string): never {
  throw new Error(`QF0I_FAIL_CLOSED:${code}`);
}

function readClosedRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object") fail(`${label}_RECORD_REQUIRED`);
  if (utilTypes.isProxy(value)) fail(`${label}_PROXY_UNSUPPORTED`);
  if (Array.isArray(value)) fail(`${label}_OBJECT_REQUIRED`);

  let prototype: object | null;
  let keys: (string | symbol)[];
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
  } catch {
    fail(`${label}_UNINSPECTABLE`);
  }
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label}_PROTOTYPE_UNSUPPORTED`);
  }
  if (keys.some((key) => typeof key !== "string")) {
    fail(`${label}_SYMBOL_KEY_UNSUPPORTED`);
  }
  if (
    keys.length !== fields.length ||
    keys.some((key) => !fields.includes(key as string)) ||
    fields.some((field) => !keys.includes(field))
  ) {
    fail(`${label}_FIELD_SET_INVALID`);
  }

  const snapshot: Record<string, unknown> = {};
  for (const field of fields) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, field);
    } catch {
      fail(`${label}_DESCRIPTOR_UNINSPECTABLE`);
    }
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_PROPERTY_REQUIRED`);
    }
    snapshot[field] = descriptor.value;
  }
  return snapshot;
}

function readDenseArray(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): unknown[] {
  if (value === null || typeof value !== "object") fail(`${label}_ARRAY_REQUIRED`);
  if (utilTypes.isProxy(value)) fail(`${label}_PROXY_UNSUPPORTED`);
  if (!Array.isArray(value)) fail(`${label}_ARRAY_REQUIRED`);
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    fail(`${label}_PROTOTYPE_UNSUPPORTED`);
  }
  const keys = Reflect.ownKeys(value);
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < minimum ||
    lengthDescriptor.value > maximum ||
    keys.length !== lengthDescriptor.value + 1 ||
    keys.some((key) => typeof key !== "string")
  ) {
    fail(`${label}_DENSE_BOUNDED_ARRAY_REQUIRED`);
  }
  const result: unknown[] = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_ELEMENT_REQUIRED`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function readDenseStringArray(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): string[] {
  return readDenseArray(value, minimum, maximum, label).map((entry) => {
    if (typeof entry !== "string") fail(`${label}_STRING_ELEMENT_REQUIRED`);
    return entry;
  });
}

function readDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label}_FORMAT_INVALID`);
  }
  return value;
}

function readCanonicalUtc(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.length !== 24 ||
    !CANONICAL_UTC_PATTERN.test(value)
  ) {
    fail(`${label}_FORMAT_INVALID`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    fail(`${label}_INVALID`);
  }
  return value;
}

function orderStringsUtf8(values: readonly string[], label: string): string[] {
  const ordered: string[] = [];
  for (const value of values) {
    let index = 0;
    while (
      index < ordered.length &&
      qf0a1.compareUtf8BytesV1(ordered[index], value) < 0
    ) {
      index += 1;
    }
    if (ordered[index] === value) fail(`${label}_DUPLICATE`);
    ordered.splice(index, 0, value);
  }
  return ordered;
}

function assertExactExports(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const actualOrdered = orderStringsUtf8(actual, `${label}_ACTUAL_EXPORT`);
  const expectedOrdered = orderStringsUtf8(expected, `${label}_EXPECTED_EXPORT`);
  if (
    qf0a1.canonicalizeBoundedJsonV1(actualOrdered) !==
    qf0a1.canonicalizeBoundedJsonV1(expectedOrdered)
  ) {
    fail(`${label}_EXPORT_SURFACE_DRIFT`);
  }
}

function assertBoundary(
  actual: unknown,
  expected: unknown,
  expectedDigest: string,
  label: string,
): void {
  let actualCanonical: string;
  let expectedCanonical: string;
  let actualDigest: string;
  try {
    actualCanonical = qf0a1.canonicalizeBoundedJsonV1(actual);
    expectedCanonical = qf0a1.canonicalizeBoundedJsonV1(expected);
    actualDigest = qf0a1.digestCanonicalJsonV1(actual);
  } catch {
    fail(`${label}_BOUNDARY_UNINSPECTABLE`);
  }
  if (actualCanonical !== expectedCanonical || actualDigest !== expectedDigest) {
    fail(`${label}_BOUNDARY_DRIFT`);
  }
}

function plainQf0a1Boundary(value: unknown): Record<string, unknown> {
  const receipt = readClosedRecord(value, QF0A1_BOUNDARY_FIELDS, "QF0A1_BOUNDARY");
  const limits = readClosedRecord(
    receipt.limits,
    QF0A1_LIMIT_FIELDS,
    "QF0A1_BOUNDARY_LIMITS",
  );
  return {
    contractVersion: receipt.contractVersion,
    scope: receipt.scope,
    activation: receipt.activation,
    remoteMutation: receipt.remoteMutation,
    downstreamAuthorityInstalled: receipt.downstreamAuthorityInstalled,
    allowedExportsExactly: readDenseStringArray(
      receipt.allowedExportsExactly,
      QF0A1_EXPORTS.length,
      QF0A1_EXPORTS.length,
      "QF0A1_BOUNDARY_EXPORTS",
    ),
    limits: Object.fromEntries(
      QF0A1_LIMIT_FIELDS.map((field) => [field, limits[field]]),
    ),
  };
}

function plainQf0a2Boundary(value: unknown): Record<string, unknown> {
  const receipt = readClosedRecord(value, QF0A2_BOUNDARY_FIELDS, "QF0A2_BOUNDARY");
  return Object.fromEntries(
    QF0A2_BOUNDARY_FIELDS.map((field) => [field, receipt[field]]),
  );
}

function plainQf0bBoundary(value: unknown): Record<string, unknown> {
  const receipt = readClosedRecord(value, QF0B_BOUNDARY_FIELDS, "QF0B_BOUNDARY");
  return {
    ...Object.fromEntries(
      QF0B_BOUNDARY_FIELDS.slice(0, -2).map((field) => [field, receipt[field]]),
    ),
    releasableLifecycleStates: readDenseStringArray(
      receipt.releasableLifecycleStates,
      0,
      0,
      "QF0B_BOUNDARY_LIFECYCLES",
    ),
    publicExportsExactly: readDenseStringArray(
      receipt.publicExportsExactly,
      8,
      8,
      "QF0B_BOUNDARY_EXPORTS",
    ),
  };
}

function assertDependenciesV1(): void {
  assertExactExports(Object.keys(qf0a1), QF0A1_EXPORTS, "QF0A1");
  assertExactExports(
    Object.keys(qf0a2Contracts),
    QF0A2_CONTRACT_EXPORTS,
    "QF0A2_CONTRACTS",
  );
  assertExactExports(Object.keys(qf0a2), QF0A2_CORE_EXPORTS, "QF0A2_CORE");
  assertExactExports(
    Object.keys(qf0bContracts),
    QF0B_CONTRACT_EXPORTS,
    "QF0B_CONTRACTS",
  );
  assertExactExports(Object.keys(qf0b), QF0B_CORE_EXPORTS, "QF0B_CORE");
  assertBoundary(
    plainQf0a1Boundary(qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT),
    plainQf0a1Boundary(EXPECTED_QF0A1_BOUNDARY),
    QF0A1_BOUNDARY_DIGEST,
    "QF0A1",
  );
  assertBoundary(
    plainQf0a2Boundary(QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT),
    plainQf0a2Boundary(EXPECTED_QF0A2_BOUNDARY),
    QF0A2_BOUNDARY_DIGEST,
    "QF0A2",
  );
  assertBoundary(
    plainQf0bBoundary(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT),
    plainQf0bBoundary(EXPECTED_QF0B_BOUNDARY),
    QF0B_BOUNDARY_DIGEST,
    "QF0B",
  );
  if (
    qf0a1.canonicalizeBoundedJsonV1(
      readDenseStringArray(
        QF0B_REGISTRY_REF_KINDS,
        EXPECTED_QF0B_REF_KINDS.length,
        EXPECTED_QF0B_REF_KINDS.length,
        "QF0B_REFERENCE_KINDS",
      ),
    ) !==
    qf0a1.canonicalizeBoundedJsonV1(
      readDenseStringArray(
        EXPECTED_QF0B_REF_KINDS,
        EXPECTED_QF0B_REF_KINDS.length,
        EXPECTED_QF0B_REF_KINDS.length,
        "EXPECTED_QF0B_REFERENCE_KINDS",
      ),
    )
  ) {
    fail("QF0B_REFERENCE_KIND_DRIFT");
  }
  qf0a2.assertQf0a1DependencyV1();
}

function assertRefKind(
  value: unknown,
  expectedKind: "BLUEPRINT" | "ANSWER_SPECIFICATION" | "VALIDATOR_PROFILE" | "POLICY",
  label: string,
): OpaqueRegistryRefV1 {
  const reference = qf0b.assertOpaqueRegistryRefV1(value);
  if (reference.refKind !== expectedKind) fail(`${label}_REF_KIND_MISMATCH`);
  return reference;
}

function orderValidatorRefs(
  values: readonly OpaqueRegistryRefV1[],
): readonly OpaqueRegistryRefV1[] {
  const refDigests = new Set<string>();
  const objectIdentities = new Set<string>();
  for (const reference of values) {
    if (refDigests.has(reference.refDigest)) fail("VALIDATOR_REF_DIGEST_DUPLICATE");
    const identity = `${reference.registryId}/${reference.objectId}/${reference.version}`;
    if (objectIdentities.has(identity)) fail("VALIDATOR_OBJECT_IDENTITY_DUPLICATE");
    refDigests.add(reference.refDigest);
    objectIdentities.add(identity);
  }
  return [...values].sort((left, right) =>
    qf0a1.compareUtf8BytesV1(left.refDigest, right.refDigest),
  );
}

function orderIndependentExecutions(
  values: readonly ModelExecutionIdentityV1[],
): readonly ModelExecutionIdentityV1[] {
  return [...values].sort((left, right) =>
    qf0a1.compareUtf8BytesV1(left.identityDigest, right.identityDigest),
  );
}

function assertChronology(
  generator: ModelExecutionIdentityV1,
  independent: readonly ModelExecutionIdentityV1[],
  createdAt: string,
): void {
  const generatorAt = Date.parse(generator.executedAt);
  const candidateAt = Date.parse(createdAt);
  if (generatorAt > candidateAt) fail("CANDIDATE_CREATED_BEFORE_GENERATOR");
  for (const execution of independent) {
    const executedAt = Date.parse(execution.executedAt);
    if (executedAt < generatorAt) fail("INDEPENDENT_BEFORE_GENERATOR");
    if (executedAt > candidateAt) fail("INDEPENDENT_AFTER_CANDIDATE");
  }
}

function assertDualRightsTimeGate(
  decision: SourceEligibilityDecisionV1,
  rightsManifestAtUse: RightsManifestRefV1,
  generator: ModelExecutionIdentityV1,
  createdAt: string,
): void {
  const common = {
    decision,
    rightsManifestAtUse,
    expectedSourceClass: decision.sourceClass,
    expectedPurpose: QF0A2_PURPOSE,
    expectedPolicyVersion: decision.policyVersion,
    expectedPolicyDigest: decision.policyDigest,
  } as const;
  qf0a2.assertSourceEligibilityAtUseV1({
    ...common,
    useAt: generator.executedAt,
  });
  qf0a2.assertSourceEligibilityAtUseV1({
    ...common,
    useAt: createdAt,
  });
}

function canonicalCandidateMaterial(
  material: QuarantinedQuestionCandidateMaterialV1,
): Record<string, unknown> {
  return {
    contractVersion: material.contractVersion,
    candidateContentDigest: material.candidateContentDigest,
    blueprintRef: material.blueprintRef,
    answerSpecificationRef: material.answerSpecificationRef,
    validatorProfileRefs: [...material.validatorProfileRefs],
    policyRef: material.policyRef,
    sourceDecision: {
      contractVersion: material.sourceDecision.contractVersion,
      decisionId: material.sourceDecision.decisionId,
      decisionDigest: material.sourceDecision.decisionDigest,
      sourceClass: material.sourceDecision.sourceClass,
      purpose: material.sourceDecision.purpose,
      decisionStatus: material.sourceDecision.decisionStatus,
      outcome: material.sourceDecision.outcome,
      evaluatedAt: material.sourceDecision.evaluatedAt,
      eligibilityInterval:
        material.sourceDecision.eligibilityInterval === null
          ? null
          : { ...material.sourceDecision.eligibilityInterval },
      rightsManifest: { ...material.sourceDecision.rightsManifest },
      policyVersion: material.sourceDecision.policyVersion,
      policyDigest: material.sourceDecision.policyDigest,
      policyValidityInterval: {
        ...material.sourceDecision.policyValidityInterval,
      },
      denialReasons: [...material.sourceDecision.denialReasons],
    },
    rightsManifestAtUse: material.rightsManifestAtUse,
    generatorExecution: material.generatorExecution,
    independentExecutions: [...material.independentExecutions],
    createdAt: material.createdAt,
  };
}

function parseCandidateMaterial(
  value: unknown,
): QuarantinedQuestionCandidateMaterialV1 {
  const record = readClosedRecord(
    value,
    CANDIDATE_MATERIAL_FIELDS,
    "CANDIDATE_MATERIAL",
  );
  if (record.contractVersion !== "QuarantinedQuestionCandidateV1") {
    fail("CANDIDATE_CONTRACT_VERSION_INVALID");
  }
  const candidateContentDigest = readDigest(
    record.candidateContentDigest,
    "CANDIDATE_CONTENT_DIGEST",
  );
  const blueprintRef = assertRefKind(record.blueprintRef, "BLUEPRINT", "BLUEPRINT");
  const answerSpecificationRef = assertRefKind(
    record.answerSpecificationRef,
    "ANSWER_SPECIFICATION",
    "ANSWER_SPECIFICATION",
  );
  const validatorProfileRefs = orderValidatorRefs(
    readDenseArray(
      record.validatorProfileRefs,
      QF0I_LIMITS.minValidatorProfileRefs,
      QF0I_LIMITS.maxValidatorProfileRefs,
      "VALIDATOR_PROFILE_REFS",
    ).map((reference) =>
      assertRefKind(reference, "VALIDATOR_PROFILE", "VALIDATOR_PROFILE"),
    ),
  );
  const policyRef = assertRefKind(record.policyRef, "POLICY", "POLICY");
  const sourceDecision = qf0a2.assertSourceEligibilityDecisionV1(
    record.sourceDecision,
  );
  if (sourceDecision.decisionStatus !== "CURRENT") {
    fail("SOURCE_DECISION_NOT_CURRENT");
  }
  if (sourceDecision.outcome !== "ELIGIBLE") fail("SOURCE_DECISION_NOT_ELIGIBLE");
  if (sourceDecision.purpose !== QF0A2_PURPOSE) {
    fail("SOURCE_DECISION_PURPOSE_INVALID");
  }
  if (policyRef.objectDigest !== sourceDecision.policyDigest) {
    fail("POLICY_REF_DIGEST_MISMATCH");
  }
  const rightsManifestAtUse = qf0a2.assertRightsManifestRefV1(
    record.rightsManifestAtUse,
  );
  const generatorExecution = qf0a2.assertModelExecutionIdentityV1(
    record.generatorExecution,
  );
  if (generatorExecution.role !== "GENERATOR") fail("GENERATOR_ROLE_REQUIRED");
  const independentExecutions = readDenseArray(
    record.independentExecutions,
    0,
    QF0I_LIMITS.maxIndependentExecutions,
    "INDEPENDENT_EXECUTIONS",
  ).map((execution) => qf0a2.assertModelExecutionIdentityV1(execution));
  if (independentExecutions.length > 0) {
    qf0a2.assertDistinctModelExecutionIdentitiesV1({
      generator: generatorExecution,
      independentExecutions,
    });
  }
  const orderedIndependentExecutions = orderIndependentExecutions(
    independentExecutions,
  );
  const createdAt = readCanonicalUtc(record.createdAt, "CANDIDATE_CREATED_AT");
  assertChronology(generatorExecution, orderedIndependentExecutions, createdAt);
  assertDualRightsTimeGate(
    sourceDecision,
    rightsManifestAtUse,
    generatorExecution,
    createdAt,
  );

  const material: QuarantinedQuestionCandidateMaterialV1 = {
    contractVersion: "QuarantinedQuestionCandidateV1",
    candidateContentDigest,
    blueprintRef,
    answerSpecificationRef,
    validatorProfileRefs,
    policyRef,
    sourceDecision,
    rightsManifestAtUse,
    generatorExecution,
    independentExecutions: orderedIndependentExecutions,
    createdAt,
  };
  qf0a1.canonicalizeBoundedJsonV1(canonicalCandidateMaterial(material));
  return material;
}

function deriveCandidateIdentities(
  material: QuarantinedQuestionCandidateMaterialV1,
): { readonly candidateId: string; readonly candidateDigest: string } {
  const canonicalMaterial = canonicalCandidateMaterial(material);
  const identityDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QF0I_QUARANTINED_QUESTION_CANDIDATE_ID_V1",
    material: canonicalMaterial,
  });
  const candidateId = `qfc_${identityDigest.slice("sha256:".length)}`;
  const candidateDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QF0I_QUARANTINED_QUESTION_CANDIDATE_DIGEST_V1",
    candidateId,
    lifecycle: "QUARANTINED",
    material: canonicalMaterial,
  });
  return Object.freeze({ candidateId, candidateDigest });
}

function buildCandidate(
  material: QuarantinedQuestionCandidateMaterialV1,
): QuarantinedQuestionCandidateV1 {
  const identities = deriveCandidateIdentities(material);
  const validatorProfileRefs = Object.freeze([...material.validatorProfileRefs]);
  const independentExecutions = Object.freeze([...material.independentExecutions]);
  return Object.freeze({
    contractVersion: material.contractVersion,
    candidateId: identities.candidateId,
    candidateDigest: identities.candidateDigest,
    lifecycle: QF0I_CANDIDATE_LIFECYCLES[0],
    candidateContentDigest: material.candidateContentDigest,
    blueprintRef: material.blueprintRef,
    answerSpecificationRef: material.answerSpecificationRef,
    validatorProfileRefs,
    policyRef: material.policyRef,
    sourceDecision: material.sourceDecision,
    rightsManifestAtUse: material.rightsManifestAtUse,
    generatorExecution: material.generatorExecution,
    independentExecutions,
    createdAt: material.createdAt,
  });
}

export function createQuarantinedQuestionCandidateV1(
  value: unknown,
): QuarantinedQuestionCandidateV1 {
  assertDependenciesV1();
  return buildCandidate(parseCandidateMaterial(value));
}

export function assertQuarantinedQuestionCandidateV1(
  value: unknown,
): QuarantinedQuestionCandidateV1 {
  assertDependenciesV1();
  const record = readClosedRecord(value, CANDIDATE_FIELDS, "CANDIDATE");
  const candidateId =
    typeof record.candidateId === "string" &&
    CANDIDATE_ID_PATTERN.test(record.candidateId)
      ? record.candidateId
      : fail("CANDIDATE_ID_FORMAT_INVALID");
  const candidateDigest = readDigest(record.candidateDigest, "CANDIDATE_DIGEST");
  if (record.lifecycle !== "QUARANTINED") fail("CANDIDATE_LIFECYCLE_INVALID");
  const material = parseCandidateMaterial({
    contractVersion: record.contractVersion,
    candidateContentDigest: record.candidateContentDigest,
    blueprintRef: record.blueprintRef,
    answerSpecificationRef: record.answerSpecificationRef,
    validatorProfileRefs: record.validatorProfileRefs,
    policyRef: record.policyRef,
    sourceDecision: record.sourceDecision,
    rightsManifestAtUse: record.rightsManifestAtUse,
    generatorExecution: record.generatorExecution,
    independentExecutions: record.independentExecutions,
    createdAt: record.createdAt,
  });
  const expected = buildCandidate(material);
  if (candidateId !== expected.candidateId) fail("CANDIDATE_ID_MISMATCH");
  if (candidateDigest !== expected.candidateDigest) {
    fail("CANDIDATE_DIGEST_MISMATCH");
  }
  return expected;
}
