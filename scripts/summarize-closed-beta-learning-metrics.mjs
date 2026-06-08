#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const moduleUrl = pathToFileURL(resolve(repoRoot, "lib/review-os/learning-metrics.ts")).href;
const sinkUrl = pathToFileURL(resolve(repoRoot, "lib/review-os/learning-metrics-sink.ts")).href;

const {
  assertLearningMetricEventSafe,
  buildLearningMetricEvent,
  computeWeeklyRecoveredWeakConcepts,
  summarizeClosedBetaMetrics,
} = await import(moduleUrl);
const { isLearningMetricsEnabled } = await import(sinkUrl);

function loadEvents() {
  const fixturePath = process.argv[2];
  if (fixturePath) return JSON.parse(readFileSync(resolve(process.cwd(), fixturePath), "utf8"));
  return [
    buildLearningMetricEvent({ eventName: "capture_started", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", timestamp: "2026-06-01T00:00:00.000Z" }),
    buildLearningMetricEvent({ eventName: "capture_saved", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", timestamp: "2026-06-01T00:01:00.000Z", properties: { status: "saved", rawOcrText: "removed" } }),
    buildLearningMetricEvent({ eventName: "curriculum_node_matched", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { candidateCount: 3, selectedCount: 1 } }),
    buildLearningMetricEvent({ eventName: "explanation_quality_evaluated", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { explanationQualityStatus: "pass", explanationQualityScoreBand: "90_100", score: 100 } }),
    buildLearningMetricEvent({ eventName: "learning_state_transitioned", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { previousStatus: "confident_wrong", nextStatus: "recovering" } }),
    buildLearningMetricEvent({ eventName: "adaptive_today_plan_generated", examMode: "first", subject: "민법", properties: { candidateCount: 4, selectedCount: 2 } }),
    buildLearningMetricEvent({ eventName: "today_plan_task_completed", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", taskType: "O/X", properties: { status: "completed", retentionWindow: "D1", actualMinutesBand: "5_10" } }),
    buildLearningMetricEvent({ eventName: "review_queue_task_completed", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", taskType: "review", properties: { status: "completed", wasDue: true, retentionWindow: "D7" } }),
    buildLearningMetricEvent({ eventName: "confident_wrong_detected", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { confidenceBand: "high" } }),
    buildLearningMetricEvent({ eventName: "confident_wrong_recovered", examMode: "first", subject: "민법", conceptNodeId: "civil-nullity", properties: { previousStatus: "confident_wrong", nextStatus: "stable" } }),
  ];
}

const events = loadEvents().map((event) => buildLearningMetricEvent(event));
for (const event of events) assertLearningMetricEventSafe(event);
const weekly = computeWeeklyRecoveredWeakConcepts(events);
const summary = summarizeClosedBetaMetrics(events);

const verified = [
  "metadata_only_events",
  "forbidden_fields_removed",
  "weekly_recovered_weak_concepts_computed",
  "retention_proxy_supported",
  "metrics_disabled_by_default",
];

if (events.some((event) => event.metadataOnly !== true)) throw new Error("metadata-only verification failed");
if (JSON.stringify(events).match(/rawOcrText|score\b|answerText|problemText|questionText|officialAnswer|modelAnswer|payment|token|secret|session/i)) throw new Error("forbidden field verification failed");
if (weekly.recoveryCount < 1) throw new Error("weekly recovery verification failed");
if (summary.retentionProxy.d1CompletedCount < 1 || summary.retentionProxy.d7CompletedCount < 1) throw new Error("retention proxy verification failed");
if (isLearningMetricsEnabled()) throw new Error("metrics must be disabled by default for this check");

console.log(JSON.stringify({ status: "passed_closed_beta_learning_metrics", verified }, null, 2));
