import {
  QUESTION_FOUNDRY_RELEASE_TIERS,
  QUESTION_FOUNDRY_SUBJECTS,
  type AnswerSpecificationV1,
  type BankFirstSelectionV1,
  type BankSelectionRequestV1,
  type CandidateBatchV1,
  type QuestionBankEnvelopeV1,
  type QuestionBankLifecycleEnvelopeV1,
  type QuestionBankLifecycleTransitionV1,
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
  disputeQuestionBankArtifact,
  isQuestionBankArtifactAssignable,
  retireQuestionBankArtifact,
  reviseQuestionBankArtifact,
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

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const GENERATION_PLAN_KEYS = [
  "batchId",
  "blueprint",
  "answerSpecification",
  "candidateCount",
  "generatorId",
  "generatorVersion",
  "generatorModelIdentity",
  "generatorExecutionIds",
  "generationRunId",
  "generatedAt",
  "trustedSources",
  "sourceRegistryExportBinding",
  "generator",
] as const;
const BANK_REQUEST_KEYS = [
  "requestId",
  "subject",
  "skillId",
  "difficultyBand",
  "itemFamily",
  "excludedArtifactIds",
  "offlineGenerationOnGapAuthorized",
  "occurredAt",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const exact = [...expected].sort();
  return actual.length === exact.length && actual.every((key, index) => key === exact[index]);
}

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function assertGenerationPlanPreflight(
  value: unknown,
): asserts value is GenerateCandidateBatchInput {
  if (!isRecord(value) || !hasExactKeys(value, GENERATION_PLAN_KEYS)) {
    throw new Error("generation-plan-closed-shape-invalid");
  }
  if (
    typeof value.batchId !== "string" ||
    !SAFE_ID.test(value.batchId) ||
    typeof value.generatorId !== "string" ||
    !SAFE_ID.test(value.generatorId) ||
    typeof value.generatorVersion !== "string" ||
    !SAFE_ID.test(value.generatorVersion) ||
    typeof value.generationRunId !== "string" ||
    !SAFE_ID.test(value.generationRunId)
  ) {
    throw new Error("generation-plan-provenance-identity-invalid");
  }
  if (!isIsoInstant(value.generatedAt)) throw new Error("generation-plan-time-invalid");
  if (
    typeof value.candidateCount !== "number" ||
    !Number.isInteger(value.candidateCount) ||
    value.candidateCount < 2 ||
    value.candidateCount > 12
  ) {
    throw new Error("candidate-count-must-be-between-2-and-12");
  }
  if (
    !Array.isArray(value.generatorExecutionIds) ||
    value.generatorExecutionIds.length !== value.candidateCount ||
    value.generatorExecutionIds.some((entry) => typeof entry !== "string" || !SAFE_ID.test(entry)) ||
    new Set(value.generatorExecutionIds).size !== value.generatorExecutionIds.length
  ) {
    throw new Error("generation-plan-execution-ids-invalid");
  }
  if (
    !isRecord(value.generatorModelIdentity) ||
    !hasExactKeys(value.generatorModelIdentity, [
      "providerId",
      "modelFamilyId",
      "modelVersionId",
      "modelArtifactDigest",
    ]) ||
    typeof value.generatorModelIdentity.providerId !== "string" ||
    !SAFE_ID.test(value.generatorModelIdentity.providerId) ||
    typeof value.generatorModelIdentity.modelFamilyId !== "string" ||
    !SAFE_ID.test(value.generatorModelIdentity.modelFamilyId) ||
    typeof value.generatorModelIdentity.modelVersionId !== "string" ||
    !SAFE_ID.test(value.generatorModelIdentity.modelVersionId) ||
    typeof value.generatorModelIdentity.modelArtifactDigest !== "string" ||
    !SHA256.test(value.generatorModelIdentity.modelArtifactDigest)
  ) {
    throw new Error("generation-plan-model-identity-invalid");
  }
  if (typeof value.generator !== "function") throw new Error("generation-plan-callback-invalid");
}

function assertBankSelectionRequest(value: unknown): asserts value is BankSelectionRequestV1 {
  if (!isRecord(value) || !hasExactKeys(value, BANK_REQUEST_KEYS)) {
    throw new Error("invalid-bank-selection-request:closed-shape");
  }
  if (
    typeof value.requestId !== "string" ||
    !SAFE_ID.test(value.requestId) ||
    typeof value.skillId !== "string" ||
    !SAFE_ID.test(value.skillId) ||
    typeof value.itemFamily !== "string" ||
    !SAFE_ID.test(value.itemFamily) ||
    !QUESTION_FOUNDRY_SUBJECTS.some((subject) => subject === value.subject) ||
    typeof value.difficultyBand !== "string" ||
    !["FOUNDATION", "STANDARD", "ADVANCED"].includes(value.difficultyBand) ||
    !isIsoInstant(value.occurredAt)
  ) {
    throw new Error("invalid-bank-selection-request:identity-or-time");
  }
  if (
    !Array.isArray(value.excludedArtifactIds) ||
    value.excludedArtifactIds.length > 1_000 ||
    value.excludedArtifactIds.some((entry) => typeof entry !== "string" || !SAFE_ID.test(entry)) ||
    new Set(value.excludedArtifactIds).size !== value.excludedArtifactIds.length
  ) {
    throw new Error("invalid-bank-selection-request:excluded-artifacts");
  }
  if (typeof value.offlineGenerationOnGapAuthorized !== "boolean") {
    throw new Error("invalid-bank-selection-request:generation-authority-boolean-required");
  }
}

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
  assertGenerationPlanPreflight(input);
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
  if (
    !isRecord(envelope) ||
    !hasExactKeys(envelope, [
      "envelopeKind",
      "artifact",
      "bundle",
      "requestedTier",
      "decision",
      "trustContext",
      "auditRun",
    ]) ||
    envelope.envelopeKind !== "RELEASE"
  ) {
    throw new Error("bank-release-envelope-closed-shape-invalid");
  }
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

function revalidateLifecycleEnvelope(envelope: QuestionBankLifecycleEnvelopeV1) {
  if (
    !isRecord(envelope) ||
    !hasExactKeys(envelope, ["envelopeKind", "releaseEnvelope", "transitions", "artifact"]) ||
    envelope.envelopeKind !== "LIFECYCLE" ||
    !Array.isArray(envelope.transitions) ||
    envelope.transitions.length < 1 ||
    envelope.transitions.length > 16
  ) {
    throw new Error("bank-lifecycle-envelope-closed-shape-invalid");
  }
  let current = revalidateReleaseEnvelope(envelope.releaseEnvelope);
  const lineageArtifactIds = new Set([current.artifactId]);
  for (const rawTransition of envelope.transitions as readonly unknown[]) {
    if (
      !isRecord(rawTransition) ||
      !hasExactKeys(rawTransition, ["lifecycleAction", "artifact", "auditRun", "occurredAt"]) ||
      !["DISPUTED", "REVISED", "RETIRED"].includes(String(rawTransition.lifecycleAction)) ||
      !isIsoInstant(rawTransition.occurredAt)
    ) {
      throw new Error("bank-lifecycle-transition-closed-shape-invalid");
    }
    const transition = rawTransition as unknown as QuestionBankLifecycleTransitionV1;
    let recomputed;
    if (transition.lifecycleAction === "DISPUTED") {
      recomputed = disputeQuestionBankArtifact(
        current,
        current.revision,
        transition.auditRun,
        transition.occurredAt,
      );
    } else if (transition.lifecycleAction === "RETIRED") {
      recomputed = retireQuestionBankArtifact(
        current,
        current.revision,
        transition.auditRun,
        transition.occurredAt,
      );
    } else {
      recomputed = reviseQuestionBankArtifact({
        artifact: current,
        expectedRevision: current.revision,
        newArtifactId: transition.artifact.artifactId,
        newCandidateId: transition.artifact.candidateId,
        auditRun: transition.auditRun,
        occurredAt: transition.occurredAt,
      });
    }
    if (canonicalDigest(recomputed) !== canonicalDigest(transition.artifact)) {
      throw new Error("bank-lifecycle-transition-artifact-mismatch");
    }
    current = recomputed;
    lineageArtifactIds.add(current.artifactId);
  }
  if (
    canonicalDigest(current) !== canonicalDigest(envelope.artifact) ||
    isQuestionBankArtifactAssignable(current)
  ) {
    throw new Error("bank-lifecycle-envelope-terminal-artifact-mismatch");
  }
  return { artifact: current, lineageArtifactIds };
}

export function selectBankFirstOrGenerateOnGap(
  request: BankSelectionRequestV1,
  bank: readonly QuestionBankEnvelopeV1[],
  currentTrustedSources: TrustedSourceRegistryV1 | null,
  currentSourceRegistryExportBinding: TrustedSourceRegistryExportBindingV1 | null,
  generationPlan: GenerateCandidateBatchInput | null,
): BankFirstSelectionV1 {
  assertBankSelectionRequest(request);
  if (!Array.isArray(bank)) throw new Error("bank-must-be-array");
  const inScopeEnvelopes = bank.filter(
    (envelope) =>
      envelope.artifact.subject === request.subject &&
      envelope.artifact.skillId === request.skillId &&
      envelope.artifact.difficultyBand === request.difficultyBand &&
      envelope.artifact.itemFamily === request.itemFamily &&
      !request.excludedArtifactIds.includes(envelope.artifact.artifactId),
  );
  const releasableEnvelopes: Array<{
    envelope: QuestionBankReleaseEnvelopeV1;
    artifact: ReturnType<typeof revalidateReleaseEnvelope>;
  }> = [];
  const nonAssignableLineageArtifactIds = new Set<string>();
  for (const envelope of inScopeEnvelopes) {
    if (!QUESTION_FOUNDRY_RELEASE_TIERS.includes(envelope.artifact.releaseTier)) {
      throw new Error("bank-artifact-release-tier-invalid");
    }
    if (isQuestionBankArtifactAssignable(envelope.artifact)) {
      if (envelope.envelopeKind !== "RELEASE") {
        throw new Error("bank-releasable-entry-requires-release-envelope");
      }
      releasableEnvelopes.push({
        envelope,
        artifact: revalidateReleaseEnvelope(envelope),
      });
    } else {
      if (envelope.envelopeKind !== "LIFECYCLE") {
        throw new Error("bank-nonassignable-history-requires-lifecycle-envelope");
      }
      const history = revalidateLifecycleEnvelope(envelope);
      for (const artifactId of history.lineageArtifactIds) {
        nonAssignableLineageArtifactIds.add(artifactId);
      }
    }
  }
  const matchingEnvelopes = releasableEnvelopes
    .filter((entry) => !nonAssignableLineageArtifactIds.has(entry.artifact.artifactId))
    .sort((left, right) => left.artifact.artifactId.localeCompare(right.artifact.artifactId));

  if (matchingEnvelopes.length > 0) {
    const { envelope, artifact } = matchingEnvelopes[0];
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

  if (request.offlineGenerationOnGapAuthorized !== true || generationPlan === null) {
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
