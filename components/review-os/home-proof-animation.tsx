"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const PROOF_STEPS = [
  { label: "문제 스냅", detail: "스크린샷/사진 입력" },
  { label: "OCR 초안 생성", detail: "핵심 문장 추출" },
  { label: "핵심 조건 확인", detail: "핵심 조건: 요건 1개 누락" },
  { label: "설명 초안", detail: "설명 초안: 선지 판단 전에 요건을 먼저 고정합니다." },
  { label: "오늘 할 일", detail: "오늘 할 일: 같은 유형 2문제 다시 풀기" },
] as const;

export function HomeProofAnimation() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] p-4 sm:p-5" aria-label="학습 루프 시각 증거">
      <p className="text-caption font-medium text-[color:var(--muted)]">입력에서 다음 행동까지</p>
      <div className="mt-3 space-y-2.5">
        {PROOF_STEPS.map((step, index) => (
          <motion.article
            key={step.label}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? undefined : { duration: 0.28, ease: "easeOut", delay: index * 0.18 }}
            className={cn(
              "rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-3 py-2.5",
              index === PROOF_STEPS.length - 1 ? "border-[color:var(--border-strong)]" : "",
            )}
          >
            <p className="text-xs font-semibold text-[color:var(--foreground-strong)]">{step.label}</p>
            <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">{step.detail}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
