"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { FailureAwareState } from "@/components/learner";
import type { AppraisalMode } from "@/lib/review-os/appraisal";
import {
  createCheckingLocalBetaNotesReadOutcome,
  listReviewOsLocalBetaNotesWithStatus,
  scopeLocalBetaNotesReadOutcome,
  selectLocalBetaNotesReadOutcomeForMode,
  type ModeScopedLocalBetaNotesReadOutcome,
} from "@/lib/review-os/browser-storage";
import type { FailureAwareStateEvidence } from "@/lib/review-os/failure-aware-state";

export type CoreRouteReadSurface =
  | "today"
  | "review"
  | "notes"
  | "items"
  | "agenda"
  | "weekly";

const SURFACE_COPY: Record<
  CoreRouteReadSurface,
  Readonly<{ eyebrow: string; title: string; description: string }>
> = {
  today: {
    eyebrow: "오늘 할 일",
    title: "오늘 할 일",
    description: "저장된 학습 기록에서 지금 할 한 가지를 확인합니다.",
  },
  review: {
    eyebrow: "우선 복습",
    title: "복습",
    description: "저장된 학습 노트에서 지금 다시 확인할 내용을 불러옵니다.",
  },
  notes: {
    eyebrow: "학습 노트",
    title: "학습 노트",
    description: "가장 큰 약점과 다음 행동을 저장된 기록에서 확인합니다.",
  },
  items: {
    eyebrow: "학습 기록",
    title: "학습 기록",
    description: "학습 노트와 복습으로 이어진 기록을 확인합니다.",
  },
  agenda: {
    eyebrow: "학습 기록",
    title: "학습 기록",
    description: "저장된 학습 흐름과 다음 복습 일정을 시간순으로 확인합니다.",
  },
  weekly: {
    eyebrow: "이번 주 계획",
    title: "이번 주 계획",
    description: "저장된 복습 기록에서 이번 주에 먼저 할 작업을 확인합니다.",
  },
};

const LOADING_EVIDENCE = Object.freeze({
  kind: "loading",
  safety: Object.freeze({ kind: "not_applicable" }),
}) satisfies FailureAwareStateEvidence;

const EMPTY_EVIDENCE = Object.freeze({
  kind: "empty",
  safety: Object.freeze({ kind: "not_applicable" }),
}) satisfies FailureAwareStateEvidence;

const ERROR_EVIDENCE = Object.freeze({
  kind: "error",
  retryable: true,
  safety: Object.freeze({ kind: "unknown", preservationKnown: false }),
}) satisfies FailureAwareStateEvidence;

function CoreRouteReadHeader({ surface }: { surface: CoreRouteReadSurface }) {
  const copy = SURFACE_COPY[surface];
  return (
    <header className="max-w-[680px] space-y-2" data-s232f4a-route-header={surface}>
      <p className="v3-type-caption text-[var(--color-text-secondary)]">{copy.eyebrow}</p>
      <h1 className="v3-type-screen ko-keep text-[var(--color-text-primary)]">{copy.title}</h1>
      <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">{copy.description}</p>
    </header>
  );
}

export function CoreRouteReadDegradedNotice({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4"
      data-s232f4a-route-state="degraded"
      data-s232f4a-degraded-count={count}
    >
      <h2 className="v3-type-label-strong text-[var(--color-text-attention)]">
        일부 보조 정보를 불러오지 못했습니다.
      </h2>
      <p className="v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]">
        보이는 핵심 기록은 사용할 수 있습니다. 보조 요약과 참고 정보는 다음 확인에서 다시 불러옵니다.
      </p>
    </section>
  );
}

export function CoreRouteLocalReadDegradedNotice({
  coreRecordsVisible = false,
}: {
  coreRecordsVisible?: boolean;
}) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-attention)] bg-[var(--color-background-attention)] p-4"
      data-s232f4a-route-state="degraded-local-read"
      data-s232f4a-local-read-context={coreRecordsVisible ? "core-records-visible" : "empty-proof-pending"}
    >
      <h2 className="v3-type-label-strong text-[var(--color-text-attention)]">
        이 브라우저의 임시 기록은 확인하지 못했습니다.
      </h2>
      <p className="v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]">
        {coreRecordsVisible
          ? "계정 기반 핵심 기록은 계속 표시합니다. 임시 기록은 다음 확인에서 다시 불러옵니다."
          : "계정 기록 조회는 끝났지만 로컬 기록 여부가 확인되지 않아 빈 상태로 표시하지 않습니다."}
      </p>
    </section>
  );
}

export function CoreRouteReadErrorPage({
  surface,
}: {
  surface: CoreRouteReadSurface;
}) {
  return (
    <div className="space-y-6" data-s232f4a-route-state="error" data-s232f4a-surface={surface}>
      <CoreRouteReadHeader surface={surface} />
      <FailureAwareState
        evidence={ERROR_EVIDENCE}
        action={{
          kind: "button",
          label: "현재 화면 다시 확인",
          onAction: () => window.location.reload(),
        }}
        announceChange={false}
        testId={`s232f4a-${surface}-error-state`}
      />
    </div>
  );
}

export function CoreRouteReadLoadingPage({
  surface,
}: {
  surface: CoreRouteReadSurface;
}) {
  return (
    <div className="space-y-6" data-s232f4a-route-state="loading" data-s232f4a-surface={surface}>
      <CoreRouteReadHeader surface={surface} />
      <FailureAwareState
        evidence={LOADING_EVIDENCE}
        announceChange={false}
        testId={`s232f4a-${surface}-loading-state`}
      />
    </div>
  );
}

export function CoreRouteReadEmptyShell({
  surface,
  mode,
  degradedCount = 0,
  includeBrowserLocalRecords = true,
  confirmedEmptyContent,
  children,
}: {
  surface: CoreRouteReadSurface;
  mode: AppraisalMode;
  degradedCount?: number;
  includeBrowserLocalRecords?: boolean;
  confirmedEmptyContent?: ReactNode;
  children?: ReactNode;
}) {
  const [storedBrowserLocalRead, setStoredBrowserLocalRead] =
    useState<ModeScopedLocalBetaNotesReadOutcome>(() =>
      createCheckingLocalBetaNotesReadOutcome(mode),
    );
  const browserLocalRead = selectLocalBetaNotesReadOutcomeForMode(
    storedBrowserLocalRead,
    mode,
  );
  const browserLocalRecordState =
    browserLocalRead.status === "ready"
      ? browserLocalRead.notes.length > 0
        ? "present"
        : "empty"
      : browserLocalRead.status;
  const localRecordState = includeBrowserLocalRecords
    ? browserLocalRecordState
    : "empty";

  useEffect(() => {
    if (!includeBrowserLocalRecords) return;
    const timeoutId = window.setTimeout(() => {
      const outcome = listReviewOsLocalBetaNotesWithStatus(mode);
      setStoredBrowserLocalRead(scopeLocalBetaNotesReadOutcome(mode, outcome));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [includeBrowserLocalRecords, mode]);

  return (
    <div className="space-y-6" data-s232f4a-route-state="zero-essential-records" data-s232f4a-surface={surface}>
      <CoreRouteReadHeader surface={surface} />
      <CoreRouteReadDegradedNotice count={degradedCount} />
      {localRecordState === "checking" ? (
        <FailureAwareState
          evidence={LOADING_EVIDENCE}
          announceChange={false}
          testId={`s232f4a-${surface}-local-check-loading`}
        />
      ) : localRecordState === "empty" ? (
        <div className="space-y-4">
          <FailureAwareState
            evidence={EMPTY_EVIDENCE}
            action={
              confirmedEmptyContent
                ? undefined
                : {
                    kind: "link",
                    label: "오늘 한 것 올리기",
                    href: `/app/capture?mode=${mode}`,
                  }
            }
            testId={`s232f4a-${surface}-empty-state`}
          />
          {confirmedEmptyContent}
        </div>
      ) : localRecordState === "unavailable" ? (
        <CoreRouteLocalReadDegradedNotice />
      ) : null}
      {children}
    </div>
  );
}
