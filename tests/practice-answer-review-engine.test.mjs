import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION,
  S213_PRACTICE_DIMENSION_IDS,
  buildS213PracticeAnswerReview,
} from "../lib/review-os/practice-answer-review-engine.ts";
import {
  PRACTICE_SCORE_RANGE_CAVEAT,
  validateRubricEvidenceReviewContract,
} from "../lib/review-os/rubric-evidence-contract.ts";
import { assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const fixturePath = "tests/fixtures/s213-practice-answer-review/ready-practice-review-input.json";
const questionId = "s213_verified_practice_question";
const referencePackageId = "s213_verified_practice_reference_package";
const calculationUnitId = "s213_verified_income_capitalization_unit";

async function readFixture() {
  return JSON.parse(await readFile(fixturePath, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function syntheticReferencePackageRegistry(overrides = {}) {
  const practiceCheckKinds = [
    "assumptions",
    "formula",
    "extracted_values",
    "independent_recalculation",
    "unit_check",
    "rounding_check",
    "hand_keyed_sequence",
    "expected_display",
    "answer_sheet_transfer",
    "unsupported_type",
  ];
  const packageValue = {
    id: referencePackageId,
    mode: "reference_package",
    questionId,
    subject: "practice",
    officialSource: {
      sourceStatus: "canonical_question_verified",
      questionId,
      sourceId: "s213_verified_practice_source",
      rightsStatus: "redistribution_allowed",
      displayMode: "metadata_and_link",
      extractionStatus: "metadata_only",
      problemTextStatus: "verified",
      canonicalVerificationStatus: "structure_verified",
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
    practiceValidation: {
      calculatorModel: "casio_fx_9860giii",
      resetSafeHandKeyedRoutineRequired: true,
      storedProgramDependencyAllowed: false,
      formulaStored: false,
      extractedValuesStored: false,
      handKeyedSequenceStored: false,
      expectedDisplayStored: false,
      checks: practiceCheckKinds.map((kind) => ({
        checkId: `s213-practice-${kind}`,
        kind,
        status: "passed",
        releaseBlocking: true,
        sourceAnchorIds: [`s213-${kind}-source-anchor`],
        evidenceAnchorIds: [`s213-${kind}-evidence-anchor`],
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
      s215ReleaseGateInput: true,
      s211LawReviewInput: false,
      s212TheoryReviewInput: false,
      s213PracticeReviewInput: true,
    },
    ...overrides,
  };

  return {
    schemaVersion: "s207.reference_answer_package.v1",
    registryType: "appraiser_second_round_reference_answer_package_registry",
    registryScope: "appraiser_second_round_only",
    generatedBy: "tests/practice-answer-review-engine.test.mjs",
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
      syntheticFixturesOnly: false,
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
    packages: [packageValue],
  };
}

function syntheticCalculationUnitRegistry(unitOverrides = {}) {
  const unit = {
    id: calculationUnitId,
    subject: "practice",
    calculationType: "income_capitalization",
    questionLinkage: {
      canonicalQuestionId: questionId,
      sourceId: "s213_verified_practice_source",
      subject: "practice",
      sourceRightsStatus: "redistribution_allowed",
      officialProblemBodyStored: false,
      officialAnswerBodyStored: false,
      learnerAnswerStored: false,
    },
    support: {
      status: "supported_metadata_only",
      unsupportedReasonCodes: [],
    },
    formulaMetadata: {
      formulaId: "s213_income_capitalization_formula_metadata",
      formulaKind: "valuation_formula",
      formulaExpressionStored: false,
      rawFormulaStored: false,
      unitCheckRequired: true,
      roundingCheckRequired: true,
      sourceAnchorIds: ["s213-formula-anchor"],
    },
    ocrPolicy: {
      confidenceGateRequired: true,
      minimumOverallConfidence: 0.98,
      minimumFieldConfidence: 0.95,
      lowConfidenceFailsClosed: true,
      runtimeOcrCalled: false,
      rawOcrTextStored: false,
      providerPayloadStored: false,
      fieldSchema: [
        {
          fieldId: "s213-noi-field-metadata",
          expectedUnit: "krw",
          normalizedUnit: "krw",
          required: true,
          rawValueStored: false,
        },
        {
          fieldId: "s213-cap-rate-field-metadata",
          expectedUnit: "percent",
          normalizedUnit: "decimal_rate",
          required: true,
          rawValueStored: false,
        },
      ],
    },
    unitCheck: {
      required: true,
      status: "metadata_ready",
      dimensions: [
        {
          dimensionId: "s213-currency-dimension",
          expectedUnit: "krw",
          normalizedUnit: "krw",
          rawValueStored: false,
        },
        {
          dimensionId: "s213-rate-dimension",
          expectedUnit: "percent",
          normalizedUnit: "decimal_rate",
          rawValueStored: false,
        },
      ],
      rawValuesStored: false,
    },
    roundingCheck: {
      required: true,
      status: "metadata_ready",
      ruleId: "s213-appraisal-practice-rounding-policy-metadata",
      rawExpectedOutputStored: false,
    },
    independentRecalculation: {
      required: true,
      status: "metadata_ready",
      reviewerCountRequired: 2,
      rawTraceStored: false,
    },
    giiiRoutine: {
      calculatorModel: "casio_fx_9860giii",
      resetSafeHandKeyedRoutineRequired: true,
      storedProgramDependencyAllowed: false,
      routineMetadataStatus: "metadata_ready",
      handKeyedSequenceMetadata: {
        status: "metadata_ready",
        stepCount: 5,
        sequenceStored: false,
      },
      expectedDisplayStored: false,
      answerSheetTransferTemplateStored: false,
    },
    releaseGate: {
      releaseAllowed: false,
      status: "metadata_only_not_released",
      referenceAnswerReleaseAllowed: false,
      officialGradingClaimAllowed: false,
      requiredRuntimeEvidence: "human_reviewed_runtime_ocr_and_recalculation_evidence",
      reasonCodes: [
        "source_level_validator_only",
        "runtime_ocr_not_run",
      ],
    },
    conceptNodeIds: ["s213_practice_income_approach_metadata"],
    sourceAnchorIds: [
      "s213-question-anchor",
      "s213-formula-anchor",
      "s213-unit-anchor",
    ],
    ...unitOverrides,
  };

  return {
    schemaVersion: "1.0.0",
    registryType: "appraiser_second_round_practice_calculation_unit_registry",
    registryScope: "appraiser_second_round_practice_only",
    generatedBy: "tests/practice-answer-review-engine.test.mjs",
    generatedAt: "2090-01-01T00:00:00.000Z",
    coordination: {
      targetIssueNumber: 509,
      roadmapItemId: "S210",
      roadmapItemTitle: "Practice Calculation Unit OCR and Supported-Type Validator",
      prBodyClosingReference: "Closes #509",
      generatedBranchMetadataStored: false,
    },
    storagePolicy: {
      metadataOnly: true,
      rawLearnerAnswerStored: false,
      rawOcrTextStored: false,
      rawProblemTextStored: false,
      rawAnswerTextStored: false,
      rawOfficialQuestionBodyStored: false,
      rawOfficialAnswerBodyStored: false,
      providerPayloadStored: false,
      privateContentStored: false,
      credentialsStored: false,
      rawFormulaExpressionStored: false,
      rawExtractedValuesStored: false,
      rawCalculationTraceStored: false,
    },
    boundaryPolicy: {
      sourceLevelValidatorOnly: true,
      runtimeOcrCalled: false,
      providerApiCalled: false,
      learnerRuntimeChanged: false,
      referenceAnswerGenerated: false,
      officialGradingClaimAllowed: false,
      officialModelAnswerClaimAllowed: false,
      passProbabilityClaimAllowed: false,
      passGuaranteeClaimAllowed: false,
    },
    units: [unit],
  };
}

function verifiedConfig({ referencePackageOverrides = {}, unitOverrides = {} } = {}) {
  return {
    referencePackageRegistry: syntheticReferencePackageRegistry(referencePackageOverrides),
    calculationUnitRegistry: syntheticCalculationUnitRegistry(unitOverrides),
  };
}

test("S213 builds a metadata-only S205-compatible practice review from S207 and S210 metadata", async () => {
  const input = await readFixture();
  const result = buildS213PracticeAnswerReview(input, verifiedConfig());
  const contract = result.contract;
  const validation = validateRubricEvidenceReviewContract(contract);

  assert.equal(result.version, S213_PRACTICE_ANSWER_REVIEW_ENGINE_VERSION);
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(contract.subject, "practice");
  assert.equal(contract.reviewStatus, "ready");
  assert.equal(contract.sourceStatus.learnerAnswer, "learner_confirmed");
  assert.equal(contract.sourceStatus.referencePackage, "verified");
  assert.equal(contract.sourceStatus.calculation, "verified");
  assert.deepEqual(contract.rubricDimensions.map((dimension) => dimension.id), S213_PRACTICE_DIMENSION_IDS);
  assert.equal(contract.rubricDimensions.some((dimension) => dimension.id === "practice_unit_rounding_time_adjustment"), true);
  assert.equal(contract.deductionCandidates.length, 4);
  assert.equal(contract.deductionCandidates.every((candidate) => candidate.officialScoreDeduction === false), true);
  assert.equal(contract.deductionCandidates.every((candidate) => candidate.evidenceRefIds.length > 0), true);
  assert.equal(contract.primaryGap.dimensionId, "practice_unit_rounding_time_adjustment");
  assert.equal(contract.nextAction.actionType, "recalculate");
  assert.equal(contract.rewriteOrRecalculationHook.kind, "recalculation");
  assert.equal(contract.rewriteOrRecalculationHook.calculator.model, "casio_fx_9860giii");
  assert.equal(contract.rewriteOrRecalculationHook.calculator.resetSafeHandKeyedRoutineOnly, true);
  assert.equal(contract.rewriteOrRecalculationHook.calculator.storedProgramDependency, false);
  assert.equal(contract.practiceScoreRange.status, "estimated");
  assert.equal(contract.practiceScoreRange.nonOfficial, true);
  assert.equal(contract.practiceScoreRange.confirmedScore, false);
  assert.equal(contract.practiceScoreRange.passProbability, false);
  assert.equal(contract.practiceScoreRange.passGuarantee, false);
  assert.equal(contract.practiceScoreRange.caveat, PRACTICE_SCORE_RANGE_CAVEAT);
  assert.equal(result.qualityGate.calculationUnitSupport, "passed");
  assert.equal(result.qualityGate.calculationReviewMetadata, "passed");
  assert.equal(result.qualityGate.metadataChecks.timeAdjustment, "passed");
  assert.equal(result.practiceEngine.learnerInstructorBoundary.learnerRouteOnly, true);
  assert.equal(result.practiceEngine.learnerInstructorBoundary.instructorRouteSeparated, true);
  assertNoRawUserDataInDerived(result.derivedMetadata);
});

test("S213 fails closed against committed empty reference packages and synthetic-only calculation metadata", async () => {
  const input = await readFixture();
  const result = buildS213PracticeAnswerReview(input);
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_unverified_source");
  assert.equal(contract.withhold.withheld, true);
  assert.ok(contract.withhold.reasons.includes("reference_package_unverified"));
  assert.ok(contract.withhold.reasons.includes("calculation_unverified"));
  assert.equal(contract.deductionCandidates.length, 0);
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(contract.practiceScoreRange.range, null);
  assert.equal(contract.nextAction.actionType, "withhold_until_verified");
  assert.equal(result.qualityGate.referencePackageVerification, "failed_closed");
  assert.equal(result.qualityGate.calculationUnitSupport, "failed_closed");
});

test("S213 withholds unsupported, ambiguous, or synthetic-only practice calculation cases", async () => {
  const ambiguous = clone(await readFixture());
  ambiguous.calculationReview.roundingCheck.status = "ambiguous";
  const ambiguousResult = buildS213PracticeAnswerReview(ambiguous, verifiedConfig());

  assert.equal(ambiguousResult.contract.reviewStatus, "withheld_unsupported_calculation");
  assert.equal(ambiguousResult.contract.deductionCandidates.length, 0);
  assert.equal(ambiguousResult.contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(ambiguousResult.qualityGate.metadataChecks.roundingCheck, "failed_closed");

  const syntheticReference = buildS213PracticeAnswerReview(await readFixture(), verifiedConfig({
    referencePackageOverrides: {
      mode: "synthetic_fixture",
      officialSource: {
        ...syntheticReferencePackageRegistry().packages[0].officialSource,
        sourceStatus: "synthetic_fixture",
        problemTextStatus: "synthetic_fixture",
        canonicalVerificationStatus: "synthetic_fixture",
      },
      practiceValidation: {
        ...syntheticReferencePackageRegistry().packages[0].practiceValidation,
        checks: syntheticReferencePackageRegistry().packages[0].practiceValidation.checks.map((check) => ({
          ...check,
          status: "synthetic_fixture",
        })),
      },
    },
  }));

  assert.equal(syntheticReference.contract.reviewStatus, "withheld_unverified_source");
  assert.equal(syntheticReference.contract.deductionCandidates.length, 0);
  assert.equal(syntheticReference.contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(syntheticReference.qualityGate.referencePackageVerification, "failed_closed");

  const unsupportedUnit = buildS213PracticeAnswerReview(await readFixture(), verifiedConfig({
    unitOverrides: {
      support: {
        status: "supported_metadata_only",
        unsupportedReasonCodes: ["ambiguous-calculation-shape"],
      },
    },
  }));

  assert.equal(unsupportedUnit.contract.reviewStatus, "withheld_unsupported_calculation");
  assert.equal(unsupportedUnit.contract.deductionCandidates.length, 0);
  assert.equal(unsupportedUnit.contract.practiceScoreRange.range, null);
  assert.equal(unsupportedUnit.qualityGate.calculationUnitSupport, "failed_closed");
});

test("S213 requires learner-answer evidence before deduction candidates or score-like ranges", async () => {
  const input = clone(await readFixture());
  input.learnerEvidenceRefs = [];

  const result = buildS213PracticeAnswerReview(input, verifiedConfig());
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_insufficient_evidence");
  assert.ok(contract.withhold.reasons.includes("learner_answer_missing"));
  assert.equal(contract.sourceStatus.learnerAnswer, "missing");
  assert.equal(contract.deductionCandidates.length, 0);
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
  assert.equal(contract.practiceScoreRange.range, null);
  assert.equal(result.qualityGate.learnerAnswerEvidence, "failed_closed");

  assert.throws(
    () => buildS213PracticeAnswerReview({ ...input, answerSubmissionId: "" }, verifiedConfig()),
    /answerSubmissionId/,
  );
});

test("S213 withholds practice review until OCR evidence is confirmed by the learner", async () => {
  const input = clone(await readFixture());
  input.learnerEvidenceRefs[0].ocrState = "draft_needs_learner_confirmation";
  input.learnerEvidenceRefs[0].verifiedByLearner = false;

  const result = buildS213PracticeAnswerReview(input, verifiedConfig());
  const contract = result.contract;

  assert.equal(contract.reviewStatus, "withheld_unconfirmed_ocr");
  assert.equal(contract.sourceStatus.learnerAnswer, "ocr_confirmation_needed");
  assert.equal(contract.nextAction.actionType, "confirm_ocr");
  assert.equal(contract.deductionCandidates.length, 0);
  assert.equal(contract.practiceScoreRange.status, "withheld_insufficient_evidence");
});

test("S213 rejects raw-content fields, prohibited authority claims, and instructor invocation", async () => {
  const input = await readFixture();
  assert.throws(
    () => buildS213PracticeAnswerReview({
      ...input,
      learnerAnswerText: "raw text must not enter S213 metadata",
    }, verifiedConfig()),
    /raw-user-data-in-derived-metadata/,
  );

  const claimInput = clone(input);
  claimInput.dimensionSignals[0].note = "official grading shortcut";
  assert.throws(
    () => buildS213PracticeAnswerReview(claimInput, verifiedConfig()),
    /prohibited official-grading/,
  );

  assert.throws(
    () => buildS213PracticeAnswerReview({
      ...input,
      consumer: "instructor",
      actorRole: "instructor",
    }, verifiedConfig()),
    /s213-learner-instructor-boundary/,
  );
});

test("S213 fixture, docs, roadmap, and Agent Factory ready target remain metadata-safe", async () => {
  const fixture = await readFile(fixturePath, "utf8");
  const docs = await readFile("docs/s213-practice-answer-review-engine.md", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s213 = plan.analyses.find((item) => item.itemId === "S213");
  const s214 = plan.analyses.find((item) => item.itemId === "S214");
  const s215 = plan.analyses.find((item) => item.itemId === "S215");
  const s216 = plan.analyses.find((item) => item.itemId === "S216");
  const s217 = plan.analyses.find((item) => item.itemId === "S217");
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");
  const s224 = plan.analyses.find((item) => item.itemId === "S224");
  const s225 = plan.analyses.find((item) => item.itemId === "S225");

  for (const field of [
    "rawLearnerAnswer",
    "learnerAnswerText",
    "answerText",
    "questionText",
    "problemBody",
    "referenceAnswerText",
    "modelAnswer",
    "rawOcrText",
    "ocrText",
    "sourceExcerpt",
    "providerPayload",
    "instructorComment",
  ]) {
    assert.equal(fixture.includes(`"${field}"`), false, `fixture must not include ${field}`);
  }
  assert.doesNotMatch(fixture, /official grading|official model answer|pass probability|pass guarantee/i);

  for (const phrase of [
    "S213",
    "assumptions",
    "data selection",
    "formula metadata",
    "calculation trace",
    "unit, rounding, and time-adjustment metadata",
    "cross-check metadata",
    "conclusion writing",
    "fail-closed",
    "metadata-only",
    "learner/instructor separation",
  ]) {
    assert.ok(docs.includes(phrase), `missing S213 doc phrase: ${phrase}`);
  }

  assert.equal(s213?.statusCategory, "completed");
  assert.equal(s214?.statusCategory, "completed");
  assert.equal(s215?.statusCategory, "completed");
  assert.equal(s216?.statusCategory, "completed");
  assert.equal(s217?.statusCategory, "completed");
  assert.equal(s218?.statusCategory, "completed");
  assert.equal(s219?.statusCategory, "completed");
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.equal(s224?.statusCategory, "completed");
  assert.equal(s225?.readinessStatus, "blocked");
  assert.deepEqual(s225?.missingDependencies, ["O4D"]);
  assert.deepEqual(plan.selectedItemIds, ["O3A", "S236B"]);
  assert.equal(s215?.missingDependencies.includes("S213"), false);
  assert.equal(s215?.missingDependencies.includes("S214"), false);
});
