import type { TrustedRepairSubject } from "./trusted-repair-contract";

export const DURABLE_LEARNING_CONTRACT_VERSION =
  "dabangil.wcv_c3.durable_learning_daily_command.v1" as const;
export const DURABLE_LEARNING_POLICY_VERSION =
  "dabangil.wcv_c3.evidence_qualification.v1" as const;
export const DURABLE_LEARNING_PLANNER_VERSION =
  "dabangil.wcv_c3.deterministic_full_day.v1" as const;
export const DURABLE_LEARNING_FIXTURE_VERSION =
  "dabangil.wcv_c3.rights_safe_transfer_fixtures.2026-08-17.v2" as const;
export const DURABLE_LEARNING_FLAG =
  "WCV_C3_DURABLE_LEARNING_ENABLED" as const;
export const DURABLE_LEARNING_OWNER_EMAILS =
  "WCV_C3_OWNER_EMAILS" as const;

export const DURABLE_LEARNING_STATES = [
  "REPAIR_VERIFIED_SAME_SESSION",
  "D1_REPRODUCED",
  "D7_TRANSFER_OBSERVED",
  "TIMED_RECURRENCE_CONFIRMED",
  "CURRENTLY_CLEAR",
  "REOPENED",
  "STALE",
  "DEFERRED",
  "BLOCKED",
] as const;

export const TRANSFER_DISTANCES = [
  "SAME_ITEM",
  "SAME_SURFACE",
  "NEAR_TRANSFER",
  "BOUNDARY_TRANSFER",
  "REPRESENTATION_TRANSFER",
  "FAR_TRANSFER",
  "TIMED_INTEGRATION",
] as const;

export const RECURRING_DEDUCTION_STATUSES = [
  "INSUFFICIENT_EVIDENCE",
  "CANDIDATE",
  "REPEATING",
  "RECOVERY_WATCH",
  "CURRENTLY_CLEAR",
  "RECURRED",
  "STALE",
] as const;

export const DAILY_PLAN_DECISIONS = ["PROPOSED", "ACCEPTED", "EDITED", "REJECTED"] as const;
export const DAILY_PLAN_REASON_CODES = [
  "accepted_as_proposed",
  "available_minutes_changed",
  "fixed_commitment_changed",
  "fatigue_or_illness",
  "equivalent_task_preferred",
  "deferred_by_learner",
] as const;

export const DURABLE_EVIDENCE_EVENT_TYPES = [
  "D0_FROZEN",
  "ATTEMPT_PREPARED",
  "D1_REPRODUCED",
  "D7_TRANSFER_OBSERVED",
  "TIMED_RECURRENCE_CONFIRMED",
  "RECURRENCE_RECONFIRMED",
  "CURRENTLY_CLEAR_PROMOTED",
  "INDEPENDENT_FAILURE_RECORDED",
  "CONFIGURATION_STALE",
  "PLAN_PROPOSED",
  "PLAN_DECISION_RECORDED",
] as const;

export type DurableLearningState = (typeof DURABLE_LEARNING_STATES)[number];
export type TransferDistanceV1 = (typeof TRANSFER_DISTANCES)[number];
export type RecurringDeductionStatus = (typeof RECURRING_DEDUCTION_STATUSES)[number];
export type DailyPlanDecision = (typeof DAILY_PLAN_DECISIONS)[number];
export type DailyPlanReasonCode = (typeof DAILY_PLAN_REASON_CODES)[number];
export type DurableEvidenceEventType = (typeof DURABLE_EVIDENCE_EVENT_TYPES)[number];

export type FrozenD0ConfigurationSnapshotV1 = Readonly<{
  snapshotId: string;
  sourceSessionId: string;
  sourceSessionRecordVersion: number;
  sourceRevisionId: string;
  sourceFixtureVersion: string;
  problemSourceVersion: string;
  modelVersion: "deterministic_no_model";
  promptVersion: "none";
  rubricVersion: string;
  validatorVersion: string;
  diagnosisPolicyVersion: string;
  tutorPolicyVersion: string;
  measurementPolicyVersion: typeof DURABLE_LEARNING_POLICY_VERSION;
  ledgerSchemaVersion: typeof DURABLE_LEARNING_CONTRACT_VERSION;
  schedulerPolicyVersion: typeof DURABLE_LEARNING_PLANNER_VERSION;
  contentReleaseVersion: typeof DURABLE_LEARNING_FIXTURE_VERSION;
  frozenAt: string;
  digest: string;
}>;

export type IndependentAttemptQualificationV1 = Readonly<{
  attemptId: string;
  artifactId: string;
  itemId: string;
  itemRevisionId: string;
  itemFamilyId: string;
  representation: "TYPED_STRUCTURED";
  transferDistance: TransferDistanceV1;
  startedAt: string;
  committedAt: string;
  solutionHiddenUntilCommit: boolean;
  exposureCountBeforeAttempt: number;
  assistanceLevel: 0;
  currentSourcePassed: boolean;
  validatorPassed: boolean;
  conflictCount: number;
  timerSource: "trusted_server";
  timeLimitSeconds: number | null;
  elapsedSeconds: number;
  outcome: "SUCCESS" | "PARTIAL" | "BLANK" | "TIMEOUT" | "FAILURE";
}>;

export type PrePresentationEligibilitySnapshotV1 = Readonly<{
  eligibilityId: string;
  itemId: string;
  itemRevisionId: string;
  bank: "LEARNING" | "TRANSFER" | "MEASUREMENT";
  unseen: boolean;
  solutionHidden: boolean;
  releaseState: "AUTOMATED_CHECKED";
  rightsEligible: boolean;
  sourceCurrent: boolean;
  blocked: boolean;
  disputed: boolean;
  retired: boolean;
  capturedAt: string;
}>;

export type VariantAssignmentV1 = Readonly<{
  assignmentId: string;
  subject: TrustedRepairSubject;
  itemId: string;
  itemRevisionId: string;
  itemFamilyId: string;
  fixtureId: string;
  transferDistance: TransferDistanceV1;
  eligibilitySnapshotId: string;
  assignedAt: string;
}>;

export type TimedFullSolutionAttemptV1 = Readonly<{
  attemptId: string;
  trustedStartedAt: string;
  trustedCommittedAt: string;
  timeLimitSeconds: number;
  elapsedSeconds: number;
  late: boolean;
  offlineEvidenceBreak: boolean;
}>;

export type TransferOutcomeV1 = Readonly<{
  outcomeId: string;
  attemptId: string;
  transferDistance: TransferDistanceV1;
  observed: boolean;
  sameItem: boolean;
  sameSurface: boolean;
  independent: boolean;
  sourcePassed: boolean;
  validatorPassed: boolean;
  conflictCount: number;
  observedAt: string;
}>;

export type RecurrenceOutcomeV1 = Readonly<{
  outcomeId: string;
  attemptId: string;
  timed: boolean;
  confirmed: boolean;
  distinctEligibleFamilyCount: number;
  observedAt: string;
}>;

export type EvidenceReopenEventV1 = Readonly<{
  eventId: string;
  attemptId: string;
  priorState: "CURRENTLY_CLEAR";
  nextState: "REOPENED";
  reason: "later_qualifying_independent_failure";
  occurredAt: string;
}>;

export type DurableSubjectCommitmentV1 =
  | Readonly<{
      kind: "PRACTICE_CALCULATION";
      anchorId: string;
      grossIncome: number;
      operatingExpense: number;
      operator: "SUBTRACT" | "ADD";
      result: number;
      unit: "KRW_PER_YEAR" | "KRW";
      sign: "POSITIVE" | "NEGATIVE";
      rounding: "NONE" | "HALF_UP";
    }>
  | Readonly<{
      kind: "THEORY_PREDICATE";
      anchorId: string;
      targetScopeId: string;
      requiredPredicate: string;
      forbiddenPredicateAsserted: boolean;
      polarity: "POSITIVE" | "NEGATIVE";
    }>
  | Readonly<{
      kind: "LAW_EXACT_APPLICABILITY";
      anchorId: string;
      sourceId: string;
      sourceVersionId: string;
      lawAnchorId: string;
      lawAnchorVersionId: string;
      exactLocator: string;
      applicableAsOf: string;
      currentness: "APPLICABLE_CURRENT" | "STALE" | "UNKNOWN";
      blockerCount: number;
    }>;

export type DurableLearnerResponseV1 =
  | Readonly<{
      kind: "PRACTICE_CALCULATION";
      operator: "SUBTRACT" | "ADD";
      result: number;
      unit: "KRW_PER_YEAR" | "KRW";
      sign: "POSITIVE" | "NEGATIVE";
      rounding: "NONE" | "HALF_UP";
    }>
  | Readonly<{
      kind: "THEORY_PREDICATE";
      predicateId: string;
      forbiddenPredicateAsserted: boolean;
      polarity: "POSITIVE" | "NEGATIVE";
    }>
  | Readonly<{
      kind: "LAW_EXACT_APPLICABILITY";
      currentness: "APPLICABLE_CURRENT" | "STALE" | "UNKNOWN";
      blockerCount: number;
    }>;

export type DurablePrivateAttemptArtifact = Readonly<{
  artifactId: string;
  caseId: string;
  userId: string;
  attemptId: string;
  stage: "D1" | "D7" | "TIMED" | "RECURRENCE";
  body: string;
  createdAt: string;
}>;

export type DurableEvidencePayloadV1 = Readonly<{
  prePresentation: PrePresentationEligibilitySnapshotV1;
  assignment: VariantAssignmentV1;
  qualification: IndependentAttemptQualificationV1;
  transferOutcome: TransferOutcomeV1 | null;
  recurrenceOutcome: RecurrenceOutcomeV1 | null;
  timedAttempt: TimedFullSolutionAttemptV1 | null;
  reopenEvent: EvidenceReopenEventV1 | null;
  commitmentKind: DurableSubjectCommitmentV1["kind"];
  containsBody: false;
}>;

export type PreparedAttemptV1 = Readonly<{
  attemptId: string;
  artifactId: string;
  stage: "D1" | "D7" | "TIMED" | "RECURRENCE";
  attemptOrdinal: number;
  prePresentation: PrePresentationEligibilitySnapshotV1;
  assignment: VariantAssignmentV1;
  trustedStartedAt: string;
}>;

export type DurableEvidenceEvent = Readonly<{
  eventId: string;
  caseId: string;
  userId: string;
  eventType: DurableEvidenceEventType;
  attemptId: string | null;
  artifactId: string | null;
  itemId: string | null;
  itemFamilyId: string | null;
  transferDistance: TransferDistanceV1 | null;
  outcome: IndependentAttemptQualificationV1["outcome"] | null;
  payload: DurableEvidencePayloadV1 | Readonly<Record<string, unknown>>;
  occurredAt: string;
}>;

export type RecurringDeductionSignatureV1 = Readonly<{
  signatureId: string;
  subject: TrustedRepairSubject;
  causeCode: "C2_PRIMARY_GAP";
  status: RecurringDeductionStatus;
  eligibleFailureCount: number;
  distinctFailureFamilyCount: number;
  eligibleCounterEvidenceCount: number;
  evidenceEventIds: readonly string[];
  counterEvidenceEventIds: readonly string[];
  nextAction: "D1_REPRODUCTION" | "D7_TRANSFER" | "TIMED_RECURRENCE" | "MONITOR" | "REPAIR_REOPENED";
}>;

export type FixedCommitmentV1 = Readonly<{
  commitmentId: string;
  label: "LECTURE" | "TEXTBOOK" | "MANUAL_COMMITMENT";
  minutes: number;
}>;

export type CoreOutcomeV1 = Readonly<{
  outcomeId: string;
  rank: 1 | 2 | 3;
  subject: TrustedRepairSubject;
  kind: "D1_REPRODUCTION" | "D7_TRANSFER" | "TIMED_RECURRENCE" | "RECURRENCE_REPAIR" | "EVIDENCE_AUDIT";
  reasonCode: string;
  evidenceEventIds: readonly string[];
  successCriterionKo: string;
  estimatedMinutes: number;
}>;

export type ExecutionBlockV1 = Readonly<{
  blockId: string;
  kind: "FIXED" | "CORE_OUTCOME";
  outcomeId: string | null;
  fixedCommitmentId: string | null;
  startMinute: number;
  endMinute: number;
}>;

export type FullDayPlanV1 = Readonly<{
  planId: string;
  plannerVersion: typeof DURABLE_LEARNING_PLANNER_VERSION;
  proposalContext: Readonly<{
    caseRecordVersion: number;
    caseState: DurableLearningState;
    nextEligibleAt: string | null;
    waitingForEligibility: boolean;
  }>;
  availableMinutes: number;
  recoveryMode: "NORMAL" | "MINIMUM_MAINTENANCE";
  coreOutcomes: readonly CoreOutcomeV1[];
  executionBlocks: readonly ExecutionBlockV1[];
  fixedCommitments: readonly FixedCommitmentV1[];
  deferredReasonCodes: readonly string[];
  immediatePrimaryOutcomeId: string | null;
  decision: DailyPlanDecision;
  decisionReason: DailyPlanReasonCode | null;
  blockedManualPlanRequired: boolean;
  proposedAt: string;
}>;

export type DurableLearningStateData = Readonly<{
  frozenD0: FrozenD0ConfigurationSnapshotV1;
  sourcePrimaryGapId: string;
  nextEligibleAt: string | null;
  activeAttempt: PreparedAttemptV1 | null;
  recurringSignature: RecurringDeductionSignatureV1;
  latestPlan: FullDayPlanV1 | null;
  planDecisionHistory: readonly Readonly<{
    decision: DailyPlanDecision;
    reason: DailyPlanReasonCode;
    occurredAt: string;
  }>[];
  resultReasonCodes: readonly string[];
}>;

export type GapClosureCaseV1 = Readonly<{
  caseId: string;
  userId: string;
  sourceSessionId: string;
  subject: TrustedRepairSubject;
  state: DurableLearningState;
  recordVersion: number;
  contractVersion: typeof DURABLE_LEARNING_CONTRACT_VERSION;
  policyVersion: typeof DURABLE_LEARNING_POLICY_VERSION;
  stateData: DurableLearningStateData;
  createdAt: string;
  updatedAt: string;
}>;

export type DurableLearningAggregate = Readonly<{
  caseRecord: GapClosureCaseV1;
  artifacts: readonly DurablePrivateAttemptArtifact[];
  events: readonly DurableEvidenceEvent[];
}>;

export type DurableLearningTransitionPlan = Readonly<{
  expectedState: DurableLearningState;
  nextState: DurableLearningState;
  stateData: DurableLearningStateData;
  artifact: Omit<DurablePrivateAttemptArtifact, "caseId" | "userId"> | null;
  event: Omit<DurableEvidenceEvent, "caseId" | "userId">;
}>;

export class DurableLearningContractError extends Error {
  readonly code:
    | "invalid_input"
    | "invalid_state"
    | "not_eligible"
    | "stale_plan"
    | "stale_configuration"
    | "proof_rejected"
    | "not_found";

  constructor(code: DurableLearningContractError["code"]) {
    super(`durable-learning:${code}`);
    this.code = code;
  }
}

function objectWithExactKeys(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DurableLearningContractError("invalid_input");
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new DurableLearningContractError("invalid_input");
  }
  return record;
}

function boundedText(value: unknown, max = 240) {
  if (typeof value !== "string" || value.length < 1 || value.length > max || value.trim() !== value) {
    throw new DurableLearningContractError("invalid_input");
  }
  return value;
}

function finiteNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DurableLearningContractError("invalid_input");
  }
  return value;
}

export function parseDurableSubjectCommitment(value: unknown): DurableSubjectCommitmentV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DurableLearningContractError("invalid_input");
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "PRACTICE_CALCULATION") {
    const record = objectWithExactKeys(value, [
      "kind", "anchorId", "grossIncome", "operatingExpense", "operator", "result", "unit", "sign", "rounding",
    ]);
    return {
      kind,
      anchorId: boundedText(record.anchorId),
      grossIncome: finiteNumber(record.grossIncome),
      operatingExpense: finiteNumber(record.operatingExpense),
      operator: ["SUBTRACT", "ADD"].includes(String(record.operator))
        ? (record.operator as "SUBTRACT" | "ADD")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      result: finiteNumber(record.result),
      unit: ["KRW_PER_YEAR", "KRW"].includes(String(record.unit))
        ? (record.unit as "KRW_PER_YEAR" | "KRW")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      sign: ["POSITIVE", "NEGATIVE"].includes(String(record.sign))
        ? (record.sign as "POSITIVE" | "NEGATIVE")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      rounding: ["NONE", "HALF_UP"].includes(String(record.rounding))
        ? (record.rounding as "NONE" | "HALF_UP")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
    };
  }
  if (kind === "THEORY_PREDICATE") {
    const record = objectWithExactKeys(value, [
      "kind", "anchorId", "targetScopeId", "requiredPredicate", "forbiddenPredicateAsserted", "polarity",
    ]);
    return {
      kind,
      anchorId: boundedText(record.anchorId),
      targetScopeId: boundedText(record.targetScopeId),
      requiredPredicate: boundedText(record.requiredPredicate),
      forbiddenPredicateAsserted:
        typeof record.forbiddenPredicateAsserted === "boolean"
          ? record.forbiddenPredicateAsserted
          : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      polarity: ["POSITIVE", "NEGATIVE"].includes(String(record.polarity))
        ? (record.polarity as "POSITIVE" | "NEGATIVE")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
    };
  }
  if (kind === "LAW_EXACT_APPLICABILITY") {
    const record = objectWithExactKeys(value, [
      "kind", "anchorId", "sourceId", "sourceVersionId", "lawAnchorId", "lawAnchorVersionId", "exactLocator", "applicableAsOf", "currentness", "blockerCount",
    ]);
    return {
      kind,
      anchorId: boundedText(record.anchorId),
      sourceId: boundedText(record.sourceId),
      sourceVersionId: boundedText(record.sourceVersionId),
      lawAnchorId: boundedText(record.lawAnchorId),
      lawAnchorVersionId: boundedText(record.lawAnchorVersionId),
      exactLocator: boundedText(record.exactLocator),
      applicableAsOf: boundedText(record.applicableAsOf),
      currentness: ["APPLICABLE_CURRENT", "STALE", "UNKNOWN"].includes(String(record.currentness))
        ? (record.currentness as "APPLICABLE_CURRENT" | "STALE" | "UNKNOWN")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      blockerCount:
        Number.isInteger(record.blockerCount) && Number(record.blockerCount) >= 0
          ? Number(record.blockerCount)
          : (() => { throw new DurableLearningContractError("invalid_input"); })(),
    };
  }
  throw new DurableLearningContractError("invalid_input");
}

export function parseDurableLearnerResponse(value: unknown): DurableLearnerResponseV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DurableLearningContractError("invalid_input");
  }
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "PRACTICE_CALCULATION") {
    const record = objectWithExactKeys(value, [
      "kind", "operator", "result", "unit", "sign", "rounding",
    ]);
    return {
      kind,
      operator: ["SUBTRACT", "ADD"].includes(String(record.operator))
        ? (record.operator as "SUBTRACT" | "ADD")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      result: finiteNumber(record.result),
      unit: ["KRW_PER_YEAR", "KRW"].includes(String(record.unit))
        ? (record.unit as "KRW_PER_YEAR" | "KRW")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      sign: ["POSITIVE", "NEGATIVE"].includes(String(record.sign))
        ? (record.sign as "POSITIVE" | "NEGATIVE")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      rounding: ["NONE", "HALF_UP"].includes(String(record.rounding))
        ? (record.rounding as "NONE" | "HALF_UP")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
    };
  }
  if (kind === "THEORY_PREDICATE") {
    const record = objectWithExactKeys(value, [
      "kind", "predicateId", "forbiddenPredicateAsserted", "polarity",
    ]);
    return {
      kind,
      predicateId: boundedText(record.predicateId),
      forbiddenPredicateAsserted:
        typeof record.forbiddenPredicateAsserted === "boolean"
          ? record.forbiddenPredicateAsserted
          : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      polarity: ["POSITIVE", "NEGATIVE"].includes(String(record.polarity))
        ? (record.polarity as "POSITIVE" | "NEGATIVE")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
    };
  }
  if (kind === "LAW_EXACT_APPLICABILITY") {
    const record = objectWithExactKeys(value, ["kind", "currentness", "blockerCount"]);
    return {
      kind,
      currentness: ["APPLICABLE_CURRENT", "STALE", "UNKNOWN"].includes(String(record.currentness))
        ? (record.currentness as "APPLICABLE_CURRENT" | "STALE" | "UNKNOWN")
        : (() => { throw new DurableLearningContractError("invalid_input"); })(),
      blockerCount:
        Number.isInteger(record.blockerCount) && Number(record.blockerCount) >= 0
          ? Number(record.blockerCount)
          : (() => { throw new DurableLearningContractError("invalid_input"); })(),
    };
  }
  throw new DurableLearningContractError("invalid_input");
}

export function parseFixedCommitments(value: unknown): readonly FixedCommitmentV1[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new DurableLearningContractError("invalid_input");
  }
  const ids = new Set<string>();
  return value.map((entry) => {
    const record = objectWithExactKeys(entry, ["commitmentId", "label", "minutes"]);
    if (
      typeof record.commitmentId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(record.commitmentId) ||
      ids.has(record.commitmentId) ||
      !["LECTURE", "TEXTBOOK", "MANUAL_COMMITMENT"].includes(String(record.label)) ||
      !Number.isInteger(record.minutes) ||
      Number(record.minutes) < 1 ||
      Number(record.minutes) > 720
    ) {
      throw new DurableLearningContractError("invalid_input");
    }
    ids.add(record.commitmentId);
    return {
      commitmentId: record.commitmentId,
      label: record.label as FixedCommitmentV1["label"],
      minutes: Number(record.minutes),
    };
  });
}

export function isDurablePlanDecision(value: unknown): value is DailyPlanDecision {
  return (DAILY_PLAN_DECISIONS as readonly unknown[]).includes(value);
}

export function isDurablePlanReason(value: unknown): value is DailyPlanReasonCode {
  return (DAILY_PLAN_REASON_CODES as readonly unknown[]).includes(value);
}

export function isDurableLearningState(value: unknown): value is DurableLearningState {
  return (DURABLE_LEARNING_STATES as readonly unknown[]).includes(value);
}
