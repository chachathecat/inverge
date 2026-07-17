import Link from "next/link";

import { StudyLedgerFocusChrome } from "@/components/learner/study-ledger-focus-chrome";
import { TrustEvidenceBar } from "@/components/learner/trust-evidence-bar";
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
  savedAt: string;
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

export type StateChipState = "Unverified" | "Weak" | "Recovering" | "Stable";
export type StateChipEvidence =
  | { state: "Unverified"; basis: "missing-confirmation"; detail: string }
  | { state: "Weak"; basis: "confirmed-incorrect-retrieval"; detail: string }
  | { state: "Recovering"; basis: "recovery-observed"; detail: string }
  | {
      state: "Stable";
      basis: "distinct-day-successes";
      detail: string;
      distinctDaySuccessCount: number;
    };
export type BiggestGapType = "MissingLink" | "Incorrect" | "Unverified";
export type BiggestGapDensity = "Default" | "Compact";
export type EvidenceExcerptSource = "Learner" | "Official" | "AI";
export type EvidenceExcerptReview = "Default" | "Confirmed";
type EvidenceExcerptSourceEvidence =
  | { source: "Learner"; sourceBasis: "learner-authored" }
  | { source: "Official"; sourceBasis: "verified-official-source" }
  | { source: "AI"; sourceBasis: "ai-generated" };
type EvidenceExcerptReviewEvidence =
  | { review: "Default" }
  | { review: "Confirmed"; confirmationRecorded: true };
export type EvidenceExcerptEvidence = EvidenceExcerptSourceEvidence &
  EvidenceExcerptReviewEvidence & { provenance: string };

export type StickyActionMode = "Dock" | "Inline";
export type StickyActionState = "Ready" | "Saving" | "Offline" | "Disabled";
export type StickyActionControllerEvidence =
  | { kind: "save-in-progress"; saveInProgress: true }
  | { kind: "network-offline"; isOnline: false }
  | { kind: "action-disabled"; disabled: true; reason: string };

type StickyActionBaseProps = {
  label?: string;
  status?: string;
  showStatus?: boolean;
  mode?: StickyActionMode;
  responsive?: boolean;
  testId?: string;
};

export type StickyActionProps = StickyActionBaseProps &
  (
    | {
        state?: "Ready";
        href: string;
        onAction?: never;
        controllerEvidence?: never;
      }
    | {
        state?: "Ready";
        href?: never;
        onAction: () => void;
        controllerEvidence?: never;
      }
    | {
        state: "Saving";
        href?: never;
        controllerEvidence: Extract<StickyActionControllerEvidence, { kind: "save-in-progress" }>;
      }
    | {
        state: "Offline";
        href?: never;
        controllerEvidence: Extract<StickyActionControllerEvidence, { kind: "network-offline" }>;
      }
    | {
        state: "Disabled";
        href?: never;
        controllerEvidence: Extract<StickyActionControllerEvidence, { kind: "action-disabled" }>;
      }
  );

const STATE_CHIP_PRESENTATION: Record<
  StateChipState,
  { label: string; className: string; markClassName: string }
> = {
  Unverified: {
    label: "미확인",
    className: "border-[var(--color-border-default)] bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)]",
    markClassName: "bg-[var(--color-icon-secondary)]",
  },
  Weak: {
    label: "취약",
    className: "border-[var(--color-border-risk)] bg-[var(--color-background-risk)] text-[var(--color-text-risk)]",
    markClassName: "bg-[var(--color-icon-risk)]",
  },
  Recovering: {
    label: "회복 중",
    className: "border-[var(--color-border-attention)] bg-[var(--color-background-attention)] text-[var(--color-text-attention)]",
    markClassName: "bg-[var(--color-icon-attention)]",
  },
  Stable: {
    label: "안정",
    className: "border-[var(--color-border-stable)] bg-[var(--color-background-stable)] text-[var(--color-text-stable)]",
    markClassName: "bg-[var(--color-icon-stable)]",
  },
};

const BIGGEST_GAP_PRESENTATION: Record<
  BiggestGapType,
  { label: string; shellClassName: string; markClassName: string; labelClassName: string }
> = {
  MissingLink: {
    label: "가장 큰 간극 1개",
    shellClassName: "bg-[var(--color-background-attention)]",
    markClassName: "bg-[var(--color-icon-attention)]",
    labelClassName: "text-[var(--color-text-attention)]",
  },
  Incorrect: {
    label: "잘못된 연결 1개",
    shellClassName: "bg-[var(--color-background-risk)]",
    markClassName: "bg-[var(--color-icon-risk)]",
    labelClassName: "text-[var(--color-text-risk)]",
  },
  Unverified: {
    label: "확인할 근거 1개",
    shellClassName: "bg-[var(--color-background-focus)]",
    markClassName: "bg-[var(--color-icon-brand)]",
    labelClassName: "text-[var(--color-text-link)]",
  },
};

const EVIDENCE_SOURCE_PRESENTATION: Record<
  EvidenceExcerptSource,
  { label: string; shellClassName: string; markClassName: string; titleClassName: string }
> = {
  Learner: {
    label: "학습자 근거",
    shellClassName: "bg-[var(--color-background-surface)]",
    markClassName: "bg-[var(--color-icon-secondary)]",
    titleClassName: "text-[var(--color-text-primary)]",
  },
  Official: {
    label: "공식 근거",
    shellClassName: "bg-[var(--color-background-brand-soft)]",
    markClassName: "bg-[var(--color-icon-brand)]",
    titleClassName: "text-[var(--color-text-brand)]",
  },
  AI: {
    label: "AI 제안",
    shellClassName: "bg-[var(--color-background-compare)]",
    markClassName: "bg-[var(--color-icon-brand)]",
    titleClassName: "text-[var(--color-text-compare)]",
  },
};

const STICKY_ACTION_PRESENTATION: Record<
  StickyActionState,
  { accessibleLabel: string; controlClassName: string; statusClassName: string }
> = {
  Ready: {
    accessibleLabel: "준비됨",
    controlClassName:
      "bg-[var(--color-background-brand)] text-[var(--color-text-inverse)] hover:bg-[var(--color-background-brand-hover)]",
    statusClassName: "text-[var(--color-text-secondary)]",
  },
  Saving: {
    accessibleLabel: "저장 중",
    controlClassName:
      "bg-[var(--color-background-brand-soft)] text-[var(--color-text-brand)]",
    statusClassName: "text-[var(--color-text-secondary)]",
  },
  Offline: {
    accessibleLabel: "오프라인",
    controlClassName:
      "bg-[var(--color-background-attention)] text-[var(--color-text-attention)]",
    statusClassName: "text-[var(--color-text-attention)]",
  },
  Disabled: {
    accessibleLabel: "사용할 수 없음",
    controlClassName:
      "bg-[var(--color-background-subtle)] text-[var(--color-text-tertiary)]",
    statusClassName: "text-[var(--color-text-secondary)]",
  },
};

function formatRecordDate(value: string) {
  const date = value.slice(0, 10);
  return date ? date.replaceAll("-", ".") : "기록일 확인 필요";
}

function buildLedgerStateEvidence({
  state,
  reviewQueueCount,
  nextReviewDate,
}: {
  state: LearningState;
  reviewQueueCount: number;
  nextReviewDate: string;
}) {
  switch (state) {
    case "scheduled":
      return `복습 예정 · 큐 ${reviewQueueCount}개 · ${nextReviewDate}`;
    case "ready":
      return "학습자 확인 기록 · 다시쓰기 준비";
    case "completed":
      return `다시쓰기 기록 · ${nextReviewDate} 확인`;
    case "attention":
      return "학습자 확인 필요";
  }
}

function normalizedExcerpt(value?: string | null) {
  const excerpt = value?.trim();
  return excerpt || null;
}

export function StateChip({
  evidence,
  showEvidence = true,
  legacyState,
}: {
  evidence: StateChipEvidence;
  showEvidence?: boolean;
  legacyState?: LearningState;
}) {
  const state = evidence.state;
  const presentation = STATE_CHIP_PRESENTATION[state];
  const normalizedEvidence = evidence.detail.trim();
  if (!normalizedEvidence) throw new Error(`StateChip ${state} requires non-empty evidence.`);
  if (evidence.state === "Stable" && evidence.distinctDaySuccessCount < 2) {
    throw new Error("StateChip Stable requires successful retrieval evidence from at least two distinct days.");
  }

  return (
    <span
      data-v3-component="StateChip"
      data-v3-state={state}
      data-s228-state-chip={legacyState}
      aria-label={showEvidence ? `${presentation.label} · ${normalizedEvidence}` : presentation.label}
      className={
        "inline-flex min-h-[38px] max-w-full items-center gap-2 rounded-[var(--v3-radius-full)] border px-3 py-2 " +
        presentation.className
      }
    >
      <span className="v3-type-label-strong shrink-0 whitespace-nowrap">{presentation.label}</span>
      {showEvidence ? (
        <>
          <span
            aria-hidden="true"
            className={`size-1 shrink-0 rounded-full ${presentation.markClassName}`}
          />
          <span className="v3-type-label min-w-0 break-words text-[var(--color-text-secondary)]">
            {normalizedEvidence}
          </span>
        </>
      ) : null}
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
  evidence,
  type = "MissingLink",
  density = "Default",
  showEvidence = true,
  headingId = "study-ledger-biggest-gap",
}: {
  gap: string;
  evidence?: string;
  type?: BiggestGapType;
  density?: BiggestGapDensity;
  showEvidence?: boolean;
  headingId?: string;
}) {
  const presentation = BIGGEST_GAP_PRESENTATION[type];
  const compact = density === "Compact";
  const normalizedEvidence = evidence?.trim() || null;

  return (
    <section
      data-v3-component="BiggestGap"
      data-v3-biggest-gap
      data-v3-type={type}
      data-v3-density={density}
      data-s228-biggest-gap
      className={`flex w-full items-stretch gap-4 ${compact ? "p-3" : "p-4"} ${presentation.shellClassName}`}
      aria-labelledby={headingId}
    >
      <span
        aria-hidden="true"
        className={`w-1 shrink-0 self-stretch rounded-[var(--v3-radius-mark)] ${compact ? "min-h-16" : "min-h-[100px]"} ${presentation.markClassName}`}
      />
      <div className={`min-w-0 flex-1 ${compact ? "space-y-1" : "space-y-2"}`}>
        <h2 id={headingId} className={`v3-type-label-strong ${presentation.labelClassName}`}>
          {presentation.label}
        </h2>
        <p className={`${compact ? "v3-type-body-strong" : "v3-type-item"} ko-keep text-[var(--color-text-primary)]`}>
          {gap}
        </p>
        {showEvidence && normalizedEvidence ? (
          <p className="v3-type-label ko-keep text-[var(--color-text-secondary)]">
            {normalizedEvidence}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function EvidenceExcerpt({
  title,
  body,
  evidence,
}: {
  title: string;
  body?: string | null;
  evidence: EvidenceExcerptEvidence;
}) {
  const { source, review } = evidence;
  const presentation = EVIDENCE_SOURCE_PRESENTATION[source];
  const normalizedBody = normalizedExcerpt(body);
  const normalizedProvenance = evidence.provenance.trim();
  if (!normalizedProvenance) {
    throw new Error(`EvidenceExcerpt ${source}/${review} requires non-empty provenance.`);
  }
  const confirmed = review === "Confirmed";

  return (
    <figure
      data-v3-component="EvidenceExcerpt"
      data-v3-source={source}
      data-v3-review={review}
      data-s228-evidence-excerpt
      aria-label={`${title} · ${presentation.label}`}
      className={`flex w-full flex-col gap-3 rounded-[var(--v3-radius-card)] border p-6 ${presentation.shellClassName} ${confirmed ? "border-[var(--color-border-stable)]" : "border-[var(--color-border-default)]"}`}
    >
      <span aria-hidden="true" className={`h-[3px] w-full rounded-[var(--v3-radius-mark)] ${presentation.markClassName}`} />
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className={`v3-type-label-strong ${presentation.titleClassName}`}>{title}</span>
        <span className="v3-type-label flex flex-wrap items-center gap-1.5 text-[var(--color-text-secondary)]">
          <span>{presentation.label}</span>
          <span aria-hidden="true">·</span>
          <span className={confirmed ? "text-[var(--color-text-stable)]" : undefined}>
            {confirmed ? "확인됨" : "확인 필요"}
          </span>
        </span>
      </figcaption>
      <blockquote
        className="v3-prose whitespace-pre-wrap break-words text-[var(--color-text-primary)]"
        data-v3-typography-role="prose"
      >
        {normalizedBody ?? "기록된 내용이 없습니다."}
      </blockquote>
      <p className={`v3-type-label ko-keep ${confirmed ? "text-[var(--color-text-stable)]" : "text-[var(--color-text-secondary)]"}`}>
        {normalizedProvenance}
      </p>
    </figure>
  );
}

function UntypedReferenceDisclosure({
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
      data-s228-evidence-disclosure
      data-s232d2-reference-untyped
      className="group rounded-[var(--ledger-radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
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
      data-s232d2-reference-state="empty"
      className="rounded-[var(--ledger-radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
    >
      <h2 className="text-base font-bold text-[var(--text-primary)]">참고용 근거가 연결되지 않았습니다.</h2>
      <p className="ko-keep mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        학습자 작성 내용은 본문에서 확인할 수 있습니다. 출처를 확인할 수 있는 근거가 연결되면 이 영역에 표시됩니다.
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

export function StickyAction(props: StickyActionProps) {
  const {
    label = "10분 문단 다시쓰기",
    status = "2분 전 저장됨",
    showStatus = true,
    mode = "Inline",
    responsive = false,
    state = "Ready",
    testId,
  } = props;
  const presentation = STICKY_ACTION_PRESENTATION[state];
  const actionMarker = { "data-s228-primary-action": "true" };
  const actionClassName = [
    "flex min-h-[52px] w-full items-center justify-center rounded-[var(--v3-radius-control)] px-4 py-[15px]",
    "text-center text-[15px] font-bold leading-[22px]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
    presentation.controlClassName,
  ].join(" ");
  const accessibleName = showStatus ? `${label}: ${status}` : label;
  const control = props.state === undefined || props.state === "Ready" ? (
    "href" in props && props.href ? (
      <Link
        {...actionMarker}
        href={props.href}
        data-testid={testId ? `${testId}-control` : undefined}
        aria-label={accessibleName}
        className={actionClassName}
      >
        {label}
      </Link>
    ) : (
      <button
        {...actionMarker}
        type="button"
        onClick={props.onAction}
        data-testid={testId ? `${testId}-control` : undefined}
        aria-label={accessibleName}
        className={actionClassName}
      >
        {label}
      </button>
    )
  ) : (
    <button
      {...actionMarker}
      type="button"
      disabled
      aria-busy={state === "Saving" ? true : undefined}
      data-testid={testId ? `${testId}-control` : undefined}
      aria-label={accessibleName}
      className={actionClassName}
    >
      {label}
    </button>
  );

  return (
    <section
      data-s228-sticky-action
      data-v3-component="StickyAction"
      data-v3-mode={responsive ? undefined : mode}
      data-v3-state={state}
      data-s232b2-responsive={responsive ? "Dock-to-Inline" : undefined}
      data-status-visible={showStatus}
      data-testid={testId}
      aria-label="다음 학습 행동"
      className={[
        "flex w-full flex-col gap-2",
        responsive
          ? "fixed inset-x-0 bottom-0 z-30 min-h-[116px] border-t border-[var(--color-border-default)] bg-[var(--color-background-surface)] pb-[max(20px,env(safe-area-inset-bottom))] pl-[max(20px,env(safe-area-inset-left))] pr-[max(20px,env(safe-area-inset-right))] pt-4 max-lg:shadow-[0_-6px_20px_-8px_rgba(20,23,33,0.08)] lg:static lg:min-h-[84px] lg:w-[300px] lg:border-0 lg:bg-transparent lg:p-0"
          : mode === "Dock"
            ? "min-h-[116px] max-w-[390px] border-t border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-5 pb-5 pt-4 shadow-[0_-6px_20px_-8px_rgba(20,23,33,0.08)]"
            : "min-h-[84px] max-w-[300px]",
      ].join(" ")}
    >
      {showStatus ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`min-h-[18px] text-center text-[12px] font-medium leading-[18px] tracking-[0.1px] ${presentation.statusClassName}`}
        >
          <span className="sr-only">{presentation.accessibleLabel} · </span>
          {status}
        </p>
      ) : null}
      {control}
    </section>
  );
}

export function StudyLedgerDetail({
  itemId,
  rewriteFromItemId,
  title,
  subject,
  createdAt,
  savedAt,
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
  // Workflow completion is not the same as stable learning. Without two
  // distinct-day retrieval successes, the evidence-backed state stays
  // conservative: unverified or recovering.
  const stateChipState: StateChipState = state === "attention" ? "Unverified" : "Recovering";
  const stateEvidence = buildLedgerStateEvidence({ state, reviewQueueCount, nextReviewDate });
  const stateChipEvidence: StateChipEvidence = stateChipState === "Unverified"
    ? { state: "Unverified", basis: "missing-confirmation", detail: stateEvidence }
    : { state: "Recovering", basis: "recovery-observed", detail: stateEvidence };
  const actionHref =
    "/app/capture?mode=second&rewriteFrom=" + encodeURIComponent(rewriteFromItemId ?? itemId);
  const visibleTerms = keyTerms.filter(Boolean).slice(0, 5);
  const learnerEvidence = normalizedExcerpt(learnerExcerpt);
  const referenceEvidence = normalizedExcerpt(referenceExcerpt);
  const trustEvidence = adaptLegacyTrustSignals({
    conflictRecorded: evidenceConflict,
    learnerConfirmed,
  });
  const trustSummary = evidenceConflict
    ? "학습자 입력과 참고용 근거 차이"
    : learnerConfirmed
      ? "학습자 확인 기록 있음"
      : "학습자 확인 기록 없음";
  const trustDetail = referenceEvidence
    ? "저장된 학습 기록 · 참고용 근거 연결, 원 출처 확인 필요"
    : "저장된 학습 기록 · 참고용 근거 없음";

  return (
    <>
      <StudyLedgerFocusChrome
        title={title}
        mobileStatus="저장됨"
        desktopStatus={`저장됨 · ${formatRecordDate(savedAt)}`}
      />
      <article
        id="study-ledger-content"
        tabIndex={-1}
        data-s228-study-ledger-detail
        className="mx-auto w-full max-w-[1000px] px-5 pb-28 pt-6 max-lg:pb-[calc(136px+env(safe-area-inset-bottom))] lg:px-0 lg:pb-10 lg:pt-10"
        aria-labelledby="study-ledger-title"
      >
        <div
          className="grid gap-8 lg:grid-cols-[minmax(0,var(--ledger-reading-column))_var(--ledger-evidence-rail)] lg:items-start"
          data-s232d1-ledger-workspace
          data-s232d2-ledger-workspace
        >
          <div
            data-s232b1-reading-column
            data-s232d2-reading-column
            className="min-w-0 space-y-5"
          >
            <header
              data-s232d2-reading-header
              className="border-b border-[var(--border-subtle)] pb-7"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-medium text-[var(--text-tertiary)]">
                  {subject} · {formatRecordDate(createdAt)}
                </p>
                <StateChip
                  evidence={stateChipEvidence}
                  showEvidence={false}
                  legacyState={state}
                />
              </div>
              <h1
                id="study-ledger-title"
                className="v3-type-screen ko-keep mt-5 break-words text-[var(--text-primary)]"
                data-v3-typography-role="heading-screen"
              >
                {title}
              </h1>
            </header>

            <div data-s232b1-trust-gap-stack className="space-y-5">
              <TrustEvidenceBar
                evidence={trustEvidence}
                sources={referenceEvidence ? ["persisted_record", "reference"] : ["persisted_record"]}
                summary={trustSummary}
                detail={trustDetail}
                saveStatus={`${formatRecordDate(savedAt)} 저장 · 수정 가능`}
                announceChange={evidenceConflict}
              />

              <BiggestGap gap={biggestGap} evidence={stateEvidence} />
            </div>

            <section
              data-s232d2-recovery-context
              className="border-b border-[var(--border-subtle)] pb-6"
              aria-label="회복 맥락"
            >
              <p className="v3-type-label-strong text-[var(--color-text-secondary)]">회복 맥락</p>
              <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-primary)]">{recurrenceText}</p>
            </section>

            <section data-s232d2-learner-evidence aria-label="학습자 작성 근거">
              {learnerEvidence ? (
                <EvidenceExcerpt
                  title="내가 쓴 핵심"
                  body={learnerEvidence}
                  evidence={{
                    source: "Learner",
                    sourceBasis: "learner-authored",
                    review: "Default",
                    provenance: `학습자 작성 · ${formatRecordDate(createdAt)}`,
                  }}
                />
              ) : (
                <div
                  data-s232d2-learner-state="empty"
                  className="rounded-[var(--ledger-radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-5"
                >
                  <h2 className="text-base font-bold text-[var(--text-primary)]">내가 쓴 핵심이 아직 없습니다.</h2>
                  <p className="ko-keep mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    다시쓰기를 저장하면 학습자 작성 근거가 이 위치에 표시됩니다.
                  </p>
                </div>
              )}
            </section>

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

            <section
              data-s228-next-action
              className="border-b border-[var(--border-subtle)] pb-6"
              aria-labelledby="study-ledger-next-action"
            >
              <h2 id="study-ledger-next-action" className="v3-type-label-strong text-[var(--color-text-secondary)]">
                다음 행동
              </h2>
              <p className="v3-type-body ko-keep mt-2 text-[var(--color-text-primary)]">{nextAction}</p>
            </section>

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

            <StickyAction
              responsive
              state="Ready"
              href={actionHref}
              label={completed ? "문단 한 번 더 다듬기" : "10분 문단 다시쓰기"}
              status={completed ? "남은 간극 1개만 다시 확인합니다." : "가장 큰 간극 1개만 보강합니다."}
            />
          </div>

          <aside
            data-s228-evidence-rail
            data-s232d2-evidence-rail
            className="min-w-0 space-y-4"
          >
            <section
              data-s228-review-timing
              data-s232d2-review-context
              className="grid gap-5 rounded-[var(--ledger-radius-card)] bg-[var(--bg-subtle)] p-5 sm:grid-cols-2 lg:grid-cols-1 lg:p-6"
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

            <div data-s232d2-reference-slot>
              {referenceEvidence ? (
                <UntypedReferenceDisclosure
                  title="비교 근거"
                  sourceLabel="참고용 근거 · 원 출처 확인"
                  excerpt={referenceEvidence}
                />
              ) : (
                <StudyLedgerEvidenceEmpty />
              )}
            </div>

            <StudyLedgerSupportingEvidencePanel
              topicCandidate={topicCandidate}
              items={supportingEvidence}
            />

            {reviewHref || calculatorHref || writeHref ? (
              <nav
                data-s232d2-linked-learning
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
    </>
  );
}
