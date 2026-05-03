import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildSecondGradingPrompt } from "../lib/evaluate/second-grading/prompt.ts";
import { normalizeSecondGradingResult } from "../lib/evaluate/second-grading/normalize.ts";
import { SECOND_GRADING_RUBRIC_BY_TYPE } from "../lib/evaluate/second-grading/schema.ts";

const fixturesFileUrl = new URL(
  "../lib/evaluate/second-grading/__fixtures__/second-grading-2025-36-fixtures.json",
  import.meta.url,
);
const fixtures = JSON.parse(readFileSync(fixturesFileUrl, "utf8"));

function hasLatexFormula(line) {
  return /\\\(|\\\)|\$[^$]+\$|\\frac|\\sum|\\times|\\hat|\\beta/.test(line);
}

test("fixture file has second-round entries and required fields", () => {
  assert.ok(Array.isArray(fixtures.fixtures));
  assert.ok(fixtures.fixtures.length > 0);

  for (const item of fixtures.fixtures) {
    assert.equal(item.examType, "second");
    assert.equal(item.mode, "problem_only");
    assert.ok(item.questionText?.length > 30);
    assert.ok(["theory", "law", "practice"].includes(item.questionType));
    assert.deepEqual(item.scoringRubric, SECOND_GRADING_RUBRIC_BY_TYPE[item.questionType]);
  }
});

test("skeleton lines that contain formulas use latex markers", () => {
  for (const item of fixtures.fixtures) {
    const lines = Array.isArray(item.skeletonModelAnswer) ? item.skeletonModelAnswer : [];
    for (const line of lines) {
      if (/(PI|IRR|NPV|NOI|WACC|CAPM|DCF|FCFF|\$)/.test(line)) {
        assert.equal(hasLatexFormula(line), true, `Expected LaTeX marker in: ${line.slice(0, 60)}`);
      }
    }
  }
});

test("normalize enforces clamp, double-jeopardy prevention, and issue-gate lock", () => {
  const normalized = normalizeSecondGradingResult({
    mode: "grade_answer",
    subject: "감정평가실무",
    questionType: "practice",
    issueGate: { triggered: true, reason: "핵심 이탈", lockScoreTo: 35 },
    rubricScores: [
      { category: "issue", score: 30, rationale: "x", evidence: [] },
      { category: "application", score: 80, rationale: "x", evidence: [] },
    ],
    baseScore: 99,
    deductions: [
      { code: "weak_application_subsumption", rootCauseId: "same", reason: "a" },
      { code: "calculation_formula_error", rootCauseId: "same", reason: "b" },
      { code: "issue_error", rootCauseId: "issue_spotting_failure", reason: "c" },
      { code: "issue_error", rootCauseId: "issue_spotting_failure", reason: "d" },
    ],
  });

  assert.equal(normalized.finalScore, 35);
  assert.equal(normalized.deductions.length, 3);
  assert.equal(normalized.rubricScores.find((x) => x.category === "issue")?.score, 15);
  assert.equal(normalized.rubricScores.find((x) => x.category === "application")?.score, 50);
});

test("prompt switches between problem_only and grade_answer modes", () => {
  const problemOnly = buildSecondGradingPrompt({
    subject: "감정평가이론",
    questionType: "theory",
    questionText: "문제 본문",
  });

  const gradeAnswer = buildSecondGradingPrompt({
    subject: "감정평가및보상법규",
    questionType: "law",
    questionText: "문제 본문",
    userAnswerText: "답안 본문",
  });

  assert.match(problemOnly, /\[실행 모드\] problem_only/);
  assert.match(gradeAnswer, /\[실행 모드\] grade_answer/);
  assert.match(gradeAnswer, /모델답안은 문단형 완성답안을 금지/);
});
