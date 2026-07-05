import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QuietSection, RefinedBadge, RefinedShell, SectionHeading } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FrontPageHeroAnimation } from "@/components/inverge/front-page-hero-animation";

const ANSWER_REVIEW_EXAMPLES = [
  {
    title: "답안 스냅",
    fields: "답안 사진 / 텍스트 / 문제 조건",
    outcome: "답안 1개에서 가장 큰 감점 위험 1개를 찾습니다.",
  },
  {
    title: "문단 다시쓰기",
    fields: "보강할 논점 / 약한 구조 / 다시 쓸 문장",
    outcome: "오늘 다시 쓸 문단 1개로 바로 이어집니다.",
  },
  {
    title: "복습 연결",
    fields: "쟁점 후보 / 다음 행동 / 복습 메모",
    outcome: "내일 확인할 10초 복습으로 남깁니다.",
  },
] as const;

const LOOP_SUMMARY = [
  {
    title: "1. 답안 올리기",
    description: "사진이나 텍스트로 오늘 쓴 2차 답안을 넣습니다.",
    detail: "OCR과 AI 결과는 학습 보조 초안이며 저장 전 직접 확인합니다.",
  },
  {
    title: "2. 감점 위험 찾기",
    description: "누락 쟁점, 약한 구조, 다시 쓸 문단을 하나로 압축합니다.",
    detail: "점수보다 오늘 고칠 행동을 먼저 보여줍니다.",
  },
  {
    title: "3. 다시쓰기 연결",
    description: "가장 큰 간극을 문단 다시쓰기와 복습 후보로 이어갑니다.",
    detail: "공식 채점이나 합격 판정이 아니라 답안 훈련 초안입니다.",
  },
] as const;

export function FrontPage() {
  return (
    <RefinedShell className="space-y-12 py-10 sm:py-14 lg:py-16">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_500px] lg:gap-10">
        <div className="space-y-6">
          <RefinedBadge>답안길 · 감정평가사 2차 답안 훈련 OS</RefinedBadge>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-[42px] font-medium leading-[1.08] tracking-[-0.055em] text-[color:var(--foreground-strong)] sm:text-[58px]">
              오늘 쓴 답안을
              <br className="hidden sm:block" />
              다시 쓸 문단으로 바꿉니다.
            </h1>
            <p className="max-w-3xl text-body text-[color:var(--muted)]">
              답안 사진이나 텍스트를 올리면 OCR 초안과 답안 구조를 확인하고, 가장 큰 감점 위험 1개와 다시 쓸 문단 1개로 정리합니다.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/answer-review?mode=second" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                답안 올리고 감점 위험 찾기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <p className="text-sm text-[color:var(--muted)]">감정평가사 2차 답안 검토 흐름으로 바로 시작합니다.</p>
            <p className="text-sm text-[color:var(--muted)]">로그인 없이 오늘 1회 답안 검토를 체험해볼 수 있습니다.</p>
            <p className="text-xs text-[color:var(--muted)]">검토 결과는 학습 보조 초안이며 공식 채점, 확정 점수, 합격 가능성 예측이 아닙니다.</p>
          </div>
        </div>
        <FrontPageHeroAnimation />
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="2차 답안 입력"
          title="답안 1개에서 다음 실행 1개를 만듭니다"
          description="입력을 먼저 남기면 비교·다시쓰기·복습 순서를 차분히 이어갑니다."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {ANSWER_REVIEW_EXAMPLES.map((example) => (
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
          eyebrow="답안 훈련 루프"
          title="점수보다 다시 쓸 행동을 정리합니다"
          description="답안 검토 이후 흐름이 궁금할 때만 하단에서 확인하세요."
        />
        <div className="grid gap-4 md:grid-cols-3">
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
