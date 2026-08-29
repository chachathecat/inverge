import { types as utilTypes } from "node:util";

import * as qf0a1 from "../quarantine/bounded-canonical-json";
import * as qfs1aContracts from "./preparation-contracts";
import * as qfs1aCore from "./preparation-core";
import {
  QFS1_CONTRACT_VERSION,
  QFS1_LIMITS,
  QFS1_MATCH_KINDS,
  QFS1_OUTCOMES,
  QFS1_POLICY_DIGEST,
  QFS1_POLICY_REFERENCE,
  QFS1_QFS1A_DEPENDENCY_RECEIPT,
  QFS1_TRANSFORMATIONS,
  type QFS1MatchKind,
  type QFS1Outcome,
  type QFS1Transformation,
  type SimilarityCorpusCountsV1,
  type SimilarityDeterministicMeasureV1,
  type SimilarityFirewallReviewV1,
  type SimilarityMatchSummaryV1,
  type SimilarityTokenRangeV1,
  type SimilarityWorkAccountingV1,
} from "./similarity-contracts";

import type {
  PreparedSimilarityBodySequenceV1,
  PreparedSimilarityCorpusV1,
  PreparedSimilarityReferenceSequenceV1,
  PreparedSimilarityTokenV1,
  SimilarityCorpusPreparationInputV1,
} from "./preparation-contracts";

const REVIEW_FIELDS = Object.freeze([
  "contractVersion",
  "candidateId",
  "candidateDigest",
  "candidateBodyManifestDigest",
  "preparationDigest",
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
  "preparedBodyCount",
] as const);
const WORK_FIELDS = Object.freeze([
  "fixedReferenceOverheadUnits",
  "originalCharacters",
  "normalizedCharacters",
  "observedTokens",
  "retainedTokens",
  "mandatoryTotalWorkUnits",
  "remainingOptionalWorkUnitsAtStart",
  "generatedWindows",
  "comparisonWorkUnits",
  "optionalWorkUnitsConsumed",
  "totalWorkUnits",
  "budgetExhausted",
  "completeCorpusInspection",
  "preparedBodyCount",
  "referenceCount",
  "referencePartCount",
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
const REFERENCE_ID_PATTERN = /^qfsr_[a-f0-9]{64}$/u;

type Token = PreparedSimilarityTokenV1;
type Reference = PreparedSimilarityReferenceSequenceV1;

interface OptionalWorkState {
  readonly remainingAtStart: number;
  generatedWindows: number;
  comparisonWorkUnits: number;
  budgetExhausted: boolean;
}

interface PreparedSequence {
  readonly tokens: readonly Token[];
  readonly lexicalWindows: ReadonlySet<string>;
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

function readClosedRecord<T extends readonly string[]>(
  value: unknown,
  fields: T,
  label: string,
): Record<T[number], unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    utilTypes.isProxy(value)
  ) {
    fail(`${label}_PLAIN_RECORD_REQUIRED`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label}_PROTOTYPE_UNSUPPORTED`);
  }
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === "symbol")) fail(`${label}_SYMBOL_FORBIDDEN`);
  const strings = keys as string[];
  if (strings.length !== fields.length) fail(`${label}_FIELD_COUNT_INVALID`);
  const expected = new Set<string>(fields);
  for (const key of strings) {
    if (!expected.has(key)) fail(`${label}_UNKNOWN_FIELD_${key}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !("value" in descriptor) ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.enumerable !== true
    ) {
      fail(`${label}_DATA_FIELD_REQUIRED`);
    }
  }
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      fail(`${label}_MISSING_FIELD_${field}`);
    }
  }
  return value as Record<T[number], unknown>;
}

function readDenseArray(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): readonly unknown[] {
  if (!Array.isArray(value) || utilTypes.isProxy(value)) {
    fail(`${label}_DENSE_ARRAY_REQUIRED`);
  }
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    fail(`${label}_ARRAY_PROTOTYPE_UNSUPPORTED`);
  }
  if (value.length < minimum || value.length > maximum) {
    fail(`${label}_COUNT_INVALID`);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) {
    fail(`${label}_SYMBOL_FORBIDDEN`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      fail(`${label}_SPARSE_ARRAY_FORBIDDEN`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !("value" in descriptor)) {
      fail(`${label}_DATA_ELEMENT_REQUIRED`);
    }
  }
  const permitted = new Set(["length", ...value.map((_, index) => String(index))]);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "string" && !permitted.has(key)) {
      fail(`${label}_ARRAY_EXTENSION_FORBIDDEN`);
    }
  }
  return value;
}

function readString(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${label}_INVALID`);
  return value;
}

function readDigest(value: unknown, label: string): string {
  return readString(value, DIGEST_PATTERN, label);
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

function sameCanonical(left: unknown, right: unknown): boolean {
  return (
    qf0a1.canonicalizeBoundedJsonV1(plain(left)) ===
    qf0a1.canonicalizeBoundedJsonV1(plain(right))
  );
}

function assertExactExports(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (!sameCanonical(orderByUtf8(actual, (value) => value), orderByUtf8(expected, (value) => value))) {
    fail(`${label}_EXPORT_SURFACE_DRIFT`);
  }
}

function plain(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
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
    Object.keys(qfs1aContracts),
    QFS1_QFS1A_DEPENDENCY_RECEIPT.contractExportsExactly,
    "QFS1A_CONTRACTS",
  );
  assertExactExports(
    Object.keys(qfs1aCore),
    QFS1_QFS1A_DEPENDENCY_RECEIPT.coreExportsExactly,
    "QFS1A_CORE",
  );
  if (
    qf0a1.digestCanonicalJsonV1(
      plain(qfs1aContracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ) !== QFS1_QFS1A_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest
  ) {
    fail("QFS1A_BOUNDARY_RECEIPT_DRIFT");
  }
  if (
    qfs1aContracts.QFS1A_CONTRACT_VERSION !==
      QFS1_QFS1A_DEPENDENCY_RECEIPT.contractVersion ||
    !sameCanonical(
      plain(qfs1aContracts.QFS1A_LIMITS),
      plain(QFS1_QFS1A_DEPENDENCY_RECEIPT.limits),
    ) ||
    !sameCanonical(
      plain(qfs1aContracts.QFS1A_REFERENCE_PURPOSES),
      plain(QFS1_QFS1A_DEPENDENCY_RECEIPT.referencePurposesExactly),
    ) ||
    !sameCanonical(
      plain(qfs1aContracts.QFS1A_REFERENCE_SOURCE_CLASSES),
      plain(QFS1_QFS1A_DEPENDENCY_RECEIPT.referenceSourceClassesExactly),
    )
  ) {
    fail("QFS1A_CONTRACT_OR_LIMIT_DRIFT");
  }
}

function flattenTokens(
  parts: readonly PreparedSimilarityBodySequenceV1[],
): readonly Token[] {
  const tokens: Token[] = [];
  for (const part of parts) {
    for (const token of part.tokens) tokens.push(token);
  }
  return Object.freeze(tokens);
}

function tokenOffset(
  parts: readonly PreparedSimilarityBodySequenceV1[],
  partIndex: number,
): number {
  let offset = 0;
  for (let index = 0; index < partIndex; index += 1) {
    offset += parts[index].tokens.length;
  }
  return offset;
}

function optionalConsumed(state: OptionalWorkState): number {
  return state.generatedWindows + state.comparisonWorkUnits;
}

function remainingOptional(state: OptionalWorkState): number {
  return state.remainingAtStart - optionalConsumed(state);
}

function consumeComparison(state: OptionalWorkState): boolean {
  if (
    state.comparisonWorkUnits >= QFS1_LIMITS.maxTotalComparisonWorkUnits ||
    remainingOptional(state) <= 0
  ) {
    state.budgetExhausted = true;
    return false;
  }
  state.comparisonWorkUnits += 1;
  return true;
}

function consumeWindow(state: OptionalWorkState): boolean {
  if (
    state.generatedWindows >= QFS1_LIMITS.maxTotalGeneratedWindows ||
    remainingOptional(state) <= 0
  ) {
    state.budgetExhausted = true;
    return false;
  }
  state.generatedWindows += 1;
  return true;
}

function tokenEquals(
  left: Token,
  right: Token,
  state: OptionalWorkState,
): boolean | null {
  if (!consumeComparison(state)) return null;
  return left.value === right.value && left.kind === right.kind;
}

function completeArrayEquality(
  left: readonly Token[],
  right: readonly Token[],
  state: OptionalWorkState,
): boolean | null {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const equal = tokenEquals(left[index], right[index], state);
    if (equal === null) return null;
    if (!equal) return false;
  }
  return true;
}

function rangeEvidence(
  tokens: readonly Token[],
  start: number,
  length: number,
  state: OptionalWorkState,
): { readonly lexicalCount: number; readonly distinctLexicalCount: number } | null {
  const distinct = new Set<string>();
  let lexicalCount = 0;
  for (let index = start; index < start + length; index += 1) {
    if (!consumeComparison(state)) return null;
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
  tokens: readonly Token[],
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
  const selected = new Set(values);
  return Object.freeze(
    QFS1_TRANSFORMATIONS.filter((value) => selected.has(value)),
  );
}

function makeMatch(
  reference: Reference,
  candidateTokens: readonly Token[],
  referenceTokens: readonly Token[],
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

function recordMatch(
  matches: Map<string, SimilarityMatchSummaryV1>,
  match: SimilarityMatchSummaryV1,
): void {
  const current = matches.get(match.referenceDigest);
  if (current === undefined || (current.disposition === "REVIEW" && match.disposition === "BLOCKING")) {
    matches.set(match.referenceDigest, match);
  }
}

function exactCopyPrepass(
  prepared: PreparedSimilarityCorpusV1,
  candidateTokens: readonly Token[],
  referenceTokens: ReadonlyMap<string, readonly Token[]>,
  state: OptionalWorkState,
  matches: Map<string, SimilarityMatchSummaryV1>,
): boolean {
  for (const reference of prepared.referenceSequences) {
    const flattened = referenceTokens.get(reference.referenceDigest);
    if (flattened === undefined) fail("REFERENCE_TOKEN_MAP_INCOMPLETE");
    if (!consumeComparison(state)) return false;
    if (
      prepared.candidateNormalizedSequenceDigest ===
      reference.normalizedSequenceDigest
    ) {
      const evidence = rangeEvidence(
        candidateTokens,
        0,
        candidateTokens.length,
        state,
      );
      if (evidence === null) return false;
      if (candidateTokens.length > 0 && isStrongEvidence(candidateTokens.length, evidence)) {
        recordMatch(
          matches,
          makeMatch(
            reference,
            candidateTokens,
            flattened,
            { candidateStart: 0, referenceStart: 0, length: candidateTokens.length },
            "STRUCTURED_PARTS_COPY",
            {
              scoreMillionths: 1_000_000,
              matchedTokenCount: candidateTokens.length,
              distinctLexicalTokenCount: evidence.distinctLexicalCount,
            },
            ["CASE_AND_PUNCTUATION_NORMALIZED"],
          ),
        );
      }
    }
    for (
      let candidateIndex = 0;
      candidateIndex < prepared.candidateSequences.length;
      candidateIndex += 1
    ) {
      const candidatePart = prepared.candidateSequences[candidateIndex];
      for (
        let referenceIndex = 0;
        referenceIndex < reference.parts.length;
        referenceIndex += 1
      ) {
        const referencePart = reference.parts[referenceIndex];
        if (!consumeComparison(state)) return false;
        if (
          candidatePart.normalizedSequenceDigest !==
          referencePart.normalizedSequenceDigest
        ) {
          continue;
        }
        if (matches.get(reference.referenceDigest)?.disposition === "BLOCKING") {
          continue;
        }
        const evidence = rangeEvidence(
          candidatePart.tokens,
          0,
          candidatePart.tokens.length,
          state,
        );
        if (evidence === null) return false;
        if (
          candidatePart.tokens.length > 0 &&
          isStrongEvidence(candidatePart.tokens.length, evidence)
        ) {
          const candidateStart = tokenOffset(
            prepared.candidateSequences,
            candidateIndex,
          );
          const referenceStart = tokenOffset(reference.parts, referenceIndex);
          recordMatch(
            matches,
            makeMatch(
              reference,
              candidateTokens,
              flattened,
              {
                candidateStart,
                referenceStart,
                length: candidatePart.tokens.length,
              },
              "EXACT_NORMALIZED_COPY",
              {
                scoreMillionths: 1_000_000,
                matchedTokenCount: candidatePart.tokens.length,
                distinctLexicalTokenCount: evidence.distinctLexicalCount,
              },
              ["CASE_AND_PUNCTUATION_NORMALIZED"],
            ),
          );
        }
      }
    }
  }
  return true;
}

function longestExactSpan(
  candidate: readonly Token[],
  reference: readonly Token[],
  state: OptionalWorkState,
): ExactSpan | null {
  let best: ExactSpan = { candidateStart: 0, referenceStart: 0, length: 0 };
  for (let candidateStart = 0; candidateStart < candidate.length; candidateStart += 1) {
    for (let referenceStart = 0; referenceStart < reference.length; referenceStart += 1) {
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
      if (length > best.length) best = { candidateStart, referenceStart, length };
      if (best.length === Math.min(candidate.length, reference.length)) return best;
    }
  }
  return best;
}

function bestShapeAlignment(
  candidate: readonly Token[],
  reference: readonly Token[],
  state: OptionalWorkState,
): AlignmentEvidence | null {
  const length = Math.min(candidate.length, reference.length);
  if (length < QFS1_LIMITS.minimumStrongTokenCount) return null;
  const candidateOffsetMaximum = Math.max(0, candidate.length - length);
  const referenceOffsetMaximum = Math.max(0, reference.length - length);
  let best: AlignmentEvidence | null = null;
  for (let candidateStart = 0; candidateStart <= candidateOffsetMaximum; candidateStart += 1) {
    for (let referenceStart = 0; referenceStart <= referenceOffsetMaximum; referenceStart += 1) {
      let exactLexicalCount = 0;
      let lexicalSubstitutionCount = 0;
      let numericSubstitutionCount = 0;
      let kindMismatchCount = 0;
      const distinctExact = new Set<string>();
      for (let index = 0; index < length; index += 1) {
        if (!consumeComparison(state)) return best;
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
        exactLexicalCount * 100 - lexicalSubstitutionCount * 20 - kindMismatchCount * 100;
      const bestStrength =
        best === null
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
  candidate: readonly Token[],
  reference: readonly Token[],
  state: OptionalWorkState,
): { readonly maximumDisplacement: number } | null {
  if (candidate.length !== reference.length || candidate.length === 0) return null;
  const positions = new Map<string, number[]>();
  for (let index = 0; index < reference.length; index += 1) {
    if (!consumeComparison(state)) return null;
    const key = `${reference[index].kind}:${reference[index].value}`;
    const entries = positions.get(key) ?? [];
    entries.push(index);
    positions.set(key, entries);
  }
  const consumed = new Map<string, number>();
  let maximumDisplacement = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    if (!consumeComparison(state)) return null;
    const key = `${candidate[index].kind}:${candidate[index].value}`;
    const offset = consumed.get(key) ?? 0;
    const target = positions.get(key)?.[offset];
    if (target === undefined) return null;
    consumed.set(key, offset + 1);
    maximumDisplacement = Math.max(maximumDisplacement, Math.abs(index - target));
  }
  return { maximumDisplacement };
}

function detectComparisonFirst(
  reference: Reference,
  candidateTokens: readonly Token[],
  referenceTokens: readonly Token[],
  state: OptionalWorkState,
): SimilarityMatchSummaryV1 | null {
  if (candidateTokens.length === 0 || referenceTokens.length === 0) return null;

  const exact = completeArrayEquality(candidateTokens, referenceTokens, state);
  if (exact === true) {
    const evidence = rangeEvidence(candidateTokens, 0, candidateTokens.length, state);
    if (evidence === null) return null;
    if (isStrongEvidence(candidateTokens.length, evidence)) {
      return makeMatch(
        reference,
        candidateTokens,
        referenceTokens,
        { candidateStart: 0, referenceStart: 0, length: candidateTokens.length },
        "STRUCTURED_PARTS_COPY",
        {
          scoreMillionths: 1_000_000,
          matchedTokenCount: candidateTokens.length,
          distinctLexicalTokenCount: evidence.distinctLexicalCount,
        },
        ["CASE_AND_PUNCTUATION_NORMALIZED"],
      );
    }
  }
  if (state.budgetExhausted) return null;

  const order = boundedOrderEvidence(candidateTokens, referenceTokens, state);
  if (state.budgetExhausted) return null;
  if (
    order !== null &&
    order.maximumDisplacement > 0 &&
    order.maximumDisplacement <= QFS1_LIMITS.maximumOrderDisplacement
  ) {
    const evidence = rangeEvidence(candidateTokens, 0, candidateTokens.length, state);
    if (evidence === null) return null;
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
  if (state.budgetExhausted) return null;
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
  if (state.budgetExhausted || span === null || span.length === 0) return null;
  const evidence = rangeEvidence(
    candidateTokens,
    span.candidateStart,
    span.length,
    state,
  );
  if (evidence === null || !isStrongEvidence(span.length, evidence)) return null;
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
    matchKind =
      candidateTokens.length <= referenceTokens.length
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

function generateLexicalWindows(
  tokens: readonly Token[],
  state: OptionalWorkState,
): ReadonlySet<string> | null {
  const lexical: Token[] = [];
  for (const token of tokens) {
    if (!consumeComparison(state)) return null;
    if (token.kind === "LEXICAL" && !token.generic) lexical.push(token);
  }
  const windows = new Set<string>();
  const size = QFS1_LIMITS.lexicalWindowSize;
  for (let index = 0; index + size <= lexical.length; index += 1) {
    if (!consumeWindow(state)) return null;
    windows.add(
      lexical
        .slice(index, index + size)
        .map((token) => token.value)
        .join("\u0000"),
    );
  }
  return windows;
}

function lexicalOverlap(
  candidate: PreparedSequence,
  reference: PreparedSequence,
  state: OptionalWorkState,
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
  const candidateFrequency = new Map<string, number>();
  const referenceFrequency = new Map<string, number>();
  const candidatePositions = new Map<string, number[]>();
  const referencePositions = new Map<string, number[]>();
  let candidateLexicalCount = 0;
  let referenceLexicalCount = 0;

  for (let index = 0; index < candidate.tokens.length; index += 1) {
    if (!consumeComparison(state)) return null;
    const token = candidate.tokens[index];
    if (token.kind !== "LEXICAL" || token.generic) continue;
    candidateLexicalCount += 1;
    candidateFrequency.set(token.value, (candidateFrequency.get(token.value) ?? 0) + 1);
    const positions = candidatePositions.get(token.value) ?? [];
    positions.push(index);
    candidatePositions.set(token.value, positions);
  }
  for (let index = 0; index < reference.tokens.length; index += 1) {
    if (!consumeComparison(state)) return null;
    const token = reference.tokens[index];
    if (token.kind !== "LEXICAL" || token.generic) continue;
    referenceLexicalCount += 1;
    referenceFrequency.set(token.value, (referenceFrequency.get(token.value) ?? 0) + 1);
    const positions = referencePositions.get(token.value) ?? [];
    positions.push(index);
    referencePositions.set(token.value, positions);
  }

  const candidateKeys = orderByUtf8([...candidateFrequency.keys()], (value) => value);
  const referenceSet = new Set(referenceFrequency.keys());
  let commonDistinct = 0;
  let commonLexicalTokenCount = 0;
  const matchedCandidatePositions: number[] = [];
  const matchedReferencePositions: number[] = [];
  for (const token of candidateKeys) {
    if (!consumeComparison(state)) return null;
    if (!referenceSet.has(token)) continue;
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

  const smallerWindows =
    candidate.lexicalWindows.size <= reference.lexicalWindows.size
      ? candidate.lexicalWindows
      : reference.lexicalWindows;
  const largerWindows =
    candidate.lexicalWindows.size <= reference.lexicalWindows.size
      ? reference.lexicalWindows
      : candidate.lexicalWindows;
  let sharedWindows = 0;
  for (const window of smallerWindows) {
    if (!consumeComparison(state)) return null;
    if (largerWindows.has(window)) sharedWindows += 1;
  }
  const candidateStart =
    matchedCandidatePositions.length === 0 ? 0 : Math.min(...matchedCandidatePositions);
  const candidateEnd =
    matchedCandidatePositions.length === 0
      ? 0
      : Math.max(...matchedCandidatePositions) + 1;
  const referenceStart =
    matchedReferencePositions.length === 0 ? 0 : Math.min(...matchedReferencePositions);
  const referenceEnd =
    matchedReferencePositions.length === 0
      ? 0
      : Math.max(...matchedReferencePositions) + 1;
  const smallerDistinct = Math.min(candidateFrequency.size, referenceFrequency.size);
  return {
    commonLexicalTokenCount,
    commonDistinct,
    coverageMillionths: Math.min(
      scoreMillionths(commonDistinct, smallerDistinct),
      scoreMillionths(
        commonLexicalTokenCount,
        Math.min(candidateLexicalCount, referenceLexicalCount),
      ),
    ),
    sharedWindows,
    candidateStart,
    candidateLength: candidateEnd - candidateStart,
    referenceStart,
    referenceLength: referenceEnd - referenceStart,
  };
}

function detectLexicalMatch(
  reference: Reference,
  candidate: PreparedSequence,
  compared: PreparedSequence,
  state: OptionalWorkState,
): SimilarityMatchSummaryV1 | null {
  const overlap = lexicalOverlap(candidate, compared, state);
  if (overlap === null || state.budgetExhausted) return null;
  if (
    overlap.commonLexicalTokenCount < QFS1_LIMITS.minimumStrongLexicalTokenCount ||
    overlap.commonDistinct < QFS1_LIMITS.minimumDistinctLexicalEvidence ||
    (overlap.sharedWindows === 0 &&
      overlap.commonDistinct < QFS1_LIMITS.minimumStrongTokenCount)
  ) {
    return null;
  }
  const disposition =
    overlap.coverageMillionths >= QFS1_LIMITS.minimumBlockingLexicalCoverageMillionths
      ? "BLOCKING"
      : overlap.coverageMillionths >=
          QFS1_LIMITS.minimumReviewLexicalCoverageMillionths
        ? "REVIEW"
        : null;
  if (disposition === null) return null;
  return makeMatch(
    reference,
    candidate.tokens,
    compared.tokens,
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

function canonicalMatchSortKey(match: SimilarityMatchSummaryV1): string {
  const rank = String(QFS1_MATCH_KINDS.indexOf(match.matchKind)).padStart(2, "0");
  const candidateStart = String(match.candidateTokenRange.startInclusive).padStart(8, "0");
  const referenceStart = String(match.referenceTokenRange.startInclusive).padStart(8, "0");
  return `${match.referenceDigest}/${rank}/${candidateStart}/${referenceStart}`;
}

function canonicalReviewMaterial(
  review: Omit<SimilarityFirewallReviewV1, "reviewDigest">,
): Record<string, unknown> {
  return plain({
    contractVersion: review.contractVersion,
    candidateId: review.candidateId,
    candidateDigest: review.candidateDigest,
    candidateBodyManifestDigest: review.candidateBodyManifestDigest,
    preparationDigest: review.preparationDigest,
    policyRef: review.policyRef,
    policyDigest: review.policyDigest,
    corpusManifestDigest: review.corpusManifestDigest,
    corpusCounts: review.corpusCounts,
    workAccounting: review.workAccounting,
    outcome: review.outcome,
    matches: review.matches,
  }) as Record<string, unknown>;
}

function assertExecutionTrace(trace: readonly string[]): void {
  const preparationBegin = trace.indexOf("PREPARATION_BEGIN");
  const preparationComplete = trace.indexOf("PREPARATION_COMPLETE");
  const prepassBegin = trace.indexOf("EXACT_PREPASS_BEGIN");
  const prepassComplete = trace.indexOf("EXACT_PREPASS_COMPLETE");
  if (
    preparationBegin !== 0 ||
    preparationComplete !== 1 ||
    prepassBegin !== 2 ||
    (prepassComplete !== -1 && prepassComplete < prepassBegin)
  ) {
    fail("EXECUTION_ORDER_INVALID");
  }
  const firstWindow = trace.findIndex((event) => event.startsWith("WINDOW:"));
  if (firstWindow !== -1 && (prepassComplete === -1 || firstWindow < prepassComplete)) {
    fail("WINDOW_BEFORE_EXACT_PREPASS_FORBIDDEN");
  }
  const compared = new Set<string>();
  for (const event of trace) {
    if (event.startsWith("COMPARE:")) compared.add(event.slice("COMPARE:".length));
    if (event.startsWith("WINDOW:") && !compared.has(event.slice("WINDOW:".length))) {
      fail("WINDOW_BEFORE_REFERENCE_COMPARISON_FORBIDDEN");
    }
  }
}

function buildReview(
  prepared: PreparedSimilarityCorpusV1,
  trace: string[],
): SimilarityFirewallReviewV1 {
  const state: OptionalWorkState = {
    remainingAtStart: prepared.workAccounting.remainingOptionalWorkUnits,
    generatedWindows: 0,
    comparisonWorkUnits: 0,
    budgetExhausted: false,
  };
  const candidateTokens = flattenTokens(prepared.candidateSequences);
  const referenceTokens = new Map<string, readonly Token[]>();
  for (const reference of prepared.referenceSequences) {
    referenceTokens.set(reference.referenceDigest, flattenTokens(reference.parts));
  }
  const matches = new Map<string, SimilarityMatchSummaryV1>();

  trace.push("EXACT_PREPASS_BEGIN");
  const exactPrepassComplete = exactCopyPrepass(
    prepared,
    candidateTokens,
    referenceTokens,
    state,
    matches,
  );
  if (exactPrepassComplete) trace.push("EXACT_PREPASS_COMPLETE");

  let completeCorpusInspection = exactPrepassComplete && !state.budgetExhausted;
  let candidateWindows: ReadonlySet<string> | null = null;
  if (completeCorpusInspection) {
    for (const reference of prepared.referenceSequences) {
      const comparedTokens = referenceTokens.get(reference.referenceDigest);
      if (comparedTokens === undefined) fail("REFERENCE_TOKEN_MAP_INCOMPLETE");
      trace.push(`COMPARE:${reference.referenceDigest}`);
      if (matches.get(reference.referenceDigest)?.disposition !== "BLOCKING") {
        const comparisonMatch = detectComparisonFirst(
          reference,
          candidateTokens,
          comparedTokens,
          state,
        );
        if (comparisonMatch !== null) recordMatch(matches, comparisonMatch);
      }
      if (state.budgetExhausted) {
        completeCorpusInspection = false;
        break;
      }
      if (matches.get(reference.referenceDigest)?.disposition === "BLOCKING") {
        continue;
      }

      trace.push(`WINDOW:${reference.referenceDigest}`);
      if (candidateWindows === null) {
        candidateWindows = generateLexicalWindows(candidateTokens, state);
      }
      if (candidateWindows === null || state.budgetExhausted) {
        completeCorpusInspection = false;
        break;
      }
      const comparedWindows = generateLexicalWindows(comparedTokens, state);
      if (comparedWindows === null || state.budgetExhausted) {
        completeCorpusInspection = false;
        break;
      }
      const lexicalMatch = detectLexicalMatch(
        reference,
        Object.freeze({ tokens: candidateTokens, lexicalWindows: candidateWindows }),
        Object.freeze({ tokens: comparedTokens, lexicalWindows: comparedWindows }),
        state,
      );
      if (lexicalMatch !== null) recordMatch(matches, lexicalMatch);
      if (state.budgetExhausted) {
        completeCorpusInspection = false;
        break;
      }
    }
  }
  if (state.budgetExhausted) completeCorpusInspection = false;
  assertExecutionTrace(trace);

  const orderedMatches = Object.freeze(
    orderByUtf8([...matches.values()], canonicalMatchSortKey),
  );
  const hasBlocking = orderedMatches.some((match) => match.disposition === "BLOCKING");
  const hasReview = orderedMatches.some((match) => match.disposition === "REVIEW");
  const outcome: QFS1Outcome = hasBlocking
    ? "BLOCKED"
    : hasReview || state.budgetExhausted || !completeCorpusInspection
      ? "REVIEW_REQUIRED"
      : "CLEAR";
  const corpusCounts: SimilarityCorpusCountsV1 = Object.freeze({
    candidatePartCount: prepared.counts.candidatePartCount,
    referenceCount: prepared.counts.referenceCount,
    referencePartCount: prepared.counts.referencePartCount,
    preparedBodyCount: prepared.counts.preparedBodyCount,
  });
  const optionalWorkUnitsConsumed = optionalConsumed(state);
  const workAccounting: SimilarityWorkAccountingV1 = Object.freeze({
    fixedReferenceOverheadUnits:
      prepared.workAccounting.fixedReferenceOverheadUnits,
    originalCharacters: prepared.workAccounting.originalCharacters,
    normalizedCharacters: prepared.workAccounting.normalizedCharacters,
    observedTokens: prepared.workAccounting.observedTokens,
    retainedTokens: prepared.workAccounting.retainedTokens,
    mandatoryTotalWorkUnits: prepared.workAccounting.mandatoryTotalWorkUnits,
    remainingOptionalWorkUnitsAtStart: state.remainingAtStart,
    generatedWindows: state.generatedWindows,
    comparisonWorkUnits: state.comparisonWorkUnits,
    optionalWorkUnitsConsumed,
    totalWorkUnits:
      prepared.workAccounting.mandatoryTotalWorkUnits + optionalWorkUnitsConsumed,
    budgetExhausted: state.budgetExhausted,
    completeCorpusInspection,
    preparedBodyCount: prepared.counts.preparedBodyCount,
    referenceCount: prepared.counts.referenceCount,
    referencePartCount: prepared.counts.referencePartCount,
  });
  const material = Object.freeze({
    contractVersion: "SimilarityFirewallReviewV1" as const,
    candidateId: prepared.candidateId,
    candidateDigest: prepared.candidateDigest,
    candidateBodyManifestDigest: prepared.candidateBodyManifestDigest,
    preparationDigest: prepared.preparationDigest,
    policyRef: QFS1_POLICY_REFERENCE,
    policyDigest: QFS1_POLICY_DIGEST,
    corpusManifestDigest: prepared.corpusManifestDigest,
    corpusCounts,
    workAccounting,
    outcome,
    matches: orderedMatches,
  });
  const reviewDigest = qf0a1.digestCanonicalJsonV1(
    canonicalReviewMaterial(material),
  );
  return Object.freeze({ ...material, reviewDigest });
}

function assertRange(value: unknown, label: string): SimilarityTokenRangeV1 {
  const record = readClosedRecord(value, RANGE_FIELDS, label);
  const startInclusive = readSafeInteger(
    record.startInclusive,
    0,
    qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    `${label}_START`,
  );
  const endExclusive = readSafeInteger(
    record.endExclusive,
    startInclusive + 1,
    qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    `${label}_END`,
  );
  return Object.freeze({ startInclusive, endExclusive });
}

function assertMeasure(
  value: unknown,
  label: string,
): SimilarityDeterministicMeasureV1 {
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
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
      `${label}_MATCHED_TOKENS`,
    ),
    distinctLexicalTokenCount: readSafeInteger(
      record.distinctLexicalTokenCount,
      0,
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
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
  if (!sameCanonical(transformations, orderedTransformations(transformations))) {
    fail(`${label}_TRANSFORMATION_ORDER_INVALID`);
  }
  return Object.freeze({
    referenceId: readString(record.referenceId, REFERENCE_ID_PATTERN, `${label}_ID`),
    referenceDigest: readDigest(record.referenceDigest, `${label}_DIGEST`),
    candidatePartKind: readEnum(
      record.candidatePartKind,
      qfs1aContracts.QFS1A_BODY_PART_KINDS,
      `${label}_CANDIDATE_KIND`,
    ),
    referencePartKind: readEnum(
      record.referencePartKind,
      qfs1aContracts.QFS1A_BODY_PART_KINDS,
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
    qfs1aContracts.QFS1A_LIMITS.maxCandidateParts,
    "CORPUS_COUNTS_CANDIDATE_PARTS",
  );
  const referenceCount = readSafeInteger(
    record.referenceCount,
    0,
    qfs1aContracts.QFS1A_LIMITS.maxCorpusReferences,
    "CORPUS_COUNTS_REFERENCES",
  );
  const referencePartCount = readSafeInteger(
    record.referencePartCount,
    referenceCount === 0 ? 0 : referenceCount,
    qfs1aContracts.QFS1A_LIMITS.maxCorpusReferences *
      qfs1aContracts.QFS1A_LIMITS.maxPartsPerReference,
    "CORPUS_COUNTS_REFERENCE_PARTS",
  );
  const preparedBodyCount = readSafeInteger(
    record.preparedBodyCount,
    candidatePartCount + referencePartCount,
    candidatePartCount + referencePartCount,
    "CORPUS_COUNTS_PREPARED_BODIES",
  );
  return Object.freeze({
    candidatePartCount,
    referenceCount,
    referencePartCount,
    preparedBodyCount,
  });
}

function assertWorkAccounting(value: unknown): SimilarityWorkAccountingV1 {
  const record = readClosedRecord(value, WORK_FIELDS, "WORK_ACCOUNTING");
  const integer = (field: (typeof WORK_FIELDS)[number], maximum: number) =>
    readSafeInteger(record[field], 0, maximum, `WORK_${field}`);
  const result: SimilarityWorkAccountingV1 = Object.freeze({
    fixedReferenceOverheadUnits: integer(
      "fixedReferenceOverheadUnits",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    originalCharacters: integer(
      "originalCharacters",
      qfs1aContracts.QFS1A_LIMITS.maxAggregateInspectedCharacters,
    ),
    normalizedCharacters: integer(
      "normalizedCharacters",
      qfs1aContracts.QFS1A_LIMITS.maxAggregateNormalizedCharacters,
    ),
    observedTokens: integer(
      "observedTokens",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    retainedTokens: integer(
      "retainedTokens",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    mandatoryTotalWorkUnits: integer(
      "mandatoryTotalWorkUnits",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    remainingOptionalWorkUnitsAtStart: integer(
      "remainingOptionalWorkUnitsAtStart",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    generatedWindows: integer(
      "generatedWindows",
      QFS1_LIMITS.maxTotalGeneratedWindows,
    ),
    comparisonWorkUnits: integer(
      "comparisonWorkUnits",
      QFS1_LIMITS.maxTotalComparisonWorkUnits,
    ),
    optionalWorkUnitsConsumed: integer(
      "optionalWorkUnitsConsumed",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    totalWorkUnits: integer(
      "totalWorkUnits",
      qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits,
    ),
    budgetExhausted:
      typeof record.budgetExhausted === "boolean"
        ? record.budgetExhausted
        : fail("WORK_BUDGET_EXHAUSTED_INVALID"),
    completeCorpusInspection:
      typeof record.completeCorpusInspection === "boolean"
        ? record.completeCorpusInspection
        : fail("WORK_COMPLETE_INVALID"),
    preparedBodyCount: integer(
      "preparedBodyCount",
      qfs1aContracts.QFS1A_LIMITS.maxCandidateParts +
        qfs1aContracts.QFS1A_LIMITS.maxCorpusReferences *
          qfs1aContracts.QFS1A_LIMITS.maxPartsPerReference,
    ),
    referenceCount: integer(
      "referenceCount",
      qfs1aContracts.QFS1A_LIMITS.maxCorpusReferences,
    ),
    referencePartCount: integer(
      "referencePartCount",
      qfs1aContracts.QFS1A_LIMITS.maxCorpusReferences *
        qfs1aContracts.QFS1A_LIMITS.maxPartsPerReference,
    ),
  });
  if (
    result.optionalWorkUnitsConsumed !==
    result.generatedWindows + result.comparisonWorkUnits
  ) {
    fail("WORK_OPTIONAL_FORMULA_INVALID");
  }
  if (
    result.totalWorkUnits !==
    result.mandatoryTotalWorkUnits + result.optionalWorkUnitsConsumed
  ) {
    fail("WORK_TOTAL_FORMULA_INVALID");
  }
  if (
    result.remainingOptionalWorkUnitsAtStart !==
    qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits -
      result.mandatoryTotalWorkUnits ||
    result.optionalWorkUnitsConsumed > result.remainingOptionalWorkUnitsAtStart
  ) {
    fail("WORK_QFS1A_OPTIONAL_BOUNDARY_INVALID");
  }
  if (result.budgetExhausted && result.completeCorpusInspection) {
    fail("WORK_COMPLETENESS_INVALID");
  }
  return result;
}

export function createSimilarityFirewallReviewV1(
  value: SimilarityCorpusPreparationInputV1,
): SimilarityFirewallReviewV1 {
  assertDependenciesV1();
  const trace = ["PREPARATION_BEGIN"];
  const prepared = qfs1aCore.prepareSimilarityCorpusV1(value);
  trace.push("PREPARATION_COMPLETE");
  return buildReview(prepared, trace);
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
      qfs1aContracts.QFS1A_LIMITS.maxCorpusReferences,
      "REVIEW_MATCHES",
    ).map(assertMatch),
  );
  const referenceDigests = new Set<string>();
  for (const match of matches) {
    if (referenceDigests.has(match.referenceDigest)) fail("MATCH_REFERENCE_DUPLICATE");
    referenceDigests.add(match.referenceDigest);
  }
  if (!sameCanonical(matches, orderByUtf8(matches, canonicalMatchSortKey))) {
    fail("MATCH_ORDER_INVALID");
  }
  const corpusCounts = assertCorpusCounts(record.corpusCounts);
  if (matches.length > corpusCounts.referenceCount) fail("MATCH_COUNT_INVALID");
  const workAccounting = assertWorkAccounting(record.workAccounting);
  if (
    workAccounting.fixedReferenceOverheadUnits !==
      corpusCounts.referenceCount *
        qfs1aContracts.QFS1A_LIMITS.fixedReferenceOverheadWorkUnits ||
    workAccounting.preparedBodyCount !== corpusCounts.preparedBodyCount ||
    workAccounting.referenceCount !== corpusCounts.referenceCount ||
    workAccounting.referencePartCount !== corpusCounts.referencePartCount
  ) {
    fail("WORK_CORPUS_COUNT_CROSS_BINDING_INVALID");
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
    candidateId: readString(
      record.candidateId,
      CANDIDATE_ID_PATTERN,
      "REVIEW_CANDIDATE_ID",
    ),
    candidateDigest: readDigest(record.candidateDigest, "REVIEW_CANDIDATE_DIGEST"),
    candidateBodyManifestDigest: readDigest(
      record.candidateBodyManifestDigest,
      "REVIEW_CANDIDATE_MANIFEST_DIGEST",
    ),
    preparationDigest: readDigest(
      record.preparationDigest,
      "REVIEW_PREPARATION_DIGEST",
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
  const expectedDigest = qf0a1.digestCanonicalJsonV1(
    canonicalReviewMaterial(material),
  );
  if (reviewDigest !== expectedDigest) fail("REVIEW_DIGEST_MISMATCH");
  if (QFS1_CONTRACT_VERSION !== QFS1_LIMITS.contractVersion) {
    fail("LIMIT_CONTRACT_VERSION_DRIFT");
  }
  return Object.freeze({ ...material, reviewDigest });
}
