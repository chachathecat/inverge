import assert from "node:assert/strict";
import test from "node:test";

import {
  TRUSTED_REPAIR_CONTRACT_VERSION,
  TRUSTED_REPAIR_FIXTURE_VERSION,
  TRUSTED_REPAIR_FLAG,
  TRUSTED_REPAIR_POLICY_VERSION,
  TRUSTED_REPAIR_RUBRIC_VERSION,
  TRUSTED_REPAIR_SUBJECTS,
  TRUSTED_REPAIR_VALIDATOR_VERSION,
  parseJsonRejectingDuplicateKeys,
  parsePracticeCalculationClaimV2Input,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  SYNTHETIC_SOURCE_BINDING,
  buildPracticeCalculationClaim,
  initialTrustedRepairStateData,
  planTrustedRepairContinuation,
  planTrustedRepairDiagnosis,
  planTrustedRepairExposure,
  planTrustedRepairIndependentAttempt,
  planTrustedRepairPrediction,
  planTrustedRepairRevisionConfirmation,
  planTrustedRepairRevisionDrift,
  planTrustedRepairSelfDiagnosis,
  planTrustedRepairSourceBindingDrift,
  planTrustedRepairStructuredClaimConfirmation,
  planTrustedRepairSubmission,
  renderPracticeCalculationClaim,
  selectTrustedRepairScaffoldExposure,
  trustedRepairPartialRetryAvailable,
  trustedRepairSourceBindingMatches,
  trustedRepairSourceVersion,
  validatePracticeCalculationClaim,
} from "../lib/review-os/trusted-repair-engine.ts";
import {
  TRUSTED_REPAIR_FIXTURES,
  TRUSTED_REPAIR_GOLD_CANDIDATES,
  assertTrustedRepairFixtureInventory,
  trustedRepairBankFirstSelection,
  trustedRepairCanonicalFixture,
  validateTrustedRepairFixtureEligibility,
} from "../lib/review-os/trusted-repair-fixtures.ts";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const RIGHTS_EVALUATED_AT = "2026-08-17T01:00:00.000+09:00";
let idCounter = 10;
const nextId = () =>
  `30000000-0000-4000-8000-${String(idCounter++).padStart(12, "0")}`;

function fixture() {
  return trustedRepairCanonicalFixture("appraisal_practical");
}

function aggregateForPractice() {
  const selected = fixture();
  return {
    session: {
      sessionId: SESSION_ID,
      userId: USER_ID,
      fixtureId: selected.fixtureId,
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
        sourceVersion: trustedRepairSourceVersion(selected, SYNTHETIC_SOURCE_BINDING),
        rubricVersion: TRUSTED_REPAIR_RUBRIC_VERSION,
        policyVersion: TRUSTED_REPAIR_POLICY_VERSION,
        validatorVersion: TRUSTED_REPAIR_VALIDATOR_VERSION,
      },
      stateData: initialTrustedRepairStateData("TYPED_TEXT"),
      createdAt: "2026-08-17T00:00:00.000Z",
      updatedAt: "2026-08-17T00:00:00.000Z",
    },
    artifacts: [],
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
      ? [...aggregate.artifacts, { ...plan.artifact, sessionId: SESSION_ID, userId: USER_ID }]
      : aggregate.artifacts,
    exposures: plan.exposure
      ? [...aggregate.exposures, { ...plan.exposure, sessionId: SESSION_ID, userId: USER_ID }]
      : aggregate.exposures,
  };
}

function prepareDiagnosed(attemptText = "독립 시도에서 총수익과 운영비의 차감 관계를 직접 설명했습니다.") {
  const selected = fixture();
  let aggregate = aggregateForPractice();
  aggregate = applyPlan(aggregate, planTrustedRepairRevisionConfirmation({
    aggregate,
    artifactId: nextId(),
    body: "합성 확정 수정본",
    occurredAt: "2026-08-17T00:01:00.000Z",
  }));
  aggregate = applyPlan(aggregate, planTrustedRepairPrediction({
    aggregate,
    prediction: "likely_partial",
    confidence: "medium",
  }));
  aggregate = applyPlan(aggregate, planTrustedRepairIndependentAttempt({
    aggregate,
    artifactId: nextId(),
    body: attemptText,
    occurredAt: "2026-08-17T00:02:00.000Z",
  }));
  aggregate = applyPlan(aggregate, planTrustedRepairSelfDiagnosis({
    aggregate,
    selfDiagnosisCode: "unit_or_definition_drift",
  }));
  return applyPlan(aggregate, planTrustedRepairDiagnosis({
    aggregate,
    fixture: selected,
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
  }));
}

function prepareRepairSubmitted(repairBody) {
  const selected = fixture();
  let aggregate = prepareDiagnosed();
  aggregate = applyPlan(aggregate, planTrustedRepairExposure({
    aggregate,
    exposureId: nextId(),
    occurredAt: "2026-08-17T00:03:00.000Z",
  }));
  return applyPlan(aggregate, planTrustedRepairSubmission({
    aggregate,
    fixture: selected,
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    artifactId: nextId(),
    body: repairBody,
    occurredAt: "2026-08-17T00:04:00.000Z",
  }));
}

function exactClaimInput(aggregate) {
  const anchor = fixture().anchors[0].calculationRelation;
  return {
    sourceRevisionId: aggregate.session.confirmedRevisionId,
    anchorId: anchor.anchorId,
    anchorVersionId: anchor.anchorVersionId,
    grossIncome: { value: 120000000, unit: "KRW_PER_YEAR" },
    operatingExpense: { value: 20000000, unit: "KRW_PER_YEAR" },
    operator: "SUBTRACT",
    operandOrder: ["gross_income", "operating_expense"],
    result: { value: 100000000, unit: "KRW_PER_YEAR" },
    sign: "POSITIVE",
    rounding: { mode: "HALF_UP", scale: 0, required: false },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

function exactClaim(aggregate) {
  return buildPracticeCalculationClaim({
    claim: exactClaimInput(aggregate),
    learnerConfirmedAt: "2026-08-17T00:05:00.000Z",
  });
}

test("C2R-C-P structural lineage freezes Practice v2 within the registered subject authority", () => {
  assert.deepEqual(TRUSTED_REPAIR_SUBJECTS, [
    "appraisal_practical",
    "appraisal_theory",
    "appraisal_law",
  ]);
  assert.equal(TRUSTED_REPAIR_CONTRACT_VERSION, "wcv_c2r_c_p_structured_practice_proof.v2");
  assert.equal(TRUSTED_REPAIR_VALIDATOR_VERSION, "validator:practice-calculation-claim@2");
  assert.equal(TRUSTED_REPAIR_FLAG, "WCV_C2R_C_P_PRACTICE_ENABLED");
  assert.equal(initialTrustedRepairStateData("TYPED_TEXT").structuredClaim, null);
});

test("exact closed claim passes and produces output-only canonical Korean", () => {
  const aggregate = prepareRepairSubmitted("자유서술 복구 답안은 후보 근거로만 저장됩니다.");
  const claim = exactClaim(aggregate);
  const evaluation = validatePracticeCalculationClaim({
    claim,
    anchor: fixture().anchors[0].calculationRelation,
    expectedSourceRevisionId: aggregate.session.confirmedRevisionId,
  });
  assert.deepEqual(evaluation.reasonCodes, []);
  assert.equal(evaluation.state, "PASS");
  assert.equal(evaluation.verified, true);
  assert.match(renderPracticeCalculationClaim(claim), /120,000,000원\/년.*20,000,000원\/년.*100,000,000원\/년/u);
});

test("complete episode verifies only after structured learner confirmation", () => {
  const aggregate = prepareRepairSubmitted("정확한 문장이더라도 자유서술 자체는 검증 권한이 없습니다.");
  const freeFormOnly = applyPlan(aggregate, planTrustedRepairContinuation({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    continuation: "VERIFY_AND_CONTINUE",
    exposureId: nextId(),
    occurredAt: "2026-08-17T00:05:00.000Z",
  }));
  assert.equal(freeFormOnly.session.state, "partial");
  assert.equal(freeFormOnly.session.stateData.proofEvaluation, null);
  assert.equal(freeFormOnly.session.stateData.structuredClaim, null);

  const verified = applyPlan(aggregate, planTrustedRepairStructuredClaimConfirmation({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    claim: exactClaim(aggregate),
  }));
  assert.equal(verified.session.state, "verified");
  assert.equal(verified.session.outcome, "verified");
  assert.equal(verified.session.stateData.proofEvaluation.verified, true);
  assert.equal(verified.session.stateData.structuredClaim.sourceRevisionId, aggregate.session.confirmedRevisionId);
  assert.ok(verified.session.stateData.resultReasonCodes.includes("no_mastery_transfer_stability_score_or_pass_claim"));
  assert.equal("mastery" in verified.session.stateData, false);
  assert.equal("transfer" in verified.session.stateData, false);
});

test("every Practice proof-obligation mutation fails closed", () => {
  const aggregate = prepareRepairSubmitted("구조화 필드 변이 검증용 자유서술입니다.");
  const base = exactClaim(aggregate);
  const mutations = [
    { ...base, sourceRevisionId: "40000000-0000-4000-8000-000000000001" },
    { ...base, anchorId: "repair-anchor:practice:other" },
    { ...base, anchorVersionId: "repair-anchor:practice:synthetic-net-income@2" },
    { ...base, grossIncome: { ...base.grossIncome, value: 120000001 } },
    { ...base, grossIncome: { ...base.grossIncome, unit: "KRW" } },
    { ...base, operatingExpense: { ...base.operatingExpense, value: 19999999 } },
    { ...base, operatingExpense: { ...base.operatingExpense, unit: "KRW" } },
    { ...base, operator: "ADD" },
    { ...base, operandOrder: ["operating_expense", "gross_income"] },
    { ...base, result: { ...base.result, value: 99999999 } },
    { ...base, result: { ...base.result, unit: "KRW" } },
    { ...base, sign: "NEGATIVE" },
    { ...base, rounding: { ...base.rounding, mode: "DOWN" } },
    { ...base, rounding: { ...base.rounding, scale: 1 } },
    { ...base, rounding: { ...base.rounding, required: true } },
    { ...base, learnerConfirmedAt: "not-a-time" },
  ];
  for (const claim of mutations) {
    const result = validatePracticeCalculationClaim({
      claim,
      anchor: fixture().anchors[0].calculationRelation,
      expectedSourceRevisionId: aggregate.session.confirmedRevisionId,
    });
    assert.notEqual(result.state, "PASS");
    assert.equal(result.verified, false);
    assert.ok(result.reasonCodes.length > 0);
  }
});

test("closed claim parser rejects missing, unknown, forged and malformed fields", () => {
  const aggregate = prepareRepairSubmitted("닫힌 입력 파서 검증용 자유서술입니다.");
  const valid = exactClaimInput(aggregate);
  assert.deepEqual(parsePracticeCalculationClaimV2Input(valid), valid);
  for (const invalid of [
    { ...valid, verified: true },
    { ...valid, PASS: true },
    { ...valid, mastery: "stable" },
    { ...valid, transfer: true },
    { ...valid, operator: "ADD" },
    { ...valid, operandOrder: ["gross_income"] },
    { ...valid, rounding: { ...valid.rounding, required: true } },
    { ...valid, confirmationMode: "AUTO_CONFIRMED" },
    Object.fromEntries(Object.entries(valid).filter(([key]) => key !== "result")),
  ]) {
    assert.throws(() => parsePracticeCalculationClaimV2Input(invalid), /invalid_input/u);
  }
});

test("JSON body scanner rejects duplicate keys at every object depth", () => {
  assert.deepEqual(parseJsonRejectingDuplicateKeys('{"action":"diagnose"}'), { action: "diagnose" });
  assert.throws(() => parseJsonRejectingDuplicateKeys('{"action":"diagnose","action":"start"}'), /invalid_input/u);
  assert.throws(() => parseJsonRejectingDuplicateKeys('{"claim":{"result":{"value":1,"value":2}}}'), /invalid_input/u);
  assert.throws(() => parseJsonRejectingDuplicateKeys('{"claim":{"rounding":{"mode":"HALF_UP","mode":"DOWN"}}}'), /invalid_input/u);
});

const hostileFreeFormMatrix = [
  "20,000,000 - 120,000,000 = -100,000,000",
  "총수익은 20,000,000원/년이고 운영비는 120,000,000원/년이다",
  "양수가 아니다", "양의 부호가 아니다", "순수익의 부호는 음이다", "순수익은 음의 수가 된다",
  "이 계산관계는 틀렸다", "이 답은 틀렸다", "이 결론은 거짓이다",
  "이 답은 정확하지 않다", "이 결론은 성립하지 않는다", "이 답은 타당하지 않다",
  "이 결론은 무효다", "이 답은 올바르지 않다",
  "반올림 없음이 아니다", "반올림하지 않은 것은 아니다", "반올림할 필요가 없지는 않다",
  "반올림이 필요하지 않다", "반올림할 필요가 없다", "반올림 0자리가 아니다",
  "최종 답은 90,000,000원/년이다", "최종치는 90,000,000원/년이다",
  "결과치는 90,000,000원/년이다", "결과값은 90,000,000원/년이다",
  "순수익은 −90,000,000원/년이다", "순수익은 − 90,000,000원/년이다",
  "순수익은 --90,000,000원/년이다", "순수익은 +-90,000,000원/년이다",
  "정답은 \"−100,000,000원/년\"이다", "정답은 ‘90,000,000원/년’이다",
  "정답은 「90,000,000원/년」이다", "정답은 『90,000,000원/년』이다",
  "정답은 (90,000,000원/년)이다", "정답은 [90,000,000원/년]이다",
  "정답은 <90,000,000원/년>이다", "정답은 ((90,000,000원/년))이다",
  "정답은 [90,000,000원/년\"이다", "정답은 「(90,000,000원/년]」이다",
  "１２０，０００，０００ － ２０，０００，０００ ＝ １００，０００，０００원／년",
  "120,000,000\t−\t20,000,000\n=\n100,000,000원/년",
  "순수익은 양수(+100,000,000원이 아니라 -100,000,000원/년)이다",
  "120,000,000 - 20,000,000 = 100,000,000원/년. 그러나 20,000,000 − 120,000,000 = −100,000,000원/년",
];

test("all PR 745-755 wording, sign, wrapper and negation families remain candidate-only", () => {
  for (const body of hostileFreeFormMatrix) {
    const aggregate = prepareRepairSubmitted(body);
    const result = applyPlan(aggregate, planTrustedRepairContinuation({
      aggregate,
      fixture: fixture(),
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-17T00:06:00.000Z",
    }));
    assert.equal(result.session.state, "partial", body);
    assert.equal(result.session.stateData.proofEvaluation, null, body);
    assert.equal(result.session.stateData.structuredClaim, null, body);
  }
});

test("display and free-form formatting cannot change one structured outcome", () => {
  const aggregate = prepareRepairSubmitted("형식 독립성 검증입니다.");
  const claim = exactClaim(aggregate);
  const baseline = validatePracticeCalculationClaim({
    claim,
    anchor: fixture().anchors[0].calculationRelation,
    expectedSourceRevisionId: aggregate.session.confirmedRevisionId,
  });
  for (const display of hostileFreeFormMatrix) {
    assert.equal(typeof display, "string");
    assert.deepEqual(validatePracticeCalculationClaim({
      claim,
      anchor: fixture().anchors[0].calculationRelation,
      expectedSourceRevisionId: aggregate.session.confirmedRevisionId,
    }), baseline);
  }
});

test("binding and source revision drift are stale and cannot release proof", () => {
  const aggregate = prepareRepairSubmitted("바인딩 드리프트 검증입니다.");
  const drifted = {
    ...aggregate,
    session: {
      ...aggregate.session,
      bindings: { ...aggregate.session.bindings, validatorVersion: "validator:other@9" },
    },
  };
  assert.equal(trustedRepairSourceBindingMatches({ aggregate: drifted, fixture: fixture(), sourceBinding: SYNTHETIC_SOURCE_BINDING }), false);
  assert.equal(planTrustedRepairSourceBindingDrift(drifted).nextState, "stale");
  const wrongRevisionClaim = { ...exactClaim(aggregate), sourceRevisionId: "40000000-0000-4000-8000-000000000001" };
  assert.equal(planTrustedRepairStructuredClaimConfirmation({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    claim: wrongRevisionClaim,
  }).nextState, "stale");
});

test("revision replacement clears proof and makes the outcome stale", () => {
  let aggregate = prepareRepairSubmitted("리비전 드리프트 검증입니다.");
  aggregate = applyPlan(aggregate, planTrustedRepairStructuredClaimConfirmation({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    claim: exactClaim(aggregate),
  }));
  const drift = planTrustedRepairRevisionDrift({
    aggregate,
    artifactId: nextId(),
    body: "변경된 수정본",
    occurredAt: "2026-08-17T00:07:00.000Z",
  });
  assert.equal(drift.nextState, "stale");
  assert.equal(drift.stateData.structuredClaim, null);
  assert.equal(drift.stateData.proofEvaluation, null);
});

test("rights-safe fixtures, banks, current windows and Gold separation remain exact", () => {
  assert.doesNotThrow(() => assertTrustedRepairFixtureInventory());
  assert.equal(
    TRUSTED_REPAIR_FIXTURES.filter(
      (entry) => entry.subject === "appraisal_practical",
    ).length,
    7,
  );
  assert.deepEqual(
    TRUSTED_REPAIR_GOLD_CANDIDATES.filter(
      (entry) => entry.subject === "appraisal_practical",
    )
      .map((entry) => entry.goldTier)
      .sort(),
    ["GOLDEN", "OWNER_GOLD"],
  );
  assert.equal(validateTrustedRepairFixtureEligibility(fixture(), RIGHTS_EVALUATED_AT).eligible, true);
  assert.equal(trustedRepairBankFirstSelection({ subject: "appraisal_practical", bank: "LEARNING", evaluatedAt: RIGHTS_EVALUATED_AT }).kind, "selected");
  assert.equal(trustedRepairBankFirstSelection({ subject: "appraisal_practical", bank: "TRANSFER", evaluatedAt: RIGHTS_EVALUATED_AT }).kind, "scarcity");
});

test("smallest scaffold selection, bounded partial retry and guided boundary remain exact", () => {
  let aggregate = prepareDiagnosed();
  aggregate = applyPlan(aggregate, planTrustedRepairExposure({ aggregate, exposureId: nextId(), occurredAt: "2026-08-17T00:03:00.000Z" }));
  assert.equal(selectTrustedRepairScaffoldExposure(aggregate)?.assistanceLevel, 1);
  aggregate = applyPlan(aggregate, planTrustedRepairSubmission({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    artifactId: nextId(),
    body: "구조화 확인 전 자유서술",
    occurredAt: "2026-08-17T00:04:00.000Z",
  }));
  aggregate = applyPlan(aggregate, planTrustedRepairStructuredClaimConfirmation({
    aggregate,
    fixture: fixture(),
    sourceBinding: SYNTHETIC_SOURCE_BINDING,
    claim: { ...exactClaim(aggregate), result: { value: 90000000, unit: "KRW_PER_YEAR" } },
  }));
  assert.equal(aggregate.session.state, "partial");
  assert.equal(trustedRepairPartialRetryAvailable(aggregate), true);
});
