import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  CORE_BLITZ_STARTING_MAIN,
  CORE_BLITZ_STARTING_TREE,
  CORE_BLITZ_WAVE1_CONTRACT_VERSION,
  CoreBlitzWave1Error,
  admitQuestionToBankV1,
  assertApp1C3rHandoffH0V1,
  classifyAssistanceV1,
  resumeCoreBlitzCheckpointV1,
} from "../lib/core-blitz/wave1.ts";

const root = path.resolve(import.meta.dirname, "..");
const assertCode = (fn, code) => assert.throws(fn, (error) =>
  error instanceof CoreBlitzWave1Error && error.code === code);

function handoff() {
  return {
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    app1Receipt: { receiptId: "app1-1", itemId: "item-1", repairRevisionId: "rev-2" },
    c3rJourney: { journeyId: "journey-1", itemId: "item-1", repairRevisionId: "rev-2" },
    d1ReviewUnits: [{
      reviewUnitId: "d1-1", journeyId: "journey-1", itemId: "item-1", dueKind: "D1",
      assistanceClass: "NONE", learnerVisible: true, requiresUnaidedAttempt: true,
    }],
  };
}

function bank(bankClass) {
  return {
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    bankClass, candidateId: `candidate-${bankClass}`, familyId: "family-1",
    rightsVerified: true, sourceCurrent: true, releaseChainComplete: true,
    unseenEligibilitySnapshotSealed: true, nonSameSurfaceAsSource: true,
    familyIsolated: true,
    calibrationState: bankClass === "MEASUREMENT"
      ? "MEASUREMENT_CALIBRATED"
      : bankClass === "VERIFIED_TRANSFER" ? "TRANSFER_VERIFIED" : "UNASSESSED",
    timedProtocolBound: bankClass === "MEASUREMENT",
  };
}

test("assistance never becomes independent evidence", () => {
  assert.equal(classifyAssistanceV1("NONE").independentAttemptEligible, true);
  for (const value of ["MINIMAL_HINT", "GUIDED_EXPLANATION", "EASY_EXPLANATION",
    "FULL_SOLUTION_REVEALED", "DIRECT_ANSWER_REVEALED"]) {
    const decision = classifyAssistanceV1(value);
    assert.equal(decision.independentAttemptEligible, false);
    assert.equal(decision.sameItemMasteryGainAllowed, false);
    assert.equal(decision.transferEvidenceEligible, false);
    assert.equal(decision.requiresDistinctUnaidedAttempt, true);
  }
});

test("APP-1 H0 binds exactly one visible unaided D+1 unit", () => {
  assert.equal(assertApp1C3rHandoffH0V1(handoff()).outcome, "APP1_C3R_HANDOFF_H0_VALID");
  const duplicate = handoff();
  duplicate.d1ReviewUnits.push({ ...duplicate.d1ReviewUnits[0], reviewUnitId: "d1-2" });
  assertCode(() => assertApp1C3rHandoffH0V1(duplicate),
    "H0_EXACTLY_ONE_D1_REVIEW_UNIT_REQUIRED");
  const aided = handoff();
  aided.d1ReviewUnits[0].assistanceClass = "MINIMAL_HINT";
  assertCode(() => assertApp1C3rHandoffH0V1(aided), "H0_UNAIDED_CHECK_REQUIRED");
});

test("three-bank admission fails closed", () => {
  assert.equal(admitQuestionToBankV1(bank("LEARNING_PRACTICE")).learnerUse, "LEARNING_ONLY");
  assert.equal(admitQuestionToBankV1(bank("VERIFIED_TRANSFER")).learnerUse, "VERIFIED_TRANSFER");
  assert.equal(admitQuestionToBankV1(bank("MEASUREMENT")).learnerUse, "MEASUREMENT");
  const exposed = bank("VERIFIED_TRANSFER");
  exposed.unseenEligibilitySnapshotSealed = false;
  assertCode(() => admitQuestionToBankV1(exposed), "BANK_UNSEEN_SNAPSHOT_REQUIRED");
  const uncalibrated = bank("MEASUREMENT");
  uncalibrated.calibrationState = "TRANSFER_VERIFIED";
  assertCode(() => admitQuestionToBankV1(uncalibrated),
    "BANK_MEASUREMENT_CALIBRATION_REQUIRED");
});

test("checkpoint resumes all eligible lanes and seven-exam remains source-only", () => {
  const checkpoint = JSON.parse(fs.readFileSync(path.join(
    root, "docs/exec-plans/active/core-blitz-wave1-checkpoint.json"), "utf8"));
  const contract = JSON.parse(fs.readFileSync(path.join(
    root, "config/dabangil-core-blitz-wave1-v1.json"), "utf8"));
  const seven = JSON.parse(fs.readFileSync(path.join(
    root, "config/dabangil-seven-exam-pre-t0-v1.json"), "utf8"));
  const decision = resumeCoreBlitzCheckpointV1(
    checkpoint, checkpoint.scopeDigest, CORE_BLITZ_STARTING_MAIN, CORE_BLITZ_STARTING_TREE);
  assert.deepEqual(decision.readyNodeIds, [
    "APP1_C3R_HANDOFF_H0", "M4_FIRST_STAGE_COMMON_KERNEL", "QF_I1_INTEGRATION",
    "SEVEN_EXAM_DOSSIER_AND_SOURCE_PREPARATION",
  ]);
  assert.equal(contract.startingAuthority.mainSha, CORE_BLITZ_STARTING_MAIN);
  assert.equal(contract.startingAuthority.mainTree, CORE_BLITZ_STARTING_TREE);
  assert.equal(contract.activationBoundary.production, false);
  assert.equal(seven.examCells.length, 7);
  for (const forbidden of ["shared_core_mutation", "learner_runtime", "publication",
    "commercial_activation", "rights_decision"]) {
    assert.ok(seven.forbiddenUntilCertified.includes(forbidden));
  }
  const raw = handoff();
  raw.app1Receipt.answerBody = "forbidden";
  assertCode(() => assertApp1C3rHandoffH0V1(raw), "RAW_BODY_FORBIDDEN");
});
