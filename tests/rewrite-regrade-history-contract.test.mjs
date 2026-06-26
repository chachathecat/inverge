import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
  buildRewriteRegradeHistoryDerivedMetadata,
  validateRewriteRegradeHistoryContract,
} from "../lib/review-os/rewrite-regrade-history-contract.ts";
import { RUBRIC_EVIDENCE_CONTRACT_VERSION } from "../lib/review-os/rubric-evidence-contract.ts";
import { SAFE_DERIVED_SIGNAL_KEYS, assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";

function reviewLink(overrides = {}) {
  return {
    reviewId: "review-s205-1",
    sourceContractVersion: RUBRIC_EVIDENCE_CONTRACT_VERSION,
    reviewStatus: "ready",
    evidenceRefIds: ["ev-root-1", "ev-rewrite-1"],
    deductionCandidateIds: ["deduction-gap-1"],
    primaryGapId: "gap-primary-1",
    nextActionId: "action-rewrite-1",
    taskHookKind: "rewrite",
    ...overrides,
  };
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

function baseContract(overrides = {}) {
  const sourceReviewLink = reviewLink();
  const contract = {
    version: REWRITE_REGRADE_HISTORY_CONTRACT_VERSION,
    dataClass: "derived_learning_metadata",
    examMode: "second",
    subject: "law",
    subjectLabel: "감정평가 및 보상법규",
    historyId: "history-s206-1",
    rootAnswerSubmissionId: "submission-root-1",
    ownerBinding: "authenticated_request_user",
    attemptLineage: {
      rootAnswerSubmissionId: "submission-root-1",
      latestAttemptId: "attempt-rewrite-2",
      latestAttemptVersion: 2,
      attempts: [
        {
          attemptId: "attempt-root-1",
          attemptKind: "root_submission",
          rootAnswerSubmissionId: "submission-root-1",
          answerSubmissionId: "submission-root-1",
          attemptVersion: 1,
          parentAttemptId: null,
          createdAt: "2026-06-26T00:00:00.000Z",
          privateStorageRef: privateStorageRef("wrong-answer-item-1", "review_os_wrong_answer_item"),
          sourceReviewLink: null,
          target: null,
          learnerActionTerminal: "initial_submission",
        },
        {
          attemptId: "attempt-rewrite-2",
          attemptKind: "rewrite",
          rootAnswerSubmissionId: "submission-root-1",
          answerSubmissionId: "submission-root-1",
          attemptVersion: 2,
          parentAttemptId: "attempt-root-1",
          createdAt: "2026-06-26T00:20:00.000Z",
          privateStorageRef: privateStorageRef("rewrite-record-1", "learner_rewrite_attempt"),
          sourceReviewLink,
          target: {
            primaryGapId: "gap-primary-1",
            nextActionId: "action-rewrite-1",
            evidenceRefIds: ["ev-root-1"],
            deductionCandidateIds: ["deduction-gap-1"],
            conceptNodeIds: ["concept-issue-1"],
          },
          learnerActionTerminal: "rewrite",
        },
      ],
    },
    reReviewRequests: [
      {
        requestId: "request-rereview-1",
        requestKind: "rewrite_re_review",
        status: "metadata_ready",
        rootAnswerSubmissionId: "submission-root-1",
        targetAttemptId: "attempt-rewrite-2",
        targetAttemptVersion: 2,
        baselineReviewId: "review-s205-1",
        requestedAt: "2026-06-26T00:21:00.000Z",
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
        comparisonId: "comparison-1",
        comparisonStatus: "not_reviewed_yet",
        baselineAttemptId: "attempt-root-1",
        comparedAttemptId: "attempt-rewrite-2",
        baselineReviewId: "review-s205-1",
        comparedReviewId: null,
        evidenceRefIds: ["ev-root-1"],
        resolvedDeductionCandidateIds: [],
        recurringDeductionCandidateIds: ["deduction-gap-1"],
        newDeductionCandidateIds: [],
        primaryGapChanged: false,
        primaryGapBeforeId: "gap-primary-1",
        primaryGapAfterId: null,
        nextActionBeforeId: "action-rewrite-1",
        nextActionAfterId: null,
        improvement: {
          status: "not_reviewed_yet",
          confidence: "medium",
          evidenceRefIds: ["ev-root-1"],
          deductionCandidateIds: ["deduction-gap-1"],
          conceptNodeIds: ["concept-issue-1"],
          safeForS216ErrorNotebook: true,
          safeForS217ConceptGraph: true,
        },
        scoreLikeSummary: null,
      },
    ],
    derivedSignals: {
      improvementStatus: "not_reviewed_yet",
      primaryGapId: "gap-primary-1",
      nextActionId: "action-rewrite-1",
      evidenceRefIds: ["ev-root-1"],
      deductionCandidateIds: ["deduction-gap-1"],
      conceptNodeIds: ["concept-issue-1"],
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
  return { ...contract, ...overrides };
}

test("S206 accepts metadata-only rewrite lineage and builds safe derived metadata", () => {
  const contract = baseContract();
  const result = validateRewriteRegradeHistoryContract(contract);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);

  const metadata = buildRewriteRegradeHistoryDerivedMetadata(contract);
  assert.equal(metadata.contractVersion, REWRITE_REGRADE_HISTORY_CONTRACT_VERSION);
  assert.equal(metadata.rootAnswerSubmissionId, "submission-root-1");
  assert.equal(metadata.latestAttemptKind, "rewrite");
  assert.equal(metadata.latestAttemptVersion, 2);
  assert.equal(metadata.reviewRequestStatus, "metadata_ready");
  assert.equal(metadata.improvementStatus, "not_reviewed_yet");
  assert.equal(metadata.safeForS216ErrorNotebook, true);
  assert.equal(metadata.safeForS217ConceptGraph, true);
  assert.equal(metadata.confirmedScore, false);
  assert.equal(metadata.passProbability, false);
  assertNoRawUserDataInDerived(metadata);
});

test("S206 accepts practice recalculation attempts only with reset-safe GIII metadata", () => {
  const recalcLink = reviewLink({
    reviewId: "review-s205-practice-1",
    primaryGapId: "gap-calculation-1",
    nextActionId: "action-recalculate-1",
    taskHookKind: "recalculation",
  });
  const contract = baseContract({
    subject: "practice",
    subjectLabel: "감정평가실무",
    attemptLineage: {
      rootAnswerSubmissionId: "submission-root-1",
      latestAttemptId: "attempt-recalc-2",
      latestAttemptVersion: 2,
      attempts: [
        baseContract().attemptLineage.attempts[0],
        {
          attemptId: "attempt-recalc-2",
          attemptKind: "recalculation",
          rootAnswerSubmissionId: "submission-root-1",
          answerSubmissionId: "submission-root-1",
          attemptVersion: 2,
          parentAttemptId: "attempt-root-1",
          createdAt: "2026-06-26T00:20:00.000Z",
          privateStorageRef: privateStorageRef("recalculation-record-1", "learner_recalculation_attempt"),
          sourceReviewLink: recalcLink,
          target: {
            primaryGapId: "gap-calculation-1",
            nextActionId: "action-recalculate-1",
            evidenceRefIds: ["ev-root-1"],
            deductionCandidateIds: ["deduction-gap-1"],
            conceptNodeIds: ["concept-calculation-1"],
          },
          learnerActionTerminal: "recalculation",
          calculation: {
            calculatorModel: "casio_fx_9860giii",
            resetSafeHandKeyedRoutineOnly: true,
            storedProgramDependency: false,
            routineRefId: "routine-synthetic-giii-1",
            formulaStoredInContract: false,
            extractedValuesStoredInContract: false,
            handKeyedSequenceStoredInContract: false,
            expectedDisplayStoredInContract: false,
            unitCheckStatus: "pending",
            roundingCheckStatus: "pending",
          },
        },
      ],
    },
    reReviewRequests: [
      {
        ...baseContract().reReviewRequests[0],
        requestKind: "recalculation_re_review",
        targetAttemptId: "attempt-recalc-2",
        baselineReviewId: "review-s205-practice-1",
        sourceReviewLink: recalcLink,
      },
    ],
    comparisons: [],
    derivedSignals: {
      ...baseContract().derivedSignals,
      primaryGapId: "gap-calculation-1",
      nextActionId: "action-recalculate-1",
      conceptNodeIds: ["concept-calculation-1"],
    },
  });

  const result = validateRewriteRegradeHistoryContract(contract);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("S206 rejects raw learner or OCR fields in derived history metadata", () => {
  const result = validateRewriteRegradeHistoryContract({
    ...baseContract(),
    rawAnswerText: "synthetic-forbidden-marker",
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /raw-user-data-in-derived-metadata/);
});

test("S206 rejects broken attempt lineage and unlinked latest attempts", () => {
  const base = baseContract();
  const result = validateRewriteRegradeHistoryContract({
    ...base,
    attemptLineage: {
      ...base.attemptLineage,
      latestAttemptId: "missing-attempt",
      latestAttemptVersion: 4,
      attempts: [
        {
          ...base.attemptLineage.attempts[0],
          attemptVersion: 2,
        },
        {
          ...base.attemptLineage.attempts[1],
          parentAttemptId: "missing-parent",
        },
      ],
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /latestAttemptId must reference a known attempt/);
  assert.match(result.errors.join("\n"), /version sequence must be contiguous/);
  assert.match(result.errors.join("\n"), /root_submission must be version 1/);
  assert.match(result.errors.join("\n"), /parentAttemptId references unknown attempt/);
});

test("S206 rejects official or score-terminal comparison metadata", () => {
  const base = baseContract();
  const result = validateRewriteRegradeHistoryContract({
    ...base,
    comparisons: [
      {
        ...base.comparisons[0],
        scoreLikeSummary: {
          rangeLowerDelta: 4,
          rangeUpperDelta: 6,
          scoreLikeSummarySecondary: false,
          nonOfficial: true,
          confirmedScore: true,
          passProbability: true,
          passGuarantee: false,
          notFinalEndpoint: false,
        },
      },
    ],
    authorityFlags: {
      ...base.authorityFlags,
      officialGrading: true,
      terminalLearnerAction: "score_summary",
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /scoreLikeSummarySecondary must be true/);
  assert.match(result.errors.join("\n"), /confirmedScore must be false/);
  assert.match(result.errors.join("\n"), /passProbability must be false/);
  assert.match(result.errors.join("\n"), /officialGrading must be false/);
  assert.match(result.errors.join("\n"), /keep score display from being terminal/);
});

test("S206 documentation and safe metadata vocabulary are present", async () => {
  const doc = await readFile("docs/s206-rewrite-regrade-answer-history.md", "utf8");
  for (const phrase of [
    "S206",
    "learner answer submission",
    "one biggest gap",
    "one next action",
    "s206.rewrite_regrade_history.v1",
    "S211",
    "S212",
    "S213",
    "S216",
    "S217",
    "casio_fx_9860giii",
  ]) {
    assert.ok(doc.includes(phrase), `Missing S206 doc phrase: ${phrase}`);
  }

  for (const key of [
    "rootAnswerSubmissionId",
    "latestAttemptId",
    "reviewRequestStatus",
    "comparisonStatus",
    "improvementStatus",
    "safeForS216ErrorNotebook",
    "safeForS217ConceptGraph",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing safe derived key ${key}`);
  }
  assert.doesNotMatch(doc, /Raw learner answer text\s*:|OCR full text\s*:|기출문제 원문|답안 전문/);
});
