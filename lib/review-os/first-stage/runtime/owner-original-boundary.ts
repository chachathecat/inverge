/** Owner-approved exact two-item private practice; never a human review receipt. */
export const OWNER_ORIGINAL_FLAG = "INVERGE_OWNER_ORIGINAL_REAL_ESTATE_ENABLED";
export const OWNER_ORIGINAL_PACKET_SHA256 = "0a7039441edafa476973383fdd4f8fb1163ae9bee96da55aacc0eaf33b4d9fc9";
export const OWNER_ORIGINAL_SQL_SHA256 = "5346dbf1caa872c880ab621ffd91c508791747e9c80112b1030f86642e307a3a";
export const OWNER_ORIGINAL_VERSION = "owner-pc-real-estate-direct-capitalization-20260917-v2";
export const OWNER_ORIGINAL_IDS = ["owner-re-capitalization-original-v2", "owner-re-capitalization-retry-v2"] as const;
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
