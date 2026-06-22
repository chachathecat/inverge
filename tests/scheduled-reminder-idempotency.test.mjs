import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildNotificationDeliveryKey,
  buildNotificationPlan,
  resolveLocalReminderWindow,
} from "../lib/notifications/notification-plan.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

test("notification planner prioritizes review, then calculator recovery, then Today Plan", () => {
  const review = buildNotificationPlan({
    userId: "user-1",
    notificationId: "n1",
    reviewQueueItems: [{ id: "review-1", status: "pending" }],
    calculatorSignals: [{ id: "calc-1", sourceType: "calculator-routine", derivedTags: ["calculator_recovery"] }],
    hasTodayPlanSignal: true,
  });
  assert.equal(review?.type, "review");
  assert.equal(review?.payload.url, "/app/review");

  const calculator = buildNotificationPlan({
    userId: "user-1",
    notificationId: "n2",
    reviewQueueItems: [],
    calculatorSignals: [{ id: "calc-1", sourceType: "calculator-routine", derivedTags: ["calculator_recovery"] }],
    hasTodayPlanSignal: true,
  });
  assert.equal(calculator?.type, "calculator_recovery");
  assert.equal(calculator?.payload.url, "/app");

  const today = buildNotificationPlan({
    userId: "user-1",
    notificationId: "n3",
    reviewQueueItems: [],
    calculatorSignals: [],
    hasTodayPlanSignal: true,
  });
  assert.equal(today?.type, "today");
});

test("notification planner rejects raw-data fields and returns null when no useful action exists", () => {
  assert.equal(buildNotificationPlan({
    userId: "user-1",
    notificationId: "n1",
    reviewQueueItems: [],
    calculatorSignals: [],
    hasTodayPlanSignal: false,
  }), null);

  assert.throws(
    () => buildNotificationPlan({
      userId: "user-1",
      notificationId: "n1",
      reviewQueueItems: [{ id: "review-1", status: "pending", problemText: "raw" }],
    }),
    /notification-plan-raw-field-rejected/,
  );
});

test("local reminder window respects timezone, days, time, and an execution window", () => {
  const now = new Date("2026-06-22T00:05:00.000Z"); // 09:05 Monday in Asia/Seoul.
  const due = resolveLocalReminderWindow({
    enabled: true,
    timezone: "Asia/Seoul",
    reminderDays: [1],
    reminderTime: "09:00",
  }, now, 15);

  assert.equal(due.due, true);
  assert.equal(due.localDate, "2026-06-22");
  assert.equal(due.localDay, 1);

  assert.equal(resolveLocalReminderWindow({
    enabled: true,
    timezone: "Asia/Seoul",
    reminderDays: [2],
    reminderTime: "09:00",
  }, now, 15).due, false);
  assert.equal(resolveLocalReminderWindow({
    enabled: false,
    timezone: "Asia/Seoul",
    reminderDays: [1],
    reminderTime: "09:00",
  }, now, 15).due, false);
});

test("delivery key is stable for duplicate cron execution and unique per subscription/type/day", () => {
  const base = {
    userId: "user-1",
    subscriptionId: "sub-1",
    type: "review",
    localDate: "2026-06-22",
    reminderTime: "09:00:00",
  };
  assert.equal(buildNotificationDeliveryKey(base), buildNotificationDeliveryKey(base));
  assert.notEqual(buildNotificationDeliveryKey(base), buildNotificationDeliveryKey({ ...base, subscriptionId: "sub-2" }));
  assert.notEqual(buildNotificationDeliveryKey(base), buildNotificationDeliveryKey({ ...base, type: "today" }));
});

test("cron route is protected, safe on missing env, dedupes before send, and returns aggregate counts only", () => {
  const source = read("app/api/cron/notifications/route.ts");

  assert.match(source, /Authorization|authorization|Bearer/);
  assert.match(source, /CRON_SECRET/);
  assert.match(source, /status:\s*"push_env_missing"/);
  assert.match(source, /status:\s*"admin_env_missing"/);
  assert.match(source, /delivery_key/);
  assert.match(source, /23505/);
  assert.match(source, /sendWebPushPayload/);
  assert.match(source, /sent,\s*\n\s*duplicate,\s*\n\s*failed,\s*\n\s*expired,\s*\n\s*skipped/);
  const responseBlocks = [...source.matchAll(/NextResponse\.json\(\{([\s\S]*?)\}\)/g)].map((match) => match[1]).join("\n");
  assert.doesNotMatch(responseBlocks, /endpoint|p256dh|auth_key|subscription_auth|raw|problem|answer|formula|score|secret/i);
});
