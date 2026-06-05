"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { APPRAISAL_FIRST_SUBJECTS } from "@/lib/review-os/types";

type Props = {
  selectedSubject: string;
  primaryHref: string;
  captureHref: string;
  setHref: string;
  secondaryHref: string;
  isFirstSetStart: boolean;
};

function setSubjectInHref(href: string, subject: string) {
  const [pathname, query = ""] = href.split("?");
  const search = new URLSearchParams(query);
  search.set("subject", subject);
  return `${pathname}?${search.toString()}`;
}

export function TodayFirstSubjectSelector({
  selectedSubject,
  primaryHref,
  captureHref,
  setHref,
  secondaryHref,
  isFirstSetStart,
}: Props) {
  const [subject, setSubject] = useState(() =>
    APPRAISAL_FIRST_SUBJECTS.includes(selectedSubject as (typeof APPRAISAL_FIRST_SUBJECTS)[number])
      ? selectedSubject
      : APPRAISAL_FIRST_SUBJECTS[0],
  );

  const links = useMemo(
    () => ({
      primary: setSubjectInHref(primaryHref, subject),
      capture: setSubjectInHref(captureHref, subject),
      set: setSubjectInHref(setHref, subject),
    }),
    [primaryHref, captureHref, setHref, subject],
  );

  return (
    <div className="space-y-3">
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">오늘 공부할 과목</span>
        <span className="block text-xs text-[color:var(--muted)]">오늘 실제로 본 과목을 선택하세요.</span>
        <select
          aria-label="오늘 공부할 과목"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2"
        >
          {APPRAISAL_FIRST_SUBJECTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <Link href={links.primary} className="block w-full sm:w-auto">
        <Button type="button" className="w-full sm:w-auto">
          {isFirstSetStart ? "세트 풀이 시작" : "오늘 최우선 작업 시작"}
        </Button>
      </Link>
      <details className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]" data-secondary-action-surface="first-mode-input-options">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-medium text-[color:var(--muted)]">오늘 입력할 수 있는 것 · 다른 작업 보기</summary>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[color:var(--border-subtle)] px-4 py-3 text-xs text-[color:var(--muted)]">
          <span>입력 방식:</span>
          <Link href={`/app/study-log?mode=first&subject=${encodeURIComponent(subject)}`} className="underline-offset-2 hover:underline">
            공부 기록 입력
          </Link>
          <Link href={links.capture} className="underline-offset-2 hover:underline">
            오답 1개만 빠르게 기록
          </Link>
          <Link href={links.set} className="underline-offset-2 hover:underline">
            세트 풀이 바로 이동
          </Link>
          <Link href={secondaryHref} className="underline-offset-2 hover:underline">
            review queue 보기
          </Link>
        </div>
      </details>
    </div>
  );
}
