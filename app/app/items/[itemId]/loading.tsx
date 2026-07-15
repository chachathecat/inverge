import { LearnerLoadingState } from "@/components/learner";
import { StudyLedgerFocusChrome } from "@/components/learner/study-ledger-focus-chrome";

export default function StudyLedgerDetailLoading() {
  return (
    <>
      <StudyLedgerFocusChrome mobileStatus="불러오는 중" />
      <div
        id="study-ledger-content"
        tabIndex={-1}
        data-s228-state="loading"
        className="mx-auto w-full max-w-[var(--ledger-reading-column)] px-5 py-6 lg:px-0 lg:py-10"
        aria-busy="true"
      >
        <LearnerLoadingState
          title="학습 노트를 불러오는 중입니다."
          description="가장 큰 간극과 다음 복습 기록을 정리하고 있습니다."
        />
      </div>
    </>
  );
}
