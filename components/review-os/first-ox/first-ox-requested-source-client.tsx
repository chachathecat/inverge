"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FirstOxPracticeClient,
  type FirstOxPracticeClientProps,
} from "@/components/review-os/first-ox/first-ox-practice-client";
import { RequestedSourceReadState } from "@/components/review-os/requested-source-read-state";
import {
  extractFirstExamFiveChoicesFromText,
  extractFirstOxTrapWords,
  normalizeFiveChoiceItemToStatements,
  type FirstExamStatement,
} from "@/lib/review-os/first-ox-engine";
import { readFirstOxSourceDetail } from "@/lib/review-os/first-ox-source-read";
import type { WrongAnswerDetail, WrongAnswerItemRecord } from "@/lib/review-os/types";

type RequestedFirstOxSourceKind = "capture" | "retry";

type RequestedSourceState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "missing" }>
  | Readonly<{ status: "unavailable" }>
  | Readonly<{ status: "ready"; practice: FirstOxPracticeClientProps }>;

export function FirstOxRequestedSourceClient({
  expectedUserId,
  itemId,
  sourceKind,
}: {
  expectedUserId: string;
  itemId: string;
  sourceKind: RequestedFirstOxSourceKind;
}) {
  const [state, setState] = useState<RequestedSourceState>({ status: "loading" });
  const generationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });

    const outcome = await readFirstOxSourceDetail(itemId, controller.signal);
    if (controller.signal.aborted || generationRef.current !== generation) return;
    if (outcome.status !== "ready") {
      setState({ status: outcome.status });
      return;
    }
    if (outcome.detail.item.userId !== expectedUserId) {
      setState({ status: "missing" });
      return;
    }

    const practice =
      sourceKind === "capture"
        ? buildFirstOxCaptureSourceState(outcome.detail)
        : buildFirstOxRetryState(outcome.detail);
    setState(practice ? { status: "ready", practice } : { status: "missing" });
  }, [expectedUserId, itemId, sourceKind]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      generationRef.current += 1;
      abortRef.current?.abort();
    };
  }, [load]);

  if (state.status !== "ready") {
    return (
      <RequestedSourceReadState
        surface="first_ox"
        status={state.status}
        returnHref="/app/first/ox"
        onRetry={state.status === "unavailable" ? () => void load() : undefined}
      />
    );
  }

  return (
    <FirstOxPracticeClient
      key={`${sourceKind}:${itemId}:${state.practice.retrySourceItemId ?? "ready"}`}
      {...state.practice}
    />
  );
}

function buildFirstOxCaptureSourceState(
  detail: WrongAnswerDetail,
): FirstOxPracticeClientProps | null {
  const createdFromCapture =
    detail.item.rawPayload?.created_from_capture === true ||
    detail.item.derivedPayload?.created_from_capture === true ||
    detail.item.createdFromCapture === true;
  if (
    detail.item.examName !== "감정평가사 1차" ||
    !createdFromCapture
  ) {
    return null;
  }

  const confirmedText = getConfirmedCaptureText(detail.item);
  const extracted = extractFirstExamFiveChoicesFromText(
    confirmedText,
    detail.item.subjectLabel,
  );
  if (extracted.status !== "detected" || extracted.choices.length !== 5) {
    return {
      initialStatements: [],
      initialSubject: extracted.subject ?? detail.item.subjectLabel,
      initialStem:
        extracted.stem ??
        detail.item.problemTitle ??
        "다음 각 선지를 독립 O/X로 판단하세요.",
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
  if (
    typeof confirmed === "object" &&
    confirmed &&
    typeof (confirmed as Record<string, unknown>).rawQuestionText === "string"
  ) {
    return String((confirmed as Record<string, unknown>).rawQuestionText);
  }
  if (
    typeof rawPayload.raw_ocr_text === "string" &&
    rawPayload.raw_ocr_text.trim()
  ) {
    return rawPayload.raw_ocr_text;
  }
  return item.rawQuestionText ?? "";
}

function buildFirstOxRetryState(
  detail: WrongAnswerDetail,
): FirstOxPracticeClientProps | null {
  if (
    detail.item.examName !== "감정평가사 1차" ||
    !isFirstOxRetryItem(detail.item)
  ) {
    return null;
  }

  const raw = splitFirstOxRawQuestionText(detail.item.rawQuestionText);
  if (!raw.statement) return null;

  const conceptCard = detail.item.conceptCard;
  const expectedOx = isKnownOx(detail.item.correctAnswer)
    ? detail.item.correctAnswer
    : undefined;
  const statement: FirstExamStatement = {
    id: detail.item.problemIdentifier ?? detail.item.id,
    sourceLearningItemId: detail.item.id,
    subject: detail.item.subjectLabel,
    stem: raw.stem ?? undefined,
    statementText: raw.statement,
    expectedOx,
    trapWords: conceptCard?.trapWords?.length
      ? conceptCard.trapWords
      : extractFirstOxTrapWords(raw.statement),
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
  return (
    item.conceptCard?.sourceType === "first_ox" ||
    item.sourceLabel === "1차 O/X 역공학"
  );
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
  return {
    statement: lines.at(-1) ?? lines.join("\n"),
    stem: lines.slice(0, -1).join("\n"),
  };
}
