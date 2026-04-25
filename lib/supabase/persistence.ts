import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/auth/session";

export class SupabasePersistenceUnavailableError extends Error {
  constructor() {
    super("supabase-persistence-unavailable");
  }
}

export class SupabasePersistenceOperationError extends Error {
  readonly operation: string;

  constructor(operation: string, message: string) {
    super(`supabase-operation-failed:${operation}:${message}`);
    this.operation = operation;
  }
}

export function isSupabasePersistenceUnavailableError(error: unknown) {
  return (
    error instanceof SupabasePersistenceUnavailableError ||
    (error instanceof Error && error.message === "supabase-persistence-unavailable")
  );
}

export function isSupabasePersistenceOperationError(error: unknown) {
  return (
    error instanceof SupabasePersistenceOperationError ||
    (error instanceof Error && error.message.startsWith("supabase-operation-failed:"))
  );
}

export function getSupabasePersistenceClient() {
  return createSupabaseAdminClient();
}

export function canUseSupabasePersistence(userId: string) {
  return Boolean(getSupabasePersistenceClient() && isUuid(userId));
}

export function requireSupabasePersistence(userId: string) {
  if (isUuid(userId) && !canUseSupabasePersistence(userId)) {
    throw new SupabasePersistenceUnavailableError();
  }
}

export function assertSupabaseOperation(
  operation: string,
  result: { error: { message?: string; code?: string } | null },
) {
  if (result.error) {
    const code = result.error.code ? `${result.error.code}:` : "";
    throw new SupabasePersistenceOperationError(operation, `${code}${result.error.message ?? "unknown-error"}`);
  }
}

export function toNullableIso(value?: string | null) {
  return value ?? null;
}

export async function upsertSingleJsonRecord(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
) {
  const { error } = await client.from(table).upsert(row);
  if (error) {
    throw error;
  }
}

export async function insertSingleJsonRecord(
  client: SupabaseClient,
  table: string,
  row: Record<string, unknown>,
) {
  const { error } = await client.from(table).insert(row);
  if (error) {
    throw error;
  }
}
