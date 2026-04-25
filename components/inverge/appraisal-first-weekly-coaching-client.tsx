"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { WeeklyCoachingPlan } from "@/lib/appraisal-first/types";
import { cn } from "@/lib/utils";

const SUBJECT_LABELS: Record<string, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학원론",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

const ABILITY_LABELS: Record<string, string> = {
  accuracy: "정확도",
  time_management: "시간 운영",
  option_judgment: "선지 판단",
  law_memory: "법령 기억",
  calculation_stability: "계산 안정성",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function AppraisalFirstWeeklyCoachingClient({ plan }: { plan: WeeklyCoachingPlan }) {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6">
        <header className="space-y-3">
          <p className="text-caption font-medium text-[color:var(--muted)]">감정평가사 1차 · 주간 코칭</p>
          <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">이번 주에 다시 볼 축만 조용히 정리합니다.</h1>
          <p className="max-w-2xl text-body text-[color:var(--muted)]">
            점수판이 아니라, 최근 세트와 리뷰 흐름을 바탕으로 다음 일주일의 반복 기준만 남깁니다.
          </p>
        </header>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryItem label="주 시작" value={formatDate(plan.weekStartDate)} />
            <SummaryItem label="세트 목표" value={`${plan.targetSetCount}개`} />
            <SummaryItem label="리뷰 목표" value={`${plan.reviewTargetCount}개`} />
            <SummaryItem label="상태" value={plan.status === "active" ? "진행 중" : "완료"} />
          </div>
          <p className="mt-6 text-sm leading-6 text-[color:var(--muted)]">{plan.summary}</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
            <p className="text-caption font-medium text-[color:var(--muted)]">우선 과목</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.primarySubjectIds.map((subjectId) => (
                <span
                  key={subjectId}
                  className="rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-caption text-[color:var(--muted-strong)]"
                >
                  {SUBJECT_LABELS[subjectId] ?? subjectId}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
            <p className="text-caption font-medium text-[color:var(--muted)]">집중할 축</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {plan.priorityAbilityKeys.map((abilityKey) => (
                <span
                  key={abilityKey}
                  className="rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-caption text-[color:var(--muted-strong)]"
                >
                  {ABILITY_LABELS[abilityKey] ?? abilityKey}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-caption font-medium text-[color:var(--muted)]">이번 주 작업</p>
          <div className="mt-4 space-y-3">
            {plan.tasks.map((task) => (
              <div key={task.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{task.title}</p>
                    <p className="mt-1 text-caption text-[color:var(--muted)]">{SUBJECT_LABELS[task.subjectId] ?? task.subjectId}</p>
                  </div>
                  <p className="text-caption text-[color:var(--muted-strong)]">목표 {task.targetCount}개</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/exams/appraisal-first" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            과목 허브로 이동
          </Link>
          <Link href="/exams/appraisal-first/starter-diagnosis" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
            스타터 진단 다시 보기
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-h3 font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

