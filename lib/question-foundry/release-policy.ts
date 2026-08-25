import {
  type AuditRunV1,
  type QuestionBankArtifactV1,
  type QuestionCandidateV1,
  type QuestionFoundryReleasableTier,
  type QuestionFoundryReleaseTier,
  type ReleaseDecisionV1,
  type ReleaseEvidenceBundleV1,
  type ReleaseTrustContextV1,
  type TrustedOwnerResponseRegistryV1,
} from "./contracts";
import { validateAuditRun } from "./audit-run";
import {
  buildSimilarityFirewallReview,
  canonicalDigest,
  normalizeQuestionText,
  reviewDistractorsAndAnswerClues,
  validateCandidateBatch,
  validateCandidateCalculation,
  validateGeneratorJudgeSolverSeparation,
  validateMetaAuditBundle,
  validateTrustedSourceBindings,
} from "./validation";

export const QUESTION_FOUNDRY_MINIMUM_OWNER_RESPONSES_FOR_MEASUREMENT = 30;
export const QUESTION_FOUNDRY_MINIMUM_OWNER_SESSIONS_FOR_MEASUREMENT = 3;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/u;

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function selectedCandidate(bundle: ReleaseEvidenceBundleV1): QuestionCandidateV1 | null {
  return (
    bundle.batch.candidates.find(
      (candidate) => candidate.candidateId === bundle.selectedCandidateId,
    ) ?? null
  );
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

function validateSimilarity(bundle: ReleaseEvidenceBundleV1, errors: string[]) {
  const review = bundle.similarityReview;
  const candidate = selectedCandidate(bundle);
  if (!candidate) return;
  const recomputedReview = buildSimilarityFirewallReview(
    candidate,
    bundle.similarityReferences,
    bundle.trustedSources,
    review.threshold,
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
  if (
    !Number.isFinite(review.maximumTokenJaccard) ||
    !Number.isFinite(review.threshold) ||
    review.threshold <= 0 ||
    review.threshold >= 1 ||
    review.maximumTokenJaccard >= review.threshold ||
    review.nearCopyDetected ||
    review.reconstructionRiskDetected ||
    review.protectedExplanationSequenceDetected
  ) {
    errors.push("SIMILARITY_OR_RECONSTRUCTION_FIREWALL_BLOCKED");
  }
}

function validateOwnerAdjudication(bundle: ReleaseEvidenceBundleV1, errors: string[]) {
  const adjudication = bundle.ownerAdjudication;
  if (
    adjudication === null ||
    adjudication.adjudicatorRole !== "OWNER" ||
    adjudication.candidateId !== bundle.selectedCandidateId ||
    adjudication.decision !== "APPROVED" ||
    adjudication.sourceAndRightsReviewed !== true ||
    adjudication.ambiguityReviewed !== true ||
    adjudication.calculationReviewed !== true ||
    !isNonemptyString(adjudication.adjudicationId) ||
    !isIsoInstant(adjudication.decidedAt)
  ) {
    errors.push("OWNER_ADJUDICATION_REQUIRED_ABOVE_PERSONAL_TIER");
  }
}

function validateTransferEvidence(bundle: ReleaseEvidenceBundleV1, errors: string[]) {
  const transfer = bundle.transferEvidence;
  if (
    transfer === null ||
    transfer.candidateId !== bundle.selectedCandidateId ||
    transfer.sealedBeforeEvaluation !== true ||
    transfer.answerExposureBeforeEvaluation !== false ||
    !isNonemptyString(transfer.bundleId) ||
    !isIsoInstant(transfer.completedAt) ||
    transfer.allOutcomesCorrect !== true ||
    transfer.independentEvaluatorIds.length < 2 ||
    new Set(transfer.independentEvaluatorIds).size !== transfer.independentEvaluatorIds.length ||
    transfer.transferVariantIds.length < 2 ||
    new Set(transfer.transferVariantIds).size !== transfer.transferVariantIds.length
  ) {
    errors.push("TRANSFER_STRONG_BUNDLE_REQUIRED");
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
  requestedTier: QuestionFoundryReleasableTier,
  trustContext: ReleaseTrustContextV1 = { ownerResponseExportBinding: null },
): ReleaseDecisionV1 {
  const errors: string[] = [];
  try {
    errors.push(...validateCandidateBatch(bundle.batch).errors);
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
    validateSimilarity(bundle, errors);
    errors.push(...validateMetaAuditBundle(bundle.metaAudits, bundle.batch, bundle.selectedCandidateId).errors);

    if (requestedTier === "TRANSFER_VERIFIED" || requestedTier === "MEASUREMENT_CALIBRATED") {
      validateOwnerAdjudication(bundle, errors);
      validateTransferEvidence(bundle, errors);
      errors.push(
        ...validateTrustedSourceBindings(bundle.batch.blueprint.sourceBindings, bundle.trustedSources, [
          "QUESTION_BLUEPRINT_EXTRACTION",
          "QUESTION_GENERATION_CONTEXT",
          "PERSONAL_LEARNING_BANK",
          "TRANSFER_BANK",
        ]).errors,
      );
    }
    if (requestedTier === "MEASUREMENT_CALIBRATED") {
      errors.push("MEASUREMENT_RUNTIME_AUTHORITY_NOT_INSTALLED");
      validateOwnerResponseEvidence(bundle, trustContext, errors);
      errors.push(
        ...validateTrustedSourceBindings(bundle.batch.blueprint.sourceBindings, bundle.trustedSources, [
          "QUESTION_BLUEPRINT_EXTRACTION",
          "QUESTION_GENERATION_CONTEXT",
          "PERSONAL_LEARNING_BANK",
          "TRANSFER_BANK",
          "MEASUREMENT_BANK",
        ]).errors,
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
    requestedTier,
    allowed,
    releasedTier: allowed ? requestedTier : "QUARANTINED",
    candidateId: bundle?.selectedCandidateId ?? "missing-candidate",
    blockingCodes,
    maximumAiOnlyTier: "PERSONAL_LEARNING_USABLE" as const,
    learnerMasteryClaimed: false as const,
    calibrationClaimedWithoutOwnerEvidence: false as const,
    evidenceDigest: canonicalDigest(bundle),
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
  const auditValidation = validateAuditRun(input.auditRun);
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
