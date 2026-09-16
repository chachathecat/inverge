export type SecondWriteReferenceStatus = "not_started" | "deferred" | "compared";
export type SecondWriteReferenceStepState = Readonly<{
  correctAnswer: string;
  referenceAnswerAddedAfterProduction: boolean;
  referenceComparisonStatus?: SecondWriteReferenceStatus;
}>;

export function secondWriteReferenceStatus(state: SecondWriteReferenceStepState): SecondWriteReferenceStatus {
  if (state.referenceComparisonStatus === "deferred") return "deferred";
  if (state.correctAnswer.trim().length >= 4 && state.referenceAnswerAddedAfterProduction) return "compared";
  // Old drafts used the same flag for an empty-reference defer action.
  return state.referenceAnswerAddedAfterProduction ? "deferred" : "not_started";
}

export function hasSecondWriteReferenceStep(state: SecondWriteReferenceStepState) {
  return secondWriteReferenceStatus(state) !== "not_started" || state.correctAnswer.trim().length >= 4;
}
