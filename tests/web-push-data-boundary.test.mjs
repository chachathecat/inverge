import test from "node:test";
import assert from "node:assert/strict";

import {
  NOTIFICATION_ALLOWED_KEYS,
  buildNotificationPayload,
  sanitizeNotificationClickUrl,
  validateNotificationPayload,
} from "../lib/notifications/push-payload.ts";

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
