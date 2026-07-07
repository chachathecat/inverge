export function ClosedBetaBanner() {
  return (
    <section className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] bg-[color:var(--surface-soft)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">closed beta</p>
      <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">답안길은 감정평가사 2차 답안 운영 흐름을 검증 중입니다.</p>
      <p className="text-xs leading-5 text-[color:var(--muted)]">결과는 학습 보조 초안이며 저장 전 직접 확인해 주세요.</p>
    </section>
  );
}
