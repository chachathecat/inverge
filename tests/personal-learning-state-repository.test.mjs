import test from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryPersonalLearningStateRepository,
  normalizePersonalLearningStateRecord,
  serializePersonalLearningStateDeterministically,
} from "../lib/review-os/personal-learning-state-repository.ts";
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

test("personal learning state serialization is deterministic", () => {
  const left = normalizePersonalLearningStateRecord({ ...baseState, metadata: { b: 2, a: { d: 4, c: 3 } } });
  const right = normalizePersonalLearningStateRecord({ ...baseState, metadata: { a: { c: 3, d: 4 }, b: 2 } });
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
