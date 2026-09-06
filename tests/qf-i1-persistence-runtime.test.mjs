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
  assert.match(source, /\.eq\("exam_mode", scope\.examMode\)/u);
  assert.match(source, /\.eq\("subject", scope\.subject\)/u);
  assert.match(source, /row\.exam_mode === scope\.examMode/u);
  assert.match(source, /row\.subject === scope\.subject/u);
  assert.match(source, /source_type", CANDIDATE_SOURCE_TYPE/u);
  assert.match(source, /ASSIGNMENT_EVENT/u);
  assert.match(source, /PRESENTED_EVENT/u);
  assert.match(source, /sanitizeLearningSignalMetadata/u);
  assert.match(source, /assertNoRawUserDataInDerived/u);
  assert.match(source, /assertQfI1CandidateV1/u);
  assert.match(source, /authorityInputRef/u);
  assert.match(source, /authorityInputDigest/u);
  assert.match(source, /authorityInputStored: false/u);
  assert.match(source, /resolveChronologyAuthorityInput/u);
  assert.match(source, /chronology-authority-reference-unresolved/u);
  assert.match(source, /chronology-authority-input-digest-mismatch/u);
  assert.match(
    source,
    /\.eq\("metadata_json->qf_i1_candidate->>bankClass", bankClass\)/u,
  );
  assert.match(
    source,
    /\.lte\("metadata_json->qf_i1_candidate->>availableAt", input\.asOf\)/u,
  );
  assert.match(
    source,
    /\.eq\("metadata_json->>learnerScopeId", learnerScopeId\)/u,
  );
  assert.match(source, /\.range\(offset, offset \+ PAGE_SIZE - 1\)/u);
  assert.doesNotMatch(source, /\.limit\(200\)|\.limit\(500\)/u);
  const candidateBankFilter = source.indexOf(
    '.eq("metadata_json->qf_i1_candidate->>bankClass", bankClass)',
  );
  const candidateAvailabilityFilter = source.indexOf(
    '.lte("metadata_json->qf_i1_candidate->>availableAt", input.asOf)',
  );
  const candidatePage = source.indexOf(
    ".range(offset, offset + PAGE_SIZE - 1)",
    candidateAvailabilityFilter,
  );
  const learnerExposureFilter = source.indexOf(
    '.eq("metadata_json->>learnerScopeId", learnerScopeId)',
  );
  const exposurePage = source.indexOf(
    ".range(offset, offset + PAGE_SIZE - 1)",
    learnerExposureFilter,
  );
  assert.ok(candidateBankFilter >= 0);
  assert.ok(candidateBankFilter < candidateAvailabilityFilter);
  assert.ok(candidateAvailabilityFilter < candidatePage);
  assert.ok(learnerExposureFilter >= 0);
  assert.ok(learnerExposureFilter < exposurePage);
  assert.match(source, /candidate-idempotency-conflict/u);
  assert.match(source, /usage-idempotency-conflict/u);
  assert.doesNotMatch(
    source,
    /questionText|answerText|ocrText|promptText|responseBody/u,
  );
});
