"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import {
  buildFailureAwareStateModel,
  shouldMoveFailureAwareHeadingFocus,
  type FailureAwareStateEvidence,
  type FailureAwareSystemState,
} from "@/lib/review-os/failure-aware-state";
import { cn } from "@/lib/utils";

export type FailureAwareStateAction =
  | Readonly<{ kind: "link"; label: string; href: string }>
  | Readonly<{ kind: "button"; label: string; onAction: () => void }>;

export type FailureAwareStateProps = Readonly<{
  evidence: FailureAwareStateEvidence;
  action?: FailureAwareStateAction;
  focusHeadingOnChange?: boolean;
  announceChange?: boolean;
  className?: string;
  testId?: string;
}>;

const PRESENTATION: Record<
  FailureAwareSystemState,
  {
    eyebrow: string;
    shellClassName: string;
    markerClassName: string;
    eyebrowClassName: string;
  }
> = {
  loading: {
    eyebrow: "처리 중",
    shellClassName:
      "border-[var(--color-border-default)] bg-[var(--color-background-subtle)]",
    markerClassName: "bg-[var(--color-icon-secondary)]",
    eyebrowClassName: "text-[var(--color-text-secondary)]",
  },
  empty: {
    eyebrow: "빈 상태",
    shellClassName:
      "border-[var(--color-border-default)] bg-[var(--color-background-surface)]",
    markerClassName: "bg-[var(--color-icon-secondary)]",
    eyebrowClassName: "text-[var(--color-text-secondary)]",
  },
  error: {
    eyebrow: "처리 실패",
    shellClassName:
      "border-[var(--color-border-risk)] bg-[var(--color-background-risk)]",
    markerClassName: "bg-[var(--color-icon-risk)]",
    eyebrowClassName: "text-[var(--color-text-risk)]",
  },
  offline: {
    eyebrow: "오프라인",
    shellClassName:
      "border-[var(--color-border-attention)] bg-[var(--color-background-attention)]",
    markerClassName: "bg-[var(--color-icon-attention)]",
    eyebrowClassName: "text-[var(--color-text-attention)]",
  },
  conflict: {
    eyebrow: "근거 차이",
    shellClassName:
      "border-[var(--color-border-risk)] bg-[var(--color-background-risk)]",
    markerClassName: "bg-[var(--color-icon-risk)]",
    eyebrowClassName: "text-[var(--color-text-risk)]",
  },
  completed: {
    eyebrow: "저장 완료",
    shellClassName:
      "border-[var(--color-border-stable)] bg-[var(--color-background-stable)]",
    markerClassName: "bg-[var(--color-icon-stable)]",
    eyebrowClassName: "text-[var(--color-text-stable)]",
  },
};

function normalizedActionLabel(label: string): string {
  const normalized = label.trim();
  if (!normalized) throw new Error("FailureAwareState requires a non-empty action label.");
  return normalized;
}

export function FailureAwareState({
  evidence,
  action,
  focusHeadingOnChange = false,
  announceChange = true,
  className,
  testId = "failure-aware-state",
}: FailureAwareStateProps) {
  const model = buildFailureAwareStateModel(evidence);
  const presentation = PRESENTATION[model.state];
  const id = useId();
  const headingId = `${id}-failure-aware-heading`;
  const happenedId = `${id}-failure-aware-happened`;
  const safetyId = `${id}-failure-aware-safety`;
  const nextActionId = `${id}-failure-aware-next-action`;
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStateRef = useRef(model.state);

  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = model.state;
    const activeElement = document.activeElement;
    if (
      !shouldMoveFailureAwareHeadingFocus({
        enabled: focusHeadingOnChange,
        previousState,
        nextState: model.state,
        activeElementWithinInstance:
          activeElement instanceof HTMLElement &&
          Boolean(sectionRef.current?.contains(activeElement)),
      })
    ) {
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [focusHeadingOnChange, model.state]);

  const actionControl = action ? (
    action.kind === "link" ? (
      <Link
        href={action.href}
        aria-describedby={nextActionId}
        className={cn(
          "v3-type-body-strong inline-flex min-h-11 w-full items-center justify-center px-5 py-3 sm:w-auto",
          "rounded-[var(--v3-radius-control)] bg-[var(--color-background-brand)] text-[var(--color-text-inverse)]",
          "hover:bg-[var(--color-background-brand-hover)] focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
        )}
      >
        {normalizedActionLabel(action.label)}
      </Link>
    ) : (
      <button
        type="button"
        onClick={action.onAction}
        aria-describedby={nextActionId}
        className={cn(
          "v3-type-body-strong inline-flex min-h-11 w-full items-center justify-center px-5 py-3 sm:w-auto",
          "rounded-[var(--v3-radius-control)] bg-[var(--color-background-brand)] text-[var(--color-text-inverse)]",
          "hover:bg-[var(--color-background-brand-hover)] focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2",
        )}
      >
        {normalizedActionLabel(action.label)}
      </button>
    )
  ) : null;

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-labelledby={headingId}
      aria-describedby={`${happenedId} ${safetyId} ${nextActionId}`}
      aria-busy={model.state === "loading" ? true : undefined}
      data-v3-component="FailureAwareState"
      data-v3-system-state={model.state}
      data-failure-aware-safety={model.safety.kind}
      data-failure-aware-auto-sync={model.autoSyncEligible ? "queue-backed" : "none"}
      data-testid={testId}
      className={cn(
        "w-full rounded-[var(--v3-radius-panel)] border p-5 sm:p-6",
        presentation.shellClassName,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn("mt-2 size-2.5 shrink-0 rounded-full", presentation.markerClassName)}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("v3-type-label-strong", presentation.eyebrowClassName)}>
            {presentation.eyebrow}
          </p>
          <h2
            ref={headingRef}
            id={headingId}
            tabIndex={focusHeadingOnChange ? -1 : undefined}
            className={cn(
              "v3-type-section ko-keep mt-1 break-words text-[var(--color-text-primary)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4",
              "focus-visible:outline-[var(--color-border-focus)]",
            )}
          >
            {model.title}
          </h2>
        </div>
      </div>

      <dl className="mt-5 grid gap-4" data-failure-aware-explanation>
        <div>
          <dt className="v3-type-label text-[var(--color-text-secondary)]">무슨 일이 있었나요</dt>
          <dd id={happenedId} className="v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]">
            {model.happened}
          </dd>
        </div>
        <div>
          <dt className="v3-type-label text-[var(--color-text-secondary)]">입력과 데이터는 안전한가요</dt>
          <dd id={safetyId} className="v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]">
            {model.safety.message}
          </dd>
        </div>
        <div>
          <dt className="v3-type-label text-[var(--color-text-secondary)]">다음 행동</dt>
          <dd id={nextActionId} className="v3-type-body ko-keep mt-1 text-[var(--color-text-primary)]">
            {model.nextAction}
          </dd>
        </div>
      </dl>

      {model.state === "conflict" ? (
        <p className="v3-type-caption mt-4 text-[var(--color-text-secondary)]" data-conflict-source-count>
          비교할 근거 {model.conflictSourceCount}개
        </p>
      ) : null}

      {actionControl ? <div className="mt-5">{actionControl}</div> : null}

      {announceChange ? (
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {presentation.eyebrow}. {model.title}. {model.happened} {model.safety.message} {model.nextAction}
        </p>
      ) : null}
    </section>
  );
}
