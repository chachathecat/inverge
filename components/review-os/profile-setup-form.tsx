"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  getAppraisalMode,
  getDefaultSubject,
  getModeConfig,
  getModeLabel,
  getSubjectOptions,
  normalizePreferredSubjectsForMode,
  type AppraisalMode,
} from "@/lib/review-os/appraisal";

type ProfileSetupFormProps = {
  initialExamName?: string | null;
  initialExamDate?: string | null;
  initialPreferredSubjects?: string[];
  initialMode?: AppraisalMode;
  redirectAfterSave?: "capture" | "settings";
};

export function ProfileSetupForm({
  initialExamName,
  initialExamDate,
  initialPreferredSubjects = [],
  initialMode,
  redirectAfterSave = "capture",
}: ProfileSetupFormProps) {
  const router = useRouter();
  const initialResolvedMode = initialMode ?? getAppraisalMode(initialExamName);
  const [mode, setMode] = useState<AppraisalMode>(initialResolvedMode);
  const [preferredSubject, setPreferredSubject] = useState(
    normalizePreferredSubjectsForMode(initialPreferredSubjects, initialResolvedMode)[0],
  );
  const [examDate, setExamDate] = useState(initialExamDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const subjectOptions = getSubjectOptions(mode);
  const config = getModeConfig(mode);

  function selectMode(nextMode: AppraisalMode) {
    setMode(nextMode);
    setPreferredSubject(getDefaultSubject(nextMode));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/os/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: getModeLabel(mode),
          examDate: examDate || null,
          preferredSubjects: preferredSubject ? [preferredSubject] : [],
        }),
      });

      const result = (await response.json()) as { ok?: boolean };
      if (!response.ok || !result.ok) {
        setError("수험 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      router.push(redirectAfterSave === "settings" ? `/app/settings?mode=${mode}` : `/app/capture?mode=${mode}`);
      router.refresh();
    } catch {
      setError("수험 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <section className="grid gap-3 sm:grid-cols-2">
        {(["first", "second"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => selectMode(item)}
            className={`rounded-[var(--radius-md)] border p-5 text-left transition ${
              mode === item
                ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                : "border-[var(--border)] bg-[color:var(--surface)]"
            }`}
          >
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{getModeLabel(item)}</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
              {item === "first"
                ? "민법, 경제학원론, 회계학, 부동산학원론의 반복 오답을 review queue로 운영합니다."
                : "감정평가실무, 감정평가이론, 보상법규 답안을 compare와 rewrite 흐름으로 정리합니다."}
            </p>
          </button>
        ))}
      </section>

      <label className="block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">{config.subjectLabel}</span>
        <select
          value={preferredSubject}
          onChange={(event) => setPreferredSubject(event.target.value)}
          className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
        >
          {subjectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <details className="rounded-2xl border border-[var(--border)] px-4 py-3">
        <summary className="cursor-pointer text-sm text-[color:var(--muted-strong)]">선택 입력</summary>
        <div className="mt-4">
          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--foreground-strong)]">목표 시험일</span>
            <input
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none"
            />
          </label>
        </div>
      </details>

      {error ? <p className="text-sm text-[color:var(--status-red)]">{error}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting
          ? "저장 중"
          : redirectAfterSave === "settings"
            ? "수험 설정 저장"
            : mode === "second"
              ? "저장하고 2차 답안 비교 시작"
              : "저장하고 1차 오답 기록 시작"}
      </Button>
    </form>
  );
}
