import { createHash } from "node:crypto";
import { types as utilTypes } from "node:util";

import * as qf0a1 from "../quarantine/bounded-canonical-json";
import * as qf0iContracts from "../quarantine/candidate-contracts";
import * as qf0i from "../quarantine/candidate-core";
import {
  QFS1_BODY_PART_KINDS,
  QFS1_CONTRACT_VERSION,
  QFS1_LIMITS,
  QFS1_MATCH_KINDS,
  QFS1_OUTCOMES,
  QFS1_POLICY_DIGEST,
  QFS1_POLICY_REFERENCE,
  QFS1_QF0_DEPENDENCY_RECEIPT,
  QFS1_REFERENCE_PURPOSES,
  QFS1_REFERENCE_SOURCE_CLASSES,
  QFS1_TRANSFORMATIONS,
  type QFS1BodyPartKind,
  type QFS1MatchKind,
  type QFS1Outcome,
  type QFS1ReferencePurpose,
  type QFS1ReferenceSourceClass,
  type QFS1Transformation,
  type SimilarityCorpusCountsV1,
  type SimilarityDeterministicMeasureV1,
  type SimilarityFirewallReviewV1,
  type SimilarityMatchSummaryV1,
  type SimilarityTokenRangeV1,
  type SimilarityWorkAccountingV1,
} from "./similarity-contracts";

const INSPECTION_FIELDS = Object.freeze([
  "contractVersion",
  "candidate",
  "candidateParts",
  "policyRef",
  "policyDigest",
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
const REVIEW_FIELDS = Object.freeze([
  "contractVersion",
  "candidateId",
  "candidateDigest",
  "candidateBodyManifestDigest",
  "policyRef",
  "policyDigest",
  "corpusManifestDigest",
  "corpusCounts",
  "workAccounting",
  "outcome",
  "matches",
  "reviewDigest",
] as const);
const CORPUS_COUNT_FIELDS = Object.freeze([
  "candidatePartCount",
  "referenceCount",
  "referencePartCount",
  "inspectedBodyCount",
] as const);
const WORK_FIELDS = Object.freeze([
  "fixedReferenceOverheadUnits",
  "originalCharacters",
  "normalizedCharacters",
  "observedTokens",
  "retainedTokens",
  "generatedWindows",
  "comparisonWorkUnits",
  "totalWorkUnits",
  "truncatedBodyCount",
  "budgetExhausted",
  "completeCorpusInspection",
] as const);
const MATCH_FIELDS = Object.freeze([
  "referenceId",
  "referenceDigest",
  "candidatePartKind",
  "referencePartKind",
  "matchKind",
  "measure",
  "candidateTokenRange",
  "referenceTokenRange",
  "transformationProfile",
  "disposition",
] as const);
const MEASURE_FIELDS = Object.freeze([
  "scoreMillionths",
  "matchedTokenCount",
  "distinctLexicalTokenCount",
] as const);
const RANGE_FIELDS = Object.freeze(["startInclusive", "endExclusive"] as const);

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const CANDIDATE_ID_PATTERN = /^qfc_[a-f0-9]{64}$/u;
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
] as const);

type TokenKind = "LEXICAL" | "NUMBER";

interface BodyPartSnapshot {
  readonly partId: string;
  readonly partKind: QFS1BodyPartKind;
  readonly bodyDigest: string;
  readonly bodyText: string;
  readonly characterCount: number;
}

interface ReferenceSnapshot {
  readonly referenceId: string;
  readonly referenceDigest: string;
  readonly purpose: QFS1ReferencePurpose;
  readonly sourceClass: QFS1ReferenceSourceClass;
  readonly version: string;
  readonly parts: readonly BodyPartSnapshot[];
  readonly manifestDigest: string;
}

interface TokenV1 {
  readonly value: string;
  readonly kind: TokenKind;
  readonly generic: boolean;
  readonly partId: string;
  readonly partKind: QFS1BodyPartKind;
}

interface PreparedSequence {
  readonly tokens: readonly TokenV1[];
  readonly lexicalWindows: ReadonlySet<string>;
}

interface InspectionSnapshot {
  readonly candidate: qf0iContracts.QuarantinedQuestionCandidateV1;
  readonly candidateParts: readonly BodyPartSnapshot[];
  readonly candidateBodyManifestDigest: string;
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly references: readonly ReferenceSnapshot[];
  readonly corpusManifestDigest: string;
}

interface WorkState {
  fixedReferenceOverheadUnits: number;
  originalCharacters: number;
  normalizedCharacters: number;
  observedTokens: number;
  retainedTokens: number;
  generatedWindows: number;
  comparisonWorkUnits: number;
  totalWorkUnits: number;
  truncatedBodyCount: number;
  budgetExhausted: boolean;
}

interface ExactSpan {
  readonly candidateStart: number;
  readonly referenceStart: number;
  readonly length: number;
  readonly candidateLength?: number;
  readonly referenceLength?: number;
}

interface AlignmentEvidence extends ExactSpan {
  readonly exactLexicalCount: number;
  readonly distinctExactLexicalCount: number;
  readonly lexicalSubstitutionCount: number;
  readonly numericSubstitutionCount: number;
  readonly kindMismatchCount: number;
}

function fail(code: string): never {
  throw new Error(`QFS1_FAIL_CLOSED:${code}`);
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

function readSafeInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail(`${label}_INVALID`);
  }
  return value;
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

function assertDependenciesV1(): void {
  assertExactExports(
    Object.keys(qf0a1),
    [
      "QF0A1_LIMITS",
      "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
      "canonicalizeBoundedJsonV1",
      "compareUtf8BytesV1",
      "digestCanonicalJsonV1",
    ],
    "QF0A1",
  );
  assertExactExports(
    Object.keys(qf0iContracts),
    QFS1_QF0_DEPENDENCY_RECEIPT.candidateContractExportsExactly,
    "QF0I_CONTRACTS",
  );
  assertExactExports(
    Object.keys(qf0i),
    QFS1_QF0_DEPENDENCY_RECEIPT.candidateCoreExportsExactly,
    "QF0I_CORE",
  );
  if (
    qf0a1.digestCanonicalJsonV1(
      JSON.parse(JSON.stringify(qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    ) !== QFS1_QF0_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest
  ) {
    fail("QF0I_SOURCE_ONLY_BOUNDARY_DRIFT");
  }
}

function hashBodyText(bodyText: string): string {
  return `sha256:${createHash("sha256").update(bodyText, "utf8").digest("hex")}`;
}

function bodyManifestDigest(parts: readonly BodyPartSnapshot[], domain: string): string {
  return qf0a1.digestCanonicalJsonV1({
    domain,
    parts: parts.map((part) => ({
      partId: part.partId,
      partKind: part.partKind,
      bodyDigest: part.bodyDigest,
    })),
  });
}

function snapshotBodyPart(value: unknown, label: string): BodyPartSnapshot {
  const record = readClosedRecord(value, BODY_PART_FIELDS, label);
  const partId = readString(record.partId, PART_ID_PATTERN, `${label}_PART_ID`);
  const partKind = readEnum(
    record.partKind,
    QFS1_BODY_PART_KINDS,
    `${label}_PART_KIND`,
  );
  const bodyDigest = readDigest(record.bodyDigest, `${label}_BODY_DIGEST`);
  if (typeof record.bodyText !== "string") fail(`${label}_BODY_TEXT_REQUIRED`);
  if (record.bodyText.length > QFS1_LIMITS.maxCharactersPerBody) {
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
  return Object.freeze(orderByUtf8(parts, (part) => `${part.partId}/${part.bodyDigest}`));
}

function snapshotInspection(value: unknown): InspectionSnapshot {
  const input = readClosedRecord(value, INSPECTION_FIELDS, "INSPECTION");
  if (input.contractVersion !== "SimilarityFirewallInspectionInputV1") {
    fail("INSPECTION_CONTRACT_VERSION_INVALID");
  }
  if (input.policyRef !== QFS1_POLICY_REFERENCE) fail("POLICY_REFERENCE_INVALID");
  if (input.policyDigest !== QFS1_POLICY_DIGEST) fail("POLICY_DIGEST_INVALID");

  const candidate = qf0i.assertQuarantinedQuestionCandidateV1(input.candidate);
  const candidatePartValues = readDenseArray(
    input.candidateParts,
    1,
    QFS1_LIMITS.maxCandidateParts,
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
    QFS1_LIMITS.maxCorpusReferences,
    "CORPUS_REFERENCES",
  );

  // All array counts are closed before any body text is traversed or hashed.
  const referenceRecords = referenceValues.map((reference, index) => {
    const record = readClosedRecord(reference, REFERENCE_FIELDS, `REFERENCE_${index}`);
    const partValues = readDenseArray(
      record.parts,
      1,
      QFS1_LIMITS.maxPartsPerReference,
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
      QFS1_REFERENCE_PURPOSES,
      `${label}_PURPOSE`,
    );
    const sourceClass = readEnum(
      record.sourceClass,
      QFS1_REFERENCE_SOURCE_CLASSES,
      `${label}_SOURCE_CLASS`,
    );
    const version = readString(record.version, VERSION_PATTERN, `${label}_VERSION`);
    const suppliedManifestDigest = readDigest(
      record.manifestDigest,
      `${label}_MANIFEST_DIGEST`,
    );
    const parts = snapshotAndOrderParts(partValues, `${label}_PART`);
    const manifestDigest = bodyManifestDigest(
      parts,
      "QFS1_REFERENCE_BODY_MANIFEST_V1",
    );
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
  if (aggregateCharacters > QFS1_LIMITS.maxAggregateInspectedCharacters) {
    fail("AGGREGATE_CHARACTER_LIMIT_EXCEEDED");
  }

  // Hashing begins only after every count and character length limit is established.
  for (const part of allParts) {
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

function createWorkState(referenceCount: number): WorkState {
  const fixedReferenceOverheadUnits =
    referenceCount * QFS1_LIMITS.fixedReferenceOverheadWorkUnits;
  if (fixedReferenceOverheadUnits > QFS1_LIMITS.maxTotalWorkUnits) {
    fail("REFERENCE_OVERHEAD_WORK_LIMIT_EXCEEDED");
  }
  return {
    fixedReferenceOverheadUnits,
    originalCharacters: 0,
    normalizedCharacters: 0,
    observedTokens: 0,
    retainedTokens: 0,
    generatedWindows: 0,
    comparisonWorkUnits: 0,
    totalWorkUnits: fixedReferenceOverheadUnits,
    truncatedBodyCount: 0,
    budgetExhausted: false,
  };
}

function chargeRequiredWork(state: WorkState, units: number, code: string): void {
  if (
    !Number.isSafeInteger(units) ||
    units < 0 ||
    units > QFS1_LIMITS.maxTotalWorkUnits - state.totalWorkUnits
  ) {
    fail(`${code}_WORK_LIMIT_EXCEEDED`);
  }
  state.totalWorkUnits += units;
}

function consumeWindowWork(state: WorkState): boolean {
  if (
    state.generatedWindows >= QFS1_LIMITS.maxTotalGeneratedWindows ||
    state.totalWorkUnits >= QFS1_LIMITS.maxTotalWorkUnits
  ) {
    state.budgetExhausted = true;
    return false;
  }
  state.generatedWindows += 1;
  state.totalWorkUnits += 1;
  return true;
}

function consumeComparisonWork(state: WorkState): boolean {
  if (
    state.comparisonWorkUnits >= QFS1_LIMITS.maxTotalComparisonWorkUnits ||
    state.totalWorkUnits >= QFS1_LIMITS.maxTotalWorkUnits
  ) {
    state.budgetExhausted = true;
    return false;
  }
  state.comparisonWorkUnits += 1;
  state.totalWorkUnits += 1;
  return true;
}

function tokenizePart(part: BodyPartSnapshot, state: WorkState): readonly TokenV1[] {
  const tokens: TokenV1[] = [];
  let current = "";
  let currentKind: TokenKind | null = null;

  state.originalCharacters += part.characterCount;
  chargeRequiredWork(state, part.characterCount, "ORIGINAL_CHARACTER");
  const normalizedBody = part.bodyText.normalize("NFKC").toLowerCase();
  if (normalizedBody.length > QFS1_LIMITS.maxNormalizedCharactersPerBody) {
    fail("NORMALIZED_CHARACTER_LIMIT_EXCEEDED");
  }
  if (
    normalizedBody.length >
    QFS1_LIMITS.maxAggregateNormalizedCharacters - state.normalizedCharacters
  ) {
    fail("AGGREGATE_NORMALIZED_CHARACTER_LIMIT_EXCEEDED");
  }
  state.normalizedCharacters += normalizedBody.length;
  chargeRequiredWork(state, normalizedBody.length, "NORMALIZED_CHARACTER");

  const finalize = (): void => {
    if (current.length === 0 || currentKind === null) return;
    state.observedTokens += 1;
    chargeRequiredWork(state, 1, "TOKEN");
    if (tokens.length >= QFS1_LIMITS.maxTokensRetainedPerBody) {
      fail("BODY_TOKEN_LIMIT_EXCEEDED");
    }
    tokens.push(
      Object.freeze({
        value: current,
        kind: currentKind,
        generic: currentKind === "LEXICAL" && GENERIC_LEXEMES.has(current),
        partId: part.partId,
        partKind: part.partKind,
      }),
    );
    state.retainedTokens += 1;
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
    const nextKind: TokenKind = NUMBER.test(character) ? "NUMBER" : "LEXICAL";
    if (currentKind !== null && currentKind !== nextKind) finalize();
    currentKind = nextKind;
    current += character;
  }
  finalize();
  return Object.freeze(tokens);
}

function generateLexicalWindows(
  tokens: readonly TokenV1[],
  state: WorkState,
): ReadonlySet<string> {
  const lexical = tokens.filter(
    (token) => token.kind === "LEXICAL" && !token.generic,
  );
  const windows = new Set<string>();
  const size = QFS1_LIMITS.lexicalWindowSize;
  for (let index = 0; index + size <= lexical.length; index += 1) {
    if (!consumeWindowWork(state)) break;
    windows.add(
      lexical
        .slice(index, index + size)
        .map((token) => token.value)
        .join("\u0000"),
    );
  }
  return windows;
}

function prepareSequence(
  parts: readonly BodyPartSnapshot[],
  state: WorkState,
): PreparedSequence {
  const tokens = Object.freeze(parts.flatMap((part) => tokenizePart(part, state)));
  return Object.freeze({
    tokens,
    lexicalWindows: generateLexicalWindows(tokens, state),
  });
}

function tokenEquals(
  left: TokenV1,
  right: TokenV1,
  state: WorkState,
): boolean | null {
  if (!consumeComparisonWork(state)) return null;
  return left.value === right.value && left.kind === right.kind;
}

function completeArrayEquality(
  left: readonly TokenV1[],
  right: readonly TokenV1[],
  state: WorkState,
): boolean | null {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const equal = tokenEquals(left[index], right[index], state);
    if (equal === null) return null;
    if (!equal) return false;
  }
  return true;
}

function longestExactSpan(
  candidate: readonly TokenV1[],
  reference: readonly TokenV1[],
  state: WorkState,
): ExactSpan | null {
  let best: ExactSpan = { candidateStart: 0, referenceStart: 0, length: 0 };
  for (let candidateStart = 0; candidateStart < candidate.length; candidateStart += 1) {
    for (
      let referenceStart = 0;
      referenceStart < reference.length;
      referenceStart += 1
    ) {
      let length = 0;
      while (
        candidateStart + length < candidate.length &&
        referenceStart + length < reference.length
      ) {
        const equal = tokenEquals(
          candidate[candidateStart + length],
          reference[referenceStart + length],
          state,
        );
        if (equal === null) return best;
        if (!equal) break;
        length += 1;
      }
      if (length > best.length) {
        best = { candidateStart, referenceStart, length };
      }
      if (best.length === Math.min(candidate.length, reference.length)) return best;
    }
  }
  return best;
}

function rangeEvidence(
  tokens: readonly TokenV1[],
  start: number,
  length: number,
): { readonly lexicalCount: number; readonly distinctLexicalCount: number } {
  const distinct = new Set<string>();
  let lexicalCount = 0;
  for (let index = start; index < start + length; index += 1) {
    const token = tokens[index];
    if (token.kind === "LEXICAL" && !token.generic) {
      lexicalCount += 1;
      distinct.add(token.value);
    }
  }
  return { lexicalCount, distinctLexicalCount: distinct.size };
}

function isStrongEvidence(
  length: number,
  evidence: { readonly lexicalCount: number; readonly distinctLexicalCount: number },
): boolean {
  return (
    length >= QFS1_LIMITS.minimumStrongTokenCount &&
    evidence.lexicalCount >= QFS1_LIMITS.minimumStrongLexicalTokenCount &&
    evidence.distinctLexicalCount >= QFS1_LIMITS.minimumDistinctLexicalEvidence
  );
}

function rangeCrossesParts(
  tokens: readonly TokenV1[],
  start: number,
  length: number,
): boolean {
  if (length <= 1) return false;
  const firstPart = tokens[start]?.partId;
  for (let index = start + 1; index < start + length; index += 1) {
    if (tokens[index]?.partId !== firstPart) return true;
  }
  return false;
}

function scoreMillionths(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(1_000_000, Math.floor((numerator * 1_000_000) / denominator));
}

function orderedTransformations(
  values: readonly QFS1Transformation[],
): readonly QFS1Transformation[] {
  const unique = new Set(values);
  return Object.freeze(QFS1_TRANSFORMATIONS.filter((value) => unique.has(value)));
}

function makeMatch(
  reference: ReferenceSnapshot,
  candidateTokens: readonly TokenV1[],
  referenceTokens: readonly TokenV1[],
  span: ExactSpan,
  matchKind: QFS1MatchKind,
  measure: SimilarityDeterministicMeasureV1,
  transformations: readonly QFS1Transformation[],
  disposition: "BLOCKING" | "REVIEW" = "BLOCKING",
): SimilarityMatchSummaryV1 {
  const candidateLength = span.candidateLength ?? span.length;
  const referenceLength = span.referenceLength ?? span.length;
  const candidateCrosses = rangeCrossesParts(
    candidateTokens,
    span.candidateStart,
    candidateLength,
  );
  const referenceCrosses = rangeCrossesParts(
    referenceTokens,
    span.referenceStart,
    referenceLength,
  );
  const effectiveKind =
    (candidateCrosses || referenceCrosses) && disposition === "BLOCKING"
      ? "STRUCTURED_PARTS_COPY"
      : matchKind;
  return Object.freeze({
    referenceId: reference.referenceId,
    referenceDigest: reference.referenceDigest,
    candidatePartKind: candidateTokens[span.candidateStart].partKind,
    referencePartKind: referenceTokens[span.referenceStart].partKind,
    matchKind: effectiveKind,
    measure: Object.freeze({ ...measure }),
    candidateTokenRange: Object.freeze({
      startInclusive: span.candidateStart,
      endExclusive: span.candidateStart + candidateLength,
    }),
    referenceTokenRange: Object.freeze({
      startInclusive: span.referenceStart,
      endExclusive: span.referenceStart + referenceLength,
    }),
    transformationProfile: orderedTransformations([
      ...transformations,
      ...(candidateCrosses || referenceCrosses
        ? (["STRUCTURED_PART_BOUNDARY_CROSSED"] as const)
        : []),
    ]),
    disposition,
  });
}

function bestShapeAlignment(
  candidate: readonly TokenV1[],
  reference: readonly TokenV1[],
  state: WorkState,
): AlignmentEvidence | null {
  const length = Math.min(candidate.length, reference.length);
  if (length < QFS1_LIMITS.minimumStrongTokenCount) return null;
  const candidateOffsets = candidate.length <= reference.length
    ? [0]
    : Array.from({ length: candidate.length - length + 1 }, (_, index) => index);
  const referenceOffsets = reference.length <= candidate.length
    ? [0]
    : Array.from({ length: reference.length - length + 1 }, (_, index) => index);
  let best: AlignmentEvidence | null = null;
  for (const candidateStart of candidateOffsets) {
    for (const referenceStart of referenceOffsets) {
      let exactLexicalCount = 0;
      let lexicalSubstitutionCount = 0;
      let numericSubstitutionCount = 0;
      let kindMismatchCount = 0;
      const distinctExact = new Set<string>();
      for (let index = 0; index < length; index += 1) {
        if (!consumeComparisonWork(state)) return best;
        const left = candidate[candidateStart + index];
        const right = reference[referenceStart + index];
        if (left.kind !== right.kind) {
          kindMismatchCount += 1;
        } else if (left.kind === "NUMBER") {
          if (left.value !== right.value) numericSubstitutionCount += 1;
        } else if (left.value === right.value) {
          if (!left.generic) {
            exactLexicalCount += 1;
            distinctExact.add(left.value);
          }
        } else {
          lexicalSubstitutionCount += 1;
        }
      }
      const evidence: AlignmentEvidence = {
        candidateStart,
        referenceStart,
        length,
        exactLexicalCount,
        distinctExactLexicalCount: distinctExact.size,
        lexicalSubstitutionCount,
        numericSubstitutionCount,
        kindMismatchCount,
      };
      const strength =
        exactLexicalCount * 100 -
        lexicalSubstitutionCount * 20 -
        kindMismatchCount * 100;
      const bestStrength = best === null
        ? Number.NEGATIVE_INFINITY
        : best.exactLexicalCount * 100 -
          best.lexicalSubstitutionCount * 20 -
          best.kindMismatchCount * 100;
      if (strength > bestStrength) best = evidence;
    }
  }
  return best;
}

function boundedOrderEvidence(
  candidate: readonly TokenV1[],
  reference: readonly TokenV1[],
  state: WorkState,
): { readonly maximumDisplacement: number } | null {
  if (candidate.length !== reference.length || candidate.length === 0) return null;
  const positions = new Map<string, number[]>();
  for (let index = 0; index < reference.length; index += 1) {
    const key = `${reference[index].kind}:${reference[index].value}`;
    const entries = positions.get(key) ?? [];
    entries.push(index);
    positions.set(key, entries);
  }
  const consumed = new Map<string, number>();
  let maximumDisplacement = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    if (!consumeComparisonWork(state)) return null;
    const key = `${candidate[index].kind}:${candidate[index].value}`;
    const offset = consumed.get(key) ?? 0;
    const target = positions.get(key)?.[offset];
    if (target === undefined) return null;
    consumed.set(key, offset + 1);
    maximumDisplacement = Math.max(maximumDisplacement, Math.abs(index - target));
  }
  return { maximumDisplacement };
}

function lexicalOverlap(
  candidate: PreparedSequence,
  reference: PreparedSequence,
  state: WorkState,
): {
  readonly commonLexicalTokenCount: number;
  readonly commonDistinct: number;
  readonly coverageMillionths: number;
  readonly sharedWindows: number;
  readonly candidateStart: number;
  readonly candidateLength: number;
  readonly referenceStart: number;
  readonly referenceLength: number;
} | null {
  const candidateLexical = candidate.tokens.filter(
    (token) => token.kind === "LEXICAL" && !token.generic,
  );
  const referenceLexical = reference.tokens.filter(
    (token) => token.kind === "LEXICAL" && !token.generic,
  );
  const candidateFrequency = new Map<string, number>();
  const referenceFrequency = new Map<string, number>();
  const candidatePositions = new Map<string, number[]>();
  const referencePositions = new Map<string, number[]>();
  for (let index = 0; index < candidate.tokens.length; index += 1) {
    const token = candidate.tokens[index];
    if (token.kind !== "LEXICAL" || token.generic) continue;
    candidateFrequency.set(
      token.value,
      (candidateFrequency.get(token.value) ?? 0) + 1,
    );
    const positions = candidatePositions.get(token.value) ?? [];
    positions.push(index);
    candidatePositions.set(token.value, positions);
  }
  for (let index = 0; index < reference.tokens.length; index += 1) {
    const token = reference.tokens[index];
    if (token.kind !== "LEXICAL" || token.generic) continue;
    referenceFrequency.set(
      token.value,
      (referenceFrequency.get(token.value) ?? 0) + 1,
    );
    const positions = referencePositions.get(token.value) ?? [];
    positions.push(index);
    referencePositions.set(token.value, positions);
  }
  const candidateSet = new Set(candidateFrequency.keys());
  const referenceSet = new Set(referenceFrequency.keys());
  const [smaller, larger] = candidateSet.size <= referenceSet.size
    ? [candidateSet, referenceSet]
    : [referenceSet, candidateSet];
  let commonDistinct = 0;
  let commonLexicalTokenCount = 0;
  const matchedCandidatePositions: number[] = [];
  const matchedReferencePositions: number[] = [];
  for (const token of smaller) {
    if (!consumeComparisonWork(state)) return null;
    if (larger.has(token)) {
      commonDistinct += 1;
      const commonCount = Math.min(
        candidateFrequency.get(token) ?? 0,
        referenceFrequency.get(token) ?? 0,
      );
      commonLexicalTokenCount += commonCount;
      matchedCandidatePositions.push(
        ...(candidatePositions.get(token) ?? []).slice(0, commonCount),
      );
      matchedReferencePositions.push(
        ...(referencePositions.get(token) ?? []).slice(0, commonCount),
      );
    }
  }
  const [smallerWindows, largerWindows] =
    candidate.lexicalWindows.size <= reference.lexicalWindows.size
      ? [candidate.lexicalWindows, reference.lexicalWindows]
      : [reference.lexicalWindows, candidate.lexicalWindows];
  let sharedWindows = 0;
  for (const window of smallerWindows) {
    if (!consumeComparisonWork(state)) return null;
    if (largerWindows.has(window)) sharedWindows += 1;
  }
  const candidateStart =
    matchedCandidatePositions.length === 0
      ? 0
      : Math.min(...matchedCandidatePositions);
  const candidateEnd =
    matchedCandidatePositions.length === 0
      ? 0
      : Math.max(...matchedCandidatePositions) + 1;
  const referenceStart =
    matchedReferencePositions.length === 0
      ? 0
      : Math.min(...matchedReferencePositions);
  const referenceEnd =
    matchedReferencePositions.length === 0
      ? 0
      : Math.max(...matchedReferencePositions) + 1;
  return {
    commonLexicalTokenCount,
    commonDistinct,
    coverageMillionths: Math.min(
      scoreMillionths(commonDistinct, smaller.size),
      scoreMillionths(
        commonLexicalTokenCount,
        Math.min(candidateLexical.length, referenceLexical.length),
      ),
    ),
    sharedWindows,
    candidateStart,
    candidateLength: candidateEnd - candidateStart,
    referenceStart,
    referenceLength: referenceEnd - referenceStart,
  };
}

function detectReferenceMatch(
  reference: ReferenceSnapshot,
  candidate: PreparedSequence,
  compared: PreparedSequence,
  state: WorkState,
): SimilarityMatchSummaryV1 | null {
  const candidateTokens = candidate.tokens;
  const referenceTokens = compared.tokens;
  if (candidateTokens.length === 0 || referenceTokens.length === 0) return null;

  const exact = completeArrayEquality(candidateTokens, referenceTokens, state);
  if (exact === true) {
    const evidence = rangeEvidence(candidateTokens, 0, candidateTokens.length);
    if (isStrongEvidence(candidateTokens.length, evidence)) {
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        { candidateStart: 0, referenceStart: 0, length: candidateTokens.length },
        "EXACT_NORMALIZED_COPY",
        {
          scoreMillionths: 1_000_000,
          matchedTokenCount: candidateTokens.length,
          distinctLexicalTokenCount: evidence.distinctLexicalCount,
        },
        ["CASE_AND_PUNCTUATION_NORMALIZED"],
      );
    }
  }

  // A bounded permutation is identity-preserving evidence, so classify it
  // before positional lexical substitutions.
  const order = boundedOrderEvidence(candidateTokens, referenceTokens, state);
  if (
    order !== null &&
    order.maximumDisplacement > 0 &&
    order.maximumDisplacement <= QFS1_LIMITS.maximumOrderDisplacement
  ) {
    const evidence = rangeEvidence(candidateTokens, 0, candidateTokens.length);
    if (isStrongEvidence(candidateTokens.length, evidence)) {
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        { candidateStart: 0, referenceStart: 0, length: candidateTokens.length },
        "BOUNDED_ORDER_PERTURBATION",
        {
          scoreMillionths: scoreMillionths(
            candidateTokens.length - order.maximumDisplacement,
            candidateTokens.length,
          ),
          matchedTokenCount: candidateTokens.length,
          distinctLexicalTokenCount: evidence.distinctLexicalCount,
        },
        ["CASE_AND_PUNCTUATION_NORMALIZED", "BOUNDED_TOKEN_ORDER_CHANGED"],
      );
    }
  }

  const alignment = bestShapeAlignment(candidateTokens, referenceTokens, state);
  if (
    alignment !== null &&
    alignment.kindMismatchCount === 0 &&
    alignment.exactLexicalCount >= QFS1_LIMITS.minimumStrongLexicalTokenCount &&
    alignment.distinctExactLexicalCount >= QFS1_LIMITS.minimumDistinctLexicalEvidence
  ) {
    const maxLexicalSubstitutions = Math.max(
      2,
      Math.floor(
        (alignment.exactLexicalCount + alignment.lexicalSubstitutionCount) / 5,
      ),
    );
    if (
      alignment.numericSubstitutionCount > 0 &&
      alignment.lexicalSubstitutionCount <= 1
    ) {
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        alignment,
        "NUMERIC_SUBSTITUTION",
        {
          scoreMillionths: scoreMillionths(
            alignment.length - alignment.numericSubstitutionCount,
            alignment.length,
          ),
          matchedTokenCount: alignment.length,
          distinctLexicalTokenCount: alignment.distinctExactLexicalCount,
        },
        ["CASE_AND_PUNCTUATION_NORMALIZED", "NUMERIC_TOKENS_SUBSTITUTED"],
      );
    }
    if (
      alignment.lexicalSubstitutionCount > 0 &&
      alignment.lexicalSubstitutionCount <= maxLexicalSubstitutions
    ) {
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        alignment,
        "IDENTIFIER_OR_NAME_SUBSTITUTION",
        {
          scoreMillionths: scoreMillionths(
            alignment.length - alignment.lexicalSubstitutionCount,
            alignment.length,
          ),
          matchedTokenCount: alignment.length,
          distinctLexicalTokenCount: alignment.distinctExactLexicalCount,
        },
        [
          "CASE_AND_PUNCTUATION_NORMALIZED",
          "LEXICAL_IDENTIFIERS_SUBSTITUTED",
          ...(alignment.numericSubstitutionCount > 0
            ? (["NUMERIC_TOKENS_SUBSTITUTED"] as const)
            : []),
        ],
      );
    }
  }

  const span = longestExactSpan(candidateTokens, referenceTokens, state);
  if (span !== null && span.length > 0) {
    const evidence = rangeEvidence(candidateTokens, span.candidateStart, span.length);
    if (isStrongEvidence(span.length, evidence)) {
      const smallerLength = Math.min(candidateTokens.length, referenceTokens.length);
      const coverage = scoreMillionths(span.length, smallerLength);
      let matchKind: QFS1MatchKind;
      if (span.length === candidateTokens.length && referenceTokens.length > span.length) {
        matchKind = "CANDIDATE_FRAGMENT_IN_REFERENCE";
      } else if (
        span.length === referenceTokens.length &&
        candidateTokens.length > span.length
      ) {
        matchKind = "REFERENCE_FRAGMENT_IN_CANDIDATE";
      } else if (coverage >= QFS1_LIMITS.minimumBlockingLexicalCoverageMillionths) {
        matchKind = "NEAR_WHOLE_BODY_COPY";
      } else {
        matchKind = candidateTokens.length <= referenceTokens.length
          ? "CANDIDATE_FRAGMENT_IN_REFERENCE"
          : "REFERENCE_FRAGMENT_IN_CANDIDATE";
      }
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        span,
        matchKind,
        {
          scoreMillionths: coverage,
          matchedTokenCount: span.length,
          distinctLexicalTokenCount: evidence.distinctLexicalCount,
        },
        ["CASE_AND_PUNCTUATION_NORMALIZED"],
      );
    }
  }

  const overlap = lexicalOverlap(candidate, compared, state);
  if (
    overlap !== null &&
    overlap.commonLexicalTokenCount >=
      QFS1_LIMITS.minimumStrongLexicalTokenCount &&
    overlap.commonDistinct >= QFS1_LIMITS.minimumDistinctLexicalEvidence &&
    (overlap.sharedWindows > 0 ||
      overlap.commonDistinct >= QFS1_LIMITS.minimumStrongTokenCount)
  ) {
    const disposition = overlap.coverageMillionths >=
      QFS1_LIMITS.minimumBlockingLexicalCoverageMillionths
      ? "BLOCKING"
      : overlap.coverageMillionths >=
          QFS1_LIMITS.minimumReviewLexicalCoverageMillionths
        ? "REVIEW"
        : null;
    if (disposition !== null) {
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        {
          candidateStart: overlap.candidateStart,
          candidateLength: overlap.candidateLength,
          referenceStart: overlap.referenceStart,
          referenceLength: overlap.referenceLength,
          length: overlap.commonLexicalTokenCount,
        },
        "LEXICAL_TRANSFORMED_COPY",
        {
          scoreMillionths: overlap.coverageMillionths,
          matchedTokenCount: overlap.commonLexicalTokenCount,
          distinctLexicalTokenCount: overlap.commonDistinct,
        },
        ["LEXICAL_ONLY_COMPARISON"],
        disposition,
      );
    }
  }
  return null;
}

function canonicalMatchSortKey(match: SimilarityMatchSummaryV1): string {
  const rank = String(QFS1_MATCH_KINDS.indexOf(match.matchKind)).padStart(2, "0");
  const candidateStart = String(match.candidateTokenRange.startInclusive).padStart(8, "0");
  const referenceStart = String(match.referenceTokenRange.startInclusive).padStart(8, "0");
  return `${match.referenceDigest}/${rank}/${candidateStart}/${referenceStart}`;
}

function canonicalReviewMaterial(
  review: Omit<SimilarityFirewallReviewV1, "reviewDigest">,
): Record<string, unknown> {
  return JSON.parse(JSON.stringify({
    contractVersion: review.contractVersion,
    candidateId: review.candidateId,
    candidateDigest: review.candidateDigest,
    candidateBodyManifestDigest: review.candidateBodyManifestDigest,
    policyRef: review.policyRef,
    policyDigest: review.policyDigest,
    corpusManifestDigest: review.corpusManifestDigest,
    corpusCounts: review.corpusCounts,
    workAccounting: review.workAccounting,
    outcome: review.outcome,
    matches: review.matches,
  })) as Record<string, unknown>;
}

function buildReview(snapshot: InspectionSnapshot): SimilarityFirewallReviewV1 {
  const state = createWorkState(snapshot.references.length);
  const candidate = prepareSequence(snapshot.candidateParts, state);
  const matches: SimilarityMatchSummaryV1[] = [];
  for (const reference of snapshot.references) {
    const compared = prepareSequence(reference.parts, state);
    const match = detectReferenceMatch(reference, candidate, compared, state);
    if (match !== null) matches.push(match);
  }
  const orderedMatches = Object.freeze(
    orderByUtf8(matches, canonicalMatchSortKey),
  );
  const hasBlocking = orderedMatches.some(
    (match) => match.disposition === "BLOCKING",
  );
  const hasReview = orderedMatches.some((match) => match.disposition === "REVIEW");
  const outcome: QFS1Outcome = hasBlocking
    ? "BLOCKED"
    : hasReview || state.budgetExhausted || state.truncatedBodyCount > 0
      ? "REVIEW_REQUIRED"
      : "CLEAR";
  const corpusCounts: SimilarityCorpusCountsV1 = Object.freeze({
    candidatePartCount: snapshot.candidateParts.length,
    referenceCount: snapshot.references.length,
    referencePartCount: snapshot.references.reduce(
      (total, reference) => total + reference.parts.length,
      0,
    ),
    inspectedBodyCount:
      snapshot.candidateParts.length +
      snapshot.references.reduce(
        (total, reference) => total + reference.parts.length,
        0,
      ),
  });
  const workAccounting: SimilarityWorkAccountingV1 = Object.freeze({
    fixedReferenceOverheadUnits: state.fixedReferenceOverheadUnits,
    originalCharacters: state.originalCharacters,
    normalizedCharacters: state.normalizedCharacters,
    observedTokens: state.observedTokens,
    retainedTokens: state.retainedTokens,
    generatedWindows: state.generatedWindows,
    comparisonWorkUnits: state.comparisonWorkUnits,
    totalWorkUnits: state.totalWorkUnits,
    truncatedBodyCount: state.truncatedBodyCount,
    budgetExhausted: state.budgetExhausted,
    completeCorpusInspection:
      !state.budgetExhausted && state.truncatedBodyCount === 0,
  });
  const material = Object.freeze({
    contractVersion: "SimilarityFirewallReviewV1" as const,
    candidateId: snapshot.candidate.candidateId,
    candidateDigest: snapshot.candidate.candidateDigest,
    candidateBodyManifestDigest: snapshot.candidateBodyManifestDigest,
    policyRef: QFS1_POLICY_REFERENCE,
    policyDigest: QFS1_POLICY_DIGEST,
    corpusManifestDigest: snapshot.corpusManifestDigest,
    corpusCounts,
    workAccounting,
    outcome,
    matches: orderedMatches,
  });
  const reviewDigest = qf0a1.digestCanonicalJsonV1(canonicalReviewMaterial(material));
  return Object.freeze({ ...material, reviewDigest });
}

function assertRange(value: unknown, label: string): SimilarityTokenRangeV1 {
  const record = readClosedRecord(value, RANGE_FIELDS, label);
  const startInclusive = readSafeInteger(
    record.startInclusive,
    0,
    QFS1_LIMITS.maxAggregateInspectedCharacters,
    `${label}_START`,
  );
  const endExclusive = readSafeInteger(
    record.endExclusive,
    startInclusive + 1,
    QFS1_LIMITS.maxAggregateInspectedCharacters,
    `${label}_END`,
  );
  return Object.freeze({ startInclusive, endExclusive });
}

function assertMeasure(value: unknown, label: string): SimilarityDeterministicMeasureV1 {
  const record = readClosedRecord(value, MEASURE_FIELDS, label);
  return Object.freeze({
    scoreMillionths: readSafeInteger(
      record.scoreMillionths,
      0,
      1_000_000,
      `${label}_SCORE`,
    ),
    matchedTokenCount: readSafeInteger(
      record.matchedTokenCount,
      1,
      QFS1_LIMITS.maxAggregateInspectedCharacters,
      `${label}_MATCHED_TOKENS`,
    ),
    distinctLexicalTokenCount: readSafeInteger(
      record.distinctLexicalTokenCount,
      0,
      QFS1_LIMITS.maxAggregateInspectedCharacters,
      `${label}_DISTINCT_LEXICAL`,
    ),
  });
}

function assertMatch(value: unknown, index: number): SimilarityMatchSummaryV1 {
  const label = `MATCH_${index}`;
  const record = readClosedRecord(value, MATCH_FIELDS, label);
  const transformations = readDenseArray(
    record.transformationProfile,
    0,
    QFS1_TRANSFORMATIONS.length,
    `${label}_TRANSFORMATIONS`,
  ).map((entry) =>
    readEnum(entry, QFS1_TRANSFORMATIONS, `${label}_TRANSFORMATION`),
  );
  if (
    qf0a1.canonicalizeBoundedJsonV1([...transformations]) !==
    qf0a1.canonicalizeBoundedJsonV1([
      ...orderedTransformations(transformations),
    ])
  ) {
    fail(`${label}_TRANSFORMATION_ORDER_INVALID`);
  }
  return Object.freeze({
    referenceId: readString(record.referenceId, REFERENCE_ID_PATTERN, `${label}_ID`),
    referenceDigest: readDigest(record.referenceDigest, `${label}_DIGEST`),
    candidatePartKind: readEnum(
      record.candidatePartKind,
      QFS1_BODY_PART_KINDS,
      `${label}_CANDIDATE_KIND`,
    ),
    referencePartKind: readEnum(
      record.referencePartKind,
      QFS1_BODY_PART_KINDS,
      `${label}_REFERENCE_KIND`,
    ),
    matchKind: readEnum(record.matchKind, QFS1_MATCH_KINDS, `${label}_KIND`),
    measure: assertMeasure(record.measure, `${label}_MEASURE`),
    candidateTokenRange: assertRange(
      record.candidateTokenRange,
      `${label}_CANDIDATE_RANGE`,
    ),
    referenceTokenRange: assertRange(
      record.referenceTokenRange,
      `${label}_REFERENCE_RANGE`,
    ),
    transformationProfile: Object.freeze(transformations),
    disposition: readEnum(
      record.disposition,
      ["BLOCKING", "REVIEW"] as const,
      `${label}_DISPOSITION`,
    ),
  });
}

function assertCorpusCounts(value: unknown): SimilarityCorpusCountsV1 {
  const record = readClosedRecord(value, CORPUS_COUNT_FIELDS, "CORPUS_COUNTS");
  const candidatePartCount = readSafeInteger(
    record.candidatePartCount,
    1,
    QFS1_LIMITS.maxCandidateParts,
    "CORPUS_COUNTS_CANDIDATE_PARTS",
  );
  const referenceCount = readSafeInteger(
    record.referenceCount,
    0,
    QFS1_LIMITS.maxCorpusReferences,
    "CORPUS_COUNTS_REFERENCES",
  );
  const referencePartCount = readSafeInteger(
    record.referencePartCount,
    referenceCount === 0 ? 0 : referenceCount,
    QFS1_LIMITS.maxCorpusReferences * QFS1_LIMITS.maxPartsPerReference,
    "CORPUS_COUNTS_REFERENCE_PARTS",
  );
  const inspectedBodyCount = readSafeInteger(
    record.inspectedBodyCount,
    candidatePartCount + referencePartCount,
    candidatePartCount + referencePartCount,
    "CORPUS_COUNTS_INSPECTED_BODIES",
  );
  return Object.freeze({
    candidatePartCount,
    referenceCount,
    referencePartCount,
    inspectedBodyCount,
  });
}

function assertWorkAccounting(value: unknown): SimilarityWorkAccountingV1 {
  const record = readClosedRecord(value, WORK_FIELDS, "WORK_ACCOUNTING");
  const result: SimilarityWorkAccountingV1 = Object.freeze({
    fixedReferenceOverheadUnits: readSafeInteger(
      record.fixedReferenceOverheadUnits,
      0,
      QFS1_LIMITS.maxCorpusReferences * QFS1_LIMITS.fixedReferenceOverheadWorkUnits,
      "WORK_REFERENCE_OVERHEAD",
    ),
    originalCharacters: readSafeInteger(
      record.originalCharacters,
      0,
      QFS1_LIMITS.maxAggregateInspectedCharacters,
      "WORK_ORIGINAL_CHARACTERS",
    ),
    normalizedCharacters: readSafeInteger(
      record.normalizedCharacters,
      0,
      QFS1_LIMITS.maxAggregateNormalizedCharacters,
      "WORK_NORMALIZED_CHARACTERS",
    ),
    observedTokens: readSafeInteger(
      record.observedTokens,
      0,
      (QFS1_LIMITS.maxCandidateParts +
        QFS1_LIMITS.maxCorpusReferences * QFS1_LIMITS.maxPartsPerReference) *
        QFS1_LIMITS.maxTokensRetainedPerBody,
      "WORK_OBSERVED_TOKENS",
    ),
    retainedTokens: readSafeInteger(
      record.retainedTokens,
      0,
      (QFS1_LIMITS.maxCandidateParts +
        QFS1_LIMITS.maxCorpusReferences * QFS1_LIMITS.maxPartsPerReference) *
        QFS1_LIMITS.maxTokensRetainedPerBody,
      "WORK_RETAINED_TOKENS",
    ),
    generatedWindows: readSafeInteger(
      record.generatedWindows,
      0,
      QFS1_LIMITS.maxTotalGeneratedWindows,
      "WORK_WINDOWS",
    ),
    comparisonWorkUnits: readSafeInteger(
      record.comparisonWorkUnits,
      0,
      QFS1_LIMITS.maxTotalComparisonWorkUnits,
      "WORK_COMPARISONS",
    ),
    totalWorkUnits: readSafeInteger(
      record.totalWorkUnits,
      0,
      QFS1_LIMITS.maxTotalWorkUnits,
      "WORK_TOTAL",
    ),
    truncatedBodyCount: readSafeInteger(
      record.truncatedBodyCount,
      0,
      0,
      "WORK_TRUNCATED_BODIES",
    ),
    budgetExhausted:
      typeof record.budgetExhausted === "boolean"
        ? record.budgetExhausted
        : fail("WORK_BUDGET_EXHAUSTED_INVALID"),
    completeCorpusInspection:
      typeof record.completeCorpusInspection === "boolean"
        ? record.completeCorpusInspection
        : fail("WORK_COMPLETE_INVALID"),
  });
  const expectedTotal =
    result.fixedReferenceOverheadUnits +
    result.originalCharacters +
    result.normalizedCharacters +
    result.observedTokens +
    result.generatedWindows +
    result.comparisonWorkUnits;
  if (result.retainedTokens !== result.observedTokens) {
    fail("WORK_TOKEN_ACCOUNTING_INVALID");
  }
  if (result.totalWorkUnits !== expectedTotal) fail("WORK_TOTAL_INVALID");
  if (result.completeCorpusInspection !== !result.budgetExhausted) {
    fail("WORK_COMPLETENESS_INVALID");
  }
  return result;
}

export function createSimilarityFirewallReviewV1(
  value: unknown,
): SimilarityFirewallReviewV1 {
  assertDependenciesV1();
  return buildReview(snapshotInspection(value));
}

export function assertSimilarityFirewallReviewV1(
  value: unknown,
): SimilarityFirewallReviewV1 {
  assertDependenciesV1();
  const record = readClosedRecord(value, REVIEW_FIELDS, "REVIEW");
  if (record.contractVersion !== "SimilarityFirewallReviewV1") {
    fail("REVIEW_CONTRACT_VERSION_INVALID");
  }
  const matches = Object.freeze(
    readDenseArray(
      record.matches,
      0,
      QFS1_LIMITS.maxCorpusReferences,
      "REVIEW_MATCHES",
    ).map(assertMatch),
  );
  assertUniqueUtf8(matches, (match) => match.referenceDigest, "MATCH_REFERENCE");
  if (
    qf0a1.canonicalizeBoundedJsonV1(JSON.parse(JSON.stringify(matches))) !==
    qf0a1.canonicalizeBoundedJsonV1(
      JSON.parse(JSON.stringify(orderByUtf8(matches, canonicalMatchSortKey))),
    )
  ) {
    fail("MATCH_ORDER_INVALID");
  }
  const corpusCounts = assertCorpusCounts(record.corpusCounts);
  if (matches.length > corpusCounts.referenceCount) fail("MATCH_COUNT_INVALID");
  const workAccounting = assertWorkAccounting(record.workAccounting);
  if (
    workAccounting.fixedReferenceOverheadUnits !==
    corpusCounts.referenceCount * QFS1_LIMITS.fixedReferenceOverheadWorkUnits
  ) {
    fail("REFERENCE_OVERHEAD_ACCOUNTING_INVALID");
  }
  const outcome = readEnum(record.outcome, QFS1_OUTCOMES, "REVIEW_OUTCOME");
  const hasBlocking = matches.some((match) => match.disposition === "BLOCKING");
  const hasReview = matches.some((match) => match.disposition === "REVIEW");
  const expectedOutcome: QFS1Outcome = hasBlocking
    ? "BLOCKED"
    : hasReview || !workAccounting.completeCorpusInspection
      ? "REVIEW_REQUIRED"
      : "CLEAR";
  if (outcome !== expectedOutcome) fail("REVIEW_OUTCOME_INCONSISTENT");
  if (record.policyRef !== QFS1_POLICY_REFERENCE) fail("REVIEW_POLICY_REF_INVALID");
  if (record.policyDigest !== QFS1_POLICY_DIGEST) fail("REVIEW_POLICY_DIGEST_INVALID");

  const material = Object.freeze({
    contractVersion: "SimilarityFirewallReviewV1" as const,
    candidateId: readString(record.candidateId, CANDIDATE_ID_PATTERN, "REVIEW_CANDIDATE_ID"),
    candidateDigest: readDigest(record.candidateDigest, "REVIEW_CANDIDATE_DIGEST"),
    candidateBodyManifestDigest: readDigest(
      record.candidateBodyManifestDigest,
      "REVIEW_CANDIDATE_MANIFEST_DIGEST",
    ),
    policyRef: QFS1_POLICY_REFERENCE,
    policyDigest: QFS1_POLICY_DIGEST,
    corpusManifestDigest: readDigest(
      record.corpusManifestDigest,
      "REVIEW_CORPUS_MANIFEST_DIGEST",
    ),
    corpusCounts,
    workAccounting,
    outcome,
    matches,
  });
  const reviewDigest = readDigest(record.reviewDigest, "REVIEW_DIGEST");
  const expectedDigest = qf0a1.digestCanonicalJsonV1(canonicalReviewMaterial(material));
  if (reviewDigest !== expectedDigest) fail("REVIEW_DIGEST_MISMATCH");
  if (QFS1_CONTRACT_VERSION !== QFS1_LIMITS.contractVersion) {
    fail("LIMIT_CONTRACT_VERSION_DRIFT");
  }
  return Object.freeze({ ...material, reviewDigest });
}
