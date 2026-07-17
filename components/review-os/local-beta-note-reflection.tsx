"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  V3ActionLink,
  V3SectionHeader,
  V3Surface,
} from "@/components/learner";
import { type AppraisalMode } from "@/lib/review-os/appraisal";
import {
  createCheckingLocalBetaNotesReadOutcome,
  listReviewOsLocalBetaNotesWithStatus,
  scopeLocalBetaNotesReadOutcome,
  selectLocalBetaNotesReadOutcomeForMode,
  type LocalBetaLearnerNote,
  type ModeScopedLocalBetaNotesReadOutcome,
} from "@/lib/review-os/browser-storage";
import { CoreRouteLocalReadDegradedNotice } from "@/components/review-os/core-route-read-state";
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
  const [storedOutcome, setStoredOutcome] =
    useState<ModeScopedLocalBetaNotesReadOutcome>(() =>
      createCheckingLocalBetaNotesReadOutcome(mode),
    );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextOutcome = listReviewOsLocalBetaNotesWithStatus(mode);
      setStoredOutcome(
        scopeLocalBetaNotesReadOutcome(
          mode,
          nextOutcome.status === "ready"
            ? { status: "ready", notes: nextOutcome.notes.slice(0, 3) }
            : nextOutcome,
        ),
      );
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mode]);

  return selectLocalBetaNotesReadOutcomeForMode(storedOutcome, mode);
}

function LocalBetaCaptureNoteList({
  notes,
  mode,
  title,
  subtitle,
  showAction,
  emptyMessage,
  emptyActionLabel,
  readStatus,
  showReadUnavailableNotice,
}: {
  notes: LocalBetaLearnerNote[];
  mode: AppraisalMode;
  title: string;
  subtitle?: string;
  showAction: boolean;
  emptyMessage?: string | null;
  emptyActionLabel?: string;
  readStatus: "checking" | "ready" | "unavailable";
  showReadUnavailableNotice: boolean;
}) {
  if (readStatus === "checking") return null;
  if (readStatus === "unavailable") {
    return showReadUnavailableNotice ? (
      <CoreRouteLocalReadDegradedNotice coreRecordsVisible />
    ) : null;
  }

  if (mode === "second") {
    if (notes.length === 0) {
      if (!emptyMessage) return null;
      return (
        <V3Surface density="compact" tone="subtle" className="space-y-4">
          <V3SectionHeader title={title} description={emptyMessage} />
          <V3ActionLink href="/app/capture?mode=second" tone="secondary">
            {emptyActionLabel ?? "오늘 한 것 올리기"}
          </V3ActionLink>
        </V3Surface>
      );
    }

    return (
      <V3Surface className="space-y-5">
        <V3SectionHeader
          title={title}
          description={subtitle ?? "최근 브라우저 임시 학습 노트입니다."}
        />
        <p className="v3-type-caption text-[var(--color-text-secondary)]">
          이 브라우저에 임시 저장된 학습 기록입니다. 같은 브라우저에서 학습 노트, 복습, 오늘 할 일, 학습 기록 연결 상태를 확인할 수 있습니다.
        </p>
        <div className="divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
          {notes.map((note) => {
            const createdAt = formatNoteDate(note.createdAt);
            return (
              <section key={note.id} className="py-5 first:pt-4 last:pb-4">
                <p className="v3-type-caption text-[var(--color-text-secondary)]">
                  {buildModeText(note.mode as AppraisalMode)} · {sourceTypeLabel(note.sourceType)}
                </p>
                <h3 className="v3-type-label-strong mt-1 text-[var(--color-text-primary)]">
                  {note.subjectLabel}
                </h3>
                <dl className="v3-type-compact mt-3 space-y-2 text-[var(--color-text-secondary)]">
                  <div>
                    <dt className="inline font-medium text-[var(--color-text-primary)]">가장 큰 약점: </dt>
                    <dd className="inline">{note.biggestGap}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-[var(--color-text-primary)]">다음 행동: </dt>
                    <dd className="inline">{note.nextAction}</dd>
                  </div>
                </dl>
                <p className="v3-type-caption mt-3 text-[var(--color-text-secondary)]">
                  오늘 계획 연결: 오늘 계획에 반영 · 복습 연결: 복습에 남길 내용 · 학습 기록 연결: 학습 기록에 저장
                </p>
                {createdAt ? (
                  <p className="v3-type-caption mt-1 text-[var(--color-text-tertiary)]">저장 시각: {createdAt}</p>
                ) : null}
                {showAction ? (
                  <Link
                    href={`/app/notes?mode=${encodeURIComponent(note.mode)}`}
                    className="v3-type-label-strong mt-3 inline-flex min-h-11 items-center text-[var(--color-text-link)] underline-offset-4 hover:underline"
                  >
                    학습 노트 보기
                  </Link>
                ) : null}
              </section>
            );
          })}
        </div>
      </V3Surface>
    );
  }

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
          이 브라우저에 임시 저장된 학습 기록입니다. 같은 브라우저에서 학습 노트, 복습, 오늘 할 일, 학습 기록 연결 상태를 확인할 수 있습니다.
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
              <p className="mt-1 text-xs text-[color:var(--muted)]">오늘 계획 연결: 오늘 계획에 반영</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">복습 연결: 복습에 남길 내용</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">학습 기록 연결: 학습 기록에 저장</p>
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

export function LocalBetaNotesSection({
  mode,
  showEmptyMessage = true,
  showReadUnavailableNotice = true,
}: {
  mode: AppraisalMode;
  showEmptyMessage?: boolean;
  showReadUnavailableNotice?: boolean;
}) {
  const outcome = useClientLocalBetaNotes(mode);

  return (
    <LocalBetaCaptureNoteList
      notes={outcome.notes}
      mode={mode}
      title={modeNoteTitle(mode)}
      subtitle="저장한 오늘 한 것의 가장 큰 약점과 다음 행동을 확인합니다."
      showAction
      emptyMessage={showEmptyMessage ? "아직 이 브라우저에 저장된 학습 노트가 없습니다. 오늘 한 것을 저장하면 학습 노트에서 찾고 복습, 오늘 할 일, 학습 기록으로 이어집니다." : null}
      readStatus={outcome.status}
      showReadUnavailableNotice={showReadUnavailableNotice}
    />
  );
}

export function LocalBetaReviewCandidateSection({
  mode,
  hasDurableQueue,
  showEmptyMessage = true,
  showReadUnavailableNotice = true,
}: {
  mode: AppraisalMode;
  hasDurableQueue: boolean;
  showEmptyMessage?: boolean;
  showReadUnavailableNotice?: boolean;
}) {
  const outcome = useClientLocalBetaNotes(mode);

  return (
    <LocalBetaCaptureNoteList
      notes={outcome.notes}
      mode={mode}
      title="오늘 한 것에서 남긴 복습"
      subtitle="저장한 학습 노트에서 다시 보기나 다시쓰기로 이어갈 내용을 모아둡니다."
      showAction
      emptyMessage={hasDurableQueue || !showEmptyMessage ? undefined : "아직 복습에 남긴 내용이 없습니다. 오늘 한 것 1개를 저장하면 가장 큰 약점과 다음 행동이 복습으로 이어집니다."}
      readStatus={outcome.status}
      showReadUnavailableNotice={showReadUnavailableNotice}
    />
  );
}

export function LocalBetaTodayReflection({
  mode,
  hasDurableSummary,
  showEmptyMessage = true,
  showReadUnavailableNotice = true,
}: {
  mode: AppraisalMode;
  hasDurableSummary: boolean;
  showEmptyMessage?: boolean;
  showReadUnavailableNotice?: boolean;
}) {
  const outcome = useClientLocalBetaNotes(mode);

  if (hasDurableSummary && outcome.status !== "unavailable") return null;

  return (
    <LocalBetaCaptureNoteList
      notes={outcome.notes}
      mode={mode}
      title="오늘 계획에 반영"
      subtitle="오늘 할 일에 이어갈 최근 학습 노트입니다."
      showAction={false}
      emptyMessage={showEmptyMessage ? "오늘 한 것 1개를 올리면 오늘 할 일에 반영됩니다." : null}
      readStatus={outcome.status}
      showReadUnavailableNotice={showReadUnavailableNotice}
    />
  );
}
