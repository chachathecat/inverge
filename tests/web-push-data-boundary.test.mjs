import test from "node:test";
import assert from "node:assert/strict";

import {
  NOTIFICATION_ALLOWED_KEYS,
  buildNotificationPayload,
  buildNotificationPayloadCandidate,
  sanitizeNotificationClickUrl,
  validateNotificationPayload,
} from "../lib/notifications/push-payload.ts";
import {
  classifyWebPushProviderError,
  createWebPushFailureCategoryCounts,
  resolveWebPushTestSendStatus,
  validateWebPushSubscriptionShape,
} from "../lib/notifications/web-push-result.ts";

test("notification payload uses an exact metadata-only key allowlist", () => {
  const payload = buildNotificationPayload("review", "notification-1");

  assert.deepEqual(Object.keys(payload).sort(), [...NOTIFICATION_ALLOWED_KEYS].sort());
  assert.equal(payload.type, "review");
  assert.equal(payload.url, "/app/review");
  assert.equal(payload.title.includes("Inverge") || payload.body.includes("Inverge"), true);
});

test("notification payload rejects raw learner and official-answer fields", () => {
  const forbiddenFields = [
    "rawOcrText",
    "problemText",
    "questionText",
    "answerText",
    "officialAnswer",
    "modelAnswer",
    "formula",
    "numbers",
    "units",
    "casioKeystrokes",
    "displayValue",
    "expectedAnswer",
    "verificationMemo",
    "mistakeMemo",
    "score",
    "passFailPrediction",
    "instructorComment",
  ];

  for (const key of forbiddenFields) {
    assert.throws(
      () => validateNotificationPayload({
        type: "today",
        title: "오늘 할 일이 준비되어 있습니다",
        body: "Inverge에서 오늘 계획을 확인하세요.",
        url: "/app",
        notificationId: "notification-1",
        tag: "inverge-today",
        [key]: "forbidden",
      }),
      /notification-raw-field-rejected|notification-payload-keys-invalid/,
      key,
    );
  }
});

test("notification copy rejects official grading, model answer, score, pass prediction, numbers, and CASIO guidance", () => {
  const forbiddenBodies = [
    "공식 채점 결과를 확인하세요.",
    "모범답안을 확인하세요.",
    "점수 예측을 확인하세요.",
    "합격 가능성 확정 안내입니다.",
    "CASIO RUN-MAT EXE 입력을 확인하세요.",
    "100만원을 확인하세요.",
  ];

  for (const body of forbiddenBodies) {
    assert.throws(
      () => validateNotificationPayload({
        type: "today",
        title: "오늘 할 일이 준비되어 있습니다",
        body,
        url: "/app",
        notificationId: "notification-1",
        tag: "inverge-today",
      }),
      /notification-forbidden-copy/,
      body,
    );
  }
});

test("notification click URL sanitizer only permits app and review routes", () => {
  assert.equal(sanitizeNotificationClickUrl("/app"), "/app");
  assert.equal(sanitizeNotificationClickUrl("/app/review"), "/app/review");
  assert.equal(sanitizeNotificationClickUrl("/login"), "/app");
  assert.equal(sanitizeNotificationClickUrl("https://example.com"), "/app");
  assert.equal(sanitizeNotificationClickUrl("/app/review?next=https://example.com"), "/app");
});

test("default notification payload candidates remain metadata-only for every push type", () => {
  for (const type of ["today", "review", "calculator_recovery", "test"]) {
    const payload = validateNotificationPayload(buildNotificationPayloadCandidate(type, `${type}-notification`));
    assert.deepEqual(Object.keys(payload).sort(), [...NOTIFICATION_ALLOWED_KEYS].sort());
    assert.doesNotMatch(JSON.stringify(payload), /rawOcr|problemText|answerText|formula|numbers|units|CASIO|score|passFail/i);
  }
});

test("web push provider failures map to bounded categories without raw provider bodies", () => {
  assert.deepEqual(classifyWebPushProviderError({ statusCode: 404 }), {
    ok: false,
    status: "expired",
    statusCode: 404,
    statusCodeClass: "4xx",
    retryable: false,
  });
  assert.equal(classifyWebPushProviderError({ statusCode: 410 }).status, "expired");
  assert.equal(classifyWebPushProviderError({ statusCode: 400 }).status, "push_provider_rejected");
  assert.equal(classifyWebPushProviderError({ statusCode: 429 }).status, "push_provider_rejected");
  assert.equal(classifyWebPushProviderError({ statusCode: 503 }).status, "push_transport_failure");
  assert.equal(classifyWebPushProviderError(new Error("network timeout with endpoint https://push.example.test/secret")).status, "push_transport_failure");

  const classified = classifyWebPushProviderError({
    statusCode: 400,
    body: "provider body with endpoint https://push.example.test/secret p256dh=secret auth=secret",
    message: "raw provider rejection",
  });
  const serialized = JSON.stringify(classified);
  assert.doesNotMatch(serialized, /provider body|push\.example|p256dh|auth=secret|raw provider/i);
});

test("malformed web push subscription metadata is rejected without echoing credential fields", () => {
  const valid = validateWebPushSubscriptionShape({
    endpoint: "https://push.example.test/subscription",
    keys: { p256dh: "public-key", auth: "auth-key" },
  });
  assert.equal(valid?.endpoint, "https://push.example.test/subscription");

  const invalidInputs = [
    { endpoint: "http://push.example.test/subscription", keys: { p256dh: "public-key", auth: "auth-key" } },
    { endpoint: "https://push.example.test/subscription", keys: { p256dh: "", auth: "auth-key" } },
    { endpoint: "https://push.example.test/subscription", keys: { p256dh: " public-key ", auth: "auth-key" } },
    { endpoint: "https://push.example.test/subscription", keys: { p256dh: "public-key" } },
  ];

  for (const input of invalidInputs) {
    assert.equal(validateWebPushSubscriptionShape(input), null);
  }
});

test("test-send aggregate status does not report persistence failure as full success", () => {
  const fullSuccessCounts = createWebPushFailureCategoryCounts();
  assert.deepEqual(resolveWebPushTestSendStatus({
    sent: 1,
    expired: 0,
    failed: 0,
    failureCategoryCounts: fullSuccessCounts,
  }), {
    ok: true,
    status: "sent",
    httpStatus: 200,
  });

  const persistenceFailureCounts = createWebPushFailureCategoryCounts();
  persistenceFailureCounts.sent_persistence_failed = 1;
  assert.deepEqual(resolveWebPushTestSendStatus({
    sent: 1,
    expired: 0,
    failed: 1,
    failureCategoryCounts: persistenceFailureCounts,
  }), {
    ok: false,
    status: "sent_persistence_failed",
    httpStatus: 200,
  });

  const vapidFailureCounts = createWebPushFailureCategoryCounts();
  vapidFailureCounts.vapid_configuration_error = 1;
  assert.deepEqual(resolveWebPushTestSendStatus({
    sent: 0,
    expired: 0,
    failed: 1,
    failureCategoryCounts: vapidFailureCounts,
  }), {
    ok: false,
    status: "vapid_configuration_error",
    httpStatus: 503,
  });
});
