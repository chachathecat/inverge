import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QuietSection, RefinedBadge, RefinedShell, SectionHeading } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ENTRY_CARDS = [
  {
    title: "감정평가사 1차 시작",
    description: "오답을 줄이고 review queue를 운영합니다",
    href: "/app?mode=first",
  },
  {
    title: "감정평가사 2차 시작",
    description: "답안을 비교하고 rewrite 흐름을 고정합니다",
    href: "/app?mode=second",
  },
] as const;

const WORKFLOW = [
  {
    title: "1차 오답",
    description: "민법, 경제학원론, 회계학, 부동산학원론에서 다시 볼 문제만 남깁니다.",
  },
  {
    title: "2차 답안",
    description: "작성 답안과 기준 답안을 비교하고, 누락 논점 하나를 보강합니다.",
  },
  {
    title: "우선순위",
    description: "오늘 다시 볼 항목과 먼저 줄일 실수를 조용히 정리합니다.",
  },
  {
    title: "다음 행동",
    description: "점수보다 지금 남겨야 할 행동 1개를 고정합니다.",
  },
] as const;

export function FrontPage() {
  return (
    <RefinedShell className="space-y-16 py-12 sm:py-16 lg:py-20">
      <section className="max-w-4xl space-y-6">
        <RefinedBadge>감정평가사 closed alpha</RefinedBadge>
        <div className="space-y-5">
          <h1 className="max-w-4xl text-[42px] font-medium leading-[1.08] tracking-[-0.055em] text-[color:var(--foreground-strong)] sm:text-[58px]">
            감정평가사 1차 오답과 2차 답안 보강을 오늘의 행동으로 정리합니다.
          </h1>
          <p className="max-w-3xl text-body text-[color:var(--muted)]">
            Inverge는 AI 채점기가 아닙니다. 감평사 수험생이 1차 과목 오답과 2차 답안 교정 흐름을 운영하고,
            오늘 해야 할 1가지를 놓치지 않도록 돕는 Pass Management OS입니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {ENTRY_CARDS.map((entry) => (
            <Link
              key={entry.title}
              href={entry.href}
              className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 transition duration-150 hover:border-[color:var(--brand-700)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-title text-[color:var(--foreground-strong)]">{entry.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{entry.description}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-[color:var(--brand-700)]" />
              </div>
            </Link>
          ))}
        </div>
        <div>
          <Link href="/app" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
            오늘의 운영 화면으로
          </Link>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="운영 원칙"
          title="점수보다 다음 행동 1개가 먼저입니다"
          description="과목을 넓히기보다 오늘 다시 볼 항목, 보강할 논점, 다음 rewrite를 조용히 정리합니다."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {WORKFLOW.map((step) => (
            <QuietSection key={step.title} className="p-6">
              <p className="text-caption font-medium text-[color:var(--muted)]">{step.title}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--foreground-strong)]">{step.description}</p>
            </QuietSection>
          ))}
        </div>
      </section>
    </RefinedShell>
  );
}
