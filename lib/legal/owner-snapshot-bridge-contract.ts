/** Private JSON references stay separate from database UUID anchors. */
export type SnapshotReference = Readonly<{
  schemaVersion: "StatuteSnapshotReferenceV1";
  projectRef: string; bucket: string; catalogSha256: string; catalogObjectKey: string;
  lawId: string; lawName: string; mst: string; effectiveDate: string;
  promulgationDate: string; collectedAt: string;
  section: "MAIN" | "SUPPLEMENTARY"; articleKey: string;
  storedArticleKey: string | null; supplementaryKey: string | null;
  jsonPointer: string; originalFormat: "JSON";
  originalJsonSha256: string; manifestSha256: string; normalizedSha256: string;
  originalObjectKey: string; manifestObjectKey: string; normalizedObjectKey: string;
  originalFragmentSha256: string; textSha256: string;
}>;
export type HeldSnapshot = Pick<SnapshotReference,
  "lawId" | "lawName" | "mst" | "effectiveDate" | "manifestSha256">;
export type SnapshotAnchor = Readonly<{
  reference: SnapshotReference; articleNumber: string | null; branchNumber: string | null;
  title: string; bodyText: string; deleted: boolean | null; score: number | null;
}>;
export type BridgeState = "OK" | "NO_RESULTS" | "LAW_NOT_HELD" | "VERSION_NOT_HELD" |
  "INVALID_INPUT" | "UNSUPPORTED" | "INTEGRITY_ERROR" | "SEARCH_FAILED" | "ACCESS_DENIED" | "NOT_CONFIGURED";
export type BridgeResult = Readonly<{
  sourceKind: "PRIVATE_STATUTE_JSON_SNAPSHOT"; state: BridgeState;
  snapshots?: readonly HeldSnapshot[]; anchors: readonly SnapshotAnchor[];
  originalReopened?: boolean; totalMatches?: number; returnedCount?: number;
  currentness: "UNVERIFIED"; dateApplicability: "NOT_ASSESSED";
  examApplicabilityCertified: false;
}>;
export type BridgeSearch = Readonly<{
  lawId: string; mst: string; effectiveDate: string; manifestSha256: string;
  articleNumber?: string; queryText?: string; section?: "MAIN" | "SUPPLEMENTARY" | "ALL";
  matchCount?: number; applicableOn?: string;
}>;
/** Pure deployment guard: safe at the proxy boundary, with no reader/auth import. */
export function localBridgeEnabled(env: Readonly<Record<string, string | undefined>>) {
  return env.INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED === "true" && env.NODE_ENV === "development" &&
    !env.VERCEL && !env.VERCEL_ENV && !env.CI && env.DEV_SMOKE_AUTH !== "true" &&
    env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:55421";
}
export const bridgeFailure = (state: BridgeState): BridgeResult => ({
  sourceKind: "PRIVATE_STATUTE_JSON_SNAPSHOT", state, anchors: [],
  currentness: "UNVERIFIED", dateApplicability: "NOT_ASSESSED", examApplicabilityCertified: false,
});
export const BRIDGE_MESSAGES: Record<BridgeState, string> = {
  OK: "보유 자료에서 확인했습니다.", NO_RESULTS: "이 보유 버전에 일치하는 결과가 없습니다.",
  LAW_NOT_HELD: "보유하지 않은 법령입니다.", VERSION_NOT_HELD: "보유하지 않은 버전입니다.",
  INVALID_INPUT: "입력 또는 참조 형식을 확인해 주세요.",
  UNSUPPORTED: "특정 날짜의 적용법 판단이나 부칙의 조문번호 조회는 지원하지 않습니다.",
  INTEGRITY_ERROR: "참조 또는 파일 무결성을 확인하지 못했습니다. 다른 버전으로 대체하지 않습니다.",
  SEARCH_FAILED: "보유 파일을 읽지 못했습니다.", ACCESS_DENIED: "이 로컬 화면에 접근할 수 없습니다.",
  NOT_CONFIGURED: "법령 읽기 연결이 꺼져 있거나 설정되지 않았습니다.",
};
