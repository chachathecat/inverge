import "server-only";

import { createJsonFileRepository } from "@/lib/inverge/file-persistence";

export type AdminUsabilitySeverity = "low" | "medium" | "high";

export type AdminUsabilityNoteInput = {
  route: string;
  task: string;
  frictionPoint: string;
  severity: AdminUsabilitySeverity;
  quote: string;
  suggestedFix: string;
};

export type AdminUsabilityNote = AdminUsabilityNoteInput & {
  id: string;
  createdAt: string;
};

type PersistedUsabilityNotesStore = {
  notes: AdminUsabilityNote[];
};

const store = createJsonFileRepository<PersistedUsabilityNotesStore>("admin-usability-notes.json", () => ({ notes: [] }));

export function listAdminUsabilityNotes() {
  return store.read().notes;
}

export function createAdminUsabilityNote(input: AdminUsabilityNoteInput) {
  const trimmed = {
    route: input.route.trim(),
    task: input.task.trim(),
    frictionPoint: input.frictionPoint.trim(),
    severity: input.severity,
    quote: input.quote.trim(),
    suggestedFix: input.suggestedFix.trim(),
  };

  if (!trimmed.route || !trimmed.task || !trimmed.frictionPoint || !trimmed.quote || !trimmed.suggestedFix) {
    throw new Error("required-fields-missing");
  }

  return store.update((current) => {
    const note: AdminUsabilityNote = {
      ...trimmed,
      id: `usability-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const next = { notes: [note, ...current.notes] };
    return { next, result: note };
  });
}
