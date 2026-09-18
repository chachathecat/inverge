import { OWNER_CONTENT_REGISTRATION, ownerContentBundle, ownerContentReferenceRegistration } from "./owner-content-registration.mjs";
const original = ownerContentBundle("original")!;
const investment = ownerContentBundle("investment")!;
const market = ownerContentBundle("market")!;
/** Owner-approved exact two-item private practice; never a human review receipt. */
export const OWNER_ORIGINAL_FLAG = original.flag;
export const OWNER_ORIGINAL_PACKET_SHA256 = original.sha256;
export const OWNER_ORIGINAL_SQL_SHA256 = OWNER_CONTENT_REGISTRATION.sqlSha256;
export const OWNER_ORIGINAL_VERSION = original.version;
export const OWNER_ORIGINAL_IDS = original.ids;
export const OWNER_ORIGINAL_ADAPTER = "owner-original-real-estate-calculation";
export const OWNER_ORIGINAL_NOTICE = "AI 작성 · 계산 검증 완료 · 사람 미검토 · 개인 연습용";
export const OWNER_ORIGINAL_SCOPE = "계산 검증은 문제에 명시된 모형에 한정됩니다. 공식 기출·현실 감정평가 정확성·전이·숙달 검증이 아닙니다.";
export function isOwnerOriginalAdapter(adapter: { adapterId: string; adapterVersion: string; subjectId: string }) {
  return adapter.adapterId === OWNER_ORIGINAL_ADAPTER && adapter.adapterVersion === "1" && adapter.subjectId === "real_estate_principles";
}
export function ownerOriginalEnvironment(env: Readonly<Record<string, string | undefined>>) {
  if (env[OWNER_ORIGINAL_FLAG] !== "true" || env.NODE_ENV !== "development" || env.VERCEL !== undefined ||
    env.VERCEL_ENV !== undefined || env.CI === "true" || env.DEV_SMOKE_AUTH === "true") return null;
  if (env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:55421" && env.INVERGE_OWNER_ORIGINAL_TEST_ONLY === undefined) return "http://127.0.0.1:3883";
  if (env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:55431" && env.INVERGE_OWNER_ORIGINAL_TEST_ONLY === "isolated_synthetic") return "http://127.0.0.1:3884";
  return null;
}

/** Separately approved exact four-item addition; legacy tuple stays byte-stable. */
export const OWNER_INVESTMENT_PACKET_SHA256 = investment.sha256;
export const OWNER_INVESTMENT_VERSION = investment.version;
export const OWNER_INVESTMENT_SESSION = investment.sessionId;
export const OWNER_INVESTMENT_IDS = investment.ids;
export const OWNER_INVESTMENT_FLAG = investment.flag;
/** Exact separately authorized market unit; no automatic additional content. */
export const OWNER_MARKET_PACKET_SHA256 = market.sha256;
export const OWNER_MARKET_VERSION = market.version;
export const OWNER_MARKET_SESSION = market.sessionId;
export const OWNER_MARKET_IDS = market.ids;
export const OWNER_MARKET_FLAG = market.flag;
export function matchesOwnerOriginalReference(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const bundle = ownerContentReferenceRegistration(row);
  return bundle !== null && row.schemaVersion === "first_stage.owner_original_question_reference.v1" &&
    row.subjectId === "real_estate_principles" && row.examYear === null && row.examRound === null && row.questionNumber === null && row.choiceCount === 5 &&
    row.sessionId === bundle.sessionId && row.rightsState === "owner_authorized_original" && row.currentnessState === "stated_model_only" &&
    JSON.stringify(row.sourceVersionManifestIds) === JSON.stringify([`owner-original-${bundle.sha256}`]);
}
