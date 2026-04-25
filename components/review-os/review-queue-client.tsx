"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReviewCompletionAction, ReviewQueueCard } from "@/lib/review-os/types";

export function ReviewQueueClient({ items }: { items: ReviewQueueCard[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [inlineErrorByQueueId, setInlineErrorByQueueId] = useState<Record<string, string>>({});
  const defaultActionsByQueueId = useMemo(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.queueId,
          item.examName === "감정평가사 2차" ? "second_paragraph_rewrite" : "first_confirm_recall",
        ]),
      ) as Record<string, ReviewCompletionAction>,
    [items],
  );
  const [actionsByQueueId, setActionsByQueueId] = useState<Record<string, ReviewCompletionAction>>({});

  async function complete(queueId: string) {
    const selectedAction = actionsByQueueId[queueId] ?? defaultActionsByQueueId[queueId];
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
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 text-sm leading-7 text-[color:var(--muted)]">
        오늘 다시 볼 항목이 없습니다. 1차는 민법 오답 1개를, 2차는 답안 한 건을 먼저 기록해 보세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <section
          key={item.queueId}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs text-[color:var(--muted)]">
                {item.examName} · {item.subjectLabel} · {item.topicTag}
              </p>
              <h3 className="text-lg font-medium text-[color:var(--foreground-strong)]">{item.problemTitle}</h3>
              <p className="text-sm leading-7 text-[color:var(--muted)]">{item.reviewReason}</p>
              <p className="text-sm text-[color:var(--foreground-strong)]">
                반복 {item.recurrenceCount}회 · {item.mistakeType}
              </p>
              {item.examName === "감정평가사 1차" ? (
                <div className="space-y-1 rounded-[var(--radius-md)] border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] p-3">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">해설 전에 10초 회상</p>
                  <p className="text-sm leading-6 text-[color:var(--muted)]">
                    해설 보기 전에, 이 선지가 틀린 이유를 한 문장으로 먼저 떠올리세요.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-muted)] p-3">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">완료 전에 다음 행동을 하나 선택하세요.</p>
                <div className="space-y-2 text-sm text-[color:var(--foreground)]">
                  {(item.examName === "감정평가사 2차"
                    ? [
                        { value: "second_paragraph_rewrite", label: "문단 재작성 후 완료" },
                        { value: "second_keep_scheduled_rewrite", label: "예약된 재작성 일정 유지" },
                      ]
                    : [
                        { value: "first_short_retry", label: "짧은 재시도 후 완료" },
                        { value: "first_confirm_recall", label: "핵심 근거를 먼저 회상하고 완료" },
                        { value: "first_keep_scheduled_review", label: "예약된 복습 일정 유지" },
                      ]
                  ).map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        className="h-4 w-4"
                        name={`next-action-${item.queueId}`}
                        value={option.value}
                        checked={(actionsByQueueId[item.queueId] ?? defaultActionsByQueueId[item.queueId]) === option.value}
                        onChange={() =>
                          setActionsByQueueId((prev) => ({
                            ...prev,
                            [item.queueId]: option.value as ReviewCompletionAction,
                          }))
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button type="button" onClick={() => router.push(`/app/items/${item.itemId}`)}>
                항목 열기
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void complete(item.queueId)}
                disabled={pendingId === item.queueId}
              >
                {pendingId === item.queueId ? "처리 중" : "완료하고 다음 복습 예약"}
              </Button>
              {inlineErrorByQueueId[item.queueId] ? (
                <p className="max-w-52 text-right text-xs text-[color:var(--danger)]">{inlineErrorByQueueId[item.queueId]}</p>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
