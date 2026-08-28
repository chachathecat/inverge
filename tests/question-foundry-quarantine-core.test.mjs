import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertQf0SourceOnlyBoundaryV1,
  constructQuarantinedQuestionCandidateV1,
  createBodylessBankScarcityEventV1,
  createModelExecutionIdentityV1,
  createRightsManifestRefV1,
  createSourceEligibilityDecisionV1,
  deriveBodylessBankScarcityEventIdV1,
  deriveQuarantinedQuestionCandidateIdV1,
  digestDeterministicQf0ValueV1,
  validateQuarantinedQuestionCandidateV1,
} from "../lib/question-foundry/quarantine-core.ts";
import {
  QF0_CANDIDATE_LIFECYCLES,
  QF0_CONTRACT_VERSION,
  QF0_SOURCE_CLASSES,
} from "../lib/question-foundry/quarantine-contracts.ts";

const ROOT = new URL("../", import.meta.url);
const POLICY = "qf0-policy-v1";
const NOW = "2026-08-28T03:00:00.000Z";
const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;

function rights(sourceClass = "INVERGE_ORIGINAL", status = "ACTIVE") {
  return createRightsManifestRefV1({
    manifestId: `rights-${sourceClass.toLowerCase()}`,
    manifestVersionId: "v1",
    sourceClass,
    status,
    permittedPurpose: "QUARANTINED_CANDIDATE_CREATION",
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-09-01T00:00:00.000Z",
    policyVersion: POLICY,
  });
}

function decision(sourceClass = "INVERGE_ORIGINAL", manifest = rights(sourceClass)) {
  return createSourceEligibilityDecisionV1({
    sourceClass,
    decisionStatus: "CURRENT",
    evaluatedAt: NOW,
    policyVersion: POLICY,
    rightsManifestRef: manifest,
  });
}

function execution(role = "GENERATOR", executionId = "execution-generator-1") {
  return createModelExecutionIdentityV1({
    role,
    providerId: "offline-provider-fixture",
    modelId: "model-fixture",
    modelVersion: "2026-08-28",
    modelArtifactDigest: DIGEST_A,
    executionId,
    executionArtifactDigest: DIGEST_B,
    configurationDigest: DIGEST_C,
    executedAt: NOW,
  });
}

function candidateInput(overrides = {}) {
  const candidateContent = overrides.candidateContent ?? {
    stem: "Synthetic original quarantine fixture",
    options: ["A", "B", "C", "D"],
  };
  const base = {
    lifecycle: "QUARANTINED",
    candidateContent,
    contentDigest: digestDeterministicQf0ValueV1(candidateContent),
    blueprintRef: {
      blueprintId: "blueprint-original-1",
      blueprintVersion: "v1",
      blueprintDigest: DIGEST_A,
    },
    answerSpecificationDigest: DIGEST_B,
    sourceEligibilityDecision: decision(),
    generatorExecutionIdentity: execution(),
    independentExecutionIdentities: [],
    validatorProfileRefs: [
      {
        validatorProfileId: "validator-profile-deterministic",
        validatorProfileVersion: "v1",
        validatorProfileDigest: DIGEST_C,
      },
    ],
    createdAt: NOW,
    policyVersion: POLICY,
    ...overrides,
  };
  return {
    ...base,
    candidateId: deriveQuarantinedQuestionCandidateIdV1(base),
  };
}

function scarcityInput(overrides = {}) {
  const base = {
    examPackageRef: "appraiser-first-stage-2027",
    subjectRef: "accounting",
    skillConceptRef: "inventory-cost-flow",
    problemFamilyRef: "single-best-answer-calculation",
    requestedDifficultyBand: "medium",
    requestedTaskProfile: "timed-mcq",
    capacityShortageCount: 12,
    policyVersion: POLICY,
    occurredAt: NOW,
    ...overrides,
  };
  return {
    ...base,
    eventId: deriveBodylessBankScarcityEventIdV1(base),
  };
}

test("QF0-CONTRACT-001 fixes the exact source, lifecycle, and six-path envelope", async () => {
  const contract = JSON.parse(
    await readFile(
      new URL("config/dabangil-question-foundry-quarantine-core-v1.json", ROOT),
      "utf8",
    ),
  );
  assert.equal(contract.contractVersion, QF0_CONTRACT_VERSION);
  assert.deepEqual(contract.contractsExactly, [
    "SourceEligibilityDecisionV1",
    "RightsManifestRefV1",
    "ModelExecutionIdentityV1",
    "QuarantinedQuestionCandidateV1",
    "QuestionCandidateLifecycleV1",
    "BodylessBankScarcityEventV1",
  ]);
  assert.deepEqual(contract.sourcePolicy.sourceClassesExactly, [...QF0_SOURCE_CLASSES]);
  assert.deepEqual(contract.quarantine.lifecyclesExactly, [...QF0_CANDIDATE_LIFECYCLES]);
  assert.equal(contract.quarantine.releasableLifecycleCount, 0);
  assert.deepEqual(contract.ownedPathsExactly, [
    "docs/product/dabangil-question-foundry-quarantine-core-v1.md",
    "config/dabangil-question-foundry-quarantine-core-v1.json",
    "docs/qa/dabangil-question-foundry-quarantine-core-validation.md",
    "lib/question-foundry/quarantine-contracts.ts",
    "lib/question-foundry/quarantine-core.ts",
    "tests/question-foundry-quarantine-core.test.mjs",
  ]);
  assert.equal(contract.testRegistration.sharedRunnerModified, false);
  assert.equal(
    Object.values(contract.authorizationBoundary).every((allowed) => allowed === false),
    true,
  );
});

test("QF0-QUARANTINE-002 keeps every eligible candidate quarantined", () => {
  for (const sourceClass of [
    "INVERGE_ORIGINAL",
    "RIGHTS_CLEARED_OFFICIAL",
    "CONTRACTED_EXPERT_ORIGINAL",
    "CLEARED_DETERMINISTIC_TEMPLATE",
  ]) {
    const sourceEligibilityDecision = decision(sourceClass);
    const candidate = constructQuarantinedQuestionCandidateV1(
      candidateInput({ sourceEligibilityDecision }),
    );
    assert.equal(candidate.lifecycle, "QUARANTINED", sourceClass);
    assert.equal(candidate.releaseStatus, null, sourceClass);
    assert.equal(candidate.learnerAssignment, null, sourceClass);
    assert.equal(candidate.bankAssignment, null, sourceClass);
    assert.deepEqual(validateQuarantinedQuestionCandidateV1(candidate), candidate);
  }
});

test("QF0-QUARANTINE-003 rejects caller-provided release state or assignment", () => {
  for (const hostile of [
    { ...candidateInput(), lifecycle: "PERSONAL_LEARNING_USABLE" },
    { ...candidateInput(), releaseStatus: "PERSONAL_LEARNING_USABLE" },
    { ...candidateInput(), learnerAssignment: "learner-1" },
    { ...candidateInput(), bankAssignment: "shared-bank" },
  ]) {
    assert.throws(() => constructQuarantinedQuestionCandidateV1(hostile));
  }
});

test("QF0-RIGHTS-004 fails on missing, stale, disputed, or blocked rights", () => {
  const missing = createSourceEligibilityDecisionV1({
    sourceClass: "INVERGE_ORIGINAL",
    decisionStatus: "CURRENT",
    evaluatedAt: NOW,
    policyVersion: POLICY,
    rightsManifestRef: null,
  });
  assert.equal(missing.outcome, "DENIED");
  assert.throws(() => candidateInput({ sourceEligibilityDecision: missing }));

  for (const status of ["STALE", "DISPUTED", "BLOCKED", "REVOKED", "EXPIRED"]) {
    const denied = decision("INVERGE_ORIGINAL", rights("INVERGE_ORIGINAL", status));
    assert.equal(denied.outcome, "DENIED", status);
    assert.throws(() => candidateInput({ sourceEligibilityDecision: denied }), status);
  }

  for (const decisionStatus of ["STALE", "DISPUTED", "BLOCKED"]) {
    const denied = createSourceEligibilityDecisionV1({
      sourceClass: "INVERGE_ORIGINAL",
      decisionStatus,
      evaluatedAt: NOW,
      policyVersion: POLICY,
      rightsManifestRef: rights(),
    });
    assert.equal(denied.outcome, "DENIED", decisionStatus);
    assert.throws(() => candidateInput({ sourceEligibilityDecision: denied }), decisionStatus);
  }
});

test("QF0-RIGHTS-005 fails on source, policy, and validity mismatches", () => {
  const hostileDecisions = [
    createSourceEligibilityDecisionV1({
      sourceClass: "INVERGE_ORIGINAL",
      decisionStatus: "CURRENT",
      evaluatedAt: NOW,
      policyVersion: POLICY,
      rightsManifestRef: rights("RIGHTS_CLEARED_OFFICIAL"),
    }),
    createSourceEligibilityDecisionV1({
      sourceClass: "INVERGE_ORIGINAL",
      decisionStatus: "CURRENT",
      evaluatedAt: NOW,
      policyVersion: "different-policy",
      rightsManifestRef: rights(),
    }),
    createSourceEligibilityDecisionV1({
      sourceClass: "INVERGE_ORIGINAL",
      decisionStatus: "CURRENT",
      evaluatedAt: "2026-09-02T00:00:00.000Z",
      policyVersion: POLICY,
      rightsManifestRef: rights(),
    }),
  ];
  for (const denied of hostileDecisions) {
    assert.equal(denied.outcome, "DENIED");
    assert.throws(() => candidateInput({ sourceEligibilityDecision: denied }));
  }
});

test("QF0-RIGHTS-006 isolates private learner and commercial academy sources", () => {
  for (const sourceClass of ["USER_PRIVATE_ONLY", "ACADEMY_OR_COMMERCIAL_TEXTBOOK"]) {
    const denied = decision(sourceClass);
    assert.equal(denied.outcome, "DENIED", sourceClass);
    assert.equal(denied.sharedBlueprintEligible, false, sourceClass);
    assert.equal(denied.sharedBankEligible, false, sourceClass);
    assert.equal(denied.modelTrainingEligible, false, sourceClass);
    assert.equal(denied.crossUserReuseEligible, false, sourceClass);
    assert.throws(() => candidateInput({ sourceEligibilityDecision: denied }), sourceClass);
  }
});

test("QF0-RIGHTS-007 denies unknown and blocked sources from generation", () => {
  for (const sourceClass of ["RIGHTS_UNKNOWN", "BLOCKED"]) {
    const denied = createSourceEligibilityDecisionV1({
      sourceClass,
      decisionStatus: "CURRENT",
      evaluatedAt: NOW,
      policyVersion: POLICY,
      rightsManifestRef: null,
    });
    assert.equal(denied.generationEligible, false, sourceClass);
    assert.equal(denied.quarantinedCandidateEligible, false, sourceClass);
    assert.throws(() => candidateInput({ sourceEligibilityDecision: denied }), sourceClass);
  }
});

test("QF0-SOLUTION-008 requires the complete solution-first identity graph", () => {
  for (const field of [
    "candidateId",
    "contentDigest",
    "answerSpecificationDigest",
    "blueprintRef",
    "sourceEligibilityDecision",
    "generatorExecutionIdentity",
    "validatorProfileRefs",
    "createdAt",
    "policyVersion",
  ]) {
    const hostile = candidateInput();
    delete hostile[field];
    assert.throws(
      () => constructQuarantinedQuestionCandidateV1(hostile),
      `missing ${field}`,
    );
  }
  assert.throws(() => candidateInput({ validatorProfileRefs: [] }));
});

test("QF0-MODEL-009 prevents generator self-approval identity", () => {
  const generator = execution("GENERATOR", "same-execution");
  const judgeWithSameExecution = execution("JUDGE", "same-execution");
  assert.throws(() =>
    candidateInput({
      generatorExecutionIdentity: generator,
      independentExecutionIdentities: [judgeWithSameExecution],
    }),
  );
  const independentJudge = execution("JUDGE", "judge-execution-2");
  const candidate = constructQuarantinedQuestionCandidateV1(
    candidateInput({ independentExecutionIdentities: [independentJudge] }),
  );
  assert.equal(candidate.independentExecutionIdentities[0].role, "JUDGE");
});

test("QF0-DIGEST-010 fails closed on content, rights, source, model, or candidate mismatch", () => {
  assert.throws(() => candidateInput({ contentDigest: DIGEST_A }));

  const changedRights = structuredClone(decision());
  changedRights.rightsManifestRef.manifestDigest = DIGEST_A;
  assert.throws(() => candidateInput({ sourceEligibilityDecision: changedRights }));

  const changedDecision = structuredClone(decision());
  changedDecision.decisionDigest = DIGEST_A;
  assert.throws(() => candidateInput({ sourceEligibilityDecision: changedDecision }));

  const changedGenerator = structuredClone(execution());
  changedGenerator.identityDigest = DIGEST_A;
  assert.throws(() => candidateInput({ generatorExecutionIdentity: changedGenerator }));

  assert.throws(() =>
    constructQuarantinedQuestionCandidateV1({
      ...candidateInput(),
      candidateId: "qf0_candidate_wrong",
    }),
  );
});

test("QF0-IDENTITY-011 is deterministic for the same input and policy", () => {
  const first = constructQuarantinedQuestionCandidateV1(candidateInput());
  const second = constructQuarantinedQuestionCandidateV1(candidateInput());
  assert.equal(first.candidateId, second.candidateId);
  assert.equal(first.candidateChecksum, second.candidateChecksum);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.blueprintRef), true);
});

test("QF0-SCARCITY-012 creates bounded bodyless metadata only", () => {
  const input = scarcityInput();
  const event = createBodylessBankScarcityEventV1(input);
  assert.deepEqual(Object.keys(event).sort(), [
    "capacityShortageCount",
    "contractVersion",
    "eventChecksum",
    "eventId",
    "examPackageRef",
    "occurredAt",
    "policyVersion",
    "problemFamilyRef",
    "requestedDifficultyBand",
    "requestedTaskProfile",
    "skillConceptRef",
    "subjectRef",
  ]);
  const identityInput = structuredClone(input);
  delete identityInput.eventId;
  assert.equal(event.eventId, deriveBodylessBankScarcityEventIdV1(identityInput));
});

test("QF0-SCARCITY-013 rejects raw source, answer, OCR, and learner identity", () => {
  for (const forbidden of [
    "rawProblemBody",
    "rawAnswer",
    "ocrText",
    "learnerText",
    "textbookContent",
    "sourceExcerpt",
    "providerPrompt",
    "providerResponse",
    "learnerIdentity",
    "accountIdentifier",
    "rawSourceText",
  ]) {
    const hostile = scarcityInput();
    hostile[forbidden] = "must-not-enter";
    assert.throws(() => createBodylessBankScarcityEventV1(hostile), forbidden);
  }
});

test("QF0-LIFECYCLE-014 exposes no releasable lifecycle", async () => {
  const contract = JSON.parse(
    await readFile(
      new URL("config/dabangil-question-foundry-quarantine-core-v1.json", ROOT),
      "utf8",
    ),
  );
  assert.deepEqual([...QF0_CANDIDATE_LIFECYCLES], ["QUARANTINED", "REJECTED"]);
  for (const forbidden of [
    "PERSONAL_LEARNING_USABLE",
    "TRANSFER_VERIFIED",
    "CALIBRATION_PILOT",
    "MEASUREMENT_CALIBRATED",
  ]) {
    assert.equal(QF0_CANDIDATE_LIFECYCLES.includes(forbidden), false, forbidden);
    assert.equal(contract.quarantine.lifecyclesExactly.includes(forbidden), false, forbidden);
  }
});

test("QF0-BOUNDARY-015 has no network, provider execution, database, or remote path", async () => {
  assert.deepEqual(assertQf0SourceOnlyBoundaryV1(), {
    contractVersion: QF0_CONTRACT_VERSION,
    network: false,
    providerExecution: false,
    database: false,
    persistence: false,
    release: false,
    learnerAssignment: false,
    bankAssignment: false,
  });
  const [contractsSource, coreSource] = await Promise.all([
    readFile(new URL("lib/question-foundry/quarantine-contracts.ts", ROOT), "utf8"),
    readFile(new URL("lib/question-foundry/quarantine-core.ts", ROOT), "utf8"),
  ]);
  const imports = [...coreSource.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(imports, ["node:crypto", "./quarantine-contracts"]);
  for (const source of [contractsSource, coreSource]) {
    assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\/|@supabase|\bstripe\b|\baxios\b|\bprisma\b/i);
  }
});
