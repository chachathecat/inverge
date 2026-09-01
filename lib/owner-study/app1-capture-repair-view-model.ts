import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import { buildAnswerReviewQualityView } from "../evaluate/answer-review-quality";
import {
  buildCapturePersistenceMetadata,
  type CaptureSaveOperationBinding,
} from "../review-os/capture-persistence-controller";
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

function learnerBodyText(value: unknown) {
  if (typeof value !== "string") return null;
  return value.replace(/\r\n?/gu, "\n").trim();
}

const APP1_PERSISTED_ANSWER_PLACEHOLDERS = new Set(["-", "–", "—"]);

function substantiveLearnerBodyText(value: unknown) {
  const normalized = learnerBodyText(value);
  if (normalized === null || APP1_PERSISTED_ANSWER_PLACEHOLDERS.has(normalized)) {
    return null;
  }
  return normalized;
}

function exactConfirmedFields(detail: WrongAnswerDetail) {
  const rawPayload = record(detail.item.rawPayload);
  return record(rawPayload?.user_confirmed_fields);
}

function positiveSafeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

export function getApp1LearnerAnswer(detail: WrongAnswerDetail) {
  const candidates = [
    substantiveLearnerBodyText(detail.item.userAnswer),
    substantiveLearnerBodyText(detail.item.rawAnswerText),
    substantiveLearnerBodyText(detail.item.rewriteParagraph),
  ];
  return candidates.find((candidate) => candidate) ?? "";
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
    : fields?.lowConfidenceFlag === true
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

const APP1_REPAIR_COMPLETION_PATTERNS = Object.freeze([
  /충족(?:하므로|하여(?!야)|했고|했다(?!면)|했습니다(?!면)|됐(?:고|다)|되었(?:고|다)|됨(?:을|이|으로)?)/u,
  /도출(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다)|됐(?:고|다)|되었습니다(?!면)|됨(?:을|이|으로)?)/u,
  /보강(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다)|됐(?:고|다)|되었습니다(?!면)|됨(?:을|이|으로)?)/u,
  /설명(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다)|됐(?:고|다)|되었습니다(?!면)|됨(?:을|이|으로)?)/u,
  /완료(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다)|됐(?:고|다)|되었습니다(?!면)|됨(?:을|이|으로)?)/u,
  /바로잡(?:고(?!자|싶)|았(?:고|다|습니다))/u,
  /재작성(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다))/u,
  /재구성(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다))/u,
  /완성(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다))/u,
  /명시(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다))/u,
  /확인(?:했고|했다(?!면)|했습니다(?!면)|하였(?:고|다))/u,
] as const);
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
  "못",
  "않",
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
  "필요하",
  "해야",
  "남아",
  "아직",
] as const);
const APP1_REPAIR_DISCUSSION_ONLY_CUES = Object.freeze([
  "검토항목",
  "확인대상",
  "설명대상",
  "하려고",
  "하고자",
  "고자",
  "하여야",
  "고싶",
  "싶다",
  "원하",
  "향후",
  "예정",
  "계획",
  "시도",
  "의도",
  "목표",
  "되어야",
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

const APP1_REPAIR_OOV_COMPLETION_PATTERNS = Object.freeze([
  /보강(?:했고|했다|했습니다|하였(?:고|다))/u,
  /설명(?:했고|했다|했습니다|하였(?:고|다))/u,
  /바로잡(?:고|았(?:고|다|습니다))/u,
  /완성(?:했고|했다|했습니다|하였(?:고|다))/u,
  /명시(?:했고|했다|했습니다|하였(?:고|다))/u,
  /특정(?:했고|했다|했습니다|하였(?:고|다)|하고)/u,
  /보충(?:했고|했다|했습니다|하였(?:고|다))/u,
] as const);

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

function hasSubstantiveOovSupport(
  value: string,
  profile: App1RepairTargetProfile,
) {
  if (profile.requiredFacets.length > 0) return true;
  if (profile.contextAnchors.length < 2) return false;
  return value
    .split(/[.!?\n。！？]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .some((segment) => {
      const segmentWords = new Set(lexicalWords(segment));
      return (
        countProfileWordMatches(segmentWords, profile.literalAnchors) >= 2 &&
        countProfileWordMatches(segmentWords, profile.contextAnchors) >= 2 &&
        APP1_REPAIR_OOV_COMPLETION_PATTERNS.some((pattern) =>
          pattern.test(normalizedIdentity(segment)),
        )
      );
    });
}

function buildApp1RepairTargetProfile(
  requestedGap: App1PrimaryGap,
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
  return Object.freeze({
    requiredFacets: Object.freeze(requiredFacets),
    literalAnchors: Object.freeze(literalAnchors),
    contextAnchors: Object.freeze(contextAnchors),
    minimumLiteralMatches: Math.min(2, literalAnchors.length),
  });
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
    hasSubstantiveOovSupport(value, profile) &&
    APP1_REPAIR_COMPLETION_PATTERNS.some((pattern) => pattern.test(identity)) &&
    !includesAny(identity, APP1_REPAIR_UNRESOLVED_CUES) &&
    !includesAny(identity, APP1_REPAIR_DISCUSSION_ONLY_CUES) &&
    !includesAny(identity, APP1_REPAIR_TARGET_DISPLACEMENT_CUES)
  );
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
  if (!summary.ocrConfirmed || summary.uncertainty?.includes("없습니다")) {
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
  const targetProfile = buildApp1RepairTargetProfile(input.requestedGap);
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
  if (
    !learnerSupportsTarget ||
    !targetSpecificPositiveEvidence ||
    targetSpecificConflict
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
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  const confirmedFields = exactConfirmedFields(detail);
  if (
    persistence.kind !== "durable_record" ||
    persistence.recordId !== itemId ||
    detail.item.id !== itemId ||
    detail.item.updatedAt !== persistence.persistedAt ||
    confirmedFields?.persistence_operation_id !== persistence.operationId ||
    confirmedFields?.persistence_work_revision_id !== persistence.workRevisionId ||
    !uuid.test(itemId)
  ) {
    return null;
  }
  const matches = detail.reviewQueue.filter((entry) => entry.itemId === itemId);
  if (matches.length !== 1) return null;
  const [match] = matches;
  if (!uuid.test(match.queueId) || !match.dueAt) return null;
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
