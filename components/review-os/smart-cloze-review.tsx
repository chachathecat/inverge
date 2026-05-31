import { buildSmartCloze } from "@/lib/review-os/smart-cloze";

export function SmartClozeReview({ statement, trapWords = [], conceptCandidate }: { statement: string; trapWords?: string[]; conceptCandidate?: string | null }) {
  const cloze = buildSmartCloze({ statement, trapWords, conceptCandidate });
  if (cloze.stage !== "빈칸") {
    return (
      <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-sm leading-7 text-[color:var(--foreground-strong)]">
        <p className="text-xs text-[color:var(--muted)]">O/X 회상</p>
        <p className="mt-1 break-keep">{cloze.prompt}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3 text-sm leading-7 text-[color:var(--foreground-strong)]">
      <p className="text-xs text-[color:var(--muted)]">빈칸 회상</p>
      <p className="mt-1 break-keep">{cloze.prompt}</p>
      <details className="mt-2 text-xs text-[color:var(--muted)]">
        <summary className="cursor-pointer">정답 확인</summary>
        <p className="mt-1">{cloze.answer}</p>
      </details>
    </div>
  );
}
