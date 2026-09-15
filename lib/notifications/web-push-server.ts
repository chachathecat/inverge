import "server-only";

import webPush from "web-push";
import type { PushSubscription } from "web-push";

import { validateNotificationPayload, type NotificationPayload } from "./push-payload";
import {
  classifyWebPushProviderError,
  validateWebPushSubscriptionShape,
  type WebPushSendResult,
} from "./web-push-result";

export type WebPushRuntimeStatus =
  | { configured: true; publicKey: string }
  | { configured: false; missing: Array<"NEXT_PUBLIC_VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "VAPID_SUBJECT"> };

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

function configureWebPush(env: NodeJS.ProcessEnv): WebPushSendResult | null {
  const status = getWebPushRuntimeStatus(env);
  if (!status.configured) return { ok: false, status: "missing_config", retryable: false };
  try {
    webPush.setVapidDetails(env.VAPID_SUBJECT!, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    return null;
  } catch {
    return { ok: false, status: "vapid_configuration_error", retryable: false };
  }
}

export function toWebPushSubscription(input: { endpoint: unknown; p256dh: unknown; auth: unknown }): PushSubscription {
  return {
    endpoint: typeof input.endpoint === "string" ? input.endpoint : "",
    keys: {
      p256dh: typeof input.p256dh === "string" ? input.p256dh : "",
      auth: typeof input.auth === "string" ? input.auth : "",
    },
  };
}

type WebPushNotificationSender = (subscription: PushSubscription, payload: string) => Promise<unknown>;

export async function sendWebPushPayload(
  subscription: PushSubscription,
  payloadInput: unknown,
  env: NodeJS.ProcessEnv = process.env,
  sendNotification: WebPushNotificationSender = webPush.sendNotification,
): Promise<WebPushSendResult> {
  const configurationError = configureWebPush(env);
  if (configurationError) return configurationError;

  const safeSubscription = validateWebPushSubscriptionShape(subscription);
  if (!safeSubscription) return { ok: false, status: "subscription_format_error", retryable: false };

  let payload: NotificationPayload;
  try {
    payload = validateNotificationPayload(payloadInput);
  } catch {
    return { ok: false, status: "payload_validation_error", retryable: false };
  }

  try {
    await sendNotification(safeSubscription, JSON.stringify(payload));
    return { ok: true, status: "sent" };
  } catch (error) {
    return classifyWebPushProviderError(error);
  }
}
