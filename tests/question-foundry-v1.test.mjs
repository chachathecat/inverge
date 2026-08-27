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
  QUESTION_FOUNDRY_NEAR_COPY_FAILURE_TRANSFORMATIONS,
  QUESTION_FOUNDRY_CALCULATION_NUMERIC_TOKEN_SOURCE,
  QUESTION_FOUNDRY_SIMILARITY_THRESHOLD,
  QUESTION_FOUNDRY_SUBJECTS,
  QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST,
  buildSimilarityFirewallReview,
  calculateDeterministically,
  canonicalDigest,
  createAuditRun,
  createReleaseAuditRun,
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
  validateReleaseAuditRun,
  validateCandidateBatch,
  validateCandidateCalculation,
  validateCalculationSpecification,
  validateGeneratorJudgeSolverSeparation,
  validateMetaAuditBundle,
  validateQuestionBlueprint,
  validateTrustedSourceBindings,
} from "../lib/question-foundry/index.ts";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const T0 = "2026-08-25T00:00:00.000Z";
const T1 = "2026-08-25T00:01:00.000Z";
const T2 = "2026-08-25T00:02:00.000Z";
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const RIGHTS_PURPOSES = [
  "QUESTION_BLUEPRINT_EXTRACTION",
  "QUESTION_GENERATION_CONTEXT",
  "PERSONAL_LEARNING_BANK",
  "TRANSFER_BANK",
  "MEASUREMENT_BANK",
];
const MODEL_EXECUTION_SIGNATURES = Object.freeze({
  "2b3ea5953d427d716194fe3ff0ecfe3ac669cfb2cb6e52e18222532c4859e1a3":
    "TeZMPG+IuEE9DEWRsrWuMJ3inWIJWc4hIj1BjQLysPd0D5oiOQ2wWUFKrZjfzmPo/LaIIx4shN9Xa2klOjGoCw==",
  "3c9953a55a0387b3ed291fe1e9cd03e48a2040660e0f25d078eb411c49fe8bbf":
    "hjanK42I4k6M5shLYYxVjVBKh2T6X2AD1wJlw4R03N02OrUmfuEw6EyrxcTA7c9nHW6H138XW1v/g9Lk57r7DA==",
});
const OWNER_ADJUDICATION_SIGNATURES = Object.freeze({
  "d2ab39e07290ee729f0bf5665c97623a1a65f91a4dae36ab7b6bbd07d6be8a4b":
    "uWtJGWElKhwZ0zw2CFljnF3GpSneb18qlcaCz8bvFGeiblqxP5kyDemRwVr+0qYgOG1uC2I72qIeW2+nVK3UDQ==",
});
const SEALED_VARIANT_SIGNATURES = Object.freeze({
  "4d0d1095b98a13a87c6085b48b64ab78b2def6b4c61b2cdab764d09681f61c2f":
    "Kjyg7f7aFRo+OYK6kBsypW0BC5tdbVyuEc1xnYOwA0x82PwJYwaPW9tjkOlDTFKeV6U/D5FbstQpkxOl1hMHAA==",
});
const SOURCE_REGISTRY_SIGNATURES = Object.freeze({
  "204b8dd60717b78ee9e6ececd93ee0ff9078d3c2e5c9aa203c959ca52dc0a26b":
    "/SvFqoKhL57xQNN7VvTpCDw3AGs7noIAqC3yXYqmm4TgoWX3Rvsz8p89Jgvbsc5g5RAryhxb/eh2GvqmLsq8Dg==",
  "c4790314bac63fe66b2a20e3c79b9e18c8cdc0d7dc63f56ff67d45d43b1a6fda":
    "9GxsMjxwwTUMNO6ubrzztIdwa5+20lsgyY6k5KOgr8BwLS6th0G2mzvNNtiKXVC0DUl5/TqxaB5YKrEn2KApDw==",
  "9572d696899409df66e45d2082776f392766076d40ddf5c0ff58ddeaaee835f8":
    "Gx4sTgCquMQFiAtu289eA8DTTAC2a8sD3rc0//cE7vnFBR1kY/glQD4rg2/RgdmO2QAFd/UI6dV6+wqP76CwBQ==",
  "71d3016fe218f253220d5980a6e037bd0146f7cf33b6eac53e74c02dccb8a360":
    "UJma3r8XQUyjpa/CATJISou32jnr8luwqIxdLIfkiQFExSt4KiWFVINuXFJZrhWcjTOpQaz+er739GhMIe3LCQ==",
  "dfa21ff760abf11def0f0b7b7328b0e86b2a426a7ef3cbd124da5653ad4ddba7":
    "owBR+i+jIrmGgzlTqTZiNcWFtRf0vnlEkjoZ7ZfMsDs6nEZwoZRD1+7ia0akiA5wP8Y+tDCcF3RaF1lPBLsYAQ==",
});

function clone(value) {
  return structuredClone(value);
}

function modelIdentity(modelFamilyId, modelVersionId = `${modelFamilyId}@1`) {
  return {
    providerId: "offline-model-registry",
    modelFamilyId,
    modelVersionId,
    modelArtifactDigest: canonicalDigest({ modelFamilyId, modelVersionId }),
  };
}

function decisionId(binding, purpose) {
  return `decision:${binding.sourceVersionId}:${purpose.toLowerCase()}`;
}

function decisionBasisChecksum(binding, purpose) {
  return canonicalDigest({
    sourceId: binding.sourceId,
    sourceVersionId: binding.sourceVersionId,
    sourceClass: binding.sourceClass,
    contentDigest: binding.contentDigest,
    purpose,
    rightsManifestId: binding.rightsManifestId,
    rightsManifestVersionId: binding.rightsManifestVersionId,
    policyVersion: "question-foundry-rights-policy@1",
  });
}

function eligibilityDecision(binding, purpose, overrides = {}) {
  return {
    decisionId: decisionId(binding, purpose),
    sourceId: binding.sourceId,
    sourceVersionId: binding.sourceVersionId,
    sourceClass: binding.sourceClass,
    purpose,
    decision: "CONDITIONALLY_ELIGIBLE",
    denialCodes: [],
    decidedAt: "2026-08-24T23:58:00.000Z",
    policyVersion: "question-foundry-rights-policy@1",
    decisionBasisChecksum: decisionBasisChecksum(binding, purpose),
    rightsManifestId: binding.rightsManifestId,
    rightsManifestVersionId: binding.rightsManifestVersionId,
    rightsEvaluatedAt: "2026-08-24T23:59:00.000Z",
    ...overrides,
  };
}

function rightsManifest(overrides = {}) {
  return {
    manifestId: "rights:question-foundry:1",
    manifestVersionId: "rights:question-foundry:1@1",
    sourceClass: "CLEARED_DETERMINISTIC_TEMPLATE",
    rightsHolder: "Inverge",
    permittedPurposes: RIGHTS_PURPOSES,
    territory: ["KR"],
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2027-01-01T00:00:00.000Z",
    status: "ACTIVE",
    provenance: ["inverge-original-template-registry"],
    ...overrides,
  };
}

function sourceBinding(overrides = {}) {
  const binding = {
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
  return {
    ...binding,
    sourceDecisionBindings: overrides.sourceDecisionBindings ?? RIGHTS_PURPOSES.map((purpose) => ({
      purpose,
      decisionId: decisionId(binding, purpose),
      decisionBasisChecksum: decisionBasisChecksum(binding, purpose),
    })),
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
  const sourceVersions = overrides.sourceVersions ?? [sourceBinding(), similaritySourceBinding()];
  const rightsManifests = overrides.rightsManifests ?? [rightsManifest()];
  const eligibilityDecisions = (
    overrides.eligibilityDecisions ??
    sourceVersions.flatMap((binding) =>
      RIGHTS_PURPOSES.map((purpose) => eligibilityDecision(binding, purpose)),
    )
  ).toSorted((left, right) => left.decisionId.localeCompare(right.decisionId));
  const registry = {
    registryVersion: "question_foundry.trusted_source_registry.v1",
    source: "LOCAL_RIGHTS_AUTHORITY_EXPORT",
    exportId: "rights-authority-export-1",
    exportVersionId: "rights-authority-export-1@1",
    asOf: overrides.asOf ?? T2,
    verifiedAt: overrides.verifiedAt ?? "2026-08-24T23:59:30.000Z",
    remoteReadPerformed: false,
    territory: overrides.territory ?? "KR",
    rightsManifests: rightsManifests.toSorted((left, right) =>
      `${left.manifestId}@${left.manifestVersionId}`.localeCompare(
        `${right.manifestId}@${right.manifestVersionId}`,
      )),
    sourceVersions: sourceVersions.toSorted((left, right) =>
      `${left.sourceId}@${left.sourceVersionId}`.localeCompare(
        `${right.sourceId}@${right.sourceVersionId}`,
      )),
    eligibilityDecisions,
    ...overrides,
  };
  registry.rightsManifests = registry.rightsManifests.toSorted((left, right) =>
    `${left.manifestId}@${left.manifestVersionId}`.localeCompare(
      `${right.manifestId}@${right.manifestVersionId}`,
    ));
  registry.sourceVersions = registry.sourceVersions.toSorted((left, right) =>
    `${left.sourceId}@${left.sourceVersionId}`.localeCompare(
      `${right.sourceId}@${right.sourceVersionId}`,
    ));
  registry.eligibilityDecisions = registry.eligibilityDecisions.toSorted((left, right) =>
    left.decisionId.localeCompare(right.decisionId));
  const projection = {
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    asOf: registry.asOf,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    territory: registry.territory,
    rightsManifestsDigest: canonicalDigest(registry.rightsManifests),
    sourceVersionsDigest: canonicalDigest(registry.sourceVersions),
    eligibilityDecisionsDigest: canonicalDigest(registry.eligibilityDecisions),
  };
  return {
    ...registry,
    rightsManifestsDigest: projection.rightsManifestsDigest,
    sourceVersionsDigest: projection.sourceVersionsDigest,
    eligibilityDecisionsDigest: projection.eligibilityDecisionsDigest,
    exportContentDigest: canonicalDigest(projection),
  };
}

function refreshSourceRegistryExport(registry) {
  registry.rightsManifests = registry.rightsManifests.toSorted((left, right) =>
    `${left.manifestId}@${left.manifestVersionId}`.localeCompare(
      `${right.manifestId}@${right.manifestVersionId}`,
    ));
  registry.sourceVersions = registry.sourceVersions.toSorted((left, right) =>
    `${left.sourceId}@${left.sourceVersionId}`.localeCompare(
      `${right.sourceId}@${right.sourceVersionId}`,
    ));
  registry.eligibilityDecisions = registry.eligibilityDecisions.toSorted((left, right) =>
    left.decisionId.localeCompare(right.decisionId));
  registry.rightsManifestsDigest = canonicalDigest(registry.rightsManifests);
  registry.sourceVersionsDigest = canonicalDigest(registry.sourceVersions);
  registry.eligibilityDecisionsDigest = canonicalDigest(registry.eligibilityDecisions);
  registry.exportContentDigest = canonicalDigest({
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    asOf: registry.asOf,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    territory: registry.territory,
    rightsManifestsDigest: registry.rightsManifestsDigest,
    sourceVersionsDigest: registry.sourceVersionsDigest,
    eligibilityDecisionsDigest: registry.eligibilityDecisionsDigest,
  });
  return registry;
}

function blueprint(overrides = {}) {
  return {
    schemaVersion: QUESTION_BLUEPRINT_VERSION,
    blueprintId: "blueprint:accounting:division",
    blueprintVersionId: "blueprint:accounting:division@1",
    subject: "accounting",
    subjectAdapterInterfaceDigest: QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST,
    skillId: "accounting:deterministic-division",
    difficultyBand: "FOUNDATION",
    itemFamily: "deterministic-calculation",
    learningObjective: "Apply one deterministic division relation correctly.",
    requiredConceptIds: ["concept:division"],
    prohibitedCluePatterns: ["obviously"],
    sourceBindings: [sourceBinding()],
    calculation: {
      operation: "DIVIDE",
      operands: ["40", "2"],
      result: "20",
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

function batch(trustedSources = sourceRegistry()) {
  const blueprintValue = blueprint();
  return generateCandidateBatch({
    batchId: "batch:question-foundry:1",
    blueprint: blueprintValue,
    answerSpecification: answerSpecification(blueprintValue),
    candidateCount: 2,
    generatorId: "generator-1",
    generatorVersion: "generator-1@1",
    generatorModelIdentity: modelIdentity("generator-family"),
    generatorExecutionIds: ["generator-execution-1", "generator-execution-2"],
    generationRunId: "generation-run-1",
    generatedAt: T2,
    trustedSources,
    sourceRegistryExportBinding: sourceRegistryExportBinding(trustedSources),
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

function anonymizedCandidateDigest(candidateBatch) {
  return canonicalDigest(
    candidateBatch.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      blueprintId: candidate.blueprintId,
      blueprintVersionId: candidate.blueprintVersionId,
      answerSpecificationId: candidate.answerSpecificationId,
      generatedAt: candidate.generatedAt,
      solutionCommittedAt: candidate.solutionCommittedAt,
      stem: candidate.stem,
      options: candidate.options,
      proposedCorrectOptionId: candidate.proposedCorrectOptionId,
      explanation: candidate.explanation,
      sourceBindingDigest: candidate.sourceBindingDigest,
      rightsBoundary: candidate.rightsBoundary,
      initialState: candidate.initialState,
    })),
  );
}

function withoutExecutionId(value, field) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

function blindSolverVisibleInput(bundleValue, review) {
  const candidate = bundleValue.batch.candidates.find(
    (entry) => entry.candidateId === review.candidateId,
  );
  const permutation = bundleValue.batch.optionOrderPermutations.find(
    (entry) => entry.permutationId === review.optionPermutationId,
  );
  const optionsById = new Map(candidate.options.map((option) => [option.optionId, option]));
  return {
    candidateId: candidate.candidateId,
    blueprintId: candidate.blueprintId,
    blueprintVersionId: candidate.blueprintVersionId,
    stem: candidate.stem,
    optionPermutationId: permutation.permutationId,
    orderedOptions: permutation.optionIds.map((optionId) => optionsById.get(optionId)),
  };
}

function anonymizedJudgeVisibleInput(bundleValue, review) {
  const candidate = bundleValue.batch.candidates.find(
    (entry) => entry.candidateId === review.candidateId,
  );
  return {
    candidate: {
      blueprintId: candidate.blueprintId,
      blueprintVersionId: candidate.blueprintVersionId,
      answerSpecificationId: candidate.answerSpecificationId,
      stem: candidate.stem,
      options: candidate.options,
      proposedCorrectOptionId: candidate.proposedCorrectOptionId,
      explanation: candidate.explanation,
      sourceBindingDigest: candidate.sourceBindingDigest,
      rightsBoundary: candidate.rightsBoundary,
    },
    answerSpecification: bundleValue.batch.answerSpecification,
    similarityReferences: bundleValue.similarityReferences,
    similarityReview: bundleValue.similarityReview,
  };
}

function modelExecutionDescriptors(bundleValue) {
  const descriptors = [];
  for (const [candidateIndex, candidate] of bundleValue.batch.candidates.entries()) {
    descriptors.push({
      executionId: candidate.generatorExecutionId,
      actorId: candidate.generatorId,
      actorVersion: candidate.generatorVersion,
      role: "GENERATOR",
      modelIdentity: candidate.generatorModelIdentity,
      inputDigest: canonicalDigest({
        blueprint: bundleValue.batch.blueprint,
        answerSpecification: bundleValue.batch.answerSpecification,
        candidateIndex,
        candidateId: candidate.candidateId,
        generationRunId: candidate.generationRunId,
      }),
      outputDigest: canonicalDigest(withoutExecutionId(candidate, "generatorExecutionId")),
      completedAt: candidate.generatedAt,
    });
  }
  for (const review of bundleValue.blindSolverReviews) {
    descriptors.push({
      executionId: review.solverExecutionId,
      actorId: review.solverId,
      actorVersion: review.solverVersion,
      role: "BLIND_SOLVER",
      modelIdentity: review.solverModelIdentity,
      inputDigest: canonicalDigest(blindSolverVisibleInput(bundleValue, review)),
      outputDigest: canonicalDigest(withoutExecutionId(review, "solverExecutionId")),
      completedAt: review.completedAt,
    });
  }
  for (const review of bundleValue.judgeReviews) {
    descriptors.push({
      executionId: review.judgeExecutionId,
      actorId: review.judgeId,
      actorVersion: review.judgeVersion,
      role: "JUDGE",
      modelIdentity: review.judgeModelIdentity,
      inputDigest: canonicalDigest(anonymizedJudgeVisibleInput(bundleValue, review)),
      outputDigest: canonicalDigest(withoutExecutionId(review, "judgeExecutionId")),
      completedAt: review.completedAt,
    });
  }
  for (const run of bundleValue.metaAudits.selfPreference.runs) {
    descriptors.push({
      executionId: run.evaluatorExecutionId,
      actorId: run.evaluatorId,
      actorVersion: run.evaluatorVersion,
      role: "META_EVALUATOR",
      modelIdentity: run.evaluatorModelIdentity,
      inputDigest: canonicalDigest({
        auditKind: "SELF_PREFERENCE",
        anonymizedCandidateDigest: run.anonymizedCandidateDigest,
      }),
      outputDigest: canonicalDigest(withoutExecutionId(run, "evaluatorExecutionId")),
      completedAt: run.completedAt,
    });
  }
  for (const run of bundleValue.metaAudits.orderBias.runs) {
    descriptors.push({
      executionId: run.evaluatorExecutionId,
      actorId: run.evaluatorId,
      actorVersion: run.evaluatorVersion,
      role: "META_EVALUATOR",
      modelIdentity: run.evaluatorModelIdentity,
      inputDigest: canonicalDigest({
        auditKind: "ORDER_BIAS",
        permutationId: run.permutationId,
        orderedCandidateDigest: run.orderedCandidateDigest,
      }),
      outputDigest: canonicalDigest(withoutExecutionId(run, "evaluatorExecutionId")),
      completedAt: run.completedAt,
    });
  }
  for (const run of bundleValue.metaAudits.repeatedStability.runs) {
    descriptors.push({
      executionId: run.evaluatorExecutionId,
      actorId: run.evaluatorId,
      actorVersion: run.evaluatorVersion,
      role: "META_EVALUATOR",
      modelIdentity: run.evaluatorModelIdentity,
      inputDigest: canonicalDigest({ auditKind: "REPEATED_STABILITY", fixtureDigest: run.fixtureDigest }),
      outputDigest: canonicalDigest(withoutExecutionId(run, "evaluatorExecutionId")),
      completedAt: run.completedAt,
    });
  }
  for (const fixture of bundleValue.metaAudits.judgeDrift.fixtures) {
    for (const [role, outcome] of [
      ["DRIFT_BASELINE", fixture.baseline],
      ["DRIFT_CURRENT", fixture.current],
    ]) {
      descriptors.push({
        executionId: outcome.judgeExecutionId,
        actorId: outcome.judgeId,
        actorVersion: outcome.judgeVersion,
        role,
        modelIdentity: outcome.judgeModelIdentity,
        inputDigest: canonicalDigest({
          auditKind: "JUDGE_DRIFT",
          fixtureId: fixture.fixtureId,
          inputDigest: fixture.inputDigest,
          phase: role,
        }),
        outputDigest: canonicalDigest(withoutExecutionId(outcome, "judgeExecutionId")),
        completedAt: outcome.completedAt,
      });
    }
  }
  for (const receipt of bundleValue.transferEvidence?.evaluatorReceipts ?? []) {
    descriptors.push({
      executionId: receipt.evaluatorExecutionId,
      actorId: receipt.evaluatorId,
      actorVersion: receipt.evaluatorVersion,
      role: "TRANSFER_EVALUATOR",
      modelIdentity: receipt.evaluatorModelIdentity,
      inputDigest: receipt.inputDigest,
      outputDigest: receipt.outputDigest,
      completedAt: receipt.evaluatedAt,
    });
  }
  return descriptors;
}

function trustedModelExecutionRegistry(bundleValue) {
  const descriptors = modelExecutionDescriptors(bundleValue);
  const identities = new Map();
  for (const descriptor of descriptors) {
    identities.set(canonicalDigest(descriptor.modelIdentity), descriptor.modelIdentity);
  }
  const models = [...identities.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([identityDigest, identity], index) => ({
      registryModelId: `registry-model-${index + 1}`,
      modelIdentity: identity,
      status: "ACTIVE",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2027-01-01T00:00:00.000Z",
      provenanceDigest: canonicalDigest({ identityDigest, provenance: "owner-local-model-catalog" }),
    }))
    .sort((left, right) => left.registryModelId.localeCompare(right.registryModelId));
  const modelIdByIdentity = new Map(
    models.map((model) => [canonicalDigest(model.modelIdentity), model.registryModelId]),
  );
  const receipts = descriptors
    .map((descriptor) => ({
      executionId: descriptor.executionId,
      registryModelId: modelIdByIdentity.get(canonicalDigest(descriptor.modelIdentity)),
      actorId: descriptor.actorId,
      actorVersion: descriptor.actorVersion,
      role: descriptor.role,
      inputDigest: descriptor.inputDigest,
      outputDigest: descriptor.outputDigest,
      completedAt: descriptor.completedAt,
      offline: true,
      providerCalls: 0,
      selfAsserted: false,
    }))
    .sort((left, right) => left.executionId.localeCompare(right.executionId));
  const withoutDigest = {
    registryVersion: "question_foundry.trusted_model_execution_registry.v1",
    source: "LOCAL_OWNER_VERIFIED_MODEL_EXECUTION_EXPORT",
    exportId: "model-execution-export-1",
    exportVersionId: "model-execution-export-1@1",
    verifiedAt: "2026-08-25T00:10:30.000Z",
    remoteReadPerformed: false,
    modelsDigest: canonicalDigest(models),
    receiptsDigest: canonicalDigest(receipts),
    models,
    receipts,
  };
  return { ...withoutDigest, exportContentDigest: canonicalDigest(withoutDigest) };
}

function modelExecutionExportBinding(bundleValue) {
  const registry = bundleValue.trustedModelExecutions;
  const registryDigest = canonicalDigest(registry);
  const binding = {
    bindingVersion: "question_foundry.trusted_model_execution_export_binding.v1",
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    exportContentDigest: registry.exportContentDigest,
    registryDigest,
    validatorId: "trusted_model_execution_export_validator",
    authorityKeyId: "question-foundry-model-execution-authority-2026-08-27",
    signatureAlgorithm: "Ed25519",
    detachedSignature: MODEL_EXECUTION_SIGNATURES[registryDigest] ?? "AA==",
    actualExecutionLogRead: true,
    syntheticOrSimulated: false,
    verified: true,
  };
  return binding;
}

function sourceRegistryExportBinding(bundleValueOrRegistry) {
  const registry = bundleValueOrRegistry.trustedSources ?? bundleValueOrRegistry;
  const registryDigest = canonicalDigest(registry);
  const binding = {
    bindingVersion: "question_foundry.trusted_source_registry_export_binding.v1",
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    exportContentDigest: registry.exportContentDigest,
    registryDigest,
    validatorId: "trusted_source_registry_export_validator",
    authorityKeyId: "question-foundry-rights-authority-2026-08-27",
    signatureAlgorithm: "Ed25519",
    detachedSignature: SOURCE_REGISTRY_SIGNATURES[registryDigest] ?? "AA==",
    actualRightsAuthorityRead: true,
    syntheticOrSimulated: false,
    verified: true,
  };
  return binding;
}

function validateBlueprintWithAuthority(value, registry) {
  return validateQuestionBlueprint(value, registry, sourceRegistryExportBinding(registry));
}

function validateAnswerWithAuthority(value, blueprintValue, registry) {
  return validateAnswerSpecification(
    value,
    blueprintValue,
    registry,
    sourceRegistryExportBinding(registry),
  );
}

function validateBatchWithAuthority(value, registry) {
  return validateCandidateBatch(value, registry, sourceRegistryExportBinding(registry));
}

function validateBindingsWithAuthority(bindings, registry, purposes = RIGHTS_PURPOSES.slice(0, 2)) {
  return validateTrustedSourceBindings(
    bindings,
    registry,
    purposes,
    sourceRegistryExportBinding(registry),
  );
}

function similarityReviewWithAuthority(candidate, references, registry, threshold) {
  return buildSimilarityFirewallReview(
    candidate,
    references,
    registry,
    sourceRegistryExportBinding(registry),
    threshold,
  );
}

function personalTrustContext(bundleValue) {
  return {
    sourceRegistryExportBinding: sourceRegistryExportBinding(bundleValue),
    modelExecutionExportBinding: modelExecutionExportBinding(bundleValue),
    sealedVariantExportBinding: null,
    ownerAdjudicationExportBinding: null,
    ownerResponseExportBinding: null,
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
    solverModelIdentity: modelIdentity(`blind-solver-family-${index + 1}`),
    solverExecutionId: `blind-solver-execution-${index + 1}`,
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
  const bundleValue = {
    batch: candidateBatch,
    selectedCandidateId: selected.candidateId,
    trustedSources: sourceRegistry({ asOf: "2026-08-25T00:12:00.000Z" }),
    trustedModelExecutions: null,
    blindSolverReviews: [solverReview(0), solverReview(1)],
    judgeReviews: [
      {
        reviewId: "judge-review-1",
        judgeId: "judge-1",
        judgeVersion: "judge-1@1",
        judgeModelIdentity: modelIdentity("judge-family", "judge-family@1"),
        judgeExecutionId: "judge-execution-1",
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
    similarityReview: similarityReviewWithAuthority(
      selected,
      references,
      sourceRegistry(),
    ),
    metaAudits: {
      selfPreference: {
        auditKind: "SELF_PREFERENCE",
        anonymized: true,
        runs: [
          {
            runId: "self-preference-run-1",
            evaluatorId: "meta-judge-1",
            evaluatorVersion: "meta-judge-1@1",
            evaluatorModelIdentity: modelIdentity("meta-judge-family"),
            evaluatorExecutionId: "self-preference-execution-1",
            anonymizedCandidateDigest: anonymizedCandidateDigest(candidateBatch),
            selectedCandidateId: selected.candidateId,
            completedAt: "2026-08-25T00:05:00.000Z",
          },
        ],
        candidateIds: candidateBatch.candidates.map((candidate) => candidate.candidateId),
        evaluatorIds: ["meta-judge-1"],
        generatorEvaluatorOverlap: [],
        selectedCandidateId: selected.candidateId,
        pass: true,
      },
      orderBias: {
        auditKind: "ORDER_BIAS",
        runs: candidateBatch.candidateOrderPermutations.map((entry, index) => ({
          runId: `order-bias-run-${index + 1}`,
          permutationId: entry.permutationId,
          evaluatorId: "order-judge-1",
          evaluatorVersion: "order-judge-1@1",
          evaluatorModelIdentity: modelIdentity("order-judge-family"),
          evaluatorExecutionId: `order-bias-execution-${index + 1}`,
          orderedCandidateDigest: canonicalDigest({
            permutationId: entry.permutationId,
            candidateIds: entry.candidateIds,
          }),
          selectedCandidateId: selected.candidateId,
          completedAt: "2026-08-25T00:06:00.000Z",
        })),
        permutationIds: candidateBatch.candidateOrderPermutations.map((entry) => entry.permutationId),
        selectedCandidateIds: candidateBatch.candidateOrderPermutations.map(() => selected.candidateId),
        stableAcrossOrders: true,
        pass: true,
      },
      repeatedStability: {
        auditKind: "REPEATED_STABILITY",
        fixtureDigest: canonicalDigest({
          batchDigest: canonicalDigest(candidateBatch),
          selectedCandidateId: selected.candidateId,
        }),
        runs: [1, 2, 3].map((number) => ({
          runId: `stability-run-${number}`,
          evaluatorId: "stability-judge-1",
          evaluatorVersion: "stability-judge-1@1",
          evaluatorModelIdentity: modelIdentity("stability-judge-family"),
          evaluatorExecutionId: `stability-execution-${number}`,
          fixtureDigest: canonicalDigest({
            batchDigest: canonicalDigest(candidateBatch),
            selectedCandidateId: selected.candidateId,
          }),
          selectedCandidateId: selected.candidateId,
          selectedOptionId: selected.proposedCorrectOptionId,
          releaseDecision: "PERSONAL_LEARNING_USABLE",
          completedAt: `2026-08-25T00:0${6 + number}:00.000Z`,
        })),
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
        fixtures: [
          {
            fixtureId: "judge-drift-fixture-1",
            inputDigest: DIGEST_A,
            baseline: {
              judgeId: "drift-judge",
              judgeVersion: "judge-1@baseline",
              judgeModelIdentity: modelIdentity("drift-judge-family", "drift-judge-family@baseline"),
              judgeExecutionId: "drift-baseline-execution-1",
              approved: true,
              completedAt: "2026-08-25T00:09:10.000Z",
            },
            current: {
              judgeId: "drift-judge",
              judgeVersion: "judge-1@1",
              judgeModelIdentity: modelIdentity("drift-judge-family", "drift-judge-family@1"),
              judgeExecutionId: "drift-current-execution-1",
              approved: true,
              completedAt: "2026-08-25T00:09:20.000Z",
            },
          },
          {
            fixtureId: "judge-drift-fixture-2",
            inputDigest: DIGEST_B,
            baseline: {
              judgeId: "drift-judge",
              judgeVersion: "judge-1@baseline",
              judgeModelIdentity: modelIdentity("drift-judge-family", "drift-judge-family@baseline"),
              judgeExecutionId: "drift-baseline-execution-2",
              approved: false,
              completedAt: "2026-08-25T00:09:30.000Z",
            },
            current: {
              judgeId: "drift-judge",
              judgeVersion: "judge-1@1",
              judgeModelIdentity: modelIdentity("drift-judge-family", "drift-judge-family@1"),
              judgeExecutionId: "drift-current-execution-2",
              approved: false,
              completedAt: "2026-08-25T00:09:40.000Z",
            },
          },
        ],
        baselineJudgeVersion: "judge-1@baseline",
        currentJudgeVersion: "judge-1@1",
        comparisonFixtureDigest: canonicalDigest([
          { fixtureId: "judge-drift-fixture-1", inputDigest: DIGEST_A },
          { fixtureId: "judge-drift-fixture-2", inputDigest: DIGEST_B },
        ]),
        disagreementRate: 0,
        maximumAllowedDisagreementRate: 0.1,
        pass: true,
      },
    },
    ownerAdjudication: null,
    trustedOwnerAdjudicationRegistry: null,
    transferEvidence: null,
    ownerResponseEvidence: null,
    trustedOwnerResponseRegistry: null,
  };
  bundleValue.trustedModelExecutions = trustedModelExecutionRegistry(bundleValue);
  return bundleValue;
}

function transferBundle() {
  const bundleValue = personalBundle();
  const selected = bundleValue.batch.candidates.find(
    (candidate) => candidate.candidateId === bundleValue.selectedCandidateId,
  );
  const sealedVariants = [1, 2].map((number) => {
    const options = number === 1
      ? clone(selected.options)
      : [...clone(selected.options).slice(1), clone(selected.options)[0]];
    const variant = {
      transferVariantId: `transfer-variant-${number}`,
      sourceCandidateId: selected.candidateId,
      blueprintId: selected.blueprintId,
      blueprintVersionId: selected.blueprintVersionId,
      answerSpecificationId: selected.answerSpecificationId,
      sourceBindingDigest: selected.sourceBindingDigest,
      rightsBoundary: clone(selected.rightsBoundary),
      stem: `Transfer variant ${number}: ${selected.stem}`,
      options,
      expectedOptionId: selected.proposedCorrectOptionId,
      sealedAt: `2026-08-25T00:09:0${number}.000Z`,
      answerHiddenDuringEvaluation: true,
    };
    return {
      ...variant,
      visibleContentDigest: canonicalDigest({ stem: variant.stem, options: variant.options }),
      lineageDigest: canonicalDigest({
        sourceCandidateId: variant.sourceCandidateId,
        blueprintId: variant.blueprintId,
        blueprintVersionId: variant.blueprintVersionId,
        answerSpecificationId: variant.answerSpecificationId,
        sourceBindingDigest: variant.sourceBindingDigest,
        rightsBoundary: variant.rightsBoundary,
      }),
      sealedVariantDigest: canonicalDigest(variant),
    };
  });
  const evaluatorReceipts = [1, 2].map((number) => {
    const variant = sealedVariants[number - 1];
    const receipt = {
      receiptId: `transfer-evaluation-receipt-${number}`,
      evaluatorId: `transfer-evaluator-${number}`,
      evaluatorVersion: `transfer-evaluator-${number}@1`,
      evaluatorModelIdentity: modelIdentity(`transfer-evaluator-family-${number}`),
      evaluatorExecutionId: `transfer-evaluator-execution-${number}`,
      candidateId: bundleValue.selectedCandidateId,
      transferVariantId: variant.transferVariantId,
      visibleVariantDigest: variant.visibleContentDigest,
      sealedVariantDigest: variant.sealedVariantDigest,
      sealedAt: variant.sealedAt,
      evaluatedAt: `2026-08-25T00:10:0${number}.000Z`,
      selectedOptionId: selected.proposedCorrectOptionId,
      expectedOptionId: selected.proposedCorrectOptionId,
      correct: true,
      answerExposureBeforeEvaluation: false,
    };
    return {
      ...receipt,
      inputDigest: canonicalDigest({
        transferVariantId: variant.transferVariantId,
        visibleVariantDigest: variant.visibleContentDigest,
        stem: variant.stem,
        options: variant.options,
      }),
      outputDigest: canonicalDigest({ selectedOptionId: receipt.selectedOptionId }),
    };
  });
  const sealedVariantRegistryWithoutDigest = {
    registryVersion: "question_foundry.trusted_sealed_transfer_variant_registry.v1",
    source: "LOCAL_OWNER_SEALED_TRANSFER_VARIANT_EXPORT",
    exportId: "sealed-transfer-variant-export-1",
    exportVersionId: "sealed-transfer-variant-export-1@1",
    verifiedAt: "2026-08-25T00:09:30.000Z",
    remoteReadPerformed: false,
    variantsDigest: canonicalDigest(sealedVariants),
    variants: sealedVariants,
  };
  const sealedVariantRegistry = {
    ...sealedVariantRegistryWithoutDigest,
    exportContentDigest: canonicalDigest(sealedVariantRegistryWithoutDigest),
  };
  const transferWithoutDigest = {
    bundleId: "transfer-bundle-1",
    candidateId: bundleValue.selectedCandidateId,
    sealedBeforeEvaluation: true,
    sealedVariantRegistry,
    evaluatorReceipts,
    completedAt: evaluatorReceipts.at(-1).evaluatedAt,
  };
  bundleValue.transferEvidence = {
    ...transferWithoutDigest,
    evidenceDigest: canonicalDigest(transferWithoutDigest),
  };
  bundleValue.trustedModelExecutions = trustedModelExecutionRegistry(bundleValue);
  const ownerAdjudicationEvidence = {
    selectedCandidate: selected,
    trustedSources: bundleValue.trustedSources,
    trustedModelExecutions: bundleValue.trustedModelExecutions,
    blindSolverReviews: bundleValue.blindSolverReviews,
    judgeReviews: bundleValue.judgeReviews,
    similarityReferences: bundleValue.similarityReferences,
    similarityReview: bundleValue.similarityReview,
    metaAudits: bundleValue.metaAudits,
    transferEvidence: bundleValue.transferEvidence,
  };
  const adjudication = {
    adjudicationId: "owner-adjudication-1",
    adjudicatorId: "owner-1",
    adjudicatorVersion: "owner-1@1",
    adjudicatorRole: "OWNER",
    candidateId: bundleValue.selectedCandidateId,
    decision: "APPROVED",
    sourceAndRightsReviewed: true,
    ambiguityReviewed: true,
    calculationReviewed: true,
    evidenceDigest: canonicalDigest(ownerAdjudicationEvidence),
    decidedAt: "2026-08-25T00:11:00.000Z",
    source: "OWNER_ADJUDICATION_RECEIPT",
    modelAlone: false,
  };
  const registryWithoutDigest = {
    registryVersion: "question_foundry.trusted_owner_adjudication_registry.v1",
    source: "LOCAL_OWNER_ADJUDICATION_EXPORT",
    exportId: "owner-adjudication-export-1",
    exportVersionId: "owner-adjudication-export-1@1",
    verifiedAt: "2026-08-25T00:11:30.000Z",
    remoteReadPerformed: false,
    receiptsDigest: canonicalDigest([adjudication]),
    receipts: [adjudication],
  };
  bundleValue.ownerAdjudication = adjudication;
  bundleValue.trustedOwnerAdjudicationRegistry = {
    ...registryWithoutDigest,
    exportContentDigest: canonicalDigest(registryWithoutDigest),
  };
  return bundleValue;
}

function resealTransferVariant(bundleValue, variantIndex) {
  const transfer = bundleValue.transferEvidence;
  const registry = transfer.sealedVariantRegistry;
  const variant = registry.variants[variantIndex];
  variant.visibleContentDigest = canonicalDigest({ stem: variant.stem, options: variant.options });
  variant.lineageDigest = canonicalDigest({
    sourceCandidateId: variant.sourceCandidateId,
    blueprintId: variant.blueprintId,
    blueprintVersionId: variant.blueprintVersionId,
    answerSpecificationId: variant.answerSpecificationId,
    sourceBindingDigest: variant.sourceBindingDigest,
    rightsBoundary: variant.rightsBoundary,
  });
  variant.sealedVariantDigest = canonicalDigest({
    transferVariantId: variant.transferVariantId,
    sourceCandidateId: variant.sourceCandidateId,
    blueprintId: variant.blueprintId,
    blueprintVersionId: variant.blueprintVersionId,
    answerSpecificationId: variant.answerSpecificationId,
    sourceBindingDigest: variant.sourceBindingDigest,
    rightsBoundary: variant.rightsBoundary,
    stem: variant.stem,
    options: variant.options,
    expectedOptionId: variant.expectedOptionId,
    sealedAt: variant.sealedAt,
    answerHiddenDuringEvaluation: variant.answerHiddenDuringEvaluation,
  });
  registry.variantsDigest = canonicalDigest(registry.variants);
  registry.exportContentDigest = canonicalDigest({
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    variantsDigest: registry.variantsDigest,
    variants: registry.variants,
  });
  const receipt = transfer.evaluatorReceipts.find(
    (entry) => entry.transferVariantId === variant.transferVariantId,
  );
  receipt.visibleVariantDigest = variant.visibleContentDigest;
  receipt.sealedVariantDigest = variant.sealedVariantDigest;
  receipt.inputDigest = canonicalDigest({
    transferVariantId: variant.transferVariantId,
    visibleVariantDigest: variant.visibleContentDigest,
    stem: variant.stem,
    options: variant.options,
  });
  transfer.evidenceDigest = canonicalDigest({
    bundleId: transfer.bundleId,
    candidateId: transfer.candidateId,
    sealedBeforeEvaluation: transfer.sealedBeforeEvaluation,
    sealedVariantRegistry: registry,
    evaluatorReceipts: transfer.evaluatorReceipts,
    completedAt: transfer.completedAt,
  });
  return variant;
}

function transferTrustContext(bundleValue) {
  const registry = bundleValue.trustedOwnerAdjudicationRegistry;
  const sealedRegistry = bundleValue.transferEvidence.sealedVariantRegistry;
  const registryDigest = canonicalDigest(registry);
  const trustContext = {
    sourceRegistryExportBinding: sourceRegistryExportBinding(bundleValue),
    modelExecutionExportBinding: modelExecutionExportBinding(bundleValue),
    sealedVariantExportBinding: {
      bindingVersion: "question_foundry.trusted_sealed_transfer_variant_export_binding.v1",
      exportId: sealedRegistry.exportId,
      exportVersionId: sealedRegistry.exportVersionId,
      exportContentDigest: sealedRegistry.exportContentDigest,
      registryDigest: canonicalDigest(sealedRegistry),
      validatorId: "trusted_sealed_transfer_variant_export_validator",
      authorityKeyId: "question-foundry-owner-adjudication-authority-2026-08-27",
      signatureAlgorithm: "Ed25519",
      detachedSignature: SEALED_VARIANT_SIGNATURES[canonicalDigest(sealedRegistry)] ?? "AA==",
      actualSealedVariantRegistryRead: true,
      syntheticOrSimulated: false,
      verified: true,
    },
    ownerAdjudicationExportBinding: {
      bindingVersion: "question_foundry.trusted_owner_adjudication_export_binding.v1",
      exportId: registry.exportId,
      exportVersionId: registry.exportVersionId,
      exportContentDigest: registry.exportContentDigest,
      registryDigest,
      validatorId: "trusted_owner_adjudication_export_validator",
      authorityKeyId: "question-foundry-owner-adjudication-authority-2026-08-27",
      signatureAlgorithm: "Ed25519",
      detachedSignature: OWNER_ADJUDICATION_SIGNATURES[registryDigest] ?? "AA==",
      actualOwnerIdentityRead: true,
      syntheticOrSimulated: false,
      verified: true,
    },
    ownerResponseExportBinding: null,
  };
  return trustContext;
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
    ...transferTrustContext(bundleValue),
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
  assert.equal(
    contract.parallelExecutionBinding.branch,
    "codex/owner-study-question-foundry-r4",
  );
  assert.equal(
    contract.rightsAndSourceBoundary.similarityTokenJaccardThresholdExactly,
    QUESTION_FOUNDRY_SIMILARITY_THRESHOLD,
  );
  assert.equal(contract.rightsAndSourceBoundary.callerMayOverrideSimilarityThreshold, false);
  assert.equal(contract.rightsAndSourceBoundary.similarityNumericLexerSharesCalculationGrammar, true);
  assert.deepEqual(
    contract.rightsAndSourceBoundary.nearCopyFailureTransformationsExactly,
    QUESTION_FOUNDRY_NEAR_COPY_FAILURE_TRANSFORMATIONS,
  );
  assert.equal(
    contract.metaAudits
      .everyMetaEvaluatorAndDriftOutcomeMustBeDisjointFromGeneratorsAcrossActorFamilyProviderVersionAndArtifact,
    true,
  );
  assert.equal(contract.parallelExecutionBinding.mergeAuthorizedNow, true);
  assert.equal(contract.parallelExecutionBinding.sharedBaseSha, "fd8d0039bbeb2981935fdb671094e37d73a34400");
  assert.equal(contract.parallelExecutionBinding.sharedBaseTree, "1d338b7be92cfc98c00611b4ff3f2b75dea1784d");
  assert.equal(contract.validatedIntegrationReceipts.studyCapacityRuntimeBridge.pullRequest, 845);
  assert.equal(
    contract.validatedIntegrationReceipts.firstStageKernelAndFrozenSubjectAdapter.subjectAdapterInterfaceDigest,
    QUESTION_FOUNDRY_SUBJECT_ADAPTER_INTERFACE_DIGEST,
  );
  assert.deepEqual(QUESTION_FOUNDRY_SUBJECTS, [
    "civil_law",
    "economics_principles",
    "real_estate_principles",
    "appraiser_related_law",
    "accounting",
  ]);
  assert.deepEqual(contract.ownedPathsExactly, [
    "config/dabangil-question-foundry-v1.json",
    "docs/exec-plans/active/inverge-owner-study-os.md",
    "lib/question-foundry/audit-run.ts",
    "lib/question-foundry/contracts.ts",
    "lib/question-foundry/generation.ts",
    "lib/question-foundry/index.ts",
    "lib/question-foundry/release-policy.ts",
    "lib/question-foundry/validation.ts",
    "scripts/offline/question-foundry-v1.mjs",
    "scripts/run-node-tests.mjs",
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
  assert.equal(validateBlueprintWithAuthority(blueprintValue, sourceRegistry()).valid, true);
  assert.equal(validateAnswerWithAuthority(specification, blueprintValue, sourceRegistry()).valid, true);

  const openBlueprint = { ...blueprintValue, privatePrompt: "not allowed" };
  assert.equal(validateBlueprintWithAuthority(openBlueprint, sourceRegistry()).valid, false);
  const privateBlueprint = clone(blueprintValue);
  privateBlueprint.sourceBindings[0].sourceClass = "USER_PRIVATE_ONLY";
  privateBlueprint.rightsBoundary.privateUploadUsed = true;
  const privateResult = validateBlueprintWithAuthority(privateBlueprint, sourceRegistry());
  assert.equal(privateResult.valid, false);
  assert.ok(privateResult.errors.some((error) => error.includes("SHARED_USE_DENIED")));

  const lateSolution = { ...specification, createdAt: "2026-08-24T23:59:00.000Z" };
  assert.equal(validateAnswerWithAuthority(lateSolution, blueprintValue, sourceRegistry()).valid, false);
  assert.equal(
    validateAnswerWithAuthority(
      { ...specification, solutionFirst: false },
      blueprintValue,
      sourceRegistry(),
    ).valid,
    false,
  );
  assert.equal(validateBlueprintWithAuthority(null, sourceRegistry()).valid, false);
  assert.doesNotThrow(() => validateAnswerSpecification(null, null, null));
});

test("trusted rights resolve before blueprint approval or any candidate generator callback", () => {
  const blueprintValue = blueprint();
  const specification = answerSpecification(blueprintValue);
  const hostileRegistries = [
    ["missing registry", null],
    [
      "caller-forged internally consistent rights export",
      (() => {
        const registry = sourceRegistry();
        registry.rightsManifests[0].rightsHolder = "Caller-forged rights authority";
        return refreshSourceRegistryExport(registry);
      })(),
    ],
    ["missing manifest", sourceRegistry({ rightsManifests: [] })],
    ["release manifest cannot cure missing pre-blueprint decisions", sourceRegistry({ eligibilityDecisions: [] })],
    [
      "ambiguous eligibility decision",
      (() => {
        const registry = sourceRegistry();
        registry.eligibilityDecisions.push(clone(registry.eligibilityDecisions[0]));
        return registry;
      })(),
    ],
    [
      "stale decision basis",
      (() => {
        const registry = sourceRegistry();
        registry.eligibilityDecisions[0].decisionBasisChecksum = DIGEST_B;
        return registry;
      })(),
    ],
    [
      "decision evaluated after blueprint",
      (() => {
        const registry = sourceRegistry();
        registry.eligibilityDecisions[0].rightsEvaluatedAt = T1;
        return registry;
      })(),
    ],
    [
      "generation purpose decision missing",
      (() => {
        const registry = sourceRegistry();
        registry.eligibilityDecisions = registry.eligibilityDecisions.filter(
          (decision) =>
            decision.sourceId !== blueprintValue.sourceBindings[0].sourceId ||
            decision.purpose !== "QUESTION_GENERATION_CONTEXT",
        );
        return registry;
      })(),
    ],
    [
      "ambiguous manifest",
      sourceRegistry({ rightsManifests: [rightsManifest(), rightsManifest()] }),
    ],
    [
      "revoked manifest",
      sourceRegistry({ rightsManifests: [rightsManifest({ status: "REVOKED" })] }),
    ],
    [
      "expired manifest",
      sourceRegistry({
        rightsManifests: [
          rightsManifest({ validUntil: "2026-08-24T23:59:59.000Z" }),
        ],
      }),
    ],
    [
      "trusted binding mismatch",
      sourceRegistry({
        sourceVersions: [
          sourceBinding({ contentDigest: DIGEST_B }),
          similaritySourceBinding(),
        ],
      }),
    ],
    [
      "private source relabeled as cleared",
      sourceRegistry({
        rightsManifests: [rightsManifest({ sourceClass: "USER_PRIVATE_ONLY" })],
        sourceVersions: [
          sourceBinding({ sourceClass: "USER_PRIVATE_ONLY" }),
          similaritySourceBinding(),
        ],
      }),
    ],
    [
      "academy source relabeled as original",
      sourceRegistry({
        rightsManifests: [
          rightsManifest({ sourceClass: "ACADEMY_OR_COMMERCIAL_TEXTBOOK" }),
        ],
        sourceVersions: [
          sourceBinding({ sourceClass: "ACADEMY_OR_COMMERCIAL_TEXTBOOK" }),
          similaritySourceBinding(),
        ],
      }),
    ],
  ];

  for (const [name, trustedSources] of hostileRegistries) {
    const validation = trustedSources === null
      ? validateQuestionBlueprint(blueprintValue, null, null)
      : validateBlueprintWithAuthority(blueprintValue, trustedSources);
    assert.equal(validation.valid, false, name);
    let generatorCalls = 0;
    assert.throws(
      () =>
        generateCandidateBatch({
          batchId: `batch:${String(name).replaceAll(" ", "-")}`,
          blueprint: blueprintValue,
          answerSpecification: specification,
          candidateCount: 2,
          generatorId: "generator-1",
          generatorVersion: "generator-1@1",
          generatorModelIdentity: modelIdentity("generator-family"),
          generatorExecutionIds: ["hostile-generator-execution-1", "hostile-generator-execution-2"],
          generationRunId: `generation:${String(name).replaceAll(" ", "-")}`,
          generatedAt: T2,
          trustedSources,
          sourceRegistryExportBinding:
            trustedSources === null ? null : sourceRegistryExportBinding(trustedSources),
          generator: (input) => {
            generatorCalls += 1;
            return candidateGenerator(input);
          },
        }),
      /invalid-question-blueprint/,
      name,
    );
    assert.equal(generatorCalls, 0, name);
  }
});

test("offline solution-first generation creates multiple quarantined candidates and two order permutations", () => {
  const candidateBatch = batch();
  const result = validateBatchWithAuthority(candidateBatch, sourceRegistry());
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
        generatorModelIdentity: modelIdentity("generator-family"),
        generatorExecutionIds: ["bad-generator-execution-1"],
        generationRunId: "generation-run-bad",
        generatedAt: T2,
        trustedSources: sourceRegistry(),
        sourceRegistryExportBinding: sourceRegistryExportBinding(sourceRegistry()),
        generator: candidateGenerator,
      }),
    /candidate-count/,
  );
});

test("candidate and option permutation records are closed, unique, and exactly candidate-scoped", () => {
  const valid = batch();
  for (const [name, mutate] of [
    ["candidate private body", (value) => {
      value.candidateOrderPermutations[0].rawPrivateBody = "must not enter evidence";
    }],
    ["option academy body", (value) => {
      value.optionOrderPermutations[0].academyTextbookBody = "must not enter evidence";
    }],
    ["duplicate candidate permutation id", (value) => {
      value.candidateOrderPermutations[1].permutationId =
        value.candidateOrderPermutations[0].permutationId;
    }],
    ["duplicate cross-kind permutation id", (value) => {
      value.optionOrderPermutations[0].permutationId =
        value.candidateOrderPermutations[0].permutationId;
    }],
    ["orphan option permutation", (value) => {
      value.optionOrderPermutations[0].candidateId = "candidate-not-in-batch";
    }],
  ]) {
    const hostile = clone(valid);
    mutate(hostile);
    assert.equal(
      validateBatchWithAuthority(hostile, sourceRegistry()).valid,
      false,
      name,
    );
  }
});

test("trusted current source and deterministic calculation validators fail closed", () => {
  const candidateBatch = batch();
  const selected = candidateBatch.candidates[0];
  assert.equal(
    validateBindingsWithAuthority(candidateBatch.blueprint.sourceBindings, sourceRegistry()).valid,
    true,
  );
  assert.equal(
    validateCandidateCalculation(selected, candidateBatch.answerSpecification).valid,
    true,
  );

  const expired = sourceRegistry({ asOf: "2028-01-01T00:00:00.000Z" });
  assert.equal(
    validateBindingsWithAuthority(candidateBatch.blueprint.sourceBindings, expired).valid,
    false,
  );
  const duplicateRegistry = sourceRegistry({
    sourceVersions: [sourceBinding(), sourceBinding()],
  });
  assert.equal(
    validateBindingsWithAuthority(candidateBatch.blueprint.sourceBindings, duplicateRegistry).valid,
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
    operands: ["-3", "2"],
    result: "-2",
    unit: "POINTS",
    rounding: { mode: "HALF_UP", scale: 0 },
    tolerance: 0,
  };
  assert.equal(validateCalculationSpecification(negativeHalfTie).valid, true);
  assert.equal(
    validateCalculationSpecification({ ...negativeHalfTie, result: "-1" }).valid,
    false,
  );

  for (const [tolerance, errorCode] of [
    [1, "calculation.tolerance:MUST_BE_ZERO"],
    [-1, "calculation.tolerance:MUST_BE_ZERO"],
    [-0, "calculation.tolerance:MUST_BE_ZERO"],
    [Number.NaN, "calculation.tolerance:INVALID"],
    [Number.POSITIVE_INFINITY, "calculation.tolerance:INVALID"],
  ]) {
    const validation = validateCalculationSpecification({
      operation: "ADD",
      operands: ["40", "2"],
      result: "21",
      unit: "POINTS",
      rounding: { mode: "NONE", scale: 0 },
      tolerance,
    });
    assert.equal(validation.valid, false);
    assert.ok(validation.errors.includes(errorCode), String(tolerance));
  }
  assert.ok(
    validateCalculationSpecification({
      operation: "ADD",
      operands: ["40", "2"],
      result: "21",
      unit: "POINTS",
      rounding: { mode: "NONE", scale: 0 },
      tolerance: 0,
    }).errors.includes("calculation:RESULT_MISMATCH"),
  );

  const decimalHalfTie = {
    operation: "DIVIDE",
    operands: ["2015", "200"],
    result: "10.08",
    unit: "POINTS",
    rounding: { mode: "HALF_UP", scale: 2 },
    tolerance: 0,
  };
  assert.equal(calculateDeterministically(decimalHalfTie), 10.08);
  assert.equal(validateCalculationSpecification(decimalHalfTie).valid, true);
  assert.ok(
    validateCalculationSpecification({ ...decimalHalfTie, result: "10.07" }).errors.includes(
      "calculation:RESULT_MISMATCH",
    ),
  );
  const negativeDecimalHalfTie = {
    ...decimalHalfTie,
    operands: ["-2015", "200"],
    result: "-10.08",
  };
  assert.equal(calculateDeterministically(negativeDecimalHalfTie), -10.08);
  assert.equal(validateCalculationSpecification(negativeDecimalHalfTie).valid, true);
  assert.ok(
    validateCalculationSpecification({ ...negativeDecimalHalfTie, result: "-10.07" }).errors.includes(
      "calculation:RESULT_MISMATCH",
    ),
  );
  for (const [operands, expected, expectedNumber] of [
    [["20149", "2000"], "10.07", 10.07],
    [["20151", "2000"], "10.08", 10.08],
    [["1999", "200"], "10", 10],
  ]) {
    const calculation = { ...decimalHalfTie, operands, result: expected };
    assert.equal(calculateDeterministically(calculation), expectedNumber);
    assert.equal(validateCalculationSpecification(calculation).valid, true);
  }
  assert.equal(
    validateCalculationSpecification({
      operation: "ADD",
      operands: ["0.1", "0.2"],
      result: "0.3",
      unit: "POINTS",
      rounding: { mode: "NONE", scale: 0 },
      tolerance: 0,
    }).valid,
    true,
  );
  assert.ok(
    validateCalculationSpecification({
      operation: "DIVIDE",
      operands: ["1", "3"],
      result: "0.3333333333333333",
      unit: "POINTS",
      rounding: { mode: "NONE", scale: 0 },
      tolerance: 0,
    }).errors.includes("calculation:NON_TERMINATING_RESULT_REQUIRES_ROUNDING"),
  );
  const exactSourceDecimal = {
    operation: "ADD",
    operands: ["0.10000000000000001", "0"],
    result: "0.10000000000000001",
    unit: "POINTS",
    rounding: { mode: "NONE", scale: 0 },
    tolerance: 0,
  };
  assert.equal(validateCalculationSpecification(exactSourceDecimal).valid, true);
  assert.ok(
    validateCalculationSpecification({ ...exactSourceDecimal, result: "0.1" }).errors.includes(
      "calculation:RESULT_MISMATCH",
    ),
  );
  const beyondSafeInteger = {
    ...exactSourceDecimal,
    operands: ["9007199254740993", "0"],
    result: "9007199254740993",
  };
  assert.equal(validateCalculationSpecification(beyondSafeInteger).valid, true);
  assert.equal(calculateDeterministically(beyondSafeInteger), null);
  const lossyNumericProjection = {
    ...exactSourceDecimal,
    operation: "MULTIPLY",
    operands: ["0.1234567890123456789012345", "0.1"],
    result: "0.01234567890123456789012345",
  };
  assert.equal(validateCalculationSpecification(lossyNumericProjection).valid, true);
  assert.equal(calculateDeterministically(lossyNumericProjection), null);
  for (const invalidDecimal of ["01", "1.0", "-0", "1e3", 0.1]) {
    const invalid = validateCalculationSpecification({
      ...exactSourceDecimal,
      operands: [invalidDecimal, "0"],
    });
    assert.equal(invalid.valid, false, String(invalidDecimal));
    assert.ok(invalid.errors.includes("calculation.operands:INVALID"), String(invalidDecimal));
  }
  for (const invalidScale of [Number.MAX_SAFE_INTEGER, 1.5, -1, "8", null]) {
    const hostileScale = {
      ...exactSourceDecimal,
      rounding: { mode: "HALF_UP", scale: invalidScale },
    };
    assert.doesNotThrow(() => calculateDeterministically(hostileScale), String(invalidScale));
    assert.equal(calculateDeterministically(hostileScale), null, String(invalidScale));
  }

  const exactCandidate = clone(selected);
  const exactCorrect = exactCandidate.options.find(
    (option) => option.optionId === exactCandidate.proposedCorrectOptionId,
  );
  exactCorrect.body = "10.08 points";
  const exactSpecification = {
    ...candidateBatch.answerSpecification,
    calculation: decimalHalfTie,
  };
  assert.equal(validateCandidateCalculation(exactCandidate, exactSpecification).valid, true);
  const groupingCandidate = clone(exactCandidate);
  const groupingCorrect = groupingCandidate.options.find(
    (option) => option.optionId === groupingCandidate.proposedCorrectOptionId,
  );
  const onePointSpecification = {
    ...candidateBatch.answerSpecification,
    calculation: {
      operation: "ADD",
      operands: ["1", "0"],
      result: "1",
      unit: "POINTS",
      rounding: { mode: "NONE", scale: 0 },
      tolerance: 0,
    },
  };
  for (const malformedGrouping of ["0,001 points", "00,001 points", "000,001 points"]) {
    groupingCorrect.body = malformedGrouping;
    assert.ok(
      validateCandidateCalculation(groupingCandidate, onePointSpecification).errors.includes(
        "candidateCalculation:OPTION_NUMERIC_TOKEN_INVALID",
      ),
      malformedGrouping,
    );
  }
  groupingCorrect.body = "1,001 points";
  const oneThousandOnePointSpecification = {
    ...onePointSpecification,
    calculation: {
      ...onePointSpecification.calculation,
      operands: ["1001", "0"],
      result: "1001",
    },
  };
  assert.equal(
    validateCandidateCalculation(groupingCandidate, oneThousandOnePointSpecification).valid,
    true,
  );
  exactCorrect.body = "1.008e1 POINTS";
  assert.equal(validateCandidateCalculation(exactCandidate, exactSpecification).valid, true);
  for (const hostileBody of [
    ".5 points",
    "10.08e points",
    "10.08 or 99 points",
    "1,0.08 points",
    "10,.08 wrong-units",
    "prefix10.08suffix points",
    "10.08.99 points",
    "10.08 meters",
  ]) {
    exactCorrect.body = hostileBody;
    assert.equal(validateCandidateCalculation(exactCandidate, exactSpecification).valid, false, hostileBody);
  }
  exactCorrect.body = "10.08 points";
  const extremeExponentOption = exactCandidate.options.find(
    (option) => option.optionId !== exactCandidate.proposedCorrectOptionId,
  );
  extremeExponentOption.body = "1e9007199254740991 points";
  const extremeExponentValidation = validateCandidateCalculation(exactCandidate, exactSpecification);
  assert.equal(extremeExponentValidation.valid, false);
  assert.ok(
    extremeExponentValidation.errors.includes("candidateCalculation:OPTION_NUMERIC_TOKEN_INVALID"),
  );
  extremeExponentOption.body = `${"9".repeat(65)} points`;
  assert.ok(
    validateCandidateCalculation(exactCandidate, exactSpecification).errors.includes(
      "candidateCalculation:OPTION_NUMERIC_TOKEN_INVALID",
    ),
  );
  extremeExponentOption.body = "10.080 points";
  assert.ok(
    validateCandidateCalculation(exactCandidate, exactSpecification).errors.includes(
      "candidateCalculation:MULTIPLE_OR_ZERO_NUMERIC_ANSWERS",
    ),
  );
});

test("rights-safe similarity firewall detects near-copy, reconstruction and denied comparison corpora", () => {
  const numericScanner = new RegExp(
    `${QUESTION_FOUNDRY_CALCULATION_NUMERIC_TOKEN_SOURCE}|\\p{L}+`,
    "gu",
  );
  assert.deepEqual(
    "18,000 18.50e+2 .75 -0.25E-2 words".match(numericScanner),
    ["18,000", "18.50e+2", ".75", "-0.25E-2", "words"],
  );
  const candidateBatch = batch();
  const selected = candidateBatch.candidates[0];
  const safe = similarityReviewWithAuthority(selected, [similarityReference()], sourceRegistry());
  assert.equal(safe.nearCopyDetected, false);
  assert.equal(safe.reconstructionRiskDetected, false);

  const copiedBody = `${selected.stem}\n${selected.options.map((option) => option.body).join("\n")}`;
  const copiedRegistry = sourceRegistry({
    sourceVersions: [
      sourceBinding(),
      similaritySourceBinding({ contentDigest: canonicalDigest(copiedBody) }),
    ],
  });
  const copied = similarityReviewWithAuthority(
    selected,
    [similarityReference({ body: copiedBody })],
    copiedRegistry,
  );
  assert.equal(copied.nearCopyDetected, true);
  const highOverlapBody = `${copiedBody}\nadditionalword`;
  const highOverlapReference = similarityReference({ body: highOverlapBody });
  assert.throws(
    () => similarityReviewWithAuthority(
      selected,
      [highOverlapReference],
      sourceRegistry(),
      0.999999,
    ),
    /similarity-threshold-policy-mismatch/,
  );

  const permissiveThresholdBundle = clone(personalBundle());
  permissiveThresholdBundle.similarityReview.threshold = 0.999999;
  const permissiveThresholdDecision = evaluateQuestionRelease(
    permissiveThresholdBundle,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(permissiveThresholdBundle),
  );
  assert.equal(permissiveThresholdDecision.allowed, false);
  assert.ok(
    permissiveThresholdDecision.blockingCodes.includes("SIMILARITY_THRESHOLD_POLICY_MISMATCH"),
  );

  const transformCandidate = (kind) => {
    const transformed = clone(selected);
    if (kind === "NUMBER_ONLY") {
      transformed.stem = transformed.stem.replace(/\d+/gu, (value) => String(Number(value) + 100));
      transformed.options = transformed.options.map((option) => ({
        ...option,
        body: option.body.replace(/\d+/gu, (value) => String(Number(value) + 100)),
      }));
    } else if (kind === "NUMBER_ONLY_GROUPED") {
      transformed.options = transformed.options.map((option) => ({
        ...option,
        body: option.body.replace(/\d+/gu, (value) => `${value},000`),
      }));
    } else if (kind === "NUMBER_ONLY_EXPONENT") {
      transformed.options = transformed.options.map((option) => ({
        ...option,
        body: option.body.replace(/\d+/gu, (value) => `${value}e1`),
      }));
    } else if (kind === "NAME_ONLY") {
      transformed.stem = transformed.stem.replace(/template/gu, "scenario");
    } else if (kind === "NAME_ONLY_MULTI_TOKEN") {
      transformed.stem = transformed.stem.replace(/template/gu, "reference scenario");
    } else if (kind === "ORDER_ONLY") {
      transformed.stem = transformed.stem.split(" ").toReversed().join(" ");
    } else if (kind === "WORD_ONLY") {
      transformed.stem = transformed.stem.replace(/\p{L}+/gu, "term");
      transformed.options = transformed.options.map((option) => ({
        ...option,
        body: option.body.replace(/\p{L}+/gu, "term"),
      }));
    } else if (kind === "WORD_ONLY_MULTI_TOKEN") {
      transformed.stem = transformed.stem.replace(/\p{L}+/gu, "term phrase");
      transformed.options = transformed.options.map((option) => ({
        ...option,
        body: option.body.replace(/\p{L}+/gu, "term phrase"),
      }));
    } else {
      throw new Error(`unknown test transformation: ${kind}`);
    }
    return transformed;
  };

  for (const transformation of [
    "NUMBER_ONLY",
    "NUMBER_ONLY_GROUPED",
    "NUMBER_ONLY_EXPONENT",
    "NAME_ONLY",
    "NAME_ONLY_MULTI_TOKEN",
    "ORDER_ONLY",
    "WORD_ONLY",
    "WORD_ONLY_MULTI_TOKEN",
  ]) {
    const transformed = transformCandidate(transformation);
    const transformedReview = similarityReviewWithAuthority(
      transformed,
      [similarityReference({ body: copiedBody })],
      copiedRegistry,
    );
    assert.equal(transformedReview.nearCopyDetected, true, transformation);

    const transformedBundle = clone(personalBundle());
    transformedBundle.batch.candidates[0] = transformed;
    transformedBundle.trustedSources = clone(copiedRegistry);
    transformedBundle.similarityReferences = [similarityReference({ body: copiedBody })];
    transformedBundle.similarityReview = transformedReview;
    const transformedDecision = evaluateQuestionRelease(
      transformedBundle,
      "PERSONAL_LEARNING_USABLE",
      personalTrustContext(transformedBundle),
    );
    assert.equal(transformedDecision.allowed, false, transformation);
    assert.ok(
      transformedDecision.blockingCodes.includes(
        "SIMILARITY_OR_RECONSTRUCTION_FIREWALL_BLOCKED",
      ),
      transformation,
    );
  }
  const privateCorpus = similarityReviewWithAuthority(
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
    sourceRegistry({
      eligibilityDecisions: sourceRegistry().eligibilityDecisions.filter(
        (decision) =>
          !(
            decision.sourceVersionId === "source:deterministic:similarity@1" &&
            decision.purpose === "QUESTION_GENERATION_CONTEXT"
          ),
      ),
    }),
    sourceRegistry({
      eligibilityDecisions: sourceRegistry().eligibilityDecisions.map((decision) =>
        decision.sourceVersionId === "source:deterministic:similarity@1" &&
        decision.purpose === "QUESTION_GENERATION_CONTEXT"
          ? { ...decision, decision: "DENY_ALL_SHARED_ROUTES", denialCodes: ["RIGHTS_DENIED"] }
          : decision),
    }),
    sourceRegistry({
      eligibilityDecisions: sourceRegistry().eligibilityDecisions.map((decision) =>
        decision.sourceVersionId === "source:deterministic:similarity@1" &&
        decision.purpose === "QUESTION_GENERATION_CONTEXT"
          ? { ...decision, decisionBasisChecksum: DIGEST_B }
          : decision),
    }),
  ]) {
    assert.throws(
      () => similarityReviewWithAuthority(selected, [similarityReference()], registry),
      /invalid-source-registry-authority/,
    );
  }

  const changedBody = similarityReference({ body: "A different cleared comparison body." });
  const changedReview = similarityReviewWithAuthority(selected, [changedBody], sourceRegistry());
  assert.notEqual(changedReview.corpusDigest, safe.corpusDigest);

  const relabeledAcademyBody = similarityReference({
    body: "A private academy explanation relabeled as if it were cleared source material.",
  });
  const relabelReview = similarityReviewWithAuthority(
    selected,
    [relabeledAcademyBody],
    sourceRegistry(),
  );
  assert.equal(relabelReview.reconstructionRiskDetected, true);

  const staleReviewBundle = personalBundle();
  staleReviewBundle.similarityReferences[0].body = "The exact corpus body changed after review.";
  assert.ok(
    evaluateQuestionRelease(
      staleReviewBundle,
      "PERSONAL_LEARNING_USABLE",
      personalTrustContext(staleReviewBundle),
    ).blockingCodes.includes(
      "SIMILARITY_REVIEW_NOT_BOUND_TO_EXACT_CORPUS",
    ),
  );
});

test("AI-only release is capped at PERSONAL_LEARNING_USABLE and no generator can approve itself", () => {
  const bundleValue = personalBundle();
  const personal = evaluateQuestionRelease(
    bundleValue,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(bundleValue),
  );
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

  for (const [name, mutate] of [
    ["generator-judge-model", (value) => {
      value.judgeReviews[0].judgeModelIdentity = clone(value.batch.candidates[0].generatorModelIdentity);
    }],
    ["generator-solver-model", (value) => {
      value.blindSolverReviews[0].solverModelIdentity = clone(value.batch.candidates[0].generatorModelIdentity);
    }],
    ["generator-solver-actor", (value) => {
      value.blindSolverReviews[0].solverId = value.batch.candidates[0].generatorId;
    }],
    ["generator-solver-provider-version-alias", (value) => {
      const generatorIdentity = value.batch.candidates[0].generatorModelIdentity;
      value.blindSolverReviews[0].solverModelIdentity = {
        ...value.blindSolverReviews[0].solverModelIdentity,
        providerId: generatorIdentity.providerId,
        modelVersionId: generatorIdentity.modelVersionId,
      };
    }],
    ["generator-solver-artifact-alias", (value) => {
      value.blindSolverReviews[0].solverModelIdentity.modelArtifactDigest =
        value.batch.candidates[0].generatorModelIdentity.modelArtifactDigest;
    }],
    ["judge-solver-model", (value) => {
      value.judgeReviews[0].judgeModelIdentity = clone(value.blindSolverReviews[0].solverModelIdentity);
    }],
    ["solver-alias-version-bypass", (value) => {
      value.blindSolverReviews[1].solverModelIdentity = modelIdentity(
        value.blindSolverReviews[0].solverModelIdentity.modelFamilyId,
        "same-family@different-version",
      );
    }],
    ["open-model-identity", (value) => {
      value.judgeReviews[0].judgeModelIdentity.deploymentAlias = "alias-cannot-establish-independence";
    }],
    ["missing-model-identity", (value) => {
      delete value.blindSolverReviews[0].solverModelIdentity;
    }],
  ]) {
    const hostile = personalBundle();
    mutate(hostile);
    const hostileDecision = evaluateQuestionRelease(hostile, "PERSONAL_LEARNING_USABLE");
    assert.equal(hostileDecision.allowed, false, name);
    assert.ok(
      hostileDecision.blockingCodes.some(
        (code) => code.includes("separation") || code.includes("TRUSTED_MODEL_EXECUTION"),
      ),
      name,
    );
  }

  const transferWithoutHuman = evaluateQuestionRelease(
    bundleValue,
    "TRANSFER_VERIFIED",
    personalTrustContext(bundleValue),
  );
  assert.equal(transferWithoutHuman.allowed, false);
  assert.ok(
    transferWithoutHuman.blockingCodes.includes("OWNER_ADJUDICATION_REQUIRED_ABOVE_PERSONAL_TIER"),
  );
});

test("requested release tier is rejected before any bundle access", () => {
  const poisonBundle = new Proxy({}, {
    get() {
      throw new Error("BUNDLE_MUST_NOT_BE_READ");
    },
  });
  for (const invalidTier of [
    "personal_learning_usable",
    " PERSONAL_LEARNING_USABLE",
    "QUARANTINED",
    "DISPUTED",
    "RETIRED",
    null,
    1,
    {},
  ]) {
    assert.throws(
      () => evaluateQuestionRelease(poisonBundle, invalidTier),
      /INVALID_REQUESTED_RELEASE_TIER/,
    );
  }
});

test("rights authority signature and recomputed decision basis defeat caller-forged registries", () => {
  const valid = personalBundle();
  const validTrust = personalTrustContext(valid);
  assert.equal(
    evaluateQuestionRelease(valid, "PERSONAL_LEARNING_USABLE", validTrust).allowed,
    true,
  );

  const noAuthority = clone(validTrust);
  noAuthority.sourceRegistryExportBinding = null;
  const noAuthorityDecision = evaluateQuestionRelease(
    valid,
    "PERSONAL_LEARNING_USABLE",
    noAuthority,
  );
  assert.equal(noAuthorityDecision.allowed, false);
  assert.ok(
    noAuthorityDecision.blockingCodes.includes("TRUSTED_SOURCE_REGISTRY_EXPORT_BINDING_REQUIRED"),
  );

  const forged = personalBundle();
  forged.trustedSources.rightsManifests[0].rightsHolder = "Caller-forged authority";
  refreshSourceRegistryExport(forged.trustedSources);
  const forgedDecision = evaluateQuestionRelease(
    forged,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(forged),
  );
  assert.equal(forgedDecision.allowed, false);
  assert.ok(
    forgedDecision.blockingCodes.includes("TRUSTED_SOURCE_REGISTRY_EXPORT_BINDING_REQUIRED"),
  );

  const staleBasis = sourceRegistry();
  staleBasis.eligibilityDecisions[0].policyVersion = "caller-forged-policy@2";
  refreshSourceRegistryExport(staleBasis);
  const basisValidation = validateBindingsWithAuthority(
    blueprint().sourceBindings,
    staleBasis,
  );
  assert.equal(basisValidation.valid, false);
  assert.ok(
    basisValidation.errors.some((error) =>
      error.startsWith("sourceRegistry:DECISION_BASIS_CHECKSUM_INVALID:")),
  );
});

test("trusted model execution export defeats family, artifact and provider-version aliases", () => {
  const valid = personalBundle();
  assert.equal(
    evaluateQuestionRelease(
      valid,
      "PERSONAL_LEARNING_USABLE",
      personalTrustContext(valid),
    ).allowed,
    true,
  );

  const noBinding = evaluateQuestionRelease(valid, "PERSONAL_LEARNING_USABLE", {
    sourceRegistryExportBinding: sourceRegistryExportBinding(valid),
    modelExecutionExportBinding: null,
    sealedVariantExportBinding: null,
    ownerAdjudicationExportBinding: null,
    ownerResponseExportBinding: null,
  });
  assert.equal(noBinding.allowed, false);
  assert.ok(noBinding.blockingCodes.includes("TRUSTED_MODEL_EXECUTION_EXPORT_BINDING_REQUIRED"));

  const syntheticBinding = personalTrustContext(valid);
  syntheticBinding.modelExecutionExportBinding.syntheticOrSimulated = true;
  assert.equal(
    evaluateQuestionRelease(valid, "PERSONAL_LEARNING_USABLE", syntheticBinding).allowed,
    false,
  );

  const providerVersionAlias = personalBundle();
  const generatorIdentity = providerVersionAlias.batch.candidates[0].generatorModelIdentity;
  providerVersionAlias.judgeReviews[0].judgeModelIdentity = modelIdentity(
    "forged-independent-family",
    generatorIdentity.modelVersionId,
  );
  providerVersionAlias.trustedModelExecutions = trustedModelExecutionRegistry(providerVersionAlias);
  const providerAliasDecision = evaluateQuestionRelease(
    providerVersionAlias,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(providerVersionAlias),
  );
  assert.equal(providerAliasDecision.allowed, false);
  assert.ok(
    providerAliasDecision.blockingCodes.some((code) =>
      code.startsWith("TRUSTED_MODEL_PROVIDER_VERSION_ALIAS_CONFLICT:")),
  );

  const artifactAlias = personalBundle();
  artifactAlias.judgeReviews[0].judgeModelIdentity = {
    ...modelIdentity("forged-artifact-family", "forged-artifact-version@1"),
    modelArtifactDigest: artifactAlias.batch.candidates[0].generatorModelIdentity.modelArtifactDigest,
  };
  artifactAlias.trustedModelExecutions = trustedModelExecutionRegistry(artifactAlias);
  const artifactAliasDecision = evaluateQuestionRelease(
    artifactAlias,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(artifactAlias),
  );
  assert.equal(artifactAliasDecision.allowed, false);
  assert.ok(
    artifactAliasDecision.blockingCodes.some((code) =>
      code.startsWith("TRUSTED_MODEL_ARTIFACT_ALIAS_CONFLICT:")),
  );

  const forgedReceipt = personalBundle();
  forgedReceipt.trustedModelExecutions.receipts[0].selfAsserted = true;
  const forgedReceiptDecision = evaluateQuestionRelease(
    forgedReceipt,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(forgedReceipt),
  );
  assert.equal(forgedReceiptDecision.allowed, false);
  assert.ok(
    forgedReceiptDecision.blockingCodes.some((code) =>
      code.startsWith("TRUSTED_MODEL_EXECUTION_RECEIPT_INVALID:")),
  );
});

test("blind and anonymized execution receipts bind only role-visible inputs", () => {
  const bundleValue = personalBundle();
  const solverReview = bundleValue.blindSolverReviews[0];
  const solverReceipt = bundleValue.trustedModelExecutions.receipts.find(
    (receipt) => receipt.executionId === solverReview.solverExecutionId,
  );
  const solverVisibleInput = blindSolverVisibleInput(bundleValue, solverReview);
  assert.equal(solverReceipt.inputDigest, canonicalDigest(solverVisibleInput));
  assert.equal("proposedCorrectOptionId" in solverVisibleInput, false);
  assert.equal("explanation" in solverVisibleInput, false);
  assert.equal("generatorId" in solverVisibleInput, false);

  const judgeReview = bundleValue.judgeReviews[0];
  const judgeReceipt = bundleValue.trustedModelExecutions.receipts.find(
    (receipt) => receipt.executionId === judgeReview.judgeExecutionId,
  );
  const judgeVisibleInput = anonymizedJudgeVisibleInput(bundleValue, judgeReview);
  assert.equal(judgeReceipt.inputDigest, canonicalDigest(judgeVisibleInput));
  assert.equal("generatorId" in judgeVisibleInput.candidate, false);
  assert.equal("generatorModelIdentity" in judgeVisibleInput.candidate, false);
  assert.equal("generatorExecutionId" in judgeVisibleInput.candidate, false);
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

  const openSimilarityEvidence = personalBundle();
  openSimilarityEvidence.similarityReferences[0].privateAcademyBody = "must not enter release evidence";
  const openEvidenceDecision = evaluateQuestionRelease(
    openSimilarityEvidence,
    "PERSONAL_LEARNING_USABLE",
  );
  assert.equal(openEvidenceDecision.allowed, false);
  assert.ok(
    openEvidenceDecision.blockingCodes.includes("SIMILARITY_REFERENCE_SCHEMA_NOT_CLOSED:0"),
  );
});

test("TRANSFER_VERIFIED requires its stronger closed bundle and transfer-purpose rights", () => {
  const transfer = transferBundle();
  const decision = evaluateQuestionRelease(
    transfer,
    "TRANSFER_VERIFIED",
    transferTrustContext(transfer),
  );
  assert.equal(decision.allowed, true, decision.blockingCodes.join(","));

  const invalidSealedSignature = transferTrustContext(transfer);
  invalidSealedSignature.sealedVariantExportBinding.detachedSignature = "AA==";
  const invalidSealedDecision = evaluateQuestionRelease(
    transfer,
    "TRANSFER_VERIFIED",
    invalidSealedSignature,
  );
  assert.equal(invalidSealedDecision.allowed, false);
  assert.ok(
    invalidSealedDecision.blockingCodes.includes(
      "TRUSTED_SEALED_TRANSFER_VARIANT_EXPORT_BINDING_REQUIRED",
    ),
  );

  const invalidOwnerSignature = transferTrustContext(transfer);
  invalidOwnerSignature.ownerAdjudicationExportBinding.detachedSignature = "AA==";
  const invalidOwnerDecision = evaluateQuestionRelease(
    transfer,
    "TRANSFER_VERIFIED",
    invalidOwnerSignature,
  );
  assert.equal(invalidOwnerDecision.allowed, false);
  assert.ok(
    invalidOwnerDecision.blockingCodes.includes(
      "OWNER_ADJUDICATION_EXPORT_TRUST_BINDING_REQUIRED",
    ),
  );

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
  assert.ok(
    blocked.blockingCodes.includes("TRUSTED_SOURCE_REGISTRY_EXPORT_BINDING_REQUIRED"),
  );

  const falseCorrectness = transferBundle();
  falseCorrectness.transferEvidence.evaluatorReceipts[0].selectedOptionId =
    falseCorrectness.batch.candidates[0].options[1].optionId;
  falseCorrectness.transferEvidence.evaluatorReceipts[0].correct = true;
  falseCorrectness.transferEvidence.evidenceDigest = canonicalDigest({
    bundleId: falseCorrectness.transferEvidence.bundleId,
    candidateId: falseCorrectness.transferEvidence.candidateId,
    sealedBeforeEvaluation: falseCorrectness.transferEvidence.sealedBeforeEvaluation,
    sealedVariantRegistry: falseCorrectness.transferEvidence.sealedVariantRegistry,
    evaluatorReceipts: falseCorrectness.transferEvidence.evaluatorReceipts,
    completedAt: falseCorrectness.transferEvidence.completedAt,
  });
  const falseCorrectnessDecision = evaluateQuestionRelease(
    falseCorrectness,
    "TRANSFER_VERIFIED",
    transferTrustContext(falseCorrectness),
  );
  assert.equal(falseCorrectnessDecision.allowed, false);
  assert.ok(
    falseCorrectnessDecision.blockingCodes.some((code) =>
      code.startsWith("TRANSFER_EVALUATION_RECEIPT_INVALID:")),
  );

  const duplicateEvaluatorModel = transferBundle();
  duplicateEvaluatorModel.transferEvidence.evaluatorReceipts[1].evaluatorModelIdentity = clone(
    duplicateEvaluatorModel.transferEvidence.evaluatorReceipts[0].evaluatorModelIdentity,
  );
  duplicateEvaluatorModel.transferEvidence.evidenceDigest = canonicalDigest({
    bundleId: duplicateEvaluatorModel.transferEvidence.bundleId,
    candidateId: duplicateEvaluatorModel.transferEvidence.candidateId,
    sealedBeforeEvaluation: duplicateEvaluatorModel.transferEvidence.sealedBeforeEvaluation,
    sealedVariantRegistry: duplicateEvaluatorModel.transferEvidence.sealedVariantRegistry,
    evaluatorReceipts: duplicateEvaluatorModel.transferEvidence.evaluatorReceipts,
    completedAt: duplicateEvaluatorModel.transferEvidence.completedAt,
  });
  duplicateEvaluatorModel.trustedModelExecutions = trustedModelExecutionRegistry(duplicateEvaluatorModel);
  const duplicateModelDecision = evaluateQuestionRelease(
    duplicateEvaluatorModel,
    "TRANSFER_VERIFIED",
    transferTrustContext(duplicateEvaluatorModel),
  );
  assert.equal(duplicateModelDecision.allowed, false);
  assert.ok(duplicateModelDecision.blockingCodes.includes("TRANSFER_FAMILY_NOT_INDEPENDENT"));

  const nonexistentVariant = transferBundle();
  nonexistentVariant.transferEvidence.sealedVariantRegistry.variants[0].stem =
    "Fabricated content that was never part of the sealed commitment.";
  nonexistentVariant.transferEvidence.evidenceDigest = canonicalDigest({
    bundleId: nonexistentVariant.transferEvidence.bundleId,
    candidateId: nonexistentVariant.transferEvidence.candidateId,
    sealedBeforeEvaluation: nonexistentVariant.transferEvidence.sealedBeforeEvaluation,
    sealedVariantRegistry: nonexistentVariant.transferEvidence.sealedVariantRegistry,
    evaluatorReceipts: nonexistentVariant.transferEvidence.evaluatorReceipts,
    completedAt: nonexistentVariant.transferEvidence.completedAt,
  });
  const nonexistentVariantDecision = evaluateQuestionRelease(
    nonexistentVariant,
    "TRANSFER_VERIFIED",
    transferTrustContext(nonexistentVariant),
  );
  assert.equal(nonexistentVariantDecision.allowed, false);
  assert.ok(
    nonexistentVariantDecision.blockingCodes.some((code) =>
      code.startsWith("SEALED_TRANSFER_VARIANT_INVALID:")),
  );

  const relabeledDuplicateVariant = transferBundle();
  const firstVariant = relabeledDuplicateVariant.transferEvidence.sealedVariantRegistry.variants[0];
  const secondVariant = relabeledDuplicateVariant.transferEvidence.sealedVariantRegistry.variants[1];
  secondVariant.stem = firstVariant.stem;
  secondVariant.options = clone(firstVariant.options);
  secondVariant.visibleContentDigest = canonicalDigest({
    stem: secondVariant.stem,
    options: secondVariant.options,
  });
  secondVariant.sealedVariantDigest = canonicalDigest({
    transferVariantId: secondVariant.transferVariantId,
    sourceCandidateId: secondVariant.sourceCandidateId,
    blueprintId: secondVariant.blueprintId,
    blueprintVersionId: secondVariant.blueprintVersionId,
    answerSpecificationId: secondVariant.answerSpecificationId,
    sourceBindingDigest: secondVariant.sourceBindingDigest,
    rightsBoundary: secondVariant.rightsBoundary,
    stem: secondVariant.stem,
    options: secondVariant.options,
    expectedOptionId: secondVariant.expectedOptionId,
    sealedAt: secondVariant.sealedAt,
    answerHiddenDuringEvaluation: true,
  });
  const secondReceipt = relabeledDuplicateVariant.transferEvidence.evaluatorReceipts[1];
  secondReceipt.visibleVariantDigest = secondVariant.visibleContentDigest;
  secondReceipt.sealedVariantDigest = secondVariant.sealedVariantDigest;
  secondReceipt.inputDigest = canonicalDigest({
    transferVariantId: secondVariant.transferVariantId,
    visibleVariantDigest: secondVariant.visibleContentDigest,
    stem: secondVariant.stem,
    options: secondVariant.options,
  });
  relabeledDuplicateVariant.transferEvidence.evidenceDigest = canonicalDigest({
    bundleId: relabeledDuplicateVariant.transferEvidence.bundleId,
    candidateId: relabeledDuplicateVariant.transferEvidence.candidateId,
    sealedBeforeEvaluation: relabeledDuplicateVariant.transferEvidence.sealedBeforeEvaluation,
    sealedVariantRegistry: relabeledDuplicateVariant.transferEvidence.sealedVariantRegistry,
    evaluatorReceipts: relabeledDuplicateVariant.transferEvidence.evaluatorReceipts,
    completedAt: relabeledDuplicateVariant.transferEvidence.completedAt,
  });
  const duplicateVariantDecision = evaluateQuestionRelease(
    relabeledDuplicateVariant,
    "TRANSFER_VERIFIED",
    transferTrustContext(relabeledDuplicateVariant),
  );
  assert.equal(duplicateVariantDecision.allowed, false);
  assert.ok(
    duplicateVariantDecision.blockingCodes.includes("TRANSFER_SEALED_VARIANTS_NOT_DISTINCT"),
  );

  const ownerBeforeAutomation = transferBundle();
  ownerBeforeAutomation.ownerAdjudication.decidedAt = "2026-08-25T00:08:00.000Z";
  ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.receipts = [
    clone(ownerBeforeAutomation.ownerAdjudication),
  ];
  ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.receiptsDigest = canonicalDigest(
    ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.receipts,
  );
  const ownerRegistryProjection = {
    registryVersion: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.registryVersion,
    source: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.source,
    exportId: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.exportId,
    exportVersionId: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.exportVersionId,
    verifiedAt: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.verifiedAt,
    remoteReadPerformed: false,
    receiptsDigest: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.receiptsDigest,
    receipts: ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.receipts,
  };
  ownerBeforeAutomation.trustedOwnerAdjudicationRegistry.exportContentDigest =
    canonicalDigest(ownerRegistryProjection);
  const ownerBeforeDecision = evaluateQuestionRelease(
    ownerBeforeAutomation,
    "TRANSFER_VERIFIED",
    transferTrustContext(ownerBeforeAutomation),
  );
  assert.equal(ownerBeforeDecision.allowed, false);
  assert.ok(
    ownerBeforeDecision.blockingCodes.includes("OWNER_ADJUDICATION_REQUIRED_ABOVE_PERSONAL_TIER"),
  );
});

test("every sealed transfer variant independently revalidates answer, distractors, clues and similarity", () => {
  const hostileCases = [
    {
      name: "retained expected option with corrupted answer body",
      mutate: (variant) => {
        variant.options.find((option) => option.optionId === variant.expectedOptionId).body = "999 points";
      },
      expectedPrefixes: [
        "SEALED_TRANSFER_VARIANT_SINGLE_ANSWER_INVALID:",
        "SEALED_TRANSFER_VARIANT_CALCULATION_INVALID:",
      ],
    },
    {
      name: "retained expected option with noncanonical answer body",
      mutate: (variant) => {
        variant.options.find((option) => option.optionId === variant.expectedOptionId).body = "20 POINTS";
      },
      expectedPrefixes: ["SEALED_TRANSFER_VARIANT_SINGLE_ANSWER_INVALID:"],
    },
    {
      name: "multiple equivalent correct answers",
      mutate: (variant) => {
        variant.options.find((option) => option.optionId !== variant.expectedOptionId).body = "20 points";
      },
      expectedPrefixes: [
        "SEALED_TRANSFER_VARIANT_SINGLE_ANSWER_INVALID:",
        "SEALED_TRANSFER_VARIANT_CALCULATION_INVALID:",
      ],
    },
    {
      name: "duplicate invalid distractor",
      mutate: (variant) => {
        const distractors = variant.options.filter((option) => option.optionId !== variant.expectedOptionId);
        distractors[1].body = distractors[0].body;
      },
      expectedPrefixes: ["SEALED_TRANSFER_VARIANT_DISTRACTOR_OR_CLUE_INVALID:"],
    },
    {
      name: "prohibited answer clue",
      mutate: (variant) => {
        variant.stem = `Obviously ${variant.stem}`;
      },
      expectedPrefixes: ["SEALED_TRANSFER_VARIANT_DISTRACTOR_OR_CLUE_INVALID:"],
    },
    {
      name: "near-copy sealed body",
      mutate: (variant) => {
        variant.stem = similarityReferenceBody();
        variant.options.forEach((option, index) => {
          option.body = String(index + 1);
        });
      },
      expectedPrefixes: ["SEALED_TRANSFER_VARIANT_SIMILARITY_INVALID:"],
    },
  ];
  for (const hostileCase of hostileCases) {
    for (const variantIndex of [0, 1]) {
      const hostile = transferBundle();
      const variant = hostile.transferEvidence.sealedVariantRegistry.variants[variantIndex];
      hostileCase.mutate(variant);
      resealTransferVariant(hostile, variantIndex);
      const decision = evaluateQuestionRelease(
        hostile,
        "TRANSFER_VERIFIED",
        transferTrustContext(hostile),
      );
      assert.equal(decision.allowed, false, `${hostileCase.name}:${variantIndex}`);
      assert.equal(decision.releasedTier, "QUARANTINED", `${hostileCase.name}:${variantIndex}:tier`);
      for (const prefix of hostileCase.expectedPrefixes) {
        assert.ok(
          decision.blockingCodes.some((code) =>
            code.startsWith(`${prefix}${variant.transferVariantId}`)),
          `${hostileCase.name}:${variantIndex}:${prefix}`,
        );
      }
    }
  }
});

test("transfer release audit binds every evaluator and the Owner decision in order", () => {
  const transfer = transferBundle();
  const trustContext = transferTrustContext(transfer);
  const decision = evaluateQuestionRelease(transfer, "TRANSFER_VERIFIED", trustContext);
  assert.equal(decision.allowed, true, decision.blockingCodes.join(","));
  const auditRun = createReleaseAudit(transfer, decision, "transfer-release-audit-1");
  const kinds = auditRun.steps.map((step) => step.kind);
  assert.equal(kinds.filter((kind) => kind === "TRANSFER_VALIDATED").length, 3);
  assert.equal(kinds.filter((kind) => kind === "OWNER_ADJUDICATED").length, 1);
  assert.ok(kinds.indexOf("META_AUDITED") < kinds.indexOf("TRANSFER_VALIDATED"));
  assert.ok(kinds.lastIndexOf("TRANSFER_VALIDATED") < kinds.indexOf("OWNER_ADJUDICATED"));
  assert.ok(kinds.indexOf("OWNER_ADJUDICATED") < kinds.lastIndexOf("SOURCE_VALIDATED"));
  assert.equal(
    validateReleaseAuditRun(auditRun, transfer, decision, trustContext).valid,
    true,
  );
  const artifact = createQuestionBankArtifact({
    artifactId: "transfer-artifact-1",
    bundle: transfer,
    requestedTier: "TRANSFER_VERIFIED",
    decision,
    trustContext,
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  });
  assert.equal(artifact.releaseTier, "TRANSFER_VERIFIED");
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

test("judge drift binds each version to one distinct trusted identity, artifact and execution", () => {
  const valid = personalBundle();
  const validDirect = validateMetaAuditBundle(
    valid.metaAudits,
    valid.batch,
    valid.selectedCandidateId,
  );
  assert.equal(validDirect.valid, true, validDirect.errors.join(","));
  const validDecision = evaluateQuestionRelease(
    valid,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(valid),
  );
  assert.equal(validDecision.allowed, true, validDecision.blockingCodes.join(","));
  const validFixture = valid.metaAudits.judgeDrift.fixtures[0];
  assert.notEqual(
    canonicalDigest(validFixture.baseline.judgeModelIdentity),
    canonicalDigest(validFixture.current.judgeModelIdentity),
  );
  assert.notEqual(
    validFixture.baseline.judgeModelIdentity.modelArtifactDigest,
    validFixture.current.judgeModelIdentity.modelArtifactDigest,
  );

  const relabeledSameIdentity = personalBundle();
  for (const fixture of relabeledSameIdentity.metaAudits.judgeDrift.fixtures) {
    fixture.current.judgeModelIdentity = clone(fixture.baseline.judgeModelIdentity);
  }
  const relabeledSameIdentityDirect = validateMetaAuditBundle(
    relabeledSameIdentity.metaAudits,
    relabeledSameIdentity.batch,
    relabeledSameIdentity.selectedCandidateId,
  );
  assert.equal(relabeledSameIdentityDirect.valid, false);
  assert.ok(relabeledSameIdentityDirect.errors.includes("metaAudit:JUDGE_DRIFT_FAILED"));

  const inconsistentCurrentIdentity = personalBundle();
  inconsistentCurrentIdentity.metaAudits.judgeDrift.fixtures[1].current.judgeModelIdentity = {
    ...inconsistentCurrentIdentity.metaAudits.judgeDrift.fixtures[1].current.judgeModelIdentity,
    modelVersionId: "drift-judge-family@2",
    modelArtifactDigest: canonicalDigest("drift-judge-family@2"),
  };
  const inconsistentDirect = validateMetaAuditBundle(
    inconsistentCurrentIdentity.metaAudits,
    inconsistentCurrentIdentity.batch,
    inconsistentCurrentIdentity.selectedCandidateId,
  );
  assert.equal(inconsistentDirect.valid, false);
  assert.ok(inconsistentDirect.errors.includes("metaAudit:JUDGE_DRIFT_FAILED"));

  const mismatchedCatalogLabel = personalBundle();
  mismatchedCatalogLabel.metaAudits.judgeDrift.currentJudgeVersion = "judge-1@relabeled";
  for (const fixture of mismatchedCatalogLabel.metaAudits.judgeDrift.fixtures) {
    fixture.current.judgeVersion = "judge-1@relabeled";
  }
  const mismatchedDirect = validateMetaAuditBundle(
    mismatchedCatalogLabel.metaAudits,
    mismatchedCatalogLabel.batch,
    mismatchedCatalogLabel.selectedCandidateId,
  );
  assert.equal(mismatchedDirect.valid, true, mismatchedDirect.errors.join(","));
  const mismatchedDecision = evaluateQuestionRelease(
    mismatchedCatalogLabel,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(mismatchedCatalogLabel),
  );
  assert.equal(mismatchedDecision.allowed, false);
  assert.ok(
    mismatchedDecision.blockingCodes.some((code) =>
      code.startsWith("TRUSTED_MODEL_EXECUTION_RECEIPT_INVALID:drift-current-execution-")),
  );

  const reusedExecution = personalBundle();
  reusedExecution.metaAudits.judgeDrift.fixtures[0].current.judgeExecutionId =
    reusedExecution.metaAudits.judgeDrift.fixtures[0].baseline.judgeExecutionId;
  const reusedExecutionDirect = validateMetaAuditBundle(
    reusedExecution.metaAudits,
    reusedExecution.batch,
    reusedExecution.selectedCandidateId,
  );
  assert.equal(reusedExecutionDirect.valid, false);
  assert.ok(reusedExecutionDirect.errors.includes("metaAudit:JUDGE_DRIFT_FAILED"));
});

test("all four meta-audits are independently mandatory", () => {
  for (const [name, mutate] of [
    ["selfPreference", (bundleValue) => { bundleValue.metaAudits.selfPreference.evaluatorIds = ["generator-1"]; }],
    ["orderBias", (bundleValue) => { bundleValue.metaAudits.orderBias.stableAcrossOrders = false; }],
    ["repeatedStability", (bundleValue) => { bundleValue.metaAudits.repeatedStability.runIds = ["one", "two"]; }],
    ["repeatedStabilityWrongAnswer", (bundleValue) => {
      bundleValue.metaAudits.repeatedStability.selectedOptionIds = [
        "wrong-option",
        "wrong-option",
        "wrong-option",
      ];
    }],
    ["judgeDrift", (bundleValue) => { bundleValue.metaAudits.judgeDrift.disagreementRate = 0.5; }],
    ["selfPreferenceRawRun", (bundleValue) => {
      bundleValue.metaAudits.selfPreference.runs[0].evaluatorId = "generator-1";
      bundleValue.metaAudits.selfPreference.runs[0].evaluatorModelIdentity = clone(
        bundleValue.batch.candidates[0].generatorModelIdentity,
      );
    }],
    ["orderBiasRawRun", (bundleValue) => {
      bundleValue.metaAudits.orderBias.runs[0].selectedCandidateId = bundleValue.batch.candidates[1].candidateId;
    }],
    ["repeatedStabilityRawWrongAnswer", (bundleValue) => {
      bundleValue.metaAudits.repeatedStability.runs[0].selectedOptionId = "wrong-option";
    }],
    ["judgeDriftRawFixture", (bundleValue) => {
      bundleValue.metaAudits.judgeDrift.fixtures[0].current.approved = false;
    }],
    ["judgeDriftRaisedThreshold", (bundleValue) => {
      bundleValue.metaAudits.judgeDrift.maximumAllowedDisagreementRate = 0.9;
    }],
    ["unknownMetaField", (bundleValue) => {
      bundleValue.metaAudits.selfPreference.rawPrivateAcademyBody = "must never enter audit evidence";
    }],
  ]) {
    const bundleValue = personalBundle();
    mutate(bundleValue);
    const decision = evaluateQuestionRelease(
      bundleValue,
      "PERSONAL_LEARNING_USABLE",
      personalTrustContext(bundleValue),
    );
    assert.equal(decision.allowed, false, name);
    assert.ok(decision.blockingCodes.some((code) => code.includes("metaAudit")), name);
  }

  const aliasAxes = [
    "ACTOR_ID",
    "MODEL_FAMILY_ID",
    "PROVIDER_MODEL_VERSION_ID",
    "MODEL_ARTIFACT_DIGEST",
  ];
  const aliasCases = [
    {
      name: "selfPreference",
      path: "metaAudit.selfPreference.runs[0]",
      targets: (bundleValue) => [{
        record: bundleValue.metaAudits.selfPreference.runs[0],
        actorKey: "evaluatorId",
        modelKey: "evaluatorModelIdentity",
      }],
      afterActorMutation: (bundleValue, generatorId) => {
        bundleValue.metaAudits.selfPreference.evaluatorIds = [generatorId];
        bundleValue.metaAudits.selfPreference.generatorEvaluatorOverlap = [generatorId];
      },
    },
    {
      name: "orderBias",
      path: "metaAudit.orderBias.runs[0]",
      targets: (bundleValue) => [{
        record: bundleValue.metaAudits.orderBias.runs[0],
        actorKey: "evaluatorId",
        modelKey: "evaluatorModelIdentity",
      }],
    },
    {
      name: "repeatedStability",
      path: "metaAudit.repeatedStability.runs[0]",
      targets: (bundleValue) => [{
        record: bundleValue.metaAudits.repeatedStability.runs[0],
        actorKey: "evaluatorId",
        modelKey: "evaluatorModelIdentity",
      }],
    },
    {
      name: "judgeDrift",
      path: "metaAudit.judgeDrift.fixtures[0].baseline",
      targets: (bundleValue, axis) => {
        const fixture = bundleValue.metaAudits.judgeDrift.fixtures[0];
        const outcomes = axis === "MODEL_FAMILY_ID"
          ? [fixture.baseline, fixture.current]
          : [fixture.baseline];
        return outcomes.map((record) => ({
          record,
          actorKey: "judgeId",
          modelKey: "judgeModelIdentity",
        }));
      },
    },
  ];
  const aliasedIdentity = (original, generatorIdentity, axis, label) => {
    if (axis === "MODEL_FAMILY_ID") {
      return {
        ...original,
        modelFamilyId: generatorIdentity.modelFamilyId,
        modelArtifactDigest: canonicalDigest({ label, axis, version: original.modelVersionId }),
      };
    }
    if (axis === "PROVIDER_MODEL_VERSION_ID") {
      return {
        ...original,
        providerId: generatorIdentity.providerId,
        modelVersionId: generatorIdentity.modelVersionId,
        modelArtifactDigest: canonicalDigest({ label, axis }),
      };
    }
    if (axis === "MODEL_ARTIFACT_DIGEST") {
      return {
        ...original,
        modelArtifactDigest: generatorIdentity.modelArtifactDigest,
      };
    }
    return original;
  };

  for (const aliasCase of aliasCases) {
    for (const axis of aliasAxes) {
      const hostile = personalBundle();
      const generator = hostile.batch.candidates[0];
      const targets = aliasCase.targets(hostile, axis);
      for (const { record, actorKey, modelKey } of targets) {
        if (axis === "ACTOR_ID") {
          record[actorKey] = generator.generatorId;
        } else {
          record[modelKey] = aliasedIdentity(
            record[modelKey],
            generator.generatorModelIdentity,
            axis,
            `${aliasCase.name}:${record[actorKey]}`,
          );
        }
      }
      if (axis === "ACTOR_ID") {
        aliasCase.afterActorMutation?.(hostile, generator.generatorId);
      }
      hostile.trustedModelExecutions = trustedModelExecutionRegistry(hostile);
      const expectedCode =
        `metaAudit:GENERATOR_EVALUATOR_ALIAS_OVERLAP:${aliasCase.path}:${axis}`;
      const direct = validateMetaAuditBundle(
        hostile.metaAudits,
        hostile.batch,
        hostile.selectedCandidateId,
      );
      assert.equal(direct.valid, false, `${aliasCase.name}:${axis}:direct`);
      assert.ok(direct.errors.includes(expectedCode), `${aliasCase.name}:${axis}:direct-code`);
      const decision = evaluateQuestionRelease(
        hostile,
        "PERSONAL_LEARNING_USABLE",
        personalTrustContext(hostile),
      );
      assert.equal(decision.allowed, false, `${aliasCase.name}:${axis}:release`);
      assert.ok(
        decision.blockingCodes.includes(expectedCode),
        `${aliasCase.name}:${axis}:release-code`,
      );
    }
  }

  for (const [name, mutate, expectedPath] of [
    [
      "repeatedStabilityExactGeneratorModel",
      (bundleValue) => {
        bundleValue.metaAudits.repeatedStability.runs[0].evaluatorModelIdentity = clone(
          bundleValue.batch.candidates[0].generatorModelIdentity,
        );
      },
      "metaAudit.repeatedStability.runs[0]",
    ],
    [
      "judgeDriftExactGeneratorModel",
      (bundleValue) => {
        const generatorIdentity = bundleValue.batch.candidates[0].generatorModelIdentity;
        bundleValue.metaAudits.judgeDrift.fixtures[0].baseline.judgeModelIdentity = clone(
          generatorIdentity,
        );
        bundleValue.metaAudits.judgeDrift.fixtures[0].current.judgeModelIdentity = clone(
          generatorIdentity,
        );
      },
      "metaAudit.judgeDrift.fixtures[0].baseline",
    ],
  ]) {
    const hostile = personalBundle();
    mutate(hostile);
    hostile.trustedModelExecutions = trustedModelExecutionRegistry(hostile);
    const expectedCode =
      `metaAudit:GENERATOR_EVALUATOR_ALIAS_OVERLAP:${expectedPath}:MODEL_FAMILY_ID`;
    const decision = evaluateQuestionRelease(
      hostile,
      "PERSONAL_LEARNING_USABLE",
      personalTrustContext(hostile),
    );
    assert.equal(decision.allowed, false, name);
    assert.ok(decision.blockingCodes.includes(expectedCode), name);
  }

  const slashBoundary = clone(personalBundle());
  const slashGeneratorIdentity = {
    ...slashBoundary.batch.candidates[0].generatorModelIdentity,
    providerId: "owner/model",
    modelVersionId: "v1",
    modelArtifactDigest: canonicalDigest({ role: "slash-boundary-generator" }),
  };
  for (const candidate of slashBoundary.batch.candidates) {
    candidate.generatorModelIdentity = clone(slashGeneratorIdentity);
  }
  const slashEvaluatorIdentity = {
    ...slashBoundary.blindSolverReviews[0].solverModelIdentity,
    providerId: "owner",
    modelVersionId: "model/v1",
    modelArtifactDigest: canonicalDigest({ role: "slash-boundary-evaluator" }),
  };
  slashBoundary.blindSolverReviews[0].solverModelIdentity = clone(slashEvaluatorIdentity);
  slashBoundary.metaAudits.repeatedStability.runs[0].evaluatorModelIdentity = clone(
    slashEvaluatorIdentity,
  );
  const slashFixtureDigest = canonicalDigest({
    batchDigest: canonicalDigest(slashBoundary.batch),
    selectedCandidateId: slashBoundary.selectedCandidateId,
  });
  slashBoundary.metaAudits.repeatedStability.fixtureDigest = slashFixtureDigest;
  for (const run of slashBoundary.metaAudits.repeatedStability.runs) {
    run.fixtureDigest = slashFixtureDigest;
  }
  slashBoundary.trustedModelExecutions = trustedModelExecutionRegistry(slashBoundary);
  const slashSeparation = validateGeneratorJudgeSolverSeparation(
    slashBoundary.batch,
    slashBoundary.blindSolverReviews,
    slashBoundary.judgeReviews,
    slashBoundary.selectedCandidateId,
  );
  assert.equal(slashSeparation.valid, true, slashSeparation.errors.join(","));
  const slashMeta = validateMetaAuditBundle(
    slashBoundary.metaAudits,
    slashBoundary.batch,
    slashBoundary.selectedCandidateId,
  );
  assert.equal(slashMeta.valid, true, slashMeta.errors.join(","));
  const slashDecision = evaluateQuestionRelease(
    slashBoundary,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(slashBoundary),
  );
  assert.equal(
    slashDecision.blockingCodes.some((code) => code.includes("CANONICAL_MODEL_ALIAS_REUSE")),
    false,
  );
  assert.equal(
    slashDecision.blockingCodes.some((code) => code.includes("PROVIDER_MODEL_VERSION_ID")),
    false,
  );
  assert.equal(
    slashDecision.blockingCodes.some(
      (code) => code.includes("TRUSTED_MODEL_PROVIDER_VERSION_ALIAS_CONFLICT"),
    ),
    false,
  );
});

test("bank-first assignment revalidates current rights and generation-on-gap preflights before callbacks", () => {
  const bundleValue = personalBundle();
  const decision = evaluateQuestionRelease(
    bundleValue,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(bundleValue),
  );
  const auditRun = createReleaseAudit(bundleValue, decision, "audit-run-1");
  const trustContext = personalTrustContext(bundleValue);
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
    envelopeKind: "RELEASE",
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
  const currentSources = sourceRegistry({ asOf: request.occurredAt });
  const generationPlan = (overrides = {}) => {
    const { blueprint: blueprintOverrides = {}, ...planOverrides } = overrides;
    const blueprintValue = blueprint(blueprintOverrides);
    return {
      batchId: `batch:${request.requestId}:gap`,
      blueprint: blueprintValue,
      answerSpecification: answerSpecification(blueprintValue),
      candidateCount: 2,
      generatorId: "generator-1",
      generatorVersion: "generator-1@1",
      generatorModelIdentity: modelIdentity("generator-family"),
      generatorExecutionIds: ["gap-generator-execution-1", "gap-generator-execution-2"],
      generationRunId: `generation:${request.requestId}:gap`,
      generatedAt: request.occurredAt,
      trustedSources: currentSources,
      sourceRegistryExportBinding: sourceRegistryExportBinding(currentSources),
      generator: (input) => {
        calls += 1;
        return candidateGenerator(input);
      },
      ...planOverrides,
    };
  };

  const found = selectBankFirstOrGenerateOnGap(
    request,
    [releaseEnvelope],
    currentSources,
    sourceRegistryExportBinding(currentSources),
    generationPlan(),
  );
  assert.equal(found.kind, "BANK_ITEM");
  assert.equal(found.generationCount, 0);
  assert.equal(calls, 0);

  const laterArtifact = createQuestionBankArtifact({
    artifactId: "artifact-z-valid",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext,
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  });
  const laterReleaseEnvelope = { ...releaseEnvelope, artifact: laterArtifact };
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [releaseEnvelope, clone(releaseEnvelope)],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-duplicate-release-artifact-identity/,
  );
  assert.equal(calls, 0);
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [releaseEnvelope, laterReleaseEnvelope],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-duplicate-release-candidate-identity/,
  );
  assert.equal(calls, 0);
  const disputedAt = "2026-08-25T00:13:00.000Z";
  const disputedExpected = {
    ...artifact,
    releaseTier: "DISPUTED",
    revision: 2,
    auditRunId: "audit-bank-disputed",
    updatedAt: disputedAt,
  };
  const disputedAudit = createLifecycleAudit(
    artifact,
    disputedExpected,
    "DISPUTED",
    "audit-bank-disputed",
    disputedAt,
  );
  const disputedArtifact = disputeQuestionBankArtifact(
    artifact,
    artifact.revision,
    disputedAudit,
    disputedAt,
  );
  const disputedTransition = {
    lifecycleAction: "DISPUTED",
    artifact: disputedArtifact,
    auditRun: disputedAudit,
    occurredAt: disputedAt,
  };
  const revisedAt = "2026-08-25T00:14:00.000Z";
  const revisedExpected = {
    ...disputedArtifact,
    artifactId: "artifact-revised-quarantined",
    candidateId: "candidate-revised-quarantined",
    releaseTier: "QUARANTINED",
    revision: 1,
    parentArtifactId: disputedArtifact.artifactId,
    auditRunId: "audit-bank-revised",
    createdAt: revisedAt,
    updatedAt: revisedAt,
  };
  const revisedAudit = createLifecycleAudit(
    disputedArtifact,
    revisedExpected,
    "REVISED",
    "audit-bank-revised",
    revisedAt,
  );
  const revisedArtifact = reviseQuestionBankArtifact({
    artifact: disputedArtifact,
    expectedRevision: disputedArtifact.revision,
    newArtifactId: revisedExpected.artifactId,
    newCandidateId: revisedExpected.candidateId,
    auditRun: revisedAudit,
    occurredAt: revisedAt,
  });
  const retiredAt = "2026-08-25T00:15:00.000Z";
  const retiredExpected = {
    ...artifact,
    releaseTier: "RETIRED",
    revision: 2,
    auditRunId: "audit-bank-retired",
    updatedAt: retiredAt,
  };
  const retiredAudit = createLifecycleAudit(
    artifact,
    retiredExpected,
    "RETIRED",
    "audit-bank-retired",
    retiredAt,
  );
  const retiredArtifact = retireQuestionBankArtifact(
    artifact,
    artifact.revision,
    retiredAudit,
    retiredAt,
  );
  const revisedDisputedAt = "2026-08-25T00:15:30.000Z";
  const revisedDisputedExpected = {
    ...revisedArtifact,
    releaseTier: "DISPUTED",
    revision: 2,
    auditRunId: "audit-bank-revised-disputed",
    updatedAt: revisedDisputedAt,
  };
  const revisedDisputedAudit = createLifecycleAudit(
    revisedArtifact,
    revisedDisputedExpected,
    "DISPUTED",
    "audit-bank-revised-disputed",
    revisedDisputedAt,
  );
  const revisedDisputedArtifact = disputeQuestionBankArtifact(
    revisedArtifact,
    revisedArtifact.revision,
    revisedDisputedAudit,
    revisedDisputedAt,
  );
  const reusedAt = "2026-08-25T00:16:00.000Z";
  const reusedExpected = {
    ...revisedDisputedArtifact,
    artifactId: artifact.artifactId,
    candidateId: artifact.candidateId,
    releaseTier: "QUARANTINED",
    revision: 1,
    parentArtifactId: revisedDisputedArtifact.artifactId,
    auditRunId: "audit-bank-reused-lineage-identity",
    createdAt: reusedAt,
    updatedAt: reusedAt,
  };
  const reusedAudit = createLifecycleAudit(
    revisedDisputedArtifact,
    reusedExpected,
    "REVISED",
    "audit-bank-reused-lineage-identity",
    reusedAt,
  );
  const reusedArtifact = reviseQuestionBankArtifact({
    artifact: revisedDisputedArtifact,
    expectedRevision: revisedDisputedArtifact.revision,
    newArtifactId: reusedExpected.artifactId,
    newCandidateId: reusedExpected.candidateId,
    auditRun: reusedAudit,
    occurredAt: reusedAt,
  });
  const lifecycleEnvelopes = [
    {
      label: "DISPUTED",
      envelopeKind: "LIFECYCLE",
      releaseEnvelope,
      transitions: [disputedTransition],
      artifact: disputedArtifact,
    },
    {
      label: "QUARANTINED",
      envelopeKind: "LIFECYCLE",
      releaseEnvelope,
      transitions: [
        disputedTransition,
        {
          lifecycleAction: "REVISED",
          artifact: revisedArtifact,
          auditRun: revisedAudit,
          occurredAt: revisedAt,
        },
      ],
      artifact: revisedArtifact,
    },
    {
      label: "RETIRED",
      envelopeKind: "LIFECYCLE",
      releaseEnvelope,
      transitions: [
        {
          lifecycleAction: "RETIRED",
          artifact: retiredArtifact,
          auditRun: retiredAudit,
          occurredAt: retiredAt,
        },
      ],
      artifact: retiredArtifact,
    },
  ];

  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [
          {
            envelopeKind: "LIFECYCLE",
            releaseEnvelope,
            transitions: [
              disputedTransition,
              {
                lifecycleAction: "REVISED",
                artifact: revisedArtifact,
                auditRun: revisedAudit,
                occurredAt: revisedAt,
              },
              {
                lifecycleAction: "DISPUTED",
                artifact: revisedDisputedArtifact,
                auditRun: revisedDisputedAudit,
                occurredAt: revisedDisputedAt,
              },
              {
                lifecycleAction: "REVISED",
                artifact: reusedArtifact,
                auditRun: reusedAudit,
                occurredAt: reusedAt,
              },
            ],
            artifact: reusedArtifact,
          },
        ],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-lifecycle-revision-identity-reused/,
  );
  assert.equal(calls, 0);

  const quarantinedLifecycleEnvelope = clone(lifecycleEnvelopes.find(
    (entry) => entry.label === "QUARANTINED",
  ));
  delete quarantinedLifecycleEnvelope.label;
  const retiredLifecycleEnvelope = clone(lifecycleEnvelopes.find(
    (entry) => entry.label === "RETIRED",
  ));
  delete retiredLifecycleEnvelope.label;

  const excludedTerminalHistory = selectBankFirstOrGenerateOnGap(
    {
      ...request,
      requestId: "request-excluded-terminal-history",
      excludedArtifactIds: [revisedArtifact.artifactId],
      offlineGenerationOnGapAuthorized: false,
    },
    [releaseEnvelope, quarantinedLifecycleEnvelope],
    currentSources,
    sourceRegistryExportBinding(currentSources),
    generationPlan(),
  );
  assert.equal(excludedTerminalHistory.kind, "BLOCKED");
  assert.equal(calls, 0);

  const driftedLifecycleSummary = clone(quarantinedLifecycleEnvelope);
  driftedLifecycleSummary.artifact = {
    ...driftedLifecycleSummary.artifact,
    subject: "economics",
  };
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [releaseEnvelope, driftedLifecycleSummary],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-lifecycle-envelope-terminal-artifact-mismatch/,
  );
  assert.equal(calls, 0);

  const driftedReleaseScope = clone(releaseEnvelope);
  driftedReleaseScope.artifact.subject = "ACCOUNTING";
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [driftedReleaseScope],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-release-envelope-artifact-mismatch/,
  );
  assert.equal(calls, 0);

  const rewrappedArtifact = createQuestionBankArtifact({
    artifactId: "artifact-rewrapped-same-candidate",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext,
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  });
  const rewrappedEnvelope = { ...releaseEnvelope, artifact: rewrappedArtifact };
  const blockedRewrappedCandidate = selectBankFirstOrGenerateOnGap(
    {
      ...request,
      requestId: "request-retired-candidate-rewrapped",
      offlineGenerationOnGapAuthorized: false,
    },
    [retiredLifecycleEnvelope, rewrappedEnvelope],
    currentSources,
    sourceRegistryExportBinding(currentSources),
    generationPlan(),
  );
  assert.equal(blockedRewrappedCandidate.kind, "BLOCKED");
  assert.equal(calls, 0);

  for (const { label: lifecycleTier, ...lifecycleEnvelope } of lifecycleEnvelopes) {
    const selectedAfterHistory = selectBankFirstOrGenerateOnGap(
      {
        ...request,
        requestId: `request-history-plus-rewrapped-${lifecycleTier.toLowerCase()}`,
        offlineGenerationOnGapAuthorized: false,
      },
      [lifecycleEnvelope, releaseEnvelope],
      currentSources,
      sourceRegistryExportBinding(currentSources),
      generationPlan(),
    );
    assert.equal(selectedAfterHistory.kind, "BLOCKED", lifecycleTier);
    assert.equal(calls, 0, lifecycleTier);

    const generatedAfterHistory = selectBankFirstOrGenerateOnGap(
      request,
      [lifecycleEnvelope],
      currentSources,
      sourceRegistryExportBinding(currentSources),
      generationPlan(),
    );
    assert.equal(generatedAfterHistory.kind, "OFFLINE_GENERATION_GAP", lifecycleTier);
    assert.equal(calls, 2, lifecycleTier);
    calls = 0;

    const blockedAfterHistory = selectBankFirstOrGenerateOnGap(
      { ...request, offlineGenerationOnGapAuthorized: false },
      [lifecycleEnvelope],
      currentSources,
      sourceRegistryExportBinding(currentSources),
      generationPlan(),
    );
    assert.equal(blockedAfterHistory.kind, "BLOCKED", lifecycleTier);
    assert.equal(calls, 0, lifecycleTier);
  }

  for (const lifecycleTier of ["QUARANTINED", "DISPUTED", "RETIRED"]) {
    const unauditedHistory = clone(releaseEnvelope);
    unauditedHistory.artifact.releaseTier = lifecycleTier;
    assert.throws(
      () =>
        selectBankFirstOrGenerateOnGap(
          request,
          [unauditedHistory],
          currentSources,
          sourceRegistryExportBinding(currentSources),
          generationPlan(),
        ),
      /bank-nonassignable-history-requires-lifecycle-envelope/,
      lifecycleTier,
    );
    assert.equal(calls, 0, lifecycleTier);
  }

  const unknownTierEnvelope = clone(releaseEnvelope);
  unknownTierEnvelope.artifact.releaseTier = "UNKNOWN_TIER";
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [unknownTierEnvelope],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-artifact-release-tier-invalid/,
  );
  assert.equal(calls, 0);

  const corruptReleasableEnvelope = clone(releaseEnvelope);
  corruptReleasableEnvelope.artifact.artifactId = "artifact-z-corrupt";
  corruptReleasableEnvelope.artifact.candidateId = "candidate-corrupt";
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [releaseEnvelope, corruptReleasableEnvelope],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-release-envelope-artifact-mismatch/,
  );
  assert.equal(calls, 0);
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        request,
        [corruptReleasableEnvelope],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /bank-release-envelope-artifact-mismatch/,
  );
  assert.equal(calls, 0);

  const forgedCurrentSources = clone(currentSources);
  forgedCurrentSources.rightsManifests[0].rightsHolder = "Caller-forged current authority";
  refreshSourceRegistryExport(forgedCurrentSources);
  assert.throws(
    () => selectBankFirstOrGenerateOnGap(
      request,
      [releaseEnvelope],
      forgedCurrentSources,
      sourceRegistryExportBinding(forgedCurrentSources),
      generationPlan(),
    ),
    /bank-assignment-current-source-authority-invalid/,
  );
  assert.equal(calls, 0);
  const forgedGap = selectBankFirstOrGenerateOnGap(
    { ...request, requestId: "request-forged-current-gap" },
    [],
    forgedCurrentSources,
    sourceRegistryExportBinding(forgedCurrentSources),
    generationPlan(),
  );
  assert.equal(forgedGap.kind, "BLOCKED");
  assert.equal(forgedGap.reasonCode, "TRUSTED_SOURCE_REGISTRY_REQUIRED_BEFORE_GENERATION");
  assert.equal(calls, 0);

  const revokedCurrentSources = sourceRegistry({
    asOf: request.occurredAt,
    rightsManifests: [rightsManifest({ status: "REVOKED" })],
  });
  for (const [name, registry] of [
    ["missing", null],
    ["stale", sourceRegistry({ asOf: T2 })],
    ["revoked", revokedCurrentSources],
    ["purpose", sourceRegistry({
      asOf: request.occurredAt,
      rightsManifests: [rightsManifest({ permittedPurposes: ["QUESTION_BLUEPRINT_EXTRACTION", "QUESTION_GENERATION_CONTEXT"] })],
    })],
    ["superseded", sourceRegistry({
      asOf: request.occurredAt,
      sourceVersions: [sourceBinding({ status: "SUPERSEDED" }), similaritySourceBinding()],
    })],
  ]) {
    assert.throws(
      () => selectBankFirstOrGenerateOnGap(
        request,
        [releaseEnvelope],
        registry,
        registry === null ? null : sourceRegistryExportBinding(registry),
        generationPlan(),
      ),
      /bank-assignment-current-source/,
      name,
    );
    assert.equal(calls, 0, name);
  }

  const blocked = selectBankFirstOrGenerateOnGap(
    { ...request, requestId: "request-2", offlineGenerationOnGapAuthorized: false },
    [],
    currentSources,
    sourceRegistryExportBinding(currentSources),
    generationPlan(),
  );
  assert.equal(blocked.kind, "BLOCKED");
  assert.equal(blocked.scarcityEvent.containsBody, false);
  assert.equal(calls, 0);

  for (const authorityValue of [undefined, null, "false", 0, 1, {}]) {
    const invalidRequest = { ...request, offlineGenerationOnGapAuthorized: authorityValue };
    if (authorityValue === undefined) delete invalidRequest.offlineGenerationOnGapAuthorized;
    assert.throws(
      () =>
        selectBankFirstOrGenerateOnGap(
          invalidRequest,
          [],
          currentSources,
          sourceRegistryExportBinding(currentSources),
          generationPlan(),
        ),
      /invalid-bank-selection-request/,
      String(authorityValue),
    );
    assert.equal(calls, 0, String(authorityValue));
  }
  assert.throws(
    () =>
      selectBankFirstOrGenerateOnGap(
        { ...request, unexpectedAuthority: true },
        [],
        currentSources,
        sourceRegistryExportBinding(currentSources),
        generationPlan(),
      ),
    /invalid-bank-selection-request:closed-shape/,
  );
  assert.equal(calls, 0);

  const rightsBlocked = selectBankFirstOrGenerateOnGap(
    { ...request, requestId: "request-rights-blocked" },
    [],
    null,
    null,
    generationPlan(),
  );
  assert.equal(rightsBlocked.kind, "BLOCKED");
  assert.equal(rightsBlocked.reasonCode, "TRUSTED_SOURCE_REGISTRY_REQUIRED_BEFORE_GENERATION");
  assert.equal(calls, 0);

  for (const [name, planOverride] of [
    ["batchId", { batchId: "" }],
    ["batchIdType", { batchId: true }],
    ["derivedBatchIds", { batchId: "b".repeat(200) }],
    ["generatorId", { generatorId: "" }],
    ["generatorVersion", { generatorVersion: "" }],
    ["generationRunId", { generationRunId: "" }],
    ["generatorModelIdentity", {
      generatorModelIdentity: { ...modelIdentity("generator-family"), modelArtifactDigest: "bad" },
    }],
    ["generatorModelIdentityType", {
      generatorModelIdentity: { ...modelIdentity("generator-family"), providerId: true },
    }],
    ["generatorExecutionIds", {
      generatorExecutionIds: ["unsafe execution id", "gap-generator-execution-2"],
    }],
    ["unknownField", { unknownGenerationField: true }],
  ]) {
    assert.throws(
      () =>
        selectBankFirstOrGenerateOnGap(
          request,
          [],
          currentSources,
          sourceRegistryExportBinding(currentSources),
          generationPlan(planOverride),
        ),
      /generation-plan/,
      name,
    );
    assert.equal(calls, 0, name);
  }

  const generated = selectBankFirstOrGenerateOnGap(
    { ...request, requestId: "request-3" },
    [],
    currentSources,
    sourceRegistryExportBinding(currentSources),
    generationPlan(),
  );
  assert.equal(generated.kind, "OFFLINE_GENERATION_GAP");
  assert.equal(generated.generatedBatch.offline, true);
  assert.ok(generated.generatedBatch.candidates.every((candidate) => candidate.initialState === "QUARANTINED"));
  assert.equal(calls, 2);

  const fabricatedEnvelope = clone(releaseEnvelope);
  fabricatedEnvelope.artifact.releaseTier = "TRANSFER_VERIFIED";
  assert.throws(
    () => selectBankFirstOrGenerateOnGap(
      request,
      [fabricatedEnvelope],
      currentSources,
      sourceRegistryExportBinding(currentSources),
      null,
    ),
    /bank-release-envelope-artifact-mismatch/,
  );
  const wrongSubjectPlan = generationPlan({ blueprint: { subject: "civil_law" } });
  assert.throws(
    () => selectBankFirstOrGenerateOnGap(
      request,
      [],
      currentSources,
      sourceRegistryExportBinding(currentSources),
      wrongSubjectPlan,
    ),
    /plan-not-bound-to-request/,
  );
});

test("dispute, revision and retirement are immutable, lineage-preserving and stale-write safe", () => {
  const bundleValue = personalBundle();
  const decision = evaluateQuestionRelease(
    bundleValue,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(bundleValue),
  );
  const auditRun = createReleaseAudit(bundleValue, decision, "audit-lifecycle-1");
  const artifact = createQuestionBankArtifact({
    artifactId: "artifact-lifecycle-1",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext: personalTrustContext(bundleValue),
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
      evidenceDigest: canonicalDigest({ stepId, kind, actorId }),
      inputDigest: priorDigest,
      outputDigest,
    };
    priorDigest = outputDigest;
    return step;
  });
  return { actors, steps };
}

function createReleaseAudit(bundleValue, decision, auditRunId) {
  const trustContext = decision.requestedTier === "TRANSFER_VERIFIED"
    ? transferTrustContext(bundleValue)
    : personalTrustContext(bundleValue);
  return createReleaseAuditRun({
    auditRunId,
    bundle: bundleValue,
    decision,
    trustContext,
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
        evidenceDigest: canonicalDigest(outputArtifact),
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
  const decision = evaluateQuestionRelease(
    bundleValue,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(bundleValue),
  );
  const auditRun = createReleaseAudit(bundleValue, decision, "release-audit-bound-1");
  const input = {
    artifactId: "artifact-bound-1",
    bundle: bundleValue,
    requestedTier: "PERSONAL_LEARNING_USABLE",
    decision,
    trustContext: personalTrustContext(bundleValue),
    auditRun,
    occurredAt: "2026-08-25T00:12:00.000Z",
  };
  const artifact = createQuestionBankArtifact(input);
  assert.equal(artifact.auditRunId, auditRun.auditRunId);
  assert.equal(artifact.releaseTier, decision.releasedTier);
  const staleReleaseRegistryBundle = personalBundle();
  staleReleaseRegistryBundle.trustedSources = sourceRegistry({ asOf: T2 });
  const staleReleaseDecision = evaluateQuestionRelease(
    staleReleaseRegistryBundle,
    "PERSONAL_LEARNING_USABLE",
  );
  assert.throws(
    () => createReleaseAuditRun({
      auditRunId: "stale-release-registry",
      bundle: staleReleaseRegistryBundle,
      decision: staleReleaseDecision,
      trustContext: personalTrustContext(staleReleaseRegistryBundle),
      completedAt: "2026-08-25T00:12:00.000Z",
    }),
    /release-source-registry-must-match-audit-completion/,
  );
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
  const otherDecision = evaluateQuestionRelease(
    otherBundle,
    "PERSONAL_LEARNING_USABLE",
    personalTrustContext(otherBundle),
  );
  const unrelatedAudit = createReleaseAudit(otherBundle, otherDecision, "unrelated-audit");
  assert.throws(
    () => createQuestionBankArtifact({ ...input, auditRun: unrelatedAudit }),
    /invalid-release-audit:.*RELEASE_AUDIT_(INPUT|OUTPUT)_NOT_BOUND/,
  );

  const genericFixture = auditFixture(bundleValue, decision);
  const genericButSemanticUnbound = createAuditRun({
    auditRunId: "generic-but-semantic-unbound",
    input: bundleValue,
    output: decision,
    actors: genericFixture.actors,
    steps: genericFixture.steps,
    startedAt: "2026-08-25T00:00:00.000Z",
    completedAt: "2026-08-25T00:12:00.000Z",
  });
  assert.equal(validateAuditRun(genericButSemanticUnbound).valid, true);
  assert.equal(
    validateReleaseAuditRun(
      genericButSemanticUnbound,
      bundleValue,
      decision,
      personalTrustContext(bundleValue),
    ).valid,
    false,
  );
  assert.throws(
    () => createQuestionBankArtifact({ ...input, auditRun: genericButSemanticUnbound }),
    /invalid-release-audit:.*RELEASE_AUDIT_/,
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
    await writeFile(
      inputPath,
      JSON.stringify({
        batch: batch(),
        registry: sourceRegistry(),
        sourceRegistryExportBinding: sourceRegistryExportBinding(sourceRegistry()),
      }),
      "utf8",
    );
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

    await writeFile(
      inputPath,
      JSON.stringify({ bundle: personalBundle(), requestedTier: "QUARANTINED" }),
      "utf8",
    );
    const invalidTierRun = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "scripts/offline/question-foundry-v1.mjs",
        "--action",
        "evaluate-release",
        "--input",
        inputPath,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(invalidTierRun.status, 1);
    assert.match(invalidTierRun.stderr, /INVALID_REQUESTED_RELEASE_TIER/);

    const cliBundle = personalBundle();
    const validTrustContext = personalTrustContext(cliBundle);
    await writeFile(
      inputPath,
      JSON.stringify({
        bundle: cliBundle,
        requestedTier: "PERSONAL_LEARNING_USABLE",
        trustContext: validTrustContext,
      }),
      "utf8",
    );
    const signedReleaseRun = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "scripts/offline/question-foundry-v1.mjs",
        "--action",
        "evaluate-release",
        "--input",
        inputPath,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(signedReleaseRun.status, 0, signedReleaseRun.stderr);
    assert.equal(JSON.parse(signedReleaseRun.stdout).allowed, true);

    const forgedTrustContext = clone(validTrustContext);
    forgedTrustContext.modelExecutionExportBinding.detachedSignature = "AA==";
    await writeFile(
      inputPath,
      JSON.stringify({
        bundle: cliBundle,
        requestedTier: "PERSONAL_LEARNING_USABLE",
        trustContext: forgedTrustContext,
      }),
      "utf8",
    );
    const forgedReleaseRun = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "scripts/offline/question-foundry-v1.mjs",
        "--action",
        "evaluate-release",
        "--input",
        inputPath,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    assert.equal(forgedReleaseRun.status, 1);
    assert.ok(
      JSON.parse(forgedReleaseRun.stdout).blockingCodes.includes(
        "TRUSTED_MODEL_EXECUTION_EXPORT_BINDING_REQUIRED",
      ),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
