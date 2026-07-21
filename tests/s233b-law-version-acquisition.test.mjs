import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  S233B_EXAM_DATE,
  S233B_LAW_TARGETS,
  S233BLawAcquisitionError,
  acquireS233BLawVersions,
  buildOpenApiEffectiveDateUrl,
  parseOfficialLawXml,
} from "../scripts/s233b-acquire-law-versions.mjs";

const FIXED_ACQUIRED_AT = "2026-07-21T12:00:00.000Z";
const FIXTURE_OC = "fixture-oc-not-a-live-credential";
const MST_BY_SOURCE = new Map(S233B_LAW_TARGETS.map((target, index) => [target.lawSourceId, String(300001 + index)]));
const PROMULGATION_BY_SOURCE = new Map(S233B_LAW_TARGETS.map((target, index) => [target.lawSourceId, String(21001 + index)]));

function sourceSnapshot() {
  return {
    registryVersion: "s233b.qnet.second_round.fixture.v1",
    examDateEvidence: { examDate: S233B_EXAM_DATE },
    coverageUnits: [
      {
        examYear: 2026,
        subject: "law",
        canonicalQuestionMetadata: [
          { questionNo: 1, lawSourceIds: ["law-source-land-compensation-act"] },
          {
            questionNo: 2,
            lawSourceIds: [
              "law-source-admin-litigation-act",
              "law-source-appraiser-act",
              "law-source-real-estate-price-disclosure-act",
            ],
          },
          { questionNo: 3, lawSourceIds: ["law-source-real-estate-price-disclosure-act"] },
        ],
      },
    ],
  };
}

function resolverHtml(target, overrides = {}) {
  const mst = overrides.mst ?? MST_BY_SOURCE.get(target.lawSourceId);
  const promulgationNumber = overrides.promulgationNumber ?? PROMULGATION_BY_SOURCE.get(target.lawSourceId);
  const title = overrides.title ?? target.officialTitleKo;
  const padding = "공식 법령 이력 식별 메타데이터 ".repeat(40);
  return `<!doctype html><html><body>
    <a href="/LSW/lsInfoR.do?lsiSeq=${mst}&lsId=${target.officialLsId}">${title}</a>
    <input name="lsId" value="${target.officialLsId}">
    <h1>${title} [시행 2025. 1. 1.] [법률 제${promulgationNumber}호, 2024. 12. 31., 일부개정]</h1>
    <p>${padding}</p>
  </body></html>`;
}

function lawXml(target, overrides = {}) {
  const mst = overrides.mst ?? MST_BY_SOURCE.get(target.lawSourceId);
  const promulgationNumber = overrides.promulgationNumber ?? PROMULGATION_BY_SOURCE.get(target.lawSourceId);
  const title = overrides.title ?? target.officialTitleKo;
  const body = overrides.body ?? `제1조(목적) ${"검증된 공식 법령 본문 단위 ".repeat(300)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
    <법령 법령키="${mst}">
      <기본정보>
        <법령일련번호>${mst}</법령일련번호>
        <법령ID>${target.officialLsId}</법령ID>
        <법령명_한글><![CDATA[${title}]]></법령명_한글>
        <공포일자>20241231</공포일자>
        <공포번호>${promulgationNumber}</공포번호>
        <시행일자>20250101</시행일자>
        <제개정구분>일부개정</제개정구분>
      </기본정보>
      <조문><조문단위><조문내용><![CDATA[${body}]]></조문내용></조문단위></조문>
    </법령>`;
}

function fixtureTransport({ redirect = false, apiBodyForTarget = null, apiContentType = "application/xml; charset=UTF-8" } = {}) {
  const calls = [];
  const targetByLsId = new Map(S233B_LAW_TARGETS.map((target) => [String(Number(target.officialLsId)), target]));
  const targetByMst = new Map(S233B_LAW_TARGETS.map((target) => [MST_BY_SOURCE.get(target.lawSourceId), target]));
  return {
    calls,
    fetchImpl: async (input, init) => {
      const url = new URL(input);
      calls.push({ url, init });
      if (redirect) {
        return new Response(null, { status: 302, headers: { location: "/LSW/redirected.do" } });
      }
      if (url.pathname === "/LSW/lsInfoP.do") {
        const target = targetByLsId.get(String(Number(url.searchParams.get("lsId"))));
        assert.ok(target);
        return new Response(resolverHtml(target), { status: 200, headers: { "content-type": "text/html; charset=UTF-8" } });
      }
      assert.equal(url.pathname, "/DRF/lawService.do");
      const target = targetByMst.get(url.searchParams.get("MST"));
      assert.ok(target);
      const body = apiBodyForTarget ? apiBodyForTarget(target) : lawXml(target);
      return new Response(body, { status: 200, headers: { "content-type": apiContentType } });
    },
  };
}

test("S233B law acquisition uses only eflaw MST+efYd XML requests and retains no OC", async () => {
  const transport = fixtureTransport();
  const result = await acquireS233BLawVersions({
    sourceSnapshot: sourceSnapshot(),
    acquiredAt: FIXED_ACQUIRED_AT,
    environment: { LAW_OPEN_API_OC: FIXTURE_OC },
    fetchImpl: transport.fetchImpl,
    sleepImpl: async () => {},
  });

  assert.equal(transport.calls.length, 8);
  const serviceCalls = transport.calls.filter(({ url }) => url.pathname === "/DRF/lawService.do");
  assert.equal(serviceCalls.length, 4);
  for (const { url, init } of serviceCalls) {
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "www.law.go.kr");
    assert.equal(url.searchParams.get("target"), "eflaw");
    assert.equal(url.searchParams.get("type"), "XML");
    assert.equal(url.searchParams.get("efYd"), "20260704");
    assert.match(url.searchParams.get("MST"), /^\d+$/u);
    assert.equal(url.searchParams.has("ID"), false);
    assert.equal(url.searchParams.get("OC"), FIXTURE_OC);
    assert.equal(init.redirect, "manual");
  }

  assert.equal(result.versions.length, 4);
  assert.equal(result.acquisition.logicalRequestCount, 8);
  assert.equal(result.acquisition.credentialBearingLogicalRequestCount, 4);
  assert.equal(result.acquisition.attemptCount, 8);
  assert.equal(result.acquisition.credentialBearingAttemptCount, 4);
  assert.equal(result.requestContract.target, "eflaw");
  assert.equal(result.requestContract.historicalIdentifierParameter, "MST");
  assert.equal(result.requestContract.idWithEffectiveDateUsed, false);
  assert.equal(result.requestContract.maximumRedirects, undefined);
  for (const version of result.versions) {
    assert.equal(version.versionStatus, "verified");
    assert.equal(version.examDate, S233B_EXAM_DATE);
    assert.equal(version.officialMst, MST_BY_SOURCE.get(version.lawSourceId));
    assert.match(version.contentHashSha256, /^[a-f0-9]{64}$/u);
    assert.equal(version.responseType, "XML");
  }
  assert.doesNotMatch(JSON.stringify(result), new RegExp(FIXTURE_OC, "u"));
});

test("Open API URL builder rejects missing MST and never creates an ID lookup", () => {
  const target = S233B_LAW_TARGETS[0];
  assert.throws(
    () => buildOpenApiEffectiveDateUrl({ target, effectiveDate: S233B_EXAM_DATE, oc: FIXTURE_OC, lsiSeq: null }),
    (error) => error instanceof S233BLawAcquisitionError && error.code === "S233B_LAW_GO_KR_MST_REQUIRED",
  );
  const url = buildOpenApiEffectiveDateUrl({
    target,
    effectiveDate: S233B_EXAM_DATE,
    oc: FIXTURE_OC,
    lsiSeq: MST_BY_SOURCE.get(target.lawSourceId),
  });
  assert.equal(url.searchParams.has("ID"), false);
});

test("S233B law acquisition rejects every redirect without following it", async () => {
  const transport = fixtureTransport({ redirect: true });
  await assert.rejects(
    acquireS233BLawVersions({
      sourceSnapshot: sourceSnapshot(),
      acquiredAt: FIXED_ACQUIRED_AT,
      environment: { LAW_OPEN_API_OC: FIXTURE_OC },
      fetchImpl: transport.fetchImpl,
      sleepImpl: async () => {},
    }),
    (error) => error instanceof S233BLawAcquisitionError && error.code === "S233B_LAW_GO_KR_REDIRECT_REJECTED",
  );
  assert.equal(transport.calls.length, 1);
});

test("S233B law acquisition rejects HTML masquerading as the requested XML type", async () => {
  const transport = fixtureTransport({
    apiBodyForTarget: () => "<html><body>error</body></html>",
    apiContentType: "text/html; charset=UTF-8",
  });
  await assert.rejects(
    acquireS233BLawVersions({
      sourceSnapshot: sourceSnapshot(),
      acquiredAt: FIXED_ACQUIRED_AT,
      environment: { LAW_OPEN_API_OC: FIXTURE_OC },
      fetchImpl: transport.fetchImpl,
      sleepImpl: async () => {},
    }),
    (error) => error instanceof S233BLawAcquisitionError && error.code === "S233B_LAW_GO_KR_UNEXPECTED_CONTENT_TYPE",
  );
  assert.equal(transport.calls.length, 2);
});

test("S233B XML parser rejects missing or mismatched MST, title, and incomplete bodies", () => {
  const target = S233B_LAW_TARGETS[0];
  const expectedMst = MST_BY_SOURCE.get(target.lawSourceId);
  assert.throws(
    () => parseOfficialLawXml(lawXml(target, { mst: "999999" }), target, { expectedMst, requestedDate: S233B_EXAM_DATE }),
    (error) => error instanceof S233BLawAcquisitionError && error.diagnostics.failureKind === "mst_mismatch_or_missing",
  );
  assert.throws(
    () => parseOfficialLawXml(lawXml(target, { title: "다른 법률" }), target, { expectedMst, requestedDate: S233B_EXAM_DATE }),
    (error) => error instanceof S233BLawAcquisitionError && error.diagnostics.failureKind === "law_title_mismatch",
  );
  assert.throws(
    () => parseOfficialLawXml(lawXml(target, { body: "제1조" }), target, { expectedMst, requestedDate: S233B_EXAM_DATE }),
    (error) => error instanceof S233BLawAcquisitionError && error.code === "S233B_LAW_GO_KR_INCOMPLETE_BODY",
  );
});

test("credential and authenticated request metadata have no source-level logging path", async () => {
  const source = await readFile(new URL("../scripts/s233b-acquire-law-versions.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /searchParams\.set\(["']ID["']/u);
  assert.doesNotMatch(source, /target["']?\s*[,=:]\s*["']law["']/u);
  assert.doesNotMatch(source, /(?:console|process\.(?:stdout|stderr))[^\n]*(?:\boc\b|requestUrl|openApiUrl)/iu);
  assert.doesNotMatch(source, /sha256\s*\(\s*oc\s*\)|\boc\.length\b/iu);
  assert.doesNotMatch(source, /response\.(?:text|json)\(\)[^\n]*(?:stderr|console)/iu);
});
