import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PRACTICE_SCORE_RANGE_CAVEAT,
  RUBRIC_EVIDENCE_CONTRACT_VERSION,
  buildRubricEvidenceReviewDerivedMetadata,
  validateRubricEvidenceReviewContract,
} from "../lib/review-os/rubric-evidence-contract.ts";
import { SAFE_DERIVED_SIGNAL_KEYS, assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";

function confidence(level = "medium", uncertaintyReasons = []) {
  return {
    level,
    reasons: ["synthetic_metadata_fixture"],
    uncertaintyReasons,
  };
}

function baseContract(overrides = {}) {
  const contract = {
    version: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: "practice",
    subjectLabel: "감정평가실무",
    reviewStatus: "ready",
    withhold: { withheld: false, reasons: [] },
    sourceStatus: {
      learnerAnswer: "learner_confirmed",
      problemMaterial: "verified",
      referencePackage: "verified",
      rubric: "verified",
      officialRules: "verified",
      calculation: "verified",
    },
    learnerAnswerEvidenceRefs: [
      {
        id: "ev-attempt-segment-1",
        kind: "learner_confirmed_ocr_segment",
        dataClass: "user_owned_service_data",
        ownerBinding: "authenticated_request_user",
        answerSubmissionId: "submission-synthetic-1",
        segmentId: "segment-synthetic-1",
        ocrState: "confirmed_by_learner",
        verifiedByLearner: true,
        confidence: "medium",
        containsRawContent: false,
      },
    ],
    sourceVerificationRefs: [
      {
        id: "src-rules",
        kind: "official_rule_registry",
        sourceId: "s201-exam-rules-points",
        verificationStatus: "verified",
        rightsStatus: "metadata_only",
        containsRawContent: false,
      },
      {
        id: "src-rubric",
        kind: "rubric_blueprint",
        sourceId: "s205-common-rubric-v1",
        verificationStatus: "verified",
        containsRawContent: false,
      },
      {
        id: "src-reference",
        kind: "reference_answer_package",
        sourceId: "s207-placeholder-verified-package",
        verificationStatus: "verified",
        containsRawContent: false,
      },
      {
        id: "src-calculation",
        kind: "calculation_validator",
        sourceId: "s210-placeholder-unit-check",
        verificationStatus: "verified",
        containsRawContent: false,
      },
    ],
    rubricDimensions: [
      {
        id: "dimension-issue",
        subjectScope: ["all"],
        label: "issue coverage",
        maxPoints: 30,
        pointCeilingSourceRefId: "src-rules",
        sourceStatus: "verified",
        evidenceRefIds: ["ev-attempt-segment-1"],
        deductionCandidateIds: ["deduction-issue-gap"],
        estimatedPointsRange: [14, 18],
        confidence: confidence(),
        status: "evaluated",
      },
      {
        id: "dimension-application",
        subjectScope: ["all"],
        label: "application quality",
        maxPoints: 70,
        pointCeilingSourceRefId: "src-rules",
        sourceStatus: "verified",
        evidenceRefIds: ["ev-attempt-segment-1"],
        deductionCandidateIds: [],
        estimatedPointsRange: [34, 38],
        confidence: confidence("low", ["synthetic_uncertainty"]),
        status: "evaluated",
      },
    ],
    deductionCandidates: [
      {
        id: "deduction-issue-gap",
        dimensionId: "dimension-issue",
        rootCauseId: "root-issue-map-1",
        gapType: "issue_gap",
        severity: "major",
        evidenceRefIds: ["ev-attempt-segment-1"],
        sourceRefIds: ["src-rubric", "src-reference"],
        confidence: confidence(),
        learnerFacingSummary: "issue_map_gap_detected",
        immediateFix: "rewrite_one_issue_sentence",
        duplicateRootCauseGroupId: "root-issue-map-1",
        status: "candidate",
        officialScoreDeduction: false,
      },
    ],
    confidence: confidence(),
    primaryGap: {
      id: "gap-primary-1",
      gapType: "issue_gap",
      dimensionId: "dimension-issue",
      deductionCandidateIds: ["deduction-issue-gap"],
      evidenceRefIds: ["ev-attempt-segment-1"],
      conceptNodeIds: ["concept-synthetic-issue-map"],
      severity: "major",
      confidence: confidence(),
      learnerFacingSummary: "fix_one_issue_before_any_range_summary",
    },
    nextAction: {
      id: "action-rewrite-1",
      actionType: "rewrite",
      targetGapId: "gap-primary-1",
      targetEvidenceRefIds: ["ev-attempt-segment-1"],
      defaultAction: true,
      learnerCanOverride: true,
      learnerFacingInstruction: "rewrite_one_targeted_paragraph",
    },
    rewriteOrRecalculationHook: {
      kind: "rewrite",
      targetGapId: "gap-primary-1",
      sourceEvidenceRefIds: ["ev-attempt-segment-1"],
      retryReviewAllowed: true,
      calculator: null,
    },
    practiceScoreRange: {
      status: "estimated",
      range: [48, 56],
      scoreScale: {
        min: 0,
        max: 100,
        sourceRefId: "src-rules",
        verificationStatus: "verified",
        officialPassThresholdUsed: false,
      },
      confidence: confidence(),
      evidenceRefIds: ["ev-attempt-segment-1"],
      rubricDimensionIds: ["dimension-issue", "dimension-application"],
      secondaryToGapAndAction: true,
      nonOfficial: true,
      confirmedScore: false,
      passProbability: false,
      passGuarantee: false,
      notFinalEndpoint: true,
      caveat: PRACTICE_SCORE_RANGE_CAVEAT,
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

test("S205 common rubric evidence contract accepts metadata-only estimated review", () => {
  const contract = baseContract();
  const result = validateRubricEvidenceReviewContract(contract);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);

  const metadata = buildRubricEvidenceReviewDerivedMetadata(contract);
  assert.equal(metadata.contractVersion, RUBRIC_EVIDENCE_CONTRACT_VERSION);
  assert.equal(metadata.primaryGapId, "gap-primary-1");
  assert.equal(metadata.nextActionType, "rewrite");
  assert.equal(metadata.practiceRangeStatus, "estimated");
  assert.equal(metadata.rangeLower, 48);
  assert.equal(metadata.rangeUpper, 56);
  assert.equal(metadata.nonOfficial, true);
  assert.equal(metadata.confirmedScore, false);
  assert.equal(metadata.passProbability, false);
  assert.equal(metadata.resultStartsWithGapAndAction, true);
  assertNoRawUserDataInDerived(metadata);
});

test("S205 withholds score range when OCR confirmation is missing but still returns gap and action", () => {
  const base = baseContract();
  const contract = baseContract({
    reviewStatus: "withheld_unconfirmed_ocr",
    withhold: { withheld: true, reasons: ["ocr_unconfirmed"] },
    sourceStatus: { ...base.sourceStatus, learnerAnswer: "ocr_confirmation_needed" },
    learnerAnswerEvidenceRefs: base.learnerAnswerEvidenceRefs.map((ref) => ({
      ...ref,
      ocrState: "draft_needs_learner_confirmation",
      verifiedByLearner: false,
      confidence: "low",
    })),
    rubricDimensions: base.rubricDimensions.map((dimension) => ({
      ...dimension,
      deductionCandidateIds: [],
      estimatedPointsRange: null,
      status: "not_evaluated_insufficient_evidence",
    })),
    deductionCandidates: [],
    primaryGap: {
      ...base.primaryGap,
      gapType: "evidence_insufficient",
      dimensionId: null,
      deductionCandidateIds: [],
      learnerFacingSummary: "confirm_ocr_before_review",
    },
    nextAction: {
      ...base.nextAction,
      actionType: "confirm_ocr",
      learnerFacingInstruction: "confirm_ocr_segments_first",
    },
    rewriteOrRecalculationHook: {
      kind: "ocr_confirmation",
      targetGapId: "gap-primary-1",
      sourceEvidenceRefIds: ["ev-attempt-segment-1"],
      retryReviewAllowed: true,
      calculator: null,
    },
    practiceScoreRange: {
      ...base.practiceScoreRange,
      status: "withheld_insufficient_evidence",
      range: null,
      evidenceRefIds: [],
      rubricDimensionIds: [],
    },
  });

  const result = validateRubricEvidenceReviewContract(contract);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(contract.primaryGap.gapType, "evidence_insufficient");
  assert.equal(contract.nextAction.actionType, "confirm_ocr");
});

test("S205 rejects score-first presentation and score-terminal output", () => {
  const base = baseContract();
  const result = validateRubricEvidenceReviewContract(baseContract({
    resultPresentation: {
      ...base.resultPresentation,
      order: ["practice_score_range", "one_biggest_gap", "one_next_action", "evidence_review", "rewrite_or_recalculation"],
      terminalState: "score_summary",
    },
  }));

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /one biggest gap and one next action before score range/);
  assert.match(result.errors.join("\n"), /end in rewrite, recalculation, or scheduled review/);
});

test("S205 rejects confirmed-score shaped ranges and authority flags", () => {
  const base = baseContract();
  const result = validateRubricEvidenceReviewContract(baseContract({
    practiceScoreRange: {
      ...base.practiceScoreRange,
      range: [52, 52],
      confirmedScore: true,
      passProbability: true,
      notFinalEndpoint: false,
    },
  }));

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /confirmedScore must be false/);
  assert.match(result.errors.join("\n"), /passProbability must be false/);
  assert.match(result.errors.join("\n"), /notFinalEndpoint must be true/);
  assert.match(result.errors.join("\n"), /not a confirmed single-point score/);
});

test("S205 deduction candidates must be linked to learner evidence and known dimensions", () => {
  const base = baseContract();
  const result = validateRubricEvidenceReviewContract(baseContract({
    deductionCandidates: [
      {
        ...base.deductionCandidates[0],
        dimensionId: "dimension-missing",
        evidenceRefIds: [],
      },
    ],
  }));

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /dimensionId references unknown dimension/);
  assert.match(result.errors.join("\n"), /must reference at least one evidence\/source id/);
});

test("S205 rejects raw learner field names even when a caller passes an expanded object", () => {
  const result = validateRubricEvidenceReviewContract({
    ...baseContract(),
    rawAnswerText: "synthetic-forbidden-marker",
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /raw-user-data-in-derived-metadata/);
});

test("S205 documentation and safe metadata vocabulary are present", async () => {
  const doc = await readFile("docs/s205-common-rubric-evidence-contract.md", "utf8");
  for (const phrase of [
    "S205",
    "one biggest gap",
    "one next action",
    "withheld_insufficient_evidence",
    "S211/S212/S213",
    "casio_fx_9860giii",
  ]) {
    assert.ok(doc.includes(phrase), `Missing S205 doc phrase: ${phrase}`);
  }

  for (const key of ["primaryGapId", "nextActionId", "practiceRangeStatus", "resultStartsWithGapAndAction"]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing safe derived key ${key}`);
  }
  assert.doesNotMatch(doc, /Raw learner answer text\s*:|OCR full text\s*:|기출문제 원문|답안 전문/);
});
