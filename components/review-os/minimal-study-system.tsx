import type { ReactNode } from "react";

export function DailyCommandCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] bg-[color:var(--surface-elevated)] px-5 py-5 sm:px-7 sm:py-7">
      <p className="text-xs text-[color:var(--textMuted)]">오늘 명령</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[color:var(--textStrong)]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[color:var(--textBody)]">{description}</p>
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function MinimalStepPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-[var(--radius-md)] bg-[color:var(--surfaceBase)] p-4"><p className="text-sm font-medium text-[color:var(--textStrong)]">{title}</p>{children}</section>;
}

export function QuietDetails({ children }: { children: ReactNode }) {
  return <div className="space-y-2 text-xs leading-6 text-[color:var(--textMuted)]">{children}</div>;
}

export function OneActionFooter({ children }: { children: ReactNode }) {
  return <div className="pt-4 sm:pt-6">{children}</div>;
}

export function EvidenceLine({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-7 text-[color:var(--textBody)]">{children}</p>;
}

export function MicroPracticeCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-[var(--radius-md)] bg-[color:var(--surfaceQuiet)] px-4 py-3"><p className="text-sm font-medium text-[color:var(--textStrong)]">{title}</p><div className="mt-2">{children}</div></div>;
}
