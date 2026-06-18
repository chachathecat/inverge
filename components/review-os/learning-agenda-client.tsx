"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
import { listReviewOsLocalBetaNotes, type LocalBetaLearnerNote } from "@/lib/review-os/browser-storage";
import {
  buildLearningAgendaMonthCells,
  buildLearningAgendaWeekGroups,
  buildLocalBetaLearningAgendaEvents,
  groupLearningAgendaEventsByDay,
  mergeLearningAgendaEvents,
  type LearningAgendaEvent,
} from "@/lib/review-os/learning-agenda";

type LearningAgendaClientProps = {
  mode: AppraisalMode;
  initialEvents: LearningAgendaEvent[];
};

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function formatDayLabel(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return dateKey;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }).format(parsed);
}

function formatEventTime(value: string) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function eventTone(type: LearningAgendaEvent["type"]) {
  if (type === "review_due") return "border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)]";
  if (type === "review_completed" || type === "today_task_completed" || type === "weakness_recovered") {
    return "border-[color:var(--status-green)] bg-[color:var(--status-green-soft)]";
  }
  return "border-[color:var(--border-subtle)] bg-[color:var(--surface)]";
}

function EmptyAgendaState({ mode }: { mode: AppraisalMode }) {
  return (
    <Card className="border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-none">
      <CardHeader className="space-y-2">
        <CardTitle>아직 쌓인 학습 기록이 없습니다.</CardTitle>
        <CardDescription>오늘 한 것을 하나 올리면 기록이 시작됩니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={`/app/capture?mode=${mode}`} className="inline-flex w-full sm:w-auto">
          <Button type="button" className="w-full sm:w-auto">오늘 한 것 올리기</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function EventLine({ event }: { event: LearningAgendaEvent }) {
  const time = formatEventTime(event.date);
  return (
    <li className={`rounded-[var(--radius-md)] border px-3 py-3 ${eventTone(event.type)}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{event.title}</p>
        {time ? <p className="text-xs text-[color:var(--muted)]">{time}</p> : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
        {event.subject ? <span>{event.subject}</span> : null}
        {event.noteId ? <span>학습 노트</span> : null}
        {event.reviewItemId ? <span>{event.type === "review_completed" ? "복습 완료" : "복습 예정"}</span> : null}
        {event.todayTaskId ? <span>오늘 할 일</span> : null}
        {event.type === "weakness_recovered" ? <span>약점 회복 후보</span> : null}
      </div>
    </li>
  );
}

export function LearningAgendaClient({ mode, initialEvents }: LearningAgendaClientProps) {
  const [localNotes, setLocalNotes] = useState<LocalBetaLearnerNote[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalNotes(listReviewOsLocalBetaNotes(mode));
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mode]);

  const events = useMemo(
    () => mergeLearningAgendaEvents([...initialEvents, ...buildLocalBetaLearningAgendaEvents(localNotes, mode)]),
    [initialEvents, localNotes, mode],
  );
  const monthCells = useMemo(() => buildLearningAgendaMonthCells(events), [events]);
  const weekGroups = useMemo(() => buildLearningAgendaWeekGroups(events), [events]);
  const dayGroups = useMemo(() => groupLearningAgendaEventsByDay(events).slice(0, 6), [events]);
  const hasEvents = events.length > 0;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground-strong)]">학습 기록</h1>
        <p className="text-sm leading-6 text-[color:var(--muted)]">오늘 한 것과 복습 흐름을 날짜별로 모아봅니다.</p>
      </section>

      {!hasEvents ? <EmptyAgendaState mode={mode} /> : null}

      <Card className="border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle>월간 기록</CardTitle>
          <CardDescription>진한 칸은 학습 기록이 있는 날입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5" aria-label="월간 학습 기록">
            {monthCells.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date} · ${cell.count}개`}
                className={`flex aspect-square min-h-9 items-center justify-center rounded-[var(--radius-sm)] border text-[11px] ${
                  cell.active
                    ? "border-[color:var(--brand-700)] bg-[color:var(--brand-900)] text-[color:var(--text-inverse)]"
                    : "border-[color:var(--border-hairline)] bg-[color:var(--bg-subtle)] text-[color:var(--muted)]"
                }`}
              >
                {cell.dayOfMonth}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle>주간 기록</CardTitle>
          <CardDescription>이번 주 기록과 복습 예정만 모읍니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {weekGroups.map((group, index) => (
            <section key={group.date} className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{WEEKDAY_LABELS[index]}</p>
                <p className="text-xs text-[color:var(--muted)]">{formatDayLabel(group.date)}</p>
              </div>
              {group.events.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {group.events.slice(0, 3).map((event) => <EventLine key={event.id} event={event} />)}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[color:var(--muted)]">기록 없음</p>
              )}
            </section>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle>일별 상세</CardTitle>
          <CardDescription>최근 날짜부터 학습 흔적을 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dayGroups.length > 0 ? (
            dayGroups.map((group) => (
              <section key={group.date} className="space-y-2">
                <h2 className="text-sm font-semibold text-[color:var(--foreground-strong)]">{formatDayLabel(group.date)}</h2>
                <ul className="space-y-2">
                  {group.events.map((event) => <EventLine key={event.id} event={event} />)}
                </ul>
              </section>
            ))
          ) : (
            <p className="text-sm text-[color:var(--muted)]">기록이 생기면 날짜별로 보여줍니다.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
