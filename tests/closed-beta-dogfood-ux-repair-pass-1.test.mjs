import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";

const read = (path) => readFileSync(path, "utf8");

test("standalone learner tools expose links back into the learner OS with mode and subject", () => {
  const nav = read("components/review-os/standalone-learner-tool-nav.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const problemSnap = read("app/problem-snap/problem-snap-client.tsx");
  const problemSnapPage = read("app/problem-snap/page.tsx");

  assert.ok(answerReview.includes("StandaloneLearnerToolNav"));
  assert.ok(problemSnap.includes("StandaloneLearnerToolNav"));
  assert.ok(problemSnapPage.includes("initialSubject"));
  ["오늘 홈", "오늘 한 것", "복습", "학습 기록"].forEach((label) => assert.ok(nav.includes(label), label));
  assert.ok(nav.includes("`/app?mode=${mode}`"));
  assert.ok(nav.includes("`/app/capture?mode=${mode}${subjectQuery}`"));
  assert.ok(nav.includes("`/app/review?mode=${mode}${subjectQuery}`"));
  assert.ok(nav.includes("`/app/agenda?mode=${mode}`"));
});

test("Problem Snap prioritizes the active calculation routine before collapsed calculator references", () => {
  const problemSnap = read("app/problem-snap/problem-snap-client.tsx");
  const trainer = read("components/review-os/calculator-routine-trainer.tsx");
  const combined = `${problemSnap}\n${trainer}`;

  assert.ok(problemSnap.includes("hasCalculatorGuideData(result.calculatorGuide)"));
  assert.ok(problemSnap.includes("CalculatorRoutineTrainer"));
  assert.ok(problemSnap.includes("getCalculatorRoutineEligibility"));
  assert.ok(problemSnap.includes('getProblemSnapSubjectView(subject) === "practice"'));
  assert.ok(problemSnap.includes("renderCalculatorStepPanel(result,"));
  assert.ok(problemSnap.includes("data-problem-snap-calculator-reference"));
  assert.ok(problemSnap.includes("data-problem-snap-calculator-reference-locked"));
  assert.ok(problemSnap.includes("referenceUnlocked: calculatorRoutineReferenceUnlocked"));
  assert.ok(problemSnap.includes("먼저 계산·검산 루틴에서 한 단계 입력하거나 막힘을 선택하면 전체 참고 신호를 열 수 있습니다."));
  assert.ok(problemSnap.includes("setCalculatorRoutineDraftReference(null);"));
  assert.ok(problemSnap.includes('setCalculatorRoutineRunId(createCalculatorRoutineRunId("problem-snap"));'));
  assert.ok(combined.includes("계산·검산 루틴 시작"));
  assert.ok(combined.includes("정답 판정이 아니라 내 계산 과정을 점검하는 훈련입니다."));
  assert.ok(combined.includes("AI 생성 초안입니다. 원문·숫자·단위를 직접 대조해 주세요."));
  assert.ok(problemSnap.indexOf("<CalculatorRoutineTrainer") < problemSnap.indexOf("renderCalculatorStepPanel(result,"));
  assert.ok(problemSnap.indexOf("renderCalculatorStepPanel(result,") < problemSnap.indexOf('<div><h3 className="font-medium">{resultHeading}'));
  ["계산/CASIO 참고 신호", "계산 목적", "추천 모드", "계산 순서", "CASIO 입력", "화면에 보여야 할 값", "답안에 적을 값", "단위/반올림 주의"].forEach((label) =>
    assert.ok(problemSnap.includes(label), label),
  );
  assert.ok(problemSnap.includes("계산/CASIO 스텝은 확인이 필요합니다. 원문 숫자와 단위를 직접 확인해 주세요."));
});

test("Answer Review reuses the calculation routine and avoids duplicate passive checklists", () => {
  const answerReview = read("app/answer-review/answer-review-client.tsx");

  assert.ok(answerReview.includes("CalculatorRoutineTrainer"));
  assert.equal((answerReview.match(/<CalculatorRoutineTrainer/g) ?? []).length, 1);
  assert.equal(answerReview.includes("data-answer-review-calculation-check"), false);
  assert.equal(answerReview.includes("CalculationCheckPanel"), false);
  assert.ok(answerReview.includes("problemSnapRoutineReference"));
  assert.ok(answerReview.includes("hasProblemSnapRoutineHandoff"));
  assert.ok(answerReview.includes("getCalculatorRoutineIdFromDraftStorageKey"));
  assert.ok(answerReview.includes('setAnswerReviewRoutineRunId(createCalculatorRoutineRunId("answer-review"));'));
  assert.ok(answerReview.includes("calculatorRoutineReferenceHints"));
  assert.ok(answerReview.includes("getCalculatorRoutineEligibility"));
  assert.doesNotMatch(answerReview, /기준\s*답안|기준답안|모범답안|공식\s*채점/);
});

test("Review Queue has one primary review card and collapses extra signals", () => {
  const reviewQueue = read("components/review-os/review-queue-client.tsx");

  assert.ok(reviewQueue.includes("data-review-primary-surface"));
  assert.ok(reviewQueue.includes("지금 복습할 1개"));
  assert.ok(reviewQueue.includes("data-review-extra-signals"));
  assert.ok(reviewQueue.includes("상세 신호 보기"));
  assert.ok(reviewQueue.includes("data-review-secondary-list"));
  assert.ok(reviewQueue.includes("다음 복습 후보"));
  assert.ok(reviewQueue.includes("복습 완료"));
});

test("Agenda keeps required labels and adds derived summary plus daily grouping", () => {
  const agenda = read("components/review-os/learning-agenda-client.tsx");

  ["월간 기록", "주간 기록", "일별 상세"].forEach((label) => assert.ok(agenda.includes(label), label));
  ["이번 주 기록 수", "완료한 복습 수", "예정된 복습 수", "가장 많이 나온 과목"].forEach((label) =>
    assert.ok(agenda.includes(label), label),
  );
  ["기록 있음", "복습 예정", "복습 완료", "오늘 한 것", "완료한 것"].forEach((label) => assert.ok(agenda.includes(label), label));
  assert.ok(agenda.includes("오늘 한 것 하나만 남기면 여기에 공부 흐름이 쌓입니다."));
});

test("Today Plan max 3 protection remains intact", () => {
  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
});
