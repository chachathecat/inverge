"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { RefinedBadge } from "@/components/inverge/refined-primitives";
import type { ExamArchiveRow } from "@/lib/inverge/exam-archive-repository";

type Props = { exams: ExamArchiveRow[] };

export function ExamListClient({ exams }: Props) {
  const reduceMotion = useReducedMotion();

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
          <p className="mt-2 text-sm text-[color:var(--muted)]">과목 선택 후 문제 풀이와 복습을 시작할 수 있습니다.</p>
          <Link href={`/exams/${exam.id}/subjects`} className="mt-4 inline-flex text-sm font-medium text-[color:var(--brand-900)] underline underline-offset-4">
            과목 선택으로 이동
          </Link>
        </motion.article>
      ))}
    </div>
  );
}
