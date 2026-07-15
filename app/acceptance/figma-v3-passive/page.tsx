import { notFound } from "next/navigation";

import { BiggestGap, EvidenceExcerpt, StateChip } from "@/components/learner";
import type {
  BiggestGapDensity,
  BiggestGapType,
  EvidenceExcerptEvidence,
  EvidenceExcerptReview,
  EvidenceExcerptSource,
  StateChipEvidence,
} from "@/components/learner";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "S232B passive component acceptance",
  robots: { index: false, follow: false },
};

const stateChipFixtures: readonly StateChipEvidence[] = [
  { state: "Unverified", basis: "missing-confirmation", detail: "확인 기록 없음" },
  { state: "Weak", basis: "confirmed-incorrect-retrieval", detail: "확인된 오답 재인출 1회" },
  { state: "Recovering", basis: "recovery-observed", detail: "재작성 1회 · 내일 확인" },
  { state: "Stable", basis: "distinct-day-successes", detail: "서로 다른 날 성공 2회", distinctDaySuccessCount: 2 },
];

const biggestGapTypes: readonly BiggestGapType[] = ["MissingLink", "Incorrect", "Unverified"];
const biggestGapDensities: readonly BiggestGapDensity[] = ["Default", "Compact"];
const evidenceSources: readonly EvidenceExcerptSource[] = ["Learner", "Official", "AI"];
const evidenceReviews: readonly EvidenceExcerptReview[] = ["Default", "Confirmed"];

function syntheticEvidence(
  source: EvidenceExcerptSource,
  review: EvidenceExcerptReview,
): EvidenceExcerptEvidence {
  const sourceEvidence = source === "Learner"
    ? { source, sourceBasis: "learner-authored" as const }
    : source === "Official"
      ? { source, sourceBasis: "verified-official-source" as const }
      : { source, sourceBasis: "ai-generated" as const };
  const provenance = `${review === "Confirmed" ? "명시적 확인 기록" : "확인 필요"} · 합성 예시`;
  return review === "Confirmed"
    ? { ...sourceEvidence, review, confirmationRecorded: true, provenance }
    : { ...sourceEvidence, review, provenance };
}

const gapCopy: Record<BiggestGapType, string> = {
  MissingLink: "판단 기준과 결론 사이의 연결 문장이 빠졌습니다.",
  Incorrect: "조건과 적용식의 연결 방향을 반대로 적었습니다.",
  Unverified: "원문 조건과 단위를 아직 직접 대조하지 않았습니다. 긴 한국어 문장이 이어져도 핵심 상태와 근거가 잘리거나 가로 스크롤을 만들지 않아야 합니다.",
};

const evidenceCopy: Record<EvidenceExcerptSource, { title: string; body: string }> = {
  Learner: {
    title: "내가 쓴 핵심",
    body: "핵심 판단을 먼저 적고 그 이유를 한 문장으로 연결했습니다.",
  },
  Official: {
    title: "확인한 공식 근거 예시",
    body: "공식 출처가 명시적으로 확인된 경우에만 이 표현 계층을 사용합니다.",
  },
  AI: {
    title: "AI 제안 예시",
    body: "AI가 만든 문장은 확인 전 학습 보조 초안이며 공식 판단이 아닙니다. 문장이 여러 줄로 길어져도 전문을 숨기거나 말줄임표로 잘라내지 않고 출처와 확인 상태를 함께 읽을 수 있어야 합니다.",
  },
};

export default function S232BPassiveComponentAcceptancePage() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  ) {
    notFound();
  }

  return (
    <main
      className="mx-auto w-full max-w-[var(--layout-content-max)] space-y-12 px-[var(--layout-page-edge)] py-10"
      data-s232b-passive-acceptance
      data-private-learner-data="absent"
    >
      <header className="max-w-[var(--layout-reading-column)] space-y-3">
        <p className="v3-type-caption text-[var(--color-text-secondary)]">S232B · SYNTHETIC ACCEPTANCE</p>
        <h1 className="v3-type-screen text-[var(--color-text-primary)]">Figma V3 수동형 컴포넌트</h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          개인 데이터, 답안 원문, OCR, 계정 정보 없이 승인된 합성 문장만 사용하는 Preview 전용 상태 매트릭스입니다.
        </p>
      </header>

      <section className="space-y-5" aria-labelledby="state-chip-matrix">
        <h2 id="state-chip-matrix" className="v3-type-section text-[var(--color-text-primary)]">StateChip</h2>
        <div className="flex flex-wrap gap-3">
          {stateChipFixtures.map((fixture) => (
            <StateChip key={fixture.state} evidence={fixture} />
          ))}
          <StateChip
            evidence={{ state: "Recovering", basis: "recovery-observed", detail: "숨긴 관찰 근거" }}
            showEvidence={false}
          />
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="biggest-gap-matrix">
        <h2 id="biggest-gap-matrix" className="v3-type-section text-[var(--color-text-primary)]">BiggestGap</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {biggestGapTypes.flatMap((type) =>
            biggestGapDensities.map((density) => (
              <BiggestGap
                key={`${type}-${density}`}
                type={type}
                density={density}
                gap={gapCopy[type]}
                evidence="합성 학습 사건 · 개인정보 없음"
                headingId={`acceptance-gap-${type.toLowerCase()}-${density.toLowerCase()}`}
              />
            )),
          )}
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="evidence-excerpt-matrix">
        <h2 id="evidence-excerpt-matrix" className="v3-type-section text-[var(--color-text-primary)]">EvidenceExcerpt</h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {evidenceSources.flatMap((source) =>
            evidenceReviews.map((review) => (
              <EvidenceExcerpt
                key={`${source}-${review}`}
                title={evidenceCopy[source].title}
                body={evidenceCopy[source].body}
                evidence={syntheticEvidence(source, review)}
              />
            )),
          )}
        </div>
      </section>
    </main>
  );
}
