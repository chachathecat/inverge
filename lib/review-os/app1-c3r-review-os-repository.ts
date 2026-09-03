import "server-only";

import {
  assertNoRawUserDataInDerived,
  sanitizeLearningSignalMetadata,
} from "./data-boundary";
import {
  assertSupabaseOperation,
  getSupabasePersistenceClient,
  requireSupabasePersistence,
  SupabasePersistenceUnavailableError,
} from "../supabase/persistence";
import type { WrongAnswerItemRecord } from "./types";
import {
  APP1_C3R_REVIEW_OS_ADAPTER_VERSION,
  materializeApp1C3rReviewOsAdapterV1,
  type App1C3rJourneyProjectionV1,
  type App1C3rReviewOsStoragePortV1,
} from "./app1-c3r-review-os-adapter";

export const APP1_C3R_REVIEW_OS_REPOSITORY_VERSION =
  "app1_c3r_review_os_repository.v1" as const;

const JOURNEY_SOURCE_TYPE = "app1_c3r_handoff";
const JOURNEY_TASK_TYPE = "c3r_d1_unaided_review";

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

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(source[key])}`)
    .join(",")}}`;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function expectedJourneyRow(projection: App1C3rJourneyProjectionV1) {
  const metadataJson = sanitizeLearningSignalMetadata({
    contractVersion: APP1_C3R_REVIEW_OS_REPOSITORY_VERSION,
    adapterVersion: APP1_C3R_REVIEW_OS_ADAPTER_VERSION,
    journeyKey: projection.journeyKey,
    itemId: projection.itemId,
    repairRevisionId: projection.repairRevisionId,
    track: projection.track,
    c3rRoute: projection.c3rRoute,
    state: projection.state,
    masteryCreated: false,
    transferCreated: false,
    containsRawContent: false,
  });
  assertNoRawUserDataInDerived(metadataJson);
  return {
    id: projection.journeyId,
    user_id: projection.userId,
    exam_mode: "감정평가사 2차",
    subject: projection.subject,
    source_type: JOURNEY_SOURCE_TYPE,
    derived_tags: [
      "app1_c3r",
      projection.track.toLowerCase(),
      "d1_unaided_review_required",
    ],
    related_formulas: [],
    next_task_type: JOURNEY_TASK_TYPE,
    next_task: "D+1에 답을 보지 않고 보강한 연결을 다시 작성합니다.",
    metadata_json: metadataJson,
    created_at: projection.createdAt,
  };
}

function comparableJourneyRow(value: Record<string, unknown>) {
  return {
    id: value.id,
    user_id: value.user_id,
    exam_mode: value.exam_mode,
    subject: value.subject,
    source_type: value.source_type,
    derived_tags: value.derived_tags,
    related_formulas: value.related_formulas,
    next_task_type: value.next_task_type,
    next_task: value.next_task,
    metadata_json: value.metadata_json,
  };
}

export function createApp1C3rReviewOsStoragePortV1(
  userId: string,
): App1C3rReviewOsStoragePortV1 {
  return Object.freeze({
    async ensureJourneyProjection(projection) {
      if (projection.userId !== userId) {
        throw new Error("app1-c3r-review-os:user-binding-conflict");
      }
      const expected = expectedJourneyRow(projection);
      const inserted = await clientFor(userId)
        .from("learning_signal_events")
        .insert(expected);
      if (!inserted.error) {
        return Object.freeze({
          status: "created" as const,
          value: projection,
        });
      }
      if (inserted.error.code !== "23505") {
        assertSupabaseOperation(
          "app1-c3r-review-os.ensureJourney.insert",
          inserted,
        );
      }
      const existingResult = await clientFor(userId)
        .from("learning_signal_events")
        .select(
          "id, user_id, exam_mode, subject, source_type, derived_tags, related_formulas, next_task_type, next_task, metadata_json, created_at",
        )
        .eq("id", projection.journeyId)
        .eq("user_id", userId)
        .maybeSingle();
      assertSupabaseOperation(
        "app1-c3r-review-os.ensureJourney.selectExisting",
        existingResult,
      );
      const existing = record(existingResult.data);
      if (
        !existing ||
        stableJson(comparableJourneyRow(existing)) !==
          stableJson(comparableJourneyRow(expected)) ||
        normalizeTimestamp(existing.created_at) !== projection.createdAt
      ) {
        throw new Error("app1-c3r-review-os:journey-idempotency-conflict");
      }
      return Object.freeze({
        status: "existing" as const,
        value: projection,
      });
    },

    async loadReviewQueueUnit(input) {
      if (input.userId !== userId) {
        throw new Error("app1-c3r-review-os:user-binding-conflict");
      }
      const result = await clientFor(userId)
        .from("review_queue_items")
        .select(
          "id, user_id, exam_id, subject_id, stage, source_submission_id, source_kind, status, raw_payload",
        )
        .eq("id", input.reviewUnitId)
        .eq("user_id", userId)
        .eq("source_submission_id", input.itemId)
        .maybeSingle();
      assertSupabaseOperation(
        "app1-c3r-review-os.loadReviewQueueUnit",
        result,
      );
      const row = record(result.data);
      if (!row) return null;
      const rawPayload = record(row.raw_payload);
      const dueAt = normalizeTimestamp(rawPayload?.dueAt);
      if (
        row.id !== input.reviewUnitId ||
        row.user_id !== userId ||
        row.exam_id !== "wrong_answer_os" ||
        typeof row.subject_id !== "string" ||
        row.stage !== "alpha" ||
        row.source_submission_id !== input.itemId ||
        row.source_kind !== "wrong_answer" ||
        !["pending", "completed"].includes(String(row.status)) ||
        !dueAt
      ) {
        throw new Error("app1-c3r-review-os:review-unit-binding-conflict");
      }
      return Object.freeze({
        reviewUnitId: String(row.id),
        userId,
        itemId: String(row.source_submission_id),
        subject: row.subject_id,
        status: row.status as "pending" | "completed",
        dueAt,
      });
    },
  });
}

export async function materializeApp1C3rReviewOsHandoffV1(
  userId: string,
  item: WrongAnswerItemRecord,
) {
  return materializeApp1C3rReviewOsAdapterV1({
    userId,
    item,
    storage: createApp1C3rReviewOsStoragePortV1(userId),
  });
}
