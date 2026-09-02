import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import { buildAnswerReviewQualityView } from "../evaluate/answer-review-quality";
import {
  buildCapturePersistenceMetadata,
  type CaptureSaveOperationBinding,
} from "../review-os/capture-persistence-controller";
import { getAnswerReviewInputQualityIssue } from "../review-os/learning-signal";
import type { FailureAwarePersistenceEvidence } from "../review-os/failure-aware-state";
import type {
  WrongAnswerDetail,
  WrongAnswerItemInput,
} from "../review-os/types";

export const APP1_CONTRACT_VERSION = "OwnerCaptureToRepairVerticalV1" as const;

export const APP1_LIMITS = Object.freeze({
  maximumSummaryCharacters: 220,
  maximumGapCharacters: 180,
  maximumRepairCharacters: 4_000,
  minimumRepairCharacters: 20,
  maximumDetectedSections: 4,
  callerOverride: false,
} as const);

export const APP1_VERIFICATION_STATES = Object.freeze([
  "repair_confirmed_for_this_session",
  "one_connection_still_missing",
  "guided_path_needed",
  "deferred",
  "blocked_by_ocr_or_source_uncertainty",
] as const);

export type App1VerificationState = (typeof APP1_VERIFICATION_STATES)[number];

export async function executeApp1ResumableArtifactPlanV1<TUsageEvent>(
  input: Readonly<{
    usageEvents: readonly TUsageEvent[];
    ensureRecurrence: () => Promise<"saved" | "deduped">;
    ensureNote: () => Promise<"saved" | "deduped">;
    ensureTag: () => Promise<"saved" | "deduped">;
    ensureUsage: (event: TUsageEvent) => Promise<"saved" | "deduped">;
    ensureQueue: () => Promise<"saved" | "deduped">;
    ensureLearningSignal: () => Promise<"saved" | "deduped">;
  }>,
) {
  let savedCount = 0;
  const run = async (operation: () => Promise<"saved" | "deduped">) => {
    if ((await operation()) === "saved") savedCount += 1;
  };
  await run(input.ensureRecurrence);
  await run(input.ensureNote);
  await run(input.ensureTag);
  for (const event of input.usageEvents) {
    await run(() => input.ensureUsage(event));
  }
  await run(input.ensureQueue);
  await run(input.ensureLearningSignal);
  return Object.freeze({ savedCount });
}

export type App1TrustedRepairSubject =
  | "appraisal_practical"
  | "appraisal_theory"
  | "appraisal_law";

const APP1_SUBJECT_ACCESS: Readonly<Record<string, App1TrustedRepairSubject>> =
  Object.freeze({
    감정평가실무: "appraisal_practical",
    감정평가이론: "appraisal_theory",
    "감정평가 및 보상법규": "appraisal_law",
  });

export function isApp1SubjectAuthorized(
  subjectLabel: string,
  authorizedSubjects: readonly App1TrustedRepairSubject[],
) {
  const requiredSubject = APP1_SUBJECT_ACCESS[subjectLabel];
  return Boolean(
    requiredSubject && authorizedSubjects.includes(requiredSubject),
  );
}

export function isClientAuthoredApp1PersistenceCandidate(
  input: WrongAnswerItemInput,
) {
  const fields = input.extractionPayload?.user_confirmed_fields;
  return Boolean(
    fields &&
      typeof fields === "object" &&
      !Array.isArray(fields) &&
      Object.keys(fields).some((key) => key.startsWith("app1_")),
  );
}

export type App1StructureSummary = Readonly<{
  subject: string;
  detectedSections: readonly string[];
  pageOrSectionCount: number;
  ocrConfirmed: boolean;
  uncertainty: string | null;
}>;

export type App1PrimaryGap = Readonly<{
  subject: string;
  anchor: string;
  anchorKind: "exact" | "bounded_section" | "unavailable";
  alreadySuccessful: string;
  gap: string;
  whyItMatters: string;
  repairAction: string;
  expectedMinutes: number;
}>;

export type App1RepairVerification = Readonly<{
  state: App1VerificationState;
  requestedGap: string;
  observedGap: string | null;
  reason: string;
  sameSessionOnly: true;
  masteryCreated: false;
  transferCreated: false;
}>;

export type App1NextReviewReceipt = Readonly<{
  queueId: string;
  itemId: string;
  dueAt: string;
  policyWindow: "D+1" | "later_transfer" | "timed_work" | "independent_review";
  nextIndependentAction: string;
}>;

export const APP1_RUNTIME_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: APP1_CONTRACT_VERSION,
  ownerOnly: true,
  defaultOff: true,
  publicNavigation: false,
  existingCaptureOcrApiOnly: true,
  existingAnswerReviewApiOnly: true,
  existingLearnerPersistenceApiOnly: true,
  newApi: false,
  newDatabaseOrMigration: false,
  newProviderRouting: false,
  paymentActivation: false,
  productionActivation: false,
  sameSessionMasteryAuthority: false,
  transferAuthority: false,
} as const);

type PlainRecord = Readonly<Record<string, unknown>>;

function record(value: unknown): PlainRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  return value as PlainRecord;
}

function scalarText(
  value: unknown,
  maximum: number = APP1_LIMITS.maximumSummaryCharacters,
) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

export function canonicalizeApp1RepairBody(value: string) {
  return value.replace(/\r\n?/gu, "\n").trim();
}

function learnerBodyText(value: unknown) {
  if (typeof value !== "string") return null;
  return canonicalizeApp1RepairBody(value);
}

const APP1_PERSISTED_ANSWER_PLACEHOLDERS = new Set(["-", "–", "—"]);

function substantiveLearnerBodyText(value: unknown) {
  const normalized = learnerBodyText(value);
  if (normalized === null || APP1_PERSISTED_ANSWER_PLACEHOLDERS.has(normalized)) {
    return null;
  }
  return normalized;
}

function selectSubstantivePersistedLearnerBody(input: Readonly<{
  userAnswer?: unknown;
  rawAnswerText?: unknown;
  rewriteParagraph?: unknown;
  rawPayload?: unknown;
}>) {
  const rawPayload = record(input.rawPayload);
  const persistedRewriteParagraph =
    substantiveLearnerBodyText(input.rewriteParagraph) ??
    substantiveLearnerBodyText(rawPayload?.rewrite_paragraph);
  const candidates = [
    substantiveLearnerBodyText(input.userAnswer),
    substantiveLearnerBodyText(input.rawAnswerText),
    persistedRewriteParagraph,
  ];
  return candidates.find((candidate) => candidate) ?? "";
}

function exactConfirmedFields(detail: WrongAnswerDetail) {
  const rawPayload = record(detail.item.rawPayload);
  return record(rawPayload?.user_confirmed_fields);
}

function positiveSafeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

export function getApp1LearnerAnswer(detail: WrongAnswerDetail) {
  return selectSubstantivePersistedLearnerBody(detail.item);
}

export function isApp1InitialAnalysisEligible(input: Readonly<{
  questionText: string;
  answerText: string;
  referenceText?: string;
  sourceType?: string;
  ocrConfirmedByLearner?: boolean;
  lowConfidenceFlag?: boolean;
  hasManualCorrection?: boolean;
}>) {
  const requiresExplicitOcrConfirmation = ["photo", "image", "pdf"].includes(
    input.sourceType ?? "text",
  );
  if (
    (requiresExplicitOcrConfirmation && input.ocrConfirmedByLearner !== true) ||
    (input.lowConfidenceFlag === true && input.hasManualCorrection !== true)
  ) {
    return false;
  }
  return (
    getAnswerReviewInputQualityIssue({
      questionText: input.questionText,
      answerText: input.answerText,
      referenceText: input.referenceText ?? "",
      questionFileCount: 0,
      answerFileCount: 0,
      referenceFileCount: 0,
    }) === null
  );
}

export function isApp1PersistedInitialAnalysisEligible(input: Readonly<{
  subjectLabel?: unknown;
  sourceType?: unknown;
  problemTitle?: unknown;
  rawQuestionText?: unknown;
  rawAnswerText?: unknown;
  userAnswer?: unknown;
  rewriteParagraph?: unknown;
  correctAnswer?: unknown;
  rawPayload?: unknown;
}>) {
  if (
    typeof input.subjectLabel !== "string" ||
    typeof input.sourceType !== "string" ||
    typeof input.correctAnswer !== "string"
  ) {
    return false;
  }
  const learnerAnswer = selectSubstantivePersistedLearnerBody(input);
  const rawPayload = record(input.rawPayload);
  const fields = record(rawPayload?.user_confirmed_fields);
  if (
    !fields ||
    fields.examMode !== "second" ||
    fields.subject !== input.subjectLabel ||
    fields.sourceType !== input.sourceType ||
    typeof fields.ocrConfirmedByLearner !== "boolean" ||
    typeof fields.lowConfidenceFlag !== "boolean" ||
    typeof fields.hasManualCorrection !== "boolean"
  ) {
    return false;
  }
  return isApp1InitialAnalysisEligible({
    questionText:
      typeof input.rawQuestionText === "string"
        ? input.rawQuestionText
        : typeof input.problemTitle === "string"
          ? input.problemTitle
          : "",
    answerText: learnerAnswer,
    referenceText: input.correctAnswer === "-" ? "" : input.correctAnswer,
    sourceType: input.sourceType,
    ocrConfirmedByLearner: fields.ocrConfirmedByLearner,
    lowConfidenceFlag: fields.lowConfidenceFlag,
    hasManualCorrection: fields.hasManualCorrection,
  });
}

export function buildApp1StructureSummary(
  detail: WrongAnswerDetail,
): App1StructureSummary {
  const fields = exactConfirmedFields(detail);
  const answer = getApp1LearnerAnswer(detail);
  const problem = scalarText(
    detail.item.rawQuestionText ?? detail.item.problemTitle,
    APP1_LIMITS.maximumSummaryCharacters,
  );
  const sections = [
    problem ? "문제" : "",
    answer ? "학습자 답안" : "",
    scalarText(detail.item.coreFormula) ? "계산·작업 메모" : "",
    scalarText(detail.item.issueRecall ?? detail.item.outlineDraft) ? "구조 메모" : "",
  ]
    .filter(Boolean)
    .slice(0, APP1_LIMITS.maximumDetectedSections);
  const sourceType = detail.item.sourceType;
  const requiresExplicitOcrConfirmation = ["photo", "image", "pdf"].includes(
    sourceType,
  );
  const ocrConfirmed =
    !requiresExplicitOcrConfirmation || fields?.ocrConfirmedByLearner === true;
  const unresolvedLowConfidence =
    fields?.lowConfidenceFlag === true && fields?.hasManualCorrection !== true;
  const recordedCount = positiveSafeInteger(fields?.pageCount);
  const paragraphCount = answer
    ? answer
        .split(/\n\s*\n/gu)
        .map((value) => value.trim())
        .filter(Boolean).length
    : 0;
  const pageOrSectionCount = recordedCount ?? Math.max(paragraphCount, sections.length, 1);
  const uncertainty = !ocrConfirmed
    ? "OCR 확인 영수증이 없습니다. 원문을 다시 확인해야 합니다."
    : unresolvedLowConfidence
      ? "낮은 신뢰도의 OCR 구간이 기록되었습니다. 분석 전에 원문과 다시 대조해 주세요."
      : answer
        ? null
        : "학습자 답안 본문이 없어 분석할 수 없습니다.";

  return Object.freeze({
    subject: scalarText(detail.item.subjectLabel),
    detectedSections: Object.freeze(sections),
    pageOrSectionCount,
    ocrConfirmed,
    uncertainty,
  });
}

function resolveAnchor(detail: WrongAnswerDetail): Pick<
  App1PrimaryGap,
  "anchor" | "anchorKind"
> {
  const fields = exactConfirmedFields(detail);
  const exactAnchor = scalarText(
    fields?.exact_anchor ?? fields?.answer_anchor ?? fields?.calculation_step_anchor,
    160,
  );
  if (exactAnchor) return { anchor: exactAnchor, anchorKind: "exact" };

  const pageCount = positiveSafeInteger(fields?.pageCount);
  const answer = getApp1LearnerAnswer(detail);
  if (answer) {
    return {
      anchor: pageCount
        ? `확인된 ${pageCount}페이지 답안 전체 · 세부 위치 미확인`
        : "확인된 학습자 답안 전체 · 세부 위치 미확인",
      anchorKind: "unavailable",
    };
  }
  return {
    anchor: "정확 위치 미확인 · 원문과 직접 대조 필요",
    anchorKind: "unavailable",
  };
}

function expectedMinutes(subject: string) {
  if (subject.includes("실무")) return 12;
  if (subject.includes("법규")) return 10;
  return 8;
}

export function buildApp1PrimaryGap(
  detail: WrongAnswerDetail,
  draft: AnswerReviewStructureDraft,
): App1PrimaryGap {
  const quality = buildAnswerReviewQualityView(draft);
  const anchor = resolveAnchor(detail);
  return Object.freeze({
    subject: scalarText(detail.item.subjectLabel),
    ...anchor,
    alreadySuccessful:
      scalarText(draft.strengths[0], APP1_LIMITS.maximumGapCharacters) ||
      "학습자 답안과 확인된 입력이 분석에 포함되었습니다.",
    gap: scalarText(quality.primaryFix.gap, APP1_LIMITS.maximumGapCharacters),
    whyItMatters: scalarText(
      quality.primaryFix.whyItMatters,
      APP1_LIMITS.maximumGapCharacters,
    ),
    repairAction: scalarText(
      quality.primaryFix.howToFix || quality.nextAction,
      APP1_LIMITS.maximumGapCharacters,
    ),
    expectedMinutes: expectedMinutes(detail.item.subjectLabel),
  });
}

function normalizedIdentity(value: string) {
  return value.normalize("NFKC").replace(/[^0-9A-Za-z가-힣]+/gu, "").toLowerCase();
}

type App1RepairTargetFacet =
  | "evidence_subject"
  | "authority_or_reason"
  | "linkage"
  | "conclusion_scope"
  | "calculation"
  | "structure";

const APP1_REPAIR_TARGET_FACETS: Readonly<
  Record<App1RepairTargetFacet, readonly string[]>
> = Object.freeze({
  evidence_subject: Object.freeze(["사례", "사실", "사안", "조건", "자료"]),
  authority_or_reason: Object.freeze([
    "논거",
    "요건",
    "기준",
    "근거",
    "법리",
    "규범",
    "조문",
    "정의",
  ]),
  linkage: Object.freeze(["연결", "연계", "결부", "적용", "대입", "이어", "관계"]),
  conclusion_scope: Object.freeze(["결론", "판단", "범위", "한정"]),
  calculation: Object.freeze([
    "계산",
    "산식",
    "수식",
    "단위",
    "수치",
    "검산",
    "부호",
    "반올림",
  ]),
  structure: Object.freeze(["문단", "목차", "구조", "순서"]),
});

const APP1_REPAIR_ACTION_ROOTS = Object.freeze([
  "충족",
  "도출",
  "보강",
  "설명",
  "완료",
  "바로잡",
  "재작성",
  "재구성",
  "완성",
  "명시",
  "확인",
] as const);
const APP1_REPAIR_UNRESOLVED_CUES = Object.freeze([
  "부족하",
  "미흡하",
  "약하",
  "누락되어있",
  "누락된채",
  "빠져",
  "불충분하",
  "오류가남",
  "오류를남",
  "오류로",
  "오인하여",
  "오인해서",
  "잘못명시",
  "잘못확인",
  "착오로명시",
  "부정확하게",
  "틀리게",
  "틀린채",
  "틀렸",
  "여전히",
  "남아",
  "아직",
] as const);
const APP1_REPAIR_UNRESOLVED_METACOMMENTARY = Object.freeze([
  "아직연결하지않",
  "아직보강하지않",
  "충분히보강하지못",
  "연결하지못",
  "보강하지못",
  "오류가여전히남아",
  "오류가남아",
  "추가설명이필요",
  "설명이필요",
  "보강이필요",
  "수정이필요",
  "연결이필요",
  "완성이필요",
  "추가설명해야",
  "추가보강해야",
  "다시연결해야",
  "더설명해야",
  "보완해야",
  "수정해야",
  "보강되어야",
  "연결되어야",
  "수정되어야",
  "완성되어야",
  "결론을완성하지못",
  "완성하지못",
] as const);
const APP1_REPAIR_SUBSTANTIVE_NEGATIVE_PREDICATES = Object.freeze([
  "충족하지않",
  "해당하지않",
  "성립하지않",
  "적용되지않",
] as const);
const APP1_REPAIR_SUBSTANTIVE_AFFIRMATIVE_PREDICATES = Object.freeze([
  "충족하",
  "충족되",
  "해당하",
  "성립하",
  "성립되",
  "적용하",
  "적용되",
] as const);
const APP1_REPAIR_DISCUSSION_ONLY_CUES = Object.freeze([
  "검토항목",
  "확인대상",
  "설명대상",
  "하려고",
  "하고자",
  "고자",
  "고싶",
  "싶다",
  "원하",
  "향후",
  "예정",
  "계획",
  "시도",
  "의도",
  "목표",
  "되도록",
  "되면",
  "할수",
  "가능",
] as const);
const APP1_REPAIR_TARGET_DISPLACEMENT_CUES = Object.freeze([
  "다른",
  "별개",
  "무관",
  "대신",
  "반대",
  "불일치",
] as const);
const APP1_REPAIR_RELATION_PREDICATES = Object.freeze([
  "충족하",
  "충족해",
  "충족하여",
  "적용하",
  "적용해",
  "적용하여",
  "적용되",
  "대입하",
  "연결하",
  "연결해",
  "연결하여",
  "연결되어",
  "연계하",
  "연계해",
  "연계하여",
  "연계되어",
  "결부하",
  "결부해",
  "결부하여",
  "결부되어",
] as const);
const APP1_REPAIR_OUTCOME_PREDICATES = Object.freeze([
  "도출",
  "산출",
  "성립",
  "이른",
  "발생",
  "해당",
] as const);
const APP1_REPAIR_CALCULATION_OPERATORS = Object.freeze([
  "빼",
  "더하",
  "곱하",
  "나누",
  "대입",
] as const);
const APP1_REPAIR_CALCULATION_RESULTS = Object.freeze([
  "계산",
  "산출",
  "검산",
] as const);
const APP1_REPAIR_CALCULATION_SYMBOL_PATTERN =
  /(?:^|(?<=[^0-9]))(-?[0-9]+(?:[.,][0-9]+)?)\s*(\+|-|−|×|\*|÷|\/)\s*(-?[0-9]+(?:[.,][0-9]+)?)\s*=\s*(-?[0-9]+(?:[.,][0-9]+)?)(?=$|[^0-9])/gu;
const APP1_REPAIR_VERBAL_CALCULATION_RESULT_PATTERN =
  /(?:^|[\s,.;:()[\]{}])(?:결과|합계|차액|순수익)(?:은|는|이|가)?\s*(-?[0-9]+(?:[.,][0-9]+)?)(?:을|를|으로|로)?/u;

function parseApp1CalculationNumber(value: string) {
  const parsed = Number(value.replace(/,/gu, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function app1CalculationEquals(actual: number, expected: number) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  return Math.abs(actual - expected) <= Number.EPSILON * scale * 16;
}

function evaluateApp1BinaryCalculation(
  left: number,
  operator: string,
  right: number,
) {
  if (operator === "+" || operator.includes("더하")) return left + right;
  if (operator === "-" || operator === "−" || operator.includes("빼")) {
    return left - right;
  }
  if (operator === "*" || operator === "×" || operator.includes("곱하")) {
    return left * right;
  }
  if (operator === "/" || operator === "÷" || operator.includes("나누")) {
    return right === 0 ? null : left / right;
  }
  return null;
}

function hasCorrectClosedPracticeCalculation(value: string) {
  const symbolicCalculations = [
    ...value.matchAll(APP1_REPAIR_CALCULATION_SYMBOL_PATTERN),
  ];
  if (symbolicCalculations.length > 0) {
    for (const symbolic of symbolicCalculations) {
      const left = parseApp1CalculationNumber(symbolic[1]);
      const right = parseApp1CalculationNumber(symbolic[3]);
      const stated = parseApp1CalculationNumber(symbolic[4]);
      if (left === null || right === null || stated === null) return false;
      const calculated = evaluateApp1BinaryCalculation(
        left,
        symbolic[2],
        right,
      );
      if (calculated === null || !app1CalculationEquals(calculated, stated)) {
        return false;
      }
    }
    return true;
  }

  const resultMatch = value.match(APP1_REPAIR_VERBAL_CALCULATION_RESULT_PATTERN);
  if (!resultMatch || resultMatch.index === undefined) return false;
  const stated = parseApp1CalculationNumber(resultMatch[1]);
  const materialBeforeResult = value.slice(0, resultMatch.index);
  const operands = [
    ...materialBeforeResult.matchAll(/-?[0-9]+(?:[.,][0-9]+)?/gu),
  ]
    .map((match) => parseApp1CalculationNumber(match[0]))
    .filter((number): number is number => number !== null);
  if (stated === null || operands.length !== 2) return false;
  const identity = normalizedIdentity(materialBeforeResult);
  const operator = APP1_REPAIR_CALCULATION_OPERATORS.find((candidate) =>
    identity.includes(candidate),
  );
  if (!operator) return false;
  const calculated = evaluateApp1BinaryCalculation(
    operands[0],
    operator,
    operands[1],
  );
  return calculated !== null && app1CalculationEquals(calculated, stated);
}

const APP1_REPAIR_LEXICAL_STOP_WORDS = new Set([
  "그리고",
  "그러나",
  "대하여",
  "문장",
  "부분",
  "필요",
  "있습니다",
  "없습니다",
  "합니다",
  "됩니다",
  "약합니다",
  "직접",
  "적으세요",
]);

const APP1_REPAIR_LEXICAL_SUFFIX =
  /(으로|에서|에게|까지|부터|처럼|보다|하고|하며|하여|해서|했다|합니다|으세요|하세요|되도록|해야|되었다|되었습니다|의|과|와|을|를|은|는|이|가|에|로)$/u;

type App1RepairTargetProfile = Readonly<{
  requiredFacets: readonly App1RepairTargetFacet[];
  literalAnchors: readonly string[];
  contextAnchors: readonly string[];
  sourceAnchors: readonly string[];
  minimumLiteralMatches: number;
}>;

function lexicalWords(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^0-9A-Za-z가-힣]+/gu)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 2 && !APP1_REPAIR_LEXICAL_STOP_WORDS.has(word),
    )
    .map((word) => normalizedIdentity(word).replace(APP1_REPAIR_LEXICAL_SUFFIX, ""))
    .filter(
      (word) =>
        word.length >= 2 && !APP1_REPAIR_LEXICAL_STOP_WORDS.has(word),
    );
}

function includesAny(identity: string, values: readonly string[]) {
  return values.some((value) => identity.includes(normalizedIdentity(value)));
}

function hasUnresolvedRepairMetacommentary(value: string) {
  const identity = normalizedIdentity(value);
  return (
    includesAny(identity, APP1_REPAIR_UNRESOLVED_CUES) ||
    includesAny(identity, APP1_REPAIR_UNRESOLVED_METACOMMENTARY) ||
    includesAny(identity, APP1_REPAIR_DISCUSSION_ONLY_CUES)
  );
}

function repairFacetForWord(word: string) {
  return (
    Object.entries(APP1_REPAIR_TARGET_FACETS) as Array<
      [App1RepairTargetFacet, readonly string[]]
    >
  ).find(([, terms]) =>
    terms.some((term) => {
      const identity = normalizedIdentity(term);
      return word.includes(identity) || identity.includes(word);
    }),
  )?.[0] ?? null;
}

function literalTargetWords(value: string) {
  return lexicalWords(value).filter(
    (word) =>
      repairFacetForWord(word) === null &&
      !includesAny(word, APP1_REPAIR_ACTION_ROOTS) &&
      !includesAny(word, APP1_REPAIR_UNRESOLVED_CUES) &&
      !includesAny(word, APP1_REPAIR_DISCUSSION_ONLY_CUES) &&
      !includesAny(word, APP1_REPAIR_TARGET_DISPLACEMENT_CUES),
  );
}

function contextTargetWords(value: string) {
  return lexicalWords(value).filter(
    (word) =>
      !includesAny(word, APP1_REPAIR_ACTION_ROOTS) &&
      !includesAny(word, APP1_REPAIR_UNRESOLVED_CUES) &&
      !includesAny(word, APP1_REPAIR_DISCUSSION_ONLY_CUES) &&
      !includesAny(word, APP1_REPAIR_TARGET_DISPLACEMENT_CUES),
  );
}

function countProfileWordMatches(
  words: ReadonlySet<string>,
  anchors: readonly string[],
) {
  return anchors.filter((anchor) =>
    [...words].some(
      (word) =>
        word === anchor || word.includes(anchor) || anchor.includes(word),
    ),
  ).length;
}

function substantiveRepairWords(value: string) {
  return lexicalWords(value).filter(
    (word) =>
      repairFacetForWord(word) === null &&
      !includesAny(word, APP1_REPAIR_ACTION_ROOTS) &&
      !includesAny(word, APP1_REPAIR_UNRESOLVED_CUES) &&
      !includesAny(word, APP1_REPAIR_DISCUSSION_ONLY_CUES) &&
      !includesAny(word, APP1_REPAIR_TARGET_DISPLACEMENT_CUES),
  );
}

function hasClosedRepairPropositionShape(
  value: string,
  requiredFacets: readonly App1RepairTargetFacet[],
) {
  const identity = normalizedIdentity(value);
  const facetSet = new Set(requiredFacets);
  if (
    facetSet.has("evidence_subject") &&
    facetSet.has("authority_or_reason") &&
    facetSet.has("linkage")
  ) {
    return (
      includesAny(identity, APP1_REPAIR_RELATION_PREDICATES) &&
      includesAny(identity, APP1_REPAIR_OUTCOME_PREDICATES)
    );
  }
  if (facetSet.has("calculation")) {
    const numericOperands = value.match(/[0-9]+(?:[.,][0-9]+)?/gu) ?? [];
    return (
      numericOperands.length >= 2 &&
      hasCorrectClosedPracticeCalculation(value) &&
      includesAny(identity, APP1_REPAIR_CALCULATION_RESULTS)
    );
  }
  return false;
}

function hasSubstantiveRepairSupport(
  value: string,
  profile: App1RepairTargetProfile,
) {
  if (
    profile.requiredFacets.includes("calculation") &&
    !hasCorrectClosedPracticeCalculation(value)
  ) {
    return false;
  }
  return value
    .split(/[.!?\n。！？]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .some((segment) => {
      const identity = normalizedIdentity(segment);
      const segmentWords = new Set(lexicalWords(segment));
      if (profile.requiredFacets.length > 0) {
        const targetAnchored =
          profile.literalAnchors.length >= 2
            ? countProfileWordMatches(segmentWords, profile.literalAnchors) >=
              Math.max(2, profile.minimumLiteralMatches)
            : profile.sourceAnchors.length >= 2 &&
              countProfileWordMatches(segmentWords, profile.sourceAnchors) >=
                Math.min(4, profile.sourceAnchors.length);
        return (
          profile.requiredFacets.every((facet) =>
            includesAny(identity, APP1_REPAIR_TARGET_FACETS[facet]),
          ) &&
          targetAnchored &&
          new Set(substantiveRepairWords(segment)).size >= 2 &&
          hasClosedRepairPropositionShape(segment, profile.requiredFacets)
        );
      }
      if (profile.contextAnchors.length < 2) return false;
      return (
        countProfileWordMatches(segmentWords, profile.literalAnchors) >= 2 &&
        countProfileWordMatches(segmentWords, profile.contextAnchors) >= 2 &&
        new Set(substantiveRepairWords(segment)).size >= 2
      );
    });
}

function buildApp1RepairTargetProfile(
  requestedGap: App1PrimaryGap,
  detail: WrongAnswerDetail,
): App1RepairTargetProfile {
  const facetMaterial = [requestedGap.gap, requestedGap.repairAction].join(" ");
  const targetIdentity = normalizedIdentity(facetMaterial);
  const requiredFacets = (
    Object.entries(APP1_REPAIR_TARGET_FACETS) as Array<
      [App1RepairTargetFacet, readonly string[]]
    >
  )
    .filter(([, terms]) => includesAny(targetIdentity, terms))
    .map(([facet]) => facet);
  const literalAnchors = Array.from(
    new Set(literalTargetWords(facetMaterial)),
  ).slice(0, 8);
  const contextAnchors = Array.from(
    new Set(
      contextTargetWords(requestedGap.whyItMatters).filter(
        (word) =>
          !literalAnchors.some(
            (anchor) =>
              word === anchor || word.includes(anchor) || anchor.includes(word),
          ),
      ),
    ),
  ).slice(0, 8);
  const sourceMaterial = [
    detail.item.problemTitle,
    detail.item.problemIdentifier,
    detail.item.rawQuestionText,
    getApp1LearnerAnswer(detail),
    detail.item.missingIssue,
    detail.item.weakApplicationSentence,
    detail.item.rewriteInstruction,
    detail.item.caseSummary,
    detail.item.issueRecall,
    detail.item.coreFormula,
    ...(detail.item.keyConcepts ?? []),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  const sourceAnchors = Array.from(
    new Set(literalTargetWords(sourceMaterial)),
  ).slice(0, 16);
  return Object.freeze({
    requiredFacets: Object.freeze(requiredFacets),
    literalAnchors: Object.freeze(literalAnchors),
    contextAnchors: Object.freeze(contextAnchors),
    sourceAnchors: Object.freeze(sourceAnchors),
    minimumLiteralMatches: Math.min(2, literalAnchors.length),
  });
}

function supportsClosedRepairShape(profile: App1RepairTargetProfile) {
  if (profile.requiredFacets.length === 0) return true;
  const facetSet = new Set(profile.requiredFacets);
  return (
    facetSet.has("calculation") ||
    (facetSet.has("evidence_subject") &&
      facetSet.has("authority_or_reason") &&
      facetSet.has("linkage"))
  );
}

function matchesRepairTarget(value: string, profile: App1RepairTargetProfile) {
  const identity = normalizedIdentity(value);
  if (!identity) return false;
  const valueWords = new Set(lexicalWords(value));
  const literalMatches = profile.literalAnchors.filter((anchor) =>
    valueWords.has(anchor),
  ).length;
  if (profile.requiredFacets.length === 0) {
    return (
      profile.literalAnchors.length >= 2 &&
      literalMatches >= Math.max(2, profile.minimumLiteralMatches)
    );
  }
  const facetsMatch = profile.requiredFacets.every((facet) =>
    includesAny(identity, APP1_REPAIR_TARGET_FACETS[facet]),
  );
  if (!facetsMatch) return false;
  return literalMatches >= profile.minimumLiteralMatches;
}

function isTargetSpecificPositiveEvidence(
  value: string,
  profile: App1RepairTargetProfile,
) {
  const identity = normalizedIdentity(value);
  return (
    matchesRepairTarget(value, profile) &&
    hasSubstantiveRepairSupport(value, profile) &&
    !hasUnresolvedRepairMetacommentary(value) &&
    !includesAny(identity, APP1_REPAIR_TARGET_DISPLACEMENT_CUES)
  );
}

function repairEvidencePolarities(
  value: string,
  profile: App1RepairTargetProfile,
) {
  const polarities = new Set<"affirmative" | "negative">();
  for (const segment of value
    .split(/[.!?\n。！？]+/u)
    .map((candidate) => candidate.trim())
    .filter(Boolean)) {
    if (
      !matchesRepairTarget(segment, profile) ||
      !hasSubstantiveRepairSupport(segment, profile) ||
      hasUnresolvedRepairMetacommentary(segment) ||
      includesAny(
        normalizedIdentity(segment),
        APP1_REPAIR_TARGET_DISPLACEMENT_CUES,
      )
    ) {
      continue;
    }
    const identity = normalizedIdentity(segment);
    const hasNegative = includesAny(
      identity,
      APP1_REPAIR_SUBSTANTIVE_NEGATIVE_PREDICATES,
    );
    const identityWithoutNegativePredicates =
      APP1_REPAIR_SUBSTANTIVE_NEGATIVE_PREDICATES.reduce(
        (current, predicate) =>
          current.replaceAll(normalizedIdentity(predicate), ""),
        identity,
      );
    const hasAffirmative = includesAny(
      identityWithoutNegativePredicates,
      APP1_REPAIR_SUBSTANTIVE_AFFIRMATIVE_PREDICATES,
    );
    if (hasNegative) polarities.add("negative");
    if (hasAffirmative || !hasNegative) polarities.add("affirmative");
  }
  return polarities;
}
function observedPrimaryGap(draft: AnswerReviewStructureDraft) {
  return buildAnswerReviewQualityView(draft).primaryFix.gap;
}

export function evaluateApp1SameSessionRepair(input: Readonly<{
  detail: WrongAnswerDetail;
  requestedGap: App1PrimaryGap;
  repairText: string;
  repairDraft: AnswerReviewStructureDraft | null;
  deferred?: boolean;
}>): App1RepairVerification {
  const summary = buildApp1StructureSummary(input.detail);
  const requestedGap = scalarText(
    input.requestedGap.gap,
    APP1_LIMITS.maximumGapCharacters,
  );
  const repairText = learnerBodyText(input.repairText);
  const result = (
    state: App1VerificationState,
    reason: string,
    observedGap: string | null,
  ): App1RepairVerification =>
    Object.freeze({
      state,
      requestedGap,
      observedGap,
      reason,
      sameSessionOnly: true,
      masteryCreated: false,
      transferCreated: false,
    });

  if (input.deferred) {
    return result("deferred", "복구 입력은 완료로 처리되지 않았고 다음 시도로 미뤄졌습니다.", null);
  }
  if (!summary.ocrConfirmed || summary.uncertainty !== null) {
    return result(
      "blocked_by_ocr_or_source_uncertainty",
      "확인된 OCR/원문 근거가 없어 같은 세션 복구를 확인할 수 없습니다.",
      null,
    );
  }
  if (
    repairText === null ||
    repairText.length < APP1_LIMITS.minimumRepairCharacters ||
    repairText.length > APP1_LIMITS.maximumRepairCharacters
  ) {
    return result(
      "one_connection_still_missing",
      `학습자 복구 입력은 ${APP1_LIMITS.minimumRepairCharacters}자 이상 ${APP1_LIMITS.maximumRepairCharacters}자 이하여야 합니다.`,
      null,
    );
  }
  if (!input.repairDraft) {
    return result(
      "guided_path_needed",
      "복구 입력의 검토 초안을 확인하지 못했습니다. 저장 전 다시 검토해 주세요.",
      null,
    );
  }

  const observedGap = scalarText(
    observedPrimaryGap(input.repairDraft),
    APP1_LIMITS.maximumGapCharacters,
  );
  const targetProfile = buildApp1RepairTargetProfile(
    input.requestedGap,
    input.detail,
  );
  if (!supportsClosedRepairShape(targetProfile)) {
    return result(
      "guided_path_needed",
      "이 복구 유형은 자동 확인 범위를 벗어납니다. 저장 전 안내 경로에서 다시 검토해 주세요.",
      observedGap,
    );
  }
  const learnerSupportsTarget = isTargetSpecificPositiveEvidence(
    repairText,
    targetProfile,
  );
  const targetSpecificPositiveEvidence = input.repairDraft.strengths.some(
    (strength) => isTargetSpecificPositiveEvidence(strength, targetProfile),
  );
  const targetSpecificConflict = [
    ...input.repairDraft.missingIssueCandidates,
    input.repairDraft.weakLogicPoint,
    input.repairDraft.weakParagraphPoint,
  ].some((candidate) => matchesRepairTarget(candidate, targetProfile));
  const evidencePolarities = new Set<"affirmative" | "negative">();
  for (const evidence of [repairText, ...input.repairDraft.strengths]) {
    for (const polarity of repairEvidencePolarities(evidence, targetProfile)) {
      evidencePolarities.add(polarity);
    }
  }
  const contradictoryTargetPolarity = evidencePolarities.size > 1;
  if (
    !learnerSupportsTarget ||
    !targetSpecificPositiveEvidence ||
    targetSpecificConflict ||
    contradictoryTargetPolarity
  ) {
    return result(
      "one_connection_still_missing",
      "검토 초안에서 요청한 연결이 여전히 남아 있습니다. 복구 입력을 직접 보강해 주세요.",
      observedGap,
    );
  }

  return result(
    "repair_confirmed_for_this_session",
    "현재 검토 초안에서 요청한 한 연결이 보강되었습니다. 이 확인은 같은 세션에만 적용됩니다.",
    observedGap,
  );
}

export function buildApp1RepairPersistenceInput(input: Readonly<{
  detail: WrongAnswerDetail;
  gap: App1PrimaryGap;
  repairText: string;
  verification: App1RepairVerification;
  operation: CaptureSaveOperationBinding;
}>): WrongAnswerItemInput {
  const source = input.detail.item;
  const repairText = learnerBodyText(input.repairText);
  if (!repairText || repairText.length < APP1_LIMITS.minimumRepairCharacters) {
    throw new Error("app1:repair-input-too-short");
  }
  if (repairText.length > APP1_LIMITS.maximumRepairCharacters) {
    throw new Error("app1:repair-input-too-long");
  }
  if (input.verification.requestedGap !== input.gap.gap) {
    throw new Error("app1:verification-gap-mismatch");
  }

  return {
    examName: "감정평가사 2차",
    subjectLabel: source.subjectLabel,
    sourceType: source.sourceType,
    sourceLabel: source.sourceLabel,
    problemTitle: `${source.problemTitle ?? source.subjectLabel} · 직접 복구`,
    problemIdentifier: source.problemIdentifier,
    rawQuestionText: source.rawQuestionText,
    rawAnswerText: repairText,
    rewriteParagraph: repairText,
    correctAnswer: source.correctAnswer || "-",
    userAnswer: repairText,
    userReasonText: input.gap.gap,
    confidence: source.confidence,
    timeSpentSeconds: source.timeSpentSeconds,

    keyConcepts: source.keyConcepts,
    coreFormula: source.coreFormula,
    comparisonPoint: input.verification.reason,
    missingIssue: input.gap.gap,
    weakStructurePoint: input.gap.whyItMatters,
    rewriteInstruction: input.gap.repairAction,
    referenceStructure: source.referenceStructure,
    myAnswerSummary: scalarText(
      repairText,
      APP1_LIMITS.maximumSummaryCharacters,
    ),
    caseSummary: source.caseSummary,
    issueRecall: source.issueRecall,
    outlineDraft: source.outlineDraft,
    productionBeforeComparison: true,
    referenceAnswerAddedAfterProduction:
      source.referenceAnswerAddedAfterProduction ?? false,
    biggestGap: input.gap.gap,
    rewriteSourceItemId: source.id,
    rewriteSourceGap: input.gap.gap,
    rewriteCompleted:
      input.verification.state === "repair_confirmed_for_this_session",
    captureIntent: "save",
    createdFromCapture: true,
    extractionPayload: {
      raw_ocr_text: "",
      raw_extraction_json: {},
      normalized_draft: null,
      user_confirmed_fields: {
        app1_contract_version: APP1_CONTRACT_VERSION,
        app1_source_item_id: source.id,
        app1_verification_state: input.verification.state,
        app1_same_session_only: true,
        app1_mastery_created: false,
        app1_transfer_created: false,
        ocrConfirmedByLearner: buildApp1StructureSummary(input.detail).ocrConfirmed,
        ...buildCapturePersistenceMetadata(input.operation),
      },
    },
  };
}

export function buildApp1NextReviewReceipt(
  detail: WrongAnswerDetail,
  itemId: string,
  persistence: FailureAwarePersistenceEvidence,
): App1NextReviewReceipt | null {
  const persistedUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  const confirmedFields = exactConfirmedFields(detail);
  if (
    persistence.kind !== "durable_record" ||
    persistence.recordId !== itemId ||
    detail.item.id !== itemId ||
    detail.item.updatedAt !== persistence.persistedAt ||
    confirmedFields?.persistence_operation_id !== persistence.operationId ||
    confirmedFields?.persistence_work_revision_id !== persistence.workRevisionId ||
    !persistedUuid.test(itemId)
  ) {
    return null;
  }
  const matches = detail.reviewQueue.filter((entry) => entry.itemId === itemId);
  if (matches.length !== 1) return null;
  const [match] = matches;
  if (!persistedUuid.test(match.queueId) || !match.dueAt) return null;
  const due = Date.parse(match.dueAt);
  const persisted = Date.parse(persistence.persistedAt);
  if (!Number.isFinite(due) || !Number.isFinite(persisted) || due < persisted) {
    return null;
  }
  const elapsedHours = (due - persisted) / 3_600_000;
  const policyWindow = /timed|시간/iu.test(match.reviewReason)
    ? "timed_work"
    : elapsedHours >= 12 && elapsedHours <= 48
      ? "D+1"
      : elapsedHours > 48
        ? "later_transfer"
        : "independent_review";
  return Object.freeze({
    queueId: match.queueId,
    itemId: match.itemId,
    dueAt: match.dueAt,
    policyWindow,
    nextIndependentAction:
      match.examName === "감정평가사 2차"
        ? "답을 보지 않고 보강한 연결을 다시 한 번 작성하기"
        : "답을 보지 않고 다시 풀기",
  });
}
export function app1GuidedRepairHref(subject: string) {
  if (subject.includes("이론")) return "/app/c3r-t";
  if (subject.includes("법규")) return "/app/c3r-l";
  return "/app/c3r-p";
}
