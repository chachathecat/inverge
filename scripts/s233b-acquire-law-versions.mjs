import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

export const S233B_LAW_SNAPSHOT_SCHEMA_VERSION = "s233b.exam_date_law_snapshot.v1";
export const S233B_EXAM_DATE = "2026-07-04";

const LAW_GO_ORIGIN = "https://www.law.go.kr";
const LAW_OPEN_API_OC_ENV = "LAW_OPEN_API_OC";
const APPROVED_OFFICIAL_HOSTS = new Set(["law.go.kr", "www.law.go.kr", "open.law.go.kr"]);
const TRANSIENT_STATUS = 502;
const MAX_TRANSIENT_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const POLITE_INTERVAL_MS = 750;
const RETRY_BACKOFF_MS = Object.freeze([750, 1_500, 3_000]);
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const MIN_NORMALIZED_BODY_LENGTH = 2_000;
const TARGETS = Object.freeze([
  {
    lawSourceId: "law-source-land-compensation-act",
    officialTitleKo: "공익사업을 위한 토지 등의 취득 및 보상에 관한 법률",
    officialLsId: "009295",
    requiredProvisionMarkers: ["제1조"],
  },
  {
    lawSourceId: "law-source-admin-litigation-act",
    officialTitleKo: "행정소송법",
    officialLsId: "001218",
    requiredProvisionMarkers: ["제1조"],
  },
  {
    lawSourceId: "law-source-appraiser-act",
    officialTitleKo: "감정평가 및 감정평가사에 관한 법률",
    officialLsId: "012651",
    requiredProvisionMarkers: ["제1조"],
  },
  {
    lawSourceId: "law-source-real-estate-price-disclosure-act",
    officialTitleKo: "부동산 가격공시에 관한 법률",
    officialLsId: "001827",
    requiredProvisionMarkers: ["제1조"],
  },
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

function compactText(value) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, "\"")
    .replace(/&#39;|&apos;/giu, "'")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function isoDate(year, month, day) {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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

function openApiVersionUrl(target, effectiveDate, oc, lsiSeq = null) {
  const url = new URL("/DRF/lawService.do", LAW_GO_ORIGIN);
  url.searchParams.set(lsiSeq ? "MST" : "ID", lsiSeq ?? target.officialLsId);
  url.searchParams.set("OC", oc);
  url.searchParams.set("efYd", effectiveDate.replaceAll("-", ""));
  url.searchParams.set("mobileYn", "Y");
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "HTML");
  return url;
}

function approvedOcFromEnvironment(environment = process.env) {
  const oc = environment[LAW_OPEN_API_OC_ENV]?.trim();
  if (!oc) return null;
  if (/^(?:test|demo|sample|placeholder|changeme)$/iu.test(oc) || oc.length > 200 || /[\s/?#&=]/u.test(oc)) {
    throw new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_OC_REQUIRED",
      `${LAW_OPEN_API_OC_ENV} is present but is not an approved National Law Information Center OC`,
      { validOcAvailable: false, secretName: LAW_OPEN_API_OC_ENV },
    );
  }
  return oc;
}

function validateOfficialUrl(value) {
  const url = value instanceof URL ? new URL(value) : new URL(value);
  if (url.protocol !== "https:" || !APPROVED_OFFICIAL_HOSTS.has(url.hostname)) {
    throw new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_UNAPPROVED_REDIRECT",
      "National Law Information Center request left the approved HTTPS origins",
      { finalOfficialHostname: APPROVED_OFFICIAL_HOSTS.has(url.hostname) ? url.hostname : "unapproved" },
    );
  }
  return url;
}

function endpointFamily(url) {
  return url.pathname.startsWith("/DRF/")
    ? "DRF/lawService.do"
    : `LSW/${url.pathname.split("/").at(-1)}`;
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
    redirectCount: transport.lastRedirectCount ?? 0,
    attempts: transport.attemptCount,
    statusCounts: { ...transport.statusCounts },
    validOcAvailable: transport.validOcAvailable,
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

async function requestOfficialHtml({ fetchImpl, sleepImpl, transport, initialUrl, target, requireLawBody = true }) {
  const requestUrl = validateOfficialUrl(initialUrl);
  const statusCountsForRequest = {};
  transport.logicalRequestCount += 1;

  for (let retry = 0; retry <= MAX_TRANSIENT_RETRIES; retry += 1) {
    const waitForRateLimit = Math.max(0, POLITE_INTERVAL_MS - (Date.now() - transport.lastRequestAt));
    if (waitForRateLimit > 0) await sleepImpl(waitForRateLimit);
    transport.lastRequestAt = Date.now();
    transport.attemptCount += 1;

    let currentUrl = requestUrl;
    let redirectCount = 0;
    while (true) {
      transport.httpRequestCount += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response;
      try {
        response = await fetchImpl(currentUrl, {
          method: "GET",
          redirect: "manual",
          headers: {
            accept: "text/html,application/xhtml+xml",
            "accept-encoding": "gzip, deflate, br",
            "user-agent": "Inverge-S233B-Official-Source-Acquirer/2.0",
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
      transport.lastFinalOfficialHostname = currentUrl.hostname;
      transport.lastRedirectCount = redirectCount;

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location || redirectCount >= MAX_REDIRECTS) {
          throw new S233BLawAcquisitionError(
            "S233B_LAW_GO_KR_REDIRECT_FAILURE",
            `Official law redirect chain is invalid for ${target.lawSourceId}`,
            safeDiagnostics(transport, requestUrl),
          );
        }
        currentUrl = validateOfficialUrl(new URL(location, currentUrl));
        redirectCount += 1;
        continue;
      }

      if (response.status === TRANSIENT_STATUS && retry < MAX_TRANSIENT_RETRIES) {
        await response.body?.cancel();
        await sleepImpl(RETRY_BACKOFF_MS[retry]);
        break;
      }

      if (response.status === TRANSIENT_STATUS) {
        await response.body?.cancel();
        throw new S233BLawAcquisitionError(
          "S233B_LAW_GO_KR_OFFICIAL_ORIGIN_UNAVAILABLE",
          `Official law origin returned repeated HTTP ${TRANSIENT_STATUS} for ${target.lawSourceId}`,
          safeDiagnostics(transport, requestUrl, { statusCountsForRequest }),
        );
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new S233BLawAcquisitionError(
          "S233B_LAW_GO_KR_HTTP_FAILURE",
          `Official law request failed with HTTP ${response.status} for ${target.lawSourceId}`,
          safeDiagnostics(transport, requestUrl, { statusCountsForRequest }),
        );
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/u.test(contentType)) {
        await response.body?.cancel();
        throw new S233BLawAcquisitionError(
          "S233B_LAW_GO_KR_UNEXPECTED_CONTENT_TYPE",
          `Official law response has an unexpected content type for ${target.lawSourceId}`,
          safeDiagnostics(transport, requestUrl, { contentType: contentType.split(";")[0] || "missing" }),
        );
      }

      const html = await readBoundedBody(response, target, contentType);
      const normalizedBody = compactText(html);
      const loginPage = /<form[^>]+(?:login|usrLogin)/iu.test(html);
      if (normalizedBody.length < (requireLawBody ? MIN_NORMALIZED_BODY_LENGTH : 500)
        || /(?:페이지를\s*찾을\s*수\s*없|서비스\s*오류|시스템\s*오류|접근이\s*제한)/u.test(normalizedBody)
        || loginPage) {
        throw new S233BLawAcquisitionError(
          "S233B_LAW_GO_KR_INVALID_BODY",
          `Official law response is empty, partial, an error page, or a login page for ${target.lawSourceId}`,
          safeDiagnostics(transport, requestUrl, { failureKind: loginPage ? "credential_gate" : "invalid_body" }),
        );
      }

      transport.successfulResponseCount += 1;
      return {
        html,
        normalizedBody,
        contentHashSha256: sha256(normalizedBody),
        redirectCount,
        finalOfficialHostname: currentUrl.hostname,
        contentType: contentType.split(";")[0],
      };
    }
  }
  throw new Error("unreachable");
}

function sameOfficialVersion(left, right) {
  return left.lsiSeq === right.lsiSeq
    && left.lsId === right.lsId
    && left.effectiveDate === right.effectiveDate
    && left.promulgatedAt === right.promulgatedAt
    && left.promulgationNumber === right.promulgationNumber;
}

function assertResolvedForDate(version, target, requestedDate) {
  if (version.lsId !== target.officialLsId) {
    throw new Error(`${target.lawSourceId} resolved to an unexpected official law ID`);
  }
  if (version.effectiveDate > requestedDate || version.promulgatedAt > requestedDate) {
    throw new Error(`${target.lawSourceId} resolved to a version not yet in force on ${requestedDate}`);
  }
}

function credentialRequired(error, transport) {
  const credentialStatus = error?.diagnostics?.statusCountsForRequest?.["401"]
    || error?.diagnostics?.statusCountsForRequest?.["403"];
  if (!transport.ocConfigured && (credentialStatus || error?.diagnostics?.failureKind === "credential_gate")) {
    return new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_OC_REQUIRED",
      "The official National Law Information Center route requires an approved OC and no verified OC is configured",
      {
        validOcAvailable: false,
        secretName: LAW_OPEN_API_OC_ENV,
        applicationUrl: "https://open.law.go.kr/LSO/main.do",
        resumesWithoutCodeChanges: true,
      },
    );
  }
  return error;
}

function publicHistoricalBodyRequiresOc(error, transport) {
  if (!transport.ocConfigured && error instanceof S233BLawAcquisitionError
    && error.code === "S233B_LAW_GO_KR_INVALID_BODY") {
    return new S233BLawAcquisitionError(
      "S233B_LAW_GO_KR_OC_REQUIRED",
      "The public official resolver exposes the exact historical identity, but its complete law body is unavailable without the approved Open API path",
      {
        endpointFamily: error.diagnostics?.endpointFamily ?? "LSW/lsInfoR.do",
        validOcAvailable: false,
        secretName: LAW_OPEN_API_OC_ENV,
        applicationUrl: "https://open.law.go.kr/LSO/main.do",
        resumesWithoutCodeChanges: true,
      },
    );
  }
  return error;
}

async function resolveVersionAtDate({ target, requestedDate, oc, fetchImpl, sleepImpl, transport }) {
  const resolverUrl = oc
    ? openApiVersionUrl(target, requestedDate, oc)
    : canonicalPublicResolverUrl(target, requestedDate);
  let response;
  try {
    response = await requestOfficialHtml({
      fetchImpl,
      sleepImpl,
      transport,
      initialUrl: resolverUrl,
      target,
      requireLawBody: Boolean(oc),
    });
  } catch (error) {
    throw credentialRequired(error, transport);
  }
  const version = parseOfficialLawPage(response.html, target, { requireProvisionMarkers: Boolean(oc) });
  assertResolvedForDate(version, target, requestedDate);
  if (oc) transport.validOcAvailable = true;
  return { version, response };
}

async function fetchImmutableVersion({ target, requestedDate, version, oc, fetchImpl, sleepImpl, transport }) {
  const immutableUrl = oc
    ? openApiVersionUrl(target, requestedDate, oc, version.lsiSeq)
    : canonicalPublicVersionUrl(version.lsiSeq, requestedDate);
  let response;
  try {
    response = await requestOfficialHtml({ fetchImpl, sleepImpl, transport, initialUrl: immutableUrl, target });
  } catch (error) {
    throw publicHistoricalBodyRequiresOc(error, transport);
  }
  const immutable = parseOfficialLawPage(response.html, target);
  if (!sameOfficialVersion(version, immutable)) {
    throw new Error(`${target.lawSourceId} immutable historical identifier does not match the effective-date resolver`);
  }
  return { version: immutable, response };
}

export function parseOfficialLawPage(html, target, { requireProvisionMarkers = true } = {}) {
  const text = compactText(html);
  const title = escapeRegExp(target.officialTitleKo);
  const header = text.match(new RegExp(`${title}(?:\\s*\\(\\s*약칭\\s*:[^)]+\\))?\\s*\\[시행\\s+(\\d{4})\\.\\s*(\\d{1,2})\\.\\s*(\\d{1,2})\\.\\]\\s*\\[법률\\s+제(\\d+)호,\\s*(\\d{4})\\.\\s*(\\d{1,2})\\.\\s*(\\d{1,2})\\.,\\s*([^\\]]+)\\]`, "u"));
  if (!header) throw new Error(`Official law page does not expose the pinned header for ${target.lawSourceId}`);
  const lsiSeq = html.match(/[?&]lsiSeq=(\d+)/u)?.[1]
    ?? html.match(/(?:name|id)=["']lsiSeq["'][^>]*value=["'](\d+)["']/iu)?.[1]
    ?? html.match(/lsiSeq\s*[:=]\s*["']?(\d+)/iu)?.[1];
  const lsId = html.match(/[?&]lsId=([0-9]+)/u)?.[1]
    ?? html.match(/(?:name|id)=["']lsId["'][^>]*value=["']([0-9]+)["']/iu)?.[1]
    ?? html.match(/lsId\s*[:=]\s*["']?([0-9]+)/iu)?.[1];
  if (!lsiSeq) throw new Error(`Official law page does not expose lsiSeq for ${target.lawSourceId}`);
  if (requireProvisionMarkers) {
    for (const marker of target.requiredProvisionMarkers) {
      if (!text.includes(marker)) {
        throw new Error(`Official law page does not expose required provision marker ${marker} for ${target.lawSourceId}`);
      }
    }
  }
  return {
    effectiveDate: isoDate(header[1], header[2], header[3]),
    promulgationNumber: header[4],
    promulgatedAt: isoDate(header[5], header[6], header[7]),
    amendmentKindKo: header[8].trim(),
    lsiSeq,
    lsId: lsId ?? target.officialLsId,
    requiredProvisionMarkers: requireProvisionMarkers ? [...target.requiredProvisionMarkers] : [],
  };
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
  const expected = TARGETS.map((target) => target.lawSourceId).sort();
  const actual = [...bindings.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Official law-question extraction changed; expected ${expected.join(",")}, received ${actual.join(",")}`);
  }
  return bindings;
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
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(acquiredAt)) {
    throw new Error("acquiredAt must be a canonical UTC ISO-8601 timestamp");
  }
  const acquisitionDate = acquiredAt.slice(0, 10);
  if (acquisitionDate < S233B_EXAM_DATE) {
    throw new Error("acquiredAt cannot precede the S233B exam date");
  }
  if (typeof fetchImpl !== "function" || typeof sleepImpl !== "function") {
    throw new Error("fetchImpl and sleepImpl must be functions");
  }
  const questionBindings = collectSelectedLawBindings(sourceSnapshot);
  const oc = approvedOcFromEnvironment(environment);
  const transport = {
    mode: oc ? "open_api_with_configured_oc" : "public_html_no_credential",
    ocConfigured: Boolean(oc),
    validOcAvailable: false,
    logicalRequestCount: 0,
    httpRequestCount: 0,
    attemptCount: 0,
    successfulResponseCount: 0,
    statusCounts: {},
    lastRequestAt: 0,
    lastFinalOfficialHostname: null,
    lastRedirectCount: 0,
  };
  const versions = [];

  for (const target of TARGETS) {
    const examResolved = await resolveVersionAtDate({
      target, requestedDate: S233B_EXAM_DATE, oc, fetchImpl, sleepImpl, transport,
    });
    const examImmutable = await fetchImmutableVersion({
      target,
      requestedDate: S233B_EXAM_DATE,
      version: examResolved.version,
      oc,
      fetchImpl,
      sleepImpl,
      transport,
    });
    const applicable = examImmutable.version;

    const currentResolved = acquisitionDate === S233B_EXAM_DATE
      ? examResolved
      : await resolveVersionAtDate({
        target, requestedDate: acquisitionDate, oc, fetchImpl, sleepImpl, transport,
      });
    const currentImmutable = currentResolved.version.lsiSeq === applicable.lsiSeq
      ? examImmutable
      : await fetchImmutableVersion({
        target,
        requestedDate: acquisitionDate,
        version: currentResolved.version,
        oc,
        fetchImpl,
        sleepImpl,
        transport,
      });
    const current = currentImmutable.version;
    const applicableLawVersionId = `${target.lawSourceId}@${applicable.effectiveDate}#${applicable.promulgationNumber}`;
    const currentLawVersionId = `${target.lawSourceId}@${current.effectiveDate}#${current.promulgationNumber}`;
    const sameAsCurrent = applicableLawVersionId === currentLawVersionId && applicable.lsiSeq === current.lsiSeq;

    versions.push({
      lawVersionId: applicableLawVersionId,
      lawSourceId: target.lawSourceId,
      officialTitleKo: target.officialTitleKo,
      jurisdiction: "KR",
      authorityStatus: "official_primary_source",
      versionStatus: "verified",
      examDateApplicability: "applicable_to_exam_date",
      examDate: S233B_EXAM_DATE,
      effectiveDate: applicable.effectiveDate,
      promulgatedAt: applicable.promulgatedAt,
      promulgationNumber: applicable.promulgationNumber,
      amendmentKindKo: applicable.amendmentKindKo,
      officialLsiSeq: applicable.lsiSeq,
      officialLsId: target.officialLsId,
      canonicalVersionUrl: canonicalPublicVersionUrl(applicable.lsiSeq, S233B_EXAM_DATE).toString(),
      effectiveDateResolverUrl: canonicalPublicResolverUrl(target, S233B_EXAM_DATE).toString(),
      contentHashSha256: examImmutable.response.contentHashSha256,
      contentNormalizationVersion: "s233b.law_html_visible_text_nfc_whitespace.v1",
      requiredProvisionMarkersValidated: applicable.requiredProvisionMarkers,
      acquiredAt,
      currentRelationship: {
        relationshipStatus: sameAsCurrent ? "current_at_exam_date_and_acquisition" : "superseded_after_exam_date",
        supersedesLawVersionId: null,
        supersededByLawVersionId: sameAsCurrent ? null : currentLawVersionId,
        currentLawVersionId,
        currentEffectiveDate: current.effectiveDate,
        currentPromulgationNumber: current.promulgationNumber,
        currentOfficialLsiSeq: current.lsiSeq,
        currentContentHashSha256: currentImmutable.response.contentHashSha256,
      },
      rightsDecision: {
        status: "display_by_deep_link",
        authoritySeparatedFromRights: true,
        rawStatuteTextStored: false,
        sourceExcerptStored: false,
        ambiguityConvertedToPermission: false,
      },
      usedByQuestionIds: questionBindings.get(target.lawSourceId),
      transformationProvenance: {
        method: oc
          ? "deterministic_official_open_api_effective_date_and_immutable_version_validation"
          : "deterministic_public_official_html_effective_date_and_immutable_version_validation",
        rawStatuteTextStored: false,
        sourceExcerptStored: false,
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
    versions,
    supersessionPolicy: {
      exactEffectiveDateSnapshotsRequired: true,
      currentLawSubstitutionForHistoricalQuestionAllowed: false,
      supersededAndCurrentRelationshipsPreserved: true,
    },
    acquisition: {
      transportMode: transport.mode,
      logicalRequestCount: transport.logicalRequestCount,
      httpRequestCount: transport.httpRequestCount,
      attemptCount: transport.attemptCount,
      successfulResponseCount: transport.successfulResponseCount,
      statusCounts: transport.statusCounts,
      approvedOfficialHosts: [...APPROVED_OFFICIAL_HOSTS].sort(),
      initialScheme: "https",
      boundedTimeoutMs: REQUEST_TIMEOUT_MS,
      maximumRedirects: MAX_REDIRECTS,
      transient502MaximumRetries: MAX_TRANSIENT_RETRIES,
      politeMinimumIntervalMs: POLITE_INTERVAL_MS,
      decompressionAccepted: ["br", "deflate", "gzip"],
      validOcAvailable: transport.validOcAvailable,
      ocConfigured: transport.ocConfigured,
      ocValuesLoggedOrPersisted: false,
      rawStatuteTextStored: false,
      sourceExcerptsStored: false,
      learnerContentIncluded: false,
    },
  };
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return registry;
}

function parseArguments(argv) {
  const args = { sourceSnapshotPath: null, outputPath: null, acquiredAt: process.env.S233B_ACQUIRED_AT ?? new Date().toISOString() };
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
    const result = await acquireS233BLawVersions({ sourceSnapshot, acquiredAt: args.acquiredAt, outputPath: args.outputPath });
    process.stdout.write(`${JSON.stringify({
      output: args.outputPath,
      logicalRequestCount: result.acquisition.logicalRequestCount,
      httpRequestCount: result.acquisition.httpRequestCount,
      registryVersion: result.registryVersion,
    })}\n`);
  } catch (error) {
    if (error instanceof S233BLawAcquisitionError) {
      process.stderr.write(`${JSON.stringify({ code: error.code, message: error.message, ...error.diagnostics })}\n`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
}
