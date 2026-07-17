import { V3ActionLink, V3SectionHeader, V3Surface } from "@/components/learner";

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
    <div data-calculator-routine-review-candidates>
    <V3Surface as="section" className="space-y-4">
      <V3SectionHeader
        eyebrow="계산 루틴"
        title="계산·검산 복습"
        description="확인이 필요한 계산 루틴만 다시 실행합니다."
      />
      <ul className="divide-y divide-[var(--color-border-default)]">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="v3-type-caption text-[var(--color-text-secondary)]">{candidate.sourceLabel} · {candidate.subject}</p>
              <p className="v3-type-body-strong ko-keep mt-1 text-[var(--color-text-primary)]">{candidate.title}</p>
              <p className="v3-type-compact ko-keep mt-1 text-[var(--color-text-secondary)]">다음 행동: {candidate.nextAction}</p>
            </div>
            <V3ActionLink
              href={buildCalculatorRoutineRecoveryHref(candidate.recoveryReference)}
              tone="secondary"
            >
              계산·검산 다시 하기
            </V3ActionLink>
          </li>
        ))}
      </ul>
    </V3Surface>
    </div>
  );
}
