import Link from "next/link";
import type { ReactNode } from "react";

type LearningState = "recovery" | "attention" | "ready";

type StudyLedgerDetailProps = {
  itemId: string;
  title: string;
  subject: string;
  createdAt: string;
  biggestGap: string;
  nextAction: string;
  coreLine: string;
  keyTerms: string[];
  learnerExcerpt?: string | null;
  referenceExcerpt?: string | null;
  nextReviewDate: string;
  recurrenceText: string;
  reviewQueueCount: number;
  learnerConfirmed: boolean;
};

const STATE_STYLES: Record<LearningState, string> = {
  recovery: "border-[var(--cue-review)] bg-[var(--cue-review-bg)] text-[var(--cue-review)]",
  attention: "border-[var(--cue-risk)] bg-[var(--cue-risk-bg)] text-[var(--cue-risk)]",
  ready: "border-[var(--cue-stable)] bg-[var(--cue-stable-bg)] text-[var(--cue-stable)]",
};

function formatRecordDate(value: string) {
  const date = value.slice(0, 10);
  return date ? date.replaceAll("-", ".") : "기록일 확인 필요";
}

function normalizedExcerpt(value?: string | null) {
  const excerpt = value?.trim();
  return excerpt || null;
}

export function StateChip({
  state,
  children,
}: {
  state: LearningState;
  children: ReactNode;
}) {
  return (
    <span
      data-s228-state-chip={state}
      className={
        "inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-semibold leading-none " +
        STATE_STYLES[state]
      }
    >
      {children}
    </span>
  );
}

export function StudyLedgerTrustBar({
  learnerConfirmed,
  referenceAvailable,
}: {
  learnerConfirmed: boolean;
  referenceAvailable: boolean;
}) {
  return (
    <section
      data-s228-trust-evidence
      aria-label="근거 신뢰 상태"
      className="rounded-[var(--ledger-radius-card)] border border-[var(--trust-layer-border)] bg-[var(--trust-layer-bg)] p-4"
    >
      <p className="text-xs font-semibold tracking-[0.08em] text-[var(--brand-700)]">TRUST &amp; EVIDENCE</p>
      <dl className="mt-3 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-[var(--text-primary)]">학습자 입력</dt>
          <dd className="text-right text-xs font-semibold text-[var(--text-secondary)]">
            {learnerConfirmed ? "확인됨" : "확인 필요"}
          </dd>
        </div>
        <div className="h-px bg-[var(--trust-layer-border)]" />
        <div className="flex items-center justify-between gap-3">
          <dt className="font-medium text-[var(--text-primary)]">참고용 근거</dt>
          <dd className="max-w-36 text-right text-xs font-semibold text-[var(--text-secondary)]">
            {referenceAvailable ? "원 출처 확인 필요" : "추가되지 않음"}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
        학습 보조 기록입니다. 채점 결과로 확정하지 않습니다.
      </p>
    </section>
  );
}

export function BiggestGap({
  gap,
  nextAction,
}: {
  gap: string;
  nextAction: string;
}) {
  return (
    <section
      data-s228-biggest-gap
      className="rounded-[var(--ledger-radius-panel)] border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7"
      aria-labelledby="study-ledger-biggest-gap"
    >
      <p className="text-xs font-semibold tracking-[0.12em] text-[var(--cue-review)]">FOCUS</p>
      <h2 id="study-ledger-biggest-gap" className="mt-2 text-lg font-bold text-[var(--text-primary)]">
        가장 큰 간극
      </h2>
      <p className="ko-keep mt-4 text-xl font-semibold leading-8 text-[var(--text-primary)] sm:text-2xl sm:leading-9">
        {gap}
      </p>
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">다음 행동</p>
        <p className="ko-keep mt-2 text-base leading-7 text-[var(--text-primary)]">{nextAction}</p>
      </div>
    </section>
  );
}

export function EvidenceExcerpt({
  title,
  sourceLabel,
  excerpt,
}: {
  title: string;
  sourceLabel: string;
  excerpt?: string | null;
}) {
  const body = normalizedExcerpt(excerpt);

  return (
    <details
      data-s228-evidence-excerpt
      className="group rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      open
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
        <span className="text-right text-xs font-medium text-[var(--text-tertiary)]">{sourceLabel}</span>
      </summary>
      <div className="border-t border-[var(--border-subtle)] px-4 py-4">
        <p className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">
          {body ?? "기록된 내용이 없습니다."}
        </p>
      </div>
    </details>
  );
}

export function StickyAction({
  href,
  label,
  helper,
}: {
  href: string;
  label: string;
  helper: string;
}) {
  return (
    <aside
      data-s228-sticky-action
      className="fixed inset-x-4 bottom-4 z-30 rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[0_16px_40px_rgba(16,35,63,0.16)] lg:sticky lg:inset-auto lg:top-24 lg:shadow-[var(--shadow-soft)]"
    >
      <Link
        href={href}
        data-s228-primary-action
        aria-label={label + ": " + helper}
        className="flex min-h-11 w-full items-center justify-center rounded-[var(--ledger-radius-control)] bg-[var(--cta-primary-bg)] px-4 py-3 text-center text-sm font-bold text-[var(--cta-primary-fg)] transition-colors hover:bg-[var(--cta-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
      >
        {label}
      </Link>
      <p className="mt-2 text-center text-xs leading-5 text-[var(--text-secondary)]">{helper}</p>
    </aside>
  );
}

export function StudyLedgerDetail({
  itemId,
  title,
  subject,
  createdAt,
  biggestGap,
  nextAction,
  coreLine,
  keyTerms,
  learnerExcerpt,
  referenceExcerpt,
  nextReviewDate,
  recurrenceText,
  reviewQueueCount,
  learnerConfirmed,
}: StudyLedgerDetailProps) {
  const state: LearningState = reviewQueueCount > 0 ? "recovery" : learnerConfirmed ? "ready" : "attention";
  const stateLabel = state === "recovery" ? "회복 중" : state === "ready" ? "다시 쓰기 준비" : "확인 필요";
  const actionHref = "/app/capture?mode=second&rewriteFrom=" + encodeURIComponent(itemId);
  const visibleTerms = keyTerms.filter(Boolean).slice(0, 5);

  return (
    <main
      data-s228-study-ledger-detail
      className="mx-auto w-full max-w-[1048px] pb-28 lg:pb-10"
      aria-labelledby="study-ledger-title"
    >
      <header className="max-w-[var(--ledger-reading-column)] border-b border-[var(--border-subtle)] pb-7">
        <Link
          href="/app/items?mode=second"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          학습 원장으로 돌아가기
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StateChip state={state}>{stateLabel}</StateChip>
          <p className="text-xs font-medium text-[var(--text-tertiary)]">
            {subject} · {formatRecordDate(createdAt)}
          </p>
        </div>
        <h1
          id="study-ledger-title"
          className="ko-keep mt-5 break-words text-[clamp(1.8rem,4vw,2.75rem)] font-bold leading-[1.16] tracking-[-0.025em] text-[var(--text-primary)]"
        >
          {title}
        </h1>
        <p className="ko-keep mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{recurrenceText}</p>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,var(--ledger-reading-column))_var(--ledger-evidence-rail)] lg:items-start">
        <div className="min-w-0 space-y-8">
          <BiggestGap gap={biggestGap} nextAction={nextAction} />

          <section className="border-y border-[var(--border-subtle)] py-6" aria-labelledby="study-ledger-application">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text-secondary)]">APPLICATION</p>
            <h2 id="study-ledger-application" className="mt-2 text-lg font-bold text-[var(--text-primary)]">
              적용 문장 초점
            </h2>
            <p className="ko-keep mt-3 text-base leading-7 text-[var(--text-primary)]">{coreLine}</p>
            {visibleTerms.length > 0 ? (
              <ul className="mt-5 flex flex-wrap gap-2" aria-label="핵심 키워드">
                {visibleTerms.map((term) => (
                  <li
                    key={term}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    {term}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section
            data-s228-review-timing
            className="grid gap-5 rounded-[var(--ledger-radius-card)] bg-[var(--bg-subtle)] p-5 sm:grid-cols-2"
            aria-label="복습 일정"
          >
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">다음 복습</p>
              <p className="mt-2 text-base font-bold text-[var(--text-primary)]">{nextReviewDate}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">복습 큐</p>
              <p className="mt-2 text-base font-bold text-[var(--text-primary)]">
                {reviewQueueCount > 0 ? reviewQueueCount + "개 대기" : "예약 확인 필요"}
              </p>
            </div>
          </section>
        </div>

        <aside data-s228-evidence-rail className="min-w-0 space-y-4">
          <StudyLedgerTrustBar
            learnerConfirmed={learnerConfirmed}
            referenceAvailable={Boolean(normalizedExcerpt(referenceExcerpt))}
          />
          <EvidenceExcerpt title="내가 남긴 답안" sourceLabel="학습자 입력" excerpt={learnerExcerpt} />
          <EvidenceExcerpt title="비교 근거" sourceLabel="참고용 · 원 출처 확인" excerpt={referenceExcerpt} />
          <StickyAction href={actionHref} label="10분 문단 다시쓰기" helper="가장 큰 간극 1개만 보강합니다." />
        </aside>
      </div>
    </main>
  );
}
