import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";

const SUBJECTS = {
  first: ["민법", "경제학", "부동산학원론", "감정평가관계법규", "회계학"],
  second: ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"],
} as const;

export default async function ExamSubjectsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;

  return (
    <RefinedShell className="space-y-8">
      <section>
        <RefinedBadge>과목 선택</RefinedBadge>
        <h1 className="mt-4 text-h1 font-medium text-[color:var(--foreground-strong)]">과목을 선택하고 연습을 시작하세요.</h1>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {[...SUBJECTS.first, ...SUBJECTS.second].map((subject) => (
          <Link
            key={subject}
            href={`/app?examId=${examId}&subject=${encodeURIComponent(subject)}`}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 text-sm text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)]"
          >
            {subject}
          </Link>
        ))}
      </section>
    </RefinedShell>
  );
}
