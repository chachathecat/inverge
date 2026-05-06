import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QuietSection, RefinedBadge, RefinedShell, SectionHeading } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FrontPageHeroAnimation } from "@/components/inverge/front-page-hero-animation";

const INPUT_EXAMPLES = [
  {
    title: "1차 오답 기록",
    fields: "틀린 문제 / 내가 고른 답 / 틀린 이유",
    outcome: "문제 1개면 다음 복습이 잡힙니다.",
  },
  {
    title: "1차 세트 풀이",
    fields: "과목 / 문항 수 / 정답 / 내 답",
    outcome: "세트 입력 후 재시도 순서가 정리됩니다.",
  },
  {
    title: "오늘 공부 기록",
    fields: "본 범위 / 어려웠던 점 / 다시 볼 범위",
    outcome: "학습 기록 후 다음 복습 신호를 정리합니다.",
  },
  {
    title: "2차 답안",
    fields: "내 답안 / 기준 답안 / 보강할 문단",
    outcome: "답안 1개로 보강 간극 1개를 찾습니다.",
  },
] as const;

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
    <RefinedShell className="space-y-12 py-10 sm:py-14 lg:py-16">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_500px] lg:gap-10">
        <div className="space-y-6">
          <RefinedBadge>감정평가사 합격 운영 시스템</RefinedBadge>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-[42px] font-medium leading-[1.08] tracking-[-0.055em] text-[color:var(--foreground-strong)] sm:text-[58px]">
              오늘의 오답과 답안을
              <br className="hidden sm:block" />
              내일의 실행 순서로 바꿉니다.
            </h1>
            <p className="max-w-3xl text-body text-[color:var(--muted)]">
              문제나 답안 사진을 올리면 OCR 초안 → 핵심 조건 하이라이트 → 설명 초안 → 오늘 할 일로 정리됩니다. 감정평가사 1차/2차 공부를 실행 중심으로 이어가게 만듭니다.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/exams" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                오늘 입력 시작
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/answer-review?mode=second"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 w-full px-4 sm:w-auto border-[color:var(--border)] bg-[color:var(--surface)]"
                )}
              >
                답안 검토실 보기
              </Link>
            </div>
            <p className="text-sm text-[color:var(--muted)]">감정평가사 1차/2차 입력 화면으로 바로 이동합니다.</p>
            <p className="text-sm text-[color:var(--muted)]">문제 스냅, 답안 스냅, 텍스트 입력을 모두 오늘 할 일로 연결합니다.</p>
            <p className="text-xs text-[color:var(--muted)]">검토 결과는 학습 보조 초안이며 저장 전 직접 확인해 주세요.</p>
          </div>
        </div>
        <FrontPageHeroAnimation />
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="오늘 입력할 수 있는 것"
          title="입력 1개에서 다음 실행 1개를 만듭니다"
          description="입력을 먼저 남기면 복습·비교·다시쓰기 순서를 차분히 이어갑니다."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {INPUT_EXAMPLES.map((example) => (
            <QuietSection key={example.title} className="space-y-2.5 p-4 sm:p-5">
              <h2 className="text-title text-[color:var(--foreground-strong)]">{example.title}</h2>
              <p className="text-sm leading-6 text-[color:var(--foreground-strong)]">{example.fields}</p>
              <p className="text-sm leading-6 text-[color:var(--muted)]">{example.outcome}</p>
            </QuietSection>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="학습 운영 루프"
          title="점수보다 다음 행동을 정리합니다"
          description="입력 이후 흐름이 궁금할 때만 하단에서 확인하세요."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {LOOP_SUMMARY.map((step) => (
            <QuietSection key={step.title} className="p-4 sm:p-5">
              <h2 className="text-title text-[color:var(--foreground-strong)]">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-strong)]">{step.description}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{step.detail}</p>
            </QuietSection>
          ))}
        </div>
      </section>
    </RefinedShell>
  );
}
