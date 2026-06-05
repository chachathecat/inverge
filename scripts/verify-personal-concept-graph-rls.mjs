#!/usr/bin/env node
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

const results = [];

function report(status, details = {}) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([key]) => !/key|token|secret|password|jwt/i.test(key)),
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

    assert.equal(getPersonalConceptGraphRepositoryMode({}), "memory");
    assert.equal(getPersonalConceptGraphRepositoryAdapter({}).mode, "memory");
    assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }), "supabase");
    assert.equal(getPersonalConceptGraphRepositoryAdapter({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }).mode, "supabase");
    assert.equal(getPersonalConceptGraphRepositoryMode({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "SUPABASE" }), "memory");

    const payload = buildPersonalConceptNodeSupabasePayload({ ...baseNode, unknownColumn: "ignored" });
    assert.deepEqual(Object.keys(payload), [...PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS]);
    assert.equal(payload.metadata_only, true);
    assert.equal(Object.hasOwn(payload, "unknownColumn"), false);
    assert.throws(() => buildPersonalConceptNodeSupabasePayload({ ...baseNode, examMode: "cpa" }), /supports only|감정평가사 1차\/2차/);
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

function requireSupabasePublicEnvOrSkip() {
  const missingPublicEnv = missing(REQUIRED_SUPABASE_ENV);
  if (missingPublicEnv.length > 0) {
    report("skipped_runtime_rls_due_missing_env", {
      missingEnv: missingPublicEnv.join(","),
      documentedSkip: true,
      reason: "Supabase URL/anon key are required for real runtime RLS checks; static repository contract checks already ran.",
    });
    process.exit(0);
  }
}

function requireTestAuthOrSkip() {
  const missingTestAuth = missing(TEST_AUTH_ENV);
  if (missingTestAuth.length > 0) {
    report("skipped_runtime_rls_due_missing_test_auth", {
      missingEnv: missingTestAuth.join(","),
      documentedSkip: true,
      reason: "Two authenticated test-user access tokens are required for real cross-user RLS verification; success is not being faked.",
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

function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rowFor({ id, userId, unitId = "rls-smoke-unit", state = "wrong", examMode = "first", metadataOnly = true }) {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    exam_mode: examMode,
    subject_id: "rls-smoke-subject",
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
    source_status: "runtime_rls_smoke_no_production_write",
  };
}

async function expectNoRows(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) throw new Error(`${label}:${error.message}`);
  if ((data ?? []).length !== 0) throw new Error(`${label}:expected_no_rows`);
}

async function expectConstraintFailure(label, queryPromise) {
  const { error } = await queryPromise;
  if (!error) throw new Error(`${label}:expected_constraint_failure`);
}

async function runRuntimeRlsChecks() {
  const userAId = process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ID;
  const userBId = process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ID;
  if (userAId === userBId) throw new Error("test_auth_user_ids_must_be_distinct");

  const userA = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ACCESS_TOKEN);
  const userB = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ACCESS_TOKEN);
  const anon = anonClient();
  const idA = crypto.randomUUID();
  const idB = crypto.randomUUID();
  const invalidMetadataId = crypto.randomUUID();
  const invalidExamModeId = crypto.randomUUID();
  const invalidStateId = crypto.randomUUID();

  try {
    const insertA = await userA.from("personal_concept_nodes").insert(rowFor({ id: idA, userId: userAId })).select("id,user_id,metadata_only").single();
    if (insertA.error) throw new Error(`own_insert_failed:${insertA.error.message}`);
    if (insertA.data?.id !== idA || insertA.data?.metadata_only !== true) throw new Error("own_insert_returned_unexpected_row");

    const updateA = await userA.from("personal_concept_nodes").update({ state: "recovering", updated_at: new Date().toISOString() }).eq("id", idA).select("id,state").single();
    if (updateA.error) throw new Error(`own_update_failed:${updateA.error.message}`);
    if (updateA.data?.state !== "recovering") throw new Error("own_update_returned_unexpected_state");

    const insertB = await userB.from("personal_concept_nodes").insert(rowFor({ id: idB, userId: userBId, unitId: "rls-smoke-unit-b" })).select("id").single();
    if (insertB.error) throw new Error(`user_b_insert_failed:${insertB.error.message}`);

    await expectNoRows("user_a_cannot_read_user_b_row", userA.from("personal_concept_nodes").select("id").eq("id", idB));
    await expectNoRows("anon_cannot_read_rows", anon.from("personal_concept_nodes").select("id").in("id", [idA, idB]));
    await expectConstraintFailure("metadata_only_false_rejected", userA.from("personal_concept_nodes").insert(rowFor({ id: invalidMetadataId, userId: userAId, unitId: "rls-smoke-invalid-metadata", metadataOnly: false })));
    await expectConstraintFailure("unsupported_exam_mode_rejected", userA.from("personal_concept_nodes").insert(rowFor({ id: invalidExamModeId, userId: userAId, unitId: "rls-smoke-invalid-exam", examMode: "cpa" })));
    await expectConstraintFailure("unsupported_state_rejected", userA.from("personal_concept_nodes").insert(rowFor({ id: invalidStateId, userId: userAId, unitId: "rls-smoke-invalid-state", state: "mastered" })));

    const deleteA = await userA.from("personal_concept_nodes").delete().eq("id", idA);
    if (deleteA.error) throw new Error(`own_delete_failed:${deleteA.error.message}`);

    report("passed_runtime_rls_smoke", {
      verified: "own_insert_select_update_delete,cross_user_read_denied,anon_read_denied,metadata_only_constraint,exam_mode_constraint,state_constraint",
    });
  } finally {
    await userA.from("personal_concept_nodes").delete().in("id", [idA, invalidMetadataId, invalidExamModeId, invalidStateId]);
    await userB.from("personal_concept_nodes").delete().eq("id", idB);
  }
}

async function main() {
  requireSmokeGate();
  requireNonProductionOrExplicitOverride();
  runContractProbe();
  requireSupabasePublicEnvOrSkip();
  requireTestAuthOrSkip();

  try {
    await runRuntimeRlsChecks();
  } catch (error) {
    fail("failed_runtime_rls_smoke", {
      message: redact(error instanceof Error ? error.message : String(error)),
    });
  }
}

main();
