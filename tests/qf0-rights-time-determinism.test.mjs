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
const MAX_CANONICAL_BYTES = 262_144;

function captureRejectedStringInspection(operation) {
  const descriptor = Object.getOwnPropertyDescriptor(String.prototype, "charCodeAt");
  assert.ok(descriptor && typeof descriptor.value === "function");
  let inspections = 0;
  let rejection;
  Object.defineProperty(String.prototype, "charCodeAt", {
    ...descriptor,
    value(index) {
      inspections += 1;
      return Reflect.apply(descriptor.value, this, [index]);
    },
  });
  try {
    operation();
  } catch (error) {
    rejection = error;
  } finally {
    Object.defineProperty(String.prototype, "charCodeAt", descriptor);
  }
  assert.ok(rejection instanceof Error, "operation must reject");
  return { inspections, rejection };
}

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
  assert.equal(contract.determinism.maximumCanonicalBytes, MAX_CANONICAL_BYTES);
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
  assert.deepEqual(contract.rightsTime.decisionBindingsExactly, [
    "decisionId",
    "decisionDigest",
    "evaluatedAt",
    "eligibilityInterval",
    "rightsManifestRef",
    "sourceClass",
    "purpose",
    "decisionStatus",
    "outcome",
    "policyVersion",
    "policyDigest",
    "policyValidFrom",
    "policyValidUntil",
    "denialReasons",
  ]);
  assert.equal(
    contract.successor.qf0BPublicationRequiresValidatedQf0AMergeReceipt,
    true,
  );
  assert.equal(
    contract.successor.qf0ICandidateIntegrationRequiresValidatedQf0AMergeReceipt,
    true,
  );
  assert.equal(contract.successor.automaticSuccessorStartAllowed, false);
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
  assert.equal(first, '{"a":{"alpha":null,"β":true},"z":1,"ä":2}');
  assert.equal(
    digestCanonicalJsonV1(input),
    "sha256:47bfb996512d74f9214b232b721f043944e631221371e6323645a4f0ae8a9caf",
  );
  assert.equal(
    manifest().manifestDigest,
    "sha256:40127413aa7a4e71128949823b1789d42bba2e3c9a7d80e8e1a5d2aa06aa87a7",
  );
  assert.equal(
    decision().decisionDigest,
    "sha256:24d1c7f1b614b722d2d2982def552eb858029b82827606abe910a0fc89f5b4da",
  );
});

test("QF0A-DETERMINISM-009 ignores object insertion order", () => {
  const first = { z: 3, a: 1, middle: { y: 2, b: 1 } };
  const second = { middle: { b: 1, y: 2 }, a: 1, z: 3 };
  assert.equal(canonicalizeBoundedJsonV1(first), canonicalizeBoundedJsonV1(second));
  assert.equal(digestCanonicalJsonV1(first), digestCanonicalJsonV1(second));
  assert.equal(manifest().manifestDigest, manifest().manifestDigest);
  assert.equal(decision().decisionDigest, decision().decisionDigest);
});

test("QF0A-DETERMINISM-009A preserves __proto__ as owned identity material", () => {
  const withPrototypeKey = Object.create(null);
  Object.defineProperty(withPrototypeKey, "__proto__", {
    value: { scope: "rights" },
    enumerable: true,
    configurable: true,
    writable: true,
  });
  assert.equal(
    canonicalizeBoundedJsonV1(withPrototypeKey),
    '{"__proto__":{"scope":"rights"}}',
  );
  assert.notEqual(digestCanonicalJsonV1(withPrototypeKey), digestCanonicalJsonV1({}));
});

test("QF0A-DETERMINISM-009B rejects unpaired-surrogate keys and values", () => {
  for (const surrogate of ["\ud800", "\ud801", "\udfff"]) {
    const keyed = Object.create(null);
    Object.defineProperty(keyed, surrogate, {
      value: true,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    assert.throws(() => canonicalizeBoundedJsonV1(keyed));
    assert.throws(() => canonicalizeBoundedJsonV1({ value: surrogate }));
    assert.throws(() => compareUtf8BytesV1(surrogate, "safe"));
  }
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

test("QF0A-BOUNDS-012A rejects sparse, symbol, accessor, and hidden shapes", () => {
  assert.throws(() => canonicalizeBoundedJsonV1(new Array(1)));
  assert.throws(() => canonicalizeBoundedJsonV1(Object.assign([null], { extra: true })));

  const symbolObject = { safe: true };
  symbolObject[Symbol("hidden")] = true;
  assert.throws(() => canonicalizeBoundedJsonV1(symbolObject));

  const hiddenObject = { safe: true };
  Object.defineProperty(hiddenObject, "hidden", { value: true, enumerable: false });
  assert.throws(() => canonicalizeBoundedJsonV1(hiddenObject));

  let getterExecuted = false;
  const accessorObject = {};
  Object.defineProperty(accessorObject, "unsafe", {
    get() {
      getterExecuted = true;
      return true;
    },
    enumerable: true,
  });
  assert.throws(() => canonicalizeBoundedJsonV1(accessorObject));
  assert.equal(getterExecuted, false);
  assert.notEqual(digestCanonicalJsonV1([null]), digestCanonicalJsonV1({ 0: null }));
});

test("QF0A-BOUNDS-012B applies byte and entry caps before serialization work", () => {
  const originalStringify = JSON.stringify;
  let stringifyCalled = false;
  JSON.stringify = (...arguments_) => {
    stringifyCalled = true;
    return originalStringify(...arguments_);
  };
  try {
    assert.throws(() => canonicalizeBoundedJsonV1("x".repeat(262_145)));
    assert.equal(stringifyCalled, false);
  } finally {
    JSON.stringify = originalStringify;
  }
  assert.throws(() => canonicalizeBoundedJsonV1(new Array(10_001)));
});

test("QF0A-CAPPED-015 bounds ASCII, BMP, and surrogate-pair rejection work", () => {
  const cases = [
    {
      label: "ASCII",
      value: "a".repeat(MAX_CANONICAL_BYTES * 4),
      expectedInspections: MAX_CANONICAL_BYTES - 1,
      maximumInspections: MAX_CANONICAL_BYTES + 1,
    },
    {
      label: "BMP",
      value: "\u0800".repeat(MAX_CANONICAL_BYTES * 2),
      expectedInspections: Math.floor((MAX_CANONICAL_BYTES - 2) / 3) + 1,
      maximumInspections: Math.ceil(MAX_CANONICAL_BYTES / 3) + 1,
    },
    {
      label: "SURROGATE_PAIR",
      value: "😀".repeat(MAX_CANONICAL_BYTES),
      expectedInspections: 2 * (Math.floor((MAX_CANONICAL_BYTES - 2) / 4) + 1),
      maximumInspections: Math.ceil(MAX_CANONICAL_BYTES / 2) + 1,
    },
  ];
  for (const { label, value, expectedInspections, maximumInspections } of cases) {
    assert.ok(value.length > MAX_CANONICAL_BYTES, label);
    const { inspections, rejection } = captureRejectedStringInspection(() =>
      canonicalizeBoundedJsonV1(value),
    );
    assert.match(rejection.message, /CANONICAL_BYTE_LIMIT_EXCEEDED/, label);
    assert.equal(inspections, expectedInspections, label);
    assert.ok(inspections <= maximumInspections, `${label}: ${inspections}`);
    assert.ok(inspections < value.length, label);
  }
});

test("QF0A-CAPPED-016 rejects malformed surrogates without scanning beyond the cap", () => {
  for (const malformed of ["prefix\ud800suffix", "prefix\udfffsuffix"]) {
    const { inspections, rejection } = captureRejectedStringInspection(() =>
      canonicalizeBoundedJsonV1(malformed),
    );
    assert.match(rejection.message, /UNPAIRED_SURROGATE/);
    assert.ok(inspections <= "prefix".length + 2);
  }

  const malformedAfterCap = `${"a".repeat(MAX_CANONICAL_BYTES * 2)}\ud800`;
  const { inspections, rejection } = captureRejectedStringInspection(() =>
    canonicalizeBoundedJsonV1(malformedAfterCap),
  );
  assert.match(rejection.message, /CANONICAL_BYTE_LIMIT_EXCEEDED/);
  assert.equal(inspections, MAX_CANONICAL_BYTES - 1);
  assert.ok(inspections <= MAX_CANONICAL_BYTES + 1);
  assert.ok(inspections < malformedAfterCap.indexOf("\ud800"));
});

test("QF0A-CAPPED-017 applies one cumulative capped budget to object keys", () => {
  const oversizedKey = "k".repeat(MAX_CANONICAL_BYTES * 2);
  const oversizedKeyObject = Object.create(null);
  Object.defineProperty(oversizedKeyObject, oversizedKey, {
    value: true,
    enumerable: true,
  });
  const oversizedResult = captureRejectedStringInspection(() =>
    canonicalizeBoundedJsonV1(oversizedKeyObject),
  );
  assert.match(oversizedResult.rejection.message, /CANONICAL_BYTE_LIMIT_EXCEEDED/);
  assert.ok(oversizedResult.inspections <= MAX_CANONICAL_BYTES + 1);
  assert.ok(oversizedResult.inspections < oversizedKey.length);

  const manyKeys = Object.create(null);
  let aggregateKeyCodeUnits = 0;
  for (let index = 0; index < 9_000; index += 1) {
    const key = `key_${String(index).padStart(4, "0")}_${"x".repeat(22)}`;
    aggregateKeyCodeUnits += key.length;
    Object.defineProperty(manyKeys, key, { value: null, enumerable: true });
  }
  assert.ok(aggregateKeyCodeUnits > MAX_CANONICAL_BYTES);
  const aggregateResult = captureRejectedStringInspection(() =>
    canonicalizeBoundedJsonV1(manyKeys),
  );
  assert.match(aggregateResult.rejection.message, /CANONICAL_BYTE_LIMIT_EXCEEDED/);
  assert.ok(aggregateResult.inspections <= MAX_CANONICAL_BYTES);
  assert.ok(aggregateResult.inspections < aggregateKeyCodeUnits);
});

test("QF0A-CAPPED-018 gates comparator encoding behind capped inspection", () => {
  const descriptor = Object.getOwnPropertyDescriptor(TextEncoder.prototype, "encode");
  assert.ok(descriptor && typeof descriptor.value === "function");
  let nativeEncodes = 0;
  Object.defineProperty(TextEncoder.prototype, "encode", {
    ...descriptor,
    value(...arguments_) {
      nativeEncodes += 1;
      return Reflect.apply(descriptor.value, this, arguments_);
    },
  });
  let result;
  try {
    result = captureRejectedStringInspection(() =>
      compareUtf8BytesV1("c".repeat(MAX_CANONICAL_BYTES * 2), "safe"),
    );
  } finally {
    Object.defineProperty(TextEncoder.prototype, "encode", descriptor);
  }
  assert.match(result.rejection.message, /CANONICAL_BYTE_LIMIT_EXCEEDED/);
  assert.equal(result.inspections, MAX_CANONICAL_BYTES + 1);
  assert.equal(nativeEncodes, 0);
});

test("QF0A-CAPPED-019 accounts exactly for JSON escapes at the boundary", () => {
  const escaped = '"\\\b\t\n\f\r\u0000';
  const escapedCanonical = canonicalizeBoundedJsonV1(escaped);
  assert.equal(escapedCanonical, JSON.stringify(escaped));
  assert.equal(new TextEncoder().encode(escapedCanonical).length, 22);

  const escapedTwoByteCount = (MAX_CANONICAL_BYTES - 2) / 2;
  const quoteBoundary = '"'.repeat(escapedTwoByteCount);
  assert.equal(
    new TextEncoder().encode(canonicalizeBoundedJsonV1(quoteBoundary)).length,
    MAX_CANONICAL_BYTES,
  );
  assert.throws(() => canonicalizeBoundedJsonV1(`${quoteBoundary}"`));

  const backslashBoundary = "\\".repeat(escapedTwoByteCount);
  assert.equal(
    new TextEncoder().encode(canonicalizeBoundedJsonV1(backslashBoundary)).length,
    MAX_CANONICAL_BYTES,
  );
  assert.throws(() => canonicalizeBoundedJsonV1(`${backslashBoundary}\\`));

  const sixByteControlCount = Math.floor((MAX_CANONICAL_BYTES - 2) / 6);
  const controlBoundary = `${"\u0000".repeat(sixByteControlCount)}aa`;
  assert.equal(
    new TextEncoder().encode(canonicalizeBoundedJsonV1(controlBoundary)).length,
    MAX_CANONICAL_BYTES,
  );
  assert.throws(() => canonicalizeBoundedJsonV1(`${controlBoundary}a`));
});

test("QF0A-CAPPED-020 preserves deterministic valid identities at the exact cap", () => {
  const boundaryValues = [
    "a".repeat(MAX_CANONICAL_BYTES - 2),
    `${"\u0800".repeat(87_380)}\u0080`,
    `${"😀".repeat(65_535)}\u0080`,
  ];
  for (const value of boundaryValues) {
    const first = canonicalizeBoundedJsonV1(value);
    const second = canonicalizeBoundedJsonV1(value);
    assert.equal(new TextEncoder().encode(first).length, MAX_CANONICAL_BYTES);
    assert.equal(first, second);
    assert.equal(digestCanonicalJsonV1(value), digestCanonicalJsonV1(value));
  }
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
