"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReviewQueueCard } from "@/lib/review-os/types";

export function ReviewQueueClient({ items, mode }: { items: ReviewQueueCard[]; mode: "first" | "second" }) {
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
      <div className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-6 text-sm leading-7 text-[color:var(--ink-muted)]">
        <p>아직 복습 큐가 비어 있습니다.</p>
        <p className="mt-1">오늘은 이것부터 하세요.</p>
        <p className="mt-1">기록을 하나 저장하면 오늘 할 일이 정리됩니다.</p>
        <p className="mt-1">공부한 흔적을 하나 올리면 오늘 계획과 복습 큐가 업데이트됩니다.</p>
        <Button type="button" onClick={() => router.push(mode === "second" ? "/app/write?mode=second" : "/app/capture?mode=first")} className="mt-4 w-full sm:w-auto">오늘 기록 남기기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <section
          key={item.queueId}
          className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-elevated)] p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <p className="text-xs text-[color:var(--muted)]">{item.subjectLabel}</p>
              <h3 className="text-base font-medium leading-7 text-[color:var(--foreground-strong)] sm:text-lg">
                {item.problemTitle}
              </h3>
              <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
                {item.createdFromCapture ? "반복 신호와 최근 기록 기준" : `다시 보는 이유: ${item.reviewReason}`}
              </p>
              {item.createdFromCapture ? (
                <p className="text-xs text-[color:var(--muted)]">오늘 한 것</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {buildPrioritySignals(item).map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-3 py-1 text-xs text-[color:var(--muted)]"
                  >
                    {signal}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[color:var(--muted)]">
                다음 행동: {item.examName === "감정평가사 2차" ? "문단 하나 다시쓰기" : "놓친 조건 1개 회상 후 짧은 재시도"}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-52 sm:items-end">
              <Button type="button" onClick={() => router.push(`/app/items/${item.itemId}?mode=${mode}`)} className="w-full sm:w-auto">
                {item.createdFromCapture ? "다시 보기" : "항목 열고 바로 실행"}
              </Button>
              <button
                type="button"
                onClick={() => void complete(item.queueId)}
                disabled={pendingId === item.queueId}
                className="text-xs text-[color:var(--muted)] underline-offset-2 hover:underline disabled:cursor-not-allowed"
              >
                {pendingId === item.queueId ? "처리 중" : "이미 수행했다면 조용히 완료 처리"}
              </button>
              {inlineErrorByQueueId[item.queueId] ? (
                <p className="max-w-full text-left text-xs text-[color:var(--danger)] sm:max-w-52 sm:text-right">
                  {inlineErrorByQueueId[item.queueId]}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function buildPrioritySignals(item: ReviewQueueCard): string[] {
  const signals: string[] = [];
  if (item.recurrenceCount >= 2) {
    signals.push(`반복 실수 ${item.recurrenceCount}회`);
  }
  if (item.confidence === "낮음") {
    signals.push("낮은 확신도");
  }
  if ((item.timeSpentSeconds ?? 0) >= 120) {
    signals.push("풀이 시간 지연");
  }
  signals.push(item.mistakeType);
  return signals;
}
