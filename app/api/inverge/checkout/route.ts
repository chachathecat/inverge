import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import { createCheckoutSession } from "@/lib/inverge/checkout-provider";
import { isPlanId, type CheckoutRequest } from "@/lib/inverge/billing";
import { appendInvergeEvent } from "@/lib/inverge/event-repository";
import { createInvergeEventId } from "@/lib/inverge/events";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CheckoutRequest>;
    const session = await getServerSessionUser();
    if (session.authEnabled && !session.isAuthenticated) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    const userId = session.userId ?? "mvp-user";

    if (!isPlanId(body.planId)) {
      return NextResponse.json({ ok: false, error: "invalid-plan" }, { status: 400 });
    }

    const result = await createCheckoutSession(userId, {
      planId: body.planId,
      interval: body.interval,
      returnPath: body.returnPath,
    });

    appendInvergeEvent({
      eventId: createInvergeEventId(),
      eventName: result.ok ? "checkout.started" : "checkout.failed",
      occurredAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      persistence: "server",
      payload: {
        source: "server",
        stage: "commerce",
        properties: {
          planId: body.planId,
          userId,
          interval: body.interval ?? null,
          returnPath: body.returnPath ?? null,
          provider: result.provider,
          mock: result.mock,
          checkoutSessionId: result.ok ? result.checkoutSessionId : null,
          error: result.ok ? null : result.error,
        },
      },
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "checkout-route-error" }, { status: 500 });
  }
}
