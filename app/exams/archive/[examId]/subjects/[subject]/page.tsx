import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";

type PageProps = {
  params: Promise<{ examId: string; subject: string }>;
};

export default async function ExamArchiveSubjectPage({ params }: PageProps) {
  const { examId, subject } = await params;
  const decodedSubject = decodeURIComponent(subject);

  return (
    <RefinedShell className="space-y-8 sm:space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>기출 아카이브</RefinedBadge>
        <h1 className="mt-5 text-[32px] font-medium leading-[1.2] tracking-[-0.03em] text-[color:var(--foreground-strong)] sm:text-[40px]">
          {decodedSubject}
        </h1>
        <p className="mt-3 text-body text-[color:var(--muted)]">시험 ID: {examId}</p>
        <p className="mt-2 text-body text-[color:var(--muted)]">문제 목록은 데이터 연결 후 제공됩니다.</p>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/exams/archive/${examId}`}
            className="inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)] transition-colors hover:bg-[color:var(--surface-subtle)]"
          >
            시험 과목 선택으로 돌아가기
          </Link>
          <Link
            href="/exams/archive"
            className="inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)] transition-colors hover:bg-[color:var(--surface-subtle)]"
          >
            아카이브로 돌아가기
          </Link>
        </div>
      </section>
    </RefinedShell>
  );
}
