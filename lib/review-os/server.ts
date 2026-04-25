import "server-only";

import { headers } from "next/headers";

import { requireServerSession } from "@/lib/auth/session";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { reviewOsService } from "@/lib/review-os/service";

export async function getReviewOsServerContext(returnTo = "/app") {
  const session = await requireServerSession(await resolveReviewOsReturnTo(returnTo));
  const access = session.userId ? await reviewOsRepository.ensureAccess(session.userId, session.email) : null;
  const profile = session.userId ? await reviewOsRepository.getStudyProfile(session.userId) : null;
  const usage =
    session.userId && session.email && access?.allowed
      ? await reviewOsService.getUsageSummary(session.userId, session.email)
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
    const query = candidate.includes("?") ? candidate.slice(candidate.indexOf("?")) : "";
    if (!query) continue;
    try {
      const params = new URLSearchParams(query.slice(1));
      return buildReviewOsReturnTo(returnTo, params.get("mode"));
    } catch {
      continue;
    }
  }

  return returnTo;
}
