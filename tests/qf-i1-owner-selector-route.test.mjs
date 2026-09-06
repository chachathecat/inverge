import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";

import * as qfI1 from "../lib/question-foundry/runtime/qf-i1-bank-first.ts";
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
  const { request } = streamedRequest([new TextEncoder().encode('{"purpose":"SYNTHETIC_PRIVATE_BODY"}')]);
  await assertPrivateError(await runtime.post(request), 400, "QF_I1_SELECTION_REJECTED");
  assert.deepEqual(runtime.calls, ["session", "selector"]);
});
