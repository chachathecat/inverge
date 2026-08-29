import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as qf0a1 from "../lib/question-foundry/quarantine/bounded-canonical-json.ts";
import * as qf0a2Contracts from "../lib/question-foundry/quarantine/trust-contracts.ts";
import * as qf0a2 from "../lib/question-foundry/quarantine/trust-core.ts";
import * as qf0b from "../lib/question-foundry/quarantine/scarcity-core.ts";
import * as qf0iContracts from "../lib/question-foundry/quarantine/candidate-contracts.ts";
import * as qf0i from "../lib/question-foundry/quarantine/candidate-core.ts";
import * as contracts from "../lib/question-foundry/similarity/preparation-contracts.ts";
import * as core from "../lib/question-foundry/similarity/preparation-core.ts";

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "4503afc74cf782c18437d6c5031541ef9786eed9";
const BASE_TREE = "b5d3596ebebc50142b01a63d731a4951288d1499";
const QF0_SHA = "7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2";
const QF0_TREE = "9ad60b9ece4931d7172cdc0462e079ed8d9a53fa";
const CONFIG_PATH = "config/dabangil-qf-s1a-mandatory-corpus-preparation-v1.json";
const CONTRACTS_PATH = "lib/question-foundry/similarity/preparation-contracts.ts";
const CORE_PATH = "lib/question-foundry/similarity/preparation-core.ts";

const EXACT_PATHS = [
  "docs/product/dabangil-qf-s1a-mandatory-corpus-preparation-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-qf-s1a-mandatory-corpus-preparation-validation.md",
  CONTRACTS_PATH,
  CORE_PATH,
  "tests/qf-s1a-mandatory-corpus-preparation.test.mjs",
];

const QF0A1_PATHS = [
  "config/dabangil-qf0a1-bounded-canonical-json-v1.json",
  "docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md",
  "docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md",
  "lib/question-foundry/quarantine/bounded-canonical-json.ts",
  "tests/qf0a1-bounded-canonical-json.test.mjs",
];

const QF0I_PATHS = [
  "docs/product/dabangil-question-foundry-quarantine-core-v1.md",
  "config/dabangil-question-foundry-quarantine-core-v1.json",
  "docs/qa/dabangil-question-foundry-quarantine-core-validation.md",
  "lib/question-foundry/quarantine/candidate-contracts.ts",
  "lib/question-foundry/quarantine/candidate-core.ts",
  "tests/question-foundry-quarantine-core.test.mjs",
];

function read(path, encoding = "utf8") {
  return readFileSync(new URL(path, ROOT_URL), encoding);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digestText(value) {
  return `sha256:${sha256(value)}`;
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
}

function opaqueReferenceId(seed) {
  return `qfsr_${sha256(`reference:${seed}`)}`;
}

function opaqueCorpusId(seed) {
  return `qfsc_${sha256(`corpus:${seed}`)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function utf8Order(values, key = (value) => value) {
  return [...values].sort((left, right) =>
    qf0a1.compareUtf8BytesV1(key(left), key(right)),
  );
}

function git(...arguments_) {
  const result = spawnSync("git", arguments_, { cwd: ROOT_PATH, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
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
    for (const path of git(...arguments_).split(/\r?\n/u).filter(Boolean)) paths.add(path);
  }
  return [...paths].sort();
}

function gitPathObjects(reference, paths) {
  return paths.map((path) => {
    const output = git("ls-tree", reference, "--", path);
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/u.exec(output);
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
    permittedPurpose: qf0a2Contracts.QF0A2_PURPOSE,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.999Z",
    policyVersion: "policy.qfs1a.fixture.v1",
    policyDigest: digest("a"),
    ...overrides,
  };
}

function modelMaterial(role, token) {
  return {
    contractVersion: "ModelExecutionIdentityV1",
    role,
    providerId: "provider.fixture",
    modelId: "model.fixture-v1",
    modelVersion: "2026-08-29",
    modelArtifactDigest: digest("b"),
    executionId: `exec_${token.repeat(32)}`,
    executionArtifactDigest: digest(token),
    configurationDigest: digest("c"),
    executedAt: "2026-06-01T10:00:00.000Z",
  };
}

function candidateForContentDigest(candidateContentDigest) {
  const rights = qf0a2.createRightsManifestRefV1(rightsMaterial());
  const sourceDecision = qf0a2.createSourceEligibilityDecisionV1({
    contractVersion: "SourceEligibilityDecisionV1",
    sourceClass: rights.sourceClass,
    purpose: rights.permittedPurpose,
    decisionStatus: "CURRENT",
    evaluatedAt: "2026-05-01T00:00:00.000Z",
    rightsManifest: rights,
    policyVersion: rights.policyVersion,
    policyDigest: rights.policyDigest,
    policyValidFrom: "2026-01-15T00:00:00.000Z",
    policyValidUntil: "2026-11-30T23:59:59.999Z",
  });
  return qf0i.createQuarantinedQuestionCandidateV1({
    contractVersion: "QuarantinedQuestionCandidateV1",
    candidateContentDigest,
    blueprintRef: qf0b.createOpaqueRegistryRefV1(refMaterial("BLUEPRINT", "4")),
    answerSpecificationRef: qf0b.createOpaqueRegistryRefV1(
      refMaterial("ANSWER_SPECIFICATION", "5"),
    ),
    validatorProfileRefs: [
      qf0b.createOpaqueRegistryRefV1(refMaterial("VALIDATOR_PROFILE", "6")),
    ],
    policyRef: qf0b.createOpaqueRegistryRefV1(
      refMaterial("POLICY", "7", { objectDigest: sourceDecision.policyDigest }),
    ),
    sourceDecision,
    rightsManifestAtUse: rights,
    generatorExecution: qf0a2.createModelExecutionIdentityV1(
      modelMaterial("GENERATOR", "3"),
    ),
    independentExecutions: [],
    createdAt: "2026-06-01T11:00:00.000Z",
  });
}

function bodyPart(partId, partKind, bodyText, overrides = {}) {
  return {
    partId,
    partKind,
    bodyDigest: digestText(bodyText),
    bodyText,
    ...overrides,
  };
}

function bodyManifest(parts, domain) {
  const ordered = utf8Order(parts, (part) => `${part.partId}/${part.bodyDigest}`);
  return qf0a1.digestCanonicalJsonV1({
    domain,
    parts: ordered.map(({ partId, partKind, bodyDigest }) => ({
      partId,
      partKind,
      bodyDigest,
    })),
  });
}

function referenceFixture({
  referenceId,
  parts,
  purpose = "PROTECTED_EXPRESSION_GUARD",
  sourceClass = "RIGHTS_UNKNOWN",
  version = "v1",
}) {
  const closedReferenceId = /^qfsr_[a-f0-9]{64}$/u.test(referenceId)
    ? referenceId
    : opaqueReferenceId(referenceId);
  const manifestDigest = bodyManifest(parts, "QFS1_REFERENCE_BODY_MANIFEST_V1");
  const referenceDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS1_REFERENCE_IDENTITY_V1",
    referenceId: closedReferenceId,
    purpose,
    sourceClass,
    version,
    manifestDigest,
  });
  return {
    referenceId: closedReferenceId,
    referenceDigest,
    purpose,
    sourceClass,
    version,
    parts,
    manifestDigest,
  };
}

function corpusFixture(references, version = "v1") {
  const corpusId = opaqueCorpusId("fixture");
  const ordered = utf8Order(
    references,
    (reference) => `${reference.referenceDigest}/${reference.referenceId}`,
  );
  const corpusManifestDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS1_REFERENCE_CORPUS_MANIFEST_V1",
    corpusId,
    version,
    references: ordered.map((reference) => ({
      referenceId: reference.referenceId,
      referenceDigest: reference.referenceDigest,
      purpose: reference.purpose,
      sourceClass: reference.sourceClass,
      version: reference.version,
      manifestDigest: reference.manifestDigest,
      partCount: reference.parts.length,
    })),
  });
  return {
    contractVersion: "SimilarityReferenceCorpusV1",
    corpusId,
    version,
    references,
    corpusManifestDigest,
  };
}

function preparationInput(candidateParts, references = []) {
  const candidateBodyManifestDigest = bodyManifest(
    candidateParts,
    "QFS1_CANDIDATE_BODY_MANIFEST_V1",
  );
  return {
    contractVersion: "SimilarityCorpusPreparationInputV1",
    candidate: candidateForContentDigest(candidateBodyManifestDigest),
    candidateParts,
    corpus: corpusFixture(references),
  };
}

function prepare(candidateParts, references = []) {
  return core.prepareSimilarityCorpusV1(preparationInput(candidateParts, references));
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertDeepFrozen(descriptor.value, seen);
  }
}

test("QFS1A-CONTRACT-001 binds the exact six-path source-only candidate", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(config.base, { sha: BASE_SHA, tree: BASE_TREE });
  assert.equal(git("rev-parse", BASE_SHA), BASE_SHA);
  assert.equal(git("show", "-s", "--format=%T", BASE_SHA), BASE_TREE);
  assert.equal(git("merge-base", "HEAD", BASE_SHA), BASE_SHA);
  git("merge-base", "--is-ancestor", BASE_SHA, "HEAD");
  assert.equal(config.tracking.closesIssue, 871);
  assert.equal(config.tracking.qfS1Umbrella, 867);
  assert.deepEqual(config.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(config.boundary.remoteMutation, "ZERO");
  assert.equal(config.boundary.productionMutation, "ZERO");
});

test("QFS1A-DEPENDENCY-002 recomputes exact QF-0A1 and QF-0I identities", () => {
  const dependency = contracts.QFS1A_QF0_DEPENDENCY_RECEIPT;
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(config.qf0Dependency, {
    ...clone(dependency),
    driftDisposition: "FAIL_CLOSED",
  });
  assert.equal(git("rev-parse", QF0_SHA), QF0_SHA);
  assert.equal(git("show", "-s", "--format=%T", QF0_SHA), QF0_TREE);
  assert.equal(
    sha256(read(QF0A1_PATHS[0], null)),
    dependency.qf0a1ConfigSha256,
  );
  assert.equal(
    sha256(read(QF0A1_PATHS[3], null)),
    dependency.qf0a1ImplementationSha256,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(gitPathObjects(QF0_SHA, QF0A1_PATHS)),
    dependency.qf0a1FivePathIdentity,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.qf0a1SourceOnlyBoundaryReceiptDigest,
  );
  assert.deepEqual(Object.keys(qf0a1), dependency.qf0a1ExportsExactly);
  assert.equal(sha256(read(QF0I_PATHS[1], null)), dependency.qf0iConfigSha256);
  assert.equal(
    sha256(read(QF0I_PATHS[3], null)),
    dependency.qf0iCandidateContractsSha256,
  );
  assert.equal(
    sha256(read(QF0I_PATHS[4], null)),
    dependency.qf0iCandidateCoreSha256,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(gitPathObjects(QF0_SHA, QF0I_PATHS)),
    dependency.qf0iSixPathIdentity,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.qf0iSourceOnlyBoundaryReceiptDigest,
  );
  assert.deepEqual(Object.keys(qf0iContracts), dependency.qf0iContractExportsExactly);
  assert.deepEqual(Object.keys(qf0i), dependency.qf0iCoreExportsExactly);
});

test("QFS1A-SURFACE-003 freezes only mandatory preparation exports and limits", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(Object.keys(core), ["prepareSimilarityCorpusV1"]);
  assert.deepEqual(Object.keys(contracts), [
    "QFS1A_BODY_PART_KINDS",
    "QFS1A_CONTRACT_VERSION",
    "QFS1A_LIMITS",
    "QFS1A_QF0_DEPENDENCY_RECEIPT",
    "QFS1A_REFERENCE_PURPOSES",
    "QFS1A_REFERENCE_SOURCE_CLASSES",
    "QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ]);
  assert.deepEqual(contracts.QFS1A_LIMITS, {
    contractVersion: "QFS1AMandatorySimilarityCorpusPreparationV1",
    maxCandidateParts: 16,
    maxCorpusReferences: 64,
    maxPartsPerReference: 16,
    maxCharactersPerBody: 32_768,
    maxAggregateInspectedCharacters: 262_144,
    maxNormalizedCharactersPerBody: 32_768,
    maxAggregateNormalizedCharacters: 262_144,
    maxTokensRetainedPerBody: 256,
    maxTotalWorkUnits: 1_048_576,
    fixedReferenceOverheadWorkUnits: 64,
    callerOverride: false,
  });
  const limitsWithoutVersion = { ...contracts.QFS1A_LIMITS };
  delete limitsWithoutVersion.contractVersion;
  assert.deepEqual(config.limits, limitsWithoutVersion);
  assert.deepEqual(config.publicExportsExactly, [
    ...contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly,
  ]);
  assert.deepEqual(config.input.bodyPartKindsExactly, [
    ...contracts.QFS1A_BODY_PART_KINDS,
  ]);
  assert.deepEqual(config.input.referencePurposesExactly, [
    ...contracts.QFS1A_REFERENCE_PURPOSES,
  ]);
  assert.deepEqual(config.input.referenceSourceClassesExactly, [
    ...contracts.QFS1A_REFERENCE_SOURCE_CLASSES,
  ]);
  assert.equal(
    config.boundary.receiptDigest,
    qf0a1.digestCanonicalJsonV1(
      clone(contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ),
  );
  const serialized = JSON.stringify(contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT);
  assert.doesNotMatch(serialized, /CLEAR|BLOCKED|REVIEW_REQUIRED|generatedWindows/u);
});

test("QFS1A-PREPARE-004 prepares every declared body with exact accounting", () => {
  const candidateParts = [
    bodyPart("part_stem", "QUESTION_STEM", "Coastal Parcel 2026 value"),
    bodyPart("part_answer", "ANSWER_BODY", "Income 400 and terminal 500"),
  ];
  const references = [
    referenceFixture({
      referenceId: "one",
      parts: [bodyPart("part_ref", "EXPLANATION", "Unrelated orchard 77 evidence")],
    }),
    referenceFixture({
      referenceId: "two",
      purpose: "PRIVATE_SOURCE_GUARD",
      sourceClass: "USER_PRIVATE_ONLY",
      parts: [bodyPart("part_ref2", "RUBRIC", "Private source guard text")],
    }),
  ];
  const result = prepare(candidateParts, references);
  assert.deepEqual(result.counts, {
    candidatePartCount: 2,
    referenceCount: 2,
    referencePartCount: 2,
    preparedBodyCount: 4,
  });
  assert.equal(result.candidateSequences.length, 2);
  assert.equal(result.referenceSequences.length, 2);
  assert.equal(
    result.workAccounting.fixedReferenceOverheadUnits,
    2 * contracts.QFS1A_LIMITS.fixedReferenceOverheadWorkUnits,
  );
  assert.equal(
    result.workAccounting.remainingOptionalWorkUnits,
    contracts.QFS1A_LIMITS.maxTotalWorkUnits -
      result.workAccounting.mandatoryTotalWorkUnits,
  );
  assert.equal(
    result.workAccounting.mandatoryTotalWorkUnits,
    result.workAccounting.fixedReferenceOverheadUnits +
      result.workAccounting.originalCharacters +
      result.workAccounting.normalizedCharacters +
      result.workAccounting.observedTokens +
      result.workAccounting.retainedTokens,
  );
});

test("QFS1A-DETERMINISM-005 candidate, part, and reference order do not alter preparation", () => {
  const candidateParts = [
    bodyPart("part_b", "QUESTION_OPTION", "Second bounded candidate part"),
    bodyPart("part_a", "QUESTION_STEM", "First bounded candidate part"),
  ];
  const references = [
    referenceFixture({
      referenceId: "z",
      parts: [
        bodyPart("part_z2", "RUBRIC", "Z second"),
        bodyPart("part_z1", "EXPLANATION", "Z first"),
      ],
    }),
    referenceFixture({
      referenceId: "a",
      parts: [bodyPart("part_a1", "QUESTION_STEM", "A reference")],
    }),
  ];
  const forward = prepare(candidateParts, references);
  const previous = process.env.LC_ALL;
  process.env.LC_ALL = "tr_TR.UTF-8";
  try {
    const reversed = prepare(
      [...candidateParts].reverse(),
      [...references]
        .reverse()
        .map((reference) => ({ ...reference, parts: [...reference.parts].reverse() })),
    );
    assert.deepEqual(reversed, forward);
  } finally {
    if (previous === undefined) delete process.env.LC_ALL;
    else process.env.LC_ALL = previous;
  }
});

test("QFS1A-LIMIT-006 exact aggregate original-character boundary passes and +1 fails", () => {
  const exactParts = Array.from({ length: 8 }, (_, index) =>
    bodyPart(
      `part_exact_${index}`,
      "SUPPORTING_MATERIAL",
      String.fromCharCode(97 + index).repeat(32_768),
    ),
  );
  const exact = prepare(exactParts);
  assert.equal(exact.workAccounting.originalCharacters, 262_144);
  assert.throws(
    () => prepare([...exactParts, bodyPart("part_plus", "RUBRIC", "x")]),
    /QFS1A_FAIL_CLOSED:AGGREGATE_CHARACTER_LIMIT_EXCEEDED/u,
  );
});

test("QFS1A-LIMIT-007 exact aggregate normalized boundary passes and +1 fails", () => {
  const expanding = "\ufb03";
  const parts = [
    ...Array.from({ length: 8 }, (_, index) =>
      bodyPart(`part_norm_${index}`, "SUPPORTING_MATERIAL", expanding.repeat(10_000)),
    ),
    bodyPart("part_norm_tail", "RUBRIC", `${expanding.repeat(7_381)}x`),
  ];
  const exact = prepare(parts);
  assert.equal(exact.workAccounting.normalizedCharacters, 262_144);
  const plusOne = [...parts];
  plusOne[8] = bodyPart(
    "part_norm_tail",
    "RUBRIC",
    `${expanding.repeat(7_381)}xx`,
  );
  assert.throws(
    () => prepare(plusOne),
    /QFS1A_FAIL_CLOSED:AGGREGATE_NORMALIZED_CHARACTER_LIMIT_EXCEEDED/u,
  );
});

test("QFS1A-NORMALIZE-008 NFKC expansion is bounded and fully charged", () => {
  const text = "\ufb03".repeat(1_000);
  const result = prepare([bodyPart("part_nfkc", "QUESTION_STEM", text)]);
  assert.equal(result.workAccounting.originalCharacters, 1_000);
  assert.equal(result.workAccounting.normalizedCharacters, 3_000);
  assert.equal(result.candidateSequences[0].tokens[0].value.length, 3_000);
  const overflowing = "\ufb03".repeat(10_923);
  assert.ok(overflowing.length <= contracts.QFS1A_LIMITS.maxCharactersPerBody);
  assert.throws(
    () => prepare([bodyPart("part_nfkc_over", "QUESTION_STEM", overflowing)]),
    /QFS1A_FAIL_CLOSED:NORMALIZED_CHARACTER_LIMIT_EXCEEDED/u,
  );
});

test("QFS1A-LIMIT-009 per-body character and token overflow fail closed", () => {
  assert.throws(
    () =>
      prepare([
        bodyPart(
          "part_body_over",
          "QUESTION_STEM",
          "x".repeat(contracts.QFS1A_LIMITS.maxCharactersPerBody + 1),
        ),
      ]),
    /CHARACTER_LIMIT_EXCEEDED/u,
  );
  const tokens = Array.from({ length: 257 }, (_, index) => `word${index}`).join(" ");
  assert.throws(
    () => prepare([bodyPart("part_token_over", "QUESTION_STEM", tokens)]),
    /QFS1A_FAIL_CLOSED:BODY_TOKEN_LIMIT_EXCEEDED/u,
  );
});

test("QFS1A-UNICODE-010 malformed high and low surrogates fail closed", () => {
  assert.throws(
    () => prepare([bodyPart("part_high", "QUESTION_STEM", "bad\ud800")]),
    /QFS1A_FAIL_CLOSED:UNPAIRED_HIGH_SURROGATE/u,
  );
  assert.throws(
    () => prepare([bodyPart("part_low", "QUESTION_STEM", "bad\udc00")]),
    /QFS1A_FAIL_CLOSED:UNPAIRED_LOW_SURROGATE/u,
  );
});

test("QFS1A-BINDING-011 body digest and candidate-content cross-binding drift fail", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", "Bound candidate text");
  const input = preparationInput([part]);
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        candidateParts: [{ ...part, bodyDigest: digest("f") }],
      }),
    /BODY_DIGEST_MISMATCH|CANDIDATE_CONTENT_DIGEST_CROSS_BINDING_FAILED/u,
  );
  const otherPart = bodyPart("part_candidate", "QUESTION_STEM", "Other valid text");
  assert.throws(
    () => core.prepareSimilarityCorpusV1({ ...input, candidateParts: [otherPart] }),
    /CANDIDATE_CONTENT_DIGEST_CROSS_BINDING_FAILED/u,
  );
});

test("QFS1A-BINDING-012 reference manifest and identity drift fail", () => {
  const candidate = [bodyPart("part_candidate", "QUESTION_STEM", "Candidate")];
  const reference = referenceFixture({
    referenceId: "drift",
    parts: [bodyPart("part_reference", "QUESTION_STEM", "Reference")],
  });
  const manifestDrift = { ...reference, manifestDigest: digest("0") };
  assert.throws(
    () => core.prepareSimilarityCorpusV1(preparationInput(candidate, [manifestDrift])),
    /QFS1A_FAIL_CLOSED:REFERENCE_0_MANIFEST_DRIFT/u,
  );
  const identityDrift = { ...reference, referenceDigest: digest("0") };
  assert.throws(
    () => core.prepareSimilarityCorpusV1(preparationInput(candidate, [identityDrift])),
    /QFS1A_FAIL_CLOSED:REFERENCE_0_IDENTITY_DRIFT/u,
  );
});

test("QFS1A-BINDING-013 corpus manifest drift fails", () => {
  const candidate = [bodyPart("part_candidate", "QUESTION_STEM", "Candidate")];
  const input = preparationInput(candidate, []);
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        corpus: { ...input.corpus, corpusManifestDigest: digest("0") },
      }),
    /QFS1A_FAIL_CLOSED:CORPUS_MANIFEST_DRIFT/u,
  );
});

test("QFS1A-ACCOUNTING-014 every short reference pays fixed mandatory overhead", () => {
  const candidate = [bodyPart("part_candidate", "QUESTION_STEM", "Candidate")];
  const references = Array.from({ length: 64 }, (_, index) =>
    referenceFixture({
      referenceId: `short_${index}`,
      parts: [bodyPart("part_short", "QUESTION_STEM", "x")],
    }),
  );
  const result = prepare(candidate, references);
  assert.equal(result.counts.referenceCount, 64);
  assert.equal(
    result.workAccounting.fixedReferenceOverheadUnits,
    64 * contracts.QFS1A_LIMITS.fixedReferenceOverheadWorkUnits,
  );
  assert.equal(result.counts.preparedBodyCount, 65);
});

test("QFS1A-SHAPE-015 proxies fail without traps and accessors fail without reads", () => {
  let traps = 0;
  const proxy = new Proxy({}, {
    getPrototypeOf(target) {
      traps += 1;
      return Reflect.getPrototypeOf(target);
    },
    ownKeys(target) {
      traps += 1;
      return Reflect.ownKeys(target);
    },
  });
  assert.throws(
    () => core.prepareSimilarityCorpusV1(proxy),
    /QFS1A_FAIL_CLOSED:PREPARATION_INPUT_PROXY_UNSUPPORTED/u,
  );
  assert.equal(traps, 0);

  const part = bodyPart("part_candidate", "QUESTION_STEM", "Candidate");
  const input = preparationInput([part]);
  let reads = 0;
  const accessor = { ...part };
  Object.defineProperty(accessor, "bodyText", {
    enumerable: true,
    get() {
      reads += 1;
      return "must not execute";
    },
  });
  assert.throws(
    () => core.prepareSimilarityCorpusV1({ ...input, candidateParts: [accessor] }),
    /QFS1A_FAIL_CLOSED:CANDIDATE_PART_0_DATA_PROPERTY_REQUIRED/u,
  );
  assert.equal(reads, 0);
});

test("QFS1A-SHAPE-016 symbols, sparse arrays, and hostile prototypes fail", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", "Candidate");
  const input = preparationInput([part]);
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        candidateParts: [{ ...part, [Symbol("hidden")]: "secret" }],
      }),
    /QFS1A_FAIL_CLOSED:CANDIDATE_PART_0_SYMBOL_KEY_UNSUPPORTED/u,
  );
  const sparse = new Array(2);
  sparse[0] = part;
  assert.throws(
    () => core.prepareSimilarityCorpusV1({ ...input, candidateParts: sparse }),
    /QFS1A_FAIL_CLOSED:CANDIDATE_PARTS_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  const hostile = Object.assign(Object.create({ inherited: true }), part);
  assert.throws(
    () => core.prepareSimilarityCorpusV1({ ...input, candidateParts: [hostile] }),
    /QFS1A_FAIL_CLOSED:CANDIDATE_PART_0_PROTOTYPE_UNSUPPORTED/u,
  );
});

test("QFS1A-COUNT-017 excessive reference count fails before body access", () => {
  const candidate = [bodyPart("part_candidate", "QUESTION_STEM", "Candidate")];
  const base = preparationInput(candidate, []);
  let reads = 0;
  const references = Array.from({ length: 65 }, (_, index) => ({
    referenceId: opaqueReferenceId(`over_${index}`),
    referenceDigest: digest("1"),
    purpose: "PROTECTED_EXPRESSION_GUARD",
    sourceClass: "RIGHTS_UNKNOWN",
    version: "v1",
    parts: [
      Object.defineProperty(
        {
          partId: "part_ref",
          partKind: "QUESTION_STEM",
          bodyDigest: digest("2"),
        },
        "bodyText",
        {
          enumerable: true,
          get() {
            reads += 1;
            return "must not execute";
          },
        },
      ),
    ],
    manifestDigest: digest("3"),
  }));
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...base,
        corpus: { ...base.corpus, references },
      }),
    /QFS1A_FAIL_CLOSED:CORPUS_REFERENCES_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  assert.equal(reads, 0);
});

test("QFS1A-COUNT-017A every nested part count closes before any body access", () => {
  let reads = 0;
  const candidatePart = Object.defineProperty(
    {
      partId: "part_candidate",
      partKind: "QUESTION_STEM",
      bodyDigest: digest("1"),
    },
    "bodyText",
    {
      enumerable: true,
      get() {
        reads += 1;
        return "must not execute";
      },
    },
  );
  const validPart = bodyPart("part_ref", "QUESTION_STEM", "x");
  const base = preparationInput(
    [bodyPart("part_candidate", "QUESTION_STEM", "candidate")],
    [],
  );
  const oversizedReference = {
    referenceId: opaqueReferenceId("oversized_parts"),
    referenceDigest: digest("2"),
    purpose: "PROTECTED_EXPRESSION_GUARD",
    sourceClass: "RIGHTS_UNKNOWN",
    version: "v1",
    parts: Array.from({ length: 17 }, (_, index) => ({
      ...validPart,
      partId: `part_ref_${index}`,
    })),
    manifestDigest: digest("3"),
  };
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...base,
        candidateParts: [candidatePart],
        corpus: { ...base.corpus, references: [oversizedReference] },
      }),
    /QFS1A_FAIL_CLOSED:REFERENCE_0_PARTS_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  assert.equal(reads, 0);
});

test("QFS1A-IMMUTABLE-018 every prepared sequence is deeply immutable", () => {
  const result = prepare(
    [bodyPart("part_candidate", "QUESTION_STEM", "Candidate 100 value")],
    [
      referenceFixture({
        referenceId: "immutable",
        parts: [bodyPart("part_ref", "ANSWER_BODY", "Reference 200 value")],
      }),
    ],
  );
  assertDeepFrozen(result);
  assert.throws(() => {
    result.candidateSequences[0].tokens.push({});
  }, TypeError);
  assert.throws(() => {
    result.referenceSequences[0].parts[0].tokens[0].value = "changed";
  }, TypeError);
});

test("QFS1A-OUTPUT-019 output has no body, excerpt, match, outcome, review, or release field", () => {
  const result = prepare([
    bodyPart(
      "part_candidate",
      "QUESTION_STEM",
      "Secret candidate expression with bounded derived tokens",
    ),
  ]);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(
    serialized,
    /bodyText|rawBody|excerpt|matchKind|outcome|reviewDigest|releaseStatus|learnerAssignment|bankAssignment/u,
  );
  assert.deepEqual(Object.keys(result), [
    "contractVersion",
    "candidateId",
    "candidateDigest",
    "candidateBodyManifestDigest",
    "corpusId",
    "corpusVersion",
    "corpusManifestDigest",
    "candidateNormalizedSequenceDigest",
    "counts",
    "candidateSequences",
    "referenceSequences",
    "workAccounting",
    "preparationDigest",
  ]);
});

test("QFS1A-SOURCE-020 core implements no optional windows, comparisons, matches, or outcomes", () => {
  const source = read(CORE_PATH);
  assert.doesNotMatch(
    source,
    /generateLexicalWindow|generatedWindows|comparisonWorkUnits|createMatch|matchKind|reviewDigest|\boutcome\b/u,
  );
  assert.doesNotMatch(source, /localeCompare|Intl\.Collator/u);
  assert.equal(contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.windowAuthorityAbsent, true);
  assert.equal(contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.comparisonAuthorityAbsent, true);
  assert.equal(contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.matchAuthorityAbsent, true);
  assert.equal(contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.reviewOutcomeAuthorityAbsent, true);
});

test("QFS1A-DIGEST-021 exact semantic input has one stable preparation digest", () => {
  const candidate = [bodyPart("part_candidate", "QUESTION_STEM", "Stable candidate")];
  const reference = referenceFixture({
    referenceId: "stable",
    parts: [bodyPart("part_reference", "QUESTION_STEM", "Stable reference")],
  });
  const first = prepare(candidate, [reference]);
  const second = prepare(candidate, [reference]);
  assert.equal(first.preparationDigest, second.preparationDigest);
  assert.deepEqual(first, second);
  const changed = prepare([
    bodyPart("part_candidate", "QUESTION_STEM", "Stable candidate changed"),
  ], [reference]);
  assert.notEqual(changed.preparationDigest, first.preparationDigest);
});

test("QFS1A-COMPARABLE-021A normalized-content digests ignore provenance but bind content", () => {
  const sharedText = "Ｃｏａｓｔａｌ PARCEL 2026 value";
  const candidatePart = bodyPart("part_candidate_origin", "QUESTION_STEM", sharedText);
  const matchingReference = referenceFixture({
    referenceId: "comparable_one",
    parts: [
      bodyPart(
        "part_unrelated_reference_identity",
        "QUESTION_STEM",
        "coastal parcel 2026 VALUE",
      ),
    ],
  });
  const changedReference = referenceFixture({
    referenceId: "comparable_two",
    parts: [
      bodyPart(
        "part_other_reference_identity",
        "QUESTION_STEM",
        "coastal parcel 2027 value",
      ),
    ],
  });
  const result = prepare(candidatePart ? [candidatePart] : [], [
    matchingReference,
    changedReference,
  ]);
  const matching = result.referenceSequences.find(
    (reference) => reference.referenceId === matchingReference.referenceId,
  );
  const changed = result.referenceSequences.find(
    (reference) => reference.referenceId === changedReference.referenceId,
  );
  assert.ok(matching);
  assert.ok(changed);
  assert.equal(
    result.candidateSequences[0].normalizedSequenceDigest,
    matching.parts[0].normalizedSequenceDigest,
  );
  assert.equal(
    result.candidateNormalizedSequenceDigest,
    matching.normalizedSequenceDigest,
  );
  assert.notEqual(
    result.candidateSequences[0].normalizedSequenceDigest,
    changed.parts[0].normalizedSequenceDigest,
  );
  assert.notEqual(
    result.candidateNormalizedSequenceDigest,
    changed.normalizedSequenceDigest,
  );
});

test("QFS1A-ORDER-021B aggregate digest preserves canonical structured part order", () => {
  const first = prepare([
    bodyPart("part_a", "QUESTION_STEM", "first structured body"),
    bodyPart("part_b", "QUESTION_STEM", "second structured body"),
  ]);
  const moved = prepare([
    bodyPart("part_a", "QUESTION_STEM", "second structured body"),
    bodyPart("part_b", "QUESTION_STEM", "first structured body"),
  ]);
  assert.deepEqual(
    utf8Order(first.candidateSequences.map((part) => part.normalizedSequenceDigest)),
    utf8Order(moved.candidateSequences.map((part) => part.normalizedSequenceDigest)),
  );
  assert.notEqual(
    first.candidateNormalizedSequenceDigest,
    moved.candidateNormalizedSequenceDigest,
  );
});

test("QFS1A-CLOSURE-022 unknown body, reference, corpus, and input fields fail", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", "Candidate");
  const reference = referenceFixture({
    referenceId: "closed",
    parts: [bodyPart("part_ref", "QUESTION_STEM", "Reference")],
  });
  const input = preparationInput([part], [reference]);
  assert.throws(
    () => core.prepareSimilarityCorpusV1({ ...input, note: "forbidden" }),
    /QFS1A_FAIL_CLOSED:PREPARATION_INPUT_FIELD_SET_INVALID/u,
  );
  assert.throws(
    () => core.prepareSimilarityCorpusV1({ ...input, candidateParts: [{ ...part, url: "/x" }] }),
    /QFS1A_FAIL_CLOSED:CANDIDATE_PART_0_FIELD_SET_INVALID/u,
  );
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        corpus: { ...input.corpus, metadata: {} },
      }),
    /QFS1A_FAIL_CLOSED:CORPUS_FIELD_SET_INVALID/u,
  );
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        corpus: {
          ...input.corpus,
          references: [{ ...reference, description: "forbidden" }],
        },
      }),
    /QFS1A_FAIL_CLOSED:REFERENCE_0_FIELD_SET_INVALID/u,
  );
});

test("QFS1A-IDENTIFIER-023 arbitrary human-readable reference and corpus IDs fail", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", "Candidate");
  const reference = referenceFixture({
    referenceId: "opaque",
    parts: [bodyPart("part_ref", "QUESTION_STEM", "Reference")],
  });
  const input = preparationInput([part], [reference]);
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        corpus: {
          ...input.corpus,
          references: [{ ...reference, referenceId: "textbook-chapter-4" }],
        },
      }),
    /QFS1A_FAIL_CLOSED:REFERENCE_0_ID_INVALID/u,
  );
  assert.throws(
    () =>
      core.prepareSimilarityCorpusV1({
        ...input,
        corpus: { ...input.corpus, corpusId: "https://example.test/corpus" },
      }),
    /QFS1A_FAIL_CLOSED:CORPUS_ID_INVALID/u,
  );
});

test("QFS1A-BOUNDARY-024 source has no provider, network, DB, persistence, or remote path", () => {
  const source = `${read(CONTRACTS_PATH)}\n${read(CORE_PATH)}`;
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//u);
  assert.doesNotMatch(source, /@supabase|postgres|prisma|drizzle|databaseClient/u);
  assert.doesNotMatch(source, /openai|anthropic|gemini|providerExecution\s*:\s*"ON"/iu);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream|child_process|process\.env/u);
  const boundary = contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT;
  assert.equal(boundary.storage, "IN_MEMORY_ONLY");
  assert.equal(boundary.persistence, "OFF");
  assert.equal(boundary.logging, "OFF");
  assert.equal(boundary.network, "OFF");
  assert.equal(boundary.providerExecution, "OFF");
  assert.equal(boundary.databaseAndPersistence, "OFF");
  assert.equal(boundary.remoteMutation, "ZERO");
  assert.equal(boundary.productionMutation, "ZERO");
});

test("QFS1A-RIGHTS-024A every closed source class grants no right or release authority", () => {
  const candidate = [bodyPart("part_candidate", "QUESTION_STEM", "Candidate")];
  for (const sourceClass of contracts.QFS1A_REFERENCE_SOURCE_CLASSES) {
    const reference = referenceFixture({
      referenceId: `rights_${sourceClass.toLowerCase()}`,
      sourceClass,
      parts: [bodyPart("part_ref", "QUESTION_STEM", "Reference")],
    });
    const result = prepare(candidate, [reference]);
    assert.equal(result.referenceSequences[0].sourceClass, sourceClass);
    assert.equal("sourceRight" in result, false);
    assert.equal("releaseAuthority" in result, false);
  }
  assert.equal(
    contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.sourceRightAuthorityAbsent,
    true,
  );
  assert.equal(
    contracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT.releaseAuthorityAbsent,
    true,
  );
});

test("QFS1A-ACCOUNTING-025 no caller can override or reset mandatory work", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", "Candidate 100 value");
  const input = preparationInput([part]);
  for (const forbidden of [
    { maxTotalWorkUnits: Number.MAX_SAFE_INTEGER },
    { remainingOptionalWorkUnits: Number.MAX_SAFE_INTEGER },
    { callerOverride: true },
  ]) {
    assert.throws(
      () => core.prepareSimilarityCorpusV1({ ...input, ...forbidden }),
      /QFS1A_FAIL_CLOSED:PREPARATION_INPUT_FIELD_SET_INVALID/u,
    );
  }
  assert.equal(contracts.QFS1A_LIMITS.callerOverride, false);
});
