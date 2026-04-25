import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";

import { RefinedBadge } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import type { UnifiedExamHomeState, UnifiedStageSummary } from "@/lib/inverge/unified-exam-home";
import { cn } from "@/lib/utils";

type UnifiedExamHomeProps = {
  state: UnifiedExamHomeState;
};

export function UnifiedExamHome({ state }: UnifiedExamHomeProps) {
  const activeSummary = state.activeStage === "first" ? state.firstStage : state.secondStage;
  const otherSummary = state.activeStage === "first" ? state.secondStage : state.firstStage;

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto w-full max-w-[1080px] px-5 py-8 sm:px-8 lg:py-10">
        <header className="border-b border-[var(--border)] pb-6">
          <p className="text-caption font-medium text-[color:var(--muted)]">{state.exam.currentSessionLabel}</p>
          <h1 className="mt-2 text-h1 font-medium text-[color:var(--foreground-strong)]">{state.exam.name}</h1>
          <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
            1차와 2차 흐름을 한 곳에서 정리하고, 다음 작업 하나로 들어갑니다.
          </p>
        </header>

        <nav className="mt-6 flex w-fit gap-1 rounded-full bg-[color:var(--surface-soft)] p-1">
          <StageSwitchItem label="1차" active={state.activeStage === "first"} href="?state=first-stage-only" />
          <StageSwitchItem label="2차" active={state.activeStage === "second"} href="?state=second-stage-in-progress" />
        </nav>

        <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-7 shadow-[var(--shadow-soft)] sm:px-8 lg:px-9">
          <RefinedBadge>{state.nextAction.stage === "first" ? "1차" : "2차"}</RefinedBadge>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-caption font-medium text-[color:var(--muted)]">다음 작업</p>
              <h2 className="mt-2 max-w-2xl text-[30px] font-medium leading-tight tracking-[-0.035em] text-[color:var(--foreground-strong)] sm:text-[36px]">
                {state.nextAction.label}
              </h2>
              <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">{state.nextAction.description}</p>
            </div>
            <Link href={state.nextAction.href} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              들어가기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.82fr]">
          <StageSummaryPanel summary={activeSummary} emphasized />
          <StageSummaryPanel summary={otherSummary} />
        </section>

        <section className="mt-7 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
          <div className="border-b border-[var(--border)] px-6 py-5">
            <p className="text-caption font-medium text-[color:var(--muted)]">최근 흐름</p>
            <h2 className="mt-1 text-h3 font-medium text-[color:var(--foreground-strong)]">최근 작업</h2>
          </div>
          {state.recentActivity.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {state.recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="grid gap-3 px-6 py-4 transition hover:bg-[color:var(--surface-soft)] sm:grid-cols-[80px_1fr_auto] sm:items-center"
                >
                  <RefinedBadge>{item.stage === "first" ? "1차" : "2차"}</RefinedBadge>
                  <span className="text-sm font-medium text-[color:var(--foreground-strong)]">{item.label}</span>
                  <span className="inline-flex items-center gap-1 text-caption text-[color:var(--muted)]">
                    <Clock3 className="h-3.5 w-3.5" />
                    {item.createdAtLabel}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-7">
              <p className="text-sm leading-7 text-[color:var(--muted)]">아직 기록이 없습니다. 첫 작업이 끝나면 이곳에 흐름이 쌓입니다.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StageSwitchItem({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition",
        active
          ? "bg-[color:var(--surface)] text-[color:var(--foreground-strong)] shadow-[0_4px_14px_rgba(19,34,56,0.08)]"
          : "text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
      )}
    >
      {label}
    </Link>
  );
}

function StageSummaryPanel({ summary, emphasized = false }: { summary: UnifiedStageSummary; emphasized?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-6",
        emphasized ? "shadow-[var(--shadow-soft)]" : "bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--background))]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <RefinedBadge>{summary.label}</RefinedBadge>
          <h2 className="mt-3 text-h2 font-medium text-[color:var(--foreground-strong)]">
            {summary.currentLoop}
          </h2>
        </div>
        <Link href={summary.primaryHref} className="text-sm font-medium text-[color:var(--foreground-strong)] hover:underline">
          {summary.primaryLabel}
        </Link>
      </div>
      <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{summary.quietSummary}</p>

      {summary.recentItems.length > 0 ? (
        <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
          {summary.recentItems.slice(0, 2).map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[color:var(--foreground-strong)]">{item.label}</span>
              {item.meta ? <span className="text-caption text-[color:var(--muted)]">{item.meta}</span> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 border-t border-[var(--border)] pt-4 text-caption text-[color:var(--muted)]">
          아직 쌓인 작업이 없습니다.
        </p>
      )}
    </section>
  );
}
