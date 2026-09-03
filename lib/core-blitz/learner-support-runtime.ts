import "server-only";

import crypto from "node:crypto";

import {
  CORE_BLITZ_WAVE1_CONTRACT_VERSION,
  classifyAssistanceV1,
  type AssistanceClass,
} from "./wave1";

export const LEARNER_SUPPORT_CHOICES_V1 = Object.freeze([
  "TRY_FIRST",
  "ONE_HINT",
  "EASY_EXPLANATION",
  "FULL_SOLUTION",
  "DIRECT_ANSWER",
] as const);

export type LearnerSupportChoiceV1 =
  (typeof LEARNER_SUPPORT_CHOICES_V1)[number];

export type LearnerSupportProjectionInputV1 = Readonly<{
  itemId: string;
  subject: string;
  choice: LearnerSupportChoiceV1;
  questionSummary: string;
  plainExplanation: string;
  keyTerms: readonly string[];
  stepByStep: readonly string[];
  examHints: readonly string[];
  suppliedReferenceAnswer: string | null;
}>;

export type LearnerSupportProjectionV1 = Readonly<{
  schemaVersion: typeof CORE_BLITZ_WAVE1_CONTRACT_VERSION;
  projectionId: string;
  itemId: string;
  subject: string;
  choice: LearnerSupportChoiceV1;
  assistanceClass: AssistanceClass;
  authority: "TRY_FIRST" | "STRUCTURE_ONLY" | "SUPPLIED_REFERENCE";
  title: string;
  body: readonly string[];
  independentAttemptEligible: boolean;
  sameItemMasteryGainAllowed: false | boolean;
  transferEvidenceEligible: false | boolean;
  requiresDistinctUnaidedAttempt: boolean;
  persisted: false;
}>;

const CHOICE_ASSISTANCE: Readonly<
  Record<LearnerSupportChoiceV1, AssistanceClass>
> = Object.freeze({
  TRY_FIRST: "NONE",
  ONE_HINT: "MINIMAL_HINT",
  EASY_EXPLANATION: "EASY_EXPLANATION",
  FULL_SOLUTION: "FULL_SOLUTION_REVEALED",
  DIRECT_ANSWER: "DIRECT_ANSWER_REVEALED",
});

function clean(value: unknown, maximum = 1_200) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/gu, " ").trim().slice(0, maximum);
}

function cleanList(values: readonly string[], maximumEntries = 8) {
  return Object.freeze(
    [...new Set(values.map((value) => clean(value)).filter(Boolean))].slice(
      0,
      maximumEntries,
    ),
  );
}

function projectionBody(input: LearnerSupportProjectionInputV1) {
  const reference = clean(input.suppliedReferenceAnswer, 4_000);
  const keyTerms = cleanList(input.keyTerms, 8);
  const steps = cleanList(input.stepByStep, 8);
  const hints = cleanList(input.examHints, 6);
  const plain = clean(input.plainExplanation, 1_500);
  const summary = clean(input.questionSummary, 1_500);

  if (input.choice === "TRY_FIRST") {
    return {
      authority: "TRY_FIRST" as const,
      title: "먼저 내 힘으로 풀기",
      body: Object.freeze([
        summary || "문제 요구를 확인하고 답을 보지 않은 채 먼저 시도하세요.",
        "막히면 한 번에 하나의 도움만 여세요.",
      ]),
    };
  }
  if (input.choice === "ONE_HINT") {
    return {
      authority: "STRUCTURE_ONLY" as const,
      title: "힌트 하나",
      body: Object.freeze([
        hints[0] ??
          keyTerms[0] ??
          plain ??
          "문제에서 요구하는 조건 하나를 먼저 표시하세요.",
      ]),
    };
  }
  if (input.choice === "EASY_EXPLANATION") {
    return {
      authority: "STRUCTURE_ONLY" as const,
      title: "1타 쉬운풀이",
      body: Object.freeze([
        plain || "문제의 조건을 작은 단계로 나누어 생각하세요.",
        ...(keyTerms.length > 0
          ? [`핵심말: ${keyTerms.join(" · ")}`]
          : []),
        ...steps.slice(0, 4),
      ]),
    };
  }
  if (input.choice === "FULL_SOLUTION") {
    if (reference) {
      return {
        authority: "SUPPLIED_REFERENCE" as const,
        title: "전체풀이",
        body: Object.freeze([
          reference,
          ...steps,
          ...hints.slice(0, 3),
        ]),
      };
    }
    return {
      authority: "STRUCTURE_ONLY" as const,
      title: "풀이 구조",
      body: Object.freeze([
        "확인된 기준답안이 없어 완성 정답으로 단정하지 않습니다.",
        ...steps,
        ...(hints.length > 0 ? hints : [plain]).filter(Boolean),
      ]),
    };
  }
  if (reference) {
    return {
      authority: "SUPPLIED_REFERENCE" as const,
      title: "정답만 보기",
      body: Object.freeze([reference]),
    };
  }
  return {
    authority: "STRUCTURE_ONLY" as const,
    title: "정답 근거 없음",
    body: Object.freeze([
      "확인된 기준답안이 없어 정답을 만들어 내지 않습니다.",
      ...(keyTerms.length > 0 ? [`확인할 핵심말: ${keyTerms.join(" · ")}`] : []),
    ]),
  };
}

export function createLearnerSupportProjectionV1(
  input: LearnerSupportProjectionInputV1,
): LearnerSupportProjectionV1 {
  if (
    !input ||
    !LEARNER_SUPPORT_CHOICES_V1.includes(input.choice) ||
    !clean(input.itemId, 256) ||
    !clean(input.subject, 256)
  ) {
    throw new Error("core-blitz:invalid-learner-support-input");
  }
  const assistanceClass = CHOICE_ASSISTANCE[input.choice];
  const assistance = classifyAssistanceV1(assistanceClass);
  const projection = projectionBody(input);
  const projectionId = `cbsp_${crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
        itemId: input.itemId,
        subject: input.subject,
        choice: input.choice,
        assistanceClass,
        authority: projection.authority,
        body: projection.body,
      }),
      "utf8",
    )
    .digest("hex")}`;

  return Object.freeze({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    projectionId,
    itemId: input.itemId,
    subject: input.subject,
    choice: input.choice,
    assistanceClass,
    authority: projection.authority,
    title: projection.title,
    body: projection.body,
    independentAttemptEligible: assistance.independentAttemptEligible,
    sameItemMasteryGainAllowed: assistance.sameItemMasteryGainAllowed,
    transferEvidenceEligible: assistance.transferEvidenceEligible,
    requiresDistinctUnaidedAttempt:
      assistance.requiresDistinctUnaidedAttempt,
    persisted: false,
  });
}
