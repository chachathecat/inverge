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
  trustedRepairSourceBindingMatches,
  trustedRepairSourceVersion,
  validatePracticeCalculationRelation,
} from "../lib/review-os/trusted-repair-engine.ts";
import {
  TRUSTED_REPAIR_FIXTURES,
  TRUSTED_REPAIR_GOLD_CANDIDATES,
  assertTrustedRepairFixtureInventory,
  trustedRepairBankFirstSelection,
  trustedRepairCanonicalFixture,
  trustedRepairScaffoldText,
  validateTrustedRepairPracticeAnchor,
  validateTrustedRepairFixtureEligibility,
} from "../lib/review-os/trusted-repair-fixtures.ts";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const VALID_RELATION =
  "연간 총수익은 120,000,000원/년이고 연간 운영비는 20,000,000원/년이다. 120,000,000 - 20,000,000 = 100,000,000원/년. 연간 순수익은 100,000,000원/년으로 양수이며 반올림 없음.";
const DISCONNECTED_RELATION =
  "연간 총수익 120,000,000원, 연간 운영비 20,000,000원, 연간 순수익 100,000,000원이며 반올림 없음.";
const RIGHTS_EVALUATED_AT = "2026-08-17T01:00:00.000+09:00";
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

function prepareDiagnosed() {
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
  return aggregate;
}

function prepareRepairSubmitted(repairBody) {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  let aggregate = prepareDiagnosed();
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
      sourceIndex: VALID_RELATION.indexOf(
        "120,000,000 - 20,000,000 = 100,000,000",
      ),
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
    [`${VALID_RELATION} 별도 계산은 120,000,000 - 30,000,000 = 90,000,000원/년이다.`, "AMBIGUOUS"],
    [`${VALID_RELATION} 반대로 20,000,000 - 120,000,000 = -100,000,000원/년이라고도 한다.`, "AMBIGUOUS"],
    [`${VALID_RELATION} 반대로 20,000,000 − 120,000,000 = −100,000,000원/년이라고도 한다.`, "AMBIGUOUS"],
    [`${VALID_RELATION} 반대로 +20,000,000 − +120,000,000 = +100,000,000원/년이라고도 한다.`, "AMBIGUOUS"],
    [`${VALID_RELATION} 역산은 100,000,000 + 20,000,000 = 120,000,000원/년이라고도 한다.`, "AMBIGUOUS"],
    [`${VALID_RELATION} 또 120,000,000 - 20,000,000 = 100,000,000%라고도 한다.`, "PARTIAL"],
    [`${VALID_RELATION} 하지만 반올림 필요라고도 한다.`, "PARTIAL"],
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
  for (const negatedPositive of [
    VALID_RELATION.replace("양수이며", "양수가 아니며"),
    VALID_RELATION.replace("양수이며", "양수가 아님"),
    VALID_RELATION.replace("양수이며", "양수는 아니다"),
    VALID_RELATION.replace("양수이며", "양수가 결코 아니며"),
    VALID_RELATION.replace("양수이며", "양의 부호가 아니다"),
    VALID_RELATION.replace("양수이며", "양수라는 주장은 틀렸고"),
  ]) {
    const negatedPositiveResult = validatePracticeCalculationRelation({
      text: negatedPositive,
      anchor,
    });
    assert.equal(negatedPositiveResult.verified, false, negatedPositive);
    assert.equal(negatedPositiveResult.state, "PARTIAL", negatedPositive);
    assert.ok(
      negatedPositiveResult.reasonCodes.includes(
        "positive_sign_constraint_failed",
      ),
      negatedPositive,
    );
  }
  const conflict = `${VALID_RELATION} 그러나 결과는 음수이다.`;
  const result = validatePracticeCalculationRelation({ text: conflict, anchor });
  assert.equal(result.verified, false);
  assert.ok(result.reasonCodes.includes("positive_sign_constraint_failed"));

  const mixedNegativePolarity = `${VALID_RELATION.replace(
    "양수이며",
    "음수가 아니며",
  )} 연간 순수익은 100,000,000원/년으로 음수이다.`;
  const mixedResult = validatePracticeCalculationRelation({
    text: mixedNegativePolarity,
    anchor,
  });
  assert.equal(mixedResult.verified, false);
  assert.ok(
    mixedResult.reasonCodes.includes("positive_sign_constraint_failed"),
  );

  const unrelatedPositiveSign =
    "연간 총수익은 120,000,000원/년이고 연간 운영비는 20,000,000원/년이다. 120,000,000 - 20,000,000 = 100,000,000원/년. 연간 순수익은 100,000,000원/년이며 반올림 없음. 총수익은 양수이다.";
  const unrelatedResult = validatePracticeCalculationRelation({
    text: unrelatedPositiveSign,
    anchor,
  });
  assert.equal(unrelatedResult.verified, false);
  assert.ok(
    unrelatedResult.reasonCodes.includes("positive_sign_constraint_failed"),
  );

  const negatedSymbol = VALID_RELATION.replace(
    "양수이며",
    "부호는 +가 아니다,",
  );
  const negatedSymbolResult = validatePracticeCalculationRelation({
    text: negatedSymbol,
    anchor,
  });
  assert.equal(negatedSymbolResult.verified, false);
  assert.ok(
    negatedSymbolResult.reasonCodes.includes(
      "positive_sign_constraint_failed",
    ),
  );

  const negatedNegativeSymbol = VALID_RELATION.replace(
    "양수이며",
    "부호는 -가 아니다,",
  );
  assert.equal(
    validatePracticeCalculationRelation({
      text: negatedNegativeSymbol,
      anchor,
    }).state,
    "PASS",
  );
});

test("Practice proof binds role labels to exact operands and result", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const swappedRoles =
    "연간 총수익은 20,000,000원이고 연간 운영비는 120,000,000원이다. 120,000,000 - 20,000,000 = 100,000,000원/년. 연간 순수익은 양수이며 반올림 없음.";
  const result = validatePracticeCalculationRelation({
    text: swappedRoles,
    anchor,
  });
  assert.equal(result.state, "PARTIAL");
  assert.equal(result.verified, false);
  assert.ok(result.reasonCodes.includes("operand_roles_missing"));

  const negatedRoles =
    "연간 총수익은 120,000,000원이 아니고 연간 운영비는 20,000,000원이 아니며 연간 순수익은 100,000,000원이 아니다. 120,000,000 - 20,000,000 = 100,000,000원/년. 연간 순수익은 100,000,000원/년으로 양수이며 반올림 없음.";
  const negatedRoleResult = validatePracticeCalculationRelation({
    text: negatedRoles,
    anchor,
  });
  assert.equal(negatedRoleResult.verified, false);
  assert.ok(negatedRoleResult.reasonCodes.includes("operand_roles_missing"));

  for (const modifiedRoleConflict of [
    `${VALID_RELATION} 하지만 실제 총수익 금액은 130,000,000원/년이다.`,
    `${VALID_RELATION} 운영비의 최종 값은 30,000,000원/년이다.`,
    `${VALID_RELATION} 순수익의 산정액은 90,000,000원/년이다.`,
  ]) {
    const modifiedResult = validatePracticeCalculationRelation({
      text: modifiedRoleConflict,
      anchor,
    });
    assert.equal(modifiedResult.verified, false, modifiedRoleConflict);
    assert.ok(
      modifiedResult.reasonCodes.includes("operand_roles_missing"),
      modifiedRoleConflict,
    );
  }

  const compatibleModifiedRoles = validatePracticeCalculationRelation({
    text: `${VALID_RELATION} 실제 총수익 금액은 120,000,000원/년이고 운영비의 최종 값은 20,000,000원/년이며 순수익의 산정액은 100,000,000원/년이다.`,
    anchor,
  });
  assert.equal(compatibleModifiedRoles.verified, true);
  assert.equal(compatibleModifiedRoles.state, "PASS");
});

test("Practice proof rejects role labels embedded in explicitly negated terms", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const result = validatePracticeCalculationRelation({
    text:
      "총수익이 아닌 비총수익은 120,000,000원/년이고 운영비가 아닌 비운영비는 20,000,000원/년이다. 120,000,000 - 20,000,000 = 100,000,000원/년. 순수익이 아닌 비순수익은 100,000,000원/년으로 양수이며 결과 단위는 원/년이고 반올림 없음.",
    anchor,
  });
  assert.equal(result.verified, false);
  assert.equal(result.state, "PARTIAL");
  assert.ok(result.reasonCodes.includes("operand_roles_missing"));
});

test("Practice proof requires exact KRW/year units on every bound role", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  for (const contradictoryUnit of [
    VALID_RELATION.replace(
      "총수익은 120,000,000원/년",
      "총수익은 120,000,000kg",
    ),
    VALID_RELATION.replace(
      "운영비는 20,000,000원/년",
      "운영비는 20,000,000명",
    ),
    VALID_RELATION.replace(
      "순수익은 100,000,000원/년",
      "순수익은 100,000,000원/월",
    ),
  ]) {
    const result = validatePracticeCalculationRelation({
      text: contradictoryUnit,
      anchor,
    });
    assert.equal(result.state, "PARTIAL", contradictoryUnit);
    assert.equal(result.verified, false, contradictoryUnit);
    assert.ok(
      result.reasonCodes.includes("operand_role_units_invalid"),
      contradictoryUnit,
    );
  }
});

test("Practice proof rejects negated relation and rounding assertions", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);

  const negatedRelation = VALID_RELATION.replace(
    "120,000,000 - 20,000,000 = 100,000,000원/년.",
    "120,000,000 - 20,000,000 = 100,000,000원/년 아니다.",
  );
  const relationResult = validatePracticeCalculationRelation({
    text: negatedRelation,
    anchor,
  });
  assert.equal(relationResult.verified, false);
  assert.equal(relationResult.state, "AMBIGUOUS");
  assert.deepEqual(relationResult.reasonCodes, [
    "negated_calculation_relation",
  ]);

  for (const relationRejection of [
    "원/년은 성립하지 않는다.",
    "원/년이라는 관계는 맞지 않는다.",
    "원/년인 계산식은 옳지 않다.",
    "원/년은 유효하지 않다.",
    "원/년은 참이 아니다.",
    "원/년은 거짓이다.",
    "원/년은 성립할 수 없다.",
  ]) {
    const rejectedRelation = VALID_RELATION.replace(
      "100,000,000원/년.",
      `100,000,000${relationRejection}`,
    );
    const rejectedResult = validatePracticeCalculationRelation({
      text: rejectedRelation,
      anchor,
    });
    assert.equal(rejectedResult.verified, false, relationRejection);
    assert.equal(rejectedResult.state, "AMBIGUOUS", relationRejection);
    assert.deepEqual(
      rejectedResult.reasonCodes,
      ["negated_calculation_relation"],
      relationRejection,
    );
  }

  for (const relationPrefix of [
    "틀린 식은 ",
    "잘못된 계산은 ",
    "이 관계는 오류라서 ",
    "다음은 틀렸다: ",
  ]) {
    const prefixedRelation = VALID_RELATION.replace(
      "120,000,000 - 20,000,000 = 100,000,000원/년.",
      `${relationPrefix}120,000,000 - 20,000,000 = 100,000,000원/년.`,
    );
    const prefixedResult = validatePracticeCalculationRelation({
      text: prefixedRelation,
      anchor,
    });
    assert.equal(prefixedResult.verified, false, relationPrefix);
    assert.equal(prefixedResult.state, "AMBIGUOUS", relationPrefix);
    assert.deepEqual(
      prefixedResult.reasonCodes,
      ["negated_calculation_relation"],
      relationPrefix,
    );
  }

  for (const laterRetraction of [
    "하지만 이 계산은 틀렸다.",
    "그러나 위의 식은 성립하지 않는다.",
    "앞의 관계는 유효하지 않다.",
    "해당 계산식은 참이 아니다.",
    "상기 등식은 성립할 수 없다.",
    "하지만 이 답은 틀렸다.",
    "그러나 이 결론은 거짓이다.",
    "다만 최종 결과는 옳지 않다.",
    "그러나 이 답은 정확하지 않다.",
    "이 결론은 성립하지 않는다.",
  ]) {
    const retractedResult = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${laterRetraction}`,
      anchor,
    });
    assert.equal(retractedResult.verified, false, laterRetraction);
    assert.equal(retractedResult.state, "AMBIGUOUS", laterRetraction);
    assert.deepEqual(
      retractedResult.reasonCodes,
      ["negated_calculation_relation"],
      laterRetraction,
    );
  }

  const unrelatedNegativeClaim = validatePracticeCalculationRelation({
    text: `${VALID_RELATION} 하지만 운영비가 음수라는 주장은 틀렸다.`,
    anchor,
  });
  assert.equal(unrelatedNegativeClaim.verified, true);
  assert.equal(unrelatedNegativeClaim.state, "PASS");

  for (const negatedRounding of [
    "반올림 없음은 아니다",
    "반올림하지 않음이 아니다",
    "반올림 0자리가 아니다",
    "반올림 없음은 틀렸다",
  ]) {
    const roundingResult = validatePracticeCalculationRelation({
      text: VALID_RELATION.replace("반올림 없음", negatedRounding),
      anchor,
    });
    assert.equal(roundingResult.verified, false, negatedRounding);
    assert.ok(
      roundingResult.reasonCodes.includes(
        "half_up_scale_zero_rounding_not_confirmed",
      ),
      negatedRounding,
    );
  }

  for (const appliedRoundingClaim of [
    "하지만 결과에 반올림을 적용했다.",
    "하지만 이 결과는 반올림한 값이다.",
    "하지만 이 값은 반올림된 결과이다.",
    "하지만 결과는 반올림 처리한 금액이다.",
    "하지만 산정액은 반올림 처리된 값이다.",
    "하지만 이 결과는 반올림으로 산출된 값이다.",
    "하지만 이 결과는 반올림을 거친 계산값이다.",
    "하지만 이 결과는 반올림 결과이다.",
    "하지만 반올림 기준을 사용했다.",
  ]) {
    const appliedRounding = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${appliedRoundingClaim}`,
      anchor,
    });
    assert.equal(appliedRounding.verified, false, appliedRoundingClaim);
    assert.ok(
      appliedRounding.reasonCodes.includes(
        "half_up_scale_zero_rounding_not_confirmed",
      ),
      appliedRoundingClaim,
    );
  }

  for (const compatibleRoundingClaim of [
    "이 결과는 반올림한 값이 아니다.",
    "이 값은 반올림된 결과가 아니다.",
    "이 결과는 반올림을 적용한 값이 아니다.",
    "이 결과는 반올림하지 않은 값이다.",
    "이 결과는 반올림을 하지 않았다.",
    "반올림이 필요하지 않다.",
    "반올림은 필요하지 않다.",
    "반올림할 필요가 없다.",
    "반올림할 필요는 없다.",
  ]) {
    const compatibleRounding = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${compatibleRoundingClaim}`,
      anchor,
    });
    assert.equal(compatibleRounding.verified, true, compatibleRoundingClaim);
    assert.equal(compatibleRounding.state, "PASS", compatibleRoundingClaim);
  }
});

test("Practice proof rejects explicit operator assertions that contradict subtraction", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);

  for (const operatorClaim of [
    "실제 연산자는 덧셈이다.",
    "계산 연산은 더하기이다.",
    "연산 기호는 +이다.",
    "실제로 연산 방식은 ADD이다.",
    "하지만 이 계산은 덧셈이다.",
    "위 등식은 ADD이다.",
    "연산자는 곱셈이다.",
    "연산은 나눗셈이다.",
    "연산자는 뺄셈이 아니다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${operatorClaim}`,
      anchor,
    });
    assert.equal(result.verified, false, operatorClaim);
    assert.equal(result.state, "AMBIGUOUS", operatorClaim);
    assert.deepEqual(
      result.reasonCodes,
      ["operator_assertion_conflict"],
      operatorClaim,
    );
  }

  for (const compatibleClaim of [
    "실제 연산자는 뺄셈이다.",
    "연산 기호는 -이다.",
    "계산 방식은 SUBTRACT이다.",
    "해당 계산은 뺄셈이다.",
    "연산자는 덧셈이 아니다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${compatibleClaim}`,
      anchor,
    });
    assert.equal(result.verified, true, compatibleClaim);
    assert.equal(result.state, "PASS", compatibleClaim);
  }
});

test("Practice proof accepts canonical positive-sign wording and rejects negative-sign wording", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const canonicalPositive = VALID_RELATION.replace("양수이며", "양의 부호이며");
  assert.equal(
    validatePracticeCalculationRelation({ text: canonicalPositive, anchor }).state,
    "PASS",
  );
  const canonicalNegative = VALID_RELATION.replace("양수이며", "음의 부호이며");
  const negativeResult = validatePracticeCalculationRelation({
    text: canonicalNegative,
    anchor,
  });
  assert.equal(negativeResult.state, "PARTIAL");
  assert.ok(
    negativeResult.reasonCodes.includes("positive_sign_constraint_failed"),
  );

  for (const negativeSignClaim of [
    "하지만 순수익은 마이너스다.",
    "하지만 부호는 마이너스이다.",
    "하지만 순수익은 음(-)이다.",
    "하지만 순수익은 음(-)의 값이다.",
    "하지만 최종 순수익 부호는 음(-100,000,000원/년)이다.",
    "하지만 순수익 부호는 음(+100,000,000원/년)이다.",
    "하지만 순수익 부호는 음수(-100,000,000원/년)이다.",
    "하지만 순수익 부호는 음의 값(-100,000,000원/년)이다.",
    "하지만 순수익은 음의 값이다.",
    "하지만 순수익의 부호는 음이다.",
    "하지만 순수익은 음의 수가 된다.",
    "하지만 순수익은 음의 숫자다.",
    "하지만 순수익은 음으로 판정된다.",
    "하지만 순수익은 마이너스인 값이다.",
    "하지만 순수익은 minus number이다.",
    "하지만 순수익은 non-positive이다.",
    "하지만 순수익은 비양수다.",
    "하지만 순수익은 비 양수다.",
    "하지만 순수익은 not positive이다.",
    "하지만 순수익은 (-)이다.",
    "하지만 순수익은 부(-)이다.",
    "하지만 순수익은 부(-100,000,000원/년)이다.",
    "하지만 순수익은 양(-100,000,000원/년)이다.",
    "하지만 순수익은 양수(-100,000,000원/년)이다.",
    "하지만 순수익은 양수(+100,000,000원이 아니라 -100,000,000원/년)이다.",
    "하지만 순수익은 양수(+100,000,000원이 아니라 음수)이다.",
    "하지만 순수익은 양의 값(+100,000,000원/년 또는 −100,000,000원/년)이다.",
    "하지만 순수익은 positive(+100,000,000원/년 or negative)이다.",
    "하지만 순수익은 플러스(-100,000,000원/년)이다.",
    "하지만 순수익은 마이너스(-100,000,000원/년)이다.",
    "하지만 순수익은 negative(-100,000,000원/년)이다.",
    "하지만 순수익은 (-100,000,000원/년)이다.",
    "하지만 순수익은 0보다 작다.",
    "하지만 순수익은 0보다 작은 수다.",
    "하지만 순수익은 0보다 작거나 같다.",
    "하지만 순수익은 영 미만이다.",
    "하지만 순수익은 0 이하다.",
    "하지만 부호는 0이다.",
    "하지만 순수익은 negative value이다.",
    "하지만 순수익은 플러스가 아니다.",
    "하지만 순수익은 양이 아니다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${negativeSignClaim}`,
      anchor,
    });
    assert.equal(result.verified, false, negativeSignClaim);
    assert.equal(result.state, "PARTIAL", negativeSignClaim);
    assert.ok(
      result.reasonCodes.includes("positive_sign_constraint_failed"),
      negativeSignClaim,
    );
  }

  for (const compatibleSignClaim of [
    "순수익은 플러스다.",
    "순수익은 양(+)이다.",
    "순수익은 양(+)의 값이다.",
    "순수익은 양(+100,000,000원/년)이다.",
    "순수익은 양수(+100,000,000원/년)이다.",
    "순수익은 양의 값(+100,000,000원/년)이다.",
    "순수익은 양의 수다.",
    "순수익은 양으로 판정된다.",
    "순수익은 (+)이다.",
    "순수익은 (+100,000,000원/년)이다.",
    "순수익은 플러스(+100,000,000원/년)이다.",
    "순수익은 positive number이다.",
    "부호는 +이다.",
    "순수익은 0보다 크다.",
    "순수익은 0보다 큰 수다.",
    "순수익은 음(-)이 아니다.",
    "순수익의 부호는 음이 아니다.",
    "순수익은 음의 수가 아니다.",
    "순수익은 음의 수가 되지 않는다.",
    "순수익은 음으로 판정되지 않는다.",
    "순수익은 마이너스가 아니다.",
    "순수익은 0 미만이 아니다.",
    "순수익은 0 이하가 아니다.",
    "순수익은 not negative이다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${compatibleSignClaim}`,
      anchor,
    });
    assert.equal(result.verified, true, compatibleSignClaim);
    assert.equal(result.state, "PASS", compatibleSignClaim);
  }

  for (const nonStrictPositive of [
    "0 이상이며",
    "0보다 크거나 같으며",
    "비음수이며",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: VALID_RELATION.replace("양수이며", nonStrictPositive),
      anchor,
    });
    assert.equal(result.verified, false, nonStrictPositive);
    assert.equal(result.state, "PARTIAL", nonStrictPositive);
    assert.ok(
      result.reasonCodes.includes("positive_sign_constraint_failed"),
      nonStrictPositive,
    );
  }
});

test("Practice proof rejects contradictory explicit final-result aliases", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);

  for (const contradictoryClaim of [
    "그러나 최종 답은 90,000,000원/년이다.",
    "하지만 정답은 90,000,000원/년이다.",
    "다만 최종 결과값은 90,000,000원/년이다.",
    "다만 최종 결과 금액은 90,000,000원/년이다.",
    "다만 최종 산출값은 90,000,000원/년이다.",
    "그러나 최종치는 90,000,000원/년이다.",
    "그러나 최종 수치는 90,000,000원/년이다.",
    "그러나 최종액은 90,000,000원/년이다.",
    "그러나 결과치는 90,000,000원/년이다.",
    "그러나 결과값은 90,000,000원/년이다.",
    "그러나 결괏값은 90,000,000원/년이다.",
    "그러나 결과는 +90,000,000원/년이다.",
    "그러나 계산 결과는 90,000,000원/년이다.",
    "하지만 산정액은 90,000,000원/년이다.",
    "그러나 결론은 90,000,000원/년이다.",
    "최종 답은 100,000,000원/년이 아니다.",
    "정답은 −90,000,000원/년이다.",
    '정답은 "−100,000,000원/년"이다.',
    "결론은 - 100,000,000원/년이다.",
    '하지만 정답은 [90,000,000원/년"이다.',
    "정답은 (90,000,000원/년)이다.",
    "정답은 <90,000,000원/년>이다.",
    "최종 답은 100,000,000이다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${contradictoryClaim}`,
      anchor,
    });
    assert.equal(result.verified, false, contradictoryClaim);
    assert.equal(result.state, "PARTIAL", contradictoryClaim);
    assert.ok(
      result.reasonCodes.includes("final_result_claim_conflict"),
      contradictoryClaim,
    );
  }

  const unicodeMinusRoleConflict = validatePracticeCalculationRelation({
    text: `${VALID_RELATION} 그러나 순수익은 −90,000,000원/년이다.`,
    anchor,
  });
  assert.equal(unicodeMinusRoleConflict.verified, false);
  assert.equal(unicodeMinusRoleConflict.state, "PARTIAL");
  assert.ok(
    unicodeMinusRoleConflict.reasonCodes.includes("operand_roles_missing"),
  );

  for (const compatibleClaim of [
    "최종 답은 100,000,000원/년이다.",
    "정답은 100,000,000원/년이다.",
    "최종 결과값은 100,000,000원/년이다.",
    "최종치는 100,000,000원/년이다.",
    "최종 수치는 100,000,000원/년이다.",
    "최종액은 100,000,000원/년이다.",
    "결과치는 100,000,000원/년이다.",
    "결과값은 100,000,000원/년이다.",
    "결괏값은 100,000,000원/년이다.",
    "결과는 +100,000,000원/년이다.",
    '최종 답은 "+100,000,000원/년"이다.',
    "결론은 + 100,000,000원/년이다.",
    "정답은 (100,000,000원/년)이다.",
    "정답은 <100,000,000원/년>이다.",
    "최종 답은 90,000,000원/년이 아니다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${compatibleClaim}`,
      anchor,
    });
    assert.equal(result.verified, true, compatibleClaim);
    assert.equal(result.state, "PASS", compatibleClaim);
  }

  for (const malformedClaim of [
    "운영비는 --20,000,000원/년이다.",
    "운영비는 +−20,000,000원/년이다.",
    '정답은 "100,000,000원/년\'이다.',
    '정답은 [100,000,000원/년"이다.',
    "정답은 <100,000,000원/년]이다.",
  ]) {
    const result = validatePracticeCalculationRelation({
      text: `${VALID_RELATION} ${malformedClaim}`,
      anchor,
    });
    assert.equal(result.verified, false, malformedClaim);
    assert.equal(result.state, "PARTIAL", malformedClaim);
  }

  const spacedRoleConflict = validatePracticeCalculationRelation({
    text: `${VALID_RELATION} 그러나 순수익은 − 100,000,000원/년이다.`,
    anchor,
  });
  assert.equal(spacedRoleConflict.verified, false);
  assert.ok(
    spacedRoleConflict.reasonCodes.includes("operand_roles_missing"),
  );
});

test("Practice proof rejects positive-sign tokens with a lexical negation prefix", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  for (const negatedSign of ["비양수이며", "비 양수이며"]) {
    const result = validatePracticeCalculationRelation({
      text: VALID_RELATION.replace("양수이며", negatedSign),
      anchor,
    });
    assert.equal(result.verified, false, negatedSign);
    assert.equal(result.state, "PARTIAL", negatedSign);
    assert.ok(
      result.reasonCodes.includes("positive_sign_constraint_failed"),
      negatedSign,
    );
  }
});

test("Practice GOLDEN adjudication validates its exact grammatical unit wording", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  const golden = TRUSTED_REPAIR_GOLD_CANDIDATES.find(
    (candidate) => candidate.expectedProofEvaluation === "PASS",
  );
  assert.ok(golden);
  const evaluation = validatePracticeCalculationRelation({
    text: golden.answerSample,
    anchor,
  });
  assert.equal(evaluation.state, golden.expectedProofEvaluation);
  assert.equal(evaluation.verified, true);
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

test("Practice proof rejects contradictory result-unit assertions", () => {
  const anchor = trustedRepairCanonicalFixture("appraisal_practical").anchors[0]
    .calculationRelation;
  assert.ok(anchor);
  for (const contradiction of [
    `${VALID_RELATION} 하지만 이 결과의 단위는 원/년이 아니다.`,
    `${VALID_RELATION} 결과 단위는 원/년은 틀렸다.`,
    `${VALID_RELATION} 순수익의 실제 단위는 원/월이다.`,
    `${VALID_RELATION} 결과의 최종 단위는 원/월이다.`,
    `${VALID_RELATION} 결과 단위는 원/년이라는 주장은 오류다.`,
    `${VALID_RELATION} 순수익의 단위는 원/월이다.`,
    `${VALID_RELATION} 이 결과의 단위는 달러/년이다.`,
  ]) {
    const result = validatePracticeCalculationRelation({
      text: contradiction,
      anchor,
    });
    assert.equal(result.verified, false, contradiction);
    assert.equal(result.state, "PARTIAL", contradiction);
    assert.ok(
      result.reasonCodes.includes("krw_per_year_unit_conflict"),
      contradiction,
    );
  }

  const rejectedWrongUnit = `${VALID_RELATION} 순수익의 단위는 원/월이 아니다.`;
  assert.equal(
    validatePracticeCalculationRelation({
      text: rejectedWrongUnit,
      anchor,
    }).state,
    "PASS",
  );

  const compatibleModifiedUnit = validatePracticeCalculationRelation({
    text: `${VALID_RELATION} 순수익의 실제 단위는 원/년이다.`,
    anchor,
  });
  assert.equal(compatibleModifiedUnit.verified, true);
  assert.equal(compatibleModifiedUnit.state, "PASS");
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
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const anchorId = fixture.anchors[0].anchorId;
  const smallest = trustedRepairScaffoldText({
    fixture,
    anchorId,
    scaffoldKind: "smallest_eligible_scaffold",
  });
  const guided = trustedRepairScaffoldText({
    fixture,
    anchorId,
    scaffoldKind: "guided_solution",
  });
  assert.ok(smallest);
  assert.ok(guided);
  assert.notEqual(guided, smallest);
  assert.match(guided, /가이드 풀이/u);
});

test("guided mode requires the current smallest scaffold exposure first", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const diagnosed = prepareDiagnosed();
  assert.throws(
    () =>
      planTrustedRepairContinuation({
        aggregate: diagnosed,
        fixture,
        sourceBinding: SYNTHETIC_SOURCE_BINDING,
        continuation: "SWITCH_TO_GUIDED",
        exposureId: nextId(),
        occurredAt: "2026-08-17T00:03:00.000Z",
      }),
    /trusted-repair:invalid_transition/,
  );

  const exposed = applyPlan(
    diagnosed,
    planTrustedRepairExposure({
      aggregate: diagnosed,
      exposureId: nextId(),
      occurredAt: "2026-08-17T00:03:00.000Z",
    }),
  );
  const guided = applyPlan(
    exposed,
    planTrustedRepairContinuation({
      aggregate: exposed,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      continuation: "SWITCH_TO_GUIDED",
      exposureId: nextId(),
      occurredAt: "2026-08-17T00:04:00.000Z",
    }),
  );
  assert.equal(guided.session.state, "guided");
  assert.deepEqual(
    guided.exposures.map((exposure) => exposure.scaffoldKind),
    ["smallest_eligible_scaffold", "guided_solution"],
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
  assert.doesNotThrow(() =>
    assertTrustedRepairFixtureInventory(RIGHTS_EVALUATED_AT),
  );
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
    assert.deepEqual(
      validateTrustedRepairFixtureEligibility(fixture, RIGHTS_EVALUATED_AT),
      {
        eligible: true,
        reasons: [],
      },
    );
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

test("persisted source versions fail closed across exact rights-lineage rotation", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const aggregate = aggregateForPractice();
  const rotatedFixture = structuredClone(fixture);
  rotatedFixture.rights.manifestVersionId = `${fixture.rights.manifestId}@2`;
  rotatedFixture.sourceDecision.rightsManifestVersionId =
    rotatedFixture.rights.manifestVersionId;
  rotatedFixture.sourceDecision.decisionBasisChecksum =
    "sha256:synthetic-practice-canonical-c2r-c-p-v2";

  assert.notEqual(
    trustedRepairSourceVersion(fixture, SYNTHETIC_SOURCE_BINDING),
    trustedRepairSourceVersion(rotatedFixture, SYNTHETIC_SOURCE_BINDING),
  );
  assert.equal(
    trustedRepairSourceBindingMatches({
      aggregate,
      fixture: rotatedFixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
    }),
    false,
  );

  const replacementDecisionFixture = structuredClone(fixture);
  replacementDecisionFixture.sourceDecision.decisionId =
    `${fixture.sourceDecision.decisionId}:replacement`;
  replacementDecisionFixture.sourceDecision.decisionBasisChecksum =
    "sha256:synthetic-practice-canonical-c2r-c-p-replacement";
  assert.notEqual(
    trustedRepairSourceVersion(fixture, SYNTHETIC_SOURCE_BINDING),
    trustedRepairSourceVersion(
      replacementDecisionFixture,
      SYNTHETIC_SOURCE_BINDING,
    ),
  );
  assert.equal(
    trustedRepairSourceBindingMatches({
      aggregate,
      fixture: replacementDecisionFixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
    }),
    false,
  );
});

test("denied, expired, mismatched, and non-Practice fixture routes fail closed", () => {
  const fixture = TRUSTED_REPAIR_FIXTURES[0];
  for (const sourceClass of TRUSTED_REPAIR_DENIED_RIGHTS_CLASSES) {
    const hostile = structuredClone(fixture);
    hostile.rights.sourceClass = sourceClass;
    hostile.sourceDecision.sourceClass = sourceClass;
    assert.equal(
      validateTrustedRepairFixtureEligibility(hostile, RIGHTS_EVALUATED_AT)
        .eligible,
      false,
    );
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
    assert.equal(
      validateTrustedRepairFixtureEligibility(hostile, RIGHTS_EVALUATED_AT)
        .eligible,
      false,
    );
  }
  const expiredAtUse = structuredClone(fixture);
  expiredAtUse.rights.validUntil = "2026-08-18T00:00:00.000+09:00";
  assert.equal(
    validateTrustedRepairFixtureEligibility(
      expiredAtUse,
      "2026-08-19T00:00:00.000+09:00",
    ).eligible,
    false,
  );
  const futureAtUse = structuredClone(fixture);
  futureAtUse.rights.validFrom = "2026-08-18T00:00:00.000+09:00";
  futureAtUse.sourceDecision.rightsEvaluatedAt =
    "2026-08-18T00:00:00.000+09:00";
  assert.equal(
    validateTrustedRepairFixtureEligibility(
      futureAtUse,
      RIGHTS_EVALUATED_AT,
    ).eligible,
    false,
  );
  assert.equal(
    validateTrustedRepairFixtureEligibility(fixture, "not-a-time").eligible,
    false,
  );
  assert.equal(
    trustedRepairBankFirstSelection({
      subject: "appraisal_practical",
      bank: "LEARNING",
      evaluatedAt: RIGHTS_EVALUATED_AT,
    }).kind,
    "selected",
  );
  assert.equal(
    trustedRepairBankFirstSelection({
      subject: "appraisal_practical",
      bank: "LEARNING",
      evaluatedAt: "2036-08-18T00:00:00.000+09:00",
    }).kind,
    "scarcity",
  );
  const scarcity = trustedRepairBankFirstSelection({
    subject: "appraisal_practical",
    bank: "TRANSFER",
    evaluatedAt: RIGHTS_EVALUATED_AT,
  });
  assert.equal(scarcity.kind, "scarcity");
  assert.match(scarcity.event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(scarcity.event.containsBody, false);
  assert.equal(scarcity.selfPublicationAllowed, false);
});
