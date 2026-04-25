import type { ReactNode } from "react";

import type { RiskLevel } from "@/lib/inverge/types";
import { getRiskLabel, riskTone } from "@/lib/inverge/utils";
import { cn } from "@/lib/utils";

export function RefinedShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10", className)}>
      {children}
    </div>
  );
}

export function FocusSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] shadow-[var(--shadow-focus)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function QuietSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)]", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-caption font-medium text-[color:var(--muted)]">{eyebrow}</p> : null}
        <h2 className="mt-2 text-h2 font-medium text-[color:var(--foreground-strong)]">{title}</h2>
        {description ? <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function RefinedBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "border-[color:rgba(79,125,112,0.24)] bg-[color:var(--status-green-soft)] text-[color:var(--foreground-strong)]"
      : tone === "amber"
        ? "border-[color:rgba(168,121,42,0.24)] bg-[color:var(--status-amber-soft)] text-[color:var(--foreground-strong)]"
        : tone === "red"
          ? "border-[color:rgba(166,87,78,0.24)] bg-[color:var(--status-red-soft)] text-[color:var(--foreground-strong)]"
          : "border-[var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--muted-strong)]";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-caption font-medium", toneClass)}>
      {children}
    </span>
  );
}

export function RiskPill({ level }: { level: RiskLevel }) {
  const tone = riskTone(level);

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-caption font-medium", tone.shell)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {getRiskLabel(level)}
    </span>
  );
}

export function SnapshotItem({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
}) {
  return (
    <div>
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <div className="mt-1 text-h3 font-medium text-[color:var(--foreground-strong)]">{value}</div>
      {helper ? <p className="mt-1 text-caption text-[color:var(--muted)]">{helper}</p> : null}
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-[color:var(--border)]" />;
}
