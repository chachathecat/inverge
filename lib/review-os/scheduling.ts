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

export type AdaptiveScheduleInput = {
  mode: "first" | "second";
  confidence: "낮음" | "중간" | "높음";
  recurrenceCount: number;
  mistakeType: string;
  taskType: "retry" | "rewrite" | "review" | "recall";
  completedAction?: string;
  trapCardsCompleted?: boolean;
  rewriteComparisonRisk?: string;
  now?: Date;
};

export type AdaptiveScheduleResult = {
  nextReviewDate: string;
  policy: string;
  explanation: string;
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
  return ["개념 부족", "헷갈리는 개념과 혼동", "개념 혼동", "암기 누락"].some((candidate) => mistakeType.includes(candidate));
}

function dateOnlyToIso(dateOnly: string) {
  return `${dateOnly}T00:00:00.000Z`;
}

function isConfident(confidence: ConfidenceLevel) {
  return confidence === "높음";
}

function hasToken(value: string | null | undefined, tokens: string[]) {
  if (!value) return false;
  return tokens.some((token) => value.includes(token));
}

export function resolveAdaptiveReviewSchedule(input: AdaptiveScheduleInput): AdaptiveScheduleResult {
  const now = input.now ?? new Date();
  const recurrenceCount = Number.isFinite(input.recurrenceCount) ? input.recurrenceCount : 0;
  const isRepeated = recurrenceCount >= 2;
  const mistakeType = input.mistakeType ?? "";
  const risk = input.rewriteComparisonRisk ?? "";

  const asResult = (days: number, policy: string, explanation: string): AdaptiveScheduleResult => {
    const due = addDays(now, days);
    return { nextReviewDate: toIsoDate(due), policy, explanation };
  };

  if (input.mode === "first") {
    if (hasToken(mistakeType, ["계산", "단위"])) return asResult(2, "first_calculation_or_unit_2d", "계산·단위 실수라 2일 뒤에 다시 확인합니다.");
    if (input.confidence === "낮음" || isRepeated) return asResult(1, "first_low_confidence_or_repeated_1d", "반복/저확신 신호라 내일 짧게 다시 봅니다.");
    if (input.trapCardsCompleted && input.confidence === "높음") return asResult(4, "first_trap_done_high_confidence_4d", "함정카드 완료와 높은 확신이 확인되어 4일 뒤로 둡니다.");
    return asResult(2, "first_default_2d", "기억 고정을 위해 2일 뒤에 다시 점검합니다.");
  }

  if (hasToken(mistakeType, ["논점 누락", "누락", "구조"])) return asResult(2, "second_missing_issue_or_structure_2d", "누락/구조 간극이 있어 2일 뒤에 보강합니다.");
  if (hasToken(mistakeType, ["법", "조문", "요건 누락"])) return asResult(2, "second_law_requirement_omission_2d", "법적 요건 누락 신호라 2일 뒤에 다시 씁니다.");
  if (hasToken(input.completedAction, ["rewrite"])) {
    if (hasToken(risk, ["남", "위험", "미흡", "불안정", "high"])) return asResult(2, "second_rewrite_remaining_risk_2d", "다시썼지만 위험 신호가 남아 2일 뒤에 점검합니다.");
    return asResult(4, "second_rewrite_stable_4d", "다시쓰기 후 흐름이 안정되어 4일 뒤에 확인합니다.");
  }
  return asResult(2, "second_default_2d", "핵심 논리 유지를 위해 2일 뒤에 다시 확인합니다.");
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
  // Manual date-only override (YYYY-MM-DD) is normalized to deterministic UTC date-start ISO.
  return dateOnlyToIso(reviewDateOverride);
}
