import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import { Readable } from "node:stream";
import test from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

import * as qfI1 from "../lib/question-foundry/runtime/qf-i1-bank-first.ts";
import * as chronologyCore from "../lib/question-foundry/chronology/chronology-core.ts";
import * as repairContract from "../lib/review-os/trusted-repair-contract.ts";
import * as ownerAllowlist from "../lib/review-os/trusted-repair-owner-allowlist.ts";

const route = readFileSync(
  new URL("../app/api/core-blitz/qf-i1/select/route.ts", import.meta.url),
  "utf8",
);

test("QF-I1 selector module has one callable bank-first authority and the route resolves it explicitly", () => {
  const callable = Object.entries(qfI1).filter(
    ([name, value]) =>
      typeof value === "function" &&
      /(?:qf.*i1|bank.*first|first.*bank)/iu.test(name),
  );
  assert.ok(callable.length >= 1, "missing QF-I1 bank-first selector export");
  const explicit = callable.filter(([name]) => route.includes(`\"${name}\"`));
  assert.ok(
    explicit.length >= 1 || callable.length === 1,
    `route cannot resolve exports: ${callable.map(([name]) => name).join(", ")}`,
  );
});

test("owner selector endpoint is fail-closed and cannot activate persistence or providers", () => {
  for (const token of [
    "requireTrustedRepairAccess",
    "MAX_REQUEST_BYTES",
    "QF_I1_REQUEST_TOO_LARGE",
    "QF_I1_INVALID_INPUT",
    "QF_I1_OWNER_AUTHORITY_REQUIRED",
    "Cache-Control",
    "no-store",
    "persisted: false",
    "providerExecution: false",
    "generatedContentMaximumAuthority: \"LEARNING_ONLY\"",
    "verifiedTransferAdmissionForGeneratedContent: false",
    "measurementAdmissionForGeneratedContent: false",
    "rawGeneratedBodyMetadataPersistence: false",
    "productionActivation: false",
    "remoteMutation: false",
  ]) {
    assert.ok(route.includes(token), `missing ${token}`);
  }
  assert.doesNotMatch(route, /createSupabase|from\(|\.insert\(|\.update\(|\.upsert\(|fetch\(/u);
});

test("endpoint never accepts an unbounded or array request body", () => {
  assert.match(route, /length > MAX_REQUEST_BYTES/u);
  assert.ok(
    route.includes(
      '!input || typeof input !== "object" || Array.isArray(input)',
    ),
  );
});

// Execute the production route, access guard and selector. Only the framework
// response/session ports and an isolated env object are injected; no real flag,
// database, provider, deployment setting or learner data is accessed.
function loadModule(relativePath, dependencies, env) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: relativePath,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  assert.equal((compiled.diagnostics ?? []).filter(
    (entry) => entry.category === ts.DiagnosticCategory.Error,
  ).length, 0);
  const exports = {};
  runInThisContext(`(function(require, exports, process) {\n${compiled.outputText}\n})`, {
    filename: relativePath,
  })((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
    return dependencies[name];
  }, exports, { env });
  return exports;
}

function harness({ env: overrides = {}, session: sessionOverrides = {} } = {}) {
  const env = {
    NODE_ENV: "test",
    CORE_BLITZ_QF_I1_ENABLED: "true",
    [repairContract.TRUSTED_REPAIR_FLAG]: "true",
    ALPHA_ADMIN_EMAILS: "owner@example.invalid",
    WCV_C2R_C_P_OWNER_EMAILS: "owner@example.invalid",
    ...overrides,
  };
  const calls = [];
  const access = loadModule("lib/review-os/trusted-repair-access.ts", {
    "server-only": {},
    "@/lib/auth/session": {
      getServerSessionUser: async () => {
        calls.push("session");
        return {
          authEnabled: true, isAuthenticated: true, isDemo: false,
          userId: "synthetic-owner", email: "owner@example.invalid",
          ...sessionOverrides,
        };
      },
    },
    "./trusted-repair-contract": repairContract,
    "./trusted-repair-owner-allowlist": ownerAllowlist,
  }, env);
  const routeModule = loadModule("app/api/core-blitz/qf-i1/select/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "@/lib/review-os/trusted-repair-access": access,
    "@/lib/question-foundry/runtime/qf-i1-bank-first": {
      ...qfI1,
      selectQfI1BankFirstAssignmentV1: (input) => {
        calls.push("selector");
        return qfI1.selectQfI1BankFirstAssignmentV1(input);
      },
    },
  }, env);
  return { post: routeModule.POST, calls };
}

function validInput() {
  return {
    purpose: "LEARNING_PRACTICE",
    learnerScopeId: "synthetic-owner",
    sourceCandidateId: "synthetic-source",
    sourceFamilyId: "synthetic-family",
    sourceSurfaceId: "synthetic-surface",
    asOf: "2026-09-06T00:00:00.000Z",
    candidates: [], exposures: [],
  };
}

function learningCandidate(overrides = {}) {
  return {
    candidateId: "synthetic-learning-candidate", candidateDigest: `sha256:${"a".repeat(64)}`,
    familyId: "synthetic-learning-family", surfaceId: "synthetic-learning-surface",
    bankClass: "LEARNING_PRACTICE", origin: "BANK_STOCK", contentAuthority: "LEARNING_ONLY",
    rightsStatus: "VERIFIED", sourceStatus: "CURRENT", releaseChainComplete: false,
    unseenEligibilitySnapshotSealed: false, nonSameSurfaceAsSource: false, familyIsolated: false,
    calibrationState: "UNASSESSED", timedProtocolBound: false,
    chronology: null, chronologyAuthority: null,
    availableAt: "2026-09-01T00:00:00.000Z", priority: 50,
    ...overrides,
  };
}

// Reuse the frozen QF-S3 suite's real graph constructor, without registering its
// tests, copying its authority fixtures or changing the upstream suite. Every
// graph is constructed and validated by production QF-S3 code, not a mock label.
async function selfAuthoredCertifiedCandidate(bankClass) {
  const fixtureUrl = new URL("./qf-s3-dependency-ranked-transfer-chronology.test.mjs", import.meta.url);
  const source = readFileSync(fixtureUrl, "utf8");
  const end = source.indexOf("function maximumCapacityInput(");
  assert.ok(end > 0);
  const fixtureSource = source.slice(0, end)
    .replaceAll('"../lib/', `"${new URL("../lib/", import.meta.url).href}`)
    .replaceAll("import.meta.url", JSON.stringify(fixtureUrl.href));
  const fixture = await import(`data:text/javascript;base64,${Buffer.from(
    fixtureSource + "\nexport { completeInput };\n",
  ).toString("base64")}`);
  const authorityInput = fixture.completeInput();
  const chronology = chronologyCore.createDependencyRankedTransferChronologyV1(authorityInput);
  assert.equal(chronology.completeness, "COMPLETE");
  assert.deepEqual(chronologyCore.assertDependencyRankedTransferChronologyV1(
    chronology, authorityInput,
  ), chronology);
  return learningCandidate({
    candidateId: chronology.candidateId, candidateDigest: chronology.candidateDigest,
    bankClass, contentAuthority: bankClass, releaseChainComplete: true,
    unseenEligibilitySnapshotSealed: true, nonSameSurfaceAsSource: true, familyIsolated: true,
    calibrationState: bankClass === "MEASUREMENT" ? "MEASUREMENT_CALIBRATED" : "TRANSFER_VERIFIED",
    timedProtocolBound: bankClass === "MEASUREMENT", chronology,
    chronologyAuthority: {
      validationMethod: "assertDependencyRankedTransferChronologyV1",
      chronologyDigest: chronology.chronologyDigest,
      candidateId: chronology.candidateId, candidateDigest: chronology.candidateDigest, authorityInput,
    },
  });
}

async function postInput(runtime, input) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  assert.ok(bytes.byteLength <= MAX_BYTES, "authority regression must reach semantic checks, not 413");
  const { request } = streamedRequest([bytes]);
  return runtime.post(request);
}

for (const [purpose, bankClass] of [
  ["D7_TRANSFER", "VERIFIED_TRANSFER"], ["TIMED_MEASUREMENT", "MEASUREMENT"],
]) {
  test(`HTTP rejects self-authored valid QF-S3 ${purpose} before certified selection`, async () => {
    const candidate = await selfAuthoredCertifiedCandidate(bankClass);
    const input = { ...validInput(), purpose, candidates: [candidate] };
    // The internal selector still supports validated supplied metadata. That
    // mathematical consistency is deliberately NOT HTTP certification authority.
    const internal = qfI1.selectQfI1BankFirstAssignmentV1(input);
    assert.equal(internal.status, "ASSIGNED");
    assert.equal(internal.learnerUse, bankClass);
    assert.equal(internal.transferClaimAllowed, true);
    assert.equal(internal.measurementClaimAllowed, bankClass === "MEASUREMENT");
    const runtime = harness();
    await assertPrivateError(await postInput(runtime, input), 403, "QF_I1_LEARNING_ONLY_REQUIRED");
    assert.deepEqual(runtime.calls, ["session"]);
  });

  test(`HTTP rejects nested ${bankClass} even under a learning purpose`, async () => {
    const certified = await selfAuthoredCertifiedCandidate(bankClass);
    for (const candidates of [[certified], [learningCandidate(), certified]]) {
      const runtime = harness();
      await assertPrivateError(await postInput(runtime, { ...validInput(), candidates }),
        403, "QF_I1_LEARNING_ONLY_REQUIRED");
      assert.deepEqual(runtime.calls, ["session"]);
    }
  });
}

test("HTTP rejects nested authority escalation and certification assertions before selection", async () => {
  for (const overrides of [
    { contentAuthority: "VERIFIED_TRANSFER" }, { contentAuthority: "MEASUREMENT" },
    { bankClass: "VERIFIED_TRANSFER" }, { bankClass: "MEASUREMENT" },
    { releaseChainComplete: true }, { unseenEligibilitySnapshotSealed: true },
    { nonSameSurfaceAsSource: true }, { familyIsolated: true }, { timedProtocolBound: true },
    { calibrationState: "TRANSFER_VERIFIED" }, { calibrationState: "MEASUREMENT_CALIBRATED" },
    { chronology: {} }, { chronologyAuthority: {} },
  ]) {
    const runtime = harness();
    await assertPrivateError(await postInput(runtime, {
      ...validInput(), candidates: [learningCandidate(overrides)],
    }), 403, "QF_I1_LEARNING_ONLY_REQUIRED");
    assert.deepEqual(runtime.calls, ["session"]);
  }
});

test("HTTP learning stock stays bank-first and idempotent without certifying client metadata", async () => {
  const runtime = harness();
  const input = { ...validInput(), candidates: [learningCandidate()] };
  const responses = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await postInput(runtime, input);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Cache-Control"), /no-store/u);
    const body = await response.json();
    assert.deepEqual(body.result, qfI1.selectQfI1BankFirstAssignmentV1(input));
    assert.equal(body.result.status, "ASSIGNED");
    assert.equal(body.result.learnerUse, "LEARNING_ONLY");
    assert.equal(body.result.transferClaimAllowed, false);
    assert.equal(body.result.measurementClaimAllowed, false);
    assert.equal(body.result.generationAuthorized, false);
    assert.equal(body.boundary.candidateMetadataTrust, "UNVERIFIED_CLIENT_ASSERTIONS");
    assert.equal(body.boundary.certifiedBankSelectionSupported, false);
    assert.equal(body.boundary.persisted, false);
    for (const key of ["rightsStatus", "sourceStatus", "releaseChainComplete", "calibrationState", "chronologyAuthority"]) {
      assert.equal(Object.hasOwn(body.result, key), false);
    }
    responses.push(body);
  }
  assert.deepEqual(responses[0], responses[1]);
});

test("HTTP does not repair missing or invalid client rights/source assertions into authority", async () => {
  for (const overrides of [{ rightsStatus: "UNVERIFIED" }, { sourceStatus: "STALE" },
    { rightsStatus: undefined }, { sourceStatus: undefined }]) {
    await assertPrivateError(await postInput(harness(), {
      ...validInput(), candidates: [learningCandidate(overrides)],
    }), 400, "QF_I1_SELECTION_REJECTED");
  }
});

test("loopback HTTP executes the production POST with learning-only rejection and success", async (t) => {
  const runtime = harness();
  const server = createServer(async (incoming, outgoing) => {
    const response = await runtime.post(new Request("http://127.0.0.1/api/core-blitz/qf-i1/select", {
      method: incoming.method, headers: incoming.headers,
      body: Readable.toWeb(incoming), duplex: "half",
    }));
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api/core-blitz/qf-i1/select`;
  const send = (input) => fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  for (const [purpose, bankClass] of [
    ["D7_TRANSFER", "VERIFIED_TRANSFER"], ["TIMED_MEASUREMENT", "MEASUREMENT"],
  ]) {
    const candidate = await selfAuthoredCertifiedCandidate(bankClass);
    await assertPrivateError(await send({ ...validInput(), purpose, candidates: [candidate] }),
      403, "QF_I1_LEARNING_ONLY_REQUIRED");
    await assertPrivateError(await send({ ...validInput(), candidates: [learningCandidate(), candidate] }),
      403, "QF_I1_LEARNING_ONLY_REQUIRED");
  }
  assert.equal(runtime.calls.includes("selector"), false);
  const response = await send({ ...validInput(), candidates: [learningCandidate()] });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Cache-Control"), /no-store/u);
  const body = await response.json();
  assert.equal(body.result.status, "ASSIGNED");
  assert.equal(body.result.learnerUse, "LEARNING_ONLY");
  assert.equal(body.result.transferClaimAllowed, false);
  assert.equal(body.result.measurementClaimAllowed, false);
  assert.equal(runtime.calls.filter((call) => call === "selector").length, 1);
});

const MAX_BYTES = 65_536;
function paddedBody(bytes, korean = false) {
  const input = validInput();
  if (korean) input.sourceFamilyId = "합성";
  const json = JSON.stringify(input);
  return new TextEncoder().encode(json + " ".repeat(bytes - Buffer.byteLength(json)));
}

function streamedRequest(chunks, contentLength, { failRead = false, failCancel = false, stallCancel = false } = {}) {
  const reads = { pulls: 0, cancelled: 0 };
  const body = new ReadableStream({
    pull(controller) {
      const index = reads.pulls++;
      if (failRead && index > 0) return controller.error(new Error("SYNTHETIC_PRIVATE_BODY"));
      if (index === chunks.length) controller.close();
      else controller.enqueue(chunks[index]);
    },
    cancel() {
      reads.cancelled += 1;
      if (failCancel) throw new Error("SYNTHETIC_PRIVATE_BODY");
      if (stallCancel) return new Promise(() => {});
    },
  }, { highWaterMark: 0 });
  const request = new Request("http://localhost/api/core-blitz/qf-i1/select", {
    method: "POST", body, duplex: "half",
    headers: contentLength === undefined ? {} : { "Content-Length": contentLength },
  });
  return { request, reads };
}

async function assertPrivateError(response, status, code) {
  assert.equal(response.status, status);
  assert.match(response.headers.get("Cache-Control"), /no-store/u);
  assert.deepEqual(await response.json(), { ok: false, errorCode: code });
}

for (const [name, options] of [
  ["missing QF flag while C3R is on", { env: { CORE_BLITZ_QF_I1_ENABLED: undefined } }],
  ["QF flag OFF while C3R is on", { env: { CORE_BLITZ_QF_I1_ENABLED: "false" } }],
  ["non-true QF flag", { env: { CORE_BLITZ_QF_I1_ENABLED: "1" } }],
  ["unauthenticated", { session: { isAuthenticated: false } }],
  ["auth disabled", { session: { authEnabled: false } }],
  ["demo session", { session: { isDemo: true } }],
  ["missing user", { session: { userId: null } }],
  ["non-Owner", { session: { email: "other@example.invalid" } }],
  ["missing admin authority", { env: { ALPHA_ADMIN_EMAILS: undefined } }],
  ["missing subject Owner authority", { env: { WCV_C2R_C_P_OWNER_EMAILS: undefined } }],
  ["C3R OFF even with QF on", { env: { [repairContract.TRUSTED_REPAIR_FLAG]: "false" } }],
  ["Vercel Production with Owner and QF on", { env: { NODE_ENV: "production", VERCEL_ENV: "production" } }],
  ["Vercel Production despite development node env", { env: { NODE_ENV: "development", VERCEL_ENV: "production" } }],
  ["standalone Production without Vercel env", { env: { NODE_ENV: "production" } }],
  ["Production node with unknown deployment env", { env: { NODE_ENV: "production", VERCEL_ENV: "unknown" } }],
]) {
  test(`QF-I1 denies ${name} before any body read or selector execution`, async () => {
    const runtime = harness(options);
    const { request, reads } = streamedRequest([paddedBody(MAX_BYTES + 1)]);
    await assertPrivateError(await runtime.post(request), 404, "QF_I1_OWNER_AUTHORITY_REQUIRED");
    assert.equal(request.bodyUsed, false);
    assert.equal(reads.pulls, 0);
    assert.equal(runtime.calls.includes("selector"), false);
  });
}

for (const [name, env] of [
  ["isolated test", { NODE_ENV: "test" }],
  ["local development", { NODE_ENV: "development" }],
  ["Vercel development", { NODE_ENV: "development", VERCEL_ENV: "development" }],
  ["Vercel preview production build", { NODE_ENV: "production", VERCEL_ENV: "preview" }],
]) {
  test(`QF-I1 permits injected Owner access in ${name} and preserves deterministic learning-only results`, async () => {
    const runtime = harness({ env });
    const results = [];
    for (let retry = 0; retry < 2; retry += 1) {
      const { request } = streamedRequest([new TextEncoder().encode(JSON.stringify(validInput()))]);
      const response = await runtime.post(request);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("Cache-Control"), /no-store/u);
      const body = await response.json();
      assert.equal(body.result.status, "GENERATION_REQUIRED");
      assert.equal(body.result.generatedContentMaximumAuthority, "LEARNING_ONLY");
      for (const field of ["providerExecutionAllowed", "publicLearnerActivationAllowed",
        "rawGeneratedBodyMetadataPersistenceAllowed", "verifiedTransferAdmissionAllowed", "measurementAdmissionAllowed"]) {
        assert.equal(body.result[field], false);
      }
      results.push(body);
    }
    assert.deepEqual(results[0], results[1]);
    assert.deepEqual(runtime.calls, ["session", "selector", "session", "selector"]);
  });
}

for (const contentLength of [undefined, "invalid", "-1", "0", "1", "65536"]) {
  test(`actual bytes enforce 64 KiB with Content-Length ${String(contentLength)}`, async () => {
    for (const korean of [false, true]) {
      for (const size of [MAX_BYTES, MAX_BYTES + 1]) {
        const runtime = harness();
        const bytes = paddedBody(size, korean);
        // Single-byte chunks split Korean UTF-8 too; then a large final chunk.
        const chunks = [...bytes.slice(0, 240)].map((byte) => Uint8Array.of(byte));
        chunks.push(bytes.slice(240));
        const { request, reads } = streamedRequest(chunks, contentLength);
        const response = await runtime.post(request);
        if (size === MAX_BYTES) {
          assert.equal(response.status, 200);
          assert.equal((await response.json()).result.status, "GENERATION_REQUIRED");
          assert.equal(reads.cancelled, 0);
          assert.equal(runtime.calls.filter((call) => call === "selector").length, 1);
        } else {
          await assertPrivateError(response, 413, "QF_I1_REQUEST_TOO_LARGE");
          assert.equal(reads.cancelled, 1);
          assert.equal(reads.pulls, chunks.length);
          assert.equal(runtime.calls.includes("selector"), false);
        }
      }
    }
  });
}

test("oversize input cancels at the first excessive chunk without reading the remaining body", async () => {
  for (const failCancel of [false, true]) {
    const runtime = harness();
    const { request, reads } = streamedRequest([
      paddedBody(MAX_BYTES), Uint8Array.of(32), new Uint8Array(1_000_000),
    ], undefined, { failCancel });
    await assertPrivateError(await runtime.post(request), 413, "QF_I1_REQUEST_TOO_LARGE");
    assert.deepEqual(reads, { pulls: 2, cancelled: 1 });
    assert.equal(runtime.calls.includes("selector"), false);
  }
});

test("oversize Content-Length pre-rejects without reading or selecting", async () => {
  const runtime = harness();
  const { request, reads } = streamedRequest([paddedBody(1024)], "65537");
  await assertPrivateError(await runtime.post(request), 413, "QF_I1_REQUEST_TOO_LARGE");
  assert.equal(reads.pulls, 0);
  assert.equal(runtime.calls.includes("selector"), false);
});

test("413 does not wait on a stalled transport cancellation", { timeout: 2000 }, async () => {
  const runtime = harness();
  const { request, reads } = streamedRequest([
    paddedBody(MAX_BYTES + 1), new Uint8Array(1_000_000),
  ], undefined, { stallCancel: true });
  await assertPrivateError(await runtime.post(request), 413, "QF_I1_REQUEST_TOO_LARGE");
  assert.deepEqual(reads, { pulls: 1, cancelled: 1 });
  assert.equal(runtime.calls.includes("selector"), false);
});

test("QF flag and byte-limit declarations preserve the independent default-off boundary", () => {
  const contract = JSON.parse(readFileSync(new URL(
    "../config/dabangil-core-blitz-wave1-v1.json", import.meta.url,
  ), "utf8"));
  assert.equal(contract.qfI1Policy.independentServerFeatureFlag, "CORE_BLITZ_QF_I1_ENABLED");
  assert.equal(contract.activationBoundary.qfI1FeatureFlag, "CORE_BLITZ_QF_I1_ENABLED");
  assert.equal(contract.qfI1Policy.featureFlagDefault, false);
  assert.equal(contract.qfI1Policy.c3rFlagsAloneAuthorizeQf, false);
  assert.equal(contract.qfI1Policy.productionAccessAllowed, false);
  assert.equal(contract.qfI1Policy.requestByteLimit, MAX_BYTES);
  assert.equal(contract.qfI1Policy.actualReceivedBytesBoundedBeforeJsonParsing, true);
  assert.equal(contract.qfI1Policy.allResponsesCacheable, false);
  assert.equal(contract.qfI1Policy.httpSelectorPurpose, "LEARNING_PRACTICE");
  assert.equal(contract.qfI1Policy.httpCandidateMaximumAuthority, "LEARNING_ONLY");
  assert.equal(contract.qfI1Policy.httpCertifiedBankSelectionSupported, false);
  assert.equal(contract.qfI1Policy.httpClientMetadataIsServerVerifiedAuthority, false);
  assert.equal(contract.qfI1Policy.httpUnsupportedAuthorityRejectedBeforeSelection, true);
  assert.doesNotMatch(route, /request\.(json|text|arrayBuffer)\(/u);
});

test("invalid, empty, array and failed-stream bodies disclose no input and never select", async () => {
  for (const body of ["SYNTHETIC_PRIVATE_BODY", "", "[]", "null"]) {
    const runtime = harness();
    const { request } = streamedRequest([new TextEncoder().encode(body)]);
    await assertPrivateError(await runtime.post(request), 400, "QF_I1_INVALID_INPUT");
    assert.equal(runtime.calls.includes("selector"), false);
  }
  const runtime = harness();
  const { request } = streamedRequest([Uint8Array.of(123)], undefined, { failRead: true });
  await assertPrivateError(await runtime.post(request), 400, "QF_I1_INVALID_INPUT");
  assert.equal(runtime.calls.includes("selector"), false);
});

test("within-limit semantic invalidity still uses the selector validator without raw error disclosure", async () => {
  const runtime = harness();
  const { request } = streamedRequest([new TextEncoder().encode(JSON.stringify({
    ...validInput(), learnerScopeId: "", sourceCandidateId: "SYNTHETIC_PRIVATE_BODY",
  }))]);
  await assertPrivateError(await runtime.post(request), 400, "QF_I1_SELECTION_REJECTED");
  assert.deepEqual(runtime.calls, ["session", "selector"]);
});

test("HTTP rejects every unsupported purpose even without stock instead of returning a success fallback", async () => {
  for (const purpose of ["D7_TRANSFER", "TIMED_MEASUREMENT", "SYNTHETIC_PRIVATE_BODY", undefined]) {
    const runtime = harness();
    await assertPrivateError(await postInput(runtime, { ...validInput(), purpose }),
      403, "QF_I1_LEARNING_ONLY_REQUIRED");
    assert.deepEqual(runtime.calls, ["session"]);
  }
});
