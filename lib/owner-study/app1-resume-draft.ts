import { parseApp1LawBinding, type App1LawBindingInput } from "./app1-law-binding";
import type { App1PrimaryGap } from "./app1-capture-repair-view-model";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type App1ResumeDraft = { lawBindingInput?: App1LawBindingInput; repairText: string; analysisBinding: string | null; gap: App1PrimaryGap | null };
export function app1ResumeDraftKey(ownerScope: string, itemId: string) {
  return `inverge:app1-resume:${encodeURIComponent(ownerScope)}:${encodeURIComponent(itemId)}`;
}
// A tab-scoped draft is untrusted input. Only the server can restore its authority.
export function readApp1ResumeDraft(storage: DraftStorage, ownerScope: string, itemId: string): App1ResumeDraft | null {
  try {
    const raw = storage.getItem(app1ResumeDraftKey(ownerScope, itemId));
    // Preserve all text that this tab successfully stored, including oversized
    // input the learner still needs to shorten. Verification has its own limit.
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.version !== 1 || value.ownerScope !== ownerScope || value.itemId !== itemId ||
        typeof value.repairText !== "string") return null;
    const binding = typeof value.analysisBinding === "string" && value.analysisBinding.length <= 8192 ? value.analysisBinding : null;
    const gap = value.gap && typeof value.gap === "object" && !Array.isArray(value.gap) && JSON.stringify(value.gap).length <= 4096 ? value.gap : null;
    let lawBindingInput: App1LawBindingInput | undefined;
    try { if (value.lawBindingInput) lawBindingInput = parseApp1LawBinding(value.lawBindingInput); } catch {}
    return { repairText: value.repairText, analysisBinding: binding, gap, ...(lawBindingInput ? { lawBindingInput } : {}) };
  } catch { return null; }
}
export function writeApp1ResumeDraft(storage: DraftStorage, ownerScope: string, itemId: string, draft: App1ResumeDraft) {
  storage.setItem(app1ResumeDraftKey(ownerScope, itemId), JSON.stringify({ version: 1, ownerScope, itemId, ...draft }));
}
