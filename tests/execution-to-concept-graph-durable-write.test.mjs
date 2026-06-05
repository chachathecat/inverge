import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { maybeWriteExecutionSignalToConceptGraph } from "../lib/review-os/execution-to-concept-graph-durable-write.ts";
import {
  arePersonalConceptGraphDurableWritesEnabled,
  getPersonalConceptGraphFeatureFlagState,
} from "../lib/review-os/personal-concept-graph-feature-flags.ts";
import {
  applyExecutionSignalToPersonalConceptGraph,
  getPersonalConceptNode,
  resetPersonalConceptGraphRepositoryForTests,
} from "../lib/review-os/personal-concept-graph-repository.ts";

const now = "2026-06-05T00:00:00.000Z";

function signal(overrides = {}) {
  return {
    userId: "learner-327",
    examMode: "first",
    subjectId: "civil-law",
    unitId: "unit-1",
    taskType: "O/X",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    derivedStatus: "needs_review",
    reviewDueHint: "tomorrow",
    nextRecommendedTaskType: "O/X",
    prioritySignals: ["review_candidate"],
    feedbackCopy: "가장 큰 간극 1개를 다시 확인합니다.",
    updatedAt: now,
    ...overrides,
  };
}

function createMockSupabaseRepository() {
  const calls = { get: 0, upsert: 0, upsertedNode: null };
  const repository = {
    mode: "supabase",
    async getPersonalConceptNode() {
      calls.get += 1;
      return null;
    },
    async upsertPersonalConceptNode(node) {
      calls.upsert += 1;
      calls.upsertedNode = node;
      return { ...node };
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

test("durable write feature flags require both Supabase repository mode and durable writes", () => {
  assert.equal(arePersonalConceptGraphDurableWritesEnabled({}), false);
  assert.deepEqual(getPersonalConceptGraphFeatureFlagState({}), {
    repositoryMode: "memory",
    durableWritesEnabled: false,
    durableReadsEnabled: false,
  });
  assert.equal(arePersonalConceptGraphDurableWritesEnabled({ PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" }), false);
  assert.equal(arePersonalConceptGraphDurableWritesEnabled({ PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1" }), false);
  assert.equal(
    arePersonalConceptGraphDurableWritesEnabled({
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
    }),
    true,
  );
});

test("default flags skip durable write without touching the repository", async () => {
  const { calls, repository } = createMockSupabaseRepository();
  const result = await maybeWriteExecutionSignalToConceptGraph(signal(), { env: {}, repositoryAdapter: repository });

  assert.deepEqual(result, { ok: true, skipped: true, reason: "durable_writes_disabled" });
  assert.deepEqual(calls, { get: 0, upsert: 0, upsertedNode: null });
});

test("Supabase repository flag without durable write flag still skips", async () => {
  const { calls, repository } = createMockSupabaseRepository();
  const result = await maybeWriteExecutionSignalToConceptGraph(signal(), {
    env: { PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase" },
    repositoryAdapter: repository,
  });

  assert.deepEqual(result, { ok: true, skipped: true, reason: "durable_writes_disabled" });
  assert.equal(calls.get, 0);
  assert.equal(calls.upsert, 0);
});

test("both flags are required to attempt a durable metadata write", async () => {
  const { calls, repository } = createMockSupabaseRepository();
  const result = await maybeWriteExecutionSignalToConceptGraph(signal(), {
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
    },
    repositoryAdapter: repository,
  });

  assert.equal(calls.get, 1);
  assert.equal(calls.upsert, 1);
  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(result.repositoryMode, "supabase");
  assert.equal(result.metadataOnly, true);
  assert.equal(result.node.metadataOnly, true);
  assert.equal(result.node.examMode, "first");
  assert.equal(result.node.state, "confused");
});

test("raw, copyrighted, official-answer, score, and instructor fields are rejected", async () => {
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
        maybeWriteExecutionSignalToConceptGraph(signal({ [field]: "must not persist" }), {
          env: {
            PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
            PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
          },
          repositoryAdapter: createMockSupabaseRepository().repository,
        }),
      /Forbidden raw\/copyrighted learner text field/,
      field,
    );
  }
});

test("unsupported exam modes are rejected before durable writes", async () => {
  const { calls, repository } = createMockSupabaseRepository();
  await assert.rejects(
    () =>
      maybeWriteExecutionSignalToConceptGraph(signal({ examMode: "cpa" }), {
        env: {
          PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
          PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
        },
        repositoryAdapter: repository,
      }),
    /감정평가사 1차\/2차|support only/,
  );
  assert.equal(calls.get, 0);
  assert.equal(calls.upsert, 0);
});

test("write result is metadataOnly and does not expose unknown safe input fields", async () => {
  const { calls, repository } = createMockSupabaseRepository();
  const result = await maybeWriteExecutionSignalToConceptGraph(signal({ harmlessExtra: "ignored" }), {
    env: {
      PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
      PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
    },
    repositoryAdapter: repository,
  });

  assert.equal(result.skipped, false);
  assert.equal(Object.hasOwn(result.node, "harmlessExtra"), false);
  assert.equal(Object.hasOwn(calls.upsertedNode ?? {}, "harmlessExtra"), false);
  assert.deepEqual(
    Object.keys(result.node),
    [
      "id",
      "userId",
      "examMode",
      "subjectId",
      "unitId",
      "state",
      "confidence",
      "lastResult",
      "lastTaskType",
      "wrongCount",
      "recoveryCount",
      "stableCount",
      "nextRecommendedTaskType",
      "nextDueAt",
      "updatedAt",
      "metadataOnly",
    ],
  );
});

test("durable write helper makes no official grading, score, or model-answer claims", async () => {
  const source = await readFile(new URL("../lib/review-os/execution-to-concept-graph-durable-write.ts", import.meta.url), "utf8");
  const featureFlags = await readFile(new URL("../lib/review-os/personal-concept-graph-feature-flags.ts", import.meta.url), "utf8");
  const result = await maybeWriteExecutionSignalToConceptGraph(signal(), { env: {}, repositoryAdapter: createMockSupabaseRepository().repository });
  const combined = `${source}\n${featureFlags}\n${textOf(result)}`;

  assert.doesNotMatch(combined, /공식\s*채점|공식\s*점수\s*예측|공식\s*모범\s*답안/);
  assert.doesNotMatch(combined, /official\s+grading|official\s+score|official\s+model\s+answer/i);
});

test("durable write helper adds no instructor, payment, archive, or native-app product copy", async () => {
  const source = await readFile(new URL("../lib/review-os/execution-to-concept-graph-durable-write.ts", import.meta.url), "utf8");
  const featureFlags = await readFile(new URL("../lib/review-os/personal-concept-graph-feature-flags.ts", import.meta.url), "utf8");
  const serialized = `${source}\n${featureFlags}`;

  for (const forbidden of ["/instructor", "학원용", "강사", "결제", "payment", "archive", "아카이브", "native app", "네이티브 앱"]) {
    assert.equal(serialized.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
  }
});

test("no route writes durable graph rows unless explicit durable flags are checked", async () => {
  const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
  const files = await collectSourceFiles(join(root, "app"), root);
  const matches = [];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    if (/maybeWriteExecutionSignalToConceptGraph|upsertPersonalConceptNodeToSupabase|personal_concept_nodes/.test(source) && !/PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES/.test(source)) {
      matches.push(file);
    }
  }
  assert.deepEqual(matches, []);
});

test("existing memory-mode learner loop still applies execution signals without durable flags", () => {
  resetPersonalConceptGraphRepositoryForTests();
  const node = applyExecutionSignalToPersonalConceptGraph(signal());
  const stored = getPersonalConceptNode("learner-327", "first", "civil-law", "unit-1");

  assert.equal(node.metadataOnly, true);
  assert.equal(node.state, "confused");
  assert.equal(stored?.metadataOnly, true);
  assert.equal(stored?.state, "confused");
});
