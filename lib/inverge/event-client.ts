"use client";

import {
  INVERGE_EVENT_ANONYMOUS_ID_KEY,
  INVERGE_EVENT_LOCAL_STORAGE_KEY,
  createInvergeEventId,
  normalizeInvergeEventInput,
  type InvergeEventEnvelope,
  type InvergeEventInput,
  type InvergeEventName,
  type InvergeEventPayload,
} from "@/lib/inverge/events";

const MAX_LOCAL_EVENTS = 300;
const DEDUPE_WINDOW_MS = 1500;
const recentEventSignatures = new Map<string, number>();

function readLocalEvents() {
  try {
    const raw = window.localStorage.getItem(INVERGE_EVENT_LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InvergeEventEnvelope[]) : [];
  } catch {
    return [];
  }
}

function persistLocalEvent(event: InvergeEventEnvelope) {
  try {
    const nextEvents = [event, ...readLocalEvents()].slice(0, MAX_LOCAL_EVENTS);
    window.localStorage.setItem(INVERGE_EVENT_LOCAL_STORAGE_KEY, JSON.stringify(nextEvents));
  } catch {
    // Event logging must never block the learning flow.
  }
}

function getAnonymousUserId() {
  try {
    const existing = window.localStorage.getItem(INVERGE_EVENT_ANONYMOUS_ID_KEY);
    if (existing) return existing;

    const next = createInvergeEventId("anon");
    window.localStorage.setItem(INVERGE_EVENT_ANONYMOUS_ID_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

function sendServerEvent(event: InvergeEventEnvelope) {
  const serverEvent = {
    ...event,
    payload: {
      ...event.payload,
      source: "client" as const,
    },
    persistence: "server" as const,
  };
  const body = JSON.stringify(serverEvent);

  try {
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const sent = navigator.sendBeacon("/api/inverge/events", new Blob([body], { type: "application/json" }));
      if (sent) return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch("/api/inverge/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("inverge event server persistence failed", error);
    }
  });
}

function getDedupeSignature(eventName: InvergeEventName, payload: InvergeEventPayload) {
  const signaturePayload = {
    eventName,
    examId: payload.examId,
    stage: payload.stage,
    subjectId: payload.subjectId,
    sessionId: payload.sessionId,
    submissionId: payload.submissionId,
    rewriteId: payload.rewriteId,
    setId: payload.setId,
    questionId: payload.questionId,
    reviewId: payload.reviewId,
    task: payload.properties?.task,
  };

  return JSON.stringify(signaturePayload);
}

function shouldSkipDuplicate(eventName: InvergeEventName, payload: InvergeEventPayload) {
  const signature = getDedupeSignature(eventName, payload);
  const now = Date.now();
  const previousAt = recentEventSignatures.get(signature);

  if (previousAt && now - previousAt < DEDUPE_WINDOW_MS) {
    return true;
  }

  recentEventSignatures.set(signature, now);
  return false;
}

export function logInvergeEvent(eventName: InvergeEventName, payload: InvergeEventPayload = {}) {
  if (typeof window === "undefined") return;
  if (shouldSkipDuplicate(eventName, payload)) return;

  const input: InvergeEventInput = {
    eventName,
    anonymousUserId: getAnonymousUserId(),
    payload,
  };
  const localEvent = normalizeInvergeEventInput(input);

  persistLocalEvent(localEvent);
  sendServerEvent(localEvent);
}
