#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SMOKE_FLAG = "PERSONAL_CONCEPT_GRAPH_RLS_SMOKE";
const REPOSITORY_FLAG = "PERSONAL_CONCEPT_GRAPH_REPOSITORY";
const REQUIRED_SUPABASE_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const TEST_AUTH_ENV = [
  "PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ID",
  "PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ACCESS_TOKEN",
  "PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ID",
  "PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ACCESS_TOKEN",
];
const RPC_NAME = "transition_personal_concept_node_v1";
const SUBJECT_ID = "rls-smoke-subject";
const TRANSITION_EVENT_COLUMNS = "id,status,metadata_only";

const results = [];

function report(status, details = {}) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([key]) => !/key|token|secret|password|jwt|row|payload|endpoint/i.test(key)),
  );
  const entry = { status, ...safeDetails };
  results.push(entry);
  console.log(JSON.stringify(entry));
}

function fail(status, details = {}) {
  report(status, details);
  process.exitCode = 1;
}

function requireSmokeGate() {
  if (process.env[SMOKE_FLAG] !== "1") {
    fail("refused_missing_personal_concept_graph_rls_smoke_flag", {
      requiredFlag: `${SMOKE_FLAG}=1`,
      reason: "Runtime RLS smoke checks must be explicitly requested.",
    });
    process.exit();
  }
}

function requireRepositoryGate() {
  if (process.env[REPOSITORY_FLAG] !== "supabase") {
    fail("refused_missing_supabase_repository_mode", {
      requiredFlag: `${REPOSITORY_FLAG}=supabase`,
      reason: "Runtime RLS smoke checks must run against the Supabase repository boundary.",
    });
    process.exit();
  }
}

function requireNonProductionOrExplicitOverride() {
  const productionLike = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (productionLike && process.env.PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE !== "1") {
    fail("refused_production_runtime_rls_without_explicit_smoke_override", {
      requiredFlag: "PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE=1",
      reason: "Production-like environments need an additional explicit override for test-only RLS smoke data.",
    });
    process.exit();
  }
}

function runContractProbe() {
  const probe = String.raw`
    import assert from "node:assert/strict";
    import { getPersonalConceptGraphRepositoryMode, getPersonalConceptGraphRepositoryAdapter } from "./lib/review-os/personal-concept-graph-repository-adapter.ts";
    import { buildPersonalConceptNodeSupabasePayload, PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS } from "./lib/review-os/personal-concept-graph-supabase-repository.ts";

    const baseNode = {
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "unit-1",
      state: "wrong",
      confidence: "low",
      lastResult: "wrong",
      lastTaskType: "retrieval",
      wrongCount: 1,
      recoveryCount: 0,
      stableCount: 0,
      nextRecommendedTaskType: "retry",
      nextDueAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-05T00:00:00.000Z",
      metadataOnly: true,
    };

    const memoryAdapter = getPersonalConceptGraphRepositoryAdapter({});
    const supabaseAdapter = getPersonalConceptGraphRepositoryAdapter({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" });

    assert.equal(getPersonalConceptGraphRepositoryMode({}), "memory");
    assert.equal(memoryAdapter.mode, "memory");
    assert.equal(typeof memoryAdapter.upsertPersonalConceptNode, "function");
    assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }), "supabase");
    assert.equal(supabaseAdapter.mode, "supabase");
    assert.equal("upsertPersonalConceptNode" in supabaseAdapter, false);
    assert.equal(typeof supabaseAdapter.transitionPersonalConceptNode, "function");
    assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "SUPABASE" }), "memory");

    const payload = buildPersonalConceptNodeSupabasePayload({ ...baseNode, unknownColumn: "ignored" });
    assert.deepEqual(Object.keys(payload), [...PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS]);
    assert.equal(payload.metadata_only, true);
    assert.equal(Object.hasOwn(payload, "unknownColumn"), false);
    assert.throws(() => buildPersonalConceptNodeSupabasePayload({ ...baseNode, examMode: "cpa" }), /supports only|1/);
    assert.throws(() => buildPersonalConceptNodeSupabasePayload({ ...baseNode, rawAnswerText: "forbidden" }), /Forbidden raw\/copyrighted learner text field/);
  `;

  const child = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "--input-type=module",
    "-e",
    probe,
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      [REPOSITORY_FLAG]: process.env[REPOSITORY_FLAG] ?? "memory",
    },
    encoding: "utf8",
  });

  if (child.status !== 0) {
    fail("failed_static_repository_contract_probe", {
      stderr: redact(child.stderr),
      stdout: redact(child.stdout),
    });
    process.exit();
  }

  report("passed_static_repository_contract_probe", {
    verified: [
      "default_memory_adapter",
      "explicit_supabase_mode_only",
      "supabase_adapter_rpc_only_write_method",
      "metadata_only_payload",
      "unsupported_exam_rejection",
      "forbidden_raw_field_rejection",
      "unknown_column_stripping",
    ].join(","),
  });
}

function redact(value) {
  if (!value) return "";
  let redacted = value;
  for (const envName of [...REQUIRED_SUPABASE_ENV, ...TEST_AUTH_ENV, "SUPABASE_SERVICE_ROLE_KEY"]) {
    const secret = process.env[envName];
    if (secret) redacted = redacted.split(secret).join(`[redacted:${envName}]`);
  }
  return redacted;
}

function missing(names) {
  return names.filter((name) => !process.env[name]);
}

function requireRuntimeEnv() {
  const missingEnv = missing([...REQUIRED_SUPABASE_ENV, ...TEST_AUTH_ENV]);
  if (missingEnv.length > 0) {
    fail("failed_runtime_rls_missing_required_env", {
      missingEnvNames: missingEnv.join(","),
      reason: "Supabase URL, anon key, and two authenticated test-user access tokens are required for real RLS verification.",
    });
    process.exit();
  }
}

function clientFor(accessToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rowFor({ id, userId, unitId = "rls-smoke-direct-denied", state = "wrong", examMode = "first", metadataOnly = true }) {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    exam_mode: examMode,
    subject_id: SUBJECT_ID,
    unit_id: unitId,
    state,
    confidence: "low",
    last_result: "wrong",
    last_task_type: "retrieval",
    wrong_count: 1,
    recovery_count: 0,
    stable_count: 0,
    next_recommended_task_type: "retry",
    next_due_at: now,
    updated_at: now,
    metadata_only: metadataOnly,
    version: 1,
    source_status: "runtime_rls_smoke_no_direct_write",
  };
}

function rpcParams({ eventId, unitId, occurredAt, result = "wrong" }) {
  return {
    p_event_id: eventId,
    p_exam_mode: "first",
    p_subject_id: SUBJECT_ID,
    p_unit_id: unitId,
    p_task_type: "O/X",
    p_result: result,
    p_confidence: result === "done" ? "medium" : "low",
    p_due_bucket: result === "done" ? "none" : "tomorrow",
    p_recent_miss_count: 0,
    p_occurred_at: occurredAt,
  };
}

function isPermissionDeniedError(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  return code === "42501" || message.includes("permission denied") || message.includes("insufficient privilege");
}

async function callTransition(client, params) {
  const { data, error } = await client.rpc(RPC_NAME, params);
  if (error) throw new Error(`rpc_transition_failed:${error.code ?? "unknown"}`);
  const entry = Array.isArray(data) ? data[0] : data;
  return typeof entry?.status === "string" ? entry.status : "missing_status";
}

async function expectStatus(label, status, expected) {
  if (status !== expected) throw new Error(`${label}:expected_${expected}_got_${status}`);
}

async function expectPermissionDenied(label, queryPromise) {
  const { error } = await queryPromise;
  if (!error) throw new Error(`${label}:expected_permission_denied`);
  if (!isPermissionDeniedError(error)) throw new Error(`${label}:unexpected_error_${error.code ?? "unknown"}`);
}

async function expectNoRows(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) throw new Error(`${label}:${error.code ?? "unknown"}`);
  if ((data ?? []).length !== 0) throw new Error(`${label}:expected_no_rows`);
}

async function expectAnonCannotReadRows(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) {
    if (isPermissionDeniedError(error)) return;
    throw new Error(`${label}:${error.code ?? "unknown"}`);
  }
  if ((data ?? []).length !== 0) throw new Error(`${label}:expected_no_rows_or_permission_denied`);
}

async function expectOwnNodeRead(client, unitId) {
  const { data, error } = await client
    .from("personal_concept_nodes")
    .select("id,metadata_only")
    .eq("exam_mode", "first")
    .eq("subject_id", SUBJECT_ID)
    .eq("unit_id", unitId);
  if (error) throw new Error(`own_node_read_failed:${error.code ?? "unknown"}`);
  if ((data ?? []).length !== 1) throw new Error("own_node_read_unexpected_count");
  if (data[0]?.metadata_only !== true) throw new Error("own_node_read_not_metadata_only");
}

async function cleanupUnits(client, unitIds) {
  if (unitIds.length === 0) return "complete";
  const { error } = await client
    .from("personal_concept_nodes")
    .delete()
    .eq("exam_mode", "first")
    .eq("subject_id", SUBJECT_ID)
    .in("unit_id", unitIds);
  return error ? `incomplete_${error.code ?? "unknown"}` : "complete";
}

async function runRuntimeRlsChecks() {
  const userAId = process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ID;
  const userBId = process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ID;
  if (userAId === userBId) throw new Error("test_auth_user_ids_must_be_distinct");

  const userA = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ACCESS_TOKEN);
  const userB = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ACCESS_TOKEN);
  const anon = anonClient();
  const directInsertId = randomUUID();
  const unitA = `rls-smoke-a-${randomUUID()}`;
  const unitADelete = `rls-smoke-delete-${randomUUID()}`;
  const unitB = `rls-smoke-b-${randomUUID()}`;
  const t0 = "2026-06-23T00:00:00.000Z";
  const cleanupAUnits = [unitA, unitADelete];
  const cleanupBUnits = [unitB];
  let cleanupStatus = "not_attempted";

  try {
    await expectPermissionDenied(
      "direct_authenticated_insert_denied",
      userA.from("personal_concept_nodes").insert(rowFor({ id: directInsertId, userId: userAId })).select("id"),
    );

    await expectStatus(
      "rpc_transition_applied",
      await callTransition(userA, rpcParams({ eventId: `${unitA}-first`, occurredAt: t0, unitId: unitA })),
      "applied",
    );
    await expectStatus(
      "identical_rpc_retry_already_applied",
      await callTransition(userA, rpcParams({ eventId: `${unitA}-first`, occurredAt: t0, unitId: unitA })),
      "already_applied",
    );
    await expectStatus(
      "user_b_rpc_transition_applied",
      await callTransition(userB, rpcParams({ eventId: `${unitB}-first`, occurredAt: t0, unitId: unitB })),
      "applied",
    );

    await expectPermissionDenied(
      "direct_authenticated_update_denied",
      userA
        .from("personal_concept_nodes")
        .update({ state: "recovering", updated_at: new Date().toISOString() })
        .eq("exam_mode", "first")
        .eq("subject_id", SUBJECT_ID)
        .eq("unit_id", unitA)
        .select("id"),
    );

    await expectOwnNodeRead(userA, unitA);

    await expectNoRows(
      "user_a_cannot_read_user_b_node",
      userA.from("personal_concept_nodes").select("id").eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", unitB),
    );
    await expectNoRows(
      "user_a_cannot_read_user_b_transition_event",
      userA
        .from("personal_concept_transition_events")
        .select(TRANSITION_EVENT_COLUMNS)
        .eq("exam_mode", "first")
        .eq("subject_id", SUBJECT_ID)
        .eq("unit_id", unitB),
    );
    await expectAnonCannotReadRows(
      "anon_cannot_read_nodes",
      anon.from("personal_concept_nodes").select("id").eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).in("unit_id", [unitA, unitB]),
    );
    await expectAnonCannotReadRows(
      "anon_cannot_read_transition_events",
      anon
        .from("personal_concept_transition_events")
        .select(TRANSITION_EVENT_COLUMNS)
        .eq("exam_mode", "first")
        .eq("subject_id", SUBJECT_ID)
        .in("unit_id", [unitA, unitB]),
    );

    await expectStatus(
      "user_owned_delete_seed_applied",
      await callTransition(userA, rpcParams({ eventId: `${unitADelete}-first`, occurredAt: t0, unitId: unitADelete })),
      "applied",
    );
    const deleteA = await userA
      .from("personal_concept_nodes")
      .delete()
      .eq("exam_mode", "first")
      .eq("subject_id", SUBJECT_ID)
      .eq("unit_id", unitADelete);
    if (deleteA.error) throw new Error(`own_delete_failed:${deleteA.error.code ?? "unknown"}`);
    await expectNoRows(
      "user_owned_delete_removed_node",
      userA.from("personal_concept_nodes").select("id").eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", unitADelete),
    );
  } finally {
    const cleanupA = await cleanupUnits(userA, cleanupAUnits);
    const cleanupB = await cleanupUnits(userB, cleanupBUnits);
    cleanupStatus = cleanupA === "complete" && cleanupB === "complete" ? "complete" : `user_a_${cleanupA}_user_b_${cleanupB}`;
  }

  if (cleanupStatus !== "complete") {
    throw new Error(`cleanup_${cleanupStatus}`);
  }

  report("passed_runtime_rls_smoke", {
    verified: [
      "direct_authenticated_insert_denied",
      "direct_authenticated_update_denied",
      "rpc_transition_applied",
      "identical_rpc_retry_already_applied",
      "own_select_allowed",
      "own_delete_allowed",
      "cross_user_node_read_denied",
      "cross_user_transition_event_read_denied",
      "anonymous_node_read_denied",
      "anonymous_transition_event_read_denied",
      "transition_event_audit_rows_retained_by_design",
    ].join(","),
    cleanup: cleanupStatus,
  });
}

async function main() {
  requireSmokeGate();
  requireRepositoryGate();
  requireNonProductionOrExplicitOverride();
  runContractProbe();
  requireRuntimeEnv();

  try {
    await runRuntimeRlsChecks();
  } catch (error) {
    fail("failed_runtime_rls_smoke", {
      message: redact(error instanceof Error ? error.message : String(error)),
    });
  }
}

main();
