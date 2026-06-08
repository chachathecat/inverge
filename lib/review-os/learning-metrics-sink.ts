import type { LearningMetricEvent } from "./learning-metrics";
import { assertLearningMetricEventSafe } from "./learning-metrics";

const memorySink: LearningMetricEvent[] = [];

function runtimeEnv(name: string) {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

function isDevOrTestRuntime() {
  const nodeEnv = runtimeEnv("NODE_ENV");
  return nodeEnv === "test" || nodeEnv === "development" || runtimeEnv("LEARNING_METRICS_TEST_SINK") === "1";
}

export function isLearningMetricsEnabled() {
  return runtimeEnv("LEARNING_METRICS_ENABLED") === "1";
}

export function recordLearningMetric(event: LearningMetricEvent) {
  assertLearningMetricEventSafe(event);
  if (isDevOrTestRuntime()) memorySink.push(event);
  return { recorded: true, metadataOnly: true as const };
}

export function recordLearningMetricIfEnabled(event: LearningMetricEvent) {
  if (!isLearningMetricsEnabled()) return { recorded: false, metadataOnly: true as const, reason: "learning_metrics_disabled" as const };
  return recordLearningMetric(event);
}

export function getRecordedLearningMetricsForTest() {
  return [...memorySink];
}

export function clearRecordedLearningMetricsForTest() {
  memorySink.length = 0;
}
