import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QuietSection, RefinedBadge, RefinedShell, SectionHeading } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FrontPageHeroAnimation } from "@/components/inverge/front-page-hero-animation";

const LOOP_SUMMARY = [
  {
    title: "1. 오늘 한 것 올리기",
    description: "사진, PDF, 텍스트 중 하나로 오늘 쓴 답안을 남깁니다.",
    detail: "OCR 초안은 저장 전 직접 수정할 수 있습니다.",
  },
  {
    title: "2. 가장 큰 약점 확인",
    description: "쟁점, 기준, 법리, 계산 근거 중 가장 먼저 고칠 1개를 찾습니다.",
    detail: "점수보다 오늘 다시 쓸 문단을 먼저 정리합니다.",
  },
  {
    title: "3. 오늘 계획 반영",
    description: "다시쓰기, 복습, 학습 노트로 이어질 다음 행동을 남깁니다.",
    detail: "공식 채점이나 합격 판정이 아니라 학습 보조 초안입니다.",
  },
] as const;

function ResultPreviewCard() {
  return (
    <section
      id="demo"
      className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-focus)] sm:p-6"
      aria-label="답안길 결과 미리보기"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="rounded-full bg-[color:var(--brand-050)] px-3 py-1 text-caption font-medium text-[color:var(--brand-900)]">
          데모 결과
        </p>
        <p className="text-caption text-[color:var(--muted)]">공식 채점 아님</p>
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <p className="text-caption font-medium text-[color:var(--muted)]">AI가 찾은 가장 큰 약점</p>
          <p className="mt-2 text-[18px] leading-7 text-[color:var(--foreground-strong)]">
            쟁점은 잡았지만 기준/법리 문단이 약합니다.
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--warningSoft)] px-4 py-4">
          <p className="text-caption font-medium text-[color:var(--muted)]">오늘 다시 쓸 문단</p>
          <p className="mt-2 text-[15px] leading-7 text-[color:var(--foreground-strong)]">
            민법 제109조의 중요 부분 착오와 중대한 과실 예외를 분리해 쓰기
          </p>
        </div>
      </div>
    </section>
  );
}

export function FrontPage() {
  return (
    <RefinedShell className="space-y-14 py-10 sm:py-14 lg:py-16">
      <section className="grid min-h-[calc(100vh-180px)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12">
        <div className="space-y-7">
          <RefinedBadge>비공개 베타 · 감정평가사 2차</RefinedBadge>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-h1 font-semibold text-[color:var(--foreground-strong)]">
              오늘 쓴 답안에서
              <br />
              가장 먼저 고칠 문단을 찾습니다.
            </h1>
            <p className="max-w-[44rem] text-body text-[color:var(--muted)]">
              사진이나 텍스트를 올리면
              <br className="hidden sm:block" />
              가장 큰 감점 위험 1개와
              <br className="hidden sm:block" />
              오늘 다시 쓸 문단 1개로 정리합니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/answer-review?mode=second"
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              오늘 답안 올리기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#demo"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
            >
              데모 먼저 보기
            </Link>
          </div>
        </div>
        <ResultPreviewCard />
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="답안 훈련 루프"
          title="오늘 한 것을 다음 행동으로 바꿉니다"
          description="전체 답안을 한 번에 고치려 하지 않고, 가장 큰 간극 1개와 다음 행동 1개로 줄입니다."
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

      <details className="quiet-disclosure rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-[color:var(--foreground-strong)]">
          전체 Skeleton Framework 보기
        </summary>
        <div className="border-t border-[color:var(--border-subtle)] px-4 py-5 sm:px-6">
          <FrontPageHeroAnimation />
        </div>
      </details>
    </RefinedShell>
  );
}
