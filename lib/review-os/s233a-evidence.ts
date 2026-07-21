import {
  S233_CONTROLLER_EVENT_VERSION,
  S233_EVIDENCE_STATE_SCHEMA_VERSION,
  assertValidS233ContractValue,
  validateS233LaneAEvidenceProofBundle,
  type S233EvidenceProofBundle,
  type S233LearnerAnswerReviewIdentity,
  type S233ScoringFindingBundle,
} from "./s233-parallel-execution-contract";
import { sha256S233a } from "./s233a-fingerprint";
import type {
  S233aConceptTransition,
  S233aPersistedReview,
  S233aReviewRequest,
} from "./s233a-types";

type EvidenceBuildInput = {
  request: S233aReviewRequest;
  review: S233LearnerAnswerReviewIdentity;
  findingBundles: S233ScoringFindingBundle[];
  predecessor: S233aPersistedReview | null;
  evaluationAbstained: boolean;
  persistenceReceiptId: string;
  observedAt: string;
  randomId(prefix: string): string;
};

function laterTimestamp(candidate: string, predecessor: string | null): string {
  if (!predecessor) return candidate;
  const candidateMs = Date.parse(candidate);
  const predecessorMs = Date.parse(predecessor);
  if (Number.isFinite(candidateMs) && Number.isFinite(predecessorMs) && candidateMs <= predecessorMs) {
    return new Date(predecessorMs + 1).toISOString();
  }
  return candidate;
}

function predecessorByConcept(
  persisted: S233aPersistedReview | null,
): Map<string, S233EvidenceProofBundle> {
  const result = new Map<string, S233EvidenceProofBundle>();
  for (const bundle of persisted?.evidenceBundles ?? []) {
    if (
      bundle.record.learnerOwnerRefId === persisted?.review.learnerOwnerRefId &&
      (bundle.record.state === "detected" || bundle.record.state === "uncertain")
    ) {
      result.set(bundle.record.conceptNodeId, bundle);
    }
  }
  return result;
}

function outcomeFor(status: S233ScoringFindingBundle["finding"]["status"]) {
  if (status === "partial") return "partially_correct" as const;
  if (status === "not_assessable") return "abstained" as const;
  if (status === "met") return "correct" as const;
  return "incorrect" as const;
}

function conceptResult(
  state: "detected" | "corrected" | "uncertain",
  outcome: "correct" | "partially_correct" | "incorrect" | "abstained",
): S233aConceptTransition["result"] {
  if (state === "corrected") return "correct";
  if (state === "uncertain" || outcome === "abstained") return "unknown";
  if (outcome === "partially_correct") return "needs_rewrite";
  return "wrong";
}

export function buildS233aEvidenceBundles(input: EvidenceBuildInput): {
  evidenceBundles: S233EvidenceProofBundle[];
  conceptTransitions: S233aConceptTransition[];
} {
  const previousByConcept = predecessorByConcept(input.predecessor);
  const evidenceBundles: S233EvidenceProofBundle[] = [];
  const conceptTransitions: S233aConceptTransition[] = [];

  for (const findingBundle of input.findingBundles) {
    const { finding, skill } = findingBundle;
    const previous = previousByConcept.get(skill.skillId) ?? null;
    const state: "detected" | "corrected" | "uncertain" | null =
      input.evaluationAbstained
        ? "uncertain"
        : finding.status === "met"
        ? previous
          ? "corrected"
          : null
        : finding.status === "not_assessable"
          ? "uncertain"
          : "detected";
    if (!state) continue;

    const observedAt = laterTimestamp(
      input.observedAt,
      previous?.record.observedAt ?? null,
    );
    const evidenceStateId = input.randomId("evidence-state");
    const eventId = input.randomId("controller-event");
    const proofRefId = input.randomId("outcome-proof");
    const evidenceLearnerReviewId =
      previous?.record.learnerReviewId ?? input.review.reviewId;
    const outcome =
      state === "corrected"
        ? "correct"
        : state === "uncertain"
          ? "abstained"
          : outcomeFor(finding.status);
    const predecessorRecord = previous?.record ?? null;
    const proofRecord = {
      proofRefId,
      kind: state === "corrected" ? ("rewrite_verification" as const) : ("scoring_finding" as const),
      learnerOwnerRefId: input.review.learnerOwnerRefId,
      learnerReviewId: evidenceLearnerReviewId,
      conceptNodeId: skill.skillId,
      controllerEventId: eventId,
      outcome,
      variantTaskId: input.review.attemptId,
      variantFamilyId: input.request.variantFamilyId,
      variantDistance: input.request.variantDistance,
      observedAt,
      persistenceReceiptId: input.persistenceReceiptId,
      immutable: true as const,
      containsRawContent: false as const,
    };
    const controllerEvent = {
      eventVersion: S233_CONTROLLER_EVENT_VERSION,
      eventId,
      idempotencyKey: `controller:${input.review.learnerOwnerRefId}:${sha256S233a(`${input.review.reviewId}:${skill.skillId}:${state}`).slice(0, 32)}`,
      learnerOwnerRefId: input.review.learnerOwnerRefId,
      learnerReviewId: evidenceLearnerReviewId,
      conceptNodeId: skill.skillId,
      occurredAt: observedAt,
      elapsedTimeMs: input.request.elapsedTimeMs,
      confidence: input.request.confidence,
      assistanceLevel: input.request.assistanceLevel,
      answerExposure: input.request.answerExposure,
      inputModality: input.request.inputModality,
      variantFamilyId: input.request.variantFamilyId,
      variantDistance: input.request.variantDistance,
      sessionPosition: input.request.sessionPosition,
      sourceUncertaintyCodes: [...input.request.sourceUncertaintyCodes],
      evaluatorUncertaintyCodes: [...finding.confidence.uncertaintyCodes],
      outcome,
      outcomeProofRefIds: [proofRefId],
      predecessorEventId: predecessorRecord?.evidenceEventId ?? input.request.predecessorControllerEventId,
      successorEventId: null,
      metadataOnly: true as const,
      containsRawContent: false as const,
    };
    const record = {
      schemaVersion: S233_EVIDENCE_STATE_SCHEMA_VERSION,
      evidenceStateId,
      learnerOwnerRefId: input.review.learnerOwnerRefId,
      learnerReviewId: evidenceLearnerReviewId,
      conceptNodeId: skill.skillId,
      state,
      emitter: "lane_a" as const,
      initialDetectionEventId: predecessorRecord?.initialDetectionEventId ?? eventId,
      evidenceEventId: eventId,
      predecessorEvidenceStateId: predecessorRecord?.evidenceStateId ?? null,
      evidenceKind:
        state === "corrected"
          ? ("verified_correction" as const)
          : state === "uncertain"
            ? ("unresolved_evaluation" as const)
            : ("initial_evaluation" as const),
      outcome,
      proofRefIds: [eventId, proofRefId],
      assistanceLevel: input.request.assistanceLevel,
      answerExposure: input.request.answerExposure,
      variantFamilyId: input.request.variantFamilyId,
      variantDistance: input.request.variantDistance,
      elapsedTimeMs: input.request.elapsedTimeMs,
      observedAt,
      actualLaterEvidenceObserved: false as const,
      containsRawContent: false as const,
    };
    const bundle: S233EvidenceProofBundle = {
      record,
      predecessor: predecessorRecord,
      controllerEvent,
      controllerEventPersistenceReceiptId: input.persistenceReceiptId,
      predecessorStatePersistenceReceiptId:
        previous?.controllerEventPersistenceReceiptId ?? null,
      authenticatedLearnerOwnerRefId: input.review.learnerOwnerRefId,
      trustedOutcomeProofRecords: [
        proofRecord,
        ...(previous?.trustedOutcomeProofRecords ?? []),
      ],
    };
    assertValidS233ContractValue(validateS233LaneAEvidenceProofBundle(bundle));
    evidenceBundles.push(bundle);
    conceptTransitions.push({
      eventId,
      subjectId: input.review.subject,
      unitId: skill.skillId,
      taskType:
        skill.remediationActionType === "recalculate"
          ? "recalculate"
          : state === "uncertain"
            ? "withhold_until_verified"
            : "rewrite",
      result: conceptResult(state, outcome),
      confidence: finding.confidence.level,
      occurredAt: observedAt,
      containsRawContent: false,
    });
  }

  return { evidenceBundles, conceptTransitions };
}
