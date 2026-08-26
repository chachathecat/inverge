import {
  QUESTION_FOUNDRY_RELEASABLE_TIERS,
  type AuditRunV1,
  type QuestionBankArtifactV1,
  type QuestionCandidateV1,
  type QuestionFoundryReleasableTier,
  type QuestionFoundryModelIdentityV1,
  type QuestionFoundryReleaseTier,
  type ReleaseDecisionV1,
  type ReleaseEvidenceBundleV1,
  type ReleaseTrustContextV1,
  type SealedTransferVariantV1,
  type TrustedModelExecutionRegistryV1,
  type TrustedOwnerAdjudicationRegistryV1,
  type TrustedOwnerResponseRegistryV1,
  type TrustedSealedTransferVariantRegistryV1,
} from "./contracts";
import { validateAuditRun, validateReleaseAuditRun } from "./audit-run";
import {
  buildSimilarityFirewallReview,
  canonicalDigest,
  normalizeQuestionText,
  QUESTION_FOUNDRY_SIMILARITY_THRESHOLD,
  reviewDistractorsAndAnswerClues,
  validateCandidateBatch,
  validateCandidateCalculation,
  validateGeneratorJudgeSolverSeparation,
  validateMetaAuditBundle,
  validateTrustedSourceRegistryAuthority,
  validateTrustedSourceBindings,
} from "./validation";

export const QUESTION_FOUNDRY_MINIMUM_OWNER_RESPONSES_FOR_MEASUREMENT = 30;
export const QUESTION_FOUNDRY_MINIMUM_OWNER_SESSIONS_FOR_MEASUREMENT = 3;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/u;
const BASE64_SIGNATURE = /^[A-Za-z0-9+/]+={0,2}$/u;
const MODEL_EXECUTION_AUTHORITY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAwR8q8NyIIz+B3owiXPRnSi71rVlGg0tK+avF5jkk/EA=
-----END PUBLIC KEY-----
`;
const OWNER_ADJUDICATION_AUTHORITY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA20fYuWZRPW5ihBa+pDYovFHPA8YXgjpmq7Io0Pyh0cE=
-----END PUBLIC KEY-----
`;

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function modelProviderVersionKey(value: QuestionFoundryModelIdentityV1): string {
  return canonicalDigest([value.providerId, value.modelVersionId]);
}

function hasExactKeys(value: unknown, keys: readonly string[]) {
  return (
    isRecord(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function validateReleaseEvidenceSchemas(
  bundle: ReleaseEvidenceBundleV1,
  trustContext: ReleaseTrustContextV1,
  errors: string[],
) {
  if (!hasExactKeys(bundle, [
    "batch",
    "selectedCandidateId",
    "trustedSources",
    "trustedModelExecutions",
    "blindSolverReviews",
    "judgeReviews",
    "similarityReferences",
    "similarityReview",
    "metaAudits",
    "ownerAdjudication",
    "trustedOwnerAdjudicationRegistry",
    "transferEvidence",
    "ownerResponseEvidence",
    "trustedOwnerResponseRegistry",
  ])) errors.push("RELEASE_EVIDENCE_SCHEMA_NOT_CLOSED");
  for (const [index, review] of bundle.blindSolverReviews.entries()) {
    if (!hasExactKeys(review, [
      "reviewId",
      "solverId",
      "solverVersion",
      "solverModelIdentity",
      "solverExecutionId",
      "candidateId",
      "optionPermutationId",
      "blind",
      "candidateAnswerExposed",
      "candidateExplanationExposed",
      "selectedOptionId",
      "reasoningDigest",
      "ambiguityDetected",
      "plausibleCorrectOptionIds",
      "completedAt",
    ])) errors.push(`BLIND_SOLVER_REVIEW_SCHEMA_NOT_CLOSED:${index}`);
  }
  for (const [index, review] of bundle.judgeReviews.entries()) {
    if (!hasExactKeys(review, [
      "reviewId",
      "judgeId",
      "judgeVersion",
      "judgeModelIdentity",
      "judgeExecutionId",
      "candidateId",
      "anonymizedCandidate",
      "approved",
      "singleCorrectAnswer",
      "ambiguityDetected",
      "sourceVersionValid",
      "deterministicCalculationValid",
      "distractorsPlausibleAndIncorrect",
      "answerClueDetected",
      "nearCopyDetected",
      "reconstructionRiskDetected",
      "unresolvedReasonCodes",
      "completedAt",
    ])) errors.push(`JUDGE_REVIEW_SCHEMA_NOT_CLOSED:${index}`);
  }
  for (const [index, reference] of bundle.similarityReferences.entries()) {
    if (!hasExactKeys(reference, [
      "referenceId",
      "sourceId",
      "sourceVersionId",
      "sourceClass",
      "rightsManifestId",
      "rightsManifestVersionId",
      "contentDigest",
      "body",
    ])) errors.push(`SIMILARITY_REFERENCE_SCHEMA_NOT_CLOSED:${index}`);
  }
  if (bundle.ownerAdjudication !== null && !hasExactKeys(bundle.ownerAdjudication, [
    "adjudicationId",
    "adjudicatorId",
    "adjudicatorVersion",
    "adjudicatorRole",
    "candidateId",
    "decision",
    "sourceAndRightsReviewed",
    "ambiguityReviewed",
    "calculationReviewed",
    "evidenceDigest",
    "decidedAt",
    "source",
    "modelAlone",
  ])) errors.push("OWNER_ADJUDICATION_SCHEMA_NOT_CLOSED");
  if (bundle.trustedOwnerAdjudicationRegistry !== null) {
    if (!hasExactKeys(bundle.trustedOwnerAdjudicationRegistry, [
      "registryVersion",
      "source",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "verifiedAt",
      "remoteReadPerformed",
      "receiptsDigest",
      "receipts",
    ])) errors.push("OWNER_ADJUDICATION_REGISTRY_SCHEMA_NOT_CLOSED");
    for (const [index, receipt] of bundle.trustedOwnerAdjudicationRegistry.receipts.entries()) {
      if (!hasExactKeys(receipt, [
        "adjudicationId",
        "adjudicatorId",
        "adjudicatorVersion",
        "adjudicatorRole",
        "candidateId",
        "decision",
        "sourceAndRightsReviewed",
        "ambiguityReviewed",
        "calculationReviewed",
        "evidenceDigest",
        "decidedAt",
        "source",
        "modelAlone",
      ])) errors.push(`OWNER_ADJUDICATION_REGISTRY_RECEIPT_SCHEMA_NOT_CLOSED:${index}`);
    }
  }
  if (bundle.transferEvidence !== null && !hasExactKeys(bundle.transferEvidence, [
    "bundleId",
    "candidateId",
    "sealedBeforeEvaluation",
    "sealedVariantRegistry",
    "evaluatorReceipts",
    "completedAt",
    "evidenceDigest",
  ])) errors.push("TRANSFER_EVIDENCE_SCHEMA_NOT_CLOSED");
  const sealedRegistry = bundle.transferEvidence?.sealedVariantRegistry;
  if (sealedRegistry && !hasExactKeys(sealedRegistry, [
    "registryVersion",
    "source",
    "exportId",
    "exportVersionId",
    "exportContentDigest",
    "verifiedAt",
    "remoteReadPerformed",
    "variantsDigest",
    "variants",
  ])) errors.push("SEALED_TRANSFER_VARIANT_REGISTRY_SCHEMA_NOT_CLOSED");
  for (const [index, variant] of sealedRegistry?.variants.entries() ?? []) {
    if (!hasExactKeys(variant, [
      "transferVariantId",
      "sourceCandidateId",
      "blueprintId",
      "blueprintVersionId",
      "answerSpecificationId",
      "sourceBindingDigest",
      "rightsBoundary",
      "stem",
      "options",
      "expectedOptionId",
      "sealedAt",
      "answerHiddenDuringEvaluation",
      "visibleContentDigest",
      "lineageDigest",
      "sealedVariantDigest",
    ])) errors.push(`SEALED_TRANSFER_VARIANT_SCHEMA_NOT_CLOSED:${index}`);
    for (const [optionIndex, option] of variant.options.entries()) {
      if (!hasExactKeys(option, ["optionId", "body"])) {
        errors.push(`SEALED_TRANSFER_VARIANT_OPTION_SCHEMA_NOT_CLOSED:${index}:${optionIndex}`);
      }
    }
  }
  for (const [index, receipt] of bundle.transferEvidence?.evaluatorReceipts.entries() ?? []) {
    if (!hasExactKeys(receipt, [
      "receiptId",
      "evaluatorId",
      "evaluatorVersion",
      "evaluatorModelIdentity",
      "evaluatorExecutionId",
      "candidateId",
      "transferVariantId",
      "visibleVariantDigest",
      "sealedVariantDigest",
      "sealedAt",
      "evaluatedAt",
      "selectedOptionId",
      "expectedOptionId",
      "correct",
      "answerExposureBeforeEvaluation",
      "inputDigest",
      "outputDigest",
    ])) errors.push(`TRANSFER_EVALUATION_RECEIPT_SCHEMA_NOT_CLOSED:${index}`);
  }
  const modelRegistry = bundle.trustedModelExecutions;
  if (!hasExactKeys(modelRegistry, [
    "registryVersion",
    "source",
    "exportId",
    "exportVersionId",
    "exportContentDigest",
    "verifiedAt",
    "remoteReadPerformed",
    "modelsDigest",
    "receiptsDigest",
    "models",
    "receipts",
  ])) errors.push("TRUSTED_MODEL_EXECUTION_REGISTRY_SCHEMA_NOT_CLOSED");
  for (const [index, model] of modelRegistry.models.entries()) {
    if (!hasExactKeys(model, [
      "registryModelId",
      "modelIdentity",
      "status",
      "validFrom",
      "validUntil",
      "provenanceDigest",
    ])) errors.push(`TRUSTED_MODEL_CATALOG_ENTRY_SCHEMA_NOT_CLOSED:${index}`);
    if (!hasExactKeys(model.modelIdentity, [
      "providerId",
      "modelFamilyId",
      "modelVersionId",
      "modelArtifactDigest",
    ])) errors.push(`TRUSTED_MODEL_IDENTITY_SCHEMA_NOT_CLOSED:${index}`);
  }
  for (const [index, receipt] of modelRegistry.receipts.entries()) {
    if (!hasExactKeys(receipt, [
      "executionId",
      "registryModelId",
      "actorId",
      "actorVersion",
      "role",
      "inputDigest",
      "outputDigest",
      "completedAt",
      "offline",
      "providerCalls",
      "selfAsserted",
    ])) errors.push(`MODEL_EXECUTION_RECEIPT_SCHEMA_NOT_CLOSED:${index}`);
  }
  const receiptKeys = [
    "receiptId",
    "candidateId",
    "ownerId",
    "actualOwnerResponses",
    "responseIds",
    "responseCount",
    "distinctSessionCount",
    "firstResponseAt",
    "lastResponseAt",
    "responseBodiesStored",
    "source",
  ] as const;
  if (bundle.ownerResponseEvidence !== null && !hasExactKeys(bundle.ownerResponseEvidence, receiptKeys)) {
    errors.push("OWNER_RESPONSE_EVIDENCE_SCHEMA_NOT_CLOSED");
  }
  if (bundle.trustedOwnerResponseRegistry !== null) {
    if (!hasExactKeys(bundle.trustedOwnerResponseRegistry, [
      "registryVersion",
      "source",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "verifiedAt",
      "remoteReadPerformed",
      "receiptsDigest",
      "receipts",
    ])) errors.push("OWNER_RESPONSE_REGISTRY_SCHEMA_NOT_CLOSED");
    for (const [index, receipt] of bundle.trustedOwnerResponseRegistry.receipts.entries()) {
      if (!hasExactKeys(receipt, receiptKeys)) {
        errors.push(`OWNER_RESPONSE_REGISTRY_RECEIPT_SCHEMA_NOT_CLOSED:${index}`);
      }
    }
  }
  if (!hasExactKeys(trustContext, [
    "sourceRegistryExportBinding",
    "modelExecutionExportBinding",
    "sealedVariantExportBinding",
    "ownerAdjudicationExportBinding",
    "ownerResponseExportBinding",
  ])) {
    errors.push("RELEASE_TRUST_CONTEXT_SCHEMA_NOT_CLOSED");
  }
  if (trustContext.sourceRegistryExportBinding !== null && !hasExactKeys(
    trustContext.sourceRegistryExportBinding,
    [
      "bindingVersion",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "registryDigest",
      "validatorId",
      "authorityKeyId",
      "signatureAlgorithm",
      "detachedSignature",
      "actualRightsAuthorityRead",
      "syntheticOrSimulated",
      "verified",
    ],
  )) errors.push("SOURCE_REGISTRY_EXPORT_BINDING_SCHEMA_NOT_CLOSED");
  if (trustContext.modelExecutionExportBinding !== null && !hasExactKeys(
    trustContext.modelExecutionExportBinding,
    [
      "bindingVersion",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "registryDigest",
      "validatorId",
      "authorityKeyId",
      "signatureAlgorithm",
      "detachedSignature",
      "actualExecutionLogRead",
      "syntheticOrSimulated",
      "verified",
    ],
  )) errors.push("MODEL_EXECUTION_EXPORT_BINDING_SCHEMA_NOT_CLOSED");
  if (trustContext.sealedVariantExportBinding !== null && !hasExactKeys(
    trustContext.sealedVariantExportBinding,
    [
      "bindingVersion",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "registryDigest",
      "validatorId",
      "authorityKeyId",
      "signatureAlgorithm",
      "detachedSignature",
      "actualSealedVariantRegistryRead",
      "syntheticOrSimulated",
      "verified",
    ],
  )) errors.push("SEALED_TRANSFER_VARIANT_EXPORT_BINDING_SCHEMA_NOT_CLOSED");
  if (trustContext.ownerAdjudicationExportBinding !== null && !hasExactKeys(
    trustContext.ownerAdjudicationExportBinding,
    [
      "bindingVersion",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "registryDigest",
      "validatorId",
      "authorityKeyId",
      "signatureAlgorithm",
      "detachedSignature",
      "actualOwnerIdentityRead",
      "syntheticOrSimulated",
      "verified",
    ],
  )) errors.push("OWNER_ADJUDICATION_EXPORT_BINDING_SCHEMA_NOT_CLOSED");
  if (trustContext.ownerResponseExportBinding !== null && !hasExactKeys(
    trustContext.ownerResponseExportBinding,
    [
      "bindingVersion",
      "exportId",
      "exportVersionId",
      "exportContentDigest",
      "registryDigest",
      "validatorId",
      "actualOwnerRuntimeRead",
      "syntheticOrSimulated",
      "verified",
    ],
  )) errors.push("OWNER_RESPONSE_EXPORT_BINDING_SCHEMA_NOT_CLOSED");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function uniqueErrors(errors: readonly string[]) {
  return [...new Set(errors)].sort();
}

function hasValidPinnedSignature(
  binding: Record<string, unknown>,
  publicKey: string,
) {
  const { detachedSignature, ...signedPayload } = binding;
  if (
    typeof detachedSignature !== "string" ||
    !BASE64_SIGNATURE.test(detachedSignature)
  ) {
    return false;
  }
  try {
    return verifySignature(
      null,
      Buffer.from(canonicalDigest(signedPayload), "utf8"),
      publicKey,
      Buffer.from(detachedSignature, "base64"),
    );
  } catch {
    return false;
  }
}

function selectedCandidate(bundle: ReleaseEvidenceBundleV1): QuestionCandidateV1 | null {
  return (
    bundle.batch.candidates.find(
      (candidate) => candidate.candidateId === bundle.selectedCandidateId,
    ) ?? null
  );
}

type ExpectedModelExecution = Readonly<{
  executionId: string;
  actorId: string;
  actorVersion: string;
  role:
    | "GENERATOR"
    | "BLIND_SOLVER"
    | "JUDGE"
    | "META_EVALUATOR"
    | "TRANSFER_EVALUATOR"
    | "DRIFT_BASELINE"
    | "DRIFT_CURRENT";
  modelIdentity: QuestionFoundryModelIdentityV1;
  inputDigest: string;
  outputDigest: string;
  completedAt: string;
}>;

function withoutExecutionId(value: Record<string, unknown>, field: string) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

function blindSolverVisibleInput(
  bundle: ReleaseEvidenceBundleV1,
  review: ReleaseEvidenceBundleV1["blindSolverReviews"][number],
) {
  const candidate = bundle.batch.candidates.find(
    (entry) => entry.candidateId === review.candidateId,
  );
  const permutation = bundle.batch.optionOrderPermutations.find(
    (entry) => entry.permutationId === review.optionPermutationId,
  );
  const optionsById = new Map(candidate?.options.map((option) => [option.optionId, option]));
  return {
    candidateId: candidate?.candidateId ?? null,
    blueprintId: candidate?.blueprintId ?? null,
    blueprintVersionId: candidate?.blueprintVersionId ?? null,
    stem: candidate?.stem ?? null,
    optionPermutationId: permutation?.permutationId ?? null,
    orderedOptions: permutation?.optionIds.map((optionId) => optionsById.get(optionId) ?? null) ?? null,
  };
}

function anonymizedJudgeVisibleInput(
  bundle: ReleaseEvidenceBundleV1,
  review: ReleaseEvidenceBundleV1["judgeReviews"][number],
) {
  const candidate = bundle.batch.candidates.find(
    (entry) => entry.candidateId === review.candidateId,
  );
  return {
    candidate: candidate
      ? {
          blueprintId: candidate.blueprintId,
          blueprintVersionId: candidate.blueprintVersionId,
          answerSpecificationId: candidate.answerSpecificationId,
          stem: candidate.stem,
          options: candidate.options,
          proposedCorrectOptionId: candidate.proposedCorrectOptionId,
          explanation: candidate.explanation,
          sourceBindingDigest: candidate.sourceBindingDigest,
          rightsBoundary: candidate.rightsBoundary,
        }
      : null,
    answerSpecification: bundle.batch.answerSpecification,
    similarityReferences: bundle.similarityReferences,
    similarityReview: bundle.similarityReview,
  };
}

function expectedModelExecutions(bundle: ReleaseEvidenceBundleV1): ExpectedModelExecution[] {
  const expected: ExpectedModelExecution[] = [];
  for (const [candidateIndex, candidate] of bundle.batch.candidates.entries()) {
    expected.push({
      executionId: candidate.generatorExecutionId,
      actorId: candidate.generatorId,
      actorVersion: candidate.generatorVersion,
      role: "GENERATOR",
      modelIdentity: candidate.generatorModelIdentity,
      inputDigest: canonicalDigest({
        blueprint: bundle.batch.blueprint,
        answerSpecification: bundle.batch.answerSpecification,
        candidateIndex,
        candidateId: candidate.candidateId,
        generationRunId: candidate.generationRunId,
      }),
      outputDigest: canonicalDigest(withoutExecutionId(candidate as unknown as Record<string, unknown>, "generatorExecutionId")),
      completedAt: candidate.generatedAt,
    });
  }
  for (const review of bundle.blindSolverReviews) {
    expected.push({
      executionId: review.solverExecutionId,
      actorId: review.solverId,
      actorVersion: review.solverVersion,
      role: "BLIND_SOLVER",
      modelIdentity: review.solverModelIdentity,
      inputDigest: canonicalDigest(blindSolverVisibleInput(bundle, review)),
      outputDigest: canonicalDigest(withoutExecutionId(review as unknown as Record<string, unknown>, "solverExecutionId")),
      completedAt: review.completedAt,
    });
  }
  for (const review of bundle.judgeReviews) {
    expected.push({
      executionId: review.judgeExecutionId,
      actorId: review.judgeId,
      actorVersion: review.judgeVersion,
      role: "JUDGE",
      modelIdentity: review.judgeModelIdentity,
      inputDigest: canonicalDigest(anonymizedJudgeVisibleInput(bundle, review)),
      outputDigest: canonicalDigest(withoutExecutionId(review as unknown as Record<string, unknown>, "judgeExecutionId")),
      completedAt: review.completedAt,
    });
  }
  for (const run of bundle.metaAudits.selfPreference.runs) {
    expected.push({
      executionId: run.evaluatorExecutionId,
      actorId: run.evaluatorId,
      actorVersion: run.evaluatorVersion,
      role: "META_EVALUATOR",
      modelIdentity: run.evaluatorModelIdentity,
      inputDigest: canonicalDigest({
        auditKind: "SELF_PREFERENCE",
        anonymizedCandidateDigest: run.anonymizedCandidateDigest,
      }),
      outputDigest: canonicalDigest(withoutExecutionId(run as unknown as Record<string, unknown>, "evaluatorExecutionId")),
      completedAt: run.completedAt,
    });
  }
  for (const run of bundle.metaAudits.orderBias.runs) {
    expected.push({
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
      outputDigest: canonicalDigest(withoutExecutionId(run as unknown as Record<string, unknown>, "evaluatorExecutionId")),
      completedAt: run.completedAt,
    });
  }
  for (const run of bundle.metaAudits.repeatedStability.runs) {
    expected.push({
      executionId: run.evaluatorExecutionId,
      actorId: run.evaluatorId,
      actorVersion: run.evaluatorVersion,
      role: "META_EVALUATOR",
      modelIdentity: run.evaluatorModelIdentity,
      inputDigest: canonicalDigest({
        auditKind: "REPEATED_STABILITY",
        fixtureDigest: run.fixtureDigest,
      }),
      outputDigest: canonicalDigest(withoutExecutionId(run as unknown as Record<string, unknown>, "evaluatorExecutionId")),
      completedAt: run.completedAt,
    });
  }
  for (const fixture of bundle.metaAudits.judgeDrift.fixtures) {
    for (const [role, outcome] of [
      ["DRIFT_BASELINE", fixture.baseline],
      ["DRIFT_CURRENT", fixture.current],
    ] as const) {
      expected.push({
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
        outputDigest: canonicalDigest(withoutExecutionId(outcome as unknown as Record<string, unknown>, "judgeExecutionId")),
        completedAt: outcome.completedAt,
      });
    }
  }
  for (const receipt of bundle.transferEvidence?.evaluatorReceipts ?? []) {
    expected.push({
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
  return expected;
}

function trustedModelExportProjection(registry: TrustedModelExecutionRegistryV1) {
  const models = [...registry.models].sort((left, right) =>
    left.registryModelId.localeCompare(right.registryModelId));
  const receipts = [...registry.receipts].sort((left, right) =>
    left.executionId.localeCompare(right.executionId));
  return {
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    modelsDigest: registry.modelsDigest,
    receiptsDigest: registry.receiptsDigest,
    models,
    receipts,
  };
}

function validateTrustedModelExecutions(
  bundle: ReleaseEvidenceBundleV1,
  trustContext: ReleaseTrustContextV1,
  errors: string[],
) {
  const registry = bundle.trustedModelExecutions;
  const binding = trustContext.modelExecutionExportBinding;
  let expected: ExpectedModelExecution[] = [];
  try {
    expected = expectedModelExecutions(bundle);
  } catch {
    errors.push("TRUSTED_MODEL_EXECUTION_EVIDENCE_INVALID");
  }
  const sortedModels = [...registry.models].sort((left, right) =>
    left.registryModelId.localeCompare(right.registryModelId));
  const sortedReceipts = [...registry.receipts].sort((left, right) =>
    left.executionId.localeCompare(right.executionId));
  if (
    registry.registryVersion !== "question_foundry.trusted_model_execution_registry.v1" ||
    registry.source !== "LOCAL_OWNER_VERIFIED_MODEL_EXECUTION_EXPORT" ||
    !SAFE_ID.test(registry.exportId) ||
    !SAFE_ID.test(registry.exportVersionId) ||
    !isIsoInstant(registry.verifiedAt) ||
    Date.parse(registry.verifiedAt) > Date.parse(bundle.trustedSources.asOf) ||
    registry.remoteReadPerformed !== false ||
    canonicalDigest(registry.models) !== canonicalDigest(sortedModels) ||
    canonicalDigest(registry.receipts) !== canonicalDigest(sortedReceipts) ||
    registry.modelsDigest !== canonicalDigest(sortedModels) ||
    registry.receiptsDigest !== canonicalDigest(sortedReceipts) ||
    registry.exportContentDigest !== canonicalDigest(trustedModelExportProjection(registry))
  ) {
    errors.push("TRUSTED_MODEL_EXECUTION_EXPORT_INVALID");
  }
  if (
    registry.models.length === 0 ||
    new Set(registry.models.map((entry) => entry.registryModelId)).size !== registry.models.length ||
    new Set(registry.receipts.map((entry) => entry.executionId)).size !== registry.receipts.length ||
    new Set(expected.map((entry) => entry.executionId)).size !== expected.length ||
    registry.receipts.length !== expected.length
  ) {
    errors.push("TRUSTED_MODEL_EXECUTION_CARDINALITY_INVALID");
  }
  if (
    binding === null ||
    binding.bindingVersion !== "question_foundry.trusted_model_execution_export_binding.v1" ||
    binding.validatorId !== "trusted_model_execution_export_validator" ||
    binding.authorityKeyId !== "question-foundry-model-execution-authority-2026-08-27" ||
    binding.signatureAlgorithm !== "Ed25519" ||
    !hasValidPinnedSignature(binding as unknown as Record<string, unknown>, MODEL_EXECUTION_AUTHORITY_PUBLIC_KEY) ||
    binding.actualExecutionLogRead !== true ||
    binding.syntheticOrSimulated !== false ||
    binding.verified !== true ||
    binding.exportId !== registry.exportId ||
    binding.exportVersionId !== registry.exportVersionId ||
    binding.exportContentDigest !== registry.exportContentDigest ||
    binding.registryDigest !== canonicalDigest(registry)
  ) {
    errors.push("TRUSTED_MODEL_EXECUTION_EXPORT_BINDING_REQUIRED");
  }
  const providerVersions = new Map<string, string>();
  const artifactFamilies = new Map<string, string>();
  for (const model of registry.models) {
    const identity = model.modelIdentity;
    const identityValid =
      SAFE_ID.test(model.registryModelId) &&
      SAFE_ID.test(identity.providerId) &&
      SAFE_ID.test(identity.modelFamilyId) &&
      SAFE_ID.test(identity.modelVersionId) &&
      SHA256.test(identity.modelArtifactDigest) &&
      SHA256.test(model.provenanceDigest) &&
      model.status === "ACTIVE" &&
      isIsoInstant(model.validFrom) &&
      isIsoInstant(model.validUntil) &&
      Date.parse(model.validFrom) <= Date.parse(registry.verifiedAt) &&
      Date.parse(registry.verifiedAt) <= Date.parse(model.validUntil);
    if (!identityValid) errors.push(`TRUSTED_MODEL_CATALOG_ENTRY_INVALID:${model.registryModelId}`);
    const identityDigest = canonicalDigest(identity);
    const providerVersion = modelProviderVersionKey(identity);
    const priorProviderVersion = providerVersions.get(providerVersion);
    if (priorProviderVersion && priorProviderVersion !== identityDigest) {
      errors.push(`TRUSTED_MODEL_PROVIDER_VERSION_ALIAS_CONFLICT:${providerVersion}`);
    }
    providerVersions.set(providerVersion, identityDigest);
    const priorFamily = artifactFamilies.get(identity.modelArtifactDigest);
    if (priorFamily) {
      errors.push(`TRUSTED_MODEL_ARTIFACT_ALIAS_CONFLICT:${identity.modelArtifactDigest}`);
    }
    artifactFamilies.set(identity.modelArtifactDigest, identity.modelFamilyId);
  }
  for (const entry of expected) {
    const matches = registry.receipts.filter((receipt) => receipt.executionId === entry.executionId);
    const receipt = matches[0];
    const modelMatches = receipt
      ? registry.models.filter((model) => model.registryModelId === receipt.registryModelId)
      : [];
    const model = modelMatches[0];
    if (
      matches.length !== 1 ||
      modelMatches.length !== 1 ||
      !receipt ||
      !model ||
      canonicalDigest(model.modelIdentity) !== canonicalDigest(entry.modelIdentity) ||
      receipt.actorId !== entry.actorId ||
      receipt.actorVersion !== entry.actorVersion ||
      receipt.role !== entry.role ||
      receipt.inputDigest !== entry.inputDigest ||
      receipt.outputDigest !== entry.outputDigest ||
      receipt.completedAt !== entry.completedAt ||
      !isIsoInstant(receipt.completedAt) ||
      Date.parse(receipt.completedAt) > Date.parse(registry.verifiedAt) ||
      Date.parse(model.validFrom) > Date.parse(receipt.completedAt) ||
      Date.parse(receipt.completedAt) > Date.parse(model.validUntil) ||
      receipt.offline !== true ||
      receipt.providerCalls !== 0 ||
      receipt.selfAsserted !== false
    ) {
      errors.push(`TRUSTED_MODEL_EXECUTION_RECEIPT_INVALID:${entry.executionId}`);
    }
  }
}

function validateSolverConsensus(bundle: ReleaseEvidenceBundleV1, errors: string[]) {
  const candidate = selectedCandidate(bundle);
  if (!candidate) return;
  const reviews = bundle.blindSolverReviews.filter(
    (review) => review.candidateId === candidate.candidateId,
  );
  if (reviews.length !== bundle.blindSolverReviews.length) {
    errors.push("BLIND_SOLVER_REVIEW_CANDIDATE_SCOPE_MISMATCH");
  }
  const permutationIds = new Set(
    bundle.batch.optionOrderPermutations
      .filter((entry) => entry.candidateId === candidate.candidateId)
      .map((entry) => entry.permutationId),
  );
  if (reviews.length < 2 || new Set(reviews.map((review) => review.solverId)).size < 2) {
    errors.push("BLIND_SOLVER_MINIMUM_NOT_MET");
  }
  if (new Set(reviews.map((review) => review.optionPermutationId)).size < 2) {
    errors.push("BLIND_SOLVER_OPTION_ORDER_NOT_VARIED");
  }
  for (const review of reviews) {
    if (!permutationIds.has(review.optionPermutationId)) {
      errors.push(`BLIND_SOLVER_UNKNOWN_PERMUTATION:${review.reviewId}`);
    }
    if (
      !isNonemptyString(review.reviewId) ||
      !isNonemptyString(review.solverId) ||
      !isNonemptyString(review.solverVersion) ||
      !isIsoInstant(review.completedAt) ||
      new Set(review.plausibleCorrectOptionIds).size !== review.plausibleCorrectOptionIds.length
    ) {
      errors.push(`BLIND_SOLVER_EVIDENCE_INVALID:${review.reviewId}`);
    }
    if (
      review.blind !== true ||
      review.candidateAnswerExposed !== false ||
      review.candidateExplanationExposed !== false
    ) {
      errors.push(`BLIND_SOLVER_NOT_BLIND:${review.reviewId}`);
    }
    if (
      review.selectedOptionId !== candidate.proposedCorrectOptionId ||
      review.ambiguityDetected ||
      review.plausibleCorrectOptionIds.length !== 1 ||
      review.plausibleCorrectOptionIds[0] !== candidate.proposedCorrectOptionId
    ) {
      errors.push(`BLIND_SOLVER_NO_SINGLE_ANSWER_CONSENSUS:${review.reviewId}`);
    }
    if (!SHA256.test(review.reasoningDigest)) {
      errors.push(`BLIND_SOLVER_REASONING_DIGEST_INVALID:${review.reviewId}`);
    }
    if (!isIsoInstant(review.completedAt) || Date.parse(review.completedAt) < Date.parse(candidate.generatedAt)) {
      errors.push(`BLIND_SOLVER_TIME_INVALID:${review.reviewId}`);
    }
  }
}

function validateJudges(bundle: ReleaseEvidenceBundleV1, errors: string[]) {
  const candidate = selectedCandidate(bundle);
  if (!candidate) return;
  const reviews = bundle.judgeReviews.filter(
    (review) => review.candidateId === candidate.candidateId,
  );
  if (reviews.length !== bundle.judgeReviews.length) {
    errors.push("JUDGE_REVIEW_CANDIDATE_SCOPE_MISMATCH");
  }
  if (reviews.length === 0) errors.push("INDEPENDENT_JUDGE_REQUIRED");
  for (const review of reviews) {
    if (
      !isNonemptyString(review.reviewId) ||
      !isNonemptyString(review.judgeId) ||
      !isNonemptyString(review.judgeVersion) ||
      !isIsoInstant(review.completedAt) ||
      new Set(review.unresolvedReasonCodes).size !== review.unresolvedReasonCodes.length
    ) {
      errors.push(`JUDGE_EVIDENCE_INVALID:${review.reviewId}`);
    }
    if (review.judgeId === candidate.generatorId) {
      errors.push(`GENERATOR_CANNOT_APPROVE_OWN_ITEM:${review.judgeId}`);
    }
    if (
      review.anonymizedCandidate !== true ||
      !review.approved ||
      !review.singleCorrectAnswer ||
      review.ambiguityDetected ||
      !review.sourceVersionValid ||
      !review.deterministicCalculationValid ||
      !review.distractorsPlausibleAndIncorrect ||
      review.answerClueDetected ||
      review.nearCopyDetected ||
      review.reconstructionRiskDetected ||
      review.unresolvedReasonCodes.length > 0
    ) {
      errors.push(`JUDGE_REJECTED_OR_UNRESOLVED:${review.reviewId}`);
    }
    if (!isIsoInstant(review.completedAt) || Date.parse(review.completedAt) < Date.parse(candidate.generatedAt)) {
      errors.push(`JUDGE_TIME_INVALID:${review.reviewId}`);
    }
  }
}

function validateForbiddenPatterns(bundle: ReleaseEvidenceBundleV1, errors: string[]) {
  const candidate = selectedCandidate(bundle);
  if (!candidate) return;
  const normalized = normalizeQuestionText(
    `${candidate.stem} ${candidate.options.map((option) => option.body).join(" ")} ${candidate.explanation}`,
  );
  for (const forbidden of bundle.batch.answerSpecification.forbiddenAnswerPatterns) {
    const pattern = normalizeQuestionText(forbidden);
    if (pattern && normalized.includes(pattern)) {
      errors.push(`FORBIDDEN_ANSWER_PATTERN:${forbidden}`);
    }
  }
}

function validateSimilarity(
  bundle: ReleaseEvidenceBundleV1,
  trustContext: ReleaseTrustContextV1,
  errors: string[],
) {
  const review = bundle.similarityReview;
  const candidate = selectedCandidate(bundle);
  if (!candidate) return;
  const recomputedReview = buildSimilarityFirewallReview(
    candidate,
    bundle.similarityReferences,
    bundle.trustedSources,
    trustContext.sourceRegistryExportBinding,
  );
  if (
    bundle.similarityReferences.length < 1 ||
    new Set(bundle.similarityReferences.map((reference) => reference.referenceId)).size !==
      bundle.similarityReferences.length ||
    bundle.similarityReferences.some(
      (reference) =>
        !isNonemptyString(reference.referenceId) || !isNonemptyString(reference.body),
    )
  ) {
    errors.push("SIMILARITY_REFERENCE_CORPUS_INVALID");
  }
  if (canonicalDigest(recomputedReview) !== canonicalDigest(review)) {
    errors.push("SIMILARITY_REVIEW_NOT_BOUND_TO_EXACT_CORPUS");
  }
  if (review.candidateId !== bundle.selectedCandidateId) errors.push("SIMILARITY_CANDIDATE_MISMATCH");
  if (!SHA256.test(review.corpusDigest) || review.referenceCount < 1) {
    errors.push("SIMILARITY_CORPUS_EVIDENCE_MISSING");
  }
  if (review.threshold !== QUESTION_FOUNDRY_SIMILARITY_THRESHOLD) {
    errors.push("SIMILARITY_THRESHOLD_POLICY_MISMATCH");
  }
  if (
    !Number.isFinite(review.maximumTokenJaccard) ||
    review.maximumTokenJaccard >= QUESTION_FOUNDRY_SIMILARITY_THRESHOLD ||
    review.nearCopyDetected ||
    review.reconstructionRiskDetected ||
    review.protectedExplanationSequenceDetected
  ) {
    errors.push("SIMILARITY_OR_RECONSTRUCTION_FIREWALL_BLOCKED");
  }
}

function transferVariantVisibleProjection(
  variant: SealedTransferVariantV1,
) {
  return { stem: variant.stem, options: variant.options };
}

function transferVariantLineageProjection(
  variant: SealedTransferVariantV1,
) {
  return {
    sourceCandidateId: variant.sourceCandidateId,
    blueprintId: variant.blueprintId,
    blueprintVersionId: variant.blueprintVersionId,
    answerSpecificationId: variant.answerSpecificationId,
    sourceBindingDigest: variant.sourceBindingDigest,
    rightsBoundary: variant.rightsBoundary,
  };
}

function sealedTransferVariantProjection(
  variant: SealedTransferVariantV1,
) {
  return {
    transferVariantId: variant.transferVariantId,
    ...transferVariantLineageProjection(variant),
    stem: variant.stem,
    options: variant.options,
    expectedOptionId: variant.expectedOptionId,
    sealedAt: variant.sealedAt,
    answerHiddenDuringEvaluation: variant.answerHiddenDuringEvaluation,
  };
}

function transferEvaluatorVisibleInput(
  variant: SealedTransferVariantV1,
) {
  return {
    transferVariantId: variant.transferVariantId,
    visibleVariantDigest: variant.visibleContentDigest,
    ...transferVariantVisibleProjection(variant),
  };
}

function sealedVariantRegistryExportProjection(
  registry: TrustedSealedTransferVariantRegistryV1,
) {
  return {
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    variantsDigest: registry.variantsDigest,
    variants: registry.variants,
  };
}

function transferEvidenceProjection(transfer: NonNullable<ReleaseEvidenceBundleV1["transferEvidence"]>) {
  return {
    bundleId: transfer.bundleId,
    candidateId: transfer.candidateId,
    sealedBeforeEvaluation: transfer.sealedBeforeEvaluation,
    sealedVariantRegistry: transfer.sealedVariantRegistry,
    evaluatorReceipts: transfer.evaluatorReceipts,
    completedAt: transfer.completedAt,
  };
}

function ownerAdjudicationEvidenceProjection(bundle: ReleaseEvidenceBundleV1) {
  return {
    selectedCandidate: selectedCandidate(bundle),
    trustedSources: bundle.trustedSources,
    trustedModelExecutions: bundle.trustedModelExecutions,
    blindSolverReviews: bundle.blindSolverReviews,
    judgeReviews: bundle.judgeReviews,
    similarityReferences: bundle.similarityReferences,
    similarityReview: bundle.similarityReview,
    metaAudits: bundle.metaAudits,
    transferEvidence: bundle.transferEvidence,
  };
}

function trustedOwnerAdjudicationExportProjection(
  registry: TrustedOwnerAdjudicationRegistryV1,
) {
  return {
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    receiptsDigest: registry.receiptsDigest,
    receipts: registry.receipts,
  };
}

function latestAutomatedEvidenceAt(bundle: ReleaseEvidenceBundleV1) {
  const times = [
    ...bundle.blindSolverReviews.map((review) => review.completedAt),
    ...bundle.judgeReviews.map((review) => review.completedAt),
    ...bundle.metaAudits.selfPreference.runs.map((run) => run.completedAt),
    ...bundle.metaAudits.orderBias.runs.map((run) => run.completedAt),
    ...bundle.metaAudits.repeatedStability.runs.map((run) => run.completedAt),
    ...bundle.metaAudits.judgeDrift.fixtures.flatMap((fixture) => [
      fixture.baseline.completedAt,
      fixture.current.completedAt,
    ]),
    ...bundle.trustedModelExecutions.receipts.map((receipt) => receipt.completedAt),
    bundle.trustedModelExecutions.verifiedAt,
    ...(bundle.transferEvidence?.evaluatorReceipts.map((receipt) => receipt.evaluatedAt) ?? []),
    ...(bundle.transferEvidence ? [bundle.transferEvidence.completedAt] : []),
  ].filter(isIsoInstant);
  return times.sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

function validateOwnerAdjudication(
  bundle: ReleaseEvidenceBundleV1,
  trustContext: ReleaseTrustContextV1,
  errors: string[],
) {
  const adjudication = bundle.ownerAdjudication;
  const registry = bundle.trustedOwnerAdjudicationRegistry;
  const binding = trustContext.ownerAdjudicationExportBinding;
  const latestEvidenceAt = latestAutomatedEvidenceAt(bundle);
  if (
    adjudication === null ||
    !SAFE_ID.test(adjudication.adjudicationId) ||
    !SAFE_ID.test(adjudication.adjudicatorId) ||
    !SAFE_ID.test(adjudication.adjudicatorVersion) ||
    adjudication.adjudicatorRole !== "OWNER" ||
    adjudication.candidateId !== bundle.selectedCandidateId ||
    adjudication.decision !== "APPROVED" ||
    adjudication.sourceAndRightsReviewed !== true ||
    adjudication.ambiguityReviewed !== true ||
    adjudication.calculationReviewed !== true ||
    adjudication.source !== "OWNER_ADJUDICATION_RECEIPT" ||
    adjudication.modelAlone !== false ||
    !SHA256.test(adjudication.evidenceDigest) ||
    adjudication.evidenceDigest !== canonicalDigest(ownerAdjudicationEvidenceProjection(bundle)) ||
    !isIsoInstant(adjudication.decidedAt) ||
    (latestEvidenceAt !== null && Date.parse(adjudication.decidedAt) < Date.parse(latestEvidenceAt)) ||
    Date.parse(adjudication.decidedAt) > Date.parse(bundle.trustedSources.asOf)
  ) {
    errors.push("OWNER_ADJUDICATION_REQUIRED_ABOVE_PERSONAL_TIER");
  }
  if (
    adjudication === null ||
    registry === null ||
    registry.registryVersion !== "question_foundry.trusted_owner_adjudication_registry.v1" ||
    registry.source !== "LOCAL_OWNER_ADJUDICATION_EXPORT" ||
    !SAFE_ID.test(registry.exportId) ||
    !SAFE_ID.test(registry.exportVersionId) ||
    !SHA256.test(registry.exportContentDigest) ||
    registry.exportContentDigest !== canonicalDigest(trustedOwnerAdjudicationExportProjection(registry)) ||
    !isIsoInstant(registry.verifiedAt) ||
    Date.parse(registry.verifiedAt) < Date.parse(adjudication.decidedAt) ||
    Date.parse(registry.verifiedAt) > Date.parse(bundle.trustedSources.asOf) ||
    registry.remoteReadPerformed !== false ||
    registry.receiptsDigest !== canonicalDigest(registry.receipts) ||
    new Set(registry.receipts.map((receipt) => receipt.adjudicationId)).size !== registry.receipts.length ||
    registry.receipts.filter((receipt) => receipt.adjudicationId === adjudication.adjudicationId).length !== 1 ||
    canonicalDigest(
      registry.receipts.find((receipt) => receipt.adjudicationId === adjudication.adjudicationId) ?? null,
    ) !== canonicalDigest(adjudication)
  ) {
    errors.push("OWNER_ADJUDICATION_RECEIPT_NOT_IN_TRUSTED_REGISTRY");
  }
  if (
    registry === null ||
    binding === null ||
    binding.bindingVersion !== "question_foundry.trusted_owner_adjudication_export_binding.v1" ||
    binding.validatorId !== "trusted_owner_adjudication_export_validator" ||
    binding.authorityKeyId !== "question-foundry-owner-adjudication-authority-2026-08-27" ||
    binding.signatureAlgorithm !== "Ed25519" ||
    !hasValidPinnedSignature(binding as unknown as Record<string, unknown>, OWNER_ADJUDICATION_AUTHORITY_PUBLIC_KEY) ||
    binding.actualOwnerIdentityRead !== true ||
    binding.syntheticOrSimulated !== false ||
    binding.verified !== true ||
    binding.exportId !== registry.exportId ||
    binding.exportVersionId !== registry.exportVersionId ||
    binding.exportContentDigest !== registry.exportContentDigest ||
    binding.registryDigest !== canonicalDigest(registry)
  ) {
    errors.push("OWNER_ADJUDICATION_EXPORT_TRUST_BINDING_REQUIRED");
  }
}

function validateTransferEvidence(
  bundle: ReleaseEvidenceBundleV1,
  trustContext: ReleaseTrustContextV1,
  errors: string[],
) {
  const transfer = bundle.transferEvidence;
  const candidate = selectedCandidate(bundle);
  if (
    transfer === null ||
    transfer.candidateId !== bundle.selectedCandidateId ||
    transfer.sealedBeforeEvaluation !== true ||
    !SAFE_ID.test(transfer.bundleId) ||
    !isIsoInstant(transfer.completedAt) ||
    !SHA256.test(transfer.evidenceDigest) ||
    transfer.evidenceDigest !== canonicalDigest(transferEvidenceProjection(transfer)) ||
    transfer.evaluatorReceipts.length < 2 ||
    transfer.sealedVariantRegistry.variants.length !== transfer.evaluatorReceipts.length
  ) {
    errors.push("TRANSFER_STRONG_BUNDLE_REQUIRED");
    return;
  }
  const receipts = transfer.evaluatorReceipts;
  const sealedRegistry = transfer.sealedVariantRegistry;
  const sealedBinding = trustContext.sealedVariantExportBinding;
  const variants = sealedRegistry.variants;
  const latestSealAt = Math.max(...variants.map((variant) => Date.parse(variant.sealedAt)));
  const earliestEvaluationAt = Math.min(
    ...receipts.map((receipt) => Date.parse(receipt.evaluatedAt)),
  );
  if (
    sealedRegistry.registryVersion !== "question_foundry.trusted_sealed_transfer_variant_registry.v1" ||
    sealedRegistry.source !== "LOCAL_OWNER_SEALED_TRANSFER_VARIANT_EXPORT" ||
    !SAFE_ID.test(sealedRegistry.exportId) ||
    !SAFE_ID.test(sealedRegistry.exportVersionId) ||
    !isIsoInstant(sealedRegistry.verifiedAt) ||
    Date.parse(sealedRegistry.verifiedAt) < latestSealAt ||
    Date.parse(sealedRegistry.verifiedAt) >= earliestEvaluationAt ||
    Date.parse(sealedRegistry.verifiedAt) > Date.parse(bundle.trustedSources.asOf) ||
    sealedRegistry.remoteReadPerformed !== false ||
    sealedRegistry.variantsDigest !== canonicalDigest(variants) ||
    sealedRegistry.exportContentDigest !== canonicalDigest(
      sealedVariantRegistryExportProjection(sealedRegistry),
    )
  ) {
    errors.push("TRUSTED_SEALED_TRANSFER_VARIANT_REGISTRY_INVALID");
  }
  if (
    sealedBinding === null ||
    sealedBinding.bindingVersion !== "question_foundry.trusted_sealed_transfer_variant_export_binding.v1" ||
    sealedBinding.validatorId !== "trusted_sealed_transfer_variant_export_validator" ||
    sealedBinding.authorityKeyId !== "question-foundry-owner-adjudication-authority-2026-08-27" ||
    sealedBinding.signatureAlgorithm !== "Ed25519" ||
    !hasValidPinnedSignature(
      sealedBinding as unknown as Record<string, unknown>,
      OWNER_ADJUDICATION_AUTHORITY_PUBLIC_KEY,
    ) ||
    sealedBinding.actualSealedVariantRegistryRead !== true ||
    sealedBinding.syntheticOrSimulated !== false ||
    sealedBinding.verified !== true ||
    sealedBinding.exportId !== sealedRegistry.exportId ||
    sealedBinding.exportVersionId !== sealedRegistry.exportVersionId ||
    sealedBinding.exportContentDigest !== sealedRegistry.exportContentDigest ||
    sealedBinding.registryDigest !== canonicalDigest(sealedRegistry)
  ) {
    errors.push("TRUSTED_SEALED_TRANSFER_VARIANT_EXPORT_BINDING_REQUIRED");
  }
  if (
    new Set(variants.map((variant) => variant.transferVariantId)).size !== variants.length ||
    new Set(variants.map((variant) => variant.visibleContentDigest)).size !== variants.length ||
    new Set(variants.map((variant) => variant.sealedVariantDigest)).size !== variants.length
  ) {
    errors.push("TRANSFER_SEALED_VARIANTS_NOT_DISTINCT");
  }
  for (const variant of variants) {
    const optionIds = variant.options.map((option) => option.optionId);
    if (
      !SAFE_ID.test(variant.transferVariantId) ||
      variant.sourceCandidateId !== bundle.selectedCandidateId ||
      variant.blueprintId !== bundle.batch.blueprint.blueprintId ||
      variant.blueprintVersionId !== bundle.batch.blueprint.blueprintVersionId ||
      variant.answerSpecificationId !== bundle.batch.answerSpecification.answerSpecificationId ||
      variant.sourceBindingDigest !== candidate?.sourceBindingDigest ||
      canonicalDigest(variant.rightsBoundary) !== canonicalDigest(candidate?.rightsBoundary) ||
      typeof variant.stem !== "string" ||
      variant.stem.trim().length < 8 ||
      variant.options.length !== 5 ||
      new Set(optionIds).size !== 5 ||
      variant.options.some(
        (option) => !SAFE_ID.test(option.optionId) || !normalizeQuestionText(option.body),
      ) ||
      !optionIds.includes(variant.expectedOptionId) ||
      variant.expectedOptionId !== candidate?.proposedCorrectOptionId ||
      !isIsoInstant(variant.sealedAt) ||
      variant.answerHiddenDuringEvaluation !== true ||
      variant.visibleContentDigest !== canonicalDigest(transferVariantVisibleProjection(variant)) ||
      variant.lineageDigest !== canonicalDigest(transferVariantLineageProjection(variant)) ||
      variant.sealedVariantDigest !== canonicalDigest(sealedTransferVariantProjection(variant))
    ) {
      errors.push(`SEALED_TRANSFER_VARIANT_INVALID:${variant.transferVariantId}`);
    }
  }
  const uniqueFields = [
    ["receipt", receipts.map((receipt) => receipt.receiptId)],
    ["execution", receipts.map((receipt) => receipt.evaluatorExecutionId)],
    ["evaluator", receipts.map((receipt) => receipt.evaluatorId)],
    ["variant", receipts.map((receipt) => receipt.transferVariantId)],
    ["family", receipts.map((receipt) => receipt.evaluatorModelIdentity.modelFamilyId)],
    ["artifact", receipts.map((receipt) => receipt.evaluatorModelIdentity.modelArtifactDigest)],
  ] as const;
  for (const [kind, values] of uniqueFields) {
    if (new Set(values).size !== values.length) errors.push(`TRANSFER_${kind.toUpperCase()}_NOT_INDEPENDENT`);
  }
  const prohibitedActorIds = new Set([
    ...bundle.batch.candidates.map((entry) => entry.generatorId),
    ...bundle.blindSolverReviews.map((entry) => entry.solverId),
    ...bundle.judgeReviews.map((entry) => entry.judgeId),
    ...bundle.metaAudits.selfPreference.runs.map((entry) => entry.evaluatorId),
    ...bundle.metaAudits.orderBias.runs.map((entry) => entry.evaluatorId),
    ...bundle.metaAudits.repeatedStability.runs.map((entry) => entry.evaluatorId),
  ]);
  const prohibitedFamilies = new Set([
    ...bundle.batch.candidates.map((entry) => entry.generatorModelIdentity.modelFamilyId),
    ...bundle.blindSolverReviews.map((entry) => entry.solverModelIdentity.modelFamilyId),
    ...bundle.judgeReviews.map((entry) => entry.judgeModelIdentity.modelFamilyId),
    ...bundle.metaAudits.selfPreference.runs.map((entry) => entry.evaluatorModelIdentity.modelFamilyId),
    ...bundle.metaAudits.orderBias.runs.map((entry) => entry.evaluatorModelIdentity.modelFamilyId),
    ...bundle.metaAudits.repeatedStability.runs.map((entry) => entry.evaluatorModelIdentity.modelFamilyId),
    ...bundle.metaAudits.judgeDrift.fixtures.flatMap((fixture) => [
      fixture.baseline.judgeModelIdentity.modelFamilyId,
      fixture.current.judgeModelIdentity.modelFamilyId,
    ]),
  ]);
  const prohibitedArtifacts = new Set([
    ...bundle.batch.candidates.map((entry) => entry.generatorModelIdentity.modelArtifactDigest),
    ...bundle.blindSolverReviews.map((entry) => entry.solverModelIdentity.modelArtifactDigest),
    ...bundle.judgeReviews.map((entry) => entry.judgeModelIdentity.modelArtifactDigest),
    ...bundle.metaAudits.selfPreference.runs.map((entry) => entry.evaluatorModelIdentity.modelArtifactDigest),
    ...bundle.metaAudits.orderBias.runs.map((entry) => entry.evaluatorModelIdentity.modelArtifactDigest),
    ...bundle.metaAudits.repeatedStability.runs.map((entry) => entry.evaluatorModelIdentity.modelArtifactDigest),
    ...bundle.metaAudits.judgeDrift.fixtures.flatMap((fixture) => [
      fixture.baseline.judgeModelIdentity.modelArtifactDigest,
      fixture.current.judgeModelIdentity.modelArtifactDigest,
    ]),
  ]);
  let latestEvaluatedAt = Number.NEGATIVE_INFINITY;
  for (const receipt of receipts) {
    const matchingVariants = variants.filter(
      (variant) => variant.transferVariantId === receipt.transferVariantId,
    );
    const variant = matchingVariants[0];
    const expectedInputDigest = variant
      ? canonicalDigest(transferEvaluatorVisibleInput(variant))
      : null;
    const expectedOutputDigest = canonicalDigest({ selectedOptionId: receipt.selectedOptionId });
    if (
      !SAFE_ID.test(receipt.receiptId) ||
      !SAFE_ID.test(receipt.evaluatorId) ||
      !SAFE_ID.test(receipt.evaluatorVersion) ||
      !SAFE_ID.test(receipt.evaluatorExecutionId) ||
      !SAFE_ID.test(receipt.transferVariantId) ||
      matchingVariants.length !== 1 ||
      receipt.candidateId !== bundle.selectedCandidateId ||
      receipt.visibleVariantDigest !== variant?.visibleContentDigest ||
      receipt.sealedVariantDigest !== variant?.sealedVariantDigest ||
      receipt.sealedAt !== variant?.sealedAt ||
      !SHA256.test(receipt.sealedVariantDigest) ||
      !isIsoInstant(receipt.sealedAt) ||
      !isIsoInstant(receipt.evaluatedAt) ||
      Date.parse(receipt.sealedAt) >= Date.parse(receipt.evaluatedAt) ||
      receipt.answerExposureBeforeEvaluation !== false ||
      receipt.correct !== true ||
      receipt.selectedOptionId !== receipt.expectedOptionId ||
      receipt.expectedOptionId !== variant?.expectedOptionId ||
      receipt.inputDigest !== expectedInputDigest ||
      receipt.outputDigest !== expectedOutputDigest ||
      prohibitedActorIds.has(receipt.evaluatorId) ||
      prohibitedFamilies.has(receipt.evaluatorModelIdentity.modelFamilyId) ||
      prohibitedArtifacts.has(receipt.evaluatorModelIdentity.modelArtifactDigest)
    ) {
      errors.push(`TRANSFER_EVALUATION_RECEIPT_INVALID:${receipt.receiptId}`);
    }
    latestEvaluatedAt = Math.max(latestEvaluatedAt, Date.parse(receipt.evaluatedAt));
  }
  if (Date.parse(transfer.completedAt) !== latestEvaluatedAt) {
    errors.push("TRANSFER_COMPLETION_NOT_BOUND_TO_LAST_EVALUATION");
  }
}

function trustedOwnerExportProjection(registry: TrustedOwnerResponseRegistryV1) {
  return {
    registryVersion: registry.registryVersion,
    source: registry.source,
    exportId: registry.exportId,
    exportVersionId: registry.exportVersionId,
    verifiedAt: registry.verifiedAt,
    remoteReadPerformed: registry.remoteReadPerformed,
    receiptsDigest: registry.receiptsDigest,
    receipts: registry.receipts,
  };
}

function validateOwnerResponseEvidence(
  bundle: ReleaseEvidenceBundleV1,
  trustContext: ReleaseTrustContextV1,
  errors: string[],
) {
  const receipt = bundle.ownerResponseEvidence;
  const registry = bundle.trustedOwnerResponseRegistry;
  const binding = trustContext.ownerResponseExportBinding;
  if (
    receipt === null ||
    receipt.candidateId !== bundle.selectedCandidateId ||
    receipt.actualOwnerResponses !== true ||
    receipt.source !== "OWNER_RUNTIME_RECEIPT" ||
    receipt.responseBodiesStored !== false ||
    !isNonemptyString(receipt.receiptId) ||
    !isNonemptyString(receipt.ownerId) ||
    receipt.responseCount < QUESTION_FOUNDRY_MINIMUM_OWNER_RESPONSES_FOR_MEASUREMENT ||
    receipt.responseIds.length !== receipt.responseCount ||
    new Set(receipt.responseIds).size !== receipt.responseIds.length ||
    receipt.distinctSessionCount < QUESTION_FOUNDRY_MINIMUM_OWNER_SESSIONS_FOR_MEASUREMENT ||
    !isIsoInstant(receipt.firstResponseAt) ||
    !isIsoInstant(receipt.lastResponseAt) ||
    Date.parse(receipt.firstResponseAt) > Date.parse(receipt.lastResponseAt)
  ) {
    errors.push("ACTUAL_OWNER_RESPONSE_EVIDENCE_REQUIRED_FOR_MEASUREMENT");
  }
  if (
    receipt === null ||
    registry === null ||
    registry.registryVersion !== "question_foundry.trusted_owner_response_registry.v1" ||
    registry.source !== "LOCAL_OWNER_RUNTIME_EXPORT" ||
    !registry.exportId ||
    !registry.exportVersionId ||
    !/^[a-f0-9]{64}$/u.test(registry.exportContentDigest) ||
    registry.exportContentDigest !== canonicalDigest(trustedOwnerExportProjection(registry)) ||
    !isIsoInstant(registry.verifiedAt) ||
    registry.remoteReadPerformed !== false ||
    registry.receiptsDigest !== canonicalDigest(registry.receipts) ||
    registry.receipts.filter((entry) => entry.receiptId === receipt.receiptId).length !== 1 ||
    canonicalDigest(
      registry.receipts.find((entry) => entry.receiptId === receipt.receiptId) ?? null,
    ) !== canonicalDigest(receipt)
  ) {
    errors.push("OWNER_RESPONSE_RECEIPT_NOT_IN_TRUSTED_RUNTIME_REGISTRY");
  }
  if (
    registry === null ||
    binding === null ||
    binding.bindingVersion !== "question_foundry.trusted_owner_response_export_binding.v1" ||
    binding.validatorId !== "trusted_owner_runtime_export_validator" ||
    binding.actualOwnerRuntimeRead !== true ||
    binding.syntheticOrSimulated !== false ||
    binding.verified !== true ||
    binding.exportId !== registry.exportId ||
    binding.exportVersionId !== registry.exportVersionId ||
    binding.exportContentDigest !== registry.exportContentDigest ||
    binding.registryDigest !== canonicalDigest(registry)
  ) {
    errors.push("OWNER_RESPONSE_EXPORT_TRUST_BINDING_REQUIRED");
  }
}

export function evaluateQuestionRelease(
  bundle: ReleaseEvidenceBundleV1,
  requestedTier: unknown,
  trustContext: ReleaseTrustContextV1 = {
    sourceRegistryExportBinding: null,
    modelExecutionExportBinding: null,
    sealedVariantExportBinding: null,
    ownerAdjudicationExportBinding: null,
    ownerResponseExportBinding: null,
  },
): ReleaseDecisionV1 {
  if (!QUESTION_FOUNDRY_RELEASABLE_TIERS.includes(requestedTier as never)) {
    throw new Error("INVALID_REQUESTED_RELEASE_TIER");
  }
  const normalizedTier = requestedTier as QuestionFoundryReleasableTier;
  const errors: string[] = [];
  try {
    validateReleaseEvidenceSchemas(bundle, trustContext, errors);
    errors.push(
      ...validateTrustedSourceRegistryAuthority(
        bundle.trustedSources,
        trustContext.sourceRegistryExportBinding,
      ).errors,
    );
    errors.push(
      ...validateCandidateBatch(
        bundle.batch,
        bundle.trustedSources,
        trustContext.sourceRegistryExportBinding,
      ).errors,
    );
    validateTrustedModelExecutions(bundle, trustContext, errors);
    const candidate = selectedCandidate(bundle);
    if (!candidate) errors.push("SELECTED_CANDIDATE_MISSING");
    if (candidate) {
      errors.push(
        ...validateTrustedSourceBindings(
          bundle.batch.blueprint.sourceBindings,
          bundle.trustedSources,
          [
            "QUESTION_BLUEPRINT_EXTRACTION",
            "QUESTION_GENERATION_CONTEXT",
            "PERSONAL_LEARNING_BANK",
          ],
          trustContext.sourceRegistryExportBinding,
        ).errors,
      );
      errors.push(
        ...validateCandidateCalculation(candidate, bundle.batch.answerSpecification).errors,
      );
      errors.push(...reviewDistractorsAndAnswerClues(candidate, bundle.batch.blueprint).errors);
    }
    errors.push(
      ...validateGeneratorJudgeSolverSeparation(
        bundle.batch,
        bundle.blindSolverReviews,
        bundle.judgeReviews,
        bundle.selectedCandidateId,
      ).errors,
    );
    validateSolverConsensus(bundle, errors);
    validateJudges(bundle, errors);
    validateForbiddenPatterns(bundle, errors);
    validateSimilarity(bundle, trustContext, errors);
    errors.push(...validateMetaAuditBundle(bundle.metaAudits, bundle.batch, bundle.selectedCandidateId).errors);

    if (normalizedTier === "TRANSFER_VERIFIED" || normalizedTier === "MEASUREMENT_CALIBRATED") {
      validateOwnerAdjudication(bundle, trustContext, errors);
      validateTransferEvidence(bundle, trustContext, errors);
      errors.push(
        ...validateTrustedSourceBindings(bundle.batch.blueprint.sourceBindings, bundle.trustedSources, [
          "QUESTION_BLUEPRINT_EXTRACTION",
          "QUESTION_GENERATION_CONTEXT",
          "PERSONAL_LEARNING_BANK",
          "TRANSFER_BANK",
        ], trustContext.sourceRegistryExportBinding).errors,
      );
    }
    if (normalizedTier === "MEASUREMENT_CALIBRATED") {
      errors.push("MEASUREMENT_RUNTIME_AUTHORITY_NOT_INSTALLED");
      validateOwnerResponseEvidence(bundle, trustContext, errors);
      errors.push(
        ...validateTrustedSourceBindings(bundle.batch.blueprint.sourceBindings, bundle.trustedSources, [
          "QUESTION_BLUEPRINT_EXTRACTION",
          "QUESTION_GENERATION_CONTEXT",
          "PERSONAL_LEARNING_BANK",
          "TRANSFER_BANK",
          "MEASUREMENT_BANK",
        ], trustContext.sourceRegistryExportBinding).errors,
      );
    }
  } catch (error) {
    errors.push(
      `VALIDATOR_EXCEPTION:${error instanceof Error ? error.message : "unknown"}`,
    );
  }

  const blockingCodes = uniqueErrors(errors);
  const allowed = blockingCodes.length === 0;
  return deepFreeze({
    requestedTier: normalizedTier,
    allowed,
    releasedTier: allowed ? normalizedTier : "QUARANTINED",
    candidateId: bundle?.selectedCandidateId ?? "missing-candidate",
    blockingCodes,
    maximumAiOnlyTier: "PERSONAL_LEARNING_USABLE" as const,
    learnerMasteryClaimed: false as const,
    calibrationClaimedWithoutOwnerEvidence: false as const,
    evidenceDigest: canonicalDigest(bundle),
    trustedSourceRegistryExportDigest:
      trustContext.sourceRegistryExportBinding === null
        ? canonicalDigest(null)
        : canonicalDigest(trustContext.sourceRegistryExportBinding),
    trustedModelExecutionExportDigest:
      trustContext.modelExecutionExportBinding === null
        ? canonicalDigest(null)
        : canonicalDigest(trustContext.modelExecutionExportBinding),
    trustedSealedVariantExportDigest:
      trustContext.sealedVariantExportBinding === null
        ? null
        : canonicalDigest(trustContext.sealedVariantExportBinding),
    trustedOwnerAdjudicationExportDigest:
      trustContext.ownerAdjudicationExportBinding === null
        ? null
        : canonicalDigest(trustContext.ownerAdjudicationExportBinding),
    trustedOwnerResponseExportDigest:
      trustContext.ownerResponseExportBinding === null
        ? null
        : canonicalDigest(trustContext.ownerResponseExportBinding),
  });
}

function assertRevision(artifact: QuestionBankArtifactV1, expectedRevision: number) {
  if (artifact.revision !== expectedRevision) throw new Error("stale-artifact-revision");
}

function assertLifecycleAudit(
  auditRun: AuditRunV1,
  inputArtifact: QuestionBankArtifactV1,
  outputArtifact: QuestionBankArtifactV1,
  terminalKind: "DISPUTED" | "REVISED" | "RETIRED",
  occurredAt: string,
) {
  const validation = validateAuditRun(auditRun);
  if (!validation.valid) {
    throw new Error(`invalid-lifecycle-audit:${validation.errors.join(",")}`);
  }
  if (
    auditRun.steps.at(-1)?.kind !== terminalKind ||
    auditRun.inputDigest !== canonicalDigest(inputArtifact) ||
    auditRun.outputDigest !== canonicalDigest(outputArtifact)
  ) {
    throw new Error("lifecycle-audit-not-bound-to-exact-transition");
  }
  const occurredAtEpoch = Date.parse(occurredAt);
  if (
    !isIsoInstant(inputArtifact.createdAt) ||
    !isIsoInstant(inputArtifact.updatedAt) ||
    !Number.isFinite(occurredAtEpoch) ||
    new Date(occurredAtEpoch).toISOString() !== occurredAt ||
    occurredAtEpoch < Date.parse(auditRun.completedAt) ||
    occurredAtEpoch < Date.parse(inputArtifact.createdAt) ||
    occurredAtEpoch < Date.parse(inputArtifact.updatedAt)
  ) {
    throw new Error("lifecycle-time-must-follow-audit");
  }
}

export function createQuestionBankArtifact(input: Readonly<{
  artifactId: string;
  bundle: ReleaseEvidenceBundleV1;
  requestedTier: QuestionFoundryReleasableTier;
  decision: ReleaseDecisionV1;
  trustContext: ReleaseTrustContextV1;
  auditRun: AuditRunV1;
  occurredAt: string;
}>): QuestionBankArtifactV1 {
  if (!isNonemptyString(input.artifactId) || !SAFE_ID.test(input.artifactId)) {
    throw new Error("artifact-id-required");
  }
  const recomputedDecision = evaluateQuestionRelease(
    input.bundle,
    input.requestedTier,
    input.trustContext,
  );
  if (canonicalDigest(recomputedDecision) !== canonicalDigest(input.decision)) {
    throw new Error("release-decision-not-bound-to-exact-evidence");
  }
  if (
    !recomputedDecision.allowed ||
    recomputedDecision.requestedTier !== input.requestedTier ||
    recomputedDecision.releasedTier !== input.requestedTier ||
    recomputedDecision.candidateId !== input.bundle.selectedCandidateId ||
    recomputedDecision.evidenceDigest !== canonicalDigest(input.bundle)
  ) {
    throw new Error("blocked-or-mismatched-release-cannot-create-bank-artifact");
  }
  const auditValidation = validateReleaseAuditRun(
    input.auditRun,
    input.bundle,
    recomputedDecision,
    input.trustContext,
  );
  if (!auditValidation.valid) {
    throw new Error(`invalid-release-audit:${auditValidation.errors.join(",")}`);
  }
  if (
    input.auditRun.inputDigest !== canonicalDigest(input.bundle) ||
    input.auditRun.outputDigest !== canonicalDigest(recomputedDecision)
  ) {
    throw new Error("release-audit-not-bound-to-evidence-and-decision");
  }
  const occurredAtEpoch = Date.parse(input.occurredAt);
  if (
    !Number.isFinite(occurredAtEpoch) ||
    new Date(occurredAtEpoch).toISOString() !== input.occurredAt ||
    input.occurredAt !== input.auditRun.completedAt
  ) {
    throw new Error("artifact-time-must-equal-release-audit-completion");
  }
  const blueprint = input.bundle.batch.blueprint;
  return deepFreeze({
    artifactId: input.artifactId,
    candidateId: input.bundle.selectedCandidateId,
    subject: blueprint.subject,
    skillId: blueprint.skillId,
    difficultyBand: blueprint.difficultyBand,
    itemFamily: blueprint.itemFamily,
    releaseTier: recomputedDecision.releasedTier,
    revision: 1,
    parentArtifactId: null,
    auditRunId: input.auditRun.auditRunId,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  });
}

function terminalTransition(
  artifact: QuestionBankArtifactV1,
  expectedRevision: number,
  releaseTier: "DISPUTED" | "RETIRED",
  auditRun: AuditRunV1,
  occurredAt: string,
): QuestionBankArtifactV1 {
  assertRevision(artifact, expectedRevision);
  if (artifact.releaseTier === "RETIRED") throw new Error("retired-artifact-is-terminal");
  const outputArtifact = {
    ...artifact,
    releaseTier,
    revision: artifact.revision + 1,
    auditRunId: auditRun.auditRunId,
    updatedAt: occurredAt,
  };
  assertLifecycleAudit(auditRun, artifact, outputArtifact, releaseTier, occurredAt);
  return deepFreeze(outputArtifact);
}

export function disputeQuestionBankArtifact(
  artifact: QuestionBankArtifactV1,
  expectedRevision: number,
  auditRun: AuditRunV1,
  occurredAt: string,
) {
  return terminalTransition(artifact, expectedRevision, "DISPUTED", auditRun, occurredAt);
}

export function retireQuestionBankArtifact(
  artifact: QuestionBankArtifactV1,
  expectedRevision: number,
  auditRun: AuditRunV1,
  occurredAt: string,
) {
  return terminalTransition(artifact, expectedRevision, "RETIRED", auditRun, occurredAt);
}

export function reviseQuestionBankArtifact(input: Readonly<{
  artifact: QuestionBankArtifactV1;
  expectedRevision: number;
  newArtifactId: string;
  newCandidateId: string;
  auditRun: AuditRunV1;
  occurredAt: string;
}>): QuestionBankArtifactV1 {
  assertRevision(input.artifact, input.expectedRevision);
  if (input.artifact.releaseTier !== "DISPUTED" && input.artifact.releaseTier !== "QUARANTINED") {
    throw new Error("revision-requires-disputed-or-quarantined-parent");
  }
  if (input.newArtifactId === input.artifact.artifactId || input.newCandidateId === input.artifact.candidateId) {
    throw new Error("revision-must-create-new-artifact-and-candidate-identity");
  }
  if (!SAFE_ID.test(input.newArtifactId) || !SAFE_ID.test(input.newCandidateId)) {
    throw new Error("revision-artifact-and-candidate-identities-invalid");
  }
  const outputArtifact = {
    ...input.artifact,
    artifactId: input.newArtifactId,
    candidateId: input.newCandidateId,
    releaseTier: "QUARANTINED" as const,
    revision: 1,
    parentArtifactId: input.artifact.artifactId,
    auditRunId: input.auditRun.auditRunId,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  };
  assertLifecycleAudit(input.auditRun, input.artifact, outputArtifact, "REVISED", input.occurredAt);
  return deepFreeze(outputArtifact);
}

export function isQuestionBankArtifactAssignable(artifact: QuestionBankArtifactV1) {
  return ([
    "PERSONAL_LEARNING_USABLE",
    "TRANSFER_VERIFIED",
    "MEASUREMENT_CALIBRATED",
  ] as readonly QuestionFoundryReleaseTier[]).includes(artifact.releaseTier);
}
import { verify as verifySignature } from "node:crypto";
