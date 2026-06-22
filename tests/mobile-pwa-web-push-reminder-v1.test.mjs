import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import manifest from "../app/manifest.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

test("PWA manifest exists with installable Inverge metadata and icons", () => {
  assert.equal(existsSync("app/manifest.ts"), true);
  const data = manifest();

  assert.equal(data.name, "Inverge");
  assert.equal(data.short_name, "Inverge");
  assert.equal(data.start_url, "/app");
  assert.equal(data.scope, "/");
  assert.equal(data.display, "standalone");
  assert.equal(data.lang, "ko");
  assert.ok(data.background_color);
  assert.ok(data.theme_color);
  assert.ok(data.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(data.icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(data.icons.some((icon) => icon.purpose === "maskable"));
});

test("root layout exposes manifest, mobile metadata, viewport, and service worker registration", () => {
  const source = read("app/layout.tsx");

  assert.match(source, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(source, /applicationName:\s*"Inverge"/);
  assert.match(source, /appleWebApp/);
  assert.match(source, /export const viewport/);
  assert.match(source, /themeColor:\s*"#10233f"/);
  assert.match(source, /<ServiceWorkerRegistration \/>/);
});

test("service worker handles push and notificationclick with a strict app route allowlist", () => {
  const source = read("public/sw.js");

  assert.match(source, /addEventListener\("push"/);
  assert.match(source, /showNotification/);
  assert.match(source, /addEventListener\("notificationclick"/);
  assert.match(source, /clients\.openWindow/);
  assert.match(source, /new Set\(\["\/app", "\/app\/review"\]\)/);
  assert.match(source, /ALLOWED_NOTIFICATION_URLS\.has/);
  assert.doesNotMatch(source, /\/instructor|\/admin|http:|https:/);
  assert.doesNotMatch(source, /caches\.open|addEventListener\("fetch"/);
});

test("service worker registration is client-only, graceful, and avoids duplicate registration", () => {
  const source = read("components/pwa/service-worker-registration.tsx");

  assert.match(source, /"use client"/);
  assert.match(source, /"serviceWorker" in navigator/);
  assert.match(source, /getRegistration\("\/sw\.js"\)/);
  assert.match(source, /register\("\/sw\.js"/);
  assert.match(source, /\.catch\(\(\) =>/);
});

test("learner settings links to notification settings without making it a primary workflow", () => {
  const settings = read("app/app/settings/page.tsx");

  assert.match(settings, /\/app\/settings\/notifications\?mode=/);
  assert.doesNotMatch(read("app/app/page.tsx"), /settings\/notifications|data-notification-settings-entry/);
});
