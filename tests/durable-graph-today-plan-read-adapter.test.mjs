import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { maybeBuildTodayPlanActionsFromDurableConceptGraph } from "../lib/review-os/durable-graph-today-plan-read-adapter.ts";
import {
  arePersonalConceptGraphDurableReadsEnabled,
  getPersonalConceptGraphFeatureFlagState,
} from "../lib/review-os/personal-concept-graph-feature-flags.ts";
import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";

const now = "2026-06-05T00:00:00.000Z";

function makeNode(unitId, overrides = {}) {
  return updatePersonalConceptNode(null, {
    userId: "learner-329",
    examMode: "first",
    subjectId: "civil-law",
    unitId,
    taskType: "O/X",
    result: "wrong",
    confidence: "medium",
    updatedAt: now,
    ...overrides,
  });
}

function createMockSupabaseRepository(nodes = []) {
  const calls = { list: 0, context: null };
  const repository = {
    mode: "supabase",
    async listPersonalConceptNodesForToday(_userId, context) {
      calls.list += 1;
      calls.context = context;
      return nodes;
    },
  };
  return { calls, repository };
}

function textOf(value) {
  return JSON.stringify(value);
}

async function collectSourceFiles(root, base = root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath, base)));
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath.slice(base.length + 1).replaceAll("\\", "/"));
    }
  }
  return files;
}

test("durable read feature flags require both Supabase repository mode and durable reads", () => {
  assert.equal(arePersonalConceptGraphDurableReadsEnabled({}), false);
  assert.deepEqual(getPersonalConceptGraphFeatureFlagState({}), {
    repositoryMode: "memory",
    durableWritesEnabled: false,
    durableReadsEnabled: false,
  });
  assert.equal(arePersonalConceptGraphDurableReadsEnabled({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }), false);
  assert.equal(arePersonalConceptGraphDurableReadsEnabled({ PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1" }), false);
  assert.equal(
    arePersonalConceptGraphDurableReadsEnabled({
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    }),
    true,
  );
});

test("default flags skip durable reads without touching the repository", async () => {
  const { calls, repository } = createMockSupabaseRepository([makeNode("unit-1")]);
  const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", { env: {}, repositoryAdapter: repository });

  assert.deepEqual(result, { ok: true, skipped: true, reason: "durable_reads_disabled", actions: [] });
  assert.equal(calls.list, 0);
});

test("Supabase repository flag without durable read flag still skips", async () => {
  const { calls, repository } = createMockSupabaseRepository([makeNode("unit-1")]);
  const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
    env: { PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" },
    repositoryAdapter: repository,
  });

  assert.deepEqual(result, { ok: true, skipped: true, reason: "durable_reads_disabled", actions: [] });
  assert.equal(calls.list, 0);
});

test("both flags are required to read durable graph metadata", async () => {
  const { calls, repository } = createMockSupabaseRepository([makeNode("unit-1")]);
  const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    },
    repositoryAdapter: repository,
    now: "2026-06-07T00:00:00.000Z",
  });

  assert.equal(calls.list, 1);
  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.repositoryMode, "supabase");
  assert.equal(result.metadataOnly, true);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].source, "personal_concept_graph");
});

test("returned actions are metadataOnly, primary, source-union compatible, and max 3", async () => {
  const nodes = Array.from({ length: 6 }, (_, index) => makeNode(`unit-${index}`, { result: index % 2 === 0 ? "wrong" : "unknown", confidence: index % 2 === 0 ? "medium" : "low" }));
  const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    },
    repositoryAdapter: createMockSupabaseRepository(nodes).repository,
    now: "2026-06-07T00:00:00.000Z",
  });

  assert.equal(result.skipped, false);
  assert.equal(result.actions.length, 3);
  assert.ok(result.actions.every((action) => action.metadataOnly === true));
  assert.ok(result.actions.every((action) => action.isPrimaryTask === true));
  assert.ok(result.actions.every((action) => action.source === "personal_concept_graph"));
  assert.ok(result.actions.every((action) => typeof action.displayPrimaryCta === "string"));
});

test("wrong, confused, and recovering nodes produce recommendations", async () => {
  const wrong = makeNode("wrong-unit", { result: "wrong", confidence: "medium" });
  const confused = makeNode("confused-unit", { result: "unknown", confidence: "low" });
  const recovering = makeNode("recovering-unit", { result: "missed_due", dueBucket: "overdue" });
  const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
    },
    repositoryAdapter: createMockSupabaseRepository([wrong, confused, recovering]).repository,
    now: "2026-06-07T00:00:00.000Z",
  });

  assert.equal(result.skipped, false);
  assert.deepEqual(new Set(result.actions.map((action) => action.unitId)), new Set(["wrong-unit", "confused-unit", "recovering-unit"]));
  assert.ok(result.actions.some((action) => action.prioritySignals.includes("wrong_concept")));
  assert.ok(result.actions.some((action) => action.prioritySignals.includes("confused_concept")));
  assert.ok(result.actions.some((action) => action.prioritySignals.includes("recovery_needed")));
});

test("raw fields are rejected before returning durable read actions", async () => {
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
    await assert.rejects(
      () =>
        maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
          env: {
            PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
            PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
          },
          repositoryAdapter: createMockSupabaseRepository([{ ...makeNode("unsafe-unit"), [field]: "must not leave repository" }]).repository,
        }),
      /Forbidden raw\/copyrighted learner text field|Raw text field is not accepted/,
      field,
    );
  }
});

test("unsupported exam modes are rejected for context and returned nodes", async () => {
  const { calls, repository } = createMockSupabaseRepository([makeNode("unit-1")]);
  await assert.rejects(
    () =>
      maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
        env: {
          PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
          PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
        },
        repositoryAdapter: repository,
        examMode: "cpa",
      }),
    /감정평가사 1차\/2차|support only/,
  );
  assert.equal(calls.list, 0);

  await assert.rejects(
    () =>
      maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", {
        env: {
          PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
          PERSONAL_CONCEPT_GRAPH_DURABLE_READS: "1",
        },
        repositoryAdapter: createMockSupabaseRepository([{ ...makeNode("unsafe-exam"), examMode: "sat" }]).repository,
      }),
    /감정평가사 1차\/2차|support only/,
  );
});

test("durable read helper makes no official grading, score, or model-answer claims", async () => {
  const source = await readFile(new URL("../lib/review-os/durable-graph-today-plan-read-adapter.ts", import.meta.url), "utf8");
  const featureFlags = await readFile(new URL("../lib/review-os/personal-concept-graph-feature-flags.ts", import.meta.url), "utf8");
  const result = await maybeBuildTodayPlanActionsFromDurableConceptGraph("learner-329", { env: {}, repositoryAdapter: createMockSupabaseRepository().repository });
  const combined = `${source}\n${featureFlags}\n${textOf(result)}`;

  assert.doesNotMatch(combined, /공식\s*채점|공식\s*점수\s*예측|공식\s*모범\s*답안/);
  assert.doesNotMatch(combined, /official\s+grading|official\s+score|official\s+model\s+answer/i);
});

test("durable read helper adds no instructor, payment, archive, or native-app product copy", async () => {
  const source = await readFile(new URL("../lib/review-os/durable-graph-today-plan-read-adapter.ts", import.meta.url), "utf8");
  const featureFlags = await readFile(new URL("../lib/review-os/personal-concept-graph-feature-flags.ts", import.meta.url), "utf8");
  const serialized = `${source}\n${featureFlags}`;

  for (const forbidden of ["/instructor", "학원용", "강사", "결제", "payment", "archive", "아카이브", "native app", "네이티브 앱"]) {
    assert.equal(serialized.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
  }
});

test("no live route reads durable graph unless explicit durable read flags are checked", async () => {
  const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const files = await collectSourceFiles(join(root, "app"), root);
  const matches = [];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (/maybeBuildTodayPlanActionsFromDurableConceptGraph|listPersonalConceptNodesForTodayFromSupabase|personal_concept_nodes/.test(source) && !/PERSONAL_CONCEPT_GRAPH_DURABLE_READS/.test(source)) {
      matches.push(file);
    }
  }
  assert.deepEqual(matches, []);
});
