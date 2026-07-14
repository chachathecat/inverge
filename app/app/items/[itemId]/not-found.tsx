import { LearnerEmptyState, LearnerPrimaryLink } from "@/components/learner";

export default function StudyLedgerDetailNotFound() {
  return (
    <div data-s228-state="empty" className="mx-auto w-full max-w-[var(--ledger-reading-column)]">
      <LearnerEmptyState
        title="이 학습 기록을 찾을 수 없습니다."
        description="삭제되었거나 현재 계정에서 볼 수 없는 기록입니다. 학습 원장에서 다른 기록을 선택하세요."
        action={
          <LearnerPrimaryLink href="/app/items?mode=second">
            학습 원장으로 돌아가기
          </LearnerPrimaryLink>
        }
      />
    </div>
  );
}
