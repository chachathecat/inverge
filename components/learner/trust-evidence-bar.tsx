"use client";

import { useId, useState } from "react";

import {
  buildTrustProvenanceModel,
  resolveTrustEvidenceBarState,
  type TrustEvidenceBarDisclosure,
  type TrustEvidenceBarState,
  type TrustProvenanceEvidence,
  type TrustProvenanceSourceKind,
} from "@/lib/review-os/trust-provenance";
import { cn } from "@/lib/utils";

export type TrustEvidenceBarProps = Readonly<{
  evidence: TrustProvenanceEvidence;
  sources: readonly TrustProvenanceSourceKind[];
  summary: string;
  detail: string;
  saveStatus?: string;
  showSaveStatus?: boolean;
  defaultExpanded?: boolean;
  announceChange?: boolean;
  className?: string;
  testId?: string;
}>;

type VisualState = TrustEvidenceBarState | "Neutral";

const PRESENTATION: Record<
  VisualState,
  { label: string; shellClassName: string; textClassName: string }
> = {
  Verified: {
    label: "확인 기록 있음",
    shellClassName:
      "border-[var(--color-border-default)] bg-[var(--color-background-brand-soft)]",
    textClassName: "text-[var(--color-text-brand)]",
  },
  NeedsReview: {
    label: "확인 필요",
    shellClassName:
      "border-[var(--color-border-attention)] bg-[var(--color-background-attention)]",
    textClassName: "text-[var(--color-text-attention)]",
  },
  Conflict: {
    label: "근거 차이",
    shellClassName:
      "border-[var(--color-border-risk)] bg-[var(--color-background-risk)]",
    textClassName: "text-[var(--color-text-risk)]",
  },
  Neutral: {
    label: "근거 확인 불가",
    shellClassName:
      "border-[var(--color-border-default)] bg-[var(--color-background-subtle)]",
    textClassName: "text-[var(--color-text-secondary)]",
  },
};

function nonEmpty(value: string, field: "summary" | "detail" | "save status") {
  const normalized = value.trim();
  if (!normalized) throw new Error(`TrustEvidenceBar requires non-empty ${field}.`);
  return normalized;
}

export function TrustEvidenceBar({
  evidence,
  sources,
  summary,
  detail,
  saveStatus,
  showSaveStatus = true,
  defaultExpanded = false,
  announceChange = false,
  className,
  testId = "trust-evidence-bar-v3",
}: TrustEvidenceBarProps) {
  const detailsId = `${useId()}-trust-evidence-details`;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const model = buildTrustProvenanceModel(evidence, sources);
  const state = resolveTrustEvidenceBarState(model);
  const visualState: VisualState = state ?? "Neutral";
  const presentation = PRESENTATION[visualState];
  const normalizedSummary = nonEmpty(summary, "summary");
  const normalizedDetail = nonEmpty(detail, "detail");
  const normalizedSaveStatus = saveStatus?.trim() || null;
  if (showSaveStatus && !normalizedSaveStatus) {
    throw new Error("TrustEvidenceBar requires non-empty save status when it is visible.");
  }

  const disclosure: TrustEvidenceBarDisclosure = expanded ? "Expanded" : "Collapsed";

  return (
    <section
      data-v3-component="TrustEvidenceBar"
      data-v3-state={state ?? undefined}
      data-v3-view={disclosure}
      data-v3-expanded={expanded ? "Yes" : "No"}
      data-trust-fallback={state ? undefined : "neutral"}
      data-trust-state={model.state}
      data-trust-evidence-kind={model.evidenceKind}
      data-s228-trust-evidence
      data-testid={testId}
      aria-label={`신뢰 근거 · ${presentation.label}`}
      className={cn(
        "w-full rounded-[var(--v3-radius-control)] border p-4",
        expanded ? "min-h-[170px]" : "min-h-[72px]",
        presentation.shellClassName,
        className,
      )}
    >
      <div className="flex min-h-10 w-full items-center gap-3">
        <span aria-hidden="true" className="relative size-6 shrink-0">
          <span className="absolute inset-0.5 rounded-full border-2 border-[var(--color-icon-brand)]" />
          <span className="absolute left-[9px] top-[9px] size-1.5 rounded-full bg-[var(--color-icon-brand)]" />
        </span>

        <p className={cn("v3-type-label-strong min-w-0 flex-1 break-words", presentation.textClassName)}>
          <span data-v3-trust-status>{presentation.label}</span>
          <span aria-hidden="true"> · </span>
          <span>{normalizedSummary}</span>
        </p>

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${presentation.label} 세부 정보 ${expanded ? "접기" : "보기"}`}
          onClick={() => setExpanded((current) => !current)}
          className={cn(
            "v3-type-caption inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center",
            "rounded-[var(--v3-radius-control)] px-1 underline-offset-4 hover:underline",
            presentation.textClassName,
          )}
        >
          {expanded ? "접기" : "보기"}
        </button>
      </div>

      <div
        id={detailsId}
        hidden={!expanded}
        data-v3-trust-details
        className="mt-3 space-y-1 text-[var(--color-text-secondary)]"
      >
        <p className="v3-type-compact ko-keep break-words">
          {normalizedDetail} · 출처: {model.sourceLabel}
        </p>
        {showSaveStatus && normalizedSaveStatus ? (
          <p className="v3-type-caption ko-keep break-words" data-v3-save-status>
            {normalizedSaveStatus}
          </p>
        ) : null}
      </div>

      {announceChange && visualState === "Conflict" ? (
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {presentation.label}
        </p>
      ) : null}
    </section>
  );
}
