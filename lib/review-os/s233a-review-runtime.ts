import {
  S233_AI_CASCADE_VERSION,
  S233_ANSWER_PACK_SCHEMA_VERSION,
  S233_AUTHORITY_GUARDRAILS,
  S233_CONTROLLER_EVENT_VERSION,
  S233_INPUT_FINGERPRINT_SCOPE,
  S233_LEARNER_REVIEW_SCHEMA_VERSION,
  S233_REUSED_CONTRACT_VERSIONS,
  S233_SCORING_FINDING_SCHEMA_VERSION,
  S233_SCORING_ONTOLOGY_VERSION,
  assertValidS233ContractValue,
  validateS233AiEvaluationCascadeBundle,
  validateS233AnswerPackRegistryContext,
  validateS233LearnerReviewEvaluationContext,
  validateS233LearnerReviewRequestContext,
  validateS233LearnerReviewTransition,
  validateS233ScoringFindingBundle,
  validateS233TrustedScoringContext,
  type S233AiEvaluationCascadeBundle,
  type S233LearnerAnswerReviewIdentity,
  type S233LearnerReviewRequestContext,
  type S233ScoringFinding,
  type S233ScoringFindingBundle,
  type S233ScoringSkillIdentity,
} from "./s233-parallel-execution-contract";
import {
  computeS233aInputFingerprint,
  deriveS233aIdempotencyKey,
  deriveS233aLearnerOwnerRef,
  deriveS233aReviewId,
  deriveS233aTraceId,
  getS233aSubjectEngineVersion,
  normalizeS233aLearnerInputText,
  sha256S233a,
} from "./s233a-fingerprint";
import { buildS233aEvidenceBundles } from "./s233a-evidence";
import { isS233aReleasedAnswerPack } from "./s233a-answer-pack-release";
import { getS233aRubricAnchorId } from "./s233a-scoring-ontology";
import type {
  S233aGradeObservation,
  S233aPersistedReview,
  S233aPrimaryGradeResult,
  S233aReviewRequest,
  S233aReviewRuntimeDependencies,
  S233aReviewRuntimeResult,
  S233aTrustedReviewMaterials,
} from "./s233a-types";

const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const FINDING_STATUSES = new Set(["met", "partial", "missing", "incorrect", "not_assessable"]);
const ABSTENTION_REASONS = new Set([
  "learner_evidence_missing",
  "source_unresolved",
  "rubric_unresolved",
  "evaluator_uncertain",
  "critic_disagreement_unresolved",
  "unsupported_task",
]);

export class S233aRuntimeContractError extends Error {
  readonly code = "S233A_RUNTIME_CONTRACT_REJECTED";
  readonly reason: string;

  constructor(reason: string) {
    super(`s233a-contract-rejected:${reason}`);
    this.reason = reason;
  }
}

export class S233aRuntimeRetryableError extends Error {
  readonly code = "S233A_RUNTIME_RETRYABLE";
  readonly stage: "primary_grader" | "conditional_critic" | "persistence";

  constructor(stage: "primary_grader" | "conditional_critic" | "persistence") {
    super(`s233a-retryable:${stage}`);
    this.stage = stage;
  }
}

function requireToken(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !SAFE_TOKEN.test(value)) {
    throw new S233aRuntimeContractError(`invalid_${label}`);
  }
}

function validateRequestShape(request: S233aReviewRequest): void {
  requireToken(request.clientRequestId, "client_request_id");
  requireToken(request.answerSubmissionId, "answer_submission_id");
  requireToken(request.inputVersionId, "input_version_id");
  requireToken(request.historyId, "history_id");
  requireToken(request.attemptId, "attempt_id");
  requireToken(request.rootAttemptId, "root_attempt_id");
  requireToken(request.answerPackId, "answer_pack_id");
  requireToken(request.answerPackVersion, "answer_pack_version");
  if (request.parentAttemptId !== null) requireToken(request.parentAttemptId, "parent_attempt_id");
  if (request.predecessorReviewId !== null) requireToken(request.predecessorReviewId, "predecessor_review_id");
  if (request.predecessorControllerEventId !== null) {
    requireToken(request.predecessorControllerEventId, "predecessor_controller_event_id");
  }
  if (!Number.isInteger(request.attemptVersion) || request.attemptVersion < 1) {
    throw new S233aRuntimeContractError("invalid_attempt_version");
  }
  if (!Number.isFinite(request.elapsedTimeMs) || request.elapsedTimeMs < 0) {
    throw new S233aRuntimeContractError("invalid_elapsed_time");
  }
  if (!Number.isInteger(request.sessionPosition) || request.sessionPosition < 0) {
    throw new S233aRuntimeContractError("invalid_session_position");
  }
  if ((request.variantFamilyId === null) !== (request.variantDistance === null)) {
    throw new S233aRuntimeContractError("invalid_variant_lineage");
  }
  if (!["low", "medium", "high", "unknown"].includes(request.confidence)) {
    throw new S233aRuntimeContractError("invalid_confidence");
  }
  if (!["none", "navigation_only", "hint", "worked_step", "full_answer"].includes(request.assistanceLevel)) {
    throw new S233aRuntimeContractError("invalid_assistance_level");
  }
  if (!["none", "outline", "partial", "full"].includes(request.answerExposure)) {
    throw new S233aRuntimeContractError("invalid_answer_exposure");
  }
  for (const code of request.sourceUncertaintyCodes) requireToken(code, "source_uncertainty_code");
  for (const segment of request.learnerInput.segments) {
    requireToken(segment.segmentId, "segment_id");
    if (segment.calculationStepId !== undefined) {
      requireToken(segment.calculationStepId, "calculation_step_id");
    }
  }
}

function revealHistory(
  request: S233aReviewRequest,
  reviewId: string,
  now: string,
): S233LearnerAnswerReviewIdentity["revealHistory"] {
  if (request.revealHistory.length > 0) return structuredClone(request.revealHistory);
  return [
    {
      eventId: `reveal-${sha256S233a(reviewId).slice(0, 32)}`,
      occurredAt: now,
      exposure: request.answerExposure,
      answerLevel: request.answerExposure === "none" ? null : "L2_exam_length_answer",
      deliberateLearnerOverride: request.answerExposure !== "none",
    },
  ];
}

function initialReview(input: {
  request: S233aReviewRequest;
  ownerRef: string;
  reviewId: string;
  traceId: string;
  materials: S233aTrustedReviewMaterials;
  fingerprint: string;
  idempotencyKey: string;
  revealHistory: S233LearnerAnswerReviewIdentity["revealHistory"];
  fingerprintedRevealEventId: string;
  primaryModelVersion: string;
  primaryPromptVersion: string;
  criticModelVersion: string;
  criticPromptVersion: string;
}): S233LearnerAnswerReviewIdentity {
  const { request } = input;
  return {
    schemaVersion: S233_LEARNER_REVIEW_SCHEMA_VERSION,
    reviewId: input.reviewId,
    reviewRecordVersion: 1,
    expectedPreviousReviewRecordVersion: null,
    ownerBinding: "authenticated_request_user",
    learnerOwnerRefId: input.ownerRef,
    subject: request.subject,
    attemptId: request.attemptId,
    attemptVersion: request.attemptVersion,
    inputVersionId: request.inputVersionId,
    versions: {
      answerPackId: input.materials.answerPack.packId,
      answerPackVersion: input.materials.answerPack.packVersion,
      answerPackSchemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
      ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
      rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
      subjectEngineVersion: getS233aSubjectEngineVersion(request.subject),
      sourceVersion: input.materials.answerPack.snapshot.snapshotId,
      primaryModelVersion: input.primaryModelVersion,
      primaryPromptVersion: input.primaryPromptVersion,
      criticModelVersion: input.criticModelVersion,
      criticPromptVersion: input.criticPromptVersion,
      cascadeVersion: S233_AI_CASCADE_VERSION,
      cascadeTraceId: input.traceId,
      controllerEventVersion: S233_CONTROLLER_EVENT_VERSION,
      findingSchemaVersion: S233_SCORING_FINDING_SCHEMA_VERSION,
      rewriteRegradeVersion: S233_REUSED_CONTRACT_VERSIONS.s206RewriteRegrade,
    },
    revealHistory: input.revealHistory,
    rewriteRegradeLineage: {
      historyId: request.historyId,
      rootAnswerSubmissionId: request.answerSubmissionId,
      answerSubmissionId: request.answerSubmissionId,
      rootAttemptId: request.rootAttemptId,
      parentAttemptId: request.parentAttemptId,
      predecessorReviewId: request.predecessorReviewId,
    },
    idempotency: {
      key: input.idempotencyKey,
      inputFingerprint: input.fingerprint,
      fingerprintScope: S233_INPUT_FINGERPRINT_SCOPE,
      fingerprintedRevealEventId: input.fingerprintedRevealEventId,
      status: "claimed",
    },
    stageStatus: {
      overall: "pending",
      deterministicChecks: "pending",
      primaryGrader: "pending",
      conditionalCritic: "pending",
      persistence: "pending",
      failureStage: null,
    },
    queueTodayLinkage: {
      status: "not_linked",
      reviewQueueItemId: null,
      todayPlanTaskId: null,
    },
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
    dataBoundary: {
      learnerMaterialInIdentity: false,
      learnerMaterialInTelemetry: false,
      globalReferenceWrite: false,
      modelTrainingUse: false,
      metadataOnly: true,
      containsRawContent: false,
    },
  };
}

function nextRevision(
  previous: S233LearnerAnswerReviewIdentity,
  patch: Pick<S233LearnerAnswerReviewIdentity, "stageStatus" | "idempotency" | "queueTodayLinkage">,
): S233LearnerAnswerReviewIdentity {
  return {
    ...structuredClone(previous),
    reviewRecordVersion: previous.reviewRecordVersion + 1,
    expectedPreviousReviewRecordVersion: previous.reviewRecordVersion,
    stageStatus: patch.stageStatus,
    idempotency: patch.idempotency,
    queueTodayLinkage: patch.queueTodayLinkage,
  };
}

function persistedReviewReached(
  persisted: S233LearnerAnswerReviewIdentity,
  target: S233LearnerAnswerReviewIdentity,
): boolean {
  if (
    persisted.reviewId !== target.reviewId ||
    persisted.learnerOwnerRefId !== target.learnerOwnerRefId ||
    persisted.idempotency.key !== target.idempotency.key ||
    persisted.idempotency.inputFingerprint !== target.idempotency.inputFingerprint ||
    persisted.inputVersionId !== target.inputVersionId ||
    persisted.reviewRecordVersion < target.reviewRecordVersion ||
    JSON.stringify(persisted.versions) !== JSON.stringify(target.versions) ||
    JSON.stringify(persisted.rewriteRegradeLineage) !==
      JSON.stringify(target.rewriteRegradeLineage) ||
    JSON.stringify(persisted.revealHistory) !== JSON.stringify(target.revealHistory)
  ) return false;
  const ranks = {
    deterministicChecks: { pending: 0, failed_retryable: 1, completed: 2, failed: 2 },
    primaryGrader: { pending: 0, failed_retryable: 1, completed: 2, abstained: 2, skipped: 2 },
    conditionalCritic: { pending: 0, failed_retryable: 1, not_required: 2, completed: 2, abstained: 2 },
    persistence: { pending: 0, failed_retryable: 1, completed: 2 },
  } as const;
  return (Object.keys(ranks) as Array<keyof typeof ranks>).every((stage) => {
    const persistedStatus = persisted.stageStatus[stage];
    const targetStatus = target.stageStatus[stage];
    return (
      ranks[stage][persistedStatus as keyof (typeof ranks)[typeof stage]] >=
      ranks[stage][targetStatus as keyof (typeof ranks)[typeof stage]]
    );
  });
}

async function persistRevision(
  deps: S233aReviewRuntimeDependencies,
  authenticatedUserId: string,
  previous: S233LearnerAnswerReviewIdentity,
  next: S233LearnerAnswerReviewIdentity,
): Promise<S233LearnerAnswerReviewIdentity> {
  assertValidS233ContractValue(validateS233LearnerReviewTransition(previous, next));
  try {
    const persisted = await deps.repository.transition(authenticatedUserId, {
      previous,
      next,
      evaluationContext: null,
      evidenceBundles: [],
      conceptTransitions: [],
      queueTodayLinkage: null,
      persistenceReceiptId: deps.randomId("persistence-receipt"),
    });
    return persisted.review;
  } catch {
    const recovered = await deps.repository.loadReview(authenticatedUserId, next.reviewId);
    if (recovered && persistedReviewReached(recovered.review, next)) {
      return recovered.review;
    }
    throw new S233aRuntimeRetryableError("persistence");
  }
}

function terminalReplay(persisted: S233aPersistedReview): S233aReviewRuntimeResult {
  return {
    replayed: true,
    review: persisted.review,
    cascadeBundle: persisted.evaluationContext?.cascadeBundle ?? null,
    findingBundles: persisted.evaluationContext?.findingBundles ?? [],
    evidenceBundles: persisted.evidenceBundles,
  };
}

function deterministicBlockers(
  request: S233aReviewRequest,
  materials: S233aTrustedReviewMaterials,
  history: S233LearnerAnswerReviewIdentity["revealHistory"],
): string[] {
  const blockers: string[] = [];
  const normalized = normalizeS233aLearnerInputText(request.learnerInput.normalizedText);
  if (!normalized || request.learnerInput.segments.length === 0) blockers.push("learner_evidence_missing");
  if (materials.answerPack.subject !== request.subject) blockers.push("answer_pack_subject_mismatch");
  if (!unambiguousSourceRecord(materials)) blockers.push("source_unresolved");
  const latestExposure = history.at(-1)?.exposure;
  if (latestExposure !== request.answerExposure) blockers.push("exposure_history_mismatch");
  if (request.attemptVersion === 1) {
    if (
      request.rootAttemptId !== request.attemptId ||
      request.parentAttemptId !== null ||
      request.predecessorReviewId !== null
    ) blockers.push("invalid_root_attempt_lineage");
  }
  return blockers;
}

function deterministicSkillStatus(
  subject: S233aReviewRequest["subject"],
  text: string,
): "met" | "missing" {
  const pattern =
    subject === "law"
      ? /(쟁점|요건|조문|법리|사안|결론)/
      : subject === "theory"
        ? /(의의|정의|논거|비교|평가|결론)/
        : /(가정|자료|산식|계산|단위|검산|결론|\d)/;
  return pattern.test(text) ? "met" : "missing";
}

function normalizedObservations(
  primary: S233aPrimaryGradeResult,
  skills: S233ScoringSkillIdentity[],
  request: S233aReviewRequest,
): S233aPrimaryGradeResult {
  const observations = Array.isArray(primary.observations) ? primary.observations : [];
  const bySkill = new Map<string, S233aGradeObservation>();
  let invalid = primary.status !== "completed" && primary.status !== "abstained";
  for (const observation of observations) {
    if (!observation || typeof observation !== "object" || bySkill.has(observation.skillId)) {
      invalid = true;
      continue;
    }
    if (!skills.some((skill) => skill.skillId === observation.skillId)) invalid = true;
    bySkill.set(observation.skillId, observation);
  }
  const segmentIds = new Set(request.learnerInput.segments.map((segment) => segment.segmentId));
  const calculationIds = new Set(
    request.learnerInput.segments
      .map((segment) => segment.calculationStepId)
      .filter((value): value is string => Boolean(value)),
  );
  const result = skills.map((skill) => {
    const observation = bySkill.get(skill.skillId);
    const valid =
      observation &&
      FINDING_STATUSES.has(observation.status) &&
      ["low", "medium", "high"].includes(observation.confidence) &&
      Array.isArray(observation.uncertaintyCodes) &&
      observation.uncertaintyCodes.every((code) => typeof code === "string" && SAFE_TOKEN.test(code)) &&
      (observation.abstentionReason === null || ABSTENTION_REASONS.has(observation.abstentionReason)) &&
      (observation.learnerSegmentId === null || segmentIds.has(observation.learnerSegmentId)) &&
      (observation.learnerCalculationStepId === null || calculationIds.has(observation.learnerCalculationStepId)) &&
      (observation.status === "missing" ||
        observation.status === "not_assessable" ||
        observation.learnerSegmentId !== null ||
        observation.learnerCalculationStepId !== null) &&
      (observation.status === "not_assessable"
        ? observation.abstentionReason !== null
        : observation.abstentionReason === null);
    if (!valid) {
      invalid = true;
      return {
        skillId: skill.skillId,
        status: "not_assessable" as const,
        learnerSegmentId: null,
        learnerCalculationStepId: null,
        confidence: "low" as const,
        uncertaintyCodes: ["evaluator_uncertain"],
        abstentionReason: "evaluator_uncertain" as const,
      };
    }
    return structuredClone(observation);
  });
  const abstained = invalid || result.some((item) => item.status === "not_assessable");
  return { status: abstained ? "abstained" : "completed", observations: result };
}

function unambiguousSourceRecord(materials: S233aTrustedReviewMaterials) {
  const anchors = [...new Set(materials.answerPack.claimSourceGraph.sourceAnchorIds)];
  if (anchors.length !== 1) return null;
  const sourceAnchorId = anchors[0];
  if (!materials.answerPack.claimSourceGraph.claimIds.every((claimId) =>
    materials.answerPack.claimSourceGraph.edges.some(
      (edge) =>
        edge.claimId === claimId &&
        edge.sourceAnchorId === sourceAnchorId &&
        edge.relation === "supports",
    ),
  )) return null;
  const sourceRecord = materials.answerPackRegistryContext.sourceRecords.find((record) =>
    record.sourceAnchorIds.includes(sourceAnchorId),
  );
  if (!sourceRecord) return null;
  return { sourceAnchorId, sourceRecord };
}

function sourceBinding(
  materials: S233aTrustedReviewMaterials,
  skill: S233ScoringSkillIdentity,
) {
  const source = unambiguousSourceRecord(materials);
  if (!source) return null;
  return {
    sourceAnchorId: source.sourceAnchorId,
    sourceId: source.sourceRecord.sourceId,
    sourceSnapshotId: materials.answerPack.snapshot.snapshotId,
    answerPackId: materials.answerPack.packId,
    answerPackVersion: materials.answerPack.packVersion,
    subject: skill.subject,
    taskArchetype: skill.taskArchetype,
  };
}

function requireUnambiguousSourceGrounding(
  primary: S233aPrimaryGradeResult,
  materials: S233aTrustedReviewMaterials,
  skills: S233ScoringSkillIdentity[],
): S233aPrimaryGradeResult {
  if (skills.every((skill) => sourceBinding(materials, skill) !== null)) return primary;
  return {
    status: "abstained",
    observations: primary.observations.map((observation) => ({
      skillId: observation.skillId,
      status: "not_assessable",
      learnerSegmentId: null,
      learnerCalculationStepId: null,
      confidence: "low",
      uncertaintyCodes: [...new Set([...observation.uncertaintyCodes, "source_unresolved"])],
      abstentionReason: "source_unresolved",
    })),
  };
}

function buildFindingBundles(input: {
  review: S233LearnerAnswerReviewIdentity;
  traceId: string;
  materials: S233aTrustedReviewMaterials;
  skills: S233ScoringSkillIdentity[];
  primary: S233aPrimaryGradeResult;
}): S233ScoringFindingBundle[] {
  return input.skills.map((skill, index) => {
    const observation = input.primary.observations[index];
    const notAssessable = observation.status === "not_assessable";
    const missing = observation.status === "missing";
    const source = sourceBinding(input.materials, skill);
    if (!notAssessable && !source) {
      throw new S233aRuntimeContractError("unresolved_source_anchor");
    }
    const rubricAnchorId = getS233aRubricAnchorId(skill.skillId);
    const provenanceRefId = `evaluation-${sha256S233a(`${input.traceId}:${skill.skillId}`).slice(0, 32)}`;
    const learnerEvidenceLocator = notAssessable
      ? null
      : missing
        ? {
            answerSubmissionId: input.review.rewriteRegradeLineage.answerSubmissionId,
            inputVersionId: input.review.inputVersionId,
            wholeAnswer: true as const,
            containsRawContent: false as const,
          }
        : {
            answerSubmissionId: input.review.rewriteRegradeLineage.answerSubmissionId,
            inputVersionId: input.review.inputVersionId,
            wholeAnswer: false as const,
            ...(observation.learnerCalculationStepId
              ? { calculationStepId: observation.learnerCalculationStepId }
              : { segmentId: observation.learnerSegmentId! }),
            containsRawContent: false as const,
          };
    const learnerRef = missing
      ? input.review.rewriteRegradeLineage.answerSubmissionId
      : observation.learnerCalculationStepId ?? observation.learnerSegmentId;
    const evidenceRequirementBindings = notAssessable
      ? []
      : skill.evidenceRequirements.map((requirement) => ({
          requirementId: requirement.requirementId,
          evidenceRefIds:
            requirement.kind === "source_anchor"
              ? [source!.sourceAnchorId]
              : requirement.kind === "rubric_anchor"
                ? [rubricAnchorId]
                : [learnerRef!],
        }));
    const finding: S233ScoringFinding = {
      schemaVersion: S233_SCORING_FINDING_SCHEMA_VERSION,
      findingId: `finding-${sha256S233a(`${input.review.reviewId}:${skill.skillId}`).slice(0, 32)}`,
      skillId: skill.skillId,
      status: observation.status,
      learnerEvidenceLocator,
      sourceAnchorIds: notAssessable || !source ? [] : [source.sourceAnchorId],
      rubricAnchorIds: notAssessable ? [] : [rubricAnchorId],
      evidenceRequirementBindings,
      confidence: {
        level: observation.confidence,
        uncertaintyCodes: [...observation.uncertaintyCodes],
      },
      provenance: { kind: "ai_inferred", provenanceRefId },
      abstentionReason: observation.abstentionReason,
      authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
      containsRawContent: false,
    };
    const bundle: S233ScoringFindingBundle = {
      finding,
      skill,
      expectedAnswerSubmissionId: input.review.rewriteRegradeLineage.answerSubmissionId,
      expectedInputVersionId: input.review.inputVersionId,
      ontologySkillBindings: [{ skill: structuredClone(skill) }],
      sourceAnchorBindings: notAssessable || !source ? [] : [source],
      rubricAnchorBindings: notAssessable
        ? []
        : [
            {
              rubricAnchorId,
              rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
              subject: skill.subject,
              skillId: skill.skillId,
            },
          ],
      provenanceBindings: [
        {
          provenanceRefId,
          kind: "ai_inferred",
          subject: skill.subject,
          skillId: skill.skillId,
          cascadeTraceId: input.traceId,
          modelVersion: input.review.versions.primaryModelVersion,
          promptVersion: input.review.versions.primaryPromptVersion,
        },
      ],
    };
    assertValidS233ContractValue(validateS233ScoringFindingBundle(bundle));
    return bundle;
  });
}

function requestContext(
  ownerRef: string,
  idempotencyKey: string,
  fingerprint: string,
): S233LearnerReviewRequestContext {
  return {
    authenticatedLearnerOwnerRefId: ownerRef,
    requestIdempotencyKey: idempotencyKey,
    computedInputFingerprintSha256: fingerprint,
  };
}

function validateRewriteLineage(
  request: S233aReviewRequest,
  predecessor: S233aPersistedReview | null,
  ownerRef: string,
): void {
  if (request.attemptVersion === 1) return;
  if (!predecessor || !request.predecessorReviewId) {
    throw new S233aRuntimeContractError("missing_rewrite_predecessor");
  }
  const previous = predecessor.review;
  if (
    previous.learnerOwnerRefId !== ownerRef ||
    previous.reviewId !== request.predecessorReviewId ||
    (previous.stageStatus.overall !== "completed" &&
      previous.stageStatus.overall !== "abstained") ||
    previous.rewriteRegradeLineage.rootAnswerSubmissionId !== request.answerSubmissionId ||
    previous.rewriteRegradeLineage.rootAttemptId !== request.rootAttemptId ||
    previous.attemptId !== request.parentAttemptId ||
    previous.attemptVersion + 1 !== request.attemptVersion
  ) {
    throw new S233aRuntimeContractError("forged_rewrite_lineage");
  }
}

function resultFromPersisted(
  persisted: S233aPersistedReview,
  replayed: boolean,
): S233aReviewRuntimeResult {
  return {
    replayed,
    review: persisted.review,
    cascadeBundle: persisted.evaluationContext?.cascadeBundle ?? null,
    findingBundles: persisted.evaluationContext?.findingBundles ?? [],
    evidenceBundles: persisted.evidenceBundles,
  };
}

export async function runS233aAnswerReview(
  request: S233aReviewRequest,
  deps: S233aReviewRuntimeDependencies,
): Promise<S233aReviewRuntimeResult> {
  validateRequestShape(request);
  const ownerRef = deriveS233aLearnerOwnerRef(request.authenticatedUserId);
  const reviewId = deriveS233aReviewId(ownerRef, request.clientRequestId);
  const traceId = deriveS233aTraceId(reviewId);
  const idempotencyKey = deriveS233aIdempotencyKey(ownerRef, request.clientRequestId);
  const primaryGrader = deps.primaryGraders[request.subject];
  if (!primaryGrader) throw new S233aRuntimeContractError("unsupported_subject");
  requireToken(primaryGrader.modelVersion, "primary_model_version");
  requireToken(primaryGrader.promptVersion, "primary_prompt_version");
  requireToken(deps.critic.modelVersion, "critic_model_version");
  requireToken(deps.critic.promptVersion, "critic_prompt_version");

  const materials = await deps.loadTrustedMaterials({
    answerPackId: request.answerPackId,
    answerPackVersion: request.answerPackVersion,
    subject: request.subject,
  });
  assertValidS233ContractValue(
    validateS233AnswerPackRegistryContext(
      materials.answerPack,
      materials.answerPackRegistryContext,
    ),
  );
  assertValidS233ContractValue(validateS233TrustedScoringContext(materials.trustedScoringContext));
  if (
    !isS233aReleasedAnswerPack(materials.answerPack, materials.answerPackRegistryContext) ||
    materials.answerPack.packId !== request.answerPackId ||
    materials.answerPack.packVersion !== request.answerPackVersion ||
    materials.answerPack.subject !== request.subject ||
    !materials.evaluationReferenceText.trim()
  ) throw new S233aRuntimeContractError("trusted_material_binding_mismatch");

  const predecessor = request.predecessorReviewId
    ? await deps.repository.loadReview(request.authenticatedUserId, request.predecessorReviewId)
    : null;
  validateRewriteLineage(request, predecessor, ownerRef);

  const now = deps.now();
  const history = revealHistory(request, reviewId, now);
  const fingerprintedRevealEvent = history.at(-1)!;
  const fingerprint = computeS233aInputFingerprint({
    learnerOwnerRefId: ownerRef,
    answerSubmissionId: request.answerSubmissionId,
    inputVersionId: request.inputVersionId,
    normalizedLearnerInput: request.learnerInput.normalizedText,
    answerPackId: materials.answerPack.packId,
    answerPackVersion: materials.answerPack.packVersion,
    sourceVersion: materials.answerPack.snapshot.snapshotId,
    subject: request.subject,
    primaryModelVersion: primaryGrader.modelVersion,
    primaryPromptVersion: primaryGrader.promptVersion,
    criticModelVersion: deps.critic.modelVersion,
    criticPromptVersion: deps.critic.promptVersion,
    fingerprintedRevealEvent,
  });
  const initial = initialReview({
    request,
    ownerRef,
    reviewId,
    traceId,
    materials,
    fingerprint: fingerprint.fingerprint,
    idempotencyKey,
    revealHistory: history,
    fingerprintedRevealEventId: fingerprintedRevealEvent.eventId,
    primaryModelVersion: primaryGrader.modelVersion,
    primaryPromptVersion: primaryGrader.promptVersion,
    criticModelVersion: deps.critic.modelVersion,
    criticPromptVersion: deps.critic.promptVersion,
  });
  const authContext = requestContext(ownerRef, idempotencyKey, fingerprint.fingerprint);
  assertValidS233ContractValue(validateS233LearnerReviewRequestContext(initial, authContext));
  const claimed = await deps.repository.claim(
    request.authenticatedUserId,
    initial,
    deps.randomId("persistence-receipt"),
  );
  if (
    (claimed.status === "replayed" || claimed.status === "in_progress") &&
    (claimed.persisted.review.stageStatus.overall === "completed" ||
      claimed.persisted.review.stageStatus.overall === "abstained")
  ) return terminalReplay(claimed.persisted);
  let current = claimed.persisted.review;
  if (
    claimed.status === "in_progress" ||
    claimed.status === "replayed" ||
    (claimed.status === "retry_claimed" && current.stageStatus.overall !== "failed_retryable")
  ) {
    throw new S233aRuntimeRetryableError("persistence");
  }

  const checkIds = [
    "s233a-owner-input-binding",
    "s233a-answer-pack-registry",
    "s233a-exposure-history",
    "s233a-rewrite-lineage",
  ];
  const blockers = deterministicBlockers(request, materials, history);
  const deterministicPassed = blockers.length === 0;
  if (deterministicPassed && current.stageStatus.deterministicChecks !== "completed") {
    current = await persistRevision(
      deps,
      request.authenticatedUserId,
      current,
      nextRevision(current, {
        idempotency: { ...current.idempotency, status: "claimed" },
        queueTodayLinkage: current.queueTodayLinkage,
        stageStatus: {
          overall: "partial",
          deterministicChecks: "completed",
          primaryGrader: "pending",
          conditionalCritic: "pending",
          persistence: "pending",
          failureStage: null,
        },
      }),
    );
  }

  const skills = structuredClone(materials.trustedScoringContext.canonicalSkills);
  let primary: S233aPrimaryGradeResult = { status: "abstained", observations: [] };
  let findingBundles: S233ScoringFindingBundle[] = [];
  let deterministicResults: S233AiEvaluationCascadeBundle["deterministicFindingCheckResults"] = [];
  const evaluationInput = {
    request,
    learnerOwnerRefId: ownerRef,
    reviewId,
    traceId,
    materials,
    skills,
  };

  if (deterministicPassed) {
    try {
      primary = requireUnambiguousSourceGrounding(
        normalizedObservations(await primaryGrader.grade(evaluationInput), skills, request),
        materials,
        skills,
      );
    } catch {
      if (current.stageStatus.primaryGrader !== "completed") {
        const failed = nextRevision(current, {
          idempotency: { ...current.idempotency, status: "failed_retryable" },
          queueTodayLinkage: current.queueTodayLinkage,
          stageStatus: {
            overall: "failed_retryable",
            deterministicChecks: "completed",
            primaryGrader: "failed_retryable",
            conditionalCritic: "pending",
            persistence: "pending",
            failureStage: "primary_grader",
          },
        });
        await persistRevision(deps, request.authenticatedUserId, current, failed);
      }
      throw new S233aRuntimeRetryableError("primary_grader");
    }
    findingBundles = buildFindingBundles({
      review: current,
      traceId,
      materials,
      skills,
      primary,
    });
    const criticalSkill = skills.find((skill) => skill.critical) ?? skills[0];
    const criticalFinding = findingBundles.find((bundle) => bundle.skill.skillId === criticalSkill.skillId)!;
    deterministicResults = [
      {
        checkResultId: `check-result-${sha256S233a(`${reviewId}:${criticalSkill.skillId}`).slice(0, 24)}`,
        checkId: checkIds[0],
        findingId: criticalFinding.finding.findingId,
        deterministicStatus: deterministicSkillStatus(
          request.subject,
          normalizeS233aLearnerInputText(request.learnerInput.normalizedText),
        ),
        persistenceReceiptId: claimed.persisted.persistenceReceiptId,
        immutable: true,
        containsRawContent: false,
      },
    ];
    if (
      primary.status === "completed" &&
      current.stageStatus.primaryGrader !== "completed"
    ) {
      current = await persistRevision(
        deps,
        request.authenticatedUserId,
        current,
        nextRevision(current, {
          idempotency: { ...current.idempotency, status: "claimed" },
          queueTodayLinkage: current.queueTodayLinkage,
          stageStatus: {
            overall: "partial",
            deterministicChecks: "completed",
            primaryGrader: "completed",
            conditionalCritic: "pending",
            persistence: "pending",
            failureStage: null,
          },
        }),
      );
    }
  }

  const findings = findingBundles.map((bundle) => bundle.finding);
  const skillById = new Map(skills.map((skill) => [skill.skillId, skill]));
  const adverse = new Set(["partial", "missing", "incorrect", "not_assessable"]);
  const criticalFindingIds = findings
    .filter((finding) => skillById.get(finding.skillId)?.critical && adverse.has(finding.status))
    .map((finding) => finding.findingId);
  const uncertaintyCodes = [
    ...new Set(
      findings.flatMap((finding) => [
        ...finding.confidence.uncertaintyCodes,
        ...(finding.status === "not_assessable" && finding.abstentionReason
          ? [finding.abstentionReason]
          : []),
      ]),
    ),
  ];
  const disagreement = deterministicResults.some((result) =>
    findings.some(
      (finding) =>
        finding.findingId === result.findingId &&
        finding.status !== result.deterministicStatus,
    ),
  );
  const triggerReasons = [
    ...(criticalFindingIds.length > 0 ? (["critical_finding"] as const) : []),
    ...(uncertaintyCodes.length > 0 ? (["uncertainty"] as const) : []),
    ...(disagreement ? (["grader_disagreement"] as const) : []),
  ];
  let criticStatus: "not_required" | "completed" | "abstained" = "not_required";
  let criticUnresolvedCodes: string[] = [];
  if (deterministicPassed && triggerReasons.length > 0) {
    try {
      const critic = await deps.critic.review({
        ...evaluationInput,
        primary,
        findingBundles,
      });
      criticStatus =
        critic.status === "completed" && critic.unresolvedCodes.length === 0
          ? "completed"
          : "abstained";
      criticUnresolvedCodes =
        criticStatus === "completed"
          ? []
          : critic.unresolvedCodes.length > 0
            ? [...critic.unresolvedCodes]
            : ["critic_disagreement_unresolved"];
    } catch {
      if (primary.status === "completed") {
        const failed = nextRevision(current, {
          idempotency: { ...current.idempotency, status: "failed_retryable" },
          queueTodayLinkage: current.queueTodayLinkage,
          stageStatus: {
            overall: "failed_retryable",
            deterministicChecks: "completed",
            primaryGrader: "completed",
            conditionalCritic: "failed_retryable",
            persistence: "pending",
            failureStage: "conditional_critic",
          },
        });
        await persistRevision(deps, request.authenticatedUserId, current, failed);
        throw new S233aRuntimeRetryableError("conditional_critic");
      }
      criticStatus = "abstained";
      criticUnresolvedCodes = ["critic_disagreement_unresolved"];
    }
  }
  if (
    primary.status === "completed" &&
    criticStatus !== "abstained" &&
    current.stageStatus.conditionalCritic !== criticStatus
  ) {
    current = await persistRevision(
      deps,
      request.authenticatedUserId,
      current,
      nextRevision(current, {
        idempotency: { ...current.idempotency, status: "claimed" },
        queueTodayLinkage: current.queueTodayLinkage,
        stageStatus: {
          overall: "partial",
          deterministicChecks: "completed",
          primaryGrader: "completed",
          conditionalCritic: criticStatus,
          persistence: "pending",
          failureStage: null,
        },
      }),
    );
  }

  const finalDisposition =
    !deterministicPassed || primary.status === "abstained" || criticStatus === "abstained"
      ? "abstained"
      : "evaluated";
  const trace: S233AiEvaluationCascadeBundle["trace"] = {
    traceId,
    cascadeVersion: S233_AI_CASCADE_VERSION,
    learnerOwnerRefId: ownerRef,
    learnerReviewId: reviewId,
    answerSubmissionId: request.answerSubmissionId,
    inputVersionId: request.inputVersionId,
    inputFingerprintSha256: fingerprint.fingerprint,
    answerPackId: materials.answerPack.packId,
    answerPackVersion: materials.answerPack.packVersion,
    sourceSnapshotId: materials.answerPack.snapshot.snapshotId,
    deterministicChecks: {
      status: deterministicPassed ? ("passed" as const) : ("failed" as const),
      checkIds,
      blockerCodes: blockers,
    },
    primarySubjectGrader: deterministicPassed
      ? {
          subject: request.subject,
          status: primary.status,
          modelVersion: primaryGrader.modelVersion,
          promptVersion: primaryGrader.promptVersion,
          findingIds: findings.map((finding) => finding.findingId),
          criticalFindingIds,
          uncertaintyCodes,
          graderDisagreementDetected: disagreement,
        }
      : {
          subject: request.subject,
          status: "not_run" as const,
          modelVersion: null,
          promptVersion: null,
          findingIds: [],
          criticalFindingIds: [],
          uncertaintyCodes: [],
          graderDisagreementDetected: false,
        },
    conditionalCritic:
      deterministicPassed && triggerReasons.length > 0
        ? {
            status: criticStatus as "completed" | "abstained",
            triggerReasons,
            modelVersion: deps.critic.modelVersion,
            promptVersion: deps.critic.promptVersion,
            unresolvedCodes: criticUnresolvedCodes,
          }
        : {
            status: "not_required" as const,
            triggerReasons: [],
            modelVersion: null,
            promptVersion: null,
            unresolvedCodes: [],
          },
    finalDisposition,
    humanApproval: { requested: false as const, required: false as const, received: false as const },
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
  };
  const cascadeBundle: S233AiEvaluationCascadeBundle = {
    trace,
    findings,
    skills: findingBundles.map((bundle) => bundle.skill),
    deterministicFindingCheckResults: deterministicResults,
  };
  assertValidS233ContractValue(validateS233AiEvaluationCascadeBundle(cascadeBundle));

  const primaryGap =
    findingBundles.find((bundle) => adverse.has(bundle.finding.status))?.skill ??
    findingBundles[0]?.skill ??
    null;
  const linkage = deps.prepareQueueTodayLinkage({
    reviewId,
    answerSubmissionId: request.answerSubmissionId,
    subject: request.subject,
    skill: primaryGap,
    abstained: finalDisposition === "abstained",
    now,
  });
  const terminal = nextRevision(current, {
    idempotency: { ...current.idempotency, status: "completed" },
    queueTodayLinkage: {
      status: "queue_and_today_linked",
      reviewQueueItemId: linkage.reviewQueueItemId,
      todayPlanTaskId: linkage.todayPlanTaskId,
    },
    stageStatus: {
      overall: finalDisposition === "evaluated" ? "completed" : "abstained",
      deterministicChecks: deterministicPassed ? "completed" : "failed",
      primaryGrader: deterministicPassed ? primary.status : "skipped",
      conditionalCritic: trace.conditionalCritic.status,
      persistence: "completed",
      failureStage: null,
    },
  });
  assertValidS233ContractValue(validateS233LearnerReviewTransition(current, terminal));
  const evaluationContext = {
    review: terminal,
    requestContext: authContext,
    cascadeBundle,
    answerPack: materials.answerPack,
    answerPackRegistryContext: materials.answerPackRegistryContext,
    trustedScoringContext: materials.trustedScoringContext,
    findingBundles,
  };
  assertValidS233ContractValue(validateS233LearnerReviewEvaluationContext(evaluationContext));

  const terminalReceiptId = deps.randomId("persistence-receipt");
  const evidence = buildS233aEvidenceBundles({
    request,
    review: terminal,
    findingBundles,
    predecessor,
    evaluationAbstained: finalDisposition === "abstained",
    persistenceReceiptId: terminalReceiptId,
    observedAt: deps.now(),
    randomId: deps.randomId,
  });
  try {
    const persisted = await deps.repository.transition(request.authenticatedUserId, {
      previous: current,
      next: terminal,
      evaluationContext,
      evidenceBundles: evidence.evidenceBundles,
      conceptTransitions: evidence.conceptTransitions,
      queueTodayLinkage: linkage,
      persistenceReceiptId: terminalReceiptId,
    });
    return resultFromPersisted(persisted, false);
  } catch {
    const recovered = await deps.repository.loadReview(request.authenticatedUserId, reviewId);
    if (
      recovered &&
      recovered.review.idempotency.inputFingerprint === fingerprint.fingerprint &&
      (recovered.review.stageStatus.overall === "completed" ||
        recovered.review.stageStatus.overall === "abstained")
    ) return resultFromPersisted(recovered, true);
    throw new S233aRuntimeRetryableError("persistence");
  }
}
