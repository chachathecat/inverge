import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QuietSection, RefinedBadge, RefinedShell, SectionHeading } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOOP_SUMMARY = [
  {
    title: "감정평가사 1차",
    description: "세트 풀이 → 오답 이유 → 회상 → 재시도 큐",
    detail: "객관식 세트에서 틀린 이유를 남기고, 회상 후 재시도 항목만 정리합니다.",
  },
  {
    title: "감정평가사 2차",
    description: "쟁점 회상 → 답안 비교 → 가장 큰 간극 → 문단 다시쓰기",
    detail: "한 번에 하나의 간극만 고쳐 문단 재작성으로 바로 이어갑니다.",
  },
] as const;

export function FrontPage() {
  return (
    <RefinedShell className="space-y-16 py-12 sm:py-16 lg:py-20">
      <section className="max-w-4xl space-y-6">
        <RefinedBadge>감정평가사 합격 운영 시스템</RefinedBadge>
        <div className="space-y-5">
          <h1 className="max-w-4xl text-[42px] font-medium leading-[1.08] tracking-[-0.055em] text-[color:var(--foreground-strong)] sm:text-[58px]">
            오늘 해야 할 학습 행동을 정리합니다.
          </h1>
          <p className="max-w-3xl text-body text-[color:var(--muted)]">
            감정평가사 1차와 2차를 분리해 운영하고, 점수보다 다음 행동을 정리합니다.
          </p>
        </div>
        <div>
          <Link href="/exams" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
            시작하기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        <p className="text-sm leading-7 text-[color:var(--muted)]">학원용 답안 운영 콘솔은 별도 준비 중</p>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="학습 운영 루프"
          title="점수보다 다음 행동을 정리합니다"
          description="두 루프 모두 결과 확인에서 끝나지 않고 재시도/다시쓰기로 이어집니다."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {LOOP_SUMMARY.map((step) => (
            <QuietSection key={step.title} className="p-6">
              <h2 className="text-title text-[color:var(--foreground-strong)]">{step.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[color:var(--foreground-strong)]">{step.description}</p>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{step.detail}</p>
            </QuietSection>
          ))}
        </div>
      </section>
    </RefinedShell>
  );
}
