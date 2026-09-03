import "server-only";

import crypto from "node:crypto";

import {
  assertNoRawUserDataInDerived,
  sanitizeLearningSignalMetadata,
} from "@/lib/review-os/data-boundary";
import {
  assertSupabaseOperation,
  getSupabasePersistenceClient,
  requireSupabasePersistence,
  SupabasePersistenceUnavailableError,
} from "@/lib/supabase/persistence";
import type {
  QfI1CandidateV1,
  QfI1ExposureV1,
} from "./qf-i1-bank-first";
import type {
  QfI1DurableAssignmentV1,
  QfI1DurableExposureV1,
  QfI1PersistencePortV1,
} from "./qf-i1-persistence";

export const QF_I1_REVIEW_OS_REPOSITORY_VERSION =
  "QFI1ReviewOsMetadataRepositoryV1" as const;

const CANDIDATE_SOURCE_TYPE = "question_foundry";
const CANDIDATE_TASK_TYPE = "qf_i1_candidate";
const ASSIGNMENT_EVENT = "qf_i1_assignment_created";
const PRESENTED_EVENT = "qf_i1_candidate_presented";
const COMPLETED_EVENT = "qf_i1_candidate_completed";

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function deterministicUuid(value: unknown) {
  const hex = crypto
    .createHash("sha256")
    .update(stableJson(value), "utf8")
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function clientFor(userId: string) {
  requireSupabasePersistence(userId);
  const client = getSupabasePersistenceClient();
  if (!client) throw new SupabasePersistenceUnavailableError();
  return client;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function ensureUsageRow(
  userId: string,
  input: Readonly<{
    rowId: string;
    eventName: string;
    entityId: string;
    metadataJson: Record<string, unknown>;
    occurredAt: string;
  }>,
) {
  const client = clientFor(userId);
  const metadataJson = sanitizeLearningSignalMetadata(input.metadataJson);
  assertNoRawUserDataInDerived(metadataJson);
  const expected = {
    id: input.rowId,
    user_id: userId,
    event_name: input.eventName,
    entity_type: "question_foundry_candidate",
    entity_id: input.entityId,
    metadata_json: metadataJson,
    created_at: input.occurredAt,
  };
  const inserted = await client.from("usage_events").insert(expected);
  if (!inserted.error) return "created" as const;
  if (inserted.error.code !== "23505") {
    assertSupabaseOperation("qf-i1.ensureUsageRow.insert", inserted);
  }
  const existingResult = await client
    .from("usage_events")
    .select(
      "id, user_id, event_name, entity_type, entity_id, metadata_json, created_at",
    )
    .eq("id", input.rowId)
    .eq("user_id", userId)
    .maybeSingle();
  assertSupabaseOperation("qf-i1.ensureUsageRow.selectExisting", existingResult);
  const existing = record(existingResult.data);
  const existingCreatedAt =
    typeof existing?.created_at === "string"
      ? Date.parse(existing.created_at)
      : Number.NaN;
  const identityMatches = Boolean(
    existing &&
      existing.id === expected.id &&
      existing.user_id === expected.user_id &&
      existing.event_name === expected.event_name &&
      existing.entity_type === expected.entity_type &&
      existing.entity_id === expected.entity_id &&
      stableJson(existing.metadata_json) === stableJson(expected.metadata_json) &&
      Number.isFinite(existingCreatedAt) &&
      existingCreatedAt === Date.parse(input.occurredAt),
  );
  if (!identityMatches) {
    throw new Error("qf-i1:usage-idempotency-conflict");
  }
  return "existing" as const;
}

export async function ensureQfI1CandidateMetadataV1(
  userId: string,
  input: Readonly<{
    examMode: "감정평가사 1차" | "감정평가사 2차";
    subject: string;
    candidate: QfI1CandidateV1;
    registeredAt: string;
  }>,
) {
  const client = clientFor(userId);
  const rowId = deterministicUuid({
    domain: "QF_I1_CANDIDATE_METADATA_V1",
    userId,
    candidateId: input.candidate.candidateId,
    candidateDigest: input.candidate.candidateDigest,
  });
  const metadataJson = sanitizeLearningSignalMetadata({
    contractVersion: QF_I1_REVIEW_OS_REPOSITORY_VERSION,
    qf_i1_candidate: input.candidate,
    containsRawContent: false,
    registeredAt: input.registeredAt,
  });
  assertNoRawUserDataInDerived(metadataJson);
  const expected = {
    id: rowId,
    user_id: userId,
    exam_mode: input.examMode,
    subject: input.subject,
    source_type: CANDIDATE_SOURCE_TYPE,
    derived_tags: ["question_foundry", input.candidate.bankClass.toLowerCase()],
    related_formulas: [],
    next_task_type: CANDIDATE_TASK_TYPE,
    next_task: "검증 상태에 맞는 문제 은행 배정 후보",
    metadata_json: metadataJson,
    created_at: input.registeredAt,
  };
  const inserted = await client.from("learning_signal_events").insert(expected);
  if (!inserted.error) {
    return Object.freeze({ status: "created" as const, rowId });
  }
  if (inserted.error.code !== "23505") {
    assertSupabaseOperation("qf-i1.ensureCandidate.insert", inserted);
  }
  const existingResult = await client
    .from("learning_signal_events")
    .select(
      "id, user_id, exam_mode, subject, source_type, derived_tags, related_formulas, next_task_type, next_task, metadata_json, created_at",
    )
    .eq("id", rowId)
    .eq("user_id", userId)
    .maybeSingle();
  assertSupabaseOperation("qf-i1.ensureCandidate.selectExisting", existingResult);
  const existing = record(existingResult.data);
  const existingCreatedAt =
    typeof existing?.created_at === "string"
      ? Date.parse(existing.created_at)
      : Number.NaN;
  const comparableExisting = existing
    ? {
        id: existing.id,
        user_id: existing.user_id,
        exam_mode: existing.exam_mode,
        subject: existing.subject,
        source_type: existing.source_type,
        derived_tags: existing.derived_tags,
        related_formulas: existing.related_formulas,
        next_task_type: existing.next_task_type,
        next_task: existing.next_task,
        metadata_json: existing.metadata_json,
      }
    : null;
  const { created_at: _createdAt, ...comparableExpected } = expected;
  if (
    !existing ||
    stableJson(comparableExisting) !== stableJson(comparableExpected) ||
    !Number.isFinite(existingCreatedAt) ||
    existingCreatedAt !== Date.parse(input.registeredAt)
  ) {
    throw new Error("qf-i1:candidate-idempotency-conflict");
  }
  return Object.freeze({ status: "existing" as const, rowId });
}

function readCandidate(value: unknown): QfI1CandidateV1 | null {
  const metadata = record(value);
  const candidate = record(metadata?.qf_i1_candidate);
  return candidate ? (candidate as unknown as QfI1CandidateV1) : null;
}

function readExposure(
  value: unknown,
  eventName: unknown,
  createdAt: unknown,
): QfI1ExposureV1 | null {
  const metadata = record(value);
  if (
    !metadata ||
    typeof metadata.candidateId !== "string" ||
    typeof metadata.familyId !== "string" ||
    typeof metadata.surfaceId !== "string" ||
    typeof createdAt !== "string"
  ) {
    return null;
  }
  return Object.freeze({
    candidateId: metadata.candidateId,
    familyId: metadata.familyId,
    surfaceId: metadata.surfaceId,
    occurredAt: createdAt,
    state: eventName === COMPLETED_EVENT ? "COMPLETED" : "PRESENTED",
  });
}

export function createQfI1ReviewOsPersistencePortV1(
  userId: string,
): QfI1PersistencePortV1 {
  return Object.freeze({
    async listCandidates() {
      const result = await clientFor(userId)
        .from("learning_signal_events")
        .select("metadata_json")
        .eq("user_id", userId)
        .eq("source_type", CANDIDATE_SOURCE_TYPE)
        .eq("next_task_type", CANDIDATE_TASK_TYPE)
        .order("created_at", { ascending: false })
        .limit(200);
      assertSupabaseOperation("qf-i1.listCandidates", result);
      return ((result.data ?? []) as Record<string, unknown>[])
        .map((row) => readCandidate(row.metadata_json))
        .filter((candidate): candidate is QfI1CandidateV1 => candidate !== null);
    },

    async listExposures(learnerScopeId) {
      const result = await clientFor(userId)
        .from("usage_events")
        .select("event_name, metadata_json, created_at")
        .eq("user_id", userId)
        .eq("entity_type", "question_foundry_candidate")
        .in("event_name", [PRESENTED_EVENT, COMPLETED_EVENT])
        .order("created_at", { ascending: true })
        .limit(500);
      assertSupabaseOperation("qf-i1.listExposures", result);
      return ((result.data ?? []) as Record<string, unknown>[])
        .filter((row) => {
          const metadata = record(row.metadata_json);
          return metadata?.learnerScopeId === learnerScopeId;
        })
        .map((row) =>
          readExposure(row.metadata_json, row.event_name, row.created_at),
        )
        .filter((exposure): exposure is QfI1ExposureV1 => exposure !== null);
    },

    async ensureAssignment(assignment) {
      const rowId = deterministicUuid({
        domain: "QF_I1_ASSIGNMENT_ROW_V1",
        assignmentId: assignment.assignmentId,
      });
      const status = await ensureUsageRow(userId, {
        rowId,
        eventName: ASSIGNMENT_EVENT,
        entityId: assignment.candidateId,
        occurredAt: assignment.assignedAt,
        metadataJson: {
          contractVersion: QF_I1_REVIEW_OS_REPOSITORY_VERSION,
          assignment,
          learnerScopeId: assignment.learnerScopeId,
          candidateId: assignment.candidateId,
          familyId: assignment.familyId,
          surfaceId: assignment.surfaceId,
          containsRawContent: false,
        },
      });
      const value: QfI1DurableAssignmentV1 = Object.freeze({
        ...assignment,
        durable: true,
      });
      return Object.freeze({ status, value });
    },

    async ensureExposure(exposure) {
      const rowId = deterministicUuid({
        domain: "QF_I1_EXPOSURE_ROW_V1",
        exposureId: exposure.exposureId,
      });
      const status = await ensureUsageRow(userId, {
        rowId,
        eventName: PRESENTED_EVENT,
        entityId: exposure.candidateId,
        occurredAt: exposure.occurredAt,
        metadataJson: {
          contractVersion: QF_I1_REVIEW_OS_REPOSITORY_VERSION,
          ...exposure,
          containsRawContent: false,
        },
      });
      const value: QfI1DurableExposureV1 = Object.freeze({
        ...exposure,
        durable: true,
      });
      return Object.freeze({ status, value });
    },
  });
}
