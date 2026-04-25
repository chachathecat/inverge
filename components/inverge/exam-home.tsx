import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ExamHomeCard = {
  title: string;
  body: string;
  recentWork: string;
  nextAction: string;
  statusItems: string[];
  ctaLabel: string;
  ctaHref: string;
};

export type ExamHomeState = {
  title: string;
  subtitle: string;
  currentStatus: {
    recentTrack: string;
    recentWork: string;
    nextAction: string;
  };
  firstCard: ExamHomeCard;
  secondCard: ExamHomeCard;
  footer: string;
};

type ExamHomeProps = {
  state: ExamHomeState;
};

export function ExamHome({ state }: ExamHomeProps) {
  return (
    <RefinedShell className="space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>{state.title}</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          {state.title}
        </h1>
        <p className="mt-5 text-body text-[color:var(--muted)]">{state.subtitle}</p>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
        <div className="grid gap-5 sm:grid-cols-3">
          <StatusBlock label="최근 활성 트랙" value={state.currentStatus.recentTrack} />
          <StatusBlock label="최근 작업" value={state.currentStatus.recentWork} />
          <StatusBlock label="다음 행동" value={state.currentStatus.nextAction} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <StageCard card={state.firstCard} />
        <StageCard card={state.secondCard} />
      </div>

      <section className="max-w-3xl border-t border-[var(--border)] pt-8">
        <p className="text-body text-[color:var(--muted-strong)]">{state.footer}</p>
      </section>
    </RefinedShell>
  );
}

function StatusBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-caption font-medium text-[color:var(--muted)]">{label}</p>
      <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function StageCard({ card }: { card: ExamHomeCard }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{card.title}</h2>
      <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{card.body}</p>

      <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-4">
        <StatusBlock label="최근 작업" value={card.recentWork} />
        <StatusBlock label="다음 행동" value={card.nextAction} />
      </div>

      {card.statusItems.length > 0 ? (
        <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
          {card.statusItems.map((item) => (
            <p key={item} className="text-sm leading-6 text-[color:var(--muted-strong)]">
              {item}
            </p>
          ))}
        </div>
      ) : null}

      <Link href={card.ctaHref} className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
        {card.ctaLabel}
      </Link>
    </section>
  );
}
