import { digestCanonicalJsonV1 } from "../quarantine/bounded-canonical-json";
import {
  QFS1A_CONTRACT_VERSION,
  QFS1A_LIMITS,
  QFS1A_REFERENCE_PURPOSES,
  QFS1A_REFERENCE_SOURCE_CLASSES,
} from "./preparation-contracts";

import type {
  QFS1ABodyPartKind,
  SimilarityCorpusPreparationInputV1,
} from "./preparation-contracts";

export const QFS1_CONTRACT_VERSION =
  "QFS1BoundedSimilarityRightsFirewallV1" as const;

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
  maxTotalGeneratedWindows: 65_536,
  maxTotalComparisonWorkUnits: 524_288,
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

export const QFS1_QFS1A_DEPENDENCY_RECEIPT = Object.freeze({
  resultingMainSha: "0f10ada8d5b9f99f863f77b1aaa129101b81a1c4",
  resultingMainTree: "c85216a6c4fb86fbbf4f82d0c29a90fab5362ffd",
  configSha256:
    "b1037eb9866c91df550968668b97da161a9487d2f762dbf37715ddcb204c99d6",
  preparationContractsSha256:
    "1ac2b16080dbe619bfc8da09184d4939ddb1a1aceaf3153db453294ac806f37b",
  preparationCoreSha256:
    "a686f723e60cfd0b1566bc8bc517d1392580a35e3004abe3dc5814e36339ee3d",
  sixPathIdentity:
    "sha256:a73ec04b00eb8bb716c568dfb5c7d101d892e21592a2b2466411682727ff492d",
  sourceOnlyBoundaryReceiptDigest:
    "sha256:7b6fad8d02089c8d69d43ab5e3aedba5e0a3aebad3c04b67b141e816f770f865",
  contractVersion: QFS1A_CONTRACT_VERSION,
  limits: Object.freeze({ ...QFS1A_LIMITS }),
  referencePurposesExactly: Object.freeze([...QFS1A_REFERENCE_PURPOSES]),
  referenceSourceClassesExactly: Object.freeze([
    ...QFS1A_REFERENCE_SOURCE_CLASSES,
  ]),
  contractExportsExactly: Object.freeze([
    "QFS1A_BODY_PART_KINDS",
    "QFS1A_CONTRACT_VERSION",
    "QFS1A_LIMITS",
    "QFS1A_QF0_DEPENDENCY_RECEIPT",
    "QFS1A_REFERENCE_PURPOSES",
    "QFS1A_REFERENCE_SOURCE_CLASSES",
    "QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ] as const),
  coreExportsExactly: Object.freeze(["prepareSimilarityCorpusV1"] as const),
  driftDisposition: "FAIL_CLOSED",
});

const QFS1_POLICY_MATERIAL = Object.freeze({
  contractVersion: QFS1_CONTRACT_VERSION,
  policyRef: QFS1_POLICY_REFERENCE,
  qfS1ADependencyReceipt: { ...QFS1_QFS1A_DEPENDENCY_RECEIPT },
  limits: { ...QFS1_LIMITS },
  outcomesExactly: [...QFS1_OUTCOMES],
  matchKindsExactly: [...QFS1_MATCH_KINDS],
  transformationsExactly: [...QFS1_TRANSFORMATIONS],
  artifactAssertionAuthority:
    "AUTHORITATIVE_RECOMPUTATION_FROM_ORIGINAL_PREPARATION_INPUT",
  semanticPlagiarismClaim: false,
  sourceRightGranted: false,
  sourceEligibilityGranted: false,
  releaseAuthorityGranted: false,
});

export const QFS1_POLICY_DIGEST = digestCanonicalJsonV1(
  JSON.parse(JSON.stringify(QFS1_POLICY_MATERIAL)),
);

const QFS1_PUBLIC_EXPORTS = Object.freeze([
  "QFS1_CONTRACT_VERSION",
  "QFS1_LIMITS",
  "QFS1_MATCH_KINDS",
  "QFS1_OUTCOMES",
  "QFS1_POLICY_REFERENCE",
  "QFS1_POLICY_DIGEST",
  "QFS1_TRANSFORMATIONS",
  "QFS1_QFS1A_DEPENDENCY_RECEIPT",
  "QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "createSimilarityFirewallReviewV1",
  "assertSimilarityFirewallReviewV1",
] as const);

export const QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QFS1_CONTRACT_VERSION,
  scope: "OPTIONAL_BOUNDED_SIMILARITY_MATCHING_AND_RIGHTS_FIREWALL_ONLY",
  storage: "IN_MEMORY_ONLY",
  persistence: "OFF",
  logging: "OFF",
  runtimeActivation: "OFF",
  providerExecution: "OFF",
  network: "OFF",
  databaseAndPersistence: "OFF",
  remoteMutation: "ZERO",
  productionMutation: "ZERO",
  rawBodyOutputAbsent: true,
  excerptOutputAbsent: true,
  metadataOnlySimilarityEvidence: true,
  artifactAssertionAuthority:
    "AUTHORITATIVE_RECOMPUTATION_FROM_ORIGINAL_PREPARATION_INPUT",
  semanticPlagiarismVerdictAbsent: true,
  sourceRightAuthorityAbsent: true,
  sourceEligibilityAuthorityAbsent: true,
  generationAuthorityAbsent: true,
  transferAuthorityAbsent: true,
  releaseAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  publicExportsExactly: QFS1_PUBLIC_EXPORTS,
});

export type QFS1Outcome = (typeof QFS1_OUTCOMES)[number];
export type QFS1MatchKind = (typeof QFS1_MATCH_KINDS)[number];
export type QFS1Transformation = (typeof QFS1_TRANSFORMATIONS)[number];

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
  readonly candidatePartKind: QFS1ABodyPartKind;
  readonly referencePartKind: QFS1ABodyPartKind;
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
  readonly preparedBodyCount: number;
}

export interface SimilarityWorkAccountingV1 {
  readonly fixedReferenceOverheadUnits: number;
  readonly originalCharacters: number;
  readonly normalizedCharacters: number;
  readonly observedTokens: number;
  readonly retainedTokens: number;
  readonly mandatoryTotalWorkUnits: number;
  readonly remainingOptionalWorkUnitsAtStart: number;
  readonly generatedWindows: number;
  readonly comparisonWorkUnits: number;
  readonly optionalWorkUnitsConsumed: number;
  readonly totalWorkUnits: number;
  readonly budgetExhausted: boolean;
  readonly completeCorpusInspection: boolean;
  readonly preparedBodyCount: number;
  readonly referenceCount: number;
  readonly referencePartCount: number;
}

export interface SimilarityFirewallReviewV1 {
  readonly contractVersion: "SimilarityFirewallReviewV1";
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly candidateBodyManifestDigest: string;
  readonly preparationDigest: string;
  readonly policyRef: typeof QFS1_POLICY_REFERENCE;
  readonly policyDigest: string;
  readonly corpusManifestDigest: string;
  readonly corpusCounts: SimilarityCorpusCountsV1;
  readonly workAccounting: SimilarityWorkAccountingV1;
  readonly outcome: QFS1Outcome;
  readonly matches: readonly SimilarityMatchSummaryV1[];
  readonly reviewDigest: string;
}

export type SimilarityFirewallInputV1 = SimilarityCorpusPreparationInputV1;
