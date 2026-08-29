import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as qf0a1 from "../lib/question-foundry/quarantine/bounded-canonical-json.ts";
import * as qf0a2 from "../lib/question-foundry/quarantine/trust-core.ts";
import * as qf0iContracts from "../lib/question-foundry/quarantine/candidate-contracts.ts";
import * as qf0iCore from "../lib/question-foundry/quarantine/candidate-core.ts";
import * as contracts from "../lib/question-foundry/audit/prelude-contracts.ts";
import * as core from "../lib/question-foundry/audit/prelude-core.ts";
import { QF0A2_PURPOSE } from "../lib/question-foundry/quarantine/trust-contracts.ts";
import { createOpaqueRegistryRefV1 } from "../lib/question-foundry/quarantine/scarcity-core.ts";

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2";
const BASE_TREE = "9ad60b9ece4931d7172cdc0462e079ed8d9a53fa";
const CONFIG_PATH = "config/dabangil-qf-s2-candidate-audit-prelude-v1.json";
const EXPECTED_CONFIG_DIGEST =
  "0b5a09e876ded31d48f73e9efbee6cd6e96a8b5d9981345c872772cc1107e6ec";

const EXACT_PATHS = [
  "docs/product/dabangil-qf-s2-candidate-audit-prelude-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-qf-s2-candidate-audit-prelude-validation.md",
  "lib/question-foundry/audit/prelude-contracts.ts",
  "lib/question-foundry/audit/prelude-core.ts",
  "tests/qf-s2-candidate-audit-prelude.test.mjs",
];

const QF0_PATHS = [
  "docs/product/dabangil-question-foundry-quarantine-core-v1.md",
  "config/dabangil-question-foundry-quarantine-core-v1.json",
  "docs/qa/dabangil-question-foundry-quarantine-core-validation.md",
  "lib/question-foundry/quarantine/candidate-contracts.ts",
  "lib/question-foundry/quarantine/candidate-core.ts",
  "tests/question-foundry-quarantine-core.test.mjs",
];

const PRELUDE_FIELDS = [
  "contractVersion", "preludeId", "preludeDigest", "candidateId",
  "candidateDigest", "qf0DependencyDigest", "actors", "steps",
  "startedAt", "completedAt",
];
const STEP_FIELDS = [
  "stepId", "kind", "actorRefId", "occurredAt", "evidenceDigest",
  "dependsOnStepIds", "dependencyOutputDigests", "stepDigest",
];

function read(path, encoding = "utf8") {
  return readFileSync(new URL(path, ROOT_URL), encoding);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function changedPaths() {
  const commands = [
    ["diff", "--name-only", `${BASE_SHA}...HEAD`],
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  const paths = new Set();
  for (const arguments_ of commands) {
    const result = spawnSync("git", arguments_, { cwd: ROOT_PATH, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    for (const path of result.stdout.split(/\r?\n/u).filter(Boolean)) paths.add(path);
  }
  return [...paths].sort();
}

function gitPathObjects(reference, paths) {
  return paths.map((path) => {
    const result = spawnSync("git", ["ls-tree", reference, "--", path], {
      cwd: ROOT_PATH,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)\r?\n?$/u.exec(result.stdout);
    assert.ok(match, path);
    return { path: match[4], mode: match[1], type: match[2], objectId: match[3] };
  });
}

function refMaterial(refKind, token, overrides = {}) {
  return {
    contractVersion: "OpaqueRegistryRefV1",
    refKind,
    registryId: `reg_${token.repeat(32)}`,
    objectId: `obj_${token.repeat(32)}`,
    version: 1,
    objectDigest: digest(token),
    ...overrides,
  };
}

function rightsMaterial() {
  return {
    contractVersion: "RightsManifestRefV1",
    manifestId: `rm_${"1".repeat(32)}`,
    manifestVersionId: `rmv_${"2".repeat(32)}`,
    sourceClass: "INVERGE_ORIGINAL",
    status: "ACTIVE",
    permittedPurpose: QF0A2_PURPOSE,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.999Z",
    policyVersion: "policy.qfs2.v1",
    policyDigest: digest("a"),
  };
}

function modelMaterial(role, token, executedAt) {
  const executionToken =
    token.length === 1 ? token.repeat(32) : token.padStart(32, "0");
  return {
    contractVersion: "ModelExecutionIdentityV1",
    role,
    providerId: "provider.openai",
    modelId: "model.reasoning-v1",
    modelVersion: "2026-08-29",
    modelArtifactDigest: digest("b"),
    executionId: `exec_${executionToken}`,
    executionArtifactDigest: `sha256:${sha256(token)}`,
    configurationDigest: digest("c"),
    executedAt,
  };
}

function createCandidate(options = {}) {
  const rights = qf0a2.createRightsManifestRefV1(rightsMaterial());
  const sourceDecision = qf0a2.createSourceEligibilityDecisionV1({
    contractVersion: "SourceEligibilityDecisionV1",
    sourceClass: rights.sourceClass,
    purpose: QF0A2_PURPOSE,
    decisionStatus: "CURRENT",
    evaluatedAt: options.sourceEvaluatedAt ?? "2026-02-01T00:00:00.000Z",
    rightsManifest: rights,
    policyVersion: rights.policyVersion,
    policyDigest: rights.policyDigest,
    policyValidFrom: "2026-01-15T00:00:00.000Z",
    policyValidUntil: "2026-11-30T23:59:59.999Z",
  });
  const generatorAt = options.generatorAt ?? "2026-06-01T10:00:00.000Z";
  const generatorExecution = qf0a2.createModelExecutionIdentityV1(
    modelMaterial("GENERATOR", "3", generatorAt),
  );
  const independentMaterials = options.independentMaterials ?? [
    modelMaterial("BLIND_SOLVER", "4", "2026-06-01T11:00:00.000Z"),
    modelMaterial("JUDGE", "5", "2026-06-01T12:00:00.000Z"),
  ];
  const independentExecutions = independentMaterials.map((material) =>
    qf0a2.createModelExecutionIdentityV1(material),
  );
  const policyRef = createOpaqueRegistryRefV1(
    refMaterial("POLICY", "a", { objectDigest: sourceDecision.policyDigest }),
  );
  return qf0iCore.createQuarantinedQuestionCandidateV1({
    contractVersion: "QuarantinedQuestionCandidateV1",
    candidateContentDigest: digest("d"),
    blueprintRef: createOpaqueRegistryRefV1(refMaterial("BLUEPRINT", "6")),
    answerSpecificationRef: createOpaqueRegistryRefV1(
      refMaterial("ANSWER_SPECIFICATION", "7"),
    ),
    validatorProfileRefs: [
      createOpaqueRegistryRefV1(refMaterial("VALIDATOR_PROFILE", "8")),
    ],
    policyRef,
    sourceDecision,
    rightsManifestAtUse: rights,
    generatorExecution,
    independentExecutions,
    createdAt: options.createdAt ?? "2026-06-01T13:00:00.000Z",
  });
}

function findStep(prelude, kind) {
  return prelude.steps.find((step) => step.kind === kind);
}

function createPreludeInLocale(candidate, locale) {
  const script = `
    import { createCandidateAuditPreludeV1 } from "./lib/question-foundry/audit/prelude-core.ts";
    const candidate = JSON.parse(process.env.QFS2_CANDIDATE_JSON);
    process.stdout.write(JSON.stringify(createCandidateAuditPreludeV1(candidate)));
  `;
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      "./tests/ts-extension-loader.mjs",
      "--input-type=module",
      "--eval",
      script,
    ],
    {
      cwd: ROOT_PATH,
      encoding: "utf8",
      env: {
        ...process.env,
        LANG: locale,
        LC_ALL: locale,
        QFS2_CANDIDATE_JSON: JSON.stringify(candidate),
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("QFS2-SCOPE-001 binds Issue #868, exact base, and exactly six paths", () => {
  const text = read(CONFIG_PATH);
  const config = JSON.parse(text);
  assert.equal(config.stage, "QF-S2");
  assert.equal(config.tracking.closesIssue, 868);
  assert.deepEqual(
    [config.tracking.questionFoundryProgram, config.tracking.cognitiveProductReference],
    [811, 714],
  );
  assert.deepEqual(config.base, { sha: BASE_SHA, tree: BASE_TREE });
  assert.deepEqual(config.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(sha256(text), EXPECTED_CONFIG_DIGEST);
});

test("QFS2-DEPENDENCY-002 recomputes every frozen QF-0 identity", () => {
  const dependency = JSON.parse(read(CONFIG_PATH)).qf0Dependency;
  assert.equal(
    sha256(read("config/dabangil-question-foundry-quarantine-core-v1.json", null)),
    dependency.aggregateConfigSha256,
  );
  assert.equal(
    sha256(read("lib/question-foundry/quarantine/candidate-contracts.ts", null)),
    dependency.candidateContractsSha256,
  );
  assert.equal(
    sha256(read("lib/question-foundry/quarantine/candidate-core.ts", null)),
    dependency.candidateCoreSha256,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(gitPathObjects("HEAD", QF0_PATHS)),
    dependency.sixPathIdentity,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
  assert.deepEqual(Object.keys(qf0iContracts), dependency.contractExportsExactly);
  assert.deepEqual(Object.keys(qf0iCore), dependency.coreExportsExactly);
  assert.deepEqual(
    qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly,
    dependency.publicExportsExactly,
  );
  const receipt = { ...dependency };
  delete receipt.dependencyDigest;
  delete receipt.driftDisposition;
  assert.equal(qf0a1.digestCanonicalJsonV1(receipt), dependency.dependencyDigest);
});

test("QFS2-SURFACE-003 exposes only the preferred closed runtime surface", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(Object.keys(contracts), [
    "QFS2_CONTRACT_VERSION",
    "QFS2_LIMITS",
    "QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ]);
  assert.deepEqual(Object.keys(core), [
    "assertCandidateAuditPreludeV1",
    "createCandidateAuditPreludeV1",
  ]);
  assert.deepEqual(
    contracts.QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly,
    config.publicExportsExactly,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(contracts.QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    config.sourceOnlyBoundary.receiptDigest,
  );
  assert.deepEqual(contracts.QFS2_LIMITS, {
    contractVersion: "QFS2CandidateTimeAwareAuditPreludeV1",
    maxActors: 18,
    maxSteps: 22,
    maxIndependentExecutions: qf0iContracts.QF0I_LIMITS.maxIndependentExecutions,
    callerOverride: false,
  });
});

test("QFS2-DETERMINISM-004 zero-independent candidate is deterministic", () => {
  const candidate = createCandidate({ independentMaterials: [] });
  const first = core.createCandidateAuditPreludeV1(candidate);
  const second = core.createCandidateAuditPreludeV1(candidate);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), PRELUDE_FIELDS);
  assert.equal(first.actors.length, 2);
  assert.equal(first.steps.length, 5);
  for (const step of first.steps) assert.deepEqual(Object.keys(step), STEP_FIELDS);
  assert.deepEqual(core.assertCandidateAuditPreludeV1(first, candidate), first);
});

test("QFS2-DETERMINISM-005 multiple independent identities ignore input order", () => {
  const candidate = createCandidate();
  const reversed = clone(candidate);
  reversed.independentExecutions.reverse();
  const forward = core.createCandidateAuditPreludeV1(candidate);
  const reverse = core.createCandidateAuditPreludeV1(reversed);
  assert.deepEqual(reverse, forward);
  assert.equal(
    forward.steps.filter((step) => step.kind === "INDEPENDENT_EXECUTION_IDENTITY_BOUND").length,
    2,
  );
  assert.deepEqual(createPreludeInLocale(reversed, "C"), forward);
  assert.deepEqual(createPreludeInLocale(reversed, "ko_KR.UTF-8"), forward);
});

test("QFS2-CHRONOLOGY-006 generator timestamps remain candidate-specific", () => {
  const early = createCandidate({
    generatorAt: "2026-05-15T10:00:00.000Z",
    independentMaterials: [],
  });
  const late = createCandidate({ independentMaterials: [] });
  const earlyPrelude = core.createCandidateAuditPreludeV1(early);
  const latePrelude = core.createCandidateAuditPreludeV1(late);
  assert.equal(findStep(earlyPrelude, "GENERATOR_EXECUTION_BOUND").occurredAt, early.generatorExecution.executedAt);
  assert.equal(findStep(latePrelude, "GENERATOR_EXECUTION_BOUND").occurredAt, late.generatorExecution.executedAt);
  assert.notEqual(earlyPrelude.preludeDigest, latePrelude.preludeDigest);
});

test("QFS2-CHRONOLOGY-007 has no wall-clock prelude timestamp", () => {
  const candidate = createCandidate();
  const prelude = core.createCandidateAuditPreludeV1(candidate);
  const evidenceTimes = new Set([
    candidate.sourceDecision.evaluatedAt,
    candidate.generatorExecution.executedAt,
    ...candidate.independentExecutions.map((execution) => execution.executedAt),
    candidate.createdAt,
  ]);
  assert.ok(prelude.steps.every((step) => evidenceTimes.has(step.occurredAt)));
  assert.equal(prelude.startedAt, candidate.sourceDecision.evaluatedAt);
  assert.equal(prelude.completedAt, candidate.createdAt);
  assert.doesNotMatch(read("lib/question-foundry/audit/prelude-core.ts"), /Date\.now|new Date\(\)/u);
});

test("QFS2-ORDER-008 equal-time generation rights precede generator execution", () => {
  const timestamp = "2026-06-01T10:00:00.000Z";
  const candidate = createCandidate({ generatorAt: timestamp, independentMaterials: [] });
  const kinds = core.createCandidateAuditPreludeV1(candidate).steps.map((step) => step.kind);
  assert.ok(kinds.indexOf("GENERATION_RIGHTS_REVALIDATED") < kinds.indexOf("GENERATOR_EXECUTION_BOUND"));
});

test("QFS2-ORDER-009 equal-time later phases preserve dependency order", () => {
  const timestamp = "2026-06-01T10:00:00.000Z";
  const candidate = createCandidate({
    generatorAt: timestamp,
    independentMaterials: [
      modelMaterial("BLIND_SOLVER", "4", timestamp),
      modelMaterial("JUDGE", "5", timestamp),
    ],
    createdAt: timestamp,
  });
  const kinds = core.createCandidateAuditPreludeV1(candidate).steps.map((step) => step.kind);
  const independentIndexes = kinds
    .map((kind, index) => [kind, index])
    .filter(([kind]) => kind === "INDEPENDENT_EXECUTION_IDENTITY_BOUND")
    .map(([, index]) => index);
  const materializationIndex = kinds.indexOf("MATERIALIZATION_RIGHTS_REVALIDATED");
  const quarantineIndex = kinds.indexOf("CANDIDATE_QUARANTINED");
  assert.ok(independentIndexes.every((index) => index < quarantineIndex));
  assert.ok(materializationIndex < quarantineIndex);
});

test("QFS2-CHRONOLOGY-010 independent execution before generation fails", () => {
  const candidate = createCandidate();
  const invalid = clone(candidate);
  invalid.independentExecutions[0].executedAt = "2026-06-01T09:59:59.999Z";
  assert.throws(() => core.createCandidateAuditPreludeV1(invalid), /FAIL_CLOSED/);
});

test("QFS2-CHRONOLOGY-011 independent execution after candidate creation fails", () => {
  const candidate = createCandidate();
  const invalid = clone(candidate);
  invalid.independentExecutions[0].executedAt = "2026-06-01T13:00:00.001Z";
  assert.throws(() => core.createCandidateAuditPreludeV1(invalid), /FAIL_CLOSED/);
});

test("QFS2-CHRONOLOGY-012 source decision evaluated after generation fails", () => {
  const candidate = createCandidate();
  const invalid = clone(candidate);
  invalid.sourceDecision.evaluatedAt = "2026-06-01T10:00:00.001Z";
  assert.throws(() => core.createCandidateAuditPreludeV1(invalid), /FAIL_CLOSED/);
});

test("QFS2-CHRONOLOGY-013 child earlier than predecessor fails", () => {
  const candidate = createCandidate();
  const prelude = clone(core.createCandidateAuditPreludeV1(candidate));
  findStep(prelude, "GENERATION_RIGHTS_REVALIDATED").occurredAt =
    "2026-01-31T23:59:59.999Z";
  assert.throws(() => core.assertCandidateAuditPreludeV1(prelude, candidate), /FAIL_CLOSED/);
});

test("QFS2-GRAPH-014 missing and extra dependencies fail", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  const missing = clone(baseline);
  const rights = findStep(missing, "GENERATION_RIGHTS_REVALIDATED");
  rights.dependsOnStepIds = [];
  rights.dependencyOutputDigests = [];
  assert.throws(() => core.assertCandidateAuditPreludeV1(missing, candidate), /FAIL_CLOSED/);

  const extra = clone(baseline);
  const generator = findStep(extra, "GENERATOR_EXECUTION_BOUND");
  const source = findStep(extra, "SOURCE_DECISION_BOUND");
  const pairs = [
    ...generator.dependsOnStepIds.map((stepId, index) => ({
      stepId,
      digest: generator.dependencyOutputDigests[index],
    })),
    { stepId: source.stepId, digest: source.stepDigest },
  ];
  pairs.sort((left, right) => Buffer.compare(Buffer.from(left.stepId), Buffer.from(right.stepId)));
  generator.dependsOnStepIds = pairs.map((pair) => pair.stepId);
  generator.dependencyOutputDigests = pairs.map((pair) => pair.digest);
  assert.throws(() => core.assertCandidateAuditPreludeV1(extra, candidate), /FAIL_CLOSED/);
});

test("QFS2-GRAPH-015 dependency cycles fail closed", () => {
  const candidate = createCandidate();
  const prelude = clone(core.createCandidateAuditPreludeV1(candidate));
  const source = findStep(prelude, "SOURCE_DECISION_BOUND");
  const quarantine = findStep(prelude, "CANDIDATE_QUARANTINED");
  source.dependsOnStepIds = [quarantine.stepId];
  source.dependencyOutputDigests = [quarantine.stepDigest];
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(prelude, candidate),
    /STEP_DEPENDENCY_CYCLE/,
  );
});

test("QFS2-GRAPH-016 predecessor output digests must match exactly", () => {
  const candidate = createCandidate();
  const prelude = clone(core.createCandidateAuditPreludeV1(candidate));
  findStep(prelude, "GENERATION_RIGHTS_REVALIDATED").dependencyOutputDigests[0] = digest("f");
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(prelude, candidate),
    /OUTPUT_DIGEST_MISMATCH/,
  );
});

test("QFS2-IDENTITY-017 duplicate actor and step identities fail", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  const duplicateActor = clone(baseline);
  duplicateActor.actors[1] = clone(duplicateActor.actors[0]);
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(duplicateActor, candidate),
    /ACTOR_REF_ID_DUPLICATE/,
  );

  const duplicateStep = clone(baseline);
  duplicateStep.steps[1] = clone(duplicateStep.steps[0]);
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(duplicateStep, candidate),
    /STEP_ID_DUPLICATE/,
  );
});

test("QFS2-IDENTITY-018 actor version relabeling with unchanged claims fails", () => {
  const candidate = createCandidate();
  const prelude = clone(core.createCandidateAuditPreludeV1(candidate));
  const system = prelude.actors.find((actor) => actor.kind === "SYSTEM_COMPONENT");
  system.contractVersion = "QFS2CandidateTimeAwareAuditPreludeV2";
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(prelude, candidate),
    /SYSTEM_CONTRACT_VERSION_INVALID/,
  );
});

test("QFS2-IDENTITY-019 actor artifact and identity drift fail", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  for (const field of ["modelArtifactDigest", "executionArtifactDigest", "identityDigest"]) {
    const prelude = clone(baseline);
    const model = prelude.actors.find((actor) => actor.kind === "MODEL_EXECUTION");
    model[field] = digest("f");
    assert.throws(
      () => core.assertCandidateAuditPreludeV1(prelude, candidate),
      /FAIL_CLOSED/,
      field,
    );
  }
});

test("QFS2-BINDING-020 candidate ID, digest, and evidence drift fail", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  const changedId = clone(baseline);
  changedId.candidateId = `qfc_${"f".repeat(64)}`;
  assert.throws(() => core.assertCandidateAuditPreludeV1(changedId, candidate), /FAIL_CLOSED/);
  const changedDigest = clone(baseline);
  changedDigest.candidateDigest = digest("f");
  assert.throws(() => core.assertCandidateAuditPreludeV1(changedDigest, candidate), /FAIL_CLOSED/);
  const changedEvidence = clone(baseline);
  changedEvidence.steps[0].evidenceDigest = digest("f");
  assert.throws(() => core.assertCandidateAuditPreludeV1(changedEvidence, candidate), /FAIL_CLOSED/);
});

test("QFS2-BINDING-020A role and step-order drift fail", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  const changedRole = clone(baseline);
  const model = changedRole.actors.find((actor) => actor.kind === "MODEL_EXECUTION");
  model.role = model.role === "GENERATOR" ? "JUDGE" : "GENERATOR";
  assert.throws(() => core.assertCandidateAuditPreludeV1(changedRole, candidate), /FAIL_CLOSED/);
  const changedOrder = clone(baseline);
  [changedOrder.steps[3], changedOrder.steps[4]] = [
    changedOrder.steps[4],
    changedOrder.steps[3],
  ];
  assert.throws(() => core.assertCandidateAuditPreludeV1(changedOrder, candidate), /STEP_ORDER_NONDETERMINISTIC/);
});

test("QFS2-LIMITS-020B exact inherited maximum stays within 18 actors and 22 steps", () => {
  const roles = ["BLIND_SOLVER", "JUDGE", "ADVERSARIAL_CRITIC", "META_AUDITOR"];
  const independentMaterials = Array.from({ length: 16 }, (_, index) =>
    modelMaterial(
      roles[index % roles.length],
      (index + 4).toString(16),
      "2026-06-01T11:00:00.000Z",
    ),
  );
  const candidate = createCandidate({ independentMaterials });
  const prelude = core.createCandidateAuditPreludeV1(candidate);
  assert.equal(prelude.actors.length, 18);
  assert.equal(prelude.steps.length, 21);
  assert.deepEqual(core.assertCandidateAuditPreludeV1(prelude, candidate), prelude);
});

test("QFS2-DOMAIN-021 raw, learner, provider, and unsupported fields fail", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  for (const field of [
    "problemBody",
    "answerBody",
    "ocr",
    "learnerIdentity",
    "providerRawPayload",
  ]) {
    assert.throws(
      () => core.assertCandidateAuditPreludeV1({ ...baseline, [field]: "raw" }, candidate),
      /PRELUDE_FIELD_SET_INVALID/,
      field,
    );
  }
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(new Proxy(clone(baseline), {}), candidate),
    /PROXY_UNSUPPORTED/,
  );
  const accessor = clone(baseline);
  Object.defineProperty(accessor, "startedAt", {
    enumerable: true,
    get: () => baseline.startedAt,
  });
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(accessor, candidate),
    /DATA_PROPERTY_REQUIRED/,
  );
  const symbol = clone(baseline);
  symbol[Symbol("hidden")] = true;
  assert.throws(
    () => core.assertCandidateAuditPreludeV1(symbol, candidate),
    /SYMBOL_KEY_UNSUPPORTED/,
  );
});

test("QFS2-AUTHORITY-022 forbidden authority step kinds cannot appear", () => {
  const candidate = createCandidate();
  const baseline = core.createCandidateAuditPreludeV1(candidate);
  const forbidden = [
    "SIMILARITY_REVIEWED",
    "BLIND_SOLVED",
    "JUDGED",
    "TRANSFER_VALIDATED",
    "RELEASE_DECIDED",
    "APPROVED",
    "BANK_ASSIGNED",
    "LEARNER_ASSIGNED",
  ];
  assert.ok(baseline.steps.every((step) => !forbidden.includes(step.kind)));
  for (const kind of forbidden) {
    const prelude = clone(baseline);
    prelude.steps[0].kind = kind;
    assert.throws(
      () => core.assertCandidateAuditPreludeV1(prelude, candidate),
      /STEP_KIND_INVALID/,
      kind,
    );
  }
  const boundary = contracts.QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT;
  assert.equal(boundary.releaseAuthorityAbsent, true);
  assert.equal(boundary.transferAuthorityAbsent, true);
  assert.equal(boundary.similarityAuthorityAbsent, true);
  assert.equal(boundary.learnerAssignmentAbsent, true);
  assert.equal(boundary.bankAssignmentAbsent, true);
});

test("QFS2-BOUNDARY-023 has no body, provider, network, DB, or mutation path", () => {
  const candidate = createCandidate();
  const prelude = core.createCandidateAuditPreludeV1(candidate);
  assert.doesNotMatch(
    JSON.stringify(prelude),
    /questionBody|answerBody|explanation|rubric|ocr|learner|prompt|response|providerRawPayload/iu,
  );
  const source = read("lib/question-foundry/audit/prelude-core.ts");
  assert.doesNotMatch(
    source,
    /node:https|node:http|\bfetch\s*\(|supabase|postgres|XMLHttpRequest|WebSocket/iu,
  );
  assert.doesNotMatch(source, /localeCompare|Intl\.Collator/iu);
  const boundary = contracts.QFS2_SOURCE_ONLY_BOUNDARY_RECEIPT;
  assert.equal(boundary.network, "OFF");
  assert.equal(boundary.providerExecution, "OFF");
  assert.equal(boundary.databaseAndPersistence, "OFF");
  assert.equal(boundary.remoteMutation, "ZERO");
  assert.equal(boundary.productionMutation, "ZERO");
  assert.equal(boundary.qfS3RequiredForLaterChronologyAggregation, true);
});
