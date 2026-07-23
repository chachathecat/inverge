import { NextResponse } from "next/server";

import { isRouteResponse, getNotificationRouteContext } from "@/lib/notifications/route-context";
import { buildNotificationPayloadCandidate } from "@/lib/notifications/push-payload";
import { getWebPushRuntimeStatus, sendWebPushPayload, toWebPushSubscription } from "@/lib/notifications/web-push-server";
import {
  createWebPushFailureCategoryCounts,
  isWebPushFailureCategory,
  resolveWebPushTestSendStatus,
} from "@/lib/notifications/web-push-result";

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
    if (subscriptionsResult.error) {
      return context.json({ ok: false, status: "subscription_select_failed" }, { status: 500 });
    }

    const rows = (subscriptionsResult.data ?? []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>;
    if (rows.length === 0) return context.json({ ok: false, status: "no_active_subscription" }, { status: 400 });

    const batchId = Date.now();
    let sent = 0;
    let expired = 0;
    let failed = 0;
    const failureCategoryCounts = createWebPushFailureCategoryCounts();
    for (const [index, row] of rows.entries()) {
      const result = await sendWebPushPayload(
        toWebPushSubscription(row),
        buildNotificationPayloadCandidate("test", `test-${batchId}-${index}`),
      );
      const now = new Date().toISOString();
      if (result.ok) {
        sent += 1;
        const updateResult = await context.client
          .from("push_subscriptions")
          .update({ last_test_sent_at: now, updated_at: now })
          .eq("user_id", context.userId)
          .eq("id", row.id)
          .select("id")
          .maybeSingle();
        if (updateResult.error || !updateResult.data?.id) {
          failed += 1;
          failureCategoryCounts.sent_persistence_failed += 1;
        }
      } else if (result.status === "expired") {
        expired += 1;
        const revokeResult = await context.client
          .from("push_subscriptions")
          .update({ enabled: false, revoked_at: now, updated_at: now })
          .eq("user_id", context.userId)
          .eq("id", row.id)
          .select("id")
          .maybeSingle();
        if (revokeResult.error || !revokeResult.data?.id) {
          failed += 1;
          failureCategoryCounts.expired_persistence_failed += 1;
        }
      } else {
        failed += 1;
        if (isWebPushFailureCategory(result.status)) {
          failureCategoryCounts[result.status] += 1;
        }
      }
    }

    const responseStatus = resolveWebPushTestSendStatus({ sent, expired, failed, failureCategoryCounts });
    return context.json(
      {
        ok: responseStatus.ok,
        status: responseStatus.status,
        sent,
        expired,
        failed,
        failureCategoryCounts,
      },
      { status: responseStatus.httpStatus },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "auth-required") {
      return NextResponse.json({ ok: false, status: "auth_required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, status: "notification_test_unexpected_error" }, { status: 500 });
  }
}
