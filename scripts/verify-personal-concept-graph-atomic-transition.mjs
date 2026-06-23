#!/usr/bin/env node
import process from "node:process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SMOKE_FLAG = "PERSONAL_CONCEPT_GRAPH_ATOMIC_TRANSITION_SMOKE";
const REQUIRED_PUBLIC_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const TEST_AUTH_ENV = [
  "PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_A_ID",
  "PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_A_ACCESS_TOKEN",
  "PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_B_ID",
  "PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_B_ACCESS_TOKEN",
];
const RPC_NAME = "transition_personal_concept_node_v1";
const SUBJECT_ID = "atomic-smoke-subject";
const NODE_COLUMNS = "id,updated_at,last_result,wrong_count,recovery_count,stable_count,metadata_only";
const TRANSITION_EVENT_COLUMNS = "id,status,metadata_only";
const PERMISSION_DENIED_CODES = new Set(["42501", "PGRST301"]);

function safeEntry(status, details = {}) {
  return Object.fromEntries(
    Object.entries({ status, ...details }).filter(([key]) => !/token|secret|password|key|jwt|row|payload|endpoint/i.test(key)),
  );
}

function report(status, details = {}) {
  console.log(JSON.stringify(safeEntry(status, details)));
}

function fail(status, details = {}) {
  report(status, details);
  process.exitCode = 1;
}

function missing(names) {
  return names.filter((name) => !process.env[name]);
}

function requireGate() {
  if (process.env[SMOKE_FLAG] !== "1") {
    fail("refused_missing_personal_concept_graph_atomic_transition_smoke_flag", {
      requiredFlag: `${SMOKE_FLAG}=1`,
      reason: "Atomic transition runtime smoke must be explicitly requested.",
    });
    process.exit();
  }
}

function requireNonProductionOrOverride() {
  const productionLike = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (productionLike && process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_ALLOW_PRODUCTION_SMOKE !== "1") {
    fail("refused_production_atomic_transition_smoke_without_override", {
      requiredFlag: "PERSONAL_CONCEPT_GRAPH_ATOMIC_ALLOW_PRODUCTION_SMOKE=1",
    });
    process.exit();
  }
}

function failIfMissingRuntimeEnv() {
  const missingPublic = missing(REQUIRED_PUBLIC_ENV);
  if (missingPublic.length > 0) {
    fail("failed_atomic_transition_runtime_missing_public_env", {
      missingEnvNames: missingPublic.join(","),
      outcome: "nonzero",
    });
    process.exit();
  }
  const missingAuth = missing(TEST_AUTH_ENV);
  if (missingAuth.length > 0) {
    fail("failed_atomic_transition_runtime_missing_test_auth", {
      missingEnvNames: missingAuth.join(","),
      outcome: "nonzero",
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

function anonymousClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rpcParams({ eventId, occurredAt, result = "wrong", unitId, taskType = "O/X" }) {
  return {
    p_event_id: eventId,
    p_exam_mode: "first",
    p_subject_id: SUBJECT_ID,
    p_unit_id: unitId,
    p_task_type: taskType,
    p_result: result,
    p_confidence: result === "done" ? "medium" : "low",
    p_due_bucket: result === "done" ? "none" : "tomorrow",
    p_recent_miss_count: 0,
    p_occurred_at: occurredAt,
  };
}

async function callTransition(client, params) {
  const { data, error } = await client.rpc(RPC_NAME, params);
  if (error) throw new Error(`atomic_transition_rpc_failed:${error.code ?? "unknown"}`);
  const entry = Array.isArray(data) ? data[0] : data;
  return {
    status: typeof entry?.status === "string" ? entry.status : "missing_status",
    reason: typeof entry?.reason === "string" ? entry.reason : null,
  };
}

async function assertPrerequisite(client) {
  const { error } = await client.from("personal_concept_nodes").select("id").limit(1);
  if (error?.code === "42P01") {
    fail("missing_prerequisite_personal_concept_nodes", {
      reason: "Apply the 20260605 prerequisite migration through an approved workflow before this smoke.",
    });
    process.exit();
  }
  if (error && error.code !== "42501") {
    throw new Error(`prerequisite_probe_failed:${error.code ?? "unknown"}`);
  }
}

function expectStatus(label, result, expected) {
  if (result.status !== expected) throw new Error(`${label}:expected_${expected}_got_${result.status}`);
}

function expectReason(label, result, expected) {
  if (result.reason !== expected) throw new Error(`${label}:expected_${expected}_got_${result.reason ?? "none"}`);
}

async function fetchNodes(client, unitId) {
  const { data, error } = await client
    .from("personal_concept_nodes")
    .select(NODE_COLUMNS)
    .eq("exam_mode", "first")
    .eq("subject_id", SUBJECT_ID)
    .eq("unit_id", unitId);
  if (error) throw new Error(`node_probe_failed:${error.code ?? "unknown"}`);
  return data ?? [];
}

async function fetchTransitionEvents(client, unitId) {
  const { data, error } = await client
    .from("personal_concept_transition_events")
    .select(TRANSITION_EVENT_COLUMNS)
    .eq("exam_mode", "first")
    .eq("subject_id", SUBJECT_ID)
    .eq("unit_id", unitId);
  if (error) throw new Error(`transition_event_probe_failed:${error.code ?? "unknown"}`);
  return data ?? [];
}

async function expectSingleNode(client, unitId, label) {
  const nodes = await fetchNodes(client, unitId);
  if (nodes.length !== 1) throw new Error(`${label}:expected_one_node_got_${nodes.length}`);
  if (nodes[0].metadata_only !== true) throw new Error(`${label}:metadata_only_not_true`);
  return nodes[0];
}

async function assertFinalConcurrentNode(client, unitId, expectedUpdatedAt, olderStatus) {
  const node = await expectSingleNode(client, unitId, "concurrent_final_db_row");
  if (node.updated_at !== expectedUpdatedAt) throw new Error("concurrent_final_db_row_not_newer_updated_at");
  if (node.last_result !== "done") throw new Error("concurrent_final_db_row_not_newer_last_result");
  if (node.recovery_count !== 1) throw new Error("concurrent_final_recovery_count_unexpected");
  if (node.stable_count !== 0) throw new Error("concurrent_final_stable_count_unexpected");
  const expectedWrongCount = olderStatus === "applied" ? 1 : 0;
  if (node.wrong_count !== expectedWrongCount) throw new Error("concurrent_final_wrong_count_unexpected");
}

async function expectNoRows(label, responsePromise, allowPermissionError = false) {
  const { data, error } = await responsePromise;
  if (error) {
    if (allowPermissionError && PERMISSION_DENIED_CODES.has(error.code)) return;
    throw new Error(`${label}:probe_failed_${error.code ?? "unknown"}`);
  }
  if ((data ?? []).length !== 0) throw new Error(`${label}:read_not_denied`);
}

async function cleanup(client, unitIds) {
  let failures = 0;
  for (const unitId of unitIds) {
    const { error } = await client
      .from("personal_concept_nodes")
      .delete()
      .eq("exam_mode", "first")
      .eq("subject_id", SUBJECT_ID)
      .eq("unit_id", unitId);
    if (error) failures += 1;
  }
  return failures === 0 ? "complete" : `incomplete_${failures}`;
}

async function main() {
  requireGate();
  requireNonProductionOrOverride();
  failIfMissingRuntimeEnv();

  const userAId = process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_A_ID;
  const userBId = process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_B_ID;
  if (userAId === userBId) throw new Error("atomic_transition_test_users_must_be_distinct");

  const userA = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_A_ACCESS_TOKEN);
  const userB = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_B_ACCESS_TOKEN);
  const anon = anonymousClient();
  const unitId = `atomic-smoke-${randomUUID()}`;
  const concurrentUnit = `atomic-smoke-concurrent-${randomUUID()}`;
  const isolatedUnitId = `atomic-smoke-b-${randomUUID()}`;
  const equalTimestampUnit = `atomic-smoke-same-ts-${randomUUID()}`;
  const replayUnit = `atomic-smoke-replay-${randomUUID()}`;
  const userAUnits = [unitId, concurrentUnit, equalTimestampUnit, replayUnit];
  const userBUnits = [isolatedUnitId];
  const t0 = "2026-06-23T00:00:00.000Z";
  const t1 = "2026-06-23T00:10:00.000Z";
  const t2 = "2026-06-23T00:20:00.000Z";
  let failure = null;

  try {
    await assertPrerequisite(userA);

    const first = await callTransition(userA, rpcParams({ eventId: `${unitId}-first`, occurredAt: t0, unitId }));
    expectStatus("applied", first, "applied");

    const retry = await callTransition(userA, rpcParams({ eventId: `${unitId}-first`, occurredAt: t0, unitId }));
    expectStatus("already_applied", retry, "already_applied");

    const newer = await callTransition(userA, rpcParams({ eventId: `${unitId}-new`, occurredAt: t2, result: "done", unitId }));
    expectStatus("applied_newer", newer, "applied");

    const stale = await callTransition(userA, rpcParams({ eventId: `${unitId}-old-unique`, occurredAt: t1, unitId }));
    expectStatus("stale_signal", stale, "stale_signal");

    const duplicateOld = await callTransition(userA, rpcParams({ eventId: `${unitId}-first`, occurredAt: t0, unitId }));
    expectStatus("duplicate_old_already_applied", duplicateOld, "already_applied");

    const sameTimestampFirst = await callTransition(userA, rpcParams({ eventId: `${equalTimestampUnit}-first`, occurredAt: t0, unitId: equalTimestampUnit }));
    expectStatus("same_timestamp_first", sameTimestampFirst, "applied");

    const sameTimestampOther = await callTransition(userA, rpcParams({ eventId: `${equalTimestampUnit}-other`, occurredAt: t0, result: "done", unitId: equalTimestampUnit }));
    expectStatus("same_timestamp_different_event", sameTimestampOther, "rejected");
    expectReason("same_timestamp_different_event", sameTimestampOther, "same_timestamp_different_event");

    const replayFirst = await callTransition(userA, rpcParams({ eventId: `${replayUnit}-event`, occurredAt: t0, unitId: replayUnit }));
    expectStatus("replay_first", replayFirst, "applied");

    const replayMismatch = await callTransition(userA, rpcParams({ eventId: `${replayUnit}-event`, occurredAt: t0, result: "done", unitId: replayUnit }));
    expectStatus("event_id_payload_mismatch", replayMismatch, "rejected");
    expectReason("event_id_payload_mismatch", replayMismatch, "event_id_payload_mismatch");

    const concurrent = await Promise.all([
      callTransition(userA, rpcParams({ eventId: `${concurrentUnit}-older`, occurredAt: t0, unitId: concurrentUnit })),
      callTransition(userA, rpcParams({ eventId: `${concurrentUnit}-newer`, occurredAt: t2, result: "done", unitId: concurrentUnit })),
    ]);
    const [olderResult, newerResult] = concurrent;
    if (!["applied", "stale_signal"].includes(olderResult.status)) throw new Error(`concurrent_older_unexpected_${olderResult.status}`);
    expectStatus("concurrent_newer", newerResult, "applied");
    await assertFinalConcurrentNode(userA, concurrentUnit, t2, olderResult.status);

    const userBWrite = await callTransition(userB, rpcParams({ eventId: `${isolatedUnitId}-b`, occurredAt: t0, unitId: isolatedUnitId }));
    expectStatus("user_b_isolated", userBWrite, "applied");

    const ownEvents = await fetchTransitionEvents(userA, unitId);
    const ownEventStatuses = ownEvents.map((entry) => entry.status).sort().join(",");
    if (!ownEventStatuses.includes("applied") || !ownEventStatuses.includes("stale_signal")) {
      throw new Error("transition_event_status_evidence_missing");
    }
    const rejectedEvents = await fetchTransitionEvents(userA, equalTimestampUnit);
    if (!rejectedEvents.some((entry) => entry.status === "rejected")) {
      throw new Error("transition_event_rejected_status_evidence_missing");
    }

    await expectNoRows(
      "cross_user_node_read_denied",
      userB.from("personal_concept_nodes").select("id").eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", unitId),
    );
    await expectNoRows(
      "cross_user_transition_event_read_denied",
      userB.from("personal_concept_transition_events").select(TRANSITION_EVENT_COLUMNS).eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", unitId),
    );
    await expectNoRows(
      "reverse_cross_user_node_read_denied",
      userA.from("personal_concept_nodes").select("id").eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", isolatedUnitId),
    );
    await expectNoRows(
      "reverse_cross_user_transition_event_read_denied",
      userA.from("personal_concept_transition_events").select(TRANSITION_EVENT_COLUMNS).eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", isolatedUnitId),
    );
    await expectNoRows(
      "anonymous_node_read_denied",
      anon.from("personal_concept_nodes").select("id").eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", unitId),
      true,
    );
    await expectNoRows(
      "anonymous_transition_event_read_denied",
      anon.from("personal_concept_transition_events").select(TRANSITION_EVENT_COLUMNS).eq("exam_mode", "first").eq("subject_id", SUBJECT_ID).eq("unit_id", unitId),
      true,
    );
  } catch (error) {
    failure = error;
  }

  const cleanupA = await cleanup(userA, userAUnits);
  const cleanupB = await cleanup(userB, userBUnits);
  const cleanupStatus = cleanupA === "complete" && cleanupB === "complete" ? "complete" : `user_a_${cleanupA}_user_b_${cleanupB}`;

  if (failure) {
    fail("failed_atomic_transition_runtime_smoke", {
      classification: failure instanceof Error ? failure.message : "unknown_runtime_failure",
      cleanup: cleanupStatus,
      transitionEvents: "transition_event_audit_rows_retained_by_design",
    });
    return;
  }

  if (cleanupStatus !== "complete") {
    fail("failed_atomic_transition_runtime_cleanup", {
      cleanup: cleanupStatus,
      transitionEvents: "transition_event_audit_rows_retained_by_design",
    });
    return;
  }

  report("passed_atomic_transition_runtime_smoke", {
    verified: "applied,already_applied,stale_signal,same_timestamp_different_event,event_id_payload_mismatch,concurrent_final_db_row_newer,transition_events_rls,cross_user_rls,anonymous_read_denied",
    cleanup: cleanupStatus,
    transitionEvents: "transition_event_audit_rows_retained_by_design",
  });
}

main();
