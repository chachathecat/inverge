export type LawSearchHit = {
  lawId: string;
  mst?: string;
  title: string;
  shortTitle?: string;
  lawType?: string;
  ministryName?: string;
  promulgationDate?: string | null;
  effectiveDate?: string | null;
  promulgationNumber?: string;
  detailLink?: string;
  raw: Record<string, unknown>;
};

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function normalizeWhitespace(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

export function normalizeLawDate(value: unknown): string | null {
  const normalized = normalizeWhitespace(value).replace(/[^\d]/g, "");

  if (/^\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizeWhitespace(value))) {
    return normalizeWhitespace(value);
  }

  return null;
}

function readString(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    const normalized = normalizeWhitespace(value);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return "";
}

function findLawSearchNodes(parsed: unknown): UnknownRecord[] {
  if (!isRecord(parsed)) {
    return [];
  }

  const root = isRecord(parsed.LawSearch) ? parsed.LawSearch : parsed;
  const candidates = [
    isRecord(root) ? root.law : undefined,
    isRecord(root) ? root.Law : undefined,
    isRecord(root) ? root["법령"] : undefined,
  ];

  for (const candidate of candidates) {
    const nodes = asArray(candidate).filter(isRecord);

    if (nodes.length > 0) {
      return nodes;
    }
  }

  return [];
}

export function extractLawSearchHits(parsed: unknown): LawSearchHit[] {
  const hits: LawSearchHit[] = [];

  for (const node of findLawSearchNodes(parsed)) {
    const lawId = readString(node, ["법령ID", "lawId", "ID", "id"]);
    const mst = readString(node, ["법령일련번호", "MST", "mst"]);
    const title = readString(node, ["법령명한글", "법령명", "lawTitle", "title"]);

    if (!lawId || !title) {
      continue;
    }

    hits.push({
      lawId,
      mst: mst || undefined,
      title,
      shortTitle: readString(node, ["법령약칭명", "shortTitle"]) || undefined,
      lawType: readString(node, ["법령구분명", "lawType"]) || undefined,
      ministryName: readString(node, ["소관부처명", "ministryName"]) || undefined,
      promulgationDate: normalizeLawDate(readString(node, ["공포일자", "promulgationDate"])),
      effectiveDate: normalizeLawDate(readString(node, ["시행일자", "effectiveDate"])),
      promulgationNumber: readString(node, ["공포번호", "promulgationNumber"]) || undefined,
      detailLink: readString(node, ["법령상세링크", "detailLink"]) || undefined,
      raw: node,
    });
  }

  return hits;
}

function normalizeComparableTitle(value: string): string {
  return normalizeWhitespace(value).replace(/\s+/g, "");
}

export function pickExactLaw(hits: LawSearchHit[], title: string): LawSearchHit | null {
  const target = normalizeWhitespace(title);
  const compactTarget = normalizeComparableTitle(target);

  return (
    hits.find((hit) => hit.title === target) ??
    hits.find((hit) => normalizeComparableTitle(hit.title) === compactTarget) ??
    null
  );
}
