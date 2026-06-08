import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLearningMetricEventSafe,
  buildLearningMetricEvent,
  computeWeeklyRecoveredWeakConcepts,
  sanitizeLearningMetricProperties,
  summarizeClosedBetaMetrics,
} from "../lib/review-os/learning-metrics.ts";
import {
  clearRecordedLearningMetricsForTest,
  getRecordedLearningMetricsForTest,
  isLearningMetricsEnabled,
  recordLearningMetricIfEnabled,
} from "../lib/review-os/learning-metrics-sink.ts";

test("learning metric builder strips forbidden fields and keeps metadata only", () => {
  const event = buildLearningMetricEvent({
    eventName: "capture_saved",
    examMode: "first",
    subject: "민법",
    conceptNodeId: "civil-nullity",
    taskType: "O/X",
    properties: {
      status: "saved",
      confidenceBand: "high",
      rawOcrText: "문제 원문",
      answerText: "답안 원문",
      score: 100,
      token: "secret",
      extra: "ignored",
    },
  });

  assert.equal(event.metadataOnly, true);
  assert.deepEqual(event.properties, { status: "saved", confidenceBand: "high" });
  assertLearningMetricEventSafe(event);
  assert.doesNotMatch(JSON.stringify(event), /rawOcrText|answerText|score|token|secret|문제 원문|답안 원문/i);
});

test("summary computes closed beta activation, review, recovery, and retention proxies", () => {
  const events = [
    buildLearningMetricEvent({ eventName: "capture_saved", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity" }),
    buildLearningMetricEvent({ eventName: "curriculum_node_matched", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { candidateCount: 2, selectedCount: 1 } }),
    buildLearningMetricEvent({ eventName: "explanation_quality_evaluated", examMode: "first", properties: { explanationQualityStatus: "pass", explanationQualityScoreBand: "90_100" } }),
    buildLearningMetricEvent({ eventName: "learning_state_transitioned", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { previousStatus: "confident_wrong", nextStatus: "recovering" } }),
    buildLearningMetricEvent({ eventName: "adaptive_today_plan_generated", examMode: "first", properties: { candidateCount: 3, selectedCount: 2 } }),
    buildLearningMetricEvent({ eventName: "today_plan_task_completed", examMode: "first", conceptNodeId: "civil-nullity", properties: { status: "completed", retentionWindow: "D1" } }),
    buildLearningMetricEvent({ eventName: "review_queue_task_completed", examMode: "first", conceptNodeId: "civil-nullity", properties: { status: "completed", retentionWindow: "D7", wasDue: true } }),
    buildLearningMetricEvent({ eventName: "confident_wrong_recovered", examMode: "first", conceptNodeId: "civil-nullity", properties: { previousStatus: "confident_wrong", nextStatus: "stable" } }),
  ];

  const weekly = computeWeeklyRecoveredWeakConcepts(events);
  const summary = summarizeClosedBetaMetrics(events);

  assert.deepEqual(weekly, { metadataOnly: true, recoveryCount: 1, conceptNodeIds: ["civil-nullity"] });
  assert.equal(summary.captureCompletionCount, 1);
  assert.equal(summary.noteToPlanConversionCount, 1);
  assert.equal(summary.reviewCompletionCount, 1);
  assert.equal(summary.weakConceptRecoveryCount, 1);
  assert.deepEqual(summary.retentionProxy, { d1CompletedCount: 1, d7CompletedCount: 1 });
});

test("metrics sink is disabled by default and records only when explicitly enabled", () => {
  clearRecordedLearningMetricsForTest();
  const previousEnabled = process.env.LEARNING_METRICS_ENABLED;
  const previousTestSink = process.env.LEARNING_METRICS_TEST_SINK;
  delete process.env.LEARNING_METRICS_ENABLED;
  process.env.LEARNING_METRICS_TEST_SINK = "1";

  const event = buildLearningMetricEvent({ eventName: "capture_started", examMode: "first" });
  assert.equal(isLearningMetricsEnabled(), false);
  assert.equal(recordLearningMetricIfEnabled(event).recorded, false);
  assert.equal(getRecordedLearningMetricsForTest().length, 0);

  process.env.LEARNING_METRICS_ENABLED = "1";
  assert.equal(recordLearningMetricIfEnabled(event).recorded, true);
  assert.equal(getRecordedLearningMetricsForTest().length, 1);

  if (previousEnabled === undefined) delete process.env.LEARNING_METRICS_ENABLED;
  else process.env.LEARNING_METRICS_ENABLED = previousEnabled;
  if (previousTestSink === undefined) delete process.env.LEARNING_METRICS_TEST_SINK;
  else process.env.LEARNING_METRICS_TEST_SINK = previousTestSink;
});

test("sanitizer allows only closed-beta property allowlist", () => {
  assert.deepEqual(sanitizeLearningMetricProperties({
    status: "completed",
    previousStatus: "wrong",
    nextStatus: "stable",
    retentionWindow: "D7",
    safeFallbackReason: "not_enough_metadata",
    modelAnswer: "forbidden",
    instructorComment: "forbidden",
    paymentPlan: "forbidden",
    unsupported: true,
  }), {
    status: "completed",
    previousStatus: "wrong",
    nextStatus: "stable",
    retentionWindow: "D7",
    safeFallbackReason: "not_enough_metadata",
  });
});
