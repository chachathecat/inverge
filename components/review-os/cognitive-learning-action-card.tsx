import type { CognitiveLearningActionUnit } from "@/lib/review-os/cognitive-learning-actions";

type CognitiveLearningActionCardProps = {
  unit: CognitiveLearningActionUnit;
  compact?: boolean;
};

export function CognitiveLearningActionCard({ unit, compact = false }: CognitiveLearningActionCardProps) {
  return (
    <section
      className={`rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] ${
        compact ? "p-3" : "p-4"
      }`}
      data-testid="s220e-cognitive-learning-actions"
      data-s220e-learning-action={unit.unitLabel}
    >
      <p className="text-caption font-medium text-[color:var(--muted)]">결과를 학습 행동으로 전환</p>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        <ActionLine label="가장 큰 간극 1개" value={unit.oneBiggestGap} />
        <ActionLine label="오늘 다시 쓸 문단 1개" value={unit.nextRewriteAction} />
        <ActionLine label={unit.retrievalCheck.label} value={unit.retrievalCheck.prompt} />
        <ActionLine
          label={unit.continuation.label || "내일 복습에 남길 내용"}
          value={`${unit.continuation.reviewQueueCandidate} / 오늘 할 일 최대 ${unit.continuation.todayPlanMaxPrimaryTasks}개 / 학습 노트`}
        />
      </div>
    </section>
  );
}

function ActionLine({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] p-3">
      <p className="text-caption font-medium text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{value}</p>
    </article>
  );
}
