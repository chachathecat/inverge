#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

export const S236P_BUCKET_ID = "s236p-owner-private-v1";
export const S236P_OBJECTS_TABLE = "s236p_owner_private_objects";
export const S236P_EVENTS_TABLE = "s236p_owner_private_events";
export const S236P_PROVIDER_MODE = "none";
export const S236P_EVENT_LOG_MODE = "none";
export const S236P_EVENT_LOG_RETENTION_DAYS = 0;
export const S236P_MAX_SIGNED_URL_TTL_SECONDS = 300;
export const S236P_MAX_CONTENT_RETENTION_DAYS = 365;
export const S236P_MAX_TEMPORARY_TTL_SECONDS = 300;
export const TEMPORARY_ACCEPTANCE_TTL_SECONDS = 30;
export const TEMPORARY_EXPIRY_SAFETY_MARGIN_MS = 250;
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
const BULK_SIGN_TTLS = Object.freeze([1, 300, 301]);
const SINGLE_SIGN_TTLS = Object.freeze([1, 300, 301]);
const TEMPORARY_EXPIRY_WAIT_MAX_MS =
  (TEMPORARY_ACCEPTANCE_TTL_SECONDS + 5) * 1_000;

class AcceptanceError extends Error {
  constructor(code, details = undefined) {
    super(code);
    this.name = "AcceptanceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, details) {
  throw new AcceptanceError(code, details);
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
  const bootstrap = clientFor(projectUrl, publishableKey, guardedFetch, null);
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
  parentObjectRef = null,
  revisionNumber = parentObjectRef ? 2 : 1,
  overrides = {},
}) {
  return {
    object_ref: objectRef,
    owner_id: ownerId,
    parent_object_ref: parentObjectRef,
    revision_number: revisionNumber,
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
    application_cache_ttl_seconds: S236P_APPLICATION_CACHE_TTL_SECONDS,
    export_delete_sla_seconds: S236P_MAX_EXPORT_DELETE_SLA_SECONDS,
    ocr_ai_provider_mode: S236P_PROVIDER_MODE,
    external_ocr_ai_provider_call_count: 0,
    raw_external_emission_count: 0,
    contains_real_content: false,
    ...overrides,
  };
}

export function temporaryAcceptanceObjectRow({
  ownerId,
  objectRef,
  storagePath,
}) {
  return privateObjectRow({
    ownerId,
    objectRef,
    storagePath,
    storageClass: "temporary",
    overrides: {
      temporary_ttl_seconds: TEMPORARY_ACCEPTANCE_TTL_SECONDS,
    },
  });
}

function opaquePath(vaultRef, objectRef, storageClass = "private") {
  return storageClass === "temporary"
    ? `${vaultRef}/temporary/${objectRef}`
    : `${vaultRef}/${objectRef}`;
}

function encodedStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function insertObjectMetadata(client, row) {
  const result = await client
    .from(S236P_OBJECTS_TABLE)
    .insert(row)
    .select(
      "object_ref,owner_id,parent_object_ref,revision_number,bucket_id,storage_path,storage_class,object_state,object_version,content_retention_days,content_expires_at,temporary_ttl_seconds,temporary_expires_at,application_cache_ttl_seconds,export_delete_sla_seconds,ocr_ai_provider_mode,external_ocr_ai_provider_call_count,raw_external_emission_count,contains_real_content",
    )
    .single();
  if (result.error) fail("owner_metadata_insert_failed");
  return result.data;
}

async function expectInsertRejected(client, row, code) {
  const { error } = await client.from(S236P_OBJECTS_TABLE).insert(row);
  if (!error) fail(code);
}

async function expectNoRows(query, code) {
  const { data, error } = await query;
  if (error) fail(`${code}_query_failed`);
  if ((data ?? []).length !== 0) fail(code);
}

async function expectNoRowsOrDenied(query, code) {
  const { data, error } = await query;
  if (error) return;
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

async function expectStorageListHidden(client, prefix, code) {
  const result = await client.storage
    .from(S236P_BUCKET_ID)
    .list(prefix, { limit: 20 });
  if (!result.error && (result.data ?? []).length !== 0) fail(code);
}

async function expectStorageInfoDenied(client, path, code) {
  const result = await client.storage.from(S236P_BUCKET_ID).info(path);
  if (!result.error && result.data) fail(code);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

export function classifyBulkSignedUrlResponse(result) {
  const classification = {
    status: "inconclusive",
    itemCount: 0,
    deniedItemCount: 0,
    itemErrorPresent: false,
    signedUrlPresent: false,
  };
  if (!result || typeof result !== "object" || result.error) {
    return classification;
  }
  if (!Array.isArray(result.data) || result.data.length === 0) {
    return classification;
  }

  classification.itemCount = result.data.length;
  for (const item of result.data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return classification;
    }
    const itemErrorPresent = nonEmptyString(item.error);
    const signedUrlPresent =
      nonEmptyString(item.signedUrl) || nonEmptyString(item.signedURL);
    classification.itemErrorPresent ||= itemErrorPresent;
    classification.signedUrlPresent ||= signedUrlPresent;

    if (signedUrlPresent) {
      classification.status = "allowed";
      return classification;
    }
    if (
      !itemErrorPresent ||
      item.signedUrl !== null ||
      item.signedURL !== null
    ) {
      return classification;
    }
    classification.deniedItemCount += 1;
  }

  if (classification.deniedItemCount === classification.itemCount) {
    classification.status = "denied";
  }
  return classification;
}

async function expectSingleSignedUrlDenied(client, path, ttlSeconds, role) {
  const result = await client.storage
    .from(S236P_BUCKET_ID)
    .createSignedUrl(path, ttlSeconds);
  const signedUrlPresent =
    nonEmptyString(result.data?.signedUrl) ||
    nonEmptyString(result.data?.signedURL);
  if (signedUrlPresent) {
    fail("direct_signed_url_allowed", {
      clientRole: role,
      ttlSeconds,
      signedUrlPresent: true,
    });
  }
  if (!result.error) {
    fail("direct_signed_url_inconclusive", {
      clientRole: role,
      ttlSeconds,
      signedUrlPresent: false,
    });
  }
}

async function expectBulkSignedUrlDenied(client, path, ttlSeconds, role) {
  const result = await client.storage
    .from(S236P_BUCKET_ID)
    .createSignedUrls([path], ttlSeconds);
  const classification = classifyBulkSignedUrlResponse(result);
  const safeDetails = {
    clientRole: role,
    ttlSeconds,
    itemCount: classification.itemCount,
    deniedItemCount: classification.deniedItemCount,
    itemErrorPresent: classification.itemErrorPresent,
    signedUrlPresent: classification.signedUrlPresent,
  };
  if (classification.status === "allowed") {
    fail("bulk_signed_url_allowed", safeDetails);
  }
  if (classification.status !== "denied") {
    fail("bulk_signed_url_inconclusive", safeDetails);
  }
  return safeDetails;
}

async function directAuthenticatedGet({
  accessToken,
  guardedFetch,
  method = "GET",
  path,
  projectUrl,
  publishableKey,
}) {
  const headers = {
    apikey: publishableKey,
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return guardedFetch(
    `${projectUrl}/storage/v1/object/authenticated/${S236P_BUCKET_ID}/${encodedStoragePath(path)}`,
    {
      method,
      headers,
    },
  );
}

async function directAuthenticatedDelete({
  accessToken,
  guardedFetch,
  path,
  projectUrl,
  publishableKey,
}) {
  return guardedFetch(
    `${projectUrl}/storage/v1/object/${S236P_BUCKET_ID}/${encodedStoragePath(path)}`,
    {
      method: "DELETE",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
}

async function expectDirectGetDenied(options, code) {
  const response = await directAuthenticatedGet(options);
  if (response.ok) fail(code);
}

async function expectDirectHeadDenied(options, code) {
  const response = await directAuthenticatedGet({
    ...options,
    method: "HEAD",
  });
  if (response.ok) fail(code);
}

export function assertTemporaryAcceptanceMetadata(metadata) {
  if (
    metadata?.temporary_ttl_seconds !== TEMPORARY_ACCEPTANCE_TTL_SECONDS
  ) {
    fail("temporary_metadata_ttl_not_acceptance_window");
  }
  const createdAtMs = Date.parse(metadata.created_at);
  if (!Number.isFinite(createdAtMs)) {
    fail("temporary_metadata_created_at_invalid");
  }
  const expiresAtMs = Date.parse(metadata.temporary_expires_at);
  if (!Number.isFinite(expiresAtMs)) {
    fail("temporary_metadata_expiry_invalid");
  }
  if (
    expiresAtMs - createdAtMs !==
    TEMPORARY_ACCEPTANCE_TTL_SECONDS * 1_000
  ) {
    fail("temporary_metadata_expiry_interval_mismatch");
  }
  return { createdAtMs, expiresAtMs };
}

export async function waitUntilAfterServerTimestamp(
  timestamp,
  code,
  dependencies = {},
) {
  const expiresAtMs = Date.parse(timestamp);
  if (!Number.isFinite(expiresAtMs)) fail(`${code}_invalid_timestamp`);
  const now = dependencies.now ?? Date.now;
  const sleep =
    dependencies.sleep ??
    ((milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const targetMs = expiresAtMs + TEMPORARY_EXPIRY_SAFETY_MARGIN_MS;
  const startedAtMs = now();
  if (targetMs - startedAtMs > TEMPORARY_EXPIRY_WAIT_MAX_MS) {
    fail(`${code}_wait_timeout`);
  }
  while (now() < targetMs) {
    if (now() - startedAtMs > TEMPORARY_EXPIRY_WAIT_MAX_MS) {
      fail(`${code}_wait_timeout`);
    }
    const remainingMs = targetMs - now();
    await sleep(Math.min(Math.max(remainingMs, 25), 250));
  }
}

async function expectRawStorageRequestDenied(
  {
    accessToken,
    body,
    endpoint,
    guardedFetch,
    headers = {},
    method,
    projectUrl,
    publishableKey,
  },
  code,
) {
  const response = await guardedFetch(`${projectUrl}/storage/v1/${endpoint}`, {
    method,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      ...headers,
    },
    body,
  });
  if (response.ok) fail(code);
}

async function assertDownloadBytes(client, path, expected, code) {
  const result = await client.storage.from(S236P_BUCKET_ID).download(path);
  if (result.error || !result.data) fail(`${code}_failed`);
  const actual = Buffer.from(await result.data.arrayBuffer());
  if (!actual.equals(expected)) fail(`${code}_mismatch`);
}

async function testInvalidPolicyValues(client, ownerId, vaultRef) {
  const cases = [
    ["content_retention_above_365_rejected", { content_retention_days: 366 }],
    [
      "temporary_ttl_above_300_rejected",
      { storage_class: "temporary", temporary_ttl_seconds: 301 },
    ],
    ["application_cache_nonzero_rejected", { application_cache_ttl_seconds: 1 }],
    ["export_delete_sla_above_7d_rejected", { export_delete_sla_seconds: 604801 }],
    ["external_provider_mode_rejected", { ocr_ai_provider_mode: "external" }],
    [
      "external_provider_call_count_nonzero_rejected",
      { external_ocr_ai_provider_call_count: 1 },
    ],
    ["raw_external_emission_nonzero_rejected", { raw_external_emission_count: 1 }],
    ["real_content_flag_rejected", { contains_real_content: true }],
    ["object_version_above_one_rejected", { object_version: 2 }],
    ["orphan_revision_rejected", { revision_number: 2 }],
  ];

  for (const [code, overrides] of cases) {
    const objectRef = crypto.randomUUID();
    const storageClass = overrides.storage_class ?? "private";
    await expectInsertRejected(
      client,
      privateObjectRow({
        ownerId,
        objectRef,
        storagePath: opaquePath(vaultRef, objectRef, storageClass),
        storageClass,
        overrides,
      }),
      code,
    );
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
  const bulkSignedUrlChecks = [];
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

    const anonymous = clientFor(projectUrl, publishableKey, guardedFetch, null);
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
    assert.equal(metadataA.parent_object_ref, null);
    assert.equal(metadataA.revision_number, 1);
    assert.equal(metadataA.content_retention_days, 365);
    assert.equal(metadataA.application_cache_ttl_seconds, 0);
    assert.equal(metadataA.ocr_ai_provider_mode, "none");
    assert.equal(metadataA.external_ocr_ai_provider_call_count, 0);
    assert.equal(metadataA.raw_external_emission_count, 0);
    assert.equal(metadataA.contains_real_content, false);
    record("owner_a_metadata_insert_allowed");

    const bodyA1 = Buffer.from(
      `${canaryMarker}:owner-a:original:${crypto.randomUUID()}`,
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
    record("owner_a_upload_allowed");

    const listA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .list(vaultA, { limit: 20 });
    if (listA.error) fail("owner_a_list_failed");
    const listedA = (listA.data ?? []).find((item) => item.name === objectARef);
    if (!listedA) fail("owner_a_list_missing_canary");
    const cacheControl = String(listedA.metadata?.cacheControl ?? "");
    if (!/(?:^|=)0$/.test(cacheControl)) fail("owner_a_cache_control_not_zero");
    record("owner_a_list_allowed");
    record("storage_cache_control_zero");

    const infoA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .info(pathA);
    if (infoA.error || !infoA.data) fail("owner_a_info_failed");
    record("owner_a_info_allowed");

    await assertDownloadBytes(
      principalA.client,
      pathA,
      bodyA1,
      "owner_a_download",
    );
    record("owner_a_download_allowed");

    const directA = await directAuthenticatedGet({
      accessToken: principalA.accessToken,
      guardedFetch,
      path: pathA,
      projectUrl,
      publishableKey,
    });
    if (!directA.ok) fail("owner_a_direct_authenticated_get_failed");
    const directBytes = Buffer.from(await directA.arrayBuffer());
    if (!directBytes.equals(bodyA1)) {
      fail("owner_a_direct_authenticated_get_mismatch");
    }
    record("owner_a_direct_authenticated_get_allowed");

    const headA = await directAuthenticatedGet({
      accessToken: principalA.accessToken,
      guardedFetch,
      method: "HEAD",
      path: pathA,
      projectUrl,
      publishableKey,
    });
    if (!headA.ok) fail("owner_a_authenticated_head_failed");
    record("owner_a_authenticated_head_allowed");

    await expectStorageInfoDenied(
      principalB.client,
      pathA,
      "account_b_info_owner_a_allowed",
    );
    await expectStorageError(
      principalB.client.storage.from(S236P_BUCKET_ID).download(pathA),
      "account_b_download_owner_a_allowed",
    );
    await expectStorageListHidden(
      principalB.client,
      vaultA,
      "account_b_list_owner_a_allowed",
    );
    await expectStorageInfoDenied(
      anonymous,
      pathA,
      "anonymous_info_allowed",
    );
    await expectStorageError(
      anonymous.storage.from(S236P_BUCKET_ID).download(pathA),
      "anonymous_download_allowed",
    );
    await expectStorageListHidden(
      anonymous,
      vaultA,
      "anonymous_list_allowed",
    );
    await expectDirectGetDenied(
      {
        accessToken: principalB.accessToken,
        guardedFetch,
        path: pathA,
        projectUrl,
        publishableKey,
      },
      "account_b_direct_authenticated_get_owner_a_allowed",
    );
    await expectDirectGetDenied(
      {
        accessToken: null,
        guardedFetch,
        path: pathA,
        projectUrl,
        publishableKey,
      },
      "anonymous_direct_get_allowed",
    );
    await expectDirectHeadDenied(
      {
        accessToken: principalB.accessToken,
        guardedFetch,
        path: pathA,
        projectUrl,
        publishableKey,
      },
      "account_b_authenticated_head_owner_a_allowed",
    );
    await expectDirectHeadDenied(
      {
        accessToken: null,
        guardedFetch,
        path: pathA,
        projectUrl,
        publishableKey,
      },
      "anonymous_authenticated_head_allowed",
    );
    record("account_b_and_anonymous_info_download_list_and_head_denied");

    for (const ttlSeconds of SINGLE_SIGN_TTLS) {
      await expectSingleSignedUrlDenied(
        principalA.client,
        pathA,
        ttlSeconds,
        "owner_a",
      );
    }
    record("single_signed_urls_denied");

    for (const ttlSeconds of BULK_SIGN_TTLS) {
      bulkSignedUrlChecks.push(
        await expectBulkSignedUrlDenied(
          principalA.client,
          pathA,
          ttlSeconds,
          "owner_a",
        ),
      );
    }
    record("bulk_signed_urls_item_level_denied");

    await expectSingleSignedUrlDenied(
      principalB.client,
      pathA,
      300,
      "owner_b",
    );
    await expectSingleSignedUrlDenied(anonymous, pathA, 300, "anonymous");
    await expectStorageError(
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .createSignedUploadUrl(pathA),
      "signed_upload_url_allowed",
    );
    record("signed_access_disabled");

    await expectRawStorageRequestDenied(
      {
        accessToken: principalA.accessToken,
        endpoint: `s3/${S236P_BUCKET_ID}/${encodedStoragePath(pathA)}`,
        guardedFetch,
        method: "GET",
        projectUrl,
        publishableKey,
      },
      "s3_access_allowed",
    );
    const tusPath = `${vaultA}/temporary/${crypto.randomUUID()}`;
    cleanupA.paths.add(tusPath);
    await expectRawStorageRequestDenied(
      {
        accessToken: principalA.accessToken,
        endpoint: "upload/resumable",
        guardedFetch,
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Length": "0",
          "Upload-Metadata": [
            `bucketName ${Buffer.from(S236P_BUCKET_ID).toString("base64")}`,
            `objectName ${Buffer.from(tusPath).toString("base64")}`,
          ].join(","),
        },
        method: "POST",
        projectUrl,
        publishableKey,
      },
      "tus_access_allowed",
    );
    cleanupA.paths.delete(tusPath);
    record("s3_tus_access_denied");

    const movePath = `${vaultA}/${crypto.randomUUID()}`;
    const copyPath = `${vaultA}/${crypto.randomUUID()}`;
    cleanupA.paths.add(movePath);
    cleanupA.paths.add(copyPath);
    await expectStorageError(
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .upload(pathA, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: true,
        }),
      "owner_a_upsert_allowed",
    );
    await expectStorageError(
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .update(pathA, DENIAL_PROBE_BODY, {
          contentType: "application/octet-stream",
          cacheControl: "0",
        }),
      "owner_a_overwrite_allowed",
    );
    await expectStorageError(
      principalA.client.storage.from(S236P_BUCKET_ID).move(pathA, movePath),
      "owner_a_move_allowed",
    );
    await expectStorageError(
      principalA.client.storage.from(S236P_BUCKET_ID).copy(pathA, copyPath),
      "owner_a_copy_allowed",
    );
    record("overwrite_upsert_move_copy_denied");

    const revisionRef = crypto.randomUUID();
    const revisionPath = opaquePath(vaultA, revisionRef);
    cleanupA.paths.add(revisionPath);
    cleanupA.objectRefs.add(revisionRef);
    const revisionMetadata = await insertObjectMetadata(
      principalA.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: revisionRef,
        storagePath: revisionPath,
        parentObjectRef: objectARef,
        revisionNumber: 2,
      }),
    );
    assert.equal(revisionMetadata.parent_object_ref, objectARef);
    assert.equal(revisionMetadata.revision_number, 2);
    const bodyA2 = Buffer.from(
      `${canaryMarker}:owner-a:revision-2:${crypto.randomUUID()}`,
      "utf8",
    );
    const revisionUpload = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .upload(revisionPath, bodyA2, {
        contentType: "application/octet-stream",
        cacheControl: "0",
        upsert: false,
      });
    if (revisionUpload.error) fail("owner_a_revision_upload_failed");
    await assertDownloadBytes(
      principalA.client,
      pathA,
      bodyA1,
      "owner_a_original_after_revision",
    );
    await assertDownloadBytes(
      principalA.client,
      revisionPath,
      bodyA2,
      "owner_a_revision_download",
    );
    await expectInsertRejected(
      principalA.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: crypto.randomUUID(),
        storagePath: opaquePath(vaultA, crypto.randomUUID()),
        parentObjectRef: objectARef,
        revisionNumber: 4,
      }),
      "nonsequential_revision_allowed",
    );
    const immutableUpdate = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .update({ revision_number: 3 })
      .eq("object_ref", revisionRef)
      .select("object_ref");
    if (
      !immutableUpdate.error &&
      (immutableUpdate.data ?? []).length !== 0
    ) {
      fail("immutable_revision_metadata_update_allowed");
    }
    record("immutable_original_append_only_revision_verified");

    await testInvalidPolicyValues(principalA.client, principalA.id, vaultA);
    record("retention_ttl_sla_provider_raw_limits_enforced");

    const eventLogProbe = await principalA.client
      .from(S236P_EVENTS_TABLE)
      .select("*")
      .limit(1);
    if (!eventLogProbe.error) fail("persistent_event_log_present");
    record("persistent_event_log_disabled");

    const tempRef = crypto.randomUUID();
    const tempPath = opaquePath(vaultA, tempRef, "temporary");
    const tempBulkRef = crypto.randomUUID();
    const tempBulkPath = opaquePath(vaultA, tempBulkRef, "temporary");
    cleanupA.paths.add(tempPath);
    cleanupA.paths.add(tempBulkPath);
    cleanupA.objectRefs.add(tempRef);
    cleanupA.objectRefs.add(tempBulkRef);
    const tempMetadataInsert = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .insert([
        temporaryAcceptanceObjectRow({
          ownerId: principalA.id,
          objectRef: tempRef,
          storagePath: tempPath,
        }),
        temporaryAcceptanceObjectRow({
          ownerId: principalA.id,
          objectRef: tempBulkRef,
          storagePath: tempBulkPath,
        }),
      ])
      .select(
        "object_ref,created_at,temporary_ttl_seconds,temporary_expires_at",
      );
    if (
      tempMetadataInsert.error ||
      tempMetadataInsert.data?.length !== 2
    ) {
      fail("temporary_metadata_insert_failed");
    }
    const tempMetadata = tempMetadataInsert.data.find(
      (item) => item.object_ref === tempRef,
    );
    const tempBulkMetadata = tempMetadataInsert.data.find(
      (item) => item.object_ref === tempBulkRef,
    );
    const tempTiming = assertTemporaryAcceptanceMetadata(tempMetadata);
    const tempBulkTiming =
      assertTemporaryAcceptanceMetadata(tempBulkMetadata);
    const tempBody = Buffer.from(
      `${canaryMarker}:temporary:${crypto.randomUUID()}`,
      "utf8",
    );
    const tempBulkBody = Buffer.from(
      `${canaryMarker}:temporary-bulk:${crypto.randomUUID()}`,
      "utf8",
    );
    const [tempUpload, tempBulkUpload] = await Promise.all([
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .upload(tempPath, tempBody, {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: false,
        }),
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .upload(tempBulkPath, tempBulkBody, {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: false,
        }),
    ]);
    if (tempUpload.error || tempBulkUpload.error) {
      fail("temporary_object_upload_failed");
    }

    const [
      tempListBefore,
      tempInfoBefore,
      tempDownloadBefore,
      tempDirectBefore,
      tempHeadBefore,
    ] = await Promise.all([
        principalA.client.storage
          .from(S236P_BUCKET_ID)
          .list(`${vaultA}/temporary`, { limit: 20 }),
        principalA.client.storage.from(S236P_BUCKET_ID).info(tempPath),
        principalA.client.storage.from(S236P_BUCKET_ID).download(tempPath),
        directAuthenticatedGet({
          accessToken: principalA.accessToken,
          guardedFetch,
          path: tempPath,
          projectUrl,
          publishableKey,
        }),
        directAuthenticatedGet({
          accessToken: principalA.accessToken,
          guardedFetch,
          method: "HEAD",
          path: tempPath,
          projectUrl,
          publishableKey,
        }),
      ]);
    if (
      tempListBefore.error ||
      !(tempListBefore.data ?? []).some((item) => item.name === tempRef)
    ) {
      fail("temporary_pre_expiry_list_failed");
    }
    if (tempInfoBefore.error || !tempInfoBefore.data) {
      fail("temporary_pre_expiry_info_failed");
    }
    if (tempDownloadBefore.error || !tempDownloadBefore.data) {
      fail("temporary_pre_expiry_download_failed");
    }
    if (!tempDirectBefore.ok) {
      fail("temporary_pre_expiry_direct_get_failed");
    }
    if (!tempHeadBefore.ok) {
      fail("temporary_pre_expiry_authenticated_head_failed");
    }
    const [tempDownloadBytes, tempDirectBytes] = await Promise.all([
      tempDownloadBefore.data.arrayBuffer(),
      tempDirectBefore.arrayBuffer(),
    ]);
    if (
      !Buffer.from(tempDownloadBytes).equals(tempBody) ||
      !Buffer.from(tempDirectBytes).equals(tempBody)
    ) {
      fail("temporary_pre_expiry_download_mismatch");
    }
    record("temporary_stable_ttl_pre_expiry_reads_allowed");

    const latestTemporaryExpiry = new Date(
      Math.max(tempTiming.expiresAtMs, tempBulkTiming.expiresAtMs),
    ).toISOString();
    await waitUntilAfterServerTimestamp(
      latestTemporaryExpiry,
      "temporary_expiry",
    );
    const expired = await principalA.client.rpc(
      "s236p_expired_object_paths_v1",
      { p_as_of: tempMetadata.temporary_expires_at },
    );
    if (
      expired.error ||
      !expired.data?.some((item) => item.object_ref === tempRef)
    ) {
      fail("exact_boundary_expiry_not_detected");
    }
    await expectStorageListHidden(
      principalA.client,
      `${vaultA}/temporary`,
      "temporary_post_expiry_list_allowed",
    );
    await expectStorageInfoDenied(
      principalA.client,
      tempPath,
      "temporary_post_expiry_info_allowed",
    );
    await expectStorageError(
      principalA.client.storage.from(S236P_BUCKET_ID).download(tempPath),
      "temporary_post_expiry_download_allowed",
    );
    await expectDirectGetDenied(
      {
        accessToken: principalA.accessToken,
        guardedFetch,
        path: tempPath,
        projectUrl,
        publishableKey,
      },
      "temporary_post_expiry_direct_get_allowed",
    );
    await expectDirectHeadDenied(
      {
        accessToken: principalA.accessToken,
        guardedFetch,
        path: tempPath,
        projectUrl,
        publishableKey,
      },
      "temporary_post_expiry_authenticated_head_allowed",
    );
    record("temporary_exact_boundary_and_post_expiry_reads_denied");

    const retainedTemporaryMetadata = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .select("object_ref")
      .in("object_ref", [tempRef, tempBulkRef]);
    if (
      retainedTemporaryMetadata.error ||
      retainedTemporaryMetadata.data?.length !== 2
    ) {
      fail("temporary_metadata_not_retained_for_cleanup");
    }
    const tempDelete = await directAuthenticatedDelete({
      accessToken: principalA.accessToken,
      guardedFetch,
      path: tempPath,
      projectUrl,
      publishableKey,
    });
    if (!tempDelete.ok) fail("temporary_expired_single_delete_failed");
    const tempBulkDelete = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([tempBulkPath]);
    if (tempBulkDelete.error) {
      fail("temporary_expired_bulk_delete_failed");
    }
    const tempMetadataDelete = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .in("object_ref", [tempRef, tempBulkRef])
      .select("object_ref");
    if (
      tempMetadataDelete.error ||
      tempMetadataDelete.data?.length !== 2
    ) {
      fail("temporary_metadata_cleanup_failed");
    }
    cleanupA.paths.delete(tempPath);
    cleanupA.paths.delete(tempBulkPath);
    cleanupA.objectRefs.delete(tempRef);
    cleanupA.objectRefs.delete(tempBulkRef);
    record("expired_single_and_bulk_cleanup_with_metadata_retained");

    const deleteRequestedRef = crypto.randomUUID();
    const deleteRequestedPath =
      `${vaultA}/delete-requested/${deleteRequestedRef}`;
    cleanupA.paths.add(deleteRequestedPath);
    cleanupA.objectRefs.add(deleteRequestedRef);
    await insertObjectMetadata(
      principalA.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: deleteRequestedRef,
        storagePath: deleteRequestedPath,
      }),
    );
    const deleteRequestedUpload = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .upload(
        deleteRequestedPath,
        Buffer.from(
          `${canaryMarker}:delete-requested:${crypto.randomUUID()}`,
          "utf8",
        ),
        {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: false,
        },
      );
    if (deleteRequestedUpload.error) {
      fail("delete_requested_fixture_upload_failed");
    }
    const deleteRequestedTransition = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .update({ object_state: "delete_requested" })
      .eq("object_ref", deleteRequestedRef)
      .select("object_ref,object_state");
    if (
      deleteRequestedTransition.error ||
      deleteRequestedTransition.data?.length !== 1 ||
      deleteRequestedTransition.data[0]?.object_state !== "delete_requested"
    ) {
      fail("delete_requested_transition_failed");
    }
    await expectStorageListHidden(
      principalA.client,
      `${vaultA}/delete-requested`,
      "delete_requested_list_allowed",
    );
    await expectStorageInfoDenied(
      principalA.client,
      deleteRequestedPath,
      "delete_requested_info_allowed",
    );
    await expectStorageError(
      principalA.client.storage
        .from(S236P_BUCKET_ID)
        .download(deleteRequestedPath),
      "delete_requested_download_allowed",
    );
    await expectDirectGetDenied(
      {
        accessToken: principalA.accessToken,
        guardedFetch,
        path: deleteRequestedPath,
        projectUrl,
        publishableKey,
      },
      "delete_requested_direct_get_allowed",
    );
    await expectDirectHeadDenied(
      {
        accessToken: principalA.accessToken,
        guardedFetch,
        path: deleteRequestedPath,
        projectUrl,
        publishableKey,
      },
      "delete_requested_authenticated_head_allowed",
    );
    const deleteRequestedStorageCleanup = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([deleteRequestedPath]);
    if (deleteRequestedStorageCleanup.error) {
      fail("delete_requested_storage_cleanup_failed");
    }
    const deleteRequestedMetadataCleanup = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", deleteRequestedRef)
      .select("object_ref");
    if (
      deleteRequestedMetadataCleanup.error ||
      deleteRequestedMetadataCleanup.data?.length !== 1
    ) {
      fail("delete_requested_metadata_cleanup_failed");
    }
    cleanupA.paths.delete(deleteRequestedPath);
    cleanupA.objectRefs.delete(deleteRequestedRef);
    record("delete_requested_reads_denied_cleanup_preserved");

    const orphanRef = crypto.randomUUID();
    const orphanPath = opaquePath(vaultA, orphanRef);
    cleanupA.paths.add(orphanPath);
    cleanupA.objectRefs.add(orphanRef);
    await insertObjectMetadata(
      principalA.client,
      privateObjectRow({
        ownerId: principalA.id,
        objectRef: orphanRef,
        storagePath: orphanPath,
      }),
    );
    const orphanUpload = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .upload(
        orphanPath,
        Buffer.from(
          `${canaryMarker}:metadata-first:${crypto.randomUUID()}`,
          "utf8",
        ),
        {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: false,
        },
      );
    if (orphanUpload.error) fail("metadata_first_fixture_upload_failed");
    const metadataFirstDelete = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", orphanRef)
      .select("object_ref");
    if (
      metadataFirstDelete.error ||
      metadataFirstDelete.data?.length !== 1
    ) {
      fail("metadata_first_delete_failed");
    }
    cleanupA.objectRefs.delete(orphanRef);
    const orphanStorageDelete = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([orphanPath]);
    if (orphanStorageDelete.error) {
      fail("orphan_safe_storage_delete_failed");
    }
    cleanupA.paths.delete(orphanPath);
    await expectStorageInfoDenied(
      principalA.client,
      orphanPath,
      "orphan_storage_remaining",
    );
    record("metadata_first_recovery_orphan_safe_delete_verified");

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
    const uploadB = await principalB.client.storage
      .from(S236P_BUCKET_ID)
      .upload(
        pathB,
        Buffer.from(
          `${canaryMarker}:owner-b:${crypto.randomUUID()}`,
          "utf8",
        ),
        {
          contentType: "application/octet-stream",
          cacheControl: "0",
          upsert: false,
        },
      );
    if (uploadB.error) fail("owner_b_setup_upload_failed");
    await expectStorageInfoDenied(
      principalA.client,
      pathB,
      "owner_a_info_owner_b_allowed",
    );
    await expectStorageError(
      principalA.client.storage.from(S236P_BUCKET_ID).download(pathB),
      "owner_a_download_owner_b_allowed",
    );
    await expectStorageListHidden(
      principalA.client,
      vaultB,
      "owner_a_list_owner_b_allowed",
    );
    await expectNoRows(
      principalA.client
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", objectBRef),
      "owner_a_metadata_read_owner_b_allowed",
    );
    await expectNoRows(
      principalB.client
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", objectARef),
      "owner_b_metadata_read_owner_a_allowed",
    );
    record("bidirectional_owner_isolation_verified");

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
    await expectStorageDeleteDenied(
      principalB.client.storage.from(S236P_BUCKET_ID).remove([pathA]),
      pathA,
      "account_b_delete_owner_a_allowed",
    );
    await expectStorageDeleteDenied(
      anonymous.storage.from(S236P_BUCKET_ID).remove([pathA]),
      pathA,
      "anonymous_delete_owner_a_allowed",
    );
    await expectNoRowsOrDenied(
      anonymous
        .from(S236P_OBJECTS_TABLE)
        .select("object_ref")
        .eq("object_ref", objectARef),
      "anonymous_metadata_select_allowed",
    );
    record("cross_owner_and_anonymous_mutations_denied");

    const deleteRevision = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([revisionPath]);
    if (deleteRevision.error) fail("owner_a_revision_storage_delete_failed");
    const deleteRevisionMetadata = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", revisionRef)
      .select("object_ref");
    if (
      deleteRevisionMetadata.error ||
      deleteRevisionMetadata.data?.length !== 1
    ) {
      fail("owner_a_revision_metadata_delete_failed");
    }
    cleanupA.paths.delete(revisionPath);
    cleanupA.objectRefs.delete(revisionRef);

    const deleteA = await principalA.client.storage
      .from(S236P_BUCKET_ID)
      .remove([pathA]);
    if (deleteA.error) fail("owner_a_delete_failed");
    const deleteMetadataA = await principalA.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", objectARef)
      .select("object_ref");
    if (deleteMetadataA.error || deleteMetadataA.data?.length !== 1) {
      fail("owner_a_metadata_delete_failed");
    }
    cleanupA.paths.delete(pathA);
    cleanupA.objectRefs.delete(objectARef);
    cleanupA.paths.delete(movePath);
    cleanupA.paths.delete(copyPath);

    const deleteB = await principalB.client.storage
      .from(S236P_BUCKET_ID)
      .remove([pathB]);
    if (deleteB.error) fail("owner_b_cleanup_storage_failed");
    const deleteMetadataB = await principalB.client
      .from(S236P_OBJECTS_TABLE)
      .delete()
      .eq("object_ref", objectBRef)
      .select("object_ref");
    if (deleteMetadataB.error || deleteMetadataB.data?.length !== 1) {
      fail("owner_b_cleanup_metadata_failed");
    }
    cleanupB.paths.delete(pathB);
    cleanupB.objectRefs.delete(objectBRef);
    record("owner_scoped_cleanup_complete");

    if (counters.externalOcrAiProviderCalls !== 0) {
      fail("external_ocr_ai_provider_call_observed");
    }
    record("ocr_ai_provider_mode_none");
    record("external_ocr_ai_provider_calls_zero");
    record("real_content_and_raw_emission_counters_zero");

    return {
      status: "passed",
      assertions,
      bulkSignedUrlChecks,
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
        kind: "s236p_operator_result_v2",
        status: result.status,
        assertionCount: result.assertions.length,
        assertions: result.assertions,
        providerMode: S236P_PROVIDER_MODE,
        eventLogMode: S236P_EVENT_LOG_MODE,
        externalOcrAiProviderCalls:
          result.counters.externalOcrAiProviderCalls,
        bulkSignedUrlChecks: result.bulkSignedUrlChecks,
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
        kind: "s236p_operator_result_v2",
        status: "failed",
        failureCode: code,
        failureDetails:
          error instanceof AcceptanceError ? error.details : undefined,
        temporaryPrincipalIdsForCleanup: tempPrincipalIds,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
