import { getAppraisalMode, parseAppraisalMode } from "@/lib/review-os/appraisal";
import type { WrongAnswerDetail, WrongAnswerItemRecord, WrongAnswerTagRecord } from "@/lib/review-os/types";

const FIRST_CORE_FORMULA_BY_SUBJECT: Record<string, string> = {
  민법: "요건 -> 효과 -> 예외",
  경제학원론: "정의 -> 그래프 이동 -> 균형 변화",
  회계학: "분개 -> 금액 -> 재무제표 표시",
  부동산학원론: "개념 -> 계산 기준 -> 적용 조건",
  감정평가관계법규: "요건 -> 절차 -> 법리 적용",
};

const SECOND_CORE_SENTENCE_BY_SUBJECT: Record<string, string> = {
  감정평가실무: "계산 근거와 평가 절차를 분리해 적습니다.",
  감정평가이론: "개념 정의 뒤에 사례 적용 문장을 붙입니다.",
  "감정평가 및 보상법규": "요건, 절차, 법리 적용을 순서대로 연결합니다.",
};

function compact(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function unique(values: Array<string | undefined | null>, limit = 4) {
  return Array.from(new Set(values.map(compact).filter(Boolean))).slice(0, limit);
}

function getAiDraft(rawPayload?: Record<string, unknown>) {
  return typeof rawPayload?.aiDraft === "object" && rawPayload.aiDraft
    ? (rawPayload.aiDraft as Record<string, unknown>)
    : {};
}

function getDraftString(rawPayload: Record<string, unknown> | undefined, key: string) {
  const value = getAiDraft(rawPayload)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getDraftStringArray(rawPayload: Record<string, unknown> | undefined, key: string) {
  const value = getAiDraft(rawPayload)[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function getRawPayloadString(rawPayload: Record<string, unknown> | undefined, key: string) {
  const value = rawPayload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getConfirmedFieldString(rawPayload: Record<string, unknown> | undefined, key: string) {
  const confirmed =
    rawPayload && typeof rawPayload.user_confirmed_fields === "object" && rawPayload.user_confirmed_fields
      ? (rawPayload.user_confirmed_fields as Record<string, unknown>)
      : null;
  const value = confirmed?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function truncateLine(value: string, max = 220) {
  const line = compact(value).replace(/([.!?])\s+/g, "$1 ");
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

export function getNextReviewDate(rawPayload?: Record<string, unknown>) {
  return typeof rawPayload?.nextReviewDate === "string" && rawPayload.nextReviewDate
    ? rawPayload.nextReviewDate
    : "오늘 review queue 기준";
}

export function buildNotebookPreview(item: WrongAnswerItemRecord, tag?: WrongAnswerTagRecord | null) {
  const mode = parseAppraisalMode(typeof item.rawPayload?.mode === "string" ? item.rawPayload.mode : null) ?? getAppraisalMode(item.examName);
  const isSecond = mode === "second";
  const title = item.problemTitle ?? item.problemIdentifier ?? (isSecond ? "2차 교정노트" : "1차 오답노트");
  const weakPoint = compact(
    getDraftString(item.rawPayload, isSecond ? "missingIssue" : "comparisonPoint") ??
      item.userReasonText ??
      tag?.mistakeType ??
      item.userReasonPreset ??
      (isSecond ? "누락 논점 1개" : "반복 오답 신호")
  );
  const keyTerms = unique([
    ...getDraftStringArray(item.rawPayload, "keyConcepts"),
    item.subjectLabel,
    tag?.topicTag,
    tag?.mistakeType,
    item.userReasonPreset,
  ]);
  const coreLine = compact(
    isSecond
      ? (getDraftString(item.rawPayload, "weakApplicationSentence") ??
          SECOND_CORE_SENTENCE_BY_SUBJECT[item.subjectLabel] ??
          "누락 논점 1개를 사례 적용 문장으로 보강합니다.")
      : (getDraftString(item.rawPayload, "coreFormula") ??
          FIRST_CORE_FORMULA_BY_SUBJECT[item.subjectLabel] ??
          "개념 -> 조건 -> 적용")
  );
  const nextAction = compact(
    isSecond
      ? (getDraftString(item.rawPayload, "rewriteInstruction") ??
          "누락 논점 1개를 표시하고 8~10줄로 다시 씁니다.")
      : "같은 유형 1문제를 다시 풀고, 헷갈린 차이 5줄을 남깁니다."
  );

  return {
    mode,
    title,
    weakPoint,
    keyTerms,
    coreLine,
    nextAction,
    nextReviewDate: getNextReviewDate(item.rawPayload),
    noteLabel: isSecond ? "교정노트" : "오답노트",
    summaryLine: isSecond
      ? "답안에서 빠진 논점과 다음 rewrite 지시를 한 장으로 정리했습니다."
      : "오답 원인과 다음 review 기준을 한 장으로 정리했습니다.",
    notebookLine: isSecond
      ? `다음 답안에서는 ${weakPoint}을 먼저 고정합니다.`
      : `다음 review에서는 ${weakPoint}을 먼저 확인합니다.`,
  };
}

export function buildDetailStudyNote(detail: WrongAnswerDetail) {
  const primaryTag = detail.tags[0] ?? null;
  const preview = buildNotebookPreview(detail.item, primaryTag);
  const isSecond = preview.mode === "second";
  const summary = compact(
    detail.note?.aiSummary ??
      (isSecond
        ? "답안 비교 결과를 누락 논점, 구조, rewrite 지시로 정리했습니다."
        : "오답 원인을 핵심 키워드, 공식, 다음 review 행동으로 정리했습니다.")
  );
  const noteCard = compact(
    isSecond
      ? (detail.note?.nextTryTip ?? `교정노트: ${preview.weakPoint}을 먼저 보강하고, 핵심 문장을 다시 씁니다.`)
      : (detail.note?.reviewCheckpoint ?? `오답노트: 정답 근거와 내가 고른 답의 차이를 5줄로 남깁니다.`)
  );
  const missingIssue = getDraftString(detail.item.rawPayload, "missingIssue");
  const weakStructurePoint = getDraftString(detail.item.rawPayload, "weakStructurePoint");
  const weakApplicationSentence = getDraftString(detail.item.rawPayload, "weakApplicationSentence");
  const comparisonPoint = getDraftString(detail.item.rawPayload, "comparisonPoint");

  return {
    ...preview,
    summary,
    weakPoint: isSecond ? (missingIssue ?? preview.weakPoint) : (comparisonPoint ?? preview.weakPoint),
    missingIssue,
    weakStructurePoint,
    weakApplicationSentence,
    rewriteInstruction: getDraftString(detail.item.rawPayload, "rewriteInstruction"),
    comparisonPoint,
    noteCard,
    nextReviewDate: preview.nextReviewDate,
    recurrenceText:
      detail.recurrence && detail.recurrence.recurrenceCount > 1
        ? `${detail.recurrence.recurrenceCount}회 반복된 신호입니다.`
        : "첫 기록입니다. 다음 review에서 반복 여부를 확인합니다.",
  };
}

export type RewriteComparisonNote = {
  sourceGap: string;
  previousParagraph: string;
  sourceAnswerSummary: string;
  rewrittenParagraph: string;
  improvement: string;
  remainingNextGap: string;
};

export function buildRewriteComparisonNote(
  detail: WrongAnswerDetail,
  detailNote: ReturnType<typeof buildDetailStudyNote>,
  sourceDetail?: WrongAnswerDetail | null,
): RewriteComparisonNote | null {
  const mode =
    parseAppraisalMode(typeof detail.item.rawPayload?.mode === "string" ? detail.item.rawPayload.mode : null) ??
    getAppraisalMode(detail.item.examName);
  if (mode !== "second") return null;

  const rewriteSourceItemId =
    getRawPayloadString(detail.item.rawPayload, "rewrite_source_item_id") ??
    getConfirmedFieldString(detail.item.rawPayload, "rewrite_source_item_id");
  if (!rewriteSourceItemId) return null;

  const sourceGap =
    getRawPayloadString(detail.item.rawPayload, "rewrite_source_gap") ??
    getConfirmedFieldString(detail.item.rawPayload, "rewrite_source_gap") ??
    detailNote.missingIssue ??
    detailNote.weakPoint;

  const previousParagraph =
    sourceDetail?.item.userAnswer?.trim() ||
    getDraftString(sourceDetail?.item.rawPayload, "myAnswerSummary") ||
    getDraftString(detail.item.rawPayload, "myAnswerSummary") ||
    "이전 문단 기록이 없습니다.";
  const sourceAnswerSummary =
    sourceDetail?.item.correctAnswer?.trim() ||
    getDraftString(sourceDetail?.item.rawPayload, "caseSummary") ||
    getDraftString(detail.item.rawPayload, "caseSummary") ||
    "기준 답안 요약 기록이 없습니다.";
  const rewrittenParagraph = detail.item.userAnswer?.trim() || "다시 쓴 문단이 아직 기록되지 않았습니다.";

  const remainingNextGap = detailNote.weakStructurePoint ?? detailNote.weakApplicationSentence ?? detailNote.weakPoint;
  const improvement = truncateLine(`${sourceGap}을 문단에 반영해 이전 문단보다 근거 연결이 또렷해졌습니다.`);

  return {
    sourceGap: truncateLine(sourceGap, 140),
    previousParagraph: truncateLine(previousParagraph, 260),
    sourceAnswerSummary: truncateLine(sourceAnswerSummary, 260),
    rewrittenParagraph,
    improvement,
    remainingNextGap: truncateLine(remainingNextGap, 160),
  };
}
