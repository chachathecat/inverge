import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { parseNotificationSettingsInput, parsePushSubscriptionInput } from "../lib/notifications/notification-settings.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

test("migration creates user-owned subscription, preference, and delivery tables with RLS", () => {
  const migration = read("supabase/migrations/20260622_mobile_pwa_web_push_reminder.sql");

  for (const table of ["push_subscriptions", "notification_preferences", "notification_deliveries"]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /endpoint text not null unique/);
  assert.match(migration, /delivery_key text not null unique/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /reminder_days <@ array\[0,1,2,3,4,5,6\]::smallint\[\]/);
  assert.doesNotMatch(migration, /raw_ocr|problem_text|question_text|answer_text|official_answer|formula|casio|score|pass_fail/i);
});

test("subscribe and unsubscribe routes bind rows to the request user, not client-selected userId", () => {
  const routeContext = read("lib/notifications/route-context.ts");
  const subscribe = read("app/api/notifications/subscribe/route.ts");
  const unsubscribe = read("app/api/notifications/unsubscribe/route.ts");

  assert.match(routeContext, /requireRequestUserId\(request\)/);
  assert.match(subscribe, /user_id:\s*context\.userId/);
  assert.doesNotMatch(subscribe, /body\.userId|input\.userId|userId:/);
  assert.match(unsubscribe, /\.eq\("user_id", context\.userId\)/);
  assert.match(unsubscribe, /revoked_at/);
  assert.match(unsubscribe, /enabled:\s*false/);
});

test("subscription parser accepts endpoint/key metadata and rejects malformed subscriptions", () => {
  const parsed = parsePushSubscriptionInput({
    endpoint: "https://push.example.test/abc",
    keys: { p256dh: "public-key", auth: "auth-secret" },
    userAgent: "Browser",
    platform: "Win32",
    userId: "attacker",
  });

  assert.equal(parsed.endpoint, "https://push.example.test/abc");
  assert.equal(parsed.keys.p256dh, "public-key");
  assert.equal(parsed.keys.auth, "auth-secret");
  assert.equal("userId" in parsed, false);
  assert.throws(() => parsePushSubscriptionInput({ endpoint: "http://bad", keys: { p256dh: "x", auth: "y" } }), /endpoint/);
  assert.throws(() => parsePushSubscriptionInput({ endpoint: "https://push.example.test/abc", keys: {} }), /p256dh/);
});

test("settings parser validates timezone, weekday convention, and reminder time", () => {
  assert.deepEqual(parseNotificationSettingsInput({
    enabled: true,
    timezone: "Asia/Seoul",
    reminderDays: [5, 1, 1],
    reminderTime: "08:30:00",
  }), {
    enabled: true,
    timezone: "Asia/Seoul",
    reminderDays: [1, 5],
    reminderTime: "08:30",
  });

  assert.throws(() => parseNotificationSettingsInput({ enabled: true, timezone: "Bad/Zone", reminderDays: [1], reminderTime: "09:00" }), /timezone/);
  assert.throws(() => parseNotificationSettingsInput({ enabled: true, timezone: "Asia/Seoul", reminderDays: [7], reminderTime: "09:00" }), /days/);
  assert.throws(() => parseNotificationSettingsInput({ enabled: true, timezone: "Asia/Seoul", reminderDays: [1], reminderTime: "25:00" }), /time/);
});

test("test notification route handles current user subscriptions, VAPID absence, and expired endpoints safely", () => {
  const source = read("app/api/notifications/test/route.ts");
  const server = read("lib/notifications/web-push-server.ts");
  const result = read("lib/notifications/web-push-result.ts");

  assert.match(source, /getWebPushRuntimeStatus/);
  assert.match(source, /vapid_not_configured/);
  assert.match(source, /failureCategoryCounts/);
  assert.match(source, /sent_persistence_failed/);
  assert.match(source, /expired_persistence_failed/);
  assert.match(source, /subscription_select_failed/);
  assert.match(source, /\.eq\("user_id", context\.userId\)/);
  assert.match(source, /last_test_sent_at/);
  assert.match(source, /updated_at:\s*now/);
  assert.match(source, /enabled:\s*false/);
  assert.match(source, /buildNotificationPayloadCandidate/);
  assert.doesNotMatch(source, /test-\$\{row\.id\}/);
  assert.match(server, /webPush\.setVapidDetails/);
  assert.match(server, /vapid_configuration_error/);
  assert.match(server, /subscription_format_error/);
  assert.match(server, /payload_validation_error/);
  assert.match(`${server}\n${result}`, /push_provider_rejected/);
  assert.match(`${server}\n${result}`, /push_transport_failure/);
  assert.match(result, /statusCode === 404 \|\| statusCode === 410/);
  assert.doesNotMatch(source, /notificationApiErrorResponse/);
  assert.doesNotMatch(`${source}\n${server}`, /console\.(log|warn|error|info)/);
  assert.doesNotMatch(source, /problemText|answerText|officialAnswer|scorePrediction|passFail/i);
  const responseBlocks = [...source.matchAll(/(?:context|NextResponse)\.json\(\s*\{([\s\S]*?)\}/g)].map((match) => match[1]).join("\n");
  assert.doesNotMatch(responseBlocks, /endpoint|p256dh|\bauth\b|userId|email|private|provider.*body|stack/i);
});
