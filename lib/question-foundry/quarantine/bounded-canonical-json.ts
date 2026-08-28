import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

const CONTRACT_VERSION = "QF0A1BoundedCanonicalJsonV1" as const;

export const QF0A1_LIMITS = Object.freeze({
  contractVersion: CONTRACT_VERSION,
  maxCanonicalOutputBytes: 262_144,
  maxInspectedUtf16CodeUnits: 262_144,
  maxEntries: 10_000,
  maxDepth: 32,
  maxComparisonSteps: 524_288,
  surrogateLookaheadOutsideInspectionLimit: 0,
});

const ALLOWED_EXPORTS = Object.freeze([
  "QF0A1_LIMITS",
  "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "canonicalizeBoundedJsonV1",
  "compareUtf8BytesV1",
  "digestCanonicalJsonV1",
] as const);

export const QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: CONTRACT_VERSION,
  scope: "INERT_SOURCE_ONLY_UTILITY" as const,
  activation: "OFF" as const,
  remoteMutation: "ZERO" as const,
  downstreamAuthorityInstalled: false,
  allowedExportsExactly: ALLOWED_EXPORTS,
  limits: QF0A1_LIMITS,
});

type StringByteMode = "RAW_UTF8" | "JSON_STRING";

interface CanonicalTraversalState {
  inspectedUtf16CodeUnits: number;
  canonicalOutputBytes: number;
  entries: number;
  comparisonSteps: number;
  seen: Set<object>;
  chunks: string[];
}

interface InspectedString {
  rawUtf8Bytes: Uint8Array | null;
}

interface CanonicalKey {
  key: string;
  serialized: string;
  utf8Bytes: Uint8Array;
  value: unknown;
}

function fail(code: string): never {
  throw new Error(`QF0A1_FAIL_CLOSED:${code}`);
}

function createTraversalState(): CanonicalTraversalState {
  return {
    inspectedUtf16CodeUnits: 0,
    canonicalOutputBytes: 0,
    entries: 0,
    comparisonSteps: 0,
    seen: new Set(),
    chunks: [],
  };
}

function reserveCanonicalOutputBytes(
  state: CanonicalTraversalState,
  byteCount: number,
): void {
  if (!Number.isSafeInteger(byteCount) || byteCount < 0) {
    fail("OUTPUT_BYTE_RESERVATION_INVALID");
  }
  if (
    byteCount >
    QF0A1_LIMITS.maxCanonicalOutputBytes - state.canonicalOutputBytes
  ) {
    fail("CANONICAL_OUTPUT_BYTE_LIMIT_EXCEEDED");
  }
  state.canonicalOutputBytes += byteCount;
}

function inspectCodeUnit(
  state: CanonicalTraversalState,
  value: string,
  index: number,
): number {
  if (
    state.inspectedUtf16CodeUnits >=
    QF0A1_LIMITS.maxInspectedUtf16CodeUnits
  ) {
    fail("UTF16_INSPECTION_LIMIT_EXCEEDED");
  }
  state.inspectedUtf16CodeUnits += 1;
  return value.charCodeAt(index);
}

function appendRawUtf8Bytes(
  target: number[] | null,
  firstCodeUnit: number,
  secondCodeUnit?: number,
): void {
  if (target === null) return;
  if (secondCodeUnit !== undefined) {
    const codePoint =
      0x1_0000 +
      ((firstCodeUnit - 0xd800) << 10) +
      (secondCodeUnit - 0xdc00);
    target.push(
      0xf0 | (codePoint >> 18),
      0x80 | ((codePoint >> 12) & 0x3f),
      0x80 | ((codePoint >> 6) & 0x3f),
      0x80 | (codePoint & 0x3f),
    );
    return;
  }
  if (firstCodeUnit <= 0x7f) {
    target.push(firstCodeUnit);
  } else if (firstCodeUnit <= 0x7ff) {
    target.push(
      0xc0 | (firstCodeUnit >> 6),
      0x80 | (firstCodeUnit & 0x3f),
    );
  } else {
    target.push(
      0xe0 | (firstCodeUnit >> 12),
      0x80 | ((firstCodeUnit >> 6) & 0x3f),
      0x80 | (firstCodeUnit & 0x3f),
    );
  }
}

function inspectStringBounded(
  state: CanonicalTraversalState,
  value: string,
  mode: StringByteMode,
  retainRawUtf8Bytes: boolean,
): InspectedString {
  const rawBytes: number[] | null = retainRawUtf8Bytes ? [] : null;
  if (mode === "JSON_STRING") reserveCanonicalOutputBytes(state, 2);

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = inspectCodeUnit(state, value, index);
    let secondCodeUnit: number | undefined;
    let rawByteCost: number;

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) fail("UNPAIRED_HIGH_SURROGATE");
      secondCodeUnit = inspectCodeUnit(state, value, index + 1);
      if (secondCodeUnit < 0xdc00 || secondCodeUnit > 0xdfff) {
        fail("UNPAIRED_HIGH_SURROGATE");
      }
      rawByteCost = 4;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      fail("UNPAIRED_LOW_SURROGATE");
    } else if (codeUnit <= 0x7f) {
      rawByteCost = 1;
    } else if (codeUnit <= 0x7ff) {
      rawByteCost = 2;
    } else {
      rawByteCost = 3;
    }

    let outputByteCost = rawByteCost;
    if (mode === "JSON_STRING" && secondCodeUnit === undefined) {
      if (codeUnit === 0x22 || codeUnit === 0x5c) {
        outputByteCost = 2;
      } else if (
        codeUnit === 0x08 ||
        codeUnit === 0x09 ||
        codeUnit === 0x0a ||
        codeUnit === 0x0c ||
        codeUnit === 0x0d
      ) {
        outputByteCost = 2;
      } else if (codeUnit <= 0x1f) {
        outputByteCost = 6;
      }
    }

    reserveCanonicalOutputBytes(state, outputByteCost);
    appendRawUtf8Bytes(rawBytes, codeUnit, secondCodeUnit);
  }

  return {
    rawUtf8Bytes: rawBytes === null ? null : Uint8Array.from(rawBytes),
  };
}

function consumeComparisonStep(state: CanonicalTraversalState): void {
  if (state.comparisonSteps >= QF0A1_LIMITS.maxComparisonSteps) {
    fail("COMPARISON_STEP_LIMIT_EXCEEDED");
  }
  state.comparisonSteps += 1;
}

function compareCachedUtf8Bytes(
  left: Uint8Array,
  right: Uint8Array,
  state: CanonicalTraversalState,
): number {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    consumeComparisonStep(state);
    if (left[index] !== right[index]) {
      return left[index] < right[index] ? -1 : 1;
    }
  }
  if (left.length === right.length) return 0;
  return left.length < right.length ? -1 : 1;
}

export function compareUtf8BytesV1(left: string, right: string): number {
  const state = createTraversalState();
  const leftInspection = inspectStringBounded(state, left, "RAW_UTF8", true);
  const rightInspection = inspectStringBounded(state, right, "RAW_UTF8", true);
  if (
    leftInspection.rawUtf8Bytes === null ||
    rightInspection.rawUtf8Bytes === null
  ) {
    fail("COMPARATOR_BYTES_MISSING");
  }
  return compareCachedUtf8Bytes(
    leftInspection.rawUtf8Bytes,
    rightInspection.rawUtf8Bytes,
    state,
  );
}

function stableOrderCanonicalKeys(
  keys: readonly CanonicalKey[],
  state: CanonicalTraversalState,
): CanonicalKey[] {
  if (keys.length <= 1) return [...keys];
  const middle = Math.floor(keys.length / 2);
  const left = stableOrderCanonicalKeys(keys.slice(0, middle), state);
  const right = stableOrderCanonicalKeys(keys.slice(middle), state);
  const merged: CanonicalKey[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (
      compareCachedUtf8Bytes(
        left[leftIndex].utf8Bytes,
        right[rightIndex].utf8Bytes,
        state,
      ) <= 0
    ) {
      merged.push(left[leftIndex]);
      leftIndex += 1;
    } else {
      merged.push(right[rightIndex]);
      rightIndex += 1;
    }
  }
  while (leftIndex < left.length) {
    merged.push(left[leftIndex]);
    leftIndex += 1;
  }
  while (rightIndex < right.length) {
    merged.push(right[rightIndex]);
    rightIndex += 1;
  }
  return merged;
}

function addEntries(state: CanonicalTraversalState, count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) fail("ENTRY_COUNT_INVALID");
  if (count > QF0A1_LIMITS.maxEntries - state.entries) {
    fail("ENTRY_LIMIT_EXCEEDED");
  }
  state.entries += count;
}

function readPrototype(value: object): object | null {
  try {
    return Object.getPrototypeOf(value);
  } catch {
    fail("PROTOTYPE_UNINSPECTABLE");
  }
}

function readOwnKeysOnce(value: object): (string | symbol)[] {
  try {
    return Reflect.ownKeys(value);
  } catch {
    fail("OWN_KEYS_UNINSPECTABLE");
  }
}

function readDescriptor(value: object, key: PropertyKey): PropertyDescriptor {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    fail("PROPERTY_DESCRIPTOR_UNINSPECTABLE");
  }
  if (descriptor === undefined) fail("PROPERTY_DESCRIPTOR_MISSING");
  return descriptor;
}

function appendReservedChunk(state: CanonicalTraversalState, chunk: string): void {
  reserveCanonicalOutputBytes(state, chunk.length);
  state.chunks.push(chunk);
}

function appendCanonicalStringValue(
  state: CanonicalTraversalState,
  value: string,
): void {
  inspectStringBounded(state, value, "JSON_STRING", false);
  const serialized = JSON.stringify(value);
  if (typeof serialized !== "string") fail("STRING_SERIALIZATION_FAILED");
  state.chunks.push(serialized);
}

function appendCanonicalArray(
  value: unknown[],
  depth: number,
  state: CanonicalTraversalState,
): void {
  if (readPrototype(value) !== Array.prototype) {
    fail("ARRAY_PROTOTYPE_UNSUPPORTED");
  }
  const ownKeys = readOwnKeysOnce(value);
  if (ownKeys.length > QF0A1_LIMITS.maxEntries + 1) {
    fail("ENTRY_LIMIT_EXCEEDED");
  }
  if (ownKeys.some((key) => typeof key !== "string")) {
    fail("ARRAY_SYMBOL_KEY_UNSUPPORTED");
  }

  const lengthDescriptor = readDescriptor(value, "length");
  if (
    !("value" in lengthDescriptor) ||
    lengthDescriptor.enumerable !== false ||
    lengthDescriptor.configurable !== false ||
    lengthDescriptor.writable !== true ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    fail("ARRAY_LENGTH_DESCRIPTOR_UNSUPPORTED");
  }
  const length = lengthDescriptor.value as number;
  addEntries(state, length);
  if (ownKeys.length !== length + 1) {
    fail("ARRAY_MUST_BE_DENSE_WITHOUT_EXTRA_KEYS");
  }
  const keySet = new Set(ownKeys as string[]);
  if (!keySet.has("length")) fail("ARRAY_LENGTH_KEY_MISSING");

  const values: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = String(index);
    if (!keySet.has(key)) fail("ARRAY_MUST_BE_DENSE_WITHOUT_EXTRA_KEYS");
    const descriptor = readDescriptor(value, key);
    if (!("value" in descriptor) || descriptor.enumerable !== true) {
      fail("ARRAY_ELEMENT_DESCRIPTOR_UNSUPPORTED");
    }
    values.push(descriptor.value);
  }

  appendReservedChunk(state, "[");
  values.forEach((entry, index) => {
    if (index > 0) appendReservedChunk(state, ",");
    appendCanonicalValue(entry, depth + 1, state);
  });
  appendReservedChunk(state, "]");
}

function appendCanonicalObject(
  value: object,
  depth: number,
  state: CanonicalTraversalState,
): void {
  const prototype = readPrototype(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("OBJECT_PROTOTYPE_UNSUPPORTED");
  }
  const ownKeys = readOwnKeysOnce(value);
  addEntries(state, ownKeys.length);
  appendReservedChunk(state, "{");

  const canonicalKeys: CanonicalKey[] = [];
  for (const key of ownKeys) {
    if (typeof key !== "string") fail("OBJECT_SYMBOL_KEY_UNSUPPORTED");
    const descriptor = readDescriptor(value, key);
    if (!("value" in descriptor) || descriptor.enumerable !== true) {
      fail("OBJECT_PROPERTY_DESCRIPTOR_UNSUPPORTED");
    }
    const inspection = inspectStringBounded(state, key, "JSON_STRING", true);
    if (inspection.rawUtf8Bytes === null) fail("OBJECT_KEY_BYTES_MISSING");
    const serialized = JSON.stringify(key);
    if (typeof serialized !== "string") fail("OBJECT_KEY_SERIALIZATION_FAILED");
    canonicalKeys.push({
      key,
      serialized,
      utf8Bytes: inspection.rawUtf8Bytes,
      value: descriptor.value,
    });
  }

  const orderedKeys = stableOrderCanonicalKeys(canonicalKeys, state);
  orderedKeys.forEach((entry, index) => {
    if (index > 0) appendReservedChunk(state, ",");
    state.chunks.push(entry.serialized);
    appendReservedChunk(state, ":");
    appendCanonicalValue(entry.value, depth + 1, state);
  });
  appendReservedChunk(state, "}");
}

function appendCanonicalValue(
  value: unknown,
  depth: number,
  state: CanonicalTraversalState,
): void {
  if (depth > QF0A1_LIMITS.maxDepth) fail("DEPTH_LIMIT_EXCEEDED");
  if (value === null) {
    appendReservedChunk(state, "null");
    return;
  }
  if (typeof value === "string") {
    appendCanonicalStringValue(state, value);
    return;
  }
  if (typeof value === "boolean") {
    appendReservedChunk(state, value ? "true" : "false");
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("NON_FINITE_NUMBER_UNSUPPORTED");
    const serialized = JSON.stringify(Object.is(value, -0) ? 0 : value);
    if (typeof serialized !== "string") fail("NUMBER_SERIALIZATION_FAILED");
    appendReservedChunk(state, serialized);
    return;
  }
  if (typeof value !== "object") fail("NON_JSON_VALUE_UNSUPPORTED");
  if (utilTypes.isProxy(value)) fail("PROXY_UNSUPPORTED");
  if (state.seen.has(value)) fail("CYCLIC_VALUE_UNSUPPORTED");

  state.seen.add(value);
  try {
    if (Array.isArray(value)) {
      appendCanonicalArray(value, depth, state);
    } else {
      appendCanonicalObject(value, depth, state);
    }
  } finally {
    state.seen.delete(value);
  }
}

export function canonicalizeBoundedJsonV1(value: unknown): string {
  const state = createTraversalState();
  appendCanonicalValue(value, 0, state);
  return state.chunks.join("");
}

export function digestCanonicalJsonV1(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(canonicalizeBoundedJsonV1(value), "utf8")
    .digest("hex")}`;
}
