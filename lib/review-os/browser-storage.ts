"use client";

const PREFIX = "inverge:review-os";

type DraftKeyInput = {
  userId: string;
  feature: string;
  entityId?: string;
};

function buildKey({ userId, feature, entityId }: DraftKeyInput) {
  return [PREFIX, userId, feature, entityId].filter(Boolean).join(":");
}

export function loadReviewOsDraft<T>(input: DraftKeyInput): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(buildKey(input));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveReviewOsDraft<T>(input: DraftKeyInput, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(buildKey(input), JSON.stringify(value));
  } catch {
    // ignore browser storage failures
  }
}

export function clearReviewOsDraft(input: DraftKeyInput) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(buildKey(input));
  } catch {
    // ignore browser storage failures
  }
}

export function clearReviewOsBrowserState() {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(window.localStorage);
    keys
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore browser storage failures
  }
}
