import { notFound } from "next/navigation";

import { StudyLedgerTrustBar } from "@/components/learner";
import { TrustProvenanceLayer } from "@/components/review-os/trust-provenance-layer";
import { TrustStatusCard } from "@/components/review-os/trust-status-card";
import {
  TRUST_PROVENANCE_STATES,
  type TrustProvenanceEvidence,
  type TrustProvenanceSourceKind,
  type TrustProvenanceState,
} from "@/lib/review-os/trust-provenance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "S231B trust acceptance",
  robots: { index: false, follow: false },
};

type Fixture = Readonly<{
  evidence: TrustProvenanceEvidence;
  sources: readonly TrustProvenanceSourceKind[];
  title: string;
  summary: string;
}>;

const FIXTURES: Record<TrustProvenanceState, Fixture> = {
  confirmed_record: {
    evidence: { kind: "learner_confirmation", learnerConfirmed: true },
    sources: ["learner_text"],
    title: "확인된 학습 기록",
    summary: "명시적인 학습자 확인 메타데이터가 있는 합성 상태입니다.",
  },
  needs_review: {
    evidence: { kind: "review_requirement", reviewRequired: true },
    sources: ["ocr_draft"],
    title: "검토가 필요한 초안",
    summary: "구조화된 검토 필요 메타데이터가 있는 합성 상태입니다.",
  },
  conflict: {
    evidence: { kind: "conflict_record", conflictRecorded: true },
    sources: ["persisted_record", "reference"],
    title: "근거 차이 확인",
    summary: "명시적인 충돌 플래그가 있는 합성 상태입니다.",
  },
  offline: {
    evidence: { kind: "offline_state", offline: true },
    sources: ["none"],
    title: "오프라인 상태",
    summary: "브라우저의 명시적인 오프라인 신호를 대신하는 합성 상태입니다.",
  },
  unavailable: {
    evidence: { kind: "unavailable", evidenceAvailable: false },
    sources: ["none"],
    title: "근거를 확인할 수 없음",
    summary: "필요한 신뢰·출처 메타데이터가 없는 fail-closed 합성 상태입니다.",
  },
};

function isTrustState(value: string): value is TrustProvenanceState {
  return TRUST_PROVENANCE_STATES.some((state) => state === value);
}

export default async function S231BTrustAcceptancePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  ) {
    notFound();
  }

  const { state } = await params;
  if (!isTrustState(state)) notFound();
  const fixture = FIXTURES[state];

  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-5 py-6 sm:py-10"
      data-s231b-trust-acceptance={state}
      data-private-learner-data="absent"
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.12em] text-[color:var(--muted)]">
          S231B METADATA-ONLY ACCEPTANCE
        </p>
        <h1 className="text-2xl font-semibold text-[color:var(--foreground-strong)]">
          신뢰·출처 상태 검증
        </h1>
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          학습자 원문, OCR 본문, 문제·답안·참고 문구를 포함하지 않는 합성 메타데이터 화면입니다.
        </p>
      </header>

      {state === "conflict" ? (
        <StudyLedgerTrustBar
          learnerConfirmed={false}
          referenceAvailable
          evidenceConflict
        />
      ) : state === "unavailable" ? (
        <TrustStatusCard
          evidence={fixture.evidence}
          title={fixture.title}
          summary={fixture.summary}
        />
      ) : (
        <TrustProvenanceLayer
          evidence={fixture.evidence}
          sources={fixture.sources}
          title={fixture.title}
          summary={fixture.summary}
          details={[
            { label: "계약 상태", value: state },
            { label: "데이터 경계", value: "합성 메타데이터만 사용" },
          ]}
          stage="acceptance-fixture"
          ariaLabel={`${fixture.title} 신뢰 및 출처 상태`}
          announceChange={state === "offline"}
        />
      )}
    </div>
  );
}
