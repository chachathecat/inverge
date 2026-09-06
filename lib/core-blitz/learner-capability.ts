import type { AnswerReviewStructureDraft } from "../evaluate/answer-review-structure";
import {
  classifyAssistanceV1,
  type AssistanceClass,
} from "./wave1";

export const LEARNER_ENTRY_CHOICES = Object.freeze([
  "TRY_FIRST",
  "ONE_HINT",
  "EASY_EXPLANATION",
  "FULL_SOLUTION",
  "DIRECT_ANSWER",
] as const);

export type LearnerEntryChoice = (typeof LEARNER_ENTRY_CHOICES)[number];

export const LEARNER_CAPABILITY_ERROR_CODES = Object.freeze([
  "INVALID_CHOICE",
  "INVALID_DRAFT",
] as const);

export type LearnerCapabilityErrorCode =
  (typeof LEARNER_CAPABILITY_ERROR_CODES)[number];

export class LearnerCapabilityError extends Error {
  readonly code: LearnerCapabilityErrorCode;

  constructor(code: LearnerCapabilityErrorCode) {
    super(`learner-capability:${code}`);
    this.name = "LearnerCapabilityError";
    this.code = code;
  }
}

const CHOICE_CONFIGURATION: Readonly<
  Record<
    LearnerEntryChoice,
    Readonly<{
      label: string;
      assistanceClass: AssistanceClass;
      disclosure:
        | "NONE"
        | "HINT"
        | "EASY_EXPLANATION"
        | "FULL_SOLUTION"
        | "DIRECT_ANSWER";
    }>
  >
> = Object.freeze({
  TRY_FIRST: Object.freeze({
    label: "내가 먼저 풀기",
    assistanceClass: "NONE",
    disclosure: "NONE",
  }),
  ONE_HINT: Object.freeze({
    label: "힌트 하나",
    assistanceClass: "MINIMAL_HINT",
    disclosure: "HINT",
  }),
  EASY_EXPLANATION: Object.freeze({
    label: "1타 쉬운풀이",
    assistanceClass: "EASY_EXPLANATION",
    disclosure: "EASY_EXPLANATION",
  }),
  FULL_SOLUTION: Object.freeze({
    label: "전체풀이",
    assistanceClass: "FULL_SOLUTION_REVEALED",
    disclosure: "FULL_SOLUTION",
  }),
  DIRECT_ANSWER: Object.freeze({
    label: "정답만 보기",
    assistanceClass: "DIRECT_ANSWER_REVEALED",
    disclosure: "DIRECT_ANSWER",
  }),
});

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function substantiveAnswer(value: unknown) {
  const normalized = clean(value);
  return normalized && !["-", "–", "—"].includes(normalized)
    ? normalized
    : null;
}

function unique(values: readonly unknown[]) {
  return Object.freeze(
    [...new Set(values.map(clean).filter(Boolean))],
  );
}

function assertDraft(value: unknown): asserts value is AnswerReviewStructureDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new LearnerCapabilityError("INVALID_DRAFT");
  }
}

export function resolveLearnerEntryChoiceV1(choice: LearnerEntryChoice) {
  if (!LEARNER_ENTRY_CHOICES.includes(choice)) {
    throw new LearnerCapabilityError("INVALID_CHOICE");
  }
  const configuration = CHOICE_CONFIGURATION[choice];
  const assistance = classifyAssistanceV1(configuration.assistanceClass);
  return Object.freeze({
    contractVersion: "DabangilLearnerEntryChoiceV1" as const,
    choice,
    label: configuration.label,
    disclosure: configuration.disclosure,
    assistanceClass: configuration.assistanceClass,
    independentAttemptEligible: assistance.independentAttemptEligible,
    sameItemMasteryEvidenceEligible:
      assistance.sameItemMasteryGainAllowed,
    transferEvidenceEligible: assistance.transferEvidenceEligible,
    masteryCreatedByChoice: false,
    transferCreatedByChoice: false,
    nextRequiredAction: assistance.requiresDistinctUnaidedAttempt
      ? ("DISTINCT_UNAIDED_ATTEMPT_REQUIRED" as const)
      : ("ATTEMPT_NOW" as const),
  });
}

export type LearnerSupportProjectionV1 = Readonly<{
  contractVersion: "DabangilLearnerSupportProjectionV1";
  choice: LearnerEntryChoice;
  assistanceClass: AssistanceClass;
  available: boolean;
  authority: "NONE" | "STRUCTURE_ONLY" | "SUPPLIED_REFERENCE";
  title: string;
  sections: readonly Readonly<{
    heading: string;
    items: readonly string[];
  }>[];
  notice: string;
  fullSolutionClaimAllowed: boolean;
  directAnswerClaimAllowed: boolean;
  requiresDistinctUnaidedAttempt: boolean;
}>;

export function projectLearnerSupportV1(input: Readonly<{
  choice: LearnerEntryChoice;
  draft: AnswerReviewStructureDraft;
  referenceAnswer?: string | null;
}>): LearnerSupportProjectionV1 {
  assertDraft(input.draft);
  const decision = resolveLearnerEntryChoiceV1(input.choice);
  const referenceAnswer = substantiveAnswer(input.referenceAnswer);
  const section = (heading: string, values: readonly unknown[]) => {
    const items = unique(values);
    return items.length > 0 ? Object.freeze({ heading, items }) : null;
  };

  if (input.choice === "TRY_FIRST") {
    return Object.freeze({
      contractVersion: "DabangilLearnerSupportProjectionV1",
      choice: input.choice,
      assistanceClass: decision.assistanceClass,
      available: true,
      authority: "NONE",
      title: "먼저 직접 시도합니다",
      sections: Object.freeze([]),
      notice: "아직 힌트나 풀이를 열지 않았습니다.",
      fullSolutionClaimAllowed: false,
      directAnswerClaimAllowed: false,
      requiresDistinctUnaidedAttempt: false,
    });
  }

  if (input.choice === "ONE_HINT") {
    const hint =
      clean(input.draft.examAnswerHints?.[0]) || clean(input.draft.nextAction);
    const sections = hint
      ? Object.freeze([
          Object.freeze({
            heading: "힌트 하나",
            items: Object.freeze([hint]),
          }),
        ])
      : Object.freeze([]);
    return Object.freeze({
      contractVersion: "DabangilLearnerSupportProjectionV1",
      choice: input.choice,
      assistanceClass: decision.assistanceClass,
      available: sections.length > 0,
      authority: "STRUCTURE_ONLY",
      title: "힌트 하나",
      sections,
      notice: "힌트를 본 시도는 독립 수행으로 계산하지 않습니다.",
      fullSolutionClaimAllowed: false,
      directAnswerClaimAllowed: false,
      requiresDistinctUnaidedAttempt: true,
    });
  }

  if (input.choice === "EASY_EXPLANATION") {
    const sections = Object.freeze(
      [
        section("쉽게 이해하기", [input.draft.plainExplanation]),
        section("핵심 용어", input.draft.keyTermExplanations ?? []),
        section("풀이 순서", input.draft.stepByStepExplanation ?? []),
      ].filter(
        (value): value is NonNullable<typeof value> => value !== null,
      ),
    );
    return Object.freeze({
      contractVersion: "DabangilLearnerSupportProjectionV1",
      choice: input.choice,
      assistanceClass: decision.assistanceClass,
      available: sections.length > 0,
      authority: "STRUCTURE_ONLY",
      title: "1타 쉬운풀이",
      sections,
      notice:
        "쉬운 풀이는 이해용입니다. 같은 문제의 독립 숙달이나 전이로 계산하지 않습니다.",
      fullSolutionClaimAllowed: false,
      directAnswerClaimAllowed: false,
      requiresDistinctUnaidedAttempt: true,
    });
  }

  if (input.choice === "DIRECT_ANSWER") {
    const sections = referenceAnswer
      ? Object.freeze([
          Object.freeze({
            heading: "정답",
            items: Object.freeze([referenceAnswer]),
          }),
        ])
      : Object.freeze([]);
    return Object.freeze({
      contractVersion: "DabangilLearnerSupportProjectionV1",
      choice: input.choice,
      assistanceClass: decision.assistanceClass,
      available: referenceAnswer !== null,
      authority: referenceAnswer ? "SUPPLIED_REFERENCE" : "NONE",
      title: "정답만 보기",
      sections,
      notice: referenceAnswer
        ? "정답을 본 시도는 독립 수행으로 계산하지 않습니다."
        : "확인된 기준답안이 없어 정답을 단정하지 않습니다.",
      fullSolutionClaimAllowed: false,
      directAnswerClaimAllowed: referenceAnswer !== null,
      requiresDistinctUnaidedAttempt: true,
    });
  }

  const sections = referenceAnswer
    ? Object.freeze(
        [
          section("정답", [referenceAnswer]),
          section("풀이 흐름", input.draft.stepByStepExplanation ?? []),
          section("시험답안식 구조", [input.draft.referenceStructure]),
          section("교정 예시", [input.draft.rewriteDraftSuggestion]),
          section("시험장에서 볼 것", input.draft.examAnswerHints ?? []),
        ].filter(
          (value): value is NonNullable<typeof value> => value !== null,
        ),
      )
    : Object.freeze([]);
  return Object.freeze({
    contractVersion: "DabangilLearnerSupportProjectionV1",
    choice: input.choice,
    assistanceClass: decision.assistanceClass,
    available: referenceAnswer !== null,
    authority: referenceAnswer ? "SUPPLIED_REFERENCE" : "NONE",
    title: "전체풀이",
    sections,
    notice: referenceAnswer
      ? "전체풀이를 본 시도는 독립 수행으로 계산하지 않습니다."
      : "확인된 기준답안이 없어 전체풀이를 제공하지 않습니다.",
    fullSolutionClaimAllowed: referenceAnswer !== null,
    directAnswerClaimAllowed: referenceAnswer !== null,
    requiresDistinctUnaidedAttempt: true,
  });
}
