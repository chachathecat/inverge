"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { LearnerErrorState, LearnerPrimaryButton } from "@/components/learner";
import { StudyLedgerFocusChrome } from "@/components/learner/study-ledger-focus-chrome";

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

export default function StudyLedgerDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    getConnectionSnapshot,
    getServerConnectionSnapshot,
  );

  return (
    <>
      <StudyLedgerFocusChrome mobileStatus="확인 필요" />
      <div
        id="study-ledger-content"
        tabIndex={-1}
        data-s228-state={isOnline ? "error" : "offline"}
        className="mx-auto w-full max-w-[var(--ledger-reading-column)] px-5 py-6 lg:px-0 lg:py-10"
      >
        <LearnerErrorState
          title={isOnline ? "학습 노트를 열지 못했습니다." : "현재 오프라인입니다."}
          description={
            isOnline
              ? "잠시 후 다시 시도하세요. 계속 열리지 않으면 학습 노트로 돌아가 다른 기록을 확인할 수 있습니다."
              : "연결 상태를 확인한 뒤 다시 시도하세요. 이 화면에서는 확인되지 않은 내용을 새로 저장하지 않습니다."
          }
          action={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <LearnerPrimaryButton type="button" onClick={reset}>
                다시 시도
              </LearnerPrimaryButton>
              <Link
                href="/app/items?mode=second"
                className="inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                학습 노트로 돌아가기
              </Link>
            </div>
          }
        />
      </div>
    </>
  );
}
