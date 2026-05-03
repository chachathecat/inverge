import test from "node:test";
import assert from "node:assert/strict";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

function q(overrides = {}) {
  return {
    queueId: "q1",
    itemId: "i1",
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    problemTitle: "점유취득시효",
    topicTag: "민법",
    mistakeType: "요건 누락",
    reviewReason: "재시도",
    priorityScore: 50,
    dueAt: "2026-05-03T00:00:00.000Z",
    recurrenceCount: 1,
    confidence: "보통",
    timeSpentSeconds: 600,
    createdFromCapture: false,
    itemCreatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

const now = new Date("2026-05-03T12:00:00.000Z");

test("overdue item outranks normal item", () => {
  const tasks = buildTodayPlanTasks({ mode: "first", now, queue: [q({ itemId: "future", dueAt: "2026-05-05T00:00:00.000Z" }), q({ itemId: "overdue", dueAt: "2026-05-01T00:00:00.000Z" })] });
  assert.equal(tasks[0].itemId, "overdue");
});

test("recent capture item gets bounded boost", () => {
  const tasks = buildTodayPlanTasks({ mode: "first", now, queue: [q({ itemId: "capture", createdFromCapture: true, itemCreatedAt: "2026-05-03T10:30:00.000Z", dueAt: "2026-05-04T00:00:00.000Z" }), q({ itemId: "plain", dueAt: "2026-05-04T00:00:00.000Z" })] });
  assert.equal(tasks[0].itemId, "capture");
});

test("future due capture item does not get false boost", () => {
  const tasks = buildTodayPlanTasks({ mode: "first", now, queue: [q({ itemId: "old-capture", createdFromCapture: true, itemCreatedAt: "2026-04-20T00:00:00.000Z", dueAt: "2026-05-04T00:00:00.000Z" }), q({ itemId: "plain", dueAt: "2026-05-04T00:00:00.000Z", priorityScore: 70 })] });
  assert.equal(tasks[0].itemId, "plain");
});

test("low confidence and repeated mistake get boosts; rewrite task surfaced", () => {
  const tasks = buildTodayPlanTasks({ mode: "second", now, queue: [q({ itemId: "low", confidence: "낮음", dueAt: "2026-05-04T00:00:00.000Z" }), q({ itemId: "repeat", recurrenceCount: 4, dueAt: "2026-05-04T00:00:00.000Z" }), q({ itemId: "rewrite", reviewReason: "rewrite 후속", mistakeType: "논점 누락", dueAt: "2026-05-04T00:00:00.000Z" }), q({ itemId: "base", dueAt: "2026-05-04T00:00:00.000Z" })] });
  assert.ok(tasks.some((t) => t.itemId === "rewrite" && t.task_type === "rewrite"));
  assert.ok(tasks.some((t) => t.itemId === "low"));
  assert.ok(tasks.some((t) => t.itemId === "repeat"));
  assert.ok(tasks.length <= 3);
  assert.ok(tasks.every((t) => !/공식 점수|모범답안|채점 확정/.test(`${t.reason} ${t.one_next_action}`)));
});
