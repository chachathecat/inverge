import assert from "node:assert/strict";
import test from "node:test";

import {
  TRUSTED_REPAIR_CONTRACT_VERSION,
  TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_FLAG,
  TRUSTED_REPAIR_POLICY_VERSION,
  TRUSTED_REPAIR_RUBRIC_VERSION,
  TRUSTED_REPAIR_SUBJECTS,
  TRUSTED_REPAIR_VALIDATOR_VERSION,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  SYNTHETIC_SOURCE_BINDING,
  initialTrustedRepairStateData,
  planTrustedRepairContinuation,
  planTrustedRepairDiagnosis,
  planTrustedRepairExposure,
  planTrustedRepairIndependentAttempt,
  planTrustedRepairPrediction,
  planTrustedRepairRevisionConfirmation,
  planTrustedRepairSelfDiagnosis,
  planTrustedRepairSubmission,
  selectTrustedRepairScaffoldExposure,
  trustedRepairPartialRetryAvailable,
  trustedRepairSourceVersion,
  validatePracticeCalculationRelation,
} from "../lib/review-os/trusted-repair-engine.ts";
import {
  TRUSTED_REPAIR_FIXTURES,
  TRUSTED_REPAIR_GOLD_CANDIDATES,
  assertTrustedRepairFixtureInventory,
  trustedRepairBankFirstSelection,
  trustedRepairCanonicalFixture,
  validateTrustedRepairPracticeAnchor,
  validateTrustedRepairFixtureEligibility,
} from "../lib/review-os/trusted-repair-fixtures.ts";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const VALID_RELATION =
  "연간 총수익에서 연간 운영비를 차감한다: 120,000,000 - 20,000,000 = 100,000,000원/년. 연간 순수익은 양수이며 반올림 없음.";
const DISCONNECTED_RELATION =
  "연간 총수익 120,000,000원, 연간 운영비 20,000,000원, 연간 순수익 100,000,000원이며 반올림 없음.";
let idCounter = 10;
const nextId = () =>
  `30000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;

function aggregateForPractice() {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  return {
    session: {
      sessionId: SESSION_ID,
      userId: USER_ID,
      fixtureId: fixture.fixtureId,
      subject: "appraisal_practical",
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
        sourceVersion: trustedRepairSourceVersion(
          fixture,
          SYNTHETIC_SOURCE_BINDING,
        ),
        rubricVersion: TRUSTED_REPAIR_RUBRIC_VERSION,
        policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
        validatorVersion: TRUSTED_REPAIR_VALIDATOR_VERSION,
      },
      stateData: initialTrustedRepairStateData("TYPED_TEXT"),
      createdAt: "2026-08-17T00:00:00.000Z",
      updatedAt: "2026-08-17T00:00:00.000Z",
    },
    artifacts: [
      {
        artifactId: nextId(),
        sessionId: SESSION_ID,
        userId: USER_ID,
        revisionNumber: 0,
        kind: "capture_draft",
        inputMode: "TYPED_TEXT",
        body: fixture.editableDrafts.TYPED_TEXT,
        createdAt: "2026-08-17T00:00:00.000Z",
      },
    ],
    exposures: [],
  };
}

function applyPlan(aggregate, plan) {
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
      ? [
          ...aggregate.artifacts,
          { ...plan.artifact, sessionId: SESSION_ID, userId: USER_ID },
        ]
      : aggregate.artifacts,
    exposures: plan.exposure
      ? [
          ...aggregate.exposures,
          { ...plan.exposure, sessionId: SESSION_ID, userId: USER_ID },
        ]
      : aggregate.exposures,
  };
}

function prepareRepairSubmitted(repairBody) {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  let aggregate = aggregateForPractice();
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairRevisionConfirmation({
      aggregate,
      artifactId: nextId(),
      body: "합성 확정 수정본",
      occurredAt: "2026-08-17T00:01:00.000Z",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairPrediction({
      aggregate,
      prediction: "likely_partial",
      confidence: "medium",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairIndependentAttempt({
      aggregate,
      artifactId: nextId(),
      body: DISCONNECTED_RELATION,
      occurredAt: "2026-08-17T00:02:00.000Z",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairSelfDiagnosis({
      aggregate,
      selfDiagnosisCode: "unit_or_definition_drift",
    }),
  );
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairDiagnosis({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
    }),
  );
  assert.equal(aggregate.session.stateData.proofEvaluation.state, "UNSUPPORTED");
  aggregate = applyPlan(
    aggregate,
    planTrustedRepairExposure({
      aggregate,
      exposureId: nextId(),
      occurredAt: "2026-08-17T00:03:00.000Z",
    }),
  );
  return applyPlan(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      artifactId: nextId(),
      body: repairBody,
      occurredAt: "2026-08-17T00:04:00.000Z",
    }),
  );
}

function verifySubmitted(aggregate) {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  return applyPlan(
    aggregate,
    planTrustedRepairContinuation({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-17T00:05:00.000Z",
    }),
  );
}

test("C2R-C-P freezes the Practice-only typed proof and kill-switch versions", () => {
  assert.deepEqual(TRUSTED_REPAIR_SUBJECTS, ["appraisal_practical"]);
  assert.equal(
    TRUSTED_REPAIR_CONTRACT_VERSION,
    "wcv_c2r_c_p_practice_trusted_repair.v1",
  );
  assert.equal(
    TRUSTED_REPAIR_FIXTURE_VERSION,
    "wcv_c2r_c_p_practice_rights_safe_fixtures.2026-08-17.v1",
  );
  assert.equal(
    TRUSTED_REPAIR_RUBRIC_VERSION,
    "wcv_c2r_c_p_practice_relation_rubric.v1",
  );
  assert.equal(
    TRUSTED_REPAIR_VALIDATOR_VERSION,
    "validator:practice-calculation-relation@1",
  );
  assert.equal(TRUSTED_REPAIR_FLAG, "WCV_C2R_C_P_PRACTICE_ENABLED");
});

test("deterministic Practice validator requires one ordered relation and all typed obligations", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  assert.deepEqual(validatePracticeCalculationRelation({ text: VALID_RELATION, anchor }), {
    state: "PASS",
    verified: true,
    validatorId: TRUSTED_REPAIR_VALIDATOR_VERSION,
    anchorId: anchor.anchorId,
    anchorVersionId: anchor.anchorVersionId,
    reasonCodes: [],
    matchedRelation: {
      left: 120000000,
      operator: "SUBTRACT",
      right: 20000000,
      result: 100000000,
      sourceIndex: VALID_RELATION.indexOf("120,000,000"),
      sourceLength: "120,000,000 - 20,000,000 = 100,000,000".length,
    },
  });

  const hostileCases = [
    [DISCONNECTED_RELATION, "UNSUPPORTED"],
    ["총수익 - 운영비 = 순수익", "PARTIAL"],
    ["총수익 120,000,000 + 운영비 20,000,000 = 순수익 140,000,000원/년, 반올림 없음", "PARTIAL"],
    ["총수익·운영비·순수익 관계 120,000,000 - 20,000,000 = 100,000,000원인 값, 반올림 없음", "PARTIAL"],
    ["총수익 1,120,000,000 - 운영비 20,000,000 = 순수익 1,100,000,000원/년, 반올림 없음", "UNSUPPORTED"],
    [`${VALID_RELATION} 또한 120,000,000 + 20,000,000 = 100,000,000원/년이라고도 한다.`, "AMBIGUOUS"],
  ];
  for (const [text, expectedState] of hostileCases) {
    const result = validatePracticeCalculationRelation({ text, anchor });
    assert.equal(result.state, expectedState, text);
    assert.equal(result.verified, false, text);
  }
});

test("[C2R-C-P-R02] numeric substring collisions never create typed proof", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const result = validatePracticeCalculationRelation({
    text: "총수익 1,120,000,000 - 운영비 20,000,000 = 순수익 1,100,000,000원/년, 양수이며 반올림 없음",
    anchor,
  });
  assert.equal(result.verified, false);
  assert.notEqual(result.state, "PASS");
});

test("[C2R-C-P-R09] sign claims honor negation and fail closed on positive-negative conflict", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const negatedForbidden = VALID_RELATION.replace(
    "양수이며",
    "음수가 아니며",
  );
  assert.equal(
    validatePracticeCalculationRelation({ text: negatedForbidden, anchor }).state,
    "PASS",
  );
  const conflict = `${VALID_RELATION} 그러나 결과는 음수이다.`;
  const result = validatePracticeCalculationRelation({ text: conflict, anchor });
  assert.equal(result.verified, false);
  assert.ok(result.reasonCodes.includes("positive_sign_constraint_failed"));
});

test("[C2R-C-P-R10] Practice proof declares no unbound semantic alternative group", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0];
  assert.equal("acceptableAlternativeGroups" in anchor, false);
  assert.equal("requiredConcepts" in anchor, false);
  assert.equal("forbiddenFalseClaims" in anchor, false);
  assert.deepEqual(validateTrustedRepairPracticeAnchor(anchor), {
    valid: true,
    reasons: [],
  });
});

test("[C2R-C-P-R12] KRW/year unit is bounded and does not match 원인", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const result = validatePracticeCalculationRelation({
    text: "총수익·운영비·순수익 관계 120,000,000 - 20,000,000 = 100,000,000원인 값이며 양수, 반올림 없음",
    anchor,
  });
  assert.equal(result.state, "PARTIAL");
  assert.ok(result.reasonCodes.includes("krw_per_year_unit_missing"));
});

test("[C2R-C-P-R19] disconnected numeric presence is UNSUPPORTED, never verified", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const result = validatePracticeCalculationRelation({
    text: DISCONNECTED_RELATION,
    anchor,
  });
  assert.equal(result.state, "UNSUPPORTED");
  assert.equal(result.verified, false);
});

test("[C2R-C-P-R04] guided continuation selects the newest level-three exposure", () => {
  const aggregate = aggregateForPractice();
  aggregate.session.state = "guided";
  aggregate.session.assistanceLevel = 3;
  aggregate.session.confirmedRevisionId = aggregate.artifacts[0].artifactId;
  aggregate.session.primaryGapId = "practice-gap";
  aggregate.exposures = [
    {
      exposureId: nextId(),
      sessionId: SESSION_ID,
      userId: USER_ID,
      revisionId: aggregate.artifacts[0].artifactId,
      gapId: "practice-gap",
      assistanceLevel: 1,
      scaffoldKind: "smallest_eligible_scaffold",
      occurredAt: "2026-08-17T00:01:00.000Z",
    },
    {
      exposureId: nextId(),
      sessionId: SESSION_ID,
      userId: USER_ID,
      revisionId: aggregate.artifacts[0].artifactId,
      gapId: "practice-gap",
      assistanceLevel: 3,
      scaffoldKind: "guided_solution",
      occurredAt: "2026-08-17T00:02:00.000Z",
    },
  ];
  assert.equal(
    selectTrustedRepairScaffoldExposure(aggregate)?.exposureId,
    aggregate.exposures[1].exposureId,
  );
});

test("[C2R-C-P-R06] only same-session PASS verifies and partial retry remains bounded", () => {
  const verified = verifySubmitted(prepareRepairSubmitted(VALID_RELATION));
  assert.equal(verified.session.state, "verified");
  assert.equal(verified.session.outcome, "verified");
  assert.equal(verified.session.stateData.proofEvaluation.state, "PASS");
  assert.equal(verified.session.independentAttemptBeforeHelp, true);

  let partial = verifySubmitted(prepareRepairSubmitted(DISCONNECTED_RELATION));
  assert.equal(partial.session.state, "partial");
  assert.equal(partial.session.stateData.proofEvaluation.state, "UNSUPPORTED");
  assert.equal(trustedRepairPartialRetryAvailable(partial), true);
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  partial = applyPlan(
    partial,
    planTrustedRepairSubmission({
      aggregate: partial,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      artifactId: nextId(),
      body: VALID_RELATION,
      occurredAt: "2026-08-17T00:06:00.000Z",
    }),
  );
  const corrected = verifySubmitted(partial);
  assert.equal(corrected.session.state, "verified");
  assert.equal(corrected.session.stateData.proofEvaluation.state, "PASS");
});

test("seven Practice fixtures and two adjudicated Gold tiers retain exact active rights bindings", () => {
  assert.doesNotThrow(() => assertTrustedRepairFixtureInventory());
  assert.equal(TRUSTED_REPAIR_FIXTURES.length, 7);
  assert.equal(TRUSTED_REPAIR_GOLD_CANDIDATES.length, 2);
  assert.deepEqual(
    TRUSTED_REPAIR_GOLD_CANDIDATES.map((candidate) => candidate.goldTier),
    ["GOLDEN", "OWNER_GOLD"],
  );
  assert.ok(
    TRUSTED_REPAIR_GOLD_CANDIDATES.every(
      (candidate) =>
        candidate.subject === "appraisal_practical" &&
        candidate.adjudicationState ===
          "OWNER_AUTHORIZED_SYNTHETIC_STAGE_FIXTURE",
    ),
  );
  for (const fixture of TRUSTED_REPAIR_FIXTURES) {
    assert.equal(fixture.subject, "appraisal_practical");
    assert.deepEqual(validateTrustedRepairFixtureEligibility(fixture), {
      eligible: true,
      reasons: [],
    });
    assert.equal(
      fixture.sourceDecision.rightsManifestId,
      fixture.rights.manifestId,
    );
    assert.equal(
      fixture.sourceDecision.rightsManifestVersionId,
      fixture.rights.manifestVersionId,
    );
  }
});

test("denied, expired, mismatched, and non-Practice fixture routes fail closed", () => {
  const fixture = TRUSTED_REPAIR_FIXTURES[0];
  for (const sourceClass of TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES) {
    const hostile = structuredClone(fixture);
    hostile.rights.sourceClass = sourceClass;
    hostile.sourceDecision.sourceClass = sourceClass;
    assert.equal(validateTrustedRepairFixtureEligibility(hostile).eligible, false);
  }
  for (const mutate of [
    (hostile) => {
      hostile.rights.status = "BLOCKED";
    },
    (hostile) => {
      hostile.rights.validUntil = "2026-08-16T00:00:00.000+09:00";
    },
    (hostile) => {
      hostile.sourceDecision.rightsManifestVersionId = "mismatch@9";
    },
    (hostile) => {
      hostile.sourceDecision.purpose = "SHARED_RELEASE";
    },
  ]) {
    const hostile = structuredClone(fixture);
    mutate(hostile);
    assert.equal(validateTrustedRepairFixtureEligibility(hostile).eligible, false);
  }
  assert.equal(
    trustedRepairBankFirstSelection({
      subject: "appraisal_practical",
      bank: "LEARNING",
    }).kind,
    "selected",
  );
  const scarcity = trustedRepairBankFirstSelection({
    subject: "appraisal_practical",
    bank: "TRANSFER",
  });
  assert.equal(scarcity.kind, "scarcity");
  assert.equal(scarcity.event.containsBody, false);
  assert.equal(scarcity.selfPublicationAllowed, false);
});
