import Link from "next/link";
import type { ReactNode } from "react";

import { TrustProvenanceLayer } from "@/components/review-os/trust-provenance-layer";
import { adaptLegacyTrustSignals } from "@/lib/review-os/trust-provenance";

export type LearningState = "scheduled" | "attention" | "ready" | "completed";

export type StudyLedgerComparison = {
  sourceGap: string;
  previousParagraph: string;
  sourceAnswerSummary: string;
  rewrittenParagraph: string;
  improvement: string;
  remainingNextGap: string;
};

export type StudyLedgerSupportingEvidence = {
  id: string;
  title: string;
  description: string;
  meta?: string | null;
};

type StudyLedgerDetailProps = {
  itemId: string;
  rewriteFromItemId?: string | null;
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
  completed?: boolean;
  evidenceConflict?: boolean;
  comparison?: StudyLedgerComparison | null;
  calculatorHref?: string | null;
  reviewHref?: string | null;
  writeHref?: string | null;
  topicCandidate?: string | null;
  supportingEvidence?: StudyLedgerSupportingEvidence[];
};

const STATE_STYLES: Record<LearningState, string> = {
  scheduled: "border-[var(--cue-review)] bg-[var(--cue-review-bg)] text-[var(--cue-review-text)]",
  attention: "border-[var(--cue-risk)] bg-[var(--cue-risk-bg)] text-[var(--cue-risk)]",
  ready: "border-[var(--cue-stable)] bg-[var(--cue-stable-bg)] text-[var(--cue-stable)]",
  completed: "border-[var(--cue-stable)] bg-[var(--cue-stable-bg)] text-[var(--cue-stable)]",
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
        "v3-type-caption inline-flex min-h-7 items-center rounded-full border px-3 font-semibold leading-none " +
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
  evidenceConflict = false,
  reviewRequired = false,
}: {
  learnerConfirmed: boolean;
  referenceAvailable: boolean;
  evidenceConflict?: boolean;
  reviewRequired?: boolean;
}) {
  const evidence = adaptLegacyTrustSignals({
    conflictRecorded: evidenceConflict,
    learnerConfirmed,
    reviewRequired,
  });

  return (
    <TrustProvenanceLayer
      evidence={evidence}
      sources={referenceAvailable ? ["persisted_record", "reference"] : ["persisted_record"]}
      title="근거 신뢰 상태"
      details={[
        {
          label: "학습자 입력",
          value: evidenceConflict ? "근거 차이 확인" : learnerConfirmed ? "확인 기록 있음" : reviewRequired ? "확인 필요" : "확인 기록 없음",
        },
        {
          label: "참고용 근거",
          value: referenceAvailable ? "원 출처 확인 필요" : "추가되지 않음",
        },
      ]}
      summary={
        evidenceConflict
          ? "학습자 입력과 참고 근거의 차이를 먼저 확인하세요."
          : "학습 보조 기록입니다. 채점 결과로 확정하지 않습니다."
      }
      layout="rail"
      stage="study-ledger-detail"
      trustLayerMarker="study-ledger-detail"
      ariaLabel="근거 신뢰 상태"
      className="rounded-[var(--ledger-radius-card)]"
      testId="study-ledger-trust-bar"
      legacyMarker="s228"
      announceChange={evidenceConflict}
    />
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
      <p className="v3-type-caption font-semibold text-[var(--cue-review-text)]">이번 복습의 초점</p>
      <h2 id="study-ledger-biggest-gap" className="v3-type-section mt-2 text-[var(--text-primary)]">
        가장 큰 간극
      </h2>
      <p className="v3-type-item ko-keep mt-4 text-[var(--text-primary)]">
        {gap}
      </p>
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
        <p className="v3-type-caption font-semibold text-[var(--text-secondary)]">다음 행동</p>
        <p className="v3-type-body ko-keep mt-2 text-[var(--text-primary)]">{nextAction}</p>
      </div>
    </section>
  );
}

export function EvidenceExcerpt({
  title,
  sourceLabel,
  excerpt,
  openByDefault = false,
}: {
  title: string;
  sourceLabel: string;
  excerpt?: string | null;
  openByDefault?: boolean;
}) {
  const body = normalizedExcerpt(excerpt);

  return (
    <details
      data-s228-evidence-excerpt
      className="group rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      open={openByDefault}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
        <span className="v3-type-compact font-semibold text-[var(--text-primary)]">{title}</span>
        <span className="v3-type-caption flex items-center gap-2 text-right text-[var(--text-tertiary)]">
          {sourceLabel}
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
        </span>
      </summary>
      <div className="border-t border-[var(--border-subtle)] px-4 py-4">
        <p
          className="v3-prose max-h-56 overflow-auto whitespace-pre-wrap break-words text-[var(--text-secondary)]"
          data-v3-typography-role="prose"
        >
          {body ?? "기록된 내용이 없습니다."}
        </p>
      </div>
    </details>
  );
}

export function StudyLedgerEvidenceEmpty() {
  return (
    <section
      data-s228-state="empty"
      role="status"
      className="rounded-[var(--ledger-radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
    >
      <h2 className="text-base font-bold text-[var(--text-primary)]">비교할 근거가 아직 없습니다.</h2>
      <p className="ko-keep mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        답안을 남기면 학습자 입력과 참고용 근거를 이 자리에서 나란히 확인할 수 있습니다.
      </p>
    </section>
  );
}

export function RewriteComparisonPanel({
  comparison,
}: {
  comparison: StudyLedgerComparison;
}) {
  return (
    <section
      data-s228-state="completed"
      role="status"
      className="rounded-[var(--ledger-radius-panel)] border border-[var(--cue-stable)] bg-[var(--cue-stable-bg)] p-5 sm:p-6"
      aria-labelledby="study-ledger-comparison-title"
    >
      <p className="text-xs font-semibold tracking-[0.1em] text-[var(--cue-stable)]">다시쓰기 저장됨</p>
      <h2 id="study-ledger-comparison-title" className="mt-2 text-lg font-bold text-[var(--text-primary)]">
        전·후 비교가 준비되었습니다.
      </h2>
      <p className="ko-keep mt-3 text-sm leading-6 text-[var(--text-primary)]">{comparison.improvement}</p>
      <dl className="mt-5 grid gap-4 border-t border-[color:rgba(46,110,88,0.22)] pt-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold text-[var(--text-secondary)]">이전 간극</dt>
          <dd className="ko-keep mt-2 text-sm leading-6 text-[var(--text-primary)]">{comparison.sourceGap}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-[var(--text-secondary)]">아직 남은 간극</dt>
          <dd className="ko-keep mt-2 text-sm leading-6 text-[var(--text-primary)]">{comparison.remainingNextGap}</dd>
        </div>
      </dl>
      <details className="mt-5 rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 py-3 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          이전 문단과 다시 쓴 문단 비교
        </summary>
        <div className="grid gap-5 border-t border-[var(--border-subtle)] p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">이전 문단</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">
              {comparison.previousParagraph}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">다시 쓴 문단</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)]">
              {comparison.rewrittenParagraph}
            </p>
          </div>
          <p className="sm:col-span-2 text-xs leading-5 text-[var(--text-secondary)]">
            참고용 근거 요약 · 원 출처 확인 필요: {comparison.sourceAnswerSummary}
          </p>
        </div>
      </details>
    </section>
  );
}

export function StudyLedgerSupportingEvidencePanel({
  topicCandidate,
  items,
}: {
  topicCandidate?: string | null;
  items: StudyLedgerSupportingEvidence[];
}) {
  if (!topicCandidate && items.length === 0) return null;

  return (
    <details
      data-s228-supporting-evidence
      className="group rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
        추가 학습 근거
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-4 border-t border-[var(--border-subtle)] p-4">
        {topicCandidate ? (
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">논점 후보</p>
            <p className="ko-keep mt-1 text-sm leading-6 text-[var(--text-primary)]">{topicCandidate}</p>
          </div>
        ) : null}
        {items.map((item) => (
          <article key={item.id} className="border-t border-[var(--border-subtle)] pt-4 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h3>
            <p className="ko-keep mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
            {item.meta ? <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{item.meta}</p> : null}
          </article>
        ))}
        <p className="text-xs leading-5 text-[var(--text-secondary)]">
          학습 구조 참고이며 확정 분류나 채점 결과가 아닙니다.
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
    <section
      data-s228-sticky-action
      aria-label="다음 학습 행동"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-30 rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[0_16px_40px_rgba(16,35,63,0.16)] lg:sticky lg:inset-auto lg:top-24 lg:shadow-[var(--shadow-soft)]"
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
    </section>
  );
}

export function StudyLedgerDetail({
  itemId,
  rewriteFromItemId,
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
  completed = false,
  evidenceConflict = false,
  comparison,
  calculatorHref,
  reviewHref,
  writeHref,
  topicCandidate,
  supportingEvidence = [],
}: StudyLedgerDetailProps) {
  const state: LearningState = completed
    ? "completed"
    : reviewQueueCount > 0
      ? "scheduled"
      : learnerConfirmed
        ? "ready"
        : "attention";
  const stateLabel =
    state === "completed"
      ? "복습 완료"
      : state === "scheduled"
        ? "복습 예정"
        : state === "ready"
          ? "다시 쓰기 준비"
          : "확인 필요";
  const actionHref =
    "/app/capture?mode=second&rewriteFrom=" + encodeURIComponent(rewriteFromItemId ?? itemId);
  const visibleTerms = keyTerms.filter(Boolean).slice(0, 5);
  const learnerEvidence = normalizedExcerpt(learnerExcerpt);
  const referenceEvidence = normalizedExcerpt(referenceExcerpt);
  const evidenceEmpty = !learnerEvidence && !referenceEvidence;

  return (
    <article
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
          className="v3-type-screen ko-keep mt-5 break-words text-[var(--text-primary)]"
          data-v3-typography-role="heading-screen"
        >
          {title}
        </h1>
        <p className="ko-keep mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{recurrenceText}</p>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,var(--ledger-reading-column))_var(--ledger-evidence-rail)] lg:items-start">
        <div className="min-w-0 space-y-8">
          {completed ? (
            comparison ? (
              <RewriteComparisonPanel comparison={comparison} />
            ) : (
              <section
                data-s228-state="completed"
                role="status"
                className="rounded-[var(--ledger-radius-card)] border border-[var(--cue-stable)] bg-[var(--cue-stable-bg)] p-5"
              >
                <h2 className="text-base font-bold text-[var(--text-primary)]">다시쓰기 기록이 저장되었습니다.</h2>
                <p className="ko-keep mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  다음 복습에서 남은 간극을 다시 확인합니다.
                </p>
              </section>
            )
          ) : null}

          <BiggestGap gap={biggestGap} nextAction={nextAction} />

          <section className="border-y border-[var(--border-subtle)] py-6" aria-labelledby="study-ledger-application">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--text-secondary)]">APPLICATION</p>
            <h2 id="study-ledger-application" className="v3-type-item mt-2 text-[var(--text-primary)]">
              적용 문장 초점
            </h2>
            <p
              className="v3-prose ko-keep mt-3 text-[var(--text-primary)]"
              data-v3-typography-role="prose"
            >
              {coreLine}
            </p>
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

          <StudyLedgerSupportingEvidencePanel
            topicCandidate={topicCandidate}
            items={supportingEvidence}
          />

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
            referenceAvailable={Boolean(referenceEvidence)}
            evidenceConflict={evidenceConflict}
          />
          <StickyAction
            href={actionHref}
            label={completed ? "문단 한 번 더 다듬기" : "10분 문단 다시쓰기"}
            helper={completed ? "남은 간극 1개만 다시 확인합니다." : "가장 큰 간극 1개만 보강합니다."}
          />
          {evidenceEmpty ? (
            <StudyLedgerEvidenceEmpty />
          ) : (
            <>
              <EvidenceExcerpt
                title="내가 남긴 답안"
                sourceLabel="학습자 입력"
                excerpt={learnerEvidence}
                openByDefault
              />
              <EvidenceExcerpt
                title="비교 근거"
                sourceLabel="참고용 · 원 출처 확인"
                excerpt={referenceEvidence}
              />
            </>
          )}
          {reviewHref || calculatorHref || writeHref ? (
            <nav
              aria-label="연결된 학습 화면"
              className="rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
            >
              {reviewHref ? (
                <Link
                  href={reviewHref}
                  className="flex min-h-11 items-center text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  다시 볼 항목 확인
                </Link>
              ) : null}
              {writeHref ? (
                <Link
                  href={writeHref}
                  className="flex min-h-11 items-center border-t border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  다른 답안 작업 보기
                </Link>
              ) : null}
              {calculatorHref ? (
                <Link
                  href={calculatorHref}
                  className="flex min-h-11 items-center border-t border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                >
                  관련 계산 검산 순서 보기
                </Link>
              ) : null}
            </nav>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
