"use client";

import { motion, useReducedMotion } from "framer-motion";

const FLOW_STEPS = [
  { label: "오답/답안 입력", detail: "입력 1개" },
  { label: "원인·쟁점 정리", detail: "핵심 간극 1개" },
  { label: "오늘 할 일 생성", detail: "재시도 순서" },
  { label: "노트에 누적", detail: "다음 복습 연결" },
] as const;

export function FrontPageHeroAnimation() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-4 sm:p-6">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[color:var(--primary-soft)] blur-3xl"
        animate={reduceMotion ? undefined : { opacity: [0.45, 0.65, 0.45], scale: [1, 1.05, 1] }}
        transition={reduceMotion ? undefined : { duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 space-y-3">
        {FLOW_STEPS.map((step, index) => (
          <motion.div
            key={step.label}
            className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: reduceMotion ? 0 : index * 0.1, ease: "easeOut" }}
          >
            {index < FLOW_STEPS.length - 1 ? (
              <span className="absolute left-6 top-[100%] h-3 w-px bg-[color:var(--border-subtle)]" aria-hidden />
            ) : null}
            <div className="flex items-start gap-3">
              <motion.span
                className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--primary)]"
                animate={reduceMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
                transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, delay: index * 0.16, ease: "easeInOut" }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{step.label}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">{step.detail}</p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
                <span className="text-[11px] text-[color:var(--muted)]">진행 중</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative z-10 mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-3"
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.45 }}
      >
        <div className="mb-2 flex items-center justify-between text-xs text-[color:var(--muted)]">
          <span>오늘 실행 루프</span>
          <span>4/4 준비됨</span>
        </div>
        <div className="h-1.5 rounded-full bg-[color:var(--surface)]">
          <motion.div
            className="h-full rounded-full bg-[color:var(--primary)]"
            initial={{ width: reduceMotion ? "100%" : "16%" }}
            animate={{ width: "100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.9, delay: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
