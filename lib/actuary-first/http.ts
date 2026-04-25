import { NextResponse } from "next/server";
import { isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { ACTUARY_FIRST_MVP_USER_ID, type ActuaryFirstSubjectId } from "@/lib/actuary-first/types";

export async function getActuaryMvpUserId(request: Request) {
  return requireRequestUserId(request, ACTUARY_FIRST_MVP_USER_ID);
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
  return jsonError(fallbackMessage, fallbackStatus);
}

export function parseActuarySubjectId(value: string | null): ActuaryFirstSubjectId | undefined {
  return value === "probability" ? "probability" : undefined;
}
