"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import type { ActuarySecondRecordsSummary } from "@/lib/actuary-second/types";
import { cn } from "@/lib/utils";

type RecordsResponse = {
  ok: boolean;
  data?: ActuarySecondRecordsSummary;
};

export function ActuarySecondRecordsPage({ subjectId }: { subjectId: string }) {
  const [records, setRecords] = useState<ActuarySecondRecordsSummary | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/actuary-second/records?subjectId=${subjectId}`);
        if (!response.ok) {
          if (!cancelled) setStatus("error");
          return;
        }
        const payload = (await response.json()) as RecordsResponse;
        if (!cancelled) {
          setRecords(payload.data ?? null);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 py-10">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="text-caption font-medium text-[color:var(--muted)]">보험계리사 2차 기록</p>
        <h1 className="mt-2 text-h1 font-medium text-[color:var(--foreground-strong)]">현가·연금형 교정 기록</h1>
      </header>

      {status === "loading" ? <p className="mt-6 text-sm text-[color:var(--muted)]">기록을 불러오는 중입니다.</p> : null}
      {status === "error" ? <p className="mt-6 text-sm text-[color:var(--status-red)]">기록을 불러오지 못했습니다.</p> : null}

      {status === "ready" && records ? (
        <div className="grid gap-7 py-7 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-5">
              <p className="text-caption font-medium text-[color:var(--muted)]">요약</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-strong)]">{records.aggregate.summarySentence}</p>
              <p className="mt-2 text-caption text-[color:var(--muted)]">
                제출 {records.aggregate.submissionCount}건 / 리뷰 후보 {records.aggregate.reviewCandidateCount}건
              </p>
            </section>

            <Link
              href="/exams/actuary-second/insurance_math/present-value/sample-1"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              샘플로 돌아가기
            </Link>
          </aside>

          <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
            <div className="border-b border-[var(--border)] px-6 py-5">
              <p className="text-caption font-medium text-[color:var(--muted)]">타임라인</p>
            </div>
            <ol className="divide-y divide-[var(--border)]">
              {records.items.map((item) => (
                <li key={item.id} className="px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{item.title}</p>
                    <span className="text-caption text-[color:var(--muted)]">{new Date(item.occurredAt).toLocaleString("ko-KR")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{item.description}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </main>
  );
}
