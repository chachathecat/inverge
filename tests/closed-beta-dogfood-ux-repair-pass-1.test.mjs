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

test("Problem Snap prioritizes calculation/CASIO steps when calculator data exists", () => {
  const problemSnap = read("app/problem-snap/problem-snap-client.tsx");

  assert.ok(problemSnap.includes("hasCalculatorGuideData(result.calculatorGuide)"));
  assert.ok(problemSnap.includes("renderCalculatorStepPanel(result)"));
  assert.ok(problemSnap.indexOf("renderCalculatorStepPanel(result)") < problemSnap.indexOf('<div><h3 className="font-medium">{resultHeading}'));
  ["계산/CASIO 스텝", "계산 목적", "추천 모드", "계산 순서", "CASIO 입력", "화면에 보여야 할 값", "답안에 적을 값", "단위/반올림 주의"].forEach((label) =>
    assert.ok(problemSnap.includes(label), label),
  );
  assert.ok(problemSnap.includes("계산/CASIO 스텝은 확인이 필요합니다. 원문 숫자와 단위를 직접 확인해 주세요."));
});

test("Answer Review exposes calculation/CASIO checking and avoids 기준답안 copy", () => {
  const answerReview = read("app/answer-review/answer-review-client.tsx");

  assert.ok(answerReview.includes("data-answer-review-calculation-check"));
  assert.ok(answerReview.includes("계산/CASIO 확인"));
  ["숫자/단위 확인", "산식 확인", "계산 과정 확인", "반올림/단위 표시 확인", "답안 기재값 확인"].forEach((label) =>
    assert.ok(answerReview.includes(label), label),
  );
  assert.ok(answerReview.includes('subject === "감정평가실무"'));
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
  assert.ok(reviewQueue.includes("완료 처리"));
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
