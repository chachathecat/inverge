"use client";

import {
  FailureAwareState,
  LearnerEmptyState,
  LearnerLoadingState,
  LearnerPrimaryLink,
  V3ActionLink,
  V3Surface,
} from "@/components/learner";

type RequestedSourceReadSurface = "session" | "first_ox";
type RequestedSourceReadStatus = "loading" | "missing" | "unavailable";

const ERROR_EVIDENCE = Object.freeze({
  kind: "error",
  retryable: true,
  safety: Object.freeze({ kind: "unknown", preservationKnown: false }),
} as const);

const COPY = {
  session: {
    eyebrow: "오늘 학습 기록 확인",
    title: "저장 결과를 확인합니다.",
    loading: "현재 계정의 저장 기록을 불러오고 있습니다.",
    missingTitle: "이 저장 기록을 확인할 수 없습니다.",
    missingDescription:
      "삭제되었거나 현재 계정에서 볼 수 없는 기록입니다. 저장 완료로 표시하지 않았습니다.",
    returnLabel: "오늘 학습으로 돌아가기",
  },
  first_ox: {
    eyebrow: "O/X 원본 확인",
    title: "저장된 선지를 확인합니다.",
    loading: "현재 계정의 원본 기록을 불러오고 있습니다.",
    missingTitle: "이 원본 기록을 확인할 수 없습니다.",
    missingDescription:
      "삭제되었거나 현재 계정에서 볼 수 없는 기록입니다. 기본 예제로 바꾸지 않았습니다.",
    returnLabel: "기본 O/X 연습으로 이동",
  },
} as const;

export function RequestedSourceReadState({
  surface,
  status,
  returnHref,
  onRetry,
}: {
  surface: RequestedSourceReadSurface;
  status: RequestedSourceReadStatus;
  returnHref: string;
  onRetry?: () => void;
}) {
  const copy = COPY[surface];
  const useV3State = surface === "session" && /(?:\?|&)mode=second(?:&|$)/.test(returnHref);

  return (
    <div
      className="space-y-5"
      data-s232f6-source-read-state={status}
      data-s232f6-source-read-surface={surface}
    >
      <header className="max-w-[680px] space-y-2">
        <p className="v3-type-caption text-[var(--color-text-secondary)]">
          {copy.eyebrow}
        </p>
        <h1 className="v3-type-screen ko-keep text-[var(--color-text-primary)]">
          {copy.title}
        </h1>
      </header>

      {status === "loading" ? (
        useV3State ? (
          <V3Surface as="section" tone="subtle" className="space-y-3">
            <p className="v3-type-caption text-[var(--color-text-secondary)]">불러오는 중</p>
            <h2 className="v3-type-section ko-keep text-[var(--color-text-primary)]">원본 기록을 불러오는 중입니다.</h2>
            <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">{copy.loading}</p>
          </V3Surface>
        ) : (
          <LearnerLoadingState
            title="원본 기록을 불러오는 중입니다."
            description={copy.loading}
          />
        )
      ) : status === "missing" ? (
        useV3State ? (
          <V3Surface as="section" tone="subtle" className="space-y-4">
            <h2 className="v3-type-section ko-keep text-[var(--color-text-primary)]">{copy.missingTitle}</h2>
            <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">{copy.missingDescription}</p>
            <V3ActionLink href={returnHref}>{copy.returnLabel}</V3ActionLink>
          </V3Surface>
        ) : (
          <LearnerEmptyState
            title={copy.missingTitle}
            description={copy.missingDescription}
            action={
              <LearnerPrimaryLink href={returnHref}>
                {copy.returnLabel}
              </LearnerPrimaryLink>
            }
          />
        )
      ) : (
        <FailureAwareState
          evidence={ERROR_EVIDENCE}
          action={{
            kind: "button",
            label: "원본 기록 다시 확인",
            onAction: onRetry ?? (() => window.location.reload()),
          }}
          testId={`s232f6-${surface}-source-unavailable`}
        />
      )}
    </div>
  );
}
