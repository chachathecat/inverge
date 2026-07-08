import { RefinedBadge } from "@/components/inverge/refined-primitives";

export type TrustStatusItem = {
  label: string;
  status: string;
  helper: string;
};

type TrustStatusCardProps = {
  title?: string;
  summary?: string;
  items?: TrustStatusItem[];
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

export function TrustStatusCard({
  title = "입력 상태와 신뢰 확인",
  summary = "무엇이 사용자 입력이고 무엇이 OCR/AI 초안인지 구분한 뒤 저장 전 직접 확인합니다.",
  items = DEFAULT_TRUST_ITEMS,
}: TrustStatusCardProps) {
  return (
    <section data-testid="trust-status-card" className="trust-layer p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <RefinedBadge>신뢰 상태</RefinedBadge>
        <RefinedBadge tone="amber">저장 전 확인</RefinedBadge>
      </div>
      <h2 className="mt-3 text-base font-semibold text-[color:var(--foreground-strong)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{summary}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-3">
            <p className="text-caption font-medium text-[color:var(--muted)]">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--foreground-strong)]">{item.status}</p>
            <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">{item.helper}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
