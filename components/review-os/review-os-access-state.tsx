import {
  V3ActionLink,
  V3RouteFrame,
  V3RouteHeader,
  V3Surface,
} from "@/components/learner";
import { AccessCheckUnavailableState } from "@/components/review-os/access-check-unavailable-state";
import type { ReviewOsAccessResult } from "@/lib/review-os/access-result";

type NonAllowedReviewOsAccess = Exclude<
  ReviewOsAccessResult,
  Readonly<{ status: "allowed" }>
>;

export function ReviewOsAccessState({
  access,
  embedded = false,
}: Readonly<{ access: NonAllowedReviewOsAccess; embedded?: boolean }>) {
  if (access.status === "unavailable") {
    return <AccessCheckUnavailableState embedded={embedded} />;
  }

  const Content = embedded ? "section" : "main";

  return (
    <div
      className={`mx-auto flex w-full max-w-[var(--layout-content-max)] items-center px-[var(--layout-page-edge)] py-12 ${embedded ? "min-h-[50vh]" : "min-h-[calc(100vh-72px)]"}`}
      data-review-os-access-status="denied"
    >
      <Content className="w-full" aria-labelledby="review-os-access-denied-title">
        <V3RouteFrame className="space-y-6">
          <V3RouteHeader
            eyebrow="답안길 초대 계정"
            title="아직 초대 승인 전입니다."
            titleId="review-os-access-denied-title"
            description="승인되면 지금 계정으로 오늘 할 일에서 바로 이어서 사용할 수 있습니다."
          />
          <V3Surface tone="elevated">
            <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
              답안길은 감정평가사 2차 답안 훈련 흐름을 초대 계정부터 순차적으로 열고 있습니다.
            </p>
            <div className="mt-5">
              <V3ActionLink href="/">메인으로 돌아가기</V3ActionLink>
            </div>
          </V3Surface>
        </V3RouteFrame>
      </Content>
    </div>
  );
}
