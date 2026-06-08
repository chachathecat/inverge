export const LEARNING_METRIC_EVENT_NAMES = [
  "capture_started",
  "capture_saved",
  "curriculum_node_matched",
  "explanation_quality_evaluated",
  "learning_state_transitioned",
  "adaptive_today_plan_generated",
  "today_plan_task_started",
  "today_plan_task_completed",
  "review_queue_task_completed",
  "confident_wrong_detected",
  "confident_wrong_recovered",
  "weekly_recovered_weak_concepts_computed",
] as const;

export type LearningMetricEventName = (typeof LEARNING_METRIC_EVENT_NAMES)[number];

export type LearningMetricAllowedPropertyKey =
  | "status"
  | "previousStatus"
  | "nextStatus"
  | "confidenceBand"
  | "estimatedMinutes"
  | "actualMinutesBand"
  | "wasDue"
  | "priorityBand"
  | "candidateCount"
  | "selectedCount"
  | "explanationQualityStatus"
  | "explanationQualityScoreBand"
  | "recoveryCount"
  | "retentionWindow"
  | "safeFallbackReason";

export type LearningMetricProperties = Partial<Record<LearningMetricAllowedPropertyKey, string | number | boolean | null>>;

export type LearningMetricEvent = {
  metadataOnly: true;
  eventName: LearningMetricEventName;
  userIdHash?: string;
  userScopedId?: string;
  examMode?: string;
  subject?: string;
  conceptNodeId?: string;
  taskType?: string;
  sourceEventType?: string;
  timestamp: string;
  properties: LearningMetricProperties;
};

export type LearningMetricEventInput = Omit<Partial<LearningMetricEvent>, "metadataOnly" | "eventName" | "timestamp" | "properties"> & {
  eventName: LearningMetricEventName | string;
  timestamp?: string | Date;
  properties?: Record<string, unknown>;
};

export type ClosedBetaMetricsSummary = {
  metadataOnly: true;
  eventCount: number;
  captureCompletionCount: number;
  noteToPlanConversionCount: number;
  curriculumNodeMatchCount: number;
  learningStateTransitionCount: number;
  explanationQualityEvaluationCount: number;
  todayPlanTaskCompletionCount: number;
  reviewCompletionCount: number;
  confidentWrongDetectedCount: number;
  confidentWrongRecoveredCount: number;
  weakConceptRecoveryCount: number;
  retentionProxy: {
    d1CompletedCount: number;
    d7CompletedCount: number;
  };
};

export type WeeklyRecoveredWeakConcepts = {
  metadataOnly: true;
  recoveryCount: number;
  conceptNodeIds: string[];
};

const EVENT_NAME_SET = new Set<string>(LEARNING_METRIC_EVENT_NAMES);
const ALLOWED_PROPERTY_KEYS = new Set<LearningMetricAllowedPropertyKey>([
  "status",
  "previousStatus",
  "nextStatus",
  "confidenceBand",
  "estimatedMinutes",
  "actualMinutesBand",
  "wasDue",
  "priorityBand",
  "candidateCount",
  "selectedCount",
  "explanationQualityStatus",
  "explanationQualityScoreBand",
  "recoveryCount",
  "retentionWindow",
  "safeFallbackReason",
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /rawOcrText/i,
  /rawAnswerText/i,
  /^answerText$/i,
  /problemText/i,
  /questionText/i,
  /sourceText/i,
  /copyrightedText/i,
  /officialAnswer/i,
  /modelAnswer/i,
  /^score$/i,
  /scorePrediction/i,
  /instructorComment/i,
  /payment|billing|checkout|card|invoice/i,
  /token|secret|cookie|authorization|password/i,
];

const FORBIDDEN_KEY_PATTERN = /token|secret|session|cookie|authorization|password/i;
const USER_ID_PATTERN = /^(?:userId|learnerId|email|phone|name)$/i;
const PLAIN_TEXT_RISK_PATTERN = /원문|OCR\s*원문|문제\s*원문|답안\s*원문|official\s+answer|model\s+answer|copyrighted/i;

function normalizeTimestamp(value: string | Date | undefined) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function cleanString(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

function isForbiddenKey(key: string) {
  return FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key)) || FORBIDDEN_KEY_PATTERN.test(key) || USER_ID_PATTERN.test(key);
}

function isSafeScalar(value: unknown): value is string | number | boolean | null {
  if (value === null) return true;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return !PLAIN_TEXT_RISK_PATTERN.test(value) && value.length <= 160;
  return false;
}

export function sanitizeLearningMetricProperties(properties: Record<string, unknown> = {}): LearningMetricProperties {
  const sanitized: LearningMetricProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key as LearningMetricAllowedPropertyKey)) continue;
    if (isForbiddenKey(key)) continue;
    if (!isSafeScalar(value)) continue;
    sanitized[key as LearningMetricAllowedPropertyKey] = value;
  }
  return sanitized;
}

export function assertLearningMetricEventSafe(event: LearningMetricEvent): asserts event is LearningMetricEvent {
  if (event.metadataOnly !== true) throw new Error("learning-metric-event-must-be-metadata-only");
  if (!EVENT_NAME_SET.has(event.eventName)) throw new Error(`unsupported-learning-metric-event:${String(event.eventName)}`);

  const serialized = JSON.stringify(event);
  for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
    if (pattern.test(serialized)) throw new Error(`forbidden-learning-metric-field:${pattern.source}`);
  }

  const disallowedKeys = Object.keys(event.properties ?? {}).filter((key) => !ALLOWED_PROPERTY_KEYS.has(key as LearningMetricAllowedPropertyKey));
  if (disallowedKeys.length > 0) throw new Error(`unsupported-learning-metric-properties:${disallowedKeys.join(",")}`);

  if (event.userIdHash && !/^u_[a-f0-9]{12,128}$/i.test(event.userIdHash)) throw new Error("unsafe-learning-metric-user-id-hash");
  if (event.userScopedId && !/^usr_scoped_[a-z0-9_-]{8,128}$/i.test(event.userScopedId)) throw new Error("unsafe-learning-metric-user-scoped-id");
  if (!Number.isFinite(Date.parse(event.timestamp))) throw new Error("invalid-learning-metric-timestamp");
}

export function buildLearningMetricEvent(input: LearningMetricEventInput): LearningMetricEvent {
  if (!EVENT_NAME_SET.has(String(input.eventName))) throw new Error(`unsupported-learning-metric-event:${String(input.eventName)}`);
  const event: LearningMetricEvent = {
    metadataOnly: true,
    eventName: input.eventName as LearningMetricEventName,
    timestamp: normalizeTimestamp(input.timestamp),
    properties: sanitizeLearningMetricProperties(input.properties),
  };

  for (const key of ["userIdHash", "userScopedId", "examMode", "subject", "conceptNodeId", "taskType", "sourceEventType"] as const) {
    const cleaned = cleanString(input[key]);
    if (cleaned) event[key] = cleaned;
  }

  assertLearningMetricEventSafe(event);
  return event;
}

function eventsOf(events: LearningMetricEvent[], eventName: LearningMetricEventName) {
  return events.filter((event) => event.eventName === eventName);
}

function countRetention(events: LearningMetricEvent[], retentionWindow: "D1" | "D7") {
  return events.filter((event) =>
    (event.eventName === "review_queue_task_completed" || event.eventName === "today_plan_task_completed")
    && event.properties.retentionWindow === retentionWindow
  ).length;
}

export function computeWeeklyRecoveredWeakConcepts(events: LearningMetricEvent[]): WeeklyRecoveredWeakConcepts {
  const conceptNodeIds = [...new Set(events
    .filter((event) => event.eventName === "confident_wrong_recovered" || (event.eventName === "learning_state_transitioned" && event.properties.previousStatus === "confident_wrong" && (event.properties.nextStatus === "recovering" || event.properties.nextStatus === "stable")))
    .map((event) => event.conceptNodeId)
    .filter((conceptNodeId): conceptNodeId is string => typeof conceptNodeId === "string" && conceptNodeId.length > 0))].sort();

  return { metadataOnly: true, recoveryCount: conceptNodeIds.length, conceptNodeIds };
}

export function summarizeClosedBetaMetrics(events: LearningMetricEvent[]): ClosedBetaMetricsSummary {
  for (const event of events) assertLearningMetricEventSafe(event);
  const recovered = computeWeeklyRecoveredWeakConcepts(events);
  return {
    metadataOnly: true,
    eventCount: events.length,
    captureCompletionCount: eventsOf(events, "capture_saved").length,
    noteToPlanConversionCount: eventsOf(events, "adaptive_today_plan_generated").filter((event) => Number(event.properties.selectedCount ?? 0) > 0).length,
    curriculumNodeMatchCount: eventsOf(events, "curriculum_node_matched").length,
    learningStateTransitionCount: eventsOf(events, "learning_state_transitioned").length,
    explanationQualityEvaluationCount: eventsOf(events, "explanation_quality_evaluated").length,
    todayPlanTaskCompletionCount: eventsOf(events, "today_plan_task_completed").length,
    reviewCompletionCount: eventsOf(events, "review_queue_task_completed").length,
    confidentWrongDetectedCount: eventsOf(events, "confident_wrong_detected").length,
    confidentWrongRecoveredCount: eventsOf(events, "confident_wrong_recovered").length,
    weakConceptRecoveryCount: recovered.recoveryCount,
    retentionProxy: {
      d1CompletedCount: countRetention(events, "D1"),
      d7CompletedCount: countRetention(events, "D7"),
    },
  };
}
