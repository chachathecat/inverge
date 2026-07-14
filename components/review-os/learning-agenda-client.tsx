"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { LearnerEmptyState, LearnerPrimaryLink } from "@/components/learner";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
import { listReviewOsLocalBetaNotes, type LocalBetaLearnerNote } from "@/lib/review-os/browser-storage";
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

const EVENT_COPY: Record<
  LearningAgendaEvent["type"],
  { state: string; description: string; marker: string }
> = {
  capture_saved: {
    state: "기록됨",
    description: "오늘 한 것이 학습 기록에 남았습니다.",
    marker: "border-[var(--brand-700)] bg-[var(--brand-050)]",
  },
  note_created: {
    state: "노트 저장",
    description: "학습 노트가 저장되어 다음 행동의 근거가 생겼습니다.",
    marker: "border-[var(--brand-700)] bg-[var(--brand-050)]",
  },
  review_due: {
    state: "복습 예정",
    description: "저장된 일정에 따라 다시 확인할 차례입니다.",
    marker: "border-[var(--cue-review)] bg-[var(--cue-review-bg)]",
  },
  review_completed: {
    state: "복습 완료",
    description: "복습을 마쳤다는 기록이 남았습니다.",
    marker: "border-[var(--status-green)] bg-[var(--status-green-soft)]",
  },
  today_task_completed: {
    state: "오늘 할 일 완료",
    description: "오늘 계획에서 선택한 행동을 마쳤습니다.",
    marker: "border-[var(--status-green)] bg-[var(--status-green-soft)]",
  },
  weakness_recovered: {
    state: "약점 회복 후보",
    description: "약점이 줄었을 가능성을 보여 주는 학습 신호입니다.",
    marker: "border-[var(--status-green)] bg-[var(--status-green-soft)]",
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
        className={`relative z-10 mt-1.5 size-4 rounded-full border-2 ${copy.marker}`}
      />
      <article
        className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5"
        data-s230-timeline-event={event.type}
        data-s230-event-has-deep-link={href ? "true" : "false"}
      >
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs leading-5 text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground-strong)]">{copy.state}</span>
              {event.subject ? <span className="break-words">{event.subject}</span> : null}
            </div>
            <h3 className="mt-1 break-words text-[15px] font-semibold leading-6 text-[var(--foreground-strong)]">
              {event.title}
            </h3>
          </div>
          {time ? <time dateTime={event.date} className="shrink-0 text-xs leading-5 text-[var(--muted)]">{time}</time> : null}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-strong)]">{copy.description}</p>
        {href && linkLabel ? (
          <Link
            href={href}
            className="mt-3 inline-flex min-h-11 items-center rounded-[var(--radius-md)] text-sm font-semibold text-[var(--foreground-strong)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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
    <ol className="relative min-w-0 before:absolute before:bottom-2 before:left-[0.4375rem] before:top-2 before:w-px before:bg-[var(--border-strong)]" aria-label={label}>
      {events.map((event) => <TimelineEvent key={event.id} event={event} mode={mode} />)}
    </ol>
  );
}

function DominantAction({
  href,
  children,
  isOnline,
}: {
  href: string;
  children: string;
  isOnline: boolean;
}) {
  if (!isOnline) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-subtle)] px-5 text-sm font-semibold text-[var(--muted)] sm:w-auto"
      >
        연결 후 이어가기
      </span>
    );
  }

  return (
    <LearnerPrimaryLink href={href} data-s230-dominant-next-action>
      {children}
    </LearnerPrimaryLink>
  );
}

function EmptyAgendaState({ mode, isOnline }: { mode: AppraisalMode; isOnline: boolean }) {
  return (
    <LearnerEmptyState
      title="아직 쌓인 학습 기록이 없습니다."
      description="오늘 한 것 하나만 남기면 기록부터 복습까지의 흐름이 여기에 이어집니다."
      action={
        <DominantAction href={`/app/capture?mode=${mode}`} isOnline={isOnline}>
          오늘 한 것 올리기
        </DominantAction>
      }
    />
  );
}

export function LearningAgendaClient({ mode, initialEvents }: LearningAgendaClientProps) {
  const [localNotes, setLocalNotes] = useState<LocalBetaLearnerNote[]>([]);
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    getConnectionSnapshot,
    getServerConnectionSnapshot,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setLocalNotes(listReviewOsLocalBetaNotes(mode)), 0);
    return () => window.clearTimeout(timeoutId);
  }, [mode]);

  const events = useMemo(
    () => mergeLearningAgendaEvents([...initialEvents, ...buildLocalBetaLearningAgendaEvents(localNotes, mode)]),
    [initialEvents, localNotes, mode],
  );
  const timeline = useMemo(() => buildLearningRecordTimelineModel(events), [events]);
  const visibleThisWeek = timeline.thisWeek.slice(-8);
  const foldedThisWeek = timeline.thisWeek.slice(0, Math.max(0, timeline.thisWeek.length - 8));
  const completedCount = timeline.thisWeek.filter((event) => COMPLETED_EVENT_TYPES.has(event.type)).length;
  const nextReviewIsOverdue = timeline.nextReview ? isBeforeToday(timeline.nextReview.date) : false;
  const hasEvents = events.length > 0;

  return (
    <div
      className="mx-auto w-full max-w-[1048px] min-w-0 space-y-6 overflow-x-hidden"
      data-s230-learning-record-timeline
      data-s230-state={!isOnline ? "offline" : hasEvents ? "ready" : "empty"}
      data-s230-responsive-viewports="390,768,1440"
      data-s230-primary-action-count="1"
    >
      <header className="max-w-[680px] space-y-3">
        <p className="text-xs font-semibold leading-5 text-[var(--muted)]">학습 회복 기록</p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground-strong)] sm:text-[36px]">
          배운 흐름을 다시 이어봅니다
        </h1>
        <p className="text-[15px] leading-7 text-[var(--muted-strong)]">
          이번 주에 남긴 기록과 다음 복습을 시간순으로 확인합니다. 이 화면은 저장된 학습 상태만 보여 주며 성취도를 판정하지 않습니다.
        </p>
      </header>

      {!isOnline ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--cue-review)] bg-[var(--cue-review-bg)] p-4" role="status" aria-live="polite">
          <h2 className="text-sm font-semibold text-[var(--foreground-strong)]">현재 오프라인입니다.</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">이미 불러온 기록은 볼 수 있지만, 다른 화면으로 이동하는 행동은 연결 후 이어갈 수 있습니다.</p>
        </section>
      ) : null}

      {!hasEvents ? <EmptyAgendaState mode={mode} isOnline={isOnline} /> : null}

      {hasEvents ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" data-s230-responsive-priority="next-review-first">
          <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6" aria-labelledby="next-review-title">
            <section className="rounded-[var(--radius-lg)] border border-[var(--brand-700)] bg-[var(--brand-050)] p-5 shadow-[var(--shadow-focus)]" data-s230-next-review>
              <p className="text-xs font-semibold leading-5 text-[var(--muted)]">
                {timeline.nextReview ? (nextReviewIsOverdue ? "확인이 필요한 복습" : "다음 복습") : "다음 기록"}
              </p>
              <h2 id="next-review-title" className="mt-2 text-xl font-semibold leading-7 tracking-[-0.025em] text-[var(--foreground-strong)]">
                {timeline.nextReview?.subject ?? (timeline.nextReview ? "저장된 복습 일정" : "오늘 한 것 하나 남기기")}
              </h2>
              {timeline.nextReview ? (
                <>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--foreground-strong)]">{formatDayLabel(timeline.nextReview.date)}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-strong)]">
                    {nextReviewIsOverdue ? "예정일이 지나 현재 복습 목록에서 확인이 필요합니다." : "저장된 복습 일정 중 가장 가까운 기록입니다."}
                  </p>
                  <div className="mt-5">
                    <DominantAction href={`/app/review?mode=${mode}`} isOnline={isOnline}>다음 복습 이어가기</DominantAction>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-strong)]">다음 복습은 아직 잡히지 않았습니다. 오늘 한 것을 남기면 학습 노트와 복습 흐름이 이어집니다.</p>
                  <div className="mt-5">
                    <DominantAction href={`/app/capture?mode=${mode}`} isOnline={isOnline}>오늘 한 것 올리기</DominantAction>
                  </div>
                </>
              )}
            </section>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">회복 후보는 저장된 행동 신호이며, 숙달이나 점수의 확정 판정이 아닙니다.</p>
          </aside>

          <section className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1" aria-labelledby="this-week-timeline-title">
            <section className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-6" data-s230-primary-timeline>
              <div className="flex flex-col gap-2 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold leading-5 text-[var(--muted)]">이번 주</p>
                  <h2 id="this-week-timeline-title" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[var(--foreground-strong)]">회복의 시간순 기록</h2>
                </div>
                <p className="text-xs leading-5 text-[var(--muted)]">
                  {timeline.thisWeek.length}개 기록 · 완료 신호 {completedCount}개
                </p>
              </div>

              {timeline.completedWeek ? (
                <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--status-green)] bg-[var(--status-green-soft)] p-3" data-s230-completed-week-state>
                  <p className="text-sm font-semibold text-[var(--foreground-strong)]">이번 주에 남은 복습 예정 기록이 없습니다.</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted-strong)]">완료 기록을 바탕으로 다음 일정이 생기면 가장 먼저 안내합니다.</p>
                </div>
              ) : null}

              {visibleThisWeek.length > 0 ? (
                <div className="mt-5">
                  <TimelineList events={visibleThisWeek} mode={mode} label="이번 주 학습 회복 기록" />
                </div>
              ) : (
                <div className="mt-5 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-5">
                  <p className="text-sm font-semibold text-[var(--foreground-strong)]">이번 주 기록은 아직 없습니다.</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">이전 기록은 아래에서 확인할 수 있습니다. 새 기록이 생기면 이 시간순 흐름에 먼저 표시됩니다.</p>
                </div>
              )}

              {foldedThisWeek.length > 0 ? (
                <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3" data-s230-dense-timeline-disclosure>
                  <summary className="flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                    이번 주 앞선 기록 {foldedThisWeek.length}개 보기
                  </summary>
                  <div className="mt-4">
                    <TimelineList events={foldedThisWeek} mode={mode} label="이번 주 앞선 학습 기록" />
                  </div>
                </details>
              ) : null}
            </section>

            {timeline.history.length > 0 ? (
              <details className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5" data-s230-secondary-history>
                <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] text-sm font-semibold text-[var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                  <span>이전 회복 기록</span>
                  <span className="text-xs font-medium text-[var(--muted)]">{timeline.history.length}개</span>
                </summary>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">최근 90일 안에 저장된 이전 기록입니다.</p>
                <div className="mt-5">
                  <TimelineList events={[...timeline.history].reverse()} mode={mode} label="이전 학습 회복 기록" />
                </div>
              </details>
            ) : null}
          </section>

        </div>
      ) : null}
    </div>
  );
}
