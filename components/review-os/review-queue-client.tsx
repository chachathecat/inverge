"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SmartClozeReview } from "@/components/review-os/smart-cloze-review";
import { Button } from "@/components/ui/button";
import {
  getRecallOutcomeCopy,
  getRetrievalPrompt,
  getSuggestedReviewIntervalCopy,
  RECALL_OUTCOME_OPTIONS,
} from "@/lib/review-os/retrieval-review";
import type { RecallOutcome, ReviewCompletionMetadata, ReviewQueueCard } from "@/lib/review-os/types";

export function ReviewQueueClient({
  items,
  mode,
  captureReferenceLineByItemId = {},
}: {
  items: ReviewQueueCard[];
  mode: "first" | "second";
  captureReferenceLineByItemId?: Record<string, string>;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [inlineErrorByQueueId, setInlineErrorByQueueId] = useState<Record<string, string>>({});
  const [recallAttemptTextByQueueId, setRecallAttemptTextByQueueId] = useState<Record<string, string>>({});
  const [revealedHintByQueueId, setRevealedHintByQueueId] = useState<Record<string, boolean>>({});
  const [recallOutcomeByQueueId, setRecallOutcomeByQueueId] = useState<Record<string, RecallOutcome | null>>({});

  async function complete(queueId: string) {
    const item = items.find((candidate) => candidate.queueId === queueId);
    const selectedAction = item?.examName === "감정평가사 2차" ? "second_paragraph_rewrite" : "first_confirm_recall";
    if (!selectedAction) return;
    const metadata = buildReviewCompletionMetadata(
      recallAttemptTextByQueueId[queueId] ?? "",
      recallOutcomeByQueueId[queueId] ?? null,
    );
    setInlineErrorByQueueId((prev) => ({ ...prev, [queueId]: "" }));
    setPendingId(queueId);
    try {
      const response = await fetch(`/api/os/review-queue/${queueId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction, metadata }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setInlineErrorByQueueId((prev) => ({
          ...prev,
          [queueId]: data?.message ?? "복습 완료 저장 중 문제가 있었습니다. 잠시 후 다시 시도해 주세요.",
        }));
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-6 text-sm leading-7 text-[color:var(--ink-muted)]"
        data-review-empty-state
      >
        <h2 className="text-base font-semibold text-[color:var(--foreground-strong)]">지금 복습할 항목이 없습니다.</h2>
        <p className="mt-2">오늘 한 것을 올리면 복습할 항목이 만들어집니다.</p>
        <p className="mt-1">저장된 학습 노트의 가장 큰 약점과 다음 행동이 복습 예정으로 이어집니다.</p>
        <Button
          type="button"
          onClick={() => router.push(mode === "second" ? "/app/capture?mode=second" : "/app/capture?mode=first")}
          className="mt-4 w-full sm:w-auto"
        >
          오늘 한 것 올리기
        </Button>
      </div>
    );
  }

  const primaryItem = items[0]!;
  const candidateItems = items.slice(1);
  const primaryNextAction = getReviewNextAction(primaryItem);
  const primaryRecallText = recallAttemptTextByQueueId[primaryItem.queueId] ?? "";
  const primaryOutcome = recallOutcomeByQueueId[primaryItem.queueId] ?? null;
  const hasRevealedHint = Boolean(revealedHintByQueueId[primaryItem.queueId]) || primaryRecallText.trim().length > 0;
  const retrievalPrompt = getRetrievalPrompt(primaryItem, mode);

  return (
    <div className="space-y-4">
      <section
        className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-elevated)] p-4 sm:p-5"
        data-review-primary-surface
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <span className="inline-flex w-fit rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]">
              지금 복습할 1개
            </span>
            <p className="text-xs text-[color:var(--muted)]">{primaryItem.subjectLabel}</p>
            <h3 className="text-base font-medium leading-7 text-[color:var(--foreground-strong)] sm:text-lg">
              {primaryItem.problemTitle}
            </h3>
          </div>

          <section
            className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4"
            data-review-retrieval-step="recall"
          >
            <p className="text-xs font-semibold text-[color:var(--muted)]">1. 먼저 떠올리기</p>
            <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">
              {mode === "second" ? "문단/기준 먼저 떠올리기" : "먼저 떠올리기"}
            </p>
            <p className="mt-1 text-sm leading-7 text-[color:var(--foreground-strong)]">{retrievalPrompt}</p>
            <textarea
              value={primaryRecallText}
              onChange={(event) =>
                setRecallAttemptTextByQueueId((prev) => ({
                  ...prev,
                  [primaryItem.queueId]: event.target.value,
                }))
              }
              rows={3}
              className="mt-3 w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm leading-6 text-[color:var(--foreground-strong)] outline-none focus:border-[color:var(--brand-700)]"
              placeholder="답을 보기 전, 기억나는 기준을 먼저 적어보세요."
              aria-label="복습 전 먼저 떠올린 내용"
              data-review-recall-input
            />
            <Button
              type="button"
              onClick={() => setRevealedHintByQueueId((prev) => ({ ...prev, [primaryItem.queueId]: true }))}
              className="mt-3 w-full sm:w-auto"
            >
              확인하기
            </Button>
          </section>

          {hasRevealedHint ? (
            <section
              className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-4"
              data-review-retrieval-step="check"
            >
              <p className="text-xs font-semibold text-[color:var(--muted)]">2. 확인하기</p>
              <div className="mt-2 space-y-2 text-sm leading-7 text-[color:var(--foreground-strong)]">
                <p>이유: {getReviewReason(primaryItem)}</p>
                <p>다음 행동: {primaryNextAction}</p>
              </div>
              {primaryItem.examName === "감정평가사 1차" &&
              primaryItem.rawQuestionText &&
              (primaryItem.conceptCard?.reviewStage === "빈칸" || primaryItem.clozeCandidate) ? (
                <div className="mt-3">
                  <SmartClozeReview
                    statement={primaryItem.rawQuestionText}
                    trapWords={primaryItem.conceptCard?.trapWords ?? (primaryItem.clozeCandidate ? [primaryItem.clozeCandidate] : [])}
                    conceptCandidate={primaryItem.clozeCandidate}
                  />
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => router.push(`/app/items/${primaryItem.itemId}?mode=${mode}`)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  학습 노트 보기
                </Button>
              </div>
              <details
                className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"
                data-review-extra-signals
              >
                <summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">상세 신호 보기</summary>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-[color:var(--muted)]">
                  {buildDetailedSignals(primaryItem, captureReferenceLineByItemId[primaryItem.itemId]).map((signal) => (
                    <li key={signal}>• {signal}</li>
                  ))}
                </ul>
              </details>
            </section>
          ) : (
            <p className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-xs leading-5 text-[color:var(--muted)]">
              상세 신호와 학습 노트는 먼저 떠올린 뒤 확인합니다.
            </p>
          )}

          {hasRevealedHint ? (
            <section
              className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4"
              data-review-retrieval-step="self-rating"
            >
              <p className="text-xs font-semibold text-[color:var(--muted)]">3. 자기평가</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]">
                이 평가는 점수가 아니라 다음 복습 간격을 정하기 위한 학습 신호입니다.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-4" role="group" aria-label="복습 자기평가">
                {RECALL_OUTCOME_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={primaryOutcome === option.value ? "default" : "outline"}
                    onClick={() => setRecallOutcomeByQueueId((prev) => ({ ...prev, [primaryItem.queueId]: option.value }))}
                    className="h-9 px-3 text-xs"
                    aria-pressed={primaryOutcome === option.value}
                    data-review-recall-outcome={option.value}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {primaryOutcome ? (
                <div
                  className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-xs leading-6 text-[color:var(--muted)]"
                  data-review-interval-suggestion
                >
                  <p>
                    선택: {getRecallOutcomeCopy(primaryOutcome)} · 제안: {getSuggestedReviewIntervalCopy(primaryOutcome)}
                  </p>
                  <p>이번 PR에서는 복습 완료 신호만 저장하고, 세부 간격 조정은 다음 단계에서 연결합니다.</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  onClick={() => void complete(primaryItem.queueId)}
                  disabled={pendingId === primaryItem.queueId || !primaryOutcome}
                  className="w-full sm:w-auto"
                  aria-label={`복습 완료: ${primaryItem.problemTitle}`}
                >
                  {pendingId === primaryItem.queueId ? "복습 완료 저장 중" : "복습 완료"}
                </Button>
                {!primaryOutcome ? <p className="text-xs text-[color:var(--muted)]">자기평가를 고르면 복습 완료를 저장할 수 있습니다.</p> : null}
              </div>
              {inlineErrorByQueueId[primaryItem.queueId] ? (
                <p className="mt-2 text-xs text-[color:var(--danger)]">{inlineErrorByQueueId[primaryItem.queueId]}</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>

      {candidateItems.length > 0 ? (
        <section
          className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)] p-4"
          data-review-secondary-list
        >
          <h3 className="text-sm font-semibold text-[color:var(--foreground-strong)]">다음 복습 후보</h3>
          <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
            {candidateItems.map((item) => (
              <li key={item.queueId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-[color:var(--muted)]">
                    복습 예정 · {item.createdFromCapture ? "학습 노트에서 생성됨" : "미완료 항목"} · {item.subjectLabel}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-[color:var(--foreground-strong)]">{item.problemTitle}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {getReviewNextAction(item)}</p>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button type="button" onClick={() => router.push(`/app/items/${item.itemId}?mode=${mode}`)} variant="outline" className="h-9 px-3 text-xs">
                    보기
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void complete(item.queueId)}
                    disabled={pendingId === item.queueId}
                    variant="ghost"
                    className="h-9 px-3 text-xs"
                    aria-label={`복습 완료: ${item.problemTitle}`}
                  >
                    {pendingId === item.queueId ? "처리 중" : "복습 완료"}
                  </Button>
                </div>
                {inlineErrorByQueueId[item.queueId] ? <p className="text-xs text-[color:var(--danger)]">{inlineErrorByQueueId[item.queueId]}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function buildReviewCompletionMetadata(recallAttemptText: string, recallOutcome: RecallOutcome | null): ReviewCompletionMetadata {
  const retrievalSentence = recallAttemptText.trim();
  return {
    ...(retrievalSentence ? { retrievalSentence } : {}),
    ...(recallOutcome
      ? {
          recallOutcome,
          suggestedReviewInterval: getSuggestedReviewIntervalCopy(recallOutcome),
          retrievalReviewVersion: "v1" as const,
        }
      : {}),
  };
}

function getReviewNextAction(item: ReviewQueueCard) {
  return item.examName === "감정평가사 2차" ? "문단 하나 다시쓰기" : "놓친 조건 1개 회상 후 짧은 재시도";
}

function getReviewReason(item: ReviewQueueCard) {
  return item.createdFromCapture ? "방금 남긴 기록이라 기억이 남아 있을 때 바로 연결합니다." : item.reviewReason;
}

function buildDetailedSignals(item: ReviewQueueCard, captureReferenceLine?: string): string[] {
  const signals = [
    `상태: 복습 예정`,
    `출처: ${item.createdFromCapture ? "학습 노트에서 생성됨" : "미완료 항목"}`,
    `복습 이유: ${item.reviewReason}`,
    `실수 유형: ${item.mistakeType}`,
  ];
  if (item.recurrenceCount >= 2) signals.push(`반복 신호: ${item.recurrenceCount}회`);
  if (item.confidence) signals.push(`확신도: ${item.confidence}`);
  if (typeof item.timeSpentSeconds === "number") signals.push(`풀이 시간: ${item.timeSpentSeconds}초`);
  if (captureReferenceLine) signals.push(`오늘 한 것 참고: ${captureReferenceLine}`);
  signals.push("복습 완료를 누르면 이 항목은 현재 복습 목록에서 빠집니다.");
  return signals;
}
