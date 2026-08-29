import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import { buildAnswerReviewQualityView } from "../evaluate/answer-review-quality";
import {
  buildCapturePersistenceMetadata,
  type CaptureSaveOperationBinding,
} from "../review-os/capture-persistence-controller";
import type {
  ReviewQueueCard,
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

function exactConfirmedFields(detail: WrongAnswerDetail) {
  const rawPayload = record(detail.item.rawPayload);
  return record(rawPayload?.user_confirmed_fields);
}

function positiveSafeInteger(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

export function getApp1LearnerAnswer(detail: WrongAnswerDetail) {
  return (
    scalarText(detail.item.userAnswer, APP1_LIMITS.maximumRepairCharacters) ||
    scalarText(detail.item.rawAnswerText, APP1_LIMITS.maximumRepairCharacters) ||
    scalarText(detail.item.rewriteParagraph, APP1_LIMITS.maximumRepairCharacters)
  );
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
        ? `확인된 ${pageCount}페이지 범위 · 답안 문단 1`
        : "확인된 답안 · 문단 1",
      anchorKind: "bounded_section",
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
  const repairText = scalarText(input.repairText, APP1_LIMITS.maximumRepairCharacters);
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
    repairText.length < APP1_LIMITS.minimumRepairCharacters ||
    repairText.length > APP1_LIMITS.maximumRepairCharacters
  ) {
    return result(
      "one_connection_still_missing",
      `학습자 복구 입력은 ${APP1_LIMITS.minimumRepairCharacters}자 이상이어야 합니다.`,
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
  const requestedGapIdentity = normalizedIdentity(requestedGap);
  const requestedGapStillPresent = input.repairDraft.missingIssueCandidates
    .some(
      (candidate) =>
        normalizedIdentity(candidate) === requestedGapIdentity,
    );
  if (requestedGapStillPresent || input.repairDraft.strengths.length === 0) {
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
  const repairText = scalarText(input.repairText, APP1_LIMITS.maximumRepairCharacters);
  if (repairText.length < APP1_LIMITS.minimumRepairCharacters) {
    throw new Error("app1:repair-input-too-short");
  }
  if (input.verification.requestedGap !== input.gap.gap) {
    throw new Error("app1:verification-gap-mismatch");
  }
  const nextReviewDate =
    source.nextReviewDate ?? input.detail.reviewQueue[0]?.dueAt.slice(0, 10) ?? null;

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
    nextReviewDate,
    keyConcepts: source.keyConcepts,
    coreFormula: source.coreFormula,
    comparisonPoint: input.verification.reason,
    missingIssue: input.gap.gap,
    weakStructurePoint: input.gap.whyItMatters,
    rewriteInstruction: input.gap.repairAction,
    referenceStructure: source.referenceStructure,
    myAnswerSummary: repairText,
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
  queue: readonly ReviewQueueCard[],
  itemId: string,
  persistedAt: string,
): App1NextReviewReceipt | null {
  const match = queue.find((entry) => entry.itemId === itemId);
  if (!match || !match.queueId || !match.dueAt) return null;
  const due = Date.parse(match.dueAt);
  const persisted = Date.parse(persistedAt);
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
