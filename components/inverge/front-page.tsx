import { ArrowRight } from "lucide-react";

import {
  V3ActionLink,
  V3QuietDisclosure,
  V3RouteFrame,
  V3SectionHeader,
  V3Surface,
} from "@/components/learner";
import { getServerSessionUser } from "@/lib/auth/session";

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

function ResultPreview() {
  return (
    <section id="demo" className="scroll-mt-24 self-stretch" aria-label="답안길 전환 흐름">
      <V3Surface tone="focus" className="h-full">
        <div className="flex items-center justify-between gap-3">
          <p className="v3-type-caption text-[var(--color-text-link)]">
            전환 흐름
          </p>
          <p className="v3-type-caption text-right text-[var(--color-text-secondary)]">학습 보조 초안 · 공식 채점 아님</p>
        </div>
        <ol className="mt-5 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
          {TRANSFORMATION_STEPS.map((step, index) => (
            <li key={step} className="flex min-h-11 items-center gap-4 py-2.5">
              <span className="v3-type-caption w-5 shrink-0 tabular-nums text-[var(--color-text-link)]">{String(index + 1).padStart(2, "0")}</span>
              <p className="v3-type-compact font-medium text-[var(--color-text-primary)]">{step}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 border-l-2 border-[var(--color-border-focus)] pl-4">
          <p className="v3-type-caption text-[var(--color-text-secondary)]">오늘 남길 결과</p>
          <p className="v3-type-body-strong ko-keep mt-1 text-[var(--color-text-primary)]">
            가장 큰 간극 1개와 다음 재작성 행동 1개
          </p>
        </div>
      </V3Surface>
    </section>
  );
}

export async function FrontPage() {
  const session = await getServerSessionUser();
  const primaryCaptureHref = session.authEnabled ? AUTH_CAPTURE_HREF : DEMO_CAPTURE_HREF;

  return (
    <V3RouteFrame
      width="content"
      className="mx-auto space-y-14 px-[var(--layout-page-edge)] py-10 sm:py-12 lg:space-y-20 lg:py-16"
    >
      <section className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(288px,400px)] lg:gap-12">
        <div className="space-y-7 lg:pt-4">
          <p className="v3-type-caption text-[var(--color-text-secondary)]">학습 보조 초안 · 공식 채점 아님</p>
          <div className="space-y-4">
            <h1 className="v3-type-display hero-balance ko-keep max-w-3xl text-[var(--color-text-primary)]">
              답안 1개에서
              <br />
              오늘 다시 쓸 문단을 정합니다.
            </h1>
            <p className="v3-type-body ko-keep max-w-[44rem] text-[var(--color-text-secondary)]">
              사진이나 텍스트를 올리면
              <br className="hidden sm:block" />
              답안 검토가 가장 큰 간극 1개와
              <br className="hidden sm:block" />
              다음 재작성 행동 1개로 정리합니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <V3ActionLink
              href={primaryCaptureHref}
              data-s225x-dominant-primary-above-fold
              data-s226-primary-cta
            >
              답안 1개 올리기
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </V3ActionLink>
            <V3ActionLink
              href="#demo"
              tone="quiet"
            >
              검토 예시 보기
            </V3ActionLink>
          </div>
        </div>
        <ResultPreview />
      </section>

      <section className="space-y-6">
        <V3SectionHeader
          eyebrow="답안 훈련 루프"
          title="오늘 한 것을 다음 행동으로 바꿉니다"
          description="전체 답안을 한 번에 고치려 하지 않고, 가장 큰 간극 1개와 다음 행동 1개로 줄입니다."
        />
        <V3Surface density="compact" className="divide-y divide-[var(--color-border-default)] py-0">
          {LOOP_SUMMARY.map((step) => (
            <article key={step.title} className="grid gap-2 py-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
              <h3 className="v3-type-item ko-keep text-[var(--color-text-primary)]">{step.title}</h3>
              <div>
                <p className="v3-type-body ko-keep text-[var(--color-text-primary)]">{step.description}</p>
                <p className="v3-type-compact ko-keep mt-1 text-[var(--color-text-secondary)]">{step.detail}</p>
              </div>
            </article>
          ))}
        </V3Surface>
      </section>

      <V3QuietDisclosure
        summary="답안길 미리보기"
        helper="합성 예시로 답안 검토 흐름을 확인합니다."
      >
        <FrontPageHeroAnimation />
      </V3QuietDisclosure>
    </V3RouteFrame>
  );
}
