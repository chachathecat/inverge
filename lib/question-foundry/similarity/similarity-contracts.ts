import { digestCanonicalJsonV1 } from "../quarantine/bounded-canonical-json";

import type { QuarantinedQuestionCandidateV1 } from "../quarantine/candidate-contracts";

export const QFS1_CONTRACT_VERSION =
  "QFS1BoundedSimilarityRightsFirewallV1" as const;

export const QFS1_BODY_PART_KINDS = Object.freeze([
  "QUESTION_STEM",
  "QUESTION_OPTION",
  "SUPPORTING_MATERIAL",
  "ANSWER_BODY",
  "EXPLANATION",
  "RUBRIC",
] as const);

export const QFS1_REFERENCE_PURPOSES = Object.freeze([
  "PROTECTED_EXPRESSION_GUARD",
  "PRIVATE_SOURCE_GUARD",
  "EXISTING_BANK_DUPLICATE_GUARD",
  "CURRENT_BATCH_DUPLICATE_GUARD",
] as const);

export const QFS1_REFERENCE_SOURCE_CLASSES = Object.freeze([
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const);

export const QFS1_OUTCOMES = Object.freeze([
  "CLEAR",
  "BLOCKED",
  "REVIEW_REQUIRED",
] as const);

export const QFS1_MATCH_KINDS = Object.freeze([
  "EXACT_NORMALIZED_COPY",
  "NEAR_WHOLE_BODY_COPY",
  "CANDIDATE_FRAGMENT_IN_REFERENCE",
  "REFERENCE_FRAGMENT_IN_CANDIDATE",
  "NUMERIC_SUBSTITUTION",
  "IDENTIFIER_OR_NAME_SUBSTITUTION",
  "BOUNDED_ORDER_PERTURBATION",
  "LEXICAL_TRANSFORMED_COPY",
  "STRUCTURED_PARTS_COPY",
] as const);

export const QFS1_TRANSFORMATIONS = Object.freeze([
  "CASE_AND_PUNCTUATION_NORMALIZED",
  "NUMERIC_TOKENS_SUBSTITUTED",
  "LEXICAL_IDENTIFIERS_SUBSTITUTED",
  "BOUNDED_TOKEN_ORDER_CHANGED",
  "LEXICAL_ONLY_COMPARISON",
  "STRUCTURED_PART_BOUNDARY_CROSSED",
] as const);

export const QFS1_LIMITS = Object.freeze({
  contractVersion: QFS1_CONTRACT_VERSION,
  maxCandidateParts: 16,
  maxCorpusReferences: 64,
  maxPartsPerReference: 16,
  maxCharactersPerBody: 32_768,
  maxAggregateInspectedCharacters: 262_144,
  maxNormalizedCharactersPerBody: 32_768,
  maxAggregateNormalizedCharacters: 262_144,
  maxTokensRetainedPerBody: 256,
  maxTotalGeneratedWindows: 65_536,
  maxTotalComparisonWorkUnits: 524_288,
  maxTotalWorkUnits: 1_048_576,
  fixedReferenceOverheadWorkUnits: 64,
  lexicalWindowSize: 5,
  minimumStrongTokenCount: 8,
  minimumStrongLexicalTokenCount: 6,
  minimumDistinctLexicalEvidence: 5,
  minimumBlockingLexicalCoverageMillionths: 800_000,
  minimumReviewLexicalCoverageMillionths: 600_000,
  maximumOrderDisplacement: 4,
  callerOverride: false,
});

export const QFS1_POLICY_REFERENCE =
  "dabangil.question_foundry.similarity_rights_firewall.v1" as const;

const QFS1_POLICY_MATERIAL = Object.freeze({
  contractVersion: QFS1_CONTRACT_VERSION,
  policyRef: QFS1_POLICY_REFERENCE,
  limits: { ...QFS1_LIMITS },
  bodyPartKindsExactly: [...QFS1_BODY_PART_KINDS],
  referencePurposesExactly: [...QFS1_REFERENCE_PURPOSES],
  referenceSourceClassesExactly: [...QFS1_REFERENCE_SOURCE_CLASSES],
  outcomesExactly: [...QFS1_OUTCOMES],
  matchKindsExactly: [...QFS1_MATCH_KINDS],
  transformationsExactly: [...QFS1_TRANSFORMATIONS],
  semanticPlagiarismClaim: false,
  sourceRightGranted: false,
  releaseAuthorityGranted: false,
});

export const QFS1_POLICY_DIGEST = digestCanonicalJsonV1(QFS1_POLICY_MATERIAL);

export const QFS1_QF0_DEPENDENCY_RECEIPT = Object.freeze({
  resultingMainSha: "7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2",
  resultingMainTree: "9ad60b9ece4931d7172cdc0462e079ed8d9a53fa",
  aggregateConfigSha256:
    "34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993",
  sixPathIdentity:
    "sha256:4452ad1a5e28bcba5409081a366e1d615db46bb20bc9bfae1c9381e49ea038aa",
  candidateContractsImplementationSha256:
    "9ff5f6ebdf0e2700591a789dacd096643406c445541b07898ba10559b202ff05",
  candidateCoreImplementationSha256:
    "c122e610734b6e51fd68b8e821838cac225130d30cddf7723127d9bd78d15452",
  sourceOnlyBoundaryReceiptDigest:
    "sha256:0062eb9c6987ddda8bc7ade7f94f61b555483b4c508397663b5069ead9798cb7",
  candidateContractExportsExactly: Object.freeze([
    "QF0I_CANDIDATE_LIFECYCLES",
    "QF0I_CONTRACT_VERSION",
    "QF0I_LIMITS",
    "QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ] as const),
  candidateCoreExportsExactly: Object.freeze([
    "assertQuarantinedQuestionCandidateV1",
    "createQuarantinedQuestionCandidateV1",
  ] as const),
});

const QFS1_PUBLIC_EXPORTS = Object.freeze([
  "QFS1_BODY_PART_KINDS",
  "QFS1_CONTRACT_VERSION",
  "QFS1_LIMITS",
  "QFS1_MATCH_KINDS",
  "QFS1_OUTCOMES",
  "QFS1_POLICY_DIGEST",
  "QFS1_POLICY_REFERENCE",
  "QFS1_QF0_DEPENDENCY_RECEIPT",
  "QFS1_REFERENCE_PURPOSES",
  "QFS1_REFERENCE_SOURCE_CLASSES",
  "QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "QFS1_TRANSFORMATIONS",
  "assertSimilarityFirewallReviewV1",
  "createSimilarityFirewallReviewV1",
] as const);

export const QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QFS1_CONTRACT_VERSION,
  scope: "EPHEMERAL_BOUNDED_BODY_INSPECTION_ONLY",
  storage: "IN_MEMORY_ONLY",
  runtimeActivation: "OFF",
  providerExecution: "OFF",
  network: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  rawBodyOutputAbsent: true,
  excerptOutputAbsent: true,
  metadataOnlySimilarityEvidence: true,
  semanticPlagiarismAuthorityAbsent: true,
  sourceRightAuthorityAbsent: true,
  sourceEligibilityAuthorityAbsent: true,
  transferAuthorityAbsent: true,
  releaseAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  publicExportsExactly: QFS1_PUBLIC_EXPORTS,
});

export type QFS1BodyPartKind = (typeof QFS1_BODY_PART_KINDS)[number];
export type QFS1ReferencePurpose = (typeof QFS1_REFERENCE_PURPOSES)[number];
export type QFS1ReferenceSourceClass =
  (typeof QFS1_REFERENCE_SOURCE_CLASSES)[number];
export type QFS1Outcome = (typeof QFS1_OUTCOMES)[number];
export type QFS1MatchKind = (typeof QFS1_MATCH_KINDS)[number];
export type QFS1Transformation = (typeof QFS1_TRANSFORMATIONS)[number];

export interface SimilarityBodyPartInputV1 {
  readonly partId: string;
  readonly partKind: QFS1BodyPartKind;
  readonly bodyDigest: string;
  readonly bodyText: string;
}

export interface SimilarityReferenceInputV1 {
  readonly referenceId: string;
  readonly referenceDigest: string;
  readonly purpose: QFS1ReferencePurpose;
  readonly sourceClass: QFS1ReferenceSourceClass;
  readonly version: string;
  readonly parts: readonly SimilarityBodyPartInputV1[];
  readonly manifestDigest: string;
}

export interface SimilarityReferenceCorpusInputV1 {
  readonly contractVersion: "SimilarityReferenceCorpusV1";
  readonly corpusId: string;
  readonly version: string;
  readonly references: readonly SimilarityReferenceInputV1[];
  readonly corpusManifestDigest: string;
}

export interface SimilarityFirewallInspectionInputV1 {
  readonly contractVersion: "SimilarityFirewallInspectionInputV1";
  readonly candidate: QuarantinedQuestionCandidateV1;
  readonly candidateParts: readonly SimilarityBodyPartInputV1[];
  readonly policyRef: typeof QFS1_POLICY_REFERENCE;
  readonly policyDigest: string;
  readonly corpus: SimilarityReferenceCorpusInputV1;
}

export interface SimilarityTokenRangeV1 {
  readonly startInclusive: number;
  readonly endExclusive: number;
}

export interface SimilarityDeterministicMeasureV1 {
  readonly scoreMillionths: number;
  readonly matchedTokenCount: number;
  readonly distinctLexicalTokenCount: number;
}

export interface SimilarityMatchSummaryV1 {
  readonly referenceId: string;
  readonly referenceDigest: string;
  readonly candidatePartKind: QFS1BodyPartKind;
  readonly referencePartKind: QFS1BodyPartKind;
  readonly matchKind: QFS1MatchKind;
  readonly measure: SimilarityDeterministicMeasureV1;
  readonly candidateTokenRange: SimilarityTokenRangeV1;
  readonly referenceTokenRange: SimilarityTokenRangeV1;
  readonly transformationProfile: readonly QFS1Transformation[];
  readonly disposition: "BLOCKING" | "REVIEW";
}

export interface SimilarityCorpusCountsV1 {
  readonly candidatePartCount: number;
  readonly referenceCount: number;
  readonly referencePartCount: number;
  readonly inspectedBodyCount: number;
}

export interface SimilarityWorkAccountingV1 {
  readonly fixedReferenceOverheadUnits: number;
  readonly originalCharacters: number;
  readonly normalizedCharacters: number;
  readonly observedTokens: number;
  readonly retainedTokens: number;
  readonly generatedWindows: number;
  readonly comparisonWorkUnits: number;
  readonly totalWorkUnits: number;
  readonly truncatedBodyCount: number;
  readonly budgetExhausted: boolean;
  readonly completeCorpusInspection: boolean;
}

export interface SimilarityFirewallReviewV1 {
  readonly contractVersion: "SimilarityFirewallReviewV1";
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly candidateBodyManifestDigest: string;
  readonly policyRef: typeof QFS1_POLICY_REFERENCE;
  readonly policyDigest: string;
  readonly corpusManifestDigest: string;
  readonly corpusCounts: SimilarityCorpusCountsV1;
  readonly workAccounting: SimilarityWorkAccountingV1;
  readonly outcome: QFS1Outcome;
  readonly matches: readonly SimilarityMatchSummaryV1[];
  readonly reviewDigest: string;
}
