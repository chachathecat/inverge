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

function skipIfMissingRuntimeEnv() {
  const missingPublic = missing(REQUIRED_PUBLIC_ENV);
  if (missingPublic.length > 0) {
    report("skipped_atomic_transition_runtime_due_missing_env", {
      missingEnv: missingPublic.join(","),
      documentedSkip: true,
    });
    process.exit(0);
  }
  const missingAuth = missing(TEST_AUTH_ENV);
  if (missingAuth.length > 0) {
    report("skipped_atomic_transition_runtime_due_missing_test_auth", {
      missingEnv: missingAuth.join(","),
      documentedSkip: true,
    });
    process.exit(0);
  }
}

function clientFor(accessToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function rpcParams({ eventId, occurredAt, result = "wrong", unitId }) {
  return {
    p_event_id: eventId,
    p_exam_mode: "first",
    p_subject_id: "atomic-smoke-subject",
    p_unit_id: unitId,
    p_task_type: "O/X",
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
  const row = Array.isArray(data) ? data[0] : data;
  return typeof row?.status === "string" ? row.status : "missing_status";
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

async function expectStatus(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label}:expected_${expected}_got_${actual}`);
}

async function cleanup(client, unitIds) {
  for (const unitId of unitIds) {
    await client
      .from("personal_concept_nodes")
      .delete()
      .eq("exam_mode", "first")
      .eq("subject_id", "atomic-smoke-subject")
      .eq("unit_id", unitId);
  }
}

async function main() {
  requireGate();
  requireNonProductionOrOverride();
  skipIfMissingRuntimeEnv();

  const userAId = process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_A_ID;
  const userBId = process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_B_ID;
  if (userAId === userBId) throw new Error("atomic_transition_test_users_must_be_distinct");

  const userA = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_A_ACCESS_TOKEN);
  const userB = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_ATOMIC_USER_B_ACCESS_TOKEN);
  const unitId = `atomic-smoke-${randomUUID()}`;
  const isolatedUnitId = `atomic-smoke-b-${randomUUID()}`;
  const t0 = "2026-06-23T00:00:00.000Z";
  const t1 = "2026-06-23T00:10:00.000Z";
  const t2 = "2026-06-23T00:20:00.000Z";

  try {
    await assertPrerequisite(userA);

    await expectStatus("applied", await callTransition(userA, rpcParams({ eventId: `${unitId}-first`, occurredAt: t0, unitId })), "applied");
    await expectStatus("already_applied", await callTransition(userA, rpcParams({ eventId: `${unitId}-first`, occurredAt: t0, unitId })), "already_applied");
    await expectStatus("applied_newer", await callTransition(userA, rpcParams({ eventId: `${unitId}-new`, occurredAt: t2, result: "done", unitId })), "applied");
    await expectStatus("stale_signal", await callTransition(userA, rpcParams({ eventId: `${unitId}-old-unique`, occurredAt: t1, unitId })), "stale_signal");

    const concurrentUnit = `atomic-smoke-concurrent-${randomUUID()}`;
    const concurrent = await Promise.all([
      callTransition(userA, rpcParams({ eventId: `${concurrentUnit}-older`, occurredAt: t0, unitId: concurrentUnit })),
      callTransition(userA, rpcParams({ eventId: `${concurrentUnit}-newer`, occurredAt: t2, result: "done", unitId: concurrentUnit })),
    ]);
    if (!concurrent.includes("applied")) throw new Error("concurrent_transition_missing_applied_status");

    await expectStatus("user_b_isolated", await callTransition(userB, rpcParams({ eventId: `${isolatedUnitId}-b`, occurredAt: t0, unitId: isolatedUnitId })), "applied");
    const crossRead = await userB
      .from("personal_concept_nodes")
      .select("id")
      .eq("exam_mode", "first")
      .eq("subject_id", "atomic-smoke-subject")
      .eq("unit_id", unitId);
    if (crossRead.error) throw new Error(`cross_user_probe_failed:${crossRead.error.code ?? "unknown"}`);
    if ((crossRead.data ?? []).length !== 0) throw new Error("cross_user_read_not_denied");

    report("passed_atomic_transition_runtime_smoke", {
      verified: "applied,already_applied,stale_signal,concurrent_newer_wins,cross_user_rls,cleanup_attempted",
    });

    await cleanup(userA, [unitId, concurrentUnit]);
    await cleanup(userB, [isolatedUnitId]);
  } catch (error) {
    fail("failed_atomic_transition_runtime_smoke", {
      message: error instanceof Error ? error.message : String(error),
    });
    await cleanup(userA, [unitId]);
    await cleanup(userB, [isolatedUnitId]);
  }
}

main();
