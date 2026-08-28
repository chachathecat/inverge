import { types as utilTypes } from "node:util";

import * as qf0a1 from "./bounded-canonical-json";
import {
  QF0A2_CONTRACT_VERSION,
  QF0A2_DECISION_OUTCOMES,
  QF0A2_DECISION_STATUSES,
  QF0A2_DENIAL_REASONS,
  QF0A2_ELIGIBLE_SOURCE_CLASSES,
  QF0A2_MODEL_ROLES,
  QF0A2_PURPOSE,
  QF0A2_QF0A1_DEPENDENCY_RECEIPT,
  QF0A2_RIGHTS_STATUSES,
  QF0A2_SOURCE_CLASSES,
  type CanonicalIntervalV1,
  type DecisionOutcomeV1,
  type DenialReasonV1,
  type DistinctModelExecutionIdentitiesInputV1,
  type ModelExecutionIdentityMaterialV1,
  type ModelExecutionIdentityV1,
  type RightsManifestMaterialV1,
  type RightsManifestRefV1,
  type SourceEligibilityAtUseInputV1,
  type SourceEligibilityDecisionInputV1,
  type SourceEligibilityDecisionV1,
} from "./trust-contracts";

const RIGHTS_MATERIAL_FIELDS = Object.freeze([
  "contractVersion",
  "manifestId",
  "manifestVersionId",
  "sourceClass",
  "status",
  "permittedPurpose",
  "validFrom",
  "validUntil",
  "policyVersion",
  "policyDigest",
] as const);

const RIGHTS_FIELDS = Object.freeze([
  ...RIGHTS_MATERIAL_FIELDS,
  "manifestDigest",
] as const);

const DECISION_INPUT_FIELDS = Object.freeze([
  "contractVersion",
  "sourceClass",
  "purpose",
  "decisionStatus",
  "evaluatedAt",
  "rightsManifest",
  "policyVersion",
  "policyDigest",
  "policyValidFrom",
  "policyValidUntil",
] as const);

const DECISION_FIELDS = Object.freeze([
  "contractVersion",
  "decisionId",
  "decisionDigest",
  "sourceClass",
  "purpose",
  "decisionStatus",
  "outcome",
  "evaluatedAt",
  "eligibilityInterval",
  "rightsManifest",
  "policyVersion",
  "policyDigest",
  "policyValidityInterval",
  "denialReasons",
] as const);

const INTERVAL_FIELDS = Object.freeze(["validFrom", "validUntil"] as const);

const AT_USE_FIELDS = Object.freeze([
  "decision",
  "rightsManifestAtUse",
  "useAt",
  "expectedSourceClass",
  "expectedPurpose",
  "expectedPolicyVersion",
  "expectedPolicyDigest",
] as const);

const MODEL_MATERIAL_FIELDS = Object.freeze([
  "contractVersion",
  "role",
  "providerId",
  "modelId",
  "modelVersion",
  "modelArtifactDigest",
  "executionId",
  "executionArtifactDigest",
  "configurationDigest",
  "executedAt",
] as const);

const MODEL_FIELDS = Object.freeze([
  ...MODEL_MATERIAL_FIELDS,
  "identityDigest",
] as const);

const SEPARATION_FIELDS = Object.freeze([
  "generator",
  "independentExecutions",
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

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const MANIFEST_ID_PATTERN = /^rm_[a-f0-9]{32}$/u;
const MANIFEST_VERSION_ID_PATTERN = /^rmv_[a-f0-9]{32}$/u;
const DECISION_ID_PATTERN = /^sed_[a-f0-9]{64}$/u;
const EXECUTION_ID_PATTERN = /^exec_[a-f0-9]{32}$/u;
const MACHINE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,95}$/u;
const POLICY_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const PURPOSE_PATTERN = /^[A-Z][A-Z0-9_]{0,95}$/u;
const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_INDEPENDENT_EXECUTIONS = 16;

function fail(code: string): never {
  throw new Error(`QF0A2_FAIL_CLOSED:${code}`);
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
  if (
    keys.length !== fields.length ||
    keys.some((key) => typeof key !== "string" || !fields.includes(key)) ||
    fields.some((field) => !keys.includes(field))
  ) {
    fail(`${label}_FIELD_SET_INVALID`);
  }

  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    if (typeof key !== "string") fail(`${label}_SYMBOL_KEY_UNSUPPORTED`);
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
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
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function readDenseArray(
  value: unknown,
  label: string,
  maxLength: number,
): unknown[] {
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
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false
  ) {
    fail(`${label}_LENGTH_INVALID`);
  }
  const length = lengthDescriptor.value as number;
  if (
    keys.length !== length + 1 ||
    keys.some((key) => typeof key !== "string") ||
    !keys.includes("length")
  ) {
    fail(`${label}_DENSE_ARRAY_REQUIRED`);
  }

  const entries: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (!keys.includes(key)) fail(`${label}_DENSE_ARRAY_REQUIRED`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_ELEMENT_REQUIRED`);
    }
    entries.push(descriptor.value);
  }
  return entries;
}

function readString(value: unknown, label: string, maxLength = 128): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    fail(`${label}_STRING_INVALID`);
  }
  return value;
}

function readPattern(
  value: unknown,
  pattern: RegExp,
  label: string,
  maxLength = 128,
): string {
  const stringValue = readString(value, label, maxLength);
  if (!pattern.test(stringValue)) fail(`${label}_FORMAT_INVALID`);
  return stringValue;
}

function readDigest(value: unknown, label: string): string {
  return readPattern(value, DIGEST_PATTERN, label, 71);
}

function readCanonicalUtc(value: unknown, label: string): string {
  const timestamp = readPattern(value, CANONICAL_UTC_PATTERN, label, 24);
  const milliseconds = Date.parse(timestamp);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== timestamp) {
    fail(`${label}_CANONICAL_UTC_INVALID`);
  }
  return timestamp;
}

function readClosedString<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  const stringValue = readString(value, label, 96);
  if (!(allowed as readonly string[]).includes(stringValue)) {
    fail(`${label}_UNSUPPORTED`);
  }
  return stringValue as T;
}

function toMilliseconds(value: string): number {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) fail("TIMESTAMP_INVALID");
  return milliseconds;
}

function assertOrderedInterval(interval: CanonicalIntervalV1, label: string): void {
  if (toMilliseconds(interval.validFrom) > toMilliseconds(interval.validUntil)) {
    fail(`${label}_ORDER_INVALID`);
  }
}

function readInterval(value: unknown, label: string): CanonicalIntervalV1 {
  const record = readClosedRecord(value, INTERVAL_FIELDS, label);
  const interval = Object.freeze({
    validFrom: readCanonicalUtc(record.validFrom, `${label}_VALID_FROM`),
    validUntil: readCanonicalUtc(record.validUntil, `${label}_VALID_UNTIL`),
  });
  assertOrderedInterval(interval, label);
  return interval;
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
    if (ordered[index] === value) fail("DUPLICATE_CLOSED_VALUE");
    ordered.splice(index, 0, value);
  }
  return ordered;
}

function plainQf0a1BoundaryReceipt(value: unknown): Record<string, unknown> {
  const record = readClosedRecord(value, QF0A1_RECEIPT_FIELDS, "QF0A1_RECEIPT");
  const exports = readDenseArray(
    record.allowedExportsExactly,
    "QF0A1_RECEIPT_EXPORTS",
    16,
  ).map((entry) => readString(entry, "QF0A1_RECEIPT_EXPORT", 96));
  const limits = readClosedRecord(
    record.limits,
    QF0A1_LIMIT_FIELDS,
    "QF0A1_RECEIPT_LIMITS",
  );
  return {
    contractVersion: record.contractVersion,
    scope: record.scope,
    activation: record.activation,
    remoteMutation: record.remoteMutation,
    downstreamAuthorityInstalled: record.downstreamAuthorityInstalled,
    allowedExportsExactly: exports,
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

export function assertQf0a1DependencyV1(): true {
  const actualExports = orderStringsUtf8(Object.keys(qf0a1));
  const requiredExports = orderStringsUtf8([
    ...QF0A2_QF0A1_DEPENDENCY_RECEIPT.requiredExportsExactly,
  ]);
  if (
    qf0a1.canonicalizeBoundedJsonV1(actualExports) !==
    qf0a1.canonicalizeBoundedJsonV1(requiredExports)
  ) {
    fail("QF0A1_EXPORT_SURFACE_DRIFT");
  }

  const actualReceipt = plainQf0a1BoundaryReceipt(
    qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT,
  );
  const expectedReceipt = plainQf0a1BoundaryReceipt(
    QF0A2_QF0A1_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceipt,
  );
  if (
    qf0a1.canonicalizeBoundedJsonV1(actualReceipt) !==
    qf0a1.canonicalizeBoundedJsonV1(expectedReceipt) ||
    qf0a1.digestCanonicalJsonV1(actualReceipt) !==
      QF0A2_QF0A1_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest
  ) {
    fail("QF0A1_SOURCE_ONLY_BOUNDARY_DRIFT");
  }
  return true;
}

function parseRightsMaterial(value: unknown): RightsManifestMaterialV1 {
  const record = readClosedRecord(value, RIGHTS_MATERIAL_FIELDS, "RIGHTS_MATERIAL");
  const material: RightsManifestMaterialV1 = {
    contractVersion: readClosedString(
      record.contractVersion,
      ["RightsManifestRefV1"] as const,
      "RIGHTS_CONTRACT_VERSION",
    ),
    manifestId: readPattern(
      record.manifestId,
      MANIFEST_ID_PATTERN,
      "RIGHTS_MANIFEST_ID",
    ),
    manifestVersionId: readPattern(
      record.manifestVersionId,
      MANIFEST_VERSION_ID_PATTERN,
      "RIGHTS_MANIFEST_VERSION_ID",
    ),
    sourceClass: readClosedString(
      record.sourceClass,
      QF0A2_SOURCE_CLASSES,
      "RIGHTS_SOURCE_CLASS",
    ),
    status: readClosedString(
      record.status,
      QF0A2_RIGHTS_STATUSES,
      "RIGHTS_STATUS",
    ),
    permittedPurpose: readPattern(
      record.permittedPurpose,
      PURPOSE_PATTERN,
      "RIGHTS_PERMITTED_PURPOSE",
      96,
    ),
    validFrom: readCanonicalUtc(record.validFrom, "RIGHTS_VALID_FROM"),
    validUntil: readCanonicalUtc(record.validUntil, "RIGHTS_VALID_UNTIL"),
    policyVersion: readPattern(
      record.policyVersion,
      POLICY_VERSION_PATTERN,
      "RIGHTS_POLICY_VERSION",
      64,
    ),
    policyDigest: readDigest(record.policyDigest, "RIGHTS_POLICY_DIGEST"),
  };
  assertOrderedInterval(material, "RIGHTS_INTERVAL");
  qf0a1.canonicalizeBoundedJsonV1(material);
  return material;
}

function buildRightsManifestInternal(
  material: RightsManifestMaterialV1,
): RightsManifestRefV1 {
  return Object.freeze({
    ...material,
    manifestDigest: qf0a1.digestCanonicalJsonV1(material),
  });
}

function validateRightsManifestInternal(value: unknown): RightsManifestRefV1 {
  const record = readClosedRecord(value, RIGHTS_FIELDS, "RIGHTS_MANIFEST");
  const material = parseRightsMaterial({
    contractVersion: record.contractVersion,
    manifestId: record.manifestId,
    manifestVersionId: record.manifestVersionId,
    sourceClass: record.sourceClass,
    status: record.status,
    permittedPurpose: record.permittedPurpose,
    validFrom: record.validFrom,
    validUntil: record.validUntil,
    policyVersion: record.policyVersion,
    policyDigest: record.policyDigest,
  });
  const suppliedDigest = readDigest(record.manifestDigest, "RIGHTS_MANIFEST_DIGEST");
  const expected = buildRightsManifestInternal(material);
  if (suppliedDigest !== expected.manifestDigest) {
    fail("RIGHTS_MANIFEST_DIGEST_MISMATCH");
  }
  return expected;
}

export function createRightsManifestRefV1(
  value: RightsManifestMaterialV1,
): RightsManifestRefV1 {
  assertQf0a1DependencyV1();
  return buildRightsManifestInternal(parseRightsMaterial(value));
}

export function assertRightsManifestRefV1(value: unknown): RightsManifestRefV1 {
  assertQf0a1DependencyV1();
  return validateRightsManifestInternal(value);
}

function parseDecisionInput(value: unknown): SourceEligibilityDecisionInputV1 {
  const record = readClosedRecord(value, DECISION_INPUT_FIELDS, "DECISION_INPUT");
  const policyInterval = Object.freeze({
    validFrom: readCanonicalUtc(record.policyValidFrom, "POLICY_VALID_FROM"),
    validUntil: readCanonicalUtc(record.policyValidUntil, "POLICY_VALID_UNTIL"),
  });
  assertOrderedInterval(policyInterval, "POLICY_INTERVAL");
  const input: SourceEligibilityDecisionInputV1 = {
    contractVersion: readClosedString(
      record.contractVersion,
      ["SourceEligibilityDecisionV1"] as const,
      "DECISION_CONTRACT_VERSION",
    ),
    sourceClass: readClosedString(
      record.sourceClass,
      QF0A2_SOURCE_CLASSES,
      "DECISION_SOURCE_CLASS",
    ),
    purpose: readPattern(record.purpose, PURPOSE_PATTERN, "DECISION_PURPOSE", 96),
    decisionStatus: readClosedString(
      record.decisionStatus,
      QF0A2_DECISION_STATUSES,
      "DECISION_STATUS",
    ),
    evaluatedAt: readCanonicalUtc(record.evaluatedAt, "DECISION_EVALUATED_AT"),
    rightsManifest: validateRightsManifestInternal(record.rightsManifest),
    policyVersion: readPattern(
      record.policyVersion,
      POLICY_VERSION_PATTERN,
      "DECISION_POLICY_VERSION",
      64,
    ),
    policyDigest: readDigest(record.policyDigest, "DECISION_POLICY_DIGEST"),
    policyValidFrom: policyInterval.validFrom,
    policyValidUntil: policyInterval.validUntil,
  };
  qf0a1.canonicalizeBoundedJsonV1({
    ...input,
    rightsManifest: { ...input.rightsManifest },
  });
  return input;
}

function timeInside(value: string, interval: CanonicalIntervalV1): boolean {
  const milliseconds = toMilliseconds(value);
  return (
    milliseconds >= toMilliseconds(interval.validFrom) &&
    milliseconds <= toMilliseconds(interval.validUntil)
  );
}

function deriveDenialReasons(
  input: SourceEligibilityDecisionInputV1,
  derivedInterval: CanonicalIntervalV1,
): DenialReasonV1[] {
  const reasons: DenialReasonV1[] = [];
  if (input.decisionStatus !== "CURRENT") {
    reasons.push("DECISION_STATUS_NOT_CURRENT");
  }
  if (!(QF0A2_ELIGIBLE_SOURCE_CLASSES as readonly string[]).includes(input.sourceClass)) {
    reasons.push("SOURCE_CLASS_NOT_ELIGIBLE");
  }
  if (input.purpose !== QF0A2_PURPOSE) reasons.push("PURPOSE_NOT_AUTHORIZED");
  if (input.rightsManifest.status !== "ACTIVE") {
    reasons.push("RIGHTS_STATUS_NOT_ACTIVE");
  }
  if (input.sourceClass !== input.rightsManifest.sourceClass) {
    reasons.push("SOURCE_CLASS_MISMATCH");
  }
  if (input.purpose !== input.rightsManifest.permittedPurpose) {
    reasons.push("PURPOSE_MISMATCH");
  }
  if (input.policyVersion !== input.rightsManifest.policyVersion) {
    reasons.push("POLICY_VERSION_MISMATCH");
  }
  if (input.policyDigest !== input.rightsManifest.policyDigest) {
    reasons.push("POLICY_DIGEST_MISMATCH");
  }
  if (!timeInside(input.evaluatedAt, input.rightsManifest)) {
    reasons.push("EVALUATED_AT_OUTSIDE_RIGHTS_INTERVAL");
  }
  if (
    !timeInside(input.evaluatedAt, {
      validFrom: input.policyValidFrom,
      validUntil: input.policyValidUntil,
    })
  ) {
    reasons.push("EVALUATED_AT_OUTSIDE_POLICY_INTERVAL");
  }
  if (toMilliseconds(derivedInterval.validFrom) > toMilliseconds(derivedInterval.validUntil)) {
    reasons.push("ELIGIBILITY_INTERVAL_EMPTY");
  }
  return orderStringsUtf8(reasons) as DenialReasonV1[];
}

function decisionIdentityMaterial(
  input: SourceEligibilityDecisionInputV1,
): Record<string, unknown> {
  return {
    contractVersion: input.contractVersion,
    sourceClass: input.sourceClass,
    purpose: input.purpose,
    decisionStatus: input.decisionStatus,
    evaluatedAt: input.evaluatedAt,
    rightsManifestIdentity: {
      manifestId: input.rightsManifest.manifestId,
      manifestVersionId: input.rightsManifest.manifestVersionId,
      manifestDigest: input.rightsManifest.manifestDigest,
    },
    policyVersion: input.policyVersion,
    policyDigest: input.policyDigest,
    policyValidityInterval: {
      validFrom: input.policyValidFrom,
      validUntil: input.policyValidUntil,
    },
  };
}

function decisionDigestMaterial(
  decision: Omit<SourceEligibilityDecisionV1, "decisionDigest">,
): Record<string, unknown> {
  return {
    contractVersion: decision.contractVersion,
    decisionId: decision.decisionId,
    sourceClass: decision.sourceClass,
    purpose: decision.purpose,
    decisionStatus: decision.decisionStatus,
    outcome: decision.outcome,
    evaluatedAt: decision.evaluatedAt,
    eligibilityInterval:
      decision.eligibilityInterval === null
        ? null
        : { ...decision.eligibilityInterval },
    rightsManifest: { ...decision.rightsManifest },
    policyVersion: decision.policyVersion,
    policyDigest: decision.policyDigest,
    policyValidityInterval: { ...decision.policyValidityInterval },
    denialReasons: [...decision.denialReasons],
  };
}

function buildDecisionInternal(
  input: SourceEligibilityDecisionInputV1,
): SourceEligibilityDecisionV1 {
  const derivedInterval = Object.freeze({
    validFrom: new Date(
      Math.max(
        toMilliseconds(input.evaluatedAt),
        toMilliseconds(input.rightsManifest.validFrom),
        toMilliseconds(input.policyValidFrom),
      ),
    ).toISOString(),
    validUntil: new Date(
      Math.min(
        toMilliseconds(input.rightsManifest.validUntil),
        toMilliseconds(input.policyValidUntil),
      ),
    ).toISOString(),
  });
  const denialReasons = deriveDenialReasons(input, derivedInterval);
  const outcome: DecisionOutcomeV1 =
    denialReasons.length === 0 ? "ELIGIBLE" : "DENIED";
  const identityDigest = qf0a1.digestCanonicalJsonV1(decisionIdentityMaterial(input));
  const decisionWithoutDigest: Omit<SourceEligibilityDecisionV1, "decisionDigest"> = {
    contractVersion: "SourceEligibilityDecisionV1",
    decisionId: `sed_${identityDigest.slice("sha256:".length)}`,
    sourceClass: input.sourceClass,
    purpose: input.purpose,
    decisionStatus: input.decisionStatus,
    outcome,
    evaluatedAt: input.evaluatedAt,
    eligibilityInterval: outcome === "ELIGIBLE" ? derivedInterval : null,
    rightsManifest: input.rightsManifest,
    policyVersion: input.policyVersion,
    policyDigest: input.policyDigest,
    policyValidityInterval: Object.freeze({
      validFrom: input.policyValidFrom,
      validUntil: input.policyValidUntil,
    }),
    denialReasons: Object.freeze([...denialReasons]),
  };
  const decisionDigest = qf0a1.digestCanonicalJsonV1(
    decisionDigestMaterial(decisionWithoutDigest),
  );
  return Object.freeze({ ...decisionWithoutDigest, decisionDigest });
}

function decisionToPlain(decision: SourceEligibilityDecisionV1): Record<string, unknown> {
  return {
    ...decisionDigestMaterial(decision),
    decisionDigest: decision.decisionDigest,
  };
}

function validateDecisionInternal(value: unknown): SourceEligibilityDecisionV1 {
  const record = readClosedRecord(value, DECISION_FIELDS, "SOURCE_DECISION");
  const decisionId = readPattern(
    record.decisionId,
    DECISION_ID_PATTERN,
    "DECISION_ID",
    68,
  );
  const decisionDigest = readDigest(record.decisionDigest, "DECISION_DIGEST");
  const outcome = readClosedString(
    record.outcome,
    QF0A2_DECISION_OUTCOMES,
    "DECISION_OUTCOME",
  );
  const eligibilityInterval =
    record.eligibilityInterval === null
      ? null
      : readInterval(record.eligibilityInterval, "ELIGIBILITY_INTERVAL");
  const policyInterval = readInterval(
    record.policyValidityInterval,
    "POLICY_VALIDITY_INTERVAL",
  );
  const denialReasons = readDenseArray(
    record.denialReasons,
    "DENIAL_REASONS",
    QF0A2_DENIAL_REASONS.length,
  ).map((reason) =>
    readClosedString(reason, QF0A2_DENIAL_REASONS, "DENIAL_REASON"),
  );
  if (new Set(denialReasons).size !== denialReasons.length) {
    fail("DENIAL_REASON_DUPLICATE");
  }

  const expected = buildDecisionInternal(
    parseDecisionInput({
      contractVersion: record.contractVersion,
      sourceClass: record.sourceClass,
      purpose: record.purpose,
      decisionStatus: record.decisionStatus,
      evaluatedAt: record.evaluatedAt,
      rightsManifest: record.rightsManifest,
      policyVersion: record.policyVersion,
      policyDigest: record.policyDigest,
      policyValidFrom: policyInterval.validFrom,
      policyValidUntil: policyInterval.validUntil,
    }),
  );
  const supplied: SourceEligibilityDecisionV1 = {
    contractVersion: "SourceEligibilityDecisionV1",
    decisionId,
    decisionDigest,
    sourceClass: readClosedString(
      record.sourceClass,
      QF0A2_SOURCE_CLASSES,
      "DECISION_SOURCE_CLASS",
    ),
    purpose: readPattern(record.purpose, PURPOSE_PATTERN, "DECISION_PURPOSE", 96),
    decisionStatus: readClosedString(
      record.decisionStatus,
      QF0A2_DECISION_STATUSES,
      "DECISION_STATUS",
    ),
    outcome,
    evaluatedAt: readCanonicalUtc(record.evaluatedAt, "DECISION_EVALUATED_AT"),
    eligibilityInterval,
    rightsManifest: validateRightsManifestInternal(record.rightsManifest),
    policyVersion: readPattern(
      record.policyVersion,
      POLICY_VERSION_PATTERN,
      "DECISION_POLICY_VERSION",
      64,
    ),
    policyDigest: readDigest(record.policyDigest, "DECISION_POLICY_DIGEST"),
    policyValidityInterval: policyInterval,
    denialReasons,
  };
  if (
    qf0a1.canonicalizeBoundedJsonV1(decisionToPlain(supplied)) !==
    qf0a1.canonicalizeBoundedJsonV1(decisionToPlain(expected))
  ) {
    fail("SOURCE_DECISION_DERIVATION_OR_DIGEST_MISMATCH");
  }
  return expected;
}

export function createSourceEligibilityDecisionV1(
  value: SourceEligibilityDecisionInputV1,
): SourceEligibilityDecisionV1 {
  assertQf0a1DependencyV1();
  return buildDecisionInternal(parseDecisionInput(value));
}

export function assertSourceEligibilityDecisionV1(
  value: unknown,
): SourceEligibilityDecisionV1 {
  assertQf0a1DependencyV1();
  return validateDecisionInternal(value);
}

function assertExact(value: string, expected: string, code: string): void {
  if (value !== expected) fail(code);
}

function assertTimeInside(value: string, interval: CanonicalIntervalV1, code: string): void {
  if (!timeInside(value, interval)) fail(code);
}

export function assertSourceEligibilityAtUseV1(
  value: SourceEligibilityAtUseInputV1,
): true {
  assertQf0a1DependencyV1();
  const record = readClosedRecord(value, AT_USE_FIELDS, "AT_USE_INPUT");
  const decision = validateDecisionInternal(record.decision);
  const rightsAtUse = validateRightsManifestInternal(record.rightsManifestAtUse);
  const useAt = readCanonicalUtc(record.useAt, "USE_AT");
  const expectedSourceClass = readClosedString(
    record.expectedSourceClass,
    QF0A2_SOURCE_CLASSES,
    "EXPECTED_SOURCE_CLASS",
  );
  const expectedPurpose = readPattern(
    record.expectedPurpose,
    PURPOSE_PATTERN,
    "EXPECTED_PURPOSE",
    96,
  );
  const expectedPolicyVersion = readPattern(
    record.expectedPolicyVersion,
    POLICY_VERSION_PATTERN,
    "EXPECTED_POLICY_VERSION",
    64,
  );
  const expectedPolicyDigest = readDigest(
    record.expectedPolicyDigest,
    "EXPECTED_POLICY_DIGEST",
  );

  if (decision.decisionStatus !== "CURRENT") fail("AT_USE_DECISION_NOT_CURRENT");
  if (decision.outcome !== "ELIGIBLE" || decision.eligibilityInterval === null) {
    fail("AT_USE_DECISION_NOT_ELIGIBLE");
  }
  if (rightsAtUse.status !== "ACTIVE") fail("AT_USE_RIGHTS_NOT_ACTIVE");
  assertExact(
    rightsAtUse.manifestId,
    decision.rightsManifest.manifestId,
    "AT_USE_MANIFEST_ID_MISMATCH",
  );
  assertExact(
    rightsAtUse.manifestVersionId,
    decision.rightsManifest.manifestVersionId,
    "AT_USE_MANIFEST_VERSION_MISMATCH",
  );
  assertExact(
    rightsAtUse.manifestDigest,
    decision.rightsManifest.manifestDigest,
    "AT_USE_MANIFEST_DIGEST_MISMATCH",
  );
  assertExact(
    expectedSourceClass,
    decision.sourceClass,
    "AT_USE_EXPECTED_SOURCE_CLASS_MISMATCH",
  );
  assertExact(
    rightsAtUse.sourceClass,
    expectedSourceClass,
    "AT_USE_RIGHTS_SOURCE_CLASS_MISMATCH",
  );
  assertExact(expectedPurpose, QF0A2_PURPOSE, "AT_USE_PURPOSE_NOT_AUTHORIZED");
  assertExact(
    expectedPurpose,
    decision.purpose,
    "AT_USE_EXPECTED_PURPOSE_MISMATCH",
  );
  assertExact(
    rightsAtUse.permittedPurpose,
    expectedPurpose,
    "AT_USE_RIGHTS_PURPOSE_MISMATCH",
  );
  assertExact(
    expectedPolicyVersion,
    decision.policyVersion,
    "AT_USE_EXPECTED_POLICY_VERSION_MISMATCH",
  );
  assertExact(
    expectedPolicyDigest,
    decision.policyDigest,
    "AT_USE_EXPECTED_POLICY_DIGEST_MISMATCH",
  );
  assertExact(
    rightsAtUse.policyVersion,
    expectedPolicyVersion,
    "AT_USE_RIGHTS_POLICY_VERSION_MISMATCH",
  );
  assertExact(
    rightsAtUse.policyDigest,
    expectedPolicyDigest,
    "AT_USE_RIGHTS_POLICY_DIGEST_MISMATCH",
  );
  if (toMilliseconds(useAt) < toMilliseconds(decision.evaluatedAt)) {
    fail("AT_USE_BEFORE_EVALUATION");
  }
  assertTimeInside(useAt, decision.eligibilityInterval, "AT_USE_OUTSIDE_ELIGIBILITY");
  assertTimeInside(useAt, rightsAtUse, "AT_USE_OUTSIDE_RIGHTS");
  assertTimeInside(
    useAt,
    decision.policyValidityInterval,
    "AT_USE_OUTSIDE_POLICY",
  );
  return true;
}

function parseModelMaterial(value: unknown): ModelExecutionIdentityMaterialV1 {
  const record = readClosedRecord(value, MODEL_MATERIAL_FIELDS, "MODEL_MATERIAL");
  const material: ModelExecutionIdentityMaterialV1 = {
    contractVersion: readClosedString(
      record.contractVersion,
      ["ModelExecutionIdentityV1"] as const,
      "MODEL_CONTRACT_VERSION",
    ),
    role: readClosedString(record.role, QF0A2_MODEL_ROLES, "MODEL_ROLE"),
    providerId: readPattern(
      record.providerId,
      MACHINE_ID_PATTERN,
      "MODEL_PROVIDER_ID",
      96,
    ),
    modelId: readPattern(record.modelId, MACHINE_ID_PATTERN, "MODEL_ID", 96),
    modelVersion: readPattern(
      record.modelVersion,
      MACHINE_ID_PATTERN,
      "MODEL_VERSION",
      96,
    ),
    modelArtifactDigest: readDigest(
      record.modelArtifactDigest,
      "MODEL_ARTIFACT_DIGEST",
    ),
    executionId: readPattern(
      record.executionId,
      EXECUTION_ID_PATTERN,
      "MODEL_EXECUTION_ID",
      37,
    ),
    executionArtifactDigest: readDigest(
      record.executionArtifactDigest,
      "EXECUTION_ARTIFACT_DIGEST",
    ),
    configurationDigest: readDigest(
      record.configurationDigest,
      "MODEL_CONFIGURATION_DIGEST",
    ),
    executedAt: readCanonicalUtc(record.executedAt, "MODEL_EXECUTED_AT"),
  };
  qf0a1.canonicalizeBoundedJsonV1(material);
  return material;
}

function buildModelIdentityInternal(
  material: ModelExecutionIdentityMaterialV1,
): ModelExecutionIdentityV1 {
  return Object.freeze({
    ...material,
    identityDigest: qf0a1.digestCanonicalJsonV1(material),
  });
}

function validateModelIdentityInternal(value: unknown): ModelExecutionIdentityV1 {
  const record = readClosedRecord(value, MODEL_FIELDS, "MODEL_IDENTITY");
  const material = parseModelMaterial({
    contractVersion: record.contractVersion,
    role: record.role,
    providerId: record.providerId,
    modelId: record.modelId,
    modelVersion: record.modelVersion,
    modelArtifactDigest: record.modelArtifactDigest,
    executionId: record.executionId,
    executionArtifactDigest: record.executionArtifactDigest,
    configurationDigest: record.configurationDigest,
    executedAt: record.executedAt,
  });
  const suppliedDigest = readDigest(record.identityDigest, "MODEL_IDENTITY_DIGEST");
  const expected = buildModelIdentityInternal(material);
  if (suppliedDigest !== expected.identityDigest) {
    fail("MODEL_IDENTITY_DIGEST_MISMATCH");
  }
  return expected;
}

export function createModelExecutionIdentityV1(
  value: ModelExecutionIdentityMaterialV1,
): ModelExecutionIdentityV1 {
  assertQf0a1DependencyV1();
  return buildModelIdentityInternal(parseModelMaterial(value));
}

export function assertModelExecutionIdentityV1(
  value: unknown,
): ModelExecutionIdentityV1 {
  assertQf0a1DependencyV1();
  return validateModelIdentityInternal(value);
}

export function assertDistinctModelExecutionIdentitiesV1(
  value: DistinctModelExecutionIdentitiesInputV1,
): true {
  assertQf0a1DependencyV1();
  const record = readClosedRecord(value, SEPARATION_FIELDS, "SEPARATION_INPUT");
  const generator = validateModelIdentityInternal(record.generator);
  const independentExecutions = readDenseArray(
    record.independentExecutions,
    "INDEPENDENT_EXECUTIONS",
    MAX_INDEPENDENT_EXECUTIONS,
  ).map((identity) => validateModelIdentityInternal(identity));
  if (independentExecutions.length === 0) fail("INDEPENDENT_EXECUTION_REQUIRED");
  if (generator.role !== "GENERATOR") fail("GENERATOR_ROLE_REQUIRED");

  const executionIds = new Set<string>([generator.executionId]);
  const identityDigests = new Set<string>([generator.identityDigest]);
  for (const identity of independentExecutions) {
    if (identity.role === "GENERATOR") fail("INDEPENDENT_ROLE_MUST_NOT_BE_GENERATOR");
    if (identityDigests.has(identity.identityDigest)) {
      fail("IDENTITY_DIGEST_NOT_DISTINCT");
    }
    if (executionIds.has(identity.executionId)) fail("EXECUTION_ID_NOT_DISTINCT");
    executionIds.add(identity.executionId);
    identityDigests.add(identity.identityDigest);
  }
  return true;
}

export { QF0A2_CONTRACT_VERSION };
