import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { listExamArchive } from "@/lib/inverge/exam-archive-repository";

import { ExamListClient } from "./exam-list-client";

export default async function ExamsPage() {
  const exams = await listExamArchive();

  return (
    <RefinedShell className="space-y-8 sm:space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>시험</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          감정평가사 1·2차 기출 문제 아카이브
        </h1>
        <p className="mt-3 text-body text-[color:var(--muted)] sm:mt-5">연도/회차를 선택하고 과목별 연습과 복습으로 이어가세요.</p>
      </section>

      <ExamListClient exams={exams} />
    </RefinedShell>
  );
}
