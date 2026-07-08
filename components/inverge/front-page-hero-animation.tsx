"use client";

import { motion, useReducedMotion } from "framer-motion";

const PREVIEW_ROWS = [
  {
    label: "가장 큰 약점",
    value: "쟁점은 잡았지만 기준/법리 문단이 약합니다.",
  },
  {
    label: "오늘 다시 쓸 문단",
    value: "민법 제109조의 중요 부분 착오와 중대한 과실 예외를 분리해 쓰기",
  },
] as const;

export function FrontPageHeroAnimation() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rounded-full bg-[color:var(--brand-050)] px-3 py-1 text-caption font-medium text-[color:var(--brand-900)]">
          답안길 미리보기
        </p>
        <p className="text-caption text-[color:var(--muted)]">공식 채점 아님</p>
      </div>

      <div className="mt-5 space-y-3">
        {PREVIEW_ROWS.map((row, index) => (
          <motion.article
            key={row.label}
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reduceMotion ? 0 : index * 0.08, ease: "easeOut" }}
          >
            <p className="text-caption font-medium text-[color:var(--muted)]">{row.label}</p>
            <p className="ko-keep mt-1.5 text-sm leading-6 text-[color:var(--foreground-strong)]">{row.value}</p>
          </motion.article>
        ))}
      </div>

      <p className="ko-keep mt-4 text-[11px] leading-5 text-[color:var(--muted)]">
        예시는 학습 흐름을 보여주기 위한 샘플입니다.
      </p>
    </div>
  );
}
