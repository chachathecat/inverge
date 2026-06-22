"use client";

import { useCallback, useState } from "react";

import type { CalculatorRoutineCompletionSignalV1 } from "@/lib/review-os/calculator-routine";
import type { CalculatorRoutineSyncStatus } from "@/lib/review-os/calculator-routine-learning-signal";

export type CalculatorRoutineSyncState = {
  status: "idle" | "syncing" | CalculatorRoutineSyncStatus;
  retryAvailable: boolean;
};

export function useCalculatorRoutineLearningSignalSync() {
  const [status, setStatus] = useState<CalculatorRoutineSyncState["status"]>("idle");
  const [lastSignal, setLastSignal] = useState<CalculatorRoutineCompletionSignalV1 | null>(null);

  const syncCompletion = useCallback(async (signal: CalculatorRoutineCompletionSignalV1) => {
    setLastSignal(signal);
    setStatus("syncing");
    try {
      const response = await fetch("/api/os/calculator-routine/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signal),
      });
      if (response.status === 401) {
        setStatus("local_only");
        return;
      }
      if (!response.ok) {
        setStatus("failed");
        return;
      }
      const data = (await response.json().catch(() => null)) as { status?: "saved" | "deduped" } | null;
      setStatus(data?.status === "deduped" ? "deduped" : "saved");
    } catch {
      setStatus("failed");
    }
  }, []);

  const retry = useCallback(() => {
    if (lastSignal) void syncCompletion(lastSignal);
  }, [lastSignal, syncCompletion]);

  const reset = useCallback(() => {
    setStatus("idle");
    setLastSignal(null);
  }, []);

  return {
    status,
    reset,
    retry,
    retryAvailable: status === "failed" && Boolean(lastSignal),
    syncCompletion,
  };
}

export function CalculatorRoutineSyncStatusLine({
  status,
  retryAvailable,
  onRetry,
}: {
  status: CalculatorRoutineSyncState["status"];
  retryAvailable?: boolean;
  onRetry?: () => void;
}) {
  if (status === "idle") return null;
  const copy =
    status === "syncing"
      ? "학습 신호 저장 중"
      : status === "saved"
        ? "학습 기록에 연결됨"
        : status === "deduped"
          ? "이미 연결된 학습 기록입니다"
          : status === "local_only"
            ? "로그인 후 학습 기록에 연결할 수 있습니다"
            : "학습 기록 연결 실패";

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-caption leading-5 text-[color:var(--muted)]">
      <span>{copy}</span>
      {retryAvailable && onRetry ? (
        <button type="button" className="ml-2 font-medium text-[color:var(--foreground-strong)] underline" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
