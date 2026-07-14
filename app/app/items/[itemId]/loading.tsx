import { LearnerLoadingState } from "@/components/learner";

export default function StudyLedgerDetailLoading() {
  return (
    <div
      data-s228-state="loading"
      className="mx-auto w-full max-w-[var(--ledger-reading-column)]"
      aria-busy="true"
    >
      <LearnerLoadingState
        title="학습 원장을 불러오는 중입니다."
        description="가장 큰 간극과 다음 복습 기록을 정리하고 있습니다."
      />
    </div>
  );
}
