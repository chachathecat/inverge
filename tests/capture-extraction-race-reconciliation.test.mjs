import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceCaptureExtractionRequestRevision,
  clearUnchangedCaptureExtractionSemantics,
  isCurrentCaptureExtractionRequest,
  restoreLearnerEditedCaptureSemantics,
  snapshotCaptureExtractionSemantics,
} from "../lib/review-os/capture-extraction-reconciliation.ts";

function secondState(overrides = {}) {
  return {
    subjectLabel: "감정평가이론",
    sourceLabel: "",
    problemTitle: "이전 OCR 사례",
    correctAnswer: "이전 강의 정리",
    userAnswer: "학습자가 먼저 쓴 답안",
    userReasonText: "이전 누락 논점",
    keyConcepts: "",
    coreFormula: "",
    comparisonPoint: "",
    missingIssue: "이전 누락 논점",
    weakStructurePoint: "이전 구조 약점",
    weakApplicationSentence: "이전 문장 약점",
    rewriteInstruction: "이전 다시쓰기 지시",
    referenceStructure: "이전 참고 목차",
    myAnswerSummary: "이전 답안 요약",
    caseSummary: "이전 사례 요약",
    nextReviewDate: "2026-07-20",
    productionBeforeComparison: true,
    ...overrides,
  };
}

test("a late OCR response cannot revive stale derived semantics after learner edits", () => {
  const requestState = secondState();
  const snapshot = snapshotCaptureExtractionSemantics(requestState, "second");
  const latestState = secondState({
    correctAnswer: "학습자가 요청 중 직접 고친 강의 정리",
    userAnswer: "학습자가 요청 중 직접 고친 답안",
  });

  const cleared = clearUnchangedCaptureExtractionSemantics(latestState, snapshot, "second");
  assert.equal(cleared.problemTitle, "");
  assert.equal(cleared.missingIssue, "");
  assert.equal(cleared.weakStructurePoint, "");
  assert.equal(cleared.rewriteInstruction, "");
  assert.equal(cleared.productionBeforeComparison, false);
  assert.equal(cleared.correctAnswer, "학습자가 요청 중 직접 고친 강의 정리");
  assert.equal(cleared.userAnswer, "학습자가 요청 중 직접 고친 답안");

  const latestTextRederived = secondState({
    ...latestState,
    problemTitle: "최신 텍스트에서 다시 읽은 사례",
    correctAnswer: "최신 텍스트의 로컬 추정값",
    missingIssue: "최신 텍스트에서 다시 읽은 누락 논점",
    weakStructurePoint: "최신 텍스트에서 다시 읽은 구조",
    rewriteInstruction: "최신 텍스트에서 다시 읽은 지시",
    productionBeforeComparison: false,
  });
  const reconciled = restoreLearnerEditedCaptureSemantics(
    latestState,
    snapshot,
    latestTextRederived,
    "second",
  );

  assert.equal(reconciled.problemTitle, "최신 텍스트에서 다시 읽은 사례");
  assert.equal(reconciled.missingIssue, "최신 텍스트에서 다시 읽은 누락 논점");
  assert.equal(reconciled.weakStructurePoint, "최신 텍스트에서 다시 읽은 구조");
  assert.equal(reconciled.rewriteInstruction, "최신 텍스트에서 다시 읽은 지시");
  assert.equal(reconciled.correctAnswer, "학습자가 요청 중 직접 고친 강의 정리");
  assert.equal(reconciled.userAnswer, "학습자가 요청 중 직접 고친 답안");
});

test("a duplicate import makes the older image response ineligible", () => {
  let currentRevision = 0;
  const firstImportRevision = advanceCaptureExtractionRequestRevision(
    currentRevision,
    "image_import",
  );
  currentRevision = firstImportRevision;
  const duplicateImportRevision = advanceCaptureExtractionRequestRevision(
    currentRevision,
    "image_import",
  );
  currentRevision = duplicateImportRevision;

  assert.equal(
    isCurrentCaptureExtractionRequest(firstImportRevision, currentRevision),
    false,
  );
  assert.equal(
    isCurrentCaptureExtractionRequest(duplicateImportRevision, currentRevision),
    true,
  );
});

test("page removal, movement, PDF replacement, and reset each invalidate a pending image response", () => {
  for (const mutation of ["remove_page", "move_page", "pdf_import", "reset"]) {
    const pendingImageRevision = advanceCaptureExtractionRequestRevision(
      0,
      "image_import",
    );
    const currentRevision = advanceCaptureExtractionRequestRevision(
      pendingImageRevision,
      mutation,
    );

    assert.equal(
      isCurrentCaptureExtractionRequest(pendingImageRevision, currentRevision),
      false,
      `${mutation} must make the pending response stale`,
    );
  }
});
