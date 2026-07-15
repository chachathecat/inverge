import { notFound } from "next/navigation";

import { TrustEvidenceBar } from "@/components/learner";
import type {
  TrustEvidenceBarDisclosure,
  TrustEvidenceBarState,
  TrustProvenanceEvidence,
} from "@/lib/review-os/trust-provenance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "S232B.1 TrustEvidenceBar acceptance",
  robots: { index: false, follow: false },
};

const disclosures: readonly TrustEvidenceBarDisclosure[] = ["Collapsed", "Expanded"];

const stateFixtures: ReadonlyArray<{
  state: TrustEvidenceBarState;
  evidence: TrustProvenanceEvidence;
  summary: string;
  detail: string;
}> = [
  {
    state: "Verified",
    evidence: { kind: "learner_confirmation", learnerConfirmed: true },
    summary: "학습자 확인 기록과 저장된 근거 연결",
    detail: "명시적으로 확인된 학습 기록입니다. 공식 채점이나 확정 점수를 뜻하지 않습니다.",
  },
  {
    state: "NeedsReview",
    evidence: { kind: "review_requirement", reviewRequired: true },
    summary: "저장 전 근거 확인 필요",
    detail: "명시적인 검토 요구가 남아 있습니다. 긴 한국어 안내가 이어져도 전문을 자르거나 가로 스크롤을 만들지 않습니다.",
  },
  {
    state: "Conflict",
    evidence: { kind: "conflict_record", conflictRecorded: true },
    summary: "학습자 입력과 참고용 근거 차이",
    detail: "서로 다른 근거가 기록되어 먼저 확인해야 합니다. 어느 쪽도 공식 정답이나 기기 검증 완료로 자동 승격하지 않습니다.",
  },
];

export default function S232B1TrustEvidenceAcceptancePage() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  ) {
    notFound();
  }

  return (
    <main
      className="mx-auto w-full max-w-[var(--layout-content-max)] space-y-10 px-[var(--layout-page-edge)] py-10"
      data-s232b1-trust-acceptance
      data-private-learner-data="absent"
    >
      <header className="max-w-[var(--layout-reading-column)] space-y-3">
        <p className="v3-type-caption text-[var(--color-text-secondary)]">
          S232B.1 · SYNTHETIC ACCEPTANCE
        </p>
        <h1 className="v3-type-screen text-[var(--color-text-primary)]">
          Figma V3 신뢰 근거 바
        </h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          개인 데이터, 답안, OCR, 계정 정보 없이 승인된 합성 문장만 사용하는 Preview 전용 3×2 상태 매트릭스입니다.
        </p>
      </header>

      <section className="grid gap-5 xl:grid-cols-2" aria-label="TrustEvidenceBar 상태와 펼침 매트릭스">
        {stateFixtures.flatMap((fixture) =>
          disclosures.map((disclosure) => (
            <TrustEvidenceBar
              key={`${fixture.state}-${disclosure}`}
              evidence={fixture.evidence}
              sources={["persisted_record"]}
              summary={fixture.summary}
              detail={fixture.detail}
              saveStatus="합성 저장 기록 · 수정 가능"
              defaultExpanded={disclosure === "Expanded"}
              testId={`trust-evidence-${fixture.state}-${disclosure}`}
            />
          )),
        )}
      </section>
    </main>
  );
}
