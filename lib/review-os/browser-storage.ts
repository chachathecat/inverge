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

export type LocalBetaLearnerNote = {
  id: string;
  mode: string;
  subjectLabel: string;
  sourceType?: "text" | "photo" | "pdf";
  problemTitle?: string;
  biggestGap: string;
  nextAction: string;
  createdAt: string;
  metadataOnly: true;
  safeUse: "closed_beta_local_note";
};

const LOCAL_BETA_NOTES_KEY = `${PREFIX}:local-beta-notes`;
const LOCAL_BETA_NOTE_KEYS = new Set([
  "id",
  "mode",
  "subjectLabel",
  "sourceType",
  "problemTitle",
  "biggestGap",
  "nextAction",
  "createdAt",
  "metadataOnly",
  "safeUse",
]);
const LOCAL_BETA_NOTE_MODES = new Set(["first", "second"]);
const LOCAL_BETA_NOTE_SOURCE_TYPES = new Set(["text", "photo", "pdf"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isLocalBetaLearnerNote(value: unknown): value is LocalBetaLearnerNote {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const note = value as Record<string, unknown>;
  if (Object.keys(note).some((key) => !LOCAL_BETA_NOTE_KEYS.has(key))) return false;
  return (
    isNonEmptyString(note.id) &&
    isNonEmptyString(note.mode) &&
    LOCAL_BETA_NOTE_MODES.has(note.mode) &&
    isNonEmptyString(note.subjectLabel) &&
    (note.sourceType === undefined ||
      (isNonEmptyString(note.sourceType) && LOCAL_BETA_NOTE_SOURCE_TYPES.has(note.sourceType))) &&
    (note.problemTitle === undefined || isNonEmptyString(note.problemTitle)) &&
    isNonEmptyString(note.biggestGap) &&
    isNonEmptyString(note.nextAction) &&
    isNonEmptyString(note.createdAt) &&
    note.metadataOnly === true &&
    note.safeUse === "closed_beta_local_note"
  );
}

export type LocalBetaNotesReadOutcome =
  | Readonly<{ status: "ready"; notes: LocalBetaLearnerNote[] }>
  | Readonly<{ status: "unavailable"; notes: [] }>;

export type ModeScopedLocalBetaNotesReadOutcome =
  | Readonly<{ mode: string; status: "checking"; notes: [] }>
  | Readonly<{ mode: string; status: "ready"; notes: LocalBetaLearnerNote[] }>
  | Readonly<{ mode: string; status: "unavailable"; notes: [] }>;

export function createCheckingLocalBetaNotesReadOutcome(
  mode: string,
): ModeScopedLocalBetaNotesReadOutcome {
  return { mode, status: "checking", notes: [] };
}

export function scopeLocalBetaNotesReadOutcome(
  mode: string,
  outcome: LocalBetaNotesReadOutcome,
): ModeScopedLocalBetaNotesReadOutcome {
  return outcome.status === "ready"
    ? { mode, status: "ready", notes: outcome.notes }
    : { mode, status: "unavailable", notes: [] };
}

export function selectLocalBetaNotesReadOutcomeForMode(
  outcome: ModeScopedLocalBetaNotesReadOutcome,
  mode: string,
): ModeScopedLocalBetaNotesReadOutcome {
  return outcome.mode === mode
    ? outcome
    : createCheckingLocalBetaNotesReadOutcome(mode);
}

export function listReviewOsLocalBetaNotesWithStatus(mode?: string): LocalBetaNotesReadOutcome {
  if (typeof window === "undefined") return { status: "ready", notes: [] };
  try {
    const raw = window.localStorage.getItem(LOCAL_BETA_NOTES_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isLocalBetaLearnerNote)) {
      return { status: "unavailable", notes: [] };
    }
    const notes = parsed;
    return {
      status: "ready",
      notes: mode ? notes.filter((note) => note.mode === mode) : notes,
    };
  } catch {
    return { status: "unavailable", notes: [] };
  }
}

function readLocalBetaNotes() {
  return listReviewOsLocalBetaNotesWithStatus().notes;
}

export function listReviewOsLocalBetaNotes(mode?: string) {
  return listReviewOsLocalBetaNotesWithStatus(mode).notes;
}

export function getReviewOsLocalBetaNote(id: string) {
  return readLocalBetaNotes().find((note) => note.id === id) ?? null;
}

export function clearReviewOsLocalBetaNotes() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_BETA_NOTES_KEY);
  } catch {
    // ignore browser storage failures
  }
}

export function saveReviewOsLocalBetaNoteWithStatus(note: Omit<LocalBetaLearnerNote, "id" | "createdAt" | "metadataOnly" | "safeUse">) {
  const createdAt = new Date().toISOString();
  const localNote: LocalBetaLearnerNote = {
    ...note,
    id: `local-beta-${Date.now()}`,
    createdAt,
    metadataOnly: true,
    safeUse: "closed_beta_local_note",
  };
  let savedToBrowser = false;
  if (typeof window !== "undefined") {
    try {
      const existing = listReviewOsLocalBetaNotesWithStatus();
      if (existing.status !== "ready") {
        return { note: localNote, savedToBrowser };
      }
      window.localStorage.setItem(
        LOCAL_BETA_NOTES_KEY,
        JSON.stringify([localNote, ...existing.notes].slice(0, 20)),
      );
      savedToBrowser = true;
    } catch {
      // ignore browser storage failures
    }
  }
  return { note: localNote, savedToBrowser };
}

export function saveReviewOsLocalBetaNote(note: Omit<LocalBetaLearnerNote, "id" | "createdAt" | "metadataOnly" | "safeUse">) {
  return saveReviewOsLocalBetaNoteWithStatus(note).note;
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
