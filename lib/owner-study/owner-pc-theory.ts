import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateOwnerTheory, readTheoryBudget, validateTheorySettings, OwnerTheoryError,
  type OwnerTheoryAuthority } from "./owner-pc-theory-budget.mjs";
export type { OwnerTheoryAuthority } from "./owner-pc-theory-budget.mjs";
export { OwnerTheoryError } from "./owner-pc-theory-budget.mjs";
export function isOwnerPcTheoryEnabled() { return process.env.INVERGE_OWNER_PC_THEORY_ENABLED === "true"; }
function root() {
  if (!isOwnerPcTheoryEnabled() || process.platform !== "win32" || process.env.NODE_ENV !== "development" ||
      process.env.VERCEL !== undefined || process.env.CI === "true" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:55421" || !process.env.LOCALAPPDATA)
    throw new OwnerTheoryError("OWNER_THEORY_LOCAL_ONLY");
  return path.join(process.env.LOCALAPPDATA, "Inverge", "owner-economics", "theory-one-case-20260915");
}
async function configuration() {
  try { return validateTheorySettings(JSON.parse(await readFile(path.join(root(), "provider.json"), "utf8"))); }
  catch { throw new OwnerTheoryError("OWNER_THEORY_PAID_CONFIGURATION_REQUIRED"); }
}
export async function ownerTheoryStatus() {
  try {
    const settings = await configuration();
    const budget = await readTheoryBudget(path.join(root(), "budget"), settings);
    return { ready: budget.remainingCalls > 0, ...budget, reason: budget.remainingCalls ? null : "누적 예산의 호출 한도에 도달했습니다." };
  } catch { return { ready: false, remainingCalls: 0, reservedMicros: 0, remainingMicros: 0, caseId: null,
    reason: "Gemini 유료 프로젝트 확인과 누적 예산 설치가 필요합니다. 입력한 자료는 로컬에 보존됩니다." }; }
}
export async function generateOwnerTheoryStructure(authority: OwnerTheoryAuthority, request: unknown) {
  const settings = await configuration();
  return generateOwnerTheory(path.join(root(), "budget"), settings, authority, request);
}
