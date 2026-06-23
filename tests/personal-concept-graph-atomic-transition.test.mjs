import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { maybeUpdateCalculatorRoutineConceptState } from "../lib/review-os/calculator-routine-concept-state.ts";
import {
  buildCalculatorRoutineCompletionSignal,
  createCalculatorRoutineDraft,
  updateCalculatorRoutineDraftStep,
} from "../lib/review-os/calculator-routine.ts";
import { buildCalculatorRoutineBridge } from "../lib/review-os/calculator-routine-learning-signal.ts";
import { normalizeCurriculumTaskType } from "../lib/review-os/curriculum-engine.ts";
import { maybeWriteExecutionSignalToConceptGraph } from "../lib/review-os/execution-to-concept-graph-durable-write.ts";
import {
  getPersonalConceptNode,
  resetPersonalConceptGraphRepositoryForTests,
  transitionPersonalConceptNode,
} from "../lib/review-os/personal-concept-graph-repository.ts";
import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";
import { buildTodayPlanSourceUnion } from "../lib/review-os/today-plan-source-union.ts";
import { assertSameTimestampInstant } from "../scripts/verify-personal-concept-graph-atomic-transition.mjs";

const migrationPath = "supabase/migrations/20260623_personal_concept_graph_atomic_transition.sql";
const rpcOnlyBoundaryMigrationPath = "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql";
const scriptPath = "scripts/verify-personal-concept-graph-atomic-transition.mjs";
const docPath = "docs/qa/personal-concept-graph-atomic-transition-v1.md";
const enabledWriteEnv = {
  PERSONAL_CONCEPT_GRAPH_REPOSITORY: "supabase",
  PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES: "1",
};

function signal(overrides = {}) {
  return {
    userId: "00000000-0000-4000-8000-000000000420",
    eventId: "event-420",
    examMode: "first",
    subjectId: "civil-law",
    unitId: "unit-1",
    taskType: "O/X",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "medium",
    derivedStatus: "needs_review",
    reviewDueHint: "tomorrow",
    prioritySignals: ["review_candidate"],
    feedbackCopy: "metadata-only transition signal",
    nextRecommendedTaskType: "O/X",
    updatedAt: "2026-06-23T00:00:00.000Z",
    ...overrides,
  };
}

function transitionInput(overrides = {}) {
  return {
    userId: "user-a",
    eventId: "event-a",
    examMode: "first",
    subjectId: "civil-law",
    unitId: "unit-1",
    taskType: "O/X",
    result: "wrong",
    confidence: "medium",
    updatedAt: "2026-06-23T00:00:00.000Z",
    ...overrides,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function transitionFingerprint(input) {
  return [
    input.examMode,
    input.subjectId?.trim(),
    input.unitId?.trim(),
    normalizeCurriculumTaskType(input.taskType) ?? input.taskType?.trim(),
    input.result,
    input.confidence ?? "unknown",
    input.dueBucket ?? "",
    String(typeof input.recentMissCount === "number" && Number.isFinite(input.recentMissCount) ? Math.max(0, Math.round(input.recentMissCount)) : 0),
    input.updatedAt,
  ].join("|");
}

function createAtomicMockRepository(initialNode = null) {
  let stored = initialNode ? { ...initialNode } : null;
  const seenEvents = new Map();
  const calls = { transition: 0 };
  let queue = Promise.resolve();

  async function runLocked(input) {
    calls.transition += 1;
    const eventKey = `${input.userId}:${input.eventId}`;
    const fingerprint = transitionFingerprint(input);
    const seen = seenEvents.get(eventKey);
    if (seen) {
      if (seen.fingerprint !== fingerprint) {
        return { status: "rejected", reason: "event_id_payload_mismatch", node: stored ? { ...stored } : undefined, metadataOnly: true };
      }
      return { status: "already_applied", node: stored ? { ...stored } : undefined, metadataOnly: true };
    }
    const previous = stored ? { ...stored } : null;
    if (previous) {
      const incomingTs = Date.parse(input.updatedAt);
      const previousTs = Date.parse(previous.updatedAt);
      if (incomingTs < previousTs) {
        seenEvents.set(eventKey, { status: "stale_signal", fingerprint });
        return { status: "stale_signal", node: previous, previousState: previous.state, previousUpdatedAt: previous.updatedAt, metadataOnly: true };
      }
      if (incomingTs === previousTs) {
        seenEvents.set(eventKey, { status: "rejected", fingerprint });
        return { status: "rejected", reason: "same_timestamp_different_event", node: previous, previousState: previous.state, previousUpdatedAt: previous.updatedAt, metadataOnly: true };
      }
    }
    const next = updatePersonalConceptNode(previous, input);
    stored = { ...next };
    seenEvents.set(eventKey, { status: "applied", fingerprint });
    return { status: "applied", node: { ...next }, previousState: previous?.state, previousUpdatedAt: previous?.updatedAt, metadataOnly: true };
  }

  return {
    calls,
    get stored() {
      return stored ? { ...stored } : null;
    },
    repository: {
      mode: "supabase",
      transitionPersonalConceptNode(input) {
        const result = queue.then(() => runLocked(input));
        queue = result.then(() => undefined, () => undefined);
        return result;
      },
    },
  };
}

function completeDraft({ routineId = "problem-snap-atomic", mistakeTypes = ["rounding"] } = {}, completedAt = "2026-06-23T08:30:00.000Z") {
  let draft = createCalculatorRoutineDraft({
    source: "problem-snap",
    examMode: "second",
    subject: "감정평가실무",
    routineId,
    now: "2026-06-23T08:00:00.000Z",
  });
  for (const step of ["conditions", "formula", "numbers_units", "casio_input", "display_value", "answer_value", "unit_rounding"]) {
    draft = updateCalculatorRoutineDraftStep(draft, step, "metadata only", "2026-06-23T08:01:00.000Z");
  }
  return buildCalculatorRoutineBridge("00000000-0000-4000-8000-000000000420", buildCalculatorRoutineCompletionSignal({
    ...draft,
    verificationMethods: ["unit_check"],
    mistakeTypes,
  }, completedAt));
}

function eventFromBridge(bridge, createdAt = "2026-06-23T08:31:00.000Z", completedAt = "2026-06-23T08:30:00.000Z") {
  return {
    ...bridge.learningEventInput,
    id: bridge.learningEventId,
    userId: "00000000-0000-4000-8000-000000000420",
    createdAt,
    metadataJson: {
      ...bridge.learningEventInput.metadataJson,
      completedAt,
    },
  };
}

test("atomic migration adds transition-event dedupe table and RPC without rewriting base migration", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const baseMigration = await readFile("supabase/migrations/20260605_create_personal_concept_nodes.sql", "utf8");

  assert.match(migration, /create table if not exists public\.personal_concept_transition_events/);
  assert.match(migration, /unique \(user_id, event_id\)/);
  assert.match(migration, /input_fingerprint text not null/);
  assert.match(migration, /input_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(migration, /extensions\.digest\(/);
  assert.match(migration, /'sha256'/);
  assert.match(migration, /event_id_payload_mismatch/);
  assert.match(migration, /create or replace function public\.transition_personal_concept_node_v1/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /for update/);
  assert.match(migration, /same_timestamp_different_event/);
  assert.match(migration, /when 'issue' then 'issue spotting'/);
  assert.match(migration, /grant execute .* to authenticated/s);
  assert.match(baseMigration, /create table if not exists public\.personal_concept_nodes/);
});

test("RPC-only boundary migration closes direct authenticated concept-node writes", async () => {
  const migration = await readFile(rpcOnlyBoundaryMigrationPath, "utf8");
  const normalized = migration.replace(/\s+/g, " ").trim().toLowerCase();

  assert.match(normalized, /revoke insert, update on table public\.personal_concept_nodes from authenticated/);
  assert.match(normalized, /grant select, delete on table public\.personal_concept_nodes to authenticated/);
  assert.match(normalized, /drop policy if exists "personal_concept_nodes_insert_own"/);
  assert.match(normalized, /drop policy if exists "personal_concept_nodes_update_own"/);
  assert.match(normalized, /revoke execute on function public\.transition_personal_concept_node_v1\([^)]*timestamptz[^)]*\) from public/);
  assert.match(normalized, /revoke execute on function public\.transition_personal_concept_node_v1\([^)]*timestamptz[^)]*\) from anon/);
  assert.match(normalized, /grant execute on function public\.transition_personal_concept_node_v1\([^)]*timestamptz[^)]*\) to authenticated/);
  assert.doesNotMatch(normalized, /grant[^;]*(insert|update)[^;]*personal_concept_nodes[^;]*authenticated/);
});

test("atomic transition QA doc and package scripts document the gated workflow", async () => {
  const doc = await readFile(docPath, "utf8");
  const pkg = JSON.parse(await readFile("package.json", "utf8"));

  assert.match(doc, /transition_personal_concept_node_v1/);
  assert.match(doc, /personal_concept_transition_events/);
  assert.match(doc, /PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase/);
  assert.match(doc, /PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1/);
  assert.match(doc, /PERSONAL_CONCEPT_GRAPH_ATOMIC_TRANSITION_SMOKE=1/);
  assert.match(doc, /Do not use `npx\.cmd supabase db push --linked --include-all`/);
  assert.match(doc, /event_id_payload_mismatch/);
  assert.match(doc, /transition event audit rows are retained by design/i);
  assert.match(doc, /RPC-only write boundary/i);
  assert.match(doc, /direct authenticated insert\/update grants were revoked/i);
  assert.match(doc, /production durable-write enablement remains blocked/i);
  assert.equal(
    pkg.scripts["check:personal-concept-graph-atomic-transition"],
    "node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/personal-concept-graph-atomic-transition.test.mjs",
  );
  assert.equal(
    pkg.scripts["check:personal-concept-graph-atomic-transition-smoke"],
    "node scripts/verify-personal-concept-graph-atomic-transition.mjs",
  );
  assert.match(pkg.scripts["verify:learner-loop:ci"], /tests\/personal-concept-graph-atomic-transition\.test\.mjs/);
});

test("identical event retry is already_applied and counters do not increment twice", () => {
  resetPersonalConceptGraphRepositoryForTests();
  const first = transitionPersonalConceptNode(transitionInput({ eventId: "event-repeat" }));
  const retry = transitionPersonalConceptNode(transitionInput({ eventId: "event-repeat" }));

  assert.equal(first.status, "applied");
  assert.equal(retry.status, "already_applied");
  assert.equal(retry.node?.wrongCount, 1);
});

test("same event id with a different transition payload is rejected", () => {
  resetPersonalConceptGraphRepositoryForTests();
  const first = transitionPersonalConceptNode(transitionInput({ eventId: "event-replay", result: "wrong" }));
  const mismatch = transitionPersonalConceptNode(transitionInput({ eventId: "event-replay", result: "done", confidence: "medium" }));

  assert.equal(first.status, "applied");
  assert.equal(mismatch.status, "rejected");
  assert.equal(mismatch.reason, "event_id_payload_mismatch");
  assert.equal(mismatch.node?.lastResult, "wrong");
  assert.equal(mismatch.node?.wrongCount, 1);
});

test("duplicate older event after a newer event is already_applied and not a second transition", () => {
  resetPersonalConceptGraphRepositoryForTests();
  const older = transitionPersonalConceptNode(transitionInput({ eventId: "old-event", updatedAt: "2026-06-23T00:00:00.000Z", result: "wrong" }));
  const newer = transitionPersonalConceptNode(transitionInput({ eventId: "new-event", updatedAt: "2026-06-23T00:10:00.000Z", result: "done" }));
  const duplicateOlder = transitionPersonalConceptNode(transitionInput({ eventId: "old-event", updatedAt: "2026-06-23T00:00:00.000Z", result: "wrong" }));

  assert.equal(older.status, "applied");
  assert.equal(newer.status, "applied");
  assert.equal(duplicateOlder.status, "already_applied");
  assert.equal(duplicateOlder.node?.updatedAt, "2026-06-23T00:10:00.000Z");
});

test("delayed unique older event is stale_signal", () => {
  resetPersonalConceptGraphRepositoryForTests();
  transitionPersonalConceptNode(transitionInput({ eventId: "new-first", updatedAt: "2026-06-23T00:10:00.000Z", result: "done" }));
  const delayedOlder = transitionPersonalConceptNode(transitionInput({ eventId: "old-delayed", updatedAt: "2026-06-23T00:00:00.000Z", result: "wrong" }));

  assert.equal(delayedOlder.status, "stale_signal");
  assert.equal(delayedOlder.node?.updatedAt, "2026-06-23T00:10:00.000Z");
});

test("same timestamp same event is already_applied and same timestamp different event is rejected", () => {
  resetPersonalConceptGraphRepositoryForTests();
  const first = transitionPersonalConceptNode(transitionInput({ eventId: "same-ts-event", updatedAt: "2026-06-23T00:00:00.000Z" }));
  const sameEvent = transitionPersonalConceptNode(transitionInput({ eventId: "same-ts-event", updatedAt: "2026-06-23T00:00:00.000Z" }));
  const differentEvent = transitionPersonalConceptNode(transitionInput({ eventId: "same-ts-other", updatedAt: "2026-06-23T00:00:00.000Z" }));

  assert.equal(first.status, "applied");
  assert.equal(sameEvent.status, "already_applied");
  assert.equal(differentEvent.status, "rejected");
  assert.equal(differentEvent.reason, "same_timestamp_different_event");
});

test("first-row concurrent insert produces one concept row and deterministic final state", async () => {
  const repo = createAtomicMockRepository();
  const older = maybeWriteExecutionSignalToConceptGraph(signal({
    eventId: "concurrent-old",
    updatedAt: "2026-06-23T00:00:00.000Z",
    result: "wrong",
  }), { env: enabledWriteEnv, repositoryAdapter: repo.repository });
  const newer = maybeWriteExecutionSignalToConceptGraph(signal({
    eventId: "concurrent-new",
    updatedAt: "2026-06-23T00:10:00.000Z",
    result: "done",
  }), { env: enabledWriteEnv, repositoryAdapter: repo.repository });

  const results = await Promise.all([older, newer]);
  assert.equal(results.filter((result) => result.skipped === false).length, 2);
  assert.equal(repo.stored.updatedAt, "2026-06-23T00:10:00.000Z");
  assert.equal(repo.stored.lastResult, "done");
  assert.equal(repo.calls.transition, 2);
});

test("newer and older events launched concurrently leave newer final state even when older completes last", async () => {
  const initial = updatePersonalConceptNode(null, transitionInput({ eventId: "initial", updatedAt: "2026-06-23T00:00:00.000Z" }));
  const repo = createAtomicMockRepository(initial);
  let releaseOlder;
  const olderDelay = new Promise((resolve) => { releaseOlder = resolve; });
  const repository = {
    mode: "supabase",
    async transitionPersonalConceptNode(input) {
      if (input.eventId === "older-late") await olderDelay;
      return repo.repository.transitionPersonalConceptNode(input);
    },
  };
  const older = maybeWriteExecutionSignalToConceptGraph(signal({
    eventId: "older-late",
    updatedAt: "2026-06-23T00:05:00.000Z",
    result: "wrong",
  }), { env: enabledWriteEnv, repositoryAdapter: repository });
  const newer = maybeWriteExecutionSignalToConceptGraph(signal({
    eventId: "newer-first",
    updatedAt: "2026-06-23T00:10:00.000Z",
    result: "done",
  }), { env: enabledWriteEnv, repositoryAdapter: repository });
  await newer;
  releaseOlder();
  const olderResult = await older;

  assert.equal(olderResult.skipped, true);
  assert.equal(olderResult.reason, "stale_signal");
  assert.equal(repo.stored.updatedAt, "2026-06-23T00:10:00.000Z");
});

test("two different users are isolated by transition identity", () => {
  resetPersonalConceptGraphRepositoryForTests();
  const userA = transitionPersonalConceptNode(transitionInput({ userId: "user-a", eventId: "same-event" }));
  const userB = transitionPersonalConceptNode(transitionInput({ userId: "user-b", eventId: "same-event" }));

  assert.equal(userA.status, "applied");
  assert.equal(userB.status, "applied");
  assert.equal(getPersonalConceptNode("user-a", "first", "civil-law", "unit-1")?.userId, "user-a");
  assert.equal(getPersonalConceptNode("user-b", "first", "civil-law", "unit-1")?.userId, "user-b");
});

test("unsupported and malformed transitions are rejected by SQL contract", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /'unsupported_exam_mode'/);
  assert.match(migration, /'malformed_transition'/);
  assert.match(migration, /'invalid_event_id'/);
  assert.match(migration, /'invalid_occurrence'/);
  assert.match(migration, /'unsupported_result'/);
  assert.match(migration, /'unsupported_confidence'/);
});

test("SQL task alias matrix matches TypeScript concept transition normalization", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const aliases = [
    ["ox", "O/X"],
    ["o/x", "O/X"],
    ["cloze", "cloze"],
    ["accounting", "accounting template"],
    ["accounting_template", "accounting template"],
    ["accounting template", "accounting template"],
    ["rewrite", "rewrite"],
    ["calculator_routine", "calculator_routine"],
    ["casio", "CASIO"],
    ["issue", "issue spotting"],
    ["issue_spotting", "issue spotting"],
    ["issue spotting", "issue spotting"],
  ];

  for (const [input, expected] of aliases) {
    assert.match(migration, new RegExp(`when '${escapeRegExp(input)}' then '${escapeRegExp(expected)}'`));
    assert.equal(normalizeCurriculumTaskType(input), expected);
    const node = updatePersonalConceptNode(null, transitionInput({ taskType: input, result: "done", confidence: "medium" }));
    assert.equal(node.lastTaskType, expected);
  }
});

test("feature flags disabled means repository RPC is not touched", async () => {
  const repo = createAtomicMockRepository();
  const result = await maybeWriteExecutionSignalToConceptGraph(signal(), {
    env: {},
    repositoryAdapter: repo.repository,
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "durable_writes_disabled");
  assert.equal(repo.calls.transition, 0);
});

test("metadata boundary sentinels are absent from SQL inputs, rows, responses, logs, and smoke output", async () => {
  const migration = await readFile(migrationPath, "utf8");
  const script = await readFile(scriptPath, "utf8");
  const serialized = `${migration}\n${script}`;
  for (const forbidden of [
    "rawOcrText",
    "problemText",
    "questionText",
    "answerText",
    "formula",
    "learnerNumbers",
    "casioInput",
    "displayValue",
    "expectedValue",
    "verificationMemo",
    "mistakeMemo",
    "officialAnswer",
    "modelAnswer",
    "scorePrediction",
    "instructorComment",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("existing calculator wrong to recovering to stable behavior remains unchanged", async () => {
  const repo = createAtomicMockRepository();
  const wrongBridge = completeDraft({ routineId: "problem-snap-atomic-calc", mistakeTypes: ["rounding"] }, "2026-06-23T08:30:00.000Z");
  const cleanBridge = completeDraft({ routineId: "problem-snap-atomic-calc", mistakeTypes: ["none"] }, "2026-06-23T08:45:00.000Z");
  const stableBridge = completeDraft({ routineId: "problem-snap-atomic-calc-followup", mistakeTypes: ["none"] }, "2026-06-23T09:00:00.000Z");

  const wrong = await maybeUpdateCalculatorRoutineConceptState({
    userId: "00000000-0000-4000-8000-000000000420",
    bridge: wrongBridge,
    persistedEvent: eventFromBridge(wrongBridge, "2026-06-23T08:31:00.000Z", "2026-06-23T08:30:00.000Z"),
    context: { env: enabledWriteEnv, repositoryAdapter: repo.repository },
  });
  const recovering = await maybeUpdateCalculatorRoutineConceptState({
    userId: "00000000-0000-4000-8000-000000000420",
    bridge: cleanBridge,
    persistedEvent: eventFromBridge(cleanBridge, "2026-06-23T08:46:00.000Z", "2026-06-23T08:45:00.000Z"),
    context: { env: enabledWriteEnv, repositoryAdapter: repo.repository },
  });
  const stable = await maybeUpdateCalculatorRoutineConceptState({
    userId: "00000000-0000-4000-8000-000000000420",
    bridge: stableBridge,
    persistedEvent: eventFromBridge(stableBridge, "2026-06-23T09:01:00.000Z", "2026-06-23T09:00:00.000Z"),
    context: { env: enabledWriteEnv, repositoryAdapter: repo.repository },
  });

  assert.equal(wrong.nextState, "wrong");
  assert.equal(recovering.nextState, "recovering");
  assert.equal(stable.nextState, "stable");
});

test("Today Plan max-three behavior remains unchanged", () => {
  const plan = buildTodayPlanSourceUnion({
    conceptGraphNodes: Array.from({ length: 5 }, (_, index) =>
      updatePersonalConceptNode(null, transitionInput({
        eventId: `plan-${index}`,
        unitId: `unit-${index}`,
        result: index === 0 ? "done" : "wrong",
        updatedAt: `2026-06-23T00:0${index}:00.000Z`,
      })),
    ),
    context: { now: "2026-06-23T01:00:00.000Z", examMode: "first" },
  });

  assert.ok(plan.length <= 3);
  assert.ok(plan.every((item) => item.metadataOnly === true && item.isPrimaryTask === true));
});

test("runtime smoke source fails closed and prints only aggregate statuses", async () => {
  const script = await readFile(scriptPath, "utf8");
  assert.match(script, /PERSONAL_CONCEPT_GRAPH_ATOMIC_TRANSITION_SMOKE/);
  assert.match(script, /refused_missing_personal_concept_graph_atomic_transition_smoke_flag/);
  assert.match(script, /failed_atomic_transition_runtime_missing_public_env/);
  assert.match(script, /failed_atomic_transition_runtime_missing_test_auth/);
  assert.doesNotMatch(script, /skipped_atomic_transition_runtime_due_missing_env/);
  assert.doesNotMatch(script, /process\.exit\(0\)/);
  assert.match(script, /transition_personal_concept_node_v1/);
  assert.match(script, /passed_atomic_transition_runtime_smoke/);
  assert.match(script, /assertFinalConcurrentNode/);
  assert.match(script, /concurrent_final_db_row/);
  assert.match(script, /updated_at/);
  assert.match(script, /last_result/);
  assert.match(script, /wrong_count/);
  assert.match(script, /recovery_count/);
  assert.match(script, /stable_count/);
  assert.match(script, /same_timestamp_different_event/);
  assert.match(script, /event_id_payload_mismatch/);
  assert.match(script, /personal_concept_transition_events/);
  assert.match(script, /transition_event_audit_rows_retained_by_design/);
  assert.match(script, /anonymous_transition_event_read_denied/);
  assert.match(script, /cleanupStatus/);
  assert.doesNotMatch(script, /console\.log\([^)]*accessToken|console\.log\([^)]*userAId|console\.log\([^)]*row/s);
});

test("runtime smoke timestamp comparison accepts equivalent UTC instant formats", () => {
  const expected = "2026-06-23T00:20:00.000Z";

  assert.doesNotThrow(() => assertSameTimestampInstant("2026-06-23T00:20:00.000Z", expected, "same_zulu_instant"));
  assert.doesNotThrow(() => assertSameTimestampInstant("2026-06-23T00:20:00+00:00", expected, "same_offset_instant"));
  assert.doesNotThrow(() => assertSameTimestampInstant("2026-06-23 00:20:00.000000+00", expected, "same_postgres_offset_instant"));
});

test("runtime smoke timestamp comparison rejects malformed or different instants", () => {
  assert.throws(
    () => assertSameTimestampInstant("2026-06-23T00:20:01.000Z", "2026-06-23T00:20:00.000Z", "different_timestamp"),
    /different_timestamp:different_instant/,
  );
  assert.throws(
    () => assertSameTimestampInstant("not-a-timestamp", "2026-06-23T00:20:00.000Z", "malformed_timestamp"),
    /malformed_timestamp:invalid_timestamp/,
  );
});
