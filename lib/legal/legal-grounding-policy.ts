export type LegalGroundingDecision = {
  grounded: boolean;
  needsReview: boolean;
  unsupported: boolean;
  sourceCount: number;
};

export function requireLegalSourceAnchors(candidates: readonly unknown[] | null | undefined): LegalGroundingDecision {
  const sourceCount = Array.isArray(candidates) ? candidates.filter(Boolean).length : 0;
  const grounded = sourceCount > 0;

  return {
    grounded,
    needsReview: grounded,
    unsupported: !grounded,
    sourceCount,
  };
}
