import { isRouteResponse, getNotificationRouteContext, notificationApiErrorResponse } from "@/lib/notifications/route-context";
import { parsePushSubscriptionInput } from "@/lib/notifications/notification-settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await getNotificationRouteContext(request);
    if (isRouteResponse(context)) return context;
    const subscription = parsePushSubscriptionInput(await request.json().catch(() => null));
    const now = new Date().toISOString();
    const result = await context.client.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: subscription.userAgent ?? request.headers.get("user-agent"),
        platform: subscription.platform ?? null,
        enabled: true,
        revoked_at: null,
        updated_at: now,
      },
      { onConflict: "endpoint" },
    ).select("id").maybeSingle();
    if (result.error) throw new Error(`notification-subscription-upsert-failed:${result.error.code ?? "unknown"}`);
    return context.json({ ok: true, status: "subscribed", subscriptionId: result.data?.id ?? null });
  } catch (error) {
    return notificationApiErrorResponse(error);
  }
}
