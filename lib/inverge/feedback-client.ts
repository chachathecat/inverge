"use client";

import { logInvergeEvent } from "@/lib/inverge/event-client";
import {
  INVERGE_FEEDBACK_LOCAL_STORAGE_KEY,
  INVERGE_FEEDBACK_PROMPT_STATE_KEY,
  buildFeedbackScopeKey,
  shouldEscalateFeedback,
  type FeedbackContext,
  type FeedbackPromptState,
  type FeedbackRating,
  type FeedbackResponse,
  type FeedbackTrigger,
} from "@/lib/inverge/feedback";
import { createInvergeEventId } from "@/lib/inverge/events";

const GLOBAL_PROMPT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const TRIGGER_PROMPT_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESPONSES = 100;

type PromptStateMap = Record<string, FeedbackPromptState>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Feedback storage should not block the product flow.
  }
}

function readPromptStates() {
  return readJson<PromptStateMap>(INVERGE_FEEDBACK_PROMPT_STATE_KEY, {});
}

function writePromptStates(states: PromptStateMap) {
  writeJson(INVERGE_FEEDBACK_PROMPT_STATE_KEY, states);
}

function mostRecentShownAt(states: PromptStateMap) {
  return Object.values(states).reduce<string | null>((latest, state) => {
    if (!latest) return state.lastShownAt;
    return Date.parse(state.lastShownAt) > Date.parse(latest) ? state.lastShownAt : latest;
  }, null);
}

function mostRecentTriggerShownAt(states: PromptStateMap, trigger: FeedbackTrigger) {
  return Object.values(states)
    .filter((state) => state.scopeKey.startsWith(`${trigger}:`))
    .reduce<string | null>((latest, state) => {
      if (!latest) return state.lastShownAt;
      return Date.parse(state.lastShownAt) > Date.parse(latest) ? state.lastShownAt : latest;
    }, null);
}

export function shouldShowFeedbackPrompt(trigger: FeedbackTrigger, context: FeedbackContext) {
  if (typeof window === "undefined") return false;

  const states = readPromptStates();
  const scopeKey = buildFeedbackScopeKey(trigger, context);
  const state = states[scopeKey];
  const now = Date.now();

  if (state?.submittedAt || state?.dismissedAt) return false;
  if (state?.snoozedUntil && Date.parse(state.snoozedUntil) > now) return false;

  const latestGlobal = mostRecentShownAt(states);
  if (latestGlobal && now - Date.parse(latestGlobal) < GLOBAL_PROMPT_COOLDOWN_MS) return false;

  const latestForTrigger = mostRecentTriggerShownAt(states, trigger);
  if (latestForTrigger && now - Date.parse(latestForTrigger) < TRIGGER_PROMPT_COOLDOWN_MS) return false;

  return true;
}

export function markFeedbackPromptShown(trigger: FeedbackTrigger, context: FeedbackContext) {
  const states = readPromptStates();
  const scopeKey = buildFeedbackScopeKey(trigger, context);
  const now = new Date().toISOString();
  const previous = states[scopeKey];

  states[scopeKey] = {
    scopeKey,
    shownCount: (previous?.shownCount ?? 0) + 1,
    firstShownAt: previous?.firstShownAt ?? now,
    lastShownAt: now,
    snoozedUntil: previous?.snoozedUntil,
    dismissedAt: previous?.dismissedAt,
    submittedAt: previous?.submittedAt,
  };

  writePromptStates(states);
}

export function snoozeFeedbackPrompt(trigger: FeedbackTrigger, context: FeedbackContext) {
  const states = readPromptStates();
  const scopeKey = buildFeedbackScopeKey(trigger, context);
  const previous = states[scopeKey];
  const now = new Date();

  states[scopeKey] = {
    scopeKey,
    shownCount: previous?.shownCount ?? 0,
    firstShownAt: previous?.firstShownAt ?? now.toISOString(),
    lastShownAt: previous?.lastShownAt ?? now.toISOString(),
    snoozedUntil: new Date(now.getTime() + SNOOZE_MS).toISOString(),
    dismissedAt: previous?.dismissedAt,
    submittedAt: previous?.submittedAt,
  };

  writePromptStates(states);
}

export function dismissFeedbackPrompt(trigger: FeedbackTrigger, context: FeedbackContext) {
  const states = readPromptStates();
  const scopeKey = buildFeedbackScopeKey(trigger, context);
  const previous = states[scopeKey];
  const now = new Date().toISOString();

  states[scopeKey] = {
    scopeKey,
    shownCount: previous?.shownCount ?? 0,
    firstShownAt: previous?.firstShownAt ?? now,
    lastShownAt: previous?.lastShownAt ?? now,
    dismissedAt: now,
    submittedAt: previous?.submittedAt,
  };

  writePromptStates(states);
}

function persistLocalFeedback(response: FeedbackResponse) {
  const responses = readJson<FeedbackResponse[]>(INVERGE_FEEDBACK_LOCAL_STORAGE_KEY, []);
  writeJson(INVERGE_FEEDBACK_LOCAL_STORAGE_KEY, [response, ...responses].slice(0, MAX_RESPONSES));
}

async function persistServerFeedback(response: FeedbackResponse) {
  try {
    await fetch("/api/inverge/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
      keepalive: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("inverge feedback server persistence failed", error);
    }
  }
}

export function submitFeedbackResponse({
  trigger,
  context,
  rating,
  freeText,
}: {
  trigger: FeedbackTrigger;
  context: FeedbackContext;
  rating: FeedbackRating;
  freeText: string;
}) {
  const normalizedText = freeText.trim();
  const response: FeedbackResponse = {
    feedbackId: createInvergeEventId("feedback"),
    trigger,
    rating,
    freeText: normalizedText ? normalizedText.slice(0, 500) : null,
    context,
    operatorReview: shouldEscalateFeedback(rating, normalizedText),
    submittedAt: new Date().toISOString(),
    source: "product",
    schemaVersion: 1,
  };
  const states = readPromptStates();
  const scopeKey = buildFeedbackScopeKey(trigger, context);
  const previous = states[scopeKey];

  states[scopeKey] = {
    scopeKey,
    shownCount: previous?.shownCount ?? 1,
    firstShownAt: previous?.firstShownAt ?? response.submittedAt,
    lastShownAt: previous?.lastShownAt ?? response.submittedAt,
    submittedAt: response.submittedAt,
  };

  writePromptStates(states);
  persistLocalFeedback(response);
  void persistServerFeedback(response);
  logInvergeEvent("feedback.submitted", {
    examId: context.examId,
    stage: "feedback",
    subjectId: context.subjectId,
    sessionId: context.sessionId,
    submissionId: context.submissionId,
    rewriteId: context.rewriteId,
    setId: context.setId,
    reviewId: context.reviewId,
    properties: {
      trigger,
      rating,
      operatorReview: response.operatorReview,
      hasFreeText: Boolean(response.freeText),
    },
  });

  return response;
}
