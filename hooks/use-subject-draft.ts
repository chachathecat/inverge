"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_DRAFT } from "@/lib/inverge/mock-data";
import type { SubjectDraft } from "@/lib/inverge/types";
import { draftStorageKey } from "@/lib/inverge/utils";

const EMPTY_DRAFT: SubjectDraft = DEFAULT_DRAFT;
const DRAFT_EVENT = "inverge:draft-change";

function readDraft(contextId: string) {
  if (typeof window === "undefined") {
    return EMPTY_DRAFT;
  }

  try {
    const stored = window.localStorage.getItem(draftStorageKey(contextId));
    return stored ? (JSON.parse(stored) as SubjectDraft) : EMPTY_DRAFT;
  } catch {
    return EMPTY_DRAFT;
  }
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener(DRAFT_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(DRAFT_EVENT, handler);
  };
}

export function useSubjectDraft(contextId: string) {
  const draft = useSyncExternalStore(
    subscribe,
    () => readDraft(contextId),
    () => EMPTY_DRAFT,
  );

  function saveDraft(nextDraft: SubjectDraft) {
    window.localStorage.setItem(draftStorageKey(contextId), JSON.stringify(nextDraft));
    window.dispatchEvent(new Event(DRAFT_EVENT));
  }

  return { draft, isReady: true, saveDraft };
}
