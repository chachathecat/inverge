export const QF0A_CONTRACT_VERSION =
  "dabangil.qf0.rights_time_determinism.v1" as const;

export const QF0A_SOURCE_CLASSES = [
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const;

export const QF0A_RIGHTS_STATUSES = [
  "ACTIVE",
  "STALE",
  "DISPUTED",
  "BLOCKED",
  "REVOKED",
  "EXPIRED",
] as const;

export const QF0A_DECISION_STATUSES = [
  "CURRENT",
  "STALE",
  "DISPUTED",
  "BLOCKED",
] as const;

export const QF0A_MODEL_ROLES = ["GENERATOR", "SOLVER", "JUDGE"] as const;

export const QF0A_PURPOSES = ["QUARANTINED_CANDIDATE_CREATION"] as const;

export interface RightsManifestRefV1 {
  readonly contractVersion: "RightsManifestRefV1";
  readonly manifestId: string;
  readonly manifestVersionId: string;
  readonly manifestDigest: string;
  readonly sourceClass: (typeof QF0A_SOURCE_CLASSES)[number];
  readonly status: (typeof QF0A_RIGHTS_STATUSES)[number];
  readonly permittedPurpose: (typeof QF0A_PURPOSES)[number];
  readonly validFrom: string;
  readonly validUntil: string;
  readonly policyVersion: string;
  readonly policyDigest: string;
}

export interface SourceEligibilityDecisionV1 {
  readonly contractVersion: "SourceEligibilityDecisionV1";
  readonly decisionId: string;
  readonly decisionDigest: string;
  readonly sourceClass: (typeof QF0A_SOURCE_CLASSES)[number];
  readonly purpose: (typeof QF0A_PURPOSES)[number];
  readonly decisionStatus: (typeof QF0A_DECISION_STATUSES)[number];
  readonly outcome: "ELIGIBLE" | "DENIED";
  readonly evaluatedAt: string;
  readonly eligibilityInterval: Readonly<{
    validFrom: string;
    validUntil: string;
  }> | null;
  readonly rightsManifestRef: RightsManifestRefV1;
  readonly policyVersion: string;
  readonly policyDigest: string;
  readonly policyValidFrom: string;
  readonly policyValidUntil: string;
  readonly denialReasons: readonly string[];
}

export interface ModelExecutionIdentityV1 {
  readonly contractVersion: "ModelExecutionIdentityV1";
  readonly role: (typeof QF0A_MODEL_ROLES)[number];
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly modelArtifactDigest: string;
  readonly executionId: string;
  readonly executionArtifactDigest: string;
  readonly configurationDigest: string;
  readonly executedAt: string;
  readonly identityDigest: string;
}
