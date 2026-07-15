export type SecondWriteReferenceStepState = Readonly<{
  correctAnswer: string;
  referenceAnswerAddedAfterProduction: boolean;
}>;

export function hasSecondWriteReferenceStep(state: SecondWriteReferenceStepState) {
  return state.referenceAnswerAddedAfterProduction || state.correctAnswer.trim().length >= 4;
}
