import type {
  DurableLearningAggregate,
  DurableSubjectCommitmentV1,
  TransferDistanceV1,
} from "./durable-learning-contract";
import type { TrustedRepairFixture, TrustedRepairSubject } from "./trusted-repair-contract";
import {
  TRUSTED_REPAIR_FIXTURES,
  validateTrustedRepairFixtureEligibility,
} from "./trusted-repair-fixtures";

export type DurableLearningFixtureStage = "D1" | "D7" | "TIMED" | "RECURRENCE";

export type DurableLearningFixture = Readonly<{
  stage: DurableLearningFixtureStage;
  attemptOrdinal: number;
  fixture: TrustedRepairFixture;
  prompt: string;
  expectedCommitment: DurableSubjectCommitmentV1;
  itemId: string;
  itemRevisionId: string;
  itemFamilyId: string;
  transferDistance: TransferDistanceV1;
  representation: "TYPED_STRUCTURED";
  timeLimitSeconds: number | null;
  minimumElapsedSeconds: number;
}>;

const KIND_BY_STAGE = {
  D1: "canonical",
  D7: "sealed_future_variant_a",
  TIMED: "timed_integration",
  RECURRENCE: "sealed_future_variant_b",
} as const;

const DISTANCE_BY_STAGE = {
  D1: "SAME_ITEM",
  D7: "NEAR_TRANSFER",
  TIMED: "TIMED_INTEGRATION",
  RECURRENCE: "REPRESENTATION_TRANSFER",
} as const satisfies Record<DurableLearningFixtureStage, TransferDistanceV1>;

type StageProof = Readonly<{
  prompt: string;
  expectedCommitment: DurableSubjectCommitmentV1;
}>;

const STAGE_PROOFS = {
  appraisal_practical: {
    D1: {
      prompt: "D+1 합성 재현: 연간 총수익 120,000,000원과 연간 운영비 20,000,000원으로 순수익 계산 관계를 독립적으로 구성하라. 정답 앵커·결과·단위·부호·반올림 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:d1", grossIncome: 120000000, operatingExpense: 20000000, operator: "SUBTRACT", result: 100000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
    D7: {
      prompt: "D+7 봉인 전이 A: 연간 총수익 150,000,000원과 연간 운영비 35,000,000원으로 순수익 계산 관계를 독립적으로 구성하라. 정답 앵커·결과·단위·부호·반올림 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:d7-transfer-a", grossIncome: 150000000, operatingExpense: 35000000, operator: "SUBTRACT", result: 115000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
    TIMED: {
      prompt: "시간제한 합성 통합: 연간 총수익 96,000,000원과 연간 운영비 21,000,000원으로 순수익 계산 관계를 제한시간 안에 독립적으로 구성하라. 정답 앵커·결과·단위·부호·반올림 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:timed", grossIncome: 96000000, operatingExpense: 21000000, operator: "SUBTRACT", result: 75000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
    RECURRENCE: {
      prompt: "후속 합성 재발 검사 B: 연간 총수익 210,000,000원과 연간 운영비 55,000,000원으로 순수익 계산 관계를 독립적으로 구성하라. 정답 앵커·결과·단위·부호·반올림 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:recurrence-b", grossIncome: 210000000, operatingExpense: 55000000, operator: "SUBTRACT", result: 155000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
  },
  appraisal_theory: {
    D1: {
      prompt: "D+1 합성 재현: 예상소득을 사용하는 수익방식 상황에서 소득과 가치 사이의 핵심 관계를 하나의 정확한 대상 범위 안에서 독립적으로 구조화하라. 정답 식별자·술어·극성 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:d1", targetScopeId: "theory-target:synthetic-income-approach:d1", requiredPredicate: "converts_expected_income_to_value", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
    D7: {
      prompt: "D+7 봉인 전이 A: 안정화된 소득이 제시된 직접환원 상황을 분석해 가치 형성의 핵심 관계를 하나의 정확한 대상 범위 안에서 독립적으로 구조화하라. 정답 식별자·술어·극성 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:d7-transfer-a", targetScopeId: "theory-target:synthetic-direct-capitalization", requiredPredicate: "capitalizes_stabilized_income_into_value", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
    TIMED: {
      prompt: "시간제한 합성 통합: 소득흐름과 수익률을 함께 고려해야 하는 상황에서 가치 도출의 핵심 관계를 제한시간 안에 하나의 정확한 대상 범위로 구조화하라. 정답 식별자·술어·극성 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:timed", targetScopeId: "theory-target:synthetic-income-yield-integration", requiredPredicate: "reconciles_income_stream_and_yield_into_value", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
    RECURRENCE: {
      prompt: "후속 합성 재발 검사 B: 위험 조건이 서로 다른 소득흐름이 제시된 상황에서 가치 전환 전에 필요한 경계 관계를 하나의 정확한 대상 범위로 독립적으로 구조화하라. 정답 식별자·술어·극성 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:recurrence-b", targetScopeId: "theory-target:synthetic-income-risk-boundary", requiredPredicate: "distinguishes_income_risk_before_value_conversion", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
  },
  appraisal_law: {
    D1: {
      prompt: "D+1 합성 재현: 같은 세션에서 복구한 합성 법규 적용관계를 출처·버전·조문 앵커·정확 위치·적용 기준일·현재성·차단 상태까지 독립적으로 재구성하라. 모든 정답 결합 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-10:d1", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-01-01", lawAnchorId: "law-anchor:synthetic-official-act:article-10", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-10@2026-01-01", exactLocator: "Article 10", applicableAsOf: "2026-08-15", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
    D7: {
      prompt: "D+7 봉인 전이 A: 개정 시점이 다른 봉인 합성 법규 적용관계를 출처·버전·조문 앵커·정확 위치·적용 기준일·현재성·차단 상태까지 독립적으로 재구성하라. 모든 정답 결합 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-12:d7-transfer-a", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-04-01", lawAnchorId: "law-anchor:synthetic-official-act:article-12", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-12@2026-04-01", exactLocator: "Article 12", applicableAsOf: "2026-08-15", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
    TIMED: {
      prompt: "시간제한 합성 통합: 시간제한 안에 합성 법규의 적용관계를 출처·버전·조문 앵커·정확 위치·적용 기준일·현재성·차단 상태까지 독립적으로 재구성하라. 모든 정답 결합 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-15:timed", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-07-01", lawAnchorId: "law-anchor:synthetic-official-act:article-15", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-15@2026-07-01", exactLocator: "Article 15", applicableAsOf: "2026-08-16", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
    RECURRENCE: {
      prompt: "후속 합성 재발 검사 B: 후속 합성 법규 적용관계를 출처·버전·조문 앵커·정확 위치·적용 기준일·현재성·차단 상태까지 독립적으로 재구성하라. 모든 정답 결합 값은 제출 전 제공되지 않는다.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-18:recurrence-b", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-08-01", lawAnchorId: "law-anchor:synthetic-official-act:article-18", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-18@2026-08-01", exactLocator: "Article 18", applicableAsOf: "2026-08-17", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
  },
} as const satisfies Record<TrustedRepairSubject, Record<DurableLearningFixtureStage, StageProof>>;

function stageProofForAttempt(
  subject: TrustedRepairSubject,
  stage: DurableLearningFixtureStage,
  attemptOrdinal: number,
): StageProof {
  if (!Number.isSafeInteger(attemptOrdinal) || attemptOrdinal < 1) {
    throw new Error("durable-learning:invalid-attempt-ordinal");
  }
  const base = STAGE_PROOFS[subject][stage];
  if (attemptOrdinal === 1 || stage === "D1") return base;
  const retry = `retry-${attemptOrdinal}`;
  if (base.expectedCommitment.kind === "PRACTICE_CALCULATION") {
    const shift = (attemptOrdinal - 1) % 1000;
    const grossIncome = base.expectedCommitment.grossIncome + shift * 1_000_000;
    const operatingExpense = base.expectedCommitment.operatingExpense + shift * 100_000;
    const expectedCommitment = {
      ...base.expectedCommitment,
      anchorId: `${base.expectedCommitment.anchorId}:${retry}`,
      grossIncome,
      operatingExpense,
      result: grossIncome - operatingExpense,
    } as const;
    return {
      expectedCommitment,
      prompt: `새 합성 재시도 ${attemptOrdinal}: 연간 총수익 ${grossIncome}원과 연간 운영비 ${operatingExpense}원으로 순수익 계산 관계를 독립적으로 구성하라. 새 정답 앵커·결과·단위·부호·반올림 값은 제출 전 제공되지 않는다.`,
    };
  }
  if (base.expectedCommitment.kind === "THEORY_PREDICATE") {
    const expectedCommitment = {
      ...base.expectedCommitment,
      anchorId: `${base.expectedCommitment.anchorId}:${retry}`,
      targetScopeId: `${base.expectedCommitment.targetScopeId}:${retry}`,
      requiredPredicate: `${base.expectedCommitment.requiredPredicate}_${retry.replace("-", "_")}`,
    } as const;
    return {
      expectedCommitment,
      prompt: `새 합성 재시도 ${attemptOrdinal}: ${base.prompt} 이전 시도의 모든 정답 식별자와 술어 값은 폐기되었다.`,
    };
  }
  const expectedCommitment = {
    ...base.expectedCommitment,
    anchorId: `${base.expectedCommitment.anchorId}:${retry}`,
    sourceVersionId: `${base.expectedCommitment.sourceVersionId}:${retry}`,
    lawAnchorId: `${base.expectedCommitment.lawAnchorId}:${retry}`,
    lawAnchorVersionId: `${base.expectedCommitment.lawAnchorVersionId}:${retry}`,
    exactLocator: `${base.expectedCommitment.exactLocator} synthetic ${retry}`,
  } as const;
  return {
    expectedCommitment,
    prompt: `새 합성 재시도 ${attemptOrdinal}: ${base.prompt} 이전 시도의 모든 정답 결합 값은 폐기되었다.`,
  };
}

export function durableFixtureFor(input: {
  subject: TrustedRepairSubject;
  stage: DurableLearningFixtureStage;
  evaluatedAt: string;
  attemptOrdinal?: number;
}): DurableLearningFixture {
  const attemptOrdinal = input.attemptOrdinal ?? 1;
  const kind = KIND_BY_STAGE[input.stage];
  const fixture = TRUSTED_REPAIR_FIXTURES.find(
    (candidate) => candidate.subject === input.subject && candidate.kind === kind,
  );
  if (!fixture || !validateTrustedRepairFixtureEligibility(fixture, input.evaluatedAt).eligible) {
    throw new Error(`durable-learning:fixture-unavailable:${input.subject}:${input.stage}`);
  }
  const stageProof = stageProofForAttempt(input.subject, input.stage, attemptOrdinal);
  const subjectSlug = input.subject.replace("appraisal_", "");
  const attemptSuffix = input.stage === "D1" || attemptOrdinal === 1
    ? ""
    : `:attempt-${attemptOrdinal}`;
  const baseItemFamilyId =
    input.stage === "D1"
      ? `wcv-c3:family:${subjectSlug}:d0-same-item`
      : input.stage === "D7"
        ? `wcv-c3:family:${subjectSlug}:transfer-a`
        : input.stage === "TIMED"
          ? `wcv-c3:family:${subjectSlug}:timed-integration`
          : `wcv-c3:family:${subjectSlug}:transfer-b`;
  return {
    stage: input.stage,
    attemptOrdinal,
    fixture,
    prompt: stageProof.prompt,
    expectedCommitment: stageProof.expectedCommitment,
    itemId: `wcv-c3:item:${subjectSlug}:${kind}${attemptSuffix}`,
    itemRevisionId: `wcv-c3:item:${subjectSlug}:${kind}@2${attemptSuffix}`,
    itemFamilyId: `${baseItemFamilyId}${attemptSuffix}`,
    transferDistance: DISTANCE_BY_STAGE[input.stage],
    representation: "TYPED_STRUCTURED",
    timeLimitSeconds: input.stage === "TIMED" ? 1800 : null,
    minimumElapsedSeconds: input.stage === "TIMED" ? 60 : 1,
  };
}

export function nextDurableFixtureStage(
  aggregate: DurableLearningAggregate,
): DurableLearningFixtureStage {
  const state = aggregate.caseRecord.state;
  if (state === "REPAIR_VERIFIED_SAME_SESSION" || state === "REOPENED") return "D1";
  if (state === "D1_REPRODUCED") return "D7";
  if (state === "D7_TRANSFER_OBSERVED") return "TIMED";
  if (state === "CURRENTLY_CLEAR") return "RECURRENCE";
  throw new Error(`durable-learning:no-next-fixture:${state}`);
}

export function expectedCommitmentForFixture(
  subject: TrustedRepairSubject,
  stage: DurableLearningFixtureStage,
  attemptOrdinal = 1,
): DurableSubjectCommitmentV1 {
  return stageProofForAttempt(subject, stage, attemptOrdinal).expectedCommitment;
}

export function durableCommitmentPasses(
  fixture: DurableLearningFixture,
  commitment: DurableSubjectCommitmentV1,
) {
  return JSON.stringify(commitment) === JSON.stringify(fixture.expectedCommitment);
}
