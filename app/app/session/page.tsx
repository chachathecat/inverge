import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { TodaySessionRunner } from "@/components/review-os/today-session-runner";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DailyCommandCard } from "@/components/review-os/minimal-study-system";

type PageProps = {
  searchParams?: Promise<{ mode?: string; savedCapture?: string; itemId?: string }>;
};

export default async function ReviewOsSessionPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const savedCapture = query?.savedCapture === "1";
  const savedCaptureItemId = typeof query?.itemId === "string" ? query.itemId : null;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/session", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const focus = await reviewOsService.getTodayFocus(session.userId, session.email, mode);
  if (mode === "second" && focus.nextActionType === "capture_now") {
    redirect("/app/write?mode=second");
  }
  const savedCaptureQueueItem = savedCaptureItemId
    ? focus.queue.find((item) => item.itemId === savedCaptureItemId) ?? null
    : null;
  const queueItem = savedCaptureQueueItem ?? focus.queue.find((item) => item.queueId === focus.sourceQueueId) ?? focus.queue[0] ?? null;
  const queueItemDetail = queueItem ? await reviewOsService.getWrongAnswerDetail(session.userId, session.email, queueItem.itemId) : null;
  const savedCaptureDetail =
    savedCapture && savedCaptureItemId
      ? await reviewOsService.getWrongAnswerDetail(session.userId, session.email, savedCaptureItemId).catch(() => null)
      : null;
  const savedCaptureSignals =
    typeof savedCaptureDetail?.item.derivedPayload?.capture_note_engine_v2 === "object" &&
    savedCaptureDetail.item.derivedPayload.capture_note_engine_v2
      ? (savedCaptureDetail.item.derivedPayload.capture_note_engine_v2 as Record<string, unknown>)
      : typeof savedCaptureDetail?.item.derivedPayload?.capture_note_engine_v1 === "object" &&
          savedCaptureDetail.item.derivedPayload.capture_note_engine_v1
        ? (savedCaptureDetail.item.derivedPayload.capture_note_engine_v1 as Record<string, unknown>)
      : null;
  const activeDetail =
    savedCaptureDetail && queueItem && savedCaptureDetail.item.id === queueItem.itemId
      ? savedCaptureDetail
      : queueItemDetail;
  const note = activeDetail ? buildDetailStudyNote(activeDetail) : null;

  return (
    <div className="space-y-6">
      <ClosedBetaBanner />
      {savedCapture ? (
        <DailyCommandCard title="오늘 기록이 저장되었습니다." description="복습 큐와 오늘 계획에 반영되었습니다.">
          <div className="grid gap-3 rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3" aria-live="polite">
            <span className="sr-only">복습 큐에 들어갔습니다.</span>
            <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
              <span className="font-medium text-[color:var(--ink-primary)]">가장 큰 간극:</span>{" "}
              {String(savedCaptureSignals?.one_biggest_gap ?? note?.missingIssue ?? note?.weakPoint ?? "간극 1개를 먼저 고정합니다.")}
            </p>
            <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
              <span className="font-medium text-[color:var(--ink-primary)]">다음 행동:</span>{" "}
              {String(savedCaptureSignals?.one_next_action ?? note?.rewriteInstruction ?? note?.coreLine ?? "한 문장 재시도/다시쓰기로 바로 이어갑니다.")}
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            <Link
              href={`/app?mode=${mode}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[color:var(--foreground-strong)] px-4 py-2 text-sm font-medium text-white"
            >
              오늘 계획에 반영
            </Link>
            <Link
              href={
                mode === "second"
                  ? savedCaptureItemId
                    ? `/app/capture?mode=second&rewriteFrom=${encodeURIComponent(savedCaptureItemId)}`
                    : "/app/capture?mode=second"
                  : "#today-session-runner"
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)]"
            >
              다시 풀기/다시 쓰기
            </Link>
            <Link
              href={`/app/review?mode=${mode}`}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)]"
            >
              나중에 복습
            </Link>
          </div>
        </DailyCommandCard>
      ) : null}
      <section id="today-session-runner">
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
      </section>
      <ReviewOsFeedbackButton route="/app/session" pageContext={{ mode, hasQueueItem: Boolean(queueItem) }} />
    </div>
  );
}
