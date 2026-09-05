import assert from "node:assert/strict";
import test from "node:test";

import {
  projectLearnerSupportV1,
  resolveLearnerEntryChoiceV1,
} from "../lib/core-blitz/learner-capability.ts";

const draft = {
  questionSummary: "문제 요약",
  coreConcepts: ["수익환원법", "순수익"],
  requiredIssues: "순수익을 먼저 계산합니다.",
  userAnswerSummary: "내 답안",
  userAnswerStructure: "구조",
  referenceStructure: "총수익 → 운영비 차감 → 순수익",
  strengths: ["총수익을 확인했습니다."],
  missingIssueCandidates: [],
  weakParagraphPoint: "단위 확인",
  weakLogicPoint: "차감 순서",
  rewriteTarget: "계산 문단",
  rewriteDraftSuggestion: "총수익에서 운영비를 차감하여 순수익을 구합니다.",
  nextAction: "총수익과 운영비를 먼저 표시하세요.",
  caution: "검토 필요",
  plainExplanation: "들어온 돈에서 운영에 쓴 돈을 빼면 남는 돈이 순수익입니다.",
  keyTermExplanations: ["총수익: 들어온 돈", "운영비: 운영에 쓴 돈"],
  stepByStepExplanation: ["총수익 확인", "운영비 확인", "차감"],
  examAnswerHints: ["단위를 마지막에 확인하세요."],
};

test("learner choices preserve user control without creating mastery", () => {
  const tryFirst = resolveLearnerEntryChoiceV1("TRY_FIRST");
  assert.equal(tryFirst.label, "내가 먼저 풀기");
  assert.equal(tryFirst.independentAttemptEligible, true);
  assert.equal(tryFirst.masteryCreatedByChoice, false);
  assert.equal(tryFirst.transferCreatedByChoice, false);
  assert.equal(tryFirst.nextRequiredAction, "ATTEMPT_NOW");

  const expectedLabels = {
    ONE_HINT: "힌트 하나",
    EASY_EXPLANATION: "1타 쉬운풀이",
    FULL_SOLUTION: "전체풀이",
    DIRECT_ANSWER: "정답만 보기",
  };
  for (const choice of [
    "ONE_HINT",
    "EASY_EXPLANATION",
    "FULL_SOLUTION",
    "DIRECT_ANSWER",
  ]) {
    const decision = resolveLearnerEntryChoiceV1(choice);
    assert.equal(decision.label, expectedLabels[choice]);
    assert.equal(decision.independentAttemptEligible, false);
    assert.equal(decision.sameItemMasteryEvidenceEligible, false);
    assert.equal(decision.transferEvidenceEligible, false);
    assert.equal(decision.masteryCreatedByChoice, false);
    assert.equal(
      decision.nextRequiredAction,
      "DISTINCT_UNAIDED_ATTEMPT_REQUIRED",
    );
  }
});

test("easy explanation and hint project useful bounded support", () => {
  const easy = projectLearnerSupportV1({
    choice: "EASY_EXPLANATION",
    draft,
  });
  assert.equal(easy.available, true);
  assert.equal(easy.authority, "STRUCTURE_ONLY");
  assert.equal(easy.fullSolutionClaimAllowed, false);
  assert.deepEqual(
    easy.sections.map((section) => section.heading),
    ["쉽게 이해하기", "핵심 용어", "풀이 순서"],
  );

  const hint = projectLearnerSupportV1({ choice: "ONE_HINT", draft });
  assert.equal(hint.sections.length, 1);
  assert.equal(hint.sections[0].items.length, 1);
});

test("direct answer and full-solution claims require a supplied reference", () => {
  const absent = projectLearnerSupportV1({
    choice: "DIRECT_ANSWER",
    draft,
    referenceAnswer: "-",
  });
  assert.equal(absent.available, false);
  assert.equal(absent.directAnswerClaimAllowed, false);

  const unavailable = projectLearnerSupportV1({
    choice: "FULL_SOLUTION",
    draft,
  });
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.authority, "NONE");
  assert.equal(unavailable.sections.length, 0);
  assert.equal(unavailable.fullSolutionClaimAllowed, false);
  assert.equal(unavailable.directAnswerClaimAllowed, false);

  const grounded = projectLearnerSupportV1({
    choice: "FULL_SOLUTION",
    draft,
    referenceAnswer: "120,000,000원",
  });
  assert.equal(grounded.authority, "SUPPLIED_REFERENCE");
  assert.equal(grounded.fullSolutionClaimAllowed, true);
  assert.equal(grounded.directAnswerClaimAllowed, true);
  assert.equal(grounded.requiresDistinctUnaidedAttempt, true);
});
