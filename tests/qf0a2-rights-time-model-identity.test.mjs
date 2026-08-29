import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as qf0a1 from "../lib/question-foundry/quarantine/bounded-canonical-json.ts";
import * as contracts from "../lib/question-foundry/quarantine/trust-contracts.ts";
import * as core from "../lib/question-foundry/quarantine/trust-core.ts";

const {
  QF0A2_DECISION_STATUSES,
  QF0A2_ELIGIBLE_SOURCE_CLASSES,
  QF0A2_MODEL_ROLES,
  QF0A2_PURPOSE,
  QF0A2_QF0A1_DEPENDENCY_RECEIPT,
  QF0A2_RIGHTS_STATUSES,
  QF0A2_SOURCE_CLASSES,
  QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT,
} = contracts;

const {
  assertDistinctModelExecutionIdentitiesV1,
  assertModelExecutionIdentityV1,
  assertQf0a1DependencyV1,
  assertRightsManifestRefV1,
  assertSourceEligibilityAtUseV1,
  assertSourceEligibilityDecisionV1,
  createModelExecutionIdentityV1,
  createRightsManifestRefV1,
  createSourceEligibilityDecisionV1,
} = core;

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "62268861dcc6a60126700c5259c662c55bd1a4ee";
const BASE_TREE = "996b1e7ea30f31f21782e765be644798aad8d548";
const CONFIG_PATH = "config/dabangil-qf0a2-rights-time-model-identity-v1.json";
const CORE_PATH = "lib/question-foundry/quarantine/trust-core.ts";
const CONTRACTS_PATH = "lib/question-foundry/quarantine/trust-contracts.ts";
const EXPECTED_CONFIG_DIGEST =
  "45bbdcd1c7d9858bd4a0a9be86c4df2e556ca4aa0953ff5ff25da89e1458ccda";
const QF0A1_CONFIG_DIGEST =
  "0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53";
const QF0A1_IMPLEMENTATION_DIGEST =
  "cccc4dc8da9163d982a252633e3160f1ba5ad2138d0fda0f152f21b2c01e8d9e";
const QF0A1_FIVE_PATH_IDENTITY =
  "sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618";

const QF0A1_PATHS = [
  "config/dabangil-qf0a1-bounded-canonical-json-v1.json",
  "docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md",
  "docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md",
  "lib/question-foundry/quarantine/bounded-canonical-json.ts",
  "tests/qf0a1-bounded-canonical-json.test.mjs",
];

const EXACT_PATHS = [
  CONFIG_PATH,
  "docs/product/dabangil-qf0a2-rights-time-model-identity-v1.md",
  "docs/qa/dabangil-qf0a2-rights-time-model-identity-validation.md",
  CONTRACTS_PATH,
  CORE_PATH,
  "tests/qf0a2-rights-time-model-identity.test.mjs",
];

const QF0A1_EXPORTS = [
  "QF0A1_LIMITS",
  "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  "canonicalizeBoundedJsonV1",
  "compareUtf8BytesV1",
  "digestCanonicalJsonV1",
];

const CORE_EXPORTS = [
  "QF0A2_CONTRACT_VERSION",
  "assertDistinctModelExecutionIdentitiesV1",
  "assertModelExecutionIdentityV1",
  "assertQf0a1DependencyV1",
  "assertRightsManifestRefV1",
  "assertSourceEligibilityAtUseV1",
  "assertSourceEligibilityDecisionV1",
  "createModelExecutionIdentityV1",
  "createRightsManifestRefV1",
  "createSourceEligibilityDecisionV1",
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
    policyVersion: "policy.qf0a2.v1",
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
    policyVersion: "policy.qf0a2.v1",
    policyDigest: digest("a"),
    policyValidFrom: "2026-01-15T00:00:00.000Z",
    policyValidUntil: "2026-11-30T23:59:59.999Z",
    ...overrides,
  };
}

function atUseInput(decision, rightsManifestAtUse, overrides = {}) {
  return {
    decision,
    rightsManifestAtUse,
    useAt: "2026-06-01T00:00:00.000Z",
    expectedSourceClass: decision.sourceClass,
    expectedPurpose: QF0A2_PURPOSE,
    expectedPolicyVersion: decision.policyVersion,
    expectedPolicyDigest: decision.policyDigest,
    ...overrides,
  };
}

function modelMaterial(role, token, overrides = {}) {
  return {
    contractVersion: "ModelExecutionIdentityV1",
    role,
    providerId: "provider.openai",
    modelId: "model.reasoning-v1",
    modelVersion: "2026-08-28",
    modelArtifactDigest: digest("b"),
    executionId: `exec_${token.repeat(32)}`,
    executionArtifactDigest: digest(token),
    configurationDigest: digest("d"),
    executedAt: "2026-08-28T12:00:00.000Z",
    ...overrides,
  };
}

function createFixture() {
  const rights = createRightsManifestRefV1(rightsMaterial());
  const decision = createSourceEligibilityDecisionV1(decisionInput(rights));
  return { rights, decision };
}

function trapProxy(target, extra = {}) {
  let traps = 0;
  const handler = {
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
    ...extra,
  };
  return { value: new Proxy(target, handler), traps: () => traps };
}

test("QF0A2-CONTRACT-001 binds the exact six-path source-only candidate", () => {
  const text = read(CONFIG_PATH);
  const contract = JSON.parse(text);
  assert.equal(contract.contractVersion, "dabangil.qf0a2.rights_time_model_identity.v1");
  assert.equal(contract.stage, "QF-0A2");
  assert.equal(contract.tracking.closesIssue, 859);
  assert.deepEqual(
    [
      contract.tracking.qf0a1CompletedIssue,
      contract.tracking.qf0Umbrella,
      contract.tracking.questionFoundryProgram,
      contract.tracking.cognitiveProductReference,
    ],
    [861, 857, 811, 714],
  );
  assert.deepEqual(contract.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(sha256(text), EXPECTED_CONFIG_DIGEST);
  assert.equal(contract.sourceOnlyBoundary.runtimeActivation, "OFF");
  assert.equal(contract.sourceOnlyBoundary.remoteMutationCount, 0);
  assert.equal(contract.sourceOnlyBoundary.productionMutationCount, 0);
  assert.deepEqual(contract.sourceOnlyBoundary.releasableLifecycleStates, []);
  assert.equal(contract.successorGate.qf0b, "BLOCKED");
  assert.equal(contract.successorGate.qf0i, "BLOCKED");
  assert.equal(contract.successorGate.automaticStart, false);
});

test("QF0A2-DEPENDENCY-002 pins and consumes the exact merged QF-0A1 receipt", () => {
  const contract = JSON.parse(read(CONFIG_PATH));
  assert.equal(QF0A2_QF0A1_DEPENDENCY_RECEIPT.resultingMainSha, BASE_SHA);
  assert.equal(QF0A2_QF0A1_DEPENDENCY_RECEIPT.resultingMainTree, BASE_TREE);
  assert.equal(
    sha256(read(QF0A1_PATHS[0], null)),
    QF0A1_CONFIG_DIGEST,
  );
  assert.equal(
    sha256(read(QF0A1_PATHS[3], null)),
    QF0A1_IMPLEMENTATION_DIGEST,
  );
  const pathObjects = gitPathObjects(BASE_SHA, QF0A1_PATHS);
  assert.deepEqual(pathObjects, QF0A2_QF0A1_DEPENDENCY_RECEIPT.pathObjectsExactly);
  assert.equal(qf0a1.digestCanonicalJsonV1(pathObjects), QF0A1_FIVE_PATH_IDENTITY);
  assert.deepEqual(Object.keys(qf0a1), QF0A1_EXPORTS);
  assert.deepEqual(
    QF0A2_QF0A1_DEPENDENCY_RECEIPT.requiredExportsExactly,
    QF0A1_EXPORTS,
  );
  assert.equal(contract.qf0a1Dependency.resultingMainSha, BASE_SHA);
  assert.equal(contract.qf0a1Dependency.resultingMainTree, BASE_TREE);
  assert.equal(contract.qf0a1Dependency.configSha256, QF0A1_CONFIG_DIGEST);
  assert.equal(
    contract.qf0a1Dependency.implementationSha256,
    QF0A1_IMPLEMENTATION_DIGEST,
  );
  assert.equal(contract.qf0a1Dependency.fivePathIdentity, QF0A1_FIVE_PATH_IDENTITY);
  assert.deepEqual(contract.qf0a1Dependency.pathObjectsExactly, pathObjects);
  assert.deepEqual(contract.qf0a1Dependency.requiredExportsExactly, QF0A1_EXPORTS);
  const plainReceipt = clone(qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(plainReceipt),
    QF0A2_QF0A1_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest,
  );
  assert.deepEqual(contract.qf0a1Dependency.sourceOnlyBoundaryReceipt, plainReceipt);
  assert.equal(
    contract.qf0a1Dependency.sourceOnlyBoundaryReceiptDigest,
    QF0A2_QF0A1_DEPENDENCY_RECEIPT.sourceOnlyBoundaryReceiptDigest,
  );
  assert.equal(assertQf0a1DependencyV1(), true);
  const source = read(CORE_PATH);
  assert.match(source, /import \* as qf0a1 from "\.\/bounded-canonical-json"/u);
  for (const name of [
    "canonicalizeBoundedJsonV1",
    "compareUtf8BytesV1",
    "digestCanonicalJsonV1",
    "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ]) {
    assert.match(source, new RegExp(`qf0a1\\.${name}`, "u"));
  }
});

test("QF0A2-CONTRACT-003 closes source classes, statuses, roles, and exports", () => {
  const contract = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(QF0A2_SOURCE_CLASSES, [
    "INVERGE_ORIGINAL",
    "RIGHTS_CLEARED_OFFICIAL",
    "CONTRACTED_EXPERT_ORIGINAL",
    "CLEARED_DETERMINISTIC_TEMPLATE",
    "USER_PRIVATE_ONLY",
    "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
    "RIGHTS_UNKNOWN",
    "BLOCKED",
  ]);
  assert.deepEqual(QF0A2_ELIGIBLE_SOURCE_CLASSES, QF0A2_SOURCE_CLASSES.slice(0, 4));
  assert.deepEqual(contract.sourceClassesExactly, QF0A2_SOURCE_CLASSES);
  assert.deepEqual(contract.eligibleSourceClassesExactly, QF0A2_ELIGIBLE_SOURCE_CLASSES);
  assert.deepEqual(contract.alwaysDeniedSourceClassesExactly, QF0A2_SOURCE_CLASSES.slice(4));
  assert.deepEqual(QF0A2_RIGHTS_STATUSES, [
    "ACTIVE",
    "STALE",
    "DISPUTED",
    "BLOCKED",
    "REVOKED",
    "EXPIRED",
  ]);
  assert.deepEqual(QF0A2_DECISION_STATUSES, ["CURRENT", "STALE", "DISPUTED", "BLOCKED"]);
  assert.deepEqual(QF0A2_MODEL_ROLES, [
    "GENERATOR",
    "BLIND_SOLVER",
    "JUDGE",
    "ADVERSARIAL_CRITIC",
    "META_AUDITOR",
  ]);
  assert.deepEqual(Object.keys(core), CORE_EXPORTS);
});

test("QF0A2-RIGHTS-004 validates ACTIVE rights and CURRENT eligibility at use", () => {
  const { rights, decision } = createFixture();
  assert.equal(rights.status, "ACTIVE");
  assert.equal(decision.decisionStatus, "CURRENT");
  assert.equal(decision.outcome, "ELIGIBLE");
  assert.deepEqual(decision.denialReasons, []);
  assert.equal(assertSourceEligibilityAtUseV1(atUseInput(decision, rights)), true);
});

test("QF0A2-RIGHTS-005 derives the exact maximum/minimum eligibility intersection", () => {
  const rights = createRightsManifestRefV1(
    rightsMaterial({
      validFrom: "2026-02-15T00:00:00.000Z",
      validUntil: "2026-10-15T00:00:00.000Z",
    }),
  );
  const decision = createSourceEligibilityDecisionV1(
    decisionInput(rights, {
      evaluatedAt: "2026-03-01T00:00:00.000Z",
      policyValidFrom: "2026-02-20T00:00:00.000Z",
      policyValidUntil: "2026-09-30T00:00:00.000Z",
    }),
  );
  assert.deepEqual(decision.eligibilityInterval, {
    validFrom: "2026-03-01T00:00:00.000Z",
    validUntil: "2026-09-30T00:00:00.000Z",
  });
});

test("QF0A2-AT-USE-006 rejects rights that expire after evaluation but before use", () => {
  const rights = createRightsManifestRefV1(
    rightsMaterial({ validUntil: "2026-03-01T00:00:00.000Z" }),
  );
  const decision = createSourceEligibilityDecisionV1(decisionInput(rights));
  assert.equal(decision.outcome, "ELIGIBLE");
  assert.throws(
    () =>
      assertSourceEligibilityAtUseV1(
        atUseInput(decision, rights, { useAt: "2026-03-02T00:00:00.000Z" }),
      ),
    /AT_USE_OUTSIDE_(ELIGIBILITY|RIGHTS)/,
  );
});

test("QF0A2-AT-USE-007 rejects policy expiry after evaluation and prior-decision replay", () => {
  const rights = createRightsManifestRefV1(rightsMaterial());
  const decision = createSourceEligibilityDecisionV1(
    decisionInput(rights, { policyValidUntil: "2026-03-01T00:00:00.000Z" }),
  );
  assert.equal(decision.outcome, "ELIGIBLE");
  for (const useAt of ["2026-03-02T00:00:00.000Z", "2026-12-01T00:00:00.000Z"]) {
    assert.throws(
      () => assertSourceEligibilityAtUseV1(atUseInput(decision, rights, { useAt })),
      /AT_USE_OUTSIDE_(ELIGIBILITY|POLICY)/,
    );
  }
});

test("QF0A2-AT-USE-008 rejects use before evaluatedAt", () => {
  const { rights, decision } = createFixture();
  assert.throws(
    () =>
      assertSourceEligibilityAtUseV1(
        atUseInput(decision, rights, { useAt: "2026-01-31T23:59:59.999Z" }),
      ),
    /AT_USE_BEFORE_EVALUATION/,
  );
});

test("QF0A2-RIGHTS-009 rejects every non-ACTIVE rights status", () => {
  const { rights: activeRights, decision } = createFixture();
  assert.equal(activeRights.status, "ACTIVE");
  for (const status of ["STALE", "DISPUTED", "BLOCKED", "REVOKED", "EXPIRED"]) {
    const rightsAtUse = createRightsManifestRefV1(rightsMaterial({ status }));
    assert.throws(
      () => assertSourceEligibilityAtUseV1(atUseInput(decision, rightsAtUse)),
      /AT_USE_RIGHTS_NOT_ACTIVE/,
      status,
    );
    const denied = createSourceEligibilityDecisionV1(decisionInput(rightsAtUse));
    assert.equal(denied.outcome, "DENIED", status);
    assert.ok(denied.denialReasons.includes("RIGHTS_STATUS_NOT_ACTIVE"), status);
  }
});

test("QF0A2-RIGHTS-010 rejects every non-CURRENT decision status", () => {
  const rights = createRightsManifestRefV1(rightsMaterial());
  for (const decisionStatus of ["STALE", "DISPUTED", "BLOCKED"]) {
    const decision = createSourceEligibilityDecisionV1(
      decisionInput(rights, { decisionStatus }),
    );
    assert.equal(decision.outcome, "DENIED");
    assert.ok(decision.denialReasons.includes("DECISION_STATUS_NOT_CURRENT"));
    assert.throws(
      () => assertSourceEligibilityAtUseV1(atUseInput(decision, rights)),
      /AT_USE_DECISION_NOT_CURRENT/,
    );
  }
});

test("QF0A2-RIGHTS-011 always denies private, academy, unknown, and blocked classes", () => {
  for (const sourceClass of [
    "USER_PRIVATE_ONLY",
    "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
    "RIGHTS_UNKNOWN",
    "BLOCKED",
  ]) {
    const rights = createRightsManifestRefV1(rightsMaterial({ sourceClass }));
    const decision = createSourceEligibilityDecisionV1(decisionInput(rights));
    assert.equal(decision.outcome, "DENIED", sourceClass);
    assert.ok(decision.denialReasons.includes("SOURCE_CLASS_NOT_ELIGIBLE"), sourceClass);
  }
});

test("QF0A2-RIGHTS-011A permits exactly the four eligible classes when all gates hold", () => {
  for (const sourceClass of QF0A2_ELIGIBLE_SOURCE_CLASSES) {
    const rights = createRightsManifestRefV1(rightsMaterial({ sourceClass }));
    const decision = createSourceEligibilityDecisionV1(decisionInput(rights));
    assert.equal(decision.outcome, "ELIGIBLE", sourceClass);
    assert.deepEqual(decision.denialReasons, [], sourceClass);
  }
});

test("QF0A2-RIGHTS-011B denies evaluation outside rights, policy, or their intersection", () => {
  const futureRights = createRightsManifestRefV1(
    rightsMaterial({ validFrom: "2026-03-01T00:00:00.000Z" }),
  );
  const outsideRights = createSourceEligibilityDecisionV1(decisionInput(futureRights));
  assert.ok(outsideRights.denialReasons.includes("EVALUATED_AT_OUTSIDE_RIGHTS_INTERVAL"));

  const rights = createRightsManifestRefV1(rightsMaterial());
  const outsidePolicy = createSourceEligibilityDecisionV1(
    decisionInput(rights, { policyValidFrom: "2026-03-01T00:00:00.000Z" }),
  );
  assert.ok(outsidePolicy.denialReasons.includes("EVALUATED_AT_OUTSIDE_POLICY_INTERVAL"));

  const earlyEndingRights = createRightsManifestRefV1(
    rightsMaterial({ validUntil: "2026-02-15T00:00:00.000Z" }),
  );
  const emptyIntersection = createSourceEligibilityDecisionV1(
    decisionInput(earlyEndingRights, {
      policyValidFrom: "2026-03-01T00:00:00.000Z",
    }),
  );
  assert.equal(emptyIntersection.outcome, "DENIED");
  assert.equal(emptyIntersection.eligibilityInterval, null);
  assert.ok(emptyIntersection.denialReasons.includes("ELIGIBILITY_INTERVAL_EMPTY"));
});

test("QF0A2-RIGHTS-012 derives source-class and purpose mismatch denials", () => {
  const rights = createRightsManifestRefV1(rightsMaterial());
  const sourceMismatch = createSourceEligibilityDecisionV1(
    decisionInput(rights, { sourceClass: "RIGHTS_CLEARED_OFFICIAL" }),
  );
  assert.equal(sourceMismatch.outcome, "DENIED");
  assert.ok(sourceMismatch.denialReasons.includes("SOURCE_CLASS_MISMATCH"));

  const otherPurposeRights = createRightsManifestRefV1(
    rightsMaterial({ permittedPurpose: "OTHER_QUARANTINED_PURPOSE" }),
  );
  const purposeMismatch = createSourceEligibilityDecisionV1(
    decisionInput(otherPurposeRights),
  );
  assert.equal(purposeMismatch.outcome, "DENIED");
  assert.ok(purposeMismatch.denialReasons.includes("PURPOSE_MISMATCH"));

  const unauthorizedPurpose = createSourceEligibilityDecisionV1(
    decisionInput(rights, { purpose: "OTHER_QUARANTINED_PURPOSE" }),
  );
  assert.ok(unauthorizedPurpose.denialReasons.includes("PURPOSE_NOT_AUTHORIZED"));
});

test("QF0A2-RIGHTS-013 derives policy version and digest mismatch denials", () => {
  const rights = createRightsManifestRefV1(rightsMaterial());
  const versionMismatch = createSourceEligibilityDecisionV1(
    decisionInput(rights, { policyVersion: "policy.qf0a2.v2" }),
  );
  assert.ok(versionMismatch.denialReasons.includes("POLICY_VERSION_MISMATCH"));
  const digestMismatch = createSourceEligibilityDecisionV1(
    decisionInput(rights, { policyDigest: digest("e") }),
  );
  assert.ok(digestMismatch.denialReasons.includes("POLICY_DIGEST_MISMATCH"));
});

test("QF0A2-AT-USE-014 rejects changed manifest identity, version, digest, and policy", () => {
  const { rights, decision } = createFixture();
  const cases = [
    [
      createRightsManifestRefV1(rightsMaterial({ manifestId: `rm_${"3".repeat(32)}` })),
      /MANIFEST_ID_MISMATCH/,
    ],
    [
      createRightsManifestRefV1(
        rightsMaterial({ manifestVersionId: `rmv_${"4".repeat(32)}` }),
      ),
      /MANIFEST_VERSION_MISMATCH/,
    ],
    [
      createRightsManifestRefV1(
        rightsMaterial({ validUntil: "2026-12-30T23:59:59.999Z" }),
      ),
      /MANIFEST_DIGEST_MISMATCH/,
    ],
  ];
  for (const [rightsAtUse, pattern] of cases) {
    assert.throws(
      () => assertSourceEligibilityAtUseV1(atUseInput(decision, rightsAtUse)),
      pattern,
    );
  }
  assert.throws(
    () =>
      assertSourceEligibilityAtUseV1(
        atUseInput(decision, rights, { expectedPolicyVersion: "policy.qf0a2.v2" }),
      ),
    /EXPECTED_POLICY_VERSION_MISMATCH/,
  );
  assert.throws(
    () =>
      assertSourceEligibilityAtUseV1(
        atUseInput(decision, rights, { expectedPolicyDigest: digest("e") }),
      ),
    /EXPECTED_POLICY_DIGEST_MISMATCH/,
  );
  assert.throws(
    () =>
      assertSourceEligibilityAtUseV1(
        atUseInput(decision, rights, {
          expectedSourceClass: "RIGHTS_CLEARED_OFFICIAL",
        }),
      ),
    /EXPECTED_SOURCE_CLASS_MISMATCH/,
  );
  assert.throws(
    () =>
      assertSourceEligibilityAtUseV1(
        atUseInput(decision, rights, {
          expectedPurpose: "OTHER_QUARANTINED_PURPOSE",
        }),
      ),
    /PURPOSE_NOT_AUTHORIZED/,
  );
});

test("QF0A2-SHAPE-015 rejects missing and extra fields", () => {
  const missing = rightsMaterial();
  delete missing.policyDigest;
  assert.throws(() => createRightsManifestRefV1(missing), /FIELD_SET_INVALID/);
  assert.throws(
    () => createRightsManifestRefV1({ ...rightsMaterial(), notes: "not allowed" }),
    /FIELD_SET_INVALID/,
  );

  const rights = createRightsManifestRefV1(rightsMaterial());
  assert.throws(
    () =>
      createSourceEligibilityDecisionV1({
        ...decisionInput(rights),
        outcome: "ELIGIBLE",
      }),
    /FIELD_SET_INVALID/,
  );
  const decision = createSourceEligibilityDecisionV1(decisionInput(rights));
  assert.throws(
    () => assertSourceEligibilityDecisionV1({ ...decision, hidden: true }),
    /FIELD_SET_INVALID/,
  );
});

test("QF0A2-DIGEST-016 rejects modified rights and decision material with old digests", () => {
  const { rights, decision } = createFixture();
  const changedRights = clone(rights);
  changedRights.validUntil = "2026-12-30T23:59:59.999Z";
  assert.throws(
    () => assertRightsManifestRefV1(changedRights),
    /RIGHTS_MANIFEST_DIGEST_MISMATCH/,
  );
  const changedDecision = clone(decision);
  changedDecision.evaluatedAt = "2026-02-02T00:00:00.000Z";
  assert.throws(
    () => assertSourceEligibilityDecisionV1(changedDecision),
    /DERIVATION_OR_DIGEST_MISMATCH/,
  );
});

test("QF0A2-DETERMINISM-017 is key-order independent and repeatable", () => {
  const forwardRights = createRightsManifestRefV1(rightsMaterial());
  const reverseRights = createRightsManifestRefV1(reverseRecord(rightsMaterial()));
  assert.equal(forwardRights.manifestDigest, reverseRights.manifestDigest);

  const forwardDecision = createSourceEligibilityDecisionV1(decisionInput(forwardRights));
  const reverseDecision = createSourceEligibilityDecisionV1(
    reverseRecord(decisionInput(reverseRights)),
  );
  assert.equal(forwardDecision.decisionId, reverseDecision.decisionId);
  assert.equal(forwardDecision.decisionDigest, reverseDecision.decisionDigest);

  const forwardModel = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  const reverseModel = createModelExecutionIdentityV1(
    reverseRecord(modelMaterial("GENERATOR", "1")),
  );
  assert.equal(forwardModel.identityDigest, reverseModel.identityDigest);
});

test("QF0A2-DETERMINISM-018 is process-locale independent", () => {
  const probe = `
    import { createRightsManifestRefV1, createSourceEligibilityDecisionV1, createModelExecutionIdentityV1 } from "./${CORE_PATH}";
    const digest = (value) => \`sha256:\${value.repeat(64)}\`;
    const rights = createRightsManifestRefV1({
      contractVersion:"RightsManifestRefV1", manifestId:"rm_${"1".repeat(32)}",
      manifestVersionId:"rmv_${"2".repeat(32)}", sourceClass:"INVERGE_ORIGINAL",
      status:"ACTIVE", permittedPurpose:"${QF0A2_PURPOSE}",
      validFrom:"2026-01-01T00:00:00.000Z", validUntil:"2026-12-31T23:59:59.999Z",
      policyVersion:"policy.qf0a2.v1", policyDigest:digest("a")
    });
    const decision = createSourceEligibilityDecisionV1({
      contractVersion:"SourceEligibilityDecisionV1", sourceClass:"INVERGE_ORIGINAL",
      purpose:"${QF0A2_PURPOSE}", decisionStatus:"CURRENT",
      evaluatedAt:"2026-02-01T00:00:00.000Z", rightsManifest:rights,
      policyVersion:"policy.qf0a2.v1", policyDigest:digest("a"),
      policyValidFrom:"2026-01-15T00:00:00.000Z", policyValidUntil:"2026-11-30T23:59:59.999Z"
    });
    const model = createModelExecutionIdentityV1({
      contractVersion:"ModelExecutionIdentityV1", role:"GENERATOR",
      providerId:"provider.openai", modelId:"model.reasoning-v1", modelVersion:"2026-08-28",
      modelArtifactDigest:digest("b"), executionId:"exec_${"3".repeat(32)}",
      executionArtifactDigest:digest("c"), configurationDigest:digest("d"),
      executedAt:"2026-08-28T12:00:00.000Z"
    });
    process.stdout.write(JSON.stringify([rights.manifestDigest, decision.decisionId, decision.decisionDigest, model.identityDigest]));
  `;
  const outputs = ["en_US.UTF-8", "sv_SE.UTF-8"].map((locale) => {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "--input-type=module",
        "--eval",
        probe,
      ],
      {
        cwd: ROOT_PATH,
        env: { ...process.env, LANG: locale, LC_ALL: locale },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  });
  assert.equal(outputs[0], outputs[1]);
});

test("QF0A2-SHAPE-019 rejects proxies and accessors without executing hostile traps", () => {
  const proxiedRights = trapProxy(rightsMaterial());
  assert.throws(
    () => createRightsManifestRefV1(proxiedRights.value),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(proxiedRights.traps(), 0);

  const rights = createRightsManifestRefV1(rightsMaterial());
  const nestedProxy = trapProxy(rights);
  assert.throws(
    () =>
      createSourceEligibilityDecisionV1(
        { ...decisionInput(rights), rightsManifest: nestedProxy.value },
      ),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(nestedProxy.traps(), 0);

  const generator = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  const solver = createModelExecutionIdentityV1(modelMaterial("BLIND_SOLVER", "2"));
  const proxiedArray = trapProxy([solver]);
  assert.throws(
    () =>
      assertDistinctModelExecutionIdentitiesV1({
        generator,
        independentExecutions: proxiedArray.value,
      }),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(proxiedArray.traps(), 0);

  let getterCalls = 0;
  const accessor = rightsMaterial();
  Object.defineProperty(accessor, "status", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "ACTIVE";
    },
  });
  assert.throws(() => createRightsManifestRefV1(accessor), /DATA_PROPERTY_REQUIRED/);
  assert.equal(getterCalls, 0);

  const hostilePrototype = rightsMaterial();
  Object.setPrototypeOf(hostilePrototype, { inherited: true });
  assert.throws(
    () => createRightsManifestRefV1(hostilePrototype),
    /PROTOTYPE_UNSUPPORTED/,
  );
});

test("QF0A2-TIME-020 rejects noncanonical and inverted intervals", () => {
  for (const validFrom of [
    "2026-01-01T00:00:00Z",
    "2026-01-01T09:00:00.000+09:00",
    "2026-02-30T00:00:00.000Z",
  ]) {
    assert.throws(
      () => createRightsManifestRefV1(rightsMaterial({ validFrom })),
      /STRING_INVALID|FORMAT_INVALID|CANONICAL_UTC_INVALID/,
    );
  }
  assert.throws(
    () =>
      createRightsManifestRefV1(
        rightsMaterial({
          validFrom: "2026-12-31T23:59:59.999Z",
          validUntil: "2026-01-01T00:00:00.000Z",
        }),
      ),
    /INTERVAL_ORDER_INVALID/,
  );
});

test("QF0A2-MODEL-021 creates immutable, digest-bound model identities", () => {
  const identity = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  assert.equal(Object.isFrozen(identity), true);
  assert.equal(assertModelExecutionIdentityV1(identity).identityDigest, identity.identityDigest);
  const repeated = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  assert.equal(repeated.identityDigest, identity.identityDigest);

  const changed = clone(identity);
  changed.modelVersion = "2026-08-29";
  assert.throws(
    () => assertModelExecutionIdentityV1(changed),
    /MODEL_IDENTITY_DIGEST_MISMATCH/,
  );
});

test("QF0A2-MODEL-022 rejects generator identity reuse under every independent role", () => {
  const generator = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  assert.throws(
    () =>
      assertDistinctModelExecutionIdentitiesV1({
        generator,
        independentExecutions: [generator],
      }),
    /INDEPENDENT_ROLE_MUST_NOT_BE_GENERATOR/,
  );
  for (const role of ["BLIND_SOLVER", "JUDGE", "ADVERSARIAL_CRITIC", "META_AUDITOR"]) {
    const relabeledGenerator = clone(generator);
    relabeledGenerator.role = role;
    assert.throws(
      () => assertModelExecutionIdentityV1(relabeledGenerator),
      /MODEL_IDENTITY_DIGEST_MISMATCH/,
      `${role} relabel`,
    );
    const reusedExecution = createModelExecutionIdentityV1(
      modelMaterial(role, "1", { executionArtifactDigest: digest("e") }),
    );
    assert.throws(
      () =>
        assertDistinctModelExecutionIdentitiesV1({
          generator,
          independentExecutions: [reusedExecution],
        }),
      /EXECUTION_ID_NOT_DISTINCT/,
      role,
    );
  }
});

test("QF0A2-MODEL-023 rejects duplicate execution IDs and identity digests", () => {
  const generator = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  const solver = createModelExecutionIdentityV1(modelMaterial("BLIND_SOLVER", "2"));
  const judgeWithReusedExecution = createModelExecutionIdentityV1(
    modelMaterial("JUDGE", "2", { executionArtifactDigest: digest("e") }),
  );
  assert.throws(
    () =>
      assertDistinctModelExecutionIdentitiesV1({
        generator,
        independentExecutions: [solver, judgeWithReusedExecution],
      }),
    /EXECUTION_ID_NOT_DISTINCT/,
  );
  assert.throws(
    () =>
      assertDistinctModelExecutionIdentitiesV1({
        generator,
        independentExecutions: [solver, solver],
      }),
    /IDENTITY_DIGEST_NOT_DISTINCT/,
  );
});

test("QF0A2-MODEL-024 permits the same model/version only for distinct executions", () => {
  const generator = createModelExecutionIdentityV1(modelMaterial("GENERATOR", "1"));
  const solver = createModelExecutionIdentityV1(modelMaterial("BLIND_SOLVER", "2"));
  const judge = createModelExecutionIdentityV1(
    modelMaterial("JUDGE", "3", { executionArtifactDigest: digest("e") }),
  );
  assert.equal(solver.modelId, judge.modelId);
  assert.equal(solver.modelVersion, judge.modelVersion);
  assert.notEqual(solver.executionId, judge.executionId);
  assert.notEqual(solver.identityDigest, judge.identityDigest);
  assert.equal(
    assertDistinctModelExecutionIdentitiesV1({
      generator,
      independentExecutions: [solver, judge],
    }),
    true,
  );
});

test("QF0A2-INPUT-025 rejects prompt, response, source, learner, credential, and raw payload fields", () => {
  const forbiddenFields = [
    "prompt",
    "promptBody",
    "response",
    "responseBody",
    "learnerText",
    "sourceExcerpt",
    "credentials",
    "providerRawPayload",
  ];
  for (const field of forbiddenFields) {
    assert.throws(
      () =>
        createModelExecutionIdentityV1({
          ...modelMaterial("GENERATOR", "1"),
          [field]: "forbidden-body",
        }),
      /FIELD_SET_INVALID/,
      field,
    );
  }
  assert.throws(
    () =>
      createRightsManifestRefV1({
        ...rightsMaterial(),
        rawSourceText: "forbidden-body",
      }),
    /FIELD_SET_INVALID/,
  );
  assert.throws(
    () =>
      createModelExecutionIdentityV1({
        ...modelMaterial("GENERATOR", "1"),
        executionId: "exec_answer-text-is-not-an-opaque-identity",
      }),
    /STRING_INVALID|FORMAT_INVALID/,
  );
});

test("QF0A2-BOUNDARY-026 exposes only an inert source-only trust primitive", () => {
  assert.deepEqual(QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT, {
    contractVersion: "QF0A2RightsTimeModelIdentityCoreV1",
    scope: "INERT_SOURCE_ONLY_TRUST_BOUNDARY",
    storage: "IN_MEMORY_ONLY",
    runtimeActivation: "OFF",
    providerExecution: "OFF",
    network: "OFF",
    databaseAndPersistence: "OFF",
    remoteMutation: "ZERO",
    productionMutation: "ZERO",
    candidateAuthorityAbsent: true,
    scarcityAuthorityAbsent: true,
    releaseAuthorityAbsent: true,
    learnerAssignmentAbsent: true,
    bankAssignmentAbsent: true,
    liveRightsAuthorityFetch: false,
    laterRevocationDetectionWithoutFreshSnapshot: false,
  });
  assert.equal(Object.isFrozen(QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT), true);
  const source = `${read(CONTRACTS_PATH)}\n${read(CORE_PATH)}`;
  assert.doesNotMatch(
    source,
    /node:https|node:http|\bfetch\s*\(|supabase|stripe|postgres|databaseClient|process\.env/iu,
  );
  assert.doesNotMatch(source, /localeCompare|Intl\.Collator/u);
  for (const forbiddenExport of [
    "createCandidate",
    "recordScarcity",
    "releaseCandidate",
    "assignLearner",
    "assignBank",
  ]) {
    assert.equal(Object.hasOwn(core, forbiddenExport), false);
  }
  const product = read("docs/product/dabangil-qf0a2-rights-time-model-identity-v1.md");
  assert.match(product, /does not fetch a live rights authority/);
  assert.match(product, /cannot detect a later revocation without a fresh authority snapshot/);
  assert.match(product, /QF-0B and QF-0I remain blocked/);
});
