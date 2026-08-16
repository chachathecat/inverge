import "server-only";

import {
  getServerSessionUser,
  type InvergeServerSession,
} from "@/lib/auth/session";

import { TRUSTED_REPAIR_FLAG } from "./trusted-repair-contract";
import { isTrustedRepairOwnerEmail } from "./trusted-repair-owner-allowlist";

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
  return isTrustedRepairOwnerEmail(
    email,
    process.env.WCV_C2R_C_P_OWNER_EMAILS,
  );
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
