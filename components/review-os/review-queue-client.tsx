"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReviewQueueCard } from "@/lib/review-os/types";

export function ReviewQueueClient({ items }: { items: ReviewQueueCard[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function complete(queueId: string) {
    setPendingId(queueId);
    try {
      await fetch(`/api/os/review-queue/${queueId}/complete`, { method: "POST" });
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
                {pendingId === item.queueId ? "처리 중" : "오늘 정리 완료"}
              </Button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
