import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildConceptGraphUpdateFromExecutionSignal,
  rankConceptGraphNodesForToday,
  updatePersonalConceptNode,
} from "../lib/review-os/personal-concept-graph.ts";

const now = "2026-06-05T00:00:00.000Z";

function signal(overrides = {}) {
  return {
    userId: "opaque-user-1",
    examMode: "first",
    subjectId: "civil-law",
    unitId: "unit-1",
    taskType: "O/X",
    result: "wrong",
    confidence: "medium",
    updatedAt: now,
    ...overrides,
  };
}

function textOf(value) {
  return JSON.stringify(value);
}

test("raw text fields are rejected", () => {
  assert.throws(
    () => updatePersonalConceptNode(null, signal({ problemText: "raw copyrighted problem" })),
    /Raw text field is not accepted/,
  );
  assert.throws(
    () => buildConceptGraphUpdateFromExecutionSignal({ ...signal(), executionSource: "capture", derivedStatus: "needs_review", reviewDueHint: "tomorrow", prioritySignals: [], feedbackCopy: "", rawOcrText: "raw" }),
    /Raw text field is not accepted/,
  );
});

test("wrong O/X creates wrong or confused state", () => {
  const wrong = updatePersonalConceptNode(null, signal({ result: "wrong", confidence: "medium" }));
  const confused = updatePersonalConceptNode(null, signal({ result: "wrong", confidence: "low" }));

  assert.equal(wrong.state, "wrong");
  assert.equal(confused.state, "confused");
  assert.equal(wrong.nextRecommendedTaskType, "O/X");
  assert.equal(wrong.metadataOnly, true);
});

test("correct after wrong creates recovering", () => {
  const wrong = updatePersonalConceptNode(null, signal({ result: "wrong" }));
  const recovering = updatePersonalConceptNode(wrong, signal({ result: "correct", confidence: "high" }));

  assert.equal(recovering.state, "recovering");
  assert.equal(recovering.recoveryCount, 1);
});

test("repeated correct creates stable", () => {
  const wrong = updatePersonalConceptNode(null, signal({ result: "wrong" }));
  const recovering = updatePersonalConceptNode(wrong, signal({ result: "correct", confidence: "high" }));
  const stable = updatePersonalConceptNode(recovering, signal({ result: "correct", confidence: "high" }));

  assert.equal(stable.state, "stable");
  assert.equal(stable.stableCount, 1);
});

test("needs_rewrite creates rewrite-oriented recommendation", () => {
  const node = updatePersonalConceptNode(null, signal({ examMode: "second", taskType: "rewrite", result: "needs_rewrite", confidence: "medium" }));
  const [recommendation] = rankConceptGraphNodesForToday([node], { now: "2026-06-07T00:00:00.000Z" });

  assert.equal(node.nextRecommendedTaskType, "rewrite");
  assert.match(textOf(recommendation), /다시쓰기|다시 쓰/);
  assert.doesNotMatch(textOf(recommendation), /O\/X/);
});

test("calculator routine concept keeps calculator recovery task type and copy", () => {
  const wrong = updatePersonalConceptNode(null, signal({
    examMode: "second",
    subjectId: "감정평가실무",
    unitId: "concept:second:감정평가실무:검산-CASIO",
    taskType: "calculator_routine",
    result: "wrong",
    confidence: "medium",
  }));
  const stable = updatePersonalConceptNode(wrong, signal({
    examMode: "second",
    subjectId: "감정평가실무",
    unitId: "concept:second:감정평가실무:검산-CASIO",
    taskType: "calculator_routine",
    result: "done",
    confidence: "medium",
    updatedAt: "2026-06-06T00:00:00.000Z",
  }));
  const [recommendation] = rankConceptGraphNodesForToday([stable], { now: "2026-06-07T00:00:00.000Z" });

  assert.equal(wrong.nextRecommendedTaskType, "calculator_routine");
  assert.equal(stable.nextRecommendedTaskType, "calculator_routine");
  assert.equal(recommendation.taskType, "calculator_routine");
  assert.match(recommendation.title, /계산·검산|검산\/CASIO/);
  assert.equal(recommendation.primaryAction, "계산·검산 다시 하기");
  assert.ok(recommendation.prioritySignals.includes("calculator_routine"));
  assert.equal(textOf(recommendation).includes("second_answer_rewrite"), false);
  assert.equal(textOf(recommendation).includes("O/X"), false);
});

test("due and missed items become recovery copy, not shame copy", () => {
  const node = updatePersonalConceptNode(null, signal({ result: "missed_due", dueBucket: "missed", recentMissCount: 2 }));
  const [recommendation] = rankConceptGraphNodesForToday([node], {
    now: "2026-06-07T00:00:00.000Z",
    recentMissCountByUnitId: { "unit-1": 2 },
  });

  assert.equal(node.state, "recovering");
  assert.ok(recommendation.prioritySignals.includes("recovery_needed"));
  assert.match(textOf(recommendation), /복구 신호/);
  assert.doesNotMatch(textOf(recommendation), /게으름|실패자|망했|불합격\s*확정|순위\s*하락/);
});

test("Today recommendations max 3", () => {
  const nodes = Array.from({ length: 5 }, (_, index) =>
    updatePersonalConceptNode(null, signal({ unitId: `unit-${index}`, result: index % 2 === 0 ? "wrong" : "unknown" })),
  );
  const recommendations = rankConceptGraphNodesForToday(nodes, { now: "2026-06-07T00:00:00.000Z" });

  assert.equal(recommendations.length, 3);
  assert.ok(recommendations.every((entry) => entry.isPrimaryTask && entry.metadataOnly));
});

test("only 감정평가사 1차/2차 are accepted", () => {
  assert.doesNotThrow(() => updatePersonalConceptNode(null, signal({ examMode: "first" })));
  assert.doesNotThrow(() => updatePersonalConceptNode(null, signal({ examMode: "second", taskType: "rewrite", result: "needs_rewrite" })));
  assert.throws(() => updatePersonalConceptNode(null, signal({ examMode: "cpa" })), /감정평가사 1차\/2차|supports only/);
});

test("no official grading, score, or model-answer claims appear", async () => {
  const source = await readFile(new URL("../lib/review-os/personal-concept-graph.ts", import.meta.url), "utf8");
  const node = updatePersonalConceptNode(null, signal({ result: "wrong" }));
  const recommendations = rankConceptGraphNodesForToday([node], { now: "2026-06-07T00:00:00.000Z" });
  const combined = `${textOf(recommendations)}\n${source}`;

  assert.doesNotMatch(combined, /공식\s*채점|공식\s*점수\s*예측|공식\s*모범\s*답안/);
  assert.doesNotMatch(textOf(recommendations), /official grading|official score|official model answer/i);
});
