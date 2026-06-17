import Link from "next/link";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { LocalBetaReviewCandidateSection } from "@/components/review-os/local-beta-note-reflection";
import { ReviewQueueClient } from "@/components/review-os/review-queue-client";
import { Button } from "@/components/ui/button";
import { DailyCommandCard, MinimalStepPanel, QuietDetails } from "@/components/review-os/minimal-study-system";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildReferenceSupportForExecution } from "@/lib/review-os/execution-reference-support";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsReviewPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/review", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const items = (await reviewOsService.getReviewQueue(session.userId, session.email).catch(() => [])).filter((item) => item.examName === config.label);
  const captureReferenceLineByItemId: Record<string, string> = {};
  await Promise.all(items.filter((item) => item.createdFromCapture).map(async (item) => {
    const detail = await reviewOsService.getWrongAnswerDetail(session.userId!, session.email!, item.itemId).catch(() => null);
    const support = buildReferenceSupportForExecution(detail?.item?.derivedPayload?.capture_note_engine_v2 ?? detail?.item?.derivedPayload?.capture_note_engine_v1 ?? null);
    const line = support?.topicCandidate ?? support?.skeletonKeywordHint ?? null;
    if (line) captureReferenceLineByItemId[item.itemId] = line;
  }));

  return (
    <div className="space-y-6">
      <ClosedBetaBanner />

      <div className="space-y-6">
      <DailyCommandCard
        title={mode === "second" ? "다시 볼 교정 포인트" : "오늘 다시 볼 항목"}
        description={mode === "second" ? "저장한 기록에서 문단 다시쓰기 후보를 골라 이어갑니다." : "저장한 오답에서 조건 1개 재확인과 재시도 후보를 골라 이어갑니다."}
      >
        <div className="pt-2">
          <ReviewQueueClient items={items} mode={mode} captureReferenceLineByItemId={captureReferenceLineByItemId} />
        </div>
      </DailyCommandCard>

      {items.length === 0 ? (
        <MinimalStepPanel title={mode === "second" ? "아직 계정 저장 교정 대기 항목이 없습니다" : "아직 계정 저장 기준으로 다시 볼 오답이 없습니다"}>
          <QuietDetails>
            <p>복습은 계정 저장 기록에서 다시 풀기·다시쓰기 후보를 모아 두는 곳입니다.</p>
            <p>{config.emptyDescription}</p>
            <p>closed beta 브라우저 임시 기록은 아래에서 이어서 확인할 수 있습니다.</p>
            <p>지금은 오늘 한 것 1개를 먼저 정리하세요.</p>
          </QuietDetails>
          <div className="pt-2">
            <Link href={`/app/capture?mode=${mode}`}>
              <Button type="button">오늘 한 것 올리기</Button>
            </Link>
          </div>
        </MinimalStepPanel>
      ) : null}

      <LocalBetaReviewCandidateSection mode={mode} hasDurableQueue={items.length > 0} />
      <ReviewOsFeedbackButton route="/app/review" pageContext={{ itemCount: items.length, mode }} />
      </div>
    </div>
  );
}
