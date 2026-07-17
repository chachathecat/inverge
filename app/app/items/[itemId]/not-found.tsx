"use client";

import { useSearchParams } from "next/navigation";

import { LearnerEmptyState, LearnerPrimaryLink, V3ActionLink, V3Surface } from "@/components/learner";
import { StudyLedgerFocusChrome } from "@/components/learner/study-ledger-focus-chrome";

export default function StudyLedgerDetailNotFound() {
  const isSecond = useSearchParams().get("mode") === "second";
  return (
    <>
      <StudyLedgerFocusChrome mobileStatus="기록 없음" />
      <div
        id="study-ledger-content"
        tabIndex={-1}
        data-s228-state="empty"
        className="mx-auto w-full max-w-[var(--ledger-reading-column)] px-5 py-6 lg:px-0 lg:py-10"
      >
        {isSecond ? (
          <V3Surface as="section" tone="subtle" className="space-y-4">
            <p className="v3-type-caption text-[var(--color-text-secondary)]">학습 노트 · 기록 없음</p>
            <h2 className="v3-type-section ko-keep text-[var(--color-text-primary)]">이 학습 기록을 찾을 수 없습니다.</h2>
            <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">삭제되었거나 현재 계정에서 볼 수 없는 기록입니다. 학습 노트에서 다른 기록을 선택하세요.</p>
            <V3ActionLink href="/app/items?mode=second">학습 노트로 돌아가기</V3ActionLink>
          </V3Surface>
        ) : (
          <LearnerEmptyState
            title="이 학습 기록을 찾을 수 없습니다."
            description="삭제되었거나 현재 계정에서 볼 수 없는 기록입니다. 학습 노트에서 다른 기록을 선택하세요."
            action={
              <LearnerPrimaryLink href="/app/items?mode=first">
                학습 노트로 돌아가기
              </LearnerPrimaryLink>
            }
          />
        )}
      </div>
    </>
  );
}
