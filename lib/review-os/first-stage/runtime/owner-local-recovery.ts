import type { PrivateSessionHistory } from "./session-service";
import { FirstStageKernelError, requiredUtcInstant } from "../kernel/domain";

/** Consumes only the session service's validated bodyless read projection.
 * Not a stored diagnosis, mastery estimate or authority for an early/new retry. */
export function projectOwnerLocalRecovery(history: PrivateSessionHistory, now: string) {
  requiredUtcInstant(now);
  if (history.contentMode !== "first_stage.owner_local_trial_session.v1") throw new FirstStageKernelError("adapter_mismatch");
  const attempts = history.committedAttempts;
  const latest = attempts.at(-1);
  const mismatches = attempts.filter(attempt => attempt.practiceDecision === "incorrect").length;
  const assisted = attempts.filter(attempt => attempt.assistanceLevel !== "none").length;
  const unanswered = attempts.filter(attempt => attempt.practiceDecision === "unanswered").length;
  const matches = attempts.filter(attempt => attempt.practiceDecision === "correct").length;
  const need = !latest ? "no_response" :
    latest.practiceDecision === "withheld" || latest.practiceDecision === "unavailable" || !latest.practiceDecision ? "result_unavailable" :
    latest.practiceDecision === "incorrect" ? (mismatches > 1 ? "repeated_key_mismatch" : "key_mismatch") :
    latest.practiceDecision === "unanswered" ? "response_missing" :
    latest.assistanceLevel !== "none" ? "assistance_confirmation" : "delayed_confirmation";
  const pending = history.reviews.filter(review => review.status === "pending")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.reviewTaskId.localeCompare(b.reviewTaskId));
  const available = pending.filter(review => review.stock === "available");
  const due = available.find(review => Date.parse(review.dueAt) <= Date.parse(now));
  const next = history.active ? "resume" : history.ready ? "begin" : due ? "due_practice" :
    available.length ? "wait_until_due" : pending.length ? "stock_required" :
    attempts.length ? "practice_processed" : "no_response";
  return {
    sessionId: history.sessionId, questionId: history.questionId, questionVersion: history.questionVersion,
    need, next, cause: "not_inferred" as const,
    mismatchCount: mismatches, assistedAttemptCount: assisted, unansweredCount: unanswered,
    matchedCount: matches, observedAttemptCount: attempts.length,
    // This is a planning preference among already eligible due actions only.
    // It cannot change canonical due dates, content admission or study capacity.
    duePriorityBonus: need === "repeated_key_mismatch" ? 300 : need === "key_mismatch" ? 150 :
      need === "response_missing" ? 100 : need === "assistance_confirmation" ? 50 : 0,
    reviewTaskId: due?.reviewTaskId ?? available[0]?.reviewTaskId ?? pending[0]?.reviewTaskId ?? null,
    dueAt: due?.dueAt ?? available[0]?.dueAt ?? pending[0]?.dueAt ?? null,
    feedbackAvailable: !history.active && Boolean(latest &&
      ["correct", "incorrect", "unanswered"].includes(latest.practiceDecision ?? "")),
    humanReviewComplete: false as const, independentPerformanceEstablished: false as const,
    masteryClaim: false as const, transferEvidence: false as const, measurementEvidence: false as const,
  };
}

export type OwnerLocalRecovery = ReturnType<typeof projectOwnerLocalRecovery>;
