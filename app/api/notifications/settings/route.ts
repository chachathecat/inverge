import { NextResponse } from "next/server";

import { isRouteResponse, getNotificationRouteContext, notificationApiErrorResponse } from "@/lib/notifications/route-context";
import { getVapidPublicKey, getWebPushRuntimeStatus } from "@/lib/notifications/web-push-server";
import { DEFAULT_NOTIFICATION_SETTINGS, parseNotificationSettingsInput, toNotificationSettings } from "@/lib/notifications/notification-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const context = await getNotificationRouteContext(request);
    if (isRouteResponse(context)) return context;

    const [preferencesResult, subscriptionsResult] = await Promise.all([
      context.client
        .from("notification_preferences")
        .select("enabled, timezone, reminder_days, reminder_time")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.client
        .from("push_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("enabled", true)
        .is("revoked_at", null),
    ]);
    if (preferencesResult.error) throw new Error(`notification-settings-select-failed:${preferencesResult.error.code ?? "unknown"}`);
    if (subscriptionsResult.error) throw new Error(`notification-subscription-count-failed:${subscriptionsResult.error.code ?? "unknown"}`);

    const runtime = getWebPushRuntimeStatus();
    return context.json({
      ok: true,
      settings: preferencesResult.data ? toNotificationSettings(preferencesResult.data as Record<string, unknown>) : DEFAULT_NOTIFICATION_SETTINGS,
      activeSubscriptionCount: subscriptionsResult.count ?? 0,
      vapidPublicKey: getVapidPublicKey(),
      vapidPublicKeyConfigured: runtime.configured,
    });
  } catch (error) {
    return notificationApiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getNotificationRouteContext(request);
    if (isRouteResponse(context)) return context;
    const input = parseNotificationSettingsInput(await request.json().catch(() => null));
    const now = new Date().toISOString();
    const result = await context.client.from("notification_preferences").upsert({
      user_id: context.userId,
      enabled: input.enabled,
      timezone: input.timezone,
      reminder_days: input.reminderDays,
      reminder_time: input.reminderTime,
      updated_at: now,
    });
    if (result.error) throw new Error(`notification-settings-upsert-failed:${result.error.code ?? "unknown"}`);
    return context.json({ ok: true, settings: input });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ ok: false, message: "notification-settings-invalid-json" }, { status: 400 });
    return notificationApiErrorResponse(error);
  }
}
