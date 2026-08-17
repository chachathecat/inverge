import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDeterministicFullDayPlan,
  createGapClosureCase,
  frozenD0MatchesCurrent,
  isBeforeDurableEligibility,
  planAttemptPreparation,
  planCurrentlyClear,
  planDurableEvidence,
  planFullDayDecision,
} from "../lib/review-os/durable-learning-engine.ts";
import {
  bindDurableLearnerResponse,
  durableCommitmentPasses,
  durableFixtureFor,
  expectedCommitmentForFixture,
} from "../lib/review-os/durable-learning-fixtures.ts";
import { parseDurableLearnerResponse } from "../lib/review-os/durable-learning-contract.ts";

const USER_ID = "00000000-0000-4000-8000-000000000001";

function sourceAggregate(subject) {
  const profile = {
    appraisal_practical: {
      fixtureVersion: "dabangil.c2r-c-p.synthetic-fixture.2026-08-15.v1",
      rubricVersion: "dabangil.c2r-c-p.practice-proof-rubric.v2",
      validatorVersion: "validator:practice-calculation-claim@2",
      anchorId: "repair-anchor:practice:synthetic-net-income",
      anchorVersionId: "repair-anchor:practice:synthetic-net-income@1",
    },
    appraisal_theory: {
      fixtureVersion: "dabangil.c2r-c-t.synthetic-fixture.2026-08-17.v1",
      rubricVersion: "dabangil.c2r-c-t.theory-proof-rubric.v1",
      validatorVersion: "validator:theory-scoped-predicate@1",
      anchorId: "repair-anchor:theory:synthetic-income-approach",
      anchorVersionId: "repair-anchor:theory:synthetic-income-approach@1",
    },
    appraisal_law: {
      fixtureVersion: "dabangil.c2r-c-l.synthetic-fixture.2026-08-17.v1",
      rubricVersion: "dabangil.c2r-c-l.law-proof-rubric.v1",
      validatorVersion: "validator:law-exact-applicability@1",
      anchorId: "repair-anchor:law:synthetic-article-10",
      anchorVersionId: "repair-anchor:law:synthetic-article-10@1",
    },
  }[subject];
  return {
    session: {
      sessionId: crypto.randomUUID(), userId: USER_ID, fixtureId: `fixture:${subject}`,
      subject, state: "verified", recordVersion: 9, confirmedRevisionId: crypto.randomUUID(),
      primaryGapId: `gap:${subject}`, outcome: "verified", assistanceLevel: 1,
      independentAttemptBeforeHelp: true,
      bindings: {
        contractVersion: "dabangil.c2r-b.typed-subject-proof-architecture.v1",
        fixtureVersion: profile.fixtureVersion,
        sourceVersion: `source:${subject}@1`, rubricVersion: profile.rubricVersion,
        policyVersion: "dabangil.c2r-c-p.trusted-repair-policy.v1",
        validatorVersion: profile.validatorVersion,
      },
      stateData: {
        inputMode: "TYPED_TEXT", revisionNumber: 2, prediction: "likely_partial",
        predictionConfidence: "medium", selfDiagnosisCode: "gap", gapCandidates: [],
        repairNeed: null, repairPath: null, continuation: null, structuredClaim: {},
        proofEvaluation: {
          state: "PASS", verified: true, validatorId: profile.validatorVersion,
          anchorId: profile.anchorId, anchorVersionId: profile.anchorVersionId,
          sourceRevisionId: "revision", reasonCodes: [],
        },
        resultReasonCodes: [],
      },
      createdAt: "2026-08-17T00:00:00.000Z", updatedAt: "2026-08-17T00:00:00.000Z",
    },
    artifacts: [], exposures: [],
  };
}

function apply(aggregate, plan) {
  return {
    caseRecord: {
      ...aggregate.caseRecord,
      state: plan.nextState,
      recordVersion: aggregate.caseRecord.recordVersion + 1,
      stateData: plan.stateData,
      updatedAt: plan.event.occurredAt,
    },
    artifacts: plan.artifact
      ? [...aggregate.artifacts, { ...plan.artifact, caseId: aggregate.caseRecord.caseId, userId: USER_ID }]
      : aggregate.artifacts,
    events: [...aggregate.events, { ...plan.event, caseId: aggregate.caseRecord.caseId, userId: USER_ID }],
  };
}

function initial(subject) {
  const planned = createGapClosureCase({ userId: USER_ID, aggregate: sourceAggregate(subject), occurredAt: "2026-08-17T00:00:00.000Z" });
  return {
    caseRecord: planned.caseRecord,
    artifacts: [],
    events: [{ ...planned.event, caseId: planned.caseRecord.caseId, userId: USER_ID }],
  };
}

function successfulStage(aggregate, prepareAt, submitAt) {
  const prepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: prepareAt }));
  const stage = prepared.caseRecord.stateData.activeAttempt.stage;
  const attemptOrdinal = prepared.caseRecord.stateData.activeAttempt.attemptOrdinal;
  return apply(prepared, planDurableEvidence({
    aggregate: prepared,
    commitment: expectedCommitmentForFixture(prepared.caseRecord.subject, stage, attemptOrdinal),
    body: "독립 답안 본문은 비공개 artifact에만 저장됩니다.",
    occurredAt: submitAt,
  }));
}

function learnerResponseForExpected(commitment) {
  if (commitment.kind === "PRACTICE_CALCULATION") {
    return {
      kind: commitment.kind,
      operator: commitment.operator,
      result: commitment.result,
      unit: commitment.unit,
      sign: commitment.sign,
      rounding: commitment.rounding,
    };
  }
  if (commitment.kind === "THEORY_PREDICATE") {
    return {
      kind: commitment.kind,
      predicateId: commitment.requiredPredicate,
      forbiddenPredicateAsserted: commitment.forbiddenPredicateAsserted,
      polarity: commitment.polarity,
    };
  }
  return {
    kind: commitment.kind,
    currentness: commitment.currentness,
    blockerCount: commitment.blockerCount,
  };
}

function assertPromptHidesExpectedProof(fixture) {
  const commitment = fixture.expectedCommitment;
  const forbiddenValues = [commitment.anchorId];
  if (commitment.kind === "PRACTICE_CALCULATION") {
    forbiddenValues.push(
      String(commitment.result),
      commitment.operator,
      commitment.unit,
      commitment.sign,
      commitment.rounding,
    );
  } else if (commitment.kind === "THEORY_PREDICATE") {
    forbiddenValues.push(
      commitment.targetScopeId,
      commitment.requiredPredicate,
      String(commitment.forbiddenPredicateAsserted),
      commitment.polarity,
    );
  } else {
    forbiddenValues.push(
      commitment.sourceId,
      commitment.sourceVersionId,
      commitment.lawAnchorId,
      commitment.lawAnchorVersionId,
      commitment.exactLocator,
      commitment.applicableAsOf,
      commitment.currentness,
      String(commitment.blockerCount),
    );
  }
  for (const value of forbiddenValues) {
    assert.equal(fixture.prompt.includes(value), false, `prompt disclosed expected value: ${value}`);
  }
}

test("WCV-C3 hides and binds a distinct typed proof for every subject and stage fixture", () => {
  for (const subject of ["appraisal_practical", "appraisal_theory", "appraisal_law"]) {
    const stages = ["D1", "D7", "TIMED", "RECURRENCE"];
    const commitments = stages.map((stage) => expectedCommitmentForFixture(subject, stage));
    assert.equal(new Set(commitments.map(JSON.stringify)).size, stages.length);
    stages.forEach((stage, index) => {
      const fixture = durableFixtureFor({ subject, stage, evaluatedAt: "2026-08-17T00:00:00.000Z" });
      assert.equal(durableCommitmentPasses(fixture, commitments[index]), true);
      assert.equal(durableCommitmentPasses(fixture, commitments[(index + 1) % commitments.length]), false);
      assertPromptHidesExpectedProof(fixture);
      if (stage !== "D1") {
        const retry = durableFixtureFor({
          subject,
          stage,
          evaluatedAt: "2026-08-17T00:00:00.000Z",
          attemptOrdinal: 2,
        });
        assert.notEqual(retry.itemId, fixture.itemId);
        assert.notEqual(retry.itemFamilyId, fixture.itemFamilyId);
        assertPromptHidesExpectedProof(retry);
        assert.equal(durableCommitmentPasses(retry, commitments[index]), false);
        assert.equal(
          durableCommitmentPasses(retry, expectedCommitmentForFixture(subject, stage, 2)),
          true,
        );
      }
    });
  }
});

test("WCV-C3 exposes answerable context while server-binding identities for every stage and retry", () => {
  for (const subject of ["appraisal_practical", "appraisal_theory", "appraisal_law"]) {
    for (const stage of ["D1", "D7", "TIMED", "RECURRENCE"]) {
      for (const attemptOrdinal of stage === "D1" ? [1] : [1, 2]) {
        const fixture = durableFixtureFor({
          subject,
          stage,
          attemptOrdinal,
          evaluatedAt: "2026-08-17T00:00:00.000Z",
        });
        const response = learnerResponseForExpected(fixture.expectedCommitment);
        const parsed = parseDurableLearnerResponse(response);
        const bound = bindDurableLearnerResponse(fixture, parsed);
        assert.equal(durableCommitmentPasses(fixture, bound), true);
        assert.doesNotMatch(JSON.stringify(fixture.inputContext), /"(?:expected|correct|answer|passes)"/i);
        assert.throws(
          () => parseDurableLearnerResponse({ ...response, anchorId: fixture.expectedCommitment.anchorId }),
          /invalid_input/,
        );

        if (fixture.inputContext.kind === "PRACTICE_CALCULATION") {
          assert.equal(fixture.inputContext.grossIncome, fixture.expectedCommitment.grossIncome);
          assert.equal(fixture.inputContext.operatingExpense, fixture.expectedCommitment.operatingExpense);
          assert.equal("result" in fixture.inputContext, false);
        } else if (fixture.inputContext.kind === "THEORY_PREDICATE") {
          assert.equal(fixture.inputContext.predicateOptions.length, 3);
          assert.equal(new Set(fixture.inputContext.predicateOptions.map((option) => option.id)).size, 3);
          assert.equal(
            fixture.inputContext.predicateOptions.filter(
              (option) => option.id === fixture.expectedCommitment.requiredPredicate,
            ).length,
            1,
          );
          const wrongOption = fixture.inputContext.predicateOptions.find(
            (option) => option.id !== fixture.expectedCommitment.requiredPredicate,
          );
          const wrongBound = bindDurableLearnerResponse(fixture, {
            ...parsed,
            predicateId: wrongOption.id,
          });
          assert.equal(durableCommitmentPasses(fixture, wrongBound), false);
        } else {
          assert.equal(fixture.inputContext.sourceVersionId, fixture.expectedCommitment.sourceVersionId);
          assert.equal(fixture.inputContext.exactLocator, fixture.expectedCommitment.exactLocator);
          assert.equal("currentness" in fixture.inputContext, false);
          assert.equal("blockerCount" in fixture.inputContext, false);
        }
      }
    }
  }
});

for (const subject of ["appraisal_practical", "appraisal_theory", "appraisal_law"]) {
  test(`WCV-C3 ${subject} requires D+1, D+7 and timed distinct-family evidence`, () => {
    let aggregate = initial(subject);
    aggregate = successfulStage(aggregate, "2026-08-18T00:00:01.000Z", "2026-08-18T00:02:01.000Z");
    assert.equal(aggregate.caseRecord.state, "D1_REPRODUCED");
    aggregate = successfulStage(aggregate, "2026-08-24T00:00:01.000Z", "2026-08-24T00:02:01.000Z");
    assert.equal(aggregate.caseRecord.state, "D7_TRANSFER_OBSERVED");
    aggregate = successfulStage(aggregate, "2026-08-24T00:03:00.000Z", "2026-08-24T00:18:00.000Z");
    assert.equal(aggregate.caseRecord.state, "TIMED_RECURRENCE_CONFIRMED");
    assert.equal(aggregate.events.at(-1).payload.timedAttempt.timeLimitSeconds, 1800);
    assert.equal(aggregate.events.at(-1).payload.timedAttempt.elapsedSeconds, 900);
    const clear = apply(aggregate, planCurrentlyClear({ aggregate, occurredAt: "2026-08-24T00:18:01.000Z" }));
    assert.equal(clear.caseRecord.state, "CURRENTLY_CLEAR");
    assert.equal(clear.caseRecord.stateData.recurringSignature.status, "CURRENTLY_CLEAR");
    assert.equal(new Set(clear.events.filter((event) => event.outcome === "SUCCESS").map((event) => event.itemFamilyId)).size, 3);
    assert.ok(clear.events.every((event) => event.payload.containsBody === false));
  });
}

test("WCV-C3 rejects an instant submission and preserves explicit typed failure", () => {
  const aggregate = initial("appraisal_practical");
  const prepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-18T00:00:01.000Z" }));
  assert.throws(() => planDurableEvidence({
    aggregate: prepared,
    commitment: expectedCommitmentForFixture("appraisal_practical", "D1"),
    body: "too fast",
    occurredAt: "2026-08-18T00:00:01.000Z",
  }), /not_eligible/);
  const wrong = { ...expectedCommitmentForFixture("appraisal_practical", "D1"), result: 99 };
  const failed = apply(prepared, planDurableEvidence({ aggregate: prepared, commitment: wrong, body: "wrong", occurredAt: "2026-08-18T00:02:01.000Z" }));
  assert.equal(failed.caseRecord.state, "REPAIR_VERIFIED_SAME_SESSION");
  assert.equal(failed.events.at(-1).eventType, "INDEPENDENT_FAILURE_RECORDED");
  assert.equal(failed.events.at(-1).outcome, "FAILURE");
});

test("WCV-C3 frozen D0 detects source record and fixture drift", () => {
  const source = sourceAggregate("appraisal_law");
  const planned = createGapClosureCase({ userId: USER_ID, aggregate: source, occurredAt: "2026-08-17T00:00:00.000Z" });
  assert.equal(frozenD0MatchesCurrent(planned.caseRecord.stateData.frozenD0, source), true);
  assert.equal(frozenD0MatchesCurrent(planned.caseRecord.stateData.frozenD0, {
    ...source,
    session: { ...source.session, recordVersion: source.session.recordVersion + 1 },
  }), false);
  assert.equal(frozenD0MatchesCurrent(planned.caseRecord.stateData.frozenD0, {
    ...source,
    session: { ...source.session, bindings: { ...source.session.bindings, fixtureVersion: "drifted.fixture@2" } },
  }), false);
  assert.equal(frozenD0MatchesCurrent({
    ...planned.caseRecord.stateData.frozenD0,
    contentReleaseVersion: "dabangil.wcv_c3.rights_safe_transfer_fixtures.older",
  }, source), false);
  assert.equal(frozenD0MatchesCurrent({
    ...planned.caseRecord.stateData.frozenD0,
    digest: `sha256:${"0".repeat(64)}`,
  }, source), false);
});

test("WCV-C3 rejects a same-surface or pre-exposed transfer assignment and preserves timeout", () => {
  let aggregate = initial("appraisal_practical");
  aggregate = successfulStage(aggregate, "2026-08-18T00:00:01.000Z", "2026-08-18T00:02:01.000Z");
  const prepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-24T00:00:01.000Z" }));
  const sameSurface = {
    ...prepared,
    caseRecord: {
      ...prepared.caseRecord,
      stateData: {
        ...prepared.caseRecord.stateData,
        activeAttempt: {
          ...prepared.caseRecord.stateData.activeAttempt,
          assignment: {
            ...prepared.caseRecord.stateData.activeAttempt.assignment,
            transferDistance: "SAME_SURFACE",
          },
        },
      },
    },
  };
  assert.throws(() => planDurableEvidence({ aggregate: sameSurface, commitment: expectedCommitmentForFixture("appraisal_practical", "D7"), body: "same surface", occurredAt: "2026-08-24T00:02:01.000Z" }), /stale_configuration/);
  const exposed = {
    ...prepared,
    caseRecord: {
      ...prepared.caseRecord,
      stateData: {
        ...prepared.caseRecord.stateData,
        activeAttempt: {
          ...prepared.caseRecord.stateData.activeAttempt,
          prePresentation: { ...prepared.caseRecord.stateData.activeAttempt.prePresentation, unseen: false },
        },
      },
    },
  };
  assert.throws(() => planDurableEvidence({ aggregate: exposed, commitment: expectedCommitmentForFixture("appraisal_practical", "D7"), body: "pre-exposed", occurredAt: "2026-08-24T00:02:01.000Z" }), /stale_configuration/);

  aggregate = successfulStage(aggregate, "2026-08-24T00:00:01.000Z", "2026-08-24T00:02:01.000Z");
  const timed = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-24T00:03:00.000Z" }));
  const timeout = apply(timed, planDurableEvidence({ aggregate: timed, commitment: expectedCommitmentForFixture("appraisal_practical", "TIMED"), body: "late timed response", occurredAt: "2026-08-24T00:33:01.000Z" }));
  assert.equal(timeout.caseRecord.state, "D7_TRANSFER_OBSERVED");
  assert.equal(timeout.events.at(-1).outcome, "TIMEOUT");
  assert.equal(timeout.events.at(-1).payload.timedAttempt.late, true);
});

test("WCV-C3 gives a failed D+7 attempt a fresh deterministic unseen retry", () => {
  let aggregate = initial("appraisal_practical");
  aggregate = successfulStage(aggregate, "2026-08-18T00:00:01.000Z", "2026-08-18T00:02:01.000Z");
  const firstPrepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-24T00:00:01.000Z" }));
  const firstAttempt = firstPrepared.caseRecord.stateData.activeAttempt;
  const wrong = { ...expectedCommitmentForFixture("appraisal_practical", "D7"), result: 1 };
  aggregate = apply(firstPrepared, planDurableEvidence({
    aggregate: firstPrepared,
    commitment: wrong,
    body: "first D+7 attempt fails",
    occurredAt: "2026-08-24T00:02:01.000Z",
  }));
  assert.equal(aggregate.caseRecord.state, "D1_REPRODUCED");

  const retryPrepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-24T00:03:01.000Z" }));
  const retryAttempt = retryPrepared.caseRecord.stateData.activeAttempt;
  const retryFixture = durableFixtureFor({
    subject: "appraisal_practical",
    stage: "D7",
    evaluatedAt: "2026-08-24T00:03:01.000Z",
    attemptOrdinal: 2,
  });
  assert.equal(retryAttempt.attemptOrdinal, 2);
  assert.notEqual(retryAttempt.assignment.itemId, firstAttempt.assignment.itemId);
  assert.notEqual(retryAttempt.assignment.itemFamilyId, firstAttempt.assignment.itemFamilyId);
  assert.equal(retryAttempt.prePresentation.unseen, true);
  assert.equal(
    durableCommitmentPasses(retryFixture, expectedCommitmentForFixture("appraisal_practical", "D7")),
    false,
  );
  aggregate = apply(retryPrepared, planDurableEvidence({
    aggregate: retryPrepared,
    commitment: expectedCommitmentForFixture("appraisal_practical", "D7", 2),
    body: "fresh D+7 retry succeeds",
    occurredAt: "2026-08-24T00:05:01.000Z",
  }));
  assert.equal(aggregate.caseRecord.state, "D7_TRANSFER_OBSERVED");
});

test("WCV-C3 gives a timed-out attempt a fresh deterministic timed retry", () => {
  let aggregate = initial("appraisal_theory");
  aggregate = successfulStage(aggregate, "2026-08-18T00:00:01.000Z", "2026-08-18T00:02:01.000Z");
  aggregate = successfulStage(aggregate, "2026-08-24T00:00:01.000Z", "2026-08-24T00:02:01.000Z");
  const firstPrepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-24T00:03:00.000Z" }));
  const firstAttempt = firstPrepared.caseRecord.stateData.activeAttempt;
  aggregate = apply(firstPrepared, planDurableEvidence({
    aggregate: firstPrepared,
    commitment: expectedCommitmentForFixture("appraisal_theory", "TIMED"),
    body: "late timed response",
    occurredAt: "2026-08-24T00:33:01.000Z",
  }));
  assert.equal(aggregate.caseRecord.state, "D7_TRANSFER_OBSERVED");

  const retryPrepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-24T00:34:00.000Z" }));
  const retryAttempt = retryPrepared.caseRecord.stateData.activeAttempt;
  assert.equal(retryAttempt.attemptOrdinal, 2);
  assert.notEqual(retryAttempt.assignment.itemId, firstAttempt.assignment.itemId);
  assert.notEqual(retryAttempt.assignment.itemFamilyId, firstAttempt.assignment.itemFamilyId);
  assert.equal(retryAttempt.prePresentation.unseen, true);
  aggregate = apply(retryPrepared, planDurableEvidence({
    aggregate: retryPrepared,
    commitment: expectedCommitmentForFixture("appraisal_theory", "TIMED", 2),
    body: "fresh timed retry succeeds",
    occurredAt: "2026-08-24T00:49:00.000Z",
  }));
  assert.equal(aggregate.caseRecord.state, "TIMED_RECURRENCE_CONFIRMED");
  assert.equal(aggregate.events.at(-1).payload.timedAttempt.elapsedSeconds, 900);
  assert.equal(aggregate.events.at(-1).payload.timedAttempt.late, false);
});

test("WCV-C3 later qualifying independent failure reopens currently-clear evidence", () => {
  let aggregate = initial("appraisal_theory");
  aggregate = successfulStage(aggregate, "2026-08-18T00:00:01.000Z", "2026-08-18T00:02:01.000Z");
  aggregate = successfulStage(aggregate, "2026-08-24T00:00:01.000Z", "2026-08-24T00:02:01.000Z");
  aggregate = successfulStage(aggregate, "2026-08-24T00:03:00.000Z", "2026-08-24T00:18:00.000Z");
  aggregate = apply(aggregate, planCurrentlyClear({ aggregate, occurredAt: "2026-08-24T00:18:01.000Z" }));
  const prepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-31T00:18:02.000Z" }));
  const wrong = { ...expectedCommitmentForFixture("appraisal_theory", "RECURRENCE"), polarity: "NEGATIVE" };
  aggregate = apply(prepared, planDurableEvidence({ aggregate: prepared, commitment: wrong, body: "later independent failure", occurredAt: "2026-08-31T00:20:02.000Z" }));
  assert.equal(aggregate.caseRecord.state, "REOPENED");
  assert.equal(aggregate.caseRecord.stateData.recurringSignature.status, "RECURRED");
  assert.equal(aggregate.events.at(-1).payload.reopenEvent.reason, "later_qualifying_independent_failure");
});

test("WCV-C3 records a successful untimed follow-up as recurrence evidence", () => {
  let aggregate = initial("appraisal_practical");
  aggregate = successfulStage(aggregate, "2026-08-18T00:00:01.000Z", "2026-08-18T00:02:01.000Z");
  aggregate = successfulStage(aggregate, "2026-08-24T00:00:01.000Z", "2026-08-24T00:02:01.000Z");
  aggregate = successfulStage(aggregate, "2026-08-24T00:03:00.000Z", "2026-08-24T00:18:00.000Z");
  aggregate = apply(aggregate, planCurrentlyClear({ aggregate, occurredAt: "2026-08-24T00:18:01.000Z" }));
  const prepared = apply(aggregate, planAttemptPreparation({ aggregate, occurredAt: "2026-08-31T00:18:02.000Z" }));
  aggregate = apply(prepared, planDurableEvidence({
    aggregate: prepared,
    commitment: expectedCommitmentForFixture("appraisal_practical", "RECURRENCE"),
    body: "후속 독립 재확인",
    occurredAt: "2026-08-31T00:20:02.000Z",
  }));
  assert.equal(aggregate.caseRecord.state, "CURRENTLY_CLEAR");
  assert.equal(aggregate.events.at(-1).eventType, "RECURRENCE_RECONFIRMED");
  assert.equal(aggregate.events.at(-1).payload.timedAttempt, null);
  assert.equal(aggregate.events.at(-1).payload.recurrenceOutcome.timed, false);
  assert.equal(aggregate.events.at(-1).payload.recurrenceOutcome.confirmed, true);
});

test("WCV-C3 deterministic planner is bounded, non-overlapping and never mutates evidence state", () => {
  const aggregate = initial("appraisal_law");
  for (const availableMinutes of [30, 60, 90, 180, 600, 720]) {
    const fixed = availableMinutes >= 60 ? [{ commitmentId: crypto.randomUUID(), label: "LECTURE", minutes: 30 }] : [];
    const plan = buildDeterministicFullDayPlan({ aggregate, availableMinutes, recoveryMode: availableMinutes === 30 ? "MINIMUM_MAINTENANCE" : "NORMAL", fixedCommitments: fixed, occurredAt: "2026-08-17T01:00:00.000Z" });
    assert.ok(plan.coreOutcomes.length <= 3);
    assert.equal(plan.fixedCommitments.length, fixed.length);
    assert.ok(plan.executionBlocks.every((block) => block.startMinute >= 0 && block.endMinute <= availableMinutes && block.startMinute < block.endMinute));
    for (let i = 1; i < plan.executionBlocks.length; i += 1) assert.ok(plan.executionBlocks[i - 1].endMinute <= plan.executionBlocks[i].startMinute);
  }
  const proposed = { ...aggregate, caseRecord: { ...aggregate.caseRecord, stateData: { ...aggregate.caseRecord.stateData, latestPlan: buildDeterministicFullDayPlan({ aggregate, availableMinutes: 180, recoveryMode: "NORMAL", fixedCommitments: [], occurredAt: "2026-08-17T01:00:00.000Z" }) } } };
  const decision = planFullDayDecision({ aggregate: proposed, decision: "REJECTED", reason: "deferred_by_learner", occurredAt: "2026-08-17T01:01:00.000Z" });
  assert.equal(decision.nextState, aggregate.caseRecord.state);
  assert.match(decision.stateData.resultReasonCodes[0], /without_mastery_change/);
  const edited = planFullDayDecision({
    aggregate: proposed,
    decision: "EDITED",
    reason: "available_minutes_changed",
    replacement: {
      availableMinutes: 90,
      recoveryMode: "MINIMUM_MAINTENANCE",
      fixedCommitments: [{ commitmentId: crypto.randomUUID(), label: "MANUAL_COMMITMENT", minutes: 30 }],
    },
    occurredAt: "2026-08-17T01:02:00.000Z",
  });
  assert.equal(edited.stateData.latestPlan.availableMinutes, 90);
  assert.equal(edited.stateData.latestPlan.fixedCommitments[0].minutes, 30);
  assert.equal(edited.stateData.latestPlan.decision, "EDITED");
  assert.notEqual(edited.stateData.latestPlan.planId, proposed.caseRecord.stateData.latestPlan.planId);
  assert.equal(edited.event.payload.replacementApplied, true);
  assert.throws(() => planFullDayDecision({ aggregate: proposed, decision: "EDITED", reason: "available_minutes_changed", occurredAt: "2026-08-17T01:03:00.000Z" }), /invalid_input/);
});

test("WCV-C3 planning substitutes an eligible audit until the exact attempt boundary", () => {
  const aggregate = initial("appraisal_practical");
  const waiting = buildDeterministicFullDayPlan({
    aggregate,
    availableMinutes: 60,
    recoveryMode: "NORMAL",
    fixedCommitments: [],
    occurredAt: "2026-08-17T12:00:00.000Z",
  });
  assert.deepEqual(waiting.coreOutcomes.map((outcome) => outcome.kind), ["EVIDENCE_AUDIT"]);
  assert.equal(waiting.coreOutcomes[0].reasonCode, "wcv_c3_waiting_evidence_audit");
  assert.deepEqual(waiting.deferredReasonCodes, ["next_eligible_at_not_reached"]);
  assert.equal(waiting.immediatePrimaryOutcomeId, waiting.coreOutcomes[0].outcomeId);
  assert.equal(isBeforeDurableEligibility("2026-08-18T00:00:00.000Z", aggregate.caseRecord.stateData.nextEligibleAt), false);
  const exactBoundary = buildDeterministicFullDayPlan({
    aggregate,
    availableMinutes: 60,
    recoveryMode: "NORMAL",
    fixedCommitments: [],
    occurredAt: aggregate.caseRecord.stateData.nextEligibleAt,
  });
  assert.deepEqual(exactBoundary.coreOutcomes.map((outcome) => outcome.kind), ["D1_REPRODUCTION"]);
  assert.deepEqual(exactBoundary.deferredReasonCodes, []);
});
