import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { getExamArchiveById, listExamArchiveSubjects } from "@/lib/inverge/exam-archive-repository";

type PageProps = {
  params: Promise<{ examId: string }>;
};

export default async function ExamArchiveDetailPage({ params }: PageProps) {
  const { examId } = await params;
  const [exam, subjects] = await Promise.all([getExamArchiveById(examId), listExamArchiveSubjects(examId)]);

  return (
    <RefinedShell className="space-y-8 sm:space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>기출 아카이브</RefinedBadge>
        {exam ? (
          <h1 className="mt-5 text-[32px] font-medium leading-[1.2] tracking-[-0.03em] text-[color:var(--foreground-strong)] sm:text-[40px]">
            {exam.year}년 {exam.round}회 {exam.type === "first" ? "1차" : "2차"} 과목 선택
          </h1>
        ) : (
          <>
            <h1 className="mt-5 text-[32px] font-medium leading-[1.2] tracking-[-0.03em] text-[color:var(--foreground-strong)] sm:text-[40px]">
              시험 정보 확인 중
            </h1>
            <p className="mt-3 text-body text-[color:var(--muted)]">선택한 시험 ID: {examId}</p>
          </>
        )}
        <p className="mt-3 text-body text-[color:var(--muted)]">과목을 선택하면 문제 목록 화면으로 이동합니다.</p>
      </section>

      {subjects.length > 0 ? (
        <section className="grid gap-4">
          {subjects.map((subject) => (
            <article key={subject.subject} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
              <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">{subject.subject}</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">문항 수: {subject.questionCount}개</p>
              <Link
                href={`/exams/archive/${examId}/subjects/${encodeURIComponent(subject.subject)}`}
                className="mt-4 inline-flex text-sm font-medium text-[color:var(--brand-900)] underline underline-offset-4"
              >
                문제 목록 보기
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
          <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">과목 데이터 연결 대기 중</h2>
          <p className="mt-3 text-body text-[color:var(--muted)]">
            아직 연결된 과목 문제가 없습니다. 데이터가 준비되면 과목별 카드에서 문제 목록으로 이어집니다.
          </p>
        </section>
      )}

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/exams/archive"
            className="inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)] transition-colors hover:bg-[color:var(--surface-subtle)]"
          >
            아카이브로 돌아가기
          </Link>
          <Link
            href="/exams"
            className="inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)] transition-colors hover:bg-[color:var(--surface-subtle)]"
          >
            시험 선택으로 이동
          </Link>
        </div>
      </section>
    </RefinedShell>
  );
}
