import { createHash, verify as verifySignature } from "node:crypto";

import {
  ANSWER_SPECIFICATION_VERSION,
  QUESTION_BLUEPRINT_VERSION,
  QUESTION_FOUNDRY_HARD_DENIED_SOURCE_CLASSES,
  QUESTION_FOUNDRY_RIGHTS_PURPOSES,
  QUESTION_FOUNDRY_SHARED_ELIGIBLE_SOURCE_CLASSES,
  QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST,
  QUESTION_FOUNDRY_SUBJECTS,
  type AnswerSpecificationV1,
  type CalculationSpecificationV1,
  type CandidateBatchV1,
  type JudgeReviewV1,
  type MetaAuditBundleV1,
  type QuestionBlueprintV1,
  type QuestionCandidateV1,
  type QuestionFoundryModelIdentityV1,
  type QuestionFoundryRightsManifestV1,
  type QuestionFoundryRightsPurpose,
  type QuestionFoundrySourceClass,
  type QuestionFoundryValidationResult,
  type SimilarityFirewallReviewV1,
  type SimilarityReferenceV1,
  type SourceEligibilityDecisionV1,
  type SourceVersionBindingV1,
  type TrustedSourceRegistryExportBindingV1,
  type TrustedSourceRegistryV1,
} from "./contracts";

const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/u;
const BASE64_SIGNATURE = /^[A-Za-z0-9+/]+={0,2}$/u;
const CALCULATION_DECIMAL = /^-?(?:0|[1-9]\d*)(?:[.]\d*[1-9])?$/u;
const EXACT_DECIMAL = /^([+-]?)(\d+)(?:[.](\d*))?(?:[eE]([+-]?\d+))?$/u;
const CALCULATION_DECIMAL_MAX_LENGTH = 96;
const EXACT_DECIMAL_MAX_DIGITS = 64;
const EXACT_DECIMAL_MIN_EXPONENT = -324;
const EXACT_DECIMAL_MAX_EXPONENT = 308;
const CALCULATION_OPTION_BODY_MAX_LENGTH = 512;
export const QUESTION_FOUNDRY_CALCULATION_NUMERIC_TOKEN_SOURCE = String.raw`[-+]?(?:(?:(?:[1-9]\d{0,2}(?:,\d{3})+)|(?:0|[1-9]\d*))(?:[.]\d+)?|[.]\d+)(?:[eE][-+]?\d+)?`;
const CALCULATION_OPTION_PATTERN = new RegExp(
  `^(${QUESTION_FOUNDRY_CALCULATION_NUMERIC_TOKEN_SOURCE}) ([A-Za-z0-9][A-Za-z0-9._:/@-]{0,199})$`,
  "u",
);
const NEAR_COPY_TOKEN_PATTERN = new RegExp(
  `${QUESTION_FOUNDRY_CALCULATION_NUMERIC_TOKEN_SOURCE}|\\p{L}+`,
  "gu",
);
const NEAR_COPY_NUMBER_PATTERN = new RegExp(
  `^(?:${QUESTION_FOUNDRY_CALCULATION_NUMERIC_TOKEN_SOURCE})$`,
  "u",
);
export const QUESTION_FOUNDRY_SIMILARITY_THRESHOLD = 0.72;
export const QUESTION_FOUNDRY_NEAR_COPY_FAILURE_TRANSFORMATIONS = [
  "NUMBER_ONLY",
  "NAME_ONLY",
  "ORDER_ONLY",
  "WORD_ONLY",
] as const;
const RIGHTS_AUTHORITY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEASWYp/L1EfC+LW1GYDKudsTK5EvkYd3gYJmGWeRhf8EQ=
-----END PUBLIC KEY-----
`;
const ELIGIBLE_SOURCE_CLASSES = new Set<QuestionFoundrySourceClass>(
  QUESTION_FOUNDRY_SHARED_ELIGIBLE_SOURCE_CLASSES,
);
const HARD_DENIED_SOURCE_CLASSES = new Set<QuestionFoundrySourceClass>(
  QUESTION_FOUNDRY_HARD_DENIED_SOURCE_CLASSES,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationResult(errors: string[]): QuestionFoundryValidationResult {
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze([...new Set(errors)]) });
}

function closedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) errors.push(`${path}.${key}:UNKNOWN_FIELD`);
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      errors.push(`${path}.${key}:MISSING_FIELD`);
    }
  }
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID.test(value);
}

const MODEL_IDENTITY_KEYS = [
  "providerId",
  "modelFamilyId",
  "modelVersionId",
  "modelArtifactDigest",
] as const;

function validateModelIdentity(
  value: unknown,
  errors: string[],
  path: string,
): value is QuestionFoundryModelIdentityV1 {
  if (!isRecord(value)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return false;
  }
  closedKeys(value, MODEL_IDENTITY_KEYS, path, errors);
  for (const field of ["providerId", "modelFamilyId", "modelVersionId"] as const) {
    if (!isSafeId(value[field])) errors.push(`${path}.${field}:INVALID`);
  }
  if (typeof value.modelArtifactDigest !== "string" || !SHA256.test(value.modelArtifactDigest)) {
    errors.push(`${path}.modelArtifactDigest:INVALID`);
  }
  return (
    ["providerId", "modelFamilyId", "modelVersionId"].every((field) => isSafeId(value[field])) &&
    typeof value.modelArtifactDigest === "string" &&
    SHA256.test(value.modelArtifactDigest)
  );
}

function modelFamilyKey(value: QuestionFoundryModelIdentityV1): string {
  return value.modelFamilyId;
}

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export function canonicalDigest(value: unknown): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

function trustedSourceRegistryExportProjection(registry: TrustedSourceRegistryV1) {
  return {
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    asOf: registry.asOf,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    territory: registry.territory,
    rightsManifestsDigest: registry.rightsManifestsDigest,
    sourceVersionsDigest: registry.sourceVersionsDigest,
    eligibilityDecisionsDigest: registry.eligibilityDecisionsDigest,
  };
}

function hasValidRightsAuthoritySignature(binding: Record<string, unknown>) {
  const { detachedSignature, ...signedPayload } = binding;
  if (typeof detachedSignature !== "string" || !BASE64_SIGNATURE.test(detachedSignature)) {
    return false;
  }
  try {
    return verifySignature(
      null,
      Buffer.from(canonicalDigest(signedPayload), "utf8"),
      RIGHTS_AUTHORITY_PUBLIC_KEY,
      Buffer.from(detachedSignature, "base64"),
    );
  } catch {
    return false;
  }
}

export function validateTrustedSourceRegistryAuthority(
  registryValue: unknown,
  bindingValue: unknown,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (!isRecord(registryValue)) {
    return validationResult(["TRUSTED_SOURCE_REGISTRY_EXPORT_INVALID"]);
  }
  const registry = registryValue as unknown as TrustedSourceRegistryV1;
  if (
    registry.registryVersion !== "question_foundry.trusted_source_registry.v1" ||
    registry.source !== "LOCAL_RIGHTS_AUTHORITY_EXPORT" ||
    !isSafeId(registry.exportId) ||
    !isSafeId(registry.exportVersionId) ||
    !isIsoInstant(registry.asOf) ||
    !isIsoInstant(registry.verifiedAt) ||
    Date.parse(registry.verifiedAt) > Date.parse(registry.asOf) ||
    registry.remoteReadPerformed !== false ||
    registry.territory !== "KR" ||
    !Array.isArray(registry.rightsManifests) ||
    !Array.isArray(registry.sourceVersions) ||
    !Array.isArray(registry.eligibilityDecisions) ||
    registry.rightsManifestsDigest !== canonicalDigest(registry.rightsManifests) ||
    registry.sourceVersionsDigest !== canonicalDigest(registry.sourceVersions) ||
    registry.eligibilityDecisionsDigest !== canonicalDigest(registry.eligibilityDecisions) ||
    registry.exportContentDigest !== canonicalDigest(trustedSourceRegistryExportProjection(registry))
  ) {
    errors.push("TRUSTED_SOURCE_REGISTRY_EXPORT_INVALID");
  }
  if (!isRecord(bindingValue)) {
    errors.push("TRUSTED_SOURCE_REGISTRY_EXPORT_BINDING_REQUIRED");
    return validationResult(errors);
  }
  const binding = bindingValue as unknown as TrustedSourceRegistryExportBindingV1;
  const bindingKeys = [
    "bindingVersion",
    "exportId",
    "exportVersionId",
    "exportContentDigest",
    "registryDigest",
    "validatorId",
    "authorityKeyId",
    "signatureAlgorithm",
    "detachedSignature",
    "actualRightsAuthorityRead",
    "syntheticOrSimulated",
    "verified",
  ];
  if (
    Object.keys(bindingValue).length !== bindingKeys.length ||
    bindingKeys.some((key) => !Object.prototype.hasOwnProperty.call(bindingValue, key)) ||
    binding.bindingVersion !== "question_foundry.trusted_source_registry_export_binding.v1" ||
    binding.validatorId !== "trusted_source_registry_export_validator" ||
    binding.authorityKeyId !== "question-foundry-rights-authority-2026-08-27" ||
    binding.signatureAlgorithm !== "Ed25519" ||
    !hasValidRightsAuthoritySignature(bindingValue) ||
    binding.actualRightsAuthorityRead !== true ||
    binding.syntheticOrSimulated !== false ||
    binding.verified !== true ||
    binding.exportId !== registry.exportId ||
    binding.exportVersionId !== registry.exportVersionId ||
    binding.exportContentDigest !== registry.exportContentDigest ||
    binding.registryDigest !== canonicalDigest(registry)
  ) {
    errors.push("TRUSTED_SOURCE_REGISTRY_EXPORT_BINDING_REQUIRED");
  }
  return validationResult(errors);
}

export function normalizeQuestionText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.+-]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function uniqueStrings(value: unknown, path: string, errors: string[], minimum = 0): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${path}:MUST_BE_ARRAY`);
    return [];
  }
  if (value.length < minimum) errors.push(`${path}:MINIMUM_${minimum}`);
  const strings = value.filter((entry): entry is string => typeof entry === "string");
  if (strings.length !== value.length || strings.some((entry) => !isSafeId(entry))) {
    errors.push(`${path}:INVALID_ID`);
  }
  if (new Set(strings).size !== strings.length) errors.push(`${path}:DUPLICATE`);
  return strings;
}

function validateRightsBoundary(value: unknown, errors: string[], path: string) {
  if (!isRecord(value)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return;
  }
  closedKeys(
    value,
    [
      "protectedExpressionIncluded",
      "privateUploadUsed",
      "academyOrTextbookUsed",
      "rawSourceBodyStored",
      "sharedBlueprintAllowed",
      "modelTrainingAllowed",
    ],
    path,
    errors,
  );
  for (const falseField of [
    "protectedExpressionIncluded",
    "privateUploadUsed",
    "academyOrTextbookUsed",
    "rawSourceBodyStored",
    "modelTrainingAllowed",
  ]) {
    if (value[falseField] !== false) errors.push(`${path}.${falseField}:MUST_BE_FALSE`);
  }
  if (value.sharedBlueprintAllowed !== true) {
    errors.push(`${path}.sharedBlueprintAllowed:MUST_BE_TRUE`);
  }
}

function validateCalculationShape(
  value: unknown,
  errors: string[],
  path: string,
): value is CalculationSpecificationV1 {
  if (!isRecord(value)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return false;
  }
  closedKeys(value, ["operation", "operands", "result", "unit", "rounding", "tolerance"], path, errors);
  if (!["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"].includes(String(value.operation))) {
    errors.push(`${path}.operation:INVALID`);
  }
  if (
    !Array.isArray(value.operands) ||
    value.operands.length !== 2 ||
    value.operands.some((entry) => !isCanonicalCalculationDecimal(entry))
  ) {
    errors.push(`${path}.operands:INVALID`);
  }
  if (!isCanonicalCalculationDecimal(value.result)) {
    errors.push(`${path}.result:INVALID`);
  }
  if (!isSafeId(value.unit)) errors.push(`${path}.unit:INVALID`);
  if (typeof value.tolerance !== "number" || !Number.isFinite(value.tolerance)) {
    errors.push(`${path}.tolerance:INVALID`);
  } else if (!Object.is(value.tolerance, 0)) {
    errors.push(`${path}.tolerance:MUST_BE_ZERO`);
  }
  if (!isRecord(value.rounding)) {
    errors.push(`${path}.rounding:INVALID`);
  } else {
    closedKeys(value.rounding, ["mode", "scale"], `${path}.rounding`, errors);
    if (!["NONE", "HALF_UP"].includes(String(value.rounding.mode))) {
      errors.push(`${path}.rounding.mode:INVALID`);
    }
    if (
      typeof value.rounding.scale !== "number" ||
      !Number.isInteger(value.rounding.scale) ||
      value.rounding.scale < 0 ||
      value.rounding.scale > 8
    ) {
      errors.push(`${path}.rounding.scale:INVALID`);
    }
  }
  return true;
}

function isCanonicalCalculationDecimal(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > CALCULATION_DECIMAL_MAX_LENGTH ||
    !CALCULATION_DECIMAL.test(value) ||
    value === "-0"
  ) {
    return false;
  }
  const digits = value.replaceAll("-", "").replaceAll(".", "");
  return digits.length <= EXACT_DECIMAL_MAX_DIGITS;
}

type ExactRational = Readonly<{
  numerator: bigint;
  denominator: bigint;
}>;

type ExactCalculationOutcome =
  | Readonly<{ kind: "OK"; rational: ExactRational }>
  | Readonly<{
      kind:
        | "DIVISION_BY_ZERO_OR_NONFINITE"
        | "NON_TERMINATING_RESULT_REQUIRES_ROUNDING"
        | "EXACT_DECIMAL_CONVERSION_FAILED";
    }>;

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);
const BIGINT_FIVE = BigInt(5);
const BIGINT_TEN = BigInt(10);

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left < BIGINT_ZERO ? -left : left;
  let b = right < BIGINT_ZERO ? -right : right;
  while (b !== BIGINT_ZERO) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a === BIGINT_ZERO ? BIGINT_ONE : a;
}

function normalizeRational(numerator: bigint, denominator: bigint): ExactRational {
  if (denominator === BIGINT_ZERO) throw new Error("exact-rational-zero-denominator");
  const normalizedNumerator = denominator < BIGINT_ZERO ? -numerator : numerator;
  const normalizedDenominator = denominator < BIGINT_ZERO ? -denominator : denominator;
  const divisor = greatestCommonDivisor(normalizedNumerator, normalizedDenominator);
  return {
    numerator: normalizedNumerator / divisor,
    denominator: normalizedDenominator / divisor,
  };
}

function parseExactDecimal(text: string): ExactRational | null {
  if (text.length === 0 || text.length > CALCULATION_DECIMAL_MAX_LENGTH) return null;
  const match = text.match(EXACT_DECIMAL);
  if (!match) return null;
  const fraction = match[3] ?? "";
  if (match[2].length + fraction.length > EXACT_DECIMAL_MAX_DIGITS) return null;
  const exponent = Number(match[4] ?? "0");
  if (
    !Number.isSafeInteger(exponent) ||
    exponent < EXACT_DECIMAL_MIN_EXPONENT ||
    exponent > EXACT_DECIMAL_MAX_EXPONENT
  ) {
    return null;
  }
  const coefficient = BigInt(`${match[1]}${match[2]}${fraction}`);
  const decimalPlaces = fraction.length - exponent;
  return decimalPlaces >= 0
    ? normalizeRational(coefficient, BIGINT_TEN ** BigInt(decimalPlaces))
    : normalizeRational(
        coefficient * BIGINT_TEN ** BigInt(-decimalPlaces),
        BIGINT_ONE,
      );
}

function combineExactRationals(
  operation: CalculationSpecificationV1["operation"],
  left: ExactRational,
  right: ExactRational,
): ExactRational | null {
  if (operation === "ADD") {
    return normalizeRational(
      left.numerator * right.denominator + right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  }
  if (operation === "SUBTRACT") {
    return normalizeRational(
      left.numerator * right.denominator - right.numerator * left.denominator,
      left.denominator * right.denominator,
    );
  }
  if (operation === "MULTIPLY") {
    return normalizeRational(
      left.numerator * right.numerator,
      left.denominator * right.denominator,
    );
  }
  if (right.numerator === BIGINT_ZERO) return null;
  return normalizeRational(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function roundHalfUp(value: ExactRational, scale: number): ExactRational {
  const factor = BIGINT_TEN ** BigInt(scale);
  const scaledNumerator = value.numerator * factor;
  const magnitude = scaledNumerator < BIGINT_ZERO ? -scaledNumerator : scaledNumerator;
  const quotient = magnitude / value.denominator;
  const remainder = magnitude % value.denominator;
  const roundedMagnitude =
    quotient +
    (remainder * BIGINT_TWO >= value.denominator ? BIGINT_ONE : BIGINT_ZERO);
  return normalizeRational(
    scaledNumerator < BIGINT_ZERO ? -roundedMagnitude : roundedMagnitude,
    factor,
  );
}

function terminatingDecimalScale(value: ExactRational): number | null {
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % BIGINT_TWO === BIGINT_ZERO) {
    denominator /= BIGINT_TWO;
    twos += 1;
  }
  while (denominator % BIGINT_FIVE === BIGINT_ZERO) {
    denominator /= BIGINT_FIVE;
    fives += 1;
  }
  return denominator === BIGINT_ONE ? Math.max(twos, fives) : null;
}

function exactRationalToNumber(value: ExactRational): number | null {
  const scale = terminatingDecimalScale(value);
  if (scale === null) return null;
  let denominator = value.denominator;
  let twos = 0;
  let fives = 0;
  while (denominator % BIGINT_TWO === BIGINT_ZERO) {
    denominator /= BIGINT_TWO;
    twos += 1;
  }
  while (denominator % BIGINT_FIVE === BIGINT_ZERO) {
    denominator /= BIGINT_FIVE;
    fives += 1;
  }
  const scaledNumerator =
    value.numerator *
    BIGINT_TWO ** BigInt(scale - twos) *
    BIGINT_FIVE ** BigInt(scale - fives);
  const negative = scaledNumerator < BIGINT_ZERO;
  const digits = (negative ? -scaledNumerator : scaledNumerator).toString();
  const unsigned =
    scale === 0
      ? digits
      : digits.length <= scale
        ? `0.${"0".repeat(scale - digits.length)}${digits}`
        : `${digits.slice(0, digits.length - scale)}.${digits.slice(digits.length - scale)}`;
  const numeric = Number(`${negative ? "-" : ""}${unsigned}`);
  if (!Number.isFinite(numeric)) return null;
  const roundTrip = parseExactDecimal(numeric.toString());
  return roundTrip !== null && exactRationalsEqual(roundTrip, value) ? numeric : null;
}

function exactRationalsEqual(left: ExactRational, right: ExactRational): boolean {
  return left.numerator === right.numerator && left.denominator === right.denominator;
}

function calculateExactly(calculation: CalculationSpecificationV1): ExactCalculationOutcome {
  const left = parseExactDecimal(calculation.operands[0]);
  const right = parseExactDecimal(calculation.operands[1]);
  if (left === null || right === null) return { kind: "EXACT_DECIMAL_CONVERSION_FAILED" };
  const combined = combineExactRationals(calculation.operation, left, right);
  if (combined === null) return { kind: "DIVISION_BY_ZERO_OR_NONFINITE" };
  if (
    calculation.rounding.mode === "NONE" &&
    terminatingDecimalScale(combined) === null
  ) {
    return { kind: "NON_TERMINATING_RESULT_REQUIRES_ROUNDING" };
  }
  const rational =
    calculation.rounding.mode === "HALF_UP"
      ? roundHalfUp(combined, calculation.rounding.scale)
      : combined;
  return { kind: "OK", rational };
}

export function calculateDeterministically(
  calculation: CalculationSpecificationV1,
): number | null {
  const errors: string[] = [];
  if (!validateCalculationShape(calculation, errors, "calculation") || errors.length > 0) {
    return null;
  }
  const outcome = calculateExactly(calculation);
  return outcome.kind === "OK" ? exactRationalToNumber(outcome.rational) : null;
}

export function validateCalculationSpecification(
  value: unknown,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (!validateCalculationShape(value, errors, "calculation")) return validationResult(errors);
  if (errors.length > 0) return validationResult(errors);
  const calculation = value as CalculationSpecificationV1;
  const outcome = calculateExactly(calculation);
  if (outcome.kind !== "OK") {
    errors.push(`calculation:${outcome.kind}`);
  } else {
    const declaredResult = parseExactDecimal(calculation.result);
    if (declaredResult === null) errors.push("calculation:EXACT_DECIMAL_CONVERSION_FAILED");
    else if (!exactRationalsEqual(outcome.rational, declaredResult)) {
      errors.push("calculation:RESULT_MISMATCH");
    }
  }
  return validationResult(errors);
}

function validateSourceBindingShape(value: unknown, errors: string[], path: string) {
  if (!isRecord(value)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return;
  }
  closedKeys(
    value,
    [
      "sourceId",
      "sourceVersionId",
      "sourceClass",
      "effectiveFrom",
      "effectiveUntil",
      "status",
      "rightsManifestId",
      "rightsManifestVersionId",
      "contentDigest",
      "sourceDecisionBindings",
    ],
    path,
    errors,
  );
  for (const field of ["sourceId", "sourceVersionId", "rightsManifestId", "rightsManifestVersionId"]) {
    if (!isSafeId(value[field])) errors.push(`${path}.${field}:INVALID`);
  }
  if (!ELIGIBLE_SOURCE_CLASSES.has(value.sourceClass as QuestionFoundrySourceClass)) {
    errors.push(`${path}.sourceClass:SHARED_USE_DENIED`);
  }
  if (!isIsoInstant(value.effectiveFrom) || !isIsoInstant(value.effectiveUntil)) {
    errors.push(`${path}:INVALID_EFFECTIVE_WINDOW`);
  }
  if (value.status !== "CURRENT") errors.push(`${path}.status:NOT_CURRENT`);
  if (typeof value.contentDigest !== "string" || !SHA256.test(value.contentDigest)) {
    errors.push(`${path}.contentDigest:INVALID`);
  }
  if (!Array.isArray(value.sourceDecisionBindings)) {
    errors.push(`${path}.sourceDecisionBindings:MUST_BE_ARRAY`);
  } else {
    const purposes: string[] = [];
    value.sourceDecisionBindings.forEach((entry, index) => {
      const entryPath = `${path}.sourceDecisionBindings[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${entryPath}:MUST_BE_OBJECT`);
        return;
      }
      closedKeys(entry, ["purpose", "decisionId", "decisionBasisChecksum"], entryPath, errors);
      if (!QUESTION_FOUNDRY_RIGHTS_PURPOSES.includes(entry.purpose as never)) {
        errors.push(`${entryPath}.purpose:INVALID`);
      }
      if (!isSafeId(entry.decisionId)) errors.push(`${entryPath}.decisionId:INVALID`);
      if (typeof entry.decisionBasisChecksum !== "string" || !SHA256.test(entry.decisionBasisChecksum)) {
        errors.push(`${entryPath}.decisionBasisChecksum:INVALID`);
      }
      purposes.push(String(entry.purpose));
    });
    if (new Set(purposes).size !== purposes.length) {
      errors.push(`${path}.sourceDecisionBindings:DUPLICATE_PURPOSE`);
    }
  }
}

function validateQuestionBlueprintShape(
  value: unknown,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["blueprint:MUST_BE_OBJECT"]);
  closedKeys(
    value,
    [
      "schemaVersion",
      "blueprintId",
      "blueprintVersionId",
      "subject",
      "subjectAdapterInterfaceDigest",
      "skillId",
      "difficultyBand",
      "itemFamily",
      "learningObjective",
      "requiredConceptIds",
      "prohibitedCluePatterns",
      "sourceBindings",
      "calculation",
      "rightsBoundary",
      "createdAt",
    ],
    "blueprint",
    errors,
  );
  if (value.schemaVersion !== QUESTION_BLUEPRINT_VERSION) errors.push("blueprint.schemaVersion:INVALID");
  for (const field of ["blueprintId", "blueprintVersionId", "skillId", "itemFamily"]) {
    if (!isSafeId(value[field])) errors.push(`blueprint.${field}:INVALID`);
  }
  if (!QUESTION_FOUNDRY_SUBJECTS.includes(value.subject as never)) errors.push("blueprint.subject:INVALID");
  if (value.subjectAdapterInterfaceDigest !== QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST) {
    errors.push("blueprint.subjectAdapterInterfaceDigest:INVALID");
  }
  if (!["FOUNDATION", "STANDARD", "ADVANCED"].includes(String(value.difficultyBand))) {
    errors.push("blueprint.difficultyBand:INVALID");
  }
  if (typeof value.learningObjective !== "string" || value.learningObjective.trim().length < 8) {
    errors.push("blueprint.learningObjective:INVALID");
  }
  uniqueStrings(value.requiredConceptIds, "blueprint.requiredConceptIds", errors, 1);
  uniqueStrings(value.prohibitedCluePatterns, "blueprint.prohibitedCluePatterns", errors);
  if (!Array.isArray(value.sourceBindings) || value.sourceBindings.length === 0) {
    errors.push("blueprint.sourceBindings:MINIMUM_1");
  } else {
    value.sourceBindings.forEach((entry, index) =>
      validateSourceBindingShape(entry, errors, `blueprint.sourceBindings[${index}]`),
    );
    const ids = value.sourceBindings
      .filter(isRecord)
      .map((entry) => `${String(entry.sourceId)}@${String(entry.sourceVersionId)}`);
    if (new Set(ids).size !== ids.length) errors.push("blueprint.sourceBindings:DUPLICATE");
  }
  if (value.calculation !== null) validateCalculationShape(value.calculation, errors, "blueprint.calculation");
  validateRightsBoundary(value.rightsBoundary, errors, "blueprint.rightsBoundary");
  if (!isIsoInstant(value.createdAt)) errors.push("blueprint.createdAt:INVALID");
  return validationResult(errors);
}

export function validateAnswerSpecification(
  value: unknown,
  blueprintValue: unknown,
  trustedSources: unknown,
  sourceRegistryExportBinding: unknown = null,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  const blueprintResult = validateQuestionBlueprint(
    blueprintValue,
    trustedSources,
    sourceRegistryExportBinding,
  );
  errors.push(...blueprintResult.errors);
  if (!isRecord(value)) return validationResult([...errors, "answerSpecification:MUST_BE_OBJECT"]);
  closedKeys(
    value,
    [
      "schemaVersion",
      "answerSpecificationId",
      "blueprintId",
      "blueprintVersionId",
      "solutionFirst",
      "expectedAnswer",
      "requiredReasonCodes",
      "forbiddenAnswerPatterns",
      "calculation",
      "sourceBindings",
      "createdAt",
    ],
    "answerSpecification",
    errors,
  );
  if (value.schemaVersion !== ANSWER_SPECIFICATION_VERSION) errors.push("answerSpecification.schemaVersion:INVALID");
  if (!isSafeId(value.answerSpecificationId)) errors.push("answerSpecification.answerSpecificationId:INVALID");
  const blueprint = isRecord(blueprintValue) ? blueprintValue : {};
  if (value.blueprintId !== blueprint.blueprintId || value.blueprintVersionId !== blueprint.blueprintVersionId) {
    errors.push("answerSpecification:BLUEPRINT_BINDING_MISMATCH");
  }
  if (value.solutionFirst !== true) errors.push("answerSpecification.solutionFirst:MUST_BE_TRUE");
  if (typeof value.expectedAnswer !== "string" || !normalizeQuestionText(value.expectedAnswer)) {
    errors.push("answerSpecification.expectedAnswer:INVALID");
  }
  uniqueStrings(value.requiredReasonCodes, "answerSpecification.requiredReasonCodes", errors, 1);
  if (!Array.isArray(value.forbiddenAnswerPatterns) || value.forbiddenAnswerPatterns.some((entry) => typeof entry !== "string")) {
    errors.push("answerSpecification.forbiddenAnswerPatterns:INVALID");
  }
  if (value.calculation !== null) validateCalculationShape(value.calculation, errors, "answerSpecification.calculation");
  if (canonicalize(value.calculation) !== canonicalize(blueprint.calculation)) {
    errors.push("answerSpecification:CALCULATION_BINDING_MISMATCH");
  }
  if (canonicalize(value.sourceBindings) !== canonicalize(blueprint.sourceBindings)) {
    errors.push("answerSpecification:SOURCE_BINDING_MISMATCH");
  }
  if (!isIsoInstant(value.createdAt)) errors.push("answerSpecification.createdAt:INVALID");
  if (
    isIsoInstant(value.createdAt) &&
    isIsoInstant(blueprint.createdAt) &&
    Date.parse(value.createdAt) < Date.parse(blueprint.createdAt)
  ) {
    errors.push("answerSpecification:CREATED_BEFORE_BLUEPRINT");
  }
  return validationResult(errors);
}

function validateCandidate(
  candidateValue: unknown,
  blueprint: QuestionBlueprintV1,
  answerSpecification: AnswerSpecificationV1,
  errors: string[],
  path: string,
) {
  if (!isRecord(candidateValue)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return;
  }
  closedKeys(
    candidateValue,
    [
      "candidateId",
      "blueprintId",
      "blueprintVersionId",
      "answerSpecificationId",
      "generatorId",
      "generatorVersion",
      "generatorModelIdentity",
      "generatorExecutionId",
      "generationRunId",
      "generatedAt",
      "solutionCommittedAt",
      "stem",
      "options",
      "proposedCorrectOptionId",
      "explanation",
      "sourceBindingDigest",
      "rightsBoundary",
      "initialState",
    ],
    path,
    errors,
  );
  for (const field of ["candidateId", "generatorId", "generatorVersion", "generatorExecutionId", "generationRunId", "proposedCorrectOptionId"]) {
    if (!isSafeId(candidateValue[field])) errors.push(`${path}.${field}:INVALID`);
  }
  validateModelIdentity(candidateValue.generatorModelIdentity, errors, `${path}.generatorModelIdentity`);
  if (
    candidateValue.blueprintId !== blueprint.blueprintId ||
    candidateValue.blueprintVersionId !== blueprint.blueprintVersionId ||
    candidateValue.answerSpecificationId !== answerSpecification.answerSpecificationId
  ) {
    errors.push(`${path}:IDENTITY_BINDING_MISMATCH`);
  }
  if (!isIsoInstant(candidateValue.generatedAt) || !isIsoInstant(candidateValue.solutionCommittedAt)) {
    errors.push(`${path}:INVALID_TIMESTAMP`);
  } else if (Date.parse(candidateValue.solutionCommittedAt) > Date.parse(candidateValue.generatedAt)) {
    errors.push(`${path}:SOLUTION_NOT_FIRST`);
  }
  if (typeof candidateValue.stem !== "string" || candidateValue.stem.trim().length < 8) {
    errors.push(`${path}.stem:INVALID`);
  }
  if (typeof candidateValue.explanation !== "string" || candidateValue.explanation.trim().length < 8) {
    errors.push(`${path}.explanation:INVALID`);
  }
  if (!Array.isArray(candidateValue.options) || candidateValue.options.length !== 5) {
    errors.push(`${path}.options:EXACTLY_5_REQUIRED`);
  } else {
    const optionIds: string[] = [];
    const optionBodies: string[] = [];
    candidateValue.options.forEach((option, index) => {
      if (!isRecord(option)) {
        errors.push(`${path}.options[${index}]:INVALID`);
        return;
      }
      closedKeys(option, ["optionId", "body"], `${path}.options[${index}]`, errors);
      if (!isSafeId(option.optionId)) errors.push(`${path}.options[${index}].optionId:INVALID`);
      if (
        typeof option.body !== "string" ||
        !normalizeQuestionText(option.body) ||
        option.body.length > CALCULATION_OPTION_BODY_MAX_LENGTH
      ) {
        errors.push(`${path}.options[${index}].body:INVALID`);
      }
      optionIds.push(String(option.optionId));
      optionBodies.push(normalizeQuestionText(String(option.body)));
    });
    if (new Set(optionIds).size !== optionIds.length) errors.push(`${path}.options:DUPLICATE_ID`);
    if (new Set(optionBodies).size !== optionBodies.length) errors.push(`${path}.options:DUPLICATE_BODY`);
    const correct = candidateValue.options.find(
      (option) => isRecord(option) && option.optionId === candidateValue.proposedCorrectOptionId,
    );
    if (!isRecord(correct)) errors.push(`${path}:CORRECT_OPTION_NOT_FOUND`);
    else if (normalizeQuestionText(String(correct.body)) !== normalizeQuestionText(answerSpecification.expectedAnswer)) {
      errors.push(`${path}:ANSWER_SPECIFICATION_MISMATCH`);
    }
  }
  if (candidateValue.sourceBindingDigest !== canonicalDigest(blueprint.sourceBindings)) {
    errors.push(`${path}.sourceBindingDigest:MISMATCH`);
  }
  validateRightsBoundary(candidateValue.rightsBoundary, errors, `${path}.rightsBoundary`);
  if (canonicalize(candidateValue.rightsBoundary) !== canonicalize(blueprint.rightsBoundary)) {
    errors.push(`${path}.rightsBoundary:BLUEPRINT_MISMATCH`);
  }
  if (candidateValue.initialState !== "QUARANTINED") errors.push(`${path}.initialState:MUST_BE_QUARANTINED`);
}

function permutationIsExact(permutation: readonly string[], expected: readonly string[]) {
  return (
    permutation.length === expected.length &&
    new Set(permutation).size === permutation.length &&
    expected.every((entry) => permutation.includes(entry))
  );
}

export function validateCandidateBatch(
  value: unknown,
  trustedSources: unknown,
  sourceRegistryExportBinding: unknown = null,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["batch:MUST_BE_OBJECT"]);
  closedKeys(
    value,
    [
      "batchId",
      "blueprint",
      "answerSpecification",
      "candidates",
      "candidateOrderPermutations",
      "optionOrderPermutations",
      "offline",
      "providerCalls",
    ],
    "batch",
    errors,
  );
  if (!isSafeId(value.batchId)) errors.push("batch.batchId:INVALID");
  errors.push(
    ...validateQuestionBlueprint(
      value.blueprint,
      trustedSources,
      sourceRegistryExportBinding,
    ).errors,
  );
  errors.push(
    ...validateAnswerSpecification(
      value.answerSpecification,
      value.blueprint,
      trustedSources,
      sourceRegistryExportBinding,
    ).errors,
  );
  if (!isRecord(value.blueprint) || !isRecord(value.answerSpecification)) return validationResult(errors);
  const blueprint = value.blueprint as unknown as QuestionBlueprintV1;
  const answerSpecification = value.answerSpecification as unknown as AnswerSpecificationV1;
  if (!Array.isArray(value.candidates) || value.candidates.length < 2) {
    errors.push("batch.candidates:MINIMUM_2");
  } else {
    value.candidates.forEach((candidate, index) =>
      validateCandidate(candidate, blueprint, answerSpecification, errors, `batch.candidates[${index}]`),
    );
    const candidateIds = value.candidates.filter(isRecord).map((candidate) => String(candidate.candidateId));
    if (new Set(candidateIds).size !== candidateIds.length) errors.push("batch.candidates:DUPLICATE_ID");
    const candidatePermutations = Array.isArray(value.candidateOrderPermutations)
      ? value.candidateOrderPermutations
      : [];
    if (candidatePermutations.length < 2) errors.push("batch.candidateOrderPermutations:MINIMUM_2");
    const signatures = new Set<string>();
    const permutationIds = new Set<string>();
    for (const [index, entry] of candidatePermutations.entries()) {
      const path = `batch.candidateOrderPermutations[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${path}:INVALID`);
        continue;
      }
      closedKeys(entry, ["permutationId", "candidateIds"], path, errors);
      if (!isSafeId(entry.permutationId) || !Array.isArray(entry.candidateIds)) {
        errors.push(`batch.candidateOrderPermutations[${index}]:INVALID`);
        continue;
      }
      if (permutationIds.has(entry.permutationId)) {
        errors.push("batch.permutations:DUPLICATE_ID");
      }
      permutationIds.add(entry.permutationId);
      if (!permutationIsExact(entry.candidateIds as string[], candidateIds)) {
        errors.push(`batch.candidateOrderPermutations[${index}]:NOT_EXACT_PERMUTATION`);
      }
      signatures.add((entry.candidateIds as string[]).join("|"));
    }
    if (signatures.size < 2) errors.push("batch.candidateOrderPermutations:ORDER_NOT_VARIED");

    const optionPermutations = Array.isArray(value.optionOrderPermutations)
      ? value.optionOrderPermutations
      : [];
    const validOptionPermutations: Record<string, unknown>[] = [];
    for (const [index, entry] of optionPermutations.entries()) {
      const path = `batch.optionOrderPermutations[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${path}:INVALID`);
        continue;
      }
      closedKeys(entry, ["permutationId", "candidateId", "optionIds"], path, errors);
      if (
        !isSafeId(entry.permutationId) ||
        !isSafeId(entry.candidateId) ||
        !Array.isArray(entry.optionIds)
      ) {
        errors.push(`${path}:INVALID`);
        continue;
      }
      if (permutationIds.has(entry.permutationId)) {
        errors.push("batch.permutations:DUPLICATE_ID");
      }
      permutationIds.add(entry.permutationId);
      if (!candidateIds.includes(entry.candidateId)) {
        errors.push(`${path}:ORPHAN_CANDIDATE`);
        continue;
      }
      validOptionPermutations.push(entry);
    }
    for (const candidate of value.candidates.filter(isRecord)) {
      const options = Array.isArray(candidate.options)
        ? candidate.options.filter(isRecord).map((option) => String(option.optionId))
        : [];
      const forCandidate = validOptionPermutations.filter(
        (entry) => entry.candidateId === candidate.candidateId,
      );
      if (forCandidate.length < 2) {
        errors.push(`batch.optionOrderPermutations:${String(candidate.candidateId)}:MINIMUM_2`);
        continue;
      }
      const optionSignatures = new Set<string>();
      for (const entry of forCandidate) {
        if (!permutationIsExact(entry.optionIds as string[], options)) {
          errors.push(`batch.optionOrderPermutations:${String(candidate.candidateId)}:NOT_EXACT_PERMUTATION`);
        }
        optionSignatures.add((entry.optionIds as string[]).join("|"));
      }
      if (optionSignatures.size < 2) {
        errors.push(`batch.optionOrderPermutations:${String(candidate.candidateId)}:ORDER_NOT_VARIED`);
      }
    }
  }
  if (value.offline !== true || value.providerCalls !== 0) errors.push("batch:OFFLINE_ZERO_PROVIDER_REQUIRED");
  if (isRecord(trustedSources) && isIsoInstant(trustedSources.asOf) && Array.isArray(value.candidates)) {
    for (const candidate of value.candidates.filter(isRecord)) {
      if (
        !isIsoInstant(candidate.generatedAt) ||
        Date.parse(candidate.generatedAt) > Date.parse(trustedSources.asOf)
      ) {
        errors.push(`batch.candidates:${String(candidate.candidateId)}:GENERATED_AFTER_SOURCE_REGISTRY`);
        continue;
      }
      const generationSourceValidation = validateTrustedSourceBindings(
        blueprint.sourceBindings,
        trustedSources,
        ["QUESTION_BLUEPRINT_EXTRACTION", "QUESTION_GENERATION_CONTEXT"],
        sourceRegistryExportBinding,
        candidate.generatedAt,
      );
      if (!generationSourceValidation.valid) {
        errors.push(
          `batch.candidates:${String(candidate.candidateId)}:GENERATION_SOURCE_INVALID:${generationSourceValidation.errors.join("|")}`,
        );
      }
    }
  }
  return validationResult(errors);
}

function resolveUnique<T>(items: readonly T[], predicate: (item: T) => boolean): T | null {
  const matches = items.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

function validateRightsManifestShape(value: unknown, errors: string[], path: string) {
  if (!isRecord(value)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return;
  }
  closedKeys(
    value,
    [
      "manifestId",
      "manifestVersionId",
      "sourceClass",
      "rightsHolder",
      "permittedPurposes",
      "territory",
      "validFrom",
      "validUntil",
      "status",
      "provenance",
    ],
    path,
    errors,
  );
  if (!isSafeId(value.manifestId) || !isSafeId(value.manifestVersionId)) {
    errors.push(`${path}:IDENTITY_INVALID`);
  }
  if (!QUESTION_FOUNDRY_SHARED_ELIGIBLE_SOURCE_CLASSES.includes(value.sourceClass as never)) {
    errors.push(`${path}.sourceClass:SHARED_USE_DENIED`);
  }
  if (typeof value.rightsHolder !== "string" || value.rightsHolder.trim().length === 0) {
    errors.push(`${path}.rightsHolder:INVALID`);
  }
  const purposes = Array.isArray(value.permittedPurposes) ? value.permittedPurposes : [];
  if (
    !Array.isArray(value.permittedPurposes) ||
    purposes.length === 0 ||
    purposes.some((purpose) => !QUESTION_FOUNDRY_RIGHTS_PURPOSES.includes(purpose as never)) ||
    new Set(purposes).size !== purposes.length
  ) {
    errors.push(`${path}.permittedPurposes:INVALID`);
  }
  if (!Array.isArray(value.territory) || value.territory.length === 0 || value.territory.some((entry) => !isSafeId(entry))) {
    errors.push(`${path}.territory:INVALID`);
  }
  if (!isIsoInstant(value.validFrom) || !isIsoInstant(value.validUntil)) {
    errors.push(`${path}:VALIDITY_INVALID`);
  }
  if (!["ACTIVE", "REVOKED", "DISPUTED", "EXPIRED", "BLOCKED"].includes(String(value.status))) {
    errors.push(`${path}.status:INVALID`);
  }
  uniqueStrings(value.provenance, `${path}.provenance`, errors, 1);
}

function validateEligibilityDecisionShape(value: unknown, errors: string[], path: string) {
  if (!isRecord(value)) {
    errors.push(`${path}:MUST_BE_OBJECT`);
    return;
  }
  closedKeys(
    value,
    [
      "decisionId",
      "sourceId",
      "sourceVersionId",
      "sourceClass",
      "purpose",
      "decision",
      "denialCodes",
      "decidedAt",
      "policyVersion",
      "decisionBasisChecksum",
      "rightsManifestId",
      "rightsManifestVersionId",
      "rightsEvaluatedAt",
    ],
    path,
    errors,
  );
  for (const field of ["decisionId", "sourceId", "sourceVersionId", "policyVersion"]) {
    if (!isSafeId(value[field])) errors.push(`${path}.${field}:INVALID`);
  }
  if (!QUESTION_FOUNDRY_RIGHTS_PURPOSES.includes(value.purpose as never)) {
    errors.push(`${path}.purpose:INVALID`);
  }
  if (!QUESTION_FOUNDRY_SHARED_ELIGIBLE_SOURCE_CLASSES.includes(value.sourceClass as never)) {
    errors.push(`${path}.sourceClass:SHARED_USE_DENIED`);
  }
  if (!["CONDITIONALLY_ELIGIBLE", "DENY_ALL_SHARED_ROUTES"].includes(String(value.decision))) {
    errors.push(`${path}.decision:INVALID`);
  }
  uniqueStrings(value.denialCodes, `${path}.denialCodes`, errors);
  if (!isIsoInstant(value.decidedAt)) errors.push(`${path}.decidedAt:INVALID`);
  if (typeof value.decisionBasisChecksum !== "string" || !SHA256.test(value.decisionBasisChecksum)) {
    errors.push(`${path}.decisionBasisChecksum:INVALID`);
  }
  if (value.decision === "CONDITIONALLY_ELIGIBLE") {
    if (!isSafeId(value.rightsManifestId) || !isSafeId(value.rightsManifestVersionId)) {
      errors.push(`${path}:RIGHTS_BINDING_REQUIRED`);
    }
    if (!isIsoInstant(value.rightsEvaluatedAt)) errors.push(`${path}.rightsEvaluatedAt:INVALID`);
  }
}

function validateManifestAtUse(
  manifest: QuestionFoundryRightsManifestV1,
  binding: SourceVersionBindingV1,
  registry: TrustedSourceRegistryV1,
  useAt: string,
  purposes: readonly QuestionFoundryRightsPurpose[],
  errors: string[],
) {
  if (manifest.sourceClass !== binding.sourceClass) errors.push(`source:${binding.sourceId}:RIGHTS_CLASS_MISMATCH`);
  if (manifest.status !== "ACTIVE") errors.push(`source:${binding.sourceId}:RIGHTS_NOT_ACTIVE`);
  if (!Array.isArray(manifest.territory) || !manifest.territory.includes(registry.territory)) {
    errors.push(`source:${binding.sourceId}:TERRITORY_DENIED`);
  }
  if (
    !Array.isArray(manifest.permittedPurposes) ||
    purposes.some((purpose) => !manifest.permittedPurposes.includes(purpose))
  ) {
    errors.push(`source:${binding.sourceId}:PURPOSE_DENIED`);
  }
  if (
    !isIsoInstant(manifest.validFrom) ||
    !isIsoInstant(manifest.validUntil) ||
    Date.parse(manifest.validFrom) > Date.parse(useAt) ||
    Date.parse(useAt) > Date.parse(manifest.validUntil)
  ) {
    errors.push(`source:${binding.sourceId}:RIGHTS_OUTSIDE_VALIDITY`);
  }
}

export function validateTrustedSourceBindings(
  bindings: unknown,
  registry: unknown,
  purposes: readonly QuestionFoundryRightsPurpose[] = [
    "QUESTION_BLUEPRINT_EXTRACTION",
    "QUESTION_GENERATION_CONTEXT",
  ],
  sourceRegistryExportBinding: unknown = null,
  useAtOverride?: string,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  errors.push(
    ...validateTrustedSourceRegistryAuthority(
      registry,
      sourceRegistryExportBinding,
    ).errors,
  );
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return validationResult(["sourceBindings:MINIMUM_1"]);
  }
  bindings.forEach((binding, index) =>
    validateSourceBindingShape(binding, errors, `sourceBindings[${index}]`),
  );
  if (!isRecord(registry)) {
    return validationResult([...errors, "sourceRegistry:MUST_BE_OBJECT"]);
  }
  closedKeys(
    registry,
    [
      "registryVersion",
      "source",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "asOf",
      "verifiedAt",
      "remoteReadPerformed",
      "territory",
      "rightsManifestsDigest",
      "sourceVersionsDigest",
      "eligibilityDecisionsDigest",
      "rightsManifests",
      "sourceVersions",
      "eligibilityDecisions",
    ],
    "sourceRegistry",
    errors,
  );
  if (
    !Array.isArray(registry.rightsManifests) ||
    !Array.isArray(registry.sourceVersions) ||
    !Array.isArray(registry.eligibilityDecisions)
  ) {
    return validationResult([...errors, "sourceRegistry:REGISTRY_ARRAYS_REQUIRED"]);
  }
  if (
    purposes.length === 0 ||
    new Set(purposes).size !== purposes.length ||
    purposes.some((purpose) => !QUESTION_FOUNDRY_RIGHTS_PURPOSES.includes(purpose))
  ) {
    errors.push("sourceRegistry:REQUESTED_PURPOSES_INVALID");
  }
  registry.rightsManifests.forEach((entry, index) =>
    validateRightsManifestShape(entry, errors, `sourceRegistry.rightsManifests[${index}]`),
  );
  registry.sourceVersions.forEach((entry, index) =>
    validateSourceBindingShape(entry, errors, `sourceRegistry.sourceVersions[${index}]`),
  );
  registry.eligibilityDecisions.forEach((entry, index) =>
    validateEligibilityDecisionShape(entry, errors, `sourceRegistry.eligibilityDecisions[${index}]`),
  );
  const rightsManifests = registry.rightsManifests.filter(isRecord);
  const sourceVersions = registry.sourceVersions.filter(isRecord);
  const eligibilityDecisions = registry.eligibilityDecisions.filter(isRecord);
  const manifestIdentities = rightsManifests.map(
    (entry) => `${String(entry.manifestId)}@${String(entry.manifestVersionId)}`,
  );
  if (new Set(manifestIdentities).size !== manifestIdentities.length) {
    errors.push("sourceRegistry:RIGHTS_MANIFEST_IDENTITIES_DUPLICATE");
  }
  const sourceVersionIdentities = sourceVersions.map(
    (entry) => `${String(entry.sourceId)}@${String(entry.sourceVersionId)}`,
  );
  if (new Set(sourceVersionIdentities).size !== sourceVersionIdentities.length) {
    errors.push("sourceRegistry:SOURCE_VERSION_IDENTITIES_DUPLICATE");
  }
  const decisionIdentities = eligibilityDecisions.map((entry) => String(entry.decisionId));
  if (new Set(decisionIdentities).size !== decisionIdentities.length) {
    errors.push("sourceRegistry:ELIGIBILITY_DECISION_IDENTITIES_DUPLICATE");
  }
  const decisionScopes = eligibilityDecisions.map(
    (entry) => `${String(entry.sourceId)}@${String(entry.sourceVersionId)}:${String(entry.purpose)}`,
  );
  if (new Set(decisionScopes).size !== decisionScopes.length) {
    errors.push("sourceRegistry:ELIGIBILITY_DECISION_SCOPES_DUPLICATE");
  }
  if (rightsManifests.length !== registry.rightsManifests.length) {
    errors.push("sourceRegistry:RIGHTS_MANIFEST_INVALID");
  }
  if (sourceVersions.length !== registry.sourceVersions.length) {
    errors.push("sourceRegistry:SOURCE_VERSION_INVALID");
  }
  if (eligibilityDecisions.length !== registry.eligibilityDecisions.length) {
    errors.push("sourceRegistry:ELIGIBILITY_DECISION_INVALID");
  }
  const trustedRegistry = registry as unknown as TrustedSourceRegistryV1;
  const useAt = useAtOverride ?? trustedRegistry.asOf;
  if (trustedRegistry.registryVersion !== "question_foundry.trusted_source_registry.v1") {
    errors.push("sourceRegistry:VERSION_INVALID");
  }
  if (
    trustedRegistry.source !== "LOCAL_RIGHTS_AUTHORITY_EXPORT" ||
    !isSafeId(trustedRegistry.exportId) ||
    !isSafeId(trustedRegistry.exportVersionId) ||
    typeof trustedRegistry.exportContentDigest !== "string" ||
    !SHA256.test(trustedRegistry.exportContentDigest) ||
    !isIsoInstant(trustedRegistry.asOf) ||
    !isIsoInstant(trustedRegistry.verifiedAt) ||
    Date.parse(trustedRegistry.verifiedAt) > Date.parse(trustedRegistry.asOf) ||
    trustedRegistry.remoteReadPerformed !== false ||
    trustedRegistry.territory !== "KR"
  ) {
    errors.push("sourceRegistry:AS_OF_OR_TERRITORY_INVALID");
  }
  if (
    !isIsoInstant(useAt) ||
    !isIsoInstant(trustedRegistry.asOf) ||
    Date.parse(useAt) > Date.parse(trustedRegistry.asOf) ||
    !isIsoInstant(trustedRegistry.verifiedAt) ||
    Date.parse(trustedRegistry.verifiedAt) > Date.parse(useAt)
  ) {
    errors.push("sourceRegistry:USE_TIME_OUTSIDE_VERIFIED_EXPORT");
  }
  const sortedRightsManifests = [...rightsManifests].sort((left, right) =>
    `${String(left.manifestId)}@${String(left.manifestVersionId)}`.localeCompare(
      `${String(right.manifestId)}@${String(right.manifestVersionId)}`,
    ));
  const sortedSourceVersions = [...sourceVersions].sort((left, right) =>
    `${String(left.sourceId)}@${String(left.sourceVersionId)}`.localeCompare(
      `${String(right.sourceId)}@${String(right.sourceVersionId)}`,
    ));
  const sortedEligibilityDecisions = [...eligibilityDecisions].sort((left, right) =>
    String(left.decisionId).localeCompare(String(right.decisionId)));
  const sourceExportProjection = {
    registryVersion: trustedRegistry.registryVersion,
    source: trustedRegistry.source,
    exportId: trustedRegistry.exportId,
    exportVersionId: trustedRegistry.exportVersionId,
    asOf: trustedRegistry.asOf,
    verifiedAt: trustedRegistry.verifiedAt,
    remoteReadPerformed: trustedRegistry.remoteReadPerformed,
    territory: trustedRegistry.territory,
    rightsManifestsDigest: trustedRegistry.rightsManifestsDigest,
    sourceVersionsDigest: trustedRegistry.sourceVersionsDigest,
    eligibilityDecisionsDigest: trustedRegistry.eligibilityDecisionsDigest,
  };
  if (
    canonicalDigest(trustedRegistry.rightsManifests) !== canonicalDigest(sortedRightsManifests) ||
    canonicalDigest(trustedRegistry.sourceVersions) !== canonicalDigest(sortedSourceVersions) ||
    canonicalDigest(trustedRegistry.eligibilityDecisions) !== canonicalDigest(sortedEligibilityDecisions) ||
    trustedRegistry.rightsManifestsDigest !== canonicalDigest(sortedRightsManifests) ||
    trustedRegistry.sourceVersionsDigest !== canonicalDigest(sortedSourceVersions) ||
    trustedRegistry.eligibilityDecisionsDigest !== canonicalDigest(sortedEligibilityDecisions) ||
    trustedRegistry.exportContentDigest !== canonicalDigest(sourceExportProjection)
  ) {
    errors.push("sourceRegistry:EXPORT_CONTENT_INVALID");
  }
  for (const decision of eligibilityDecisions) {
    const sourceVersion = sourceVersions.find(
      (entry) =>
        entry.sourceId === decision.sourceId &&
        entry.sourceVersionId === decision.sourceVersionId,
    );
    if (!sourceVersion) {
      errors.push(`sourceRegistry:DECISION_SOURCE_VERSION_MISSING:${decision.decisionId}`);
      continue;
    }
    const expectedBasisChecksum = canonicalDigest({
      sourceId: sourceVersion.sourceId,
      sourceVersionId: sourceVersion.sourceVersionId,
      sourceClass: sourceVersion.sourceClass,
      contentDigest: sourceVersion.contentDigest,
      purpose: decision.purpose,
      rightsManifestId: decision.rightsManifestId,
      rightsManifestVersionId: decision.rightsManifestVersionId,
      policyVersion: decision.policyVersion,
    });
    if (decision.decisionBasisChecksum !== expectedBasisChecksum) {
      errors.push(`sourceRegistry:DECISION_BASIS_CHECKSUM_INVALID:${decision.decisionId}`);
    }
  }
  for (const bindingValue of bindings) {
    if (!isRecord(bindingValue)) continue;
    const binding = bindingValue as unknown as SourceVersionBindingV1;
    if (HARD_DENIED_SOURCE_CLASSES.has(binding.sourceClass)) {
      errors.push(`source:${binding.sourceId}:HARD_DENIED_CLASS`);
      continue;
    }
    const trusted = resolveUnique(
      sourceVersions,
      (entry) =>
        entry.sourceId === binding.sourceId &&
        entry.sourceVersionId === binding.sourceVersionId,
    ) as SourceVersionBindingV1 | null;
    if (!trusted) {
      errors.push(`source:${binding.sourceId}:MISSING_OR_AMBIGUOUS_VERSION`);
      continue;
    }
    if (HARD_DENIED_SOURCE_CLASSES.has(trusted.sourceClass)) {
      errors.push(`source:${binding.sourceId}:TRUSTED_CLASS_HARD_DENIED`);
    }
    if (canonicalize(trusted) !== canonicalize(binding)) {
      errors.push(`source:${binding.sourceId}:TRUSTED_BINDING_MISMATCH`);
    }
    if (
      trusted.status !== "CURRENT" ||
      !isIsoInstant(trusted.effectiveFrom) ||
      !isIsoInstant(trusted.effectiveUntil) ||
      Date.parse(trusted.effectiveFrom) > Date.parse(useAt) ||
      Date.parse(useAt) > Date.parse(trusted.effectiveUntil)
    ) {
      errors.push(`source:${binding.sourceId}:NOT_EFFECTIVE_CURRENT_VERSION`);
    }
    const manifest = resolveUnique(
      rightsManifests,
      (entry) =>
        entry.manifestId === binding.rightsManifestId &&
        entry.manifestVersionId === binding.rightsManifestVersionId,
    ) as QuestionFoundryRightsManifestV1 | null;
    if (!manifest) {
      errors.push(`source:${binding.sourceId}:MISSING_OR_AMBIGUOUS_RIGHTS`);
      continue;
    }
    validateManifestAtUse(manifest, binding, trustedRegistry, useAt, purposes, errors);
    for (const purpose of purposes) {
      const decisionBindings = Array.isArray(trusted.sourceDecisionBindings)
        ? trusted.sourceDecisionBindings
        : [];
      const decisionBinding = resolveUnique(
        decisionBindings,
        (entry) => entry.purpose === purpose,
      );
      if (!decisionBinding) {
        errors.push(`source:${binding.sourceId}:MISSING_OR_AMBIGUOUS_DECISION_BINDING:${purpose}`);
        continue;
      }
      const decision = resolveUnique(
        eligibilityDecisions,
        (entry) => entry.decisionId === decisionBinding.decisionId,
      ) as SourceEligibilityDecisionV1 | null;
      if (!decision) {
        errors.push(`source:${binding.sourceId}:MISSING_OR_AMBIGUOUS_ELIGIBILITY_DECISION:${purpose}`);
        continue;
      }
      if (
        decision.sourceId !== binding.sourceId ||
        decision.sourceVersionId !== binding.sourceVersionId ||
        decision.sourceClass !== binding.sourceClass ||
        decision.purpose !== purpose ||
        decision.decision !== "CONDITIONALLY_ELIGIBLE" ||
        !Array.isArray(decision.denialCodes) ||
        decision.denialCodes.length !== 0 ||
        decision.decisionBasisChecksum !== canonicalDigest({
          sourceId: trusted.sourceId,
          sourceVersionId: trusted.sourceVersionId,
          sourceClass: trusted.sourceClass,
          contentDigest: trusted.contentDigest,
          purpose,
          rightsManifestId: decision.rightsManifestId,
          rightsManifestVersionId: decision.rightsManifestVersionId,
          policyVersion: decision.policyVersion,
        }) ||
        decision.decisionBasisChecksum !== decisionBinding.decisionBasisChecksum ||
        decision.rightsManifestId !== binding.rightsManifestId ||
        decision.rightsManifestVersionId !== binding.rightsManifestVersionId
      ) {
        errors.push(`source:${binding.sourceId}:ELIGIBILITY_DECISION_BINDING_MISMATCH:${purpose}`);
      }
      if (
        !isIsoInstant(decision.decidedAt) ||
        !isIsoInstant(decision.rightsEvaluatedAt) ||
        Date.parse(decision.decidedAt) > Date.parse(decision.rightsEvaluatedAt) ||
        Date.parse(decision.rightsEvaluatedAt) > Date.parse(useAt) ||
        Date.parse(manifest.validFrom) > Date.parse(decision.decidedAt) ||
        Date.parse(decision.rightsEvaluatedAt) > Date.parse(manifest.validUntil)
      ) {
        errors.push(`source:${binding.sourceId}:ELIGIBILITY_DECISION_TIME_INVALID:${purpose}`);
      }
    }
  }
  return validationResult(errors);
}

export function validateQuestionBlueprint(
  value: unknown,
  trustedSources: unknown,
  sourceRegistryExportBinding: unknown = null,
): QuestionFoundryValidationResult {
  const shapeValidation = validateQuestionBlueprintShape(value);
  if (!shapeValidation.valid || !isRecord(value)) return shapeValidation;
  const rightsValidation = validateTrustedSourceBindings(
    value.sourceBindings,
    trustedSources,
    ["QUESTION_BLUEPRINT_EXTRACTION", "QUESTION_GENERATION_CONTEXT"],
    sourceRegistryExportBinding,
    typeof value.createdAt === "string" ? value.createdAt : undefined,
  );
  const errors = [...shapeValidation.errors, ...rightsValidation.errors];
  if (isRecord(trustedSources) && isIsoInstant(value.createdAt)) {
    if (!isIsoInstant(trustedSources.asOf) || Date.parse(trustedSources.asOf) < Date.parse(value.createdAt)) {
      errors.push("blueprint:SOURCE_REGISTRY_PREDATES_BLUEPRINT");
    }
    const manifests = Array.isArray(trustedSources.rightsManifests)
      ? trustedSources.rightsManifests.filter(isRecord)
      : [];
    const decisions = Array.isArray(trustedSources.eligibilityDecisions)
      ? trustedSources.eligibilityDecisions.filter(isRecord)
      : [];
    for (const binding of Array.isArray(value.sourceBindings) ? value.sourceBindings.filter(isRecord) : []) {
      const manifest = resolveUnique(
        manifests,
        (entry) =>
          entry.manifestId === binding.rightsManifestId &&
          entry.manifestVersionId === binding.rightsManifestVersionId,
      );
      if (
        !manifest ||
        !isIsoInstant(manifest.validFrom) ||
        !isIsoInstant(manifest.validUntil) ||
        Date.parse(manifest.validFrom) > Date.parse(value.createdAt) ||
        Date.parse(value.createdAt) > Date.parse(manifest.validUntil) ||
        !isIsoInstant(binding.effectiveFrom) ||
        !isIsoInstant(binding.effectiveUntil) ||
        Date.parse(binding.effectiveFrom) > Date.parse(value.createdAt) ||
        Date.parse(value.createdAt) > Date.parse(binding.effectiveUntil)
      ) {
        errors.push(`blueprint:SOURCE_NOT_VALID_AT_EXTRACTION:${String(binding.sourceId)}`);
      }
      const decisionBindings = Array.isArray(binding.sourceDecisionBindings)
        ? binding.sourceDecisionBindings.filter(isRecord)
        : [];
      for (const purpose of [
        "QUESTION_BLUEPRINT_EXTRACTION",
        "QUESTION_GENERATION_CONTEXT",
      ] as const) {
        const reference = resolveUnique(decisionBindings, (entry) => entry.purpose === purpose);
        const decision = reference
          ? resolveUnique(decisions, (entry) => entry.decisionId === reference.decisionId)
          : null;
        if (
          !decision ||
          !isIsoInstant(decision.decidedAt) ||
          !isIsoInstant(decision.rightsEvaluatedAt) ||
          Date.parse(decision.decidedAt) > Date.parse(value.createdAt) ||
          Date.parse(decision.rightsEvaluatedAt) > Date.parse(value.createdAt)
        ) {
          errors.push(`blueprint:ELIGIBILITY_NOT_ESTABLISHED_BEFORE_EXTRACTION:${String(binding.sourceId)}:${purpose}`);
        }
      }
    }
  }
  return validationResult(errors);
}

function extractNumericValue(body: string, expectedUnit: string): ExactRational | null {
  if (
    body.length === 0 ||
    body.length > CALCULATION_OPTION_BODY_MAX_LENGTH ||
    body !== body.trim()
  ) {
    return null;
  }
  const match = body.match(CALCULATION_OPTION_PATTERN);
  if (!match || match[2].toUpperCase() !== expectedUnit.toUpperCase()) return null;
  let numericToken = match[1].replaceAll(",", "");
  if (numericToken.startsWith("+.")) numericToken = `+0${numericToken.slice(1)}`;
  else if (numericToken.startsWith("-.")) numericToken = `-0${numericToken.slice(1)}`;
  else if (numericToken.startsWith(".")) numericToken = `0${numericToken}`;
  return parseExactDecimal(numericToken);
}

export function validateCandidateCalculation(
  candidate: QuestionCandidateV1,
  answerSpecification: AnswerSpecificationV1,
): QuestionFoundryValidationResult {
  const calculation = answerSpecification.calculation;
  if (calculation === null) return validationResult([]);
  const specificationValidation = validateCalculationSpecification(calculation);
  const errors = [...specificationValidation.errors];
  if (!specificationValidation.valid) return validationResult(errors);
  const outcome = calculateExactly(calculation);
  if (outcome.kind !== "OK") return validationResult(errors);
  const correct = candidate.options.find((option) => option.optionId === candidate.proposedCorrectOptionId);
  if (!correct) return validationResult([...errors, "candidateCalculation:CORRECT_OPTION_MISSING"]);
  const parsedOptions = candidate.options.map((option) => ({
    option,
    value: extractNumericValue(option.body, calculation.unit),
  }));
  if (parsedOptions.some((entry) => entry.value === null)) {
    errors.push("candidateCalculation:OPTION_NUMERIC_TOKEN_INVALID");
  }
  const correctValue = parsedOptions.find(
    (entry) => entry.option.optionId === candidate.proposedCorrectOptionId,
  )?.value;
  if (correctValue == null || !exactRationalsEqual(correctValue, outcome.rational)) {
    errors.push("candidateCalculation:CORRECT_VALUE_MISMATCH");
  }
  const matchingOptions = parsedOptions.filter(
    (entry) => entry.value !== null && exactRationalsEqual(entry.value, outcome.rational),
  );
  if (matchingOptions.length !== 1) errors.push("candidateCalculation:MULTIPLE_OR_ZERO_NUMERIC_ANSWERS");
  return validationResult(errors);
}

export function reviewDistractorsAndAnswerClues(
  candidate: QuestionCandidateV1,
  blueprint: QuestionBlueprintV1,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  const correct = candidate.options.find((option) => option.optionId === candidate.proposedCorrectOptionId);
  if (!correct) return validationResult(["clueReview:CORRECT_OPTION_MISSING"]);
  const distractors = candidate.options.filter((option) => option.optionId !== correct.optionId);
  const correctLength = normalizeQuestionText(correct.body).length;
  const sortedLengths = distractors.map((option) => normalizeQuestionText(option.body).length).sort((a, b) => a - b);
  const medianLength = (sortedLengths[1] + sortedLengths[2]) / 2;
  if (medianLength > 0 && (correctLength / medianLength > 2.5 || correctLength / medianLength < 0.4)) {
    errors.push("clueReview:ANSWER_LENGTH_OUTLIER");
  }
  const normalizedStem = normalizeQuestionText(candidate.stem);
  const normalizedCorrect = normalizeQuestionText(correct.body);
  if (normalizedCorrect.length >= 8 && normalizedStem.includes(normalizedCorrect)) {
    errors.push("clueReview:ANSWER_REPEATED_IN_STEM");
  }
  for (const pattern of blueprint.prohibitedCluePatterns) {
    if (normalizeQuestionText(`${candidate.stem} ${correct.body}`).includes(normalizeQuestionText(pattern))) {
      errors.push(`clueReview:PROHIBITED_PATTERN:${pattern}`);
    }
  }
  for (const option of candidate.options) {
    if (/all of the above|none of the above|모두 정답|정답 없음/iu.test(option.body)) {
      errors.push("clueReview:META_OPTION_PROHIBITED");
    }
  }
  if (new Set(distractors.map((option) => normalizeQuestionText(option.body))).size !== 4) {
    errors.push("clueReview:DISTRACTORS_NOT_DISTINCT");
  }
  return validationResult(errors);
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeQuestionText(value).split(" ").filter((token) => token.length > 1));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((entry) => right.has(entry)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

type NearCopyToken = Readonly<{
  kind: "NUMBER" | "WORD";
  value: string;
}>;

function nearCopyTokenLines(value: string): NearCopyToken[][] {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .split(/\r?\n/gu)
    .map((line) =>
      (line.match(NEAR_COPY_TOKEN_PATTERN) ?? []).map((token) => ({
        kind: NEAR_COPY_NUMBER_PATTERN.test(token)
          ? "NUMBER" as const
          : "WORD" as const,
        value: token,
      })),
    )
    .filter((line) => line.length > 0);
}

function nearCopyProjection(lines: NearCopyToken[][], replace: "NUMBER" | "WORD"): string {
  return JSON.stringify(
    lines.map((line) => {
      const projection: string[] = [];
      for (const token of line) {
        const value = token.kind === replace ? `<${replace}>` : token.value;
        if (value !== `<${replace}>` || projection.at(-1) !== value) projection.push(value);
      }
      return projection;
    }),
  );
}

function mandatoryNearCopyTransformationDetected(leftBody: string, rightBody: string): boolean {
  const left = nearCopyTokenLines(leftBody);
  const right = nearCopyTokenLines(rightBody);
  if (left.length === 0 || right.length === 0) return false;

  const leftValues = left.flat().map((token) => `${token.kind}:${token.value}`);
  const rightValues = right.flat().map((token) => `${token.kind}:${token.value}`);
  const changed = leftValues.join("\n") !== rightValues.join("\n");
  if (!changed) return false;

  const numberOnlyDetected = left.length === right.length &&
    nearCopyProjection(left, "NUMBER") === nearCopyProjection(right, "NUMBER");
  const wordOnlyDetected = left.length === right.length &&
    nearCopyProjection(left, "WORD") === nearCopyProjection(right, "WORD");
  const nameOnlyDetected = wordOnlyDetected;
  const orderOnlyDetected = leftValues.length === rightValues.length &&
    leftValues.toSorted().join("\n") === rightValues.toSorted().join("\n");

  return numberOnlyDetected || nameOnlyDetected || orderOnlyDetected || wordOnlyDetected;
}

export function buildSimilarityFirewallReview(
  candidate: QuestionCandidateV1,
  references: readonly SimilarityReferenceV1[],
  registry: TrustedSourceRegistryV1,
  sourceRegistryExportBinding: unknown = null,
  threshold = QUESTION_FOUNDRY_SIMILARITY_THRESHOLD,
): SimilarityFirewallReviewV1 {
  if (threshold !== QUESTION_FOUNDRY_SIMILARITY_THRESHOLD) {
    throw new Error("similarity-threshold-policy-mismatch");
  }
  const sourceAuthorityValidation = validateTrustedSourceRegistryAuthority(
    registry,
    sourceRegistryExportBinding,
  );
  if (!sourceAuthorityValidation.valid) {
    throw new Error(
      `invalid-source-registry-authority:${sourceAuthorityValidation.errors.join(",")}`,
    );
  }
  const candidateBody = `${candidate.stem}\n${candidate.options.map((option) => option.body).join("\n")}`;
  const candidateTokens = tokenSet(candidateBody);
  let maximum = 0;
  let mandatoryTransformationDetected = false;
  let reconstructionRiskDetected = false;
  let protectedExplanationSequenceDetected = false;
  for (const reference of references) {
    mandatoryTransformationDetected ||= mandatoryNearCopyTransformationDetected(
      candidateBody,
      reference.body,
    );
    if (!ELIGIBLE_SOURCE_CLASSES.has(reference.sourceClass)) {
      reconstructionRiskDetected = true;
      continue;
    }
    const sourceVersion = resolveUnique(
      registry.sourceVersions,
      (entry) =>
        entry.sourceId === reference.sourceId &&
        entry.sourceVersionId === reference.sourceVersionId,
    );
    const sourceVersionValid =
      sourceVersion !== null &&
      sourceVersion.sourceClass === reference.sourceClass &&
      sourceVersion.rightsManifestId === reference.rightsManifestId &&
      sourceVersion.rightsManifestVersionId === reference.rightsManifestVersionId &&
      sourceVersion.contentDigest === reference.contentDigest &&
      reference.contentDigest === canonicalDigest(reference.body) &&
      sourceVersion.status === "CURRENT" &&
      isIsoInstant(sourceVersion.effectiveFrom) &&
      isIsoInstant(sourceVersion.effectiveUntil) &&
      isIsoInstant(registry.asOf) &&
      Date.parse(sourceVersion.effectiveFrom) <= Date.parse(registry.asOf) &&
      Date.parse(registry.asOf) <= Date.parse(sourceVersion.effectiveUntil);
    const manifest = resolveUnique(
      registry.rightsManifests,
      (entry) =>
        entry.manifestId === reference.rightsManifestId &&
        entry.manifestVersionId === reference.rightsManifestVersionId,
    );
    if (
      !manifest ||
      !sourceVersionValid ||
      registry.registryVersion !== "question_foundry.trusted_source_registry.v1" ||
      registry.territory !== "KR" ||
      manifest.sourceClass !== reference.sourceClass ||
      manifest.status !== "ACTIVE" ||
      !manifest.territory.includes(registry.territory) ||
      !manifest.permittedPurposes.includes("QUESTION_GENERATION_CONTEXT") ||
      !isIsoInstant(registry.asOf) ||
      !isIsoInstant(manifest.validFrom) ||
      !isIsoInstant(manifest.validUntil) ||
      Date.parse(manifest.validFrom) > Date.parse(registry.asOf) ||
      Date.parse(registry.asOf) > Date.parse(manifest.validUntil)
    ) {
      reconstructionRiskDetected = true;
      continue;
    }
    const decisionValidation = validateTrustedSourceBindings(
      [sourceVersion],
      registry,
      ["QUESTION_GENERATION_CONTEXT"],
      sourceRegistryExportBinding,
    );
    if (!decisionValidation.valid) {
      reconstructionRiskDetected = true;
      continue;
    }
    const score = jaccard(candidateTokens, tokenSet(reference.body));
    maximum = Math.max(maximum, score);
    const compactCandidate = normalizeQuestionText(candidateBody).replaceAll(" ", "");
    const compactReference = normalizeQuestionText(reference.body).replaceAll(" ", "");
    if (
      Math.min(compactCandidate.length, compactReference.length) >= 80 &&
      (compactCandidate.includes(compactReference) || compactReference.includes(compactCandidate))
    ) {
      reconstructionRiskDetected = true;
    }
    if (jaccard(tokenSet(candidate.explanation), tokenSet(reference.body)) >= 0.6) {
      protectedExplanationSequenceDetected = true;
    }
  }
  return Object.freeze({
    candidateId: candidate.candidateId,
    corpusDigest: canonicalDigest(
      references.map(({
        referenceId,
        sourceId,
        sourceVersionId,
        sourceClass,
        rightsManifestId,
        rightsManifestVersionId,
        contentDigest,
        body,
      }) => ({
        referenceId,
        sourceId,
        sourceVersionId,
        sourceClass,
        rightsManifestId,
        rightsManifestVersionId,
        contentDigest,
        bodyDigest: canonicalDigest(body),
      })),
    ),
    referenceCount: references.length,
    maximumTokenJaccard: Number(maximum.toFixed(6)),
    threshold,
    nearCopyDetected:
      maximum >= QUESTION_FOUNDRY_SIMILARITY_THRESHOLD || mandatoryTransformationDetected,
    reconstructionRiskDetected,
    protectedExplanationSequenceDetected,
  });
}

export function validateGeneratorJudgeSolverSeparation(
  batch: CandidateBatchV1,
  solverReviews: readonly {
    solverId: string;
    solverVersion: string;
    solverModelIdentity: QuestionFoundryModelIdentityV1;
    candidateId: string;
    blind: boolean;
    candidateAnswerExposed: boolean;
    candidateExplanationExposed: boolean;
  }[],
  judgeReviews: readonly JudgeReviewV1[],
  selectedCandidateId: string,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  const selected = batch.candidates.find((candidate) => candidate.candidateId === selectedCandidateId);
  if (!selected) return validationResult(["separation:SELECTED_CANDIDATE_MISSING"]);
  const allGeneratorIds = new Set(batch.candidates.map((candidate) => candidate.generatorId));
  const allSolverIds = new Set(solverReviews.map((review) => review.solverId));
  const allJudgeIds = new Set(judgeReviews.map((review) => review.judgeId));
  const actorModels = new Map<string, string>();
  const modelActors = new Map<string, string>();
  const registerModel = (
    actorId: string,
    identity: unknown,
    path: string,
  ): string | null => {
    if (!validateModelIdentity(identity, errors, path)) return null;
    const digest = canonicalDigest(identity);
    const priorDigest = actorModels.get(actorId);
    if (priorDigest && priorDigest !== digest) {
      errors.push(`separation:ACTOR_MODEL_IDENTITY_DRIFT:${actorId}`);
    }
    actorModels.set(actorId, digest);
    const family = modelFamilyKey(identity);
    const independenceKeys = [
      `family:${family}`,
      `artifact:${identity.modelArtifactDigest}`,
      `provider-version:${identity.providerId}/${identity.modelVersionId}`,
    ];
    for (const key of independenceKeys) {
      const priorActor = modelActors.get(key);
      if (priorActor && priorActor !== actorId) {
        errors.push(`separation:CANONICAL_MODEL_ALIAS_REUSE:${key}`);
      }
      modelActors.set(key, actorId);
    }
    return family;
  };
  const generatorFamilies = new Set<string>();
  for (const [index, candidate] of batch.candidates.entries()) {
    const family = registerModel(
      candidate.generatorId,
      candidate.generatorModelIdentity,
      `separation.generators[${index}].modelIdentity`,
    );
    if (family) generatorFamilies.add(family);
  }
  const solverFamilies = new Set<string>();
  for (const [index, review] of solverReviews.entries()) {
    const family = registerModel(
      review.solverId,
      review.solverModelIdentity,
      `separation.solvers[${index}].modelIdentity`,
    );
    if (family) solverFamilies.add(family);
  }
  const judgeFamilies = new Set<string>();
  for (const [index, review] of judgeReviews.entries()) {
    const family = registerModel(
      review.judgeId,
      review.judgeModelIdentity,
      `separation.judges[${index}].modelIdentity`,
    );
    if (family) judgeFamilies.add(family);
  }
  for (const generatorId of allGeneratorIds) {
    if (allSolverIds.has(generatorId)) {
      errors.push(`separation:GENERATOR_SOLVER_IDENTITY_OVERLAP:${generatorId}`);
    }
    if (allJudgeIds.has(generatorId)) {
      errors.push(`separation:GENERATOR_JUDGE_IDENTITY_OVERLAP:${generatorId}`);
    }
  }
  for (const judgeId of allJudgeIds) {
    if (allSolverIds.has(judgeId)) {
      errors.push(`separation:JUDGE_SOLVER_IDENTITY_OVERLAP:${judgeId}`);
    }
  }
  for (const family of generatorFamilies) {
    if (solverFamilies.has(family)) errors.push(`separation:GENERATOR_SOLVER_MODEL_OVERLAP:${family}`);
    if (judgeFamilies.has(family)) errors.push(`separation:GENERATOR_JUDGE_MODEL_OVERLAP:${family}`);
  }
  for (const family of judgeFamilies) {
    if (solverFamilies.has(family)) errors.push(`separation:JUDGE_SOLVER_MODEL_OVERLAP:${family}`);
  }
  const solvers = solverReviews.filter((review) => review.candidateId === selectedCandidateId);
  if (solvers.length < 2 || new Set(solvers.map((review) => review.solverId)).size < 2) {
    errors.push("separation:TWO_INDEPENDENT_SOLVERS_REQUIRED");
  }
  const selectedSolverFamilies = new Set(
    solvers
      .map((review) =>
        isRecord(review.solverModelIdentity)
          ? String(review.solverModelIdentity.modelFamilyId)
          : "",
      )
      .filter(Boolean),
  );
  if (selectedSolverFamilies.size < 2) {
    errors.push("separation:TWO_INDEPENDENT_SOLVER_MODELS_REQUIRED");
  }
  for (const solver of solvers) {
    if (
      allGeneratorIds.has(solver.solverId) ||
      solver.blind !== true ||
      solver.candidateAnswerExposed !== false ||
      solver.candidateExplanationExposed !== false
    ) {
      errors.push(`separation:SOLVER_NOT_INDEPENDENT:${solver.solverId}`);
    }
  }
  const judges = judgeReviews.filter((review) => review.candidateId === selectedCandidateId);
  if (judges.length === 0) errors.push("separation:JUDGE_REQUIRED");
  for (const judge of judges) {
    if (allGeneratorIds.has(judge.judgeId)) {
      errors.push(`separation:GENERATOR_SELF_APPROVAL:${judge.judgeId}`);
    }
  }
  return validationResult(errors);
}

export function validateMetaAuditBundle(
  value: MetaAuditBundleV1,
  batch: CandidateBatchV1,
  selectedCandidateId: string,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["metaAudit:MUST_BE_OBJECT"]);
  closedKeys(
    value,
    ["selfPreference", "orderBias", "repeatedStability", "judgeDrift"],
    "metaAudit",
    errors,
  );
  const generatorIds = new Set(batch.candidates.map((candidate) => candidate.generatorId));
  const generatorFamilies = new Set(
    batch.candidates.map((candidate) => candidate.generatorModelIdentity.modelFamilyId),
  );
  const expectedCandidateIds = batch.candidates.map((candidate) => candidate.candidateId).sort();
  const selfPreference = value.selfPreference;
  if (isRecord(selfPreference)) {
    closedKeys(
      selfPreference,
      [
        "auditKind",
        "anonymized",
        "runs",
        "candidateIds",
        "evaluatorIds",
        "generatorEvaluatorOverlap",
        "selectedCandidateId",
        "pass",
      ],
      "metaAudit.selfPreference",
      errors,
    );
  }
  const anonymizedCandidateDigest = canonicalDigest(
    batch.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      blueprintId: candidate.blueprintId,
      blueprintVersionId: candidate.blueprintVersionId,
      answerSpecificationId: candidate.answerSpecificationId,
      generatedAt: candidate.generatedAt,
      solutionCommittedAt: candidate.solutionCommittedAt,
      stem: candidate.stem,
      options: candidate.options,
      proposedCorrectOptionId: candidate.proposedCorrectOptionId,
      explanation: candidate.explanation,
      sourceBindingDigest: candidate.sourceBindingDigest,
      rightsBoundary: candidate.rightsBoundary,
      initialState: candidate.initialState,
    })),
  );
  let selfRunsValid =
    isRecord(selfPreference) &&
    selfPreference.auditKind === "SELF_PREFERENCE" &&
    selfPreference.anonymized === true &&
    Array.isArray(selfPreference.runs) &&
    selfPreference.runs.length >= 1;
  const derivedSelfEvaluatorIds: string[] = [];
  if (isRecord(selfPreference) && Array.isArray(selfPreference.runs)) {
    const runIds = new Set<string>();
    for (const [index, run] of selfPreference.runs.entries()) {
      const path = `metaAudit.selfPreference.runs[${index}]`;
      if (!isRecord(run)) {
        errors.push(`${path}:MUST_BE_OBJECT`);
        selfRunsValid = false;
        continue;
      }
      closedKeys(
        run,
        [
          "runId",
          "evaluatorId",
          "evaluatorVersion",
          "evaluatorModelIdentity",
          "evaluatorExecutionId",
          "anonymizedCandidateDigest",
          "selectedCandidateId",
          "completedAt",
        ],
        path,
        errors,
      );
      const modelErrorsBefore = errors.length;
      const evaluatorModelIdentity = run.evaluatorModelIdentity;
      const modelValid = validateModelIdentity(evaluatorModelIdentity, errors, `${path}.evaluatorModelIdentity`);
      if (
        !isSafeId(run.runId) ||
        runIds.has(String(run.runId)) ||
        !isSafeId(run.evaluatorId) ||
        !isSafeId(run.evaluatorVersion) ||
        !isSafeId(run.evaluatorExecutionId) ||
        run.anonymizedCandidateDigest !== anonymizedCandidateDigest ||
        run.selectedCandidateId !== selectedCandidateId ||
        !isIsoInstant(run.completedAt) ||
        (modelValid && generatorFamilies.has(evaluatorModelIdentity.modelFamilyId)) ||
        errors.length !== modelErrorsBefore
      ) {
        selfRunsValid = false;
      }
      runIds.add(String(run.runId));
      if (isSafeId(run.evaluatorId) && !derivedSelfEvaluatorIds.includes(run.evaluatorId)) {
        derivedSelfEvaluatorIds.push(run.evaluatorId);
      }
    }
  }
  derivedSelfEvaluatorIds.sort();
  const derivedOverlap = derivedSelfEvaluatorIds.filter((id) => generatorIds.has(id)).sort();
  const derivedSelfPass = selfRunsValid && derivedOverlap.length === 0;
  if (
    !isRecord(selfPreference) ||
    selfPreference.selectedCandidateId !== selectedCandidateId ||
    !Array.isArray(selfPreference.candidateIds) ||
    canonicalize([...selfPreference.candidateIds].sort()) !== canonicalize(expectedCandidateIds) ||
    !Array.isArray(selfPreference.evaluatorIds) ||
    canonicalize([...selfPreference.evaluatorIds].sort()) !== canonicalize(derivedSelfEvaluatorIds) ||
    !Array.isArray(selfPreference.generatorEvaluatorOverlap) ||
    canonicalize([...selfPreference.generatorEvaluatorOverlap].sort()) !== canonicalize(derivedOverlap) ||
    selfPreference.pass !== derivedSelfPass ||
    !derivedSelfPass
  ) {
    errors.push("metaAudit:SELF_PREFERENCE_FAILED");
  }
  const orderBias = value.orderBias;
  if (isRecord(orderBias)) {
    closedKeys(
      orderBias,
      [
        "auditKind",
        "runs",
        "permutationIds",
        "selectedCandidateIds",
        "stableAcrossOrders",
        "pass",
      ],
      "metaAudit.orderBias",
      errors,
    );
  }
  const expectedPermutationIds = batch.candidateOrderPermutations
    .map((entry) => entry.permutationId)
    .sort();
  let orderRunsValid =
    isRecord(orderBias) &&
    orderBias.auditKind === "ORDER_BIAS" &&
    Array.isArray(orderBias.runs) &&
    orderBias.runs.length === batch.candidateOrderPermutations.length;
  const derivedPermutationIds: string[] = [];
  const derivedOrderSelectedIds: string[] = [];
  if (isRecord(orderBias) && Array.isArray(orderBias.runs)) {
    const runIds = new Set<string>();
    for (const [index, run] of orderBias.runs.entries()) {
      const path = `metaAudit.orderBias.runs[${index}]`;
      if (!isRecord(run)) {
        errors.push(`${path}:MUST_BE_OBJECT`);
        orderRunsValid = false;
        continue;
      }
      closedKeys(
        run,
        [
          "runId",
          "permutationId",
          "evaluatorId",
          "evaluatorVersion",
          "evaluatorModelIdentity",
          "evaluatorExecutionId",
          "orderedCandidateDigest",
          "selectedCandidateId",
          "completedAt",
        ],
        path,
        errors,
      );
      const permutation = batch.candidateOrderPermutations.find(
        (entry) => entry.permutationId === run.permutationId,
      );
      const evaluatorModelIdentity = run.evaluatorModelIdentity;
      const modelValid = validateModelIdentity(evaluatorModelIdentity, errors, `${path}.evaluatorModelIdentity`);
      const expectedDigest = permutation
        ? canonicalDigest({
            permutationId: permutation.permutationId,
            candidateIds: permutation.candidateIds,
          })
        : null;
      if (
        !isSafeId(run.runId) ||
        runIds.has(String(run.runId)) ||
        !permutation ||
        run.orderedCandidateDigest !== expectedDigest ||
        run.selectedCandidateId !== selectedCandidateId ||
        !isSafeId(run.evaluatorId) ||
        !isSafeId(run.evaluatorVersion) ||
        !isSafeId(run.evaluatorExecutionId) ||
        !isIsoInstant(run.completedAt) ||
        (modelValid && generatorFamilies.has(evaluatorModelIdentity.modelFamilyId))
      ) {
        orderRunsValid = false;
      }
      runIds.add(String(run.runId));
      derivedPermutationIds.push(String(run.permutationId));
      derivedOrderSelectedIds.push(String(run.selectedCandidateId));
    }
  }
  const derivedOrderStable =
    orderRunsValid &&
    new Set(derivedPermutationIds).size === expectedPermutationIds.length &&
    canonicalize([...derivedPermutationIds].sort()) === canonicalize(expectedPermutationIds) &&
    derivedOrderSelectedIds.every((id) => id === selectedCandidateId);
  if (
    !isRecord(orderBias) ||
    !Array.isArray(orderBias.permutationIds) ||
    canonicalize(orderBias.permutationIds) !== canonicalize(derivedPermutationIds) ||
    !Array.isArray(orderBias.selectedCandidateIds) ||
    canonicalize(orderBias.selectedCandidateIds) !== canonicalize(derivedOrderSelectedIds) ||
    orderBias.stableAcrossOrders !== derivedOrderStable ||
    orderBias.pass !== derivedOrderStable ||
    !derivedOrderStable
  ) {
    errors.push("metaAudit:ORDER_BIAS_FAILED");
  }
  const stability = value.repeatedStability;
  if (isRecord(stability)) {
    closedKeys(
      stability,
      [
        "auditKind",
        "fixtureDigest",
        "runs",
        "runIds",
        "selectedCandidateIds",
        "selectedOptionIds",
        "releaseDecisions",
        "pass",
      ],
      "metaAudit.repeatedStability",
      errors,
    );
  }
  const selectedCandidate = batch.candidates.find(
    (candidate) => candidate.candidateId === selectedCandidateId,
  );
  const expectedFixtureDigest = canonicalDigest({
    batchDigest: canonicalDigest(batch),
    selectedCandidateId,
  });
  let stabilityRunsValid =
    isRecord(stability) &&
    stability.auditKind === "REPEATED_STABILITY" &&
    stability.fixtureDigest === expectedFixtureDigest &&
    Array.isArray(stability.runs) &&
    stability.runs.length >= 3;
  const derivedRunIds: string[] = [];
  const derivedStabilityCandidateIds: string[] = [];
  const derivedOptionIds: string[] = [];
  const derivedReleaseDecisions: string[] = [];
  if (isRecord(stability) && Array.isArray(stability.runs)) {
    const runIds = new Set<string>();
    for (const [index, run] of stability.runs.entries()) {
      const path = `metaAudit.repeatedStability.runs[${index}]`;
      if (!isRecord(run)) {
        errors.push(`${path}:MUST_BE_OBJECT`);
        stabilityRunsValid = false;
        continue;
      }
      closedKeys(
        run,
        [
          "runId",
          "evaluatorId",
          "evaluatorVersion",
          "evaluatorModelIdentity",
          "evaluatorExecutionId",
          "fixtureDigest",
          "selectedCandidateId",
          "selectedOptionId",
          "releaseDecision",
          "completedAt",
        ],
        path,
        errors,
      );
      validateModelIdentity(run.evaluatorModelIdentity, errors, `${path}.evaluatorModelIdentity`);
      if (
        !isSafeId(run.runId) ||
        runIds.has(String(run.runId)) ||
        !isSafeId(run.evaluatorId) ||
        !isSafeId(run.evaluatorVersion) ||
        !isSafeId(run.evaluatorExecutionId) ||
        run.fixtureDigest !== expectedFixtureDigest ||
        run.selectedCandidateId !== selectedCandidateId ||
        run.selectedOptionId !== selectedCandidate?.proposedCorrectOptionId ||
        run.releaseDecision !== "PERSONAL_LEARNING_USABLE" ||
        !isIsoInstant(run.completedAt)
      ) {
        stabilityRunsValid = false;
      }
      runIds.add(String(run.runId));
      derivedRunIds.push(String(run.runId));
      derivedStabilityCandidateIds.push(String(run.selectedCandidateId));
      derivedOptionIds.push(String(run.selectedOptionId));
      derivedReleaseDecisions.push(String(run.releaseDecision));
    }
  }
  const derivedStabilityPass =
    stabilityRunsValid &&
    new Set(derivedStabilityCandidateIds).size === 1 &&
    new Set(derivedOptionIds).size === 1 &&
    new Set(derivedReleaseDecisions).size === 1;
  if (
    !selectedCandidate ||
    !isRecord(stability) ||
    canonicalize(stability.runIds) !== canonicalize(derivedRunIds) ||
    canonicalize(stability.selectedCandidateIds) !== canonicalize(derivedStabilityCandidateIds) ||
    canonicalize(stability.selectedOptionIds) !== canonicalize(derivedOptionIds) ||
    canonicalize(stability.releaseDecisions) !== canonicalize(derivedReleaseDecisions) ||
    stability.pass !== derivedStabilityPass ||
    !derivedStabilityPass
  ) {
    errors.push("metaAudit:REPEATED_STABILITY_FAILED");
  }
  const drift = value.judgeDrift;
  if (isRecord(drift)) {
    closedKeys(
      drift,
      [
        "auditKind",
        "fixtures",
        "baselineJudgeVersion",
        "currentJudgeVersion",
        "comparisonFixtureDigest",
        "disagreementRate",
        "maximumAllowedDisagreementRate",
        "pass",
      ],
      "metaAudit.judgeDrift",
      errors,
    );
  }
  let driftFixturesValid =
    isRecord(drift) &&
    drift.auditKind === "JUDGE_DRIFT" &&
    Array.isArray(drift.fixtures) &&
    drift.fixtures.length >= 2;
  const fixtureProjection: { fixtureId: string; inputDigest: string }[] = [];
  let disagreements = 0;
  if (isRecord(drift) && Array.isArray(drift.fixtures)) {
    const fixtureIds = new Set<string>();
    for (const [index, fixture] of drift.fixtures.entries()) {
      const path = `metaAudit.judgeDrift.fixtures[${index}]`;
      if (!isRecord(fixture)) {
        errors.push(`${path}:MUST_BE_OBJECT`);
        driftFixturesValid = false;
        continue;
      }
      closedKeys(fixture, ["fixtureId", "inputDigest", "baseline", "current"], path, errors);
      if (!isRecord(fixture.baseline) || !isRecord(fixture.current)) {
        errors.push(`${path}:OUTCOMES_MUST_BE_OBJECTS`);
        driftFixturesValid = false;
        continue;
      }
      for (const [kind, outcome] of [["baseline", fixture.baseline], ["current", fixture.current]] as const) {
        closedKeys(
          outcome,
          ["judgeId", "judgeVersion", "judgeModelIdentity", "judgeExecutionId", "approved", "completedAt"],
          `${path}.${kind}`,
          errors,
        );
        validateModelIdentity(outcome.judgeModelIdentity, errors, `${path}.${kind}.judgeModelIdentity`);
        if (
          !isSafeId(outcome.judgeId) ||
          !isSafeId(outcome.judgeVersion) ||
          !isSafeId(outcome.judgeExecutionId) ||
          !isIsoInstant(outcome.completedAt) ||
          typeof outcome.approved !== "boolean"
        ) {
          driftFixturesValid = false;
        }
      }
      if (
        !isSafeId(fixture.fixtureId) ||
        fixtureIds.has(String(fixture.fixtureId)) ||
        typeof fixture.inputDigest !== "string" ||
        !SHA256.test(fixture.inputDigest) ||
        fixture.baseline.judgeVersion !== drift.baselineJudgeVersion ||
        fixture.current.judgeVersion !== drift.currentJudgeVersion ||
        (isRecord(fixture.baseline.judgeModelIdentity) &&
          isRecord(fixture.current.judgeModelIdentity) &&
          fixture.baseline.judgeModelIdentity.modelFamilyId !== fixture.current.judgeModelIdentity.modelFamilyId)
      ) {
        driftFixturesValid = false;
      }
      if (fixture.baseline.approved !== fixture.current.approved) disagreements += 1;
      fixtureIds.add(String(fixture.fixtureId));
      fixtureProjection.push({ fixtureId: String(fixture.fixtureId), inputDigest: String(fixture.inputDigest) });
    }
  }
  const derivedFixtureDigest = canonicalDigest(fixtureProjection);
  const derivedDisagreementRate = fixtureProjection.length === 0
    ? 1
    : Number((disagreements / fixtureProjection.length).toFixed(6));
  const derivedDriftPass = driftFixturesValid && derivedDisagreementRate <= 0.1;
  if (
    !isRecord(drift) ||
    !isSafeId(drift.baselineJudgeVersion) ||
    !isSafeId(drift.currentJudgeVersion) ||
    drift.baselineJudgeVersion === drift.currentJudgeVersion ||
    drift.comparisonFixtureDigest !== derivedFixtureDigest ||
    drift.disagreementRate !== derivedDisagreementRate ||
    drift.maximumAllowedDisagreementRate !== 0.1 ||
    drift.pass !== derivedDriftPass ||
    !derivedDriftPass
  ) {
    errors.push("metaAudit:JUDGE_DRIFT_FAILED");
  }
  return validationResult(errors);
}
