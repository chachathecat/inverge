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

/** Separately approved exact four-item addition; legacy tuple stays byte-stable. */
export const OWNER_INVESTMENT_PACKET_SHA256 = "5a89a838a1c8873176a0bd8e137fbc3338df8ed53107379b9e12fad73e04bd81";
export const OWNER_INVESTMENT_VERSION = "owner-pc-real-estate-investment-finance-20260918-v1";
export const OWNER_INVESTMENT_SESSION = "owner-original-investment-finance-v1";
export const OWNER_INVESTMENT_IDS = ["owner-re-npv-initial-v1", "owner-re-npv-retry-v1", "owner-re-equity-initial-v1", "owner-re-equity-retry-v1"] as const;
export const OWNER_INVESTMENT_FLAG = "INVERGE_OWNER_INVESTMENT_ASSIGNMENT_ENABLED";
export function matchesOwnerOriginalReference(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const legacy = (OWNER_ORIGINAL_IDS as readonly unknown[]).includes(row.questionId);
  const addition = (OWNER_INVESTMENT_IDS as readonly unknown[]).includes(row.questionId);
  return (legacy || addition) && row.schemaVersion === "first_stage.owner_original_question_reference.v1" &&
    row.subjectId === "real_estate_principles" && row.examYear === null && row.examRound === null && row.questionNumber === null && row.choiceCount === 5 &&
    row.questionVersion === (legacy ? OWNER_ORIGINAL_VERSION : OWNER_INVESTMENT_VERSION) &&
    row.sessionId === (legacy ? "owner-original-real-estate-v2" : OWNER_INVESTMENT_SESSION) &&
    row.rightsState === "owner_authorized_original" && row.currentnessState === "stated_model_only" &&
    JSON.stringify(row.sourceVersionManifestIds) === JSON.stringify([`owner-original-${legacy ? OWNER_ORIGINAL_PACKET_SHA256 : OWNER_INVESTMENT_PACKET_SHA256}`]);
}
