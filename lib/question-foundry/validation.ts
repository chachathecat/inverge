import { createHash } from "node:crypto";

import {
  ANSWER_SPECIFICATION_VERSION,
  QUESTION_BLUEPRINT_VERSION,
  QUESTION_FOUNDRY_HARD_DENIED_SOURCE_CLASSES,
  QUESTION_FOUNDRY_SHARED_ELIGIBLE_SOURCE_CLASSES,
  QUESTION_FOUNDRY_SUBJECTS,
  type AnswerSpecificationV1,
  type CalculationSpecificationV1,
  type CandidateBatchV1,
  type JudgeReviewV1,
  type MetaAuditBundleV1,
  type QuestionBlueprintV1,
  type QuestionCandidateV1,
  type QuestionFoundryRightsManifestV1,
  type QuestionFoundrySourceClass,
  type QuestionFoundryValidationResult,
  type SimilarityFirewallReviewV1,
  type SimilarityReferenceV1,
  type SourceVersionBindingV1,
  type TrustedSourceRegistryV1,
} from "./contracts";

const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/u;
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
    value.operands.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
  ) {
    errors.push(`${path}.operands:INVALID`);
  }
  if (typeof value.result !== "number" || !Number.isFinite(value.result)) {
    errors.push(`${path}.result:INVALID`);
  }
  if (!isSafeId(value.unit)) errors.push(`${path}.unit:INVALID`);
  if (typeof value.tolerance !== "number" || value.tolerance < 0 || !Number.isFinite(value.tolerance)) {
    errors.push(`${path}.tolerance:INVALID`);
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

export function calculateDeterministically(
  calculation: CalculationSpecificationV1,
): number | null {
  const [left, right] = calculation.operands;
  let raw: number;
  if (calculation.operation === "ADD") raw = left + right;
  else if (calculation.operation === "SUBTRACT") raw = left - right;
  else if (calculation.operation === "MULTIPLY") raw = left * right;
  else {
    if (right === 0) return null;
    raw = left / right;
  }
  if (!Number.isFinite(raw)) return null;
  if (calculation.rounding.mode === "NONE") return raw;
  const factor = 10 ** calculation.rounding.scale;
  const magnitude = Math.round((Math.abs(raw) + Number.EPSILON) * factor) / factor;
  return Math.sign(raw) * magnitude;
}

export function validateCalculationSpecification(
  value: unknown,
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (!validateCalculationShape(value, errors, "calculation")) return validationResult(errors);
  const calculation = value as CalculationSpecificationV1;
  const actual = calculateDeterministically(calculation);
  if (actual === null) errors.push("calculation:DIVISION_BY_ZERO_OR_NONFINITE");
  else if (Math.abs(actual - calculation.result) > calculation.tolerance) {
    errors.push("calculation:RESULT_MISMATCH");
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
}

export function validateQuestionBlueprint(
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
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  const blueprintResult = validateQuestionBlueprint(blueprintValue);
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
  for (const field of ["candidateId", "generatorId", "generatorVersion", "generationRunId", "proposedCorrectOptionId"]) {
    if (!isSafeId(candidateValue[field])) errors.push(`${path}.${field}:INVALID`);
  }
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
      if (typeof option.body !== "string" || !normalizeQuestionText(option.body)) {
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

export function validateCandidateBatch(value: unknown): QuestionFoundryValidationResult {
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
  errors.push(...validateQuestionBlueprint(value.blueprint).errors);
  errors.push(...validateAnswerSpecification(value.answerSpecification, value.blueprint).errors);
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
    for (const [index, entry] of candidatePermutations.entries()) {
      if (!isRecord(entry) || !isSafeId(entry.permutationId) || !Array.isArray(entry.candidateIds)) {
        errors.push(`batch.candidateOrderPermutations[${index}]:INVALID`);
        continue;
      }
      if (!permutationIsExact(entry.candidateIds as string[], candidateIds)) {
        errors.push(`batch.candidateOrderPermutations[${index}]:NOT_EXACT_PERMUTATION`);
      }
      signatures.add((entry.candidateIds as string[]).join("|"));
    }
    if (signatures.size < 2) errors.push("batch.candidateOrderPermutations:ORDER_NOT_VARIED");

    const optionPermutations = Array.isArray(value.optionOrderPermutations)
      ? value.optionOrderPermutations
      : [];
    for (const candidate of value.candidates.filter(isRecord)) {
      const options = Array.isArray(candidate.options)
        ? candidate.options.filter(isRecord).map((option) => String(option.optionId))
        : [];
      const forCandidate = optionPermutations.filter(
        (entry) => isRecord(entry) && entry.candidateId === candidate.candidateId,
      );
      if (forCandidate.length < 2) {
        errors.push(`batch.optionOrderPermutations:${String(candidate.candidateId)}:MINIMUM_2`);
        continue;
      }
      const optionSignatures = new Set<string>();
      for (const entry of forCandidate) {
        if (!isRecord(entry) || !isSafeId(entry.permutationId) || !Array.isArray(entry.optionIds)) {
          errors.push(`batch.optionOrderPermutations:${String(candidate.candidateId)}:INVALID`);
          continue;
        }
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
  return validationResult(errors);
}

function resolveUnique<T>(items: readonly T[], predicate: (item: T) => boolean): T | null {
  const matches = items.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

function validateManifestAtUse(
  manifest: QuestionFoundryRightsManifestV1,
  binding: SourceVersionBindingV1,
  registry: TrustedSourceRegistryV1,
  purposes: readonly QuestionFoundryRightsManifestV1["permittedPurposes"][number][],
  errors: string[],
) {
  if (manifest.sourceClass !== binding.sourceClass) errors.push(`source:${binding.sourceId}:RIGHTS_CLASS_MISMATCH`);
  if (manifest.status !== "ACTIVE") errors.push(`source:${binding.sourceId}:RIGHTS_NOT_ACTIVE`);
  if (!manifest.territory.includes(registry.territory)) errors.push(`source:${binding.sourceId}:TERRITORY_DENIED`);
  if (purposes.some((purpose) => !manifest.permittedPurposes.includes(purpose))) {
    errors.push(`source:${binding.sourceId}:PURPOSE_DENIED`);
  }
  if (
    !isIsoInstant(manifest.validFrom) ||
    !isIsoInstant(manifest.validUntil) ||
    Date.parse(manifest.validFrom) > Date.parse(registry.asOf) ||
    Date.parse(registry.asOf) > Date.parse(manifest.validUntil)
  ) {
    errors.push(`source:${binding.sourceId}:RIGHTS_OUTSIDE_VALIDITY`);
  }
}

export function validateTrustedSourceBindings(
  bindings: readonly SourceVersionBindingV1[],
  registry: TrustedSourceRegistryV1,
  purposes: readonly QuestionFoundryRightsManifestV1["permittedPurposes"][number][] = [
    "QUESTION_BLUEPRINT_EXTRACTION",
    "QUESTION_GENERATION_CONTEXT",
  ],
): QuestionFoundryValidationResult {
  const errors: string[] = [];
  if (registry.registryVersion !== "question_foundry.trusted_source_registry.v1") {
    errors.push("sourceRegistry:VERSION_INVALID");
  }
  if (!isIsoInstant(registry.asOf) || registry.territory !== "KR") {
    errors.push("sourceRegistry:AS_OF_OR_TERRITORY_INVALID");
  }
  for (const binding of bindings) {
    if (HARD_DENIED_SOURCE_CLASSES.has(binding.sourceClass)) {
      errors.push(`source:${binding.sourceId}:HARD_DENIED_CLASS`);
      continue;
    }
    const trusted = resolveUnique(
      registry.sourceVersions,
      (entry) => entry.sourceId === binding.sourceId && entry.sourceVersionId === binding.sourceVersionId,
    );
    if (!trusted) {
      errors.push(`source:${binding.sourceId}:MISSING_OR_AMBIGUOUS_VERSION`);
      continue;
    }
    if (canonicalize(trusted) !== canonicalize(binding)) {
      errors.push(`source:${binding.sourceId}:TRUSTED_BINDING_MISMATCH`);
    }
    if (
      trusted.status !== "CURRENT" ||
      !isIsoInstant(trusted.effectiveFrom) ||
      !isIsoInstant(trusted.effectiveUntil) ||
      Date.parse(trusted.effectiveFrom) > Date.parse(registry.asOf) ||
      Date.parse(registry.asOf) > Date.parse(trusted.effectiveUntil)
    ) {
      errors.push(`source:${binding.sourceId}:NOT_EFFECTIVE_CURRENT_VERSION`);
    }
    const manifest = resolveUnique(
      registry.rightsManifests,
      (entry) =>
        entry.manifestId === binding.rightsManifestId &&
        entry.manifestVersionId === binding.rightsManifestVersionId,
    );
    if (!manifest) {
      errors.push(`source:${binding.sourceId}:MISSING_OR_AMBIGUOUS_RIGHTS`);
      continue;
    }
    validateManifestAtUse(manifest, binding, registry, purposes, errors);
  }
  return validationResult(errors);
}

function extractNumericValue(body: string): number | null {
  const normalized = body.replaceAll(",", "");
  const match = normalized.match(/[-+]?\d+(?:[.]\d+)?/u);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function validateCandidateCalculation(
  candidate: QuestionCandidateV1,
  answerSpecification: AnswerSpecificationV1,
): QuestionFoundryValidationResult {
  const calculation = answerSpecification.calculation;
  if (calculation === null) return validationResult([]);
  const errors = [...validateCalculationSpecification(calculation).errors];
  const correct = candidate.options.find((option) => option.optionId === candidate.proposedCorrectOptionId);
  if (!correct) return validationResult([...errors, "candidateCalculation:CORRECT_OPTION_MISSING"]);
  const correctValue = extractNumericValue(correct.body);
  if (correctValue === null || Math.abs(correctValue - calculation.result) > calculation.tolerance) {
    errors.push("candidateCalculation:CORRECT_VALUE_MISMATCH");
  }
  const matchingOptions = candidate.options.filter((option) => {
    const value = extractNumericValue(option.body);
    return value !== null && Math.abs(value - calculation.result) <= calculation.tolerance;
  });
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

export function buildSimilarityFirewallReview(
  candidate: QuestionCandidateV1,
  references: readonly SimilarityReferenceV1[],
  registry: TrustedSourceRegistryV1,
  threshold = 0.72,
): SimilarityFirewallReviewV1 {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold >= 1) {
    throw new Error("invalid-similarity-threshold");
  }
  const candidateBody = `${candidate.stem}\n${candidate.options.map((option) => option.body).join("\n")}`;
  const candidateTokens = tokenSet(candidateBody);
  let maximum = 0;
  let reconstructionRiskDetected = false;
  let protectedExplanationSequenceDetected = false;
  for (const reference of references) {
    if (!ELIGIBLE_SOURCE_CLASSES.has(reference.sourceClass)) {
      reconstructionRiskDetected = true;
      continue;
    }
    const manifest = resolveUnique(
      registry.rightsManifests,
      (entry) =>
        entry.manifestId === reference.rightsManifestId &&
        entry.manifestVersionId === reference.rightsManifestVersionId,
    );
    if (
      !manifest ||
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
      references.map(({ referenceId, sourceClass, rightsManifestId, rightsManifestVersionId, body }) => ({
        referenceId,
        sourceClass,
        rightsManifestId,
        rightsManifestVersionId,
        bodyDigest: canonicalDigest(body),
      })),
    ),
    referenceCount: references.length,
    maximumTokenJaccard: Number(maximum.toFixed(6)),
    threshold,
    nearCopyDetected: maximum >= threshold,
    reconstructionRiskDetected,
    protectedExplanationSequenceDetected,
  });
}

export function validateGeneratorJudgeSolverSeparation(
  batch: CandidateBatchV1,
  solverReviews: readonly {
    solverId: string;
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
  const solvers = solverReviews.filter((review) => review.candidateId === selectedCandidateId);
  if (solvers.length < 2 || new Set(solvers.map((review) => review.solverId)).size < 2) {
    errors.push("separation:TWO_INDEPENDENT_SOLVERS_REQUIRED");
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
  const generatorIds = new Set(batch.candidates.map((candidate) => candidate.generatorId));
  const expectedCandidateIds = batch.candidates.map((candidate) => candidate.candidateId).sort();
  const selfPreference = value.selfPreference;
  if (
    selfPreference.auditKind !== "SELF_PREFERENCE" ||
    selfPreference.anonymized !== true ||
    selfPreference.selectedCandidateId !== selectedCandidateId ||
    canonicalize([...selfPreference.candidateIds].sort()) !== canonicalize(expectedCandidateIds) ||
    selfPreference.evaluatorIds.length < 1 ||
    selfPreference.evaluatorIds.some((id) => generatorIds.has(id)) ||
    selfPreference.generatorEvaluatorOverlap.length !== 0 ||
    selfPreference.pass !== true
  ) {
    errors.push("metaAudit:SELF_PREFERENCE_FAILED");
  }
  const orderBias = value.orderBias;
  const expectedPermutationIds = batch.candidateOrderPermutations
    .map((entry) => entry.permutationId)
    .sort();
  if (
    orderBias.auditKind !== "ORDER_BIAS" ||
    orderBias.permutationIds.length < 2 ||
    new Set(orderBias.permutationIds).size < 2 ||
    canonicalize([...orderBias.permutationIds].sort()) !== canonicalize(expectedPermutationIds) ||
    orderBias.selectedCandidateIds.some((id) => id !== selectedCandidateId) ||
    orderBias.selectedCandidateIds.length !== orderBias.permutationIds.length ||
    orderBias.stableAcrossOrders !== true ||
    orderBias.pass !== true
  ) {
    errors.push("metaAudit:ORDER_BIAS_FAILED");
  }
  const stability = value.repeatedStability;
  if (
    stability.auditKind !== "REPEATED_STABILITY" ||
    stability.runIds.length < 3 ||
    new Set(stability.runIds).size !== stability.runIds.length ||
    stability.selectedCandidateIds.length !== stability.runIds.length ||
    stability.selectedOptionIds.length !== stability.runIds.length ||
    stability.releaseDecisions.length !== stability.runIds.length ||
    stability.selectedCandidateIds.some((id) => id !== selectedCandidateId) ||
    new Set(stability.selectedOptionIds).size !== 1 ||
    new Set(stability.releaseDecisions).size !== 1 ||
    stability.pass !== true
  ) {
    errors.push("metaAudit:REPEATED_STABILITY_FAILED");
  }
  const drift = value.judgeDrift;
  if (
    drift.auditKind !== "JUDGE_DRIFT" ||
    !isSafeId(drift.baselineJudgeVersion) ||
    !isSafeId(drift.currentJudgeVersion) ||
    drift.baselineJudgeVersion === drift.currentJudgeVersion ||
    !SHA256.test(drift.comparisonFixtureDigest) ||
    !Number.isFinite(drift.disagreementRate) ||
    !Number.isFinite(drift.maximumAllowedDisagreementRate) ||
    drift.maximumAllowedDisagreementRate < 0 ||
    drift.maximumAllowedDisagreementRate > 1 ||
    drift.disagreementRate < 0 ||
    drift.disagreementRate > drift.maximumAllowedDisagreementRate ||
    drift.pass !== true
  ) {
    errors.push("metaAudit:JUDGE_DRIFT_FAILED");
  }
  return validationResult(errors);
}
