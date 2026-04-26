"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { STUDY_TYPE_OPTIONS, type ConfidenceLevel } from "@/lib/review-os/types";

type Props = {
  mode: "first" | "second";
  initialSubject: string;
  subjectOptions: readonly string[];
};

export function StudyLogIntakeForm({ mode, initialSubject, subjectOptions }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [studyType, setStudyType] = useState<(typeof STUDY_TYPE_OPTIONS)[number]>("기출");
  const [sourceLabel, setSourceLabel] = useState("");
  const [timeSpentMinutes, setTimeSpentMinutes] = useState("");
  const [notUnderstood, setNotUnderstood] = useState("");
  const [revisitNeeded, setRevisitNeeded] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("중간");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!sourceLabel.trim() || !notUnderstood.trim() || !revisitNeeded.trim()) {
      setError("공부 범위와 복습 메모를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/os/study-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        subject,
        studyType,
        sourceLabel: sourceLabel.trim(),
        timeSpentMinutes: timeSpentMinutes.trim() ? Number(timeSpentMinutes) : null,
        notUnderstood: notUnderstood.trim(),
        revisitNeeded: revisitNeeded.trim(),
        confidence,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    if (!response.ok || !payload?.ok) {
      setError("공부 기록 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
      return;
    }
    router.push(`/app?mode=${mode}&subject=${encodeURIComponent(subject)}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[color:var(--muted)]">공부한 범위를 짧게 남기면 다음 우선순위가 더 정확해집니다.</p>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">과목</span>
        <select value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-[var(--radius-md)] border px-3 py-2">
          {subjectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">학습 유형</span>
        <select value={studyType} onChange={(event) => setStudyType(event.target.value as (typeof STUDY_TYPE_OPTIONS)[number])} className="w-full rounded-[var(--radius-md)] border px-3 py-2">
          {STUDY_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">공부 범위 / 출처</span>
        <input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder="예: 회계학 재고자산" className="w-full rounded-[var(--radius-md)] border px-3 py-2" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">소요 시간(분, 선택)</span>
        <input value={timeSpentMinutes} onChange={(event) => setTimeSpentMinutes(event.target.value)} inputMode="numeric" className="w-full rounded-[var(--radius-md)] border px-3 py-2" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">이해가 어려웠던 점</span>
        <textarea value={notUnderstood} onChange={(event) => setNotUnderstood(event.target.value)} className="min-h-20 w-full rounded-[var(--radius-md)] border px-3 py-2" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">다시 볼 범위</span>
        <textarea value={revisitNeeded} onChange={(event) => setRevisitNeeded(event.target.value)} className="min-h-20 w-full rounded-[var(--radius-md)] border px-3 py-2" />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-[color:var(--foreground-strong)]">확신도</span>
        <select value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceLevel)} className="w-full rounded-[var(--radius-md)] border px-3 py-2">
          <option value="낮음">낮음</option>
          <option value="중간">중간</option>
          <option value="높음">높음</option>
        </select>
      </label>
      <p className="text-xs text-[color:var(--muted)]">모르는 것은 답이 아니라 다음 복습 신호입니다.</p>
      {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}
      <Button type="button" onClick={() => void onSubmit()} disabled={submitting}>
        {submitting ? "저장 중" : "오늘 공부 기록 저장"}
      </Button>
    </div>
  );
}
