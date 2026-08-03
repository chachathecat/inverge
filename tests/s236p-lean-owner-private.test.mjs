import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import {
  S236P_APPLICATION_CACHE_TTL_SECONDS,
  S236P_AUTHENTICATED_OBJECT_REQUEST_CACHE_MODE,
  S236P_BUCKET_ID,
  S236P_EVENT_LOG_MODE,
  S236P_EVENT_LOG_RETENTION_DAYS,
  S236P_EVENTS_TABLE,
  S236P_MAX_CONTENT_RETENTION_DAYS,
  S236P_MAX_EXPORT_DELETE_SLA_SECONDS,
  S236P_MAX_SIGNED_URL_TTL_SECONDS,
  S236P_MAX_TEMPORARY_TTL_SECONDS,
  S236P_OBJECTS_TABLE,
  S236P_PROVIDER_MODE,
  TEMPORARY_ACCEPTANCE_TTL_SECONDS,
  TEMPORARY_EXPIRY_SAFETY_MARGIN_MS,
  assertTemporaryAcceptanceMetadata,
  classifyBulkSignedUrlResponse,
  classifyTemporaryPostExpiryReadResults,
  createAuthenticatedObjectRequestFreshness,
  directAuthenticatedGet,
  freshAuthenticatedDownload,
  settleReadProbe,
  temporaryAcceptanceObjectRow,
  waitUntilAfterServerTimestamp,
} from "../scripts/verify-s236p-lean-owner-private.mjs";

const migrationPaths = [
  "supabase/migrations/20260730023248_s236p_lean_owner_private.sql",
  "supabase/migrations/20260730053324_s236p_owner_private_lifecycle_hardening.sql",
  "supabase/migrations/20260730065040_s236p_owner_private_authenticated_download_info.sql",
  "supabase/migrations/20260730113505_s236p_owner_private_expiry_read_gate.sql",
];
const expectedMigrationDigests = [
  "476ef1b0d6a100fb6e4803b812b049b44252ca5f25301d3f781cee8827b1545b",
  "e20440dfa0d880ad591b8c9fdff287cd66fcdbbe4f96f07a549a730fd8920de1",
  "632cc7ee563aa29a573425e396f6f539e35a3c8834955ba66ccd01723bb3cbcb",
  "416fa80acea48bf4d170661a4f5259632b4d9e3fd740007bd65cbf1ded6103f1",
];
const harnessPath = "scripts/verify-s236p-lean-owner-private.mjs";
const acceptancePath = "docs/qa/s236p-lean-owner-private-acceptance.md";

function normalize(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function withoutSqlComments(value) {
  return value.replace(/--.*$/gm, "");
}

test("S236P constants match the narrowed Owner-private configuration", () => {
  assert.equal(S236P_BUCKET_ID, "s236p-owner-private-v1");
  assert.equal(S236P_OBJECTS_TABLE, "s236p_owner_private_objects");
  assert.equal(S236P_EVENTS_TABLE, "s236p_owner_private_events");
  assert.equal(S236P_PROVIDER_MODE, "none");
  assert.equal(S236P_EVENT_LOG_MODE, "none");
  assert.equal(S236P_EVENT_LOG_RETENTION_DAYS, 0);
  assert.equal(S236P_MAX_SIGNED_URL_TTL_SECONDS, 300);
  assert.equal(S236P_MAX_CONTENT_RETENTION_DAYS, 365);
  assert.equal(S236P_MAX_TEMPORARY_TTL_SECONDS, 300);
  assert.equal(TEMPORARY_ACCEPTANCE_TTL_SECONDS, 30);
  assert.equal(TEMPORARY_EXPIRY_SAFETY_MARGIN_MS, 250);
  assert.equal(S236P_APPLICATION_CACHE_TTL_SECONDS, 0);
  assert.equal(
    S236P_AUTHENTICATED_OBJECT_REQUEST_CACHE_MODE,
    "unique-cache-nonce-and-no-store",
  );
  assert.equal(S236P_MAX_EXPORT_DELETE_SLA_SECONDS, 604800);
});

test("authenticated object reads use unique CDN cache nonces and no-store", async () => {
  const uuidA = "00000000-0000-4000-8000-000000000011";
  const uuidB = "00000000-0000-4000-8000-000000000012";
  const first = createAuthenticatedObjectRequestFreshness(() => uuidA);
  const second = createAuthenticatedObjectRequestFreshness(() => uuidB);
  assert.deepEqual(first, {
    cacheNonce: uuidA,
    fetchOptions: { cache: "no-store" },
  });
  assert.deepEqual(second, {
    cacheNonce: uuidB,
    fetchOptions: { cache: "no-store" },
  });
  assert.notEqual(first.cacheNonce, second.cacheNonce);

  const downloadCalls = [];
  const fakeClient = {
    storage: {
      from(bucket) {
        assert.equal(bucket, S236P_BUCKET_ID);
        return {
          download(...args) {
            downloadCalls.push(args);
            return Promise.resolve({ data: null, error: { status: 404 } });
          },
        };
      },
    },
  };
  await freshAuthenticatedDownload(fakeClient, "vault/object", () => uuidA);
  assert.deepEqual(downloadCalls, [
    ["vault/object", { cacheNonce: uuidA }, { cache: "no-store" }],
  ]);

  const directCalls = [];
  const uuids = [uuidA, uuidB];
  const guardedFetch = async (input, init) => {
    directCalls.push({ init, url: String(input) });
    return { ok: false, status: 404 };
  };
  for (let index = 0; index < uuids.length; index += 1) {
    await directAuthenticatedGet({
      accessToken: "synthetic-access-token",
      guardedFetch,
      path: "vault/object",
      projectUrl: "https://project.example.invalid/",
      publishableKey: "synthetic-publishable-key",
      randomUUID: () => uuids[index],
    });
  }
  assert.deepEqual(
    directCalls.map(({ init, url }) => ({
      cache: init.cache,
      cacheNonce: new URL(url).searchParams.get("cacheNonce"),
    })),
    [
      { cache: "no-store", cacheNonce: uuidA },
      { cache: "no-store", cacheNonce: uuidB },
    ],
  );
  assert.ok(
    directCalls.every(({ url }) =>
      url.startsWith("https://project.example.invalid/storage/v1/"),
    ),
  );
  assert.ok(directCalls.every(({ url }) => !url.includes("invalid//storage")));
});

test("storage-js materializes the fresh nonce and no-store fetch parameters", async () => {
  const calls = [];
  const client = createClient(
    "https://project.example.invalid",
    "synthetic-publishable-key",
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        fetch: async (input, init) => {
          calls.push({ init, url: String(input) });
          return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
        },
      },
    },
  );
  const cacheNonce = "00000000-0000-4000-8000-000000000014";

  const result = await freshAuthenticatedDownload(
    client,
    "vault/object",
    () => cacheNonce,
  );

  assert.equal(result.error, null);
  assert.ok(result.data);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(new URL(calls[0].url).searchParams.get("cacheNonce"), cacheNonce);
});

test("freshness rejects non-v4 or unbounded cache nonces", () => {
  for (const invalidNonce of [
    "short",
    "00000000-0000-1000-8000-000000000000",
    "00000000-0000-4000-7000-000000000000",
    `00000000-0000-4000-8000-${"0".repeat(80)}`,
  ]) {
    assert.throws(
      () =>
        createAuthenticatedObjectRequestFreshness(() => invalidNonce),
      (error) => error?.code === "authenticated_read_cache_nonce_invalid",
    );
  }
});

test("fresh download reaches the expired origin instead of a warmed object URL", async () => {
  const path = "vault/temporary/object";
  const warmedBody = { arrayBuffer: async () => new ArrayBuffer(0) };
  const edgeCache = new Map();
  const originCalls = [];
  let expired = false;

  const fakeClient = {
    storage: {
      from(bucket) {
        assert.equal(bucket, S236P_BUCKET_ID);
        return {
          async download(downloadPath, options = {}, parameters = {}) {
            const cacheNonce = options.cacheNonce ?? "shared-url";
            const cacheKey = `${downloadPath}?cacheNonce=${cacheNonce}`;
            if (edgeCache.has(cacheKey)) return edgeCache.get(cacheKey);

            originCalls.push({
              cache: parameters.cache ?? "default",
              cacheKey,
              expired,
            });
            const result = expired
              ? { data: null, error: { status: 404 } }
              : { data: warmedBody, error: null };
            if (!expired) edgeCache.set(cacheKey, result);
            return result;
          },
        };
      },
    },
  };

  const warmed = await fakeClient.storage.from(S236P_BUCKET_ID).download(path);
  assert.equal(warmed.data, warmedBody);
  expired = true;

  const staleReplay = await fakeClient.storage
    .from(S236P_BUCKET_ID)
    .download(path);
  assert.equal(staleReplay.data, warmedBody);

  const fresh = await freshAuthenticatedDownload(
    fakeClient,
    path,
    () => "00000000-0000-4000-8000-000000000013",
  );
  assert.equal(fresh.data, null);
  assert.equal(fresh.error.status, 404);
  assert.deepEqual(originCalls, [
    {
      cache: "default",
      cacheKey: `${path}?cacheNonce=shared-url`,
      expired: false,
    },
    {
      cache: "no-store",
      cacheKey:
        `${path}?cacheNonce=00000000-0000-4000-8000-000000000013`,
      expired: true,
    },
  ]);
});

test("post-expiry read classification reports every allowed or inconclusive surface", () => {
  assert.deepEqual(
    classifyTemporaryPostExpiryReadResults({
      directGetResponse: { ok: false, status: 404 },
      downloadResult: { data: null, error: { status: 403 } },
      headResponse: { ok: false, status: 400 },
      infoResult: { data: null, error: { statusCode: "404" } },
      listResult: { data: [], error: null },
    }),
    [],
  );

  assert.deepEqual(
    classifyTemporaryPostExpiryReadResults({
      directGetResponse: { ok: true, status: 200 },
      downloadResult: { data: {}, error: null },
      headResponse: { ok: true, status: 200 },
      infoResult: { data: {}, error: null },
      listResult: { data: [{ name: "synthetic" }], error: null },
    }),
    [
      "LIST_ALLOWED",
      "INFO_ALLOWED",
      "SDK_DOWNLOAD_ALLOWED",
      "DIRECT_GET_ALLOWED",
      "HEAD_ALLOWED",
    ],
  );

  assert.deepEqual(
    classifyTemporaryPostExpiryReadResults({
      directGetResponse: { ok: false, status: 500 },
      downloadResult: { data: null, error: { status: 500 } },
      headResponse: null,
      infoResult: { data: null, error: { message: "unknown" } },
      listResult: { data: null, error: { message: "unknown" } },
    }),
    [
      "LIST_INCONCLUSIVE",
      "INFO_INCONCLUSIVE",
      "SDK_DOWNLOAD_INCONCLUSIVE",
      "DIRECT_GET_INCONCLUSIVE",
      "HEAD_INCONCLUSIVE",
    ],
  );

  assert.deepEqual(
    classifyTemporaryPostExpiryReadResults({
      directGetResponse: { ok: false, status: 404 },
      downloadResult: { data: {}, error: { status: 403 } },
      headResponse: { ok: false, status: 404 },
      infoResult: { data: {}, error: { status: 404 } },
      listResult: { data: null, error: null },
    }),
    ["LIST_INCONCLUSIVE", "INFO_ALLOWED", "SDK_DOWNLOAD_ALLOWED"],
  );

  const strictStatusFailures = classifyTemporaryPostExpiryReadResults({
    directGetResponse: { ok: false, status: 404 },
    downloadResult: { data: null, error: { status: "403junk" } },
    headResponse: { ok: false, status: 404 },
    infoResult: { data: null, error: { statusCode: "404junk" } },
    listResult: { data: [], error: null },
  });
  assert.deepEqual(strictStatusFailures, [
    "INFO_INCONCLUSIVE",
    "SDK_DOWNLOAD_INCONCLUSIVE",
  ]);

  const allInconclusive = classifyTemporaryPostExpiryReadResults({
    directGetResponse: null,
    downloadResult: null,
    headResponse: null,
    infoResult: null,
    listResult: null,
  });
  const failureCode =
    `temporary_post_expiry_read_gate_failed:${allInconclusive.join(",")}`;
  assert.ok(failureCode.length <= 160);
  assert.match(failureCode, /^[a-z0-9_]+(?::[A-Z0-9_,]+)?$/);
});

test("read probe settlement waits for all probes and redacts rejection details", async () => {
  let completed = false;
  const rejected = settleReadProbe(() => {
    throw new Error("sensitive URL and token must not escape");
  });
  const completedProbe = settleReadProbe(() =>
    Promise.resolve().then(() => {
      completed = true;
      return { ok: false, status: 404 };
    }),
  );

  const results = await Promise.all([rejected, completedProbe]);
  assert.equal(completed, true);
  assert.deepEqual(results, [null, { ok: false, status: 404 }]);
  assert.doesNotMatch(JSON.stringify(results), /sensitive|token|URL/);
});

test("temporary acceptance timing survives transport delay and rejects one-second coupling", async () => {
  const createdAtMs = Date.parse("2026-08-03T01:36:44.000Z");
  const row = temporaryAcceptanceObjectRow({
    ownerId: "00000000-0000-4000-8000-000000000001",
    objectRef: "00000000-0000-4000-8000-000000000002",
    storagePath:
      "00000000-0000-4000-8000-000000000003/temporary/00000000-0000-4000-8000-000000000002",
  });
  assert.equal(row.temporary_ttl_seconds, 30);

  const metadata = {
    ...row,
    created_at: new Date(createdAtMs).toISOString(),
    temporary_expires_at: new Date(
      createdAtMs + TEMPORARY_ACCEPTANCE_TTL_SECONDS * 1_000,
    ).toISOString(),
  };
  const timing = assertTemporaryAcceptanceMetadata(metadata);
  assert.equal(timing.expiresAtMs - timing.createdAtMs, 30_000);

  let nowMs = createdAtMs + 1_250;
  const fiveReadTransportDelaysMs = [125, 150, 175, 200, 225];
  for (const transportDelayMs of fiveReadTransportDelaysMs) {
    await Promise.resolve();
    nowMs += transportDelayMs;
    assert.ok(nowMs < timing.expiresAtMs);
  }
  assert.ok(nowMs > createdAtMs + 1_000);

  const sleeps = [];
  await waitUntilAfterServerTimestamp(
    metadata.temporary_expires_at,
    "temporary_expiry",
    {
      now: () => nowMs,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
        nowMs += milliseconds;
      },
    },
  );
  assert.equal(
    nowMs,
    timing.expiresAtMs + TEMPORARY_EXPIRY_SAFETY_MARGIN_MS,
  );
  assert.ok(sleeps.length > 0);
  assert.ok(sleeps.every((milliseconds) => milliseconds <= 250));

  assert.throws(
    () =>
      assertTemporaryAcceptanceMetadata({
        ...metadata,
        temporary_ttl_seconds: 1,
        temporary_expires_at: new Date(createdAtMs + 1_000).toISOString(),
      }),
    (error) =>
      error?.code === "temporary_metadata_ttl_not_acceptance_window",
  );
});

test("ordered migration quadruple preserves the live triple and binds the pre-live fourth digest", async () => {
  const digests = await Promise.all(
    migrationPaths.map(async (migrationPath) =>
      crypto
        .createHash("sha256")
        .update(await readFile(migrationPath))
        .digest("hex"),
    ),
  );
  assert.deepEqual(digests, expectedMigrationDigests);
});

test("predecessor provisions the private bucket and metadata surfaces", async () => {
  const sql = normalize(await readFile(migrationPaths[0], "utf8"));

  assert.match(sql, /insert into storage\.buckets/);
  assert.match(sql, /'s236p-owner-private-v1', 's236p-owner-private-v1', false/);
  assert.match(
    sql,
    /create table if not exists public\.s236p_owner_private_objects/,
  );
  assert.match(
    sql,
    /create table if not exists public\.s236p_owner_private_events/,
  );
  assert.match(sql, /content_retention_days between 1 and 365/);
  assert.match(sql, /temporary_ttl_seconds between 1 and 300/);
  assert.match(sql, /application_cache_ttl_seconds = 0/);
  assert.match(sql, /export_delete_sla_seconds between 1 and 604800/);
  assert.match(sql, /ocr_ai_provider_mode = 'none'/);
  assert.match(sql, /external_ocr_ai_provider_call_count = 0/);
  assert.match(sql, /raw_external_emission_count = 0/);
  assert.match(sql, /contains_real_content = false/);
});

test("lifecycle hardening disables signed access and persistent events", async () => {
  const sql = normalize(withoutSqlComments(await readFile(migrationPaths[1], "utf8")));

  assert.match(
    sql,
    /drop function if exists public\.s236p_authorize_signed_url_v1\(uuid, integer\)/,
  );
  assert.match(
    sql,
    /drop table if exists public\.s236p_owner_private_events/,
  );
  assert.match(sql, /add column if not exists parent_object_ref uuid/);
  assert.match(sql, /add column if not exists revision_number bigint not null default 1/);
  assert.match(sql, /s236p_immutable_object_field/);
  assert.match(sql, /s236p_revision_sequence_invalid/);
  assert.match(sql, /drop policy if exists "s236p owner private update"/);
  assert.match(
    sql,
    /storage\.allow_only_operation\('storage\.object\.upload'\)/,
  );
  assert.doesNotMatch(sql, /create table[^;]*s236p_owner_private_events/);
  assert.doesNotMatch(sql, /create function[^;]*s236p_authorize_signed_url_v1/);
});

test("final SELECT policy has exactly the six authorized operations", async () => {
  const rawSql = await readFile(migrationPaths[3], "utf8");
  const sql = normalize(withoutSqlComments(rawSql));
  const operations = [
    ...rawSql.matchAll(/^\s*'([^']+)'\s*,?\s*$/gm),
  ].map((match) => match[1]);

  assert.deepEqual(operations, [
    "storage.object.list",
    "storage.object.list_v2",
    "storage.object.get_authenticated",
    "object.get_authenticated_info",
    "storage.object.delete",
    "storage.object.delete_many",
  ]);
  assert.match(
    sql,
    /bucket_id = 's236p-owner-private-v1' and owner_id = \(select auth\.uid\(\)::text\)/,
  );
  assert.match(
    sql,
    /metadata\.object_state = 'active' and metadata\.content_expires_at > statement_timestamp\(\) and \( metadata\.temporary_expires_at is null or metadata\.temporary_expires_at > statement_timestamp\(\) \)/,
  );
  assert.match(
    sql,
    /\(\s*\(\s*storage\.allow_any_operation\(array\[[^\]]+'object\.get_authenticated_info'[^\]]+\]\)\s*and exists \([^)]+from public\.s236p_owner_private_objects as metadata[\s\S]+?\)\s*\)\s*or storage\.allow_any_operation\(array\[[^\]]+'storage\.object\.delete_many'[^\]]+\]\)\s*\)/,
  );
  assert.doesNotMatch(
    sql,
    /storage\.object\.sign|storage\.object\.sign_many|object\.head_authenticated_info/,
  );
  assert.doesNotMatch(
    sql,
    /create (?:table|function|policy)|drop policy|alter table|grant |create bucket/,
  );
  assert.match(
    sql,
    /^alter policy "s236p owner private select" on storage\.objects to authenticated using /,
  );
});

test("fourth migration records the forward-only targeted and delete-only disable runbook", async () => {
  const sql = await readFile(migrationPaths[3], "utf8");
  assert.match(sql, /Never edit, delete, replay, revert/);
  assert.match(sql, /removes only that operation from the read/);
  assert.match(sql, /preserves only delete\/delete_many/);
  assert.match(sql, /Never restore migration 3's expiry-blind broad SELECT policy/);
  assert.match(sql, /SDK and direct authenticated/);
  assert.match(sql, /does not execute either disable procedure/);
});

test("authenticated HEAD shares the protected GET operation contract", async () => {
  const contract = await readFile(acceptancePath, "utf8");

  assert.match(
    contract,
    /routing both `GET` and `HEAD`[\s\S]+through `storage\.object\.get_authenticated`/,
  );
  assert.match(
    contract,
    /same-Owner request is[\s\S]+active and unexpired[\s\S]+cross-Owner,[\s\S]+anonymous,[\s\S]+expired requests remain denied/,
  );
  assert.doesNotMatch(
    contract,
    /authenticated HEAD, S3, TUS,[\s\S]+operations are denied/,
  );
});

test("HTTP 200 with item error and both URL fields null is denied", () => {
  assert.deepEqual(
    classifyBulkSignedUrlResponse({
      data: [{ error: "not authorized", signedUrl: null, signedURL: null }],
      error: null,
    }),
    {
      status: "denied",
      itemCount: 1,
      deniedItemCount: 1,
      itemErrorPresent: true,
      signedUrlPresent: false,
    },
  );
});

test("HTTP 200 with item error null and a URL is allowed", () => {
  const result = classifyBulkSignedUrlResponse({
    data: [
      {
        error: null,
        signedUrl: "https://example.invalid/signed",
        signedURL: "/object/sign/example",
      },
    ],
    error: null,
  });
  assert.equal(result.status, "allowed");
  assert.equal(result.itemErrorPresent, false);
  assert.equal(result.signedUrlPresent, true);
});

test("malformed, empty, and top-level failures are inconclusive", async (t) => {
  const cases = [
    ["malformed", { data: [{ error: "denied", signedUrl: null }], error: null }],
    ["empty", { data: [], error: null }],
    ["top-level failure", { data: null, error: { message: "failed" } }],
  ];

  for (const [name, value] of cases) {
    await t.test(name, () => {
      assert.equal(classifyBulkSignedUrlResponse(value).status, "inconclusive");
    });
  }
});

test("live harness is synthetic, user-scoped, and fail-closed", async () => {
  const source = await readFile(harnessPath, "utf8");

  assert.match(source, /signInWithPassword/);
  assert.doesNotMatch(source, /\.auth\.signUp|service_role|serviceRole/);
  assert.match(source, /SINGLE_SIGN_TTLS = Object\.freeze\(\[1, 300, 301\]\)/);
  assert.match(source, /BULK_SIGN_TTLS = Object\.freeze\(\[1, 300, 301\]\)/);
  assert.match(source, /bulk_signed_url_allowed/);
  assert.match(source, /bulk_signed_url_inconclusive/);
  assert.match(source, /owner_a_direct_authenticated_get_allowed/);
  assert.match(source, /owner_a_authenticated_head_allowed/);
  assert.match(
    source,
    /if \(!headA\.ok\) fail\("owner_a_authenticated_head_failed"\)/,
  );
  assert.match(
    source,
    /async function expectDirectHeadDenied[\s\S]+method: "HEAD"[\s\S]+if \(response\.ok\) fail\(code\)/,
  );
  assert.match(
    source,
    /account_b_and_anonymous_info_download_list_and_head_denied/,
  );
  assert.match(source, /account_b_authenticated_head_owner_a_allowed/);
  assert.match(source, /anonymous_authenticated_head_allowed/);
  assert.match(
    source,
    /TEMPORARY_ACCEPTANCE_TTL_SECONDS = 30/,
  );
  assert.match(source, /temporaryAcceptanceObjectRow/);
  assert.match(source, /created_at,temporary_ttl_seconds,temporary_expires_at/);
  assert.match(source, /temporary_stable_ttl_pre_expiry_reads_allowed/);
  assert.match(source, /temporary_exact_boundary_and_post_expiry_reads_denied/);
  assert.match(source, /temporary_post_expiry_read_gate_failed/);
  assert.match(source, /unique-cache-nonce-and-no-store/);
  assert.match(source, /cacheNonce: freshness\.cacheNonce/);
  assert.match(source, /fetchOptions: \{ cache: "no-store" \}/);
  assert.equal((source.match(/\.download\(/g) ?? []).length, 1);
  assert.match(source, /delete_requested_authenticated_head_allowed/);
  assert.match(source, /expired_single_and_bulk_cleanup_with_metadata_retained/);
  assert.match(source, /delete_requested_reads_denied_cleanup_preserved/);
  assert.match(source, /s3_tus_access_denied/);
  assert.doesNotMatch(source, /if \(headA\.ok\) fail\("authenticated_head_allowed"\)/);
  assert.match(source, /anonymous_delete_owner_a_allowed/);
  assert.match(source, /overwrite_upsert_move_copy_denied/);
  assert.match(source, /immutable_original_append_only_revision_verified/);
  assert.match(source, /metadata_first_recovery_orphan_safe_delete_verified/);
  assert.match(source, /persistent_event_log_disabled/);
  assert.match(source, /external_network_call_blocked/);
  assert.match(source, /temporaryPrincipalIdsForCleanup/);
  assert.doesNotMatch(source, /console\.(log|error|warn)/);
  assert.doesNotMatch(source, /JSON\.stringify\(result\)/);
});
