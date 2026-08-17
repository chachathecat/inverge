import "server-only";

import {
  getServerSessionUser,
  type InvergeServerSession,
} from "@/lib/auth/session";

import {
  TRUSTED_REPAIR_FLAG,
  TRUSTED_REPAIR_LAW_FLAG,
  TRUSTED_REPAIR_THEORY_FLAG,
  type TrustedRepairSubject,
} from "./trusted-repair-contract";
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
  return (
    process.env[TRUSTED_REPAIR_FLAG] === "true" ||
    process.env[TRUSTED_REPAIR_THEORY_FLAG] === "true" ||
    process.env[TRUSTED_REPAIR_LAW_FLAG] === "true"
  );
}

export function trustedRepairAuthorizedSubjects(email: string | null) {
  if (!isTrustedRepairOwnerEmail(email, process.env.ALPHA_ADMIN_EMAILS)) {
    return [] as const;
  }
  const subjects: TrustedRepairSubject[] = [];
  if (
    process.env[TRUSTED_REPAIR_FLAG] === "true" &&
    isTrustedRepairOwnerEmail(email, process.env.WCV_C2R_C_P_OWNER_EMAILS)
  ) {
    subjects.push("appraisal_practical");
  }
  if (
    process.env[TRUSTED_REPAIR_THEORY_FLAG] === "true" &&
    isTrustedRepairOwnerEmail(email, process.env.WCV_C2R_C_T_OWNER_EMAILS)
  ) {
    subjects.push("appraisal_theory");
  }
  if (
    process.env[TRUSTED_REPAIR_LAW_FLAG] === "true" &&
    isTrustedRepairOwnerEmail(email, process.env.WCV_C2R_C_L_OWNER_EMAILS)
  ) {
    subjects.push("appraisal_law");
  }
  return subjects;
}

export function isTrustedRepairOwner(email: string | null) {
  return trustedRepairAuthorizedSubjects(email).length > 0;
}

export async function requireTrustedRepairAccess(): Promise<
  InvergeServerSession & {
    userId: string;
    trustedRepairSubjects: readonly TrustedRepairSubject[];
  }
> {
  if (!isTrustedRepairEnabled()) {
    throw new TrustedRepairAccessError("feature_disabled");
  }
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) {
    throw new TrustedRepairAccessError("auth_required");
  }
  const trustedRepairSubjects = trustedRepairAuthorizedSubjects(session.email);
  if (trustedRepairSubjects.length === 0) {
    throw new TrustedRepairAccessError("owner_required");
  }
  return { ...session, userId: session.userId, trustedRepairSubjects };
}

export function isTrustedRepairAccessError(error: unknown) {
  return (
    error instanceof TrustedRepairAccessError ||
    (error instanceof Error && error.message.startsWith("trusted-repair-access:"))
  );
}
