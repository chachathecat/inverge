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
        <DailyCommandCard title="오늘 계획에 반영했습니다." description="Today Plan candidate · Review Queue candidate · Note/details에 저장했습니다.">
          <div className="grid gap-3 rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3" aria-live="polite">
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
              href={
                mode === "second"
                  ? savedCaptureItemId
                    ? `/app/capture?mode=second&rewriteFrom=${encodeURIComponent(savedCaptureItemId)}`
                    : "/app/capture?mode=second"
                  : "#today-session-runner"
              }
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[color:var(--foreground-strong)] px-4 py-2 text-sm font-medium text-white"
            >
              오늘 계획으로 이동
            </Link>
            <details className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--ink-muted)]">다른 선택 보기</summary>
              <div className="grid gap-2 border-t border-[color:var(--border-hairline)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
                <Link href={`/app?mode=${mode}`}>오늘 계획으로 이동</Link>
                <Link href={`/app/capture?mode=${mode}`}>하나 더 올리기</Link>
                <Link href={`/app/items?mode=${mode}`}>노트 보기</Link>
              </div>
            </details>
            <details className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--ink-muted)]">참고 힌트 보기</summary>
              <div className="grid gap-1 border-t border-[color:var(--border-hairline)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
                <p>정답 확정이 아니라 다음 행동을 정리하는 학습 보조 결과입니다.</p>
                <p>오늘은 이 작업 하나만 먼저 합니다.</p>
              </div>
            </details>
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
