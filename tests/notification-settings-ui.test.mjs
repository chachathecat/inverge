import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

test("notification settings route and client component exist", () => {
  assert.equal(existsSync("app/app/settings/notifications/page.tsx"), true);
  assert.equal(existsSync("components/notifications/notification-settings-client.tsx"), true);
});

test("settings UI covers loading, unsupported, permission, subscription, save, test, and unsubscribe states", () => {
  const source = read("components/notifications/notification-settings-client.tsx");
  const requiredSnippets = [
    "loading",
    "service-worker-unsupported",
    "push-unsupported",
    "notification-unsupported",
    "ios-not-standalone",
    "permission === \"denied\"",
    "subscribed",
    "unsubscribed",
    "local-only",
    "vapid_not_configured",
    "save-error",
    "test-error",
    "알림 허용하고 구독",
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
  const page = read("app/app/settings/notifications/page.tsx");
  const combined = `${source}\n${page}`;

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
