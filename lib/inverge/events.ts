import { sanitizeDerivedMetadata } from "@/lib/review-os/data-boundary";

export type InvergeEventName =
  | "first.onboarding.submitted"
  | "first.starter_diagnosis.submitted"
  | "first.past_set.started"
  | "first.answer.changed"
  | "first.set.submitted"
  | "first.review_item.completed"
  | "first.weekly_coaching.viewed"
  | "first.records.viewed"
  | "second.write.started"
  | "second.write.submitted"
  | "second.compare.viewed"
  | "second.rewrite.submitted"
  | "second.records.viewed"
  | "ai.enhancement.succeeded"
  | "ai.enhancement.fallback"
  | "feedback.submitted"
  | "paywall.viewed"
  | "checkout.started"
  | "checkout.completed"
  | "checkout.canceled"
  | "checkout.failed";

export type InvergeStage = "first" | "second" | "system" | "commerce" | "feedback";

export type InvergeEventPersistence = "local" | "server";

export type InvergeEventPayload = {
  examId?: string;
  stage?: InvergeStage;
  subjectId?: string;
  sessionId?: string;
  attemptId?: string;
  submissionId?: string;
  rewriteId?: string;
  setId?: string;
  questionId?: string;
  reviewId?: string;
  source?: "client" | "server";
  properties?: Record<string, string | number | boolean | null | undefined>;
};

export type InvergeEventEnvelope = {
  eventId: string;
  eventName: InvergeEventName;
  occurredAt: string;
  receivedAt?: string;
  anonymousUserId?: string;
  payload: InvergeEventPayload;
  persistence: InvergeEventPersistence;
};

export type InvergeEventInput = {
  eventId?: string;
  eventName: InvergeEventName;
  occurredAt?: string;
  anonymousUserId?: string;
  payload?: InvergeEventPayload;
};

export const INVERGE_EVENT_LOCAL_STORAGE_KEY = "inverge:events:local";
export const INVERGE_EVENT_ANONYMOUS_ID_KEY = "inverge:events:anonymous-id";

export function createInvergeEventId(prefix = "evt") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeInvergeEventInput(input: InvergeEventInput): InvergeEventEnvelope {
  return {
    eventId: input.eventId ?? createInvergeEventId(),
    eventName: input.eventName,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    anonymousUserId: input.anonymousUserId,
    payload: sanitizeDerivedMetadata({
      source: "client",
      ...(input.payload ?? {}),
    }) as InvergeEventPayload,
    persistence: "local",
  };
}

export function isInvergeEventName(value: unknown): value is InvergeEventName {
  return (
    value === "first.onboarding.submitted" ||
    value === "first.starter_diagnosis.submitted" ||
    value === "first.past_set.started" ||
    value === "first.answer.changed" ||
    value === "first.set.submitted" ||
    value === "first.review_item.completed" ||
    value === "first.weekly_coaching.viewed" ||
    value === "first.records.viewed" ||
    value === "second.write.started" ||
    value === "second.write.submitted" ||
    value === "second.compare.viewed" ||
    value === "second.rewrite.submitted" ||
    value === "second.records.viewed" ||
    value === "ai.enhancement.succeeded" ||
    value === "ai.enhancement.fallback" ||
    value === "feedback.submitted" ||
    value === "paywall.viewed" ||
    value === "checkout.started" ||
    value === "checkout.completed" ||
    value === "checkout.canceled" ||
    value === "checkout.failed"
  );
}
