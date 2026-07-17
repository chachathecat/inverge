"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  FailureAwareState,
  LearnerPrimaryLink,
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3RouteHeader,
  V3Surface,
} from "@/components/learner";
import { CoreRouteLocalReadDegradedNotice } from "@/components/review-os/core-route-read-state";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
import {
  createCheckingLocalBetaNotesReadOutcome,
  listReviewOsLocalBetaNotesWithStatus,
  scopeLocalBetaNotesReadOutcome,
  selectLocalBetaNotesReadOutcomeForMode,
  type ModeScopedLocalBetaNotesReadOutcome,
} from "@/lib/review-os/browser-storage";
import type { FailureAwareStateEvidence } from "@/lib/review-os/failure-aware-state";
import {
  buildLearningRecordTimelineModel,
  buildLocalBetaLearningAgendaEvents,
  mergeLearningAgendaEvents,
  type LearningAgendaEvent,
} from "@/lib/review-os/learning-agenda";

type LearningAgendaClientProps = {
  mode: AppraisalMode;
  initialEvents: LearningAgendaEvent[];
};

const COMPLETED_EVENT_TYPES = new Set<LearningAgendaEvent["type"]>([
  "review_completed",
  "today_task_completed",
  "weakness_recovered",
]);

const AGENDA_LOADING_EVIDENCE = Object.freeze({
  kind: "loading",
  safety: Object.freeze({ kind: "not_applicable" }),
}) satisfies FailureAwareStateEvidence;

const AGENDA_EMPTY_EVIDENCE = Object.freeze({
  kind: "empty",
  safety: Object.freeze({ kind: "not_applicable" }),
}) satisfies FailureAwareStateEvidence;

const EVENT_COPY: Record<
  LearningAgendaEvent["type"],
  { state: string; description: string; marker: string; v3Marker: string }
> = {
  capture_saved: {
    state: "기록됨",
    description: "오늘 한 것이 학습 기록에 남았습니다.",
    marker: "border-[var(--brand-700)] bg-[var(--brand-050)]",
    v3Marker: "border-[var(--color-border-focus)] bg-[var(--color-icon-brand)]",
  },
  note_created: {
    state: "노트 저장",
    description: "학습 노트가 저장되어 다음 행동의 근거가 생겼습니다.",
    marker: "border-[var(--brand-700)] bg-[var(--brand-050)]",
    v3Marker: "border-[var(--color-border-focus)] bg-[var(--color-icon-brand)]",
  },
  review_due: {
    state: "복습 예정",
    description: "저장된 일정에 따라 다시 확인할 차례입니다.",
    marker: "border-[var(--cue-review)] bg-[var(--cue-review-bg)]",
    v3Marker: "border-[var(--color-border-attention)] bg-[var(--color-icon-attention)]",
  },
  review_completed: {
    state: "복습 완료",
    description: "복습을 마쳤다는 기록이 남았습니다.",
    marker: "border-[var(--status-green)] bg-[var(--status-green-soft)]",
    v3Marker: "border-[var(--color-border-stable)] bg-[var(--color-icon-stable)]",
  },
  today_task_completed: {
    state: "오늘 할 일 완료",
    description: "오늘 계획에서 선택한 행동을 마쳤습니다.",
    marker: "border-[var(--status-green)] bg-[var(--status-green-soft)]",
    v3Marker: "border-[var(--color-border-stable)] bg-[var(--color-icon-stable)]",
  },
  weakness_recovered: {
    state: "약점 회복 후보",
    description: "약점이 줄었을 가능성을 보여 주는 학습 신호입니다.",
    marker: "border-[var(--status-green)] bg-[var(--status-green-soft)]",
    v3Marker: "border-[var(--color-border-stable)] bg-[var(--color-icon-stable)]",
  },
};

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getConnectionSnapshot() {
  return navigator.onLine;
}

function getServerConnectionSnapshot() {
  return true;
}

function formatDayLabel(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "날짜 확인 필요";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parsed);
}

function formatEventTime(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function isBeforeToday(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function eventHref(event: LearningAgendaEvent, mode: AppraisalMode) {
  if (event.noteId) return `/app/items/${encodeURIComponent(event.noteId)}?mode=${mode}`;
  if (event.type === "review_due" && event.reviewItemId) return `/app/review?mode=${mode}`;
  return null;
}

function eventLinkLabel(event: LearningAgendaEvent) {
  if (event.noteId) return "학습 노트 보기";
  if (event.type === "review_due" && event.reviewItemId) return "복습으로 이동";
  return null;
}

function TimelineEvent({ event, mode }: { event: LearningAgendaEvent; mode: AppraisalMode }) {
  const copy = EVENT_COPY[event.type];
  const href = eventHref(event, mode);
  const linkLabel = eventLinkLabel(event);
  const time = formatEventTime(event.date);

  return (
    <li className="relative grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
      <span
        aria-hidden="true"
        className={`relative z-10 mt-1.5 size-4 rounded-full border-2 ${mode === "second" ? copy.v3Marker : copy.marker}`}
      />
      <article
        className={mode === "second"
          ? "min-w-0 rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5"
          : "min-w-0 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5"}
        data-v3-component={mode === "second" ? "Surface" : undefined}
        data-s230-timeline-event={event.type}
        data-s230-event-has-deep-link={href ? "true" : "false"}
      >
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className={mode === "second"
              ? "v3-type-caption flex flex-wrap items-center gap-2 text-[var(--color-text-secondary)]"
              : "flex flex-wrap items-center gap-2 text-xs leading-5 text-[var(--muted)]"}>
              <span className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "font-semibold text-[var(--foreground-strong)]"}>{copy.state}</span>
              {event.subject ? <span className="break-words">{event.subject}</span> : null}
            </div>
            <h3 className={mode === "second"
              ? "v3-type-body-strong mt-1 break-words text-[var(--color-text-primary)]"
              : "mt-1 break-words text-[15px] font-semibold leading-6 text-[var(--foreground-strong)]"}>
              {event.title}
            </h3>
          </div>
          {time ? <time dateTime={event.date} className={mode === "second" ? "v3-type-caption shrink-0 text-[var(--color-text-secondary)]" : "shrink-0 text-xs leading-5 text-[var(--muted)]"}>{time}</time> : null}
        </div>
        <p className={mode === "second" ? "v3-type-compact mt-2 text-[var(--color-text-secondary)]" : "mt-2 text-sm leading-6 text-[var(--muted-strong)]"}>{copy.description}</p>
        {href && linkLabel ? (
          <Link
            href={href}
            className={mode === "second"
              ? "v3-type-label-strong mt-3 inline-flex min-h-11 items-center rounded-[var(--v3-radius-control)] text-[var(--color-text-link)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              : "mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-md)] text-sm font-semibold text-[var(--foreground-strong)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"}
          >
            {linkLabel}
          </Link>
        ) : null}
      </article>
    </li>
  );
}

function TimelineList({ events, mode, label }: { events: LearningAgendaEvent[]; mode: AppraisalMode; label: string }) {
  return (
    <ol className={mode === "second"
      ? "relative min-w-0 before:absolute before:bottom-2 before:left-[0.4375rem] before:top-2 before:w-px before:bg-[var(--color-border-default)]"
      : "relative min-w-0 before:absolute before:bottom-2 before:left-[0.4375rem] before:top-2 before:w-px before:bg-[var(--border-strong)]"} aria-label={label}>
      {events.map((event) => <TimelineEvent key={event.id} event={event} mode={mode} />)}
    </ol>
  );
}

function DominantAction({
  href,
  children,
  isOnline,
  mode,
}: {
  href: string;
  children: string;
  isOnline: boolean;
  mode: AppraisalMode;
}) {
  const dominantActionProps = { "data-s230-dominant-next-action": true } as const;

  if (!isOnline) {
    return (
      <span
        aria-disabled="true"
        className={mode === "second"
          ? "v3-type-label-strong inline-flex min-h-[var(--control-height)] w-full cursor-not-allowed items-center justify-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] px-5 py-3 text-[var(--color-text-tertiary)] sm:w-auto"
          : "inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-5 text-sm font-semibold text-[var(--muted)] sm:w-auto"}
        data-v3-component={mode === "second" ? "Action" : undefined}
        data-v3-state={mode === "second" ? "disabled" : undefined}
      >
        연결 후 이어가기
      </span>
    );
  }

  if (mode === "second") {
    return (
      <V3ActionLink href={href} {...dominantActionProps}>
        {children}
      </V3ActionLink>
    );
  }

  return (
    <LearnerPrimaryLink href={href} {...dominantActionProps}>
      {children}
    </LearnerPrimaryLink>
  );
}

function EmptyAgendaState({ mode, isOnline }: { mode: AppraisalMode; isOnline: boolean }) {
  if (mode === "second") {
    return (
      <div className="space-y-4" data-s232f4b-agenda-confirmed-empty>
        <FailureAwareState
          evidence={AGENDA_EMPTY_EVIDENCE}
          announceChange={false}
          testId="s232f4b-agenda-empty-state"
        />
        <section className="space-y-4 border-t border-[var(--color-border-default)] pt-4" aria-label="빈 학습 기록 다음 행동">
          <h2 className="v3-type-section text-[var(--color-text-primary)]">아직 쌓인 학습 기록이 없습니다.</h2>
          <p className="v3-type-body text-[var(--color-text-secondary)]">
            오늘 한 것 하나만 남기면 기록부터 복습까지의 흐름이 여기에 이어집니다.
          </p>
          <DominantAction href="/app/capture?mode=second" isOnline={isOnline} mode={mode}>
            오늘 한 것 올리기
          </DominantAction>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-s232f4b-agenda-confirmed-empty>
      <FailureAwareState
        evidence={AGENDA_EMPTY_EVIDENCE}
        announceChange={false}
        testId="s232f4b-agenda-empty-state"
      />
      <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <p className="text-sm font-semibold text-[var(--foreground-strong)]">
          아직 쌓인 학습 기록이 없습니다.
        </p>
        <p className="text-sm leading-6 text-[var(--muted-strong)]">
          오늘 한 것 하나만 남기면 기록부터 복습까지의 흐름이 여기에 이어집니다.
        </p>
        <DominantAction href={`/app/capture?mode=${mode}`} isOnline={isOnline} mode={mode}>
          오늘 한 것 올리기
        </DominantAction>
      </div>
    </div>
  );
}

export function LearningAgendaClient({ mode, initialEvents }: LearningAgendaClientProps) {
  const [storedLocalRead, setStoredLocalRead] =
    useState<ModeScopedLocalBetaNotesReadOutcome>(() =>
      createCheckingLocalBetaNotesReadOutcome(mode),
    );
  const localRead = selectLocalBetaNotesReadOutcomeForMode(storedLocalRead, mode);
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    getConnectionSnapshot,
    getServerConnectionSnapshot,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStoredLocalRead(
        scopeLocalBetaNotesReadOutcome(
          mode,
          listReviewOsLocalBetaNotesWithStatus(mode),
        ),
      );
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [mode]);

  const events = useMemo(
    () =>
      mergeLearningAgendaEvents([
        ...initialEvents,
        ...buildLocalBetaLearningAgendaEvents(localRead.notes, mode),
      ]),
    [initialEvents, localRead.notes, mode],
  );
  const timeline = useMemo(() => buildLearningRecordTimelineModel(events), [events]);
  const visibleThisWeek = timeline.thisWeek.slice(-8);
  const foldedThisWeek = timeline.thisWeek.slice(0, Math.max(0, timeline.thisWeek.length - 8));
  const completedCount = timeline.thisWeek.filter((event) => COMPLETED_EVENT_TYPES.has(event.type)).length;
  const nextReviewIsOverdue = timeline.nextReview ? isBeforeToday(timeline.nextReview.date) : false;
  const hasEvents = events.length > 0;
  const localReadChecking = localRead.status === "checking";
  const localReadUnavailable = localRead.status === "unavailable";
  const confirmedEmpty = localRead.status === "ready" && !hasEvents;
  const routeState = !isOnline
    ? "offline"
    : localReadChecking && !hasEvents
      ? "loading"
      : localReadUnavailable
        ? "degraded"
        : hasEvents
          ? "ready"
          : "empty";

  const agenda = (
    <div
      className="mx-auto w-full max-w-[1048px] min-w-0 space-y-6 overflow-x-hidden"
      data-s230-learning-record-timeline
      data-s230-state={routeState}
      data-s232f4b-agenda-local-read={localRead.status}
      data-s230-responsive-viewports="390,768,1440"
      data-s230-primary-action-count="1"
    >
      {mode === "second" ? (
        <V3RouteHeader
          eyebrow="학습 회복 기록"
          title="배운 흐름을 다시 이어봅니다"
          description="이번 주에 남긴 기록과 다음 복습을 시간순으로 확인합니다. 이 화면은 저장된 학습 상태만 보여 주며 성취도를 판정하지 않습니다."
        />
      ) : (
        <header className="max-w-[680px] space-y-3">
          <p className="text-xs font-semibold leading-5 text-[var(--muted)]">학습 회복 기록</p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground-strong)] sm:text-[36px]">
            배운 흐름을 다시 이어봅니다
          </h1>
          <p className="text-[15px] leading-7 text-[var(--muted-strong)]">
            이번 주에 남긴 기록과 다음 복습을 시간순으로 확인합니다. 이 화면은 저장된 학습 상태만 보여 주며 성취도를 판정하지 않습니다.
          </p>
        </header>
      )}

      {!isOnline ? (
        mode === "second" ? (
          <div role="status" aria-live="polite">
            <V3Surface as="section" tone="attention" density="compact" className="space-y-1" labelledBy="agenda-offline-title">
              <h2 id="agenda-offline-title" className="v3-type-label-strong text-[var(--color-text-attention)]">현재 오프라인입니다.</h2>
              <p className="v3-type-body ko-keep text-[var(--color-text-primary)]">이미 불러온 기록은 볼 수 있지만, 다른 화면으로 이동하는 행동은 연결 후 이어갈 수 있습니다.</p>
            </V3Surface>
          </div>
        ) : (
          <section className="rounded-[var(--radius-lg)] border border-[var(--cue-review)] bg-[var(--cue-review-bg)] p-4" role="status" aria-live="polite">
            <h2 className="text-sm font-semibold text-[var(--foreground-strong)]">현재 오프라인입니다.</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">이미 불러온 기록은 볼 수 있지만, 다른 화면으로 이동하는 행동은 연결 후 이어갈 수 있습니다.</p>
          </section>
        )
      ) : null}

      {localReadChecking && !hasEvents ? (
        <FailureAwareState
          evidence={AGENDA_LOADING_EVIDENCE}
          announceChange={false}
          testId="s232f4b-agenda-local-check-loading"
        />
      ) : null}

      {localReadUnavailable ? (
        <CoreRouteLocalReadDegradedNotice coreRecordsVisible={hasEvents} />
      ) : null}

      {confirmedEmpty ? <EmptyAgendaState mode={mode} isOnline={isOnline} /> : null}

      {hasEvents ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" data-s230-responsive-priority="next-review-first">
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6" aria-labelledby="next-review-title">
            <section className={mode === "second"
              ? "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-focus)] bg-[var(--color-background-focus)] p-5"
              : "rounded-[var(--radius-lg)] border border-[var(--brand-700)] bg-[var(--brand-050)] p-5 shadow-[var(--shadow-focus)]"} data-v3-component={mode === "second" ? "Surface" : undefined} data-v3-tone={mode === "second" ? "focus" : undefined} data-s230-next-review>
              <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-brand)]" : "text-xs font-semibold leading-5 text-[var(--muted)]"}>
                {timeline.nextReview ? (nextReviewIsOverdue ? "확인이 필요한 복습" : "다음 복습") : "다음 기록"}
              </p>
              <h2 id="next-review-title" className={mode === "second" ? "v3-type-section ko-keep mt-2 text-[var(--color-text-primary)]" : "mt-2 text-xl font-semibold leading-7 tracking-[-0.025em] text-[var(--foreground-strong)]"}>
                {timeline.nextReview?.subject ?? (timeline.nextReview ? "저장된 복습 일정" : "오늘 한 것 하나 남기기")}
              </h2>
              {timeline.nextReview ? (
                <>
                  <p className={mode === "second" ? "v3-type-body-strong mt-3 text-[var(--color-text-primary)]" : "mt-3 text-sm font-medium leading-6 text-[var(--foreground-strong)]"}>{formatDayLabel(timeline.nextReview.date)}</p>
                  <p className={mode === "second" ? "v3-type-compact ko-keep mt-1 text-[var(--color-text-secondary)]" : "mt-1 text-sm leading-6 text-[var(--muted-strong)]"}>
                    {nextReviewIsOverdue ? "예정일이 지나 현재 복습 목록에서 확인이 필요합니다." : "저장된 복습 일정 중 가장 가까운 기록입니다."}
                  </p>
                  <div className="mt-5">
                    <DominantAction href={`/app/review?mode=${mode}`} isOnline={isOnline} mode={mode}>다음 복습 이어가기</DominantAction>
                  </div>
                </>
              ) : (
                <>
                  <p className={mode === "second" ? "v3-type-compact ko-keep mt-3 text-[var(--color-text-secondary)]" : "mt-3 text-sm leading-6 text-[var(--muted-strong)]"}>다음 복습은 아직 잡히지 않았습니다. 오늘 한 것을 남기면 학습 노트와 복습 흐름이 이어집니다.</p>
                  <div className="mt-5">
                    <DominantAction href={`/app/capture?mode=${mode}`} isOnline={isOnline} mode={mode}>오늘 한 것 올리기</DominantAction>
                  </div>
                </>
              )}
            </section>
            <p className={mode === "second" ? "v3-type-caption ko-keep mt-3 text-[var(--color-text-secondary)]" : "mt-3 text-xs leading-5 text-[var(--muted)]"}>회복 후보는 저장된 행동 신호이며, 숙달이나 점수의 확정 판정이 아닙니다.</p>
          </aside>

          <section className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1" aria-labelledby="this-week-timeline-title">
            <section className={mode === "second"
              ? "min-w-0 rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-6"
              : "min-w-0 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-6"} data-v3-component={mode === "second" ? "Surface" : undefined} data-s230-primary-timeline>
              <div className={mode === "second" ? "flex flex-col gap-2 border-b border-[var(--color-border-default)] pb-4 sm:flex-row sm:items-end sm:justify-between" : "flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-end sm:justify-between"}>
                <div>
                  <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs font-semibold leading-5 text-[var(--muted)]"}>이번 주</p>
                  <h2 id="this-week-timeline-title" className={mode === "second" ? "v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--foreground-strong)]"}>회복의 시간순 기록</h2>
                </div>
                <p className={mode === "second" ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[var(--muted)]"}>
                  {timeline.thisWeek.length}개 기록 · 완료 신호 {completedCount}개
                </p>
              </div>

              {timeline.completedWeek ? (
                <div className={mode === "second"
                  ? "mt-4 border-y border-[var(--color-border-stable)] bg-[var(--color-background-stable)] px-4 py-3"
                  : "mt-4 rounded-[var(--radius-md)] border border-[var(--status-green)] bg-[var(--status-green-soft)] p-3"} data-v3-state={mode === "second" ? "completed" : undefined} data-s230-completed-week-state role="status">
                  <p className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-stable)]" : "text-sm font-semibold text-[var(--foreground-strong)]"}>이번 주에 남은 복습 예정 기록이 없습니다.</p>
                  <p className={mode === "second" ? "v3-type-caption ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-xs leading-5 text-[var(--muted-strong)]"}>완료 기록을 바탕으로 다음 일정이 생기면 가장 먼저 안내합니다.</p>
                </div>
              ) : null}

              {visibleThisWeek.length > 0 ? (
                <div className="mt-5">
                  <TimelineList events={visibleThisWeek} mode={mode} label="이번 주 학습 회복 기록" />
                </div>
              ) : (
                <div className={mode === "second"
                  ? "mt-5 border-y border-[var(--color-border-default)] bg-[var(--color-background-subtle)] px-4 py-5"
                  : "mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-5"} data-v3-state={mode === "second" ? "empty" : undefined}>
                  <p className={mode === "second" ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-sm font-semibold text-[var(--foreground-strong)]"}>이번 주 기록은 아직 없습니다.</p>
                  <p className={mode === "second" ? "v3-type-body ko-keep mt-1 text-[var(--color-text-secondary)]" : "mt-1 text-sm leading-6 text-[var(--muted)]"}>이전 기록은 아래에서 확인할 수 있습니다. 새 기록이 생기면 이 시간순 흐름에 먼저 표시됩니다.</p>
                </div>
              )}

              {foldedThisWeek.length > 0 ? (
                mode === "second" ? (
                  <div className="mt-4" data-s230-dense-timeline-disclosure>
                    <V3QuietDisclosure summary={`이번 주 앞선 기록 ${foldedThisWeek.length}개 보기`}>
                      <TimelineList events={foldedThisWeek} mode="second" label="이번 주 앞선 학습 기록" />
                    </V3QuietDisclosure>
                  </div>
                ) : (
                  <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3" data-s230-dense-timeline-disclosure>
                    <summary className="flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                      이번 주 앞선 기록 {foldedThisWeek.length}개 보기
                    </summary>
                    <div className="mt-4">
                      <TimelineList events={foldedThisWeek} mode="first" label="이번 주 앞선 학습 기록" />
                    </div>
                  </details>
                )
              ) : null}
            </section>

            {timeline.history.length > 0 ? (
              mode === "second" ? (
                <div data-s230-secondary-history>
                  <V3QuietDisclosure
                    summary={`이전 회복 기록 · ${timeline.history.length}개`}
                    helper="최근 90일 안에 저장된 이전 기록입니다."
                  >
                    <TimelineList events={[...timeline.history].reverse()} mode="second" label="이전 학습 회복 기록" />
                  </V3QuietDisclosure>
                </div>
              ) : (
                <details className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5" data-s230-secondary-history>
                  <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                    <span>이전 회복 기록</span>
                    <span className="text-xs font-medium text-[var(--muted)]">{timeline.history.length}개</span>
                  </summary>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">최근 90일 안에 저장된 이전 기록입니다.</p>
                  <div className="mt-5">
                    <TimelineList events={[...timeline.history].reverse()} mode="first" label="이전 학습 회복 기록" />
                  </div>
                </details>
              )
            ) : null}
          </section>

        </div>
      ) : null}
    </div>
  );

  return mode === "second" ? (
    <V3RouteFrame width="content">
      {agenda}
    </V3RouteFrame>
  ) : agenda;
}
