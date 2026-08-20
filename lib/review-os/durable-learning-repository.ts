import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  DURABLE_CONCEPT_STATE_SIGNAL_VERSION,
  DURABLE_EVIDENCE_EVENT_TYPES,
  DURABLE_FAILURE_NOTE_VERSION,
  DURABLE_LEARNING_CONTRACT_VERSION,
  DURABLE_LEARNING_GAP_SIGNAL_VERSION,
  DURABLE_LEARNING_POLICY_VERSION,
  DURABLE_REVIEW_REASON_CODES,
  DURABLE_REVIEW_OUTCOME_VERSION,
  TRANSFER_DISTANCES,
  isDurableLearningState,
  type DurableEvidenceEvent,
  type DurableFailureNoteV1,
  type DurableLearningAggregate,
  type DurableLearningStateData,
  type DurableLearningTransitionPlan,
  type DurablePrivateAttemptArtifact,
  type DurableReviewOutcomeV1,
  type DurableReviewSourceBindingV1,
  type GapClosureCaseV1,
} from "./durable-learning-contract";
import { isTrustedRepairSubject } from "./trusted-repair-contract";

type Row = Record<string, unknown>;

export class DurableLearningPersistenceError extends Error {
  readonly code: "unavailable" | "invalid_record" | "not_found" | "stale_record";

  constructor(code: DurableLearningPersistenceError["code"]) {
    super(`durable-learning-persistence:${code}`);
    this.code = code;
  }
}

function serviceClient() {
  const client = createSupabaseAdminClient();
  if (!client) throw new DurableLearningPersistenceError("unavailable");
  return client;
}

function objectValue(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value as Row;
}

function arrayValue(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value;
}

function stringValue(value: unknown) {
  if (typeof value !== "string" || value.length < 1) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value;
}

function nullableString(value: unknown) {
  return value === null ? null : stringValue(value);
}

function integerValue(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return value;
}

function exactKeys(row: Row, expected: readonly string[]) {
  const keys = Object.keys(row);
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
}

function stringArray(value: unknown) {
  const values = arrayValue(value);
  if (values.some((entry) => typeof entry !== "string" || entry.length < 1)) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return values as string[];
}

function reviewReasonCodes(value: unknown) {
  const values = stringArray(value);
  if (
    values.length !== 1 ||
    !DURABLE_REVIEW_REASON_CODES.includes(
      values[0] as (typeof DURABLE_REVIEW_REASON_CODES)[number],
    )
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return values;
}

function reviewBindingValue(
  value: unknown,
  expected?: Readonly<{
    caseId?: string;
    caseRecordVersion?: number;
    userId?: string;
    subject?: string;
    sourceSessionId?: string;
    evidenceEventId?: string;
    attemptId?: string;
    privateArtifactId?: string;
    itemId?: string;
    itemRevisionId?: string;
    itemFamilyId?: string;
    proofAnchorId?: string;
  }>,
): DurableReviewSourceBindingV1 {
  const row = objectValue(value);
  exactKeys(row, [
    "caseId",
    "caseRecordVersion",
    "userId",
    "subject",
    "sourceSessionId",
    "sourceSessionRecordVersion",
    "sourceConfirmedRevisionId",
    "sourcePrimaryGapId",
    "stage",
    "attemptId",
    "privateArtifactId",
    "itemId",
    "itemRevisionId",
    "itemFamilyId",
    "evidenceEventId",
    "proofAnchorId",
    "contractVersion",
    "policyVersion",
    "validatorVersion",
    "sourceVersion",
    "fixtureVersion",
  ]);
  if (
    !isTrustedRepairSubject(row.subject) ||
    !["D1", "D7", "TIMED", "RECURRENCE"].includes(String(row.stage)) ||
    row.contractVersion !== DURABLE_LEARNING_CONTRACT_VERSION ||
    row.policyVersion !== DURABLE_LEARNING_POLICY_VERSION ||
    integerValue(row.caseRecordVersion) < 2 ||
    integerValue(row.sourceSessionRecordVersion) < 1 ||
    [
      row.caseId,
      row.userId,
      row.sourceSessionId,
      row.sourceConfirmedRevisionId,
      row.sourcePrimaryGapId,
      row.attemptId,
      row.privateArtifactId,
      row.itemId,
      row.itemRevisionId,
      row.itemFamilyId,
      row.evidenceEventId,
      row.proofAnchorId,
      row.validatorVersion,
      row.sourceVersion,
      row.fixtureVersion,
    ].some((entry) => typeof entry !== "string" || entry.length < 1) ||
    (expected?.caseId !== undefined && row.caseId !== expected.caseId) ||
    (expected?.caseRecordVersion !== undefined && row.caseRecordVersion !== expected.caseRecordVersion) ||
    (expected?.userId !== undefined && row.userId !== expected.userId) ||
    (expected?.subject !== undefined && row.subject !== expected.subject) ||
    (expected?.sourceSessionId !== undefined && row.sourceSessionId !== expected.sourceSessionId) ||
    (expected?.evidenceEventId !== undefined && row.evidenceEventId !== expected.evidenceEventId) ||
    (expected?.attemptId !== undefined && row.attemptId !== expected.attemptId) ||
    (expected?.privateArtifactId !== undefined && row.privateArtifactId !== expected.privateArtifactId) ||
    (expected?.itemId !== undefined && row.itemId !== expected.itemId) ||
    (expected?.itemRevisionId !== undefined && row.itemRevisionId !== expected.itemRevisionId) ||
    (expected?.itemFamilyId !== undefined && row.itemFamilyId !== expected.itemFamilyId) ||
    (expected?.proofAnchorId !== undefined && row.proofAnchorId !== expected.proofAnchorId)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return row as DurableReviewSourceBindingV1;
}

function reviewOutcomeValue(value: unknown, expected: Parameters<typeof reviewBindingValue>[1]) {
  const row = objectValue(value);
  exactKeys(row, [
    "reviewOutcomeId",
    "version",
    "binding",
    "outcome",
    "reasonCodes",
    "biggestGap",
    "nextAction",
    "failureNoteId",
    "learningGapSignalId",
    "conceptStateSignalId",
    "occurredAt",
    "containsBody",
    "sharedSignalsBodyless",
    "failureNotePrivate",
  ]);
  const binding = reviewBindingValue(row.binding, expected);
  const biggestGap = objectValue(row.biggestGap);
  const nextAction = objectValue(row.nextAction);
  exactKeys(biggestGap, [
    "gapId",
    "sourceSessionId",
    "sourceConfirmedRevisionId",
    "summaryCode",
    "learnerFacingSummaryKo",
  ]);
  exactKeys(nextAction, ["action", "instructionKo"]);
  if (
    row.version !== DURABLE_REVIEW_OUTCOME_VERSION ||
    !["SUCCESS", "PARTIAL", "BLANK", "TIMEOUT", "FAILURE"].includes(String(row.outcome)) ||
    (row.outcome === "SUCCESS" ? row.failureNoteId !== null : typeof row.failureNoteId !== "string") ||
    row.containsBody !== false ||
    row.sharedSignalsBodyless !== true ||
    row.failureNotePrivate !== true ||
    biggestGap.gapId !== binding.sourcePrimaryGapId ||
    biggestGap.sourceSessionId !== binding.sourceSessionId ||
    biggestGap.sourceConfirmedRevisionId !== binding.sourceConfirmedRevisionId ||
    !["PREPARE_INDEPENDENT_RETRY", "WAIT_FOR_NEXT_REVIEW", "EVALUATE_CURRENTLY_CLEAR"].includes(String(nextAction.action)) ||
    [
      row.reviewOutcomeId,
      row.learningGapSignalId,
      row.conceptStateSignalId,
      row.occurredAt,
      biggestGap.summaryCode,
      biggestGap.learnerFacingSummaryKo,
      nextAction.instructionKo,
    ].some((entry) => typeof entry !== "string" || entry.length < 1)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  reviewReasonCodes(row.reasonCodes);
  return row as DurableReviewOutcomeV1;
}

function failureNoteValue(value: unknown, expected: Parameters<typeof reviewBindingValue>[1]) {
  const row = objectValue(value);
  exactKeys(row, [
    "noteId",
    "version",
    "binding",
    "outcome",
    "reasonCodes",
    "status",
    "visibility",
    "whyWrong",
    "correctPrinciple",
    "immediateFix",
    "recurrence",
    "nextReview",
    "sourceMaterialInEntry",
    "containsAttemptBody",
    "createdAt",
  ]);
  reviewBindingValue(row.binding, expected);
  const whyWrong = objectValue(row.whyWrong);
  const correctPrinciple = objectValue(row.correctPrinciple);
  const immediateFix = objectValue(row.immediateFix);
  const recurrence = objectValue(row.recurrence);
  const nextReview = objectValue(row.nextReview);
  exactKeys(whyWrong, ["reasonCode", "explanationKo"]);
  exactKeys(correctPrinciple, ["principleCode", "explanationKo"]);
  exactKeys(immediateFix, ["action", "instructionKo"]);
  exactKeys(recurrence, ["status", "eligibleFailureCount", "distinctFailureFamilyCount"]);
  exactKeys(nextReview, ["scheduledAt", "instructionKo"]);
  if (
    row.version !== DURABLE_FAILURE_NOTE_VERSION ||
    !["PARTIAL", "BLANK", "TIMEOUT", "FAILURE"].includes(String(row.outcome)) ||
    row.status !== "ready" ||
    row.visibility !== "LEARNER_PRIVATE_DERIVED" ||
    row.sourceMaterialInEntry !== false ||
    row.containsAttemptBody !== false ||
    !["retry", "rewrite", "recalculate"].includes(String(immediateFix.action)) ||
    !(
      nextReview.scheduledAt === null ||
      (typeof nextReview.scheduledAt === "string" && Number.isFinite(Date.parse(nextReview.scheduledAt)))
    ) ||
    [
      row.noteId,
      row.createdAt,
      whyWrong.reasonCode,
      whyWrong.explanationKo,
      correctPrinciple.principleCode,
      correctPrinciple.explanationKo,
      immediateFix.instructionKo,
      nextReview.instructionKo,
    ].some((entry) => typeof entry !== "string" || entry.length < 1)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  reviewReasonCodes(row.reasonCodes);
  integerValue(recurrence.eligibleFailureCount);
  integerValue(recurrence.distinctFailureFamilyCount);
  return row as DurableFailureNoteV1;
}

function sameReviewBinding(left: DurableReviewSourceBindingV1, right: DurableReviewSourceBindingV1) {
  return Object.keys(left).every(
    (key) => left[key as keyof DurableReviewSourceBindingV1] === right[key as keyof DurableReviewSourceBindingV1],
  );
}

function reviewOutputValue(value: unknown, context: {
  caseId: string;
  userId: string;
  evidenceEventId: string;
  outcome: DurableEvidenceEvent["outcome"];
  attemptId?: string;
  privateArtifactId?: string;
  itemId?: string;
  itemRevisionId?: string;
  itemFamilyId?: string;
  proofAnchorId?: string;
}) {
  const row = objectValue(value);
  exactKeys(row, [
    "reviewOutcomeId",
    "learningGapSignal",
    "conceptStateSignal",
    "failureNoteId",
    "containsFailureNoteBody",
  ]);
  const gap = objectValue(row.learningGapSignal);
  exactKeys(gap, [
    "signalId",
    "version",
    "binding",
    "outcome",
    "reasonCodes",
    "gapCode",
    "evidenceContributionOnly",
    "createsVerified",
    "createsMastery",
    "createsCurrentlyClear",
    "createsReadiness",
    "changesScore",
    "containsBody",
    "reconstructive",
    "failureNoteBodyIncluded",
    "occurredAt",
  ]);
  const concept = objectValue(row.conceptStateSignal);
  exactKeys(concept, [
    "signalId",
    "version",
    "binding",
    "learningGapSignalId",
    "failureNoteId",
    "candidateState",
    "evidenceKind",
    "evidenceContributionOnly",
    "canonicalConceptStateChanged",
    "createsVerified",
    "createsMastery",
    "createsCurrentlyClear",
    "createsReadiness",
    "changesScore",
    "containsBody",
    "reconstructive",
    "failureNoteBodyIncluded",
    "occurredAt",
  ]);
  const expectedBinding = {
    caseId: context.caseId,
    userId: context.userId,
    evidenceEventId: context.evidenceEventId,
    attemptId: context.attemptId,
    privateArtifactId: context.privateArtifactId,
    itemId: context.itemId,
    itemRevisionId: context.itemRevisionId,
    itemFamilyId: context.itemFamilyId,
    proofAnchorId: context.proofAnchorId,
  };
  const gapBinding = reviewBindingValue(gap.binding, expectedBinding);
  const conceptBinding = reviewBindingValue(concept.binding, expectedBinding);
  const safeFlags = [
    gap.createsVerified,
    gap.createsMastery,
    gap.createsCurrentlyClear,
    gap.createsReadiness,
    gap.changesScore,
    gap.containsBody,
    gap.reconstructive,
    gap.failureNoteBodyIncluded,
    concept.canonicalConceptStateChanged,
    concept.createsVerified,
    concept.createsMastery,
    concept.createsCurrentlyClear,
    concept.createsReadiness,
    concept.changesScore,
    concept.containsBody,
    concept.reconstructive,
    concept.failureNoteBodyIncluded,
  ];
  if (
    typeof row.reviewOutcomeId !== "string" ||
    row.reviewOutcomeId.length < 1 ||
    typeof gap.signalId !== "string" ||
    gap.signalId.length < 1 ||
    typeof concept.signalId !== "string" ||
    concept.signalId.length < 1 ||
    typeof gap.occurredAt !== "string" ||
    typeof concept.occurredAt !== "string" ||
    gap.version !== DURABLE_LEARNING_GAP_SIGNAL_VERSION ||
    concept.version !== DURABLE_CONCEPT_STATE_SIGNAL_VERSION ||
    gap.outcome !== context.outcome ||
    gap.gapCode !== "C2_PRIMARY_GAP" ||
    gap.evidenceContributionOnly !== true ||
    concept.evidenceContributionOnly !== true ||
    concept.learningGapSignalId !== gap.signalId ||
    concept.failureNoteId !== row.failureNoteId ||
    gap.occurredAt !== concept.occurredAt ||
    row.containsFailureNoteBody !== false ||
    safeFlags.some((flag) => flag !== false) ||
    !sameReviewBinding(gapBinding, conceptBinding) ||
    !["wrong", "recurring", "recovering"].includes(String(concept.candidateState)) ||
    !["FAILURE_EVIDENCE", "RECOVERY_EVIDENCE"].includes(String(concept.evidenceKind)) ||
    (context.outcome === "SUCCESS" &&
      (row.failureNoteId !== null ||
        concept.candidateState !== "recovering" ||
        concept.evidenceKind !== "RECOVERY_EVIDENCE")) ||
    (context.outcome !== "SUCCESS" &&
      (typeof row.failureNoteId !== "string" ||
        row.failureNoteId.length < 1 ||
        !["wrong", "recurring"].includes(String(concept.candidateState)) ||
        concept.evidenceKind !== "FAILURE_EVIDENCE"))
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  reviewReasonCodes(gap.reasonCodes);
  return row;
}

function stateDataValue(
  value: unknown,
  context: Readonly<{
    caseId: string;
    userId: string;
    subject: string;
    sourceSessionId: string;
    recordVersion: number;
  }>,
): DurableLearningStateData {
  const row = objectValue(value);
  const expected = [
    "frozenD0",
    "sourcePrimaryGapId",
    "nextEligibleAt",
    "activeAttempt",
    "recurringSignature",
    "latestPlan",
    "planDecisionHistory",
    "latestReviewOutcome",
    "failureNotes",
    "plannerStatus",
    "resultReasonCodes",
  ];
  if (
    Object.keys(row).some((key) => !expected.includes(key)) ||
    Object.keys(row).length !== expected.length ||
    typeof row.sourcePrimaryGapId !== "string" ||
    !(row.nextEligibleAt === null || typeof row.nextEligibleAt === "string") ||
    !Array.isArray(row.planDecisionHistory) ||
    !Array.isArray(row.failureNotes) ||
    !Array.isArray(row.resultReasonCodes)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const frozen = objectValue(row.frozenD0);
  const signature = objectValue(row.recurringSignature);
  if (
    frozen.ledgerSchemaVersion !== DURABLE_LEARNING_CONTRACT_VERSION ||
    frozen.measurementPolicyVersion !== DURABLE_LEARNING_POLICY_VERSION ||
    typeof frozen.sourceFixtureVersion !== "string" ||
    typeof frozen.digest !== "string" ||
    typeof signature.signatureId !== "string" ||
    !Array.isArray(signature.evidenceEventIds) ||
    !Array.isArray(signature.counterEvidenceEventIds)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  if (row.activeAttempt !== null) {
    const active = objectValue(row.activeAttempt);
    if (
      typeof active.attemptId !== "string" ||
      typeof active.artifactId !== "string" ||
      !["D1", "D7", "TIMED", "RECURRENCE"].includes(String(active.stage)) ||
      !Number.isSafeInteger(active.attemptOrdinal) ||
      Number(active.attemptOrdinal) < 1 ||
      typeof active.trustedStartedAt !== "string" ||
      !active.prePresentation ||
      !active.assignment
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
  }
  const bindingContext = {
    caseId: context.caseId,
    userId: context.userId,
    subject: context.subject,
    sourceSessionId: context.sourceSessionId,
  };
  const latestReviewOutcome =
    row.latestReviewOutcome === null
      ? null
      : reviewOutcomeValue(row.latestReviewOutcome, bindingContext);
  if (
    latestReviewOutcome &&
    latestReviewOutcome.binding.caseRecordVersion > context.recordVersion
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const failureNotes = row.failureNotes.map((note) =>
    failureNoteValue(note, {
      caseId: context.caseId,
      userId: context.userId,
      subject: context.subject,
      sourceSessionId: context.sourceSessionId,
    }),
  );
  if (
    new Set(failureNotes.map((note) => note.noteId)).size !== failureNotes.length ||
    failureNotes.some((note) => note.binding.caseRecordVersion > context.recordVersion)
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const plannerStatus = objectValue(row.plannerStatus);
  exactKeys(plannerStatus, ["latestPlanId", "decision", "reasonCodes", "updatedAt"]);
  if (
    !(plannerStatus.latestPlanId === null || typeof plannerStatus.latestPlanId === "string") ||
    !(
      plannerStatus.decision === null ||
      ["PROPOSED", "ACCEPTED", "EDITED", "REJECTED"].includes(String(plannerStatus.decision))
    ) ||
    !(plannerStatus.updatedAt === null || typeof plannerStatus.updatedAt === "string")
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  stringArray(plannerStatus.reasonCodes);
  stringArray(row.resultReasonCodes);
  if (latestReviewOutcome) {
    const matchingNotes = failureNotes.filter(
      (note) => note.noteId === latestReviewOutcome.failureNoteId,
    );
    if (
      (latestReviewOutcome.failureNoteId === null && matchingNotes.length !== 0) ||
      (latestReviewOutcome.failureNoteId !== null && matchingNotes.length !== 1)
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
    if (
      matchingNotes[0] &&
      (!sameReviewBinding(matchingNotes[0].binding, latestReviewOutcome.binding) ||
        matchingNotes[0].outcome !== latestReviewOutcome.outcome ||
        JSON.stringify(matchingNotes[0].reasonCodes) !==
          JSON.stringify(latestReviewOutcome.reasonCodes))
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
  }
  return row as DurableLearningStateData;
}

function parseCase(row: Row, userId: string): GapClosureCaseV1 {
  if (
    row.user_id !== userId ||
    !isTrustedRepairSubject(row.subject) ||
    !isDurableLearningState(row.state) ||
    row.contract_version !== DURABLE_LEARNING_CONTRACT_VERSION ||
    row.policy_version !== DURABLE_LEARNING_POLICY_VERSION
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const caseId = stringValue(row.id);
  const sourceSessionId = stringValue(row.source_session_id);
  const recordVersion = integerValue(row.record_version);
  return {
    caseId,
    userId,
    sourceSessionId,
    subject: row.subject,
    state: row.state,
    recordVersion,
    contractVersion: DURABLE_LEARNING_CONTRACT_VERSION,
    policyVersion: DURABLE_LEARNING_POLICY_VERSION,
    stateData: stateDataValue(row.state_data, {
      caseId,
      userId,
      subject: row.subject,
      sourceSessionId,
      recordVersion,
    }),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

function parseArtifact(row: Row, userId: string): DurablePrivateAttemptArtifact {
  if (
    row.user_id !== userId ||
    !["D1", "D7", "TIMED", "RECURRENCE"].includes(String(row.stage))
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  return {
    artifactId: stringValue(row.id),
    caseId: stringValue(row.case_id),
    userId,
    attemptId: stringValue(row.attempt_id),
    stage: row.stage as DurablePrivateAttemptArtifact["stage"],
    body: stringValue(row.body),
    createdAt: stringValue(row.created_at),
  };
}

function parseEvent(row: Row, userId: string): DurableEvidenceEvent {
  if (
    row.user_id !== userId ||
    !(DURABLE_EVIDENCE_EVENT_TYPES as readonly unknown[]).includes(row.event_type) ||
    !(
      row.transfer_distance === null ||
      (TRANSFER_DISTANCES as readonly unknown[]).includes(row.transfer_distance)
    ) ||
    !(
      row.outcome === null ||
      ["SUCCESS", "PARTIAL", "BLANK", "TIMEOUT", "FAILURE"].includes(String(row.outcome))
    )
  ) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  const payload = objectValue(row.payload);
  if (payload.containsBody !== false) {
    throw new DurableLearningPersistenceError("invalid_record");
  }
  if (
    [
      "D1_REPRODUCED",
      "D7_TRANSFER_OBSERVED",
      "TIMED_RECURRENCE_CONFIRMED",
      "RECURRENCE_RECONFIRMED",
      "INDEPENDENT_FAILURE_RECORDED",
    ].includes(String(row.event_type))
  ) {
    if (
      row.outcome === null ||
      row.attempt_id === null ||
      row.artifact_id === null ||
      row.item_id === null ||
      row.item_family_id === null
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
    const assignment = objectValue(payload.assignment);
    reviewOutputValue(payload.reviewOutput, {
      caseId: stringValue(row.case_id),
      userId,
      evidenceEventId: stringValue(row.id),
      outcome: row.outcome as DurableEvidenceEvent["outcome"],
      attemptId: stringValue(row.attempt_id),
      privateArtifactId: stringValue(row.artifact_id),
      itemId: stringValue(row.item_id),
      itemRevisionId: stringValue(assignment.itemRevisionId),
      itemFamilyId: stringValue(row.item_family_id),
      proofAnchorId: stringValue(payload.proofAnchorId),
    });
  }
  return {
    eventId: stringValue(row.id),
    caseId: stringValue(row.case_id),
    userId,
    eventType: row.event_type as DurableEvidenceEvent["eventType"],
    attemptId: nullableString(row.attempt_id),
    artifactId: nullableString(row.artifact_id),
    itemId: nullableString(row.item_id),
    itemFamilyId: nullableString(row.item_family_id),
    transferDistance: row.transfer_distance as DurableEvidenceEvent["transferDistance"],
    outcome: row.outcome as DurableEvidenceEvent["outcome"],
    payload,
    occurredAt: stringValue(row.occurred_at),
  };
}

function throwRpcError(error: { message?: string; code?: string } | null) {
  const value = `${error?.code ?? ""}:${error?.message ?? ""}`;
  if (value.includes("WCV_C3_NOT_FOUND")) {
    throw new DurableLearningPersistenceError("not_found");
  }
  if (value.includes("WCV_C3_CAS_CONFLICT") || error?.code === "40001") {
    throw new DurableLearningPersistenceError("stale_record");
  }
  throw new DurableLearningPersistenceError("unavailable");
}

function casePayload(value: GapClosureCaseV1) {
  return {
    caseId: value.caseId,
    userId: value.userId,
    sourceSessionId: value.sourceSessionId,
    subject: value.subject,
    state: value.state,
    recordVersion: value.recordVersion,
    contractVersion: value.contractVersion,
    policyVersion: value.policyVersion,
    stateData: value.stateData,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createDurableLearningRepository(authenticatedUserId: string) {
  async function load(caseId: string): Promise<DurableLearningAggregate> {
    const result = await serviceClient().rpc("wcv_c3_load_gap_closure_case_v1", {
      p_case_id: caseId,
      p_user_id: authenticatedUserId,
    });
    if (result.error) throwRpcError(result.error);
    if (!result.data) throw new DurableLearningPersistenceError("not_found");
    const aggregate = objectValue(result.data);
    const expectedKeys = ["case", "artifacts", "events"];
    if (
      Object.keys(aggregate).length !== expectedKeys.length ||
      Object.keys(aggregate).some((key) => !expectedKeys.includes(key))
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
    const caseRecord = parseCase(objectValue(aggregate.case), authenticatedUserId);
    const artifacts = arrayValue(aggregate.artifacts).map((row) =>
      parseArtifact(objectValue(row), authenticatedUserId),
    );
    const events = arrayValue(aggregate.events).map((row) =>
      parseEvent(objectValue(row), authenticatedUserId),
    );
    if (
      artifacts.some((artifact) => artifact.caseId !== caseRecord.caseId) ||
      events.some((event) => event.caseId !== caseRecord.caseId)
    ) {
      throw new DurableLearningPersistenceError("invalid_record");
    }
    const latestReviewOutcome = caseRecord.stateData.latestReviewOutcome;
    if (latestReviewOutcome) {
      const sourceEvent = events.find(
        (event) => event.eventId === latestReviewOutcome.binding.evidenceEventId,
      );
      const sourceArtifact = artifacts.find(
        (artifact) => artifact.artifactId === latestReviewOutcome.binding.privateArtifactId,
      );
      if (
        !sourceEvent ||
        !sourceArtifact ||
        sourceEvent.outcome !== latestReviewOutcome.outcome ||
        sourceEvent.attemptId !== latestReviewOutcome.binding.attemptId ||
        sourceEvent.artifactId !== latestReviewOutcome.binding.privateArtifactId ||
        sourceEvent.itemId !== latestReviewOutcome.binding.itemId ||
        sourceEvent.itemFamilyId !== latestReviewOutcome.binding.itemFamilyId ||
        sourceArtifact.attemptId !== latestReviewOutcome.binding.attemptId ||
        sourceArtifact.stage !== latestReviewOutcome.binding.stage
      ) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
      const output = reviewOutputValue(objectValue(sourceEvent.payload).reviewOutput, {
        caseId: caseRecord.caseId,
        userId: authenticatedUserId,
        evidenceEventId: sourceEvent.eventId,
        outcome: sourceEvent.outcome,
      });
      if (
        output.reviewOutcomeId !== latestReviewOutcome.reviewOutcomeId ||
        objectValue(output.learningGapSignal).signalId !== latestReviewOutcome.learningGapSignalId ||
        objectValue(output.conceptStateSignal).signalId !== latestReviewOutcome.conceptStateSignalId ||
        output.failureNoteId !== latestReviewOutcome.failureNoteId ||
        JSON.stringify(objectValue(output.learningGapSignal).reasonCodes) !==
          JSON.stringify(latestReviewOutcome.reasonCodes) ||
        !sameReviewBinding(
          reviewBindingValue(objectValue(output.learningGapSignal).binding),
          latestReviewOutcome.binding,
        ) ||
        !sameReviewBinding(
          reviewBindingValue(objectValue(output.conceptStateSignal).binding),
          latestReviewOutcome.binding,
        )
      ) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
    }
    for (const note of caseRecord.stateData.failureNotes) {
      const sourceEvent = events.find((event) => event.eventId === note.binding.evidenceEventId);
      const sourceArtifact = artifacts.find(
        (artifact) => artifact.artifactId === note.binding.privateArtifactId,
      );
      if (
        !sourceEvent ||
        !sourceArtifact ||
        sourceEvent.outcome !== note.outcome ||
        sourceEvent.attemptId !== note.binding.attemptId ||
        sourceEvent.artifactId !== note.binding.privateArtifactId ||
        sourceEvent.itemId !== note.binding.itemId ||
        sourceEvent.itemFamilyId !== note.binding.itemFamilyId ||
        sourceArtifact.attemptId !== note.binding.attemptId ||
        sourceArtifact.stage !== note.binding.stage
      ) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
      const output = reviewOutputValue(objectValue(sourceEvent.payload).reviewOutput, {
        caseId: caseRecord.caseId,
        userId: authenticatedUserId,
        evidenceEventId: sourceEvent.eventId,
        outcome: sourceEvent.outcome,
      });
      if (
        output.failureNoteId !== note.noteId ||
        JSON.stringify(objectValue(output.learningGapSignal).reasonCodes) !==
          JSON.stringify(note.reasonCodes) ||
        !sameReviewBinding(
          reviewBindingValue(objectValue(output.learningGapSignal).binding),
          note.binding,
        )
      ) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
    }
    return { caseRecord, artifacts, events };
  }

  return {
    load,
    async loadBySourceSession(sourceSessionId: string) {
      const result = await serviceClient()
        .from("wcv_c3_gap_closure_cases")
        .select("id")
        .eq("source_session_id", sourceSessionId)
        .eq("user_id", authenticatedUserId)
        .maybeSingle();
      if (result.error) throw new DurableLearningPersistenceError("unavailable");
      return result.data ? load(stringValue(result.data.id)) : null;
    },
    async replayMatches(input: {
      caseId: string;
      commandId: string;
      currentRecordVersion: number;
      currentState: string;
    }) {
      const result = await serviceClient()
        .from("wcv_c3_command_receipts")
        .select("resulting_record_version,resulting_state")
        .eq("case_id", input.caseId)
        .eq("user_id", authenticatedUserId)
        .eq("command_id", input.commandId)
        .maybeSingle();
      if (result.error) throw new DurableLearningPersistenceError("unavailable");
      return Boolean(
        result.data &&
          result.data.resulting_record_version === input.currentRecordVersion &&
          result.data.resulting_state === input.currentState,
      );
    },
    async create(input: {
      caseRecord: GapClosureCaseV1;
      event: Omit<DurableEvidenceEvent, "caseId" | "userId">;
      commandId: string;
    }) {
      if (input.caseRecord.userId !== authenticatedUserId) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
      const result = await serviceClient().rpc("wcv_c3_create_gap_closure_case_v1", {
        p_case: casePayload(input.caseRecord),
        p_event: input.event,
        p_command_id: input.commandId,
      });
      if (result.error) throwRpcError(result.error);
      const row = objectValue(Array.isArray(result.data) ? result.data[0] : result.data);
      return load(stringValue(row.out_case_id));
    },
    async transition(input: {
      aggregate: DurableLearningAggregate;
      plan: DurableLearningTransitionPlan;
      commandId: string;
    }) {
      if (input.aggregate.caseRecord.userId !== authenticatedUserId) {
        throw new DurableLearningPersistenceError("invalid_record");
      }
      const result = await serviceClient().rpc("wcv_c3_apply_transition_v1", {
        p_case_id: input.aggregate.caseRecord.caseId,
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_expected_version: input.aggregate.caseRecord.recordVersion,
        p_expected_state: input.plan.expectedState,
        p_next_state: input.plan.nextState,
        p_state_data: input.plan.stateData,
        p_artifact: input.plan.artifact,
        p_event: input.plan.event,
      });
      if (result.error) throwRpcError(result.error);
      return load(input.aggregate.caseRecord.caseId);
    },
    async delete(input: { caseId: string; expectedVersion: number; commandId: string }) {
      const result = await serviceClient().rpc("wcv_c3_delete_owned_case_v1", {
        p_case_id: input.caseId,
        p_user_id: authenticatedUserId,
        p_command_id: input.commandId,
        p_expected_version: input.expectedVersion,
      });
      if (result.error) throwRpcError(result.error);
      return { deleted: true as const };
    },
  };
}
