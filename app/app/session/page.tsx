import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { TodaySessionRunner } from "@/components/review-os/today-session-runner";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsSessionPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/session", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const focus = await reviewOsService.getTodayFocus(session.userId, session.email, mode);
  if (mode === "second" && focus.nextActionType === "capture_now") {
    redirect("/app/write?mode=second");
  }
  const queueItem = focus.queue.find((item) => item.queueId === focus.sourceQueueId) ?? focus.queue[0] ?? null;
  const detail = queueItem ? await reviewOsService.getWrongAnswerDetail(session.userId, session.email, queueItem.itemId) : null;
  const note = detail ? buildDetailStudyNote(detail) : null;

  return (
    <div className="space-y-6">
      <TodaySessionRunner
        mode={mode}
        modeLabel={config.label}
        focus={focus}
        queueItem={queueItem}
        note={
          note
            ? {
                summary: note.summary,
                weakPoint: note.weakPoint,
                missingIssue: note.missingIssue,
                rewriteInstruction: note.rewriteInstruction,
                coreLine: note.coreLine,
                nextReviewDate: note.nextReviewDate,
              }
            : null
        }
      />
      <ReviewOsFeedbackButton route="/app/session" pageContext={{ mode, hasQueueItem: Boolean(queueItem) }} />
    </div>
  );
}
