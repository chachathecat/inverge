import type { QuarantinedQuestionCandidateV1 } from "../quarantine/candidate-contracts";

export const QFS1A_CONTRACT_VERSION =
  "QFS1AMandatorySimilarityCorpusPreparationV1" as const;

export const QFS1A_BODY_PART_KINDS = Object.freeze([
  "QUESTION_STEM",
  "QUESTION_OPTION",
  "SUPPORTING_MATERIAL",
  "ANSWER_BODY",
  "EXPLANATION",
  "RUBRIC",
] as const);

export const QFS1A_REFERENCE_PURPOSES = Object.freeze([
  "PROTECTED_EXPRESSION_GUARD",
  "PRIVATE_SOURCE_GUARD",
  "EXISTING_BANK_DUPLICATE_GUARD",
  "CURRENT_BATCH_DUPLICATE_GUARD",
] as const);

export const QFS1A_REFERENCE_SOURCE_CLASSES = Object.freeze([
  "INVERGE_ORIGINAL",
  "RIGHTS_CLEARED_OFFICIAL",
  "CONTRACTED_EXPERT_ORIGINAL",
  "CLEARED_DETERMINISTIC_TEMPLATE",
  "USER_PRIVATE_ONLY",
  "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  "RIGHTS_UNKNOWN",
  "BLOCKED",
] as const);

export const QFS1A_LIMITS = Object.freeze({
  contractVersion: QFS1A_CONTRACT_VERSION,
  maxCandidateParts: 16,
  maxCorpusReferences: 64,
  maxPartsPerReference: 16,
  maxCharactersPerBody: 32_768,
  maxAggregateInspectedCharacters: 262_144,
  maxNormalizedCharactersPerBody: 32_768,
  maxAggregateNormalizedCharacters: 262_144,
  maxTokensRetainedPerBody: 256,
  maxTotalWorkUnits: 1_048_576,
  fixedReferenceOverheadWorkUnits: 64,
  callerOverride: false,
});

export const QFS1A_QF0_DEPENDENCY_RECEIPT = Object.freeze({
  resultingMainSha: "7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2",
  resultingMainTree: "9ad60b9ece4931d7172cdc0462e079ed8d9a53fa",
  qf0a1ConfigSha256:
    "0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53",
  qf0a1ImplementationSha256:
    "cccc4dc8da9163d982a252633e3160f1ba5ad2138d0fda0f152f21b2c01e8d9e",
  qf0a1FivePathIdentity:
    "sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618",
  qf0a1SourceOnlyBoundaryReceiptDigest:
    "sha256:bf9f1223fd788696294261995a9a09b05e1db0bfa4d8bc803359cdf98fa9853a",
  qf0a1ExportsExactly: Object.freeze([
    "QF0A1_LIMITS",
    "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
    "canonicalizeBoundedJsonV1",
    "compareUtf8BytesV1",
    "digestCanonicalJsonV1",
  ] as const),
  qf0iConfigSha256:
    "34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993",
  qf0iCandidateContractsSha256:
    "9ff5f6ebdf0e2700591a789dacd096643406c445541b07898ba10559b202ff05",
  qf0iCandidateCoreSha256:
    "c122e610734b6e51fd68b8e821838cac225130d30cddf7723127d9bd78d15452",
  qf0iSixPathIdentity:
    "sha256:4452ad1a5e28bcba5409081a366e1d615db46bb20bc9bfae1c9381e49ea038aa",
  qf0iSourceOnlyBoundaryReceiptDigest:
    "sha256:0062eb9c6987ddda8bc7ade7f94f61b555483b4c508397663b5069ead9798cb7",
  qf0iContractExportsExactly: Object.freeze([
    "QF0I_CANDIDATE_LIFECYCLES",
    "QF0I_CONTRACT_VERSION",
    "QF0I_LIMITS",
    "QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ] as const),
  qf0iCoreExportsExactly: Object.freeze([
    "assertQuarantinedQuestionCandidateV1",
    "createQuarantinedQuestionCandidateV1",
  ] as const),
});

const QFS1A_PUBLIC_EXPORTS = Object.freeze([
  "QFS1A_BODY_PART_KINDS",
  "QFS1A_CONTRACT_VERSION",
  "QFS1A_LIMITS",
  "QFS1A_QF0_DEPENDENCY_RECEIPT",
  "QFS1A_REFERENCE_PURPOSES",
  "QFS1A_REFERENCE_SOURCE_CLASSES",
  "QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "prepareSimilarityCorpusV1",
] as const);

export const QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT = Object.freeze({
  contractVersion: QFS1A_CONTRACT_VERSION,
  scope: "MANDATORY_SIMILARITY_CORPUS_PREPARATION_ONLY",
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
  preparedTokensEphemeralAndSensitive: true,
  windowAuthorityAbsent: true,
  comparisonAuthorityAbsent: true,
  matchAuthorityAbsent: true,
  reviewOutcomeAuthorityAbsent: true,
  sourceRightAuthorityAbsent: true,
  releaseAuthorityAbsent: true,
  learnerAssignmentAbsent: true,
  bankAssignmentAbsent: true,
  publicExportsExactly: QFS1A_PUBLIC_EXPORTS,
});

export type QFS1ABodyPartKind = (typeof QFS1A_BODY_PART_KINDS)[number];
export type QFS1AReferencePurpose = (typeof QFS1A_REFERENCE_PURPOSES)[number];
export type QFS1AReferenceSourceClass =
  (typeof QFS1A_REFERENCE_SOURCE_CLASSES)[number];
export type QFS1ATokenKind = "LEXICAL" | "NUMBER";

export interface SimilarityBodyPartInputV1 {
  readonly partId: string;
  readonly partKind: QFS1ABodyPartKind;
  readonly bodyDigest: string;
  readonly bodyText: string;
}

export interface SimilarityReferenceInputV1 {
  readonly referenceId: string;
  readonly referenceDigest: string;
  readonly purpose: QFS1AReferencePurpose;
  readonly sourceClass: QFS1AReferenceSourceClass;
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

export interface SimilarityCorpusPreparationInputV1 {
  readonly contractVersion: "SimilarityCorpusPreparationInputV1";
  readonly candidate: QuarantinedQuestionCandidateV1;
  readonly candidateParts: readonly SimilarityBodyPartInputV1[];
  readonly corpus: SimilarityReferenceCorpusInputV1;
}

export interface PreparedSimilarityTokenV1 {
  readonly value: string;
  readonly kind: QFS1ATokenKind;
  readonly generic: boolean;
  readonly partId: string;
  readonly partKind: QFS1ABodyPartKind;
}

export interface PreparedSimilarityBodySequenceV1 {
  readonly partId: string;
  readonly partKind: QFS1ABodyPartKind;
  readonly bodyDigest: string;
  readonly normalizedSequenceDigest: string;
  readonly tokens: readonly PreparedSimilarityTokenV1[];
}

export interface PreparedSimilarityReferenceSequenceV1 {
  readonly referenceId: string;
  readonly referenceDigest: string;
  readonly purpose: QFS1AReferencePurpose;
  readonly sourceClass: QFS1AReferenceSourceClass;
  readonly version: string;
  readonly manifestDigest: string;
  readonly normalizedSequenceDigest: string;
  readonly parts: readonly PreparedSimilarityBodySequenceV1[];
}

export interface SimilarityPreparationCountsV1 {
  readonly candidatePartCount: number;
  readonly referenceCount: number;
  readonly referencePartCount: number;
  readonly preparedBodyCount: number;
}

export interface SimilarityMandatoryWorkAccountingV1 {
  readonly fixedReferenceOverheadUnits: number;
  readonly originalCharacters: number;
  readonly normalizedCharacters: number;
  readonly observedTokens: number;
  readonly retainedTokens: number;
  readonly mandatoryTotalWorkUnits: number;
  readonly remainingOptionalWorkUnits: number;
}

export interface PreparedSimilarityCorpusV1 {
  readonly contractVersion: "PreparedSimilarityCorpusV1";
  readonly candidateId: string;
  readonly candidateDigest: string;
  readonly candidateBodyManifestDigest: string;
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly corpusManifestDigest: string;
  readonly candidateNormalizedSequenceDigest: string;
  readonly counts: SimilarityPreparationCountsV1;
  readonly candidateSequences: readonly PreparedSimilarityBodySequenceV1[];
  readonly referenceSequences: readonly PreparedSimilarityReferenceSequenceV1[];
  readonly workAccounting: SimilarityMandatoryWorkAccountingV1;
  readonly preparationDigest: string;
}
