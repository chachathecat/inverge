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

test("D+7 excludes exposed, same-family, and same-surface candidates", () => {
  const exposed = candidate("VERIFIED_TRANSFER", "3", { priority: 100 });
  const sameFamily = candidate("VERIFIED_TRANSFER", "4", {
    familyId: "family-source",
    priority: 90,
  });
  const eligible = candidate("VERIFIED_TRANSFER", "5", { priority: 80 });
  const result = selectQfI1BankFirstAssignmentV1(
    request("D7_TRANSFER", [exposed, sameFamily, eligible], [
      {
        candidateId: exposed.candidateId,
        familyId: exposed.familyId,
        surfaceId: exposed.surfaceId,
        occurredAt: "2026-09-02T00:00:00.000Z",
        state: "PRESENTED",
      },
    ]),
  );
  assert.equal(result.status, "ASSIGNED");
  assert.equal(result.candidateId, eligible.candidateId);
  assert.equal(result.learnerUse, "VERIFIED_TRANSFER");
  assert.equal(result.measurementClaimAllowed, false);
});

test("timed measurement requires a complete QF-S3 chronology and calibrated bank", () => {
  const valid = candidate("MEASUREMENT", "6");
  const assigned = selectQfI1BankFirstAssignmentV1(
    request("TIMED_MEASUREMENT", [valid]),
  );
  assert.equal(assigned.status, "ASSIGNED");
  assert.equal(assigned.measurementClaimAllowed, true);

  const incomplete = candidate("MEASUREMENT", "7");
  incomplete.chronology = chronology(
    incomplete.candidateId,
    incomplete.candidateDigest,
    false,
  );
  incomplete.chronologyAuthority = {
    ...incomplete.chronologyAuthority,
    chronologyDigest: incomplete.chronology.chronologyDigest,
  };
  assert.throws(
    () =>
      selectQfI1BankFirstAssignmentV1(
        request("TIMED_MEASUREMENT", [incomplete]),
      ),
    (error) =>
      error instanceof QfI1BankFirstError &&
      error.code === "CHRONOLOGY_INCOMPLETE",
  );
});
