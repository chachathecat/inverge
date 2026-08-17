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
  const subjectSlug = input.subject.replace("appraisal_", "");
  return {
    stage: input.stage,
    fixture,
    itemId: `wcv-c3:item:${subjectSlug}:${kind}`,
    itemRevisionId: `wcv-c3:item:${subjectSlug}:${kind}@1`,
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

export function expectedCommitmentForSubject(
  subject: TrustedRepairSubject,
): DurableSubjectCommitmentV1 {
  if (subject === "appraisal_practical") {
    return {
      kind: "PRACTICE_CALCULATION",
      anchorId: "repair-anchor:practice:synthetic-net-income",
      grossIncome: 120000000,
      operatingExpense: 20000000,
      operator: "SUBTRACT",
      result: 100000000,
      unit: "KRW_PER_YEAR",
      sign: "POSITIVE",
      rounding: "NONE",
    };
  }
  if (subject === "appraisal_theory") {
    return {
      kind: "THEORY_PREDICATE",
      anchorId: "repair-anchor:theory:synthetic-income-approach",
      targetScopeId: "theory-target:synthetic-income-approach",
      requiredPredicate: "converts_expected_income_to_value",
      forbiddenPredicateAsserted: false,
      polarity: "POSITIVE",
    };
  }
  return {
    kind: "LAW_EXACT_APPLICABILITY",
    anchorId: "repair-anchor:law:synthetic-article-10",
    sourceId: "law-source:synthetic-official-act",
    sourceVersionId: "law-source:synthetic-official-act@2026-01-01",
    lawAnchorId: "law-anchor:synthetic-official-act:article-10",
    lawAnchorVersionId: "law-anchor:synthetic-official-act:article-10@2026-01-01",
    exactLocator: "Article 10",
    applicableAsOf: "2026-08-15",
    currentness: "APPLICABLE_CURRENT",
    blockerCount: 0,
  };
}

export function durableCommitmentPasses(
  subject: TrustedRepairSubject,
  commitment: DurableSubjectCommitmentV1,
) {
  return JSON.stringify(commitment) === JSON.stringify(expectedCommitmentForSubject(subject));
}
