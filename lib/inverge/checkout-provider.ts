import "server-only";

import {
  getPlan,
  isPlanId,
  type CheckoutProviderName,
  type CheckoutRequest,
  type CheckoutResult,
} from "@/lib/inverge/billing";
import { createServerCheckoutSession } from "@/lib/inverge/subscription-repository";

type CheckoutAdapter = {
  provider: CheckoutProviderName;
  createCheckout(input: Required<CheckoutRequest>): Promise<CheckoutResult>;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function buildMockCheckoutUrl(input: Required<CheckoutRequest>, sessionId: string) {
  const params = new URLSearchParams({
    plan: input.planId,
    session_id: sessionId,
    returnPath: input.returnPath,
  });

  return `${getBaseUrl()}/checkout/success?${params.toString()}`;
}

const mockCheckoutAdapter: CheckoutAdapter = {
  provider: "mock",
  async createCheckout(input) {
    const sessionId = `mock_checkout_${Date.now()}`;

    return {
      ok: true,
      provider: "mock",
      checkoutUrl: buildMockCheckoutUrl(input, sessionId),
      checkoutSessionId: sessionId,
      mock: true,
    };
  },
};

const stripeCheckoutAdapter: CheckoutAdapter = {
  provider: "stripe",
  async createCheckout(input) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = input.planId === "premium" ? process.env.STRIPE_PREMIUM_PRICE_ID : process.env.STRIPE_CORE_PRICE_ID;

    if (!secretKey || !priceId) {
      return mockCheckoutAdapter.createCheckout(input);
    }

    // Production connector boundary. Replace this stub with Stripe SDK or HTTP checkout session creation.
    return mockCheckoutAdapter.createCheckout(input);
  },
};

function getProvider(): CheckoutAdapter {
  const configured = process.env.INVERGE_CHECKOUT_PROVIDER?.toLowerCase();
  if (configured === "stripe") return stripeCheckoutAdapter;
  return mockCheckoutAdapter;
}

export async function createCheckoutSession(
  userId: string,
  input: CheckoutRequest,
): Promise<CheckoutResult> {
  if (!isPlanId(input.planId) || input.planId === "free") {
    return { ok: false, provider: "mock", error: "invalid-plan", mock: true };
  }

  const plan = getPlan(input.planId);
  const adapter = getProvider();
  const result = await adapter.createCheckout({
    planId: plan.id,
    interval: input.interval ?? plan.interval,
    returnPath: input.returnPath ?? "/exams/appraiser",
  });

  if (result.ok) {
    await createServerCheckoutSession({
      userId,
      checkoutSessionId: result.checkoutSessionId,
      planId: plan.id,
      interval: input.interval ?? plan.interval,
      provider: result.provider,
      checkoutUrl: result.checkoutUrl,
      returnPath: input.returnPath ?? "/exams/appraiser",
      mock: result.mock,
    });
  }

  return result;
}
