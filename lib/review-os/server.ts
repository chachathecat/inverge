import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { requireServerSession } from "@/lib/auth/session";
import type { InvergeServerSession } from "@/lib/auth/session";
import {
  buildReviewOsAccessResult,
  buildReviewOsAccessUnavailableResult,
  type ReviewOsAccessResult,
  type ReviewOsAccessUnavailableReason,
} from "@/lib/review-os/access-result";
import {
  isSupabasePersistenceOperationError,
  isSupabasePersistenceUnavailableError,
} from "@/lib/supabase/persistence";
import type {
  AccessState,
  StudyProfile,
  UsageSummary,
} from "@/lib/review-os/types";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { reviewOsService } from "@/lib/review-os/service";

type ReviewOsServerContextOptions = Readonly<{
  includeProfile?: boolean;
  includeUsage?: boolean;
}>;

export type ReviewOsServerContext = Readonly<{
  session: InvergeServerSession;
  access: ReviewOsAccessResult;
  profile: StudyProfile | null;
  usage: UsageSummary | null;
}>;

export async function getReviewOsServerContext(
  returnTo = "/app",
  options: ReviewOsServerContextOptions = {},
): Promise<ReviewOsServerContext> {
  const session = await requireServerSession(
    await resolveReviewOsReturnTo(returnTo),
  );

  if (!session.authEnabled) {
    const demoSession = {
      ...session,
      email: session.email ?? "demo@inverge.local",
    };
    return {
      session: demoSession,
      access: buildReviewOsAccessResult(buildDemoAccess(demoSession.email)),
      profile: null,
      usage: null,
    };
  }

  if (!session.userId) {
    throw new Error("review-os-authenticated-session-missing-user-id");
  }

  const access = await resolveReviewOsAccess(session.userId, session.email);
  if (access.status !== "allowed") {
    return { session, access, profile: null, usage: null };
  }

  const profile =
    options.includeProfile !== false
      ? await reviewOsRepository.getStudyProfile(session.userId)
      : null;
  const usage =
    options.includeUsage !== false && session.email
      ? await reviewOsService.getUsageSummaryAfterAccessCheck(
          session.userId,
          access,
        )
      : null;
  return { session, access, profile, usage };
}

export function buildReviewOsReturnTo(path: string, modeParam?: string | null) {
  if (modeParam !== "first" && modeParam !== "second") return path;
  return `${path}?mode=${modeParam}`;
}

async function resolveReviewOsReturnTo(returnTo: string) {
  if (returnTo.includes("?")) return returnTo;

  const headerStore = await headers();
  const candidates = [
    headerStore.get("x-inverge-current-path"),
    headerStore.get("next-url"),
    headerStore.get("x-forwarded-uri"),
    headerStore.get("x-invoke-path") && headerStore.get("x-invoke-query")
      ? `${headerStore.get("x-invoke-path")}?${headerStore.get("x-invoke-query")}`
      : null,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate, "http://inverge.local");
      if (parsed.pathname.startsWith("/app")) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      const modeParam = parsed.searchParams.get("mode");
      if (modeParam === "first" || modeParam === "second") {
        return buildReviewOsReturnTo(returnTo, modeParam);
      }
    } catch {
      continue;
    }
  }

  return returnTo;
}

function buildDemoAccess(email: string | null): AccessState {
  return {
    allowed: true,
    inviteStatus: "active",
    entitlementTier: "free_trial",
    email,
  };
}

const resolveReviewOsAccess = cache(async function resolveReviewOsAccess(
  userId: string,
  email: string | null,
): Promise<ReviewOsAccessResult> {
  try {
    const access = await reviewOsRepository.ensureAccess(userId, email);
    return buildReviewOsAccessResult(access);
  } catch (error) {
    const reason = getAccessUnavailableReason(error);
    if (!reason) throw error;

    console.warn("[review-os] access check unavailable", { reason });
    return buildReviewOsAccessUnavailableResult(reason);
  }
});

function getAccessUnavailableReason(
  error: unknown,
): ReviewOsAccessUnavailableReason | null {
  if (isSupabasePersistenceUnavailableError(error)) {
    return "persistence_unavailable";
  }
  if (isSupabasePersistenceOperationError(error)) {
    return "persistence_operation_failed";
  }
  return null;
}
