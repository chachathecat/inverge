import type {
  OwnerAlphaAiLearningReference,
  OwnerAlphaBiggestGap,
  OwnerAlphaMisconceptionGraph,
  OwnerAlphaPracticeProblemModel,
  OwnerAlphaPracticeVariant,
  OwnerAlphaRootCauseCandidate,
} from "./owner-alpha-practice-contract";

export type OwnerAlphaProviderFile = {
  mimeType: string;
  bytes: Uint8Array;
};

export type OwnerAlphaReferenceDraft = {
  reference: OwnerAlphaAiLearningReference;
  biggestGap: OwnerAlphaBiggestGap;
  misconceptionGraph: OwnerAlphaMisconceptionGraph;
  rootCauseCandidates: OwnerAlphaRootCauseCandidate[];
  variant: OwnerAlphaPracticeVariant;
};

export interface OwnerAlphaPracticeProviderPort {
  extractProblem(input: {
    problemText: string;
    files: OwnerAlphaProviderFile[];
  }): Promise<{ extractedText: string; modelProfileId: string }>;
  generateReference(input: {
    sessionId: string;
    problemText: string;
    problemModel: OwnerAlphaPracticeProblemModel;
    independentAttempt: string;
    questionText: string | null;
    generatedAt: string;
  }): Promise<OwnerAlphaReferenceDraft>;
}

export class OwnerAlphaProviderError extends Error {
  readonly code: "timeout" | "quota" | "unavailable" | "invalid_output";

  constructor(
    code: "timeout" | "quota" | "unavailable" | "invalid_output",
  ) {
    super(`owner-alpha-provider:${code}`);
    this.code = code;
  }
}
