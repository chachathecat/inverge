import type { AppraisalMode } from "@/lib/review-os/appraisal";
import type { ConfidenceLevel } from "@/lib/review-os/types";

type SchedulingPolicyKey =
  | "correct_confident_7d"
  | "correct_uncertain_3d"
  | "wrong_concept_gap_1d"
  | "wrong_repeated_retry_today_review_2d"
  | "second_stage_weak_paragraph_48h"
  | "fallback_3d";

export type ReviewScheduleInput = {
  mode: AppraisalMode;
  isCorrect: boolean;
  confidence: ConfidenceLevel;
  mistakeType?: string | null;
  recurrenceCount?: number;
  hasWeakParagraph?: boolean;
  now?: Date;
};

export type ReviewSchedule = {
  policy: SchedulingPolicyKey;
  reviewDueAt: string;
  nextReviewDate: string;
  retryDueAt: string | null;
  followUpReviewAt: string | null;
};

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addHours(base: Date, hours: number) {
  const next = new Date(base);
  next.setUTCHours(next.getUTCHours() + hours);
  return next;
}

function isConceptGap(mistakeType: string | null | undefined) {
  if (!mistakeType) return false;
  return ["개념 혼동", "암기 누락", "판례/논점 적용 부족", "구조 약함"].some((candidate) => mistakeType.includes(candidate));
}

function dateOnlyToIso(dateOnly: string) {
  return `${dateOnly}T00:00:00.000Z`;
}

function isConfident(confidence: ConfidenceLevel) {
  return confidence === "높음";
}

/**
 * Inverge spaced review scheduling policy (default).
 * Source of truth:
 * - docs/inverge-learning-engine-spec.md (Scheduling Policy)
 * - docs/inverge-learning-science.md (Principle 2, Principle 5)
 */
export function resolveReviewSchedule(input: ReviewScheduleInput): ReviewSchedule {
  const now = input.now ?? new Date();

  if (input.mode === "second" && input.hasWeakParagraph) {
    const rewriteDue = addHours(now, 48); // deterministic default within 24~72h window
    return {
      policy: "second_stage_weak_paragraph_48h",
      reviewDueAt: rewriteDue.toISOString(),
      nextReviewDate: toIsoDate(rewriteDue),
      retryDueAt: null,
      followUpReviewAt: null,
    };
  }

  if (!input.isCorrect && (input.recurrenceCount ?? 1) >= 2) {
    const followUp = addDays(now, 2);
    return {
      policy: "wrong_repeated_retry_today_review_2d",
      reviewDueAt: now.toISOString(),
      nextReviewDate: toIsoDate(followUp),
      retryDueAt: now.toISOString(),
      followUpReviewAt: followUp.toISOString(),
    };
  }

  if (input.isCorrect && isConfident(input.confidence)) {
    const due = addDays(now, 7);
    return {
      policy: "correct_confident_7d",
      reviewDueAt: due.toISOString(),
      nextReviewDate: toIsoDate(due),
      retryDueAt: null,
      followUpReviewAt: null,
    };
  }

  if (input.isCorrect && !isConfident(input.confidence)) {
    const due = addDays(now, 3);
    return {
      policy: "correct_uncertain_3d",
      reviewDueAt: due.toISOString(),
      nextReviewDate: toIsoDate(due),
      retryDueAt: null,
      followUpReviewAt: null,
    };
  }

  if (!input.isCorrect && isConceptGap(input.mistakeType)) {
    const due = addDays(now, 1);
    return {
      policy: "wrong_concept_gap_1d",
      reviewDueAt: due.toISOString(),
      nextReviewDate: toIsoDate(due),
      retryDueAt: null,
      followUpReviewAt: null,
    };
  }

  const fallback = addDays(now, 3);
  return {
    policy: "fallback_3d",
    reviewDueAt: fallback.toISOString(),
    nextReviewDate: toIsoDate(fallback),
    retryDueAt: null,
    followUpReviewAt: null,
  };
}

export function resolveScheduleOverrideDate(reviewDateOverride: string | null | undefined, fallbackDueAt: string) {
  if (!reviewDateOverride) return fallbackDueAt;
  return dateOnlyToIso(reviewDateOverride);
}
