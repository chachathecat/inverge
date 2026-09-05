import "server-only";

import type { InvergeServerSession } from "@/lib/auth/session";

export const CORE_BLITZ_LEARNER_SUPPORT_FEATURE_FLAG =
  "CORE_BLITZ_LEARNER_SUPPORT_ENABLED" as const;
export const CORE_BLITZ_LEARNER_SUPPORT_OWNER_ALLOWLIST =
  "CORE_BLITZ_LEARNER_SUPPORT_OWNER_EMAILS" as const;

function emails(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function productionDenied() {
  if (process.env.VERCEL_ENV === "production") return true;
  return (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL_ENV !== "preview"
  );
}

export function hasCoreBlitzLearnerSupportOwnerAccess(
  session: InvergeServerSession,
) {
  if (
    process.env[CORE_BLITZ_LEARNER_SUPPORT_FEATURE_FLAG] !== "true" ||
    productionDenied() ||
    !session.authEnabled ||
    !session.isAuthenticated ||
    session.isDemo ||
    !session.userId ||
    !session.email
  ) {
    return false;
  }
  const email = session.email.trim().toLowerCase();
  return (
    emails(process.env.ALPHA_ADMIN_EMAILS).includes(email) &&
    emails(
      process.env[CORE_BLITZ_LEARNER_SUPPORT_OWNER_ALLOWLIST],
    ).includes(email)
  );
}
