import { types as utilTypes } from "node:util";

import * as qf0a1 from "./bounded-canonical-json";
import {
  QF0B_LIMITS,
  QF0B_REGISTRY_REF_KINDS,
  type BodylessBankScarcityEventMaterialV1,
  type BodylessBankScarcityEventV1,
  type OpaqueRegistryRefMaterialV1,
  type OpaqueRegistryRefV1,
  type QF0BRegistryRefKind,
} from "./scarcity-contracts";
import * as qf0a2Contracts from "./trust-contracts";
import * as qf0a2Core from "./trust-core";

const REGISTRY_REF_MATERIAL_FIELDS = Object.freeze([
  "contractVersion",
  "refKind",
  "registryId",
  "objectId",
  "version",
  "objectDigest",
] as const);

const REGISTRY_REF_FIELDS = Object.freeze([
  ...REGISTRY_REF_MATERIAL_FIELDS,
  "refDigest",
] as const);

const SCARCITY_EVENT_MATERIAL_FIELDS = Object.freeze([
  "contractVersion",
  "examPackageRef",
  "subjectRef",
  "skillConceptRef",
  "problemFamilyRef",
  "difficultyBandRef",
  "taskProfileRef",
  "policyRef",
  "capacityShortageCount",
  "occurredAt",
] as const);

const SCARCITY_EVENT_FIELDS = Object.freeze([
  "contractVersion",
  "eventId",
  "eventDigest",
  "examPackageRef",
  "subjectRef",
  "skillConceptRef",
  "problemFamilyRef",
  "difficultyBandRef",
  "taskProfileRef",
  "policyRef",
  "capacityShortageCount",
  "occurredAt",
] as const);

const QF0A1_RECEIPT_FIELDS = Object.freeze([
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

const EXPECTED_QF0A1_BOUNDARY_RECEIPT = Object.freeze({
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

const EXPECTED_QF0A2_BOUNDARY_RECEIPT = Object.freeze({
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

const QF0A1_BOUNDARY_DIGEST =
  "sha256:bf9f1223fd788696294261995a9a09b05e1db0bfa4d8bc803359cdf98fa9853a";
const QF0A2_BOUNDARY_DIGEST =
  "sha256:09ed5b0f3385cef65ec674af5e3b047df81df5ae53a6e17c023eb8be05a25f97";

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const REGISTRY_ID_PATTERN = /^reg_[a-f0-9]{32}$/u;
const OBJECT_ID_PATTERN = /^obj_[a-f0-9]{32}$/u;
const EVENT_ID_PATTERN = /^bse_[a-f0-9]{64}$/u;
const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const SLOT_KINDS = Object.freeze({
  examPackageRef: "EXAM_PACKAGE",
  subjectRef: "SUBJECT",
  skillConceptRef: "SKILL_CONCEPT",
  problemFamilyRef: "PROBLEM_FAMILY",
  difficultyBandRef: "DIFFICULTY_BAND",
  taskProfileRef: "TASK_PROFILE",
  policyRef: "POLICY",
} as const satisfies Record<string, QF0BRegistryRefKind>);

function fail(code: string): never {
  throw new Error(`QF0B_FAIL_CLOSED:${code}`);
}

function readClosedRecord(
  value: unknown,
  fields: readonly string[],
  label: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    fail(`${label}_RECORD_REQUIRED`);
  }
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

function readDenseStringArray(
  value: unknown,
  maxLength: number,
  label: string,
): string[] {
  if (value === null || typeof value !== "object") {
    fail(`${label}_ARRAY_REQUIRED`);
  }
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
    lengthDescriptor.value < 0 ||
    lengthDescriptor.value > maxLength ||
    keys.length !== lengthDescriptor.value + 1 ||
    keys.some((key) => typeof key !== "string")
  ) {
    fail(`${label}_DENSE_ARRAY_REQUIRED`);
  }
  const result: string[] = [];
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true ||
      typeof descriptor.value !== "string"
    ) {
      fail(`${label}_DATA_STRING_ELEMENT_REQUIRED`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function readPattern(
  value: unknown,
  pattern: RegExp,
  label: string,
  exactMaximumLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > exactMaximumLength ||
    !pattern.test(value)
  ) {
    fail(`${label}_FORMAT_INVALID`);
  }
  return value;
}

function readClosedString<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    fail(`${label}_UNSUPPORTED`);
  }
  return value as T;
}

function readPositiveBoundedSafeInteger(
  value: unknown,
  maximum: number,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > maximum
  ) {
    fail(`${label}_INVALID`);
  }
  return value;
}

function readCanonicalUtc(value: unknown, label: string): string {
  const timestamp = readPattern(value, CANONICAL_UTC_PATTERN, label, 24);
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== timestamp) {
    fail(`${label}_INVALID`);
  }
  return timestamp;
}

function orderStringsUtf8(values: readonly string[]): string[] {
  const ordered: string[] = [];
  for (const value of values) {
    let index = 0;
    while (
      index < ordered.length &&
      qf0a1.compareUtf8BytesV1(ordered[index], value) < 0
    ) {
      index += 1;
    }
    if (ordered[index] === value) fail("DUPLICATE_DEPENDENCY_EXPORT");
    ordered.splice(index, 0, value);
  }
  return ordered;
}

function assertExactExports(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  const orderedActual = orderStringsUtf8(actual);
  const orderedExpected = orderStringsUtf8(expected);
  if (
    qf0a1.canonicalizeBoundedJsonV1(orderedActual) !==
    qf0a1.canonicalizeBoundedJsonV1(orderedExpected)
  ) {
    fail(`${label}_EXPORT_SURFACE_DRIFT`);
  }
}

function plainQf0a1Boundary(value: unknown): Record<string, unknown> {
  const receipt = readClosedRecord(value, QF0A1_RECEIPT_FIELDS, "QF0A1_BOUNDARY");
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
      16,
      "QF0A1_BOUNDARY_EXPORTS",
    ),
    limits: {
      contractVersion: limits.contractVersion,
      maxCanonicalOutputBytes: limits.maxCanonicalOutputBytes,
      maxInspectedUtf16CodeUnits: limits.maxInspectedUtf16CodeUnits,
      maxEntries: limits.maxEntries,
      maxDepth: limits.maxDepth,
      maxComparisonSteps: limits.maxComparisonSteps,
      surrogateLookaheadOutsideInspectionLimit:
        limits.surrogateLookaheadOutsideInspectionLimit,
    },
  };
}

function plainQf0a2Boundary(value: unknown): Record<string, unknown> {
  const receipt = readClosedRecord(value, QF0A2_BOUNDARY_FIELDS, "QF0A2_BOUNDARY");
  return Object.fromEntries(
    QF0A2_BOUNDARY_FIELDS.map((field) => [field, receipt[field]]),
  );
}

function assertDependenciesV1(): void {
  assertExactExports(Object.keys(qf0a1), QF0A1_EXPORTS, "QF0A1");
  assertExactExports(
    Object.keys(qf0a2Contracts),
    QF0A2_CONTRACT_EXPORTS,
    "QF0A2_CONTRACTS",
  );
  assertExactExports(Object.keys(qf0a2Core), QF0A2_CORE_EXPORTS, "QF0A2_CORE");

  const qf0a1Actual = plainQf0a1Boundary(
    qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT,
  );
  const qf0a1Expected = plainQf0a1Boundary(EXPECTED_QF0A1_BOUNDARY_RECEIPT);
  if (
    qf0a1.canonicalizeBoundedJsonV1(qf0a1Actual) !==
      qf0a1.canonicalizeBoundedJsonV1(qf0a1Expected) ||
    qf0a1.digestCanonicalJsonV1(qf0a1Actual) !== QF0A1_BOUNDARY_DIGEST
  ) {
    fail("QF0A1_SOURCE_ONLY_BOUNDARY_DRIFT");
  }

  const qf0a2Actual = plainQf0a2Boundary(
    qf0a2Contracts.QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT,
  );
  const qf0a2Expected = plainQf0a2Boundary(EXPECTED_QF0A2_BOUNDARY_RECEIPT);
  if (
    qf0a1.canonicalizeBoundedJsonV1(qf0a2Actual) !==
      qf0a1.canonicalizeBoundedJsonV1(qf0a2Expected) ||
    qf0a1.digestCanonicalJsonV1(qf0a2Actual) !== QF0A2_BOUNDARY_DIGEST
  ) {
    fail("QF0A2_SOURCE_ONLY_BOUNDARY_DRIFT");
  }
}

function parseOpaqueRegistryRefMaterial(
  value: unknown,
): OpaqueRegistryRefMaterialV1 {
  const record = readClosedRecord(
    value,
    REGISTRY_REF_MATERIAL_FIELDS,
    "REGISTRY_REF_MATERIAL",
  );
  return {
    contractVersion: readClosedString(
      record.contractVersion,
      ["OpaqueRegistryRefV1"] as const,
      "REGISTRY_REF_CONTRACT_VERSION",
    ),
    refKind: readClosedString(
      record.refKind,
      QF0B_REGISTRY_REF_KINDS,
      "REGISTRY_REF_KIND",
    ),
    registryId: readPattern(
      record.registryId,
      REGISTRY_ID_PATTERN,
      "REGISTRY_ID",
      36,
    ),
    objectId: readPattern(record.objectId, OBJECT_ID_PATTERN, "OBJECT_ID", 36),
    version: readPositiveBoundedSafeInteger(
      record.version,
      QF0B_LIMITS.maxRegistryObjectVersion,
      "REGISTRY_OBJECT_VERSION",
    ),
    objectDigest: readPattern(
      record.objectDigest,
      DIGEST_PATTERN,
      "REGISTRY_OBJECT_DIGEST",
      71,
    ),
  };
}

function deriveRegistryRefDigest(material: OpaqueRegistryRefMaterialV1): string {
  return qf0a1.digestCanonicalJsonV1({
    domain: "QF0B_OPAQUE_REGISTRY_REF_V1",
    material,
  });
}

function buildOpaqueRegistryRef(
  material: OpaqueRegistryRefMaterialV1,
): OpaqueRegistryRefV1 {
  return Object.freeze({
    contractVersion: material.contractVersion,
    refKind: material.refKind,
    registryId: material.registryId,
    objectId: material.objectId,
    version: material.version,
    objectDigest: material.objectDigest,
    refDigest: deriveRegistryRefDigest(material),
  });
}

function parseOpaqueRegistryRef(value: unknown): OpaqueRegistryRefV1 {
  const record = readClosedRecord(value, REGISTRY_REF_FIELDS, "REGISTRY_REF");
  const material = parseOpaqueRegistryRefMaterial({
    contractVersion: record.contractVersion,
    refKind: record.refKind,
    registryId: record.registryId,
    objectId: record.objectId,
    version: record.version,
    objectDigest: record.objectDigest,
  });
  const refDigest = readPattern(
    record.refDigest,
    DIGEST_PATTERN,
    "REGISTRY_REF_DIGEST",
    71,
  );
  const expected = buildOpaqueRegistryRef(material);
  if (refDigest !== expected.refDigest) fail("REGISTRY_REF_DIGEST_MISMATCH");
  return expected;
}

function assertSlotKind(
  ref: OpaqueRegistryRefV1,
  expected: QF0BRegistryRefKind,
  label: string,
): OpaqueRegistryRefV1 {
  if (ref.refKind !== expected) fail(`${label}_REF_KIND_MISMATCH`);
  return ref;
}

function parseScarcityEventMaterial(
  value: unknown,
): BodylessBankScarcityEventMaterialV1 {
  const record = readClosedRecord(
    value,
    SCARCITY_EVENT_MATERIAL_FIELDS,
    "SCARCITY_EVENT_MATERIAL",
  );
  return {
    contractVersion: readClosedString(
      record.contractVersion,
      ["BodylessBankScarcityEventV1"] as const,
      "SCARCITY_EVENT_CONTRACT_VERSION",
    ),
    examPackageRef: assertSlotKind(
      parseOpaqueRegistryRef(record.examPackageRef),
      SLOT_KINDS.examPackageRef,
      "EXAM_PACKAGE",
    ),
    subjectRef: assertSlotKind(
      parseOpaqueRegistryRef(record.subjectRef),
      SLOT_KINDS.subjectRef,
      "SUBJECT",
    ),
    skillConceptRef: assertSlotKind(
      parseOpaqueRegistryRef(record.skillConceptRef),
      SLOT_KINDS.skillConceptRef,
      "SKILL_CONCEPT",
    ),
    problemFamilyRef: assertSlotKind(
      parseOpaqueRegistryRef(record.problemFamilyRef),
      SLOT_KINDS.problemFamilyRef,
      "PROBLEM_FAMILY",
    ),
    difficultyBandRef: assertSlotKind(
      parseOpaqueRegistryRef(record.difficultyBandRef),
      SLOT_KINDS.difficultyBandRef,
      "DIFFICULTY_BAND",
    ),
    taskProfileRef: assertSlotKind(
      parseOpaqueRegistryRef(record.taskProfileRef),
      SLOT_KINDS.taskProfileRef,
      "TASK_PROFILE",
    ),
    policyRef: assertSlotKind(
      parseOpaqueRegistryRef(record.policyRef),
      SLOT_KINDS.policyRef,
      "POLICY",
    ),
    capacityShortageCount: readPositiveBoundedSafeInteger(
      record.capacityShortageCount,
      QF0B_LIMITS.maxCapacityShortageCount,
      "CAPACITY_SHORTAGE_COUNT",
    ),
    occurredAt: readCanonicalUtc(record.occurredAt, "SCARCITY_OCCURRED_AT"),
  };
}

function deriveScarcityEventIdentities(
  material: BodylessBankScarcityEventMaterialV1,
): { readonly eventId: string; readonly eventDigest: string } {
  const identityDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QF0B_BODYLESS_BANK_SCARCITY_EVENT_ID_V1",
    material,
  });
  const eventId = `bse_${identityDigest.slice("sha256:".length)}`;
  const eventDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QF0B_BODYLESS_BANK_SCARCITY_EVENT_DIGEST_V1",
    eventId,
    material,
  });
  return Object.freeze({ eventId, eventDigest });
}

function buildScarcityEvent(
  material: BodylessBankScarcityEventMaterialV1,
): BodylessBankScarcityEventV1 {
  const identities = deriveScarcityEventIdentities(material);
  return Object.freeze({
    contractVersion: material.contractVersion,
    eventId: identities.eventId,
    eventDigest: identities.eventDigest,
    examPackageRef: material.examPackageRef,
    subjectRef: material.subjectRef,
    skillConceptRef: material.skillConceptRef,
    problemFamilyRef: material.problemFamilyRef,
    difficultyBandRef: material.difficultyBandRef,
    taskProfileRef: material.taskProfileRef,
    policyRef: material.policyRef,
    capacityShortageCount: material.capacityShortageCount,
    occurredAt: material.occurredAt,
  });
}

export function createOpaqueRegistryRefV1(value: unknown): OpaqueRegistryRefV1 {
  assertDependenciesV1();
  return buildOpaqueRegistryRef(parseOpaqueRegistryRefMaterial(value));
}

export function assertOpaqueRegistryRefV1(value: unknown): OpaqueRegistryRefV1 {
  assertDependenciesV1();
  return parseOpaqueRegistryRef(value);
}

export function createBodylessBankScarcityEventV1(
  value: unknown,
): BodylessBankScarcityEventV1 {
  assertDependenciesV1();
  return buildScarcityEvent(parseScarcityEventMaterial(value));
}

export function assertBodylessBankScarcityEventV1(
  value: unknown,
): BodylessBankScarcityEventV1 {
  assertDependenciesV1();
  const record = readClosedRecord(value, SCARCITY_EVENT_FIELDS, "SCARCITY_EVENT");
  const material = parseScarcityEventMaterial({
    contractVersion: record.contractVersion,
    examPackageRef: record.examPackageRef,
    subjectRef: record.subjectRef,
    skillConceptRef: record.skillConceptRef,
    problemFamilyRef: record.problemFamilyRef,
    difficultyBandRef: record.difficultyBandRef,
    taskProfileRef: record.taskProfileRef,
    policyRef: record.policyRef,
    capacityShortageCount: record.capacityShortageCount,
    occurredAt: record.occurredAt,
  });
  const eventId = readPattern(record.eventId, EVENT_ID_PATTERN, "EVENT_ID", 68);
  const eventDigest = readPattern(
    record.eventDigest,
    DIGEST_PATTERN,
    "EVENT_DIGEST",
    71,
  );
  const expected = buildScarcityEvent(material);
  if (eventId !== expected.eventId) fail("EVENT_ID_MISMATCH");
  if (eventDigest !== expected.eventDigest) fail("EVENT_DIGEST_MISMATCH");
  return expected;
}
