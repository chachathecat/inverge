import { RefinedBadge } from "@/components/inverge/refined-primitives";
import {
  buildTrustProvenanceModel,
  type TrustProvenanceEvidence,
  type TrustProvenanceSourceKind,
} from "@/lib/review-os/trust-provenance";
import { cn } from "@/lib/utils";

export type TrustProvenanceDetail = Readonly<{
  label: string;
  value: string;
  helper?: string;
}>;

export type TrustProvenanceStage =
  | "capture-intake"
  | "study-ledger-detail"
  | "first-five-minute-preview"
  | "answer-review-shell"
  | "acceptance-fixture";

export type TrustProvenanceLayerProps = Readonly<{
  evidence: TrustProvenanceEvidence;
  sources: readonly TrustProvenanceSourceKind[];
  title?: string;
  summary?: string;
  details?: readonly TrustProvenanceDetail[];
  layout?: "bar" | "card" | "rail";
  stage: TrustProvenanceStage;
  ariaLabel?: string;
  className?: string;
  testId?: string;
  legacyMarker?: "s226" | "s228";
  trustLayerMarker?: TrustProvenanceStage;
  announceChange?: boolean;
}>;

function detailLayout(layout: NonNullable<TrustProvenanceLayerProps["layout"]>) {
  if (layout === "bar") return "flex flex-wrap items-start gap-x-5 gap-y-2";
  if (layout === "rail") return "space-y-3";
  return "grid gap-3 md:grid-cols-2";
}

export function TrustProvenanceLayer({
  evidence,
  sources,
  title,
  summary,
  details = [],
  layout = "card",
  stage,
  ariaLabel = "신뢰 및 출처 상태",
  className,
  testId = "trust-provenance-layer",
  legacyMarker,
  trustLayerMarker,
  announceChange = false,
}: TrustProvenanceLayerProps) {
  const model = buildTrustProvenanceModel(evidence, sources);
  const isBar = layout === "bar";
  const visibleDetails: readonly TrustProvenanceDetail[] = [
    { label: "출처", value: model.sourceLabel },
    ...details,
  ];

  return (
    <section
      data-trust-provenance-layer
      data-trust-state={model.state}
      data-trust-evidence-kind={model.evidenceKind}
      data-trust-stage={stage}
      data-trust-layer={trustLayerMarker}
      data-s226-trust-evidence={legacyMarker === "s226" ? "" : undefined}
      data-s228-trust-evidence={legacyMarker === "s228" ? "" : undefined}
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(
        isBar ? "trust-evidence evidence-bar px-4 py-3 sm:px-5" : "trust-layer p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <RefinedBadge>신뢰·출처</RefinedBadge>
        <RefinedBadge tone={model.tone}>{model.statusLabel}</RefinedBadge>
      </div>

      {announceChange && model.actionableChange ? (
        <p
          className="sr-only"
          data-trust-state-announcer
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {model.statusLabel}
        </p>
      ) : null}

      {title ? (
        <h2 className={cn("font-semibold text-[color:var(--foreground-strong)]", isBar ? "mt-2 text-sm" : "mt-3 text-base")}>
          {title}
        </h2>
      ) : null}

      {visibleDetails.length > 0 ? (
        <dl className={cn("text-sm", isBar ? "mt-3" : "mt-4", detailLayout(layout))}>
          {visibleDetails.map((detail) => (
            <div
              key={detail.label}
              className={cn(
                layout === "card"
                  ? "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-3"
                  : "min-w-0",
              )}
            >
              <dt className="text-xs font-medium text-[color:var(--muted)]">{detail.label}</dt>
              <dd className={cn("text-[color:var(--foreground-strong)]", layout === "rail" ? "mt-1 text-right" : "mt-1")}>
                <span className={cn("block font-semibold", layout === "rail" ? "text-xs" : "text-sm")}>
                  {detail.value}
                </span>
                {detail.helper ? (
                  <span className="mt-1 block text-xs font-normal leading-5 text-[color:var(--muted)]">
                    {detail.helper}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {summary ? (
        <p className={cn("ko-keep text-[color:var(--muted)]", isBar ? "mt-2 text-xs leading-5" : "mt-3 text-sm leading-6")}>
          {summary}
        </p>
      ) : null}
    </section>
  );
}
