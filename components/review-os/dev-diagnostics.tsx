import type { ReactNode } from "react";

type ReviewOsDevDiagnosticsProps = {
  route: string;
  userId: string | null;
  examName?: string | null;
  itemCount?: number;
  queueCount?: number;
  hasWeeklySummary?: boolean;
  firstUse?: boolean;
  extra?: ReactNode;
};

export function ReviewOsDevDiagnostics({
  route,
  userId,
  examName,
  itemCount,
  queueCount,
  hasWeeklySummary,
  firstUse,
  extra,
}: ReviewOsDevDiagnosticsProps) {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <section className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[color:var(--surface-soft)] p-4 text-xs text-[color:var(--muted)]">
      <p className="font-medium text-[color:var(--foreground-strong)]">개발 진단</p>
      <div className="mt-2 space-y-1">
        <p>route: {route}</p>
        <p>userId: {userId ?? "none"}</p>
        {examName ? <p>exam: {examName}</p> : null}
        {typeof itemCount === "number" ? <p>items: {itemCount}</p> : null}
        {typeof queueCount === "number" ? <p>reviewQueue: {queueCount}</p> : null}
        {typeof hasWeeklySummary === "boolean" ? <p>weeklySummary: {String(hasWeeklySummary)}</p> : null}
        {typeof firstUse === "boolean" ? <p>firstUse: {String(firstUse)}</p> : null}
      </div>
      {extra ? <div className="mt-3">{extra}</div> : null}
    </section>
  );
}
