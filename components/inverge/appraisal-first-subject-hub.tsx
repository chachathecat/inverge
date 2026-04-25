import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import type { AppraisalFirstHubState } from "@/lib/inverge/appraisal-first-hub";
import { cn } from "@/lib/utils";

type AppraisalFirstSubjectHubProps = {
  state: AppraisalFirstHubState;
};

export function AppraisalFirstSubjectHub({ state }: AppraisalFirstSubjectHubProps) {
  return (
    <RefinedShell className="space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>감정평가사 1차</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          객관식 학습 운영
        </h1>
        <p className="mt-5 text-body text-[color:var(--muted)]">{state.subtitle}</p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {state.cards.map((card) => (
          <section key={card.subjectId} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{card.title}</h2>
              <span className="rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
                {card.statusLine}
              </span>
            </div>

            <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-4">
              <StatusLine label="최근 작업" value={card.recentWork} />
              <StatusLine label="다음 행동" value={card.nextAction} />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={card.primaryHref} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
                계속하기
              </Link>
              <Link
                href={card.secondaryHref}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
              >
                {card.secondaryLabel}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </RefinedShell>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-[color:var(--muted)]">{label}</p>
      <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}
