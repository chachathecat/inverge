import { NextResponse } from "next/server";

import {
  createSmokeAuthCookieValue,
  DEV_SMOKE_AUTH_COOKIE,
  DEV_SMOKE_AUTH_EMAIL,
  DEV_SMOKE_AUTH_PASSWORD,
  isDevSmokeAuthEnabled,
  isLocalhostUrl,
} from "@/lib/auth/session";
import { getModeLabel, normalizePreferredSubjectsForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

async function findSmokeUserId(email: string) {
  if (process.env.DEV_SMOKE_AUTH_USER_ID) {
    return process.env.DEV_SMOKE_AUTH_USER_ID;
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const existing = await withTimeout(admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), 8_000, "smoke-auth-list-users-timeout");
  const found = existing.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (found?.id) return found.id;

  const created = await withTimeout(
    admin.auth.admin.createUser({
      email,
      password: DEV_SMOKE_AUTH_PASSWORD,
      email_confirm: true,
      user_metadata: { purpose: "local-dev-smoke-auth" },
    }),
    8_000,
    "smoke-auth-create-user-timeout",
  );
  if (created.error) {
    const retry = await withTimeout(admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), 8_000, "smoke-auth-retry-users-timeout");
    return retry.data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
  }
  return created.data.user?.id ?? null;
}

export async function POST(request: Request) {
  if (!isDevSmokeAuthEnabled() || !isLocalhostUrl(request.url)) {
    return NextResponse.json({ ok: false, error: "dev-smoke-auth-disabled" }, { status: 404 });
  }

  const mode = resolveAppraisalMode(null, new URL(request.url).searchParams.get("mode"));
  let userId: string | null = null;
  try {
    userId = await findSmokeUserId(DEV_SMOKE_AUTH_EMAIL);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "smoke-user-timeout" },
      { status: 503 },
    );
  }
  if (!userId) {
    userId = "00000000-0000-4000-8000-000000000001";
  }

  try {
    await withTimeout(reviewOsRepository.ensureAccess(userId, DEV_SMOKE_AUTH_EMAIL), 8_000, "smoke-auth-ensure-access-timeout");
    await withTimeout(
      reviewOsRepository.upsertStudyProfile(userId, {
        examName: getModeLabel(mode),
        examDate: null,
        preferredSubjects: normalizePreferredSubjectsForMode([], mode),
      }),
      8_000,
      "smoke-auth-profile-timeout",
    );
  } catch (error) {
    // Keep smoke auth deterministic without external services by falling back to cookie-based local session only.
  }

  const response = NextResponse.json({
    ok: true,
    userId,
    email: DEV_SMOKE_AUTH_EMAIL,
    mode,
    redirectTo: `/app?mode=${mode}`,
  });
  response.cookies.set(DEV_SMOKE_AUTH_COOKIE, createSmokeAuthCookieValue(userId, DEV_SMOKE_AUTH_EMAIL), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}

export async function DELETE(request: Request) {
  if (!isDevSmokeAuthEnabled() || !isLocalhostUrl(request.url)) {
    return NextResponse.json({ ok: false, error: "dev-smoke-auth-disabled" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEV_SMOKE_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
