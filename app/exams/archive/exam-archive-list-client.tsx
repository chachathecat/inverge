"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { RefinedBadge } from "@/components/inverge/refined-primitives";
import type { ExamArchiveRow } from "@/lib/inverge/exam-archive-repository";

type Props = { exams: ExamArchiveRow[] };

export function ExamArchiveListClient({ exams }: Props) {
  const reduceMotion = useReducedMotion();

  if (exams.length === 0) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
        <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">기출 데이터 연결 대기 중</h2>
        <p className="mt-3 text-body text-[color:var(--muted)]">
          아직 연결된 기출 문제가 없습니다. 데이터를 시드하면 이곳에서 연도·회차·과목별로 문제와 답안을 탐색할 수 있습니다.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/exams" className="inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)] transition-colors hover:bg-[color:var(--surface-subtle)]">
            시험 선택으로 돌아가기
          </Link>
          <Link href="/answer-review" className="inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--foreground-strong)] transition-colors hover:bg-[color:var(--surface-subtle)]">
            답안 검토실로 이동
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      {exams.map((exam, index) => (
        <motion.article
          key={exam.id}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : index * 0.03, ease: "easeOut" }}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">
              {exam.year}년 {exam.round}회 {exam.type === "first" ? "1차" : "2차"}
            </h2>
            <RefinedBadge>{exam.type === "first" ? "1차" : "2차"}</RefinedBadge>
          </div>
          <p className="mt-2 text-sm text-[color:var(--muted)]">과목별 문제·답안·해설 탐색으로 이어집니다.</p>
          <Link href={`/exams/archive/${exam.id}`} className="mt-4 inline-flex text-sm font-medium text-[color:var(--brand-900)] underline underline-offset-4">
            과목 보기
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
