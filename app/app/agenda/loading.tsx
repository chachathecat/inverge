import { CoreRouteReadLoadingPage } from "@/components/review-os/core-route-read-state";

export default function LearningRecordTimelineLoading() {
  return (
    <div className="mx-auto w-full max-w-[1048px]" data-s230-state="loading" aria-busy="true">
      <CoreRouteReadLoadingPage surface="agenda" />
    </div>
  );
}
