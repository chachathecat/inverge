import { buildConceptNodeCandidate, type ConceptNodeCandidate } from "./concept-node-mapping";

export const CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX = "inverge.calculatorRoutine.draft.v1:";
export const CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY = "inverge.calculatorRoutine.completions.v1";
export const CALCULATOR_ROUTINE_HISTORY_LIMIT = 50;

export const CALCULATOR_ROUTINE_STEPS = [
  { id: "conditions", label: "조건 정리" },
  { id: "formula", label: "산식 선택" },
  { id: "numbers_units", label: "숫자/단위 확인" },
  { id: "casio_input", label: "CASIO 입력" },
  { id: "display_value", label: "화면값 확인" },
  { id: "answer_value", label: "답안 기재값 확인" },
  { id: "unit_rounding", label: "단위/반올림 확인" },
  { id: "verification", label: "검산 완료" },
  { id: "mistake_type", label: "실수 유형 저장" },
] as const;

export const CALCULATOR_ROUTINE_MISTAKE_OPTIONS = [
  { id: "condition_omission", label: "조건 누락" },
  { id: "formula_selection", label: "산식 선택 오류" },
  { id: "number_transcription", label: "숫자 옮김 오류" },
  { id: "unit_conversion", label: "단위 변환 오류" },
  { id: "casio_input", label: "CASIO 입력 오류" },
  { id: "display_reading", label: "화면값 판독 오류" },
  { id: "answer_transfer", label: "답안 기재값 옮김 오류" },
  { id: "rounding", label: "반올림 오류" },
  { id: "verification_skipped", label: "검산 누락" },
  { id: "none", label: "실수 없음" },
  { id: "other", label: "기타" },
] as const;

export const CALCULATOR_ROUTINE_VERIFICATION_OPTIONS = [
  { id: "reverse_calculation", label: "역산" },
  { id: "alternative_method", label: "다른 산식/방법으로 비교" },
  { id: "unit_check", label: "단위 검산" },
  { id: "magnitude_check", label: "금액·비율 크기 검산" },
  { id: "source_recheck", label: "원문 조건 재대조" },
  { id: "other", label: "기타" },
] as const;

const TEXT_STEP_IDS = [
  "conditions",
  "formula",
  "numbers_units",
  "casio_input",
  "display_value",
  "answer_value",
  "unit_rounding",
] as const;

const CALCULATOR_PLACEHOLDER_PATTERN = /확인(?:이)?\s*필요|검토(?:가)?\s*필요|계산기\s*입력\s*없음|입력\s*없음|해당\s*없음|없음/i;
const ARITHMETIC_OPERATOR_PATTERN = /[+\-−×*÷/=^]/;
const CALCULATOR_FORMULA_RELATION_PATTERN = /환원율|할인율|현가|복리|단가|평가액|시산가액|보정률|적용률|수익환원|직접환원|DCF/i;
const CALCULATOR_NUMBER_UNIT_PATTERN = /원|천원|만원|억원|%|㎡|m²|m2|평|배|년|개월/i;
const CALCULATOR_STEP_ACTION_PATTERN =
  /곱한다|곱하기|나눈다|나누|합산한다|합산|더한다|차감한다|차감|뺀다|환원한다|환원|할인한다|할인|보정률을?\s*적용|적용한다|단가를?\s*산정|산정한다|반올림한다|반올림|검산한다|검산|계산한다|계산합니다|계산해|계산 후|계산하여|대입한다|대입/i;
const GENERIC_CALCULATOR_FALLBACK_STEPS = ["MENU", "RUN-MAT", "계산식 입력", "EXE"] as const;
const GENERIC_CALCULATOR_KEYSTROKE_VALUES = new Set<string>(
  GENERIC_CALCULATOR_FALLBACK_STEPS.map((value) => value.normalize("NFKC").toUpperCase().replace(/\s+/g, "")),
);

export type CalculatorRoutineStepId = (typeof CALCULATOR_ROUTINE_STEPS)[number]["id"];
export type CalculatorRoutineStepDefinition = (typeof CALCULATOR_ROUTINE_STEPS)[number];
export type CalculatorRoutineTextStepId = (typeof TEXT_STEP_IDS)[number];
export type CalculatorRoutineMistakeType = (typeof CALCULATOR_ROUTINE_MISTAKE_OPTIONS)[number]["id"];
export type CalculatorRoutineVerificationMethod = (typeof CALCULATOR_ROUTINE_VERIFICATION_OPTIONS)[number]["id"];
export type CalculatorRoutineSource = "problem-snap" | "answer-review";
export type CalculatorRoutineExamMode = "first" | "second";

export type CalculatorRoutineRawEntries = Partial<Record<CalculatorRoutineTextStepId, string>> & {
  verification?: string;
  mistake_type?: string;
};

export type CalculatorRoutineDraftV1 = {
  version: 1;
  routineType: "calculator_routine";
  source: CalculatorRoutineSource;
  examMode: CalculatorRoutineExamMode;
  subject: string;
  routineId: string;
  currentStepId: CalculatorRoutineStepId;
  entries: CalculatorRoutineRawEntries;
  verificationMethods: CalculatorRoutineVerificationMethod[];
  mistakeTypes: CalculatorRoutineMistakeType[];
  hintUsedStepIds: CalculatorRoutineStepId[];
  stuckStepIds: CalculatorRoutineStepId[];
  startedAt: string;
  updatedAt: string;
};

export type CalculatorRoutineCompletionSignalV1 = {
  metadataOnly: true;
  version: 1;
  routineType: "calculator_routine";
  source: CalculatorRoutineSource;
  examMode: "second";
  subject: "감정평가실무";
  routineId: string;
  routineConceptCandidate: ConceptNodeCandidate;
  relatedConceptNodeId?: string;
  completedStepIds: CalculatorRoutineStepId[];
  stuckStepIds: CalculatorRoutineStepId[];
  mistakeTypes: CalculatorRoutineMistakeType[];
  primaryMistakeType: CalculatorRoutineMistakeType;
  verificationMethods: CalculatorRoutineVerificationMethod[];
  hintUsedStepIds: CalculatorRoutineStepId[];
  startedAt: string;
  completedAt: string;
  sourceStatus: "draft";
  needsOfficialVerification: true;
};

export type CalculatorRoutineEligibilityInput = {
  examMode: CalculatorRoutineExamMode | string;
  subject?: string | null;
  formulas?: string[];
  extractedNumbersAndUnits?: string[];
  stepByStepSolution?: string[];
  calculatorGuide?: {
    calculationPurpose?: string | null;
    recommendedMode?: string | null;
    keystrokeSteps?: string[];
    expectedDisplay?: string | null;
    answerRounding?: string | null;
    caution?: string | null;
  } | null;
  calculationContextText?: string;
};

export type CalculatorEvidenceSource =
  | "formula"
  | "number_unit"
  | "calculation_step"
  | "custom_keystroke"
  | "expected_display"
  | "answer_rounding";

export type CalculatorEvidenceAnalysis = {
  hasStrongSignal: boolean;
  evidenceSources: CalculatorEvidenceSource[];
  display: {
    calculationPurpose: string | null;
    recommendedMode: string | null;
    keystrokeSteps: string[];
    expectedDisplay: string | null;
    answerRounding: string | null;
    caution: string | null;
    formulas: string[];
    numberUnits: string[];
    calculationSteps: string[];
  };
  diagnostics: {
    purposeIsPlaceholderOrNegative: boolean;
    keystrokesAreGenericFallback: boolean;
  };
};

export type CalculatorRoutineEligibility = {
  eligible: boolean;
  manualEligible: boolean;
  hasStrongSignal: boolean;
  reason: "eligible" | "manual_practice" | "unsupported_context";
};

const stepIds = CALCULATOR_ROUTINE_STEPS.map((step) => step.id);
const textStepIds = new Set<CalculatorRoutineStepId>(TEXT_STEP_IDS);
const mistakeIds = new Set<string>(CALCULATOR_ROUTINE_MISTAKE_OPTIONS.map((option) => option.id));
const verificationIds = new Set<string>(CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.map((option) => option.id));

const uniqueKnownValues = <T extends string>(values: unknown, allowed: Set<string>): T[] => {
  if (!Array.isArray(values)) return [];
  const next: T[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !allowed.has(value) || next.includes(value as T)) continue;
    next.push(value as T);
  }
  return next;
};

const normalizeStepIds = (values: unknown) => uniqueKnownValues<CalculatorRoutineStepId>(values, new Set(stepIds));

export function getCalculatorRoutineDraftStorageKey(routineId: string) {
  return `${CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX}${routineId}`;
}

export function getCalculatorRoutineIdFromDraftStorageKey(storageKey?: string | null) {
  if (!storageKey?.startsWith(CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX)) return null;
  return storageKey.slice(CALCULATOR_ROUTINE_SESSION_STORAGE_PREFIX.length) || null;
}

export function getCalculatorRoutineMistakeLabel(mistakeType: CalculatorRoutineMistakeType) {
  return CALCULATOR_ROUTINE_MISTAKE_OPTIONS.find((option) => option.id === mistakeType)?.label ?? "기타";
}

function normalizeCalculatorCopyKey(value?: string | null) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/casio|카시오/g, "계산기")
    .replace(/계산기[는은이가을를]?/g, "계산기")
    .replace(/사용[은이가을를]?/g, "사용")
    .replace(/입력[은이가을를]?/g, "입력")
    .replace(/타건[은이가을를]?/g, "타건");
}

function normalizeDisplayText(value?: string | null) {
  const normalized = value?.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function normalizeKeystrokeToken(value: string) {
  return value.normalize("NFKC").toUpperCase().replace(/\s+/g, "");
}

export function isNegativeCalculatorSignal(value?: string | null) {
  const normalized = normalizeCalculatorCopyKey(value);

  const bareNoUseMarkers = [
    "불필요",
    "미사용",
    "필요없음",
    "필요하지않",
    "사용하지않",
    "사용안함",
    "안씀",
    "안씁",
    "쓰지않",
    "입력하지않",
    "입력안함",
    "타건하지않",
    "타건안함",
    "없이풉",
  ];
  if (bareNoUseMarkers.some((marker) => normalized.includes(marker))) return true;

  return [
    "계산기불필요",
    "계산기사용불필요",
    "계산기입력불필요",
    "계산기미사용",
    "계산기필요없음",
    "계산기사용필요없음",
    "계산기입력필요없음",
    "계산기필요하지않",
    "계산기사용필요하지않",
    "계산기입력필요하지않",
    "계산기사용하지않",
    "계산기사용안함",
    "계산기안씀",
    "계산기안씁",
    "계산기쓰지않",
    "계산기입력하지않",
    "계산기입력안함",
    "계산기타건하지않",
    "계산기타건안함",
    "계산기없이",
  ].some((marker) => normalized.includes(marker));
}

export function isMeaningfulCalculatorSignal(value?: string | null) {
  const normalized = normalizeDisplayText(value);
  if (!normalized) return false;
  if (isNegativeCalculatorSignal(normalized)) return false;
  return !CALCULATOR_PLACEHOLDER_PATTERN.test(normalized);
}

export function getDisplayCalculatorText(value?: string | null) {
  const normalized = normalizeDisplayText(value);
  if (!normalized || !isMeaningfulCalculatorSignal(normalized)) return null;
  return normalized;
}

export function getDisplayCalculatorHintValues(values?: Array<string | null | undefined> | null) {
  return (values ?? [])
    .map((value) => getDisplayCalculatorText(value))
    .filter((value): value is string => Boolean(value));
}

export function isGenericCalculatorFallbackStepSequence(values?: string[] | null) {
  if (!values || values.length !== GENERIC_CALCULATOR_FALLBACK_STEPS.length) return false;
  return values.every((value, index) => normalizeKeystrokeToken(value) === normalizeKeystrokeToken(GENERIC_CALCULATOR_FALLBACK_STEPS[index]));
}

export function getDisplayCalculatorKeystrokes(values?: string[] | null) {
  if (!values || isGenericCalculatorFallbackStepSequence(values)) return [];
  return values
    .map((value) => normalizeDisplayText(value))
    .filter((value): value is string => Boolean(value))
    .filter((value) => isMeaningfulCalculatorSignal(value) && !GENERIC_CALCULATOR_KEYSTROKE_VALUES.has(normalizeKeystrokeToken(value)));
}

export function getMeaningfulCalculatorKeystrokeSteps(values?: string[] | null) {
  return getDisplayCalculatorKeystrokes(values);
}

export function hasMeaningfulCalculatorKeystrokeSignal(values?: string[] | null) {
  return getDisplayCalculatorKeystrokes(values).length > 0;
}

function hasDigit(value: string) {
  return /\d/.test(value.normalize("NFKC"));
}

function hasArithmeticOperator(value: string) {
  return ARITHMETIC_OPERATOR_PATTERN.test(value.normalize("NFKC"));
}

function hasCalculationUnit(value: string) {
  return CALCULATOR_NUMBER_UNIT_PATTERN.test(value.normalize("NFKC"));
}

function cleanEvidenceValues(values: string[] | undefined, predicate: (value: string) => boolean) {
  return (values ?? [])
    .map((value) => normalizeDisplayText(value))
    .filter((value): value is string => Boolean(value))
    .filter(predicate);
}

function isConcreteFormulaEvidence(value: string) {
  if (!isMeaningfulCalculatorSignal(value)) return false;
  return (
    hasArithmeticOperator(value) ||
    CALCULATOR_FORMULA_RELATION_PATTERN.test(value) ||
    (hasDigit(value) && hasCalculationUnit(value))
  );
}

function isConcreteNumberUnitEvidence(value: string) {
  if (!isMeaningfulCalculatorSignal(value) || !hasDigit(value)) return false;
  return hasArithmeticOperator(value) || hasCalculationUnit(value);
}

function isConcreteCalculationStepEvidence(value: string) {
  if (!isMeaningfulCalculatorSignal(value)) return false;
  return CALCULATOR_STEP_ACTION_PATTERN.test(value);
}

function uniqueEvidenceSources(sources: CalculatorEvidenceSource[]) {
  return sources.filter((source, index) => sources.indexOf(source) === index);
}

export function analyzeCalculatorEvidence(input: {
  formulas?: string[];
  extractedNumbersAndUnits?: string[];
  stepByStepSolution?: string[];
  calculatorGuide?: CalculatorRoutineEligibilityInput["calculatorGuide"];
  calculationContextText?: string;
}): CalculatorEvidenceAnalysis {
  const formulaValues = cleanEvidenceValues(input.formulas, isConcreteFormulaEvidence);
  const numberUnitValues = cleanEvidenceValues(input.extractedNumbersAndUnits, isConcreteNumberUnitEvidence);
  const calculationStepValues = cleanEvidenceValues(input.stepByStepSolution, isConcreteCalculationStepEvidence);
  const context = normalizeDisplayText(input.calculationContextText);

  if (context) {
    if (isConcreteFormulaEvidence(context)) formulaValues.push(context);
    if (isConcreteNumberUnitEvidence(context)) numberUnitValues.push(context);
    if (isConcreteCalculationStepEvidence(context)) calculationStepValues.push(context);
  }

  const guide = input.calculatorGuide;
  const calculationPurpose = getDisplayCalculatorText(guide?.calculationPurpose);
  const expectedDisplay = getDisplayCalculatorText(guide?.expectedDisplay);
  const answerRounding = getDisplayCalculatorText(guide?.answerRounding);
  const caution = normalizeDisplayText(guide?.caution);
  const keystrokeSteps = getDisplayCalculatorKeystrokes(guide?.keystrokeSteps);
  const evidenceSources = uniqueEvidenceSources([
    ...(formulaValues.length > 0 ? ["formula" as const] : []),
    ...(numberUnitValues.length > 0 ? ["number_unit" as const] : []),
    ...(calculationStepValues.length > 0 ? ["calculation_step" as const] : []),
    ...(keystrokeSteps.length > 0 ? ["custom_keystroke" as const] : []),
    ...(expectedDisplay ? ["expected_display" as const] : []),
    ...(answerRounding ? ["answer_rounding" as const] : []),
  ]);
  const hasStrongSignal = evidenceSources.length > 0;
  const recommendedMode = hasStrongSignal ? getDisplayCalculatorText(guide?.recommendedMode) : null;

  return {
    hasStrongSignal,
    evidenceSources,
    display: {
      calculationPurpose,
      recommendedMode,
      keystrokeSteps,
      expectedDisplay,
      answerRounding,
      caution,
      formulas: formulaValues,
      numberUnits: numberUnitValues,
      calculationSteps: calculationStepValues,
    },
    diagnostics: {
      purposeIsPlaceholderOrNegative: Boolean(guide?.calculationPurpose) && !calculationPurpose,
      keystrokesAreGenericFallback: isGenericCalculatorFallbackStepSequence(guide?.keystrokeSteps),
    },
  };
}

export function hasStrongCalculatorGuideSignal(guide?: CalculatorRoutineEligibilityInput["calculatorGuide"] | null) {
  return analyzeCalculatorEvidence({ calculatorGuide: guide }).hasStrongSignal;
}

export function shouldUnlockProblemSnapCalculatorReference(input: {
  routineAvailable: boolean;
  routineReferenceUnlocked?: boolean;
  retryMemo?: string | null;
}) {
  if (input.routineAvailable) return Boolean(input.routineReferenceUnlocked);
  return Boolean(input.retryMemo?.trim());
}

export function hasStrongCalculatorRoutineSignal(input: Pick<
  CalculatorRoutineEligibilityInput,
  "formulas" | "extractedNumbersAndUnits" | "stepByStepSolution" | "calculatorGuide" | "calculationContextText"
>) {
  return analyzeCalculatorEvidence(input).hasStrongSignal;
}

export function normalizeCalculatorRoutineMistakeTypes(values: unknown): CalculatorRoutineMistakeType[] {
  const normalized = uniqueKnownValues<CalculatorRoutineMistakeType>(values, mistakeIds);
  if (normalized.includes("none")) return ["none"];
  return normalized.filter((value) => value !== "none");
}

export function normalizeCalculatorRoutineVerificationMethods(values: unknown): CalculatorRoutineVerificationMethod[] {
  return uniqueKnownValues<CalculatorRoutineVerificationMethod>(values, verificationIds);
}

export function createCalculatorRoutineDraft(input: {
  source: CalculatorRoutineSource;
  examMode: CalculatorRoutineExamMode;
  subject: string;
  routineId?: string;
  now?: string;
}): CalculatorRoutineDraftV1 {
  const now = input.now ?? new Date().toISOString();
  return {
    version: 1,
    routineType: "calculator_routine",
    source: input.source,
    examMode: input.examMode,
    subject: input.subject,
    routineId: input.routineId ?? `calculator-routine-${Date.now()}`,
    currentStepId: "conditions",
    entries: {},
    verificationMethods: [],
    mistakeTypes: [],
    hintUsedStepIds: [],
    stuckStepIds: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function updateCalculatorRoutineDraftStep(
  draft: CalculatorRoutineDraftV1,
  stepId: CalculatorRoutineStepId,
  value: string,
  now = new Date().toISOString(),
): CalculatorRoutineDraftV1 {
  if (!textStepIds.has(stepId)) return { ...draft, updatedAt: now };
  const stuckStepIds = value.trim()
    ? draft.stuckStepIds.filter((item) => item !== stepId)
    : draft.stuckStepIds;
  return {
    ...draft,
    entries: { ...draft.entries, [stepId]: value },
    stuckStepIds,
    updatedAt: now,
  };
}

export function updateCalculatorRoutineDraftCurrentStep(
  draft: CalculatorRoutineDraftV1,
  stepId: CalculatorRoutineStepId,
  now = new Date().toISOString(),
): CalculatorRoutineDraftV1 {
  return { ...draft, currentStepId: stepId, updatedAt: now };
}

export function isCalculatorRoutineStepComplete(draft: CalculatorRoutineDraftV1, stepId: CalculatorRoutineStepId) {
  if (textStepIds.has(stepId)) {
    const value = draft.entries[stepId as CalculatorRoutineTextStepId]?.trim();
    return Boolean(value) || draft.stuckStepIds.includes(stepId);
  }
  if (stepId === "verification") return normalizeCalculatorRoutineVerificationMethods(draft.verificationMethods).length > 0;
  if (stepId === "mistake_type") return normalizeCalculatorRoutineMistakeTypes(draft.mistakeTypes).length > 0;
  return false;
}

export function getNextCalculatorRoutineStep(draft: CalculatorRoutineDraftV1) {
  return CALCULATOR_ROUTINE_STEPS.find((step) => !isCalculatorRoutineStepComplete(draft, step.id))?.id ?? "mistake_type";
}

export function getCalculatorRoutineProgress(draft: CalculatorRoutineDraftV1) {
  const completedStepIds = CALCULATOR_ROUTINE_STEPS
    .filter((step) => isCalculatorRoutineStepComplete(draft, step.id))
    .map((step) => step.id);
  return {
    completedStepIds,
    completedCount: completedStepIds.length,
    totalCount: CALCULATOR_ROUTINE_STEPS.length,
    nextStepId: getNextCalculatorRoutineStep(draft),
    isComplete: completedStepIds.length === CALCULATOR_ROUTINE_STEPS.length,
  };
}

export function buildCalculatorRoutineCompletionSignal(
  draft: CalculatorRoutineDraftV1,
  completedAt = new Date().toISOString(),
): CalculatorRoutineCompletionSignalV1 {
  const progress = getCalculatorRoutineProgress(draft);
  if (!progress.isComplete) throw new Error("calculator-routine-incomplete");
  if (draft.examMode !== "second" || draft.subject !== "감정평가실무") {
    throw new Error("calculator-routine-unsupported-context");
  }

  const mistakeTypes = normalizeCalculatorRoutineMistakeTypes(draft.mistakeTypes);
  const primaryMistakeType = mistakeTypes[0];
  if (!primaryMistakeType) throw new Error("calculator-routine-missing-mistake-type");

  const verificationMethods = normalizeCalculatorRoutineVerificationMethods(draft.verificationMethods);
  if (verificationMethods.length === 0) throw new Error("calculator-routine-missing-verification-method");

  const routineConceptCandidate = buildConceptNodeCandidate({
    mode: "second",
    subject: "감정평가실무",
    conceptFamily: "검산/CASIO",
    mistakeType: getCalculatorRoutineMistakeLabel(primaryMistakeType),
  });

  return sanitizeCalculatorRoutineCompletionSignal({
    metadataOnly: true,
    version: 1,
    routineType: "calculator_routine",
    source: draft.source,
    examMode: "second",
    subject: "감정평가실무",
    routineId: draft.routineId,
    routineConceptCandidate,
    completedStepIds: progress.completedStepIds,
    stuckStepIds: normalizeStepIds(draft.stuckStepIds),
    mistakeTypes,
    primaryMistakeType,
    verificationMethods,
    hintUsedStepIds: normalizeStepIds(draft.hintUsedStepIds),
    startedAt: draft.startedAt,
    completedAt,
    sourceStatus: "draft",
    needsOfficialVerification: true,
  });
}

export function sanitizeCalculatorRoutineCompletionSignal(
  signal: CalculatorRoutineCompletionSignalV1,
): CalculatorRoutineCompletionSignalV1 {
  const mistakeTypes = normalizeCalculatorRoutineMistakeTypes(signal.mistakeTypes);
  const verificationMethods = normalizeCalculatorRoutineVerificationMethods(signal.verificationMethods);
  const primaryMistakeType = mistakeTypes.includes(signal.primaryMistakeType)
    ? signal.primaryMistakeType
    : mistakeTypes[0] ?? "other";
  const routineConceptCandidate = buildConceptNodeCandidate({
    mode: "second",
    subject: "감정평가실무",
    conceptFamily: "검산/CASIO",
    mistakeType: getCalculatorRoutineMistakeLabel(primaryMistakeType),
  });

  return {
    metadataOnly: true,
    version: 1,
    routineType: "calculator_routine",
    source: signal.source === "answer-review" ? "answer-review" : "problem-snap",
    examMode: "second",
    subject: "감정평가실무",
    routineId: typeof signal.routineId === "string" && signal.routineId.trim() ? signal.routineId : "calculator-routine",
    routineConceptCandidate,
    relatedConceptNodeId: typeof signal.relatedConceptNodeId === "string" ? signal.relatedConceptNodeId : undefined,
    completedStepIds: normalizeStepIds(signal.completedStepIds),
    stuckStepIds: normalizeStepIds(signal.stuckStepIds),
    mistakeTypes,
    primaryMistakeType,
    verificationMethods,
    hintUsedStepIds: normalizeStepIds(signal.hintUsedStepIds),
    startedAt: typeof signal.startedAt === "string" ? signal.startedAt : new Date(0).toISOString(),
    completedAt: typeof signal.completedAt === "string" ? signal.completedAt : new Date().toISOString(),
    sourceStatus: "draft",
    needsOfficialVerification: true,
  };
}

export function serializeCalculatorRoutineDraftForSession(draft: CalculatorRoutineDraftV1) {
  return JSON.stringify(draft);
}

export function parseCalculatorRoutineDraftFromSession(raw: string | null): CalculatorRoutineDraftV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CalculatorRoutineDraftV1>;
    if (parsed.version !== 1 || parsed.routineType !== "calculator_routine") return null;
    if (parsed.source !== "problem-snap" && parsed.source !== "answer-review") return null;
    if (parsed.examMode !== "first" && parsed.examMode !== "second") return null;
    if (typeof parsed.subject !== "string" || typeof parsed.routineId !== "string") return null;
    const currentStepId = stepIds.includes(parsed.currentStepId as CalculatorRoutineStepId)
      ? (parsed.currentStepId as CalculatorRoutineStepId)
      : "conditions";
    const entries: CalculatorRoutineRawEntries = {};
    if (parsed.entries && typeof parsed.entries === "object") {
      for (const stepId of TEXT_STEP_IDS) {
        const value = parsed.entries[stepId];
        if (typeof value === "string") entries[stepId] = value;
      }
      if (typeof parsed.entries.verification === "string") entries.verification = parsed.entries.verification;
      if (typeof parsed.entries.mistake_type === "string") entries.mistake_type = parsed.entries.mistake_type;
    }
    return {
      version: 1,
      routineType: "calculator_routine",
      source: parsed.source,
      examMode: parsed.examMode,
      subject: parsed.subject,
      routineId: parsed.routineId,
      currentStepId,
      entries,
      verificationMethods: normalizeCalculatorRoutineVerificationMethods(parsed.verificationMethods),
      mistakeTypes: normalizeCalculatorRoutineMistakeTypes(parsed.mistakeTypes),
      hintUsedStepIds: normalizeStepIds(parsed.hintUsedStepIds),
      stuckStepIds: normalizeStepIds(parsed.stuckStepIds),
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : new Date().toISOString(),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function parseCalculatorRoutineCompletionHistory(raw: string | null): CalculatorRoutineCompletionSignalV1[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        try {
          return sanitizeCalculatorRoutineCompletionSignal(item as CalculatorRoutineCompletionSignalV1);
        } catch {
          return null;
        }
      })
      .filter((item): item is CalculatorRoutineCompletionSignalV1 => Boolean(item))
      .slice(0, CALCULATOR_ROUTINE_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function appendCalculatorRoutineCompletionSignal(
  history: CalculatorRoutineCompletionSignalV1[],
  signal: CalculatorRoutineCompletionSignalV1,
  limit = CALCULATOR_ROUTINE_HISTORY_LIMIT,
) {
  const sanitized = sanitizeCalculatorRoutineCompletionSignal(signal);
  return [
    sanitized,
    ...history
      .filter((item) => item.routineId !== sanitized.routineId)
      .map((item) => sanitizeCalculatorRoutineCompletionSignal(item)),
  ].slice(0, limit);
}

export function serializeCalculatorRoutineCompletionHistoryForLocalStorage(history: CalculatorRoutineCompletionSignalV1[]) {
  return JSON.stringify(history.map((item) => sanitizeCalculatorRoutineCompletionSignal(item)).slice(0, CALCULATOR_ROUTINE_HISTORY_LIMIT));
}

export function getCalculatorRoutineEligibility(input: CalculatorRoutineEligibilityInput): CalculatorRoutineEligibility {
  if (input.examMode !== "second" || input.subject !== "감정평가실무") {
    return { eligible: false, manualEligible: false, hasStrongSignal: false, reason: "unsupported_context" };
  }

  const hasStrongSignal = hasStrongCalculatorRoutineSignal(input);

  if (hasStrongSignal) return { eligible: true, manualEligible: true, hasStrongSignal: true, reason: "eligible" };
  return { eligible: false, manualEligible: true, hasStrongSignal: false, reason: "manual_practice" };
}
