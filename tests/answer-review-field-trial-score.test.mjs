import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { scoreAnswerReviewFieldResult } from "../lib/evaluate/answer-review-field-score.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("scorecard doc exists and contains required sections", () => {
  const content = read("docs/answer-review-field-trial-scorecard.md");

  [
    "Korean clarity",
    "Primary fix quality",
    "Skeleton usefulness",
    "Next action clarity",
    "Save motivation",
    "Trust/safety",
    "Average score >= 4.0",
    "would use it again tomorrow",
    "would pay",
    "Critical failures",
  ].forEach((snippet) => {
    assert.ok(content.includes(snippet), `missing: ${snippet}`);
  });
});

test("field trial fixture template exists and contains required fields", () => {
  const content = read("tests/fixtures/answer-review-field-trial/README.md");

  [
    "Sample ID",
    "Input type",
    "Expected useful output",
    "Observed output notes",
    "Would use again tomorrow",
    "Would pay",
    "Critical failure",
  ].forEach((snippet) => {
    assert.ok(content.includes(snippet), `missing: ${snippet}`);
  });
});

test("field score helper exists and includes required symbols", () => {
  const content = read("lib/evaluate/answer-review-field-score.ts");

  [
    "scoreAnswerReviewFieldResult",
    "paidPilotReady",
    "criticalFailure",
    "paid_pilot_candidate",
    "beta_ready",
    "needs_iteration",
    "blocked",
  ].forEach((snippet) => {
    assert.ok(content.includes(snippet), `missing: ${snippet}`);
  });
});

test("criticalFailure true returns blocked and paidPilotReady false", () => {
  const result = scoreAnswerReviewFieldResult({
    koreanClarity: 5,
    primaryFixQuality: 5,
    skeletonUsefulness: 5,
    nextActionClarity: 5,
    saveMotivation: 5,
    trustSafety: 5,
    criticalFailure: true,
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.paidPilotReady, false);
});

test("average >= 4 with koreanClarity/trustSafety >= 4 returns paid_pilot_candidate", () => {
  const result = scoreAnswerReviewFieldResult({
    koreanClarity: 4,
    primaryFixQuality: 5,
    skeletonUsefulness: 4,
    nextActionClarity: 4,
    saveMotivation: 4,
    trustSafety: 4,
  });

  assert.equal(result.status, "paid_pilot_candidate");
  assert.equal(result.paidPilotReady, true);
});

test("any dimension <= 2 returns needs_iteration", () => {
  const result = scoreAnswerReviewFieldResult({
    koreanClarity: 4,
    primaryFixQuality: 2,
    skeletonUsefulness: 4,
    nextActionClarity: 4,
    saveMotivation: 4,
    trustSafety: 4,
  });

  assert.equal(result.status, "needs_iteration");
  assert.equal(result.paidPilotReady, false);
});

test("average >= 3.5 returns beta_ready", () => {
  const result = scoreAnswerReviewFieldResult({
    koreanClarity: 3.5,
    primaryFixQuality: 4,
    skeletonUsefulness: 3.5,
    nextActionClarity: 3.5,
    saveMotivation: 3.5,
    trustSafety: 3.5,
  });

  assert.equal(result.status, "beta_ready");
  assert.equal(result.paidPilotReady, false);
});

test("low average returns needs_iteration", () => {
  const result = scoreAnswerReviewFieldResult({
    koreanClarity: 3,
    primaryFixQuality: 3,
    skeletonUsefulness: 3,
    nextActionClarity: 3,
    saveMotivation: 3,
    trustSafety: 3,
  });

  assert.equal(result.status, "needs_iteration");
  assert.equal(result.paidPilotReady, false);
});

test("guardrails: new field trial artifacts should not include prohibited official grading claims", () => {
  const targets = [
    "docs/answer-review-field-trial-scorecard.md",
    "tests/fixtures/answer-review-field-trial/README.md",
    "lib/evaluate/answer-review-field-score.ts",
  ];
  const blockedTerms = [
    "공식 채점",
    "합격 판정",
    "확정 점수",
    "모범답안 확정",
    "official grader",
    "pass/fail judge",
    "정답 보장",
    "합격 보장",
    "합격 확률",
  ];

  for (const target of targets) {
    const content = read(target);
    for (const term of blockedTerms) {
      assert.equal(content.includes(term), false, `${target} should not include prohibited claim: ${term}`);
    }
  }
});

test("no payment implementation terms were added in new field trial artifacts", () => {
  const targets = [
    "docs/answer-review-field-trial-scorecard.md",
    "tests/fixtures/answer-review-field-trial/README.md",
    "lib/evaluate/answer-review-field-score.ts",
  ];

  const blockedTerms = ["checkout", "payment", "결제", "구독", "카드 등록"];

  for (const target of targets) {
    const content = read(target);
    for (const term of blockedTerms) {
      assert.equal(
        content.includes(term),
        false,
        `${target} should not include prohibited payment term: ${term}`,
      );
    }
  }
});
