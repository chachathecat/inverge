#!/usr/bin/env node
import crypto from "node:crypto";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

import { maybeBuildTodayPlanActionsFromDurableConceptGraph } from "../lib/review-os/durable-graph-today-plan-read-adapter.ts";
import {
  buildPersonalConceptNodeSupabasePayload,
  PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS,
  PERSONAL_CONCEPT_NODES_TABLE,
} from "../lib/review-os/personal-concept-graph-supabase-repository.ts";

const SMOKE_FLAG = "PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE";
const REPOSITORY_FLAG = "PERSONAL_CONCEPT_GRAPH_REPOSITORY";
const READ_FLAG = "PERSONAL_CONCEPT_GRAPH_DURABLE_READS";
const REQUIRED_SUPABASE_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
const TEST_AUTH_ENV = [
  "PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_A_ID",
  "PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_A_ACCESS_TOKEN",
  "PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_B_ID",
  "PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_B_ACCESS_TOKEN",
];
const SECRET_ENV = [...REQUIRED_SUPABASE_ENV, ...TEST_AUTH_ENV, "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"];
const VERIFIED = [
  "explicit_flags_required",
  "supabase_repository_mode",
  "metadata_only_rows",
  "helper_returns_max_3_actions",
  "no_raw_text_leak",
  "unsupported_exam_rejection",
  "cross_user_read_denied",
  "cleanup_attempted",
];
const FORBIDDEN_KEYS = [
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
  "officialAnswer",
  "modelAnswer",
  "scorePrediction",
  "instructorComment",
  "user_id",
  "source_status",
  "version",
  "created_at",
];
const FORBIDDEN_PATTERN = /(raw|ocr|answerText|problemText|questionText|copyright|originalText|fullText|sourceText|officialAnswer|modelAnswer|scorePrediction|instructorComment|공식\s*채점|공식\s*점수|공식\s*모범|official\s+(grading|score|model\s+answer))/i;

function redact(value) {
  if (!value) return "";
  let redacted = String(value);
  for (const envName of SECRET_ENV) {
    const secret = process.env[envName];
    if (secret) redacted = redacted.split(secret).join(`[redacted:${envName}]`);
  }
  return redacted;
}

function emit(status, details = {}) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([key]) => !/key|token|secret|password|jwt/i.test(key)),
  );
  console.log(JSON.stringify({ status, ...safeDetails }, null, 2));
}

function fail(status, details = {}) {
  emit(status, details);
  process.exit(1);
}

function requireFlag(name, expectedValue, status) {
  if (process.env[name] !== expectedValue) {
    fail(status, {
      requiredFlag: `${name}=${expectedValue}`,
      reason: "Durable graph read runtime smoke must be explicitly requested and cannot run by accident.",
    });
  }
}

function requireSmokeGates() {
  requireFlag(SMOKE_FLAG, "1", "refused_missing_personal_concept_graph_durable_read_smoke_flag");
  requireFlag(REPOSITORY_FLAG, "supabase", "refused_missing_supabase_repository_mode");
  requireFlag(READ_FLAG, "1", "refused_missing_personal_concept_graph_durable_reads_flag");
}

function requireNonProductionOrExplicitOverride() {
  const productionLike = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (productionLike && process.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READ_ALLOW_PRODUCTION_SMOKE !== "1") {
    fail("refused_production_durable_read_smoke_without_explicit_override", {
      requiredFlag: "PERSONAL_CONCEPT_GRAPH_DURABLE_READ_ALLOW_PRODUCTION_SMOKE=1",
      reason: "Production-like environments need an additional explicit override for test-only durable read smoke data.",
    });
  }
}

function missing(names) {
  return names.filter((name) => !process.env[name]);
}

function requireEnv() {
  const missingEnv = missing([...REQUIRED_SUPABASE_ENV, ...TEST_AUTH_ENV]);
  if (missingEnv.length > 0) {
    fail("failed_missing_durable_read_runtime_smoke_env", {
      missingEnv: missingEnv.join(","),
      reason: "Supabase URL, anon key, and two authenticated test-user access tokens are required for real RLS durable-read verification.",
    });
  }
}

function clientFor(accessToken) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function nodeFor({ id, userId, unitId, state = "wrong", examMode = "first", wrongCount = 1, confidence = "low" }) {
  const now = new Date().toISOString();
  return {
    id,
    userId,
    examMode,
    subjectId: "durable-read-smoke-subject",
    unitId,
    state,
    confidence,
    lastResult: state === "stable" ? "correct" : "wrong",
    lastTaskType: examMode === "second" ? "rewrite" : "O/X",
    wrongCount,
    recoveryCount: state === "recovering" ? 1 : 0,
    stableCount: state === "stable" ? 1 : 0,
    nextRecommendedTaskType: examMode === "second" ? "rewrite" : "retry",
    nextDueAt: now,
    updatedAt: now,
    metadataOnly: true,
  };
}

function fromRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    examMode: row.exam_mode,
    subjectId: row.subject_id,
    unitId: row.unit_id,
    state: row.state,
    confidence: row.confidence,
    lastResult: row.last_result,
    lastTaskType: row.last_task_type,
    wrongCount: row.wrong_count,
    recoveryCount: row.recovery_count,
    stableCount: row.stable_count,
    nextRecommendedTaskType: row.next_recommended_task_type,
    nextDueAt: row.next_due_at,
    updatedAt: row.updated_at,
    metadataOnly: true,
  };
}

function assertNoForbiddenLeak(value, label = "result") {
  const text = JSON.stringify(value);
  for (const key of FORBIDDEN_KEYS) {
    if (text.includes(`"${key}"`)) throw new Error(`${label}:forbidden_key_leaked:${key}`);
  }
  if (FORBIDDEN_PATTERN.test(text)) throw new Error(`${label}:forbidden_copy_or_raw_text_pattern_leaked`);
}

function assertActions(result) {
  if (result?.skipped !== false) throw new Error("helper_unexpectedly_skipped_with_flags_enabled");
  if (result.repositoryMode !== "supabase") throw new Error("helper_repository_mode_was_not_supabase");
  if (!Array.isArray(result.actions)) throw new Error("helper_actions_missing");
  if (result.actions.length === 0) throw new Error("helper_returned_no_actions_for_seeded_due_nodes");
  if (result.actions.length > 3) throw new Error("helper_returned_more_than_three_actions");
  for (const action of result.actions) {
    if (action.metadataOnly !== true) throw new Error("helper_action_not_metadata_only");
    if (action.isPrimaryTask !== true) throw new Error("helper_action_not_primary_task");
  }
  assertNoForbiddenLeak(result.actions, "actions");
}

async function upsertNodes(client, nodes) {
  const payloads = nodes.map((node) => buildPersonalConceptNodeSupabasePayload(node));
  const { data, error } = await client
    .from(PERSONAL_CONCEPT_NODES_TABLE)
    .upsert(payloads, { onConflict: "user_id,exam_mode,subject_id,unit_id" })
    .select(PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS.join(","));
  if (error) throw new Error(`metadata_only_upsert_failed:${error.message}`);
  if ((data ?? []).length !== nodes.length) throw new Error("metadata_only_upsert_returned_unexpected_row_count");
  if (!(data ?? []).every((row) => row.metadata_only === true)) throw new Error("metadata_only_upsert_returned_non_metadata_row");
}

function repositoryFor(client) {
  return {
    mode: "supabase",
    async listPersonalConceptNodesForToday(userId, context = {}) {
      let query = client
        .from(PERSONAL_CONCEPT_NODES_TABLE)
        .select(PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS.join(","))
        .eq("user_id", userId);
      if (context.examMode && context.examMode !== "mixed") query = query.eq("exam_mode", context.examMode);
      const { data, error } = await query;
      if (error) throw new Error(`durable_read_list_failed:${error.message}`);
      return (data ?? []).map(fromRow);
    },
  };
}

async function cleanup(client, ids) {
  if (ids.length === 0) return;
  const { error } = await client.from(PERSONAL_CONCEPT_NODES_TABLE).delete().in("id", ids);
  if (error) throw new Error(`cleanup_failed:${error.message}`);
}

async function runSmoke() {
  const userAId = process.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_A_ID;
  const userBId = process.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_B_ID;
  if (userAId === userBId) throw new Error("durable_read_test_user_ids_must_be_distinct");

  const userA = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_A_ACCESS_TOKEN);
  const userB = clientFor(process.env.PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_B_ACCESS_TOKEN);
  const idsA = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const idB = crypto.randomUUID();
  const nodesA = idsA.map((id, index) =>
    nodeFor({
      id,
      userId: userAId,
      unitId: `durable-read-smoke-a-${index}`,
      state: index === 1 ? "confused" : index === 2 ? "recovering" : "wrong",
      wrongCount: index + 1,
    }),
  );
  const nodeB = nodeFor({ id: idB, userId: userBId, unitId: "durable-read-smoke-b", state: "wrong" });
  let cleanupAttempted = false;

  try {
    await upsertNodes(userA, nodesA);
    await upsertNodes(userB, [nodeB]);

    const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph(userAId, {
      env: {
        PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
        PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
      },
      repositoryAdapter: repositoryFor(userA),
      examMode: "first",
      now: new Date().toISOString(),
    });
    assertActions(result);

    await maybeBuildTodayPlanActionsFromDurableConceptGraph(userAId, {
      env: {
        PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
        PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
      },
      repositoryAdapter: repositoryFor(userA),
      examMode: "cpa",
    }).then(
      () => {
        throw new Error("unsupported_exam_mode_was_not_rejected");
      },
      (error) => {
        if (!/감정평가사 1차\/2차|support only/.test(error instanceof Error ? error.message : String(error))) throw error;
      },
    );

    const bReadA = await userB.from(PERSONAL_CONCEPT_NODES_TABLE).select("id").in("id", idsA);
    if (bReadA.error) throw new Error(`cross_user_read_check_failed:${bReadA.error.message}`);
    if ((bReadA.data ?? []).length !== 0) throw new Error("cross_user_read_denied_failed");

    return { result, cleanup: async () => cleanup(userA, idsA).then(() => cleanup(userB, [idB])) };
  } catch (error) {
    return { error, cleanup: async () => cleanup(userA, idsA).then(() => cleanup(userB, [idB])) };
  } finally {
    cleanupAttempted = true;
    void cleanupAttempted;
  }
}

async function main() {
  requireSmokeGates();
  requireNonProductionOrExplicitOverride();
  requireEnv();

  let cleanupAttempted = false;
  try {
    const smoke = await runSmoke();
    try {
      cleanupAttempted = true;
      await smoke.cleanup();
    } catch (cleanupError) {
      fail("failed_durable_graph_read_runtime_smoke_cleanup", { message: redact(cleanupError instanceof Error ? cleanupError.message : String(cleanupError)) });
    }
    if (smoke.error) throw smoke.error;

    emit("passed_durable_graph_read_runtime_smoke", { verified: VERIFIED });
  } catch (error) {
    emit("failed_durable_graph_read_runtime_smoke", {
      cleanupAttempted,
      message: redact(error instanceof Error ? error.message : String(error)),
    });
    process.exit(1);
  }
}

main();
