import "server-only";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import {
  getServerSessionUser,
  type InvergeServerSession,
} from "@/lib/auth/session";

import { TRUSTED_REPAIR_FLAG } from "./trusted-repair-contract";

export class TrustedRepairAccessError extends Error {
  readonly code: "feature_disabled" | "auth_required" | "owner_required";

  constructor(
    code: "feature_disabled" | "auth_required" | "owner_required",
  ) {
    super(`trusted-repair-access:${code}`);
    this.code = code;
  }
}

export function isTrustedRepairEnabled() {
  return process.env[TRUSTED_REPAIR_FLAG] === "true";
}

export function isTrustedRepairOwner(email: string | null) {
  return isAllowedAdminEmail(email);
}

export async function requireTrustedRepairAccess(): Promise<
  InvergeServerSession & { userId: string }
> {
  if (!isTrustedRepairEnabled()) {
    throw new TrustedRepairAccessError("feature_disabled");
  }
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) {
    throw new TrustedRepairAccessError("auth_required");
  }
  if (!isTrustedRepairOwner(session.email)) {
    throw new TrustedRepairAccessError("owner_required");
  }
  return { ...session, userId: session.userId };
}

export function isTrustedRepairAccessError(error: unknown) {
  return (
    error instanceof TrustedRepairAccessError ||
    (error instanceof Error && error.message.startsWith("trusted-repair-access:"))
  );
}
