import type { CognitiveLearningActionUnit } from "@/lib/review-os/cognitive-learning-actions";

type CognitiveLearningActionCardProps = {
  unit: CognitiveLearningActionUnit;
  compact?: boolean;
  presentation?: "legacy" | "v3";
};

export function CognitiveLearningActionCard({
  unit,
  compact = false,
  presentation = "legacy",
}: CognitiveLearningActionCardProps) {
  if (presentation === "v3") {
    return (
      <section
        className={`rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] ${
          compact ? "p-4" : "p-5 sm:p-6"
        }`}
        data-testid="s220e-cognitive-learning-actions"
        data-s220e-learning-action={unit.unitLabel}
        data-v3-component="Surface"
        data-v3-tone="surface"
      >
        <p className="v3-type-caption text-[var(--color-text-secondary)]">결과를 학습 행동으로 전환</p>
        <dl className="mt-4 divide-y divide-[var(--color-border-default)] border-y border-[var(--color-border-default)]">
          <V3ActionLine label="가장 큰 간극 1개" value={unit.oneBiggestGap} />
          <V3ActionLine label="오늘 다시 쓸 문단 1개" value={unit.nextRewriteAction} />
          <V3ActionLine label={unit.retrievalCheck.label} value={unit.retrievalCheck.prompt} />
          <V3ActionLine
            label={unit.continuation.label || "내일 복습에 남길 내용"}
            value={`${unit.continuation.reviewQueueCandidate} / 오늘 할 일 최대 ${unit.continuation.todayPlanMaxPrimaryTasks}개 / 학습 노트`}
          />
        </dl>
      </section>
    );
  }

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

function V3ActionLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="v3-type-caption text-[var(--color-text-secondary)]">{label}</dt>
      <dd className="v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]">{value}</dd>
    </div>
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
