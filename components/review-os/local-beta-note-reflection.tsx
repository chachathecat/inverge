"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { type AppraisalMode } from "@/lib/review-os/appraisal";
import { listReviewOsLocalBetaNotes, type LocalBetaLearnerNote } from "@/lib/review-os/browser-storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LocaleDate = string;

const LOCAL_BETA_SOURCE_LABEL: Record<NonNullable<LocalBetaLearnerNote["sourceType"]>, string> = {
  text: "텍스트",
  photo: "사진",
  pdf: "PDF",
};

function formatNoteDate(value: LocaleDate) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function sourceTypeLabel(value?: LocalBetaLearnerNote["sourceType"]) {
  if (!value) return "기록 입력";
  return LOCAL_BETA_SOURCE_LABEL[value];
}

function buildModeText(mode: AppraisalMode): string {
  return mode === "second" ? "2차" : "1차";
}

function modeNoteTitle(mode: AppraisalMode) {
  return `${buildModeText(mode)} 학습 노트`;
}

function useClientLocalBetaNotes(mode: AppraisalMode) {
  const [notes, setNotes] = useState<LocalBetaLearnerNote[]>([]);

  useEffect(() => {
    const nextNotes = listReviewOsLocalBetaNotes(mode).slice(0, 3);
    const timeoutId = window.setTimeout(() => {
      setNotes(nextNotes);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mode]);

  return notes;
}

function LocalBetaCaptureNoteList({
  notes,
  mode,
  title,
  subtitle,
  showAction,
  emptyMessage,
  emptyActionLabel,
}: {
  notes: LocalBetaLearnerNote[];
  mode: AppraisalMode;
  title: string;
  subtitle?: string;
  showAction: boolean;
  emptyMessage?: string | null;
  emptyActionLabel?: string;
}) {
  if (notes.length === 0) {
    if (!emptyMessage) return null;
    return (
      <Card className="border-[color:var(--border)] bg-[color:var(--surface)]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{emptyMessage}</CardDescription>
          <Link
            href={`/app/capture?mode=${mode}`}
            className="mt-3 inline-flex text-xs font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
          >
            {emptyActionLabel ?? "오늘 한 것 올리기"}
          </Link>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-[color:var(--border)] bg-[color:var(--surface)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle ?? "최근 브라우저 임시 학습 노트입니다."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[color:var(--muted)]">
          closed beta 학습 노트입니다. closed beta 브라우저 임시 기록으로 같은 브라우저에서 Notes, Review, Today, Agenda 연결 상태를 확인할 수 있습니다.
        </p>
        {notes.map((note) => {
          const createdAt = formatNoteDate(note.createdAt);
          return (
            <section
              key={note.id}
              className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-4 py-3"
            >
              <p className="text-xs text-[color:var(--muted)]">
                {buildModeText(note.mode as AppraisalMode)} · {sourceTypeLabel(note.sourceType)}
              </p>
              <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{note.subjectLabel}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">가장 큰 약점: {note.biggestGap}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">다음 행동: {note.nextAction}</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">이어지는 곳: 학습 노트 / 복습 / 오늘 할 일 / 학습 기록</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">Today 연결: 오늘 할 일 후보</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">Review 연결: 복습 예정 후보</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">Agenda 연결: 학습 기록 후보</p>
              {createdAt ? <p className="mt-1 text-xs text-[color:var(--muted)]">저장 시각: {createdAt}</p> : null}
              {showAction ? (
                <Link
                  href={`/app/notes?mode=${encodeURIComponent(note.mode)}`}
                  className="mt-3 inline-flex text-xs underline-offset-4 hover:underline"
                >
                  학습 노트 보기
                </Link>
              ) : null}
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function LocalBetaNotesSection({ mode }: { mode: AppraisalMode }) {
  const notes = useClientLocalBetaNotes(mode);

  return (
    <LocalBetaCaptureNoteList
      notes={notes}
      mode={mode}
      title={modeNoteTitle(mode)}
      subtitle="저장한 오늘 한 것의 가장 큰 약점과 다음 행동을 확인합니다."
      showAction
      emptyMessage="아직 이 브라우저에 저장된 closed beta 학습 노트가 없습니다. 오늘 한 것을 저장하면 학습 노트에서 찾고 복습, 오늘 할 일, 학습 기록 후보로 이어집니다."
    />
  );
}

export function LocalBetaReviewCandidateSection({
  mode,
  hasDurableQueue,
}: {
  mode: AppraisalMode;
  hasDurableQueue: boolean;
}) {
  const notes = useClientLocalBetaNotes(mode);

  return (
    <LocalBetaCaptureNoteList
      notes={notes}
      mode={mode}
      title="오늘 한 것에서 만든 복습 후보"
      subtitle="저장한 학습 노트에서 다시 보기나 다시쓰기 후보를 모아둡니다."
      showAction
      emptyMessage={hasDurableQueue ? undefined : "아직 복습 후보가 없습니다. 오늘 한 것 1개를 저장하면 가장 큰 약점과 다음 행동이 복습 후보로 이어집니다."}
    />
  );
}

export function LocalBetaTodayReflection({ mode, hasDurableSummary }: { mode: AppraisalMode; hasDurableSummary: boolean }) {
  const notes = useClientLocalBetaNotes(mode);

  if (hasDurableSummary) return null;

  return (
    <LocalBetaCaptureNoteList
      notes={notes}
      mode={mode}
      title="오늘 할 일 후보"
      subtitle="오늘 할 일에 반영할 최근 학습 노트입니다."
      showAction={false}
      emptyMessage="오늘 한 것 1개를 올리면 오늘 할 일에 반영됩니다."
    />
  );
}
