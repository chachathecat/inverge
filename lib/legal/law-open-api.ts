export type LawOpenApiOptions = {
  oc?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  throttleMs?: number;
  searchEndpoint?: string;
  serviceEndpoint?: string;
};

const LAW_SEARCH_ENDPOINT = "https://www.law.go.kr/DRF/lawSearch.do";
const LAW_SERVICE_ENDPOINT = "https://www.law.go.kr/DRF/lawService.do";

function requireOpenApiOc(options?: LawOpenApiOptions): string {
  const oc = options?.oc ?? process.env.LAW_OPEN_API_OC;

  if (!oc) {
    throw new Error("LAW_OPEN_API_OC is required for legal source ingestion.");
  }

  return oc;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestXml(
  endpoint: string,
  params: URLSearchParams,
  options?: LawOpenApiOptions,
): Promise<string> {
  const throttleMs = options?.throttleMs ?? 0;

  if (throttleMs > 0) {
    await sleep(throttleMs);
  }

  const requestUrl = new URL(endpoint);
  requestUrl.search = params.toString();

  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl(requestUrl, {
    method: "GET",
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`LAW Open API request failed with HTTP ${response.status}.`);
  }

  return response.text();
}

export async function searchCurrentLawByTitle(
  title: string,
  options?: LawOpenApiOptions & { display?: number; page?: number },
): Promise<string> {
  const params = new URLSearchParams({
    OC: requireOpenApiOc(options),
    target: "law",
    type: "XML",
    query: title,
    display: String(options?.display ?? 20),
    page: String(options?.page ?? 1),
  });

  return requestXml(options?.searchEndpoint ?? LAW_SEARCH_ENDPOINT, params, options);
}

export async function fetchCurrentLawBodyById(
  lawId: string,
  options?: LawOpenApiOptions,
): Promise<string> {
  const params = new URLSearchParams({
    OC: requireOpenApiOc(options),
    target: "law",
    type: "XML",
    ID: lawId,
  });

  return requestXml(options?.serviceEndpoint ?? LAW_SERVICE_ENDPOINT, params, options);
}

export function normalizeArticleJo(jo: string): string {
  const trimmed = jo.trim();

  if (/^\d{6}$/.test(trimmed)) {
    return trimmed;
  }

  const KoreanArticleMatch = trimmed.match(/(\d+)\s*조(?:의\s*(\d+))?/);

  if (KoreanArticleMatch) {
    const article = KoreanArticleMatch[1].padStart(4, "0");
    const branch = (KoreanArticleMatch[2] ?? "0").padStart(2, "0");
    return `${article}${branch}`;
  }

  const numeric = trimmed.replace(/[^\d]/g, "");

  if (numeric.length > 0 && numeric.length <= 4) {
    return `${numeric.padStart(4, "0")}00`;
  }

  return numeric.padStart(6, "0").slice(-6);
}

export async function fetchCurrentLawArticleById(
  lawId: string,
  jo: string,
  options?: LawOpenApiOptions,
): Promise<string> {
  const params = new URLSearchParams({
    OC: requireOpenApiOc(options),
    target: "law",
    type: "XML",
    ID: lawId,
    JO: normalizeArticleJo(jo),
  });

  return requestXml(options?.serviceEndpoint ?? LAW_SERVICE_ENDPOINT, params, options);
}
