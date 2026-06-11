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
  title,
  subtitle,
  showAction,
  emptyMessage,
}: {
  notes: LocalBetaLearnerNote[];
  title: string;
  subtitle?: string;
  showAction: boolean;
  emptyMessage?: string | null;
}) {
  if (notes.length === 0) {
    if (!emptyMessage) return null;
    return (
      <Card className="border-[color:var(--border)] bg-[color:var(--surface)]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{emptyMessage}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-[color:var(--border)] bg-[color:var(--surface)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle ?? "최근 로컬 저장 기록"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[color:var(--muted)]">closed beta 브라우저 임시 기록입니다. 이 브라우저의 Notes, Review, Today에서 이어서 확인할 수 있습니다.</p>
        <p className="text-xs text-[color:var(--muted)]">이 브라우저에 임시 저장된 closed beta 기록입니다.</p>
        {notes.map((note) => {
          const createdAt = formatNoteDate(note.createdAt);
          return (
            <section
              key={note.id}
              className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-4 py-3"
            >
              <p className="text-xs text-[color:var(--muted)]">
                {buildModeText(note.mode as AppraisalMode)} · {note.mode} · {sourceTypeLabel(note.sourceType)}
              </p>
              <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{note.subjectLabel}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">AI가 찾은 약점 후보입니다. 직접 확인해 주세요.</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">약점 후보: {note.biggestGap}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">다음 행동: {note.nextAction}</p>
              {createdAt ? <p className="mt-1 text-xs text-[color:var(--muted)]">저장 시각: {createdAt}</p> : null}
              {showAction ? (
                <Link
                  href={`/app/notes?mode=${encodeURIComponent(note.mode)}`}
                  className="mt-3 inline-flex text-xs underline-offset-4 hover:underline"
                >
                  노트 보기
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
      title={modeNoteTitle(mode)}
      showAction
      emptyMessage="최근 로컬 저장 기록이 없습니다."
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
      title="복습 후보"
      subtitle="AI가 찾은 약점 후보입니다. 직접 확인해 주세요."
      showAction
      emptyMessage={hasDurableQueue ? undefined : "복습 후보가 아직 없습니다. Review Queue에 항목이 생기면 우선순위를 반영해 표시됩니다."}
    />
  );
}

export function LocalBetaTodayReflection({ mode, hasDurableSummary }: { mode: AppraisalMode; hasDurableSummary: boolean }) {
  const notes = useClientLocalBetaNotes(mode);

  if (hasDurableSummary) return null;

  return (
    <LocalBetaCaptureNoteList
      notes={notes}
      title="오늘 반영 후보"
      subtitle="오늘 계획에 반영할 최근 기록입니다."
      showAction={false}
      emptyMessage={null}
    />
  );
}
