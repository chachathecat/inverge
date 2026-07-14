import { LearnerLoadingState } from "@/components/learner";

export default function LearningRecordTimelineLoading() {
  return (
    <div className="mx-auto w-full max-w-[1048px]" data-s230-state="loading" aria-busy="true">
      <LearnerLoadingState
        title="학습 회복 기록을 불러오는 중입니다."
        description="이번 주 흐름과 다음 복습 일정을 시간순으로 정리하고 있습니다."
      />
    </div>
  );
}
