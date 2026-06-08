#!/usr/bin/env node
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SMOKE_FLAG = "PERSONAL_LEARNING_STATE_RLS_SMOKE";
const REPOSITORY_FLAG = "PERSONAL_LEARNING_STATE_REPOSITORY";
const REQUIRED_SUPABASE_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const TEST_AUTH_ENV = [
  "PERSONAL_LEARNING_STATE_RLS_USER_A_ID",
  "PERSONAL_LEARNING_STATE_RLS_USER_A_ACCESS_TOKEN",
  "PERSONAL_LEARNING_STATE_RLS_USER_B_ID",
  "PERSONAL_LEARNING_STATE_RLS_USER_B_ACCESS_TOKEN",
];
const VERIFIED = [
  "explicit_flag_required",
  "supabase_repository_mode",
  "own_row_read_allowed",
  "cross_user_read_denied",
  "metadata_only_rows",
  "unsupported_exam_rejected",
  "unsupported_status_rejected",
  "cleanup_attempted",
];

function safeJson(status, details = {}) {
  const redacted = Object.fromEntries(Object.entries(details).filter(([key]) => !/token|secret|password|jwt|key/i.test(key)));
  console.log(JSON.stringify({ status, ...redacted }));
}

function fail(status, details = {}) {
  safeJson(status, details);
  process.exit(1);
}

function skip(status, details = {}) {
  safeJson(status, details);
  process.exit(0);
}

function requireGate() {
  if (process.env[SMOKE_FLAG] !== "1") {
    fail("refused_missing_personal_learning_state_rls_smoke_flag", { requiredFlag: `${SMOKE_FLAG}=1` });
  }
  if (process.env[REPOSITORY_FLAG] !== "supabase") {
    fail("refused_non_supabase_personal_learning_state_repository", { requiredFlag: `${REPOSITORY_FLAG}=supabase` });
  }
}

function requireEnv() {
  const missingSupabase = REQUIRED_SUPABASE_ENV.filter((name) => !process.env[name]);
  if (missingSupabase.length > 0) skip("skipped_personal_learning_state_rls_due_missing_env", { missing: missingSupabase, documentedSkip: true });
  const missingAuth = TEST_AUTH_ENV.filter((name) => !process.env[name]);
  if (missingAuth.length > 0) skip("skipped_personal_learning_state_rls_due_missing_test_auth", { missing: missingAuth, documentedSkip: true });
}

function clientFor(accessToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function rowFor({ id, userId, conceptNodeId, examMode = "first", status = "wrong", metadata = { metadataOnly: true, smokeVersion: 1 } }) {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    concept_node_id: conceptNodeId,
    exam_mode: examMode,
    subject: "민법",
    status,
    previous_status: "confused",
    confidence_avg: 0.4,
    wrong_count: 1,
    correct_streak: 0,
    recovery_score: 0,
    last_seen_at: now,
    next_review_at: now,
    last_source_event_type: "session",
    last_task_type: "first_ox_retry",
    last_reason: "runtime_rls_smoke",
    priority_score: 88,
    metadata,
    updated_at: now,
  };
}

async function expectNoRows(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) throw new Error(`${label}:${error.message}`);
  if ((data ?? []).length !== 0) throw new Error(`${label}:expected_no_rows`);
}

async function expectRejected(label, queryPromise) {
  const { error } = await queryPromise;
  if (!error) throw new Error(`${label}:expected_rejection`);
}

async function cleanup(userA, userB, ids) {
  await Promise.allSettled([
    userA.from("personal_learning_states").delete().in("id", ids),
    userB.from("personal_learning_states").delete().in("id", ids),
  ]);
}

async function run() {
  requireGate();
  requireEnv();

  const userAId = process.env.PERSONAL_LEARNING_STATE_RLS_USER_A_ID;
  const userBId = process.env.PERSONAL_LEARNING_STATE_RLS_USER_B_ID;
  if (userAId === userBId) fail("failed_personal_learning_state_rls_smoke", { message: "test_user_ids_must_be_distinct" });

  const userA = clientFor(process.env.PERSONAL_LEARNING_STATE_RLS_USER_A_ACCESS_TOKEN);
  const userB = clientFor(process.env.PERSONAL_LEARNING_STATE_RLS_USER_B_ACCESS_TOKEN);
  const idA = crypto.randomUUID();
  const invalidExamId = crypto.randomUUID();
  const invalidStatusId = crypto.randomUUID();
  const invalidMetadataId = crypto.randomUUID();
  const conceptNodeId = `rls-smoke-${idA}`;
  const ids = [idA, invalidExamId, invalidStatusId, invalidMetadataId];

  try {
    const upsertA = await userA
      .from("personal_learning_states")
      .upsert(rowFor({ id: idA, userId: userAId, conceptNodeId }), { onConflict: "user_id,concept_node_id" })
      .select("id,user_id,concept_node_id,status,metadata")
      .single();
    if (upsertA.error) throw new Error(`own_upsert_failed:${upsertA.error.message}`);
    if (upsertA.data?.id !== idA || upsertA.data?.user_id !== userAId || upsertA.data?.metadata?.metadataOnly !== true) {
      throw new Error("own_upsert_returned_unexpected_row");
    }

    const ownRead = await userA.from("personal_learning_states").select("id,status").eq("id", idA).single();
    if (ownRead.error) throw new Error(`own_read_failed:${ownRead.error.message}`);
    if (ownRead.data?.id !== idA) throw new Error("own_read_returned_unexpected_row");

    await expectNoRows("user_b_cannot_read_user_a_row", userB.from("personal_learning_states").select("id").eq("id", idA));
    await expectRejected(
      "unsupported_exam_rejected",
      userA.from("personal_learning_states").insert(rowFor({ id: invalidExamId, userId: userAId, conceptNodeId: `${conceptNodeId}-exam`, examMode: "cpa" })),
    );
    await expectRejected(
      "unsupported_status_rejected",
      userA.from("personal_learning_states").insert(rowFor({ id: invalidStatusId, userId: userAId, conceptNodeId: `${conceptNodeId}-status`, status: "mastered" })),
    );
    await expectRejected(
      "metadata_raw_field_rejected",
      userA.from("personal_learning_states").insert(rowFor({
        id: invalidMetadataId,
        userId: userAId,
        conceptNodeId: `${conceptNodeId}-metadata`,
        metadata: { rawAnswerText: "redacted test value must not persist" },
      })),
    );
  } finally {
    await cleanup(userA, userB, ids);
  }

  safeJson("passed_personal_learning_state_rls_smoke", { verified: VERIFIED });
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail("failed_personal_learning_state_rls_smoke", { message: message.replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]") });
});
