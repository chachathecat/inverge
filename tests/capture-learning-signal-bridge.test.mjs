import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildLearningSignalFromCaptureMetadata,
  buildReviewQueueItemFromCaptureMetadata,
  buildTodayPlanCandidateFromCaptureMetadata,
} from "../lib/review-os/capture-learning-signal-bridge.ts";

const forbiddenRawKeys = [
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "modelAnswer",
  "officialAnswer",
];

const forbiddenSurfaceCopy = [/public archive/i, /archive/i, /아카이브/, /instructor/i, /\/instructor/i, /결제/, /payment/i, /native app/i, /네이티브 앱/];

function stringify(value) {
  return JSON.stringify(value, null, 2);
}

function assertNoRawFields(value) {
  const serialized = stringify(value);
  for (const key of forbiddenRawKeys) {
    assert.equal(serialized.includes(`"${key}"`), false, `${key} must not be emitted`);
  }
}

function assertNoForbiddenSurfaceCopy(value) {
  const serialized = stringify(value);
  for (const pattern of forbiddenSurfaceCopy) {
    assert.equal(pattern.test(serialized), false, `${pattern} must not be emitted`);
  }
}

function baseInput(overrides = {}) {
  return {
    examMode: "first",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "juristic-act",
    unitName: "법률행위",
    captureSource: "photo",
    confidence: "low",
    daysUntilExam: 18,
    ...overrides,
  };
}

describe("capture learning signal bridge", () => {
  it("creates a 1차 wrong-answer review signal from metadata", () => {
    const result = buildReviewQueueItemFromCaptureMetadata(
      baseInput({
        captureIntent: "wrong_answer",
        resultHint: "wrong",
      }),
    );

    assert.equal(result.learningSignal.examMode, "first");
    assert.equal(result.learningSignal.executionSource, "capture");
    assert.equal(result.learningSignal.result, "wrong");
    assert.equal(result.learningSignal.nextRecommendedTaskType, "O/X");
    assert.equal(result.reviewQueueItem?.taskType, "O/X");
    assert.ok(result.learningSignal.prioritySignals.includes("review_candidate"));
    assert.ok(result.dataBoundaryWarnings.includes("raw_ocr_problem_answer_text_not_accepted"));
    assertNoRawFields(result);
  });

  it("creates a 1차 concept uncertainty cloze/OX signal", () => {
    const { learningSignal, reviewQueueItem } = buildReviewQueueItemFromCaptureMetadata(
      baseInput({
        captureIntent: "concept_uncertainty",
        resultHint: "unknown",
      }),
    );

    assert.equal(learningSignal.result, "unknown");
    assert.equal(learningSignal.taskType, "cloze");
    assert.equal(learningSignal.nextRecommendedTaskType, "cloze");
    assert.equal(reviewQueueItem?.taskType, "cloze");
    assert.match(reviewQueueItem?.primaryAction ?? "", /빈칸|회상/);
  });

  it("creates a 회계 calculation accounting-template signal", () => {
    const { learningSignal, reviewQueueItem } = buildReviewQueueItemFromCaptureMetadata(
      baseInput({
        subjectId: "accounting",
        subjectName: "회계학",
        unitName: "원가 계산",
        captureIntent: "calculation_check",
      }),
    );

    assert.equal(learningSignal.taskType, "accounting template");
    assert.equal(learningSignal.nextRecommendedTaskType, "accounting template");
    assert.ok(learningSignal.prioritySignals.includes("accounting_template_review"));
    assert.equal(reviewQueueItem?.taskType, "accounting template");
  });

  it("creates a 2차 answer rewrite signal", () => {
    const { learningSignal, reviewQueueItem } = buildReviewQueueItemFromCaptureMetadata(
      baseInput({
        examMode: "second",
        subjectId: "appraisal-theory",
        subjectName: "감정평가이론",
        unitName: "논술 구조",
        captureIntent: "answer_rewrite",
        resultHint: "needs_rewrite",
      }),
    );

    assert.equal(learningSignal.examMode, "second");
    assert.equal(learningSignal.taskType, "rewrite");
    assert.equal(learningSignal.derivedStatus, "needs_rewrite");
    assert.equal(learningSignal.nextRecommendedTaskType, "rewrite");
    assert.equal(reviewQueueItem?.taskType, "rewrite");
    assert.match(reviewQueueItem?.primaryAction ?? "", /다시쓰기/);
  });

  it("creates a 2차 calculation CASIO signal", () => {
    const { learningSignal, reviewQueueItem } = buildReviewQueueItemFromCaptureMetadata(
      baseInput({
        examMode: "second",
        subjectId: "appraisal-practice",
        subjectName: "감정평가실무",
        unitName: "수익환원 계산",
        captureIntent: "calculation_check",
      }),
    );

    assert.equal(learningSignal.taskType, "CASIO");
    assert.equal(learningSignal.nextRecommendedTaskType, "CASIO");
    assert.ok(learningSignal.prioritySignals.includes("calculator_recovery"));
    assert.equal(reviewQueueItem?.taskType, "CASIO");
  });

  it("creates a 2차 issue-spotting signal", () => {
    const { learningSignal, reviewQueueItem } = buildReviewQueueItemFromCaptureMetadata(
      baseInput({
        examMode: "second",
        subjectId: "appraisal-law",
        subjectName: "감정평가 및 보상법규",
        unitName: "보상 쟁점",
        captureIntent: "issue_spotting",
      }),
    );

    assert.equal(learningSignal.taskType, "issue spotting");
    assert.equal(learningSignal.nextRecommendedTaskType, "issue spotting");
    assert.ok(learningSignal.prioritySignals.includes("issue_spotting_gap"));
    assert.equal(reviewQueueItem?.taskType, "issue spotting");
  });

  it("rejects raw OCR/problem/answer text-like keys", () => {
    for (const key of ["rawOcrText", "problemText", "answerText", "questionText", "officialAnswer"]) {
      assert.throws(
        () => buildLearningSignalFromCaptureMetadata({ ...baseInput({ captureIntent: "wrong_answer" }), [key]: "private raw content" }),
        /Raw OCR\/problem\/answer text field is not accepted/,
      );
    }
  });

  it("does not emit raw fields or prohibited public/instructor/payment/native-app copy", () => {
    const result = buildTodayPlanCandidateFromCaptureMetadata(
      baseInput({
        examMode: "second",
        subjectName: "감정평가실무",
        unitName: "환원율 계산",
        captureIntent: "calculation_check",
        captureSource: "pdf",
      }),
    );

    assertNoRawFields(result);
    assertNoForbiddenSurfaceCopy(result);
  });

  it("returns Today Plan-compatible candidates compressed to max 3", () => {
    const result = buildTodayPlanCandidateFromCaptureMetadata(
      baseInput({
        captureIntent: "wrong_answer",
        resultHint: "unknown",
        taskType: "O/X",
      }),
    );

    assert.ok(result.todayPlanCandidates.length > 0);
    assert.ok(result.todayPlanCandidates.length <= 3);
    for (const candidate of result.todayPlanCandidates) {
      assert.equal(candidate.source, "review_queue");
      assert.equal(candidate.isPrimaryTask, true);
      assert.ok(candidate.sourceReviewQueueItemId);
      assert.ok(candidate.prioritySignals.includes("review_candidate"));
    }
  });
});
