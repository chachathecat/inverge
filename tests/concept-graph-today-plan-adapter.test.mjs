import test from "node:test";
import assert from "node:assert/strict";

import { buildTodayPlanFromConceptGraphNodes } from "../lib/review-os/concept-graph-today-plan-adapter.ts";
import { updatePersonalConceptNode } from "../lib/review-os/personal-concept-graph.ts";

const now = "2026-06-05T00:00:00.000Z";

function makeNode(unitId, overrides = {}) {
  return updatePersonalConceptNode(null, {
    userId: "opaque-user-1",
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

function textOf(value) {
  return JSON.stringify(value);
}

test("Today Plan from concept graph returns max 3 primary metadata-only actions", () => {
  const nodes = Array.from({ length: 5 }, (_, index) => makeNode(`unit-${index}`, { result: index % 2 === 0 ? "wrong" : "unknown", confidence: index % 2 === 0 ? "medium" : "low" }));
  const plan = buildTodayPlanFromConceptGraphNodes(nodes, { now: "2026-06-07T00:00:00.000Z" });

  assert.equal(plan.length, 3);
  assert.ok(plan.every((item) => item.isPrimaryTask === true));
  assert.ok(plan.every((item) => item.metadataOnly === true));
  assert.ok(plan.every((item) => item.source === "personal_concept_graph"));
});

test("priority uses due review, weak nodes, risk, importance, exam proximity, and recent missed tasks", () => {
  const stable = makeNode("stable-unit", { result: "done", confidence: "high" });
  const wrong = makeNode("wrong-unit", { result: "wrong" });
  const confused = makeNode("confused-unit", { result: "unknown", confidence: "low" });
  const recovering = makeNode("recovering-unit", { result: "missed_due", dueBucket: "missed", recentMissCount: 1 });

  const plan = buildTodayPlanFromConceptGraphNodes([stable, wrong, confused, recovering], {
    now: "2026-06-07T00:00:00.000Z",
    highRiskUnitIds: ["wrong-unit"],
    highImportanceUnitIds: ["confused-unit"],
    daysUntilExam: 7,
    recentMissCountByUnitId: { "recovering-unit": 2 },
  });
  const signals = plan.flatMap((item) => item.prioritySignals);

  assert.equal(plan.length, 3);
  assert.ok(signals.includes("due_review"));
  assert.ok(signals.includes("wrong_concept"));
  assert.ok(signals.includes("confused_concept"));
  assert.ok(signals.includes("high_risk_unit"));
  assert.ok(signals.includes("high_importance_unit"));
  assert.ok(signals.includes("exam_proximity"));
  assert.ok(signals.includes("recent_missed_tasks"));
});

test("missed/due creates recovery copy without shame language", () => {
  const node = makeNode("missed-unit", { result: "missed_due", dueBucket: "missed", recentMissCount: 2 });
  const [item] = buildTodayPlanFromConceptGraphNodes([node], {
    now: "2026-06-07T00:00:00.000Z",
    recentMissCountByUnitId: { "missed-unit": 2 },
  });

  assert.match(textOf(item), /복구 신호/);
  assert.doesNotMatch(textOf(item), /게으름|실패자|망했|불합격\s*확정|순위\s*하락|지금\s*안\s*하면\s*끝/);
});

test("raw OCR/problem/answer fields are rejected and never emitted", () => {
  const node = makeNode("safe-unit");
  assert.throws(() => buildTodayPlanFromConceptGraphNodes([{ ...node, problemText: "raw" }], { now }), /Raw text field is not accepted/);
  const [item] = buildTodayPlanFromConceptGraphNodes([node], { now });
  assert.doesNotMatch(textOf(item), /rawOcrText|problemText|questionText|answerText|copyrightedText|originalText|fullText|sourceText/);
});

test("no official grading, score, or model-answer claims appear", () => {
  const itemText = textOf(buildTodayPlanFromConceptGraphNodes([makeNode("safe-unit")], { now: "2026-06-07T00:00:00.000Z" }));

  assert.doesNotMatch(itemText, /공식\s*채점|공식\s*점수\s*예측|공식\s*모범\s*답안/);
  assert.doesNotMatch(itemText, /official grading|official score|official model answer/i);
});

test("only 감정평가사 1차/2차 accepted", () => {
  const unsafe = { ...makeNode("safe-unit"), examMode: "toefl" };
  assert.throws(() => buildTodayPlanFromConceptGraphNodes([unsafe], { now }), /감정평가사 1차\/2차|supports only/);
});
