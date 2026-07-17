import type { ReactNode } from "react";

import { V3Surface } from "@/components/learner";

type DailyCommandCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  headingLevel?: "h1" | "h2";
};

export function DailyCommandCard({
  title,
  description,
  children,
  headingLevel = "h1",
}: DailyCommandCardProps) {
  const Heading = headingLevel;

  return (
    <V3Surface>
      <p className="v3-type-caption text-[var(--color-text-secondary)]">오늘의 1개</p>
      <Heading className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">{title}</Heading>
      <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-secondary)]">{description}</p>
      <div className="mt-6">{children}</div>
    </V3Surface>
  );
}

export function MinimalStepPanel({ title, children }: { title: string; children: ReactNode }) {
  return <V3Surface density="compact" className="space-y-4"><p className="v3-type-label-strong text-[var(--color-text-primary)]">{title}</p>{children}</V3Surface>;
}

export function QuietDetails({ children }: { children: ReactNode }) {
  return <div className="v3-type-compact space-y-2 text-[var(--color-text-secondary)]">{children}</div>;
}

export function OneActionFooter({ children }: { children: ReactNode }) {
  return <div className="pt-4 sm:pt-6">{children}</div>;
}

export function EvidenceLine({ children }: { children: ReactNode }) {
  return <p className="v3-type-body text-[var(--color-text-primary)]">{children}</p>;
}

export function MicroPracticeCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] px-4 py-3"><p className="v3-type-label-strong text-[var(--color-text-primary)]">{title}</p><div className="v3-type-compact mt-2 text-[var(--color-text-secondary)]">{children}</div></div>;
}
