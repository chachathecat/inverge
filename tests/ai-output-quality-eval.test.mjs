import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { evaluateReviewOutputQuality } from "../lib/review-os/quality-eval.ts";

const fixtureDir = path.join(process.cwd(), "tests/fixtures/quality");

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));
}

const requiredFixtures = [
  "first_objective_wrong_answer.json",
  "first_low_confidence.json",
  "second_practice_calculation_unit_weakness.json",
  "second_theory_weak_argument.json",
  "second_law_weak_requirement_subsumption.json",
  "ocr_failure_manual_text_fallback.json",
];

const negativeFixtures = [
  "negative_generic_feedback.json",
  "negative_score_claim.json",
  "negative_official_answer_claim.json",
];

test("all recommendation quality fixtures pass required checks", () => {
  for (const name of requiredFixtures) {
    const fixture = readFixture(name);
    const evalResult = evaluateReviewOutputQuality(fixture);
    assert.equal(evalResult.hasOneBiggestGap, true, `${name}: one biggest gap must be specific`);
    assert.equal(evalResult.hasOneNextAction, true, `${name}: one next action required`);
    assert.equal(evalResult.nextActionIsConcrete, true, `${name}: next action must be concrete`);
    assert.equal(evalResult.hasNoForbiddenClaims, true, `${name}: forbidden claims are not allowed`);
    assert.equal(evalResult.hasNoOfficialAnswerHallucination, true, `${name}: official answer hallucination is not allowed`);
    assert.equal(evalResult.respectsSubjectStructure, true, `${name}: subject structure is required`);
    assert.equal(evalResult.outputIsConciseForTiredLearner, true, `${name}: output must be concise`);
    assert.equal(evalResult.hasSinglePrimaryAction, true, `${name}: must have one clear next action`);
  }
});

test("ocr failure fixture includes manual text fallback guidance", () => {
  const fixture = readFixture("ocr_failure_manual_text_fallback.json");
  const evalResult = evaluateReviewOutputQuality(fixture);
  assert.equal(evalResult.hasOcrCautionWhenNeeded, true);
});

test("generic feedback fixture fails specificity", () => {
  const fixture = readFixture("negative_generic_feedback.json");
  const evalResult = evaluateReviewOutputQuality(fixture);
  assert.equal(evalResult.hasOneBiggestGap, false);
  assert.equal(evalResult.nextActionIsConcrete, false);
});

test("score or pass/fail language fixture fails safety checks", () => {
  const fixture = readFixture("negative_score_claim.json");
  const evalResult = evaluateReviewOutputQuality(fixture);
  assert.equal(evalResult.hasNoForbiddenClaims, false);
});

test("official answer claim fixture fails hallucination checks", () => {
  const fixture = readFixture("negative_official_answer_claim.json");
  const evalResult = evaluateReviewOutputQuality(fixture);
  assert.equal(evalResult.hasNoOfficialAnswerHallucination, false);
});
