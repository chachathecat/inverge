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
  evaluateConceptAssertionState,
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
  appraisal_practical: "수량 100m²와 단위가격 2000000원을 곱해 200000000원을 얻는다. 원 단위 양수이며 퍼센트 단위가 아니고 음수가 아니다. 반올림 없음으로 쓰고 역산하여 검산한다.",
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

const VERIFIED_LAW = {
  ...BLOCKED_LAW,
  bindingVersion: "synthetic-verified-law-binding",
  sourceStatus: "verified",
  versionStatus: "verified",
  currentLawStatus: "current_law_verified",
  blockerCount: 0,
};

const VERIFIED_LAW_WITH_OPEN_BLOCKER = {
  ...VERIFIED_LAW,
  blockerCount: 1,
};

const PRACTICE_STATE_DATA = {
  ...initialTrustedRepairStateData("TYPED_TEXT"),
  predictionConfidence: "medium",
};

function prepareRepairSubmittedJourney(subject, sourceBinding) {
  const fixture = trustedRepairCanonicalFixture(subject);
  let aggregate = aggregateFor(subject, "TYPED_TEXT", sourceBinding);
  aggregate = apply(
    aggregate,
    planTrustedRepairRevisionConfirmation({
      aggregate,
      artifactId: nextId(),
      body: "확정 수정본",
      occurredAt: "2026-08-12T00:01:00.000Z",
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
      body: "독립적으로 적은 근거가 있지만 핵심 기준 일부는 아직 빠져 있다.",
      occurredAt: "2026-08-12T00:02:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSelfDiagnosis({
      aggregate,
      selfDiagnosisCode: "missing_core_reason",
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
      occurredAt: "2026-08-12T00:03:00.000Z",
    }),
  );
  return apply(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture,
      sourceBinding,
      artifactId: nextId(),
      body: REPAIRS[subject],
      occurredAt: "2026-08-12T00:04:00.000Z",
    }),
  );
}

function verifyPreparedJourney(aggregate, subject, sourceBinding) {
  const fixture = trustedRepairCanonicalFixture(subject);
  return apply(
    aggregate,
    planTrustedRepairContinuation({
      aggregate,
      fixture,
      sourceBinding,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-12T00:05:00.000Z",
    }),
  );
}

test("C2 semantic bindings advance only the fixture and rubric to v2", () => {
  assert.equal(
    TRUSTED_REPAIR_FIXTURE_VERSION,
    "wcv_c2_rights_safe_fixtures.2026-08-12.v2",
  );
  assert.equal(
    TRUSTED_REPAIR_RUBRIC_VERSION,
    "wcv_c2_semantic_anchor_rubric.v2",
  );
  assert.equal(TRUSTED_REPAIR_CONTRACT_VERSION, "wcv_c2_trusted_repair.v1");
  assert.equal(
    TRUSTED_REPAIR_POLICY_VERSION,
    "wcv_c2_exposure_and_independence_policy.v1",
  );
  assert.equal(
    TRUSTED_REPAIR_VALIDATOR_VERSION,
    "wcv_c2_deterministic_subject_oracles.v1",
  );
});

test("one bounded assertion-state evaluator preserves polarity and occurrence precedence", () => {
  for (const [text, concept] of [
    ["퍼센트 단위가 아니다", "퍼센트 단위"],
    ["음수가 아니다", "음수"],
    ["20,000,000원이 아니다", "20000000"],
    ["수량이 아니다", "수량"],
    ["단위가격도 아니다", "단위가격"],
  ]) {
    assert.equal(evaluateConceptAssertionState(text, concept), "negated", text);
  }
  for (const [text, concept] of [
    ["퍼센트 단위다", "퍼센트 단위"],
    ["음수다", "음수"],
    ["20,000,000원이다", "20000000"],
    ["결과는 2억이다", "200000000"],
    ["단가는 200만원이다", "2000000"],
  ]) {
    assert.equal(evaluateConceptAssertionState(text, concept), "positive", text);
  }
  assert.equal(
    evaluateConceptAssertionState("음수인지 불확실하다", "음수"),
    "ambiguous",
  );
  assert.equal(
    evaluateConceptAssertionState(
      "반례 값은 음수가 아니다. 그러나 이 계산 결과는 음수다.",
      "음수",
    ),
    "positive",
  );
  assert.equal(
    evaluateConceptAssertionState("결과는 200,000,000원이다", "20000000"),
    "absent",
  );
});

test("complete semantic tokens reject lexical embedding while preserving Korean inflections and units", () => {
  for (const text of [
    "원인 분석",
    "원칙을 검토한다",
    "원가를 계산한다",
    "지원 대상",
    "회원 정보",
    "원화 금액",
  ]) {
    assert.equal(evaluateConceptAssertionState(text, "원"), "absent", text);
  }
  for (const text of [
    "200000000원이다",
    "원 단위 양수다",
    "원으로 표시한다",
    "결과 단위는 원이다",
  ]) {
    assert.equal(evaluateConceptAssertionState(text, "원"), "positive", text);
  }
  for (const [text, concept] of [
    ["최유효이용은", "최유효이용"],
    ["합리적이다", "합리적"],
    ["가능하다", "가능"],
    ["검산한다", "검산"],
    ["포섭한다", "포섭"],
    ["검증한다", "검증"],
    ["100m²와 단가", "m²"],
    ["법적·가능", "법적 가능"],
  ]) {
    assert.equal(evaluateConceptAssertionState(text, concept), "positive", text);
  }
  assert.equal(
    evaluateConceptAssertionState("원 단위가 아니다", "원"),
    "negated",
  );
  assert.equal(
    evaluateConceptAssertionState("m² 단위가 아니다", "m²"),
    "negated",
  );
  assert.equal(
    evaluateConceptAssertionState("원 단위인지 불확실하다", "원"),
    "ambiguous",
  );
  assert.equal(evaluateConceptAssertionState("수량화 과정", "수량"), "absent");
  assert.equal(
    evaluateConceptAssertionState("퍼센트 단위화", "퍼센트 단위"),
    "absent",
  );
});

test("same-clause polarity conflicts fail closed after every occurrence is inspected", () => {
  assert.equal(
    evaluateConceptAssertionState(
      "최유효이용은 합리적이지만 합리적이지 않고 가능하다",
      "합리적",
    ),
    "ambiguous",
  );
  assert.equal(
    evaluateConceptAssertionState(
      "최유효이용은 합리적이지 않지만 합리적이라고도 쓰고 가능하다",
      "합리적",
    ),
    "ambiguous",
  );
  assert.equal(
    evaluateConceptAssertionState(
      "최유효이용은 합리적이지만 합리적인지 불확실하다",
      "합리적",
    ),
    "ambiguous",
  );
  assert.equal(
    evaluateConceptAssertionState("합리적이고 합리적이다", "합리적"),
    "positive",
  );
  assert.equal(
    evaluateConceptAssertionState(
      "반례 이용은 합리적이지 않다. 최유효이용은 합리적이다.",
      "합리적",
    ),
    "positive",
  );
});

test("an unrelated currency substring stays missing and cannot satisfy the Practical unit anchor", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const diagnosis = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "수량 100m²와 단위가격 2000000을 곱해 200000000을 얻는다. m² 단위 양수이며 오류 원인을 점검한다. 반올림 없음으로 쓰고 역산하여 검산한다.",
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(diagnosis.repairNeed, "required");
  assert.equal(
    diagnosis.primary.gapId,
    "gap-practice-unit-rounding-verification",
  );
  assert.ok(
    diagnosis.primary.supportingEvidence.includes(
      "independent_attempt:practice-unit-rounding-verification:missing:원",
    ),
  );
  const canonical = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText: REPAIRS.appraisal_practical,
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(canonical.repairNeed, "optional");
});

test("a contradictory same-clause Theory repair remains partial with ambiguous diagnostic evidence", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_theory");
  const contradictoryRepair =
    "최유효이용은 합리적이지만 합리적이지 않고 가능하다";
  const diagnosis = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText: contradictoryRepair,
    stateData: PRACTICE_STATE_DATA,
  });
  const definitionGap = diagnosis.candidates.find(
    (candidate) => candidate.anchorId === "theory-exact-definition",
  );
  assert.ok(definitionGap);
  assert.ok(
    definitionGap.supportingEvidence.includes(
      "independent_attempt:theory-exact-definition:required_ambiguous_no_support:합리적",
    ),
  );

  let aggregate = aggregateFor("appraisal_theory");
  aggregate = apply(
    aggregate,
    planTrustedRepairRevisionConfirmation({
      aggregate,
      artifactId: nextId(),
      body: "합성 확정 수정본",
      occurredAt: "2026-08-12T00:10:00.000Z",
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
      body: "법적·물리적·경제적 가능성을 사례와 반대 사실에 적용한다.",
      occurredAt: "2026-08-12T00:11:00.000Z",
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
    planTrustedRepairDiagnosis({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairExposure({
      aggregate,
      exposureId: nextId(),
      occurredAt: "2026-08-12T00:12:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairSubmission({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      artifactId: nextId(),
      body: contradictoryRepair,
      occurredAt: "2026-08-12T00:13:00.000Z",
    }),
  );
  aggregate = apply(
    aggregate,
    planTrustedRepairContinuation({
      aggregate,
      fixture,
      sourceBinding: SYNTHETIC_SOURCE_BINDING,
      continuation: "VERIFY_AND_CONTINUE",
      exposureId: nextId(),
      occurredAt: "2026-08-12T00:14:00.000Z",
    }),
  );
  assert.equal(aggregate.session.state, "partial");
  assert.equal(aggregate.session.outcome, "partial");
  assert.ok(
    aggregate.session.stateData.resultReasonCodes.includes(
      "same_session_primary_criterion_not_yet_passed",
    ),
  );
});

test("negated or ambiguous forbidden claims remain diagnostic and never manufacture a block", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const validWithNegations = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText: REPAIRS.appraisal_practical,
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(validWithNegations.repairNeed, "optional");
  assert.ok(
    validWithNegations.candidates[0].counterEvidence.includes(
      "independent_attempt:practice-unit-rounding-verification:forbidden_claim_negated_ignored:퍼센트 단위",
    ),
  );
  assert.ok(
    validWithNegations.candidates[0].counterEvidence.includes(
      "independent_attempt:practice-unit-rounding-verification:forbidden_claim_negated_ignored:음수",
    ),
  );

  const positiveForbiddenClaims = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "수량 100m²와 단위가격 2000000원을 곱해 200000000원을 얻는다. 원 단위 양수이며 퍼센트 단위다. 음수다. 반올림 없음으로 쓰고 역산하여 검산한다.",
    stateData: PRACTICE_STATE_DATA,
  });
  const unitGap = positiveForbiddenClaims.candidates.find(
    (candidate) =>
      candidate.anchorId === "practice-unit-rounding-verification",
  );
  assert.ok(unitGap);
  assert.ok(
    unitGap.supportingEvidence.includes(
      "independent_attempt:practice-unit-rounding-verification:false_claim:퍼센트 단위",
    ),
  );
  assert.ok(
    unitGap.supportingEvidence.includes(
      "independent_attempt:practice-unit-rounding-verification:false_claim:음수",
    ),
  );

  const ambiguousForbiddenClaim = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "수량 100m²와 단위가격 2000000원을 곱해 200000000원을 얻는다. 원 단위 양수이며 퍼센트 단위가 아니다. 음수인지 불확실하다. 반올림 없음으로 쓰고 역산하여 검산한다.",
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(ambiguousForbiddenClaim.repairNeed, "optional");
  assert.ok(
    ambiguousForbiddenClaim.candidates[0].counterEvidence.includes(
      "independent_attempt:practice-unit-rounding-verification:forbidden_claim_ambiguous_ignored:음수",
    ),
  );

  const missingConcepts = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText: "퍼센트 단위가 아니다. 음수가 아니다. 필요한 산식은 아직 쓰지 않았다.",
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(missingConcepts.repairNeed, "required");
  assert.ok(
    missingConcepts.candidates.some((candidate) =>
      candidate.supportingEvidence.some((item) => item.includes(":missing:")),
    ),
  );
});

test("acceptable alternatives satisfy only their explicit required-concept mappings", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const mapped = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText: "수량 100m²와 단위가격 2,000,000원을 곱한다",
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(
    mapped.candidates.some(
      (candidate) => candidate.anchorId === "practice-input-role",
    ),
    false,
  );

  for (const [attemptText, expectedMissing] of [
    ["수량 100m²로 계산하지만 가격 역할은 아직 정하지 않았다", "단가"],
    ["단위가격 2,000,000원을 쓰지만 투입 면은 아직 정하지 않았다", "면적"],
    ["수량이 아니다. 단위가격도 아니다. 산식 역할을 다시 정해야 한다", "면적"],
    ["면적 100m²와 가격 2,000,000원을 사용한다", "단가"],
  ]) {
    const diagnosis = diagnoseTrustedRepairAttempt({
      fixture,
      attemptText,
      stateData: PRACTICE_STATE_DATA,
    });
    const inputRoleGap = diagnosis.candidates.find(
      (candidate) => candidate.anchorId === "practice-input-role",
    );
    assert.ok(inputRoleGap, attemptText);
    assert.ok(
      inputRoleGap.supportingEvidence.includes(
        `independent_attempt:practice-input-role:missing:${expectedMissing}`,
      ),
      attemptText,
    );
  }
});

test("one explicit alternative may satisfy multiple concepts only when mapped to each", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_compensation_law");
  const diagnosis = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "공식 출처의 시행 기준일을 확인한다. 사안을 요건에 해당시킨다. 출처가 불확실하면 확인 필요하다는 결론을 낸다.",
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(
    diagnosis.candidates.some(
      (candidate) => candidate.anchorId === "law-conflict-withhold",
    ),
    false,
  );
});

test("an explicitly rejected wrong numeric claim does not block a positive correct value", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const diagnosis = diagnoseTrustedRepairAttempt({
    fixture,
    attemptText:
      "수량 100m²와 단위가격 2,000,000원을 곱한다. 결과는 20,000,000원이 아니다. 200,000,000원을 얻는다. 원 단위 양수이며 퍼센트 단위가 아니고 음수가 아니다. 반올림 없음으로 쓰고 역산하여 검산한다.",
    stateData: PRACTICE_STATE_DATA,
  });
  assert.equal(diagnosis.repairNeed, "optional");
  assert.equal(
    diagnosis.candidates.some(
      (candidate) =>
        candidate.anchorId === "practice-intermediate-calculation",
    ),
    false,
  );
  assert.ok(
    diagnosis.candidates[0].counterEvidence.includes(
      "independent_attempt:practice-intermediate-calculation:forbidden_claim_negated_ignored:20000000",
    ),
  );
});

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

test("Law verification requires zero active blockers while Practice and Theory remain unchanged", () => {
  const verifiedLaw = verifyPreparedJourney(
    prepareRepairSubmittedJourney(
      "appraisal_compensation_law",
      VERIFIED_LAW,
    ),
    "appraisal_compensation_law",
    VERIFIED_LAW,
  );
  assert.equal(verifiedLaw.session.state, "verified");
  assert.equal(verifiedLaw.session.outcome, "verified");
  assert.ok(
    verifiedLaw.session.stateData.resultReasonCodes.includes(
      "same_session_primary_criterion_passed",
    ),
  );

  const blockedLaw = verifyPreparedJourney(
    prepareRepairSubmittedJourney(
      "appraisal_compensation_law",
      VERIFIED_LAW_WITH_OPEN_BLOCKER,
    ),
    "appraisal_compensation_law",
    VERIFIED_LAW_WITH_OPEN_BLOCKER,
  );
  assert.equal(blockedLaw.session.state, "blocked");
  assert.equal(blockedLaw.session.outcome, "blocked");
  assert.ok(
    blockedLaw.session.stateData.resultReasonCodes.includes(
      "law_source_currentness_unverified",
    ),
  );

  for (const subject of ["appraisal_practical", "appraisal_theory"]) {
    const aggregate = verifyPreparedJourney(
      prepareRepairSubmittedJourney(subject, SYNTHETIC_SOURCE_BINDING),
      subject,
      SYNTHETIC_SOURCE_BINDING,
    );
    assert.equal(aggregate.session.outcome, "verified", subject);
    assert.ok(
      aggregate.session.stateData.resultReasonCodes.includes(
        "no_mastery_transfer_stability_score_or_pass_claim",
      ),
      subject,
    );
  }
  assert.ok(
    verifiedLaw.session.stateData.resultReasonCodes.includes(
      "no_mastery_transfer_stability_score_or_pass_claim",
    ),
  );
});

test("an open-blocker Law session fails closed when the current binding reaches zero blockers", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_compensation_law");
  const aggregate = prepareRepairSubmittedJourney(
    "appraisal_compensation_law",
    VERIFIED_LAW_WITH_OPEN_BLOCKER,
  );
  const persistedSourceVersion = aggregate.session.bindings.sourceVersion;

  assert.equal(
    persistedSourceVersion,
    trustedRepairSourceVersion(fixture, VERIFIED_LAW_WITH_OPEN_BLOCKER),
  );
  assert.notEqual(
    persistedSourceVersion,
    trustedRepairSourceVersion(fixture, VERIFIED_LAW),
  );
  assert.equal(
    trustedRepairSourceBindingMatches({
      aggregate,
      fixture,
      sourceBinding: VERIFIED_LAW,
    }),
    false,
  );

  const driftPlan = planTrustedRepairContinuation({
    aggregate,
    fixture,
    sourceBinding: VERIFIED_LAW,
    continuation: "VERIFY_AND_CONTINUE",
    exposureId: nextId(),
    occurredAt: "2026-08-12T00:06:00.000Z",
  });
  const blocked = apply(aggregate, driftPlan);
  assert.equal(blocked.session.state, "blocked");
  assert.equal(blocked.session.outcome, "blocked");
  assert.equal(blocked.session.bindings.sourceVersion, persistedSourceVersion);
  assert.deepEqual(blocked.session.stateData.resultReasonCodes, [
    "source_binding_version_drift",
    "verified_release_denied_until_new_session_diagnosis",
  ]);
  assert.equal(driftPlan.exposure, null);
  assert.equal(driftPlan.artifact, null);
});

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
