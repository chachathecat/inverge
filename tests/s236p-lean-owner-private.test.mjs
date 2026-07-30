import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  S236P_APPLICATION_CACHE_TTL_SECONDS,
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
  classifyBulkSignedUrlResponse,
} from "../scripts/verify-s236p-lean-owner-private.mjs";

const migrationPaths = [
  "supabase/migrations/20260730023248_s236p_lean_owner_private.sql",
  "supabase/migrations/20260730053324_s236p_owner_private_lifecycle_hardening.sql",
  "supabase/migrations/20260730065040_s236p_owner_private_authenticated_download_info.sql",
];
const expectedMigrationDigests = [
  "476ef1b0d6a100fb6e4803b812b049b44252ca5f25301d3f781cee8827b1545b",
  "e20440dfa0d880ad591b8c9fdff287cd66fcdbbe4f96f07a549a730fd8920de1",
  "632cc7ee563aa29a573425e396f6f539e35a3c8834955ba66ccd01723bb3cbcb",
];
const harnessPath = "scripts/verify-s236p-lean-owner-private.mjs";

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
  assert.equal(S236P_APPLICATION_CACHE_TTL_SECONDS, 0);
  assert.equal(S236P_MAX_EXPORT_DELETE_SLA_SECONDS, 604800);
});

test("ordered migration triple is byte-bound to the live ledger digests", async () => {
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
  const rawSql = await readFile(migrationPaths[2], "utf8");
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
  assert.doesNotMatch(
    sql,
    /storage\.object\.sign|storage\.object\.sign_many|object\.head_authenticated_info/,
  );
  assert.doesNotMatch(
    sql,
    /create (?:table|function)|alter table|grant |create bucket/,
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
  assert.match(source, /overwrite_upsert_move_copy_denied/);
  assert.match(source, /immutable_original_append_only_revision_verified/);
  assert.match(source, /metadata_first_recovery_orphan_safe_delete_verified/);
  assert.match(source, /persistent_event_log_disabled/);
  assert.match(source, /external_network_call_blocked/);
  assert.match(source, /temporaryPrincipalIdsForCleanup/);
  assert.doesNotMatch(source, /console\.(log|error|warn)/);
  assert.doesNotMatch(source, /JSON\.stringify\(result\)/);
});
