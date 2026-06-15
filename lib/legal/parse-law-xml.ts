import { isRecord, normalizeWhitespace } from "./legal-normalizer";

type UnknownRecord = Record<string, unknown>;

export type LegalArticleChunk = {
  lawTitle: string;
  articleNo: string;
  articleTitle?: string;
  bodyText: string;
  normalizedText: string;
  embeddingText: string;
  metadata: {
    provider: "moleg_law_open_api";
    sourceKind: "current_law_article";
    joNumber?: string;
    joBranchNumber?: string;
    joKey?: string;
  };
};

const ARTICLE_TEXT_KEYS = new Set([
  "조문내용",
  "항내용",
  "호내용",
  "목내용",
  "articleText",
  "paragraphText",
  "subparagraphText",
]);

function readString(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const normalized = normalizeWhitespace(record[key]);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return "";
}

function findFirstStringByKeys(value: unknown, keys: string[]): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKeys(item, keys);

      if (found) {
        return found;
      }
    }

    return "";
  }

  if (!isRecord(value)) {
    return "";
  }

  const direct = readString(value, keys);

  if (direct) {
    return direct;
  }

  for (const child of Object.values(value)) {
    const found = findFirstStringByKeys(child, keys);

    if (found) {
      return found;
    }
  }

  return "";
}

function hasArticleShape(record: UnknownRecord): boolean {
  const articleNumber = readString(record, ["조문번호", "articleNo"]);
  const articleBody = readString(record, ["조문내용", "articleText"]);

  return articleNumber.length > 0 && articleBody.length > 0;
}

function collectArticleNodes(value: unknown, output: UnknownRecord[] = []): UnknownRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectArticleNodes(item, output);
    }

    return output;
  }

  if (!isRecord(value)) {
    return output;
  }

  if (hasArticleShape(value)) {
    output.push(value);
    return output;
  }

  for (const child of Object.values(value)) {
    collectArticleNodes(child, output);
  }

  return output;
}

function collectTextLines(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextLines(item, output);
    }

    return output;
  }

  if (!isRecord(value)) {
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    if (ARTICLE_TEXT_KEYS.has(key)) {
      const line = normalizeWhitespace(child);

      if (line) {
        output.push(line);
      }
    }

    collectTextLines(child, output);
  }

  return output;
}

function formatArticleNo(record: UnknownRecord): string {
  const base = readString(record, ["조문번호", "articleNo"]);
  const branch = readString(record, ["조문가지번호", "articleBranchNo"]);

  if (!base) {
    return "";
  }

  if (branch && branch !== "0" && branch !== "00") {
    return `제${base}조의${branch}`;
  }

  if (/^제.+조/.test(base)) {
    return base;
  }

  return `제${base}조`;
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const line of lines) {
    if (!seen.has(line)) {
      seen.add(line);
      deduped.push(line);
    }
  }

  return deduped;
}

export function extractArticleChunks(parsed: unknown): LegalArticleChunk[] {
  const lawTitle =
    findFirstStringByKeys(parsed, ["법령명_한글", "법령명한글", "lawTitle"]) || "unknown_law";
  const articleNodes = collectArticleNodes(parsed);
  const seen = new Set<string>();
  const chunks: LegalArticleChunk[] = [];

  for (const articleNode of articleNodes) {
    const articleNo = formatArticleNo(articleNode);
    const articleTitle = readString(articleNode, ["조문제목", "articleTitle"]) || undefined;
    const bodyText = dedupeLines(collectTextLines(articleNode)).join("\n");
    const normalizedText = normalizeWhitespace(bodyText);

    if (!articleNo || !normalizedText) {
      continue;
    }

    const identity = `${articleNo}\n${normalizedText}`;

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);

    const heading = [lawTitle, articleNo, articleTitle].filter(Boolean).join(" ");

    chunks.push({
      lawTitle,
      articleNo,
      articleTitle,
      bodyText,
      normalizedText,
      embeddingText: `${heading}\n${normalizedText}`,
      metadata: {
        provider: "moleg_law_open_api",
        sourceKind: "current_law_article",
        joNumber: readString(articleNode, ["조문번호", "articleNo"]) || undefined,
        joBranchNumber: readString(articleNode, ["조문가지번호", "articleBranchNo"]) || undefined,
        joKey: readString(articleNode, ["조문키", "joKey"]) || undefined,
      },
    });
  }

  return chunks;
}
