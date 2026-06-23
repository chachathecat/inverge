import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildNotificationDeliveryKey, buildNotificationPlan, resolveLocalReminderWindow } from "@/lib/notifications/notification-plan";
import { getWebPushRuntimeStatus, sendWebPushPayload, toWebPushSubscription } from "@/lib/notifications/web-push-server";

export const dynamic = "force-dynamic";

type PreferenceRow = {
  user_id: string;
  enabled: boolean;
  timezone: string;
  reminder_days: number[];
  reminder_time: string;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] ?? null;
}

function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && bearerToken(request) === secret);
}

async function buildPlanForUser(client: SupabaseClient, userId: string, notificationId: string) {
  const [queueResult, signalResult, itemResult] = await Promise.all([
    client
      .from("review_queue_items")
      .select("id, status")
      .eq("user_id", userId)
      .eq("exam_id", "wrong_answer_os")
      .eq("stage", "alpha")
      .eq("status", "pending")
      .limit(3),
    client
      .from("learning_signal_events")
      .select("id, source_type, derived_tags, metadata_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("wrong_answer_items")
      .select("id")
      .eq("user_id", userId)
      .limit(1),
  ]);
  if (queueResult.error || signalResult.error || itemResult.error) return null;

  const reviewQueueItems = ((queueResult.data ?? []) as Array<{ id?: string; status?: string | null }>).map((item) => ({
    id: item.id,
    status: item.status,
  }));
  const calculatorSignals = ((signalResult.data ?? []) as Array<{
    id?: string;
    source_type?: string | null;
    derived_tags?: string[] | null;
    metadata_json?: Record<string, unknown> | null;
  }>).map((event) => ({
    id: event.id,
    sourceType: event.source_type,
    derivedTags: event.derived_tags,
    metadataJson: event.metadata_json,
  }));

  return buildNotificationPlan({
    userId,
    reviewQueueItems,
    calculatorSignals,
    hasTodayPlanSignal: reviewQueueItems.length > 0 || calculatorSignals.length > 0 || ((itemResult.data ?? []) as unknown[]).length > 0,
    notificationId,
  });
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  const runtime = getWebPushRuntimeStatus();
  if (!runtime.configured) {
    return NextResponse.json({
      ok: true,
      status: "push_env_missing",
      scannedPreferences: 0,
      duePreferences: 0,
      sent: 0,
      duplicate: 0,
      failed: 0,
      expired: 0,
      skipped: 0,
    });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({
      ok: true,
      status: "admin_env_missing",
      scannedPreferences: 0,
      duePreferences: 0,
      sent: 0,
      duplicate: 0,
      failed: 0,
      expired: 0,
      skipped: 0,
    });
  }

  const now = new Date();
  const preferencesResult = await admin
    .from("notification_preferences")
    .select("user_id, enabled, timezone, reminder_days, reminder_time")
    .eq("enabled", true)
    .limit(1000);
  if (preferencesResult.error) {
    return NextResponse.json({ ok: false, message: "notification-cron-preference-select-failed" }, { status: 500 });
  }

  const preferences = (preferencesResult.data ?? []) as PreferenceRow[];
  const duePreferences = preferences
    .map((preference) => ({
      preference,
      window: resolveLocalReminderWindow({
        enabled: preference.enabled,
        timezone: preference.timezone,
        reminderDays: preference.reminder_days,
        reminderTime: preference.reminder_time,
      }, now),
    }))
    .filter((entry) => entry.window.due);

  if (duePreferences.length === 0) {
    return NextResponse.json({
      ok: true,
      status: "no_due_preferences",
      scannedPreferences: preferences.length,
      duePreferences: 0,
      sent: 0,
      duplicate: 0,
      failed: 0,
      expired: 0,
      skipped: 0,
    });
  }

  const userIds = [...new Set(duePreferences.map((entry) => entry.preference.user_id))];
  const subscriptionResult = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds)
    .eq("enabled", true)
    .is("revoked_at", null);
  if (subscriptionResult.error) {
    return NextResponse.json({ ok: false, message: "notification-cron-subscription-select-failed" }, { status: 500 });
  }

  const subscriptionsByUser = new Map<string, SubscriptionRow[]>();
  for (const row of (subscriptionResult.data ?? []) as SubscriptionRow[]) {
    const rows = subscriptionsByUser.get(row.user_id) ?? [];
    rows.push(row);
    subscriptionsByUser.set(row.user_id, rows);
  }

  let sent = 0;
  let duplicate = 0;
  let failed = 0;
  let expired = 0;
  let skipped = 0;

  for (const { preference, window } of duePreferences) {
    const subscriptions = subscriptionsByUser.get(preference.user_id) ?? [];
    if (subscriptions.length === 0) {
      skipped += 1;
      continue;
    }

    const plan = await buildPlanForUser(admin, preference.user_id, `cron-${preference.user_id}-${window.localDate}`);
    if (!plan) {
      skipped += subscriptions.length;
      continue;
    }

    for (const subscription of subscriptions) {
      const deliveryKey = buildNotificationDeliveryKey({
        userId: preference.user_id,
        subscriptionId: subscription.id,
        type: plan.type,
        localDate: window.localDate,
        reminderTime: preference.reminder_time,
      });
      const inserted = await admin.from("notification_deliveries").insert({
        user_id: preference.user_id,
        subscription_id: subscription.id,
        delivery_key: deliveryKey,
        notification_type: plan.type,
        status: "pending",
      }).select("id").maybeSingle();
      if (inserted.error?.code === "23505") {
        duplicate += 1;
        continue;
      }
      if (inserted.error || !inserted.data?.id) {
        failed += 1;
        continue;
      }

      const result = await sendWebPushPayload(toWebPushSubscription(subscription), {
        ...plan.payload,
        notificationId: String(inserted.data.id),
      });
      const timestamp = new Date().toISOString();
      if (result.ok) {
        sent += 1;
        await Promise.all([
          admin.from("notification_deliveries").update({ status: "sent", sent_at: timestamp }).eq("id", inserted.data.id),
          admin.from("push_subscriptions").update({ last_sent_at: timestamp, updated_at: timestamp }).eq("id", subscription.id),
        ]);
      } else if (result.status === "expired") {
        expired += 1;
        await Promise.all([
          admin.from("notification_deliveries").update({ status: "expired" }).eq("id", inserted.data.id),
          admin.from("push_subscriptions").update({ enabled: false, revoked_at: timestamp, updated_at: timestamp }).eq("id", subscription.id),
        ]);
      } else {
        failed += 1;
        await admin.from("notification_deliveries").update({ status: "failed" }).eq("id", inserted.data.id);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    status: "processed",
    scannedPreferences: preferences.length,
    duePreferences: duePreferences.length,
    sent,
    duplicate,
    failed,
    expired,
    skipped,
  });
}
