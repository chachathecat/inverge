import { readFileSync } from "node:fs";
import path from "node:path";

import { RUBRIC_EVIDENCE_CONTRACT_VERSION } from "./rubric-evidence-contract";

export type TheoryConceptRegistryScope = "appraiser_second_round_theory_only";
export type TheoryConceptStatus =
  | "verified"
  | "needs_official_verification"
  | "unresolved_conflict"
  | "blocked"
  | "synthetic_fixture";
export type TheoryConceptKind =
  | "valuation_standard"
  | "valuation_principle"
  | "valuation_approach"
  | "valuation_method"
  | "procedure"
  | "ethics"
  | "theory_term";
export type TheoryConceptSourceProvider = "qnet" | "molit" | "kapanet_public" | "public_academic_metadata" | "synthetic_fixture";
export type TheoryConceptAliasKind = "canonical_title" | "short_title" | "exam_term" | "translation_candidate";
export type TheoryConceptRelationKind =
  | "parent"
  | "child"
  | "prerequisite"
  | "contrast"
  | "near_synonym"
  | "applied_by"
  | "evaluated_by"
  | "unclear_relation";
export type TheoryConceptAnchorKind =
  | "concept_identity"
  | "definition_source"
  | "concept_graph_node"
  | "public_source_identity"
  | "alternative_view"
  | "rubric_link";
export type TheoryConceptAnchorLocatorKind = "concept_id" | "public_source_url" | "official_source_id" | "metadata_id";
export type TheoryAlternativeViewStatus = "candidate" | "accepted_alternative" | "needs_review" | "unresolved_conflict" | "synthetic_fixture";
export type TheoryAlternativeReleaseImplication =
  | "non_blocking_alternative"
  | "requires_consensus"
  | "blocks_high_confidence";
export type TheoryUncertaintyKind =
  | "definition_scope"
  | "term_translation"
  | "source_coverage"
  | "relationship_scope"
  | "alternative_view"
  | "unsupported_claim";
export type TheoryUncertaintySeverity = "low" | "medium" | "high" | "blocking";
export type TheoryUncertaintyResolutionStatus = "open" | "resolved" | "accepted_as_alternative" | "blocked";
export type S212ReviewConfidenceStatus = "high_allowed" | "low_only" | "blocked";
export type S207PackageReleaseStatus =
  | "draft"
  | "blocked"
  | "cross_checked"
  | "source_verified"
  | "subject_validated"
  | "ready_for_s215"
  | "released";
export type S209PackageReleaseGateStatus =
  | "eligible_for_s215"
  | "needs_official_verification"
  | "blocked_by_theory_concept";
export type S205TheoryConceptSourceStatus = "verified" | "needs_verification" | "blocked" | "unresolved_conflict";
export type S205TheoryWithholdReason =
  | "theory_concept_unverified"
  | "reference_package_unverified"
  | "unresolved_source_conflict"
  | "rights_blocked";
export type S205TheoryReviewConfidence = "high" | "medium" | "low" | "blocked";
export type TheoryConceptBlockerKind =
  | "missing_concept_id"
  | "missing_source_provenance"
  | "missing_last_verified_at"
  | "missing_definition_status"
  | "unresolved_concept_conflict"
  | "ambiguous_concept_relation"
  | "alternative_view_unreviewed"
  | "unsupported_theory_claim"
  | "raw_content_boundary"
  | "release_ready_blocked"
  | "reference_package_link_blocked"
  | "rubric_evidence_link_blocked";
export type TheoryConceptBlockerStatus = "open" | "resolved";
export type TheoryConceptBlockerSeverity = "blocking" | "warning";
export type TheoryConceptBlockerResolver = "s209" | "s212" | "s214" | "s215" | "human_decision";

export type TheoryConceptStoragePolicy = {
  metadataOnly: true;
  rawDefinitionTextStored: false;
  rawOfficialQuestionTextStored: false;
  rawOfficialAnswerTextStored: false;
  rawReferenceAnswerTextStored: false;
  rawLearnerAnswerStored: false;
  rawOcrTextStored: false;
  rawSourceExcerptStored: false;
  rawTextbookOrAcademyExplanationStored: false;
  rawAssetBytesStored: false;
  providerPayloadStored: false;
};

export type TheoryConceptBoundaryPolicy = {
  syntheticFixturesOnly: boolean;
  officialQuestionBodiesStored: false;
  officialAnswerBodiesStored: false;
  referenceAnswerBodiesStored: false;
  learnerAnswerBodiesStored: false;
  theoryAnswerReviewEngineImplemented: false;
  referenceAnswerGenerationImplemented: false;
  billingOrLedgerImplemented: false;
  publicArchiveUiImplemented: false;
  instructorRuntimeRoutesChanged: false;
  providerCallsImplemented: false;
  authOrEntitlementChanged: false;
  ocrRuntimeImplemented: false;
};

export type TheoryConceptProvenance = {
  provenanceId: string;
  provider: TheoryConceptSourceProvider;
  sourceLabel: string;
  officialUrl: string;
  officialSourceId?: string;
  status: TheoryConceptStatus;
  lastVerifiedAt?: string;
  verificationNote: string;
  sourceExcerptStored: false;
};

export type TheoryConceptAlias = {
  aliasId: string;
  labelKo: string;
  aliasKind: TheoryConceptAliasKind;
  status: TheoryConceptStatus;
  sourceStatus: TheoryConceptStatus;
};

export type TheoryUncertaintyNote = {
  uncertaintyId: string;
  kind: TheoryUncertaintyKind;
  severity: TheoryUncertaintySeverity;
  status: TheoryUncertaintyResolutionStatus;
  summary: string;
  releaseBlocking: boolean;
  officialClaimAllowed: false;
  blockerIds: string[];
};

export type TheoryConceptDownstreamUse = {
  s212TheoryReviewInputAllowed: boolean;
  s214ReferenceGenerationInputAllowed: boolean;
  s215ReleaseGateInputAllowed: boolean;
  s207PackageReleaseAnchorAllowed: boolean;
  s205RubricEvidenceSourceAllowed: boolean;
  highConfidenceTheoryClaimAllowed: boolean;
  blockUntilResolved: boolean;
};

export type TheoryConceptRecord = {
  conceptId: string;
  subjectScope: readonly ["theory"];
  unit: string;
  conceptTitleKo: string;
  conceptKind: TheoryConceptKind;
  definitionStatus: TheoryConceptStatus;
  sourceStatus: TheoryConceptStatus;
  lastVerifiedAt?: string;
  provenance: TheoryConceptProvenance[];
  aliases: TheoryConceptAlias[];
  relationIds: string[];
  alternativeViewIds: string[];
  uncertaintyNotes: TheoryUncertaintyNote[];
  downstreamUse: TheoryConceptDownstreamUse;
  blockerIds: string[];
  contentPolicy: TheoryConceptStoragePolicy;
};

export type TheoryConceptRelation = {
  relationId: string;
  fromConceptId: string;
  toConceptId: string;
  relationKind: TheoryConceptRelationKind;
  relationStatus: TheoryConceptStatus;
  sourceStatus: TheoryConceptStatus;
  reviewedAt?: string;
  blockerIds: string[];
  metadataOnly: true;
  containsRawContent: false;
};

export type TheoryAlternativeView = {
  alternativeViewId: string;
  conceptId: string;
  status: TheoryAlternativeViewStatus;
  sourceStatus: TheoryConceptStatus;
  viewpointLabel: string;
  provenanceIds: string[];
  uncertaintyIds: string[];
  releaseImplication: TheoryAlternativeReleaseImplication;
  officialClaimAllowed: false;
  blockerIds: string[];
  metadataOnly: true;
  containsRawContent: false;
};

export type TheoryConceptAnchor = {
  anchorId: string;
  conceptId: string;
  anchorKind: TheoryConceptAnchorKind;
  locator: {
    kind: TheoryConceptAnchorLocatorKind;
    ref: string;
    rawTextStored: false;
    excerptStored: false;
    bodyTextStored: false;
  };
  sourceStatus: TheoryConceptStatus;
  definitionStatus: TheoryConceptStatus;
  verifiedAt?: string;
  blockerIds: string[];
  s207SourceAnchorKind: "theory_concept_source";
  s205SourceReferenceKind: "subject_validator";
  containsRawContent: false;
};

export type TheoryConceptCheck = {
  checkId: string;
  questionId?: string;
  conceptIds: string[];
  conceptAnchorIds: string[];
  conceptStatus: TheoryConceptStatus;
  definitionStatus: TheoryConceptStatus;
  relationshipStatus: TheoryConceptStatus;
  sourceCoverageStatus: TheoryConceptStatus;
  releaseConfidence: {
    status: S212ReviewConfidenceStatus;
    s212HighConfidenceAllowed: boolean;
    s212ReviewAllowed: boolean;
    s214GenerationAllowed: boolean;
    s215ReleaseGateAllowed: boolean;
  };
  blockerIds: string[];
  s207ReferencePackageIds: string[];
  s205SourceReferenceIds: string[];
  metadataOnly: true;
};

export type ReferencePackageTheoryConceptLink = {
  linkId: string;
  referencePackageId: string;
  questionId?: string;
  packageReleaseStatus: S207PackageReleaseStatus;
  theoryConceptAnchorIds: string[];
  conceptStatus: TheoryConceptStatus;
  releaseGateStatus: S209PackageReleaseGateStatus;
  releaseReady: boolean;
  blockerIds: string[];
  containsRawContent: false;
};

export type EvidenceReviewTheoryConceptLink = {
  linkId: string;
  reviewContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  sourceVerificationRefId: string;
  theoryConceptAnchorId: string;
  s205SourceStatus: S205TheoryConceptSourceStatus;
  s205WithholdReasons: S205TheoryWithholdReason[];
  reviewConfidence: S205TheoryReviewConfidence;
  blockerIds: string[];
  containsRawContent: false;
};

export type TheoryConceptBlocker = {
  blockerId: string;
  kind: TheoryConceptBlockerKind;
  status: TheoryConceptBlockerStatus;
  severity: TheoryConceptBlockerSeverity;
  summary: string;
  requiredResolver: TheoryConceptBlockerResolver;
  conceptIds: string[];
  conceptAnchorIds: string[];
  relationIds: string[];
  alternativeViewIds: string[];
  referencePackageLinkIds: string[];
  evidenceReviewLinkIds: string[];
};

export type TheoryConceptCorpusRegistry = {
  schemaVersion: string;
  registryType: "appraiser_second_round_theory_concept_corpus_registry";
  registryScope: TheoryConceptRegistryScope;
  generatedBy: string;
  generatedAt: string;
  canonicalQuestionRegistryPath: string;
  referenceAnswerPackageRegistryPath: string;
  rubricEvidenceContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  storagePolicy: TheoryConceptStoragePolicy;
  boundaryPolicy: TheoryConceptBoundaryPolicy;
  concepts: TheoryConceptRecord[];
  conceptAnchors: TheoryConceptAnchor[];
  conceptRelations: TheoryConceptRelation[];
  alternativeViews: TheoryAlternativeView[];
  theoryConceptChecks: TheoryConceptCheck[];
  referencePackageLinks: ReferencePackageTheoryConceptLink[];
  evidenceReviewLinks: EvidenceReviewTheoryConceptLink[];
  blockers: TheoryConceptBlocker[];
};

export type TheoryConceptCorpusReport = {
  schemaVersion: string;
  reportType: "appraiser_second_round_theory_concept_corpus_report";
  generatedBy: string;
  generatedAt: string;
  theoryConceptRegistryPath: string;
  canonicalQuestionRegistryPath: string;
  referenceAnswerPackageRegistryPath: string;
  rubricEvidenceContractVersion: typeof RUBRIC_EVIDENCE_CONTRACT_VERSION;
  storagePolicy: TheoryConceptStoragePolicy;
  totals: {
    conceptCount: number;
    conceptAnchorCount: number;
    conceptRelationCount: number;
    alternativeViewCount: number;
    theoryConceptCheckCount: number;
    referencePackageLinkCount: number;
    evidenceReviewLinkCount: number;
    verifiedConceptCount: number;
    needsOfficialVerificationCount: number;
    unresolvedConflictCount: number;
    openBlockingBlockerCount: number;
    blockedReleasePackageLinkCount: number;
    highConfidenceReviewAllowedCheckCount: number;
    conceptStatusCounts: Record<TheoryConceptStatus, number>;
    definitionStatusCounts: Record<TheoryConceptStatus, number>;
    relationStatusCounts: Record<TheoryConceptStatus, number>;
    sourceCoverageStatusCounts: Record<TheoryConceptStatus, number>;
  };
  conceptIds: string[];
  conceptAnchorIds: string[];
  conceptsNeedingOfficialVerification: string[];
  conceptsWithOpenBlockers: string[];
  blockedReleasePackageLinkIds: string[];
  metadataOnly: true;
  safeUse: "s209_theory_concept_corpus_validation_only";
};

export type TheoryConceptCorpusRegistryConfig = {
  registryPath?: string;
  reportPath?: string;
};

const DEFAULT_REGISTRY_PATH = "reference_corpus/theory_sources/appraiser_second_round_theory_concepts.json";
const DEFAULT_REPORT_PATH = "reference_corpus/theory_sources/appraiser_second_round_theory_concept_report.json";
const REPORT_GENERATED_AT = "2026-06-28T00:00:00.000Z";

const THEORY_CONCEPT_STATUSES = ["verified", "needs_official_verification", "unresolved_conflict", "blocked", "synthetic_fixture"] as const;
const CONCEPT_KINDS = [
  "valuation_standard",
  "valuation_principle",
  "valuation_approach",
  "valuation_method",
  "procedure",
  "ethics",
  "theory_term",
] as const;
const SOURCE_PROVIDERS = ["qnet", "molit", "kapanet_public", "public_academic_metadata", "synthetic_fixture"] as const;
const ALIAS_KINDS = ["canonical_title", "short_title", "exam_term", "translation_candidate"] as const;
const RELATION_KINDS = ["parent", "child", "prerequisite", "contrast", "near_synonym", "applied_by", "evaluated_by", "unclear_relation"] as const;
const ANCHOR_KINDS = ["concept_identity", "definition_source", "concept_graph_node", "public_source_identity", "alternative_view", "rubric_link"] as const;
const ANCHOR_LOCATOR_KINDS = ["concept_id", "public_source_url", "official_source_id", "metadata_id"] as const;
const ALTERNATIVE_VIEW_STATUSES = ["candidate", "accepted_alternative", "needs_review", "unresolved_conflict", "synthetic_fixture"] as const;
const ALTERNATIVE_RELEASE_IMPLICATIONS = ["non_blocking_alternative", "requires_consensus", "blocks_high_confidence"] as const;
const UNCERTAINTY_KINDS = [
  "definition_scope",
  "term_translation",
  "source_coverage",
  "relationship_scope",
  "alternative_view",
  "unsupported_claim",
] as const;
const UNCERTAINTY_SEVERITIES = ["low", "medium", "high", "blocking"] as const;
const UNCERTAINTY_RESOLUTION_STATUSES = ["open", "resolved", "accepted_as_alternative", "blocked"] as const;
const CONFIDENCE_STATUSES = ["high_allowed", "low_only", "blocked"] as const;
const PACKAGE_RELEASE_STATUSES = ["draft", "blocked", "cross_checked", "source_verified", "subject_validated", "ready_for_s215", "released"] as const;
const PACKAGE_RELEASE_GATE_STATUSES = ["eligible_for_s215", "needs_official_verification", "blocked_by_theory_concept"] as const;
const S205_SOURCE_STATUSES = ["verified", "needs_verification", "blocked", "unresolved_conflict"] as const;
const S205_WITHHOLD_REASONS = ["theory_concept_unverified", "reference_package_unverified", "unresolved_source_conflict", "rights_blocked"] as const;
const S205_REVIEW_CONFIDENCE = ["high", "medium", "low", "blocked"] as const;
const BLOCKER_KINDS = [
  "missing_concept_id",
  "missing_source_provenance",
  "missing_last_verified_at",
  "missing_definition_status",
  "unresolved_concept_conflict",
  "ambiguous_concept_relation",
  "alternative_view_unreviewed",
  "unsupported_theory_claim",
  "raw_content_boundary",
  "release_ready_blocked",
  "reference_package_link_blocked",
  "rubric_evidence_link_blocked",
] as const;
const BLOCKER_STATUSES = ["open", "resolved"] as const;
const BLOCKER_SEVERITIES = ["blocking", "warning"] as const;
const BLOCKER_RESOLVERS = ["s209", "s212", "s214", "s215", "human_decision"] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,180}$/;
const FORBIDDEN_RAW_FIELD_NAMES = new Set([
  "rawContent",
  "bodyText",
  "definitionText",
  "definitionBody",
  "explanationText",
  "sourceExcerpt",
  "sourceText",
  "officialQuestionText",
  "officialQuestionBody",
  "officialAnswerText",
  "officialAnswerBody",
  "referenceAnswerText",
  "modelAnswer",
  "learnerAnswer",
  "learnerAnswerText",
  "rawOcrText",
  "ocrText",
  "providerPayload",
  "academyContent",
  "thirdPartyAcademyContent",
  "textbookContent",
  "pdf",
  "hwp",
  "image",
  "pdfBytes",
  "hwpBytes",
  "imageBytes",
  "assetBytes",
  "localFileName",
  "localFilePath",
  "rawFilePath",
]);
const FORBIDDEN_CLAIM_PATTERN =
  /(official\s+grading|official\s+score|pass\s+probability|guaranteed\s+score|official\s+model\s+answer|official\s+answer|공식\s*채점|확정\s*점수|합격\s*확률|합격\s*가능성|합격\s*보장|공식\s*모범\s*답안|정답\s*보장)/i;

function resolveRepoPath(customPath: string | undefined, fallback: string) {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), customPath ?? fallback);
}

function readJsonFile(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, sourceName: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${sourceName} must be a JSON object`);
}

function assertString(value: unknown, fieldName: string, sourceName: string, maxLength = 300) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${fieldName} must be a non-empty string`);
  }
  if (value.length > maxLength) throw new Error(`${sourceName}.${fieldName} is too long for metadata-only use`);
  if (FORBIDDEN_CLAIM_PATTERN.test(value)) {
    throw new Error(`${sourceName}.${fieldName} contains a prohibited official-answer, official-grading, pass-probability, or guarantee claim`);
  }
  return value;
}

function assertOptionalString(value: unknown, fieldName: string, sourceName: string, maxLength = 300) {
  if (value === undefined) return undefined;
  return assertString(value, fieldName, sourceName, maxLength);
}

function assertId(value: unknown, fieldName: string, sourceName: string) {
  const id = assertString(value, fieldName, sourceName, 200);
  if (!ID_PATTERN.test(id)) throw new Error(`${sourceName}.${fieldName} must be a stable lowercase metadata id`);
  return id;
}

function assertIdArray(value: unknown, fieldName: string, sourceName: string) {
  if (!Array.isArray(value)) throw new Error(`${sourceName}.${fieldName} must be an array`);
  return value.map((entry, index) => assertId(entry, `${fieldName}[${index}]`, sourceName));
}

function assertFalse(value: unknown, fieldName: string, sourceName: string): false {
  if (value !== false) throw new Error(`${sourceName}.${fieldName} must be false`);
  return false;
}

function assertTrue(value: unknown, fieldName: string, sourceName: string): true {
  if (value !== true) throw new Error(`${sourceName}.${fieldName} must be true`);
  return true;
}

function assertOneOf<const T extends readonly string[]>(
  value: unknown,
  fieldName: string,
  sourceName: string,
  allowedValues: T,
): T[number] {
  const stringValue = assertString(value, fieldName, sourceName);
  if (!(allowedValues as readonly string[]).includes(stringValue)) {
    throw new Error(`${sourceName}.${fieldName} has unsupported value ${stringValue}`);
  }
  return stringValue;
}

function assertDate(value: unknown, fieldName: string, sourceName: string) {
  const date = assertString(value, fieldName, sourceName);
  if (!DATE_PATTERN.test(date)) throw new Error(`${sourceName}.${fieldName} must be YYYY-MM-DD`);
  return date;
}

function assertOptionalDate(value: unknown, fieldName: string, sourceName: string) {
  if (value === undefined) return undefined;
  return assertDate(value, fieldName, sourceName);
}

function assertIsoInstant(value: unknown, fieldName: string, sourceName: string) {
  const instant = assertString(value, fieldName, sourceName);
  if (!ISO_INSTANT_PATTERN.test(instant)) throw new Error(`${sourceName}.${fieldName} must be a deterministic ISO instant`);
  return instant;
}

function assertHttpsUrl(value: unknown, fieldName: string, sourceName: string) {
  const url = assertString(value, fieldName, sourceName, 600);
  if (!/^https:\/\//.test(url)) throw new Error(`${sourceName}.${fieldName} must be an HTTPS URL`);
  return url;
}

function assertNoForbiddenRawFields(value: unknown, sourceName: string, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenRawFields(entry, sourceName, `${trail}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && FORBIDDEN_CLAIM_PATTERN.test(value)) {
      throw new Error(`${sourceName}.${trail} contains a prohibited learner-facing authority claim`);
    }
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_RAW_FIELD_NAMES.has(key)) {
      throw new Error(`${sourceName}.${trail}.${key} violates the S209 metadata-only raw-content boundary`);
    }
    assertNoForbiddenRawFields(nested, sourceName, `${trail}.${key}`);
  }
}

function assertTheorySubjectScope(value: unknown, fieldName: string, sourceName: string): readonly ["theory"] {
  if (!Array.isArray(value) || value.length !== 1 || value[0] !== "theory") {
    throw new Error(`${sourceName}.${fieldName} must be ["theory"]`);
  }
  return ["theory"];
}

function assertStoragePolicy(value: unknown, sourceName: string): TheoryConceptStoragePolicy {
  assertRecord(value, `${sourceName}.storagePolicy`);
  return {
    metadataOnly: assertTrue(value.metadataOnly, "storagePolicy.metadataOnly", sourceName),
    rawDefinitionTextStored: assertFalse(value.rawDefinitionTextStored, "storagePolicy.rawDefinitionTextStored", sourceName),
    rawOfficialQuestionTextStored: assertFalse(value.rawOfficialQuestionTextStored, "storagePolicy.rawOfficialQuestionTextStored", sourceName),
    rawOfficialAnswerTextStored: assertFalse(value.rawOfficialAnswerTextStored, "storagePolicy.rawOfficialAnswerTextStored", sourceName),
    rawReferenceAnswerTextStored: assertFalse(value.rawReferenceAnswerTextStored, "storagePolicy.rawReferenceAnswerTextStored", sourceName),
    rawLearnerAnswerStored: assertFalse(value.rawLearnerAnswerStored, "storagePolicy.rawLearnerAnswerStored", sourceName),
    rawOcrTextStored: assertFalse(value.rawOcrTextStored, "storagePolicy.rawOcrTextStored", sourceName),
    rawSourceExcerptStored: assertFalse(value.rawSourceExcerptStored, "storagePolicy.rawSourceExcerptStored", sourceName),
    rawTextbookOrAcademyExplanationStored: assertFalse(
      value.rawTextbookOrAcademyExplanationStored,
      "storagePolicy.rawTextbookOrAcademyExplanationStored",
      sourceName,
    ),
    rawAssetBytesStored: assertFalse(value.rawAssetBytesStored, "storagePolicy.rawAssetBytesStored", sourceName),
    providerPayloadStored: assertFalse(value.providerPayloadStored, "storagePolicy.providerPayloadStored", sourceName),
  };
}

function assertBoundaryPolicy(value: unknown, sourceName: string): TheoryConceptBoundaryPolicy {
  assertRecord(value, `${sourceName}.boundaryPolicy`);
  return {
    syntheticFixturesOnly: value.syntheticFixturesOnly === true,
    officialQuestionBodiesStored: assertFalse(value.officialQuestionBodiesStored, "boundaryPolicy.officialQuestionBodiesStored", sourceName),
    officialAnswerBodiesStored: assertFalse(value.officialAnswerBodiesStored, "boundaryPolicy.officialAnswerBodiesStored", sourceName),
    referenceAnswerBodiesStored: assertFalse(value.referenceAnswerBodiesStored, "boundaryPolicy.referenceAnswerBodiesStored", sourceName),
    learnerAnswerBodiesStored: assertFalse(value.learnerAnswerBodiesStored, "boundaryPolicy.learnerAnswerBodiesStored", sourceName),
    theoryAnswerReviewEngineImplemented: assertFalse(
      value.theoryAnswerReviewEngineImplemented,
      "boundaryPolicy.theoryAnswerReviewEngineImplemented",
      sourceName,
    ),
    referenceAnswerGenerationImplemented: assertFalse(
      value.referenceAnswerGenerationImplemented,
      "boundaryPolicy.referenceAnswerGenerationImplemented",
      sourceName,
    ),
    billingOrLedgerImplemented: assertFalse(value.billingOrLedgerImplemented, "boundaryPolicy.billingOrLedgerImplemented", sourceName),
    publicArchiveUiImplemented: assertFalse(value.publicArchiveUiImplemented, "boundaryPolicy.publicArchiveUiImplemented", sourceName),
    instructorRuntimeRoutesChanged: assertFalse(value.instructorRuntimeRoutesChanged, "boundaryPolicy.instructorRuntimeRoutesChanged", sourceName),
    providerCallsImplemented: assertFalse(value.providerCallsImplemented, "boundaryPolicy.providerCallsImplemented", sourceName),
    authOrEntitlementChanged: assertFalse(value.authOrEntitlementChanged, "boundaryPolicy.authOrEntitlementChanged", sourceName),
    ocrRuntimeImplemented: assertFalse(value.ocrRuntimeImplemented, "boundaryPolicy.ocrRuntimeImplemented", sourceName),
  };
}

function assertDownstreamUse(value: unknown, sourceName: string): TheoryConceptDownstreamUse {
  assertRecord(value, `${sourceName}.downstreamUse`);
  const getBoolean = (fieldName: string) => {
    const fieldValue = value[fieldName];
    if (typeof fieldValue !== "boolean") throw new Error(`${sourceName}.downstreamUse.${fieldName} must be boolean`);
    return fieldValue;
  };
  return {
    s212TheoryReviewInputAllowed: getBoolean("s212TheoryReviewInputAllowed"),
    s214ReferenceGenerationInputAllowed: getBoolean("s214ReferenceGenerationInputAllowed"),
    s215ReleaseGateInputAllowed: getBoolean("s215ReleaseGateInputAllowed"),
    s207PackageReleaseAnchorAllowed: getBoolean("s207PackageReleaseAnchorAllowed"),
    s205RubricEvidenceSourceAllowed: getBoolean("s205RubricEvidenceSourceAllowed"),
    highConfidenceTheoryClaimAllowed: getBoolean("highConfidenceTheoryClaimAllowed"),
    blockUntilResolved: getBoolean("blockUntilResolved"),
  };
}

function validateProvenance(value: unknown, index: number, sourceName: string): TheoryConceptProvenance {
  const entryName = `${sourceName}.provenance[${index}]`;
  assertRecord(value, entryName);
  return {
    provenanceId: assertId(value.provenanceId, "provenanceId", entryName),
    provider: assertOneOf(value.provider, "provider", entryName, SOURCE_PROVIDERS) as TheoryConceptSourceProvider,
    sourceLabel: assertString(value.sourceLabel, "sourceLabel", entryName),
    officialUrl: assertHttpsUrl(value.officialUrl, "officialUrl", entryName),
    officialSourceId: assertOptionalString(value.officialSourceId, "officialSourceId", entryName, 200),
    status: assertOneOf(value.status, "status", entryName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    lastVerifiedAt: assertOptionalDate(value.lastVerifiedAt, "lastVerifiedAt", entryName),
    verificationNote: assertString(value.verificationNote, "verificationNote", entryName, 700),
    sourceExcerptStored: assertFalse(value.sourceExcerptStored, "sourceExcerptStored", entryName),
  };
}

function validateAlias(value: unknown, index: number, sourceName: string): TheoryConceptAlias {
  const entryName = `${sourceName}.aliases[${index}]`;
  assertRecord(value, entryName);
  return {
    aliasId: assertId(value.aliasId, "aliasId", entryName),
    labelKo: assertString(value.labelKo, "labelKo", entryName, 160),
    aliasKind: assertOneOf(value.aliasKind, "aliasKind", entryName, ALIAS_KINDS) as TheoryConceptAliasKind,
    status: assertOneOf(value.status, "status", entryName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    sourceStatus: assertOneOf(value.sourceStatus, "sourceStatus", entryName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
  };
}

function validateUncertainty(value: unknown, index: number, sourceName: string): TheoryUncertaintyNote {
  const entryName = `${sourceName}.uncertaintyNotes[${index}]`;
  assertRecord(value, entryName);
  return {
    uncertaintyId: assertId(value.uncertaintyId, "uncertaintyId", entryName),
    kind: assertOneOf(value.kind, "kind", entryName, UNCERTAINTY_KINDS) as TheoryUncertaintyKind,
    severity: assertOneOf(value.severity, "severity", entryName, UNCERTAINTY_SEVERITIES) as TheoryUncertaintySeverity,
    status: assertOneOf(value.status, "status", entryName, UNCERTAINTY_RESOLUTION_STATUSES) as TheoryUncertaintyResolutionStatus,
    summary: assertString(value.summary, "summary", entryName, 500),
    releaseBlocking: value.releaseBlocking === true,
    officialClaimAllowed: assertFalse(value.officialClaimAllowed, "officialClaimAllowed", entryName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", entryName),
  };
}

function validateConcept(value: unknown, index: number): TheoryConceptRecord {
  const sourceName = `appraiser_second_round_theory_concepts.concepts[${index}]`;
  assertRecord(value, sourceName);
  if (!Array.isArray(value.provenance)) throw new Error(`${sourceName}.provenance must be an array`);
  if (!Array.isArray(value.aliases)) throw new Error(`${sourceName}.aliases must be an array`);
  if (!Array.isArray(value.uncertaintyNotes)) throw new Error(`${sourceName}.uncertaintyNotes must be an array`);
  return {
    conceptId: assertId(value.conceptId, "conceptId", sourceName),
    subjectScope: assertTheorySubjectScope(value.subjectScope, "subjectScope", sourceName),
    unit: assertString(value.unit, "unit", sourceName, 160),
    conceptTitleKo: assertString(value.conceptTitleKo, "conceptTitleKo", sourceName, 160),
    conceptKind: assertOneOf(value.conceptKind, "conceptKind", sourceName, CONCEPT_KINDS) as TheoryConceptKind,
    definitionStatus: assertOneOf(value.definitionStatus, "definitionStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    sourceStatus: assertOneOf(value.sourceStatus, "sourceStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    lastVerifiedAt: assertOptionalDate(value.lastVerifiedAt, "lastVerifiedAt", sourceName),
    provenance: value.provenance.map((entry, provenanceIndex) => validateProvenance(entry, provenanceIndex, sourceName)),
    aliases: value.aliases.map((entry, aliasIndex) => validateAlias(entry, aliasIndex, sourceName)),
    relationIds: assertIdArray(value.relationIds, "relationIds", sourceName),
    alternativeViewIds: assertIdArray(value.alternativeViewIds, "alternativeViewIds", sourceName),
    uncertaintyNotes: value.uncertaintyNotes.map((entry, uncertaintyIndex) => validateUncertainty(entry, uncertaintyIndex, sourceName)),
    downstreamUse: assertDownstreamUse(value.downstreamUse, sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    contentPolicy: assertStoragePolicy(value.contentPolicy, sourceName),
  };
}

function validateRelation(value: unknown, index: number): TheoryConceptRelation {
  const sourceName = `appraiser_second_round_theory_concepts.conceptRelations[${index}]`;
  assertRecord(value, sourceName);
  return {
    relationId: assertId(value.relationId, "relationId", sourceName),
    fromConceptId: assertId(value.fromConceptId, "fromConceptId", sourceName),
    toConceptId: assertId(value.toConceptId, "toConceptId", sourceName),
    relationKind: assertOneOf(value.relationKind, "relationKind", sourceName, RELATION_KINDS) as TheoryConceptRelationKind,
    relationStatus: assertOneOf(value.relationStatus, "relationStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    sourceStatus: assertOneOf(value.sourceStatus, "sourceStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    reviewedAt: assertOptionalDate(value.reviewedAt, "reviewedAt", sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", sourceName),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateAlternativeView(value: unknown, index: number): TheoryAlternativeView {
  const sourceName = `appraiser_second_round_theory_concepts.alternativeViews[${index}]`;
  assertRecord(value, sourceName);
  return {
    alternativeViewId: assertId(value.alternativeViewId, "alternativeViewId", sourceName),
    conceptId: assertId(value.conceptId, "conceptId", sourceName),
    status: assertOneOf(value.status, "status", sourceName, ALTERNATIVE_VIEW_STATUSES) as TheoryAlternativeViewStatus,
    sourceStatus: assertOneOf(value.sourceStatus, "sourceStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    viewpointLabel: assertString(value.viewpointLabel, "viewpointLabel", sourceName, 220),
    provenanceIds: assertIdArray(value.provenanceIds, "provenanceIds", sourceName),
    uncertaintyIds: assertIdArray(value.uncertaintyIds, "uncertaintyIds", sourceName),
    releaseImplication: assertOneOf(
      value.releaseImplication,
      "releaseImplication",
      sourceName,
      ALTERNATIVE_RELEASE_IMPLICATIONS,
    ) as TheoryAlternativeReleaseImplication,
    officialClaimAllowed: assertFalse(value.officialClaimAllowed, "officialClaimAllowed", sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", sourceName),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateConceptAnchor(value: unknown, index: number): TheoryConceptAnchor {
  const sourceName = `appraiser_second_round_theory_concepts.conceptAnchors[${index}]`;
  assertRecord(value, sourceName);
  assertRecord(value.locator, `${sourceName}.locator`);
  return {
    anchorId: assertId(value.anchorId, "anchorId", sourceName),
    conceptId: assertId(value.conceptId, "conceptId", sourceName),
    anchorKind: assertOneOf(value.anchorKind, "anchorKind", sourceName, ANCHOR_KINDS) as TheoryConceptAnchorKind,
    locator: {
      kind: assertOneOf(value.locator.kind, "locator.kind", sourceName, ANCHOR_LOCATOR_KINDS) as TheoryConceptAnchorLocatorKind,
      ref: assertString(value.locator.ref, "locator.ref", sourceName, 600),
      rawTextStored: assertFalse(value.locator.rawTextStored, "locator.rawTextStored", sourceName),
      excerptStored: assertFalse(value.locator.excerptStored, "locator.excerptStored", sourceName),
      bodyTextStored: assertFalse(value.locator.bodyTextStored, "locator.bodyTextStored", sourceName),
    },
    sourceStatus: assertOneOf(value.sourceStatus, "sourceStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    definitionStatus: assertOneOf(value.definitionStatus, "definitionStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    verifiedAt: assertOptionalDate(value.verifiedAt, "verifiedAt", sourceName),
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    s207SourceAnchorKind: assertOneOf(value.s207SourceAnchorKind, "s207SourceAnchorKind", sourceName, ["theory_concept_source"] as const),
    s205SourceReferenceKind: assertOneOf(value.s205SourceReferenceKind, "s205SourceReferenceKind", sourceName, ["subject_validator"] as const),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateConceptCheck(value: unknown, index: number): TheoryConceptCheck {
  const sourceName = `appraiser_second_round_theory_concepts.theoryConceptChecks[${index}]`;
  assertRecord(value, sourceName);
  assertRecord(value.releaseConfidence, `${sourceName}.releaseConfidence`);
  return {
    checkId: assertId(value.checkId, "checkId", sourceName),
    questionId: assertOptionalString(value.questionId, "questionId", sourceName, 200),
    conceptIds: assertIdArray(value.conceptIds, "conceptIds", sourceName),
    conceptAnchorIds: assertIdArray(value.conceptAnchorIds, "conceptAnchorIds", sourceName),
    conceptStatus: assertOneOf(value.conceptStatus, "conceptStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    definitionStatus: assertOneOf(value.definitionStatus, "definitionStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    relationshipStatus: assertOneOf(value.relationshipStatus, "relationshipStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    sourceCoverageStatus: assertOneOf(value.sourceCoverageStatus, "sourceCoverageStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    releaseConfidence: {
      status: assertOneOf(value.releaseConfidence.status, "releaseConfidence.status", sourceName, CONFIDENCE_STATUSES) as S212ReviewConfidenceStatus,
      s212HighConfidenceAllowed: value.releaseConfidence.s212HighConfidenceAllowed === true,
      s212ReviewAllowed: value.releaseConfidence.s212ReviewAllowed === true,
      s214GenerationAllowed: value.releaseConfidence.s214GenerationAllowed === true,
      s215ReleaseGateAllowed: value.releaseConfidence.s215ReleaseGateAllowed === true,
    },
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    s207ReferencePackageIds: assertIdArray(value.s207ReferencePackageIds, "s207ReferencePackageIds", sourceName),
    s205SourceReferenceIds: assertIdArray(value.s205SourceReferenceIds, "s205SourceReferenceIds", sourceName),
    metadataOnly: assertTrue(value.metadataOnly, "metadataOnly", sourceName),
  };
}

function validateReferencePackageLink(value: unknown, index: number): ReferencePackageTheoryConceptLink {
  const sourceName = `appraiser_second_round_theory_concepts.referencePackageLinks[${index}]`;
  assertRecord(value, sourceName);
  return {
    linkId: assertId(value.linkId, "linkId", sourceName),
    referencePackageId: assertId(value.referencePackageId, "referencePackageId", sourceName),
    questionId: assertOptionalString(value.questionId, "questionId", sourceName, 200),
    packageReleaseStatus: assertOneOf(value.packageReleaseStatus, "packageReleaseStatus", sourceName, PACKAGE_RELEASE_STATUSES) as S207PackageReleaseStatus,
    theoryConceptAnchorIds: assertIdArray(value.theoryConceptAnchorIds, "theoryConceptAnchorIds", sourceName),
    conceptStatus: assertOneOf(value.conceptStatus, "conceptStatus", sourceName, THEORY_CONCEPT_STATUSES) as TheoryConceptStatus,
    releaseGateStatus: assertOneOf(value.releaseGateStatus, "releaseGateStatus", sourceName, PACKAGE_RELEASE_GATE_STATUSES) as S209PackageReleaseGateStatus,
    releaseReady: value.releaseReady === true,
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateEvidenceReviewLink(value: unknown, index: number): EvidenceReviewTheoryConceptLink {
  const sourceName = `appraiser_second_round_theory_concepts.evidenceReviewLinks[${index}]`;
  assertRecord(value, sourceName);
  return {
    linkId: assertId(value.linkId, "linkId", sourceName),
    reviewContractVersion: assertOneOf(
      value.reviewContractVersion,
      "reviewContractVersion",
      sourceName,
      [RUBRIC_EVIDENCE_CONTRACT_VERSION] as const,
    ),
    sourceVerificationRefId: assertId(value.sourceVerificationRefId, "sourceVerificationRefId", sourceName),
    theoryConceptAnchorId: assertId(value.theoryConceptAnchorId, "theoryConceptAnchorId", sourceName),
    s205SourceStatus: assertOneOf(value.s205SourceStatus, "s205SourceStatus", sourceName, S205_SOURCE_STATUSES) as S205TheoryConceptSourceStatus,
    s205WithholdReasons: (() => {
      if (!Array.isArray(value.s205WithholdReasons)) throw new Error(`${sourceName}.s205WithholdReasons must be an array`);
      return value.s205WithholdReasons.map((entry, reasonIndex) => (
        assertOneOf(entry, `s205WithholdReasons[${reasonIndex}]`, sourceName, S205_WITHHOLD_REASONS) as S205TheoryWithholdReason
      ));
    })(),
    reviewConfidence: assertOneOf(value.reviewConfidence, "reviewConfidence", sourceName, S205_REVIEW_CONFIDENCE) as S205TheoryReviewConfidence,
    blockerIds: assertIdArray(value.blockerIds, "blockerIds", sourceName),
    containsRawContent: assertFalse(value.containsRawContent, "containsRawContent", sourceName),
  };
}

function validateBlocker(value: unknown, index: number): TheoryConceptBlocker {
  const sourceName = `appraiser_second_round_theory_concepts.blockers[${index}]`;
  assertRecord(value, sourceName);
  return {
    blockerId: assertId(value.blockerId, "blockerId", sourceName),
    kind: assertOneOf(value.kind, "kind", sourceName, BLOCKER_KINDS) as TheoryConceptBlockerKind,
    status: assertOneOf(value.status, "status", sourceName, BLOCKER_STATUSES) as TheoryConceptBlockerStatus,
    severity: assertOneOf(value.severity, "severity", sourceName, BLOCKER_SEVERITIES) as TheoryConceptBlockerSeverity,
    summary: assertString(value.summary, "summary", sourceName, 700),
    requiredResolver: assertOneOf(value.requiredResolver, "requiredResolver", sourceName, BLOCKER_RESOLVERS) as TheoryConceptBlockerResolver,
    conceptIds: assertIdArray(value.conceptIds, "conceptIds", sourceName),
    conceptAnchorIds: assertIdArray(value.conceptAnchorIds, "conceptAnchorIds", sourceName),
    relationIds: assertIdArray(value.relationIds, "relationIds", sourceName),
    alternativeViewIds: assertIdArray(value.alternativeViewIds, "alternativeViewIds", sourceName),
    referencePackageLinkIds: assertIdArray(value.referencePackageLinkIds, "referencePackageLinkIds", sourceName),
    evidenceReviewLinkIds: assertIdArray(value.evidenceReviewLinkIds, "evidenceReviewLinkIds", sourceName),
  };
}

function isVerifiedLike(conceptStatus: TheoryConceptStatus, definitionStatus?: TheoryConceptStatus) {
  if (conceptStatus === "synthetic_fixture") return definitionStatus === undefined || definitionStatus === "synthetic_fixture";
  return conceptStatus === "verified" && (definitionStatus === undefined || definitionStatus === "verified");
}

function hasOpenBlockingBlockers(blockerIds: readonly string[], blockersById: ReadonlyMap<string, TheoryConceptBlocker>) {
  return blockerIds.some((blockerId) => {
    const blocker = blockersById.get(blockerId);
    return blocker?.status === "open" && blocker.severity === "blocking";
  });
}

function assertUniqueIds(ids: readonly string[], sourceName: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${sourceName} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function assertKnownIds(ids: readonly string[], knownIds: ReadonlySet<string>, fieldName: string, sourceName: string) {
  for (const id of ids) {
    if (!knownIds.has(id)) throw new Error(`${sourceName}.${fieldName} references unknown id ${id}`);
  }
}

function assertNoSyntheticFixturesInCommittedRegistry(registry: TheoryConceptCorpusRegistry) {
  if (registry.boundaryPolicy.syntheticFixturesOnly) return;
  const syntheticConcept = registry.concepts.find((concept) => (
    concept.sourceStatus === "synthetic_fixture" || concept.definitionStatus === "synthetic_fixture"
  ));
  if (syntheticConcept) throw new Error("synthetic_fixture theory concepts are allowed only when boundaryPolicy.syntheticFixturesOnly is true");
}

function assertConceptBusinessRules(
  concept: TheoryConceptRecord,
  relationIds: ReadonlySet<string>,
  alternativeViewIds: ReadonlySet<string>,
  blockerIds: ReadonlySet<string>,
  blockersById: ReadonlyMap<string, TheoryConceptBlocker>,
  sourceName: string,
) {
  if (concept.provenance.length === 0) throw new Error(`${sourceName}.provenance must include source identity metadata`);
  assertKnownIds(concept.relationIds, relationIds, "relationIds", sourceName);
  assertKnownIds(concept.alternativeViewIds, alternativeViewIds, "alternativeViewIds", sourceName);
  assertKnownIds(concept.blockerIds, blockerIds, "blockerIds", sourceName);
  for (const uncertainty of concept.uncertaintyNotes) {
    assertKnownIds(uncertainty.blockerIds, blockerIds, `uncertaintyNotes.${uncertainty.uncertaintyId}.blockerIds`, sourceName);
    if (uncertainty.releaseBlocking && uncertainty.status === "open" && concept.downstreamUse.highConfidenceTheoryClaimAllowed) {
      throw new Error(`${sourceName} cannot allow high-confidence theory claims while release-blocking uncertainty is open`);
    }
  }

  const hasBlocking = hasOpenBlockingBlockers(concept.blockerIds, blockersById);
  const verifiedLike = isVerifiedLike(concept.sourceStatus, concept.definitionStatus);
  if (concept.sourceStatus === "verified" || concept.definitionStatus === "verified") {
    if (!concept.lastVerifiedAt) throw new Error(`${sourceName} verified theory concepts require lastVerifiedAt`);
    if (!concept.provenance.every((entry) => entry.status === "verified" && entry.lastVerifiedAt)) {
      throw new Error(`${sourceName} verified theory concepts require verified source provenance and lastVerifiedAt`);
    }
  }
  if (concept.sourceStatus === "verified" && concept.definitionStatus !== "verified") {
    throw new Error(`${sourceName} verified source status requires verified definitionStatus`);
  }
  if (concept.definitionStatus === "verified" && concept.sourceStatus !== "verified") {
    throw new Error(`${sourceName} verified definitionStatus requires verified sourceStatus`);
  }
  if (!verifiedLike || hasBlocking) {
    const downstream = concept.downstreamUse;
    if (
      downstream.s212TheoryReviewInputAllowed
      || downstream.s214ReferenceGenerationInputAllowed
      || downstream.s215ReleaseGateInputAllowed
      || downstream.s207PackageReleaseAnchorAllowed
      || downstream.s205RubricEvidenceSourceAllowed
      || downstream.highConfidenceTheoryClaimAllowed
    ) {
      throw new Error(`${sourceName} unresolved theory concept status must block high-confidence S212/S214/S215/S207/S205 downstream use`);
    }
    if (!downstream.blockUntilResolved) throw new Error(`${sourceName}.downstreamUse.blockUntilResolved must be true for unresolved concepts`);
  }
}

function assertAnchorBusinessRules(
  anchor: TheoryConceptAnchor,
  conceptsById: ReadonlyMap<string, TheoryConceptRecord>,
  blockersById: ReadonlyMap<string, TheoryConceptBlocker>,
  sourceName: string,
) {
  const concept = conceptsById.get(anchor.conceptId);
  if (!concept) throw new Error(`${sourceName}.conceptId references unknown theory concept ${anchor.conceptId}`);
  if (anchor.locator.kind === "concept_id" && anchor.locator.ref !== anchor.conceptId) {
    throw new Error(`${sourceName}.locator.ref must match conceptId for concept_id locators`);
  }
  if (anchor.sourceStatus === "verified" || anchor.definitionStatus === "verified") {
    if (!anchor.verifiedAt) throw new Error(`${sourceName} verified concept anchors require verifiedAt`);
    if (!isVerifiedLike(concept.sourceStatus, concept.definitionStatus)) {
      throw new Error(`${sourceName} cannot be verified while linked concept status is unresolved`);
    }
  }
  if (hasOpenBlockingBlockers(anchor.blockerIds, blockersById) && isVerifiedLike(anchor.sourceStatus, anchor.definitionStatus)) {
    throw new Error(`${sourceName} cannot be verified while open blocking concept blockers remain`);
  }
}

function assertRelationBusinessRules(
  relation: TheoryConceptRelation,
  conceptIds: ReadonlySet<string>,
  blockerIds: ReadonlySet<string>,
  sourceName: string,
) {
  assertKnownIds([relation.fromConceptId, relation.toConceptId], conceptIds, "concept relation endpoint", sourceName);
  assertKnownIds(relation.blockerIds, blockerIds, "blockerIds", sourceName);
  if (relation.relationKind === "unclear_relation" && relation.relationStatus === "verified") {
    throw new Error(`${sourceName} unclear_relation cannot be marked verified`);
  }
  if ((relation.relationStatus === "verified" || relation.sourceStatus === "verified") && !relation.reviewedAt) {
    throw new Error(`${sourceName} verified concept relations require reviewedAt`);
  }
}

function assertAlternativeBusinessRules(
  alternative: TheoryAlternativeView,
  conceptsById: ReadonlyMap<string, TheoryConceptRecord>,
  blockerIds: ReadonlySet<string>,
  sourceName: string,
) {
  const concept = conceptsById.get(alternative.conceptId);
  if (!concept) throw new Error(`${sourceName}.conceptId references unknown theory concept ${alternative.conceptId}`);
  const provenanceIds = new Set(concept.provenance.map((entry) => entry.provenanceId));
  const uncertaintyIds = new Set(concept.uncertaintyNotes.map((entry) => entry.uncertaintyId));
  assertKnownIds(alternative.provenanceIds, provenanceIds, "provenanceIds", sourceName);
  assertKnownIds(alternative.uncertaintyIds, uncertaintyIds, "uncertaintyIds", sourceName);
  assertKnownIds(alternative.blockerIds, blockerIds, "blockerIds", sourceName);
  if (alternative.status !== "accepted_alternative" && alternative.releaseImplication === "non_blocking_alternative") {
    throw new Error(`${sourceName} non-blocking alternative status requires accepted_alternative`);
  }
}

function assertConceptCheckRules(
  check: TheoryConceptCheck,
  conceptsById: ReadonlyMap<string, TheoryConceptRecord>,
  anchorsById: ReadonlyMap<string, TheoryConceptAnchor>,
  blockersById: ReadonlyMap<string, TheoryConceptBlocker>,
  sourceName: string,
) {
  assertKnownIds(check.conceptIds, new Set(conceptsById.keys()), "conceptIds", sourceName);
  assertKnownIds(check.conceptAnchorIds, new Set(anchorsById.keys()), "conceptAnchorIds", sourceName);
  if (check.conceptIds.length === 0) throw new Error(`${sourceName}.conceptIds must not be empty`);
  if (check.conceptAnchorIds.length === 0) throw new Error(`${sourceName}.conceptAnchorIds must not be empty`);
  const linkedConcepts = check.conceptIds.map((conceptId) => conceptsById.get(conceptId)).filter((concept): concept is TheoryConceptRecord => Boolean(concept));
  const linkedAnchors = check.conceptAnchorIds.map((anchorId) => anchorsById.get(anchorId)).filter((anchor): anchor is TheoryConceptAnchor => Boolean(anchor));
  const conceptsVerified = linkedConcepts.every((concept) => isVerifiedLike(concept.sourceStatus, concept.definitionStatus));
  const anchorsVerified = linkedAnchors.every((anchor) => isVerifiedLike(anchor.sourceStatus, anchor.definitionStatus));
  const hasBlocking = hasOpenBlockingBlockers(check.blockerIds, blockersById)
    || linkedConcepts.some((concept) => hasOpenBlockingBlockers(concept.blockerIds, blockersById))
    || linkedAnchors.some((anchor) => hasOpenBlockingBlockers(anchor.blockerIds, blockersById));
  const highIntent = check.releaseConfidence.status === "high_allowed"
    || check.releaseConfidence.s212HighConfidenceAllowed
    || check.releaseConfidence.s214GenerationAllowed
    || check.releaseConfidence.s215ReleaseGateAllowed;

  if (highIntent && (
    hasBlocking
    || !conceptsVerified
    || !anchorsVerified
    || !isVerifiedLike(check.conceptStatus, check.definitionStatus)
    || !isVerifiedLike(check.relationshipStatus)
    || !isVerifiedLike(check.sourceCoverageStatus)
  )) {
    throw new Error(`${sourceName} high-confidence S212/S214/S215 theory use requires verified concepts, verified relationships, verified source coverage, and no open blockers`);
  }
}

function assertPackageLinkRules(
  link: ReferencePackageTheoryConceptLink,
  anchorsById: ReadonlyMap<string, TheoryConceptAnchor>,
  blockersById: ReadonlyMap<string, TheoryConceptBlocker>,
  sourceName: string,
) {
  assertKnownIds(link.theoryConceptAnchorIds, new Set(anchorsById.keys()), "theoryConceptAnchorIds", sourceName);
  if (link.theoryConceptAnchorIds.length === 0) throw new Error(`${sourceName}.theoryConceptAnchorIds must not be empty`);
  const linkedAnchors = link.theoryConceptAnchorIds.map((anchorId) => anchorsById.get(anchorId)).filter((anchor): anchor is TheoryConceptAnchor => Boolean(anchor));
  const anchorsVerified = linkedAnchors.every((anchor) => isVerifiedLike(anchor.sourceStatus, anchor.definitionStatus));
  const hasBlocking = hasOpenBlockingBlockers(link.blockerIds, blockersById)
    || linkedAnchors.some((anchor) => hasOpenBlockingBlockers(anchor.blockerIds, blockersById));
  const releaseReadyIntent = link.releaseReady || link.packageReleaseStatus === "ready_for_s215" || link.packageReleaseStatus === "released";
  if (releaseReadyIntent && (hasBlocking || !isVerifiedLike(link.conceptStatus) || !anchorsVerified)) {
    throw new Error(`${sourceName} release-ready package links require verified theory concepts and no open concept blockers`);
  }
  if (releaseReadyIntent && link.releaseGateStatus !== "eligible_for_s215") {
    throw new Error(`${sourceName}.releaseGateStatus must be eligible_for_s215 for release-ready package links`);
  }
}

function assertEvidenceLinkRules(
  link: EvidenceReviewTheoryConceptLink,
  anchorsById: ReadonlyMap<string, TheoryConceptAnchor>,
  blockersById: ReadonlyMap<string, TheoryConceptBlocker>,
  sourceName: string,
) {
  const anchor = anchorsById.get(link.theoryConceptAnchorId);
  if (!anchor) throw new Error(`${sourceName}.theoryConceptAnchorId references unknown theory concept anchor`);
  const conceptVerified = isVerifiedLike(anchor.sourceStatus, anchor.definitionStatus);
  const hasBlocking = hasOpenBlockingBlockers(link.blockerIds, blockersById) || hasOpenBlockingBlockers(anchor.blockerIds, blockersById);
  if (link.s205SourceStatus === "verified" && !conceptVerified) {
    throw new Error(`${sourceName}.s205SourceStatus cannot be verified while linked theory concept is unresolved`);
  }
  if (link.reviewConfidence === "high" && (hasBlocking || !conceptVerified)) {
    throw new Error(`${sourceName}.reviewConfidence high requires verified theory concept status and no open blockers`);
  }
  if (link.s205SourceStatus !== "verified" && link.s205WithholdReasons.length === 0) {
    throw new Error(`${sourceName}.s205WithholdReasons must explain unresolved theory concept status`);
  }
}

function assertRegistryBusinessRules(registry: TheoryConceptCorpusRegistry) {
  const conceptIds = new Set(registry.concepts.map((concept) => concept.conceptId));
  const anchorIds = new Set(registry.conceptAnchors.map((anchor) => anchor.anchorId));
  const relationIds = new Set(registry.conceptRelations.map((relation) => relation.relationId));
  const alternativeViewIds = new Set(registry.alternativeViews.map((alternative) => alternative.alternativeViewId));
  const blockerIds = new Set(registry.blockers.map((blocker) => blocker.blockerId));
  const packageLinkIds = new Set(registry.referencePackageLinks.map((link) => link.linkId));
  const evidenceLinkIds = new Set(registry.evidenceReviewLinks.map((link) => link.linkId));
  const conceptsById = new Map(registry.concepts.map((concept) => [concept.conceptId, concept]));
  const anchorsById = new Map(registry.conceptAnchors.map((anchor) => [anchor.anchorId, anchor]));
  const blockersById = new Map(registry.blockers.map((blocker) => [blocker.blockerId, blocker]));

  assertUniqueIds([...conceptIds], "appraiser_second_round_theory_concepts.concepts");
  assertUniqueIds([...anchorIds], "appraiser_second_round_theory_concepts.conceptAnchors");
  assertUniqueIds([...relationIds], "appraiser_second_round_theory_concepts.conceptRelations");
  assertUniqueIds([...alternativeViewIds], "appraiser_second_round_theory_concepts.alternativeViews");
  assertUniqueIds([...blockerIds], "appraiser_second_round_theory_concepts.blockers");
  assertUniqueIds([...packageLinkIds], "appraiser_second_round_theory_concepts.referencePackageLinks");
  assertUniqueIds([...evidenceLinkIds], "appraiser_second_round_theory_concepts.evidenceReviewLinks");
  assertNoSyntheticFixturesInCommittedRegistry(registry);

  registry.concepts.forEach((concept, index) => {
    assertConceptBusinessRules(
      concept,
      relationIds,
      alternativeViewIds,
      blockerIds,
      blockersById,
      `appraiser_second_round_theory_concepts.concepts[${index}]`,
    );
  });
  registry.conceptAnchors.forEach((anchor, index) => {
    const sourceName = `appraiser_second_round_theory_concepts.conceptAnchors[${index}]`;
    assertKnownIds(anchor.blockerIds, blockerIds, "blockerIds", sourceName);
    assertAnchorBusinessRules(anchor, conceptsById, blockersById, sourceName);
  });
  registry.conceptRelations.forEach((relation, index) => {
    assertRelationBusinessRules(
      relation,
      conceptIds,
      blockerIds,
      `appraiser_second_round_theory_concepts.conceptRelations[${index}]`,
    );
  });
  registry.alternativeViews.forEach((alternative, index) => {
    assertAlternativeBusinessRules(
      alternative,
      conceptsById,
      blockerIds,
      `appraiser_second_round_theory_concepts.alternativeViews[${index}]`,
    );
  });
  registry.blockers.forEach((blocker, index) => {
    const sourceName = `appraiser_second_round_theory_concepts.blockers[${index}]`;
    assertKnownIds(blocker.conceptIds, conceptIds, "conceptIds", sourceName);
    assertKnownIds(blocker.conceptAnchorIds, anchorIds, "conceptAnchorIds", sourceName);
    assertKnownIds(blocker.relationIds, relationIds, "relationIds", sourceName);
    assertKnownIds(blocker.alternativeViewIds, alternativeViewIds, "alternativeViewIds", sourceName);
    assertKnownIds(blocker.referencePackageLinkIds, packageLinkIds, "referencePackageLinkIds", sourceName);
    assertKnownIds(blocker.evidenceReviewLinkIds, evidenceLinkIds, "evidenceReviewLinkIds", sourceName);
  });
  registry.theoryConceptChecks.forEach((check, index) => {
    const sourceName = `appraiser_second_round_theory_concepts.theoryConceptChecks[${index}]`;
    assertKnownIds(check.blockerIds, blockerIds, "blockerIds", sourceName);
    assertConceptCheckRules(check, conceptsById, anchorsById, blockersById, sourceName);
  });
  registry.referencePackageLinks.forEach((link, index) => {
    const sourceName = `appraiser_second_round_theory_concepts.referencePackageLinks[${index}]`;
    assertKnownIds(link.blockerIds, blockerIds, "blockerIds", sourceName);
    assertPackageLinkRules(link, anchorsById, blockersById, sourceName);
  });
  registry.evidenceReviewLinks.forEach((link, index) => {
    const sourceName = `appraiser_second_round_theory_concepts.evidenceReviewLinks[${index}]`;
    assertKnownIds(link.blockerIds, blockerIds, "blockerIds", sourceName);
    assertEvidenceLinkRules(link, anchorsById, blockersById, sourceName);
  });
}

function validateRegistry(raw: unknown): TheoryConceptCorpusRegistry {
  const sourceName = "appraiser_second_round_theory_concepts.json";
  assertRecord(raw, sourceName);
  assertNoForbiddenRawFields(raw, sourceName);
  if (!Array.isArray(raw.concepts)) throw new Error(`${sourceName}.concepts must be an array`);
  if (!Array.isArray(raw.conceptAnchors)) throw new Error(`${sourceName}.conceptAnchors must be an array`);
  if (!Array.isArray(raw.conceptRelations)) throw new Error(`${sourceName}.conceptRelations must be an array`);
  if (!Array.isArray(raw.alternativeViews)) throw new Error(`${sourceName}.alternativeViews must be an array`);
  if (!Array.isArray(raw.theoryConceptChecks)) throw new Error(`${sourceName}.theoryConceptChecks must be an array`);
  if (!Array.isArray(raw.referencePackageLinks)) throw new Error(`${sourceName}.referencePackageLinks must be an array`);
  if (!Array.isArray(raw.evidenceReviewLinks)) throw new Error(`${sourceName}.evidenceReviewLinks must be an array`);
  if (!Array.isArray(raw.blockers)) throw new Error(`${sourceName}.blockers must be an array`);

  const registry: TheoryConceptCorpusRegistry = {
    schemaVersion: assertString(raw.schemaVersion, "schemaVersion", sourceName),
    registryType: assertOneOf(
      raw.registryType,
      "registryType",
      sourceName,
      ["appraiser_second_round_theory_concept_corpus_registry"] as const,
    ),
    registryScope: assertOneOf(raw.registryScope, "registryScope", sourceName, ["appraiser_second_round_theory_only"] as const),
    generatedBy: assertString(raw.generatedBy, "generatedBy", sourceName),
    generatedAt: assertIsoInstant(raw.generatedAt, "generatedAt", sourceName),
    canonicalQuestionRegistryPath: assertString(raw.canonicalQuestionRegistryPath, "canonicalQuestionRegistryPath", sourceName, 400),
    referenceAnswerPackageRegistryPath: assertString(raw.referenceAnswerPackageRegistryPath, "referenceAnswerPackageRegistryPath", sourceName, 400),
    rubricEvidenceContractVersion: assertOneOf(
      raw.rubricEvidenceContractVersion,
      "rubricEvidenceContractVersion",
      sourceName,
      [RUBRIC_EVIDENCE_CONTRACT_VERSION] as const,
    ),
    storagePolicy: assertStoragePolicy(raw.storagePolicy, sourceName),
    boundaryPolicy: assertBoundaryPolicy(raw.boundaryPolicy, sourceName),
    concepts: raw.concepts.map((entry, index) => validateConcept(entry, index)),
    conceptAnchors: raw.conceptAnchors.map((entry, index) => validateConceptAnchor(entry, index)),
    conceptRelations: raw.conceptRelations.map((entry, index) => validateRelation(entry, index)),
    alternativeViews: raw.alternativeViews.map((entry, index) => validateAlternativeView(entry, index)),
    theoryConceptChecks: raw.theoryConceptChecks.map((entry, index) => validateConceptCheck(entry, index)),
    referencePackageLinks: raw.referencePackageLinks.map((entry, index) => validateReferencePackageLink(entry, index)),
    evidenceReviewLinks: raw.evidenceReviewLinks.map((entry, index) => validateEvidenceReviewLink(entry, index)),
    blockers: raw.blockers.map((entry, index) => validateBlocker(entry, index)),
  };
  assertRegistryBusinessRules(registry);
  return registry;
}

function countByStatus<T extends string, U>(
  values: readonly T[],
  records: readonly U[],
  selector: (record: U) => T,
): Record<T, number> {
  return values.reduce((counts, value) => {
    counts[value] = records.filter((record) => selector(record) === value).length;
    return counts;
  }, {} as Record<T, number>);
}

function conceptSort(left: TheoryConceptRecord, right: TheoryConceptRecord) {
  return left.conceptId.localeCompare(right.conceptId);
}

function anchorSort(left: TheoryConceptAnchor, right: TheoryConceptAnchor) {
  return left.anchorId.localeCompare(right.anchorId);
}

function conceptHasOpenBlocker(concept: TheoryConceptRecord, blockersById: ReadonlyMap<string, TheoryConceptBlocker>) {
  return hasOpenBlockingBlockers(concept.blockerIds, blockersById);
}

export function buildTheoryConceptCorpusReport(
  registry: TheoryConceptCorpusRegistry,
  config: TheoryConceptCorpusRegistryConfig = {},
): TheoryConceptCorpusReport {
  const concepts = [...registry.concepts].sort(conceptSort);
  const conceptAnchors = [...registry.conceptAnchors].sort(anchorSort);
  const blockersById = new Map(registry.blockers.map((blocker) => [blocker.blockerId, blocker]));
  const conceptsNeedingOfficialVerification = concepts
    .filter((concept) => concept.sourceStatus === "needs_official_verification" || concept.definitionStatus === "needs_official_verification")
    .map((concept) => concept.conceptId);
  const conceptsWithOpenBlockers = concepts
    .filter((concept) => conceptHasOpenBlocker(concept, blockersById))
    .map((concept) => concept.conceptId);
  const blockedReleasePackageLinkIds = registry.referencePackageLinks
    .filter((link) => link.releaseGateStatus === "blocked_by_theory_concept" || hasOpenBlockingBlockers(link.blockerIds, blockersById))
    .map((link) => link.linkId)
    .sort();

  return {
    schemaVersion: registry.schemaVersion,
    reportType: "appraiser_second_round_theory_concept_corpus_report",
    generatedBy: "scripts/validate-theory-concept-corpus.mjs",
    generatedAt: REPORT_GENERATED_AT,
    theoryConceptRegistryPath: config.registryPath ?? DEFAULT_REGISTRY_PATH,
    canonicalQuestionRegistryPath: registry.canonicalQuestionRegistryPath,
    referenceAnswerPackageRegistryPath: registry.referenceAnswerPackageRegistryPath,
    rubricEvidenceContractVersion: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    storagePolicy: registry.storagePolicy,
    totals: {
      conceptCount: concepts.length,
      conceptAnchorCount: conceptAnchors.length,
      conceptRelationCount: registry.conceptRelations.length,
      alternativeViewCount: registry.alternativeViews.length,
      theoryConceptCheckCount: registry.theoryConceptChecks.length,
      referencePackageLinkCount: registry.referencePackageLinks.length,
      evidenceReviewLinkCount: registry.evidenceReviewLinks.length,
      verifiedConceptCount: concepts.filter((concept) => isVerifiedLike(concept.sourceStatus, concept.definitionStatus)).length,
      needsOfficialVerificationCount: conceptsNeedingOfficialVerification.length,
      unresolvedConflictCount: concepts.filter((concept) => (
        concept.sourceStatus === "unresolved_conflict" || concept.definitionStatus === "unresolved_conflict"
      )).length,
      openBlockingBlockerCount: registry.blockers.filter((blocker) => blocker.status === "open" && blocker.severity === "blocking").length,
      blockedReleasePackageLinkCount: blockedReleasePackageLinkIds.length,
      highConfidenceReviewAllowedCheckCount: registry.theoryConceptChecks.filter((check) => check.releaseConfidence.s212HighConfidenceAllowed).length,
      conceptStatusCounts: countByStatus(THEORY_CONCEPT_STATUSES, concepts, (concept) => concept.sourceStatus),
      definitionStatusCounts: countByStatus(THEORY_CONCEPT_STATUSES, concepts, (concept) => concept.definitionStatus),
      relationStatusCounts: countByStatus(THEORY_CONCEPT_STATUSES, registry.conceptRelations, (relation) => relation.relationStatus),
      sourceCoverageStatusCounts: countByStatus(
        THEORY_CONCEPT_STATUSES,
        registry.theoryConceptChecks,
        (check) => check.sourceCoverageStatus,
      ),
    },
    conceptIds: concepts.map((concept) => concept.conceptId),
    conceptAnchorIds: conceptAnchors.map((anchor) => anchor.anchorId),
    conceptsNeedingOfficialVerification,
    conceptsWithOpenBlockers,
    blockedReleasePackageLinkIds,
    metadataOnly: true,
    safeUse: "s209_theory_concept_corpus_validation_only",
  };
}

export function loadTheoryConceptCorpusRegistry(config: TheoryConceptCorpusRegistryConfig = {}): TheoryConceptCorpusRegistry {
  return validateRegistry(readJsonFile(resolveRepoPath(config.registryPath, DEFAULT_REGISTRY_PATH)));
}

export function loadTheoryConceptCorpusReport(config: TheoryConceptCorpusRegistryConfig = {}): TheoryConceptCorpusReport {
  const registry = loadTheoryConceptCorpusRegistry(config);
  const reportPath = resolveRepoPath(config.reportPath, DEFAULT_REPORT_PATH);
  const raw = readJsonFile(reportPath);
  assertNoForbiddenRawFields(raw, "appraiser_second_round_theory_concept_report.json");
  const expected = buildTheoryConceptCorpusReport(registry, config);
  if (JSON.stringify(raw) !== JSON.stringify(expected)) {
    throw new Error("appraiser_second_round_theory_concept_report.json is stale or nondeterministic; regenerate it with check:theory-concept-corpus -- --write-report");
  }
  return expected;
}
