import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { listExamArchive } from "@/lib/inverge/exam-archive-repository";

import { ExamArchiveListClient } from "./exam-archive-list-client";

export default async function ExamArchivePage() {
  const exams = await listExamArchive().catch(() => []);

  return (
    <RefinedShell className="space-y-8 sm:space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>기출 아카이브</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          감정평가사 기출 문제 아카이브
        </h1>
        <p className="mt-3 text-body text-[color:var(--muted)] sm:mt-5">
          연도/회차를 선택하고 과목별 문제·답안·해설로 이어가세요.
        </p>
      </section>

      <ExamArchiveListClient exams={exams} />

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
        <p className="text-sm text-[color:var(--muted)]">
          시험 트랙 선택이 필요하면 <Link href="/exams" className="font-medium text-[color:var(--brand-900)] underline underline-offset-4">시험 선택 허브</Link>로 돌아가세요.
        </p>
      </section>
    </RefinedShell>
  );
}
