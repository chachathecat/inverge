"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { ProbabilityRecordsSummary } from "@/lib/actuary-first/types";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "empty" | "error";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ActuaryFirstRecordsPage({ subjectId }: { subjectId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<ProbabilityRecordsSummary | null>(null);

  useEffect(() => {
    logInvergeEvent("first.records.viewed", {
      examId: "actuary_first",
      stage: "first",
      subjectId,
    });
    void load();
  }, [subjectId]);

  async function load() {
    setStatus("loading");
    try {
      const response = await fetch("/api/actuary-first/records?subjectId=probability", { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; data?: ProbabilityRecordsSummary };
      const next = result.data ?? null;
      setSummary(next);
      setStatus(next?.items.length ? "ready" : "empty");
    } catch {
      setStatus("error");
    }
  }

  const items = useMemo(() => summary?.items ?? [], [summary]);

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-[880px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
          <p className="text-sm text-[color:var(--muted)]">기록을 정리하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto w-full max-w-[880px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
          <h1 className="text-h2 font-medium text-[color:var(--foreground-strong)]">기록을 불러오지 못했습니다.</h1>
          <Button type="button" onClick={() => void load()} className="mt-6">
            다시 시도
            <RotateCcw className="ml-2 h-4 w-4" />
          </Button>
        </section>
      </main>
    );
  }

  if (status === "empty" || !summary) {
    return (
      <main className="mx-auto w-full max-w-[880px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8 sm:p-10">
          <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">아직 쌓인 기록이 없습니다.</h1>
          <p className="mt-4 text-body text-[color:var(--muted)]">샘플 세트를 한 번 풀면 계산 패턴과 다음 행동이 기록에 들어옵니다.</p>
          <Link href="/exams/actuary-first/probability/past-set/intro-12" className={cn(buttonVariants({ size: "lg" }), "mt-7 w-full sm:w-auto")}>
            샘플 세트 풀기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[880px] px-5 py-10">
      <div className="space-y-6">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-medium text-[color:var(--muted)]">계리사 1차 · 확률론 기록</p>
            <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">반복되는 계산 포인트만 조용하게 정리합니다.</h1>
            <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">{summary.aggregate.summarySentence}</p>
          </div>
          <Link href="/exams/actuary-first/probability/past-set/intro-12" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            세트 다시 풀기
          </Link>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="세트 수" value={`${summary.aggregate.setCount}개`} />
          <SummaryTile label="리뷰 완료" value={`${summary.aggregate.reviewCompletedCount}개`} />
          <SummaryTile label="최근 활동" value={summary.aggregate.recentActivityAt ? formatDate(summary.aggregate.recentActivityAt) : "없음"} />
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-3 sm:p-4">
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <article key={item.id} className="flex gap-4 px-2 py-5 sm:px-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)]">
                  {item.type === "pastSet" ? (
                    <BookOpen className="h-4 w-4 text-[color:var(--muted-strong)]" />
                  ) : item.type === "review" ? (
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--muted-strong)]" />
                  ) : (
                    <ClipboardList className="h-4 w-4 text-[color:var(--muted-strong)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-caption text-[color:var(--muted)]">{item.type}</span>
                    <time className="text-caption text-[color:var(--muted)]">{formatDate(item.occurredAt)}</time>
                  </div>
                  <h2 className="mt-2 text-base font-medium text-[color:var(--foreground-strong)]">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[color:var(--muted)]">기록은 보조 화면입니다. 다음 세트나 리뷰로 바로 이어가는 편이 낫습니다.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/exams/actuary-first/probability/review" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
              리뷰 보기
            </Link>
            <Link href="/exams/actuary-first/probability/past-set/intro-12" className={cn(buttonVariants(), "w-full sm:w-auto")}>
              세트로 돌아가기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-h3 font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

