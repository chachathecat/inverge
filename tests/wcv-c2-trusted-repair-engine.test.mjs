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
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from "../lib/review-os/trusted-repair-fixtures.ts";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
let idCounter = 10;
const nextId = () => `30000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;

function aggregateFor(subject, inputMode = "TYPED_TEXT") {
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
        sourceVersion: fixture.sourceBinding.sourceId,
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
    aggregate = apply(aggregate, planTrustedRepairSubmission({ aggregate, artifactId: nextId(), body: REPAIRS[subject], occurredAt: "2026-08-12T00:04:00.000Z" }));
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
  ]);
  for (const guidance of Object.values(TRUSTED_REPAIR_STEP_GUIDANCE)) {
    assert.ok(guidance.learningPurposeKo.length > 0);
    assert.ok(guidance.nextActionKo.length > 0);
  }
});
