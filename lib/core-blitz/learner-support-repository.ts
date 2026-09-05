import "server-only";

import {
  assertSupabaseOperation,
  getSupabasePersistenceClient,
  requireSupabasePersistence,
  SupabasePersistenceUnavailableError,
} from "@/lib/supabase/persistence";
import {
  assertNoRawUserDataInDerived,
  sanitizeDerivedMetadata,
} from "@/lib/review-os/data-boundary";
import type { LearnerSupportUsageEventV1 } from "./learner-support-event";

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

function splitStoredMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const metadata = value as Record<string, unknown>;
  if (typeof metadata.occurredAt !== "string") return null;
  const identity = { ...metadata };
  delete identity.occurredAt;
  return Object.freeze({ identity, occurredAt: metadata.occurredAt });
}

export async function recordLearnerSupportUsageEventV1(
  userId: string,
  event: LearnerSupportUsageEventV1,
) {
  requireSupabasePersistence(userId);
  const client = getSupabasePersistenceClient();
  if (!client) throw new SupabasePersistenceUnavailableError();

  const metadataJson = sanitizeDerivedMetadata(event.metadataJson);
  assertNoRawUserDataInDerived(metadataJson);
  const expected = {
    id: event.eventId,
    user_id: userId,
    event_name: event.eventName,
    entity_type: event.entityType,
    entity_id: event.entityId,
    metadata_json: metadataJson,
    created_at: event.occurredAt,
  };

  const insertResult = await client.from("usage_events").insert(expected);
  if (!insertResult.error) {
    return Object.freeze({ status: "saved" as const, event });
  }
  if (insertResult.error.code !== "23505") {
    assertSupabaseOperation(
      "core-blitz.recordLearnerSupportUsageEventV1.insert",
      insertResult,
    );
  }

  const existingResult = await client
    .from("usage_events")
    .select(
      "id, user_id, event_name, entity_type, entity_id, metadata_json, created_at",
    )
    .eq("id", event.eventId)
    .eq("user_id", userId)
    .maybeSingle();
  assertSupabaseOperation(
    "core-blitz.recordLearnerSupportUsageEventV1.selectExisting",
    existingResult,
  );
  const existing = existingResult.data as Record<string, unknown> | null;
  const existingCreatedAt =
    typeof existing?.created_at === "string"
      ? Date.parse(existing.created_at)
      : Number.NaN;
  const existingMetadata = splitStoredMetadata(existing?.metadata_json);
  const expectedMetadata = splitStoredMetadata(expected.metadata_json);
  const existingMetadataOccurredAt = existingMetadata
    ? Date.parse(existingMetadata.occurredAt)
    : Number.NaN;
  const identityMatches = Boolean(
    existing &&
      existingMetadata &&
      expectedMetadata &&
      existing.id === expected.id &&
      existing.user_id === expected.user_id &&
      existing.event_name === expected.event_name &&
      existing.entity_type === expected.entity_type &&
      existing.entity_id === expected.entity_id &&
      stableJson(existingMetadata.identity) ===
        stableJson(expectedMetadata.identity) &&
      Number.isFinite(existingCreatedAt) &&
      Number.isFinite(existingMetadataOccurredAt) &&
      existingCreatedAt === existingMetadataOccurredAt,
  );
  if (!identityMatches) {
    throw new Error("core-blitz:learner-support-idempotency-conflict");
  }
  const canonicalEvent = Object.freeze({
    ...event,
    occurredAt: existingMetadata!.occurredAt,
    metadataJson: Object.freeze({
      ...event.metadataJson,
      occurredAt: existingMetadata!.occurredAt,
    }),
  });
  return Object.freeze({ status: "deduped" as const, event: canonicalEvent });
}
