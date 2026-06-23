import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildPersonalConceptAtomicTransitionRpcParams,
  buildPersonalConceptNodeSupabasePayload,
  buildPersonalConceptNodeSupabaseWritePayload,
  isUuid,
  PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC,
  PERSONAL_CONCEPT_GRAPH_SOURCE_STATUS,
  PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS,
} from "../lib/review-os/personal-concept-graph-supabase-repository.ts";

const repoPath = "lib/review-os/personal-concept-graph-supabase-repository.ts";
const adapterPath = "lib/review-os/personal-concept-graph-repository-adapter.ts";
const durableHelperPath = "lib/review-os/execution-to-concept-graph-durable-write.ts";
const durableReadHelperPath = "lib/review-os/durable-graph-today-plan-read-adapter.ts";
const durableFeatureFlagsPath = "lib/review-os/personal-concept-graph-feature-flags.ts";
const gatedTodayPlanIntegrationPath = "lib/review-os/today-plan-durable-graph-integration.ts";
const learnerTodayPlanRouteIntegrationPath = "lib/review-os/today-plan-learner-route-integration.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(repoRoot, "app");
const libRoot = join(repoRoot, "lib");

function node(overrides = {}) {
  return {
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
    ...overrides,
  };
}

test("Supabase payload maps explicitly to metadata-only table columns", () => {
  const payload = buildPersonalConceptNodeSupabasePayload(node({ unknownColumn: "ignored", safeExtra: "ignored" }));
  assert.deepEqual(Object.keys(payload), [...PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS]);
  assert.equal(payload.user_id, "22222222-2222-4222-8222-222222222222");
  assert.equal(payload.exam_mode, "first");
  assert.equal(payload.metadata_only, true);
  assert.equal(payload.version, 1);
  assert.equal(payload.source_status, PERSONAL_CONCEPT_GRAPH_SOURCE_STATUS);
  assert.equal(Object.hasOwn(payload, "safeExtra"), false);
  assert.equal(Object.hasOwn(payload, "unknownColumn"), false);
});

test("Supabase write payload omits non-UUID helper IDs and preserves real UUIDs", async () => {
  const generatedHelperId = "personal-concept:learner:first:civil-law:unit-1";
  const nonUuidPayload = buildPersonalConceptNodeSupabaseWritePayload(node({ id: generatedHelperId }));
  assert.equal(isUuid(generatedHelperId), false);
  assert.equal(Object.hasOwn(nonUuidPayload, "id"), false);
  assert.deepEqual(Object.keys(nonUuidPayload), PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS.filter((column) => column !== "id"));

  const uuid = "11111111-1111-4111-8111-111111111111";
  const uuidPayload = buildPersonalConceptNodeSupabaseWritePayload(node({ id: uuid }));
  assert.equal(isUuid(uuid), true);
  assert.equal(uuidPayload.id, uuid);
  assert.deepEqual(Object.keys(uuidPayload), [...PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS]);

  const source = await readFile(new URL(`../${repoPath}`, import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.upsert\(/);
  assert.doesNotMatch(source, /upsertPersonalConceptNodeToSupabase/);
});

test("Supabase metadata payload boundary rejects forbidden raw/copyrighted learner fields", () => {
  for (const field of [
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
  ]) {
    assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ [field]: "must not persist" })), /Forbidden raw\/copyrighted learner text field/);
  }
});

test("Supabase atomic transition RPC params are metadata-only and never accept client-selected user id", async () => {
  const params = buildPersonalConceptAtomicTransitionRpcParams({
    userId: "22222222-2222-4222-8222-222222222222",
    eventId: "learning-event-1",
    examMode: "first",
    subjectId: "civil-law",
    unitId: "unit-1",
    taskType: "O/X",
    result: "wrong",
    confidence: "low",
    dueBucket: "tomorrow",
    recentMissCount: 1,
    updatedAt: "2026-06-05T00:00:00.000Z",
  });

  assert.equal(params.p_event_id, "learning-event-1");
  assert.equal(params.p_exam_mode, "first");
  assert.equal(params.p_confidence, "low");
  assert.equal(Object.hasOwn(params, "p_user_id"), false);
  assert.equal(Object.hasOwn(params, "user_id"), false);
  assert.deepEqual(Object.keys(params), [
    "p_event_id",
    "p_exam_mode",
    "p_subject_id",
    "p_unit_id",
    "p_task_type",
    "p_result",
    "p_confidence",
    "p_due_bucket",
    "p_recent_miss_count",
    "p_occurred_at",
  ]);

  const source = await readFile(new URL(`../${repoPath}`, import.meta.url), "utf8");
  assert.equal(PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC, "transition_personal_concept_node_v1");
  assert.match(source, /rpc\(PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC, params\)/);
  assert.doesNotMatch(source, /p_user_id|client-selected user/i);
});

test("Supabase metadata payload boundary rejects unsupported exam modes, unsupported states, and non-metadata nodes", () => {
  assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ examMode: "cpa" })), /감정평가사 1차\/2차|supports only/);
  assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ state: "mastered" })), /state is not supported/);
  assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ metadataOnly: false })), /metadataOnly/);
});

test("Supabase repository uses existing authenticated server-client pattern without service-role persistence client", async () => {
  const source = await readFile(new URL(`../${repoPath}`, import.meta.url), "utf8");
  assert.match(source, /createSupabaseServerClient/);
  assert.doesNotMatch(source, /createSupabaseAdminClient|getSupabasePersistenceClient|SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.doesNotMatch(source, /\.upsert\(/);
  assert.match(source, /transitionPersonalConceptNodeInSupabase/);
  assert.match(source, /PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC/);
  assert.match(source, /\.rpc\(PERSONAL_CONCEPT_ATOMIC_TRANSITION_RPC, params\)/);
  assert.match(source, /\.delete\(\)\s*\.eq\("user_id"/s);
});

test("Supabase contract introduces no public or anon table access", async () => {
  const repoSource = await readFile(new URL(`../${repoPath}`, import.meta.url), "utf8");
  const adapterSource = await readFile(new URL(`../${adapterPath}`, import.meta.url), "utf8");
  assert.doesNotMatch(`${repoSource}\n${adapterSource}`, /grant\s+.*\bpublic\b|to\s+anon|public read|anon access/i);
});

async function collectSourceFiles(root, base = root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(absolutePath, base));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath.slice(base.length + 1).replaceAll("\\", "/"));
    }
  }
  return files;
}

test("Supabase repository remains route-unwired except the feature-flagged helper", async () => {
  const files = [
    ...(await collectSourceFiles(appRoot, repoRoot)),
    ...(await collectSourceFiles(libRoot, repoRoot)),
  ];
  const matches = [];
  for (const file of files) {
    if (file === repoPath || file === adapterPath || file === durableHelperPath || file === durableReadHelperPath || file === durableFeatureFlagsPath || file === gatedTodayPlanIntegrationPath || file === learnerTodayPlanRouteIntegrationPath) continue;
    const source = await readFile(join(repoRoot, file), "utf8");
    if (/personal-concept-graph-(?:supabase-repository|repository-adapter)|listPersonalConceptNodesForTodayFromSupabase/.test(source)) {
      matches.push(file);
    }
  }
  assert.deepEqual(matches, []);
});
