export const WEB_PUSH_FAILURE_CATEGORIES = [
  "vapid_configuration_error",
  "subscription_format_error",
  "push_provider_rejected",
  "push_transport_failure",
  "payload_validation_error",
  "sent_persistence_failed",
  "expired_persistence_failed",
] as const;

export type WebPushFailureCategory = (typeof WEB_PUSH_FAILURE_CATEGORIES)[number];
export type WebPushSendFailureStatus = "missing_config" | "expired" | WebPushFailureCategory;

export type WebPushSendResult =
  | { ok: true; status: "sent" }
  | {
      ok: false;
      status: WebPushSendFailureStatus;
      retryable: boolean;
      statusCode?: number;
      statusCodeClass?: "4xx" | "5xx";
    };

export type WebPushFailureCategoryCounts = Record<WebPushFailureCategory, number>;

export type WebPushSubscriptionShape = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type TestSendAggregateInput = {
  sent: number;
  expired: number;
  failed: number;
  failureCategoryCounts: WebPushFailureCategoryCounts;
};

export type WebPushTestSendStatus =
  | "sent"
  | "partial_failure"
  | "expired"
  | "all_sends_failed"
  | "vapid_configuration_error"
  | "sent_persistence_failed"
  | "expired_persistence_failed";

export function createWebPushFailureCategoryCounts(): WebPushFailureCategoryCounts {
  return Object.fromEntries(WEB_PUSH_FAILURE_CATEGORIES.map((category) => [category, 0])) as WebPushFailureCategoryCounts;
}

export function isWebPushFailureCategory(status: WebPushSendFailureStatus): status is WebPushFailureCategory {
  return (WEB_PUSH_FAILURE_CATEGORIES as readonly string[]).includes(status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeSubscriptionText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= maxLength;
}

export function validateWebPushSubscriptionShape(input: unknown): WebPushSubscriptionShape | null {
  if (!isRecord(input) || !isRecord(input.keys)) return null;
  if (!isSafeSubscriptionText(input.endpoint, 2048) || !/^https:\/\//i.test(input.endpoint)) return null;
  if (!isSafeSubscriptionText(input.keys.p256dh, 512)) return null;
  if (!isSafeSubscriptionText(input.keys.auth, 256)) return null;
  return input as WebPushSubscriptionShape;
}

export function statusCodeOfWebPushError(error: unknown) {
  if (!isRecord(error) || !("statusCode" in error)) return undefined;
  const statusCode = Number(error.statusCode);
  return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : undefined;
}

export function classifyWebPushProviderError(error: unknown): WebPushSendResult {
  const statusCode = statusCodeOfWebPushError(error);
  if (statusCode === 404 || statusCode === 410) {
    return { ok: false, status: "expired", statusCode, statusCodeClass: "4xx", retryable: false };
  }
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return { ok: false, status: "push_provider_rejected", statusCode, statusCodeClass: "4xx", retryable: false };
  }
  if (statusCode && statusCode >= 500) {
    return { ok: false, status: "push_transport_failure", statusCode, statusCodeClass: "5xx", retryable: true };
  }
  return { ok: false, status: "push_transport_failure", retryable: true };
}

export function resolveWebPushTestSendStatus(input: TestSendAggregateInput): {
  ok: boolean;
  status: WebPushTestSendStatus;
  httpStatus: number;
} {
  if (input.failureCategoryCounts.sent_persistence_failed > 0) {
    return { ok: false, status: "sent_persistence_failed", httpStatus: input.sent > 0 ? 200 : 502 };
  }
  if (input.failureCategoryCounts.expired_persistence_failed > 0) {
    return { ok: false, status: "expired_persistence_failed", httpStatus: input.sent > 0 ? 200 : 502 };
  }
  if (input.sent > 0 && input.failed > 0) {
    return { ok: true, status: "partial_failure", httpStatus: 200 };
  }
  if (input.sent > 0) {
    return { ok: true, status: "sent", httpStatus: 200 };
  }
  if (input.expired > 0 && input.failed === 0) {
    return { ok: false, status: "expired", httpStatus: 410 };
  }
  if (input.failureCategoryCounts.vapid_configuration_error > 0) {
    return { ok: false, status: "vapid_configuration_error", httpStatus: 503 };
  }
  return { ok: false, status: "all_sends_failed", httpStatus: 502 };
}
