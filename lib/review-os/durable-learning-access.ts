import "server-only";

import {
  getServerSessionUser,
  type InvergeServerSession,
} from "@/lib/auth/session";

import {
  DURABLE_LEARNING_FLAG,
  DURABLE_LEARNING_OWNER_EMAILS,
} from "./durable-learning-contract";
import { isTrustedRepairOwnerEmail } from "./trusted-repair-owner-allowlist";

export class DurableLearningAccessError extends Error {
  readonly code: "feature_disabled" | "auth_required" | "owner_required";

  constructor(code: DurableLearningAccessError["code"]) {
    super(`durable-learning-access:${code}`);
    this.code = code;
  }
}

export function isDurableLearningEnabled() {
  return process.env[DURABLE_LEARNING_FLAG] === "true";
}

export function isDurableLearningOwner(email: string | null) {
  return (
    isDurableLearningEnabled() &&
    isTrustedRepairOwnerEmail(email, process.env.ALPHA_ADMIN_EMAILS) &&
    isTrustedRepairOwnerEmail(email, process.env[DURABLE_LEARNING_OWNER_EMAILS])
  );
}

export async function requireDurableLearningAccess(): Promise<
  InvergeServerSession & { userId: string }
> {
  if (!isDurableLearningEnabled()) {
    throw new DurableLearningAccessError("feature_disabled");
  }
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !session.userId) {
    throw new DurableLearningAccessError("auth_required");
  }
  if (!isDurableLearningOwner(session.email)) {
    throw new DurableLearningAccessError("owner_required");
  }
  return { ...session, userId: session.userId };
}

export function isDurableLearningAccessError(error: unknown) {
  return (
    error instanceof DurableLearningAccessError ||
    (error instanceof Error && error.message.startsWith("durable-learning-access:"))
  );
}
