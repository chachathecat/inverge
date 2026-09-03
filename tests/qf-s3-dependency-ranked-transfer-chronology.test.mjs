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
import * as qfs1 from "../lib/question-foundry/similarity/similarity-firewall.ts";
import * as qfs2 from "../lib/question-foundry/audit/prelude-core.ts";
import * as contracts from "../lib/question-foundry/chronology/chronology-contracts.ts";
import * as core from "../lib/question-foundry/chronology/chronology-core.ts";

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "4aa0d84e0d8d9255e74a7b6428aca99e25a4218e";
const BASE_TREE = "03aba98a8b47957dc0fd9f3dc4d8e45d40b1df33";
const CONFIG_PATH =
  "config/dabangil-qf-s3-dependency-ranked-transfer-chronology-v1.json";
const EXACT_PATHS = [
  "docs/product/dabangil-qf-s3-dependency-ranked-transfer-chronology-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-qf-s3-dependency-ranked-transfer-chronology-validation.md",
  "lib/question-foundry/chronology/chronology-contracts.ts",
  "lib/question-foundry/chronology/chronology-core.ts",
  "tests/qf-s3-dependency-ranked-transfer-chronology.test.mjs",
];

function read(path, encoding = "utf8") {
  return readFileSync(new URL(path, ROOT_URL), encoding);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digest(token) {
  return `sha256:${token.repeat(64)}`;
}

function digestText(value) {
  return `sha256:${sha256(value)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function handle(token) {
  return `qfri_${sha256(`handle:${token}`).slice(0, 32)}`;
}

function variantId(token) {
  return `qfv_${token.repeat(64)}`;
}

function artifactId(artifactDigest) {
  return `qfta_${artifactDigest.slice("sha256:".length)}`;
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
    permittedPurpose: qf0a2Contracts.QF0A2_PURPOSE,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T23:59:59.999Z",
    policyVersion: "policy.qfs3.fixture.v1",
    policyDigest: digest("a"),
  };
}

function modelMaterial(role, token, executedAt) {
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
    executedAt,
  };
}

function bodyPart(partId, bodyText) {
  return {
    partId,
    partKind: "QUESTION_STEM",
    bodyDigest: digestText(bodyText),
    bodyText,
  };
}

function bodyManifest(parts, domain) {
  const ordered = [...parts].sort((left, right) =>
    qf0a1.compareUtf8BytesV1(
      `${left.partId}/${left.bodyDigest}`,
      `${right.partId}/${right.bodyDigest}`,
    ),
  );
  return qf0a1.digestCanonicalJsonV1({
    domain,
    parts: ordered.map(({ partId, partKind, bodyDigest }) => ({
      partId,
      partKind,
      bodyDigest,
    })),
  });
}

function createCandidate(candidateContentDigest) {
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
      modelMaterial("GENERATOR", "3", "2026-06-01T09:00:00.000Z"),
    ),
    independentExecutions: [],
    createdAt: "2026-06-01T10:00:00.000Z",
  });
}

function similarityAuthorityFixture() {
  const candidateParts = [
    bodyPart(
      "part_candidate",
      "Orchid analysts compare coastal parcel income using stable rent growth discount periods and terminal yield assumptions",
    ),
  ];
  const candidateBodyManifestDigest = bodyManifest(
    candidateParts,
    "QFS1_CANDIDATE_BODY_MANIFEST_V1",
  );
  const candidate = createCandidate(candidateBodyManifestDigest);
  const referenceParts = [
    bodyPart(
      "part_reference",
      "Independent mountain valuation evidence uses replacement cost depreciation and market adjustment controls",
    ),
  ];
  const manifestDigest = bodyManifest(
    referenceParts,
    "QFS1_REFERENCE_BODY_MANIFEST_V1",
  );
  const referenceId = `qfsr_${sha256("qfs3-reference")}`;
  const reference = {
    referenceId,
    referenceDigest: qf0a1.digestCanonicalJsonV1({
      domain: "QFS1_REFERENCE_IDENTITY_V1",
      referenceId,
      purpose: "PROTECTED_EXPRESSION_GUARD",
      sourceClass: "RIGHTS_UNKNOWN",
      version: "v1",
      manifestDigest,
    }),
    purpose: "PROTECTED_EXPRESSION_GUARD",
    sourceClass: "RIGHTS_UNKNOWN",
    version: "v1",
    parts: referenceParts,
    manifestDigest,
  };
  const corpusId = `qfsc_${sha256("qfs3-corpus")}`;
  const corpusManifestDigest = qf0a1.digestCanonicalJsonV1({
    domain: "QFS1_REFERENCE_CORPUS_MANIFEST_V1",
    corpusId,
    version: "v1",
    references: [
      {
        referenceId,
        referenceDigest: reference.referenceDigest,
        purpose: reference.purpose,
        sourceClass: reference.sourceClass,
        version: reference.version,
        manifestDigest,
        partCount: 1,
      },
    ],
  });
  const authorityInput = {
    contractVersion: "SimilarityCorpusPreparationInputV1",
    candidate,
    candidateParts,
    corpus: {
      contractVersion: "SimilarityReferenceCorpusV1",
      corpusId,
      version: "v1",
      references: [reference],
      corpusManifestDigest,
    },
  };
  return {
    candidate,
    authorityInput,
    review: qfs1.createSimilarityFirewallReviewV1(authorityInput),
    prelude: qfs2.createCandidateAuditPreludeV1(candidate),
  };
}

function systemActor(token = "1") {
  return {
    actorKind: "SYSTEM_COMPONENT",
    componentId: `qfsc_${token.repeat(32)}`,
    componentVersion: "v1",
    componentArtifactDigest: digest(token),
  };
}

function modelActor(role, token, occurredAt) {
  return {
    actorKind: "MODEL_EXECUTION",
    modelExecution: qf0a2.createModelExecutionIdentityV1(
      modelMaterial(role, token, occurredAt),
    ),
  };
}

function receipt({
  inputReceiptId,
  kind,
  outputDigest,
  occurredAt,
  predecessors = [],
  predecessorOutputDigests = [],
  variant = null,
  artifactDigest = outputDigest,
  artifactId: explicitArtifactId,
  actor = systemActor(),
  validatorRef = null,
}) {
  return {
    inputReceiptId,
    kind,
    variantId: variant?.variantId ?? null,
    variantDigest: variant?.variantDigest ?? null,
    artifactId: explicitArtifactId ?? artifactId(artifactDigest),
    artifactDigest,
    actor,
    occurredAt,
    predecessorInputReceiptIds: predecessors,
    predecessorOutputDigests,
    declaredValidatorProfileRef: validatorRef,
    outputDigest,
  };
}

function variantFixture(token, validatorToken) {
  return {
    variantId: variantId(token),
    variantDigest: digest(token),
    declaredValidatorProfileRefs: [
      qf0b.createOpaqueRegistryRefV1(
        refMaterial("VALIDATOR_PROFILE", validatorToken),
      ),
    ],
  };
}

function completeInput(variantCount = 1, equalTime = false) {
  const fixture = similarityAuthorityFixture();
  const at = (hour) =>
    equalTime ? "2026-06-01T12:00:00.000Z" : `2026-06-01T${String(hour).padStart(2, "0")}:00:00.000Z`;
  const variants = [variantFixture("8", "9")];
  if (variantCount > 1) variants.push(variantFixture("a", "b"));
  const receipts = [];
  const preludeOutput = fixture.prelude.preludeDigest;
  const similarityOutput = fixture.review.reviewDigest;
  receipts.push(
    receipt({
      inputReceiptId: handle("1"),
      kind: "CANDIDATE_PRELUDE_BOUND",
      outputDigest: preludeOutput,
      artifactDigest: preludeOutput,
      occurredAt: at(12),
    }),
    receipt({
      inputReceiptId: handle("2"),
      kind: "SIMILARITY_REVIEW_BOUND",
      outputDigest: similarityOutput,
      artifactDigest: similarityOutput,
      occurredAt: at(12),
    }),
  );
  const aggregateHandles = [];
  const aggregateOutputs = [];
  const handleTokens = [
    ["4", "5", "6", "7", "8", "9"],
    ["a", "b", "c", "d", "e", "f"],
  ];
  const outputTokens = [
    ["1", "2", "3", "4", "5", "6"],
    ["7", "8", "9", "a", "b", "c"],
  ];
  const modelTokens = [
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const [sealToken, validatorToken, solverToken, judgeToken, criticToken, aggregateToken] =
      handleTokens[index];
    const [sealOut, validatorOut, solverOut, judgeOut, criticOut, aggregateOut] =
      outputTokens[index].map(digest);
    const seal = handle(sealToken);
    const validator = handle(validatorToken);
    const solver = handle(solverToken);
    const judge = handle(judgeToken);
    const critic = handle(criticToken);
    const aggregate = handle(aggregateToken);
    receipts.push(
      receipt({
        inputReceiptId: seal,
        kind: "TRANSFER_VARIANT_SEALED",
        outputDigest: sealOut,
        artifactDigest: variant.variantDigest,
        variant,
        occurredAt: at(13),
        predecessors: [handle("1")],
        predecessorOutputDigests: [preludeOutput],
      }),
      receipt({
        inputReceiptId: validator,
        kind: "DECLARED_VALIDATOR_COMPLETED",
        outputDigest: validatorOut,
        variant,
        occurredAt: at(14),
        predecessors: [seal],
        predecessorOutputDigests: [sealOut],
        validatorRef: variant.declaredValidatorProfileRefs[0],
        actor: systemActor(index === 0 ? "2" : "3"),
      }),
      receipt({
        inputReceiptId: solver,
        kind: "BLIND_SOLVER_COMPLETED",
        outputDigest: solverOut,
        variant,
        occurredAt: at(14),
        predecessors: [seal],
        predecessorOutputDigests: [sealOut],
        actor: modelActor("BLIND_SOLVER", modelTokens[index][0], at(14)),
      }),
      receipt({
        inputReceiptId: judge,
        kind: "JUDGE_COMPLETED",
        outputDigest: judgeOut,
        variant,
        occurredAt: at(15),
        predecessors: [validator, solver],
        predecessorOutputDigests: [validatorOut, solverOut],
        actor: modelActor("JUDGE", modelTokens[index][1], at(15)),
      }),
      receipt({
        inputReceiptId: critic,
        kind: "ADVERSARIAL_CRITIC_COMPLETED",
        outputDigest: criticOut,
        variant,
        occurredAt: at(16),
        predecessors: [judge, validator],
        predecessorOutputDigests: [judgeOut, validatorOut],
        actor: modelActor("ADVERSARIAL_CRITIC", modelTokens[index][2], at(16)),
      }),
      receipt({
        inputReceiptId: aggregate,
        kind: "VARIANT_VALIDATION_AGGREGATED",
        outputDigest: aggregateOut,
        variant,
        occurredAt: at(17),
        predecessors: [validator, solver, judge, critic],
        predecessorOutputDigests: [validatorOut, solverOut, judgeOut, criticOut],
      }),
    );
    aggregateHandles.push(aggregate);
    aggregateOutputs.push(aggregateOut);
  }
  const transferOutput = digest("d");
  receipts.push(
    receipt({
      inputReceiptId: handle("transfer"),
      kind: "TRANSFER_EVIDENCE_AGGREGATED",
      outputDigest: transferOutput,
      occurredAt: at(18),
      predecessors: [handle("2"), ...aggregateHandles],
      predecessorOutputDigests: [similarityOutput, ...aggregateOutputs],
    }),
    receipt({
      inputReceiptId: handle("meta"),
      kind: "META_AUDIT_COMPLETED",
      outputDigest: digest("e"),
      occurredAt: at(19),
      predecessors: [handle("transfer")],
      predecessorOutputDigests: [transferOutput],
      actor: modelActor("META_AUDITOR", "f", at(19)),
    }),
  );
  return {
    contractVersion: "DependencyRankedTransferChronologyInputV1",
    candidate: fixture.candidate,
    qfS1Review: fixture.review,
    qfS1AuthorityInput: fixture.authorityInput,
    qfS2Prelude: fixture.prelude,
    variants,
    receipts,
  };
}

function maximumCapacityInput() {
  const fixture = similarityAuthorityFixture();
  const occurredAt = "2026-06-01T12:00:00.000Z";
  const maximumHandle = (label) =>
    "qfri_" + sha256("maximum-handle:" + label).slice(0, 32);
  const maximumDigest = (label) => digestText("maximum-digest:" + label);
  const maximumSystemActor = (label) => ({
    actorKind: "SYSTEM_COMPONENT",
    componentId:
      "qfsc_" + sha256("maximum-component:" + label).slice(0, 32),
    componentVersion: "v" + "x".repeat(63),
    componentArtifactDigest: digestText(
      "maximum-component-artifact:" + label,
    ),
  });
  const maximumModelActor = (role, label) => {
    const identity = sha256("maximum-model:" + label);
    return {
      actorKind: "MODEL_EXECUTION",
      modelExecution: qf0a2.createModelExecutionIdentityV1({
        contractVersion: "ModelExecutionIdentityV1",
        role,
        providerId: "provider/" + identity + identity.slice(0, 23),
        modelId: "model/" + identity + identity.slice(0, 26),
        modelVersion: "version/" + identity + identity.slice(0, 24),
        modelArtifactDigest: digestText("maximum-model-artifact:" + label),
        executionId:
          "exec_" + sha256("maximum-execution:" + label).slice(0, 32),
        executionArtifactDigest: digestText(
          "maximum-execution-artifact:" + label,
        ),
        configurationDigest: digestText("maximum-configuration:" + label),
        executedAt: occurredAt,
      }),
    };
  };
  const maximumValidatorRef = (variantIndex, validatorIndex) => {
    const label = variantIndex + ":" + validatorIndex;
    return qf0b.createOpaqueRegistryRefV1({
      contractVersion: "OpaqueRegistryRefV1",
      refKind: "VALIDATOR_PROFILE",
      registryId:
        "reg_" + sha256("maximum-registry:" + label).slice(0, 32),
      objectId: "obj_" + sha256("maximum-object:" + label).slice(0, 32),
      version: 1_000_000,
      objectDigest: digestText("maximum-validator:" + label),
    });
  };

  const variants = Array.from({ length: 8 }, (_, variantIndex) => ({
    variantId: "qfv_" + sha256("maximum-variant-id:" + variantIndex),
    variantDigest: digestText("maximum-variant-digest:" + variantIndex),
    declaredValidatorProfileRefs: Array.from(
      { length: 4 },
      (_, validatorIndex) =>
        maximumValidatorRef(variantIndex, validatorIndex),
    ),
  }));
  const receipts = [];
  const preludeHandle = maximumHandle("prelude");
  const similarityHandle = maximumHandle("similarity");
  receipts.push(
    receipt({
      inputReceiptId: preludeHandle,
      kind: "CANDIDATE_PRELUDE_BOUND",
      outputDigest: fixture.prelude.preludeDigest,
      artifactDigest: fixture.prelude.preludeDigest,
      occurredAt,
      actor: maximumSystemActor("prelude"),
    }),
    receipt({
      inputReceiptId: similarityHandle,
      kind: "SIMILARITY_REVIEW_BOUND",
      outputDigest: fixture.review.reviewDigest,
      artifactDigest: fixture.review.reviewDigest,
      occurredAt,
      actor: maximumSystemActor("similarity"),
    }),
  );

  const aggregateHandles = [];
  const aggregateOutputs = [];
  for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
    const variant = variants[variantIndex];
    const variantLabel = "variant-" + variantIndex;
    const sealHandle = maximumHandle(variantLabel + "-seal");
    const sealOutput = maximumDigest(variantLabel + "-seal");
    receipts.push(
      receipt({
        inputReceiptId: sealHandle,
        kind: "TRANSFER_VARIANT_SEALED",
        outputDigest: sealOutput,
        artifactDigest: variant.variantDigest,
        variant,
        occurredAt,
        predecessors: [preludeHandle],
        predecessorOutputDigests: [fixture.prelude.preludeDigest],
        actor: maximumSystemActor(variantLabel + "-seal"),
      }),
    );

    const validatorHandles = [];
    const validatorOutputs = [];
    for (let validatorIndex = 0; validatorIndex < 4; validatorIndex += 1) {
      const label = variantLabel + "-validator-" + validatorIndex;
      const validatorHandle = maximumHandle(label);
      const validatorOutput = maximumDigest(label);
      receipts.push(
        receipt({
          inputReceiptId: validatorHandle,
          kind: "DECLARED_VALIDATOR_COMPLETED",
          outputDigest: validatorOutput,
          variant,
          occurredAt,
          predecessors: [sealHandle],
          predecessorOutputDigests: [sealOutput],
          validatorRef: variant.declaredValidatorProfileRefs[validatorIndex],
          actor: maximumSystemActor(label),
        }),
      );
      validatorHandles.push(validatorHandle);
      validatorOutputs.push(validatorOutput);
    }

    const solverHandle = maximumHandle(variantLabel + "-solver");
    const solverOutput = maximumDigest(variantLabel + "-solver");
    const judgeHandle = maximumHandle(variantLabel + "-judge");
    const judgeOutput = maximumDigest(variantLabel + "-judge");
    const criticHandle = maximumHandle(variantLabel + "-critic");
    const criticOutput = maximumDigest(variantLabel + "-critic");
    const aggregateHandle = maximumHandle(variantLabel + "-aggregate");
    const aggregateOutput = maximumDigest(variantLabel + "-aggregate");
    receipts.push(
      receipt({
        inputReceiptId: solverHandle,
        kind: "BLIND_SOLVER_COMPLETED",
        outputDigest: solverOutput,
        variant,
        occurredAt,
        predecessors: [sealHandle],
        predecessorOutputDigests: [sealOutput],
        actor: maximumModelActor("BLIND_SOLVER", variantLabel + "-solver"),
      }),
      receipt({
        inputReceiptId: judgeHandle,
        kind: "JUDGE_COMPLETED",
        outputDigest: judgeOutput,
        variant,
        occurredAt,
        predecessors: [...validatorHandles, solverHandle],
        predecessorOutputDigests: [...validatorOutputs, solverOutput],
        actor: maximumModelActor("JUDGE", variantLabel + "-judge"),
      }),
      receipt({
        inputReceiptId: criticHandle,
        kind: "ADVERSARIAL_CRITIC_COMPLETED",
        outputDigest: criticOutput,
        variant,
        occurredAt,
        predecessors: [judgeHandle, ...validatorHandles],
        predecessorOutputDigests: [judgeOutput, ...validatorOutputs],
        actor: maximumModelActor(
          "ADVERSARIAL_CRITIC",
          variantLabel + "-critic",
        ),
      }),
      receipt({
        inputReceiptId: aggregateHandle,
        kind: "VARIANT_VALIDATION_AGGREGATED",
        outputDigest: aggregateOutput,
        variant,
        occurredAt,
        predecessors: [
          ...validatorHandles,
          solverHandle,
          judgeHandle,
          criticHandle,
        ],
        predecessorOutputDigests: [
          ...validatorOutputs,
          solverOutput,
          judgeOutput,
          criticOutput,
        ],
        actor: maximumSystemActor(variantLabel + "-aggregate"),
      }),
    );
    aggregateHandles.push(aggregateHandle);
    aggregateOutputs.push(aggregateOutput);
  }

  const transferHandle = maximumHandle("transfer");
  const transferOutput = maximumDigest("transfer");
  receipts.push(
    receipt({
      inputReceiptId: transferHandle,
      kind: "TRANSFER_EVIDENCE_AGGREGATED",
      outputDigest: transferOutput,
      occurredAt,
      predecessors: [similarityHandle, ...aggregateHandles],
      predecessorOutputDigests: [fixture.review.reviewDigest, ...aggregateOutputs],
      actor: maximumSystemActor("transfer"),
    }),
    receipt({
      inputReceiptId: maximumHandle("meta"),
      kind: "META_AUDIT_COMPLETED",
      outputDigest: maximumDigest("meta"),
      occurredAt,
      predecessors: [transferHandle],
      predecessorOutputDigests: [transferOutput],
      actor: maximumModelActor("META_AUDITOR", "meta"),
    }),
  );

  return {
    contractVersion: "DependencyRankedTransferChronologyInputV1",
    candidate: fixture.candidate,
    qfS1Review: fixture.review,
    qfS1AuthorityInput: fixture.authorityInput,
    qfS2Prelude: fixture.prelude,
    variants,
    receipts,
  };
}

function expectFailure(input, pattern) {
  assert.throws(() => core.createDependencyRankedTransferChronologyV1(input), pattern);
}

test("QFS3-CONTRACT-001 binds Issue #875, final base, APP-1 terminal receipt, and exactly six paths", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.equal(config.stage, "QF-S3");
  assert.equal(config.status, "capacity_safe_clean_replacement_candidate");
  assert.equal(config.tracking.closesIssue, 875);
  assert.deepEqual(config.base, { sha: BASE_SHA, tree: BASE_TREE });
  assert.deepEqual(config.app1TerminalReceipt, {
    outcome: "APP1_MERGED_AND_RESULTING_MAIN_VERIFIED",
    pullRequest: 876,
    approvedHeadSha: "2ef4a127fb17d29dbd709a3b101a1daa09212388",
    approvedHeadTree: "03aba98a8b47957dc0fd9f3dc4d8e45d40b1df33",
    resultingMainSha: BASE_SHA,
    resultingMainTree: BASE_TREE,
    draft: false,
    merged: true,
    actionable: { p0: 0, p1: 0, p2: 0 },
  });
  assert.deepEqual(config.changedPathsExactly, EXACT_PATHS);
});

test("QFS3-SURFACE-002 exposes only the closed chronology surface", () => {
  assert.deepEqual(Object.keys(contracts), [
    "QFS3_BLOCKING_REASONS",
    "QFS3_COMPLETENESS_STATES",
    "QFS3_CONTRACT_VERSION",
    "QFS3_LIMITS",
    "QFS3_RECEIPT_KINDS",
    "QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ]);
  assert.deepEqual(Object.keys(core), [
    "assertDependencyRankedTransferChronologyV1",
    "createDependencyRankedTransferChronologyV1",
  ]);
  assert.deepEqual(contracts.QFS3_RECEIPT_KINDS, [
    "CANDIDATE_PRELUDE_BOUND",
    "SIMILARITY_REVIEW_BOUND",
    "TRANSFER_VARIANT_SEALED",
    "DECLARED_VALIDATOR_COMPLETED",
    "BLIND_SOLVER_COMPLETED",
    "JUDGE_COMPLETED",
    "ADVERSARIAL_CRITIC_COMPLETED",
    "VARIANT_VALIDATION_AGGREGATED",
    "TRANSFER_EVIDENCE_AGGREGATED",
    "META_AUDIT_COMPLETED",
  ]);
});

test("QFS3-DETERMINISM-003 valid one-variant chronology is deterministic", () => {
  const input = completeInput();
  const first = core.createDependencyRankedTransferChronologyV1(input);
  const second = core.createDependencyRankedTransferChronologyV1(input);
  assert.deepEqual(first, second);
  assert.equal(first.completeness, "COMPLETE");
  assert.deepEqual(first.blockingReasons, []);
  assert.deepEqual(core.assertDependencyRankedTransferChronologyV1(first, input), first);
});

test("QFS3-DETERMINISM-004 multiple variants ignore input order", () => {
  const input = completeInput(2);
  const expected = core.createDependencyRankedTransferChronologyV1(input);
  const reordered = clone(input);
  reordered.variants.reverse();
  reordered.receipts.reverse();
  assert.deepEqual(core.createDependencyRankedTransferChronologyV1(reordered), expected);
});

test("QFS3-ORDER-005 equal-time receipts remain dependency-ranked", () => {
  const chronology = core.createDependencyRankedTransferChronologyV1(
    completeInput(1, true),
  );
  const kinds = chronology.receipts.map((entry) => entry.kind);
  for (const [before, after] of [
    ["TRANSFER_VARIANT_SEALED", "DECLARED_VALIDATOR_COMPLETED"],
    ["DECLARED_VALIDATOR_COMPLETED", "JUDGE_COMPLETED"],
    ["JUDGE_COMPLETED", "ADVERSARIAL_CRITIC_COMPLETED"],
    ["ADVERSARIAL_CRITIC_COMPLETED", "VARIANT_VALIDATION_AGGREGATED"],
    ["VARIANT_VALIDATION_AGGREGATED", "TRANSFER_EVIDENCE_AGGREGATED"],
    ["TRANSFER_EVIDENCE_AGGREGATED", "META_AUDIT_COMPLETED"],
  ]) {
    assert.ok(kinds.indexOf(before) < kinds.indexOf(after), `${before} -> ${after}`);
  }
});

test("QFS3-CAUSAL-006 variant aggregate before final validator fails", () => {
  const input = completeInput();
  const validator = input.receipts.find((entry) => entry.kind === "DECLARED_VALIDATOR_COMPLETED");
  const aggregate = input.receipts.find((entry) => entry.kind === "VARIANT_VALIDATION_AGGREGATED");
  aggregate.predecessorInputReceiptIds = aggregate.predecessorInputReceiptIds.filter(
    (id) => id !== validator.inputReceiptId,
  );
  aggregate.predecessorOutputDigests = aggregate.predecessorOutputDigests.filter(
    (digestValue) => digestValue !== validator.outputDigest,
  );
  expectFailure(input, /VARIANT_AGGREGATE_DEPENDENCIES_INVALID/u);
});

test("QFS3-CAUSAL-007 aggregate before judge or critic fails", () => {
  for (const kind of ["JUDGE_COMPLETED", "ADVERSARIAL_CRITIC_COMPLETED"]) {
    const input = completeInput();
    const missing = input.receipts.find((entry) => entry.kind === kind);
    input.receipts = input.receipts.filter((entry) => entry !== missing);
    expectFailure(input, /RECEIPT_PREDECESSOR_UNKNOWN/u);
  }
});

test("QFS3-COMPLETENESS-008 a missing declared validator is never complete", () => {
  const input = completeInput();
  const disallowedKinds = new Set([
    "DECLARED_VALIDATOR_COMPLETED",
    "JUDGE_COMPLETED",
    "ADVERSARIAL_CRITIC_COMPLETED",
    "VARIANT_VALIDATION_AGGREGATED",
    "TRANSFER_EVIDENCE_AGGREGATED",
    "META_AUDIT_COMPLETED",
  ]);
  input.receipts = input.receipts.filter((entry) => !disallowedKinds.has(entry.kind));
  const chronology = core.createDependencyRankedTransferChronologyV1(input);
  assert.equal(chronology.completeness, "INCOMPLETE");
  assert.ok(chronology.blockingReasons.includes("MISSING_DECLARED_VALIDATOR"));
});

test("QFS3-COMPLETENESS-009 sealed variant without independent validation cannot complete", () => {
  const input = completeInput();
  input.receipts = input.receipts.filter((entry) =>
    ["CANDIDATE_PRELUDE_BOUND", "SIMILARITY_REVIEW_BOUND", "TRANSFER_VARIANT_SEALED"].includes(entry.kind),
  );
  const chronology = core.createDependencyRankedTransferChronologyV1(input);
  assert.equal(chronology.completeness, "INCOMPLETE");
  assert.ok(chronology.blockingReasons.includes("MISSING_BLIND_SOLVER"));
});

test("QFS3-IDENTITY-010 solver and judge execution reuse fails", () => {
  const input = completeInput();
  const solver = input.receipts.find((entry) => entry.kind === "BLIND_SOLVER_COMPLETED");
  const judge = input.receipts.find((entry) => entry.kind === "JUDGE_COMPLETED");
  judge.actor.modelExecution = clone(solver.actor.modelExecution);
  judge.actor.modelExecution.role = "JUDGE";
  expectFailure(input, /IDENTITY_DIGEST_MISMATCH|MODEL_EXECUTION_OR_ARTIFACT_IDENTITY_REUSED/u);
});

test("QFS3-IDENTITY-011 judge and critic artifact reuse fails", () => {
  const input = completeInput();
  const judge = input.receipts.find((entry) => entry.kind === "JUDGE_COMPLETED");
  const critic = input.receipts.find((entry) => entry.kind === "ADVERSARIAL_CRITIC_COMPLETED");
  critic.actor.modelExecution = qf0a2.createModelExecutionIdentityV1({
    ...modelMaterial("ADVERSARIAL_CRITIC", "a", critic.occurredAt),
    executionArtifactDigest: judge.actor.modelExecution.executionArtifactDigest,
  });
  expectFailure(input, /MODEL_EXECUTION_OR_ARTIFACT_IDENTITY_REUSED/u);
});

test("QFS3-IDENTITY-012 version relabel without immutable identity change fails", () => {
  const input = completeInput();
  const judge = input.receipts.find((entry) => entry.kind === "JUDGE_COMPLETED");
  judge.actor.modelExecution = clone(judge.actor.modelExecution);
  judge.actor.modelExecution.modelVersion = "relabelled-v2";
  expectFailure(input, /IDENTITY_DIGEST_MISMATCH/u);
});

test("QFS3-IDENTITY-012A declared validators require a trusted system actor", () => {
  const roles = ["BLIND_SOLVER", "JUDGE", "ADVERSARIAL_CRITIC", "META_AUDITOR"];
  const tokens = ["a", "c", "d", "e"];
  for (let index = 0; index < roles.length; index += 1) {
    const input = completeInput();
    const validator = input.receipts.find(
      (entry) => entry.kind === "DECLARED_VALIDATOR_COMPLETED",
    );
    validator.actor = modelActor(roles[index], tokens[index], validator.occurredAt);
    expectFailure(input, /DECLARED_VALIDATOR_COMPLETED_SYSTEM_ACTOR_REQUIRED/u);
  }
});

test("QFS3-INTEGRITY-013 predecessor output digest drift fails", () => {
  const input = completeInput();
  const judge = input.receipts.find((entry) => entry.kind === "JUDGE_COMPLETED");
  judge.predecessorOutputDigests[0] = digest("f");
  expectFailure(input, /PREDECESSOR_OUTPUT_DIGEST_DRIFT/u);
});

test("QFS3-INTEGRITY-013A every artifact ID is content-addressed to its digest", () => {
  const input = completeInput();
  const judge = input.receipts.find((entry) => entry.kind === "JUDGE_COMPLETED");
  judge.artifactId = artifactId(digest("f"));
  expectFailure(input, /JUDGE_COMPLETED_ARTIFACT_ID_DIGEST_DRIFT/u);
});

test("QFS3-INTEGRITY-014 candidate, QF-S1, and QF-S2 drift fail", () => {
  const input = completeInput();
  const chronology = core.createDependencyRankedTransferChronologyV1(input);
  for (const field of ["candidateDigest", "qfS1ReviewDigest", "qfS2PreludeDigest"]) {
    const altered = clone(chronology);
    altered[field] = digest("f");
    assert.throws(
      () => core.assertDependencyRankedTransferChronologyV1(altered, input),
      /CHRONOLOGY_AUTHORITY_RECOMPUTE_MISMATCH/u,
    );
  }
});

test("QFS3-CAUSAL-015 dependency cycle fails", () => {
  const input = completeInput();
  const prelude = input.receipts.find((entry) => entry.kind === "CANDIDATE_PRELUDE_BOUND");
  const seal = input.receipts.find((entry) => entry.kind === "TRANSFER_VARIANT_SEALED");
  prelude.predecessorInputReceiptIds = [seal.inputReceiptId];
  prelude.predecessorOutputDigests = [seal.outputDigest];
  expectFailure(input, /RECEIPT_DEPENDENCY_CYCLE/u);
});

test("QFS3-INTEGRITY-016 duplicate receipt IDs and digests fail", () => {
  const input = completeInput();
  input.receipts.push(clone(input.receipts[0]));
  expectFailure(input, /INPUT_RECEIPT_ID_DUPLICATE/u);
  const chronology = core.createDependencyRankedTransferChronologyV1(completeInput());
  const duplicate = clone(chronology);
  duplicate.receipts[1].receiptId = duplicate.receipts[0].receiptId;
  assert.throws(
    () => core.assertDependencyRankedTransferChronologyV1(duplicate, completeInput()),
    /CHRONOLOGY_AUTHORITY_RECOMPUTE_MISMATCH/u,
  );
});

test("QFS3-TIME-017 child timestamp before predecessor fails", () => {
  const input = completeInput();
  const judge = input.receipts.find((entry) => entry.kind === "JUDGE_COMPLETED");
  judge.occurredAt = "2026-06-01T13:00:00.000Z";
  judge.actor = modelActor("JUDGE", "5", judge.occurredAt);
  expectFailure(input, /CHILD_TIMESTAMP_BEFORE_PREDECESSOR/u);
});

test("QFS3-TIME-018 exact timestamp equality is valid and deterministic", () => {
  const input = completeInput(1, true);
  const first = core.createDependencyRankedTransferChronologyV1(input);
  assert.equal(first.startedAt, "2026-06-01T12:00:00.000Z");
  assert.equal(first.completedAt, "2026-06-01T12:00:00.000Z");
  assert.deepEqual(core.createDependencyRankedTransferChronologyV1(clone(input)), first);
});

test("QFS3-TIME-018A root bindings cannot predate the candidate", () => {
  for (const kind of ["CANDIDATE_PRELUDE_BOUND", "SIMILARITY_REVIEW_BOUND"]) {
    const input = completeInput();
    input.receipts.find((entry) => entry.kind === kind).occurredAt =
      "2026-06-01T09:59:59.999Z";
    expectFailure(input, new RegExp(`${kind}_BEFORE_CANDIDATE`, "u"));
  }
});

test("QFS3-LOCALE-019 process locale does not alter chronology", () => {
  const input = completeInput();
  const script = `
    import { createDependencyRankedTransferChronologyV1 } from "./lib/question-foundry/chronology/chronology-core.ts";
    process.stdout.write(JSON.stringify(createDependencyRankedTransferChronologyV1(JSON.parse(process.env.QFS3_INPUT))));
  `;
  const outputs = ["C", "ko_KR.UTF-8"].map((locale) =>
    spawnSync(
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
        env: { ...process.env, LANG: locale, LC_ALL: locale, QFS3_INPUT: JSON.stringify(input) },
      },
    ),
  );
  for (const output of outputs) assert.equal(output.status, 0, output.stderr);
  assert.deepEqual(JSON.parse(outputs[0].stdout), JSON.parse(outputs[1].stdout));
});

test("QFS3-BOUNDARY-020 raw bodies, prompts, responses, release and assignment are rejected", () => {
  const chronology = core.createDependencyRankedTransferChronologyV1(completeInput());
  const serialized = JSON.stringify(chronology);
  for (const forbidden of [
    "bodyText",
    "questionBody",
    "answerBody",
    "prompt",
    "response",
    "releaseStatus",
    "learnerAssignment",
    "bankAssignment",
    "PERSONAL_LEARNING_USABLE",
    "TRANSFER_VERIFIED",
    "RELEASED",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
    const altered = clone(chronology);
    altered[forbidden] = "forbidden";
    assert.throws(
      () => core.assertDependencyRankedTransferChronologyV1(altered, completeInput()),
      /FIELD_SET_INVALID/u,
    );
  }
  assert.equal(contracts.QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT.releaseAuthorityAbsent, true);
  assert.deepEqual(contracts.QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT.publicLifecycleStates, []);
});

test("QFS3-SAFETY-021 has no provider, network, database, persistence, or remote path", () => {
  const source = `${read("lib/question-foundry/chronology/chronology-contracts.ts")}\n${read("lib/question-foundry/chronology/chronology-core.ts")}`;
  assert.doesNotMatch(source, /fetch\s*\(|node:https|node:http|@supabase|stripe|process\.env|node:fs/u);
  assert.doesNotMatch(source, /Date\.now|localeCompare|Intl\.Collator/u);
  const boundary = contracts.QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT;
  assert.equal(boundary.network, "OFF");
  assert.equal(boundary.providerExecution, "OFF");
  assert.equal(boundary.databaseAndPersistence, "OFF");
  assert.equal(boundary.remoteMutation, "ZERO");
  assert.equal(boundary.productionMutation, "ZERO");
});

test("QFS3-HOSTILE-022 proxies and extra fields fail without materialization", () => {
  const input = completeInput();
  let traps = 0;
  const proxy = new Proxy(input, {
    get() {
      traps += 1;
      throw new Error("trap");
    },
    getPrototypeOf() {
      traps += 1;
      throw new Error("trap");
    },
  });
  assert.throws(
    () => core.createDependencyRankedTransferChronologyV1(proxy),
    /INPUT_PLAIN_RECORD_REQUIRED/u,
  );
  assert.equal(traps, 0);
  input.rawQuestionBody = "forbidden";
  expectFailure(input, /INPUT_FIELD_SET_INVALID/u);
});

test("QFS3-INHERITED-023 source-only QF suites remain discoverable", () => {
  for (const path of [
    "tests/qf0a1-bounded-canonical-json.test.mjs",
    "tests/qf0a2-rights-time-model-identity.test.mjs",
    "tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs",
    "tests/question-foundry-quarantine-core.test.mjs",
    "tests/qf-s1a-mandatory-corpus-preparation.test.mjs",
    "tests/qf-s1-bounded-similarity-rights-firewall.test.mjs",
    "tests/qf-s2-candidate-audit-prelude.test.mjs",
  ]) {
    assert.doesNotThrow(() => read(path), path);
  }
});

test("QFS3-CONFIG-024 config binds exact closed states and limits", () => {
  const config = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(config.receiptKindsExactly, [...contracts.QFS3_RECEIPT_KINDS]);
  assert.deepEqual(config.actorPolicy, {
    declaredValidator: "TRUSTED_SYSTEM_COMPONENT_ONLY",
    blindSolver: "BLIND_SOLVER",
    judge: "JUDGE",
    adversarialCritic: "ADVERSARIAL_CRITIC",
    metaAuditor: "META_AUDITOR",
  });
  assert.deepEqual(config.completenessStatesExactly, ["COMPLETE", "INCOMPLETE"]);
  assert.deepEqual(config.limits, contracts.QFS3_LIMITS);
  assert.equal(config.sourceOnlyBoundary.receiptDigest, qf0a1.digestCanonicalJsonV1(clone(contracts.QFS3_SOURCE_ONLY_BOUNDARY_RECEIPT)));
});

test("QFS3-CAPACITY-025 advertised 8 by 4 maximum is constructible within QF-0A1", () => {
  const input = maximumCapacityInput();
  const chronology = core.createDependencyRankedTransferChronologyV1(input);
  assert.equal(input.variants.length, 8);
  assert.equal(
    input.variants.every(
      (variant) => variant.declaredValidatorProfileRefs.length === 4,
    ),
    true,
  );
  assert.equal(input.receipts.length, 76);
  assert.equal(chronology.receipts.length, 76);
  assert.equal(chronology.actors.length, 76);
  assert.equal(
    Math.max(
      ...chronology.receipts.map(
        (receiptEntry) => receiptEntry.predecessorReceiptIds.length,
      ),
    ),
    9,
  );
  assert.equal(chronology.completeness, "COMPLETE");
  assert.deepEqual(
    core.assertDependencyRankedTransferChronologyV1(chronology, input),
    chronology,
  );

  const canonicalSnapshot = clone(chronology);
  const canonical = qf0a1.canonicalizeBoundedJsonV1(canonicalSnapshot);
  const canonicalBytes = Buffer.byteLength(canonical, "utf8");
  assert.equal(canonicalBytes, 154_625);
  assert.ok(canonicalBytes <= qf0a1.QF0A1_LIMITS.maxCanonicalOutputBytes);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(canonicalSnapshot),
    "sha256:" + sha256(canonical),
  );
  assert.deepEqual(qf0a1.QF0A1_LIMITS, {
    contractVersion: "QF0A1BoundedCanonicalJsonV1",
    maxCanonicalOutputBytes: 262_144,
    maxInspectedUtf16CodeUnits: 262_144,
    maxEntries: 10_000,
    maxDepth: 32,
    maxComparisonSteps: 524_288,
    surrogateLookaheadOutsideInspectionLimit: 0,
  });

  const reordered = clone(input);
  reordered.variants.reverse();
  reordered.variants.forEach((variant) =>
    variant.declaredValidatorProfileRefs.reverse(),
  );
  reordered.receipts.reverse();
  assert.deepEqual(
    core.createDependencyRankedTransferChronologyV1(reordered),
    chronology,
  );
});

test("QFS3-CAPACITY-026 over-limit arrays fail before graph materialization", () => {
  let trapReads = 0;
  const hostile = new Proxy({}, {
    get() {
      trapReads += 1;
      throw new Error("hostile trap executed");
    },
  });

  const ninthVariant = maximumCapacityInput();
  ninthVariant.variants = [...ninthVariant.variants, hostile];
  expectFailure(ninthVariant, /VARIANTS_DENSE_BOUNDED_ARRAY_REQUIRED/u);
  assert.equal(trapReads, 0);

  const fifthValidator = maximumCapacityInput();
  fifthValidator.variants[0].declaredValidatorProfileRefs = [
    ...fifthValidator.variants[0].declaredValidatorProfileRefs,
    hostile,
  ];
  expectFailure(
    fifthValidator,
    /VARIANT_0_VALIDATOR_REFS_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  assert.equal(trapReads, 0);

  const seventySeventhReceipt = maximumCapacityInput();
  seventySeventhReceipt.receipts = [
    ...seventySeventhReceipt.receipts,
    hostile,
  ];
  expectFailure(
    seventySeventhReceipt,
    /RECEIPTS_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  assert.equal(trapReads, 0);
});

test("QFS3-CAPACITY-027 actor overflow and orphan actors fail closed", () => {
  const input = maximumCapacityInput();
  const chronology = core.createDependencyRankedTransferChronologyV1(input);
  let trapReads = 0;
  const hostile = new Proxy({}, {
    get() {
      trapReads += 1;
      throw new Error("hostile trap executed");
    },
  });
  const overflow = clone(chronology);
  overflow.actors.push(hostile);
  assert.throws(
    () => core.assertDependencyRankedTransferChronologyV1(overflow, input),
    /OUTPUT_ACTORS_DENSE_BOUNDED_ARRAY_REQUIRED/u,
  );
  assert.equal(trapReads, 0);

  const ordinaryInput = completeInput();
  const orphan = clone(
    core.createDependencyRankedTransferChronologyV1(ordinaryInput),
  );
  orphan.actors.push({
    actorKind: "SYSTEM_COMPONENT",
    actorRefId: "qfca_" + sha256("orphan-actor"),
    componentId: "qfsc_" + sha256("orphan-component").slice(0, 32),
    componentVersion: "v1",
    componentArtifactDigest: digestText("orphan-component"),
  });
  assert.throws(
    () => core.assertDependencyRankedTransferChronologyV1(orphan, ordinaryInput),
    /OUTPUT_ACTOR_ORPHAN/u,
  );
});

test("QFS3-CAPACITY-028 every receipt actor must resolve exactly", () => {
  const input = completeInput();
  const chronology = clone(
    core.createDependencyRankedTransferChronologyV1(input),
  );
  chronology.receipts[0].actorRefId = "qfca_" + sha256("unknown-actor");
  assert.throws(
    () => core.assertDependencyRankedTransferChronologyV1(chronology, input),
    /OUTPUT_RECEIPT_ACTOR_UNKNOWN/u,
  );
});
