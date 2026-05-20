export type AnswerReviewFieldScoreInput = {
  koreanClarity: number;
  primaryFixQuality: number;
  skeletonUsefulness: number;
  nextActionClarity: number;
  saveMotivation: number;
  trustSafety: number;
  criticalFailure?: boolean;
};

export type AnswerReviewFieldScoreResult = {
  averageScore: number;
  paidPilotReady: boolean;
  status: "blocked" | "needs_iteration" | "beta_ready" | "paid_pilot_candidate";
  summary: string;
};

export function scoreAnswerReviewFieldResult(
  input: AnswerReviewFieldScoreInput,
): AnswerReviewFieldScoreResult {
  const scores = [
    input.koreanClarity,
    input.primaryFixQuality,
    input.skeletonUsefulness,
    input.nextActionClarity,
    input.saveMotivation,
    input.trustSafety,
  ];

  const averageScore = Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));

  if (input.criticalFailure === true) {
    return {
      averageScore,
      paidPilotReady: false,
      status: "blocked",
      summary: "Critical failure detected. Block this sample and iterate before beta usage.",
    };
  }

  if (scores.some((score) => score <= 2)) {
    return {
      averageScore,
      paidPilotReady: false,
      status: "needs_iteration",
      summary: "At least one field-trial dimension is weak (<=2). Improve result quality before advancing.",
    };
  }

  if (averageScore >= 4 && input.trustSafety >= 4 && input.koreanClarity >= 4) {
    return {
      averageScore,
      paidPilotReady: true,
      status: "paid_pilot_candidate",
      summary: "Result quality is strong and trust-safe. Candidate for paid pilot validation.",
    };
  }

  if (averageScore >= 3.5) {
    return {
      averageScore,
      paidPilotReady: false,
      status: "beta_ready",
      summary: "Result quality is acceptable for closed beta, but not ready for paid pilot yet.",
    };
  }

  return {
    averageScore,
    paidPilotReady: false,
    status: "needs_iteration",
    summary: "Average quality is below beta target. Iterate on output usefulness and clarity.",
  };
}
