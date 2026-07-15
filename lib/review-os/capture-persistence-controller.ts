import {
  parseFailureAwareStateEvidence,
  parseFailureAwarePersistenceEvidence,
  type FailureAwarePersistenceEvidence,
  type FailureAwareStateEvidence,
} from "./failure-aware-state";

export const CAPTURE_PERSISTENCE_METADATA_KEYS = Object.freeze({
  operationId: "persistence_operation_id",
  workRevisionId: "persistence_work_revision_id",
} as const);

export type CaptureSaveOperationBinding = Readonly<{
  operationId: string;
  workRevisionId: string;
}>;

export type PendingCaptureSaveOperation = Readonly<{
  workFingerprint: string;
  binding: CaptureSaveOperationBinding;
}>;

type DurableCaptureRecord = Readonly<{
  id?: unknown;
  updatedAt?: unknown;
  rawPayload?: unknown;
}>;

export function createCaptureSaveOperationBinding(): CaptureSaveOperationBinding {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("s232f1-capture-persistence:secure-random-uuid-unavailable");
  }
  return Object.freeze({
    operationId: globalThis.crypto.randomUUID(),
    workRevisionId: globalThis.crypto.randomUUID(),
  });
}

/**
 * Keep the same operation binding while the exact in-memory work snapshot is
 * retried. This lets an accepted request whose response was lost converge when
 * the server returns the already-persisted record through its dedupe path.
 */
export function resolvePendingCaptureSaveOperation(
  pending: PendingCaptureSaveOperation | null,
  workFingerprint: string,
): PendingCaptureSaveOperation {
  if (!workFingerprint) {
    throw new Error("s232f1-capture-persistence:empty-work-fingerprint");
  }
  if (pending?.workFingerprint === workFingerprint) return pending;
  return Object.freeze({
    workFingerprint,
    binding: createCaptureSaveOperationBinding(),
  });
}

export function buildCapturePersistenceMetadata(
  operation: CaptureSaveOperationBinding,
): Readonly<Record<(typeof CAPTURE_PERSISTENCE_METADATA_KEYS)[keyof typeof CAPTURE_PERSISTENCE_METADATA_KEYS], string>> {
  return Object.freeze({
    [CAPTURE_PERSISTENCE_METADATA_KEYS.operationId]: operation.operationId,
    [CAPTURE_PERSISTENCE_METADATA_KEYS.workRevisionId]: operation.workRevisionId,
  });
}

function readConfirmedFields(rawPayload: unknown): Record<string, unknown> | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;
  const fields = (rawPayload as Record<string, unknown>).user_confirmed_fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return null;
  return fields as Record<string, unknown>;
}

function validatedReceipt(value: unknown): FailureAwarePersistenceEvidence | null {
  try {
    return parseFailureAwarePersistenceEvidence(value);
  } catch {
    return null;
  }
}

function validatedConflict(
  value: unknown,
): Extract<FailureAwareStateEvidence, { kind: "conflict" }> | null {
  try {
    const evidence = parseFailureAwareStateEvidence(value);
    return evidence.kind === "conflict" ? evidence : null;
  } catch {
    return null;
  }
}

/**
 * A durable completion is valid only when the stored raw payload echoes the
 * operation and work revision assigned to the submitted learner snapshot.
 */
export function buildDurableCapturePersistenceReceipt(
  record: DurableCaptureRecord,
  operation: CaptureSaveOperationBinding,
): FailureAwarePersistenceEvidence | null {
  const confirmedFields = readConfirmedFields(record.rawPayload);
  if (
    confirmedFields?.[CAPTURE_PERSISTENCE_METADATA_KEYS.operationId] !== operation.operationId ||
    confirmedFields?.[CAPTURE_PERSISTENCE_METADATA_KEYS.workRevisionId] !== operation.workRevisionId
  ) {
    return null;
  }
  return validatedReceipt({
    kind: "durable_record",
    recordId: record.id,
    operationId: operation.operationId,
    workRevisionId: operation.workRevisionId,
    persistedAt: record.updatedAt,
  });
}

/**
 * A deduped record that does not echo the current binding is a real revision
 * conflict, not a retryable save success. The record and the current learner
 * snapshot are the two compared sources; identifiers remain controller-only.
 */
export function buildCaptureDedupeConflictEvidence(
  record: DurableCaptureRecord,
  operation: CaptureSaveOperationBinding,
  comparedAt = new Date().toISOString(),
): Extract<FailureAwareStateEvidence, { kind: "conflict" }> | null {
  if (buildDurableCapturePersistenceReceipt(record, operation)) return null;
  const confirmedFields = readConfirmedFields(record.rawPayload);
  const persistedBinding = validatedReceipt({
    kind: "durable_record",
    recordId: record.id,
    operationId:
      confirmedFields?.[CAPTURE_PERSISTENCE_METADATA_KEYS.operationId],
    workRevisionId:
      confirmedFields?.[CAPTURE_PERSISTENCE_METADATA_KEYS.workRevisionId],
    persistedAt: record.updatedAt,
  });
  if (
    !persistedBinding ||
    persistedBinding.workRevisionId === operation.workRevisionId
  ) {
    return null;
  }
  return validatedConflict({
    kind: "conflict",
    operationId: operation.operationId,
    safety: { kind: "memory_only", retainedInMemory: true },
    sources: [
      {
        kind: "learner_record",
        sourceId: operation.workRevisionId,
        observedAt: comparedAt,
      },
      {
        kind: "persisted_record",
        sourceId: persistedBinding.workRevisionId,
        observedAt: record.updatedAt,
      },
    ],
    comparison: {
      kind: "source_mismatch",
      operationId: operation.operationId,
      leftSourceId: operation.workRevisionId,
      rightSourceId: persistedBinding.workRevisionId,
      comparator: "sync_revision",
      mismatchObserved: true,
      comparedAt,
    },
  });
}

export function buildCaptureCompletedEvidence(
  receipt: FailureAwarePersistenceEvidence,
): Extract<FailureAwareStateEvidence, { kind: "completed" }> {
  return {
    kind: "completed",
    operationId: receipt.operationId,
    workRevisionId: receipt.workRevisionId,
    persistence: receipt,
  };
}

export const CAPTURE_MEMORY_ONLY_SAVE_ERROR_EVIDENCE = Object.freeze({
  kind: "error",
  retryable: true,
  safety: Object.freeze({ kind: "memory_only", retainedInMemory: true }),
} satisfies Extract<FailureAwareStateEvidence, { kind: "error" }>);
