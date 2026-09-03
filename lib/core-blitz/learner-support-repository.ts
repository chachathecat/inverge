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
  const expectedCreatedAt = Date.parse(event.occurredAt);
  const identityMatches = Boolean(
    existing &&
      existing.id === expected.id &&
      existing.user_id === expected.user_id &&
      existing.event_name === expected.event_name &&
      existing.entity_type === expected.entity_type &&
      existing.entity_id === expected.entity_id &&
      stableJson(existing.metadata_json) === stableJson(expected.metadata_json) &&
      Number.isFinite(existingCreatedAt) &&
      existingCreatedAt === expectedCreatedAt,
  );
  if (!identityMatches) {
    throw new Error("core-blitz:learner-support-idempotency-conflict");
  }
  return Object.freeze({ status: "deduped" as const, event });
}
