import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertQf0ATrustOnlyBoundaryV1,
  assertSourceEligibilityAtUseV1,
  canonicalizeBoundedJsonV1,
  compareUtf8BytesV1,
  createModelExecutionIdentityV1,
  createRightsManifestRefV1,
  createSourceEligibilityDecisionV1,
  digestCanonicalJsonV1,
  validateModelExecutionIdentityV1,
  validateRightsManifestRefV1,
  validateSourceEligibilityDecisionV1,
} from "../lib/question-foundry/quarantine/trust-core.ts";
import {
  QF0A_CONTRACT_VERSION,
  QF0A_DECISION_STATUSES,
  QF0A_MODEL_ROLES,
  QF0A_RIGHTS_STATUSES,
  QF0A_SOURCE_CLASSES,
} from "../lib/question-foundry/quarantine/trust-contracts.ts";

const ROOT = new URL("../", import.meta.url);
const POLICY_VERSION = "qf0-policy-v1";
const POLICY_DIGEST = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
const EVALUATED_AT = "2026-08-28T03:00:00.000Z";

function manifest(overrides = {}) {
  return createRightsManifestRefV1({
    manifestId: "rights-manifest-1",
    manifestVersionId: "v1",
    sourceClass: "INVERGE_ORIGINAL",
    status: "ACTIVE",
    permittedPurpose: "QUARANTINED_CANDIDATE_CREATION",
    validFrom: "2026-08-01T00:00:00.000Z",
    validUntil: "2026-09-01T00:00:00.000Z",
    policyVersion: POLICY_VERSION,
    policyDigest: POLICY_DIGEST,
    ...overrides,
  });
}

function decision(overrides = {}) {
  return createSourceEligibilityDecisionV1({
    sourceClass: "INVERGE_ORIGINAL",
    purpose: "QUARANTINED_CANDIDATE_CREATION",
    decisionStatus: "CURRENT",
    evaluatedAt: EVALUATED_AT,
    rightsManifestRef: manifest(),
    policyVersion: POLICY_VERSION,
    policyDigest: POLICY_DIGEST,
    policyValidFrom: "2026-08-15T00:00:00.000Z",
    policyValidUntil: "2026-09-15T00:00:00.000Z",
    ...overrides,
  });
}

function atUseInput(overrides = {}) {
  const sourceDecision = overrides.decision ?? decision();
  return {
    decision: sourceDecision,
    rightsManifestAtUse:
      overrides.rightsManifestAtUse ?? sourceDecision.rightsManifestRef,
    useAt: "2026-08-29T03:00:00.000Z",
    expectedSourceClass: "INVERGE_ORIGINAL",
    expectedPurpose: "QUARANTINED_CANDIDATE_CREATION",
    expectedPolicyVersion: POLICY_VERSION,
    expectedPolicyDigest: POLICY_DIGEST,
    ...overrides,
  };
}

test("QF0A-CONTRACT-001 fixes the exact trust-only six-path contract", async () => {
  const contract = JSON.parse(
    await readFile(
      new URL("config/dabangil-qf0-rights-time-determinism-v1.json", ROOT),
      "utf8",
    ),
  );
  assert.equal(contract.contractVersion, QF0A_CONTRACT_VERSION);
  assert.deepEqual(contract.contractsExactly, [
    "RightsManifestRefV1",
    "SourceEligibilityDecisionV1",
    "ModelExecutionIdentityV1",
  ]);
  assert.deepEqual(contract.sourceClassesExactly, [...QF0A_SOURCE_CLASSES]);
  assert.deepEqual(contract.rightsTime.rightsStatusesExactly, [
    ...QF0A_RIGHTS_STATUSES,
  ]);
  assert.deepEqual(contract.rightsTime.decisionStatusesExactly, [
    ...QF0A_DECISION_STATUSES,
  ]);
  assert.deepEqual(contract.modelIdentity.rolesExactly, [...QF0A_MODEL_ROLES]);
  assert.deepEqual(contract.ownedPathsExactly, [
    "docs/product/dabangil-qf0-rights-time-determinism-v1.md",
    "config/dabangil-qf0-rights-time-determinism-v1.json",
    "docs/qa/dabangil-qf0-rights-time-determinism-validation.md",
    "lib/question-foundry/quarantine/trust-contracts.ts",
    "lib/question-foundry/quarantine/trust-core.ts",
    "tests/qf0-rights-time-determinism.test.mjs",
  ]);
  assert.equal(
    Object.values(contract.authorizationBoundary).every((allowed) => allowed === false),
    true,
  );
});

test("QF0A-RIGHTS-002 passes ACTIVE rights within the derived interval", () => {
  const sourceDecision = decision();
  assert.equal(sourceDecision.outcome, "ELIGIBLE");
  assert.deepEqual(sourceDecision.eligibilityInterval, {
    validFrom: EVALUATED_AT,
    validUntil: "2026-09-01T00:00:00.000Z",
  });
  assert.deepEqual(
    assertSourceEligibilityAtUseV1(atUseInput({ decision: sourceDecision })),
    sourceDecision,
  );
});

test("QF0A-RIGHTS-003 rejects use after rights validUntil", () => {
  assert.throws(() =>
    assertSourceEligibilityAtUseV1(
      atUseInput({ useAt: "2026-09-01T00:00:00.001Z" }),
    ),
  );
});

test("QF0A-RIGHTS-004 rejects use before decision evaluation", () => {
  assert.throws(() =>
    assertSourceEligibilityAtUseV1(
      atUseInput({ useAt: "2026-08-28T02:59:59.999Z" }),
    ),
  );
});

test("QF0A-RIGHTS-005 rejects every non-active rights state", () => {
  for (const status of ["STALE", "DISPUTED", "BLOCKED", "REVOKED", "EXPIRED"]) {
    const denied = decision({ rightsManifestRef: manifest({ status }) });
    assert.equal(denied.outcome, "DENIED", status);
    assert.equal(denied.eligibilityInterval, null, status);
    assert.throws(
      () =>
        assertSourceEligibilityAtUseV1(
          atUseInput({ decision: denied, rightsManifestAtUse: denied.rightsManifestRef }),
        ),
      status,
    );
  }
});

test("QF0A-RIGHTS-006 rejects policy, source, and purpose drift", () => {
  assert.throws(() =>
    assertSourceEligibilityAtUseV1(
      atUseInput({ expectedPolicyVersion: "different-policy" }),
    ),
  );
  assert.throws(() =>
    assertSourceEligibilityAtUseV1(
      atUseInput({ expectedPolicyDigest: DIGEST_B }),
    ),
  );
  assert.throws(() =>
    assertSourceEligibilityAtUseV1(
      atUseInput({ expectedSourceClass: "RIGHTS_CLEARED_OFFICIAL" }),
    ),
  );
  assert.throws(() =>
    assertSourceEligibilityAtUseV1(
      atUseInput({ expectedPurpose: "UNDECLARED_PURPOSE" }),
    ),
  );

  const sourceMismatch = decision({
    rightsManifestRef: manifest({ sourceClass: "RIGHTS_CLEARED_OFFICIAL" }),
  });
  assert.equal(sourceMismatch.outcome, "DENIED");
  const policyMismatch = decision({
    rightsManifestRef: manifest({ policyDigest: DIGEST_B }),
  });
  assert.equal(policyMismatch.outcome, "DENIED");
});

test("QF0A-DIGEST-007 rejects modified manifest, decision, and model identities", () => {
  const changedManifest = structuredClone(manifest());
  changedManifest.manifestDigest = DIGEST_B;
  assert.throws(() => validateRightsManifestRefV1(changedManifest));

  const changedDecision = structuredClone(decision());
  changedDecision.decisionDigest = DIGEST_B;
  assert.throws(() => validateSourceEligibilityDecisionV1(changedDecision));

  const identity = createModelExecutionIdentityV1({
    role: "GENERATOR",
    providerId: "offline-provider-ref",
    modelId: "model-ref",
    modelVersion: "2026-08-28",
    modelArtifactDigest: POLICY_DIGEST,
    executionId: "execution-ref-1",
    executionArtifactDigest: DIGEST_B,
    configurationDigest: DIGEST_C,
    executedAt: EVALUATED_AT,
  });
  assert.deepEqual(validateModelExecutionIdentityV1(identity), identity);
  const changedIdentity = structuredClone(identity);
  changedIdentity.identityDigest = DIGEST_B;
  assert.throws(() => validateModelExecutionIdentityV1(changedIdentity));
});

test("QF0A-DETERMINISM-008 repeats byte-identical normalized output and digests", () => {
  const input = { z: 1, ä: 2, a: { β: true, alpha: null } };
  const first = canonicalizeBoundedJsonV1(input);
  const second = canonicalizeBoundedJsonV1(structuredClone(input));
  assert.equal(first, second);
  assert.equal(digestCanonicalJsonV1(input), digestCanonicalJsonV1(input));
  assert.equal(compareUtf8BytesV1("z", "ä"), -1);
});

test("QF0A-DETERMINISM-009 ignores object insertion order", () => {
  const first = { z: 3, a: 1, middle: { y: 2, b: 1 } };
  const second = { middle: { b: 1, y: 2 }, a: 1, z: 3 };
  assert.equal(canonicalizeBoundedJsonV1(first), canonicalizeBoundedJsonV1(second));
  assert.equal(digestCanonicalJsonV1(first), digestCanonicalJsonV1(second));
  assert.equal(manifest().manifestDigest, manifest().manifestDigest);
  assert.equal(decision().decisionDigest, decision().decisionDigest);
});

test("QF0A-DETERMINISM-010 remains identical across process locale settings", () => {
  const moduleUrl = new URL(
    "../lib/question-foundry/quarantine/trust-core.ts",
    import.meta.url,
  ).href;
  const program = `import { canonicalizeBoundedJsonV1, digestCanonicalJsonV1 } from ${JSON.stringify(moduleUrl)}; const value={z:1,"ä":2,a:{"β":3,alpha:4}}; process.stdout.write(canonicalizeBoundedJsonV1(value)+"\\n"+digestCanonicalJsonV1(value));`;
  const outputs = ["en_US.UTF-8", "sv_SE.UTF-8", "ko_KR.UTF-8"].map((locale) => {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "--input-type=module",
        "--eval",
        program,
      ],
      {
        cwd: new URL("../", import.meta.url),
        env: { ...process.env, LANG: locale, LC_ALL: locale },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  });
  assert.equal(new Set(outputs).size, 1);
});

test("QF0A-DETERMINISM-011 excludes locale APIs from implementation", async () => {
  const source = await readFile(
    new URL("lib/question-foundry/quarantine/trust-core.ts", ROOT),
    "utf8",
  );
  assert.doesNotMatch(source, /localeCompare|Intl\.Collator|toLocale/i);
});

test("QF0A-BOUNDS-012 rejects malformed time and non-finite or oversized JSON", () => {
  assert.throws(() =>
    createRightsManifestRefV1({
      manifestId: "rights",
      manifestVersionId: "v1",
      sourceClass: "INVERGE_ORIGINAL",
      status: "ACTIVE",
      permittedPurpose: "QUARANTINED_CANDIDATE_CREATION",
      validFrom: "not-a-time",
      validUntil: "2026-09-01T00:00:00.000Z",
      policyVersion: POLICY_VERSION,
      policyDigest: POLICY_DIGEST,
    }),
  );
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => canonicalizeBoundedJsonV1({ value }));
  }
  assert.throws(() => canonicalizeBoundedJsonV1({ body: "x".repeat(262_145) }));
  let nested = { leaf: true };
  for (let index = 0; index < 40; index += 1) nested = { nested };
  assert.throws(() => canonicalizeBoundedJsonV1(nested));
});

test("QF0A-SCOPE-013 defines no candidate, scarcity, release, bank, or learner contract", async () => {
  const [contractsSource, contract] = await Promise.all([
    readFile(new URL("lib/question-foundry/quarantine/trust-contracts.ts", ROOT), "utf8"),
    readFile(new URL("config/dabangil-qf0-rights-time-determinism-v1.json", ROOT), "utf8").then(JSON.parse),
  ]);
  const exports = [...contractsSource.matchAll(/export interface\s+(\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(exports, [
    "RightsManifestRefV1",
    "SourceEligibilityDecisionV1",
    "ModelExecutionIdentityV1",
  ]);
  assert.deepEqual(contract.excludedContractsExactly, [
    "QuarantinedQuestionCandidateV1",
    "BodylessBankScarcityEventV1",
    "ReleaseArtifactV1",
    "LearnerAssignmentV1",
    "BankAssignmentV1",
  ]);
  assert.doesNotMatch(contractsSource, /releaseStatus|bankAssignment|learnerAssignment/);
});

test("QF0A-BOUNDARY-014 has no execution, network, database, or remote mutation path", async () => {
  assert.deepEqual(assertQf0ATrustOnlyBoundaryV1(), {
    contractVersion: QF0A_CONTRACT_VERSION,
    modelExecution: false,
    network: false,
    database: false,
    persistence: false,
    runtime: false,
  });
  const [contractsSource, coreSource] = await Promise.all([
    readFile(new URL("lib/question-foundry/quarantine/trust-contracts.ts", ROOT), "utf8"),
    readFile(new URL("lib/question-foundry/quarantine/trust-core.ts", ROOT), "utf8"),
  ]);
  const imports = [...coreSource.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(imports, ["node:crypto", "./trust-contracts"]);
  for (const source of [contractsSource, coreSource]) {
    assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\/|@supabase|\bstripe\b|\baxios\b|\bprisma\b/i);
  }
});
