import "server-only";

import {
  DURABLE_LEARNING_CONTRACT_VERSION,
  DurableLearningContractError,
  type DailyPlanDecision,
  type DailyPlanReasonCode,
  type DurableLearnerResponseV1,
  type DurableLearningAggregate,
  type DurableLearningTransitionPlan,
  type FixedCommitmentV1,
} from "./durable-learning-contract";
import {
  createGapClosureCase,
  frozenD0MatchesCurrent,
  planAttemptPreparation,
  planConfigurationStale,
  planCurrentlyClear,
  planDurableEvidence,
  planFullDayDecision,
  planFullDayProposal,
} from "./durable-learning-engine";
import {
  bindDurableLearnerResponse,
  durableFixtureFor,
} from "./durable-learning-fixtures";
import {
  createDurableLearningRepository,
  DurableLearningPersistenceError,
} from "./durable-learning-repository";
import { createTrustedRepairRepository } from "./trusted-repair-repository";

function nowIso() {
  return new Date().toISOString();
}

function addSeconds(value: string, seconds: number) {
  return new Date(Date.parse(value) + seconds * 1000).toISOString();
}

function syntheticRuntimeEnabled() {
  return (
    process.env.WCV_C3_SYNTHETIC_RUNTIME === "true" &&
    process.env.CI === "true" &&
    process.env.VERCEL_ENV !== "production"
  );
}

function operationTime(
  aggregate: DurableLearningAggregate,
  operation: "prepare" | "submit" | "clear" | "other",
) {
  if (!syntheticRuntimeEnabled()) return nowIso();
  const latestEvidenceAt =
    aggregate.events.at(-1)?.occurredAt ?? aggregate.caseRecord.createdAt;
  if (operation === "prepare") {
    return addSeconds(
      aggregate.caseRecord.stateData.nextEligibleAt ?? aggregate.caseRecord.updatedAt,
      1,
    );
  }
  if (operation === "submit") {
    const active = aggregate.caseRecord.stateData.activeAttempt;
    if (!active) throw new DurableLearningContractError("invalid_state");
    return addSeconds(active.trustedStartedAt, active.stage === "TIMED" ? 900 : 120);
  }
  return addSeconds(latestEvidenceAt, 1);
}

export function durableLearningView(
  aggregate: DurableLearningAggregate,
  evaluatedAt = nowIso(),
  sourceConfigurationCurrent = true,
) {
  const active = aggregate.caseRecord.stateData.activeAttempt;
  const fixture = active
    ? durableFixtureFor({
        subject: aggregate.caseRecord.subject,
        stage: active.stage,
        evaluatedAt,
        attemptOrdinal: active.attemptOrdinal,
      })
    : null;
  const nextAction =
    aggregate.caseRecord.state === "STALE" ||
    aggregate.caseRecord.state === "DEFERRED" ||
    aggregate.caseRecord.state === "BLOCKED"
      ? null
      : active
        ? "SUBMIT_INDEPENDENT_ATTEMPT"
        : aggregate.caseRecord.state === "TIMED_RECURRENCE_CONFIRMED"
          ? "EVALUATE_CURRENTLY_CLEAR"
          : "PREPARE_INDEPENDENT_ATTEMPT";
  return {
    contractVersion: DURABLE_LEARNING_CONTRACT_VERSION,
    case: {
      caseId: aggregate.caseRecord.caseId,
      sourceSessionId: aggregate.caseRecord.sourceSessionId,
      subject: aggregate.caseRecord.subject,
      state: aggregate.caseRecord.state,
      recordVersion: aggregate.caseRecord.recordVersion,
      sourcePrimaryGapId: aggregate.caseRecord.stateData.sourcePrimaryGapId,
      nextEligibleAt: aggregate.caseRecord.stateData.nextEligibleAt,
      sourceConfigurationCurrent,
      nextAction,
      resultReasonCodes: aggregate.caseRecord.stateData.resultReasonCodes,
      createdAt: aggregate.caseRecord.createdAt,
      updatedAt: aggregate.caseRecord.updatedAt,
    },
    attempt: active && fixture
      ? {
          attemptId: active.attemptId,
          stage: active.stage,
          attemptOrdinal: active.attemptOrdinal,
          trustedStartedAt: active.trustedStartedAt,
          transferDistance: active.assignment.transferDistance,
          itemFamilyId: active.assignment.itemFamilyId,
          prompt: fixture.prompt,
          inputContext: fixture.inputContext,
          timeLimitSeconds: fixture.timeLimitSeconds,
          minimumElapsedSeconds: fixture.minimumElapsedSeconds,
          solutionHiddenUntilCommit: true,
          rights: {
            sourceClass: fixture.fixture.rights.sourceClass,
            manifestId: fixture.fixture.rights.manifestId,
            manifestVersionId: fixture.fixture.rights.manifestVersionId,
            status: fixture.fixture.rights.status,
            rawBodyTrainingAllowed: false,
            sharingAllowed: false,
          },
        }
      : null,
    recurringDeduction: aggregate.caseRecord.stateData.recurringSignature,
    latestPlan: aggregate.caseRecord.stateData.latestPlan,
    planDecisionHistory: aggregate.caseRecord.stateData.planDecisionHistory,
    ledger: {
      artifacts: aggregate.artifacts.map((artifact) => ({
        artifactId: artifact.artifactId,
        attemptId: artifact.attemptId,
        stage: artifact.stage,
        body: artifact.body,
        createdAt: artifact.createdAt,
      })),
      events: aggregate.events.map((event) => ({
        eventId: event.eventId,
        eventType: event.eventType,
        attemptId: event.attemptId,
        itemId: event.itemId,
        itemFamilyId: event.itemFamilyId,
        transferDistance: event.transferDistance,
        outcome: event.outcome,
        payload: event.payload,
        occurredAt: event.occurredAt,
      })),
    },
    evidenceBoundary: {
      sameSessionRepairAloneClosesGap: false,
      genericTextPresenceCreatesProof: false,
      assistanceCreatesMastery: false,
      currentlyClearIsPermanent: false,
      laterIndependentFailureReopens: true,
      planDecisionChangesMastery: false,
    },
  } as const;
}

export type DurableLearningView = ReturnType<typeof durableLearningView>;

export function createDurableLearningService(authenticatedUserId: string) {
  const repository = createDurableLearningRepository(authenticatedUserId);
  const sourceRepository = createTrustedRepairRepository(authenticatedUserId);

  async function sourceCurrent(aggregate: DurableLearningAggregate) {
    const source = await sourceRepository.load(aggregate.caseRecord.sourceSessionId);
    return {
      matches: frozenD0MatchesCurrent(aggregate.caseRecord.stateData.frozenD0, source),
      source,
    };
  }

  async function expectedAggregate(input: {
    caseId: string;
    expectedVersion: number;
    commandId: string;
  }) {
    const aggregate = await repository.load(input.caseId);
    if (aggregate.caseRecord.recordVersion !== input.expectedVersion) {
      const replayed = await repository.replayMatches({
        caseId: input.caseId,
        commandId: input.commandId,
        currentRecordVersion: aggregate.caseRecord.recordVersion,
        currentState: aggregate.caseRecord.state,
      });
      if (replayed) return { aggregate, replayed: true as const };
      throw new DurableLearningPersistenceError("stale_record");
    }
    return { aggregate, replayed: false as const };
  }

  async function transition(
    common: { caseId: string; expectedVersion: number; commandId: string },
    operation: "prepare" | "submit" | "clear" | "other",
    planner: (
      aggregate: DurableLearningAggregate,
      occurredAt: string,
    ) => DurableLearningTransitionPlan,
  ) {
    const loaded = await expectedAggregate(common);
    if (loaded.replayed) return durableLearningView(loaded.aggregate);
    const current = await sourceCurrent(loaded.aggregate);
    const occurredAt = operationTime(loaded.aggregate, operation);
    if (!current.matches) {
      if (loaded.aggregate.caseRecord.state === "STALE") {
        return durableLearningView(loaded.aggregate, occurredAt, false);
      }
      const stale = await repository.transition({
        aggregate: loaded.aggregate,
        plan: planConfigurationStale({ aggregate: loaded.aggregate, occurredAt }),
        commandId: common.commandId,
      });
      return durableLearningView(stale, occurredAt, false);
    }
    const plan = planner(loaded.aggregate, occurredAt);
    const persisted = await repository.transition({
      aggregate: loaded.aggregate,
      plan,
      commandId: common.commandId,
    });
    return durableLearningView(persisted, occurredAt);
  }

  return {
    async start(input: { sourceSessionId: string; commandId: string }) {
      const existing = await repository.loadBySourceSession(input.sourceSessionId);
      if (existing) {
        const current = await sourceCurrent(existing);
        return durableLearningView(existing, nowIso(), current.matches);
      }
      const source = await sourceRepository.load(input.sourceSessionId);
      const occurredAt = nowIso();
      const planned = createGapClosureCase({
        userId: authenticatedUserId,
        aggregate: source,
        occurredAt,
      });
      const created = await repository.create({ ...planned, commandId: input.commandId });
      return durableLearningView(created, occurredAt);
    },
    async load(caseId: string) {
      const aggregate = await repository.load(caseId);
      const current = await sourceCurrent(aggregate);
      return durableLearningView(aggregate, nowIso(), current.matches);
    },
    prepareAttempt(common: { caseId: string; expectedVersion: number; commandId: string }) {
      return transition(common, "prepare", (aggregate, occurredAt) =>
        planAttemptPreparation({ aggregate, occurredAt }),
      );
    },
    recordEvidence(input: {
      caseId: string;
      expectedVersion: number;
      commandId: string;
      body: string;
      learnerResponse: DurableLearnerResponseV1;
    }) {
      return transition(input, "submit", (aggregate, occurredAt) => {
        const active = aggregate.caseRecord.stateData.activeAttempt;
        if (!active) throw new DurableLearningContractError("invalid_state");
        const fixture = durableFixtureFor({
          subject: aggregate.caseRecord.subject,
          stage: active.stage,
          evaluatedAt: occurredAt,
          attemptOrdinal: active.attemptOrdinal,
        });
        return planDurableEvidence({
          aggregate,
          body: input.body,
          commitment: bindDurableLearnerResponse(fixture, input.learnerResponse),
          occurredAt,
        });
      });
    },
    evaluateCurrentlyClear(common: {
      caseId: string;
      expectedVersion: number;
      commandId: string;
    }) {
      return transition(common, "clear", (aggregate, occurredAt) =>
        planCurrentlyClear({ aggregate, occurredAt }),
      );
    },
    buildPlan(input: {
      caseId: string;
      expectedVersion: number;
      commandId: string;
      availableMinutes: number;
      recoveryMode: "NORMAL" | "MINIMUM_MAINTENANCE";
      fixedCommitments: readonly FixedCommitmentV1[];
    }) {
      return transition(input, "other", (aggregate, occurredAt) =>
        planFullDayProposal({
          aggregate,
          availableMinutes: input.availableMinutes,
          recoveryMode: input.recoveryMode,
          fixedCommitments: input.fixedCommitments,
          occurredAt,
        }),
      );
    },
    decidePlan(input: {
      caseId: string;
      expectedVersion: number;
      commandId: string;
      decision: Exclude<DailyPlanDecision, "PROPOSED">;
      reason: DailyPlanReasonCode;
      replacement?: Readonly<{
        availableMinutes: number;
        recoveryMode: "NORMAL" | "MINIMUM_MAINTENANCE";
        fixedCommitments: readonly FixedCommitmentV1[];
      }>;
    }) {
      return transition(input, "other", (aggregate, occurredAt) =>
        planFullDayDecision({
          aggregate,
          decision: input.decision,
          reason: input.reason,
          replacement: input.replacement,
          occurredAt,
        }),
      );
    },
    async exportCase(input: { caseId: string; expectedVersion: number }) {
      const aggregate = await repository.load(input.caseId);
      if (aggregate.caseRecord.recordVersion !== input.expectedVersion) {
        throw new DurableLearningPersistenceError("stale_record");
      }
      const current = await sourceCurrent(aggregate);
      return {
        exportVersion: DURABLE_LEARNING_CONTRACT_VERSION,
        exportedAt: nowIso(),
        sourceConfigurationCurrent: current.matches,
        caseRecord: aggregate.caseRecord,
        privateArtifacts: aggregate.artifacts,
        evidenceEvents: aggregate.events,
      } as const;
    },
    deleteCase(input: { caseId: string; expectedVersion: number; commandId: string }) {
      return repository.delete(input);
    },
  };
}
