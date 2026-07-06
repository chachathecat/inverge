import Link from "next/link";

import { RefinedBadge } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const S220C_STEPS = [
  {
    title: "1. 답안 입력/업로드",
    body: "사진, PDF, 텍스트 중 하나로 오늘 쓴 답안을 시작합니다.",
  },
  {
    title: "2. OCR/텍스트 확인",
    body: "OCR/AI 결과는 학습 보조 초안입니다. 저장 전 직접 확인해 주세요.",
  },
  {
    title: "3. 감점 위험 확인",
    body: "가장 큰 감점 위험 1개와 왜 위험한지 먼저 확인합니다.",
  },
  {
    title: "4. 다시쓰기/복습 연결",
    body: "다시 쓸 문단 1개와 Today Plan / Review Queue 연결을 미리 봅니다.",
  },
] as const;

const S220C_INPUTS = ["답안 사진", "PDF/파일", "텍스트 붙여넣기"] as const;

export function S220CFirstFiveMinuteMagic() {
  return (
    <section
      data-testid="s220c-first-five-minute-magic"
      className="space-y-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <RefinedBadge>첫 5분 흐름</RefinedBadge>
        <RefinedBadge tone="amber">2차 답안 훈련</RefinedBadge>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <h1 className="text-[32px] font-medium leading-tight tracking-[-0.04em] text-[color:var(--foreground-strong)] sm:text-[40px]">
            오늘 쓴 답안 하나만 올리세요.
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">
            답안길은 첫 입력을 가장 큰 감점 위험 1개, 다시 쓸 문단 1개, 다음 복습 후보로 압축합니다.
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4">
          <p className="text-caption font-medium text-[color:var(--muted)]">시작 방식</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {S220C_INPUTS.map((input) => (
              <span key={input} className="rounded-full border border-[var(--border)] bg-[color:var(--surface)] px-3 py-1 text-caption text-[color:var(--foreground-strong)]">
                {input}
              </span>
            ))}
          </div>
          <Link href="#answer-review-start" className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}>답안 입력으로 이동</Link>
        </div>
      </div>

      <ol className="grid gap-3 md:grid-cols-4">
        {S220C_STEPS.map((step) => (
          <li key={step.title} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
            <p className="text-sm font-semibold text-[color:var(--foreground-strong)]">{step.title}</p>
            <p className="mt-2 text-caption leading-5 text-[color:var(--muted)]">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <p className="text-caption font-medium text-[color:var(--muted)]">감점 위험 preview</p>
          <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">누락 논점 또는 약한 구조를 하나로 좁힙니다.</p>
        </article>
        <article className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <p className="text-caption font-medium text-[color:var(--muted)]">다시 쓸 문단 preview</p>
          <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">오늘 바로 고칠 문장/문단 1개로 이어갑니다.</p>
        </article>
        <article className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
          <p className="text-caption font-medium text-[color:var(--muted)]">계속할 곳</p>
          <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">Today Plan, Review Queue, Notes로 이어질 수 있음을 먼저 보여줍니다.</p>
        </article>
      </div>
    </section>
  );
}
