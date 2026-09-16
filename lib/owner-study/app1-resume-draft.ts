import { APP1_LIMITS, type App1PrimaryGap } from "./app1-capture-repair-view-model";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type App1ResumeDraft = { repairText: string; analysisBinding: string | null; gap: App1PrimaryGap | null };
export function app1ResumeDraftKey(ownerScope: string, itemId: string) {
  return `inverge:app1-resume:${encodeURIComponent(ownerScope)}:${encodeURIComponent(itemId)}`;
}
// A tab-scoped draft is untrusted input. Only the server can restore its authority.
export function readApp1ResumeDraft(storage: DraftStorage, ownerScope: string, itemId: string): App1ResumeDraft | null {
  try {
    const raw = storage.getItem(app1ResumeDraftKey(ownerScope, itemId));
    if (!raw || raw.length > 40000) return null;
    const value = JSON.parse(raw);
    if (value.version !== 1 || value.ownerScope !== ownerScope || value.itemId !== itemId ||
        typeof value.repairText !== "string" || value.repairText.length > APP1_LIMITS.maximumRepairCharacters) return null;
    const binding = typeof value.analysisBinding === "string" && value.analysisBinding.length <= 8192 ? value.analysisBinding : null;
    const gap = value.gap && typeof value.gap === "object" && !Array.isArray(value.gap) && JSON.stringify(value.gap).length <= 4096 ? value.gap : null;
    return { repairText: value.repairText, analysisBinding: binding, gap };
  } catch { return null; }
}
export function writeApp1ResumeDraft(storage: DraftStorage, ownerScope: string, itemId: string, draft: App1ResumeDraft) {
  storage.setItem(app1ResumeDraftKey(ownerScope, itemId), JSON.stringify({ version: 1, ownerScope, itemId, ...draft }));
}
