import {
  type AnswerSpecificationV1,
  type BankFirstSelectionV1,
  type BankSelectionRequestV1,
  type CandidateBatchV1,
  type QuestionBankArtifactV1,
  type QuestionBlueprintV1,
  type QuestionCandidateV1,
  type QuestionOptionV1,
} from "./contracts";
import {
  canonicalDigest,
  validateAnswerSpecification,
  validateCandidateBatch,
  validateQuestionBlueprint,
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
  generationRunId: string;
  generatedAt: string;
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
  const blueprintValidation = validateQuestionBlueprint(input.blueprint);
  if (!blueprintValidation.valid) {
    throw new Error(`invalid-question-blueprint:${blueprintValidation.errors.join(",")}`);
  }
  const specificationValidation = validateAnswerSpecification(
    input.answerSpecification,
    input.blueprint,
  );
  if (!specificationValidation.valid) {
    throw new Error(`invalid-answer-specification:${specificationValidation.errors.join(",")}`);
  }
  if (!Number.isInteger(input.candidateCount) || input.candidateCount < 2 || input.candidateCount > 12) {
    throw new Error("candidate-count-must-be-between-2-and-12");
  }
  if (Date.parse(input.answerSpecification.createdAt) > Date.parse(input.generatedAt)) {
    throw new Error("solution-must-be-committed-before-generation");
  }

  const candidates: QuestionCandidateV1[] = [];
  for (let index = 0; index < input.candidateCount; index += 1) {
    const candidateId = `${input.batchId}:candidate:${index + 1}`;
    const draft = input.generator({
      blueprint: input.blueprint,
      answerSpecification: input.answerSpecification,
      candidateIndex: index,
      candidateId,
    });
    candidates.push(
      deepFreeze({
        candidateId,
        blueprintId: input.blueprint.blueprintId,
        blueprintVersionId: input.blueprint.blueprintVersionId,
        answerSpecificationId: input.answerSpecification.answerSpecificationId,
        generatorId: input.generatorId,
        generatorVersion: input.generatorVersion,
        generationRunId: input.generationRunId,
        generatedAt: input.generatedAt,
        solutionCommittedAt: input.answerSpecification.createdAt,
        stem: draft.stem,
        options: draft.options.map((option) => ({ ...option })),
        proposedCorrectOptionId: draft.proposedCorrectOptionId,
        explanation: draft.explanation,
        sourceBindingDigest: canonicalDigest(input.blueprint.sourceBindings),
        rightsBoundary: { ...input.blueprint.rightsBoundary },
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
    blueprint: input.blueprint,
    answerSpecification: input.answerSpecification,
    candidates,
    candidateOrderPermutations: candidateOrders.map((order, index) => ({
      permutationId: `${input.batchId}:candidate-order:${index + 1}`,
      candidateIds: order,
    })),
    optionOrderPermutations,
    offline: true as const,
    providerCalls: 0 as const,
  });
  const batchValidation = validateCandidateBatch(batch);
  if (!batchValidation.valid) {
    throw new Error(`offline-generator-produced-invalid-batch:${batchValidation.errors.join(",")}`);
  }
  return batch;
}

function artifactIsAssignable(artifact: QuestionBankArtifactV1) {
  return [
    "PERSONAL_LEARNING_USABLE",
    "TRANSFER_VERIFIED",
    "MEASUREMENT_CALIBRATED",
  ].includes(artifact.releaseTier);
}

export function selectBankFirstOrGenerateOnGap(
  request: BankSelectionRequestV1,
  bank: readonly QuestionBankArtifactV1[],
  generateOffline: (() => CandidateBatchV1) | null,
): BankFirstSelectionV1 {
  const eligible = bank
    .filter(
      (artifact) =>
        artifact.subject === request.subject &&
        artifact.skillId === request.skillId &&
        artifact.difficultyBand === request.difficultyBand &&
        artifact.itemFamily === request.itemFamily &&
        !request.excludedArtifactIds.includes(artifact.artifactId) &&
        artifactIsAssignable(artifact),
    )
    .sort((left, right) => left.artifactId.localeCompare(right.artifactId));

  if (eligible.length > 0) {
    return deepFreeze({
      kind: "BANK_ITEM" as const,
      artifact: eligible[0],
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

  if (!request.offlineGenerationOnGapAuthorized || generateOffline === null) {
    return deepFreeze({
      kind: "BLOCKED" as const,
      artifact: null,
      scarcityEvent,
      generatedBatch: null,
      generationCount: 0,
      reasonCode: "OFFLINE_GENERATION_ON_GAP_NOT_AUTHORIZED",
    });
  }

  const generatedBatch = generateOffline();
  const batchValidation = validateCandidateBatch(generatedBatch);
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
