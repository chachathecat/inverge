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
import * as qf0i from "../lib/question-foundry/quarantine/candidate-core.ts";
import * as qfs1aContracts from "../lib/question-foundry/similarity/preparation-contracts.ts";
import * as qfs1aCore from "../lib/question-foundry/similarity/preparation-core.ts";
import * as contracts from "../lib/question-foundry/similarity/similarity-contracts.ts";
import * as firewall from "../lib/question-foundry/similarity/similarity-firewall.ts";

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "0f10ada8d5b9f99f863f77b1aaa129101b81a1c4";
const BASE_TREE = "c85216a6c4fb86fbbf4f82d0c29a90fab5362ffd";
const FINAL_BRANCH = "codex/qf-s1b-optional-similarity-firewall-v1";
const DONOR_HEAD = "60e159a9925b3af501a5234de68b4f818f7d9e4f";
const CONFIG_PATH =
  "config/dabangil-qf-s1-bounded-similarity-rights-firewall-v1.json";
const CONTRACTS_PATH =
  "lib/question-foundry/similarity/similarity-contracts.ts";
const FIREWALL_PATH =
  "lib/question-foundry/similarity/similarity-firewall.ts";
const EXACT_PATHS = [
  "docs/product/dabangil-qf-s1-bounded-similarity-rights-firewall-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-qf-s1-bounded-similarity-rights-firewall-validation.md",
  CONTRACTS_PATH,
  FIREWALL_PATH,
  "tests/qf-s1-bounded-similarity-rights-firewall.test.mjs",
];
const QFS1A_PATHS = [
  "docs/product/dabangil-qf-s1a-mandatory-corpus-preparation-v1.md",
  "config/dabangil-qf-s1a-mandatory-corpus-preparation-v1.json",
  "docs/qa/dabangil-qf-s1a-mandatory-corpus-preparation-validation.md",
  "lib/question-foundry/similarity/preparation-contracts.ts",
  "lib/question-foundry/similarity/preparation-core.ts",
  "tests/qf-s1a-mandatory-corpus-preparation.test.mjs",
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
  const result = spawnSync("git", arguments_, {
    cwd: ROOT_PATH,
    encoding: "utf8",
  });
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
    for (const path of git(...arguments_).split(/\r?\n/u).filter(Boolean)) {
      paths.add(path);
    }
  }
  return [...paths].sort();
}

function gitPathObjects(reference, paths) {
  return paths.map((path) => {
    const output = git("ls-tree", reference, "--", path);
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/u.exec(output);
    assert.ok(match, path);
    return {
      path: match[4],
      mode: match[1],
      type: match[2],
      objectId: match[3],
    };
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
    policyVersion: "policy.qfs1.fixture.v1",
    policyDigest: digest("a"),
    ...overrides,
  };
}

function modelMaterial(role, token, overrides = {}) {
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
    ...overrides,
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

function corpusFixture(references, options = {}) {
  const corpusId = opaqueCorpusId(options.corpusId ?? "fixture");
  const version = options.version ?? "v1";
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

function preparationInput(candidateParts, references, overrides = {}) {
  const candidateBodyManifestDigest = bodyManifest(
    candidateParts,
    "QFS1_CANDIDATE_BODY_MANIFEST_V1",
  );
  return {
    contractVersion: "SimilarityCorpusPreparationInputV1",
    candidate: candidateForContentDigest(candidateBodyManifestDigest),
    candidateParts,
    corpus: corpusFixture(references),
    ...overrides,
  };
}

function review(candidateText, referenceTexts, options = {}) {
  const candidateParts = [
    bodyPart("part_candidate", "QUESTION_STEM", candidateText),
  ];
  const references = referenceTexts.map((bodyText, index) =>
    referenceFixture({
      referenceId: `ref_${String(index).padStart(2, "0")}`,
      parts: [bodyPart(`part_reference_${index}`, "QUESTION_STEM", bodyText)],
      purpose: options.purpose,
      sourceClass: options.sourceClass,
    }),
  );
  return firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, references),
  );
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      assertDeepFrozen(descriptor.value, seen);
    }
  }
}

function alphaToken(prefix, index) {
  const first = String.fromCharCode(97 + Math.floor(index / (26 * 26)));
  const second = String.fromCharCode(97 + Math.floor(index / 26) % 26);
  const third = String.fromCharCode(97 + (index % 26));
  return `${prefix}${first}${second}${third}`;
}

function heavyBody(prefix) {
  return Array.from(
    { length: qfs1aContracts.QFS1A_LIMITS.maxTokensRetainedPerBody },
    (_, index) => alphaToken(prefix, index),
  ).join(" ");
}

function canonicalReferences(references) {
  return utf8Order(
    references,
    (reference) => `${reference.referenceDigest}/${reference.referenceId}`,
  );
}

const ORIGINAL =
  "Orchid analysts compare coastal parcel income using stable rent growth discount periods and terminal yield assumptions";

test("QFS1B-CONTRACT-001 binds protected main, issue #867, and exactly six paths", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(config.base, { sha: BASE_SHA, tree: BASE_TREE });
  assert.equal(git("rev-parse", BASE_SHA), BASE_SHA);
  assert.equal(git("show", "-s", "--format=%T", BASE_SHA), BASE_TREE);
  assert.equal(git("merge-base", "HEAD", BASE_SHA), BASE_SHA);
  assert.equal(git("branch", "--show-current"), FINAL_BRANCH);
  const donorAncestor = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", DONOR_HEAD, "HEAD"],
    { cwd: ROOT_PATH },
  );
  assert.notEqual(donorAncestor.status, 0);
  assert.equal(config.tracking.closesIssue, 867);
  assert.deepEqual(config.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(config.boundary.remoteMutation, "ZERO");
  assert.equal(config.boundary.productionMutation, "ZERO");
});

test("QFS1B-DEPENDENCY-002 recomputes the exact merged QF-S1A receipt", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  const dependency = contracts.QFS1_QFS1A_DEPENDENCY_RECEIPT;
  assert.deepEqual(config.qfS1ADependency, clone(dependency));
  assert.equal(sha256(read(QFS1A_PATHS[1], null)), dependency.configSha256);
  assert.equal(
    sha256(read(QFS1A_PATHS[3], null)),
    dependency.preparationContractsSha256,
  );
  assert.equal(
    sha256(read(QFS1A_PATHS[4], null)),
    dependency.preparationCoreSha256,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(gitPathObjects(BASE_SHA, QFS1A_PATHS)),
    dependency.sixPathIdentity,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(
      clone(qfs1aContracts.QFS1A_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
  assert.deepEqual(Object.keys(qfs1aContracts), dependency.contractExportsExactly);
  assert.deepEqual(Object.keys(qfs1aCore), dependency.coreExportsExactly);
  assert.deepEqual(qfs1aContracts.QFS1A_LIMITS, dependency.limits);
});

test("QFS1B-SURFACE-003 freezes the optional-only public surface, policy, and boundary", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(Object.keys(contracts), [
    "QFS1_CONTRACT_VERSION",
    "QFS1_LIMITS",
    "QFS1_MATCH_KINDS",
    "QFS1_OUTCOMES",
    "QFS1_POLICY_DIGEST",
    "QFS1_POLICY_REFERENCE",
    "QFS1_QFS1A_DEPENDENCY_RECEIPT",
    "QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT",
    "QFS1_TRANSFORMATIONS",
  ]);
  assert.deepEqual(Object.keys(firewall), [
    "assertSimilarityFirewallReviewV1",
    "createSimilarityFirewallReviewV1",
  ]);
  assert.deepEqual(config.limits, clone(contracts.QFS1_LIMITS));
  assert.equal(config.policy.digest, contracts.QFS1_POLICY_DIGEST);
  assert.equal(
    config.boundary.receiptDigest,
    qf0a1.digestCanonicalJsonV1(
      clone(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ),
  );
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.releaseAuthorityAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.sourceRightAuthorityAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.semanticPlagiarismVerdictAbsent, true);
});

test("QFS1B-ORDER-004 calls QF-S1A once and enforces prepass-before-lazy-window order", () => {
  const source = read(FIREWALL_PATH);
  assert.equal((source.match(/prepareSimilarityCorpusV1\(/gu) ?? []).length, 1);
  const publicEntrypoint = source.slice(
    source.indexOf("export function createSimilarityFirewallReviewV1"),
    source.indexOf("export function assertSimilarityFirewallReviewV1"),
  );
  assert.match(
    publicEntrypoint,
    /PREPARATION_BEGIN[\s\S]+prepareSimilarityCorpusV1\(value\)[\s\S]+PREPARATION_COMPLETE[\s\S]+buildReview\(prepared, trace\)/u,
  );
  const build = source.slice(source.indexOf("function buildReview("));
  const prepass = build.indexOf('trace.push("EXACT_PREPASS_BEGIN")');
  const compare = build.indexOf('trace.push(\`COMPARE:');
  const windows = build.indexOf('trace.push(\`WINDOW:');
  assert.ok(prepass < compare && compare < windows);
  assert.match(source, /WINDOW_BEFORE_EXACT_PREPASS_FORBIDDEN/u);
  assert.match(source, /WINDOW_BEFORE_REFERENCE_COMPARISON_FORBIDDEN/u);
  assert.doesNotMatch(source, /\.normalize\(|createHash|bodyText|tokenize/u);
});

test("QFS1B-EXACT-005 exact normalized whole-body copy blocks", () => {
  const artifact = review(ORIGINAL, [ORIGINAL.toUpperCase()]);
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches.length, 1);
  assert.equal(artifact.matches[0].matchKind, "STRUCTURED_PARTS_COPY");
  assert.equal(artifact.matches[0].disposition, "BLOCKING");
});

test("QFS1B-STRUCTURED-006 exact structured-parts copy blocks", () => {
  const candidateParts = [
    bodyPart("part_a", "QUESTION_STEM", "orchid coastal parcel income"),
    bodyPart("part_b", "EXPLANATION", "stable growth discount terminal yield"),
  ];
  const reference = referenceFixture({
    referenceId: "structured",
    parts: [
      bodyPart("part_x", "QUESTION_STEM", "ORCHID COASTAL PARCEL INCOME"),
      bodyPart("part_y", "EXPLANATION", "STABLE GROWTH DISCOUNT TERMINAL YIELD"),
    ],
  });
  const artifact = firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, [reference]),
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "STRUCTURED_PARTS_COPY");
});

test("QFS1B-FRAGMENT-007 candidate fragment inside a longer reference blocks", () => {
  const artifact = review(
    ORIGINAL,
    [`unrelated opening context ${ORIGINAL} unrelated closing context`],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "CANDIDATE_FRAGMENT_IN_REFERENCE");
});

test("QFS1B-FRAGMENT-008 reference fragment inside a longer candidate blocks", () => {
  const fragment =
    "coastal parcel income stable rent growth discount terminal yield";
  const artifact = review(
    `preface orchid analysts compare ${fragment} with assumptions conclusion`,
    [fragment],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "REFERENCE_FRAGMENT_IN_CANDIDATE");
});

test("QFS1B-SUBSTITUTION-009 numeric substitution with retained structure blocks", () => {
  const artifact = review(
    "orchid analysts compare coastal parcel income 2026 stable rent growth discount terminal yield",
    ["orchid analysts compare coastal parcel income 2031 stable rent growth discount terminal yield"],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "NUMERIC_SUBSTITUTION");
});

test("QFS1B-SUBSTITUTION-010 identifier substitution with retained structure blocks", () => {
  const artifact = review(
    "orchid analysts compare coastal parcel income stable rent growth discount terminal yield",
    ["violet analysts compare coastal parcel income stable rent growth discount terminal yield"],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "IDENTIFIER_OR_NAME_SUBSTITUTION");
});

test("QFS1B-ORDER-011 bounded token-order perturbation blocks", () => {
  const artifact = review(
    "orchid analysts compare coastal parcel income stable rent growth discount terminal yield",
    ["orchid analysts coastal compare parcel income stable rent growth discount terminal yield"],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "BOUNDED_ORDER_PERTURBATION");
});

test("QFS1B-LEXICAL-012 transformed partial lexical copy is detected", () => {
  const artifact = review(
    "orchid coastal parcel income stable growth discount terminal yield assumption",
    ["orchid coastal parcel income stable growth discount terminal scenario evidence"],
  );
  assert.ok(["BLOCKED", "REVIEW_REQUIRED"].includes(artifact.outcome));
  assert.equal(artifact.matches.length, 1);
  assert.ok(
    ["IDENTIFIER_OR_NAME_SUBSTITUTION", "LEXICAL_TRANSFORMED_COPY"].includes(
      artifact.matches[0].matchKind,
    ),
  );
});

test("QFS1B-STRUCTURED-013 copy distributed across candidate parts blocks", () => {
  const candidateParts = [
    bodyPart("part_a", "QUESTION_STEM", "orchid coastal parcel income stable"),
    bodyPart("part_b", "EXPLANATION", "growth discount terminal yield assumption"),
  ];
  const reference = referenceFixture({
    referenceId: "joined",
    parts: [
      bodyPart(
        "part_ref",
        "QUESTION_STEM",
        "orchid coastal parcel income stable growth discount terminal yield assumption",
      ),
    ],
  });
  const artifact = firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, [reference]),
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "STRUCTURED_PARTS_COPY");
});

test("QFS1B-FALSEPOSITIVE-014 numeric layout alone does not block", () => {
  const artifact = review(
    "orchid meadow rental evidence 100 200 300 adjustment",
    ["harbor bridge traffic schedule 100 200 300 inspection"],
  );
  assert.notEqual(artifact.outcome, "BLOCKED");
});

test("QFS1B-FALSEPOSITIVE-015 punctuation and short generic phrases do not block", () => {
  assert.notEqual(review("value = 10 / 2", ["value = 99 / 3"]).outcome, "BLOCKED");
  assert.notEqual(review("select the correct answer", ["select the correct answer"]).outcome, "BLOCKED");
  assert.notEqual(review("... --- !!!", ["... --- !!!"]).outcome, "BLOCKED");
});

test("QFS1B-FALSEPOSITIVE-016 boilerplate without distinct evidence does not block", () => {
  const artifact = review(
    "which of the following statements is correct choose answer",
    ["which of the following statements is correct select response"],
  );
  assert.notEqual(artifact.outcome, "BLOCKED");
});

test("QFS1B-MANDATORY-017 body mismatch propagates the exact QF-S1A failure", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL, {
    bodyDigest: digest("f"),
  });
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(preparationInput([part], [])),
    /QFS1A_FAIL_CLOSED:BODY_DIGEST_MISMATCH/u,
  );
});

test("QFS1B-MANDATORY-018 corpus manifest drift propagates fail-closed", () => {
  const part = bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL);
  const input = preparationInput([part], []);
  input.corpus.corpusManifestDigest = digest("f");
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(input),
    /QFS1A_FAIL_CLOSED:CORPUS_MANIFEST_DRIFT/u,
  );
});

test("QFS1B-MANDATORY-019 malformed Unicode propagates fail-closed", () => {
  const malformed = "orchid\ud800";
  const part = bodyPart("part_candidate", "QUESTION_STEM", malformed);
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(preparationInput([part], [])),
    /QFS1A_FAIL_CLOSED:UNPAIRED_HIGH_SURROGATE/u,
  );
});

test("QFS1B-MANDATORY-020 mandatory token/work overflow propagates fail-closed", () => {
  const excessiveTokens = Array.from({ length: 257 }, (_, index) =>
    alphaToken("overflow", index),
  ).join(" ");
  const part = bodyPart("part_candidate", "QUESTION_STEM", excessiveTokens);
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(preparationInput([part], [])),
    /QFS1A_FAIL_CLOSED:BODY_TOKEN_LIMIT_EXCEEDED/u,
  );
});

test("QFS1B-EXHAUST-021 no block plus optional exhaustion is REVIEW_REQUIRED", () => {
  const candidateText = heavyBody("candidate");
  const candidateParts = [bodyPart("part_candidate", "QUESTION_STEM", candidateText)];
  const references = Array.from({ length: 10 }, (_, index) =>
    referenceFixture({
      referenceId: `heavy_${index}`,
      parts: [
        bodyPart(
          `part_heavy_${index}`,
          "QUESTION_STEM",
          heavyBody(`reference${alphaToken("", index)}`),
        ),
      ],
    }),
  );
  const artifact = firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, references),
  );
  assert.equal(artifact.outcome, "REVIEW_REQUIRED");
  assert.equal(artifact.matches.length, 0);
  assert.equal(artifact.workAccounting.budgetExhausted, true);
  assert.equal(artifact.workAccounting.completeCorpusInspection, false);
});

test("QFS1B-MONOTONIC-022 first exact block survives later optional exhaustion", () => {
  const candidateText = heavyBody("candidate");
  const candidateParts = [bodyPart("part_candidate", "QUESTION_STEM", candidateText)];
  const exactCandidates = Array.from({ length: 512 }, (_, index) =>
    referenceFixture({
      referenceId: `exact_${index}`,
      parts: [bodyPart(`part_exact_${index}`, "QUESTION_STEM", candidateText)],
    }),
  );
  const exact = canonicalReferences(exactCandidates)[0];
  const heavy = Array.from({ length: 10 }, (_, index) =>
    referenceFixture({
      referenceId: `later_${index}`,
      parts: [
        bodyPart(
          `part_later_${index}`,
          "QUESTION_STEM",
          heavyBody(`unrelated${alphaToken("", index)}`),
        ),
      ],
    }),
  );
  const earliestHeavy = canonicalReferences(heavy)[0];
  assert.ok(
    qf0a1.compareUtf8BytesV1(
      `${exact.referenceDigest}/${exact.referenceId}`,
      `${earliestHeavy.referenceDigest}/${earliestHeavy.referenceId}`,
    ) < 0,
  );
  const artifact = firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, [exact, ...heavy]),
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches.some((match) => match.referenceDigest === exact.referenceDigest), true);
  assert.equal(artifact.workAccounting.budgetExhausted, true);
  assert.equal(artifact.workAccounting.completeCorpusInspection, false);
});

test("QFS1B-PREPASS-023 a canonically later exact copy is found before window exhaustion", () => {
  const candidateText = heavyBody("candidate");
  const candidateParts = [bodyPart("part_candidate", "QUESTION_STEM", candidateText)];
  const heavy = Array.from({ length: 10 }, (_, index) =>
    referenceFixture({
      referenceId: `early_${index}`,
      parts: [
        bodyPart(
          `part_early_${index}`,
          "QUESTION_STEM",
          heavyBody(`other${alphaToken("", index)}`),
        ),
      ],
    }),
  );
  const largestHeavy = canonicalReferences(heavy).at(-1);
  let exact;
  for (let index = 0; index < 4096; index += 1) {
    const candidate = referenceFixture({
      referenceId: `later_exact_${index}`,
      parts: [bodyPart(`part_later_exact_${index}`, "QUESTION_STEM", candidateText)],
    });
    if (
      qf0a1.compareUtf8BytesV1(
        `${candidate.referenceDigest}/${candidate.referenceId}`,
        `${largestHeavy.referenceDigest}/${largestHeavy.referenceId}`,
      ) > 0
    ) {
      exact = candidate;
      break;
    }
  }
  assert.ok(exact);
  const artifact = firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, [...heavy, exact]),
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches.some((match) => match.referenceDigest === exact.referenceDigest), true);
  assert.equal(artifact.workAccounting.budgetExhausted, true);
  assert.equal(artifact.workAccounting.completeCorpusInspection, false);
});

test("QFS1B-RIGHTS-024 every source class may protectively block but grants no right", () => {
  for (const sourceClass of qfs1aContracts.QFS1A_REFERENCE_SOURCE_CLASSES) {
    const artifact = review(ORIGINAL, [ORIGINAL], { sourceClass });
    assert.equal(artifact.outcome, "BLOCKED");
  }
  const boundary = contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT;
  assert.equal(boundary.sourceRightAuthorityAbsent, true);
  assert.equal(boundary.sourceEligibilityAuthorityAbsent, true);
  assert.equal(boundary.generationAuthorityAbsent, true);
  assert.equal(boundary.releaseAuthorityAbsent, true);
});

test("QFS1B-DETERMINISM-025 reference and part permutations preserve the artifact", () => {
  const candidateParts = [
    bodyPart("part_b", "EXPLANATION", "growth discount terminal yield assumption"),
    bodyPart("part_a", "QUESTION_STEM", "orchid coastal parcel income stable"),
  ];
  const references = [
    referenceFixture({
      referenceId: "one",
      parts: [
        bodyPart("part_y", "EXPLANATION", "unrelated orchard valuation evidence"),
        bodyPart("part_x", "QUESTION_STEM", "harbor traffic inspection schedule"),
      ],
    }),
    referenceFixture({
      referenceId: "two",
      parts: [
        bodyPart(
          "part_z",
          "QUESTION_STEM",
          "orchid coastal parcel income stable growth discount terminal yield assumption",
        ),
      ],
    }),
  ];
  const forward = firewall.createSimilarityFirewallReviewV1(
    preparationInput(candidateParts, references),
  );
  const reverse = firewall.createSimilarityFirewallReviewV1(
    preparationInput([...candidateParts].reverse(), [...references].reverse()),
  );
  assert.deepEqual(reverse, forward);
  assert.equal(reverse.reviewDigest, forward.reviewDigest);
  const source = read(FIREWALL_PATH);
  assert.doesNotMatch(source, /localeCompare|Intl\.Collator/u);
});

test("QFS1B-ACCOUNTING-026 formulas and QF-S1A optional ceiling are exact", () => {
  const artifact = review(ORIGINAL, ["unrelated harbor traffic inspection schedule"]);
  const work = artifact.workAccounting;
  assert.equal(
    work.optionalWorkUnitsConsumed,
    work.generatedWindows + work.comparisonWorkUnits,
  );
  assert.equal(
    work.totalWorkUnits,
    work.mandatoryTotalWorkUnits + work.optionalWorkUnitsConsumed,
  );
  assert.equal(
    work.remainingOptionalWorkUnitsAtStart,
    qfs1aContracts.QFS1A_LIMITS.maxTotalWorkUnits - work.mandatoryTotalWorkUnits,
  );
  assert.ok(work.optionalWorkUnitsConsumed <= work.remainingOptionalWorkUnitsAtStart);
  assert.ok(work.generatedWindows <= contracts.QFS1_LIMITS.maxTotalGeneratedWindows);
  assert.ok(work.comparisonWorkUnits <= contracts.QFS1_LIMITS.maxTotalComparisonWorkUnits);
});

test("QFS1B-ASSERT-027 review assertion rejects drift and preserves deep immutability", () => {
  const candidateParts = [bodyPart("part_assert_candidate", "QUESTION_STEM", ORIGINAL)];
  const references = [
    referenceFixture({
      referenceId: "assert_reference",
      parts: [bodyPart("part_assert_reference", "QUESTION_STEM", ORIGINAL)],
    }),
  ];
  const input = preparationInput(candidateParts, references);
  const created = firewall.createSimilarityFirewallReviewV1(input);
  const asserted = firewall.assertSimilarityFirewallReviewV1(clone(created), input);
  assert.deepEqual(asserted, created);
  assertDeepFrozen(created);
  assertDeepFrozen(asserted);
  const changed = clone(created);
  changed.workAccounting.comparisonWorkUnits += 1;
  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(changed, input),
    /QFS1_FAIL_CLOSED/u,
  );
  const extra = clone(created);
  extra.note = "forbidden";
  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(extra, input),
    /QFS1_FAIL_CLOSED:REVIEW_FIELD_COUNT_INVALID/u,
  );
});

test("QFS1B-HOSTILE-028 proxies, accessors, symbols, and prototypes fail without traps", () => {
  let traps = 0;
  const proxy = new Proxy({}, { get() { traps += 1; throw new Error("trap"); } });
  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(proxy),
    /QFS1_FAIL_CLOSED:REVIEW_PLAIN_RECORD_REQUIRED/u,
  );
  assert.equal(traps, 0);
  let getters = 0;
  const accessor = {};
  Object.defineProperty(accessor, "contractVersion", {
    enumerable: true,
    get() { getters += 1; return "SimilarityFirewallReviewV1"; },
  });
  assert.throws(() => firewall.assertSimilarityFirewallReviewV1(accessor), /QFS1_FAIL_CLOSED/u);
  assert.equal(getters, 0);
  const symbol = clone(review(ORIGINAL, [ORIGINAL]));
  symbol[Symbol("forbidden")] = true;
  assert.throws(() => firewall.assertSimilarityFirewallReviewV1(symbol), /SYMBOL_FORBIDDEN/u);
  const hostile = Object.assign(Object.create({ inherited: true }), clone(review(ORIGINAL, [ORIGINAL])));
  assert.throws(() => firewall.assertSimilarityFirewallReviewV1(hostile), /PROTOTYPE_UNSUPPORTED/u);
});

test("QFS1B-BOUNDARY-029 artifact contains no body, token, excerpt, identity, URL, or path", () => {
  const artifact = review(ORIGINAL, [ORIGINAL]);
  const serialized = JSON.stringify(artifact);
  assert.doesNotMatch(serialized, /Orchid|coastal parcel|bodyText|tokenValue|excerpt|prompt|response|learnerIdentity|accountIdentity|https?:|file:/iu);
  const source = read(FIREWALL_PATH);
  assert.doesNotMatch(source, /process\.env|fetch\(|node:fs|supabase|prisma|stripe|axios|undici/iu);
});

test("QFS1B-BOUNDARY-030 no release, transfer, assignment, or runtime lifecycle exists", () => {
  const combined = [
    read(CONTRACTS_PATH),
    read(FIREWALL_PATH),
    JSON.stringify(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT),
  ].join("\n");
  assert.doesNotMatch(
    combined,
    /PERSONAL_LEARNING_USABLE|TRANSFER_VERIFIED|CALIBRATION_PILOT|MEASUREMENT_CALIBRATED|RELEASED|BANK_ASSIGNED|LEARNER_ASSIGNED/u,
  );
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.runtimeActivation, "OFF");
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.network, "OFF");
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.remoteMutation, "ZERO");
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.productionMutation, "ZERO");
});

test("QFS1B-ASSERT-031 rejects a recomputed-digest fabricated CLEAR artifact", () => {
  const candidateParts = [bodyPart("part_forged_candidate", "QUESTION_STEM", ORIGINAL)];
  const references = [
    referenceFixture({
      referenceId: "forged_reference",
      parts: [
        bodyPart(
          "part_forged_reference",
          "QUESTION_STEM",
          "unrelated harbor traffic inspection schedule",
        ),
      ],
    }),
  ];
  const input = preparationInput(candidateParts, references);
  const created = firewall.createSimilarityFirewallReviewV1(input);
  assert.equal(created.outcome, "CLEAR");
  assert.ok(created.workAccounting.optionalWorkUnitsConsumed > 0);

  const forged = clone(created);
  forged.workAccounting.generatedWindows = 0;
  forged.workAccounting.comparisonWorkUnits = 0;
  forged.workAccounting.optionalWorkUnitsConsumed = 0;
  forged.workAccounting.totalWorkUnits = forged.workAccounting.mandatoryTotalWorkUnits;
  forged.workAccounting.budgetExhausted = false;
  forged.workAccounting.completeCorpusInspection = true;
  forged.matches = [];
  forged.outcome = "CLEAR";
  const forgedMaterial = clone(forged);
  delete forgedMaterial.reviewDigest;
  forged.reviewDigest = qf0a1.digestCanonicalJsonV1(forgedMaterial);

  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(forged, input),
    /QFS1_FAIL_CLOSED:REVIEW_AUTHORITY_RECOMPUTE_MISMATCH/u,
  );
});

test("QFS1B-HOSTILE-032 snapshots dense arrays without invoking hostile instance methods", () => {
  const candidateParts = [bodyPart("part_snapshot_candidate", "QUESTION_STEM", ORIGINAL)];
  const references = [
    referenceFixture({
      referenceId: "snapshot_reference",
      parts: [bodyPart("part_snapshot_reference", "QUESTION_STEM", ORIGINAL)],
    }),
  ];
  const input = preparationInput(candidateParts, references);
  const created = firewall.createSimilarityFirewallReviewV1(input);
  assert.equal(created.outcome, "BLOCKED");
  assert.ok(created.matches.length > 0);

  const hostileMatches = clone(created);
  let matchesMapReads = 0;
  Object.defineProperty(hostileMatches.matches, "map", {
    configurable: true,
    enumerable: true,
    get() {
      matchesMapReads += 1;
      throw new Error("hostile matches map getter executed");
    },
  });
  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(hostileMatches, input),
    /QFS1_FAIL_CLOSED:REVIEW_MATCHES_ARRAY_EXTENSION_FORBIDDEN/u,
  );
  assert.equal(matchesMapReads, 0);

  const hostileTransformations = clone(created);
  let transformationMapReads = 0;
  Object.defineProperty(hostileTransformations.matches[0].transformationProfile, "map", {
    configurable: true,
    enumerable: true,
    get() {
      transformationMapReads += 1;
      throw new Error("hostile transformation map getter executed");
    },
  });
  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(hostileTransformations, input),
    /QFS1_FAIL_CLOSED:MATCH_0_TRANSFORMATIONS_ARRAY_EXTENSION_FORBIDDEN/u,
  );
  assert.equal(transformationMapReads, 0);

  const dataExtension = clone(created);
  let dataMapCalls = 0;
  Object.defineProperty(dataExtension.matches, "map", {
    configurable: true,
    enumerable: true,
    value() {
      dataMapCalls += 1;
    },
  });
  assert.throws(
    () => firewall.assertSimilarityFirewallReviewV1(dataExtension, input),
    /QFS1_FAIL_CLOSED:REVIEW_MATCHES_ARRAY_EXTENSION_FORBIDDEN/u,
  );
  assert.equal(dataMapCalls, 0);

  const asserted = firewall.assertSimilarityFirewallReviewV1(clone(created), input);
  assert.deepEqual(asserted, created);
  assert.equal(
    qf0a1.canonicalizeBoundedJsonV1(clone(asserted)),
    qf0a1.canonicalizeBoundedJsonV1(clone(created)),
  );
  assertDeepFrozen(asserted);
});
