import {
  TrustProvenanceLayer,
  type TrustProvenanceDetail,
} from "@/components/review-os/trust-provenance-layer";
import {
  adaptLegacyTrustSignals,
  type TrustProvenanceEvidence,
  type TrustProvenanceSourceKind,
} from "@/lib/review-os/trust-provenance";

export type TrustStatusItem = {
  label: string;
  status: string;
  helper: string;
};

export type TrustStatusCardProps = {
  title?: string;
  summary?: string;
  items?: TrustStatusItem[];
  evidence?: TrustProvenanceEvidence;
};

export type TrustEvidenceBarProps = {
  source: "사용자 텍스트" | "OCR 초안" | "수동 입력" | "가져온 텍스트";
  confidence: "안정" | "확인 필요";
  learnerConfirmed: boolean;
  officialStatus?: "공식 채점 아님";
  editable?: boolean;
  note?: string;
  offline?: boolean;
  evidenceUnavailable?: boolean;
};

const DEFAULT_TRUST_ITEMS: TrustStatusItem[] = [
  {
    label: "사용자 확인 텍스트",
    status: "편집 가능",
    helper: "답안·문제 조건은 저장 전 직접 고칠 수 있습니다.",
  },
  {
    label: "OCR/가져온 텍스트 초안",
    status: "확인 필요",
    helper: "OCR 또는 가져온 텍스트는 원문이 아니라 확인용 초안입니다.",
  },
  {
    label: "AI 분석 초안",
    status: "학습 보조",
    helper: "AI 분석 초안은 공식 채점이나 확정 점수가 아닙니다.",
  },
  {
    label: "계속할 곳",
    status: "복습 연결",
    helper: "확인한 내용만 오늘 할 일, 복습, 학습 노트로 이어집니다.",
  },
];

const LEGACY_SOURCE_KINDS: Record<
  TrustEvidenceBarProps["source"],
  TrustProvenanceSourceKind
> = {
  "사용자 텍스트": "learner_text",
  "OCR 초안": "ocr_draft",
  "수동 입력": "manual_entry",
  "가져온 텍스트": "imported_text",
};

export function TrustEvidenceBar({
  source,
  confidence,
  learnerConfirmed,
  officialStatus = "공식 채점 아님",
  editable = true,
  note,
  offline = false,
  evidenceUnavailable = false,
}: TrustEvidenceBarProps) {
  const evidence = adaptLegacyTrustSignals({
    offline,
    evidenceAvailable: !evidenceUnavailable,
    learnerConfirmed,
    reviewRequired: confidence === "확인 필요",
  });
  const details: TrustProvenanceDetail[] = [
    { label: "입력 상태", value: confidence },
    { label: "확인", value: learnerConfirmed ? "확인됨" : "확인 전" },
    { label: "채점", value: officialStatus },
    { label: "편집", value: editable ? "가능" : "불가" },
  ];

  return (
    <TrustProvenanceLayer
      evidence={evidence}
      sources={evidenceUnavailable ? ["none"] : [LEGACY_SOURCE_KINDS[source]]}
      details={details}
      summary={note}
      layout="bar"
      stage="capture-intake"
      ariaLabel="입력 신뢰 및 출처 상태"
      testId="trust-evidence-bar"
      legacyMarker="s226"
    />
  );
}

export function TrustStatusCard({
  title = "입력 상태와 신뢰 확인",
  summary = "무엇이 사용자 입력이고 무엇이 OCR/AI 초안인지 구분한 뒤 저장 전 직접 확인합니다. 공식 채점이나 확정 점수가 아닙니다.",
  items = DEFAULT_TRUST_ITEMS,
  evidence = { kind: "unavailable", evidenceAvailable: false },
}: TrustStatusCardProps) {
  return (
    <TrustProvenanceLayer
      evidence={evidence}
      sources={["none"]}
      title={title}
      summary={summary}
      details={items.map((item) => ({
        label: item.label,
        value: item.status,
        helper: item.helper,
      }))}
      stage="first-five-minute-preview"
      trustLayerMarker="first-five-minute-preview"
      testId="trust-status-card"
    />
  );
}
