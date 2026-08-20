import { createHash, randomUUID } from "node:crypto";

import type { TrustedRepairAggregate } from "./trusted-repair-contract";
import {
  DURABLE_LEARNING_CONTRACT_VERSION,
  DURABLE_LEARNING_FIXTURE_VERSION,
  DURABLE_LEARNING_GAP_SIGNAL_VERSION,
  DURABLE_LEARNING_PLANNER_VERSION,
  DURABLE_LEARNING_POLICY_VERSION,
  DURABLE_CONCEPT_STATE_SIGNAL_VERSION,
  DURABLE_FAILURE_NOTE_VERSION,
  DURABLE_REVIEW_OUTCOME_VERSION,
  DurableLearningContractError,
  type CoreOutcomeV1,
  type DailyPlanDecision,
  type DailyPlanReasonCode,
  type DurableConceptStateEvidenceSignalV1,
  type DurableEvidenceEvent,
  type DurableFailureNoteV1,
  type DurableLearningGapSignalV1,
  type DurableLearningAggregate,
  type DurableLearningState,
  type DurableLearningStateData,
  type DurableLearningTransitionPlan,
  type DurableReviewOutcomeV1,
  type DurableReviewReasonCode,
  type DurableReviewSourceBindingV1,
  type DurableSubjectCommitmentV1,
  type FixedCommitmentV1,
  type FrozenD0ConfigurationSnapshotV1,
  type FullDayPlanV1,
  type GapClosureCaseV1,
  type PreparedAttemptV1,
  type RecurringDeductionSignatureV1,
} from "./durable-learning-contract";
import {
  durableCommitmentPasses,
  durableFixtureFor,
  nextDurableFixtureStage,
} from "./durable-learning-fixtures";

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return `sha256:${createHash("sha256").update(stable(value)).digest("hex")}`;
}

function addDays(iso: string, days: number) {
  const value = new Date(iso);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

function requireValidDate(value: string) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new DurableLearningContractError("invalid_input");
  }
  return new Date(value).toISOString();
}

export function isBeforeDurableEligibility(
  occurredAt: string,
  nextEligibleAt: string | null,
) {
  if (nextEligibleAt === null) return false;
  const occurredAtMs = Date.parse(occurredAt);
  const nextEligibleAtMs = Date.parse(nextEligibleAt);
  return (
    !Number.isFinite(occurredAtMs) ||
    !Number.isFinite(nextEligibleAtMs) ||
    occurredAtMs < nextEligibleAtMs
  );
}

function latestConfirmedRevisionId(aggregate: TrustedRepairAggregate) {
  const revisionId = aggregate.session.confirmedRevisionId;
  if (!revisionId) throw new DurableLearningContractError("not_eligible");
  return revisionId;
}

export function freezeTrustedRepairD0(input: {
  aggregate: TrustedRepairAggregate;
  frozenAt: string;
}): FrozenD0ConfigurationSnapshotV1 {
  const session = input.aggregate.session;
  if (
    session.state !== "verified" ||
    session.outcome !== "verified" ||
    session.stateData.proofEvaluation?.verified !== true ||
    session.assistanceLevel >= 3
  ) {
    throw new DurableLearningContractError("not_eligible");
  }
  const frozenAt = requireValidDate(input.frozenAt);
  const preimage = {
    sourceSessionId: session.sessionId,
    sourceSessionRecordVersion: session.recordVersion,
    sourceRevisionId: latestConfirmedRevisionId(input.aggregate),
    sourceFixtureVersion: session.bindings.fixtureVersion,
    problemSourceVersion: session.bindings.sourceVersion,
    modelVersion: "deterministic_no_model" as const,
    promptVersion: "none" as const,
    rubricVersion: session.bindings.rubricVersion,
    validatorVersion: session.bindings.validatorVersion,
    diagnosisPolicyVersion: session.bindings.policyVersion,
    tutorPolicyVersion: session.bindings.policyVersion,
    measurementPolicyVersion: DURABLE_LEARNING_POLICY_VERSION,
    ledgerSchemaVersion: DURABLE_LEARNING_CONTRACT_VERSION,
    schedulerPolicyVersion: DURABLE_LEARNING_PLANNER_VERSION,
    contentReleaseVersion: DURABLE_LEARNING_FIXTURE_VERSION,
    frozenAt,
  };
  return {
    snapshotId: randomUUID(),
    ...preimage,
    digest: digest(preimage),
  };
}

export function frozenD0MatchesCurrent(
  snapshot: FrozenD0ConfigurationSnapshotV1,
  aggregate: TrustedRepairAggregate,
) {
  const session = aggregate.session;
  const preimage = Object.fromEntries(
    Object.entries(snapshot).filter(([key]) => key !== "snapshotId" && key !== "digest"),
  );
  return (
    snapshot.digest === digest(preimage) &&
    snapshot.sourceSessionId === session.sessionId &&
    snapshot.sourceSessionRecordVersion === session.recordVersion &&
    snapshot.sourceRevisionId === session.confirmedRevisionId &&
    snapshot.sourceFixtureVersion === session.bindings.fixtureVersion &&
    snapshot.problemSourceVersion === session.bindings.sourceVersion &&
    snapshot.rubricVersion === session.bindings.rubricVersion &&
    snapshot.validatorVersion === session.bindings.validatorVersion &&
    snapshot.diagnosisPolicyVersion === session.bindings.policyVersion &&
    snapshot.tutorPolicyVersion === session.bindings.policyVersion &&
    snapshot.modelVersion === "deterministic_no_model" &&
    snapshot.promptVersion === "none" &&
    snapshot.measurementPolicyVersion === DURABLE_LEARNING_POLICY_VERSION &&
    snapshot.ledgerSchemaVersion === DURABLE_LEARNING_CONTRACT_VERSION &&
    snapshot.schedulerPolicyVersion === DURABLE_LEARNING_PLANNER_VERSION &&
    snapshot.contentReleaseVersion === DURABLE_LEARNING_FIXTURE_VERSION &&
    session.state === "verified" &&
    session.outcome === "verified" &&
    session.stateData.proofEvaluation?.verified === true
  );
}

function nextActionFor(state: DurableLearningState): RecurringDeductionSignatureV1["nextAction"] {
  if (state === "REPAIR_VERIFIED_SAME_SESSION" || state === "REOPENED") return "D1_REPRODUCTION";
  if (state === "D1_REPRODUCED") return "D7_TRANSFER";
  if (state === "D7_TRANSFER_OBSERVED") return "TIMED_RECURRENCE";
  if (state === "CURRENTLY_CLEAR") return "MONITOR";
  return "REPAIR_REOPENED";
}

export function buildRecurringDeductionSignature(input: {
  caseRecord: GapClosureCaseV1;
  events: readonly DurableEvidenceEvent[];
}): RecurringDeductionSignatureV1 {
  const eligibleFailures = input.events.filter(
    (event) => event.eventType === "INDEPENDENT_FAILURE_RECORDED" && event.attemptId,
  );
  const failureFamilies = new Set(
    eligibleFailures.map((event) => event.itemFamilyId).filter((value): value is string => Boolean(value)),
  );
  const counterEvidence = input.events.filter(
    (event) =>
      ["D1_REPRODUCED", "D7_TRANSFER_OBSERVED", "TIMED_RECURRENCE_CONFIRMED", "RECURRENCE_RECONFIRMED"].includes(
        event.eventType,
      ) && event.outcome === "SUCCESS",
  );
  const state = input.caseRecord.state;
  const status =
    state === "STALE"
      ? "STALE"
      : state === "REOPENED"
        ? "RECURRED"
        : state === "CURRENTLY_CLEAR"
          ? "CURRENTLY_CLEAR"
          : failureFamilies.size >= 2
            ? "REPEATING"
            : counterEvidence.length > 0
              ? "RECOVERY_WATCH"
              : eligibleFailures.length > 0 || state === "REPAIR_VERIFIED_SAME_SESSION"
                ? "CANDIDATE"
                : "INSUFFICIENT_EVIDENCE";
  return {
    signatureId: `wcv-c3:signature:${input.caseRecord.caseId}`,
    subject: input.caseRecord.subject,
    causeCode: "C2_PRIMARY_GAP",
    status,
    eligibleFailureCount: eligibleFailures.length,
    distinctFailureFamilyCount: failureFamilies.size,
    eligibleCounterEvidenceCount: counterEvidence.length,
    evidenceEventIds: eligibleFailures.map((event) => event.eventId),
    counterEvidenceEventIds: counterEvidence.map((event) => event.eventId),
    nextAction: nextActionFor(state),
  };
}

function withSignature(input: {
  caseRecord: GapClosureCaseV1;
  events: readonly DurableEvidenceEvent[];
  stateData: DurableLearningStateData;
}) {
  return {
    ...input.stateData,
    recurringSignature: buildRecurringDeductionSignature({
      caseRecord: input.caseRecord,
      events: input.events,
    }),
  };
}

export function createGapClosureCase(input: {
  userId: string;
  aggregate: TrustedRepairAggregate;
  occurredAt: string;
}): { caseRecord: GapClosureCaseV1; event: Omit<DurableEvidenceEvent, "caseId" | "userId"> } {
  const occurredAt = requireValidDate(input.occurredAt);
  const frozenD0 = freezeTrustedRepairD0({ aggregate: input.aggregate, frozenAt: occurredAt });
  const caseId = randomUUID();
  const placeholderSignature: RecurringDeductionSignatureV1 = {
    signatureId: `wcv-c3:signature:${caseId}`,
    subject: input.aggregate.session.subject,
    causeCode: "C2_PRIMARY_GAP",
    status: "CANDIDATE",
    eligibleFailureCount: 0,
    distinctFailureFamilyCount: 0,
    eligibleCounterEvidenceCount: 0,
    evidenceEventIds: [],
    counterEvidenceEventIds: [],
    nextAction: "D1_REPRODUCTION",
  };
  const sourcePrimaryGapId = input.aggregate.session.primaryGapId;
  if (!sourcePrimaryGapId) throw new DurableLearningContractError("not_eligible");
  const caseRecord: GapClosureCaseV1 = {
    caseId,
    userId: input.userId,
    sourceSessionId: input.aggregate.session.sessionId,
    subject: input.aggregate.session.subject,
    state: "REPAIR_VERIFIED_SAME_SESSION",
    recordVersion: 1,
    contractVersion: DURABLE_LEARNING_CONTRACT_VERSION,
    policyVersion: DURABLE_LEARNING_POLICY_VERSION,
    stateData: {
      frozenD0,
      sourcePrimaryGapId,
      nextEligibleAt: addDays(occurredAt, 1),
      activeAttempt: null,
      recurringSignature: placeholderSignature,
      latestPlan: null,
      planDecisionHistory: [],
      latestReviewOutcome: null,
      failureNotes: [],
      plannerStatus: {
        latestPlanId: null,
        decision: null,
        reasonCodes: [],
        updatedAt: null,
      },
      resultReasonCodes: ["same_session_repair_is_not_durable_clearance"],
    },
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
  return {
    caseRecord,
    event: {
      eventId: randomUUID(),
      eventType: "D0_FROZEN",
      attemptId: null,
      artifactId: null,
      itemId: null,
      itemFamilyId: null,
      transferDistance: null,
      outcome: null,
      payload: { snapshotDigest: frozenD0.digest, containsBody: false },
      occurredAt,
    },
  };
}

function ensureEvidenceState(state: DurableLearningState) {
  if (
    ![
      "REPAIR_VERIFIED_SAME_SESSION",
      "D1_REPRODUCED",
      "D7_TRANSFER_OBSERVED",
      "CURRENTLY_CLEAR",
      "REOPENED",
    ].includes(state)
  ) {
    throw new DurableLearningContractError("invalid_state");
  }
}

function eventWithOwner(
  aggregate: DurableLearningAggregate,
  event: Omit<DurableEvidenceEvent, "caseId" | "userId">,
): DurableEvidenceEvent {
  return {
    ...event,
    caseId: aggregate.caseRecord.caseId,
    userId: aggregate.caseRecord.userId,
  };
}

function reviewFeedback(input: {
  subject: GapClosureCaseV1["subject"];
  outcome: "SUCCESS" | "TIMEOUT" | "FAILURE";
}) {
  const failedCriterion = {
    appraisal_practical:
      "총수익과 운영비의 순서, 연산자, 결과, 단위, 부호와 반올림을 한 계산 관계로 맞춰야 합니다.",
    appraisal_theory:
      "제시된 목표 범위 안에서 핵심 관계의 의미와 극성을 구분하고 금지 관계를 주장하지 않아야 합니다.",
    appraisal_law:
      "제시된 출처·버전·조문·효력기간·적용 기준일을 함께 확인하고 현재성과 열린 차단 근거 수를 판단해야 합니다.",
  }[input.subject];
  if (input.outcome === "SUCCESS") {
    return {
      summaryCode: "source_gap_recovery_evidence_recorded",
      summaryKo: "현재 간극에 대한 독립 복구 근거가 기록되었으며 다음 지연 검토가 남아 있습니다.",
      whyWrongCode: "not_applicable_success",
      whyWrongKo: "이번 독립 검토는 구조 검증을 통과했습니다.",
      principleCode: "preserve_independent_delayed_review_sequence",
      principleKo: "같은 세션 성공과 지연된 독립 재현·전이·재발 근거를 분리해 누적합니다.",
    } as const;
  }
  const timedOut = input.outcome === "TIMEOUT";
  return {
    summaryCode: timedOut ? "trusted_timer_timeout_preserved" : "typed_proof_rejected",
    summaryKo: timedOut ? "제한시간 근거 미충족" : "과목별 증명 불일치",
    whyWrongCode: timedOut ? "trusted_timer_timeout_preserved" : "typed_proof_rejected",
    whyWrongKo: timedOut
      ? "신뢰된 제한시간 안에 제출되지 않아 이번 답안은 독립 근거로 인정되지 않았습니다."
      : "제출한 닫힌 과목별 판단이 서버의 봉인된 구조 검증을 통과하지 못했습니다.",
    principleCode: `restore_${input.subject}_typed_binding`,
    principleKo: failedCriterion,
  } as const;
}

function buildDurableReviewOutputs(input: {
  aggregate: DurableLearningAggregate;
  stage: "D1" | "D7" | "TIMED" | "RECURRENCE";
  attemptId: string;
  artifactId: string;
  itemId: string;
  itemRevisionId: string;
  itemFamilyId: string;
  evidenceEventId: string;
  proofAnchorId: string;
  outcome: "SUCCESS" | "TIMEOUT" | "FAILURE";
  reasonCodes: readonly DurableReviewReasonCode[];
  nextState: DurableLearningState;
  nextEligibleAt: string | null;
  recurringSignature: RecurringDeductionSignatureV1;
  occurredAt: string;
}) {
  const frozen = input.aggregate.caseRecord.stateData.frozenD0;
  const binding: DurableReviewSourceBindingV1 = {
    caseId: input.aggregate.caseRecord.caseId,
    caseRecordVersion: input.aggregate.caseRecord.recordVersion + 1,
    userId: input.aggregate.caseRecord.userId,
    subject: input.aggregate.caseRecord.subject,
    sourceSessionId: input.aggregate.caseRecord.sourceSessionId,
    sourceSessionRecordVersion: frozen.sourceSessionRecordVersion,
    sourceConfirmedRevisionId: frozen.sourceRevisionId,
    sourcePrimaryGapId: input.aggregate.caseRecord.stateData.sourcePrimaryGapId,
    stage: input.stage,
    attemptId: input.attemptId,
    privateArtifactId: input.artifactId,
    itemId: input.itemId,
    itemRevisionId: input.itemRevisionId,
    itemFamilyId: input.itemFamilyId,
    evidenceEventId: input.evidenceEventId,
    proofAnchorId: input.proofAnchorId,
    contractVersion: DURABLE_LEARNING_CONTRACT_VERSION,
    policyVersion: DURABLE_LEARNING_POLICY_VERSION,
    validatorVersion: frozen.validatorVersion,
    sourceVersion: frozen.problemSourceVersion,
    fixtureVersion: frozen.contentReleaseVersion,
  };
  const failureNoteId = input.outcome === "SUCCESS" ? null : randomUUID();
  const learningGapSignalId = randomUUID();
  const conceptStateSignalId = randomUUID();
  const feedback = reviewFeedback({
    subject: input.aggregate.caseRecord.subject,
    outcome: input.outcome,
  });
  const scheduledNextReviewAt =
    input.nextEligibleAt && Date.parse(input.nextEligibleAt) > Date.parse(input.occurredAt)
      ? input.nextEligibleAt
      : null;
  const learningGapSignal: DurableLearningGapSignalV1 = {
    signalId: learningGapSignalId,
    version: DURABLE_LEARNING_GAP_SIGNAL_VERSION,
    binding,
    outcome: input.outcome,
    reasonCodes: input.reasonCodes,
    gapCode: "C2_PRIMARY_GAP",
    evidenceContributionOnly: true,
    createsVerified: false,
    createsMastery: false,
    createsCurrentlyClear: false,
    createsReadiness: false,
    changesScore: false,
    containsBody: false,
    reconstructive: false,
    failureNoteBodyIncluded: false,
    occurredAt: input.occurredAt,
  };
  const conceptStateSignal: DurableConceptStateEvidenceSignalV1 = {
    signalId: conceptStateSignalId,
    version: DURABLE_CONCEPT_STATE_SIGNAL_VERSION,
    binding,
    learningGapSignalId,
    failureNoteId,
    candidateState:
      input.outcome === "SUCCESS"
        ? "recovering"
        : ["REPEATING", "RECURRED"].includes(input.recurringSignature.status)
          ? "recurring"
          : "wrong",
    evidenceKind: input.outcome === "SUCCESS" ? "RECOVERY_EVIDENCE" : "FAILURE_EVIDENCE",
    evidenceContributionOnly: true,
    canonicalConceptStateChanged: false,
    createsVerified: false,
    createsMastery: false,
    createsCurrentlyClear: false,
    createsReadiness: false,
    changesScore: false,
    containsBody: false,
    reconstructive: false,
    failureNoteBodyIncluded: false,
    occurredAt: input.occurredAt,
  };
  const nextAction: DurableReviewOutcomeV1["nextAction"] =
    input.outcome !== "SUCCESS"
      ? {
          action: "PREPARE_INDEPENDENT_RETRY",
          instructionKo: "위 기준을 적용해 새 독립 시도를 시작하고 답안 본문과 과목별 판단을 다시 제출하세요.",
        }
      : input.nextState === "TIMED_RECURRENCE_CONFIRMED"
        ? {
            action: "EVALUATE_CURRENTLY_CLEAR",
            instructionKo: "D+1·D+7·시간제한 근거를 함께 확인해 현재 안정 후보 여부를 평가하세요.",
          }
        : {
            action: "WAIT_FOR_NEXT_REVIEW",
            instructionKo: "다음 가능 시점에 다른 문항군에서 독립 검토를 이어가세요.",
          };
  const reviewOutcome: DurableReviewOutcomeV1 = {
    reviewOutcomeId: randomUUID(),
    version: DURABLE_REVIEW_OUTCOME_VERSION,
    binding,
    outcome: input.outcome,
    reasonCodes: input.reasonCodes,
    biggestGap: {
      gapId: binding.sourcePrimaryGapId,
      sourceSessionId: binding.sourceSessionId,
      sourceConfirmedRevisionId: binding.sourceConfirmedRevisionId,
      summaryCode: feedback.summaryCode,
      learnerFacingSummaryKo: feedback.summaryKo,
    },
    nextAction,
    failureNoteId,
    learningGapSignalId,
    conceptStateSignalId,
    occurredAt: input.occurredAt,
    containsBody: false,
    sharedSignalsBodyless: true,
    failureNotePrivate: true,
  };
  const failureNote: DurableFailureNoteV1 | null = failureNoteId
    ? {
        noteId: failureNoteId,
        version: DURABLE_FAILURE_NOTE_VERSION,
        binding,
        outcome: input.outcome as Exclude<typeof input.outcome, "SUCCESS">,
        reasonCodes: input.reasonCodes,
        status: "ready",
        visibility: "LEARNER_PRIVATE_DERIVED",
        whyWrong: {
          reasonCode: feedback.whyWrongCode,
          explanationKo: feedback.whyWrongKo,
        },
        correctPrinciple: {
          principleCode: feedback.principleCode,
          explanationKo: feedback.principleKo,
        },
        immediateFix: {
          action: input.aggregate.caseRecord.subject === "appraisal_practical" ? "recalculate" : "rewrite",
          instructionKo: nextAction.instructionKo,
        },
        recurrence: {
          status: input.recurringSignature.status,
          eligibleFailureCount: input.recurringSignature.eligibleFailureCount,
          distinctFailureFamilyCount: input.recurringSignature.distinctFailureFamilyCount,
        },
        nextReview: {
          scheduledAt: scheduledNextReviewAt,
          instructionKo: scheduledNextReviewAt
            ? "예약된 가능 시점에 새 독립 문항으로 다시 검토하세요."
            : "즉시 새 독립 문항으로 다시 검토할 수 있습니다.",
        },
        sourceMaterialInEntry: false,
        containsAttemptBody: false,
        createdAt: input.occurredAt,
      }
    : null;
  return { reviewOutcome, learningGapSignal, conceptStateSignal, failureNote };
}

export function planDurableEvidence(input: {
  aggregate: DurableLearningAggregate;
  commitment: DurableSubjectCommitmentV1;
  body: string;
  occurredAt: string;
}): DurableLearningTransitionPlan {
  const occurredAt = requireValidDate(input.occurredAt);
  ensureEvidenceState(input.aggregate.caseRecord.state);
  const nextEligibleAt = input.aggregate.caseRecord.stateData.nextEligibleAt;
  if (isBeforeDurableEligibility(occurredAt, nextEligibleAt)) {
    throw new DurableLearningContractError("not_eligible");
  }
  if (input.body.trim().length < 1 || input.body.length > 12000) {
    throw new DurableLearningContractError("invalid_input");
  }
  const prepared = input.aggregate.caseRecord.stateData.activeAttempt;
  if (!prepared) throw new DurableLearningContractError("invalid_state");
  const stage = nextDurableFixtureStage(input.aggregate);
  if (prepared.stage !== stage) throw new DurableLearningContractError("stale_configuration");
  const fixture = durableFixtureFor({
    subject: input.aggregate.caseRecord.subject,
    stage,
    evaluatedAt: occurredAt,
    attemptOrdinal: prepared.attemptOrdinal,
  });
  if (
    prepared.attemptOrdinal !== fixture.attemptOrdinal ||
    prepared.assignment.itemId !== fixture.itemId ||
    prepared.assignment.itemRevisionId !== fixture.itemRevisionId ||
    prepared.assignment.itemFamilyId !== fixture.itemFamilyId ||
    prepared.assignment.fixtureId !== fixture.fixture.fixtureId ||
    prepared.assignment.subject !== input.aggregate.caseRecord.subject ||
    prepared.assignment.transferDistance !== fixture.transferDistance ||
    prepared.assignment.eligibilitySnapshotId !== prepared.prePresentation.eligibilityId ||
    prepared.assignment.assignedAt !== prepared.trustedStartedAt ||
    prepared.prePresentation.itemId !== fixture.itemId ||
    prepared.prePresentation.itemRevisionId !== fixture.itemRevisionId ||
    prepared.prePresentation.bank !== fixture.fixture.bank ||
    prepared.prePresentation.unseen !== (stage !== "D1") ||
    prepared.prePresentation.solutionHidden !== true ||
    prepared.prePresentation.releaseState !== fixture.fixture.releaseState ||
    prepared.prePresentation.rightsEligible !== true ||
    prepared.prePresentation.sourceCurrent !== true ||
    prepared.prePresentation.blocked !== false ||
    prepared.prePresentation.disputed !== false ||
    prepared.prePresentation.retired !== false ||
    prepared.prePresentation.capturedAt !== prepared.trustedStartedAt
  ) {
    throw new DurableLearningContractError("stale_configuration");
  }
  const attemptId = prepared.attemptId;
  const artifactId = prepared.artifactId;
  const proofPassed = durableCommitmentPasses(fixture, input.commitment);
  const elapsedSeconds = Math.floor(
    (Date.parse(occurredAt) - Date.parse(prepared.trustedStartedAt)) / 1000,
  );
  if (elapsedSeconds < fixture.minimumElapsedSeconds) {
    throw new DurableLearningContractError("not_eligible");
  }
  const timedOut = fixture.timeLimitSeconds !== null && elapsedSeconds > fixture.timeLimitSeconds;
  const outcome = timedOut ? "TIMEOUT" : proofPassed ? "SUCCESS" : "FAILURE";
  const priorState = input.aggregate.caseRecord.state;
  const nextState: DurableLearningState =
    outcome !== "SUCCESS"
      ? priorState === "CURRENTLY_CLEAR"
        ? "REOPENED"
        : priorState
      : stage === "D1"
        ? "D1_REPRODUCED"
        : stage === "D7"
          ? "D7_TRANSFER_OBSERVED"
          : stage === "TIMED"
            ? "TIMED_RECURRENCE_CONFIRMED"
            : "CURRENTLY_CLEAR";
  const eventType =
    outcome !== "SUCCESS"
      ? "INDEPENDENT_FAILURE_RECORDED"
      : stage === "D1"
        ? "D1_REPRODUCED"
      : stage === "D7"
        ? "D7_TRANSFER_OBSERVED"
        : stage === "TIMED"
          ? "TIMED_RECURRENCE_CONFIRMED"
          : "RECURRENCE_RECONFIRMED";
  const prePresentation = prepared.prePresentation;
  const assignment = prepared.assignment;
  const qualification = {
    attemptId,
    artifactId,
    itemId: fixture.itemId,
    itemRevisionId: fixture.itemRevisionId,
    itemFamilyId: fixture.itemFamilyId,
    representation: fixture.representation,
    transferDistance: fixture.transferDistance,
    startedAt: prepared.trustedStartedAt,
    committedAt: occurredAt,
    solutionHiddenUntilCommit: true,
    exposureCountBeforeAttempt: stage === "D1" ? 1 : 0,
    assistanceLevel: 0 as const,
    currentSourcePassed: true,
    validatorPassed: proofPassed,
    conflictCount: 0,
    timerSource: "trusted_server" as const,
    timeLimitSeconds: fixture.timeLimitSeconds,
    elapsedSeconds,
    outcome,
  } as const;
  const transferOutcome =
    stage === "D1"
      ? null
      : {
          outcomeId: randomUUID(),
          attemptId,
          transferDistance: fixture.transferDistance,
          observed: outcome === "SUCCESS",
          sameItem: false,
          sameSurface: false,
          independent: true,
          sourcePassed: true,
          validatorPassed: proofPassed,
          conflictCount: 0,
          observedAt: occurredAt,
        } as const;
  const recurrenceOutcome =
    stage === "TIMED" || stage === "RECURRENCE"
      ? {
          outcomeId: randomUUID(),
          attemptId,
          timed: stage === "TIMED",
          confirmed: outcome === "SUCCESS" && !timedOut,
          distinctEligibleFamilyCount: new Set(
            [
              ...input.aggregate.events.map((event) => event.itemFamilyId),
              fixture.itemFamilyId,
            ].filter(Boolean),
          ).size,
          observedAt: occurredAt,
        }
      : null;
  const timedAttempt =
    stage === "TIMED"
      ? {
          attemptId,
          trustedStartedAt: prepared.trustedStartedAt,
          trustedCommittedAt: occurredAt,
          timeLimitSeconds: fixture.timeLimitSeconds ?? 0,
          elapsedSeconds,
          late: timedOut,
          offlineEvidenceBreak: false,
        }
      : null;
  const reopenEvent =
    priorState === "CURRENTLY_CLEAR" && outcome !== "SUCCESS"
      ? {
          eventId: randomUUID(),
          attemptId,
          priorState: "CURRENTLY_CLEAR" as const,
          nextState: "REOPENED" as const,
          reason: "later_qualifying_independent_failure" as const,
          occurredAt,
        }
      : null;
  const nextEligible =
    outcome !== "SUCCESS"
      ? nextState === "REOPENED"
        ? addDays(occurredAt, 1)
        : input.aggregate.caseRecord.stateData.nextEligibleAt
      : stage === "D1"
        ? addDays(input.aggregate.caseRecord.stateData.frozenD0.frozenAt, 7)
        : stage === "D7"
          ? occurredAt
          : stage === "TIMED"
            ? null
            : addDays(occurredAt, 7);
  const successReasonCode: DurableReviewReasonCode = ({
    D1: "d1_qualified_independent_success",
    D7: "d7_qualified_independent_success",
    TIMED: "timed_qualified_independent_success",
    RECURRENCE: "recurrence_qualified_independent_success",
  } as const)[stage];
  const reasonCodes: readonly DurableReviewReasonCode[] =
    outcome === "SUCCESS"
      ? [successReasonCode]
      : [timedOut ? "trusted_timer_timeout_preserved" : "typed_proof_rejected"];
  const eventId = randomUUID();
  const evidencePayloadBase = {
    prePresentation,
    assignment,
    qualification,
    transferOutcome,
    recurrenceOutcome,
    timedAttempt,
    reopenEvent,
    commitmentKind: input.commitment.kind,
    proofAnchorId: input.commitment.anchorId,
  } as const;
  const signatureEvent: Omit<DurableEvidenceEvent, "caseId" | "userId"> = {
    eventId,
    eventType,
    attemptId,
    artifactId,
    itemId: fixture.itemId,
    itemFamilyId: fixture.itemFamilyId,
    transferDistance: fixture.transferDistance,
    outcome,
    payload: { ...evidencePayloadBase, containsBody: false },
    occurredAt,
  };
  const provisionalCase: GapClosureCaseV1 = {
    ...input.aggregate.caseRecord,
    state: nextState,
    stateData: {
      ...input.aggregate.caseRecord.stateData,
      nextEligibleAt: nextEligible,
      activeAttempt: null,
      resultReasonCodes: reasonCodes,
    },
  };
  const signedStateData = withSignature({
    caseRecord: provisionalCase,
    events: [...input.aggregate.events, eventWithOwner(input.aggregate, signatureEvent)],
    stateData: provisionalCase.stateData,
  });
  const outputs = buildDurableReviewOutputs({
    aggregate: input.aggregate,
    stage,
    attemptId,
    artifactId,
    itemId: fixture.itemId,
    itemRevisionId: fixture.itemRevisionId,
    itemFamilyId: fixture.itemFamilyId,
    evidenceEventId: eventId,
    proofAnchorId: input.commitment.anchorId,
    outcome,
    reasonCodes,
    nextState,
    nextEligibleAt: nextEligible,
    recurringSignature: signedStateData.recurringSignature,
    occurredAt,
  });
  const event: Omit<DurableEvidenceEvent, "caseId" | "userId"> = {
    ...signatureEvent,
    payload: {
      ...evidencePayloadBase,
      reviewOutput: {
        reviewOutcomeId: outputs.reviewOutcome.reviewOutcomeId,
        learningGapSignal: outputs.learningGapSignal,
        conceptStateSignal: outputs.conceptStateSignal,
        failureNoteId: outputs.failureNote?.noteId ?? null,
        containsFailureNoteBody: false,
      },
      containsBody: false,
    },
  };
  const stateData: DurableLearningStateData = {
    ...signedStateData,
    latestReviewOutcome: outputs.reviewOutcome,
    failureNotes: outputs.failureNote
      ? [...signedStateData.failureNotes, outputs.failureNote]
      : signedStateData.failureNotes,
  };
  return {
    expectedState: priorState,
    nextState,
    stateData,
    artifact: {
      artifactId,
      attemptId,
      stage,
      body: input.body,
      createdAt: occurredAt,
    },
    event,
  };
}

export function planAttemptPreparation(input: {
  aggregate: DurableLearningAggregate;
  occurredAt: string;
}): DurableLearningTransitionPlan {
  const occurredAt = requireValidDate(input.occurredAt);
  ensureEvidenceState(input.aggregate.caseRecord.state);
  if (input.aggregate.caseRecord.stateData.activeAttempt) {
    throw new DurableLearningContractError("invalid_state");
  }
  const nextEligibleAt = input.aggregate.caseRecord.stateData.nextEligibleAt;
  if (isBeforeDurableEligibility(occurredAt, nextEligibleAt)) {
    throw new DurableLearningContractError("not_eligible");
  }
  const stage = nextDurableFixtureStage(input.aggregate);
  const attemptOrdinal =
    input.aggregate.artifacts.filter((artifact) => artifact.stage === stage).length + 1;
  const fixture = durableFixtureFor({
    subject: input.aggregate.caseRecord.subject,
    stage,
    evaluatedAt: occurredAt,
    attemptOrdinal,
  });
  const previouslyPresented = input.aggregate.events.some(
    (event) => event.itemId === fixture.itemId,
  );
  const unseen = stage === "D1" ? false : !previouslyPresented;
  if (stage !== "D1" && !unseen) throw new DurableLearningContractError("not_eligible");
  const attemptId = randomUUID();
  const prePresentation = {
    eligibilityId: randomUUID(),
    itemId: fixture.itemId,
    itemRevisionId: fixture.itemRevisionId,
    bank: fixture.fixture.bank,
    unseen,
    solutionHidden: true,
    releaseState: fixture.fixture.releaseState,
    rightsEligible: true,
    sourceCurrent: true,
    blocked: false,
    disputed: false,
    retired: false,
    capturedAt: occurredAt,
  } as const;
  const assignment = {
    assignmentId: randomUUID(),
    subject: input.aggregate.caseRecord.subject,
    itemId: fixture.itemId,
    itemRevisionId: fixture.itemRevisionId,
    itemFamilyId: fixture.itemFamilyId,
    fixtureId: fixture.fixture.fixtureId,
    transferDistance: fixture.transferDistance,
    eligibilitySnapshotId: prePresentation.eligibilityId,
    assignedAt: occurredAt,
  } as const;
  const activeAttempt: PreparedAttemptV1 = {
    attemptId,
    artifactId: randomUUID(),
    stage,
    attemptOrdinal,
    prePresentation,
    assignment,
    trustedStartedAt: occurredAt,
  };
  return {
    expectedState: input.aggregate.caseRecord.state,
    nextState: input.aggregate.caseRecord.state,
    stateData: {
      ...input.aggregate.caseRecord.stateData,
      activeAttempt,
      resultReasonCodes: ["trusted_attempt_started_before_prompt_release"],
    },
    artifact: null,
    event: {
      eventId: randomUUID(),
      eventType: "ATTEMPT_PREPARED",
      attemptId,
      artifactId: null,
      itemId: fixture.itemId,
      itemFamilyId: fixture.itemFamilyId,
      transferDistance: fixture.transferDistance,
      outcome: null,
      payload: { prePresentation, assignment, trustedStartedAt: occurredAt, containsBody: false },
      occurredAt,
    },
  };
}

export function planCurrentlyClear(input: {
  aggregate: DurableLearningAggregate;
  occurredAt: string;
}): DurableLearningTransitionPlan {
  const occurredAt = requireValidDate(input.occurredAt);
  if (input.aggregate.caseRecord.state !== "TIMED_RECURRENCE_CONFIRMED") {
    throw new DurableLearningContractError("invalid_state");
  }
  const successes = input.aggregate.events.filter((event) => event.outcome === "SUCCESS");
  const requiredTypes = new Set(successes.map((event) => event.eventType));
  const distinctFamilies = new Set(
    successes.map((event) => event.itemFamilyId).filter((value): value is string => Boolean(value)),
  );
  if (
    !requiredTypes.has("D1_REPRODUCED") ||
    !requiredTypes.has("D7_TRANSFER_OBSERVED") ||
    !requiredTypes.has("TIMED_RECURRENCE_CONFIRMED") ||
    distinctFamilies.size < 3
  ) {
    throw new DurableLearningContractError("not_eligible");
  }
  const event: Omit<DurableEvidenceEvent, "caseId" | "userId"> = {
    eventId: randomUUID(),
    eventType: "CURRENTLY_CLEAR_PROMOTED",
    attemptId: null,
    artifactId: null,
    itemId: null,
    itemFamilyId: null,
    transferDistance: null,
    outcome: null,
    payload: {
      qualifyingEventIds: successes.map((candidate) => candidate.eventId),
      distinctEligibleFamilyCount: distinctFamilies.size,
      singleItemCausalEliminationClaimed: false,
      containsBody: false,
    },
    occurredAt,
  };
  const provisionalCase: GapClosureCaseV1 = {
    ...input.aggregate.caseRecord,
    state: "CURRENTLY_CLEAR",
    stateData: {
      ...input.aggregate.caseRecord.stateData,
      nextEligibleAt: addDays(occurredAt, 7),
      resultReasonCodes: ["currently_clear_requires_d1_d7_timed_distinct_families"],
    },
  };
  return {
    expectedState: "TIMED_RECURRENCE_CONFIRMED",
    nextState: "CURRENTLY_CLEAR",
    stateData: withSignature({
      caseRecord: provisionalCase,
      events: [...input.aggregate.events, eventWithOwner(input.aggregate, event)],
      stateData: provisionalCase.stateData,
    }),
    artifact: null,
    event,
  };
}

export function planConfigurationStale(input: {
  aggregate: DurableLearningAggregate;
  occurredAt: string;
}): DurableLearningTransitionPlan {
  const occurredAt = requireValidDate(input.occurredAt);
  const event: Omit<DurableEvidenceEvent, "caseId" | "userId"> = {
    eventId: randomUUID(),
    eventType: "CONFIGURATION_STALE",
    attemptId: null,
    artifactId: null,
    itemId: null,
    itemFamilyId: null,
    transferDistance: null,
    outcome: null,
    payload: { priorSnapshotDigest: input.aggregate.caseRecord.stateData.frozenD0.digest, containsBody: false },
    occurredAt,
  };
  const provisionalCase: GapClosureCaseV1 = {
    ...input.aggregate.caseRecord,
    state: "STALE",
    stateData: {
      ...input.aggregate.caseRecord.stateData,
      nextEligibleAt: null,
      resultReasonCodes: ["incompatible_d0_configuration_requires_restart"],
    },
  };
  return {
    expectedState: input.aggregate.caseRecord.state,
    nextState: "STALE",
    stateData: withSignature({
      caseRecord: provisionalCase,
      events: [...input.aggregate.events, eventWithOwner(input.aggregate, event)],
      stateData: provisionalCase.stateData,
    }),
    artifact: null,
    event,
  };
}

function outcomeTemplate(
  aggregate: DurableLearningAggregate,
  substituteEvidenceAudit = false,
): Omit<CoreOutcomeV1, "outcomeId" | "rank"> {
  const state = aggregate.caseRecord.state;
  const kind =
    substituteEvidenceAudit
      ? "EVIDENCE_AUDIT"
      : state === "REPAIR_VERIFIED_SAME_SESSION"
      ? "D1_REPRODUCTION"
      : state === "D1_REPRODUCED"
        ? "D7_TRANSFER"
        : state === "D7_TRANSFER_OBSERVED"
          ? "TIMED_RECURRENCE"
          : state === "REOPENED"
            ? "RECURRENCE_REPAIR"
            : "EVIDENCE_AUDIT";
  const estimatedMinutes =
    kind === "TIMED_RECURRENCE" ? 90 : kind === "D7_TRANSFER" ? 45 : kind === "EVIDENCE_AUDIT" ? 20 : 30;
  return {
    subject: aggregate.caseRecord.subject,
    kind,
    reasonCode: substituteEvidenceAudit
      ? "wcv_c3_waiting_evidence_audit"
      : `wcv_c3_${kind.toLowerCase()}`,
    evidenceEventIds: aggregate.events.slice(-3).map((event) => event.eventId),
    successCriterionKo:
      substituteEvidenceAudit
        ? "다음 독립 시도 전까지 기존 근거와 다음 가능 시점을 확인한다."
        : kind === "D1_REPRODUCTION"
        ? "동일 답안을 보지 않고 다음 날 핵심 결합을 다시 구성한다."
        : kind === "D7_TRANSFER"
          ? "봉인된 다른 표면의 문항에서 같은 앵커를 독립 적용한다."
          : kind === "TIMED_RECURRENCE"
            ? "제한시간 안에 독립 통합 답안을 제출하고 검증을 통과한다."
            : kind === "RECURRENCE_REPAIR"
              ? "재발한 간극을 독립 재현부터 다시 확인한다."
              : "현재 안정 후보의 근거와 아직 시험하지 않은 범위를 확인한다.",
    estimatedMinutes,
  };
}

export function buildDeterministicFullDayPlan(input: {
  aggregate: DurableLearningAggregate;
  availableMinutes: number;
  recoveryMode: "NORMAL" | "MINIMUM_MAINTENANCE";
  fixedCommitments: readonly FixedCommitmentV1[];
  occurredAt: string;
}): FullDayPlanV1 {
  const occurredAt = requireValidDate(input.occurredAt);
  if (!Number.isInteger(input.availableMinutes) || input.availableMinutes < 30 || input.availableMinutes > 720) {
    throw new DurableLearningContractError("invalid_input");
  }
  const fixedMinutes = input.fixedCommitments.reduce((sum, item) => sum + item.minutes, 0);
  if (fixedMinutes > input.availableMinutes) {
    throw new DurableLearningContractError("invalid_input");
  }
  const executionBlocks: FullDayPlanV1["executionBlocks"][number][] = [];
  let cursor = 0;
  for (const commitment of input.fixedCommitments) {
    executionBlocks.push({
      blockId: randomUUID(),
      kind: "FIXED",
      outcomeId: null,
      fixedCommitmentId: commitment.commitmentId,
      startMinute: cursor,
      endMinute: cursor + commitment.minutes,
    });
    cursor += commitment.minutes;
  }
  const waitingForEligibility = isBeforeDurableEligibility(
    occurredAt,
    input.aggregate.caseRecord.stateData.nextEligibleAt,
  );
  const template = outcomeTemplate(input.aggregate, waitingForEligibility);
  const maintenanceMinutes = input.recoveryMode === "MINIMUM_MAINTENANCE" ? Math.min(30, template.estimatedMinutes) : template.estimatedMinutes;
  const outcomes: CoreOutcomeV1[] = [];
  const deferredReasonCodes: string[] = [];
  if (waitingForEligibility) {
    deferredReasonCodes.push("next_eligible_at_not_reached");
  }
  if (cursor + maintenanceMinutes <= input.availableMinutes) {
    const outcomeId = randomUUID();
    outcomes.push({ ...template, outcomeId, rank: 1, estimatedMinutes: maintenanceMinutes });
    executionBlocks.push({
      blockId: randomUUID(),
      kind: "CORE_OUTCOME",
      outcomeId,
      fixedCommitmentId: null,
      startMinute: cursor,
      endMinute: cursor + maintenanceMinutes,
    });
    cursor += maintenanceMinutes;
  } else {
    deferredReasonCodes.push("insufficient_minutes_after_fixed_commitments");
  }
  if (
    input.recoveryMode === "NORMAL" &&
    ["REPEATING", "RECURRED"].includes(input.aggregate.caseRecord.stateData.recurringSignature.status) &&
    !outcomes.some((outcome) => outcome.kind === "EVIDENCE_AUDIT") &&
    cursor + 30 <= input.availableMinutes &&
    outcomes.length < 3
  ) {
    const outcomeId = randomUUID();
    outcomes.push({
      outcomeId,
      rank: 2,
      subject: input.aggregate.caseRecord.subject,
      kind: "EVIDENCE_AUDIT",
      reasonCode: "recurring_deduction_counter_evidence_audit",
      evidenceEventIds: input.aggregate.caseRecord.stateData.recurringSignature.evidenceEventIds,
      successCriterionKo: "서로 다른 문항군의 재발 근거와 반대 근거를 구분하고 다음 행동 하나를 확정한다.",
      estimatedMinutes: 30,
    });
    executionBlocks.push({
      blockId: randomUUID(),
      kind: "CORE_OUTCOME",
      outcomeId,
      fixedCommitmentId: null,
      startMinute: cursor,
      endMinute: cursor + 30,
    });
  }
  return {
    planId: randomUUID(),
    plannerVersion: DURABLE_LEARNING_PLANNER_VERSION,
    proposalContext: {
      caseRecordVersion: input.aggregate.caseRecord.recordVersion,
      caseState: input.aggregate.caseRecord.state,
      nextEligibleAt: input.aggregate.caseRecord.stateData.nextEligibleAt,
      waitingForEligibility,
    },
    availableMinutes: input.availableMinutes,
    recoveryMode: input.recoveryMode,
    coreOutcomes: outcomes,
    executionBlocks,
    fixedCommitments: input.fixedCommitments,
    deferredReasonCodes,
    immediatePrimaryOutcomeId: outcomes[0]?.outcomeId ?? null,
    decision: "PROPOSED",
    decisionReason: null,
    blockedManualPlanRequired: outcomes.length === 0 && input.fixedCommitments.length === 0,
    proposedAt: occurredAt,
  };
}

export function planFullDayProposal(input: {
  aggregate: DurableLearningAggregate;
  availableMinutes: number;
  recoveryMode: "NORMAL" | "MINIMUM_MAINTENANCE";
  fixedCommitments: readonly FixedCommitmentV1[];
  occurredAt: string;
}): DurableLearningTransitionPlan {
  const plan = buildDeterministicFullDayPlan(input);
  const event: Omit<DurableEvidenceEvent, "caseId" | "userId"> = {
    eventId: randomUUID(),
    eventType: "PLAN_PROPOSED",
    attemptId: null,
    artifactId: null,
    itemId: null,
    itemFamilyId: null,
    transferDistance: null,
    outcome: null,
    payload: {
      planId: plan.planId,
      availableMinutes: plan.availableMinutes,
      coreOutcomeCount: plan.coreOutcomes.length,
      executionBlockCount: plan.executionBlocks.length,
      containsBody: false,
    },
    occurredAt: plan.proposedAt,
  };
  return {
    expectedState: input.aggregate.caseRecord.state,
    nextState: input.aggregate.caseRecord.state,
    stateData: {
      ...input.aggregate.caseRecord.stateData,
      latestPlan: plan,
      plannerStatus: {
        latestPlanId: plan.planId,
        decision: plan.decision,
        reasonCodes: ["deterministic_evidence_priority_plan_proposed"],
        updatedAt: plan.proposedAt,
      },
    },
    artifact: null,
    event,
  };
}

export function planFullDayDecision(input: {
  aggregate: DurableLearningAggregate;
  decision: Exclude<DailyPlanDecision, "PROPOSED">;
  reason: DailyPlanReasonCode;
  replacement?: Readonly<{
    availableMinutes: number;
    recoveryMode: "NORMAL" | "MINIMUM_MAINTENANCE";
    fixedCommitments: readonly FixedCommitmentV1[];
  }>;
  occurredAt: string;
}): DurableLearningTransitionPlan {
  const occurredAt = requireValidDate(input.occurredAt);
  const currentPlan = input.aggregate.caseRecord.stateData.latestPlan;
  if (!currentPlan || currentPlan.decision !== "PROPOSED") {
    throw new DurableLearningContractError("invalid_state");
  }
  const proposalContext = currentPlan.proposalContext;
  if (
    !proposalContext ||
    !Number.isSafeInteger(proposalContext.caseRecordVersion) ||
    input.aggregate.caseRecord.recordVersion !== proposalContext.caseRecordVersion + 1 ||
    input.aggregate.caseRecord.state !== proposalContext.caseState ||
    input.aggregate.caseRecord.stateData.nextEligibleAt !== proposalContext.nextEligibleAt ||
    isBeforeDurableEligibility(occurredAt, input.aggregate.caseRecord.stateData.nextEligibleAt) !==
      proposalContext.waitingForEligibility
  ) {
    throw new DurableLearningContractError("stale_plan");
  }
  if ((input.decision === "EDITED") !== Boolean(input.replacement)) {
    throw new DurableLearningContractError("invalid_input");
  }
  const allowedReasons: Record<Exclude<DailyPlanDecision, "PROPOSED">, readonly DailyPlanReasonCode[]> = {
    ACCEPTED: ["accepted_as_proposed"],
    EDITED: ["available_minutes_changed", "fixed_commitment_changed", "equivalent_task_preferred"],
    REJECTED: ["fatigue_or_illness", "deferred_by_learner"],
  };
  if (!allowedReasons[input.decision].includes(input.reason)) {
    throw new DurableLearningContractError("invalid_input");
  }
  const decisionBase = input.replacement
    ? buildDeterministicFullDayPlan({
        aggregate: input.aggregate,
        availableMinutes: input.replacement.availableMinutes,
        recoveryMode: input.replacement.recoveryMode,
        fixedCommitments: input.replacement.fixedCommitments,
        occurredAt,
      })
    : currentPlan;
  const plan = { ...decisionBase, decision: input.decision, decisionReason: input.reason };
  const event: Omit<DurableEvidenceEvent, "caseId" | "userId"> = {
    eventId: randomUUID(),
    eventType: "PLAN_DECISION_RECORDED",
    attemptId: null,
    artifactId: null,
    itemId: null,
    itemFamilyId: null,
    transferDistance: null,
    outcome: null,
    payload: {
      priorPlanId: currentPlan.planId,
      planId: plan.planId,
      decision: input.decision,
      reason: input.reason,
      replacementApplied: Boolean(input.replacement),
      containsBody: false,
    },
    occurredAt,
  };
  return {
    expectedState: input.aggregate.caseRecord.state,
    nextState: input.aggregate.caseRecord.state,
    stateData: {
      ...input.aggregate.caseRecord.stateData,
      latestPlan: plan,
      planDecisionHistory: [
        ...input.aggregate.caseRecord.stateData.planDecisionHistory,
        { decision: input.decision, reason: input.reason, occurredAt },
      ],
      plannerStatus: {
        latestPlanId: plan.planId,
        decision: plan.decision,
        reasonCodes: ["learner_plan_decision_recorded_without_mastery_change"],
        updatedAt: occurredAt,
      },
    },
    artifact: null,
    event,
  };
}
