import test from "node:test";
import assert from "node:assert/strict";

import { resolveAdaptiveReviewSchedule } from "../lib/review-os/scheduling.ts";

const now = new Date("2026-05-22T00:00:00.000Z");

test("low confidence repeated first mistake schedules earlier", () => {
  const result = resolveAdaptiveReviewSchedule({
    mode: "first",
    confidence: "낮음",
    recurrenceCount: 3,
    mistakeType: "조건 누락",
    taskType: "retry",
    now,
  });
  assert.equal(result.nextReviewDate, "2026-05-23");
});

test("second missing issue schedules earlier", () => {
  const result = resolveAdaptiveReviewSchedule({
    mode: "second",
    confidence: "중간",
    recurrenceCount: 1,
    mistakeType: "논점 누락",
    taskType: "rewrite",
    completedAction: "second_paragraph_rewrite",
    now,
  });
  assert.equal(result.nextReviewDate, "2026-05-24");
});

test("high confidence stable schedules later", () => {
  const result = resolveAdaptiveReviewSchedule({
    mode: "second",
    confidence: "높음",
    recurrenceCount: 1,
    mistakeType: "사실관계 연결",
    taskType: "rewrite",
    completedAction: "second_paragraph_rewrite",
    rewriteComparisonRisk: "안정",
    now,
  });
  assert.equal(result.nextReviewDate, "2026-05-26");
});

test("explanation is short Korean and avoids grading claims", () => {
  const result = resolveAdaptiveReviewSchedule({
    mode: "first",
    confidence: "높음",
    recurrenceCount: 1,
    mistakeType: "단위 실수",
    taskType: "review",
    trapCardsCompleted: true,
    now,
  });
  assert.ok(result.explanation.length <= 40);
  assert.ok(/[가-힣]/.test(result.explanation));
  assert.equal(/합격|불합격|정답|오답|판정/.test(result.explanation), false);
});
