import "server-only";

import { headers } from "next/headers";

import { requireServerSession } from "@/lib/auth/session";
import { isSupabasePersistenceOperationError, isSupabasePersistenceUnavailableError } from "@/lib/supabase/persistence";
import type { AccessState } from "@/lib/review-os/types";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { reviewOsService } from "@/lib/review-os/service";

export async function getReviewOsServerContext(returnTo = "/app") {
  const session = await requireServerSession(await resolveReviewOsReturnTo(returnTo));

  if (!session.authEnabled) {
    const demoSession = { ...session, email: session.email ?? "demo@inverge.local" };
    return {
      session: demoSession,
      access: buildFallbackAccess(demoSession.email, true),
      profile: null,
      usage: null,
    };
  }

  try {
    const access = session.userId ? await reviewOsRepository.ensureAccess(session.userId, session.email) : null;
    const profile = session.userId ? await reviewOsRepository.getStudyProfile(session.userId) : null;
    const usage =
      session.userId && session.email && access?.allowed
        ? await reviewOsService.getUsageSummary(session.userId, session.email)
        : null;
    return { session, access, profile, usage };
  } catch (error) {
    if (isSafeAccessFallbackError(error)) {
      console.warn("[review-os] closed beta access fallback", error);
      return {
        session,
        access: buildFallbackAccess(session.email, false),
        profile: null,
        usage: null,
      };
    }

    throw error;
  }
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

function buildFallbackAccess(email: string | null, allowed: boolean): AccessState {
  return {
    allowed,
    inviteStatus: allowed ? "active" : "pending",
    entitlementTier: "free_trial",
    email,
  };
}

function isSafeAccessFallbackError(error: unknown) {
  return isSupabasePersistenceUnavailableError(error) || isSupabasePersistenceOperationError(error);
}
