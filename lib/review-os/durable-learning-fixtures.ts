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
      prompt: "D+1 합성 재현: 앵커 repair-anchor:practice:synthetic-net-income:d1에서 연간 총수익 120,000,000원과 연간 운영비 20,000,000원의 차감 결과·원/년 단위·양의 부호·반올림 없음을 닫힌 계산 관계로 구성하라.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:d1", grossIncome: 120000000, operatingExpense: 20000000, operator: "SUBTRACT", result: 100000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
    D7: {
      prompt: "D+7 봉인 전이 A: 앵커 repair-anchor:practice:synthetic-net-income:d7-transfer-a에서 연간 총수익 150,000,000원과 연간 운영비 35,000,000원의 차감 결과·원/년 단위·양의 부호·반올림 없음을 닫힌 계산 관계로 구성하라.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:d7-transfer-a", grossIncome: 150000000, operatingExpense: 35000000, operator: "SUBTRACT", result: 115000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
    TIMED: {
      prompt: "시간제한 합성 통합: 앵커 repair-anchor:practice:synthetic-net-income:timed에서 연간 총수익 96,000,000원과 연간 운영비 21,000,000원의 차감 결과·원/년 단위·양의 부호·반올림 없음을 제한시간 안에 닫힌 계산 관계로 구성하라.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:timed", grossIncome: 96000000, operatingExpense: 21000000, operator: "SUBTRACT", result: 75000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
    RECURRENCE: {
      prompt: "후속 합성 재발 검사 B: 앵커 repair-anchor:practice:synthetic-net-income:recurrence-b에서 연간 총수익 210,000,000원과 연간 운영비 55,000,000원의 차감 결과·원/년 단위·양의 부호·반올림 없음을 닫힌 계산 관계로 구성하라.",
      expectedCommitment: { kind: "PRACTICE_CALCULATION", anchorId: "repair-anchor:practice:synthetic-net-income:recurrence-b", grossIncome: 210000000, operatingExpense: 55000000, operator: "SUBTRACT", result: 155000000, unit: "KRW_PER_YEAR", sign: "POSITIVE", rounding: "NONE" },
    },
  },
  appraisal_theory: {
    D1: {
      prompt: "D+1 합성 재현: 앵커 repair-anchor:theory:synthetic-income-approach:d1, 목표 theory-target:synthetic-income-approach:d1에서 converts_expected_income_to_value를 긍정하고 금지 술어를 주장하지 않았음을 닫힌 범위로 구성하라.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:d1", targetScopeId: "theory-target:synthetic-income-approach:d1", requiredPredicate: "converts_expected_income_to_value", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
    D7: {
      prompt: "D+7 봉인 전이 A: 앵커 repair-anchor:theory:synthetic-income-approach:d7-transfer-a, 목표 theory-target:synthetic-direct-capitalization에서 capitalizes_stabilized_income_into_value를 긍정하고 금지 술어를 주장하지 않았음을 닫힌 범위로 구성하라.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:d7-transfer-a", targetScopeId: "theory-target:synthetic-direct-capitalization", requiredPredicate: "capitalizes_stabilized_income_into_value", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
    TIMED: {
      prompt: "시간제한 합성 통합: 앵커 repair-anchor:theory:synthetic-income-approach:timed, 목표 theory-target:synthetic-income-yield-integration에서 reconciles_income_stream_and_yield_into_value를 긍정하고 금지 술어를 주장하지 않았음을 닫힌 범위로 구성하라.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:timed", targetScopeId: "theory-target:synthetic-income-yield-integration", requiredPredicate: "reconciles_income_stream_and_yield_into_value", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
    RECURRENCE: {
      prompt: "후속 합성 재발 검사 B: 앵커 repair-anchor:theory:synthetic-income-approach:recurrence-b, 목표 theory-target:synthetic-income-risk-boundary에서 distinguishes_income_risk_before_value_conversion을 긍정하고 금지 술어를 주장하지 않았음을 닫힌 범위로 구성하라.",
      expectedCommitment: { kind: "THEORY_PREDICATE", anchorId: "repair-anchor:theory:synthetic-income-approach:recurrence-b", targetScopeId: "theory-target:synthetic-income-risk-boundary", requiredPredicate: "distinguishes_income_risk_before_value_conversion", forbiddenPredicateAsserted: false, polarity: "POSITIVE" },
    },
  },
  appraisal_law: {
    D1: {
      prompt: "D+1 합성 재현: repair-anchor:law:synthetic-article-10:d1을 law-source:synthetic-official-act@2026-01-01, law-anchor:synthetic-official-act:article-10@2026-01-01, Article 10, 적용일 2026-08-15, APPLICABLE_CURRENT, 차단 근거 0개에 정확히 결합하라.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-10:d1", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-01-01", lawAnchorId: "law-anchor:synthetic-official-act:article-10", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-10@2026-01-01", exactLocator: "Article 10", applicableAsOf: "2026-08-15", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
    D7: {
      prompt: "D+7 봉인 전이 A: repair-anchor:law:synthetic-article-12:d7-transfer-a를 law-source:synthetic-official-act@2026-04-01, law-anchor:synthetic-official-act:article-12@2026-04-01, Article 12, 적용일 2026-08-15, APPLICABLE_CURRENT, 차단 근거 0개에 정확히 결합하라.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-12:d7-transfer-a", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-04-01", lawAnchorId: "law-anchor:synthetic-official-act:article-12", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-12@2026-04-01", exactLocator: "Article 12", applicableAsOf: "2026-08-15", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
    TIMED: {
      prompt: "시간제한 합성 통합: repair-anchor:law:synthetic-article-15:timed를 law-source:synthetic-official-act@2026-07-01, law-anchor:synthetic-official-act:article-15@2026-07-01, Article 15, 적용일 2026-08-16, APPLICABLE_CURRENT, 차단 근거 0개에 정확히 결합하라.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-15:timed", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-07-01", lawAnchorId: "law-anchor:synthetic-official-act:article-15", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-15@2026-07-01", exactLocator: "Article 15", applicableAsOf: "2026-08-16", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
    RECURRENCE: {
      prompt: "후속 합성 재발 검사 B: repair-anchor:law:synthetic-article-18:recurrence-b를 law-source:synthetic-official-act@2026-08-01, law-anchor:synthetic-official-act:article-18@2026-08-01, Article 18, 적용일 2026-08-17, APPLICABLE_CURRENT, 차단 근거 0개에 정확히 결합하라.",
      expectedCommitment: { kind: "LAW_EXACT_APPLICABILITY", anchorId: "repair-anchor:law:synthetic-article-18:recurrence-b", sourceId: "law-source:synthetic-official-act", sourceVersionId: "law-source:synthetic-official-act@2026-08-01", lawAnchorId: "law-anchor:synthetic-official-act:article-18", lawAnchorVersionId: "law-anchor:synthetic-official-act:article-18@2026-08-01", exactLocator: "Article 18", applicableAsOf: "2026-08-17", currentness: "APPLICABLE_CURRENT", blockerCount: 0 },
    },
  },
} as const satisfies Record<TrustedRepairSubject, Record<DurableLearningFixtureStage, StageProof>>;

export function durableFixtureFor(input: {
  subject: TrustedRepairSubject;
  stage: DurableLearningFixtureStage;
  evaluatedAt: string;
}): DurableLearningFixture {
  const kind = KIND_BY_STAGE[input.stage];
  const fixture = TRUSTED_REPAIR_FIXTURES.find(
    (candidate) => candidate.subject === input.subject && candidate.kind === kind,
  );
  if (!fixture || !validateTrustedRepairFixtureEligibility(fixture, input.evaluatedAt).eligible) {
    throw new Error(`durable-learning:fixture-unavailable:${input.subject}:${input.stage}`);
  }
  const stageProof = STAGE_PROOFS[input.subject][input.stage];
  const subjectSlug = input.subject.replace("appraisal_", "");
  return {
    stage: input.stage,
    fixture,
    prompt: stageProof.prompt,
    expectedCommitment: stageProof.expectedCommitment,
    itemId: `wcv-c3:item:${subjectSlug}:${kind}`,
    itemRevisionId: `wcv-c3:item:${subjectSlug}:${kind}@2`,
    itemFamilyId:
      input.stage === "D1"
        ? `wcv-c3:family:${subjectSlug}:d0-same-item`
        : input.stage === "D7"
          ? `wcv-c3:family:${subjectSlug}:transfer-a`
          : input.stage === "TIMED"
            ? `wcv-c3:family:${subjectSlug}:timed-integration`
            : `wcv-c3:family:${subjectSlug}:transfer-b`,
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
): DurableSubjectCommitmentV1 {
  return STAGE_PROOFS[subject][stage].expectedCommitment;
}

export function durableCommitmentPasses(
  fixture: DurableLearningFixture,
  commitment: DurableSubjectCommitmentV1,
) {
  return JSON.stringify(commitment) === JSON.stringify(fixture.expectedCommitment);
}
