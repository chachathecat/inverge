"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SmartClozeReview } from "@/components/review-os/smart-cloze-review";
import { Button } from "@/components/ui/button";
import type { ReviewQueueCard } from "@/lib/review-os/types";

export function ReviewQueueClient({ items, mode, captureReferenceLineByItemId = {} }: { items: ReviewQueueCard[]; mode: "first" | "second"; captureReferenceLineByItemId?: Record<string,string> }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [inlineErrorByQueueId, setInlineErrorByQueueId] = useState<Record<string, string>>({});

  async function complete(queueId: string) {
    const item = items.find((candidate) => candidate.queueId === queueId);
    const selectedAction = item?.examName === "감정평가사 2차" ? "second_paragraph_rewrite" : "first_confirm_recall";
    if (!selectedAction) return;
    setInlineErrorByQueueId((prev) => ({ ...prev, [queueId]: "" }));
    setPendingId(queueId);
    try {
      const response = await fetch(`/api/os/review-queue/${queueId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        setInlineErrorByQueueId((prev) => ({
          ...prev,
          [queueId]: data?.message ?? "완료 처리 중 문제가 있었습니다. 잠시 후 다시 시도해 주세요.",
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

  return (
    <div className="space-y-4">
      <section
        className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-elevated)] p-4 sm:p-5"
        data-review-primary-surface
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <span className="inline-flex w-fit rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]">
              지금 복습할 1개
            </span>
            <p className="text-xs text-[color:var(--muted)]">{primaryItem.subjectLabel}</p>
            <h3 className="text-base font-medium leading-7 text-[color:var(--foreground-strong)] sm:text-lg">
              {primaryItem.problemTitle}
            </h3>
            <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
              이유: {getReviewReason(primaryItem)}
            </p>
            <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">다음 행동: {primaryNextAction}</p>
            {primaryItem.examName === "감정평가사 1차" && primaryItem.rawQuestionText && (primaryItem.conceptCard?.reviewStage === "빈칸" || primaryItem.clozeCandidate) ? (
              <SmartClozeReview statement={primaryItem.rawQuestionText} trapWords={primaryItem.conceptCard?.trapWords ?? (primaryItem.clozeCandidate ? [primaryItem.clozeCandidate] : [])} conceptCandidate={primaryItem.clozeCandidate} />
            ) : null}
            <details
              className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-3"
              data-review-extra-signals
            >
              <summary className="cursor-pointer text-xs font-medium text-[color:var(--muted)]">상세 신호 보기</summary>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-[color:var(--muted)]">
                {buildDetailedSignals(primaryItem, captureReferenceLineByItemId[primaryItem.itemId]).map((signal) => (
                  <li key={signal}>• {signal}</li>
                ))}
              </ul>
            </details>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-52 sm:items-end">
            <Button type="button" onClick={() => router.push(`/app/items/${primaryItem.itemId}?mode=${mode}`)} className="w-full sm:w-auto">
              {getReviewPrimaryCtaLabel(primaryItem)}
            </Button>
            <Button
              type="button"
              onClick={() => void complete(primaryItem.queueId)}
              disabled={pendingId === primaryItem.queueId}
              variant="outline"
              className="h-9 w-full px-4 text-xs sm:w-auto"
              aria-label={`복습 완료: ${primaryItem.problemTitle}`}
            >
              {pendingId === primaryItem.queueId ? "완료 처리 중" : "완료 처리"}
            </Button>
            {inlineErrorByQueueId[primaryItem.queueId] ? (
              <p className="max-w-full text-left text-xs text-[color:var(--danger)] sm:max-w-52 sm:text-right">
                {inlineErrorByQueueId[primaryItem.queueId]}
              </p>
            ) : null}
          </div>
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
                    {pendingId === item.queueId ? "처리 중" : "완료"}
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

function getReviewPrimaryCtaLabel(item: ReviewQueueCard) {
  return item.examName === "감정평가사 2차" ? "문단 다시쓰기" : "지금 복습하기";
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
