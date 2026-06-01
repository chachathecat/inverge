import { FirstOxPracticeClient } from "@/components/review-os/first-ox/first-ox-practice-client";
import { extractFirstExamFiveChoicesFromText, extractFirstOxTrapWords, normalizeFiveChoiceItemToStatements, type FirstExamStatement } from "@/lib/review-os/first-ox-engine";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import type { WrongAnswerItemRecord } from "@/lib/review-os/types";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ retryItemId?: string; sourceItemId?: string }>;
};

type FirstOxRetryState = {
  initialStatements?: FirstExamStatement[];
  initialSubject?: string;
  initialStem?: string;
  initialChoiceText?: string;
  retrySourceItemId?: string;
  retryLoadStatus?: "loaded" | "not_found" | "generic";
  sourceKind?: "capture" | "manual" | "retry" | "generic";
  sourceLoadStatus?: "loaded" | "unclear" | "not_found" | "generic";
};

export default async function FirstOxPracticePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const retryItemId = params?.retryItemId?.trim() || undefined;
  const sourceItemId = params?.sourceItemId?.trim() || undefined;
  const returnTo = retryItemId
    ? `/app/first/ox?retryItemId=${encodeURIComponent(retryItemId)}`
    : sourceItemId
      ? `/app/first/ox?sourceItemId=${encodeURIComponent(sourceItemId)}`
      : buildReviewOsReturnTo("/app/first/ox", "first");
  const { session } = await getReviewOsServerContext(returnTo);
  const initialState = session.userId && session.email && retryItemId
    ? await loadFirstOxRetryState(session.userId, session.email, retryItemId)
    : session.userId && session.email && sourceItemId
      ? await loadFirstOxCaptureSourceState(session.userId, session.email, sourceItemId)
      : ({ retryLoadStatus: "generic", sourceKind: "generic", sourceLoadStatus: "generic" } satisfies FirstOxRetryState);

  return <FirstOxPracticeClient {...initialState} />;
}

async function loadFirstOxCaptureSourceState(userId: string, email: string, sourceItemId: string): Promise<FirstOxRetryState> {
  const detail = await reviewOsService.getWrongAnswerDetail(userId, email, sourceItemId).catch(() => null);
  if (!detail || detail.item.userId !== userId || detail.item.examName !== "감정평가사 1차") {
    return { sourceKind: "capture", sourceLoadStatus: "not_found" };
  }

  const confirmedText = getConfirmedCaptureText(detail.item);
  const extracted = extractFirstExamFiveChoicesFromText(confirmedText, detail.item.subjectLabel);
  if (extracted.status !== "detected" || extracted.choices.length !== 5) {
    return {
      initialSubject: extracted.subject ?? detail.item.subjectLabel,
      initialStem: extracted.stem ?? detail.item.problemTitle ?? "다음 각 선지를 독립 O/X로 판단하세요.",
      initialChoiceText: confirmedText,
      retrySourceItemId: detail.item.id,
      sourceKind: "capture",
      sourceLoadStatus: "unclear",
    };
  }

  const statements = normalizeFiveChoiceItemToStatements({
    id: detail.item.id,
    subject: extracted.subject ?? detail.item.subjectLabel,
    stem: extracted.stem ?? detail.item.problemTitle ?? undefined,
    choices: extracted.choices,
    topicCandidate: detail.item.problemTitle ?? undefined,
    conceptCandidate: detail.item.keyConcepts?.[0],
  });

  return {
    initialStatements: statements,
    initialSubject: extracted.subject ?? detail.item.subjectLabel,
    initialStem: extracted.stem ?? detail.item.problemTitle ?? "",
    initialChoiceText: extracted.choices.join("\n"),
    retrySourceItemId: detail.item.id,
    sourceKind: "capture",
    sourceLoadStatus: "loaded",
  };
}

function getConfirmedCaptureText(item: WrongAnswerItemRecord) {
  const rawPayload = item.rawPayload ?? {};
  const confirmed = rawPayload.user_confirmed_fields;
  if (typeof confirmed === "object" && confirmed && typeof (confirmed as Record<string, unknown>).rawQuestionText === "string") {
    return String((confirmed as Record<string, unknown>).rawQuestionText);
  }
  if (typeof rawPayload.raw_ocr_text === "string" && rawPayload.raw_ocr_text.trim()) return rawPayload.raw_ocr_text;
  return item.rawQuestionText ?? "";
}

async function loadFirstOxRetryState(userId: string, email: string, retryItemId: string): Promise<FirstOxRetryState> {
  const detail = await reviewOsService.getWrongAnswerDetail(userId, email, retryItemId).catch(() => null);
  if (!detail || detail.item.userId !== userId || !isFirstOxRetryItem(detail.item)) {
    return { retryLoadStatus: "not_found" };
  }

  const raw = splitFirstOxRawQuestionText(detail.item.rawQuestionText);
  if (!raw.statement) {
    return { retryLoadStatus: "not_found" };
  }

  const conceptCard = detail.item.conceptCard;
  const expectedOx = isKnownOx(detail.item.correctAnswer) ? detail.item.correctAnswer : undefined;
  const statement: FirstExamStatement = {
    id: detail.item.problemIdentifier ?? detail.item.id,
    sourceLearningItemId: detail.item.id,
    subject: detail.item.subjectLabel,
    stem: raw.stem ?? undefined,
    statementText: raw.statement,
    expectedOx,
    trapWords: conceptCard?.trapWords?.length ? conceptCard.trapWords : extractFirstOxTrapWords(raw.statement),
    topicCandidate: conceptCard?.topic_candidate ?? undefined,
    conceptCandidate: conceptCard?.concept_candidate ?? undefined,
  };

  return {
    initialStatements: [statement],
    initialSubject: detail.item.subjectLabel,
    initialStem: raw.stem ?? "",
    initialChoiceText: raw.statement,
    retrySourceItemId: detail.item.id,
    retryLoadStatus: "loaded",
    sourceKind: "retry",
  };
}

function isFirstOxRetryItem(item: WrongAnswerItemRecord) {
  return item.conceptCard?.sourceType === "first_ox" || item.sourceLabel === "1차 O/X 역공학";
}

function isKnownOx(value: string | undefined | null): value is "O" | "X" {
  return value === "O" || value === "X";
}

function splitFirstOxRawQuestionText(rawQuestionText: string | undefined | null) {
  const lines = (rawQuestionText ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { statement: "", stem: null };
  if (lines.length === 1) return { statement: lines[0], stem: null };
  return { statement: lines.at(-1) ?? lines.join("\n"), stem: lines.slice(0, -1).join("\n") };
}
