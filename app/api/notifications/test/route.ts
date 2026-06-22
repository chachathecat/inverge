import { isRouteResponse, getNotificationRouteContext, notificationApiErrorResponse } from "@/lib/notifications/route-context";
import { buildNotificationPayload } from "@/lib/notifications/push-payload";
import { getWebPushRuntimeStatus, sendWebPushPayload, toWebPushSubscription } from "@/lib/notifications/web-push-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const context = await getNotificationRouteContext(request);
    if (isRouteResponse(context)) return context;
    const runtime = getWebPushRuntimeStatus();
    if (!runtime.configured) {
      return context.json({ ok: false, status: "vapid_not_configured" }, { status: 503 });
    }

    const subscriptionsResult = await context.client
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", context.userId)
      .eq("enabled", true)
      .is("revoked_at", null)
      .limit(5);
    if (subscriptionsResult.error) throw new Error(`notification-test-select-failed:${subscriptionsResult.error.code ?? "unknown"}`);

    const rows = (subscriptionsResult.data ?? []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;
    if (rows.length === 0) return context.json({ ok: false, status: "no_active_subscription" }, { status: 400 });

    const now = new Date().toISOString();
    let sent = 0;
    let expired = 0;
    let failed = 0;
    for (const row of rows) {
      const result = await sendWebPushPayload(
        toWebPushSubscription(row),
        buildNotificationPayload("test", `test-${row.id}-${Date.now()}`),
      );
      if (result.ok) {
        sent += 1;
        await context.client.from("push_subscriptions").update({ last_test_sent_at: now, updated_at: now }).eq("user_id", context.userId).eq("id", row.id);
      } else if (result.status === "expired") {
        expired += 1;
        await context.client.from("push_subscriptions").update({ enabled: false, revoked_at: now, updated_at: now }).eq("user_id", context.userId).eq("id", row.id);
      } else {
        failed += 1;
      }
    }

    return context.json({ ok: sent > 0, sent, expired, failed });
  } catch (error) {
    return notificationApiErrorResponse(error);
  }
}
