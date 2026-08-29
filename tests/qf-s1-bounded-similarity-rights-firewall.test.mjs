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
import * as contracts from "../lib/question-foundry/similarity/similarity-contracts.ts";
import * as firewall from "../lib/question-foundry/similarity/similarity-firewall.ts";

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const FINAL_BASE_SHA = "4503afc74cf782c18437d6c5031541ef9786eed9";
const FINAL_BASE_TREE = "b5d3596ebebc50142b01a63d731a4951288d1499";
const FINAL_BRANCH = "codex/qf-s1-bounded-similarity-rights-firewall-v1";
const SCRATCH_COMMIT = "d9b2a8e5e3343850f7dbb5233750acce3821a1cc";
const QF0_SHA = "7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2";
const QF0_TREE = "9ad60b9ece4931d7172cdc0462e079ed8d9a53fa";
const CONFIG_PATH = "config/dabangil-qf-s1-bounded-similarity-rights-firewall-v1.json";
const CONTRACTS_PATH = "lib/question-foundry/similarity/similarity-contracts.ts";
const FIREWALL_PATH = "lib/question-foundry/similarity/similarity-firewall.ts";
const EXPECTED_CONFIG_SHA256 =
  "780b97caa08e88c253628cd2ccaa2c928e4272b92228d66a7e164ba21b98354a";

const EXACT_PATHS = [
  "docs/product/dabangil-qf-s1-bounded-similarity-rights-firewall-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-qf-s1-bounded-similarity-rights-firewall-validation.md",
  CONTRACTS_PATH,
  FIREWALL_PATH,
  "tests/qf-s1-bounded-similarity-rights-firewall.test.mjs",
];

const QF0_PATHS = [
  "docs/product/dabangil-question-foundry-quarantine-core-v1.md",
  "config/dabangil-question-foundry-quarantine-core-v1.json",
  "docs/qa/dabangil-question-foundry-quarantine-core-validation.md",
  "lib/question-foundry/quarantine/candidate-contracts.ts",
  "lib/question-foundry/quarantine/candidate-core.ts",
  "tests/question-foundry-quarantine-core.test.mjs",
];

const REVIEW_FIELDS = [
  "contractVersion",
  "candidateId",
  "candidateDigest",
  "candidateBodyManifestDigest",
  "policyRef",
  "policyDigest",
  "corpusManifestDigest",
  "corpusCounts",
  "workAccounting",
  "outcome",
  "matches",
  "reviewDigest",
];

const MATCH_FIELDS = [
  "referenceId",
  "referenceDigest",
  "candidatePartKind",
  "referencePartKind",
  "matchKind",
  "measure",
  "candidateTokenRange",
  "referenceTokenRange",
  "transformationProfile",
  "disposition",
];

function read(path, encoding = "utf8") {
  return readFileSync(new URL(path, ROOT_URL), encoding);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function opaqueReferenceId(seed) {
  return `qfsr_${sha256(`reference:${seed}`)}`;
}

function opaqueCorpusId(seed) {
  return `qfsc_${sha256(`corpus:${seed}`)}`;
}

function digestText(value) {
  return `sha256:${sha256(value)}`;
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
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
    ["diff", "--name-only", `${FINAL_BASE_SHA}...HEAD`],
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

function candidateForContentDigest(candidateContentDigest, overrides = {}) {
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
  const generatorExecution = qf0a2.createModelExecutionIdentityV1(
    modelMaterial("GENERATOR", "3"),
  );
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
    generatorExecution,
    independentExecutions: [],
    createdAt: "2026-06-01T11:00:00.000Z",
    ...overrides,
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

function candidateFixture(parts) {
  const manifestDigest = bodyManifest(parts, "QFS1_CANDIDATE_BODY_MANIFEST_V1");
  return { candidate: candidateForContentDigest(manifestDigest), manifestDigest };
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
  const corpusSeed = options.corpusId ?? "fixture";
  const corpusId = /^qfsc_[a-f0-9]{64}$/u.test(corpusSeed)
    ? corpusSeed
    : opaqueCorpusId(corpusSeed);
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

function inspection(candidateParts, references, overrides = {}) {
  const { candidate } = candidateFixture(candidateParts);
  return {
    contractVersion: "SimilarityFirewallInspectionInputV1",
    candidate,
    candidateParts,
    policyRef: contracts.QFS1_POLICY_REFERENCE,
    policyDigest: contracts.QFS1_POLICY_DIGEST,
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
    inspection(candidateParts, references),
  );
}

function fullBudgetBody(prefix) {
  const tokens = Array.from({ length: contracts.QFS1_LIMITS.maxTokensRetainedPerBody }, (_, index) => {
    const first = String.fromCharCode(97 + Math.floor(index / (26 * 26)));
    const second = String.fromCharCode(97 + Math.floor(index / 26) % 26);
    const third = String.fromCharCode(97 + index % 26);
    const stem = `${prefix}${first}${second}${third}`;
    assert.ok(stem.length < 127);
    return `${stem}${"x".repeat(127 - stem.length)}`;
  });
  const body = `${tokens.join(" ")}z`;
  assert.equal(body.length, contracts.QFS1_LIMITS.maxCharactersPerBody);
  return body;
}

function orderedReferencePair(firstParts, secondParts, seed) {
  const first = referenceFixture({
    referenceId: `${seed}first`,
    parts: firstParts,
  });
  for (let index = 0; index < 128; index += 1) {
    const second = referenceFixture({
      referenceId: `${seed}second${index}`,
      parts: secondParts,
    });
    if (
      qf0a1.compareUtf8BytesV1(
        `${first.referenceDigest}/${first.referenceId}`,
        `${second.referenceDigest}/${second.referenceId}`,
      ) < 0
    ) {
      return [first, second];
    }
  }
  assert.fail(`unable to establish deterministic reference order for ${seed}`);
}

const ORIGINAL =
  "Orchid analysts compare coastal parcel income using stable rent growth discount periods and terminal yield assumptions";

test("QFS1-CONTRACT-001 freezes final publication base, issue #867, and six paths", () => {
  const text = read(CONFIG_PATH);
  const config = JSON.parse(text);
  assert.equal(git("rev-parse", FINAL_BASE_SHA), FINAL_BASE_SHA);
  assert.equal(git("show", "-s", "--format=%T", FINAL_BASE_SHA), FINAL_BASE_TREE);
  assert.equal(git("merge-base", "HEAD", FINAL_BASE_SHA), FINAL_BASE_SHA);
  assert.equal(git("branch", "--show-current"), FINAL_BRANCH);
  assert.equal(git("merge-base", "HEAD", SCRATCH_COMMIT), QF0_SHA);
  assert.equal(config.contractVersion, "dabangil.question_foundry.qf_s1_similarity_firewall.v1");
  assert.equal(config.stage, "QF-S1");
  assert.equal(config.tracking.closesIssue, 867);
  assert.deepEqual(
    [config.tracking.questionFoundryProgram, config.tracking.cognitiveProductReference],
    [811, 714],
  );
  assert.equal(config.publication.finalBranch, FINAL_BRANCH);
  assert.deepEqual(
    config.publication.publicationSequenceGate.refreshedProtectedMain,
    { sha: FINAL_BASE_SHA, tree: FINAL_BASE_TREE },
  );
  assert.equal(
    config.publication.publicationSequenceGate.scope,
    "PUBLICATION_SEQUENCE_ONLY",
  );
  assert.equal(
    config.publication.publicationSequenceGate.qfS2RuntimeOrContractConsumption,
    false,
  );
  assert.equal(config.publication.reconstruction.preparedScratchCommit, SCRATCH_COMMIT);
  assert.equal(config.publication.reconstruction.scratchAncestryImported, false);
  assert.equal(config.publication.reconstruction.donorAncestryImported, false);
  assert.deepEqual(config.qf0Dependency.resultingMain, {
    sha: QF0_SHA,
    tree: QF0_TREE,
  });
  assert.deepEqual(config.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(sha256(text), EXPECTED_CONFIG_SHA256);
});

test("QFS1-DEPENDENCY-002 recomputes exact merged QF-0 identities and exports", () => {
  const dependency = contracts.QFS1_QF0_DEPENDENCY_RECEIPT;
  assert.equal(git("rev-parse", QF0_SHA), QF0_SHA);
  assert.equal(git("show", "-s", "--format=%T", QF0_SHA), QF0_TREE);
  assert.equal(sha256(read(QF0_PATHS[1], null)), dependency.aggregateConfigSha256);
  assert.equal(
    sha256(read(QF0_PATHS[3], null)),
    dependency.candidateContractsImplementationSha256,
  );
  assert.equal(
    sha256(read(QF0_PATHS[4], null)),
    dependency.candidateCoreImplementationSha256,
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(gitPathObjects(QF0_SHA, QF0_PATHS)),
    dependency.sixPathIdentity,
  );
  assert.deepEqual(Object.keys(qf0iContracts), dependency.candidateContractExportsExactly);
  assert.deepEqual(Object.keys(qf0i), dependency.candidateCoreExportsExactly);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(qf0iContracts.QF0I_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
});

test("QFS1-SURFACE-003 exposes a closed source-only metadata review contract", () => {
  assert.equal(contracts.QFS1_CONTRACT_VERSION, "QFS1BoundedSimilarityRightsFirewallV1");
  assert.deepEqual(Object.keys(firewall), [
    "assertSimilarityFirewallReviewV1",
    "createSimilarityFirewallReviewV1",
  ]);
  const config = JSON.parse(read(CONFIG_PATH));
  const { contractVersion: limitContractVersion, ...sourceLimits } =
    contracts.QFS1_LIMITS;
  assert.equal(limitContractVersion, contracts.QFS1_CONTRACT_VERSION);
  assert.deepEqual(sourceLimits, config.limits);
  assert.equal(contracts.QFS1_POLICY_REFERENCE, config.publicContract.policyRef);
  assert.equal(contracts.QFS1_POLICY_DIGEST, config.publicContract.policyDigest);
  assert.deepEqual(
    contracts.QFS1_BODY_PART_KINDS,
    config.ephemeralBodyContract.partKindsExactly,
  );
  assert.deepEqual(
    contracts.QFS1_REFERENCE_PURPOSES,
    config.referenceCorpusContract.purposesExactly,
  );
  assert.deepEqual(
    contracts.QFS1_REFERENCE_SOURCE_CLASSES,
    config.referenceCorpusContract.sourceClassesExactly,
  );
  assert.deepEqual(contracts.QFS1_MATCH_KINDS, config.coverage.matchKindsExactly);
  assert.deepEqual(contracts.QFS1_OUTCOMES, config.reviewArtifact.outcomesExactly);
  assert.deepEqual(
    Object.keys(contracts),
    config.publicContract.contractExportsExactly,
  );
  assert.deepEqual(Object.keys(firewall), config.publicContract.coreExportsExactly);
  assert.deepEqual(
    contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly,
    [
      ...config.publicContract.contractExportsExactly,
      ...config.publicContract.coreExportsExactly,
    ],
  );
  assert.equal(
    qf0a1.digestCanonicalJsonV1(
      clone(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ),
    config.publicContract.sourceOnlyBoundaryReceiptDigest,
  );
  assert.deepEqual(contracts.QFS1_OUTCOMES, ["CLEAR", "BLOCKED", "REVIEW_REQUIRED"]);
  assert.equal(contracts.QFS1_LIMITS.callerOverride, false);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.rawBodyOutputAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.sourceRightAuthorityAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.transferAuthorityAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.releaseAuthorityAbsent, true);
});

test("QFS1-COPY-004 exact normalized whole-body copy blocks deterministically", () => {
  const first = review(ORIGINAL, [ORIGINAL.toUpperCase().replaceAll(" ", "  ")]);
  const second = review(ORIGINAL, [ORIGINAL.toUpperCase().replaceAll(" ", "  ")]);
  assert.deepEqual(first, second);
  assert.equal(first.outcome, "BLOCKED");
  assert.equal(first.matches[0].matchKind, "EXACT_NORMALIZED_COPY");
  assert.deepEqual(Object.keys(first), REVIEW_FIELDS);
  assert.deepEqual(Object.keys(first.matches[0]), MATCH_FIELDS);
  assert.deepEqual(firewall.assertSimilarityFirewallReviewV1(first), first);
});

test("QFS1-COPY-004A strongly supported near-whole-body copy blocks", () => {
  const artifact = review(
    "12 Orchid analysts compare coastal parcel income using stable rent growth discount periods and terminal yield assumptions",
    [
      "twelve Orchid analysts compare coastal parcel income using stable rent growth discount periods and terminal yield assumptions",
    ],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "NEAR_WHOLE_BODY_COPY");
});

test("QFS1-COPY-004B composed and decomposed exact copies block both ways", () => {
  const composed =
    "Café résumé naïve façade coöperate élève jalapeño piñata valuation evidence";
  const decomposed = composed.normalize("NFD");
  const normalized = composed.normalize("NFKC").toLowerCase();
  assert.notEqual(composed, decomposed);

  const forward = review(composed, [decomposed]);
  const forwardRepeat = review(composed, [decomposed]);
  const reverse = review(decomposed, [composed]);
  const reverseRepeat = review(decomposed, [composed]);

  assert.deepEqual(forwardRepeat, forward);
  assert.deepEqual(reverseRepeat, reverse);
  for (const artifact of [forward, reverse]) {
    assert.equal(artifact.outcome, "BLOCKED");
    assert.equal(artifact.matches[0].matchKind, "EXACT_NORMALIZED_COPY");
    assert.equal(
      artifact.workAccounting.originalCharacters,
      composed.length + decomposed.length,
    );
    assert.equal(artifact.workAccounting.normalizedCharacters, normalized.length * 2);
    assert.equal("inspectedCharacters" in artifact.workAccounting, false);
    assert.deepEqual(firewall.assertSimilarityFirewallReviewV1(artifact), artifact);
  }
});

test("QFS1-COPY-005 copied candidate fragment embedded in a longer reference blocks", () => {
  const artifact = review(ORIGINAL, [
    `introductory unrelated framing ${ORIGINAL} additional unrelated closing material`,
  ]);
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "CANDIDATE_FRAGMENT_IN_REFERENCE");
});

test("QFS1-COPY-006 copied reference fragment embedded in a longer candidate blocks", () => {
  const fragment = "coastal parcel income stable rent growth discount periods terminal yield assumptions";
  const artifact = review(
    `introductory scenario details ${fragment} followed by independent closing instructions`,
    [fragment],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "REFERENCE_FRAGMENT_IN_CANDIDATE");
});

test("QFS1-TRANSFORM-007 numeric substitution with retained lexical structure blocks", () => {
  const artifact = review(
    "Analysts compare coastal parcel income at 7 percent growth across 12 periods using terminal yield assumptions",
    [
      "Analysts compare coastal parcel income at 9 percent growth across 15 periods using terminal yield assumptions",
    ],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "NUMERIC_SUBSTITUTION");
  assert.ok(
    artifact.matches[0].transformationProfile.includes("NUMERIC_TOKENS_SUBSTITUTED"),
  );
});

test("QFS1-TRANSFORM-008 identifier or name substitution blocks", () => {
  const artifact = review(
    "Analyst Minji compares coastal parcel income using stable rent growth discount periods and terminal yield assumptions",
    [
      "Analyst Daniel compares coastal parcel income using stable rent growth discount periods and terminal yield assumptions",
    ],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "IDENTIFIER_OR_NAME_SUBSTITUTION");
});

test("QFS1-TRANSFORM-009 bounded order perturbation blocks", () => {
  const artifact = review(
    "Analysts compare coastal parcel income using stable rent growth discount periods and terminal yield assumptions",
    [
      "Analysts compare parcel coastal income using stable rent growth discount periods and terminal yield assumptions",
    ],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "BOUNDED_ORDER_PERTURBATION");
});

test("QFS1-TRANSFORM-010 lexical-only transformed partial copy is detected", () => {
  const artifact = review(
    "Coastal parcel analysts evaluate durable rental growth through discount periods before applying terminal yield assumptions",
    [
      "Terminal assumptions are retained while analysts evaluate coastal parcel rental growth, reorder every clause, and preserve durable discount periods with altered yield framing",
    ],
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "LEXICAL_TRANSFORMED_COPY");
});

test("QFS1-TRANSFORM-010A lexical evidence ranges begin at the actual later-part evidence", () => {
  const candidateParts = [
    bodyPart("part_0_prefix", "QUESTION_STEM", "unrelatedprefix"),
    bodyPart(
      "part_1_evidence",
      "EXPLANATION",
      "alpha beta gamma delta epsilon zeta eta theta iota kappa",
    ),
  ];
  const reference = referenceFixture({
    referenceId: "late_lexical_evidence",
    parts: [
      bodyPart("part_0_prefix", "QUESTION_STEM", "differentprefix"),
      bodyPart(
        "part_1_evidence",
        "RUBRIC",
        "kappa iota theta eta zeta epsilon delta gamma beta alpha",
      ),
    ],
  });
  const artifact = firewall.createSimilarityFirewallReviewV1(
    inspection(candidateParts, [reference]),
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "LEXICAL_TRANSFORMED_COPY");
  assert.equal(artifact.matches[0].candidatePartKind, "EXPLANATION");
  assert.equal(artifact.matches[0].referencePartKind, "RUBRIC");
  assert.deepEqual(artifact.matches[0].candidateTokenRange, {
    startInclusive: 1,
    endExclusive: 11,
  });
  assert.deepEqual(artifact.matches[0].referenceTokenRange, {
    startInclusive: 1,
    endExclusive: 11,
  });
  assert.equal(
    artifact.matches[0].transformationProfile.includes(
      "STRUCTURED_PART_BOUNDARY_CROSSED",
    ),
    false,
  );
});

test("QFS1-STRUCTURE-011 a copy split across structured parts blocks", () => {
  const candidateParts = [
    bodyPart(
      "part_a",
      "QUESTION_STEM",
      "Analysts compare coastal parcel income using stable rent growth",
    ),
    bodyPart(
      "part_b",
      "QUESTION_OPTION",
      "discount periods and terminal yield assumptions for valuation",
    ),
  ];
  const reference = referenceFixture({
    referenceId: "ref_split",
    parts: [bodyPart("part_ref", "QUESTION_STEM", `${candidateParts[0].bodyText} ${candidateParts[1].bodyText}`)],
  });
  const artifact = firewall.createSimilarityFirewallReviewV1(
    inspection(candidateParts, [reference]),
  );
  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "STRUCTURED_PARTS_COPY");
  assert.ok(
    artifact.matches[0].transformationProfile.includes(
      "STRUCTURED_PART_BOUNDARY_CROSSED",
    ),
  );
});

test("QFS1-RESISTANCE-012 numeric layout without lexical copying remains clear", () => {
  const artifact = review(
    "Compute warehouse depreciation from purchase price 120 and residual value 20 over 5 years",
    [
      "Estimate orchard harvest volume from tree count 300 and average yield 40 over 5 seasons",
    ],
  );
  assert.equal(artifact.outcome, "CLEAR");
  assert.deepEqual(artifact.matches, []);
});

test("QFS1-RESISTANCE-013 short generic expressions cannot block", () => {
  const artifact = review("Calculate the value", ["calculate value"]);
  assert.equal(artifact.outcome, "CLEAR");
  assert.deepEqual(artifact.matches, []);
});

test("QFS1-RESISTANCE-014 insufficient distinct lexical evidence cannot become strong copy", () => {
  const artifact = review(
    "rent rent rent rent rent rent rent rent rent",
    ["rent rent rent rent rent rent rent rent rent"],
  );
  assert.equal(artifact.outcome, "CLEAR");
});

test("QFS1-RESISTANCE-014A five shared lexical tokens cannot bypass the six-token floor", () => {
  const artifact = review(
    "alpha beta gamma delta epsilon 101 202 303",
    ["alpha beta gamma delta epsilon 404 505 606"],
  );
  assert.equal(artifact.outcome, "CLEAR");
  assert.deepEqual(artifact.matches, []);
});

test("QFS1-ACCOUNTING-015 every short reference consumes fixed corpus overhead", () => {
  const one = review(ORIGINAL, ["x"]);
  const four = review(ORIGINAL, ["x", "y", "z", "q"]);
  assert.equal(one.outcome, "CLEAR");
  assert.equal(four.outcome, "CLEAR");
  assert.equal(
    four.workAccounting.fixedReferenceOverheadUnits -
      one.workAccounting.fixedReferenceOverheadUnits,
    3 * contracts.QFS1_LIMITS.fixedReferenceOverheadWorkUnits,
  );
  assert.equal(four.corpusCounts.referenceCount, 4);
});

test("QFS1-ACCOUNTING-016 unchanged duplicate-content references still consume work", () => {
  const references = ["tiny", "tiny", "tiny"];
  const artifact = review(ORIGINAL, references);
  assert.equal(artifact.corpusCounts.referenceCount, 3);
  assert.equal(
    artifact.workAccounting.fixedReferenceOverheadUnits,
    3 * contracts.QFS1_LIMITS.fixedReferenceOverheadWorkUnits,
  );
  assert.equal(
    artifact.workAccounting.originalCharacters,
    ORIGINAL.length + 12,
  );
  assert.equal(
    artifact.workAccounting.normalizedCharacters,
    ORIGINAL.length + 12,
  );
});

test("QFS1-LIMIT-017 excessive reference count fails before any body accessor runs", () => {
  const parts = [bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL)];
  const base = inspection(parts, []);
  let bodyReads = 0;
  const references = Array.from(
    { length: contracts.QFS1_LIMITS.maxCorpusReferences + 1 },
    (_, index) => ({
      referenceId: `ref_over_${index}`,
      referenceDigest: digest("1"),
      purpose: "PROTECTED_EXPRESSION_GUARD",
      sourceClass: "RIGHTS_UNKNOWN",
      version: "v1",
      parts: [
        Object.defineProperty(
          {
            partId: `part_over_${index}`,
            partKind: "QUESTION_STEM",
            bodyDigest: digest("2"),
          },
          "bodyText",
          {
            enumerable: true,
            get() {
              bodyReads += 1;
              return "must not be read";
            },
          },
        ),
      ],
      manifestDigest: digest("3"),
    }),
  );
  assert.throws(
    () =>
      firewall.createSimilarityFirewallReviewV1({
        ...base,
        corpus: { ...base.corpus, references },
      }),
    /QFS1_FAIL_CLOSED:CORPUS_REFERENCES_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  assert.equal(bodyReads, 0);
});

test("QFS1-LIMIT-018 per-body character overflow fails closed", () => {
  const parts = [
    bodyPart(
      "part_candidate",
      "QUESTION_STEM",
      "x".repeat(contracts.QFS1_LIMITS.maxCharactersPerBody + 1),
    ),
  ];
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(inspection(parts, [])),
    /CHARACTER_LIMIT_EXCEEDED/u,
  );
});

test("QFS1-LIMIT-019 aggregate character overflow fails before hashing", () => {
  const parts = Array.from({ length: 9 }, (_, index) =>
    bodyPart(
      `part_aggregate_${index}`,
      "SUPPORTING_MATERIAL",
      String(index).repeat(contracts.QFS1_LIMITS.maxCharactersPerBody),
    ),
  );
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(inspection(parts, [])),
    /QFS1_FAIL_CLOSED:AGGREGATE_CHARACTER_LIMIT_EXCEEDED/u,
  );
});

test("QFS1-LIMIT-019A NFKC expansion is bounded per body and in aggregate", () => {
  const expandingCharacter = "\ufb03";
  assert.equal(expandingCharacter.normalize("NFKC"), "ffi");
  const perBodyOverflow = expandingCharacter.repeat(
    Math.floor(contracts.QFS1_LIMITS.maxNormalizedCharactersPerBody / 3) + 1,
  );
  assert.ok(perBodyOverflow.length <= contracts.QFS1_LIMITS.maxCharactersPerBody);
  assert.ok(
    perBodyOverflow.normalize("NFKC").length >
      contracts.QFS1_LIMITS.maxNormalizedCharactersPerBody,
  );
  assert.throws(
    () => review(perBodyOverflow, []),
    /QFS1_FAIL_CLOSED:NORMALIZED_CHARACTER_LIMIT_EXCEEDED/u,
  );

  const aggregateBody = expandingCharacter.repeat(10_000);
  assert.ok(
    aggregateBody.normalize("NFKC").length <=
      contracts.QFS1_LIMITS.maxNormalizedCharactersPerBody,
  );
  const aggregateParts = Array.from({ length: 9 }, (_, index) =>
    bodyPart(`part_normalized_aggregate_${index}`, "SUPPORTING_MATERIAL", aggregateBody),
  );
  assert.ok(
    aggregateParts.reduce((total, part) => total + part.bodyText.length, 0) <=
      contracts.QFS1_LIMITS.maxAggregateInspectedCharacters,
  );
  assert.ok(
    aggregateParts.reduce(
      (total, part) => total + part.bodyText.normalize("NFKC").length,
      0,
    ) > contracts.QFS1_LIMITS.maxAggregateNormalizedCharacters,
  );
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(inspection(aggregateParts, [])),
    /QFS1_FAIL_CLOSED:AGGREGATE_NORMALIZED_CHARACTER_LIMIT_EXCEEDED/u,
  );
});

test("QFS1-LIMIT-020 token overflow throws and comparison/window exhaustion cannot clear", () => {
  const tooManyTokens = Array.from({ length: 257 }, (_, index) => `word${index}`).join(" ");
  const tokenParts = [bodyPart("part_token", "QUESTION_STEM", tooManyTokens)];
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(inspection(tokenParts, [])),
    /QFS1_FAIL_CLOSED:BODY_TOKEN_LIMIT_EXCEEDED/u,
  );

  const boundedBody = Array.from({ length: 70 }, () => "x").join(" ");
  const candidateParts = [bodyPart("part_budget_candidate", "QUESTION_STEM", boundedBody)];
  const references = Array.from(
    { length: contracts.QFS1_LIMITS.maxCorpusReferences },
    (_, referenceIndex) =>
      referenceFixture({
        referenceId: `ref_budget_${String(referenceIndex).padStart(2, "0")}`,
        parts: Array.from(
          { length: contracts.QFS1_LIMITS.maxPartsPerReference },
          (_, partIndex) =>
            bodyPart(
              `part_budget_${String(partIndex).padStart(2, "0")}`,
              "QUESTION_STEM",
              boundedBody,
            ),
        ),
      }),
  );
  const exhausted = firewall.createSimilarityFirewallReviewV1(
    inspection(candidateParts, references),
  );
  assert.equal(exhausted.outcome, "REVIEW_REQUIRED");
  assert.equal(exhausted.workAccounting.budgetExhausted, true);
  assert.equal(exhausted.workAccounting.completeCorpusInspection, false);
  assert.ok(
    exhausted.workAccounting.generatedWindows ===
      contracts.QFS1_LIMITS.maxTotalGeneratedWindows ||
      exhausted.workAccounting.comparisonWorkUnits ===
        contracts.QFS1_LIMITS.maxTotalComparisonWorkUnits,
  );
});

test("QFS1-ACCOUNTING-020A mandatory corpus scan completes before late-reference optional exhaustion", () => {
  const candidateText = fullBudgetBody("candidatebudget");
  const candidateParts = [
    bodyPart("part_candidate_budget", "QUESTION_STEM", candidateText),
  ];
  const heavyParts = Array.from({ length: 6 }, (_, index) =>
    bodyPart(
      `part_heavy_${index}`,
      "SUPPORTING_MATERIAL",
      fullBudgetBody(`heavybudget${String.fromCharCode(97 + index)}`),
    ),
  );
  const lateParts = [
    bodyPart(
      "part_late_budget",
      "RUBRIC",
      fullBudgetBody("latebudget"),
    ),
  ];
  const [heavyReference, lateReference] = orderedReferencePair(
    heavyParts,
    lateParts,
    "mandatorylate",
  );

  const forward = firewall.createSimilarityFirewallReviewV1(
    inspection(candidateParts, [heavyReference, lateReference]),
  );
  const previous = process.env.LC_ALL;
  process.env.LC_ALL = "tr_TR.UTF-8";
  let permuted;
  try {
    permuted = firewall.createSimilarityFirewallReviewV1(
      inspection(candidateParts, [lateReference, heavyReference]),
    );
  } finally {
    if (previous === undefined) delete process.env.LC_ALL;
    else process.env.LC_ALL = previous;
  }

  assert.deepEqual(permuted, forward);
  assert.equal(forward.outcome, "REVIEW_REQUIRED");
  assert.deepEqual(forward.matches, []);
  assert.equal(forward.workAccounting.budgetExhausted, true);
  assert.equal(forward.workAccounting.completeCorpusInspection, false);
  assert.equal(forward.corpusCounts.inspectedBodyCount, 8);
  assert.equal(
    forward.workAccounting.originalCharacters,
    contracts.QFS1_LIMITS.maxAggregateInspectedCharacters,
  );
  assert.equal(
    forward.workAccounting.normalizedCharacters,
    contracts.QFS1_LIMITS.maxAggregateNormalizedCharacters,
  );
  assert.ok(forward.workAccounting.generatedWindows > 0);
  assert.ok(forward.workAccounting.comparisonWorkUnits > 0);
  assert.equal(
    forward.workAccounting.totalWorkUnits,
    contracts.QFS1_LIMITS.maxTotalWorkUnits,
  );
  assert.doesNotMatch(
    JSON.stringify(forward),
    /candidatebudget|heavybudget|latebudget|bodyText|excerpt/u,
  );
  assert.deepEqual(firewall.assertSimilarityFirewallReviewV1(forward), forward);
});

test("QFS1-ACCOUNTING-020B blocking evidence precedes later optional exhaustion", () => {
  const candidateText = fullBudgetBody("blockingbudget");
  const candidateParts = [
    bodyPart("part_candidate_blocking", "QUESTION_STEM", candidateText),
  ];
  const blockingParts = [
    bodyPart("part_blocking_copy", "QUESTION_STEM", candidateText),
  ];
  const heavyParts = Array.from({ length: 6 }, (_, index) =>
    bodyPart(
      `part_blocking_heavy_${index}`,
      "SUPPORTING_MATERIAL",
      fullBudgetBody(`blockingheavy${String.fromCharCode(97 + index)}`),
    ),
  );
  const [blockingReference, heavyReference] = orderedReferencePair(
    blockingParts,
    heavyParts,
    "blockingprecedence",
  );

  const artifact = firewall.createSimilarityFirewallReviewV1(
    inspection(candidateParts, [blockingReference, heavyReference]),
  );

  assert.equal(artifact.outcome, "BLOCKED");
  assert.equal(artifact.matches[0].matchKind, "EXACT_NORMALIZED_COPY");
  assert.equal(artifact.matches[0].disposition, "BLOCKING");
  assert.equal(artifact.workAccounting.budgetExhausted, true);
  assert.equal(artifact.workAccounting.completeCorpusInspection, false);
  assert.equal(artifact.corpusCounts.inspectedBodyCount, 8);
  assert.equal(
    artifact.workAccounting.originalCharacters,
    contracts.QFS1_LIMITS.maxAggregateInspectedCharacters,
  );
  assert.equal(
    artifact.workAccounting.normalizedCharacters,
    contracts.QFS1_LIMITS.maxAggregateNormalizedCharacters,
  );
  assert.equal("releaseAuthority" in artifact, false);
  assert.equal("rightsGranted" in artifact, false);
  assert.deepEqual(firewall.assertSimilarityFirewallReviewV1(artifact), artifact);
});

test("QFS1-BINDING-021 candidate body digest and content binding drift fail", () => {
  const parts = [bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL)];
  const valid = inspection(parts, []);
  assert.throws(
    () =>
      firewall.createSimilarityFirewallReviewV1({
        ...valid,
        candidateParts: [{ ...parts[0], bodyDigest: digest("f") }],
      }),
    /BODY_DIGEST_MISMATCH|CANDIDATE_CONTENT_DIGEST_CROSS_BINDING_FAILED/u,
  );
  assert.throws(
    () =>
      firewall.createSimilarityFirewallReviewV1({
        ...valid,
        candidate: { ...valid.candidate, candidateDigest: digest("e") },
      }),
    /QF0I_FAIL_CLOSED:CANDIDATE_DIGEST_MISMATCH/u,
  );
});

test("QFS1-BINDING-022 reference body digest mismatch fails closed", () => {
  const parts = [bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL)];
  const reference = referenceFixture({
    referenceId: "ref_drift",
    parts: [bodyPart("part_ref", "QUESTION_STEM", ORIGINAL)],
  });
  const valid = inspection(parts, [reference]);
  const drifted = clone(valid);
  drifted.corpus.references[0].parts[0].bodyText = `${ORIGINAL} changed`;
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(drifted),
    /QFS1_FAIL_CLOSED:BODY_DIGEST_MISMATCH/u,
  );
});

test("QFS1-BINDING-023 corpus manifest drift fails closed", () => {
  const parts = [bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL)];
  const reference = referenceFixture({
    referenceId: "ref_corpus_drift",
    parts: [bodyPart("part_ref", "QUESTION_STEM", "unrelated bounded material")],
  });
  const valid = inspection(parts, [reference]);
  assert.throws(
    () =>
      firewall.createSimilarityFirewallReviewV1({
        ...valid,
        corpus: { ...valid.corpus, corpusManifestDigest: digest("0") },
      }),
    /QFS1_FAIL_CLOSED:CORPUS_MANIFEST_DRIFT/u,
  );
});

test("QFS1-CORPUS-023A rejects non-opaque reference and corpus identifiers", () => {
  const parts = [bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL)];
  const reference = referenceFixture({
    referenceId: "protected_textbook_chapter",
    parts: [bodyPart("part_ref", "QUESTION_STEM", "unrelated bounded material")],
  });
  const valid = inspection(parts, [reference]);
  const semanticReference = clone(valid);
  semanticReference.corpus.references[0].referenceId = "ref_textbook_chapter";
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1(semanticReference),
    /QFS1_FAIL_CLOSED:REFERENCE_0_ID_INVALID/u,
  );
  assert.throws(
    () =>
      firewall.createSimilarityFirewallReviewV1({
        ...valid,
        corpus: { ...valid.corpus, corpusId: "corpus_textbook" },
      }),
    /QFS1_FAIL_CLOSED:CORPUS_ID_INVALID/u,
  );
});

test("QFS1-RIGHTS-024 source class never grants rights through the firewall", () => {
  for (const sourceClass of contracts.QFS1_REFERENCE_SOURCE_CLASSES) {
    const artifact = review(ORIGINAL, [ORIGINAL], { sourceClass });
    assert.equal(artifact.outcome, "BLOCKED", sourceClass);
    assert.equal("rightsGranted" in artifact, false);
    assert.equal("releaseAuthority" in artifact, false);
  }
});

test("QFS1-RIGHTS-025 protected, private, and textbook sources block without reuse grant", () => {
  for (const sourceClass of [
    "RIGHTS_UNKNOWN",
    "USER_PRIVATE_ONLY",
    "ACADEMY_OR_COMMERCIAL_TEXTBOOK",
  ]) {
    const artifact = review(ORIGINAL, [ORIGINAL], {
      sourceClass,
      purpose:
        sourceClass === "USER_PRIVATE_ONLY"
          ? "PRIVATE_SOURCE_GUARD"
          : "PROTECTED_EXPRESSION_GUARD",
    });
    assert.equal(artifact.outcome, "BLOCKED");
    const serialized = JSON.stringify(artifact);
    assert.doesNotMatch(serialized, /commercial|generationRight|blueprintRight|reuse/u);
  }
});

test("QFS1-CLOSURE-026 proxy, accessor, symbol, and unsupported shapes fail closed", () => {
  let traps = 0;
  const proxied = new Proxy({}, {
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
    () => firewall.createSimilarityFirewallReviewV1(proxied),
    /QFS1_FAIL_CLOSED:INSPECTION_PROXY_UNSUPPORTED/u,
  );
  assert.equal(traps, 0);

  const parts = [bodyPart("part_candidate", "QUESTION_STEM", ORIGINAL)];
  const valid = inspection(parts, []);
  const accessor = { ...parts[0] };
  Object.defineProperty(accessor, "bodyText", {
    enumerable: true,
    get() {
      throw new Error("accessor executed");
    },
  });
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1({ ...valid, candidateParts: [accessor] }),
    /QFS1_FAIL_CLOSED:CANDIDATE_PART_0_DATA_PROPERTY_REQUIRED/u,
  );
  const symbolPart = { ...parts[0], [Symbol("hidden")]: "raw" };
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1({ ...valid, candidateParts: [symbolPart] }),
    /QFS1_FAIL_CLOSED:CANDIDATE_PART_0_SYMBOL_KEY_UNSUPPORTED/u,
  );
  assert.throws(
    () => firewall.createSimilarityFirewallReviewV1({ ...valid, candidateParts: new Set(parts) }),
    /QFS1_FAIL_CLOSED:CANDIDATE_PARTS_ARRAY_REQUIRED/u,
  );
});

test("QFS1-DETERMINISM-027 process locale and all input array orders preserve artifact", () => {
  const candidateParts = [
    bodyPart("part_b", "QUESTION_OPTION", "terminal yield assumptions provide final valuation context"),
    bodyPart("part_a", "QUESTION_STEM", "coastal parcel analysts compare durable rental growth and discount periods"),
  ];
  const references = [
    referenceFixture({
      referenceId: "ref_z",
      parts: [bodyPart("part_z", "QUESTION_STEM", "unrelated orchard harvest volume evidence")],
    }),
    referenceFixture({
      referenceId: "ref_a",
      parts: [bodyPart("part_a", "QUESTION_STEM", "unrelated warehouse depreciation evidence")],
    }),
  ];
  const forward = firewall.createSimilarityFirewallReviewV1(
    inspection(candidateParts, references),
  );
  const previous = process.env.LC_ALL;
  process.env.LC_ALL = "tr_TR.UTF-8";
  try {
    const reverse = firewall.createSimilarityFirewallReviewV1(
      inspection([...candidateParts].reverse(), [...references].reverse()),
    );
    assert.deepEqual(reverse, forward);
  } finally {
    if (previous === undefined) delete process.env.LC_ALL;
    else process.env.LC_ALL = previous;
  }
  assert.doesNotMatch(read(FIREWALL_PATH), /localeCompare/u);
});

test("QFS1-OUTPUT-028 metadata artifact contains no raw body or excerpt", () => {
  const markerCandidate = "CANDIDATE_SECRET_84f9 coastal parcel income discount periods terminal yield evidence";
  const markerReference = "REFERENCE_SECRET_1a2b unrelated orchard harvest volume seasonal evidence";
  const artifact = review(markerCandidate, [markerReference]);
  const serialized = JSON.stringify(artifact);
  assert.doesNotMatch(serialized, /CANDIDATE_SECRET_84f9|REFERENCE_SECRET_1a2b/u);
  assert.doesNotMatch(serialized, /bodyText|excerpt|questionBody|answerBody|ocr|learner/u);
  assert.deepEqual(Object.keys(artifact), REVIEW_FIELDS);
  assert.ok(Object.isFrozen(artifact));
  assert.ok(Object.isFrozen(artifact.matches));
});

test("QFS1-AUTHORITY-029 CLEAR creates no release, bank, learner, or rights authority", () => {
  const artifact = review(ORIGINAL, [
    "Independent orchard harvest estimates use tree density seasonal rainfall and storage loss controls",
  ]);
  assert.equal(artifact.outcome, "CLEAR");
  for (const forbidden of [
    "releaseAuthority",
    "sourceRight",
    "sourceEligibility",
    "bankAssignment",
    "learnerAssignment",
    "approved",
  ]) {
    assert.equal(forbidden in artifact, false);
  }
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.releaseAuthorityAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.bankAssignmentAbsent, true);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.learnerAssignmentAbsent, true);
});

test("QFS1-DIGEST-030 every metadata drift invalidates the asserted review", () => {
  const artifact = review(ORIGINAL, [ORIGINAL]);
  const mutations = [
    (value) => { value.candidateId = `qfc_${"0".repeat(64)}`; },
    (value) => { value.candidateDigest = digest("0"); },
    (value) => { value.candidateBodyManifestDigest = digest("0"); },
    (value) => { value.corpusManifestDigest = digest("0"); },
    (value) => { value.matches[0].measure.scoreMillionths -= 1; },
    (value) => { value.matches[0].candidateTokenRange.startInclusive += 1; },
    (value) => { value.matches[0].referenceDigest = digest("0"); },
  ];
  for (const mutate of mutations) {
    const changed = clone(artifact);
    mutate(changed);
    assert.throws(
      () => firewall.assertSimilarityFirewallReviewV1(changed),
      /QFS1_FAIL_CLOSED/u,
    );
  }
});

test("QFS1-BOUNDARY-031 source contains no provider, network, DB, persistence, or remote path", () => {
  const source = `${read(CONTRACTS_PATH)}\n${read(FIREWALL_PATH)}`;
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//u);
  assert.doesNotMatch(source, /@supabase|postgres|prisma|drizzle|databaseClient/u);
  assert.doesNotMatch(source, /openai|anthropic|gemini|providerExecution\s*:\s*"ON"/iu);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream|child_process/u);
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.network, "OFF");
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.providerExecution, "OFF");
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.databaseAndPersistence, "OFF");
  assert.equal(contracts.QFS1_SOURCE_ONLY_BOUNDARY_RECEIPT.remoteMutation, "ZERO");
});
