import {
  CALCULATOR_ROUTINE_MISTAKE_OPTIONS,
  CALCULATOR_ROUTINE_STEPS,
  CALCULATOR_ROUTINE_VERIFICATION_OPTIONS,
  getCalculatorRoutineMistakeLabel,
  sanitizeCalculatorRoutineCompletionSignal,
  type CalculatorRoutineCompletionSignalV1,
  type CalculatorRoutineMistakeType,
  type CalculatorRoutineStepId,
  type CalculatorRoutineVerificationMethod,
} from "./calculator-routine";
import { buildConceptNodeCandidate } from "./concept-node-mapping";
import type { FailureAwareStateEvidence } from "./failure-aware-state";

export const CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY =
  "inverge.calculatorRoutine.completionOutbox.v1";
export const CALCULATOR_ROUTINE_OUTBOX_WEB_LOCK =
  "inverge-calculator-routine-completion-outbox-v1";
export const CALCULATOR_ROUTINE_OUTBOX_LIMIT = 16;

export type CalculatorRoutineOutboxEntryV1 = Readonly<{
  metadataOnly: true;
  version: 1;
  queueType: "calculator_routine_completion";
  accountScope: string;
  queueId: string;
  queuedAt: string;
  autoSyncRegistered: true;
  signal: CalculatorRoutineCompletionSignalV1;
}>;

export type CalculatorRoutineOutboxStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type CalculatorRoutineOutboxReadOutcome =
  | Readonly<{
      status: "ready";
      entries: readonly CalculatorRoutineOutboxEntryV1[];
      discardedCount: number;
    }>
  | Readonly<{
      status: "unavailable";
      entries: readonly [];
      discardedCount: 0;
    }>;

export type CalculatorRoutineOutboxEnqueueOutcome =
  | Readonly<{
      status: "queued";
      entry: CalculatorRoutineOutboxEntryV1;
      deduped: boolean;
      queueSize: number;
    }>
  | Readonly<{ status: "invalid" | "unavailable" }>;

export type CalculatorRoutineDurableReceipt = Readonly<{
  status: "saved" | "deduped";
  learningRecordId: string;
}>;

const ENTRY_KEYS = [
  "accountScope",
  "autoSyncRegistered",
  "metadataOnly",
  "queueId",
  "queuedAt",
  "queueType",
  "signal",
  "version",
] as const;

const SIGNAL_KEYS = [
  "completedAt",
  "completedStepIds",
  "examMode",
  "hintUsedStepIds",
  "metadataOnly",
  "mistakeTypes",
  "needsOfficialVerification",
  "primaryMistakeType",
  "relatedConceptNodeId",
  "routineConceptCandidate",
  "routineId",
  "routineType",
  "source",
  "sourceStatus",
  "startedAt",
  "stuckStepIds",
  "subject",
  "verificationMethods",
  "version",
] as const;

const REQUIRED_SIGNAL_KEYS = SIGNAL_KEYS.filter(
  (key) => key !== "relatedConceptNodeId",
);
const CONCEPT_CANDIDATE_KEYS = [
  "conceptFamily",
  "conceptNodeId",
  "examMode",
  "metadataOnly",
  "mistakeType",
  "needsOfficialVerification",
  "nextTaskType",
  "retrievalPrompt",
  "sourceStatus",
  "subject",
] as const;
const COMPLETED_STEP_IDS = CALCULATOR_ROUTINE_STEPS.map((step) => step.id);
const STEP_IDS = new Set<string>(COMPLETED_STEP_IDS);
const MISTAKE_TYPES = new Set<string>(
  CALCULATOR_ROUTINE_MISTAKE_OPTIONS.map((option) => option.id),
);
const VERIFICATION_METHODS = new Set<string>(
  CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.map((option) => option.id),
);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_SCOPE_PATTERN = /^[0-9a-f]{64}$/;
const CANONICAL_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_FUTURE_TIMESTAMP_MS = 24 * 60 * 60 * 1000;
const FORBIDDEN_CONTENT_KEY =
  /^(entries|draft|raw.*|.*raw.*|ocr.*|.*ocr.*|problem.*text|question.*text|answer.*text|user.*answer|official.*answer|reference.*answer|formula|formulas|numbers|units|casio|display|verificationMemo|mistakeMemo|sourceText|original.*|full.*)$/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  requiredKeys = allowedKeys,
) {
  const allowed = new Set(allowedKeys);
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function containsForbiddenContentKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenContentKey);
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      FORBIDDEN_CONTENT_KEY.test(key) || containsForbiddenContentKey(nested),
  );
}

function canonicalTimestamp(value: unknown, nowMs = Date.now()): string | null {
  if (
    typeof value !== "string" ||
    !CANONICAL_UTC_TIMESTAMP_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value ||
    Date.parse(value) > nowMs + MAX_FUTURE_TIMESTAMP_MS
  ) {
    return null;
  }
  return value;
}

function normalizeKnownArray<T extends string>(
  value: unknown,
  allowed: Set<string>,
  order: readonly string[],
): T[] | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  const normalized: T[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item)) return null;
    if (!normalized.includes(item as T)) normalized.push(item as T);
  }
  return normalized.sort((left, right) => order.indexOf(left) - order.indexOf(right));
}

function canonicalizeCompletionSignal(
  value: unknown,
  nowMs = Date.now(),
): CalculatorRoutineCompletionSignalV1 | null {
  if (
    !isPlainRecord(value) ||
    containsForbiddenContentKey(value) ||
    !hasOnlyKeys(value, SIGNAL_KEYS, REQUIRED_SIGNAL_KEYS) ||
    value.metadataOnly !== true ||
    value.version !== 1 ||
    value.routineType !== "calculator_routine" ||
    (value.source !== "problem-snap" && value.source !== "answer-review") ||
    value.examMode !== "second" ||
    value.subject !== "감정평가실무" ||
    value.sourceStatus !== "draft" ||
    value.needsOfficialVerification !== true
  ) {
    return null;
  }

  const source = value.source;
  const expectedRoutinePrefix = `${source}-`;
  const routineSuffix =
    typeof value.routineId === "string"
      ? value.routineId.slice(expectedRoutinePrefix.length)
      : "";
  if (
    typeof value.routineId !== "string" ||
    value.routineId.length > 128 ||
    !value.routineId.startsWith(expectedRoutinePrefix) ||
    !(
      UUID_PATTERN.test(routineSuffix) ||
      /^\d{13}-[a-z0-9]{8}$/.test(routineSuffix) ||
      /^second-[A-Za-z0-9_-]{1,64}$/.test(routineSuffix)
    )
  ) {
    return null;
  }

  const completedStepIds = normalizeKnownArray<CalculatorRoutineStepId>(
    value.completedStepIds,
    STEP_IDS,
    COMPLETED_STEP_IDS,
  );
  const stuckStepIds = normalizeKnownArray<CalculatorRoutineStepId>(
    value.stuckStepIds,
    STEP_IDS,
    COMPLETED_STEP_IDS,
  );
  const hintUsedStepIds = normalizeKnownArray<CalculatorRoutineStepId>(
    value.hintUsedStepIds,
    STEP_IDS,
    COMPLETED_STEP_IDS,
  );
  const mistakeTypeOrder = CALCULATOR_ROUTINE_MISTAKE_OPTIONS.map(
    (option) => option.id,
  );
  const mistakeTypes = normalizeKnownArray<CalculatorRoutineMistakeType>(
    value.mistakeTypes,
    MISTAKE_TYPES,
    mistakeTypeOrder,
  );
  const verificationMethodOrder = CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.map(
    (option) => option.id,
  );
  const verificationMethods =
    normalizeKnownArray<CalculatorRoutineVerificationMethod>(
      value.verificationMethods,
      VERIFICATION_METHODS,
      verificationMethodOrder,
    );

  if (
    !completedStepIds ||
    completedStepIds.length !== COMPLETED_STEP_IDS.length ||
    !COMPLETED_STEP_IDS.every((stepId) => completedStepIds.includes(stepId)) ||
    !stuckStepIds ||
    !hintUsedStepIds ||
    !mistakeTypes ||
    mistakeTypes.length === 0 ||
    (mistakeTypes.includes("none") && mistakeTypes.length > 1) ||
    typeof value.primaryMistakeType !== "string" ||
    !mistakeTypes.includes(value.primaryMistakeType as CalculatorRoutineMistakeType) ||
    !verificationMethods ||
    verificationMethods.length === 0
  ) {
    return null;
  }

  const expectedConceptCandidate = buildConceptNodeCandidate({
    mode: "second",
    subject: "감정평가실무",
    conceptFamily: "검산/CASIO",
    mistakeType: getCalculatorRoutineMistakeLabel(
      value.primaryMistakeType as CalculatorRoutineMistakeType,
    ),
  });
  const routineConceptCandidate = value.routineConceptCandidate;
  if (
    !isPlainRecord(routineConceptCandidate) ||
    !hasOnlyKeys(routineConceptCandidate, CONCEPT_CANDIDATE_KEYS) ||
    CONCEPT_CANDIDATE_KEYS.some(
      (key) => routineConceptCandidate[key] !== expectedConceptCandidate[key],
    )
  ) {
    return null;
  }

  if (value.relatedConceptNodeId !== undefined) {
    return null;
  }

  const startedAt = canonicalTimestamp(value.startedAt, nowMs);
  const completedAt = canonicalTimestamp(value.completedAt, nowMs);
  if (!startedAt || !completedAt || Date.parse(completedAt) < Date.parse(startedAt)) {
    return null;
  }

  return sanitizeCalculatorRoutineCompletionSignal({
    metadataOnly: true,
    version: 1,
    routineType: "calculator_routine",
    source,
    examMode: "second",
    subject: "감정평가실무",
    routineId: value.routineId,
    routineConceptCandidate: expectedConceptCandidate,
    completedStepIds,
    stuckStepIds,
    mistakeTypes,
    primaryMistakeType: value.primaryMistakeType as CalculatorRoutineMistakeType,
    verificationMethods,
    hintUsedStepIds,
    startedAt,
    completedAt,
    sourceStatus: "draft",
    needsOfficialVerification: true,
  });
}

function canonicalizeEntry(
  value: unknown,
  nowMs = Date.now(),
): CalculatorRoutineOutboxEntryV1 | null {
  if (
    !isPlainRecord(value) ||
    containsForbiddenContentKey(value) ||
    !hasOnlyKeys(value, ENTRY_KEYS) ||
    value.metadataOnly !== true ||
    value.version !== 1 ||
    value.queueType !== "calculator_routine_completion" ||
    value.autoSyncRegistered !== true ||
    typeof value.accountScope !== "string" ||
    !ACCOUNT_SCOPE_PATTERN.test(value.accountScope) ||
    typeof value.queueId !== "string" ||
    !UUID_PATTERN.test(value.queueId)
  ) {
    return null;
  }
  const queuedAt = canonicalTimestamp(value.queuedAt, nowMs);
  const signal = canonicalizeCompletionSignal(value.signal, nowMs);
  if (!queuedAt || !signal) return null;
  return Object.freeze({
    metadataOnly: true,
    version: 1,
    queueType: "calculator_routine_completion",
    accountScope: value.accountScope,
    queueId: value.queueId.toLowerCase(),
    queuedAt,
    autoSyncRegistered: true,
    signal,
  });
}

function parseStoredOutbox(raw: string | null, nowMs = Date.now()) {
  if (raw === null) {
    return {
      entries: [] as CalculatorRoutineOutboxEntryV1[],
      discardedCount: 0,
      overflowed: false,
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        entries: [] as CalculatorRoutineOutboxEntryV1[],
        discardedCount: 1,
        overflowed: false,
      };
    }
    const canonicalEntries: CalculatorRoutineOutboxEntryV1[] = [];
    let discardedCount = 0;
    for (const candidate of parsed) {
      const entry = canonicalizeEntry(candidate, nowMs);
      if (!entry) {
        discardedCount += 1;
        continue;
      }
      canonicalEntries.push(entry);
    }
    canonicalEntries.sort((left, right) => left.queuedAt.localeCompare(right.queuedAt));
    const entries: CalculatorRoutineOutboxEntryV1[] = [];
    for (const entry of canonicalEntries) {
      if (
        entries.some(
          (existing) =>
            existing.queueId === entry.queueId ||
            (existing.accountScope === entry.accountScope &&
              isSameCalculatorRoutineCompletion(existing.signal, entry.signal)),
        )
      ) {
        discardedCount += 1;
        continue;
      }
      entries.push(entry);
    }
    return {
      entries,
      discardedCount,
      overflowed: entries.length > CALCULATOR_ROUTINE_OUTBOX_LIMIT,
    };
  } catch {
    return {
      entries: [] as CalculatorRoutineOutboxEntryV1[],
      discardedCount: 1,
      overflowed: false,
    };
  }
}

function serializeOutbox(entries: readonly CalculatorRoutineOutboxEntryV1[]) {
  return JSON.stringify(entries);
}

export function isCalculatorRoutineAccountScope(value: unknown): value is string {
  return typeof value === "string" && ACCOUNT_SCOPE_PATTERN.test(value);
}

export function readCalculatorRoutineOutbox(
  storage: CalculatorRoutineOutboxStorage,
  nowMs = Date.now(),
): CalculatorRoutineOutboxReadOutcome {
  try {
    const raw = storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY);
    const parsed = parseStoredOutbox(raw, nowMs);
    if (parsed.discardedCount > 0) {
      storage.setItem(
        CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
        serializeOutbox(parsed.entries),
      );
    }
    if (parsed.overflowed) {
      return Object.freeze({
        status: "unavailable" as const,
        entries: Object.freeze([]) as readonly [],
        discardedCount: 0 as const,
      });
    }
    return Object.freeze({
      status: "ready" as const,
      entries: Object.freeze(parsed.entries),
      discardedCount: parsed.discardedCount,
    });
  } catch {
    return Object.freeze({
      status: "unavailable" as const,
      entries: Object.freeze([]) as readonly [],
      discardedCount: 0 as const,
    });
  }
}

function sameStringArray(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function isSameCalculatorRoutineCompletion(
  left: CalculatorRoutineCompletionSignalV1,
  right: CalculatorRoutineCompletionSignalV1,
) {
  return (
    left.version === right.version &&
    left.source === right.source &&
    left.routineId === right.routineId &&
    left.completedAt === right.completedAt &&
    left.primaryMistakeType === right.primaryMistakeType &&
    sameStringArray(left.completedStepIds, right.completedStepIds) &&
    sameStringArray(left.stuckStepIds, right.stuckStepIds) &&
    sameStringArray(left.mistakeTypes, right.mistakeTypes) &&
    sameStringArray(left.verificationMethods, right.verificationMethods) &&
    sameStringArray(left.hintUsedStepIds, right.hintUsedStepIds)
  );
}

function sameCompletion(
  entry: CalculatorRoutineOutboxEntryV1,
  right: CalculatorRoutineCompletionSignalV1,
  accountScope: string,
) {
  return (
    entry.accountScope === accountScope &&
    isSameCalculatorRoutineCompletion(entry.signal, right)
  );
}

export function enqueueCalculatorRoutineCompletion(
  storage: CalculatorRoutineOutboxStorage,
  signalInput: unknown,
  options: Readonly<{
    now?: Date;
    queueId?: string;
    accountScope: string;
    autoSyncRegistered: boolean;
  }>,
): CalculatorRoutineOutboxEnqueueOutcome {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const queuedAt = canonicalTimestamp(now.toISOString(), nowMs);
  const signal = canonicalizeCompletionSignal(signalInput, nowMs);
  if (
    !queuedAt ||
    !signal ||
    !ACCOUNT_SCOPE_PATTERN.test(options.accountScope) ||
    options.autoSyncRegistered !== true
  ) {
    return Object.freeze({ status: "invalid" as const });
  }

  const read = readCalculatorRoutineOutbox(storage, nowMs);
  if (read.status !== "ready") {
    return Object.freeze({ status: "unavailable" as const });
  }
  const existing = read.entries.find((entry) =>
    sameCompletion(entry, signal, options.accountScope),
  );
  if (existing) {
    return Object.freeze({
      status: "queued" as const,
      entry: existing,
      deduped: true,
      queueSize: read.entries.length,
    });
  }
  if (read.entries.length >= CALCULATOR_ROUTINE_OUTBOX_LIMIT) {
    return Object.freeze({ status: "unavailable" as const });
  }

  const queueId = options.queueId ?? globalThis.crypto?.randomUUID?.();
  if (typeof queueId !== "string" || !UUID_PATTERN.test(queueId)) {
    return Object.freeze({ status: "unavailable" as const });
  }
  const entry = Object.freeze({
    metadataOnly: true as const,
    version: 1 as const,
    queueType: "calculator_routine_completion" as const,
    accountScope: options.accountScope,
    queueId: queueId.toLowerCase(),
    queuedAt,
    autoSyncRegistered: true as const,
    signal,
  });
  const nextEntries = [...read.entries, entry];

  try {
    storage.setItem(
      CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
      serializeOutbox(nextEntries),
    );
    const verification = parseStoredOutbox(
      storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY),
      nowMs,
    );
    const verifiedEntry = verification.entries.find(
      (candidate) => candidate.queueId === entry.queueId,
    );
    if (!verifiedEntry) {
      return Object.freeze({ status: "unavailable" as const });
    }
    return Object.freeze({
      status: "queued" as const,
      entry: verifiedEntry,
      deduped: false,
      queueSize: verification.entries.length,
    });
  } catch {
    return Object.freeze({ status: "unavailable" as const });
  }
}

export function removeCalculatorRoutineOutboxEntry(
  storage: CalculatorRoutineOutboxStorage,
  queueId: string,
  receiptInput: unknown,
  nowMs = Date.now(),
) {
  const receipt = parseCalculatorRoutineDurableReceipt(receiptInput);
  if (!receipt || !UUID_PATTERN.test(queueId)) return false;
  const read = readCalculatorRoutineOutbox(storage, nowMs);
  if (read.status !== "ready") return false;
  const nextEntries = read.entries.filter(
    (entry) => entry.queueId !== queueId.toLowerCase(),
  );
  if (nextEntries.length === read.entries.length) return true;
  try {
    storage.setItem(
      CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY,
      serializeOutbox(nextEntries),
    );
    const verification = parseStoredOutbox(
      storage.getItem(CALCULATOR_ROUTINE_OUTBOX_STORAGE_KEY),
      nowMs,
    );
    return !verification.entries.some(
      (entry) => entry.queueId === queueId.toLowerCase(),
    );
  } catch {
    return false;
  }
}

export function parseCalculatorRoutineDurableReceipt(
  value: unknown,
): CalculatorRoutineDurableReceipt | null {
  if (
    !isPlainRecord(value) ||
    value.ok !== true ||
    (value.status !== "saved" && value.status !== "deduped") ||
    value.learningRecordSaved !== true ||
    typeof value.learningRecordId !== "string" ||
    !UUID_PATTERN.test(value.learningRecordId) ||
    value.deduped !== (value.status === "deduped")
  ) {
    return null;
  }
  return Object.freeze({
    status: value.status,
    learningRecordId: value.learningRecordId.toLowerCase(),
  });
}

export function buildCalculatorRoutineOfflineEvidence(
  entry: CalculatorRoutineOutboxEntryV1,
): Extract<FailureAwareStateEvidence, { kind: "offline" }> {
  const canonical = canonicalizeEntry(entry);
  if (!canonical) throw new Error("calculator-routine-outbox-invalid-entry");
  return Object.freeze({
    kind: "offline" as const,
    safety: Object.freeze({
      kind: "queued_for_sync" as const,
      queueId: canonical.queueId,
      queuedAt: canonical.queuedAt,
      autoSyncRegistered: true as const,
    }),
  });
}
