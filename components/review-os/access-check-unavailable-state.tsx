"use client";

import {
  FailureAwareState,
  V3RouteFrame,
  V3RouteHeader,
} from "@/components/learner";
import type { FailureAwareStateEvidence } from "@/lib/review-os/failure-aware-state";

const ACCESS_CHECK_UNAVAILABLE_EVIDENCE = Object.freeze({
  kind: "error",
  retryable: true,
  safety: Object.freeze({
    kind: "unknown",
    preservationKnown: false,
  }),
}) satisfies FailureAwareStateEvidence;

function reloadCurrentRoute() {
  window.location.reload();
}

export function AccessCheckUnavailableState({
  embedded = false,
}: Readonly<{ embedded?: boolean }>) {
  const Content = embedded ? "section" : "main";

  return (
    <div
      className={`mx-auto flex w-full max-w-[var(--layout-content-max)] items-center px-[var(--layout-page-edge)] py-12 ${embedded ? "min-h-[50vh]" : "min-h-[calc(100vh-72px)]"}`}
      data-review-os-access-status="unavailable"
    >
      <Content className="w-full" aria-labelledby="review-os-access-unavailable-title">
        <V3RouteFrame className="space-y-6">
          <V3RouteHeader
            eyebrow="답안길 접근 확인"
            title="접근 상태를 확인하지 못했습니다"
            titleId="review-os-access-unavailable-title"
            description="초대 승인 여부를 확인하는 요청이 끝나지 않았습니다. 이 화면은 초대 미승인 결과가 아닙니다."
          />
          <FailureAwareState
            evidence={ACCESS_CHECK_UNAVAILABLE_EVIDENCE}
            action={{
              kind: "button",
              label: "현재 화면 다시 확인",
              onAction: reloadCurrentRoute,
            }}
            announceChange={false}
            testId="review-os-access-unavailable"
          />
        </V3RouteFrame>
      </Content>
    </div>
  );
}
