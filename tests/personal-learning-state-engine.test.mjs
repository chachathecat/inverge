import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLearningStateTransition,
  buildLearningStateUpdateFromReviewResult,
  buildLearningStateUpdateFromSessionResult,
  deriveLearningStateTransition,
  rankLearningStateRisk,
} from "../lib/review-os/personal-learning-state-engine.ts";

const base = {
  userId: "u-state",
  conceptNodeId: "first_civil_nullity_rescission",
  examMode: "first",
  subject: "민법",
  taskType: "first_ox_retry",
  now: "2026-06-08T00:00:00.000Z",
};

const forbiddenRawPattern = /rawOcrText|ocrText|problemText|questionText|userAnswer|answerText|rawAnswerText|sourceText|copyrightedText|official|공식\s*채점|score|점수|pass\s*fail|합격\s*보장|model\s*answer|모범\s*답안/i;

test("high-confidence wrong answer becomes confident_wrong", () => {
  const update = deriveLearningStateTransition({ ...base, resultType: "wrong", confidence: "high", wasCorrect: false });
  assert.equal(update.nextStatus, "confident_wrong");
  assert.ok(rankLearningStateRisk(update.nextStatus) > rankLearningStateRisk("wrong"));
});

test("wrong answer with low confidence becomes wrong/confused, not stable", () => {
  const update = deriveLearningStateTransition({ ...base, resultType: "wrong", confidence: "low", previousStatus: "unknown", wasCorrect: false });
  assert.ok(update.nextStatus === "wrong" || update.nextStatus === "confused");
  assert.notEqual(update.nextStatus, "stable");
});

test("correct after wrong becomes recovering", () => {
  const update = buildLearningStateUpdateFromReviewResult({ ...base, resultType: "correct", confidence: "medium", previousStatus: "wrong", wasCorrect: true });
  assert.equal(update.sourceEventType, "review");
  assert.equal(update.nextStatus, "recovering");
});

test("repeated correct streak can become stable", () => {
  const update = buildLearningStateUpdateFromSessionResult({ ...base, resultType: "correct", confidence: "high", previousStatus: "recovering", wasCorrect: true, correctStreak: 2 });
  assert.equal(update.sourceEventType, "session");
  assert.equal(update.nextStatus, "stable");
  const applied = applyLearningStateTransition({ ...base, status: "recovering", correctStreak: 1 }, update);
  assert.equal(applied.status, "stable");
  assert.ok((applied.correctStreak ?? 0) >= 2);
});

test("OCR pending does not improve state", () => {
  const update = deriveLearningStateTransition({ ...base, taskType: "ocr_confirmation", resultType: "captured", confidence: "low", previousStatus: "wrong", ocrConfirmationPending: true });
  assert.equal(update.nextStatus, "wrong");
  assert.match(update.nextReviewPattern, /ocr_confirm/);
  assert.notEqual(update.nextStatus, "stable");
});

test("skipped task does not improve state", () => {
  const update = deriveLearningStateTransition({ ...base, resultType: "skipped", confidence: "high", previousStatus: "wrong" });
  assert.equal(update.nextStatus, "wrong");
  assert.match(update.reason, /skipped|missed/);
});

test("second-mode paragraph rewrite completion can move weak_structure from wrong/confused to recovering", () => {
  const update = deriveLearningStateTransition({
    ...base,
    conceptNodeId: "second_law_project_approval_disposition",
    examMode: "second",
    subject: "감정평가 및 보상법규",
    taskType: "weak_structure paragraph_rewrite",
    resultType: "rewritten",
    previousStatus: "confused",
    weakStructure: true,
  });
  assert.equal(update.nextStatus, "recovering");
  assert.match(update.reason, /rewrite_completed/);
});

test("state updates are metadata-only and reject raw text keys", () => {
  const update = deriveLearningStateTransition({ ...base, resultType: "captured", confidence: "medium" });
  assert.equal(update.metadataOnly, true);
  assert.doesNotMatch(JSON.stringify(update), forbiddenRawPattern);
  assert.throws(() => deriveLearningStateTransition({ ...base, resultType: "wrong", rawOcrText: "원문" }), /raw-user-data-in-derived-metadata/);
});
