"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  V3ActionLink,
  V3QuietDisclosure,
  V3SectionHeader,
  V3Surface,
} from "@/components/learner";
import { Button } from "@/components/ui/button";
import { getModeConfig, normalizeSubjectForMode, type AppraisalMode } from "@/lib/review-os/appraisal";

type Props = {
  mode: AppraisalMode;
  selectedSubject: string;
  primaryHref: string;
  captureHref: string;
  reviewHref: string;
  notesHref: string;
  setHref?: string;
  studyLogHref?: string;
  primaryLabel?: string;
  isFirstSetStart?: boolean;
  quietPrimary?: boolean;
};

function setSubjectInHref(href: string, subject: string) {
  const [pathname, query = ""] = href.split("?");
  const search = new URLSearchParams(query);
  search.set("subject", subject);
  return `${pathname}?${search.toString()}`;
}

export function TodaySubjectSelector({
  mode,
  selectedSubject,
  primaryHref,
  captureHref,
  reviewHref,
  notesHref,
  setHref,
  studyLogHref,
  primaryLabel,
  isFirstSetStart = false,
  quietPrimary = false,
}: Props) {
  const config = getModeConfig(mode);
  const [subject, setSubject] = useState(() => normalizeSubjectForMode(selectedSubject, mode));
  const helperCopy =
    mode === "first"
      ? "오늘 본 과목을 선택하고 오답 1개를 기록하세요. 과목을 고르면 오늘 할 일과 복습 큐에 반영됩니다."
      : "오늘 본 과목을 선택하고 답안/강의 정리/필기 중 하나를 올리세요. 과목을 고르면 보강할 논점과 다음 복습에 반영됩니다.";
  const resolvedPrimaryLabel =
    primaryLabel ?? (isFirstSetStart ? "세트 풀이 시작" : mode === "first" ? "1차 오답 1개로 시작" : "2차 답안 1건으로 시작");

  const links = useMemo(
    () => ({
      primary: setSubjectInHref(primaryHref, subject),
      capture: setSubjectInHref(captureHref, subject),
      review: setSubjectInHref(reviewHref, subject),
      notes: setSubjectInHref(notesHref, subject),
      set: setHref ? setSubjectInHref(setHref, subject) : null,
      studyLog: studyLogHref ? setSubjectInHref(studyLogHref, subject) : null,
    }),
    [primaryHref, captureHref, reviewHref, notesHref, setHref, studyLogHref, subject],
  );
  const showCaptureLink = links.capture !== links.primary;

  if (mode === "second") {
    return (
      <V3Surface
        density="compact"
        className="space-y-5"
      >
        <div data-today-subject-selector={mode}>
          <V3SectionHeader
            eyebrow="과목 선택"
            title={config.subjectLabel}
            description={helperCopy}
          />
          <div
            className="mt-4 grid gap-2 lg:grid-cols-3"
            role="group"
            aria-label={config.subjectLabel}
          >
            {config.subjects.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSubject(option)}
                className={`v3-type-label-strong min-h-11 rounded-[var(--v3-radius-control)] border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 ${
                  option === subject
                    ? "border-[var(--color-border-focus)] bg-[var(--color-background-brand-soft)] text-[var(--color-text-brand)]"
                    : "border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                }`}
                aria-pressed={option === subject}
              >
                {option}
              </button>
            ))}
          </div>

          <V3ActionLink
            href={links.primary}
            tone={quietPrimary ? "secondary" : "primary"}
            className="mt-5"
            data-primary-learner-action
            data-s224v-dominant-primary-action={quietPrimary ? undefined : true}
          >
            {resolvedPrimaryLabel}
          </V3ActionLink>

          <V3QuietDisclosure
            summary="다른 작업 보기"
            className="mt-4"
          >
            <nav
              aria-label="과목별 다른 작업"
              className="flex flex-col divide-y divide-[var(--color-border-default)]"
              data-secondary-action-surface={`${mode}-mode-input-options`}
              data-s224v-secondary-diagnostics
            >
              {showCaptureLink ? (
                <Link href={links.capture} className="inline-flex min-h-11 items-center py-2 underline-offset-4 hover:underline">
                  오늘 한 것 올리기
                </Link>
              ) : null}
              <Link href={links.notes} className="inline-flex min-h-11 items-center py-2 underline-offset-4 hover:underline">
                학습 노트 보기
              </Link>
              <Link href={links.review} className="inline-flex min-h-11 items-center py-2 underline-offset-4 hover:underline">
                복습 큐 보기
              </Link>
              <Link href={`/app/weekly?mode=${mode}&subject=${encodeURIComponent(subject)}`} className="inline-flex min-h-11 items-center py-2 underline-offset-4 hover:underline">
                주간 정리
              </Link>
            </nav>
          </V3QuietDisclosure>
        </div>
      </V3Surface>
    );
  }

  return (
    <div className="space-y-3" data-today-subject-selector={mode}>
      <div className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">{config.subjectLabel}</span>
        <span className="block text-xs leading-5 text-[color:var(--muted)]">{helperCopy}</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label={config.subjectLabel}>
          {config.subjects.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSubject(option)}
              className={`min-h-11 rounded-[var(--radius-md)] border px-3 py-2 text-left text-xs font-medium transition ${
                option === subject
                  ? "border-[color:var(--foreground-strong)] bg-[color:var(--foreground-strong)] text-white"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)]"
              }`}
              aria-pressed={option === subject}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link href={links.primary} className="block w-full sm:w-auto">
          <Button
            type="button"
            variant={quietPrimary ? "outline" : undefined}
            className={quietPrimary ? "w-full sm:w-auto" : "primary-action w-full sm:w-auto"}
            data-primary-learner-action
            data-s224v-dominant-primary-action={quietPrimary ? undefined : true}
          >
            {resolvedPrimaryLabel}
          </Button>
        </Link>
      </div>
      <details
        className="quiet-disclosure rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]"
        data-secondary-action-surface={`${mode}-mode-input-options`}
        data-s224v-secondary-diagnostics
      >
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">다른 작업 보기</summary>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--border-subtle)] px-4 py-3 text-xs text-[color:var(--muted)]">
          {showCaptureLink ? (
            <Link href={links.capture} className="underline-offset-2 hover:underline">
              오늘 한 것 올리기
            </Link>
          ) : null}
          {mode === "first" && links.studyLog ? (
            <Link href={links.studyLog} className="underline-offset-2 hover:underline">
              공부 기록 입력
            </Link>
          ) : null}
          {mode === "first" && links.set ? (
            <Link href={links.set} className="underline-offset-2 hover:underline">
              세트 풀이 바로 이동
            </Link>
          ) : null}
          <Link href={links.notes} className="underline-offset-2 hover:underline">
            학습 노트 보기
          </Link>
          <Link href={links.review} className="underline-offset-2 hover:underline">
            복습 큐 보기
          </Link>
          <Link href={`/app/weekly?mode=${mode}&subject=${encodeURIComponent(subject)}`} className="underline-offset-2 hover:underline">
            주간 정리
          </Link>
        </div>
      </details>
    </div>
  );
}

export { TodaySubjectSelector as TodayFirstSubjectSelector };
