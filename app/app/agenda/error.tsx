"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { LearnerErrorState, LearnerPrimaryButton } from "@/components/learner";

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getConnectionSnapshot() {
  return navigator.onLine;
}

function getServerConnectionSnapshot() {
  return true;
}

export default function LearningRecordTimelineError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    getConnectionSnapshot,
    getServerConnectionSnapshot,
  );

  return (
    <div className="mx-auto w-full max-w-[1048px]" data-s230-state={isOnline ? "error" : "offline"}>
      <LearnerErrorState
        title={isOnline ? "학습 회복 기록을 열지 못했습니다." : "현재 오프라인입니다."}
        description={
          isOnline
            ? "저장된 기록을 불러오는 중 문제가 생겼습니다. 잠시 후 다시 시도하거나 오늘 학습으로 돌아가세요."
            : "연결 상태를 확인한 뒤 다시 시도하세요. 확인되지 않은 기록을 새로 만들거나 완료로 표시하지 않습니다."
        }
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <LearnerPrimaryButton type="button" onClick={reset}>다시 시도</LearnerPrimaryButton>
            <Link
              href="/app?mode=second"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-semibold text-[var(--foreground-strong)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              오늘 학습으로 돌아가기
            </Link>
          </div>
        }
      />
    </div>
  );
}
