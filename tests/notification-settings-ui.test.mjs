import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  resolveNotificationStatusCopy,
  resolveSubscribeCompletionState,
} from "../lib/notifications/subscription-ui-state.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

test("notification settings route and client component exist", () => {
  assert.equal(existsSync("app/app/settings/notifications/page.tsx"), true);
  assert.equal(existsSync("components/notifications/notification-settings-client.tsx"), true);
});

test("settings UI covers loading, unsupported, permission, subscription, save, test, and unsubscribe states", () => {
  const source = `${read("components/notifications/notification-settings-client.tsx")}\n${read("lib/notifications/subscription-ui-state.ts")}`;
  const requiredSnippets = [
    "loading",
    "service-worker-unsupported",
    "push-unsupported",
    "notification-unsupported",
    "ios-not-standalone",
    "permission === \"denied\"",
    "subscribed",
    "unsubscribed",
    "subscribe-error",
    "subscription_saved_schedule_failed",
    "local-only",
    "vapid_not_configured",
    "save-error",
    "test-error",
    "알림 허용하고 구독",
    "일정 저장 다시 시도",
    "테스트 알림 보내기",
    "구독 해제",
  ];

  for (const snippet of requiredSnippets) assert.ok(source.includes(snippet), snippet);
});

test("permission prompt only happens inside explicit subscribe action", () => {
  const source = read("components/notifications/notification-settings-client.tsx");
  const subscribeStart = source.indexOf("async function subscribe()");
  const permissionCall = source.indexOf("Notification.requestPermission()");
  const firstEffect = source.indexOf("useEffect(() =>");

  assert.ok(subscribeStart > 0);
  assert.ok(permissionCall > subscribeStart);
  assert.ok(firstEffect > 0);
  assert.notEqual(permissionCall < subscribeStart && permissionCall > firstEffect, true);
});

test("iPhone Home Screen and metadata-only notification copy are learner-facing", () => {
  const source = read("components/notifications/notification-settings-client.tsx");
  const stateSource = read("lib/notifications/subscription-ui-state.ts");
  const page = read("app/app/settings/notifications/page.tsx");
  const combined = `${source}\n${stateSource}\n${page}`;

  assert.match(combined, /iPhone은 홈 화면에 추가한 앱에서만 알림을 받을 수 있습니다/);
  assert.match(combined, /알림은 사용자가 허용한 경우에만 전송합니다/);
  assert.match(combined, /알림에는 문제·답안·계산 내용이 포함되지 않습니다/);
  assert.match(combined, /브라우저 설정에서 다시 허용/);
  assert.doesNotMatch(combined, /공식\s*채점|모범\s*답안|점수\s*예측|합격\s*예측|pass\/fail|native app/i);
});

test("UI has compact mobile-friendly controls without adding a dashboard", () => {
  const source = read("components/notifications/notification-settings-client.tsx");

  assert.match(source, /type="checkbox"/);
  assert.match(source, /type="time"/);
  assert.match(source, /reminderDays/);
  assert.match(source, /timezone/);
  assert.match(source, /sm:flex-row|sm:grid-cols-2/);
  assert.doesNotMatch(source, /dashboard|billing|checkout|pricing|instructor/i);
});

test("subscription state resolves success, partial schedule failure, and subscribe failure distinctly", () => {
  assert.deepEqual(resolveSubscribeCompletionState({
    subscriptionSaved: true,
    preferenceSaved: true,
  }), {
    status: "subscribed",
    activeSubscriptionCount: 1,
    scheduleSaved: true,
  });

  assert.deepEqual(resolveSubscribeCompletionState({
    subscriptionSaved: true,
    preferenceSaved: false,
  }), {
    status: "subscription_saved_schedule_failed",
    activeSubscriptionCount: 1,
    scheduleSaved: false,
  });

  assert.deepEqual(resolveSubscribeCompletionState({
    subscriptionSaved: false,
    preferenceSaved: false,
  }), {
    status: "subscribe-error",
    activeSubscriptionCount: 0,
    scheduleSaved: false,
  });
});

test("subscription save failure takes priority over subscribed copy", () => {
  const copy = resolveNotificationStatusCopy({
    status: "subscription_saved_schedule_failed",
    support: "supported",
    permission: "granted",
    vapidConfigured: true,
    activeSubscriptionCount: 1,
    settingsEnabled: true,
  });

  assert.match(copy, /일정 저장에 실패/);
  assert.match(copy, /예약 알림은 아직 활성화되지 않았습니다/);
  assert.doesNotMatch(copy, /일정 설정이 저장/);

  const saveErrorCopy = resolveNotificationStatusCopy({
    status: "save-error",
    support: "supported",
    permission: "granted",
    vapidConfigured: true,
    activeSubscriptionCount: 1,
    settingsEnabled: true,
  });
  assert.match(saveErrorCopy, /알림 설정을 저장하지 못했습니다/);
  assert.doesNotMatch(saveErrorCopy, /일정 설정이 저장/);
});

test("subscribe flow checks preference-save result and exposes retry after partial failure", () => {
  const source = read("components/notifications/notification-settings-client.tsx");

  assert.match(source, /const settingsSaved = await saveSettings\(nextSettings,/);
  assert.match(source, /failureStatus:\s*"subscription_saved_schedule_failed"/);
  assert.match(source, /resolveSubscribeCompletionState\(\{\s*subscriptionSaved:\s*true,\s*preferenceSaved:\s*settingsSaved/s);
  assert.match(source, /async function retryScheduleSave\(\)/);
  assert.match(source, /일정 저장 다시 시도/);
  assert.match(source, /createdSubscription\?\.unsubscribe\(\)\.catch/);
});
