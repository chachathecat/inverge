import type { PresentValueVariableSchemaId } from "@/lib/actuary-second/types";

export const presentValueVariableSchemas: Record<
  PresentValueVariableSchemaId,
  {
    requiredFields: string[];
    reviewHint: string;
  }
> = {
  pv_annuity_core_v1: {
    requiredFields: [
      "interest_rate",
      "period_count",
      "payment_amount",
      "compounding_assumption",
      "annuity_type",
      "timing_convention",
      "present_value_target",
    ],
    reviewHint: "Fix rate, period, timing, and target before you calculate.",
  },
};
