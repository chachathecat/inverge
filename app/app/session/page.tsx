import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { TodaySessionRunner } from "@/components/review-os/today-session-runner";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<{ mode?: string; savedCapture?: string }>;
};

export default async function ReviewOsSessionPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const savedCapture = query?.savedCapture === "1";
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
      {savedCapture ? (
        <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
          <p className="text-sm font-medium text-[color:var(--foreground-strong)]">방금 남긴 기록을 오늘 계획에 반영했습니다.</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            가장 큰 간극: {note?.missingIssue ?? note?.weakPoint ?? "간극 1개를 먼저 고정합니다."}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            다음 행동: {note?.rewriteInstruction ?? note?.coreLine ?? "한 문장 재시도/다시쓰기로 바로 이어갑니다."}
          </p>
        </section>
      ) : null}
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
