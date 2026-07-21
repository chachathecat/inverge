"use client";

import { motion, useReducedMotion } from "framer-motion";

import { V3Surface } from "@/components/learner";

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
    <V3Surface tone="focus" density="compact" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="v3-type-caption text-[var(--color-text-link)]">
          답안길 미리보기
        </p>
        <p className="v3-type-caption text-[var(--color-text-secondary)]">공식 채점 아님</p>
      </div>

      <div className="mt-4 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
        {PREVIEW_ROWS.map((row, index) => (
          <motion.article
            key={row.label}
            className="py-4"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: reduceMotion ? 0 : index * 0.08, ease: "easeOut" }}
          >
            <p className="v3-type-caption text-[var(--color-text-secondary)]">{row.label}</p>
            <p className="v3-type-compact ko-keep mt-1 text-[var(--color-text-primary)]">{row.value}</p>
          </motion.article>
        ))}
      </div>

      <p className="v3-type-caption ko-keep mt-4 text-[var(--color-text-secondary)]">
        예시는 학습 흐름을 보여주기 위한 샘플입니다.
      </p>
    </V3Surface>
  );
}
