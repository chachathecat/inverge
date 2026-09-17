import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateOwnerTheory, readTheoryBudget, readTheoryDevelopmentApproval, readTheoryDevelopmentCallLimit, readPracticeDevelopmentApproval, readPracticeDevelopmentUsage, validateTheorySettings, OwnerTheoryError,
  type OwnerTheoryAuthority } from "./owner-pc-theory-budget.mjs";
export type { OwnerTheoryAuthority } from "./owner-pc-theory-budget.mjs";
export { OwnerTheoryError } from "./owner-pc-theory-budget.mjs";
export function isOwnerPcTheoryEnabled() { return process.env.INVERGE_OWNER_PC_THEORY_ENABLED === "true"; }
function developmentEnabled() { return process.env.INVERGE_OWNER_PC_THEORY_DEVELOPMENT_ENABLED === "true"; }
function practiceDevelopmentEnabled() { return developmentEnabled() && process.env.INVERGE_OWNER_PC_PRACTICE_DEVELOPMENT_ENABLED === "true"; }
function root() {
  if (!isOwnerPcTheoryEnabled() || process.platform !== "win32" || (process.env.NODE_ENV !== "development" && !(developmentEnabled() && process.env.NODE_ENV === "production")) ||
      process.env.VERCEL !== undefined || process.env.CI === "true" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== (developmentEnabled() ? "http://127.0.0.1:55431" : "http://127.0.0.1:55421") || !process.env.LOCALAPPDATA)
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
    if (practiceDevelopmentEnabled()) {
      const budgetRoot = path.join(root(), "budget");
      const shared = await readTheoryBudget(budgetRoot, settings);
      try {
        const usage = await readPracticeDevelopmentUsage(budgetRoot, settings);
        const remainingCalls = Math.min(shared.remainingCalls, usage.maximumCalls - usage.usedCalls);
        return { ...shared, caseId:null, remainingCalls, ready:remainingCalls > 0 && !shared.connectionPending,
          reason:remainingCalls > 0 ? null : "승인된 실무 개발 호출 한도에 도달했습니다." };
      } catch {
        return { ...shared, caseId:null, remainingCalls:0, ready:false, reason:"실무 개발 검증의 별도 호출 승인이 필요합니다. 기존 원장은 보존됩니다." };
      }
    }
    if (developmentEnabled()) await readTheoryDevelopmentApproval(path.join(root(), "budget"), settings);
    const shared = await readTheoryBudget(path.join(root(), "budget"), settings);
    const maximumDevelopmentCalls = developmentEnabled() ? await readTheoryDevelopmentCallLimit(path.join(root(), "budget"), settings) : 0;
    const budget = { ...shared, caseId: developmentEnabled() ? null : shared.caseId, remainingCalls: developmentEnabled() ? Math.min(shared.remainingCalls, maximumDevelopmentCalls - shared.developmentUsedCalls) : shared.remainingCalls };
    return { ready: budget.remainingCalls > 0 && !budget.connectionPending, ...budget, reason: budget.connectionPending ? "연결 확인이 완료되지 않았습니다. 입력한 자료는 로컬에 보존됩니다." : budget.remainingCalls ? null : "누적 예산의 호출 한도에 도달했습니다." };
  } catch { return { ready: false, remainingCalls: 0, reservedMicros: 0, remainingMicros: 0, caseId: null,
    reason: "Gemini 유료 프로젝트 확인과 누적 예산 설치가 필요합니다. 입력한 자료는 로컬에 보존됩니다." }; }
}
export async function generateOwnerTheoryStructure(authority: OwnerTheoryAuthority, request: unknown) {
  const settings = await configuration();
  const budgetRoot = path.join(root(), "budget");
  if (practiceDevelopmentEnabled()) {
    const practiceDevelopment = await readPracticeDevelopmentApproval(budgetRoot, settings);
    return generateOwnerTheory(budgetRoot, settings, { ...authority, practiceDevelopment }, request);
  }
  const development = developmentEnabled() ? await readTheoryDevelopmentApproval(budgetRoot, settings) : undefined;
  return generateOwnerTheory(budgetRoot, settings, { ...authority, ...(development ? { development } : {}) }, request);
}
