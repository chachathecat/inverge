import { readFileSync } from "node:fs";
import path from "node:path";

export type PracticeCalculationRegistryScope = "appraiser_second_round_practice_only";
export type PracticeCalculationSubject = "practice";
export type PracticeCalculationType =
  | "income_capitalization"
  | "cost_approach_depreciation"
  | "land_residual"
  | "unit_conversion"
  | "time_adjustment"
  | "rounding_only"
  | "rate_conversion";
export type PracticeCalculationSupportStatus = "supported_metadata_only";
export type PracticeCalculationMetadataStatus = "metadata_ready" | "blocked";
export type PracticeCalculationReleaseStatus = "metadata_only_not_released" | "blocked_pending_runtime_evidence";

export type PracticeCalculationStoragePolicy = {
  metadataOnly: true;
  rawLearnerAnswerStored: false;
  rawOcrTextStored: false;
  rawProblemTextStored: false;
  rawAnswerTextStored: false;
  rawOfficialQuestionBodyStored: false;
  rawOfficialAnswerBodyStored: false;
  providerPayloadStored: false;
  privateContentStored: false;
  credentialsStored: false;
  rawFormulaExpressionStored: false;
  rawExtractedValuesStored: false;
  rawCalculationTraceStored: false;
};

export type PracticeCalculationBoundaryPolicy = {
  sourceLevelValidatorOnly: true;
  runtimeOcrCalled: false;
  providerApiCalled: false;
  learnerRuntimeChanged: false;
  referenceAnswerGenerated: false;
  officialGradingClaimAllowed: false;
  officialModelAnswerClaimAllowed: false;
  passProbabilityClaimAllowed: false;
  passGuaranteeClaimAllowed: false;
};

export type PracticeCalculationCoordination = {
  targetIssueNumber: 509;
  roadmapItemId: "S210";
  roadmapItemTitle: "Practice Calculation Unit OCR and Supported-Type Validator";
  prBodyClosingReference: "Closes #509";
  generatedBranchMetadataStored: false;
};

export type PracticeCalculationQuestionLinkage = {
  canonicalQuestionId: string;
  sourceId: string;
  subject: PracticeCalculationSubject;
  sourceRightsStatus: "metadata_only_pending" | "redistribution_allowed" | "display_by_deep_link" | "private_reference_only" | "needs_legal_review";
  officialProblemBodyStored: false;
  officialAnswerBodyStored: false;
  learnerAnswerStored: false;
};

export type PracticeCalculationSupport = {
  status: PracticeCalculationSupportStatus;
  unsupportedReasonCodes: [];
};

export type PracticeCalculationFormulaMetadata = {
  formulaId: string;
  formulaKind: "valuation_formula" | "unit_conversion" | "rounding_policy" | "time_adjustment";
  formulaExpressionStored: false;
  rawFormulaStored: false;
  unitCheckRequired: true;
  roundingCheckRequired: true;
  sourceAnchorIds: string[];
};

export type PracticeCalculationOcrFieldSchema = {
  fieldId: string;
  expectedUnit: string;
  normalizedUnit: string;
  required: true;
  rawValueStored: false;
};

export type PracticeCalculationOcrPolicy = {
  confidenceGateRequired: true;
  minimumOverallConfidence: number;
  minimumFieldConfidence: number;
  lowConfidenceFailsClosed: true;
  runtimeOcrCalled: false;
  rawOcrTextStored: false;
  providerPayloadStored: false;
  fieldSchema: PracticeCalculationOcrFieldSchema[];
};

export type PracticeCalculationUnitDimension = {
  dimensionId: string;
  expectedUnit: string;
  normalizedUnit: string;
  rawValueStored: false;
};

export type PracticeCalculationUnitCheck = {
  required: true;
  status: PracticeCalculationMetadataStatus;
  dimensions: PracticeCalculationUnitDimension[];
  rawValuesStored: false;
};

export type PracticeCalculationRoundingCheck = {
  required: true;
  status: PracticeCalculationMetadataStatus;
  ruleId: string;
  rawExpectedOutputStored: false;
};

export type PracticeCalculationIndependentRecalculation = {
  required: true;
  status: PracticeCalculationMetadataStatus;
  reviewerCountRequired: number;
  rawTraceStored: false;
};

export type PracticeCalculationGiiiRoutine = {
  calculatorModel: "casio_fx_9860giii";
  resetSafeHandKeyedRoutineRequired: true;
  storedProgramDependencyAllowed: false;
  routineMetadataStatus: PracticeCalculationMetadataStatus;
  handKeyedSequenceMetadata: {
    status: PracticeCalculationMetadataStatus;
    stepCount: number;
    sequenceStored: false;
  };
  expectedDisplayStored: false;
  answerSheetTransferTemplateStored: false;
};

export type PracticeCalculationReleaseGate = {
  releaseAllowed: false;
  status: PracticeCalculationReleaseStatus;
  referenceAnswerReleaseAllowed: false;
  officialGradingClaimAllowed: false;
  requiredRuntimeEvidence: "human_reviewed_runtime_ocr_and_recalculation_evidence";
  reasonCodes: string[];
};

export type PracticeCalculationUnitRecord = {
  id: string;
  subject: PracticeCalculationSubject;
  calculationType: PracticeCalculationType;
  questionLinkage: PracticeCalculationQuestionLinkage;
  support: PracticeCalculationSupport;
  formulaMetadata: PracticeCalculationFormulaMetadata;
  ocrPolicy: PracticeCalculationOcrPolicy;
  unitCheck: PracticeCalculationUnitCheck;
  roundingCheck: PracticeCalculationRoundingCheck;
  independentRecalculation: PracticeCalculationIndependentRecalculation;
  giiiRoutine: PracticeCalculationGiiiRoutine;
  releaseGate: PracticeCalculationReleaseGate;
  conceptNodeIds: string[];
  sourceAnchorIds: string[];
};

export type PracticeCalculationUnitRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_practice_calculation_unit_registry";
  registryScope: PracticeCalculationRegistryScope;
  generatedBy: string;
  generatedAt: string;
  coordination: PracticeCalculationCoordination;
  storagePolicy: PracticeCalculationStoragePolicy;
  boundaryPolicy: PracticeCalculationBoundaryPolicy;
  units: PracticeCalculationUnitRecord[];
};

export type PracticeCalculationUnitReport = {
  schemaVersion: string;
  reportType: "appraiser_second_round_practice_calculation_unit_report";
  generatedBy: string;
  generatedAt: string;
  registryPath: string;
  storagePolicy: PracticeCalculationStoragePolicy;
  coordination: PracticeCalculationCoordination;
  totals: {
    unitCount: number;
    supportedMetadataUnitCount: number;
    releaseAllowedUnitCount: number;
    blockedReleaseUnitCount: number;
    ocrConfidenceGateCount: number;
    giiiRoutineCount: number;
    sourceLevelOnlyUnitCount: number;
    calculationTypeCounts: Record<PracticeCalculationType, number>;
  };
  unitIds: string[];
  metadataOnly: true;
  safeUse: "s210_practice_calculation_unit_contract_only";
};

export type PracticeCalculationUnitRegistryConfig = {
  registryPath?: string;
  reportPath?: string;
};

const DEFAULT_REGISTRY_PATH = "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_units.json";
const DEFAULT_REPORT_PATH = "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_unit_report.json";
const REPORT_GENERATED_AT = "2026-06-27T00:00:00.000Z";

const SUPPORTED_CALCULATION_TYPES = [
  "income_capitalization",
  "cost_approach_depreciation",
  "land_residual",
  "unit_conversion",
  "time_adjustment",
  "rounding_only",
  "rate_conversion",
] as const;
const FORMULA_KINDS = ["valuation_formula", "unit_conversion", "rounding_policy", "time_adjustment"] as const;
const SOURCE_RIGHTS_STATUSES = [
  "metadata_only_pending",
  "redistribution_allowed",
  "display_by_deep_link",
  "private_reference_only",
  "needs_legal_review",
] as const;
const METADATA_STATUSES = ["metadata_ready", "blocked"] as const;
const RELEASE_STATUSES = ["metadata_only_not_released", "blocked_pending_runtime_evidence"] as const;
const REQUIRED_RELEASE_REASON_CODES = ["source_level_validator_only", "runtime_ocr_not_run"] as const;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,160}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MINIMUM_OVERALL_OCR_CONFIDENCE = 0.98;
const MINIMUM_FIELD_OCR_CONFIDENCE = 0.95;

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawLearnerAnswer",
  "learnerAnswer",
  "learnerAnswerText",
  "rawOcrText",
  "ocrText",
  "ocrFullText",
  "rawProblemText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "problemBody",
  "questionBody",
  "rawAnswerText",
  "answerText",
  "answerBody",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "officialModelAnswer",
  "providerPayload",
  "providerResponse",
  "billingRecord",
  "authToken",
  "privateContent",
  "privateUserContent",
  "credentials",
  "credential",
  "secret",
  "token",
  "apiKey",
  "password",
  "sourceExcerpt",
  "sourceText",
  "copyrightedText",
]);
const FORBIDDEN_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|official\s+model\s+answer|model\s+answer|pass\s*\/\s*fail|pass\s+probability|pass\s+guarantee|guaranteed\s+score|score\s+prediction)/i;
const SECRET_VALUE_PATTERN =
  /(?:^|\b)(?:ghp_[a-z0-9_]{10,}|sk-[a-z0-9_-]{10,}|token\s*[:=]|secret\s*[:=]|password\s*[:=]|api[_-]?key\s*[:=]|service[_-]?role\s*[:=])/i;

function resolveRepoPath(customPath: string | undefined, fallback: string) {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), customPath ?? fallback);
}

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, sourceName: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${sourceName} must be a JSON object`);
}

function assertString(value: unknown, fieldName: string, sourceName: string, maxLength = 260) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${fieldName} must be a non-empty string`);
  }
  if (value.length > maxLength) throw new Error(`${sourceName}.${fieldName} is too long for metadata-only use`);
  if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
    throw new Error(`${sourceName}.${fieldName} contains a prohibited official grading, model-answer, pass-probability, or guarantee claim`);
  }
  if (SECRET_VALUE_PATTERN.test(value)) {
    throw new Error(`${sourceName}.${fieldName} contains credential-like or secret-like content`);
  }
  return value;
}

function assertId(value: unknown, fieldName: string, sourceName: string) {
  const id = assertString(value, fieldName, sourceName, 180);
  if (!ID_PATTERN.test(id)) throw new Error(`${sourceName}.${fieldName} must be a stable lowercase metadata id`);
  return id;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName}.${fieldName} must be false`);
  return false;
}

function assertNumber(value: unknown, fieldName: string, sourceName: string, options: { min?: number; max?: number } = {}) {
  if (typeof value !== "number" || Number.isNaN(value)) throw new Error(`${sourceName}.${fieldName} must be a number`);
  if (options.min !== undefined && value < options.min) throw new Error(`${sourceName}.${fieldName} must be >= ${options.min}`);
  if (options.max !== undefined && value > options.max) throw new Error(`${sourceName}.${fieldName} must be <= ${options.max}`);
  return value;
}

function assertInteger(value: unknown, fieldName: string, sourceName: string, options: { min?: number; max?: number } = {}) {
  if (!Number.isInteger(value)) throw new Error(`${sourceName}.${fieldName} must be an integer`);
  return assertNumber(value, fieldName, sourceName, options);
}

function assertIsoInstant(value: unknown, fieldName: string, sourceName: string) {
  const instant = assertString(value, fieldName, sourceName);
  if (!ISO_INSTANT_PATTERN.test(instant)) throw new Error(`${sourceName}.${fieldName} must be a deterministic ISO instant`);
  return instant;
}

function assertOneOf<const T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  sourceName: string,
  allowedValues: T,
): T[number] {
  const stringValue = assertString(value, fieldName, sourceName);
  if (!(allowedValues as readonly string[]).includes(stringValue)) {
    throw new Error(`${sourceName}.${fieldName} has unsupported value ${stringValue}`);
  }
  return stringValue;
}

function assertStringArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertString(entry, `${fieldName}[${index}]`, sourceName, 180));
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string) {
  return assertStringArray(value, fieldName, sourceName).map((entry, index) => {
    if (!ID_PATTERN.test(entry)) throw new Error(`${sourceName}.${fieldName}[${index}] must be a stable lowercase metadata id`);
    return entry;
  });
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string") {
      if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
        throw new Error(`${sourceName} ${trail} contains a prohibited official grading, model-answer, pass-probability, or guarantee claim`);
      }
      if (SECRET_VALUE_PATTERN.test(value)) {
        throw new Error(`${sourceName} ${trail} contains credential-like or secret-like content`);
      }
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName} contains forbidden raw/private/credential field ${key} at ${trail}`);
    }
    assertNoForbiddenRawFields(nestedValue, sourceName, `${trail}.${key}`);
  }
}

function assertUniqueStringIds(ids: string[], sourceName: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function assertRequiredReasonCodes(reasonCodes: string[], sourceName: string) {
  for (const code of REQUIRED_RELEASE_REASON_CODES) {
    if (!reasonCodes.includes(code)) {
      throw new Error(`${sourceName}.releaseGate.reasonCodes must include ${code}`);
    }
  }
}

function validateStoragePolicy(value: unknown, sourceName: string): PracticeCalculationStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", `${sourceName}.storagePolicy`),
    rawLearnerAnswerStored: assertFalse(value.rawLearnerAnswerStored, "rawLearnerAnswerStored", `${sourceName}.storagePolicy`),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", `${sourceName}.storagePolicy`),
    rawProblemTextStored: assertFalse(value.rawProblemTextStored, "rawProblemTextStored", `${sourceName}.storagePolicy`),
    rawAnswerTextStored: assertFalse(value.rawAnswerTextStored, "rawAnswerTextStored", `${sourceName}.storagePolicy`),
    rawOfficialQuestionBodyStored: assertFalse(value.rawOfficialQuestionBodyStored, "rawOfficialQuestionBodyStored", `${sourceName}.storagePolicy`),
    rawOfficialAnswerBodyStored: assertFalse(value.rawOfficialAnswerBodyStored, "rawOfficialAnswerBodyStored", `${sourceName}.storagePolicy`),
    providerPayloadStored: assertFalse(value.providerPayloadStored, "providerPayloadStored", `${sourceName}.storagePolicy`),
    privateContentStored: assertFalse(value.privateContentStored, "privateContentStored", `${sourceName}.storagePolicy`),
    credentialsStored: assertFalse(value.credentialsStored, "credentialsStored", `${sourceName}.storagePolicy`),
    rawFormulaExpressionStored: assertFalse(value.rawFormulaExpressionStored, "rawFormulaExpressionStored", `${sourceName}.storagePolicy`),
    rawExtractedValuesStored: assertFalse(value.rawExtractedValuesStored, "rawExtractedValuesStored", `${sourceName}.storagePolicy`),
    rawCalculationTraceStored: assertFalse(value.rawCalculationTraceStored, "rawCalculationTraceStored", `${sourceName}.storagePolicy`),
  };
}

function validateBoundaryPolicy(value: unknown, sourceName: string): PracticeCalculationBoundaryPolicy {
  assertRecord(value, `${sourceName}.boundaryPolicy`);
  return {
    sourceLevelValidatorOnly: assertTrue(value.sourceLevelValidatorOnly, "sourceLevelValidatorOnly", `${sourceName}.boundaryPolicy`),
    runtimeOcrCalled: assertFalse(value.runtimeOcrCalled, "runtimeOcrCalled", `${sourceName}.boundaryPolicy`),
    providerApiCalled: assertFalse(value.providerApiCalled, "providerApiCalled", `${sourceName}.boundaryPolicy`),
    learnerRuntimeChanged: assertFalse(value.learnerRuntimeChanged, "learnerRuntimeChanged", `${sourceName}.boundaryPolicy`),
    referenceAnswerGenerated: assertFalse(value.referenceAnswerGenerated, "referenceAnswerGenerated", `${sourceName}.boundaryPolicy`),
    officialGradingClaimAllowed: assertFalse(value.officialGradingClaimAllowed, "officialGradingClaimAllowed", `${sourceName}.boundaryPolicy`),
    officialModelAnswerClaimAllowed: assertFalse(value.officialModelAnswerClaimAllowed, "officialModelAnswerClaimAllowed", `${sourceName}.boundaryPolicy`),
    passProbabilityClaimAllowed: assertFalse(value.passProbabilityClaimAllowed, "passProbabilityClaimAllowed", `${sourceName}.boundaryPolicy`),
    passGuaranteeClaimAllowed: assertFalse(value.passGuaranteeClaimAllowed, "passGuaranteeClaimAllowed", `${sourceName}.boundaryPolicy`),
  };
}

function validateCoordination(value: unknown, sourceName: string): PracticeCalculationCoordination {
  assertRecord(value, `${sourceName}.coordination`);
  const coordination = {
    targetIssueNumber: assertInteger(value.targetIssueNumber, "targetIssueNumber", `${sourceName}.coordination`, { min: 1, max: 99999 }) as 509,
    roadmapItemId: assertOneOf(value.roadmapItemId, "roadmapItemId", `${sourceName}.coordination`, ["S210"] as const),
    roadmapItemTitle: assertOneOf(
      value.roadmapItemTitle,
      "roadmapItemTitle",
      `${sourceName}.coordination`,
      ["Practice Calculation Unit OCR and Supported-Type Validator"] as const,
    ),
    prBodyClosingReference: assertOneOf(value.prBodyClosingReference, "prBodyClosingReference", `${sourceName}.coordination`, ["Closes #509"] as const),
    generatedBranchMetadataStored: assertFalse(
      value.generatedBranchMetadataStored,
      "generatedBranchMetadataStored",
      `${sourceName}.coordination`,
    ),
  };
  if (coordination.targetIssueNumber !== 509) throw new Error(`${sourceName}.coordination.targetIssueNumber must be 509`);
  const closingRefs = coordination.prBodyClosingReference.match(/\b(?:Closes|Fixes)\s+#\d+\b/g) ?? [];
  if (closingRefs.length !== 1) {
    throw new Error(`${sourceName}.coordination.prBodyClosingReference must contain exactly one closing reference`);
  }
  if (coordination.roadmapItemId === `S${coordination.targetIssueNumber}`) {
    throw new Error(`${sourceName}.coordination must keep target issue and roadmap item distinct`);
  }
  return coordination;
}

function validateQuestionLinkage(value: unknown, sourceName: string): PracticeCalculationQuestionLinkage {
  assertRecord(value, sourceName);
  return {
    canonicalQuestionId: assertId(value.canonicalQuestionId, "canonicalQuestionId", sourceName),
    sourceId: assertId(value.sourceId, "sourceId", sourceName),
    subject: assertOneOf(value.subject, "subject", sourceName, ["practice"] as const),
    sourceRightsStatus: assertOneOf(value.sourceRightsStatus, "sourceRightsStatus", sourceName, SOURCE_RIGHTS_STATUSES),
    officialProblemBodyStored: assertFalse(value.officialProblemBodyStored, "officialProblemBodyStored", sourceName),
    officialAnswerBodyStored: assertFalse(value.officialAnswerBodyStored, "officialAnswerBodyStored", sourceName),
    learnerAnswerStored: assertFalse(value.learnerAnswerStored, "learnerAnswerStored", sourceName),
  };
}

function validateSupport(value: unknown, sourceName: string): PracticeCalculationSupport {
  assertRecord(value, sourceName);
  const unsupportedReasonCodes = value.unsupportedReasonCodes;
  if (!Array.isArray(unsupportedReasonCodes)) throw new Error(`${sourceName}.unsupportedReasonCodes must be an array`);
  if (unsupportedReasonCodes.length !== 0) throw new Error(`${sourceName}.unsupportedReasonCodes must be empty for supported S210 metadata`);
  return {
    status: assertOneOf(value.status, "status", sourceName, ["supported_metadata_only"] as const),
    unsupportedReasonCodes: [],
  };
}

function validateFormulaMetadata(value: unknown, sourceName: string): PracticeCalculationFormulaMetadata {
  assertRecord(value, sourceName);
  return {
    formulaId: assertId(value.formulaId, "formulaId", sourceName),
    formulaKind: assertOneOf(value.formulaKind, "formulaKind", sourceName, FORMULA_KINDS),
    formulaExpressionStored: assertFalse(value.formulaExpressionStored, "formulaExpressionStored", sourceName),
    rawFormulaStored: assertFalse(value.rawFormulaStored, "rawFormulaStored", sourceName),
    unitCheckRequired: assertTrue(value.unitCheckRequired, "unitCheckRequired", sourceName),
    roundingCheckRequired: assertTrue(value.roundingCheckRequired, "roundingCheckRequired", sourceName),
    sourceAnchorIds: assertIdArray(value.sourceAnchorIds, "sourceAnchorIds", sourceName),
  };
}

function validateOcrFieldSchema(value: unknown, index: number, parentName: string): PracticeCalculationOcrFieldSchema {
  const sourceName = `${parentName}.fieldSchema[${index}]`;
  assertRecord(value, sourceName);
  return {
    fieldId: assertId(value.fieldId, "fieldId", sourceName),
    expectedUnit: assertString(value.expectedUnit, "expectedUnit", sourceName, 80),
    normalizedUnit: assertString(value.normalizedUnit, "normalizedUnit", sourceName, 80),
    required: assertTrue(value.required, "required", sourceName),
    rawValueStored: assertFalse(value.rawValueStored, "rawValueStored", sourceName),
  };
}

function validateOcrPolicy(value: unknown, sourceName: string): PracticeCalculationOcrPolicy {
  assertRecord(value, sourceName);
  if (!Array.isArray(value.fieldSchema)) throw new Error(`${sourceName}.fieldSchema must be an array`);
  const fieldSchema = value.fieldSchema.map((entry, index) => validateOcrFieldSchema(entry, index, sourceName));
  if (fieldSchema.length === 0) throw new Error(`${sourceName}.fieldSchema must contain at least one required metadata field`);
  assertUniqueStringIds(fieldSchema.map((field) => field.fieldId), `${sourceName}.fieldSchema`);
  const minimumOverallConfidence = assertNumber(
    value.minimumOverallConfidence,
    "minimumOverallConfidence",
    sourceName,
    { min: MINIMUM_OVERALL_OCR_CONFIDENCE, max: 1 },
  );
  const minimumFieldConfidence = assertNumber(value.minimumFieldConfidence, "minimumFieldConfidence", sourceName, {
    min: MINIMUM_FIELD_OCR_CONFIDENCE,
    max: 1,
  });
  return {
    confidenceGateRequired: assertTrue(value.confidenceGateRequired, "confidenceGateRequired", sourceName),
    minimumOverallConfidence,
    minimumFieldConfidence,
    lowConfidenceFailsClosed: assertTrue(value.lowConfidenceFailsClosed, "lowConfidenceFailsClosed", sourceName),
    runtimeOcrCalled: assertFalse(value.runtimeOcrCalled, "runtimeOcrCalled", sourceName),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "rawOcrTextStored", sourceName),
    providerPayloadStored: assertFalse(value.providerPayloadStored, "providerPayloadStored", sourceName),
    fieldSchema,
  };
}

function validateUnitDimension(value: unknown, index: number, parentName: string): PracticeCalculationUnitDimension {
  const sourceName = `${parentName}.dimensions[${index}]`;
  assertRecord(value, sourceName);
  return {
    dimensionId: assertId(value.dimensionId, "dimensionId", sourceName),
    expectedUnit: assertString(value.expectedUnit, "expectedUnit", sourceName, 80),
    normalizedUnit: assertString(value.normalizedUnit, "normalizedUnit", sourceName, 80),
    rawValueStored: assertFalse(value.rawValueStored, "rawValueStored", sourceName),
  };
}

function validateUnitCheck(value: unknown, sourceName: string): PracticeCalculationUnitCheck {
  assertRecord(value, sourceName);
  if (!Array.isArray(value.dimensions)) throw new Error(`${sourceName}.dimensions must be an array`);
  const dimensions = value.dimensions.map((entry, index) => validateUnitDimension(entry, index, sourceName));
  if (dimensions.length === 0) throw new Error(`${sourceName}.dimensions must contain at least one unit dimension`);
  assertUniqueStringIds(dimensions.map((dimension) => dimension.dimensionId), `${sourceName}.dimensions`);
  return {
    required: assertTrue(value.required, "required", sourceName),
    status: assertOneOf(value.status, "status", sourceName, METADATA_STATUSES),
    dimensions,
    rawValuesStored: assertFalse(value.rawValuesStored, "rawValuesStored", sourceName),
  };
}

function validateRoundingCheck(value: unknown, sourceName: string): PracticeCalculationRoundingCheck {
  assertRecord(value, sourceName);
  return {
    required: assertTrue(value.required, "required", sourceName),
    status: assertOneOf(value.status, "status", sourceName, METADATA_STATUSES),
    ruleId: assertId(value.ruleId, "ruleId", sourceName),
    rawExpectedOutputStored: assertFalse(value.rawExpectedOutputStored, "rawExpectedOutputStored", sourceName),
  };
}

function validateIndependentRecalculation(value: unknown, sourceName: string): PracticeCalculationIndependentRecalculation {
  assertRecord(value, sourceName);
  return {
    required: assertTrue(value.required, "required", sourceName),
    status: assertOneOf(value.status, "status", sourceName, METADATA_STATUSES),
    reviewerCountRequired: assertInteger(value.reviewerCountRequired, "reviewerCountRequired", sourceName, { min: 2, max: 10 }),
    rawTraceStored: assertFalse(value.rawTraceStored, "rawTraceStored", sourceName),
  };
}

function validateGiiiRoutine(value: unknown, sourceName: string): PracticeCalculationGiiiRoutine {
  assertRecord(value, sourceName);
  assertRecord(value.handKeyedSequenceMetadata, `${sourceName}.handKeyedSequenceMetadata`);
  return {
    calculatorModel: assertOneOf(value.calculatorModel, "calculatorModel", sourceName, ["casio_fx_9860giii"] as const),
    resetSafeHandKeyedRoutineRequired: assertTrue(
      value.resetSafeHandKeyedRoutineRequired,
      "resetSafeHandKeyedRoutineRequired",
      sourceName,
    ),
    storedProgramDependencyAllowed: assertFalse(value.storedProgramDependencyAllowed, "storedProgramDependencyAllowed", sourceName),
    routineMetadataStatus: assertOneOf(value.routineMetadataStatus, "routineMetadataStatus", sourceName, METADATA_STATUSES),
    handKeyedSequenceMetadata: {
      status: assertOneOf(
        value.handKeyedSequenceMetadata.status,
        "status",
        `${sourceName}.handKeyedSequenceMetadata`,
        METADATA_STATUSES,
      ),
      stepCount: assertInteger(value.handKeyedSequenceMetadata.stepCount, "stepCount", `${sourceName}.handKeyedSequenceMetadata`, {
        min: 1,
        max: 100,
      }),
      sequenceStored: assertFalse(value.handKeyedSequenceMetadata.sequenceStored, "sequenceStored", `${sourceName}.handKeyedSequenceMetadata`),
    },
    expectedDisplayStored: assertFalse(value.expectedDisplayStored, "expectedDisplayStored", sourceName),
    answerSheetTransferTemplateStored: assertFalse(
      value.answerSheetTransferTemplateStored,
      "answerSheetTransferTemplateStored",
      sourceName,
    ),
  };
}

function validateReleaseGate(value: unknown, sourceName: string): PracticeCalculationReleaseGate {
  assertRecord(value, sourceName);
  const reasonCodes = assertIdArray(value.reasonCodes, "reasonCodes", sourceName);
  assertRequiredReasonCodes(reasonCodes, sourceName);
  return {
    releaseAllowed: assertFalse(value.releaseAllowed, "releaseAllowed", sourceName),
    status: assertOneOf(value.status, "status", sourceName, RELEASE_STATUSES),
    referenceAnswerReleaseAllowed: assertFalse(value.referenceAnswerReleaseAllowed, "referenceAnswerReleaseAllowed", sourceName),
    officialGradingClaimAllowed: assertFalse(value.officialGradingClaimAllowed, "officialGradingClaimAllowed", sourceName),
    requiredRuntimeEvidence: assertOneOf(
      value.requiredRuntimeEvidence,
      "requiredRuntimeEvidence",
      sourceName,
      ["human_reviewed_runtime_ocr_and_recalculation_evidence"] as const,
    ),
    reasonCodes,
  };
}

function assertUnitBusinessRules(unit: PracticeCalculationUnitRecord, sourceName: string) {
  if (unit.subject !== "practice" || unit.questionLinkage.subject !== "practice") {
    throw new Error(`${sourceName} must stay scoped to second-round practice only`);
  }
  if (unit.unitCheck.status !== "metadata_ready") throw new Error(`${sourceName}.unitCheck.status must be metadata_ready`);
  if (unit.roundingCheck.status !== "metadata_ready") throw new Error(`${sourceName}.roundingCheck.status must be metadata_ready`);
  if (unit.independentRecalculation.status !== "metadata_ready") {
    throw new Error(`${sourceName}.independentRecalculation.status must be metadata_ready`);
  }
  if (unit.giiiRoutine.routineMetadataStatus !== "metadata_ready") {
    throw new Error(`${sourceName}.giiiRoutine.routineMetadataStatus must be metadata_ready`);
  }
  if (unit.giiiRoutine.handKeyedSequenceMetadata.status !== "metadata_ready") {
    throw new Error(`${sourceName}.giiiRoutine.handKeyedSequenceMetadata.status must be metadata_ready`);
  }
  if (unit.releaseGate.releaseAllowed) throw new Error(`${sourceName}.releaseGate.releaseAllowed must fail closed in S210`);
  if (unit.releaseGate.status === "metadata_only_not_released" && !unit.releaseGate.reasonCodes.includes("source_level_validator_only")) {
    throw new Error(`${sourceName}.releaseGate.status requires source_level_validator_only reason code`);
  }
}

function validateUnit(raw: unknown, index: number): PracticeCalculationUnitRecord {
  const sourceName = `practice_calculation_units.units[${index}]`;
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  const unit: PracticeCalculationUnitRecord = {
    id: assertId(raw.id, "id", sourceName),
    subject: assertOneOf(raw.subject, "subject", sourceName, ["practice"] as const),
    calculationType: assertOneOf(raw.calculationType, "calculationType", sourceName, SUPPORTED_CALCULATION_TYPES),
    questionLinkage: validateQuestionLinkage(raw.questionLinkage, `${sourceName}.questionLinkage`),
    support: validateSupport(raw.support, `${sourceName}.support`),
    formulaMetadata: validateFormulaMetadata(raw.formulaMetadata, `${sourceName}.formulaMetadata`),
    ocrPolicy: validateOcrPolicy(raw.ocrPolicy, `${sourceName}.ocrPolicy`),
    unitCheck: validateUnitCheck(raw.unitCheck, `${sourceName}.unitCheck`),
    roundingCheck: validateRoundingCheck(raw.roundingCheck, `${sourceName}.roundingCheck`),
    independentRecalculation: validateIndependentRecalculation(raw.independentRecalculation, `${sourceName}.independentRecalculation`),
    giiiRoutine: validateGiiiRoutine(raw.giiiRoutine, `${sourceName}.giiiRoutine`),
    releaseGate: validateReleaseGate(raw.releaseGate, `${sourceName}.releaseGate`),
    conceptNodeIds: assertIdArray(raw.conceptNodeIds, "conceptNodeIds", sourceName),
    sourceAnchorIds: assertIdArray(raw.sourceAnchorIds, "sourceAnchorIds", sourceName),
  };
  assertUnitBusinessRules(unit, sourceName);
  return unit;
}

function validateRegistry(raw: unknown): PracticeCalculationUnitRegistry {
  const sourceName = "appraiser_second_round_practice_calculation_units.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  if (!Array.isArray(raw.units)) throw new Error(`${sourceName}.units must be an array`);
  const units = raw.units.map((entry, index) => validateUnit(entry, index));
  assertUniqueStringIds(units.map((unit) => unit.id), sourceName);
  return {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(
      raw.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_practice_calculation_unit_registry"] as const,
    ),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_practice_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    coordination: validateCoordination(raw.coordination, sourceName),
    storagePolicy: validateStoragePolicy(raw.storagePolicy, sourceName),
    boundaryPolicy: validateBoundaryPolicy(raw.boundaryPolicy, sourceName),
    units,
  };
}

function countByCalculationType(units: PracticeCalculationUnitRecord[]): Record<PracticeCalculationType, number> {
  return SUPPORTED_CALCULATION_TYPES.reduce((counts, calculationType) => {
    counts[calculationType] = units.filter((unit) => unit.calculationType === calculationType).length;
    return counts;
  }, {} as Record<PracticeCalculationType, number>);
}

export function buildPracticeCalculationUnitReport(
  registry: PracticeCalculationUnitRegistry,
  config: PracticeCalculationUnitRegistryConfig = {},
): PracticeCalculationUnitReport {
  const units = [...registry.units].sort((left, right) => left.id.localeCompare(right.id));
  return {
    schemaVersion: registry.schemaVersion,
    reportType: "appraiser_second_round_practice_calculation_unit_report",
    generatedBy: "scripts/validate-practice-calculation-units.mjs",
    generatedAt: REPORT_GENERATED_AT,
    registryPath: config.registryPath ?? DEFAULT_REGISTRY_PATH,
    storagePolicy: registry.storagePolicy,
    coordination: registry.coordination,
    totals: {
      unitCount: units.length,
      supportedMetadataUnitCount: units.filter((unit) => unit.support.status === "supported_metadata_only").length,
      releaseAllowedUnitCount: units.filter((unit) => unit.releaseGate.releaseAllowed).length,
      blockedReleaseUnitCount: units.filter((unit) => !unit.releaseGate.releaseAllowed).length,
      ocrConfidenceGateCount: units.filter((unit) => unit.ocrPolicy.confidenceGateRequired).length,
      giiiRoutineCount: units.filter((unit) => unit.giiiRoutine.calculatorModel === "casio_fx_9860giii").length,
      sourceLevelOnlyUnitCount: units.filter((unit) => unit.releaseGate.reasonCodes.includes("source_level_validator_only")).length,
      calculationTypeCounts: countByCalculationType(units),
    },
    unitIds: units.map((unit) => unit.id),
    metadataOnly: true,
    safeUse: "s210_practice_calculation_unit_contract_only",
  };
}

export function loadPracticeCalculationUnitRegistry(
  config: PracticeCalculationUnitRegistryConfig = {},
): PracticeCalculationUnitRegistry {
  return validateRegistry(readJsonFile(resolveRepoPath(config.registryPath, DEFAULT_REGISTRY_PATH)));
}

export function loadPracticeCalculationUnitReport(
  config: PracticeCalculationUnitRegistryConfig = {},
): PracticeCalculationUnitReport {
  const registry = loadPracticeCalculationUnitRegistry(config);
  const reportPath = resolveRepoPath(config.reportPath, DEFAULT_REPORT_PATH);
  const raw = readJsonFile(reportPath);
  assertNoForbiddenRawFields(raw, "appraiser_second_round_practice_calculation_unit_report.json");
  const expected = buildPracticeCalculationUnitReport(registry, config);
  if (JSON.stringify(raw) !== JSON.stringify(expected)) {
    throw new Error("appraiser_second_round_practice_calculation_unit_report.json is stale or nondeterministic; regenerate it with check:practice-calculation-units -- --write-report");
  }
  return expected;
}
