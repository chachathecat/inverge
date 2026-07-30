import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S236P_APPLICATION_CACHE_TTL_SECONDS,
  S236P_BUCKET_ID,
  S236P_EVENTS_TABLE,
  S236P_MAX_CONTENT_RETENTION_DAYS,
  S236P_MAX_EXPORT_DELETE_SLA_SECONDS,
  S236P_MAX_METADATA_LOG_RETENTION_DAYS,
  S236P_MAX_SIGNED_URL_TTL_SECONDS,
  S236P_MAX_TEMPORARY_TTL_SECONDS,
  S236P_OBJECTS_TABLE,
  S236P_PROVIDER_MODE,
} from "../scripts/verify-s236p-lean-owner-private.mjs";

const migrationPath =
  "supabase/migrations/20260730023248_s236p_lean_owner_private.sql";
const harnessPath = "scripts/verify-s236p-lean-owner-private.mjs";

function normalize(value) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function withoutSqlComments(value) {
  return value.replace(/--.*$/gm, "");
}

test("S236P constants match the exact lean O4V limits", () => {
  assert.equal(S236P_BUCKET_ID, "s236p-owner-private-v1");
  assert.equal(S236P_OBJECTS_TABLE, "s236p_owner_private_objects");
  assert.equal(S236P_EVENTS_TABLE, "s236p_owner_private_events");
  assert.equal(S236P_PROVIDER_MODE, "none");
  assert.equal(S236P_MAX_SIGNED_URL_TTL_SECONDS, 300);
  assert.equal(S236P_MAX_CONTENT_RETENTION_DAYS, 365);
  assert.equal(S236P_MAX_METADATA_LOG_RETENTION_DAYS, 7);
  assert.equal(S236P_MAX_TEMPORARY_TTL_SECONDS, 300);
  assert.equal(S236P_APPLICATION_CACHE_TTL_SECONDS, 0);
  assert.equal(S236P_MAX_EXPORT_DELETE_SLA_SECONDS, 604800);
});

test("migration idempotently provisions one private bucket and two metadata tables", async () => {
  const sql = normalize(await readFile(migrationPath, "utf8"));

  assert.match(sql, /insert into storage\.buckets/);
  assert.match(sql, /'s236p-owner-private-v1', 's236p-owner-private-v1', false/);
  assert.match(sql, /on conflict \(id\) do update/);
  assert.match(
    sql,
    /create table if not exists public\.s236p_owner_private_objects/,
  );
  assert.match(
    sql,
    /create table if not exists public\.s236p_owner_private_events/,
  );
});

test("metadata limits fail closed at the lean O4V maxima", async () => {
  const sql = normalize(await readFile(migrationPath, "utf8"));

  assert.match(sql, /content_retention_days between 1 and 365/);
  assert.match(sql, /temporary_ttl_seconds between 1 and 300/);
  assert.match(sql, /signed_url_ttl_seconds between 1 and 300/);
  assert.match(sql, /application_cache_ttl_seconds = 0/);
  assert.match(sql, /export_delete_sla_seconds between 1 and 604800/);
  assert.match(sql, /retention_days between 1 and 7/);
  assert.match(sql, /ocr_ai_provider_mode = 'none'/);
  assert.match(sql, /external_ocr_ai_provider_call_count = 0/);
  assert.match(sql, /raw_external_emission_count = 0/);
  assert.match(sql, /contains_real_content = false/);
  assert.match(sql, /contains_raw_content = false/);
});

test("Owner authorization uses auth.uid and has all four CRUD policies", async () => {
  const rawSql = await readFile(migrationPath, "utf8");
  const sql = normalize(withoutSqlComments(rawSql));

  assert.doesNotMatch(sql, /raw_user_meta_data|raw_app_meta_data/);
  assert.doesNotMatch(sql, /\bauth\.email\b|\bemail\s*=/);
  assert.match(sql, /\(select auth\.uid\(\)\) = owner_id/);

  for (const table of [
    "s236p_owner_private_objects",
    "s236p_owner_private_events",
  ]) {
    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(
        sql,
        new RegExp(
          `create policy "s236p owner private ${table.endsWith("objects") ? "objects" : "events"} ${operation}".*?on public\\.${table}.*?for ${operation}.*?to authenticated`,
        ),
      );
    }
  }

  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(
      sql,
      new RegExp(
        `create policy "s236p owner private ${operation}".*?on storage\\.objects.*?for ${operation}.*?to authenticated`,
      ),
    );
  }

  assert.match(sql, /alter table public\.s236p_owner_private_objects force row level security/);
  assert.match(sql, /alter table public\.s236p_owner_private_events force row level security/);
  assert.doesNotMatch(sql, /create policy[^;]*\bto anon\b/);
  assert.doesNotMatch(sql, /grant[^;]*\bto anon\b/);
});

test("signed URL authorization and deterministic expiry are user-scoped", async () => {
  const sql = normalize(await readFile(migrationPath, "utf8"));

  assert.match(
    sql,
    /create or replace function public\.s236p_authorize_signed_url_v1/,
  );
  assert.match(sql, /p_ttl_seconds < 1 or p_ttl_seconds > 300/);
  assert.match(sql, /o\.owner_id = v_owner_id/);
  assert.match(
    sql,
    /revoke all on function public\.s236p_authorize_signed_url_v1\(uuid, integer\) from public, anon/,
  );
  assert.match(
    sql,
    /create or replace function public\.s236p_expired_object_paths_v1/,
  );
  assert.match(sql, /o\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /temporary_expires_at <= p_as_of/);
});

test("live harness is synthetic, user-scoped, and externally fail-closed", async () => {
  const source = await readFile(harnessPath, "utf8");

  assert.match(source, /signInWithPassword/);
  assert.doesNotMatch(source, /\.auth\.signUp|service_role|serviceRole/);
  assert.match(
    source,
    /async function expectNoRowsOrDenied[\s\S]*?if \(error\) return;/,
  );
  assert.match(
    source,
    /expectNoRowsOrDenied\(\s*anonymous\s*\.from\(S236P_OBJECTS_TABLE\)/,
  );
  assert.match(source, /external_network_call_blocked/);
  assert.match(source, /externalOcrAiProviderCalls/);
  assert.match(source, /signed_url_ttl_301_allowed/);
  assert.match(source, /account_b_owner_a_operations_denied/);
  assert.match(source, /anonymous_operations_denied/);
  assert.match(source, /owner_a_to_owner_b_operations_denied/);
  assert.match(source, /deterministic_clock_cleanup_verified/);
  assert.match(source, /raw_canary_not_written_to_application_output/);
  assert.doesNotMatch(source, /console\.(log|error|warn)\([^)]*canaryMarker/);
});
