"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type DraftStatus = "idle" | "saving" | "saved" | "error";

type UseLearnerAutosaveDraftOptions<T> = {
  key: string;
  initialValue: T;
  delayMs?: number;
};

const PREFIX = "inverge:learner-draft";

function storageKey(key: string) {
  return `${PREFIX}:${key}`;
}

function readStoredDraft<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { value?: T };
    return Object.prototype.hasOwnProperty.call(parsed, "value") ? (parsed.value as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredDraft<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(key), JSON.stringify({ value, savedAt: new Date().toISOString() }));
}

function removeStoredDraft(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(key));
}

export function useLearnerAutosaveDraft<T>({ key, initialValue, delayMs = 700 }: UseLearnerAutosaveDraftOptions<T>) {
  const [draft, setStoredDraft] = useState<T>(() => readStoredDraft(key, initialValue));
  const [status, setStatus] = useState<DraftStatus>("idle");
  const mountedRef = useRef(false);

  const setDraft: Dispatch<SetStateAction<T>> = useCallback((nextDraft) => {
    setStatus("saving");
    setStoredDraft(nextDraft);
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      try {
        writeStoredDraft(key, draft);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, draft, key]);

  const clearDraft = useCallback(() => {
    removeStoredDraft(key);
    setStoredDraft(initialValue);
    setStatus("idle");
  }, [initialValue, key]);

  return { draft, setDraft, status, clearDraft };
}
