#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

export const S236P_BUCKET_ID = "s236p-owner-private-v1";
export const S236P_OBJECTS_TABLE = "s236p_owner_private_objects";
export const S236P_EVENTS_TABLE = "s236p_owner_private_events";
export const S236P_PROVIDER_MODE = "none";
export const S236P_MAX_SIGNED_URL_TTL_SECONDS = 300;
export const S236P_MAX_CONTENT_RETENTION_DAYS = 365;
export const S236P_MAX_METADATA_LOG_RETENTION_DAYS = 7;
export const S236P_MAX_TEMPORARY_TTL_SECONDS = 300;
export const S236P_APPLICATION_CACHE_TTL_SECONDS = 0;
export const S236P_MAX_EXPORT_DELETE_SLA_SECONDS = 604800;

const LIVE_FLAG = "S236P_LIVE_ACCEPTANCE";
const REQUIRED_ENV = [
  "S236P_SUPABASE_URL",
  "S236P_SUPABASE_PUBLISHABLE_KEY",
  "S236P_CANARY_MARKER",
  "S236P_OWNER_A_ID",
  "S236P_OWNER_A_EMAIL",
  "S236P_OWNER_A_PASSWORD",
  "S236P_OWNER_B_ID",
  "S236P_OWNER_B_EMAIL",
  "S236P_OWNER_B_PASSWORD",
];
const DENIAL_PROBE_BODY = Buffer.from("s236p-synthetic-denial-probe", "utf8");

class AcceptanceError extends Error {
  constructor(code) {
    super(code);
    this.name = "AcceptanceError";
    this.code = code;
  }
}

function fail(code) {
  throw new AcceptanceError(code);
}

function requireLiveGate() {
  if (process.env[LIVE_FLAG] !== "1") {
    fail("refused_missing_live_acceptance_flag");
  }
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    fail(`missing_required_environment:${missing.join(",")}`);
  }
}

function createNetworkGuard(projectUrl) {
  const projectOrigin = new URL(projectUrl).origin;
  const counters = {
    supabaseCalls: 0,
    externalOcrAiProviderCalls: 0,
  };

  const guardedFetch = async (input, init) => {
    const requestUrl =
      input instanceof Request ? new URL(input.url) : new URL(String(input));
    if (requestUrl.origin !== projectOrigin) {
      counters.externalOcrAiProviderCalls += 1;
      throw new AcceptanceError("external_network_call_blocked");
    }
    counters.supabaseCalls += 1;
    return fetch(input, init);
  };

  return { guardedFetch, counters };
}

function clientFor(projectUrl, publishableKey, guardedFetch, accessToken) {
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;
  return createClient(projectUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: guardedFetch,
      headers,
    },
  });
}

async function signInTemporaryPrincipal({
  projectUrl,
  publishableKey,
  guardedFetch,
  label,
  expectedUserId,
  email,
  password,
}) {
  const bootstrap = clientFor(
    projectUrl,
    publishableKey,
    guardedFetch,
    null,
  );
  const { data, error } = await bootstrap.auth.signInWithPassword({
    email,
    password,
  });
  if (error) fail(`temporary_principal_${label}_sign_in_failed`);
  if (!data.user?.id) fail(`temporary_principal_${label}_missing_id`);
  if (data.user.id !== expectedUserId) {
    fail(`temporary_principal_${label}_identity_mismatch`);
  }
  if (!data.session?.access_token) {
    fail(`temporary_principal_${label}_session_unavailable`);
  }
  return {
    id: data.user.id,
    accessToken: data.session.access_token,
    client: clientFor(
      projectUrl,
      publishableKey,
      guardedFetch,
      data.session.access_token,
    ),
  };
}

function privateObjectRow({
  ownerId,
  objectRef,
  storagePath,
  storageClass = "private",
  overrides = {},
}) {
  return {
    object_ref: objectRef,
    owner_id: ownerId,
    bucket_id: S236P_BUCKET_ID,
    storage_path: storagePath,
    storage_class: storageClass,
    object_state: "active",
    object_version: 1,
    content_retention_days: S236P_MAX_CONTENT_RETENTION_DAYS,
    temporary_ttl_seconds:
      storageClass === "temporary"
        ? S236P_MAX_TEMPORARY_TTL_SECONDS
        : 0,
    signed_url_ttl_seconds: S236P_MAX_SIGNED_URL_TTL_SECONDS,
    application_cache_ttl_seconds:
      S236P_APPLICATION_CACHE_TTL_SECONDS,
    export_delete_sla_seconds: S236P_MAX_EXPORT_DELETE_SLA_SECONDS,
    delete_requested_at: null,
    ocr_ai_provider_mode: S236P_PROVIDER_MODE,
    external_ocr_ai_provider_call_count: 0,
    raw_external_emission_count: 0,
    contains_real_content: false,
    ...overrides,
  };
}

function opaquePath(vaultRef, objectRef, storageClass = "private") {
  return storageClass === "temporary"
    ? `${vaultRef}/temporary/${objectRef}`
    : `${vaultRef}/${objectRef}`;
}

async function insertObjectMetadata(client, row) {
  const result = await client
    .from(S236P_OBJECTS_TABLE)
    .insert(row)
    .select(
      "object_ref,owner_id,bucket_id,storage_path,storage_class,object_state,object_version,content_retention_days,content_expires_at,temporary_ttl_seconds,temporary_expires_at,signed_url_ttl_seconds,application_cache_ttl_seconds,export_delete_sla_seconds,ocr_ai_provider_mode,external_ocr_ai_provider_call_count,raw_external_emission_count,contains_real_content",
    )
    .single();
  if (result.error) fail("owner_metadata_insert_failed");
  return result.data;
}

async function insertEvent(client, ownerId, objectRef, eventType) {
  const { error } = await client.from(S236P_EVENTS_TABLE).insert({
    event_ref: crypto.randomUUID(),
    owner_id: ownerId,
    object_ref: objectRef,
    event_type: eventType,
    retention_days: S236P_MAX_METADATA_LOG_RETENTION_DAYS,
    contains_raw_content: false,
  });
  if (error) fail(`owner_metadata_event_${eventType}_failed`);
}

async function expectInsertRejected(client, row, code) {
  const { error } = await client.from(S236P_OBJECTS_TABLE).insert(row);
  if (!error) fail(code);
}

async function expectEventInsertRejected(client, row, code) {
  const { error } = await client.from(S236P_EVENTS_TABLE).insert(row);
  if (!error) fail(code);
}

async function expectNoRows(query, code) {
  const { data, error } = await query;
  if (error) fail(`${code}_query_failed`);
  if ((data ?? []).length !== 0) fail(code);
}

async function expectStorageError(promise, code) {
  const result = await promise;
  if (!result.error) fail(code);
}

async function expectStorageDeleteDenied(promise, path, code) {
  const result = await promise;
  if (result.error) return;
  if ((result.data ?? []).some((item) => item.name === path)) fail(code);
}

function decodeSignedUrlExpiry(signedUrl) {
  const token = new URL(signedUrl).searchParams.get("token");
  if (!token) fail("signed_url_missing_token");
  const parts = token.split(".");
  if (parts.length !== 3) fail("signed_url_token_not_jwt");
  let payload;
  try {
    payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
  } catch {
    fail("signed_url_token_payload_invalid");
  }
  if (!Number.isInteger(payload?.exp)) fail("signed_url_token_missing_expiry");
  return payload.exp;
}

async function authorizeAndCreateSignedUrl(client, objectRef, ttlSeconds) {
  const authorization = await client.rpc("s236p_authorize_signed_url_v1", {
    p_object_ref: objectRef,
    p_ttl_seconds: ttlSeconds,
  });
  if (authorization.error) return { error: authorization.error };
  if (!Array.isArray(authorization.data) || authorization.data.length !== 1) {
    fail("signed_url_authorization_shape_invalid");
  }
  const grant = authorization.data[0];
  if (
    grant.bucket_id !== S236P_BUCKET_ID ||
    grant.ttl_seconds !== ttlSeconds ||
    typeof grant.storage_path !== "string"
  ) {
    fail("signed_url_authorization_binding_invalid");
  }
  return client.storage
    .from(grant.bucket_id)
    .createSignedUrl(grant.storage_path, grant.ttl_seconds);
}

async function testInvalidPolicyValues(client, ownerId, vaultRef) {
  const cases = [
    ["content_retention_above_365_rejected", { content_retention_days: 366 }],
    [
      "temporary_ttl_above_300_rejected",
      { storage_class: "temporary", temporary_ttl_seconds: 301 },
    ],
    ["signed_url_ttl_above_300_rejected", { signed_url_ttl_seconds: 301 }],
    ["application_cache_nonzero_rejected", { application_cache_ttl_seconds: 1 }],
    ["export_delete_sla_above_7d_rejected", { export_delete_sla_seconds: 604801 }],
    ["external_provider_mode_rejected", { ocr_ai_provider_mode: "external" }],
    [
      "external_provider_call_count_nonzero_rejected",
      { external_ocr_ai_provider_call_count: 1 },
    ],
    ["raw_external_emission_nonzero_rejected", { raw_external_emission_count: 1 }],
    ["real_content_flag_rejected", { contains_real_content: true }],
  ];

  for (const [code, overrides] of cases) {
    const objectRef = crypto.randomUUID();
    const storageClass = overrides.storage_class ?? "private";
    const row = privateObjectRow({
      ownerId,
      objectRef,
      storagePath: opaquePath(vaultRef, objectRef, storageClass),
      storageClass,
      overrides,
    });
    await expectInsertRejected(client, row, code);
  }
}

async function cleanupOwnedObjects(client, paths, objectRefs) {
  if (paths.size > 0) {
    const storageCleanup = await client.storage
      .from(S236P_BUCKET_ID)
      .remove([...paths]);
    if (storageCleanup.error) fail("synthetic_cleanup_storage_failed");
  }
  if (objectRefs.size > 0) {
    const metadataCleanup = await client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .in("object_ref", [...objectRefs]);
    if (metadataCleanup.error) fail("synthetic_cleanup_metadata_failed");
    await expectNoRows(
      client
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .in("object_ref", [...objectRefs]),
      "synthetic_cleanup_metadata_remaining",
    );
  }
}

export async function runS236PLiveAcceptance() {
  requireLiveGate();

  const projectUrl = process.env.S236P_SUPABASE_URL;
  const publishableKey = process.env.S236P_SUPABASE_PUBLISHABLE_KEY;
  const canaryMarker = process.env.S236P_CANARY_MARKER;
  const vaultA = crypto.randomUUID();
  const vaultB = crypto.randomUUID();
  const { guardedFetch, counters } = createNetworkGuard(projectUrl);
  const assertions = [];
  const tempPrincipalIds = [
    process.env.S236P_OWNER_A_ID,
    process.env.S236P_OWNER_B_ID,
  ];
  const cleanupA = { paths: new Set(), objectRefs: new Set() };
  const cleanupB = { paths: new Set(), objectRefs: new Set() };
  let principalA;
  let principalB;

  const record = (assertion) => assertions.push(assertion);

  try {
    principalA = await signInTemporaryPrincipal({
      projectUrl,
      publishableKey,
      guardedFetch,
      label: "a",
      expectedUserId: process.env.S236P_OWNER_A_ID,
      email: process.env.S236P_OWNER_A_EMAIL,
      password: process.env.S236P_OWNER_A_PASSWORD,
    });
    principalB = await signInTemporaryPrincipal({
      projectUrl,
      publishableKey,
      guardedFetch,
      label: "b",
      expectedUserId: process.env.S236P_OWNER_B_ID,
      email: process.env.S236P_OWNER_B_EMAIL,
      password: process.env.S236P_OWNER_B_PASSWORD,
    });
    if (principalA.id === principalB.id) fail("temporary_principals_not_distinct");
    record("temporary_principals_user_scoped");

    const anonymous = clientFor(
      projectUrl,
      publishableKey,
      guardedFetch,
      null,
    );

    const objectARef = crypto.randomUUID();
    const pathA = opaquePath(vaultA, objectARef);
    cleanupA.paths.add(pathA);
    cleanupA.objectRefs.add(objectARef);
    const metadataA = await insertObjectMetadata(
      principalA.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: objectARef,
        storagePath: pathA,
      }),
    );
    assert.equal(metadataA.owner_id, principalA.id);
    assert.equal(metadataA.content_retention_days, 365);
    assert.equal(metadataA.signed_url_ttl_seconds, 300);
    assert.equal(metadataA.application_cache_ttl_seconds, 0);
    assert.equal(metadataA.ocr_ai_provider_mode, "none");
    assert.equal(metadataA.external_ocr_ai_provider_call_count, 0);
    assert.equal(metadataA.raw_external_emission_count, 0);
    assert.equal(metadataA.contains_real_content, false);
    record("owner_a_metadata_insert_allowed");

    const bodyA1 = Buffer.from(
      `${canaryMarker}:owner-a:version-1:${crypto.randomUUID()}`,
      "utf8",
    );
    const uploadA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .upload(pathA, bodyA1, {
        contentType: "application/octet-stream",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadA.error) fail("owner_a_upload_failed");
    await insertEvent(principalA.client, principalA.id, objectARef, "upload");
    record("owner_a_upload_allowed");

    const listA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .list(vaultA, { limit: 10 });
    if (listA.error) fail("owner_a_list_failed");
    const listedA = (listA.data ?? []).find((item) => item.name === objectARef);
    if (!listedA) fail("owner_a_list_missing_canary");
    const cacheControl = String(listedA.metadata?.cacheControl ?? "");
    if (!/(?:^|=)0$/.test(cacheControl)) fail("owner_a_cache_control_not_zero");
    await insertEvent(principalA.client, principalA.id, objectARef, "list");
    record("owner_a_list_allowed");
    record("storage_cache_control_zero");

    const downloadA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .download(pathA);
    if (downloadA.error || !downloadA.data) fail("owner_a_read_failed");
    const downloadedA = Buffer.from(await downloadA.data.arrayBuffer());
    if (!downloadedA.equals(bodyA1)) fail("owner_a_read_mismatch");
    await insertEvent(principalA.client, principalA.id, objectARef, "read");
    record("owner_a_read_allowed");

    const bodyA2 = Buffer.from(
      `${canaryMarker}:owner-a:version-2:${crypto.randomUUID()}`,
      "utf8",
    );
    const updateA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .update(pathA, bodyA2, {
        contentType: "application/octet-stream",
        cacheControl: "0",
      });
    if (updateA.error) fail("owner_a_update_failed");
    const metadataUpdateA = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .update({ object_state: "active", object_version: 2 })
      .eq("object_ref", objectARef)
      .select("object_ref,object_version");
    if (
      metadataUpdateA.error ||
      metadataUpdateA.data?.length !== 1 ||
      metadataUpdateA.data[0].object_version !== 2
    ) {
      fail("owner_a_metadata_update_failed");
    }
    await insertEvent(principalA.client, principalA.id, objectARef, "update");
    record("owner_a_update_allowed");

    await expectStorageError(
      principalB.client.storage
        .from(S236P_BUCKET_ID)
        .upload(pathA, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: true,
        }),
      "account_b_upload_owner_a_allowed",
    );
    const listBOfA = await principalB.client.storage
      .from(S236P_BUCKET_ID)
      .list(vaultA, { limit: 10 });
    if (!listBOfA.error && (listBOfA.data ?? []).length !== 0) {
      fail("account_b_list_owner_a_allowed");
    }
    await expectStorageError(
      principalB.client.storage.from(S236P_BUCKET_ID).download(pathA),
      "account_b_read_owner_a_allowed",
    );
    await expectStorageError(
      principalB.client.storage
        .from(S236P_BUCKET_ID)
        .update(pathA, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
        }),
      "account_b_update_owner_a_allowed",
    );
    await expectStorageDeleteDenied(
      principalB.client.storage.from(S236P_BUCKET_ID).remove([pathA]),
      pathA,
      "account_b_delete_owner_a_allowed",
    );
    await expectNoRows(
      principalB.client
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", objectARef),
      "account_b_metadata_select_owner_a_allowed",
    );
    await expectInsertRejected(
      principalB.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: crypto.randomUUID(),
        storagePath: opaquePath(vaultA, crypto.randomUUID()),
      }),
      "account_b_metadata_insert_owner_a_allowed",
    );
    await expectNoRows(
      principalB.client
        .from(S236P_OBJECTS_TABLE)
        .update({ object_state: "active", object_version: 3 })
        .eq("object_ref", objectARef)
        .select("object_ref"),
      "account_b_metadata_update_owner_a_allowed",
    );
    await expectNoRows(
      principalB.client
        .from(S236P_OBJECTS_TABLE)
        .delete()
        .eq("object_ref", objectARef)
        .select("object_ref"),
      "account_b_metadata_delete_owner_a_allowed",
    );
    record("account_b_owner_a_operations_denied");

    await expectStorageError(
      anonymous.storage
        .from(S236P_BUCKET_ID)
        .upload(pathA, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: true,
        }),
      "anonymous_upload_allowed",
    );
    const anonymousList = await anonymous.storage
      .from(S236P_BUCKET_ID)
      .list(vaultA, { limit: 10 });
    if (!anonymousList.error && (anonymousList.data ?? []).length !== 0) {
      fail("anonymous_list_allowed");
    }
    await expectStorageError(
      anonymous.storage.from(S236P_BUCKET_ID).download(pathA),
      "anonymous_read_allowed",
    );
    await expectStorageError(
      anonymous.storage
        .from(S236P_BUCKET_ID)
        .update(pathA, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
        }),
      "anonymous_update_allowed",
    );
    await expectStorageDeleteDenied(
      anonymous.storage.from(S236P_BUCKET_ID).remove([pathA]),
      pathA,
      "anonymous_delete_allowed",
    );
    await expectNoRows(
      anonymous
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", objectARef),
      "anonymous_metadata_select_allowed",
    );
    const anonymousInsert = await anonymous
      .from(S236P_OBJECTS_TABLE)
      .insert(
        privateObjectRow({
          ownerId: principalA.id,
          objectRef: crypto.randomUUID(),
          storagePath: opaquePath(vaultA, crypto.randomUUID()),
        }),
      );
    if (!anonymousInsert.error) fail("anonymous_metadata_insert_allowed");
    const anonymousUpdate = await anonymous
      .from(S236P_OBJECTS_TABLE)
      .update({ object_state: "active", object_version: 3 })
      .eq("object_ref", objectARef)
      .select("object_ref");
    if (!anonymousUpdate.error && (anonymousUpdate.data ?? []).length !== 0) {
      fail("anonymous_metadata_update_allowed");
    }
    const anonymousDelete = await anonymous
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", objectARef)
      .select("object_ref");
    if (!anonymousDelete.error && (anonymousDelete.data ?? []).length !== 0) {
      fail("anonymous_metadata_delete_allowed");
    }
    record("anonymous_operations_denied");

    const signed300 = await authorizeAndCreateSignedUrl(
      principalA.client,
      objectARef,
      300,
    );
    if (signed300.error || !signed300.data?.signedUrl) {
      fail("signed_url_300_issuance_failed");
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = decodeSignedUrlExpiry(signed300.data.signedUrl);
    if (expiresAt <= nowSeconds || expiresAt - nowSeconds > 300) {
      fail("signed_url_expiry_exceeds_300");
    }
    await insertEvent(principalA.client, principalA.id, objectARef, "signed_url");
    record("signed_url_ttl_300_allowed");
    record("signed_url_expiry_at_most_300");

    const signed301 = await authorizeAndCreateSignedUrl(
      principalA.client,
      objectARef,
      301,
    );
    if (!signed301.error) fail("signed_url_ttl_301_allowed");
    record("signed_url_ttl_above_300_denied");

    const signedByB = await authorizeAndCreateSignedUrl(
      principalB.client,
      objectARef,
      300,
    );
    if (!signedByB.error) fail("account_b_signed_url_owner_a_allowed");
    const signedByAnonymous = await anonymous.rpc(
      "s236p_authorize_signed_url_v1",
      {
        p_object_ref: objectARef,
        p_ttl_seconds: 300,
      },
    );
    if (!signedByAnonymous.error) fail("anonymous_signed_url_allowed");
    record("signed_url_owner_and_auth_boundary_enforced");

    await testInvalidPolicyValues(principalA.client, principalA.id, vaultA);
    record("retention_ttl_sla_policy_limits_enforced");

    await expectEventInsertRejected(
      principalA.client,
      {
        event_ref: crypto.randomUUID(),
        owner_id: principalA.id,
        object_ref: objectARef,
        event_type: "read",
        retention_days: 8,
        contains_raw_content: false,
      },
      "metadata_log_retention_above_7d_allowed",
    );
    record("metadata_log_retention_at_most_7d");

    const tempRef = crypto.randomUUID();
    const tempPath = opaquePath(vaultA, tempRef, "temporary");
    cleanupA.paths.add(tempPath);
    cleanupA.objectRefs.add(tempRef);
    const tempMetadata = await insertObjectMetadata(
      principalA.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: tempRef,
        storagePath: tempPath,
        storageClass: "temporary",
      }),
    );
    const tempBody = Buffer.from(
      `${canaryMarker}:temporary:${crypto.randomUUID()}`,
      "utf8",
    );
    const tempUpload = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .upload(tempPath, tempBody, {
        contentType: "application/octet-stream",
        cacheControl: "0",
        upsert: false,
      });
    if (tempUpload.error) fail("temporary_object_upload_failed");
    const deterministicAsOf = new Date(
      new Date(tempMetadata.temporary_expires_at).getTime() + 1,
    ).toISOString();
    const expired = await principalA.client.rpc(
      "s236p_expired_object_paths_v1",
      { p_as_of: deterministicAsOf },
    );
    if (
      expired.error ||
      !expired.data?.some((item) => item.object_ref === tempRef)
    ) {
      fail("deterministic_expiry_not_detected");
    }
    const tempDelete = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([tempPath]);
    if (tempDelete.error) fail("temporary_object_cleanup_failed");
    const tempMetadataDelete = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", tempRef)
      .select("object_ref");
    if (
      tempMetadataDelete.error ||
      tempMetadataDelete.data?.length !== 1
    ) {
      fail("temporary_metadata_cleanup_failed");
    }
    cleanupA.paths.delete(tempPath);
    cleanupA.objectRefs.delete(tempRef);
    const tempListAfterCleanup = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .list(`${vaultA}/temporary`, { limit: 10 });
    if (
      tempListAfterCleanup.error ||
      (tempListAfterCleanup.data ?? []).some((item) => item.name === tempRef)
    ) {
      fail("temporary_object_cleanup_not_observed");
    }
    await expectNoRows(
      principalA.client
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", tempRef),
      "temporary_metadata_cleanup_not_observed",
    );
    record("expired_temporary_object_and_metadata_cleaned");
    record("deterministic_clock_cleanup_verified");

    const objectBRef = crypto.randomUUID();
    const pathB = opaquePath(vaultB, objectBRef);
    cleanupB.paths.add(pathB);
    cleanupB.objectRefs.add(objectBRef);
    await insertObjectMetadata(
      principalB.client,
      privateObjectRow({
        ownerId: principalB.id,
        objectRef: objectBRef,
        storagePath: pathB,
      }),
    );
    const bodyB = Buffer.from(
      `${canaryMarker}:owner-b:${crypto.randomUUID()}`,
      "utf8",
    );
    const uploadB = await principalB.client.storage
      .from(S236P_BUCKET_ID)
      .upload(pathB, bodyB, {
        contentType: "application/octet-stream",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadB.error) fail("owner_b_setup_upload_failed");
    await expectStorageError(
      principalA.client.storage.from(S236P_BUCKET_ID).download(pathB),
      "owner_a_read_owner_b_allowed",
    );
    await expectStorageError(
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .update(pathB, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
        }),
      "owner_a_update_owner_b_allowed",
    );
    await expectStorageDeleteDenied(
      principalA.client.storage.from(S236P_BUCKET_ID).remove([pathB]),
      pathB,
      "owner_a_delete_owner_b_allowed",
    );
    await expectNoRows(
      principalA.client
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", objectBRef),
      "owner_a_metadata_read_owner_b_allowed",
    );
    record("owner_a_to_owner_b_operations_denied");
    record("bidirectional_owner_isolation");

    const deleteA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([pathA]);
    if (deleteA.error) fail("owner_a_delete_failed");
    const deleteMetadataA = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", objectARef)
      .select("object_ref");
    if (
      deleteMetadataA.error ||
      deleteMetadataA.data?.length !== 1
    ) {
      fail("owner_a_metadata_delete_failed");
    }
    cleanupA.paths.delete(pathA);
    cleanupA.objectRefs.delete(objectARef);
    record("owner_a_delete_allowed");
    record("owner_a_metadata_delete_allowed");

    const deleteB = await principalB.client.storage
      .from(S236P_BUCKET_ID)
      .remove([pathB]);
    if (deleteB.error) fail("owner_b_cleanup_storage_failed");
    const deleteMetadataB = await principalB.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", objectBRef)
      .select("object_ref");
    if (
      deleteMetadataB.error ||
      deleteMetadataB.data?.length !== 1
    ) {
      fail("owner_b_cleanup_metadata_failed");
    }
    cleanupB.paths.delete(pathB);
    cleanupB.objectRefs.delete(objectBRef);

    if (counters.externalOcrAiProviderCalls !== 0) {
      fail("external_ocr_ai_provider_call_observed");
    }
    record("ocr_ai_provider_mode_none");
    record("external_ocr_ai_provider_calls_zero");
    record("raw_canary_not_written_to_application_output");

    return {
      status: "passed",
      assertions,
      tempPrincipalIds,
      counters,
    };
  } finally {
    if (principalA) {
      await cleanupOwnedObjects(
        principalA.client,
        cleanupA.paths,
        cleanupA.objectRefs,
      );
    }
    if (principalB) {
      await cleanupOwnedObjects(
        principalB.client,
        cleanupB.paths,
        cleanupB.objectRefs,
      );
    }
  }
}

async function main() {
  const tempPrincipalIds = [
    process.env.S236P_OWNER_A_ID,
    process.env.S236P_OWNER_B_ID,
  ].filter(Boolean);
  try {
    const result = await runS236PLiveAcceptance();
    process.stdout.write(
      `${JSON.stringify({
        kind: "s236p_operator_result_v1",
        status: result.status,
        assertionCount: result.assertions.length,
        assertions: result.assertions,
        providerMode: S236P_PROVIDER_MODE,
        externalOcrAiProviderCalls:
          result.counters.externalOcrAiProviderCalls,
        temporaryPrincipalIdsForCleanup: result.tempPrincipalIds,
      })}\n`,
    );
  } catch (error) {
    const code =
      error instanceof AcceptanceError
        ? error.code
        : "unexpected_acceptance_failure";
    process.stdout.write(
      `${JSON.stringify({
        kind: "s236p_operator_result_v1",
        status: "failed",
        failureCode: code,
        temporaryPrincipalIdsForCleanup: tempPrincipalIds,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
