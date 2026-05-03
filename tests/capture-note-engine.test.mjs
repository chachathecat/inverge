import test from "node:test";
import assert from "node:assert/strict";
import { buildCaptureNoteSignals } from "../lib/review-os/capture-note-engine.ts";

test("text-only first capture produces one biggest gap and one next action", () => {
  const note = buildCaptureNoteSignals("first", {
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    sourceType: "manual",
    correctAnswer: "2번",
    userAnswer: "3번",
    confidence: "중간",
    userReasonText: "요건 구분 누락",
    comparisonPoint: "요건을 먼저 적고 보기 비교",
    keyConcepts: ["대항력", "우선변제권"],
  });
  assert.ok(note.one_biggest_gap.length > 0);
  assert.ok(note.one_next_action.length > 0);
  assert.equal(Array.isArray(note.key_concepts), true);
});
