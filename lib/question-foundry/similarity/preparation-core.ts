import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import * as qf0a1 from "../quarantine/bounded-canonical-json";
import * as qf0iContracts from "../quarantine/candidate-contracts";
import * as qf0i from "../quarantine/candidate-core";
import {
  QFS1A_BODY_PART_KINDS,
  QFS1A_LIMITS,
  QFS1A_QF0_DEPENDENCY_RECEIPT,
  QFS1A_REFERENCE_PURPOSES,
  QFS1A_REFERENCE_SOURCE_CLASSES,
  type PreparedSimilarityBodySequenceV1,
  type PreparedSimilarityCorpusV1,
  type PreparedSimilarityReferenceSequenceV1,
  type PreparedSimilarityTokenV1,
  type QFS1ABodyPartKind,
  type QFS1AReferencePurpose,
  type QFS1AReferenceSourceClass,
  type QFS1ATokenKind,
  type SimilarityMandatoryWorkAccountingV1,
} from "./preparation-contracts";

const INPUT_FIELDS = Object.freeze([
  "contractVersion",
  "candidate",
  "candidateParts",
  "corpus",
] as const);
const BODY_PART_FIELDS = Object.freeze([
  "partId",
  "partKind",
  "bodyDigest",
  "bodyText",
] as const);
const REFERENCE_FIELDS = Object.freeze([
  "referenceId",
  "referenceDigest",
  "purpose",
  "sourceClass",
  "version",
  "parts",
  "manifestDigest",
] as const);
const CORPUS_FIELDS = Object.freeze([
  "contractVersion",
  "corpusId",
  "version",
  "references",
  "corpusManifestDigest",
] as const);

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const PART_ID_PATTERN = /^part_[a-z0-9][a-z0-9._-]{0,63}$/u;
const REFERENCE_ID_PATTERN = /^qfsr_[a-f0-9]{64}$/u;
const CORPUS_ID_PATTERN = /^qfsc_[a-f0-9]{64}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,63}$/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const NUMBER = /\p{N}/u;

const GENERIC_LEXEMES = new Set<string>([
  "a",
  "an",
  "and",
  "answer",
  "calculate",
  "find",
  "for",
  "given",
  "in",
  "is",
  "of",
  "or",
  "the",
  "to",
  "value",
  "what",
  "다음",
  "값",
  "계산",
  "구하시오",
  "것",
  "대하여",
]);

interface BodyPartSnapshot {
  readonly partId: string;
  readonly partKind: QFS1ABodyPartKind;
  readonly bodyDigest: string;
  readonly bodyText: string;
  readonly characterCount: number;
}

interface ReferenceSnapshot {
  readonly referenceId: string;
  readonly referenceDigest: string;
  readonly purpose: QFS1AReferencePurpose;
  readonly sourceClass: QFS1AReferenceSourceClass;
  readonly version: string;
  readonly parts: readonly BodyPartSnapshot[];
  readonly manifestDigest: string;
}

interface PreparationSnapshot {
  readonly candidate: qf0iContracts.QuarantinedQuestionCandidateV1;
  readonly candidateParts: readonly BodyPartSnapshot[];
  readonly candidateBodyManifestDigest: string;
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly references: readonly ReferenceSnapshot[];
  readonly corpusManifestDigest: string;
}

interface MandatoryWorkState {
  readonly fixedReferenceOverheadUnits: number;
  originalCharacters: number;
  normalizedCharacters: number;
  observedTokens: number;
  retainedTokens: number;
  mandatoryTotalWorkUnits: number;
}

function fail(code: string): never {
  throw new Error(`QFS1A_FAIL_CLOSED:${code}`);
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

  const result: Record<string, unknown> = {};
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
    result[field] = descriptor.value;
  }
  return result;
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

  let prototype: object | null;
  let keys: (string | symbol)[];
  let lengthDescriptor: PropertyDescriptor | undefined;
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  } catch {
    fail(`${label}_UNINSPECTABLE`);
  }
  if (prototype !== Array.prototype) fail(`${label}_PROTOTYPE_UNSUPPORTED`);
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
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    } catch {
      fail(`${label}_ELEMENT_UNINSPECTABLE`);
    }
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

function readString(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${label}_INVALID`);
  return value;
}

function readDigest(value: unknown, label: string): string {
  return readString(value, DIGEST_PATTERN, label);
}

function readEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    fail(`${label}_INVALID`);
  }
  return value as T;
}

function orderByUtf8<T>(values: readonly T[], key: (value: T) => string): T[] {
  const ordered: T[] = [];
  for (const value of values) {
    let index = 0;
    while (
      index < ordered.length &&
      qf0a1.compareUtf8BytesV1(key(ordered[index]), key(value)) < 0
    ) {
      index += 1;
    }
    ordered.splice(index, 0, value);
  }
  return ordered;
}

function assertUniqueUtf8<T>(
  values: readonly T[],
  key: (value: T) => string,
  label: string,
): void {
  const ordered = orderByUtf8(values, key);
  for (let index = 1; index < ordered.length; index += 1) {
    if (key(ordered[index - 1]) === key(ordered[index])) fail(`${label}_DUPLICATE`);
  }
}

function assertExactExports(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    qf0a1.canonicalizeBoundedJsonV1(orderByUtf8(actual, (value) => value)) !==
    qf0a1.canonicalizeBoundedJsonV1(orderByUtf8(expected, (value) => value))
  ) {
    fail(`${label}_EXPORT_SURFACE_DRIFT`);
  }
}

function plainBoundary(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function assertDependenciesV1(): void {
  assertExactExports(
    Object.keys(qf0a1),
    QFS1A_QF0_DEPENDENCY_RECEIPT.qf0a1ExportsExactly,
    "QF0A1",
  );
  assertExactExports(
    Object.keys(qf0iContracts),
    QFS1A_QF0_DEPENDENCY_RECEIPT.qf0iContractExportsExactly,
    "QF0I_CONTRACTS",
  );
  assertExactExports(
    Object.keys(qf0i),
    QFS1A_QF0_DEPENDENCY_RECEIPT.qf0iCoreExportsExactly,
    "QF0I_CORE",
  );
  if (
    qf0a1.digestCanonicalJsonV1(
      plainBoundary(qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ) !== QFS1A_QF0_DEPENDENCY_RECEIPT.qf0a1SourceOnlyBoundaryReceiptDigest
  ) {
    fail("QF0A1_SOURCE_ONLY_BOUNDARY_DRIFT");
  }
  if (
    qf0a1.digestCanonicalJsonV1(
      plainBoundary(qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ) !== QFS1A_QF0_DEPENDENCY_RECEIPT.qf0iSourceOnlyBoundaryReceiptDigest
  ) {
    fail("QF0I_SOURCE_ONLY_BOUNDARY_DRIFT");
  }
}

function snapshotBodyPart(value: unknown, label: string): BodyPartSnapshot {
  const record = readClosedRecord(value, BODY_PART_FIELDS, label);
  const partId = readString(record.partId, PART_ID_PATTERN, `${label}_PART_ID`);
  const partKind = readEnum(
    record.partKind,
    QFS1A_BODY_PART_KINDS,
    `${label}_PART_KIND`,
  );
  const bodyDigest = readDigest(record.bodyDigest, `${label}_BODY_DIGEST`);
  if (typeof record.bodyText !== "string") fail(`${label}_BODY_TEXT_REQUIRED`);
  if (record.bodyText.length > QFS1A_LIMITS.maxCharactersPerBody) {
    fail(`${label}_CHARACTER_LIMIT_EXCEEDED`);
  }
  return Object.freeze({
    partId,
    partKind,
    bodyDigest,
    bodyText: record.bodyText,
    characterCount: record.bodyText.length,
  });
}

function snapshotAndOrderParts(
  values: readonly unknown[],
  label: string,
): readonly BodyPartSnapshot[] {
  const parts = values.map((value, index) =>
    snapshotBodyPart(value, `${label}_${index}`),
  );
  assertUniqueUtf8(parts, (part) => part.partId, `${label}_PART_ID`);
  return Object.freeze(
    orderByUtf8(parts, (part) => `${part.partId}/${part.bodyDigest}`),
  );
}

function inspectUnicode(value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff) {
      if (index + 1 >= value.length) fail("UNPAIRED_HIGH_SURROGATE");
      const second = value.charCodeAt(index + 1);
      if (second < 0xdc00 || second > 0xdfff) fail("UNPAIRED_HIGH_SURROGATE");
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      fail("UNPAIRED_LOW_SURROGATE");
    }
  }
}

function hashBodyText(bodyText: string): string {
  return `sha256:${createHash("sha256").update(bodyText, "utf8").digest("hex")}`;
}

function bodyManifestDigest(
  parts: readonly BodyPartSnapshot[],
  domain: string,
): string {
  return qf0a1.digestCanonicalJsonV1({
    domain,
    parts: parts.map((part) => ({
      partId: part.partId,
      partKind: part.partKind,
      bodyDigest: part.bodyDigest,
    })),
  });
}

function snapshotPreparation(value: unknown): PreparationSnapshot {
  const input = readClosedRecord(value, INPUT_FIELDS, "PREPARATION_INPUT");
  if (input.contractVersion !== "SimilarityCorpusPreparationInputV1") {
    fail("INPUT_CONTRACT_VERSION_INVALID");
  }
  const candidate = qf0i.assertQuarantinedQuestionCandidateV1(input.candidate);
  const candidatePartValues = readDenseArray(
    input.candidateParts,
    1,
    QFS1A_LIMITS.maxCandidateParts,
    "CANDIDATE_PARTS",
  );

  const corpus = readClosedRecord(input.corpus, CORPUS_FIELDS, "CORPUS");
  if (corpus.contractVersion !== "SimilarityReferenceCorpusV1") {
    fail("CORPUS_CONTRACT_VERSION_INVALID");
  }
  const corpusId = readString(corpus.corpusId, CORPUS_ID_PATTERN, "CORPUS_ID");
  const corpusVersion = readString(corpus.version, VERSION_PATTERN, "CORPUS_VERSION");
  const suppliedCorpusManifestDigest = readDigest(
    corpus.corpusManifestDigest,
    "CORPUS_MANIFEST_DIGEST",
  );
  const referenceValues = readDenseArray(
    corpus.references,
    0,
    QFS1A_LIMITS.maxCorpusReferences,
    "CORPUS_REFERENCES",
  );

  // Close every array count before reading or traversing any body string.
  const referenceRecords = referenceValues.map((reference, index) => {
    const record = readClosedRecord(reference, REFERENCE_FIELDS, `REFERENCE_${index}`);
    const partValues = readDenseArray(
      record.parts,
      1,
      QFS1A_LIMITS.maxPartsPerReference,
      `REFERENCE_${index}_PARTS`,
    );
    return { record, partValues, index };
  });

  const candidateParts = snapshotAndOrderParts(candidatePartValues, "CANDIDATE_PART");
  const references = referenceRecords.map(({ record, partValues, index }) => {
    const label = `REFERENCE_${index}`;
    const referenceId = readString(
      record.referenceId,
      REFERENCE_ID_PATTERN,
      `${label}_ID`,
    );
    const referenceDigest = readDigest(record.referenceDigest, `${label}_DIGEST`);
    const purpose = readEnum(
      record.purpose,
      QFS1A_REFERENCE_PURPOSES,
      `${label}_PURPOSE`,
    );
    const sourceClass = readEnum(
      record.sourceClass,
      QFS1A_REFERENCE_SOURCE_CLASSES,
      `${label}_SOURCE_CLASS`,
    );
    const version = readString(record.version, VERSION_PATTERN, `${label}_VERSION`);
    const suppliedManifestDigest = readDigest(
      record.manifestDigest,
      `${label}_MANIFEST_DIGEST`,
    );
    const parts = snapshotAndOrderParts(partValues, `${label}_PART`);
    const manifestDigest = bodyManifestDigest(parts, "QFS1_REFERENCE_BODY_MANIFEST_V1");
    if (manifestDigest !== suppliedManifestDigest) fail(`${label}_MANIFEST_DRIFT`);
    const expectedReferenceDigest = qf0a1.digestCanonicalJsonV1({
      domain: "QFS1_REFERENCE_IDENTITY_V1",
      referenceId,
      purpose,
      sourceClass,
      version,
      manifestDigest,
    });
    if (referenceDigest !== expectedReferenceDigest) fail(`${label}_IDENTITY_DRIFT`);
    return Object.freeze({
      referenceId,
      referenceDigest,
      purpose,
      sourceClass,
      version,
      parts,
      manifestDigest,
    });
  });

  assertUniqueUtf8(references, (reference) => reference.referenceId, "REFERENCE_ID");
  assertUniqueUtf8(
    references,
    (reference) => reference.referenceDigest,
    "REFERENCE_DIGEST",
  );
  const orderedReferences = Object.freeze(
    orderByUtf8(references, (reference) =>
      `${reference.referenceDigest}/${reference.referenceId}`,
    ),
  );
  const allParts = [
    ...candidateParts,
    ...orderedReferences.flatMap((reference) => reference.parts),
  ];
  const aggregateCharacters = allParts.reduce(
    (total, part) => total + part.characterCount,
    0,
  );
  if (aggregateCharacters > QFS1A_LIMITS.maxAggregateInspectedCharacters) {
    fail("AGGREGATE_CHARACTER_LIMIT_EXCEEDED");
  }

  // Only after all counts and character bounds close do body traversal and hashing begin.
  for (const part of allParts) {
    inspectUnicode(part.bodyText);
    if (hashBodyText(part.bodyText) !== part.bodyDigest) fail("BODY_DIGEST_MISMATCH");
  }

  const candidateBodyManifestDigest = bodyManifestDigest(
    candidateParts,
    "QFS1_CANDIDATE_BODY_MANIFEST_V1",
  );
  if (candidateBodyManifestDigest !== candidate.candidateContentDigest) {
    fail("CANDIDATE_CONTENT_DIGEST_CROSS_BINDING_FAILED");
  }

  const corpusManifestDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS1_REFERENCE_CORPUS_MANIFEST_V1",
    corpusId,
    version: corpusVersion,
    references: orderedReferences.map((reference) => ({
      referenceId: reference.referenceId,
      referenceDigest: reference.referenceDigest,
      purpose: reference.purpose,
      sourceClass: reference.sourceClass,
      version: reference.version,
      manifestDigest: reference.manifestDigest,
      partCount: reference.parts.length,
    })),
  });
  if (corpusManifestDigest !== suppliedCorpusManifestDigest) {
    fail("CORPUS_MANIFEST_DRIFT");
  }

  return Object.freeze({
    candidate,
    candidateParts,
    candidateBodyManifestDigest,
    corpusId,
    corpusVersion,
    references: orderedReferences,
    corpusManifestDigest,
  });
}

function createMandatoryWorkState(referenceCount: number): MandatoryWorkState {
  const fixedReferenceOverheadUnits =
    referenceCount * QFS1A_LIMITS.fixedReferenceOverheadWorkUnits;
  if (fixedReferenceOverheadUnits > QFS1A_LIMITS.maxTotalWorkUnits) {
    fail("REFERENCE_OVERHEAD_WORK_LIMIT_EXCEEDED");
  }
  return {
    fixedReferenceOverheadUnits,
    originalCharacters: 0,
    normalizedCharacters: 0,
    observedTokens: 0,
    retainedTokens: 0,
    mandatoryTotalWorkUnits: fixedReferenceOverheadUnits,
  };
}

function chargeMandatoryWork(
  state: MandatoryWorkState,
  units: number,
  label: string,
): void {
  if (
    !Number.isSafeInteger(units) ||
    units < 0 ||
    units > QFS1A_LIMITS.maxTotalWorkUnits - state.mandatoryTotalWorkUnits
  ) {
    fail(`${label}_WORK_LIMIT_EXCEEDED`);
  }
  state.mandatoryTotalWorkUnits += units;
}

function tokenizeBody(
  part: BodyPartSnapshot,
  state: MandatoryWorkState,
): PreparedSimilarityBodySequenceV1 {
  state.originalCharacters += part.characterCount;
  chargeMandatoryWork(state, part.characterCount, "ORIGINAL_CHARACTER");

  const normalizedBody = part.bodyText.normalize("NFKC").toLowerCase();
  if (normalizedBody.length > QFS1A_LIMITS.maxNormalizedCharactersPerBody) {
    fail("NORMALIZED_CHARACTER_LIMIT_EXCEEDED");
  }
  if (
    normalizedBody.length >
    QFS1A_LIMITS.maxAggregateNormalizedCharacters - state.normalizedCharacters
  ) {
    fail("AGGREGATE_NORMALIZED_CHARACTER_LIMIT_EXCEEDED");
  }
  state.normalizedCharacters += normalizedBody.length;
  chargeMandatoryWork(state, normalizedBody.length, "NORMALIZED_CHARACTER");

  const tokens: PreparedSimilarityTokenV1[] = [];
  let current = "";
  let currentKind: QFS1ATokenKind | null = null;
  const finalize = (): void => {
    if (current.length === 0 || currentKind === null) return;
    state.observedTokens += 1;
    chargeMandatoryWork(state, 1, "OBSERVED_TOKEN");
    if (tokens.length >= QFS1A_LIMITS.maxTokensRetainedPerBody) {
      fail("BODY_TOKEN_LIMIT_EXCEEDED");
    }
    const token = Object.freeze({
      value: current,
      kind: currentKind,
      generic: currentKind === "LEXICAL" && GENERIC_LEXEMES.has(current),
      partId: part.partId,
      partKind: part.partKind,
    });
    tokens.push(token);
    state.retainedTokens += 1;
    chargeMandatoryWork(state, 1, "RETAINED_TOKEN");
    current = "";
    currentKind = null;
  };

  for (let index = 0; index < normalizedBody.length; index += 1) {
    const first = normalizedBody.charCodeAt(index);
    let character: string;
    if (first >= 0xd800 && first <= 0xdbff) {
      if (index + 1 >= normalizedBody.length) fail("UNPAIRED_HIGH_SURROGATE");
      const second = normalizedBody.charCodeAt(index + 1);
      if (second < 0xdc00 || second > 0xdfff) fail("UNPAIRED_HIGH_SURROGATE");
      character = normalizedBody.slice(index, index + 2);
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      fail("UNPAIRED_LOW_SURROGATE");
    } else {
      character = normalizedBody[index];
    }

    if (!LETTER_OR_NUMBER.test(character)) {
      finalize();
      continue;
    }
    const nextKind: QFS1ATokenKind = NUMBER.test(character) ? "NUMBER" : "LEXICAL";
    if (currentKind !== null && currentKind !== nextKind) finalize();
    currentKind = nextKind;
    current += character;
  }
  finalize();

  const frozenTokens = Object.freeze(tokens);
  const normalizedSequenceDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS1A_NORMALIZED_CONTENT_SEQUENCE_V1",
    tokens: frozenTokens.map((token) => ({
      value: token.value,
      kind: token.kind,
      generic: token.generic,
    })),
  });
  return Object.freeze({
    partId: part.partId,
    partKind: part.partKind,
    bodyDigest: part.bodyDigest,
    normalizedSequenceDigest,
    tokens: frozenTokens,
  });
}

function aggregateNormalizedSequenceDigest(
  parts: readonly PreparedSimilarityBodySequenceV1[],
): string {
  const structuredParts = parts.map((part, sequenceIndex) => ({
    sequenceIndex,
    partKind: part.partKind,
    normalizedSequenceDigest: part.normalizedSequenceDigest,
  }));
  return qf0a1.digestCanonicalJsonV1({
    domain: "QFS1A_NORMALIZED_STRUCTURED_SEQUENCE_V1",
    parts: structuredParts,
  });
}

function summarizeSequence(sequence: PreparedSimilarityBodySequenceV1): unknown {
  return {
    partId: sequence.partId,
    partKind: sequence.partKind,
    bodyDigest: sequence.bodyDigest,
    normalizedSequenceDigest: sequence.normalizedSequenceDigest,
    tokenCount: sequence.tokens.length,
  };
}

function buildPreparation(snapshot: PreparationSnapshot): PreparedSimilarityCorpusV1 {
  const state = createMandatoryWorkState(snapshot.references.length);
  const candidateSequences = Object.freeze(
    snapshot.candidateParts.map((part) => tokenizeBody(part, state)),
  );
  const candidateNormalizedSequenceDigest =
    aggregateNormalizedSequenceDigest(candidateSequences);
  const referenceSequences = Object.freeze(
    snapshot.references.map((reference): PreparedSimilarityReferenceSequenceV1 => {
      const parts = Object.freeze(
        reference.parts.map((part) => tokenizeBody(part, state)),
      );
      return Object.freeze({
        referenceId: reference.referenceId,
        referenceDigest: reference.referenceDigest,
        purpose: reference.purpose,
        sourceClass: reference.sourceClass,
        version: reference.version,
        manifestDigest: reference.manifestDigest,
        normalizedSequenceDigest: aggregateNormalizedSequenceDigest(parts),
        parts,
      });
    }),
  );
  const referencePartCount = referenceSequences.reduce(
    (total, reference) => total + reference.parts.length,
    0,
  );
  const counts = Object.freeze({
    candidatePartCount: candidateSequences.length,
    referenceCount: referenceSequences.length,
    referencePartCount,
    preparedBodyCount: candidateSequences.length + referencePartCount,
  });
  const workAccounting: SimilarityMandatoryWorkAccountingV1 = Object.freeze({
    fixedReferenceOverheadUnits: state.fixedReferenceOverheadUnits,
    originalCharacters: state.originalCharacters,
    normalizedCharacters: state.normalizedCharacters,
    observedTokens: state.observedTokens,
    retainedTokens: state.retainedTokens,
    mandatoryTotalWorkUnits: state.mandatoryTotalWorkUnits,
    remainingOptionalWorkUnits:
      QFS1A_LIMITS.maxTotalWorkUnits - state.mandatoryTotalWorkUnits,
  });

  const digestMaterial = {
    contractVersion: "PreparedSimilarityCorpusV1" as const,
    candidateId: snapshot.candidate.candidateId,
    candidateDigest: snapshot.candidate.candidateDigest,
    candidateBodyManifestDigest: snapshot.candidateBodyManifestDigest,
    corpusId: snapshot.corpusId,
    corpusVersion: snapshot.corpusVersion,
    corpusManifestDigest: snapshot.corpusManifestDigest,
    candidateNormalizedSequenceDigest,
    counts,
    candidateSequences: candidateSequences.map(summarizeSequence),
    referenceSequences: referenceSequences.map((reference) => ({
      referenceId: reference.referenceId,
      referenceDigest: reference.referenceDigest,
      purpose: reference.purpose,
      sourceClass: reference.sourceClass,
      version: reference.version,
      manifestDigest: reference.manifestDigest,
      normalizedSequenceDigest: reference.normalizedSequenceDigest,
      parts: reference.parts.map(summarizeSequence),
    })),
    workAccounting,
  };
  const preparationDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS1A_PREPARED_SIMILARITY_CORPUS_V1",
    material: digestMaterial,
  });
  return Object.freeze({
    ...digestMaterial,
    candidateSequences,
    referenceSequences,
    preparationDigest,
  });
}

export function prepareSimilarityCorpusV1(
  value: unknown,
): PreparedSimilarityCorpusV1 {
  assertDependenciesV1();
  return buildPreparation(snapshotPreparation(value));
}
