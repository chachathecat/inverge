import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { LocalBetaReviewCandidateSection } from "@/components/review-os/local-beta-note-reflection";
import { ReviewQueueClient } from "@/components/review-os/review-queue-client";
import { DailyCommandCard } from "@/components/review-os/minimal-study-system";
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
  const items = (await reviewOsService.getReviewQueue(session.userId, session.email).catch(() => [])).filter(
    (item) => item.examName === config.label,
  );
  const captureReferenceLineByItemId: Record<string, string> = {};
  await Promise.all(
    items
      .filter((item) => item.createdFromCapture)
      .map(async (item) => {
        const detail = await reviewOsService.getWrongAnswerDetail(session.userId!, session.email!, item.itemId).catch(() => null);
        const support = buildReferenceSupportForExecution(
          detail?.item?.derivedPayload?.capture_note_engine_v2 ?? detail?.item?.derivedPayload?.capture_note_engine_v1 ?? null,
        );
        const line = support?.topicCandidate ?? support?.skeletonKeywordHint ?? null;
        if (line) captureReferenceLineByItemId[item.itemId] = line;
      }),
  );

  return (
    <div className="space-y-6">
      <ClosedBetaBanner />

      <DailyCommandCard
        title="복습"
        description={
          mode === "second"
            ? "학습 노트에서 만든 다시쓰기 후보를 오늘 복습으로 이어갑니다."
            : "학습 노트에서 만든 회상 후보를 오늘 복습으로 이어갑니다."
        }
      >
        <div className="pt-2">
          <ReviewQueueClient items={items} mode={mode} captureReferenceLineByItemId={captureReferenceLineByItemId} />
        </div>
      </DailyCommandCard>

      <LocalBetaReviewCandidateSection mode={mode} hasDurableQueue={items.length > 0} />
      <ReviewOsFeedbackButton route="/app/review" pageContext={{ itemCount: items.length, mode }} />
    </div>
  );
}
