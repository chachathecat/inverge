export const APP1_LAW_SUBJECT = "감정평가 및 보상법규";
export const APP1_LAW_FIELDS = [
  ["version", "법령 버전 (YYYY-MM-DD)"], ["locator", "조문 위치 (예: Article 10)"],
  ["effectiveFrom", "효력 시작일 (YYYY-MM-DD)"], ["effectiveTo", "효력 종료일 (없으면 없음)"],
  ["applicableAsOf", "문제의 적용일 (YYYY-MM-DD)"], ["currentness", "그 적용일에 적용 가능 여부 (가능 / 불가 / 미확인)"],
  ["blockerCount", "열린 차단 근거 수"],
] as const;
export type App1LawBindingInput = Record<(typeof APP1_LAW_FIELDS)[number][0], string>;
export function emptyApp1LawBinding(): App1LawBindingInput {
  return { version: "", locator: "", effectiveFrom: "", effectiveTo: "", applicableAsOf: "", currentness: "", blockerCount: "" };
}
export function parseApp1LawBinding(value: unknown): App1LawBindingInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("APP1_LAW_BINDING_REQUIRED");
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== APP1_LAW_FIELDS.length || APP1_LAW_FIELDS.some(([key]) => typeof row[key] !== "string" || (row[key] as string).length > 80)) throw Error("APP1_LAW_BINDING_REQUIRED");
  return Object.fromEntries(APP1_LAW_FIELDS.map(([key]) => [key, (row[key] as string).trim()])) as App1LawBindingInput;
}

export const APP1_LAW_SCOPE_NOTICE = "합성 제10조의 출처·버전·적용일만 확인 · 실제 법령의 정확성·현재성·포섭 미검증 · AI 미검토 학습보조";
