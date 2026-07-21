import crypto from "node:crypto";

export type OwnerAlphaCompletionProjection = {
  wrongAnswerItemId: string;
  reviewQueueItemId: string;
  todayActionSeedId: string;
  completionUsageEventId: string;
  followupUsageEventId: string;
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function ownerAlphaStableUuid(value: string) {
  const hex = sha256(value).slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = (["8", "9", "a", "b"] as const)[parseInt(hex[16], 16) % 4];
  const compact = hex.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

export function ownerAlphaCompletionProjection(
  userId: string,
  sessionId: string,
): OwnerAlphaCompletionProjection {
  return {
    wrongAnswerItemId: ownerAlphaStableUuid(`${userId}:${sessionId}:learning-record`),
    reviewQueueItemId: `${sessionId}:fixed-d1`,
    todayActionSeedId: ownerAlphaStableUuid(`${userId}:${sessionId}:today-action`),
    completionUsageEventId: ownerAlphaStableUuid(`${userId}:${sessionId}:completed`),
    followupUsageEventId: ownerAlphaStableUuid(`${userId}:${sessionId}:followup`),
  };
}
