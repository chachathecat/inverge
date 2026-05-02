import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSecondGradingResult } from "../lib/evaluate/second-grading/normalize.ts";

test("normalizeSecondGradingResult clamps score and enforces issue gate lock", () => {
  const result = normalizeSecondGradingResult({
    mode: "grade_answer",
    subject: "감정평가실무",
    questionType: "practice",
    baseScore: 120,
    rubricScores: [{ category: "application", score: 80, rationale: "x", evidence: [] }],
    deductions: [{ code: "issue_error", rootCauseId: "r1", reason: "x" }],
    issueGate: { triggered: true, reason: "핵심 누락", lockScoreTo: -5 },
    skeletonModelAnswer: { outline: [{ heading: "h" }] },
  });

  assert.equal(result.finalScore, 0);
  assert.equal(result.deductions.length, 1);
  assert.equal(result.rubricScores.length, 5);
  assert.equal(result.skeletonModelAnswer.format, "outline_only");
});

test("normalizeSecondGradingResult prevents double deduction by same root cause", () => {
  const result = normalizeSecondGradingResult({
    questionType: "law",
    deductions: [
      { code: "weak_logic_toc_structure", rootCauseId: "same", reason: "a" },
      { code: "insufficient_legal_rule_case_statute", rootCauseId: "same", reason: "b" },
      { code: "issue_error", rootCauseId: "issue_spotting_failure", reason: "c" },
      { code: "issue_error", rootCauseId: "issue_spotting_failure", reason: "d" }
    ]
  });

  assert.equal(result.deductions.length, 3);
});
