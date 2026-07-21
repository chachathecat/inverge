import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import {
  BiggestGap,
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3RouteHeader,
  V3SectionHeader,
  V3Surface,
} from "@/components/learner";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { TodaySessionRunner } from "@/components/review-os/today-session-runner";
import { RequestedSourceReadState } from "@/components/review-os/requested-source-read-state";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import {
  missingRequestedCoreRouteRead,
  resolveRequestedCoreRouteRead,
} from "@/lib/review-os/core-route-read-outcome";
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
  const savedCaptureItemId =
    typeof query?.itemId === "string" ? query.itemId.trim() || null : null;
  const { session, access, profile } = await getReviewOsServerContext(
    buildReviewOsReturnTo("/app/session", modeParam),
    { includeUsage: false },
  );
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const savedCaptureRead = savedCapture
    ? savedCaptureItemId
      ? await resolveRequestedCoreRouteRead(
          "session_saved_capture_detail",
          () =>
            reviewOsService.getWrongAnswerDetail(
              session.userId!,
              session.email,
              savedCaptureItemId,
            ),
          (detail) =>
            detail.item.userId === session.userId &&
            (detail.item.rawPayload?.created_from_capture === true ||
              detail.item.derivedPayload?.created_from_capture === true ||
              detail.item.createdFromCapture === true) &&
            detail.item.examName === config.label,
        )
      : missingRequestedCoreRouteRead()
    : null;

  if (savedCaptureRead?.status === "unavailable") {
    return (
      <div className="space-y-6">
        <ClosedBetaBanner />
        <RequestedSourceReadState
          surface="session"
          status="unavailable"
          returnHref={`/app/session?mode=${mode}`}
        />
      </div>
    );
  }
  if (savedCaptureRead?.status === "missing") {
    return (
      <div className="space-y-6">
        <ClosedBetaBanner />
        <RequestedSourceReadState
          surface="session"
          status="missing"
          returnHref={`/app/session?mode=${mode}`}
        />
      </div>
    );
  }

  const savedCaptureDetail =
    savedCaptureRead?.status === "ready" ? savedCaptureRead.value : null;
  const focus = await reviewOsService.getTodayFocus(session.userId, session.email, mode);
  if (mode === "second" && focus.nextActionType === "capture_now") {
    redirect("/app/write?mode=second");
  }
  const savedCaptureQueueItem = savedCaptureItemId
    ? focus.queue.find((item) => item.itemId === savedCaptureItemId) ?? null
    : null;
  const queueItem = savedCaptureQueueItem ?? focus.queue.find((item) => item.queueId === focus.sourceQueueId) ?? focus.queue[0] ?? null;
  const queueItemDetail = !queueItem
    ? null
    : savedCaptureDetail?.item.id === queueItem.itemId
      ? savedCaptureDetail
      : await reviewOsService.getWrongAnswerDetail(
          session.userId,
          session.email,
          queueItem.itemId,
        );
  const savedCaptureSignals =
    typeof savedCaptureDetail?.item.derivedPayload?.capture_note_engine_v2 === "object" &&
    savedCaptureDetail.item.derivedPayload.capture_note_engine_v2
      ? (savedCaptureDetail.item.derivedPayload.capture_note_engine_v2 as Record<string, unknown>)
      : typeof savedCaptureDetail?.item.derivedPayload?.capture_note_engine_v1 === "object" &&
          savedCaptureDetail.item.derivedPayload.capture_note_engine_v1
        ? (savedCaptureDetail.item.derivedPayload.capture_note_engine_v1 as Record<string, unknown>)
      : null;
  const savedCaptureNote = savedCaptureDetail
    ? buildDetailStudyNote(savedCaptureDetail)
    : null;
  const queueItemNote = queueItemDetail
    ? buildDetailStudyNote(queueItemDetail)
    : null;
  const savedBiggestGap = String(
    savedCaptureSignals?.one_biggest_gap ??
      savedCaptureNote?.missingIssue ??
      savedCaptureNote?.weakPoint ??
      "간극 1개를 먼저 고정합니다.",
  );
  const savedNextAction = String(
    savedCaptureSignals?.one_next_action ??
      savedCaptureNote?.rewriteInstruction ??
      savedCaptureNote?.coreLine ??
      "한 문장 재시도/다시쓰기로 바로 이어갑니다.",
  );

  const savedCapturePanel = savedCaptureDetail ? (
    mode === "second" ? (
      <V3Surface as="section" tone="stable">
        <div className="space-y-5" aria-live="polite">
          <V3SectionHeader
            eyebrow="Capture → Today"
            title="오늘 계획에 반영했습니다."
            description="학습 노트에 저장한 약점과 다음 행동을 복습 흐름으로 이어갑니다."
          />
          <BiggestGap
            headingId="session-saved-capture-biggest-gap"
            gap={savedBiggestGap}
            evidence={`다음 행동 · ${savedNextAction}`}
            type="MissingLink"
          />
          <V3ActionLink
            href={
              savedCaptureItemId
                ? `/app/capture?mode=second&rewriteFrom=${encodeURIComponent(savedCaptureItemId)}`
                : "/app/capture?mode=second"
            }
            tone="secondary"
            fullWidth
            data-session-saved-capture-action="secondary"
          >
            가장 큰 간극 다시쓰기
          </V3ActionLink>
          <V3QuietDisclosure summary="다른 선택 보기">
            <div className="grid gap-2 sm:grid-cols-2">
              <V3ActionLink href="/app?mode=second" tone="quiet" fullWidth>오늘 계획으로 이동</V3ActionLink>
              <V3ActionLink href="/app/capture?mode=second" tone="quiet" fullWidth>하나 더 올리기</V3ActionLink>
              <V3ActionLink href="/app/review?mode=second" tone="quiet" fullWidth>복습 보기</V3ActionLink>
              <V3ActionLink href="/app/notes?mode=second" tone="quiet" fullWidth>노트 보기</V3ActionLink>
            </div>
          </V3QuietDisclosure>
          <V3QuietDisclosure summary="참고 힌트 보기">
            <div className="grid gap-1">
              <p>정답 확정이 아니라 다음 행동을 정리하는 학습 보조 결과입니다.</p>
              <p>오늘은 이 작업 하나만 먼저 합니다.</p>
            </div>
          </V3QuietDisclosure>
        </div>
      </V3Surface>
    ) : (
      <DailyCommandCard title="오늘 계획에 반영했습니다." description="오늘 계획에 반영 · 복습에 남길 내용 · 학습 노트 상세에 저장했습니다.">
        <div className="grid gap-3 rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] p-3" aria-live="polite">
          <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
            <span className="font-medium text-[color:var(--ink-primary)]">가장 큰 간극:</span>{" "}
            {savedBiggestGap}
          </p>
          <p className="text-sm leading-6 text-[color:var(--ink-muted)]">
            <span className="font-medium text-[color:var(--ink-primary)]">다음 행동:</span>{" "}
            {savedNextAction}
          </p>
        </div>
        <div className="mt-4 grid gap-2">
          <Link
            href="#today-session-runner"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[color:var(--foreground-strong)] px-4 py-2 text-sm font-medium text-white"
          >
            오늘 계획으로 이동
          </Link>
          <details className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-xs text-[color:var(--ink-muted)]">다른 선택 보기</summary>
            <div className="grid gap-2 border-t border-[color:var(--border-hairline)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
              <Link href="/app?mode=first">오늘 계획으로 이동</Link>
              <Link href="/app/capture?mode=first">하나 더 올리기</Link>
              <Link href="/app/review?mode=first">복습 보기</Link>
              <Link href="/app/notes?mode=first">노트 보기</Link>
            </div>
          </details>
          <details className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 py-2 text-xs text-[color:var(--ink-muted)]">참고 힌트 보기</summary>
            <div className="grid gap-1 border-t border-[color:var(--border-hairline)] px-3 py-2 text-xs text-[color:var(--ink-muted)]">
              <p>정답 확정이 아니라 다음 행동을 정리하는 학습 보조 결과입니다.</p>
              <p>오늘은 이 작업 하나만 먼저 합니다.</p>
            </div>
          </details>
        </div>
      </DailyCommandCard>
    )
  ) : null;

  const sessionContent = (
    <>
      <ClosedBetaBanner />
      {mode === "second" ? (
        <V3RouteHeader
          eyebrow="오늘 학습"
          title="오늘은 이것만 합니다."
          description="가장 먼저 회복할 한 가지를 확인하고, 바로 다시 시도합니다."
        />
      ) : null}
      {savedCapturePanel}
      <section id="today-session-runner">
        <TodaySessionRunner
          key={`${session.userId}:${queueItem?.queueId ?? "none"}`}
          mode={mode}
          modeLabel={config.label}
          showHeader={mode !== "second"}
          focus={focus}
          queueItem={queueItem}
          note={
            queueItemNote
              ? {
                  summary: queueItemNote.summary,
                  weakPoint: queueItemNote.weakPoint,
                  missingIssue: queueItemNote.missingIssue,
                  rewriteInstruction: queueItemNote.rewriteInstruction,
                  coreLine: queueItemNote.coreLine,
                  nextReviewDate: queueItemNote.nextReviewDate,
                }
              : null
          }
        />
      </section>
      <ReviewOsFeedbackButton
        route="/app/session"
        pageContext={{ mode, hasQueueItem: Boolean(queueItem) }}
        presentation={mode === "second" ? "v3" : "legacy"}
      />
    </>
  );

  return mode === "second" ? (
    <V3RouteFrame className="space-y-6">{sessionContent}</V3RouteFrame>
  ) : (
    <div className="space-y-6">{sessionContent}</div>
  );
}
