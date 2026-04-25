import { NextResponse } from "next/server";

import { isAuthRequiredError } from "@/lib/auth/session";
import {
  ReviewOsBurstLimitError,
  ReviewOsConcurrentGenerationError,
  ReviewOsInviteRequiredError,
  ReviewOsUsageLimitError,
} from "@/lib/review-os/service";
import {
  isSupabasePersistenceOperationError,
  isSupabasePersistenceUnavailableError,
} from "@/lib/supabase/persistence";

export function reviewOsErrorResponse(error: unknown) {
  if (isAuthRequiredError(error)) {
    return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
  }
  if (error instanceof ReviewOsInviteRequiredError) {
    return NextResponse.json({ ok: false, error: "invite-required" }, { status: 403 });
  }
  if (error instanceof ReviewOsUsageLimitError) {
    return NextResponse.json({ ok: false, error: "usage-limit" }, { status: 402 });
  }
  if (error instanceof ReviewOsBurstLimitError) {
    return NextResponse.json({ ok: false, error: "rate-limit" }, { status: 429 });
  }
  if (error instanceof ReviewOsConcurrentGenerationError) {
    return NextResponse.json({ ok: false, error: "generation-in-progress" }, { status: 409 });
  }
  if (isSupabasePersistenceUnavailableError(error)) {
    return NextResponse.json({ ok: false, error: "supabase-persistence-unavailable" }, { status: 503 });
  }
  if (isSupabasePersistenceOperationError(error)) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "supabase-operation-failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "review-os-error" }, { status: 500 });
}
