import { Suspense } from "react";

import { getServerSessionUser } from "@/lib/auth/session";
import { PricingPage } from "@/components/inverge/pricing-page";
import { PublicShell } from "@/components/shared/public-shell";
import { FREE_SUBSCRIPTION_STATE } from "@/lib/inverge/billing";
import { getServerSubscriptionState } from "@/lib/inverge/subscription-repository";

export default async function PricingRoute() {
  const session = await getServerSessionUser();
  const initialSubscriptionState = session.userId
    ? await getServerSubscriptionState(session.userId)
    : FREE_SUBSCRIPTION_STATE;

  return (
    <PublicShell>
      <Suspense fallback={null}>
        <PricingPage initialSubscriptionState={initialSubscriptionState} />
      </Suspense>
    </PublicShell>
  );
}
