import test from "node:test";
import assert from "node:assert/strict";
import { buildCaptureNoteSignals, structureCaptureNote } from "../lib/review-os/capture-note-engine.ts";

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

test("second mode structuring includes rewrite instruction", () => {
  const note = structureCaptureNote({
    mode: "second",
    subject: "감정평가이론",
    confirmedText: "사례 텍스트",
    itemInput: {
      examName: "감정평가사 2차",
      subjectLabel: "감정평가이론",
      sourceType: "manual",
      correctAnswer: "기준",
      userAnswer: "내 답안",
      confidence: "중간",
      missingIssue: "시장가치 논점 누락",
      rewriteInstruction: "누락 논점을 앞 문단에 추가",
    },
  });
  assert.ok(String(note.rewrite_instruction).length > 0);
  assert.ok(String(note.one_biggest_gap).length > 0);
  assert.ok(String(note.one_next_action).length > 0);
});

test("structuring language avoids official grading/pass-fail wording", () => {
  const note = structureCaptureNote({
    mode: "first",
    subject: "민법",
    confirmedText: "텍스트",
    itemInput: {
      examName: "감정평가사 1차",
      subjectLabel: "민법",
      sourceType: "manual",
      correctAnswer: "1",
      userAnswer: "2",
      confidence: "중간",
    },
  });
  const joined = JSON.stringify(note);
  assert.equal(/공식 점수|공식 모범답안|합격|불합격|채점 확정/.test(joined), false);
});
