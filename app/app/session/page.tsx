import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { ResultFeedbackPrompt } from "@/components/shared/result-feedback-prompt";
import { TodaySessionRunner } from "@/components/review-os/today-session-runner";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";
import { buildReferenceSupportForExecution } from "@/lib/review-os/execution-reference-support";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DailyCommandCard, QuietDetails } from "@/components/review-os/minimal-study-system";

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
  const savedCaptureReferenceSupport = buildReferenceSupportForExecution(savedCaptureSignals);
  const activeDetail =
    savedCaptureDetail && queueItem && savedCaptureDetail.item.id === queueItem.itemId
      ? savedCaptureDetail
      : queueItemDetail;
  const note = activeDetail ? buildDetailStudyNote(activeDetail) : null;
  const detailReferenceSupport = buildReferenceSupportForExecution(activeDetail?.item.derivedPayload?.capture_note_engine_v2 ?? activeDetail?.item.derivedPayload?.capture_note_engine_v1 ?? null);

  return (
    <div className="space-y-6">
      <ClosedBetaBanner />
      {savedCapture ? (
        <DailyCommandCard title="오늘 기록이 저장되었습니다." description="복습 큐와 오늘 계획에 바로 반영되었습니다.">
          <div className="grid gap-2 bg-[color:var(--surface-soft)] p-3 rounded-[var(--radius-sm)]">
            <p className="text-xs text-[color:var(--ink-muted)]">
              <span className="font-medium text-[color:var(--ink-primary)]">가장 큰 간극:</span>{" "}
              {String(savedCaptureSignals?.one_biggest_gap ?? note?.missingIssue ?? note?.weakPoint ?? "간극 1개를 먼저 고정합니다.")}
            </p>
            <p className="text-xs text-[color:var(--ink-muted)]">
              <span className="font-medium text-[color:var(--ink-primary)]">다음 행동:</span>{" "}
              {String(savedCaptureSignals?.one_next_action ?? note?.rewriteInstruction ?? note?.coreLine ?? "한 문장 재시도/다시쓰기로 바로 이어갑니다.")}
            </p>
          </div>
          <QuietDetails>
            <p>복습 큐에 들어갔습니다.</p>
            <p>오늘 계획에 반영되었습니다.</p>
            <p>정답 확정이 아니라 다음 행동을 정리하는 학습 보조 결과입니다.</p>
            <p>오늘은 이 작업 하나만 먼저 합니다.</p>
          </QuietDetails>
          {savedCaptureSignals?.next_task_type ? (
            <p className="mt-1 text-xs text-[color:var(--muted)]">다음 과제 유형: {String(savedCaptureSignals.next_task_type)}</p>
          ) : null}
          <details className="mt-2 rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--ink-muted)]">참고 힌트 보기</summary>
            <div className="grid gap-1 border-t border-[color:var(--border-hairline)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
              {savedCaptureReferenceSupport?.skeletonKeywordHint ? <p>키워드 힌트: {savedCaptureReferenceSupport.skeletonKeywordHint}</p> : null}
              {savedCaptureReferenceSupport?.taxonomyCandidate ? <p>분류 후보: {savedCaptureReferenceSupport.taxonomyCandidate}</p> : null}
              {savedCaptureReferenceSupport?.similarTopicSuggestion?.[0] ? <p>유사 주제: {savedCaptureReferenceSupport.similarTopicSuggestion[0]}</p> : null}
            </div>
          </details>

          <div className="mt-3">
            <ResultFeedbackPrompt route="/app/session" pageContext={{ section: "saved-capture", mode }} />
          </div>
          <div className="mt-3 space-y-2">
            <Link
              href={
                mode === "second"
                  ? savedCaptureItemId
                    ? `/app/capture?mode=second&rewriteFrom=${encodeURIComponent(savedCaptureItemId)}`
                    : "/app/capture?mode=second"
                  : "#today-session-runner"
              }
              className="inline-flex w-full items-center justify-center rounded-full bg-[color:var(--foreground-strong)] px-4 py-2 text-sm font-medium text-white"
            >
              {mode === "second" ? "지금 10분 다시 쓰기" : "지금 5분 다시 풀기"}
            </Link>
            <details className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs text-[color:var(--ink-muted)]">다른 선택 보기</summary>
              <div className="grid gap-2 border-t border-[color:var(--border-hairline)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
                <Link href={`/app?mode=${mode}`}>오늘 화면으로</Link>
                <Link href={`/app/items?mode=${mode}`}>노트에서 보기</Link>
                <Link href={`/app/review?mode=${mode}`}>나중에 복습</Link>
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
        referenceSupport={detailReferenceSupport}
      />
      </section>
      <ReviewOsFeedbackButton route="/app/session" pageContext={{ mode, hasQueueItem: Boolean(queueItem) }} />
    </div>
  );
}
