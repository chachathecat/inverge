"use client";

import { useMemo, useState } from "react";
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

type Stage = "first" | "second" | "parallel";
type Bottleneck = "concept" | "calculation" | "structure" | "law" | "time";
type TimeBudget = "5" | "15" | "30";

const BOTTLENECK_LABEL: Record<Bottleneck, string> = {
  concept: "개념",
  calculation: "계산",
  structure: "답안 구조",
  law: "법규 요건",
  time: "시간 부족",
};

export function ProfileSetupForm({
  initialExamName,
  initialPreferredSubjects = [],
  initialMode,
  redirectAfterSave = "capture",
}: ProfileSetupFormProps) {
  const router = useRouter();
  const initialResolvedMode = initialMode ?? getAppraisalMode(initialExamName);
  const [stage, setStage] = useState<Stage>(initialResolvedMode);
  const [bottleneck, setBottleneck] = useState<Bottleneck>("concept");
  const [timeBudget, setTimeBudget] = useState<TimeBudget>("15");
  const [preferredSubject, setPreferredSubject] = useState(
    normalizePreferredSubjectsForMode(initialPreferredSubjects, initialResolvedMode)[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const mode: AppraisalMode = stage === "parallel" ? (bottleneck === "structure" ? "second" : "first") : stage;
  const subjectOptions = getSubjectOptions(mode);
  const config = getModeConfig(mode);

  const diagnosis = useMemo(() => {
    const isExplicitSecondWrite = mode === "second" && bottleneck === "structure";
    const firstCaptureHref = mode === "first" ? `/app/capture?mode=first&subject=${encodeURIComponent(preferredSubject)}` : "/app/capture?mode=second";

    return {
      preferredMode: mode,
      initialSubject: preferredSubject,
      ctaHref: isExplicitSecondWrite ? "/app/write?mode=second" : firstCaptureHref,
      ctaLabel: isExplicitSecondWrite ? "첫 답안 작성 시작" : "첫 기록 남기기",
      dailyTaskCopy:
        mode === "first"
          ? `${timeBudget}분 동안 ${preferredSubject} ${BOTTLENECK_LABEL[bottleneck]} 오답 1개를 기록합니다.`
          : `${timeBudget}분 동안 ${preferredSubject} ${BOTTLENECK_LABEL[bottleneck]} 기준으로 답안 1개를 남깁니다.`,
    };
  }, [bottleneck, mode, preferredSubject, timeBudget]);

  function selectStage(nextStage: Stage) {
    setStage(nextStage);
    const nextMode: AppraisalMode = nextStage === "parallel" ? "first" : nextStage;
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
          preferredSubjects: preferredSubject ? [preferredSubject] : [],
        }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (!response.ok || !result.ok) {
        setError("수험 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.push(diagnosis.ctaHref);
      router.refresh();
    } catch {
      setError("수험 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      <section className="space-y-3">
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">준비 단계</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ["first", "1차"],
            ["second", "2차"],
            ["parallel", "병행"],
          ] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => selectStage(key)} className={`rounded-[var(--radius-md)] border p-4 text-sm ${stage === key ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]" : "border-[var(--border)] bg-[color:var(--surface)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">가장 막히는 것</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.entries(BOTTLENECK_LABEL) as Array<[Bottleneck, string]>).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setBottleneck(key)} className={`rounded-xl border px-4 py-3 text-left text-sm ${bottleneck === key ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]" : "border-[var(--border)]"}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-[color:var(--foreground-strong)]">오늘 가능한 시간</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["5", "15", "30"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setTimeBudget(item)} className={`rounded-xl border px-4 py-3 text-sm ${timeBudget === item ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]" : "border-[var(--border)]"}`}>
              {item}분
            </button>
          ))}
        </div>
      </section>

      <label className="block space-y-2">
        <span className="text-sm text-[color:var(--foreground-strong)]">{config.subjectLabel}</span>
        <select value={preferredSubject} onChange={(event) => setPreferredSubject(event.target.value)} className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] px-4 text-sm outline-none">
          {subjectOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <div className="rounded-2xl border border-[var(--border)] bg-[color:var(--surface)] p-4 text-sm leading-7 text-[color:var(--muted-strong)]">
        <p>선호 모드: {getModeLabel(diagnosis.preferredMode)}</p>
        <p>초기 과목 제안: {diagnosis.initialSubject}</p>
        <p>오늘 첫 과제: {diagnosis.dailyTaskCopy}</p>
        <p className="mt-2">처음엔 계획표보다 오늘 한 것 하나가 더 중요합니다.</p>
        <p>지금은 전체 계획보다 첫 기록 1개를 남깁니다.</p>
      </div>

      {error ? <p className="text-sm text-[color:var(--status-red)]">{error}</p> : null}

      <Button type="submit" disabled={submitting}>{submitting ? "저장 중" : diagnosis.ctaLabel}</Button>
    </form>
  );
}
