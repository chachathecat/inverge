import assert from "node:assert/strict";
import crypto from "node:crypto";
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
const assertCode = (fn, code) => assert.throws(
  fn,
  (error) => error instanceof CoreBlitzWave1Error && error.code === code,
);

function handoff() {
  return {
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    app1Receipt: {
      receiptId: "app1-1",
      itemId: "item-1",
      repairRevisionId: "rev-2",
    },
    c3rJourney: {
      journeyId: "journey-1",
      itemId: "item-1",
      repairRevisionId: "rev-2",
    },
    d1ReviewUnits: [{
      reviewUnitId: "d1-1",
      journeyId: "journey-1",
      itemId: "item-1",
      dueKind: "D1",
      assistanceClass: "NONE",
      learnerVisible: true,
      requiresUnaidedAttempt: true,
    }],
  };
}

function bank(bankClass) {
  return {
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    bankClass,
    candidateId: `candidate-${bankClass}`,
    familyId: "family-1",
    rightsVerified: true,
    sourceCurrent: true,
    releaseChainComplete: true,
    unseenEligibilitySnapshotSealed: true,
    nonSameSurfaceAsSource: true,
    familyIsolated: true,
    calibrationState:
      bankClass === "MEASUREMENT"
        ? "MEASUREMENT_CALIBRATED"
        : bankClass === "VERIFIED_TRANSFER"
          ? "TRANSFER_VERIFIED"
          : "UNASSESSED",
    timedProtocolBound: bankClass === "MEASUREMENT",
  };
}

test("assistance never becomes independent evidence", () => {
  assert.equal(
    classifyAssistanceV1("NONE").independentAttemptEligible,
    true,
  );
  for (const value of [
    "MINIMAL_HINT",
    "GUIDED_EXPLANATION",
    "EASY_EXPLANATION",
    "FULL_SOLUTION_REVEALED",
    "DIRECT_ANSWER_REVEALED",
  ]) {
    const decision = classifyAssistanceV1(value);
    assert.equal(decision.independentAttemptEligible, false);
    assert.equal(decision.sameItemMasteryGainAllowed, false);
    assert.equal(decision.transferEvidenceEligible, false);
    assert.equal(decision.requiresDistinctUnaidedAttempt, true);
  }
});

test("APP-1 H0 binds exactly one visible unaided D+1 unit", () => {
  assert.equal(
    assertApp1C3rHandoffH0V1(handoff()).outcome,
    "APP1_C3R_HANDOFF_H0_VALID",
  );

  const duplicate = handoff();
  duplicate.d1ReviewUnits.push({
    ...duplicate.d1ReviewUnits[0],
    reviewUnitId: "d1-2",
  });
  assertCode(
    () => assertApp1C3rHandoffH0V1(duplicate),
    "H0_EXACTLY_ONE_D1_REVIEW_UNIT_REQUIRED",
  );

  const aided = handoff();
  aided.d1ReviewUnits[0].assistanceClass = "MINIMAL_HINT";
  assertCode(
    () => assertApp1C3rHandoffH0V1(aided),
    "H0_UNAIDED_CHECK_REQUIRED",
  );
});

test("three-bank admission fails closed", () => {
  assert.equal(
    admitQuestionToBankV1(bank("LEARNING_PRACTICE")).learnerUse,
    "LEARNING_ONLY",
  );
  assert.equal(
    admitQuestionToBankV1(bank("VERIFIED_TRANSFER")).learnerUse,
    "VERIFIED_TRANSFER",
  );
  assert.equal(
    admitQuestionToBankV1(bank("MEASUREMENT")).learnerUse,
    "MEASUREMENT",
  );

  const exposed = bank("VERIFIED_TRANSFER");
  exposed.unseenEligibilitySnapshotSealed = false;
  assertCode(
    () => admitQuestionToBankV1(exposed),
    "BANK_UNSEEN_SNAPSHOT_REQUIRED",
  );

  const uncalibrated = bank("MEASUREMENT");
  uncalibrated.calibrationState = "TRANSFER_VERIFIED";
  assertCode(
    () => admitQuestionToBankV1(uncalibrated),
    "BANK_MEASUREMENT_CALIBRATION_REQUIRED",
  );
});

test("checkpoint contains only completed appraiser-second-stage Wave 1 nodes", () => {
  const checkpoint = JSON.parse(fs.readFileSync(
    path.join(
      root,
      "docs/exec-plans/active/core-blitz-wave1-checkpoint.json",
    ),
    "utf8",
  ));
  const contract = JSON.parse(fs.readFileSync(
    path.join(root, "config/dabangil-core-blitz-wave1-v1.json"),
    "utf8",
  ));
  const decisionSource = fs.readFileSync(
    path.join(
      root,
      "docs/decisions/2026-09-03-owner-core-blitz-wave1-standing-authority.md",
    ),
    "utf8",
  );
  const decision = resumeCoreBlitzCheckpointV1(
    checkpoint,
    checkpoint.scopeDigest,
    CORE_BLITZ_STARTING_MAIN,
    CORE_BLITZ_STARTING_TREE,
  );
  assert.deepEqual(decision.readyNodeIds, []);
  assert.equal(decision.terminal, true);
  assert.equal(
    checkpoint.scopeDigest,
    "sha256:" +
      crypto.createHash("sha256").update(decisionSource).digest("hex"),
  );
  assert.equal(
    checkpoint.nodes.find(
      (node) =>
        node.nodeId === "APP1_AUTHENTICATED_C3R_PERSISTENCE_ACCEPTANCE",
    )?.state,
    "COMPLETE",
  );
  assert.equal(
    contract.startingAuthority.mainSha,
    CORE_BLITZ_STARTING_MAIN,
  );
  assert.equal(
    contract.startingAuthority.mainTree,
    CORE_BLITZ_STARTING_TREE,
  );
  assert.equal(contract.activationBoundary.production, false);
  assert.equal(checkpoint.integration.pullRequest, 882);
  assert.equal(
    checkpoint.integration.identityAuthority,
    "GITHUB_LIVE_PR_REF",
  );
  assert.equal(contract.activeLanes.length, 3);
  assert.equal(
    contract.activeLanes.some(
      (lane) =>
        lane.laneId === "SEVEN_EXAM_PRE_T0_SOURCE" ||
        lane.remainingTarget ===
          "SEVEN_EXAM_DOSSIER_AND_SOURCE_PREPARATION",
    ),
    false,
  );
  assert.equal(contract.parkedMilestones.sevenExams.activeLane, false);
  assert.equal(contract.parkedMilestones.sevenExams.activeNode, false);
  assert.equal(
    contract.parkedMilestones.sevenExams.completionGateForPr882,
    false,
  );
  assert.deepEqual(
    contract.parkedMilestones.sevenExams.resumeOnlyAfter,
    [
      "APPRAISER_SECOND_STAGE_MAINSTREAM_COMPLETE",
      "APPRAISER_FIRST_STAGE_FIVE_SUBJECT_COMPLETE",
      "APPRAISER_FIRST_SECOND_STAGE_CONNECTION_COMPLETE",
    ],
  );
  assert.equal(
    contract.parkedMilestones.appraiserFirstStage
      .subjectAdaptersStartedInPr882,
    false,
  );
  for (const removed of [
    "config/dabangil-seven-exam-pre-t0-v1.json",
    "config/dabangil-seven-exam-pre-t0-packets-v1.json",
    "lib/exam-cells/pre-t0.ts",
    "tests/seven-exam-pre-t0-packets.test.mjs",
  ]) {
    assert.equal(fs.existsSync(path.join(root, removed)), false);
    assert.equal(contract.ownedPathsExactly.includes(removed), false);
  }
});

test("metadata and boolean boundaries reject casing and truthy bypasses", () => {
  const raw = handoff();
  raw.app1Receipt.AnswerBody = "forbidden";
  assertCode(
    () => assertApp1C3rHandoffH0V1(raw),
    "RAW_BODY_FORBIDDEN",
  );

  const visibleString = handoff();
  visibleString.d1ReviewUnits[0].learnerVisible = "true";
  assertCode(
    () => assertApp1C3rHandoffH0V1(visibleString),
    "INVALID_INPUT",
  );

  const rightsString = bank("LEARNING_PRACTICE");
  rightsString.rightsVerified = 1;
  assertCode(
    () => admitQuestionToBankV1(rightsString),
    "INVALID_INPUT",
  );

  const malformedId = handoff();
  malformedId.app1Receipt.receiptId = " app1-1 ";
  assertCode(
    () => assertApp1C3rHandoffH0V1(malformedId),
    "INVALID_INPUT",
  );
});

test("checkpoint rejects duplicate dependency declarations and cycles", () => {
  const checkpoint = JSON.parse(fs.readFileSync(
    path.join(
      root,
      "docs/exec-plans/active/core-blitz-wave1-checkpoint.json",
    ),
    "utf8",
  ));

  const duplicate = structuredClone(checkpoint);
  duplicate.nodes[1].dependencies.push(
    duplicate.nodes[1].dependencies[0],
  );
  assertCode(
    () => resumeCoreBlitzCheckpointV1(
      duplicate,
      duplicate.scopeDigest,
      CORE_BLITZ_STARTING_MAIN,
      CORE_BLITZ_STARTING_TREE,
    ),
    "CHECKPOINT_DUPLICATE_DEPENDENCY",
  );

  const cycle = structuredClone(checkpoint);
  cycle.nodes[0].dependencies = [
    "APP1_AUTHENTICATED_C3R_PERSISTENCE_ACCEPTANCE",
  ];
  assertCode(
    () => resumeCoreBlitzCheckpointV1(
      cycle,
      cycle.scopeDigest,
      CORE_BLITZ_STARTING_MAIN,
      CORE_BLITZ_STARTING_TREE,
    ),
    "CHECKPOINT_CYCLE",
  );
});
