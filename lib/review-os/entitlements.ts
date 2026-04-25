import type { EntitlementTier } from "@/lib/review-os/types";

export const ENTITLEMENT_LIMITS: Record<
  EntitlementTier,
  { monthlyWrongAnswers: number; historyDays: number | null; label: string }
> = {
  free_trial: {
    monthlyWrongAnswers: 20,
    historyDays: 14,
    label: "Free Trial",
  },
  core: {
    monthlyWrongAnswers: 150,
    historyDays: null,
    label: "Core",
  },
  extra_credits_ready: {
    monthlyWrongAnswers: 200,
    historyDays: null,
    label: "Core + Credits",
  },
};

export function getEntitlementLimit(tier: EntitlementTier) {
  return ENTITLEMENT_LIMITS[tier];
}
