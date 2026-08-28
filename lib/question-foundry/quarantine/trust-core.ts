import { createHash } from "node:crypto";

import {
  QF0A_CONTRACT_VERSION,
  QF0A_DECISION_STATUSES,
  QF0A_MODEL_ROLES,
  QF0A_PURPOSES,
  QF0A_RIGHTS_STATUSES,
  QF0A_SOURCE_CLASSES,
  type ModelExecutionIdentityV1,
  type RightsManifestRefV1,
  type SourceEligibilityDecisionV1,
} from "./trust-contracts";

const UTF8 = new TextEncoder();
const MAX_CANONICAL_BYTES = 262_144;
const MAX_CANONICAL_DEPTH = 32;
const MAX_CANONICAL_ENTRIES = 10_000;
const MAX_TEXT_LENGTH = 256;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const ELIGIBLE_SOURCE_CLASSES = new Set<(typeof QF0A_SOURCE_CLASSES)[number]>([
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
]);

function fail(code: string): never {
  throw new Error(`QF0A_FAIL_CLOSED:${code}`);
}

function plainRecord(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    fail(`${label}_MUST_BE_PLAIN_OBJECT`);
  }
  return value as Record<string, unknown>;
}

function assertWellFormedUnicode(value: string, label: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
        fail(`${label}_UNPAIRED_SURROGATE`);
      }
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      fail(`${label}_UNPAIRED_SURROGATE`);
    }
  }
}

function utf8ByteLengthBounded(value: string, label: string): number {
  assertWellFormedUnicode(value, label);
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) bytes += 1;
    else if (codeUnit <= 0x7ff) bytes += 2;
    else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
    if (bytes > MAX_CANONICAL_BYTES) fail("CANONICAL_BYTE_LIMIT_EXCEEDED");
  }
  return bytes;
}

function compareEncodedBytes(left: Uint8Array, right: Uint8Array): number {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] < right[index] ? -1 : 1;
    }
  }
  if (left.length === right.length) return 0;
  return left.length < right.length ? -1 : 1;
}

export function compareUtf8BytesV1(left: string, right: string): number {
  utf8ByteLengthBounded(left, "UTF8_LEFT");
  utf8ByteLengthBounded(right, "UTF8_RIGHT");
  const leftBytes = UTF8.encode(left);
  const rightBytes = UTF8.encode(right);
  return compareEncodedBytes(leftBytes, rightBytes);
}

function ownEnumerableDataKeys(value: object, label: string): string[] {
  const keys = Reflect.ownKeys(value);
  if (keys.length > MAX_CANONICAL_ENTRIES) {
    fail("CANONICAL_ENTRY_LIMIT_EXCEEDED");
  }
  if (keys.some((key) => typeof key !== "string")) {
    fail(`${label}_SYMBOL_KEY_UNSUPPORTED`);
  }
  for (const key of keys as string[]) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_PROPERTY_DESCRIPTOR_UNSUPPORTED`);
    }
    assertWellFormedUnicode(key, `${label}_KEY`);
  }
  return keys as string[];
}

function assertExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  const candidate = plainRecord(value, label);
  const actual = ownEnumerableDataKeys(candidate, label).sort(compareUtf8BytesV1);
  const expected = [...expectedKeys].sort(compareUtf8BytesV1);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}_FIELDS_MISMATCH`);
  }
  return candidate;
}

function assertText(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_TEXT_LENGTH ||
    value.trim() !== value
  ) {
    fail(`${label}_INVALID`);
  }
  assertWellFormedUnicode(value, label);
}

function assertDigest(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) {
    fail(`${label}_INVALID_DIGEST`);
  }
}

function assertCanonicalInstant(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string") fail(`${label}_INVALID_TIME`);
  const instant = Date.parse(value);
  if (!Number.isFinite(instant) || new Date(instant).toISOString() !== value) {
    fail(`${label}_INVALID_TIME`);
  }
}

function assertSourceClass(
  value: unknown,
): asserts value is (typeof QF0A_SOURCE_CLASSES)[number] {
  if (!QF0A_SOURCE_CLASSES.includes(value as (typeof QF0A_SOURCE_CLASSES)[number])) {
    fail("UNDECLARED_SOURCE_CLASS");
  }
}

interface CanonicalState {
  entries: number;
  seen: Set<object>;
  bytes: number;
  chunks: string[];
}

function appendCanonicalChunk(
  state: CanonicalState,
  chunk: string,
  byteLength = chunk.length,
): void {
  if (state.bytes + byteLength > MAX_CANONICAL_BYTES) {
    fail("CANONICAL_BYTE_LIMIT_EXCEEDED");
  }
  state.bytes += byteLength;
  state.chunks.push(chunk);
}

function jsonStringByteLengthBounded(value: string, label: string): number {
  assertWellFormedUnicode(value, label);
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit === 0x22 || codeUnit === 0x5c) bytes += 2;
    else if ([0x08, 0x09, 0x0a, 0x0c, 0x0d].includes(codeUnit)) bytes += 2;
    else if (codeUnit <= 0x1f) bytes += 6;
    else if (codeUnit <= 0x7f) bytes += 1;
    else if (codeUnit <= 0x7ff) bytes += 2;
    else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
    if (bytes > MAX_CANONICAL_BYTES) fail("CANONICAL_BYTE_LIMIT_EXCEEDED");
  }
  return bytes;
}

function appendCanonicalString(
  state: CanonicalState,
  value: string,
  label: string,
): void {
  const byteLength = jsonStringByteLengthBounded(value, label);
  if (state.bytes + byteLength > MAX_CANONICAL_BYTES) {
    fail("CANONICAL_BYTE_LIMIT_EXCEEDED");
  }
  appendCanonicalChunk(state, JSON.stringify(value), byteLength);
}

function arrayDataDescriptors(
  value: unknown[],
  path: string,
): PropertyDescriptor[] {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    fail(`JSON_ARRAY_AT_${path}_PROTOTYPE_UNSUPPORTED`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail(`JSON_ARRAY_AT_${path}_SYMBOL_KEY_UNSUPPORTED`);
  }
  const expectedKeys = new Set<string>(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
  }
  if (
    ownKeys.length !== expectedKeys.size ||
    (ownKeys as string[]).some((key) => !expectedKeys.has(key))
  ) {
    fail(`JSON_ARRAY_AT_${path}_MUST_BE_DENSE_WITHOUT_EXTRA_KEYS`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    lengthDescriptor.enumerable !== false
  ) {
    fail(`JSON_ARRAY_AT_${path}_LENGTH_DESCRIPTOR_UNSUPPORTED`);
  }
  const descriptors: PropertyDescriptor[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail(`JSON_ARRAY_AT_${path}_ELEMENT_DESCRIPTOR_UNSUPPORTED`);
    }
    descriptors.push(descriptor);
  }
  return descriptors;
}

function appendCanonicalJsonValue(
  value: unknown,
  path: string,
  depth: number,
  state: CanonicalState,
): void {
  if (depth > MAX_CANONICAL_DEPTH) fail("CANONICAL_DEPTH_LIMIT_EXCEEDED");
  if (value === null) {
    appendCanonicalChunk(state, "null");
    return;
  }
  if (typeof value === "string") {
    appendCanonicalString(state, value, `JSON_STRING_AT_${path}`);
    return;
  }
  if (typeof value === "boolean") {
    appendCanonicalChunk(state, value ? "true" : "false");
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`NON_FINITE_NUMBER_AT_${path}`);
    appendCanonicalChunk(state, JSON.stringify(Object.is(value, -0) ? 0 : value));
    return;
  }
  if (typeof value !== "object") fail(`NON_JSON_VALUE_AT_${path}`);
  if (state.seen.has(value)) fail(`CYCLIC_VALUE_AT_${path}`);
  state.seen.add(value);
  try {
    if (Array.isArray(value)) {
      state.entries += value.length;
      if (state.entries > MAX_CANONICAL_ENTRIES) {
        fail("CANONICAL_ENTRY_LIMIT_EXCEEDED");
      }
      const descriptors = arrayDataDescriptors(value, path);
      appendCanonicalChunk(state, "[");
      descriptors.forEach((descriptor, index) => {
        if (index > 0) appendCanonicalChunk(state, ",");
        appendCanonicalJsonValue(
          descriptor.value,
          `${path}[${index}]`,
          depth + 1,
          state,
        );
      });
      appendCanonicalChunk(state, "]");
      return;
    }
    const source = plainRecord(value, `JSON_VALUE_AT_${path}`);
    const keys = ownEnumerableDataKeys(source, `JSON_VALUE_AT_${path}`);
    state.entries += keys.length;
    if (state.entries > MAX_CANONICAL_ENTRIES) {
      fail("CANONICAL_ENTRY_LIMIT_EXCEEDED");
    }
    const measuredKeys = keys.map((key) => {
      const serializedByteLength = jsonStringByteLengthBounded(
        key,
        `JSON_KEY_AT_${path}`,
      );
      return {
        key,
        serializedByteLength,
      };
    });
    const keyStructureBytes = measuredKeys.reduce(
      (total, key, index) =>
        total + key.serializedByteLength + 1 + (index > 0 ? 1 : 0),
      0,
    );
    if (state.bytes + 2 + keyStructureBytes > MAX_CANONICAL_BYTES) {
      fail("CANONICAL_BYTE_LIMIT_EXCEEDED");
    }
    const sortableKeys = measuredKeys.map((key) => ({
      ...key,
      encoded: UTF8.encode(key.key),
    }));
    sortableKeys.sort((left, right) => compareEncodedBytes(left.encoded, right.encoded));
    appendCanonicalChunk(state, "{");
    sortableKeys.forEach(({ key, serializedByteLength }, index) => {
      if (index > 0) appendCanonicalChunk(state, ",");
      appendCanonicalChunk(state, JSON.stringify(key), serializedByteLength);
      appendCanonicalChunk(state, ":");
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        fail(`JSON_VALUE_AT_${path}_PROPERTY_DESCRIPTOR_CHANGED`);
      }
      appendCanonicalJsonValue(descriptor.value, `${path}.value`, depth + 1, state);
    });
    appendCanonicalChunk(state, "}");
  } finally {
    state.seen.delete(value);
  }
}

function immutableJson<T>(value: T): T {
  const clone = JSON.parse(canonicalizeBoundedJsonV1(value)) as T;
  const freeze = (entry: unknown): void => {
    if (entry === null || typeof entry !== "object" || Object.isFrozen(entry)) return;
    for (const child of Object.values(entry)) freeze(child);
    Object.freeze(entry);
  };
  freeze(clone);
  return clone;
}

export function canonicalizeBoundedJsonV1(value: unknown): string {
  const state: CanonicalState = {
    entries: 0,
    seen: new Set(),
    bytes: 0,
    chunks: [],
  };
  appendCanonicalJsonValue(value, "$", 0, state);
  return state.chunks.join("");
}

export function digestCanonicalJsonV1(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(canonicalizeBoundedJsonV1(value), "utf8")
    .digest("hex")}`;
}

export function createRightsManifestRefV1(
  input: Omit<RightsManifestRefV1, "contractVersion" | "manifestDigest">,
): RightsManifestRefV1 {
  assertExactKeys(
    input,
    [
      "manifestId",
      "manifestVersionId",
      "sourceClass",
      "status",
      "permittedPurpose",
      "validFrom",
      "validUntil",
      "policyVersion",
      "policyDigest",
    ],
    "RIGHTS_MANIFEST_INPUT",
  );
  assertText(input.manifestId, "MANIFEST_ID");
  assertText(input.manifestVersionId, "MANIFEST_VERSION_ID");
  assertSourceClass(input.sourceClass);
  if (!QF0A_RIGHTS_STATUSES.includes(input.status)) fail("RIGHTS_STATUS_INVALID");
  if (!QF0A_PURPOSES.includes(input.permittedPurpose)) fail("RIGHTS_PURPOSE_INVALID");
  assertCanonicalInstant(input.validFrom, "RIGHTS_VALID_FROM");
  assertCanonicalInstant(input.validUntil, "RIGHTS_VALID_UNTIL");
  if (Date.parse(input.validFrom) > Date.parse(input.validUntil)) {
    fail("RIGHTS_VALIDITY_WINDOW_INVALID");
  }
  assertText(input.policyVersion, "RIGHTS_POLICY_VERSION");
  assertDigest(input.policyDigest, "RIGHTS_POLICY");
  const material = {
    contractVersion: "RightsManifestRefV1" as const,
    ...input,
  };
  return immutableJson({
    ...material,
    manifestDigest: digestCanonicalJsonV1(material),
  });
}

export function validateRightsManifestRefV1(
  input: RightsManifestRefV1,
): RightsManifestRefV1 {
  assertExactKeys(
    input,
    [
      "contractVersion",
      "manifestId",
      "manifestVersionId",
      "manifestDigest",
      "sourceClass",
      "status",
      "permittedPurpose",
      "validFrom",
      "validUntil",
      "policyVersion",
      "policyDigest",
    ],
    "RIGHTS_MANIFEST",
  );
  if (input.contractVersion !== "RightsManifestRefV1") {
    fail("RIGHTS_CONTRACT_VERSION_MISMATCH");
  }
  const rebuilt = createRightsManifestRefV1({
    manifestId: input.manifestId,
    manifestVersionId: input.manifestVersionId,
    sourceClass: input.sourceClass,
    status: input.status,
    permittedPurpose: input.permittedPurpose,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    policyVersion: input.policyVersion,
    policyDigest: input.policyDigest,
  });
  assertDigest(input.manifestDigest, "RIGHTS_MANIFEST");
  if (input.manifestDigest !== rebuilt.manifestDigest) {
    fail("RIGHTS_MANIFEST_DIGEST_MISMATCH");
  }
  return immutableJson(input);
}

export function createSourceEligibilityDecisionV1(input: {
  sourceClass: (typeof QF0A_SOURCE_CLASSES)[number];
  purpose: (typeof QF0A_PURPOSES)[number];
  decisionStatus: SourceEligibilityDecisionV1["decisionStatus"];
  evaluatedAt: string;
  rightsManifestRef: RightsManifestRefV1;
  policyVersion: string;
  policyDigest: string;
  policyValidFrom: string;
  policyValidUntil: string;
}): SourceEligibilityDecisionV1 {
  assertExactKeys(
    input,
    [
      "sourceClass",
      "purpose",
      "decisionStatus",
      "evaluatedAt",
      "rightsManifestRef",
      "policyVersion",
      "policyDigest",
      "policyValidFrom",
      "policyValidUntil",
    ],
    "SOURCE_DECISION_INPUT",
  );
  assertSourceClass(input.sourceClass);
  if (!QF0A_PURPOSES.includes(input.purpose)) fail("SOURCE_PURPOSE_INVALID");
  if (!QF0A_DECISION_STATUSES.includes(input.decisionStatus)) {
    fail("SOURCE_DECISION_STATUS_INVALID");
  }
  assertCanonicalInstant(input.evaluatedAt, "SOURCE_DECISION_EVALUATED_AT");
  assertText(input.policyVersion, "SOURCE_POLICY_VERSION");
  assertDigest(input.policyDigest, "SOURCE_POLICY");
  assertCanonicalInstant(input.policyValidFrom, "POLICY_VALID_FROM");
  assertCanonicalInstant(input.policyValidUntil, "POLICY_VALID_UNTIL");
  if (Date.parse(input.policyValidFrom) > Date.parse(input.policyValidUntil)) {
    fail("POLICY_VALIDITY_WINDOW_INVALID");
  }
  const rights = validateRightsManifestRefV1(input.rightsManifestRef);
  const denialReasons: string[] = [];
  const evaluatedAt = Date.parse(input.evaluatedAt);

  if (input.decisionStatus !== "CURRENT") {
    denialReasons.push(`SOURCE_DECISION_${input.decisionStatus}`);
  }
  if (!ELIGIBLE_SOURCE_CLASSES.has(input.sourceClass)) {
    denialReasons.push(`SOURCE_CLASS_${input.sourceClass}_DENIED`);
  }
  if (rights.status !== "ACTIVE") denialReasons.push(`RIGHTS_${rights.status}`);
  if (rights.sourceClass !== input.sourceClass) {
    denialReasons.push("RIGHTS_SOURCE_CLASS_MISMATCH");
  }
  if (rights.permittedPurpose !== input.purpose) {
    denialReasons.push("RIGHTS_PURPOSE_MISMATCH");
  }
  if (
    rights.policyVersion !== input.policyVersion ||
    rights.policyDigest !== input.policyDigest
  ) {
    denialReasons.push("RIGHTS_POLICY_MISMATCH");
  }
  if (
    evaluatedAt < Date.parse(rights.validFrom) ||
    evaluatedAt > Date.parse(rights.validUntil)
  ) {
    denialReasons.push("EVALUATION_OUTSIDE_RIGHTS_INTERVAL");
  }
  if (
    evaluatedAt < Date.parse(input.policyValidFrom) ||
    evaluatedAt > Date.parse(input.policyValidUntil)
  ) {
    denialReasons.push("EVALUATION_OUTSIDE_POLICY_INTERVAL");
  }

  const derivedValidFrom = new Date(
    Math.max(
      evaluatedAt,
      Date.parse(rights.validFrom),
      Date.parse(input.policyValidFrom),
    ),
  ).toISOString();
  const derivedValidUntil = new Date(
    Math.min(Date.parse(rights.validUntil), Date.parse(input.policyValidUntil)),
  ).toISOString();
  if (Date.parse(derivedValidFrom) > Date.parse(derivedValidUntil)) {
    denialReasons.push("NO_ELIGIBILITY_INTERVAL_INTERSECTION");
  }

  const eligible = denialReasons.length === 0;
  const material = {
    contractVersion: "SourceEligibilityDecisionV1" as const,
    sourceClass: input.sourceClass,
    purpose: input.purpose,
    decisionStatus: input.decisionStatus,
    outcome: eligible ? ("ELIGIBLE" as const) : ("DENIED" as const),
    evaluatedAt: input.evaluatedAt,
    eligibilityInterval: eligible
      ? { validFrom: derivedValidFrom, validUntil: derivedValidUntil }
      : null,
    rightsManifestRef: rights,
    policyVersion: input.policyVersion,
    policyDigest: input.policyDigest,
    policyValidFrom: input.policyValidFrom,
    policyValidUntil: input.policyValidUntil,
    denialReasons: [...new Set(denialReasons)].sort(compareUtf8BytesV1),
  };
  const decisionDigest = digestCanonicalJsonV1(material);
  return immutableJson({
    ...material,
    decisionId: `qf0a_decision_${decisionDigest.slice("sha256:".length)}`,
    decisionDigest,
  });
}

export function validateSourceEligibilityDecisionV1(
  input: SourceEligibilityDecisionV1,
): SourceEligibilityDecisionV1 {
  assertExactKeys(
    input,
    [
      "contractVersion",
      "decisionId",
      "decisionDigest",
      "sourceClass",
      "purpose",
      "decisionStatus",
      "outcome",
      "evaluatedAt",
      "eligibilityInterval",
      "rightsManifestRef",
      "policyVersion",
      "policyDigest",
      "policyValidFrom",
      "policyValidUntil",
      "denialReasons",
    ],
    "SOURCE_DECISION",
  );
  if (input.contractVersion !== "SourceEligibilityDecisionV1") {
    fail("SOURCE_DECISION_CONTRACT_VERSION_MISMATCH");
  }
  const rebuilt = createSourceEligibilityDecisionV1({
    sourceClass: input.sourceClass,
    purpose: input.purpose,
    decisionStatus: input.decisionStatus,
    evaluatedAt: input.evaluatedAt,
    rightsManifestRef: input.rightsManifestRef,
    policyVersion: input.policyVersion,
    policyDigest: input.policyDigest,
    policyValidFrom: input.policyValidFrom,
    policyValidUntil: input.policyValidUntil,
  });
  if (canonicalizeBoundedJsonV1(input) !== canonicalizeBoundedJsonV1(rebuilt)) {
    fail("SOURCE_DECISION_IDENTITY_OR_BINDING_MISMATCH");
  }
  return immutableJson(input);
}

export function assertSourceEligibilityAtUseV1(input: {
  decision: SourceEligibilityDecisionV1;
  rightsManifestAtUse: RightsManifestRefV1;
  useAt: string;
  expectedSourceClass: (typeof QF0A_SOURCE_CLASSES)[number];
  expectedPurpose: (typeof QF0A_PURPOSES)[number];
  expectedPolicyVersion: string;
  expectedPolicyDigest: string;
}): SourceEligibilityDecisionV1 {
  assertExactKeys(
    input,
    [
      "decision",
      "rightsManifestAtUse",
      "useAt",
      "expectedSourceClass",
      "expectedPurpose",
      "expectedPolicyVersion",
      "expectedPolicyDigest",
    ],
    "AT_USE_INPUT",
  );
  const decision = validateSourceEligibilityDecisionV1(input.decision);
  const rightsAtUse = validateRightsManifestRefV1(input.rightsManifestAtUse);
  assertCanonicalInstant(input.useAt, "USE_AT");
  assertSourceClass(input.expectedSourceClass);
  if (!QF0A_PURPOSES.includes(input.expectedPurpose)) fail("AT_USE_PURPOSE_INVALID");
  assertText(input.expectedPolicyVersion, "AT_USE_POLICY_VERSION");
  assertDigest(input.expectedPolicyDigest, "AT_USE_POLICY");

  if (decision.decisionStatus !== "CURRENT") fail("AT_USE_DECISION_NOT_CURRENT");
  if (decision.outcome !== "ELIGIBLE" || decision.eligibilityInterval === null) {
    fail("AT_USE_DECISION_NOT_ELIGIBLE");
  }
  if (rightsAtUse.status !== "ACTIVE") fail("AT_USE_RIGHTS_NOT_ACTIVE");
  if (
    canonicalizeBoundedJsonV1(rightsAtUse) !==
    canonicalizeBoundedJsonV1(decision.rightsManifestRef)
  ) {
    fail("AT_USE_RIGHTS_BINDING_DRIFT");
  }
  if (
    decision.sourceClass !== input.expectedSourceClass ||
    rightsAtUse.sourceClass !== input.expectedSourceClass
  ) {
    fail("AT_USE_SOURCE_CLASS_MISMATCH");
  }
  if (
    decision.purpose !== input.expectedPurpose ||
    rightsAtUse.permittedPurpose !== input.expectedPurpose
  ) {
    fail("AT_USE_PURPOSE_MISMATCH");
  }
  if (
    decision.policyVersion !== input.expectedPolicyVersion ||
    rightsAtUse.policyVersion !== input.expectedPolicyVersion ||
    decision.policyDigest !== input.expectedPolicyDigest ||
    rightsAtUse.policyDigest !== input.expectedPolicyDigest
  ) {
    fail("AT_USE_POLICY_MISMATCH");
  }

  const useAt = Date.parse(input.useAt);
  if (useAt < Date.parse(decision.evaluatedAt)) {
    fail("AT_USE_BEFORE_DECISION_EVALUATION");
  }
  if (
    useAt < Date.parse(decision.eligibilityInterval.validFrom) ||
    useAt > Date.parse(decision.eligibilityInterval.validUntil)
  ) {
    fail("AT_USE_OUTSIDE_DERIVED_ELIGIBILITY_INTERVAL");
  }
  if (
    useAt < Date.parse(rightsAtUse.validFrom) ||
    useAt > Date.parse(rightsAtUse.validUntil)
  ) {
    fail("AT_USE_OUTSIDE_RIGHTS_INTERVAL");
  }
  return decision;
}

export function createModelExecutionIdentityV1(
  input: Omit<ModelExecutionIdentityV1, "contractVersion" | "identityDigest">,
): ModelExecutionIdentityV1 {
  assertExactKeys(
    input,
    [
      "role",
      "providerId",
      "modelId",
      "modelVersion",
      "modelArtifactDigest",
      "executionId",
      "executionArtifactDigest",
      "configurationDigest",
      "executedAt",
    ],
    "MODEL_EXECUTION_INPUT",
  );
  if (!QF0A_MODEL_ROLES.includes(input.role)) fail("MODEL_ROLE_INVALID");
  for (const [label, value] of [
    ["MODEL_PROVIDER_ID", input.providerId],
    ["MODEL_ID", input.modelId],
    ["MODEL_VERSION", input.modelVersion],
    ["MODEL_EXECUTION_ID", input.executionId],
  ] as const) {
    assertText(value, label);
  }
  assertDigest(input.modelArtifactDigest, "MODEL_ARTIFACT");
  assertDigest(input.executionArtifactDigest, "MODEL_EXECUTION_ARTIFACT");
  assertDigest(input.configurationDigest, "MODEL_CONFIGURATION");
  assertCanonicalInstant(input.executedAt, "MODEL_EXECUTED_AT");
  const material = {
    contractVersion: "ModelExecutionIdentityV1" as const,
    ...input,
  };
  return immutableJson({
    ...material,
    identityDigest: digestCanonicalJsonV1(material),
  });
}

export function validateModelExecutionIdentityV1(
  input: ModelExecutionIdentityV1,
): ModelExecutionIdentityV1 {
  assertExactKeys(
    input,
    [
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
      "identityDigest",
    ],
    "MODEL_EXECUTION_IDENTITY",
  );
  if (input.contractVersion !== "ModelExecutionIdentityV1") {
    fail("MODEL_EXECUTION_CONTRACT_VERSION_MISMATCH");
  }
  const rebuilt = createModelExecutionIdentityV1({
    role: input.role,
    providerId: input.providerId,
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    modelArtifactDigest: input.modelArtifactDigest,
    executionId: input.executionId,
    executionArtifactDigest: input.executionArtifactDigest,
    configurationDigest: input.configurationDigest,
    executedAt: input.executedAt,
  });
  if (input.identityDigest !== rebuilt.identityDigest) {
    fail("MODEL_EXECUTION_IDENTITY_DIGEST_MISMATCH");
  }
  return immutableJson(input);
}

export function assertQf0ATrustOnlyBoundaryV1(): Readonly<{
  contractVersion: typeof QF0A_CONTRACT_VERSION;
  modelExecution: false;
  network: false;
  database: false;
  persistence: false;
  runtime: false;
}> {
  return Object.freeze({
    contractVersion: QF0A_CONTRACT_VERSION,
    modelExecution: false,
    network: false,
    database: false,
    persistence: false,
    runtime: false,
  });
}
