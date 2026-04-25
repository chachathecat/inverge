export type InvergePlanId = "free" | "core" | "premium";

export type InvergeSubscriptionStatus = "free" | "active" | "past_due" | "canceled";

export type InvergeBillingInterval = "month" | "season";

export type InvergeFeatureKey =
  | "review_os.capture"
  | "review_os.queue"
  | "review_os.weekly_summary"
  | "review_os.history"
  | "review_os.extra_credits"
  | "second.ai_enhancement";

export type InvergePlan = {
  id: InvergePlanId;
  name: string;
  description: string;
  priceLabel: string;
  interval: InvergeBillingInterval;
  recommended?: boolean;
  features: string[];
  includedFeatureKeys: InvergeFeatureKey[];
};

export type InvergeSubscriptionState = {
  planId: InvergePlanId;
  status: InvergeSubscriptionStatus;
  provider: "mock" | "stripe" | "manual";
  currentPeriodEndsAt?: string;
  checkoutSessionId?: string;
  updatedAt: string;
};

export type CheckoutProviderName = "mock" | "stripe";

export type CheckoutRequest = {
  planId: InvergePlanId;
  interval?: InvergeBillingInterval;
  returnPath?: string;
};

export type CheckoutResult =
  | {
      ok: true;
      provider: CheckoutProviderName;
      checkoutUrl: string;
      checkoutSessionId: string;
      mock: boolean;
    }
  | {
      ok: false;
      provider: CheckoutProviderName;
      error: string;
      mock: boolean;
    };

export const INVERGE_SUBSCRIPTION_STORAGE_KEY = "inverge:billing:subscription";

export const INVERGE_PLANS: InvergePlan[] = [
  {
    id: "free",
    name: "Alpha Trial",
    description: "감정평가사 alpha 흐름을 가볍게 확인하는 시작 플랜입니다.",
    priceLabel: "0원",
    interval: "month",
    features: ["월 20개 항목 처리", "오늘 다시 볼 항목", "최근 기록 14일"],
    includedFeatureKeys: ["review_os.capture", "review_os.queue"],
  },
  {
    id: "core",
    name: "Appraiser Core",
    description: "1차 오답 관리와 2차 답안 보강, 주간 정리까지 이어지는 기본 플랜입니다.",
    priceLabel: "월 12,900원",
    interval: "month",
    recommended: true,
    features: ["월 150개 항목 처리", "감평사 1차/2차 mode", "주간 감평 학습 정리", "기록 보관"],
    includedFeatureKeys: [
      "review_os.capture",
      "review_os.queue",
      "review_os.weekly_summary",
      "review_os.history",
      "second.ai_enhancement",
    ],
  },
  {
    id: "premium",
    name: "Season Pack",
    description: "시험 시즌에 처리량을 늘리는 확장 플랜입니다. alpha에서는 운영 검증만 진행합니다.",
    priceLabel: "준비 중",
    interval: "season",
    features: ["Core 전체", "추가 처리량 준비", "alpha 피드백 우선 반영"],
    includedFeatureKeys: [
      "review_os.capture",
      "review_os.queue",
      "review_os.weekly_summary",
      "review_os.history",
      "review_os.extra_credits",
      "second.ai_enhancement",
    ],
  },
];

export const FREE_SUBSCRIPTION_STATE: InvergeSubscriptionState = {
  planId: "free",
  status: "free",
  provider: "mock",
  updatedAt: "1970-01-01T00:00:00.000Z",
};

export function getPlan(planId: InvergePlanId) {
  return INVERGE_PLANS.find((plan) => plan.id === planId) ?? INVERGE_PLANS[0];
}

export function isPaidSubscription(state: InvergeSubscriptionState) {
  return state.status === "active" && state.planId !== "free";
}

export function canUseFeature(state: InvergeSubscriptionState, feature: InvergeFeatureKey) {
  const plan = isPaidSubscription(state) ? getPlan(state.planId) : getPlan("free");
  return plan.includedFeatureKeys.includes(feature);
}

export function isPlanId(value: unknown): value is InvergePlanId {
  return value === "free" || value === "core" || value === "premium";
}
