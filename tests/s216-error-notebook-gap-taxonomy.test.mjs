import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION,
  S216_GAP_TAXONOMY,
  assertS216FixtureMetadataOnly,
  buildS216ErrorNotebookEntry,
  buildS216GapTaxonomyReport,
  validateS216ErrorNotebookEntry,
} from "../lib/review-os/s216-error-notebook-gap-taxonomy.ts";
import { RUBRIC_EVIDENCE_CONTRACT_VERSION } from "../lib/review-os/rubric-evidence-contract.ts";
import { REWRITE_REGRADE_HISTORY_CONTRACT_VERSION } from "../lib/review-os/rewrite-regrade-history-contract.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const fixturePath = "tests/fixtures/s216-error-notebook-gap-taxonomy/metadata-only-s216-inputs.json";

async function loadFixture() {
  const parsed = JSON.parse(await readFile(fixturePath, "utf8"));
  assertS216FixtureMetadataOnly(parsed);
  return parsed;
}

function scenarioBySubject(fixture, subject) {
  const scenario = fixture.scenarios.find((entry) => entry.subject === subject);
  assert.ok(scenario, `Missing ${subject} S216 fixture scenario`);
  return scenario;
}

function clone(value) {
  return structuredClone(value);
}

function allTheoryDimensionEvidence() {
  return {
    definition_quality: "passed",
    theory_basis: "passed",
    comparison_frame: "passed",
    application_evaluation: "passed",
    conclusion: "passed",
    compression_relevance: "passed",
  };
}

function allPracticeDimensionEvidence() {
  return {
    practice_assumptions: "passed",
    practice_data_selection: "passed",
    practice_formula_metadata: "passed",
    practice_calculation_trace: "passed",
    practice_unit_rounding_time_adjustment: "passed",
    practice_cross_check: "passed",
    practice_conclusion_writing: "passed",
  };
}

function allPracticeMetadataChecks() {
  return {
    assumptions: "passed",
    dataSelection: "passed",
    formulaMetadata: "passed",
    calculationTrace: "passed",
    unitCheck: "passed",
    roundingCheck: "passed",
    timeAdjustment: "passed",
    crossCheck: "passed",
    conclusionWriting: "passed",
    independentRecalculation: "passed",
  };
}

function subjectReviewFor(scenario) {
  if (scenario.subject === "law") {
    return {
      kind: "s211_law_answer_review_metadata",
      engineVersion: "s211.law_answer_review_engine.v1",
      lawSourceGateStatus: "ready",
      referencePackageGateStatus: "ready",
      evaluatedDimensionIds: [
        "law_issue_spotting",
        "law_requirement_decomposition",
        "law_rule_mapping",
        "law_subsumption_application",
        "law_conclusion_quality",
      ],
      learnerRouteOnly: true,
      instructorRouteSeparated: true,
      academyTenantDataAccessed: false,
      metadataOnly: true,
      containsRawContent: false,
    };
  }

  if (scenario.subject === "theory") {
    return {
      kind: "s212_theory_answer_review_metadata",
      engineVersion: "s212.theory_answer_review.v1",
      conceptSourceVerification: "passed",
      referencePackageVerification: "passed",
      learnerAnswerEvidence: "passed",
      theoryQualityDimensionIds: Object.keys(allTheoryDimensionEvidence()),
      dimensionEvidence: allTheoryDimensionEvidence(),
      learnerInstructorSeparation: "learner_only_no_instructor_route",
      scoreLikeSummarySecondary: true,
      safeForS216ErrorNotebook: true,
      safeForS217ConceptGraph: true,
      metadataOnly: true,
      containsRawContent: false,
    };
  }

  return {
    kind: "s213_practice_answer_review_metadata",
    engineVersion: "s213.practice_answer_review.v1",
    referencePackageVerification: "passed",
    calculationUnitSupport: "passed",
    calculationReviewMetadata: "passed",
    learnerAnswerEvidence: "passed",
    practiceDimensionIds: Object.keys(allPracticeDimensionEvidence()),
    dimensionEvidence: allPracticeDimensionEvidence(),
    metadataChecks: allPracticeMetadataChecks(),
    learnerInstructorSeparation: "learner_only_no_instructor_route",
    calculatorModel: "casio_fx_9860giii",
    resetSafeHandKeyedRoutineOnly: true,
    storedProgramDependency: false,
    scoreLikeSummarySecondary: true,
    safeForS216ErrorNotebook: true,
    safeForS217ConceptGraph: true,
    metadataOnly: true,
    containsRawContent: false,
  };
}

function releasedReferenceStatus(scenario) {
  return {
    referencePackageId: scenario.referencePackageId,
    releaseGateVersion: "s215.reference_answer_critic_consensus_release_gate.v1",
    releaseStatus: "released",
    learningReferenceStatus: "released_learning_reference",
    blockerCodes: [],
    requiredCaveatKey: "learning_reference_not_official_answer",
    officialClaimAllowed: false,
    officialGradingClaimAllowed: false,
    officialModelAnswerClaimAllowed: false,
    confirmedScoreClaimAllowed: false,
    passProbabilityAllowed: false,
    passGuaranteeAllowed: false,
    containsRawContent: false,
  };
}

function sourceRefs(scenario) {
  return scenario.sourceRefIds.map((id, index) => ({
    id,
    kind: index === 0 ? "rubric_blueprint" : "reference_answer_package",
    sourceId: `${id}_metadata_anchor`,
    verificationStatus: "verified",
    rightsStatus: "metadata_only",
    containsRawContent: false,
  }));
}

function reviewFor(scenario, overrides = {}) {
  const actionType = scenario.nextActionType;
  const hookKind = scenario.hookKind;
  const refs = sourceRefs(scenario);
  const evidenceRef = {
    id: scenario.evidenceRefIds[0],
    kind: scenario.subject === "practice" ? "learner_calculation_step" : "learner_confirmed_ocr_segment",
    dataClass: "user_owned_service_data",
    ownerBinding: "authenticated_request_user",
    answerSubmissionId: scenario.answerSubmissionId,
    segmentId: `${scenario.scenarioId}_segment`,
    calculationStepId: scenario.subject === "practice" ? `${scenario.scenarioId}_step` : undefined,
    ocrState: "confirmed_by_learner",
    verifiedByLearner: true,
    confidence: "high",
    containsRawContent: false,
  };
  const deduction = {
    id: scenario.deductionCandidateId,
    dimensionId: scenario.dimensionId,
    rootCauseId: scenario.rootCauseId,
    gapType: scenario.primaryGapType,
    severity: "major",
    evidenceRefIds: scenario.evidenceRefIds,
    sourceRefIds: scenario.sourceRefIds,
    confidence: {
      level: "high",
      reasons: ["s216_metadata_fixture"],
      uncertaintyReasons: [],
    },
    learnerFacingSummary: `${scenario.primaryGapType}_detected`,
    immediateFix: scenario.immediateFixKey,
    duplicateRootCauseGroupId: scenario.rootCauseId,
    status: "candidate",
    officialScoreDeduction: false,
  };

  const contract = {
    version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: scenario.subject,
    subjectLabel: scenario.subjectLabel,
    reviewStatus: "ready",
    withhold: {
      withheld: false,
      reasons: [],
    },
    sourceStatus: {
      learnerAnswer: "learner_confirmed",
      problemMaterial: "verified",
      referencePackage: "verified",
      rubric: "verified",
      officialRules: "verified",
      calculation: scenario.subject === "practice" ? "verified" : "not_applicable",
    },
    learnerAnswerEvidenceRefs: [evidenceRef],
    sourceVerificationRefs: refs,
    rubricDimensions: [
      {
        id: scenario.dimensionId,
        subjectScope: [scenario.subject],
        label: scenario.dimensionId,
        maxPoints: 20,
        pointCeilingSourceRefId: scenario.sourceRefIds[0],
        sourceStatus: "verified",
        evidenceRefIds: scenario.evidenceRefIds,
        deductionCandidateIds: [scenario.deductionCandidateId],
        estimatedPointsRange: [4, 10],
        confidence: {
          level: "high",
          reasons: ["s216_dimension_metadata"],
          uncertaintyReasons: [],
        },
        status: "evaluated",
      },
    ],
    deductionCandidates: [deduction],
    confidence: {
      level: "high",
      reasons: ["s216_review_metadata"],
      uncertaintyReasons: [],
    },
    primaryGap: {
      id: scenario.primaryGapId,
      gapType: scenario.primaryGapType,
      dimensionId: scenario.dimensionId,
      deductionCandidateIds: [scenario.deductionCandidateId],
      evidenceRefIds: scenario.evidenceRefIds,
      conceptNodeIds: scenario.conceptNodeIds,
      severity: "major",
      confidence: {
        level: "high",
        reasons: ["s216_primary_gap_metadata"],
        uncertaintyReasons: [],
      },
      learnerFacingSummary: `${scenario.primaryGapType}_one_biggest_gap`,
    },
    nextAction: {
      id: `${scenario.scenarioId}_next_action`,
      actionType,
      targetGapId: scenario.primaryGapId,
      targetEvidenceRefIds: scenario.evidenceRefIds,
      defaultAction: true,
      learnerCanOverride: true,
      learnerFacingInstruction: `${actionType}_one_gap_recovery`,
    },
    rewriteOrRecalculationHook: {
      kind: hookKind,
      targetGapId: scenario.primaryGapId,
      sourceEvidenceRefIds: scenario.evidenceRefIds,
      retryReviewAllowed: true,
      calculator: hookKind === "recalculation"
        ? {
            model: "casio_fx_9860giii",
            resetSafeHandKeyedRoutineOnly: true,
            storedProgramDependency: false,
          }
        : null,
    },
    practiceScoreRange: {
      status: "estimated",
      range: [42, 58],
      scoreScale: {
        min: 0,
        max: 100,
        sourceRefId: scenario.sourceRefIds[0],
        verificationStatus: "verified",
        officialPassThresholdUsed: false,
      },
      confidence: {
        level: "high",
        reasons: ["s216_score_like_metadata_secondary"],
        uncertaintyReasons: [],
      },
      evidenceRefIds: scenario.evidenceRefIds,
      rubricDimensionIds: [scenario.dimensionId],
      secondaryToGapAndAction: true,
      nonOfficial: true,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
      notFinalEndpoint: true,
      caveat: "learning_support_estimate_not_official_or_confirmed_score",
    },
    resultPresentation: {
      order: ["one_biggest_gap", "one_next_action", "evidence_review", "rewrite_or_recalculation", "practice_score_range"],
      startsWithGapAndAction: true,
      scoreSummaryPosition: "secondary_after_evidence",
      terminalState: "rewrite_or_recalculation_or_scheduled_review",
    },
    dataBoundary: {
      learnerMaterialInContract: false,
      ocrMaterialInContract: false,
      officialMaterialInContract: false,
      globalReferenceWrite: false,
      modelTrainingUse: false,
      telemetrySafe: true,
    },
  };

  return { ...contract, ...overrides };
}

function privateStorageRef(recordId, recordKind) {
  return {
    recordId,
    recordKind,
    dataClass: "user_owned_service_data",
    ownerBinding: "authenticated_request_user",
    privateRecordMayContainLearnerMaterial: true,
    containsRawContent: false,
  };
}

function historyFor(scenario, review) {
  const sourceReviewLink = {
    reviewId: scenario.reviewId,
    sourceContractVersion: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    reviewStatus: review.reviewStatus,
    evidenceRefIds: scenario.evidenceRefIds,
    deductionCandidateIds: [scenario.deductionCandidateId],
    primaryGapId: scenario.primaryGapId,
    nextActionId: review.nextAction.id,
    taskHookKind: scenario.hookKind,
  };
  const latestAttempt = {
    attemptId: `${scenario.scenarioId}_attempt_2`,
    attemptKind: scenario.hookKind === "recalculation" ? "recalculation" : "rewrite",
    rootAnswerSubmissionId: scenario.answerSubmissionId,
    answerSubmissionId: scenario.answerSubmissionId,
    attemptVersion: 2,
    parentAttemptId: `${scenario.scenarioId}_attempt_1`,
    createdAt: "2090-01-01T00:10:00.000Z",
    privateStorageRef: privateStorageRef(
      `${scenario.scenarioId}_learner_action_ref`,
      scenario.hookKind === "recalculation" ? "learner_recalculation_attempt" : "learner_rewrite_attempt",
    ),
    sourceReviewLink,
    target: {
      primaryGapId: scenario.primaryGapId,
      nextActionId: review.nextAction.id,
      evidenceRefIds: scenario.evidenceRefIds,
      deductionCandidateIds: [scenario.deductionCandidateId],
      conceptNodeIds: scenario.conceptNodeIds,
    },
    learnerActionTerminal: scenario.hookKind === "recalculation" ? "recalculation" : "rewrite",
  };
  if (scenario.hookKind === "recalculation") {
    latestAttempt.calculation = {
      calculatorModel: "casio_fx_9860giii",
      resetSafeHandKeyedRoutineOnly: true,
      storedProgramDependency: false,
      routineRefId: `${scenario.scenarioId}_giii_routine_ref`,
      formulaStoredInContract: false,
      extractedValuesStoredInContract: false,
      handKeyedSequenceStoredInContract: false,
      expectedDisplayStoredInContract: false,
      unitCheckStatus: "passed",
      roundingCheckStatus: "passed",
    };
  }

  return {
    version: REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: scenario.subject,
    subjectLabel: scenario.subjectLabel,
    historyId: scenario.historyId,
    rootAnswerSubmissionId: scenario.answerSubmissionId,
    ownerBinding: "authenticated_request_user",
    attemptLineage: {
      rootAnswerSubmissionId: scenario.answerSubmissionId,
      latestAttemptId: latestAttempt.attemptId,
      latestAttemptVersion: 2,
      attempts: [
        {
          attemptId: `${scenario.scenarioId}_attempt_1`,
          attemptKind: "root_submission",
          rootAnswerSubmissionId: scenario.answerSubmissionId,
          answerSubmissionId: scenario.answerSubmissionId,
          attemptVersion: 1,
          parentAttemptId: null,
          createdAt: "2090-01-01T00:00:00.000Z",
          privateStorageRef: privateStorageRef(`${scenario.scenarioId}_wrong_answer_ref`, "review_os_wrong_answer_item"),
          sourceReviewLink: null,
          target: null,
          learnerActionTerminal: "initial_submission",
        },
        latestAttempt,
      ],
    },
    reReviewRequests: [
      {
        requestId: `${scenario.scenarioId}_rereview_request`,
        requestKind: scenario.hookKind === "recalculation" ? "recalculation_re_review" : "rewrite_re_review",
        status: "completed_metadata_linked",
        rootAnswerSubmissionId: scenario.answerSubmissionId,
        targetAttemptId: latestAttempt.attemptId,
        targetAttemptVersion: 2,
        baselineReviewId: scenario.reviewId,
        requestedAt: "2090-01-01T00:11:00.000Z",
        sourceReviewLink,
        usesSameRubricBlueprint: true,
        retryReviewAllowed: true,
        providerCallStarted: false,
        officialGrading: false,
        confirmedScore: false,
        passProbability: false,
        passGuarantee: false,
        resultMustStartWithGapAndAction: true,
      },
    ],
    comparisons: [
      {
        comparisonId: `${scenario.scenarioId}_comparison`,
        comparisonStatus: "compared",
        baselineAttemptId: `${scenario.scenarioId}_attempt_1`,
        comparedAttemptId: latestAttempt.attemptId,
        baselineReviewId: scenario.reviewId,
        comparedReviewId: scenario.reviewId,
        evidenceRefIds: scenario.evidenceRefIds,
        resolvedDeductionCandidateIds: [],
        recurringDeductionCandidateIds: [scenario.deductionCandidateId],
        newDeductionCandidateIds: [],
        primaryGapChanged: false,
        primaryGapBeforeId: scenario.primaryGapId,
        primaryGapAfterId: scenario.primaryGapId,
        nextActionBeforeId: review.nextAction.id,
        nextActionAfterId: review.nextAction.id,
        improvement: {
          status: "partially_improved_evidence_supported",
          confidence: "high",
          evidenceRefIds: scenario.evidenceRefIds,
          deductionCandidateIds: [scenario.deductionCandidateId],
          conceptNodeIds: scenario.conceptNodeIds,
          safeForS216ErrorNotebook: true,
          safeForS217ConceptGraph: true,
        },
        scoreLikeSummary: null,
      },
    ],
    derivedSignals: {
      improvementStatus: "partially_improved_evidence_supported",
      primaryGapId: scenario.primaryGapId,
      nextActionId: review.nextAction.id,
      evidenceRefIds: scenario.evidenceRefIds,
      deductionCandidateIds: [scenario.deductionCandidateId],
      conceptNodeIds: scenario.conceptNodeIds,
      safeForS216ErrorNotebook: true,
      safeForS217ConceptGraph: true,
      reviewDueHint: "schedule_review",
    },
    resultPresentation: {
      order: [
        "one_biggest_gap",
        "one_next_action",
        "rewrite_or_recalculation",
        "re_review_request",
        "answer_history_comparison",
        "safe_derived_signals",
      ],
      startsWithGapAndAction: true,
      scoreLikeSummaryPosition: "secondary_optional_after_comparison",
      terminalState: "rewrite_or_recalculation_or_scheduled_review",
    },
    authorityFlags: {
      nonOfficial: true,
      officialGrading: false,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
      scoreLikeSummarySecondary: true,
      terminalLearnerAction: "rewrite_or_recalculation_or_scheduled_review",
    },
    dataBoundary: {
      learnerMaterialInContract: false,
      ocrMaterialInContract: false,
      officialMaterialInContract: false,
      referenceMaterialInContract: false,
      privateStorageRefsOnly: true,
      globalReferenceWrite: false,
      modelTrainingUse: false,
      telemetrySafe: true,
    },
  };
}

function s216Input(scenario, overrides = {}) {
  const review = overrides.review ?? reviewFor(scenario);
  return {
    entryId: scenario.entryId,
    createdAt: "2090-01-01T00:12:00.000Z",
    consumer: "learner",
    actorRole: "learner",
    questionId: scenario.questionId,
    subject: scenario.subject,
    subjectLabel: scenario.subjectLabel,
    answerSubmissionId: scenario.answerSubmissionId,
    review,
    rewriteHistory: overrides.rewriteHistory ?? historyFor(scenario, review),
    subjectReview: overrides.subjectReview === undefined ? subjectReviewFor(scenario) : overrides.subjectReview,
    referenceStatus: overrides.referenceStatus === undefined ? releasedReferenceStatus(scenario) : overrides.referenceStatus,
  };
}

test("S216 taxonomy and fixture cover law, theory, and practice metadata-only gap categories", async () => {
  const fixture = await loadFixture();
  const report = buildS216GapTaxonomyReport();

  assert.equal(fixture.schemaVersion, S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION);
  assert.equal(fixture.storagePolicy.metadataOnly, true);
  assert.equal(report.taxonomyVersion, S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION);
  assert.equal(report.includesLawCategories, true);
  assert.equal(report.includesTheoryCategories, true);
  assert.equal(report.includesPracticeCategories, true);
  assert.ok(S216_GAP_TAXONOMY.some((entry) => entry.categoryId === "law_requirement_decomposition"));
  assert.ok(S216_GAP_TAXONOMY.some((entry) => entry.categoryId === "theory_application_evaluation"));
  assert.ok(S216_GAP_TAXONOMY.some((entry) => entry.categoryId === "practice_unit_rounding_time_adjustment"));
  assertNoRawUserDataInDerived(fixture);
  assert.doesNotMatch(JSON.stringify(fixture), /official grading|official model answer|pass probability|pass guarantee/i);
});

test("S216 builds ready automatic error notebook entries from S206 and subject review metadata", async () => {
  const fixture = await loadFixture();
  const expectedCategory = {
    law: "law_requirement_decomposition",
    theory: "theory_application_evaluation",
    practice: "practice_unit_rounding_time_adjustment",
  };

  for (const subject of ["law", "theory", "practice"]) {
    const scenario = scenarioBySubject(fixture, subject);
    const result = buildS216ErrorNotebookEntry(s216Input(scenario));
    const entry = result.entry;

    assert.equal(result.version, S216_ERROR_NOTEBOOK_GAP_TAXONOMY_VERSION);
    assert.equal(result.validation.valid, true);
    assert.equal(entry.status, "ready");
    assert.deepEqual(entry.withhold.reasons, []);
    assert.equal(entry.subject, subject);
    assert.equal(entry.gapTaxonomy.categoryId, expectedCategory[subject]);
    assert.equal(entry.whyWrong.status, "ready");
    assert.equal(entry.whyWrong.deductionCandidateId, scenario.deductionCandidateId);
    assert.equal(entry.correctPrinciple.status, "ready");
    assert.equal(entry.correctPrinciple.requiredCaveatKey, "learning_reference_not_official_answer");
    assert.equal(entry.immediateFix.status, "ready");
    assert.equal(entry.immediateFix.actionType, scenario.nextActionType);
    assert.equal(entry.recurrence.status, "recurring");
    assert.equal(entry.recovery.status, "ready");
    assert.equal(entry.recovery.reReviewRequestId, `${scenario.scenarioId}_rereview_request`);
    assert.equal(entry.nextReview.status, "scheduled");
    assert.equal(entry.nextReview.todayPlanContributionCount, 1);
    assert.equal(entry.authorityFlags.officialGrading, false);
    assert.equal(entry.authorityFlags.officialModelAnswer, false);
    assert.equal(entry.authorityFlags.passProbability, false);
    assert.equal(entry.dataBoundary.learnerMaterialInEntry, false);
    assert.equal(entry.dataBoundary.ocrMaterialInEntry, false);
    assert.equal(entry.dataBoundary.referenceProseInEntry, false);
    assert.equal(entry.dataBoundary.providerRuntimeCalled, false);
    assertNoRawUserDataInDerived(entry);

    if (subject === "practice") {
      assert.equal(entry.immediateFix.calculator.model, "casio_fx_9860giii");
      assert.equal(entry.immediateFix.calculator.resetSafeHandKeyedRoutineOnly, true);
      assert.equal(entry.immediateFix.calculator.storedProgramDependency, false);
    }
  }
});

test("S216 fails closed and preserves blocked reference-release metadata", async () => {
  const fixture = await loadFixture();
  const scenario = scenarioBySubject(fixture, "practice");
  const blockedReference = {
    ...releasedReferenceStatus(scenario),
    releaseStatus: "blocked",
    learningReferenceStatus: "blocked",
    blockerCodes: ["calculation_blocker"],
  };
  const result = buildS216ErrorNotebookEntry(s216Input(scenario, {
    referenceStatus: blockedReference,
  }));
  const entry = result.entry;

  assert.equal(entry.status, "withheld");
  assert.ok(entry.withhold.reasons.includes("reference_release_blocked"));
  assert.deepEqual(entry.withhold.referenceBlockerCodes, ["calculation_blocker"]);
  assert.equal(entry.correctPrinciple.status, "withheld");
  assert.equal(entry.correctPrinciple.referenceReleaseStatus, "blocked");
  assert.equal(entry.immediateFix.status, "withheld");
  assert.equal(entry.immediateFix.actionType, "withhold_until_verified");
  assert.equal(entry.nextReview.status, "not_ready");
  assert.equal(entry.nextReview.reviewQueueCandidate, false);
  assert.equal(validateS216ErrorNotebookEntry(entry).valid, true);
  assertNoRawUserDataInDerived(entry);
});

test("S216 fails closed when learner evidence is unconfirmed before note release", async () => {
  const fixture = await loadFixture();
  const scenario = scenarioBySubject(fixture, "law");
  const review = reviewFor(scenario, {
    reviewStatus: "withheld_unconfirmed_ocr",
    withhold: {
      withheld: true,
      reasons: ["ocr_unconfirmed"],
    },
    sourceStatus: {
      learnerAnswer: "ocr_confirmation_needed",
      problemMaterial: "verified",
      referencePackage: "verified",
      rubric: "verified",
      officialRules: "verified",
      calculation: "not_applicable",
    },
    deductionCandidates: [],
    rubricDimensions: [
      {
        id: scenario.dimensionId,
        subjectScope: [scenario.subject],
        label: scenario.dimensionId,
        maxPoints: 20,
        pointCeilingSourceRefId: scenario.sourceRefIds[0],
        sourceStatus: "verified",
        evidenceRefIds: [],
        deductionCandidateIds: [],
        estimatedPointsRange: null,
        confidence: {
          level: "low",
          reasons: ["s216_review_withheld"],
          uncertaintyReasons: ["ocr_unconfirmed"],
        },
        status: "not_evaluated_insufficient_evidence",
      },
    ],
    learnerAnswerEvidenceRefs: [
      {
        id: scenario.evidenceRefIds[0],
        kind: "learner_confirmed_ocr_segment",
        dataClass: "user_owned_service_data",
        ownerBinding: "authenticated_request_user",
        answerSubmissionId: scenario.answerSubmissionId,
        segmentId: `${scenario.scenarioId}_segment`,
        ocrState: "draft_needs_learner_confirmation",
        verifiedByLearner: false,
        confidence: "low",
        containsRawContent: false,
      },
    ],
    primaryGap: {
      id: "s216_gap_confirm_evidence",
      gapType: "ocr_confirmation_needed",
      dimensionId: null,
      deductionCandidateIds: [],
      evidenceRefIds: scenario.evidenceRefIds,
      conceptNodeIds: [],
      severity: "major",
      confidence: {
        level: "low",
        reasons: ["s216_ocr_confirmation_needed"],
        uncertaintyReasons: ["ocr_unconfirmed"],
      },
      learnerFacingSummary: "confirm_learner_evidence_before_error_notebook",
    },
    nextAction: {
      id: `${scenario.scenarioId}_confirm_ocr_action`,
      actionType: "confirm_ocr",
      targetGapId: "s216_gap_confirm_evidence",
      targetEvidenceRefIds: scenario.evidenceRefIds,
      defaultAction: true,
      learnerCanOverride: true,
      learnerFacingInstruction: "confirm_ocr_before_error_notebook",
    },
    rewriteOrRecalculationHook: {
      kind: "ocr_confirmation",
      targetGapId: "s216_gap_confirm_evidence",
      sourceEvidenceRefIds: scenario.evidenceRefIds,
      retryReviewAllowed: true,
      calculator: null,
    },
    practiceScoreRange: {
      status: "withheld_insufficient_evidence",
      range: null,
      scoreScale: {
        min: 0,
        max: 100,
        sourceRefId: scenario.sourceRefIds[0],
        verificationStatus: "verified",
        officialPassThresholdUsed: false,
      },
      confidence: {
        level: "low",
        reasons: ["s216_score_withheld"],
        uncertaintyReasons: ["ocr_unconfirmed"],
      },
      evidenceRefIds: [],
      rubricDimensionIds: [],
      secondaryToGapAndAction: true,
      nonOfficial: true,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
      notFinalEndpoint: true,
      caveat: "learning_support_estimate_not_official_or_confirmed_score",
    },
  });
  const input = s216Input(scenario, {
    review,
    rewriteHistory: historyFor(scenario, review),
  });
  const entry = buildS216ErrorNotebookEntry(input).entry;

  assert.equal(entry.status, "withheld");
  assert.ok(entry.withhold.reasons.includes("review_status_withheld"));
  assert.ok(entry.withhold.reasons.includes("learner_evidence_unconfirmed"));
  assert.equal(entry.gapTaxonomy.categoryId, "evidence_confirmation");
  assert.equal(entry.immediateFix.actionType, "confirm_ocr");
  assert.equal(entry.learnerEvidence.verifiedByLearner, false);
  assert.equal(entry.nextReview.todayPlanContributionCount, 0);
});

test("S216 fails closed when subject-review metadata is missing or unresolved", async () => {
  const fixture = await loadFixture();
  const scenario = scenarioBySubject(fixture, "theory");

  const missing = buildS216ErrorNotebookEntry(s216Input(scenario, { subjectReview: null })).entry;
  assert.equal(missing.status, "withheld");
  assert.ok(missing.withhold.reasons.includes("subject_review_metadata_missing"));

  const unresolvedSubjectReview = clone(subjectReviewFor(scenario));
  unresolvedSubjectReview.referencePackageVerification = "failed_closed";
  unresolvedSubjectReview.safeForS216ErrorNotebook = false;
  const unresolved = buildS216ErrorNotebookEntry(s216Input(scenario, {
    subjectReview: unresolvedSubjectReview,
  })).entry;
  assert.equal(unresolved.status, "withheld");
  assert.ok(unresolved.withhold.reasons.includes("subject_review_unresolved"));
});

test("S216 rejects learner/instructor boundary violations and raw-content fields", async () => {
  const fixture = await loadFixture();
  const scenario = scenarioBySubject(fixture, "law");

  assert.throws(
    () => buildS216ErrorNotebookEntry({
      ...s216Input(scenario),
      consumer: "instructor",
      actorRole: "instructor",
    }),
    /s216-learner-instructor-boundary/,
  );

  assert.throws(
    () => buildS216ErrorNotebookEntry({
      ...s216Input(scenario),
      learnerAnswerText: "must not enter S216",
    }),
    /raw-user-data-in-derived-metadata/,
  );
});

test("S216 docs, roadmap, source, and safe derived keys are wired", async () => {
  const docs = await readFile("docs/s216-automatic-error-notebook-gap-taxonomy.md", "utf8");
  const source = await readFile("lib/review-os/s216-error-notebook-gap-taxonomy.ts", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s216 = plan.analyses.find((item) => item.itemId === "S216");
  const s217 = plan.analyses.find((item) => item.itemId === "S217");
  const s218 = plan.analyses.find((item) => item.itemId === "S218");
  const s219 = plan.analyses.find((item) => item.itemId === "S219");
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");
  const s224 = plan.analyses.find((item) => item.itemId === "S224");
  const s225 = plan.analyses.find((item) => item.itemId === "S225");

  for (const token of [
    "S216",
    "automatic error notebook",
    "gap taxonomy",
    "why-wrong",
    "correct-principle",
    "immediate-fix",
    "recurrence",
    "recovery",
    "next-review",
    "metadata-only",
    "fail closed",
    "learner/instructor separation",
  ]) {
    assert.match(docs, new RegExp(token));
  }
  for (const key of [
    "errorNotebookEntryId",
    "gapCategoryId",
    "whyWrongCode",
    "correctPrincipleCode",
    "recoveryActionType",
    "nextReviewStatus",
    "referenceReleaseStatus",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S216 safe key ${key}`);
  }

  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|checkout/i);
  assert.equal(s216?.statusCategory, "completed");
  assert.equal(s217?.statusCategory, "completed");
  assert.equal(s218?.statusCategory, "completed");
  assert.equal(s219?.statusCategory, "completed");
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.equal(s224?.statusCategory, "completed");
  assert.equal(s225?.readinessStatus, "blocked");
  assert.deepEqual(s225?.missingDependencies, ["O4D"]);
  assert.deepEqual(plan.selectedItemIds, ["S235A", "S235B"]);
});
