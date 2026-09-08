/** Owner 2026-09-08 exception: PC-local r3 experiment, never human approval. */
export const OWNER_LOCAL_R3_TRIAL_FLAG = "INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED";
export const OWNER_LOCAL_R3_TRIAL_ORIGIN = "http://127.0.0.1:3883";
export const OWNER_LOCAL_R3_TRIAL_DATABASE_ORIGIN = "http://127.0.0.1:55421";
export const OWNER_LOCAL_R3_TRIAL_ADAPTER_ID = "owner-local-economics-r3-experiment";
export const OWNER_LOCAL_R3_TRIAL_NOTICE = "사람 미검토 · AI 해설과 정답에 오류 가능성이 있는 Owner PC 전용 시험 사용입니다. 검토 완료 콘텐츠나 숙달·전이·측정 증거가 아닙니다.";
type Environment = Readonly<Record<string, string | undefined>>;

/** Server deployment facts, never request headers, content or query flags. */
export function ownerLocalR3TrialEnvironment(environment: Environment): boolean {
  return environment[OWNER_LOCAL_R3_TRIAL_FLAG] === "true" &&
    environment.NODE_ENV === "development" &&
    environment.VERCEL === undefined && environment.VERCEL_ENV === undefined &&
    environment.CI !== "true" && environment.DEV_SMOKE_AUTH !== "true" &&
    environment.NEXT_PUBLIC_SUPABASE_URL === OWNER_LOCAL_R3_TRIAL_DATABASE_ORIGIN;
}
export function ownerLocalR3TrialRequest(environment: Environment, request: Request): boolean {
  if (!ownerLocalR3TrialEnvironment(environment)) return false;
  try {
    const origin = request.headers.get("origin");
    const url = new URL(request.url), host = request.headers.get("host");
    // NextRequest normalizes numeric loopback to localhost internally. This is
    // not a second public origin: the actual HTTP Host must still be exact.
    // Forwarded headers never grant this exception. Genuine Owner auth and
    // local server deployment facts remain separate mandatory gates.
    const canonical = url.origin === OWNER_LOCAL_R3_TRIAL_ORIGIN &&
      (host === null || host === "127.0.0.1:3883");
    const normalized = url.origin === "http://localhost:3883" && host === "127.0.0.1:3883";
    return (canonical || normalized) &&
      (origin === null || origin === OWNER_LOCAL_R3_TRIAL_ORIGIN);
  } catch { return false; }
}
export function genuineTrialSession(session: { isAuthenticated: boolean; isDemo?: boolean; source?: string }) {
  return session.isAuthenticated && session.isDemo === false && session.source === "supabase";
}
/** Only this installed server adapter may represent unreviewed trial evidence. */
export function isOwnerLocalR3TrialAdapter(adapter: { adapterId: string; adapterVersion: string; subjectId: string }) {
  return adapter.adapterId === OWNER_LOCAL_R3_TRIAL_ADAPTER_ID &&
    adapter.adapterVersion === "1" && adapter.subjectId === "economics_principles";
}
