import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import {
  buildPersonalConceptNodeSupabasePayload,
  PERSONAL_CONCEPT_GRAPH_SOURCE_STATUS,
  PERSONAL_CONCEPT_GRAPH_SUPABASE_COLUMNS,
} from "../lib/review-os/personal-concept-graph-supabase-repository.ts";

const repoPath = "lib/review-os/personal-concept-graph-supabase-repository.ts";
const adapterPath = "lib/review-os/personal-concept-graph-repository-adapter.ts";
const durableHelperPath = "lib/review-os/execution-to-concept-graph-durable-write.ts";
const durableFeatureFlagsPath = "lib/review-os/personal-concept-graph-feature-flags.ts";

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

test("Supabase upsert boundary rejects forbidden raw/copyrighted learner fields", () => {
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

test("Supabase upsert boundary rejects unsupported exam modes, unsupported states, and non-metadata nodes", () => {
  assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ examMode: "cpa" })), /감정평가사 1차\/2차|supports only/);
  assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ state: "mastered" })), /state is not supported/);
  assert.throws(() => buildPersonalConceptNodeSupabasePayload(node({ metadataOnly: false })), /metadataOnly/);
});

test("Supabase repository uses existing authenticated server-client pattern without service-role persistence client", async () => {
  const source = await readFile(new URL(`../${repoPath}`, import.meta.url), "utf8");
  assert.match(source, /createSupabaseServerClient/);
  assert.doesNotMatch(source, /createSupabaseAdminClient|getSupabasePersistenceClient|SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.match(source, /PERSONAL_CONCEPT_NODES_TABLE\)\s*\.upsert\(payload, \{ onConflict: "user_id,exam_mode,subject_id,unit_id" \}/s);
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
  const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const files = [
    ...(await collectSourceFiles(join(root, "app"), root)),
    ...(await collectSourceFiles(join(root, "lib"), root)),
  ];
  const matches = [];
  for (const file of files) {
    if (file === repoPath || file === adapterPath || file === durableHelperPath || file === durableFeatureFlagsPath) continue;
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (/personal-concept-graph-(?:supabase-repository|repository-adapter)|upsertPersonalConceptNodeToSupabase|listPersonalConceptNodesForTodayFromSupabase/.test(source)) {
      matches.push(file);
    }
  }
  assert.deepEqual(matches, []);
});
