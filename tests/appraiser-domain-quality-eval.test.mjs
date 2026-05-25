import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { evaluateReviewOutputQuality } from "../lib/review-os/quality-eval.ts";

const fixtureDir = path.join(process.cwd(), "tests/fixtures/quality");
const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));

const positiveFixtures = [
  "second_practice_calculation_basis_missing.json",
  "second_practice_unit_date_mismatch.json",
  "second_practice_conclusion_missing.json",
  "second_practice_wrong_method_cue.json",
  "second_theory_definition_only.json",
  "second_theory_argument_not_connected_case.json",
  "second_theory_abstract_conclusion.json",
  "second_theory_comparison_point_missing.json",
  "second_law_requirement_missing_v2.json",
  "second_law_principle_missing.json",
  "second_law_weak_application_facts.json",
  "second_law_conclusion_missing_v2.json",
  "first_civil_law_requirement_trap.json",
  "first_economics_graph_shift_trap.json",
  "first_accounting_recognition_measurement_trap.json",
  "first_appraiser_law_procedure_sequence_trap.json",
];

test("appraiser domain quality positives pass", () => {
  for (const name of positiveFixtures) {
    const fixture = readFixture(name);
    const r = evaluateReviewOutputQuality(fixture);
    assert.equal(r.hasOneBiggestGap, true, `${name}: exactly one primary gap required`);
    assert.equal(r.hasOneNextAction, true, `${name}: next action required`);
    assert.equal(r.nextActionIsConcrete, true, `${name}: next action should be concrete`);
    assert.equal(r.respectsSubjectStructure, true, `${name}: subject structure must be respected`);
    assert.equal(r.hasNoForbiddenClaims, true, `${name}: no official grading or score claims`);
    assert.equal(r.hasNoOfficialAnswerHallucination, true, `${name}: no hallucinated official answers`);
    assert.equal(r.outputIsConciseForTiredLearner, true, `${name}: concise output required`);
    assert.equal(r.hasSinglePrimaryAction, true, `${name}: single primary action required`);
  }
});

test("ocr uncertainty fixture triggers caution", () => {
  const fixture = readFixture("noisy_ocr_uncertain.json");
  const r = evaluateReviewOutputQuality(fixture);
  assert.equal(r.hasOcrCautionWhenNeeded, true);
});

test("bad generic feedback fails", () => {
  const r = evaluateReviewOutputQuality(readFixture("negative_generic_feedback.json"));
  assert.equal(r.hasOneBiggestGap, false);
});

test("unsupported official-answer claims fail", () => {
  const r = evaluateReviewOutputQuality(readFixture("negative_official_answer_claim.json"));
  assert.equal(r.hasNoOfficialAnswerHallucination, false);
});

test("subject-incompatible feedback fails", () => {
  const incompatible = {
    mode: "second",
    ocrUncertain: false,
    output: {
      biggestGap: "핵심 누락 1개가 있습니다.",
      nextAction: "5분 동안 요건 2개를 다시 작성하세요.",
      conceptTag: "민법",
      retrievalPrompt: "요건 회상",
      primaryActions: ["재작성"],
      secondModeFlow: "내 답안 작성 후 기준답안과 비교",
    },
  };

  const r = evaluateReviewOutputQuality(incompatible);
  assert.equal(r.respectsSubjectStructure, false);
});
