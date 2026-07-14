export function ClosedBetaBanner() {
  return (
    <section className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-3 py-1.5 text-xs leading-5 text-[color:var(--muted)]">
      <span className="font-semibold text-[color:var(--foreground-strong)]">초대 베타</span>
      <span>학습 보조 초안 · 공식 채점 아님</span>
    </section>
  );
}
