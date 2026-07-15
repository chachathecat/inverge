import type { AccessState } from "@/lib/review-os/types";

export const REVIEW_OS_ACCESS_UNAVAILABLE_REASONS = [
  "persistence_unavailable",
  "persistence_operation_failed",
] as const;

export type ReviewOsAccessUnavailableReason =
  (typeof REVIEW_OS_ACCESS_UNAVAILABLE_REASONS)[number];

export type ReviewOsAccessResult =
  | Readonly<{
      status: "allowed";
      access: Readonly<Omit<AccessState, "allowed"> & { allowed: true }>;
    }>
  | Readonly<{
      status: "denied";
      access: Readonly<Omit<AccessState, "allowed"> & { allowed: false }>;
    }>
  | Readonly<{
      status: "unavailable";
      reason: ReviewOsAccessUnavailableReason;
      retryable: true;
      safety: Readonly<{
        kind: "unknown";
        preservationKnown: false;
      }>;
    }>;

/**
 * Converts a completed access lookup into a result whose status and boolean
 * cannot disagree. An unavailable lookup must use the separate constructor.
 */
export function buildReviewOsAccessResult(access: AccessState): ReviewOsAccessResult {
  if (access.allowed) {
    return Object.freeze({
      status: "allowed" as const,
      access: Object.freeze({ ...access, allowed: true as const }),
    });
  }

  return Object.freeze({
    status: "denied" as const,
    access: Object.freeze({ ...access, allowed: false as const }),
  });
}

/**
 * Access persistence can write profile metadata before a later read fails.
 * Therefore an unavailable result must never infer that data was unchanged,
 * saved, queued, or available offline.
 */
export function buildReviewOsAccessUnavailableResult(
  reason: ReviewOsAccessUnavailableReason,
): ReviewOsAccessResult {
  if (!(REVIEW_OS_ACCESS_UNAVAILABLE_REASONS as readonly string[]).includes(reason)) {
    throw new Error("review-os-access-result:unsupported-unavailable-reason");
  }

  return Object.freeze({
    status: "unavailable" as const,
    reason,
    retryable: true as const,
    safety: Object.freeze({
      kind: "unknown" as const,
      preservationKnown: false as const,
    }),
  });
}
