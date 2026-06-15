import type { LegalChunkCandidate } from "./legal-retrieval";

export type LegalGroundingGuardStatus =
  | "grounded_verified"
  | "grounded_draft"
  | "source_candidates_only"
  | "unsupported";

export type LegalGroundingGuardAnchor = {
  sourceStatus?: string | null;
  needsOfficialVerification?: boolean | null;
};

export type LegalGroundingGuardOptions = {
  conceptKey?: string | null;
  conceptAnchors?: readonly LegalGroundingGuardAnchor[] | null;
  keywordCandidates?: readonly LegalChunkCandidate[] | readonly unknown[] | null;
};

export type LegalGroundingGuardDecision = {
  status: LegalGroundingGuardStatus;
  canDraftLegalExplanation: boolean;
  needsReview: boolean;
  unsupported: boolean;
  conceptKey: string | null;
  sourceCount: number;
  candidateCount: number;
};

function hasItems(values: readonly unknown[] | null | undefined) {
  return Array.isArray(values) && values.filter(Boolean).length > 0;
}

function isVerifiedProductionAnchor(anchor: LegalGroundingGuardAnchor) {
  return anchor.sourceStatus === "verified" && anchor.needsOfficialVerification !== true;
}

function isDraftOrReviewRequiredAnchor(anchor: LegalGroundingGuardAnchor) {
  return !isVerifiedProductionAnchor(anchor);
}

export function evaluateLegalGroundingGuard(
  options: LegalGroundingGuardOptions,
): LegalGroundingGuardDecision {
  const conceptAnchors = Array.isArray(options.conceptAnchors)
    ? options.conceptAnchors.filter(Boolean)
    : [];
  const candidateCount = Array.isArray(options.keywordCandidates)
    ? options.keywordCandidates.filter(Boolean).length
    : 0;
  const conceptKey = options.conceptKey ?? null;

  if (conceptAnchors.some(isDraftOrReviewRequiredAnchor)) {
    return {
      status: "grounded_draft",
      canDraftLegalExplanation: false,
      needsReview: true,
      unsupported: false,
      conceptKey,
      sourceCount: conceptAnchors.length,
      candidateCount,
    };
  }

  if (conceptAnchors.some(isVerifiedProductionAnchor)) {
    return {
      status: "grounded_verified",
      canDraftLegalExplanation: true,
      needsReview: false,
      unsupported: false,
      conceptKey,
      sourceCount: conceptAnchors.length,
      candidateCount,
    };
  }

  if (hasItems(options.keywordCandidates)) {
    return {
      status: "source_candidates_only",
      canDraftLegalExplanation: false,
      needsReview: true,
      unsupported: false,
      conceptKey,
      sourceCount: 0,
      candidateCount,
    };
  }

  return {
    status: "unsupported",
    canDraftLegalExplanation: false,
    needsReview: true,
    unsupported: true,
    conceptKey,
    sourceCount: 0,
    candidateCount: 0,
  };
}
