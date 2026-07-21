import "server-only";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import {
  getServerSessionUser,
  type InvergeServerSession,
} from "@/lib/auth/session";

import { OWNER_ALPHA_PRACTICE_FLAG } from "./owner-alpha-practice-contract";

export class OwnerAlphaPracticeAccessError extends Error {
  constructor(
    readonly code: "feature_disabled" | "owner_required" | "auth_required",
  ) {
    super(`owner-alpha-practice-access:${code}`);
  }
}

export function isOwnerAlphaPracticeEnabled() {
  return process.env[OWNER_ALPHA_PRACTICE_FLAG] === "true";
}

export async function requireOwnerAlphaPracticeAccess(): Promise<
  InvergeServerSession & { userId: string }
> {
  if (!isOwnerAlphaPracticeEnabled()) {
    throw new OwnerAlphaPracticeAccessError("feature_disabled");
  }

  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) {
    throw new OwnerAlphaPracticeAccessError("auth_required");
  }
  if (!isAllowedAdminEmail(session.email)) {
    throw new OwnerAlphaPracticeAccessError("owner_required");
  }
  return { ...session, userId: session.userId };
}

export function isOwnerAlphaPracticeAccessError(error: unknown) {
  return (
    error instanceof OwnerAlphaPracticeAccessError ||
    (error instanceof Error &&
      error.message.startsWith("owner-alpha-practice-access:"))
  );
}
