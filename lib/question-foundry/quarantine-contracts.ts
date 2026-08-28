export const QF0_CONTRACT_VERSION =
  "dabangil.question_foundry_quarantine_core.v1" as const;

export const QF0_SOURCE_CLASSES = [
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const;

export const QF0_CANDIDATE_LIFECYCLES = ["QUARANTINED", "REJECTED"] as const;

export const QF0_MODEL_ROLES = ["GENERATOR", "SOLVER", "JUDGE"] as const;

export type QuestionCandidateLifecycleV1 =
  (typeof QF0_CANDIDATE_LIFECYCLES)[number];

export interface RightsManifestRefV1 {
  readonly contractVersion: "RightsManifestRefV1";
  readonly manifestId: string;
  readonly manifestVersionId: string;
  readonly manifestDigest: string;
  readonly sourceClass: (typeof QF0_SOURCE_CLASSES)[number];
  readonly status:
    | "ACTIVE"
    | "STALE"
    | "DISPUTED"
    | "BLOCKED"
    | "REVOKED"
    | "EXPIRED";
  readonly permittedPurpose: "QUARANTINED_CANDIDATE_CREATION";
  readonly validFrom: string;
  readonly validUntil: string;
  readonly policyVersion: string;
}

export interface SourceEligibilityDecisionV1 {
  readonly contractVersion: "SourceEligibilityDecisionV1";
  readonly decisionId: string;
  readonly decisionDigest: string;
  readonly sourceClass: (typeof QF0_SOURCE_CLASSES)[number];
  readonly purpose: "QUARANTINED_CANDIDATE_CREATION";
  readonly decisionStatus: "CURRENT" | "STALE" | "DISPUTED" | "BLOCKED";
  readonly outcome: "ELIGIBLE_FOR_QUARANTINE" | "DENIED";
  readonly evaluatedAt: string;
  readonly policyVersion: string;
  readonly rightsManifestRef: RightsManifestRefV1 | null;
  readonly generationEligible: boolean;
  readonly quarantinedCandidateEligible: boolean;
  readonly sharedBlueprintEligible: false;
  readonly sharedBankEligible: false;
  readonly modelTrainingEligible: false;
  readonly crossUserReuseEligible: false;
  readonly denialReasons: readonly string[];
}

export interface ModelExecutionIdentityV1 {
  readonly contractVersion: "ModelExecutionIdentityV1";
  readonly role: (typeof QF0_MODEL_ROLES)[number];
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

export interface QuarantinedQuestionCandidateV1 {
  readonly contractVersion: "QuarantinedQuestionCandidateV1";
  readonly candidateId: string;
  readonly candidateChecksum: string;
  readonly lifecycle: QuestionCandidateLifecycleV1;
  readonly candidateContent: Readonly<Record<string, unknown>>;
  readonly contentDigest: string;
  readonly blueprintRef: Readonly<{
    blueprintId: string;
    blueprintVersion: string;
    blueprintDigest: string;
  }>;
  readonly answerSpecificationDigest: string;
  readonly sourceEligibilityDecision: SourceEligibilityDecisionV1;
  readonly rightsManifestRef: RightsManifestRefV1;
  readonly generatorExecutionIdentity: ModelExecutionIdentityV1;
  readonly independentExecutionIdentities: readonly ModelExecutionIdentityV1[];
  readonly validatorProfileRefs: readonly Readonly<{
    validatorProfileId: string;
    validatorProfileVersion: string;
    validatorProfileDigest: string;
  }>[];
  readonly createdAt: string;
  readonly policyVersion: string;
  readonly releaseStatus: null;
  readonly learnerAssignment: null;
  readonly bankAssignment: null;
}

export interface BodylessBankScarcityEventV1 {
  readonly contractVersion: "BodylessBankScarcityEventV1";
  readonly eventId: string;
  readonly eventChecksum: string;
  readonly examPackageRef: string;
  readonly subjectRef: string;
  readonly skillConceptRef: string;
  readonly problemFamilyRef: string;
  readonly requestedDifficultyBand: string;
  readonly requestedTaskProfile: string;
  readonly capacityShortageCount: number;
  readonly policyVersion: string;
  readonly occurredAt: string;
}
