"use client";

import { motion, useReducedMotion } from "framer-motion";

const HIGHLIGHT_CHIPS = ["요건", "예외", "선지 판단 기준"] as const;

export function FrontPageHeroAnimation() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] p-4 sm:p-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-[color:var(--muted)]">답안 검토실 데모</p>
          <h2 className="text-lg font-semibold text-[color:var(--foreground-strong)]">문제 스냅 → 설명 초안</h2>
        </div>

        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: reduceMotion ? 0 : 0.04, ease: "easeOut" }}
        >
          <p className="text-xs font-medium tracking-wide text-[color:var(--muted)]">[문제 사진]</p>
          <p className="mt-1.5 text-sm font-medium text-[color:var(--foreground-strong)]">민법 예시 · 착오 취소</p>
          <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">“착오로 인한 의사표시 취소 요건을 묻는 선지”</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">OCR 초안</p>
          <p className="mt-1.5 text-sm text-[color:var(--foreground-strong)]">중요 부분의 착오와 중대한 과실 여부를 먼저 나눠 봅니다.</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">하이라이트</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">핵심 조건</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HIGHLIGHT_CHIPS.map((chip, index) => (
              <span
                key={chip}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  index === 0
                    ? "border-[color:var(--primary)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
                    : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground-strong)]"
                }`}
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
          transition={{ duration: 0.32, delay: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">설명 초안</p>
          <p className="mt-1.5 text-sm text-[color:var(--foreground-strong)]">선지 판단 전에 ‘중요 부분 착오’와 ‘중과실 예외’를 분리합니다.</p>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-[color:var(--primary)] bg-[color:var(--surface)] p-4"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: reduceMotion ? 0 : 0.52, ease: "easeOut" }}
        >
          <p className="text-xs text-[color:var(--muted)]">오늘 할 일</p>
          <p className="mt-1.5 text-sm font-medium text-[color:var(--foreground-strong)]">착오 취소 선지 2개 다시 풀기</p>
        </motion.div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-[color:var(--muted)]">예시는 학습 흐름을 보여주기 위한 샘플입니다.</p>
    </div>
  );
}
