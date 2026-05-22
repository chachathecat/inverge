import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { evaluateReviewOutputQuality } from "../lib/review-os/quality-eval.ts";

const fixtureDir = path.join(process.cwd(), "tests/fixtures/quality");

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));
}

const firstFixtures = [
  "first_mibeop_wrong_answer.json",
  "first_accounting_calculation_error.json",
];

const secondFixtures = [
  "second_practice_calculation_unit_risk.json",
  "second_theory_weak_application.json",
  "second_law_missing_requirement.json",
];

test("first fixtures produce first-mode action shape", () => {
  for (const name of firstFixtures) {
    const fixture = readFixture(name);
    const evalResult = evaluateReviewOutputQuality(fixture);
    assert.equal(evalResult.hasModeSpecificFields, true, `${name}: expected first-mode fields`);
    assert.equal(evalResult.koreanToneScore, "pass", `${name}: korean tone should pass`);
  }
});

test("second fixtures produce second-mode action shape", () => {
  for (const name of secondFixtures) {
    const fixture = readFixture(name);
    const evalResult = evaluateReviewOutputQuality(fixture);
    assert.equal(evalResult.hasModeSpecificFields, true, `${name}: expected second-mode fields`);
    assert.equal(evalResult.koreanToneScore, "pass", `${name}: korean tone should pass`);
  }
});

test("noisy OCR fixture requires caution", () => {
  const fixture = readFixture("noisy_ocr_uncertain.json");
  const evalResult = evaluateReviewOutputQuality(fixture);
  assert.equal(evalResult.hasOcrCautionWhenNeeded, true);
});

test("all outputs have one biggest gap and one next action", () => {
  const names = [...firstFixtures, ...secondFixtures, "noisy_ocr_uncertain.json"];
  for (const name of names) {
    const fixture = readFixture(name);
    const evalResult = evaluateReviewOutputQuality(fixture);
    assert.equal(evalResult.hasOneBiggestGap, true, `${name}: missing single biggest gap`);
    assert.equal(evalResult.hasOneNextAction, true, `${name}: missing single next action`);
    assert.equal(evalResult.nextActionIsShort, true, `${name}: next action should be short`);
  }
});

test("no forbidden claims", () => {
  const names = [...firstFixtures, ...secondFixtures, "noisy_ocr_uncertain.json"];
  for (const name of names) {
    const fixture = readFixture(name);
    const evalResult = evaluateReviewOutputQuality(fixture);
    assert.equal(evalResult.hasNoForbiddenClaims, true, `${name}: forbidden claim found`);
  }
});
