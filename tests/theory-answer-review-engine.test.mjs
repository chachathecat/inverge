import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION,
  S212_THEORY_DIMENSION_IDS,
  buildS212TheoryAnswerReview,
} from "../lib/review-os/theory-answer-review-engine.ts";
import {
  validateRubricEvidenceReviewContract,
} from "../lib/review-os/rubric-evidence-contract.ts";
import { assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const questionId = "synthetic-s212-theory-question";
const referencePackageId = "synthetic-s212-theory-reference-package";
const conceptCheckId = "synthetic-s212-theory-concept-check";
const conceptId = "synthetic-s212-theory-concept";
const anchorId = "synthetic-s212-theory-anchor";

function storagePolicy() {
  return {
    metadataOnly: true,
    rawDefinitionTextStored: false,
    rawOfficialQuestionTextStored: false,
    rawOfficialAnswerTextStored: false,
    rawReferenceAnswerTextStored: false,
    rawLearnerAnswerStored: false,
    rawOcrTextStored: false,
    rawSourceExcerptStored: false,
    rawTextbookOrAcademyExplanationStored: false,
    rawAssetBytesStored: false,
    providerPayloadStored: false,
  };
}

function syntheticTheoryConceptRegistry() {
  return {
    schemaVersion: "s209.theory_concept_corpus.v1",
    registryType: "appraiser_second_round_theory_concept_corpus_registry",
    registryScope: "appraiser_second_round_theory_only",
    generatedBy: "tests/theory-answer-review-engine.test.mjs",
    generatedAt: "2090-01-01T00:00:00.000Z",
    canonicalQuestionRegistryPath: "synthetic",
    referenceAnswerPackageRegistryPath: "synthetic",
    rubricEvidenceContractVersion: "s205.common_rubric_evidence.v1",
    storagePolicy: storagePolicy(),
    boundaryPolicy: {
      syntheticFixturesOnly: true,
      officialQuestionBodiesStored: false,
      officialAnswerBodiesStored: false,
      referenceAnswerBodiesStored: false,
      learnerAnswerBodiesStored: false,
      theoryAnswerReviewEngineImplemented: false,
      referenceAnswerGenerationImplemented: false,
      billingOrLedgerImplemented: false,
      publicArchiveUiImplemented: false,
      instructorRuntimeRoutesChanged: false,
      providerCallsImplemented: false,
      authOrEntitlementChanged: false,
      ocrRuntimeImplemented: false,
    },
    concepts: [
      {
        conceptId,
        subjectScope: ["theory"],
        unit: "synthetic_s212_unit",
        conceptTitleKo: "Synthetic S212 Concept",
        conceptKind: "valuation_principle",
        definitionStatus: "synthetic_fixture",
        sourceStatus: "synthetic_fixture",
        provenance: [],
        aliases: [],
        relationIds: [],
        alternativeViewIds: [],
        uncertaintyNotes: [],
        downstreamUse: {
          s212TheoryReviewInputAllowed: true,
          s214ReferenceGenerationInputAllowed: false,
          s215ReleaseGateInputAllowed: false,
          s207PackageReleaseAnchorAllowed: true,
          s205RubricEvidenceSourceAllowed: true,
          highConfidenceTheoryClaimAllowed: true,
          blockUntilResolved: false,
        },
        blockerIds: [],
        contentPolicy: storagePolicy(),
      },
    ],
    conceptAnchors: [
      {
        anchorId,
        conceptId,
        anchorKind: "concept_identity",
        locator: {
          kind: "concept_id",
          ref: conceptId,
          rawTextStored: false,
          excerptStored: false,
          bodyTextStored: false,
        },
        sourceStatus: "synthetic_fixture",
        definitionStatus: "synthetic_fixture",
        blockerIds: [],
        s207SourceAnchorKind: "theory_concept_source",
        s205SourceReferenceKind: "subject_validator",
        containsRawContent: false,
      },
    ],
    conceptRelations: [],
    alternativeViews: [],
    theoryConceptChecks: [
      {
        checkId: conceptCheckId,
        questionId,
        conceptIds: [conceptId],
        conceptAnchorIds: [anchorId],
        conceptStatus: "synthetic_fixture",
        definitionStatus: "synthetic_fixture",
        relationshipStatus: "synthetic_fixture",
        sourceCoverageStatus: "synthetic_fixture",
        releaseConfidence: {
          status: "high_allowed",
          s212HighConfidenceAllowed: true,
          s212ReviewAllowed: true,
          s214GenerationAllowed: false,
          s215ReleaseGateAllowed: false,
        },
        blockerIds: [],
        s207ReferencePackageIds: [referencePackageId],
        s205SourceReferenceIds: ["src-s209-theory-concept-source"],
        metadataOnly: true,
      },
    ],
    referencePackageLinks: [],
    evidenceReviewLinks: [],
    blockers: [],
  };
}

function syntheticReferencePackageRegistry() {
  const checkKinds = [
    "definition",
    "logic_chain",
    "comparison",
    "application",
    "term_consistency",
    "alternative_view",
    "source_coverage",
    "unsupported_claim",
  ];
  return {
    schemaVersion: "s207.reference_answer_package.v1",
    registryType: "appraiser_second_round_reference_answer_package_registry",
    registryScope: "appraiser_second_round_only",
    generatedBy: "tests/theory-answer-review-engine.test.mjs",
    generatedAt: "2090-01-01T00:00:00.000Z",
    canonicalQuestionRegistryPath: "synthetic",
    storagePolicy: {
      metadataOnly: true,
      rawOfficialFileStored: false,
      rawOfficialQuestionTextStored: false,
      rawOfficialAnswerTextStored: false,
      rawReferenceAnswerTextStored: false,
      rawLearnerAnswerStored: false,
      rawOcrTextStored: false,
      rawSourceExcerptStored: false,
      rawAssetBytesStored: false,
      thirdPartyAcademyContentStored: false,
    },
    boundaryPolicy: {
      syntheticFixturesOnly: true,
      officialQuestionBodiesStored: false,
      officialAnswerBodiesStored: false,
      learnerAnswerBodiesStored: false,
      referenceAnswerBodiesStored: false,
      referenceAnswersGenerated: false,
      gradingEngineImplemented: false,
      billingOrLedgerImplemented: false,
      publicArchiveUiImplemented: false,
      instructorRuntimeRoutesChanged: false,
    },
    packages: [
      {
        id: referencePackageId,
        mode: "synthetic_fixture",
        questionId,
        subject: "theory",
        officialSource: {
          sourceStatus: "synthetic_fixture",
          questionId,
          sourceId: "synthetic-s212-source",
          rightsStatus: "redistribution_allowed",
          displayMode: "full_text",
          extractionStatus: "extracted_private",
          problemTextStatus: "synthetic_fixture",
          canonicalVerificationStatus: "synthetic_fixture",
          officialAnswerAvailability: "not_available_for_second_round",
          officialAnswerUsed: false,
          officialGradingCriteriaUsed: false,
        },
        learningReference: {
          status: "released_learning_reference",
          learnerFacingLabelKey: "verified_learning_reference",
          requiredCaveatKey: "learning_reference_not_official_answer",
          officialClaimAllowed: false,
          scorePredictionAllowed: false,
          passProbabilityAllowed: false,
        },
        sections: [],
        sourceAnchors: [],
        evidenceAnchors: [],
        uncertainty: [],
        alternativeReasoningPaths: [],
        theoryValidation: {
          checks: checkKinds.map((kind) => ({
            checkId: `synthetic-s212-theory-${kind}`,
            kind,
            status: "synthetic_fixture",
            releaseBlocking: true,
            sourceAnchorIds: [],
            evidenceAnchorIds: [],
          })),
        },
        verificationReport: {
          sourceStatus: "source_verified",
          evidenceStatus: "subject_validated",
          subjectValidationStatus: "subject_validated",
          criticConsensusStatus: "critic_consensus_passed",
          releaseGateStatus: "released",
          independentCandidateCount: 3,
          criticPassCount: 1,
          unresolvedConflictCount: 0,
        },
        releaseBlockers: [],
        release: {
          status: "released",
          releasedAt: "2090-01-01T00:00:00.000Z",
          requiredCaveatKey: "learning_reference_not_official_answer",
          noOfficialAnswerGuardrail: true,
          learnerFacingOfficialClaimAllowed: false,
          releaseRequiresNoOpenBlockers: true,
        },
        downstreamUsage: {
          s214GenerationInput: false,
          s215ReleaseGateInput: false,
          s211LawReviewInput: false,
          s212TheoryReviewInput: true,
          s213PracticeReviewInput: false,
        },
      },
    ],
  };
}

function baseInput(overrides = {}) {
  return {
    questionId,
    answerSubmissionId: "submission-s212-synthetic-1",
    referencePackageId,
    theoryConceptCheckId: conceptCheckId,
    primaryGapDimensionId: "application_evaluation",
    learnerEvidenceRefs: [
      {
        id: "ev-s212-segment-1",
        segmentId: "segment-s212-1",
        ocrState: "confirmed_by_learner",
        verifiedByLearner: true,
        confidence: "medium",
      },
    ],
    dimensionSignals: [
      { dimensionId: "definition_quality", observedQuality: "partial", evidenceRefIds: ["ev-s212-segment-1"], conceptNodeIds: [conceptId] },
      { dimensionId: "theory_basis", observedQuality: "strong", evidenceRefIds: ["ev-s212-segment-1"], conceptNodeIds: [conceptId] },
      { dimensionId: "comparison_frame", observedQuality: "partial", evidenceRefIds: ["ev-s212-segment-1"], conceptNodeIds: [conceptId] },
      { dimensionId: "application_evaluation", observedQuality: "missing", evidenceRefIds: ["ev-s212-segment-1"], conceptNodeIds: [conceptId] },
      { dimensionId: "conclusion", observedQuality: "partial", evidenceRefIds: ["ev-s212-segment-1"], conceptNodeIds: [conceptId] },
      { dimensionId: "compression_relevance", observedQuality: "strong", evidenceRefIds: ["ev-s212-segment-1"], conceptNodeIds: [conceptId] },
    ],
    ...overrides,
  };
}

function syntheticConfig() {
  return {
    referencePackageRegistry: syntheticReferencePackageRegistry(),
    theoryConceptRegistry: syntheticTheoryConceptRegistry(),
  };
}

test("S212 builds a metadata-only S205-compatible theory review from S207 and S209 synthetic fixtures", () => {
  const result = buildS212TheoryAnswerReview(baseInput(), syntheticConfig());
  const contract = result.contract;
  const validation = validateRubricEvidenceReviewContract(contract);

  assert.equal(result.version, S212_THEORY_ANSWER_REVIEW_ENGINE_VERSION);
  assert.equal(validation.valid, true);
  assert.equal(contract.subject, "theory");
  assert.equal(contract.reviewStatus, "ready");
  assert.deepEqual(contract.rubricDimensions.map((dimension) => dimension.id), S212_THEORY_DIMENSION_IDS);
  assert.equal(contract.deductionCandidates.length, 4);
  assert.equal(contract.deductionCandidates.every((candidate) => candidate.evidenceRefIds.includes("ev-s212-segment-1")), true);
  assert.equal(contract.primaryGap.dimensionId, "application_evaluation");
  assert.equal(contract.nextAction.actionType, "rewrite");
  assert.equal(contract.practiceScoreRange.status, "estimated");
  assert.equal(contract.practiceScoreRange.nonOfficial, true);
  assert.equal(contract.practiceScoreRange.passProbability, false);
  assert.equal(contract.practiceScoreRange.confirmedScore, false);
  assert.equal(result.qualityGate.conceptSourceVerification, "passed");
  assert.equal(result.qualityGate.referencePackageVerification, "passed");
  assertNoRawUserDataInDerived(result.derivedMetadata);
});

test("S212 fails closed against unresolved real concept and reference-package metadata", () => {
  const result = buildS212TheoryAnswerReview(baseInput({
    referencePackageId: undefined,
    theoryConceptCheckId: undefined,
  }));
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_unverified_source");
  assert.equal(contract.withhold.withheld, true);
  assert.ok(contract.withhold.reasons.includes("theory_concept_unverified"));
  assert.ok(contract.withhold.reasons.includes("reference_package_unverified"));
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(contract.practiceScoreRange.range, null);
  assert.equal(contract.deductionCandidates.length, 0);
  assert.equal(contract.nextAction.actionType, "withhold_until_verified");
  assert.equal(result.qualityGate.conceptSourceVerification, "failed_closed");
  assert.equal(result.qualityGate.referencePackageVerification, "failed_closed");
});

test("S212 requires learner-answer evidence before any deduction or score-like range", () => {
  const result = buildS212TheoryAnswerReview(baseInput({
    learnerEvidenceRefs: [],
  }), syntheticConfig());
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_insufficient_evidence");
  assert.ok(contract.withhold.reasons.includes("learner_answer_missing"));
  assert.equal(contract.sourceStatus.learnerAnswer, "missing");
  assert.equal(contract.deductionCandidates.length, 0);
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(result.qualityGate.learnerAnswerEvidence, "failed_closed");

  assert.throws(
    () => buildS212TheoryAnswerReview(baseInput({ answerSubmissionId: "" }), syntheticConfig()),
    /answerSubmissionId/,
  );
});

test("S212 rejects raw-content fields and prohibited authority claims", () => {
  assert.throws(
    () => buildS212TheoryAnswerReview({
      ...baseInput(),
      learnerAnswerText: "raw text must not enter S212 metadata",
    }, syntheticConfig()),
    /raw-user-data-in-derived-metadata/,
  );

  assert.throws(
    () => buildS212TheoryAnswerReview({
      ...baseInput(),
      dimensionSignals: [
        ...baseInput().dimensionSignals,
        {
          dimensionId: "definition_quality",
          observedQuality: "partial",
          evidenceRefIds: ["ev-s212-segment-1"],
          label: "official grading shortcut",
        },
      ],
    }, syntheticConfig()),
    /prohibited official-grading/,
  );
});

test("S212 fixtures and output preserve metadata-only and learner/instructor separation", async () => {
  const config = syntheticConfig();
  const result = buildS212TheoryAnswerReview(baseInput(), config);
  const docs = await readFile("docs/s212-theory-answer-review-engine.md", "utf8");
  const engineSource = await readFile("lib/review-os/theory-answer-review-engine.ts", "utf8");

  assert.equal(config.referencePackageRegistry.boundaryPolicy.instructorRuntimeRoutesChanged, false);
  assert.equal(config.theoryConceptRegistry.boundaryPolicy.instructorRuntimeRoutesChanged, false);
  assert.equal(result.contract.dataBoundary.learnerMaterialInContract, false);
  assert.equal(result.contract.dataBoundary.officialMaterialInContract, false);
  assert.equal(result.qualityGate.learnerInstructorSeparation, "learner_only_no_instructor_route");
  assert.doesNotMatch(JSON.stringify(result), /\/instructor|official grading|official model answer|pass probability|pass\/fail/i);
  assert.match(docs, /definition_quality/);
  assert.match(docs, /theory_basis/);
  assert.match(docs, /comparison_frame/);
  assert.match(docs, /application_evaluation/);
  assert.match(docs, /compression_relevance/);
  assert.doesNotMatch(engineSource, /fetch\(|\/api\/|supabase|OPENAI_API_KEY|GEMINI|\/instructor/i);
});

test("active roadmap marks S212 completed and preserves current ready targets", async () => {
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s212 = plan.analyses.find((item) => item.itemId === "S212");
  const s214 = plan.analyses.find((item) => item.itemId === "S214");
  const s215 = plan.analyses.find((item) => item.itemId === "S215");
  const s216 = plan.analyses.find((item) => item.itemId === "S216");
  const s217 = plan.analyses.find((item) => item.itemId === "S217");
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");

  assert.equal(s212?.statusCategory, "completed");
  assert.equal(s214?.statusCategory, "completed");
  assert.equal(s215?.statusCategory, "completed");
  assert.equal(s215?.missingDependencies.includes("S213"), false);
  assert.equal(s215?.missingDependencies.includes("S214"), false);
  assert.equal(s216?.statusCategory, "completed");
  assert.equal(s217?.statusCategory, "completed");
  assert.equal(s218?.readinessStatus, "ready");
  assert.equal(s219?.readinessStatus, "ready");
  assert.deepEqual(plan.selectedItemIds, ["S218", "S219"]);
});
