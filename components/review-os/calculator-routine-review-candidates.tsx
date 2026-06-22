import Link from "next/link";

import {
  buildCalculatorRoutineRecoveryHref,
  type CalculatorRoutineReviewCandidate,
} from "@/lib/review-os/calculator-routine-learning-signal";

export function CalculatorRoutineReviewCandidates({
  candidates,
}: {
  candidates: CalculatorRoutineReviewCandidate[];
}) {
  if (candidates.length === 0) return null;

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-[color:var(--border-hairline)] bg-[color:var(--surface)] p-4"
      data-calculator-routine-review-candidates
    >
      <h3 className="text-sm font-semibold text-[color:var(--foreground-strong)]">계산·검산 복습 후보</h3>
      <ul className="mt-3 divide-y divide-[color:var(--border-hairline)]">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-[color:var(--muted)]">{candidate.sourceLabel} · {candidate.subject}</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{candidate.title}</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">다음 행동: {candidate.nextAction}</p>
            </div>
            <Link
              href={buildCalculatorRoutineRecoveryHref(candidate.recoveryReference)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--border-subtle)] px-3 text-xs font-medium text-[color:var(--foreground-strong)]"
            >
              계산·검산 다시 하기
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
