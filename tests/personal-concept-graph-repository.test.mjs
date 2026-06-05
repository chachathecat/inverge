import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import {
  applyExecutionSignalToPersonalConceptGraph,
  getPersonalConceptGraphPersistenceNote,
  getPersonalConceptNode,
  listPersonalConceptNodesForToday,
  resetPersonalConceptGraphRepositoryForTests,
  upsertPersonalConceptNode,
} from "../lib/review-os/personal-concept-graph-repository.ts";

const now = "2026-06-05T00:00:00.000Z";

function execution(overrides = {}) {
  return {
    userId: "opaque-user-1",
    examMode: "first",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "unit-1",
    unitName: "권리 변동",
    taskType: "O/X",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "medium",
    daysUntilExam: 14,
    updatedAt: now,
    ...overrides,
  };
}

function signal(overrides = {}) {
  return { ...buildLearningSignalFromExecutionResult(execution(overrides)), userId: overrides.userId ?? "opaque-user-1", updatedAt: overrides.updatedAt ?? now };
}

test.beforeEach(() => resetPersonalConceptGraphRepositoryForTests());

test("documents in-memory adapter while production persistence is pending", () => {
  assert.match(getPersonalConceptGraphPersistenceNote(), /in-memory\/test adapter/i);
  assert.match(getPersonalConceptGraphPersistenceNote(), /production durable persistence is pending/i);
});

test("execution signal updates or creates a PersonalConceptNode", () => {
  const node = applyExecutionSignalToPersonalConceptGraph(signal());
  const saved = getPersonalConceptNode("opaque-user-1", "first", "civil-law", "unit-1");

  assert.equal(node.metadataOnly, true);
  assert.equal(node.state, "wrong");
  assert.equal(saved?.id, node.id);
});

test("repeated execution updates the same node, not duplicates", () => {
  const first = applyExecutionSignalToPersonalConceptGraph(signal({ result: "wrong" }));
  const second = applyExecutionSignalToPersonalConceptGraph(signal({ result: "unknown", confidence: "low", updatedAt: "2026-06-06T00:00:00.000Z" }));
  const nodes = listPersonalConceptNodesForToday("opaque-user-1", { examMode: "first", now: "2026-06-06T00:00:00.000Z" });

  assert.equal(first.id, second.id);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].wrongCount, 2);
  assert.equal(nodes[0].state, "confused");
});

test("wrong or unknown moves node to wrong/confused", () => {
  const wrong = applyExecutionSignalToPersonalConceptGraph(signal({ unitId: "wrong-unit", result: "wrong", confidence: "medium" }));
  const confused = applyExecutionSignalToPersonalConceptGraph(signal({ unitId: "unknown-unit", result: "unknown", confidence: "low" }));

  assert.equal(wrong.state, "wrong");
  assert.equal(confused.state, "confused");
});

test("correct after wrong moves node to recovering and repeated correct moves to stable", () => {
  applyExecutionSignalToPersonalConceptGraph(signal({ result: "wrong", confidence: "medium" }));
  const recovering = applyExecutionSignalToPersonalConceptGraph(signal({ result: "done", confidence: "high", updatedAt: "2026-06-06T00:00:00.000Z" }));
  const stable = applyExecutionSignalToPersonalConceptGraph(signal({ result: "done", confidence: "high", updatedAt: "2026-06-07T00:00:00.000Z" }));

  assert.equal(recovering.state, "recovering");
  assert.equal(stable.state, "stable");
  assert.equal(stable.stableCount, 1);
});

test("needs_rewrite creates rewrite recommendation", () => {
  const node = applyExecutionSignalToPersonalConceptGraph(signal({ examMode: "second", taskType: "rewrite", result: "needs_rewrite", confidence: "medium" }));

  assert.equal(node.state, "wrong");
  assert.equal(node.nextRecommendedTaskType, "rewrite");
});

test("raw OCR/problem/answer fields are rejected", () => {
  assert.throws(() => applyExecutionSignalToPersonalConceptGraph({ ...signal(), rawOcrText: "raw" }), /Raw text field is not accepted/);
  assert.throws(() => upsertPersonalConceptNode({ ...applyExecutionSignalToPersonalConceptGraph(signal()), answerText: "raw" }), /Raw text field is not accepted/);
  assert.throws(() => upsertPersonalConceptNode({ ...applyExecutionSignalToPersonalConceptGraph(signal()), sourceText: "raw" }), /Raw text field is not accepted/);
});

test("only 감정평가사 1차/2차 accepted", () => {
  assert.throws(() => applyExecutionSignalToPersonalConceptGraph({ ...signal(), examMode: "cpa" }), /감정평가사 1차\/2차|supports only/);
  assert.throws(() => listPersonalConceptNodesForToday("opaque-user-1", { examMode: "sat" }), /감정평가사 1차\/2차|supports only/);
});

test("repository source does not invent Supabase schema or migrations", async () => {
  const source = await readFile(new URL("../lib/review-os/personal-concept-graph-repository.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\("personal_concept|create\s+table|migration/i);
});
