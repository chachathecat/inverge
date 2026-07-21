import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

export const S233B_LAW_SNAPSHOT_SCHEMA_VERSION = "s233b.exam_date_law_snapshot.v1";
export const S233B_EXAM_DATE = "2026-07-04";

const LAW_GO_ORIGIN = "https://www.law.go.kr";
const LAW_OPEN_API_OC_ENV = "LAW_OPEN_API_OC";
const APPROVED_OFFICIAL_HOSTS = new Set(["law.go.kr", "www.law.go.kr", "open.law.go.kr"]);
const TRANSIENT_STATUS = 502;
const MAX_TRANSIENT_RETRIES = 1;
const REQUEST_TIMEOUT_MS = 15_000;
const POLITE_INTERVAL_MS = 750;
const RETRY_BACKOFF_MS = Object.freeze([1_500]);
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const MIN_RESOLVER_BODY_LENGTH = 500;
const MIN_NORMALIZED_LAW_BODY_LENGTH = 2_000;
const XML_CONTENT_TYPE_PATTERN = /^(?:application\/(?:[a-z0-9.+-]+\+)?xml|text\/xml)(?:;|$)/u;
const HTML_CONTENT_TYPE_PATTERN = /^(?:text\/html|application\/xhtml\+xml)(?:;|$)/u;

export const S233B_LAW_TARGETS = Object.freeze([
  Object.freeze({
    lawSourceId: "law-source-land-compensation-act",
    officialTitleKo: "공익사업을 위한 토지 등의 취득 및 보상에 관한 법률",
    officialLsId: "009295",
    requiredProvisionMarkers: Object.freeze(["제1조"]),
  }),
  Object.freeze({
    lawSourceId: "law-source-admin-litigation-act",
    officialTitleKo: "행정소송법",
    officialLsId: "001218",
    requiredProvisionMarkers: Object.freeze(["제1조"]),
  }),
  Object.freeze({
    lawSourceId: "law-source-appraiser-act",
    officialTitleKo: "감정평가 및 감정평가사에 관한 법률",
    officialLsId: "012651",
    requiredProvisionMarkers: Object.freeze(["제1조"]),
  }),
  Object.freeze({
    lawSourceId: "law-source-real-estate-price-disclosure-act",
    officialTitleKo: "부동산 가격공시에 관한 법률",
    officialLsId: "001827",
    requiredProvisionMarkers: Object.freeze(["제1조"]),
  }),
]);

export class S233BLawAcquisitionError extends Error {
  constructor(code, message, diagnostics = {}) {
    super(message);
    this.name = "S233BLawAcquisitionError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compactVisibleText(value) {
  return decodeXmlEntities(value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
    .replace(/<[^>]*>/gu, " "))
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function decodeXmlEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, "\"")
    .replace(/&#39;|&apos;/giu, "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function isoDate(year, month, day) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function compactDate(value) {
  const digits = String(value ?? "").replace(/[^0-9]/gu, "");
  if (!/^\d{8}$/u.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function normalizedNumericIdentifier(value) {
  const digits = String(value ?? "").match(/\d+/u)?.[0];
  return digits ? digits.replace(/^0+(?=\d)/u, "") : null;
}

function sameNumericIdentifier(left, right) {
  const normalizedLeft = normalizedNumericIdentifier(left);
  const normalizedRight = normalizedNumericIdentifier(right);
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

function canonicalPublicResolverUrl(target, effectiveDate) {
  const url = new URL("/LSW/lsInfoP.do", LAW_GO_ORIGIN);
  url.searchParams.set("lsId", target.officialLsId);
  url.searchParams.set("efYd", effectiveDate.replaceAll("-", ""));
  return url;
}

function canonicalPublicVersionUrl(lsiSeq, effectiveDate) {
  const url = new URL("/LSW/lsInfoR.do", LAW_GO_ORIGIN);
  url.searchParams.set("ancYnChk", "0");
  url.searchParams.set("chrClsCd", "010202");
  url.searchParams.set("efYd", effectiveDate.replaceAll("-", ""));
  url.searchParams.set("lsiSeq", lsiSeq);
  return url;
}

export function buildOpenApiEffectiveDateUrl({ target, effectiveDate, oc, lsiSeq }) {
  if (!/^\d+$/u.test(String(lsiSeq ?? ""))) {
    throw new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_MST_REQUIRED",
      `Official MST is required for ${target.lawSourceId}`,
    );
  }
  const url = new URL("/DRF/lawService.do", LAW_GO_ORIGIN);
  url.searchParams.set("target", "eflaw");
  url.searchParams.set("type", "XML");
  url.searchParams.set("MST", String(lsiSeq));
  url.searchParams.set("efYd", effectiveDate.replaceAll("-", ""));
  url.searchParams.set("chrClsCd", "010202");
  url.searchParams.set("OC", oc);
  return url;
}

function approvedOcFromEnvironment(environment = process.env) {
  const value = environment[LAW_OPEN_API_OC_ENV];
  if (typeof value !== "string" || value.trim() === "") {
    throw new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_OC_REQUIRED",
      "The official National Law Information Center OC is required",
      { validOcAvailable: false, secretName: LAW_OPEN_API_OC_ENV },
    );
  }
  return value;
}

function validateOfficialUrl(value) {
  const url = value instanceof URL ? new URL(value) : new URL(value);
  if (url.protocol !== "https:" || !APPROVED_OFFICIAL_HOSTS.has(url.hostname)) {
    throw new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_UNAPPROVED_ORIGIN",
      "National Law Information Center request left the approved HTTPS origins",
      { finalOfficialHostname: APPROVED_OFFICIAL_HOSTS.has(url.hostname) ? url.hostname : "unapproved" },
    );
  }
  return url;
}

function endpointFamily(url) {
  if (url.pathname === "/DRF/lawService.do") return "/DRF/lawService.do";
  return `/LSW/${url.pathname.split("/").at(-1)}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function incrementStatus(statusCounts, status) {
  const key = String(status);
  statusCounts[key] = (statusCounts[key] ?? 0) + 1;
}

function safeDiagnostics(transport, url, overrides = {}) {
  return {
    endpointFamily: endpointFamily(url),
    initialScheme: url.protocol.slice(0, -1),
    finalOfficialHostname: transport.lastFinalOfficialHostname ?? url.hostname,
    attempts: transport.attemptCount,
    statusCounts: { ...transport.statusCounts },
    ...overrides,
  };
}

async function readBoundedBody(response, target, contentType) {
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BODY_BYTES) {
    throw new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_INVALID_BODY",
      `Official law body size is invalid for ${target.lawSourceId}`,
    );
  }
  const charset = contentType.match(/charset=([^;\s]+)/iu)?.[1]?.toLowerCase();
  return new TextDecoder(charset === "euc-kr" ? "euc-kr" : "utf-8", { fatal: false }).decode(bytes);
}

async function requestOfficialDocument({
  fetchImpl,
  sleepImpl,
  transport,
  initialUrl,
  target,
  expectedResponseType,
  credentialBearing,
}) {
  const requestUrl = validateOfficialUrl(initialUrl);
  const statusCountsForRequest = {};
  transport.logicalRequestCount += 1;
  if (credentialBearing) transport.credentialBearingLogicalRequestCount += 1;

  for (let retry = 0; retry <= MAX_TRANSIENT_RETRIES; retry += 1) {
    const waitForRateLimit = Math.max(0, POLITE_INTERVAL_MS - (Date.now() - transport.lastRequestAt));
    if (waitForRateLimit > 0) await sleepImpl(waitForRateLimit);
    transport.lastRequestAt = Date.now();
    transport.attemptCount += 1;
    if (credentialBearing) transport.credentialBearingAttemptCount += 1;
    transport.httpRequestCount += 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(requestUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          accept: expectedResponseType === "xml" ? "application/xml,text/xml" : "text/html,application/xhtml+xml",
          "accept-encoding": "gzip, deflate, br",
          "user-agent": "Inverge-S233B-Official-Source-Acquirer/3.0",
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      throw new S233BLawAcquisitionError(
        "S233B_LAW_GO_KR_TRANSPORT_FAILURE",
        `Official law transport failed for ${target.lawSourceId}`,
        safeDiagnostics(transport, requestUrl, { failureKind: error?.name === "AbortError" ? "timeout" : "network" }),
      );
    }
    clearTimeout(timeout);

    incrementStatus(transport.statusCounts, response.status);
    incrementStatus(statusCountsForRequest, response.status);
    transport.lastFinalOfficialHostname = requestUrl.hostname;

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      throw new S233BLawAcquisitionError(
        "S233B_LAW_GO_KR_REDIRECT_REJECTED",
        `Official law redirect was rejected for ${target.lawSourceId}`,
        safeDiagnostics(transport, requestUrl, { statusCountsForRequest, redirectCount: 1 }),
      );
    }

    if (response.status === TRANSIENT_STATUS && retry < MAX_TRANSIENT_RETRIES) {
      await response.body?.cancel();
      await sleepImpl(RETRY_BACKOFF_MS[retry]);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new S233BLawAcquisitionError(
        response.status === TRANSIENT_STATUS
          ? "S233B_LAW_GO_KR_OFFICIAL_ORIGIN_UNAVAILABLE"
          : "S233B_LAW_GO_KR_HTTP_FAILURE",
        `Official law request failed with HTTP ${response.status} for ${target.lawSourceId}`,
        safeDiagnostics(transport, requestUrl, { statusCountsForRequest }),
      );
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const contentTypeAllowed = expectedResponseType === "xml"
      ? XML_CONTENT_TYPE_PATTERN.test(contentType)
      : HTML_CONTENT_TYPE_PATTERN.test(contentType);
    if (!contentTypeAllowed) {
      await response.body?.cancel();
      throw new S233BLawAcquisitionError(
        "S233B_LAW_GO_KR_UNEXPECTED_CONTENT_TYPE",
        `Official law response has an unexpected content type for ${target.lawSourceId}`,
        safeDiagnostics(transport, requestUrl, { expectedResponseType, contentType: contentType.split(";")[0] || "missing" }),
      );
    }

    const body = await readBoundedBody(response, target, contentType);
    transport.successfulResponseCount += 1;
    return {
      body,
      contentType: contentType.split(";")[0],
      finalOfficialHostname: requestUrl.hostname,
    };
  }
  throw new Error("unreachable");
}

function extractTagValue(xml, tagNames) {
  for (const tagName of tagNames) {
    const tag = escapeRegExp(tagName);
    const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "iu"));
    if (match) return compactVisibleText(match[1]);
  }
  return null;
}

function extractAllTagValues(xml, tagName) {
  const tag = escapeRegExp(tagName);
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "giu");
  return [...xml.matchAll(pattern)].map((match) => compactVisibleText(match[1])).filter(Boolean);
}

function failClosedParse(code, target, failureKind) {
  throw new S233BLawAcquisitionError(
    code,
    `Official law response identity or completeness validation failed for ${target.lawSourceId}`,
    { failureKind },
  );
}

export function parseOfficialResolverHtml(html, target) {
  const text = compactVisibleText(html);
  if (text.length < MIN_RESOLVER_BODY_LENGTH
    || /(?:페이지를\s*찾을\s*수\s*없|서비스\s*오류|시스템\s*오류|접근이\s*제한)/u.test(text)
    || /<form[^>]+(?:login|usrLogin)/iu.test(html)) {
    failClosedParse("S233B_LAW_GO_KR_INVALID_RESOLVER", target, "invalid_resolver_body");
  }
  const title = escapeRegExp(target.officialTitleKo);
  const header = text.match(new RegExp(`${title}(?:\\s*\\(\\s*약칭\\s*:[^)]+\\))?\\s*\\[시행\\s+(\\d{4})\\.\\s*(\\d{1,2})\\.\\s*(\\d{1,2})\\.\\]\\s*\\[법률\\s+제(\\d+)호,\\s*(\\d{4})\\.\\s*(\\d{1,2})\\.\\s*(\\d{1,2})\\.,\\s*([^\\]]+)\\]`, "u"));
  const lsiSeq = html.match(/[?&](?:lsiSeq|MST)=(\d+)/iu)?.[1]
    ?? html.match(/(?:name|id)=["'](?:lsiSeq|MST)["'][^>]*value=["'](\d+)["']/iu)?.[1]
    ?? html.match(/(?:lsiSeq|MST)\s*[:=]\s*["']?(\d+)/iu)?.[1];
  const lsId = html.match(/[?&]lsId=([0-9]+)/u)?.[1]
    ?? html.match(/(?:name|id)=["']lsId["'][^>]*value=["']([0-9]+)["']/iu)?.[1]
    ?? html.match(/lsId\s*[:=]\s*["']?([0-9]+)/iu)?.[1];
  if (!header || !lsiSeq || !lsId || !sameNumericIdentifier(lsId, target.officialLsId)) {
    failClosedParse("S233B_LAW_GO_KR_AMBIGUOUS_VERSION", target, "resolver_identity_mismatch");
  }
  return {
    officialTitleKo: target.officialTitleKo,
    effectiveDate: isoDate(header[1], header[2], header[3]),
    promulgationNumber: header[4],
    promulgatedAt: isoDate(header[5], header[6], header[7]),
    amendmentKindKo: header[8].trim(),
    lsiSeq,
    lsId: target.officialLsId,
  };
}

export function parseOfficialLawXml(xml, target, { expectedMst, requestedDate }) {
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)
    || /<(?:html|script)\b/iu.test(xml)
    || !/<(?:법령|Law)(?:\s|>)/u.test(xml)) {
    failClosedParse("S233B_LAW_GO_KR_XML_MASQUERADE", target, "xml_masquerade");
  }
  const normalizedBody = compactVisibleText(xml);
  const title = extractTagValue(xml, ["법령명_한글", "법령명한글", "법령명"]);
  const lsId = extractTagValue(xml, ["법령ID", "ID"]);
  const effectiveDate = compactDate(extractTagValue(xml, ["시행일자"]));
  const promulgatedAt = compactDate(extractTagValue(xml, ["공포일자"]));
  const promulgationNumber = normalizedNumericIdentifier(extractTagValue(xml, ["공포번호"]));
  const amendmentKindKo = extractTagValue(xml, ["제개정구분"]);
  const mstCandidates = [
    extractTagValue(xml, ["법령일련번호", "MST", "lsi_seq", "법령키"]),
    xml.match(/<법령\b[^>]*\b(?:법령키|MST|lsi_seq)=["'](\d+)["']/iu)?.[1] ?? null,
  ].filter(Boolean);
  const mstMatched = mstCandidates.some((candidate) => sameNumericIdentifier(candidate, expectedMst));
  const articleBodies = extractAllTagValues(xml, "조문내용");

  if (title?.replace(/\s+/gu, "") !== target.officialTitleKo.replace(/\s+/gu, "")) {
    failClosedParse("S233B_LAW_GO_KR_IDENTITY_MISMATCH", target, "law_title_mismatch");
  }
  if (!sameNumericIdentifier(lsId, target.officialLsId)) {
    failClosedParse("S233B_LAW_GO_KR_IDENTITY_MISMATCH", target, "law_id_mismatch");
  }
  if (!mstMatched) {
    failClosedParse("S233B_LAW_GO_KR_IDENTITY_MISMATCH", target, "mst_mismatch_or_missing");
  }
  if (!effectiveDate || !promulgatedAt || !promulgationNumber || !amendmentKindKo
    || effectiveDate > requestedDate || promulgatedAt > requestedDate) {
    failClosedParse("S233B_LAW_GO_KR_AMBIGUOUS_VERSION", target, "effective_version_mismatch");
  }
  if (normalizedBody.length < MIN_NORMALIZED_LAW_BODY_LENGTH || articleBodies.length === 0) {
    failClosedParse("S233B_LAW_GO_KR_INCOMPLETE_BODY", target, "incomplete_law_body");
  }
  for (const marker of target.requiredProvisionMarkers) {
    if (!normalizedBody.includes(marker)) {
      failClosedParse("S233B_LAW_GO_KR_INCOMPLETE_BODY", target, "required_provision_missing");
    }
  }
  return {
    officialTitleKo: target.officialTitleKo,
    effectiveDate,
    promulgatedAt,
    promulgationNumber,
    amendmentKindKo,
    lsiSeq: String(expectedMst),
    lsId: target.officialLsId,
    normalizedBody,
    requiredProvisionMarkers: [...target.requiredProvisionMarkers],
  };
}

function sameOfficialVersion(left, right) {
  return sameNumericIdentifier(left.lsiSeq, right.lsiSeq)
    && sameNumericIdentifier(left.lsId, right.lsId)
    && left.effectiveDate === right.effectiveDate
    && left.promulgatedAt === right.promulgatedAt
    && sameNumericIdentifier(left.promulgationNumber, right.promulgationNumber);
}

function assertResolvedForDate(version, target, requestedDate) {
  if (!sameNumericIdentifier(version.lsId, target.officialLsId)
    || version.effectiveDate > requestedDate
    || version.promulgatedAt > requestedDate) {
    failClosedParse("S233B_LAW_GO_KR_AMBIGUOUS_VERSION", target, "not_applicable_to_requested_date");
  }
}

function collectSelectedLawBindings(sourceSnapshot) {
  const lawUnit = sourceSnapshot.coverageUnits?.find((unit) => unit.examYear === 2026 && unit.subject === "law");
  if (!lawUnit) throw new Error("S233B source snapshot has no complete 2026 law paper");
  const selected = lawUnit.canonicalQuestionMetadata?.filter((question) => [1, 2, 3].includes(question.questionNo)) ?? [];
  if (selected.length !== 3) throw new Error("S233B Golden 9 selection requires official law questions 1, 2, and 3");
  const bindings = new Map();
  for (const question of selected) {
    for (const lawSourceId of question.lawSourceIds ?? []) {
      const list = bindings.get(lawSourceId) ?? [];
      list.push(`qnet-appraiser-second-2026-law-q${question.questionNo}`);
      bindings.set(lawSourceId, list);
    }
  }
  const expected = S233B_LAW_TARGETS.map((target) => target.lawSourceId).sort();
  const actual = [...bindings.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Official law-question extraction changed; expected ${expected.join(",")}, received ${actual.join(",")}`);
  }
  return bindings;
}

async function resolveAndAcquireExamDateVersion({ target, oc, fetchImpl, sleepImpl, transport }) {
  const resolverUrl = canonicalPublicResolverUrl(target, S233B_EXAM_DATE);
  const resolverResponse = await requestOfficialDocument({
    fetchImpl,
    sleepImpl,
    transport,
    initialUrl: resolverUrl,
    target,
    expectedResponseType: "html",
    credentialBearing: false,
  });
  const resolverVersion = parseOfficialResolverHtml(resolverResponse.body, target);
  assertResolvedForDate(resolverVersion, target, S233B_EXAM_DATE);

  const openApiUrl = buildOpenApiEffectiveDateUrl({
    target,
    effectiveDate: S233B_EXAM_DATE,
    oc,
    lsiSeq: resolverVersion.lsiSeq,
  });
  const apiResponse = await requestOfficialDocument({
    fetchImpl,
    sleepImpl,
    transport,
    initialUrl: openApiUrl,
    target,
    expectedResponseType: "xml",
    credentialBearing: true,
  });
  const apiVersion = parseOfficialLawXml(apiResponse.body, target, {
    expectedMst: resolverVersion.lsiSeq,
    requestedDate: S233B_EXAM_DATE,
  });
  if (!sameOfficialVersion(resolverVersion, apiVersion)) {
    failClosedParse("S233B_LAW_GO_KR_IDENTITY_MISMATCH", target, "resolver_api_version_mismatch");
  }
  return { version: apiVersion, response: apiResponse };
}

export async function acquireS233BLawVersions({
  sourceSnapshot,
  fetchImpl = globalThis.fetch,
  acquiredAt = new Date().toISOString(),
  outputPath = null,
  environment = process.env,
  sleepImpl = delay,
} = {}) {
  if (sourceSnapshot?.examDateEvidence?.examDate !== S233B_EXAM_DATE) {
    throw new Error(`Law acquisition requires official S233B exam date ${S233B_EXAM_DATE}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(acquiredAt)
    || acquiredAt.slice(0, 10) < S233B_EXAM_DATE) {
    throw new Error("acquiredAt must be a canonical UTC timestamp on or after the S233B exam date");
  }
  if (typeof fetchImpl !== "function" || typeof sleepImpl !== "function") {
    throw new Error("fetchImpl and sleepImpl must be functions");
  }
  const questionBindings = collectSelectedLawBindings(sourceSnapshot);
  const oc = approvedOcFromEnvironment(environment);
  const transport = {
    mode: "public_mst_resolver_then_effective_date_open_api_xml",
    logicalRequestCount: 0,
    credentialBearingLogicalRequestCount: 0,
    httpRequestCount: 0,
    attemptCount: 0,
    credentialBearingAttemptCount: 0,
    successfulResponseCount: 0,
    statusCounts: {},
    lastRequestAt: 0,
    lastFinalOfficialHostname: null,
  };
  const versions = [];

  for (const target of S233B_LAW_TARGETS) {
    const acquired = await resolveAndAcquireExamDateVersion({
      target,
      oc,
      fetchImpl,
      sleepImpl,
      transport,
    });
    const version = acquired.version;
    const lawVersionId = `${target.lawSourceId}:${version.effectiveDate}:${version.promulgationNumber}`;
    versions.push({
      lawVersionId,
      lawSourceId: target.lawSourceId,
      officialTitleKo: target.officialTitleKo,
      jurisdiction: "KR",
      authorityStatus: "official_primary_source",
      versionStatus: "verified",
      examDateApplicability: "applicable_to_exam_date",
      examDate: S233B_EXAM_DATE,
      effectiveDate: version.effectiveDate,
      promulgatedAt: version.promulgatedAt,
      promulgationNumber: version.promulgationNumber,
      amendmentKindKo: version.amendmentKindKo,
      officialLsiSeq: version.lsiSeq,
      officialMst: version.lsiSeq,
      officialLsId: target.officialLsId,
      canonicalVersionUrl: canonicalPublicVersionUrl(version.lsiSeq, S233B_EXAM_DATE).toString(),
      effectiveDateResolverUrl: canonicalPublicResolverUrl(target, S233B_EXAM_DATE).toString(),
      responseType: "XML",
      responseContentType: acquired.response.contentType,
      contentHashSha256: sha256(version.normalizedBody),
      contentNormalizationVersion: "s233b.law_xml_visible_text_nfc_whitespace.v1",
      requiredProvisionMarkersValidated: version.requiredProvisionMarkers,
      acquiredAt,
      rightsDecision: {
        status: "display_by_deep_link",
        authoritySeparatedFromRights: true,
        rawStatuteTextStored: false,
        sourceExcerptStored: false,
        ambiguityConvertedToPermission: false,
      },
      usedByQuestionIds: questionBindings.get(target.lawSourceId),
      transformationProvenance: {
        method: "deterministic_public_mst_resolution_then_official_eflaw_xml_validation",
        rawStatuteTextStored: false,
        sourceExcerptStored: false,
        providerPayloadStored: false,
        llmUsed: false,
        learnerContentUsed: false,
      },
    });
  }

  const registry = {
    schemaVersion: S233B_LAW_SNAPSHOT_SCHEMA_VERSION,
    registryVersion: `s233b.law.exam-date.2026-07-04.${sha256(JSON.stringify(versions.map((version) => version.contentHashSha256))).slice(0, 16)}`,
    acquiredAt,
    examDate: S233B_EXAM_DATE,
    sourceRegistryVersion: sourceSnapshot.registryVersion,
    requestContract: {
      endpointFamily: "/DRF/lawService.do",
      target: "eflaw",
      responseType: "XML",
      historicalIdentifierParameter: "MST",
      mstMeaning: "official_lsi_seq",
      effectiveDateParameter: "efYd",
      effectiveDateValue: "20260704",
      idWithEffectiveDateUsed: false,
      redirectPolicy: "reject_all",
    },
    versions,
    supersessionPolicy: {
      exactEffectiveDateSnapshotsRequired: true,
      currentLawSubstitutionForHistoricalQuestionAllowed: false,
      supersededAndCurrentRelationshipsPreserved: false,
    },
    acquisition: {
      transportMode: transport.mode,
      logicalRequestCount: transport.logicalRequestCount,
      credentialBearingLogicalRequestCount: transport.credentialBearingLogicalRequestCount,
      httpRequestCount: transport.httpRequestCount,
      attemptCount: transport.attemptCount,
      credentialBearingAttemptCount: transport.credentialBearingAttemptCount,
      successfulResponseCount: transport.successfulResponseCount,
      statusCounts: transport.statusCounts,
      approvedOfficialHosts: [...APPROVED_OFFICIAL_HOSTS].sort(),
      initialScheme: "https",
      boundedTimeoutMs: REQUEST_TIMEOUT_MS,
      maximumRedirects: 0,
      transient502MaximumRetries: MAX_TRANSIENT_RETRIES,
      politeMinimumIntervalMs: POLITE_INTERVAL_MS,
      decompressionAccepted: ["br", "deflate", "gzip"],
      validOcAvailable: true,
      ocValuesLoggedOrPersisted: false,
      credentialBearingUrlsLoggedOrPersisted: false,
      rawErrorBodiesLoggedOrPersisted: false,
      rawStatuteTextStored: false,
      sourceExcerptsStored: false,
      providerPayloadStored: false,
      learnerContentIncluded: false,
    },
  };
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return registry;
}

function parseArguments(argv) {
  const args = {
    sourceSnapshotPath: null,
    outputPath: null,
    acquiredAt: process.env.S233B_ACQUIRED_AT ?? new Date().toISOString(),
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source-snapshot") args.sourceSnapshotPath = argv[++index];
    else if (argv[index] === "--output") args.outputPath = argv[++index];
    else if (argv[index] === "--acquired-at") args.acquiredAt = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!args.sourceSnapshotPath || !args.outputPath) throw new Error("--source-snapshot and --output are required");
  return args;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = parseArguments(process.argv.slice(2));
  const sourceSnapshot = JSON.parse(await readFile(args.sourceSnapshotPath, "utf8"));
  try {
    const result = await acquireS233BLawVersions({
      sourceSnapshot,
      acquiredAt: args.acquiredAt,
      outputPath: args.outputPath,
    });
    process.stdout.write(`${JSON.stringify({
      output: args.outputPath,
      logicalRequestCount: result.acquisition.logicalRequestCount,
      credentialBearingLogicalRequestCount: result.acquisition.credentialBearingLogicalRequestCount,
      httpRequestCount: result.acquisition.httpRequestCount,
      attemptCount: result.acquisition.attemptCount,
      credentialBearingAttemptCount: result.acquisition.credentialBearingAttemptCount,
      registryVersion: result.registryVersion,
    })}\n`);
  } catch (error) {
    if (error instanceof S233BLawAcquisitionError) {
      process.stderr.write(`${JSON.stringify({ code: error.code, message: error.message, ...error.diagnostics })}\n`);
      process.exitCode = 1;
    } else {
      process.stderr.write(`${JSON.stringify({
        code: "S233B_LAW_GO_KR_VALIDATION_FAILURE",
        message: "Official law acquisition failed closed before retention",
      })}\n`);
      process.exitCode = 1;
    }
  }
}
