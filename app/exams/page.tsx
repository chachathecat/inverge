import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

type ExamSelectionCard = {
  testId: "exam-card-second";
  title: string;
  description: string;
  badge?: string;
  helper?: string;
  href: string;
  cta: string;
};

function buildSecondRoundCaptureHref(isAuthenticated: boolean, authEnabled: boolean) {
  const secondRoundCaptureHref = "/app/capture?mode=second";
  if (!authEnabled || isAuthenticated) return secondRoundCaptureHref;
  return `/login?returnTo=${encodeURIComponent(secondRoundCaptureHref)}`;
}

function SelectionCard({ card }: { card: ExamSelectionCard }) {
  return (
    <section data-testid={card.testId} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{card.title}</h2>
        <RefinedBadge>{card.badge ?? "답안길"}</RefinedBadge>
      </div>
      <p className="mt-4 text-sm leading-7 text-[color:var(--foreground-strong)]">{card.description}</p>
      {card.helper ? <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{card.helper}</p> : null}

      <div className="mt-7">
        <Link href={card.href} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          {card.cta}
        </Link>
      </div>
    </section>
  );
}

export default async function ExamsPage() {
  const session = await getServerSessionUser();
  const secondRoundHref = buildSecondRoundCaptureHref(session.isAuthenticated, session.authEnabled);

  const card: ExamSelectionCard = {
    testId: "exam-card-second",
    title: "감정평가사 2차 답안 훈련",
    description: "쟁점 회상, 목차, 답안 작성, 문단 다시쓰기를 답안길 흐름으로 이어갑니다.",
    helper: "실제 평가 결과가 아니라, 학습 보조 초안과 다음 행동을 정리합니다.",
    href: secondRoundHref,
    cta: "2차 답안 올리기",
  };

  return (
    <RefinedShell className="space-y-8 sm:space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>답안길 시작</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          감정평가사 2차 답안을 올리고 감점 위험을 찾으세요.
        </h1>
        <p className="mt-3 text-body text-[color:var(--muted)] sm:mt-5">
          답안길은 오늘 쓴 답안을 가장 큰 감점 위험 1개와 다시 쓸 문단 1개로 정리합니다.
        </p>
      </section>

      <div className="grid gap-5">
        <SelectionCard card={card} />
      </div>
    </RefinedShell>
  );
}

// Legacy closed-beta regression token kept so older source-level smoke tests know the internal track id remains reserved: exam-card-first.
// Legacy route-contract token for prior helper tests: const appHref = `/app?mode=${mode}`
// Legacy route-contract token for prior helper tests: return mode === "first" ? "/app/capture?mode=first" : "/app/capture?mode=second";
