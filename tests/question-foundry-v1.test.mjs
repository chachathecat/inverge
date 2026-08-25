import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ANSWER_SPECIFICATION_VERSION,
  QUESTION_BLUEPRINT_VERSION,
  QUESTION_FOUNDRY_CONTRACT_VERSION,
  QUESTION_FOUNDRY_MINIMUM_OWNER_RESPONSES_FOR_MEASUREMENT,
  buildSimilarityFirewallReview,
  canonicalDigest,
  createAuditRun,
  createQuestionBankArtifact,
  disputeQuestionBankArtifact,
  evaluateQuestionRelease,
  generateCandidateBatch,
  isQuestionBankArtifactAssignable,
  retireQuestionBankArtifact,
  reviseQuestionBankArtifact,
  selectBankFirstOrGenerateOnGap,
  validateAnswerSpecification,
  validateAuditRun,
  validateCandidateBatch,
  validateCandidateCalculation,
  validateCalculationSpecification,
  validateQuestionBlueprint,
  validateTrustedSourceBindings,
} from "../lib/question-foundry/index.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const T0 = "2026-08-25T00:00:00.000Z";
const T1 = "2026-08-25T00:01:00.000Z";
const T2 = "2026-08-25T00:02:00.000Z";
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);

function clone(value) {
  return structuredClone(value);
}

function rightsManifest(overrides = {}) {
  return {
    manifestId: "rights:question-foundry:1",
    manifestVersionId: "rights:question-foundry:1@1",
    sourceClass: "CLEARED_DETERMINISTIC_TEMPLATE",
    rightsHolder: "Inverge",
    permittedPurposes: [
      "QUESTION_BLUEPRINT_EXTRACTION",
      "QUESTION_GENERATION_CONTEXT",
      "PERSONAL_LEARNING_BANK",
      "TRANSFER_BANK",
      "MEASUREMENT_BANK",
    ],
    territory: ["KR"],
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2027-01-01T00:00:00.000Z",
    status: "ACTIVE",
    provenance: ["inverge-original-template-registry"],
    ...overrides,
  };
}

function sourceBinding(overrides = {}) {
  return {
    sourceId: "source:deterministic:division",
    sourceVersionId: "source:deterministic:division@1",
    sourceClass: "CLEARED_DETERMINISTIC_TEMPLATE",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveUntil: "2027-01-01T00:00:00.000Z",
    status: "CURRENT",
    rightsManifestId: "rights:question-foundry:1",
    rightsManifestVersionId: "rights:question-foundry:1@1",
    contentDigest: DIGEST_A,
    ...overrides,
  };
}

function similarityReferenceBody() {
  return "A cleared reference discusses unrelated property classification and legal conditions.";
}

function similaritySourceBinding(overrides = {}) {
  const body = similarityReferenceBody();
  return sourceBinding({
    sourceId: "source:deterministic:similarity",
    sourceVersionId: "source:deterministic:similarity@1",
    contentDigest: canonicalDigest(body),
    ...overrides,
  });
}

function sourceRegistry(overrides = {}) {
  return {
    registryVersion: "question_foundry.trusted_source_registry.v1",
    asOf: "2026-08-25T00:00:00.000Z",
    territory: "KR",
    rightsManifests: [rightsManifest()],
    sourceVersions: [sourceBinding(), similaritySourceBinding()],
    ...overrides,
  };
}

function blueprint(overrides = {}) {
  return {
    schemaVersion: QUESTION_BLUEPRINT_VERSION,
    blueprintId: "blueprint:accounting:division",
    blueprintVersionId: "blueprint:accounting:division@1",
    subject: "ACCOUNTING",
    skillId: "accounting:deterministic-division",
    difficultyBand: "FOUNDATION",
    itemFamily: "deterministic-calculation",
    learningObjective: "Apply one deterministic division relation correctly.",
    requiredConceptIds: ["concept:division"],
    prohibitedCluePatterns: ["obviously"],
    sourceBindings: [sourceBinding()],
    calculation: {
      operation: "DIVIDE",
      operands: [40, 2],
      result: 20,
      unit: "POINTS",
      rounding: { mode: "HALF_UP", scale: 0 },
      tolerance: 0,
    },
    rightsBoundary: {
      protectedExpressionIncluded: false,
      privateUploadUsed: false,
      academyOrTextbookUsed: false,
      rawSourceBodyStored: false,
      sharedBlueprintAllowed: true,
      modelTrainingAllowed: false,
    },
    createdAt: T0,
    ...overrides,
  };
}

function answerSpecification(blueprintValue = blueprint(), overrides = {}) {
  return {
    schemaVersion: ANSWER_SPECIFICATION_VERSION,
    answerSpecificationId: "answer-spec:accounting:division@1",
    blueprintId: blueprintValue.blueprintId,
    blueprintVersionId: blueprintValue.blueprintVersionId,
    solutionFirst: true,
    expectedAnswer: "20 points",
    requiredReasonCodes: ["ordered-division"],
    forbiddenAnswerPatterns: ["official model answer"],
    calculation: clone(blueprintValue.calculation),
    sourceBindings: clone(blueprintValue.sourceBindings),
    createdAt: T1,
    ...overrides,
  };
}

function candidateGenerator({ candidateIndex }) {
  const prefix = `c${candidateIndex + 1}`;
  const correctPosition = candidateIndex === 0 ? 0 : 2;
  const bodies = ["18 points", "19 points", "21 points", "22 points"];
  bodies.splice(correctPosition, 0, "20 points");
  const options = bodies.map((body, index) => ({ optionId: `${prefix}-o${index + 1}`, body }));
  return {
    stem:
      candidateIndex === 0
        ? "Divide the cleared template quantity by the stated factor."
        : "Compute the quotient using the supplied deterministic relation.",
    options,
    proposedCorrectOptionId: options[correctPosition].optionId,
    explanation: "The ordered relation is forty divided by two, producing twenty.",
  };
}

function batch() {
  const blueprintValue = blueprint();
  return generateCandidateBatch({
    batchId: "batch:question-foundry:1",
    blueprint: blueprintValue,
    answerSpecification: answerSpecification(blueprintValue),
    candidateCount: 2,
    generatorId: "generator-1",
    generatorVersion: "generator-1@1",
    generationRunId: "generation-run-1",
    generatedAt: T2,
    generator: candidateGenerator,
  });
}

function similarityReference(overrides = {}) {
  const body = overrides.body ?? similarityReferenceBody();
  return {
    referenceId: "reference:cleared:unrelated",
    sourceId: "source:deterministic:similarity",
    sourceVersionId: "source:deterministic:similarity@1",
    sourceClass: "CLEARED_DETERMINISTIC_TEMPLATE",
    rightsManifestId: "rights:question-foundry:1",
    rightsManifestVersionId: "rights:question-foundry:1@1",
    contentDigest: canonicalDigest(body),
    body,
    ...overrides,
  };
}

function personalBundle() {
  const candidateBatch = batch();
  const selected = candidateBatch.candidates[0];
  const references = [similarityReference()];
  const permutations = candidateBatch.optionOrderPermutations.filter(
    (entry) => entry.candidateId === selected.candidateId,
  );
  const solverReview = (index) => ({
    reviewId: `solver-review-${index + 1}`,
    solverId: `blind-solver-${index + 1}`,
    solverVersion: `blind-solver-${index + 1}@1`,
    candidateId: selected.candidateId,
    optionPermutationId: permutations[index].permutationId,
    blind: true,
    candidateAnswerExposed: false,
    candidateExplanationExposed: false,
    selectedOptionId: selected.proposedCorrectOptionId,
    reasoningDigest: index === 0 ? DIGEST_A : DIGEST_B,
    ambiguityDetected: false,
    plausibleCorrectOptionIds: [selected.proposedCorrectOptionId],
    completedAt: "2026-08-25T00:03:00.000Z",
  });
  return {
    batch: candidateBatch,
    selectedCandidateId: selected.candidateId,
    trustedSources: sourceRegistry(),
    blindSolverReviews: [solverReview(0), solverReview(1)],
    judgeReviews: [
      {
        reviewId: "judge-review-1",
        judgeId: "judge-1",
        judgeVersion: "judge-1@1",
        candidateId: selected.candidateId,
        anonymizedCandidate: true,
        approved: true,
        singleCorrectAnswer: true,
        ambiguityDetected: false,
        sourceVersionValid: true,
        deterministicCalculationValid: true,
        distractorsPlausibleAndIncorrect: true,
        answerClueDetected: false,
        nearCopyDetected: false,
        reconstructionRiskDetected: false,
        unresolvedReasonCodes: [],
        completedAt: "2026-08-25T00:04:00.000Z",
      },
    ],
    similarityReferences: references,
    similarityReview: buildSimilarityFirewallReview(
      selected,
      references,
      sourceRegistry(),
    ),
    metaAudits: {
      selfPreference: {
        auditKind: "SELF_PREFERENCE",
        anonymized: true,
        candidateIds: candidateBatch.candidates.map((candidate) => candidate.candidateId),
        evaluatorIds: ["meta-judge-1"],
        generatorEvaluatorOverlap: [],
        selectedCandidateId: selected.candidateId,
        pass: true,
      },
      orderBias: {
        auditKind: "ORDER_BIAS",
        permutationIds: candidateBatch.candidateOrderPermutations.map((entry) => entry.permutationId),
        selectedCandidateIds: candidateBatch.candidateOrderPermutations.map(() => selected.candidateId),
        stableAcrossOrders: true,
        pass: true,
      },
      repeatedStability: {
        auditKind: "REPEATED_STABILITY",
        runIds: ["stability-run-1", "stability-run-2", "stability-run-3"],
        selectedCandidateIds: [selected.candidateId, selected.candidateId, selected.candidateId],
        selectedOptionIds: [
          selected.proposedCorrectOptionId,
          selected.proposedCorrectOptionId,
          selected.proposedCorrectOptionId,
        ],
        releaseDecisions: [
          "PERSONAL_LEARNING_USABLE",
          "PERSONAL_LEARNING_USABLE",
          "PERSONAL_LEARNING_USABLE",
        ],
        pass: true,
      },
      judgeDrift: {
        auditKind: "JUDGE_DRIFT",
        baselineJudgeVersion: "judge-1@baseline",
        currentJudgeVersion: "judge-1@1",
        comparisonFixtureDigest: DIGEST_A,
        disagreementRate: 0.05,
        maximumAllowedDisagreementRate: 0.1,
        pass: true,
      },
    },
    ownerAdjudication: null,
    transferEvidence: null,
    ownerResponseEvidence: null,
    trustedOwnerResponseRegistry: null,
  };
}

function transferBundle() {
  const bundleValue = personalBundle();
  return {
    ...bundleValue,
    ownerAdjudication: {
      adjudicationId: "owner-adjudication-1",
      adjudicatorRole: "OWNER",
      candidateId: bundleValue.selectedCandidateId,
      decision: "APPROVED",
      sourceAndRightsReviewed: true,
      ambiguityReviewed: true,
      calculationReviewed: true,
      decidedAt: "2026-08-25T00:05:00.000Z",
    },
    transferEvidence: {
      bundleId: "transfer-bundle-1",
      candidateId: bundleValue.selectedCandidateId,
      sealedBeforeEvaluation: true,
      independentEvaluatorIds: ["transfer-evaluator-1", "transfer-evaluator-2"],
      transferVariantIds: ["transfer-variant-1", "transfer-variant-2"],
      allOutcomesCorrect: true,
      answerExposureBeforeEvaluation: false,
      completedAt: "2026-08-25T00:06:00.000Z",
    },
  };
}

function measurementBundle() {
  const bundleValue = transferBundle();
  const receipt = {
    receiptId: "owner-runtime-receipt-1",
    candidateId: bundleValue.selectedCandidateId,
    ownerId: "owner-1",
    actualOwnerResponses: true,
    responseIds: Array.from(
      { length: QUESTION_FOUNDRY_MINIMUM_OWNER_RESPONSES_FOR_MEASUREMENT },
      (_, index) => `owner-response-${index + 1}`,
    ),
    responseCount: QUESTION_FOUNDRY_MINIMUM_OWNER_RESPONSES_FOR_MEASUREMENT,
    distinctSessionCount: 3,
    firstResponseAt: "2026-08-26T00:00:00.000Z",
    lastResponseAt: "2026-08-30T00:00:00.000Z",
    responseBodiesStored: false,
    source: "OWNER_RUNTIME_RECEIPT",
  };
  const registryWithoutDigest = {
    registryVersion: "question_foundry.trusted_owner_response_registry.v1",
    source: "LOCAL_OWNER_RUNTIME_EXPORT",
    exportId: "owner-export-1",
    exportVersionId: "owner-export-1@1",
    verifiedAt: "2026-08-30T00:01:00.000Z",
    remoteReadPerformed: false,
    receiptsDigest: canonicalDigest([receipt]),
    receipts: [receipt],
  };
  return {
    ...bundleValue,
    ownerResponseEvidence: receipt,
    trustedOwnerResponseRegistry: {
      ...registryWithoutDigest,
      exportContentDigest: canonicalDigest(registryWithoutDigest),
    },
  };
}

function measurementTrustContext(bundleValue) {
  const registry = bundleValue.trustedOwnerResponseRegistry;
  return {
    ownerResponseExportBinding: {
      bindingVersion: "question_foundry.trusted_owner_response_export_binding.v1",
      exportId: registry.exportId,
      exportVersionId: registry.exportVersionId,
      exportContentDigest: registry.exportContentDigest,
      registryDigest: canonicalDigest(registry),
      validatorId: "trusted_owner_runtime_export_validator",
      actualOwnerRuntimeRead: true,
      syntheticOrSimulated: false,
      verified: true,
    },
  };
}

test("machine contract freezes source-only boundaries and exact lane ownership", async () => {
  const contract = JSON.parse(
    await readFile(path.join(repositoryRoot, "config/dabangil-question-foundry-v1.json"), "utf8"),
  );
  assert.equal(contract.schemaVersion, QUESTION_FOUNDRY_CONTRACT_VERSION);
  assert.equal(contract.status, "source_implemented_offline_default_off");
  assert.equal(contract.parallelExecutionBinding.laneId, "LANE_C_QUESTION_FOUNDRY");
  assert.equal(contract.parallelExecutionBinding.mergeAuthorizedNow, false);
  assert.deepEqual(contract.ownedPathsExactly, [
    "config/dabangil-question-foundry-v1.json",
    "lib/question-foundry/audit-run.ts",
    "lib/question-foundry/contracts.ts",
    "lib/question-foundry/generation.ts",
    "lib/question-foundry/index.ts",
    "lib/question-foundry/release-policy.ts",
    "lib/question-foundry/validation.ts",
    "scripts/offline/question-foundry-v1.mjs",
    "tests/question-foundry-v1.test.mjs",
  ]);
  for (const field of [
    "runtimeAuthorized",
    "learnerActivationAuthorized",
    "externalLearnerActivationAuthorized",
    "publicActivationAuthorized",
    "paymentActivationAuthorized",
    "providerCallAuthorized",
    "networkCallAuthorized",
    "remoteSupabaseMutationAuthorized",
    "productionMutationAuthorized",
    "migrationAuthorized",
    "authOrRlsMutationAuthorized",
    "dependencyMutationAuthorized",
    "modelTrainingAuthorized",
    "qualityClaimAuthorized",
    "calibrationClaimAuthorized",
    "learningEfficacyClaimAuthorized",
  ]) assert.equal(contract.activationBoundary[field], false, field);
});

test("QuestionBlueprintV1 and AnswerSpecificationV1 are closed, source-bound and solution-first", () => {
  const blueprintValue = blueprint();
  const specification = answerSpecification(blueprintValue);
  assert.equal(validateQuestionBlueprint(blueprintValue).valid, true);
  assert.equal(validateAnswerSpecification(specification, blueprintValue).valid, true);

  const openBlueprint = { ...blueprintValue, privatePrompt: "not allowed" };
  assert.equal(validateQuestionBlueprint(openBlueprint).valid, false);
  const privateBlueprint = clone(blueprintValue);
  privateBlueprint.sourceBindings[0].sourceClass = "USER_PRIVATE_ONLY";
  privateBlueprint.rightsBoundary.privateUploadUsed = true;
  const privateResult = validateQuestionBlueprint(privateBlueprint);
  assert.equal(privateResult.valid, false);
  assert.ok(privateResult.errors.some((error) => error.includes("SHARED_USE_DENIED")));

  const lateSolution = { ...specification, createdAt: "2026-08-24T23:59:00.000Z" };
  assert.equal(validateAnswerSpecification(lateSolution, blueprintValue).valid, false);
  assert.equal(validateAnswerSpecification({ ...specification, solutionFirst: false }, blueprintValue).valid, false);
  assert.equal(validateQuestionBlueprint(null).valid, false);
  assert.doesNotThrow(() => validateAnswerSpecification(null, null));
});

test("offline solution-first generation creates multiple quarantined candidates and two order permutations", () => {
  const candidateBatch = batch();
  const result = validateCandidateBatch(candidateBatch);
  assert.equal(result.valid, true, result.errors.join(","));
  assert.equal(candidateBatch.candidates.length, 2);
  assert.equal(candidateBatch.candidateOrderPermutations.length, 2);
  for (const candidate of candidateBatch.candidates) {
    assert.equal(candidate.initialState, "QUARANTINED");
    assert.ok(Date.parse(candidate.solutionCommittedAt) <= Date.parse(candidate.generatedAt));
    assert.equal(
      candidateBatch.optionOrderPermutations.filter((entry) => entry.candidateId === candidate.candidateId).length,
      2,
    );
  }
  assert.equal(candidateBatch.offline, true);
  assert.equal(candidateBatch.providerCalls, 0);
  assert.equal(Object.isFrozen(candidateBatch), true);
  assert.throws(
    () =>
      generateCandidateBatch({
        batchId: "bad-batch",
        blueprint: blueprint(),
        answerSpecification: answerSpecification(blueprint()),
        candidateCount: 1,
        generatorId: "generator-1",
        generatorVersion: "generator-1@1",
        generationRunId: "generation-run-bad",
        generatedAt: T2,
        generator: candidateGenerator,
      }),
    /candidate-count/,
  );
});

test("trusted current source and deterministic calculation validators fail closed", () => {
  const candidateBatch = batch();
  const selected = candidateBatch.candidates[0];
  assert.equal(
    validateTrustedSourceBindings(candidateBatch.blueprint.sourceBindings, sourceRegistry()).valid,
    true,
  );
  assert.equal(
    validateCandidateCalculation(selected, candidateBatch.answerSpecification).valid,
    true,
  );

  const expired = sourceRegistry({ asOf: "2028-01-01T00:00:00.000Z" });
  assert.equal(
    validateTrustedSourceBindings(candidateBatch.blueprint.sourceBindings, expired).valid,
    false,
  );
  const duplicateRegistry = sourceRegistry({
    sourceVersions: [sourceBinding(), sourceBinding()],
  });
  assert.equal(
    validateTrustedSourceBindings(candidateBatch.blueprint.sourceBindings, duplicateRegistry).valid,
    false,
  );
  const badCandidate = clone(selected);
  badCandidate.options[1].body = "20 points duplicate";
  assert.equal(
    validateCandidateCalculation(badCandidate, candidateBatch.answerSpecification).valid,
    false,
  );

  const negativeHalfTie = {
    operation: "DIVIDE",
    operands: [-3, 2],
    result: -2,
    unit: "POINTS",
    rounding: { mode: "HALF_UP", scale: 0 },
    tolerance: 0,
  };
  assert.equal(validateCalculationSpecification(negativeHalfTie).valid, true);
  assert.equal(
    validateCalculationSpecification({ ...negativeHalfTie, result: -1 }).valid,
    false,
  );
});

test("rights-safe similarity firewall detects near-copy, reconstruction and denied comparison corpora", () => {
  const candidateBatch = batch();
  const selected = candidateBatch.candidates[0];
  const safe = buildSimilarityFirewallReview(selected, [similarityReference()], sourceRegistry());
  assert.equal(safe.nearCopyDetected, false);
  assert.equal(safe.reconstructionRiskDetected, false);

  const copiedBody = `${selected.stem}\n${selected.options.map((option) => option.body).join("\n")}`;
  const copied = buildSimilarityFirewallReview(
    selected,
    [similarityReference({ body: copiedBody })],
    sourceRegistry({
      sourceVersions: [
        sourceBinding(),
        similaritySourceBinding({ contentDigest: canonicalDigest(copiedBody) }),
      ],
    }),
  );
  assert.equal(copied.nearCopyDetected, true);
  const privateCorpus = buildSimilarityFirewallReview(
    selected,
    [similarityReference({ sourceClass: "ACADEMY_OR_COMMERCIAL_TEXTBOOK" })],
    sourceRegistry(),
  );
  assert.equal(privateCorpus.reconstructionRiskDetected, true);

  for (const registry of [
    sourceRegistry({ rightsManifests: [rightsManifest({ territory: ["US"] })] }),
    sourceRegistry({
      rightsManifests: [
        rightsManifest({
          permittedPurposes: ["QUESTION_BLUEPRINT_EXTRACTION", "PERSONAL_LEARNING_BANK"],
        }),
      ],
    }),
    sourceRegistry({ rightsManifests: [rightsManifest({ validUntil: "2026-08-24T00:00:00.000Z" })] }),
  ]) {
    assert.equal(
      buildSimilarityFirewallReview(selected, [similarityReference()], registry)
        .reconstructionRiskDetected,
      true,
    );
  }

  const changedBody = similarityReference({ body: "A different cleared comparison body." });
  const changedReview = buildSimilarityFirewallReview(selected, [changedBody], sourceRegistry());
  assert.notEqual(changedReview.corpusDigest, safe.corpusDigest);

  const relabeledAcademyBody = similarityReference({
    body: "A private academy explanation relabeled as if it were cleared source material.",
  });
  const relabelReview = buildSimilarityFirewallReview(
    selected,
    [relabeledAcademyBody],
    sourceRegistry(),
  );
  assert.equal(relabelReview.reconstructionRiskDetected, true);

  const staleReviewBundle = personalBundle();
  staleReviewBundle.similarityReferences[0].body = "The exact corpus body changed after review.";
  assert.ok(
    evaluateQuestionRelease(staleReviewBundle, "PERSONAL_LEARNING_USABLE").blockingCodes.includes(
      "SIMILARITY_REVIEW_NOT_BOUND_TO_EXACT_CORPUS",
    ),
  );
});

test("AI-only release is capped at PERSONAL_LEARNING_USABLE and no generator can approve itself", () => {
  const bundleValue = personalBundle();
  const personal = evaluateQuestionRelease(bundleValue, "PERSONAL_LEARNING_USABLE");
  assert.equal(personal.allowed, true, personal.blockingCodes.join(","));
  assert.equal(personal.releasedTier, "PERSONAL_LEARNING_USABLE");
  assert.equal(personal.maximumAiOnlyTier, "PERSONAL_LEARNING_USABLE");
  assert.equal(personal.learnerMasteryClaimed, false);

  const selfJudged = clone(bundleValue);
  selfJudged.judgeReviews[0].judgeId = selfJudged.batch.candidates[0].generatorId;
  const blocked = evaluateQuestionRelease(selfJudged, "PERSONAL_LEARNING_USABLE");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.blockingCodes.some((code) => code.includes("GENERATOR_CANNOT_APPROVE")));

  const judgeAlsoSolver = clone(bundleValue);
  judgeAlsoSolver.judgeReviews[0].judgeId = judgeAlsoSolver.blindSolverReviews[0].solverId;
  const overlappingIdentity = evaluateQuestionRelease(
    judgeAlsoSolver,
    "PERSONAL_LEARNING_USABLE",
  );
  assert.equal(overlappingIdentity.allowed, false);
  assert.ok(
    overlappingIdentity.blockingCodes.some((code) => code.includes("JUDGE_SOLVER_IDENTITY_OVERLAP")),
  );

  const transferWithoutHuman = evaluateQuestionRelease(bundleValue, "TRANSFER_VERIFIED");
  assert.equal(transferWithoutHuman.allowed, false);
  assert.ok(
    transferWithoutHuman.blockingCodes.includes("OWNER_ADJUDICATION_REQUIRED_ABOVE_PERSONAL_TIER"),
  );
});

test("blind-solver ambiguity, multiple answers, answer clues and missing evidence quarantine deterministically", () => {
  const oneSolver = personalBundle();
  oneSolver.blindSolverReviews = oneSolver.blindSolverReviews.slice(0, 1);
  assert.equal(evaluateQuestionRelease(oneSolver, "PERSONAL_LEARNING_USABLE").allowed, false);

  const ambiguous = personalBundle();
  ambiguous.blindSolverReviews[0].ambiguityDetected = true;
  ambiguous.blindSolverReviews[0].plausibleCorrectOptionIds.push(
    ambiguous.batch.candidates[0].options[1].optionId,
  );
  const ambiguityDecision = evaluateQuestionRelease(ambiguous, "PERSONAL_LEARNING_USABLE");
  assert.equal(ambiguityDecision.allowed, false);
  assert.equal(ambiguityDecision.releasedTier, "QUARANTINED");

  const clue = personalBundle();
  clue.batch = clone(clue.batch);
  clue.batch.candidates[0].stem = `${clue.batch.candidates[0].stem} obviously`;
  assert.equal(evaluateQuestionRelease(clue, "PERSONAL_LEARNING_USABLE").allowed, false);

  const judgeAmbiguity = personalBundle();
  judgeAmbiguity.judgeReviews[0].singleCorrectAnswer = false;
  judgeAmbiguity.judgeReviews[0].ambiguityDetected = true;
  assert.equal(evaluateQuestionRelease(judgeAmbiguity, "PERSONAL_LEARNING_USABLE").allowed, false);
});

test("TRANSFER_VERIFIED requires its stronger closed bundle and transfer-purpose rights", () => {
  const transfer = transferBundle();
  const decision = evaluateQuestionRelease(transfer, "TRANSFER_VERIFIED");
  assert.equal(decision.allowed, true, decision.blockingCodes.join(","));

  const unsealed = clone(transfer);
  unsealed.transferEvidence.sealedBeforeEvaluation = false;
  assert.equal(evaluateQuestionRelease(unsealed, "TRANSFER_VERIFIED").allowed, false);

  const noTransferPurpose = clone(transfer);
  noTransferPurpose.trustedSources.rightsManifests[0].permittedPurposes = [
    "QUESTION_BLUEPRINT_EXTRACTION",
    "QUESTION_GENERATION_CONTEXT",
    "PERSONAL_LEARNING_BANK",
  ];
  const blocked = evaluateQuestionRelease(noTransferPurpose, "TRANSFER_VERIFIED");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.blockingCodes.some((code) => code.includes("PURPOSE_DENIED")));
});

test("MEASUREMENT_CALIBRATED stays unavailable until trusted runtime authority is installed", () => {
  const measurement = measurementBundle();
  const trustContext = measurementTrustContext(measurement);
  const decision = evaluateQuestionRelease(measurement, "MEASUREMENT_CALIBRATED", trustContext);
  assert.equal(decision.allowed, false);
  assert.ok(decision.blockingCodes.includes("MEASUREMENT_RUNTIME_AUTHORITY_NOT_INSTALLED"));
  assert.equal(decision.calibrationClaimedWithoutOwnerEvidence, false);
  assert.equal(
    evaluateQuestionRelease(measurement, "MEASUREMENT_CALIBRATED").allowed,
    false,
  );

  const syntheticTrust = clone(trustContext);
  syntheticTrust.ownerResponseExportBinding.syntheticOrSimulated = true;
  assert.equal(
    evaluateQuestionRelease(measurement, "MEASUREMENT_CALIBRATED", syntheticTrust).allowed,
    false,
  );

  const unpinnedTrust = clone(trustContext);
  unpinnedTrust.ownerResponseExportBinding.registryDigest = DIGEST_B;
  assert.equal(
    evaluateQuestionRelease(measurement, "MEASUREMENT_CALIBRATED", unpinnedTrust).allowed,
    false,
  );

  const simulated = clone(measurement);
  simulated.ownerResponseEvidence.actualOwnerResponses = false;
  assert.equal(
    evaluateQuestionRelease(simulated, "MEASUREMENT_CALIBRATED", trustContext).allowed,
    false,
  );

  const tooFew = clone(measurement);
  tooFew.ownerResponseEvidence.responseIds.pop();
  tooFew.ownerResponseEvidence.responseCount -= 1;
  tooFew.trustedOwnerResponseRegistry.receipts = [clone(tooFew.ownerResponseEvidence)];
  tooFew.trustedOwnerResponseRegistry.receiptsDigest = canonicalDigest(
    tooFew.trustedOwnerResponseRegistry.receipts,
  );
  assert.equal(
    evaluateQuestionRelease(tooFew, "MEASUREMENT_CALIBRATED", measurementTrustContext(tooFew)).allowed,
    false,
  );

  const forgedRegistry = clone(measurement);
  forgedRegistry.trustedOwnerResponseRegistry.receiptsDigest = DIGEST_B;
  const forgedDecision = evaluateQuestionRelease(
    forgedRegistry,
    "MEASUREMENT_CALIBRATED",
    trustContext,
  );
  assert.equal(forgedDecision.allowed, false);
  assert.ok(
    forgedDecision.blockingCodes.includes("OWNER_RESPONSE_RECEIPT_NOT_IN_TRUSTED_RUNTIME_REGISTRY"),
  );
});

test("all four meta-audits are independently mandatory", () => {
  for (const [name, mutate] of [
    ["selfPreference", (bundleValue) => { bundleValue.metaAudits.selfPreference.evaluatorIds = ["generator-1"]; }],
    ["orderBias", (bundleValue) => { bundleValue.metaAudits.orderBias.stableAcrossOrders = false; }],
    ["repeatedStability", (bundleValue) => { bundleValue.metaAudits.repeatedStability.runIds = ["one", "two"]; }],
    ["judgeDrift", (bundleValue) => { bundleValue.metaAudits.judgeDrift.disagreementRate = 0.5; }],
  ]) {
    const bundleValue = personalBundle();
    mutate(bundleValue);
    const decision = evaluateQuestionRelease(bundleValue, "PERSONAL_LEARNING_USABLE");
    assert.equal(decision.allowed, false, name);
    assert.ok(decision.blockingCodes.some((code) => code.includes("metaAudit")), name);
  }
});

test("bank-first selection never generates when an exact assignable item exists and generation-on-gap stays offline", () => {
  const bundleValue = personalBundle();
  const decision = evaluateQuestionRelease(bundleValue, "PERSONAL_LEARNING_USABLE");
  const auditRun = createReleaseAudit(bundleValue, decision, "audit-run-1");
  const trustContext = { ownerResponseExportBinding: null };
  const artifact = createQuestionBankArtifact({
    artifactId: "artifact-1",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext,
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  });
  const releaseEnvelope = {
    artifact,
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext,
    auditRun,
  };
  const request = {
    requestId: "request-1",
    subject: artifact.subject,
    skillId: artifact.skillId,
    difficultyBand: artifact.difficultyBand,
    itemFamily: artifact.itemFamily,
    excludedArtifactIds: [],
    offlineGenerationOnGapAuthorized: true,
    occurredAt: "2026-08-25T00:21:00.000Z",
  };
  let calls = 0;
  const found = selectBankFirstOrGenerateOnGap(request, [releaseEnvelope], () => {
    calls += 1;
    return batch();
  });
  assert.equal(found.kind, "BANK_ITEM");
  assert.equal(found.generationCount, 0);
  assert.equal(calls, 0);

  const blocked = selectBankFirstOrGenerateOnGap(
    { ...request, requestId: "request-2", offlineGenerationOnGapAuthorized: false },
    [],
    () => {
      calls += 1;
      return batch();
    },
  );
  assert.equal(blocked.kind, "BLOCKED");
  assert.equal(blocked.scarcityEvent.containsBody, false);
  assert.equal(calls, 0);

  const generated = selectBankFirstOrGenerateOnGap(
    { ...request, requestId: "request-3" },
    [],
    () => {
      calls += 1;
      return batch();
    },
  );
  assert.equal(generated.kind, "OFFLINE_GENERATION_GAP");
  assert.equal(generated.generatedBatch.offline, true);
  assert.ok(generated.generatedBatch.candidates.every((candidate) => candidate.initialState === "QUARANTINED"));
  assert.equal(calls, 1);

  const fabricatedEnvelope = clone(releaseEnvelope);
  fabricatedEnvelope.artifact.releaseTier = "TRANSFER_VERIFIED";
  assert.throws(
    () => selectBankFirstOrGenerateOnGap(request, [fabricatedEnvelope], null),
    /bank-release-envelope-artifact-mismatch/,
  );
  for (const mutate of [
    (envelope) => { envelope.artifact.auditRunId = "fabricated-audit"; },
    (envelope) => { envelope.artifact.createdAt = "2026-08-25T00:19:00.000Z"; },
  ]) {
    const fabricated = clone(releaseEnvelope);
    mutate(fabricated);
    assert.throws(
      () => selectBankFirstOrGenerateOnGap(request, [fabricated], null),
      /bank-release-envelope-artifact-mismatch|release-audit-not-bound|artifact-time-must-equal/,
    );
  }

  const emptyBatch = clone(batch());
  emptyBatch.candidates = [];
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        { ...request, requestId: "request-empty" },
        [],
        () => emptyBatch,
      ),
    /generation-on-gap-invalid-batch/,
  );

  const wrongSubjectBatch = clone(batch());
  wrongSubjectBatch.blueprint.subject = "ECONOMICS";
  assert.equal(validateCandidateBatch(wrongSubjectBatch).valid, true);
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        { ...request, requestId: "request-wrong-subject" },
        [],
        () => wrongSubjectBatch,
      ),
    /request-scope-mismatch/,
  );
});

test("dispute, revision and retirement are immutable, lineage-preserving and stale-write safe", () => {
  const bundleValue = personalBundle();
  const decision = evaluateQuestionRelease(bundleValue, "PERSONAL_LEARNING_USABLE");
  const auditRun = createReleaseAudit(bundleValue, decision, "audit-lifecycle-1");
  const artifact = createQuestionBankArtifact({
    artifactId: "artifact-lifecycle-1",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext: { ownerResponseExportBinding: null },
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  });
  assert.equal(isQuestionBankArtifactAssignable(artifact), true);
  const disputedAt = "2026-08-25T00:21:00.000Z";
  const disputedAuditId = "audit-lifecycle-2";
  const expectedDisputed = {
    ...artifact,
    releaseTier: "DISPUTED",
    revision: 2,
    auditRunId: disputedAuditId,
    updatedAt: disputedAt,
  };
  const disputedAudit = createLifecycleAudit(
    artifact,
    expectedDisputed,
    "DISPUTED",
    disputedAuditId,
    disputedAt,
  );
  const backdatedDisputedAt = "2026-08-24T00:00:00.000Z";
  const backdatedExpected = {
    ...expectedDisputed,
    updatedAt: backdatedDisputedAt,
  };
  const backdatedAudit = createLifecycleAudit(
    artifact,
    backdatedExpected,
    "DISPUTED",
    disputedAuditId,
    backdatedDisputedAt,
  );
  assert.throws(
    () => disputeQuestionBankArtifact(artifact, 1, backdatedAudit, backdatedDisputedAt),
    /lifecycle-time-must-follow-audit/,
  );
  const disputed = disputeQuestionBankArtifact(
    artifact,
    1,
    disputedAudit,
    disputedAt,
  );
  assert.equal(disputed.releaseTier, "DISPUTED");
  assert.equal(isQuestionBankArtifactAssignable(disputed), false);
  assert.throws(
    () => disputeQuestionBankArtifact(disputed, 1, disputedAudit, "2026-08-25T00:22:00.000Z"),
    /stale-artifact-revision/,
  );
  const revisedAt = "2026-08-25T00:23:00.000Z";
  const revisedAuditId = "audit-lifecycle-3";
  const expectedRevised = {
    ...disputed,
    artifactId: "artifact-lifecycle-2",
    candidateId: "candidate-revision-2",
    releaseTier: "QUARANTINED",
    revision: 1,
    parentArtifactId: disputed.artifactId,
    auditRunId: revisedAuditId,
    createdAt: revisedAt,
    updatedAt: revisedAt,
  };
  const revisedAudit = createLifecycleAudit(
    disputed,
    expectedRevised,
    "REVISED",
    revisedAuditId,
    revisedAt,
  );
  assert.throws(
    () =>
      reviseQuestionBankArtifact({
        artifact: disputed,
        expectedRevision: 2,
        newArtifactId: "",
        newCandidateId: " ",
        auditRun: revisedAudit,
        occurredAt: revisedAt,
      }),
    /identities-invalid/,
  );
  const revised = reviseQuestionBankArtifact({
    artifact: disputed,
    expectedRevision: 2,
    newArtifactId: "artifact-lifecycle-2",
    newCandidateId: "candidate-revision-2",
    auditRun: revisedAudit,
    occurredAt: revisedAt,
  });
  assert.equal(revised.releaseTier, "QUARANTINED");
  assert.equal(revised.parentArtifactId, disputed.artifactId);
  assert.equal(revised.revision, 1);
  const retiredAt = "2026-08-25T00:24:00.000Z";
  const retiredAuditId = "audit-lifecycle-4";
  const expectedRetired = {
    ...revised,
    releaseTier: "RETIRED",
    revision: 2,
    auditRunId: retiredAuditId,
    updatedAt: retiredAt,
  };
  const retiredAudit = createLifecycleAudit(
    revised,
    expectedRetired,
    "RETIRED",
    retiredAuditId,
    retiredAt,
  );
  const retired = retireQuestionBankArtifact(
    revised,
    1,
    retiredAudit,
    retiredAt,
  );
  assert.equal(retired.releaseTier, "RETIRED");
  assert.throws(
    () => retireQuestionBankArtifact(retired, 2, retiredAudit, "2026-08-25T00:25:00.000Z"),
    /terminal/,
  );
  assert.equal(Object.isFrozen(retired), true);
});

function auditFixture(input, output) {
  const actors = [
    { actorId: "generator-1", role: "GENERATOR", version: "generator-1@1" },
    { actorId: "validator-1", role: "DETERMINISTIC_VALIDATOR", version: "validator-1@1" },
    { actorId: "blind-solver-1", role: "BLIND_SOLVER", version: "blind-solver-1@1" },
    { actorId: "blind-solver-2", role: "BLIND_SOLVER", version: "blind-solver-2@1" },
    { actorId: "judge-1", role: "JUDGE", version: "judge-1@1" },
  ];
  const definitions = [
    ["solution", "SOLUTION_COMMITTED", "generator-1"],
    ["candidate", "CANDIDATE_GENERATED", "generator-1"],
    ["quarantine", "QUARANTINED", "validator-1"],
    ["permutation", "PERMUTED", "validator-1"],
    ["deterministic", "DETERMINISTIC_VALIDATED", "validator-1"],
    ["source", "SOURCE_VALIDATED", "validator-1"],
    ["similarity", "SIMILARITY_REVIEWED", "judge-1"],
    ["blind-1", "BLIND_SOLVED", "blind-solver-1"],
    ["blind-2", "BLIND_SOLVED", "blind-solver-2"],
    ["judge", "JUDGED", "judge-1"],
    ["meta", "META_AUDITED", "judge-1"],
    ["release", "RELEASE_DECIDED", "validator-1"],
  ];
  let priorDigest = canonicalDigest(input);
  const steps = definitions.map(([stepId, kind, actorId], index) => {
    const outputDigest =
      index === definitions.length - 1
        ? canonicalDigest(output)
        : canonicalDigest({ stepId, index, priorDigest });
    const step = {
      stepId,
      kind,
      actorId,
      occurredAt: `2026-08-25T00:${String(index + 1).padStart(2, "0")}:00.000Z`,
      inputDigest: priorDigest,
      outputDigest,
    };
    priorDigest = outputDigest;
    return step;
  });
  return { actors, steps };
}

function createReleaseAudit(bundleValue, decision, auditRunId) {
  const { actors, steps } = auditFixture(bundleValue, decision);
  return createAuditRun({
    auditRunId,
    input: bundleValue,
    output: decision,
    actors,
    steps,
    startedAt: "2026-08-25T00:00:00.000Z",
    completedAt: "2026-08-25T00:12:00.000Z",
  });
}

function createLifecycleAudit(inputArtifact, outputArtifact, kind, auditRunId, occurredAt) {
  return createAuditRun({
    auditRunId,
    input: inputArtifact,
    output: outputArtifact,
    actors: [{ actorId: "owner-1", role: "OWNER", version: "owner-1@1" }],
    steps: [
      {
        stepId: `${auditRunId}:transition`,
        kind,
        actorId: "owner-1",
        occurredAt,
        inputDigest: canonicalDigest(inputArtifact),
        outputDigest: canonicalDigest(outputArtifact),
      },
    ],
    startedAt: occurredAt,
    completedAt: occurredAt,
  });
}

test("AuditRunV1 is immutable, canonical, solution-first and rejects role or digest tampering", () => {
  const auditInput = { batchDigest: canonicalDigest(batch()) };
  const auditOutput = { releaseTier: "PERSONAL_LEARNING_USABLE" };
  const { actors, steps } = auditFixture(auditInput, auditOutput);
  const run = createAuditRun({
    auditRunId: "audit-run-complete-1",
    input: auditInput,
    output: auditOutput,
    actors,
    steps,
    startedAt: "2026-08-25T00:00:00.000Z",
    completedAt: "2026-08-25T00:12:00.000Z",
  });
  assert.equal(validateAuditRun(run).valid, true);
  assert.equal(Object.isFrozen(run), true);
  assert.equal(Object.isFrozen(run.steps), true);

  const tampered = clone(run);
  tampered.outputDigest = DIGEST_B;
  assert.equal(validateAuditRun(tampered).valid, false);
  const selfJudged = clone(run);
  selfJudged.steps.find((step) => step.kind === "JUDGED").actorId = "generator-1";
  const selfJudgedResult = validateAuditRun(selfJudged);
  assert.equal(selfJudgedResult.valid, false);
  assert.ok(selfJudgedResult.errors.some((error) => error.includes("SELF_JUDGED")));
  const reordered = clone(run);
  [reordered.steps[0], reordered.steps[1]] = [reordered.steps[1], reordered.steps[0]];
  assert.equal(validateAuditRun(reordered).valid, false);

  const duplicateSolver = clone(run);
  duplicateSolver.steps.find(
    (step) => step.kind === "BLIND_SOLVED" && step.actorId === "blind-solver-2",
  ).actorId = "blind-solver-1";
  assert.ok(
    validateAuditRun(duplicateSolver).errors.includes("AUDIT_TWO_BLIND_SOLVERS_REQUIRED"),
  );

  const disconnected = clone(run);
  disconnected.steps[4].inputDigest = DIGEST_B;
  assert.ok(
    validateAuditRun(disconnected).errors.some((error) => error.includes("DIGEST_CHAIN_BROKEN")),
  );

  const injectedTopLevel = clone(run);
  injectedTopLevel.privateAcademyBody = "raw private academy content must never enter provenance";
  assert.equal(injectedTopLevel.auditDigest, run.auditDigest);
  assert.ok(validateAuditRun(injectedTopLevel).errors.includes("AUDIT_RUN_SCHEMA_NOT_CLOSED"));

  const injectedActor = clone(run);
  injectedActor.actors[0].rawPrivateBody = "private learner body";
  assert.ok(
    validateAuditRun(injectedActor).errors.some((error) => error.includes("ACTOR_SCHEMA_NOT_CLOSED")),
  );
  const injectedStep = clone(run);
  injectedStep.steps[0].academyBody = "commercial textbook body";
  assert.ok(
    validateAuditRun(injectedStep).errors.some((error) => error.includes("STEP_SCHEMA_NOT_CLOSED")),
  );
  assert.throws(
    () =>
      createAuditRun({
        auditRunId: "audit-raw-body-rejected",
        input: auditInput,
        output: auditOutput,
        actors: [{ ...actors[0], rawPrivateBody: "private learner body" }],
        steps,
        startedAt: "2026-08-25T00:00:00.000Z",
        completedAt: "2026-08-25T00:12:00.000Z",
      }),
    /actor-schema-must-be-closed/,
  );
  assert.throws(
    () =>
      createAuditRun({
        auditRunId: "audit-raw-step-rejected",
        input: auditInput,
        output: auditOutput,
        actors,
        steps: [{ ...steps[0], academyBody: "commercial textbook body" }, ...steps.slice(1)],
        startedAt: "2026-08-25T00:00:00.000Z",
        completedAt: "2026-08-25T00:12:00.000Z",
      }),
    /step-schema-must-be-closed/,
  );

  for (const [expectedCode, mutate] of [
    ["AUDIT_RUN_ID_INVALID", (value) => { value.auditRunId = ""; }],
    ["AUDIT_ACTOR_IDENTITY_INVALID", (value) => { value.actors[0].actorId = ""; }],
    ["AUDIT_ACTOR_IDENTITY_INVALID", (value) => { value.actors[0].version = ""; }],
    ["AUDIT_STEP_IDENTITY_INVALID", (value) => { value.steps[0].stepId = ""; }],
  ]) {
    const invalidIdentity = clone(run);
    mutate(invalidIdentity);
    assert.ok(
      validateAuditRun(invalidIdentity).errors.some((error) => error.includes(expectedCode)),
      expectedCode,
    );
  }
});

test("bank artifact release is bound to exact evidence, decision, immutable audit and time", () => {
  const bundleValue = personalBundle();
  const decision = evaluateQuestionRelease(bundleValue, "PERSONAL_LEARNING_USABLE");
  const auditRun = createReleaseAudit(bundleValue, decision, "release-audit-bound-1");
  const input = {
    artifactId: "artifact-bound-1",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext: { ownerResponseExportBinding: null },
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  };
  const artifact = createQuestionBankArtifact(input);
  assert.equal(artifact.auditRunId, auditRun.auditRunId);
  assert.equal(artifact.releaseTier, decision.releasedTier);
  assert.throws(
    () => createQuestionBankArtifact({ ...input, artifactId: "" }),
    /artifact-id-required/,
  );

  const forgedDecision = clone(decision);
  forgedDecision.evidenceDigest = DIGEST_B;
  assert.throws(
    () => createQuestionBankArtifact({ ...input, decision: forgedDecision }),
    /not-bound-to-exact-evidence/,
  );

  const otherBundle = personalBundle();
  otherBundle.selectedCandidateId = otherBundle.batch.candidates[1].candidateId;
  const otherDecision = evaluateQuestionRelease(otherBundle, "PERSONAL_LEARNING_USABLE");
  const unrelatedAudit = createReleaseAudit(otherBundle, otherDecision, "unrelated-audit");
  assert.throws(
    () => createQuestionBankArtifact({ ...input, auditRun: unrelatedAudit }),
    /not-bound-to-evidence-and-decision/,
  );
  assert.throws(
    () => createQuestionBankArtifact({ ...input, occurredAt: "2026-08-25T00:11:00.000Z" }),
    /must-equal-release-audit-completion/,
  );
});

test("offline CLI validates a local batch without network, provider or remote mutation", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "question-foundry-cli-"));
  const inputPath = path.join(directory, "batch.json");
  try {
    await writeFile(inputPath, JSON.stringify({ batch: batch() }), "utf8");
    const run = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "scripts/offline/question-foundry-v1.mjs",
        "--action",
        "validate-batch",
        "--input",
        inputPath,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(run.stdout);
    assert.deepEqual(result, { valid: true, errors: [] });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
