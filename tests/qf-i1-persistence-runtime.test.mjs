import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  QfI1PersistenceError,
  allocateQfI1DurablyV1,
  recordQfI1PresentationV1,
} from "../lib/question-foundry/runtime/qf-i1-persistence.ts";

const root = path.resolve(import.meta.dirname, "..");

function candidate() {
  return {
    candidateId: "candidate-learning-1",
    candidateDigest: "sha256:candidate-learning-1",
    familyId: "family-2",
    surfaceId: "surface-2",
    bankClass: "LEARNING_PRACTICE",
    origin: "BANK_STOCK",
    contentAuthority: "LEARNING_ONLY",
    rightsStatus: "VERIFIED",
    sourceStatus: "CURRENT",
    releaseChainComplete: false,
    unseenEligibilitySnapshotSealed: false,
    nonSameSurfaceAsSource: false,
    familyIsolated: false,
    calibrationState: "UNASSESSED",
    timedProtocolBound: false,
    chronology: null,
    chronologyAuthority: null,
    availableAt: "2026-09-03T10:00:00.000Z",
    priority: 80,
  };
}

function request() {
  return {
    purpose: "LEARNING_PRACTICE",
    learnerScopeId: "learner-scope-1",
    sourceCandidateId: "source-candidate-1",
    sourceFamilyId: "family-1",
    sourceSurfaceId: "surface-1",
    asOf: "2026-09-03T11:00:00.000Z",
  };
}

function port({ candidates = [candidate()], assignments = [], exposures = [] } = {}) {
  return {
    async listCandidates() {
      return candidates;
    },
    async listExposures() {
      return [];
    },
    async ensureAssignment(assignment) {
      assignments.push(assignment);
      return {
        status: assignments.length === 1 ? "created" : "existing",
        value: Object.freeze({ ...assignment, durable: true }),
      };
    },
    async ensureExposure(exposure) {
      exposures.push(exposure);
      return {
        status: exposures.length === 1 ? "created" : "existing",
        value: Object.freeze({ ...exposure, durable: true }),
      };
    },
  };
}

test("QF-I1 loads bank stock and durably records the deterministic assignment", async () => {
  const assignments = [];
  const persistence = port({ assignments });
  const first = await allocateQfI1DurablyV1({
    request: request(),
    port: persistence,
  });
  assert.equal(first.outcome, "ASSIGNMENT_DURABLE");
  assert.equal(first.assignmentStatus, "created");
  assert.equal(first.assignment.durable, true);
  assert.equal(first.assignment.learnerUse, "LEARNING_ONLY");
  assert.equal(assignments.length, 1);

  const second = await allocateQfI1DurablyV1({
    request: request(),
    port: persistence,
  });
  assert.equal(second.assignmentStatus, "existing");
  assert.equal(second.assignment.assignmentId, first.assignment.assignmentId);
});

test("QF-I1 preserves generation-on-learning-gap without fabricating an assignment", async () => {
  let assignmentWrites = 0;
  const persistence = port({ candidates: [] });
  persistence.ensureAssignment = async () => {
    assignmentWrites += 1;
    throw new Error("must-not-write");
  };
  const result = await allocateQfI1DurablyV1({
    request: request(),
    port: persistence,
  });
  assert.equal(result.outcome, "GENERATION_REQUIRED");
  assert.equal(result.decision.generatedContentMaximumAuthority, "LEARNING_ONLY");
  assert.match(result.decision.generationRequestId, /^qfg_[0-9a-f]{64}$/u);
  assert.match(result.decision.retryIdentity, /^qfgr_[0-9a-f]{64}$/u);
  assert.match(result.decision.conflictIdentity, /^qfgc_[0-9a-f]{64}$/u);
  assert.equal(assignmentWrites, 0);
});

test("QF-I1 records presentation only after a durable assignment", async () => {
  const exposures = [];
  const persistence = port({ exposures });
  const allocated = await allocateQfI1DurablyV1({
    request: request(),
    port: persistence,
  });
  const first = await recordQfI1PresentationV1({
    assignment: allocated.assignment,
    occurredAt: "2026-09-03T11:05:00.000Z",
    port: persistence,
  });
  assert.equal(first.outcome, "PRESENTATION_DURABLE");
  assert.equal(first.exposureStatus, "created");
  assert.equal(first.exposure.state, "PRESENTED");
  assert.equal(first.exposure.durable, true);

  const second = await recordQfI1PresentationV1({
    assignment: allocated.assignment,
    occurredAt: "2026-09-03T11:05:00.000Z",
    port: persistence,
  });
  assert.equal(second.exposureStatus, "existing");
  assert.equal(second.exposure.exposureId, first.exposure.exposureId);
});

test("QF-I1 rejects non-durable or altered persistence receipts", async () => {
  const badAssignment = port();
  badAssignment.ensureAssignment = async (assignment) => ({
    status: "created",
    value: { ...assignment, durable: false },
  });
  await assert.rejects(
    () => allocateQfI1DurablyV1({ request: request(), port: badAssignment }),
    (error) =>
      error instanceof QfI1PersistenceError &&
      error.code === "NON_DURABLE_ASSIGNMENT",
  );

  const altered = port();
  altered.ensureAssignment = async (assignment) => ({
    status: "created",
    value: { ...assignment, candidateId: "other", durable: true },
  });
  await assert.rejects(
    () => allocateQfI1DurablyV1({ request: request(), port: altered }),
    (error) =>
      error instanceof QfI1PersistenceError &&
      error.code === "ASSIGNMENT_BINDING_CONFLICT",
  );
});

test("Review OS adapter is user-scoped, metadata-only and idempotent", () => {
  const source = fs.readFileSync(
    path.join(
      root,
      "lib/question-foundry/runtime/qf-i1-review-os-repository.ts",
    ),
    "utf8",
  );
  assert.match(source, /\.eq\("user_id", userId\)/u);
  assert.match(source, /source_type", CANDIDATE_SOURCE_TYPE/u);
  assert.match(source, /ASSIGNMENT_EVENT/u);
  assert.match(source, /PRESENTED_EVENT/u);
  assert.match(source, /sanitizeLearningSignalMetadata/u);
  assert.match(source, /assertNoRawUserDataInDerived/u);
  assert.match(source, /candidate-idempotency-conflict/u);
  assert.match(source, /usage-idempotency-conflict/u);
  assert.doesNotMatch(
    source,
    /questionText|answerText|ocrText|promptText|responseBody/u,
  );
});
