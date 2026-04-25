import { NextResponse } from "next/server";

import { getAppraisalMode, parseAppraisalMode } from "@/lib/review-os/appraisal";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { createOptionalSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

function parseCredentials(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.email !== "string" || typeof record.password !== "string") return null;
  return {
    email: record.email.trim(),
    password: record.password,
    mode: typeof record.mode === "string" ? parseAppraisalMode(record.mode) : null,
  };
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const credentials = parseCredentials(await request.json().catch(() => null));
  if (!credentials) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  const supabase = await createOptionalSupabaseRouteHandlerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase-not-configured" }, { status: 503 });
  }

  const { data, error } = await supabase.client.auth.signInWithPassword(credentials);
  if (error) {
    return supabase.applyToResponse(NextResponse.json({ ok: false, error: "auth-failed" }, { status: 400 }));
  }

  let redirectTo = credentials.mode ? `/app?mode=${credentials.mode}` : "/app/onboarding";
  if (data.user?.id) {
    try {
      const profile = await reviewOsRepository.getStudyProfile(data.user.id);
      redirectTo = credentials.mode
        ? `/app?mode=${credentials.mode}`
        : profile
          ? `/app?mode=${getAppraisalMode(profile.examName)}`
          : "/app/onboarding";
    } catch {
      redirectTo = credentials.mode ? `/app?mode=${credentials.mode}` : "/app/onboarding";
    }
  }

  return supabase.applyToResponse(NextResponse.json({ ok: true, redirectTo }));
}
