import assert from "node:assert/strict";
import test from "node:test";

import {
  QfI1BankFirstError,
  selectQfI1BankFirstAssignmentV1,
} from "../lib/question-foundry/runtime/qf-i1-bank-first.ts";

const digest = (token) => `sha256:${token.repeat(64)}`;
const chronology = (candidateId, candidateDigest, complete = true) => ({
  contractVersion: "QFS3DependencyRankedTransferChronologyV1",
  chronologyId: `qftc_${"a".repeat(64)}`,
  chronologyDigest: digest("b"),
  candidateId,
  candidateDigest,
  qfS1ReviewDigest: digest("c"),
  qfS2PreludeDigest: digest("d"),
  variantRequirementsDigest: digest("e"),
  actors: [{}],
  receipts: [{}],
  startedAt: "2026-09-01T00:00:00.000Z",
  completedAt: "2026-09-01T01:00:00.000Z",
  completeness: complete ? "COMPLETE" : "INCOMPLETE",
  blockingReasons: complete ? [] : ["MISSING_META_AUDIT"],
});

function candidate(bankClass, token, overrides = {}) {
  const candidateId = `qfc_${token.repeat(64)}`;
  const candidateDigest = digest(token);
  const qfs3 = bankClass === "LEARNING_PRACTICE"
    ? null
    : chronology(candidateId, candidateDigest);
  return {
    candidateId,
    candidateDigest,
    familyId: `family-${token}`,
    surfaceId: `surface-${token}`,
    bankClass,
    origin: "BANK_STOCK",
    contentAuthority:
      bankClass === "LEARNING_PRACTICE" ? "LEARNING_ONLY" : bankClass,
    rightsStatus: "VERIFIED",
    sourceStatus: "CURRENT",
    releaseChainComplete: bankClass !== "LEARNING_PRACTICE",
    unseenEligibilitySnapshotSealed: bankClass !== "LEARNING_PRACTICE",
    nonSameSurfaceAsSource: bankClass !== "LEARNING_PRACTICE",
    familyIsolated: bankClass !== "LEARNING_PRACTICE",
    calibrationState:
      bankClass === "MEASUREMENT"
        ? "MEASUREMENT_CALIBRATED"
        : bankClass === "VERIFIED_TRANSFER"
          ? "TRANSFER_VERIFIED"
          : "UNASSESSED",
    timedProtocolBound: bankClass === "MEASUREMENT",
    chronology: qfs3,
    chronologyAuthority: qfs3
      ? {
          validationMethod: "assertDependencyRankedTransferChronologyV1",
          chronologyDigest: qfs3.chronologyDigest,
          candidateId,
          candidateDigest,
          authorityInput: {},
        }
      : null,
    availableAt: "2026-09-01T00:00:00.000Z",
    priority: 50,
    ...overrides,
  };
}

function request(purpose, candidates, exposures = []) {
  return {
    purpose,
    learnerScopeId: "learner-scope-1",
    sourceCandidateId: `qfc_${"0".repeat(64)}`,
    sourceFamilyId: "family-source",
    sourceSurfaceId: "surface-source",
    asOf: "2026-09-03T00:00:00.000Z",
    candidates,
    exposures,
  };
}

test("bank-first assignment is deterministic and does not generate when bank has stock", () => {
  const lower = candidate("LEARNING_PRACTICE", "1", { priority: 20 });
  const higher = candidate("LEARNING_PRACTICE", "2", { priority: 90 });
  const result = selectQfI1BankFirstAssignmentV1(
    request("LEARNING_PRACTICE", [lower, higher]),
  );
  assert.equal(result.status, "ASSIGNED");
  assert.equal(result.candidateId, higher.candidateId);
  assert.equal(result.learnerUse, "LEARNING_ONLY");
  assert.equal(result.transferClaimAllowed, false);
  assert.equal(result.generationAuthorized, false);
});

test("learning gaps authorize only deterministic learning-only generation", () => {
  const first = selectQfI1BankFirstAssignmentV1(
    request("LEARNING_PRACTICE", []),
  );
  const retry = selectQfI1BankFirstAssignmentV1(
    request("LEARNING_PRACTICE", []),
  );
  assert.equal(first.status, "GENERATION_REQUIRED");
  assert.equal(first.generationAuthorized, true);
  assert.equal(first.generatedContentMaximumAuthority, "LEARNING_ONLY");
  assert.match(first.generationRequestId, /^qfg_[0-9a-f]{64}$/u);
  assert.match(first.retryIdentity, /^qfgr_[0-9a-f]{64}$/u);
  assert.match(first.conflictIdentity, /^qfgc_[0-9a-f]{64}$/u);
  assert.equal(retry.generationRequestId, first.generationRequestId);
  assert.equal(retry.retryIdentity, first.retryIdentity);
  assert.equal(retry.conflictIdentity, first.conflictIdentity);
  assert.equal(first.providerExecutionAllowed, false);
  assert.equal(first.publicLearnerActivationAllowed, false);
  assert.equal(first.rawGeneratedBodyMetadataPersistenceAllowed, false);
  assert.equal(first.verifiedTransferAdmissionAllowed, false);
  assert.equal(first.measurementAdmissionAllowed, false);
});

test("generated learning-only content cannot enter transfer or measurement banks", () => {
  for (const bankClass of ["VERIFIED_TRANSFER", "MEASUREMENT"]) {
    assert.throws(
      () =>
        selectQfI1BankFirstAssignmentV1(
          request(
            bankClass === "VERIFIED_TRANSFER"
              ? "D7_TRANSFER"
              : "TIMED_MEASUREMENT",
            [
              candidate(bankClass, bankClass === "VERIFIED_TRANSFER" ? "8" : "9", {
                origin: "GENERATED",
                contentAuthority: "LEARNING_ONLY",
              }),
            ],
          ),
        ),
      (error) =>
        error instanceof QfI1BankFirstError &&
        error.code === "GENERATED_AUTHORITY_ESCALATION",
    );
  }
});

test("transfer and measurement reject forged QF-S3 labels and actor receipts", () => {
  for (const [purpose, bankClass, token] of [
    ["D7_TRANSFER", "VERIFIED_TRANSFER", "5"],
    ["TIMED_MEASUREMENT", "MEASUREMENT", "6"],
  ]) {
    assert.throws(
      () =>
        selectQfI1BankFirstAssignmentV1(
          request(purpose, [candidate(bankClass, token)]),
        ),
      (error) =>
        error instanceof QfI1BankFirstError &&
        error.code === "CHRONOLOGY_AUTHORITY_INVALID",
    );
  }
});
