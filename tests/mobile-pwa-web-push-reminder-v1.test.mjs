import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import manifest from "../app/manifest.ts";

function read(path) {
  return readFileSync(path, "utf8");
}

function pngDimensions(path) {
  const buffer = readFileSync(path);
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

test("PWA manifest exists with installable Dabangil metadata and icons", () => {
  assert.equal(existsSync("app/manifest.ts"), true);
  const data = manifest();

  assert.equal(data.name, "답안길");
  assert.equal(data.short_name, "답안길");
  assert.match(data.description ?? "", /감정평가사 2차 답안/);
  assert.equal(data.start_url, "/app/capture?mode=second");
  assert.equal(data.scope, "/");
  assert.equal(data.display, "standalone");
  assert.equal(data.lang, "ko");
  assert.ok(data.background_color);
  assert.ok(data.theme_color);
  assert.ok(data.icons.some((icon) => icon.src === "/icons/inverge-icon-192.png" && icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(data.icons.some((icon) => icon.src === "/icons/inverge-icon-512.png" && icon.sizes === "512x512" && icon.type === "image/png"));
  assert.ok(data.icons.some((icon) => icon.src === "/icons/inverge-maskable-512.png" && icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable"));
  assert.ok(data.icons.some((icon) => icon.type === "image/svg+xml"));
});

test("root layout exposes manifest, mobile metadata, viewport, and service worker registration", () => {
  const source = read("app/layout.tsx");

  assert.match(source, /manifest:\s*"\/manifest\.webmanifest"/);
  assert.match(source, /applicationName:\s*"답안길"/);
  assert.match(source, /title:\s*"답안길 \| 감정평가사 2차 답안 훈련 OS"/);
  assert.match(source, /appleWebApp/);
  assert.match(source, /title:\s*"답안길"/);
  assert.match(source, /apple:\s*\[\{\s*url:\s*"\/icons\/inverge-apple-touch-180\.png",\s*sizes:\s*"180x180",\s*type:\s*"image\/png"/);
  assert.match(source, /export const viewport/);
  assert.match(source, /themeColor:\s*"#10233f"/);
  assert.match(source, /<ServiceWorkerRegistration \/>/);
});

test("PWA PNG icon fallbacks exist with expected dimensions", () => {
  assert.deepEqual(pngDimensions("public/icons/inverge-apple-touch-180.png"), { width: 180, height: 180 });
  assert.deepEqual(pngDimensions("public/icons/inverge-icon-192.png"), { width: 192, height: 192 });
  assert.deepEqual(pngDimensions("public/icons/inverge-icon-512.png"), { width: 512, height: 512 });
  assert.deepEqual(pngDimensions("public/icons/inverge-maskable-512.png"), { width: 512, height: 512 });
});

test("environment example documents placeholder-only Web Push setup", () => {
  const source = read(".env.example");
  const requiredBlankKeys = [
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
    "CRON_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const key of requiredBlankKeys) {
    assert.match(source, new RegExp(`^${key}=$`, "m"), key);
  }
  assert.match(source, /matching pair/);
  assert.match(source, /server-only/);
  assert.match(source, /Changing VAPID keys invalidates/);
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
