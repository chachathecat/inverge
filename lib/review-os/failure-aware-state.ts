export const FAILURE_AWARE_SYSTEM_STATES = [
  "loading",
  "empty",
  "error",
  "offline",
  "conflict",
  "completed",
] as const;

export type FailureAwareSystemState = (typeof FAILURE_AWARE_SYSTEM_STATES)[number];

export const FAILURE_AWARE_SAFETY_KINDS = [
  "not_applicable",
  "unchanged",
  "memory_only",
  "local_draft",
  "queued_for_sync",
  "persisted",
  "unknown",
] as const;

export type FailureAwareSafetyKind = (typeof FAILURE_AWARE_SAFETY_KINDS)[number];

export const FAILURE_AWARE_PERSISTENCE_KINDS = [
  "durable_record",
  "local_record",
] as const;

export type FailureAwarePersistenceKind =
  (typeof FAILURE_AWARE_PERSISTENCE_KINDS)[number];

export const FAILURE_AWARE_CONFLICT_SOURCE_KINDS = [
  "learner_record",
  "persisted_record",
  "reference_record",
  "manual_entry",
  "imported_record",
  "ocr_draft",
  "ai_draft",
] as const;

export type FailureAwareConflictSourceKind =
  (typeof FAILURE_AWARE_CONFLICT_SOURCE_KINDS)[number];

export const FAILURE_AWARE_CONFLICT_COMPARATORS = [
  "normalized_value",
  "record_revision",
  "sync_revision",
] as const;

export type FailureAwareConflictComparator =
  (typeof FAILURE_AWARE_CONFLICT_COMPARATORS)[number];

export type FailureAwarePersistenceEvidence = Readonly<{
  kind: FailureAwarePersistenceKind;
  recordId: string;
  operationId: string;
  workRevisionId: string;
  persistedAt: string;
}>;

export type FailureAwareSafetyEvidence =
  | Readonly<{ kind: "not_applicable" }>
  | Readonly<{ kind: "unchanged"; unchanged: true }>
  | Readonly<{ kind: "memory_only"; retainedInMemory: true }>
  | Readonly<{ kind: "local_draft"; localDraftId: string; persistedAt: string }>
  | Readonly<{
      kind: "queued_for_sync";
      queueId: string;
      queuedAt: string;
      autoSyncRegistered: true;
    }>
  | Readonly<{ kind: "persisted"; persistence: FailureAwarePersistenceEvidence }>
  | Readonly<{ kind: "unknown"; preservationKnown: false }>;

export type FailureAwareConflictSource = Readonly<{
  kind: FailureAwareConflictSourceKind;
  sourceId: string;
  observedAt: string;
}>;

export type FailureAwareConflictComparisonEvidence = Readonly<{
  kind: "source_mismatch";
  operationId: string;
  leftSourceId: string;
  rightSourceId: string;
  comparator: FailureAwareConflictComparator;
  mismatchObserved: true;
  comparedAt: string;
}>;

export type FailureAwareStateEvidence =
  | Readonly<{ kind: "loading"; safety: FailureAwareSafetyEvidence }>
  | Readonly<{ kind: "empty"; safety: FailureAwareSafetyEvidence }>
  | Readonly<{
      kind: "error";
      safety: FailureAwareSafetyEvidence;
      retryable: boolean;
    }>
  | Readonly<{ kind: "offline"; safety: FailureAwareSafetyEvidence }>
  | Readonly<{
      kind: "conflict";
      operationId: string;
      safety: FailureAwareSafetyEvidence;
      sources: readonly [
        FailureAwareConflictSource,
        FailureAwareConflictSource,
        ...FailureAwareConflictSource[],
      ];
      comparison: FailureAwareConflictComparisonEvidence;
    }>
  | Readonly<{
      kind: "completed";
      operationId: string;
      workRevisionId: string;
      persistence: FailureAwarePersistenceEvidence;
    }>;

export const FAILURE_AWARE_AUTHORITY_BOUNDARY = Object.freeze({
  learningSupportOnly: true,
  officialGradingAllowed: false,
  confirmedScoreAllowed: false,
  passProbabilityAllowed: false,
  modelAnswerAuthorityAllowed: false,
  deviceVerificationAllowed: false,
} as const);

export type FailureAwareStateModel = Readonly<{
  state: FailureAwareSystemState;
  title: string;
  happened: string;
  safety: Readonly<{
    kind: FailureAwareSafetyKind;
    message: string;
  }>;
  nextAction: string;
  retryable: boolean;
  autoSyncEligible: boolean;
  operationId: string | null;
  workRevisionId: string | null;
  conflictSourceCount: number;
  conflictSourceLabels: readonly string[];
  conflictComparator: FailureAwareConflictComparator | null;
  persistence: FailureAwarePersistenceEvidence | null;
  authorityBoundary: typeof FAILURE_AWARE_AUTHORITY_BOUNDARY;
}>;

export function shouldMoveFailureAwareHeadingFocus({
  enabled,
  previousState,
  nextState,
  activeElementWithinInstance,
}: Readonly<{
  enabled: boolean;
  previousState: FailureAwareSystemState;
  nextState: FailureAwareSystemState;
  activeElementWithinInstance: boolean;
}>): boolean {
  return enabled && previousState !== nextState && activeElementWithinInstance;
}

const EVIDENCE_KEYS: Record<FailureAwareStateEvidence["kind"], readonly string[]> = {
  loading: ["kind", "safety"],
  empty: ["kind", "safety"],
  error: ["kind", "retryable", "safety"],
  offline: ["kind", "safety"],
  conflict: ["comparison", "kind", "operationId", "safety", "sources"],
  completed: ["kind", "operationId", "persistence", "workRevisionId"],
};

const SAFETY_KEYS: Record<FailureAwareSafetyKind, readonly string[]> = {
  not_applicable: ["kind"],
  unchanged: ["kind", "unchanged"],
  memory_only: ["kind", "retainedInMemory"],
  local_draft: ["kind", "localDraftId", "persistedAt"],
  queued_for_sync: ["autoSyncRegistered", "kind", "queueId", "queuedAt"],
  persisted: ["kind", "persistence"],
  unknown: ["kind", "preservationKnown"],
};

const PERSISTENCE_KEYS = [
  "kind",
  "operationId",
  "persistedAt",
  "recordId",
  "workRevisionId",
] as const;
const CONFLICT_SOURCE_KEYS = ["kind", "observedAt", "sourceId"] as const;
const CONFLICT_COMPARISON_KEYS = [
  "comparator",
  "comparedAt",
  "kind",
  "leftSourceId",
  "mismatchObserved",
  "operationId",
  "rightSourceId",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;
const CANONICAL_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const CONFLICT_SOURCE_LABELS: Record<FailureAwareConflictSourceKind, string> = {
  learner_record: "학습자 기록",
  persisted_record: "저장된 학습 기록",
  reference_record: "참고 기록",
  manual_entry: "수동 입력 기록",
  imported_record: "가져온 기록",
  ocr_draft: "OCR 초안",
  ai_draft: "AI 분석 초안",
};

const CONFLICT_COMPARATOR_LABELS: Record<FailureAwareConflictComparator, string> = {
  normalized_value: "정규화된 값",
  record_revision: "기록 버전",
  sync_revision: "동기화 버전",
};

function contractError(message: string): Error {
  return new Error(`s232f0-failure-aware-state:${message}`);
}

function assertPlainObject(
  value: unknown,
  field: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw contractError(`${field}-must-be-a-plain-object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw contractError(`${field}-must-have-a-plain-prototype`);
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  field: string,
) {
  const allowed = new Set(allowedKeys);
  const missing = allowedKeys.filter((key) => !Object.hasOwn(value, key));
  const unsupported = Object.keys(value).filter((key) => !allowed.has(key));
  if (missing.length > 0) {
    throw contractError(`${field}-missing-fields:${missing.sort().join(",")}`);
  }
  if (unsupported.length > 0) {
    throw contractError(`${field}-unsupported-fields:${unsupported.sort().join(",")}`);
  }
}

function parseIdentifier(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw contractError(`${field}-must-be-a-uuid-or-ulid`);
  }
  if (UUID_PATTERN.test(value)) return value.toLowerCase();
  if (ULID_PATTERN.test(value)) return value.toUpperCase();
  throw contractError(`${field}-must-be-a-uuid-or-ulid`);
}

function parseTimestamp(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !CANONICAL_UTC_TIMESTAMP_PATTERN.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw contractError(`${field}-must-be-a-round-trippable-canonical-iso-timestamp`);
  }
  return value;
}

export function parseFailureAwarePersistenceEvidence(
  value: unknown,
): FailureAwarePersistenceEvidence {
  assertPlainObject(value, "persistence");
  assertExactKeys(value, PERSISTENCE_KEYS, "persistence");
  if (
    typeof value.kind !== "string" ||
    !(FAILURE_AWARE_PERSISTENCE_KINDS as readonly string[]).includes(value.kind)
  ) {
    throw contractError("unsupported-persistence-kind");
  }
  return Object.freeze({
    kind: value.kind as FailureAwarePersistenceKind,
    recordId: parseIdentifier(value.recordId, "persistence-record-id"),
    operationId: parseIdentifier(value.operationId, "persistence-operation-id"),
    workRevisionId: parseIdentifier(value.workRevisionId, "persistence-work-revision-id"),
    persistedAt: parseTimestamp(value.persistedAt, "persistence-time"),
  });
}

export function parseFailureAwareSafetyEvidence(
  value: unknown,
): FailureAwareSafetyEvidence {
  assertPlainObject(value, "safety");
  const kind = value.kind;
  if (typeof kind !== "string" || !Object.hasOwn(SAFETY_KEYS, kind)) {
    throw contractError("unsupported-safety-kind");
  }
  const safetyKind = kind as FailureAwareSafetyKind;
  assertExactKeys(value, SAFETY_KEYS[safetyKind], "safety");

  switch (safetyKind) {
    case "not_applicable":
      return Object.freeze({ kind: safetyKind });
    case "unchanged":
      if (value.unchanged !== true) throw contractError("unchanged-must-be-true");
      return Object.freeze({ kind: safetyKind, unchanged: true });
    case "memory_only":
      if (value.retainedInMemory !== true) {
        throw contractError("retained-in-memory-must-be-true");
      }
      return Object.freeze({ kind: safetyKind, retainedInMemory: true });
    case "local_draft":
      return Object.freeze({
        kind: safetyKind,
        localDraftId: parseIdentifier(value.localDraftId, "local-draft-id"),
        persistedAt: parseTimestamp(value.persistedAt, "local-draft-time"),
      });
    case "queued_for_sync":
      if (value.autoSyncRegistered !== true) {
        throw contractError("auto-sync-registered-must-be-true");
      }
      return Object.freeze({
        kind: safetyKind,
        queueId: parseIdentifier(value.queueId, "queue-id"),
        queuedAt: parseTimestamp(value.queuedAt, "queue-time"),
        autoSyncRegistered: true,
      });
    case "persisted":
      return Object.freeze({
        kind: safetyKind,
        persistence: parseFailureAwarePersistenceEvidence(value.persistence),
      });
    case "unknown":
      if (value.preservationKnown !== false) {
        throw contractError("preservation-known-must-be-false");
      }
      return Object.freeze({ kind: safetyKind, preservationKnown: false });
  }
}

export function parseFailureAwareConflictSources(
  value: unknown,
): readonly [
  FailureAwareConflictSource,
  FailureAwareConflictSource,
  ...FailureAwareConflictSource[],
] {
  if (!Array.isArray(value) || value.length < 2) {
    throw contractError("conflict-requires-at-least-two-sources");
  }
  const sources = value.map((candidate, index) => {
    assertPlainObject(candidate, `conflict-source-${index}`);
    assertExactKeys(candidate, CONFLICT_SOURCE_KEYS, `conflict-source-${index}`);
    if (
      typeof candidate.kind !== "string" ||
      !(FAILURE_AWARE_CONFLICT_SOURCE_KINDS as readonly string[]).includes(candidate.kind)
    ) {
      throw contractError("unsupported-conflict-source-kind");
    }
    return Object.freeze({
      kind: candidate.kind as FailureAwareConflictSourceKind,
      sourceId: parseIdentifier(candidate.sourceId, "conflict-source-id"),
      observedAt: parseTimestamp(candidate.observedAt, "conflict-source-time"),
    });
  });
  const uniqueSourceIds = new Set(sources.map((source) => source.sourceId));
  if (uniqueSourceIds.size !== sources.length) {
    throw contractError("conflict-sources-must-have-distinct-ids");
  }
  return Object.freeze(sources) as readonly [
    FailureAwareConflictSource,
    FailureAwareConflictSource,
    ...FailureAwareConflictSource[],
  ];
}

export function parseFailureAwareConflictComparison(
  value: unknown,
): FailureAwareConflictComparisonEvidence {
  assertPlainObject(value, "conflict-comparison");
  assertExactKeys(value, CONFLICT_COMPARISON_KEYS, "conflict-comparison");
  if (value.kind !== "source_mismatch") {
    throw contractError("unsupported-conflict-comparison-kind");
  }
  if (
    typeof value.comparator !== "string" ||
    !(FAILURE_AWARE_CONFLICT_COMPARATORS as readonly string[]).includes(value.comparator)
  ) {
    throw contractError("unsupported-conflict-comparator");
  }
  if (value.mismatchObserved !== true) {
    throw contractError("conflict-mismatch-observed-must-be-true");
  }
  const leftSourceId = parseIdentifier(value.leftSourceId, "conflict-left-source-id");
  const rightSourceId = parseIdentifier(value.rightSourceId, "conflict-right-source-id");
  if (leftSourceId === rightSourceId) {
    throw contractError("conflict-comparison-requires-two-distinct-sources");
  }
  return Object.freeze({
    kind: "source_mismatch" as const,
    operationId: parseIdentifier(value.operationId, "conflict-operation-id"),
    leftSourceId,
    rightSourceId,
    comparator: value.comparator as FailureAwareConflictComparator,
    mismatchObserved: true,
    comparedAt: parseTimestamp(value.comparedAt, "conflict-comparison-time"),
  });
}

export function parseFailureAwareStateEvidence(
  value: unknown,
): FailureAwareStateEvidence {
  assertPlainObject(value, "evidence");
  const kind = value.kind;
  if (typeof kind !== "string" || !Object.hasOwn(EVIDENCE_KEYS, kind)) {
    throw contractError("unsupported-system-state");
  }
  const state = kind as FailureAwareSystemState;
  assertExactKeys(value, EVIDENCE_KEYS[state], "evidence");

  if (state === "completed") {
    const operationId = parseIdentifier(value.operationId, "completed-operation-id");
    const workRevisionId = parseIdentifier(
      value.workRevisionId,
      "completed-work-revision-id",
    );
    const persistence = parseFailureAwarePersistenceEvidence(value.persistence);
    if (persistence.operationId !== operationId) {
      throw contractError("persistence-operation-does-not-match-completed-operation");
    }
    if (persistence.workRevisionId !== workRevisionId) {
      throw contractError("persistence-revision-does-not-match-completed-revision");
    }
    return Object.freeze({
      kind: state,
      operationId,
      workRevisionId,
      persistence,
    });
  }

  const safety = parseFailureAwareSafetyEvidence(value.safety);
  if (safety.kind === "queued_for_sync" && state !== "offline") {
    throw contractError("queued-for-sync-safety-is-offline-only");
  }

  switch (state) {
    case "loading":
    case "empty":
    case "offline":
      return Object.freeze({ kind: state, safety });
    case "error":
      if (typeof value.retryable !== "boolean") {
        throw contractError("retryable-must-be-boolean");
      }
      return Object.freeze({ kind: state, safety, retryable: value.retryable });
    case "conflict": {
      const operationId = parseIdentifier(value.operationId, "conflict-operation-id");
      const sources = parseFailureAwareConflictSources(value.sources);
      const comparison = parseFailureAwareConflictComparison(value.comparison);
      if (comparison.operationId !== operationId) {
        throw contractError("comparison-operation-does-not-match-conflict-operation");
      }
      const sourceIds = new Set(sources.map((source) => source.sourceId));
      if (
        !sourceIds.has(comparison.leftSourceId) ||
        !sourceIds.has(comparison.rightSourceId)
      ) {
        throw contractError("comparison-sources-must-exist-in-conflict-sources");
      }
      return Object.freeze({
        kind: state,
        operationId,
        safety,
        sources,
        comparison,
      });
    }
  }
}

function safetyMessage(evidence: FailureAwareSafetyEvidence): string {
  switch (evidence.kind) {
    case "not_applicable":
      return "변경된 입력이 없어 보호할 내용이 없습니다.";
    case "unchanged":
      return "이미 저장된 데이터는 바뀌지 않았습니다.";
    case "memory_only":
      return "입력은 현재 화면에만 남아 있으며 아직 저장되지 않았습니다.";
    case "local_draft":
      return "입력은 이 기기의 임시 저장에 남아 있습니다.";
    case "queued_for_sync":
      return "입력은 이 기기의 전송 대기열에 저장되어 있습니다.";
    case "persisted":
      return evidence.persistence.kind === "durable_record"
        ? "저장소의 기록으로 남아 있습니다."
        : "이 기기의 저장 기록으로 남아 있습니다.";
    case "unknown":
      return "입력과 데이터의 보존 여부를 확인할 수 없습니다.";
  }
}

function persistedSafety(
  persistence: FailureAwarePersistenceEvidence,
): FailureAwareStateModel["safety"] {
  return Object.freeze({
    kind: "persisted" as const,
    message:
      persistence.kind === "durable_record"
        ? "저장소의 기록으로 남아 있습니다."
        : "이 기기의 저장 기록으로 남아 있습니다.",
  });
}

/**
 * Turns strict controller metadata into one truthful Korean state model. The
 * model never derives authority or a success state from unbound evidence.
 */
export function buildFailureAwareStateModel(value: unknown): FailureAwareStateModel {
  const evidence = parseFailureAwareStateEvidence(value);
  const base = {
    retryable: false,
    autoSyncEligible: false,
    operationId: null,
    workRevisionId: null,
    conflictSourceCount: 0,
    conflictSourceLabels: Object.freeze([]) as readonly string[],
    conflictComparator: null,
    persistence: null,
    authorityBoundary: FAILURE_AWARE_AUTHORITY_BOUNDARY,
  } as const;

  switch (evidence.kind) {
    case "loading":
      return Object.freeze({
        ...base,
        state: evidence.kind,
        title: "불러오는 중",
        happened: "필요한 정보를 불러오고 있습니다.",
        safety: Object.freeze({
          kind: evidence.safety.kind,
          message: safetyMessage(evidence.safety),
        }),
        nextAction: "잠시 기다려 주세요.",
      });
    case "empty":
      return Object.freeze({
        ...base,
        state: evidence.kind,
        title: "아직 기록이 없습니다",
        happened: "지금 표시할 학습 기록이 없습니다.",
        safety: Object.freeze({
          kind: evidence.safety.kind,
          message: safetyMessage(evidence.safety),
        }),
        nextAction: "새 기록을 만들거나 이전 화면으로 돌아가세요.",
      });
    case "error":
      return Object.freeze({
        ...base,
        state: evidence.kind,
        title: "요청을 마치지 못했습니다",
        happened: "방금 요청이 끝까지 처리되지 않았습니다.",
        safety: Object.freeze({
          kind: evidence.safety.kind,
          message: safetyMessage(evidence.safety),
        }),
        nextAction: evidence.retryable
          ? "입력 보존 상태를 확인한 뒤 다시 시도하세요."
          : "현재 상태를 유지하고 도움말 또는 이전 화면을 이용하세요.",
        retryable: evidence.retryable,
      });
    case "offline": {
      const autoSyncEligible = evidence.safety.kind === "queued_for_sync";
      return Object.freeze({
        ...base,
        state: evidence.kind,
        title: "인터넷 연결이 없습니다",
        happened: "네트워크가 끊겨 온라인 요청을 보낼 수 없습니다.",
        safety: Object.freeze({
          kind: evidence.safety.kind,
          message: safetyMessage(evidence.safety),
        }),
        nextAction: autoSyncEligible
          ? "자동 재시도가 대기열에 등록되어 있습니다. 연결 후 전송 성공 여부를 확인하세요."
          : "연결을 확인한 뒤 필요한 작업을 다시 시도하세요.",
        retryable: !autoSyncEligible,
        autoSyncEligible,
      });
    }
    case "conflict":
      return Object.freeze({
        ...base,
        state: evidence.kind,
        title: "비교 결과가 다릅니다",
        happened: `${CONFLICT_COMPARATOR_LABELS[evidence.comparison.comparator]} 비교에서 두 근거가 일치하지 않았습니다.`,
        safety: Object.freeze({
          kind: evidence.safety.kind,
          message: safetyMessage(evidence.safety),
        }),
        nextAction: "비교한 두 근거를 확인하고 사용할 내용을 선택하세요.",
        operationId: evidence.operationId,
        conflictSourceCount: evidence.sources.length,
        conflictSourceLabels: Object.freeze(
          evidence.sources.map((source) => CONFLICT_SOURCE_LABELS[source.kind]),
        ),
        conflictComparator: evidence.comparison.comparator,
      });
    case "completed":
      return Object.freeze({
        ...base,
        state: evidence.kind,
        title: "저장이 끝났습니다",
        happened:
          evidence.persistence.kind === "durable_record"
            ? "현재 작업 버전이 저장소에 기록되었습니다."
            : "현재 작업 버전이 이 기기에 기록되었습니다.",
        safety: persistedSafety(evidence.persistence),
        nextAction: "저장된 기록을 확인하거나 다음 학습 단계로 이동하세요.",
        operationId: evidence.operationId,
        workRevisionId: evidence.workRevisionId,
        persistence: evidence.persistence,
      });
  }
}
