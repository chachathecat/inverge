"use client";

import { motion, useReducedMotion } from "framer-motion";

const HIGHLIGHT_CHIPS = ["요건", "예외", "선지 판단 기준"] as const;

export function FrontPageHeroAnimation() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="space-y-4">
        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <p className="text-xs font-medium tracking-wide text-[color:var(--muted)]">민법 예시 · 착오 취소</p>
          <p className="mt-2 text-sm text-[color:var(--foreground-strong)]">문제 스냅: 착오로 인한 의사표시 취소 요건을 묻는 선지</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">OCR 초안</p>
          <p className="mt-1.5 text-sm text-[color:var(--foreground-strong)]">중요 부분의 착오와 중대한 과실 여부를 먼저 나눠 봅니다.</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.24, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">핵심 조건 하이라이트</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HIGHLIGHT_CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1 text-xs text-[color:var(--foreground-strong)]"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.36, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">설명 초안</p>
          <p className="mt-1.5 text-sm text-[color:var(--foreground-strong)]">선지 판단 전에 ‘중요 부분 착오’와 ‘중과실 예외’를 분리합니다.</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--primary)] bg-[color:var(--surface)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.48, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">오늘 할 일</p>
          <p className="mt-1.5 text-sm font-medium text-[color:var(--foreground-strong)]">착오 취소 선지 2개 다시 풀기</p>
        </motion.div>
      </div>
    </div>
  );
}
