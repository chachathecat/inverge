import assert from "node:assert/strict";
import test from "node:test";

import {
  TRUSTED_REPAIR_CONTRACT_VERSION,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_POLICY_VERSION,
  TRUSTED_REPAIR_RUBRIC_VERSION,
  TRUSTED_REPAIR_LOAD_BUDGET,
  TRUSTED_REPAIR_STEP_GUIDANCE,
  TRUSTED_REPAIR_VALIDATOR_VERSION,
  TrustedRepairContractError,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  SYNTHETIC_SOURCE_BINDING,
  diagnoseTrustedRepairAttempt,
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
  trustedRepairPartialRetryAvailable,
  trustedRepairSubmissionCount,
  trustedRepairSourceBindingMatches,
  trustedRepairSourceVersion,
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from "../lib/review-os/trusted-repair-fixtures.ts";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
let idCounter = 10;
const nextId = () => `30000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;

function aggregateFor(
  subject,
  inputMode = "TYPED_TEXT",
  sourceBinding = subject === "appraisal_compensation_law"
    ? BLOCKED_LAW
    : SYNTHETIC_SOURCE_BINDING,
) {
  const fixture = trustedRepairCanonicalFixture(subject);
  return {
    session: {
      sessionId: SESSION_ID,
      userId: USER_ID,
      fixtureId: fixture.fixtureId,
      subject,
      state: "editable_capture_draft",
      recordVersion: 1,
      confirmedRevisionId: null,
      primaryGapId: null,
      outcome: null,
      assistanceLevel: 0,
      independentAttemptBeforeHelp: false,
      bindings: {
        contractVersion: TRUSTED_REPAIR_CONTRACT_VERSION,
        fixtureVersion: TRUSTED_REPAIR_FIXTURE_VERSION,
        sourceVersion: trustedRepairSourceVersion(fixture, sourceBinding),
        rubricVersion: TRUSTED_REPAIR_RUBRIC_VERSION,
        policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
        validatorVersion: TRUSTED_REPAIR_VALIDATOR_VERSION,
      },
      stateData: initialTrustedRepairStateData(inputMode),
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
    artifacts: [
      {
        artifactId: nextId(), sessionId: SESSION_ID, userId: USER_ID,
        revisionNumber: 0, kind: "capture_draft", inputMode,
        body: fixture.editableDrafts[inputMode], createdAt: "2026-08-12T00:00:00.000Z",
      },
    ],
    exposures: [],
  };
}

function apply(aggregate, plan) {
  return {
    session: {
      ...aggregate.session,
      state: plan.nextState,
      recordVersion: aggregate.session.recordVersion + 1,
      confirmedRevisionId: plan.confirmedRevisionId,
      primaryGapId: plan.primaryGapId,
      outcome: plan.outcome,
      assistanceLevel: plan.assistanceLevel,
      independentAttemptBeforeHelp: plan.independentAttemptBeforeHelp,
      stateData: plan.stateData,
    },
    artifacts: plan.artifact
      ? [...aggregate.artifacts, { ...plan.artifact, sessionId: SESSION_ID, userId: USER_ID }]
      : aggregate.artifacts,
    exposures: plan.exposure
      ? [...aggregate.exposures, { ...plan.exposure, sessionId: SESSION_ID, userId: USER_ID }]
      : aggregate.exposures,
  };
}

const REPAIRS = {
  appraisal_practical: "면적 100m²와 단가 2000000원을 곱해 200000000원을 얻는다. 원 단위 양수 부호이며 백분율이 아니고 반올림 없음으로 쓴 뒤 나누어 검산한다.",
  appraisal_theory: "최유효이용은 합리적이고 가능한 이용이다. 법적·물리적·경제적 가능성을 사례와 반대 사실에 적용해 결론을 낸다.",
  appraisal_compensation_law: "공식 출처의 유효 버전을 검증하고 사실을 요건에 포섭한다. 출처 충돌이면 결론을 보류하고 검증한다.",
};

const BLOCKED_LAW = {
  bindingVersion: "2026-06-26.s208.v1:2026-06-26T00:00:00.000Z",
  sourceStatus: "needs_official_verification",
  versionStatus: "needs_official_verification",
  currentLawStatus: "current_law_unresolved",
  sourceAnchorId: "law-anchor-land-compensation-act-current-candidate",
  blockerCount: 2,
};

test("numeric anchors compare complete values without substring collisions", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const stateData = {
    ...initialTrustedRepairStateData("TYPED_TEXT"),
    predictionConfidence: "medium",
  };
  const commaFormatted = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "면적 100m²와 단가 2,000,000원을 곱해 200,000,000원을 얻는다. 원 단위 양수 부호이며 반올림 없음으로 쓰고 나누어 검산한다.",
    stateData,
  });
  assert.equal(commaFormatted.repairNeed, "optional");
  assert.equal(
    commaFormatted.candidates[0].gapId,
    "gap-practice-input-role-verification",
  );

  const wrongIntermediate = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "면적 100m²와 단가 2,000,000원을 곱해 20,000,000원을 얻는다. 원 단위 양수 부호이며 반올림 없음으로 쓰고 나누어 검산한다.",
    stateData,
  });
  assert.equal(wrongIntermediate.repairNeed, "required");
  assert.ok(
    wrongIntermediate.candidates.some((candidate) =>
      candidate.supportingEvidence.includes(
        "independent_attempt:practice-intermediate-calculation:false_claim:20000000",
      ),
    ),
  );
});

test("semantic anchors require scoped positive assertions and reject negated concepts", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_theory");
  const stateData = {
    ...initialTrustedRepairStateData("TYPED_TEXT"),
    predictionConfidence: "medium",
  };
  for (const attemptText of [
    "최유효이용은 합리적이지 않고 가능하지 않다",
    "최유효이용은 비합리적이며 불가능하다",
    "최유효이용은 합리적이지만 가능하지 않다",
    "최유효이용은 합리적이지만 가능은 하지 않다",
    "최유효이용이 합리적인지 불확실하고 가능한지 의문이다",
  ]) {
    const diagnosis = diagnoseTrustedRepairAttempt({ fixture, attemptText, stateData });
    assert.ok(
      diagnosis.candidates.some(
        (candidate) => candidate.anchorId === "theory-exact-definition",
      ),
      attemptText,
    );
  }

  for (const attemptText of [
    "최유효이용은 합리적이고 가능한 이용이다",
    "거절된 대안은 불가능하다. 최유효이용은 합리적이고 가능한 이용이다",
  ]) {
    const diagnosis = diagnoseTrustedRepairAttempt({ fixture, attemptText, stateData });
    assert.equal(
      diagnosis.candidates.some(
        (candidate) => candidate.anchorId === "theory-exact-definition",
      ),
      false,
      attemptText,
    );
  }
});

for (const subject of ["appraisal_practical", "appraisal_theory", "appraisal_compensation_law"]) {
  test(`${subject} completes the ordered trusted-repair journey without pre-help leakage`, () => {
    const fixture = trustedRepairCanonicalFixture(subject);
    const sourceBinding = subject === "appraisal_compensation_law" ? BLOCKED_LAW : SYNTHETIC_SOURCE_BINDING;
    let aggregate = aggregateFor(subject);
    aggregate = apply(aggregate, planTrustedRepairRevisionConfirmation({ aggregate, artifactId: nextId(), body: "확정 수정본", occurredAt: "2026-08-12T00:01:00.000Z" }));
    aggregate = apply(aggregate, planTrustedRepairPrediction({ aggregate, prediction: "likely_partial", confidence: "medium" }));
    assert.equal(aggregate.exposures.length, 0);
    aggregate = apply(aggregate, planTrustedRepairIndependentAttempt({ aggregate, artifactId: nextId(), body: "독립적으로 적은 근거가 있지만 핵심 기준 일부는 아직 빠져 있다.", occurredAt: "2026-08-12T00:02:00.000Z" }));
    assert.equal(aggregate.session.independentAttemptBeforeHelp, true);
    assert.equal(aggregate.exposures.length, 0);
    aggregate = apply(aggregate, planTrustedRepairSelfDiagnosis({ aggregate, selfDiagnosisCode: "missing_core_reason" }));
    aggregate = apply(aggregate, planTrustedRepairDiagnosis({ aggregate, fixture, sourceBinding }));
    assert.ok(aggregate.session.stateData.gapCandidates.length >= 1);
    assert.ok(aggregate.session.stateData.gapCandidates.length <= 3);
    assert.equal(aggregate.session.stateData.gapCandidates[0].rank, 1);
    assert.equal(aggregate.session.primaryGapId, aggregate.session.stateData.gapCandidates[0].gapId);
    if (subject === "appraisal_compensation_law") {
      assert.equal(aggregate.session.stateData.repairNeed, "blocked");
      assert.ok(aggregate.session.stateData.resultReasonCodes.includes("law_source_currentness_unverified"));
    }
    aggregate = apply(aggregate, planTrustedRepairExposure({ aggregate, exposureId: nextId(), occurredAt: "2026-08-12T00:03:00.000Z" }));
    assert.equal(aggregate.exposures.length, 1);
    assert.equal(aggregate.exposures[0].scaffoldKind, "smallest_eligible_scaffold");
    aggregate = apply(aggregate, planTrustedRepairSubmission({ aggregate, fixture, sourceBinding, artifactId: nextId(), body: REPAIRS[subject], occurredAt: "2026-08-12T00:04:00.000Z" }));
    aggregate = apply(aggregate, planTrustedRepairContinuation({ aggregate, fixture, sourceBinding, continuation: "VERIFY_AND_CONTINUE", exposureId: nextId(), occurredAt: "2026-08-12T00:05:00.000Z" }));
    assert.equal(aggregate.session.outcome, subject === "appraisal_compensation_law" ? "blocked" : "verified");
    assert.ok(aggregate.session.stateData.resultReasonCodes.includes("no_mastery_transfer_stability_score_or_pass_claim"));
  });
}

test("all six bounded repair paths and all three continuation commands are reachable", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const cases = [
    ["TYPED_TEXT", "high", false, "QUICK_VERIFICATION"],
    ["TYPED_TEXT", "medium", false, "LEARNER_GENERATED"],
    ["EDITABLE_PHOTO_OCR", "medium", false, "UPLOAD_EXISTING_ARTIFACT"],
    ["EDITABLE_PDF_OCR", "medium", false, "UPLOAD_EXISTING_ARTIFACT"],
    ["EDITABLE_VOICE_TRANSCRIPTION", "medium", false, "VOICE_TEACH_BACK"],
    ["STRUCTURED_SELECTION", "medium", false, "STRUCTURED_SELECTION"],
    ["TYPED_TEXT", "low", true, "WORKED_CONCEPT_FIRST"],
  ];
  for (const [inputMode, confidence, insufficient, expected] of cases) {
    const stateData = { ...initialTrustedRepairStateData(inputMode), predictionConfidence: confidence };
    const result = diagnoseTrustedRepairAttempt({ fixture, attemptText: insufficient ? "짧음" : "면적 100 단가 2000000 결과 200000000 m² 원 검산", stateData });
    assert.equal(result.repairPath, expected);
  }

  let diagnosed = aggregateFor("appraisal_practical");
  diagnosed.session = {
    ...diagnosed.session,
    state: "diagnosed",
    confirmedRevisionId: nextId(),
    primaryGapId: "gap-practice-input-role",
    stateData: {
      ...diagnosed.session.stateData,
      gapCandidates: [{
        gapId: "gap-practice-input-role", anchorId: "practice-input-role", labelKo: "자료 역할", rank: 1,
        supportingEvidence: ["missing"], counterEvidence: [], repairActionKo: "다시 구성", successCriterionKo: "기준",
      }],
    },
  };
  for (const continuation of ["DEFER_FOR_NOW", "SWITCH_TO_GUIDED"]) {
    const plan = planTrustedRepairContinuation({ aggregate: diagnosed, fixture, sourceBinding: SYNTHETIC_SOURCE_BINDING, continuation, exposureId: nextId(), occurredAt: "2026-08-12T00:00:00.000Z" });
    assert.equal(plan.outcome, continuation === "DEFER_FOR_NOW" ? "deferred" : "guided");
  }
});

test("Law source-binding drift after repair submission fails closed without rebinding or verified release", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_compensation_law");
  const changedBinding = {
    ...BLOCKED_LAW,
    bindingVersion: `${BLOCKED_LAW.bindingVersion}:changed`,
  };
  let aggregate = aggregateFor(
    "appraisal_compensation_law",
    "TYPED_TEXT",
    BLOCKED_LAW,
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairRevisionConfirmation({
      aggregate,
      artifactId: nextId(),
      body: "확정 수정본",
      occurredAt: "2026-08-12T01:00:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairPrediction({
      aggregate,
      prediction: "likely_blocked",
      confidence: "medium",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairIndependentAttempt({
      aggregate,
      artifactId: nextId(),
      body: "공식 출처의 유효 버전을 먼저 확인하고 사실을 요건에 포섭한다.",
      occurredAt: "2026-08-12T01:01:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSelfDiagnosis({
      aggregate,
      selfDiagnosisCode: "source_currentness_uncertain",
    }),
  );
  const diagnosisDrift = planTrustedRepairDiagnosis({
    aggregate,
    fixture,
    sourceBinding: changedBinding,
  });
  assert.equal(diagnosisDrift.nextState, "blocked");
  assert.equal(diagnosisDrift.outcome, "blocked");
  assert.equal(diagnosisDrift.primaryGapId, null);
  assert.deepEqual(diagnosisDrift.stateData.gapCandidates, []);
  aggregate = apply(
    aggregate,
    planTrustedRepairDiagnosis({
      aggregate,
      fixture,
      sourceBinding: BLOCKED_LAW,
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairExposure({
      aggregate,
      exposureId: nextId(),
      occurredAt: "2026-08-12T01:02:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture,
      sourceBinding: BLOCKED_LAW,
      artifactId: nextId(),
      body: REPAIRS.appraisal_compensation_law,
      occurredAt: "2026-08-12T01:03:00.000Z",
    }),
  );
  assert.equal(aggregate.session.state, "repair_submitted");
  const persistedSourceVersion = aggregate.session.bindings.sourceVersion;
  assert.equal(
    trustedRepairSourceBindingMatches({
      aggregate,
      fixture,
      sourceBinding: changedBinding,
    }),
    false,
  );

  const driftPlan = planTrustedRepairContinuation({
    aggregate,
    fixture,
    sourceBinding: changedBinding,
    continuation: "VERIFY_AND_CONTINUE",
    exposureId: nextId(),
    occurredAt: "2026-08-12T01:04:00.000Z",
  });
  const blocked = apply(aggregate, driftPlan);
  assert.equal(blocked.session.state, "blocked");
  assert.equal(blocked.session.outcome, "blocked");
  assert.equal(blocked.session.bindings.sourceVersion, persistedSourceVersion);
  assert.equal(blocked.session.primaryGapId, null);
  assert.equal(blocked.session.assistanceLevel, 0);
  assert.equal(blocked.session.independentAttemptBeforeHelp, false);
  assert.deepEqual(blocked.session.stateData.gapCandidates, []);
  assert.deepEqual(blocked.session.stateData.resultReasonCodes, [
    "source_binding_version_drift",
    "verified_release_denied_until_new_session_diagnosis",
  ]);
  assert.equal(driftPlan.exposure, null);
  assert.equal(driftPlan.artifact, null);

  const previouslyVerified = {
    ...aggregate,
    session: {
      ...aggregate.session,
      state: "verified",
      outcome: "verified",
    },
  };
  const release = trustedRepairAggregateForRelease({
    aggregate: previouslyVerified,
    fixture,
    sourceBinding: changedBinding,
  });
  assert.equal(release.session.state, "blocked");
  assert.equal(release.session.outcome, "blocked");
  assert.equal(release.session.bindings.sourceVersion, persistedSourceVersion);
  assert.equal(release.exposures.length, 0);
  assert.deepEqual(release.session.stateData.gapCandidates, []);
});

test("guided continuation selects its committed level-3 exposure immediately and after oldest-first reload", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  let aggregate = aggregateFor("appraisal_practical");
  aggregate = {
    ...aggregate,
    session: {
      ...aggregate.session,
      state: "diagnosed",
      confirmedRevisionId: nextId(),
      primaryGapId: "gap-practice-input-role",
      stateData: {
        ...aggregate.session.stateData,
        gapCandidates: [{
          gapId: "gap-practice-input-role",
          anchorId: "practice-input-role",
          labelKo: "자료 역할",
          rank: 1,
          supportingEvidence: ["missing"],
          counterEvidence: [],
          repairActionKo: "다시 구성",
          successCriterionKo: "기준",
        }],
      },
    },
  };
  aggregate = apply(
    aggregate,
    planTrustedRepairExposure({
      aggregate,
      exposureId: nextId(),
      occurredAt: "2026-08-12T02:00:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      artifactId: nextId(),
      body: REPAIRS.appraisal_practical,
      occurredAt: "2026-08-12T02:01:00.000Z",
    }),
  );
  const guidedExposureId = nextId();
  aggregate = apply(
    aggregate,
    planTrustedRepairContinuation({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      continuation: "SWITCH_TO_GUIDED",
      exposureId: guidedExposureId,
      occurredAt: "2026-08-12T02:02:00.000Z",
    }),
  );
  assert.equal(aggregate.exposures.length, 2);
  const immediate = selectTrustedRepairScaffoldExposure(aggregate);
  assert.deepEqual(
    {
      exposureId: immediate?.exposureId,
      assistanceLevel: immediate?.assistanceLevel,
      scaffoldKind: immediate?.scaffoldKind,
    },
    {
      exposureId: guidedExposureId,
      assistanceLevel: 3,
      scaffoldKind: "guided_solution",
    },
  );

  const oldestFirstReload = structuredClone({
    ...aggregate,
    exposures: [...aggregate.exposures].sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt),
    ),
  });
  const reloaded = selectTrustedRepairScaffoldExposure(oldestFirstReload);
  assert.deepEqual(reloaded, immediate);
});

test("partial permits one durable append-only retry, verifies the latest repair, and then closes the retry gate", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_theory");
  const sourceBinding = SYNTHETIC_SOURCE_BINDING;
  let aggregate = aggregateFor("appraisal_theory");
  aggregate = apply(
    aggregate,
    planTrustedRepairRevisionConfirmation({
      aggregate,
      artifactId: nextId(),
      body: "확정 수정본",
      occurredAt: "2026-08-12T03:00:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairPrediction({
      aggregate,
      prediction: "likely_partial",
      confidence: "medium",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairIndependentAttempt({
      aggregate,
      artifactId: nextId(),
      body: "법적·물리적·경제적 가능성을 사례와 반대 사실에 적용해 결론을 낸다.",
      occurredAt: "2026-08-12T03:01:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSelfDiagnosis({
      aggregate,
      selfDiagnosisCode: "missing_definition",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairDiagnosis({ aggregate, fixture, sourceBinding }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairExposure({
      aggregate,
      exposureId: nextId(),
      occurredAt: "2026-08-12T03:02:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture,
      sourceBinding,
      artifactId: nextId(),
      body: "최유효이용은 합리적이지 않고 가능하지 않다",
      occurredAt: "2026-08-12T03:03:00.000Z",
    }),
  );
  const firstPartial = apply(
    aggregate,
    planTrustedRepairContinuation({
      aggregate,
      fixture,
      sourceBinding,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-12T03:04:00.000Z",
    }),
  );
  const durableIdentity = {
    sessionId: firstPartial.session.sessionId,
    confirmedRevisionId: firstPartial.session.confirmedRevisionId,
    revisionNumber: firstPartial.session.stateData.revisionNumber,
    primaryGapId: firstPartial.session.primaryGapId,
  };
  assert.equal(firstPartial.session.state, "partial");
  assert.equal(trustedRepairSubmissionCount(firstPartial), 1);
  assert.equal(trustedRepairPartialRetryAvailable(firstPartial), true);

  const retrySubmitted = apply(
    firstPartial,
    planTrustedRepairSubmission({
      aggregate: firstPartial,
      fixture,
      sourceBinding,
      artifactId: nextId(),
      body: "최유효이용은 합리적이고 가능한 이용이다",
      occurredAt: "2026-08-12T03:05:00.000Z",
    }),
  );
  assert.equal(retrySubmitted.session.state, "repair_submitted");
  assert.equal(trustedRepairSubmissionCount(retrySubmitted), 2);
  assert.deepEqual(
    retrySubmitted.artifacts
      .filter((artifact) => artifact.kind === "repair_submission")
      .map((artifact) => artifact.body),
    [
      "최유효이용은 합리적이지 않고 가능하지 않다",
      "최유효이용은 합리적이고 가능한 이용이다",
    ],
  );
  assert.deepEqual(
    {
      sessionId: retrySubmitted.session.sessionId,
      confirmedRevisionId: retrySubmitted.session.confirmedRevisionId,
      revisionNumber: retrySubmitted.session.stateData.revisionNumber,
      primaryGapId: retrySubmitted.session.primaryGapId,
    },
    durableIdentity,
  );
  const verified = apply(
    retrySubmitted,
    planTrustedRepairContinuation({
      aggregate: retrySubmitted,
      fixture,
      sourceBinding,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-12T03:06:00.000Z",
    }),
  );
  assert.equal(verified.session.state, "verified");
  assert.equal(verified.session.outcome, "verified");
  assert.equal(trustedRepairPartialRetryAvailable(verified), false);

  const secondRetrySubmitted = apply(
    firstPartial,
    planTrustedRepairSubmission({
      aggregate: firstPartial,
      fixture,
      sourceBinding,
      artifactId: nextId(),
      body: "최유효이용은 비합리적이며 불가능하다",
      occurredAt: "2026-08-12T03:07:00.000Z",
    }),
  );
  const secondPartial = apply(
    secondRetrySubmitted,
    planTrustedRepairContinuation({
      aggregate: secondRetrySubmitted,
      fixture,
      sourceBinding,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-12T03:08:00.000Z",
    }),
  );
  assert.equal(secondPartial.session.state, "partial");
  assert.equal(trustedRepairSubmissionCount(secondPartial), 2);
  assert.equal(trustedRepairPartialRetryAvailable(secondPartial), false);
  assert.throws(
    () =>
      planTrustedRepairSubmission({
        aggregate: secondPartial,
        fixture,
        sourceBinding,
        artifactId: nextId(),
        body: REPAIRS.appraisal_theory,
        occurredAt: "2026-08-12T03:09:00.000Z",
      }),
    (error) =>
      error instanceof TrustedRepairContractError &&
      error.code === "invalid_transition",
  );
  for (const continuation of ["DEFER_FOR_NOW", "SWITCH_TO_GUIDED"]) {
    const fallback = planTrustedRepairContinuation({
      aggregate: secondPartial,
      fixture,
      sourceBinding,
      continuation,
      exposureId: nextId(),
      occurredAt: "2026-08-12T03:10:00.000Z",
    });
    assert.equal(
      fallback.outcome,
      continuation === "DEFER_FOR_NOW" ? "deferred" : "guided",
    );
  }

  const sourceDrift = planTrustedRepairSubmission({
    aggregate: firstPartial,
    fixture,
    sourceBinding: {
      ...SYNTHETIC_SOURCE_BINDING,
      bindingVersion: "synthetic_fixture:changed",
    },
    artifactId: nextId(),
    body: REPAIRS.appraisal_theory,
    occurredAt: "2026-08-12T03:11:00.000Z",
  });
  assert.equal(sourceDrift.nextState, "blocked");
  assert.equal(sourceDrift.artifact, null);
});

test("help cannot precede diagnosis and revision drift invalidates old anchors and claims", () => {
  const aggregate = aggregateFor("appraisal_practical");
  assert.throws(
    () => planTrustedRepairExposure({ aggregate, exposureId: nextId(), occurredAt: "2026-08-12T00:00:00.000Z" }),
    (error) => error instanceof TrustedRepairContractError && error.code === "invalid_transition",
  );
  const staleSource = {
    ...aggregate,
    session: {
      ...aggregate.session,
      state: "verified",
      outcome: "verified",
      confirmedRevisionId: nextId(),
      primaryGapId: "old-gap",
      independentAttemptBeforeHelp: true,
      stateData: { ...aggregate.session.stateData, gapCandidates: [{ gapId: "old-gap" }] },
    },
  };
  const drift = planTrustedRepairRevisionDrift({ aggregate: staleSource, artifactId: nextId(), body: "새 수정본", occurredAt: "2026-08-12T00:00:00.000Z" });
  assert.equal(drift.nextState, "stale");
  assert.equal(drift.primaryGapId, null);
  assert.equal(drift.assistanceLevel, 0);
  assert.equal(drift.independentAttemptBeforeHelp, false);
  assert.deepEqual(drift.stateData.gapCandidates, []);
});

test("cognitive-load budget and every AI-like step expose one purpose and one next action", () => {
  assert.deepEqual(TRUSTED_REPAIR_LOAD_BUDGET, {
    maximumGapCandidates: 3,
    primaryGapCount: 1,
    scaffoldCountPerExposure: 1,
    initialAssistanceLevel: 0,
    smallestScaffoldAssistanceLevel: 1,
    guidedAssistanceLevel: 3,
    maximumImmediatePartialRetries: 1,
  });
  assert.deepEqual(Object.keys(TRUSTED_REPAIR_STEP_GUIDANCE), [
    "editable_capture_draft",
    "revision_confirmed",
    "prediction_committed",
    "independent_attempt_committed",
    "self_diagnosis_committed",
    "diagnosed",
    "exposure_committed",
    "repair_submitted",
    "partial",
  ]);
  for (const guidance of Object.values(TRUSTED_REPAIR_STEP_GUIDANCE)) {
    assert.ok(guidance.learningPurposeKo.length > 0);
    assert.ok(guidance.nextActionKo.length > 0);
  }
});
