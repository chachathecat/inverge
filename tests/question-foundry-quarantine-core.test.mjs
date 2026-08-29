import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as qf0a1 from "../lib/question-foundry/quarantine/bounded-canonical-json.ts";
import * as qf0a2Contracts from "../lib/question-foundry/quarantine/trust-contracts.ts";
import * as qf0a2 from "../lib/question-foundry/quarantine/trust-core.ts";
import * as qf0bContracts from "../lib/question-foundry/quarantine/scarcity-contracts.ts";
import * as qf0b from "../lib/question-foundry/quarantine/scarcity-core.ts";
import * as contracts from "../lib/question-foundry/quarantine/candidate-contracts.ts";
import * as core from "../lib/question-foundry/quarantine/candidate-core.ts";

const {
  QF0I_CANDIDATE_LIFECYCLES,
  QF0I_CONTRACT_VERSION,
  QF0I_LIMITS,
  QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT,
} = contracts;
const {
  assertQuarantinedQuestionCandidateV1,
  createQuarantinedQuestionCandidateV1,
} = core;
const {
  QF0A2_PURPOSE,
  QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT,
} = qf0a2Contracts;
const {
  createModelExecutionIdentityV1,
  createRightsManifestRefV1,
  createSourceEligibilityDecisionV1,
} = qf0a2;
const {
  createOpaqueRegistryRefV1,
} = qf0b;

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "e42899b4c157511a71f1d8fff0fd0226a71cb0a7";
const BASE_TREE = "b4a7d5295f02bb2454b8637b8f42cbdbfc0d1844";
const CONFIG_PATH = "config/dabangil-question-foundry-quarantine-core-v1.json";
const CONTRACTS_PATH = "lib/question-foundry/quarantine/candidate-contracts.ts";
const CORE_PATH = "lib/question-foundry/quarantine/candidate-core.ts";
const EXPECTED_CONFIG_DIGEST =
  "34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993";

const EXACT_PATHS = [
  "docs/product/dabangil-question-foundry-quarantine-core-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-question-foundry-quarantine-core-validation.md",
  CONTRACTS_PATH,
  CORE_PATH,
  "tests/question-foundry-quarantine-core.test.mjs",
];

const QF0A1_PATHS = [
  "config/dabangil-qf0a1-bounded-canonical-json-v1.json",
  "docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md",
  "docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md",
  "lib/question-foundry/quarantine/bounded-canonical-json.ts",
  "tests/qf0a1-bounded-canonical-json.test.mjs",
];

const QF0A2_PATHS = [
  "config/dabangil-qf0a2-rights-time-model-identity-v1.json",
  "docs/product/dabangil-qf0a2-rights-time-model-identity-v1.md",
  "docs/qa/dabangil-qf0a2-rights-time-model-identity-validation.md",
  "lib/question-foundry/quarantine/trust-contracts.ts",
  "lib/question-foundry/quarantine/trust-core.ts",
  "tests/qf0a2-rights-time-model-identity.test.mjs",
];

const QF0B_PATHS = [
  "docs/product/dabangil-qf0b-opaque-registry-bodyless-scarcity-v1.md",
  "config/dabangil-qf0b-opaque-registry-bodyless-scarcity-v1.json",
  "docs/qa/dabangil-qf0b-opaque-registry-bodyless-scarcity-validation.md",
  "lib/question-foundry/quarantine/scarcity-contracts.ts",
  "lib/question-foundry/quarantine/scarcity-core.ts",
  "tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs",
];

const CANDIDATE_FIELDS = [
  "contractVersion",
  "candidateId",
  "candidateDigest",
  "lifecycle",
  "candidateContentDigest",
  "blueprintRef",
  "answerSpecificationRef",
  "validatorProfileRefs",
  "policyRef",
  "sourceDecision",
  "rightsManifestAtUse",
  "generatorExecution",
  "independentExecutions",
  "createdAt",
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

function reverseRecord(value) {
  return Object.fromEntries(Object.entries(value).reverse());
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

function rightsMaterial(overrides = {}) {
  return {
    contractVersion: "RightsManifestRefV1",
    manifestId: `rm_${"1".repeat(32)}`,
    manifestVersionId: `rmv_${"2".repeat(32)}`,
    sourceClass: "INVERGE_ORIGINAL",
    status: "ACTIVE",
    permittedPurpose: QF0A2_PURPOSE,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.999Z",
    policyVersion: "policy.qf0i.v1",
    policyDigest: digest("a"),
    ...overrides,
  };
}

function decisionInput(rightsManifest, overrides = {}) {
  return {
    contractVersion: "SourceEligibilityDecisionV1",
    sourceClass: rightsManifest.sourceClass,
    purpose: QF0A2_PURPOSE,
    decisionStatus: "CURRENT",
    evaluatedAt: "2026-02-01T00:00:00.000Z",
    rightsManifest,
    policyVersion: rightsManifest.policyVersion,
    policyDigest: rightsManifest.policyDigest,
    policyValidFrom: "2026-01-15T00:00:00.000Z",
    policyValidUntil: "2026-11-30T23:59:59.999Z",
    ...overrides,
  };
}

function modelMaterial(role, token, overrides = {}) {
  return {
    contractVersion: "ModelExecutionIdentityV1",
    role,
    providerId: "provider.openai",
    modelId: "model.reasoning-v1",
    modelVersion: "2026-08-29",
    modelArtifactDigest: digest("b"),
    executionId: `exec_${token.repeat(32)}`,
    executionArtifactDigest: digest(token),
    configurationDigest: digest("c"),
    executedAt: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

function createFixture(options = {}) {
  const rightsBase = rightsMaterial(options.rightsOverrides);
  const rights = createRightsManifestRefV1(rightsBase);
  const decision = createSourceEligibilityDecisionV1(
    decisionInput(rights, options.decisionOverrides),
  );
  const rightsAtUse = options.rightsAtUseOverrides
    ? createRightsManifestRefV1(
        rightsMaterial({ ...options.rightsOverrides, ...options.rightsAtUseOverrides }),
      )
    : rights;
  const generator = createModelExecutionIdentityV1(
    modelMaterial(
      options.generatorRole ?? "GENERATOR",
      "3",
      options.generatorOverrides,
    ),
  );
  const independentMaterials = options.independentMaterials ?? [
    modelMaterial("BLIND_SOLVER", "4", { executedAt: "2026-06-01T11:00:00.000Z" }),
    modelMaterial("JUDGE", "5", { executedAt: "2026-06-01T12:00:00.000Z" }),
  ];
  const independentExecutions = independentMaterials.map((material) =>
    createModelExecutionIdentityV1(material),
  );
  const blueprintRef = createOpaqueRegistryRefV1(refMaterial("BLUEPRINT", "6"));
  const answerSpecificationRef = createOpaqueRegistryRefV1(
    refMaterial("ANSWER_SPECIFICATION", "7"),
  );
  const validatorProfileRefs = [
    createOpaqueRegistryRefV1(refMaterial("VALIDATOR_PROFILE", "8")),
    createOpaqueRegistryRefV1(refMaterial("VALIDATOR_PROFILE", "9")),
  ];
  const policyRef = createOpaqueRegistryRefV1(
    refMaterial("POLICY", "a", { objectDigest: decision.policyDigest }),
  );
  const material = {
    contractVersion: "QuarantinedQuestionCandidateV1",
    candidateContentDigest: digest("d"),
    blueprintRef,
    answerSpecificationRef,
    validatorProfileRefs: Object.freeze(validatorProfileRefs),
    policyRef,
    sourceDecision: decision,
    rightsManifestAtUse: rightsAtUse,
    generatorExecution: generator,
    independentExecutions: Object.freeze(independentExecutions),
    createdAt: options.createdAt ?? "2026-06-01T13:00:00.000Z",
    ...options.materialOverrides,
  };
  return { material, rights, decision, generator, independentExecutions };
}

function trapProxy(target) {
  let traps = 0;
  const value = new Proxy(target, {
    getPrototypeOf(...arguments_) {
      traps += 1;
      return Reflect.getPrototypeOf(...arguments_);
    },
    ownKeys(...arguments_) {
      traps += 1;
      return Reflect.ownKeys(...arguments_);
    },
    getOwnPropertyDescriptor(...arguments_) {
      traps += 1;
      return Reflect.getOwnPropertyDescriptor(...arguments_);
    },
    get(...arguments_) {
      traps += 1;
      return Reflect.get(...arguments_);
    },
  });
  return { value, traps: () => traps };
}

test("QF0I-CONTRACT-001 binds issue #857, exact base, and exact six paths", () => {
  const text = read(CONFIG_PATH);
  const contract = JSON.parse(text);
  assert.equal(contract.contractVersion, "dabangil.question_foundry.quarantine_core.v1");
  assert.equal(contract.stage, "QF-0I");
  assert.equal(contract.tracking.closesIssue, 857);
  assert.deepEqual(
    [contract.tracking.questionFoundryProgram, contract.tracking.cognitiveProductReference],
    [811, 714],
  );
  assert.deepEqual(contract.tracking.completedPrerequisiteIssues, [861, 859, 864]);
  assert.deepEqual(contract.base, { sha: BASE_SHA, tree: BASE_TREE });
  assert.deepEqual(contract.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(sha256(text), EXPECTED_CONFIG_DIGEST);
});

test("QF0I-DEPENDENCY-002 recomputes the exact merged QF-0A1 identity", () => {
  const dependency = JSON.parse(read(CONFIG_PATH)).dependencies.qf0a1;
  const pathObjects = gitPathObjects("HEAD", QF0A1_PATHS);
  assert.equal(sha256(read(QF0A1_PATHS[0], null)), dependency.configSha256);
  assert.equal(sha256(read(QF0A1_PATHS[3], null)), dependency.implementationSha256);
  assert.deepEqual(pathObjects, dependency.pathObjectsExactly);
  assert.equal(qf0a1.digestCanonicalJsonV1(pathObjects), dependency.fivePathIdentity);
  assert.deepEqual(Object.keys(qf0a1), dependency.requiredExportsExactly);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
});

test("QF0I-DEPENDENCY-003 recomputes the exact merged QF-0A2 identity", () => {
  const dependency = JSON.parse(read(CONFIG_PATH)).dependencies.qf0a2;
  const pathObjects = gitPathObjects("HEAD", QF0A2_PATHS);
  assert.equal(sha256(read(QF0A2_PATHS[0], null)), dependency.configSha256);
  assert.equal(
    sha256(read(QF0A2_PATHS[3], null)),
    dependency.implementationPathDigests[QF0A2_PATHS[3]],
  );
  assert.equal(
    sha256(read(QF0A2_PATHS[4], null)),
    dependency.implementationPathDigests[QF0A2_PATHS[4]],
  );
  assert.deepEqual(pathObjects, dependency.pathObjectsExactly);
  assert.equal(qf0a1.digestCanonicalJsonV1(pathObjects), dependency.sixPathIdentity);
  assert.deepEqual(Object.keys(qf0a2Contracts), dependency.contractExportsExactly);
  assert.deepEqual(Object.keys(qf0a2), dependency.coreExportsExactly);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
});

test("QF0I-DEPENDENCY-004 recomputes the exact corrected merged QF-0B identity", () => {
  const dependency = JSON.parse(read(CONFIG_PATH)).dependencies.qf0b;
  const pathObjects = gitPathObjects("HEAD", QF0B_PATHS);
  assert.equal(sha256(read(QF0B_PATHS[1], null)), dependency.configSha256);
  assert.equal(
    sha256(read(QF0B_PATHS[3], null)),
    dependency.implementationPathDigests[QF0B_PATHS[3]],
  );
  assert.equal(
    sha256(read(QF0B_PATHS[4], null)),
    dependency.implementationPathDigests[QF0B_PATHS[4]],
  );
  assert.deepEqual(pathObjects, dependency.pathObjectsExactly);
  assert.equal(qf0a1.digestCanonicalJsonV1(pathObjects), dependency.sixPathIdentity);
  assert.deepEqual(Object.keys(qf0bContracts), dependency.contractExportsExactly);
  assert.deepEqual(Object.keys(qf0b), dependency.coreExportsExactly);
  assert.deepEqual(
    [...qf0bContracts.QF0B_REGISTRY_REF_KINDS],
    dependency.registryReferenceKindsExactly,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(
      clone(qf0bContracts.QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
});

test("QF0I-SURFACE-005 exposes only the closed quarantine construction surface", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(Object.keys(contracts), [
    "QF0I_CANDIDATE_LIFECYCLES",
    "QF0I_CONTRACT_VERSION",
    "QF0I_LIMITS",
    "QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ]);
  assert.deepEqual(Object.keys(core), [
    "assertQuarantinedQuestionCandidateV1",
    "createQuarantinedQuestionCandidateV1",
  ]);
  assert.equal(QF0I_CONTRACT_VERSION, "QF0IQuarantinedQuestionCandidateIntegrationV1");
  assert.deepEqual(QF0I_CANDIDATE_LIFECYCLES, ["QUARANTINED"]);
  assert.deepEqual(
    QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly,
    config.publicExportsExactly,
  );
  assert.equal(QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.runtimeActivation, "OFF");
  assert.equal(QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.remoteMutation, "ZERO");
  assert.equal(QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.productionMutation, "ZERO");
});

test("QF0I-CANDIDATE-006 creates one deterministic valid quarantined candidate", () => {
  const first = createQuarantinedQuestionCandidateV1(createFixture().material);
  const second = createQuarantinedQuestionCandidateV1(createFixture().material);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first), CANDIDATE_FIELDS);
  assert.match(first.candidateId, /^qfc_[a-f0-9]{64}$/u);
  assert.match(first.candidateDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(first.lifecycle, "QUARANTINED");
  assert.deepEqual(assertQuarantinedQuestionCandidateV1(first), first);
});

test("QF0I-DETERMINISM-007 ignores top-level material field order", () => {
  const material = createFixture().material;
  const forward = createQuarantinedQuestionCandidateV1(material);
  const reverse = createQuarantinedQuestionCandidateV1(reverseRecord(material));
  assert.equal(forward.candidateId, reverse.candidateId);
  assert.equal(forward.candidateDigest, reverse.candidateDigest);
});

test("QF0I-DETERMINISM-008 canonicalizes validator-profile input order", () => {
  const material = createFixture().material;
  const forward = createQuarantinedQuestionCandidateV1(material);
  const reverse = createQuarantinedQuestionCandidateV1({
    ...material,
    validatorProfileRefs: [...material.validatorProfileRefs].reverse(),
  });
  assert.equal(forward.candidateId, reverse.candidateId);
  assert.equal(forward.candidateDigest, reverse.candidateDigest);
  assert.deepEqual(forward.validatorProfileRefs, reverse.validatorProfileRefs);
});

test("QF0I-DETERMINISM-009 canonicalizes independent-execution input order", () => {
  const material = createFixture().material;
  const forward = createQuarantinedQuestionCandidateV1(material);
  const reverse = createQuarantinedQuestionCandidateV1({
    ...material,
    independentExecutions: [...material.independentExecutions].reverse(),
  });
  assert.equal(forward.candidateId, reverse.candidateId);
  assert.equal(forward.candidateDigest, reverse.candidateDigest);
  assert.deepEqual(forward.independentExecutions, reverse.independentExecutions);
});

test("QF0I-DIGEST-010 rejects content modification with old candidate identities", () => {
  const candidate = createQuarantinedQuestionCandidateV1(createFixture().material);
  const changed = clone(candidate);
  changed.candidateContentDigest = digest("e");
  assert.throws(
    () => assertQuarantinedQuestionCandidateV1(changed),
    /CANDIDATE_ID_MISMATCH/,
  );
  const rebuilt = createQuarantinedQuestionCandidateV1({
    ...createFixture().material,
    candidateContentDigest: digest("e"),
  });
  assert.notEqual(rebuilt.candidateId, candidate.candidateId);
  assert.notEqual(rebuilt.candidateDigest, candidate.candidateDigest);
});

test("QF0I-DIGEST-011 binds every independently variable top-level capability", () => {
  const baseline = createQuarantinedQuestionCandidateV1(createFixture().material);
  const base = createFixture().material;
  const variants = [
    { ...base, blueprintRef: createOpaqueRegistryRefV1(refMaterial("BLUEPRINT", "b")) },
    {
      ...base,
      answerSpecificationRef: createOpaqueRegistryRefV1(
        refMaterial("ANSWER_SPECIFICATION", "c"),
      ),
    },
    {
      ...base,
      validatorProfileRefs: [
        ...base.validatorProfileRefs,
        createOpaqueRegistryRefV1(refMaterial("VALIDATOR_PROFILE", "e")),
      ],
    },
    { ...base, independentExecutions: [] },
    { ...base, createdAt: "2026-06-01T14:00:00.000Z" },
  ];
  for (const variant of variants) {
    const candidate = createQuarantinedQuestionCandidateV1(variant);
    assert.notEqual(candidate.candidateId, baseline.candidateId);
    assert.notEqual(candidate.candidateDigest, baseline.candidateDigest);
  }
  for (const options of [
    { rightsOverrides: { validUntil: "2026-12-30T23:59:59.999Z" } },
    { decisionOverrides: { evaluatedAt: "2026-02-02T00:00:00.000Z" } },
    { generatorOverrides: { modelVersion: "2026-08-29-r2" } },
    {
      rightsOverrides: { policyDigest: digest("e") },
      decisionOverrides: { policyDigest: digest("e") },
    },
  ]) {
    const candidate = createQuarantinedQuestionCandidateV1(
      createFixture(options).material,
    );
    assert.notEqual(candidate.candidateId, baseline.candidateId);
    assert.notEqual(candidate.candidateDigest, baseline.candidateDigest);
  }
});

test("QF0I-REF-012 rejects a non-BLUEPRINT blueprint reference", () => {
  const material = createFixture().material;
  for (const kind of qf0bContracts.QF0B_REGISTRY_REF_KINDS) {
    if (kind === "BLUEPRINT") continue;
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({
        ...material,
        blueprintRef: createOpaqueRegistryRefV1(refMaterial(kind, "b")),
      }),
      /BLUEPRINT_REF_KIND_MISMATCH/,
      kind,
    );
  }
});

test("QF0I-REF-013 rejects a non-ANSWER_SPECIFICATION answer reference", () => {
  const material = createFixture().material;
  for (const kind of qf0bContracts.QF0B_REGISTRY_REF_KINDS) {
    if (kind === "ANSWER_SPECIFICATION") continue;
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({
        ...material,
        answerSpecificationRef: createOpaqueRegistryRefV1(refMaterial(kind, "c")),
      }),
      /ANSWER_SPECIFICATION_REF_KIND_MISMATCH/,
      kind,
    );
  }
});

test("QF0I-REF-014 rejects every non-VALIDATOR_PROFILE validator kind", () => {
  const material = createFixture().material;
  for (const kind of qf0bContracts.QF0B_REGISTRY_REF_KINDS) {
    if (kind === "VALIDATOR_PROFILE") continue;
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({
        ...material,
        validatorProfileRefs: [createOpaqueRegistryRefV1(refMaterial(kind, "e"))],
      }),
      /VALIDATOR_PROFILE_REF_KIND_MISMATCH/,
      kind,
    );
  }
});

test("QF0I-REF-015 rejects every non-POLICY policy reference kind", () => {
  const material = createFixture().material;
  for (const kind of qf0bContracts.QF0B_REGISTRY_REF_KINDS) {
    if (kind === "POLICY") continue;
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({
        ...material,
        policyRef: createOpaqueRegistryRefV1(refMaterial(kind, "f")),
      }),
      /POLICY_REF_KIND_MISMATCH/,
      kind,
    );
  }
});

test("QF0I-POLICY-016 binds the policy ref digest to the source decision", () => {
  const material = createFixture().material;
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({
      ...material,
      policyRef: createOpaqueRegistryRefV1(refMaterial("POLICY", "f")),
    }),
    /POLICY_REF_DIGEST_MISMATCH/,
  );
});

test("QF0I-VALIDATOR-017 rejects empty, excessive, sparse, and extended arrays", () => {
  const material = createFixture().material;
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({ ...material, validatorProfileRefs: [] }),
    /DENSE_BOUNDED_ARRAY_REQUIRED/,
  );
  const excessive = Array.from({ length: QF0I_LIMITS.maxValidatorProfileRefs + 1 }, (_, index) =>
    createOpaqueRegistryRefV1(
      refMaterial("VALIDATOR_PROFILE", (index % 10).toString(16), {
        registryId: `reg_${index.toString(16).padStart(32, "0")}`,
        objectId: `obj_${(index + 32).toString(16).padStart(32, "0")}`,
      }),
    ),
  );
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({ ...material, validatorProfileRefs: excessive }),
    /DENSE_BOUNDED_ARRAY_REQUIRED/,
  );
  const sparse = [material.validatorProfileRefs[0], , material.validatorProfileRefs[1]];
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({ ...material, validatorProfileRefs: sparse }),
    /DENSE_BOUNDED_ARRAY_REQUIRED|DATA_ELEMENT_REQUIRED/,
  );
  const extended = [...material.validatorProfileRefs];
  extended.extra = true;
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({ ...material, validatorProfileRefs: extended }),
    /DENSE_BOUNDED_ARRAY_REQUIRED/,
  );
});

test("QF0I-VALIDATOR-018 rejects duplicate digest and registry/object/version identity", () => {
  const material = createFixture().material;
  const reference = material.validatorProfileRefs[0];
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({
      ...material,
      validatorProfileRefs: [reference, reference],
    }),
    /VALIDATOR_REF_DIGEST_DUPLICATE/,
  );
  const changedObject = createOpaqueRegistryRefV1({
    contractVersion: "OpaqueRegistryRefV1",
    refKind: reference.refKind,
    registryId: reference.registryId,
    objectId: reference.objectId,
    version: reference.version,
    objectDigest: digest("f"),
  });
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({
      ...material,
      validatorProfileRefs: [reference, changedObject],
    }),
    /VALIDATOR_OBJECT_IDENTITY_DUPLICATE/,
  );
});

test("QF0I-MODEL-019 requires an exact GENERATOR role", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({ generatorRole: "BLIND_SOLVER" }).material,
    ),
    /GENERATOR_ROLE_REQUIRED/,
  );
});

test("QF0I-MODEL-020 rejects generator identity reuse as independent evidence", () => {
  const fixture = createFixture();
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({
      ...fixture.material,
      independentExecutions: [fixture.generator],
    }),
    /INDEPENDENT_ROLE_MUST_NOT_BE_GENERATOR/,
  );
});

test("QF0I-MODEL-021 rejects duplicate independent execution IDs", () => {
  const first = modelMaterial("BLIND_SOLVER", "4", {
    executedAt: "2026-06-01T11:00:00.000Z",
  });
  const second = modelMaterial("JUDGE", "5", {
    executionId: first.executionId,
    executedAt: "2026-06-01T12:00:00.000Z",
  });
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({ independentMaterials: [first, second] }).material,
    ),
    /EXECUTION_ID_NOT_DISTINCT/,
  );
});

test("QF0I-MODEL-022 rejects duplicate independent identity digests", () => {
  const duplicate = modelMaterial("BLIND_SOLVER", "4", {
    executedAt: "2026-06-01T11:00:00.000Z",
  });
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({ independentMaterials: [duplicate, { ...duplicate }] }).material,
    ),
    /IDENTITY_DIGEST_NOT_DISTINCT/,
  );
});

test("QF0I-RIGHTS-023 rejects rights valid at evaluation but expired before generation", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        rightsOverrides: { validUntil: "2026-05-31T23:59:59.999Z" },
      }).material,
    ),
    /AT_USE_OUTSIDE_ELIGIBILITY|AT_USE_OUTSIDE_RIGHTS/,
  );
});

test("QF0I-RIGHTS-024 rejects rights valid at generation but expired before creation", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        rightsOverrides: { validUntil: "2026-06-01T11:30:00.000Z" },
      }).material,
    ),
    /AT_USE_OUTSIDE_ELIGIBILITY|AT_USE_OUTSIDE_RIGHTS/,
  );
});

test("QF0I-RIGHTS-025 rejects policy expiry between generation and creation", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        decisionOverrides: { policyValidUntil: "2026-06-01T11:30:00.000Z" },
      }).material,
    ),
    /AT_USE_OUTSIDE_ELIGIBILITY|AT_USE_OUTSIDE_POLICY/,
  );
});

test("QF0I-RIGHTS-026 rejects generation before decision evaluation", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        generatorOverrides: { executedAt: "2026-01-31T23:59:59.999Z" },
        independentMaterials: [],
      }).material,
    ),
    /AT_USE_BEFORE_EVALUATION/,
  );
});

test("QF0I-CHRONOLOGY-027 rejects creation before generator execution", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        independentMaterials: [],
        createdAt: "2026-06-01T09:59:59.999Z",
      }).material,
    ),
    /CANDIDATE_CREATED_BEFORE_GENERATOR/,
  );
});

test("QF0I-CHRONOLOGY-028 rejects independent execution before generation", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        independentMaterials: [
          modelMaterial("BLIND_SOLVER", "4", {
            executedAt: "2026-06-01T09:59:59.999Z",
          }),
        ],
      }).material,
    ),
    /INDEPENDENT_BEFORE_GENERATOR/,
  );
});

test("QF0I-CHRONOLOGY-029 rejects independent execution after candidate creation", () => {
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        independentMaterials: [
          modelMaterial("BLIND_SOLVER", "4", {
            executedAt: "2026-06-01T13:00:00.001Z",
          }),
        ],
      }).material,
    ),
    /INDEPENDENT_AFTER_CANDIDATE/,
  );
});

test("QF0I-RIGHTS-030 rejects every non-active or replaced at-use authority", () => {
  for (const status of ["STALE", "DISPUTED", "BLOCKED", "REVOKED", "EXPIRED"]) {
    assert.throws(
      () => createQuarantinedQuestionCandidateV1(
        createFixture({ rightsAtUseOverrides: { status } }).material,
      ),
      /AT_USE_RIGHTS_NOT_ACTIVE/,
      status,
    );
  }
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      createFixture({
        rightsAtUseOverrides: { manifestVersionId: `rmv_${"9".repeat(32)}` },
      }).material,
    ),
    /AT_USE_MANIFEST_VERSION_MISMATCH/,
  );
});

test("QF0I-RIGHTS-031 rejects manifest ID, version, and digest drift", () => {
  for (const rightsAtUseOverrides of [
    { manifestId: `rm_${"9".repeat(32)}` },
    { manifestVersionId: `rmv_${"9".repeat(32)}` },
    { validUntil: "2026-12-30T23:59:59.999Z" },
  ]) {
    assert.throws(
      () => createQuarantinedQuestionCandidateV1(
        createFixture({ rightsAtUseOverrides }).material,
      ),
      /AT_USE_MANIFEST_(ID|VERSION|DIGEST)_MISMATCH/,
    );
  }
});

test("QF0I-RIGHTS-032 rejects source-class, purpose, and policy drift", () => {
  for (const rightsAtUseOverrides of [
    { sourceClass: "RIGHTS_CLEARED_OFFICIAL" },
    { permittedPurpose: "OTHER_MACHINE_PURPOSE" },
    { policyVersion: "policy.qf0i.v2" },
    { policyDigest: digest("f") },
  ]) {
    assert.throws(
      () => createQuarantinedQuestionCandidateV1(
        createFixture({ rightsAtUseOverrides }).material,
      ),
      /AT_USE_/,
    );
  }
  const material = createFixture().material;
  const changedDecision = clone(material.sourceDecision);
  changedDecision.sourceClass = "RIGHTS_CLEARED_OFFICIAL";
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({
      ...material,
      sourceDecision: changedDecision,
    }),
    /SOURCE_DECISION_DERIVATION_OR_DIGEST_MISMATCH/,
  );
});

test("QF0I-FIELDS-033 rejects caller-owned identity, lifecycle, release, or approval fields", () => {
  const material = createFixture().material;
  for (const [field, value] of Object.entries({
    candidateId: `qfc_${"1".repeat(64)}`,
    candidateDigest: digest("1"),
    lifecycle: "QUARANTINED",
    releaseStatus: "OFF",
    approvalStatus: "PENDING",
    learnerAssignment: `obj_${"1".repeat(32)}`,
    bankAssignment: `obj_${"2".repeat(32)}`,
  })) {
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({ ...material, [field]: value }),
      /FIELD_SET_INVALID/,
      field,
    );
  }
});

test("QF0I-BODYLESS-034 rejects raw body, identity, location, and generic metadata fields", () => {
  const material = createFixture().material;
  const forbidden = [
    "questionBody", "answerBody", "explanation", "rubricBody", "ocr",
    "handwriting", "sourceExcerpt", "textbookContent", "academyContent",
    "learnerAnswer", "learnerNote", "learnerIdentity", "accountIdentity",
    "prompt", "response", "providerRawPayload", "url", "path", "locator",
    "note", "label", "reason", "description", "summary", "metadata", "extensions",
  ];
  for (const field of forbidden) {
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({
        ...material,
        [field]: field === "metadata" || field === "extensions" ? {} : "forbidden",
      }),
      /FIELD_SET_INVALID/,
      field,
    );
  }
});

test("QF0I-SHAPE-035 rejects proxy, accessor, symbol, and unsupported prototype inputs", () => {
  const material = createFixture().material;
  const proxy = trapProxy(material);
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(proxy.value),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(proxy.traps(), 0);

  let accessorCalls = 0;
  const accessor = { ...material };
  Object.defineProperty(accessor, "createdAt", {
    enumerable: true,
    get() {
      accessorCalls += 1;
      return material.createdAt;
    },
  });
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(accessor),
    /DATA_PROPERTY_REQUIRED/,
  );
  assert.equal(accessorCalls, 0);

  assert.throws(
    () => createQuarantinedQuestionCandidateV1({ ...material, [Symbol("x")]: true }),
    /SYMBOL_KEY_UNSUPPORTED/,
  );
  assert.throws(
    () => createQuarantinedQuestionCandidateV1(
      Object.assign(Object.create({ hostile: true }), material),
    ),
    /PROTOTYPE_UNSUPPORTED/,
  );

  const arrayProxy = trapProxy([...material.validatorProfileRefs]);
  assert.throws(
    () => createQuarantinedQuestionCandidateV1({
      ...material,
      validatorProfileRefs: arrayProxy.value,
    }),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(arrayProxy.traps(), 0);
});

test("QF0I-TIME-036 rejects noncanonical candidate timestamps", () => {
  const material = createFixture().material;
  for (const createdAt of [
    "2026-06-01T13:00:00Z",
    "2026-06-01T13:00:00.000+00:00",
    "2026-02-30T13:00:00.000Z",
    "not-a-time",
  ]) {
    assert.throws(
      () => createQuarantinedQuestionCandidateV1({ ...material, createdAt }),
      /CANDIDATE_CREATED_AT_(FORMAT_)?INVALID/,
      createdAt,
    );
  }
});

test("QF0I-EMPTY-037 permits zero independent executions without validation claims", () => {
  const candidate = createQuarantinedQuestionCandidateV1(
    createFixture({ independentMaterials: [] }).material,
  );
  assert.deepEqual(candidate.independentExecutions, []);
  assert.equal(candidate.lifecycle, "QUARANTINED");
  assert.equal(QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT.releasableCandidateAuthorityAbsent, true);
});

test("QF0I-IMMUTABLE-038 freezes the candidate and every owned nested snapshot", () => {
  const candidate = createQuarantinedQuestionCandidateV1(createFixture().material);
  const owned = [
    candidate,
    candidate.blueprintRef,
    candidate.answerSpecificationRef,
    candidate.validatorProfileRefs,
    ...candidate.validatorProfileRefs,
    candidate.policyRef,
    candidate.sourceDecision,
    candidate.sourceDecision.eligibilityInterval,
    candidate.sourceDecision.rightsManifest,
    candidate.sourceDecision.policyValidityInterval,
    candidate.sourceDecision.denialReasons,
    candidate.rightsManifestAtUse,
    candidate.generatorExecution,
    candidate.independentExecutions,
    ...candidate.independentExecutions,
  ].filter(Boolean);
  for (const value of owned) assert.equal(Object.isFrozen(value), true);
  assert.throws(() => candidate.validatorProfileRefs.push(candidate.policyRef), TypeError);
  assert.throws(() => {
    candidate.blueprintRef.refKind = "POLICY";
  }, TypeError);
});

test("QF0I-ASSERT-039 rejects altered ID, digest, or lifecycle", () => {
  const candidate = clone(
    createQuarantinedQuestionCandidateV1(createFixture().material),
  );
  for (const [field, value, pattern] of [
    ["candidateId", `qfc_${"f".repeat(64)}`, /CANDIDATE_ID_MISMATCH/],
    ["candidateDigest", digest("f"), /CANDIDATE_DIGEST_MISMATCH/],
    ["lifecycle", "RELEASED", /CANDIDATE_LIFECYCLE_INVALID/],
  ]) {
    assert.throws(
      () => assertQuarantinedQuestionCandidateV1({ ...candidate, [field]: value }),
      pattern,
    );
  }
});

test("QF0I-DETERMINISM-040 is process-locale independent", () => {
  const material = createFixture().material;
  const baseline = createQuarantinedQuestionCandidateV1(material);
  const probe = `
    import { createQuarantinedQuestionCandidateV1 } from "./lib/question-foundry/quarantine/candidate-core.ts";
    const candidate = createQuarantinedQuestionCandidateV1(JSON.parse(process.env.QF0I_FIXTURE_JSON));
    console.log(JSON.stringify([candidate.candidateId, candidate.candidateDigest]));
  `;
  for (const locale of ["en_US.UTF-8", "ko_KR.UTF-8", "tr_TR.UTF-8"]) {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "--input-type=module",
        "-e",
        probe,
      ],
      {
        cwd: ROOT_PATH,
        encoding: "utf8",
        env: {
          ...process.env,
          LANG: locale,
          LC_ALL: locale,
          QF0I_FIXTURE_JSON: JSON.stringify(material),
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), [
      baseline.candidateId,
      baseline.candidateDigest,
    ]);
  }
});

test("QF0I-QUARANTINE-041 defines no releasable or assignment lifecycle", () => {
  const source = `${read(CONTRACTS_PATH)}\n${read(CORE_PATH)}`;
  for (const forbidden of [
    "PERSONAL_LEARNING_USABLE",
    "TRANSFER_VERIFIED",
    "CALIBRATION_PILOT",
    "MEASUREMENT_CALIBRATED",
    '"RELEASED"',
    '"APPROVED"',
    '"REJECTED"',
    "releaseStatus",
    "releaseArtifact",
    "learnerAssignment:",
    "bankAssignment:",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(QF0I_CANDIDATE_LIFECYCLES, ["QUARANTINED"]);
});

test("QF0I-SOURCE-042 has no runtime, provider, network, database, filesystem, or env path", () => {
  const source = `${read(CONTRACTS_PATH)}\n${read(CORE_PATH)}`;
  const importSpecifiers = [...source.matchAll(/from\s+"([^"]+)"/gu)].map(
    (match) => match[1],
  );
  const allowedImports = new Set([
    "node:util",
    "./bounded-canonical-json",
    "./trust-contracts",
    "./trust-core",
    "./scarcity-contracts",
    "./scarcity-core",
    "./candidate-contracts",
  ]);
  for (const specifier of importSpecifiers) {
    assert.equal(allowedImports.has(specifier), true, specifier);
  }
  for (const forbiddenPattern of [
    /process\.env/u,
    /\bfetch\s*\(/u,
    /node:fs/u,
    /node:path/u,
    /@supabase/u,
    /stripe/u,
    /axios/u,
    /\brequire\s*\(/u,
    /\bwriteFile/u,
  ]) {
    assert.equal(forbiddenPattern.test(source), false, forbiddenPattern.source);
  }
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(EXACT_PATHS.some((path) => path === "package.json"), false);
  assert.equal(EXACT_PATHS.some((path) => path === "package-lock.json"), false);
  assert.equal(EXACT_PATHS.some((path) => path.startsWith(".github/workflows/")), false);
  assert.equal(EXACT_PATHS.some((path) => path.startsWith("app/")), false);
});
