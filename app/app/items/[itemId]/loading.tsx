"use client";

import { useSearchParams } from "next/navigation";

import { LearnerLoadingState, V3Surface } from "@/components/learner";
import { StudyLedgerFocusChrome } from "@/components/learner/study-ledger-focus-chrome";

export default function StudyLedgerDetailLoading() {
  const isSecond = useSearchParams().get("mode") === "second";
  return (
    <>
      <StudyLedgerFocusChrome mobileStatus="불러오는 중" />
      <div
        id="study-ledger-content"
        tabIndex={-1}
        data-s228-state="loading"
        className="mx-auto w-full max-w-[var(--ledger-reading-column)] px-5 py-6 lg:px-0 lg:py-10"
        aria-busy="true"
        role="status"
        aria-live="polite"
      >
        {isSecond ? (
          <V3Surface as="section" tone="subtle" className="space-y-3">
            <p className="v3-type-caption text-[var(--color-text-secondary)]">학습 노트 · 불러오는 중</p>
            <h2 className="v3-type-section ko-keep text-[var(--color-text-primary)]">학습 노트를 불러오는 중입니다.</h2>
            <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">가장 큰 간극과 다음 복습 기록을 정리하고 있습니다.</p>
          </V3Surface>
        ) : (
          <LearnerLoadingState
            title="학습 노트를 불러오는 중입니다."
            description="가장 큰 간극과 다음 복습 기록을 정리하고 있습니다."
          />
        )}
      </div>
    </>
  );
}
