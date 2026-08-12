import "server-only";

import {
  TRUSTED_REPAIR_CONTRACT_VERSION,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_POLICY_VERSION,
  TRUSTED_REPAIR_RUBRIC_VERSION,
  TRUSTED_REPAIR_STEP_GUIDANCE,
  TRUSTED_REPAIR_VALIDATOR_VERSION,
  TrustedRepairContractError,
  type TrustedRepairAggregate,
  type TrustedRepairContinuation,
  type TrustedRepairFixture,
  type TrustedRepairInputMode,
  type TrustedRepairSubject,
} from "./trusted-repair-contract";
import {
  initialTrustedRepairStateData,
  planTrustedRepairContinuation,
  planTrustedRepairDiagnosis,
  planTrustedRepairExposure,
  planTrustedRepairIndependentAttempt,
  planTrustedRepairPrediction,
  planTrustedRepairRevisionConfirmation,
  planTrustedRepairRevisionDrift,
  planTrustedRepairSelfDiagnosis,
  planTrustedRepairSubmission,
  selectTrustedRepairScaffoldExposure,
  trustedRepairAggregateForRelease,
  trustedRepairSourceBindingMatches,
  trustedRepairSourceVersion,
} from "./trusted-repair-engine";
import {
  trustedRepairBankFirstSelection,
  trustedRepairFixtureById,
  validateTrustedRepairFixtureEligibility,
} from "./trusted-repair-fixtures";
import {
  createTrustedRepairRepository,
  TrustedRepairPersistenceError,
} from "./trusted-repair-repository";
import { resolveTrustedRepairSourceBinding } from "./trusted-repair-source-binding";

const POST_EXPOSURE_STATES = new Set([
  "exposure_committed",
  "repair_submitted",
  "verified",
  "partial",
  "guided",
  "blocked",
  "uncertain",
]);

function nowIso() {
  return new Date().toISOString();
}

function fixtureForAggregate(aggregate: TrustedRepairAggregate) {
  const fixture = trustedRepairFixtureById(aggregate.session.fixtureId);
  if (
    !fixture ||
    fixture.subject !== aggregate.session.subject ||
    !fixture.runtimeSupported ||
    !validateTrustedRepairFixtureEligibility(fixture).eligible
  ) {
    throw new TrustedRepairContractError("rights_blocked");
  }
  return fixture;
}

function scaffoldFor(aggregate: TrustedRepairAggregate, fixture: TrustedRepairFixture) {
  if (!POST_EXPOSURE_STATES.has(aggregate.session.state)) return null;
  const primary = aggregate.session.stateData.gapCandidates.find(
    (candidate) => candidate.gapId === aggregate.session.primaryGapId,
  );
  const matchingExposure = selectTrustedRepairScaffoldExposure(aggregate);
  if (!primary || !matchingExposure) return null;
  const text = fixture.scaffoldByAnchor[primary.anchorId];
  if (!text) throw new TrustedRepairContractError("invalid_transition");
  return {
    exposureId: matchingExposure.exposureId,
    assistanceLevel: matchingExposure.assistanceLevel,
    kind: matchingExposure.scaffoldKind,
    text,
  };
}

export function trustedRepairView(aggregate: TrustedRepairAggregate) {
  const fixture = fixtureForAggregate(aggregate);
  const source = resolveTrustedRepairSourceBinding(fixture);
  const sourceBindingCurrent = trustedRepairSourceBindingMatches({
    aggregate,
    fixture,
    sourceBinding: source,
  });
  const releaseAggregate = trustedRepairAggregateForRelease({
    aggregate,
    fixture,
    sourceBinding: source,
  });
  const anchorsVisible =
    sourceBindingCurrent &&
    releaseAggregate.session.state !== "editable_capture_draft";
  return {
    contractVersion: TRUSTED_REPAIR_CONTRACT_VERSION,
    session: {
      sessionId: releaseAggregate.session.sessionId,
      fixtureId: releaseAggregate.session.fixtureId,
      subject: releaseAggregate.session.subject,
      state: releaseAggregate.session.state,
      recordVersion: releaseAggregate.session.recordVersion,
      outcome: releaseAggregate.session.outcome,
      inputMode: releaseAggregate.session.stateData.inputMode,
      revisionNumber: releaseAggregate.session.stateData.revisionNumber,
      primaryGapId: releaseAggregate.session.primaryGapId,
      assistanceLevel: releaseAggregate.session.assistanceLevel,
      independentAttemptBeforeHelp:
        releaseAggregate.session.independentAttemptBeforeHelp,
      prediction: releaseAggregate.session.stateData.prediction,
      predictionConfidence:
        releaseAggregate.session.stateData.predictionConfidence,
      selfDiagnosisCode: releaseAggregate.session.stateData.selfDiagnosisCode,
      repairNeed: releaseAggregate.session.stateData.repairNeed,
      repairPath: releaseAggregate.session.stateData.repairPath,
      continuation: releaseAggregate.session.stateData.continuation,
      resultReasonCodes: releaseAggregate.session.stateData.resultReasonCodes,
      guidance:
        TRUSTED_REPAIR_STEP_GUIDANCE[
          releaseAggregate.session
            .state as keyof typeof TRUSTED_REPAIR_STEP_GUIDANCE
        ] ?? null,
      createdAt: releaseAggregate.session.createdAt,
      updatedAt: releaseAggregate.session.updatedAt,
    },
    fixture: {
      fixtureId: fixture.fixtureId,
      labelKo: fixture.labelKo,
      prompt: fixture.prompt,
      bank: fixture.bank,
      releaseState: fixture.releaseState,
      rights: {
        rightsClass: fixture.rights.rightsClass,
        synthetic: fixture.rights.synthetic,
        ownerTestOnly: fixture.rights.purpose === "owner_test_only",
        thirdPartyBodyUsed: fixture.rights.thirdPartyBodyUsed,
        rawBodyTrainingAllowed: fixture.rights.rawBodyTrainingAllowed,
        sharingAllowed: fixture.rights.sharingAllowed,
      },
      successCriterionKo: fixture.successCriterionKo,
    },
    anchors: anchorsVisible
      ? fixture.anchors.map((anchor) => ({
          anchorId: anchor.anchorId,
          labelKo: anchor.labelKo,
        }))
      : [],
    diagnosis:
      releaseAggregate.session.stateData.gapCandidates.length > 0
        ? {
            primaryGapId: releaseAggregate.session.primaryGapId,
            candidates: releaseAggregate.session.stateData.gapCandidates.map(
              (candidate) => ({
                gapId: candidate.gapId,
                anchorId: candidate.anchorId,
                labelKo: candidate.labelKo,
                rank: candidate.rank,
                supportingEvidence: candidate.supportingEvidence,
                counterEvidence: candidate.counterEvidence,
                repairActionKo: candidate.repairActionKo,
                successCriterionKo: candidate.successCriterionKo,
              }),
            ),
          }
        : null,
    source: {
      sourceId: fixture.sourceBinding.sourceId,
      bindingVersion: source.bindingVersion,
      sourceAnchorId: source.sourceAnchorId,
      sourceStatus: source.sourceStatus,
      versionStatus: source.versionStatus,
      currentLawStatus: source.currentLawStatus,
      blockerCount: source.blockerCount,
      verifiedForCurrentLaw:
        sourceBindingCurrent &&
        source.sourceStatus === "verified" &&
        source.versionStatus === "verified" &&
        source.currentLawStatus === "current_law_verified" &&
        source.blockerCount === 0,
    },
    editableCaptureDraft:
      releaseAggregate.session.state === "editable_capture_draft"
        ? fixture.editableDrafts[releaseAggregate.session.stateData.inputMode]
        : null,
    scaffold: scaffoldFor(releaseAggregate, fixture),
    claimBoundary: {
      sameSessionCriterionOnly: true,
      masteryClaimed: false,
      transferClaimed: false,
      stabilityClaimed: false,
      scoreClaimed: false,
      passClaimed: false,
    },
  } as const;
}

export type TrustedRepairView = ReturnType<typeof trustedRepairView>;

export function createTrustedRepairService(authenticatedUserId: string) {
  const repository = createTrustedRepairRepository(authenticatedUserId);

  async function expectedAggregate(input: {
    sessionId: string;
    expectedVersion: number;
    commandId: string;
  }) {
    const aggregate = await repository.load(input.sessionId);
    if (aggregate.session.recordVersion !== input.expectedVersion) {
      const replayed = await repository.replayMatches({
        sessionId: input.sessionId,
        commandId: input.commandId,
        currentRecordVersion: aggregate.session.recordVersion,
        currentState: aggregate.session.state,
      });
      if (replayed) return { aggregate, replayed: true as const };
      throw new TrustedRepairPersistenceError("stale_record");
    }
    return { aggregate, replayed: false as const };
  }

  async function transition(
    common: { sessionId: string; expectedVersion: number; commandId: string },
    planner: (aggregate: TrustedRepairAggregate, fixture: TrustedRepairFixture) => ReturnType<typeof planTrustedRepairPrediction>,
  ) {
    const loaded = await expectedAggregate(common);
    if (loaded.replayed) return trustedRepairView(loaded.aggregate);
    const fixture = fixtureForAggregate(loaded.aggregate);
    const plan = planner(loaded.aggregate, fixture);
    const persisted = await repository.transition({
      aggregate: loaded.aggregate,
      plan,
      commandId: common.commandId,
    });
    return trustedRepairView(persisted);
  }

  return {
    async start(input: {
      subject: TrustedRepairSubject;
      inputMode: TrustedRepairInputMode;
      commandId: string;
    }) {
      const selection = trustedRepairBankFirstSelection({
        subject: input.subject,
        bank: "LEARNING",
      });
      if (selection.kind !== "selected") {
        throw new TrustedRepairContractError("rights_blocked");
      }
      const fixture = selection.fixture;
      const eligibility = validateTrustedRepairFixtureEligibility(fixture);
      if (!eligibility.eligible || !fixture.runtimeSupported) {
        throw new TrustedRepairContractError("rights_blocked");
      }
      const occurredAt = nowIso();
      const currentSourceBinding = resolveTrustedRepairSourceBinding(fixture);
      const sessionId = crypto.randomUUID();
      const artifactId = crypto.randomUUID();
      const session = {
        sessionId,
        userId: authenticatedUserId,
        fixtureId: fixture.fixtureId,
        subject: fixture.subject,
        state: "editable_capture_draft" as const,
        recordVersion: 1,
        confirmedRevisionId: null,
        primaryGapId: null,
        outcome: null,
        assistanceLevel: 0,
        independentAttemptBeforeHelp: false,
        bindings: {
          contractVersion: TRUSTED_REPAIR_CONTRACT_VERSION,
          fixtureVersion: TRUSTED_REPAIR_FIXTURE_VERSION,
          sourceVersion: trustedRepairSourceVersion(
            fixture,
            currentSourceBinding,
          ),
          rubricVersion: TRUSTED_REPAIR_RUBRIC_VERSION,
          policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
          validatorVersion: TRUSTED_REPAIR_VALIDATOR_VERSION,
        },
        stateData: initialTrustedRepairStateData(input.inputMode),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      };
      const aggregate = await repository.create({
        session,
        artifact: {
          artifactId,
          revisionNumber: 0,
          kind: "capture_draft",
          inputMode: input.inputMode,
          body: fixture.editableDrafts[input.inputMode],
          createdAt: occurredAt,
        },
        commandId: input.commandId,
      });
      return trustedRepairView(aggregate);
    },
    async load(sessionId: string) {
      return trustedRepairView(await repository.load(sessionId));
    },
    confirmRevision(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      body: string;
    }) {
      return transition(input, (aggregate) =>
        planTrustedRepairRevisionConfirmation({
          aggregate,
          artifactId: crypto.randomUUID(),
          body: input.body,
          occurredAt: nowIso(),
        }),
      );
    },
    commitPrediction(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      prediction: "likely_success" | "likely_partial" | "likely_blocked";
      confidence: "low" | "medium" | "high";
    }) {
      return transition(input, (aggregate) =>
        planTrustedRepairPrediction({ aggregate, prediction: input.prediction, confidence: input.confidence }),
      );
    },
    commitAttempt(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      body: string;
    }) {
      return transition(input, (aggregate) =>
        planTrustedRepairIndependentAttempt({
          aggregate,
          artifactId: crypto.randomUUID(),
          body: input.body,
          occurredAt: nowIso(),
        }),
      );
    },
    commitSelfDiagnosis(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      selfDiagnosisCode: string;
    }) {
      return transition(input, (aggregate) =>
        planTrustedRepairSelfDiagnosis({ aggregate, selfDiagnosisCode: input.selfDiagnosisCode }),
      );
    },
    diagnose(input: { sessionId: string; expectedVersion: number; commandId: string }) {
      return transition(input, (aggregate, fixture) =>
        planTrustedRepairDiagnosis({
          aggregate,
          fixture,
          sourceBinding: resolveTrustedRepairSourceBinding(fixture),
        }),
      );
    },
    requestScaffold(input: { sessionId: string; expectedVersion: number; commandId: string }) {
      return transition(input, (aggregate) =>
        planTrustedRepairExposure({
          aggregate,
          exposureId: crypto.randomUUID(),
          occurredAt: nowIso(),
        }),
      );
    },
    submitRepair(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      body: string;
    }) {
      return transition(input, (aggregate) =>
        planTrustedRepairSubmission({
          aggregate,
          artifactId: crypto.randomUUID(),
          body: input.body,
          occurredAt: nowIso(),
        }),
      );
    },
    continue(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      continuation: TrustedRepairContinuation;
    }) {
      return transition(input, (aggregate, fixture) =>
        planTrustedRepairContinuation({
          aggregate,
          fixture,
          sourceBinding: resolveTrustedRepairSourceBinding(fixture),
          continuation: input.continuation,
          exposureId: crypto.randomUUID(),
          occurredAt: nowIso(),
        }),
      );
    },
    replaceRevision(input: {
      sessionId: string;
      expectedVersion: number;
      commandId: string;
      body: string;
    }) {
      return transition(input, (aggregate) =>
        planTrustedRepairRevisionDrift({
          aggregate,
          artifactId: crypto.randomUUID(),
          body: input.body,
          occurredAt: nowIso(),
        }),
      );
    },
  };
}
