import { NextResponse } from "next/server";

import { getServerSessionUser, isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { FREE_SUBSCRIPTION_STATE } from "@/lib/inverge/billing";
import { appendInvergeEvent } from "@/lib/inverge/event-repository";
import { createInvergeEventId } from "@/lib/inverge/events";
import {
  cancelServerCheckoutSession,
  confirmServerCheckoutSession,
  getServerSubscriptionState,
} from "@/lib/inverge/subscription-repository";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  const session = await getServerSessionUser();
  if (session.authEnabled && !session.isAuthenticated) {
    return NextResponse.json({
      ok: true,
      subscription: FREE_SUBSCRIPTION_STATE,
      authRequired: true,
      authEnabled: true,
      source: session.source,
    });
  }
  const userId = session.userId ?? "mvp-user";
  return NextResponse.json({
    ok: true,
    subscription: await getServerSubscriptionState(userId),
    authRequired: false,
    authEnabled: session.authEnabled,
    source: session.source,
  });
}

export async function POST(request: Request) {
  try {
    const userId = await requireRequestUserId(request);
    const body = (await request.json()) as unknown;
    if (!isRecord(body) || typeof body.action !== "string") {
      return NextResponse.json({ ok: false, error: "invalid-body", subscription: await getServerSubscriptionState(userId) }, { status: 400 });
    }

    if (body.action === "confirm-checkout") {
      const sessionId = typeof body.checkoutSessionId === "string" ? body.checkoutSessionId : "";
      const result = await confirmServerCheckoutSession(userId, sessionId);
      if (!result) {
        return NextResponse.json(
          { ok: false, error: "checkout-session-not-found", subscription: (await getServerSubscriptionState(userId)) ?? FREE_SUBSCRIPTION_STATE },
          { status: 404 },
        );
      }

      appendInvergeEvent({
        eventId: createInvergeEventId(),
        eventName: "checkout.completed",
        occurredAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        persistence: "server",
        payload: {
          source: "server",
          stage: "commerce",
          properties: {
            planId: result.subscription.planId,
            userId,
            provider: result.subscription.provider,
            checkoutSessionId: result.checkoutSession.checkoutSessionId,
            mock: result.checkoutSession.mock,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        subscription: result.subscription,
        checkoutSession: result.checkoutSession,
      });
    }

    if (body.action === "cancel-checkout") {
      const sessionId = typeof body.checkoutSessionId === "string" ? body.checkoutSessionId : "";
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      const result = await cancelServerCheckoutSession(userId, sessionId, reason);

      appendInvergeEvent({
        eventId: createInvergeEventId(),
        eventName: reason ? "checkout.failed" : "checkout.canceled",
        occurredAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        persistence: "server",
        payload: {
          source: "server",
          stage: "commerce",
          properties: {
            checkoutSessionId: sessionId,
            userId,
            reason: reason ?? null,
            provider: result?.provider ?? null,
            planId: result?.planId ?? null,
            mock: result?.mock ?? null,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        subscription: await getServerSubscriptionState(userId),
        checkoutSession: result,
      });
    }

    return NextResponse.json({ ok: false, error: "invalid-action", subscription: await getServerSubscriptionState(userId) }, { status: 400 });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required", subscription: FREE_SUBSCRIPTION_STATE }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "subscription-route-error", subscription: FREE_SUBSCRIPTION_STATE }, { status: 500 });
  }
}
