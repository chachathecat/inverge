import { NextResponse } from "next/server";
import { isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { parseAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";
import { MVP_USER_ID, type SubjectId } from "@/lib/appraisal-first/types";
import { isSupabasePersistenceOperationError, isSupabasePersistenceUnavailableError } from "@/lib/supabase/persistence";

export async function getMvpUserId(request: Request) {
  return requireRequestUserId(request, MVP_USER_ID);
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function jsonAuthRequired() {
  return jsonError("auth-required", 401);
}

export function jsonRouteError(error: unknown, fallbackMessage: string, fallbackStatus = 400) {
  if (isAuthRequiredError(error)) {
    return jsonAuthRequired();
  }
  if (isSupabasePersistenceUnavailableError(error)) {
    return jsonError("supabase-persistence-unavailable", 503);
  }
  if (isSupabasePersistenceOperationError(error)) {
    return jsonError(error instanceof Error ? error.message : "supabase-operation-failed", 500);
  }
  return jsonError(fallbackMessage, fallbackStatus);
}

export function parseSubjectId(value: string | null): SubjectId | undefined {
  return parseAppraisalFirstSubjectId(value);
}
