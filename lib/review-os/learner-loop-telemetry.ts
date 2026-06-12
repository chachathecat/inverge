import {
  CAPTURE_NOTE_ALLOWED_TASK_TYPES,
  normalizeCaptureNoteTaskType,
  type CaptureNoteQualityExamMode,
} from "./capture-note-quality";
import {
  REVIEW_QUEUE_REFLECTION_REASON_CODES,
  type ReviewQueueReflectionReasonCode,
} from "./review-queue-reflection";
import {
  TODAY_PLAN_REASON_CODES,
  type TodayPlanReasonCode,
} from "./today-plan-source-reasoning";

export const LEARNER_LOOP_TELEMETRY_EVENT_NAMES = [
  "capture_submitted",
  "capture_note_created",
  "biggest_gap_identified",
  "next_action_created",
  "today_plan_generated",
  "today_plan_task_selected",
  "review_queue_item_created",
  "review_queue_item_due",
  "review_completed",
  "notes_reflected",
  "loop_closed",
] as const;

export const LEARNER_LOOP_TELEMETRY_LOOP_STAGES = [
  "capture",
  "note",
  "gap",
  "next_action",
  "today_plan",
  "review_queue",
  "review",
  "notes",
  "loop",
] as const;

export const LEARNER_LOOP_TELEMETRY_SOURCE_TYPES = [
  "capture_note",
  "today_plan_task",
  "review_queue",
  "notes",
  "local_beta_signal",
  "synthetic_fixture",
] as const;

export const LEARNER_LOOP_TELEMETRY_PERSISTENCE_STATUSES = [
  "durable_saved",
  "local_fallback_saved",
  "save_failed",
  "not_applicable",
] as const;

export const LEARNER_LOOP_TELEMETRY_USER_SCOPES = [
  "anonymous_local",
  "invited_beta_account",
] as const;

export const REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES = [
  "capture_note_created",
  "biggest_gap_identified",
  "next_action_created",
  "today_plan_task_selected",
  "review_queue_item_created",
  "notes_reflected",
] as const;

export const LEARNER_LOOP_TELEMETRY_TASK_TYPES = [
  ...CAPTURE_NOTE_ALLOWED_TASK_TYPES,
  "not_applicable",
] as const;

export type LearnerLoopTelemetryEventName = (typeof LEARNER_LOOP_TELEMETRY_EVENT_NAMES)[number];
export type LearnerLoopTelemetryLoopStage = (typeof LEARNER_LOOP_TELEMETRY_LOOP_STAGES)[number];
export type LearnerLoopTelemetrySourceType = (typeof LEARNER_LOOP_TELEMETRY_SOURCE_TYPES)[number];
export type LearnerLoopTelemetryPersistenceStatus = (typeof LEARNER_LOOP_TELEMETRY_PERSISTENCE_STATUSES)[number];
export type LearnerLoopTelemetryUserScope = (typeof LEARNER_LOOP_TELEMETRY_USER_SCOPES)[number];
export type LearnerLoopTelemetryTaskType = (typeof LEARNER_LOOP_TELEMETRY_TASK_TYPES)[number];
export type LearnerLoopTelemetryReasonCode = TodayPlanReasonCode | ReviewQueueReflectionReasonCode;

export type LearnerLoopTelemetryEventInput = {
  eventName: string;
  occurredAt?: string | Date;
  userScope?: LearnerLoopTelemetryUserScope | string;
  loopId?: string;
  loopStage: string;
  sourceType: string;
  examMode?: CaptureNoteQualityExamMode | string;
  subject?: string;
  taskType?: string;
  persistenceStatus?: string;
  reasonCode?: string;
  reviewReasonCode?: string;
  sourceTrace?: Record<string, unknown>;
  todayPlanTaskCount?: number;
  hasBiggestGap?: boolean;
  hasNextAction?: boolean;
  hasReviewReflection?: boolean;
  isDue?: boolean;
  selectedForToday?: boolean;
  completed?: boolean;
  metadataOnly?: boolean;
  learnerOwned?: boolean;
};

export type LearnerLoopTelemetryEvent = {
  eventName: LearnerLoopTelemetryEventName;
  eventId: string;
  occurredAt: string;
  userScope: LearnerLoopTelemetryUserScope;
  loopId: string;
  loopStage: LearnerLoopTelemetryLoopStage;
  sourceType: LearnerLoopTelemetrySourceType;
  examMode?: CaptureNoteQualityExamMode;
  subject?: string;
  taskType: LearnerLoopTelemetryTaskType;
  persistenceStatus: LearnerLoopTelemetryPersistenceStatus;
  reasonCode?: TodayPlanReasonCode;
  reviewReasonCode?: ReviewQueueReflectionReasonCode;
  metadataOnly: true;
  learnerOwned: true;
  safeUse: "closed_beta_learner_loop_telemetry";
  sourceTrace: {
    sourceId?: string;
    loopId: string;
    sourceType: LearnerLoopTelemetrySourceType;
    loopStage: LearnerLoopTelemetryLoopStage;
    taskType: LearnerLoopTelemetryTaskType;
    persistenceStatus: LearnerLoopTelemetryPersistenceStatus;
    reasonCode?: TodayPlanReasonCode;
    reviewReasonCode?: ReviewQueueReflectionReasonCode;
    metadataOnly: true;
    safeUse: "closed_beta_learner_loop_telemetry";
  };
  todayPlanTaskCount?: number;
  hasBiggestGap?: boolean;
  hasNextAction?: boolean;
  hasReviewReflection?: boolean;
  isDue?: boolean;
  selectedForToday?: boolean;
  completed?: boolean;
};

export type LearnerLoopTelemetrySummary = {
  metadataOnly: true;
  safeUse: "closed_beta_learner_loop_telemetry";
  captureCount: number;
  noteCreatedCount: number;
  biggestGapCount: number;
  nextActionCount: number;
  todayPlanGeneratedCount: number;
  todayPlanTaskSelectedCount: number;
  reviewQueueItemCreatedCount: number;
  reviewCompletedCount: number;
  notesReflectedCount: number;
  loopClosureCount: number;
  hasClosedLoop: boolean;
  durableLoopClosureCount: number;
  localBetaLoopEvidenceCount: number;
  saveFailedEventCount: number;
  readyReviewQueueEventCount: number;
  hasDurableClosedLoop: boolean;
  hasLocalBetaLoopEvidence: boolean;
};

export type LearnerLoopTelemetryClosureEvidence = {
  metadataOnly: true;
  safeUse: "closed_beta_learner_loop_runtime_telemetry";
  requiredEventNames: readonly (typeof REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES)[number][];
  loopCount: number;
  loopClosureCount: number;
  durableLoopClosureCount: number;
  localBetaLoopEvidenceCount: number;
  saveFailedLoopCount: number;
  readyReviewQueueEventCount: number;
  hasClosedLoop: boolean;
  hasDurableClosedLoop: boolean;
  hasLocalBetaLoopEvidence: boolean;
  durableLoopIds: string[];
  localBetaLoopIds: string[];
  saveFailedLoopIds: string[];
  incompleteLoopIds: string[];
};

export type LearnerLoopRuntimeTelemetryCollector = {
  record(input: LearnerLoopTelemetryEventInput, now?: Date): LearnerLoopTelemetryEvent;
  recordMany(inputs: LearnerLoopTelemetryEventInput[], now?: Date): LearnerLoopTelemetryEvent[];
  list(): LearnerLoopTelemetryEvent[];
  clear(): void;
  summarize(): LearnerLoopTelemetrySummary;
  evaluateClosure(): LearnerLoopTelemetryClosureEvidence;
  readyReviewQueueEvents(): LearnerLoopTelemetryEvent[];
};

const EVENT_NAME_SET = new Set<string>(LEARNER_LOOP_TELEMETRY_EVENT_NAMES);
const LOOP_STAGE_SET = new Set<string>(LEARNER_LOOP_TELEMETRY_LOOP_STAGES);
const SOURCE_TYPE_SET = new Set<string>(LEARNER_LOOP_TELEMETRY_SOURCE_TYPES);
const PERSISTENCE_STATUS_SET = new Set<string>(LEARNER_LOOP_TELEMETRY_PERSISTENCE_STATUSES);
const USER_SCOPE_SET = new Set<string>(LEARNER_LOOP_TELEMETRY_USER_SCOPES);
const TASK_TYPE_SET = new Set<string>(LEARNER_LOOP_TELEMETRY_TASK_TYPES);
const TODAY_PLAN_REASON_CODE_SET = new Set<string>(TODAY_PLAN_REASON_CODES);
const REVIEW_REASON_CODE_SET = new Set<string>(REVIEW_QUEUE_REFLECTION_REASON_CODES);
const REQUIRED_EVENT_NAME_SET = new Set<string>(REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES);

const FORBIDDEN_FIELD_NAMES = new Set([
  "rawText",
  "copiedProblemText",
  "copiedAnswerText",
  "rawAnswerText",
  "rawProblemText",
  "rawOcrText",
  "ocrFullText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "score",
  "passFail",
  "officialGrade",
  "instructorComment",
  "qnetRawPath",
  "localOfficialMaterialsPath",
  "localFileName",
  "sourceFileName",
  "localFilePath",
  "sourceFilePath",
  "rawFilePath",
  "qnetRawText",
  "archiveUrl",
  "userAnswerBody",
  "rawQuestionText",
  "rawOcrPayload",
  "sourceText",
  "qnetManifest",
]);

const FORBIDDEN_FIELD_PATTERN =
  /(^score$|pass.*fail|official.*(answer|grade)|model.*answer|instructor.*comment|local.*(file|official|materials)|source.*file|copied.*(problem|answer)|raw.*(text|answer|problem|ocr|file|question)|ocr.*full|qnet.*raw|archive|user.*answer.*body|source.*text|qnet.*manifest)/i;

const LOCAL_MATERIAL_BOUNDARY_PATTERN = new RegExp(["local", "official", "materials"].join("[_\\\\/-]"), "i");
const MANIFEST_FILE_BOUNDARY_PATTERN = new RegExp(["qnet", "manifest"].join("[_.-]") + "\\.json", "i");

const FORBIDDEN_TEXT_PATTERNS = [
  /official\s+(grading|grade|answer|model answer|score)/i,
  /model\s+answer/i,
  /score\s+prediction/i,
  /pass\s*\/?\s*fail/i,
  /public\s+archive/i,
  /problem\s+bank/i,
  /instructor\s+comment/i,
  LOCAL_MATERIAL_BOUNDARY_PATTERN,
  MANIFEST_FILE_BOUNDARY_PATTERN,
  /\bq-net\s+raw\b/i,
  /(?:^|[A-Za-z]:\\|\\\\|\/)(?:Users|tmp|temp|downloads|desktop)[\\/]/i,
  /\.(?:pdf|hwp|hwpx|doc|docx|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i,
  /공식\s*(채점|점수|모범답안|답안|해설|문제)/,
  /합격\s*판정|불합격\s*판정|점수\s*예측/,
  /강사용\s*콘솔|강사\s*코멘트/,
  /공개\s*아카이브|문제\s*은행/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function assertNoForbiddenFields(value: unknown, path = "learnerLoopTelemetry"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenFields(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_FIELD_NAMES.has(key) || FORBIDDEN_FIELD_PATTERN.test(key)) {
      throw new Error(`Learner loop telemetry contract forbids field: ${path}.${key}`);
    }
    assertNoForbiddenFields(nestedValue, `${path}.${key}`);
  }
}

function assertSafeText(label: string, value: string): void {
  for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(value)) throw new Error(`Learner loop telemetry contract forbids unsafe ${label}`);
  }
}

function safeSingleLine(label: string, value: unknown, maxLength = 120): string | undefined {
  const normalized = clean(value);
  if (!normalized) return undefined;
  if (/[\r\n]/.test(String(value))) throw new Error(`Learner loop telemetry contract requires single-line ${label}`);
  assertSafeText(label, normalized);
  return normalized.slice(0, maxLength);
}

function normalizeRequired<T extends string>(label: string, value: string, allowed: readonly T[]): T {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!allowed.includes(normalized as T)) {
    throw new Error(`Learner loop telemetry contract rejects ${label}: ${String(value)}`);
  }
  return normalized as T;
}

function normalizeEventName(value: string): LearnerLoopTelemetryEventName {
  return normalizeRequired("eventName", value, LEARNER_LOOP_TELEMETRY_EVENT_NAMES);
}

function normalizeLoopStage(value: string): LearnerLoopTelemetryLoopStage {
  return normalizeRequired("loopStage", value, LEARNER_LOOP_TELEMETRY_LOOP_STAGES);
}

function normalizeSourceType(value: string): LearnerLoopTelemetrySourceType {
  return normalizeRequired("sourceType", value, LEARNER_LOOP_TELEMETRY_SOURCE_TYPES);
}

function normalizePersistenceStatus(value: string | undefined): LearnerLoopTelemetryPersistenceStatus {
  return normalizeRequired("persistenceStatus", value ?? "not_applicable", LEARNER_LOOP_TELEMETRY_PERSISTENCE_STATUSES);
}

function normalizeUserScope(value: string | undefined): LearnerLoopTelemetryUserScope {
  return normalizeRequired("userScope", value ?? "anonymous_local", LEARNER_LOOP_TELEMETRY_USER_SCOPES);
}

function normalizeTaskType(value: string | undefined): LearnerLoopTelemetryTaskType {
  if (!value) return "not_applicable";
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "not_applicable") return "not_applicable";
  const captureTaskType = normalizeCaptureNoteTaskType(normalized);
  if (captureTaskType && TASK_TYPE_SET.has(captureTaskType)) return captureTaskType;
  if (TASK_TYPE_SET.has(normalized)) return normalized as LearnerLoopTelemetryTaskType;
  throw new Error(`Learner loop telemetry contract rejects taskType: ${String(value)}`);
}

function normalizeExamMode(value: unknown): CaptureNoteQualityExamMode | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "first" || value === "second") return value;
  throw new Error(`Learner loop telemetry contract rejects examMode: ${String(value)}`);
}

function normalizeReasonCode(value: string | undefined): TodayPlanReasonCode | undefined {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return undefined;
  if (!TODAY_PLAN_REASON_CODE_SET.has(normalized)) {
    throw new Error(`Learner loop telemetry contract rejects reasonCode: ${String(value)}`);
  }
  return normalized as TodayPlanReasonCode;
}

function normalizeReviewReasonCode(value: string | undefined): ReviewQueueReflectionReasonCode | undefined {
  const normalized = clean(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return undefined;
  if (!REVIEW_REASON_CODE_SET.has(normalized)) {
    throw new Error(`Learner loop telemetry contract rejects reviewReasonCode: ${String(value)}`);
  }
  return normalized as ReviewQueueReflectionReasonCode;
}

function normalizeOccurredAt(value: string | Date | undefined, now: Date): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return now.toISOString();
}

function resolveLoopId(input: LearnerLoopTelemetryEventInput, sourceId: string | undefined): string {
  return (
    safeSingleLine("loopId", input.loopId, 96) ??
    safeSingleLine("sourceTrace.loopId", input.sourceTrace?.loopId, 96) ??
    sourceId ??
    "anonymous-local-loop"
  );
}

function safeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function safeCounter(label: string, value: unknown, max = 100): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) {
    throw new Error(`Learner loop telemetry contract rejects ${label}: ${String(value)}`);
  }
  return value;
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function buildEventId(input: {
  eventName: LearnerLoopTelemetryEventName;
  occurredAt: string;
  userScope: LearnerLoopTelemetryUserScope;
  loopId: string;
  loopStage: LearnerLoopTelemetryLoopStage;
  sourceType: LearnerLoopTelemetrySourceType;
  examMode?: CaptureNoteQualityExamMode;
  subject?: string;
  taskType: LearnerLoopTelemetryTaskType;
  persistenceStatus: LearnerLoopTelemetryPersistenceStatus;
  reasonCode?: TodayPlanReasonCode;
  reviewReasonCode?: ReviewQueueReflectionReasonCode;
  sourceId?: string;
  todayPlanTaskCount?: number;
  selectedForToday?: boolean;
  completed?: boolean;
}): string {
  return `learner-loop:${stableHash(
    [
      input.eventName,
      input.occurredAt,
      input.userScope,
      input.loopId,
      input.loopStage,
      input.sourceType,
      input.examMode ?? "",
      input.subject ?? "",
      input.taskType,
      input.persistenceStatus,
      input.reasonCode ?? "",
      input.reviewReasonCode ?? "",
      input.sourceId ?? "",
      input.todayPlanTaskCount ?? "",
      input.selectedForToday ?? "",
      input.completed ?? "",
    ].join("|"),
  )}`;
}

function buildSourceTrace(input: {
  sourceTrace: Record<string, unknown> | undefined;
  loopId: string;
  sourceType: LearnerLoopTelemetrySourceType;
  loopStage: LearnerLoopTelemetryLoopStage;
  taskType: LearnerLoopTelemetryTaskType;
  persistenceStatus: LearnerLoopTelemetryPersistenceStatus;
  reasonCode?: TodayPlanReasonCode;
  reviewReasonCode?: ReviewQueueReflectionReasonCode;
}): LearnerLoopTelemetryEvent["sourceTrace"] {
  const sourceId = safeSingleLine("sourceTrace.sourceId", input.sourceTrace?.sourceId, 96);
  return {
    ...(sourceId ? { sourceId } : {}),
    loopId: input.loopId,
    sourceType: input.sourceType,
    loopStage: input.loopStage,
    taskType: input.taskType,
    persistenceStatus: input.persistenceStatus,
    ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
    ...(input.reviewReasonCode ? { reviewReasonCode: input.reviewReasonCode } : {}),
    metadataOnly: true,
    safeUse: "closed_beta_learner_loop_telemetry",
  };
}

function assertTodayPlanMaxThree(eventName: LearnerLoopTelemetryEventName, loopStage: LearnerLoopTelemetryLoopStage, count: number | undefined): void {
  if ((eventName === "today_plan_generated" || loopStage === "today_plan") && typeof count === "number" && count > 3) {
    throw new Error("Learner loop telemetry contract keeps Today Plan task count at max 3");
  }
}

export function buildLearnerLoopTelemetryEvent(input: LearnerLoopTelemetryEventInput, now = new Date()): LearnerLoopTelemetryEvent {
  assertNoForbiddenFields(input);
  if (input.metadataOnly === false) throw new Error("Learner loop telemetry contract requires metadataOnly telemetry");
  if (input.learnerOwned === false) throw new Error("Learner loop telemetry contract requires learner-owned telemetry");

  const eventName = normalizeEventName(input.eventName);
  const userScope = normalizeUserScope(input.userScope);
  const loopStage = normalizeLoopStage(input.loopStage);
  const sourceType = normalizeSourceType(input.sourceType);
  const examMode = normalizeExamMode(input.examMode);
  const subject = safeSingleLine("subject", input.subject, 80);
  const taskType = normalizeTaskType(input.taskType);
  const persistenceStatus = normalizePersistenceStatus(input.persistenceStatus);
  const reasonCode = normalizeReasonCode(input.reasonCode);
  const reviewReasonCode = normalizeReviewReasonCode(input.reviewReasonCode);
  const occurredAt = normalizeOccurredAt(input.occurredAt, now);
  const todayPlanTaskCount = safeCounter("todayPlanTaskCount", input.todayPlanTaskCount);
  assertTodayPlanMaxThree(eventName, loopStage, todayPlanTaskCount);
  const sourceId = safeSingleLine("sourceTrace.sourceId", input.sourceTrace?.sourceId, 96);
  const loopId = resolveLoopId(input, sourceId);

  const sourceTrace = buildSourceTrace({
    sourceTrace: input.sourceTrace,
    loopId,
    sourceType,
    loopStage,
    taskType,
    persistenceStatus,
    reasonCode,
    reviewReasonCode,
  });

  const event: LearnerLoopTelemetryEvent = {
    eventName,
    eventId: buildEventId({
      eventName,
      occurredAt,
      userScope,
      loopId,
      loopStage,
      sourceType,
      examMode,
      subject,
      taskType,
      persistenceStatus,
      reasonCode,
      reviewReasonCode,
      sourceId: sourceTrace.sourceId,
      todayPlanTaskCount,
      selectedForToday: safeBoolean(input.selectedForToday),
      completed: safeBoolean(input.completed),
    }),
    occurredAt,
    userScope,
    loopId,
    loopStage,
    sourceType,
    ...(examMode ? { examMode } : {}),
    ...(subject ? { subject } : {}),
    taskType,
    persistenceStatus,
    ...(reasonCode ? { reasonCode } : {}),
    ...(reviewReasonCode ? { reviewReasonCode } : {}),
    metadataOnly: true,
    learnerOwned: true,
    safeUse: "closed_beta_learner_loop_telemetry",
    sourceTrace,
    ...(todayPlanTaskCount !== undefined ? { todayPlanTaskCount } : {}),
    ...(safeBoolean(input.hasBiggestGap) !== undefined ? { hasBiggestGap: safeBoolean(input.hasBiggestGap) } : {}),
    ...(safeBoolean(input.hasNextAction) !== undefined ? { hasNextAction: safeBoolean(input.hasNextAction) } : {}),
    ...(safeBoolean(input.hasReviewReflection) !== undefined ? { hasReviewReflection: safeBoolean(input.hasReviewReflection) } : {}),
    ...(safeBoolean(input.isDue) !== undefined ? { isDue: safeBoolean(input.isDue) } : {}),
    ...(safeBoolean(input.selectedForToday) !== undefined ? { selectedForToday: safeBoolean(input.selectedForToday) } : {}),
    ...(safeBoolean(input.completed) !== undefined ? { completed: safeBoolean(input.completed) } : {}),
  };

  assertLearnerLoopTelemetryEventSafe(event);
  return event;
}

export function assertLearnerLoopTelemetryEventSafe(event: LearnerLoopTelemetryEvent): asserts event is LearnerLoopTelemetryEvent {
  assertNoForbiddenFields(event);
  if (event.metadataOnly !== true) throw new Error("Learner loop telemetry event must be metadataOnly");
  if (event.learnerOwned !== true) throw new Error("Learner loop telemetry event must be learnerOwned");
  if (event.safeUse !== "closed_beta_learner_loop_telemetry") {
    throw new Error("Learner loop telemetry event has unsupported safeUse");
  }
  if (!EVENT_NAME_SET.has(event.eventName)) throw new Error(`Learner loop telemetry event rejects eventName: ${event.eventName}`);
  if (!LOOP_STAGE_SET.has(event.loopStage)) throw new Error(`Learner loop telemetry event rejects loopStage: ${event.loopStage}`);
  if (!SOURCE_TYPE_SET.has(event.sourceType)) throw new Error(`Learner loop telemetry event rejects sourceType: ${event.sourceType}`);
  if (!USER_SCOPE_SET.has(event.userScope)) throw new Error(`Learner loop telemetry event rejects userScope: ${event.userScope}`);
  if (!TASK_TYPE_SET.has(event.taskType)) throw new Error(`Learner loop telemetry event rejects taskType: ${event.taskType}`);
  if (!PERSISTENCE_STATUS_SET.has(event.persistenceStatus)) {
    throw new Error(`Learner loop telemetry event rejects persistenceStatus: ${event.persistenceStatus}`);
  }
  if (!safeSingleLine("loopId", event.loopId, 96)) throw new Error("Learner loop telemetry event requires loopId");
  if (event.sourceTrace.loopId !== event.loopId) throw new Error("Learner loop telemetry event sourceTrace loopId mismatch");
  if (!Number.isFinite(Date.parse(event.occurredAt))) throw new Error("Learner loop telemetry event requires valid occurredAt");
  if (event.todayPlanTaskCount !== undefined) assertTodayPlanMaxThree(event.eventName, event.loopStage, event.todayPlanTaskCount);

  const serialized = JSON.stringify(event);
  assertSafeText("event", serialized);
}

function countEvents(events: LearnerLoopTelemetryEvent[], eventName: LearnerLoopTelemetryEventName, closureEligibleOnly = false): number {
  return events.filter((event) => event.eventName === eventName && (!closureEligibleOnly || event.persistenceStatus !== "save_failed")).length;
}

function groupEventsByLoopId(events: LearnerLoopTelemetryEvent[]): Map<string, LearnerLoopTelemetryEvent[]> {
  const groups = new Map<string, LearnerLoopTelemetryEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.loopId) ?? [];
    existing.push(event);
    groups.set(event.loopId, existing);
  }
  return groups;
}

function hasRequiredEvent(events: LearnerLoopTelemetryEvent[], eventName: string, persistenceStatus?: LearnerLoopTelemetryPersistenceStatus): boolean {
  return events.some((event) => {
    if (event.eventName !== eventName) return false;
    if (persistenceStatus) return event.persistenceStatus === persistenceStatus;
    return event.persistenceStatus !== "save_failed";
  });
}

function hasCompleteRequiredLoop(events: LearnerLoopTelemetryEvent[]): boolean {
  return REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES.every((eventName) => hasRequiredEvent(events, eventName));
}

function hasDurableRequiredLoop(events: LearnerLoopTelemetryEvent[]): boolean {
  return REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES.every((eventName) => hasRequiredEvent(events, eventName, "durable_saved"));
}

function hasLocalFallbackSignal(events: LearnerLoopTelemetryEvent[]): boolean {
  return events.some((event) => REQUIRED_EVENT_NAME_SET.has(event.eventName) && event.persistenceStatus === "local_fallback_saved");
}

export function selectReadyLearnerLoopTelemetryReviewQueueEvents(events: LearnerLoopTelemetryEvent[]): LearnerLoopTelemetryEvent[] {
  for (const event of events) assertLearnerLoopTelemetryEventSafe(event);
  return events.filter((event) => event.eventName === "review_queue_item_created" && event.persistenceStatus !== "save_failed");
}

export function evaluateLearnerLoopTelemetryClosure(events: LearnerLoopTelemetryEvent[]): LearnerLoopTelemetryClosureEvidence {
  for (const event of events) assertLearnerLoopTelemetryEventSafe(event);

  const durableLoopIds: string[] = [];
  const localBetaLoopIds: string[] = [];
  const saveFailedLoopIds: string[] = [];
  const incompleteLoopIds: string[] = [];

  for (const [loopId, loopEvents] of groupEventsByLoopId(events)) {
    const hasCompleteLoop = hasCompleteRequiredLoop(loopEvents);
    const hasDurableLoop = hasDurableRequiredLoop(loopEvents);
    const hasSaveFailed = loopEvents.some((event) => event.persistenceStatus === "save_failed");

    if (hasDurableLoop) {
      durableLoopIds.push(loopId);
    } else if (hasCompleteLoop && hasLocalFallbackSignal(loopEvents)) {
      localBetaLoopIds.push(loopId);
    } else if (hasSaveFailed) {
      saveFailedLoopIds.push(loopId);
    } else {
      incompleteLoopIds.push(loopId);
    }
  }

  return {
    metadataOnly: true,
    safeUse: "closed_beta_learner_loop_runtime_telemetry",
    requiredEventNames: REQUIRED_LEARNER_LOOP_TELEMETRY_EVENT_NAMES,
    loopCount: durableLoopIds.length + localBetaLoopIds.length + saveFailedLoopIds.length + incompleteLoopIds.length,
    loopClosureCount: durableLoopIds.length + localBetaLoopIds.length,
    durableLoopClosureCount: durableLoopIds.length,
    localBetaLoopEvidenceCount: localBetaLoopIds.length,
    saveFailedLoopCount: saveFailedLoopIds.length,
    readyReviewQueueEventCount: selectReadyLearnerLoopTelemetryReviewQueueEvents(events).length,
    hasClosedLoop: durableLoopIds.length + localBetaLoopIds.length > 0,
    hasDurableClosedLoop: durableLoopIds.length > 0,
    hasLocalBetaLoopEvidence: localBetaLoopIds.length > 0,
    durableLoopIds,
    localBetaLoopIds,
    saveFailedLoopIds,
    incompleteLoopIds,
  };
}

export function summarizeLearnerLoopTelemetry(events: LearnerLoopTelemetryEvent[]): LearnerLoopTelemetrySummary {
  for (const event of events) assertLearnerLoopTelemetryEventSafe(event);
  const closureEvidence = evaluateLearnerLoopTelemetryClosure(events);

  return {
    metadataOnly: true,
    safeUse: "closed_beta_learner_loop_telemetry",
    captureCount: countEvents(events, "capture_submitted"),
    noteCreatedCount: countEvents(events, "capture_note_created"),
    biggestGapCount: countEvents(events, "biggest_gap_identified"),
    nextActionCount: countEvents(events, "next_action_created"),
    todayPlanGeneratedCount: countEvents(events, "today_plan_generated"),
    todayPlanTaskSelectedCount: countEvents(events, "today_plan_task_selected"),
    reviewQueueItemCreatedCount: countEvents(events, "review_queue_item_created"),
    reviewCompletedCount: countEvents(events, "review_completed"),
    notesReflectedCount: countEvents(events, "notes_reflected"),
    loopClosureCount: closureEvidence.loopClosureCount,
    hasClosedLoop: closureEvidence.hasClosedLoop,
    durableLoopClosureCount: closureEvidence.durableLoopClosureCount,
    localBetaLoopEvidenceCount: closureEvidence.localBetaLoopEvidenceCount,
    saveFailedEventCount: events.filter((event) => event.persistenceStatus === "save_failed").length,
    readyReviewQueueEventCount: closureEvidence.readyReviewQueueEventCount,
    hasDurableClosedLoop: closureEvidence.hasDurableClosedLoop,
    hasLocalBetaLoopEvidence: closureEvidence.hasLocalBetaLoopEvidence,
  };
}

export function createLearnerLoopRuntimeTelemetryCollector(): LearnerLoopRuntimeTelemetryCollector {
  const recordedEvents: LearnerLoopTelemetryEvent[] = [];

  const record = (input: LearnerLoopTelemetryEventInput, now = new Date()): LearnerLoopTelemetryEvent => {
    const event = buildLearnerLoopTelemetryEvent(input, now);
    recordedEvents.push(event);
    return event;
  };

  return {
    record,
    recordMany(inputs, now = new Date()) {
      return inputs.map((input) => record(input, now));
    },
    list() {
      return [...recordedEvents];
    },
    clear() {
      recordedEvents.length = 0;
    },
    summarize() {
      return summarizeLearnerLoopTelemetry(recordedEvents);
    },
    evaluateClosure() {
      return evaluateLearnerLoopTelemetryClosure(recordedEvents);
    },
    readyReviewQueueEvents() {
      return selectReadyLearnerLoopTelemetryReviewQueueEvents(recordedEvents);
    },
  };
}
