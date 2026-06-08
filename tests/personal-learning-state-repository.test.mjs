import test from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryPersonalLearningStateRepository,
  normalizePersonalLearningStateRecord,
  serializePersonalLearningStateDeterministically,
} from "../lib/review-os/personal-learning-state-repository.ts";
import { buildPersonalLearningStateSupabasePayload } from "../lib/review-os/personal-learning-state-supabase-repository.ts";
import {
  getPersonalLearningStateRepository,
  getPersonalLearningStateRepositoryMode,
  isDurablePersonalLearningStateEnabled,
} from "../lib/review-os/personal-learning-state-repository-adapter.ts";
import { maybePersistPersonalLearningStateUpdate } from "../lib/review-os/personal-learning-state-durable-write.ts";

const baseState = {
  userId: "11111111-1111-4111-8111-111111111111",
  conceptNodeId: "first_civil_nullity_rescission",
  examMode: "first",
  subject: "민법",
  status: "wrong",
  previousStatus: "confused",
  wrongCount: 1,
  correctStreak: 0,
  lastSeenAt: "2026-06-08T00:00:00.000Z",
  nextReviewAt: "2026-06-09T00:00:00.000Z",
  lastSourceEventType: "session",
  lastTaskType: "first_ox_retry",
  lastReason: "high_confidence_wrong_answer",
  priorityScore: 88,
  metadata: { version: 1, flags: ["metadataOnly"] },
};

const transition = {
  metadataOnly: true,
  userId: baseState.userId,
  conceptNodeId: baseState.conceptNodeId,
  examMode: "first",
  subject: "민법",
  previousStatus: "confused",
  nextStatus: "wrong",
  reason: "low_confidence_wrong_answer",
  confidenceDelta: -1,
  priorityDelta: 16,
  nextReviewPattern: "retry_then_1_3_7",
  nextReviewAtCandidate: "2026-06-09T00:00:00.000Z",
  sourceEventType: "session",
  safeSummary: "민법 개념 상태: confused → wrong",
};

test("in-memory personal learning state repository stores metadata-only rows", () => {
  const repository = new InMemoryPersonalLearningStateRepository();
  const written = repository.upsertLearningState(baseState);
  assert.equal(written.status, "wrong");
  assert.equal(written.metadata.flags[0], "metadataOnly");
  assert.deepEqual(repository.getLearningState(baseState.userId, baseState.conceptNodeId), written);
  assert.equal(repository.listDueLearningStates(baseState.userId, { now: "2026-06-10T00:00:00.000Z" }).length, 1);
  assert.equal(repository.listLearningStatesByStatus(baseState.userId, "wrong").length, 1);
});

test("personal learning state repository rejects unsupported modes, statuses, and raw fields", () => {
  assert.throws(() => normalizePersonalLearningStateRecord({ ...baseState, examMode: "CPA" }), /unsupported-personal-learning-state-exam-mode/);
  assert.throws(() => normalizePersonalLearningStateRecord({ ...baseState, status: "mastered" }), /unsupported-personal-learning-state-status/);
  assert.throws(() => normalizePersonalLearningStateRecord({ ...baseState, metadata: { rawAnswerText: "must not store" } }), /raw-user-data|forbidden-personal-learning-state-field/);
});

test("supabase personal learning state payload omits generated or missing ids", () => {
  const missingIdPayload = buildPersonalLearningStateSupabasePayload(baseState);
  assert.equal(Object.hasOwn(missingIdPayload, "id"), false);

  const memoryIdPayload = buildPersonalLearningStateSupabasePayload({ ...baseState, id: "memory-pls-1234abcd" });
  assert.equal(Object.hasOwn(memoryIdPayload, "id"), false);

  const uuid = "22222222-2222-4222-8222-222222222222";
  const uuidPayload = buildPersonalLearningStateSupabasePayload({ ...baseState, id: uuid });
  assert.equal(uuidPayload.id, uuid);
});

test("personal learning state repository rejects raw ocr/problem/answer/source/copyright/official/model/score/instructor fields", () => {
  for (const forbiddenKey of [
    "rawOcrText",
    "rawProblemText",
    "rawAnswerText",
    "source",
    "copyrightedText",
    "officialAnswer",
    "modelAnswer",
    "score",
    "instructorComment",
  ]) {
    assert.throws(
      () => buildPersonalLearningStateSupabasePayload({ ...baseState, metadata: { [forbiddenKey]: "must not persist" } }),
      /raw-user-data|forbidden-personal-learning-state-field/,
      `expected ${forbiddenKey} to be rejected`,
    );
  }
});

test("personal learning state serialization is deterministic", () => {
  const timestamps = { createdAt: "2026-06-08T00:00:00.000Z", updatedAt: "2026-06-08T00:00:00.000Z" };
  const left = normalizePersonalLearningStateRecord({ ...baseState, ...timestamps, metadata: { b: 2, a: { d: 4, c: 3 } } });
  const right = normalizePersonalLearningStateRecord({ ...baseState, ...timestamps, metadata: { a: { c: 3, d: 4 }, b: 2 } });
  assert.equal(serializePersonalLearningStateDeterministically(left), serializePersonalLearningStateDeterministically(right));
});

test("personal learning state adapter defaults to memory and requires explicit durable gates", () => {
  assert.equal(getPersonalLearningStateRepositoryMode({}), "memory");
  assert.equal(getPersonalLearningStateRepository({}).mode, "memory");
  assert.equal(getPersonalLearningStateRepositoryMode({ PERSONAL_LEARNING_STATE_REPOSITORY: "supabase" }), "supabase");
  assert.equal(isDurablePersonalLearningStateEnabled({ PERSONAL_LEARNING_STATE_REPOSITORY: "supabase" }), false);
  assert.equal(isDurablePersonalLearningStateEnabled({
    PERSONAL_LEARNING_STATE_REPOSITORY: "supabase",
    PERSONAL_LEARNING_STATE_DURABLE_READS: "1",
    PERSONAL_LEARNING_STATE_DURABLE_WRITES: "1",
  }), true);
});

test("durable write helper skips safely when disabled", async () => {
  const result = await maybePersistPersonalLearningStateUpdate({ transition, env: {} });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "durable_writes_disabled");
});

test("durable write helper can call a supabase repository without an explicit id", async () => {
  let receivedState;
  const generatedUuid = "33333333-3333-4333-8333-333333333333";
  const repository = {
    mode: "supabase",
    async upsertLearningState(state) {
      receivedState = state;
      const payload = buildPersonalLearningStateSupabasePayload(state);
      assert.equal(Object.hasOwn(payload, "id"), false);
      return normalizePersonalLearningStateRecord({ ...state, id: generatedUuid });
    },
    getLearningState() {
      return null;
    },
    listDueLearningStates() {
      return [];
    },
    listLearningStatesByStatus() {
      return [];
    },
  };

  const result = await maybePersistPersonalLearningStateUpdate({
    transition,
    repository,
    env: {
      PERSONAL_LEARNING_STATE_REPOSITORY: "supabase",
      PERSONAL_LEARNING_STATE_DURABLE_WRITES: "1",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(receivedState.id, undefined);
  assert.equal(result.state.id, generatedUuid);
});

test("memory personal learning state repository can still use deterministic memory ids", () => {
  const repository = new InMemoryPersonalLearningStateRepository();
  const first = repository.upsertLearningState(baseState);
  const second = repository.upsertLearningState({ ...baseState, status: "recovering", wrongCount: 0 });

  assert.match(first.id, /^memory-pls-[0-9a-f]{8}$/);
  assert.equal(second.id, first.id);
  assert.equal(second.status, "recovering");
});
