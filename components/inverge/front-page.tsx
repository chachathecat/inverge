import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QuietSection, RefinedBadge, RefinedShell, SectionHeading } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

import { FrontPageHeroAnimation } from "@/components/inverge/front-page-hero-animation";

const LOOP_SUMMARY = [
  {
    title: "1. 답안 올리기",
    description: "사진, PDF, 텍스트 중 하나로 답안 1개를 올립니다.",
    detail: "OCR 초안은 저장 전 직접 수정합니다.",
  },
  {
    title: "2. 근거 확인",
    description: "답안 근거와 빠진 논점을 확인해 가장 큰 간극 1개만 남깁니다.",
    detail: "공식 채점 아님 · 학습 보조 검토입니다.",
  },
  {
    title: "3. 다시 쓸 문단",
    description: "다시 쓸 문단 1개와 다음 복습 시점을 정합니다.",
    detail: "교정 노트와 오늘 할 일로 이어집니다.",
  },
] as const;

const TRANSFORMATION_STEPS = ["답안 올리기", "근거 확인", "가장 큰 간극 1개", "다시 쓸 문단", "복습 예약"] as const;

const DEMO_CAPTURE_HREF = "/app/capture?mode=second";
const AUTH_CAPTURE_HREF = "/login?returnTo=/app/capture?mode=second";

function ResultPreviewCard() {
  return (
    <section
      id="demo"
      className="mission-surface p-5 sm:p-6"
      aria-label="답안길 전환 흐름"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="rounded-full bg-[color:var(--brand-050)] px-3 py-1 text-caption font-medium text-[color:var(--brand-900)]">
          전환 흐름
        </p>
        <p className="text-caption text-[color:var(--muted)]">학습 보조 초안 · 공식 채점 아님</p>
      </div>
      <div className="mt-6 space-y-3">
        {TRANSFORMATION_STEPS.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[11px] font-semibold tabular-nums text-[color:var(--brand-900)]">
              {index + 1}
            </span>
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{step}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-4">
        <p className="text-caption font-medium text-[color:var(--muted)]">오늘 남길 결과</p>
        <p className="mt-2 text-[15px] leading-7 text-[color:var(--foreground-strong)]">
          가장 큰 간극 1개와 다음 재작성 행동 1개
        </p>
      </div>
    </section>
  );
}

export async function FrontPage() {
  const session = await getServerSessionUser();
  const primaryCaptureHref = session.authEnabled ? AUTH_CAPTURE_HREF : DEMO_CAPTURE_HREF;

  return (
    <RefinedShell className="space-y-14 py-10 sm:py-14 lg:py-16">
      <section className="grid min-h-[calc(100vh-180px)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12">
        <div className="space-y-7">
          <RefinedBadge>학습 보조 초안 · 공식 채점 아님</RefinedBadge>
          <div className="space-y-5">
            <h1 className="hero-balance ko-keep max-w-3xl text-h1 font-semibold text-[color:var(--foreground-strong)]">
              답안 1개에서
              <br />
              오늘 다시 쓸 문단을 정합니다.
            </h1>
            <p className="ko-keep max-w-[44rem] text-body text-[color:var(--muted)]">
              사진이나 텍스트를 올리면
              <br className="hidden sm:block" />
              답안 검토가 가장 큰 간극 1개와
              <br className="hidden sm:block" />
              다음 재작성 행동 1개로 정리합니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={primaryCaptureHref}
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
              data-s225x-dominant-primary-above-fold
              data-s226-primary-cta
            >
              답안 1개 올리기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-medium text-[color:var(--muted)] underline-offset-4 hover:text-[color:var(--foreground-strong)] hover:underline sm:w-auto"
            >
              검토 예시 보기
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
          답안길 미리보기
        </summary>
        <div className="border-t border-[color:var(--border-subtle)] px-4 py-5 sm:px-6">
          <FrontPageHeroAnimation />
        </div>
      </details>
    </RefinedShell>
  );
}
