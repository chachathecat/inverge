import {
  QUESTION_FOUNDRY_RELEASE_TIERS,
  type AnswerSpecificationV1,
  type BankFirstSelectionV1,
  type BankSelectionRequestV1,
  type CandidateBatchV1,
  type QuestionBankReleaseEnvelopeV1,
  type QuestionBlueprintV1,
  type QuestionCandidateV1,
  type QuestionFoundryModelIdentityV1,
  type QuestionOptionV1,
  type TrustedSourceRegistryExportBindingV1,
  type TrustedSourceRegistryV1,
} from "./contracts";
import {
  createQuestionBankArtifact,
  isQuestionBankArtifactAssignable,
} from "./release-policy";
import {
  canonicalDigest,
  validateAnswerSpecification,
  validateCandidateBatch,
  validateQuestionBlueprint,
  validateTrustedSourceRegistryAuthority,
  validateTrustedSourceBindings,
} from "./validation";

type CandidateDraft = Readonly<{
  stem: string;
  options: readonly QuestionOptionV1[];
  proposedCorrectOptionId: string;
  explanation: string;
}>;

export type OfflineCandidateGenerator = (input: Readonly<{
  blueprint: QuestionBlueprintV1;
  answerSpecification: AnswerSpecificationV1;
  candidateIndex: number;
  candidateId: string;
}>) => CandidateDraft;

export type GenerateCandidateBatchInput = Readonly<{
  batchId: string;
  blueprint: QuestionBlueprintV1;
  answerSpecification: AnswerSpecificationV1;
  candidateCount: number;
  generatorId: string;
  generatorVersion: string;
  generatorModelIdentity: QuestionFoundryModelIdentityV1;
  generatorExecutionIds: readonly string[];
  generationRunId: string;
  generatedAt: string;
  trustedSources: TrustedSourceRegistryV1;
  sourceRegistryExportBinding: TrustedSourceRegistryExportBindingV1;
  generator: OfflineCandidateGenerator;
}>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (values.length === 0) return [];
  const normalized = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function twoDistinctOrders<T>(values: readonly T[]): readonly (readonly T[])[] {
  if (values.length < 2) throw new Error("at-least-two-values-required-for-permutation");
  return [Object.freeze([...values]), Object.freeze(rotate(values, 1))];
}

export function generateCandidateBatch(
  input: GenerateCandidateBatchInput,
): CandidateBatchV1 {
  const blueprintValidation = validateQuestionBlueprint(
    input.blueprint,
    input.trustedSources,
    input.sourceRegistryExportBinding,
  );
  if (!blueprintValidation.valid) {
    throw new Error(`invalid-question-blueprint:${blueprintValidation.errors.join(",")}`);
  }
  const specificationValidation = validateAnswerSpecification(
    input.answerSpecification,
    input.blueprint,
    input.trustedSources,
    input.sourceRegistryExportBinding,
  );
  if (!specificationValidation.valid) {
    throw new Error(`invalid-answer-specification:${specificationValidation.errors.join(",")}`);
  }
  if (!Number.isInteger(input.candidateCount) || input.candidateCount < 2 || input.candidateCount > 12) {
    throw new Error("candidate-count-must-be-between-2-and-12");
  }
  if (
    input.generatorExecutionIds.length !== input.candidateCount ||
    new Set(input.generatorExecutionIds).size !== input.generatorExecutionIds.length
  ) {
    throw new Error("one-unique-generator-execution-id-required-per-candidate");
  }
  if (Date.parse(input.answerSpecification.createdAt) > Date.parse(input.generatedAt)) {
    throw new Error("solution-must-be-committed-before-generation");
  }
  if (input.trustedSources.asOf !== input.generatedAt) {
    throw new Error("trusted-source-registry-must-match-generation-time");
  }

  const blueprint = deepFreeze(structuredClone(input.blueprint));
  const answerSpecification = deepFreeze(structuredClone(input.answerSpecification));

  const candidates: QuestionCandidateV1[] = [];
  for (let index = 0; index < input.candidateCount; index += 1) {
    const candidateId = `${input.batchId}:candidate:${index + 1}`;
    const draft = input.generator({
      blueprint,
      answerSpecification,
      candidateIndex: index,
      candidateId,
    });
    candidates.push(
      deepFreeze({
        candidateId,
        blueprintId: blueprint.blueprintId,
        blueprintVersionId: blueprint.blueprintVersionId,
        answerSpecificationId: answerSpecification.answerSpecificationId,
        generatorId: input.generatorId,
        generatorVersion: input.generatorVersion,
        generatorModelIdentity: structuredClone(input.generatorModelIdentity),
        generatorExecutionId: input.generatorExecutionIds[index],
        generationRunId: input.generationRunId,
        generatedAt: input.generatedAt,
        solutionCommittedAt: answerSpecification.createdAt,
        stem: draft.stem,
        options: draft.options.map((option) => ({ ...option })),
        proposedCorrectOptionId: draft.proposedCorrectOptionId,
        explanation: draft.explanation,
        sourceBindingDigest: canonicalDigest(blueprint.sourceBindings),
        rightsBoundary: { ...blueprint.rightsBoundary },
        initialState: "QUARANTINED" as const,
      }),
    );
  }

  const candidateIds = candidates.map((candidate) => candidate.candidateId);
  const candidateOrders = twoDistinctOrders(candidateIds);
  const optionOrderPermutations = candidates.flatMap((candidate) => {
    const optionIds = candidate.options.map((option) => option.optionId);
    return twoDistinctOrders(optionIds).map((order, index) => ({
      permutationId: `${candidate.candidateId}:option-order:${index + 1}`,
      candidateId: candidate.candidateId,
      optionIds: order,
    }));
  });

  const batch = deepFreeze({
    batchId: input.batchId,
    blueprint,
    answerSpecification,
    candidates,
    candidateOrderPermutations: candidateOrders.map((order, index) => ({
      permutationId: `${input.batchId}:candidate-order:${index + 1}`,
      candidateIds: order,
    })),
    optionOrderPermutations,
    offline: true as const,
    providerCalls: 0 as const,
  });
  const batchValidation = validateCandidateBatch(
    batch,
    input.trustedSources,
    input.sourceRegistryExportBinding,
  );
  if (!batchValidation.valid) {
    throw new Error(`offline-generator-produced-invalid-batch:${batchValidation.errors.join(",")}`);
  }
  return batch;
}

function revalidateReleaseEnvelope(envelope: QuestionBankReleaseEnvelopeV1) {
  const recomputedArtifact = createQuestionBankArtifact({
    artifactId: envelope.artifact.artifactId,
    bundle: envelope.bundle,
    requestedTier: envelope.requestedTier,
    decision: envelope.decision,
    trustContext: envelope.trustContext,
    auditRun: envelope.auditRun,
    occurredAt: envelope.artifact.createdAt,
  });
  if (canonicalDigest(recomputedArtifact) !== canonicalDigest(envelope.artifact)) {
    throw new Error("bank-release-envelope-artifact-mismatch");
  }
  return recomputedArtifact;
}

export function selectBankFirstOrGenerateOnGap(
  request: BankSelectionRequestV1,
  bank: readonly QuestionBankReleaseEnvelopeV1[],
  currentTrustedSources: TrustedSourceRegistryV1 | null,
  currentSourceRegistryExportBinding: TrustedSourceRegistryExportBindingV1 | null,
  generationPlan: GenerateCandidateBatchInput | null,
): BankFirstSelectionV1 {
  const inScopeEnvelopes = bank.filter(
    (envelope) =>
      envelope.artifact.subject === request.subject &&
      envelope.artifact.skillId === request.skillId &&
      envelope.artifact.difficultyBand === request.difficultyBand &&
      envelope.artifact.itemFamily === request.itemFamily &&
      !request.excludedArtifactIds.includes(envelope.artifact.artifactId),
  );
  for (const envelope of inScopeEnvelopes) {
    if (!QUESTION_FOUNDRY_RELEASE_TIERS.includes(envelope.artifact.releaseTier)) {
      throw new Error("bank-artifact-release-tier-invalid");
    }
  }
  const matchingEnvelopes = inScopeEnvelopes
    .filter((envelope) => isQuestionBankArtifactAssignable(envelope.artifact))
    .sort((left, right) => left.artifact.artifactId.localeCompare(right.artifact.artifactId));

  if (matchingEnvelopes.length > 0) {
    const envelope = matchingEnvelopes[0];
    const artifact = revalidateReleaseEnvelope(envelope);
    if (Date.parse(request.occurredAt) < Date.parse(artifact.updatedAt)) {
      throw new Error("bank-assignment-request-predates-artifact");
    }
    if (
      currentTrustedSources === null ||
      currentSourceRegistryExportBinding === null ||
      currentTrustedSources.asOf !== request.occurredAt
    ) {
      throw new Error("bank-assignment-current-source-registry-required");
    }
    const currentAuthority = validateTrustedSourceRegistryAuthority(
      currentTrustedSources,
      currentSourceRegistryExportBinding,
    );
    if (!currentAuthority.valid) {
      throw new Error(
        `bank-assignment-current-source-authority-invalid:${currentAuthority.errors.join(",")}`,
      );
    }
    const purposes = [
      "QUESTION_BLUEPRINT_EXTRACTION",
      "QUESTION_GENERATION_CONTEXT",
      "PERSONAL_LEARNING_BANK",
      ...(envelope.requestedTier === "TRANSFER_VERIFIED" ||
      envelope.requestedTier === "MEASUREMENT_CALIBRATED"
        ? (["TRANSFER_BANK"] as const)
        : []),
      ...(envelope.requestedTier === "MEASUREMENT_CALIBRATED"
        ? (["MEASUREMENT_BANK"] as const)
        : []),
    ] as const;
    const currentValidation = validateTrustedSourceBindings(
      envelope.bundle.batch.blueprint.sourceBindings,
      currentTrustedSources,
      purposes,
      currentSourceRegistryExportBinding,
    );
    if (!currentValidation.valid) {
      throw new Error(
        `bank-assignment-current-source-revalidation-failed:${currentValidation.errors.join(",")}`,
      );
    }
    return deepFreeze({
      kind: "BANK_ITEM" as const,
      artifact,
      scarcityEvent: null,
      generatedBatch: null,
      generationCount: 0,
      reasonCode: null,
    });
  }

  const scarcityEvent = deepFreeze({
    eventId: `${request.requestId}:scarcity`,
    requestId: request.requestId,
    subject: request.subject,
    skillId: request.skillId,
    difficultyBand: request.difficultyBand,
    itemFamily: request.itemFamily,
    reasonCode: "NO_ELIGIBLE_BANK_ITEM" as const,
    occurredAt: request.occurredAt,
    metadataOnly: true as const,
    containsBody: false as const,
  });

  if (!request.offlineGenerationOnGapAuthorized || generationPlan === null) {
    return deepFreeze({
      kind: "BLOCKED" as const,
      artifact: null,
      scarcityEvent,
      generatedBatch: null,
      generationCount: 0,
      reasonCode: "OFFLINE_GENERATION_ON_GAP_NOT_AUTHORIZED",
    });
  }

  if (
    currentTrustedSources === null ||
    currentSourceRegistryExportBinding === null ||
    currentTrustedSources.asOf !== request.occurredAt ||
    !validateTrustedSourceRegistryAuthority(
      currentTrustedSources,
      currentSourceRegistryExportBinding,
    ).valid
  ) {
    return deepFreeze({
      kind: "BLOCKED" as const,
      artifact: null,
      scarcityEvent,
      generatedBatch: null,
      generationCount: 0,
      reasonCode: "TRUSTED_SOURCE_REGISTRY_REQUIRED_BEFORE_GENERATION",
    });
  }

  if (
    generationPlan.generatedAt !== request.occurredAt ||
    canonicalDigest(generationPlan.trustedSources) !== canonicalDigest(currentTrustedSources) ||
    canonicalDigest(generationPlan.sourceRegistryExportBinding) !==
      canonicalDigest(currentSourceRegistryExportBinding) ||
    generationPlan.blueprint.subject !== request.subject ||
    generationPlan.blueprint.skillId !== request.skillId ||
    generationPlan.blueprint.difficultyBand !== request.difficultyBand ||
    generationPlan.blueprint.itemFamily !== request.itemFamily
  ) {
    throw new Error("generation-on-gap-plan-not-bound-to-request-and-current-sources");
  }
  const generatedBatch = generateCandidateBatch(generationPlan);
  const batchValidation = validateCandidateBatch(
    generatedBatch,
    currentTrustedSources,
    currentSourceRegistryExportBinding,
  );
  if (!batchValidation.valid) {
    throw new Error(`generation-on-gap-invalid-batch:${batchValidation.errors.join(",")}`);
  }
  if (
    generatedBatch.blueprint.subject !== request.subject ||
    generatedBatch.blueprint.skillId !== request.skillId ||
    generatedBatch.blueprint.difficultyBand !== request.difficultyBand ||
    generatedBatch.blueprint.itemFamily !== request.itemFamily
  ) {
    throw new Error("generation-on-gap-request-scope-mismatch");
  }
  if (generatedBatch.candidates.some((candidate) => candidate.initialState !== "QUARANTINED")) {
    throw new Error("generation-on-gap-candidates-must-remain-quarantined");
  }
  return deepFreeze({
    kind: "OFFLINE_GENERATION_GAP" as const,
    artifact: null,
    scarcityEvent,
    generatedBatch,
    generationCount: generatedBatch.candidates.length,
    reasonCode: null,
  });
}
