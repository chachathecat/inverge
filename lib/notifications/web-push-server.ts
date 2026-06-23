import "server-only";

import webPush from "web-push";
import type { PushSubscription } from "web-push";

import { validateNotificationPayload, type NotificationPayload } from "./push-payload";

export type WebPushRuntimeStatus =
  | { configured: true; publicKey: string }
  | { configured: false; missing: Array<"NEXT_PUBLIC_VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "VAPID_SUBJECT"> };

export type WebPushSendResult =
  | { ok: true; status: "sent" }
  | { ok: false; status: "missing_config" | "expired" | "failed"; statusCode?: number };

export function getWebPushRuntimeStatus(env: NodeJS.ProcessEnv = process.env): WebPushRuntimeStatus {
  const missing: Array<"NEXT_PUBLIC_VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "VAPID_SUBJECT"> = [];
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  if (!env.VAPID_PRIVATE_KEY) missing.push("VAPID_PRIVATE_KEY");
  if (!env.VAPID_SUBJECT) missing.push("VAPID_SUBJECT");
  if (missing.length > 0) return { configured: false, missing };
  return { configured: true, publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! };
}

export function getVapidPublicKey(env: NodeJS.ProcessEnv = process.env) {
  return env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

function configureWebPush(env: NodeJS.ProcessEnv) {
  const status = getWebPushRuntimeStatus(env);
  if (!status.configured) return false;
  webPush.setVapidDetails(env.VAPID_SUBJECT!, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return true;
}

export function toWebPushSubscription(input: { endpoint: string; p256dh: string; auth: string }): PushSubscription {
  return {
    endpoint: input.endpoint,
    keys: {
      p256dh: input.p256dh,
      auth: input.auth,
    },
  };
}

function statusCodeOf(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode);
    return Number.isFinite(statusCode) ? statusCode : undefined;
  }
  return undefined;
}

export async function sendWebPushPayload(
  subscription: PushSubscription,
  payloadInput: NotificationPayload,
  env: NodeJS.ProcessEnv = process.env,
): Promise<WebPushSendResult> {
  const payload = validateNotificationPayload(payloadInput);
  if (!configureWebPush(env)) return { ok: false, status: "missing_config" };

  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, status: "sent" };
  } catch (error) {
    const statusCode = statusCodeOf(error);
    if (statusCode === 404 || statusCode === 410) {
      return { ok: false, status: "expired", statusCode };
    }
    return { ok: false, status: "failed", statusCode };
  }
}
