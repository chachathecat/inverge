import { assertNoRawUserDataInDerived } from "./data-boundary";
import type { AppraiserExamMode } from "./curriculum-reference";
import type { PersonalLearningSourceEventType, PersonalLearningStatus } from "./personal-learning-state-engine";

export type PersonalLearningStateMetadata = Record<string, unknown>;

export type PersonalLearningStateRecord = {
  id?: string;
  userId: string;
  conceptNodeId: string;
  examMode: AppraiserExamMode;
  subject: string;
  status: PersonalLearningStatus;
  previousStatus?: PersonalLearningStatus | null;
  confidenceAvg?: number | null;
  wrongCount?: number;
  correctStreak?: number;
  recoveryScore?: number | null;
  lastSeenAt?: string | Date | null;
  nextReviewAt?: string | Date | null;
  lastSourceEventType?: PersonalLearningSourceEventType | string | null;
  lastTaskType?: string | null;
  lastReason?: string | null;
  priorityScore?: number | null;
  metadata?: PersonalLearningStateMetadata;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type StoredPersonalLearningStateRecord = Required<
  Pick<PersonalLearningStateRecord, "id" | "userId" | "conceptNodeId" | "examMode" | "subject" | "status" | "wrongCount" | "correctStreak" | "metadata">
> &
  Omit<PersonalLearningStateRecord, "id" | "userId" | "conceptNodeId" | "examMode" | "subject" | "status" | "wrongCount" | "correctStreak" | "metadata"> & {
    createdAt: string;
    updatedAt: string;
  };

export type PersonalLearningStateListOptions = {
  examMode?: AppraiserExamMode | "mixed";
  now?: string | Date;
  limit?: number;
};

export type PersonalLearningStateRepository = {
  upsertLearningState(state: PersonalLearningStateRecord): Promise<StoredPersonalLearningStateRecord> | StoredPersonalLearningStateRecord;
  getLearningState(userId: string, conceptNodeId: string): Promise<StoredPersonalLearningStateRecord | null> | StoredPersonalLearningStateRecord | null;
  listDueLearningStates(userId: string, options?: PersonalLearningStateListOptions): Promise<StoredPersonalLearningStateRecord[]> | StoredPersonalLearningStateRecord[];
  listLearningStatesByStatus(
    userId: string,
    status: PersonalLearningStatus,
    options?: Omit<PersonalLearningStateListOptions, "now">,
  ): Promise<StoredPersonalLearningStateRecord[]> | StoredPersonalLearningStateRecord[];
  deleteLearningStateForTest?(userId: string, conceptNodeId: string): Promise<void> | void;
};

const SUPPORTED_EXAM_MODES = new Set(["first", "second"]);
const SUPPORTED_STATUSES = new Set<PersonalLearningStatus>(["unknown", "confused", "wrong", "confident_wrong", "recovering", "stable"]);
const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "id",
  "userId",
  "conceptNodeId",
  "examMode",
  "subject",
  "status",
  "previousStatus",
  "confidenceAvg",
  "wrongCount",
  "correctStreak",
  "recoveryScore",
  "lastSeenAt",
  "nextReviewAt",
  "lastSourceEventType",
  "lastTaskType",
  "lastReason",
  "priorityScore",
  "metadata",
  "createdAt",
  "updatedAt",
]);

const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawUserText",
  "rawOcrText",
  "rawOCRText",
  "ocrText",
  "rawAnswerText",
  "answerText",
  "userAnswerText",
  "rawProblemText",
  "problemText",
  "questionText",
  "copyrightedText",
  "officialAnswer",
  "modelAnswer",
  "sourceText",
  "fullText",
  "originalText",
  "scorePrediction",
  "instructorComment",
  "graderComment",
]);
const FORBIDDEN_RAW_FIELD_PATTERN = /(raw|ocr|answer(?:Text|Body|Payload)?|problem(?:Text|Body|Payload)?|question(?:Text|Body|Payload)?|copyright|official|model|scorePrediction|instructor|grader|passFail|payload)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertSupportedPersonalLearningExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (!SUPPORTED_EXAM_MODES.has(String(examMode))) {
    throw new Error(`unsupported-personal-learning-state-exam-mode:${String(examMode)}`);
  }
}

export function assertSupportedPersonalLearningStatus(status: unknown): asserts status is PersonalLearningStatus {
  if (!SUPPORTED_STATUSES.has(status as PersonalLearningStatus)) {
    throw new Error(`unsupported-personal-learning-state-status:${String(status)}`);
  }
}

export function assertNoForbiddenPersonalLearningStateFields(value: unknown, path = "state"): void {
  assertNoRawUserDataInDerived(value);
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenPersonalLearningStateFields(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key) || FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`forbidden-personal-learning-state-field:${path}.${key}`);
    }
    assertNoForbiddenPersonalLearningStateFields(nested, `${path}.${key}`);
  }
}

function cleanRequiredText(value: unknown, fieldName: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) throw new Error(`personal-learning-state-repository-requires:${fieldName}`);
  return cleaned;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function nonNegativeInteger(value: unknown, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isInteger(numeric) || numeric < 0) throw new Error(`invalid-personal-learning-state-count:${String(value)}`);
  return numeric;
}

function toIso(value: string | Date | null | undefined, fallback: Date) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const ts = Date.parse(value);
    if (Number.isFinite(ts)) return new Date(ts).toISOString();
  }
  return fallback.toISOString();
}

function stableMetadata(value: unknown): PersonalLearningStateMetadata {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error("personal-learning-state-metadata-must-be-object");
  assertNoForbiddenPersonalLearningStateFields(value, "metadata");
  return sortObject(value) as PersonalLearningStateMetadata;
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
}

export function serializePersonalLearningStateDeterministically(state: StoredPersonalLearningStateRecord): string {
  return JSON.stringify(sortObject(state));
}

function generatedIdFor(userId: string, conceptNodeId: string) {
  const key = `${userId}:${conceptNodeId}`;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return `memory-pls-${hash.toString(16).padStart(8, "0")}`;
}

export function normalizePersonalLearningStateRecord(state: PersonalLearningStateRecord): StoredPersonalLearningStateRecord {
  assertNoForbiddenPersonalLearningStateFields(state);
  for (const key of Object.keys(state)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) throw new Error(`personal-learning-state-stores-metadata-only-fields:${key}`);
  }

  const userId = cleanRequiredText(state.userId, "userId");
  const conceptNodeId = cleanRequiredText(state.conceptNodeId, "conceptNodeId");
  assertSupportedPersonalLearningExamMode(state.examMode);
  assertSupportedPersonalLearningStatus(state.status);
  if (state.previousStatus !== undefined && state.previousStatus !== null) assertSupportedPersonalLearningStatus(state.previousStatus);

  const now = new Date();
  const createdAt = toIso(state.createdAt, now);
  const updatedAt = toIso(state.updatedAt, now);
  return {
    id: optionalText(state.id) ?? generatedIdFor(userId, conceptNodeId),
    userId,
    conceptNodeId,
    examMode: state.examMode,
    subject: cleanRequiredText(state.subject, "subject"),
    status: state.status,
    previousStatus: state.previousStatus ?? null,
    confidenceAvg: optionalNumber(state.confidenceAvg),
    wrongCount: nonNegativeInteger(state.wrongCount, 0),
    correctStreak: nonNegativeInteger(state.correctStreak, 0),
    recoveryScore: optionalNumber(state.recoveryScore),
    lastSeenAt: state.lastSeenAt ? toIso(state.lastSeenAt, now) : null,
    nextReviewAt: state.nextReviewAt ? toIso(state.nextReviewAt, now) : null,
    lastSourceEventType: optionalText(state.lastSourceEventType),
    lastTaskType: optionalText(state.lastTaskType),
    lastReason: optionalText(state.lastReason),
    priorityScore: optionalNumber(state.priorityScore),
    metadata: stableMetadata(state.metadata),
    createdAt,
    updatedAt,
  };
}

function cloneState(state: StoredPersonalLearningStateRecord): StoredPersonalLearningStateRecord {
  return JSON.parse(serializePersonalLearningStateDeterministically(state)) as StoredPersonalLearningStateRecord;
}

function stateKey(userId: string, conceptNodeId: string) {
  return `${userId}|${conceptNodeId}`;
}

export class InMemoryPersonalLearningStateRepository implements PersonalLearningStateRepository {
  private readonly store = new Map<string, StoredPersonalLearningStateRecord>();

  upsertLearningState(state: PersonalLearningStateRecord): StoredPersonalLearningStateRecord {
    const normalized = normalizePersonalLearningStateRecord(state);
    const key = stateKey(normalized.userId, normalized.conceptNodeId);
    const existing = this.store.get(key);
    const stored = { ...normalized, id: existing?.id ?? normalized.id, createdAt: existing?.createdAt ?? normalized.createdAt };
    this.store.set(key, stored);
    return cloneState(stored);
  }

  getLearningState(userId: string, conceptNodeId: string): StoredPersonalLearningStateRecord | null {
    assertNoForbiddenPersonalLearningStateFields({ userId, conceptNodeId });
    const stored = this.store.get(stateKey(cleanRequiredText(userId, "userId"), cleanRequiredText(conceptNodeId, "conceptNodeId")));
    return stored ? cloneState(stored) : null;
  }

  listDueLearningStates(userId: string, options: PersonalLearningStateListOptions = {}): StoredPersonalLearningStateRecord[] {
    assertNoForbiddenPersonalLearningStateFields({ userId, options });
    if (options.examMode && options.examMode !== "mixed") assertSupportedPersonalLearningExamMode(options.examMode);
    const cleanedUserId = cleanRequiredText(userId, "userId");
    const dueTs = Date.parse(toIso(options.now, new Date()));
    return [...this.store.values()]
      .filter((state) => state.userId === cleanedUserId)
      .filter((state) => !options.examMode || options.examMode === "mixed" || state.examMode === options.examMode)
      .filter((state) => state.nextReviewAt !== null && Date.parse(String(state.nextReviewAt)) <= dueTs)
      .sort(compareStates)
      .slice(0, options.limit ?? 50)
      .map(cloneState);
  }

  listLearningStatesByStatus(userId: string, status: PersonalLearningStatus, options: Omit<PersonalLearningStateListOptions, "now"> = {}): StoredPersonalLearningStateRecord[] {
    assertNoForbiddenPersonalLearningStateFields({ userId, status, options });
    assertSupportedPersonalLearningStatus(status);
    if (options.examMode && options.examMode !== "mixed") assertSupportedPersonalLearningExamMode(options.examMode);
    const cleanedUserId = cleanRequiredText(userId, "userId");
    return [...this.store.values()]
      .filter((state) => state.userId === cleanedUserId && state.status === status)
      .filter((state) => !options.examMode || options.examMode === "mixed" || state.examMode === options.examMode)
      .sort(compareStates)
      .slice(0, options.limit ?? 50)
      .map(cloneState);
  }

  deleteLearningStateForTest(userId: string, conceptNodeId: string): void {
    assertNoForbiddenPersonalLearningStateFields({ userId, conceptNodeId });
    this.store.delete(stateKey(cleanRequiredText(userId, "userId"), cleanRequiredText(conceptNodeId, "conceptNodeId")));
  }
}

function compareStates(left: StoredPersonalLearningStateRecord, right: StoredPersonalLearningStateRecord) {
  const leftPriority = left.priorityScore ?? 0;
  const rightPriority = right.priorityScore ?? 0;
  if (rightPriority !== leftPriority) return rightPriority - leftPriority;
  return String(left.nextReviewAt ?? "").localeCompare(String(right.nextReviewAt ?? "")) || left.conceptNodeId.localeCompare(right.conceptNodeId);
}

const defaultMemoryRepository = new InMemoryPersonalLearningStateRepository();

export function upsertLearningState(state: PersonalLearningStateRecord) {
  return defaultMemoryRepository.upsertLearningState(state);
}

export function getLearningState(userId: string, conceptNodeId: string) {
  return defaultMemoryRepository.getLearningState(userId, conceptNodeId);
}

export function listDueLearningStates(userId: string, options?: PersonalLearningStateListOptions) {
  return defaultMemoryRepository.listDueLearningStates(userId, options);
}

export function listLearningStatesByStatus(userId: string, status: PersonalLearningStatus, options?: Omit<PersonalLearningStateListOptions, "now">) {
  return defaultMemoryRepository.listLearningStatesByStatus(userId, status, options);
}

export function deleteLearningStateForTest(userId: string, conceptNodeId: string) {
  return defaultMemoryRepository.deleteLearningStateForTest(userId, conceptNodeId);
}
